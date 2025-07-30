import { GitHubApiError } from '../services/GitHubApiService';

/**
 * User-friendly error messages for common error scenarios
 */
export const ERROR_MESSAGES = {
  // GitHub API Errors
  AUTHENTICATION_FAILED: {
    title: 'GitHub Authentication Required',
    message: 'Your GitHub authentication has expired. Please refresh the page to re-authenticate.',
    suggestion: 'Click the refresh button or reload the page to sign in again.',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'GitHub API Rate Limit Exceeded',
    message: 'You have exceeded GitHub\'s API rate limit. Please wait before making more requests.',
    suggestion: 'GitHub allows a limited number of API calls per hour. The limit will reset automatically.',
  },
  SECONDARY_RATE_LIMIT_EXCEEDED: {
    title: 'GitHub API Abuse Detection',
    message: 'GitHub has detected unusual activity and temporarily limited your access.',
    suggestion: 'This is a temporary restriction. Please wait a few minutes before trying again.',
  },
  INSUFFICIENT_PERMISSIONS: {
    title: 'Insufficient GitHub Permissions',
    message: 'You don\'t have the required permissions to access this GitHub resource.',
    suggestion: 'Contact your repository administrator to grant you the necessary permissions (repo and workflow access).',
  },
  RESOURCE_NOT_FOUND: {
    title: 'GitHub Resource Not Found',
    message: 'The requested GitHub resource could not be found.',
    suggestion: 'Check that the repository exists and you have access to it.',
  },
  WORKFLOW_NOT_FOUND: {
    title: 'GitHub Workflow Not Found',
    message: 'The specified GitHub Actions workflow could not be found.',
    suggestion: 'Verify the workflow file path and ensure the workflow exists in the repository.',
  },
  NETWORK_ERROR: {
    title: 'Network Connection Error',
    message: 'Unable to connect to GitHub. Please check your internet connection.',
    suggestion: 'Check your network connection and try again. If the problem persists, GitHub may be experiencing issues.',
  },
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'The provided data is invalid.',
    suggestion: 'Please check your input and try again.',
  },
  SERVER_ERROR: {
    title: 'GitHub Server Error',
    message: 'GitHub is experiencing server issues. This is likely temporary.',
    suggestion: 'Please try again in a few minutes. You can check GitHub\'s status at githubstatus.com.',
  },
  
  // Application Errors
  ENVIRONMENT_CREATION_FAILED: {
    title: 'Failed to Create Environment',
    message: 'Unable to create the deployment environment configuration.',
    suggestion: 'Please check your input and try again. Ensure the environment name is unique.',
  },
  ENVIRONMENT_UPDATE_FAILED: {
    title: 'Failed to Update Environment',
    message: 'Unable to update the deployment environment configuration.',
    suggestion: 'Please check your changes and try again.',
  },
  ENVIRONMENT_DELETE_FAILED: {
    title: 'Failed to Delete Environment',
    message: 'Unable to delete the deployment environment configuration.',
    suggestion: 'Please try again. If the problem persists, refresh the page.',
  },
  DEPLOYMENT_TRIGGER_FAILED: {
    title: 'Failed to Trigger Deployment',
    message: 'Unable to trigger the deployment workflow.',
    suggestion: 'Check that the workflow exists and you have permission to trigger it.',
  },
  CATALOG_FETCH_FAILED: {
    title: 'Failed to Load Applications',
    message: 'Unable to fetch applications from the Backstage catalog.',
    suggestion: 'Please refresh the page or contact your administrator if the issue persists.',
  },
  STATUS_FETCH_FAILED: {
    title: 'Failed to Load Deployment Status',
    message: 'Unable to fetch the current deployment status.',
    suggestion: 'This might be due to network issues or GitHub API limits. Try refreshing in a moment.',
  },
  HISTORY_FETCH_FAILED: {
    title: 'Failed to Load Deployment History',
    message: 'Unable to fetch the deployment history.',
    suggestion: 'This might be due to network issues or GitHub API limits. Try refreshing in a moment.',
  },
  
  // Form Validation Errors
  REQUIRED_FIELD: {
    title: 'Required Field Missing',
    message: 'This field is required and cannot be empty.',
    suggestion: 'Please provide a value for this field.',
  },
  INVALID_REPO_FORMAT: {
    title: 'Invalid Repository Format',
    message: 'Repository must be in the format "owner/repository".',
    suggestion: 'Example: "facebook/react" or "microsoft/vscode"',
  },
  INVALID_WORKFLOW_PATH: {
    title: 'Invalid Workflow Path',
    message: 'Workflow path must be a valid GitHub Actions workflow file.',
    suggestion: 'Example: ".github/workflows/deploy.yml"',
  },
  DUPLICATE_ENVIRONMENT: {
    title: 'Duplicate Environment Name',
    message: 'An environment with this name already exists.',
    suggestion: 'Please choose a different name for this environment.',
  },
} as const;

