const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pool,ids,request,tokenFor,getBase,jwt,catalog,resolveAccess,canManageAccount,validatePermissions}=require('../helpers/fixtures');
const {redact}=require('../../models/auditModel');

test('planning reports respect project scope, reporting access and hidden task totals', async () => {
  const report = await request('project_manager','/analytics?days=30&tz=Asia%2FKolkata');
  assert.equal(report.status,200); assert.equal(report.data.data.projects.length,1);
  assert.equal(report.data.data.taskActivity.length,30);
  assert.equal(report.data.data.summary.totalTasks,1);
  assert.equal(report.data.data.workload.reduce((sum,row)=>sum+row.total,0),1);
  assert.equal((await request('project_manager','/analytics?project_id=2')).status,403);
  assert.equal((await request('member','/analytics')).status,403);
  assert.equal((await request('admin','/analytics?days=10')).status,400);
  assert.equal((await request('admin','/analytics?tz=Invalid%2FZone')).status,400);
  assert.equal((await request('admin','/admin/users/'+ids.viewer+'/permissions','PUT',{overrides:{'tasks.view':false}})).status,200);
  const hidden=await request('viewer','/dashboard');
  assert.equal(hidden.status,200);assert.equal(hidden.data.data.summary.totalTasks,0);
  assert.equal(hidden.data.data.projects[0].progress,null);
  assert.equal((await request('viewer','/projects')).data.data[0].total_tasks,null);
  assert.equal((await request('viewer','/analytics')).status,403);
  assert.equal((await request('admin','/admin/users/'+ids.viewer+'/permissions','PUT',{overrides:null})).status,200);
});
test('activity trends use the viewer time zone and deduplicate completion events', async () => {
  const {todayInZone}=require('../../services/reportService');
  const zone='Asia/Kolkata',today=todayInZone(zone);
  const instant=Date.parse(today+'T00:00:00Z')-5*3600000;
  const indiaDay=todayInZone(zone,new Date(instant));
  const americaDay=todayInZone('America/Los_Angeles',new Date(instant));
  const beforeIndia=(await request('project_manager','/analytics?days=7&tz=Asia%2FKolkata')).data.data;
  const beforeAmerica=(await request('project_manager','/analytics?days=7&tz=America%2FLos_Angeles')).data.data;
  const [task]=await pool.execute("INSERT INTO tasks (project_id,created_by,name) VALUES (1,?,'Boundary task')",[ids.project_manager]);
  for(let offset=0;offset<2;offset++) await pool.execute("INSERT INTO audit_logs (user_id,action,resource_type,resource_id,created_at) VALUES (?,'TASK_COMPLETED','TASK',?,FROM_UNIXTIME(?))",[ids.project_manager,task.insertId,instant/1000+offset]);
  const afterIndia=(await request('project_manager','/analytics?days=7&tz=Asia%2FKolkata')).data.data;
  const afterAmerica=(await request('project_manager','/analytics?days=7&tz=America%2FLos_Angeles')).data.data;
  assert.equal(afterIndia.taskActivity.find(day=>day.date===indiaDay).completed,beforeIndia.taskActivity.find(day=>day.date===indiaDay).completed+1);
  assert.equal(afterAmerica.taskActivity.find(day=>day.date===americaDay).completed,beforeAmerica.taskActivity.find(day=>day.date===americaDay).completed+1);
});
