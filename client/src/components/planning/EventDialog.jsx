import { useConfirm } from '../../context/ConfirmationContext';
import { useState } from 'react';
import { apiRequest } from '../../services/api';
import ManagementDialog from '../management/ManagementDialog';
import { todayKey } from '../../utils/planning';
export default function EventDialog({event,defaultDate,onClose,onSaved}) {
  const confirm = useConfirm();
  const [form,setForm]=useState({title:event?.title||'',notes:event?.notes||'',event_date:event?.event_date||defaultDate||todayKey(),start_time:event?.start_time||'',end_time:event?.end_time||''});
  const [allDay,setAllDay]=useState(!event?.start_time),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=e=>setForm(previous=>({...previous,[e.target.name]:e.target.value}));
  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try { const response=await apiRequest('/calendar/events'+(event?'/'+event.id:''),{method:event?'PUT':'POST',data:{...form,start_time:allDay?null:form.start_time,end_time:allDay?null:form.end_time}});onSaved(response.data); }
    catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const remove=async()=>{
    if(!await confirm({title:'Delete event?',description:'Permanently delete "'+event.title+'" from your calendar? This cannot be undone.',confirmLabel:'Delete event'}))return;
    setBusy(true);setError('');
    try{await apiRequest('/calendar/events/'+event.id,{method:'DELETE'});onSaved();}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  return <ManagementDialog title={event?'Edit event':'Add event'} compact busy={busy} onClose={onClose}>
    <p className="planning-muted">A personal calendar event. Add a reminder separately if you need a notification.</p>
    {error&&<div className="management-notice error" role="alert">{error}</div>}
    <form className="management-form" onSubmit={submit}>
      <label>Event title<input required maxLength={255} name="title" value={form.title} disabled={busy} onChange={change}/></label>
      <label>Date<input required type="date" name="event_date" value={form.event_date} disabled={busy} onChange={change}/></label>
      <label className="calendar-all-day"><input type="checkbox" checked={allDay} disabled={busy} onChange={e=>setAllDay(e.target.checked)}/> All day</label>
      {!allDay&&<div className="planning-form-row"><label>Start<input required type="time" name="start_time" value={form.start_time} disabled={busy} onChange={change}/></label><label>End (optional)<input type="time" name="end_time" value={form.end_time} disabled={busy} onChange={change}/></label></div>}
      <label>Notes<textarea rows={3} maxLength={5000} name="notes" value={form.notes} disabled={busy} onChange={change}/></label>
      <div className="management-actions">{event&&<button type="button" className="management-button danger" disabled={busy} onClick={remove}>Delete</button>}<button type="button" className="management-button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="management-button" disabled={busy}>{busy?'Saving...':'Save event'}</button></div>
    </form>
  </ManagementDialog>;
}
