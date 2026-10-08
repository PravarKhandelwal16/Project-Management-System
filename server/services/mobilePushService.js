const {pool}=require('../config/db');
const logger=require('../utils/logger');
const {dailyNotificationKey}=require('../utils/notificationDates');
const enabled=()=>process.env.PUSH_ENABLED==='true';
const safeCode=value=>['DeviceNotRegistered','MessageTooBig','MessageRateExceeded','MismatchSenderId','InvalidCredentials'].includes(value)?value:'PUSH_DELIVERY_FAILED';
async function postExpo(endpoint,body){
  const response=await fetch('https://exp.host/--/api/v2/push/'+endpoint,{
    method:'POST',signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/json',Accept:'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+process.env.EXPO_ACCESS_TOKEN}:{})},
    body:JSON.stringify(body)
  });
  if(!response.ok)throw Object.assign(new Error('Push provider unavailable'),{code:'PUSH_PROVIDER_FAILED'});
  const result=await response.json();
  if(result.errors||!result.data)throw Object.assign(new Error('Push provider rejected request'),{code:'PUSH_PROVIDER_FAILED'});
  return result.data;
}
async function registerDevice(userId,{token,platform}){
  if(!enabled())throw Object.assign(new Error('Mobile push is not enabled on this server.'),{statusCode:503});
  // A device token belongs to the account currently signed in on that installation.
  await pool.execute(`INSERT INTO mobile_push_devices (user_id,expo_token,platform,expires_at) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))
    ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),platform=VALUES(platform),expires_at=VALUES(expires_at)`,[userId,token,platform]);
}
async function removeDevice(userId,token){await pool.execute('DELETE FROM mobile_push_devices WHERE user_id=? AND expo_token=?',[userId,token]);}
async function sendDueTomorrow(user,task,today){
  if(!enabled())return 0;
  const [devices]=await pool.execute('SELECT id,expo_token FROM mobile_push_devices WHERE user_id=? AND expires_at>NOW()',[user.id]);
  let processed=0;
  for(const device of devices){
    const key=dailyNotificationKey(today,user.id,task.id,'TASK_DUE_TOMORROW','PUSH')+':'+require('node:crypto').createHash('sha256').update(device.expo_token).digest('hex').slice(0,32);
    let claim;
    try{
      const [insert]=await pool.execute("INSERT INTO notification_logs (user_id,task_id,notification_type,channel,status,delivery_key) VALUES (?,?,'TASK_DUE_TOMORROW','PUSH','PROCESSING',?)",[user.id,task.id,key]);
      claim=insert.insertId;
    }catch(error){if(error.code==='ER_DUP_ENTRY')continue;throw error;}
    try{
      // Deliberately omit names/descriptions from lock-screen content.
      const tickets=await module.exports.postExpo('send',[{to:device.expo_token,title:'Task due tomorrow',body:'You have a task due tomorrow. Open ProjectMaster to view it.',sound:'default',channelId:'task-reminders',priority:'high',ttl:3600,data:{type:'TASK_DUE_TOMORROW',taskId:task.id,userId:user.id}}]);
      const ticket=tickets[0];
      if(ticket?.status!=='ok'||typeof ticket.id!=='string'){
        const code=safeCode(ticket?.details?.error);
        if(code==='DeviceNotRegistered')await removeDevice(user.id,device.expo_token);
        throw Object.assign(new Error('Push ticket failed'),{code});
      }
      await pool.execute('INSERT INTO mobile_push_receipts (log_id,device_id,ticket_id) VALUES (?,?,?)',[claim,device.id,ticket.id]);
      await pool.execute("UPDATE notification_logs SET status='ACCEPTED' WHERE id=?",[claim]);
    }catch(error){
      await pool.execute("UPDATE notification_logs SET status='FAILED',error_message=? WHERE id=?",[safeCode(error.code),claim]);
      logger.error('task_push_failed',{task_id:task.id,code:safeCode(error.code)});
    }
    processed++;
  }
  return processed;
}
async function checkReceipts(){
  if(!enabled())return;
  const [rows]=await pool.execute(`SELECT r.*,d.expo_token,d.user_id FROM mobile_push_receipts r LEFT JOIN mobile_push_devices d ON d.id=r.device_id
    WHERE r.checked_at IS NULL AND r.created_at<DATE_SUB(NOW(),INTERVAL 15 MINUTE) ORDER BY r.id LIMIT 1000`);
  if(!rows.length)return;
  let receipts;
  try{receipts=await module.exports.postExpo('getReceipts',{ids:rows.map(r=>r.ticket_id)});}catch(error){logger.error('push_receipt_check_failed',{code:'PUSH_PROVIDER_FAILED'});return;}
  for(const row of rows){
    const receipt=receipts[row.ticket_id];
    if(!receipt&&Date.now()-new Date(row.created_at).getTime()<24*3600000)continue;
    const ok=receipt?.status==='ok',code=receipt?safeCode(receipt.details?.error):'PUSH_RECEIPT_EXPIRED';
    await pool.execute('UPDATE notification_logs SET status=?,error_message=? WHERE id=?',[ok?'SENT':'FAILED',ok?null:code,row.log_id]);
    await pool.execute('UPDATE mobile_push_receipts SET checked_at=NOW() WHERE id=?',[row.id]);
    if(code==='DeviceNotRegistered'&&row.expo_token)await removeDevice(row.user_id,row.expo_token);
  }
}
module.exports={postExpo,registerDevice,removeDevice,sendDueTomorrow,checkReceipts,enabled};
