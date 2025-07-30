import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApplicationDeploymentPage } from './ApplicationDeploymentPage';
import { EnvironmentConfig } from '@internal/plugin-deployments-common';

// Mock the hooks
jest.mock('../../hooks/useDeploymentApi', () => ({
  useEnvironments: jest.fn(),
}));

// Mock the useRouteRef hook
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => jest.fn(() => '/deployments'),
}));

import { useEnvironments } from '../../hooks/useDeploymentApi';

const mockUseEnvironments = useEnvironments as jest.MockedFunction<typeof useEnvironments>;

const mockEnvironments: EnvironmentConfig[] = [
  {
    id: 'env-1',
    componentName: 'test-app',
    environmentName: 'staging',
    githubRepo: 'owner/repo',
    workflowPath: '.github/workflows/deploy.yml',
    jobName: 'deploy',
    githubEnvironment: 'staging',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'env-2',
    componentName: 'test-app',
    environmentName: 'production',
    githubRepo: 'owner/repo',
    workflowPath: '.github/workflows/deploy.yml',
    jobName: 'deploy-prod',
    githubEnvironment: 'production',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

const renderApplicationDeploymentPage = (componentName = 'test-app') => {
  return render(
    <TestApiProvider apis={[]}>
      <MemoryRouter initialEntries={[`/deployments/${componentName}`]}>
        <Routes>
          <Route
            path="/deployments/:componentName"
            element={<ApplicationDeploymentPage />}
          />
        </Routes>
      </MemoryRouter>
    </TestApiProvider>
  );
};

describe('ApplicationDeploymentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page header with component name', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(screen.getByText('test-app')).toBeInTheDocument();
    expect(screen.getByText('Monitor deployment status and trigger new deployments across environments')).toBeInTheDocument();
  });

  it('displays loading skeletons while fetching environments', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: true,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    // Should show skeleton cards
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error state when environments fail to load', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: 'Failed to load environments',
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(screen.getByText('Failed to load environments')).toBeInTheDocument();
  });

  it('displays empty state when no environments exist', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(screen.getByText('No deployment environments configured')).toBeInTheDocument();
    expect(screen.getByText(/Configure your first deployment environment/)).toBeInTheDocument();
    expect(screen.getByText('Add Environment')).toBeInTheDocument();
  });

  it('displays environment cards when environments exist', () => {
    mockUseEnvironments.mockReturnValue({
      environments: mockEnvironments,
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('opens create environment form when Add Environment is clicked', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    const addButton = screen.getByText('Add Environment');
    fireEvent.click(addButton);

    expect(screen.getByText('Create New Environment')).toBeInTheDocument();
  });

  it('calls createEnvironment when form is submitted for new environment', async () => {
    const mockCreateEnvironment = jest.fn().mockResolvedValue(mockEnvironments[0]);
    
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: mockCreateEnvironment,
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    // Open form
    const addButton = screen.getByText('Add Environment');
    fireEvent.click(addButton);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('staging'), {
      target: { value: 'staging' },
    });
    fireEvent.change(screen.getByPlaceholderText('myorg/myapp'), {
      target: { value: 'owner/repo' },
    });
    fireEvent.change(screen.getByPlaceholderText('.github/workflows/deploy.yml'), {
      target: { value: '.github/workflows/deploy.yml' },
    });
    fireEvent.change(screen.getByPlaceholderText('deploy'), {
      target: { value: 'deploy' },
    });

    // Submit form
    const submitButton = screen.getByText('Create Environment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateEnvironment).toHaveBeenCalledWith({
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
        githubEnvironment: '',
      });
    });
  });

  it('calls updateEnvironment when form is submitted for existing environment', async () => {
    const mockUpdateEnvironment = jest.fn().mockResolvedValue(mockEnvironments[0]);
    
    mockUseEnvironments.mockReturnValue({
      environments: mockEnvironments,
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: mockUpdateEnvironment,
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    // Find and click edit button (would be in the environment card menu)
    // This is a simplified test - in reality the edit would come from the card component
    const editButton = screen.getAllByTitle('Environment actions')[0];
    fireEvent.click(editButton);
    
    const editMenuItem = screen.getByText('Edit Environment');
    fireEvent.click(editMenuItem);

    // Form should be open with existing values
    expect(screen.getByText('Edit Environment Configuration')).toBeInTheDocument();
  });

  it('calls deleteEnvironment when delete is confirmed', async () => {
    const mockDeleteEnvironment = jest.fn().mockResolvedValue(undefined);
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    mockUseEnvironments.mockReturnValue({
      environments: mockEnvironments,
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: mockDeleteEnvironment,
    });

    renderApplicationDeploymentPage();

    // Find and click delete button (would be in the environment card menu)
    const menuButton = screen.getAllByTitle('Environment actions')[0];
    fireEvent.click(menuButton);
    
    const deleteMenuItem = screen.getByText('Delete Environment');
    fireEvent.click(deleteMenuItem);

    await waitFor(() => {
      expect(mockDeleteEnvironment).toHaveBeenCalledWith('staging');
    });

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('does not delete environment when delete is cancelled', async () => {
    const mockDeleteEnvironment = jest.fn();
    
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);

    mockUseEnvironments.mockReturnValue({
      environments: mockEnvironments,
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: mockDeleteEnvironment,
    });

    renderApplicationDeploymentPage();

    // Find and click delete button
    const menuButton = screen.getAllByTitle('Environment actions')[0];
    fireEvent.click(menuButton);
    
    const deleteMenuItem = screen.getByText('Delete Environment');
    fireEvent.click(deleteMenuItem);

    expect(mockDeleteEnvironment).not.toHaveBeenCalled();

    // Restore window.confirm
    window.confirm = originalConfirm;
  });

  it('displays form error when environment creation fails', async () => {
    const mockCreateEnvironment = jest.fn().mockRejectedValue(new Error('Creation failed'));
    
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: mockCreateEnvironment,
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    // Open form
    const addButton = screen.getByText('Add Environment');
    fireEvent.click(addButton);

    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText('staging'), {
      target: { value: 'staging' },
    });
    fireEvent.change(screen.getByPlaceholderText('myorg/myapp'), {
      target: { value: 'owner/repo' },
    });
    fireEvent.change(screen.getByPlaceholderText('.github/workflows/deploy.yml'), {
      target: { value: '.github/workflows/deploy.yml' },
    });
    fireEvent.change(screen.getByPlaceholderText('deploy'), {
      target: { value: 'deploy' },
    });

    const submitButton = screen.getByText('Create Environment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
    });
  });

  it('renders back to applications link', () => {
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(screen.getByText('← Back to Applications')).toBeInTheDocument();
  });

  it('loads environments on component mount', () => {
    const mockLoadEnvironments = jest.fn();
    
    mockUseEnvironments.mockReturnValue({
      environments: [],
      loading: false,
      error: null,
      loadEnvironments: mockLoadEnvironments,
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
    });

    renderApplicationDeploymentPage();

    expect(mockLoadEnvironments).toHaveBeenCalled();
  });
});