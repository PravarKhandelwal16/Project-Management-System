const {validateEnvironment}=require('./config/env');
const logger=require('./utils/logger');
async function startServer(){
  const config=validateEnvironment();
  const {pool,testConnection}=require('./config/db');
  await testConnection();
  const server=require('./app').listen(config.port,()=>logger.info('server_started',{port:config.port,environment:process.env.NODE_ENV||'development'}));
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const jobs=process.env.SCHEDULER_ENABLED==='false'?[]:require('./jobs/notificationScheduler').startScheduler();
  let stopping=false;
  const shutdown=async signal=>{
    if(stopping)return;stopping=true;logger.info('server_stopping',{signal});
    jobs.forEach(job=>job.stop());
    const timer=setTimeout(()=>process.exit(1),10000);timer.unref();
    server.close(async()=>{try{await pool.end();clearTimeout(timer);process.exit(0);}catch{process.exit(1);}});
    server.closeIdleConnections();
  };
  process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
  return server;
}
if(require.main===module)startServer().catch(error=>{logger.error('startup_failed',{code:logger.errorCode(error),...(error.message.startsWith('Invalid environment:')?{message:error.message}:{})});process.exit(1);});
module.exports={startServer};
