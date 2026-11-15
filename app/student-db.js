import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { digest } from './student-security';

async function createDatabase() {
  if (process.env.DATABASE_URL) {
    const ca = process.env.DATABASE_CA_CERT;
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ...(ca && { ssl: { ca, rejectUnauthorized: true } }),
    });
    return async (work) => {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await work(client);
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    };
  }

  if (process.env.EDUCATION_UNITE_PREVIEW !== '1') {
    throw new Error('Configure DATABASE_URL or explicitly start the local preview.');
  }
  const db = await PGlite.create();
  await db.exec('create role anon; create role authenticated;');
  for (const migration of [
    '20261112000000_phase_one_foundation.sql',
    '20261112000001_student_access.sql',
    '20261112000002_practice.sql',
    '20261112000003_owner_admin.sql',
    '20261114000004_admin_email_code.sql',
  ]) {
    await db.exec(await readFile(join(process.cwd(), 'supabase', 'migrations', migration), 'utf8'));
  }
  await db.query(
    "insert into education_unite.join_codes (code_digest, expires_at) values ($1, now() + interval '168 hours')",
    [digest('join-code', 'EU-PREVIEW')],
  );
  await db.query(
    "insert into education_unite.join_codes (code_digest, created_at, expires_at) values ($1, now() - interval '192 hours', now() - interval '24 hours')",
    [digest('join-code', 'EU-EXPIRED')],
  );
  return (work) => db.transaction(work);
}

async function transactionAs(role, work) {
  const getTransaction = await (globalThis.educationUniteDb ??= createDatabase().catch((error) => {
    delete globalThis.educationUniteDb;
    throw error;
  }));
  return getTransaction(async (db) => {
    await db.query(role);
    return work(db);
  });
}

export function studentTransaction(work) {
  return transactionAs('set local role education_unite_app', work);
}

export function adminTransaction(work) {
  return transactionAs('set local role education_unite_admin', work);
}
