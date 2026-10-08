import Skeleton from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import './Management.css';
const initial = { search: '', resource_type: '', action: '', user_id: '', from: '', to: '' };
const humanize = value => value?.toLowerCase().replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()) || '?';
const show = value => value == null ? '?' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const cell = value => '"' + (/^[=+@\-\t\r]/.test(String(value ?? '')) ? "'" : '') + String(value ?? '').replaceAll('"', '""') + '"';
export default function AdminAuditLogs() {
  const [draft, setDraft] = useState(initial);
  const [query, setQuery] = useState({ ...initial, page: 1 });
  const [result, setResult] = useState({ data: [], total: 0, actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) { setLoading(true); setError(''); } return apiRequest('/admin/audit-logs?' + new URLSearchParams({ ...query, limit: 25 })); }).then(response => { if (active) setResult(response); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, refresh]);
  const field = event => setDraft(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const exportPage = () => {
    const rows = [['Event ID','Timestamp','Actor','Email','Action','Resource','Resource ID','IP address','Request ID','Details'], ...result.data.map(log => [log.id,log.created_at,log.user_name,log.user_email,log.action,log.resource_type,log.resource_id,log.ip_address,log.request_id,JSON.stringify(log.details)])];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'audit-log-page-' + query.page + '.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="management-page">
    <header className="management-heading"><div><h1>Audit history</h1><p>Trace account access, permission changes and project activity.</p></div><button className="management-button secondary" disabled={loading || !!error || !result.data.length} onClick={exportPage}>Export this page</button></header>
    <form className="management-toolbar" onSubmit={event => { event.preventDefault(); setQuery({ ...draft, page: 1 }); }}>
      <input type="search" name="search" aria-label="Search audit events" placeholder="Search actor, action, resource ID or details?" value={draft.search} onChange={field} />
      <select name="resource_type" aria-label="Resource type" value={draft.resource_type} onChange={field}><option value="">All resources</option>{['USER','ROLE','PROJECT','TASK','REMINDER','CALENDAR_EVENT','ACCESS'].map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select>
      <select name="action" aria-label="Event action" value={draft.action} onChange={field}><option value="">All actions</option>{result.actions.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select>
      <label>Actor ID<input type="number" name="user_id" min="1" step="1" placeholder="Any actor" value={draft.user_id} onChange={field} /></label>
      <label>From<input type="date" name="from" value={draft.from} onChange={field} max={draft.to || undefined} /></label>
      <label>Through<input type="date" name="to" value={draft.to} onChange={field} min={draft.from || undefined} /></label>
      <button className="management-button">Apply filters</button><button type="button" className="management-button secondary" onClick={() => { setDraft(initial); setQuery({ ...initial, page: 1 }); }}>Reset</button>
      <button type="button" className="management-button secondary" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh</button>
    </form>
    {error && <div className="management-notice error" role="alert">{error}</div>}
    {loading ? <Skeleton label="Loading audit history"/> : error ? <div className="management-empty">Could not load audit events. Refresh to try again.</div> : !result.data.length ? <div className="management-empty"><h2>No matching events</h2><p>Try broadening the date range or clearing your filters.</p></div> : <div className="management-table-wrap"><table className="management-table">
      <thead><tr><th>When</th><th>Actor</th><th>Event</th><th>Resource & changes</th></tr></thead>
      <tbody>{result.data.map(log => {
        const details = log.details;
        const before = details?.before, after = details?.after;
        const changes = before && after ? [...new Set([...Object.keys(before),...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])) : [];
        return <tr key={log.id}>
          <td>{new Date(log.created_at).toLocaleString()}<small>Event #{log.id}</small></td>
          <td><strong>{log.user_name || 'System / historical actor'}</strong><small>{log.user_email || 'No recorded email'}</small><small>{log.user_id ? 'User #' + log.user_id : 'System'}</small></td>
          <td><span className="management-badge">{humanize(log.action)}</span></td>
          <td><strong>{humanize(log.resource_type)}{log.resource_id ? ' #' + log.resource_id : ''}{details?.role ? ' ? ' + humanize(details.role) : ''}</strong>
            {changes.length > 0 && <small>{changes.map(humanize).join(', ')} changed</small>}
            <details className="audit-detail"><summary>View change details</summary>
              {changes.length > 0 && <dl style={{ margin: '12px 0' }}>{changes.map(key => <div key={key} style={{ display: 'contents' }}><dt>{humanize(key)}</dt><dd><del>{show(before[key])}</del> ? <strong>{show(after[key])}</strong></dd></div>)}</dl>}
              <pre>{typeof details === 'string' ? details : JSON.stringify(details || {}, null, 2)}</pre>
              <small>IP: {log.ip_address || 'Not recorded'} ? Request: {log.request_id || 'Historical event'}</small>
            </details>
          </td>
        </tr>;
      })}</tbody>
    </table></div>}
    <div className="management-pagination"><span>{result.total} matching events ? Page {query.page} of {Math.max(1,Math.ceil(result.total / 25))}</span><div className="management-actions">
      <button className="management-button secondary" disabled={loading || query.page === 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button>
      <button className="management-button secondary" disabled={loading || query.page * 25 >= result.total} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button>
    </div></div>
    <p style={{ marginTop: 16 }}>Records preserve the actor?s name and email at the time of the event. New administrative changes and membership changes commit together with their audit entries. Historical events may contain fewer details.</p>
  </div>;
}
