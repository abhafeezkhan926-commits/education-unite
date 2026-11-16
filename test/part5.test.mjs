import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { PGlite } from '@electric-sql/pglite';
import { compileWorkbookTemplate, workbookInterests } from '../app/workbook-templates.mjs';
import { matchesAnswer, parsePracticeAnswer } from '../app/workbook-arithmetic.mjs';
import { consumeEmailChallenge } from '../app/admin-email-challenge.mjs';
import { isLocalPreview, validateHostedConfig } from '../app/runtime-config.mjs';
import { verifyOwnerTotp } from '../app/admin-totp.mjs';

const require = createRequire(import.meta.url);
const migrations = new URL('../supabase/migrations/', import.meta.url);

test('Vercel rejects local login settings and incomplete configuration', () => {
  for (const name of ['EDUCATION_UNITE_PREVIEW', 'EDUCATION_UNITE_TEST_PASSWORD_ONLY', 'EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE']) {
    const env = { VERCEL: '1', [name]: '1' };
    assert.throws(() => validateHostedConfig(env), /Local test settings/);
    assert.equal(isLocalPreview(env), false);
  }
  assert.throws(() => validateHostedConfig({ VERCEL: '1' }), /Missing hosted configuration/);
});

test('owner TOTP needs a verified factor and a valid second-factor token', async () => {
  const account = { id: 'fixture-owner', factors: [{ id: 'fixture-factor', factor_type: 'totp', status: 'verified' }] };
  const identity = { account, token: 'fixture-password-token' };
  function provider(aal) {
    return async (path) => {
      if (path.endsWith('/challenge')) return { id: 'fixture-challenge' };
      if (path.endsWith('/verify')) {
        const claims = { sub: account.id, aal, exp: Date.now() / 1000 + 60 };
        return { access_token: `fixture.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.fixture` };
      }
      return path === 'user' ? { id: account.id } : null;
    };
  }
  assert.equal(await verifyOwnerTotp(provider('aal1'), identity, '123456'), false);
  assert.equal(await verifyOwnerTotp(provider('aal2'), identity, '123456'), true);
});

test('all 24 practice templates validate', async () => {
  const templates = JSON.parse(await readFile(new URL('../app/practice-templates.json', import.meta.url), 'utf8'));
  assert.equal(templates.length, 24);
  for (const { id } of workbookInterests) {
    assert.equal(templates.filter(({ interest }) => interest === id).length, 8);
  }
  for (const template of templates) {
    const generate = compileWorkbookTemplate(template);
    for (const index of [0, -1]) {
      const numbers = Object.fromEntries(Object.entries(template.ranges).map(([name, values]) => [name, values.at(index)]));
      const question = generate(numbers);
      assert.ok(Number.isFinite(question.expected));
      assert.equal(question.hints.length, 3);
      assert.doesNotMatch([question.prompt, ...question.hints, ...question.solution].join(' '), /[{}]|NaN|Infinity/);
    }
  }
  assert.ok(matchesAnswer(parsePracticeAnswer('4/30', 'fraction'), 2 / 15));
  assert.equal(parsePracticeAnswer('4/0', 'fraction'), null);
  assert.equal(parsePracticeAnswer('1.2 × 10^5', 'standard'), 120000);
  assert.equal(parsePracticeAnswer('1.2e5', 'standard'), 120000);
  assert.ok(!matchesAnswer(parsePracticeAnswer('1.01', 'decimal'), 1));
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
  const freshToken = 'a'.repeat(64);
  const expiredToken = 'b'.repeat(64);
  const candidate = 'c'.repeat(64);
  await db.query(`insert into education_unite.admin_email_challenges (token_digest, code_digest, expires_at)
    values ($1, $3, now() + interval '1 minute'), ($2, $3, now() - interval '1 minute')`,
  [freshToken, expiredToken, candidate]);
  assert.equal(await db.transaction((tx) => consumeEmailChallenge(tx, expiredToken, candidate)), false);
  await db.query('select education_unite.purge_expired()');
  const { rows: [{ count }] } = await db.query('select count(*)::int as count from education_unite.admin_email_challenges');
  assert.equal(count, 1);
  assert.equal(await db.transaction((tx) => consumeEmailChallenge(tx, freshToken, candidate)), true);
  assert.equal(await db.transaction((tx) => consumeEmailChallenge(tx, freshToken, candidate)), false);
});

