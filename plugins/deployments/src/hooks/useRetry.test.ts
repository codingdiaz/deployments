import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetry, useAsyncWithRetry } from './useRetry';
import { GitHubApiError } from '../services/GitHubApiService';

// Mock timers for testing retry delays
jest.useFakeTimers();

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('executes operation successfully on first try', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useRetry(mockOperation));

    let operationResult: string;
    await act(async () => {
      operationResult = await result.current.execute();
    });

    expect(operationResult!).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.lastError).toBe(null);
  });

  it('retries operation on network error', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockOperation));

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // Fast-forward through retry delays
    await act(async () => {
      jest.advanceTimersByTime(1000); // First retry delay
    });

    await act(async () => {
      jest.advanceTimersByTime(2000); // Second retry delay
    });

    const operationResult = await executePromise;

    expect(operationResult).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('does not retry authentication errors', async () => {
    const authError = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    const mockOperation = jest.fn().mockRejectedValue(authError);

    const { result } = renderHook(() => useRetry(mockOperation));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('Authentication failed');

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastError).toBe(authError);
  });

  it('does not retry permission errors', async () => {
    const permissionError = new GitHubApiError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    const mockOperation = jest.fn().mockRejectedValue(permissionError);

    const { result } = renderHook(() => useRetry(mockOperation));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('Insufficient permissions');

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.retryCount).toBe(0);
  });

  it('respects maxRetries option', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest.fn().mockRejectedValue(networkError);

    const { result } = renderHook(() => 
      useRetry(mockOperation, { maxRetries: 2 })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // Fast-forward through retry delays
    await act(async () => {
      jest.advanceTimersByTime(1000); // First retry
    });

    await act(async () => {
      jest.advanceTimersByTime(2000); // Second retry
    });

    await expect(executePromise).rejects.toThrow('Network error');
    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('uses exponential backoff for retry delays', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetry(mockOperation, { 
        initialDelay: 100,
        backoffFactor: 2,
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // First retry should be after 100ms
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Second retry should be after 200ms (100 * 2)
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const result_value = await executePromise;
    expect(result_value).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('respects maxDelay option', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useRetry(mockOperation, { 
        initialDelay: 1000,
        backoffFactor: 10,
        maxDelay: 1500,
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // First retry should be after 1000ms
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Second retry should be capped at maxDelay (1500ms), not 10000ms
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    const result_value = await executePromise;
    expect(result_value).toBe('success');
  });

  it('uses custom retry condition', async () => {
    const customError = new Error('Custom error');
    const mockOperation = jest.fn().mockRejectedValue(customError);

    const customRetryCondition = jest.fn().mockReturnValue(false);

    const { result } = renderHook(() => 
      useRetry(mockOperation, { retryCondition: customRetryCondition })
    );

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('Custom error');

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(customRetryCondition).toHaveBeenCalledWith(customError);
  });

  it('updates retry state correctly during retries', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockOperation));

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // Check initial retry state
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);

    // After first failure, should be in retry state
    await act(async () => {
      jest.advanceTimersByTime(500); // Partial delay
    });

    expect(result.current.retryCount).toBe(1);
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.lastError).toBe(networkError);

    // Complete the retry
    await act(async () => {
      jest.advanceTimersByTime(500); // Complete delay
    });

    await executePromise;

    expect(result.current.retryCount).toBe(1);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.lastError).toBe(null);
  });

  it('resets state when reset is called', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest.fn().mockRejectedValue(networkError);

    const { result } = renderHook(() => useRetry(mockOperation));

    // Execute and fail
    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow();

    expect(result.current.lastError).toBe(networkError);

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.lastError).toBe(null);
  });

  it('handles component unmount during retry', async () => {
    const networkError = new Error('Network error');
    const mockOperation = jest.fn().mockRejectedValue(networkError);

    const { result, unmount } = renderHook(() => useRetry(mockOperation));

    let executePromise: Promise<any>;
    
    await act(async () => {
      executePromise = result.current.execute();
      
      // Let the first attempt fail
      await Promise.resolve();
    });

    // Unmount component during retry delay
    unmount();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await expect(executePromise!).rejects.toThrow();
  });

  it('clears timeout on unmount', () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useRetry(mockOperation));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

describe('useAsyncWithRetry', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('executes async function successfully', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    let executionResult: string;
    await act(async () => {
      executionResult = await result.current.execute('arg1', 'arg2');
    });

    expect(executionResult!).toBe('success');
    expect(result.current.data).toBe('success');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockAsyncFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('shows loading state during execution', async () => {
    let resolvePromise: (value: string) => void;
    const mockAsyncFn = jest.fn().mockImplementation(() => 
      new Promise<string>(resolve => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    const executePromise = act(async () => {
      return result.current.execute();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);

    // Resolve the promise
    act(() => {
      resolvePromise!('success');
    });

    await executePromise;

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success');
  });

  it('handles errors and shows error state', async () => {
    const error = new Error('Execution failed');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('Execution failed');

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
    expect(result.current.data).toBe(null);
  });

  it('retries on network errors', async () => {
    const networkError = new Error('Network error');
    const mockAsyncFn = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    const executePromise = act(async () => {
      return result.current.execute();
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const executionResult = await executePromise;

    expect(executionResult).toBe('success');
    expect(result.current.data).toBe('success');
    expect(result.current.retryCount).toBe(1);
    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
  });

  it('shows retry state during retries', async () => {
    const networkError = new Error('Network error');
    const mockAsyncFn = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // During retry delay
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(1);

    // Complete retry
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await executePromise;

    expect(result.current.isRetrying).toBe(false);
    expect(result.current.data).toBe('success');
  });

  it('resets all state when reset is called', async () => {
    const error = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    // Execute and fail
    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow();

    expect(result.current.error).toBe(error);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
  });

  it('passes retry options correctly', async () => {
    const networkError = new Error('Network error');
    const mockAsyncFn = jest.fn().mockRejectedValue(networkError);

    const { result } = renderHook(() => 
      useAsyncWithRetry(mockAsyncFn, { maxRetries: 1 })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await expect(executePromise).rejects.toThrow('Network error');
    expect(mockAsyncFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('handles string errors correctly', async () => {
    const mockAsyncFn = jest.fn().mockRejectedValue('String error');

    const { result } = renderHook(() => useAsyncWithRetry(mockAsyncFn));

    await expect(
      act(async () => {
        await result.current.execute();
      })
    ).rejects.toThrow('String error');

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('String error');
  });
});