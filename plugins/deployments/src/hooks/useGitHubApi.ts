import { useCallback, useEffect, useState } from 'react';
import { useApi, githubAuthApiRef } from '@backstage/core-plugin-api';
import { GitHubApiService, GitHubApiError } from '../services/GitHubApiService';

export interface UseGitHubApiState<T> {
  data: T | null;
  loading: boolean;
  error: GitHubApiError | null;
  retry: () => void;
}

export function useGitHubApi() {
  const githubAuth = useApi(githubAuthApiRef);
  const [service] = useState(() => new GitHubApiService(githubAuth));

  return service;
}

export function useGitHubApiCall<T>(
  apiCall: (service: GitHubApiService) => Promise<T>,
  dependencies: any[] = [],
): UseGitHubApiState<T> {
  const service = useGitHubApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const executeCall = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(service);
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCall, service, ...dependencies]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useGitHubWorkflows(owner: string, repo: string) {
  return useGitHubApiCall(
    service => service.listWorkflows(owner, repo),
    [owner, repo],
  );
}

export function useGitHubWorkflowRuns(
  owner: string,
  repo: string,
  workflowId?: number,
  perPage: number = 50,
) {
  return useGitHubApiCall(
    service => service.listWorkflowRuns(owner, repo, workflowId, perPage),
    [owner, repo, workflowId, perPage],
  );
}

export function useGitHubTags(
  owner: string,
  repo: string,
  perPage: number = 50,
) {
  const service = useGitHubApi();
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasValidParams = Boolean(owner && repo);

  const executeCall = useCallback(async () => {
    if (!hasValidParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.listTags(owner, repo, perPage);
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [service, owner, repo, perPage, hasValidParams]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useGitHubBranches(
  owner: string,
  repo: string,
  perPage: number = 50,
) {
  const service = useGitHubApi();
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasValidParams = Boolean(owner && repo);

  const executeCall = useCallback(async () => {
    if (!hasValidParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.listBranches(owner, repo, perPage);
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [service, owner, repo, perPage, hasValidParams]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useGitHubCommits(
  owner: string,
  repo: string,
  sha?: string,
  perPage: number = 50,
) {
  return useGitHubApiCall(
    service => service.listCommits(owner, repo, sha, perPage),
    [owner, repo, sha, perPage],
  );
}

export function useDeploymentStatus(
  componentName: string,
  environmentName: string,
  owner: string,
  repo: string,
  workflowPath: string,
) {
  const service = useGitHubApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasRequiredParams = Boolean(
    componentName && environmentName && owner && repo && workflowPath,
  );

  const executeCall = useCallback(async () => {
    if (!hasRequiredParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.getDeploymentStatus(
        componentName,
        environmentName,
        owner,
        repo,
        workflowPath,
      );
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [
    service,
    componentName,
    environmentName,
    owner,
    repo,
    workflowPath,
    hasRequiredParams,
  ]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useDeploymentHistory(
  componentName: string,
  environmentName: string,
  owner: string,
  repo: string,
  workflowPath: string,
  limit: number = 20,
) {
  const service = useGitHubApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasRequiredParams = Boolean(
    componentName && environmentName && owner && repo && workflowPath,
  );

  const executeCall = useCallback(async () => {
    if (!hasRequiredParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.getDeploymentHistory(
        environmentName,
        owner,
        repo,
        workflowPath,
        limit,
      );
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [
    service,
    environmentName,
    owner,
    repo,
    workflowPath,
    limit,
    hasRequiredParams,
  ]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useTriggerDeployment() {
  const service = useGitHubApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const triggerDeployment = useCallback(
    async (
      owner: string,
      repo: string,
      workflowPath: string,
      environmentName: string,
      version: string,
      _componentName?: string,
    ): Promise<{
      workflowUrl: string;
      workflowRunUrl: string | null;
      workflowId: number;
    } | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await service.triggerDeployment(
          owner,
          repo,
          workflowPath,
          environmentName,
          version,
        );
        return result;
      } catch (err) {
        if (err instanceof GitHubApiError) {
          setError(err);
        } else {
          setError(
            new GitHubApiError(
              'An unexpected error occurred while triggering deployment',
            ),
          );
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  return { triggerDeployment, loading, error };
}

export function useGitHubEnvironments(owner: string, repo: string) {
  const service = useGitHubApi();
  const [data, setData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasValidParams = Boolean(owner && repo);

  const executeCall = useCallback(async () => {
    if (!hasValidParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.listRepositoryEnvironments(owner, repo);
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [service, owner, repo, hasValidParams]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useGitHubWorkflowFiles(owner: string, repo: string) {
  const service = useGitHubApi();
  const [data, setData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const hasValidParams = Boolean(owner && repo);

  const executeCall = useCallback(async () => {
    if (!hasValidParams) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await service.listWorkflowFiles(owner, repo);
      setData(result);
    } catch (err) {
      if (err instanceof GitHubApiError) {
        setError(err);
      } else {
        setError(new GitHubApiError('An unexpected error occurred'));
      }
    } finally {
      setLoading(false);
    }
  }, [service, owner, repo, hasValidParams]);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}

export function useGitHubDeploymentApproval() {
  const service = useGitHubApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitHubApiError | null>(null);

  const approveDeployment = useCallback(
    async (
      owner: string,
      repo: string,
      deploymentId: number,
      comment?: string,
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await service.approveDeployment(owner, repo, deploymentId, comment);
      } catch (err) {
        if (err instanceof GitHubApiError) {
          setError(err);
        } else {
          setError(
            new GitHubApiError(
              'An unexpected error occurred while approving deployment',
            ),
          );
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  const rejectDeployment = useCallback(
    async (
      owner: string,
      repo: string,
      deploymentId: number,
      comment?: string,
    ): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await service.rejectDeployment(owner, repo, deploymentId, comment);
      } catch (err) {
        if (err instanceof GitHubApiError) {
          setError(err);
        } else {
          setError(
            new GitHubApiError(
              'An unexpected error occurred while rejecting deployment',
            ),
          );
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  return { approveDeployment, rejectDeployment, loading, error };
}
