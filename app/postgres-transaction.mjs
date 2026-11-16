import pg from 'pg';

export function createPostgresTransaction(connectionString, ca, Pool = pg.Pool) {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5_000,
    // Bound client-side waiting even when the server cannot reply.
    query_timeout: 12_000,
    ...(ca && { ssl: { ca, rejectUnauthorized: true } }),
  });
  pool.on('error', () => console.error('PostgreSQL idle connection failed.'));

  return async (work) => {
    const client = await pool.connect();
    let discard = true;
    try {
      await client.query('begin');
      let result;
      try {
        // Apply the server timeout within the transaction, including behind a transaction pooler.
        await client.query("set local statement_timeout = '8s'");
        result = await work(client);
      } catch (error) {
        try {
          await client.query('rollback');
          discard = false;
        } catch {
          console.error('PostgreSQL rollback failed.');
        }
        throw error;
      }
      await client.query('commit');
      discard = false;
      return result;
    } finally {
      client.release(discard);
    }
  };
}
