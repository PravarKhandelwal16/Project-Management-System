const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pool,ids,request,tokenFor,getBase,jwt,catalog,resolveAccess,canManageAccount,validatePermissions}=require('../helpers/fixtures');
const {redact}=require('../../models/auditModel');

test('membership candidates, removal with open work and audit history', async () => {
  assert.equal((await request('member','/team/projects/1/candidates')).status,403);
  const candidates=await request('project_manager','/team/projects/1/candidates');
  assert.equal(candidates.status,200); assert.equal(candidates.data.data.some(user=>user.id===ids.member),false);
  assert.equal((await request('team_lead','/projects/1/members/' + ids.member,'DELETE')).status,409);
  assert.equal((await request('member','/tasks/1/status','PATCH',{status:'Completed'})).status,200);
  assert.equal((await request('team_lead','/projects/1/members/' + ids.member,'DELETE')).status,200);
  assert.equal((await request('member','/projects/1')).status,403);
  const audit=await request('admin','/admin/audit-logs?action=PROJECT_MEMBER_REMOVED');
  assert.equal(audit.data.total,1);
  assert.equal((await request('project_manager','/projects/1/members','POST',{user_id:ids.member})).status,201);
});

