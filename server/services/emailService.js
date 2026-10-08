const nodemailer = require('nodemailer');

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const createTransporter=()=>{
  const port=Number(process.env.SMTP_PORT)||587;
  return nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:process.env.SMTP_SECURE==='true'||port===465,requireTLS:process.env.NODE_ENV==='production'||process.env.SMTP_REQUIRE_TLS==='true',...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}:{}),tls:{rejectUnauthorized:true},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
};
const sendEmail=async({to,subject,text,html})=>{
  if(process.env.NODE_ENV==='test')throw new Error('Email must be mocked in automated tests');
  if(!process.env.SMTP_HOST)return {skipped:true};
  return createTransporter().sendMail({from:process.env.SMTP_FROM||'ProjectMaster <noreply@example.invalid>',to,subject,text,html});
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
      <p>Hello <strong>${escapeHtml(user.full_name)}</strong>,</p>
      <p>This is a reminder that your task is due tomorrow.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #111827;">${escapeHtml(task.name)}</h3>
        <p style="margin: 5px 0;"><strong>Project:</strong> ${escapeHtml(project.name)}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Priority:</strong> ${escapeHtml(task.priority)}</p>
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
      <p>Hello <strong>${escapeHtml(user.full_name)}</strong>,</p>
      <p>You have been assigned to a new task.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #111827;">${escapeHtml(task.name)}</h3>
        <p style="margin: 5px 0;"><strong>Project:</strong> ${escapeHtml(project.name)}</p>
        <p style="margin: 5px 0;"><strong>Priority:</strong> ${escapeHtml(task.priority)}</p>
      </div>
      <p>Please log in to review the details.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

const sendTaskOverdueEmail=(user,task,project)=>sendEmail({to:user.email,subject:'Task overdue: '+task.name,text:'Your task "'+task.name+'" in project "'+project.name+'" is overdue.',html:'<p>Your task <strong>'+escapeHtml(task.name)+'</strong> in '+escapeHtml(project.name)+' is overdue.</p>'});
module.exports = {
  createTransporter, escapeHtml, sendTaskOverdueEmail,
  sendEmail,
  sendTaskReminderEmail,
  sendTaskAssignedEmail
};
