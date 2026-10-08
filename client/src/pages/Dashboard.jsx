import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardDataApi } from '../services/api';
import { 
  FolderKanban, 
  CheckSquare, 
  AlertCircle,
  Clock,
  Activity,
  Plus
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import ProjectStatusChart from '../components/dashboard/ProjectStatusChart';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import TaskActivityChart from '../components/dashboard/TaskActivityChart';
import WeeklyProductivityChart from '../components/dashboard/WeeklyProductivityChart';
import StatusBadge from '../components/StatusBadge';
import './Dashboard.css';

const Dashboard = () => {
  const { user, canCreateProject } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await getDashboardDataApi();
        if (isMounted && res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="dashboard-error">Failed to load dashboard data.</div>;
  }

  const { summary, projectStatus, taskStatus, taskActivity, weeklyProductivity, activeProjects, upcomingTasks, overdueTasks, recentActivity } = data;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Overview</h1>
          <p className="dashboard-subtitle">Here is what's happening in your projects today.</p>
        </div>
        <div className="dashboard-actions">
          {canCreateProject && (
            <Link to="/projects/new" className="btn btn-primary">
              <Plus size={18} />
              New Project
            </Link>
          )}
        </div>
      </header>

      {/* Metrics Row */}
      <section className="metrics-grid">
        <StatCard 
          title="Total Projects" 
          value={summary.totalProjects} 
          icon={FolderKanban} 
          color="#2563eb"
          subtitle={`${summary.projectsInProgress} in progress`}
        />
        <StatCard 
          title="Total Tasks" 
          value={summary.totalTasks} 
          icon={CheckSquare} 
          color="#10b981"
          subtitle={`${summary.completedTasks} completed`}
        />
        <StatCard 
          title="Pending Tasks" 
          value={summary.pendingTasks} 
          icon={Clock} 
          color="#f59e0b"
          subtitle="Awaiting action"
        />
        <StatCard 
          title="Overdue Tasks" 
          value={summary.overdueTasks} 
          icon={AlertCircle} 
          color="#ef4444"
          subtitle="Requires immediate attention"
        />
      </section>

      {/* Charts Row 1 */}
      <section className="charts-grid-2">
        <TaskActivityChart data={taskActivity} />
        <WeeklyProductivityChart data={weeklyProductivity} />
      </section>

      {/* Charts Row 2 */}
      <section className="charts-grid-2">
        <ProjectStatusChart data={projectStatus} />
        <TaskStatusChart data={taskStatus} />
      </section>

      {/* Data Row */}
      <section className="data-grid-2">
        {/* Active Projects */}
        <div className="data-card">
          <div className="data-card-header">
            <h3 className="data-card-title">Active Projects Progress</h3>
            <Link to="/projects" className="data-card-link">View All</Link>
          </div>
          <div className="data-list">
            {activeProjects.length > 0 ? activeProjects.map(p => (
              <div key={p.id} className="data-list-item">
                <div className="item-info">
                  <h4 className="item-name">{p.name}</h4>
                  <p className="item-meta">Due: {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'No date'}</p>
                </div>
                <div className="item-progress-wrapper">
                  <div className="progress-text">{p.progress}%</div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${p.progress}%`, backgroundColor: p.progress === 100 ? '#10b981' : '#3b82f6' }}></div>
                  </div>
                </div>
              </div>
            )) : <p className="empty-text">No active projects.</p>}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="data-card">
          <div className="data-card-header">
            <h3 className="data-card-title">Upcoming & Overdue Tasks</h3>
            <Link to="/tasks" className="data-card-link">View All</Link>
          </div>
          <div className="data-list">
            {overdueTasks.map(t => (
              <Link key={`o-${t.id}`} to={`/tasks/${t.id}`} className="data-list-item clickable">
                <div className="item-info">
                  <h4 className="item-name text-danger">{t.name}</h4>
                  <p className="item-meta">{t.project_name}</p>
                </div>
                <div className="item-badge-danger">Overdue</div>
              </Link>
            ))}
            {upcomingTasks.slice(0, 5 - overdueTasks.length).map(t => (
              <Link key={`u-${t.id}`} to={`/tasks/${t.id}`} className="data-list-item clickable">
                <div className="item-info">
                  <h4 className="item-name">{t.name}</h4>
                  <p className="item-meta">{t.project_name}</p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
            {(overdueTasks.length === 0 && upcomingTasks.length === 0) && (
              <p className="empty-text">No upcoming tasks.</p>
            )}
          </div>
        </div>
      </section>
      
      {/* Recent Activity */}
      <section className="data-grid-1 mt-4">
        <div className="data-card">
          <div className="data-card-header">
            <h3 className="data-card-title">Recent Activity</h3>
            {user?.role === 'super_admin' || user?.role === 'admin' ? (
              <Link to="/admin/audit-logs" className="data-card-link">View Audit Logs</Link>
            ) : null}
          </div>
          <div className="activity-list">
            {recentActivity.length > 0 ? recentActivity.map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-icon">
                  <Activity size={16} />
                </div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{a.user_name}</strong> performed <strong>{a.action}</strong>
                  </p>
                  <p className="activity-time">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            )) : <p className="empty-text">No recent activity.</p>}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
