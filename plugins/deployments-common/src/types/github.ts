/**
 * GitHub API related types for the deployments plugin.
 */

/**
 * GitHub workflow information
 */
export interface GitHubWorkflow {
  /** Workflow ID */
  id: number;
  /** Workflow name */
  name: string;
  /** Path to the workflow file */
  path: string;
  /** Current state of the workflow */
  state: 'active' | 'deleted' | 'disabled_fork' | 'disabled_inactivity' | 'disabled_manually';
  /** Timestamp when workflow was created */
  created_at: string;
  /** Timestamp when workflow was last updated */
  updated_at: string;
  /** URL to the workflow */
  url: string;
  /** HTML URL to the workflow */
  html_url: string;
  /** Badge URL for the workflow */
  badge_url: string;
}

/**
 * GitHub workflow run information
 */
export interface GitHubWorkflowRun {
  /** Run ID */
  id: number;
  /** Run name */
  name?: string;
  /** Run number */
  run_number: number;
  /** Run attempt number */
  run_attempt: number;
  /** Current status of the run */
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  /** Conclusion of the run (if completed) */
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  /** Workflow ID this run belongs to */
  workflow_id: number;
  /** Head branch name */
  head_branch: string;
  /** Head SHA */
  head_sha: string;
  /** URL to the run */
  url: string;
  /** HTML URL to the run */
  html_url: string;
  /** Timestamp when run was created */
  created_at: string;
  /** Timestamp when run was updated */
  updated_at: string;
  /** Timestamp when run started */
  run_started_at?: string;
  /** User who triggered the run */
  triggering_actor: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  /** Event that triggered the run */
  event: string;
  /** Display title for the run */
  display_title: string;
}

/**
 * GitHub workflow job information
 */
export interface GitHubWorkflowJob {
  /** Job ID */
  id: number;
  /** Job name */
  name: string;
  /** Current status of the job */
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  /** Conclusion of the job (if completed) */
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  /** Timestamp when job started */
  started_at: string;
  /** Timestamp when job completed */
  completed_at?: string;
  /** URL to the job */
  url: string;
  /** HTML URL to the job */
  html_url: string;
}

/**
 * GitHub repository tag information
 */
export interface GitHubTag {
  /** Tag name */
  name: string;
  /** Commit SHA the tag points to */
  commit: {
    sha: string;
    url: string;
  };
  /** Zipball URL */
  zipball_url: string;
  /** Tarball URL */
  tarball_url: string;
}

/**
 * GitHub repository commit information
 */
export interface GitHubCommit {
  /** Commit SHA */
  sha: string;
  /** Commit message */
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  /** Author information */
  author?: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  /** HTML URL to the commit */
  html_url: string;
}

/**
 * GitHub environment information
 */
export interface GitHubEnvironment {
  /** Environment ID */
  id: number;
  /** Environment name */
  name: string;
  /** URL to the environment */
  url: string;
  /** HTML URL to the environment */
  html_url: string;
  /** Timestamp when environment was created */
  created_at: string;
  /** Timestamp when environment was updated */
  updated_at: string;
  /** Protection rules for the environment */
  protection_rules?: Array<{
    id: number;
    type: string;
  }>;
}

/**
 * GitHub API error response
 */
export interface GitHubApiError {
  /** Error message */
  message: string;
  /** Error documentation URL */
  documentation_url?: string;
  /** Additional error details */
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}