async function startPreview(t, password, { emailCode = false } = {}) {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  const origin = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [
    '--v8-pool-size=1', '--max-old-space-size=256',
    ...(process.platform === 'win32' ? ['--max-opt=1', '--wasm-jitless'] : []),
    '--wasm-num-compilation-tasks=1', '--wasm-lazy-compilation', '--no-wasm-tier-up',
    require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    env: {
      ...process.env,
      VERCEL: '',
      DATABASE_URL: '',
      EDUCATION_UNITE_PREVIEW: '1',
      EDUCATION_UNITE_ADMIN_EMAIL_CODE: emailCode ? '1' : '0',
      EDUCATION_UNITE_LOCAL_ADMIN_TEST_CODE: emailCode ? '1' : '0',
      EDUCATION_UNITE_PREVIEW_ADMIN_EMAIL: 'owner@example.test',
      EDUCATION_UNITE_PREVIEW_ADMIN_PASSWORD: password,
    },
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk; });
  const closed = once(child, 'close');
  t.after(async () => {
    const stopped = child.kill();
    const [code, signal] = await closed;
    if (/fatal|out of memory/i.test(output)) t.diagnostic(output);
    // Next handles SIGTERM and exits with 128 + 15 on Unix.
    assert.ok(stopped && (code === 0 || code === 143 || signal === 'SIGTERM'), 'Preview exited unexpectedly:\n' + output);
  });
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
    const response = await sendPreviewRequest(origin + path, { cookie, origin }, body).catch((cause) => {
      throw new Error(`Preview request failed: ${body ? 'POST' : 'GET'} ${path}`, { cause });
    });
    const setCookies = response.headers.getSetCookie();
    for (const value of setCookies) {
      const [pair] = value.split(';');
      const name = pair.split('=')[0];
      assert.match(value, /; HttpOnly/i);
      assert.match(value, /; SameSite=Lax/i);
      assert.match(name, /^eu_(join|student|student_device|admin|admin_email)$/);
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

async function sendPreviewRequest(url, headers, form) {
  if (!form) return fetch(url, { redirect: 'manual', headers });
  const encoded = new Response(form);
  const body = Buffer.from(await encoded.arrayBuffer());
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, {
      method: 'POST',
      agent: false,
      headers: { ...headers, 'content-type': encoded.headers.get('content-type'), 'content-length': body.length },
      signal: AbortSignal.timeout(20_000),
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const responseHeaders = new Headers();
        for (const [name, values] of Object.entries(response.headers)) {
          for (const value of [values].flat()) responseHeaders.append(name, value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: responseHeaders }));
      });
    });
    request.on('error', reject);
    request.end(body);
  });
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
  for (const route of ['/admin', '/admin/codes', '/admin/password-reset', '/admin/settings']) {
    assert.match((await first.get(route)).html, /Owner sign in/);
  }
  assert.doesNotMatch((await admin.get('/admin/login')).html, /name="code"/);
  const credentials = { email: 'owner@example.test', password };
  assert.match(await admin.submit('/admin/login', 'Sign in', { ...credentials, password: 'wrong-password' }), /Check your email and password/);
  assert.match(await admin.submit('/admin/login', 'Sign in', credentials), /Admin dashboard/);
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

  const interestsPage = await first.get('/interests');
  assert.match(interestsPage.html, /personalise your practice questions/);
  assert.doesNotMatch(interestsPage.html, /Local preview with sample questions/);
  assert.match(await first.submit('/interests', 'Start practice', { interest: 'shopping' }), /Maths practice/);
  const practicePage = (await first.get('/practice')).html.replaceAll('<!-- -->', '');
  const hintForm = [...practicePage.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .find(([form]) => form.includes('Show hint 1 of 3'))?.[0];
  assert.ok(hintForm);
  assert.match(hintForm, /<form\b[^>]*\bnoValidate/i);
  assert.doesNotMatch(hintForm, /name="answer"/);
  assert.match(await first.submit('/practice', 'Show hint 1 of 3'), /aria-label="Hints"/);
  assert.match(await first.submit('/practice', 'Check answer', { answer: 'invalid' }), /Enter your answer as a number/);
  for (let question = 1; question <= 6; question++) {
    let answer = '0';
    if (question === 1) {
      const prompt = practicePage.match(/<p class="question-prompt">([^<]+)/)?.[1];
      assert.ok(prompt, 'Expected shopping practice question');
      assert.doesNotMatch(prompt, /[{}]/);
      const values = [...prompt.matchAll(/\d[\d,]*/g)].map(([value]) => Number(value.replaceAll(',', '')));
      const [a, b, c] = values;
      const rules = [
        [/NovaKicks trainers cost/, () => a * (1 - b / 100)],
        [/sells socks/, () => b * c / a],
        [/saved up/, () => a - b - c],
        [/jacket is in a sale/, () => b / (1 - a / 100)],
        [/is a cuboid/, () => 2 * (a * b + b * c + a * c)],
        [/smallest whole number of weeks/, () => Math.ceil((a - b) / c)],
        [/savings account/, () => a * (1 + b / 100) ** c],
        [/Phone deal/, () => Math.floor(b / (a - c)) + 1],
      ];
      const rule = rules.find(([pattern]) => pattern.test(prompt));
      assert.ok(rule, 'Expected an approved shopping template');
      answer = String(Math.round(rule[1]() * 100) / 100);
    }
    assert.match(await first.submit('/practice', 'Check answer', { answer }), /Worked solution/);
    await first.submit('/practice', question < 6 ? 'Next question' : 'See my summary');
  }
  assert.match((await first.get('/practice/summary')).html.replaceAll('<!-- -->', ''), /<dt>Score<\/dt><dd>1 \/ 6<\/dd>/);
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
  assert.match(await first.submit('/login', 'Sign in', { username, password: newPassword, rememberDevice: 'on' }), /Start maths practice/);
  const wrongPassword = { username, password };
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.match(await anotherDevice.submit('/login', 'Sign in', wrongPassword), /Username or password is incorrect/);
  }
  assert.match(await anotherDevice.submit('/login', 'Sign in', { username, password: newPassword }), /Too many attempts/);
  assert.match(await first.submit('/login', 'Sign in', { username, password: newPassword }), /Start maths practice/);
});

