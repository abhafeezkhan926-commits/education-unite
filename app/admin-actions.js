'use server';

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { endAdminSession, requiresAdminCode, startAdminSession, verifyOwner, withAdmin } from './admin-auth';
import { studentTransaction } from './student-db';
import { consumeAttempt, digest, requestSource } from './student-security';

export async function adminSignIn(_previous, form) {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const code = String(form.get('code') ?? '').trim();
  const source = requestSource(await headers());
  if (!await studentTransaction((db) => consumeAttempt(db, 'admin_login', source, 10))) {
    return { error: 'Too many attempts. Try again in 15 minutes.' };
  }
  if (!email || email.length > 254 || !password || password.length > 128 ||
      !await verifyOwner(email, password, code)) {
    return { error: requiresAdminCode()
      ? 'Check your email, password and authenticator code.'
      : 'Check your email and password.' };
  }
  await startAdminSession();
  redirect('/admin');
}

export async function adminSignOut() {
  await endAdminSession();
  redirect('/admin/login');
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
    if (!deadline) return { error: 'Student username was not found.' };
    return { value, expiresAt: new Date(deadline).toISOString() };
  });
  return result;
}
