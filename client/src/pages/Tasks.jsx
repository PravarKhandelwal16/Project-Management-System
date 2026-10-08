import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, List, Columns3, Bell } from 'lucide-react';
import useRemote from '../hooks/useRemote';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { PageHeader, Metrics, LoadState, Badge } from '../components/planning/PlanningUI';
import TaskDialog from '../components/planning/TaskDialog';
import ReminderDialog from '../components/planning/ReminderDialog';
import { priorities, taskStatuses, isOverdue, prettyDate, canChangeStatus, todayKey } from '../utils/planning';
export default function Tasks(){
  const {user,hasPermission}=useAuth();const [query]=useSearchParams();
  const {data:tasks=[],loading,error,reload}=useRemote('/tasks');
  const {data:projects=[]}=useRemote('/projects');
  const [filters,setFilters]=useState({search:'',project:query.get('project_id')||'',status:'',priority:'',ownership:query.get('ownership')|| (query.get('mine')?'mine':'all'),due:query.get('due')||'',sort:'due'});
  const [view,setView]=useState('list'),[page,setPage]=useState(1);
  const [editing,setEditing]=useState(query.get('create')&&hasPermission('tasks.create')?{}:null);
  const [reminding,setReminding]=useState(null);
  const [busy,setBusy]=useState(null),[actionError,setActionError]=useState(''),[notice,setNotice]=useState('');
  const allTasks=useMemo(()=>tasks||[],[tasks]);
  const filtered=useMemo(()=>allTasks.filter(task=>
    (!filters.search||[task.name,task.description,task.project_name,task.assignee_name].some(value=>value?.toLowerCase().includes(filters.search.toLowerCase())))&&
    (!filters.project||task.project_id===Number(filters.project))&&(!filters.status||task.status===filters.status)&&(!filters.priority||task.priority===filters.priority)&&
    (filters.ownership==='all'||filters.ownership==='mine'&&task.assigned_to===user.id||filters.ownership==='unassigned'&&!task.assigned_to)&&
    (!filters.due||filters.due==='overdue'&&isOverdue(task)||filters.due==='undated'&&!task.due_date||filters.due==='today'&&task.due_date===todayKey()&&task.status!=='Completed')
  ).sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name):filters.sort==='priority'?priorities.indexOf(b.priority)-priorities.indexOf(a.priority):(a.due_date||'9999').localeCompare(b.due_date||'9999')||b.id-a.id),[allTasks,filters,user.id]);
  const change=(key,value)=>{setFilters(previous=>({...previous,[key]:value}));setPage(1);};
  const status=async(task,value)=>{
    setBusy(task.id);setActionError('');setNotice('');
    try{await apiRequest('/tasks/'+task.id+'/status',{method:'PATCH',data:{status:value}});setNotice('Task status updated.');reload();}catch(err){setActionError(err.message);}finally{setBusy(null);}
  };
  const statusControl=task=>canChangeStatus(user,hasPermission,task)?<select className="planning-status-select" aria-label={'Status for '+task.name} value={task.status} disabled={busy!==null} onChange={event=>status(task,event.target.value)}>{taskStatuses.map(value=><option key={value}>{value}</option>)}</select>:<Badge value={task.status}/>;
  return <div className="planning-page"><PageHeader title="Tasks" description="Turn project plans into clear, assigned work."><Link className="management-button secondary" to="/calendar">Open calendar</Link>{hasPermission('tasks.create')&&hasPermission('tasks.view')&&hasPermission('projects.view')&&<button className="management-button" onClick={()=>setEditing({})}><Plus size={15}/> New task</button>}</PageHeader>
    <Metrics items={[{label:'Accessible tasks',value:allTasks.length},{label:'Assigned to me',value:allTasks.filter(task=>task.assigned_to===user.id&&task.status!=='Completed').length,note:'Open work'},{label:'Overdue',value:allTasks.filter(task=>isOverdue(task)).length,tone:'danger'},{label:'Completed',value:allTasks.filter(task=>task.status==='Completed').length,tone:'success'}]}/>
    {notice&&<div className="management-notice" role="status">{notice}</div>}{actionError&&<div className="management-notice error" role="alert">{actionError}</div>}
    <div className="management-toolbar"><input aria-label="Search tasks" type="search" placeholder="Search tasks, projects or people…" value={filters.search} onChange={event=>change('search',event.target.value)}/>
      <select aria-label="Filter project" value={filters.project} onChange={event=>change('project',event.target.value)}><option value="">All projects</option>{(projects||[]).map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <select aria-label="Filter status" value={filters.status} onChange={event=>change('status',event.target.value)}><option value="">All statuses</option>{taskStatuses.map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Filter priority" value={filters.priority} onChange={event=>change('priority',event.target.value)}><option value="">All priorities</option>{priorities.map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Filter assignment" value={filters.ownership} onChange={event=>change('ownership',event.target.value)}><option value="all">Everyone's work</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select>
      <select aria-label="Filter deadline" value={filters.due} onChange={event=>change('due',event.target.value)}><option value="">Any deadline</option><option value="today">Due today</option><option value="overdue">Overdue</option><option value="undated">No due date</option></select>
    </div>
    <div className="planning-panel-header"><span className="planning-muted">{filtered.length} matching tasks</span><div className="planning-inline"><select className="planning-status-select" aria-label="Sort tasks" value={filters.sort} onChange={event=>change('sort',event.target.value)}><option value="due">Due date</option><option value="priority">Highest priority</option><option value="name">Name A–Z</option></select><button className="management-button secondary" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={14}/> List</button><button className="management-button secondary" aria-pressed={view==='board'} onClick={()=>setView('board')}><Columns3 size={14}/> Board</button><button className="management-button secondary" onClick={reload}>Refresh</button></div></div>
    <LoadState loading={loading} error={error} onRetry={reload} empty={!filtered.length}>
      {view==='list'?<><div className="management-table-wrap"><table className="management-table"><thead><tr><th>Task & project</th><th>Assignee</th><th>Priority</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.slice((page-1)*20,page*20).map(task=><tr key={task.id}><td><Link className="planning-item-title" to={'/tasks/'+task.id}>{task.name}</Link><small><Link className="planning-text-link" to={'/projects/'+task.project_id}>{task.project_name}</Link></small></td><td>{task.assignee_name||'Unassigned'}</td><td><Badge value={task.priority}/></td><td>{prettyDate(task.due_date)}{isOverdue(task)&&<small><Badge value="Overdue"/></small>}</td><td>{statusControl(task)}</td><td><div className="management-actions">{hasPermission('tasks.edit')&&<button className="management-button secondary" onClick={()=>setEditing(task)}>Edit</button>}<button className="management-button secondary" disabled={task.status==='Completed'} onClick={()=>setReminding(task)}><Bell size={13}/> Remind me</button></div></td></tr>)}</tbody></table></div><div className="management-pagination"><span className="planning-muted">Page {page} of {Math.max(1,Math.ceil(filtered.length/20))}</span><div className="management-actions"><button className="management-button secondary" disabled={page===1} onClick={()=>setPage(value=>value-1)}>Previous</button><button className="management-button secondary" disabled={page*20>=filtered.length} onClick={()=>setPage(value=>value+1)}>Next</button></div></div></>:<div className="planning-board">{taskStatuses.map(value=><section className="planning-board-column" key={value}><h2>{value} <span className="planning-muted">({filtered.filter(task=>task.status===value).length})</span></h2>{filtered.filter(task=>task.status===value).map(task=><article className="planning-task-card" key={task.id}><div className="planning-inline"><Badge value={task.priority}/>{isOverdue(task)&&<Badge value="Overdue"/>}</div><Link className="planning-item-title" to={'/tasks/'+task.id}>{task.name}</Link><p>{task.project_name} · {prettyDate(task.due_date)}</p><footer><span>{task.assignee_name||'Unassigned'}</span>{statusControl(task)}</footer></article>)}</section>)}</div>}
    </LoadState>
    {editing&&<TaskDialog projects={projects||[]} task={editing.id?editing:null} projectId={filters.project} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setNotice('Task saved.');reload();}}/>}
    {reminding&&<ReminderDialog task={reminding} onClose={()=>setReminding(null)} onSaved={()=>{setReminding(null);setNotice('Personal reminder scheduled. View it on your calendar.');}}/>}
  </div>;
}
