import { FC, FormEvent, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  makeStyles,
  Theme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Tabs,
  Tab,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import LaunchIcon from '@material-ui/icons/Launch';
import { GitHubApiError } from '../../services/GitHubApiService';
import { useGitHubBranches, useGitHubTags } from '../../hooks/useGitHubApi';
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
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
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
  /** GitHub repository (owner/repo) for fetching branches and tags */
  githubRepo?: string;
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

export const DeploymentTriggerForm: FC<DeploymentTriggerFormProps> = ({
  open,
  environmentName,
  loading = false,
  error,
  githubRepo,
  onClose,
  onSubmit,
}) => {
  const classes = useStyles();
  const [version, setVersion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    workflowUrl: string;
    workflowRunUrl: string | null;
    workflowId: number;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState(0); // 0 = branches, 1 = tags

  // Parse GitHub repo info
  const repoInfo = githubRepo ? {
    owner: githubRepo.split('/')[0],
    repo: githubRepo.split('/')[1],
  } : null;

  // Fetch branches and tags
  const branchesQuery = useGitHubBranches(
    repoInfo?.owner || '',
    repoInfo?.repo || ''
  );
  const tagsQuery = useGitHubTags(
    repoInfo?.owner || '',
    repoInfo?.repo || ''
  );

  const hasValidRepoInfo = Boolean(repoInfo?.owner && repoInfo?.repo);

  // Set default branch when branches load
  useEffect(() => {
    if (branchesQuery.data && branchesQuery.data.length > 0 && !version && selectedTab === 0) {
      // Try to find 'main' or 'master' branch, otherwise use the first branch
      const defaultBranch = branchesQuery.data.find(b => b.name === 'main') ||
                           branchesQuery.data.find(b => b.name === 'master') ||
                           branchesQuery.data[0];
      setVersion(defaultBranch.name);
    }
  }, [branchesQuery.data, version, selectedTab]);

  // Reset version when switching tabs
  useEffect(() => {
    setVersion('');
  }, [selectedTab]);

  const handleSubmit = async (event: FormEvent) => {
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

            {hasValidRepoInfo ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Use workflow from
                </Typography>
                <Tabs 
                  value={selectedTab} 
                  onChange={(_, newValue) => setSelectedTab(newValue)}
                  indicatorColor="primary"
                  textColor="primary"
                  variant="fullWidth"
                >
                  <Tab label="Branch" />
                  <Tab label="Tag" />
                </Tabs>
                
                <Box mt={2}>
                  {selectedTab === 0 && (
                    <FormControl fullWidth variant="outlined" disabled={isDisabled}>
                      <InputLabel>Select Branch</InputLabel>
                      <Select
                        value={version}
                        onChange={e => setVersion(e.target.value as string)}
                        label="Select Branch"
                      >
                        {(() => {
                          if (branchesQuery.loading) {
                            return (
                              <MenuItem disabled>
                                <CircularProgress size={16} /> Loading branches...
                              </MenuItem>
                            );
                          }
                          
                          if (branchesQuery.error) {
                            return (
                              <MenuItem disabled>
                                <Typography color="error">Failed to load branches</Typography>
                              </MenuItem>
                            );
                          }
                          
                          return branchesQuery.data?.map((branch) => (
                            <MenuItem key={branch.name} value={branch.name}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                <Typography>{branch.name}</Typography>
                                <Chip size="small" label={branch.sha.substring(0, 7)} />
                              </Box>
                            </MenuItem>
                          ));
                        })()}
                      </Select>
                      <FormHelperText>Select a branch to deploy from</FormHelperText>
                    </FormControl>
                  )}
                  
                  {selectedTab === 1 && (
                    <FormControl fullWidth variant="outlined" disabled={isDisabled}>
                      <InputLabel>Select Tag</InputLabel>
                      <Select
                        value={version}
                        onChange={e => setVersion(e.target.value as string)}
                        label="Select Tag"
                      >
                        {(() => {
                          if (tagsQuery.loading) {
                            return (
                              <MenuItem disabled>
                                <CircularProgress size={16} /> Loading tags...
                              </MenuItem>
                            );
                          }
                          
                          if (tagsQuery.error) {
                            return (
                              <MenuItem disabled>
                                <Typography color="error">Failed to load tags</Typography>
                              </MenuItem>
                            );
                          }
                          
                          return tagsQuery.data?.map((tag) => (
                            <MenuItem key={tag.name} value={tag.name}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                <Typography>{tag.name}</Typography>
                                <Chip size="small" label={tag.commit.sha.substring(0, 7)} />
                              </Box>
                            </MenuItem>
                          ));
                        })()}
                      </Select>
                      <FormHelperText>Select a tag to deploy</FormHelperText>
                    </FormControl>
                  )}
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  GitHub Repository Required
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  To trigger deployments, this environment needs a configured GitHub repository. 
                  Deployments can only be triggered from valid branches or tags.
                </Typography>
              </Box>
            )}

            {successResult ? (
              <Alert severity="success" variant="outlined">
                <Typography variant="body2">
                  <strong>Deployment triggered successfully!</strong>
                </Typography>
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
            <Button onClick={handleClose} variant="contained" color="primary">
              Close
            </Button>
          ) : (
            <>
              <Button onClick={handleClose} disabled={isDisabled}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isDisabled || !version.trim() || !hasValidRepoInfo}
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
