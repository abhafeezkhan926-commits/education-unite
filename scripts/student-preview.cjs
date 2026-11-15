const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync } = require('node:fs');
const previewTotp = require('../app/preview-totp.cjs');

if (process.argv[2] === '--admin-code') {
  console.log(previewTotp());
} else {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const password = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');
  if (!process.env.DATABASE_URL && !process.env.EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD) {
    const email = process.env.EDUCATION_UNITE_PREVIEW_ADMIN_EMAIL?.trim() || 'owner@example.test';
    console.log('Local admin password for ' + email + ': ' + password);
  }
  const child = spawn(process.execPath, [
    require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', ...process.argv.slice(2),
  ], {
    stdio: 'inherit',
    env: { ...process.env, EDUCATION_UNITE_PREVIEW: '1', EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD: password },
  });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
