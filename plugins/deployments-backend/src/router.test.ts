/**
 * Tests for the deployments router
 */

import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { InMemoryEnvironmentStorageService } from './services/EnvironmentStorageService';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { CatalogApi } from '@backstage/catalog-client';
import { InputError, NotFoundError } from '@backstage/errors';
import { ANNOTATIONS } from '@internal/plugin-deployments-common';

// Mock the HttpAuthService
const mockHttpAuth: HttpAuthService = {
  credentials: jest.fn(),
  issueUserCookie: jest.fn(),
  listPublicServiceKeys: jest.fn(),
} as any;

// Mock the CatalogApi
const mockCatalog: jest.Mocked<CatalogApi> = {
  getEntityByRef: jest.fn(),
} as any;

// Error handling middleware for tests
const errorHandler = (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof InputError) {
    res.status(400).json({ error: { message: err.message } });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message } });
  } else {
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  }
};

describe('deployments router', () => {
  let app: express.Express;
  let storageService: InMemoryEnvironmentStorageService;

  beforeEach(async () => {
    storageService = new InMemoryEnvironmentStorageService();
    
    // Mock catalog service to return entity with GitHub source location
    mockCatalog.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        annotations: {
          [ANNOTATIONS.SOURCE_LOCATION]: 'url:https://github.com/owner/repo',
        },
      },
      spec: {
        type: 'service',
      },
    });

    const router = await createRouter({
      httpAuth: mockHttpAuth,
      environmentStorageService: storageService,
      catalog: mockCatalog,
    });

    app = express().use(router).use(errorHandler);
  });

  describe('GET /environments/:componentName', () => {
    it('should return empty array for component with no environments', async () => {
      const response = await request(app)
        .get('/environments/test-component')
        .expect(200);

      expect(response.body).toEqual({ environments: [] });
    });

    it('should return environments for a component', async () => {
      const config = {
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      await storageService.createEnvironment('test-component', config);

      const response = await request(app)
        .get('/environments/test-component')
        .expect(200);

      expect(response.body.environments).toHaveLength(1);
      expect(response.body.environments[0]).toMatchObject(config);
    });

    it('should return 400 for invalid component name', async () => {
      const response = await request(app)
        .get('/environments/invalid@component')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid component name');
    });
  });

  describe('GET /environments/:componentName/:environmentName', () => {
    it('should return specific environment', async () => {
      const config = {
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      await storageService.createEnvironment('test-component', config);

      const response = await request(app)
        .get('/environments/test-component/staging')
        .expect(200);

      expect(response.body.environment).toMatchObject(config);
    });

    it('should return 404 for non-existent environment', async () => {
      const response = await request(app)
        .get('/environments/test-component/staging')
        .expect(404);

      expect(response.body.error.message).toContain('Environment \'staging\' not found');
    });

    it('should return 400 for invalid environment name', async () => {
      const response = await request(app)
        .get('/environments/test-component/invalid@env')
        .expect(400);

      expect(response.body.error.message).toContain('Invalid environment name');
    });
  });

  describe('POST /environments/:componentName', () => {
    it('should create new environment', async () => {
      const config = {
        environmentName: 'staging',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
        githubEnvironment: 'staging-env',
      };

      const response = await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(201);

      expect(response.body.environment).toMatchObject({
        ...config,
        githubRepo: 'owner/repo', // Should be extracted from entity annotations
      });
      expect(response.body.environment.componentName).toBe('test-component');
      expect(response.body.environment.id).toBeDefined();
      expect(response.body.environment.createdAt).toBeDefined();
      expect(response.body.environment.updatedAt).toBeDefined();
    });

    it('should return 400 for invalid request body', async () => {
      const invalidConfig = {
        environmentName: '', // invalid - empty string
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      const response = await request(app)
        .post('/environments/test-component')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid request body');
    });

    it('should return 404 when component not found in catalog', async () => {
      mockCatalog.getEntityByRef.mockResolvedValueOnce(undefined);

      const config = {
        environmentName: 'staging',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      const response = await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(404);

      expect(response.body.error.message).toContain('Component \'test-component\' not found in catalog');
    });

    it('should return 400 for invalid workflow path', async () => {
      const invalidConfig = {
        environmentName: 'staging',
        workflowPath: 'invalid/path.yml', // invalid - not in .github/workflows/
        jobName: 'deploy',
      };

      const response = await request(app)
        .post('/environments/test-component')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error.message).toContain('Workflow path must be a YAML file in .github/workflows/');
    });

    it('should return 400 when creating duplicate environment', async () => {
      const config = {
        environmentName: 'staging',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(201);

      const response = await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('PUT /environments/:componentName/:environmentName', () => {
    beforeEach(async () => {
      const config = {
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      await storageService.createEnvironment('test-component', config);
    });

    it('should update existing environment', async () => {
      const updates = {
        jobName: 'new-deploy',
        githubEnvironment: 'staging-env',
      };

      const response = await request(app)
        .put('/environments/test-component/staging')
        .send(updates)
        .expect(200);

      expect(response.body.environment.githubRepo).toBe('owner/repo'); // unchanged - from entity annotations
      expect(response.body.environment.jobName).toBe('new-deploy');
      expect(response.body.environment.githubEnvironment).toBe('staging-env');
      expect(response.body.environment.workflowPath).toBe('.github/workflows/deploy.yml'); // unchanged
    });

    it('should return 404 for non-existent environment', async () => {
      const updates = { jobName: 'new-job' };

      const response = await request(app)
        .put('/environments/test-component/production')
        .send(updates)
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdates = {
        workflowPath: 'invalid/path.yml', // invalid - not in .github/workflows/
      };

      const response = await request(app)
        .put('/environments/test-component/staging')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.error.message).toContain('Workflow path must be a YAML file in .github/workflows/');
    });
  });

  describe('DELETE /environments/:componentName/:environmentName', () => {
    beforeEach(async () => {
      const config = {
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      };

      await storageService.createEnvironment('test-component', config);
    });

    it('should delete existing environment', async () => {
      await request(app)
        .delete('/environments/test-component/staging')
        .expect(204);

      // Verify it's deleted
      const environment = await storageService.getEnvironment('test-component', 'staging');
      expect(environment).toBeUndefined();
    });

    it('should return 404 for non-existent environment', async () => {
      const response = await request(app)
        .delete('/environments/test-component/production')
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('Parameter validation', () => {
    it('should validate component name format', async () => {
      const validTestCases = [
        'valid-component',
        'valid_component', 
        'valid.component',
        'ValidComponent123',
      ];

      const invalidTestCases = [
        'invalid@component',
        'invalid component',
      ];

      // Test valid component names
      for (const name of validTestCases) {
        const response = await request(app).get(`/environments/${name}`);
        expect(response.status).toBe(200);
      }

      // Test invalid component names
      for (const name of invalidTestCases) {
        const response = await request(app).get(`/environments/${encodeURIComponent(name)}`);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('Invalid component name');
      }

      // Test empty component name
      const emptyResponse = await request(app).get('/environments/');
      expect(emptyResponse.status).toBe(404); // Express routing issue, not our validation
    });

    it('should validate environment name format', async () => {
      const validTestCases = [
        'staging',
        'production',
        'test-env',
        'test_env',
        'TestEnv123',
      ];

      const invalidTestCases = [
        'invalid@env',
        'invalid env',
      ];

      // Test valid environment names (should return 404 since environment doesn't exist)
      for (const name of validTestCases) {
        const response = await request(app).get(`/environments/test-component/${name}`);
        expect(response.status).toBe(404);
      }

      // Test invalid environment names
      for (const name of invalidTestCases) {
        const response = await request(app).get(`/environments/test-component/${encodeURIComponent(name)}`);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('Invalid environment name');
      }
    });
  });
});