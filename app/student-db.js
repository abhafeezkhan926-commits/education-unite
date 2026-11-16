import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPostgresTransaction } from './postgres-transaction.mjs';
import { digest } from './student-security';
import { isLocalPreview } from './runtime-config.mjs';

async function createDatabase() {
  if (process.env.DATABASE_URL) {
    return createPostgresTransaction(process.env.DATABASE_URL, process.env.DATABASE_CA_CERT);
  }

  if (!isLocalPreview()) {
    throw new Error('Configure DATABASE_URL or explicitly start the local preview.');
  }
  const { PGlite } = await import('@electric-sql/pglite');
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
