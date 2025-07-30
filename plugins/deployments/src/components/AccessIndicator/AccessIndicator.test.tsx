import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { lightTheme } from '@backstage/theme';
import { AccessIndicator, AccessIndicatorProps } from './AccessIndicator';
import { AccessLevel, OwnerInfo } from '@internal/plugin-deployments-common';

// Mock Material-UI components for testing
jest.mock('@material-ui/icons/Lock', () => () => <div data-testid="lock-icon">Lock</div>);
jest.mock('@material-ui/icons/LockOpen', () => () => <div data-testid="lock-open-icon">LockOpen</div>);
jest.mock('@material-ui/icons/Warning', () => () => <div data-testid="warning-icon">Warning</div>);
jest.mock('@material-ui/icons/Info', () => () => <div data-testid="info-icon">Info</div>);

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={lightTheme}>
      {component}
    </ThemeProvider>
  );
};

const mockOwnerInfo: OwnerInfo = {
  type: 'group',
  name: 'team-alpha',
  displayName: 'Team Alpha',
  avatar: 'https://example.com/avatar.png',
};

describe('AccessIndicator', () => {
  const defaultProps: AccessIndicatorProps = {
    accessLevel: 'full',
    isOwned: true,
  };

  describe('Rendering', () => {
    it('renders with full access level', () => {
      renderWithTheme(<AccessIndicator {...defaultProps} />);
      
      expect(screen.getByTestId('lock-open-icon')).toBeInTheDocument();
      expect(screen.getByLabelText(/full access/i)).toBeInTheDocument();
    });

    it('renders with limited access level', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="limited" 
          isOwned={false}
        />
      );
      
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
      expect(screen.getByLabelText(/limited access/i)).toBeInTheDocument();
    });

    it('renders with no access level', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="none" 
          isOwned={false}
        />
      );
      
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      expect(screen.getByLabelText(/no access/i)).toBeInTheDocument();
    });

    it('renders info icon for unknown access level', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel={'unknown' as AccessLevel}
          isOwned={false}
        />
      );
      
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
      expect(screen.getByLabelText(/access unknown/i)).toBeInTheDocument();
    });

    it('does not render when show is false', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          show={false}
        />
      );
      
      expect(screen.queryByTestId('lock-open-icon')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          className="custom-class"
        />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders as icon variant by default', () => {
      renderWithTheme(<AccessIndicator {...defaultProps} />);
      
      // Should render IconButton, not Chip
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByText('Full Access')).not.toBeInTheDocument();
    });

    it('renders as chip variant when specified', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          variant="chip"
        />
      );
      
      // Should render Chip with text
      expect(screen.getByText('Full Access')).toBeInTheDocument();
    });

    it('renders chip variant with limited access', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="limited"
          variant="chip"
          isOwned={false}
        />
      );
      
      expect(screen.getByText('Limited Access')).toBeInTheDocument();
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('renders chip variant with no access', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="none"
          variant="chip"
          isOwned={false}
        />
      );
      
      expect(screen.getByText('No Access')).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });
  });

  describe('Tooltip Behavior', () => {
    it('shows tooltip on hover for icon variant', async () => {
      renderWithTheme(<AccessIndicator {...defaultProps} />);
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText('Full Access')).toBeInTheDocument();
        expect(screen.getByText(/you own this application/i)).toBeInTheDocument();
      });
    });

    it('shows tooltip on hover for chip variant', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          variant="chip"
        />
      );
      
      const chip = screen.getByText('Full Access');
      fireEvent.mouseEnter(chip);
      
      await waitFor(() => {
        expect(screen.getByText(/you own this application/i)).toBeInTheDocument();
      });
    });

    it('shows custom tooltip content when provided', async () => {
      const customTooltip = 'Custom tooltip content';
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          tooltipContent={customTooltip}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(customTooltip)).toBeInTheDocument();
      });
    });

    it('includes owner information in tooltip when provided', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          ownerInfo={mockOwnerInfo}
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(/owner: team alpha \(group\)/i)).toBeInTheDocument();
      });
    });

    it('shows different tooltip content for owned vs non-owned applications', async () => {
      // Test owned application
      const { unmount } = renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          isOwned
        />
      );
      
      let iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(/you own this application/i)).toBeInTheDocument();
      });
      
      // Clean up first render
      unmount();
      
      // Re-render with non-owned application
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          isOwned={false}
        />
      );
      
      iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(/you have full access to this application/i)).toBeInTheDocument();
      });
    });
  });

  describe('Access Level Content', () => {
    it('shows appropriate content for full access', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="full"
          isOwned
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText('Full Access')).toBeInTheDocument();
        expect(screen.getByText(/you own this application/i)).toBeInTheDocument();
        expect(screen.getByText(/view deployment history, trigger deployments/i)).toBeInTheDocument();
      });
    });

    it('shows appropriate content for limited access', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="limited"
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText('Limited Access')).toBeInTheDocument();
        expect(screen.getByText(/you have limited access/i)).toBeInTheDocument();
        expect(screen.getByText(/contact the application owner/i)).toBeInTheDocument();
      });
    });

    it('shows appropriate content for no access', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel="none"
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText('No Access')).toBeInTheDocument();
        expect(screen.getByText(/you do not have access/i)).toBeInTheDocument();
        expect(screen.getByText(/contact the application owner to request access/i)).toBeInTheDocument();
      });
    });

    it('shows appropriate content for unknown access', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          accessLevel={'unknown' as AccessLevel}
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText('Access Unknown')).toBeInTheDocument();
        expect(screen.getByText(/unable to determine your access level/i)).toBeInTheDocument();
        expect(screen.getByText(/try refreshing the page/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label for icon variant', () => {
      renderWithTheme(<AccessIndicator {...defaultProps} />);
      
      const iconButton = screen.getByRole('button');
      expect(iconButton).toHaveAttribute('aria-label', expect.stringContaining('Full Access'));
    });

    it('has proper aria-label for chip variant', () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          variant="chip"
        />
      );
      
      const chip = screen.getByLabelText(/full access/i);
      expect(chip).toBeInTheDocument();
    });

    it('is keyboard accessible', () => {
      renderWithTheme(<AccessIndicator {...defaultProps} />);
      
      const iconButton = screen.getByRole('button');
      expect(iconButton).toHaveAttribute('tabIndex', '0');
    });

    it('provides descriptive aria-labels for different access levels', () => {
      const accessLevels: Array<{ level: AccessLevel; expectedText: string }> = [
        { level: 'full', expectedText: 'Full Access' },
        { level: 'limited', expectedText: 'Limited Access' },
        { level: 'none', expectedText: 'No Access' },
      ];

      accessLevels.forEach(({ level, expectedText }) => {
        renderWithTheme(
          <AccessIndicator 
            {...defaultProps} 
            accessLevel={level}
            isOwned={false}
          />
        );
        
        const element = screen.getByLabelText(new RegExp(expectedText, 'i'));
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Owner Information Display', () => {
    it('displays user owner information correctly', async () => {
      const userOwner: OwnerInfo = {
        type: 'user',
        name: 'john.doe',
        displayName: 'John Doe',
      };

      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          ownerInfo={userOwner}
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(/owner: john doe \(user\)/i)).toBeInTheDocument();
      });
    });

    it('displays group owner information correctly', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          ownerInfo={mockOwnerInfo}
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.getByText(/owner: team alpha \(group\)/i)).toBeInTheDocument();
      });
    });

    it('does not display owner information when not provided', async () => {
      renderWithTheme(
        <AccessIndicator 
          {...defaultProps} 
          isOwned={false}
        />
      );
      
      const iconButton = screen.getByRole('button');
      fireEvent.mouseEnter(iconButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/owner:/i)).not.toBeInTheDocument();
      });
    });
  });
});