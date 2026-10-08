require('dotenv').config();
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
    console.error('Error sending test email:', err);
    process.exit(1);
  }
};

main();
