const { buildReport } = require('../services/reportService');
const { pool } = require('../config/db');
const getDashboardData = async (req,res,next) => {
  try {
    const report = await buildReport(req.user,{days:7,timeZone:req.query.tz || undefined});
    const [reminders] = await pool.execute("SELECT id,title,task_id,DATE_FORMAT(remind_at,'%Y-%m-%dT%H:%i:%sZ') AS remind_at FROM reminders WHERE user_id = ? AND status = 'scheduled' ORDER BY remind_at LIMIT 5",[req.user.id]);
    res.json({success:true,data:{...report,reminders}});
  } catch(error) { next(error); }
};
module.exports = { getDashboardData };
