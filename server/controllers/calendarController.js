const { pool } = require('../config/db');
const { createAuditLog } = require('../models/auditModel');
const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });
const idOf = value => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw fail(400, 'Invalid event ID.');
  return id;
};
const selection = "SELECT id, title, notes, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date, TIME_FORMAT(start_time, '%H:%i') AS start_time, TIME_FORMAT(end_time, '%H:%i') AS end_time FROM calendar_events";
function validate(body) {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 255) throw fail(400, 'Event title must be between 1 and 255 characters.');
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 5000)) throw fail(400, 'Notes must be at most 5000 characters.');
  if (typeof body.event_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.event_date) || !Number.isFinite(Date.parse(body.event_date)) || new Date(body.event_date).toISOString().slice(0,10) !== body.event_date || body.event_date < '1000-01-01') throw fail(400, 'Choose a valid event date.');
  const time = value => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw fail(400, 'Choose a valid event time.');
    return value;
  };
  const start = time(body.start_time), end = time(body.end_time);
  if (end && (!start || end <= start)) throw fail(400, 'End time must be after the start time on the same day.');
  return [body.title.trim(), body.notes?.trim() || null, body.event_date, start, end];
}
async function transaction(work) {
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const result = await work(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
exports.listEvents = async (req,res,next) => {
  try { const [rows] = await pool.execute(selection + ' WHERE user_id = ? ORDER BY event_date, start_time, id', [req.user.id]); res.json({success:true,data:rows}); } catch(error) { next(error); }
};
exports.saveEvent = async (req,res,next) => {
  try {
    const values = validate(req.body), id = req.params.id ? idOf(req.params.id) : null;
    const savedId = await transaction(async connection => {
      let eventId = id;
      if (id) {
        const [rows] = await connection.execute('SELECT id FROM calendar_events WHERE id = ? AND user_id = ? FOR UPDATE', [id,req.user.id]);
        if (!rows.length) throw fail(404,'Event not found.');
        await connection.execute('UPDATE calendar_events SET title = ?,notes = ?,event_date = ?,start_time = ?,end_time = ? WHERE id = ? AND user_id = ?', [...values,id,req.user.id]);
      } else {
        const [result] = await connection.execute('INSERT INTO calendar_events (title,notes,event_date,start_time,end_time,user_id) VALUES (?,?,?,?,?,?)', [...values,req.user.id]);
        eventId = result.insertId;
      }
      // Personal titles and notes are excluded from shared audit history.
      await createAuditLog({userId:req.user.id,action:id?'CALENDAR_EVENT_UPDATED':'CALENDAR_EVENT_CREATED',resourceType:'CALENDAR_EVENT',resourceId:eventId,details:{event_date:values[2]}},connection);
      return eventId;
    });
    const [rows] = await pool.execute(selection + ' WHERE id = ? AND user_id = ?', [savedId,req.user.id]);
    res.status(id?200:201).json({success:true,data:rows[0]});
  } catch(error) { next(error); }
};
exports.deleteEvent = async (req,res,next) => {
  try {
    const id = idOf(req.params.id);
    await transaction(async connection => {
      const [result] = await connection.execute('DELETE FROM calendar_events WHERE id = ? AND user_id = ?', [id,req.user.id]);
      if (!result.affectedRows) throw fail(404,'Event not found.');
      await createAuditLog({userId:req.user.id,action:'CALENDAR_EVENT_DELETED',resourceType:'CALENDAR_EVENT',resourceId:id},connection);
    });
    res.json({success:true});
  } catch(error) { next(error); }
};
exports.getColours = async (req,res,next) => {
  try { const [rows] = await pool.execute('SELECT item_key,colour FROM calendar_colours WHERE user_id = ?', [req.user.id]); res.json({success:true,data:Object.fromEntries(rows.map(row=>[row.item_key,row.colour]))}); } catch(error) { next(error); }
};
exports.saveColour = async (req,res,next) => {
  try {
    const {key,colour} = req.body;
    if (typeof key !== 'string' || !/^(task|reminder|event|completed|overdue)$|^(task|reminder|event):[1-9]\d{0,9}$/.test(key)) throw fail(400,'Invalid calendar colour key.');
    if (typeof colour !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(colour)) throw fail(400,'Choose a valid colour.');
    await pool.execute('INSERT INTO calendar_colours (user_id,item_key,colour) VALUES (?,?,?) ON DUPLICATE KEY UPDATE colour = VALUES(colour)',[req.user.id,key,colour]);
    res.json({success:true});
  } catch(error) { next(error); }
};
exports.resetColours = async (req,res,next) => {
  try { await pool.execute('DELETE FROM calendar_colours WHERE user_id = ?', [req.user.id]); res.json({success:true}); } catch(error) { next(error); }
};
