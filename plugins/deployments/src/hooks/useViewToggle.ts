import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { identityApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { ComponentEntity } from '@backstage/catalog-model';
import {
  ViewStateManager,
  ViewStateManagerService,
  OwnershipResolverService,
  ViewMode,
  ViewState,
  ANNOTATIONS,
} from '@internal/plugin-deployments-common';

/**
 * Hook for managing view toggle state and integration with ViewStateManager
 */
export const useViewToggle = () => {
  const identityApi = useApi(identityApiRef);
  const catalogApi = useApi(catalogApiRef);
  
  // State for view toggle
  const [viewState, setViewState] = useState<ViewState>({
    mode: 'owned',
    filteredApplications: [],
    loading: false,
  });
  
  const [allApplications, setAllApplications] = useState<ComponentEntity[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [viewStateManager, setViewStateManager] = useState<ViewStateManager | null>(null);

  // Initialize ViewStateManager
  useEffect(() => {
    const initializeViewStateManager = async () => {
      try {
        const ownershipResolver = new OwnershipResolverService(catalogApi, identityApi);
        const manager = new ViewStateManagerService(ownershipResolver);
        
        // Subscribe to view state changes
        const unsubscribe = manager.subscribe((newViewState) => {
          setViewState(newViewState);
          setOwnedCount(newViewState.mode === 'owned' ? newViewState.filteredApplications.length : ownedCount);
        });

        setViewStateManager(manager);
        
        // Set initial view state
        setViewState(manager.getViewState());

        return unsubscribe;
      } catch (error) {
        // Silently handle ViewStateManager initialization errors
      }
    };

    initializeViewStateManager();
  }, [catalogApi, identityApi]);

  // Load applications
  useEffect(() => {
    const loadApplications = async () => {
      if (!viewStateManager) return;

      try {
        const response = await catalogApi.getEntities({
          filter: {
            [`metadata.annotations.${ANNOTATIONS.DEPLOYMENT_ENABLED}`]: 'true',
          },
        });

        const applications = response.items as ComponentEntity[];
        setAllApplications(applications);
        setTotalCount(applications.length);

        // Get user identity and filter applications
        const userIdentity = await identityApi.getBackstageIdentity();
        const filteredApps = await viewStateManager.getFilteredApplications(
          applications,
          userIdentity
        );

        // Update owned count based on current view
        if (viewStateManager.getCurrentView() === 'owned') {
          setOwnedCount(filteredApps.length);
        } else {
          // Calculate owned count separately for "All Applications" view
          const ownedApps = await viewStateManager.getFilteredApplications(
            applications,
            userIdentity
          );
          setOwnedCount(ownedApps.length);
        }
      } catch (error) {
        setViewState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load applications',
          loading: false,
        }));
      }
    };

    loadApplications();
  }, [viewStateManager, catalogApi, identityApi]);

  // Handle view change
  const handleViewChange = useCallback(async (newView: ViewMode) => {
    if (!viewStateManager) return;

    try {
      viewStateManager.setCurrentView(newView);
      
      // Get user identity and filter applications for the new view
      const userIdentity = await identityApi.getBackstageIdentity();
      await viewStateManager.getFilteredApplications(allApplications, userIdentity);
    } catch (error) {
      // Silently handle view change errors
    }
  }, [viewStateManager, allApplications, identityApi]);

  // Get current view mode
  const currentView = viewStateManager?.getCurrentView() || 'owned';

  return {
    currentView,
    onViewChange: handleViewChange,
    ownedCount,
    totalCount,
    viewState,
    filteredApplications: viewState.filteredApplications,
    loading: viewState.loading,
    error: viewState.error,
  };
};