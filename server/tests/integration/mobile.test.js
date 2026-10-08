const {test}=require('node:test');
const assert=require('node:assert/strict');
const f=require('../helpers/fixtures');
const {createApi,SESSION_EXPIRED}=require('../../../mobile/src/services/apiCore.js');
const mobile=role=>createApi({baseUrl:f.getBase(),getToken:()=>f.tokenFor(role)});
test('web and mobile share accounts and authoritative project/task state in both directions',async()=>{
 const native=mobile('project_manager');
 const created=await f.request('project_manager','/tasks','POST',{project_id:1,name:'Web-created mobile review',assigned_to:f.ids.member});assert.equal(created.status,201);
 let list=await native('/tasks?page=1&limit=20&search=Web-created');assert.equal(list.data[0].id,created.data.data.id);
 await native('/tasks/'+created.data.data.id+'/status',{method:'PATCH',body:{status:'Completed'}});
 assert.equal((await f.request('project_manager','/tasks/'+created.data.data.id)).data.data.status,'Completed');
 const task=await native('/tasks',{method:'POST',body:{project_id:1,name:'Mobile-created web review',priority:'High'}});
 assert.equal((await f.request('project_manager','/tasks?search=Mobile-created')).data.data[0].id,task.data.id);
 await f.request('project_manager','/tasks/'+task.data.id,'PUT',{name:'Web edit visible on mobile'});
 assert.equal((await native('/tasks/'+task.data.id)).data.name,'Web edit visible on mobile');
});
test('mobile API client uses all eight existing roles and preserves backend resource and admin boundaries',async()=>{
 for(const role of f.catalog.roles){const native=mobile(role.key);const me=await native('/auth/me');assert.equal(me.user.role,role.key);assert.ok(me.user.permissions);await native('/projects?page=1&limit=1');}
 await assert.rejects(mobile('member')('/admin/users'),{status:403});await assert.rejects(mobile('project_manager')('/admin/users/'+f.ids.project_manager+'/role',{method:'PATCH',body:{role:'super_admin'}}),{status:403});
 await assert.rejects(mobile('member')('/projects/2'),{status:403});
 const unrelated=await f.createTask(2);await assert.rejects(mobile('member')('/tasks/'+unrelated),{status:403});
});
test('pagination is bounded, deterministic, scoped and compatible with existing unpaged web responses',async()=>{
 for(let i=0;i<5;i++)await f.createTask(1,{name:'Paged task '+i});
 const native=mobile('member');const first=await native('/tasks?page=1&limit=2&search=Paged&sortBy=name&order=ASC'),second=await native('/tasks?page=2&limit=2&search=Paged&sortBy=name&order=ASC');
 assert.equal(first.data.length,2);assert.equal(first.pagination.has_more,true);assert.ok(first.data.every(t=>t.project_id===1));assert.ok(first.data.every(t=>!second.data.some(other=>other.id===t.id)));
 const legacy=await native('/tasks?search=Paged');assert.equal(legacy.data.length,5);assert.equal(legacy.pagination,undefined);
 const projects=await native('/projects?limit=1&page=1');assert.equal(projects.data.length,1);assert.equal(projects.data[0].id,1);
 for(const query of ['limit=101','page=0','page=-1','page=1.5','page=10001','limit=bad','due_date=2026-02-30','overdue=maybe','tz=Invalid'])await assert.rejects(native('/tasks?'+query),{status:400});
});
test('native due/overdue filters, metadata and notifications use existing scoped data',async()=>{
 const member=mobile('member');const overdue=await member('/tasks?overdue=true&tz=Asia%2FKolkata&page=1&limit=20');assert.ok(overdue.data.some(t=>t.id===1));assert.ok(overdue.data.every(t=>t.status!=='Completed'));
 const exact=await member('/tasks?due_date=2020-01-01');assert.ok(exact.data.every(t=>t.due_date==='2020-01-01'));
 const details=await member('/projects/1');assert.ok(Number.isInteger(details.data.total_tasks));
 await f.request('super_admin','/admin/users/'+f.ids.member+'/permissions','PUT',{overrides:{'tasks.view':false}});
 assert.equal((await member('/projects/1')).data.total_tasks,null);
 await f.request('super_admin','/admin/users/'+f.ids.member+'/permissions','PUT',{overrides:null});
 const notifications=await member('/notifications?limit=20&offset=0');assert.ok(notifications.data.some(n=>n.resource_type==='TASK'));
 const notification=notifications.data[0];await member('/notifications/'+notification.id+'/read',{method:'PATCH'});assert.equal((await f.request('member','/notifications')).data.data.find(n=>n.id===notification.id).is_read,1);
 await assert.rejects(mobile('viewer')('/notifications/'+notification.id+'/read',{method:'PATCH'}),{status:404});
});
test('expired native sessions receive 401 and trigger client invalidation',async()=>{
 let expired=false;const native=createApi({baseUrl:f.getBase(),getToken:()=>f.tokenFor('member',{expiresIn:-1}),onUnauthorized:()=>{expired=true;}});
 await assert.rejects(native('/auth/me'),{status:401,message:SESSION_EXPIRED});assert.equal(expired,true);
});
