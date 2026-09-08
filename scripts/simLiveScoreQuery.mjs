/**
 * Round 519: run the real score query against a synthetic REST boundary.
 * No account, database or real network is contacted. The mock honors the
 * requested window, ordering, offset and limit, including smaller server caps.
 * Run: node scripts/simLiveScoreQuery.mjs
 * LIVE_SCORE_QUERY_CONTROL runs its named case against a source mutation.
 * Every control must change executable source and fail its exact assertion;
 * import failures, transport violations and unexpected passes are not proof.
 * Bundles use a unique OS temp directory with guarded cleanup.
 */
import assert, { AssertionError } from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-09-08T16:00:00.000Z');
const ORIGIN = 'https://fake.invalid';
const KEY = 'synthetic-public-key';
const WINDOW = ['gte.2026-09-08T04:00:00.000Z', 'lte.2026-09-09T12:00:00.000Z'];
const CONTROL = process.env.LIVE_SCORE_QUERY_CONTROL || '';
const controls = {
  singlepage: ['later live sports', 'LATE_LIVE_IDS'],
  priority: ['later live sports', 'LATE_LIVE_IDS'],
  size: ['request shape', 'REQUEST_SHAPE'],
  truncate: ['multiple full pages', 'MULTIPAGE_IDS'],
  shortpage: ['server page cap', 'SERVER_CAP_IDS'],
  filtered: ['raw offsets after rejected rows', 'RAW_OFFSETS'],
  tie: ['equal-time ordering', 'TIED_START_IDS'],
  dedup: ['duplicate IDs', 'UNIQUE_IDS'],
  shape: ['malformed individual rows', 'MALFORMED_ROWS'],
  scores: ['honest score values', 'HONEST_SCORES'],
  window: ['fixed query window', 'WINDOW_ROWS'],
  http: ['later http failure', 'FAIL_CLOSED_HTTP'],
  json: ['later json failure', 'FAIL_CLOSED_JSON'],
  object: ['later object failure', 'FAIL_CLOSED_OBJECT'],
  network: ['later network failure', 'FAIL_CLOSED_NETWORK'],
  empty: ['empty completion page', 'EMPTY_PAGE_END'],
  budget: ['request budget', 'REQUEST_BUDGET'],
  unknown: ['unknown sport', 'UNKNOWN_SPORT'],
  reserved: ['reserved sport names', 'RESERVED_SPORTS'],
  status: ['optional status text', 'OPTIONAL_STATUS'],
  metadata: ['unused metadata', 'UNUSED_METADATA'],
  invalidduplicate: ['malformed duplicate IDs', 'VALID_DUPLICATES'],
  update: ['updated duplicate values', 'UPDATED_VALUES'],
  boundary: ['budget boundary completes', 'BUDGET_COMPLETES'],
  partial: ['budget boundary refuses partial', 'BUDGET_PARTIAL'],
};
assert.ok(!CONTROL || Object.hasOwn(controls, CONTROL), `Unknown LIVE_SCORE_QUERY_CONTROL=${CONTROL}`);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-live-score-query-'));
const originalFetch = globalThis.fetch;
const failures = [];
const importTransportErrors = [];
let source;

function mutateOnce(before, after) {
  assert.equal(source.split(before).length - 1, 1, 'control must target exactly one executable statement');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change source');
  source = changed;
  console.log(`CONTROL_CHANGED: ${CONTROL}`);
}

function fixture(i, extra = {}) {
  return {
    id: `synthetic-${String(i).padStart(5, '0')}`, sport: 'soccer', league: 'Synthetic fixture',
    home: `Home ${i}`, away: `Away ${i}`, home_score: 1, away_score: 0,
    status_short: 'FT', status_long: 'Finished', live: false, finished: true,
    start_at: new Date(Date.UTC(2026, 8, 8, 12, i)).toISOString(),
    updated_at: NOW.toISOString(), ...extra,
  };
}
const fixtures = (count, extra) => Array.from({ length: count }, (_, i) => fixture(i, extra));
const ids = rows => rows.map(row => row.id);

