# Backstage Deployment Plugin - Backend

This is the backend component of the Backstage Deployment Plugin, providing REST API endpoints for managing deployment environment configurations and proxying GitHub API calls.

## Features

- 🔧 **Environment Configuration Management**: CRUD operations for deployment environments
- 🔐 **GitHub API Integration**: Secure proxy for GitHub Actions workflow data
- ✅ **Request Validation**: Zod-based input validation and error handling
- 💾 **In-Memory Storage**: Simple storage for environment configurations (MVP)
- 🔄 **Error Handling**: Comprehensive error responses and logging

## Installation

### New Backend System (Recommended)

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

### Legacy Backend System

If you're using the legacy backend system, you'll need additional setup:

1. **Install the package**:
   ```bash
   yarn --cwd packages/backend add @internal/plugin-deployments-backend
   ```

2. **Create plugin file** `packages/backend/src/plugins/deployments.ts`:
   ```typescript
   import { createRouter } from '@internal/plugin-deployments-backend';
   import { Router } from 'express';
   import { PluginEnvironment } from '../types';

   export default async function createPlugin(
     env: PluginEnvironment,
   ): Promise<Router> {
     return await createRouter({
       httpAuth: env.httpAuth,
       environmentStorageService: env.environmentStorageService,
     });
   }
   ```

3. **Add to main router** in `packages/backend/src/index.ts`:
   ```typescript
   import deployments from './plugins/deployments';

   // Add to your API router setup
   apiRouter.use('/deployments', await deployments(pluginEnv));
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

### Storage

The MVP version uses in-memory storage for environment configurations. This means:

- ✅ **Fast access**: Configurations are stored in memory for quick retrieval
- ✅ **Simple setup**: No database configuration required
- ⚠️ **Not persistent**: Configurations are lost on server restart
- ⚠️ **Single instance**: Won't work with multiple backend instances

For production use, consider implementing a persistent storage backend.

## Data Validation

The backend uses Zod schemas for comprehensive input validation:

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

### API Testing

You can test the API endpoints using curl or any HTTP client:

```bash
# Create an environment
curl -X POST http://localhost:7007/api/deployments/environments/my-app \
  -H "Content-Type: application/json" \
  -d '{
    "environmentName": "staging",
    "githubRepo": "owner/repo",
    "workflowPath": ".github/workflows/deploy.yml",
    "jobName": "deploy"
  }'

# Get environments
curl http://localhost:7007/api/deployments/environments/my-app
```

## Architecture

### Plugin Structure

```
packages/backend/
└── src/
    ├── index.ts              # Plugin registration
    ├── plugin.ts             # Plugin definition
    ├── router.ts             # Express router setup
    ├── schemas/
    │   └── environment.ts    # Zod validation schemas
    └── services/
        └── EnvironmentStorageService/
            ├── types.ts      # Service interfaces
            ├── index.ts      # Service exports
            └── InMemoryEnvironmentStorageService.ts
```

### Service Architecture

The backend follows Backstage's service-oriented architecture:

1. **Router Layer**: Express routes with middleware
2. **Validation Layer**: Zod schema validation
3. **Service Layer**: Business logic and data access
4. **Storage Layer**: Data persistence (in-memory for MVP)

### Future Enhancements

Planned improvements for future versions:

- **Persistent Storage**: Database integration for production use
- **Authentication Integration**: Enhanced security with user permissions
- **Caching Layer**: Redis or memory caching for better performance
- **Deployment Triggering**: API endpoints for triggering deployments
- **Webhook Support**: GitHub webhook integration for real-time updates

## Troubleshooting

### Common Issues

#### Plugin Not Loading

Check that the plugin is properly registered in your backend:

```typescript
// In packages/backend/src/index.ts
backend.add(import('@internal/plugin-deployments-backend'));
```

#### API Endpoints Return 404

Verify the plugin is mounted correctly and check backend logs for errors.

#### Validation Errors

Check the request payload against the Zod schemas. The API returns detailed validation error messages.

### Debugging

Enable debug logging for the plugin:

```typescript
// In your backend configuration
logger: {
  level: 'debug',
  // ... other logger config
}
```

Check backend logs for plugin-specific messages.

## Dependencies

### Core Dependencies

- `@backstage/backend-plugin-api` - Backend plugin framework
- `@backstage/errors` - Standard error types
- `express` - Web framework
- `zod` - Schema validation

### Development Dependencies

- `@backstage/cli` - Build and development tools
- `supertest` - HTTP testing
- `@types/express` - TypeScript definitions

## Version Compatibility

| Backend Plugin | Backstage Version | Node.js | Notes |
|---------------|-------------------|---------|-------|
| 0.1.0         | 1.41.0+          | 20, 22  | Initial release |

## Contributing

When contributing to the backend plugin:

1. Follow Backstage's backend plugin conventions
2. Add tests for new functionality
3. Update schemas for new API endpoints
4. Document API changes in this README