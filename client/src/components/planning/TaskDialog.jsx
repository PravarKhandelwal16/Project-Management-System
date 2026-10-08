import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ManagementDialog from '../management/ManagementDialog';
import { priorities, taskStatuses } from '../../utils/planning';
export default function TaskDialog({projects,task,projectId,defaultDate='',onClose,onSaved}) {
  const {user,hasPermission}=useAuth();
  const [form,setForm]=useState({project_id:task?.project_id?.toString()||projectId?.toString()||projects[0]?.id.toString()||'',name:task?.name||'',description:task?.description||'',priority:task?.priority||'Medium',status:task?.status||'Pending',due_date:task?.due_date||defaultDate,assigned_to:task?.assigned_to?.toString()||''});
  const [members,setMembers]=useState([]);
  const [memberLoading,setMemberLoading]=useState(false);
  const [memberError,setMemberError]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const canAssign=hasPermission('tasks.assign');
  const canSetStatus=hasPermission('tasks.status')||task?.assigned_to===user?.id&&hasPermission('tasks.status_assigned');
  useEffect(()=>{
    if(!form.project_id||!canAssign)return;
    let active=true;
    Promise.resolve().then(async()=>{
      if(!active)return;setMemberLoading(true);setMemberError('');
      try {
        const response=await apiRequest('/projects/'+form.project_id+'/members');
        const project=projects.find(item=>item.id===Number(form.project_id));
        const choices=[{user_id:project?.user_id,full_name:project?.owner_name,is_active:true},...response.data];
        if(active)setMembers(choices.filter(item=>item.user_id&&(item.is_active||item.user_id===task?.assigned_to)));
      }catch(err){if(active){setMembers([]);setMemberError(err.message);}}finally{if(active)setMemberLoading(false);}
    });
    return()=>{active=false;};
  },[form.project_id,canAssign,projects,task?.assigned_to]);
  const change=event=>setForm(previous=>({...previous,[event.target.name]:event.target.value,...(event.target.name==='project_id'?{assigned_to:''}:{})}));
  const submit=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const data={name:form.name.trim(),description:form.description,priority:form.priority,due_date:form.due_date||null};
      if(canSetStatus||!task)data.status=form.status;
      if(canAssign)data.assigned_to=form.assigned_to?Number(form.assigned_to):null;
      if(!task)data.project_id=Number(form.project_id);
      const response=await apiRequest(task?'/tasks/'+task.id:'/tasks',{method:task?'PUT':'POST',data});
      onSaved(response.data);
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  return <ManagementDialog title={task?'Edit task':'Create task'} compact busy={busy} onClose={onClose}>
    {error&&<div className="management-notice error" role="alert">{error}</div>}
    <form className="management-form" onSubmit={submit}>
      <label>Project<select name="project_id" required disabled={busy||!!task} value={form.project_id} onChange={change}><option value="">Choose a project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Task name<input name="name" required minLength={2} maxLength={255} disabled={busy} value={form.name} onChange={change} placeholder="What needs to be done?"/></label>
      <label>Description<textarea name="description" maxLength={10000} rows="3" disabled={busy} value={form.description} onChange={change} placeholder="Outcome, requirements or useful context"/></label>
      <div className="planning-form-row"><label>Priority<select name="priority" disabled={busy} value={form.priority} onChange={change}>{priorities.map(value=><option key={value}>{value}</option>)}</select></label><label>Due date<input type="date" name="due_date" disabled={busy} value={form.due_date} onChange={change}/></label></div>
      {(canSetStatus||!task)&&<label>Status<select name="status" disabled={busy} value={form.status} onChange={change}>{taskStatuses.map(value=><option key={value}>{value}</option>)}</select></label>}
      {canAssign&&<label>Assign to<select name="assigned_to" disabled={busy||memberLoading||!!memberError} value={form.assigned_to} onChange={change}><option value="">Unassigned</option>{members.map(member=><option key={member.user_id} value={member.user_id}>{member.full_name}{!member.is_active?' (inactive)':''}</option>)}</select><small>{memberLoading?'Loading project members…':'Only the project owner and project members can be assigned.'}</small>{memberError&&<span role="alert">{memberError}</span>}</label>}
      <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="management-button" disabled={busy||!form.project_id||canAssign&&memberLoading}>{busy?'Saving…':task?'Save changes':'Create task'}</button></div>
    </form>
  </ManagementDialog>;
}
