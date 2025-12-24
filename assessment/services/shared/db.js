const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: config.DB_CONNECTION_LIMIT,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
