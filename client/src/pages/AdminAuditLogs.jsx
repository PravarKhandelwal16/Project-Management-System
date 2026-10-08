import { useState, useEffect } from 'react';
import { getAuditLogsApi } from '../services/api';
import './AdminAuditLogs.css';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', resource_type: '', action: '' });
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsApi({ ...filters, limit: 100 });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    fetchLogs();
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    return details;
  };

  return (
    <div className="audit-logs-page">
      <header className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">View system-wide activity logs and track changes.</p>
      </header>

      <div className="filters-card">
        <input 
          type="text" 
          name="search" 
          placeholder="Search details..." 
          value={filters.search} 
          onChange={handleFilterChange} 
          className="filter-input"
        />
        <select name="resource_type" value={filters.resource_type} onChange={handleFilterChange} className="filter-select">
          <option value="">All Resources</option>
          <option value="USER">User</option>
          <option value="PROJECT">Project</option>
          <option value="TASK">Task</option>
        </select>
        <select name="action" value={filters.action} onChange={handleFilterChange} className="filter-select">
          <option value="">All Actions</option>
          <option value="USER_ROLE_UPDATED">Role Updated</option>
          <option value="USER_STATUS_UPDATED">Status Updated</option>
          <option value="PROJECT_CREATED">Project Created</option>
          <option value="PROJECT_DELETED">Project Deleted</option>
          <option value="TASK_CREATED">Task Created</option>
          <option value="TASK_DELETED">Task Deleted</option>
        </select>
        <button onClick={handleApplyFilter} className="btn btn-primary">Apply Filters</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading logs...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_name || 'System'}</td>
                  <td><span className="badge badge-action">{log.action}</span></td>
                  <td>{log.resource_type} (ID: {log.resource_id})</td>
                  <td className="details-cell">
                    <pre className="details-pre">{formatDetails(log.details)}</pre>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="empty-state">No audit logs found matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
