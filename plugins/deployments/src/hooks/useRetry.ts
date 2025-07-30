import { useState, useCallback, useRef, useEffect } from 'react';
import { GitHubApiError } from '../services/GitHubApiService';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  lastError: Error | null;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    // Don't retry authentication or permission errors
    if (error instanceof GitHubApiError) {
      return !['AUTHENTICATION_FAILED', 'INSUFFICIENT_PERMISSIONS'].includes(error.code || '');
    }
    // Retry network errors
    return error.message.toLowerCase().includes('network') || 
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('timeout');
  },
};

/**
 * Hook for adding retry functionality to async operations
 */
export function useRetry<T>(
  asyncOperation: () => Promise<T>,
  options: RetryOptions = {},
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastError: null,
  });
  
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const executeWithRetry = useCallback(async (): Promise<T> => {
    const attempt = async (attemptNumber: number): Promise<T> => {
      try {
        if (!mountedRef.current) {
          throw new Error('Component unmounted');
        }
        
        setState(prev => ({ 
          ...prev, 
          isRetrying: attemptNumber > 0,
          retryCount: attemptNumber 
        }));
        
        const result = await asyncOperation();
        
        if (mountedRef.current) {
          setState(prev => ({ 
            ...prev, 
            isRetrying: false,
            lastError: null 
          }));
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        if (!mountedRef.current) {
          throw err;
        }
        
        setState(prev => ({ 
          ...prev, 
          lastError: err,
          isRetrying: false 
        }));
        
        // Check if we should retry
        const shouldRetry = attemptNumber < opts.maxRetries && opts.retryCondition(err);
        
        if (shouldRetry) {
          const delay = Math.min(
            opts.initialDelay * Math.pow(opts.backoffFactor, attemptNumber),
            opts.maxDelay
          );
          
          return new Promise<T>((resolve, reject) => {
            timeoutRef.current = window.setTimeout(async () => {
              if (!mountedRef.current) {
                reject(new Error('Component unmounted'));
                return;
              }
              
              try {
                const result = await attempt(attemptNumber + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          });
        }
        
        throw err;
      }
    };
    
    return attempt(0);
  }, [asyncOperation, opts]);
  
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({
      retryCount: 0,
      isRetrying: false,
      lastError: null,
    });
  }, []);
  
  return {
    execute: executeWithRetry,
    reset,
    ...state,
  };
}

/**
 * Hook for adding retry functionality to existing async functions
 */
export function useAsyncWithRetry<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  options: RetryOptions = {},
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);
  
  const retry = useRetry(
    () => asyncFn(...([] as any as T)), // Will be overridden in execute
    options
  );
  
  const execute = useCallback(async (...args: T): Promise<R> => {
    setLoading(true);
    setError(null);
    
    try {
      const retryableOperation = () => asyncFn(...args);
      const result = await useRetry(retryableOperation, options).execute();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [asyncFn, options]);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    retry.reset();
  }, [retry]);
  
  return {
    execute,
    reset,
    loading,
    error,
    data,
    retryCount: retry.retryCount,
    isRetrying: retry.isRetrying,
  };
}