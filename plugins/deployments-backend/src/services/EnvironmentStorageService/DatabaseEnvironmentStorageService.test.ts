/**
 * Tests for DatabaseEnvironmentStorageService
 */

import { DatabaseEnvironmentStorageService } from './DatabaseEnvironmentStorageService';
import { EnvironmentConfig } from '@internal/plugin-deployments-common';
import { Knex, knex } from 'knex';

describe('DatabaseEnvironmentStorageService', () => {
  let db: Knex;
  let service: DatabaseEnvironmentStorageService;

  beforeAll(async () => {
    // Create in-memory SQLite database for testing
    db = knex({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });

    // Create the table
    await db.schema.createTable('deployment_environments', table => {
      table.uuid('id').primary().notNullable();
      table.string('component_name', 100).notNullable();
      table.string('environment_name', 50).notNullable();
      table.string('github_repo', 200).notNullable();
      table.string('workflow_path', 500).nullable();
      table.timestamps(true, true);
      table.unique(['component_name', 'environment_name']);
      table.index(['component_name']);
      table.index(['github_repo']);
    });

    service = new DatabaseEnvironmentStorageService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    await service.clear();
  });

  const createTestEnvironment = (overrides: Partial<EnvironmentConfig> = {}): Omit<EnvironmentConfig, 'id' | 'componentName' | 'createdAt' | 'updatedAt'> => ({
    environmentName: 'test-env',
    githubRepo: 'owner/repo',
    workflowPath: '.github/workflows/deploy.yml',
    ...overrides,
  });

  describe('createEnvironment', () => {
    it('should create a new environment successfully', async () => {
      const testConfig = createTestEnvironment();
      const result = await service.createEnvironment('test-component', testConfig);

      expect(result.id).toBeDefined();
      expect(result.componentName).toBe('test-component');
      expect(result.environmentName).toBe(testConfig.environmentName);
      expect(result.githubRepo).toBe(testConfig.githubRepo);
      expect(result.workflowPath).toBe(testConfig.workflowPath);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when creating duplicate environment', async () => {
      const testConfig = createTestEnvironment();
      await service.createEnvironment('test-component', testConfig);

      await expect(
        service.createEnvironment('test-component', testConfig)
      ).rejects.toThrow("Environment 'test-env' already exists for component 'test-component'");
    });
  });

  describe('getEnvironments', () => {
    it('should return empty array for component with no environments', async () => {
      const result = await service.getEnvironments('nonexistent-component');
      expect(result).toEqual([]);
    });

    it('should return all environments for a component', async () => {
      const config1 = createTestEnvironment({ environmentName: 'staging' });
      const config2 = createTestEnvironment({ environmentName: 'production' });

      await service.createEnvironment('test-component', config1);
      await service.createEnvironment('test-component', config2);

      const result = await service.getEnvironments('test-component');
      expect(result).toHaveLength(2);
      expect(result.map(env => env.environmentName)).toContain('staging');
      expect(result.map(env => env.environmentName)).toContain('production');
    });
  });

  describe('getEnvironment', () => {
    it('should return undefined for nonexistent environment', async () => {
      const result = await service.getEnvironment('test-component', 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return specific environment', async () => {
      const testConfig = createTestEnvironment();
      await service.createEnvironment('test-component', testConfig);

      const result = await service.getEnvironment('test-component', 'test-env');
      expect(result).toBeDefined();
      expect(result!.environmentName).toBe('test-env');
    });
  });

  describe('updateEnvironment', () => {
    it('should update existing environment', async () => {
      const testConfig = createTestEnvironment();
      const created = await service.createEnvironment('test-component', testConfig);

      // Add a small delay to ensure updatedAt is different from createdAt
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = {
        workflowPath: '.github/workflows/new-deploy.yml',
      };

      const result = await service.updateEnvironment('test-component', 'test-env', updates);

      expect(result.id).toBe(created.id);
      expect(result.workflowPath).toBe(updates.workflowPath);
      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(result.createdAt.getTime());
    });

    it('should throw error when updating nonexistent environment', async () => {
      await expect(
        service.updateEnvironment('test-component', 'nonexistent', { workflowPath: '.github/workflows/new.yml' })
      ).rejects.toThrow("Environment 'nonexistent' not found for component 'test-component'");
    });
  });

  describe('deleteEnvironment', () => {
    it('should delete existing environment', async () => {
      const testConfig = createTestEnvironment();
      await service.createEnvironment('test-component', testConfig);

      const result = await service.deleteEnvironment('test-component', 'test-env');
      expect(result).toBe(true);

      const check = await service.getEnvironment('test-component', 'test-env');
      expect(check).toBeUndefined();
    });

    it('should return false when deleting nonexistent environment', async () => {
      const result = await service.deleteEnvironment('test-component', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('environmentExists', () => {
    it('should return false for nonexistent environment', async () => {
      const result = await service.environmentExists('test-component', 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return true for existing environment', async () => {
      const testConfig = createTestEnvironment();
      await service.createEnvironment('test-component', testConfig);

      const result = await service.environmentExists('test-component', 'test-env');
      expect(result).toBe(true);
    });
  });

  describe('getEnvironmentsByRepo', () => {
    it('should return environments for specific repository', async () => {
      const config1 = createTestEnvironment({
        environmentName: 'staging',
        githubRepo: 'owner/repo1',
      });
      const config2 = createTestEnvironment({
        environmentName: 'production',
        githubRepo: 'owner/repo1',
      });
      const config3 = createTestEnvironment({
        environmentName: 'staging',
        githubRepo: 'owner/repo2',
      });

      await service.createEnvironment('component1', config1);
      await service.createEnvironment('component1', config2);
      await service.createEnvironment('component2', config3);

      const result = await service.getEnvironmentsByRepo('owner/repo1');
      expect(result).toHaveLength(2);
      expect(result.every(env => env.githubRepo === 'owner/repo1')).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for working database', async () => {
      const result = await service.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});