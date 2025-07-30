import { render, screen, fireEvent } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { EnvironmentCard } from './EnvironmentCard';
import {
  EnvironmentConfig,
  DeploymentStatus,
} from '@internal/plugin-deployments-common';

// Mock the useRouteRef hook
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => jest.fn(() => '/mock-route'),
}));

const mockEnvironment: EnvironmentConfig = {
  id: 'env-1',
  componentName: 'test-app',
  environmentName: 'staging',
  githubRepo: 'owner/repo',
  workflowPath: '.github/workflows/deploy.yml',
  jobName: 'deploy',
  githubEnvironment: 'staging',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

const mockDeploymentStatus: DeploymentStatus = {
  environmentName: 'staging',
  status: 'success',
  currentVersion: '1.2.3',
  deployedAt: new Date('2023-01-01T12:00:00Z'),
  workflowRunId: 123,
  workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
};

const renderEnvironmentCard = (props: Partial<React.ComponentProps<typeof EnvironmentCard>> = {}) => {
  const defaultProps = {
    environment: mockEnvironment,
    componentName: 'test-app',
    ...props,
  };

  return render(
    <TestApiProvider apis={[]}>
      <EnvironmentCard {...defaultProps} />
    </TestApiProvider>
  );
};

describe('EnvironmentCard', () => {
  it('renders environment name and repository', () => {
    renderEnvironmentCard();
    
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('owner/repo')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    renderEnvironmentCard({ loading: true });
    
    expect(screen.getByText('Loading status...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error state when error is provided', () => {
    const errorMessage = 'Failed to fetch status';
    renderEnvironmentCard({ error: errorMessage });
    
    expect(screen.getByText('Failed to load status')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays deployment status with success state', () => {
    renderEnvironmentCard({ deploymentStatus: mockDeploymentStatus });
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    expect(screen.getByText(/Deployed/)).toBeInTheDocument();
  });

  it('displays idle status when no deployment status is provided', () => {
    renderEnvironmentCard();
    
    expect(screen.getByText('No deployments')).toBeInTheDocument();
  });

  it('shows View Logs button when workflow run URL is available', () => {
    renderEnvironmentCard({ deploymentStatus: mockDeploymentStatus });
    
    const viewLogsButton = screen.getByText('View Logs');
    expect(viewLogsButton).toBeInTheDocument();
    expect(viewLogsButton.closest('a')).toHaveAttribute('href', mockDeploymentStatus.workflowRunUrl);
  });

  it('calls onRetry when refresh button is clicked', () => {
    const onRetry = jest.fn();
    renderEnvironmentCard({ onRetry });
    
    const refreshButton = screen.getByTitle('Refresh deployment status');
    fireEvent.click(refreshButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows edit and delete menu when handlers are provided', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    renderEnvironmentCard({ onEdit, onDelete });
    
    const menuButton = screen.getByTitle('Environment actions');
    fireEvent.click(menuButton);
    
    expect(screen.getByText('Edit Environment')).toBeInTheDocument();
    expect(screen.getByText('Delete Environment')).toBeInTheDocument();
  });

  it('calls onEdit when edit menu item is clicked', () => {
    const onEdit = jest.fn();
    renderEnvironmentCard({ onEdit, onDelete: jest.fn() });
    
    const menuButton = screen.getByTitle('Environment actions');
    fireEvent.click(menuButton);
    
    const editMenuItem = screen.getByText('Edit Environment');
    fireEvent.click(editMenuItem);
    
    expect(onEdit).toHaveBeenCalledWith(mockEnvironment);
  });

  it('calls onDelete when delete menu item is clicked', () => {
    const onDelete = jest.fn();
    renderEnvironmentCard({ onEdit: jest.fn(), onDelete });
    
    const menuButton = screen.getByTitle('Environment actions');
    fireEvent.click(menuButton);
    
    const deleteMenuItem = screen.getByText('Delete Environment');
    fireEvent.click(deleteMenuItem);
    
    expect(onDelete).toHaveBeenCalledWith('staging');
  });

  it('displays different status indicators for different deployment states', () => {
    const statuses: Array<{ status: DeploymentStatus['status']; expectedText: string }> = [
      { status: 'success', expectedText: 'Success' },
      { status: 'failure', expectedText: 'Failed' },
      { status: 'running', expectedText: 'Running' },
      { status: 'cancelled', expectedText: 'Cancelled' },
      { status: 'idle', expectedText: 'No deployments' },
    ];

    statuses.forEach(({ status, expectedText }) => {
      const { unmount } = renderEnvironmentCard({
        deploymentStatus: { ...mockDeploymentStatus, status },
      });
      
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      unmount();
    });
  });
});