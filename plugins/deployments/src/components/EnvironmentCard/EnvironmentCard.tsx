import { FC, MouseEvent, useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@material-ui/core';
import SuccessIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import RunningIcon from '@material-ui/icons/Schedule';
import CancelledIcon from '@material-ui/icons/Cancel';
import IdleIcon from '@material-ui/icons/HelpOutline';
import RefreshIcon from '@material-ui/icons/Refresh';
import MoreIcon from '@material-ui/icons/MoreVert';
import { SvgIcon } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useRouteRef } from '@backstage/core-plugin-api';
import { useNavigate } from 'react-router-dom';
import { environmentDetailsRouteRef } from '../../routes';
import {
  EnvironmentConfig,
  DeploymentStatus,
  DeploymentStatusType,
} from '@internal/plugin-deployments-common';

// GitHub icon component
const GitHubIcon: FC<{ className?: string }> = ({ className }) => (
  <SvgIcon className={className} viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </SvgIcon>
);

const useStyles = makeStyles((theme) => ({
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  },
  cardContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing(1),
  },
  cardActions: {
    padding: theme.spacing(1, 2, 2, 2),
    justifyContent: 'space-between',
  },
  statusChip: {
    fontWeight: 'bold',
    minWidth: 80,
  },
  successChip: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  errorChip: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
  runningChip: {
    backgroundColor: theme.palette.info.main,
    color: theme.palette.info.contrastText,
  },
  cancelledChip: {
    backgroundColor: theme.palette.grey[500],
    color: theme.palette.getContrastText(theme.palette.grey[500]),
  },
  idleChip: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
    color: theme.palette.type === 'dark' ? theme.palette.grey[100] : theme.palette.getContrastText(theme.palette.grey[300]),
  },
  statusIcon: {
    marginRight: theme.spacing(0.5),
    fontSize: '1rem',
  },
  versionText: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    color: theme.palette.type === 'dark' ? theme.palette.grey[100] : theme.palette.grey[800],
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.shape.borderRadius,
    display: 'inline-block',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
    },
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  errorContainer: {
    textAlign: 'center',
    padding: theme.spacing(1),
  },
  refreshButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
  deployedAt: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  commitLink: {
    color: theme.palette.text.secondary,
    opacity: 0.7,
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity 0.2s ease',
    '&:hover': {
      opacity: 1,
      color: theme.palette.primary.main,
    },
  },
}));

interface EnvironmentCardProps {
  /** Environment configuration */
  environment: EnvironmentConfig;
  /** Current deployment status */
  deploymentStatus?: DeploymentStatus;
  /** Whether deployment status is loading */
  loading?: boolean;
  /** Error message if status fetch failed */
  error?: string;
  /** Component name for routing */
  componentName: string;
  /** Callback to retry fetching deployment status */
  onRetry?: () => void;
  /** Callback to edit environment */
  onEdit?: (environment: EnvironmentConfig) => void;
  /** Callback to delete environment */
  onDelete?: (environmentName: string) => void;
}

/**
 * Get status icon and styling based on deployment status
 */
function getStatusDisplay(status: DeploymentStatusType, classes: ReturnType<typeof useStyles>) {
  switch (status) {
    case 'success':
      return {
        icon: <SuccessIcon className={classes.statusIcon} />,
        chipClass: classes.successChip,
        label: 'Success',
      };
    case 'failure':
      return {
        icon: <ErrorIcon className={classes.statusIcon} />,
        chipClass: classes.errorChip,
        label: 'Failed',
      };
    case 'running':
      return {
        icon: <RunningIcon className={classes.statusIcon} />,
        chipClass: classes.runningChip,
        label: 'Running',
      };
    case 'cancelled':
      return {
        icon: <CancelledIcon className={classes.statusIcon} />,
        chipClass: classes.cancelledChip,
        label: 'Cancelled',
      };
    case 'idle':
    default:
      return {
        icon: <IdleIcon className={classes.statusIcon} />,
        chipClass: classes.idleChip,
        label: 'Idle',
      };
  }
}

/**
 * Format deployment timestamp for display
 */
function formatDeployedAt(deployedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - deployedAt.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return deployedAt.toLocaleDateString();
}