try {
  source = fs.readFileSync(path.join(ROOT, 'src/lib/liveScores.ts'), 'utf8').replaceAll('\r\n', '\n');
  if (CONTROL) console.log(`simLiveScoreQuery: control ${CONTROL}, case ${controls[CONTROL][0]}`);
  if (CONTROL === 'singlepage' || CONTROL === 'size') mutateOnce("limit: '200',", "limit: '60',");
  if (CONTROL === 'singlepage' || CONTROL === 'truncate') mutateOnce('offset += data.length;', 'return sortForTicker([...rows.values()]);');
  if (CONTROL === 'priority') mutateOnce('(r.live ? 0 : !r.finished ? 1 : 2)', '0');
  if (CONTROL === 'shortpage') mutateOnce('offset += data.length;', 'offset += data.length;\n      if (data.length < 200) return sortForTicker([...rows.values()]);');
  if (CONTROL === 'filtered') mutateOnce('offset += data.length;', 'offset += data.filter(row => isTickerRow(row) && isShowable(row)).length;');
  if (CONTROL === 'tie') mutateOnce("order: 'start_at.asc,id.asc',", "order: 'start_at.asc',");
  if (CONTROL === 'dedup') mutateOnce('rows.set(row.id, row);', 'rows.set(`${row.id}:${offset}`, row);');
  if (CONTROL === 'shape' || CONTROL === 'invalidduplicate') mutateOnce('isTickerRow(row) && isShowable(row)', 'isShowable(row)');
  if (CONTROL === 'scores') mutateOnce('if ((r.live || r.finished) && (r.home_score == null || r.away_score == null)) return false;', '');
  if (CONTROL === 'window') mutateOnce("params.append('start_at', `lte.${to}`);", '');
  if (CONTROL === 'http') mutateOnce('if (!res.ok) return [];', 'if (!res.ok) return sortForTicker([...rows.values()]);');
  if (CONTROL === 'json') mutateOnce('await res.json()', 'await res.json().catch(() => [])');
  if (CONTROL === 'object') mutateOnce('if (!Array.isArray(data)) return [];', 'if (!Array.isArray(data)) return sortForTicker([...rows.values()]);');
  if (CONTROL === 'network') mutateOnce(
    'headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },\n      });',
    'headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },\n      }).catch(() => new Response("[]", { status: 200 }));',
  );
  if (CONTROL === 'empty') mutateOnce('if (data.length === 0) return sortForTicker([...rows.values()]);', 'if (data.length === 0) return [];');
  if (CONTROL === 'budget') mutateOnce('page < 10', 'page < 11');
  if (CONTROL === 'unknown') mutateOnce('if (Object.prototype.hasOwnProperty.call(Object.prototype, row.sport!)) return false;', 'if (!Object.prototype.hasOwnProperty.call(SPORT_TAG, row.sport!)) return false;');
  if (CONTROL === 'reserved') mutateOnce('if (Object.prototype.hasOwnProperty.call(Object.prototype, row.sport!)) return false;', '');
  if (CONTROL === 'status') mutateOnce("if (row.status_long != null && typeof row.status_long !== 'string') return false;", "if (!row.status_long || typeof row.status_long !== 'string') return false;");
  if (CONTROL === 'metadata') mutateOnce('[row.id, row.sport, row.home, row.away, row.start_at]', '[row.id, row.sport, row.home, row.away, row.start_at, row.league, row.status_short, row.updated_at]');
  if (CONTROL === 'update') mutateOnce('if (isTickerRow(row) && isShowable(row)) rows.set(row.id, row);', 'if (isTickerRow(row) && isShowable(row) && !rows.has(row.id)) rows.set(row.id, row);');
  if (CONTROL === 'boundary') mutateOnce('page < 10', 'page < 9');
  if (CONTROL === 'partial') mutateOnce('offset += data.length;\n    }\n    return [];', 'offset += data.length;\n    }\n    return sortForTicker([...rows.values()]);');
  globalThis.fetch = async () => {
    importTransportErrors.push('score module attempted a request during import');
    throw new Error('score module must not request data during import');
  };
  const bundle = path.join(temp, 'live-score-query.mjs');
  await build({
    stdin: { contents: source, sourcefile: 'liveScores.ts', resolveDir: path.join(ROOT, 'src/lib'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'silent',
    plugins: [{ name: 'score-query-boundary', setup(builder) {
      builder.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'constants', namespace: 'score-query' }));
      builder.onLoad({ filter: /.*/, namespace: 'score-query' }, () => ({
        contents: `export const SUPABASE_URL = ${JSON.stringify(ORIGIN)};
          export const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(KEY)};`, loader: 'js',
      }));
    } }],
  });
  const { fetchLiveScores } = await import(pathToFileURL(bundle).href);
  if (importTransportErrors.length) throw new Error(importTransportErrors.join('; '));

  async function probe(sourceRows = [], options = {}) {
    const requests = [];
    const transportErrors = [];
    globalThis.fetch = async (input, init = {}) => {
      try {
        const url = new URL(String(input));
        const limit = Number(url.searchParams.get('limit') ?? 1000);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const headers = new Headers(init.headers);
        const request = {
          origin: url.origin, pathname: url.pathname, method: init.method || 'GET',
          select: url.searchParams.get('select'), order: url.searchParams.get('order'),
          limit, offset, window: url.searchParams.getAll('start_at'),
          apikey: headers.get('apikey'), authorization: headers.get('Authorization'),
        };
        requests.push(request);
        if (requests.length > 12) throw new Error('mock safety stop: query exceeded twelve requests');
        if (request.origin !== ORIGIN || request.pathname !== '/rest/v1/live_scores' || request.method !== 'GET') {
          throw new Error('query attempted an unexpected endpoint or write');
        }
        if (request.apikey !== KEY || request.authorization !== `Bearer ${KEY}`) throw new Error('query changed its public authorization boundary');
        const allowed = ['select', 'order', 'limit', 'offset', 'start_at'];
        if ([...url.searchParams.keys()].some(key => !allowed.includes(key))) throw new Error('query supplied an unexpected filter');
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000 || !Number.isSafeInteger(offset) || offset < 0) {
          throw new Error('query supplied an invalid limit or offset');
        }
        if (requests.length === options.failAt) {
          if (options.failure === 'network') return Promise.reject(new Error('synthetic network rejection'));
          if (options.failure === 'http') return new Response('{"message":"synthetic failure"}', { status: 503 });
          if (options.failure === 'json') return new Response('{', { status: 200 });
          if (options.failure === 'object') return new Response('{"rows":[]}', { status: 200 });
          throw new Error('unknown mock failure scenario');
        }
        let candidates = sourceRows;
        if (options.endless) {
          candidates = Array.from({ length: limit }, (_, i) => fixture(offset + i, { start_at: NOW.toISOString() }));
        } else if (!options.raw) {
          candidates = sourceRows.filter(row => request.window.every(bound => {
            if (bound.startsWith('gte.')) return row.start_at >= bound.slice(4);
            if (bound.startsWith('lte.')) return row.start_at <= bound.slice(4);
            throw new Error('query supplied an unrecognized time filter');
          })).sort((a, b) => a.start_at.localeCompare(b.start_at) || (
            request.order === 'start_at.asc,id.asc' || requests.length % 2 === 1
              ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
          ));
        }
        const cap = Math.min(limit, options.cap ?? limit);
        const page = options.endless ? candidates : candidates.slice(offset, offset + cap);
        return new Response(JSON.stringify(page), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Content-Range': page.length ? `${offset}-${offset + page.length - 1}/*` : '*/*' },
        });
      } catch (error) {
        transportErrors.push(String(error));
        throw error;
      }
    };
    const rows = await fetchLiveScores(NOW);
    // Production catches fetch errors. Mock protocol failures must still fail
    // the harness as errors, never masquerade as an expected empty result.
    if (transportErrors.length) throw new Error(`TRANSPORT_ERRORS: ${transportErrors.join('; ')}`);
    return { rows, requests };
  }

  const cases = [
    ['later live sports', async () => {
      const all = fixtures(132);
      all[130] = fixture(130, { sport: 'nfl', live: true, finished: false, status_short: 'LIVE', status_long: 'Live' });
      all[131] = fixture(131, { sport: 'nba', live: true, finished: false, status_short: 'LIVE', status_long: 'Live' });
      const { rows } = await probe(all);
      console.log(`  later-live fixture: ${all.length} rows, returned ${rows.length}, live ${rows.filter(row => row.live).length}`);
      assert.deepEqual({ ids: ids(rows), sports: [...new Set(rows.map(row => row.sport))] }, {
        ids: ids([all[130], all[131], ...all.slice(0, 130)]), sports: ['nfl', 'nba', 'soccer'],
      }, 'LATE_LIVE_IDS');
    }],
    ['request shape', async () => {
      const { rows, requests } = await probe();
      assert.deepEqual({ rows, requests }, { rows: [], requests: [{
        origin: ORIGIN, pathname: '/rest/v1/live_scores', method: 'GET', select: '*',
        order: 'start_at.asc,id.asc', limit: 200, offset: 0, window: WINDOW,
        apikey: KEY, authorization: `Bearer ${KEY}`,
      }] }, 'REQUEST_SHAPE');
    }],
    ['multiple full pages', async () => {
      const all = fixtures(405);
      const { rows, requests } = await probe(all);
      assert.deepEqual({ ids: ids(rows), offsets: requests.map(request => request.offset) }, {
        ids: ids(all), offsets: [0, 200, 400, 405],
      }, 'MULTIPAGE_IDS');
    }],
    ['server page cap', async () => {
      const all = fixtures(73);
      const { rows, requests } = await probe(all, { cap: 17 });
      assert.deepEqual({ ids: ids(rows), offsets: requests.map(request => request.offset) }, {
        ids: ids(all), offsets: [0, 17, 34, 51, 68, 73],
      }, 'SERVER_CAP_IDS');
    }],
    ['raw offsets after rejected rows', async () => {
      const a = fixture(0), b = fixture(1), c = fixture(2);
      const { rows, requests } = await probe([a, { ...a, id: 'rejected-a', home: '' }, b, { ...b, id: 'rejected-b', away: '' }, c], { raw: true, cap: 2 });
      assert.deepEqual({ ids: ids(rows), offsets: requests.map(request => request.offset) }, {
        ids: ids([a, b, c]), offsets: [0, 2, 4, 5],
      }, 'RAW_OFFSETS');
    }],
    ['equal-time ordering', async () => {
      const all = fixtures(205, { start_at: NOW.toISOString() });
      const { rows } = await probe(all);
      assert.deepEqual(ids(rows), ids(all), 'TIED_START_IDS');
    }],
    ['duplicate IDs', async () => {
      const a = fixture(0), b = fixture(1), c = fixture(2);
      const { rows } = await probe([a, b, b, c], { raw: true, cap: 2 });
      assert.deepEqual(rows, [a, b, c], 'UNIQUE_IDS');
    }],
    ['malformed individual rows', async () => {
      const zero = fixture(0, { live: true, finished: false, home_score: 0, away_score: 0 });
      const next = fixture(1, { finished: false, home_score: null, away_score: null });
      const invalid = [null, 7, [], {}, { ...zero, id: 'bad-home', home: 42 },
        { ...zero, id: 'bad-away', away: ['Away'] }, { ...zero, id: 'blank-home', home: '  ' },
        { ...zero, id: 'bad-date', start_at: 'not-a-date' }, { ...zero, id: 'bad-flag', live: 'yes' },
        { ...zero, id: 'bad-score', home_score: '2' }];
      const { rows } = await probe([zero, ...invalid, next], { raw: true, cap: 3 });
      assert.deepEqual(rows, [zero, next], 'MALFORMED_ROWS');
    }],
    ['honest score values', async () => {
      const zero = fixture(0, { home_score: 0, away_score: 0 });
      const next = fixture(1, { finished: false, home_score: null, away_score: null });
      const missing = [fixture(2, { live: true, finished: false, home_score: null }), fixture(3, { away_score: null })];
      const { rows } = await probe([zero, next, ...missing]);
      assert.deepEqual(rows, [next, zero], 'HONEST_SCORES');
    }],
    ['unknown sport', async () => {
      const cricket = fixture(0, { sport: 'cricket' });
      const { rows } = await probe([cricket]);
      assert.deepEqual(rows, [cricket], 'UNKNOWN_SPORT');
    }],
    ['reserved sport names', async () => {
      const valid = fixture(0);
      const reserved = ['constructor', '__proto__', 'toString', 'hasOwnProperty'].map((sport, i) => fixture(i + 1, { sport }));
      const { rows } = await probe([valid, ...reserved]);
      assert.deepEqual(rows, [valid], 'RESERVED_SPORTS');
    }],
    ['optional status text', async () => {
      const omitted = fixture(2);
      delete omitted.status_long;
      const all = [fixture(0, { status_long: '' }), fixture(1, { status_long: null }), omitted];
      const { rows } = await probe(all);
      assert.deepEqual(rows, all, 'OPTIONAL_STATUS');
    }],
    ['unused metadata', async () => {
      const minimal = fixture(0);
      delete minimal.league;
      delete minimal.status_short;
      delete minimal.updated_at;
      const extra = fixture(1, { league: '', status_short: '', updated_at: 'unused synthetic timestamp', fixture_note: 'preserve this field' });
      const { rows } = await probe([minimal, extra]);
      assert.deepEqual(rows, [minimal, extra], 'UNUSED_METADATA');
    }],
    ['malformed duplicate IDs', async () => {
      const a = fixture(0), b = fixture(1);
      const all = [{ ...a, home: 42 }, a, { ...a, away: ['invalid'] }, b];
      const { rows } = await probe(all, { raw: true, cap: 2 });
      assert.deepEqual(rows, [a, b], 'VALID_DUPLICATES');
    }],
    ['updated duplicate values', async () => {
      const a = fixture(0), b = fixture(1);
      const updated = { ...a, home_score: 7, away_score: 3, updated_at: '2026-09-08T16:01:00.000Z' };
      const { rows } = await probe([a, b, updated], { raw: true, cap: 2 });
      assert.deepEqual(rows, [updated, b], 'UPDATED_VALUES');
    }],
    ['fixed query window', async () => {
      const first = fixture(0, { start_at: WINDOW[0].slice(4) });
      const last = fixture(1, { start_at: WINDOW[1].slice(4) });
      const before = fixture(2, { start_at: '2026-09-08T03:59:59.999Z' });
      const after = fixture(3, { start_at: '2026-09-09T12:00:00.001Z' });
      const { rows, requests } = await probe([before, first, last, after], { cap: 1 });
      assert.deepEqual({ ids: ids(rows), windows: requests.map(request => request.window) }, {
        ids: ids([first, last]), windows: [WINDOW, WINDOW, WINDOW],
      }, 'WINDOW_ROWS');
    }],
    ...['http', 'json', 'object', 'network'].map(failure => [`later ${failure} failure`, async () => {
      const { rows, requests } = await probe(fixtures(205), { failAt: 2, failure });
      assert.deepEqual({ rows, calls: requests.length }, { rows: [], calls: 2 }, `FAIL_CLOSED_${failure.toUpperCase()}`);
    }]),
    ['empty completion page', async () => {
      const all = fixtures(200);
      const { rows, requests } = await probe(all);
      assert.deepEqual({ ids: ids(rows), offsets: requests.map(request => request.offset) }, {
        ids: ids(all), offsets: [0, 200],
      }, 'EMPTY_PAGE_END');
    }],
    ['request budget', async () => {
      const { rows, requests } = await probe([], { endless: true });
      assert.deepEqual({ rows: rows.length, limits: requests.map(request => request.limit) }, {
        rows: 0, limits: Array(10).fill(200),
      }, 'REQUEST_BUDGET');
    }],
    ['budget boundary completes', async () => {
      const all = fixtures(1800, { start_at: NOW.toISOString() });
      const { rows, requests } = await probe(all);
      assert.deepEqual({ ids: ids(rows), offsets: requests.map(request => request.offset) }, {
        ids: ids(all), offsets: Array.from({ length: 10 }, (_, i) => i * 200),
      }, 'BUDGET_COMPLETES');
    }],
    ['budget boundary refuses partial', async () => {
      const { rows, requests } = await probe(fixtures(1801, { start_at: NOW.toISOString() }));
      assert.deepEqual({ rows: rows.length, offsets: requests.map(request => request.offset) }, {
        rows: 0, offsets: Array.from({ length: 10 }, (_, i) => i * 200),
      }, 'BUDGET_PARTIAL');
    }],
  ];
  const selected = CONTROL ? cases.filter(([name]) => name === controls[CONTROL][0]) : cases;
  assert.equal(selected.length, CONTROL ? 1 : 24, 'the expected cases must execute');
  for (const [name, run] of selected) {
    try {
      await run();
      console.log(`PASS: ${name}`);
    } catch (error) {
      if (!(error instanceof AssertionError)) throw error;
      const failure = error.message.split('\n')[0];
      failures.push({ case: name, failure });
      console.log(`FAIL: ${name}: ${failure}`);
    }
  }
  if (CONTROL) {
    assert.deepEqual(failures, [{ case: controls[CONTROL][0], failure: controls[CONTROL][1] }], 'control must fail only its exact intended assertion');
    console.log(`simLiveScoreQuery: control ${CONTROL} proved ${controls[CONTROL][1]}`);
  } else if (failures.length) {
    console.error(`simLiveScoreQuery: ${failures.length}/${cases.length} cases failed: ${JSON.stringify(failures)}`);
    process.exitCode = 1;
  } else console.log(`simLiveScoreQuery: all ${cases.length} cases passed`);
} finally {
  globalThis.fetch = originalFetch;
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()), 'cleanup must stay inside the OS temp directory');
  assert.ok(path.basename(temp).startsWith('dukb-live-score-query-'), 'cleanup must target this harness directory');
  fs.rmSync(temp, { recursive: true, force: true });
}
