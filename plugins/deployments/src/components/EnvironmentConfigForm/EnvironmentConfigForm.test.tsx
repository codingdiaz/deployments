import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnvironmentConfigForm } from './EnvironmentConfigForm';
import { CreateEnvironmentRequest } from '@internal/plugin-deployments-common';

describe('EnvironmentConfigForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form when no existing environment is provided', () => {
    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    expect(screen.getByText('Create New Environment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('staging')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('.github/workflows/deploy.yml'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('deploy')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('production')).toBeInTheDocument();
    
    // GitHub repository field should not be present
    expect(screen.queryByPlaceholderText('myorg/myapp')).not.toBeInTheDocument();
  });

  it('renders edit form when existing environment is provided', () => {
    const existingEnvironment = {
      id: '1',
      componentName: 'test-app',
      environmentName: 'staging',
      githubRepo: 'owner/repo',
      workflowPath: '.github/workflows/deploy.yml',
      jobName: 'deploy',
      githubEnvironment: 'production',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        existingEnvironment={existingEnvironment}
      />,
    );

    expect(
      screen.getByText('Edit Environment Configuration'),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('.github/workflows/deploy.yml'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('deploy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('production')).toBeInTheDocument();
    
    // GitHub repository field should not be present in the form
    expect(screen.queryByDisplayValue('owner/repo')).not.toBeInTheDocument();
  });

  it('prevents submission when required fields are empty', async () => {
    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    const submitButton = screen.getByText('Create Environment');
    fireEvent.click(submitButton);

    // Form should not submit with empty fields
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data for creating new environment', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    // Fill in valid form data
    fireEvent.change(screen.getByPlaceholderText('staging'), {
      target: { value: 'staging' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('.github/workflows/deploy.yml'),
      {
        target: { value: '.github/workflows/deploy.yml' },
      },
    );
    fireEvent.change(screen.getByPlaceholderText('deploy'), {
      target: { value: 'deploy' },
    });
    fireEvent.change(screen.getByPlaceholderText('production'), {
      target: { value: 'staging' },
    });

    const submitButton = screen.getByText('Create Environment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        environmentName: 'staging',
        workflowPath: '.github/workflows/deploy.yml',
        jobName: 'deploy',
        githubEnvironment: 'staging',
      } as CreateEnvironmentRequest);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        error="Something went wrong"
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('disables form when loading', () => {
    render(
      <EnvironmentConfigForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        loading={true}
      />,
    );

    const submitButton = screen.getByRole('button', {
      name: /create environment/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <EnvironmentConfigForm
        open
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
