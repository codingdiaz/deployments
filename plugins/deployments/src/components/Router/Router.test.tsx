import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider } from '@backstage/test-utils';
import { Router } from './Router';

// Mock all the page components
jest.mock('../ApplicationsListPage', () => ({
  ApplicationsListPage: () => <div>Applications List Page</div>,
}));

jest.mock('../ApplicationDeploymentPage', () => ({
  ApplicationDeploymentPage: () => <div>Application Deployment Page</div>,
}));

jest.mock('../EnvironmentDetailsPage', () => ({
  EnvironmentDetailsPage: () => <div>Environment Details Page</div>,
}));

const renderRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <TestApiProvider apis={[]}>
      <MemoryRouter initialEntries={initialEntries}>
        <Router />
      </MemoryRouter>
    </TestApiProvider>
  );
};

describe('Router', () => {
  it('renders ApplicationsListPage for root path', () => {
    renderRouter(['/']);
    
    expect(screen.getByText('Applications List Page')).toBeInTheDocument();
  });

  it('renders ApplicationDeploymentPage for component path', () => {
    renderRouter(['/test-app']);
    
    expect(screen.getByText('Application Deployment Page')).toBeInTheDocument();
  });

  it('renders EnvironmentDetailsPage for component and environment path', () => {
    renderRouter(['/test-app/staging']);
    
    expect(screen.getByText('Environment Details Page')).toBeInTheDocument();
  });

  it('handles complex component names in URLs', () => {
    renderRouter(['/my-complex-app-name']);
    
    expect(screen.getByText('Application Deployment Page')).toBeInTheDocument();
  });

  it('handles complex environment names in URLs', () => {
    renderRouter(['/my-app/staging-environment']);
    
    expect(screen.getByText('Environment Details Page')).toBeInTheDocument();
  });

  it('handles URL-encoded component names', () => {
    renderRouter(['/my%20app']);
    
    expect(screen.getByText('Application Deployment Page')).toBeInTheDocument();
  });

  it('handles URL-encoded environment names', () => {
    renderRouter(['/my-app/staging%20env']);
    
    expect(screen.getByText('Environment Details Page')).toBeInTheDocument();
  });

  it('navigates between different routes correctly', () => {
    // Test root route
    const { unmount: unmount1 } = renderRouter(['/']);
    expect(screen.getByText('Applications List Page')).toBeInTheDocument();
    unmount1();
    
    // Test application route
    const { unmount: unmount2 } = renderRouter(['/test-app']);
    expect(screen.getByText('Application Deployment Page')).toBeInTheDocument();
    unmount2();
    
    // Test environment details route
    renderRouter(['/test-app/staging']);
    expect(screen.getByText('Environment Details Page')).toBeInTheDocument();
  });

  it('handles routes with special characters', () => {
    const testCases = [
      '/app-with-dashes',
      '/app_with_underscores',
      '/app.with.dots',
      '/app123',
      '/app-name/env-name',
      '/app_name/env_name',
      '/app.name/env.name',
    ];

    testCases.forEach(route => {
      const pathSegments = route.split('/').filter(Boolean);
      const expectedComponent = pathSegments.length === 1 
        ? 'Application Deployment Page'
        : 'Environment Details Page';

      const { unmount } = renderRouter([route]);
      expect(screen.getByText(expectedComponent)).toBeInTheDocument();
      unmount();
    });
  });

  it('handles nested paths correctly', () => {
    // Test that the router handles exact path matching
    renderRouter(['/app/env']);
    
    // Should match the environment details route
    expect(screen.getByText('Environment Details Page')).toBeInTheDocument();
  });

  it('handles empty component names gracefully', () => {
    renderRouter(['/']);
    
    expect(screen.getByText('Applications List Page')).toBeInTheDocument();
  });

  it('handles trailing slashes', () => {
    const testCases = [
      { path: '/app/', expected: 'Application Deployment Page' },
      { path: '/app/env/', expected: 'Environment Details Page' },
    ];

    testCases.forEach(({ path, expected }) => {
      const { unmount } = renderRouter([path]);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });
});