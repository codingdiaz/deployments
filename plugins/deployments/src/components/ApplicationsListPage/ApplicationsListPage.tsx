import React, { useEffect, useState, useCallback } from 'react';
import { 
  Typography, 
  Box,
  makeStyles,
  CircularProgress,
} from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  ContentHeader,
  SupportButton,
  EmptyState,
} from '@backstage/core-components';
import { ErrorDisplay, ErrorBoundary } from '../ErrorHandling';
import { ApplicationCardSkeleton } from '../LoadingSkeletons';
import { ViewToggle } from '../ViewToggle';
import { ApplicationGroupComponent } from '../ApplicationGroup';
import { 
  useApi,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useAsyncRetry } from 'react-use';
import { ComponentEntity } from '@backstage/catalog-model';
import { 
  ANNOTATIONS,
  OwnershipResolverService,
  ApplicationGrouperService,
  ViewStateManagerService,
  ViewMode,
  BackstageUserIdentity,
  ApplicationGroup,
} from '@internal/plugin-deployments-common';

const useStyles = makeStyles((theme) => ({
  viewToggleContainer: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  loadingText: {
    color: theme.palette.text.secondary,
  },
  emptyState: {
    padding: theme.spacing(4),
  },
  codeExample: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    color: theme.palette.type === 'dark' ? theme.palette.grey[100] : theme.palette.grey[900],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    border: `1px solid ${theme.palette.type === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`,
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
  },
  groupsContainer: {
    '& > *:not(:last-child)': {
      marginBottom: theme.spacing(2),
    },
  },
  errorContainer: {
    marginTop: theme.spacing(2),
  },
}));

// State interface for the component
interface ApplicationsListState {
  currentView: ViewMode;
  filteredApplications: ComponentEntity[];
  applicationGroups: ApplicationGroup[];
  ownershipLoading: boolean;
  ownershipError?: string;
  user?: BackstageUserIdentity;
  totalApplications: number;
  ownedApplicationsCount: number;
}

