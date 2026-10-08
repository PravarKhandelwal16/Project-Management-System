const mysql = require('mysql2/promise');
require('./env');
const fs = require('node:fs');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE)||10,
  queueLimit: 100,
  timezone: 'Z',
  charset: 'utf8mb4',
  connectTimeout: 10000,
  ...(process.env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true,...(process.env.DB_SSL_CA?{ca:fs.readFileSync(process.env.DB_SSL_CA)}:{})}}:{}),
});

pool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));

/**
 * Verify database connectivity
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT role_key FROM role_permissions LIMIT 1');
      await connection.query('SELECT delivery_key FROM notification_logs LIMIT 1');
      await connection.query('SELECT id FROM reminders LIMIT 1');
      await connection.query('SELECT id FROM calendar_events LIMIT 1');
    } catch (error) { connection.release(); throw error; }
    connection.release();
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
};
