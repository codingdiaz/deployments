import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  EnvironmentConfigResponse,
  EnvironmentConfigListResponse,
} from '@internal/plugin-deployments-common';

/**
 * Service for interacting with the deployment plugin backend API
 */
export class DeploymentApiService {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  private async getBaseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('deployments');
  }

  /**
   * Get all environments for a component
   */
  async getEnvironments(componentName: string): Promise<EnvironmentConfig[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(componentName)}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch environments: ${response.statusText}`);
    }

    const data: EnvironmentConfigListResponse = await response.json();
    return data.environments;
  }

  /**
   * Get a specific environment configuration
   */
  async getEnvironment(
    componentName: string,
    environmentName: string,
  ): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(
        componentName,
      )}/${encodeURIComponent(environmentName)}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Environment '${environmentName}' not found for component '${componentName}'`,
        );
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
    request: CreateEnvironmentRequest,
  ): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(componentName)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

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
    request: UpdateEnvironmentRequest,
  ): Promise<EnvironmentConfig> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(
        componentName,
      )}/${encodeURIComponent(environmentName)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
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
  async deleteEnvironment(
    componentName: string,
    environmentName: string,
  ): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/environments/${encodeURIComponent(
        componentName,
      )}/${encodeURIComponent(environmentName)}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Environment '${environmentName}' not found for component '${componentName}'`,
        );
      }
      throw new Error(`Failed to delete environment: ${response.statusText}`);
    }
  }
}
