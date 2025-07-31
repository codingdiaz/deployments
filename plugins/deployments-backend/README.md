# Backstage Deployment Plugin - Backend

This is the backend component of the Backstage Deployment Plugin, providing REST API endpoints for managing deployment environment configurations. It's used to enroll a GitHub environment into the deployments plugin for a component and optionally store data on which GitHub workflow a user wants to trigger to start a deployment for that environment.

## Installation

Add the plugin to your Backstage backend:

```bash
# Install the package
yarn --cwd packages/backend add @internal/plugin-deployments-backend
```

Then add it to your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the deployments backend plugin
backend.add(import('@internal/plugin-deployments-backend'));

backend.start();
```

## API Endpoints

The backend provides the following REST API endpoints:

### Environment Configuration

```http
# Get all environments for a component
GET /api/deployments/environments/:componentName

# Create new environment
POST /api/deployments/environments/:componentName
Content-Type: application/json
{
  "environmentName": "staging",
  "githubRepo": "owner/repo",
  "workflowPath": ".github/workflows/deploy.yml",
  "jobName": "deploy",
  "githubEnvironment": "staging"
}

# Update environment
PUT /api/deployments/environments/:componentName/:environmentName
Content-Type: application/json
{
  "githubRepo": "owner/repo",
  "workflowPath": ".github/workflows/deploy.yml",
  "jobName": "deploy"
}

# Delete environment
DELETE /api/deployments/environments/:componentName/:environmentName
```

### Response Format

All endpoints return JSON responses with consistent error handling:

```typescript
// Success Response
{
  "environment": {
    "id": "uuid",
    "componentName": "my-app",
    "environmentName": "staging",
    "githubRepo": "owner/repo",
    "workflowPath": ".github/workflows/deploy.yml",
    "jobName": "deploy",
    "githubEnvironment": "staging",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}

// Error Response
{
  "error": {
    "message": "Environment not found",
    "code": "NOT_FOUND",
    "details": {}
  }
}
```

## Configuration

The backend plugin requires minimal configuration and integrates with Backstage's standard service dependencies:

### Dependencies

- **HTTP Auth Service**: For request authentication
- **Logger**: For structured logging
- **Config**: For accessing Backstage configuration

### Environment Creation Schema

```typescript
{
  environmentName: string,      // Required, 1-50 characters
  githubRepo: string,          // Required, format: "owner/repo"
  workflowPath: string,        // Required, must start with ".github/workflows/"
  jobName: string,             // Required, 1-100 characters
  githubEnvironment?: string   // Optional, 1-100 characters
}
```

### Environment Update Schema

```typescript
{
  githubRepo?: string,         // Optional, format: "owner/repo"
  workflowPath?: string,       // Optional, must start with ".github/workflows/"
  jobName?: string,            // Optional, 1-100 characters
  githubEnvironment?: string   // Optional, 1-100 characters
}
```

## Error Handling

The backend provides detailed error responses for common scenarios:

- **400 Bad Request**: Invalid input data, validation errors
- **404 Not Found**: Environment or component not found
- **409 Conflict**: Environment name already exists for component
- **500 Internal Server Error**: Unexpected server errors

## Development

### Running in Development

Start the backend plugin in development mode:

```bash
# From the plugin directory
cd plugins/deployments-backend
yarn start

# Or from the root directory
yarn --cwd plugins/deployments-backend start
```

This starts a standalone backend server on port 7007 with hot reload.

### Testing

Run the test suite:

```bash
# Unit tests
yarn test

# Test with coverage
yarn test --coverage

# Watch mode for development
yarn test --watch
```
