// A connection POOL keeps a few open connections to PostgreSQL and reuses them,
// instead of opening a new (slow) connection for every query.
import pg from 'pg';
import env from '../config/env.js';

const pool = new pg.Pool({ connectionString: env.databaseUrl });

// Run a callback inside a transaction: either ALL its queries succeed, or none do.
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
