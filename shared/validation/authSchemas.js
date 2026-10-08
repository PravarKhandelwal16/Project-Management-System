import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';

export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export const updateRoleSchema = z.object({
  role: z.enum(ROLE_VALUES, {
    errorMap: () => ({ message: "Invalid role selected" })
  })
});

export default {
  registerSchema,
  loginSchema,
  updateRoleSchema
};
