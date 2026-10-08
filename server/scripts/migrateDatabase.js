const fs=require('node:fs'),path=require('node:path');
const {pool}=require('../config/db');
async function migrateDatabase(){
  if (!process.env.DB_NAME) throw new Error('DB_NAME is required for migrations; no default database will be used');
  if (process.env.NODE_ENV === 'production') require('../config/env').validateEnvironment();
  const connection=await pool.getConnection();
  try{
    // Use the explicitly configured database; never execute schema.sql's legacy USE.
    const schema=fs.readFileSync(path.resolve(__dirname,'../../database/schema.sql'),'utf8').replace(/CREATE DATABASE IF NOT EXISTS project_management[\s\S]*?;/,'').replace('USE project_management;','');
    for(const sql of schema.split(';').map(statement=>statement.trim()).filter(Boolean))await connection.query(sql);
    const notifications=fs.readFileSync(path.resolve(__dirname,'../../database/migration_stage6.sql'),'utf8');
    for(const sql of notifications.split(';').map(statement=>statement.trim()).filter(statement=>statement.replace(/--[^\n]*/g,'').trim()))await connection.query(sql);
  }finally{connection.release();}
  await require('./migrateAccess').migrate();await require('./migratePlanning').migratePlanning();await require('./migrateRelease').migrateRelease();await require('./migratePush').migratePush();
}
if(require.main===module)migrateDatabase().catch(error=>{console.error(require('../utils/logger').errorCode(error));process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrateDatabase};
