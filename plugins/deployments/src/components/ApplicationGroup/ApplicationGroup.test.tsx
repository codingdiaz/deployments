import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestApiProvider, wrapInTestApp } from '@backstage/test-utils';
import { ComponentEntity } from '@backstage/catalog-model';
import { ApplicationGroupComponent } from './ApplicationGroup';
import { ApplicationGroup, OwnerInfo } from '@internal/plugin-deployments-common';
import { applicationDeploymentRouteRef } from '../../routes';

// Mock the routes
jest.mock('../../routes', () => ({
  applicationDeploymentRouteRef: {
    id: 'deployments.application',
  },
}));

// Mock the useRouteRef hook
jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: jest.fn(() => ({ componentName }: { componentName: string }) => 
    `/deployments/${componentName}`
  ),
}));

const mockUserOwner: OwnerInfo = {
  type: 'user',
  name: 'john.doe',
  displayName: 'John Doe',
};

const mockGroupOwner: OwnerInfo = {
  type: 'group',
  name: 'platform-team',
  displayName: 'Platform Team',
};

const mockUnassignedOwner: OwnerInfo = {
  type: 'group',
  name: 'unassigned',
  displayName: 'Unassigned',
};

const createMockEntity = (name: string, owner?: string, description?: string): ComponentEntity => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name,
    description: description || `Description for ${name}`,
    annotations: {
      'backstage.io/source-location': `url:https://github.com/example/${name}`,
      'backstage.io/deployment-enabled': 'true',
    },
  },
  spec: {
    type: 'service',
    lifecycle: 'production',
    owner: owner || 'user:default/john.doe',
  },
});

const mockApplications: ComponentEntity[] = [
  createMockEntity('app1', 'user:default/john.doe', 'First application'),
  createMockEntity('app2', 'user:default/john.doe', 'Second application'),
  createMockEntity('app3', 'group:default/platform-team', 'Third application'),
];

const mockUserGroup: ApplicationGroup = {
  owner: mockUserOwner,
  applications: [mockApplications[0], mockApplications[1]],
  isUserGroup: true,
  accessLevel: 'full',
};

const mockTeamGroup: ApplicationGroup = {
  owner: mockGroupOwner,
  applications: [mockApplications[2]],
  isUserGroup: true,
  accessLevel: 'full',
};

const mockUnassignedGroup: ApplicationGroup = {
  owner: mockUnassignedOwner,
  applications: [createMockEntity('unassigned-app', undefined, 'Unassigned application')],
  isUserGroup: false,
  accessLevel: 'limited',
};

const renderComponent = (props: Partial<React.ComponentProps<typeof ApplicationGroupComponent>> = {}) => {
  const defaultProps = {
    group: mockUserGroup,
    currentView: 'owned' as const,
    currentUserRef: 'user:default/john.doe',
    showAccessIndicators: true,
    defaultExpanded: true,
  };

  return render(
    wrapInTestApp(
      <TestApiProvider apis={[]}>
        <ApplicationGroupComponent {...defaultProps} {...props} />
      </TestApiProvider>,
      {
        routeEntries: ['/deployments'],
      }
    )
  );
};

