/**
 * Integration test to verify exports work correctly
 */

import { ApplicationGrouperService, ApplicationGroup, OwnerInfo } from './index';
import { ComponentEntity } from '@backstage/catalog-model';

describe('Integration Tests', () => {
  it('should be able to import and use ApplicationGrouperService', () => {
    const service = new ApplicationGrouperService();
    expect(service).toBeInstanceOf(ApplicationGrouperService);
    expect(typeof service.groupByOwner).toBe('function');
    expect(typeof service.sortGroups).toBe('function');
  });

  it('should be able to import types', () => {
    const ownerInfo: OwnerInfo = {
      type: 'user',
      name: 'test-user',
      displayName: 'Test User'
    };

    const applicationGroup: ApplicationGroup = {
      owner: ownerInfo,
      applications: [],
      isUserGroup: true,
      accessLevel: 'full'
    };

    expect(ownerInfo.type).toBe('user');
    expect(applicationGroup.owner).toBe(ownerInfo);
  });
});