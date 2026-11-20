import { argon2, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { promisify } from 'node:util';
import { isLocalPreview } from './runtime-config.mjs';

const derive = promisify(argon2);
const preview = isLocalPreview();
const previewKey = globalThis.educationUnitePreviewKey ??= randomBytes(32);
const adjectives = ['Bright', 'Calm', 'Clever', 'Kind', 'Lucky', 'Quick', 'Swift', 'Wise'];
const animals = ['Badger', 'Falcon', 'Finch', 'Fox', 'Otter', 'Owl', 'Panda', 'Robin'];
export const sessionName = 'eu_student';
export const joinName = 'eu_join';
export const studentDeviceName = 'eu_student_device';
export const studentDeviceAge = 30 * 24 * 60 * 60;
export const sessionAge = 7 * 24 * 60 * 60;
export const joinAge = 10 * 60;
// Use one existing storage action for both branches of the shared login form.
export const loginNetworkAction = 'admin_login';

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

export function makeStudentDevice(username, passwordHash, id = randomBytes(16).toString('hex')) {
  const value = `${id}.${Date.now() + studentDeviceAge * 1000}`;
  return `${value}.${digest('student-device', `${username}:${passwordHash}:${value}`)}`;
}

export function readStudentDevice(cookie, username, passwordHash) {
  if (!passwordHash || !cookie || !/^[a-f0-9]{32}\.\d{13}\.[a-f0-9]{64}$/.test(cookie)) return null;
  const [id, expiry, signature] = cookie.split('.');
  if (Number(expiry) <= Date.now()) return null;
  const expected = digest('student-device', `${username}:${passwordHash}:${id}.${expiry}`);
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) ? id : null;
}

export function requestSource(headers, { requireTrusted = false } = {}) {
  // Vercel sets this header at its edge. Other deployments share a fallback bucket.
  const address = process.env.VERCEL ? headers.get('x-vercel-forwarded-for')?.trim() : '';
  const version = isIP(address ?? '');
  if (version === 4) return address;
  const ipv6 = version === 6 && URL.parse('http://[' + address + ']');
  if (ipv6) return ipv6.hostname;
  if (requireTrusted && (process.env.VERCEL || !preview)) return null;
  return 'local-or-unavailable';
}

export async function isRateLimited(db, action, bucket, limit) {
  const { rows: [row] } = await db.query(
    `select attempt_count from education_unite.rate_limit_windows
     where action = $1 and subject_digest = $2 and expires_at > now()`,
    [action, digest(action, bucket)],
  );
  return (row?.attempt_count ?? 0) >= limit;
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

export async function withNetworkAttempts(db, action, source, attempt) {
  const bucket = 'ip-failures:' + source;
  const limit = 10;
  // Serialize the check and outcome for this IP, including concurrent requests.
  await db.query('select pg_advisory_xact_lock(hashtextextended($1, 452018))', [digest(action, bucket)]);
  if (await isRateLimited(db, action, bucket, limit)) {
    return { error: 'Too many attempts. Try again in 15 minutes.' };
  }
  const result = await attempt();
  if (result.error) await consumeAttempt(db, action, bucket, limit);
  return result;
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

export function isGeneratedUsername(username) {
  const pattern = '^(?:' + adjectives.join('|') + ')(?:' + animals.join('|') + ')[a-f0-9]{8}$';
  return typeof username === 'string' && new RegExp(pattern, 'i').test(username);
}

export function makeAdminUsernameTicket(scope, now = Date.now()) {
  const value = randomBytes(16).toString('hex') + '.' + (now + joinAge * 1000);
  return value + '.' + digest('admin-usernames', scope + ':' + value);
}

export function readAdminUsernameTicket(ticket, scope, now = Date.now()) {
  if (!ticket || !/^[a-f0-9]{32}\.\d{13}\.[a-f0-9]{64}$/.test(ticket)) return null;
  const [nonce, expiry, signature] = ticket.split('.');
  const expected = digest('admin-usernames', scope + ':' + nonce + '.' + expiry);
  if (Number(expiry) <= now || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return { nonce };
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
