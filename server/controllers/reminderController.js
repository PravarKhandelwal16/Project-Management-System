const { pool } = require('../config/db');
const taskModel = require('../models/taskModel');
const { projectInScope, hasPermission } = require('../services/accessService');
const { createAuditLog } = require('../models/auditModel');
const fail = (status, message) => { const error = new Error(message); error.statusCode = status; return error; };
const identifier = value => { if (!require('../middleware/inputValidation').validateIdentifier(value)) throw fail(400, 'Invalid reminder or task ID.'); return Number(value); };
const selection = "SELECT r.id, r.user_id, r.task_id, r.title, r.notes, r.status, DATE_FORMAT(r.remind_at, '%Y-%m-%dT%H:%i:%sZ') AS remind_at, r.sent_at, r.created_at FROM reminders r";
function validate(body) {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 255) throw fail(400, 'Reminder title must be between 1 and 255 characters.');
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 5000)) throw fail(400, 'Notes must be at most 5000 characters.');
  if (typeof body.remind_at !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(body.remind_at) || !Number.isFinite(Date.parse(body.remind_at))) throw fail(400, 'Provide a valid reminder time with a time zone.');
  const date = new Date(body.remind_at);
  if (date.getTime() <= Date.now()) throw fail(400, 'Choose a reminder time in the future.');
  return { title: body.title.trim(), notes: body.notes?.trim() || null, remind_at: date.toISOString().slice(0,19).replace('T',' '), task_id: body.task_id == null || body.task_id === '' ? null : identifier(body.task_id) };
}
async function verifyTask(user, taskId) {
  if (!taskId) return;
  const task = await taskModel.getTaskById(taskId);
  if (!task) throw fail(404, 'Task not found.');
  if (!hasPermission(user,'tasks.view') || !hasPermission(user,'projects.view') || !await projectInScope(user,{id:task.project_id,user_id:task.project_owner_id})) throw fail(403, 'You cannot attach a reminder to this task.');
}
async function mutate(req, work) {
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const result = await work(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
const list = async (req,res,next) => {
  try {
    const params = [req.user.id]; let where = 'r.user_id = ?';
    if (req.query.task_id) { where += ' AND r.task_id = ?'; params.push(identifier(req.query.task_id)); }
    if (req.query.status) {
      if (!['scheduled','sent','dismissed'].includes(req.query.status)) throw fail(400,'Invalid reminder status.');
      where += ' AND r.status = ?'; params.push(req.query.status);
    }
    const [rows] = await pool.execute(selection + ' WHERE ' + where + ' ORDER BY r.remind_at ASC, r.id ASC',params);
    res.json({success:true,data:rows});
  } catch(error) { next(error); }
};
const create = async (req,res,next) => {
  try {
    const data = validate(req.body); await verifyTask(req.user,data.task_id);
    const id = await mutate(req,async connection => {
      const [result] = await connection.execute('INSERT INTO reminders (user_id,task_id,title,notes,remind_at) VALUES (?,?,?,?,?)',[req.user.id,data.task_id,data.title,data.notes,data.remind_at]);
      await createAuditLog({userId:req.user.id,action:'REMINDER_CREATED',resourceType:'REMINDER',resourceId:result.insertId,details:{after:{task_id:data.task_id,remind_at:data.remind_at,status:'scheduled'}}},connection);
      return result.insertId;
    });
    const [rows] = await pool.execute(selection + ' WHERE r.id = ?',[id]); res.status(201).json({success:true,data:rows[0]});
  } catch(error) { next(error); }
};
const update = async (req,res,next) => {
  try {
    const id = identifier(req.params.id);
    if (req.body.status !== undefined && !['scheduled','dismissed'].includes(req.body.status)) throw fail(400,'Invalid reminder status.');
    const dismiss = req.body.status === 'dismissed';
    const data = dismiss ? null : validate(req.body);
    if (data) await verifyTask(req.user,data.task_id);
    await mutate(req,async connection => {
      const [rows] = await connection.execute('SELECT * FROM reminders WHERE id = ? AND user_id = ? FOR UPDATE',[id,req.user.id]);
      if (!rows.length) throw fail(404,'Reminder not found.');
      if (dismiss) await connection.execute("UPDATE reminders SET status = 'dismissed' WHERE id = ?",[id]);
      else await connection.execute("UPDATE reminders SET title = ?,notes = ?,remind_at = ?,task_id = ?,status = 'scheduled',sent_at = NULL WHERE id = ?",[data.title,data.notes,data.remind_at,data.task_id,id]);
      await createAuditLog({userId:req.user.id,action:dismiss ? 'REMINDER_DISMISSED' : 'REMINDER_UPDATED',resourceType:'REMINDER',resourceId:id,details:{before:{task_id:rows[0].task_id,remind_at:rows[0].remind_at,status:rows[0].status},after:data ? {task_id:data.task_id,remind_at:data.remind_at,status:'scheduled'} : {status:'dismissed'}}},connection);
    });
    const [rows] = await pool.execute(selection + ' WHERE r.id = ?',[id]); res.json({success:true,data:rows[0]});
  } catch(error) { next(error); }
};
const remove = async (req,res,next) => {
  try {
    const id = identifier(req.params.id);
    await mutate(req,async connection => {
      const [rows] = await connection.execute('SELECT task_id,remind_at,status FROM reminders WHERE id = ? AND user_id = ? FOR UPDATE',[id,req.user.id]);
      if (!rows.length) throw fail(404,'Reminder not found.');
      await connection.execute('DELETE FROM reminders WHERE id = ?',[id]);
      await createAuditLog({userId:req.user.id,action:'REMINDER_DELETED',resourceType:'REMINDER',resourceId:id,details:{before:rows[0]}},connection);
    });
    res.json({success:true});
  } catch(error) { next(error); }
};
module.exports = { list, create, update, remove };
