export function isLocalPreview(env = process.env) {
  return !env.VERCEL && env.EDUCATION_UNITE_PREVIEW === '1' && !env.DATABASE_URL;
}

export function validAdminPassword(password) {
  return password.length >= 12 && password.length <= 128;
}

export function validateHostedConfig(env = process.env) {
  if (!env.VERCEL) return;
  const disabled = ['EDUCATION_UNITE_PREVIEW', 'EDUCATION_UNITE_TEST_PASSWORD_ONLY', 'EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE'];
  if (disabled.some((name) => env[name] === '1')) throw new Error('Local test settings are invalid on Vercel.');
  const required = ['DATABASE_URL', 'EDUCATION_UNITE_SECRET', 'EDUCATION_UNITE_SUPABASE_URL',
    'EDUCATION_UNITE_SUPABASE_KEY', 'EDUCATION_UNITE_OWNER_ID'];
  if (env.EDUCATION_UNITE_ADMIN_EMAIL_CODE === '1') required.push('RESEND_API_KEY', 'EDUCATION_UNITE_ADMIN_EMAIL_FROM');
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing hosted configuration: ${missing.join(', ')}`);
  if (env.EDUCATION_UNITE_SECRET.length < 32) throw new Error('EDUCATION_UNITE_SECRET must be at least 32 characters.');
}
