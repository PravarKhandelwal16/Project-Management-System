import { z } from 'zod';
import { TASK_STATUS_VALUES } from '../constants/taskStatus.js';
import { TASK_PRIORITY_VALUES } from '../constants/taskPriority.js';

export const createTaskSchema = z.object({
  project_id: z.number().or(z.string().regex(/^\d+$/).transform(Number)),
  title: z.string().min(1, "Task title is required").max(150),
  description: z.string().optional().nullable(),
  status: z.enum(TASK_STATUS_VALUES).default('Pending'),
  priority: z.enum(TASK_PRIORITY_VALUES).default('Medium'),
  assigned_to: z.number().or(z.string().regex(/^\d+$/).transform(Number)).optional().nullable(),
  due_date: z.string().optional().nullable()
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(150).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  assigned_to: z.number().or(z.string().regex(/^\d+$/).transform(Number)).optional().nullable(),
  due_date: z.string().optional().nullable()
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUS_VALUES, {
    errorMap: () => ({ message: "Invalid task status" })
  })
});

export const assignTaskSchema = z.object({
  assigned_to: z.number().or(z.string().regex(/^\d+$/).transform(Number)).nullable()
});

export default {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema
};
