import { FC, ReactNode, ComponentType, ErrorInfo, Component } from 'react';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Button, Typography, Box } from '@material-ui/core';
import { GitHubApiError } from '../../services/GitHubApiService';

interface GitHubErrorDisplayProps {
  error: GitHubApiError;
  onRetry?: () => void;
}

export const GitHubErrorDisplay: FC<GitHubErrorDisplayProps> = ({
  error,
  onRetry,
}) => {
  const getErrorSeverity = (code?: string) => {
    switch (code) {
      case 'AUTHENTICATION_FAILED':
        return 'error';
      case 'RATE_LIMIT_EXCEEDED':
        return 'warning';
      case 'INSUFFICIENT_PERMISSIONS':
        return 'warning';
      case 'RESOURCE_NOT_FOUND':
        return 'info';
      default:
        return 'error';
    }
  };

  const getErrorTitle = (code?: string) => {
    switch (code) {
      case 'AUTHENTICATION_FAILED':
        return 'GitHub Authentication Required';
      case 'RATE_LIMIT_EXCEEDED':
        return 'GitHub API Rate Limit Exceeded';
      case 'INSUFFICIENT_PERMISSIONS':
        return 'Insufficient GitHub Permissions';
      case 'RESOURCE_NOT_FOUND':
        return 'GitHub Resource Not Found';
      default:
        return 'GitHub API Error';
    }
  };

  const getErrorActions = (code?: string) => {
    switch (code) {
      case 'AUTHENTICATION_FAILED':
        return (
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Please refresh the page to re-authenticate with GitHub.
          </Typography>
        );
      case 'RATE_LIMIT_EXCEEDED':
        return (
          <Typography variant="body2" style={{ marginTop: 8 }}>
            Please wait for the rate limit to reset before trying again.
          </Typography>
        );
      case 'INSUFFICIENT_PERMISSIONS':
        return (
          <Typography variant="body2" style={{ marginTop: 8 }}>
            You need read access to the repository and workflow permissions.
            Contact your repository administrator if you believe this is an error.
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Alert severity={getErrorSeverity(error.code)}>
      <AlertTitle>{getErrorTitle(error.code)}</AlertTitle>
      <Typography variant="body2">{error.message}</Typography>
      {getErrorActions(error.code)}
      {onRetry && error.code !== 'AUTHENTICATION_FAILED' && (
        <Box mt={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={onRetry}
            color="inherit"
          >
            Retry
          </Button>
        </Box>
      )}
    </Alert>
  );
};

interface GitHubErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{ error: GitHubApiError; retry: () => void }>;
}

interface GitHubErrorBoundaryState {
  hasError: boolean;
  error: GitHubApiError | null;
}

export class GitHubErrorBoundary extends Component<
  GitHubErrorBoundaryProps,
  GitHubErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): GitHubErrorBoundaryState {
    if (error instanceof GitHubApiError) {
      return { hasError: true, error };
    }
    return {
      hasError: true,
      error: new GitHubApiError('An unexpected error occurred'),
    };
  }

  constructor(props: GitHubErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('GitHub API Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }
      return <GitHubErrorDisplay error={this.state.error} onRetry={this.retry} />;
    }

    return this.props.children;
  }
}