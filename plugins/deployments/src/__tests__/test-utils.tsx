import { ReactElement } from 'react';
/* eslint-disable @backstage/no-undeclared-imports */
import { render } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
/* eslint-enable @backstage/no-undeclared-imports */
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { MemoryRouter } from 'react-router-dom';

// Mock useRouteRef globally for tests
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => jest.fn(() => '/mock-route'),
}));

// Mock GitHub Auth API
const mockGithubAuthApi = {
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  sessionState$: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
};

// Mock GitHub API Service
export const createMockGitHubApiService = () => ({
  listBranches: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve([
      { name: 'main', sha: 'abc123' },
      { name: 'develop', sha: 'def456' },
    ]), 0))
  ),
  listTags: jest.fn().mockImplementation(() =>
    new Promise(resolve => setTimeout(() => resolve([
      { name: 'v1.0.0', commit: { sha: 'tag123' } },
      { name: 'v1.1.0', commit: { sha: 'tag456' } },
    ]), 0))
  ),
  listWorkflows: jest.fn().mockResolvedValue([]),
  listWorkflowRuns: jest.fn().mockResolvedValue([]),
  getDeploymentStatus: jest.fn().mockResolvedValue({}),
  getDeploymentHistory: jest.fn().mockResolvedValue([]),
  triggerDeployment: jest.fn().mockResolvedValue({
    workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
    workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
    workflowId: 456,
  }),
  listRepositoryEnvironments: jest.fn().mockResolvedValue(['staging', 'production']),
  listWorkflowFiles: jest.fn().mockResolvedValue(['.github/workflows/deploy.yml']),
});

export interface RenderWithProvidersOptions {
  gitHubApiMocks?: Partial<ReturnType<typeof createMockGitHubApiService>>;
}

/**
 * Renders a component with the necessary Backstage API providers for testing
 */
export const renderWithProviders = (
  component: ReactElement, 
  _: RenderWithProvidersOptions = {}
) => {
  return render(
    <MemoryRouter>
      <TestApiProvider apis={[[githubAuthApiRef, mockGithubAuthApi]]}>
        {component}
      </TestApiProvider>
    </MemoryRouter>
  );
};

/**
 * Helper to mock GitHubApiService methods for specific tests
 */
export const mockGitHubApiService = createMockGitHubApiService();

