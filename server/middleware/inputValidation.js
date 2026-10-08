const v=require('../utils/validation');
const fail=message=>Object.assign(new Error(message),{statusCode:400});
function bodyFields(...keys){return(req,res,next)=>Object.keys(req.body||{}).some(key=>!keys.includes(key))?next(fail('Unexpected request field.')):next();}
function validateIdentifier(value){return (typeof value==='number'||typeof value==='string'&&/^[1-9]\d*$/.test(value))&&Number.isSafeInteger(Number(value))&&Number(value)>0;}
function listQuery(kind){return(req,res,next)=>{
  try{
    const q=req.query;
    if(q.search&&q.search.length>255)throw fail('Search must be at most 255 characters.');
    if(q.status&&!((kind==='projects'?v.VALID_PROJECT_STATUSES:v.VALID_TASK_STATUSES).includes(q.status)))throw fail('Invalid status filter.');
    if(q.priority&&!v.VALID_TASK_PRIORITIES.includes(q.priority))throw fail('Invalid priority filter.');
    for(const key of ['project_id','assigned_to'])if(q[key]&&!validateIdentifier(q[key]))throw fail('Invalid '+key+' filter.');
    if(q.sortBy&&!(kind==='projects'?v.ALLOWED_PROJECT_SORT_FIELDS:v.ALLOWED_TASK_SORT_FIELDS).includes(q.sortBy))throw fail('Invalid sort field.');
    for(const key of ['order','sortOrder'])if(q[key]&&!['ASC','DESC'].includes(q[key].toUpperCase()))throw fail('Invalid sort direction.');
    next();
  }catch(error){next(error);}
};}
function taskIds(req,res,next){
  for(const key of ['project_id','assigned_to'])if(req.body[key]!==undefined&&req.body[key]!==null&&!validateIdentifier(req.body[key]))return next(fail('Invalid '+key+'.'));
  if(req.path.endsWith('/assign')&&req.body.assigned_to===undefined)return next(fail('assigned_to is required; use null to unassign.'));
  next();
}
module.exports={bodyFields,listQuery,taskIds,validateIdentifier};
