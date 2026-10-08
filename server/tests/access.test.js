const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const database = 'pms_access_test_' + process.pid + '_' + Date.now();
process.env.DB_NAME = database;
process.env.JWT_SECRET = 'isolated-test-secret';
const { pool } = require('../config/db');
const { migrate } = require('../scripts/migrateAccess');
const { catalog, resolveAccess, canManageAccount, validatePermissions } = require('../services/accessService');
const { redact } = require('../models/auditModel');
const jwt = require('jsonwebtoken');
let server, base, connection;
const ids = {};
const request = async (role, route, method = 'GET', body) => {
  const token = jwt.sign({ id: ids[role] }, process.env.JWT_SECRET);
  const response = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); return { status: response.status, data };
};
before(async () => {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true });
  await connection.query('CREATE DATABASE ' + database);
  await connection.query('USE ' + database);
  const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8').replace(/CREATE DATABASE IF NOT EXISTS project_management[\s\S]*?;/, '').replace('USE project_management;', '');
  await connection.query(schema);
  await connection.query('ALTER TABLE tasks MODIFY user_id INT NULL');
  await connection.query(fs.readFileSync(path.join(__dirname, '../../database/migration_stage6.sql'), 'utf8'));
  await migrate(); await migrate();
  for (const role of catalog.roles) {
    const [result] = await pool.execute('INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,?)', [role.label, role.key + '@isolated.test', 'not-used', role.key]);
    ids[role.key] = result.insertId;
  }
  await pool.execute('INSERT INTO projects (user_id,name) VALUES (?,?)', [ids.project_manager, 'Delivery']);
  await pool.execute('INSERT INTO projects (user_id,name) VALUES (?,?)', [ids.admin, 'Restricted']);
  for (const role of ['team_lead','project_coordinator','member','viewer']) await pool.execute('INSERT INTO project_members (project_id,user_id,added_by) VALUES (1,?,?)', [ids[role], ids.project_manager]);
  await pool.execute("INSERT INTO tasks (project_id,user_id,created_by,name,due_date) VALUES (1,?,?, 'Assigned work', CURDATE() - INTERVAL 1 DAY)", [ids.member,ids.project_manager]);
  mock.method(require('../services/emailService'), 'sendTaskAssignedEmail', async () => ({ messageId: 'isolated-test' }));
  const app = require('../app');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
  if (connection) {
    if (!/^pms_access_test_\d+_\d+$/.test(database)) throw new Error('Unsafe test database name');
    await connection.query('DROP DATABASE IF EXISTS ' + database);
    await connection.end();
  }
});
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
test('user lifecycle, duplicate email, security and audit snapshots', async () => {
  const created = await request('admin','/admin/users','POST',{full_name:'New Person',email:'new@isolated.test',password:'Temporary123!',role:'project_coordinator',department:'Operations',job_title:'Delivery Coordinator'});
  assert.equal(created.status,201); assert.equal(created.data.data.password_hash,undefined);
  const userId=created.data.data.id;
  assert.equal((await request('admin','/admin/users','POST',{full_name:'Duplicate',email:'new@isolated.test',password:'Temporary123!'})).status,409);
  assert.equal((await request('admin','/admin/users/' + ids.super_admin + '/role','PATCH',{role:'member'})).status,403);
  assert.equal((await request('admin','/admin/users/' + ids.admin + '/status','PATCH',{is_active:false})).status,403);
  assert.equal((await request('admin','/admin/users/' + userId,'PUT',{full_name:'Updated Person',email:'new@isolated.test',department:'Delivery',job_title:'Coordinator'})).status,200);
  assert.equal((await request('admin','/admin/users/' + userId + '/status','PATCH',{is_active:false})).status,200);
  const token = jwt.sign({ id:userId },process.env.JWT_SECRET);
  const response=await fetch(base+'/auth/me',{headers:{Authorization:'Bearer '+token}}); assert.equal(response.status,403);
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
