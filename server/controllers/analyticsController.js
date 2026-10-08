const { buildReport } = require('../services/reportService');
const analytics = async (req,res,next) => {
  try {
    const days=Number(req.query.days||30);
    if(![7,30,90].includes(days)) return res.status(400).json({success:false,message:'Choose a 7, 30 or 90 day activity range.'});
    const report=await buildReport(req.user,{days,projectId:req.query.project_id,timeZone:req.query.tz || undefined});
    if(req.query.project_id&&!report.projects.length) return res.status(403).json({success:false,message:'This project is not accessible.'});
    res.json({success:true,data:report});
  } catch(error) { next(error); }
};
module.exports = { analytics };
