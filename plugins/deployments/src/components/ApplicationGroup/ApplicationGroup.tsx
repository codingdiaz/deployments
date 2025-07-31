import { FC, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Grid,
  IconButton,
  Typography,
  Chip,
  makeStyles,
  Theme,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ComponentEntity } from '@backstage/catalog-model';
import { Link } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { ApplicationGroup, ViewMode } from '@internal/plugin-deployments-common';
import { AccessIndicator } from '../AccessIndicator';
import { GitHubRepoLink } from '../GitHubRepoLink';
import { applicationDeploymentRouteRef } from '../../routes';
import { useEnvironments } from '../../hooks/useDeploymentApi';
import { ANNOTATIONS } from '@internal/plugin-deployments-common';


const useStyles = makeStyles((theme: Theme) => ({
  groupCard: {
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
  },
  groupHeader: {
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
  },
  groupHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  ownerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  ownerAvatar: {
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: theme.palette.primary.main,
    fontSize: '0.875rem',
  },
  ownerDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  ownerName: {
    fontWeight: 600,
    fontSize: '1rem',
  },
  ownerType: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textTransform: 'capitalize',
  },
  groupActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  applicationCount: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
  expandButton: {
    padding: theme.spacing(0.5),
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandButtonRotated: {
    transform: 'rotate(180deg)',
  },
  groupContent: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
  },
  applicationCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: theme.transitions.create(['box-shadow', 'transform'], {
      duration: theme.transitions.duration.short,
    }),
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'translateY(-2px)',
    },
  },
  applicationCardContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing(1),
  },
  applicationHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  applicationTitle: {
    fontWeight: 600,
    fontSize: '1rem',
    color: theme.palette.text.primary,
    textDecoration: 'none',
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  applicationDescription: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginBottom: theme.spacing(1),
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  applicationMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: 'auto',
  },
  metaChip: {
    height: '20px',
    fontSize: '0.75rem',
  },
  environmentChip: {
    height: '18px',
    fontSize: '0.6875rem',
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    '& .MuiChip-label': {
      paddingLeft: theme.spacing(0.75),
      paddingRight: theme.spacing(0.75),
    },
  },
  unassignedGroup: {
    '& $groupHeader': {
      backgroundColor: theme.palette.warning.light,
    },
    '& $ownerAvatar': {
      backgroundColor: theme.palette.warning.main,
    },
  },
}));

interface ApplicationCardProps {
  entity: ComponentEntity;
  showAccessIndicator: boolean;
  currentView: ViewMode;
  isOwned: boolean;
}

const ApplicationCard: FC<ApplicationCardProps> = ({
  entity,
  showAccessIndicator,
  currentView,
  isOwned,
}) => {
  const classes = useStyles();
  const applicationDeploymentRoute = useRouteRef(applicationDeploymentRouteRef);

  const componentName = entity.metadata.name;
  const description = entity.metadata.description || 'No description available';
  const sourceLocation = entity.metadata.annotations?.[ANNOTATIONS.SOURCE_LOCATION];

  // Fetch environments for this application
  const { environments, loading: environmentsLoading, error: environmentsError, loadEnvironments } = useEnvironments(componentName);

  // Load environments when component mounts or componentName changes
  useEffect(() => {
    if (componentName) {
      loadEnvironments();
    }
  }, [componentName, loadEnvironments]);


  // Extract GitHub repo info from source location
  const getGitHubInfo = (url?: string) => {
    if (!url) return null;
    
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        url: url,
      };
    }
    return null;
  };

  const githubInfo = getGitHubInfo(sourceLocation);

  return (
    <Card className={classes.applicationCard}>
      <CardContent className={classes.applicationCardContent}>
        <Box className={classes.applicationHeader}>
          <Link 
            to={applicationDeploymentRoute({ componentName })}
            className={classes.applicationTitle}
          >
            {componentName}
          </Link>
          {showAccessIndicator && currentView === 'all' && (
            <AccessIndicator
              accessLevel={isOwned ? 'full' : 'limited'}
              isOwned={isOwned}
              variant="icon"
              show={!isOwned}
            />
          )}
        </Box>

        <Typography className={classes.applicationDescription}>
          {description}
        </Typography>

        <Box className={classes.applicationMeta}>
          {entity.spec?.type && (
            <Chip 
              label={String(entity.spec.type)} 
              size="small" 
              className={classes.metaChip}
              color="primary"
              variant="outlined"
            />
          )}
          {environmentsLoading && (
            <Chip
              label="Loading..."
              size="small"
              className={classes.metaChip}
              variant="outlined"
              disabled
            />
          )}
          {environmentsError && (
            <Chip
              label="Error loading envs"
              size="small"
              className={classes.metaChip}
              variant="outlined"
              color="secondary"
            />
          )}
          {!environmentsLoading && !environmentsError && environments.map((env) => (
            <Chip
              key={env.environmentName}
              label={env.environmentName}
              size="small"
              className={classes.environmentChip}
              variant="default"
            />
          ))}
        </Box>

        {githubInfo && (
          <Box marginTop={0.5}>
            <GitHubRepoLink 
              repo={`${githubInfo.owner}/${githubInfo.repo}`}
              variant="body2"
              iconSize="0.875rem"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export interface ApplicationGroupProps {
  /** Application group data */
  group: ApplicationGroup;
  /** Current view mode */
  currentView: ViewMode;
  /** Current user entity reference */
  currentUserRef?: string;
  /** Whether to show access indicators */
  showAccessIndicators?: boolean;
  /** Whether the group should be expanded by default */
  defaultExpanded?: boolean;
  /** Additional CSS class name */
  className?: string;
}

export const ApplicationGroupComponent: FC<ApplicationGroupProps> = ({
  group,
  currentView,
  currentUserRef,
  showAccessIndicators = true,
  defaultExpanded = true,
  className,
}) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };


  const isUnassigned = group.owner.name === 'unassigned';
  const cardClassName = `${classes.groupCard} ${isUnassigned ? classes.unassignedGroup : ''} ${className || ''}`;

  return (
    <Card className={cardClassName}>
      <CardHeader
        className={classes.groupHeader}
        title={
          <Box className={classes.groupHeaderContent}>
            <Box className={classes.ownerInfo}>
              <Box className={classes.ownerDetails}>
                <Typography className={classes.ownerName}>
                  {group.owner.displayName}
                </Typography>
              </Box>
            </Box>
            
            <Box className={classes.groupActions}>
              <Typography className={classes.applicationCount}>
                {group.applications.length} application{group.applications.length !== 1 ? 's' : ''}
              </Typography>
              
              <IconButton
                className={`${classes.expandButton} ${expanded ? classes.expandButtonRotated : ''}`}
                onClick={handleExpandClick}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse group' : 'Expand group'}
                size="small"
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>
          </Box>
        }
        disableTypography
      />
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent className={classes.groupContent}>
          <Grid container spacing={2}>
            {group.applications.map((application) => {
              const isOwned = Boolean(group.isUserGroup || 
                (currentUserRef && application.spec?.owner === currentUserRef));
              
              return (
                <Grid item xs={12} sm={6} md={4} key={application.metadata.name}>
                  <ApplicationCard
                    entity={application}
                    showAccessIndicator={showAccessIndicators}
                    currentView={currentView}
                    isOwned={isOwned}
                  />
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};