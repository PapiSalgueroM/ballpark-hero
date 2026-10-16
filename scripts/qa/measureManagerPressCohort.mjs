/* Diagnostic only: observe a declared fleet without changing the legacy gate. */
import '../lib/seedRandom.mjs';
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { withoutAiMoves, BRIDGE_FILES, bridgeAnchorCounts } from '../lib/cmNoAiMoves1344.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline diagnostic only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CURRENT = 'e2063dbea06e037fa2e14f8434101ffd7817f728';
const BASE = '1027b08cac8ef5cfc52c6b2e738e5c0a8d703402';
const OUT = path.resolve(process.env.CM_PRESS_COHORT_OUT || 'manager-press-cohort-artifacts');
const HARNESS = 'scripts/simClubManagerDecisions.mjs', BRIDGE = 'scripts/lib/cmNoAiMoves1344.mjs';
const lf = value => value.replaceAll('\r\n', '\n');
const sha = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value) ?? 'undefined';
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const held = new Map(), refSources = new Map();
function source(ref, file) {
  const key = ref + ':' + file;
  if (!refSources.has(key)) refSources.set(key, lf(git(['show', key])));
  return refSources.get(key);
}
for (const [name, ref] of [['PRESS_COHORT_SOURCE', CURRENT], ['PRESS_COHORT_BASE', BASE]]) {
  if (process.env[name]) assert.equal(git(['rev-parse', process.env[name]]).trim(), ref, 'Exact declared ' + name);
  assert.equal(git(['rev-parse', ref]).trim(), ref);
}
for (const file of [HARNESS, BRIDGE]) {
  const bytes = fs.readFileSync(path.join(ROOT, file)); held.set(file, bytes);
  assert.equal(lf(bytes.toString()), source(CURRENT, file), 'Unchanged actual ' + file);
}
const self = fileURLToPath(import.meta.url); held.set(path.relative(ROOT, self), fs.readFileSync(self));
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never overwrite an earlier measurement');
fs.mkdirSync(OUT, { recursive: true });
const report = { diagnosticOnly: true, currentRef: CURRENT, baseRef: BASE, head: git(['rev-parse', 'HEAD']).trim(),
  declaredCareers: [], arms: [], completed: false, measurements: 0 };
function checkpoint() { fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function retain(file, value, gzip = false) {
  const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true });
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(target, gzip ? gzipSync(bytes) : bytes);
  return { ...receipt(target), uncompressedBytes: bytes.length };
}
const clubs = ['Arsenal', 'Everton', 'Brighton'];
const reviewed = {
  current: { result: 'aea98e80f88404c887ad879cdd42f93c03b1b27a', request: 'b34e541b423c225c1925e1134f06e9d9860ba7df',
    log: 'logs/decisions.log', careers: 3, entries: 164, answers: 51, witness: false, mood: null },
  base: { result: 'aea98e80f88404c887ad879cdd42f93c03b1b27a', request: 'b34e541b423c225c1925e1134f06e9d9860ba7df',
    log: 'logs/decisions-base.log', careers: 2, entries: 145, answers: 46, witness: true, mood: 34 },
  bridge: { result: 'b09e982205d675c8faf5d77f6d8c72aca7faf1a9', request: '36d8c5f57706ee1bcbf551e92359887f546848c6',
    log: 'logs/decisions-bridged.log', careers: 2, entries: 145, answers: 46, witness: true, mood: 34 },
};
report.reviewedBindings = reviewed;
const fleet = [979, 1, 2, 3, 4].flatMap(baseSeed => clubs.map((club, clubIndex) => ({
  id: `seed${baseSeed}-club${clubIndex}`, baseSeed, club, clubIndex, seed: baseSeed + clubIndex * 100,
})));
assert.equal(fleet.length, 15); report.declaredCareers = fleet; checkpoint();

