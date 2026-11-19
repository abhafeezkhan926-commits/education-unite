'use server';

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { studentTransaction } from './student-db';
import { readGender, validTemporaryPassword } from './student-profile.mjs';
import {
  consumeAttempt, cookieOptions, digest, hashPassword, joinAge, joinName, makeJoinTicket,
  readJoinTicket, requestSource, sessionAge, sessionDigest, sessionName, usernameOptions, verifyPassword,
  loginNetworkAction, makeStudentDevice, readStudentDevice, studentDeviceAge, studentDeviceName, withNetworkAttempts,
} from './student-security';

const codeQuery = 'select id from education_unite.join_codes where code_digest = $1 and expires_at > now()';
const slowDown = 'Too many attempts. Try again in 15 minutes.';
const unavailable = 'This service is temporarily unavailable. Try again in a few minutes.';
const accountAttemptsPerTicket = 3;

async function issueSession(db, studentId, token) {
  await db.query('delete from education_unite.student_sessions where expires_at <= now()');
  await db.query(
    "insert into education_unite.student_sessions (student_id, token_digest, expires_at) values ($1, $2, now() + $3 * interval '1 second')",
    [studentId, sessionDigest(token), sessionAge],
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
  const source = requestSource(await headers(), { requireTrusted: true });
  if (!source) return { error: unavailable };
  const code = String(form.get('code') ?? '').trim().toUpperCase();
  const codeDigest = /^[A-Z0-9-]{4,64}$/.test(code) ? digest('join-code', code) : null;
  const result = await studentTransaction((db) => withNetworkAttempts(db, 'student_join', source, async () => {
    if (codeDigest && (await db.query(codeQuery, [codeDigest])).rows.length) return {};
    return { error: codeDigest ? 'That class code is invalid or expired.' : 'Enter a valid class code.' };
  }));
  if (result.error) return result;
  (await cookies()).set(joinName, makeJoinTicket(codeDigest), cookieOptions(joinAge));
  redirect('/join');
}

export async function restartJoin() {
  (await cookies()).set(joinName, '', cookieOptions(0));
  redirect('/join');
}

export async function createStudent(_previous, form) {
  const ticket = readJoinTicket((await cookies()).get(joinName)?.value);
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const gender = readGender(form.get('gender'));
  if (gender === undefined) return { error: 'Choose a valid gender option.' };
  if (!ticket) return { error: 'Your join request expired. Start again with your class code.' };
  if (!usernameOptions(ticket.nonce).includes(username)) return { error: 'Choose one of the suggested usernames.' };
  if (password.length < 12 || password.length > 128) return { error: 'Choose a password with 12 to 128 characters.' };
  const allowed = await studentTransaction((db) =>
    consumeAttempt(db, 'student_join', 'ticket:' + ticket.nonce, accountAttemptsPerTicket),
  );
  if (!allowed) return { error: 'Start again with your class code to get new usernames.' };
  const passwordHash = await hashPassword(password);
  const token = randomBytes(32).toString('base64url');
  const outcome = await studentTransaction(async (db) => {
    const { rows } = await db.query(
      `insert into education_unite.students (username, password_hash, gender)
       select $2, $3, $4 where exists (${codeQuery})
       on conflict (username) do nothing returning id`,
      [ticket.codeDigest, username, passwordHash, gender],
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
  const source = requestSource(await headers(), { requireTrusted: true });
  if (!source) return { error: unavailable };
  const invalid = { error: 'Username or password is incorrect.' };
  const jar = await cookies();
  const deviceCookie = jar.get(studentDeviceName)?.value;
  const result = await studentTransaction((db) => withNetworkAttempts(db, loginNetworkAction, source, async () => {
    if (!/^[a-z0-9]{1,64}$/.test(username) || password.length < 1 || password.length > 128) return invalid;
    await db.query('select education_unite.lock_student($1)', [username]);
    const { rows } = await db.query('select id, password_hash from education_unite.students where username = $1', [username]);
    const student = rows[0];
    const device = readStudentDevice(deviceCookie, username, student?.password_hash);
    const bucket = device ? `device:${username}:${device}` : 'account:' + username;
    if (!await consumeAttempt(db, 'student_login', bucket, 5)) return { error: slowDown };
    if (student?.password_hash === 'reset-required' && validTemporaryPassword(password)) {
      const { rows: [{ valid }] } = await db.query(
        'select education_unite.valid_student_reset($1, $2) as valid',
        [username, digest('student-reset', password)],
      );
      if (valid) return { setup: { username, temporary: password } };
    }
    if (!await verifyPassword(password, student?.password_hash)) return invalid;
    const token = randomBytes(32).toString('base64url');
    await issueSession(db, student.id, token);
    await db.query('delete from education_unite.rate_limit_windows where action = $1 and subject_digest = $2',
      ['student_login', digest('student_login', bucket)]);
    const remembered = form.get('rememberDevice') === 'on'
      ? makeStudentDevice(username, student.password_hash, device ?? undefined) : null;
    return { token, remembered, device };
  }));
  if (result.error) return result;
  if (result.setup) {
    const oldToken = jar.get(sessionName)?.value;
    if (oldToken) await revokeSession(oldToken);
    jar.set(sessionName, '', cookieOptions(0));
    jar.set('eu_password_setup', JSON.stringify(result.setup), { ...cookieOptions(300), path: '/login' });
    redirect('/login/reset');
  }
  if (result.remembered) jar.set(studentDeviceName, result.remembered, cookieOptions(studentDeviceAge));
  else if (result.device) jar.set(studentDeviceName, '', cookieOptions(0));
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
  const temporary = String(form.get('temporary') ?? '');
  const password = String(form.get('password') ?? '');
  const source = requestSource(await headers());
  const allowed = await studentTransaction((db) => consumeAttempt(db, 'student_reset', source, 40));
  if (!allowed) return { error: slowDown };
  await studentTransaction((db) => db.query('select education_unite.clear_expired_resets()'));
  const invalid = { error: 'The username or one-time password is invalid or expired.' };
  if (!/^[a-z0-9]{1,64}$/.test(username) || !validTemporaryPassword(temporary)) return invalid;
  if (password.length < 12 || password.length > 128 || password === temporary) {
    return { error: 'Choose a different password with 12 to 128 characters.' };
  }
  const passwordHash = await hashPassword(password);
  const { rows: [{ changed }] } = await studentTransaction((db) => db.query(
    'select education_unite.redeem_student_reset($1, $2, $3, $4) as changed',
    [username, digest('student-reset', temporary), passwordHash, digest('student_login', 'account:' + username)],
  ));
  if (!changed) return invalid;
  (await cookies()).set('eu_password_setup', '', { ...cookieOptions(0), path: '/login' });
  redirect('/login?reset=complete');
}
