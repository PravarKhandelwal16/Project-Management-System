const cron = require('node-cron');
const { runReminders } = require('./taskReminderJob');
const { dispatchPersonalReminders } = require('./personalReminderJob');

const startScheduler = () => {
  cron.schedule('* * * * *', () => dispatchPersonalReminders().catch(error => console.error('Personal reminder delivery failed:', error.message)));
  dispatchPersonalReminders().catch(error => console.error('Personal reminder delivery failed:', error.message));
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
