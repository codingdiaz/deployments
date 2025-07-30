# Backstage Deployment Plugin - Installation Guide

This guide provides step-by-step instructions for installing and configuring the Backstage Deployment Plugin in your Backstage instance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

## Prerequisites

### System Requirements

- **Backstage**: v1.41.0 or higher with the new backend system
- **Node.js**: v20 or v22 (as specified in package.json engines)
- **Yarn**: v4.4.1 (Berry) with workspaces
- **GitHub Account**: With repositories containing GitHub Actions workflows

### Required Backstage Plugins

Ensure these core Backstage plugins are installed and configured:

- `@backstage/plugin-catalog` - For component discovery
- `@backstage/plugin-github-auth` - For GitHub OAuth authentication
- GitHub integration in `app-config.yaml`

### GitHub Setup

1. **GitHub Personal Access Token**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create a new token with these scopes:
     - `repo` - Full repository access
     - `workflow` - Update GitHub Actions workflows
     - `read:org` - Read organization membership (if using org repos)

2. **GitHub OAuth App** (for user authentication)
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App with:
     - Homepage URL: `http://localhost:3000` (adjust for your domain)
     - Authorization callback URL: `http://localhost:3000/api/auth/github/handler/frame`

## Installation Steps

### Step 1: Install Plugin Packages

From your Backstage root directory:

```bash
# Install all three plugin packages
yarn --cwd packages/app add @internal/plugin-deployments
yarn --cwd packages/backend add @internal/plugin-deployments-backend
yarn add @internal/plugin-deployments-common

# Verify installation
yarn install
```

### Step 2: Configure Frontend

#### Add Route Configuration

Edit `packages/app/src/App.tsx`:

```typescript
import { Route } from 'react-router-dom';
import { DeploymentsPage } from '@internal/plugin-deployments';

// In your <FlatRoutes> component, add:
const AppRoutes = () => (
  <FlatRoutes>
    {/* ... existing routes ... */}
    <Route path="/deployments" element={<DeploymentsPage />} />
    <Route path="/deployments/*" element={<DeploymentsPage />} />
  </FlatRoutes>
);
```

#### Add Navigation Item

Edit `packages/app/src/components/Root/Root.tsx`:

```typescript
import {
  SidebarItem,
  SidebarDivider,
  SidebarSpace,
} from '@backstage/core-components';
import RocketLaunchIcon from '@material-ui/icons/RocketLaunch';

// Add to your sidebar navigation:
<SidebarItem icon={RocketLaunchIcon} to="deployments" text="Deployments" />
```

#### Add API Bindings (if needed)

Edit `packages/app/src/apis.ts` if you need to override default API implementations:

```typescript
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import { GithubAuth } from '@backstage/core-app-api';

export const apis: AnyApiFactory[] = [
  // ... existing APIs ...
  
  // GitHub Auth API (usually already configured)
  createApiFactory({
    api: githubAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      GithubAuth.create({
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'github',
          title: 'GitHub',
          icon: () => null,
        },
      }),
  }),
];
```

### Step 3: Configure Backend

#### Add Backend Plugin

Edit `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... existing plugin registrations ...

// Add the deployments backend plugin
backend.add(import('@internal/plugin-deployments-backend'));

backend.start();
```

#### Configure Backend Dependencies (if using old backend)

If you're still using the old backend system, edit `packages/backend/src/plugins/deployments.ts`:

```typescript
import { createRouter } from '@internal/plugin-deployments-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    httpAuth: env.httpAuth,
    config: env.config,
  });
}
```

And add to `packages/backend/src/index.ts`:

```typescript
import deployments from './plugins/deployments';

// Add to your route setup
apiRouter.use('/deployments', await deployments(env));
```

### Step 4: Configure GitHub Integration

#### Update app-config.yaml

Add or update your GitHub configuration:

```yaml
# GitHub Integration
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
      
    # For GitHub Enterprise (optional)
    # - host: github.enterprise.com
    #   apiBaseUrl: https://github.enterprise.com/api/v3
    #   token: ${GHE_TOKEN}

# GitHub OAuth Provider
auth:
  environment: development
  providers:
    github:
      development:
        clientId: ${GITHUB_CLIENT_ID}
        clientSecret: ${GITHUB_CLIENT_SECRET}
        ## uncomment if using GitHub Enterprise
        # enterpriseInstanceUrl: https://github.enterprise.com

# Backend CORS for GitHub API calls
backend:
  cors:
    origin: http://localhost:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true
  csp:
    connect-src: ["'self'", 'http:', 'https:', 'https://api.github.com']
```

#### Set Environment Variables

Create a `.env` file in your Backstage root directory:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret

# For GitHub Enterprise (if applicable)
# GHE_TOKEN=your_enterprise_token
```

**⚠️ Important**: Never commit these tokens to version control. Add `.env` to your `.gitignore`.

### Step 5: Build and Test

```bash
# Clean build
yarn clean

