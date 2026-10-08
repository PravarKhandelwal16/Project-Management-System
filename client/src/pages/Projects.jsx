import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectsApi, createProjectApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export const Projects = () => {
  const { canCreateProject } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    status: 'Not Started',
    start_date: '',
    end_date: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProjectsApi({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name]) {
      setCreateErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createFormData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (createFormData.name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters';
    }

    if (createFormData.start_date && createFormData.end_date) {
      if (new Date(createFormData.end_date) < new Date(createFormData.start_date)) {
        errors.end_date = 'End date cannot be earlier than start date';
      }
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validateCreateForm()) return;

    setCreateSubmitting(true);
    try {
      const res = await createProjectApi(createFormData);
      if (res.success) {
        setShowCreateModal(false);
        setCreateFormData({
          name: '',
          description: '',
          status: 'Not Started',
          start_date: '',
          end_date: '',
        });
        fetchProjects();
        // Option to navigate to newly created project
        if (res.data?.id) {
          navigate(`/projects/${res.data.id}`);
        }
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create project');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <main className="page-content">
        {/* Header & Actions */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">
              Manage your team initiatives, track progress, and organize memberships
            </p>
          </div>

          {canCreateProject && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="primary-action-btn"
              id="open-create-project-btn"
            >
              + Create Project
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search projects by name..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="filter-select"
            >
              <option value="created_at:DESC">Newest First</option>
              <option value="created_at:ASC">Oldest First</option>
              <option value="name:ASC">Name (A-Z)</option>
              <option value="name:DESC">Name (Z-A)</option>
              <option value="start_date:DESC">Start Date</option>
              <option value="end_date:ASC">Due Date (Earliest)</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="auth-alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Project Cards Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon">📁</div>
            <h3>No projects found</h3>
            <p>
              {search || statusFilter
                ? 'No projects match your current filters.'
                : 'No projects are assigned to your account yet.'}
            </p>
            {canCreateProject && !search && !statusFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="primary-action-btn"
                style={{ marginTop: '1rem' }}
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="project-card-header">
                  <h3 className="project-title">{project.name}</h3>
                  <StatusBadge status={project.status} />
                </div>

                <p className="project-desc">
                  {project.description || 'No description provided.'}
                </p>

                <div className="project-dates">
                  <span>
                    📅 {project.start_date || 'No start'} &rarr; {project.end_date || 'No end'}
                  </span>
                </div>

                <div className="project-card-footer">
                  <div className="project-owner-info">
                    <span className="owner-label">Owner:</span>
                    <span className="owner-name">
                      {project.is_owner ? 'You' : project.owner_name}
                    </span>
                  </div>

                  <span className="members-badge">
                    👥 {project.member_count} {project.member_count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                ✕
              </button>
            </div>

            {modalError && (
              <div className="auth-alert alert-error">
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  name="name"
                  value={createFormData.name}
                  onChange={handleCreateChange}
                  placeholder="e.g. Q4 Website Redesign"
                  className={`form-input ${createErrors.name ? 'input-error' : ''}`}
                  disabled={createSubmitting}
                />
                {createErrors.name && <span className="error-text">{createErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  value={createFormData.description}
                  onChange={handleCreateChange}
                  placeholder="Goals, deliverables, and specifications..."
                  className="form-input"
                  disabled={createSubmitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    value={createFormData.status}
                    onChange={handleCreateChange}
                    className="form-input"
                    disabled={createSubmitting}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={createFormData.start_date}
                    onChange={handleCreateChange}
                    className="form-input"
                    disabled={createSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={createFormData.end_date}
                    onChange={handleCreateChange}
                    className={`form-input ${createErrors.end_date ? 'input-error' : ''}`}
                    disabled={createSubmitting}
                  />
                  {createErrors.end_date && (
                    <span className="error-text">{createErrors.end_date}</span>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="secondary-btn"
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={createSubmitting}
                  style={{ marginTop: 0 }}
                >
                  {createSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Project Management System &bull; Projects Overview</p>
      </footer>
    </div>
  );
};

export default Projects;
