import React from 'react';
import {
  Box,
  Tooltip,
  IconButton,
  Chip,
  makeStyles,
  Theme,
} from '@material-ui/core';
import Lock from '@material-ui/icons/Lock';
import LockOpen from '@material-ui/icons/LockOpen';
import Warning from '@material-ui/icons/Warning';
import Info from '@material-ui/icons/Info';
import { AccessLevel, OwnerInfo } from '@internal/plugin-deployments-common';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  iconButton: {
    padding: theme.spacing(0.5),
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  fullAccessIcon: {
    color: theme.palette.success.main,
    fontSize: '1rem',
  },
  limitedAccessIcon: {
    color: theme.palette.warning.main,
    fontSize: '1rem',
  },
  noAccessIcon: {
    color: theme.palette.error.main,
    fontSize: '1rem',
  },
  infoIcon: {
    color: theme.palette.info.main,
    fontSize: '1rem',
  },
  chip: {
    height: '20px',
    fontSize: '0.75rem',
    '& .MuiChip-label': {
      paddingLeft: theme.spacing(0.75),
      paddingRight: theme.spacing(0.75),
    },
  },
  fullAccessChip: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    '& .MuiChip-icon': {
      color: theme.palette.success.contrastText,
    },
  },
  limitedAccessChip: {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
    '& .MuiChip-icon': {
      color: theme.palette.warning.contrastText,
    },
  },
  noAccessChip: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    '& .MuiChip-icon': {
      color: theme.palette.error.contrastText,
    },
  },
  tooltipContent: {
    maxWidth: '300px',
  },
  tooltipTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },
  tooltipDescription: {
    marginBottom: theme.spacing(1),
  },
  tooltipGuidance: {
    fontSize: '0.875rem',
    fontStyle: 'italic',
  },
}));

export interface AccessIndicatorProps {
  /** Access level for the application */
  accessLevel: AccessLevel;
  /** Information about the application owner */
  ownerInfo?: OwnerInfo;
  /** Whether the current user owns this application */
  isOwned: boolean;
  /** Display mode - icon only or chip with text */
  variant?: 'icon' | 'chip';
  /** Custom tooltip content */
  tooltipContent?: string;
  /** Whether to show the indicator (useful for conditional rendering) */
  show?: boolean;
  /** Additional CSS class name */
  className?: string;
}

export const AccessIndicator: React.FC<AccessIndicatorProps> = ({
  accessLevel,
  ownerInfo,
  isOwned,
  variant = 'icon',
  tooltipContent,
  show = true,
  className,
}) => {
  const classes = useStyles();

  if (!show) {
    return null;
  }

  const getAccessInfo = () => {
    switch (accessLevel) {
      case 'full':
        return {
          icon: <LockOpen className={classes.fullAccessIcon} />,
          label: 'Full Access',
          chipClass: classes.fullAccessChip,
          title: 'Full Access',
          description: isOwned 
            ? 'You own this application and have full access to its deployment data.'
            : 'You have full access to this application\'s deployment data.',
          guidance: 'You can view deployment history, trigger deployments, and manage configurations.',
        };
      case 'limited':
        return {
          icon: <Warning className={classes.limitedAccessIcon} />,
          label: 'Limited Access',
          chipClass: classes.limitedAccessChip,
          title: 'Limited Access',
          description: 'You have limited access to this application\'s deployment data.',
          guidance: 'You may not be able to trigger deployments or access all deployment information. Contact the application owner for full access.',
        };
      case 'none':
        return {
          icon: <Lock className={classes.noAccessIcon} />,
          label: 'No Access',
          chipClass: classes.noAccessChip,
          title: 'No Access',
          description: 'You do not have access to this application\'s deployment data.',
          guidance: 'Contact the application owner to request access to deployment information.',
        };
      default:
        return {
          icon: <Info className={classes.infoIcon} />,
          label: 'Unknown',
          chipClass: '',
          title: 'Access Unknown',
          description: 'Unable to determine your access level for this application.',
          guidance: 'Try refreshing the page or contact support if the issue persists.',
        };
    }
  };

  const accessInfo = getAccessInfo();

  const getTooltipContent = () => {
    if (tooltipContent) {
      return tooltipContent;
    }

    const ownerText = ownerInfo 
      ? `Owner: ${ownerInfo.displayName} (${ownerInfo.type})`
      : '';

    return (
      <Box className={classes.tooltipContent}>
        <Box className={classes.tooltipTitle}>
          {accessInfo.title}
        </Box>
        <Box className={classes.tooltipDescription}>
          {accessInfo.description}
        </Box>
        {ownerText && (
          <Box className={classes.tooltipDescription}>
            {ownerText}
          </Box>
        )}
        <Box className={classes.tooltipGuidance}>
          {accessInfo.guidance}
        </Box>
      </Box>
    );
  };

  const renderIcon = () => (
    <Tooltip 
      title={getTooltipContent()} 
      placement="top"
      arrow
      enterDelay={300}
      leaveDelay={200}
    >
      <IconButton 
        className={classes.iconButton}
        size="small"
        aria-label={`${accessInfo.title} - ${accessInfo.description}`}
        tabIndex={0}
      >
        {accessInfo.icon}
      </IconButton>
    </Tooltip>
  );

  const renderChip = () => (
    <Tooltip 
      title={getTooltipContent()} 
      placement="top"
      arrow
      enterDelay={300}
      leaveDelay={200}
    >
      <Chip
        icon={accessInfo.icon}
        label={accessInfo.label}
        size="small"
        className={`${classes.chip} ${accessInfo.chipClass}`}
        aria-label={`${accessInfo.title} - ${accessInfo.description}`}
      />
    </Tooltip>
  );

  return (
    <Box className={`${classes.container} ${className || ''}`}>
      {variant === 'icon' ? renderIcon() : renderChip()}
    </Box>
  );
};