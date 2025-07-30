import { renderHook, act, waitFor } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { discoveryApiRef, fetchApiRef, githubAuthApiRef } from '@backstage/core-plugin-api';
import { useEnvironments, useDeploymentStatus, useDeploymentHistory } from './useDeploymentApi';
import { DeploymentApiService } from '../services/DeploymentApiService';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  DeploymentStatus,
  DeploymentHistoryEntry,
} from '@internal/plugin-deployments-common';

// Mock the DeploymentApiService
jest.mock('../services/DeploymentApiService');

const MockedDeploymentApiService = DeploymentApiService as jest.MockedClass<typeof DeploymentApiService>;

const mockDiscoveryApi = {
  getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api'),
};

const mockFetchApi = {
  fetch: jest.fn(),
};

const mockGithubAuth = {
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
};

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
    duration: 300000,
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestApiProvider
    apis={[
      [discoveryApiRef, mockDiscoveryApi],
      [fetchApiRef, mockFetchApi],
      [githubAuthApiRef, mockGithubAuth],
    ]}
  >
    {children}
  </TestApiProvider>
);

describe('useEnvironments', () => {
  let mockServiceInstance: jest.Mocked<DeploymentApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceInstance = {
      getEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
      getDeploymentStatus: jest.fn(),
      getDeploymentHistory: jest.fn(),
    } as any;

    MockedDeploymentApiService.mockImplementation(() => mockServiceInstance);
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    expect(result.current.environments).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads environments successfully', async () => {
    mockServiceInstance.getEnvironments.mockResolvedValue(mockEnvironments);

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    act(() => {
      result.current.loadEnvironments();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.environments).toEqual(mockEnvironments);
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.getEnvironments).toHaveBeenCalledWith('test-app');
  });

  it('handles load environments error', async () => {
    const errorMessage = 'Failed to load environments';
    mockServiceInstance.getEnvironments.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    act(() => {
      result.current.loadEnvironments();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.environments).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('does not load environments when componentName is empty', async () => {
    const { result } = renderHook(() => useEnvironments(''), { wrapper });

    act(() => {
      result.current.loadEnvironments();
    });

    expect(mockServiceInstance.getEnvironments).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('creates environment successfully', async () => {
    const newEnvironment = mockEnvironments[0];
    const createRequest: CreateEnvironmentRequest = {
      environmentName: 'staging',
      githubRepo: 'owner/repo',
      workflowPath: '.github/workflows/deploy.yml',
      jobName: 'deploy',
      githubEnvironment: 'staging',
    };

    mockServiceInstance.createEnvironment.mockResolvedValue(newEnvironment);

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    let createdEnvironment: EnvironmentConfig;
    await act(async () => {
      createdEnvironment = await result.current.createEnvironment(createRequest);
    });

    expect(createdEnvironment!).toEqual(newEnvironment);
    expect(result.current.environments).toContain(newEnvironment);
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.createEnvironment).toHaveBeenCalledWith('test-app', createRequest);
  });

  it('handles create environment error', async () => {
    const errorMessage = 'Failed to create environment';
    const createRequest: CreateEnvironmentRequest = {
      environmentName: 'staging',
      githubRepo: 'owner/repo',
      workflowPath: '.github/workflows/deploy.yml',
      jobName: 'deploy',
    };

    mockServiceInstance.createEnvironment.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    await expect(
      act(async () => {
        await result.current.createEnvironment(createRequest);
      })
    ).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.environments).toEqual([]);
  });

  it('updates environment successfully', async () => {
    const updatedEnvironment = { ...mockEnvironments[0], jobName: 'updated-deploy' };
    const updateRequest: UpdateEnvironmentRequest = {
      jobName: 'updated-deploy',
    };

    mockServiceInstance.updateEnvironment.mockResolvedValue(updatedEnvironment);

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    // Set initial environments
    act(() => {
      result.current.environments.push(mockEnvironments[0]);
    });

    let updatedEnv: EnvironmentConfig;
    await act(async () => {
      updatedEnv = await result.current.updateEnvironment('staging', updateRequest);
    });

    expect(updatedEnv!).toEqual(updatedEnvironment);
    expect(result.current.environments[0]).toEqual(updatedEnvironment);
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.updateEnvironment).toHaveBeenCalledWith('test-app', 'staging', updateRequest);
  });

  it('handles update environment error', async () => {
    const errorMessage = 'Failed to update environment';
    const updateRequest: UpdateEnvironmentRequest = {
      jobName: 'updated-deploy',
    };

    mockServiceInstance.updateEnvironment.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    await expect(
      act(async () => {
        await result.current.updateEnvironment('staging', updateRequest);
      })
    ).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });

  it('deletes environment successfully', async () => {
    mockServiceInstance.deleteEnvironment.mockResolvedValue(undefined);

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    // Set initial environments
    act(() => {
      result.current.environments.push(...mockEnvironments);
    });

    await act(async () => {
      await result.current.deleteEnvironment('staging');
    });

    expect(result.current.environments).toHaveLength(1);
    expect(result.current.environments[0].environmentName).toBe('production');
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.deleteEnvironment).toHaveBeenCalledWith('test-app', 'staging');
  });

  it('handles delete environment error', async () => {
    const errorMessage = 'Failed to delete environment';
    mockServiceInstance.deleteEnvironment.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useEnvironments('test-app'), { wrapper });

    await expect(
      act(async () => {
        await result.current.deleteEnvironment('staging');
      })
    ).rejects.toThrow(errorMessage);

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useDeploymentStatus', () => {
  let mockServiceInstance: jest.Mocked<DeploymentApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceInstance = {
      getEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
      getDeploymentStatus: jest.fn(),
      getDeploymentHistory: jest.fn(),
    } as any;

    MockedDeploymentApiService.mockImplementation(() => mockServiceInstance);
  });

  it('initializes with null status', () => {
    const { result } = renderHook(() => useDeploymentStatus('test-app', 'staging'), { wrapper });

    expect(result.current.status).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads deployment status successfully', async () => {
    mockServiceInstance.getDeploymentStatus.mockResolvedValue(mockDeploymentStatus);

    const { result } = renderHook(() => useDeploymentStatus('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.loadStatus();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockDeploymentStatus);
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.getDeploymentStatus).toHaveBeenCalledWith('test-app', 'staging');
  });

  it('handles deployment status error with mock fallback', async () => {
    const errorMessage = 'Failed to fetch deployment status';
    mockServiceInstance.getDeploymentStatus.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDeploymentStatus('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.loadStatus();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should show mock status instead of error for this specific error
    expect(result.current.status).toEqual({
      environmentName: 'staging',
      status: 'idle',
      currentVersion: undefined,
      deployedAt: undefined,
      workflowRunId: undefined,
      workflowRunUrl: undefined,
    });
    expect(result.current.error).toBe(null);
  });

  it('handles other deployment status errors', async () => {
    const errorMessage = 'Network error';
    mockServiceInstance.getDeploymentStatus.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDeploymentStatus('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.loadStatus();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe(null);
    expect(result.current.error).toBe(errorMessage);
  });

  it('does not load status when parameters are missing', async () => {
    const { result } = renderHook(() => useDeploymentStatus('', 'staging'), { wrapper });

    act(() => {
      result.current.loadStatus();
    });

    expect(mockServiceInstance.getDeploymentStatus).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('retries loading status', async () => {
    mockServiceInstance.getDeploymentStatus.mockResolvedValue(mockDeploymentStatus);

    const { result } = renderHook(() => useDeploymentStatus('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockDeploymentStatus);
    expect(mockServiceInstance.getDeploymentStatus).toHaveBeenCalledWith('test-app', 'staging');
  });
});

describe('useDeploymentHistory', () => {
  let mockServiceInstance: jest.Mocked<DeploymentApiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceInstance = {
      getEnvironments: jest.fn(),
      createEnvironment: jest.fn(),
      updateEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
      getDeploymentStatus: jest.fn(),
      getDeploymentHistory: jest.fn(),
    } as any;

    MockedDeploymentApiService.mockImplementation(() => mockServiceInstance);
  });

  it('initializes with empty history', () => {
    const { result } = renderHook(() => useDeploymentHistory('test-app', 'staging'), { wrapper });

    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('loads deployment history successfully', async () => {
    mockServiceInstance.getDeploymentHistory.mockResolvedValue(mockDeploymentHistory);

    const { result } = renderHook(() => useDeploymentHistory('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.loadHistory();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual(mockDeploymentHistory);
    expect(result.current.error).toBe(null);
    expect(mockServiceInstance.getDeploymentHistory).toHaveBeenCalledWith('test-app', 'staging', 20);
  });

  it('loads deployment history with custom limit', async () => {
    mockServiceInstance.getDeploymentHistory.mockResolvedValue(mockDeploymentHistory);

    const { result } = renderHook(() => useDeploymentHistory('test-app', 'staging', 10), { wrapper });

    act(() => {
      result.current.loadHistory();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockServiceInstance.getDeploymentHistory).toHaveBeenCalledWith('test-app', 'staging', 10);
  });

  it('handles deployment history error', async () => {
    const errorMessage = 'Failed to load deployment history';
    mockServiceInstance.getDeploymentHistory.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDeploymentHistory('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.loadHistory();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  it('does not load history when parameters are missing', async () => {
    const { result } = renderHook(() => useDeploymentHistory('', 'staging'), { wrapper });

    act(() => {
      result.current.loadHistory();
    });

    expect(mockServiceInstance.getDeploymentHistory).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('retries loading history', async () => {
    mockServiceInstance.getDeploymentHistory.mockResolvedValue(mockDeploymentHistory);

    const { result } = renderHook(() => useDeploymentHistory('test-app', 'staging'), { wrapper });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual(mockDeploymentHistory);
    expect(mockServiceInstance.getDeploymentHistory).toHaveBeenCalledWith('test-app', 'staging', 20);
  });
});