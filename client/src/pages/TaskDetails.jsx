import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import useRemote from '../hooks/useRemote';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadState, Badge } from '../components/planning/PlanningUI';
import TaskDialog from '../components/planning/TaskDialog';
import ReminderDialog from '../components/planning/ReminderDialog';
import ReminderList from '../components/planning/ReminderList';
import { prettyDate, taskStatuses, isOverdue, canChangeStatus } from '../utils/planning';
export default function TaskDetails(){
  const {id}=useParams(),navigate=useNavigate();const {user,hasPermission}=useAuth();
  const {data:task,loading,error,reload}=useRemote('/tasks/'+id);
  const {data:projects=[]}=useRemote('/projects');
  const reminders=useRemote('/reminders?task_id='+id);
  const [editing,setEditing]=useState(false),[reminder,setReminder]=useState(null),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[notice,setNotice]=useState('');
  const changeStatus=async value=>{setBusy(true);setActionError('');try{await apiRequest('/tasks/'+id+'/status',{method:'PATCH',data:{status:value}});reload();setNotice('Status updated.');}catch(err){setActionError(err.message);}finally{setBusy(false);}};
  const remove=async()=>{if(!window.confirm('Delete "'+task.name+'"? This cannot be undone.'))return;setBusy(true);setActionError('');try{await apiRequest('/tasks/'+id,{method:'DELETE'});navigate('/tasks');}catch(err){setActionError(err.message);}finally{setBusy(false);}};
  return <div className="planning-page"><Link className="planning-text-link" to="/tasks">← All tasks</Link><PageHeader eyebrow={task?.project_name||'TASK'} title={task?.name||'Task details'} description="Keep the work, ownership and follow-ups in one place.">{task&&hasPermission('tasks.edit')&&<button className="management-button secondary" onClick={()=>setEditing(true)}>Edit task</button>}{task&&<button className="management-button" disabled={task.status==='Completed'} onClick={()=>setReminder({})}>Add reminder</button>}</PageHeader>
    {notice&&<div className="management-notice" role="status">{notice}</div>}{actionError&&<div className="management-notice error" role="alert">{actionError}</div>}
    <LoadState loading={loading} error={error} onRetry={reload}>{task&&<div className="planning-layout"><section className="planning-panel"><div className="planning-panel-header"><h2>Task brief</h2><div className="planning-inline"><Badge value={task.priority}/>{isOverdue(task)&&<Badge value="Overdue"/>}</div></div><p className="planning-description">{task.description||'No description yet.'}</p><dl className="planning-details-list"><dt>Project</dt><dd><Link className="planning-text-link" to={'/projects/'+task.project_id}>{task.project_name}</Link></dd><dt>Assignee</dt><dd>{task.assignee_name||'Unassigned'}</dd><dt>Due date</dt><dd>{prettyDate(task.due_date)}</dd><dt>Created by</dt><dd>{task.creator_name||'—'}</dd><dt>Status</dt><dd>{canChangeStatus(user,hasPermission,task)?<select className="planning-status-select" disabled={busy} aria-label="Task status" value={task.status} onChange={event=>changeStatus(event.target.value)}>{taskStatuses.map(value=><option key={value}>{value}</option>)}</select>:<Badge value={task.status}/>}</dd></dl>{hasPermission('tasks.delete')&&<button className="management-button danger" style={{marginTop:25}} disabled={busy} onClick={remove}>Delete task</button>}</section>
      <section className="planning-panel"><div className="planning-panel-header"><h2>My reminders</h2><Link to="/calendar" className="planning-text-link">Calendar</Link></div><p className="planning-muted">Only you see these follow-ups. Completed-task reminders are dismissed automatically.</p><LoadState loading={reminders.loading} error={reminders.error} onRetry={reminders.reload}><ReminderList reminders={reminders.data||[]} onEdit={setReminder} onChanged={reminders.reload}/></LoadState></section></div>}</LoadState>
    {editing&&task&&<TaskDialog task={task} projects={projects||[]} onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);setNotice('Task updated.');reload();}}/>}
    {reminder&&task&&<ReminderDialog reminder={reminder.id?reminder:null} task={task} onClose={()=>setReminder(null)} onSaved={()=>{setReminder(null);setNotice('Reminder scheduled.');reminders.reload();}}/>}
  </div>;
}
