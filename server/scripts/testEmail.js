require('../config/env');
const emailService = require('../services/emailService');

const main = async () => {
  try {
    const to = process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
    console.log(`Sending test email to ${to}...`);
    
    await emailService.sendEmail({
      to,
      subject: 'Test Email from Project Management System',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SMTP configuration.</p>'
    });
    
    console.log('Test email sent successfully.');
    process.exit(0);
  } catch (err) {
    require('../utils/logger').error('manual_email_test_failed',{code:require('../utils/logger').errorCode(err)});
    process.exit(1);
  }
};

main();
