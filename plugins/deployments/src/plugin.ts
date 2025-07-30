import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { 
  rootRouteRef, 
  applicationDeploymentRouteRef, 
  environmentDetailsRouteRef 
} from './routes';

export const deploymentsPlugin = createPlugin({
  id: 'deployments',
  routes: {
    root: rootRouteRef,
    applicationDeployment: applicationDeploymentRouteRef,
    environmentDetails: environmentDetailsRouteRef,
  },
});

export const DeploymentsPage = deploymentsPlugin.provide(
  createRoutableExtension({
    name: 'DeploymentsPage',
    component: () =>
      import('./components/Router').then(m => m.Router),
    mountPoint: rootRouteRef,
  }),
);
