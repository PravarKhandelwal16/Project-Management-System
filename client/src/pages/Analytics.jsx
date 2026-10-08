import { useState, useEffect } from 'react';
import { getDashboardDataApi } from '../services/api';
import ProjectStatusChart from '../components/dashboard/ProjectStatusChart';
import TaskStatusChart from '../components/dashboard/TaskStatusChart';
import TaskActivityChart from '../components/dashboard/TaskActivityChart';
import WeeklyProductivityChart from '../components/dashboard/WeeklyProductivityChart';

const Analytics = () => {
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
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="loading-state">Loading analytics...</div>;
  if (!data) return <div className="empty-state">Failed to load analytics data.</div>;

  return (
    <div className="page-container">
      <header className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Analytics</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>Detailed charts and metrics for your projects.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <ProjectStatusChart data={data.projectStatus} />
          <TaskStatusChart data={data.taskStatus} />
        </div>
        <TaskActivityChart data={data.taskActivity} />
        <WeeklyProductivityChart data={data.weeklyProductivity} />
      </div>
    </div>
  );
};

export default Analytics;
