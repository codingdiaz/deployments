/**
 * Unit tests for OwnershipResolverService
 */

import { ComponentEntity } from '@backstage/catalog-model';
import { OwnershipResolverService, CatalogApi } from './OwnershipResolverService';
import { BackstageUserIdentity, OwnershipConfig } from '../types/ownership';

// Mock implementations
class MockCatalogApi implements CatalogApi {
  private entities: ComponentEntity[] = [];
  private entityMap = new Map<string, ComponentEntity>();

  constructor(entities: ComponentEntity[] = []) {
    this.entities = entities;
    entities.forEach(entity => {
      const ref = `${entity.kind}:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`;
      this.entityMap.set(ref, entity);
    });
  }

  async getEntities(): Promise<{ items: ComponentEntity[] }> {
    return { items: this.entities };
  }

  async getEntityByRef(entityRef: string): Promise<ComponentEntity | undefined> {
    return this.entityMap.get(entityRef);
  }

  addEntity(entity: ComponentEntity): void {
    this.entities.push(entity);
    const ref = `${entity.kind}:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`;
    this.entityMap.set(ref, entity);
  }
}


// Test data factories
const createUser = (name: string, groups: string[] = []): BackstageUserIdentity => ({
  userEntityRef: `user:default/${name}`,
  ownershipEntityRefs: [
    `user:default/${name}`,
    ...groups.map(group => `group:default/${group}`)
  ],
});

const createComponent = (
  name: string, 
  owner?: string, 
  githubProject?: string
): ComponentEntity => {
  const spec: any = {
    type: 'service',
    lifecycle: 'production',
  };
  
  if (owner) {
    spec.owner = owner;
  }
  
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name,
      namespace: 'default',
      annotations: githubProject ? {
        'github.com/project-slug': githubProject
      } : {},
    },
    spec,
  };
};

const createGroup = (name: string, displayName?: string): any => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Group',
  metadata: {
    name,
    namespace: 'default',
    title: displayName,
  },
  spec: {
    type: 'team',
    children: [],
  },
});

