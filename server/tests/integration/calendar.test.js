const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pool,ids,request,tokenFor,getBase,jwt,catalog,resolveAccess,canManageAccount,validatePermissions}=require('../helpers/fixtures');
const {redact}=require('../../models/auditModel');
const eventPayload={title:'Private review',notes:'Confidential notes',event_date:'2028-02-29',start_time:'09:00',end_time:'10:30'};

test('calendar events validate dates and times and enforce ownership on every mutation', async () => {
  const created=await request('member','/calendar/events','POST',eventPayload);
  assert.equal(created.status,201);
  const id=created.data.data.id;
  assert.equal(created.data.data.event_date,'2028-02-29');
  assert.equal(created.data.data.start_time,'09:00');
  assert.equal((await request('admin','/calendar/events')).data.data.length,0);
  assert.equal((await request('admin','/calendar/events/'+id,'PUT',eventPayload)).status,404);
  assert.equal((await request('admin','/calendar/events/'+id,'DELETE')).status,404);
  for(const invalid of [{event_date:'2027-02-29'},{event_date:'2028-02-30'},{start_time:'24:00'},{end_time:'08:59'},{start_time:null},{title:' '}]) {
    assert.equal((await request('member','/calendar/events','POST',{...eventPayload,...invalid})).status,400);
  }
  const allDay=await request('member','/calendar/events/'+id,'PUT',{...eventPayload,start_time:null,end_time:null});
  assert.equal(allDay.status,200);assert.equal(allDay.data.data.start_time,null);
  assert.equal((await request('member','/calendar/events')).data.data[0].id,id);
  const [audits]=await pool.execute("SELECT details FROM audit_logs WHERE resource_type = 'CALENDAR_EVENT' AND resource_id = ?",[id]);
  for(const audit of audits){assert.equal(audit.details.includes(eventPayload.title),false);assert.equal(audit.details.includes(eventPayload.notes),false);}
  assert.equal((await request('member','/calendar/events/'+id,'DELETE')).status,200);
  assert.equal((await request('member','/calendar/events')).data.data.length,0);
  assert.equal((await request('member','/calendar/events/'+id,'DELETE')).status,404);
});
test('calendar colours persist per account for categories and items and reset independently', async () => {
  assert.equal((await request('member','/calendar/colours','PUT',{key:'task',colour:'#123456'})).status,200);
  assert.equal((await request('member','/calendar/colours','PUT',{key:'reminder:1',colour:'#aBcDef'})).status,200);
  assert.deepEqual((await request('member','/calendar/colours')).data.data,{task:'#123456','reminder:1':'#aBcDef'});
  assert.deepEqual((await request('admin','/calendar/colours')).data.data,{});
  assert.equal((await request('admin','/calendar/colours','PUT',{key:'task',colour:'#ff0000'})).status,200);
  for(const invalid of [{key:'task:0',colour:'#123456'},{key:'users',colour:'#123456'},{key:'task',colour:'red'},{key:'event',colour:'#fff'}]){
    assert.equal((await request('member','/calendar/colours','PUT',invalid)).status,400);
  }
  assert.equal((await request('member','/calendar/colours','DELETE')).status,200);
  assert.deepEqual((await request('member','/calendar/colours')).data.data,{});
  assert.deepEqual((await request('admin','/calendar/colours')).data.data,{task:'#ff0000'});
});
