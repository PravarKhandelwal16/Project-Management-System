import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import catalog from '@shared/access.json';
import PermissionEditor from '../components/management/PermissionEditor';
import ManagementDialog from '../components/management/ManagementDialog';
import './Management.css';

const emptyForm = { full_name: '', email: '', department: '', job_title: '', password: '', role: 'member' };
const roleLabel = key => catalog.roles.find(role => role.key === key)?.label || key;
export default function AdminUsers() {
  const { user, hasPermission, refreshUser } = useAuth();
  const requestSequence = useRef(0);
  const [tab, setTab] = useState('users');
  const [filters, setFilters] = useState({ search: '', role: '', is_active: '', page: 1 });
  const [result, setResult] = useState({ data: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [roleKey, setRoleKey] = useState('project_manager');
  const [roleDrafts, setRoleDrafts] = useState({});
  const roleDraft = roleDrafts[roleKey] ?? policies.find(role => role.key === roleKey)?.permissions ?? [];
  const setRoleDraft = permissions => setRoleDrafts(previous => ({ ...previous, [roleKey]: permissions }));
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');
  const canModify = target => target.id !== user.id && (user.role === 'super_admin' || !['admin', 'super_admin'].includes(target.role));
  const assignableRoles = catalog.roles.filter(role => user.role === 'super_admin' || !['super_admin', 'admin'].includes(role.key));
  const loadUsers = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true); setError('');
    try {
      const response = await apiRequest('/admin/users?' + new URLSearchParams({ ...filters, limit: 25 }));
      const summary = await apiRequest('/admin/stats');
      if (sequence === requestSequence.current) { setResult(response); setStats(summary.data.users); }
    } catch (err) { if (sequence === requestSequence.current) setError(err.message); } finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [filters]);
  const loadPolicies = useCallback(async () => {
    const response = await apiRequest('/admin/roles'); setPolicies(response.data); setRoleDrafts({}); return response.data;
  }, []);
  useEffect(() => { const timer = setTimeout(loadUsers, 250); return () => clearTimeout(timer); }, [loadUsers]);
  useEffect(() => { Promise.resolve().then(loadPolicies).catch(err => setError(err.message)); }, [loadPolicies]);
  const changeFilter = (key, value) => setFilters(previous => ({ ...previous, [key]: value, page: 1 }));
  const openProfile = target => { setDialog({ type: target ? 'profile' : 'create', target }); setForm(target ? { ...emptyForm, ...target } : { ...emptyForm }); setDialogError(''); };
  const openRole = target => { setDialog({ type: 'role', target }); setForm({ role: target.role }); setDialogError(''); };
  const openPermissions = async target => {
    setError('');
    try {
      const response = await apiRequest('/admin/users/' + target.id);
      setOverrides(response.data.permission_overrides || {});
      setDialog({ type: 'permissions', target: response.data }); setDialogError('');
    } catch (err) { setError(err.message); }
  };
  const run = async (operation, message) => {
    setBusy(true); setDialogError(''); setError(''); setNotice('');
    try { await operation(); setNotice(message); await loadUsers(); return true; }
    catch (err) { if (dialog) setDialogError(err.message); else setError(err.message); return false; }
    finally { setBusy(false); }
  };
  const saveUser = async event => {
    event.preventDefault();
    const target = dialog.target;
    const ok = await run(async () => {
      if (dialog.type === 'create') await apiRequest('/admin/users', { method: 'POST', data: form });
      if (dialog.type === 'profile') await apiRequest('/admin/users/' + target.id, { method: 'PUT', data: { full_name: form.full_name, email: form.email, department: form.department, job_title: form.job_title } });
      if (dialog.type === 'role') await apiRequest('/admin/users/' + target.id + '/role', { method: 'PATCH', data: { role: form.role } });
      if (dialog.type === 'permissions') await apiRequest('/admin/users/' + target.id + '/permissions', { method: 'PUT', data: { overrides } });
    }, 'Account updated successfully.');
    if (ok) setDialog(null);
  };
  const savePolicy = async () => {
    const policy = policies.find(role => role.key === roleKey);
    await run(async () => {
      await apiRequest('/admin/roles/' + roleKey, { method: 'PUT', data: { permissions: roleDraft, version: policy.version } });
      await loadPolicies(); await refreshUser();
    }, 'Role permissions saved. Changes apply to the next authenticated request.');
  };
  const policyEditable = hasPermission('roles.manage') && roleKey !== 'super_admin' && (user.role === 'super_admin' || roleKey !== 'admin');
  const selectedPolicy = policies.find(role => role.key === roleKey);
  return <div className="management-page">
    <header className="management-heading"><div><h1>People & access</h1><p>Manage accounts, job roles and the permissions behind them.</p></div>
      {hasPermission('users.create') && <button className="management-button" onClick={() => openProfile(null)}>Create account</button>}
    </header>
    {notice && <div className="management-notice" role="status">{notice}</div>}
    {error && <div className="management-notice error" role="alert">{error}</div>}
    <div className="management-stats">
      {[['Total accounts', stats?.total_users], ['Active accounts', stats?.active_users], ['Inactive accounts', stats?.inactive_users]].map(([label, value]) => <div className="management-stat" key={label}><strong>{value ?? '?'}</strong><span>{label}</span></div>)}
    </div>
    <div className="management-tabs" aria-label="Management views">{['users', 'roles'].map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => { setTab(value); setNotice(''); }}>{value === 'users' ? 'User directory' : 'Roles & permissions'}</button>)}</div>
    {tab === 'users' ? <>
      <div className="management-toolbar">
        <input aria-label="Search accounts" type="search" placeholder="Search name, email, department or job title?" value={filters.search} onChange={event => changeFilter('search', event.target.value)} />
        <select aria-label="Filter role" value={filters.role} onChange={event => changeFilter('role', event.target.value)}><option value="">All roles</option>{catalog.roles.map(role => <option key={role.key} value={role.key}>{role.label}</option>)}</select>
        <select aria-label="Filter account status" value={filters.is_active} onChange={event => changeFilter('is_active', event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
        <button className="management-button secondary" onClick={loadUsers} disabled={loading}>Refresh</button>
      </div>
      {loading ? <div className="management-empty" role="status">Loading accounts?</div> : !result.data.length ? <div className="management-empty"><h2>No accounts found</h2><p>Try changing your search or filters.</p></div> : <div className="management-table-wrap"><table className="management-table">
        <thead><tr><th>Person</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{result.data.map(target => <tr key={target.id}>
          <td><strong>{target.full_name}{target.id === user.id && ' (You)'}</strong><small>{target.email}</small><small>{target.job_title || 'No job title'}</small></td>
          <td><span className="management-badge">{roleLabel(target.role)}</span>{target.permission_overrides && Object.keys(typeof target.permission_overrides === 'string' ? JSON.parse(target.permission_overrides) : target.permission_overrides).length > 0 && <small>Individual permissions</small>}</td>
          <td>{target.department || '?'}</td><td><span className={'management-badge ' + (!target.is_active ? 'inactive' : '')}>{target.is_active ? 'Active' : 'Inactive'}</span></td>
          <td>{canModify(target) ? <div className="management-actions">
            {hasPermission('users.edit') && <button className="management-button secondary" onClick={() => openProfile(target)}>Edit profile</button>}
            {hasPermission('users.roles') && <><button className="management-button secondary" onClick={() => openRole(target)}>Change role</button>{target.role !== 'super_admin' && <button className="management-button secondary" onClick={() => openPermissions(target)}>Permissions</button>}</>}
            {hasPermission('users.status') && <button disabled={busy} className={'management-button ' + (target.is_active ? 'danger' : 'secondary')} onClick={() => {
              if (window.confirm((target.is_active ? 'Deactivate ' : 'Reactivate ') + target.full_name + '?')) run(() => apiRequest('/admin/users/' + target.id + '/status', { method: 'PATCH', data: { is_active: !target.is_active } }), 'Account status updated.');
            }}>{target.is_active ? 'Deactivate' : 'Reactivate'}</button>}
          </div> : <small>Protected account</small>}</td>
        </tr>)}</tbody></table></div>}
      <div className="management-pagination"><span>{result.total} accounts ? Page {filters.page} of {Math.max(1, Math.ceil(result.total / 25))}</span><div className="management-actions">
        <button className="management-button secondary" disabled={filters.page === 1 || loading} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Previous</button>
        <button className="management-button secondary" disabled={filters.page * 25 >= result.total || loading} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Next</button>
      </div></div>
    </> : <section className="management-card">
      <h2>Role responsibilities</h2><p>Permissions apply within owned or joined projects. ?Access every project? expands that scope.</p>
      <select aria-label="Role policy" style={{ margin: '16px 0' }} value={roleKey} onChange={event => { setRoleKey(event.target.value); setNotice(''); }}>{policies.map(role => <option key={role.key} value={role.key}>{role.label}</option>)}</select>
      <p>{selectedPolicy?.description}</p>
      {!policyEditable && <p>This policy is protected or your account cannot edit it.</p>}
      <PermissionEditor role={roleKey} values={roleDraft} onChange={setRoleDraft} disabled={!policyEditable || busy} grantable={user.role === 'super_admin' ? undefined : user.permissions} />
      <div className="management-actions"><button className="management-button" disabled={!policyEditable || busy || !selectedPolicy || JSON.stringify([...roleDraft].sort()) === JSON.stringify([...selectedPolicy.permissions].sort())} onClick={savePolicy}>{busy ? 'Saving?' : 'Save role permissions'}</button><button className="management-button secondary" disabled={busy} onClick={() => loadPolicies().catch(err => setError(err.message))}>Reload policies</button></div>
      <p style={{ marginTop: 12 }}>Individual Allow/Deny settings take precedence over role defaults. Administrator permissions remain restricted to administrators.</p>
    </section>}
    {dialog && <ManagementDialog compact={dialog.type !== 'permissions'} busy={busy} onClose={() => setDialog(null)} title={{ create: 'Create account', profile: 'Edit profile', role: 'Change role', permissions: 'Individual permissions' }[dialog.type]}>
        {dialog.target && <p>{dialog.target.full_name} ? {dialog.target.email}</p>}
        {dialogError && <div className="management-notice error" role="alert">{dialogError}</div>}
        <form className="management-form" onSubmit={saveUser}>
          {['create', 'profile'].includes(dialog.type) && <>
            {[['full_name', 'Full name', 'text'], ['email', 'Email address', 'email'], ['department', 'Department', 'text'], ['job_title', 'Job title', 'text']].map(([key, label, type]) => <label key={key}>{label}<input type={type} required={['full_name', 'email'].includes(key)} maxLength={key === 'email' ? 255 : 100} value={form[key] || ''} disabled={busy} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
            {dialog.type === 'create' && <label>Initial password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} disabled={busy} onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))} /><small>At least 8 characters, with a letter and a number.</small></label>}
          </>}
          {(dialog.type === 'role' || dialog.type === 'create' && hasPermission('users.roles')) && <label>Role<select disabled={busy} value={form.role} onChange={event => setForm(previous => ({ ...previous, role: event.target.value }))}>{assignableRoles.map(role => <option key={role.key} value={role.key}>{role.label}</option>)}</select><small>{catalog.roles.find(role => role.key === form.role)?.description}</small>{dialog.type === 'role' && <small>Changing role clears all individual permission overrides.</small>}</label>}
          {dialog.type === 'permissions' && <><p>Keep ?Role default? to follow the role policy, or explicitly allow or deny a permission.</p><PermissionEditor overrides defaultPermissions={policies.find(policy => policy.key === dialog.target.role)?.permissions || []} role={dialog.target.role} values={overrides} onChange={setOverrides} disabled={busy} grantable={user.role === 'super_admin' ? undefined : user.permissions} /><button type="button" className="management-button secondary" disabled={busy} onClick={() => setOverrides({})}>Restore role defaults</button></>}
          <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className="management-button" disabled={busy}>{busy ? 'Saving?' : 'Save'}</button></div>
        </form>
    </ManagementDialog>}
  </div>;
}
