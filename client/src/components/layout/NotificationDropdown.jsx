import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getNotificationsApi, 
  getUnreadNotificationCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi
} from '../../services/api';
import { Bell, Check, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import './Header.css';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [countRes, notifRes] = await Promise.all([
        getUnreadNotificationCountApi(),
        getNotificationsApi({ limit: 5 })
      ]);
      
      if (countRes.success) setUnreadCount(countRes.data.count);
      if (notifRes.success) setNotifications(notifRes.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Simple polling every 60 seconds
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsReadApi();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    
    if (!notif.is_read) {
      try {
        await markNotificationReadApi(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(notifications.map(n => 
          n.id === notif.id ? { ...n, is_read: 1 } : n
        ));
      } catch (err) {
        console.error(err);
      }
    }

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
        return <CheckCircle size={16} color="#2563eb" />;
      case 'TASK_DUE_TOMORROW':
        return <Clock size={16} color="#f59e0b" />;
      case 'TASK_OVERDUE':
        return <AlertTriangle size={16} color="#ef4444" />;
      default:
        return <Bell size={16} color="#6b7280" />;
    }
  };

  return (
    <div className="header-action-item" ref={dropdownRef}>
      <button 
        className="icon-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            backgroundColor: 'var(--status-high)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '10px',
          width: '320px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 15px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-primary)', 
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: notif.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : 'rgba(37, 99, 235, 0.05)'}
                >
                  <div style={{ marginTop: '2px' }}>
                    {getIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 3px 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {notif.title}
                    </h5>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div 
            onClick={() => { setIsOpen(false); navigate('/notifications'); }}
            style={{
              padding: '10px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            View All Notifications
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