test('owner email verification gates the admin dashboard and limits guesses', { timeout: 60_000 }, async (t) => {
  const password = randomBytes(18).toString('base64url');
  const origin = await startPreview(t, password, { emailCode: true });
  const owner = session(origin);
  await owner.submit('/admin/login', 'Sign in', { email: 'owner@example.test', password });
  assert.match((await owner.get('/admin')).html, /Owner sign in/);
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.match(await owner.submit('/admin/login?step=email', 'Verify code', { code: '654321' }), /out of attempts/);
  }
  assert.match(await owner.submit('/admin/login?step=email', 'Verify code', { code: '123456' }), /out of attempts/);
  await owner.submit('/admin/login?step=email', 'Start again');
  await owner.submit('/admin/login', 'Sign in', { email: 'owner@example.test', password });
  assert.match(await owner.submit('/admin/login?step=email', 'Verify code', { code: '123456' }), /Admin dashboard/);
  assert.doesNotMatch((await owner.get('/admin/login?step=email')).html, /Verify code/);
});

test('a full class can join and sign in from one network', { timeout: 120_000 }, async (t) => {
  const password = randomBytes(18).toString('base64url');
  const origin = await startPreview(t, password);
  const usernames = new Set();
  const students = Array.from({ length: 30 }, () => session(origin));
  for (let index = 0; index < students.length; index += 5) {
    await Promise.all(students.slice(index, index + 5).map(async (student) => {
      const signup = await student.submit('/join', 'Continue', { code: 'EU-PREVIEW' });
      const username = [...signup.matchAll(/<option>([a-z0-9]+)<\/option>/g)]
        .map(([, name]) => name).find((name) => !usernames.has(name));
      assert.ok(username, 'Expected a username for every student in the class');
      usernames.add(username);
      assert.match(await student.submit('/join', 'Create account', { username, password }), /Start maths practice/);
    }));
  }
  assert.equal(usernames.size, 30);
  // Four waves also cross the former 100-request network ceiling.
  const signIns = Array.from({ length: 4 }, () => [...usernames]).flat();
  for (let index = 0; index < signIns.length; index += 5) {
    await Promise.all(signIns.slice(index, index + 5).map(async (username) => {
      assert.match(await session(origin).submit('/login', 'Sign in', { username, password }), /Start maths practice/);
    }));
  }

  const failedJoin = session(origin);
  for (let attempt = 0; attempt < 30; attempt++) {
    assert.match(await failedJoin.submit('/join', 'Continue', { code: 'EU-EXPIRED' }), /invalid or expired/);
  }
  assert.match(await failedJoin.submit('/join', 'Continue', { code: 'EU-EXPIRED' }), /Too many attempts/);
});
