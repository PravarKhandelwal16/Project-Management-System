import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, addMonths, startOfMonth, startOfWeek, endOfMonth, format, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Bell } from 'lucide-react';
import useRemote from '../hooks/useRemote';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadState, Badge } from '../components/planning/PlanningUI';
import TaskDialog from '../components/planning/TaskDialog';
import ReminderDialog from '../components/planning/ReminderDialog';
import ReminderList from '../components/planning/ReminderList';
import { dateKey, todayKey, prettyDate, isOverdue } from '../utils/planning';
export default function Calendar(){
  const {user,hasPermission}=useAuth();
  const tasks=useRemote(hasPermission('tasks.view')&&hasPermission('projects.view')?'/tasks':null);
  const projects=useRemote(hasPermission('projects.view')?'/projects':null);
  const reminders=useRemote('/reminders');
  const [month,setMonth]=useState(()=>startOfMonth(new Date())),[selected,setSelected]=useState(todayKey);
  const [view,setView]=useState('month'),[projectFilter,setProjectFilter]=useState(''),[mine,setMine]=useState(false),[completed,setCompleted]=useState(false),[history,setHistory]=useState(false);
  const [creatingTask,setCreatingTask]=useState(false),[editingReminder,setEditingReminder]=useState(null),[notice,setNotice]=useState('');
  const events=useMemo(()=>{
    const taskEvents=(tasks.data||[]).filter(task=>task.due_date&&(!projectFilter||task.project_id===Number(projectFilter))&&(!mine||task.assigned_to===user.id)&&(completed||task.status!=='Completed')).map(task=>({id:'task-'+task.id,date:task.due_date,type:'task',title:task.name,task}));
    const reminderEvents=(reminders.data||[]).filter(reminder=>history||reminder.status==='scheduled').map(reminder=>({id:'reminder-'+reminder.id,date:dateKey(new Date(reminder.remind_at)),type:'reminder',title:reminder.title,reminder}));
    return [...taskEvents,...reminderEvents].sort((a,b)=>a.date.localeCompare(b.date)||(a.reminder?.remind_at||'').localeCompare(b.reminder?.remind_at||''));
  },[tasks.data,reminders.data,projectFilter,mine,completed,history,user.id]);
  const first=startOfWeek(month,{weekStartsOn:1}),days=Array.from({length:42},(_,index)=>addDays(first,index));
  const dayEvents=events.filter(event=>event.date===selected);
  const visibleDates=[...new Set(events.filter(event=>event.date>=dateKey(month)&&event.date<=dateKey(endOfMonth(month))).map(event=>event.date))];
  const refresh=()=>{tasks.reload();reminders.reload();projects.reload();};
  const navigateMonth=step=>{const next=addMonths(month,step);setMonth(next);setSelected(dateKey(next));};
  const eventItem=event=>event.type==='task'?<Link key={event.id} to={'/tasks/'+event.task.id} className={'calendar-event '+(event.task.status==='Completed'?'completed':isOverdue(event.task)?'overdue':'')}>{event.title}</Link>:<button key={event.id} className="calendar-event reminder" onClick={()=>setEditingReminder(event.reminder)}>{format(new Date(event.reminder.remind_at),'h:mm a')} · {event.title}</button>;
  return <div className="planning-page"><PageHeader eyebrow="PLANNING" title="Calendar" description="Task deadlines and personal reminders, in one place."><button className="management-button secondary" onClick={()=>setEditingReminder({})}><Bell size={14}/> Add reminder</button>{hasPermission('tasks.create')&&hasPermission('tasks.view')&&hasPermission('projects.view')&&<button className="management-button" onClick={()=>setCreatingTask(true)}><Plus size={14}/> New task</button>}</PageHeader>
    {notice&&<div className="management-notice" role="status">{notice}</div>}
    <div className="management-toolbar">{hasPermission('projects.view')&&<select aria-label="Project deadlines filter" value={projectFilter} onChange={event=>setProjectFilter(event.target.value)}><option value="">All project deadlines</option>{(projects.data||[]).map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>}
      <label className="planning-inline"><input type="checkbox" checked={mine} onChange={event=>setMine(event.target.checked)} style={{minWidth:0}}/> My assigned tasks</label>
      <label className="planning-inline"><input type="checkbox" checked={completed} onChange={event=>setCompleted(event.target.checked)} style={{minWidth:0}}/> Completed tasks</label>
      <label className="planning-inline"><input type="checkbox" checked={history} onChange={event=>setHistory(event.target.checked)} style={{minWidth:0}}/> Past reminder history</label>
      <button className="management-button secondary" onClick={refresh}>Refresh</button>
    </div>
    <LoadState loading={tasks.loading||reminders.loading||projects.loading} error={tasks.error||reminders.error||projects.error} onRetry={refresh}>
      <div className="calendar-layout"><section className="calendar-panel">
        <div className="calendar-toolbar"><div className="planning-inline"><button className="management-button secondary" aria-label="Previous month" onClick={()=>navigateMonth(-1)}><ChevronLeft size={15}/></button><h2>{format(month,'MMMM yyyy')}</h2><button className="management-button secondary" aria-label="Next month" onClick={()=>navigateMonth(1)}><ChevronRight size={15}/></button></div><div className="planning-inline"><button className="management-button secondary" onClick={()=>{setMonth(startOfMonth(new Date()));setSelected(todayKey());}}>Today</button><button className="management-button secondary" aria-pressed={view==='month'} onClick={()=>setView('month')}>Month</button><button className="management-button secondary" aria-pressed={view==='agenda'} onClick={()=>setView('agenda')}>Agenda</button></div></div>
        {view==='month'?<><div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map(day=>{
          const key=dateKey(day),items=events.filter(event=>event.date===key);
          return <div key={key} className={'calendar-day '+(!isSameMonth(day,month)?'outside ':'')+(key===todayKey()?'today ':'')+(key===selected?'selected':'')}><button className="calendar-day-number" aria-label={format(day,'EEEE, MMMM d, yyyy')+', '+items.length+' events'} aria-pressed={key===selected} onClick={()=>setSelected(key)}>{format(day,'d')}</button>{items.slice(0,3).map(eventItem)}{items.length>3&&<button className="calendar-more" onClick={()=>setSelected(key)}>+{items.length-3} more</button>}</div>;
        })}</div></>:<div className="calendar-agenda" style={{padding:22}}>{!visibleDates.length?<p className="planning-muted">No dated tasks or reminders this month.</p>:visibleDates.map(day=><section className="calendar-agenda-group" key={day}><button className="planning-text-link" style={{border:0,background:'none',cursor:'pointer'}} onClick={()=>setSelected(day)}><h2>{prettyDate(day)}</h2></button>{events.filter(event=>event.date===day).map(event=>event.type==='task'?<div className="planning-task-row" key={event.id}><div><Link className="planning-item-title" to={'/tasks/'+event.task.id}>{event.title}</Link><small>{event.task.project_name} · {event.task.assignee_name||'Unassigned'}</small></div><Badge value={event.task.status}/></div>:eventItem(event))}</section>)}</div>}
        <div className="calendar-legend"><span>Task deadline</span><span className="reminder">Personal reminder</span><span className="completed">Completed task</span></div>
      </section><aside className="planning-panel">
        <div className="planning-eyebrow">SELECTED DAY</div><h2>{prettyDate(selected)}</h2><p className="planning-muted" style={{margin:'8px 0 18px'}}>{dayEvents.length} scheduled items</p>
        <div className="management-actions">{hasPermission('tasks.create')&&hasPermission('tasks.view')&&hasPermission('projects.view')&&<button className="management-button" onClick={()=>setCreatingTask(true)}>Add task</button>}<button className="management-button secondary" onClick={()=>setEditingReminder({})}>Add reminder</button></div>
        {dayEvents.filter(event=>event.type==='task').map(event=><div className="planning-task-row" key={event.id}><div><Link className="planning-item-title" to={'/tasks/'+event.task.id}>{event.title}</Link><small>{event.task.project_name}</small></div><Badge value={event.task.priority}/></div>)}
        <ReminderList reminders={dayEvents.filter(event=>event.type==='reminder').map(event=>event.reminder)} onEdit={setEditingReminder} onChanged={reminders.reload}/>
        {!dayEvents.length&&<p className="planning-muted" style={{marginTop:20}}>Choose a day, then add work or a follow-up.</p>}
      </aside></div>
      {(tasks.data||[]).some(task=>!task.due_date)&&<p className="planning-muted" style={{marginTop:18}}>{tasks.data.filter(task=>!task.due_date).length} tasks have no due date. <Link className="planning-text-link" to="/tasks?due=undated">Review undated tasks</Link></p>}
    </LoadState>
    {creatingTask&&<TaskDialog projects={projects.data||[]} projectId={projectFilter} defaultDate={selected} onClose={()=>setCreatingTask(false)} onSaved={()=>{setCreatingTask(false);setNotice('Task created and added to the calendar.');tasks.reload();}}/>}
    {editingReminder&&<ReminderDialog reminder={editingReminder.id?editingReminder:null} defaultDate={selected} onClose={()=>setEditingReminder(null)} onSaved={()=>{setEditingReminder(null);setNotice('Reminder saved.');reminders.reload();}}/>}
  </div>;
}