export const ApplicationsListPage = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);

  // Component state
  const [state, setState] = useState<ApplicationsListState>({
    currentView: 'owned',
    filteredApplications: [],
    applicationGroups: [],
    ownershipLoading: false,
    ownershipError: undefined,
    user: undefined,
    totalApplications: 0,
    ownedApplicationsCount: 0,
  });

  // Services (initialized once)
  const [services] = useState(() => {
    const ownershipResolver = new OwnershipResolverService(catalogApi, identityApi);
    const applicationGrouper = new ApplicationGrouperService();
    const viewStateManager = new ViewStateManagerService(ownershipResolver);
    
    return {
      ownershipResolver,
      applicationGrouper,
      viewStateManager,
    };
  });

  // Fetch applications from catalog
  const { value: entities, loading, error, retry } = useAsyncRetry(async () => {
    const response = await catalogApi.getEntities({
      filter: {
        [`metadata.annotations.${ANNOTATIONS.DEPLOYMENT_ENABLED}`]: 'true',
      },
    });
    
    return response.items as ComponentEntity[];
  }, [catalogApi]);

  // Initialize user identity and view state
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const identity = await identityApi.getBackstageIdentity();
        const user: BackstageUserIdentity = {
          userEntityRef: identity.userEntityRef,
          ownershipEntityRefs: identity.ownershipEntityRefs,
        };

        setState(prev => ({
          ...prev,
          user,
          currentView: services.viewStateManager.getCurrentView(),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          ownershipError: 'Failed to load user identity. Falling back to show all applications.',
          currentView: 'all',
        }));
      }
    };

    initializeUser();
  }, [identityApi, services.viewStateManager]);

  // Process applications when entities or user changes
  useEffect(() => {
    if (!entities || !state.user) {
      return;
    }

    const processApplications = async () => {
      setState(prev => ({ ...prev, ownershipLoading: true, ownershipError: undefined }));

      try {
        // Get filtered applications based on current view
        const filteredApplications = await services.viewStateManager.getFilteredApplications(
          entities,
          state.user!
        );

        // Get ownership data for grouping
        const ownershipData = await services.ownershipResolver.getOwnershipData(
          state.user!,
          entities
        );

        // Group applications by owner
        const applicationGroups = services.applicationGrouper.groupByOwner(
          filteredApplications,
          ownershipData
        );

        // Sort groups by name
        const sortedGroups = services.applicationGrouper.sortGroups(applicationGroups, 'name');

        // Calculate owned applications count
        const ownedApplications = await services.ownershipResolver.resolveUserOwnership(
          state.user!,
          entities
        );

        setState(prev => ({
          ...prev,
          filteredApplications,
          applicationGroups: sortedGroups,
          ownershipLoading: false,
          totalApplications: entities.length,
          ownedApplicationsCount: ownedApplications.allOwned.length,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          ownershipLoading: false,
          ownershipError: `Failed to process ownership data: ${errorMessage}. Showing all applications.`,
          currentView: 'all',
          filteredApplications: entities,
          applicationGroups: services.applicationGrouper.groupByOwner(entities, {
            userOwned: new Set(),
            groupOwned: new Map(),
            ownerMap: new Map(),
            userGroups: [],
          }),
          totalApplications: entities.length,
          ownedApplicationsCount: 0,
        }));
      }
    };

    processApplications();
  }, [entities, state.user, state.currentView, services]);

  // Handle view toggle
  const handleViewChange = useCallback((newView: ViewMode) => {
    services.viewStateManager.setCurrentView(newView);
    setState(prev => ({ ...prev, currentView: newView }));
  }, [services.viewStateManager]);

  // Handle retry for ownership resolution
  const handleOwnershipRetry = useCallback(() => {
    if (entities && state.user) {
      setState(prev => ({ ...prev, ownershipError: undefined }));
      // Trigger re-processing by updating the view
      const currentView = state.currentView;
      setState(prev => ({ ...prev, currentView: currentView === 'owned' ? 'all' : 'owned' }));
      setTimeout(() => {
        setState(prev => ({ ...prev, currentView }));
      }, 100);
    }
  }, [entities, state.user, state.currentView]);

  // Loading state for initial catalog fetch
  if (loading) {
    return (
      <ErrorBoundary>
        <Page themeId="tool">
          <Header title="Deployments" subtitle="Manage deployments across your applications" />
          <Content>
            <ContentHeader title="Applications">
              <SupportButton>
                Loading applications with deployment configurations...
              </SupportButton>
            </ContentHeader>
            <Box className={classes.loadingContainer}>
              <CircularProgress size={40} />
              <Typography className={classes.loadingText}>
                Loading applications...
              </Typography>
            </Box>
          </Content>
        </Page>
      </ErrorBoundary>
    );
  }

  // Error state for catalog fetch
  if (error) {
    return (
      <ErrorBoundary>
        <Page themeId="tool">
          <Header title="Deployments" subtitle="Manage deployments across your applications" />
          <Content>
            <ContentHeader title="Applications">
              <SupportButton>
                Error loading applications with deployment configurations.
              </SupportButton>
            </ContentHeader>
            <Box className={classes.errorContainer}>
              <ErrorDisplay 
                error={error}
                onRetry={retry}
                severity="error"
                showDetails
              />
            </Box>
          </Content>
        </Page>
      </ErrorBoundary>
    );
  }

  // Empty state when no applications found
  if (!entities || entities.length === 0) {
    return (
      <ErrorBoundary>
        <Page themeId="tool">
          <Header title="Deployments" subtitle="Manage deployments across your applications" />
          <Content>
            <ContentHeader title="Applications">
              <SupportButton>
                View and manage deployments for all registered applications.
                Applications must have the '{ANNOTATIONS.DEPLOYMENT_ENABLED}' annotation set to 'true'.
              </SupportButton>
            </ContentHeader>
            
            <div className={classes.emptyState}>
              <EmptyState
                missing="data"
                title="No applications found"
                description={
                  <>
                    <Typography variant="body1" paragraph>
                      No applications with deployment configurations were found.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      To register an application for deployment management, add the following annotation to your component's catalog-info.yaml:
                    </Typography>
                    <Box mt={2} mb={2}>
                      <Typography variant="body2" component="pre" className={classes.codeExample}>
                        {`metadata:
  annotations:
    ${ANNOTATIONS.DEPLOYMENT_ENABLED}: "true"
    ${ANNOTATIONS.SOURCE_LOCATION}: "url:https://github.com/owner/repo"`}
                      </Typography>
                    </Box>
                  </>
                }
              />
            </div>
          </Content>
        </Page>
      </ErrorBoundary>
    );
  }

  // Main content with ownership filtering
  return (
    <ErrorBoundary>
      <Page themeId="tool">
        <Header title="Deployments" subtitle="Manage deployments across your applications" />
        <Content>
          <ContentHeader title="Applications">
            <SupportButton>
              View and manage deployments for applications you own or all registered applications.
              Use the toggle to switch between views.
            </SupportButton>
          </ContentHeader>

          {/* View Toggle */}
          <Box className={classes.viewToggleContainer}>
            <ViewToggle
              currentView={state.currentView}
              onViewChange={handleViewChange}
              ownedCount={state.ownedApplicationsCount}
              totalCount={state.totalApplications}
              disabled={state.ownershipLoading || !state.user}
            />
          </Box>

          {/* Ownership Error Display */}
          {state.ownershipError && (
            <Box className={classes.errorContainer}>
              <ErrorDisplay
                error={new Error(state.ownershipError)}
                onRetry={handleOwnershipRetry}
                severity="warning"
                showDetails={false}
              />
            </Box>
          )}

          {/* Loading State for Ownership Resolution */}
          {state.ownershipLoading && (
            <Box className={classes.loadingContainer}>
              <CircularProgress size={32} />
              <Typography className={classes.loadingText}>
                Resolving application ownership...
              </Typography>
            </Box>
          )}

          {/* Application Groups */}
          {!state.ownershipLoading && state.applicationGroups.length > 0 && (
            <Box className={classes.groupsContainer}>
              {state.applicationGroups.map((group) => (
                <ApplicationGroupComponent
                  key={`${group.owner.type}:${group.owner.name}`}
                  group={group}
                  currentView={state.currentView}
                  currentUserRef={state.user?.userEntityRef}
                  showAccessIndicators={true}
                  defaultExpanded={true}
                />
              ))}
            </Box>
          )}

          {/* Empty State for Filtered Results */}
          {!state.ownershipLoading && state.applicationGroups.length === 0 && state.filteredApplications.length === 0 && (
            <div className={classes.emptyState}>
              <EmptyState
                missing="data"
                title={state.currentView === 'owned' ? "No owned applications found" : "No applications found"}
                description={
                  state.currentView === 'owned' ? (
                    <Typography variant="body1">
                      You don't own any applications with deployment configurations. 
                      Switch to "All Applications" to see all available applications.
                    </Typography>
                  ) : (
                    <Typography variant="body1">
                      No applications with deployment configurations were found.
                    </Typography>
                  )
                }
              />
            </div>
          )}
        </Content>
      </Page>
    </ErrorBoundary>
  );
};