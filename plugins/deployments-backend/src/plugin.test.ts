import { startTestBackend } from '@backstage/backend-test-utils';
import { deploymentsPlugin } from './plugin';
import request from 'supertest';

describe('plugin', () => {
  it('should handle environment configuration endpoints', async () => {
    const { server } = await startTestBackend({
      features: [deploymentsPlugin],
    });

    // Test getting environments for a component (should be empty initially)
    await request(server)
      .get('/api/deployments/environments/test-component')
      .expect(200, {
        environments: [],
      });

    // Test creating a new environment
    const createRes = await request(server)
      .post('/api/deployments/environments/test-component')
      .send({
        environmentName: 'staging',
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.environment).toMatchObject({
      environmentName: 'staging',
      githubRepo: 'owner/repo',
      workflowPath: '.github/workflows/deploy.yml',
      jobName: 'deploy',
      componentName: 'test-component',
    });
    expect(createRes.body.environment.id).toBeDefined();
    expect(createRes.body.environment.createdAt).toBeDefined();
    expect(createRes.body.environment.updatedAt).toBeDefined();

    // Test getting environments after creation
    const listRes = await request(server).get(
      '/api/deployments/environments/test-component',
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body.environments).toHaveLength(1);
    expect(listRes.body.environments[0]).toMatchObject({
      environmentName: 'staging',
      githubRepo: 'owner/repo',
      workflowPath: '.github/workflows/deploy.yml',
      jobName: 'deploy',
      componentName: 'test-component',
    });

    // Test getting specific environment
    await request(server)
      .get('/api/deployments/environments/test-component/staging')
      .expect(200);
  });

  it('should validate environment configuration data', async () => {
    const { server } = await startTestBackend({
      features: [deploymentsPlugin],
    });

    // Test invalid environment name
    const invalidRes = await request(server)
      .post('/api/deployments/environments/test-component')
      .send({
        environmentName: '', // invalid - empty string
        githubRepo: 'owner/repo',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.message).toContain('Invalid request body');

    // Test invalid GitHub repo format
    const invalidRepoRes = await request(server)
      .post('/api/deployments/environments/test-component')
      .send({
        environmentName: 'staging',
        githubRepo: 'invalid-format', // invalid format
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
      });

    expect(invalidRepoRes.status).toBe(400);
    expect(invalidRepoRes.body.error.message).toContain(
      'GitHub repository must be in format',
    );
  });
});
