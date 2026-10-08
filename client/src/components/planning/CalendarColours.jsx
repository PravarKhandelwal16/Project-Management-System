import { useConfirm } from '../../context/ConfirmationContext';
import { useState } from 'react';
import { apiRequest } from '../../services/api';
import ManagementDialog from '../management/ManagementDialog';
import { defaultColours } from '../../utils/calendar';
import { isOverdue } from '../../utils/planning';
const labels={task:'Task deadlines',reminder:'Reminders',event:'Events',completed:'Completed tasks',overdue:'Overdue tasks'};
export default function CalendarColours({colours,items,onClose,onSaved}){
  const confirm = useConfirm();
  const [draft,setDraft]=useState({...defaultColours,...colours}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=(key,value)=>setDraft(previous=>({...previous,[key]:value}));
  const save=async e=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      for(const [key,colour] of Object.entries(draft))if(colour!==colours[key])await apiRequest('/calendar/colours',{method:'PUT',data:{key,colour}});
      onSaved();
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const reset=async()=>{
    if(!await confirm({title:'Reset calendar colours?',description:'Remove all your saved category and item colours and restore the defaults? This cannot be undone.',confirmLabel:'Reset colours'}))return;
    setBusy(true);setError('');
    try{await apiRequest('/calendar/colours',{method:'DELETE'});onSaved();}catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const category=item=>item.type==='task'?(item.task.status==='Completed'?'completed':isOverdue(item.task)?'overdue':'task'):item.type;
  return <ManagementDialog title="Calendar colours" compact busy={busy} onClose={onClose}>
    <p className="planning-muted">Set category colours or give an item its own colour. Saved for your account across devices.</p>
    {error&&<div className="management-notice error" role="alert">{error}</div>}
    <form className="management-form" onSubmit={save}>
      <fieldset className="calendar-colour-fields"><legend>Categories</legend>{Object.entries(labels).map(([key,label])=><label key={key}><span>{label}</span><input type="color" value={draft[key]} disabled={busy} onChange={e=>change(key,e.target.value)} aria-label={label+' colour'}/></label>)}</fieldset>
      {!!items.length&&<fieldset className="calendar-colour-fields"><legend>Items on the selected day</legend>{items.map(item=><label key={item.id}><span>{item.type}: {item.title}</span><input type="color" value={draft[item.id]||draft[category(item)]} disabled={busy} onChange={e=>change(item.id,e.target.value)} aria-label={'Colour for '+item.title}/></label>)}</fieldset>}
      <div className="management-actions"><button type="button" className="management-button secondary" disabled={busy} onClick={reset}>Reset colours</button><button type="button" className="management-button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="management-button" disabled={busy}>{busy?'Saving...':'Save colours'}</button></div>
    </form>
  </ManagementDialog>;
}
