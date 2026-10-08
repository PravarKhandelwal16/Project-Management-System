const cron = require('node-cron');
const { runReminders } = require('./taskReminderJob');

const startScheduler = () => {
  // Default to running at 08:00 AM every day
  const cronExpression = process.env.REMINDER_CRON || '0 8 * * *';
  
  console.log(`Starting notification scheduler with cron: ${cronExpression}`);
  
  cron.schedule(cronExpression, async () => {
    console.log('Triggering scheduled reminder job...');
    await runReminders();
  });
};

module.exports = {
  startScheduler
};