describe('ApplicationGroupComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Group Header', () => {
    it('should display owner information correctly for user owner', () => {
      renderComponent({ group: mockUserGroup });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // Avatar initials
    });

    it('should display owner information correctly for group owner', () => {
      renderComponent({ group: mockTeamGroup });

      expect(screen.getByText('Platform Team')).toBeInTheDocument();
      expect(screen.getByText('group')).toBeInTheDocument();
      expect(screen.getByText('PT')).toBeInTheDocument(); // Avatar initials
    });

    it('should display application count correctly', () => {
      renderComponent({ group: mockUserGroup });
      expect(screen.getByText('2 applications')).toBeInTheDocument();

      renderComponent({ group: mockTeamGroup });
      expect(screen.getByText('1 application')).toBeInTheDocument();
    });

    it('should handle unassigned group styling', () => {
      const { container } = renderComponent({ group: mockUnassignedGroup });
      
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      expect(container.querySelector('[class*="unassignedGroup"]')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should be expanded by default when defaultExpanded is true', () => {
      renderComponent({ defaultExpanded: true });

      // Applications should be visible
      expect(screen.getByText('app1')).toBeInTheDocument();
      expect(screen.getByText('app2')).toBeInTheDocument();
    });

    it('should be collapsed by default when defaultExpanded is false', () => {
      renderComponent({ defaultExpanded: false });

      // Applications should not be visible
      expect(screen.queryByText('app1')).not.toBeInTheDocument();
      expect(screen.queryByText('app2')).not.toBeInTheDocument();
    });

    it('should toggle expansion when expand button is clicked', async () => {
      renderComponent({ defaultExpanded: true });

      // Initially expanded - applications visible
      expect(screen.getByText('app1')).toBeInTheDocument();

      // Click collapse button
      const expandButton = screen.getByLabelText('Collapse group');
      fireEvent.click(expandButton);

      // Wait for collapse animation
      await waitFor(() => {
        expect(screen.queryByText('app1')).not.toBeInTheDocument();
      });

      // Click expand button
      const collapseButton = screen.getByLabelText('Expand group');
      fireEvent.click(collapseButton);

      // Wait for expand animation
      await waitFor(() => {
        expect(screen.getByText('app1')).toBeInTheDocument();
      });
    });

    it('should have correct aria attributes for expand button', () => {
      renderComponent({ defaultExpanded: true });

      const expandButton = screen.getByLabelText('Collapse group');
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Application Cards', () => {
    it('should render all applications in the group', () => {
      renderComponent({ group: mockUserGroup });

      expect(screen.getByText('app1')).toBeInTheDocument();
      expect(screen.getByText('app2')).toBeInTheDocument();
      expect(screen.getByText('First application')).toBeInTheDocument();
      expect(screen.getByText('Second application')).toBeInTheDocument();
    });

    it('should display application metadata correctly', () => {
      renderComponent({ group: mockUserGroup });

      // Check for type and lifecycle chips
      expect(screen.getAllByText('service')).toHaveLength(2);
      expect(screen.getAllByText('production')).toHaveLength(2);
    });

    it('should display GitHub information when available', () => {
      renderComponent({ group: mockUserGroup });

      expect(screen.getByText('example/app1')).toBeInTheDocument();
      expect(screen.getByText('example/app2')).toBeInTheDocument();
    });

    it('should create correct links to application deployment pages', () => {
      renderComponent({ group: mockUserGroup });

      const app1Link = screen.getByRole('link', { name: 'app1' });
      const app2Link = screen.getByRole('link', { name: 'app2' });

      expect(app1Link).toHaveAttribute('href', '/deployments/app1');
      expect(app2Link).toHaveAttribute('href', '/deployments/app2');
    });
  });

  describe('Access Indicators', () => {
    it('should show access indicators for non-owned applications in "all" view', () => {
      const nonOwnedGroup: ApplicationGroup = {
        owner: mockGroupOwner,
        applications: [mockApplications[2]],
        isUserGroup: false,
        accessLevel: 'limited',
      };

      renderComponent({
        group: nonOwnedGroup,
        currentView: 'all',
        showAccessIndicators: true,
      });

      // Access indicator should be present for non-owned application
      expect(screen.getByLabelText(/Limited Access/)).toBeInTheDocument();
    });

    it('should not show access indicators for owned applications', () => {
      renderComponent({
        group: mockUserGroup,
        currentView: 'all',
        showAccessIndicators: true,
      });

      // No access indicators should be present for owned applications
      expect(screen.queryByLabelText(/Limited Access/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/No Access/)).not.toBeInTheDocument();
    });

    it('should not show access indicators in "owned" view', () => {
      const nonOwnedGroup: ApplicationGroup = {
        owner: mockGroupOwner,
        applications: [mockApplications[2]],
        isUserGroup: false,
        accessLevel: 'limited',
      };

      renderComponent({
        group: nonOwnedGroup,
        currentView: 'owned',
        showAccessIndicators: true,
      });

      // No access indicators should be present in owned view
      expect(screen.queryByLabelText(/Limited Access/)).not.toBeInTheDocument();
    });

    it('should not show access indicators when showAccessIndicators is false', () => {
      const nonOwnedGroup: ApplicationGroup = {
        owner: mockGroupOwner,
        applications: [mockApplications[2]],
        isUserGroup: false,
        accessLevel: 'limited',
      };

      renderComponent({
        group: nonOwnedGroup,
        currentView: 'all',
        showAccessIndicators: false,
      });

      // No access indicators should be present
      expect(screen.queryByLabelText(/Limited Access/)).not.toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className when provided', () => {
      const { container } = renderComponent({ className: 'custom-class' });
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should have proper grid layout for applications', () => {
      renderComponent({ group: mockUserGroup });

      // Check that applications are in a grid container
      const gridContainer = screen.getByText('app1').closest('[class*="MuiGrid-container"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should handle hover effects on application cards', () => {
      renderComponent({ group: mockUserGroup });

      const app1Card = screen.getByText('app1').closest('[class*="applicationCard"]');
      expect(app1Card).toHaveAttribute('class');
      expect(app1Card?.className).toContain('applicationCard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty applications array', () => {
      const emptyGroup: ApplicationGroup = {
        owner: mockUserOwner,
        applications: [],
        isUserGroup: true,
        accessLevel: 'full',
      };

      renderComponent({ group: emptyGroup });

      expect(screen.getByText('0 applications')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle applications without descriptions', () => {
      const appWithoutDescription = createMockEntity('no-desc-app', 'user:default/john.doe', undefined);
      appWithoutDescription.metadata.description = undefined;

      const groupWithNoDesc: ApplicationGroup = {
        owner: mockUserOwner,
        applications: [appWithoutDescription],
        isUserGroup: true,
        accessLevel: 'full',
      };

      renderComponent({ group: groupWithNoDesc });

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });

    it('should handle applications without GitHub source location', () => {
      const appWithoutGithub = createMockEntity('no-github-app', 'user:default/john.doe');
      delete appWithoutGithub.metadata.annotations!['backstage.io/source-location'];

      const groupWithoutGithub: ApplicationGroup = {
        owner: mockUserOwner,
        applications: [appWithoutGithub],
        isUserGroup: true,
        accessLevel: 'full',
      };

      renderComponent({ group: groupWithoutGithub });

      // Should not show GitHub info
      expect(screen.queryByText(/example\//)).not.toBeInTheDocument();
    });

    it('should handle applications without type or lifecycle', () => {
      const appWithoutMeta = createMockEntity('no-meta-app', 'user:default/john.doe');
      delete appWithoutMeta.spec?.type;
      delete appWithoutMeta.spec?.lifecycle;

      const groupWithoutMeta: ApplicationGroup = {
        owner: mockUserOwner,
        applications: [appWithoutMeta],
        isUserGroup: true,
        accessLevel: 'full',
      };

      renderComponent({ group: groupWithoutMeta });

      // Should not show type or lifecycle chips
      expect(screen.queryByText('service')).not.toBeInTheDocument();
      expect(screen.queryByText('production')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for expand button', () => {
      renderComponent({ defaultExpanded: true });

      const expandButton = screen.getByLabelText('Collapse group');
      expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper ARIA labels for application links', () => {
      renderComponent({ group: mockUserGroup });

      const app1Link = screen.getByRole('link', { name: 'app1' });
      expect(app1Link).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderComponent({ group: mockUserGroup });

      const expandButton = screen.getByLabelText('Collapse group');
      
      // Button should be focusable
      expandButton.focus();
      expect(document.activeElement).toBe(expandButton);
    });
  });
});