const {test}=require('node:test'),assert=require('node:assert/strict');
const {request,createUser,loginUser,tokenFor,getBase,pool,ids}=require('../helpers/fixtures');
const payload={full_name:'Registered Person',email:'registered@isolated.test',password:'Strong123!'};
test('registration validates payload, rejects duplicate email and never accepts role escalation',async()=>{
  assert.equal((await request(null,'/auth/register','POST',payload)).status,201);
  assert.equal((await request(null,'/auth/register','POST',payload)).status,409);
  for(const invalid of [{email:'invalid'},{password:'abcdefgh'},{full_name:''},{password:'A1'+'x'.repeat(71)},{role:'super_admin'}])assert.equal((await request(null,'/auth/register','POST',{...payload,email:'fresh@isolated.test',...invalid})).status,400);
  const [rows]=await pool.execute('SELECT password_hash,role FROM users WHERE email=?',[payload.email]);assert.notEqual(rows[0].password_hash,payload.password);assert.equal(rows[0].role,'member');
});
test('login, me and logout return safe users and reject wrong/unknown credentials',async()=>{
  const login=await loginUser(payload);assert.equal(login.status,200);assert.ok(login.data.token);assert.equal(login.data.user.password_hash,undefined);
  assert.equal((await loginUser({...payload,password:'Wrong123!'})).status,401);
  assert.equal((await loginUser({...payload,email:'unknown@isolated.test'})).status,401);
  const response=await fetch(getBase()+'/auth/me',{headers:{Authorization:'Bearer '+login.data.token}});const data=await response.json();assert.equal(response.status,200);assert.equal(data.user.email,payload.email);assert.equal(data.user.password_hash,undefined);
  assert.equal((await request('member','/auth/logout','POST')).status,200);
});
test('missing, invalid and expired tokens are rejected on protected endpoints',async()=>{
  assert.equal((await request(null,'/projects')).status,401);
  for(const token of ['invalid-token',tokenFor('member',{expiresIn:-1})])assert.equal((await fetch(getBase()+'/projects',{headers:{Authorization:'Bearer '+token}})).status,401);
  const inactive=await createUser('member');await pool.execute('UPDATE users SET is_active=0 WHERE id=?',[inactive.id]);assert.equal((await request(inactive.id,'/auth/me')).status,403);
  assert.equal((await request('member','/admin/users/'+ids.member+'/role','PATCH',{role:'admin'})).status,403);
  assert.equal((await request('project_manager','/admin/users/'+ids.project_manager+'/role','PATCH',{role:'super_admin'})).status,403);
});
test('registration and login produce audit history without credentials',async()=>{
  const [rows]=await pool.execute("SELECT * FROM audit_logs WHERE action IN ('USER_REGISTERED','USER_LOGIN','USER_LOGIN_FAILED')");
  assert.ok(rows.some(row=>row.action==='USER_REGISTERED'));assert.ok(rows.some(row=>row.action==='USER_LOGIN'));
  const text=JSON.stringify(rows);assert.equal(text.includes(payload.password),false);assert.equal(text.includes('password_hash'),false);assert.equal(/eyJ[a-zA-Z0-9_-]+\./.test(text),false);
});
test('security headers, CORS, invalid JSON/body limits and auth rate limiting',async()=>{
  const health=await request(null,'/health');assert.equal(health.headers.get('x-content-type-options'),'nosniff');assert.equal(health.headers.get('x-powered-by'),null);
  assert.equal((await fetch(getBase()+'/health',{headers:{Origin:'https://evil.example.test'}})).status,403);
  const allowed=await fetch(getBase()+'/health',{headers:{Origin:'http://localhost:5173'}});assert.equal(allowed.headers.get('access-control-allow-origin'),'http://localhost:5173');
  for(const [body,status] of [['{',400],['[]',400],[JSON.stringify({padding:'a'.repeat(70000)}),413]])assert.equal((await fetch(getBase()+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,status);
  let response;for(let i=0;i<52;i++)response=await request(null,'/auth/login','POST',{});assert.equal(response.status,429);
});
test('admin and personal API validation rejects unexpected fields and invalid filters',async()=>{
  for(const query of ['role=unknown','is_active=maybe','search='+('a'.repeat(256))])assert.equal((await request('super_admin','/admin/users?'+query)).status,400);
  assert.equal((await request('super_admin','/admin/users/'+ids.member+'/role','PATCH',{role:'member',is_active:false})).status,400);
  assert.equal((await request('member','/reminders','POST',{title:'Test',remind_at:'2030-01-01T00:00:00Z',task_id:true})).status,400);
  assert.equal((await request('member','/calendar/events','POST',{title:'Test',event_date:'2030-01-01',user_id:ids.super_admin})).status,400);
  assert.equal((await request('project_manager','/projects/1/members','POST',{user_id:true})).status,400);
});
