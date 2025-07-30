/**
 * Database implementation of the Environment Storage Service
 */

import { Knex } from 'knex';
import { EnvironmentConfig } from '@internal/plugin-deployments-common';
import { EnvironmentStorageService } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database row interface for environment configurations
 */
interface EnvironmentRow {
  id: string;
  component_name: string;
  environment_name: string;
  github_repo: string;
  workflow_path: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Database implementation of environment storage service
 * Provides persistent storage using Knex.js
 */
export class DatabaseEnvironmentStorageService implements EnvironmentStorageService {
  private static readonly TABLE_NAME = 'deployment_environments';

  constructor(private readonly db: Knex) {}

  /**
   * Convert database row to EnvironmentConfig
   */
  private rowToEnvironmentConfig(row: EnvironmentRow): EnvironmentConfig {
    return {
      id: row.id,
      componentName: row.component_name,
      environmentName: row.environment_name,
      githubRepo: row.github_repo,
      workflowPath: row.workflow_path || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert EnvironmentConfig to database row data
   */
  private environmentConfigToRow(config: EnvironmentConfig): Omit<EnvironmentRow, 'created_at' | 'updated_at'> {
    return {
      id: config.id,
      component_name: config.componentName,
      environment_name: config.environmentName,
      github_repo: config.githubRepo,
      workflow_path: config.workflowPath || null,
    };
  }

  async getEnvironments(componentName: string): Promise<EnvironmentConfig[]> {
    const rows = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where('component_name', componentName)
      .orderBy('created_at', 'asc');

    return rows.map(row => this.rowToEnvironmentConfig(row));
  }

  async getEnvironment(componentName: string, environmentName: string): Promise<EnvironmentConfig | undefined> {
    const row = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where({
        component_name: componentName,
        environment_name: environmentName,
      })
      .first();

    return row ? this.rowToEnvironmentConfig(row) : undefined;
  }

  async createEnvironment(
    componentName: string,
    config: Omit<EnvironmentConfig, 'id' | 'componentName' | 'createdAt' | 'updatedAt'>
  ): Promise<EnvironmentConfig> {
    const now = new Date();
    const newEnvironment: EnvironmentConfig = {
      id: uuidv4(),
      componentName,
      createdAt: now,
      updatedAt: now,
      ...config,
    };

    // Check if environment with same name already exists
    const existing = await this.getEnvironment(componentName, config.environmentName);
    if (existing) {
      throw new Error(`Environment '${config.environmentName}' already exists for component '${componentName}'`);
    }

    // Insert into database
    await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .insert({
        ...this.environmentConfigToRow(newEnvironment),
        created_at: now,
        updated_at: now,
      });

    return newEnvironment;
  }

  async updateEnvironment(
    componentName: string,
    environmentName: string,
    updates: Partial<Omit<EnvironmentConfig, 'id' | 'componentName' | 'environmentName' | 'createdAt'>>
  ): Promise<EnvironmentConfig> {
    const existing = await this.getEnvironment(componentName, environmentName);
    if (!existing) {
      throw new Error(`Environment '${environmentName}' not found for component '${componentName}'`);
    }

    const now = new Date();
    const updatedEnvironment: EnvironmentConfig = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    // Update database
    await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where({
        component_name: componentName,
        environment_name: environmentName,
      })
      .update({
        ...this.environmentConfigToRow(updatedEnvironment),
        updated_at: now,
      });

    return updatedEnvironment;
  }

  async deleteEnvironment(componentName: string, environmentName: string): Promise<boolean> {
    const deletedCount = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where({
        component_name: componentName,
        environment_name: environmentName,
      })
      .del();

    return deletedCount > 0;
  }

  async environmentExists(componentName: string, environmentName: string): Promise<boolean> {
    const count = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where({
        component_name: componentName,
        environment_name: environmentName,
      })
      .count('* as count')
      .first();

    return (count?.count as number) > 0;
  }

  /**
   * Get all environments across all components (useful for debugging)
   */
  async getAllEnvironments(): Promise<EnvironmentConfig[]> {
    const rows = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .orderBy(['component_name', 'created_at']);

    return rows.map(row => this.rowToEnvironmentConfig(row));
  }

  /**
   * Clear all environments (useful for testing)
   */
  async clear(): Promise<void> {
    await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME).del();
  }

  /**
   * Get environments by GitHub repository
   */
  async getEnvironmentsByRepo(githubRepo: string): Promise<EnvironmentConfig[]> {
    const rows = await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
      .where('github_repo', githubRepo)
      .orderBy(['component_name', 'created_at']);

    return rows.map(row => this.rowToEnvironmentConfig(row));
  }

  /**
   * Health check - verify database connection and table exists
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      await this.db<EnvironmentRow>(DatabaseEnvironmentStorageService.TABLE_NAME)
        .count('* as count')
        .first();
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}