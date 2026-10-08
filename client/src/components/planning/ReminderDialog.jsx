import { useState } from 'react';
import { format, addHours } from 'date-fns';
import { apiRequest } from '../../services/api';
import ManagementDialog from '../management/ManagementDialog';
export default function ReminderDialog({reminder,task,defaultDate,onClose,onSaved}) {
  const [initialTime]=useState(()=>reminder?.remind_at?format(new Date(reminder.remind_at),"yyyy-MM-dd'T'HH:mm"):defaultDate && defaultDate !== format(new Date(),'yyyy-MM-dd')?defaultDate+'T09:00':format(addHours(new Date(),1),"yyyy-MM-dd'T'HH:mm"));
  const [form,setForm]=useState({title:reminder?.title||task?.name||'',notes:reminder?.notes||'',remind_at:initialTime});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=event=>setForm(previous=>({...previous,[event.target.name]:event.target.value}));
  const submit=async event=>{
    event.preventDefault();setError('');
    const time=new Date(form.remind_at);
    if(!Number.isFinite(time.getTime())||time.getTime()<=Date.now()){setError('Choose a reminder time in the future.');return;}
    setBusy(true);
    try{const response=await apiRequest('/reminders'+(reminder?'/'+reminder.id:''),{method:reminder?'PUT':'POST',data:{title:form.title.trim(),notes:form.notes,remind_at:time.toISOString(),task_id:task?.id||reminder?.task_id||null}});onSaved(response.data);}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  return <ManagementDialog title={reminder?'Edit reminder':'Add reminder'} compact busy={busy} onClose={onClose}>
    <p className="planning-muted">A personal in-app notification{task?' for '+task.name:''}. Only you can see this reminder.</p>
    {error&&<div className="management-notice error" role="alert">{error}</div>}
    <form className="management-form" onSubmit={submit}>
      <label>Reminder title<input required maxLength={255} name="title" value={form.title} disabled={busy} onChange={change} placeholder="Follow up, review or prepare…"/></label>
      <label>When<input required type="datetime-local" name="remind_at" value={form.remind_at} disabled={busy} onChange={change}/><small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</small></label>
      <label>Notes<textarea name="notes" rows="3" maxLength={5000} value={form.notes} disabled={busy} onChange={change}/></label>
      {task&&<small>Reminders for completed tasks are dismissed automatically.</small>}
      <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="management-button" disabled={busy}>{busy?'Saving…':'Save reminder'}</button></div>
    </form>
  </ManagementDialog>;
}
