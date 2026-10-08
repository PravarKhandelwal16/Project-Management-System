import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, addProjectMemberApi, removeProjectMemberApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import catalog from '@shared/access.json';
import ManagementDialog from '../components/management/ManagementDialog';
import './Management.css';
const roleLabel = key => catalog.roles.find(role => role.key === key)?.label || key;
export default function Team() {
  const { hasPermission } = useAuth();
  const [teamQuery] = useSearchParams();
  const preferredProject = teamQuery.get('project_id');
  const requestSequence = useRef(0);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [roster, setRoster] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest('/projects').then(response => { if (active) { setProjects(response.data); setProjectId(response.data.find(item => item.id.toString() === preferredProject)?.id.toString() || response.data[0]?.id.toString() || ''); } }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [preferredProject]);
  const loadRoster = useCallback(async () => {
    if (!projectId) return;
    const sequence = ++requestSequence.current;
    setLoading(true); setError('');
    try { const response = await apiRequest('/team/projects/' + projectId); if (sequence === requestSequence.current) { setRoster(response.data); setCanManage(response.can_manage); } }
    catch (err) { if (sequence === requestSequence.current) { setRoster([]); setCanManage(false); setError(err.message); } } finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [projectId]);
  useEffect(() => { Promise.resolve().then(loadRoster); }, [loadRoster]);
  useEffect(() => {
    if (!adding || !projectId) return;
    let active = true;
    const timer = setTimeout(() => {
      apiRequest('/team/projects/' + projectId + '/candidates?search=' + encodeURIComponent(candidateSearch)).then(response => { if (active) { setCandidates(response.data); setSelectedId(''); } }).catch(err => { if (active) setCandidateError(err.message); }).finally(() => { if (active) setCandidateLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [adding, candidateSearch, projectId]);
  const members = roster.filter(member => (!role || member.role === role) && [member.full_name, member.email, member.department, member.job_title].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  const project = projects.find(item => item.id.toString() === projectId);
  const addMember = async event => {
    event.preventDefault(); setBusy(true); setCandidateError(''); setNotice('');
    try { await addProjectMemberApi(projectId, Number(selectedId)); setAdding(false); setNotice('Member added to the project team.'); await loadRoster(); } catch (err) { setCandidateError(err.message); } finally { setBusy(false); }
  };
  const removeMember = async member => {
    if (!window.confirm('Remove ' + member.full_name + ' from ' + project.name + '?')) return;
    setBusy(true); setError(''); setNotice('');
    try { await removeProjectMemberApi(projectId, member.user_id); setNotice('Member removed from the project team.'); await loadRoster(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="management-page">
    <header className="management-heading"><div><h1>Team management</h1><p>Organize project teams and see how work is distributed.</p></div>{canManage && project && <button className="management-button" disabled={busy || loading} onClick={() => { setAdding(true); setCandidateSearch(''); setCandidates([]); setSelectedId(''); setCandidateLoading(true); setCandidateError(''); }}>Add project member</button>}</header>
    {notice && <div className="management-notice" role="status">{notice}</div>}{error && <div className="management-notice error" role="alert">{error}</div>}
    <div className="management-toolbar"><label>Project<select disabled={loading || busy} value={projectId} onChange={event => { setProjectId(event.target.value); setNotice(''); setCanManage(false); setRoster([]); }}>{!projects.length && <option value="">No accessible projects</option>}{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <input aria-label="Search team" type="search" placeholder="Search people, departments or job titles?" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Filter team role" value={role} onChange={event => setRole(event.target.value)}><option value="">All roles</option>{catalog.roles.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      {project && <Link to={'/projects/' + projectId}>View project</Link>}
    </div>
    <div className="management-stats">{[['Team members', roster.length], ['Open tasks', hasPermission('tasks.view') ? roster.reduce((sum, item) => sum + item.open_tasks, 0) : '?'], ['Overdue tasks', hasPermission('tasks.view') ? roster.reduce((sum, item) => sum + item.overdue_tasks, 0) : '?']].map(([label, value]) => <div className="management-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    {loading ? <div className="management-empty" role="status">Loading project team?</div> : !projects.length ? <div className="management-empty"><h2>No project teams yet</h2><p>Create a project or ask a manager to add you to one.</p></div> : !members.length ? <div className="management-empty">No team members match these filters.</div> : <div className="management-table-wrap"><table className="management-table">
      <thead><tr><th>Person</th><th>Management role</th><th>Department</th><th>Workload</th><th>Membership</th>{canManage && <th>Actions</th>}</tr></thead>
      <tbody>{members.map(member => <tr key={member.user_id}><td><strong>{member.full_name}</strong><small>{member.email}</small><small>{member.job_title || 'No job title'}</small>{!member.is_active && <span className="management-badge inactive">Inactive account</span>}</td>
        <td><span className="management-badge">{roleLabel(member.role)}</span></td><td>{member.department || '?'}</td>
        <td>{member.open_tasks == null ? 'Restricted' : <><strong>{member.open_tasks} open</strong><small>{member.assigned_tasks} assigned total</small>{member.overdue_tasks > 0 && <span className="management-badge warning">{member.overdue_tasks} overdue</span>}</>}</td>
        <td>{member.is_owner ? <span className="management-badge">Project owner</span> : <><span>Project member</span><small>Joined {new Date(member.joined_at).toLocaleDateString()}</small></>}</td>
        {canManage && <td>{member.is_owner ? <small>Owner membership is protected</small> : <><button className="management-button danger" disabled={busy || member.open_tasks > 0} onClick={() => removeMember(member)}>Remove</button>{member.open_tasks > 0 && <small>Reassign open tasks first</small>}</>}</td>}
      </tr>)}</tbody></table></div>}
    <p style={{ marginTop: 16 }}>Job roles determine actions. Project membership determines access. Removing a member requires their unfinished tasks to be reassigned or completed.</p>
    {adding && <ManagementDialog compact busy={busy} onClose={() => setAdding(false)} title={'Add to ' + project?.name}>
      <p>Choose an active workspace account. Its job role stays the same.</p>
      {candidateError && <div className="management-notice error" role="alert">{candidateError}</div>}
      <form className="management-form" onSubmit={addMember}><label>Search workspace accounts<input type="search" placeholder="Name or email" disabled={busy} value={candidateSearch} onChange={event => { setCandidateSearch(event.target.value); setSelectedId(''); setCandidateLoading(true); setCandidateError(''); }} /></label>
        <label>Account<select required disabled={candidateLoading || busy} value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">{candidateLoading ? 'Searching?' : 'Select an account'}</option>{candidates.map(item => <option key={item.id} value={item.id}>{item.full_name} ? {item.email} ? {roleLabel(item.role)}</option>)}</select></label>
        {!candidateLoading && !candidates.length && <p>No eligible accounts found. Existing members and the owner are excluded.</p>}
        {candidates.length === 50 && <small>Showing the first 50 matches. Refine the search to find a specific account.</small>}
        <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={() => setAdding(false)}>Cancel</button><button className="management-button" disabled={!selectedId || candidateLoading || busy}>{busy ? 'Adding?' : 'Add member'}</button></div>
      </form>
    </ManagementDialog>}
  </div>;
}
