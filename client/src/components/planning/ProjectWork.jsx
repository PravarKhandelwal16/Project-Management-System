import { useState } from 'react';
import { Link } from 'react-router-dom';
import useRemote from '../../hooks/useRemote';
import { useAuth } from '../../context/AuthContext';
import { LoadState, TaskLink } from './PlanningUI';
import TaskDialog from './TaskDialog';
export default function ProjectWork({project}) {
  const {hasPermission}=useAuth();
  const remote=useRemote(hasPermission('tasks.view')?'/projects/'+project.id+'/tasks':null);
  const [creating,setCreating]=useState(false);
  if(!hasPermission('tasks.view'))return null;
  return <section className="planning-panel" style={{marginBottom:24}}><div className="planning-panel-header"><div><h2>Project tasks</h2><p className="planning-muted">{remote.data?.length||0} tasks · {remote.data?.filter(task=>task.status==='Completed').length||0} completed</p></div><div className="planning-inline"><Link className="planning-text-link" to={'/tasks?project_id='+project.id}>View all tasks</Link>{hasPermission('tasks.create')&&<button className="management-button" onClick={()=>setCreating(true)}>New task</button>}</div></div>
    <LoadState loading={remote.loading} error={remote.error} onRetry={remote.reload}>{remote.data?.length?remote.data.slice(0,5).map(task=><TaskLink key={task.id} task={task}/>):<p className="planning-muted">Break this project into its first actionable task.</p>}</LoadState>
    {creating&&<TaskDialog projects={[project]} projectId={project.id} onClose={()=>setCreating(false)} onSaved={()=>{setCreating(false);remote.reload();}}/>}
  </section>;
}
