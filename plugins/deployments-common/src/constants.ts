/**
 * Constants for the deployments plugin.
 */

/**
 * Plugin identification
 */
export const PLUGIN_ID = 'deployments';

/**
 * Backstage annotations used by the plugin
 */
export const ANNOTATIONS = {
  /** Annotation to mark a component as deployment-enabled */
  DEPLOYMENT_ENABLED: 'backstage.io/deployment-enabled',
  /** Annotation for source location (GitHub repo URL) */
  SOURCE_LOCATION: 'backstage.io/source-location',
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  /** Base path for all deployment API endpoints */
  BASE: '/api/deployments',
  /** Environment configuration endpoints */
  ENVIRONMENTS: '/api/deployments/environments',
  /** Deployment status endpoints */
  STATUS: '/api/deployments/status',
  /** Deployment history endpoints */
  HISTORY: '/api/deployments/history',
  /** GitHub proxy endpoints */
  GITHUB: '/api/deployments/github',
  /** Health check endpoint */
  HEALTH: '/api/deployments/health',
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Default page size for paginated responses */
  PAGE_SIZE: 20,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
  /** Default cache TTL in seconds */
  CACHE_TTL: 300, // 5 minutes
  /** Default timeout for GitHub API calls in milliseconds */
  GITHUB_API_TIMEOUT: 10000, // 10 seconds
  /** Maximum number of deployment history entries to fetch */
  MAX_HISTORY_ENTRIES: 100,
} as const;

/**
 * GitHub-specific constants
 */
export const GITHUB = {
  /** Required GitHub scopes for the plugin */
  REQUIRED_SCOPES: ['repo', 'workflow'] as const,
  /** GitHub API base URL */
  API_BASE_URL: 'https://api.github.com',
  /** GitHub workflow dispatch event name */
  WORKFLOW_DISPATCH_EVENT: 'workflow_dispatch',
  /** Maximum number of workflow runs to fetch per request */
  MAX_WORKFLOW_RUNS: 100,
  /** Maximum number of tags to fetch for version selector */
  MAX_TAGS: 50,
  /** Maximum number of commits to fetch for version selector */
  MAX_COMMITS: 50,
} as const;

/**
 * UI-related constants
 */
export const UI = {
  /** Plugin routes */
  ROUTES: {
    ROOT: '/deployments',
    APPLICATION: '/deployments/:componentName',
    ENVIRONMENT: '/deployments/:componentName/:environmentName',
  },
  /** Status colors for deployment states */
  STATUS_COLORS: {
    idle: '#6b7280',      // gray
    running: '#f59e0b',   // amber
    success: '#10b981',   // emerald
    failure: '#ef4444',   // red
    cancelled: '#6b7280', // gray
  },
  /** Status icons for deployment states */
  STATUS_ICONS: {
    idle: 'pause',
    running: 'sync',
    success: 'check_circle',
    failure: 'error',
    cancelled: 'cancel',
  },
} as const;

/**
 * Error codes used throughout the plugin
 */
export const ERROR_CODES = {
  /** Generic validation error */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Environment not found */
  ENVIRONMENT_NOT_FOUND: 'ENVIRONMENT_NOT_FOUND',
  /** Component not found */
  COMPONENT_NOT_FOUND: 'COMPONENT_NOT_FOUND',
  /** GitHub API error */
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  /** Authentication error */
  AUTH_ERROR: 'AUTH_ERROR',
  /** Permission denied */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  /** Internal server error */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Configuration error */
  CONFIG_ERROR: 'CONFIG_ERROR',
  /** Workflow not found */
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  /** Deployment already running */
  DEPLOYMENT_RUNNING: 'DEPLOYMENT_RUNNING',
} as const;

/**
 * Cache keys for storing data
 */
export const CACHE_KEYS = {
  /** Deployment status cache key prefix */
  DEPLOYMENT_STATUS: 'deployment_status',
  /** Workflow runs cache key prefix */
  WORKFLOW_RUNS: 'workflow_runs',
  /** GitHub workflows cache key prefix */
  WORKFLOWS: 'workflows',
  /** Repository tags cache key prefix */
  TAGS: 'tags',
  /** Repository commits cache key prefix */
  COMMITS: 'commits',
} as const;