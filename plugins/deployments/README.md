# Backstage Deployment Plugin

The Backstage Deployment Plugin provides a unified interface for managing deployments across GitHub Actions workflows. It allows teams to configure, monitor, and manage deployments directly from their Backstage developer portal.

## Features

- 🚀 **Deployment Management**: Configure and manage deployment environments for your applications
- 📊 **Status Monitoring**: Real-time deployment status tracking with visual indicators
- 📈 **Deployment History**: Complete history of deployments with timestamps, versions, and links to workflow runs
- 🔐 **GitHub Integration**: Seamless integration with GitHub OAuth and Actions workflows
- 🎯 **Environment Configuration**: Easy setup of staging, production, and custom environments
- 🔄 **Retry & Recovery**: Built-in error handling with retry functionality for failed operations

## Prerequisites

Before installing the Deployment Plugin, ensure you have:

1. **Backstage v1.41.0+** with the new backend system
2. **GitHub Integration** configured in your Backstage instance
3. **GitHub OAuth** set up for user authentication
4. **GitHub Personal Access Token** with appropriate permissions

### GitHub Token Permissions

Your GitHub token needs the following scopes:
- `repo` - For accessing private repositories
- `workflow` - For triggering workflow_dispatch events
- `read:org` - For reading organization information (if using organization repositories)

## Installation

### 1. Install the Plugin Packages

From your Backstage root directory:

```bash
# Install frontend plugin
yarn --cwd packages/app add @internal/plugin-deployments

# Install backend plugin
yarn --cwd packages/backend add @internal/plugin-deployments-backend

# Install common types (if not automatically installed)
yarn add @internal/plugin-deployments-common
```

### 2. Add Frontend Plugin to Your App

In `packages/app/src/App.tsx`, add the plugin route:

```typescript
import { DeploymentsPage } from '@internal/plugin-deployments';

// Add to your route definitions
<Route path="/deployments" element={<DeploymentsPage />} />
```

### 3. Add Backend Plugin

In `packages/backend/src/index.ts`, add the backend plugin:

```typescript
const backend = createBackend();

// ... other plugins

// Add the deployments backend plugin
backend.add(import('@internal/plugin-deployments-backend'));

backend.start();
```

### 4. Add Navigation Item

In `packages/app/src/components/Root/Root.tsx`, add a navigation item:

```typescript
import { DeploymentIcon } from '@internal/plugin-deployments';

// Add to your sidebar
<SidebarItem icon={DeploymentIcon} to="deployments" text="Deployments" />
```

### 5. Configure GitHub Integration

Ensure your `app-config.yaml` includes GitHub integration:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

auth:
  providers:
    github:
      development:
        clientId: ${GITHUB_CLIENT_ID}
        clientSecret: ${GITHUB_CLIENT_SECRET}
```

## Getting Started

### 1. Register Applications for Deployment

To enable deployment management for a component, add annotations to your `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-application
  description: My awesome application
  annotations:
    # Required: Enable deployment management
    backstage.io/deployment-enabled: "true"
    # Optional: Specify GitHub repository
    backstage.io/source-location: "url:https://github.com/myorg/my-application"
spec:
  type: service
  lifecycle: production
  owner: team-awesome
```

### 2. Access the Deployment Plugin

1. Navigate to `/deployments` in your Backstage instance
2. You'll see a list of all applications with deployment management enabled
3. Click "View Deployments" on any application to start configuration

### 3. Configure Your First Environment

1. Click "Add Environment" on your application's deployment page
2. Fill in the environment details:
   - **Environment Name**: e.g., "staging", "production"
   - **GitHub Repository**: Format: "owner/repository-name"
   - **Workflow Path**: Path to your GitHub Actions workflow file (e.g., ".github/workflows/deploy.yml")
   - **Job Name**: Specific job within the workflow to monitor
   - **GitHub Environment** (Optional): For protection rules and approvals

3. Click "Create Environment"

### 4. Monitor Deployments

Once configured, you can:
- View real-time deployment status on environment cards
- Click "View Details" to see deployment history
- Access GitHub workflow runs directly from the interface
- Monitor deployment duration and success rates

## Usage Guide

### Environment Configuration

Each environment represents a deployment target with these properties:

- **Environment Name**: Human-readable name (staging, production, test, etc.)
- **GitHub Repository**: The repository containing your deployment workflows
- **Workflow Path**: Path to the GitHub Actions workflow file that handles deployments
- **Job Name**: Specific job within the workflow to monitor (useful for workflows with multiple jobs)
- **GitHub Environment**: Optional GitHub environment name for protection rules

### Deployment Status Indicators

The plugin displays deployment status with visual indicators:

- 🟢 **Success**: Deployment completed successfully
- 🔴 **Failed**: Deployment failed
- 🟡 **Running**: Deployment currently in progress
- ⚫ **Cancelled**: Deployment was cancelled
- ⚪ **Idle**: No recent deployments

### Viewing Deployment History

The deployment history page shows:
- **Version**: The version/commit that was deployed
- **Status**: Visual status indicator
- **Started/Completed**: Timestamps for deployment timing
- **Duration**: How long the deployment took
- **Triggered By**: Who initiated the deployment
- **Actions**: Direct links to GitHub workflow runs

## Troubleshooting

### Common Issues

#### "No applications found"
- Ensure your components have the `backstage.io/deployment-enabled: "true"` annotation
- Check that your catalog is properly ingesting your `catalog-info.yaml` files

#### "GitHub authentication failed"
- Verify your GitHub token has the required permissions
- Check that GitHub OAuth is properly configured in your `app-config.yaml`
- Try refreshing the page to re-authenticate

#### "Workflow not found"
- Verify the workflow path is correct (e.g., ".github/workflows/deploy.yml")
- Ensure the workflow file exists in your repository
- Check that your GitHub token has access to the repository

#### "Rate limit exceeded"
- GitHub API has rate limits. Wait for the reset time shown in the error
- Consider using a GitHub App instead of a personal access token for higher rate limits

#### "Insufficient permissions"
- Ensure your GitHub token has `repo` and `workflow` scopes
- Verify you have access to the specified repository
- Check that the repository is not archived or deleted

### Getting Help

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify your GitHub token permissions and configuration
3. Ensure your workflow files are properly formatted and accessible
4. Check Backstage logs for backend-related issues

## Advanced Configuration

### Custom Workflow Integration

The plugin works with any GitHub Actions workflow that:
- Can be triggered manually (has `workflow_dispatch` trigger)
- Accepts version/environment parameters
- Reports status through standard GitHub Actions status

Example workflow structure:
```yaml
name: Deploy Application
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
      environment:
        description: 'Environment to deploy to'
        required: true

jobs:
  deploy:
    name: Deploy to Environment
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      # Your deployment steps here
```

### Environment Protection Rules

When using GitHub Environments with protection rules:
1. Set the `githubEnvironment` field to match your GitHub environment name
2. The plugin will respect approval requirements and show pending status
3. Manual approvals can be handled directly in GitHub

### Multiple Repository Support

You can configure environments that deploy from different repositories:
- Each environment can specify its own `githubRepo`
- Useful for microservices or multi-repo architectures
- The plugin will track deployments across all configured repositories

## Security Considerations

- **Token Security**: Never commit GitHub tokens to your repository
- **Permissions**: Follow the principle of least privilege for GitHub tokens
- **Environment Secrets**: Use GitHub environment secrets for production deployments
- **Approval Workflows**: Enable protection rules for production environments

## Support

For issues and feature requests, please contact your Backstage administrator or check your organization's internal documentation for support channels.