export const EnvironmentCard: FC<EnvironmentCardProps> = ({
  environment,
  deploymentStatus,
  loading = false,
  error,
  componentName,
  onRetry,
  onEdit,
  onDelete,
}) => {
  const classes = useStyles();
  const environmentDetailsRoute = useRouteRef(environmentDetailsRouteRef);
  const navigate = useNavigate();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const statusDisplay = deploymentStatus 
    ? getStatusDisplay(deploymentStatus.status, classes)
    : getStatusDisplay('idle', classes);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(environment);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete?.(environment.environmentName);
  };

  const handleCardClick = () => {
    // Navigate to environment details page
    navigate(environmentDetailsRoute({
      componentName,
      environmentName: environment.environmentName,
    }));
  };

  return (
    <Card className={classes.card} onClick={handleCardClick}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" position="absolute" top={8} right={8} zIndex={1}>
        {onRetry && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            title="Refresh deployment status"
            style={{ marginRight: 4 }}
          >
            <RefreshIcon />
          </IconButton>
        )}
        
        {(onEdit || onDelete) && (
          <>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e);
              }}
              title="Environment actions"
            >
              <MoreIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {onEdit && (
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}>
                  Edit Environment
                </MenuItem>
              )}
              {onDelete && (
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}>
                  Delete Environment
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Box>
      
      <CardContent className={classes.cardContent}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" marginBottom={1} paddingRight={6}>
          <Box display="flex" flexDirection="column" style={{ gap: '4px' }}>
            <Typography variant="h6" component="h3">
              {environment.environmentName}
            </Typography>
            {!loading && !error && (
              <Chip
                icon={statusDisplay.icon}
                label={statusDisplay.label}
                className={`${classes.statusChip} ${statusDisplay.chipClass}`}
                size="small"
                style={{ alignSelf: 'flex-start' }}
                title={deploymentStatus?.status === 'idle' ? 'Deployment triggered but not yet running' : undefined}
              />
            )}
          </Box>
        </Box>

        {(() => {
          if (loading) {
            return (
              <Box className={classes.loadingContainer}>
                <CircularProgress size={20} />
                <Typography variant="body2" style={{ marginLeft: 8 }}>
                  Loading status...
                </Typography>
              </Box>
            );
          }
          
          if (error) {
            return (
              <Box className={classes.errorContainer}>
                <Typography variant="body2" color="error" gutterBottom>
                  Failed to load status
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {error}
                </Typography>
              </Box>
            );
          }
          
          return (
            <>
              {/* Version and deployment info in one line */}
              <Box display="flex" alignItems="center" justifyContent="space-between" marginTop={1}>
                {deploymentStatus?.currentVersion && (
                  <a
                    href={`https://github.com/${environment.githubRepo}/commit/${deploymentStatus.currentVersion.startsWith('v') ? deploymentStatus.currentVersion.slice(1) : deploymentStatus.currentVersion}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.versionText}
                    onClick={(e) => e.stopPropagation()}
                    title="View commit on GitHub"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {deploymentStatus.currentVersion}
                  </a>
                )}
                
                {/* Deploy time and user in compact format */}
                {(deploymentStatus?.deployedAt || deploymentStatus?.deployedBy) && (
                  <Box display="flex" alignItems="center" style={{ gap: '4px' }}>
                    <Typography className={classes.deployedAt} component="div" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {deploymentStatus.deployedAt && (
                        <span>
                          {formatDeployedAt(new Date(deploymentStatus.deployedAt))}
                          {deploymentStatus.deployedBy && ' by '}
                        </span>
                      )}
                      {deploymentStatus.deployedBy?.avatar_url && (
                        <img 
                          src={deploymentStatus.deployedBy.avatar_url}
                          alt={`${deploymentStatus.deployedBy.login}'s avatar`}
                          style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0 }}
                        />
                      )}
                      {deploymentStatus.deployedBy && (
                        deploymentStatus.deployedBy.html_url ? (
                          <a
                            href={deploymentStatus.deployedBy.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              textDecoration: 'none', 
                              color: 'inherit',
                              fontWeight: 500
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deploymentStatus.deployedBy.login}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 500 }}>
                            {deploymentStatus.deployedBy.login}
                          </span>
                        )
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          );
        })()}
      </CardContent>

      <CardActions className={classes.cardActions}>
        <Box display="flex" style={{ gap: '8px' }}>
          {deploymentStatus?.workflowRunUrl && (
            <Button
              size="small"
              color="primary"
              href={deploymentStatus.workflowRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<GitHubIcon />}
              onClick={(e) => e.stopPropagation()}
            >
              View Logs
            </Button>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};