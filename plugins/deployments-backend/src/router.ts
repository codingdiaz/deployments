import { HttpAuthService } from '@backstage/backend-plugin-api';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { InputError, NotFoundError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { EnvironmentStorageService } from './services/EnvironmentStorageService';
import { 
  createEnvironmentSchema, 
  updateEnvironmentSchema, 
  componentNameSchema, 
  environmentNameSchema 
} from './schemas/environment';
import { ANNOTATIONS } from '@internal/plugin-deployments-common';

export async function createRouter({
  httpAuth,
  environmentStorageService,
  catalog,
}: {
  httpAuth: HttpAuthService;
  environmentStorageService: EnvironmentStorageService;
  catalog: CatalogService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // Helper function to extract GitHub repository from entity annotations
  const getGitHubRepoFromEntity = async (componentName: string, req: express.Request): Promise<string> => {
    const credentials = await httpAuth.credentials(req);
    
    const entity = await catalog.getEntityByRef(`component:default/${componentName}`, { credentials });
    
    if (!entity) {
      throw new NotFoundError(`Component '${componentName}' not found in catalog`);
    }

    const sourceLocation = entity.metadata.annotations?.[ANNOTATIONS.SOURCE_LOCATION];
    if (!sourceLocation) {
      throw new InputError(`Component '${componentName}' does not have a source location annotation`);
    }

    const match = sourceLocation.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new InputError(`Component '${componentName}' source location is not a GitHub repository`);
    }

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');
    return `${owner}/${repo}`;
  };

  // GET /environments/:componentName - Get all environments for a component
  router.get('/environments/:componentName', async (req, res) => {
    const componentNameResult = componentNameSchema.safeParse(req.params.componentName);
    if (!componentNameResult.success) {
      throw new InputError(`Invalid component name: ${componentNameResult.error.message}`);
    }

    const environments = await environmentStorageService.getEnvironments(componentNameResult.data);
    res.json({ environments });
  });

  // GET /environments/:componentName/:environmentName - Get specific environment
  router.get('/environments/:componentName/:environmentName', async (req, res) => {
    const componentNameResult = componentNameSchema.safeParse(req.params.componentName);
    if (!componentNameResult.success) {
      throw new InputError(`Invalid component name: ${componentNameResult.error.message}`);
    }

    const environmentNameResult = environmentNameSchema.safeParse(req.params.environmentName);
    if (!environmentNameResult.success) {
      throw new InputError(`Invalid environment name: ${environmentNameResult.error.message}`);
    }

    const environment = await environmentStorageService.getEnvironment(
      componentNameResult.data, 
      environmentNameResult.data
    );

    if (!environment) {
      throw new NotFoundError(
        `Environment '${environmentNameResult.data}' not found for component '${componentNameResult.data}'`
      );
    }

    res.json({ environment });
  });

  // POST /environments/:componentName - Create new environment
  router.post('/environments/:componentName', async (req, res) => {
    const componentNameResult = componentNameSchema.safeParse(req.params.componentName);
    if (!componentNameResult.success) {
      throw new InputError(`Invalid component name: ${componentNameResult.error.message}`);
    }

    const bodyResult = createEnvironmentSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new InputError(`Invalid request body: ${bodyResult.error.message}`);
    }

    try {
      // Extract GitHub repository from entity annotations
      const githubRepo = await getGitHubRepoFromEntity(componentNameResult.data, req);

      const environment = await environmentStorageService.createEnvironment(
        componentNameResult.data,
        {
          ...bodyResult.data,
          githubRepo,
        }
      );

      res.status(201).json({ environment });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new InputError(error.message);
      }
      throw error;
    }
  });

  // PUT /environments/:componentName/:environmentName - Update environment
  router.put('/environments/:componentName/:environmentName', async (req, res) => {
    const componentNameResult = componentNameSchema.safeParse(req.params.componentName);
    if (!componentNameResult.success) {
      throw new InputError(`Invalid component name: ${componentNameResult.error.message}`);
    }

    const environmentNameResult = environmentNameSchema.safeParse(req.params.environmentName);
    if (!environmentNameResult.success) {
      throw new InputError(`Invalid environment name: ${environmentNameResult.error.message}`);
    }

    const bodyResult = updateEnvironmentSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new InputError(`Invalid request body: ${bodyResult.error.message}`);
    }

    try {
      const environment = await environmentStorageService.updateEnvironment(
        componentNameResult.data,
        environmentNameResult.data,
        bodyResult.data
      );

      res.json({ environment });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundError(error.message);
      }
      throw error;
    }
  });

  // DELETE /environments/:componentName/:environmentName - Delete environment
  router.delete('/environments/:componentName/:environmentName', async (req, res) => {
    const componentNameResult = componentNameSchema.safeParse(req.params.componentName);
    if (!componentNameResult.success) {
      throw new InputError(`Invalid component name: ${componentNameResult.error.message}`);
    }

    const environmentNameResult = environmentNameSchema.safeParse(req.params.environmentName);
    if (!environmentNameResult.success) {
      throw new InputError(`Invalid environment name: ${environmentNameResult.error.message}`);
    }

    const deleted = await environmentStorageService.deleteEnvironment(
      componentNameResult.data,
      environmentNameResult.data
    );

    if (!deleted) {
      throw new NotFoundError(
        `Environment '${environmentNameResult.data}' not found for component '${componentNameResult.data}'`
      );
    }

    res.status(204).send();
  });

  return router;
}
