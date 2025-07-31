import { createMockGitHubApiService } from './test-utils';

describe('test-utils', () => {
  it('should create mock GitHub API service with expected methods', () => {
    const mockService = createMockGitHubApiService();
    
    expect(mockService.listBranches).toBeDefined();
    expect(mockService.listTags).toBeDefined();
    expect(mockService.listWorkflows).toBeDefined();
    expect(mockService.listWorkflowRuns).toBeDefined();
    expect(mockService.getDeploymentStatus).toBeDefined();
    expect(mockService.getDeploymentHistory).toBeDefined();
    expect(mockService.triggerDeployment).toBeDefined();
    expect(mockService.listRepositoryEnvironments).toBeDefined();
    expect(mockService.listWorkflowFiles).toBeDefined();
  });
});