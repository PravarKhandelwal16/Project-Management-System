import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';
import { passwordField } from './fields.js';
export const registerSchema=z.object({full_name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(255),password:passwordField}).strict();
export const loginSchema=z.object({email:z.string().trim().email().max(255),password:z.string().min(1).refine(value=>new TextEncoder().encode(value).length<=72)}).strict();
export const updateRoleSchema=z.object({role:z.enum(ROLE_VALUES)}).strict();
export default {registerSchema,loginSchema,updateRoleSchema};
