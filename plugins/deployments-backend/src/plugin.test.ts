import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ANNOTATIONS } from '@internal/plugin-deployments-common';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { InputError, NotFoundError } from '@backstage/errors';
import { DatabaseEnvironmentStorageService } from './services/EnvironmentStorageService';
import { Knex, knex } from 'knex';

// Mock services
const mockHttpAuth: HttpAuthService = {
  credentials: jest.fn().mockResolvedValue({ principal: { userEntityRef: 'user:default/test' } }),
  issueUserCookie: jest.fn(),
  listPublicServiceKeys: jest.fn(),
} as any;


const mockCatalog: jest.Mocked<CatalogService> = {
  getEntityByRef: jest.fn().mockResolvedValue({
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
  }),
} as any;

// Error handling middleware
const errorHandler = (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof InputError) {
    res.status(400).json({ error: { message: err.message } });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message } });
  } else {
    res.status(500).json({ error: { message: err.message || 'Internal Server Error', name: err.name } });
  }
};

describe('plugin', () => {
  let app: express.Express;
  let db: Knex;
  let storageService: DatabaseEnvironmentStorageService;

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

    storageService = new DatabaseEnvironmentStorageService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    await storageService.clear();

    const router = await createRouter({
      httpAuth: mockHttpAuth,
      environmentStorageService: storageService,
      catalog: mockCatalog,
    });

    app = express().use(router).use(errorHandler);
  });

  it('should handle environment configuration endpoints', async () => {
    // Test getting environments for a component (should be empty initially)
    await request(app)
      .get('/environments/test-component')
      .expect(200, {
        environments: [],
      });

    // Test creating a new environment
    const createRes = await request(app)
      .post('/environments/test-component')
      .send({
        environmentName: 'staging',
        workflowPath: '.github/workflows/deploy.yml',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.environment).toMatchObject({
      environmentName: 'staging',
      workflowPath: '.github/workflows/deploy.yml',
      componentName: 'test-component',
      githubRepo: 'owner/repo',
    });
    expect(createRes.body.environment.id).toBeDefined();
    expect(createRes.body.environment.createdAt).toBeDefined();
    expect(createRes.body.environment.updatedAt).toBeDefined();

    // Test getting environments after creation
    const listRes = await request(app).get('/environments/test-component');
    expect(listRes.status).toBe(200);
    expect(listRes.body.environments).toHaveLength(1);
    expect(listRes.body.environments[0]).toMatchObject({
      environmentName: 'staging',
      workflowPath: '.github/workflows/deploy.yml',
      componentName: 'test-component',
      githubRepo: 'owner/repo',
    });

    // Test getting specific environment
    await request(app)
      .get('/environments/test-component/staging')
      .expect(200);
  });

  it('should validate environment configuration data', async () => {
    // Test invalid environment name
    const invalidRes = await request(app)
      .post('/environments/test-component')
      .send({
        environmentName: '', // invalid - empty string
        workflowPath: '.github/workflows/deploy.yml',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.message).toContain('Invalid request body');

    // Test invalid workflow path format
    const invalidWorkflowRes = await request(app)
      .post('/environments/test-component')
      .send({
        environmentName: 'staging',
        workflowPath: 'invalid-path', // invalid format
      });

    expect(invalidWorkflowRes.status).toBe(400);
    expect(invalidWorkflowRes.body.error.message).toContain(
      'Invalid request body',
    );
  });
});
