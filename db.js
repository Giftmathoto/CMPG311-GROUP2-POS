const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'pos_db',
  password: 'c0by5pank5',
  port: 5432,
});

module.exports = pool;