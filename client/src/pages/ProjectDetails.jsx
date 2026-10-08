import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getProjectByIdApi,
  updateProjectApi,
  deleteProjectApi,
  getProjectMembersApi,
  addProjectMemberApi,
  removeProjectMemberApi,
  getAdminUsersApi,
} from '../services/api';
import StatusBadge from '../components/StatusBadge';

export const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProjectByIdApi(id);
      if (res.success && res.data) {
        setProject(res.data);
        setMembers(res.data.members || []);
        setEditFormData({
          name: res.data.name || '',
          description: res.data.description || '',
          status: res.data.status || 'Not Started',
          start_date: res.data.start_date || '',
          end_date: res.data.end_date || '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  // Determine manage permission: Super Admin, Admin, or project owner
  const canManage = isSuperAdmin || isAdmin || (project && project.user_id === user?.id);

  // Load available users when opening Add Member Modal
  const handleOpenAddMemberModal = async () => {
    setShowAddMemberModal(true);
    setMemberError('');
    setSelectedUserId('');
    setLoadingUsers(true);
    try {
      const res = await getAdminUsersApi();
      if (res.success && res.data) {
        // Filter out users who are already members or the project owner
        const existingMemberIds = new Set(members.map((m) => m.user_id));
        existingMemberIds.add(project.user_id);

        const eligible = res.data.filter(
          (u) => u.is_active && !existingMemberIds.has(u.id)
        );
        setAvailableUsers(eligible);
        if (eligible.length > 0) {
          setSelectedUserId(eligible[0].id.toString());
        }
      }
    } catch (err) {
      setMemberError('Unable to load users list: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      setEditErrors({ name: 'Project name is required' });
      return;
    }
    if (editFormData.start_date && editFormData.end_date) {
      if (new Date(editFormData.end_date) < new Date(editFormData.start_date)) {
        setEditErrors({ end_date: 'End date cannot be earlier than start date' });
        return;
      }
    }

    setEditSubmitting(true);
    try {
      const res = await updateProjectApi(id, editFormData);
      if (res.success) {
        setShowEditModal(false);
        setActionNotice('Project details updated successfully');
        fetchProjectDetails();
        setTimeout(() => setActionNotice(''), 5000);
      }
    } catch (err) {
      setEditErrors({ general: err.message || 'Update failed' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await deleteProjectApi(id);
      if (res.success) {
        navigate('/projects', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setMemberError('Please select a user');
      return;
    }

    setMemberSubmitting(true);
    try {
      const res = await addProjectMemberApi(id, Number(selectedUserId));
      if (res.success) {
        setShowAddMemberModal(false);
        setActionNotice('Team member added successfully');
        const membersRes = await getProjectMembersApi(id);
        if (membersRes.success) setMembers(membersRes.data);
        setTimeout(() => setActionNotice(''), 5000);
      }
    } catch (err) {
      setMemberError(err.message || 'Failed to add member');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) {
      return;
    }

    try {
      const res = await removeProjectMemberApi(id, userId);
      if (res.success) {
        setActionNotice(`${memberName} removed from project`);
        const membersRes = await getProjectMembersApi(id);
        if (membersRes.success) setMembers(membersRes.data);
        setTimeout(() => setActionNotice(''), 5000);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-container">
        <div className="empty-state-card" style={{ marginTop: '2rem' }}>
          <div className="empty-icon">⚠️</div>
          <h3>Unable to load project</h3>
          <p>{error || 'Project not found or you do not have permission to access it.'}</p>
          <Link to="/projects" className="primary-action-btn" style={{ marginTop: '1.25rem' }}>
            &larr; Return to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <main className="page-content">
        {/* Navigation Breadcrumb */}
        <div className="breadcrumb-bar">
          <Link to="/projects" className="breadcrumb-link">
            &larr; Back to Projects
          </Link>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="auth-alert alert-success">
            <span>✓ {actionNotice}</span>
          </div>
        )}

        {/* Project Header Card */}
        <div className="hero-card">
          <div className="project-detail-header-row">
            <div>
              <div className="badge-wrapper">
                <StatusBadge status={project.status} />
              </div>
              <h1 className="hero-heading" style={{ marginBottom: '0.5rem' }}>
                {project.name}
              </h1>
              <p className="hero-description" style={{ marginBottom: '1.25rem' }}>
                {project.description || 'No description provided for this project.'}
              </p>
            </div>

            {canManage && (
              <div className="project-actions-row">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="secondary-btn"
                  id="edit-project-btn"
                >
                  Edit Project
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="logout-btn"
                  id="delete-project-btn"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="dashboard-info-grid">
            <div className="info-card">
              <span className="info-label">Project Owner</span>
              <span className="info-value">
                {project.user_id === user?.id ? `${project.owner_name} (You)` : project.owner_name}
              </span>
            </div>

            <div className="info-card">
              <span className="info-label">Owner Email</span>
              <span className="info-value">{project.owner_email}</span>
            </div>

            <div className="info-card">
              <span className="info-label">Timeline</span>
              <span className="info-value">
                {project.start_date || 'N/A'} &rarr; {project.end_date || 'N/A'}
              </span>
            </div>

            <div className="info-card">
              <span className="info-label">Team Size</span>
              <span className="info-value">
                {members.length + 1} {members.length === 0 ? 'person (Owner)' : 'contributors'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Members Section */}
        <section className="architecture-card">
          <div className="section-header-row">
            <div>
              <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
                Project Members ({members.length})
              </h2>
              <p className="page-subtitle">
                Team members assigned to collaborate on this project
              </p>
            </div>

            {canManage && (
              <button
                onClick={handleOpenAddMemberModal}
                className="primary-action-btn"
                id="add-member-btn"
              >
                + Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="empty-members-box">
              <p>No team members have been added to this project yet.</p>
              {canManage && (
                <button
                  onClick={handleOpenAddMemberModal}
                  className="secondary-btn"
                  style={{ marginTop: '0.75rem' }}
                >
                  Add team member
                </button>
              )}
            </div>
          ) : (
            <div className="members-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>System Role</th>
                    <th>Joined</th>
                    <th>Added By</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="table-user-cell">
                          <span className="user-avatar-sm">
                            {member.full_name?.charAt(0).toUpperCase()}
                          </span>
                          <span className="user-table-name">{member.full_name}</span>
                        </div>
                      </td>
                      <td>{member.email}</td>
                      <td>
                        <span className="role-tag role-member">{member.role}</span>
                      </td>
                      <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                      <td>{member.added_by_name || 'System'}</td>
                      {canManage && (
                        <td>
                          <button
                            onClick={() => handleRemoveMember(member.user_id, member.full_name)}
                            className="text-danger-btn"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit Project</h2>
              <button onClick={() => setShowEditModal(false)} className="close-btn">
                ✕
              </button>
            </div>

            {editErrors.general && (
              <div className="auth-alert alert-error">
                <span>{editErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={`form-input ${editErrors.name ? 'input-error' : ''}`}
                  disabled={editSubmitting}
                />
                {editErrors.name && <span className="error-text">{editErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="form-input"
                  disabled={editSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="form-input"
                  disabled={editSubmitting}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="form-input"
                    disabled={editSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    className={`form-input ${editErrors.end_date ? 'input-error' : ''}`}
                    disabled={editSubmitting}
                  />
                  {editErrors.end_date && (
                    <span className="error-text">{editErrors.end_date}</span>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="secondary-btn"
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={editSubmitting}
                  style={{ marginTop: 0 }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Add Team Member</h2>
              <button onClick={() => setShowAddMemberModal(false)} className="close-btn">
                ✕
              </button>
            </div>

            {memberError && (
              <div className="auth-alert alert-error">
                <span>{memberError}</span>
              </div>
            )}

            {loadingUsers ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading eligible team members...</p>
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="empty-state-card" style={{ padding: '1.5rem' }}>
                <p>All active users are already members of this project or the project owner.</p>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="secondary-btn"
                  style={{ marginTop: '1rem' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMemberSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Select User *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="form-input"
                    disabled={memberSubmitting}
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.email}) — [{u.role}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="secondary-btn"
                    disabled={memberSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={memberSubmitting}
                    style={{ marginTop: 0 }}
                  >
                    {memberSubmitting ? 'Adding...' : 'Add to Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Project Management System &bull; Project Detail &amp; Team</p>
      </footer>
    </div>
  );
};

export default ProjectDetails;
