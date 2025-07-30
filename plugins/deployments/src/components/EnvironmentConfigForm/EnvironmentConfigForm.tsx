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
} from '@material-ui/core';
import { ErrorDisplay } from '../ErrorHandling';
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
}) => {
  const isEditing = Boolean(existingEnvironment);

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

  const handleInputChange =
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear error for this field when user starts typing
      if (formErrors[field]) {
        setFormErrors(prev => ({ ...prev, [field]: undefined }));
      }
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
                Configure a deployment environment for this application. The
                GitHub repository is inherited from the application's source
                location annotation.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Environment Name"
                value={formData.environmentName}
                onChange={handleInputChange('environmentName')}
                error={Boolean(formErrors.environmentName)}
                helperText={
                  formErrors.environmentName || 'e.g., staging, production'
                }
                disabled={isEditing || isSubmitting}
                required
                placeholder="staging"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Workflow Path (Optional)"
                value={formData.workflowPath}
                onChange={handleInputChange('workflowPath')}
                error={Boolean(formErrors.workflowPath)}
                helperText={
                  formErrors.workflowPath ||
                  'Path to the GitHub Actions workflow file (required for deployment triggers)'
                }
                disabled={isSubmitting}
                placeholder=".github/workflows/deploy.yml"
              />
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