# Install dependencies
yarn install

# Build all packages
yarn build:all

# Type check
yarn tsc

# Run tests
yarn test

# Start in development mode
yarn dev
```

## Configuration

### Catalog Component Setup

For each application you want to manage deployments for, add annotations to the `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  description: My awesome microservice
  annotations:
    # Required: Enable deployment management
    backstage.io/deployment-enabled: "true"
    
    # Optional but recommended: Link to source repository
    backstage.io/source-location: "url:https://github.com/myorg/my-service"
    
    # Optional: Additional metadata
    github.com/project-slug: myorg/my-service
    
spec:
  type: service
  lifecycle: production
  owner: team-backend
  system: my-system
```

### GitHub Actions Workflow Requirements

Your GitHub Actions workflows should follow this pattern for best compatibility:

```yaml
name: Deploy Service
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (tag or commit SHA)'
        required: true
        default: 'main'
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    name: Deploy to ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
          
      - name: Deploy
        run: |
          echo "Deploying version ${{ github.event.inputs.version }} to ${{ github.event.inputs.environment }}"
          # Your deployment logic here
```

## Verification

### 1. Check Plugin Loading

1. Start your Backstage instance: `yarn dev`
2. Navigate to `http://localhost:3000/deployments`
3. You should see the Deployments page

### 2. Verify GitHub Authentication

1. Click on any GitHub-related feature
2. You should be prompted to authenticate with GitHub OAuth
3. After authentication, GitHub API calls should work

### 3. Test Environment Configuration

1. Find an application with the deployment annotation
2. Click "View Deployments"
3. Try adding a new environment configuration
4. Verify that the form accepts and saves the configuration

### 4. Check Error Handling

1. Try accessing a non-existent repository
2. Verify that error messages are user-friendly
3. Check that retry functionality works

## Troubleshooting

### Common Installation Issues

#### Plugin Not Loading

**Symptoms**: Navigation item doesn't appear, route returns 404

**Solutions**:
- Verify package installation: `yarn list @internal/plugin-deployments`
- Check route configuration in `App.tsx`
- Restart development server: `yarn dev`
- Check browser console for JavaScript errors

#### GitHub Authentication Failed

**Symptoms**: "Authentication failed" errors

**Solutions**:
1. Verify environment variables are set correctly
2. Check GitHub OAuth app configuration
3. Ensure callback URL is correct: `http://localhost:3000/api/auth/github/handler/frame`
4. Verify GitHub token has required scopes

#### Backend Plugin Not Starting

**Symptoms**: API calls to `/api/deployments/*` fail

**Solutions**:
1. Check backend logs for error messages
2. Verify backend plugin is added to `index.ts`
3. Ensure all dependencies are installed
4. Check backend build: `yarn build:backend`

#### Components Not Appearing

**Symptoms**: "No applications found" message

**Solutions**:
1. Verify component annotations in `catalog-info.yaml`
2. Check catalog ingestion: navigate to `/catalog`
3. Ensure annotation key is exactly: `backstage.io/deployment-enabled: "true"`
4. Force catalog refresh if needed

### Performance Issues

#### Slow GitHub API Calls

**Solutions**:
- Check network connectivity to GitHub
- Verify rate limiting isn't exceeded
- Consider implementing request caching
- Use GitHub Apps instead of personal tokens for higher rate limits

#### Memory Usage

**Solutions**:
- Monitor backend memory usage
- Implement cache cleanup for old deployment data
- Adjust cache TTL settings in configuration

### Log Analysis

#### Frontend Logs
- Open browser Developer Tools > Console
- Look for error messages related to the plugin
- Check network tab for failed API calls

#### Backend Logs
- Check Backstage backend logs
- Look for plugin-specific error messages
- Enable debug logging if needed

## Next Steps

After successful installation:

1. **Add More Applications**: Add the deployment annotation to more components
2. **Configure Environments**: Set up staging and production environments
3. **Team Training**: Train your teams on using the deployment interface
4. **Monitor Usage**: Track deployment success rates and identify patterns
5. **Advanced Features**: Explore GitHub environment protection rules and approval workflows

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [main README](./plugins/deployments/README.md) for usage guidance
2. Review Backstage logs for error details
3. Verify GitHub permissions and configuration
4. Test with a simple workflow first
5. Contact your Backstage administrator for organization-specific help

## Version Compatibility

| Plugin Version | Backstage Version | GitHub Actions | Notes |
|---------------|-------------------|----------------|-------|
| 0.1.0         | 1.41.0+          | Any           | Initial release |

## Security Notes

- Store GitHub tokens securely using environment variables
- Use GitHub environment protection rules for production deployments
- Regularly rotate GitHub tokens
- Monitor GitHub audit logs for deployment activities
- Follow your organization's security policies for CI/CD access