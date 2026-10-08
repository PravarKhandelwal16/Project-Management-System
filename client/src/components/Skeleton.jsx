export default function Skeleton({label='Loading workspace',rows=5,calendar=false}) {
  return <div className="workspace-skeleton" role="status" aria-label={label} aria-busy="true"><span className="sr-only">{label}</span><div aria-hidden="true">
    <div className="skeleton-metrics">{Array.from({length:4},(_,i)=><div className="skeleton-card" key={i}><div className="skeleton-line short"/><div className="skeleton-line value"/></div>)}</div>
    {calendar?<div className="skeleton-calendar">{Array.from({length:35},(_,i)=><div className="skeleton-card" key={i}><div className="skeleton-line short"/><div className="skeleton-line"/></div>)}</div>:<div className="skeleton-panel">{Array.from({length:rows},(_,i)=><div className="skeleton-row" key={i}><div className="skeleton-avatar"/><div><div className="skeleton-line"/><div className="skeleton-line short"/></div><div className="skeleton-line pill"/></div>)}</div>}
  </div></div>;
}
