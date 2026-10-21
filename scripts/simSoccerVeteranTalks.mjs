/** Actual money-talk actions, saved reveals and complete copied-source faults. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
assert(process.env.CI, 'Actual gameplay proof runs only in Actions');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SOCCER_VETERAN_TALKS_OUT || '.tmp-fx/soccer-veteran-talks');
const BASE = '40f75cd8351ebd28723431a238dbe2467bc39c5c', BASE_TREE = 'b63f33b6998ca32d5c245a662988b9f07d659cb6';
const ENGINE = 'src/lib/soccerCareerEngine.ts', CONTRACTS = 'src/lib/soccerCareerContracts.ts';
const ENV_EXPRESSION = '{"DEV":false,"PROD":true,"MODE":"production"}';
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const lf = source => source.replaceAll('\r\n', '\n'), json = value => JSON.stringify(value), copy = value => JSON.parse(json(value));
const equal = (actual, expected, message) => assert.equal(json(actual), json(expected), message);
const require = createRequire(path.join(ROOT, 'package.json')), esbuild = require('esbuild');
fs.mkdirSync(path.join(OUT, 'objects'), { recursive: true });
const objects = new Map(), ledger = [];
function retain(bytes) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes), hash = sha(raw);
  if (!objects.has(hash)) { const packed = gzipSync(raw), file = 'objects/' + hash + '.gz'; fs.writeFileSync(path.join(OUT, file), packed); objects.set(hash, { hash, bytes: raw.length, file, packedBytes: packed.length, packedSha256: sha(packed) }); }
  return hash;
}
const valueRef = value => retain(json(value));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
function replaceOnce(source, from, to, label) { assert.equal(source.split(from).length - 1, 1, label + ' exact source anchor'); assert.notEqual(from, to); return source.replace(from, to); }
const head = git('rev-parse', 'HEAD').toString().trim();
assert.equal(git('rev-parse', BASE + '^{tree}').toString().trim(), BASE_TREE);
const heldFiles = [ENGINE, CONTRACTS, 'src/pages/SoccerCareer.tsx', 'src/components/soccer-career/CareerChanceWheel.tsx', 'scripts/simSoccerVeteranTalks.mjs', 'scripts/playSoccerVeteranTalks.mjs', 'package.json', 'package-lock.json'];
const sourceBefore = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const baseCache = new Map();
function original(file) { if (!baseCache.has(file)) baseCache.set(file, git('show', BASE + ':' + file)); return baseCache.get(file); }
// The original handler still performs every catalog, roll and following-phase action.
// Only these three event16 success values are supplied by independent arithmetic.
function oracleSource(source, patches) {
  const line = source.split('\n').find(line => line.includes("rollCareerChance(s, 0.5, 'Contract negotiation', '20% wage raise'"));
  assert.ok(line, 'original event16 handler');
  const next = line.replace("'20% wage raise'", 'globalThis.__talkExpected.hit').replace('Math.round(s.weeklyWage * 1.2)', 'globalThis.__talkExpected.weeklyWage').replace('"📝 Pushed for more, got a raise!"', 'globalThis.__talkExpected.event');
  const changed = replaceOnce(source, line, next, 'independent success terms'), restored = replaceOnce(changed, next, line, 'independent success terms undo');
  assert.equal(restored, source); patches.push({ name: 'independent-success-terms', file: ENGINE, from: line, to: next, before: retain(source), after: retain(changed), restored: retain(restored) }); return changed;
}
const signature = 'export function soccerWageDemand(career: ExtensionCareer) {';
const faultDefinitions = [
  { id: 'policy', file: CONTRACTS, from: "  const weeklyWage = Math.max(career.weeklyWage, soccerExtensionQuote(career, 'renewal').weeklyWage);", to: '  const weeklyWage = Math.round(career.weeklyWage * 1.2);', failures: ['projection', 'copies', 'policy'] },
  { id: 'apps', file: CONTRACTS, from: '  const elite = career.overall >= 90 && form !== undefined && form >= 8 && (last?.apps ?? 0) >= 20;', to: '  const elite = career.overall >= 90 && form !== undefined && form >= 8 && (last?.apps ?? 0) >= 0;', failures: ['projection', 'copies', 'policy'] },
  { id: 'young-text', file: CONTRACTS, from: "    hit: '20% wage raise',", to: "    hit: 'Wrong young result',", failures: ['projection', 'young'] },
  { id: 'draw', file: CONTRACTS, from: signature, to: signature + '\n  Math.random();', failures: ['projection', 'copies', 'policy', 'young', 'other-choices', 'draws'] },
  { id: 'input-mutation', file: CONTRACTS, from: signature, to: signature + '\n  if (career.seasons.length) career.seasons[0].rating += 0.01;', failures: ['projection', 'copies', 'policy', 'young', 'other-choices'] },
  /* Release BF join: Round 1355 (the life chain) made this line also refresh the corrected Life captions; the fault still
     drops only the wage demand refresh of event 16, so the control breaks exactly what it broke before. */
  { id: 'copy-text', file: CONTRACTS, from: '  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved;', to: '  return SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved;', failures: ['copies'] },
];
async function bundle(id, { baseline = false, observed = false, oracle = false, fault = null } = {}) {
  const dir = path.join(OUT, 'bundles', id);
  fs.mkdirSync(dir, { recursive: true });
  const entry = ['engine', 'contracts', 'wheel', 'currency'].map((name, index) => 'export * as ' + name + ' from ' + JSON.stringify(path.join(ROOT, [ENGINE, CONTRACTS, 'src/lib/careerChanceWheel.ts', 'src/lib/soccerCurrency.ts'][index]).replaceAll('\\', '/')) + ';').join('\n');
  const entryFile = path.join(dir, 'entry.ts');
  fs.writeFileSync(entryFile, entry);
  const loaded = [], patches = [];
  let faultApplied = false;
  const result = await esbuild.build({
    stdin: { contents: entry, sourcefile: 'veteran-talks-entry.ts', resolveDir: ROOT, loader: 'ts' },
    outfile: path.join(dir, 'bundle.cjs'), bundle: true, format: 'cjs', platform: 'node',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    define: { 'import.meta.env': ENV_EXPRESSION }, logLevel: 'error', metafile: true,
    plugins: [{ name: 'held-source', setup(build) {
      build.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
        if (!relative.startsWith('src/')) return undefined;
        const raw = baseline ? original(relative) : fs.readFileSync(args.path);
        let served = lf(raw.toString());
        const canonical = served;
        if (fault && relative === fault.file) {
          const before = served;
          served = replaceOnce(served, fault.from, fault.to, fault.id);
          const restored = replaceOnce(served, fault.to, fault.from, fault.id + ' undo');
          assert.equal(restored, before, fault.id + ' complete source undo');
          patches.push({ name: fault.id, file: relative, from: fault.from, to: fault.to, before: retain(before), after: retain(served), restored: retain(restored) });
          faultApplied = true;
        }
        if (oracle && relative === ENGINE) served = oracleSource(served, patches);
        loaded.push({ file: relative, raw: retain(raw), normalized: retain(canonical), served: retain(served), rawSha256: sha(raw), normalizedSha256: sha(canonical), servedSha256: sha(served) });
        return { contents: served, loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (fault) assert.equal(faultApplied, true, fault.id + ' loaded');
  const code = fs.readFileSync(path.join(dir, 'bundle.cjs'), 'utf8');
  loaded.sort((a, b) => a.file.localeCompare(b.file));
  const inputs = Object.keys(result.metafile.inputs).map(file => {
    if (file === 'veteran-talks-entry.ts' || file === '<stdin>') return { file, kind: 'entry', raw: retain(entry), sha256: sha(entry) };
    if (file === '<define:import.meta.env>') return { file, kind: 'configured-define', configuredExpression: ENV_EXPRESSION, expressionSha256: sha(ENV_EXPRESSION) };
    const absolute = path.resolve(ROOT, file);
    const measured = loaded.find(row => path.resolve(ROOT, row.file) === absolute);
    return measured ? { file, kind: 'loaded-source', servedSha256: measured.servedSha256 }
      : { file, kind: 'dependency', raw: retain(fs.readFileSync(absolute)), sha256: sha(fs.readFileSync(absolute)) };
  });
  const metadata = { id, baseline, observed, oracle, fault: fault?.id ?? null, entrySha256: sha(entry), compiledSha256: sha(code), loaded, inputs, patches, metafile: result.metafile };
  write('bundles/' + id + '/receipt.json', metadata);
  fs.writeFileSync(path.join(dir, 'metafile.json'), json(result.metafile));
  return { id, code, metadata };
}
function mulberry(seed) { let n = seed >>> 0; return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function scope(bundle) {
  let tape = [], stacks = [], next = mulberry(1265), currency = 'EUR';
  const math = Object.create(Math); math.random = () => { const value = next(); tape.push(value); stacks.push(new Error('draw').stack); return value; };
  class HeldDate extends Date { constructor(...args) { super(...(args.length ? args : [1800000000000])); } static now() { return 1800000000000; } }
  const context = vm.createContext({ console, process, Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, Math: math, Date: HeldDate,
    module: { exports: {} }, exports: {}, require, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: key => key === 'dukb-soccer-currency' ? currency : null, setItem: () => {}, removeItem: () => {} } });
  vm.runInContext(bundle.code, context, { filename: path.join(OUT, 'bundles', bundle.id, 'bundle.cjs') });
  const exports = context.module.exports, startup = { draws: valueRef(tape), stacks: valueRef(stacks), count: tape.length };
  function run(id, seed, method, input, args = []) {
    tape = []; stacks = []; next = mulberry(seed);
    const subject = copy(input), before = copy(subject), callArgs = copy(args), argsBefore = copy(callArgs);
    context.__talkExpected = expectedDemand(subject); currency = 'EUR';
    let output, error = null;
    try { output = method(exports, subject, ...callArgs, { setCurrency: value => { currency = value; } }); }
    catch (failure) { error = { name: failure.name, message: failure.message, stack: failure.stack }; }
    const result = { input: before, inputAfter: copy(subject), args: argsBefore, argsAfter: copy(callArgs), value: output === undefined ? null : copy(output), draws: [...tape], stacks: [...stacks], error };
    result.refs = Object.fromEntries(['input', 'inputAfter', 'args', 'argsAfter', 'value', 'draws', 'stacks', 'error'].map(key => [key, valueRef(result[key])]));
    ledger.push({ bundle: bundle.id, id, refs: result.refs, drawCount: result.draws.length }); return result;
  }
  return { exports, startup, run };
}
const bundles = [];
for (const spec of [{ id: 'original-plain', baseline: true }, { id: 'original-observed', baseline: true, observed: true }, { id: 'current-plain' }, { id: 'healthy', observed: true },
  { id: 'original-policy-oracle', baseline: true, oracle: true }, ...faultDefinitions.map(fault => ({ id: fault.id, observed: true, fault })), { id: 'undo', observed: true }]) bundles.push(await bundle(spec.id, spec));
const healthyBundle = bundles.find(b => b.id === 'healthy'), undoBundle = bundles.find(b => b.id === 'undo');
assert.equal(undoBundle.code, healthyBundle.code, 'complete compiled undo'); equal(undoBundle.metadata.loaded, healthyBundle.metadata.loaded, 'complete loaded source undo');
assert.equal(bundles.find(b => b.id === 'original-plain').code, bundles.find(b => b.id === 'original-observed').code, 'original observation has no source edit');
assert.equal(bundles.find(b => b.id === 'current-plain').code, healthyBundle.code, 'current observation has no source edit');
const scopes = new Map(bundles.map(b => [b.id, scope(b)])), A = scopes.get('original-observed'), plainA = scopes.get('original-plain'), plainB = scopes.get('current-plain'), oracle = scopes.get('original-policy-oracle');
const rawCaptured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(save => save.id === 'ere').state;
const repaired = A.run('setup/repair', 5, (e, state) => e.engine.repairCareer(state), rawCaptured); assert.equal(repaired.error, null); const captured = repaired.value;
assert.ok(captured); const clubs = copy(A.exports.engine.FALLBACK_CLUBS);
const profiles = [
  { id: 'young29', age: 29, overall: 90, rating: 8, apps: 20 }, { id: 'elite30', age: 30, overall: 90, rating: 8, apps: 20 },
  { id: 'elite33', age: 33, overall: 90, rating: 8, apps: 20 }, { id: 'elite34', age: 34, overall: 90, rating: 8, apps: 20 },
  { id: 'elite38', age: 38, overall: 90, rating: 8.2, apps: 32 }, { id: 'holding38', age: 38, overall: 85, rating: 7.5, apps: 30 },
  { id: 'weak38', age: 38, overall: 76, rating: 6.4, apps: 30 }, { id: 'rating799', age: 30, overall: 90, rating: 7.99, apps: 20 },
  { id: 'overall89', age: 30, overall: 89, rating: 8, apps: 20 }, { id: 'apps19', age: 30, overall: 90, rating: 8, apps: 19 },
  { id: 'cameo2', age: 38, overall: 90, rating: 9, apps: 2 }, { id: 'missingApps', age: 38, overall: 90, rating: 8, apps: null },
  { id: 'latestYouth', age: 38, overall: 90, rating: 6.4, apps: 30, youth: true }, { id: 'oddWage', age: 38, overall: 90, rating: 8, apps: 20, wage: 100003 },
  { id: 'noSenior', age: 38, overall: 90, rating: 8, apps: 20, noSenior: true },
];
function subject(spec) {
  const s = copy(captured); Object.assign(s, { age: spec.age, overall: spec.overall, weeklyWage: spec.wage ?? 100000, contractYearsLeft: 4, phase: 'random_events', loan: null, transferSituation: null, pendingEvents: [], events: [...s.events] }); delete s.chanceWheel;
  Object.assign(s.seasons.at(-1), { age: spec.age, rating: spec.rating, apps: spec.apps, type: 'playing' }); if (spec.apps === null) delete s.seasons.at(-1).apps;
  if (spec.noSenior) s.seasons = s.seasons.map(row => ({ ...row, type: 'youth' }));
  if (spec.youth) s.seasons.push({ ...s.seasons.at(-1), year: s.seasons.at(-1).year + 1, type: 'youth', rating: 9.9, apps: 40 });
  return s;
}
function expectedDemand(c) {
  const young = c.age < 30, last = [...c.seasons].reverse().find(row => row.type === 'playing');
  const elite = c.overall >= 90 && last?.rating >= 8 && (last?.apps ?? 0) >= 20;
  const weeklyWage = young ? Math.round(c.weeklyWage * 1.2) : Math.max(c.weeklyWage, Math.round(c.weeklyWage * (elite ? c.age >= 34 ? 1.05 : 1.1 : 1)));
  const hit = young ? '20% wage raise' : weeklyWage > c.weeklyWage ? `Wage €${weeklyWage}/wk` : `Current wage held (€${weeklyWage}/wk)`;
  const event = young || weeklyWage > c.weeklyWage ? '📝 Pushed for more, got a raise!' : '📝 Pushed for more, kept current wage';
  return young ? { weeklyWage, consequence: '50% chance: Wage +20% or relationship damaged', hit, event }
    : { weeklyWage, hit, consequence: `50% chance: ${hit} or relationship damaged`, event };
}
const originals = new Map();
for (const spec of profiles) {
  const s = subject(spec), row = A.run('catalog/' + spec.id, 801, (e, state) => e.engine.getAllEvents(state), s);
  assert.equal(row.error, null); const event = row.value.find(event => event.id === 16), following = row.value.find(event => event.id === 2); assert.ok(event && following);
  originals.set(spec.id, { state: s, event, following, row });
}
const groupNames = ['projection', 'copies', 'policy', 'young', 'other-choices', 'draws', 'historical'];
const failures = [], arms = [];
function check(arm, group, id, callback) { try { callback(); } catch (error) { failures.push({ arm, group, id, name: error.name, message: error.message, stack: error.stack }); } }
function noError(row, id) { assert.equal(row.error, null, id + ' actual handler'); }
function sameRows(a, b, id) { for (const key of ['value', 'inputAfter', 'argsAfter', 'draws', 'error']) equal(a[key], b[key], id + ' ' + key); }
function action(scope, id, input, seed, choice, mode) {
  return scope.run(id, seed, (e, state, choiceIndex, live, pool) => {
    if (live) { const catalog = e.engine.getAllEvents(state); state.pendingEvents = state.pendingEvents.map(event => ({ ...event, choices: event.choices.map((choice, index) => ({ ...choice, apply: catalog.find(row => row.id === event.id)?.choices[index]?.apply })) })); assert.ok(state.pendingEvents.every(event => event && typeof event.choices[0].apply === 'function')); }
    else assert.ok(state.pendingEvents.every(event => event.choices.every(choice => !Object.hasOwn(choice, 'apply'))));
    return e.engine.applyEventChoice(state, choiceIndex, pool);
  }, input, [choice, mode === 'live', clubs]);
}
const routeInputs = [];
for (const spec of profiles) for (const seed of [1, 3, 15, 23]) for (const choice of [0, 1, 2]) for (const mode of ['live', 'reload']) for (const queue of ['following', 'terminal']) {
  const base = originals.get(spec.id), input = copy(base.state); input.pendingEvents = queue === 'following' ? [base.event, base.following] : [base.event];
  const id = [spec.id, seed, choice, mode, queue].join('/'), originalRow = action(A, 'action/' + id, input, seed, choice, mode), originalPlain = action(plainA, 'action/' + id, input, seed, choice, mode), currentPlain = action(plainB, 'action/' + id, input, seed, choice, mode), expected = action(oracle, 'action/' + id, input, seed, choice, mode);
  routeInputs.push({ id, spec, seed, choice, mode, queue, input, originalRow, originalPlain, currentPlain, expected });
}
assert.equal(routeInputs.length, 720);
const healthyRows = new Map(), healthyActionRows = new Map();
for (const arm of ['healthy', ...faultDefinitions.map(f => f.id), 'undo']) {
  const B = scopes.get(arm), counts = Object.fromEntries(groupNames.map(group => [group, 0])), whole = [];
  for (const spec of profiles) {
    const s = originals.get(spec.id).state, expected = expectedDemand(s), p = B.run('projection/' + spec.id, 9, (e, state) => e.contracts.soccerWageDemand(state), s);
    whole.push({ id: 'projection/' + spec.id, group: 'projection', refs: p.refs }); counts.projection++;
    check(arm, 'projection', spec.id, () => { noError(p, spec.id); equal(p.value, expected, 'independent full demand'); equal(p.inputAfter, p.input, 'pure whole input held'); equal(p.draws, [], 'pure no draws'); });
    for (const [eventId, choiceIndex] of [[16, 1], [16, 0], [16, 2], [2, 0], [99, 1]]) {
      const saved = eventId === 16 && choiceIndex === 1 ? originals.get(spec.id).event.choices[1].consequence : 'Saved unrelated text €100003/wk';
      const id = 'copy/' + spec.id + '/' + eventId + '/' + choiceIndex;
      const c = B.run(id, 10, (e, state, eid, cid, text) => e.contracts.soccerEventChoiceConsequence(state, eid, cid, text), s, [eventId, choiceIndex, saved]); whole.push({ id, group: 'copies', refs: c.refs }); counts.copies++;
      check(arm, 'copies', id, () => { noError(c, id); assert.equal(c.value, eventId === 16 && choiceIndex === 1 ? expected.consequence : saved); equal(c.inputAfter, c.input, 'copy whole input'); equal(c.draws, [], 'copy no draws'); });
    }
    const c = B.run('currency/' + spec.id, 10, (e, state, bridge) => { bridge.setCurrency('USD'); const receipt = { title: 'Contract negotiation', hit: expected.hit, miss: 'Relationship damaged', chance: .5, roll: .1, result: true, seen: false }; const before = copy(receipt); return { raw: receipt, before, display: { ...receipt, hit: e.currency.localizeMoney(receipt.hit), miss: e.currency.localizeMoney(receipt.miss) }, consequence: e.currency.localizeMoney(expected.consequence) }; }, s);
    whole.push({ id: 'currency/' + spec.id, group: 'copies', refs: c.refs }); counts.copies++;
    check(arm, 'copies', 'currency/' + spec.id, () => { noError(c, spec.id); equal(c.value.raw, c.value.before, 'display does not mutate EUR receipt'); equal(c.draws, [], 'currency read no draw'); equal(c.inputAfter, c.input, 'currency input held'); if (spec.age >= 30) assert.ok(c.value.display.hit.includes('$')); });
  }
  for (const r of routeInputs) {
    const row = action(B, 'action/' + r.id, r.input, r.seed, r.choice, r.mode), group = r.choice !== 1 ? 'other-choices' : r.spec.age < 30 ? 'young' : 'policy'; counts[group]++; counts.draws++;
    whole.push({ id: 'action/' + r.id, group, refs: row.refs });
    check(arm, group, r.id, () => { noError(row, r.id); const expected = group === 'policy' ? r.expected : r.originalRow; for (const key of ['value', 'inputAfter', 'argsAfter']) equal(row[key], expected[key], r.id + ' complete ' + key); if (r.queue === 'following') { assert.equal(row.value.pendingEvents[0].id, 2); assert.equal(row.value.phase, 'random_events'); } });
    check(arm, 'draws', r.id, () => { noError(row, r.id); equal(row.draws, r.originalRow.draws, 'entire original/current action vector'); sameRows(r.originalRow, r.originalPlain, 'original transparent observation'); if (arm === 'healthy' || arm === 'undo') sameRows(row, r.currentPlain, 'current transparent observation'); });
    if (arm === 'healthy') healthyActionRows.set('action/' + r.id, row);
  }
  for (const result of [true, false]) {
    const s = subject(profiles[4]); s.chanceWheel = { title: 'Contract negotiation', chance: .5, roll: result ? .1 : .8, hit: '20% wage raise', miss: 'Relationship damaged', result, seen: false };
    for (const seen of [false, true]) { s.chanceWheel.seen = seen; const id = 'historical/' + result + '/' + seen;
      const row = B.run(id, 44, (e, state) => ({ valid: e.wheel.validChanceWheel(state.chanceWheel), once: e.wheel.acknowledgeChanceWheel(state), twice: e.wheel.acknowledgeChanceWheel(e.wheel.acknowledgeChanceWheel(state)) }), s), old = A.run(id + '/' + arm, 44, (e, state) => ({ valid: e.wheel.validChanceWheel(state.chanceWheel), once: e.wheel.acknowledgeChanceWheel(state), twice: e.wheel.acknowledgeChanceWheel(e.wheel.acknowledgeChanceWheel(state)) }), s);
      counts.historical++; whole.push({ id, group: 'historical', refs: row.refs }); check(arm, 'historical', id, () => { sameRows(row, old, 'whole historical committed receipt'); equal(row.draws, [], 'ack no draws'); equal(row.value.once, row.value.twice, 'ack once'); });
    }
  }
  if (arm === 'healthy') for (const row of whole) healthyRows.set(row.id, row);
  else for (const row of whole) { const baseline = healthyRows.get(row.id), fault = faultDefinitions.find(f => f.id === arm); if (arm === 'undo' || !fault.failures.includes(row.group)) check(arm, row.group, row.id + '/unrelated', () => { for (const key of ['value', 'inputAfter', 'argsAfter', 'draws', 'error']) assert.equal(row.refs[key], baseline.refs[key], 'complete unrelated/undo output held'); }); }
  const failedGroups = groupNames.filter(group => failures.some(f => f.arm === arm && f.group === group)); arms.push({ id: arm, counts, failedGroups, outcomes: whole });
  write('arms-' + arm + '.json', arms.at(-1));
}
const browserFixtures = [];
const browserMapping = [['young29', 'EUR', 15], ['elite30', 'EUR', 15], ['elite34', 'EUR', 15], ['elite34', 'USD', 1], ['holding38', 'EUR', 15]];
for (const [profile, currency, seed] of browserMapping) {
  const candidates = routeInputs.filter(r => r.spec.id === profile && r.seed === seed && r.choice === 1 && r.mode === 'reload' && r.queue === 'following');
  assert.equal(candidates.length, 1, 'one exact retained browser case'); const r = candidates[0];
  const B = scopes.get('healthy'), result = healthyActionRows.get('action/' + r.id), ack = B.run('browser-ack/' + r.spec.id + '/' + currency, 0, (e, state) => e.wheel.acknowledgeChanceWheel(state), result.value);
  const display = B.run('browser-display/' + r.spec.id + '/' + currency, 0, (e, state, code, bridge) => { bridge.setCurrency(code); const expected = expectedDemand(state); return { consequence: e.currency.localizeMoneyGrouped(expected.consequence), hit: e.currency.localizeMoneyGrouped(expected.hit) }; }, r.input, [currency]);
  const loaded = B.run('browser-load/' + r.spec.id + '/' + currency, 0, (e, state) => e.engine.repairCareer(state), r.input); equal(loaded.value, r.input, 'browser fixture load already repaired'); equal(loaded.draws, [], 'fixture repair has no extra draws');
  const following = B.run('browser-following/' + r.spec.id + '/' + currency, 37, (e, state, pool) => e.engine.applyEventChoice(state, 0, pool), ack.value, [clubs]);
  browserFixtures.push({ id: r.spec.id + '-' + currency, currency, key: 'soccerCareerSave', value: r.input, expected: result.value, expectedAcknowledged: ack.value, expectedFollowing: following.value, followingDraws: following.draws, followingSeed: 37, draws: result.draws, seed: r.seed, consequence: display.value.consequence, hit: display.value.hit, resultLabel: result.value.chanceWheel.result ? display.value.hit : 'Relationship damaged' });
}
write('browser-fixtures.json', browserFixtures); assert.equal(browserFixtures.length, 5);
const sourceAfter = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) })); equal(sourceAfter, sourceBefore, 'all disk sources held');
const report = { head, tree: git('rev-parse', 'HEAD^{tree}').toString().trim(), base: BASE, baseTree: BASE_TREE, groups: groupNames, routeCasesPerArm: routeInputs.length, profiles, seeds: [1, 3, 15, 23], sourceBefore, sourceAfter, startups: Object.fromEntries([...scopes].map(([id, scope]) => [id, scope.startup])), bundles: bundles.map(b => b.metadata), arms: arms.map(({ outcomes, ...arm }) => arm), failures, browserFixtures: browserFixtures.length,
  scope: 'Declared altered recorded saves, actual catalog and event handlers, terminal transfer continuation and following genuine catalog event. No natural season picker frequency or live deployment claim.' };
write('report.json', report); write('logical-ledger.json', ledger); write('objects.json', [...objects.values()]);
for (const arm of arms) { const fault = faultDefinitions.find(f => f.id === arm.id); equal(arm.failedGroups, fault?.failures ?? [], arm.id + ' exact intended failure groups'); }
assert.ok(failures.every(f => f.name === 'AssertionError'), 'only actual assertion failures');
for (const fault of faultDefinitions) assert.ok(failures.some(f => f.arm === fault.id), fault.id + ' effective');
assert.ok(browserFixtures.some(fixture => fixture.expected.chanceWheel.result), 'declared cohort actual hit');
assert.ok(browserFixtures.some(fixture => !fixture.expected.chanceWheel.result), 'declared browser actual miss');
assert.ok(routeInputs.some(r => r.choice === 1 && !healthyActionRows.get('action/' + r.id).value.chanceWheel.result), 'declared cohort actual miss');
const total = fs.readdirSync(OUT, { recursive: true }).filter(file => fs.statSync(path.join(OUT, file)).isFile()).reduce((sum, file) => sum + fs.statSync(path.join(OUT, file)).size, 0);
assert.ok(total < 430000000, 'complete proof retained under430M');
console.log('ok   720 declared event actions per arm, every full save and draw retained');
console.log('ok   seven healthy groups and six effective actual-source faults with exact maps');
console.log('ok   complete young/other-choice/history holds, live/reload and actual terminal flows');
console.log('ok   whole source and compiled undo, startup vectors separately retained');
console.log('ok   five production browser fixtures including USD, all raw amounts remain EUR');