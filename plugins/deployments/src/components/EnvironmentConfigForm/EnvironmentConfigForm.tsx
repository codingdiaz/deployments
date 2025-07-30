import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@material-ui/core';
import { ErrorDisplay } from '../ErrorHandling';
import { useGitHubEnvironments, useGitHubWorkflowFiles } from '../../hooks/useGitHubApi';
import {
  EnvironmentConfig,
  CreateEnvironmentRequest,
  UpdateEnvironmentRequest,
} from '@internal/plugin-deployments-common';

interface FormData {
  environmentName: string;
  workflowPath: string;
}

interface FormErrors {
  environmentName?: string;
  workflowPath?: string;
}

interface EnvironmentConfigFormProps {
  /** Whether the form dialog is open */
  open: boolean;
  /** Function to call when the dialog should be closed */
  onClose: () => void;
  /** Function to call when the form is submitted successfully */
  onSubmit: (
    data: CreateEnvironmentRequest | UpdateEnvironmentRequest,
  ) => Promise<void>;
  /** Existing environment configuration for editing (optional) */
  existingEnvironment?: EnvironmentConfig;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** GitHub repository (owner/repo) for fetching data */
  githubRepo?: string;
  /** List of existing environment names to prevent duplicates */
  existingEnvironmentNames?: string[];
}

/**
 * Form component for creating and editing environment configurations
 */
