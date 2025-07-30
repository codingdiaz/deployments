/**
 * Tests for ApplicationGrouperService
 */

import { ComponentEntity } from '@backstage/catalog-model';
import { ApplicationGrouperService } from './ApplicationGrouperService';
import { OwnershipData, OwnerInfo, ApplicationGroup } from '../types/ownership';

describe('ApplicationGrouperService', () => {
  let service: ApplicationGrouperService;

  beforeEach(() => {
    service = new ApplicationGrouperService();
  });

  describe('groupByOwner', () => {
    it('should group applications by their primary owner', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'user:default/john.doe'),
        createMockApplication('app2', 'user:default/jane.smith'),
        createMockApplication('app3', 'user:default/john.doe'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(['app1']),
        groupOwned: new Map(),
        ownerMap: new Map(),
        userGroups: []
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(2);
      
      const johnGroup = groups.find(g => g.owner.name === 'john.doe');
      const janeGroup = groups.find(g => g.owner.name === 'jane.smith');

      expect(johnGroup).toBeDefined();
      expect(johnGroup!.applications).toHaveLength(2);
      expect(johnGroup!.owner.displayName).toBe('John Doe');
      expect(johnGroup!.owner.type).toBe('user');

      expect(janeGroup).toBeDefined();
      expect(janeGroup!.applications).toHaveLength(1);
      expect(janeGroup!.owner.displayName).toBe('Jane Smith');
      expect(janeGroup!.owner.type).toBe('user');
    });

    it('should handle group ownership', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'group:default/platform-team'),
        createMockApplication('app2', 'group:default/frontend-team'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(),
        groupOwned: new Map([['platform-team', ['app1']]]),
        ownerMap: new Map(),
        userGroups: ['platform-team']
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(2);
      
      const platformGroup = groups.find(g => g.owner.name === 'platform-team');
      const frontendGroup = groups.find(g => g.owner.name === 'frontend-team');

      expect(platformGroup).toBeDefined();
      expect(platformGroup!.owner.type).toBe('group');
      expect(platformGroup!.owner.displayName).toBe('Platform Team');
      expect(platformGroup!.isUserGroup).toBe(true);

      expect(frontendGroup).toBeDefined();
      expect(frontendGroup!.owner.type).toBe('group');
      expect(frontendGroup!.owner.displayName).toBe('Frontend Team');
      expect(frontendGroup!.isUserGroup).toBe(false);
    });

    it('should handle applications with no owner (unassigned)', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', undefined),
        createMockApplication('app2', ''),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(),
        groupOwned: new Map(),
        ownerMap: new Map(),
        userGroups: []
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(1);
      
      const unassignedGroup = groups[0];
      expect(unassignedGroup.owner.name).toBe('unassigned');
      expect(unassignedGroup.owner.displayName).toBe('Unassigned');
      expect(unassignedGroup.owner.type).toBe('group');
      expect(unassignedGroup.applications).toHaveLength(2);
    });

    it('should use cached owner information when available', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'user:default/john.doe'),
      ];

      const cachedOwnerInfo: OwnerInfo = {
        type: 'user',
        name: 'john.doe',
        displayName: 'John Doe (Cached)',
        avatar: 'https://example.com/avatar.jpg'
      };

      const ownershipData: OwnershipData = {
        userOwned: new Set(['app1']),
        groupOwned: new Map(),
        ownerMap: new Map([['app1', cachedOwnerInfo]]),
        userGroups: []
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(1);
      expect(groups[0].owner).toEqual(cachedOwnerInfo);
    });

    it('should handle mixed ownership scenarios', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'user:default/john.doe'),
        createMockApplication('app2', 'group:default/platform-team'),
        createMockApplication('app3', undefined),
        createMockApplication('app4', 'user:default/john.doe'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(['app1', 'app4']),
        groupOwned: new Map([['platform-team', ['app2']]]),
        ownerMap: new Map(),
        userGroups: ['platform-team']
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(3);
      
      const johnGroup = groups.find(g => g.owner.name === 'john.doe');
      const platformGroup = groups.find(g => g.owner.name === 'platform-team');
      const unassignedGroup = groups.find(g => g.owner.name === 'unassigned');

      expect(johnGroup!.applications).toHaveLength(2);
      expect(platformGroup!.applications).toHaveLength(1);
      expect(unassignedGroup!.applications).toHaveLength(1);
    });
  });

  describe('sortGroups', () => {
    let mockGroups: ApplicationGroup[];

    beforeEach(() => {
      mockGroups = [
        createMockGroup('zebra-team', 'group', 1),
        createMockGroup('alpha-team', 'group', 3),
        createMockGroup('beta-user', 'user', 2),
      ];
    });

    it('should sort groups by name (default)', () => {
      const sorted = service.sortGroups(mockGroups);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].owner.displayName).toBe('Alpha Team');
      expect(sorted[1].owner.displayName).toBe('Beta User');
      expect(sorted[2].owner.displayName).toBe('Zebra Team');
    });

    it('should sort groups by name when explicitly specified', () => {
      const sorted = service.sortGroups(mockGroups, 'name');

      expect(sorted).toHaveLength(3);
      expect(sorted[0].owner.displayName).toBe('Alpha Team');
      expect(sorted[1].owner.displayName).toBe('Beta User');
      expect(sorted[2].owner.displayName).toBe('Zebra Team');
    });

    it('should sort groups by application count (descending), then by name', () => {
      const sorted = service.sortGroups(mockGroups, 'count');

      expect(sorted).toHaveLength(3);
      expect(sorted[0].owner.displayName).toBe('Alpha Team'); // 3 apps
      expect(sorted[1].owner.displayName).toBe('Beta User');  // 2 apps
      expect(sorted[2].owner.displayName).toBe('Zebra Team'); // 1 app
    });

    it('should handle groups with same application count by sorting by name', () => {
      const groupsWithSameCount: ApplicationGroup[] = [
        createMockGroup('zebra-team', 'group', 2),
        createMockGroup('alpha-team', 'group', 2),
        createMockGroup('beta-user', 'user', 2),
      ];

      const sorted = service.sortGroups(groupsWithSameCount, 'count');

      expect(sorted).toHaveLength(3);
      expect(sorted[0].owner.displayName).toBe('Alpha Team');
      expect(sorted[1].owner.displayName).toBe('Beta User');
      expect(sorted[2].owner.displayName).toBe('Zebra Team');
    });

    it('should not mutate the original array', () => {
      const originalOrder = mockGroups.map(g => g.owner.displayName);
      service.sortGroups(mockGroups, 'count');

      const currentOrder = mockGroups.map(g => g.owner.displayName);
      expect(currentOrder).toEqual(originalOrder);
    });

    it('should handle empty groups array', () => {
      const sorted = service.sortGroups([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('owner reference parsing', () => {
    it('should parse different owner reference formats', () => {
      const testCases = [
        {
          input: 'user:default/john.doe',
          expected: { type: 'user', name: 'john.doe', displayName: 'John Doe' }
        },
        {
          input: 'group:default/platform-team',
          expected: { type: 'group', name: 'platform-team', displayName: 'Platform Team' }
        },
        {
          input: 'john.doe',
          expected: { type: 'user', name: 'john.doe', displayName: 'John Doe' }
        },
        {
          input: 'platform-team',
          expected: { type: 'user', name: 'platform-team', displayName: 'Platform Team' }
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const applications: ComponentEntity[] = [
          createMockApplication('test-app', input),
        ];

        const ownershipData: OwnershipData = {
          userOwned: new Set(),
          groupOwned: new Map(),
          ownerMap: new Map(),
          userGroups: []
        };

        const groups = service.groupByOwner(applications, ownershipData);
        
        expect(groups).toHaveLength(1);
        expect(groups[0].owner.type).toBe(expected.type);
        expect(groups[0].owner.name).toBe(expected.name);
        expect(groups[0].owner.displayName).toBe(expected.displayName);
      });
    });

    it('should handle complex display name formatting', () => {
      const testCases = [
        { input: 'john_doe', expected: 'John Doe' },
        { input: 'jane-smith', expected: 'Jane Smith' },
        { input: 'platform.team', expected: 'Platform Team' },
        { input: 'api_gateway_team', expected: 'Api Gateway Team' },
      ];

      testCases.forEach(({ input, expected }) => {
        const applications: ComponentEntity[] = [
          createMockApplication('test-app', `user:default/${input}`),
        ];

        const ownershipData: OwnershipData = {
          userOwned: new Set(),
          groupOwned: new Map(),
          ownerMap: new Map(),
          userGroups: []
        };

        const groups = service.groupByOwner(applications, ownershipData);
        
        expect(groups).toHaveLength(1);
        expect(groups[0].owner.displayName).toBe(expected);
      });
    });
  });

  describe('access level determination', () => {
    it('should set full access for user-owned applications', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'user:default/john.doe'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(['app1']),
        groupOwned: new Map(),
        ownerMap: new Map(),
        userGroups: []
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(1);
      expect(groups[0].accessLevel).toBe('full');
    });

    it('should set full access for group-owned applications where user is member', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'group:default/platform-team'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(),
        groupOwned: new Map([['platform-team', ['app1']]]),
        ownerMap: new Map(),
        userGroups: ['platform-team']
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(1);
      expect(groups[0].accessLevel).toBe('full');
    });

    it('should set limited access for non-owned applications', () => {
      const applications: ComponentEntity[] = [
        createMockApplication('app1', 'group:default/other-team'),
      ];

      const ownershipData: OwnershipData = {
        userOwned: new Set(),
        groupOwned: new Map(),
        ownerMap: new Map(),
        userGroups: ['my-team']
      };

      const groups = service.groupByOwner(applications, ownershipData);

      expect(groups).toHaveLength(1);
      expect(groups[0].accessLevel).toBe('limited');
    });
  });
});

// Helper functions for creating mock data

function createMockApplication(name: string, owner?: string): ComponentEntity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name,
      namespace: 'default',
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: owner || undefined,
    },
  };
}

function createMockGroup(
  ownerName: string, 
  ownerType: 'user' | 'group', 
  appCount: number
): ApplicationGroup {
  const displayName = ownerName
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const applications: ComponentEntity[] = [];
  for (let i = 0; i < appCount; i++) {
    applications.push(createMockApplication(`app${i + 1}`, `${ownerType}:default/${ownerName}`));
  }

  return {
    owner: {
      type: ownerType,
      name: ownerName,
      displayName,
    },
    applications,
    isUserGroup: false,
    accessLevel: 'limited',
  };
}