/**
 * Types for the Environment Storage Service
 */

import { EnvironmentConfig } from '@internal/plugin-deployments-common';

/**
 * Interface for the environment storage service
 */
export interface EnvironmentStorageService {
  /**
   * Get all environment configurations for a component
   */
  getEnvironments(componentName: string): Promise<EnvironmentConfig[]>;

  /**
   * Get a specific environment configuration
   */
  getEnvironment(componentName: string, environmentName: string): Promise<EnvironmentConfig | undefined>;

  /**
   * Create a new environment configuration
   */
  createEnvironment(componentName: string, config: Omit<EnvironmentConfig, 'id' | 'componentName' | 'createdAt' | 'updatedAt'>): Promise<EnvironmentConfig>;

  /**
   * Update an existing environment configuration
   */
  updateEnvironment(componentName: string, environmentName: string, updates: Partial<Omit<EnvironmentConfig, 'id' | 'componentName' | 'environmentName' | 'createdAt'>>): Promise<EnvironmentConfig>;

  /**
   * Delete an environment configuration
   */
  deleteEnvironment(componentName: string, environmentName: string): Promise<boolean>;

  /**
   * Check if an environment exists
   */
  environmentExists(componentName: string, environmentName: string): Promise<boolean>;
}

/**
 * In-memory storage structure
 */
export interface EnvironmentStore {
  /** Map of componentName -> array of environment configurations */
  environments: Map<string, EnvironmentConfig[]>;
}