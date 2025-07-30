export { deploymentsPlugin, DeploymentsPage } from './plugin';
export { 
  rootRouteRef, 
  applicationDeploymentRouteRef, 
  environmentDetailsRouteRef 
} from './routes';

// Export GitHub integration services and hooks
export { GitHubApiService, GitHubApiError } from './services/GitHubApiService';
export { 
  useGitHubApi, 
  useGitHubApiCall, 
  useGitHubWorkflows, 
  useGitHubWorkflowRuns, 
  useGitHubTags, 
  useGitHubCommits 
} from './hooks/useGitHubApi';
export { GitHubErrorBoundary, GitHubErrorDisplay } from './components/GitHubErrorBoundary/GitHubErrorBoundary';
