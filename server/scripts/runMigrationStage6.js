const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'project_master',
    multipleStatements: true
  });

  try {
    console.log('Running Stage 6 migration...');
    const sqlPath = path.join(__dirname, '../../database/migration_stage6.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await connection.query(sql);
    console.log('Stage 6 migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
