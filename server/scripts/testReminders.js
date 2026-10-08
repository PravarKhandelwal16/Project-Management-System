require('dotenv').config();
const { runReminders } = require('../jobs/taskReminderJob');
const mysql = require('mysql2/promise');

const main = async () => {
  try {
    console.log('Manually triggering task reminders...');
    const count = await runReminders();
    console.log(`Manual trigger complete. Processed: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error('Error running test:reminders:', err);
    process.exit(1);
  }
};

main();
