import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getNotificationsApi, 
  markAllNotificationsReadApi, 
  markNotificationReadApi 
} from '../services/api';
import { Bell, Check, Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import './Dashboard.css'; // Reuse dashboard styles where possible

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotificationsApi({ limit: 100 });
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsReadApi();
      if (res.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read if not already
    if (!notif.is_read) {
      try {
        await markNotificationReadApi(notif.id);
        setNotifications(notifications.map(n => 
          n.id === notif.id ? { ...n, is_read: 1 } : n
        ));
      } catch (err) {
        console.error(err);
      }
    }

    // Navigate based on resource
    if (notif.resource_type === 'TASK' && notif.resource_id) {
      navigate(`/tasks/${notif.resource_id}`);
    } else if (notif.resource_type === 'REMINDER') {
      navigate('/calendar');
    } else if (notif.resource_type === 'PROJECT' && notif.resource_id) {
      navigate(`/projects/${notif.resource_id}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_REASSIGNED':
        return <CheckCircle size={20} color="#2563eb" />;
      case 'TASK_DUE_TOMORROW':
        return <Clock size={20} color="#f59e0b" />;
      case 'TASK_OVERDUE':
        return <AlertTriangle size={20} color="#ef4444" />;
      default:
        return <Bell size={20} color="#6b7280" />;
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated on your tasks and projects</p>
        </div>
        <div className="header-actions">
          <button 
            className="secondary-action-btn"
            onClick={handleMarkAllRead}
            disabled={!notifications.some(n => !n.is_read)}
          >
            <Check size={16} />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card-container" style={{ padding: '0' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button 
              style={{ 
                padding: '15px 20px', 
                background: 'none', 
                border: 'none', 
                borderBottom: filter === 'all' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: filter === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: filter === 'all' ? '600' : '400',
                cursor: 'pointer'
              }}
              onClick={() => setFilter('all')}
            >
              All Notifications
            </button>
            <button 
              style={{ 
                padding: '15px 20px', 
                background: 'none', 
                border: 'none', 
                borderBottom: filter === 'unread' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: filter === 'unread' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: filter === 'unread' ? '600' : '400',
                cursor: 'pointer'
              }}
              onClick={() => setFilter('unread')}
            >
              Unread
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Bell size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                <p>No notifications found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredNotifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{ 
                      display: 'flex', 
                      gap: '15px', 
                      padding: '15px', 
                      borderRadius: '8px',
                      backgroundColor: notif.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.05)'}
                  >
                    <div style={{ 
                      minWidth: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--bg-primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)'
                    }}>
                      {getIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                        {notif.title}
                        {!notif.is_read && <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block' }}></span>}
                      </h4>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
