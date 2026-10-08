const fs=require('node:fs'),path=require('node:path');
const {pool}=require('../config/db');
async function migratePush(){
  const connection=await pool.getConnection();
  try{
    const [columns]=await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_preferences' AND COLUMN_NAME='push_due_tomorrow'");
    if(!columns.length)await connection.query('ALTER TABLE notification_preferences ADD COLUMN push_due_tomorrow BOOLEAN NOT NULL DEFAULT FALSE');
    for(const sql of fs.readFileSync(path.resolve(__dirname,'../../database/migration_mobile_push.sql'),'utf8').split(';').map(s=>s.trim()).filter(Boolean))await connection.query(sql);
  }finally{connection.release();}
}
if(require.main===module)migratePush().catch(error=>{console.error(require('../utils/logger').errorCode(error));process.exitCode=1;}).finally(()=>pool.end());
module.exports={migratePush};