/**
 * Get user-friendly error message for a given error
 */
export function getUserFriendlyErrorMessage(error: Error | GitHubApiError | string): {
  title: string;
  message: string;
  suggestion: string;
} {
  // Handle string errors
  if (typeof error === 'string') {
    return {
      title: 'Error',
      message: error,
      suggestion: 'Please try again or contact support if the issue persists.',
    };
  }
  
  // Handle GitHubApiError
  if (error instanceof GitHubApiError && error.code) {
    const errorMessage = ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES];
    if (errorMessage) {
      return errorMessage;
    }
  }
  
  // Handle generic errors by message content
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return ERROR_MESSAGES.AUTHENTICATION_FAILED;
  }
  
  if (message.includes('permission') || message.includes('forbidden')) {
    return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return ERROR_MESSAGES.RESOURCE_NOT_FOUND;
  }
  
  if (message.includes('rate limit')) {
    return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }
  
  if (message.includes('environment')) {
    if (message.includes('create')) {
      return ERROR_MESSAGES.ENVIRONMENT_CREATION_FAILED;
    }
    if (message.includes('update')) {
      return ERROR_MESSAGES.ENVIRONMENT_UPDATE_FAILED;
    }
    if (message.includes('delete')) {
      return ERROR_MESSAGES.ENVIRONMENT_DELETE_FAILED;
    }
  }
  
  if (message.includes('deployment') && message.includes('trigger')) {
    return ERROR_MESSAGES.DEPLOYMENT_TRIGGER_FAILED;
  }
  
  if (message.includes('catalog')) {
    return ERROR_MESSAGES.CATALOG_FETCH_FAILED;
  }
  
  if (message.includes('status')) {
    return ERROR_MESSAGES.STATUS_FETCH_FAILED;
  }
  
  if (message.includes('history')) {
    return ERROR_MESSAGES.HISTORY_FETCH_FAILED;
  }
  
  // Default fallback
  return {
    title: 'Unexpected Error',
    message: error.message || 'An unexpected error occurred.',
    suggestion: 'Please try again or contact support if the issue persists.',
  };
}

/**
 * Get contextual help text for common operations
 */
export const HELP_TEXT = {
  ENVIRONMENT_CREATION: 'Create a new deployment environment by specifying the GitHub repository, workflow file, and target job. Each environment represents a deployment target like staging or production.',
  DEPLOYMENT_TRIGGER: 'Trigger a new deployment by specifying a version (tag, commit SHA, or branch name). The deployment will run through your configured GitHub Actions workflow.',
  GITHUB_PERMISSIONS: 'This plugin requires GitHub permissions to read repositories and trigger workflows. Make sure you have the necessary access to the repositories you want to deploy.',
  WORKFLOW_CONFIGURATION: 'Your GitHub Actions workflow should accept environment and version inputs for deployment dispatch. The workflow file path should be relative to the repository root.',
  STATUS_MONITORING: 'Deployment status is automatically updated by monitoring your GitHub Actions workflow runs. Status updates may take a few moments to appear.',
} as const;

/**
 * Get help text for a specific context
 */
export function getHelpText(context: keyof typeof HELP_TEXT): string {
  return HELP_TEXT[context];
}