describe('OwnershipResolverService', () => {
  let catalogApi: MockCatalogApi;
  let service: OwnershipResolverService;

  beforeEach(() => {
    catalogApi = new MockCatalogApi();
    service = new OwnershipResolverService(catalogApi);
  });

  describe('resolveUserOwnership', () => {
    it('should identify directly owned applications', async () => {
      const user = createUser('john.doe');
      const applications = [
        createComponent('app1', 'user:default/john.doe'),
        createComponent('app2', 'group:default/platform-team'),
        createComponent('app3', 'user:default/jane.doe'),
      ];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(1);
      expect(result.directlyOwned[0].metadata.name).toBe('app1');
      expect(result.groupOwned).toHaveLength(0);
      expect(result.allOwned).toHaveLength(1);
    });

    it('should identify group owned applications', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const applications = [
        createComponent('app1', 'user:default/jane.doe'),
        createComponent('app2', 'group:default/platform-team'),
        createComponent('app3', 'group:default/backend-team'),
      ];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(0);
      expect(result.groupOwned).toHaveLength(1);
      expect(result.groupOwned[0].metadata.name).toBe('app2');
      expect(result.allOwned).toHaveLength(1);
    });

    it('should combine directly and group owned applications', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const applications = [
        createComponent('app1', 'user:default/john.doe'),
        createComponent('app2', 'group:default/platform-team'),
        createComponent('app3', 'user:default/jane.doe'),
      ];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(1);
      expect(result.groupOwned).toHaveLength(1);
      expect(result.allOwned).toHaveLength(2);
      expect(result.allOwned.map(app => app.metadata.name)).toContain('app1');
      expect(result.allOwned.map(app => app.metadata.name)).toContain('app2');
    });

    it('should handle applications without owners', async () => {
      const user = createUser('john.doe');
      const applications = [
        createComponent('app1'), // No owner
        createComponent('app2', 'user:default/john.doe'),
      ];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(1);
      expect(result.directlyOwned[0].metadata.name).toBe('app2');
      expect(result.allOwned).toHaveLength(1);
    });

    it('should handle owner references without type prefix', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const applications = [
        createComponent('app1', 'john.doe'), // User without prefix
        createComponent('app2', 'platform-team'), // Group without prefix
      ];

      const result = await service.resolveUserOwnership(user, applications);

      // Without prefix, should be treated as groups by default
      expect(result.directlyOwned).toHaveLength(0);
      expect(result.groupOwned).toHaveLength(1);
      expect(result.groupOwned[0].metadata.name).toBe('app2');
    });
  });

  describe('resolveGroupMembership', () => {
    it('should return groups user belongs to from the provided list', async () => {
      const user = createUser('john.doe', ['platform-team', 'frontend-team']);
      const groups = ['platform-team', 'backend-team', 'frontend-team'];

      const result = await service.resolveGroupMembership(user, groups);

      expect(result).toHaveLength(2);
      expect(result).toContain('platform-team');
      expect(result).toContain('frontend-team');
      expect(result).not.toContain('backend-team');
    });

    it('should return empty array when user belongs to no groups', async () => {
      const user = createUser('john.doe');
      const groups = ['platform-team', 'backend-team'];

      const result = await service.resolveGroupMembership(user, groups);

      expect(result).toHaveLength(0);
    });

    it('should handle empty groups list', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const groups: string[] = [];

      const result = await service.resolveGroupMembership(user, groups);

      expect(result).toHaveLength(0);
    });
  });

  describe('determineApplicationAccess', () => {
    it('should return full access for directly owned applications', async () => {
      const user = createUser('john.doe');
      const application = createComponent('app1', 'user:default/john.doe');

      const result = await service.determineApplicationAccess(user, application);

      expect(result).toBe('full');
    });

    it('should return full access for group owned applications', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const application = createComponent('app1', 'group:default/platform-team');

      const result = await service.determineApplicationAccess(user, application);

      expect(result).toBe('full');
    });

    it('should return limited access for non-owned applications with GitHub integration', async () => {
      const user = createUser('john.doe');
      const application = createComponent('app1', 'user:default/jane.doe', 'org/repo');

      const result = await service.determineApplicationAccess(user, application);

      expect(result).toBe('limited');
    });

    it('should return none access for non-owned applications without GitHub integration', async () => {
      const user = createUser('john.doe');
      const application = createComponent('app1', 'user:default/jane.doe');

      const result = await service.determineApplicationAccess(user, application);

      expect(result).toBe('none');
    });
  });

  describe('getOwnershipData', () => {
    it('should build comprehensive ownership data', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const applications = [
        createComponent('app1', 'user:default/john.doe'),
        createComponent('app2', 'group:default/platform-team'),
        createComponent('app3', 'user:default/jane.doe'),
        createComponent('app4'), // No owner
      ];

      const result = await service.getOwnershipData(user, applications);

      expect(result.userOwned.size).toBe(1);
      expect(result.userOwned.has('app1')).toBe(true);

      expect(result.groupOwned.size).toBe(1);
      expect(result.groupOwned.has('platform-team')).toBe(true);
      expect(result.groupOwned.get('platform-team')).toContain('app2');

      expect(result.ownerMap.size).toBe(4);
      expect(result.ownerMap.get('app1')?.type).toBe('user');
      expect(result.ownerMap.get('app2')?.type).toBe('group');
      expect(result.ownerMap.get('app4')?.name).toBe('unassigned');

      expect(result.userGroups).toContain('platform-team');
    });

    it('should handle multiple applications owned by the same group', async () => {
      const user = createUser('john.doe', ['platform-team']);
      const applications = [
        createComponent('app1', 'group:default/platform-team'),
        createComponent('app2', 'group:default/platform-team'),
        createComponent('app3', 'group:default/backend-team'),
      ];

      const result = await service.getOwnershipData(user, applications);

      expect(result.groupOwned.get('platform-team')).toHaveLength(2);
      expect(result.groupOwned.get('platform-team')).toContain('app1');
      expect(result.groupOwned.get('platform-team')).toContain('app2');
    });
  });

  describe('caching', () => {
    it('should cache ownership data and return cached results', async () => {
      const user = createUser('john.doe');
      const applications = [createComponent('app1', 'user:default/john.doe')];

      // First call
      const result1 = await service.getOwnershipData(user, applications);
      
      // Second call should return cached data
      const result2 = await service.getOwnershipData(user, applications);

      expect(result1).toBe(result2); // Should be the same object reference
    });

    it('should respect cache TTL and refresh expired data', async () => {
      const config: OwnershipConfig = { cacheTtl: 100 }; // 100ms TTL
      const shortCacheService = new OwnershipResolverService(catalogApi, config);
      
      const user = createUser('john.doe');
      const applications = [createComponent('app1', 'user:default/john.doe')];

      // First call
      await shortCacheService.getOwnershipData(user, applications);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second call should fetch fresh data
      const result = await shortCacheService.getOwnershipData(user, applications);
      
      expect(result).toBeDefined();
    });

    it('should clear cache for specific user', async () => {
      const user = createUser('john.doe');
      const applications = [createComponent('app1', 'user:default/john.doe')];

      // Cache some data
      await service.getOwnershipData(user, applications);
      
      // Clear cache for this user
      service.clearCache(user.userEntityRef);
      
      // Next call should fetch fresh data (we can't easily test this without mocking,
      // but we can verify the method doesn't throw)
      const result = await service.getOwnershipData(user, applications);
      expect(result).toBeDefined();
    });

    it('should clear all cache when no user specified', async () => {
      const user = createUser('john.doe');
      const applications = [createComponent('app1', 'user:default/john.doe')];

      // Cache some data
      await service.getOwnershipData(user, applications);
      
      // Clear all cache
      service.clearCache();
      
      // Next call should fetch fresh data
      const result = await service.getOwnershipData(user, applications);
      expect(result).toBeDefined();
    });
  });

  describe('parseOwnerRef', () => {
    it('should enhance owner info with catalog data when available', async () => {
      // Create a fresh catalog API for this test
      const freshCatalogApi = new MockCatalogApi();
      const freshService = new OwnershipResolverService(freshCatalogApi);
      
      // Add a group entity to the catalog
      const groupEntity = createGroup('platform-team', 'Platform Team');
      freshCatalogApi.addEntity(groupEntity);

      const user = createUser('john.doe', ['platform-team']);
      const applications = [createComponent('app1', 'group:default/platform-team')];

      const result = await freshService.getOwnershipData(user, applications);

      const ownerInfo = result.ownerMap.get('app1');
      expect(ownerInfo?.displayName).toBe('Platform Team');
      expect(ownerInfo?.type).toBe('group');
      expect(ownerInfo?.name).toBe('platform-team');
    });

    it('should handle catalog fetch errors gracefully', async () => {
      // Mock catalog to throw error
      const errorCatalogApi = new MockCatalogApi();
      errorCatalogApi.getEntityByRef = jest.fn().mockRejectedValue(new Error('Catalog error'));
      
      const errorService = new OwnershipResolverService(errorCatalogApi);
      const user = createUser('john.doe');
      const applications = [createComponent('app1', 'group:default/platform-team')];

      const result = await errorService.getOwnershipData(user, applications);

      const ownerInfo = result.ownerMap.get('app1');
      expect(ownerInfo?.displayName).toBe('platform-team'); // Should fall back to basic name
      expect(ownerInfo?.type).toBe('group');
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultService = new OwnershipResolverService(catalogApi);
      
      // Test that service works with defaults (no direct way to test config values)
      expect(defaultService).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const config: OwnershipConfig = {
        cacheTtl: 10000,
        enabled: false,
        defaultView: 'all',
      };
      
      const customService = new OwnershipResolverService(catalogApi, config);
      
      expect(customService).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty applications list', async () => {
      const user = createUser('john.doe');
      const applications: ComponentEntity[] = [];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(0);
      expect(result.groupOwned).toHaveLength(0);
      expect(result.allOwned).toHaveLength(0);
    });

    it('should handle malformed owner references', async () => {
      const user = createUser('john.doe');
      const applications = [
        createComponent('app1', 'invalid:owner:format:too:many:colons'),
      ];

      const result = await service.getOwnershipData(user, applications);

      // Should handle gracefully and create owner info
      expect(result.ownerMap.has('app1')).toBe(true);
      const ownerInfo = result.ownerMap.get('app1');
      expect(ownerInfo?.type).toBe('group'); // Default to group
    });

    it('should handle user with no ownership entity refs', async () => {
      const user: BackstageUserIdentity = {
        userEntityRef: 'user:default/john.doe',
        ownershipEntityRefs: [],
      };
      const applications = [createComponent('app1', 'user:default/john.doe')];

      const result = await service.resolveUserOwnership(user, applications);

      expect(result.directlyOwned).toHaveLength(0);
      expect(result.allOwned).toHaveLength(0);
    });
  });
});