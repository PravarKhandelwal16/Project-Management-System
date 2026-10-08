import { z } from 'zod';
import { PROJECT_STATUS_VALUES } from '../constants/projectStatus.js';
import { optionalDate,descriptionField } from './fields.js';
const fields={name:z.string().trim().min(2).max(255),description:descriptionField,status:z.enum(PROJECT_STATUS_VALUES),start_date:optionalDate,end_date:optionalDate};
const dates=data=>!data.start_date||!data.end_date||data.end_date>=data.start_date;
export const createProjectSchema=z.object({...fields,status:fields.status.default('Not Started')}).strict().refine(dates,'End date cannot precede start date');
export const updateProjectSchema=z.object(fields).partial().strict().refine(dates,'End date cannot precede start date');
export default {createProjectSchema,updateProjectSchema};
