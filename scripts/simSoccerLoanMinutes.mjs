/** Projected forced-loan minutes over declared saved boundaries, not natural careers.
 * All execution belongs in Actions. The missing-filter arm must recover the engine before
 * PR235 (merge c's first parent, cf559ebb^1), its outcomes and draws; unsuitable already saved
 * offers remain usable. Until Release BA that base was a pinned commit (aa564f16, "AA" in
 * older records); it is now this head with the declared inverses applied (see below).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.SOCCER_LOAN_MINUTES_OUT || path.join(ROOT, 'soccer-loan-minutes-artifacts/proof'));
/* Release BA (leg c2): the original arm is THIS head with the change's own two inverses applied by the exact once
   helper replaceOne, never a fixed commit. The pin to aa564f16 broke as soon as main's engine moved past it (15
   commits by the merge), a runner checkout without that commit cannot read it, and every later Soccer Career change
   would break it again. Proven at merge c (cf559ebb): both inverses applied to the merged head give its first
   parent's engine and appearance files byte for byte, and the undo restores the head. With a self relative original
   FIVE checks below are true by construction and stay only as round trip checks, not as evidence (the Release BA
   harness integrity review counted the last two): (1) the fault source equals the original ('missing-filter full
   source equals the original'), (2) the original and remove-filter compiled hashes are equal, (3) the two arms'
   outcomes are equal ('remove-filter/whole-original-outcomes'), (4) every other src module the bundle loads equals
   its base ('unchanged loaded source', since base is the same bytes as raw), and (5) 'remove-filter/exact-map', the
   remove-filter arm's law findings deepEqual the original arm's, which run the same engine on the same inputs.
   What still bites: the current arm's law, terms, parent identity and returns, the same-input acknowledgement and
   season replays against the original, the remove-filter control's effectiveness (all three law groups) and the
   four comparison controls.
   THE CRADLE INVERSE NEVER REACHES COMPILED CODE. The appearance module is in every bundle, but the engine imports
   only the PlayerAppearance type from it, so CELEBRATIONS is tree shaken and neither cradle line is in any arm's
   compiled output (report.appearance.compiledCradle records it per arm). servedByArm says which source each arm was
   SERVED, not what it ran. PR235's cradle sentence is held here only as an anchor (replaceOne throws if it changes),
   never exercised. Pre-existing in PR235's harness; owed back with it. */
