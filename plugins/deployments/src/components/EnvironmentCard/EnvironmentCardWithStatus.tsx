import { useEffect, useCallback } from 'react';
import { EnvironmentCard } from './EnvironmentCard';
import { useDeploymentStatus } from '../../hooks/useDeploymentApi';
import { useRetry } from '../../hooks/useRetry';
import { ErrorBoundary } from '../ErrorHandling';
import { EnvironmentConfig } from '@internal/plugin-deployments-common';

interface EnvironmentCardWithStatusProps {
  /** Environment configuration */
  environment: EnvironmentConfig;
  /** Component name for routing */
  componentName: string;
  /** Callback to edit environment */
  onEdit?: (environment: EnvironmentConfig) => void;
  /** Callback to delete environment */
  onDelete?: (environmentName: string) => void;
}

/**
 * EnvironmentCard wrapper that automatically fetches and displays deployment status
 */
export const EnvironmentCardWithStatus: React.FC<EnvironmentCardWithStatusProps> = ({
  environment,
  componentName,
  onEdit,
  onDelete,
}) => {
  const {
    status,
    loading,
    error,
    loadStatus,
    retry: originalRetry,
  } = useDeploymentStatus(componentName, environment.environmentName);

  // Enhanced retry with exponential backoff
  const retryWithBackoff = useRetry(
    useCallback(async () => {
      await loadStatus();
    }, [loadStatus]),
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    }
  );

  // Load deployment status when component mounts or dependencies change
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRetry = useCallback(async () => {
    try {
      await retryWithBackoff.execute();
    } catch (err) {
      // Error is already handled by the retry hook
      console.warn('Retry failed:', err);
    }
  }, [retryWithBackoff]);

  return (
    <ErrorBoundary
      resetKeys={[componentName, environment.environmentName]}
      resetOnPropsChange
      maxRetries={2}
    >
      <EnvironmentCard
        environment={environment}
        deploymentStatus={status || undefined}
        loading={loading || retryWithBackoff.isRetrying}
        error={error || undefined}
        componentName={componentName}
        onRetry={handleRetry}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ErrorBoundary>
  );
};