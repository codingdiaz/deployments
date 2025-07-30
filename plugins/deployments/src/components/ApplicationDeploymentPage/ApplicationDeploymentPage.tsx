import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Grid, Button, Box } from '@material-ui/core';
import { Add as AddIcon } from '@material-ui/icons';
import { Link } from '@backstage/core-components';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { rootRouteRef } from '../../routes';
import { useGitHubWorkflows } from '../../hooks/useGitHubApi';
import { useEnvironments } from '../../hooks/useDeploymentApi';
import { ErrorDisplay, ErrorBoundary } from '../ErrorHandling';
import { EnvironmentCardSkeleton, WorkflowListSkeleton } from '../LoadingSkeletons';
import { EnvironmentConfigForm } from '../EnvironmentConfigForm';
import { EnvironmentCardWithStatus } from '../EnvironmentCard';
import { GitHubRepoLink } from '../GitHubRepoLink';
import {
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
  EnvironmentConfig,
} from '@internal/plugin-deployments-common';


export const ApplicationDeploymentPage = () => {
  const { componentName } = useParams<{ componentName: string }>();
  const rootRoute = useRouteRef(rootRouteRef);
  
  const {
    environments,
    loading: environmentsLoading,
    error: environmentsError,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
  } = useEnvironments(componentName || '');

  const [formOpen, setFormOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<EnvironmentConfig | undefined>();
  const [formError, setFormError] = useState<string | null>(null);

  // Load environments when component mounts or componentName changes
  useEffect(() => {
    if (componentName) {
      loadEnvironments();
    }
  }, [componentName, loadEnvironments]);

  const handleCreateEnvironment = () => {
    setEditingEnvironment(undefined);
    setFormError(null);
    setFormOpen(true);
  };

  const handleEditEnvironment = (environment: EnvironmentConfig) => {
    setEditingEnvironment(environment);
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateEnvironmentRequest | UpdateEnvironmentRequest) => {
    if (!componentName) return;
    
    setFormError(null);
    
    try {
      if (editingEnvironment) {
        // Update existing environment
        await updateEnvironment(editingEnvironment.environmentName, data as UpdateEnvironmentRequest);
      } else {
        // Create new environment
        await createEnvironment(data as CreateEnvironmentRequest);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setFormError(errorMessage);
      throw error; // Re-throw to prevent form from closing
    }
  };

  const handleDeleteEnvironment = async (environmentName: string) => {
    if (window.confirm(`Are you sure you want to delete the "${environmentName}" environment?`)) {
      try {
        await deleteEnvironment(environmentName);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  return (
    <ErrorBoundary>
      <Page themeId="tool">
        <Header
          title={componentName}
          subtitle="Monitor deployment status and trigger new deployments across environments"
         />
        <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
              <Box display="flex" alignItems="center" style={{ gap: 16 }}>
                <Link to={rootRoute()}>
                  <Button variant="outlined">← Back to Applications</Button>
                </Link>
                {environments.length > 0 && (
                  <GitHubRepoLink 
                    repo={environments[0].githubRepo}
                    variant="body2"
                    iconSize="0.875rem"
                  />
                )}
              </Box>
              <Box display="flex" alignItems="center" style={{ gap: 16 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateEnvironment}
                >
                  Add Environment
                </Button>
                <SupportButton>
                  Configure and manage deployment environments for {componentName}.
                </SupportButton>
              </Box>
            </Box>
          </Grid>
          
          {environmentsError && (
            <Grid item>
              <ErrorDisplay 
                error={environmentsError} 
                onRetry={loadEnvironments}
                severity="error"
                showDetails
              />
            </Grid>
          )}
          
          <Grid item>
            {environmentsLoading ? (
              <Grid container spacing={3}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <EnvironmentCardSkeleton />
                  </Grid>
                ))}
              </Grid>
            ) : environments.length === 0 ? (
              <Box textAlign="center" style={{ padding: 24 }}>
                <Typography variant="body1" gutterBottom>
                  No deployment environments configured
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Configure your first deployment environment to start managing deployments for {componentName}.
                  Each environment represents a deployment target (e.g., staging, production).
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateEnvironment}
                  style={{ marginTop: 16 }}
                >
                  Add Environment
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {environments.map((env) => (
                  <Grid item xs={12} md={6} lg={4} key={env.id}>
                    <EnvironmentCardWithStatus
                      environment={env}
                      componentName={componentName || ''}
                      onEdit={handleEditEnvironment}
                      onDelete={handleDeleteEnvironment}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
          
        </Grid>
        
        <EnvironmentConfigForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          existingEnvironment={editingEnvironment}
          error={formError}
        />
        </Content>
      </Page>
    </ErrorBoundary>
  );
};
