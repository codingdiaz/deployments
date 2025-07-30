/**
 * Zod validation schemas for environment-related API endpoints
 */

import { z } from 'zod';

/**
 * Schema for creating a new environment configuration
 */
export const createEnvironmentSchema = z.object({
  environmentName: z
    .string()
    .min(1, 'Environment name is required')
    .max(50, 'Environment name must be 50 characters or less')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Environment name can only contain letters, numbers, hyphens, and underscores'),
  
  workflowPath: z
    .string()
    .regex(/^\.github\/workflows\/.*\.ya?ml$/, 'Workflow path must be a YAML file in .github/workflows/')
    .optional(),
});

/**
 * Schema for updating an existing environment configuration
 */
export const updateEnvironmentSchema = z.object({
  workflowPath: z
    .string()
    .regex(/^\.github\/workflows\/.*\.ya?ml$/, 'Workflow path must be a YAML file in .github/workflows/')
    .optional(),
});

/**
 * Schema for component name parameter validation
 */
export const componentNameSchema = z
  .string()
  .min(1, 'Component name is required')
  .max(100, 'Component name must be 100 characters or less')
  .regex(/^[a-zA-Z0-9-_.]+$/, 'Component name can only contain letters, numbers, hyphens, underscores, and dots');

/**
 * Schema for environment name parameter validation
 */
export const environmentNameSchema = z
  .string()
  .min(1, 'Environment name is required')
  .max(50, 'Environment name must be 50 characters or less')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Environment name can only contain letters, numbers, hyphens, and underscores');

/**
 * Type definitions derived from schemas
 */
export type CreateEnvironmentRequest = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentRequest = z.infer<typeof updateEnvironmentSchema>;