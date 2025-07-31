import { Component, ComponentType, ErrorInfo, FC, ReactNode, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  IconButton,
  makeStyles,
  Theme,
} from '@material-ui/core';
import ErrorIcon from '@material-ui/icons/Error';
import WarningIcon from '@material-ui/icons/Warning';
import InfoIcon from '@material-ui/icons/Info';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import RefreshIcon from '@material-ui/icons/Refresh';
import SettingsIcon from '@material-ui/icons/Settings';
import LaunchIcon from '@material-ui/icons/Launch';
import { Alert, AlertTitle } from '@material-ui/lab';
import { GitHubApiError } from '../../services/GitHubApiService';
import { getUserFriendlyErrorMessage } from '../../utils/errorMessages';

const useStyles = makeStyles((theme: Theme) => ({
  errorContainer: {
    margin: theme.spacing(2, 0),
  },
  expandButton: {
    transform: 'rotate(0deg)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandButtonOpen: {
    transform: 'rotate(180deg)',
  },
  detailsContainer: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.grey[300]}`,
  },
  codeBlock: {
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    overflow: 'auto',
    marginTop: theme.spacing(1),
  },
}));

export interface ErrorInfoDetails {
  title?: string;
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
  stack?: string;
  timestamp?: Date;
}

interface ErrorDisplayProps {
  error: Error | GitHubApiError | ErrorInfoDetails | string;
  onRetry?: () => void;
  showDetails?: boolean;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Normalize different error types into a consistent ErrorInfo structure
 */
function normalizeError(error: Error | GitHubApiError | ErrorInfoDetails | string): ErrorInfoDetails {
  if (typeof error === 'string') {
    const friendlyMessage = getUserFriendlyErrorMessage(error);
    return {
      title: friendlyMessage.title,
      message: friendlyMessage.message,
      details: { suggestion: friendlyMessage.suggestion },
      timestamp: new Date(),
    };
  }
  
  if (error instanceof GitHubApiError) {
    const friendlyMessage = getUserFriendlyErrorMessage(error);
    return {
      title: friendlyMessage.title,
      message: friendlyMessage.message,
      code: error.code,
      status: error.status,
      details: {
        ...error.details,
        suggestion: friendlyMessage.suggestion,
      },
      timestamp: new Date(),
    };
  }
  
  if (error instanceof Error) {
    const friendlyMessage = getUserFriendlyErrorMessage(error);
    return {
      title: friendlyMessage.title,
      message: friendlyMessage.message,
      stack: error.stack,
      details: { suggestion: friendlyMessage.suggestion },
      timestamp: new Date(),
    };
  }
  
  return {
    ...error,
    timestamp: error.timestamp || new Date(),
  };
}

/**
 * Get appropriate error title based on error code
 */

/**
 * Get appropriate icon based on error severity or code
 */
function getErrorIcon(severity: string, code?: string) {
  if (code === 'RATE_LIMIT_EXCEEDED' || code === 'INSUFFICIENT_PERMISSIONS') {
    return <WarningIcon />;
  }
  
  if (code === 'RESOURCE_NOT_FOUND') {
    return <InfoIcon />;
  }
  
  switch (severity) {
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    default:
      return <ErrorIcon />;
  }
}

/**
 * Get error severity based on error code
 */
function getErrorSeverity(code?: string): 'error' | 'warning' | 'info' {
  switch (code) {
    case 'RATE_LIMIT_EXCEEDED':
    case 'INSUFFICIENT_PERMISSIONS':
      return 'warning';
    case 'RESOURCE_NOT_FOUND':
      return 'info';
    default:
      return 'error';
  }
}

/**
 * Get appropriate action suggestions based on error code
 */
function getErrorActions(errorInfo: ErrorInfoDetails) {
  const actions = [];
  
  switch (errorInfo.code) {
    case 'AUTHENTICATION_FAILED':
      actions.push({
        text: 'Refresh Page',
        action: () => window.location.reload(),
        icon: <RefreshIcon />,
      });
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      if (errorInfo.details?.resetTime) {
        const resetTime = new Date(parseInt(errorInfo.details.resetTime, 10) * 1000);
        actions.push({
          text: `Rate limit resets at ${resetTime.toLocaleTimeString()}`,
          disabled: true,
        });
      }
      if (errorInfo.details?.remainingMinutes) {
        actions.push({
          text: `Wait ${errorInfo.details.remainingMinutes} minutes`,
          disabled: true,
        });
      }
      break;

    case 'SECONDARY_RATE_LIMIT_EXCEEDED':
      if (errorInfo.details?.retryAfter) {
        actions.push({
          text: `Wait ${errorInfo.details.retryAfter} seconds`,
          disabled: true,
        });
      }
      break;
      
    case 'INSUFFICIENT_PERMISSIONS':
      actions.push({
        text: 'Check Repository Access',
        action: () => {
          if (errorInfo.details?.repositoryUrl) {
            window.open(errorInfo.details.repositoryUrl, '_blank');
          }
        },
        icon: <SettingsIcon />,
      });
      if (errorInfo.details?.requiredPermissions) {
        actions.push({
          text: `Required: ${errorInfo.details.requiredPermissions.join(', ')}`,
          disabled: true,
        });
      }
      break;

    case 'RESOURCE_NOT_FOUND':
      if (errorInfo.details?.resourceType) {
        actions.push({
          text: `Missing: ${errorInfo.details.resourceType}`,
          disabled: true,
        });
      }
      break;

    case 'NETWORK_ERROR':
      actions.push({
        text: 'Check Connection',
        action: () => {
          // Try to open a simple connectivity test
          window.open('https://github.com', '_blank');
        },
        icon: <RefreshIcon />,
      });
      break;

    case 'VALIDATION_ERROR':
      if (errorInfo.details?.validationErrors?.length > 0) {
        actions.push({
          text: `${errorInfo.details?.validationErrors?.length} validation errors`,
          disabled: true,
        });
      }
      break;

    case 'SERVER_ERROR':
      actions.push({
        text: 'GitHub Status',
        action: () => {
          window.open('https://www.githubstatus.com/', '_blank');
        },
        icon: <LaunchIcon />,
      });
      break;
      
    default:
      // No additional actions for other error types
      break;
  }
  
  return actions;
}

export const ErrorDisplay: FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  showDetails = false,
  severity,
}) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);
  
  const errorInfo = normalizeError(error);
  const errorSeverity = severity || getErrorSeverity(errorInfo.code);
  const errorActions = getErrorActions(errorInfo);
  
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Box className={classes.errorContainer}>
      <Alert 
        severity={errorSeverity}
        icon={getErrorIcon(errorSeverity, errorInfo.code)}
        action={
          <Box display="flex" alignItems="center">
            {onRetry && errorInfo.code !== 'AUTHENTICATION_FAILED' && (
              <Button
                size="small"
                onClick={onRetry}
                startIcon={<RefreshIcon />}
                color="inherit"
              >
                Retry
              </Button>
            )}
            {(showDetails || errorInfo.stack || errorInfo.details) && (
              <IconButton
                className={`${classes.expandButton} ${expanded ? classes.expandButtonOpen : ''}`}
                onClick={handleExpandClick}
                size="small"
                color="inherit"
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Box>
        }
      >
        {errorInfo.title && <AlertTitle>{errorInfo.title}</AlertTitle>}
        <Typography variant="body2">{errorInfo.message}</Typography>
        
        {errorActions.length > 0 && (
          <Box mt={1} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            {errorActions.map((action, index) => (
              <Button
                key={index}
                size="small"
                variant="outlined"
                color="inherit"
                onClick={action.action}
                disabled={action.disabled}
                startIcon={action.icon}
              >
                {action.text}
              </Button>
            ))}
          </Box>
        )}
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box className={classes.detailsContainer}>
            <Typography variant="subtitle2" gutterBottom>
              Error Details
            </Typography>
            
            {errorInfo.code && (
              <Typography variant="body2" gutterBottom>
                <strong>Code:</strong> {errorInfo.code}
              </Typography>
            )}
            
            {errorInfo.status && (
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {errorInfo.status}
              </Typography>
            )}
            
            {errorInfo.timestamp && (
              <Typography variant="body2" gutterBottom>
                <strong>Time:</strong> {errorInfo.timestamp.toLocaleString()}
              </Typography>
            )}
            
            {errorInfo.details && (
              <>
                <Typography variant="body2" gutterBottom>
                  <strong>Additional Details:</strong>
                </Typography>
                <pre className={classes.codeBlock}>
                  {JSON.stringify(errorInfo.details, null, 2)}
                </pre>
              </>
            )}
            
            {errorInfo.stack && (
              <>
                <Typography variant="body2" gutterBottom>
                  <strong>Stack Trace:</strong>
                </Typography>
                <pre className={classes.codeBlock}>
                  {errorInfo.stack}
                </pre>
              </>
            )}
          </Box>
        </Collapse>
      </Alert>
    </Box>
  );
};

/**
 * Specialized error display for GitHub API errors
 */
export const GitHubErrorDisplay: React.FC<{
  error: GitHubApiError;
  onRetry?: () => void;
  showDetails?: boolean;
}> = ({ error, onRetry, showDetails }) => {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      showDetails={showDetails}
    />
  );
};

/**
 * Generic error boundary component with enhanced retry functionality
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{ error: Error; retry: () => void; retryCount: number }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: any[];
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }
  
  private resetTimeoutId: number | null = null;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }
  
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      );
      
      if (hasResetKeyChanged) {
        this.setState({ hasError: false, error: null, retryCount: 0 });
      }
    }
  }
  
  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.retry();
      }, Math.min(1000 * Math.pow(2, this.state.retryCount), 10000)); // Exponential backoff, max 10s
    }
  }
  
  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network errors, but not for authentication or permission errors
    if (error instanceof GitHubApiError) {
      return !['AUTHENTICATION_FAILED', 'INSUFFICIENT_PERMISSIONS'].includes(error.code || '');
    }
    
    // Auto-retry for generic network errors
    return error.message.toLowerCase().includes('network') || 
           error.message.toLowerCase().includes('fetch');
  }
  
  retry = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      retryCount: prevState.retryCount + 1 
    }));
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error} 
            retry={this.retry}
            retryCount={this.state.retryCount}
          />
        );
      }
      
      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.retry}
          showDetails
        />
      );
    }
    
    return this.props.children;
  }
}