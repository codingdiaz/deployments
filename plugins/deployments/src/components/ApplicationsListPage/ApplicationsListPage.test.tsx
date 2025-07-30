import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationsListPage } from './ApplicationsListPage';
import { ComponentEntity } from '@backstage/catalog-model';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { IdentityApi, identityApiRef } from '@backstage/core-plugin-api';
import { ANNOTATIONS, BackstageUserIdentity } from '@internal/plugin-deployments-common';

// Mock the useRouteRef hook
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => jest.fn(() => '/deployments'),
}));

const mockEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-app-1',
      description: 'A test application',
      annotations: {
        [ANNOTATIONS.DEPLOYMENT_ENABLED]: 'true',
        [ANNOTATIONS.SOURCE_LOCATION]: 'url:https://github.com/owner/test-app-1',
      },
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'team-a',
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-app-2',
      description: 'Another test application',
      annotations: {
        [ANNOTATIONS.DEPLOYMENT_ENABLED]: 'true',
        [ANNOTATIONS.SOURCE_LOCATION]: 'url:https://github.com/owner/test-app-2',
      },
    },
    spec: {
      type: 'website',
      lifecycle: 'experimental',
      owner: 'team-b',
    },
  },
];

const createMockCatalogApi = (entities: Entity[] = [], shouldError = false): CatalogApi => ({
  getEntities: jest.fn().mockImplementation(() => {
    if (shouldError) {
      throw new Error('Failed to fetch entities');
    }
    return Promise.resolve({ items: entities });
  }),
  getEntityByRef: jest.fn(),
  removeEntityByUid: jest.fn(),
  refreshEntity: jest.fn(),
  getEntityAncestors: jest.fn(),
  getEntityFacets: jest.fn(),
  queryEntities: jest.fn(),
  validateEntityKind: jest.fn(),
});

const renderApplicationsListPage = (apis: any[] = []) => {
  return render(
    <TestApiProvider apis={apis}>
      <MemoryRouter>
        <ApplicationsListPage />
      </MemoryRouter>
    </TestApiProvider>
  );
};

describe('ApplicationsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page title and description', async () => {
    const mockCatalogApi = createMockCatalogApi([]);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('Deployments')).toBeInTheDocument();
      expect(screen.getByText('Manage deployments across your applications')).toBeInTheDocument();
    });
  });

  it('displays loading skeletons while fetching entities', () => {
    const mockCatalogApi = createMockCatalogApi([]);
    // Make the API call hang to simulate loading state
    mockCatalogApi.getEntities = jest.fn(() => new Promise(() => {}));
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    // Should show skeleton cards
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.getByText('Loading applications with deployment configurations...')).toBeInTheDocument();
  });

  it('displays error state when entities fail to load', async () => {
    const mockCatalogApi = createMockCatalogApi([], true);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch entities')).toBeInTheDocument();
      expect(screen.getByText('Error loading applications with deployment configurations.')).toBeInTheDocument();
    });
  });

  it('displays empty state when no entities are found', async () => {
    const mockCatalogApi = createMockCatalogApi([]);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('No applications found')).toBeInTheDocument();
      expect(screen.getByText('No applications with deployment configurations were found.')).toBeInTheDocument();
      expect(screen.getByText(/To register an application for deployment management/)).toBeInTheDocument();
    });

    // Should show annotation example
    expect(screen.getByText(ANNOTATIONS.DEPLOYMENT_ENABLED)).toBeInTheDocument();
    expect(screen.getByText(ANNOTATIONS.SOURCE_LOCATION)).toBeInTheDocument();
  });

  it('displays application cards when entities exist', async () => {
    const mockCatalogApi = createMockCatalogApi(mockEntities);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('test-app-1')).toBeInTheDocument();
      expect(screen.getByText('test-app-2')).toBeInTheDocument();
      expect(screen.getByText('A test application')).toBeInTheDocument();
      expect(screen.getByText('Another test application')).toBeInTheDocument();
    });
  });

  it('displays component metadata correctly', async () => {
    const mockCatalogApi = createMockCatalogApi(mockEntities);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      // Should show type and lifecycle chips
      expect(screen.getByText('service')).toBeInTheDocument();
      expect(screen.getByText('website')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('experimental')).toBeInTheDocument();

      // Should show GitHub repository info
      expect(screen.getByText('owner/test-app-1')).toBeInTheDocument();
      expect(screen.getByText('owner/test-app-2')).toBeInTheDocument();
    });
  });

  it('displays View Deployments and Repository buttons', async () => {
    const mockCatalogApi = createMockCatalogApi(mockEntities);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      const viewDeploymentsButtons = screen.getAllByText('View Deployments');
      const repositoryButtons = screen.getAllByText('Repository');
      
      expect(viewDeploymentsButtons).toHaveLength(2);
      expect(repositoryButtons).toHaveLength(2);

      // Check repository links
      expect(repositoryButtons[0].closest('a')).toHaveAttribute('href', 'https://github.com/owner/test-app-1');
      expect(repositoryButtons[1].closest('a')).toHaveAttribute('href', 'https://github.com/owner/test-app-2');
    });
  });

  it('handles components without GitHub source location', async () => {
    const entitiesWithoutGitHub: Entity[] = [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'local-app',
          description: 'An app without GitHub',
          annotations: {
            [ANNOTATIONS.DEPLOYMENT_ENABLED]: 'true',
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'team-a',
        },
      },
    ];

    const mockCatalogApi = createMockCatalogApi(entitiesWithoutGitHub);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('local-app')).toBeInTheDocument();
      expect(screen.getByText('An app without GitHub')).toBeInTheDocument();
      expect(screen.getByText('View Deployments')).toBeInTheDocument();
      
      // Should not show Repository button or GitHub info
      expect(screen.queryByText('Repository')).not.toBeInTheDocument();
    });
  });

  it('handles components without description', async () => {
    const entitiesWithoutDescription: Entity[] = [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'no-desc-app',
          annotations: {
            [ANNOTATIONS.DEPLOYMENT_ENABLED]: 'true',
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'team-a',
        },
      },
    ];

    const mockCatalogApi = createMockCatalogApi(entitiesWithoutDescription);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('no-desc-app')).toBeInTheDocument();
      expect(screen.getByText('No description available')).toBeInTheDocument();
    });
  });

  it('filters entities correctly using deployment annotation', async () => {
    const mockCatalogApi = createMockCatalogApi(mockEntities);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(mockCatalogApi.getEntities).toHaveBeenCalledWith({
        filter: {
          [`metadata.annotations.${ANNOTATIONS.DEPLOYMENT_ENABLED}`]: 'true',
        },
      });
    });
  });

  it('handles malformed GitHub URLs gracefully', async () => {
    const entitiesWithBadURL: Entity[] = [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'bad-url-app',
          description: 'App with malformed GitHub URL',
          annotations: {
            [ANNOTATIONS.DEPLOYMENT_ENABLED]: 'true',
            [ANNOTATIONS.SOURCE_LOCATION]: 'url:https://not-github.com/owner/repo',
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'team-a',
        },
      },
    ];

    const mockCatalogApi = createMockCatalogApi(entitiesWithBadURL);
    
    renderApplicationsListPage([[catalogApiRef, mockCatalogApi]]);

    await waitFor(() => {
      expect(screen.getByText('bad-url-app')).toBeInTheDocument();
      // Should not show GitHub info for non-GitHub URLs
      expect(screen.queryByText('Repository')).not.toBeInTheDocument();
    });
  });
});