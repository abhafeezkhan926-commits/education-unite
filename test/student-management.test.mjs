import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('student management roles protect credentials, expire resets and cascade deleted data', async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated');
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()) {
    if (file === '20261119000007_gender_options.sql') {
      await db.query("insert into education_unite.students (username, password_hash, gender) values ('legacygender', 'fixture', 'nonbinary')");
    }
    if (file === '20261119000008_remove_student_gender.sql') {
      assert.equal((await db.query("select gender from education_unite.students where username = 'legacygender'")).rows[0].gender, null);
    }
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  }
  assert.equal((await db.query("select count(*)::int as count from information_schema.columns where table_schema='education_unite' and table_name='students' and column_name='gender'")).rows[0].count, 0);
  await db.query("delete from education_unite.students where username = 'legacygender'");
  const admin = (work) => db.transaction(async (tx) => { await tx.query('set local role education_unite_admin'); return work(tx); });
  const student = (work) => db.transaction(async (tx) => { await tx.query('set local role education_unite_app'); return work(tx); });
  await admin((tx) => tx.query("insert into education_unite.students (username, password_hash) values ('managed', 'reset-required')"));
  await assert.rejects(admin((tx) => tx.query('select gender from education_unite.students')), /does not exist/);
  assert.deepEqual((await admin((tx) => tx.query('select username from education_unite.students'))).rows, [{ username: 'managed' }]);
  await assert.rejects(admin((tx) => tx.query('select password_hash from education_unite.students')), /permission denied/);
  await assert.rejects(student((tx) => tx.query("update education_unite.students set username = 'changed'")), /permission denied/);
  await assert.rejects(student((tx) => tx.query('delete from education_unite.students')), /permission denied/);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from education_unite.students'), /permission denied/);
  await db.exec('reset role');
  await admin((tx) => tx.query("select education_unite.issue_student_reset('managed', 'fixture-digest')"));
  assert.equal((await student((tx) => tx.query("select education_unite.valid_student_reset('managed', 'fixture-digest') as valid"))).rows[0].valid, true);
  await db.exec("update education_unite.student_resets set expires_at = now() - interval '1 second'");
  assert.equal((await student((tx) => tx.query("select education_unite.valid_student_reset('managed', 'fixture-digest') as valid"))).rows[0].valid, false);
  assert.equal((await student((tx) => tx.query("select education_unite.redeem_student_reset('managed', 'fixture-digest', 'hash', 'bucket') as changed"))).rows[0].changed, false);
  await admin((tx) => tx.query("select education_unite.issue_student_reset('managed', 'fresh-digest')"));
  assert.equal((await student((tx) => tx.query("select education_unite.redeem_student_reset('managed', 'fresh-digest', 'hash', 'bucket') as changed"))).rows[0].changed, true);
  assert.equal((await student((tx) => tx.query("select education_unite.redeem_student_reset('managed', 'fresh-digest', 'hash', 'bucket') as changed"))).rows[0].changed, false);
  const { rows: [account] } = await db.query("select id from education_unite.students where username = 'managed'");
  await db.query("insert into education_unite.student_sessions values ('fixture-session', $1, now() + interval '1 hour')", [account.id]);
  await db.query("insert into education_unite.active_practice values ('fixture-session', gen_random_uuid(), now() + interval '1 hour', '{}')");
  const { rows: [practice] } = await db.query('insert into education_unite.practice_sessions (student_id, duration_seconds) values ($1, 1) returning id', [account.id]);
  await db.query("insert into education_unite.practice_answers values ($1, 1, '{}', 'fixture')", [practice.id]);
  await admin((tx) => tx.query('delete from education_unite.student_sessions where student_id = $1', [account.id]));
  assert.equal((await db.query('select count(*)::int as count from education_unite.active_practice')).rows[0].count, 0);
  await admin((tx) => tx.query('delete from education_unite.students where id = $1', [account.id]));
  for (const table of ['students', 'student_sessions', 'student_resets', 'active_practice', 'practice_sessions', 'practice_answers']) {
    assert.equal((await db.query(`select count(*)::int as count from education_unite.${table}`)).rows[0].count, 0, table);
  }
});
