const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pool,ids,request,tokenFor,getBase,jwt,catalog,resolveAccess,canManageAccount,validatePermissions}=require('../helpers/fixtures');
const {redact}=require('../../models/auditModel');

test('user lifecycle, duplicate email, security and audit snapshots', async () => {
  await request('member','/admin/users');
  await request('admin','/admin/users/'+ids.super_admin+'/role','PATCH',{role:'member'});
  const created = await request('admin','/admin/users','POST',{full_name:'New Person',email:'new@isolated.test',password:'Temporary123!',role:'project_coordinator',department:'Operations',job_title:'Delivery Coordinator'});
  assert.equal(created.status,201); assert.equal(created.data.data.password_hash,undefined);
  const userId=created.data.data.id;
  assert.equal((await request('admin','/admin/users','POST',{full_name:'Duplicate',email:'new@isolated.test',password:'Temporary123!'})).status,409);
  assert.equal((await request('admin','/admin/users/' + ids.super_admin + '/role','PATCH',{role:'member'})).status,403);
  assert.equal((await request('admin','/admin/users/' + ids.admin + '/status','PATCH',{is_active:false})).status,403);
  assert.equal((await request('admin','/admin/users/' + userId,'PUT',{full_name:'Updated Person',email:'new@isolated.test',department:'Delivery',job_title:'Coordinator'})).status,200);
  assert.equal((await request('admin','/admin/users/' + userId + '/status','PATCH',{is_active:false})).status,200);
  const token = tokenFor(userId);
  const response=await fetch(getBase()+'/auth/me',{headers:{Authorization:'Bearer '+token}}); assert.equal(response.status,403);
  const audit=await request('admin','/admin/audit-logs?search=Updated%20Person&limit=1');
  assert.equal(audit.status,200); assert.equal(audit.data.data.length,1);
  assert.equal(audit.data.data[0].user_email,'admin@isolated.test');
  assert.ok(audit.data.data[0].request_id); assert.equal(audit.data.data[0].details.before.full_name,'New Person');
  assert.equal((await request('admin','/admin/audit-logs?from=invalid')).status,400);
  assert.equal((await request('admin','/admin/audit-logs?from=2026-02-30')).status,400);
  assert.equal((await request('admin','/admin/audit-logs?page=Infinity')).status,400);
  assert.equal((await request('admin','/admin/users?page=1.5')).status,400);
  const denied = await request('admin','/admin/audit-logs?action=ACCESS_DENIED');
  assert.ok(denied.data.total > 0);
  assert.equal((await request('admin','/admin/audit-logs?from=2026-01-01&to=2026-12-31')).status,200);
  assert.equal((await request('admin','/admin/users?search=Delivery')).data.total,1);
});
test('administrative updates roll back if their audit entry cannot be written', async () => {
  await pool.query("CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'USER_PROFILE_UPDATED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Intentional test audit failure'; END IF; END");
  try {
    const result = await request('admin','/admin/users/' + ids.viewer,'PUT',{full_name:'Should roll back',email:'viewer@isolated.test'});
    assert.equal(result.status,500);
    const [rows] = await pool.execute('SELECT full_name FROM users WHERE id = ?', [ids.viewer]);
    assert.equal(rows[0].full_name,'Read-only Observer');
  } finally { await pool.query('DROP TRIGGER reject_profile_audit'); }
});
test('concurrent super-admin deactivations preserve an active platform owner', async () => {
  const [insert] = await pool.execute("INSERT INTO users (full_name,email,password_hash,role) VALUES ('Second Owner','second-owner@isolated.test','not-used','super_admin')");
  ids.second_owner = insert.insertId;
  const results = await Promise.all([
    request('super_admin','/admin/users/' + ids.second_owner + '/status','PATCH',{is_active:false}),
    request('second_owner','/admin/users/' + ids.super_admin + '/status','PATCH',{is_active:false})
  ]);
  assert.equal(results.filter(item=>item.status===200).length,1);
  assert.ok(results.some(item=>[403,409].includes(item.status)));
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1");
  assert.equal(rows[0].count,1);
});

