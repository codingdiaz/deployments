/**
 * Service for managing view state and application filtering
 */

import { ComponentEntity } from '@backstage/catalog-model';
import {
  BackstageUserIdentity,
  OwnershipResolver,
} from '../types/ownership';

/**
 * View mode for application display
 */
export type ViewMode = 'owned' | 'all';

/**
 * View state information
 */
export interface ViewState {
  /** Current view mode */
  mode: ViewMode;
  /** Filtered applications for current view */
  filteredApplications: ComponentEntity[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error?: string;
  /** Timestamp when data was last updated */
  lastUpdated?: number;
}

/**
 * Cache entry for filtered applications
 */
interface FilteredApplicationsCacheEntry {
  /** Cached applications */
  applications: ComponentEntity[];
  /** View mode this cache entry is for */
  viewMode: ViewMode;
  /** User identity this cache is for */
  userRef: string;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL for this cache entry */
  ttl: number;
}

/**
 * Configuration for ViewStateManager
 */
export interface ViewStateConfig {
  /** Default view mode (default: 'owned') */
  defaultView?: ViewMode;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
  /** Session storage key prefix (default: 'deployments-view') */
  storageKeyPrefix?: string;
  /** Whether to enable session persistence (default: true) */
  enablePersistence?: boolean;
}

/**
 * Interface for view state management
 */
export interface ViewStateManager {
  /**
   * Get the current view mode
   */
  getCurrentView(): ViewMode;

  /**
   * Set the current view mode
   */
  setCurrentView(view: ViewMode): void;

  /**
   * Get filtered applications based on current view and user ownership
   */
  getFilteredApplications(
    applications: ComponentEntity[],
    user: BackstageUserIdentity
  ): Promise<ComponentEntity[]>;

  /**
   * Get current view state
   */
  getViewState(): ViewState;

  /**
   * Clear cached data
   */
  clearCache(userRef?: string): void;

  /**
   * Subscribe to view state changes
   */
  subscribe(callback: (viewState: ViewState) => void): () => void;
}

/**
 * Implementation of ViewStateManager
 */
export class ViewStateManagerService implements ViewStateManager {
  private currentView: ViewMode;
  private viewState: ViewState;
  private cache = new Map<string, FilteredApplicationsCacheEntry>();
  private subscribers = new Set<(viewState: ViewState) => void>();
  private config: Required<ViewStateConfig>;

  constructor(
    private ownershipResolver: OwnershipResolver,
    config: ViewStateConfig = {}
  ) {
    this.config = {
      defaultView: config.defaultView ?? 'owned',
      cacheTtl: config.cacheTtl ?? 5 * 60 * 1000, // 5 minutes
      storageKeyPrefix: config.storageKeyPrefix ?? 'deployments-view',
      enablePersistence: config.enablePersistence ?? true,
    };

    // Initialize view from session storage or default
    this.currentView = this.loadViewFromStorage() ?? this.config.defaultView;
    
    // Initialize view state
    this.viewState = {
      mode: this.currentView,
      filteredApplications: [],
      loading: false,
    };
  }

  getCurrentView(): ViewMode {
    return this.currentView;
  }

  setCurrentView(view: ViewMode): void {
    if (this.currentView === view) {
      return;
    }

    this.currentView = view;
    
    // Persist to session storage
    if (this.config.enablePersistence) {
      this.saveViewToStorage(view);
    }

    // Update view state
    this.updateViewState({
      mode: view,
      filteredApplications: [], // Will be populated on next getFilteredApplications call
    });
  }

  async getFilteredApplications(
    applications: ComponentEntity[],
    user: BackstageUserIdentity
  ): Promise<ComponentEntity[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(user.userEntityRef, this.currentView);
    const cached = this.getCachedApplications(cacheKey);
    
    if (cached) {
      this.updateViewState({
        filteredApplications: cached,
        loading: false,
        lastUpdated: Date.now(),
      });
      return cached;
    }

    // Set loading state
    this.updateViewState({ loading: true });

    try {
      let filteredApplications: ComponentEntity[];

      if (this.currentView === 'owned') {
        // Filter to show only owned applications
        const ownedApplications = await this.ownershipResolver.resolveUserOwnership(
          user,
          applications
        );
        filteredApplications = ownedApplications.allOwned;
      } else {
        // Show all applications
        filteredApplications = applications;
      }

      // Cache the result
      this.setCachedApplications(cacheKey, filteredApplications);

      // Update view state
      this.updateViewState({
        filteredApplications,
        loading: false,
        error: undefined,
        lastUpdated: Date.now(),
      });

      return filteredApplications;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Update view state with error
      this.updateViewState({
        filteredApplications: [],
        loading: false,
        error: errorMessage,
      });

      // Re-throw the error for the caller to handle
      throw error;
    }
  }

  getViewState(): ViewState {
    return { ...this.viewState };
  }

  clearCache(userRef?: string): void {
    if (userRef) {
      // Clear cache for specific user
      const keysToDelete = Array.from(this.cache.keys()).filter(key =>
        key.includes(userRef)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }

    // Also clear ownership resolver cache
    this.ownershipResolver.clearCache(userRef);
  }

  subscribe(callback: (viewState: ViewState) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update view state and notify subscribers
   */
  private updateViewState(updates: Partial<ViewState>): void {
    this.viewState = {
      ...this.viewState,
      ...updates,
    };

    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(this.viewState);
      } catch (error) {
        // Silently ignore subscriber errors to prevent breaking other subscribers
        // In a production environment, this could be logged to a proper logging service
      }
    });
  }

  /**
   * Generate cache key for filtered applications
   */
  private getCacheKey(userRef: string, viewMode: ViewMode): string {
    return `filtered_apps:${userRef}:${viewMode}`;
  }

  /**
   * Get cached applications if still valid
   */
  private getCachedApplications(key: string): ComponentEntity[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.applications;
  }

  /**
   * Cache filtered applications
   */
  private setCachedApplications(key: string, applications: ComponentEntity[]): void {
    const entry: FilteredApplicationsCacheEntry = {
      applications: [...applications], // Create a copy to avoid mutations
      viewMode: this.currentView,
      userRef: key.split(':')[1], // Extract user ref from key
      timestamp: Date.now(),
      ttl: this.config.cacheTtl,
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Load view preference from session storage
   */
  private loadViewFromStorage(): ViewMode | null {
    if (!this.config.enablePersistence || typeof sessionStorage === 'undefined') {
      return null;
    }

    try {
      const stored = sessionStorage.getItem(`${this.config.storageKeyPrefix}-mode`);
      if (stored === 'owned' || stored === 'all') {
        return stored;
      }
    } catch (error) {
      // Silently ignore session storage errors - will fall back to default view
    }

    return null;
  }

  /**
   * Save view preference to session storage
   */
  private saveViewToStorage(view: ViewMode): void {
    if (!this.config.enablePersistence || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(`${this.config.storageKeyPrefix}-mode`, view);
    } catch (error) {
      // Silently ignore session storage errors - persistence is optional
    }
  }
}