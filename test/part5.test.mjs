import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateTemplates } from '../app/practice-template-schema.mjs';

const require = createRequire(import.meta.url);
const migrations = new URL('../supabase/migrations/', import.meta.url);

test('all 24 practice templates validate', async () => {
  const templates = JSON.parse(await readFile(new URL('../app/practice-templates.json', import.meta.url), 'utf8'));
  assert.equal(templates.length, 24);
  assert.equal(validateTemplates(templates).size, 8);
});

test('database roles expose only the current student’s practice records', async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated');
  for (const file of (await readdir(migrations)).filter((file) => file.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  }
  const { rows: students } = await db.query(
    "insert into education_unite.students (username, password_hash) values ('first', 'fixture'), ('second', 'fixture') returning id",
  );
  for (const { id } of students) {
    const { rows: [practice] } = await db.query(
      'insert into education_unite.practice_sessions (student_id, duration_seconds) values ($1, 1) returning id',
      [id],
    );
    await db.query(
      "insert into education_unite.practice_answers values ($1, 1, '{}', $2)",
      [practice.id, id],
    );
  }
  for (const { id } of students) {
    await db.transaction(async (tx) => {
      await tx.query('set local role education_unite_app');
      const sessions = 'select student_id from education_unite.practice_sessions';
      const answers = 'select answer from education_unite.practice_answers';
      assert.deepEqual((await tx.query(sessions)).rows, []);
      assert.deepEqual((await tx.query(answers)).rows, []);
      await tx.query("select set_config('education_unite.student_id', $1, true)", [id]);
      assert.deepEqual((await tx.query(sessions)).rows, [{ student_id: id }]);
      assert.deepEqual((await tx.query(answers)).rows, [{ answer: id }]);
    });
  }
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.transaction(async (tx) => {
      await tx.query('set local role ' + role);
      await tx.query('select * from education_unite.students');
    }), { code: '42501' });
  }
});

async function startPreview(t, password) {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  const origin = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [
    require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    env: {
      ...process.env,
      DATABASE_URL: '',
      EDUCATION_UNITE_PREVIEW: '1',
      EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD: password,
    },
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk; });
  const closed = once(child, 'close');
  t.after(async () => { child.kill(); await closed; });
  for (let attempt = 0; attempt < 100 && child.exitCode === null; attempt++) {
    const response = await fetch(origin).catch(() => null);
    if (response?.ok) {
      await response.body.cancel();
      return origin;
    }
    await delay(100);
  }
  assert.fail('Production preview did not start. Run npm run build first.\n' + output);
}

// Submit the progressive-enhancement forms rendered by the real Next.js routes.
function session(origin) {
  const cookies = new Map();
  async function request(path, body) {
    const cookie = [...cookies.values()].filter(({ path: scope }) =>
      scope === '/' || path === scope || path.startsWith(scope + '/'),
    ).map(({ pair }) => pair).join('; ');
    const response = await fetch(origin + path, {
      redirect: 'manual',
      headers: { cookie, origin },
      method: body ? 'POST' : 'GET',
      body,
    });
    const setCookies = response.headers.getSetCookie();
    for (const value of setCookies) {
      const [pair] = value.split(';');
      const name = pair.split('=')[0];
      assert.match(value, /; HttpOnly/i);
      assert.match(value, /; SameSite=Lax/i);
      assert.match(name, /^eu_(join|student|admin)$/);
      if (/; Max-Age=0(?:;|$)/i.test(value)) cookies.delete(name);
      else cookies.set(name, { pair, path: value.match(/; Path=([^;]+)/i)?.[1] ?? '/' });
    }
    const location = response.headers.get('location');
    const html = await response.text();
    assert.ok(response.status < 400, `${response.status} from ${path}`);
    if (location && response.status >= 300) return request(location);
    return { html, headers: response.headers };
  }
  return {
    get: request,
    async submit(path, button, fields = {}) {
      const { html } = await request(path);
      const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
        .find(([, content]) => content.replaceAll('<!-- -->', '').includes('>' + button + '</button>'));
      assert.ok(form, 'Expected form button ' + button + ' on ' + path);
      const data = new FormData();
      for (const [tag] of form[1].matchAll(/<input\b[^>]*>/g)) {
        if (!tag.includes('type="hidden"')) continue;
        const name = tag.match(/\bname="([^"]+)"/)?.[1];
        const value = tag.match(/\bvalue="([^"]*)"/)?.[1];
        if (name) data.append(name, (value ?? '').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&'));
      }
      for (const [name, value] of Object.entries(fields)) data.append(name, value);
      return (await request(path, data)).html;
    },
  };
}

