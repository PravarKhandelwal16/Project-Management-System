const path=require('node:path');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
require('dotenv').config({path:path.resolve(__dirname,'../../.env'),quiet:true});
function validateEnvironment(env=process.env){
  const production=env.NODE_ENV==='production',problems=[];
  const integer=(key,fallback,max=65535)=>{const value=Number(env[key]||fallback);if(!Number.isSafeInteger(value)||value<1||value>max)problems.push(key+' must be a positive integer');return value;};
  const port=integer('PORT',5000),dbPort=integer('DB_PORT',3306),poolSize=integer('DB_POOL_SIZE',10,100);
  if(!env.JWT_SECRET)problems.push('JWT_SECRET is required');
  if(production){
    for(const key of ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME','FRONTEND_URL'])if(!env[key]?.trim())problems.push(key+' is required in production');
    if(Buffer.byteLength(env.JWT_SECRET||'')<32||/change.?me|replace|example|secret_here/i.test(env.JWT_SECRET||''))problems.push('JWT_SECRET must be a random secret of at least 32 bytes');
    if(env.DB_USER==='root')problems.push('Use a dedicated database user in production');
  }
  const expires=env.JWT_EXPIRES_IN||'24h',duration=/^([1-9]\d*)(s|m|h|d)$/.exec(expires);
  if(!duration||Number(duration[1])*({s:1,m:60,h:3600,d:86400}[duration?.[2]]||0)>604800)problems.push('JWT_EXPIRES_IN must be a duration such as 1h, at most 7d');
  const timeZone=env.APP_TIMEZONE||'Asia/Kolkata';
  try{new Intl.DateTimeFormat('en',{timeZone});}catch{problems.push('APP_TIMEZONE is invalid');}
  if(env.REMINDER_CRON&&!require('node-cron').validate(env.REMINDER_CRON))problems.push('REMINDER_CRON is invalid');
  if(env.FRONTEND_URL){
    try{const url=new URL(env.FRONTEND_URL);if(!['http:','https:'].includes(url.protocol)||url.origin!==env.FRONTEND_URL||production&&url.protocol!=='https:')throw Error();}catch{problems.push('FRONTEND_URL must be an exact origin (HTTPS in production), without trailing slash');}
  }
  const proxy=env.TRUST_PROXY||'';
  if(proxy&&!proxy.split(',').every(item=>item.trim()==='loopback'||/^([\da-f:.]+)(\/\d{1,3})?$/i.test(item.trim())&&require('node:net').isIP(item.trim().split('/')[0])))problems.push('TRUST_PROXY must list trusted IPs/subnets or loopback; never true or a hop count');
  for(const key of ['SMTP_SECURE','SMTP_REQUIRE_TLS','SCHEDULER_ENABLED','DB_SSL','PUSH_ENABLED'])if(env[key]&&!['true','false'].includes(env[key]))problems.push(key+' must be true or false');
  if(env.SMTP_HOST){integer('SMTP_PORT',587);if(production&&!env.SMTP_FROM)problems.push('SMTP_FROM is required when email is enabled');if(production&&env.SMTP_REQUIRE_TLS==='false')problems.push('SMTP_REQUIRE_TLS cannot be disabled in production');}
  if(problems.length)throw new Error('Invalid environment: '+problems.join('; '));
  return {port,dbPort,poolSize,production,expires,timeZone,trustProxy:proxy?proxy.split(',').map(item=>item.trim()):false};
}
module.exports={validateEnvironment};
