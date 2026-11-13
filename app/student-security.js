import { argon2, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { promisify } from 'node:util';

const derive = promisify(argon2);
const preview = process.env.EDUCATION_UNITE_PREVIEW === '1' && !process.env.DATABASE_URL;
const previewKey = globalThis.educationUnitePreviewKey ??= randomBytes(32);
const adjectives = ['Bright', 'Calm', 'Clever', 'Kind', 'Lucky', 'Quick', 'Swift', 'Wise'];
const animals = ['Badger', 'Falcon', 'Finch', 'Fox', 'Otter', 'Owl', 'Panda', 'Robin'];
export const sessionName = 'eu_student';
export const joinName = 'eu_join';
export const sessionAge = 7 * 24 * 60 * 60;
export const joinAge = 10 * 60;

export function digest(purpose, value) {
  const key = preview ? previewKey : process.env.EDUCATION_UNITE_SECRET;
  if (!key || key.length < 32) throw new Error('Configure a random EDUCATION_UNITE_SECRET.');
  return createHmac('sha256', key).update(purpose + '\0' + value).digest('hex');
}

export function sessionDigest(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function cookieOptions(maxAge) {
  return { httpOnly: true, sameSite: 'lax', secure: !preview, path: '/', maxAge };
}

export function requestSource(headers) {
  // Vercel sets this header at its edge. Other deployments share a fallback bucket.
  const address = process.env.VERCEL ? headers.get('x-vercel-forwarded-for')?.trim() : '';
  return isIP(address ?? '') ? address : 'local-or-unavailable';
}

export async function consumeAttempt(db, action, bucket, limit) {
  await db.query('delete from education_unite.rate_limit_windows where expires_at <= now()');
  const { rows: [row] } = await db.query(
    `insert into education_unite.rate_limit_windows as limits
       (action, subject_digest, attempt_count, expires_at)
     values ($1, $2, 1, now() + interval '15 minutes')
     on conflict (action, subject_digest) do update
       set attempt_count = case when limits.expires_at <= now() then 1
                                else least(limits.attempt_count, $3) + 1 end,
           expires_at = case when limits.expires_at <= now() then excluded.expires_at
                             else limits.expires_at end
     returning attempt_count`,
    [action, digest(action, bucket), limit],
  );
  return row.attempt_count <= limit;
}

export function makeJoinTicket(codeDigest) {
  const value = [codeDigest, randomBytes(16).toString('hex'), Date.now() + joinAge * 1000].join('.');
  return value + '.' + digest('join-ticket', value);
}

export function readJoinTicket(ticket) {
  if (!ticket || !/^[a-f0-9]{64}\.[a-f0-9]{32}\.\d{13}\.[a-f0-9]{64}$/.test(ticket)) return null;
  const [codeDigest, nonce, expiry, signature] = ticket.split('.');
  const expected = digest('join-ticket', [codeDigest, nonce, expiry].join('.'));
  if (Number(expiry) <= Date.now() || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return { codeDigest, nonce };
}

export function usernameOptions(nonce) {
  return [0, 1, 2].map((option) => {
    const bytes = Buffer.from(digest('username', nonce + ':' + option), 'hex');
    const suffix = bytes.subarray(2, 6).toString('hex');
    return (adjectives[bytes[0] % 8] + animals[bytes[1] % 8] + suffix).toLowerCase();
  });
}

async function passwordKey(password, salt) {
  return derive('argon2id', {
    message: password, nonce: salt, parallelism: 1, tagLength: 32, memory: 19456, passes: 2,
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await passwordKey(password, salt);
  return '$argon2id$v=19$m=19456,t=2,p=1$' + salt.toString('base64url') + '$' + key.toString('base64url');
}

export async function verifyPassword(password, encoded) {
  const match = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$([\w-]{22})\$([\w-]{43})$/.exec(encoded ?? '');
  const key = await passwordKey(password, match ? Buffer.from(match[1], 'base64url') : Buffer.alloc(16));
  return Boolean(match && timingSafeEqual(key, Buffer.from(match[2], 'base64url')));
}
