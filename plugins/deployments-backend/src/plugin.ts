import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { createRouter } from './router';
import { DatabaseEnvironmentStorageService } from './services/EnvironmentStorageService';
import { initializeDatabase } from './services/database';

/**
 * deploymentsPlugin backend plugin
 *
 * @public
 */
export const deploymentsPlugin = createBackendPlugin({
  pluginId: 'deployments',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
        catalog: catalogServiceRef,
      },
      async init({ logger, auth, httpAuth, httpRouter, database, catalog }) {
        logger.info('Initializing deployments plugin');

        // Initialize database and apply migrations
        const db = await initializeDatabase(database);
        const environmentStorageService = new DatabaseEnvironmentStorageService(
          db,
        );

        httpRouter.use(
          await createRouter({
            auth,
            httpAuth,
            environmentStorageService,
            catalog,
          }),
        );

        logger.info('Deployments plugin initialized successfully');
      },
    });
  },
});
