/* Focused compatibility proof for Round 1327's inverse and the current club policy.
   Run on a remote checkout with complete history. This script writes only its artifact directory. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import * as candidate from '../lib/careerDeckFair1327.mjs';
import { inverseSoccerDeck } from '../lib/careerSoccerDeck1334.mjs';
import { inverseWorldTruth } from '../lib/careerWorldTruth1329.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const HELPER = 'scripts/lib/careerDeckFair1327.mjs';
const OLD = 'c176be815dc4af57dfd7185a485e28357aa0d41e';
const CONTROL = process.env.DECK_POLICY_CONTROL || '';
assert(['', 'omit-inverse'].includes(CONTROL), 'DECK_POLICY_UNKNOWN_CONTROL');
const OUT = path.resolve(process.env.DECK_POLICY_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'deck-policy-proof-')));
fs.mkdirSync(OUT, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
const historical = file => execFileSync('git', ['show', OLD + ':' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
const blob = value => createHash('sha1').update('blob ' + Buffer.byteLength(value) + '\0').update(value).digest('hex');
function inventory(directory) {
  return fs.readdirSync(path.join(ROOT, directory), { withFileTypes: true }).flatMap(entry => {
    const file = directory + '/' + entry.name;
    return entry.isDirectory() ? inventory(file) : entry.isFile() ? [{ file, sha256: hash(fs.readFileSync(path.join(ROOT, file))) }] : [];
  });
}
const snapshot = () => [...inventory('src'), ...inventory('scripts/lib'), ...['package.json', 'package-lock.json'].map(file => ({ file, sha256: hash(fs.readFileSync(path.join(ROOT, file))) }))].sort((a, b) => a.file.localeCompare(b.file));
const before = snapshot();
const report = { arm: process.env.DECK_POLICY_ARM || 'fixed', control: CONTROL, cases: [], sources: {}, frames: [], sourceBefore: before };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
async function test(name, work) {
  try { await work(); report.cases.push({ name, status: 'passed' }); }
  catch (error) { report.cases.push({ name, status: 'failed', error: { name: error.name, message: error.message, stack: error.stack } }); }
  save();
}
function prerequisites(source) {
  return inverseWorldTruth(ENGINE, inverseSoccerDeck(ENGINE, source, []), []);
}
const oldRaw = historical(ENGINE), currentRaw = read(ENGINE), oldHelperText = historical(HELPER);
assert.equal(blob(oldRaw), '722b2285628775dff77f8de0138cf44d7b104b49', 'DECK_POLICY_HISTORICAL_SOURCE');
assert.equal(blob(oldHelperText), 'b99fcd3ed84ac6b616367da3d439c4c79022ce04', 'DECK_POLICY_HISTORICAL_HELPER');
assert.equal(blob(currentRaw), 'ac4d7263b9dbefb5462e99891fac2bfaf13e3e52', 'DECK_POLICY_CURRENT_SOURCE');
fs.writeFileSync(path.join(OUT, 'old-helper.mjs'), oldHelperText);
const oldHelper = await import(pathToFileURL(path.join(OUT, 'old-helper.mjs')).href);
const oldPrepared = prerequisites(oldRaw), currentPrepared = prerequisites(currentRaw);
const gateRow = oldHelper.deckFairPatches().find(row => row.addition === 'deck-helpers-and-gate');
const start = currentPrepared.indexOf(gateRow.from.slice(0, 100));
const tail = '    if (e.category === "international") {\n';
assert(start >= 0 && currentPrepared.split(gateRow.from.slice(0, 100)).length === 2, 'DECK_POLICY_CURRENT_BLOCK_START');
const tailIndex = currentPrepared.indexOf(tail, start);
assert(tailIndex >= start, 'DECK_POLICY_CURRENT_BLOCK_END');
const end = tailIndex + tail.length;
const currentBlock = currentPrepared.slice(start, end);
const yearLine = '  const completedYear = state.seasons[state.seasons.length - 1]?.year ?? 2024;';
const gateLine = '    if (e.id === 65 && clubContinentalSuspended(state.currentClubCountry, completedYear)) return false;';
report.sources = { oldRef: OLD, oldEngineBlob: blob(oldRaw), oldHelperBlob: blob(oldHelperText), currentEngineBlob: blob(currentRaw), currentEngineSHA256: hash(currentRaw), candidateHelperSHA256: hash(read(HELPER)), oldPreparedSHA256: hash(oldPrepared), currentPreparedSHA256: hash(currentPrepared) };

await test('historical inverse bytes, pins, patch API and all 16 receipts stay exact', () => {
  assert.equal(candidate.DECK_FAIR_HEAD_SHA256, 'd21d2f552bf72ab5e24e0fbca03f330b51f1888f529129140824115c3cebc938');
  assert.equal(candidate.DECK_FAIR_BASE_SHA256, '201f0361c7ec38390b7a5f59ff59b872ecd6b944bd0bf65231a5683d5acf68c6');
  assert.deepEqual(candidate.deckFairPatches(), oldHelper.deckFairPatches(), 'DECK_POLICY_PATCH_API');
  assert.equal(candidate.DECK_FAIR_ADDITIONS.length, 16);
  const oldReceipt = [], receipt = [];
  const expected = oldHelper.inverseDeckFair(ENGINE, oldPrepared, oldReceipt);
  const actual = candidate.inverseDeckFair(ENGINE, oldPrepared, receipt);
  report.historical = { expectedSHA256: hash(expected), actualSHA256: hash(actual), oldReceipt, receipt };
  fs.writeFileSync(path.join(OUT, 'historical-inverse-reference.ts'), expected);
  fs.writeFileSync(path.join(OUT, 'historical-inverse-candidate.ts'), actual);
  assert.equal(actual, expected, 'DECK_POLICY_HISTORICAL_BYTES');
  assert.deepEqual(receipt, oldReceipt);
  assert.deepEqual(receipt.map(row => row.addition), candidate.DECK_FAIR_ADDITIONS);
  assert.equal(candidate.inverseDeckFair('unrelated.ts', 'literal\r\nbytes'), 'literal\r\nbytes');
});

await test('current inverse runs every row and actual passport dealing preserves club policy', async () => {
  const receipt = [];
  let inverted, inverseError;
  try { inverted = candidate.inverseDeckFair(ENGINE, currentPrepared, receipt); }
  catch (error) { inverseError = { name: error.name, message: error.message }; }
  report.currentInverse = { receipt, error: inverseError };
  assert.equal(inverseError, undefined, 'DECK_POLICY_CURRENT_INVERSE: current source must match one complete policy-aware inverse block');
  assert.deepEqual(receipt.map(row => row.addition), candidate.DECK_FAIR_ADDITIONS, 'DECK_POLICY_CURRENT_RECEIPT');
  assert.equal(inverted.split(yearLine).length, 2, 'DECK_POLICY_COMPLETED_YEAR_HELD');
  assert.equal(inverted.split(gateLine).length, 2, 'DECK_POLICY_GATE_HELD');
  assert.notEqual(hash(inverted), hash(currentPrepared), 'DECK_POLICY_INVERSE_CHANGED_SOURCE');
  const bundled = CONTROL === 'omit-inverse' ? currentPrepared : inverted;
  report.currentInverse.invertedSHA256 = hash(inverted);
  report.currentInverse.bundledSHA256 = hash(bundled);
  report.currentInverse.controlChangedSource = CONTROL ? hash(bundled) !== hash(inverted) : null;
  fs.writeFileSync(path.join(OUT, 'current-inverse.ts'), inverted);
  fs.writeFileSync(path.join(OUT, 'current-bundled.ts'), bundled);
  const outfile = path.join(OUT, 'engine.mjs');
  await build({ stdin: { contents: "export * from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
    /* Only the engine copy is attributed. Dependencies stay current and pristine;
       this proves this event generator, not a whole historical App replay. */
    plugins: [{ name: 'inverse-copy-only', setup(builder) { builder.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
      if (path.relative(ROOT, args.path).split(path.sep).join('/') !== ENGINE) return undefined;
      return { contents: bundled + '\nexport { generateRandomEvents as __deckPolicyGenerate };\n', loader: 'ts', resolveDir: path.dirname(args.path) };
    }); } }] });
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key), clear: () => store.clear(), key: index => [...store.keys()][index] ?? null,
    get length() { return store.size; } };
  const E = await import(pathToFileURL(outfile).href);
  const realRandom = Math.random, realNow = Date.now;
  function traced(work) {
    const draws = []; Math.random = () => { draws.push(0.4); return 0.4; }; Date.now = () => 1793793600000;
    try { return { value: clone(work()), draws }; } finally { Math.random = realRandom; Date.now = realNow; }
  }
  const club = { id: 'policy-events', name: 'Policy Events FC', country: 'Russia', league: 'Fixture League', color: '#123456', tier: 1 };
  for (const [country, year] of [['Russia', 2022], ['England', 2022], ['Russia', 2021]]) {
    const made = traced(() => E.initCareer('Club Event Fixture', 'England', 'ST', '2020-24',
      { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 }, 75, 2020, [club], null, 90));
    const c = made.value;
    const input = { ...c, age: 25, currentClub: club.name, currentClubCountry: country, currentClubTier: 1, currentLeague: club.league,
      phase: 'playing', netWorth: 2, morale: 81, pendingEvents: [], seasons: [{ ...c.seasons[0], year, age: 25, club: club.name,
        clubCountry: country, clubTier: 1, type: 'playing', apps: 25, leagueApps: 24, goals: 9, assists: 5, rating: 7.2 }] };
    const initialCatalog = traced(() => E.getAllEvents(input)).value;
    const target = initialCatalog.find(event => event.id === 65);
    assert(target && E.eventLedgerKey(target) === '65', 'DECK_POLICY_REAL_CATALOG_65');
    input.eventLastFired = Object.fromEntries(initialCatalog.filter(event => event.id !== 65).map(event => [E.eventLedgerKey(event), year]));
    const catalog = traced(() => E.getAllEvents(input));
    assert(catalog.value.every(event => event.id === 65 ? !E.isEventOnCooldown(input, event, year) : E.isEventOnCooldown(input, event, year)), 'DECK_POLICY_REAL_COOLDOWN_FIXTURE');
    const original = clone(input), generated = traced(() => E.__deckPolicyGenerate(input));
    report.frames.push({ country, year, original, inputAfter: clone(input), catalog: catalog.value, output: generated.value,
      constructorDraws: made.draws, catalogDraws: catalog.draws, draws: generated.draws });
  }
  save();
  assert.deepEqual(report.frames.map(frame => frame.output.map(event => event.id)), [[], [65], [65]], 'DECK_POLICY_PASSPORT_OUTCOMES');
  for (const frame of report.frames) {
    const expected = clone(frame.original);
    if (frame.output.length) expected.eventLastFired['65'] = frame.year;
    assert.deepEqual(frame.inputAfter, expected, 'DECK_POLICY_ONLY_REAL_LEDGER_STAMP');
    assert.equal(frame.draws.length, frame.catalogDraws.length + 1, 'DECK_POLICY_INVERSE_DRAWS: a legacy batch draws its count once, with no sort draw for zero or one eligible card');
    assert(frame.draws.every(value => value === 0.4));
  }
  assert.equal(Math.random, realRandom); assert.equal(Date.now, realNow);
});

