require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

// A pool reuses connections instead of opening a new one per request
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Cloud MySQL requires TLS. rejectUnauthorized:false is acceptable for a demo only.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;