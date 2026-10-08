import { format, parseISO } from 'date-fns';
export const taskStatuses=['Pending','In Progress','Completed'];
export const projectStatuses=['Not Started','In Progress','Completed'];
export const priorities=['Low','Medium','High'];
export const dateKey=date=>format(date,'yyyy-MM-dd');
export const todayKey=()=>dateKey(new Date());
export const prettyDate=value=>value?format(parseISO(value),'MMM d, yyyy'):'No date';
export const prettyTime=value=>value?format(parseISO(value),'MMM d, yyyy · h:mm a'):'No time';
export const isOverdue=(task,today=todayKey())=>task.status!=='Completed'&&!!task.due_date&&task.due_date<today;
export const canChangeStatus=(user,hasPermission,task)=>hasPermission('tasks.status')||(hasPermission('tasks.status_assigned')&&Number(task.assigned_to)===Number(user?.id));
export const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
export const csvCell=value=>'"'+(/^[=+@\-\t\r]/.test(String(value??''))?"'":'')+String(value??'').replaceAll('"','""')+'"';
export function downloadCsv(name,rows) {
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);
}
