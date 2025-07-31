/**
 * Tests for the deployments router
 */

import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { EnvironmentStorageService } from './services/EnvironmentStorageService';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { InputError, NotFoundError } from '@backstage/errors';
import { ANNOTATIONS } from '@internal/plugin-deployments-common';

// Mock the HttpAuthService
const mockHttpAuth: HttpAuthService = {
  credentials: jest.fn(),
  issueUserCookie: jest.fn(),
  listPublicServiceKeys: jest.fn(),
} as any;


// Mock the CatalogService
const mockCatalog: jest.Mocked<CatalogService> = {
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

// Mock storage service
const createMockStorageService = (): jest.Mocked<EnvironmentStorageService> => ({
  getEnvironments: jest.fn().mockResolvedValue([]),
  getEnvironment: jest.fn().mockResolvedValue(undefined),
  createEnvironment: jest.fn(),
  updateEnvironment: jest.fn(),
  deleteEnvironment: jest.fn().mockResolvedValue(true),
  environmentExists: jest.fn().mockResolvedValue(false),
});

describe('deployments router', () => {
  let app: express.Express;
  let storageService: jest.Mocked<EnvironmentStorageService>;

  beforeEach(async () => {
    storageService = createMockStorageService();
    
    // Mock auth services
    (mockHttpAuth.credentials as jest.Mock).mockResolvedValue({ principal: { userEntityRef: 'user:default/test' } });
    
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
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storageService.getEnvironments.mockResolvedValue([config]);

      const response = await request(app)
        .get('/environments/test-component')
        .expect(200);

      expect(response.body.environments).toHaveLength(1);
      expect(response.body.environments[0]).toMatchObject({
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml'
      });
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
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storageService.getEnvironment.mockResolvedValue(config);

      const response = await request(app)
        .get('/environments/test-component/staging')
        .expect(200);

      expect(response.body.environment).toMatchObject({
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml'
      });
    });

    it('should return 404 for non-existent environment', async () => {
      storageService.getEnvironment.mockResolvedValue(undefined);
      
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
      };
      
      const createdConfig = {
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      storageService.createEnvironment.mockResolvedValue(createdConfig);

      const response = await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(201);

      expect(response.body.environment).toMatchObject({
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        componentName: 'test-component'
      });
      expect(response.body.environment.id).toBeDefined();
      expect(response.body.environment.createdAt).toBeDefined();
      expect(response.body.environment.updatedAt).toBeDefined();
    });

    it('should return 400 for invalid request body', async () => {
      const invalidConfig = {
        environmentName: '', // invalid - empty string
        workflowPath: '.github/workflows/deploy.yml',
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
      };
      
      const createdConfig = {
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call succeeds
      storageService.createEnvironment.mockResolvedValueOnce(createdConfig);
      storageService.environmentExists.mockResolvedValueOnce(false);
      
      await request(app)
        .post('/environments/test-component')
        .send(config)
        .expect(201);

      // Second call should indicate environment exists and fail
      storageService.createEnvironment.mockRejectedValueOnce(new Error('Environment already exists'));
      
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
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storageService.getEnvironment.mockResolvedValue(config);
    });

    it('should update existing environment', async () => {
      const updates = {
        workflowPath: '.github/workflows/new-deploy.yml',
      };
      
      const updatedConfig = {
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/new-deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      storageService.updateEnvironment.mockResolvedValue(updatedConfig);

      const response = await request(app)
        .put('/environments/test-component/staging')
        .send(updates)
        .expect(200);

      expect(response.body.environment.githubRepo).toBe('owner/repo');
      expect(response.body.environment.workflowPath).toBe('.github/workflows/new-deploy.yml');
      expect(response.body.environment.environmentName).toBe('staging');
    });

    it('should return 404 for non-existent environment', async () => {
      const updates = { workflowPath: '.github/workflows/new-deploy.yml' };
      
      storageService.updateEnvironment.mockRejectedValueOnce(new Error('Environment not found'));

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
      
      const existingConfig = {
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      storageService.getEnvironment.mockResolvedValue(existingConfig);

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
        id: 'env-1',
        componentName: 'test-component',
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      storageService.getEnvironment.mockResolvedValue(config);
      storageService.deleteEnvironment.mockResolvedValue(true);
    });

    it('should delete existing environment', async () => {
      await request(app)
        .delete('/environments/test-component/staging')
        .expect(204);

      expect(storageService.deleteEnvironment).toHaveBeenCalledWith('test-component', 'staging');
    });

    it('should return 404 for non-existent environment', async () => {
      storageService.deleteEnvironment.mockResolvedValue(false);
      
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