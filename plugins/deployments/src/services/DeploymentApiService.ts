import { DiscoveryApi, FetchApi, OAuthApi } from '@backstage/core-plugin-api';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  EnvironmentConfigResponse,
  EnvironmentConfigListResponse,
  DeploymentStatus,
  DeploymentHistoryEntry,
  // ApproveDeploymentRequest,
  // ApproveDeploymentResponse,
  DeploymentStatusResponse,
} from '@internal/plugin-deployments-common';
import { GitHubApiService } from './GitHubApiService';

/**
 * Service for interacting with the deployment plugin backend API
 */
export class DeploymentApiService {
  private gitHubApiService: GitHubApiService | null = null;

  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
    private readonly oauthApi?: OAuthApi,
  ) {}

  private async getBaseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('deployments');
  }

  private getGitHubApiService(): GitHubApiService {
    if (!this.gitHubApiService && this.oauthApi) {
      this.gitHubApiService = new GitHubApiService(this.oauthApi);
    }
    if (!this.gitHubApiService) {
      throw new Error('GitHub OAuth API not available');
    }
    return this.gitHubApiService;
  }

  private parseGitHubRepo(githubRepo: string): { owner: string; repo: string } {
    const parts = githubRepo.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid GitHub repository format: ${githubRepo}. Expected format: owner/repo`);
    }
    return { owner: parts[0], repo: parts[1] };
  }

  /**
   * Get all environments for a component
   */
  async getEnvironments(componentName: string): Promise<EnvironmentConfig[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/environments/${encodeURIComponent(componentName)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch environments: ${response.statusText}`);
    }
    
    const data: EnvironmentConfigListResponse = await response.json();
    return data.environments;
  }

  /**
   * Get a specific environment configuration
   */
  async getEnvironment(componentName: string, environmentName: string): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(componentName)}/${encodeURIComponent(environmentName)}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Environment '${environmentName}' not found for component '${componentName}'`);
      }
      throw new Error(`Failed to fetch environment: ${response.statusText}`);
    }
    
    const data: EnvironmentConfigResponse = await response.json();
    return data.environment;
  }

  /**
   * Create a new environment configuration
   */
  async createEnvironment(
    componentName: string,
    request: CreateEnvironmentRequest
  ): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/environments/${encodeURIComponent(componentName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to create environment: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Use default error message if parsing fails
      }
      
      throw new Error(errorMessage);
    }
    
    const data: EnvironmentConfigResponse = await response.json();
    return data.environment;
  }

  /**
   * Update an existing environment configuration
   */
  async updateEnvironment(
    componentName: string,
    environmentName: string,
    request: UpdateEnvironmentRequest
  ): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(componentName)}/${encodeURIComponent(environmentName)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to update environment: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Use default error message if parsing fails
      }
      
      if (response.status === 404) {
        errorMessage = `Environment '${environmentName}' not found for component '${componentName}'`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data: EnvironmentConfigResponse = await response.json();
    return data.environment;
  }

  /**
   * Delete an environment configuration
   */
  async deleteEnvironment(componentName: string, environmentName: string): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(componentName)}/${encodeURIComponent(environmentName)}`,
      {
        method: 'DELETE',
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Environment '${environmentName}' not found for component '${componentName}'`);
      }
      throw new Error(`Failed to delete environment: ${response.statusText}`);
    }
  }

  /**
   * Get deployment status for a specific environment (with approval support)
   */
  async getDeploymentStatus(componentName: string, environmentName: string): Promise<DeploymentStatus> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await this.fetchApi.fetch(
        `${baseUrl}/deployments/${encodeURIComponent(componentName)}/${encodeURIComponent(environmentName)}/status`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deployment status: ${response.statusText}`);
      }
      
      const data: DeploymentStatusResponse = await response.json();
      return data.status;
    } catch (error) {
      // If environment doesn't exist or API fails, return idle status
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          environmentName,
          status: 'idle',
          errorMessage: `Environment '${environmentName}' not found`,
        };
      }
      
      // For other errors, return error status
      return {
        environmentName,
        status: 'idle',
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch deployment status',
      };
    }
  }

  /**
   * Approve a pending deployment directly via GitHub API
   */
  // async approveDeployment(
  //   deploymentId: number,
  //   comment?: string
  // ): Promise<void> {
  //   // We'll need the repo info, but for now let's try to get it from the environment
  //   // This is a simplified approach - in a real implementation you might want to 
  //   // pass the owner/repo as parameters or store them in the deployment context
  //   throw new Error('Direct GitHub approval not yet implemented - use approveGitHubDeployment instead');
  // }

  /**
   * Approve a GitHub deployment directly
   */
  async approveGitHubDeployment(
    owner: string,
    repo: string,
    deploymentId: number,
    comment?: string
  ): Promise<void> {
    const gitHubService = this.getGitHubApiService();
    await gitHubService.approveDeployment(owner, repo, deploymentId, comment);
  }

  /**
   * Reject a GitHub deployment directly
   */
  async rejectGitHubDeployment(
    owner: string,
    repo: string,
    deploymentId: number,
    comment?: string
  ): Promise<void> {
    const gitHubService = this.getGitHubApiService();
    await gitHubService.rejectDeployment(owner, repo, deploymentId, comment);
  }

  /**
   * Get deployment history for a specific environment
   */
  async getDeploymentHistory(
    componentName: string,
    environmentName: string,
    limit: number = 20,
  ): Promise<DeploymentHistoryEntry[]> {
    try {
      // First, get the environment configuration
      const environment = await this.getEnvironment(componentName, environmentName);
      const { owner, repo } = this.parseGitHubRepo(environment.githubRepo);
      
      // Use GitHub API service to get deployment history
      const gitHubService = this.getGitHubApiService();
      return await gitHubService.getDeploymentHistory(
        componentName,
        environmentName,
        owner,
        repo,
        environment.workflowPath,
        limit,
      );
    } catch (error) {
      // If environment doesn't exist or GitHub API fails, return empty history
      return [];
    }
  }
}