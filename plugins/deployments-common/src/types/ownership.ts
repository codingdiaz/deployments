/**
 * Types for ownership resolution and access control
 */

import { ComponentEntity } from '@backstage/catalog-model';

/**
 * Access level for an application
 */
export type AccessLevel = 'full' | 'limited' | 'none';

/**
 * Information about an owner (user or group)
 */
export interface OwnerInfo {
  type: 'user' | 'group';
  name: string;
  displayName: string;
  avatar?: string;
}

/**
 * Applications owned by a user, categorized by ownership type
 */
export interface OwnedApplications {
  /** Applications directly owned by the user */
  directlyOwned: ComponentEntity[];
  /** Applications owned by groups the user belongs to */
  groupOwned: ComponentEntity[];
  /** All applications the user owns (union of direct and group owned) */
  allOwned: ComponentEntity[];
}

/**
 * Ownership data for filtering and grouping
 */
export interface OwnershipData {
  /** Set of component names owned by the user */
  userOwned: Set<string>;
  /** Map of group names to component names owned by that group */
  groupOwned: Map<string, string[]>;
  /** Map of component names to their owner information */
  ownerMap: Map<string, OwnerInfo>;
  /** Groups the user belongs to */
  userGroups: string[];
}

/**
 * Enhanced component entity with ownership information
 */
export interface EnhancedComponentEntity extends ComponentEntity {
  ownershipInfo: {
    owners: OwnerInfo[];
    primaryOwner: OwnerInfo;
    userHasAccess: boolean;
    accessLevel: AccessLevel;
  };
}

/**
 * Application group for display purposes
 */
export interface ApplicationGroup {
  owner: OwnerInfo;
  applications: ComponentEntity[];
  isUserGroup: boolean;
  accessLevel: AccessLevel;
}

/**
 * Backstage user identity with extended information
 */
export interface BackstageUserIdentity {
  userEntityRef: string;
  ownershipEntityRefs: string[];
}

/**
 * Cache entry for ownership data
 */
export interface OwnershipCacheEntry {
  data: OwnershipData;
  timestamp: number;
  ttl: number;
}

/**
 * Configuration for ownership resolution
 */
export interface OwnershipConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
  /** Whether to enable ownership filtering (default: true) */
  enabled?: boolean;
  /** Default view mode (default: 'owned') */
  defaultView?: 'owned' | 'all';
}

/**
 * Interface for ownership resolution service
 */
export interface OwnershipResolver {
  /**
   * Resolve applications owned by a user
   */
  resolveUserOwnership(
    user: BackstageUserIdentity,
    applications: ComponentEntity[]
  ): Promise<OwnedApplications>;

  /**
   * Resolve which groups a user belongs to
   */
  resolveGroupMembership(
    user: BackstageUserIdentity,
    groups: string[]
  ): Promise<string[]>;

  /**
   * Determine user's access level for an application
   */
  determineApplicationAccess(
    user: BackstageUserIdentity,
    application: ComponentEntity
  ): Promise<AccessLevel>;

  /**
   * Get comprehensive ownership data for filtering and grouping
   */
  getOwnershipData(
    user: BackstageUserIdentity,
    applications: ComponentEntity[]
  ): Promise<OwnershipData>;

  /**
   * Clear cached ownership data
   */
  clearCache(userRef?: string): void;
}