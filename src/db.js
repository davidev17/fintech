const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('[DB] New connection established');
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn('[DB] Slow query detected:', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[DB] Query error:', { text, error: err.message });
    throw err;
  }
};

module.exports = { pool, query };