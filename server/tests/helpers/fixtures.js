const {before,after,mock}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),mysql=require('mysql2/promise'),bcrypt=require('bcrypt');
require('../../config/env');
const {assertTestDatabase}=require('./safety');
const prefix=process.env.DB_NAME_TEST||'project_management_test';
assertTestDatabase(process.env,prefix);
const database=prefix+'_'+process.pid+'_'+Date.now();
assertTestDatabase(process.env,database);
const originalDb=process.env.DB_NAME;
process.env.DB_NAME=database;
process.env.JWT_SECRET='isolated-tests-only-not-a-deployment-secret';
process.env.JWT_EXPIRES_IN='1h';
process.env.SCHEDULER_ENABLED='false';
process.env.PUSH_ENABLED='false';
process.env.EXPO_ACCESS_TOKEN='';
const {pool}=require('../../config/db');
const {migrate}=require('../../scripts/migrateAccess'),{migratePlanning}=require('../../scripts/migratePlanning'),{migrateRelease}=require('../../scripts/migrateRelease');
const access=require('../../services/accessService'),jwt=require('jsonwebtoken');
const ids={};let server,base,connection,created=false;
const email=require('../../services/emailService');
const emailMocks={};
const tokenFor=(role,options={})=>jwt.sign({id:typeof role==='number'?role:ids[role]},process.env.JWT_SECRET,{expiresIn:'1h',...options});
const request=async(role,route,method='GET',body)=>{
  const response=await fetch(base+route,{method,headers:{...(role?{Authorization:'Bearer '+tokenFor(role)}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json(),headers:response.headers};
};
const createUser=async(role='member',overrides={})=>{
  const data={full_name:'Test '+role,email:role+'-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'@isolated.test',password:'Testing123!',...overrides};
  const [result]=await pool.execute('INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,?)',[data.full_name,data.email,await bcrypt.hash(data.password,10),role]);
  return {...data,id:result.insertId,role};
};
const createProject=async(owner=ids.project_manager,name='Test project')=>{
  const [result]=await pool.execute('INSERT INTO projects (user_id,name) VALUES (?,?)',[owner,name]);return result.insertId;
};
const createTask=async(project=1,overrides={})=>{
  const task={name:'Test task',status:'Pending',priority:'Medium',assigned_to:null,due_date:null,...overrides};
  const [result]=await pool.execute('INSERT INTO tasks (project_id,created_by,user_id,name,status,priority,due_date) VALUES (?,?,?,?,?,?,?)',[project,ids.project_manager,task.assigned_to,task.name,task.status,task.priority,task.due_date]);return result.insertId;
};
const loginUser=user=>request(null,'/auth/login','POST',{email:user.email,password:user.password});
before(async()=>{
  assertTestDatabase({...process.env,DB_NAME:originalDb},database);
  connection=await mysql.createConnection({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',multipleStatements:true});
  await connection.query('CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');created=true;
  await connection.query('USE '+database);
  const schema=fs.readFileSync(path.resolve(__dirname,'../../../database/schema.sql'),'utf8').replace(/CREATE DATABASE IF NOT EXISTS project_management[\s\S]*?;/,'').replace('USE project_management;','');
  await connection.query(schema);
  await connection.query(fs.readFileSync(path.resolve(__dirname,'../../../database/migration_stage6.sql'),'utf8'));
  await migrate();await migratePlanning();await migrateRelease();await require('../../scripts/migratePush').migratePush();
  // Idempotence is checked on the same database before any fixtures are created.
  await migrate();await migratePlanning();await migrateRelease();await require('../../scripts/migratePush').migratePush();
  for(const role of access.catalog.roles)ids[role.key]=(await createUser(role.key,{full_name:role.label,email:role.key+'@isolated.test'})).id;
  assert.equal(await createProject(ids.project_manager,'Delivery'),1);assert.equal(await createProject(ids.admin,'Restricted'),2);
  for(const role of ['team_lead','project_coordinator','member','viewer'])await pool.execute('INSERT INTO project_members (project_id,user_id,added_by) VALUES (1,?,?)',[ids[role],ids.project_manager]);
  await createTask(1,{name:'Assigned work',assigned_to:ids.member,due_date:'2020-01-01'});
  for(const key of ['sendTaskAssignedEmail','sendTaskReminderEmail','sendTaskOverdueEmail'])emailMocks[key]=mock.method(email,key,async()=>({messageId:'isolated-test'}));
  server=require('../../app').listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port+'/api';
});
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  await pool.end();
  if(connection){
    assertTestDatabase({...process.env,DB_NAME:originalDb},database);
    if(created)await connection.query('DROP DATABASE '+database);
    await connection.end();
  }
});
module.exports={pool,ids,request,tokenFor,createUser,createProject,createTask,loginUser,emailMocks,getBase:()=>base,jwt,...access};