export const EnvironmentConfigForm: React.FC<EnvironmentConfigFormProps> = ({
  open,
  onClose,
  onSubmit,
  existingEnvironment,
  loading = false,
  error = null,
  githubRepo,
  existingEnvironmentNames = [],
}) => {
  const isEditing = Boolean(existingEnvironment);

  // Parse GitHub repo info
  const repoInfo = githubRepo ? {
    owner: githubRepo.split('/')[0],
    repo: githubRepo.split('/')[1],
  } : null;

  // Fetch GitHub data only when we have valid repo info
  const environmentsQuery = useGitHubEnvironments(
    repoInfo?.owner || '', 
    repoInfo?.repo || ''
  );
  const workflowsQuery = useGitHubWorkflowFiles(
    repoInfo?.owner || '', 
    repoInfo?.repo || ''
  );

  // Check if we have valid repo info for API calls
  const hasValidRepoInfo = Boolean(repoInfo?.owner && repoInfo?.repo);

  const [formData, setFormData] = useState<FormData>({
    environmentName: '',
    workflowPath: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or when editing different environment
  useEffect(() => {
    if (open) {
      if (existingEnvironment) {
        setFormData({
          environmentName: existingEnvironment.environmentName,
          workflowPath: existingEnvironment.workflowPath || '',
        });
      } else {
        setFormData({
          environmentName: '',
          workflowPath: '',
        });
      }
      setFormErrors({});
    }
  }, [open, existingEnvironment]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Environment name validation
    if (!formData.environmentName.trim()) {
      errors.environmentName = 'Environment name is required';
    } else if (formData.environmentName.length > 50) {
      errors.environmentName = 'Environment name must be 50 characters or less';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.environmentName)) {
      errors.environmentName =
        'Environment name can only contain letters, numbers, hyphens, and underscores';
    } else if (!isEditing && existingEnvironmentNames.includes(formData.environmentName)) {
      errors.environmentName = 'An environment with this name already exists';
    }



    // Workflow path validation (optional)
    if (formData.workflowPath.trim() && 
      !/^\.github\/workflows\/.*\.ya?ml$/.test(formData.workflowPath)
    ) {
      errors.workflowPath =
        'Workflow path must be a YAML file in .github/workflows/';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = isEditing
        ? ({
            workflowPath: formData.workflowPath || undefined,
          } as UpdateEnvironmentRequest)
        : ({
            environmentName: formData.environmentName,
            workflowPath: formData.workflowPath || undefined,
          } as CreateEnvironmentRequest);

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (
          isSubmitting &&
          (reason === 'backdropClick' || reason === 'escapeKeyDown')
        ) {
          return;
        }
        handleClose();
      }}
      maxWidth="md"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing
            ? 'Edit Environment Configuration'
            : 'Create New Environment'}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Box style={{ marginBottom: 16 }}>
              <ErrorDisplay
                error={error}
                severity="error"
                showDetails={false}
              />
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Configure a deployment environment for this application. Environment names 
                should match your GitHub repository environments for proper deployment tracking.
                The GitHub repository is inherited from the application's source location annotation.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              {(!hasValidRepoInfo || (environmentsQuery.error || (environmentsQuery.data && environmentsQuery.data.length === 0))) && !environmentsQuery.loading ? (
                // Fallback to text field when GitHub environments can't be loaded
                <TextField
                  fullWidth
                  label="Environment Name"
                  value={formData.environmentName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, environmentName: value }));
                    if (formErrors.environmentName) {
                      setFormErrors(prev => ({ ...prev, environmentName: undefined }));
                    }
                  }}
                  error={Boolean(formErrors.environmentName)}
                  helperText={
                    formErrors.environmentName || 
                    (!hasValidRepoInfo 
                      ? 'Enter an environment name (e.g., staging, production)'
                      : 'Enter an environment name that matches your GitHub repository environments'
                    )
                  }
                  disabled={isEditing || isSubmitting}
                  required
                  placeholder="e.g., staging, production"
                />
              ) : (
                // Use dropdown when GitHub environments are available
                <FormControl 
                  fullWidth 
                  error={Boolean(formErrors.environmentName)} 
                  disabled={isEditing || isSubmitting}
                  required
                >
                  <InputLabel>Environment Name</InputLabel>
                  <Select
                    value={formData.environmentName}
                    onChange={(e) => {
                      const value = e.target.value as string;
                      setFormData(prev => ({ ...prev, environmentName: value }));
                      if (formErrors.environmentName) {
                        setFormErrors(prev => ({ ...prev, environmentName: undefined }));
                      }
                    }}
                    label="Environment Name"
                  >
                    {environmentsQuery.loading ? (
                      <MenuItem disabled>
                        <CircularProgress size={16} /> Loading environments...
                      </MenuItem>
                    ) : (
                      environmentsQuery.data
                        ?.filter(env => isEditing || !existingEnvironmentNames.includes(env))
                        .map((env) => (
                          <MenuItem key={env} value={env}>
                            {env}
                          </MenuItem>
                        ))
                    )}
                    {!isEditing && environmentsQuery.data && environmentsQuery.data.length === 0 && (
                      <MenuItem value="" disabled>
                        <Typography variant="body2" color="textSecondary">
                          No GitHub environments found
                        </Typography>
                      </MenuItem>
                    )}
                  </Select>
                  <FormHelperText>
                    {formErrors.environmentName || 'Select an environment name from your GitHub repository'}
                  </FormHelperText>
                </FormControl>
              )}
            </Grid>

            <Grid item xs={12}>
              {!hasValidRepoInfo ? (
                <TextField
                  fullWidth
                  label="Workflow Path (Optional)"
                  value={formData.workflowPath}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, workflowPath: value }));
                    if (formErrors.workflowPath) {
                      setFormErrors(prev => ({ ...prev, workflowPath: undefined }));
                    }
                  }}
                  error={Boolean(formErrors.workflowPath)}
                  helperText={
                    formErrors.workflowPath || 'Path to the GitHub Actions workflow file (e.g., .github/workflows/deploy.yml)'
                  }
                  disabled={isSubmitting}
                  placeholder=".github/workflows/deploy.yml"
                />
              ) : (
                <FormControl 
                  fullWidth 
                  error={Boolean(formErrors.workflowPath)} 
                  disabled={isSubmitting}
                >
                  <InputLabel>Workflow Path (Optional)</InputLabel>
                  <Select
                    value={formData.workflowPath}
                    onChange={(e) => {
                      const value = e.target.value as string;
                      setFormData(prev => ({ ...prev, workflowPath: value }));
                      if (formErrors.workflowPath) {
                        setFormErrors(prev => ({ ...prev, workflowPath: undefined }));
                      }
                    }}
                    label="Workflow Path (Optional)"
                  >
                    <MenuItem value="">
                      <Typography color="textSecondary">None selected</Typography>
                    </MenuItem>
                    {workflowsQuery.loading ? (
                      <MenuItem disabled>
                        <CircularProgress size={16} /> Loading workflows...
                      </MenuItem>
                    ) : workflowsQuery.error ? (
                      <MenuItem disabled>
                        <Typography color="error">Failed to load workflows</Typography>
                      </MenuItem>
                    ) : (
                      workflowsQuery.data?.map((workflow) => (
                        <MenuItem key={workflow} value={workflow}>
                          {workflow}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  <FormHelperText>
                    {formErrors.workflowPath || 'Select a GitHub Actions workflow file (required for deployment triggers)'}
                  </FormHelperText>
                </FormControl>
              )}
            </Grid>

          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting} color="default">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            color="primary"
            variant="contained"
            startIcon={
              isSubmitting ? <CircularProgress size={16} /> : undefined
            }
          >
            {(() => {
              if (isSubmitting) {
                return isEditing ? 'Updating...' : 'Creating...';
              }
              return isEditing ? 'Update Environment' : 'Create Environment';
            })()}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
