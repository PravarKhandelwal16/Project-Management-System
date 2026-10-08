import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminUsersApi,
  updateUserRoleApi,
  updateUserStatusApi,
} from '../services/api';


export const AdminUsers = () => {
  const { user: currentUser, isSuperAdmin, isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Role Edit Modal
  const [targetUser, setTargetUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUsersApi({
        search,
        role: roleFilter,
        is_active: statusFilter,
      });
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user list');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenRoleModal = (u) => {
    setTargetUser(u);
    setSelectedRole(u.role);
    setRoleError('');
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;
    setRoleError('');
    setUpdatingRole(true);

    try {
      const res = await updateUserRoleApi(targetUser.id, selectedRole);
      if (res.success) {
        setTargetUser(null);
        setFeedbackNotice(`Role updated successfully for ${targetUser.full_name}`);
        fetchUsers();
        setTimeout(() => setFeedbackNotice(''), 5000);
      }
    } catch (err) {
      setRoleError(err.message || 'Failed to update user role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleStatus = async (u) => {
    const actionName = u.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionName} account for ${u.full_name}?`)) {
      return;
    }

    try {
      const res = await updateUserStatusApi(u.id, !u.is_active);
      if (res.success) {
        setFeedbackNotice(`Account ${actionName}d for ${u.full_name}`);
        fetchUsers();
        setTimeout(() => setFeedbackNotice(''), 5000);
      }
    } catch (err) {
      setError(err.message || `Failed to ${actionName} account`);
    }
  };

  // Determine which roles are available for assignment
  const getAssignableRoles = (target) => {
    if (isSuperAdmin) {
      return [
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'project_manager', label: 'Project Manager' },
        { value: 'member', label: 'Member' },
      ];
    }
    if (isAdmin) {
      // Admins can only assign project_manager or member
      return [
        { value: 'project_manager', label: 'Project Manager' },
        { value: 'member', label: 'Member' },
      ];
    }
    return [];
  };

  const canModifyRole = (u) => {
    if (isSuperAdmin) return true;
    if (isAdmin) {
      // Admin cannot modify Super Admin or themselves
      return u.role !== 'super_admin' && u.id !== currentUser.id;
    }
    return false;
  };

  const canModifyStatus = (u) => {
    if (isSuperAdmin) return true;
    if (isAdmin) {
      return u.role !== 'super_admin' && u.id !== currentUser.id;
    }
    return false;
  };

  return (
    <div className="page-container">
      <main className="page-content">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">User Administration</h1>
            <p className="page-subtitle">
              Manage team accounts, assign RBAC permissions, and control access statuses
            </p>
          </div>
        </div>

        {/* Action feedback */}
        {feedbackNotice && (
          <div className="auth-alert alert-success">
            <span>✓ {feedbackNotice}</span>
          </div>
        )}

        {error && (
          <div className="auth-alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button onClick={() => setSearch('')} className="clear-search-btn">
                ✕
              </button>
            )}
          </div>

          <div className="filter-selects">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="member">Member</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">👥</div>
            <h3>No users found</h3>
            <p>No user accounts matched your search criteria.</p>
          </div>
        ) : (
          <div className="architecture-card" style={{ padding: '0.75rem' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                    <td>
                      <div className="table-user-cell">
                        <span className="user-avatar-sm">
                          {u.full_name?.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="user-table-name">{u.full_name}</div>
                          {u.id === currentUser.id && (
                            <span className="you-indicator">(You)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-tag role-${u.role}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          u.is_active ? 'status-pill-active' : 'status-pill-inactive'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        {canModifyRole(u) ? (
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            className="secondary-btn btn-sm"
                          >
                            Change Role
                          </button>
                        ) : (
                          <span className="locked-action">Protected</span>
                        )}

                        {canModifyStatus(u) && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={u.is_active ? 'text-danger-btn btn-sm' : 'text-success-btn btn-sm'}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Role Change Modal */}
      {targetUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Change User Role</h2>
              <button onClick={() => setTargetUser(null)} className="close-btn">
                ✕
              </button>
            </div>

            <p className="modal-subtitle">
              Modify permissions for <strong>{targetUser.full_name}</strong> ({targetUser.email})
            </p>

            {roleError && (
              <div className="auth-alert alert-error">
                <span>{roleError}</span>
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Select New Role *</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-input"
                  disabled={updatingRole}
                >
                  {getAssignableRoles(targetUser).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setTargetUser(null)}
                  className="secondary-btn"
                  disabled={updatingRole}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={updatingRole}
                  style={{ marginTop: 0 }}
                >
                  {updatingRole ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Project Management System &bull; Administrative User Management</p>
      </footer>
    </div>
  );
};

export default AdminUsers;
