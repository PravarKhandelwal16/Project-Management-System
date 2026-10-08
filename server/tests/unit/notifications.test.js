const {test,after}=require('node:test'),assert=require('node:assert/strict');
const {reminderType,shiftDay,dailyNotificationKey}=require('../../utils/notificationDates');
const {escapeHtml,createTransporter,sendEmail}=require('../../services/emailService');
const {pool}=require('../../config/db');after(()=>pool.end());
test('due tomorrow, overdue and completion rules handle month/year boundaries',()=>{
  assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
  assert.equal(reminderType({status:'Pending',due_date:'2027-01-01'},'2026-12-31'),'TASK_DUE_TOMORROW');
  assert.equal(reminderType({status:'In Progress',due_date:'2026-12-30'},'2026-12-31'),'TASK_OVERDUE');
  assert.equal(reminderType({status:'Completed',due_date:'2026-12-30'},'2026-12-31'),null);
  assert.equal(reminderType({status:'Pending',due_date:'2026-12-31'},'2026-12-31'),null);
});
test('daily duplicate keys separate recipients, tasks, types, channels and dates',()=>{
  const key=dailyNotificationKey('2026-01-01',1,2,'TASK_OVERDUE','WEB');
  assert.equal(key,dailyNotificationKey('2026-01-01',1,2,'TASK_OVERDUE','WEB'));
  for(const values of [['2026-01-02',1,2,'TASK_OVERDUE','WEB'],['2026-01-01',2,2,'TASK_OVERDUE','WEB'],['2026-01-01',1,3,'TASK_OVERDUE','WEB'],['2026-01-01',1,2,'TASK_DUE_TOMORROW','WEB'],['2026-01-01',1,2,'TASK_OVERDUE','EMAIL']])assert.notEqual(key,dailyNotificationKey(...values));
});
test('email templates escape user content and automated tests cannot send SMTP',async()=>{
  assert.equal(escapeHtml('<script>&"'),'&lt;script&gt;&amp;&quot;');
  await assert.rejects(sendEmail({to:'nobody@example.invalid',subject:'test'}),/mocked/);
  const transport=createTransporter();assert.equal(transport.options.tls.rejectUnauthorized,true);transport.close();
});
