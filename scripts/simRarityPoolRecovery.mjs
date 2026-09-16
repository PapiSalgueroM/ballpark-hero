/* Offline proof using real category fetchers and the real REST client.
   RARITY_RECOVERY_CONTROL mutates one cache anchor in an OS-temp copy.
   No request can reach the network. Failed pools require an explicit retry. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rarity-recovery-'));
const CONTROL = process.env.RARITY_RECOVERY_CONTROL || '';
const controls = {
  pending: ['shared', 'if (!poolCache.has(id)) {', 'if (true) {', 'Concurrent callers must share one pending promise'],
  success: ['shared', 'if (pool.length === 0) poolCache.delete(id);', 'poolCache.delete(id);', 'Nonempty success must retain its promise'],
  empty: ['empty', 'if (pool.length === 0) poolCache.delete(id);', 'if (false) poolCache.delete(id);', 'Explicit retry must replace an empty pool'],
  rejected: ['rejected', 'poolCache.delete(id);\n          throw error;', 'throw error;', 'Explicit retry must replace a rejected pool'],
  propagate: ['rejected', 'throw error;', 'return [];', 'Rejected pool assembly must remain rejected'],
  automatic: ['empty', 'return pool;', 'return pool.length ? pool : fetcher();', 'Empty results must not trigger automatic requests'],
  isolation: ['isolation', 'if (pool.length === 0) poolCache.delete(id);', 'if (pool.length === 0) poolCache.clear();', 'An empty category must not evict another successful category'],
  rejectisolation: ['isolation', 'poolCache.delete(id);\n          throw error;', 'poolCache.clear();\n          throw error;', 'A rejected category must not evict another successful category'],
  diagnostic: ['diagnostics', 'if (pool) console.error(', 'if (false) console.error(', 'Failed pool reads must emit bounded diagnostics', 'diagnostic'],
  body: ['diagnostics', 'response.clone().json()', 'response.json()', 'Diagnostics must preserve the original response body', 'diagnostic'],
  transport: ['diagnostics', 'throw error;', "throw new Error('Replacement error');", 'Diagnostics must rethrow the original transport error', 'diagnostic'],
  scope: ['diagnostics', "const pool = method === 'GET' && (", "const pool = method === 'GET' || (", 'Unrelated prominence reads must not produce pool diagnostics', 'diagnostic'],
  bound: ['diagnostics', '.slice(0, 240)', '.slice(0, 2400)', 'Diagnostic messages must be bounded', 'diagnostic'],
};
assert(!CONTROL || Object.hasOwn(controls, CONTROL), `Unknown RARITY_RECOVERY_CONTROL=${CONTROL}`);
const originalStorage = globalThis.localStorage;
const queues = new Map();
const requests = [];
const unexpected = [];
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});
const rows = [
  { player_name: 'Fixture Beta', peak_value_usd: 900 },
  { player_name: 'Fixture Alpha', peak_value_usd: 500 },
  { player_name: 'Fixture Alpha', peak_value_usd: 100 },
];
const expected = [
  { key: 'fixture beta', name: 'Fixture Beta', prominence: 900, rank: 1 },
  { key: 'fixture alpha', name: 'Fixture Alpha', prominence: 500, rank: 2 },
];
const queue = (position, ...replies) => queues.set(position, replies);
const malformed = () => response([{ player_name: {}, peak_value_usd: 1 }]);
let client;
let failures = 0;
let proved = false;
try {
  let source = fs.readFileSync(path.join(ROOT, 'src/lib/rarityRound.ts'), 'utf8').replaceAll('\r\n', '\n');
  let diagnosticSource = fs.readFileSync(path.join(ROOT, 'scripts/simRarityAgreement.mjs'), 'utf8').replaceAll('\r\n', '\n');
  if (CONTROL) {
    const [, before, after, , target] = controls[CONTROL];
    const original = target === 'diagnostic' ? diagnosticSource : source;
    assert.equal(original.split(before).length - 1, 1, 'Control must match one executable anchor');
    const changed = original.replace(before, after);
    assert.notEqual(changed, original, 'Control must change executable source');
    if (target === 'diagnostic') diagnosticSource = changed;
    else source = changed;
    console.log(`CONTROL MUTATION APPLIED: ${CONTROL}`);
  }
  const copy = path.join(TEMP, 'rarityRound.ts');
  const bundle = path.join(TEMP, 'entry.mjs');
  fs.writeFileSync(copy, source);
  await build({
    stdin: { contents: `export { CATEGORIES } from ${JSON.stringify(copy)}; export { supabase } from '@/integrations/supabase/client';`, resolveDir: ROOT },
    outfile: bundle, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') },
  });
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const position = url.searchParams.get('position');
    requests.push({ position, offset: url.searchParams.get('offset'), limit: url.searchParams.get('limit') });
    if (request.method !== 'GET' || url.pathname !== '/rest/v1/player_position_peaks'
      || url.searchParams.get('select') !== 'player_name,peak_value_usd'
      || url.searchParams.get('order') !== 'peak_value_usd.desc,player_name.asc'
      || url.searchParams.get('offset') !== '0' || url.searchParams.get('limit') !== '1000') {
      unexpected.push('Unexpected pool request shape');
    }
    const next = queues.get(position?.slice(3))?.shift();
    if (!next) {
      unexpected.push(`Unplanned request for ${position}`);
      return response({ code: 'FIXTURE', message: 'Unplanned offline request' }, 500);
    }
    return await next();
  };
  const loaded = await import(pathToFileURL(bundle).href);
  client = loaded.supabase;
  const category = id => {
    const cat = loaded.CATEGORIES.find(item => item.id === `position-${id}`);
    assert(cat, `Real category must exist: ${id}`);
    return cat;
  };
  const cases = {
    async shared() {
      let release;
      queue('Centre-Forward', () => new Promise(resolve => { release = resolve; }));
      const cat = category('forward');
      const first = cat.fetchPool();
      const second = cat.fetchPool();
      assert.equal(first, second, 'Concurrent callers must share one pending promise');
      for (let attempt = 0; !release && attempt < 50; attempt++) await new Promise(resolve => setImmediate(resolve));
      assert(release, 'The real client must reach the mocked fetch');
      assert.equal(requests.length, 1, 'Pending requests must be deduplicated');
      release(response(rows));
      const pool = await first;
      assert.deepEqual(pool, expected, 'The real ranked pool must retain names, peak values and ranks');
      assert.equal(await second, pool, 'Concurrent callers must share the same result');
      const cached = cat.fetchPool();
      assert.equal(cached, first, 'Nonempty success must retain its promise');
      assert.equal(await cached, pool, 'Nonempty success must retain its result');
      assert.equal(requests.length, 1, 'Successful reuse must make no further requests');
    },
    async empty() {
      queue('Goalkeeper', () => response([]), () => response(rows));
      const cat = category('goalkeeper');
      const before = requests.length;
      const first = await cat.fetchPool();
      assert.equal(requests.length - before, 1, 'Empty results must not trigger automatic requests');
      assert.deepEqual(first, [], 'Empty results remain empty for the current caller');
      assert.deepEqual(await cat.fetchPool(), expected, 'Explicit retry must replace an empty pool');
      assert.equal(requests.length - before, 2, 'The explicit retry must fetch exactly once');
    },
    async rejected() {
      queue('Centre-Back', malformed, () => response(rows));
      const cat = category('centre-back');
      const before = requests.length;
      const first = cat.fetchPool();
      const second = cat.fetchPool();
      const [one, two] = await Promise.allSettled([first, second]);
      assert.equal(one.status, 'rejected', 'Rejected pool assembly must remain rejected');
      assert.equal(two.status, 'rejected', 'Every shared caller must receive the rejection');
      assert(one.reason instanceof TypeError, 'Malformed name fixture must reach the real pool assembly');
      assert.equal(one.reason, two.reason, 'Shared callers must receive the original error object');
      assert.equal(requests.length - before, 1, 'Rejection must not trigger automatic requests');
      const recovered = await cat.fetchPool().catch(error => error);
      assert.deepEqual(recovered, expected, 'Explicit retry must replace a rejected pool');
      assert.equal(requests.length - before, 2, 'Recovery must fetch once on demand');
    },
    async exhausted() {
      const timeout = () => response({ code: '57014', message: 'Offline statement timeout fixture' }, 500);
      queue('Right-Back', timeout, timeout, timeout, () => response(rows));
      const cat = category('right-back');
      const before = requests.length;
      assert.deepEqual(await cat.fetchPool(), [], 'Exhausted page errors must still fail closed');
      assert.equal(requests.length - before, 3, 'Existing page retry count must remain unchanged');
      assert.deepEqual(await cat.fetchPool(), expected, 'Explicit retry must recover after exhausted page errors');
      assert.equal(requests.length - before, 4, 'There must be no extra recovery request');
    },
    async isolation() {
      queue('Left-Back', () => response(rows), () => response(rows), () => response(rows));
      const warm = category('left-back');
      const promise = warm.fetchPool();
      const pool = await promise;
      queue('Central Midfield', () => response([]));
      await category('central-midfielder').fetchPool();
      const afterEmpty = warm.fetchPool();
      assert.equal(afterEmpty, promise, 'An empty category must not evict another successful category');
      assert.equal(await afterEmpty, pool);
      queue('Defensive Midfield', malformed);
      await category('defensive-midfielder').fetchPool().catch(error => error);
      const afterRejected = warm.fetchPool();
      assert.equal(afterRejected, promise, 'A rejected category must not evict another successful category');
      assert.equal(await afterRejected, pool);
    },
    async diagnostics() {
      const ast = ts.createSourceFile('simRarityAgreement.mjs', diagnosticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'withPoolDiagnostics');
      assert.equal(functions.length, 1, 'Read the actual executable diagnostic function');
      const withDiagnostics = new Function(`${functions[0].getText(ast)}; return withPoolDiagnostics;`)();
      const logs = [];
      const originalError = console.error;
      console.error = (...args) => logs.push(args.join(' '));
      try {
        const url = 'https://offline.invalid/rest/v1/player_position_peaks?offset=1000&limit=1000';
        const errorBody = { code: '57014', message: 'Timeout '.repeat(100), details: 'NEVER_LOG_DETAILS', hint: 'NEVER_LOG_HINT' };
        const original = response(errorBody, 500);
        const fetcher = async (input, init) => {
          assert.equal(input, url); assert.equal(init.headers.apikey, 'NEVER_LOG_KEY');
          return original;
        };
        const received = await withDiagnostics(fetcher)(url, { headers: { apikey: 'NEVER_LOG_KEY' } });
        assert.equal(received, original, 'Diagnostics must return the original Response');
        const text = await received.text().catch(() => null);
        assert.equal(text, JSON.stringify(errorBody), 'Diagnostics must preserve the original response body');
        assert.equal(logs.length, 1, 'Failed pool reads must emit bounded diagnostics');
        const fields = JSON.parse(logs[0].slice('Error: rarity pool request '.length));
        assert.deepEqual(Object.keys(fields), ['endpoint', 'offset', 'limit', 'status', 'code', 'message']);
        assert.deepEqual({ ...fields, message: null }, { endpoint: '/rest/v1/player_position_peaks', offset: '1000', limit: '1000', status: 500, code: '57014', message: null });
        assert.equal(fields.message.length, 240, 'Diagnostic messages must be bounded');
        assert(!logs.join('').includes('NEVER_LOG'), 'Headers, details and hints must not be logged');

        const unrelated = 'https://offline.invalid/rest/v1/player_market_values?select=player_name,market_value_usd&order=market_value_usd.desc,year.desc,player_name.asc&limit=1000';
        await withDiagnostics(async () => response(errorBody, 500))(unrelated);
        assert.equal(logs.length, 1, 'Unrelated prominence reads must not produce pool diagnostics');
        const marketPool = 'https://offline.invalid/rest/v1/player_market_values?select=player_name,market_value_usd&order=market_value_usd.desc,player_name.asc&offset=0&limit=1000';
        await withDiagnostics(async () => response(errorBody, 500))(marketPool);
        assert.equal(logs.length, 2, 'Paged club pool failures must produce diagnostics');
        for (const view of ['player_peak_values', 'player_nationality_peaks']) {
          await withDiagnostics(async () => response(errorBody, 500))(`https://offline.invalid/rest/v1/${view}`);
        }
        assert.equal(logs.length, 4, 'All three pool view endpoints must be covered');
        const valid = response(rows);
        assert.equal(await withDiagnostics(async () => valid)(url), valid);
        assert.equal(logs.length, 4, 'Successful reads must not produce diagnostics');

        const transport = new Error('Offline connection reset');
        transport.code = 'ECONNRESET';
        const caught = await withDiagnostics(async () => { throw transport; })(url).catch(error => error);
        assert.equal(caught, transport, 'Diagnostics must rethrow the original transport error');
        const last = JSON.parse(logs.at(-1).slice('Error: rarity pool request '.length));
        assert.equal(last.status, 0); assert.equal(last.code, 'ECONNRESET');
        const nonJson = new Response('Offline gateway error', { status: 502 });
        const untouched = await withDiagnostics(async () => nonJson)(url);
        assert.equal(await untouched.text(), 'Offline gateway error', 'Non-JSON errors must remain readable');
      } finally { console.error = originalError; }
    },
  };
  for (const [name, check] of Object.entries(cases)) {
    if (CONTROL && name !== controls[CONTROL][0]) continue;
    try {
      await check();
      console.log(`PASS ${name}: real category cache outcome`);
    } catch (error) {
      failures += 1;
      if (CONTROL) {
        assert.equal(error.code, 'ERR_ASSERTION', 'Control must fail an outcome assertion');
        assert(error.message.includes(controls[CONTROL][3]), 'Control must fail its intended outcome');
        proved = true;
        console.log(`CONTROL PROVED ${CONTROL}: ${controls[CONTROL][3]}`);
      } else console.error(`FAIL ${name}: ${error.stack}`);
    }
  }
  if (CONTROL) {
    assert(proved, 'Control must change and fail its intended outcome');
    process.exitCode = 1;
  } else {
    assert.equal(failures, 0, 'All six cache and diagnostic outcome cases must pass');
    assert.deepEqual(unexpected, [], 'Only planned offline REST calls may run');
    console.log(`Rarity pool recovery: 6/6 offline cases passed, ${requests.length} mocked REST calls, zero network calls`);
  }
} finally {
  await client?.auth.stopAutoRefresh();
  // Keep the offline fetch fence until process exit, including control leftovers.
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  assert.equal(path.dirname(path.resolve(TEMP)), path.resolve(os.tmpdir()), 'Cleanup must stay in OS temp');
  fs.rmSync(TEMP, { recursive: true, force: true });
}