function replaceBlock(source, from, to) {
  assert.equal(source.split(from).length, 2, 'DECK_POLICY_NEGATIVE_CHANGED_EXACTLY_ONE_BLOCK');
  return source.replace(from, () => to);
}
function refuses(source, marker) {
  const receipt = []; let error;
  try { candidate.inverseDeckFair(ENGINE, source, receipt); } catch (caught) { error = caught; }
  assert(error?.name === 'AssertionError' && error.message.includes('deck-helpers-and-gate'), marker);
  assert.deepEqual(receipt.map(row => row.addition), candidate.DECK_FAIR_ADDITIONS.slice(0, 14), marker + '_BEFORE_RIGHT_ROW');
  return { sourceSHA256: hash(source), error: { name: error.name, message: error.message }, receipt };
}
await test('unknown complete old and policy blocks are rejected at the guarded row', () => {
  report.unknown = [];
  for (const [source, block, name] of [[oldPrepared, gateRow.from, 'old'], [currentPrepared, currentBlock, 'policy']]) {
    const changed = block.replace('  const all = getAllEvents(state);', '  const all = getAllEvents({ ...state });');
    assert.notEqual(changed, block);
    const input = replaceBlock(source, block, changed), frame = { name, sourceSHA256: hash(input) };
    report.unknown.push(frame); fs.writeFileSync(path.join(OUT, 'unknown-' + name + '.ts'), input);
    Object.assign(frame, refuses(input, 'DECK_POLICY_REJECT_UNKNOWN'));
  }
});
await test('duplicate old, policy and mixed complete blocks are all rejected', () => {
  report.duplicates = [];
  for (const [source, from, added, name] of [[oldPrepared, gateRow.from, gateRow.from, 'old'], [currentPrepared, currentBlock, currentBlock, 'policy'], [oldPrepared, gateRow.from, currentBlock, 'mixed']]) {
    const input = replaceBlock(source, from, from + added), frame = { name, sourceSHA256: hash(input) };
    report.duplicates.push(frame); fs.writeFileSync(path.join(OUT, 'duplicate-' + name + '.ts'), input);
    Object.assign(frame, refuses(input, 'DECK_POLICY_REJECT_' + name.toUpperCase() + '_DUPLICATE'));
  }
});
report.sourceAfter = snapshot();
report.sourceHeld = JSON.stringify(before) === JSON.stringify(report.sourceAfter);
report.passed = report.sourceHeld && report.cases.every(row => row.status === 'passed');
save();
for (const row of report.cases) console.log(row.status.toUpperCase() + ' ' + row.name + (row.error ? ': ' + row.error.message : ''));
console.log('Source holds: ' + report.sourceHeld + '; report: ' + path.join(OUT, 'report.json'));
process.exitCode = report.passed ? 0 : 1;
