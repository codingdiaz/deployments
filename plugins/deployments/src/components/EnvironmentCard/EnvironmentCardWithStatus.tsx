import { useCallback } from 'react';
import { EnvironmentCard } from './EnvironmentCard';
import { useDeploymentStatus } from '../../hooks/useGitHubApi';
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
  // Parse GitHub repo info
  const repoInfo = environment.githubRepo
    ? {
        owner: environment.githubRepo.split('/')[0],
        repo: environment.githubRepo.split('/')[1],
      }
    : null;

  const statusQuery = useDeploymentStatus(
    componentName,
    environment.environmentName,
    repoInfo?.owner || '',
    repoInfo?.repo || '',
    environment.workflowPath || '',
  );

  // Enhanced retry with exponential backoff
  const retryWithBackoff = useRetry(
    useCallback(async () => {
      statusQuery.retry();
    }, [statusQuery]),
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    }
  );

  const handleRetry = useCallback(async () => {
    try {
      await retryWithBackoff.execute();
    } catch (err) {
      // Error is already handled by the retry hook
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
        deploymentStatus={statusQuery.data || undefined}
        loading={statusQuery.loading || retryWithBackoff.isRetrying}
        error={statusQuery.error?.message || undefined}
        componentName={componentName}
        onRetry={handleRetry}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ErrorBoundary>
  );
};