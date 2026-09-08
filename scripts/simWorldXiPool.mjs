/** Round 539: actual World XI fetch against synthetic query responses.
 * No database or network. SIM_WORLD_XI_POOL_CONTROL=partial restores the
 * old required-page omission; optional makes optional history mandatory.
 * Runtime errors must fail instead of satisfying a negative control.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { worldXiPoolFixture } from './lib/worldXiPoolFixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_WORLD_XI_POOL_CONTROL || '';
const controls = {
  partial: ['      if (r.error || !r.data) return null;\n      rows.push(...(r.data as PoolRow[]));',
    '      if (!r.error && r.data) rows.push(...(r.data as PoolRow[]));'],
  optional: ['    const playedByName = new Map', '    if (verifiedRes.error) return null;\n    const playedByName = new Map'],
  runtime: ['  try {\n    const cols =', "  throw new Error('Unexpected World XI runtime control');\n  try {\n    const cols ="],
};
if (CONTROL && !Object.hasOwn(controls, CONTROL)) throw new Error(`Unknown control: ${CONTROL}`);
const parent = fs.realpathSync(os.tmpdir());
const temp = fs.mkdtempSync(path.join(parent, 'dukb-world-xi-pool-'));
const originalFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error('Unexpected network request'); };
try {
  let source = fs.readFileSync(path.join(ROOT, 'src/lib/worldXi.ts'), 'utf8').replaceAll('\r\n', '\n');
  if (CONTROL) {
    const [from, to] = controls[CONTROL];
    assert.equal(source.split(from).length - 1, 1, 'Control must replace one exact source anchor');
    assert.notEqual(from, to);
    source = source.replace(from, to);
    console.log(`CONTROL ${CONTROL}: changed one exact source anchor in memory`);
  }
  const responses = new Map(), requests = [];
  const ok = data => ({ error: null, data });
  const fixture = worldXiPoolFixture();
  globalThis.__worldXiFixtureClient = {
    from(table) {
      let year, range;
      const query = {
        select: () => query, gt: () => query, order: () => query,
        eq: (column, value) => { assert.equal(column, 'year'); year = value; return query; },
        range: (start, end) => { range = [start, end]; return query; },
        limit: () => query,
        then(resolve, reject) {
          const key = table === 'player_verified_positions' ? 'verified' : year === 2025 ? 'previous' : `current:${range?.[0]}`;
          assert.ok(responses.has(key), `Unexpected query: ${table}/${year}/${range}`);
          requests.push(key);
          const result = responses.get(key);
          return (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)).then(resolve, reject);
        },
      };
      assert.ok(['player_market_values', 'player_verified_positions'].includes(table));
      return query;
    },
  };
  const bundle = path.join(temp, 'worldXi.mjs');
  await build({
    stdin: { contents: source, sourcefile: path.join(ROOT, 'src/lib/worldXi.ts'), resolveDir: path.join(ROOT, 'src/lib'), loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'silent',
    tsconfig: path.join(ROOT, 'tsconfig.app.json'),
    plugins: [{ name: 'local-world-xi-client', setup(builder) {
      builder.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'fixture-client', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabase = globalThis.__worldXiFixtureClient;' }));
    } }],
  });
  const { fetchWorldXiPool, drawCountries } = await import(pathToFileURL(bundle).href);
  function reset() {
    requests.length = 0;
    responses.clear();
    for (let i = 0; i < 8; i++) responses.set(`current:${i * 1000}`, ok(fixture.current.slice(i * 1000, (i + 1) * 1000)));
    responses.set('previous', ok(fixture.previous));
    responses.set('verified', ok(fixture.verified));
  }
  const required = [...Array.from({ length: 8 }, (_, i) => `current:${i * 1000}`), 'previous'];
  const cases = [];
  const add = (name, fn, control = '') => cases.push({ name, fn, control });
  add('complete pool retains current players, previous extras and optional positions', async () => {
    const pool = await fetchWorldXiPool();
    assert.equal(pool?.players.length, 2161);
    assert.equal(pool.countries.length, 12);
    assert.equal(pool.players.find(p => p.name === fixture.current[1000].player_name)?.club, 'Fixture Current Club');
    assert.ok(pool.players.some(p => p.name === 'Fixture Previous Extra'));
    assert.deepEqual(pool.players.find(p => p.name === fixture.current[60].player_name)?.positionsPlayed, ['RW']);
    assert.deepEqual([...requests].sort(), [...required, 'verified'].sort());
    const slots = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'RM', 'LM', 'ST', 'ST'].map(label => ({ label, allowed: [label] }));
    assert.equal(new Set(drawCountries({ name: 'Fixture Formation', slots }, pool)).size, 11);
  });
  for (const key of required) {
    for (const kind of ['error', 'null']) add(`${key} ${kind} refuses a partial pool`, async () => {
      responses.set(key, kind === 'error' ? { error: { message: 'Synthetic query failure' }, data: [] } : ok(null));
      const pool = await fetchWorldXiPool();
      assert.ok(pool === null, 'REQUIRED PAGE: incomplete player pool must be rejected');
    }, 'partial');
  }
  add('error accompanied by rows is still a failed required page', async () => {
    responses.set('current:1000', { error: { message: 'Synthetic query failure' }, data: fixture.current.slice(1000, 2000) });
    assert.ok(await fetchWorldXiPool() === null, 'REQUIRED PAGE: incomplete player pool must be rejected');
  }, 'partial');
  for (const kind of ['error', 'null', 'empty']) add(`optional history ${kind} retains a full primary-position pool`, async () => {
    responses.set('verified', kind === 'error' ? { error: { message: 'Synthetic optional failure' }, data: null } : ok(kind === 'null' ? null : []));
    const pool = await fetchWorldXiPool();
    assert.ok(pool?.players.length === 2161, 'OPTIONAL HISTORY: full primary-position pool must remain playable');
    assert.equal(pool.countries.length, 12);
    assert.ok(pool.players.every(p => !p.positionsPlayed));
  }, kind === 'error' ? 'optional' : '');
  add('retry after a failed middle page restores the newer player and all countries', async () => {
    responses.set('current:1000', { error: { message: 'Synthetic query failure' }, data: null });
    assert.ok(await fetchWorldXiPool() === null, 'REQUIRED PAGE: incomplete player pool must be rejected');
    reset();
    const pool = await fetchWorldXiPool();
    assert.equal(pool?.players.length, 2161);
    assert.equal(pool.players.find(p => p.name === fixture.current[1000].player_name)?.club, 'Fixture Current Club');
    assert.equal(pool.countries.length, 12);
  }, 'partial');
  add('required transport rejection refuses the pool', async () => {
    responses.set('current:1000', new Error('Synthetic rejected transport'));
    assert.equal(await fetchWorldXiPool(), null);
  });
  add('complete undersized pool still refuses play', async () => {
    for (const key of required) responses.set(key, ok([]));
    responses.set('current:0', ok(fixture.current.slice(0, 799)));
    assert.equal(await fetchWorldXiPool(), null);
  });
  add('complete pool with too few qualifying countries still refuses play', async () => {
    for (const key of required) responses.set(key, ok([]));
    responses.set('current:0', ok(fixture.current.slice(0, 1000).map(p => ({ ...p, nationality: 'Fixture Single Nation' }))));
    assert.equal(await fetchWorldXiPool(), null);
  });
  let failures = 0, expected = 0;
  for (const test of cases) {
    reset();
    try {
      await test.fn();
      assert.ok(!CONTROL || test.control !== CONTROL, `Control did not fire: ${test.name}`);
      console.log(`  PASS ${test.name}`);
    } catch (error) {
      const message = CONTROL === 'partial' ? 'REQUIRED PAGE: incomplete player pool must be rejected' : 'OPTIONAL HISTORY: full primary-position pool must remain playable';
      if (CONTROL && test.control === CONTROL && error instanceof assert.AssertionError && error.message === message) {
        expected++; console.log(`  EXPECTED RED ${test.name}`);
      } else { failures++; console.error(`  FAIL ${test.name}: ${error?.stack || error}`); }
    }
  }
  assert.equal(networkAttempts, 0, 'No network request may be attempted');
  assert.equal(failures, 0, 'Unexpected failures');
  assert.equal(expected, cases.filter(test => CONTROL && test.control === CONTROL).length);
  console.log(`PASS: ${cases.length} World XI pool cases; ${expected} exact controlled failures; zero network attempts`);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__worldXiFixtureClient;
  const resolved = fs.realpathSync(temp);
  assert.equal(path.dirname(resolved), parent);
  assert.ok(path.basename(resolved).startsWith('dukb-world-xi-pool-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
