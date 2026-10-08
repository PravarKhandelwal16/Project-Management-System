const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pool,ids,request,tokenFor,getBase,jwt,catalog,resolveAccess,canManageAccount,validatePermissions}=require('../helpers/fixtures');
const {redact}=require('../../models/auditModel');

test('role responsibilities and administrator boundaries', async () => {
  const admin = await resolveAccess({ id: ids.admin, role: 'admin' });
  assert.equal(canManageAccount(admin,{ id: ids.super_admin, role:'super_admin' }),false);
  assert.equal(canManageAccount(admin,{ id: ids.admin, role:'admin' }),false);
  assert.equal(canManageAccount(admin,{ id: ids.member, role:'member' }),true);
  assert.match(validatePermissions(admin,'member',['users.roles']),/reserved/);
  assert.match(validatePermissions(admin,'admin',[]),/Super Admin/);
  assert.deepEqual(redact({ password:'secret', before:{token:'secret', role:'member'} }),{password:'[REDACTED]',before:{token:'[REDACTED]',role:'member'}});
});
test('lists, direct access, dashboard and search share project scope', async () => {
  for (const role of ['member','viewer','team_lead','project_coordinator','project_manager']) {
    const projects = await request(role,'/projects'); assert.equal(projects.status,200); assert.deepEqual(projects.data.data.map(project=>project.id),[1]);
    assert.equal((await request(role,'/projects/2')).status,403);
    assert.equal((await request(role,'/team/projects/1')).status,200);
    assert.equal((await request(role,'/team/projects/2')).status,403);
    assert.equal((await request(role,'/dashboard')).status,200);
    assert.equal((await request(role,'/search?q=Restricted')).data.data.projects.length,0);
  }
  assert.equal((await request('portfolio_manager','/projects')).data.data.length,2);
  assert.equal((await request('viewer','/projects/1','PUT',{name:'Unauthorized'})).status,403);
  assert.equal((await request('member','/admin/users')).status,403);
});
test('task creation, assignment and individual revocation take effect immediately', async () => {
  assert.equal((await request('member','/tasks','POST',{project_id:1,name:'No'})).status,403);
  assert.equal((await request('team_lead','/tasks','POST',{project_id:2,name:'Out of scope'})).status,403);
  const task = await request('team_lead','/tasks','POST',{project_id:1,name:'Leader task'});
  assert.equal(task.status,201);
  const assigned = await request('project_manager','/tasks','POST',{project_id:1,name:'Assigned on creation',assigned_to:ids.team_lead});
  assert.equal(assigned.status,201);
  assert.equal(assigned.data.data.assigned_to,ids.team_lead);
  assert.equal((await request('member','/tasks/' + task.data.data.id + '/status','PATCH',{status:'Completed'})).status,403);
  assert.equal((await request('member','/tasks/1/status','PATCH',{status:'In Progress'})).status,200);
  assert.equal((await request('admin','/users')).status,404);
  const revoke = await request('admin','/admin/users/' + ids.member + '/permissions','PUT',{overrides:{'tasks.status_assigned':false}});
  assert.equal(revoke.status,200);
  assert.equal((await request('member','/tasks/1/status','PATCH',{status:'Completed'})).status,403);
  assert.equal((await request('admin','/admin/users/' + ids.member + '/permissions','PUT',{overrides:{'users.roles':true}})).status,403);
  assert.equal((await request('admin','/admin/users/' + ids.member + '/permissions','PUT',{overrides:null})).status,200);
});
test('role policy versioning, protected policies and live enforcement', async () => {
  const policies = await request('admin','/admin/roles');
  const role = policies.data.data.find(item=>item.key==='team_lead');
  const changed = role.permissions.filter(key=>key!=='tasks.create');
  assert.equal((await request('admin','/admin/roles/team_lead','PUT',{permissions:changed,version:role.version})).status,200);
  assert.equal((await request('team_lead','/tasks','POST',{project_id:1,name:'Revoked'})).status,403);
  assert.equal((await request('admin','/admin/roles/team_lead','PUT',{permissions:changed,version:role.version})).status,409);
  assert.equal((await request('admin','/admin/roles/admin','PUT',{permissions:[],version:1})).status,403);
  assert.equal((await request('super_admin','/admin/roles/super_admin','PUT',{permissions:[],version:1})).status,403);
});