const harness = source(CURRENT, HARNESS), begin = 'function runPressCohort(E, copy) {', end = '\nlet entrySource = `';
assert.equal(harness.split(begin).length - 1, 1); assert.equal(harness.split(end).length - 1, 1);
const original = harness.slice(harness.indexOf(begin), harness.indexOf(end)).trimEnd();
const gate = '      if (entry && E.entryInvolvesMe(state, entry) && state.week < state.calendar.length - 1 && Number.isFinite(state.press?.mood) && state.press.mood < 35) {';
assert.equal(original.split(gate).length - 1, 1);
let measured = original;
const edits = [];
function edit(label, from, to) {
  assert.equal(measured.split(from).length - 1, 1, 'One instrumentation anchor: ' + label);
  const before = measured; measured = measured.replace(from, () => to); assert.notEqual(measured, before);
  edits.push({ label, from, to, beforeSha256: sha(before), afterSha256: sha(measured) });
}
edit('single declared career', begin, 'function measuredPressCareer(E, copy, specimen, trace) {');
edit('same generator with observed draws', '    let number = seed >>> 0;', '    let number = seed >>> 0; const observedDraws = [];');
edit('observe actual generator return', '      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;',
  '      const draw = ((value ^ (value >>> 14)) >>> 0) / 4294967296; observedDraws.push(draw); return draw;');
edit('retain operation stream', '    try { return action(); } finally { Math.random = previousRandom; globalThis.Date = PreviousDate; }',
  '    try { return action(); } finally { trace.draws(seed, observedDraws); Math.random = previousRandom; globalThis.Date = PreviousDate; }');
edit('declared club only', "  for (const [index, club] of ['Arsenal', 'Everton', 'Brighton'].entries()) {",
  '  for (const [index, club] of [[specimen.clubIndex, specimen.club]]) {');
edit('declared seed only', '    const careerSeed = 979 + index * 100;', '    const careerSeed = specimen.seed;');
edit('observe gate input', '      const entry = state.calendar[state.week];',
  "      trace.state(state, 'after-manager-policy');\n      const entry = state.calendar[state.week];");
edit('retain actual witness', "        return { ...cohort, club, seed: careerSeed, step, stage: 'after-manager-policy', mood: state.press.mood, state: copy(state) };",
  "        trace.finish('witness', state);\n        return { ...cohort, club, seed: careerSeed, step, stage: 'after-manager-policy', mood: state.press.mood, state: copy(state) };");
edit('retain actual stop', '    }\n  }\n  return cohort;\n}',
  "    }\n    trace.finish(state.sacked ? 'sacked' : 'entry-bound', state);\n  }\n  return cohort;\n}");
assert.equal(measured.split(gate).length - 1, 1, 'Exact original below35 witness gate is held');
for (const anchor of ['step < 180 && !state.sacked', 'careerSeed + step * 101 + 1', 'careerSeed + step * 101 + 2',
  'careerSeed + step * 101 + 3', 'option.mood < question.options[best].mood']) assert(measured.includes(anchor) && original.includes(anchor));
fs.writeFileSync(path.join(OUT, 'runPressCohort.original.mjs'), original + '\n');
fs.writeFileSync(path.join(OUT, 'runPressCohort.measured.mjs'), measured + '\n');
const diff = spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--',
  path.join(OUT, 'runPressCohort.original.mjs'), path.join(OUT, 'runPressCohort.measured.mjs')], { cwd: ROOT, encoding: 'utf8' });
assert.equal(diff.status, 1); assert(!diff.error && diff.stdout.length > 0); fs.writeFileSync(path.join(OUT, 'instrumentation.diff'), diff.stdout);
report.instrumentation = retain('instrumentation.json', { harnessSha256: sha(harness), originalSha256: sha(original),
  measuredSha256: sha(measured), gateSha256: sha(gate), diffSha256: sha(diff.stdout), edits }); checkpoint();
const counts = bridgeAnchorCounts(file => source(CURRENT, file)); assert(counts.every(([, count]) => count === 1));
report.bridge = { sourceSha256: sha(source(CURRENT, BRIDGE)), anchors: counts };

