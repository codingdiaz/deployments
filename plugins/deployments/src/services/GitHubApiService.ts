import { Octokit } from '@octokit/rest';
import { OAuthApi } from '@backstage/core-plugin-api';
import { DeploymentStatus, DeploymentStatusType, DeploymentHistoryEntry } from '@internal/plugin-deployments-common';

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_sha: string;
  head_branch: string;
  workflow_id: number;
  workflow_url: string;
  display_title?: string;
  actor?: GitHubUser;
  triggering_actor?: GitHubUser;
}

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url?: string;
  html_url?: string;
  type?: string;
}

export interface GitHubDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  description: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
  statuses_url: string;
  repository_url: string;
  creator?: GitHubUser;
}

export interface GitHubDeploymentStatus {
  id: number;
  state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';
  description: string | null;
  environment: string;
  target_url: string | null;
  log_url: string | null;
  created_at: string;
  updated_at: string;
  deployment_url: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubApiService {
  private octokit: Octokit | null = null;
  private tokenPromise: Promise<string> | null = null;
  private statusCache = new Map<string, { data: DeploymentStatus; timestamp: number }>();
  private historyCache = new Map<string, { data: DeploymentHistoryEntry[]; timestamp: number }>();
  private readonly CACHE_TTL = 15 * 1000; // 15 seconds

  constructor(private oauthApi: OAuthApi) {}

  private async getToken(): Promise<string> {
    if (!this.tokenPromise) {
      this.tokenPromise = this.oauthApi.getAccessToken(['repo', 'workflow', 'repo_deployment']);
    }
    return this.tokenPromise;
  }

  private async getOctokit(): Promise<Octokit> {
    if (!this.octokit) {
      const token = await this.getToken();
      this.octokit = new Octokit({
        auth: token,
      });
    }
    return this.octokit;
  }

  private async refreshToken(): Promise<void> {
    this.tokenPromise = null;
    this.octokit = null;
    await this.getOctokit();
  }

  private async handleApiCall<T>(apiCall: () => Promise<T>, retryCount: number = 0): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      // Handle authentication errors
      if (error.status === 401) {
        try {
          await this.refreshToken();
          return await apiCall();
        } catch (refreshError: any) {
          throw new GitHubApiError(
            'GitHub authentication failed. Please refresh the page to re-authenticate.',
            401,
            'AUTHENTICATION_FAILED',
            { 
              originalError: refreshError.message,
              suggestion: 'Try refreshing the page or logging out and back in'
            }
          );
        }
      }

      // Handle rate limiting with enhanced details
      if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const resetDate = new Date(parseInt(resetTime, 10) * 1000);
        const remainingTime = Math.ceil((resetDate.getTime() - Date.now()) / 1000 / 60);
        
        throw new GitHubApiError(
          `GitHub API rate limit exceeded. Rate limit resets in ${remainingTime} minutes.`,
          403,
          'RATE_LIMIT_EXCEEDED',
          {
            resetTime: resetTime,
            resetDate: resetDate.toISOString(),
            remainingMinutes: remainingTime,
            suggestion: 'Please wait for the rate limit to reset before trying again'
          }
        );
      }

