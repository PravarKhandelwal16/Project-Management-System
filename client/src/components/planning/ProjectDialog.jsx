import { useState } from 'react';
import { apiRequest } from '../../services/api';
import ManagementDialog from '../management/ManagementDialog';
import { projectStatuses } from '../../utils/planning';
export default function ProjectDialog({project,onClose,onSaved}) {
  const [form,setForm]=useState({name:project?.name||'',description:project?.description||'',status:project?.status||'Not Started',start_date:project?.start_date||'',end_date:project?.end_date||''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=event=>setForm(previous=>({...previous,[event.target.name]:event.target.value}));
  const submit=async event=>{
    event.preventDefault();setError('');
    if(form.start_date&&form.end_date&&form.start_date>form.end_date){setError('End date must be on or after the start date.');return;}
    setBusy(true);
    try{const response=await apiRequest('/projects'+(project?'/'+project.id:''),{method:project?'PUT':'POST',data:form});onSaved(response.data);}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  return <ManagementDialog title={project?'Edit project':'Create project'} compact busy={busy} onClose={onClose}>
    {error&&<div className="management-notice error" role="alert">{error}</div>}
    <form className="management-form" onSubmit={submit}>
      <label>Project name<input name="name" required minLength={2} maxLength={255} value={form.name} disabled={busy} onChange={change} placeholder="Name your next initiative"/></label>
      <label>Description<textarea name="description" rows="3" value={form.description} disabled={busy} onChange={change} maxLength={10000}/></label>
      <label>Status<select name="status" value={form.status} disabled={busy} onChange={change}>{projectStatuses.map(value=><option key={value}>{value}</option>)}</select></label>
      <div className="planning-form-row"><label>Start date<input type="date" name="start_date" value={form.start_date} disabled={busy} onChange={change}/></label><label>Target end date<input type="date" name="end_date" min={form.start_date||undefined} value={form.end_date} disabled={busy} onChange={change}/></label></div>
      <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="management-button" disabled={busy}>{busy?'Saving…':project?'Save changes':'Create project'}</button></div>
    </form>
  </ManagementDialog>;
}
