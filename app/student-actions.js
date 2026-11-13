'use server';

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { studentTransaction } from './student-db';
import {
  consumeAttempt, cookieOptions, digest, hashPassword, joinAge, joinName, makeJoinTicket,
  readJoinTicket, requestSource, sessionAge, sessionDigest, sessionName, usernameOptions, verifyPassword,
} from './student-security';

const codeQuery = 'select id from education_unite.join_codes where code_digest = $1 and expires_at > now()';
const slowDown = 'Too many attempts. Try again in 15 minutes.';

async function allowJoin() {
  const source = requestSource(await headers());
  return studentTransaction((db) => consumeAttempt(db, 'student_join', source, 40));
}

async function issueSession(db, studentId, token) {
  await db.query('delete from education_unite.student_sessions where expires_at <= now()');
  await db.query(
    "insert into education_unite.student_sessions (student_id, token_digest, expires_at) values ($1, $2, now() + interval '168 hours')",
    [studentId, sessionDigest(token)],
  );
}

async function openStudentPage(token) {
  const jar = await cookies();
  const oldToken = jar.get(sessionName)?.value;
  if (oldToken) await revokeSession(oldToken);
  jar.set(sessionName, token, cookieOptions(sessionAge));
  jar.set(joinName, '', cookieOptions(0));
  redirect('/student');
}

export async function checkJoinCode(_previous, form) {
  if (!await allowJoin()) return { error: slowDown };
  const code = String(form.get('code') ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,64}$/.test(code)) return { error: 'Enter a valid class code.' };
  const codeDigest = digest('join-code', code);
  const { rows } = await studentTransaction((db) => db.query(codeQuery, [codeDigest]));
  if (!rows.length) return { error: 'That class code is invalid or expired.' };
  (await cookies()).set(joinName, makeJoinTicket(codeDigest), cookieOptions(joinAge));
  redirect('/join');
}

export async function restartJoin() {
  (await cookies()).set(joinName, '', cookieOptions(0));
  redirect('/join');
}

export async function createStudent(_previous, form) {
  if (!await allowJoin()) return { error: slowDown };
  const ticket = readJoinTicket((await cookies()).get(joinName)?.value);
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  if (!ticket) return { error: 'Your join request expired. Start again with your class code.' };
  if (!usernameOptions(ticket.nonce).includes(username)) return { error: 'Choose one of the suggested usernames.' };
  if (password.length < 12 || password.length > 128) return { error: 'Choose a password with 12 to 128 characters.' };
  const passwordHash = await hashPassword(password);
  const token = randomBytes(32).toString('base64url');
  const outcome = await studentTransaction(async (db) => {
    const { rows } = await db.query(
      `insert into education_unite.students (username, password_hash)
       select $2, $3 where exists (${codeQuery})
       on conflict (username) do nothing returning id`,
      [ticket.codeDigest, username, passwordHash],
    );
    if (!rows.length) {
      const code = await db.query(codeQuery, [ticket.codeDigest]);
      return code.rows.length ? 'That username was taken. Choose another or start again.' : 'That class code has expired.';
    }
    await issueSession(db, rows[0].id, token);
    return null;
  });
  if (outcome) return { error: outcome };
  await openStudentPage(token);
}

export async function signIn(_previous, form) {
  const username = String(form.get('username') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const source = requestSource(await headers());
  if (!await studentTransaction((db) => consumeAttempt(db, 'student_login', 'source:' + source, 100))) {
    return { error: slowDown };
  }
  const invalid = { error: 'Username or password is incorrect.' };
  if (!/^[a-z0-9]{1,64}$/.test(username) || password.length < 1 || password.length > 128) return invalid;
  const bucket = 'account:' + username;
  const result = await studentTransaction(async (db) => {
    await db.query('select education_unite.lock_student($1)', [username]);
    if (!await consumeAttempt(db, 'student_login', bucket, 5)) return { locked: true };
    const { rows } = await db.query('select id, password_hash from education_unite.students where username = $1', [username]);
    const student = rows[0];
    if (!await verifyPassword(password, student?.password_hash)) return {};
    const token = randomBytes(32).toString('base64url');
    await issueSession(db, student.id, token);
    await db.query('delete from education_unite.rate_limit_windows where action = $1 and subject_digest = $2',
      ['student_login', digest('student_login', bucket)]);
    return { token };
  });
  if (result.locked) return { error: slowDown };
  if (!result.token) return invalid;
  await openStudentPage(result.token);
}

async function revokeSession(token) {
  await studentTransaction((db) => db.query(
    'delete from education_unite.student_sessions where token_digest = $1', [sessionDigest(token)],
  ));
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(sessionName)?.value;
  if (token) await revokeSession(token);
  jar.set(sessionName, '', cookieOptions(0));
  redirect('/login');
}

export async function resetPassword(_previous, form) {
  const username = String(form.get('username') ?? '').trim().toLowerCase();
  const temporary = String(form.get('temporary') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const source = requestSource(await headers());
  const allowed = await studentTransaction((db) => consumeAttempt(db, 'student_reset', source, 40));
  if (!allowed) return { error: slowDown };
  await studentTransaction((db) => db.query('select education_unite.clear_expired_resets()'));
  const invalid = { error: 'The username or one-time password is invalid or expired.' };
  if (!/^[a-z0-9]{1,64}$/.test(username) || !/^[\w-]{22}$/.test(temporary)) return invalid;
  if (password.length < 12 || password.length > 128 || password === temporary) {
    return { error: 'Choose a different password with 12 to 128 characters.' };
  }
  const passwordHash = await hashPassword(password);
  const { rows: [{ changed }] } = await studentTransaction((db) => db.query(
    'select education_unite.redeem_student_reset($1, $2, $3, $4) as changed',
    [username, digest('student-reset', temporary), passwordHash, digest('student_login', 'account:' + username)],
  ));
  if (!changed) return invalid;
  redirect('/login?reset=complete');
}
