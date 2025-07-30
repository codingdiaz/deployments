import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  makeStyles,
  Theme,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  CheckCircle as CheckCircleIcon,
  Launch as LaunchIcon,
} from '@material-ui/icons';
import { GitHubApiError } from '../../services/GitHubApiService';
import { ErrorDisplay } from '../ErrorHandling';

const useStyles = makeStyles((theme: Theme) => ({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    minWidth: 400,
  },
  field: {
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  environmentValue: {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
  },
  successContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  successIcon: {
    color: theme.palette.success.main,
  },
}));

interface DeploymentTriggerFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Environment name (read-only) */
  environmentName: string;
  /** Whether the trigger is in progress */
  loading?: boolean;
  /** Error from the trigger operation */
  error?: GitHubApiError | null;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (
    version: string,
  ) => Promise<{
    workflowUrl: string;
    workflowRunUrl: string | null;
    workflowId: number;
  } | null>;
}

export const DeploymentTriggerForm: React.FC<DeploymentTriggerFormProps> = ({
  open,
  environmentName,
  loading = false,
  error,
  onClose,
  onSubmit,
}) => {
  const classes = useStyles();
  const [version, setVersion] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    workflowUrl: string;
    workflowRunUrl: string | null;
    workflowId: number;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!version.trim()) {
      return;
    }

    setSubmitting(true);
    setSuccessResult(null);
    try {
      const result = await onSubmit(version.trim());
      if (result) {
        setSuccessResult(result);
        // Don't close immediately, let user see success message and click link
      }
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting && !loading) {
      setVersion('main');
      setSuccessResult(null);
      onClose();
    }
  };

  const isDisabled = submitting || loading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableBackdropClick={isDisabled}
      disableEscapeKeyDown={isDisabled}
    >
      <DialogTitle>Trigger Deployment</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box className={classes.form}>
            <Typography variant="body1" gutterBottom>
              Trigger a new deployment for the{' '}
              <strong>{environmentName}</strong> environment.
            </Typography>

            {error && (
              <ErrorDisplay error={error} severity="error" showDetails />
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Environment
              </Typography>
              <Box className={classes.environmentValue}>{environmentName}</Box>
            </Box>

            <TextField
              label="Version"
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="main"
              helperText="Enter a tag name, commit SHA, or branch name to deploy"
              fullWidth
              required
              disabled={isDisabled}
              className={classes.field}
              variant="outlined"
            />

            {successResult ? (
              <Alert severity="success" variant="outlined">
                <Box className={classes.successContainer}>
                  <CheckCircleIcon className={classes.successIcon} />
                  <Typography variant="body2">
                    <strong>Deployment triggered successfully!</strong>
                  </Typography>
                </Box>
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  Your deployment for <strong>{environmentName}</strong> with
                  version <strong>{version}</strong> has been queued.
                </Typography>
                <Button
                  href={
                    successResult.workflowRunUrl || successResult.workflowUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  endIcon={<LaunchIcon />}
                  style={{ marginTop: 8 }}
                >
                  {successResult.workflowRunUrl
                    ? 'View Workflow Run'
                    : 'View Workflow'}
                </Button>
              </Alert>
            ) : (
              <Typography variant="body2" color="textSecondary">
                This will trigger the GitHub Actions workflow with the specified
                version. The deployment status will be updated automatically
                once the workflow starts.
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          {successResult ? (
            <>
              <Button
                href={successResult.workflowRunUrl || successResult.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                endIcon={<LaunchIcon />}
              >
                {successResult.workflowRunUrl
                  ? 'View Workflow Run'
                  : 'View Workflow'}
              </Button>
              <Button onClick={handleClose} variant="contained" color="primary">
                Close
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleClose} disabled={isDisabled}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isDisabled || !version.trim()}
              >
                {submitting || loading ? (
                  <Box className={classes.loadingContainer}>
                    <CircularProgress size={16} />
                    Triggering...
                  </Box>
                ) : (
                  'Trigger Deployment'
                )}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};
