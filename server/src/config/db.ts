import 'dotenv/config';
import mysql from 'mysql2';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lcc_merchandise',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL Database (lcc_merchandise)');
    connection.release();
  }
});

export default pool.promise();