test('production preview supports owner, signup, practice, expiry and password reset', { timeout: 60_000 }, async (t) => {
  const password = randomBytes(18).toString('base64url');
  const origin = await startPreview(t, password);
  const admin = session(origin);
  const first = session(origin);
  const second = session(origin);
  const { headers } = await first.get('/');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.match(headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(headers.get('x-powered-by'), null);
  assert.match((await first.get('/admin/codes')).html, /Owner sign in/);
  const credentials = { email: 'owner@example.test', password, code: require('../app/preview-totp.cjs')() };
  const wrongCode = credentials.code === '000000' ? '111111' : '000000';
  assert.match(await admin.submit('/admin/login', 'Sign in', { ...credentials, code: wrongCode }), /Check your email/);
  credentials.code = require('../app/preview-totp.cjs')();
  assert.match(await admin.submit('/admin/login', 'Sign in', credentials), /Create a class code/);
  const codePage = await admin.submit('/admin/codes', 'Create class code');
  const code = codePage.match(/<code>(EU-[A-F0-9]+)<\/code>/)?.[1];
  assert.ok(code, 'Expected a generated class code');
  assert.match(await first.submit('/join', 'Continue', { code: 'EU-EXPIRED' }), /invalid or expired/);

  async function join(student, exclude) {
    const signup = await student.submit('/join', 'Continue', { code });
    const option = [...signup.matchAll(/<option>([a-z0-9]+)<\/option>/g)]
      .find(([, name]) => name !== exclude);
    assert.ok(option, 'Expected an available generated username');
    const [, username] = option;
    assert.match(await student.submit('/join', 'Create account', { username, password }), /Start maths practice/);
    return username;
  }
  const username = await join(first);
  await join(second, username);

  assert.match(await first.submit('/interests', 'Start practice', { interest: 'gaming' }), /Maths practice/);
  assert.match(await first.submit('/practice', 'Show hint 1 of 3'), /aria-label="Hints"/);
  for (let question = 1; question <= 6; question++) {
    assert.match(await first.submit('/practice', 'Check answer', { answer: '0' }), /Worked solution/);
    await first.submit('/practice', question < 6 ? 'Next question' : 'See my summary');
  }
  assert.match((await first.get('/practice/summary')).html, /Practice summary/);
  assert.match((await second.get('/practice/summary')).html, /Pick your interests/);

  const anotherDevice = session(origin);
  assert.match(await anotherDevice.submit('/login', 'Sign in', { username, password }), /Start maths practice/);
  const reset = await admin.submit('/admin/password-reset', 'Issue one-time password', { username });
  const temporary = reset.match(/<code>([\w-]{22})<\/code>/)?.[1];
  assert.ok(temporary, 'Expected a one-time password');
  assert.match((await first.get('/student')).html, /Student sign in/);
  assert.match((await anotherDevice.get('/student')).html, /Student sign in/);
  assert.match((await second.get('/student')).html, /Start maths practice/);
  const newPassword = randomBytes(18).toString('base64url');
  const resetFields = { username, temporary, password: newPassword };
  assert.match(await first.submit('/login/reset', 'Set new password', resetFields), /Password updated/);
  assert.match(await first.submit('/login/reset', 'Set new password', resetFields), /invalid or expired/);
  assert.match(await first.submit('/login', 'Sign in', { username, password: newPassword }), /Start maths practice/);
  const wrongPassword = { username, password };
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.match(await anotherDevice.submit('/login', 'Sign in', wrongPassword), /Username or password is incorrect/);
  }
  assert.match(await anotherDevice.submit('/login', 'Sign in', { username, password: newPassword }), /Too many attempts/);
});
