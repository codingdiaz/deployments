import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay, GitHubErrorDisplay, ErrorBoundary } from './ErrorDisplay';
import { GitHubApiError } from '../../services/GitHubApiService';

describe('ErrorDisplay', () => {
  it('renders string error message', () => {
    render(<ErrorDisplay error="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders Error object', () => {
    const error = new Error('Test error');
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Application Error')).toBeInTheDocument();
  });

  it('renders GitHubApiError with proper title and actions', () => {
    const error = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorDisplay error="Test error" onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for authentication errors', () => {
    const onRetry = jest.fn();
    const error = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    render(<ErrorDisplay error={error} onRetry={onRetry} />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('expands to show error details when expand button is clicked', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace';
    render(<ErrorDisplay error={error} showDetails />);
    
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Error stack trace')).toBeInTheDocument();
  });

  it('handles rate limit error with reset time', () => {
    const error = new GitHubApiError(
      'Rate limit exceeded', 
      403, 
      'RATE_LIMIT_EXCEEDED'
    );
    error.details = { resetTime: '1640995200' }; // Unix timestamp
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub API Rate Limit Exceeded')).toBeInTheDocument();
    expect(screen.getByText(/Rate limit resets at/)).toBeInTheDocument();
  });

  it('handles insufficient permissions error', () => {
    const error = new GitHubApiError(
      'Insufficient permissions', 
      403, 
      'INSUFFICIENT_PERMISSIONS'
    );
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Insufficient GitHub Permissions')).toBeInTheDocument();
    expect(screen.getByText('Check Repository Access')).toBeInTheDocument();
  });

  it('handles resource not found error', () => {
    const error = new GitHubApiError(
      'Resource not found', 
      404, 
      'RESOURCE_NOT_FOUND'
    );
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('GitHub Resource Not Found')).toBeInTheDocument();
  });

  it('applies custom severity', () => {
    render(<ErrorDisplay error="Warning message" severity="warning" />);
    
    // Should render with warning severity (indicated by the alert component)
    const alert = document.querySelector('.MuiAlert-standardWarning');
    expect(alert).toBeInTheDocument();
  });
});

describe('GitHubErrorDisplay', () => {
  it('renders GitHubApiError with specialized handling', () => {
    const error = new GitHubApiError('GitHub error', 500, 'GITHUB_API_ERROR');
    const onRetry = jest.fn();
    
    render(<GitHubErrorDisplay error={error} onRetry={onRetry} />);
    
    expect(screen.getByText('GitHub API Error')).toBeInTheDocument();
    expect(screen.getByText('GitHub error')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('catches and displays errors from child components', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Application Error')).toBeInTheDocument();
  });

  it('renders children when there are no errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('can retry after error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    // After retry, re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
      <div>
        <span>Custom error: {error.message}</span>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});