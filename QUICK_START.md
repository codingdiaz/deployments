# Quick Start Guide - Backstage Deployment Plugin

This guide helps you get started with the Backstage Deployment Plugin in under 10 minutes.

## Prerequisites Checklist

Before you begin, ensure you have:

- ✅ Backstage instance running (v1.41.0+)
- ✅ GitHub account with repository access
- ✅ GitHub Personal Access Token with `repo` and `workflow` scopes
- ✅ A repository with GitHub Actions workflows

## Step 1: Enable Your Application (2 minutes)

Add the deployment annotation to your component's `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-app
  annotations:
    backstage.io/deployment-enabled: "true"
    backstage.io/source-location: "url:https://github.com/your-org/my-app"
spec:
  type: service
  lifecycle: production
  owner: your-team
```

Commit and push this change to trigger catalog ingestion.

## Step 2: Access the Plugin (1 minute)

1. Navigate to your Backstage instance
2. Go to `/deployments` or click "Deployments" in the sidebar
3. You should see your application listed

## Step 3: Configure Your First Environment (3 minutes)

1. Click "View Deployments" on your application
2. Click "Add Environment"
3. Fill in the form:
   ```
   Environment Name: staging
   GitHub Repository: your-org/my-app
   Workflow Path: .github/workflows/deploy.yml
   Job Name: deploy
   GitHub Environment: (leave empty for now)
   ```
4. Click "Create Environment"

## Step 4: Verify Setup (2 minutes)

1. You should see your environment card showing "Idle" status
2. Click "View Details" to see the environment details page
3. The plugin will attempt to fetch deployment history from GitHub

## Sample GitHub Workflow

If you don't have a deployment workflow yet, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Application
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
        default: 'main'
      environment:
        description: 'Environment'
        required: true
        default: 'staging'

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
      
      - name: Deploy
        run: |
          echo "Deploying ${{ github.event.inputs.version }} to ${{ github.event.inputs.environment }}"
          # Add your deployment commands here
          sleep 30  # Simulate deployment time
          echo "Deployment complete!"
```

## Troubleshooting Quick Fixes

### "No applications found"
- Check that your `catalog-info.yaml` has `backstage.io/deployment-enabled: "true"`
- Wait a few minutes for catalog ingestion

### "GitHub authentication failed"
- Refresh the page to re-authenticate
- Check that your GitHub token has correct permissions

### "Workflow not found"
- Verify the workflow file exists at the specified path
- Check repository access permissions

## What's Next?

Now that you have basic setup working:

1. **Add Production Environment**: Create a production environment configuration
2. **Set Up Approvals**: Use GitHub environment protection rules
3. **Monitor Deployments**: Watch deployment history and status
4. **Add More Apps**: Configure additional applications

## Need Help?

- 📚 [Full Documentation](./plugins/deployments/README.md)
- 🔧 [Installation Guide](./INSTALLATION.md)
- 🐛 Check browser console and Backstage logs for errors

Happy deploying! 🚀