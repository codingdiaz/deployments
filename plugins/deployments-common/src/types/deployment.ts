/**
 * Deployment status and history types for the deployments plugin.
 */

/**
 * Possible deployment status values
 */
export type DeploymentStatusType = 
  | 'idle'        // No deployment activity
  | 'running'     // Deployment in progress
  | 'success'     // Deployment completed successfully
  | 'failure'     // Deployment failed
  | 'cancelled';  // Deployment was cancelled

/**
 * GitHub user information
 */
export interface GitHubUser {
  /** GitHub username */
  login: string;
  /** GitHub user ID */
  id: number;
  /** User's avatar URL */
  avatar_url?: string;
  /** User's GitHub profile URL */
  html_url?: string;
  /** User type (User, Bot, etc.) */
  type?: string;
}

/**
 * Current deployment status for an environment
 */
export interface DeploymentStatus {
  /** Name of the environment */
  environmentName: string;
  /** Current deployment status */
  status: DeploymentStatusType;
  /** Currently deployed version (tag, commit SHA, etc.) */
  currentVersion?: string;
  /** Timestamp when the current deployment was completed */
  deployedAt?: Date;
  /** GitHub workflow run ID for the current deployment */
  workflowRunId?: number;
  /** URL to the GitHub workflow run */
  workflowRunUrl?: string;
  /** User who deployed this version */
  deployedBy?: GitHubUser;
  /** Error message if deployment failed */
  errorMessage?: string;
}

/**
 * Historical deployment entry
 */
export interface DeploymentHistoryEntry {
  /** Unique identifier for the deployment */
  id: string;
  /** Version that was deployed (tag, commit SHA, etc.) */
  version: string;
  /** Deployment status */
  status: DeploymentStatusType;
  /** Timestamp when deployment started */
  startedAt: Date;
  /** Timestamp when deployment completed (if finished) */
  completedAt?: Date;
  /** GitHub workflow run ID */
  workflowRunId: number;
  /** URL to the GitHub workflow run */
  workflowRunUrl: string;
  /** User who triggered the deployment */
  triggeredBy: GitHubUser;
  /** Error message if deployment failed */
  errorMessage?: string;
  /** Duration of the deployment in milliseconds */
  duration?: number;
}

/**
 * Response payload for deployment status
 */
export interface DeploymentStatusResponse {
  /** The deployment status */
  status: DeploymentStatus;
}

/**
 * Response payload for deployment history
 */
export interface DeploymentHistoryResponse {
  /** Array of deployment history entries */
  history: DeploymentHistoryEntry[];
  /** Total number of deployments (for pagination) */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
}

/**
 * Request payload for triggering a deployment
 */
export interface TriggerDeploymentRequest {
  /** Version to deploy (tag, commit SHA, etc.) */
  version: string;
  /** Optional deployment notes or description */
  notes?: string;
  /** Additional parameters to pass to the workflow */
  parameters?: Record<string, string>;
}