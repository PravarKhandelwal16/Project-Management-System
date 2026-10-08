require('../config/env');
const { runReminders } = require('../jobs/taskReminderJob');

const main = async () => {
  try {
    console.log('Manually triggering task reminders...');
    const count = await runReminders();
    console.log(`Manual trigger complete. Processed: ${count}`);
    process.exit(0);
  } catch (err) {
    require('../utils/logger').error('manual_reminder_run_failed',{code:require('../utils/logger').errorCode(err)});
    process.exit(1);
  }
};

main();
