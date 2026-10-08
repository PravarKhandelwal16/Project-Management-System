require('../config/env');
const bcrypt=require('bcrypt'),{pool}=require('../config/db'),{validateRegisterInput}=require('../utils/validation'),{createAuditLog}=require('../models/auditModel');
async function bootstrap(){
  const data={email:process.env.SUPER_ADMIN_EMAIL,full_name:process.env.SUPER_ADMIN_NAME,password:process.env.SUPER_ADMIN_PASSWORD};
  const validation=validateRegisterInput(data);if(!validation.isValid)throw new Error('Supply valid SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME and SUPER_ADMIN_PASSWORD through environment variables');
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [existing]=await connection.query("SELECT id FROM users WHERE role='super_admin' FOR UPDATE");
    if(existing.length)throw new Error('A Super Admin already exists; bootstrap never elevates or overwrites accounts');
    const [insert]=await connection.execute("INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,'super_admin')",[data.full_name.trim(),data.email.trim().toLowerCase(),await bcrypt.hash(data.password,12)]);
    await createAuditLog({userId:insert.insertId,action:'SUPER_ADMIN_BOOTSTRAPPED',resourceType:'USER',resourceId:insert.insertId,actor:data,details:{email:data.email}},connection);
    await connection.commit();console.log('Super Admin created. Remove bootstrap credentials from the environment.');
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
if(require.main===module)bootstrap().catch(error=>{console.error(require('../utils/logger').errorCode(error));process.exitCode=1;}).finally(()=>pool.end());
module.exports={bootstrap};
