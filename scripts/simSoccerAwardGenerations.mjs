/* Complete saved generated-candidate careers and declared lifecycle boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { createAwardProofStorage } from './lib/awardProofStorage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.SOCCER_AWARD_GENERATIONS_OUT || path.join(ROOT, 'career-award-generations-artifacts/proof'));
const BASE = 'aa564f16019b9e821981d5c4e3e0262312c73b62';
const ENGINE = 'src/lib/soccerCareerEngine.ts', SAVE = 'src/lib/soccerCareerSave.ts';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const lf = s => s.replace(/\r\n/g, '\n');
const json = x => JSON.stringify(x);
const copy = x => JSON.parse(json(x));
const objects = new Map(), failures = [];
const report = { status: 'fail', base: BASE, population: [], natural: {}, boundaries: [], controls: [], observationControls: [] };
function verify(label, fn) { try { fn(); } catch (e) { failures.push({ label, name: e.name, message: e.message, stack: e.stack }); } }
fs.mkdirSync(OUT, { recursive: true });
let proofStorage = null;
function putBytes(raw, kind = 'json') {
  const hash = sha(raw);
  if (!objects.has(hash)) {
    const packed = zlib.gzipSync(raw, { level: 9 }), relative = `objects/${hash}.gz`;
    const original = { hash, kind, path: relative, rawBytes: raw.length, rawSha256: hash, packedBytes: packed.length, packedSha256: sha(packed) };
    proofStorage.add(raw, original);
    objects.set(hash, original);
  }
  return hash;
}
const put = x => putBytes(Buffer.from(json(x)));
const get = hash => JSON.parse(proofStorage.getBytes(hash).toString());
function write(name, value) { fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true }); fs.writeFileSync(path.join(OUT, name), json(value)); }
function one(source, from, to) {
  assert.equal(source.split(from).length - 1, 1, `unique forward ${from}`);
  const next = source.replace(from, to);
  assert.notEqual(next, source); assert.equal(next.split(to).length - 1, 1, `unique reverse ${to}`);
  assert.equal(next.replace(to, from), source, 'whole source undo'); return next;
}
const controls = [
  ['new-profile-tuple-alias', ENGINE, 'baseGoals: [...profile.baseGoals] as [number, number], id:', 'baseGoals: profile.baseGoals, id:', ['template-clone']],
  /* Round 1318 (ruling C3): the pool's checks moved out of the save module into the engine's reader, isGeneratedBallonPool,
     so the two controls that used to loosen the save module now loosen the reader. 'invalid-save' means a case the reader
     answers wrongly; validatorRun below reads every case through it and every save still opens. */
  ['wrong-goal-tuple-accepted', ENGINE, '|| entry.baseGoals[0] !== goals[0] || entry.baseGoals[1] !== goals[1]', '|| false', ['invalid-save']],
  ['frozen-age', ENGINE, 'generatedAge: entry.entryAge + year - entry.firstYear', 'generatedAge: entry.entryAge', ['age']],
  ['missing-retirement', ENGINE, 'entry.retiredYear === null && entry.entryAge + year - entry.firstYear >= 37 ? entry.firstYear + 37 - entry.entryAge : entry.retiredYear', 'entry.retiredYear === null && entry.entryAge + year - entry.firstYear >= 370 ? entry.firstYear + 37 - entry.entryAge : entry.retiredYear', ['retirement', 'valid-save']],
  ['retired-slot-reuse', ENGINE, 'let entry = pool.entries.find(row => row.role === role && row.slot === slot && row.retiredYear === null);', 'let entry = pool.entries.find(row => row.role === role && row.slot === slot);', ['replacement']],
  ['filler-reroll', ENGINE, '    if (!entry) {\n      const seed = pool.entries.some', '    if (!entry || role === "filler") {\n      const seed = pool.entries.some', ['identity', 'valid-save']],
  ['previous-pool-mutation', ENGINE, '  if (previousPool) {\n    generatedPool = {', '  if (previousPool) {\n    previousPool.year = year;\n    generatedPool = {', ['prior-pool']],
  ['extra-generated-draw', ENGINE, '    const entryAge = rand(19, 28);', '    const entryAge = rand(19, 28); Math.random();', ['request-draws', 'paired-outcome']],
  ['malformed-pool-accepted', ENGINE, '  if (!record(v) || v.version !== 1 || !integer(v.year) || v.year < 0 || v.year > lastYear', '  return true;\n  if (!record(v) || v.version !== 1 || !integer(v.year) || v.year < 0 || v.year > lastYear', ['invalid-save']],
];
const heldPaths = [ENGINE, SAVE, 'src/lib/soccerAwardReveal.ts', 'src/pages/SoccerCareer.tsx', 'src/test/soccerCareerSaveRecovery.test.tsx', 'package.json', 'package-lock.json'];
const rawBefore = new Map(heldPaths.map(p => [p, fs.readFileSync(path.join(ROOT, p))]));
const healthyText = Object.fromEntries([ENGINE, SAVE].map(p => [p, lf(rawBefore.get(p).toString())]));
function instrument(source, observed, modern) {
  const before = source, edits = [];
  const edit = (from, to) => { source = one(source, from, to); edits.push([from, to]); };
  edit('    fill: (shortlist, need) => {', '    fill: globalThis.__awardFill = (shortlist, need) => {');
  if (observed) {
    edit('function calculateBallonDor(state: CareerState, season: SeasonRecord, year: number, world?: WorldSeason): BallonDorResult {', 'function calculateBallonDor(state: CareerState, season: SeasonRecord, year: number, world?: WorldSeason): BallonDorResult {\n  globalThis.__observe?.("ballot-before", { state, season, year, world });');
    const factory = modern ? '  return { name, nationality: nat, position: p.pos, club, baseGoals: p.goals, startAge };' : '  return { name, nationality: nat, position: p.pos, club, baseGoals: p.goals, startAge: rand(19, 28) };';
    edit(factory, factory.replace('  return ', '  const observedProfile = ').replace(/;$/, ';\n  globalThis.__observe?.("factory", { usedNames: [...usedNames], seed, profile: observedProfile });\n  return observedProfile;'));
    if (modern) edit('    const entryAge = rand(19, 28);', '    const entryAge = rand(19, 28);\n    globalThis.__observe?.("request", { role, slot, initialSeed, year, entryAge });');
    if (modern) edit('    state.generatedBallonPool = pool;\n    return {', '    state.generatedBallonPool = pool;\n    globalThis.__observe?.("request-end", { role, slot, entry });\n    return {');
    edit('  return runAwardsNight<BallonDorNominee>(SOCCER_BALLON_DOR.award, year, {', '  const observedNight = runAwardsNight<BallonDorNominee>(SOCCER_BALLON_DOR.award, year, {');
    const start = source.indexOf('function calculateBallonDor('), end = source.indexOf('function advanceToNextPhase(', start);
    const tail = source.slice(start, end), at = tail.lastIndexOf('  });\n}'); assert(at >= 0);
    const absolute = start + at, from = '  });\n}', to = '  });\n  globalThis.__observe?.("ballot-after", { state, season, year, world, night: observedNight });\n  return observedNight;\n}';
    source = source.slice(0, absolute) + to + source.slice(absolute + from.length); edits.push([from, to, absolute]);
  }
  const appended = '\nexport { calculateBallonDor as __ballot, generateContender as __factory, GEN_POSITIONS as __templates };\n';
  source += appended; let restored = source.slice(0, -appended.length);
  for (const [from, to, at] of edits.toReversed()) {
    if (at === undefined) restored = one(restored, to, from);
    else { assert.equal(restored.slice(at, at + to.length), to); restored = restored.slice(0, at) + from + restored.slice(at + to.length); }
  }
  assert.equal(restored, before, 'complete observer source undo');
  return { source, receipt: { before: put(before), observed: put(source), restored: put(restored), edits: put(edits) } };
}
async function bundle(id, cwd, replacements, observed, modern) {
  const dir = path.join(OUT, 'bundles', id); fs.mkdirSync(dir, { recursive: true });
  const engine = replacements[ENGINE] ?? lf(fs.readFileSync(path.join(cwd, ENGINE), 'utf8')), packet = instrument(engine, observed, modern), loaded = [];
  const entry = 'import * as E from "./src/lib/soccerCareerEngine.ts"; import * as S from "./src/lib/soccerCareerSave.ts"; import * as R from "./src/lib/soccerAwardReveal.ts"; export { E, S, R };';
  const build = await esbuild.build({ absWorkingDir: cwd, stdin: { contents: entry, resolveDir: cwd, sourcefile: 'award-generation-entry.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, outfile: path.join(dir, 'compiled.cjs'), alias: { '@': path.join(cwd, 'src') }, define: { 'import.meta.env': JSON.stringify({ DEV: false, PROD: true, MODE: 'test' }) }, plugins: [{ name: 'retained-inputs', setup(b) { b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, args => {
    const raw = fs.readFileSync(args.path), relative = path.relative(cwd, args.path).replaceAll(path.sep, '/');
    const text = relative === ENGINE ? packet.source : replacements[relative] ?? lf(raw.toString());
    loaded.push({ path: relative, resolvedPath: args.path, raw: putBytes(raw, 'source'), served: put(text), rawSha256: sha(raw), servedSha256: sha(text), bytes: raw.length });
    return { contents: text, loader: args.path.endsWith('.tsx') ? 'tsx' : args.path.endsWith('.ts') ? 'ts' : 'js', resolveDir: path.dirname(args.path) };
  }); } }] });
  const inputCensus = Object.keys(build.metafile.inputs).map(input => {
    if (input === 'award-generation-entry.ts' || input === '<stdin>') return { input, configured: true, source: put(entry) };
    if (input === '<define:import.meta.env>') return { input, configured: true, source: put(JSON.stringify({ DEV: false, PROD: true, MODE: 'test' })) };
    const resolvedPath = path.resolve(cwd, input); assert(fs.existsSync(resolvedPath), `complete loaded file ${input}`);
    let record = loaded.find(r => path.resolve(r.resolvedPath) === resolvedPath);
    if (!record) { const raw = fs.readFileSync(resolvedPath); record = { path: path.relative(cwd, resolvedPath), resolvedPath, raw: putBytes(raw, 'source'), served: put(raw.toString()), rawSha256: sha(raw), servedSha256: sha(raw), bytes: raw.length, unmodifiedNonScriptInput: true }; loaded.push(record); }
    return { input, record };
  });
  const code = build.outputFiles[0].contents; fs.writeFileSync(path.join(dir, 'compiled.cjs'), code);
  write(`bundles/${id}/metafile.json`, build.metafile); write(`bundles/${id}/loaded.json`, loaded);
  const configured = Object.keys(build.metafile.inputs).filter(p => p.startsWith('<') && p !== '<stdin>'); assert(configured.every(p => p === '<define:import.meta.env>'));
  const receipt = { id, entry: put(entry), codeSha256: sha(code), engine: packet.receipt, loaded: put(loaded), inputCensus: put(inputCensus), metafile: put(build.metafile), configured, cwd, observed, modern };
  write(`bundles/${id}/receipt.json`, receipt); return { id, code: Buffer.from(code).toString(), receipt };
}
function machine(b, seed, forcedValues = []) {
  let cursor = seed >>> 0; const tape = [], callers = [], callerIds = new Map(), observations = [];
  const math = Object.create(Math); math.random = () => {
    let t = cursor += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    const value = tape.length < forcedValues.length ? forcedValues[tape.length] : ((t ^ t >>> 14) >>> 0) / 4294967296, stack = new Error().stack;
    if (!callerIds.has(stack)) { callerIds.set(stack, callers.length); callers.push(stack); }
    tape.push([value, callerIds.get(stack)]); return value;
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-11T12:00:00Z'])); } static now() { return 1791720000000; } }
  const module = { exports: {} }, storage = new Map();
  const sandbox = { module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, Math: math, Date: FixedDate, URL, URLSearchParams, TextEncoder, TextDecoder, Buffer, setTimeout, clearTimeout, setInterval, clearInterval, performance, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) }, fetch: () => { throw new Error('offline proof transport'); }, __observe: (kind, value) => observations.push({ kind, cursor: tape.length, value: put(value) }) };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; vm.createContext(sandbox); vm.runInContext(b.code, sandbox, { filename: `${b.id}.compiled.cjs` });
  const startup = tape.length;
  return { E: module.exports.E, S: module.exports.S, R: module.exports.R, sandbox, tape, callers, observations, startup, cursor: () => tape.length, saveTape: () => ({ valuesAndCallerIds: put(tape), callers: put(callers), count: tape.length, startup, forcedValues }) };
}
const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
const descriptors = [2010, 2025].flatMap(startYear => ['ST', 'CM', 'GK'].flatMap(position => Array.from({ length: 8 }, (_, i) => ({ id: `${startYear}-${position}-${i + 1}`, startYear, position, seed: i + 1 }))));
function decision(m, s) {
  const E = m.E, clubs = E.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return ['advanceYouthYear', [s, clubs]];
    case 'contract_offer': { assert(s.pendingOffers.length, 'actual offered seat required'); const o = [...s.pendingOffers].sort((a, b) => a.club.tier - b.club.tier || b.wage - a.wage)[0]; return ['acceptOffer', [s, o]]; }
    case 'playing': return ['advanceProSeason', [s, clubs]];
    case 'newspaper': return ['dismissNewspaper', [s]];
    case 'season_summary': return ['dismissSummary', [s, clubs]];
    case 'ballon_dor': return s.pendingBallonDor && !s.pendingBallonDor.revealed && !s.pendingBallonDor.speech ? ['revealBallonDorResult', [s]] : E.bdorSpeechOpen(s) ? ['giveBdorSpeech', [s, 'tears']] : ['dismissBallonDor', [s, clubs]];
    case 'international_debut': return ['dismissDebut', [s, clubs]];
    case 'world_cup': return E.worldCupSpeechOpen(s) ? ['giveWorldCupSpeech', [s, 'quiet_lap']] : ['dismissWorldCup', [s, clubs]];
    case 'rivalry_event': return ['dismissRivalryEvent', [s, clubs]];
    case 'social_media_action': return s.pendingCoverAthleteEvent ? ['handleCoverAthleteDecision', [s, false]] : ['dismissSocialMediaPhase', [s, clubs]];
    case 'moral_dilemma': return s.pendingMoralDilemma ? ['applyMoralDilemmaChoice', [s, 0]] : ['dismissMoralDilemma', [s, clubs]];
    case 'random_events': assert(s.pendingEvents[0]?.choices?.length); return ['applyEventChoice', [s, 0, clubs]];
    case 'red_card_appeal_result': return ['dismissAppealResult', [s, clubs]];
    case 'rehab_choice': return ['applyRehabChoice', [s, 0]];
    case 'transfer_window': return ['stayAtClub', [s]];
    case 'retirement_suggestion': return ['declineRetirementSuggestion', [s, clubs]];
    default: throw new Error(`unhandled actual phase ${s.phase}`);
  }
}
function runCareer(b, descriptor) {
  const m = machine(b, descriptor.seed), actions = [], errors = []; let s;
  function call(method, args) {
    const before = put(args[0] ?? null), argumentRef = put(args), start = m.cursor(), obsStart = m.observations.length; let output, error = null;
    try { const callback = m.E[method] ?? m.R[method]; assert.equal(typeof callback, 'function', `actual exported callback ${method}`); output = callback(...args); } catch (e) { error = { name: e.name, message: e.message, stack: e.stack }; }
    actions.push({ method, args: argumentRef, before, inputAfter: put(args[0] ?? null), output: put(output ?? null), start, end: m.cursor(), observations: [obsStart, m.observations.length], error });
    if (error) throw Object.assign(new Error(error.message), { actual: error }); return output;
  }
  try {
    s = call('initCareer', [`Generation ${descriptor.id}`, 'England', descriptor.position, descriptor.startYear === 2010 ? '2010-14' : '2025', stats, 70, descriptor.startYear, m.E.FALLBACK_CLUBS, null, 88]);
    for (let step = 0; !s.retired && !['retirement_ceremony', 'retired', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'].includes(s.phase); step++) {
      assert(step < 700, 'complete career finite guard'); const [method, args] = decision(m, s); s = call(method, args);
    }
    assert(s.retired, 'actual career reached retirement');
  } catch (e) { errors.push({ name: e.name, message: e.message, stack: e.stack, actual: e.actual ?? null }); }
  return { result: { descriptor, bundle: b.id, actions: put(actions), observations: put(m.observations), final: put(s ?? null), tape: m.saveTape(), errors: put(errors), errorCount: errors.length }, actions, observations: m.observations, tape: m.tape, final: s };
}
function onlyNewMetadataRemoved(x) {
  const v = copy(x); const visit = q => { if (!q || typeof q !== 'object') return; if (Array.isArray(q)) { q.forEach(visit); return; } delete q.generatedBallonPool; delete q.generatedId; delete q.generatedAge; Object.values(q).forEach(visit); }; visit(v); return v;
}
function poolFindings(pool, year, nominees = []) {
  const found = [], add = (group, detail) => found.push({ group, detail }); if (!pool) return found;
  if (pool.year !== year || pool.nextId !== pool.entries.length || pool.entries.some((e, i) => e.id !== i)) add('identity', 'append-only ids/year');
  if (new Set(pool.entries.map(e => e.name)).size !== pool.entries.length) add('name-reserve', 'saved names unique');
  const active = pool.entries.filter(e => e.retiredYear === null);
  if (new Set(active.map(e => `${e.role}:${e.slot}`)).size !== active.length) add('identity', 'unique active slots');
  for (const e of pool.entries) { const age = e.entryAge + year - e.firstYear; if ((age >= 37 && e.retiredYear !== e.firstYear + 37 - e.entryAge) || (age < 37 && e.retiredYear !== null)) add('retirement', `${e.id} exact age37 year`); }
  for (const n of nominees.filter(n => n.generatedId !== undefined)) { const e = pool.entries[n.generatedId]; if (!e || e.retiredYear !== null) add('replacement', `nominee ${n.generatedId} active`); if (e && n.generatedAge !== e.entryAge + year - e.firstYear) add('age', `nominee ${n.generatedId} derived age`); }
  return found;
}
function malformedCases(valid) {
  const rows = [], add = (id, change, tuple = false) => { const value = copy(valid); change(value); rows.push({ id, value, tuple }); };
  add('null', v => { v.generatedBallonPool = null; });
  add('unknown-version', v => { v.generatedBallonPool.version = 2; });
  add('missing-entries', v => { delete v.generatedBallonPool.entries; });
  add('empty-entries', v => { v.generatedBallonPool.entries = []; v.generatedBallonPool.nextId = 0; });
  add('fraction-year', v => { v.generatedBallonPool.year += .5; });
  add('future-year', v => { v.generatedBallonPool.year = v.seasons.at(-1).year + 1; });
  add('string-year', v => { v.generatedBallonPool.year = String(v.generatedBallonPool.year); });
  add('wrong-next-id', v => { v.generatedBallonPool.nextId++; });
  add('noncontiguous-id', v => { v.generatedBallonPool.entries[0].id = 100; });
  add('invalid-role', v => { v.generatedBallonPool.entries[0].role = 'other'; });
  add('negative-slot', v => { v.generatedBallonPool.entries[0].slot = -1; });
  add('over-slot', v => { v.generatedBallonPool.entries[0].slot = 20; });
  add('fraction-seed', v => { v.generatedBallonPool.entries[0].seed += .5; });
  add('future-first-year', v => { v.generatedBallonPool.entries[0].firstYear = v.generatedBallonPool.year + 1; });
  add('young-entry-age', v => { v.generatedBallonPool.entries[0].entryAge = 18; });
  add('old-entry-age', v => { v.generatedBallonPool.entries[0].entryAge = 29; });
  for (const field of ['name', 'nationality', 'club']) add(`empty-${field}`, v => { v.generatedBallonPool.entries[0][field] = ' '; });
  add('invalid-position', v => { v.generatedBallonPool.entries[0].position = 'GK'; });
  add('wrong-tuple', v => { v.generatedBallonPool.entries[0].baseGoals[0]++; }, true);
  add('huge-tuple', v => { v.generatedBallonPool.entries[0].baseGoals = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]; }, true);
  add('string-tuple', v => { v.generatedBallonPool.entries[0].baseGoals = ['18', '40']; }, true);
  add('short-tuple', v => { v.generatedBallonPool.entries[0].baseGoals = [18]; });
  add('wrong-retirement-year', v => { v.generatedBallonPool.entries[0].retiredYear = v.generatedBallonPool.entries[0].firstYear; });
  if (valid.generatedBallonPool.entries.length > 1) {
    add('duplicate-name', v => { v.generatedBallonPool.entries[1].name = v.generatedBallonPool.entries[0].name; });
    add('duplicate-active-slot', v => { v.generatedBallonPool.entries[1].role = v.generatedBallonPool.entries[0].role; v.generatedBallonPool.entries[1].slot = v.generatedBallonPool.entries[0].slot; });
  }
  return rows;
}
function runBoundary(b, input, year, filler, seed, id) {
  const m = machine(b, seed), s = copy(input), modifications = [{ path: 'seasons[last].year', from: s.seasons.at(-1).year, to: year }];
  s.seasons.at(-1).year = year;
  const before = put(s), prior = s.generatedBallonPool, priorBefore = put(prior ?? null), priorPending = put(s.pendingBallonDor ?? null), start = m.cursor();
  let result = null, error = null, fillerResult = [], template = null;
  try {
    result = m.E.__ballot(s, s.seasons.at(-1), year, s.worldSeasons?.find(w => w.year === year));
    if (filler) { const shortlist = [], fill = m.sandbox.__awardFill; assert.equal(typeof fill, 'function'); fill(shortlist, 10); fillerResult = copy(shortlist); }
    const templatesBefore = copy(m.E.__templates), entry = s.generatedBallonPool?.entries.at(-1);
    if (entry) {
      const tupleBefore = copy(entry.baseGoals), aliased = m.E.__templates.some(p => p.goals === entry.baseGoals);
      const factoryArgs = [new Set(), entry.seed, entry.entryAge], factoryBefore = copy(m.E.__factory(...factoryArgs)), factoryStart = m.cursor();
      entry.baseGoals[0] += 1; const templatesAfter = copy(m.E.__templates), factoryAfter = copy(m.E.__factory(...factoryArgs)); entry.baseGoals[0] = tupleBefore[0];
      template = { templatesBefore, templatesAfter, aliased, restoredEntry: copy(entry), tupleBefore, factoryArgs: [[], entry.seed, entry.entryAge], factoryBefore, factoryAfter, factoryStart, factoryEnd: m.cursor() };
    }
  } catch (e) { error = { name: e.name, message: e.message, stack: e.stack }; }
  const findings = poolFindings(s.generatedBallonPool, year, [...(result?.nominees ?? []), ...fillerResult]);
  for (const o of m.observations.filter(o => o.kind === 'request-end')) {
    const returned = get(o.value);
    if (returned.entry.retiredYear !== null) findings.push({ group: 'replacement', detail: { reason: 'every actually requested profile remains active', returned } });
  }
  if (put(prior ?? null) !== priorBefore) findings.push({ group: 'prior-pool', detail: 'complete prior pool held' });
  if (template && (template.aliased || json(template.templatesBefore) !== json(template.templatesAfter) || json(template.factoryBefore) !== json(template.factoryAfter))) findings.push({ group: 'template-clone', detail: 'new tuple isolated from actual template/factory' });
  if (put(s.pendingBallonDor ?? null) !== priorPending) findings.push({ group: 'pending', detail: 'old pending whole held' });
  /* Round 1318: a valid save no longer implies a readable pool (ruling C3), so this asks both questions the save module used to ask. */
  if (!m.S.isSoccerCareerSave(s) || (s.generatedBallonPool !== undefined && !m.E.isGeneratedBallonPool(s.generatedBallonPool, s.seasons.at(-1).year))) findings.push({ group: 'valid-save', detail: 'complete calculated state valid and its pool readable' });
  if (error) findings.push({ group: 'error', detail: error });
  const row = { id, year, filler, declaredBoundary: true, modifications, before, inputAfter: put(s), priorBefore, priorAfter: put(prior ?? null), priorPending, result: put(result), fillerResult: put(fillerResult), fillSource: put(String(m.sandbox.__awardFill)), template: put(template), observations: put(m.observations), start, end: m.cursor(), tape: m.saveTape(), error, findings };
  return { row, s, result, fillerResult, tape: m.tape };
}
function observationControl(id, baseline, mutate, undo, detect, expected) {
  assert.deepEqual(detect(baseline), []); const fault = copy(baseline); mutate(fault); assert.notDeepEqual(fault, baseline);
  const actual = detect(fault); assert.deepEqual(actual, expected, `${id} precise findings`); const faultRef = put(fault); undo(fault, baseline);
  assert.deepEqual(fault, baseline, `${id} complete actual-copy undo`); assert.deepEqual(detect(fault), []);
  report.observationControls.push({ id, baseline: put(baseline), fault: faultRef, undo: put(fault), findings: actual });
}
function readFixture(b, id, input) {
  const m = machine(b, 29001), raw = json(input), value = JSON.parse(raw), start = m.cursor();
  assert(m.S.isSoccerCareerSave(value)); const loaded = m.E.repairCareer(value), reload = m.E.repairCareer(JSON.parse(json(loaded))), readEnd = m.cursor();
  const dismissed = reload.phase === 'ballon_dor' ? m.E.dismissBallonDor(reload, m.E.FALLBACK_CLUBS) : reload;
  return { id, raw, input: put(input), inputAfter: put(value), loaded: put(loaded), reload: put(reload), dismissed: put(dismissed), start, readEnd, end: m.cursor(), observations: put(m.observations), tape: m.saveTape() };
}
function sizeOf(dir) { return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? sizeOf(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0); }
/* Exact maps come from healthy retained inputs/requests, never from fault findings. */
function expectedControlGroups(id, healthy) {
  const row = healthy.row, prior = get(row.before).generatedBallonPool, pool = healthy.s.generatedBallonPool;
  const requests = get(row.observations).filter(o => o.kind === 'request').map(o => get(o.value));
  const nominees = [...(healthy.result?.nominees ?? []), ...healthy.fillerResult], oldFor = q => prior.entries.find(e => e.role === q.role && e.slot === q.slot);
  const retired = e => e.retiredYear !== null || e.entryAge + row.year - e.firstYear >= 37;
  switch (id) {
    case 'new-profile-tuple-alias': return pool.entries.at(-1).id >= prior.nextId ? ['template-clone'] : [];
    case 'wrong-goal-tuple-accepted': case 'malformed-pool-accepted': return [];
    case 'frozen-age': return nominees.some(n => n.generatedId !== undefined && n.generatedAge !== pool.entries[n.generatedId].entryAge) ? ['age'] : [];
    case 'missing-retirement': return prior.entries.some(e => e.retiredYear === null && retired(e)) ? ['retirement', 'valid-save'] : [];
    case 'retired-slot-reuse': return requests.some(q => { const old = oldFor(q); return old && retired(old); }) ? ['replacement'] : [];
    case 'filler-reroll': {
      const seen = new Set(); let reused = false;
      for (const q of requests.filter(q => q.role === 'filler')) { const key = `${q.role}:${q.slot}`, old = oldFor(q); if (seen.has(key) || old && !retired(old)) reused = true; seen.add(key); }
      return reused ? ['identity', 'valid-save'] : [];
    }
    case 'previous-pool-mutation': return prior.year !== row.year ? ['prior-pool'] : [];
    case 'extra-generated-draw': return requests.length ? ['paired-outcome', 'request-draws'] : [];
    default: throw new Error(`Undeclared source control ${id}`);
  }
}
async function main() {
  report.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); report.tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.equal(execFileSync('git', ['rev-parse', `${BASE}:${ENGINE}`], { cwd: ROOT, encoding: 'utf8' }).trim(), '1269513a237ce97cca7d65bf6b43f56c86facd88');
  assert.equal(execFileSync('git', ['rev-parse', `${BASE}:${SAVE}`], { cwd: ROOT, encoding: 'utf8' }).trim(), 'ceeba9c3dc6c6558f9a4d11c0ec28c3beea4c465');
  const baseRoot = path.join(ROOT, '.tmp-fx', `award-generations-base-${process.pid}`); fs.mkdirSync(baseRoot, { recursive: true });
  const archive = execFileSync('git', ['archive', '--format=tar', BASE], { cwd: ROOT, maxBuffer: 150_000_000 });
  const packedArchive = zlib.gzipSync(archive, { level: 9 }); fs.writeFileSync(path.join(OUT, 'original-source.tar.gz'), packedArchive);
  execFileSync('tar', ['-xzf', path.join(OUT, 'original-source.tar.gz'), '-C', baseRoot]);
  report.original = { archiveSha256: sha(archive), bytes: archive.length, packedSha256: sha(packedArchive), packedBytes: packedArchive.length, archivePath: 'original-source.tar.gz', codec: 'complete gzip TAR, no omitted members', tree: execFileSync('git', ['rev-parse', `${BASE}^{tree}`], { cwd: ROOT, encoding: 'utf8' }).trim(), inventory: putBytes(execFileSync('git', ['ls-tree', '-r', '-z', BASE], { cwd: ROOT }), 'git-inventory') };
  const originalPlain = await bundle('original-plain', baseRoot, {}, false, false), originalObserved = await bundle('original-observed', baseRoot, {}, true, false);
  const currentPlain = await bundle('current-plain', ROOT, healthyText, false, true), healthy = await bundle('current-observed', ROOT, healthyText, true, true);
  report.population = descriptors; report.policy = 'Actual constructors at overall70/potential88; best initial offer, no optional training/social post, first actual event/dilemma/rehab choice, stay at club and decline suggestions until actual retirement. No phase fabrication.';
  const natural = new Map(); let sourceFixture, legacyFixture, pendingFixture, legacyPendingFixture;
  for (const b of [originalPlain, originalObserved, currentPlain, healthy]) {
    const runs = []; report.natural[b.id] = runs;
    for (const d of descriptors) {
      const run = runCareer(b, d); runs.push(run.result); natural.set(`${b.id}:${d.id}`, run);
      if (b === healthy) for (const action of run.actions) {
        const value = get(action.output);
        if (!legacyFixture && value && !value.generatedBallonPool) legacyFixture = copy(value);
        if (!sourceFixture && value?.generatedBallonPool?.entries?.length >= 3) sourceFixture = copy(value);
        if (!pendingFixture && value?.phase === 'ballon_dor' && value.pendingBallonDor && value.generatedBallonPool) pendingFixture = copy(value);
        if (!legacyPendingFixture && value?.phase === 'ballon_dor' && value.pendingBallonDor && !value.generatedBallonPool) legacyPendingFixture = copy(value);
        if (action.method === 'advanceProSeason') {
          const prior = get(action.before), after = get(action.inputAfter);
          verify(`public ${d.id}:${action.start}`, () => {
            assert.deepEqual(after.generatedBallonPool, prior.generatedBallonPool, 'public prior pool whole held');
            assert.deepEqual(value.seasons.slice(0, prior.seasons.length), prior.seasons, 'public prior season prefix held');
          });
        }
      }
    }
  }
  for (const d of descriptors) for (const prefix of ['original', 'current']) {
    const a = natural.get(`${prefix}-plain:${d.id}`), b = natural.get(`${prefix}-observed:${d.id}`);
    verify(`natural ${prefix}:${d.id}`, () => {
    assert.deepEqual(b.actions.map(({ observations, ...rest }) => rest), a.actions.map(({ observations, ...rest }) => rest), `whole plain/observed ${prefix}:${d.id}`);
    assert.deepEqual(b.tape.map(r => r[0]), a.tape.map(r => r[0]), `whole global values ${prefix}:${d.id}`);
    assert.equal(a.result.errorCount, 0, `retained career ${prefix}:${d.id} completed`); assert.equal(b.result.errorCount, 0);
    if (prefix === 'current') {
      const oa = natural.get(`original-observed:${d.id}`), oldBallots = oa.observations.filter(o => o.kind === 'ballot-after'), newBallots = b.observations.filter(o => o.kind === 'ballot-after');
      const first = newBallots.find(o => get(o.value).state.generatedBallonPool);
      if (first) { const value = get(first.value), old = oldBallots.find(o => get(o.value).year === value.year); assert(old);
        assert.deepEqual(onlyNewMetadataRemoved(value), get(old.value), 'first actual generated ballot whole original held');
        assert.deepEqual(b.tape.slice(0, first.cursor).map(r => r[0]), oa.tape.slice(0, old.cursor).map(r => r[0]), 'first ballot whole values held');
      }
      for (const o of newBallots) { const v = get(o.value); assert.deepEqual(poolFindings(v.state.generatedBallonPool, v.year, v.night.nominees), []); }
    }
    });
  }
  report.factoryOracles = [];
  const factoryEntropy = [], factoryMachine = machine(originalObserved, 1, factoryEntropy);
  assert.equal(factoryMachine.startup, 0, 'explicit factory-age boundary starts after zero import draws');
  const certifyFactory = observation => {
    const value = get(observation.value), forced = (value.profile.startAge - 19 + .5) / 10, m = factoryMachine, start = m.cursor(); factoryEntropy.push(forced);
    const result = m.E.__factory(new Set(value.usedNames), value.seed);
    assert.deepEqual(copy(result), value.profile, 'complete original generated factory profile');
    assert.equal(m.cursor() - start, 1, 'one actual original factory age draw');
    report.factoryOracles.push({ observation, declaredAgeEntropy: forced, args: put({ usedNames: value.usedNames, seed: value.seed }), output: put(result), start, end: m.cursor() });
  };
  for (const d of descriptors) for (const o of natural.get(`current-observed:${d.id}`).observations.filter(o => o.kind === 'factory')) verify(`factory ${d.id}:${o.cursor}`, () => certifyFactory(o));
  assert(sourceFixture && legacyFixture && pendingFixture && legacyPendingFixture, 'finite genuine generated/legacy/pending witnesses required');
  report.fixtures = { legacy: put(legacyFixture), generated: put(sourceFixture), pending: put(pendingFixture), legacyPending: put(legacyPendingFixture) };
  const firstYear = sourceFixture.generatedBallonPool.year, firstEntry = sourceFixture.generatedBallonPool.entries[0];
  const years = [...new Set([firstYear, firstYear + 1, firstYear + 3, firstEntry.firstYear + 36 - firstEntry.entryAge, firstEntry.firstYear + 37 - firstEntry.entryAge, firstYear + 25])].sort((a, b) => a - b);
  const inputs = years.flatMap(year => [false, true].map(filler => ({ id: `${year}-${filler ? 'filler' : 'primary'}`, input: sourceFixture, year, filler, seed: 7001 })));
  const firstFiller = runBoundary(healthy, sourceFixture, firstYear, true, 7001, 'filler-entry'); assert.deepEqual(firstFiller.row.findings, []); report.boundaries.push(firstFiller.row);
  const fillerFixture = copy(firstFiller.s); report.fixtures.filler = put(fillerFixture);
  inputs.push(...[firstYear, firstYear + 1, firstYear + 25].map(year => ({ id: `saved-filler-${year}`, input: fillerFixture, year, filler: true, seed: 7001 })));
  const healthyRows = inputs.map(p => runBoundary(healthy, p.input, p.year, p.filler, p.seed, p.id));
  for (const r of healthyRows) { assert.deepEqual(r.row.findings, [], `healthy ${r.row.id}`); report.boundaries.push(r.row); }
  for (const r of [firstFiller, ...healthyRows]) {
    const observed = get(r.row.observations), starts = observed.filter(o => o.kind === 'request'), ends = observed.filter(o => o.kind === 'request-end');
    assert.equal(starts.length, ends.length);
    for (let j = 0; j < starts.length; j++) assert.equal(ends[j].cursor, starts[j].cursor, 'healthy request returns without extra global draws');
    for (const o of get(r.row.observations).filter(o => o.kind === 'factory')) certifyFactory(o);
    const prior = get(r.row.before).generatedBallonPool, pool = r.s.generatedBallonPool, requests = get(r.row.observations).filter(o => o.kind === 'request').map(o => get(o.value));
    for (const entry of pool.entries) {
      const old = prior.entries[entry.id];
      if (old) { const expected = copy(old); expected.retiredYear = old.entryAge + r.row.year - old.firstYear >= 37 ? old.firstYear + 37 - old.entryAge : old.retiredYear; assert.deepEqual(copy(entry), expected, 'entire old profile immutable except exact retirement'); }
      else {
        const request = requests.find(q => q.role === entry.role && q.slot === entry.slot); assert(request);
        const oldSlot = prior.entries.some(q => q.role === entry.role && q.slot === entry.slot);
        assert.equal(entry.seed, oldSlot ? 9900 + entry.id : request.initialSeed, 'serialized replacement seed');
        assert.equal(entry.firstYear, r.row.year); assert.equal(entry.entryAge, request.entryAge, 'saved actual entry-age roll');
      }
    }
  }
  report.factoryOracleTape = factoryMachine.saveTape();
  report.reads = [];
  for (const [id, input] of Object.entries({ legacy: legacyFixture, generated: sourceFixture, pending: pendingFixture, legacyPending: legacyPendingFixture })) {
    const old = readFixture(originalObserved, id, input), current = readFixture(healthy, id, input);
    for (const key of ['inputAfter', 'loaded', 'reload', 'dismissed', 'start', 'readEnd', 'end']) assert.equal(current[key], old[key], `whole original/current read ${id}:${key}`);
    assert.equal(current.start, current.readEnd, 'fully initialized read/reload adds no draw');
    assert.deepEqual(get(current.tape.valuesAndCallerIds).map(r => r[0]), get(old.tape.valuesAndCallerIds).map(r => r[0]));
    assert.deepEqual(get(current.observations), [], 'read/dismiss never creates generated candidates');
    report.reads.push({ id, original: old, current });
  }
  const bad = malformedCases(sourceFixture), validationInputs = [{ id: 'valid-generated', value: sourceFixture }, { id: 'valid-legacy', value: legacyFixture }, ...bad];
  /* Round 1318 (ruling C3): every case opens as a save; what a case expects is the reader's answer on its pool (absent reads as fine). */
  const validatorRun = b => { const m = machine(b, 9001); return validationInputs.map(r => { const start = m.cursor(), saved = m.S.isSoccerCareerSave(r.value), accepted = r.value.generatedBallonPool === undefined || m.E.isGeneratedBallonPool(r.value.generatedBallonPool, r.value.seasons.at(-1).year); return { id: r.id, input: put(r.value), inputAfter: put(r.value), saved, accepted, start, end: m.cursor(), expected: !bad.some(v => v.id === r.id) }; }); };
  const validRows = validatorRun(healthy); assert(validRows.every(r => r.saved && r.accepted === r.expected && r.start === r.end)); report.validation = put(validRows);
  for (const [id, source, from, to, groups] of controls) {
    const changed = one(healthyText[source], from, to), restored = one(changed, to, from); assert.equal(restored, healthyText[source]);
    const fault = await bundle(id, ROOT, { ...healthyText, [source]: changed }, true, true);
    const rows = inputs.map(p => runBoundary(fault, p.input, p.year, p.filler, p.seed, p.id)), actual = [], expectedMap = healthyRows.map(h => ({ caseId: h.row.id, groups: expectedControlGroups(id, h).sort() }));
    for (let i = 0; i < rows.length; i++) {
      const a = rows[i], h = healthyRows[i];
      report.boundaries.push({ control: id, ...a.row });
      verify(`control ${id}:${a.row.id}`, () => {
      if (id === 'extra-generated-draw') {
        const observed = get(a.row.observations), starts = observed.filter(o => o.kind === 'request'), ends = observed.filter(o => o.kind === 'request-end');
        assert.equal(starts.length, ends.length);
        for (let j = 0; j < starts.length; j++) assert.equal(ends[j].cursor - starts[j].cursor, 1, 'one actual extra draw between age and returned profile');
        const outputChanged = ['inputAfter', 'priorAfter', 'result', 'fillerResult', 'template'].filter(k => a.row[k] !== h.row[k]), vectorChanged = json(a.tape.map(r => r[0])) !== json(h.tape.map(r => r[0]));
        a.row.pairedDifference = { outputChanged, vectorChanged, healthyTape: h.row.tape, faultTape: a.row.tape, healthyOutput: h.row, faultOutput: { inputAfter: a.row.inputAfter, priorAfter: a.row.priorAfter, result: a.row.result, fillerResult: a.row.fillerResult, template: a.row.template } };
        if (starts.length) a.row.findings.push({ group: 'request-draws', detail: { requests: starts.length, fullDrawDelta: a.tape.length - h.tape.length } });
        if (outputChanged.length || vectorChanged) a.row.findings.push({ group: 'paired-outcome', detail: a.row.pairedDifference });
      }
      const changedOutput = ['inputAfter', 'priorAfter', 'result', 'fillerResult', 'template'].some(k => a.row[k] !== h.row[k]);
      if (changedOutput) assert(a.row.findings.length, `changed full output needs intended finding ${id}:${a.row.id}`);
      if (!a.row.findings.length) for (const k of ['inputAfter', 'priorAfter', 'result', 'fillerResult', 'template']) assert.equal(a.row[k], h.row[k], `unrelated full output ${id}:${a.row.id}`);
      assert(a.row.findings.every(f => groups.includes(f.group)), `no unrelated findings ${id}:${a.row.id}`);
      assert.deepEqual([...new Set(a.row.findings.map(f => f.group))].sort(), expectedMap[i].groups, `complete intended case/group map ${id}:${a.row.id}`);
      if (!expectedMap[i].groups.length) {
        for (const key of ['inputAfter', 'priorAfter', 'result', 'fillerResult', 'template']) assert.equal(a.row[key], h.row[key], `complete unrelated healthy output ${id}:${a.row.id}:${key}`);
        assert.deepEqual(a.tape.map(r => r[0]), h.tape.map(r => r[0]), `complete unrelated healthy vector ${id}:${a.row.id}`);
      }
      });
      actual.push(...a.row.findings.map(f => ({ caseId: a.row.id, ...f })));
    }
    const vr = validatorRun(fault), vf = vr.filter(r => r.accepted !== r.expected).map(r => ({ caseId: r.id, group: 'invalid-save' }));
    actual.push(...vf);
    verify(`control ${id} precise map`, () => {
      assert(vf.every(f => groups.includes(f.group)), `${id} validator unrelated hold`);
      assert(vr.every(r => r.saved), `${id} every case still opens as a save (ruling C3)`);
      if (id === 'wrong-goal-tuple-accepted') assert.deepEqual(vf.map(f => f.caseId), bad.filter(r => r.tuple).map(r => r.id));
      else if (id === 'malformed-pool-accepted') assert.deepEqual(vf.map(f => f.caseId), bad.map(r => r.id));
      else assert.deepEqual(vf, [], `${id} all validator outcomes held`);
      assert.deepEqual(rows.map(r => ({ caseId: r.row.id, groups: [...new Set(r.row.findings.map(f => f.group))].sort() })), expectedMap, `${id} complete exact boundary outcome map`);
      assert(actual.length, `effective ${id}`);
    });
    const unrelatedReads = report.reads.map(r => readFixture(fault, r.id, get(r.current.input)));
    for (let i = 0; i < unrelatedReads.length; i++) verify(`control ${id} whole read ${unrelatedReads[i].id}`, () => {
      for (const key of ['raw', 'input', 'inputAfter', 'loaded', 'reload', 'dismissed', 'start', 'readEnd', 'end', 'observations']) assert.equal(unrelatedReads[i][key], report.reads[i].current[key]);
      assert.deepEqual(get(unrelatedReads[i].tape.valuesAndCallerIds).map(r => r[0]), get(report.reads[i].current.tape.valuesAndCallerIds).map(r => r[0]));
    });
    report.controls.push({ id, groups, before: put(healthyText[source]), fault: put(changed), undo: put(restored), bundle: fault.receipt, rows: put(rows.map(r => r.row)), validation: put(vr), unrelatedReads: put(unrelatedReads), expectedBoundaryMap: expectedMap, expectedValidatorMap: id === 'wrong-goal-tuple-accepted' ? bad.filter(r => r.tuple).map(r => r.id) : id === 'malformed-pool-accepted' ? bad.map(r => r.id) : [], preciseFailures: actual });
  }
  const undo = await bundle('whole-undo', ROOT, healthyText, true, true), undoRows = inputs.map(p => runBoundary(undo, p.input, p.year, p.filler, p.seed, p.id));
  assert.equal(undo.receipt.codeSha256, healthy.receipt.codeSha256, 'whole executed compiled source undo');
  for (let i = 0; i < undoRows.length; i++) { const a = undoRows[i].row, b = healthyRows[i].row; for (const k of ['inputAfter', 'priorAfter', 'result', 'fillerResult', 'template']) assert.equal(a[k], b[k], 'full runtime undo'); assert.deepEqual(undoRows[i].tape.map(r => r[0]), healthyRows[i].tape.map(r => r[0])); assert.deepEqual(a.findings, []); }
  report.undo = put(undoRows.map(r => r.row));
  const replacement = healthyRows.find(r => r.s.generatedBallonPool.entries.some(e => e.retiredYear !== null) && r.s.generatedBallonPool.entries.length > sourceFixture.generatedBallonPool.entries.length); assert(replacement);
  const pool = replacement.s.generatedBallonPool, retired = pool.entries.find(e => e.retiredYear !== null);
  const nomineeIndex = replacement.result.nominees.findIndex(n => n.generatedId >= sourceFixture.generatedBallonPool.nextId); assert(nomineeIndex >= 0);
  const added = pool.entries[replacement.result.nominees[nomineeIndex].generatedId];
  const nameObservation = { sourceRow: replacement.row, state: copy(replacement.s), result: copy(replacement.result), filler: copy(replacement.fillerResult) };
  observationControl('retired-name-collision', nameObservation, v => { v.state.generatedBallonPool.entries[added.id].name = retired.name; v.result.nominees[nomineeIndex].name = retired.name; }, (v, h) => { v.state.generatedBallonPool.entries[added.id].name = h.state.generatedBallonPool.entries[added.id].name; v.result.nominees[nomineeIndex].name = h.result.nominees[nomineeIndex].name; }, v => new Set(v.state.generatedBallonPool.entries.map(e => e.name)).size === v.state.generatedBallonPool.entries.length ? [] : ['saved-name-uniqueness'], ['saved-name-uniqueness']);
  const fixtureFile = path.join(OUT, 'component-fixtures.json'); write('component-fixtures.json', { legacy: legacyFixture, generated: sourceFixture, pending: pendingFixture, legacyPending: legacyPendingFixture, invalid: bad });
  const componentDir = path.join(OUT, 'component'); fs.mkdirSync(componentDir, { recursive: true });
  const component = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/soccerCareerAwardGenerations.test.tsx', '--reporter=json', `--outputFile=${path.join(componentDir, 'vitest.json')}`], { cwd: ROOT, env: { ...process.env, SOCCER_AWARD_GENERATIONS_FIXTURES: fixtureFile, SOCCER_AWARD_COMPONENT_OBSERVER: path.join(componentDir, 'observations.json') }, encoding: 'utf8', maxBuffer: 30_000_000 });
  fs.writeFileSync(path.join(componentDir, 'stdout.log'), component.stdout ?? ''); fs.writeFileSync(path.join(componentDir, 'stderr.log'), component.stderr ?? ''); write('component/exit.json', { status: component.status, signal: component.signal, error: component.error ? String(component.error) : null });
  assert.equal(component.status, 0, 'actual separate component tests pass');
  const pageObservations = JSON.parse(fs.readFileSync(path.join(componentDir, 'observations.json'), 'utf8')); assert(pageObservations.length);
  const frameworkSetup = JSON.parse(fs.readFileSync(path.join(componentDir, 'observations-framework-setup.json'), 'utf8'));
  assert.deepEqual(Object.keys(frameworkSetup).sort(), ['draws', 'id', 'storageAfter', 'storageBefore']);
  const frameworkObservation = { setup: frameworkSetup, rows: pageObservations };
  const frameworkFindings = v => {
    const keys = [], d = v.setup.draws;
    if (v.setup.id !== 'react-async-act-setup' || !Array.isArray(d) || d.length !== 1 || d[0].value !== .52 || typeof d[0].stack !== 'string' || !d[0].stack.includes('at enqueueTask ') || !d[0].stack.includes('/node_modules/react/cjs/react.development.js:2458:45')) keys.push('framework-vector');
    try { assert.deepEqual(v.setup.storageAfter, v.setup.storageBefore); } catch { keys.push('framework-storage'); }
    if (v.rows.length !== 31) keys.push('framework-row-count');
    if (v.rows.some(row => { try { assert.deepEqual(row.frameworkSetup, v.setup); return false; } catch { return true; } })) keys.push('framework-row-binding');
    return keys;
  };
  assert.deepEqual(frameworkFindings(frameworkObservation), [], 'actual separate framework setup and all31 row bindings');
  const frameworkFault = copy(frameworkObservation), storageFaultKey = 'labelled-copied-framework-storage-fault';
  assert(!Object.hasOwn(frameworkFault.setup.storageAfter, storageFaultKey));
  frameworkFault.setup.draws[0].value = .51;
  frameworkFault.setup.storageAfter[storageFaultKey] = 'Labelled copied observation only, not an application write.';
  frameworkFault.rows[0].frameworkSetup.id = 'labelled-copied-framework-id';
  const frameworkOmittedRow = frameworkFault.rows.pop();
  assert.notDeepEqual(frameworkFault, frameworkObservation);
  const frameworkFailures = frameworkFindings(frameworkFault);
  assert.deepEqual(frameworkFailures, ['framework-vector', 'framework-storage', 'framework-row-count', 'framework-row-binding']);
  for (let i = 1; i < frameworkFault.rows.length; i++) assert.deepEqual(frameworkFault.rows[i], frameworkObservation.rows[i], 'every unrelated complete framework-bound page row held');
  const frameworkFaultRef = put(frameworkFault);
  frameworkFault.setup.draws[0].value = frameworkObservation.setup.draws[0].value;
  delete frameworkFault.setup.storageAfter[storageFaultKey];
  frameworkFault.rows[0].frameworkSetup.id = frameworkObservation.rows[0].frameworkSetup.id;
  frameworkFault.rows.push(frameworkOmittedRow);
  assert.deepEqual(frameworkFault, frameworkObservation, 'complete actual copied framework undo');
  assert.deepEqual(frameworkFindings(frameworkFault), []);
  const frameworkControl = { baseline: put(frameworkObservation), fault: frameworkFaultRef, omittedRow: put(frameworkOmittedRow), undo: put(frameworkFault), findings: frameworkFailures, qualification: 'Copied setup observation only. No actual app draw or write was manufactured.' };
  const pendingIndex = pageObservations.findIndex(r => r.id === 'legacyPending'); assert(pendingIndex >= 0);
  const actualPending = pageObservations[pendingIndex], revealIndex = actualPending.callbacks.findIndex(r => r.id === 'reveal'); assert(revealIndex >= 0);
  const pendingRead = { observations: pageObservations, pendingIndex, revealIndex, before: JSON.parse(actualPending.rawBefore).pendingBallonDor, after: JSON.parse(actualPending.rawAfterReload).pendingBallonDor };
  observationControl('old-pending-ballot-changed', pendingRead, v => {
    v.after.nominees[0].goals++;
    v.observations[v.pendingIndex].actualLoadDraws.push({ value: .52, stack: 'Labelled copied observation only, not an application-produced draw.' });
    v.observations[v.pendingIndex].callbacks[v.revealIndex].actual.pendingBallonDor.nominees[0].goals++;
  }, (v, h) => {
    v.after.nominees[0].goals = h.after.nominees[0].goals;
    v.observations[v.pendingIndex].actualLoadDraws.pop();
    v.observations[v.pendingIndex].callbacks[v.revealIndex].actual.pendingBallonDor.nominees[0].goals = h.observations[h.pendingIndex].callbacks[h.revealIndex].actual.pendingBallonDor.nominees[0].goals;
  }, v => {
    for (let i = 0; i < v.observations.length; i++) if (i !== v.pendingIndex) assert.deepEqual(v.observations[i], pendingRead.observations[i], 'every unrelated complete page observation held');
    const keys = [], selected = v.observations[v.pendingIndex];
    if (json(v.before) !== json(v.after)) keys.push('pending-ballot-immutability');
    if (json(selected.actualLoadDraws.map(d => d.value)) !== json(selected.expectedLoad.draws.map(d => d.value))
      || json(selected.allDraws.map(d => d.value)) !== json([...selected.expectedLoad.draws, ...selected.expectedReload.draws].map(d => d.value))) keys.push('read-draws');
    if (selected.callbacks.some(c => { try { assert.deepEqual(c.actual, c.expected.output); assert.deepEqual(c.draws.map(d => d.value), c.expected.draws.map(d => d.value)); return false; } catch { return true; } })) keys.push('callback-outcome');
    return keys;
  }, ['pending-ballot-immutability', 'read-draws', 'callback-outcome']);
  /* Round 1318 (ruling C3): a declared malformed pool now opens as the career, so the raw it keeps is the page's own
     write, and what must hold is that a reload writes nothing new over it. */
  const invalidObservation = pageObservations.find(r => r.invalid && r.rawAfter === r.rawAfterReload); assert(invalidObservation);
  observationControl('unreadable-pool-reload-rewritten', invalidObservation, v => { v.rawAfterReload = v.rawAfterReload.slice(1); }, (v, h) => { v.rawAfterReload = h.rawAfterReload; }, v => v.rawAfter === v.rawAfterReload ? [] : ['raw-storage-held'], ['raw-storage-held']);
  report.component = { observations: put(pageObservations), vitest: put(JSON.parse(fs.readFileSync(path.join(componentDir, 'vitest.json'), 'utf8'))), frameworkSetup: put(frameworkSetup), frameworkControl };
  for (const [p, raw] of rawBefore) assert.deepEqual(fs.readFileSync(path.join(ROOT, p)), raw, `held disk ${p}`);
  report.heldSources = [...rawBefore].map(([p, raw]) => ({ path: p, bytes: raw.length, sha256: sha(raw) }));
  report.limitations = ['Generated-only model, no real biography change.', 'Filler shortages/year gaps are declared complete saved-model boundaries.', 'Future career result/random neutrality is not claimed after candidate identities diverge.', 'Component presentation/network services are mocked, actual page loader/save effects run.', 'Existing39 recovery tests and old harness/floors remain unchanged.'];
  assert.equal(failures.length, 0, 'all retained natural/boundary checks healthy');
  report.status = 'pass'; console.log('48 fixed original/current complete career descriptors retained');
  console.log(`${report.boundaries.length} complete lifecycle/control boundary outputs retained`);
  console.log('9 effective compiled source controls and3 copied observation controls restored');
  console.log('PASS simSoccerAwardGenerations: saved generated identities, aging, turnover and raw recovery');
}
function completeProofSize() {
  const receipt = { bytes: 0, cap: 430_000_000, complete: true, storageComplete: report.storage?.complete === true };
  for (let attempt = 0; attempt < 12; attempt++) {
    write('size.json', receipt);
    const bytes = sizeOf(OUT);
    if (receipt.bytes === bytes) return receipt;
    receipt.bytes = bytes;
  }
  throw new Error('Complete self-inclusive proof size did not converge');
}
try { proofStorage = createAwardProofStorage(OUT); await main(); }
catch (e) { failures.push({ name: e.name, message: e.message, stack: e.stack }); report.status = 'fail'; process.exitCode = 1; console.error(e.stack); }
finally {
  try {
    assert.ok(proofStorage, 'actual storage writer created');
    report.storage = await proofStorage.finish();
    assert.equal(report.storage.status, 'pass', 'complete persisted byte storage');
    assert.equal(report.storage.complete, true, 'complete persisted reconstruction and both decoder controls');
  } catch (e) {
    report.status = 'fail'; process.exitCode = 1;
    failures.push({ stage: 'storage-finalization', name: e.name, message: e.message, stack: e.stack });
    if (!report.storage) report.storage = { representation: 'cdc-byte-pack-v1', status: 'fail', complete: false, error: { name: e.name, message: e.message, stack: e.stack } };
  }
  write('failures.json', failures); write('objects.json', [...objects.values()]); write('report.json', report);
  try {
    const size = completeProofSize();
    if (size.bytes >= 430_000_000) {
      report.status = 'fail'; process.exitCode = 1;
      failures.push({ name: 'ArtifactCapError', message: 'Complete proof exceeds430000000 bytes' });
      write('failures.json', failures); write('report.json', report); completeProofSize();
    }
  } catch (e) {
    report.status = 'fail'; process.exitCode = 1; report.finalInventoryComplete = false;
    failures.push({ stage: 'proof-footer', name: e.name, message: e.message, stack: e.stack });
    write('failures.json', failures); write('report.json', report); write('size.json', { bytes: sizeOf(OUT), cap: 430_000_000, complete: false, storageComplete: report.storage?.complete === true });
  }
}
