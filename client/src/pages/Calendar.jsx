import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, addMonths, startOfMonth, startOfWeek, endOfMonth, format, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Bell, Palette, CalendarPlus } from 'lucide-react';
import useRemote from '../hooks/useRemote';
import { useAuth } from '../context/AuthContext';
import { PageHeader, LoadState, Badge } from '../components/planning/PlanningUI';
import TaskDialog from '../components/planning/TaskDialog';
import ReminderDialog from '../components/planning/ReminderDialog';
import ReminderList from '../components/planning/ReminderList';
import EventDialog from '../components/planning/EventDialog';
import CalendarColours from '../components/planning/CalendarColours';
import { defaultColours, colourStyle } from '../utils/calendar';
import { dateKey, todayKey, prettyDate, isOverdue } from '../utils/planning';

export default function Calendar(){
  const {user,hasPermission}=useAuth();
  const canViewTasks=hasPermission('tasks.view')&&hasPermission('projects.view');
  const canCreateTasks=canViewTasks&&hasPermission('tasks.create');
  const tasks=useRemote(canViewTasks?'/tasks':null);
  const projects=useRemote(hasPermission('projects.view')?'/projects':null);
  const reminders=useRemote('/reminders'), personalEvents=useRemote('/calendar/events'), colours=useRemote('/calendar/colours');
  const [month,setMonth]=useState(()=>startOfMonth(new Date())),[selected,setSelected]=useState(todayKey);
  const [view,setView]=useState('month'),[projectFilter,setProjectFilter]=useState(''),[mine,setMine]=useState(false),[completed,setCompleted]=useState(false),[history,setHistory]=useState(false);
  const [creatingTask,setCreatingTask]=useState(false),[editingReminder,setEditingReminder]=useState(null),[editingEvent,setEditingEvent]=useState(null),[editingColours,setEditingColours]=useState(false),[notice,setNotice]=useState('');
  const events=useMemo(()=>{
    const taskEvents=(tasks.data||[]).filter(task=>task.due_date&&(!projectFilter||Number(task.project_id)===Number(projectFilter))&&(!mine||Number(task.assigned_to)===Number(user.id))&&(completed||task.status!=='Completed')).map(task=>({id:'task:'+task.id,date:task.due_date.slice(0,10),type:'task',title:task.name,task}));
    const reminderEvents=(reminders.data||[]).filter(reminder=>history||reminder.status==='scheduled').map(reminder=>({id:'reminder:'+reminder.id,date:dateKey(new Date(reminder.remind_at)),type:'reminder',title:reminder.title,time:format(new Date(reminder.remind_at),'HH:mm'),reminder}));
    const calendarEvents=(personalEvents.data||[]).map(event=>({id:'event:'+event.id,date:event.event_date,type:'event',title:event.title,time:event.start_time||'',event}));
    return [...taskEvents,...reminderEvents,...calendarEvents].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
  },[tasks.data,reminders.data,personalEvents.data,projectFilter,mine,completed,history,user.id]);
  const eventsByDate=useMemo(()=>{const map=new Map();for(const event of events){if(!map.has(event.date))map.set(event.date,[]);map.get(event.date).push(event);}return map;},[events]);
  const first=startOfWeek(month,{weekStartsOn:1}),days=Array.from({length:42},(_,index)=>addDays(first,index));
  const dayEvents=eventsByDate.get(selected)||[];
  const visibleDates=[...eventsByDate.keys()].filter(day=>day>=dateKey(month)&&day<=dateKey(endOfMonth(month)));
  const refresh=()=>{tasks.reload();reminders.reload();projects.reload();personalEvents.reload();colours.reload();};
  const navigateMonth=step=>{const next=addMonths(month,step);setMonth(next);setSelected(dateKey(next));};
  const styleFor=event=>{
    const category=event.type==='task'?(event.task.status==='Completed'?'completed':isOverdue(event.task)?'overdue':'task'):event.type;
    return colourStyle(colours.data?.[event.id]||colours.data?.[category]||defaultColours[category]);
  };
  const eventItem=event=>{
    const content=<><span className="calendar-event-type">{event.type==='task'?'Task':event.type==='reminder'?'Reminder':'Event'}</span> {event.time&&event.time+' · '}{event.title}</>;
    return event.type==='task'?<Link key={event.id} title={'Task: '+event.title} to={'/tasks/'+event.task.id} className="calendar-event" style={styleFor(event)}>{content}</Link>:<button key={event.id} title={(event.type==='reminder'?'Reminder: ':'Event: ')+event.title} className="calendar-event" style={styleFor(event)} onClick={()=>event.type==='reminder'?setEditingReminder(event.reminder):setEditingEvent(event.event)}>{content}</button>;
  };
  return <div className="planning-page">
    <PageHeader eyebrow="PLANNING" title="Calendar" description="Task deadlines, personal events and reminders, in one place.">
      <button className="management-button secondary" onClick={()=>setEditingEvent({})}><CalendarPlus size={14}/> Add event</button>
      <button className="management-button secondary" onClick={()=>setEditingReminder({})}><Bell size={14}/> Add reminder</button>
      {canCreateTasks&&<button className="management-button" onClick={()=>setCreatingTask(true)}><Plus size={14}/> New task</button>}
    </PageHeader>
    {notice&&<div className="management-notice" role="status">{notice}</div>}
    <div className="management-toolbar">
      {hasPermission('projects.view')&&<select aria-label="Project deadlines filter" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="">All project deadlines</option>{(projects.data||[]).map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>}
      {canViewTasks&&<><label className="planning-inline"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)} style={{minWidth:0}}/> My assigned tasks</label><label className="planning-inline"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)} style={{minWidth:0}}/> Completed tasks</label></>}
      <label className="planning-inline"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)} style={{minWidth:0}}/> Past reminder history</label>
      <button className="management-button secondary" onClick={refresh}>Refresh</button>
    </div>
    <LoadState calendar loading={tasks.loading||reminders.loading||projects.loading||personalEvents.loading||colours.loading} error={tasks.error||reminders.error||projects.error||personalEvents.error||colours.error} onRetry={refresh}>
      <div className="calendar-layout">
        <section className="calendar-panel" aria-label="Calendar">
          <div className="calendar-toolbar">
            <div className="planning-inline"><button className="management-button secondary" aria-label="Previous month" onClick={()=>navigateMonth(-1)}><ChevronLeft size={15}/></button><h2>{format(month,'MMMM yyyy')}</h2><button className="management-button secondary" aria-label="Next month" onClick={()=>navigateMonth(1)}><ChevronRight size={15}/></button></div>
            <div className="planning-inline"><button className="management-button secondary" onClick={()=>{setMonth(startOfMonth(new Date()));setSelected(todayKey());}}>Today</button><button className="management-button secondary" aria-pressed={view==='month'} onClick={()=>setView('month')}>Month</button><button className="management-button secondary" aria-pressed={view==='agenda'} onClick={()=>setView('agenda')}>Agenda</button><button className="management-button secondary" onClick={()=>setEditingColours(true)}><Palette size={14}/> Colours</button></div>
          </div>
          {view==='month'?<>
            <div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">{days.map(day=>{
              const key=dateKey(day),items=eventsByDate.get(key)||[];
              return <div key={key} className={'calendar-day '+(!isSameMonth(day,month)?'outside ':'')+(key===todayKey()?'today ':'')+(key===selected?'selected':'')}>
                <button className="calendar-day-select" aria-label={format(day,'EEEE, MMMM d, yyyy')+', '+items.length+' items. Select day'} aria-pressed={key===selected} onClick={()=>setSelected(key)}><span className="calendar-day-number">{format(day,'d')}</span></button>
                <div className="calendar-day-events">{items.slice(0,3).map(eventItem)}{items.length>3&&<button className="calendar-more" onClick={()=>setSelected(key)}>+{items.length-3} more</button>}</div>
              </div>;
            })}</div>
          </>:<div className="calendar-agenda">{!visibleDates.length?<p className="planning-muted">No scheduled items this month.</p>:visibleDates.map(day=><section className="calendar-agenda-group" key={day}><button className="calendar-agenda-date" onClick={()=>setSelected(day)}>{prettyDate(day)}</button>{eventsByDate.get(day).map(eventItem)}</section>)}</div>}
          <div className="calendar-legend">{Object.entries(defaultColours).map(([key])=><span key={key}><i style={{background:colours.data?.[key]||defaultColours[key]}}/>{key==='task'?'Task deadline':key==='completed'?'Completed task':key==='overdue'?'Overdue task':key==='reminder'?'Reminder':'Event'}</span>)}</div>
        </section>
        <aside className="planning-panel calendar-selected" aria-live="polite">
          <div className="planning-eyebrow">SELECTED DAY</div><h2>{prettyDate(selected)}</h2><p className="planning-muted" style={{margin:'8px 0 18px'}}>{dayEvents.length} scheduled items</p>
          <div className="management-actions">{canCreateTasks&&<button className="management-button" onClick={()=>setCreatingTask(true)}>Add task</button>}<button className="management-button secondary" onClick={()=>setEditingReminder({})}>Add reminder</button><button className="management-button secondary" onClick={()=>setEditingEvent({})}>Add event</button></div>
          {dayEvents.filter(item=>item.type==='task').map(item=><div className="planning-task-row" key={item.id}><div><Link className="planning-item-title" to={'/tasks/'+item.task.id}>{item.title}</Link><small>{item.task.project_name}</small></div><Badge value={item.task.priority}/></div>)}
          {dayEvents.filter(item=>item.type==='event').map(item=><div className="calendar-selected-event" key={item.id}>{eventItem(item)}<small>{item.event.start_time?(item.event.start_time+(item.event.end_time?' – '+item.event.end_time:'')):'All day'}</small>{item.event.notes&&<p>{item.event.notes}</p>}</div>)}
          <ReminderList reminders={dayEvents.filter(item=>item.type==='reminder').map(item=>item.reminder)} onEdit={setEditingReminder} onChanged={reminders.reload}/>
          {!dayEvents.length&&<p className="planning-muted" style={{marginTop:20}}>Click anywhere on a date, then add work or a follow-up.</p>}
          {!!dayEvents.length&&<button className="management-button secondary" style={{marginTop:18}} onClick={()=>setEditingColours(true)}><Palette size={14}/> Change item colours</button>}
        </aside>
      </div>
      {(tasks.data||[]).some(task=>!task.due_date)&&<p className="planning-muted" style={{marginTop:18}}>{tasks.data.filter(task=>!task.due_date).length} tasks have no due date. <Link className="planning-text-link" to="/tasks?due=undated">Review undated tasks</Link></p>}
    </LoadState>
    {creatingTask&&<TaskDialog projects={projects.data||[]} projectId={projectFilter} defaultDate={selected} onClose={()=>setCreatingTask(false)} onSaved={task=>{setCreatingTask(false);if(task?.due_date){const day=task.due_date.slice(0,10);setSelected(day);setMonth(startOfMonth(new Date(day+'T12:00:00')));}setMine(false);setProjectFilter('');setCompleted(true);setNotice('Task created and added beneath its due date.');tasks.reload();}}/>}
    {editingReminder&&<ReminderDialog reminder={editingReminder.id?editingReminder:null} defaultDate={selected} onClose={()=>setEditingReminder(null)} onSaved={reminder=>{setEditingReminder(null);const day=dateKey(new Date(reminder.remind_at));setSelected(day);setMonth(startOfMonth(new Date(day+'T12:00:00')));setNotice('Reminder saved and added beneath its date.');reminders.reload();}}/>}
    {editingEvent&&<EventDialog event={editingEvent.id?editingEvent:null} defaultDate={selected} onClose={()=>setEditingEvent(null)} onSaved={event=>{setEditingEvent(null);if(event){setSelected(event.event_date);setMonth(startOfMonth(new Date(event.event_date+'T12:00:00')));}setNotice(event?'Event saved and added beneath its date.':'Event deleted.');personalEvents.reload();}}/>}
    {editingColours&&<CalendarColours colours={colours.data||{}} items={dayEvents} onClose={()=>setEditingColours(false)} onSaved={()=>{setEditingColours(false);colours.reload();setNotice('Calendar colours saved to your account.');}}/>}
  </div>;
}
