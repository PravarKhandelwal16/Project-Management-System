import { z } from 'zod';
export const dateField=z.string().refine(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='1000-01-01'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'Use a valid YYYY-MM-DD date');
export const optionalDate=z.union([dateField,z.literal('')]).nullable().optional();
export const identifier=z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER),z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger)]);
export const descriptionField=z.string().max(5000).nullable().optional();
export const passwordField=z.string().min(8).refine(value=>new TextEncoder().encode(value).length<=72,'Password cannot exceed 72 UTF-8 bytes').refine(value=>/[a-zA-Z]/.test(value)&&/[0-9]/.test(value),'Password must contain a letter and a number');
