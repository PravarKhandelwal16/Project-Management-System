import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export const HomePage = () => {
  const [apiStatus, setApiStatus] = useState({
    loading: true,
    connected: false,
    message: 'Checking backend status...',
  });

  const verifyBackend = async () => {
    setApiStatus((prev) => ({ ...prev, loading: true }));
    const result = await checkHealth();
    setApiStatus({
      loading: false,
      connected: !!result.success,
      message: result.message || 'No response',
    });
  };

  useEffect(() => {
    verifyBackend();
  }, []);

  return (
    <div className="app-container">
      {/* Header / Nav */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">📁</div>
          <div>
            <h1 className="brand-title">Project Management System</h1>
            <p className="brand-subtitle">Full-Stack Application Foundation</p>
          </div>
        </div>
        <div className="system-pill">
          <span className="live-indicator" />
          <span>Frontend Ready</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="main-content">
        <section className="hero-card">
          <div className="badge-wrapper">
            <span className="hero-badge">Starter Template Ready</span>
          </div>
          <h2 className="hero-heading">Welcome to the Project Management System</h2>
          <p className="hero-description">
            Your full-stack foundation has been successfully configured with React, Vite,
            Node.js, Express, and MySQL. All initial folder architectures, database schemas,
            and health check endpoints are wired up.
          </p>

          {/* Backend Connection Status Banner */}
          <div className={`status-banner ${apiStatus.connected ? 'status-ok' : 'status-pending'}`}>
            <div className="status-info">
              <span className="status-label">Backend API Status:</span>
              <span className="status-text">{apiStatus.loading ? 'Connecting to http://localhost:5000/api/health...' : apiStatus.message}</span>
            </div>
            <button
              onClick={verifyBackend}
              disabled={apiStatus.loading}
              className="refresh-btn"
            >
              {apiStatus.loading ? 'Checking...' : 'Ping /api/health'}
            </button>
          </div>
        </section>

        {/* Tech Stack Grid */}
        <section className="grid-section">
          <div className="tech-card">
            <div className="card-header">
              <span className="tech-icon">⚛️</span>
              <StatusBadge status="Completed" />
            </div>
            <h3>React + Vite</h3>
            <p>Component-based client with prepared folders for components, pages, services, context, and utils.</p>
            <div className="tech-tag">Frontend</div>
          </div>

          <div className="tech-card">
            <div className="card-header">
              <span className="tech-icon">🚀</span>
              <StatusBadge status={apiStatus.connected ? 'Completed' : 'Pending'} />
            </div>
            <h3>Express + Node.js</h3>
            <p>Configured with CORS, JSON parsing, centralized error handling, and modular routing.</p>
            <div className="tech-tag">Backend</div>
          </div>

          <div className="tech-card">
            <div className="card-header">
              <span className="tech-icon">🗄️</span>
              <StatusBadge status="Completed" />
            </div>
            <h3>MySQL 8.0+</h3>
            <p>Connection pool using <code>mysql2/promise</code> and normalized schema for users, projects, tasks, and audit logs.</p>
            <div className="tech-tag">Database</div>
          </div>
        </section>

        {/* Prepared Architecture Overview */}
        <section className="architecture-card">
          <h3 className="section-title">Ready for Next Steps</h3>
          <ul className="features-list">
            <li>
              <strong>Authentication:</strong> Schemas and dependencies (<code>bcrypt</code>, <code>jsonwebtoken</code>) installed.
            </li>
            <li>
              <strong>Project & Task CRUD:</strong> Foreign key constraints, cascade rules, and status enums defined in <code>database/schema.sql</code>.
            </li>
            <li>
              <strong>Rate Limiting:</strong> <code>express-rate-limit</code> prepared for authentication endpoints.
            </li>
            <li>
              <strong>Audit Logging:</strong> Relational table with indexed actions and user references ready.
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Project Management System &bull; Clean Architecture Foundation</p>
      </footer>
    </div>
  );
};

export default HomePage;
