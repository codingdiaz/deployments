import { useState, useCallback } from 'react';
import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { DeploymentApiService } from '../services/DeploymentApiService';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '@internal/plugin-deployments-common';

/**
 * Hook for interacting with the deployment API
 */
export function useDeploymentApi() {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [service] = useState(
    () => new DeploymentApiService(discoveryApi, fetchApi),
  );

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
      setError(
        err instanceof Error ? err.message : 'Failed to load environments',
      );
    } finally {
      setLoading(false);
    }
  }, [service, componentName]);

  const createEnvironment = useCallback(
    async (request: CreateEnvironmentRequest) => {
      setError(null);

      try {
        const newEnv = await service.createEnvironment(componentName, request);
        setEnvironments(prev => [...prev, newEnv]);
        return newEnv;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create environment';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [service, componentName],
  );

  const updateEnvironment = useCallback(
    async (environmentName: string, request: UpdateEnvironmentRequest) => {
      setError(null);

      try {
        const updatedEnv = await service.updateEnvironment(
          componentName,
          environmentName,
          request,
        );
        setEnvironments(prev =>
          prev.map(env =>
            env.environmentName === environmentName ? updatedEnv : env,
          ),
        );
        return updatedEnv;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update environment';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [service, componentName],
  );

  const deleteEnvironment = useCallback(
    async (environmentName: string) => {
      setError(null);

      try {
        await service.deleteEnvironment(componentName, environmentName);
        setEnvironments(prev =>
          prev.filter(env => env.environmentName !== environmentName),
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete environment';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [service, componentName],
  );

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

