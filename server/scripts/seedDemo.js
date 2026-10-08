require('../config/env');
const crypto=require('node:crypto'),bcrypt=require('bcrypt'),{pool}=require('../config/db');
const catalog=require('../../shared/access.json'),{validatePassword}=require('../utils/validation');
async function seedDemo(){
  if(process.env.NODE_ENV!=='development'||process.env.ALLOW_DEMO_SEED!=='true'||!/_demo$/.test(process.env.DB_NAME||''))throw new Error('Demo seed requires NODE_ENV=development, ALLOW_DEMO_SEED=true and DB_NAME ending in _demo');
  const password=process.env.DEMO_PASSWORD||crypto.randomBytes(18).toString('base64url')+'A1!';
  if(!validatePassword(password).isValid)throw new Error('Invalid demo password');
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const accounts={};
    for(const role of catalog.roles){
      const email=role.key+'@pms.demo.invalid';
      const [exists]=await connection.execute('SELECT id FROM users WHERE email=?',[email]);
      if(exists.length)throw new Error('Demo accounts already exist; seed refuses to overwrite accounts');
      const [insert]=await connection.execute('INSERT INTO users (full_name,email,password_hash,role,department,job_title) VALUES (?,?,?,?,?,?)',[role.label,email,await bcrypt.hash(password,12),role.key,'Demo workspace',role.label]);accounts[role.key]=insert.insertId;
    }
    const [project]=await connection.execute("INSERT INTO projects (user_id,name,description,status) VALUES (?,'Demo delivery','Development/demo-only data','In Progress')",[accounts.project_manager]);
    for(const role of ['member','team_lead','project_coordinator','viewer'])await connection.execute('INSERT INTO project_members (project_id,user_id,added_by) VALUES (?,?,?)',[project.insertId,accounts[role],accounts.project_manager]);
    await connection.execute("INSERT INTO tasks (project_id,user_id,created_by,name,status,priority,due_date) VALUES (?,?,?,'Review release checklist','Pending','High',CURDATE()+INTERVAL 1 DAY)",[project.insertId,accounts.member,accounts.project_manager]);
    await connection.commit();
    console.log('DEVELOPMENT/DEMO ONLY. All accounts share this generated password: '+password);
    console.table(catalog.roles.map(role=>({role:role.key,email:role.key+'@pms.demo.invalid'})));
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
if(require.main===module)seedDemo().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
module.exports={seedDemo};
