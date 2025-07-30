import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EnvironmentDetailsPage } from './EnvironmentDetailsPage';
import { EnvironmentConfig, DeploymentStatus, DeploymentHistoryEntry } from '@internal/plugin-deployments-common';

// Mock the hooks
jest.mock('../../hooks/useDeploymentApi', () => ({
  useEnvironments: jest.fn(),
}));

jest.mock('../../hooks/useGitHubApi', () => ({
  useDeploymentStatus: jest.fn(),
  useDeploymentHistory: jest.fn(),
  useTriggerDeployment: jest.fn(),
}));

// Mock the useRouteRef hook
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => jest.fn(() => '/deployments/test-app'),
}));

import { useEnvironments } from '../../hooks/useDeploymentApi';
import { useDeploymentStatus, useDeploymentHistory, useTriggerDeployment } from '../../hooks/useGitHubApi';

const mockUseEnvironments = useEnvironments as jest.MockedFunction<typeof useEnvironments>;
const mockUseDeploymentStatus = useDeploymentStatus as jest.MockedFunction<typeof useDeploymentStatus>;
const mockUseDeploymentHistory = useDeploymentHistory as jest.MockedFunction<typeof useDeploymentHistory>;
const mockUseTriggerDeployment = useTriggerDeployment as jest.MockedFunction<typeof useTriggerDeployment>;

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

const mockDeploymentHistory: DeploymentHistoryEntry[] = [
  {
    id: '1',
    version: '1.2.3',
    status: 'success',
    startedAt: new Date('2023-01-01T12:00:00Z'),
    completedAt: new Date('2023-01-01T12:05:00Z'),
    workflowRunId: 123,
    workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
    triggeredBy: 'john.doe',
    duration: 300000, // 5 minutes
  },
  {
    id: '2',
    version: '1.2.2',
    status: 'failure',
    startedAt: new Date('2023-01-01T11:00:00Z'),
    completedAt: new Date('2023-01-01T11:02:00Z'),
    workflowRunId: 122,
    workflowRunUrl: 'https://github.com/owner/repo/actions/runs/122',
    triggeredBy: 'jane.doe',
    duration: 120000, // 2 minutes
    errorMessage: 'Deployment failed',
  },
];

const renderEnvironmentDetailsPage = (
  componentName = 'test-app',
  environmentName = 'staging'
) => {
  return render(
    <TestApiProvider apis={[]}>
      <MemoryRouter initialEntries={[`/deployments/${componentName}/${environmentName}`]}>
        <Routes>
          <Route
            path="/deployments/:componentName/:environmentName"
            element={<EnvironmentDetailsPage />}
          />
        </Routes>
      </MemoryRouter>
    </TestApiProvider>
  );
};

describe('EnvironmentDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page title with component and environment names', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    expect(screen.getByText('test-app - staging')).toBeInTheDocument();
    expect(screen.getByText('Deployment history and details')).toBeInTheDocument();
  });

  it('handles missing parameters gracefully', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    render(
      <TestApiProvider apis={[]}>
        <MemoryRouter initialEntries={['/deployments']}>
          <Routes>
            <Route path="/deployments" element={<EnvironmentDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </TestApiProvider>
    );

    expect(screen.getByText('Invalid Parameters')).toBeInTheDocument();
    expect(screen.getByText('Component name and environment name are required.')).toBeInTheDocument();
  });

  it('displays loading skeletons while fetching status', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    // Should show loading skeletons (they render as progressbars or similar)
    expect(screen.getByText('Current Status')).toBeInTheDocument();
    expect(screen.getByText('Deployment History')).toBeInTheDocument();
  });

  it('displays current deployment status', async () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: mockDeploymentStatus,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Version: 1.2.3')).toBeInTheDocument();
      expect(screen.getByText(/Deployed:/)).toBeInTheDocument();
    });

    // Should have a link to view the workflow
    const viewWorkflowButton = screen.getByText('View Workflow');
    expect(viewWorkflowButton).toBeInTheDocument();
    expect(viewWorkflowButton.closest('a')).toHaveAttribute('href', mockDeploymentStatus.workflowRunUrl);
  });

  it('displays deployment history table', async () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: mockDeploymentHistory,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Started')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Triggered By')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check deployment entries
      expect(screen.getByText('1.2.3')).toBeInTheDocument();
      expect(screen.getByText('1.2.2')).toBeInTheDocument();
      expect(screen.getByText('john.doe')).toBeInTheDocument();
      expect(screen.getByText('jane.doe')).toBeInTheDocument();
      expect(screen.getByText('5m 0s')).toBeInTheDocument();
      expect(screen.getByText('2m 0s')).toBeInTheDocument();
    });

    // Should have View buttons linking to workflow runs
    const viewButtons = screen.getAllByText('View');
    expect(viewButtons).toHaveLength(2);
    expect(viewButtons[0].closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo/actions/runs/123');
    expect(viewButtons[1].closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo/actions/runs/122');
  });

  it('displays empty state when no deployment history exists', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    expect(screen.getByText('No Deployments')).toBeInTheDocument();
    expect(screen.getByText(/No deployment history found for the staging environment/)).toBeInTheDocument();
  });

  it('handles status fetch errors with retry functionality', () => {
    const mockRetry = jest.fn();
    
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: { message: 'Failed to fetch status', name: 'TestError' },
      retry: mockRetry,
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    expect(screen.getByText('Failed to fetch status')).toBeInTheDocument();
  });

  it('handles history fetch errors with retry functionality', () => {
    const mockRetry = jest.fn();
    
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: null,
      loading: false,
      error: { message: 'Failed to fetch history', name: 'TestError' },
      retry: mockRetry,
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    expect(screen.getByText('Failed to fetch history')).toBeInTheDocument();
  });

  it('renders back navigation link', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [mockEnvironment],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    mockUseDeploymentStatus.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseDeploymentHistory.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    mockUseTriggerDeployment.mockReturnValue({
      triggerDeployment: jest.fn(),
      loading: false,
      error: null,
    });

    renderEnvironmentDetailsPage();

    expect(screen.getByText('← Back to test-app Deployments')).toBeInTheDocument();
  });
});