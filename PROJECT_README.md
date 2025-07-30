# Backstage Deployment Plugin

A comprehensive Backstage plugin for managing deployments across GitHub Actions workflows. This plugin provides a unified interface for configuring, monitoring, and managing deployments directly from your Backstage developer portal.

## 🚀 Features

- **🎯 Environment Management**: Configure staging, production, and custom deployment environments
- **📊 Real-time Monitoring**: Track deployment status with visual indicators and real-time updates
- **📈 Deployment History**: Complete audit trail with timestamps, versions, and workflow links
- **🔐 GitHub Integration**: Seamless OAuth integration with GitHub Actions workflows
- **🔄 Error Recovery**: Built-in retry functionality and comprehensive error handling
- **⚡ Performance**: Optimized loading states and efficient API caching
- **🎨 Native UI**: Follows Backstage design patterns for consistent user experience

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [User Guide](#user-guide)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)
- [Support](#support)

## 🚀 Quick Start

**Want to get started immediately?** Follow our [Quick Start Guide](./QUICK_START.md) to have the plugin running in under 10 minutes.

### Prerequisites

- Backstage v1.41.0+ with new backend system
- GitHub account with repository access
- GitHub Personal Access Token with `repo` and `workflow` scopes

### Quick Install

```bash
# Install packages
yarn --cwd packages/app add @internal/plugin-deployments
yarn --cwd packages/backend add @internal/plugin-deployments-backend

# Add to backend (packages/backend/src/index.ts)
backend.add(import('@internal/plugin-deployments-backend'));

# Add route (packages/app/src/App.tsx)
<Route path="/deployments" element={<DeploymentsPage />} />
```

### Enable Your App

Add to your `catalog-info.yaml`:

```yaml
metadata:
  annotations:
    backstage.io/deployment-enabled: "true"
```

Visit `/deployments` in your Backstage instance to start configuring!

## 📦 Installation

For detailed installation instructions, see our [Installation Guide](./INSTALLATION.md).

### System Requirements

- **Backstage**: v1.41.0+
- **Node.js**: v20 or v22
- **Yarn**: v4.4.1 (Berry)
- **GitHub**: Account with repository access

### Package Overview

This plugin consists of three packages:

| Package | Purpose | Installation |
|---------|---------|--------------|
| `@internal/plugin-deployments` | Frontend UI components | `packages/app` |
| `@internal/plugin-deployments-backend` | REST API and services | `packages/backend` |
| `@internal/plugin-deployments-common` | Shared types and utilities | Auto-installed |

## 📖 User Guide

### Getting Started

1. **Enable Applications**: Add the `backstage.io/deployment-enabled: "true"` annotation
2. **Configure Environments**: Set up staging and production environments
3. **Monitor Deployments**: Track status and view deployment history
4. **Manage Workflows**: Connect to your GitHub Actions workflows

### Core Concepts

#### Applications
Any Backstage component with the deployment annotation enabled. These appear in the main deployments list.

#### Environments
Deployment targets (staging, production, etc.) configured with:
- GitHub repository and workflow details
- Specific job monitoring within workflows
- Optional GitHub environment for protection rules

#### Deployment Status
Real-time status tracking with visual indicators:
- 🟢 Success - Deployment completed successfully
- 🔴 Failed - Deployment encountered errors
- 🟡 Running - Deployment currently in progress
- ⚫ Cancelled - Deployment was cancelled
- ⚪ Idle - No recent deployment activity

### User Workflows

#### Setting Up a New Environment

1. Navigate to `/deployments`
2. Click "View Deployments" on your application
3. Click "Add Environment"
4. Configure environment details:
   - Environment name (e.g., "staging")
   - GitHub repository ("owner/repo")
   - Workflow path (".github/workflows/deploy.yml")
   - Job name ("deploy")
   - GitHub environment (optional)

#### Monitoring Deployments

1. View environment cards for status overview
2. Click "View Details" for deployment history
3. Access GitHub workflow runs directly
4. Monitor deployment duration and success rates

#### Troubleshooting Issues

The plugin provides comprehensive error handling:
- Clear error messages with suggested actions
- Retry functionality for transient failures
- Links to relevant GitHub resources
- Detailed error information for debugging

## 🏗️ Architecture

### Plugin Structure

```
backstage-deployment-plugin/
├── plugins/
│   ├── deployments/              # Frontend React components
│   ├── deployments-backend/      # Backend API and services
│   └── deployments-common/       # Shared TypeScript types
├── INSTALLATION.md               # Detailed installation guide
├── QUICK_START.md               # 10-minute setup guide
└── README.md                    # This file
```

### Frontend Architecture

- **React Components**: Built with Material-UI and Backstage design system
- **State Management**: React hooks for local state and API integration
- **Routing**: React Router for navigation between pages
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Skeleton components for better user experience

### Backend Architecture

- **Express Router**: RESTful API endpoints
- **Zod Validation**: Request/response schema validation
- **Service Layer**: Business logic separation
- **Storage**: In-memory storage for MVP (extensible to databases)
- **Error Handling**: Structured error responses

### GitHub Integration

- **OAuth Authentication**: Uses Backstage's GitHub OAuth provider
- **API Integration**: Direct GitHub API calls from frontend
- **Workflow Monitoring**: Real-time status from GitHub Actions
- **Permission Respect**: Honors user's GitHub repository access

## 📚 API Documentation

### Frontend Routes

- `/deployments` - Main applications list
- `/deployments/:componentName` - Application deployment dashboard
- `/deployments/:componentName/:environmentName` - Environment details

### Backend Endpoints

#### Environment Management

```http
GET    /api/deployments/environments/:componentName
POST   /api/deployments/environments/:componentName
PUT    /api/deployments/environments/:componentName/:environmentName
DELETE /api/deployments/environments/:componentName/:environmentName
```

#### Request/Response Examples

**Create Environment:**
```json
POST /api/deployments/environments/my-app
{
  "environmentName": "staging",
  "githubRepo": "owner/repo",
  "workflowPath": ".github/workflows/deploy.yml",
  "jobName": "deploy"
}
```

**Response:**
```json
{
  "environment": {
    "id": "uuid-here",
    "componentName": "my-app",
    "environmentName": "staging",
    "githubRepo": "owner/repo",
    "workflowPath": ".github/workflows/deploy.yml",
    "jobName": "deploy",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

## 🛠️ Development

### Prerequisites

- Node.js v20 or v22
- Yarn v4.4.1
- Git

### Setup Development Environment

```bash
# Clone and install
git clone <repository-url>
cd backstage-deployment-plugin
yarn install

# Start development servers
yarn dev

# Run tests
yarn test

# Type checking
yarn tsc

# Linting
yarn lint
```

### Plugin Development

```bash
# Frontend development (with hot reload)
yarn --cwd plugins/deployments start

# Backend development (with hot reload)
yarn --cwd plugins/deployments-backend start

# Run specific package tests
yarn --cwd plugins/deployments test
yarn --cwd plugins/deployments-backend test
```

### Testing

The plugin includes comprehensive test suites:

- **Unit Tests**: Component and service logic testing
- **Integration Tests**: API endpoint testing
- **Error Scenario Tests**: Error handling validation
- **TypeScript Tests**: Type safety verification

```bash
# Run all tests
yarn test

# Test with coverage
yarn test --coverage

# Run specific test files
yarn test EnvironmentDetailsPage
```

### Code Quality

```bash
# Type checking
yarn tsc

# Linting
yarn lint

# Auto-fix linting issues
yarn lint --fix

# Formatting
yarn prettier:check
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

### Development Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** your changes with tests
4. **Ensure** all tests pass
5. **Submit** a pull request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **Testing**: Comprehensive test coverage required
- **Documentation**: Update docs for user-facing changes
- **Backstage Conventions**: Follow Backstage plugin patterns

### Submitting Changes

- Include tests for new functionality
- Update documentation as needed
- Follow semantic commit messages
- Ensure CI passes

## 📞 Support

### Getting Help

1. **Documentation**: Check this README and installation guides
2. **Troubleshooting**: See common issues in installation guide
3. **Logs**: Check browser console and Backstage backend logs
4. **GitHub**: Open issues for bugs or feature requests

### Common Issues

- **Installation Problems**: See [Installation Guide](./INSTALLATION.md)
- **GitHub Authentication**: Verify token permissions and OAuth setup
- **Component Discovery**: Check catalog annotations and ingestion
- **API Errors**: Verify backend plugin installation and GitHub access

### Reporting Issues

When reporting issues, please include:

- Backstage version
- Plugin version
- Error messages and logs
- Steps to reproduce
- Expected vs. actual behavior

## 📄 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Backstage Team**: For the amazing developer portal platform
- **Material-UI**: For the component library
- **GitHub**: For the robust Actions and API platform
- **Community**: For feedback and contributions

---

**Ready to get started?** 🚀

👉 [Quick Start Guide](./QUICK_START.md) - Get running in 10 minutes  
📖 [Installation Guide](./INSTALLATION.md) - Detailed setup instructions  
📚 [Frontend Documentation](./plugins/deployments/README.md) - User guide and features  
🔧 [Backend Documentation](./plugins/deployments-backend/README.md) - API and development