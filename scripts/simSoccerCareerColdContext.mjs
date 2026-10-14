/* Remote-only cold-context proof. Original parent cards are explicitly prepared
   legacy presentations, never a natural picker, weather or complete-career claim. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Cold context proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerCareerColdContext.test.ts', PARENT = '42a7f7c999cb13bb24bf0992537e4ff84b112f6d';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), REALISM = path.join(ROOT, 'src/lib/soccerCareerRealismA.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const CONTRACTS = path.join(ROOT, 'src/lib/soccerCareerContracts.ts'), CAPTIONS = path.join(ROOT, 'src/lib/soccerCareerLifeConsequences.ts');
const ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts'), BROWSER = path.join(ROOT, 'scripts/playSoccerCareerPendingPopularity.mjs');
const WORKFLOW = path.join(ROOT, '.github/workflows/soccer-career-cold-context.yml');
const CONTROL = process.env.SC_COLD_CONTEXT_CONTROL || '', RED = process.env.SC_COLD_CONTEXT_EXPECT_RED === '1';
const PHASE = process.env.CAREER_COLD_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match the actual baseline or fixed arm');
assert(!CONTROL || CONTROL === 'original', 'Unknown or combined actual-source control');
assert(!(RED && CONTROL), 'Baseline and fixed-source control are separate');
const NAMES = [
  'cold context missing: fresh426 stays absent with Brazil country',
  'cold context missing: fresh426 stays absent with England country',
  'cold context missing: fresh426 stays absent with Finland country',
  'cold context missing: fresh426 stays absent with empty country',
  'cold context preservation: live426 choice0 keeps its original whole effect',
  'cold context preservation: live426 choice1 keeps its original whole effect',
  'cold context preservation: live426 choice2 keeps its original whole effect',
  'cold context preservation: JSON426 choice0 keeps its effect after a club country change',
  'cold context preservation: JSON426 choice1 keeps its effect after a club country change',
  'cold context preservation: JSON426 choice2 keeps its effect after a club country change',
  'cold context preservation: saved426 keeps every original label caption and card field',
  'cold context preservation: pending JSON repair keeps the whole unplayed queue and stamps',
  'cold context preservation: resolved JSON repair keeps its answer once and continuation',
  'cold context preservation: original426 cooldown keeps its exact two-season boundary',
  'cold context preservation: unrelated RealismA cards keep their original context gates',
  'cold context preservation: catalog reads keep the complete input and original draws',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const appFiles = [ENGINE, REALISM, SAVE, LIFE, CONTRACTS, CAPTIONS, ROUTINE];
const files = [...appFiles, SELF, path.join(ROOT, TEST), BROWSER, WORKFLOW];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.CAREER_COLD_OUT ? path.resolve(process.env.CAREER_COLD_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-cold-context-'));
assert(OUT !== ROOT && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep) && OUT !== path.join(ROOT, 'dist'), 'Proof output must stay outside the actual build');
const arm = CONTROL || PHASE, retained = path.join(OUT, arm);
fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace an existing source arm');
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-cold-context-'));
const changed = new Map(sources), anchors = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Source Git receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim(), parentRealism = git(['show', `${PARENT}:src/lib/soccerCareerRealismA.ts`]);
fs.writeFileSync(path.join(retained, 'soccerCareerRealismA.parent.ts'), parentRealism);
const parentAppHashes = appFiles.map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  const row = { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
  if (RED || file !== REALISM) assert.equal(row.candidateSha256, row.parentSha256, 'Only fixed RealismA may differ from the held parent app');
  return row;
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT,
    parentAppHashes, parentRealismSha256: sha(parentRealism), sourceReceipts, actualSourceEdits: anchors, ...outcome }, null, 2) + '\n');
  return sourceReceipts;
}
function random(input, action) {
  const previous = Math.random, draws = [];
  Math.random = () => {
    const value = typeof input === 'number' ? input : input[draws.length];
    assert(value !== undefined, 'Actual source consumed an unlisted random input'); draws.push(value); return value;
  };
  try { return { result: action(), draws }; } finally { Math.random = previous; }
}
async function legacyFixtures() {
  const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href), A = await import(pathToFileURL(path.join(tmp, 'realism.mjs')).href);
  const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href), P = await import(pathToFileURL(path.join(tmp, 'parent-realism.mjs')).href);
  const copy = value => JSON.parse(JSON.stringify(value)), clamp = value => Math.max(0, Math.min(100, value));
  const progress = { status: 'prepared-actual-parent-presentation', freshCatalogs: [], scenarios: [] };
  const saveProgress = () => fs.writeFileSync(path.join(retained, 'fixture-progress.json'), JSON.stringify(progress, null, 2) + '\n');
  saveProgress();
  function canonical(state) {
    const held = JSON.stringify(state), run = random([], () => E.repairCareer(copy(state)));
    assert(S.isSoccerCareerSave(run.result), 'Complete legacy fixture must pass actual save validation');
    assert.deepEqual(run.draws, [], 'Actual canonical repair consumes no answer inputs');
    assert.equal(JSON.stringify(run.result), held, 'Whole prepared canonical save must survive repair unchanged'); return run.result;
  }
  function context(country) {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const init = random(0.9, () => E.initCareer('Cold Context Model Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90));
    const base = init.result, prepared = { ...base, age: 23, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
      currentClub: 'Fixture Rovers', currentClubCountry: country, currentClubTier: 2, currentClubColor: '#238647', currentLeague: 'Fixture League',
      contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 60, popularity: 60, socialMediaFollowers: 1,
      integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4, isLeader: false,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: 'Fixture Rovers', clubCountry: country, clubTier: 2,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { pace: -1, physical: 2, reflexes: 3 }, events: ['Prepared fictional legacy cold-card context'] };
    const repaired = random([], () => E.repairCareer(copy(prepared)));
    assert(S.isSoccerCareerSave(repaired.result)); return { state: canonical(repaired.result), initDraws: init.draws, repairDraws: repaired.draws };
  }
  const prepared = context('Brazil'), beforeContext = JSON.stringify(prepared.state);
  const original = random([], () => P.getRealismEventsA(prepared.state)), catalog = random([0.99, 0.99], () => E.getAllEvents(prepared.state));
  progress.parentCatalog = { cards: copy(original.result), draws: original.draws, context: copy(prepared.state), initDraws: prepared.initDraws,
    repairDraws: prepared.repairDraws, catalogDraws: catalog.draws, catalogCards: copy(catalog.result) }; saveProgress();
  assert.deepEqual(original.draws, []); assert.deepEqual(catalog.draws, [0.99, 0.99]); assert.equal(JSON.stringify(prepared.state), beforeContext);
  const winters = original.result.filter(card => card.id === 426), remaining = catalog.result.filter(card => card.id === 220);
  assert.equal(winters.length, 1, 'The actual held original parent must construct426'); assert.equal(remaining.length, 1, 'The actual continuation card must exist');
  for (const country of ['Brazil', 'England', 'Finland', '']) {
    const preparedFresh = context(country), held = JSON.stringify(preparedFresh.state);
    const run = random([0.99, 0.99], () => E.getAllEvents(preparedFresh.state)), direct = random([], () => A.getRealismEventsA(preparedFresh.state));
    progress.freshCatalogs.push({ country, context: preparedFresh.state, initDraws: preparedFresh.initDraws, repairDraws: preparedFresh.repairDraws,
      catalog: copy(run.result), catalogDraws: run.draws, realism: copy(direct.result), realismDraws: direct.draws }); saveProgress();
    assert.equal(JSON.stringify(preparedFresh.state), held); assert.deepEqual(run.draws, [0.99, 0.99]); assert.deepEqual(direct.draws, []);
    assert(!run.result.some(card => card.id === 426) && !direct.result.some(card => card.id === 426), 'Fixed fresh catalogs must not invent cold weather');
  }
  const scenarios = [];
  for (const choiceIndex of [0, 1, 2]) {
    const initialPrepared = { ...prepared.state, phase: 'random_events', pendingEvents: [winters[0], remaining[0]],
      eventLastFired: { '7777': 2022, '426': 2026, 'story:squadChatLeak': 2026 },
      currentClub: 'Second Fixture Club', currentClubCountry: 'Finland', currentLeague: 'Second Fixture League' };
    const initial = canonical(canonical(copy(initialPrepared))), held = JSON.stringify(initial), run = random([0.99, 0.99], () => E.applyEventChoice(initial, choiceIndex, E.FALLBACK_CLUBS));
    const actual = copy(run.result), literal = copy(initial);
    literal.morale = clamp(initial.morale + [8, -4, 7][choiceIndex]);
    if (choiceIndex === 0) { literal.netWorth = 9.94; literal.isLeader = true; }
    if (choiceIndex === 1) literal.statBoostNextSeason.physical = 5;
    if (choiceIndex === 2) { literal.netWorth = 9.85; literal.statBoostNextSeason.pace = 1; }
    literal.events.push([
      '❄️ Bought the whole squad arctic grade base layers. Two lads cried, possibly from the cold',
      '❄️ Trained outside all winter in minus twenty. Came out the other side basically weatherproof',
      '❄️ Spent the winter break at a private warm weather camp. Came back tanned, sharp and slightly resented',
    ][choiceIndex]);
    literal.lastEventId = 426; literal.pendingEvents = copy(initial.pendingEvents.slice(1)); literal.phase = 'random_events'; literal.overall = 70;
    const id = `cold-choice${choiceIndex}`;
    progress.scenarios.push({ id, initial, actual, literal, draws: run.draws }); saveProgress();
    assert.equal(JSON.stringify(initial), held, 'Original answer input must remain unchanged'); assert.deepEqual(run.draws, [0.99, 0.99]);
    assert.deepEqual(actual, literal, 'Whole original winter choice must match independent literal effects');
    assert.deepEqual(canonical(canonical(actual)), actual, 'Whole answer survives two actual canonical reloads');
    const parentCard = copy(winters[0]), parentCardSha256 = sha(JSON.stringify(parentCard));
    scenarios.push({ id, initial, initialSha256: sha(JSON.stringify(initial)), provenance: {
      kind: 'prepared-actual-parent-legacy-card', preparedFields: [
        'Fictional identity and club, supported actual init, senior season/year2026/apps24, uniform70 skills and iceman/self are prepared context.',
        'The physical original parent RealismA factory constructs the complete legacy426 card. The current actual catalog supplies220.',
        'The two-card presentation and original current-season stamps are explicitly prepared, not a picker delivery or natural rate claim.',
        'A club/country change is prepared before canonical load. Country is not evidence of temperature or a winter fixture.',
        'No weather field, geographic allowlist, sort observer, queue rewrite or whole-career random-stream equality is credited.',
        'The actual answer resolver consumes exactly two original rejecting catalog inputs and no426 effect draw.',
      ], context: copy(prepared.state), parentCard, parentCardSha256, originalCatalog: copy(original.result), originalDraws: original.draws,
      continuationCard: copy(remaining[0]), continuationCatalogDraws: catalog.draws, presentedQueue: [426, 220], legacyCaptions: [] },
      steps: [{ eventId: 426, choiceIndex, choiceLabel: initial.pendingEvents[0].choices[choiceIndex].label,
        currentConsequence: initial.pendingEvents[0].choices[choiceIndex].consequence, resolve: { mode: 'vector', drawCount: 2, draws: run.draws },
        expected: actual, expectedSha256: sha(JSON.stringify(actual)), reloadAfter: true }] });
  }
  const parentCompiled = fs.readFileSync(path.join(tmp, 'parent-realism.mjs'));
  const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock: '2026-10-13T16:00:00Z', source: {
    head: sourceHead, parentAppRef: PARENT, engineSha256: sha(sources.get(ENGINE)), realismSha256: sha(sources.get(REALISM)),
    lifeSha256: sha(sources.get(LIFE)), routineSha256: sha(sources.get(ROUTINE)), saveSha256: sha(sources.get(SAVE)),
    contractsSha256: sha(sources.get(CONTRACTS)), consequencesSha256: sha(sources.get(CAPTIONS)),
    testSha256: sha(sources.get(path.join(ROOT, TEST))), simSha256: sha(sources.get(SELF)), parentRealismSha256: sha(parentRealism),
    parentRealismCompiledSha256: sha(parentCompiled), parentRealismSourcePath: 'fixed/soccerCareerRealismA.parent.ts',
    parentRealismCompiledPath: 'fixed/parent-realism.mjs', progressPath: 'fixed/fixture-progress.json' }, scenarios };
  const bytes = JSON.stringify(fixtures, null, 2) + '\n', file = path.join(OUT, 'legacy-fixtures.json');
  assert(!fs.existsSync(file), 'Refuse to replace existing legacy model fixtures'); fs.writeFileSync(file, bytes);
  progress.status = 'complete'; saveProgress(); return { file, sha256: sha(bytes), scenarios: 3, actualAnswers: 3, freshCatalogs: 4 };
}

try {
  if (CONTROL) {
    const anchor = '  if (state.pendingEvents.some(event => event.id === 426)) {\n    push({ id: 426,', replacement = '  if (pro >= 1) {\n    push({ id: 426,';
    const before = sources.get(REALISM); assert.equal(before.split(anchor).length - 1, 1, 'One actual pending426 guard must exist');
    const after = before.replace(anchor, replacement); assert.notEqual(after, before); assert.equal(after.split(replacement).length - 1, 1);
    assert.equal(after.replace(replacement, anchor), before, 'Fault inverse must restore every current RealismA byte');
    assert.equal(after, parentRealism, 'Restoring only426 original guard must recover the whole held parent RealismA');
    changed.set(REALISM, after); anchors.push({ kind: CONTROL, file: 'src/lib/soccerCareerRealismA.ts', anchor, replacement,
      beforeSha256: sha(before), afterSha256: sha(after) }); fs.writeFileSync(path.join(retained, 'soccerCareerRealismA.control'), after);
  }
  assert.equal(anchors.length, CONTROL ? 1 : 0); receipt();
  const esbuild = await import('esbuild'), parentEntry = path.join(tmp, 'soccerCareerRealismA.parent.ts'); fs.writeFileSync(parentEntry, parentRealism);
  await esbuild.build({ entryPoints: { engine: ENGINE, realism: REALISM, save: SAVE, contracts: CONTRACTS, 'parent-realism': parentEntry }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'cold-context-actual-source', setup(build) {
      build.onLoad({ filter: /\.ts$/ }, args => {
        if (path.resolve(args.path) === parentEntry) return { contents: parentRealism, loader: 'ts', resolveDir: path.dirname(REALISM) };
        const contents = changed.get(path.resolve(args.path));
        return contents !== undefined && contents !== sources.get(path.resolve(args.path)) ? { contents, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
      }); } }] });
  const compiled = ['engine.mjs', 'realism.mjs', 'save.mjs', 'contracts.mjs', 'parent-realism.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const [key, file] of [['SC_COLD_ENGINE', 'engine.mjs'], ['SC_COLD_REALISM', 'realism.mjs'], ['SC_COLD_SAVE', 'save.mjs'], ['SC_COLD_PARENT_REALISM', 'parent-realism.mjs']])
    env[key] = path.join(tmp, file).replaceAll('\\', '/');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json'); assert(fs.existsSync(runner));
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  const receipts = receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'Actual unit runner must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn proof credit'); assert(fs.existsSync(reportFile), 'Physical unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact unit file must load without errors');
  const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort(), 'All sixteen literal cases must complete');
  assert.equal(report.numTotalTests, 16); assert.equal(report.numPendingTests, 0); assert(cases.every(test => ['passed', 'failed'].includes(test.status)));
  const indices = RED || CONTROL ? [0, 1, 2, 3] : [], failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), indices.map(index => NAMES[index]).sort(), 'Only exact intended failures may qualify');
  for (const test of failed) assert(test.failureMessages.length > 0 && test.failureMessages.every(value =>
    /^AssertionError:.*fresh extreme cold card has no supported saved weather context.*expected false to be true/s.test(value)), 'Every expected fault needs its exact Boolean causal assertion');
  assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 16 - indices.length);
  assert.equal(result.status, indices.length ? 1 : 0, 'Actual child exit must match all exact completed outcomes');
  const fixtures = !RED && !CONTROL ? await legacyFixtures() : null;
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source must stay held');
  receipt({ fixtures: fixtures ? { ...fixtures, file: path.relative(OUT, fixtures.file) } : null });
  if (CONTROL) console.log(`Effective original gate control: one unique copied RealismA fault; whole parent inverse; changed sha256=${anchors[0].afterSha256}.`);
  console.log(`Actual physical unit files: 1; ${cases.length} exact completed outcomes.`);
  console.log(`Cold context outcomes: ${report.numPassedTests} passed; ${failed.length} exact intended Boolean faults; pending 0; child exit ${result.status}.`);
  console.log(`Actual app source copies: ${sources.size} held before copies; ${parentAppHashes.length} whole parent bindings; ${compiled.length} compiled leaves retained.`);
  console.log('No normal or baseline source mutation; no weather marker, natural picker, observer, sort ordinal or whole-career random-stream claim.');
  if (fixtures) console.log(`Actual prepared parent fixtures: three legacy choices; three whole answers; four fresh catalog absences; sha256=${fixtures.sha256}.`);
  console.log(`Raw source/process/log/JSON receipts held: ${receipts.length}; all file/setup/pending guards close.`);
  console.log(`simSoccerCareerColdContext ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
