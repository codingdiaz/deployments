import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { lightTheme } from '@backstage/theme';
import { ViewToggle, ViewToggleProps } from './ViewToggle';
import { ViewMode } from '@internal/plugin-deployments-common';

// Mock props for testing
const defaultProps: ViewToggleProps = {
  currentView: 'owned' as ViewMode,
  onViewChange: jest.fn(),
  ownedCount: 5,
  totalCount: 20,
};

// Helper function to render component with theme
const renderWithTheme = (props: Partial<ViewToggleProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <ThemeProvider theme={lightTheme}>
      <ViewToggle {...mergedProps} />
    </ThemeProvider>
  );
};

describe('ViewToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders both view buttons', () => {
      renderWithTheme();
      
      expect(screen.getByRole('button', { name: /my applications/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all applications/i })).toBeInTheDocument();
    });

    it('displays correct application counts', () => {
      renderWithTheme();
      
      expect(screen.getByText('5')).toBeInTheDocument(); // owned count
      expect(screen.getByText('20')).toBeInTheDocument(); // total count
    });

    it('shows "View:" label', () => {
      renderWithTheme();
      
      expect(screen.getByText('View:')).toBeInTheDocument();
    });

    it('displays icons for both buttons', () => {
      renderWithTheme();
      
      // Material-UI icons are rendered as SVGs, check for their presence
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      // Check that buttons have icons (they should have SVG elements)
      buttons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-view-toggle';
      renderWithTheme({ className: customClass });
      
      const container = screen.getByRole('group', { name: /application view toggle/i }).parentElement;
      expect(container).toHaveClass(customClass);
    });
  });

  describe('Current View State', () => {
    it('highlights "My Applications" button when currentView is "owned"', () => {
      renderWithTheme({ currentView: 'owned' });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).toHaveAttribute('aria-pressed', 'true');
      expect(allAppsButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('highlights "All Applications" button when currentView is "all"', () => {
      renderWithTheme({ currentView: 'all' });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).toHaveAttribute('aria-pressed', 'false');
      expect(allAppsButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('User Interactions', () => {
    it('calls onViewChange with "owned" when My Applications button is clicked', () => {
      const onViewChange = jest.fn();
      renderWithTheme({ currentView: 'all', onViewChange });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      fireEvent.click(myAppsButton);
      
      expect(onViewChange).toHaveBeenCalledWith('owned');
      expect(onViewChange).toHaveBeenCalledTimes(1);
    });

    it('calls onViewChange with "all" when All Applications button is clicked', () => {
      const onViewChange = jest.fn();
      renderWithTheme({ currentView: 'owned', onViewChange });
      
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      fireEvent.click(allAppsButton);
      
      expect(onViewChange).toHaveBeenCalledWith('all');
      expect(onViewChange).toHaveBeenCalledTimes(1);
    });

    it('does not call onViewChange when clicking the already active button', () => {
      const onViewChange = jest.fn();
      renderWithTheme({ currentView: 'owned', onViewChange });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      fireEvent.click(myAppsButton);
      
      expect(onViewChange).not.toHaveBeenCalled();
    });

    it('does not call onViewChange when disabled', () => {
      const onViewChange = jest.fn();
      renderWithTheme({ disabled: true, onViewChange });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      fireEvent.click(myAppsButton);
      fireEvent.click(allAppsButton);
      
      expect(onViewChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables both buttons when disabled prop is true', () => {
      renderWithTheme({ disabled: true });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).toBeDisabled();
      expect(allAppsButton).toBeDisabled();
    });

    it('enables both buttons when disabled prop is false', () => {
      renderWithTheme({ disabled: false });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).not.toBeDisabled();
      expect(allAppsButton).not.toBeDisabled();
    });

    it('enables both buttons by default (disabled prop not provided)', () => {
      renderWithTheme();
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).not.toBeDisabled();
      expect(allAppsButton).not.toBeDisabled();
    });
  });

  describe('Application Counts', () => {
    it('displays zero counts correctly', () => {
      renderWithTheme({ ownedCount: 0, totalCount: 0 });
      
      const zeroCounts = screen.getAllByText('0');
      expect(zeroCounts).toHaveLength(2); // Should appear twice, once for each button
    });

    it('displays large counts correctly', () => {
      renderWithTheme({ ownedCount: 999, totalCount: 1500 });
      
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('handles case where owned count equals total count', () => {
      renderWithTheme({ ownedCount: 10, totalCount: 10 });
      
      const counts = screen.getAllByText('10');
      expect(counts).toHaveLength(2); // Should appear twice, once for each button
    });

    it('handles case where owned count is greater than total count (edge case)', () => {
      // This shouldn't happen in normal usage, but the component should handle it gracefully
      renderWithTheme({ ownedCount: 15, totalCount: 10 });
      
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      renderWithTheme({ ownedCount: 5, totalCount: 20 });
      
      expect(screen.getByRole('button', { name: 'My Applications (5)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All Applications (20)' })).toBeInTheDocument();
    });

    it('has proper aria-pressed attributes', () => {
      renderWithTheme({ currentView: 'owned' });
      
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).toHaveAttribute('aria-pressed', 'true');
      expect(allAppsButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('has proper group label', () => {
      renderWithTheme();
      
      expect(screen.getByRole('group', { name: 'application view toggle' })).toBeInTheDocument();
    });

    it('maintains accessibility when disabled', () => {
      renderWithTheme({ disabled: true });
      
      // When disabled, the individual buttons should be disabled
      const myAppsButton = screen.getByRole('button', { name: /my applications/i });
      const allAppsButton = screen.getByRole('button', { name: /all applications/i });
      
      expect(myAppsButton).toBeDisabled();
      expect(allAppsButton).toBeDisabled();
    });
  });

  describe('Props Validation', () => {
    it('handles all valid ViewMode values', () => {
      const onViewChange = jest.fn();
      
      // Test 'owned' view
      const { rerender } = renderWithTheme({ currentView: 'owned', onViewChange });
      expect(screen.getByRole('button', { name: /my applications/i })).toHaveAttribute('aria-pressed', 'true');
      
      // Test 'all' view
      rerender(
        <ThemeProvider theme={lightTheme}>
          <ViewToggle {...defaultProps} currentView="all" onViewChange={onViewChange} />
        </ThemeProvider>
      );
      expect(screen.getByRole('button', { name: /all applications/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('handles edge case prop combinations', () => {
      // Test with minimal props
      const minimalProps: ViewToggleProps = {
        currentView: 'owned',
        onViewChange: jest.fn(),
        ownedCount: 0,
        totalCount: 0,
      };
      
      expect(() => renderWithTheme(minimalProps)).not.toThrow();
    });
  });
});