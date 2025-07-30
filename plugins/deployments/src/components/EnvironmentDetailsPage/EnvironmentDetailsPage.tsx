import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Grid, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Chip,
  Box,
  makeStyles,
  Theme,
  SvgIcon
} from '@material-ui/core';
import { 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Link as LinkIcon,
  PlayArrow as PlayArrowIcon,
} from '@material-ui/icons';
import { Link, EmptyState } from '@backstage/core-components';
import { ErrorDisplay, ErrorBoundary } from '../ErrorHandling';
import { DeploymentHistoryTableSkeleton, DeploymentStatusSkeleton } from '../LoadingSkeletons';
import { DeploymentTriggerForm } from '../DeploymentTriggerForm';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { applicationDeploymentRouteRef } from '../../routes';
import { useEnvironments } from '../../hooks/useDeploymentApi';
import { useDeploymentHistory, useDeploymentStatus, useTriggerDeployment } from '../../hooks/useGitHubApi';
import { DeploymentStatusType, DeploymentHistoryEntry } from '@internal/plugin-deployments-common';

// GitHub icon component
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <SvgIcon className={className} viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </SvgIcon>
);

const useStyles = makeStyles((theme: Theme) => ({
  backButton: {
    marginBottom: theme.spacing(3),
  },
  statusChip: {
    fontWeight: 'bold',
  },
  statusSuccess: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  statusFailure: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
  statusRunning: {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
  },
  statusCancelled: {
    backgroundColor: theme.palette.grey[500],
    color: theme.palette.getContrastText(theme.palette.grey[500]),
  },
  statusIdle: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.getContrastText(theme.palette.grey[300]),
  },
  versionCell: {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
  },
  linkIcon: {
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
  },
  durationText: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  emptyStateContainer: {
    padding: theme.spacing(4),
  },
}));

const StatusIcon: React.FC<{ status: DeploymentStatusType }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircleIcon />;
    case 'failure':
      return <ErrorIcon />;
    case 'running':
      return <ScheduleIcon />;
    case 'cancelled':
      return <CancelIcon />;
    default:
      return <ScheduleIcon />;
  }
};

const StatusChip: React.FC<{ status: DeploymentStatusType; className?: string }> = ({ 
  status, 
  className 
}) => {
  const classes = useStyles();
  
  const getStatusClassName = () => {
    switch (status) {
      case 'success':
        return classes.statusSuccess;
      case 'failure':
        return classes.statusFailure;
      case 'running':
        return classes.statusRunning;
      case 'cancelled':
        return classes.statusCancelled;
      default:
        return classes.statusIdle;
    }
  };

  return (
    <Chip
      icon={<StatusIcon status={status} />}
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      size="small"
      className={`${classes.statusChip} ${getStatusClassName()} ${className || ''}`}
    />
  );
};

