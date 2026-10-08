const {pool}=require('../config/db');
const service=require('../services/notificationService'),email=require('../services/emailService'),logger=require('../utils/logger');
const {resolveAccess,hasPermission,projectInScope}=require('../services/accessService');
const {todayInZone,shiftDay,reminderType,dailyNotificationKey}=require('../utils/notificationDates');
async function runReminders(){
  const today=todayInZone(process.env.APP_TIMEZONE||'Asia/Kolkata');
  const [tasks]=await pool.execute(`SELECT t.*,DATE_FORMAT(t.due_date,'%Y-%m-%d') AS due_date,p.name AS project_name,p.user_id AS project_owner_id,u.full_name,u.email,u.role,u.permission_overrides
    FROM tasks t JOIN projects p ON t.project_id=p.id JOIN users u ON t.user_id=u.id
    WHERE t.status!='Completed' AND t.due_date<=? AND u.is_active=1`,[shiftDay(today,1)]);
  let processed=0;
  for(const task of tasks){
    const type=reminderType(task,today);if(!type)continue;
    const user=await resolveAccess({id:task.user_id,role:task.role,permission_overrides:task.permission_overrides,email:task.email,full_name:task.full_name});
    if(!hasPermission(user,'tasks.view')||!hasPermission(user,'projects.view')||!await projectInScope(user,{id:task.project_id,user_id:task.project_owner_id}))continue;
    const prefs=await service.ensurePreferences(user.id);
    const due=type==='TASK_DUE_TOMORROW',project={id:task.project_id,name:task.project_name};
    for(const channel of ['WEB','EMAIL']){
      if(!prefs[(channel==='WEB'?'web_':'email_')+(due?'due_tomorrow':'overdue')])continue;
      const key=dailyNotificationKey(today,user.id,task.id,type,channel);
      const connection=await pool.getConnection();
      let claim;
      try{
        await connection.beginTransaction();
        try{
          const [result]=await connection.execute("INSERT INTO notification_logs (user_id,task_id,notification_type,channel,status,delivery_key) VALUES (?,?,?,?, 'PROCESSING',?)",[user.id,task.id,type,channel,key]);
          claim=result.insertId;
        }catch(error){if(error.code==='ER_DUP_ENTRY'){await connection.rollback();continue;}throw error;}
        if(channel==='WEB'){
          await connection.execute('INSERT INTO notifications (user_id,type,title,message,resource_type,resource_id) VALUES (?,?,?,?,?,?)',[user.id,type,due?'Task Due Tomorrow':'Task Overdue',`Your task "${task.name}" in project "${project.name}" is ${due?'due tomorrow':'overdue'}.`,'TASK',task.id]);
          await connection.execute("UPDATE notification_logs SET status='SENT' WHERE id=?",[claim]);
        }
        await connection.commit();
      }catch(error){await connection.rollback();throw error;}finally{connection.release();}
      if(channel==='EMAIL'){
        try{
          const result=await (due?email.sendTaskReminderEmail:email.sendTaskOverdueEmail)(user,task,project);
          await pool.execute('UPDATE notification_logs SET status=? WHERE id=?',[result.skipped?'SKIPPED':'SENT',claim]);
        }catch(error){
          await pool.execute("UPDATE notification_logs SET status='FAILED',error_message=? WHERE id=?",[logger.errorCode(error),claim]);
          logger.error('reminder_email_failed',{code:logger.errorCode(error),task_id:task.id});
        }
      }
      processed++;
    }
  }
  logger.info('task_reminders_completed',{processed});return processed;
}
module.exports={runReminders};
