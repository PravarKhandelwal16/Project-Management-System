const logger=require('../utils/logger');
module.exports=(err,req,res,next)=>{
  if(res.headersSent)return next(err);
  const requested=Number(err.statusCode||err.status||500);
  const status=Number.isInteger(requested)&&requested>=400&&requested<=599?requested:500;
  const message=err.type==='entity.parse.failed'?'Invalid JSON request body.':status===413?'Request body is too large.':status>=500?'Internal server error':err.message||'Request failed';
  if(status>=500)logger.error('request_failed',{method:req.method,path:req.path,code:logger.errorCode(err),status});
  res.status(status).json({success:false,message});
};
