import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeploymentTriggerForm } from './DeploymentTriggerForm';
import { GitHubApiError } from '../../services/GitHubApiService';

describe('DeploymentTriggerForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with environment name', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Trigger Deployment')).toBeInTheDocument();
    expect(screen.getByText(/Trigger a new deployment for the/)).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
  });

  it('has default version value of "main"', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version') as HTMLInputElement;
    expect(versionInput.value).toBe('main');
  });

  it('allows changing the version input', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: 'v1.2.3' } });

    expect((versionInput as HTMLInputElement).value).toBe('v1.2.3');
  });

  it('calls onSubmit with version when form is submitted', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: 'v1.2.3' } });

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('v1.2.3');
    });
  });

  it('trims whitespace from version input', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: null,
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: '  v1.2.3  ' } });

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('v1.2.3');
    });
  });

  it('prevents submission with empty version', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    expect(submitButton).toBeDisabled();
  });

  it('prevents submission with whitespace-only version', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: '   ' } });

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state during submission', async () => {
    let resolveSubmit: (value: any) => void;
    const submitPromise = new Promise(resolve => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    expect(screen.getByText('Triggering...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolveSubmit!({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: null,
      workflowId: 456,
    });

    await waitFor(() => {
      expect(screen.queryByText('Triggering...')).not.toBeInTheDocument();
    });
  });

  it('shows loading state when loading prop is true', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        loading
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays error when provided', () => {
    const error = new GitHubApiError('Authentication failed', 401, 'AUTHENTICATION_FAILED');
    
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        error={error}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });

  it('shows success message after successful submission', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: 'v1.2.3' } });

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Deployment triggered successfully!')).toBeInTheDocument();
      expect(screen.getByText(/Your deployment for staging with version v1.2.3 has been queued/)).toBeInTheDocument();
    });
  });

  it('shows workflow run link in success message when available', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Workflow Run');
      expect(viewButtons.length).toBeGreaterThan(0);
      expect(viewButtons[0].closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo/actions/runs/123');
    });
  });

  it('shows workflow link when run URL is not available', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: null,
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Workflow');
      expect(viewButtons.length).toBeGreaterThan(0);
      expect(viewButtons[0].closest('a')).toHaveAttribute('href', 'https://github.com/owner/repo/actions/workflows/deploy.yml');
    });
  });

  it('changes button text to Close after successful submission', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /trigger deployment/i })).not.toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked after success', async () => {
    mockOnSubmit.mockResolvedValue({
      workflowUrl: 'https://github.com/owner/repo/actions/workflows/deploy.yml',
      workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
      workflowId: 456,
    });

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('prevents closing during submission', () => {
    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        loading
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('resets form state when dialog closes and reopens', () => {
    const { rerender } = render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Change version
    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: 'v1.2.3' } });

    // Close dialog
    rerender(
      <DeploymentTriggerForm
        open={false}
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Reopen dialog
    rerender(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Version should be reset to default
    const newVersionInput = screen.getByLabelText('Version') as HTMLInputElement;
    expect(newVersionInput.value).toBe('main');
  });

  it('handles submission errors gracefully', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

    render(
      <DeploymentTriggerForm
        open
        environmentName="staging"
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /trigger deployment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Should not show success message
      expect(screen.queryByText('Deployment triggered successfully!')).not.toBeInTheDocument();
      // Should still show the trigger button (not changed to Close)
      expect(screen.getByRole('button', { name: /trigger deployment/i })).toBeInTheDocument();
    });
  });
});