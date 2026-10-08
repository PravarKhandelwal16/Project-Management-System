const {pool}=require('../config/db');
async function migrateRelease(){
  const connection=await pool.getConnection();
  try{
    const [columns]=await connection.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_logs' AND COLUMN_NAME='delivery_key'");
    if(!columns.length)await connection.query('ALTER TABLE notification_logs ADD COLUMN delivery_key VARCHAR(190) NULL');
    // Existing delivery history retains its original rows; null keys never collide.
    const addIndex=async(table,name,definition)=>{
      const [rows]=await connection.query('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',[table,name]);
      if(!rows.length)await connection.query('ALTER TABLE '+table+' ADD '+definition);
    };
    await addIndex('notification_logs','uq_notification_delivery','UNIQUE INDEX uq_notification_delivery (delivery_key)');
    await addIndex('notifications','idx_notifications_owner_read','INDEX idx_notifications_owner_read (user_id,is_read,created_at,id)');
    await addIndex('notifications','idx_notifications_owner_date','INDEX idx_notifications_owner_date (user_id,created_at,id)');
    await addIndex('tasks','idx_tasks_project_status','INDEX idx_tasks_project_status (project_id,status,due_date)');
    console.log('Release migration completed (safe to rerun).');
  }finally{connection.release();}
}
if(require.main===module)migrateRelease().catch(error=>{console.error(require('../utils/logger').errorCode(error));process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrateRelease};
