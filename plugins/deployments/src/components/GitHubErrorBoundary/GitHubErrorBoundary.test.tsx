import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitHubErrorDisplay, GitHubErrorBoundary } from './GitHubErrorBoundary';
import { GitHubApiError } from '../../services/GitHubApiService';

describe('GitHubErrorDisplay', () => {
  it('renders authentication error with proper styling and actions', () => {
    const error = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByText('Please refresh the page to re-authenticate with GitHub.')).toBeInTheDocument();
  });

  it('renders rate limit error with proper styling and actions', () => {
    const error = new GitHubApiError('Rate limit exceeded', 403, 'RATE_LIMIT_EXCEEDED');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub API Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('Please wait for the rate limit to reset before trying again.')).toBeInTheDocument();
  });

  it('renders insufficient permissions error with proper styling and actions', () => {
    const error = new GitHubApiError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('Insufficient GitHub Permissions')).toBeInTheDocument();
    expect(screen.getByText('Insufficient permissions')).toBeInTheDocument();
    expect(screen.getByText(/You need read access to the repository and workflow permissions/)).toBeInTheDocument();
  });

  it('renders resource not found error with proper styling', () => {
    const error = new GitHubApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub Resource Not Found')).toBeInTheDocument();
    expect(screen.getByText('Resource not found')).toBeInTheDocument();
  });

  it('renders generic GitHub API error for unknown error codes', () => {
    const error = new GitHubApiError('Unknown error', 500, 'UNKNOWN_ERROR');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub API Error')).toBeInTheDocument();
    expect(screen.getByText('Unknown error')).toBeInTheDocument();
  });

  it('renders generic GitHub API error when no error code is provided', () => {
    const error = new GitHubApiError('Generic error', 500);
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub API Error')).toBeInTheDocument();
    expect(screen.getByText('Generic error')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided and error is not authentication', () => {
    const onRetry = jest.fn();
    const error = new GitHubApiError('Rate limit exceeded', 403, 'RATE_LIMIT_EXCEEDED');
    
    render(<GitHubErrorDisplay error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for authentication errors even when onRetry is provided', () => {
    const onRetry = jest.fn();
    const error = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    
    render(<GitHubErrorDisplay error={error} onRetry={onRetry} />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('does not show retry button when onRetry is not provided', () => {
    const error = new GitHubApiError('Rate limit exceeded', 403, 'RATE_LIMIT_EXCEEDED');
    
    render(<GitHubErrorDisplay error={error} />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('uses correct alert severity for different error types', () => {
    const testCases = [
      { code: 'AUTHENTICATION_FAILED', expectedClass: 'MuiAlert-standardError' },
      { code: 'RATE_LIMIT_EXCEEDED', expectedClass: 'MuiAlert-standardWarning' },
      { code: 'INSUFFICIENT_PERMISSIONS', expectedClass: 'MuiAlert-standardWarning' },
      { code: 'RESOURCE_NOT_FOUND', expectedClass: 'MuiAlert-standardInfo' },
      { code: 'UNKNOWN_ERROR', expectedClass: 'MuiAlert-standardError' },
    ];

    testCases.forEach(({ code, expectedClass }) => {
      const { unmount } = render(
        <GitHubErrorDisplay 
          error={new GitHubApiError('Test error', 500, code)} 
        />
      );
      
      const alert = document.querySelector(`.${expectedClass}`);
      expect(alert).toBeInTheDocument();
      
      unmount();
    });
  });
});

describe('GitHubErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowGitHubError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new GitHubApiError('GitHub API error', 500, 'GITHUB_API_ERROR');
    }
    return <div>No error</div>;
  };

  const ThrowGenericError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Generic error');
    }
    return <div>No error</div>;
  };

  it('catches and displays GitHubApiError from child components', () => {
    render(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('GitHub API Error')).toBeInTheDocument();
    expect(screen.getByText('GitHub API error')).toBeInTheDocument();
  });

  it('converts generic errors to GitHubApiError', () => {
    render(
      <GitHubErrorBoundary>
        <ThrowGenericError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('GitHub API Error')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('renders children when there are no errors', () => {
    render(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow={false} />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('can retry after error', () => {
    const { rerender } = render(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('GitHub API error')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    // After retry, re-render with no error
    rerender(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow={false} />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, retry }: { error: GitHubApiError; retry: () => void }) => (
      <div>
        <span>Custom GitHub error: {error.message}</span>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );
    
    render(
      <GitHubErrorBoundary fallback={CustomFallback}>
        <ThrowGitHubError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('Custom GitHub error: GitHub API error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('logs errors to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'GitHub API Error:',
      expect.any(GitHubApiError),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
  });

  it('resets error state when retry is called', () => {
    const { rerender } = render(
      <GitHubErrorBoundary>
        <ThrowGitHubError shouldThrow />
      </GitHubErrorBoundary>
    );
    
    // Should show error
    expect(screen.getByText('GitHub API error')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    // After retry, should not show error even if we don't re-render
    // (the error boundary state should be reset)
    rerender(
      <GitHubErrorBoundary>
        <div>Success after retry</div>
      </GitHubErrorBoundary>
    );
    
    expect(screen.getByText('Success after retry')).toBeInTheDocument();
    expect(screen.queryByText('GitHub API error')).not.toBeInTheDocument();
  });

  it('handles multiple error types correctly', () => {
    const testCases = [
      {
        error: new GitHubApiError('Auth error', 401, 'AUTHENTICATION_FAILED'),
        expectedTitle: 'GitHub Authentication Required',
      },
      {
        error: new GitHubApiError('Rate limit', 403, 'RATE_LIMIT_EXCEEDED'),
        expectedTitle: 'GitHub API Rate Limit Exceeded',
      },
      {
        error: new Error('Generic error'),
        expectedTitle: 'GitHub API Error',
        expectedMessage: 'An unexpected error occurred',
      },
    ];

    testCases.forEach(({ error, expectedTitle, expectedMessage }) => {
      const ThrowSpecificError = () => {
        throw error;
      };

      const { unmount } = render(
        <GitHubErrorBoundary>
          <ThrowSpecificError />
        </GitHubErrorBoundary>
      );
      
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      if (expectedMessage) {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      }
      
      unmount();
    });
  });
});