      // Handle secondary rate limits (abuse detection)
      if (error.status === 403 && error.response?.headers?.['retry-after']) {
        const retryAfter = parseInt(error.response.headers['retry-after'], 10);
        throw new GitHubApiError(
          `GitHub API secondary rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
          403,
          'SECONDARY_RATE_LIMIT_EXCEEDED',
          {
            retryAfter,
            suggestion: 'This is GitHub\'s abuse detection. Please wait before retrying.'
          }
        );
      }

      // Handle permission errors with more context
      if (error.status === 403) {
        const message = error.response?.data?.message || 'Insufficient permissions to access this GitHub resource.';
        throw new GitHubApiError(
          message,
          403,
          'INSUFFICIENT_PERMISSIONS',
          {
            requiredPermissions: ['repo', 'workflow'],
            suggestion: 'Ensure you have read access to the repository and workflow permissions'
          }
        );
      }

      // Handle not found errors with context
      if (error.status === 404) {
        const resourceType = this.getResourceTypeFromError(error);
        throw new GitHubApiError(
          `GitHub ${resourceType} not found. Check the repository name and your access permissions.`,
          404,
          'RESOURCE_NOT_FOUND',
          {
            resourceType,
            suggestion: 'Verify the repository exists and you have access to it'
          }
        );
      }

      // Handle network errors with retry logic
      if (this.isNetworkError(error) && retryCount < 2) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.handleApiCall(apiCall, retryCount + 1);
      }

      // Handle network errors
      if (this.isNetworkError(error)) {
        throw new GitHubApiError(
          'Network error occurred while connecting to GitHub API. Please check your internet connection.',
          0,
          'NETWORK_ERROR',
          {
            originalError: error.message,
            suggestion: 'Check your internet connection and try again'
          }
        );
      }

      // Handle validation errors
      if (error.status === 422) {
        const validationErrors = error.response?.data?.errors || [];
        throw new GitHubApiError(
          `GitHub API validation error: ${error.response?.data?.message || 'Invalid request data'}`,
          422,
          'VALIDATION_ERROR',
          {
            validationErrors,
            suggestion: 'Check the request data and try again'
          }
        );
      }

      // Handle server errors
      if (error.status >= 500) {
        throw new GitHubApiError(
          'GitHub API server error. This is likely a temporary issue.',
          error.status,
          'SERVER_ERROR',
          {
            suggestion: 'This is a GitHub server issue. Please try again in a few minutes.'
          }
        );
      }

      // Handle other errors
      throw new GitHubApiError(
        error.response?.data?.message || error.message || 'An unexpected error occurred while calling GitHub API',
        error.status,
        'GITHUB_API_ERROR',
        {
          originalError: error.message,
          suggestion: 'Please try again or contact support if the issue persists'
        }
      );
    }
  }

  private getResourceTypeFromError(error: any): string {
    const url = error.config?.url || '';
    if (url.includes('/workflows')) return 'workflow';
    if (url.includes('/runs')) return 'workflow run';
    if (url.includes('/repos')) return 'repository';
    if (url.includes('/tags')) return 'tags';
    if (url.includes('/commits')) return 'commits';
    return 'resource';
  }

  private isNetworkError(error: any): boolean {
    return !error.status || 
           error.code === 'NETWORK_ERROR' ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ETIMEDOUT' ||
           error.message?.toLowerCase().includes('network') ||
           error.message?.toLowerCase().includes('fetch');
  }

  async listWorkflows(owner: string, repo: string): Promise<GitHubWorkflow[]> {
    const octokit = await this.getOctokit();
    
    return this.handleApiCall(async () => {
      const response = await octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });

      return response.data.workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        path: workflow.path,
        state: workflow.state,
      }));
    });
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflowId?: number,
    perPage: number = 50,
  ): Promise<GitHubWorkflowRun[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = workflowId
        ? await octokit.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflowId,
            per_page: perPage,
          })
        : await octokit.rest.actions.listWorkflowRunsForRepo({
            owner,
            repo,
            per_page: perPage,
          });

      return response.data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name || '',
        status: run.status || '',
        conclusion: run.conclusion,
        created_at: run.created_at,
        updated_at: run.updated_at,
        html_url: run.html_url,
        head_sha: run.head_sha,
        head_branch: run.head_branch || '',
        workflow_id: run.workflow_id,
        workflow_url: run.workflow_url,
        display_title: run.display_title,
        actor: run.actor ? {
          login: run.actor.login,
          id: run.actor.id,
          avatar_url: run.actor.avatar_url,
          html_url: run.actor.html_url,
          type: run.actor.type,
        } : undefined,
        triggering_actor: run.triggering_actor ? {
          login: run.triggering_actor.login,
          id: run.triggering_actor.id,
          avatar_url: run.triggering_actor.avatar_url,
          html_url: run.triggering_actor.html_url,
          type: run.triggering_actor.type,
        } : undefined,
      }));
    });
  }

  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: number,
    ref: string,
    inputs?: Record<string, any>,
  ): Promise<void> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs,
      });
    });
  }

  async triggerDeployment(
    owner: string,
    repo: string,
    workflowPath: string,
    environmentName: string,
    version: string,
    componentName?: string,
  ): Promise<{ workflowUrl: string; workflowRunUrl: string | null; workflowId: number }> {
    if (!workflowPath) {
      throw new GitHubApiError(
        'Workflow path is required to trigger deployment',
        400,
        'MISSING_WORKFLOW_PATH',
        {
          suggestion: 'Configure a workflow path in the environment configuration'
        }
      );
    }

    return this.handleApiCall(async () => {
      // Determine ref to trigger workflow on
      let ref = version;
      
      // If version looks like a commit SHA (7+ hex chars), use it as-is
      // If it looks like a tag (starts with v or contains dots), use it as-is
      // Otherwise, assume it's a branch or tag reference
      if (!/^[a-f0-9]{7,}$/i.test(version) && !/^v?\d+\.\d+/.test(version)) {
        ref = 'main'; // Default to main branch if version doesn't look like a commit or tag
      }

      // Get the workflow ID from the path
      const workflows = await this.listWorkflows(owner, repo);
      const workflow = workflows.find(w => w.path === workflowPath);

      if (!workflow) {
        throw new GitHubApiError(
          `Workflow not found at path: ${workflowPath}`,
          404,
          'WORKFLOW_NOT_FOUND',
          {
            workflowPath,
            suggestion: 'Check that the workflow file exists in the repository'
          }
        );
      }

      const workflowId = workflow.id;
      const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/${workflow.id}`;

      // Get current runs count before triggering to identify the new run
      const runsBefore = await this.listWorkflowRuns(owner, repo, workflow.id, 1);
      const latestRunIdBefore = runsBefore.length > 0 ? runsBefore[0].id : 0;

      // Trigger the workflow with dispatch
      await this.triggerWorkflow(
        owner,
        repo,
        workflow.id,
        ref,
        {
          environment: environmentName,
          version: version,
        },
      );

      // Wait a moment for the workflow to be queued
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to find the new workflow run
      let workflowRunUrl: string | null = null;
      try {
        const runsAfter = await this.listWorkflowRuns(owner, repo, workflow.id, 5);
        const newRun = runsAfter.find(run => run.id > latestRunIdBefore);
        if (newRun) {
          workflowRunUrl = newRun.html_url;
        }
      } catch (error) {
        // Silently handle workflow run fetch errors
      }

      // Clear cache for this environment since we just triggered a deployment
      if (componentName) {
        this.clearCacheForEnvironment(componentName, environmentName);
      }

      return {
        workflowUrl,
        workflowRunUrl,
        workflowId,
      };
    });
  }

  async listTags(owner: string, repo: string, perPage: number = 50): Promise<GitHubTag[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.listTags({
        owner,
        repo,
        per_page: perPage,
      });

      return response.data.map(tag => ({
        name: tag.name,
        commit: {
          sha: tag.commit.sha,
          url: tag.commit.url,
        },
      }));
    });
  }

  async listBranches(owner: string, repo: string, perPage: number = 50): Promise<Array<{ name: string; sha: string }>> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
      });

      return response.data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
      }));
    });
  }

  async listCommits(
    owner: string,
    repo: string,
    sha?: string,
    perPage: number = 50,
  ): Promise<GitHubCommit[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha,
        per_page: perPage,
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        commit: {
          message: commit.commit.message,
          author: {
            name: commit.commit.author?.name || '',
            date: commit.commit.author?.date || '',
          },
        },
      }));
    });
  }

  async listDeployments(
    owner: string,
    repo: string,
    environment?: string,
    perPage: number = 50,
  ): Promise<GitHubDeployment[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.listDeployments({
        owner,
        repo,
        environment,
        per_page: perPage,
      });

      return response.data.map(deployment => ({
        id: deployment.id,
        sha: deployment.sha,
        ref: deployment.ref,
        environment: deployment.environment,
        description: deployment.description,
        payload: deployment.payload,
        created_at: deployment.created_at,
        updated_at: deployment.updated_at,
        statuses_url: deployment.statuses_url,
        repository_url: deployment.repository_url,
        creator: deployment.creator ? {
          login: deployment.creator.login,
          id: deployment.creator.id,
          avatar_url: deployment.creator.avatar_url,
          html_url: deployment.creator.html_url,
          type: deployment.creator.type,
        } : undefined,
      }));
    });
  }

  async getDeployment(
    owner: string,
    repo: string,
    deploymentId: number,
  ): Promise<GitHubDeployment> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.getDeployment({
        owner,
        repo,
        deployment_id: deploymentId,
      });

      return {
        id: response.data.id,
        sha: response.data.sha,
        ref: response.data.ref,
        environment: response.data.environment,
        description: response.data.description,
        payload: response.data.payload,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        statuses_url: response.data.statuses_url,
        repository_url: response.data.repository_url,
        creator: response.data.creator ? {
          login: response.data.creator.login,
          id: response.data.creator.id,
          avatar_url: response.data.creator.avatar_url,
          html_url: response.data.creator.html_url,
          type: response.data.creator.type,
        } : undefined,
      };
    });
  }

  async listDeploymentStatuses(
    owner: string,
    repo: string,
    deploymentId: number,
    perPage: number = 50,
  ): Promise<GitHubDeploymentStatus[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: deploymentId,
        per_page: perPage,
      });

      return response.data.map(status => ({
        id: status.id,
        state: status.state as 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success',
        description: status.description,
        environment: status.environment || '',
        target_url: status.target_url,
        log_url: status.log_url || null,
        created_at: status.created_at,
        updated_at: status.updated_at,
        deployment_url: status.deployment_url,
      }));
    });
  }

  async createDeployment(
    owner: string,
    repo: string,
    ref: string,
    environment: string,
    payload?: any,
    description?: string,
  ): Promise<GitHubDeployment> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.createDeployment({
        owner,
        repo,
        ref,
        environment,
        payload,
        description,
        auto_merge: false, // Require manual merging
      });

      return {
        id: (response.data as any).id,
        sha: (response.data as any).sha,
        ref: (response.data as any).ref,
        environment: (response.data as any).environment,
        description: (response.data as any).description,
        payload: (response.data as any).payload,
        created_at: (response.data as any).created_at,
        updated_at: (response.data as any).updated_at,
        statuses_url: (response.data as any).statuses_url || '',
        repository_url: (response.data as any).repository_url || '',
      };
    });
  }

  async getWorkflowRun(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<any> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      return response.data;
    });
  }

  async getWorkflowRunJobs(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<any[]> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      return response.data.jobs;
    });
  }

  // private isWorkflowPathEnvironmentSpecific(workflowPath: string, environmentName: string): boolean {
  //   // Strategy 2: If workflow path contains environment name, 
  //   // it's likely a separate workflow for that environment
  //   const pathLower = workflowPath.toLowerCase();
  //   const envLower = environmentName.toLowerCase();
  //   
  //   return pathLower.includes(envLower) || 
  //          pathLower.includes(`${envLower}-`) || 
  //          pathLower.includes(`-${envLower}`) ||
  //          pathLower.includes(`${envLower}_`) || 
  //          pathLower.includes(`_${envLower}`);
  // }

  // private async filterRunsByEnvironment(
  //   runs: GitHubWorkflowRun[],
  //   environmentName: string,
  //   owner?: string,
  //   repo?: string,
  //   workflowPath?: string,
  // ): Promise<GitHubWorkflowRun[]> {
  //   const filteredRuns: GitHubWorkflowRun[] = [];
  //   
  //   // Strategy 2: If workflow path is environment-specific, return all runs
  //   if (workflowPath && this.isWorkflowPathEnvironmentSpecific(workflowPath, environmentName)) {
  //     return runs;
  //   }
  //   
  //   return filteredRuns;
  // }

  async validatePermissions(owner: string, repo: string): Promise<boolean> {
    try {
      const octokit = await this.getOctokit();
      await octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error: any) {
      if (error.status === 404 || error.status === 403) {
        return false;
      }
      throw error;
    }
  }

  private getCacheKey(componentName: string, environmentName: string): string {
    return `${componentName}:${environmentName}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  // private mapWorkflowStatusToDeploymentStatus(
  //   status: string,
  //   conclusion: string | null,
  // ): DeploymentStatusType {
  //   if (status === 'in_progress' || status === 'queued' || status === 'pending') {
  //     return 'running';
  //   }
  //
  //   if (status === 'completed') {
  //     switch (conclusion) {
  //       case 'success':
  //         return 'success';
  //       case 'failure':
  //       case 'timed_out':
  //         return 'failure';
  //       case 'cancelled':
  //         return 'cancelled';
  //       default:
  //         return 'failure';
  //     }
  //   }
  //
  //   return 'idle';
  // }

  private mapDeploymentStateToDeploymentStatus(
    state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success'
  ): DeploymentStatusType {
    switch (state) {
      case 'success':
        return 'success';
      case 'error':
      case 'failure':
        return 'failure';
      case 'in_progress':
      case 'queued':
      case 'pending':
        return 'running';
      case 'inactive':
        return 'cancelled';
      default:
        return 'idle';
    }
  }

  // private parseVersionFromWorkflowRun(run: GitHubWorkflowRun): string {
  //   // Try to extract version from head_sha (first 7 characters)
  //   if (run.head_sha) {
  //     return run.head_sha.substring(0, 7);
  //   }
  //   return 'unknown';
  // }

  private parseVersionFromDeployment(deployment: GitHubDeployment): string {
    // Try to extract version from payload first
    if (deployment.payload && deployment.payload.version) {
      return deployment.payload.version;
    }
    
    // Try to extract version from SHA (first 7 characters)
    if (deployment.sha) {
      return deployment.sha.substring(0, 7);
    }
    
    // Try to extract version from ref if it looks like a tag
    if (deployment.ref && /^v?\d+\.\d+/.test(deployment.ref)) {
      return deployment.ref;
    }
    
    return 'unknown';
  }

  async getDeploymentStatus(
    componentName: string,
    environmentName: string,
    owner: string,
    repo: string,
    _workflowPath?: string,
  ): Promise<DeploymentStatus> {
    const cacheKey = this.getCacheKey(componentName, environmentName);
    const cached = this.statusCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    return this.handleApiCall(async () => {
      // Get deployments for this environment
      const deployments = await this.listDeployments(owner, repo, environmentName, 20);

      if (deployments.length === 0) {
        const status: DeploymentStatus = {
          environmentName,
          status: 'idle',
          errorMessage: `No deployments found for environment: ${environmentName}`,
        };
        this.statusCache.set(cacheKey, { data: status, timestamp: Date.now() });
        return status;
      }

      // Use the most recent deployment
      const latestDeployment = deployments[0];

      // Get the latest status for this deployment
      const deploymentStatuses = await this.listDeploymentStatuses(owner, repo, latestDeployment.id, 50);
      
      // Sort statuses chronologically and find the final status
      const sortedStatuses = deploymentStatuses.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const finalStates = ['success', 'failure', 'error', 'inactive'];
      let finalStatus = sortedStatuses.find(s => finalStates.includes(s.state));
      
      // If no final status found, use the most recent status
      if (!finalStatus && sortedStatuses.length > 0) {
        finalStatus = sortedStatuses[sortedStatuses.length - 1];
      }

      const deploymentStatus = finalStatus 
        ? this.mapDeploymentStateToDeploymentStatus(finalStatus.state)
        : 'idle';

      // Extract workflow run info from deployment payload or target_url if available
      let workflowRunId: number | undefined;
      let workflowRunUrl: string | undefined;

      if (finalStatus?.target_url) {
        // Try to extract workflow run ID from target URL
        const runIdMatch = finalStatus.target_url.match(/\/runs\/(\d+)/);
        if (runIdMatch) {
          workflowRunId = parseInt(runIdMatch[1], 10);
          workflowRunUrl = finalStatus.target_url;
        }
      }

      // If no workflow URL found, check payload for workflow information
      if (!workflowRunUrl && latestDeployment.payload?.workflow_run_url) {
        workflowRunUrl = latestDeployment.payload.workflow_run_url;
      }

      // Create pending approval if status indicates waiting for approval
      let pendingApproval: any = undefined;
      if (finalStatus && (finalStatus.state === 'pending' || finalStatus.state === 'queued')) {
        pendingApproval = {
          deploymentId: latestDeployment.id,
          environment: environmentName,
          version: this.parseVersionFromDeployment(latestDeployment),
          triggeredBy: latestDeployment.creator || {
            login: 'unknown',
            id: 0,
            avatar_url: '',
            html_url: '',
            type: 'User',
          },
          requestedAt: new Date(latestDeployment.created_at),
          requiredReviewers: [], // This would come from environment protection rules
          requiredTeams: [], // This would come from environment protection rules  
          canApprove: true, // Assume user can approve - in real implementation, check permissions
          deploymentUrl: `https://github.com/${owner}/${repo}/deployments/${latestDeployment.id}`,
          timeoutMinutes: undefined,
        };
      }

      const status: DeploymentStatus = {
        environmentName,
        status: pendingApproval ? 'waiting_approval' : deploymentStatus,
        currentVersion: this.parseVersionFromDeployment(latestDeployment),
        deployedAt: deploymentStatus === 'success' && finalStatus 
          ? new Date(finalStatus.created_at) 
          : undefined,
        workflowRunId,
        workflowRunUrl,
        deployedBy: latestDeployment.creator ? {
          login: latestDeployment.creator.login,
          id: latestDeployment.creator.id,
          avatar_url: latestDeployment.creator.avatar_url,
          html_url: latestDeployment.creator.html_url,
          type: latestDeployment.creator.type,
        } : undefined,
        errorMessage: (() => {
          if (deploymentStatus === 'failure' && finalStatus?.description) {
            return finalStatus.description;
          }
          if (deploymentStatus === 'failure') {
            return 'Deployment failed';
          }
          return undefined;
        })(),
        pendingApproval,
      };

      this.statusCache.set(cacheKey, { data: status, timestamp: Date.now() });
      return status;
    });
  }

  async getDeploymentHistory(
    componentName: string,
    environmentName: string,
    owner: string,
    repo: string,
    _workflowPath?: string,
    limit: number = 20,
  ): Promise<DeploymentHistoryEntry[]> {
    const cacheKey = this.getCacheKey(componentName, environmentName);
    const cached = this.historyCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data.slice(0, limit);
    }

    return this.handleApiCall(async () => {
      // Get deployments for this environment
      const deployments = await this.listDeployments(owner, repo, environmentName, limit);

      if (deployments.length === 0) {
        return [];
      }

      const history: DeploymentHistoryEntry[] = [];

      // Process each deployment and get its latest status
      for (const deployment of deployments) {
        const deploymentStatuses = await this.listDeploymentStatuses(owner, repo, deployment.id, 50);
        
        // Sort statuses chronologically by created_at
        const sortedStatuses = deploymentStatuses.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Find the final status (success, failure, error, or inactive)
        const finalStates = ['success', 'failure', 'error', 'inactive'];
        let finalStatus = sortedStatuses.find(s => finalStates.includes(s.state));
        
        // If no final status found, use the most recent status
        if (!finalStatus && sortedStatuses.length > 0) {
          finalStatus = sortedStatuses[sortedStatuses.length - 1];
        }

        const status = finalStatus 
          ? this.mapDeploymentStateToDeploymentStatus(finalStatus.state)
          : 'idle';

        // Use deployment creation as start time
        const startedAt = new Date(deployment.created_at);
        
        // For completion time, use the final status timestamp if deployment is complete
        let completedAt: Date | undefined;
        let duration: number | undefined;
        
        if (finalStatus && finalStates.includes(finalStatus.state)) {
          completedAt = new Date(finalStatus.created_at);
          duration = completedAt.getTime() - startedAt.getTime();
        }

        // Extract workflow run info from deployment payload or status target_url
        let workflowRunId: number | undefined;
        let workflowRunUrl: string | undefined;

        if (finalStatus?.target_url) {
          const runIdMatch = finalStatus.target_url.match(/\/runs\/(\d+)/);
          if (runIdMatch) {
            workflowRunId = parseInt(runIdMatch[1], 10);
            workflowRunUrl = finalStatus.target_url;
          }
        }

        // If no workflow URL found, check payload for workflow information
        if (!workflowRunUrl && deployment.payload?.workflow_run_url) {
          workflowRunUrl = deployment.payload.workflow_run_url;
        }

        // Get the user who triggered the deployment
        let triggeredBy: GitHubUser;
        if (deployment.creator) {
          triggeredBy = {
            login: deployment.creator.login,
            id: deployment.creator.id,
            avatar_url: deployment.creator.avatar_url,
            html_url: deployment.creator.html_url,
            type: deployment.creator.type,
          };
        } else {
          // Fallback for deployments without creator info
          triggeredBy = {
            login: 'unknown',
            id: 0,
          };
        }

        const historyEntry: DeploymentHistoryEntry = {
          id: deployment.id.toString(),
          version: this.parseVersionFromDeployment(deployment),
          status,
          startedAt,
          completedAt,
          workflowRunId: workflowRunId || 0, // Provide fallback value
          workflowRunUrl: workflowRunUrl || '', // Provide fallback value
          triggeredBy,
          errorMessage: (() => {
            if (status === 'failure' && finalStatus?.description) {
              return finalStatus.description;
            }
            if (status === 'failure') {
              return 'Deployment failed';
            }
            return undefined;
          })(),
          duration,
        };

        history.push(historyEntry);
      }

      this.historyCache.set(cacheKey, { data: history, timestamp: Date.now() });
      return history;
    });
  }

  clearCache(): void {
    this.statusCache.clear();
    this.historyCache.clear();
  }

  clearCacheForEnvironment(componentName: string, environmentName: string): void {
    const cacheKey = this.getCacheKey(componentName, environmentName);
    this.statusCache.delete(cacheKey);
    this.historyCache.delete(cacheKey);
  }

  async listRepositoryEnvironments(owner: string, repo: string): Promise<string[]> {
    const octokit = await this.getOctokit();
    
    return this.handleApiCall(async () => {
      try {
        const response = await octokit.rest.repos.getAllEnvironments({
          owner,
          repo,
        });
        
        return response.data.environments?.map(env => env.name) || [];
      } catch (error: any) {
        // If environments API fails (not available/no permissions), fall back to deployment environments
        if (error.status === 404 || error.status === 403) {
          try {
            const deployments = await this.listDeployments(owner, repo, undefined, 100);
            const environments = new Set<string>();
            deployments.forEach(deployment => {
              if (deployment.environment) {
                environments.add(deployment.environment);
              }
            });
            return Array.from(environments).sort();
          } catch (deploymentError) {
            // If both APIs fail, return empty array so user knows we couldn't fetch environments
            return [];
          }
        }
        throw error;
      }
    });
  }

  async listWorkflowFiles(owner: string, repo: string): Promise<string[]> {
    const octokit = await this.getOctokit();
    
    return this.handleApiCall(async () => {
      try {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: '.github/workflows',
        });

        if (Array.isArray(response.data)) {
          return response.data
            .filter(file => 
              file.type === 'file' && 
              file.name &&
              /\.(yml|yaml)$/i.test(file.name)
            )
            .map(file => `.github/workflows/${file.name}`)
            .sort();
        }
        
        return [];
      } catch (error: any) {
        if (error.status === 404) {
          return []; // No workflows directory found
        }
        throw error;
      }
    });
  }

  async createDeploymentStatus(
    owner: string,
    repo: string,
    deploymentId: number,
    state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success',
    description?: string,
    targetUrl?: string,
  ): Promise<GitHubDeploymentStatus> {
    const octokit = await this.getOctokit();

    return this.handleApiCall(async () => {
      const response = await octokit.rest.repos.createDeploymentStatus({
        owner,
        repo,
        deployment_id: deploymentId,
        state,
        description,
        target_url: targetUrl,
      });

      return {
        id: response.data.id,
        state: response.data.state as 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success',
        description: response.data.description,
        environment: response.data.environment || '',
        target_url: response.data.target_url,
        log_url: response.data.log_url || null,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        deployment_url: response.data.deployment_url,
      };
    });
  }

  async approveDeployment(
    owner: string,
    repo: string,
    deploymentId: number,
    comment?: string,
  ): Promise<void> {
    return this.handleApiCall(async () => {
      await this.createDeploymentStatus(
        owner,
        repo,
        deploymentId,
        'success',
        comment || 'Deployment approved via Backstage'
      );
    });
  }

  async rejectDeployment(
    owner: string,
    repo: string,
    deploymentId: number,
    comment?: string,
  ): Promise<void> {
    return this.handleApiCall(async () => {
      await this.createDeploymentStatus(
        owner,
        repo,
        deploymentId,
        'failure',
        comment || 'Deployment rejected via Backstage'
      );
    });
  }

  async getPendingDeployments(
    owner: string,
    repo: string,
    environment?: string,
  ): Promise<GitHubDeployment[]> {
    return this.handleApiCall(async () => {
      const deployments = await this.listDeployments(owner, repo, environment, 50);
      
      // Filter for deployments that are in pending state (waiting for approval)
      const pendingDeployments: GitHubDeployment[] = [];
      
      for (const deployment of deployments) {
        const statuses = await this.listDeploymentStatuses(owner, repo, deployment.id, 10);
        
        // Check if the latest status is pending/queued (indicating waiting for approval)
        const latestStatus = statuses.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        if (latestStatus && (latestStatus.state === 'pending' || latestStatus.state === 'queued')) {
          pendingDeployments.push(deployment);
        }
      }
      
      return pendingDeployments;
    });
  }
}