const BASE = 'self: this head with the declared filter and cradle inverses applied';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const APPEARANCE = 'src/lib/soccerCareerAppearance.ts';
const FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json';
const require = createRequire(import.meta.url);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const blobId = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}` + String.fromCharCode(0)), Buffer.from(bytes)])).digest('hex');
const lf = text => text.replaceAll('\r\n', '\n');
const json = value => JSON.parse(JSON.stringify(value));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 150_000_000 });
const objects = {}, failures = [], armRows = {}, bundles = {}, currentReplayInputs = new Map();
const report = { status: 'fail', base: BASE, head: git('rev-parse', 'HEAD').toString().trim(), tree: git('rev-parse', 'HEAD^{tree}').toString().trim(),
  scope: '160 explicitly altered saved boundaries; one actual loan-season/return path per moved input; no natural career or guaranteed appearance claim',
  clock: '2026-10-11T12:00:00.000Z', callerComparison: 'Complete raw stacks retained; ordinary old/current comparisons replace only caller line/column coordinates. Only recorded-current progression versus its same-input replay additionally checks the byte-identical raw prefix through forwardSeason and exact source-bound outer harness routes with the measured10-frame truncation.', arms: {}, controls: [], failures };
fs.mkdirSync(path.join(OUT, 'objects'), { recursive: true });
function save(rel, bytes) { const target = path.join(OUT, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); return { path: rel, bytes: Buffer.byteLength(bytes), sha256: sha(bytes) }; }
function put(value) {
  const raw = Buffer.from(JSON.stringify(value)); const id = sha(raw);
  if (!objects[id]) { const packed = gzipSync(raw, { level: 9 }); objects[id] = { ...save(`objects/${id}.json.gz`, packed), rawBytes: raw.length, rawSha256: id, codec: 'gzip-json-utf8' }; }
  return id;
}
function get(id) { const record = objects[id]; assert.ok(record, 'declared complete object'); const packed = fs.readFileSync(path.join(OUT, record.path)); assert.equal(sha(packed), record.sha256); const raw = gunzipSync(packed); assert.equal(raw.length, record.rawBytes); assert.equal(sha(raw), id); return JSON.parse(raw); }
function comparableFrame(frame) {
  const out = clone(frame);
  for (const key of ['draws', 'fullTape']) out[key] = get(frame[key]).map(item => ({ value: item.value, caller: item.caller.replace(/:\d+:\d+/g, ':<line>:<column>') }));
  out.continuation = get(frame.continuation); return out;
}
function comparableRow(row) { return { ...row, frames: row.frames.map(comparableFrame) }; }
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') { const out = {}; for (const [key, item] of Object.entries(value)) Object.defineProperty(out, key, { value: clone(item), enumerable: true, writable: true, configurable: true }); return out; }
  return value;
}
function comparisonCopy(value) {
  if (Array.isArray(value)) { const out = new Array(value.length); for (const key of Object.keys(value)) Object.defineProperty(out, key, { value: comparisonCopy(value[key]), enumerable: true, writable: true, configurable: true }); return out; }
  if (value && typeof value === 'object') { const out = {}; for (const [key, item] of Object.entries(value)) Object.defineProperty(out, key, { value: comparisonCopy(item), enumerable: true, writable: true, configurable: true }); return out; }
  return value;
}
function snapshot(value) {
  const callbacks = [], undefinedPaths = []; const seen = new Set();
  function visit(item, route) {
    if (item === undefined) { undefinedPaths.push(route); return; }
    if (typeof item === 'function') { callbacks.push({ path: route, name: item.name, source: Function.prototype.toString.call(item) }); return; }
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item); for (const [key, child] of Object.entries(item)) visit(child, [...route, key]); seen.delete(item);
  }
  visit(value, []); return { json: put(value), callbacks: put(callbacks), undefinedPaths: put(undefinedPaths) };
}
function differing(before, after, route = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after)) return [{ path: route, beforePresent: before !== undefined, afterPresent: after !== undefined, before: before ?? null, after: after ?? null }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differing(before[key], after[key], [...route, key]));
}
function count(source, needle) { return source.split(needle).length - 1; }
function replaceOne(source, from, to) { assert.equal(count(source, from), 1, 'unique source operand'); const result = source.replace(from, to); assert.notEqual(result, source); return result; }
function check(id, predicate, detail) { if (!predicate) failures.push({ id, detail }); }
function captureCheck(id, fn) { try { fn(); } catch (error) { failures.push({ id, error: { name: error.name, message: error.message, stack: error.stack } }); } }
function mulberry32(seed) { let value = seed >>> 0; return () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, value | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* Release BA: the engine is normalised on read, in the read call itself. The code this replaced (leg c2b) already
   folded CRLF a line later (lf(currentRaw.toString())), so its behaviour was the same; c2b and c2c only changed the
   shape simHarnessAnchors scans, which looks for the fold at the read because the anchor below runs across lines.
   The record that said a raw read "cannot match" here overstated it. The receipt named currentRaw holds the LF text, which
   is the file byte for byte on an LF checkout such as the runner's. The bundle plugin's module reads and the read of
   this harness's own source are normalised the same way, for the same reason. The inventory's read of the binary
   proof files cannot be (it would change their hashes), so it sits in a block of its own, where the anchor scan can
   see its bytes reach only a length and a hash. */
const currentSource = fs.readFileSync(path.join(ROOT, ENGINE), 'utf8').replaceAll('\r\n', '\n');
const currentRaw = Buffer.from(currentSource);
const from = '      for (let tier = currentClubTier + 1; tier <= 4 && offers.length < 2; tier++) {\n        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name) && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);\n        if (!candidates.length) continue;';
const to = '      for (let tier = currentClubTier + 1; tier <= 4 && offers.length < 2; tier++) {\n        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name));\n        if (!candidates.length) continue;';
const faultSource = replaceOne(currentSource, from, to), undoSource = replaceOne(faultSource, to, from);
const baseSource = faultSource, baseRaw = Buffer.from(baseSource);
assert.equal(faultSource, baseSource, 'missing-filter full source equals the original (true by construction)');
assert.equal(undoSource, currentSource, 'complete source undo');
report.production = { baseRaw: save('sources/base-engine.raw.ts', baseRaw), currentRaw: save('sources/current-engine.raw.ts', currentRaw),
  baseLF: save('sources/base-engine.lf.ts', baseSource), currentLF: save('sources/current-engine.lf.ts', currentSource),
  fault: save('sources/remove-filter.ts', faultSource), undo: save('sources/undo.ts', undoSource), patch: put({ from, to, forward: 1, reverse: 1 }) };
const currentAppearanceRaw = fs.readFileSync(path.join(ROOT, APPEARANCE));
const currentAppearanceSource = lf(currentAppearanceRaw.toString());
const appearanceFrom = "  { id: \"cradle\", label: \"Baby Cradle\", emoji: \"👶\", line: \"rock the baby cradle for the newest member of the family\" },";
const appearanceTo = "  { id: \"cradle\", label: \"Baby Cradle\", emoji: \"👶\", line: \"rock an imaginary baby cradle\" },";
const baseAppearanceSource = replaceOne(currentAppearanceSource, appearanceTo, appearanceFrom), baseAppearanceRaw = Buffer.from(baseAppearanceSource);
assert.equal(replaceOne(baseAppearanceSource, appearanceFrom, appearanceTo), currentAppearanceSource, 'one complete declared appearance edit');
const appearanceUndo = replaceOne(currentAppearanceSource, appearanceTo, appearanceFrom);
assert.equal(appearanceUndo, baseAppearanceSource, 'complete appearance source undo');
report.appearance = { path: APPEARANCE, baseRaw: save('sources/base-appearance.raw.ts', baseAppearanceRaw), currentRaw: save('sources/current-appearance.raw.ts', currentAppearanceRaw),
  baseLF: save('sources/base-appearance.lf.ts', baseAppearanceSource), currentLF: save('sources/current-appearance.lf.ts', currentAppearanceSource),
  undo: save('sources/appearance-undo.ts', appearanceUndo), patch: put({ from: appearanceFrom, to: appearanceTo, forward: 1, reverse: 1 }),
  servedByArm: { original: 'baseLF', current: 'currentLF', 'remove-filter': 'currentLF', undo: 'currentLF' } };
const loadedCache = new Map();
async function bundle(id, source) {
  const entry = `import * as E from '${ROOT.replaceAll('\\', '/')}/${ENGINE}';\nimport * as W from '${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerLeagueWorld.ts';\nimport * as A from '${ROOT.replaceAll('\\', '/')}/src/lib/careerEras.ts';\nimport * as R from '${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerRole.ts';\nexport {E,W,A,R};\n`;
  const loaded = [];
  const result = await build({ stdin: { contents: entry, sourcefile: 'loan-proof-entry.ts', resolveDir: ROOT, loader: 'ts' }, absWorkingDir: ROOT,
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node24', metafile: true, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'retained-actual-sources', setup(builder) { builder.onLoad({ filter: /\.[cm]?[jt]sx?$|\.json$/ }, args => {
      const rel = path.relative(ROOT, args.path).replaceAll('\\', '/');
      let held = loadedCache.get(rel);
      if (!held) {
        const raw = Buffer.from(lf(fs.readFileSync(args.path, 'utf8'))); held = { raw, rel, base: rel === ENGINE ? baseRaw : rel === APPEARANCE ? baseAppearanceRaw : rel.startsWith('src/') ? raw : null }; loadedCache.set(rel, held);
      }
      const served = rel === ENGINE ? source : rel === APPEARANCE ? (id === 'original' ? baseAppearanceSource : currentAppearanceSource) : lf(held.raw.toString());
      if (rel === APPEARANCE) {
        assert.equal(lf(held.raw.toString()), currentAppearanceSource, 'exact current loaded appearance');
        assert.equal(lf(held.base.toString()), baseAppearanceSource, 'exact original loaded appearance');
        // True by construction since Release BA (header item 4): base is raw for every other src module.
      } else if (held.base && rel !== ENGINE) assert.equal(served, lf(held.base.toString()), `unchanged loaded source ${rel}`);
      loaded.push({ path: rel, raw: save(`bundles/${id}/loaded/${rel}.raw`, held.raw), served: save(`bundles/${id}/loaded/${rel}.served`, served),
        base: held.base ? save(`bundles/${id}/loaded/${rel}.base`, held.base) : null,
        gitBlob: held.base ? blobId(held.base) : null });
      return { contents: served, loader: /\.json$/.test(rel) ? 'json' : /\.tsx$/.test(rel) ? 'tsx' : /\.ts$/.test(rel) ? 'ts' : /\.jsx$/.test(rel) ? 'jsx' : 'js', resolveDir: path.dirname(args.path) };
    }); } }] });
  const code = result.outputFiles[0].contents;
  const receipt = { id, entry: save(`bundles/${id}/entry.ts`, entry), compiled: save(`bundles/${id}/compiled.cjs`, code), metafile: save(`bundles/${id}/metafile.json`, JSON.stringify(result.metafile)), loaded: put(loaded) };
  // Recorded, not asserted (header): whether either cradle line reached this arm's compiled code.
  const compiledText = Buffer.from(code).toString(), cradleLine = s => s.match(/line: "([^"]+)"/)[1];
  report.appearance.compiledCradle ??= {};
  report.appearance.compiledCradle[id] = { current: compiledText.includes(cradleLine(appearanceTo)), original: compiledText.includes(cradleLine(appearanceFrom)) };
  const compiledInputs = Object.keys(result.metafile.inputs).filter(name => !['loan-proof-entry.ts', '<stdin>'].includes(name));
  assert.equal(loaded.length, compiledInputs.length, 'every actual compiled input retained');
  assert.equal(new Set(loaded.map(row => row.path)).size, loaded.length, 'unique loaded source records');
  for (const name of compiledInputs) { const retained = loaded.find(row => row.path === name.replaceAll('\\', '/')); assert.ok(retained, `metafile source ${name}`); assert.equal(result.metafile.inputs[name].bytes, retained.served.bytes, `complete served input bytes ${name}`); }
  let rng = mulberry32(1283), tape = [];
  const math = Object.create(Math); math.random = () => { const value = rng(); tape.push({ value, caller: new Error().stack }); return value; };
  const NativeDate = Date; class FixedDate extends NativeDate { constructor(...args) { super(...(args.length ? args : [Date.parse(report.clock)])); } static now() { return Date.parse(report.clock); } }
  const sandbox = { module: { exports: {} }, exports: {}, require, console, Math: math, Date: FixedDate,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, setTimeout, clearTimeout };
  sandbox.exports = sandbox.module.exports;
  const context = vm.createContext(sandbox); vm.runInContext(Buffer.from(code).toString(), context, { filename: 'loan-actual-engine.cjs' });
  receipt.startup = put(tape); bundles[id] = receipt;
  return { id, ...sandbox.module.exports, seed(value) { rng = mulberry32(value); tape = []; }, tape() { return clone(tape); }, continuation() { return Array.from({ length: 16 }, () => math.random()); } };
}
function call(B, method, state, args, seed) {
  const supplied = clone(state), provided = clone(args); B.seed(seed);
  const before = snapshot(supplied), beforeArgs = snapshot(provided); let result, error = null;
  try { result = method === 'accepted-window-oracle' ? acceptedWindow(B, supplied, provided[0]) : B.E[method](supplied, ...provided); } catch (caught) { error = { name: caught.name, message: caught.message, stack: caught.stack }; }
  const draws = B.tape(); const continuation = B.continuation();
  return { state: result, frame: { method, seed, before, args: beforeArgs, inputAfter: snapshot(supplied), argsAfter: snapshot(provided), result: result === undefined ? null : snapshot(result),
    error, draws: put(draws), continuation: put(continuation), fullTape: put(B.tape()) } };
}
function acceptedWindow(B, supplied, clubs) {
  // Same listing read and actual accept APIs, independently assembled window notification.
  assert.equal(supplied.pendingAppealResult, null); assert.equal(supplied.pendingEvents.length, 0);
  const state = { ...supplied }, strikes = B.E.seasonStrikes(state);
  state.pendingAppealResult = null; state.transferSituation = B.E.determineTransferSituation(state, clubs);
  state.badSeasonStreak = strikes.length >= 3 ? (state.badSeasonStreak ?? 0) + 1 : 0;
  const verdict = state.transferSituation;
  if (verdict.type === 'frozen_out') {
    state.morale = Math.max(0, Math.min(100, state.morale - 12));
    state.events.push(verdict.mode === 'released' ? `📄 ${state.currentClub} have torn up your contract. You are a free agent.`
      : verdict.mode === 'loan_listed' ? (state.agentId && state.agentId !== 'self'
        ? `📤 ${state.currentClub} have told your agent to find you a loan for next season.`
        : `📤 ${state.currentClub} have told you to find a loan for next season.`)
      : `📤 ${state.currentClub} have put you on the transfer list.`);
  }
  state.pendingLoanOffers = verdict.type === 'frozen_out' ? null : B.E.determineLoanOffers(state, clubs); state.phase = 'transfer_window';
  const originalClub = state.currentClub, originalLoan = state.loan;
  if (verdict.type === 'frozen_out' && verdict.mode !== 'released') {
    const loan = verdict.mode === 'loan_listed', offer = verdict.offers.find(candidate => !!candidate.isLoan === loan);
    if (offer && !(loan && state.loan)) {
      const moved = loan ? B.E.acceptLoan(state, offer) : B.E.acceptOffer(state, offer);
      moved.phase = 'transfer_window'; moved.transferSituation = { type: 'club_move', mode: loan ? 'loan' : 'sale', fromClub: state.currentClub,
        toClub: moved.currentClub, contractYears: moved.contractYearsLeft, wage: moved.weeklyWage, transferFee: loan ? 0 : offer.transferFee, reasons: [...verdict.reasons] };
      Object.assign(state, moved);
    }
  }
  if (state.currentClub !== originalClub || state.loan !== originalLoan) B.R.cancelReducedRole(state);
  return state;
}
function outcomeAndValues(frame) { return { before: frame.before, args: frame.args, inputAfter: frame.inputAfter, argsAfter: frame.argsAfter, result: frame.result, error: frame.error,
  draws: get(frame.draws).map(item => item.value), continuation: get(frame.continuation) }; }
function readPool(B, state) {
  const input = clone(state), before = snapshot(input); B.seed(1283);
  const year = (input.seasons.at(-1)?.year ?? 2024) + 1;
  const pool = B.W.projectLeagueWorldClubs(input, B.A.adjustClubsForYear(B.E.FALLBACK_CLUBS, year), year);
  const facts = pool.filter(club => club.tier > input.currentClubTier && club.tier <= 4 && club.name !== input.currentClub)
    .map(club => ({ club: json(club), projection: json(B.E.projectLeagueApps(input.overall, club.tier, club.name, 0)) }));
  const after = snapshot(input), draws = B.tape();
  assert.deepEqual(after, before, 'actual projection/era/world reads preserve full input and callbacks'); assert.equal(draws.length, 0, 'actual read has zero global draws');
  return { facts, receipt: { year, input: before, inputAfter: after, pool: put(pool), projections: put(facts), draws: put(draws) } };
}
function forwardSeason(B, state, seed, frames) {
  const parent = state.loan.parentClub, destination = state.currentClub, initialYears = state.seasons.length;
  let working = state, interruptions = 0;
  for (let step = 0; step < 6 && working.loan; step++) {
    const advanced = call(B, 'advanceProSeason', working, [B.E.FALLBACK_CLUBS], seed + step * 2); frames.push(advanced.frame);
    if (advanced.frame.error) throw new Error(`loan season ${advanced.frame.error.message}`);
    working = advanced.state;
    if (working.loan) {
      assert.equal(working.phase, 'rehab_choice', 'an unfinished loan returns only after an actual severe injury interruption');
      const rehab = call(B, 'applyRehabChoice', working, [1], seed + step * 2 + 1); frames.push(rehab.frame);
      if (rehab.frame.error) throw new Error(`rehab ${rehab.frame.error.message}`);
      working = rehab.state; interruptions++;
    }
  }
  const rows = working.seasons.slice(initialYears);
  return { state: working, fact: { parent, destination, initialYears, rows: put(rows), interruptions, returned: working.loan === null,
    parentRestored: working.currentClub === parent, actualLoanRows: rows.filter(row => row.onLoanFrom === parent && row.club === destination).length,
    leagueApps: rows.map(row => row.leagueApps ?? null), injury: rows.map(row => ({ name: row.injury ?? null, severe: row.injurySevere ?? false })), output: snapshot(working) } };
}
const descriptors = [];
for (const parent of ['Real Madrid', 'Dortmund']) for (const overall of [49, 50, 56, 57, 66, 90]) for (let seed = 1; seed <= 8; seed++) descriptors.push({ id: `core-${parent.replaceAll(' ', '-')}-${overall}-${seed}`, kind: 'forced', parent, overall, seed });
for (const kind of ['voluntary', 'sale', 'release', 'repeat-release', 'already-loan', 'expiry', 'missing-legacy', 'saved-unsuitable']) for (let seed = 1; seed <= 8; seed++) descriptors.push({ id: `${kind}-${seed}`, kind, parent: 'Real Madrid', overall: kind === 'expiry' ? 90 : kind === 'saved-unsuitable' ? 49 : 66, seed });
assert.equal(descriptors.length, 160);
let subjectRows = [];
function subject(B, captured, descriptor) {
  const state = clone(captured), club = B.E.FALLBACK_CLUBS.find(row => row.name === descriptor.parent); assert.ok(club, 'existing parent in actual pool');
  Object.assign(state, { age: 21, overall: descriptor.overall, peakOverall: descriptor.overall, weeklyWage: 100000, contractYearsLeft: 4,
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
    phase: 'red_card_appeal_result', rival: null, loan: null, pendingLoanOffers: null, pendingAppealResult: null, pendingEvents: [], badSeasonStreak: 0 });
  for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes']) state[key] = descriptor.overall;
  Object.assign(state.seasons.at(-1), { club: club.name, clubTier: club.tier, clubCountry: club.country, apps: 2, leagueApps: 2, rating: 5.9, redCards: 2 });
  if (descriptor.kind === 'sale') state.age = 26;
  if (descriptor.kind === 'release') state.contractYearsLeft = 1;
  if (descriptor.kind === 'repeat-release') state.badSeasonStreak = 1;
  if (['voluntary', 'already-loan', 'expiry'].includes(descriptor.kind)) Object.assign(state.seasons.at(-1), { apps: 32, leagueApps: 30, rating: 8.1, redCards: 0 });
  if (descriptor.kind === 'expiry') state.contractYearsLeft = 0;
  if (descriptor.kind === 'missing-legacy') { delete state.loan; delete state.pendingLoanOffers; }
  const preparation = [];
  if (descriptor.kind === 'already-loan') {
    const offers = call(B, 'determineLoanOffers', state, [B.E.FALLBACK_CLUBS], descriptor.seed); preparation.push(offers.frame);
    assert.ok(offers.state?.length, 'actual voluntary offer for already-loan boundary');
    const accepted = call(B, 'acceptLoan', state, [offers.state[0]], descriptor.seed); preparation.push(accepted.frame); Object.assign(state, accepted.state);
    state.phase = 'red_card_appeal_result';
  }
  if (descriptor.kind === 'saved-unsuitable') {
    const offers = call(B, 'determineTransferSituation', state, [B.E.FALLBACK_CLUBS], descriptor.seed); preparation.push(offers.frame);
    assert.equal(offers.state.type, 'frozen_out'); assert.ok(offers.state.offers.some(row => B.E.projectLeagueApps(state.overall, row.club.tier, row.club.name, 0).min < 20), 'actual unsuitable saved loan offer');
    state.phase = 'transfer_window'; state.transferSituation = offers.state;
  }
  return { descriptor, input: snapshot(state), changes: put(differing(captured, state)), preparation, state };
}
function runCase(B, subjectRow) {
  const d = subjectRow.descriptor, state = clone(subjectRow.state), frames = [];
  const row = { id: d.id, descriptor: d, input: snapshot(state), frames, error: null };
  try {
    const projections = readPool(B, state); row.read = projections.receipt; row.eligible = projections.facts.filter(item => item.projection.min >= 20).length;
    const repaired = call(B, 'repairCareer', state, [], d.seed); frames.push(repaired.frame); if (repaired.frame.error) throw new Error(repaired.frame.error.message);
    row.repaired = snapshot(repaired.state);
    let working = state;
    if (d.kind === 'saved-unsuitable') working = repaired.state;
    else if (d.kind === 'missing-legacy') working = repaired.state;
    const situation = d.kind === 'saved-unsuitable' ? { state: working.transferSituation } : call(B, 'determineTransferSituation', working, [B.E.FALLBACK_CLUBS], d.seed);
    if (situation.frame) { frames.push(situation.frame); if (situation.frame.error) throw new Error(situation.frame.error.message); }
    row.situation = snapshot(situation.state);
    row.offerFacts = (situation.state.offers ?? []).filter(offer => offer.isLoan).map(offer => ({ offer: json(offer), projection: json(B.E.projectLeagueApps(working.overall, offer.club.tier, offer.club.name, 0)) }));
    let moved;
    if (d.kind === 'voluntary') {
      const voluntary = call(B, 'determineLoanOffers', working, [B.E.FALLBACK_CLUBS], d.seed); frames.push(voluntary.frame); row.voluntary = snapshot(voluntary.state);
      assert.ok(voluntary.state?.length, 'actual voluntary destination'); moved = call(B, 'acceptLoan', working, [voluntary.state[0]], d.seed);
    } else if (d.kind === 'saved-unsuitable') moved = call(B, 'completeClubVerdictMove', working, [], d.seed);
    else moved = call(B, 'dismissAppealResult', working, [B.E.FALLBACK_CLUBS], d.seed);
    frames.push(moved.frame); if (moved.frame.error) throw new Error(moved.frame.error.message);
    if (!['voluntary', 'saved-unsuitable'].includes(d.kind)) {
      const expected = call(B, 'accepted-window-oracle', working, [B.E.FALLBACK_CLUBS], d.seed); frames.push(expected.frame);
      assert.deepEqual(outcomeAndValues(moved.frame), outcomeAndValues(expected.frame), 'complete actual window equals the existing accept APIs plus its notification and unchanged draw values');
    }
    working = moved.state;
    row.window = snapshot(working);
    const forced = d.kind === 'forced' || d.kind === 'missing-legacy';
    row.windowFact = { type: working.transferSituation?.type ?? null, mode: working.transferSituation?.mode ?? null, club: working.currentClub, loan: json(working.loan ?? null),
      projection: working.loan ? json(B.E.projectLeagueApps(state.overall, working.currentClubTier, working.currentClub, 0)) : null,
      forced, originalParent: state.currentClub, wage: working.weeklyWage, contractYears: working.contractYearsLeft };
    if (working.transferSituation?.type === 'club_move') {
      const reload = call(B, 'repairCareer', working, [], d.seed + 100); frames.push(reload.frame);
      const repeated = call(B, 'completeClubVerdictMove', reload.state, [], d.seed + 100); frames.push(repeated.frame);
      assert.deepEqual(snapshot(repeated.state), snapshot(reload.state), 'completed move never executes again');
      working = reload.state;
    }
    const acknowledgedInput = clone(working), release = working.transferSituation?.type === 'frozen_out' && working.transferSituation.mode === 'released';
    const acknowledgementMethod = release ? 'acceptOffer' : 'stayAtClub', acknowledgementArgs = release ? [working.transferSituation.offers[0]] : [];
    if (release) assert.ok(acknowledgementArgs[0], 'released players take an actual existing offer, with no refusal button claimed');
    const acknowledged = call(B, acknowledgementMethod, working, acknowledgementArgs, d.seed + 200); frames.push(acknowledged.frame);
    if (acknowledged.frame.error) throw new Error(acknowledged.frame.error.message); working = acknowledged.state;
    row.ack = { method: acknowledgementMethod, before: snapshot(acknowledgedInput), after: snapshot(working), phase: working.phase, frozenOut: working.frozenOut ?? 0, moraleBefore: acknowledgedInput.morale, moraleAfter: working.morale,
      moraleDelta: working.morale - acknowledgedInput.morale, eventDelta: working.events.length - acknowledgedInput.events.length,
      feeDelta: working.agentFeesPaid - acknowledgedInput.agentFeesPaid, club: working.currentClub };
    if (B.id === 'current') currentReplayInputs.set(d.id, { acknowledgement: acknowledgedInput, acknowledgementMethod, acknowledgementArgs: clone(acknowledgementArgs), season: working.loan ? clone(working) : null });
    if (working.loan) { const season = forwardSeason(B, working, d.seed + 1000, frames); row.lifecycle = season.fact; working = season.state; }
    row.final = snapshot(working);
  } catch (error) { row.error = { name: error.name, message: error.message, stack: error.stack }; }
  return row;
}
let progressionSource = null;
const progressionComparisons = [];
let progressionWitness = null;
function progressionContext() {
  if (progressionSource) return progressionSource;
  const text = lf(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')), raw = Buffer.from(text), lines = text.split('\n');
  const site = (wholeLine, token) => { const matching = lines.flatMap((line, index) => line === wholeLine ? [index] : []); assert.equal(matching.length, 1, 'unique actual whole caller source line'); const index = lines[matching[0]].indexOf(token); assert.ok(index >= 0); return `${import.meta.url}:${matching[0] + 1}:${index + 1}`; };
  const replay = site('      const currentSeason = forwardSeason(B.current, clone(input), first.seed, currentFrames);', 'forwardSeason(');
  const recorded = site('    if (working.loan) { const season = forwardSeason(B, working, d.seed + 1000, frames); row.lifecycle = season.fact; working = season.state; }', 'forwardSeason(');
  const armLine = '    armRows[id] = subjectRows.map(row => runCase(B[id], row));';
  const runCaseSite = site(armLine, 'runCase('), mapSite = site(armLine, 'map(');
  assert.equal(Error.stackTraceLimit, 10, 'measured caller frame limit');
  const processFrame = '    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)';
  progressionSource = { raw: save('comparison/method.raw.mjs', raw), lf: save('comparison/method.lf.mjs', Buffer.from(text)), frameLimit: 10,
    sites: { replay, recorded, runCaseSite, mapSite }, replayRoute: [`    at ${replay}`, processFrame],
    recordedRoute: [`    at runCase (${recorded})`, `    at ${runCaseSite}`, '    at Array.map (<anonymous>)', `    at ${mapSite}`, processFrame] };
  return progressionSource;
}
function progressionCaller(replay, recorded) {
  const base = { replay: put(replay), recorded: put(recorded) }, coordinate = value => value.replace(/:\d+:\d+/g, ':<line>:<column>');
  if (coordinate(replay) === coordinate(recorded)) return { ...base, mode: 'coordinates-only', findings: [] };
  const context = progressionContext(), left = replay.split('\n'), right = recorded.split('\n');
  const boundary = rows => rows.flatMap((line, index) => line.startsWith(`    at forwardSeason (${import.meta.url}:`) ? [index] : []);
  const lb = boundary(left), rb = boundary(right);
  if (lb.length !== 1 || rb.length !== 1) return { ...base, mode: 'declared-progression-routes', findings: ['progression-boundary'] };
  const lp = left.slice(0, lb[0] + 1), rp = right.slice(0, rb[0] + 1), ls = left.slice(lb[0] + 1), rs = right.slice(rb[0] + 1);
  const findings = [];
  if (lp.join('\n') !== rp.join('\n')) findings.push('progression-engine-prefix');
  const leftExpected = context.replayRoute.slice(0, Math.max(0, context.frameLimit - (lp.length - 1)));
  const rightExpected = context.recordedRoute.slice(0, Math.max(0, context.frameLimit - (rp.length - 1)));
  if (ls.join('\n') !== leftExpected.join('\n') || rs.join('\n') !== rightExpected.join('\n')) findings.push('progression-harness-route');
  return { ...base, mode: 'declared-progression-routes', prefixReplay: put(lp), prefixRecorded: put(rp), suffixReplay: put(ls), suffixRecorded: put(rs), expectedReplay: put(leftExpected), expectedRecorded: put(rightExpected), findings };
}
function compareProgressionFrames(replayFrames, recordedFrames, id) {
  const pair = { id, replayFrames: put(replayFrames), recordedFrames: put(recordedFrames), replayCount: replayFrames.length, recordedCount: recordedFrames.length, status: 'fail', frames: [] }; progressionComparisons.push(pair);
  assert.equal(replayFrames.length, recordedFrames.length, 'complete progression frame count');
  for (let frameIndex = 0; frameIndex < replayFrames.length; frameIndex++) {
    const a = comparisonCopy(replayFrames[frameIndex]), b = comparisonCopy(recordedFrames[frameIndex]), receipt = { frameIndex, replay: put(a), recorded: put(b), status: 'fail', tapes: [] }; pair.frames.push(receipt);
    for (const kind of ['draws', 'fullTape']) {
      const tapeReceipt = { kind, replay: a[kind], recorded: b[kind], status: 'fail', callers: null }, callers = []; receipt.tapes.push(tapeReceipt);
      try {
        const left = get(a[kind]), right = get(b[kind]); tapeReceipt.replayCount = left.length; tapeReceipt.recordedCount = right.length;
        assert.equal(left.length, right.length, 'every complete progression draw');
        for (let index = 0; index < left.length; index++) {
          const observed = { index, replayItem: put(left[index]), recordedItem: put(right[index]), status: 'fail' }; callers.push(observed);
          const av = comparisonCopy(left[index]), bv = comparisonCopy(right[index]); delete av.caller; delete bv.caller;
          Object.assign(observed, progressionCaller(left[index].caller, right[index].caller));
          if (observed.mode === 'declared-progression-routes' && !progressionWitness) progressionWitness = { replay: left[index].caller, recorded: right[index].caller };
          assert.deepEqual(av, bv, 'complete draw values and non-caller fields'); assert.deepEqual(observed.findings, [], 'exact engine prefix and declared full outer caller route'); observed.status = 'pass';
        }
        tapeReceipt.status = 'pass';
      } finally { tapeReceipt.callers = put(callers); }
      delete a[kind]; delete b[kind];
    }
    assert.deepEqual(get(a.continuation), get(b.continuation), 'complete immediate continuation values'); delete a.continuation; delete b.continuation;
    assert.deepEqual(a, b, 'complete non-tape frame including callbacks and undefined ledgers'); receipt.status = 'pass';
  }
  pair.status = 'pass';
}
function comparisonControls() {
  const records = report.comparisonControls;
  const collect = (id, run) => { const record = { id, status: 'fail' }; records.push(record); try { run(record); record.status = 'pass'; } catch (error) { record.error = { name: error.name, message: error.message, stack: error.stack }; failures.push({ id: `${id}/control`, error: record.error }); } };
  collect('comparison-host-primitive', record => {
    const actual = armRows.current.find(row => row.offerFacts.length)?.offerFacts; assert.ok(actual?.length, 'actual retained VM offer-array witness');
    const healthy = comparisonCopy(actual); record.healthy = put(healthy); record.originalVM = put(actual);
    record.prototypeFacts = { originalArray: Array.isArray(actual), originalHostPrototype: Object.getPrototypeOf(actual) === Array.prototype, copiedArray: Array.isArray(healthy), copiedHostPrototype: Object.getPrototypeOf(healthy) === Array.prototype };
    assert.deepEqual(record.prototypeFacts, { originalArray: true, originalHostPrototype: false, copiedArray: true, copiedHostPrototype: true }, 'actual VM-to-host comparison transport');
    assert.equal(record.originalVM, record.healthy, 'every complete serialized offer field held by transport'); assert.deepEqual(snapshot(actual), snapshot(healthy), 'all callbacks and undefined paths held by transport');
    const primitive = comparisonCopy(healthy), oldMin = primitive[0].projection.min; primitive[0].projection.min += 1;
    record.fault = put(primitive); assert.notEqual(record.fault, record.healthy, 'copied primitive fault changed whole body');
    let detected = null; try { assert.deepEqual(primitive, healthy); } catch (error) { detected = { name: error.name, message: error.message, stack: error.stack }; }
    record.detectorError = put(detected); assert.equal(detected?.name, 'AssertionError', 'primitive difference remains strict');
    primitive[0].projection.min = oldMin; record.undo = put(primitive); assert.deepEqual(primitive, healthy); assert.equal(record.undo, record.healthy, 'complete primitive undo');
    record.effective = true; record.findings = ['primitive-value'];
  });
  for (const kind of ['engine-prefix', 'missing-boundary', 'harness-route']) collect(`comparison-${kind}`, record => {
    assert.ok(progressionWitness, 'actual changed-route witness');
    const source = progressionContext(), baseline = comparisonCopy(progressionWitness); record.healthy = put(baseline); assert.deepEqual(progressionCaller(baseline.replay, baseline.recorded).findings, []);
    const engineFrame = baseline.replay.split('\n').find(line => line.includes('(loan-actual-engine.cjs:'));
    const boundaryFrame = baseline.replay.split('\n').find(line => line.startsWith(`    at forwardSeason (${import.meta.url}:`));
    const edit = kind === 'engine-prefix' ? { from: engineFrame, to: engineFrame?.replace('    at ', '    at copied_'), expected: ['progression-engine-prefix'] }
      : kind === 'missing-boundary' ? { from: boundaryFrame, to: boundaryFrame?.replace('forwardSeason', 'copied_forwardSeason'), expected: ['progression-boundary'] }
      : { from: source.replayRoute[0], to: source.replayRoute[0].replace('    at ', '    at copied_boundary '), expected: ['progression-harness-route'] };
    assert.ok(edit.from && edit.to, 'actual full caller mutation anchor');
    const copied = comparisonCopy(baseline); assert.equal(copied.replay.split(edit.from).length - 1, 1, 'unique actual copied caller anchor'); copied.replay = copied.replay.replace(edit.from, edit.to);
    record.fault = put(copied); assert.notEqual(record.fault, record.healthy, 'copied caller fault changed whole body'); const result = progressionCaller(copied.replay, copied.recorded); record.observed = put(result); record.findings = result.findings; assert.deepEqual(result.findings, edit.expected, 'precise independent comparison fault');
    assert.equal(copied.replay.split(edit.to).length - 1, 1, 'unique caller reverse anchor'); copied.replay = copied.replay.replace(edit.to, edit.from); record.undo = put(copied);
    assert.deepEqual(copied, baseline); assert.equal(record.undo, record.healthy, 'whole actual caller undo'); assert.deepEqual(progressionCaller(copied.replay, copied.recorded).findings, []); record.effective = true;
  });
  return records;
}
function desiredLaw(row) {
  if (!row.windowFact?.forced || row.error) return [];
  const findings = [];
  if (row.offerFacts.some(item => item.projection.min < 20)) findings.push({ id: row.id, group: 'eligible-offers' });
  if (row.windowFact.loan && row.windowFact.projection.min < 20) findings.push({ id: row.id, group: 'automatic-minutes' });
  if (!row.eligible && (row.offerFacts.length || row.windowFact.type !== 'frozen_out' || row.windowFact.loan || row.windowFact.club !== row.windowFact.originalParent || row.ack.phase !== 'playing' || row.ack.frozenOut !== 1 || row.ack.moraleAfter !== Math.max(0, row.ack.moraleBefore - 10) || row.ack.eventDelta !== 1 || row.ack.feeDelta !== 0)) findings.push({ id: row.id, group: 'empty-market' });
  return findings;
}
try {
  const B = {};
  for (const [id, source] of [['original', baseSource], ['current', currentSource], ['remove-filter', faultSource], ['undo', undoSource]]) B[id] = await bundle(id, source);
  // True by construction since Release BA (the original is this head with the filter removed): a round trip check only.
  assert.equal(bundles.original.compiled.sha256, bundles['remove-filter'].compiled.sha256, 'actual fault compiled code equals the original (true by construction)');
  assert.equal(bundles.current.compiled.sha256, bundles.undo.compiled.sha256, 'actual whole compiled undo');
  assert.equal(bundles.original.startup, bundles.current.startup, 'full startup draws held');
  assert.equal(bundles.current.startup, bundles['remove-filter'].startup, 'fault startup draws held');
  assert.equal(bundles.current.startup, bundles.undo.startup, 'undo startup draws held');
  report.bundles = bundles;
  /* Release BA: both arms read this head's fixture, so the comparison with a pinned copy is gone; its bytes and
     hash are still retained below (report.fixture). */
  const fixtureRaw = fs.readFileSync(path.join(ROOT, FIXTURE));
  const captured = JSON.parse(fixtureRaw).saves.find(row => row.id === 'ere').state;
  report.fixture = { source: save('input/careerLeagueWorldSaves1100.json', fixtureRaw), captured: snapshot(captured) };
  subjectRows = descriptors.map(descriptor => subject(B.original, captured, descriptor));
  report.subjects = put(subjectRows.map(({ state, ...row }) => row));
  report.population = { cases: descriptors.length, parents: ['Real Madrid', 'Dortmund'], overall: [49, 50, 56, 57, 66, 90], seeds: [1, 2, 3, 4, 5, 6, 7, 8],
    core: 96, additional: 64, naturalCareers: 0, callbackRetention: 'complete JSON, undefined paths and function path/name/toString ledger for every input/inputAfter/result; replay copies retain the actual callable values', loanReturnBound: 6 };
  for (const id of Object.keys(B)) {
    armRows[id] = subjectRows.map(row => runCase(B[id], row));
    report.arms[id] = { count: armRows[id].length, rows: put(armRows[id]), errors: armRows[id].filter(row => row.error).map(row => ({ id: row.id, error: row.error })) };
  }
  for (const id of Object.keys(B)) for (const row of armRows[id]) check(`${id}/${row.id}/execution`, !row.error, row.error);
  for (const row of armRows.current) {
    check(`${row.id}/law`, desiredLaw(row).length === 0, desiredLaw(row));
    if (row.error) continue;
    const source = subjectRows.find(item => item.descriptor.id === row.id).state;
    for (const item of row.offerFacts) {
      check(`${row.id}/terms`, item.offer.contractYears === 1 && item.offer.wage === source.weeklyWage && item.offer.transferFee === 0 && item.offer.club.name !== source.currentClub && item.offer.club.tier > source.currentClubTier, item);
    }
    if (row.windowFact.type === 'club_move') check(`${row.id}/acknowledgement`, row.ack.eventDelta === 0 && row.ack.feeDelta === 0 && row.ack.phase === 'playing', row.ack);
    if (row.windowFact.loan) {
      const parent = source.loan ?? { parentClub: source.currentClub, parentTier: source.currentClubTier, parentLeague: source.currentLeague, parentCountry: source.currentClubCountry, parentColor: source.currentClubColor };
      captureCheck(`${row.id}/complete-parent-identity`, () => assert.deepEqual(row.windowFact.loan, json(parent)));
      check(`${row.id}/preserved-parent-contract`, row.windowFact.wage === source.weeklyWage && row.windowFact.contractYears === source.contractYearsLeft, row.windowFact);
    }
    if (row.lifecycle) check(`${row.id}/return`, row.lifecycle.returned && row.lifecycle.parentRestored && row.lifecycle.actualLoanRows > 0, row.lifecycle);
    if (row.descriptor.kind === 'saved-unsuitable') check(`${row.id}/legacy-offer`, !!row.windowFact.loan && row.windowFact.projection.min < 20, row.windowFact);
    const common = ['voluntary', 'sale', 'release', 'repeat-release', 'already-loan', 'expiry', 'saved-unsuitable'].includes(row.descriptor.kind) || row.descriptor.overall === 90;
    if (common) captureCheck(`${row.id}/whole-unrelated-output`, () => assert.deepEqual(comparisonCopy(comparableRow(row)), comparisonCopy(comparableRow(armRows.original.find(item => item.id === row.id)))));
    const ackInput = row.ack.before;
    // Complete old/current actual acknowledgement replay, including an empty listing.
    const acknowledgedState = clone(currentReplayInputs.get(row.id).acknowledgement);
    assert.deepEqual(snapshot(acknowledgedState), ackInput, 'replay uses the complete actual acknowledgement input including callable values');
    const replay = currentReplayInputs.get(row.id);
    const replayOriginal = call(B.original, replay.acknowledgementMethod, acknowledgedState, replay.acknowledgementArgs, row.descriptor.seed + 200);
    const replayCurrent = call(B.current, replay.acknowledgementMethod, acknowledgedState, replay.acknowledgementArgs, row.descriptor.seed + 200);
    report.sameInputAcknowledgements ??= []; report.sameInputAcknowledgements.push({ id: row.id, input: ackInput, original: replayOriginal.frame, current: replayCurrent.frame });
    captureCheck(`${row.id}/same-input-acknowledgement`, () => assert.deepEqual(comparableFrame(replayCurrent.frame), comparableFrame(replayOriginal.frame)));
  }
  // Every current loan input replays its complete actual injury/return progression in the original arm.
  report.sameInputSeasons = [];
  for (const row of armRows.current.filter(item => item.lifecycle && !item.error)) {
    const first = row.frames.find(frame => frame.method === 'advanceProSeason');
    const input = clone(currentReplayInputs.get(row.id).season);
    assert.deepEqual(snapshot(input), first.before, 'replay uses the complete actual loan-season input including callable values');
    const originalFrames = [], currentFrames = [];
    try {
      const oldSeason = forwardSeason(B.original, clone(input), first.seed, originalFrames);
      const currentSeason = forwardSeason(B.current, clone(input), first.seed, currentFrames);
      report.sameInputSeasons.push({ id: row.id, input: first.before, original: { frames: originalFrames, outcome: oldSeason.fact }, current: { frames: currentFrames, outcome: currentSeason.fact } });
      captureCheck(`${row.id}/same-input-season`, () => assert.deepEqual(comparisonCopy({ frames: currentFrames.map(comparableFrame), outcome: currentSeason.fact }), comparisonCopy({ frames: originalFrames.map(comparableFrame), outcome: oldSeason.fact })));
      captureCheck(`${row.id}/whole-current-progression-replay`, () => compareProgressionFrames(currentFrames, row.frames.slice(row.frames.indexOf(first)), row.id));
    } catch (error) {
      const failure = { id: row.id, input: first.before, originalFrames, currentFrames, error: { name: error.name, message: error.message, stack: error.stack } };
      report.sameInputSeasons.push(failure); failures.push({ id: `${row.id}/complete-season-replay`, detail: failure });
    }
  }
  const expected = armRows.original.flatMap(desiredLaw), actual = armRows['remove-filter'].flatMap(desiredLaw);
  report.controls.push({ id: 'remove-filter', intended: put(expected), actual: put(actual), failures: actual.length,
    effective: actual.length > 0 && actual.some(row => row.group === 'eligible-offers') && actual.some(row => row.group === 'automatic-minutes') && actual.some(row => row.group === 'empty-market'),
    fullOriginal: report.arms.original.rows, fullFault: report.arms['remove-filter'].rows, fullHealthy: report.arms.current.rows, fullUndo: report.arms.undo.rows });
  // True by construction since Release BA (header item 5): both arms run the same engine on the same inputs.
  captureCheck('remove-filter/exact-map', () => assert.deepEqual(actual, expected));
  check('remove-filter/effectiveness', report.controls[0].effective, report.controls[0]);
  captureCheck('remove-filter/whole-original-outcomes', () => assert.equal(report.arms['remove-filter'].rows, report.arms.original.rows, 'complete raw original/fault identity'));
  captureCheck('undo/whole-current-outcomes', () => assert.equal(report.arms.undo.rows, report.arms.current.rows, 'complete raw current/undo identity'));
  report.comparisonControls = []; captureCheck('comparison-controls/complete', () => { report.comparisonControls = comparisonControls(); });
  report.comparisonTransport = { source: progressionSource, comparisons: put(progressionComparisons), scope: 'Only current recorded-versus-replayed progression callers may use the exact raw forwardSeason prefix and independently source-bound outer routes; all ordinary comparisons remain coordinates-only.' };
  report.sameInputAcknowledgements = put(report.sameInputAcknowledgements); report.sameInputSeasons = put(report.sameInputSeasons);
  report.summary = { actualArms: Object.keys(B).length, completeCases: Object.values(armRows).reduce((sum, rows) => sum + rows.length, 0),
    healthyForcedOffers: armRows.current.filter(row => row.windowFact?.forced).reduce((sum, row) => sum + row.offerFacts.length, 0),
    healthyEmptyListings: armRows.current.filter(row => row.windowFact?.forced && row.eligible === 0).length,
    actualLoanReturns: armRows.current.filter(row => row.lifecycle?.returned).length,
    retainedFrames: Object.values(armRows).flatMap(rows => rows.flatMap(row => row.frames)).length, sourceControlFindings: actual.length };
  assert.equal(failures.length, 0, 'all complete loan-minute checks and precise controls');
  report.status = 'pass';
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  report.comparisonTransport = { source: progressionSource, comparisons: put(progressionComparisons), scope: 'Only current recorded-versus-replayed progression callers may use the exact raw forwardSeason prefix and independently source-bound outer routes; all ordinary comparisons remain coordinates-only.' };
  report.bundles = bundles; save('objects.json', JSON.stringify(objects)); save('report.json', JSON.stringify(report));
  function inventoryOf(dir = OUT) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => { const item = path.join(dir, entry.name); if (entry.isDirectory()) return inventoryOf(item); const row = { path: path.relative(OUT, item).replaceAll('\\', '/') }; { const bytes = fs.readFileSync(item); row.bytes = bytes.length; row.sha256 = sha(bytes); } return [row]; }); }
  save('inventory.json', JSON.stringify({ scope: 'All final payload bodies except this inventory and the measured size receipt', files: inventoryOf().filter(row => !['inventory.json', 'size.json'].includes(row.path)) }));
  let retainedBytes = 0;
  try {
    save('size.json', JSON.stringify({ cap: 430_000_000, retainedBytes: 0 }));
    for (let attempt = 0; attempt < 4; attempt++) { retainedBytes = inventoryOf().reduce((sum, row) => sum + row.bytes, 0); save('size.json', JSON.stringify({ cap: 430_000_000, retainedBytes })); }
    assert.equal(inventoryOf().reduce((sum, row) => sum + row.bytes, 0), retainedBytes, 'size receipt includes its own complete final bytes');
    assert.ok(retainedBytes < 430_000_000, 'strict complete 430M proof cap');
  } catch (error) {
    report.status = 'fail'; report.footerError = { name: error.name, message: error.message, stack: error.stack }; report.capFailure = { retainedBytes, cap: 430_000_000 }; process.exitCode = 1; save('report.json', JSON.stringify(report));
    save('inventory.json', JSON.stringify({ scope: 'All final payload bodies except this inventory and the measured size receipt', files: inventoryOf().filter(row => !['inventory.json', 'size.json'].includes(row.path)) }));
    for (let attempt = 0; attempt < 4; attempt++) { retainedBytes = inventoryOf().reduce((sum, row) => sum + row.bytes, 0); save('size.json', JSON.stringify({ cap: 430_000_000, retainedBytes })); }
  }
  console.log(`Loan minutes: ${report.population?.cases ?? 0} labelled saved boundaries; ${report.summary?.completeCases ?? 0} complete arm cases`);
  console.log(`Loan minutes: ${report.summary?.healthyForcedOffers ?? 0} filtered forced offers; ${report.summary?.healthyEmptyListings ?? 0} actual empty listings`);
  console.log(`Loan minutes: ${report.summary?.actualLoanReturns ?? 0} actual returns; ${report.summary?.retainedFrames ?? 0} complete action frames`);
  console.log(`Loan minutes: ${report.summary?.sourceControlFindings ?? 0} exact missing-filter findings; ${retainedBytes} retained bytes`);
  if (report.status === 'pass') console.log('PASS simSoccerLoanMinutes: projected forced loans, complete moves and parent returns');
  else { console.error(JSON.stringify(report.error ?? report.capFailure ?? failures)); process.exitCode = 1; }
}
