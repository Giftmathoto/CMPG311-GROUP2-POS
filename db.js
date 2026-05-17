const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Check your .env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(client => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Database connection failed!', err);
  });

module.exports = pool;