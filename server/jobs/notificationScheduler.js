const cron=require('node-cron'),logger=require('../utils/logger');
const {runReminders}=require('./taskReminderJob');
const {dispatchPersonalReminders}=require('./personalReminderJob');
function startScheduler(){
  const safely=job=>job().catch(error=>logger.error('scheduled_job_failed',{code:logger.errorCode(error)}));
  const jobs=[
    cron.schedule('* * * * *',()=>safely(dispatchPersonalReminders),{timezone:process.env.APP_TIMEZONE||'Asia/Kolkata',noOverlap:true}),
    cron.schedule(process.env.REMINDER_CRON||'0 8 * * *',()=>safely(runReminders),{timezone:process.env.APP_TIMEZONE||'Asia/Kolkata',noOverlap:true})
  ];
  safely(dispatchPersonalReminders);
  logger.info('scheduler_started');
  return jobs;
}
module.exports={startScheduler};
