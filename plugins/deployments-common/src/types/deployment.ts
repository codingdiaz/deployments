/**
 * Deployment status and history types for the deployments plugin.
 */

/**
 * Possible deployment status values
 */
export type DeploymentStatusType = 
  | 'idle'                // No deployment activity
  | 'running'             // Deployment in progress
  | 'success'             // Deployment completed successfully
  | 'failure'             // Deployment failed
  | 'cancelled'           // Deployment was cancelled
  | 'waiting_approval';   // Deployment is waiting for approval

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
  /** Pending approval information (if status is waiting_approval) */
  pendingApproval?: PendingApproval;
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
 * Pending approval information
 */
export interface PendingApproval {
  /** GitHub deployment ID */
  deploymentId: number;
  /** Environment name requiring approval */
  environment: string;
  /** Version being deployed */
  version: string;
  /** User who triggered the deployment */
  triggeredBy: GitHubUser;
  /** Timestamp when approval was requested */
  requestedAt: Date;
  /** Required reviewers for this environment */
  requiredReviewers: string[];
  /** Teams that can approve */
  requiredTeams: string[];
  /** Whether the current user can approve this deployment */
  canApprove: boolean;
  /** URL to the GitHub deployment */
  deploymentUrl: string;
  /** Approval timeout (if configured) */
  timeoutMinutes?: number;
  /** Timestamp when wait timer was started (if configured) */
  waitTimerStartedAt?: Date;
}

/**
 * Request payload for approving a deployment
 */
export interface ApproveDeploymentRequest {
  /** GitHub deployment ID */
  deploymentId: number;
  /** Optional comment for the approval */
  comment?: string;
}

/**
 * Response payload for deployment approval
 */
export interface ApproveDeploymentResponse {
  /** Whether the approval was successful */
  success: boolean;
  /** Updated deployment status */
  status: DeploymentStatus;
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