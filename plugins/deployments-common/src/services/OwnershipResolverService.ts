/**
 * Service for resolving application ownership and user access levels
 */

import { ComponentEntity } from '@backstage/catalog-model';
import {
  OwnershipResolver,
  BackstageUserIdentity,
  OwnedApplications,
  AccessLevel,
  OwnershipData,
  OwnerInfo,
  OwnershipCacheEntry,
  OwnershipConfig,
} from '../types/ownership';

/**
 * Interface for catalog operations needed by the ownership resolver
 */
export interface CatalogApi {
  getEntities(request?: any): Promise<{ items: ComponentEntity[] }>;
  getEntityByRef(entityRef: string): Promise<ComponentEntity | undefined>;
}

/**
 * Interface for identity operations needed by the ownership resolver
 */
export interface IdentityApi {
  getBackstageIdentity(): Promise<BackstageUserIdentity>;
}

/**
 * Implementation of the OwnershipResolver service
 */
export class OwnershipResolverService implements OwnershipResolver {
  private cache = new Map<string, OwnershipCacheEntry>();
  private config: Required<OwnershipConfig>;

  constructor(
    private catalogApi: CatalogApi,
    private identityApi: IdentityApi,
    config: OwnershipConfig = {}
  ) {
    this.config = {
      cacheTtl: config.cacheTtl ?? 5 * 60 * 1000, // 5 minutes
      enabled: config.enabled ?? true,
      defaultView: config.defaultView ?? 'owned',
    };
  }

  async resolveUserOwnership(
    user: BackstageUserIdentity,
    applications: ComponentEntity[]
  ): Promise<OwnedApplications> {
    const ownershipData = await this.getOwnershipData(user, applications);
    
    const directlyOwned = applications.filter(app => 
      ownershipData.userOwned.has(app.metadata.name)
    );

    const groupOwned = applications.filter(app => {
      const appName = app.metadata.name;
      return !ownershipData.userOwned.has(appName) && 
             Array.from(ownershipData.groupOwned.values())
                  .some(groupApps => groupApps.includes(appName));
    });

    const allOwned = [...directlyOwned, ...groupOwned];

    return {
      directlyOwned,
      groupOwned,
      allOwned,
    };
  }

  async resolveGroupMembership(
    user: BackstageUserIdentity,
    groups: string[]
  ): Promise<string[]> {
    // Get user's group memberships from ownership entity refs
    const userGroups = user.ownershipEntityRefs
      .filter(ref => ref.startsWith('group:') || ref.startsWith('Group:'))
      .map(ref => {
        const parts = ref.split('/');
        return parts[parts.length - 1]; // Get the group name after the last slash
      });

    return userGroups.filter(group => groups.includes(group));
  }

  async determineApplicationAccess(
    user: BackstageUserIdentity,
    application: ComponentEntity
  ): Promise<AccessLevel> {
    const ownershipData = await this.getOwnershipData(user, [application]);
    const appName = application.metadata.name;

    // User directly owns the application
    if (ownershipData.userOwned.has(appName)) {
      return 'full';
    }

    // User's group owns the application
    const isGroupOwned = Array.from(ownershipData.groupOwned.values())
      .some(groupApps => groupApps.includes(appName));
    
    if (isGroupOwned) {
      return 'full';
    }

    // Check if application has GitHub annotation for access determination
    const githubAnnotation = application.metadata.annotations?.['github.com/project-slug'];
    if (githubAnnotation) {
      // For now, assume limited access for non-owned applications with GitHub integration
      // This will be enhanced in task 8 with actual GitHub permission checking
      return 'limited';
    }

    return 'none';
  }

