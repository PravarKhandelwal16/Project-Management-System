import Skeleton from '../components/Skeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { getNotificationPreferencesApi, updateNotificationPreferencesApi } from '../services/api';
import './Dashboard.css';

const Settings = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const fetchPreferences = useCallback(async () => {
    setLoading(true);setMessage({type:'',text:''});
    try {
      const res = await getNotificationPreferencesApi();
      if (res.success) {
        setPreferences(res.data);
      }
    } catch (err) {
      setMessage({type:'error',text:err.message||'Could not load settings.'});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchPreferences);
  }, [fetchPreferences]);

  const handleToggle = (key) => {
    setPreferences({
      ...preferences,
      [key]: preferences[key] === 1 ? 0 : 1
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        email_task_assigned: !!preferences.email_task_assigned,
        email_due_tomorrow: !!preferences.email_due_tomorrow,
        email_overdue: !!preferences.email_overdue,
        web_task_assigned: !!preferences.web_task_assigned,
        web_due_tomorrow: !!preferences.web_due_tomorrow,
        web_overdue: !!preferences.web_overdue,
        browser_task_assigned: !!preferences.browser_task_assigned,
        browser_due_tomorrow: !!preferences.browser_due_tomorrow,
      };
      const res = await updateNotificationPreferencesApi(payload);
      if (res.success) {
        setMessage({ type: 'success', text: 'Preferences saved successfully' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      setMessage({type:'error',text:'This browser does not support desktop notifications.'});
      return;
    }
    
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
    } else if (Notification.permission === 'granted') {
      setBrowserPermission('granted');
    }
  };

  if (loading) return <Skeleton label="Loading settings"/>;
  if (!preferences) return <div className="planning-state" role="alert"><h1>Could not load settings</h1><p>{message.text}</p><button className="management-button" onClick={fetchPreferences}>Try again</button></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="dashboard-content">
        <div className="card-container" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
              Notification Preferences
            </h3>
            
            {message.text && (
              <div style={{
                padding: '10px 15px',
                marginBottom: '20px',
                borderRadius: '6px',
                backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: message.type === 'success' ? '#10b981' : '#ef4444'
              }}>
                {message.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              
              {/* Web */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: 'var(--text-secondary)' }}>In-App (Web)</h4>
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.web_task_assigned}
                      onChange={() => handleToggle('web_task_assigned')}
                    />
                    Task Assigned
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.web_due_tomorrow}
                      onChange={() => handleToggle('web_due_tomorrow')}
                    />
                    Task Due Tomorrow
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.web_overdue}
                      onChange={() => handleToggle('web_overdue')}
                    />
                    Task Overdue
                  </label>
                </div>
              </div>

              {/* Email */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: 'var(--text-secondary)' }}>Email</h4>
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.email_task_assigned}
                      onChange={() => handleToggle('email_task_assigned')}
                    />
                    Task Assigned
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.email_due_tomorrow}
                      onChange={() => handleToggle('email_due_tomorrow')}
                    />
                    Task Due Tomorrow
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.email_overdue}
                      onChange={() => handleToggle('email_overdue')}
                    />
                    Task Overdue
                  </label>
                </div>
              </div>

              {/* Browser */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Browser Desktop
                  {browserPermission !== 'granted' && (
                    <button 
                      onClick={requestBrowserPermission}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      Enable
                    </button>
                  )}
                </h4>
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px', opacity: browserPermission === 'granted' ? 1 : 0.5 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: browserPermission === 'granted' ? 'pointer' : 'not-allowed' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.browser_task_assigned}
                      onChange={() => handleToggle('browser_task_assigned')}
                      disabled={browserPermission !== 'granted'}
                    />
                    Task Assigned
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: browserPermission === 'granted' ? 'pointer' : 'not-allowed' }}>
                    <input 
                      type="checkbox" 
                      checked={!!preferences.browser_due_tomorrow}
                      onChange={() => handleToggle('browser_due_tomorrow')}
                      disabled={browserPermission !== 'granted'}
                    />
                    Task Due Tomorrow
                  </label>
                  {browserPermission === 'denied' && (
                    <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>
                      Permission denied in browser settings.
                    </p>
                  )}
                </div>
              </div>

            </div>

            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="primary-action-btn"
                onClick={savePreferences}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Settings;
