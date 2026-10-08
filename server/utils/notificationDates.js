const {todayInZone}=require('../services/reportService');
const shiftDay=(day,offset)=>new Date(Date.parse(day+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
const reminderType=(task,today)=>task.status==='Completed'||!task.due_date?null:task.due_date===shiftDay(today,1)?'TASK_DUE_TOMORROW':task.due_date<today?'TASK_OVERDUE':null;
const dailyNotificationKey=(day,userId,taskId,type,channel)=>[day,userId,taskId,type,channel].join(':');
module.exports={shiftDay,reminderType,dailyNotificationKey,todayInZone};
