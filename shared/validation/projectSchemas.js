import { z } from 'zod';
import { PROJECT_STATUS_VALUES } from '../constants/projectStatus.js';

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUS_VALUES).default('Not Started'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable()
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUS_VALUES).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable()
});

export default {
  createProjectSchema,
  updateProjectSchema
};
