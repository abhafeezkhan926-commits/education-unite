import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { adminTransaction } from './student-db';
import { cookieOptions, digest, sessionDigest } from './student-security';

const cookieName = 'eu_admin_email';
const maxAge = 300;

export function usesLocalAdminTestCode() {
  return process.env.EDUCATION_UNITE_PREVIEW === '1' &&
    !process.env.VERCEL && !process.env.DATABASE_URL &&
    process.env.EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE === '1';
}

function codeDigest(token, code) {
  return digest('admin-email-code', [process.env.EDUCATION_UNITE_OWNER_ID, token, code].join(':'));
}

export async function pendingAdminEmailToken() {
  const token = (await cookies()).get(cookieName)?.value;
  return token && /^[\w-]{43}$/.test(token) ? token : null;
}

export async function clearAdminEmailCode() {
  const token = await pendingAdminEmailToken();
  if (token) {
    await adminTransaction((db) => db.query(
      'delete from education_unite.admin_email_challenges where token_digest = $1', [sessionDigest(token)],
    ));
  }
  (await cookies()).set(cookieName, '', { ...cookieOptions(0), path: '/admin' });
}

export async function sendAdminEmailCode(email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EDUCATION_UNITE_ADMIN_EMAIL_FROM;
  const localTest = usesLocalAdminTestCode();
  if (!localTest && (!apiKey || !from)) return false;
  await clearAdminEmailCode();

  const token = randomBytes(32).toString('base64url');
  const code = localTest ? '123456' : String(randomInt(1_000_000)).padStart(6, '0');
  const tokenDigest = sessionDigest(token);
  await adminTransaction(async (db) => {
    await db.query('delete from education_unite.admin_email_challenges where expires_at <= now()');
    await db.query(
      `insert into education_unite.admin_email_challenges (token_digest, code_digest, expires_at)
       values ($1, $2, now() + interval '5 minutes')`,
      [tokenDigest, codeDigest(token, code)],
    );
  });

  const response = localTest ? null : await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'EducationUnite admin sign-in code',
      text: `Your admin sign-in code is ${code}. It expires in 5 minutes. If you did not request this, ignore this email.`,
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!localTest && !response?.ok) {
    await adminTransaction((db) => db.query(
      'delete from education_unite.admin_email_challenges where token_digest = $1', [tokenDigest],
    ));
    return false;
  }

  (await cookies()).set(cookieName, token, { ...cookieOptions(maxAge), path: '/admin' });
  return true;
}

export async function consumeAdminEmailCode(token, code) {
  const tokenDigest = sessionDigest(token);
  return adminTransaction(async (db) => {
    const { rows: [challenge] } = await db.query(
      `update education_unite.admin_email_challenges
       set attempts_remaining = attempts_remaining - 1
       where token_digest = $1 and expires_at > now() and attempts_remaining > 0
       returning code_digest`,
      [tokenDigest],
    );
    if (!challenge || !timingSafeEqual(Buffer.from(challenge.code_digest, 'hex'), Buffer.from(codeDigest(token, code), 'hex'))) {
      return false;
    }
    await db.query('delete from education_unite.admin_email_challenges where token_digest = $1', [tokenDigest]);
    return true;
  });
}
