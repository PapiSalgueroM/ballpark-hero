/** Execute the real Build Your XI record handler against generated fixtures.
 * This is an offline policy proof, not a live database or provider probe.
 * The original edge source is reconstructed only by reversing its position map.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.LINEUP_RECORD_POSITIONS_OUT || path.join(ROOT, 'lineup-record-positions-artifacts', 'proof'));
const EDGE = 'supabase/functions/validate-player/index.ts';
const BASE = 'aa564f16019b9e821981d5c4e3e0262312c73b62';
const BASE_SHA = '6d86c56262128569e97c6017ed626def0ca13b47c73ce8a54837b4e8f7cf56d4';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const clone = value => structuredClone(value);
const lf = value => value.replace(/\r\n/g, '\n');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const HELD = [EDGE, 'src/lib/positionFit.ts', 'src/lib/squadShape.ts', 'scripts/simLineupRecordPositions.mjs', 'package.json', 'package-lock.json', 'tsconfig.app.json'];
const heldBefore = HELD.map(file => ({ file, bytes: read(file).length, sha256: sha(read(file)) }));
fs.mkdirSync(OUT, { recursive: true });
function save(file, body) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : json(body));
  const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data);
  return { file, bytes: data.length, sha256: sha(data) };
}
function packed(file, value) {
  const raw = Buffer.from(json(value)), data = zlib.gzipSync(raw, { level: 9 });
  assert.deepEqual(zlib.gunzipSync(data), raw, `whole gzip round trip ${file}`);
  return { ...save(file, data), rawBytes: raw.length, rawSha256: sha(raw) };
}
function replaceOne(body, from, to, label) {
  assert.equal(body.split(from).length - 1, 1, `${label}: unique forward anchor`);
  const changed = body.replace(from, to);
  assert.notEqual(changed, body, `${label}: effective source change`);
  assert.equal(changed.split(to).length - 1, 1, `${label}: unique reverse anchor`);
  assert.equal(changed.replace(to, from), body, `${label}: whole source undo`);
  return changed;
}
const ORIGINAL_MAP = `const POSITION_ROLES: Record<string, string[]> = {
  "goalkeeper": ["GK"],
  "centre back": ["CB"],
  "right back": ["RB", "RWB"],
  "left back": ["LB", "LWB"],
  "defensive midfield": ["CDM", "CM"],
  "central midfield": ["CM", "CDM", "CAM"],
  "attacking midfield": ["CAM", "CM"],
  "right midfield": ["RM", "RW"],
  "left midfield": ["LM", "LW"],
  "right winger": ["RW", "RM"],
  "left winger": ["LW", "LM"],
  "second striker": ["ST", "CF", "CAM"],
  "centre forward": ["ST", "CF"],
};`;
const current = lf(read(EDGE).toString('utf8'));
const mapBlocks = current.match(/const POSITION_ROLES: Record<string, string\[\]> = \{[\s\S]*?\n\};/g);
assert.equal(mapBlocks?.length, 1, 'one actual position map');
const original = current.replace(mapBlocks[0], ORIGINAL_MAP);
assert.equal(sha(original), BASE_SHA, 'complete reconstructed original aa564 edge source');
const FAULTS = [
  { id: 'narrow-wing', from: '  "left winger": ["LW", "LM", "RW", "RM", "LWB", "RWB"],', to: '  "left winger": ["LW", "LM"],' },
  { id: 'keeper-cross', from: '  "goalkeeper": ["GK"],', to: '  "goalkeeper": ["GK", "CM"],' },
  { id: 'crossrow', from: '            (!pos || roleOf(r).includes(pos)));', to: '            (!pos || rows.some(other => roleOf(other).includes(pos))));' },
];
const report = { status: 'running', scope: 'generated Qzx fixtures; actual compiled frontend and edge handler; no live data or deployed-handler acceptance', base: BASE, originalSha256: sha(original), currentSha256: sha(current), heldBefore, bundles: [], arms: [], controls: [] };
const SOURCE = new Map();

async function bundle(id, subject) {
  const dir = `bundles/${id}`;
  const entry = subject === null
    ? "export { ALL_POSITIONS, checkLineupPick } from './src/lib/positionFit.ts'; export { normalizePosition } from './src/lib/squadShape.ts';\n"
    : "import 'proof-edge-subject';\n";
  const loaded = [];
  const stubServe = 'export const serve = handler => globalThis.__proof.serve(handler);\n';
  const stubClient = 'export const createClient = () => globalThis.__proof.client;\n';
  const record = (key, contents, kind) => {
    const body = Buffer.from(contents); const object = save(`${dir}/inputs/${loaded.length}.txt`, body);
    loaded.push({ key, kind, ...object }); return contents;
  };
  record('record-position-entry.ts', entry, 'entry');
  const plugins = [{ name: 'retained-actual-inputs', setup(b) {
    b.onResolve({ filter: /^proof-edge-subject$/ }, () => ({ path: 'edge', namespace: 'proof' }));
    b.onResolve({ filter: /^https:\/\// }, args => {
      if (args.path === 'https://deno.land/std@0.168.0/http/server.ts') return { path: 'serve', namespace: 'proof' };
      if (args.path === 'https://esm.sh/@supabase/supabase-js@2') return { path: 'client', namespace: 'proof' };
      throw new Error(`unprovided remote import ${args.path}`);
    });
    b.onLoad({ filter: /.*/, namespace: 'proof' }, args => ({ contents: record(`proof:${args.path}`, args.path === 'edge' ? subject : args.path === 'serve' ? stubServe : stubClient, args.path === 'edge' ? 'actual-edge' : 'explicit-stub'), loader: 'ts' }));
    b.onLoad({ filter: /\.[cm]?[jt]sx?$/, namespace: 'file' }, args => ({ contents: record(path.relative(ROOT, args.path).split(path.sep).join('/'), fs.readFileSync(args.path, 'utf8'), 'actual-file'), loader: args.path.endsWith('tsx') ? 'tsx' : args.path.endsWith('ts') ? 'ts' : 'js', resolveDir: path.dirname(args.path) }));
  } }];
  const result = await build({ stdin: { contents: entry, sourcefile: 'record-position-entry.ts', resolveDir: ROOT, loader: 'ts' }, bundle: true, write: false, metafile: true, platform: 'node', target: 'node22', format: 'cjs', outfile: path.join(OUT, dir, 'compiled.cjs'), plugins, logLevel: 'silent' });
  assert.equal(result.outputFiles.length, 1, `${id}: one complete bundle`);
  const code = result.outputFiles[0].contents;
  const metadata = save(`${dir}/metafile.json`, result.metafile);
  const source = save(`${dir}/subject.ts`, subject === null ? entry : subject);
  const compiled = save(`${dir}/compiled.cjs`, code);
  for (const key of Object.keys(result.metafile.inputs)) {
    const relative = key.split(path.sep).join('/');
    assert(loaded.some(row => row.key === relative || path.resolve(ROOT, row.key) === path.resolve(ROOT, relative)), `${id}: retained whole input ${key}`);
  }
  const receipt = { id, source, compiled, metadata, loaded: save(`${dir}/loaded-inputs.json`, loaded) };
  report.bundles.push(receipt); SOURCE.set(id, Buffer.from(code).toString('utf8')); return receipt;
}
function context(extra, tape) {
  const math = Object.create(Math); math.random = () => { tape.push(0.375); return 0.375; };
  class HeldDate extends Date { static now() { return 1791705600000; } }
  const module = { exports: {} };
  return vm.createContext({ module, exports: module.exports, Request, Response, Headers, URL, TextEncoder, TextDecoder, structuredClone, Buffer, Date: HeldDate, Math: math, setInterval: () => 0, setTimeout: callback => { callback(); return 0; }, clearTimeout() {}, ...extra });
}
function loadFrontend() {
  const startup = []; const sandbox = context({}, startup);
  new vm.Script(SOURCE.get('frontend'), { filename: 'frontend.cjs' }).runInContext(sandbox);
  return { api: sandbox.module.exports, startup };
}
const PRIMARY_RAW = { GK: 'Goalkeeper', CB: 'Centre-Back', LB: 'Left-Back', RB: 'Right-Back', LWB: 'Left Wing-Back', RWB: 'Right Wing-Back', CDM: 'Defensive Midfield', CM: 'Central Midfield', CAM: 'Attacking Midfield', LM: 'Left Midfield', RM: 'Right Midfield', LW: 'Left Winger', RW: 'Right Winger', CF: 'Centre-Forward', ST: 'Striker' };
const MAP_RAW = [...Object.values(PRIMARY_RAW), 'Second Striker'];
const flat = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const player = (position, club = 'Real Madrid', nationality = 'England', name = 'Qzx Generated') => ({ player_name: name, name_folded: name.toLowerCase(), position, club, nationality });
const world = (rows, squad = [{ country: 'England', player_name: 'Qzx Generated' }], over = {}) => ({ rows, squad, cache: null, db: 'ok', ai: 'daily', key: true, ...over });
let cases = [];
function scenario(id, body, facts, expected, faults = [], group = 'identity') { cases.push({ id, group, body, facts, expected, faults }); }
function body(slot, nation = false, team = nation ? 'England' : 'Real Madrid') { return { playerName: 'Qzx Generated', teamName: team, isNation: nation, position: slot }; }
function standard(id, raw, oracleRaw, slot, nation, frontend, group) {
  const primary = frontend.normalizePosition(oracleRaw);
  assert(primary, `${id}: canonical frontend position`);
  const check = clone(frontend.checkLineupPick('Qzx Generated', slot, slot, oracleRaw, frontend.normalizePosition));
  const faults = [];
  if (primary === 'LW' && ['RW', 'RM', 'RWB', 'LWB'].includes(slot)) faults.push('narrow-wing');
  if (primary === 'GK' && slot === 'CM') faults.push('keeper-cross');
  scenario(id, body(slot, nation), world([player(raw)]), { kind: check.ok ? 'records' : 'daily', frontend: { primary, raw: oracleRaw, check } }, faults, group);
}
function makeCases(frontend) {
  assert.deepEqual(Array.from(frontend.ALL_POSITIONS).sort(), Object.keys(PRIMARY_RAW).sort(), 'all fifteen actual frontend primaries and slots');
  const keys = Array.from(mapBlocks[0].matchAll(/^  "([^"]+)":/gm), match => match[1]).sort();
  assert.deepEqual(MAP_RAW.map(flat).sort(), keys, 'every actual edge map key has declared normalization fixtures');
  for (const [primary, raw] of Object.entries(PRIMARY_RAW)) for (const slot of frontend.ALL_POSITIONS) for (const nation of [false, true]) standard(`matrix/${nation ? 'nation' : 'club'}/${primary}/${slot}`, raw, raw, slot, nation, frontend, 'matrix');
  for (const raw of MAP_RAW) for (const [variant, value] of [['title', raw], ['case-space', `  ${flat(raw).toUpperCase().replaceAll(' ', '   ')}  `], ['hyphen', flat(raw).replaceAll(' ', '-')]]) for (const slot of frontend.ALL_POSITIONS) for (const nation of [false, true]) standard(`alias/${flat(raw).replaceAll(' ', '-')}/${variant}/${nation ? 'nation' : 'club'}/${slot}`, value, raw, slot, nation, frontend, 'aliases');
  const yes = { kind: 'records' }, daily = { kind: 'daily' };
  scenario('identity/split-club', body('RW'), world([player('Right Winger', 'Getafe CF / Real Madrid')]), yes);
  scenario('identity/wrong-club', body('RW'), world([player('Right Winger', 'Real Madrid Castilla')]), daily);
  scenario('identity/crossrow-outfielder', body('ST'), world([player('Centre-Back'), player('Striker', 'Chelsea FC')]), daily, ['crossrow']);
  scenario('identity/crossrow-keeper', body('RW'), world([player('Goalkeeper'), player('Right Winger', 'Chelsea FC')]), daily, ['crossrow']);
  scenario('identity/wrong-person', body('RW'), world([player('Right Winger', 'Real Madrid', 'England', 'Qzx Different')]), daily);
  scenario('identity/nationality-without-cap', body('RW', true), world([player('Right Winger')], []), daily);
  scenario('identity/cap-without-record', body('RW', true), world([]), daily);
  scenario('identity/wrong-cap-person', body('RW', true), world([player('Right Winger')], [{ country: 'England', player_name: 'Qzx Different' }]), daily);
  scenario('identity/wrong-cap-country', body('RW', true), world([player('Right Winger')], [{ country: 'Brazil', player_name: 'Qzx Generated' }]), daily);
  scenario('identity/country-crossrow', body('RW', true), world([player('Centre-Back'), player('Right Winger', 'Real Madrid', 'Brazil')]), daily);
  scenario('identity/captain-marker', body('RW', true), world([player('Right Winger')], [{ country: 'England', player_name: 'Qzx Generated ( captain )' }]), yes);
  scenario('identity/usa-alias', body('RW', true, 'USA'), world([player('Right Winger', 'Real Madrid', 'United States')], [{ country: 'United States', player_name: 'Qzx Generated' }]), yes);
  scenario('identity/korea-alias', body('RW', true, 'South Korea'), world([player('Right Winger', 'Real Madrid', 'Korea, South')], [{ country: 'South Korea', player_name: 'Qzx Generated' }]), yes);
  for (const position of [null, '', 'Unknown Position']) scenario(`identity/unknown-position-${String(position)}`, body('CM'), world([player(position)]), daily);
  scenario('identity/unknown-slot', body('ZZ'), world([player('Right Winger')]), daily);
  scenario('identity/position-omitted-held', { playerName: 'Qzx Generated', teamName: 'Real Madrid', isNation: false }, world([player(null)]), yes);
  const refused = { valid: false, reason: 'Generated stored refusal.', fullName: 'Qzx Generated' };
  const accepted = { valid: true, reason: 'Generated stored acceptance.', fullName: 'Qzx Generated' };
  scenario('cache/yes-priority-held', body('CM'), world([player('Goalkeeper')], [], { cache: accepted }), { kind: 'cached', verdict: accepted }, [], 'cache');
  scenario('cache/refusal-overturned', body('ST'), world([player('Centre-Forward')], [], { cache: refused }), yes, [], 'cache');
  scenario('cache/refusal-kept', body('ST'), world([], [], { cache: refused }), { kind: 'cached', verdict: refused }, [], 'cache');
  scenario('cache/read-error-records', body('ST'), world([player('Centre-Forward')], [], { db: 'cache-throw' }), yes, [], 'cache');
  scenario('cache/write-error-records', body('ST'), world([player('Centre-Forward')], [], { db: 'write-throw' }), yes, [], 'cache');
  for (const db of ['throw', 'error']) scenario(`errors/database-${db}`, body('ST'), world([player('Centre-Forward')], [], { db }), daily, [], 'errors');
  scenario('errors/missing-records', body('ST'), world([]), daily, [], 'errors');
  for (const ai of ['throw', '500', 'garbage']) scenario(`errors/ai-${ai}`, body('ST'), world([], [], { ai }), { kind: 'unverified', calls: 1 }, [], 'errors');
  scenario('errors/no-key', body('ST'), world([], [], { key: false }), { kind: 'unverified', calls: 0 }, [], 'errors');
}
function matchesLike(value, pattern) { return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('%', '.*').replaceAll('_', '.')}$`).test(value); }
function engine(id, noKey = false) {
  let handler = null, active = null; const startupDraws = [], activeTape = [];
  const client = { from(table) {
    const ops = []; const builder = new Proxy({}, { get(_, prop) {
      if (prop === 'then') return (resolve, reject) => execute().then(resolve, reject);
      if (prop === 'maybeSingle' || prop === 'single') return () => { ops.push([prop]); return execute(); };
      return (...args) => { ops.push([prop, ...clone(args)]); return builder; };
    } });
    async function execute() {
      const query = { table, ops: clone(ops) }; active.queries.push(query);
      const facts = active.facts;
      if (facts.db === 'throw' || (facts.db === 'cache-throw' && table === 'ai_validation_cache' && !ops.some(op => op[0] === 'upsert')) || (facts.db === 'write-throw' && ops.some(op => op[0] === 'upsert'))) { query.thrown = 'generated database failure'; throw new Error(query.thrown); }
      if (facts.db === 'error') { query.result = { data: null, error: { message: 'generated database error' } }; return clone(query.result); }
      let data = table === 'player_market_values' ? clone(facts.rows) : table === 'national_team_squads' ? clone(facts.squad) : null;
      if (table === 'ai_validation_cache') data = ops.some(op => op[0] === 'upsert') ? null : facts.cache ? { verdict: clone(facts.cache) } : null;
      if (Array.isArray(data)) {
        for (const [op, key, value] of ops) {
        if (op === 'eq') data = data.filter(row => row[key] === value);
        if (op === 'like') data = data.filter(row => matchesLike(String(row[key] ?? ''), value));
        if (op === 'limit') data = data.slice(0, key);
        }
        const selected = ops.find(op => op[0] === 'select')?.[1];
        if (selected && selected !== '*') data = data.map(row => Object.fromEntries(selected.split(',').map(column => [column.trim(), row[column.trim()]])));
      }
      query.result = { data, error: null }; return clone(query.result);
    }
    return builder;
  } };
  const sandbox = context({ __proof: { serve(value) { assert.equal(handler, null, `${id}: serve once`); handler = value; }, client }, Deno: { env: { get(key) { if (key === 'GEMINI_API_KEY') return noKey ? undefined : 'generated-test-key'; if (key === 'SUPABASE_URL') return 'http://generated.invalid'; if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'generated-service-key'; return undefined; } } }, console: { log(...args) { if (active) active.logs.push(args.map(String)); } }, fetch: async (url, options) => {
    active.ai.push({ url, options: clone(options) });
    if (active.facts.ai === 'throw') throw new Error('generated model failure');
    if (active.facts.ai === '500') return new Response('generated upstream error', { status: 500 });
    if (active.facts.ai === 'garbage') return new Response(json({ choices: [{ message: { content: 'No verdict available.' } }] }), { status: 200 });
    return new Response('requests_per_day: generated quota refusal', { status: 429 });
  } }, startupDraws);
  new vm.Script(SOURCE.get(id), { filename: 'edge.cjs' }).runInContext(sandbox);
  assert.equal(typeof handler, 'function', `${id}: actual handler captured`);
  sandbox.Math.random = () => { activeTape.push(0.375); return 0.375; };
  return { startupDraws, async ask(spec, index) {
    active = { facts: clone(spec.facts), queries: [], ai: [], logs: [] }; activeTape.length = 0;
    const fixtureBefore = clone(active.facts), input = clone(spec.body);
    const req = new Request('http://generated.invalid/validate-player', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://douknowball.com', 'x-forwarded-for': `10.42.${index >> 8}.${index & 255}` }, body: json(input) });
    let status = null, headers = [], raw = null, answer = null, error = null;
    try { const response = await handler(req); status = response.status; headers = Array.from(response.headers); raw = await response.text(); answer = JSON.parse(raw); }
    catch (caught) { error = { name: caught.name, message: caught.message, stack: caught.stack }; }
    return { id: spec.id, input, fixtureBefore, fixtureAfter: clone(active.facts), status, headers, raw, answer, error, queries: clone(active.queries), ai: clone(active.ai), logs: clone(active.logs), draws: [...activeTape] };
  } };
}
function findings(spec, row) {
  if (row.error) return ['handler-threw'];
  const errors = []; const add = (condition, name) => { if (!condition) errors.push(name); };
  add(row.status === 200, 'http');
  if (spec.expected.kind === 'records') { add(row.answer.valid === true && row.answer.source === 'records' && row.answer.fullName === spec.body.playerName, 'record-verdict'); add(row.ai.length === 0, 'no-model'); }
  else if (spec.expected.kind === 'daily') { add(row.answer.valid === false && row.answer.unverified === true && row.answer.exhausted === true, 'daily-fail-closed'); add(row.ai.length === 1, 'model-reached-once'); }
  else if (spec.expected.kind === 'cached') { add(json(row.answer) === json({ ...spec.expected.verdict, cached: true }), 'cache-priority'); add(row.ai.length === 0, 'no-model'); }
  else { add(row.answer.valid === false && row.answer.unverified === true && row.answer.exhausted === false, 'error-fail-closed'); add(row.ai.length === spec.expected.calls, 'model-calls'); }
  return errors;
}
async function runArm(id) {
  const actual = engine(id), rows = [];
  for (let index = 0; index < cases.length; index++) {
    const spec = cases[index], reader = spec.facts.key === false ? engine(id, true) : actual;
    const row = await reader.ask(spec, index + 1); row.failures = findings(spec, row); if (reader !== actual) row.separateStartupDraws = reader.startupDraws; rows.push(row);
  }
  const arm = { id, startupDraws: actual.startupDraws, rows: packed(`arms/${id}.json.gz`, rows), requests: rows.length, aiCalls: rows.reduce((count, row) => count + row.ai.length, 0), failures: rows.filter(row => row.failures.length).map(row => ({ id: row.id, failures: row.failures })) };
  report.arms.push(arm); return rows;
}

try {
  await bundle('frontend', null); const frontend = loadFrontend(); report.frontendStartupDraws = frontend.startup;
  makeCases(frontend.api);
  report.cases = packed('cases.json.gz', cases);
  await bundle('original', original); await bundle('current', current);
  for (const fault of FAULTS) {
    const changed = replaceOne(current, fault.from, fault.to, fault.id);
    report.controls.push({ id: fault.id, from: fault.from, to: fault.to, before: save(`patches/${fault.id}/before.ts`, current), fault: save(`patches/${fault.id}/fault.ts`, changed), undo: save(`patches/${fault.id}/undo.ts`, changed.replace(fault.to, fault.from)) });
    await bundle(fault.id, changed);
  }
  await bundle('whole-undo', current);
  assert.equal(report.bundles.find(row => row.id === 'current').compiled.sha256, report.bundles.find(row => row.id === 'whole-undo').compiled.sha256, 'complete compiled undo');
  const allRows = new Map();
  for (const id of ['original', 'current', ...FAULTS.map(fault => fault.id), 'whole-undo']) allRows.set(id, await runArm(id));
  const oldRows = allRows.get('original'), healthy = allRows.get('current');
  for (const fault of FAULTS) {
    const rows = allRows.get(fault.id), expected = cases.filter(row => row.faults.includes(fault.id)).map(row => row.id);
    assert(expected.length > 0, `${fault.id}: declared effective failure cases`);
    const actual = rows.filter(row => row.failures.length).map(row => row.id);
    report.controls.find(row => row.id === fault.id).expectedFailures = expected;
    report.controls.find(row => row.id === fault.id).actualFailures = actual;
    assert.deepEqual(actual, expected, `${fault.id}: exact failure map`);
    for (let i = 0; i < rows.length; i++) if (!expected.includes(rows[i].id)) assert.deepEqual(rows[i], healthy[i], `${fault.id}: complete unrelated outcome ${rows[i].id}`);
    for (const id of expected) assert.notDeepEqual(rows.find(row => row.id === id), healthy.find(row => row.id === id), `${fault.id}: actual changed outcome ${id}`);
  }
  const undo = allRows.get('whole-undo'); assert.deepEqual(undo, healthy, 'complete runtime undo');
  assert.deepEqual(report.arms.find(row => row.id === 'current').failures, [], 'actual current edge matches frontend and safety cases');
  assert.deepEqual(report.arms.find(row => row.id === 'whole-undo').failures, [], 'undo healthy');
  const byId = (rows, id) => rows.find(row => row.id === id);
  for (const id of ['matrix/club/LW/RW', 'matrix/nation/CB/LB']) { assert.equal(byId(oldRows, id).ai.length, 1, `${id}: original asks unavailable model`); assert.equal(byId(healthy, id).ai.length, 0, `${id}: current settles from records`); }
  const second = 'alias/second-striker/title/club/CAM';
  assert.equal(byId(oldRows, second).answer.valid, true, 'original second-striker CAM exception observed');
  assert.equal(byId(healthy, second).answer.valid, false, 'current second-striker CAM follows frontend refusal');
  report.measurements = { canonicalPairs: 450, aliasRequests: cases.filter(row => row.group === 'aliases').length, boundaryRequests: cases.filter(row => !['matrix', 'aliases'].includes(row.group)).length, originalAiCalls: report.arms[0].aiCalls, currentAiCalls: report.arms[1].aiCalls, newlyRecordVerifiedRequests: healthy.filter((row, i) => row.answer.source === 'records' && oldRows[i].ai.length === 1).length, narrowedRecordRequests: healthy.filter((row, i) => row.answer.valid !== true && oldRows[i].answer.source === 'records').length };
  report.heldAfter = HELD.map(file => ({ file, bytes: read(file).length, sha256: sha(read(file)) })); assert.deepEqual(report.heldAfter, heldBefore, 'all actual source/package bodies held');
  report.status = 'pass';
  save('report.json', report);
  console.log(`Actual frontend and handler: ${report.measurements.canonicalPairs} canonical club/nation pairs, ${report.measurements.aliasRequests} normalized-map requests.`);
  console.log(`Generated identity/cache/error cases: ${report.measurements.boundaryRequests}; original model calls ${report.measurements.originalAiCalls}, current ${report.measurements.currentAiCalls}.`);
  console.log(`Measured newly verified requests ${report.measurements.newlyRecordVerifiedRequests}; narrowed requests ${report.measurements.narrowedRecordRequests}; three effective faults and whole source/compiled/runtime undo.`);
  console.log('PASS simLineupRecordPositions');
} catch (error) {
  report.status = 'fail'; report.error = { name: error.name, message: error.message, stack: error.stack }; save('report.json', report); console.error(error.stack); process.exitCode = 1;
}
