/**
 * Unit tests for ViewStateManager service
 */

import { ComponentEntity } from '@backstage/catalog-model';
import {
  ViewStateManagerService,
  ViewStateConfig,
} from './ViewStateManager';
import {
  OwnershipResolver,
  BackstageUserIdentity,
  OwnedApplications,
} from '../types/ownership';

// Mock session storage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock ownership resolver
const mockOwnershipResolver: jest.Mocked<OwnershipResolver> = {
  resolveUserOwnership: jest.fn(),
  resolveGroupMembership: jest.fn(),
  determineApplicationAccess: jest.fn(),
  getOwnershipData: jest.fn(),
  clearCache: jest.fn(),
};

// Test data
const mockUser: BackstageUserIdentity = {
  userEntityRef: 'user:default/testuser',
  ownershipEntityRefs: ['user:default/testuser', 'group:default/team-a'],
};

const mockApplications: ComponentEntity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'app1',
      title: 'Application 1',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'user:default/testuser',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'app2',
      title: 'Application 2',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'group:default/team-b',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'app3',
      title: 'Application 3',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'group:default/team-a',
    },
  },
];

const mockOwnedApplications: OwnedApplications = {
  directlyOwned: [mockApplications[0]], // app1
  groupOwned: [mockApplications[2]], // app3
  allOwned: [mockApplications[0], mockApplications[2]], // app1, app3
};

