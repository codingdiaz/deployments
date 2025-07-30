/**
 * Utility functions for the deployments plugin.
 */

import { DeploymentStatusType } from './types/deployment';
import { ERROR_CODES } from './constants';

/**
 * Validates if a GitHub repository string is in the correct format
 * @param repo - Repository string to validate (should be "owner/repo")
 * @returns true if valid, false otherwise
 */
export function isValidGitHubRepo(repo: string): boolean {
  const repoRegex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
  return repoRegex.test(repo) && !repo.includes('//') && repo.split('/').length === 2;
}

/**
 * Validates if a workflow path is in the correct format
 * @param path - Workflow path to validate
 * @returns true if valid, false otherwise
 */
export function isValidWorkflowPath(path: string): boolean {
  return path.startsWith('.github/workflows/') && path.endsWith('.yml') || path.endsWith('.yaml');
}

/**
 * Extracts owner and repo from a GitHub repository string
 * @param repo - Repository string in format "owner/repo"
 * @returns Object with owner and repo properties
 * @throws Error if repo format is invalid
 */
export function parseGitHubRepo(repo: string): { owner: string; repo: string } {
  if (!isValidGitHubRepo(repo)) {
    throw new Error(`Invalid GitHub repository format: ${repo}. Expected format: "owner/repo"`);
  }
  
  const [owner, repoName] = repo.split('/');
  return { owner, repo: repoName };
}

/**
 * Generates a unique ID for environment configurations
 * @param componentName - Name of the component
 * @param environmentName - Name of the environment
 * @returns Unique ID string
 */
export function generateEnvironmentId(componentName: string, environmentName: string): string {
  return `${componentName}:${environmentName}`;
}

/**
 * Parses an environment ID back into component and environment names
 * @param id - Environment ID to parse
 * @returns Object with componentName and environmentName
 * @throws Error if ID format is invalid
 */
export function parseEnvironmentId(id: string): { componentName: string; environmentName: string } {
  const parts = id.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid environment ID format: ${id}. Expected format: "componentName:environmentName"`);
  }
  
  return { componentName: parts[0], environmentName: parts[1] };
}

/**
 * Determines if a deployment status represents an active/running state
 * @param status - Deployment status to check
 * @returns true if status is active, false otherwise
 */
export function isActiveDeploymentStatus(status: DeploymentStatusType): boolean {
  return status === 'running';
}

/**
 * Determines if a deployment status represents a completed state
 * @param status - Deployment status to check
 * @returns true if status is completed, false otherwise
 */
export function isCompletedDeploymentStatus(status: DeploymentStatusType): boolean {
  return ['success', 'failure', 'cancelled'].includes(status);
}

/**
 * Determines if a deployment status represents a successful state
 * @param status - Deployment status to check
 * @returns true if status is successful, false otherwise
 */
export function isSuccessfulDeploymentStatus(status: DeploymentStatusType): boolean {
  return status === 'success';
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } 
    return `${seconds}s`;
  
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } 
    return 'Just now';
  
}

/**
 * Truncates a string to a specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength - 3)  }...`;
}

/**
 * Validates environment name format
 * @param name - Environment name to validate
 * @returns true if valid, false otherwise
 */
export function isValidEnvironmentName(name: string): boolean {
  // Environment names should be alphanumeric with hyphens and underscores
  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  return nameRegex.test(name) && name.length > 0 && name.length <= 50;
}

/**
 * Validates component name format
 * @param name - Component name to validate
 * @returns true if valid, false otherwise
 */
export function isValidComponentName(name: string): boolean {
  // Component names should be alphanumeric with hyphens and underscores
  const nameRegex = /^[a-zA-Z0-9_-]+$/;
  return nameRegex.test(name) && name.length > 0 && name.length <= 100;
}

/**
 * Creates a standardized error object
 * @param message - Error message
 * @param code - Error code
 * @param details - Additional error details
 * @returns Standardized error object
 */
export function createError(
  message: string,
  code: keyof typeof ERROR_CODES = 'INTERNAL_ERROR',
  details?: Record<string, any>
) {
  return {
    message,
    code: ERROR_CODES[code],
    details,
  };
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}