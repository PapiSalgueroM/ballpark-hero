/* Run the actual edge handler with local database and mail-provider doubles.
 * Neither Supabase nor the mail provider is contacted.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const relay = new URL('../supabase/functions/report-relay/index.ts', import.meta.url);
const source = readFileSync(relay, 'utf8').replace(/^import .*;\r?$/gm, '');
const { code } = transformSync(source, { loader: 'ts' });

const report = {
  game_type: 'Example game',
  game_context: { screen: 'Private screen detail' },
  description: 'Private player feedback',
};
const providerReply = (success, status = 200) => new Response(
  JSON.stringify({ success, message: 'Private provider response' }),
  { status },
);
const emailFailure = (reason, status) => ({
  event: 'report_relay_email_failure',
  reason,
  ...(status === undefined ? {} : { http_status: status }),
});
const statusFailure = status => ({
  event: 'report_relay_email_status_write_failure',
  ...(status === undefined ? {} : { http_status: status }),
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const cases = [
  { name: 'accepted after nine seconds', elapsed: 9_000, provider: () => providerReply('true'), emailed: true, warnings: [] },
  { name: 'HTTP rejection', provider: () => providerReply(true, 429), warnings: [emailFailure('http_rejected', 429)] },
  { name: 'provider declined', provider: () => providerReply('false'), warnings: [emailFailure('provider_declined', 200)] },
  { name: 'malformed JSON', provider: () => new Response('Not valid JSON'), warnings: [emailFailure('malformed_response', 200)] },
  { name: 'missing success flag', provider: () => providerReply(undefined), warnings: [emailFailure('malformed_response', 200)] },
  { name: 'provider timeout', elapsed: 12_000, provider: () => providerReply(true), warnings: [emailFailure('timeout')] },
  {
    name: 'provider network error',
    provider: () => { throw new TypeError('Private network detail'); },
    warnings: [emailFailure('network_error')],
  },
  {
    name: 'returned status write failure',
    provider: () => providerReply(true),
    write: () => ({ error: { message: 'Private database response' }, status: 503 }),
    emailed: true,
    warnings: [statusFailure(503)],
  },
  {
    name: 'thrown status write failure',
    provider: () => providerReply(true),
    write: () => { throw new Error('Private database response'); },
    emailed: true,
    warnings: [statusFailure()],
  },
  {
    name: 'failed storage skips the provider',
    insertResult: { data: null, error: { message: 'Private database response' } },
    warnings: [],
  },
  {
    name: 'missing stored ID skips the provider',
    insertResult: { data: null, error: null },
    warnings: [],
  },
];

for (const scenario of cases) {
  const events = [];
  const warnings = [];
  const background = [];
  const providerStarted = deferred();
  const releaseProvider = deferred();
  const deadline = new AbortController();
  let timeoutMs;
  let handler;
  const db = {
    from(table) {
      assert.equal(table, 'question_reports');
      return {
        insert(data) {
          assert.deepEqual(JSON.parse(JSON.stringify(data)), report);
          events.push('insert');
          return {
            select: () => ({
              single: async () => scenario.insertResult ?? { data: { id: 'example-row' }, error: null },
            }),
          };
        },
        update({ emailed }) {
          return {
            async eq(column, id) {
              assert.equal(column, 'id');
              assert.equal(id, 'example-row');
              events.push(['update', emailed]);
              return scenario.write?.() ?? { error: null, status: 204 };
            },
          };
        },
      };
    },
  };
  runInNewContext(code, {
    Deno: { serve: callback => { handler = callback; }, env: { get: () => 'stub' } },
    EdgeRuntime: { waitUntil: promise => background.push(promise) },
    createClient: () => db,
    AbortSignal: { timeout(ms) { timeoutMs = ms; return deadline.signal; } },
    fetch: async (_url, { signal }) => {
      events.push('provider');
      providerStarted.resolve();
      await releaseProvider.promise;
      signal.throwIfAborted();
      return scenario.provider();
    },
    console: { warn: message => warnings.push(JSON.parse(message)) },
    Response, DOMException, SyntaxError,
  });

  const request = new Request('https://example.invalid/report', {
    method: 'POST',
    body: JSON.stringify(report),
  });
  const acknowledgment = handler(request);
  const stillWaiting = Symbol('waiting for email');
  try {
    const response = await Promise.race([
      acknowledgment,
      providerStarted.promise.then(() => setImmediate(stillWaiting)),
    ]);
    assert.notEqual(response, stillWaiting, scenario.name + ': response waited for the provider');
    assert.equal(response.status, 200, scenario.name);
    if (scenario.insertResult) {
      assert.deepEqual(await response.json(), { ok: false, emailed: false }, scenario.name);
      assert.deepEqual(events, ['insert'], scenario.name);
      assert.equal(background.length, 0, scenario.name);
    } else {
      assert.deepEqual(await response.json(), { ok: true, emailed: null }, scenario.name);
      assert.deepEqual(events, ['insert', 'provider'], scenario.name);
      assert.equal(background.length, 1, scenario.name + ': mail task must outlive the response');
      assert.equal(timeoutMs, 12_000, scenario.name + ': provider budget');
    }
  } finally {
    if ((scenario.elapsed ?? 0) >= timeoutMs) {
      deadline.abort(new DOMException('Private timeout detail', 'TimeoutError'));
    }
    releaseProvider.resolve();
    await acknowledgment;
    await Promise.all(background);
  }

  if (!scenario.insertResult) {
    assert.deepEqual(events, ['insert', 'provider', ['update', scenario.emailed ?? false]], scenario.name);
  }
  assert.deepEqual(warnings, scenario.warnings, scenario.name);
  console.log('PASS ' + scenario.name);
}
console.log('simReportRelayDiagnostics: green (' + cases.length + ' offline cases)');