describe('ViewStateManagerService', () => {
  let viewStateManager: ViewStateManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock sessionStorage globally
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    viewStateManager = new ViewStateManagerService(mockOwnershipResolver);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new ViewStateManagerService(mockOwnershipResolver);
      
      expect(manager.getCurrentView()).toBe('owned');
      expect(manager.getViewState().mode).toBe('owned');
      expect(manager.getViewState().loading).toBe(false);
      expect(manager.getViewState().filteredApplications).toEqual([]);
    });

    it('should initialize with custom configuration', () => {
      const config: ViewStateConfig = {
        defaultView: 'all',
        cacheTtl: 10000,
        storageKeyPrefix: 'custom-prefix',
        enablePersistence: false,
      };

      const manager = new ViewStateManagerService(mockOwnershipResolver, config);
      
      expect(manager.getCurrentView()).toBe('all');
    });

    it('should load view from session storage if available', () => {
      mockSessionStorage.getItem.mockReturnValue('all');
      
      const manager = new ViewStateManagerService(mockOwnershipResolver);
      
      expect(manager.getCurrentView()).toBe('all');
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('deployments-view-mode');
    });

    it('should handle invalid session storage values', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid');
      
      const manager = new ViewStateManagerService(mockOwnershipResolver);
      
      expect(manager.getCurrentView()).toBe('owned'); // Should fall back to default
    });

    it('should handle session storage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const manager = new ViewStateManagerService(mockOwnershipResolver);
      
      expect(manager.getCurrentView()).toBe('owned'); // Should fall back to default
    });
  });

  describe('getCurrentView', () => {
    it('should return the current view mode', () => {
      expect(viewStateManager.getCurrentView()).toBe('owned');
    });
  });

  describe('setCurrentView', () => {
    it('should update the current view mode', () => {
      viewStateManager.setCurrentView('all');
      
      expect(viewStateManager.getCurrentView()).toBe('all');
      expect(viewStateManager.getViewState().mode).toBe('all');
    });

    it('should persist view to session storage', () => {
      viewStateManager.setCurrentView('all');
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('deployments-view-mode', 'all');
    });

    it('should not update if view is the same', () => {
      const initialState = viewStateManager.getViewState();
      
      viewStateManager.setCurrentView('owned'); // Same as current
      
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
      expect(viewStateManager.getViewState()).toEqual(initialState);
    });

    it('should notify subscribers of view changes', () => {
      const subscriber = jest.fn();
      viewStateManager.subscribe(subscriber);
      
      viewStateManager.setCurrentView('all');
      
      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'all',
          filteredApplications: [],
        })
      );
    });

    it('should handle session storage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => viewStateManager.setCurrentView('all')).not.toThrow();
      expect(viewStateManager.getCurrentView()).toBe('all');
    });
  });

  describe('getFilteredApplications', () => {
    beforeEach(() => {
      mockOwnershipResolver.resolveUserOwnership.mockResolvedValue(mockOwnedApplications);
    });

    it('should return owned applications when view is "owned"', async () => {
      viewStateManager.setCurrentView('owned');
      
      const result = await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      expect(result).toEqual(mockOwnedApplications.allOwned);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledWith(mockUser, mockApplications);
    });

    it('should return all applications when view is "all"', async () => {
      viewStateManager.setCurrentView('all');
      
      const result = await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      expect(result).toEqual(mockApplications);
      expect(mockOwnershipResolver.resolveUserOwnership).not.toHaveBeenCalled();
    });

    it('should update view state with filtered applications', async () => {
      viewStateManager.setCurrentView('owned');
      
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      const viewState = viewStateManager.getViewState();
      expect(viewState.filteredApplications).toEqual(mockOwnedApplications.allOwned);
      expect(viewState.loading).toBe(false);
      expect(viewState.error).toBeUndefined();
      expect(viewState.lastUpdated).toBeDefined();
    });

    it('should set loading state during filtering', async () => {
      let loadingState: boolean | undefined;
      
      mockOwnershipResolver.resolveUserOwnership.mockImplementation(async () => {
        loadingState = viewStateManager.getViewState().loading;
        return mockOwnedApplications;
      });
      
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      expect(loadingState).toBe(true);
      expect(viewStateManager.getViewState().loading).toBe(false);
    });

    it('should handle errors and update view state', async () => {
      const error = new Error('Ownership resolution failed');
      mockOwnershipResolver.resolveUserOwnership.mockRejectedValue(error);
      
      await expect(
        viewStateManager.getFilteredApplications(mockApplications, mockUser)
      ).rejects.toThrow('Ownership resolution failed');
      
      const viewState = viewStateManager.getViewState();
      expect(viewState.error).toBe('Ownership resolution failed');
      expect(viewState.loading).toBe(false);
      expect(viewState.filteredApplications).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      mockOwnershipResolver.resolveUserOwnership.mockRejectedValue('String error');
      
      await expect(
        viewStateManager.getFilteredApplications(mockApplications, mockUser)
      ).rejects.toBe('String error');
      
      const viewState = viewStateManager.getViewState();
      expect(viewState.error).toBe('Unknown error occurred');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      mockOwnershipResolver.resolveUserOwnership.mockResolvedValue(mockOwnedApplications);
    });

    it('should cache filtered applications', async () => {
      viewStateManager.setCurrentView('owned');
      
      // First call
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(1);
    });

    it('should cache separately for different view modes', async () => {
      // Cache for 'owned' view
      viewStateManager.setCurrentView('owned');
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      // Switch to 'all' view - should not use cache
      viewStateManager.setCurrentView('all');
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      // Switch back to 'owned' view - should use cache
      viewStateManager.setCurrentView('owned');
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', async () => {
      const shortTtlConfig: ViewStateConfig = { cacheTtl: 100 }; // 100ms
      const manager = new ViewStateManagerService(mockOwnershipResolver, shortTtlConfig);
      
      manager.setCurrentView('owned');
      
      // First call
      await manager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(1);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second call should not use expired cache
      await manager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      mockOwnershipResolver.resolveUserOwnership.mockResolvedValue(mockOwnedApplications);
    });

    it('should clear all cache when no user specified', async () => {
      // Populate cache
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      viewStateManager.clearCache();
      
      // Should not use cache after clearing
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(2);
      expect(mockOwnershipResolver.clearCache).toHaveBeenCalledWith(undefined);
    });

    it('should clear cache for specific user', async () => {
      // Populate cache
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      viewStateManager.clearCache(mockUser.userEntityRef);
      
      // Should not use cache after clearing
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      expect(mockOwnershipResolver.resolveUserOwnership).toHaveBeenCalledTimes(2);
      expect(mockOwnershipResolver.clearCache).toHaveBeenCalledWith(mockUser.userEntityRef);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of view state changes', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();
      
      viewStateManager.subscribe(subscriber1);
      viewStateManager.subscribe(subscriber2);
      
      viewStateManager.setCurrentView('all');
      
      expect(subscriber1).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'all' })
      );
      expect(subscriber2).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'all' })
      );
    });

    it('should return unsubscribe function', () => {
      const subscriber = jest.fn();
      const unsubscribe = viewStateManager.subscribe(subscriber);
      
      viewStateManager.setCurrentView('all');
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      viewStateManager.setCurrentView('owned');
      expect(subscriber).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle subscriber errors gracefully', () => {
      const errorSubscriber = jest.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      const normalSubscriber = jest.fn();
      
      viewStateManager.subscribe(errorSubscriber);
      viewStateManager.subscribe(normalSubscriber);
      
      // Should not throw despite subscriber error
      expect(() => viewStateManager.setCurrentView('all')).not.toThrow();
      
      // Normal subscriber should still be called
      expect(normalSubscriber).toHaveBeenCalled();
    });
  });

  describe('getViewState', () => {
    it('should return a copy of the current view state', () => {
      const state1 = viewStateManager.getViewState();
      const state2 = viewStateManager.getViewState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be different objects
    });

    it('should reflect current state', async () => {
      mockOwnershipResolver.resolveUserOwnership.mockResolvedValue(mockOwnedApplications);
      
      viewStateManager.setCurrentView('owned');
      await viewStateManager.getFilteredApplications(mockApplications, mockUser);
      
      const state = viewStateManager.getViewState();
      
      expect(state.mode).toBe('owned');
      expect(state.filteredApplications).toEqual(mockOwnedApplications.allOwned);
      expect(state.loading).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe('configuration options', () => {
    it('should respect enablePersistence=false', () => {
      const config: ViewStateConfig = { enablePersistence: false };
      const manager = new ViewStateManagerService(mockOwnershipResolver, config);
      
      manager.setCurrentView('all');
      
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it('should use custom storage key prefix', () => {
      const config: ViewStateConfig = { storageKeyPrefix: 'custom-prefix' };
      const manager = new ViewStateManagerService(mockOwnershipResolver, config);
      
      manager.setCurrentView('all');
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('custom-prefix-mode', 'all');
    });

    it('should handle missing sessionStorage gracefully', () => {
      // Remove sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });
      
      expect(() => {
        const manager = new ViewStateManagerService(mockOwnershipResolver);
        manager.setCurrentView('all');
      }).not.toThrow();
    });
  });
});