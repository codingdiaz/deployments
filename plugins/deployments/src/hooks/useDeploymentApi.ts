import { useState, useCallback } from 'react';
import { useApi, discoveryApiRef, fetchApiRef, githubAuthApiRef } from '@backstage/core-plugin-api';
import { DeploymentApiService } from '../services/DeploymentApiService';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  DeploymentStatus,
  DeploymentHistoryEntry,
} from '@internal/plugin-deployments-common';

/**
 * Hook for interacting with the deployment API
 */
export function useDeploymentApi() {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const githubAuth = useApi(githubAuthApiRef);
  const [service] = useState(() => new DeploymentApiService(discoveryApi, fetchApi, githubAuth));

  return service;
}

/**
 * Hook for managing environment configurations with loading and error states
 */
export function useEnvironments(componentName: string) {
  const service = useDeploymentApi();
  const [environments, setEnvironments] = useState<EnvironmentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnvironments = useCallback(async () => {
    if (!componentName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const envs = await service.getEnvironments(componentName);
      setEnvironments(envs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  }, [service, componentName]);

  const createEnvironment = useCallback(async (request: CreateEnvironmentRequest) => {
    setError(null);
    
    try {
      const newEnv = await service.createEnvironment(componentName, request);
      setEnvironments(prev => [...prev, newEnv]);
      return newEnv;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create environment';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service, componentName]);

  const updateEnvironment = useCallback(async (
    environmentName: string,
    request: UpdateEnvironmentRequest
  ) => {
    setError(null);
    
    try {
      const updatedEnv = await service.updateEnvironment(componentName, environmentName, request);
      setEnvironments(prev => 
        prev.map(env => env.environmentName === environmentName ? updatedEnv : env)
      );
      return updatedEnv;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update environment';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service, componentName]);

  const deleteEnvironment = useCallback(async (environmentName: string) => {
    setError(null);
    
    try {
      await service.deleteEnvironment(componentName, environmentName);
      setEnvironments(prev => prev.filter(env => env.environmentName !== environmentName));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete environment';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service, componentName]);

  return {
    environments,
    loading,
    error,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  };
}

/**
 * Hook for fetching deployment status with loading and error states
 */
export function useDeploymentStatus(componentName: string, environmentName: string) {
  const service = useDeploymentApi();
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!componentName || !environmentName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const deploymentStatus = await service.getDeploymentStatus(componentName, environmentName);
      setStatus(deploymentStatus);
    } catch (err) {
      // For now, if the backend endpoint doesn't exist, we'll show a mock status
      // This allows the component to work while the backend is being developed
      if (err instanceof Error && err.message.includes('Failed to fetch deployment status')) {
        // Mock deployment status for demonstration
        const mockStatus: DeploymentStatus = {
          environmentName,
          status: 'idle',
          currentVersion: undefined,
          deployedAt: undefined,
          workflowRunId: undefined,
          workflowRunUrl: undefined,
        };
        setStatus(mockStatus);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load deployment status');
      }
    } finally {
      setLoading(false);
    }
  }, [service, componentName, environmentName]);

  const retry = useCallback(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    status,
    loading,
    error,
    loadStatus,
    retry,
  };
}

/**
 * Hook for fetching deployment history with loading and error states
 */
export function useDeploymentHistory(
  componentName: string,
  environmentName: string,
  limit: number = 20,
) {
  const service = useDeploymentApi();
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!componentName || !environmentName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const deploymentHistory = await service.getDeploymentHistory(componentName, environmentName, limit);
      setHistory(deploymentHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [service, componentName, environmentName, limit]);

  const retry = useCallback(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    loadHistory,
    retry,
  };
}