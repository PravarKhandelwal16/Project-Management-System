import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  email_task_assigned: z.boolean().optional(),
  email_due_tomorrow: z.boolean().optional(),
  email_overdue: z.boolean().optional(),
  web_task_assigned: z.boolean().optional(),
  web_due_tomorrow: z.boolean().optional(),
  web_overdue: z.boolean().optional(),
  browser_task_assigned: z.boolean().optional(),
  browser_due_tomorrow: z.boolean().optional(),
  push_due_tomorrow: z.boolean().optional()
}).strict();

export default {
  updatePreferencesSchema
};

export const pushDeviceSchema = z.object({
  token: z.string().max(255).regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
  platform: z.enum(['android', 'ios'])
}).strict();
export const removePushDeviceSchema = pushDeviceSchema.pick({token:true});