const formatDuration = (duration?: number): string => {
  if (!duration) return 'Unknown';
  
  const minutes = Math.floor(duration / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export const EnvironmentDetailsPage = () => {
  const classes = useStyles();
  const { componentName, environmentName } = useParams<{ 
    componentName: string; 
    environmentName: string; 
  }>();
  const applicationDeploymentRoute = useRouteRef(applicationDeploymentRouteRef);
  
  const { environments, loadEnvironments } = useEnvironments(componentName || '');
  const [currentEnv, setCurrentEnv] = useState<any>(null);
  const [triggerFormOpen, setTriggerFormOpen] = useState(false);

  // Hook for triggering deployments
  const { triggerDeployment, loading: triggerLoading, error: triggerError } = useTriggerDeployment();

  // Load environments to get the configuration for this specific environment
  useEffect(() => {
    if (componentName) {
      loadEnvironments();
    }
  }, [componentName, loadEnvironments]);

  // Find the current environment configuration
  useEffect(() => {
    if (environments.length > 0 && environmentName) {
      const env = environments.find(e => e.environmentName === environmentName);
      setCurrentEnv(env);
    }
  }, [environments, environmentName]);

  // Parse GitHub repo info
  const repoInfo = currentEnv?.githubRepo ? {
    owner: currentEnv.githubRepo.split('/')[0],
    repo: currentEnv.githubRepo.split('/')[1],
  } : null;

  // Fetch deployment status and history only when we have all required params
  const statusQuery = useDeploymentStatus(
    componentName || '',
    environmentName || '',
    repoInfo?.owner || '',
    repoInfo?.repo || '',
    currentEnv?.workflowPath || '',
  );

  const historyQuery = useDeploymentHistory(
    componentName || '',
    environmentName || '',
    repoInfo?.owner || '',
    repoInfo?.repo || '',
    currentEnv?.workflowPath || '',
    20,
  );

  // Handle trigger deployment
  const handleTriggerDeployment = async (version: string) => {
    if (!repoInfo || !currentEnv || !currentEnv.workflowPath) {
      throw new Error('Repository information or workflow path not available');
    }

    const result = await triggerDeployment(
      repoInfo.owner,
      repoInfo.repo,
      currentEnv.workflowPath,
      environmentName || '',
      version,
    );

    if (result) {
      // Refresh status and history after successful trigger
      setTimeout(() => {
        statusQuery.retry();
        historyQuery.retry();
      }, 2000); // Wait 2 seconds for workflow to register
    }

    return result;
  };

  if (!componentName || !environmentName) {
    return (
      <Page themeId="tool">
        <Header title="Environment Details" subtitle="Invalid parameters" />
        <Content>
          <EmptyState
            missing="data"
            title="Invalid Parameters"
            description="Component name and environment name are required."
          />
        </Content>
      </Page>
    );
  }

  return (
    <ErrorBoundary>
      <Page themeId="tool">
        <Header 
          title={`${componentName} - ${environmentName}`} 
          subtitle="Deployment history and details"
        />
        <Content>
        <ContentHeader title="Environment Details">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={() => setTriggerFormOpen(true)}
            disabled={!currentEnv || !repoInfo || !currentEnv.workflowPath}
          >
            Trigger Deployment
          </Button>
          <SupportButton>
            View deployment history and details for the {environmentName} environment.
          </SupportButton>
        </ContentHeader>
        
        <Grid container spacing={3} direction="column">
          <Grid item>
            <Link to={applicationDeploymentRoute({ componentName: componentName })}>
              <Button variant="outlined" className={classes.backButton}>
                ← Back to {componentName} Deployments
              </Button>
            </Link>
          </Grid>

          {/* Current Status Card */}
          <Grid item>
            <InfoCard title="Current Status">
              {statusQuery.loading ? (
                <DeploymentStatusSkeleton />
              ) : statusQuery.error ? (
                <ErrorDisplay 
                  error={statusQuery.error} 
                  onRetry={statusQuery.retry}
                  severity="warning"
                  showDetails
                />
              ) : statusQuery.data ? (
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <StatusChip status={statusQuery.data.status} />
                  </Grid>
                  {statusQuery.data.currentVersion && (
                    <Grid item>
                      <Typography variant="body2" className={classes.versionCell}>
                        Version: {statusQuery.data.currentVersion}
                      </Typography>
                    </Grid>
                  )}
                  {statusQuery.data.deployedAt && (
                    <Grid item>
                      <Typography variant="body2" color="textSecondary">
                        Deployed: {formatDate(statusQuery.data.deployedAt)}
                      </Typography>
                    </Grid>
                  )}
                  {statusQuery.data.workflowRunUrl && (
                    <Grid item>
                      <Button
                        href={statusQuery.data.workflowRunUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        startIcon={<GitHubIcon />}
                        endIcon={<LinkIcon className={classes.linkIcon} />}
                      >
                        View Workflow
                      </Button>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Typography variant="body1">
                  No current status available.
                </Typography>
              )}
            </InfoCard>
          </Grid>

          {/* Deployment History Card */}
          <Grid item>
            <InfoCard title="Deployment History">
              {historyQuery.loading ? (
                <DeploymentHistoryTableSkeleton />
              ) : historyQuery.error ? (
                <ErrorDisplay 
                  error={historyQuery.error} 
                  onRetry={historyQuery.retry}
                  severity="warning"
                  showDetails
                />
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Started</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Triggered By</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyQuery.data.map((deployment: DeploymentHistoryEntry) => (
                        <TableRow key={deployment.id}>
                          <TableCell>
                            <StatusChip status={deployment.status} />
                          </TableCell>
                          <TableCell className={classes.versionCell}>
                            {deployment.version}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(deployment.startedAt)}
                            </Typography>
                            {deployment.completedAt && (
                              <Typography variant="caption" className={classes.durationText}>
                                Completed: {formatDate(deployment.completedAt)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDuration(deployment.duration)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {deployment.triggeredBy.avatar_url && (
                                <img 
                                  src={deployment.triggeredBy.avatar_url}
                                  alt={`${deployment.triggeredBy.login}'s avatar`}
                                  style={{ width: 20, height: 20, borderRadius: '50%' }}
                                />
                              )}
                              <Typography variant="body2">
                                {deployment.triggeredBy.html_url ? (
                                  <a
                                    href={deployment.triggeredBy.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    {deployment.triggeredBy.login}
                                  </a>
                                ) : (
                                  deployment.triggeredBy.login
                                )}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {deployment.workflowRunUrl ? (
                              <Button
                                href={deployment.workflowRunUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                variant="outlined"
                                startIcon={<GitHubIcon />}
                                endIcon={<LinkIcon className={classes.linkIcon} />}
                              >
                                View
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                title="Workflow run URL not available"
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box className={classes.emptyStateContainer}>
                  <EmptyState
                    missing="data"
                    title="No Deployment History"
                    description={`No deployment history found for the ${environmentName} environment. Deployments will appear here once workflows are executed. If you've triggered a deployment recently, it may take a few moments to appear.`}
                  />
                </Box>
              )}
            </InfoCard>
          </Grid>
        </Grid>

        <DeploymentTriggerForm
          open={triggerFormOpen}
          environmentName={environmentName || ''}
          loading={triggerLoading}
          error={triggerError}
          onClose={() => setTriggerFormOpen(false)}
          onSubmit={handleTriggerDeployment}
        />
        </Content>
      </Page>
    </ErrorBoundary>
  );
};