  async getOwnershipData(
    user: BackstageUserIdentity,
    applications: ComponentEntity[]
  ): Promise<OwnershipData> {
    const cacheKey = `ownership:${user.userEntityRef}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    const userOwned = new Set<string>();
    const groupOwned = new Map<string, string[]>();
    const ownerMap = new Map<string, OwnerInfo>();
    const userGroups = user.ownershipEntityRefs
      .filter(ref => ref.startsWith('group:') || ref.startsWith('Group:'))
      .map(ref => {
        const parts = ref.split('/');
        return parts[parts.length - 1]; // Get the group name after the last slash
      });

    // Process each application to determine ownership
    for (const app of applications) {
      const owner = app.spec?.owner;
      if (!owner) {
        // Handle applications with no owner
        ownerMap.set(app.metadata.name, {
          type: 'group',
          name: 'unassigned',
          displayName: 'Unassigned',
        });
        continue;
      }

      const ownerRef = typeof owner === 'string' ? owner : owner.toString();
      const ownerInfo = await this.parseOwnerRef(ownerRef);
      ownerMap.set(app.metadata.name, ownerInfo);

      // Check if user directly owns this application
      if (ownerInfo.type === 'user') {
        // Check if the user entity ref matches the owner ref
        const userEntityName = user.userEntityRef.split('/').pop();
        const isDirectOwner = userEntityName === ownerInfo.name || user.userEntityRef === ownerRef;
        
        // Also check if the user's ownership entity refs include this owner ref
        const isInOwnershipRefs = user.ownershipEntityRefs.some(ref => 
          ref === ownerRef || ref.endsWith(`/${ownerInfo.name}`)
        );
        
        if (isDirectOwner && isInOwnershipRefs) {
          userOwned.add(app.metadata.name);
        }
      }

      // Check if user's group owns this application
      if (ownerInfo.type === 'group' && userGroups.includes(ownerInfo.name)) {
        if (!groupOwned.has(ownerInfo.name)) {
          groupOwned.set(ownerInfo.name, []);
        }
        groupOwned.get(ownerInfo.name)!.push(app.metadata.name);
      }
    }

    const ownershipData: OwnershipData = {
      userOwned,
      groupOwned,
      ownerMap,
      userGroups,
    };

    // Cache the result
    this.setCachedData(cacheKey, ownershipData);

    return ownershipData;
  }

  clearCache(userRef?: string): void {
    if (userRef) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(userRef)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  private getCachedData(key: string): OwnershipData | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCachedData(key: string, data: OwnershipData): void {
    const entry: OwnershipCacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTtl,
    };
    this.cache.set(key, entry);
  }

  private async parseOwnerRef(ownerRef: string): Promise<OwnerInfo> {
    // Handle different owner reference formats
    // Examples: "user:default/john.doe", "group:default/platform-team", "john.doe", "platform-team"
    
    let type: 'user' | 'group';
    let name: string;
    let displayName: string;

    if (ownerRef.includes(':')) {
      const [refType, refNameWithNamespace] = ownerRef.split(':', 2);
      type = refType.toLowerCase() === 'user' ? 'user' : 'group';
      
      // Handle namespace in the reference (e.g., "default/john.doe")
      if (refNameWithNamespace.includes('/')) {
        const parts = refNameWithNamespace.split('/');
        name = parts[parts.length - 1]; // Get the name after the last slash
      } else {
        name = refNameWithNamespace;
      }
      displayName = name;
    } else {
      // Default to group if no type specified (common Backstage pattern)
      type = 'group';
      name = ownerRef;
      displayName = ownerRef;
    }

    // Try to get more detailed information from catalog
    try {
      // Capitalize the type for the entity reference (Backstage convention)
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      const entityRef = `${capitalizedType}:default/${name}`;
      const entity = await this.catalogApi.getEntityByRef(entityRef);
      
      if (entity) {
        displayName = entity.metadata.title || entity.metadata.name || name;
      }
    } catch (error) {
      // If we can't fetch the entity, use the basic info
      // In a production environment, this could be logged to a proper logging service
    }

    return {
      type,
      name,
      displayName,
    };
  }
}