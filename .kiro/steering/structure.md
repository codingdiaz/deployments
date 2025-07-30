# Project Structure

## Root Level Organization
```
├── packages/           # Core Backstage application packages
├── plugins/           # Custom plugin development
├── examples/          # Sample entities and templates
├── app-config*.yaml   # Backstage configuration files
└── backstage.json     # Backstage version lock
```

## Workspace Structure
This is a **Yarn workspaces** monorepo with two main workspace directories:
- `packages/*` - Core application packages
- `plugins/*` - Custom plugin packages

## Core Packages (`packages/`)

### `packages/app/` - Frontend Application
- **Role**: `frontend` 
- React application with Backstage UI
- Contains routing, components, and app configuration
- Key files:
  - `src/App.tsx` - Main app component
  - `src/components/` - Custom React components
  - `public/` - Static assets and HTML template

### `packages/backend/` - Backend Service
- **Role**: `backend`
- Express.js server with Backstage backend plugins
- Handles API routes, authentication, and data processing
- Key files:
  - `src/index.ts` - Backend entry point
  - `Dockerfile` - Container configuration

## Custom Plugins (`plugins/`)

### Plugin Architecture Pattern
Each plugin follows a three-package structure:

1. **Frontend Plugin** (`plugins/deployments/`)
   - **Role**: `frontend-plugin`
   - React components and UI logic
   - Plugin ID: `deployments`

2. **Backend Plugin** (`plugins/deployments-backend/`)
   - **Role**: `backend-plugin` 
   - API routes and business logic
   - Express routers and services

3. **Common Library** (`plugins/deployments-common/`)
   - **Role**: `common-library`
   - Shared types, interfaces, and utilities
   - Used by both frontend and backend

## Configuration Files

### App Configuration
- `app-config.yaml` - Base configuration
- `app-config.local.yaml` - Local development overrides
- `app-config.production.yaml` - Production settings

### Build Configuration
- `tsconfig.json` - TypeScript configuration extending Backstage defaults
- `package.json` - Root workspace configuration
- `.eslintrc.js` - ESLint rules
- `playwright.config.ts` - E2E test configuration

## Naming Conventions
- **Internal packages**: Use `@internal/` scope (e.g., `@internal/plugin-deployments`)
- **Plugin IDs**: Use kebab-case matching the folder name
- **Workspace references**: Use `workspace:^` for internal dependencies
- **File structure**: Follow Backstage conventions with `src/`, `dev/`, and `dist/` directories

## Development Patterns
- Each package has its own `package.json` with Backstage role metadata
- Plugins export from `src/index.ts` as the main entry point
- Development utilities go in `dev/` directories
- Tests use `.test.ts` or `.test.tsx` extensions