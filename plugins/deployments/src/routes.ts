import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'deployments',
});

export const applicationDeploymentRouteRef = createSubRouteRef({
  id: 'deployments.application',
  parent: rootRouteRef,
  path: '/:componentName',
});

export const environmentDetailsRouteRef = createSubRouteRef({
  id: 'deployments.environment',
  parent: rootRouteRef,
  path: '/:componentName/:environmentName',
});
