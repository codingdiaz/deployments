# Backstage Deployment Plugin

The Backstage Deployment Plugin provides a unified interface for managing deployments across GitHub Actions workflows. It allows teams to configure, monitor, and manage deployments directly from Backstage.

## Features

- 🚀 **Deployment Management**: Configure and manage deployment environments for your applications
- 📊 **Status Monitoring**: Real-time deployment status tracking with visual indicators
- 📈 **Deployment History**: Complete history of deployments with timestamps, versions, and links to workflow runs
- 🔐 **GitHub Integration**: Seamless integration with GitHub OAuth and Actions workflows
- 🎯 **Environment Configuration**: Easy setup of staging, production, and custom environments
- 🔄 **Retry & Recovery**: Built-in error handling with retry functionality for failed operations

## Prerequisites

Before installing the Deployment Plugin, ensure you have:

1. **Backstage > v1.41.0+** with the new backend system
2. **GitHub OAuth** set up for user authentication

## Installation

### 1. Install the Plugin Packages

From your Backstage root directory:

```bash
# Install frontend plugin
yarn --cwd packages/app add @internal/plugin-deployments

# Install backend plugin
yarn --cwd packages/backend add @internal/plugin-deployments-backend
```

### 2. Add Frontend Plugin to Your App

In `packages/app/src/App.tsx`, add the plugin route:

```typescript
import { DeploymentsPage } from '@internal/plugin-deployments';

// Add to your route definitions
<Route path="/deployments" element={<DeploymentsPage />} />;
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
<SidebarItem icon={DeploymentIcon} to="deployments" text="Deployments" />;
```

### 5. Configure GitHub Integration

Ensure your `app-config.yaml` includes GitHub integration:

```yaml
auth:
  providers:
    github:
      development:
        clientId: ${GITHUB_CLIENT_ID}
        clientSecret: ${GITHUB_CLIENT_SECRET}
```

TODO: describe how to update scopes for GitHub OAuth in `packages/app/src/apis.ts`

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
    backstage.io/deployment-enabled: 'true'
    # Optional: Specify GitHub repository
    # TODO: isn't this already going to come through, should just switch to github source annotation
    backstage.io/source-location: 'url:https://github.com/myorg/my-application'
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
   - **Workflow Path (optional)**: Path to your GitHub Actions workflow file (e.g., ".github/workflows/deploy.yml")

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
