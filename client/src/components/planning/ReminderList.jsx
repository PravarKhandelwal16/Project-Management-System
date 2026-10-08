import { useConfirm } from '../../context/ConfirmationContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { prettyTime } from '../../utils/planning';
export default function ReminderList({reminders,onEdit,onChanged}) {
  const confirm = useConfirm();
  const [busy,setBusy]=useState(null),[error,setError]=useState('');
  const act=async(reminder,remove=false)=>{
    if(remove&&!await confirm({title:'Delete reminder?',description:'Permanently delete "'+reminder.title+'"? This cannot be undone.',confirmLabel:'Delete reminder'}))return;
    setBusy(reminder.id);setError('');
    try{await apiRequest('/reminders/'+reminder.id,{method:remove?'DELETE':'PUT',data:remove?undefined:{status:'dismissed'}});onChanged();}catch(err){setError(err.message);}finally{setBusy(null);}
  };
  return <>{error&&<div className="management-notice error" role="alert">{error}</div>}{!reminders.length?<p className="planning-muted">No reminders to show.</p>:reminders.map(reminder=><div className="planning-reminder-row" key={reminder.id}>
    <div className="planning-inline"><h3>{reminder.title}</h3><span className="planning-badge">{reminder.status}</span></div><p>{prettyTime(reminder.remind_at)}</p>{reminder.notes&&<p>{reminder.notes}</p>}
    {reminder.task_id&&<p><Link className="planning-text-link" to={'/tasks/'+reminder.task_id}>Open linked task</Link></p>}
    <div className="management-actions"><button className="management-button secondary" disabled={busy!==null} onClick={()=>onEdit(reminder)}>{reminder.status==='scheduled'?'Edit':'Reschedule'}</button>{reminder.status==='scheduled'&&<button className="management-button secondary" disabled={busy!==null} onClick={()=>act(reminder)}>Dismiss</button>}<button className="management-button danger" disabled={busy!==null} onClick={()=>act(reminder,true)}>Delete</button></div>
  </div>)}</>;
}
