import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,

  CircularProgress,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import CheckCircle from '@material-ui/icons/CheckCircle';
import Cancel from '@material-ui/icons/Cancel';
import Schedule from '@material-ui/icons/Schedule';
import Person from '@material-ui/icons/Person';
import { PendingApproval } from '@internal/plugin-deployments-common';

const useStyles = makeStyles(theme => ({
  card: {
    marginBottom: theme.spacing(2),
    border: `2px solid ${theme.palette.warning.main}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  statusIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.warning.main,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  avatar: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    marginRight: theme.spacing(1),
  },
  reviewerChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
  actions: {
    justifyContent: 'flex-end',
  },
  approveButton: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  rejectButton: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: (deploymentId: number, comment?: string) => Promise<void>;
  onReject?: (deploymentId: number, comment?: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onReject,
}) => {
  const classes = useStyles();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await onApprove(approval.deploymentId, comment || undefined);
      setApprovalDialogOpen(false);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve deployment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onReject(approval.deploymentId, comment || undefined);
      setRejectDialogOpen(false);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject deployment');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      <Card className={classes.card}>
        <CardContent>
          <div className={classes.header}>
            <Schedule className={classes.statusIcon} />
            <Typography variant="h6">
              Deployment Approval Required
            </Typography>
          </div>
          
          <Typography variant="body1" gutterBottom>
            <strong>{approval.environment}</strong> environment is waiting for approval
          </Typography>
          
          <Typography variant="body2" color="textSecondary">
            Version: <strong>{approval.version}</strong>
          </Typography>
          
          <div className={classes.userInfo}>
            <Avatar 
              src={approval.triggeredBy.avatar_url} 
              className={classes.avatar}
            >
              <Person />
            </Avatar>
            <Typography variant="body2">
              Requested by <strong>{approval.triggeredBy.login}</strong> {formatTimeAgo(approval.requestedAt)}
            </Typography>
          </div>

          {(approval.requiredReviewers.length > 0 || approval.requiredTeams.length > 0) && (
            <Box className={classes.reviewerChips}>
              <Typography variant="body2" color="textSecondary">
                Required reviewers:
              </Typography>
              {approval.requiredReviewers.map(reviewer => (
                <Chip
                  key={reviewer}
                  label={reviewer}
                  size="small"
                  variant="outlined"
                />
              ))}
              {approval.requiredTeams.map(team => (
                <Chip
                  key={team}
                  label={`@${team}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          )}

          {approval.timeoutMinutes && (
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
              Timeout: {approval.timeoutMinutes} minutes
            </Typography>
          )}
        </CardContent>

        <CardActions className={classes.actions}>
          <Button
            size="small"
            onClick={() => window.open(approval.deploymentUrl, '_blank')}
          >
            View on GitHub
          </Button>
          
          {approval.canApprove && (
            <>
              {onReject && (
                <Button
                  size="small"
                  className={classes.rejectButton}
                  startIcon={<Cancel />}
                  onClick={() => setRejectDialogOpen(true)}
                >
                  Reject
                </Button>
              )}
              <Button
                size="small"
                className={classes.approveButton}
                startIcon={<CheckCircle />}
                onClick={() => setApprovalDialogOpen(true)}
              >
                Approve
              </Button>
            </>
          )}
          
          {!approval.canApprove && (
            <Typography variant="body2" color="textSecondary">
              You don't have permission to approve this deployment
            </Typography>
          )}
        </CardActions>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Deployment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to approve the deployment of <strong>{approval.version}</strong> to <strong>{approval.environment}</strong>?
          </Typography>
          
          <TextField
            margin="dense"
            label="Comment (optional)"
            fullWidth
            multiline
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment about this approval..."
          />
          
          {error && (
            <Alert severity="error" style={{ marginTop: 16 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            className={classes.approveButton}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {loading ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Deployment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to reject the deployment of <strong>{approval.version}</strong> to <strong>{approval.environment}</strong>?
          </Typography>
          
          <TextField
            margin="dense"
            label="Reason for rejection"
            fullWidth
            multiline
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Please provide a reason for rejecting this deployment..."
          />
          
          {error && (
            <Alert severity="error" style={{ marginTop: 16 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            className={classes.rejectButton}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Cancel />}
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};