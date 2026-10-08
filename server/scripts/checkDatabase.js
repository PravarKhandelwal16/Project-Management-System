// Read-only connectivity check; works before schema creation.
require('../config/env');
async function checkDatabase(){
  if(!process.env.DB_NAME)throw Object.assign(new Error('DB_NAME is required'),{code:'DB_CONFIGURATION_MISSING'});
  const {pool}=require('../config/db');
  try{
    const connection=await pool.getConnection();
    try{
      const [version]=await connection.query('SELECT VERSION() AS version');
      const [tls]=await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
      const encrypted=Boolean(tls[0]?.Value);
      if(process.env.DB_SSL==='true'&&!encrypted)throw Object.assign(new Error('TLS was not established'),{code:'DB_TLS_REQUIRED'});
      console.log('Database connection verified. MySQL: '+version[0].version+'. TLS: '+(encrypted?'enabled':'disabled')+'.');
    }finally{connection.release();}
  }finally{await pool.end();}
}
if(require.main===module)checkDatabase().catch(error=>{console.error('Database check failed: '+require('../utils/logger').errorCode(error));process.exitCode=1;});
module.exports={checkDatabase};
