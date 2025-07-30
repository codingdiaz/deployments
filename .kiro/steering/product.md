## Project Overview
Building a Backstage plugin that provides a unified view of deployments across different tools, starting with GitHub Actions. The plugin addresses the challenge of deployment visibility in medium to large organizations where teams use different deployment patterns.

## Current State

New Backstage repository with frontend, backend, and common plugin scaffolded
GitHub provider already installed
Ready for development

## Core Architecture

### Authentication Strategy

Use OAuth with user tokens (not service accounts)
Inherit user's existing GitHub permissions
Required GitHub scopes: repo (for private repos) and workflow (for workflow_dispatch)

### Configuration Model
Environment configuration stored server-side with these mappings:

App/service identifier
Environment name (staging, prod, etc.)
GitHub repository + workflow file path
Specific job within workflow (for targeting specific deployment jobs)
Optional GitHub environment (for protection rules/approvals)

## Primary Use Cases
1. Workflow Triggering

Manual deployment trigger via workflow_dispatch
Simple version selector (populated from GitHub tags or commits)
Standard contract: pass version, environment, and optional flags to workflow
UI should be clean interface over GitHub's clunky workflow dispatch

2. Pipeline Visualization

Show deployment pipeline status across multiple stages
Display approval gates (GitHub environment protection rules)
Show current deployment status per environment
Support workflows with manual approval steps between environments

3. Deployment History (Future)

Historical view of deployments
Rollback capabilities

## Technical Requirements
### Backend Plugin (backstage-plugin-deployment-backend)

Store environment configuration (JSON/lightweight DB)
Proxy GitHub API calls with user OAuth tokens
Handle token refresh flows
Endpoints needed:

GET/POST environment configurations
GET workflow runs and status
POST workflow dispatch triggers
GET deployment history
GET/POST approval actions



### Frontend Plugin (backstage-plugin-deployment)

Environment configuration UI (admin)
Deployment dashboard per service/app
Version selector component (tags/commits from GitHub)
Workflow trigger interface
Pipeline status visualization
Approval interface

### Common Package (backstage-plugin-deployment-common)

TypeScript types for configurations
API contracts between frontend/backend
Shared utilities

### GitHub API Integration
Key Endpoints to Use

/repos/{owner}/{repo}/actions/workflows - List workflows
/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches - Trigger workflow
/repos/{owner}/{repo}/actions/runs - Get workflow runs
/repos/{owner}/{repo}/deployments - Get deployments
/repos/{owner}/{repo}/environments - Get environments and protection rules
/repos/{owner}/{repo}/tags - Get tags for version selector
/repos/{owner}/{repo}/commits - Get commits for version selector

Rate Limiting Considerations

Implement client-side caching for deployment history
Consider debouncing frequent status updates
Handle rate limit errors gracefully

UI/UX Requirements
Environment Configuration Page

Form to add new environment mappings
List existing configurations with edit/delete
Validation for GitHub repo/workflow existence

Deployment Dashboard

Per-service view showing all configured environments
Current deployment status per environment
Quick actions for triggering deployments
Historical deployment timeline

Version Selector Component

Dropdown/searchable list of tags or commits
Show recent options (last 50 commits)
Allow manual SHA input for older commits
Handle different tagging strategies gracefully

Pipeline Visualization

Flow diagram showing deployment stages
Color coding for status (pending, running, success, failed, waiting for approval)
Click-through to GitHub for detailed logs
Inline approval actions where possible

Future Extensibility
Provider Architecture (Phase 2)
Design with provider abstraction in mind:
typescriptinterface DeploymentProvider {
  authenticate(): Promise<AuthResult>;
  listWorkflows(): Promise<Workflow[]>;
  triggerDeployment(config: DeploymentConfig): Promise<DeploymentResult>;
  getDeploymentStatus(id: string): Promise<DeploymentStatus>;
  approveDeployment(id: string): Promise<void>;
}
Providers could include: GitLab CI, Azure DevOps, Jenkins, custom systems.
Development Phases
Phase 1 (MVP)

Basic GitHub OAuth integration
Environment configuration CRUD
Simple workflow triggering with version selector
Basic pipeline status display

Phase 2 (Enhanced)

Approval workflows
Better visualization
Deployment history
Provider abstraction layer

Phase 3 (Advanced)

Multiple provider support
Advanced filtering/search
Metrics and analytics
Custom deployment patterns

Success Criteria

Users can configure environments without touching code
Triggering deployments is faster/easier than GitHub UI
Clear visibility into multi-stage deployment pipelines
Approval workflows work seamlessly
Plugin is generic enough for community adoption

Technical Constraints

Must work with existing Backstage authentication
Should not require elevated GitHub permissions beyond user's access
Keep server-side configuration simple and portable
Design for eventual multi-provider support

Implementation Notes

Start with read-only features to prove the visualization concept
Add write capabilities (triggering, approvals) once core UX is solid
Consider using Backstage's existing GitHub integration where possible
Plan for error handling (network issues, permission problems, rate limits)
Include comprehensive TypeScript types from the start