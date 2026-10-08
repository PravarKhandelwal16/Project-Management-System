const {test}=require('node:test'),assert=require('node:assert/strict');
const {request,pool,ids,createTask}=require('../helpers/fixtures');
test('project lifecycle, search, filters, sorting, invalid fields and scope',async()=>{
  const made=await request('project_manager','/projects','POST',{name:'Quality project',description:'Test brief',start_date:'2026-01-01',end_date:'2026-12-31'});assert.equal(made.status,201);const id=made.data.data.id;
  assert.equal((await request('project_manager','/projects/'+id)).data.data.name,'Quality project');
  assert.equal((await request('project_manager','/projects/'+id,'PUT',{status:'In Progress'})).data.data.status,'In Progress');
  assert.deepEqual((await request('project_manager','/projects?search=Quality&status=In%20Progress&sortBy=name&sortOrder=ASC')).data.data.map(p=>p.id),[id]);
  assert.equal((await request('member','/projects/'+id)).status,403);
  assert.equal((await request('project_manager','/projects/999999')).status,404);
  for(const invalid of [{status:'Broken'},{description:{}},{start_date:'2026-02-30'},{name:''},{end_date:'2020-01-01'}])assert.equal((await request('project_manager','/projects/'+id,'PUT',invalid)).status,400);
  assert.equal((await request('project_manager','/projects?sortBy=name%3BDELETE')).status,400);
  assert.equal((await request('project_manager','/projects?status=invalid')).status,400);
  assert.equal((await request('project_manager',"/projects?search='OR%201=1--")).data.data.length,0);
  assert.equal((await request('project_manager','/projects/'+id,'DELETE')).status,200);
  assert.equal((await request('project_manager','/projects/'+id)).status,404);
});
test('task lifecycle assignment/reassignment, status/priority, searching and unauthorized access',async()=>{
  const made=await request('project_manager','/tasks','POST',{project_id:1,name:'Quality task',description:'Review',assigned_to:ids.member,priority:'High',due_date:'2028-02-29'});assert.equal(made.status,201);const id=made.data.data.id;
  assert.equal((await request('project_manager','/tasks/'+id)).data.data.assigned_to,ids.member);
  assert.equal((await request('project_manager','/tasks/'+id,'PUT',{name:'Edited quality task'})).status,200);
  assert.equal((await request('project_manager','/tasks/'+id+'/assign','PATCH',{assigned_to:ids.team_lead})).data.data.assigned_to,ids.team_lead);
  assert.equal((await request('team_lead','/tasks/'+id+'/status','PATCH',{status:'In Progress'})).status,200);
  assert.equal((await request('project_manager','/tasks/'+id+'/priority','PATCH',{priority:'Low'})).data.data.priority,'Low');
  const filtered=await request('member','/tasks?search=quality&priority=Low&status=In%20Progress&sortBy=name&order=ASC');assert.equal(filtered.data.data[0].id,id);
  const restricted=await createTask(2,{name:'Restricted task'});assert.equal((await request('member','/tasks/'+restricted)).status,403);assert.equal((await request('project_manager','/tasks/'+restricted,'PUT',{name:'Forbidden'})).status,403);
  for(const invalid of [{priority:'Urgent'},{status:'Invalid'},{due_date:'2027-02-29'},{assigned_to:ids.admin},{assigned_to:false},{assigned_to:0},{description:5},{name:''}])assert.equal((await request('project_manager','/tasks/'+id,'PUT',invalid)).status,400);
  assert.equal((await request('project_manager','/tasks/'+id+'/assign','PATCH',{})).status,400);
  assert.equal((await request('project_manager','/tasks/'+id+'/status','PATCH',{status:'Completed'})).status,200);
  assert.equal((await request('project_manager','/tasks/'+id,'DELETE')).status,200);assert.equal((await request('project_manager','/tasks/'+id)).status,404);
});
test('all CRUD and assignment mutations leave credential-free audit entries',async()=>{
  const [rows]=await pool.query('SELECT action,details FROM audit_logs');const actions=new Set(rows.map(r=>r.action));
  for(const action of ['PROJECT_CREATED','PROJECT_UPDATED','PROJECT_DELETED','TASK_CREATED','TASK_UPDATED','TASK_ASSIGNED','TASK_REASSIGNED','TASK_STATUS_CHANGED','TASK_COMPLETED','TASK_DELETED'])assert.ok(actions.has(action),action);
  assert.equal(JSON.stringify(rows).includes('password_hash'),false);
});
