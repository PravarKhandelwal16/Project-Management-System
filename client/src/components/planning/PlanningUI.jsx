import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';
import { isOverdue, prettyDate } from '../../utils/planning';
import '../../pages/Management.css';
import '../../pages/Planning.css';
export function PageHeader({eyebrow='WORKSPACE',title,description,children}) {
  return <header className="planning-heading"><div><div className="planning-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="planning-header-actions">{children}</div></header>;
}
export function Metrics({items}) {
  return <div className="planning-metrics">{items.map(item=><div key={item.label} className={'planning-metric '+(item.tone||'')}><span>{item.label}</span><strong>{item.value??'—'}</strong>{item.note&&<small>{item.note}</small>}</div>)}</div>;
}
export function LoadState({loading,error,onRetry,empty,children,calendar=false}) {
  if(loading) return <Skeleton calendar={calendar}/>;
  if(error) return <div className="planning-state" role="alert"><h2>Could not load this view</h2><p>{error}</p><button className="management-button secondary" onClick={onRetry}>Try again</button></div>;
  if(empty) return <div className="planning-state"><h2>Nothing here yet</h2><p>Try changing your filters, or create your first item.</p></div>;
  return children;
}
export function Progress({value}) {
  return value==null?<small>Task progress restricted</small>:<div className="planning-progress"><div><span>Task completion</span><strong>{value}%</strong></div><progress max="100" value={value} aria-label="Task completion"/></div>;
}
export function Badge({value}) {
  return <span className={'planning-badge '+(value==='Completed'?'success':value==='High'||value==='Overdue'?'danger':value==='In Progress'||value==='Medium'?'amber':'')}>{value}</span>;
}
export function TaskLink({task,children}) {
  return <div className="planning-task-row"><div><Link className="planning-item-title" to={'/tasks/'+task.id}>{task.name}</Link><small>{task.project_name} · {prettyDate(task.due_date)}</small></div><div className="planning-inline">{isOverdue(task)?<Badge value="Overdue"/>:<Badge value={task.status}/>} {children}</div></div>;
}
