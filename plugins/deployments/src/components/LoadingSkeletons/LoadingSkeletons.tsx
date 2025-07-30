import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  makeStyles,
  Theme,
} from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';

const useStyles = makeStyles((theme: Theme) => ({
  skeletonCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  skeletonCardContent: {
    flexGrow: 1,
  },
  skeletonCardActions: {
    justifyContent: 'space-between',
    padding: theme.spacing(2),
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 0),
    '& > *': {
      marginRight: theme.spacing(2),
    },
  },
}));

/**
 * Loading skeleton for environment cards
 */
export const EnvironmentCardSkeleton: React.FC = () => {
  const classes = useStyles();

  return (
    <Card className={classes.skeletonCard}>
      <CardContent className={classes.skeletonCardContent}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="80%" height={20} style={{ marginTop: 8 }} />
        
        <Box display="flex" alignItems="center" marginTop={2}>
          <Skeleton variant="rect" width={80} height={24} style={{ borderRadius: 12 }} />
        </Box>
        
        <Box marginTop={1}>
          <Skeleton variant="rect" width={60} height={24} style={{ borderRadius: 4 }} />
        </Box>
        
        <Skeleton variant="text" width="40%" height={16} style={{ marginTop: 8 }} />
      </CardContent>
      
      <CardActions className={classes.skeletonCardActions}>
        <Skeleton variant="rect" width={90} height={32} style={{ borderRadius: 4 }} />
        <Skeleton variant="rect" width={80} height={32} style={{ borderRadius: 4 }} />
      </CardActions>
    </Card>
  );
};

/**
 * Loading skeleton for application cards
 */
export const ApplicationCardSkeleton: React.FC = () => {
  const classes = useStyles();

  return (
    <Card className={classes.skeletonCard}>
      <CardContent className={classes.skeletonCardContent}>
        <Skeleton variant="text" width="70%" height={32} />
        <Skeleton variant="text" width="100%" height={20} style={{ marginTop: 8 }} />
        <Skeleton variant="text" width="90%" height={20} />
        
        <Box display="flex" marginTop={2} style={{ gap: 8 }}>
          <Skeleton variant="rect" width={60} height={24} style={{ borderRadius: 12 }} />
          <Skeleton variant="rect" width={80} height={24} style={{ borderRadius: 12 }} />
        </Box>
        
        <Box display="flex" alignItems="center" marginTop={2}>
          <Skeleton variant="circle" width={20} height={20} />
          <Skeleton variant="text" width={120} height={20} style={{ marginLeft: 8 }} />
        </Box>
      </CardContent>
      
      <CardActions className={classes.skeletonCardActions}>
        <Skeleton variant="rect" width={130} height={32} style={{ borderRadius: 4 }} />
        <Skeleton variant="rect" width={100} height={32} style={{ borderRadius: 4 }} />
      </CardActions>
    </Card>
  );
};

/**
 * Loading skeleton for deployment history table
 */
export const DeploymentHistoryTableSkeleton: React.FC = () => {
  const classes = useStyles();

  return (
    <Box>
      {Array.from({ length: 5 }).map((_, index) => (
        <Box key={index} className={classes.tableRow}>
          <Skeleton variant="rect" width={80} height={24} style={{ borderRadius: 12 }} />
          <Skeleton variant="text" width={80} />
          <Box>
            <Skeleton variant="text" width={140} />
            <Skeleton variant="text" width={120} height={14} />
          </Box>
          <Skeleton variant="text" width={60} />
          <Skeleton variant="text" width={100} />
          <Skeleton variant="rect" width={60} height={28} style={{ borderRadius: 4 }} />
        </Box>
      ))}
    </Box>
  );
};

/**
 * Loading skeleton for deployment status
 */
export const DeploymentStatusSkeleton: React.FC = () => {
  return (
    <Box display="flex" alignItems="center" style={{ gap: 16 }}>
      <Skeleton variant="rect" width={80} height={24} style={{ borderRadius: 12 }} />
      <Skeleton variant="text" width={120} />
      <Skeleton variant="text" width={160} />
      <Skeleton variant="rect" width={110} height={32} style={{ borderRadius: 4 }} />
    </Box>
  );
};

/**
 * Loading skeleton for workflow list
 */
export const WorkflowListSkeleton: React.FC = () => {
  return (
    <Box>
      {Array.from({ length: 3 }).map((_, index) => (
        <Box
          key={index}
          style={{
            marginBottom: 8,
            padding: 8,
            border: '1px solid #e0e0e0',
            borderRadius: 4,
          }}
        >
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="text" width="50%" height={16} />
        </Box>
      ))}
    </Box>
  );
};

/**
 * Loading skeleton for form fields
 */
export const FormFieldSkeleton: React.FC<{ rows?: number }> = ({ rows = 1 }) => {
  return (
    <Box marginBottom={2}>
      <Skeleton variant="text" width="30%" height={20} style={{ marginBottom: 8 }} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="rect" 
          width="100%" 
          height={56} 
          style={{ 
            marginBottom: index < rows - 1 ? 8 : 0,
            borderRadius: 4 
          }} 
        />
      ))}
    </Box>
  );
};

/**
 * Loading skeleton for page header
 */
export const PageHeaderSkeleton: React.FC = () => {
  return (
    <Box marginBottom={3}>
      <Skeleton variant="text" width="40%" height={40} />
      <Skeleton variant="text" width="60%" height={20} style={{ marginTop: 8 }} />
    </Box>
  );
};

/**
 * Loading skeleton for button group
 */
export const ButtonGroupSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <Box display="flex" style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton 
          key={index}
          variant="rect" 
          width={100} 
          height={36} 
          style={{ borderRadius: 4 }} 
        />
      ))}
    </Box>
  );
};

/**
 * Loading skeleton for navigation breadcrumbs
 */
export const BreadcrumbSkeleton: React.FC = () => {
  return (
    <Box display="flex" alignItems="center" marginBottom={2} style={{ gap: 8 }}>
      <Skeleton variant="rect" width={120} height={32} style={{ borderRadius: 4 }} />
      <Skeleton variant="text" width={20} height={20} />
      <Skeleton variant="text" width={150} height={20} />
    </Box>
  );
};

/**
 * Loading skeleton for empty state
 */
export const EmptyStateSkeleton: React.FC = () => {
  return (
    <Box textAlign="center" padding={4}>
      <Skeleton variant="circle" width={80} height={80} style={{ margin: '0 auto 16px' }} />
      <Skeleton variant="text" width="60%" height={24} style={{ margin: '0 auto 8px' }} />
      <Skeleton variant="text" width="80%" height={20} style={{ margin: '0 auto 16px' }} />
      <Skeleton variant="rect" width={140} height={36} style={{ margin: '0 auto', borderRadius: 4 }} />
    </Box>
  );
};