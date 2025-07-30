/**
 * Service for grouping applications by ownership
 */

import { ComponentEntity } from '@backstage/catalog-model';
import { ApplicationGroup, OwnerInfo, OwnershipData } from '../types/ownership';

/**
 * Interface for application grouping service
 */
export interface ApplicationGrouper {
  /**
   * Group applications by their owners
   */
  groupByOwner(
    applications: ComponentEntity[],
    ownershipData: OwnershipData,
  ): ApplicationGroup[];

  /**
   * Sort application groups by specified criteria
   */
  sortGroups(
    groups: ApplicationGroup[],
    sortBy?: 'name' | 'count',
  ): ApplicationGroup[];
}

/**
 * Implementation of application grouping service
 */
export class ApplicationGrouperService implements ApplicationGrouper {
  /**
   * Group applications by their primary owner
   */
  groupByOwner(
    applications: ComponentEntity[],
    ownershipData: OwnershipData,
  ): ApplicationGroup[] {
    const groupMap = new Map<string, ApplicationGroup>();

    for (const application of applications) {
      const ownerInfo = this.getPrimaryOwner(application, ownershipData);
      const ownerKey = `${ownerInfo.type}:${ownerInfo.name}`;

      if (!groupMap.has(ownerKey)) {
        groupMap.set(ownerKey, {
          owner: ownerInfo,
          applications: [],
          isUserGroup:
            ownershipData.userGroups.includes(ownerInfo.name) ||
            ownershipData.userOwned.has(application.metadata.name),
          accessLevel: this.determineGroupAccessLevel(ownerInfo, ownershipData),
        });
      }

      groupMap.get(ownerKey)!.applications.push(application);
    }

    return Array.from(groupMap.values());
  }

  /**
   * Sort application groups by name or application count
   */
  sortGroups(
    groups: ApplicationGroup[],
    sortBy: 'name' | 'count' = 'name',
  ): ApplicationGroup[] {
    return [...groups].sort((a, b) => {
      if (sortBy === 'count') {
        // Sort by application count (descending), then by name
        const countDiff = b.applications.length - a.applications.length;
        if (countDiff !== 0) return countDiff;
      }

      // Sort by owner display name (ascending)
      return a.owner.displayName.localeCompare(b.owner.displayName);
    });
  }

  /**
   * Get the primary owner for an application
   * Uses the first owner if multiple owners exist
   */
  private getPrimaryOwner(
    application: ComponentEntity,
    ownershipData: OwnershipData,
  ): OwnerInfo {
    const appName = application.metadata.name;

    // Check if we have cached owner info
    if (ownershipData.ownerMap.has(appName)) {
      return ownershipData.ownerMap.get(appName)!;
    }

    // Extract owner from catalog entity spec
    const ownerRef = application.spec?.owner as string;
    if (!ownerRef) {
      return this.createUnassignedOwner();
    }

    // Parse owner reference (format: "user:default/username" or "group:default/groupname")
    const ownerInfo = this.parseOwnerReference(ownerRef);

    // Cache the owner info for future use
    ownershipData.ownerMap.set(appName, ownerInfo);

    return ownerInfo;
  }

  /**
   * Parse Backstage owner reference into OwnerInfo
   */
  private parseOwnerReference(ownerRef: string): OwnerInfo {
    // Handle different owner reference formats
    // Examples: "user:default/john.doe", "group:default/platform-team", "john.doe"

    let type: 'user' | 'group' = 'user';
    let name = ownerRef;
    let displayName = ownerRef;

    if (ownerRef.includes(':')) {
      const [entityType, entityPath] = ownerRef.split(':', 2);
      type = entityType === 'group' ? 'group' : 'user';

      if (entityPath.includes('/')) {
        name = entityPath.split('/').pop() || entityPath;
      } else {
        name = entityPath;
      }
    }

    // Create display name (capitalize and replace dots/dashes with spaces for readability)
    displayName = name
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      type,
      name,
      displayName,
    };
  }

  /**
   * Create owner info for unassigned applications
   */
  private createUnassignedOwner(): OwnerInfo {
    return {
      type: 'group',
      name: 'unassigned',
      displayName: 'Unassigned',
    };
  }

  /**
   * Determine access level for a group based on ownership data
   */
  private determineGroupAccessLevel(
    ownerInfo: OwnerInfo,
    ownershipData: OwnershipData,
  ): 'full' | 'limited' | 'none' {
    // User has full access to their own applications and groups they belong to
    if (ownerInfo.type === 'user' && ownershipData.userOwned.size > 0) {
      return 'full';
    }

    if (
      ownerInfo.type === 'group' &&
      ownershipData.userGroups.includes(ownerInfo.name)
    ) {
      return 'full';
    }

    // Limited access for other groups (can view but may not have deployment permissions)
    return 'limited';
  }
}
