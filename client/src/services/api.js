/**
 * API Service for Project Management System
 * Handles communication with Express backend, JWT headers, and error normalization
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/**
 * Custom error class for API failures
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base fetch wrapper with error handling and JSON parsing
 */
export const apiRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    data = null,
    token = null,
    headers = {},
  } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Attach token if provided or from localStorage
  const authToken = token || localStorage.getItem('pms_token');
  if (authToken) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  const fetchConfig = {
    method,
    headers: requestHeaders,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchConfig.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, fetchConfig);
    let responseData = null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { message: response.ok ? text : 'The server could not complete this request. Please try again.' };
    }

    if (!response.ok) {
      if(response.status===401 && authToken && !endpoint.startsWith('/auth/'))window.dispatchEvent(new Event('pms:session-expired'));
      const errorMessage =
        (responseData && responseData.message) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or parse error
    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      0,
      null
    );
  }
};

/**
 * Health check endpoint
 */
export const checkHealth = async () => {
  try {
    return await apiRequest('/health');
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/* ==========================================================
   Authentication Endpoints
   ========================================================== */

export const registerApi = async ({ full_name, email, password }) => {
  return await apiRequest('/auth/register', {
    method: 'POST',
    data: { full_name, email, password },
  });
};

export const loginApi = async ({ email, password }) => {
  return await apiRequest('/auth/login', {
    method: 'POST',
    data: { email, password },
  });
};

export const getMeApi = async (token = null) => {
  return await apiRequest('/auth/me', {
    method: 'GET',
    token,
  });
};

export const logoutApi = async (token = null) => {
  try {
    return await apiRequest('/auth/logout', {
      method: 'POST',
      token,
    });
  } catch {
    return { success: true };
  }
};

/* ==========================================================
   Project CRUD Endpoints
   ========================================================== */

export const getProjectsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const queryString = query.toString();
  return await apiRequest(`/projects${queryString ? `?${queryString}` : ''}`);
};

export const getProjectByIdApi = async (id) => {
  return await apiRequest(`/projects/${id}`);
};

export const createProjectApi = async (projectData) => {
  return await apiRequest('/projects', {
    method: 'POST',
    data: projectData,
  });
};

export const updateProjectApi = async (id, projectData) => {
  return await apiRequest(`/projects/${id}`, {
    method: 'PUT',
    data: projectData,
  });
};

export const deleteProjectApi = async (id) => {
  return await apiRequest(`/projects/${id}`, {
    method: 'DELETE',
  });
};

/* ==========================================================
   Project Membership Endpoints
   ========================================================== */

export const getProjectMembersApi = async (projectId) => {
  return await apiRequest(`/projects/${projectId}/members`);
};

export const addProjectMemberApi = async (projectId, userId) => {
  return await apiRequest(`/projects/${projectId}/members`, {
    method: 'POST',
    data: { user_id: userId },
  });
};

export const removeProjectMemberApi = async (projectId, userId) => {
  return await apiRequest(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
};

/* ==========================================================
   Admin Endpoints
   ========================================================== */

export const getAdminUsersApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.role) query.append('role', params.role);
  if (params.is_active !== undefined && params.is_active !== '') {
    query.append('is_active', params.is_active);
  }

  const queryString = query.toString();
  return await apiRequest(`/admin/users${queryString ? `?${queryString}` : ''}`);
};

export const getAdminUserApi = async (id) => {
  return await apiRequest(`/admin/users/${id}`);
};

export const updateUserRoleApi = async (id, role) => {
  return await apiRequest(`/admin/users/${id}/role`, {
    method: 'PATCH',
    data: { role },
  });
};

export const updateUserStatusApi = async (id, isActive) => {
  return await apiRequest(`/admin/users/${id}/status`, {
    method: 'PATCH',
    data: { is_active: isActive },
  });
};

export const getAdminStatsApi = async () => {
  return await apiRequest('/admin/stats');
};

export const getAuditLogsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.action) query.append('action', params.action);
  if (params.resource_type) query.append('resource_type', params.resource_type);
  if (params.limit) query.append('limit', params.limit);
  
  const queryString = query.toString();
  return await apiRequest(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
};

export const getDashboardDataApi = async () => {
  return await apiRequest('/dashboard');
};

export const getSearchApi = async (query) => {
  return await apiRequest(`/search?q=${encodeURIComponent(query)}`);
};

export const getTasksApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.project_id) query.append('project_id', params.project_id);
  if (params.status) query.append('status', params.status);
  if (params.priority) query.append('priority', params.priority);
  if (params.assigned_to) query.append('assigned_to', params.assigned_to);
  if (params.search) query.append('search', params.search);
  
  const queryString = query.toString();
  return await apiRequest(`/tasks${queryString ? `?${queryString}` : ''}`);
};

export const getProjectTasksApi = async (projectId) => {
  return await apiRequest(`/projects/${projectId}/tasks`);
};

export const getTaskByIdApi = async (id) => {
  return await apiRequest(`/tasks/${id}`);
};

export const createTaskApi = async (data) => {
  return await apiRequest('/tasks', { method: 'POST', data });
};

export const updateTaskApi = async (id, data) => {
  return await apiRequest(`/tasks/${id}`, { method: 'PUT', data });
};

export const updateTaskStatusApi = async (id, status) => {
  return await apiRequest(`/tasks/${id}/status`, { method: 'PATCH', data: { status } });
};

export const updateTaskPriorityApi = async (id, priority) => {
  return await apiRequest(`/tasks/${id}/priority`, { method: 'PATCH', data: { priority } });
};

export const assignTaskApi = async (id, assigned_to) => {
  return await apiRequest(`/tasks/${id}/assign`, { method: 'PATCH', data: { assigned_to } });
};

export const deleteTaskApi = async (id) => {
  return await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
};

export default {
  apiRequest,
  checkHealth,
  registerApi,
  loginApi,
  getMeApi,
  logoutApi,
  getProjectsApi,
  getProjectByIdApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  getProjectMembersApi,
  addProjectMemberApi,
  removeProjectMemberApi,
  getAdminUsersApi,
  getAdminUserApi,
  updateUserRoleApi,
  updateUserStatusApi,
  getAdminStatsApi,
  getAuditLogsApi,
  getDashboardDataApi,
  getSearchApi,
  getTasksApi,
  getProjectTasksApi,
  getTaskByIdApi,
  createTaskApi,
  updateTaskApi,
  updateTaskStatusApi,
  updateTaskPriorityApi,
  assignTaskApi,
  deleteTaskApi
};

/* ==========================================================
 * NOTIFICATIONS API
 * ========================================================== */

export const getNotificationsApi = async (params = { limit: 50, offset: 0 }) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/notifications?${query}`);
};

export const getUnreadNotificationCountApi = async () => {
  return apiRequest('/notifications/unread-count');
};

export const markNotificationReadApi = async (id) => {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
};

export const markAllNotificationsReadApi = async () => {
  return apiRequest('/notifications/read-all', { method: 'PATCH' });
};

export const getNotificationPreferencesApi = async () => {
  return apiRequest('/notifications/preferences');
};

export const updateNotificationPreferencesApi = async (data) => {
  return apiRequest('/notifications/preferences', {
    method: 'PUT',
    data,
  });
};
