const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),entries=require('../../docs/api/endpoints.json'),catalog=require('../../shared/access.json');
const paths={},groups=new Map();
const security=[{bearerAuth:[]}];
const type=(key,value,url)=>{
  if(['id','user_id','project_id','assigned_to','task_id','version'].includes(key))return {type:'integer',minimum:1,nullable:['assigned_to','task_id'].includes(key)};
  if(key==='token'&&url==='/notifications/push-devices')return {type:'string',maxLength:255,pattern:'^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]+\\]$'};
  if(key==='platform')return {type:'string',enum:['android','ios']};
  if(key==='role')return {type:'string',enum:catalog.roles.map(r=>r.key)};
  if(key==='permissions')return {type:'array',items:{type:'string',enum:catalog.permissions.map(p=>p.key)}};
  if(key==='overrides')return {type:'object',additionalProperties:{type:'boolean'},nullable:true};
  if(typeof value==='boolean')return {type:'boolean'};
  if(key==='priority')return {type:'string',enum:['Low','Medium','High']};
  if(key==='status')return {type:'string',enum:url.startsWith('/projects')?['Not Started','In Progress','Completed']:url.startsWith('/reminders')?['scheduled','dismissed']:['Pending','In Progress','Completed']};
  if(key.endsWith('_date'))return {type:'string',format:'date',nullable:key!=='event_date'};
  if(key==='remind_at')return {type:'string',format:'date-time'};
  if(key==='password')return {type:'string',format:'password',minLength:url==='/auth/login'?1:8,maxLength:72,writeOnly:true,description:'At most 72 UTF-8 bytes; new passwords need a letter and number.'};
  if(key==='email')return {type:'string',format:'email'};
  if(key==='colour')return {type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
  return {type:'string',nullable:value===null};
};
const exampleFor=url=>entries.find(([method,path])=>method==='POST'&&path===url)?.[5];
function bodySchema(method,url,body){
  let fields=body,required=[];
  if(method==='PUT'&&url==='/projects/{id}')fields=exampleFor('/projects');
  if(method==='PUT'&&url==='/tasks/{id}'){fields={...exampleFor('/tasks')};delete fields.project_id;}
  if(method==='PUT'&&url==='/reminders/{id}')fields={...exampleFor('/reminders'),status:'dismissed'};
  if(method==='POST')required=url==='/auth/login'?['email','password']:url==='/auth/register'?['full_name','email','password']:url==='/projects'?['name']:url==='/tasks'?['project_id','name']:url==='/admin/users'?['full_name','email','password']:url.endsWith('/members')?['user_id']:url==='/reminders'?['title','remind_at']:url==='/calendar/events'?['title','event_date']:[];
  if(method==='PATCH')required=Object.keys(body);
  if(url==='/notifications/push-devices')required=method==='POST'?['token','platform']:['token'];
  if(method==='PUT'&&url==='/calendar/events/{id}')required=['title','event_date'];
  if(method==='PUT'&&url==='/calendar/colours')required=['key','colour'];
  if(method==='PUT'&&url==='/admin/users/{id}')required=['full_name','email'];
  if(method==='PUT'&&url==='/admin/users/{id}/permissions')required=['overrides'];
  if(method==='PUT'&&url==='/admin/roles/{role}')required=['permissions','version'];
  const schema={type:'object',additionalProperties:false,properties:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,type(k,v,url)])),...(required.length?{required}:{})};
  if(url==='/reminders/{id}'&&method==='PUT')schema.anyOf=[{required:['title','remind_at']},{required:['status'],properties:{status:{enum:['dismissed']}}}];
  return schema;
}
for(const [method,url,tag,summary,permissions,body,query=[]] of entries){
  const publicRoute=!permissions.length;
  const params=[...url.matchAll(/\{([^}]+)\}/g)].map(match=>({name:match[1],in:'path',required:true,schema:match[1]==='role'?{type:'string',enum:catalog.roles.map(r=>r.key)}:{type:'integer',minimum:1}}));
  for(const name of query)params.push({name,in:'query',schema:{type:'string'}});
  const op={tags:[tag],summary,description:permissions.includes('authenticated')?'Requires an active authenticated account.':permissions.length?'Required effective permissions: '+permissions.join(', ')+'. Resource routes also enforce ownership/membership or projects.view_all. Admin routes always require admin/super_admin.':'Public endpoint.',security:publicRoute?[]:security,parameters:params,'x-required-permissions':permissions,responses:{'200':{description:'Success; see API.md response envelopes'},'400':{description:'Invalid input'},'401':{description:'Missing/invalid/expired token'},'403':{description:'Permission, scope or origin denied'},'404':{description:'Resource not found'},'409':{description:'Duplicate, protected state or concurrent update'},'429':{description:'Authentication rate limit'},'500':{description:'Safe internal error'}}};
  if(method==='POST'&&url!=='/notifications/push-devices'&&!url.startsWith('/auth/login')&&!url.startsWith('/auth/logout'))op.responses['201']={description:'Created'};
  if(body){op.requestBody={required:true,content:{'application/json':{schema:bodySchema(method,url,body),example:body}}};}
  paths[url]??={};paths[url][method.toLowerCase()]=op;
  const idVar=url.startsWith('/projects')||url.startsWith('/team')?'projectId':url.startsWith('/tasks')?'taskId':url.startsWith('/notifications')?'notificationId':url.startsWith('/reminders')?'reminderId':url.startsWith('/calendar/events')?'eventId':'userId';
  const postmanUrl='{{baseUrl}}'+url.replaceAll('{id}','{{'+idVar+'}}').replaceAll('{userId}','{{userId}}').replaceAll('{role}','{{role}}');
  const request={name:summary,request:{method,header:[{key:'Content-Type',value:'application/json'}],auth:publicRoute?{type:'noauth'}:{type:'bearer',bearer:[{key:'token',value:'{{token}}',type:'string'}]},url:postmanUrl,description:op.description,...(body?{body:{mode:'raw',raw:JSON.stringify(body,null,2),options:{raw:{language:'json'}}}}:{})}};
  if(query.length)request.request.url={raw:postmanUrl,query:query.map(key=>({key,value:'',disabled:true,description:'Optional; see API.md for allowed values.'}))};
  if(url==='/auth/login')request.event=[{listen:'test',script:{type:'text/javascript',exec:["if(pm.response.code===200)pm.collectionVariables.set('token',pm.response.json().token);"]}}];
  if(method==='POST'&&['/projects','/tasks','/reminders','/calendar/events'].includes(url))request.event=[{listen:'test',script:{type:'text/javascript',exec:["if(pm.response.code===201)pm.collectionVariables.set('"+idVar+"',pm.response.json().data.id);"]}}];
  if(!groups.has(tag))groups.set(tag,[]);groups.get(tag).push(request);
}
fs.writeFileSync(path.join(root,'docs/api/openapi.json'),JSON.stringify({openapi:'3.0.3',info:{title:'Project Management System',version:'1.0.0',description:'Stage 7 API reference. API.md documents payload rules, examples, queries and dynamic authorization.'},servers:[{url:'http://localhost:5000/api',description:'Local development'}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}},paths},null,2)+'\n');
fs.writeFileSync(path.join(root,'docs/api/Project-Management-System.postman_collection.json'),JSON.stringify({info:{name:'Project Management System',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[['baseUrl','http://localhost:5000/api'],['token',''],['email',''],['newEmail',''],['password',''],['projectId','1'],['taskId','1'],['userId','1'],['notificationId','1'],['reminderId','1'],['eventId','1'],['role','member']].map(([key,value])=>({key,value})),item:[...groups].map(([name,item])=>({name,item}))},null,2)+'\n');
console.log('Generated '+entries.length+' API operations and Postman requests.');
