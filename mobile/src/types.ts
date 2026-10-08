export type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  permissions: string[];
  is_active?: boolean;
};
export type Row = Record<string, any>;
export type Envelope<T = Row> = {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  total?: number;
  page?: number;
  limit?: number;
  pagination?: { page: number; limit: number; has_more: boolean };
};
export type RootParams = {
  Home: undefined;
  ProjectDetails: { id: number };
  ProjectForm: { id?: number } | undefined;
  TaskDetails: { id: number };
  TaskForm: { id?: number; projectId?: number } | undefined;
  Analytics: undefined;
  Team: { projectId?: number } | undefined;
  Settings: undefined;
  AdminUsers: undefined;
  UserDetails: { id: number };
  Roles: undefined;
  AuditLogs: undefined;
};
