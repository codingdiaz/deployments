import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';
import {
  githubAuthApiRef,
  discoveryApiRef,
  oauthRequestApiRef,
} from '@backstage/core-plugin-api';
import { GithubAuth } from '@backstage/core-app-api';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: githubAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi }) =>
      GithubAuth.create({
        discoveryApi,
        oauthRequestApi,
        // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
        defaultScopes: [
          'read:user',
          'repo',
          'repo:status',
          'repo_deployment',
          'security_events',
        ],
      }),
  }),
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
];
