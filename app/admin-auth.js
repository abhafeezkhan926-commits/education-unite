import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminTransaction } from './student-db';
import { cookieOptions, sessionDigest } from './student-security';

const cookieName = 'eu_admin';
const sessionAge = 15 * 60;
function usesHostedAuth() {
  return process.env.EDUCATION_UNITE_PREVIEW !== '1' || Boolean(process.env.DATABASE_URL);
}

export function requiresAdminCode() {
  return usesHostedAuth() && process.env.EDUCATION_UNITE_TEST_PASSWORD_ONLY !== '1';
}
const verifiedTotp = (factor) => factor.factor_type === 'totp' && factor.status === 'verified';

async function authRequest(path, { token, body } = {}) {
  const url = process.env.EDUCATION_UNITE_SUPABASE_URL;
  const key = process.env.EDUCATION_UNITE_SUPABASE_KEY;
  if (!url || !key) return null;
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
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function verifyPreviewOwner(email, password) {
  const expected = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD;
  return email === 'owner@example.test' && Boolean(expected) && expected.length === password.length &&
    timingSafeEqual(Buffer.from(expected, 'utf16le'), Buffer.from(password, 'utf16le'));
}

export async function verifyOwner(email, password, code) {
  if (!usesHostedAuth()) return verifyPreviewOwner(email, password);

  const requireCode = requiresAdminCode();
  if (requireCode && !/^\d{6}$/.test(code)) return false;
  const owner = process.env.EDUCATION_UNITE_OWNER_ID;
  if (!owner) return false;
  const login = await authRequest('token?grant_type=password', { body: { email, password } });
  if (!login?.access_token || login.user?.id !== owner) return false;
  const account = await authRequest('user', { token: login.access_token });
  if (account?.id !== owner) return false;
  if (!requireCode) return true;
  const factor = account.factors?.find(verifiedTotp);
  if (!factor) return false;
  const path = 'factors/' + encodeURIComponent(factor.id);
  const challenge = await authRequest(path + '/challenge', { token: login.access_token, body: {} });
  if (!challenge?.id) return false;
  const verified = await authRequest(path + '/verify', {
    token: login.access_token, body: { challenge_id: challenge.id, code },
  });
  if (!verified?.access_token) return false;
  const user = await authRequest('user', { token: verified.access_token });
  if (user?.id !== owner) return false;
  try {
    const claims = JSON.parse(Buffer.from(verified.access_token.split('.')[1], 'base64url'));
    return claims.sub === owner && claims.aal === 'aal2' && claims.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function startAdminSession() {
  const token = randomBytes(32).toString('base64url');
  const jar = await cookies();
  const oldToken = jar.get(cookieName)?.value;
  await adminTransaction(async (db) => {
    await db.query('delete from education_unite.admin_sessions where expires_at <= now() or token_digest = $1',
      [oldToken ? sessionDigest(oldToken) : null]);
    await db.query(
      "insert into education_unite.admin_sessions values ($1, now() + interval '15 minutes')",
      [sessionDigest(token)],
    );
  });
  jar.set(cookieName, token, { ...cookieOptions(sessionAge), path: '/admin' });
}

export async function withAdmin(work) {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[\w-]{43}$/.test(token)) redirect('/admin/login');
  return adminTransaction(async (db) => {
    const result = await db.query(
      'select 1 from education_unite.admin_sessions where token_digest = $1 and expires_at > now()',
      [sessionDigest(token)],
    );
    if (!result.rows.length) redirect('/admin/login');
    return work(db);
  });
}

export async function endAdminSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await adminTransaction((db) => db.query(
    'delete from education_unite.admin_sessions where token_digest = $1', [sessionDigest(token)],
  ));
  jar.set(cookieName, '', { ...cookieOptions(0), path: '/admin' });
}
