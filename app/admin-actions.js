'use server';

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminAuthUnavailable, endAdminSession, startAdminSession, usesAdminEmailCode, verifiedOwnerEmail, withAdmin } from './admin-auth';
import { clearAdminEmailCode, consumeAdminEmailCode, pendingAdminEmailToken, sendAdminEmailCode } from './admin-email-code';
import { studentTransaction } from './student-db';
import { digest, loginNetworkAction, requestSource, withNetworkAttempts } from './student-security';

export async function adminSignIn(_previous, form) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const source = requestSource(await headers(), { requireTrusted: true });
  if (!source) return { error: 'Sign-in is temporarily unavailable. Try again in a few minutes.' };
  try {
    const result = await studentTransaction((db) => withNetworkAttempts(db, loginNetworkAction, source, async () => {
      const validEmail = email && email.length <= 254;
      const recipient = usesAdminEmailCode() && validEmail && await verifiedOwnerEmail(email, password);
      return recipient ? { recipient } : { error: 'Username or password is incorrect.' };
    }));
    if (result.error) return result;
    if (!await sendAdminEmailCode(result.recipient)) {
      return { error: 'Could not send the sign-in code. Try again later.' };
    }
  } catch (error) {
    if (error instanceof AdminAuthUnavailable) return { error: 'Sign-in is temporarily unavailable. Try again in a few minutes.' };
    throw error;
  }
  redirect('/login?step=email');
}

export async function verifyAdminEmailCode(_previous, form) {
  if (!usesAdminEmailCode()) redirect('/login');
  const token = await pendingAdminEmailToken();
  if (!token) redirect('/login');
  const code = String(form.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code) || !await consumeAdminEmailCode(token, code)) {
    return { error: 'Code is incorrect, expired or out of attempts. Check the code or start again.' };
  }
  await clearAdminEmailCode();
  await startAdminSession();
  redirect('/admin');
}

export async function restartAdminEmailLogin() {
  if (usesAdminEmailCode()) await clearAdminEmailCode();
  redirect('/login');
}

export async function adminSignOut() {
  await endAdminSession();
  redirect('/login');
}

export async function createClassCode() {
  return withAdmin(async (db) => {
    const value = 'EU-' + randomBytes(6).toString('hex').toUpperCase();
    const { rows: [code] } = await db.query(
      `insert into education_unite.join_codes (code_digest, expires_at)
       values ($1, now() + interval '168 hours') returning expires_at`,
      [digest('join-code', value)],
    );
    return { value, expiresAt: new Date(code.expires_at).toISOString() };
  });
}

export async function issueStudentReset(_previous, form) {
  const username = String(form.get('username') ?? '').trim().toLowerCase();
  const result = await withAdmin(async (db) => {
    if (!/^[a-z0-9]{1,64}$/.test(username)) return { error: 'Enter a student username.' };
    const value = randomBytes(16).toString('base64url');
    const { rows: [{ deadline }] } = await db.query(
      'select education_unite.issue_student_reset($1, $2) as deadline',
      [username, digest('student-reset', value)],
    );
    if (!deadline) return { error: 'No student with that username' };
    return { value, expiresAt: new Date(deadline).toISOString() };
  });
  return result;
}
