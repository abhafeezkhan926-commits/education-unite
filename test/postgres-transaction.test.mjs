import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createPostgresTransaction } from '../app/postgres-transaction.mjs';

function createFixture(failures = {}) {
  const statements = [];
  const releases = [];
  let pool;
  const transaction = createPostgresTransaction('postgres://example.test/db', undefined, class extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      pool = this;
    }

    async connect() {
      return {
        async query(statement) {
          statements.push(statement);
          if (failures[statement]) throw failures[statement];
        },
        release(discard) { releases.push(discard); },
      };
    }
  });
  return { pool, transaction, statements, releases };
}

test('a statement timeout rolls back and allows the next transaction', async () => {
  const timeout = Object.assign(new Error('statement timeout'), { code: '57014' });
  const { pool, transaction, statements, releases } = createFixture({ slow: timeout });
  assert.ok(pool.options.connectionTimeoutMillis > 0);
  assert.ok(pool.options.query_timeout > 8_000);
  await assert.rejects(transaction((client) => client.query('slow')), (error) => error === timeout);
  assert.deepEqual(statements, ['begin', "set local statement_timeout = '8s'", 'slow', 'rollback']);
  assert.deepEqual(releases, [false]);
  assert.equal(await transaction(() => 'ready'), 'ready');
});

test('a lost connection preserves the work error and discards the failed client', async (t) => {
  const dropped = new Error('connection lost');
  const { pool, transaction, releases } = createFixture({ rollback: new Error('rollback failed') });
  const log = t.mock.method(console, 'error', () => {});
  assert.doesNotThrow(() => pool.emit('error', dropped));
  await assert.rejects(transaction(() => { throw dropped; }), (error) => error === dropped);
  assert.equal(await transaction(() => 'ready'), 'ready');
  assert.deepEqual(releases, [true, false]);
  assert.equal(log.mock.callCount(), 2);
});

test('an uncertain commit is surfaced and the connection is discarded', async () => {
  const failure = new Error('commit reply was lost');
  const { transaction, releases } = createFixture({ commit: failure });
  await assert.rejects(transaction(() => 'done'), (error) => error === failure);
  assert.deepEqual(releases, [true]);
});
