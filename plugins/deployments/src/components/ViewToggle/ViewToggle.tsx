import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Typography,
  makeStyles,
  Chip,
} from '@material-ui/core';
import {
  Person as PersonIcon,
  Group as GroupIcon,
} from '@material-ui/icons';
import { ViewMode } from '@internal/plugin-deployments-common';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  buttonGroup: {
    '& .MuiButton-root': {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  activeButton: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  inactiveButton: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  countChip: {
    marginLeft: theme.spacing(1),
    fontSize: '0.75rem',
    height: '20px',
  },
  label: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
}));

export interface ViewToggleProps {
  /** Current view mode */
  currentView: ViewMode;
  /** Callback when view changes */
  onViewChange: (view: ViewMode) => void;
  /** Number of owned applications */
  ownedCount: number;
  /** Total number of applications */
  totalCount: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS class name */
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  ownedCount,
  totalCount,
  disabled = false,
  className,
}) => {
  const classes = useStyles();

  const handleViewChange = (view: ViewMode) => {
    if (!disabled && view !== currentView) {
      onViewChange(view);
    }
  };

  return (
    <Box className={`${classes.container} ${className || ''}`}>
      <Typography className={classes.label}>
        View:
      </Typography>
      
      <ButtonGroup 
        className={classes.buttonGroup}
        variant="outlined"
        disabled={disabled}
        aria-label="application view toggle"
      >
        <Button
          className={currentView === 'owned' ? classes.activeButton : classes.inactiveButton}
          onClick={() => handleViewChange('owned')}
          startIcon={<PersonIcon />}
          aria-label={`My Applications (${ownedCount})`}
          aria-pressed={currentView === 'owned'}
        >
          My Applications
          <Chip
            label={ownedCount}
            size="small"
            className={classes.countChip}
            color={currentView === 'owned' ? 'secondary' : 'default'}
          />
        </Button>
        
        <Button
          className={currentView === 'all' ? classes.activeButton : classes.inactiveButton}
          onClick={() => handleViewChange('all')}
          startIcon={<GroupIcon />}
          aria-label={`All Applications (${totalCount})`}
          aria-pressed={currentView === 'all'}
        >
          All Applications
          <Chip
            label={totalCount}
            size="small"
            className={classes.countChip}
            color={currentView === 'all' ? 'secondary' : 'default'}
          />
        </Button>
      </ButtonGroup>
    </Box>
  );
};