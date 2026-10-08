const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 1025,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SMTP_PASS || 'pass'
    },
    tls: { rejectUnauthorized: false } // For local dev
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  // Only send if SMTP is configured or we're mocking in dev
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'test') {
    console.log(`[EMAIL DISABLED] Would have sent to ${to}: ${subject}`);
    return { messageId: 'mock-id' };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Project Master" <noreply@projectmaster.local>',
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
};

const sendTaskReminderEmail = async (user, task, project) => {
  const subject = `Task Reminder: "${task.name}" is due tomorrow`;
  
  const text = `Hello ${user.full_name},

This is a reminder that your task:
${task.name}

Project: ${project.name}
Due Date: ${new Date(task.due_date).toLocaleDateString()}
Priority: ${task.priority}

is due tomorrow.

Please log in to the Project Management System to review the task.`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Task Reminder</h2>
      <p>Hello <strong>${user.full_name}</strong>,</p>
      <p>This is a reminder that your task is due tomorrow.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #111827;">${task.name}</h3>
        <p style="margin: 5px 0;"><strong>Project:</strong> ${project.name}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority}</p>
      </div>
      <p>Please log in to the Project Management System to review your task.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

const sendTaskAssignedEmail = async (user, task, project) => {
  const subject = `New Task Assigned: "${task.name}"`;
  
  const text = `Hello ${user.full_name},

You have been assigned to a new task:
${task.name}

Project: ${project.name}
Priority: ${task.priority}

Please log in to review the details.`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>New Task Assigned</h2>
      <p>Hello <strong>${user.full_name}</strong>,</p>
      <p>You have been assigned to a new task.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #111827;">${task.name}</h3>
        <p style="margin: 5px 0;"><strong>Project:</strong> ${project.name}</p>
        <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority}</p>
      </div>
      <p>Please log in to review the details.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendTaskReminderEmail,
  sendTaskAssignedEmail
};
