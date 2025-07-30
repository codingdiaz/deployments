import { createDevApp } from '@backstage/dev-utils';
import { deploymentsPlugin, DeploymentsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(deploymentsPlugin)
  .addPage({
    element: <DeploymentsPage />,
    title: 'Root Page',
    path: '/deployments',
  })
  .render();
