const { pool } = require('../config/db');
const { projectScope, hasPermission } = require('./accessService');
const { format, subDays } = require('date-fns');
function todayInZone(timeZone = 'Asia/Kolkata', date = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
  catch { const error = new Error('Invalid time zone.'); error.statusCode = 400; throw error; }
}
async function buildReport(user,{days=30,projectId='',timeZone='Asia/Kolkata'}={}) {
  const today = todayInZone(timeZone);
  const scope = projectScope(user);
  let clause = scope.sql; const params = [...scope.params];
  if (projectId) {
    const id = Number(projectId);
    if (!Number.isSafeInteger(id) || id < 1) { const error = new Error('Invalid project filter.'); error.statusCode = 400; throw error; }
    clause += ' AND p.id = ?'; params.push(id);
  }
  const canViewTasks = hasPermission(user,'tasks.view');
  const [projects] = await pool.query(`SELECT p.id,p.name,p.status,p.user_id,u.full_name AS owner_name,
    DATE_FORMAT(p.start_date,'%Y-%m-%d') AS start_date, DATE_FORMAT(p.end_date,'%Y-%m-%d') AS end_date,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) + 1 AS team_size
    FROM projects p JOIN users u ON u.id = p.user_id WHERE ${clause} ORDER BY p.updated_at DESC`,params);
  const taskClause = canViewTasks ? clause : '0=1';
  const taskParams = canViewTasks ? params : [];
  const [tasks] = await pool.query(`SELECT t.id,t.project_id,t.user_id AS assigned_to,t.name,t.status,t.priority,
    DATE_FORMAT(t.due_date,'%Y-%m-%d') AS due_date,p.name AS project_name,u.full_name AS assignee_name
    FROM tasks t JOIN projects p ON p.id = t.project_id LEFT JOIN users u ON u.id = t.user_id
    WHERE ${taskClause} ORDER BY t.due_date IS NULL,t.due_date,t.id DESC`,taskParams);
  const taskActivity = Array.from({length:days},(_,index)=>({date:format(subDays(new Date(today+'T12:00:00'),days-1-index),'yyyy-MM-dd'),created:0,completed:0}));
  // Read absolute event timestamps, then bucket them in the viewer's time zone.
  // A one-day buffer includes offsets and daylight saving boundaries without
  // requiring MySQL's optional named time-zone tables.
  const firstDate = taskActivity[0].date;
  const firstEpoch = Date.parse(firstDate+'T00:00:00Z')/1000 - 86400;
  const lastEpoch = Date.parse(today+'T00:00:00Z')/1000 + 172800;
  const [activity] = await pool.query(`SELECT a.resource_id,a.action,UNIX_TIMESTAMP(a.created_at) AS occurred_at
    FROM audit_logs a JOIN tasks t ON t.id = a.resource_id JOIN projects p ON p.id = t.project_id
    WHERE a.resource_type = 'TASK' AND a.action IN ('TASK_CREATED','TASK_COMPLETED')
      AND a.created_at >= FROM_UNIXTIME(?) AND a.created_at < FROM_UNIXTIME(?)
      AND ${taskClause}`, [firstEpoch,lastEpoch,...taskParams]);
  const buckets = new Map(taskActivity.map(day => [day.date,{created:new Set(),completed:new Set()}]));
  for (const row of activity) {
    const date = todayInZone(timeZone,new Date(Number(row.occurred_at)*1000));
    const bucket = buckets.get(date);
    if (bucket) bucket[row.action === 'TASK_CREATED' ? 'created' : 'completed'].add(row.resource_id);
  }
  for (const day of taskActivity) { day.created=buckets.get(day.date).created.size; day.completed=buckets.get(day.date).completed.size; }
  const tasksByProject = new Map();
  for (const task of tasks) { if (!tasksByProject.has(task.project_id)) tasksByProject.set(task.project_id,[]); tasksByProject.get(task.project_id).push(task); }
  const projectData = projects.map(project=>{
    const projectTasks=tasksByProject.get(project.id)||[];
    const completed=projectTasks.filter(task=>task.status==='Completed').length;
    return {...project,total_tasks:canViewTasks?projectTasks.length:null,completed_tasks:canViewTasks?completed:null,
      overdue_tasks:canViewTasks?projectTasks.filter(task=>task.status!=='Completed'&&task.due_date&&task.due_date<today).length:null,
      progress:canViewTasks?(projectTasks.length?Math.round(completed/projectTasks.length*100):0):null};
  });
  const statusValues = ['Pending','In Progress','Completed'];
  const taskStatus = statusValues.map(status=>({status,count:tasks.filter(task=>task.status===status).length}));
  const priorities = ['High','Medium','Low'].map(priority=>({priority,count:tasks.filter(task=>task.priority===priority).length}));
  const overdueTasks=tasks.filter(task=>task.status!=='Completed'&&task.due_date&&task.due_date<today);
  const dueToday=tasks.filter(task=>task.status!=='Completed'&&task.due_date===today);
  const upcomingTasks=tasks.filter(task=>task.status!=='Completed'&&task.due_date&&task.due_date>=today);
  const workload=Object.values(tasks.reduce((acc,task)=>{
    const key=task.assigned_to||'unassigned'; acc[key]??={id:task.assigned_to,name:task.assignee_name||'Unassigned',total:0,open:0,completed:0,overdue:0};
    acc[key].total++; if(task.status==='Completed') acc[key].completed++; else {acc[key].open++; if(task.due_date&&task.due_date<today) acc[key].overdue++;} return acc;
  },{})).sort((a,b)=>b.open-a.open);
  const completedTasks=taskStatus[2].count;
  return {today,days,projects:projectData,tasks,taskStatus,priorities,taskActivity,workload,
    summary:{totalProjects:projects.length,projectsInProgress:projects.filter(project=>project.status==='In Progress').length,
      completedProjects:projects.filter(project=>project.status==='Completed').length,totalTasks:tasks.length,completedTasks,
      pendingTasks:taskStatus[0].count,inProgressTasks:taskStatus[1].count,overdueTasks:overdueTasks.length,dueToday:dueToday.length,
      unassignedTasks:tasks.filter(task=>!task.assigned_to&&task.status!=='Completed').length,
      completionRate:tasks.length?Math.round(completedTasks/tasks.length*100):0},
    overdueTasks:overdueTasks.slice(0,8),upcomingTasks:upcomingTasks.slice(0,8),dueTodayTasks:dueToday.slice(0,8)};
}
module.exports = { buildReport, todayInZone };