async function compile(arm) {
  const loaded = [], bridged = new Set();
  const { build } = await import('esbuild');
  const output = await build({ stdin: { contents: `import * as E from './src/lib/clubManager';\nexport { E };\n${original}\n${measured}\nexport { runPressCohort, measuredPressCareer };\n`,
    resolveDir: ROOT, sourcefile: `press-cohort-${arm}.mjs`, loader: 'js' }, bundle: true, write: false,
    format: 'cjs', platform: 'node', target: 'node20', logLevel: 'error', metafile: true,
    alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'actual-' + arm, setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!rel.startsWith('src/')) return undefined;
        const ref = arm === 'base' ? BASE : CURRENT, input = source(ref, rel);
        const working = fs.readFileSync(args.path); held.set(rel, working);
        assert.equal(lf(working.toString()), source(CURRENT, rel), 'Frozen current source: ' + rel);
        const effective = arm === 'bridge' ? withoutAiMoves(input, rel) : input;
        if (effective !== input) bridged.add(rel);
        for (const [kind, text] of [['input', input], ['effective', effective]]) {
          const file = path.join(OUT, 'sources', arm, kind, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
        }
        loaded.push({ file: rel, ref, inputSha256: sha(input), effectiveSha256: sha(effective), bytes: Buffer.byteLength(effective) });
        return { contents: effective, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    } }] });
  if (arm === 'bridge') assert.deepEqual([...bridged].sort(), [...BRIDGE_FILES].sort(), 'All existing bridge files actually changed');
  else assert.equal(bridged.size, 0);
  const file = path.join(OUT, arm + '.cjs'); fs.writeFileSync(file, output.outputFiles[0].contents);
  retain(arm + '-metafile.json', output.metafile);
  return { script: new vm.Script(output.outputFiles[0].text, { filename: file }), bundle: receipt(file), loaded };
}
function fresh(script) {
  const module = { exports: {} }, math = Object.create(Math), NOW = Date.parse('2026-10-12T16:00:00Z');
  class HeldDate extends Date { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } }
  let network = 0;
  const context = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
    console, process, Buffer, Math: math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder,
    structuredClone, performance, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    fetch: async () => { network++; throw new Error('Network forbidden in press cohort diagnostic'); } });
  script.runInContext(context); return { exports: module.exports, math, network: () => network };
}
function recorder(E, math) {
  const rows = []; let row;
  function state(value, stage) {
    if (!row || !value || !Array.isArray(value.squad)) return;
    row.end = copy(value);
    const mood = value.press?.mood;
    if (Number.isFinite(mood) && (row.minMood === null || mood < row.minMood)) { row.minMood = mood; row.minState = copy(value); }
    if (stage === 'after-manager-policy') {
      row.policyStates.push({ season: value.season, week: value.week, mood, sha256: sha(json(value)) });
      if (Number.isFinite(mood) && (row.minPolicyMood === null || mood < row.minPolicyMood)) {
        row.minPolicyMood = mood; row.minPolicyState = copy(value);
      }
    }
  }
  const api = Object.fromEntries(Object.entries(E).map(([name, fn]) => [name, typeof fn !== 'function' ? fn : (...args) => {
    if (name === 'startCareer') {
      const specimen = fleet[rows.length]; assert(specimen && args[0] === specimen.club);
      row = { ...specimen, api: [], answers: [], operations: [], policyStates: [], minMood: null, minPolicyMood: null };
      rows.push(row);
    }
    assert(row, 'Actual career starts before its public actions');
    const inputSha256 = sha(json(args)), before = name === 'answerPress' ? copy(args[0]) : null;
    const values = [], previous = math.random; math.random = () => { const value = previous(); values.push(value); return value; };
    let result;
    try { result = Reflect.apply(fn, E, args); }
    finally { math.random = previous; }
    row.api.push({ name, inputSha256, outputSha256: sha(json(result)), draws: values });
    if (name === 'startCareer') { row.start = copy(result); state(result, 'start'); }
    else if (name === 'playNextEntry') state(result.state, result.kind);
    else if (name === 'entryInvolvesMe') state(args[0], 'entry-gate-read');
    else if (['answerPress', 'promoteProspect', 'startNextSeason', 'finishSeason'].includes(name)) state(result?.state ?? result, name);
    if (before) {
      const question = before.press.pending, index = args[1], option = question.options[index];
      row.answers.push({ before, after: copy(result), kind: question.kind, index, label: option.label, delta: option.mood,
        beforeMood: before.press.mood, afterMood: result.press.mood });
    }
    return result;
  }]));
  return { api, rows, state, trace: {
    state,
    draws(seed, values) {
      const offset = seed - row.seed, step = offset === 0 ? null : Math.floor(offset / 101), part = offset % 101;
      assert(offset === 0 || [1, 2, 3].includes(part));
      row.operations.push({ seed, step, kind: offset === 0 ? 'start' : part === 1 ? 'manager-policy' : part === 2 ? 'entry' : 'rollover', draws: [...values] });
    },
    finish(reason, value) { row.stopReason = reason; state(value, reason); if (reason === 'witness') row.qualifyingState = copy(value); },
  } };
}
function prefixResult(results) {
  const used = []; for (const result of results.slice(0, 3)) { used.push(result); if (result.state) break; }
  const last = used[used.length - 1];
  return { ...last, careers: used.length, entries: used.reduce((n, row) => n + row.entries, 0),
    promotions: used.reduce((n, row) => n + row.promotions, 0), answers: used.flatMap(row => row.answers) };
}

