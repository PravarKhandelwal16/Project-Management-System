const mysql = require('mysql2/promise');
const path = require('path');

// Ensure environment variables are loaded regardless of execution directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_management',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Verify database connectivity
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'project_management'})`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Error] Could not connect to MySQL: ${error.message}`);
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
};
