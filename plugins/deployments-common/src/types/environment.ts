/**
 * Environment configuration types for the deployments plugin.
 */

/**
 * Configuration for a deployment environment
 */
export interface EnvironmentConfig {
  /** Unique identifier for the environment configuration */
  id: string;
  /** Name of the Backstage component this environment belongs to */
  componentName: string;
  /** Name of the environment (e.g., 'staging', 'production') */
  environmentName: string;
  /** GitHub repository in format "owner/repo" */
  githubRepo: string;
  /** Optional path to the GitHub workflow file (e.g., ".github/workflows/deploy.yml") */
  workflowPath?: string;
  /** Timestamp when the configuration was created */
  createdAt: Date;
  /** Timestamp when the configuration was last updated */
  updatedAt: Date;
}

/**
 * Request payload for creating a new environment configuration
 */
export interface CreateEnvironmentRequest {
  /** Name of the environment (e.g., 'staging', 'production') */
  environmentName: string;
  /** Optional path to the GitHub workflow file */
  workflowPath?: string;
}

/**
 * Request payload for updating an existing environment configuration
 */
export interface UpdateEnvironmentRequest {
  /** Optional path to the GitHub workflow file */
  workflowPath?: string;
}

/**
 * Response payload for environment configuration operations
 */
export interface EnvironmentConfigResponse {
  /** The environment configuration */
  environment: EnvironmentConfig;
}

/**
 * Response payload for listing environment configurations
 */
export interface EnvironmentConfigListResponse {
  /** Array of environment configurations */
  environments: EnvironmentConfig[];
}