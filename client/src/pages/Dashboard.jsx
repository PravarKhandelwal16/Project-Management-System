import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bell, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useRemote from '../hooks/useRemote';
import { PageHeader, Metrics, LoadState, Progress, Badge, TaskLink } from '../components/planning/PlanningUI';
import ActivityChart from '../components/planning/ActivityChart';
import TaskDialog from '../components/planning/TaskDialog';
import ProjectDialog from '../components/planning/ProjectDialog';
import ReminderDialog from '../components/planning/ReminderDialog';
import { zone, prettyTime, prettyDate } from '../utils/planning';
export default function Dashboard(){
  const {user,hasPermission}=useAuth();const {data,loading,error,reload}=useRemote('/dashboard?tz='+encodeURIComponent(zone));
  const projects=useRemote(hasPermission('projects.view')?'/projects':null);
  const [focus,setFocus]=useState('overdue'),[dialog,setDialog]=useState(''),[notice,setNotice]=useState('');
  const summary=data?.summary||{};
  const focusTasks=focus==='overdue'?data?.overdueTasks||[]:focus==='today'?data?.dueTodayTasks||[]:(data?.tasks||[]).filter(task=>task.assigned_to===user.id&&task.status!=='Completed').slice(0,8);
  const myOpen=(data?.tasks||[]).filter(task=>task.assigned_to===user.id&&task.status!=='Completed').length;
  const canCreateTask=hasPermission('tasks.create')&&hasPermission('tasks.view')&&hasPermission('projects.view');
  const close=()=>setDialog('');
  const saved=()=>{close();setNotice('Saved to your workspace.');reload();projects.reload();};
  return <div className="planning-page"><PageHeader title={'Welcome back, '+(user?.full_name?.split(' ')[0]||'there')} description="A clear view of what needs attention and what is moving forward."><button className="management-button secondary" onClick={()=>setDialog('reminder')}><Bell size={14}/> Add reminder</button>{canCreateTask&&<button className="management-button secondary" onClick={()=>setDialog('task')}><Plus size={14}/> New task</button>}{hasPermission('projects.create')&&hasPermission('projects.view')&&<button className="management-button" onClick={()=>setDialog('project')}><Plus size={14}/> New project</button>}</PageHeader>
    {notice&&<div className="management-notice" role="status">{notice}</div>}
    <LoadState loading={loading} error={error} onRetry={reload}>{data&&<>
      <Metrics items={[{label:'Active projects',value:summary.projectsInProgress,note:summary.totalProjects+' accessible projects'},{label:'My open tasks',value:hasPermission('tasks.view')?myOpen:null,note:'Assigned to you'},{label:'Due today',value:hasPermission('tasks.view')?summary.dueToday:null,note:'Across accessible projects'},{label:'Overdue tasks',value:hasPermission('tasks.view')?summary.overdueTasks:null,note:'Open deadlines that need attention',tone:'danger'}]}/>
      <div className="planning-layout"><section className="planning-panel"><div className="planning-panel-header"><h2>Needs attention</h2>{hasPermission('tasks.view')&&<Link to="/tasks">All tasks <ArrowUpRight size={12}/></Link>}</div><div className="management-tabs">{[['overdue','Overdue',summary.overdueTasks],['today','Today',summary.dueToday],['mine','My work',myOpen]].map(([key,label,count])=><button key={key} className={focus===key?'active':''} onClick={()=>setFocus(key)}>{label} <span className="planning-muted">({count||0})</span></button>)}</div>{!hasPermission('tasks.view')?<p className="planning-muted">Task viewing is restricted for your account.</p>:!focusTasks.length?<p className="planning-muted" style={{padding:'22px 0'}}>You're clear here. Check your tasks or plan the next step.</p>:focusTasks.map(task=><TaskLink key={task.id} task={task}/>)}{hasPermission('tasks.view')&&<div style={{marginTop:15}}><Link className="planning-text-link" to="/tasks?ownership=unassigned">{summary.unassignedTasks} open tasks need an assignee</Link></div>}</section>
      <section className="planning-panel"><div className="planning-panel-header"><h2>Your next reminders</h2><Link to="/calendar">Calendar <ArrowUpRight size={12}/></Link></div>{data.reminders.length?data.reminders.map(reminder=><div className="planning-task-row" key={reminder.id}><div><Link className="planning-item-title" to={reminder.task_id?'/tasks/'+reminder.task_id:'/calendar'}>{reminder.title}</Link><small>{prettyTime(reminder.remind_at)}</small></div><Bell size={15} color="#8b5cf6"/></div>):<p className="planning-muted">No scheduled reminders. Add a follow-up to keep your next step visible.</p>}<button className="management-button secondary" style={{marginTop:18}} onClick={()=>setDialog('reminder')}>Schedule a reminder</button></section></div>
      <div className="planning-two"><section className="planning-panel"><div className="planning-panel-header"><h2>Project progress</h2>{hasPermission('projects.view')&&<Link to="/projects">All projects <ArrowUpRight size={12}/></Link>}</div>{data.projects.length?data.projects.slice(0,4).map(project=><div key={project.id} style={{padding:'10px 0'}}><div className="planning-panel-header" style={{marginBottom:0}}><Link className="planning-item-title" to={'/projects/'+project.id}>{project.name}</Link><Badge value={project.status}/></div><Progress value={project.progress}/><p className="planning-muted">{project.owner_name} · Target {prettyDate(project.end_date)}</p></div>):<p className="planning-muted">Your projects will appear here when you own or join them.</p>}</section>
      <section className="planning-panel"><div className="planning-panel-header"><h2>Delivery pulse</h2>{hasPermission('analytics.view')&&<Link to="/analytics">Analytics <ArrowUpRight size={12}/></Link>}</div><p className="planning-muted">Task creation and completion over the past seven days.</p>{hasPermission('tasks.view')?<><ActivityChart data={data.taskActivity}/><div className="planning-inline" style={{marginTop:12}}><Badge value={summary.completionRate+'% complete'}/><span className="planning-muted">{summary.completedTasks} of {summary.totalTasks} accessible tasks completed</span></div></>:<p className="planning-muted">Task reporting is restricted for your account.</p>}</section></div>
    </>}</LoadState>
    {dialog==='task'&&<TaskDialog projects={projects.data||[]} onClose={close} onSaved={saved}/>}
    {dialog==='project'&&<ProjectDialog onClose={close} onSaved={saved}/>}
    {dialog==='reminder'&&<ReminderDialog onClose={close} onSaved={saved}/>}
  </div>;
}
