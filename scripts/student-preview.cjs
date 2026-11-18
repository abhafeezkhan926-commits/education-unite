const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync } = require('node:fs');
const { validAdminPassword } = require('../app/runtime-config.mjs');

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const password = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');
if (!validAdminPassword(password)) {
  console.error('Set EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD to 12–128 characters.');
  process.exit(1);
}
if (!process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD) {
  const email = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_EMAIL?.trim() || 'owner@example.test';
  console.log('Local admin password for ' + email + ': ' + password);
}
const child = spawn(process.execPath, [
  '--wasm-num-compilation-tasks=1', '--wasm-lazy-compilation', '--no-wasm-tier-up',
  require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', ...process.argv.slice(2),
], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: '', VERCEL: '', EDUCATION_UNITE_PREVIEW: '1',
    EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD: password,
    EDUCATION_UNITE_ADMIN_EMAIL_CODE: '1',
    EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE: '1' },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