try {
  for (const arm of ['current', 'base', 'bridge']) {
    const compiled = await compile(arm), item = { arm, bundle: compiled.bundle, sources: compiled.loaded, careers: [], calibrated: false };
    report.arms.push(item); checkpoint();
    const old = fresh(compiled.script), oldRecorder = recorder(old.exports.E, old.math);
    const originalResult = old.exports.runPressCohort(oldRecorder.api, copy);
    assert.equal(old.network(), 0); assert(originalResult.careers >= 1 && originalResult.careers <= 3);
    item.originalPrefix = retain(arm + '/original-prefix.json.gz', { result: originalResult, careers: oldRecorder.rows }, true); checkpoint();
    const observedPrefix = { careers: originalResult.careers, entries: originalResult.entries,
      answers: originalResult.answers.length, witness: !!originalResult.state, mood: originalResult.state ? originalResult.mood : null };
    const { result: reviewedResult, request, log, ...expectedPrefix } = reviewed[arm];
    item.reviewedPrefix = { result: reviewedResult, request, log, expected: expectedPrefix, actual: observedPrefix }; checkpoint();
    assert.deepEqual(observedPrefix, expectedPrefix, 'Setup/probe mismatch: fresh original must reproduce the reviewed ' + arm + ' prefix');
    const current = fresh(compiled.script), observed = recorder(current.exports.E, current.math), results = [];
    for (const specimen of fleet) {
      const result = current.exports.measuredPressCareer(observed.api, copy, specimen, observed.trace);
      const row = observed.rows[observed.rows.length - 1];
      assert.equal(row.id, specimen.id); assert.equal(result.careers, 1); assert(result.entries <= 180);
      assert(['witness', 'sacked', 'entry-bound'].includes(row.stopReason));
      assert.deepEqual(row.operations.flatMap(operation => operation.draws), row.api.flatMap(call => call.draws), 'Every actual global draw has an operation receipt');
      row.result = copy(result); results.push(copy(result));
      const raw = retain(arm + '/' + row.id + '.json.gz', row, true);
      item.careers.push({ ...specimen, entries: result.entries, promotions: result.promotions, answers: row.answers.length,
        stopReason: row.stopReason, minMood: row.minMood, minPolicyMood: row.minPolicyMood,
        witnessMood: result.state ? result.mood : null, globalDraws: row.operations.reduce((n, operation) => n + operation.draws.length, 0), raw });
      report.measurements++; checkpoint();
    }
    assert.equal(current.network(), 0); assert.equal(item.careers.length, 15);
    const prefix = prefixResult(results); assert.deepEqual(prefix, copy(originalResult), 'Copied observer retains the actual original prefix result');
    const count = originalResult.careers;
    for (let i = 0; i < count; i++) {
      const left = oldRecorder.rows[i], right = observed.rows[i];
      for (const field of ['start', 'end', 'answers', 'api']) assert.deepEqual(left[field], right[field], 'Original prefix ' + field + ': ' + arm + '/' + right.id);
    }
    item.calibrated = true; item.prefixCareers = count; item.witnesses = item.careers.filter(row => row.stopReason === 'witness').map(row => row.id); checkpoint();
  }
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.resolve(ROOT, file)), bytes, 'Held source ' + file);
  assert.equal(report.measurements, 45); assert(report.arms.every(arm => arm.calibrated && arm.careers.length === 15));
  report.completed = true; checkpoint();
  console.log(`Manager press diagnostic: 45 declared careers observed; 3 original prefixes calibrated; witnesses current/base/bridge ${report.arms.map(arm => arm.witnesses.length).join('/')}. No harness qualification or product fix claimed.`);
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
