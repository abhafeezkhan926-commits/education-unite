import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminTransaction } from './student-db';
import { cookieOptions, sessionDigest } from './student-security';
import { isLocalPreview } from './runtime-config.mjs';

const cookieName = 'eu_admin_session';
const legacyCookieName = 'eu_admin';
const sessionAge = 15 * 60;
function usesHostedAuth() {
  return !isLocalPreview();
}

export function usesAdminEmailCode() {
  return process.env.EDUCATION_UNITE_ADMIN_EMAIL_CODE === '1' &&
    (!isLocalPreview() || process.env.EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE === '1');
}

export class AdminAuthUnavailable extends Error {}

async function authRequest(path, { token, body } = {}) {
  const url = process.env.EDUCATION_UNITE_SUPABASE_URL;
  const key = process.env.EDUCATION_UNITE_SUPABASE_KEY;
  if (!url || !key) throw new AdminAuthUnavailable();
  try {
    const response = await fetch(new URL('/auth/v1/' + path, url), {
      method: body ? 'POST' : 'GET',
      headers: {
        apikey: key,
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 500 || response.status === 429) throw new AdminAuthUnavailable();
    return response.ok ? await response.json() : null;
  } catch {
    console.error(JSON.stringify({ event: 'owner_auth_unavailable' }));
    throw new AdminAuthUnavailable();
  }
}

function verifyPreviewOwner(email, password) {
  const expected = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD;
  return previewAdminEmail().toLowerCase() === email.toLowerCase() && Boolean(expected) && expected.length === password.length &&
    timingSafeEqual(Buffer.from(expected, 'utf16le'), Buffer.from(password, 'utf16le'));
}

function previewAdminEmail() {
  return process.env.EDUCATION_UNITE_PREVIEW_ADMIN_EMAIL?.trim() || 'owner@example.test';
}

async function authenticateOwner(email, password) {
  const ownerId = process.env.EDUCATION_UNITE_OWNER_ID;
  if (!ownerId) return null;
  const login = await authRequest('token?grant_type=password', { body: { email, password } });
  if (!login?.access_token || login.user?.id !== ownerId) return null;
  const account = await authRequest('user', { token: login.access_token });
  return account?.id === login.user.id ? { account, token: login.access_token } : null;
}

export async function verifiedOwnerEmail(email, password) {
  if (!usesHostedAuth()) {
    return verifyPreviewOwner(email, password) ? previewAdminEmail() : null;
  }
  const identity = await authenticateOwner(email, password);
  return identity?.account.email_confirmed_at ? identity.account.email : null;
}

export async function startAdminSession() {
  const token = randomBytes(32).toString('base64url');
  const jar = await cookies();
  const oldToken = jar.get(cookieName)?.value;
  await adminTransaction(async (db) => {
    await db.query('delete from education_unite.admin_sessions where expires_at <= now() or token_digest = $1',
      [oldToken ? sessionDigest(oldToken) : null]);
    await db.query(
      "insert into education_unite.admin_sessions (token_digest, expires_at) values ($1, now() + $2 * interval '1 second')",
      [sessionDigest(token), sessionAge],
    );
  });
  jar.set(legacyCookieName, '', { ...cookieOptions(0), path: '/admin' });
  jar.set(cookieName, token, cookieOptions(sessionAge));
}

export async function withAdmin(work) {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value ?? jar.get(legacyCookieName)?.value;
  if (!token || !/^[\w-]{43}$/.test(token)) redirect('/login');
  return adminTransaction(async (db) => {
    const result = await db.query(
      'select 1 from education_unite.admin_sessions where token_digest = $1 and expires_at > now()',
      [sessionDigest(token)],
    );
    if (!result.rows.length) redirect('/login');
    return work(db);
  });
}

export async function endAdminSession() {
  const jar = await cookies();
  const tokens = [jar.get(cookieName)?.value, jar.get(legacyCookieName)?.value].filter(Boolean);
  if (tokens.length) await adminTransaction((db) => db.query(
    'delete from education_unite.admin_sessions where token_digest = any($1::text[])', [tokens.map(sessionDigest)],
  ));
  jar.set(legacyCookieName, '', { ...cookieOptions(0), path: '/admin' });
  jar.set(cookieName, '', cookieOptions(0));
}
