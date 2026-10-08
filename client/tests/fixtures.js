import catalog from '../../shared/access.json' with {type:'json'};
export const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
export const user={id:1,full_name:'Demo Administrator',email:'admin@example.invalid',role:'super_admin',permissions:catalog.permissions.map(p=>p.key),is_active:1};
export const project={id:1,user_id:1,name:'Release project',description:'Submission verification',status:'In Progress',start_date:day,end_date:day,owner_name:user.full_name,owner_email:user.email,member_count:1,total_tasks:1,completed_tasks:0,overdue_tasks:0,progress:0};
export const task={id:1,project_id:1,name:'Review checklist',description:'Check release quality',priority:'High',status:'Pending',due_date:day,assigned_to:1,project_name:project.name,project_owner_id:1,assignee_name:user.full_name,creator_name:user.full_name};
export const preferences={email_task_assigned:1,email_due_tomorrow:1,email_overdue:1,web_task_assigned:1,web_due_tomorrow:1,web_overdue:1,browser_task_assigned:0,browser_due_tomorrow:0};
export async function mockApi(page){
  await page.addInitScript(()=>localStorage.setItem('pms_token','ui-tests-only-token'));
  const summary={totalProjects:1,projectsInProgress:1,totalTasks:1,completedTasks:0,pendingTasks:1,inProgressTasks:0,overdueTasks:0,dueToday:1,unassignedTasks:0,completionRate:0};
  const report={today:day,summary,projects:[{...project,total:1,completed:0,overdue:0,open:1,health:'On track'}],tasks:[task],taskStatus:[{status:'Pending',count:1},{status:'In Progress',count:0},{status:'Completed',count:0}],priorities:[{priority:'High',count:1}],taskActivity:[{date:day,created:1,completed:0}],workload:[{id:1,name:user.full_name,total:1,open:1,completed:0,overdue:0}],overdueTasks:[],upcomingTasks:[task],dueTodayTasks:[task],reminders:[]};
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace(/^\/api/,'');
    let body={success:true,data:[]};
    if(path==='/auth/me')body={success:true,user};
    else if(path==='/dashboard'||path==='/analytics')body.data=report;
    else if(path==='/projects')body.data=[project];
    else if(path==='/projects/1')body.data={...project,members:[{id:1,user_id:1,full_name:user.full_name,email:user.email,role:'member',joined_at:new Date().toISOString()}]};
    else if(path==='/tasks'||path==='/projects/1/tasks')body.data=[task];
    else if(path==='/tasks/1')body.data=task;
    else if(path==='/projects/1/members')body.data=[{user_id:1,full_name:user.full_name,email:user.email,is_active:1}];
    else if(path==='/team/projects/1')body={success:true,can_manage:true,data:[{user_id:1,full_name:user.full_name,email:user.email,role:'member',open_tasks:1,assigned_tasks:1,overdue_tasks:0,is_owner:1,is_active:1}]};
    else if(path==='/admin/users')body={success:true,data:[user],total:1};
    else if(path==='/admin/stats')body.data={users:{total_users:1,active_users:1,inactive_users:0},roles:[]};
    else if(path==='/admin/roles')body.data=catalog.roles.map(role=>({...role,version:1}));
    else if(path==='/admin/audit-logs')body={success:true,data:[],total:0,actions:[]};
    else if(path==='/notifications/preferences')body.data=preferences;
    else if(path==='/notifications/unread-count')body.data={count:0};
    else if(path==='/calendar/colours')body.data={};
    await route.fulfill({status:200,json:body});
  });
}
