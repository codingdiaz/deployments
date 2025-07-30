import { GitHubApiService, GitHubApiError } from './GitHubApiService';
import { OAuthApi } from '@backstage/core-plugin-api';

// Mock Octokit
const mockOctokitInstance = {
  rest: {
    actions: {
      listRepoWorkflows: jest.fn(),
      listWorkflowRuns: jest.fn(),
      listWorkflowRunsForRepo: jest.fn(),
      createWorkflowDispatch: jest.fn(),
      getWorkflowRun: jest.fn(),
      listJobsForWorkflowRun: jest.fn(),
    },
    repos: {
      listTags: jest.fn(),
      listCommits: jest.fn(),
      get: jest.fn(),
    },
  },
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => mockOctokitInstance),
}));

describe('GitHubApiService', () => {
  let mockOAuthApi: jest.Mocked<OAuthApi>;
  let service: GitHubApiService;

  beforeEach(() => {
    mockOAuthApi = {
      getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    } as any;
    service = new GitHubApiService(mockOAuthApi);
    
    // Setup default mocks for new methods
    mockOctokitInstance.rest.actions.getWorkflowRun.mockResolvedValue({
      data: {
        inputs: { environment: 'production' },
        display_title: 'Deploy to production',
      },
    });
    
    mockOctokitInstance.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
      data: {
        jobs: [
          { name: 'deploy', status: 'completed', conclusion: 'success' },
        ],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with OAuth API', () => {
      expect(service).toBeInstanceOf(GitHubApiService);
    });
  });

  describe('listWorkflows', () => {
    it('should call OAuth API to get token', async () => {
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: {
          workflows: [
            {
              id: 1,
              name: 'Test Workflow',
              path: '.github/workflows/test.yml',
              state: 'active',
            },
          ],
        },
      });

      const result = await service.listWorkflows('owner', 'repo');

      expect(mockOAuthApi.getAccessToken).toHaveBeenCalledWith(['repo', 'workflow']);
      expect(result).toEqual([
        {
          id: 1,
          name: 'Test Workflow',
          path: '.github/workflows/test.yml',
          state: 'active',
        },
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockRejectedValue(authError);

      await expect(service.listWorkflows('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;
      (rateLimitError as any).response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1234567890',
        },
      };
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockRejectedValue(rateLimitError);

      await expect(service.listWorkflows('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Forbidden');
      (permissionError as any).status = 403;
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockRejectedValue(permissionError);

      await expect(service.listWorkflows('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });

    it('should handle not found errors', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockRejectedValue(notFoundError);

      await expect(service.listWorkflows('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('validatePermissions', () => {
    it('should return true for accessible repository', async () => {
      mockOctokitInstance.rest.repos.get.mockResolvedValue({ data: {} });

      const result = await service.validatePermissions('owner', 'repo');

      expect(result).toBe(true);
    });

    it('should return false for inaccessible repository', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).status = 404;
      mockOctokitInstance.rest.repos.get.mockRejectedValue(notFoundError);

      const result = await service.validatePermissions('owner', 'repo');

      expect(result).toBe(false);
    });
  });

  describe('deployment status', () => {
    it('should fetch deployment status successfully', async () => {
      const mockWorkflows = [
        { id: 123, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
      ];
      const mockRuns = [
        {
          id: 456,
          name: 'Deploy',
          status: 'completed',
          conclusion: 'success',
          created_at: '2023-01-01T10:00:00Z',
          updated_at: '2023-01-01T10:05:00Z',
          html_url: 'https://github.com/owner/repo/actions/runs/456',
          head_sha: 'abc123def456',
          head_branch: 'main',
          workflow_id: 123,
          workflow_url: 'https://github.com/owner/repo/actions/workflows/123',
          display_title: 'Deploy to production',
        },
      ];

      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: mockWorkflows },
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: mockRuns },
      } as any);

      const result = await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
      );

      expect(result).toEqual({
        environmentName: 'production',
        status: 'success',
        currentVersion: 'abc123d',
        deployedAt: new Date('2023-01-01T10:05:00Z'),
        workflowRunId: 456,
        workflowRunUrl: 'https://github.com/owner/repo/actions/runs/456',
      });
    });

    it('should handle workflow not found', async () => {
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: [] },
      } as any);

      const result = await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/nonexistent.yml',
        'deploy',
      );

      expect(result).toEqual({
        environmentName: 'production',
        status: 'idle',
        errorMessage: 'Workflow not found at path: .github/workflows/nonexistent.yml',
      });
    });

    it('should handle no workflow runs', async () => {
      const mockWorkflows = [
        { id: 123, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
      ];

      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: mockWorkflows },
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: [] },
      } as any);

      const result = await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
      );

      expect(result).toEqual({
        environmentName: 'production',
        status: 'idle',
      });
    });

    it('should map workflow status correctly', async () => {
      const mockWorkflows = [
        { id: 123, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
      ];
      const mockRuns = [
        {
          id: 456,
          name: 'Deploy',
          status: 'in_progress',
          conclusion: null,
          created_at: '2023-01-01T10:00:00Z',
          updated_at: '2023-01-01T10:05:00Z',
          html_url: 'https://github.com/owner/repo/actions/runs/456',
          head_sha: 'abc123def456',
          head_branch: 'main',
          workflow_id: 123,
          workflow_url: 'https://github.com/owner/repo/actions/workflows/123',
          display_title: 'Deploy to production',
        },
      ];

      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: mockWorkflows },
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: mockRuns },
      } as any);

      const result = await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
      );

      expect(result.status).toBe('running');
    });
  });

  describe('deployment history', () => {
    it('should fetch deployment history successfully', async () => {
      const mockWorkflows = [
        { id: 123, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
      ];
      const mockRuns = [
        {
          id: 456,
          name: 'Deploy',
          status: 'completed',
          conclusion: 'success',
          created_at: '2023-01-01T10:00:00Z',
          updated_at: '2023-01-01T10:05:00Z',
          html_url: 'https://github.com/owner/repo/actions/runs/456',
          head_sha: 'abc123def456',
          head_branch: 'main',
          workflow_id: 123,
          workflow_url: 'https://github.com/owner/repo/actions/workflows/123',
          display_title: 'Deploy to production',
        },
        {
          id: 789,
          name: 'Deploy',
          status: 'completed',
          conclusion: 'failure',
          created_at: '2023-01-01T09:00:00Z',
          updated_at: '2023-01-01T09:03:00Z',
          html_url: 'https://github.com/owner/repo/actions/runs/789',
          head_sha: 'def456ghi789',
          head_branch: 'main',
          workflow_id: 123,
          workflow_url: 'https://github.com/owner/repo/actions/workflows/123',
          display_title: 'Deploy to production',
        },
      ];

      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: mockWorkflows },
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: mockRuns },
      } as any);

      const result = await service.getDeploymentHistory(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
        10,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '456',
        version: 'abc123d',
        status: 'success',
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T10:05:00Z'),
        workflowRunId: 456,
        workflowRunUrl: 'https://github.com/owner/repo/actions/runs/456',
        triggeredBy: 'GitHub User',
        duration: 5 * 60 * 1000, // 5 minutes in milliseconds
      });
      expect(result[1]).toEqual({
        id: '789',
        version: 'def456g',
        status: 'failure',
        startedAt: new Date('2023-01-01T09:00:00Z'),
        completedAt: new Date('2023-01-01T09:03:00Z'),
        workflowRunId: 789,
        workflowRunUrl: 'https://github.com/owner/repo/actions/runs/789',
        triggeredBy: 'GitHub User',
        errorMessage: 'Deployment failed',
        duration: 3 * 60 * 1000, // 3 minutes in milliseconds
      });
    });

    it('should return empty array when workflow not found', async () => {
      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: [] },
      } as any);

      const result = await service.getDeploymentHistory(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/nonexistent.yml',
        'deploy',
        10,
      );

      expect(result).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache deployment status', async () => {
      const mockWorkflows = [
        { id: 123, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
      ];
      const mockRuns = [
        {
          id: 456,
          name: 'Deploy',
          status: 'completed',
          conclusion: 'success',
          created_at: '2023-01-01T10:00:00Z',
          updated_at: '2023-01-01T10:05:00Z',
          html_url: 'https://github.com/owner/repo/actions/runs/456',
          head_sha: 'abc123def456',
          head_branch: 'main',
          workflow_id: 123,
          workflow_url: 'https://github.com/owner/repo/actions/workflows/123',
          display_title: 'Deploy to production',
        },
      ];

      mockOctokitInstance.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: { workflows: mockWorkflows },
      } as any);
      mockOctokitInstance.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { workflow_runs: mockRuns },
      } as any);

      // First call
      await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
      );

      // Second call should use cache
      await service.getDeploymentStatus(
        'test-component',
        'production',
        'owner',
        'repo',
        '.github/workflows/deploy.yml',
        'deploy',
      );

      // Should only call GitHub API once due to caching
      expect(mockOctokitInstance.rest.actions.listRepoWorkflows).toHaveBeenCalledTimes(1);
      expect(mockOctokitInstance.rest.actions.listWorkflowRuns).toHaveBeenCalledTimes(1);
    });

    it('should clear cache for specific environment', async () => {
      service.clearCacheForEnvironment('test-component', 'production');
      // This test mainly ensures the method exists and doesn't throw
      expect(true).toBe(true);
    });

    it('should clear all cache', async () => {
      service.clearCache();
      // This test mainly ensures the method exists and doesn't throw
      expect(true).toBe(true);
    });
  });
});