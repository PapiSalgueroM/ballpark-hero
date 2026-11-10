/* Remote-only original Soccer Grid evidence from the held handler and fictional reads. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline QA only');
assert(process.env.SOCCER_GRID_FORWARD_RAW, 'Exact RAW evidence destination required');
const receipt = process.env.SIM_OFFLINE_RECEIPT;
assert(receipt, 'Offline receipt required');
assert.equal(statSync(receipt).size, 0);
const root = process.cwd();
const output = path.resolve(root, process.env.SOCCER_GRID_FORWARD_RAW);
assert(output.startsWith(root + path.sep), 'RAW stays inside isolated checkout');

const edgePath = 'supabase/functions/soccer-grid-validate/index.ts';
const bytes = readFileSync(path.join(root, edgePath));
const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.deepEqual([bytes.length, blob, sha256], [52478, 'dfdad23cf37e62791fa132ac6b85811cfc9950a9',
  'cf122ea239b6c9e0102a403ec747cfed219ee8ad3413ecc41fc0cee64c8fc856'], 'Exact held original Edge bytes');
assert.equal(ts.version, '5.8.3', 'Exact locked TypeScript');
const serveModule = 'https://deno.land/std@0.168.0/http/server.ts';
const clientModule = 'https://esm.sh/@supabase/supabase-js@2';
const edgeText = bytes.toString('utf8');
const parsed = ts.createSourceFile(edgePath, edgeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.deepEqual(parsed.parseDiagnostics, []);
const imports = parsed.statements.filter(ts.isImportDeclaration).map(node => {
  assert(ts.isStringLiteral(node.moduleSpecifier));
  const clause = node.importClause;
  assert(clause && !clause.isTypeOnly && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings));
  const [binding] = clause.namedBindings.elements;
  assert.equal(clause.namedBindings.elements.length, 1);
  assert(!binding.propertyName && !binding.isTypeOnly);
  return [node.moduleSpecifier.text, binding.name.text];
});
assert.deepEqual(imports, [[serveModule, 'serve'], [clientModule, 'createClient']]);
const transpiled = ts.transpileModule(edgeText, {
  fileName: edgePath,
  reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.deepEqual(transpiled.diagnostics ?? [], [], 'Clean locked transpilation');
const script = new vm.Script(transpiled.outputText, { filename: edgePath });
const source = { path: edgePath, blob, sha256, typescript: ts.version, imports: imports.map(([url]) => url) };

const name = 'Fixture Arden Vale';
const foldedName = 'fixture arden vale';
const forward = 'Forward (FWD)';
const winner = '2014 World Cup Winner';
const positionCols = 'player_name, club, nationality, position, first_year, last_year, debut_year, debut_age';
const origin = 'https://douknowball.com';
const fixtureOrigin = 'https://fixture.invalid';
const env = {
  GEMINI_API_KEY: undefined,
  LOVABLE_API_KEY: undefined,
  SUPABASE_URL: fixtureOrigin,
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-grid-fixture',
};
const accepted = { valid: true, reason: 'Verified from career records.', fullName: name };
const unverified = { valid: false, unverified: true, exhausted: false,
  reason: "Couldn't verify your answer right now, please try again.", fullName: null };
const squad = [{ player_name: name, position: 'FW' }, ...Array.from({ length: 22 }, (_, index) => ({
  player_name: 'Fictional Reserve ' + String(index + 1).padStart(2, '0'), position: 'MF',
}))];
const stint = position => ({ player_name: name, club: 'Fictional Vale Club', nationality: 'Germany',
  position, first_year: 2009, last_year: 2018, debut_year: 2009, debut_age: 20 });
const input = (id, kind, rowAttribute, colAttribute, stints, members, valid) => ({
  row: { id, kind, request: { playerName: name, rowAttribute, colAttribute }, fixture: { stints, squad: members } },
  valid,
});
const inputs = [
  input('null-stint-row', 'variant', forward, winner, [stint(null)], squad, false),
  input('null-stint-column', 'variant', winner, forward, [stint(null)], squad, false),
  input('absent-stints', 'control', forward, winner, [], squad, true),
  input('complete-position', 'control', forward, winner, [stint('Forward')], squad, true),
  input('wrong-stint-position', 'control', forward, winner, [stint('Midfielder')], squad, false),
  input('incomplete-squad', 'control', forward, winner, [], squad.slice(0, 14), false),
];

const copy = value => JSON.parse(JSON.stringify(value));
async function runCase({ row, valid }) {
  const cacheKey = [foldedName, row.request.rowAttribute.toLowerCase(), row.request.colAttribute.toLowerCase()].join('|');
  const reads = [
    { table: 'ai_validation_cache', calls: [['select', 'verdict'], ['eq', 'game', 'soccer-grid'],
      ['eq', 'cache_key', cacheKey], ['maybeSingle']], data: null, error: null },
    { table: 'soccer_player_club_stints', calls: [['select', positionCols], ['eq', 'name_folded', foldedName], ['limit', 60]],
      data: row.fixture.stints, error: null },
    { table: 'world_cup_players', calls: [['select', 'player_name, position'], ['eq', 'world_cup_year', 2014],
      ['eq', 'nationality', 'Germany'], ['limit', 40]], data: row.fixture.squad, error: null },
  ];
  const writes = valid ? [{ table: 'ai_validation_cache',
    calls: [['upsert', { game: 'soccer-grid', cache_key: cacheKey, verdict: accepted }]], data: null, error: null }] : [];
  const operations = [...reads, ...writes];
  const faults = [];
  const active = { ...row, envReads: [], clientCalls: 0, serveCalls: 0, reads: [], writes: [], fetchCalls: 0, logs: [] };
  let handle;
  let started = 0;
  function guard(ok, detail) {
    if (ok) return;
    faults.push(detail);
    throw new Error(detail);
  }
  function from(table) {
    const step = operations[started++];
    guard(step?.table === table, 'Unexpected table or order for ' + row.id + ': ' + table);
    const calls = [];
    const end = (method, args) => {
      calls.push([method, ...copy(args)]);
      guard(isDeepStrictEqual(calls, step.calls), 'Unexpected mocked query for ' + row.id + ': ' + JSON.stringify(calls));
      const record = { table, calls, data: copy(step.data), error: step.error };
      (method === 'upsert' ? active.writes : active.reads).push(record);
      return Promise.resolve({ data: copy(step.data), error: step.error });
    };
    const query = {
      select: (...args) => { calls.push(['select', ...copy(args)]); return query; },
      eq: (...args) => { calls.push(['eq', ...copy(args)]); return query; },
      maybeSingle: (...args) => end('maybeSingle', args),
      limit: (...args) => end('limit', args),
      upsert: (...args) => end('upsert', args),
    };
    return query;
  }
  const exports = {};
  const logger = level => (...args) => active.logs.push({ level, args: args.map(String) });
  const context = vm.createContext({
    exports, Request, Response,
    console: { log: logger('log'), error: logger('error'), warn: logger('warn') },
    require(specifier) {
      if (specifier === serveModule) return { serve(handler) {
        active.serveCalls++;
        guard(active.serveCalls === 1 && typeof handler === 'function', 'Unexpected handler registration');
        handle = handler;
      } };
      if (specifier === clientModule) return { createClient(url, key) {
        active.clientCalls++;
        guard(active.clientCalls === 1 && url === env.SUPABASE_URL && key === env.SUPABASE_SERVICE_ROLE_KEY,
          'Unexpected synthetic client configuration');
        return { from };
      } };
      guard(false, 'Unexpected import ' + specifier);
    },
    Deno: { env: { get(key) {
      active.envReads.push(key);
      guard(Object.hasOwn(env, key), 'Unexpected environment key ' + key);
      return env[key];
    } } },
    fetch() {
      active.fetchCalls++;
      guard(false, 'Unexpected external fetch');
    },
  });
  script.runInContext(context, { timeout: 5000 });
  assert.equal(typeof handle, 'function', row.id + ' registers the actual handler');
  const response = await handle(new Request(fixtureOrigin + '/functions/v1/soccer-grid-validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(row.request),
  }));
  active.outcome = { status: response.status, contentType: response.headers.get('content-type'),
    allowOrigin: response.headers.get('access-control-allow-origin'), body: await response.json() };
  return { active, expected: { started: operations.length, reads, writes, faults: [], body: valid ? accepted : unverified },
    observed: { started, faults } };
}

const results = [];
for (const item of inputs) results.push(await runCase(item));
const cases = results.map(({ active }) => active);
writeFileSync(output, JSON.stringify({ schema: 'soccer-grid-forward-stint-position-v1', source, cases }) + '\n', { flag: 'wx' });

assert.deepEqual(cases.map(row => row.id),
  ['null-stint-row', 'null-stint-column', 'absent-stints', 'complete-position', 'wrong-stint-position', 'incomplete-squad']);
for (const { active: row, expected, observed } of results) {
  assert.deepEqual(observed, { started: expected.started, faults: expected.faults }, row.id + ' exact mock boundaries');
  assert.deepEqual(row.envReads, Object.keys(env), row.id + ' exact environment reads');
  assert.deepEqual([row.clientCalls, row.serveCalls, row.fetchCalls, row.logs], [1, 1, 0, []], row.id + ' isolated fixture transport');
  assert.deepEqual([row.reads, row.writes], [expected.reads, expected.writes], row.id + ' exact read and synthetic cache evidence');
  assert.deepEqual(row.outcome, { status: 200, contentType: 'application/json', allowOrigin: origin, body: expected.body },
    row.id + ' exact original response');
}
assert.equal(statSync(receipt).size, 0, 'No real transport');
assert.deepEqual(cases.slice(0, 2).map(row => row.outcome.body), [accepted, accepted],
  'SOCCER_GRID_FORWARD_STINT_POSITION: both null-position orientations resolve from a matching winner squad');
