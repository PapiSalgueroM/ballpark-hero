/* Remote-only recorded life reviews. Baseline and copied-source faults retain
   their complete unit reports before any cause classification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Life review proof runs remotely with offline transport only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/soccerCareerLifeReviews.test.ts';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const MOMENTS = path.join(ROOT, 'src/components/soccer-career/careerMoments.ts');
const SHARED_MOMENTS = path.join(ROOT, 'src/components/career-moments/useCareerMoment.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), SELF = fileURLToPath(import.meta.url);
const CONTROL = process.env.SC_LIFE_REVIEWS_CONTROL || '', RED = process.env.SC_LIFE_REVIEWS_EXPECT_RED === '1';
assert(['', 'missing', 'priority', 'effect'].includes(CONTROL), 'Unknown actual-source control');
assert(!(CONTROL && RED), 'Baseline and fixed-source controls are separate');
const OWNED = [
  'life review missing: repayment has priority in the actual next playing season',
  'life review missing: practical review has priority in the actual next playing season',
  'life review missing: match analysis saves its exact queued passing and integrity',
  'life review missing: youth session saves its exact queued defending and integrity',
  'life review missing: leaving the course saves morale without a qualification',
  'life review missing: queued review survives changed offer gates and JSON reload',
  'life review missing: both queued assignment skills reach the actual next season once',
  'life review missing: a legacy started course is due without inventing an acquisition year',
  'life review missing: reviewed and left courses never receive a fresh review',
];
const PRESERVED = [
  'life review preservation: all original coaching choices keep their literal outcomes',
  'life review preservation: lending and declining keep the original money and integrity',
  'life review preservation: repayment hit keeps its original money morale and wheel',
  'life review preservation: repayment miss keeps its original integrity morale and wheel',
  'life review preservation: repayment gift keeps cash and closes the actual story',
  'life review preservation: acquisition season does not gain a new priority',
  'life review preservation: declined courses and outside loans create no new followup',
  'life review preservation: retired careers gain no fresh repayment or course priority',
  'life review preservation: existing repayment once cooldown still blocks the actual picker',
  'life review preservation: priority reads keep old saves and their random stream intact',
  'life review preservation: a newly started course has no fresh practical review',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceFiles = [ENGINE, LIFE, MOMENTS, SHARED_MOMENTS, SAVE, SELF, path.join(ROOT, TEST),
  path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts'), path.join(ROOT, 'src/lib/careerChanceWheel.ts')];
const sources = new Map(sourceFiles.map(file => [file, fs.readFileSync(file, 'utf8')]));
const arm = CONTROL || (RED ? 'baseline-red' : 'normal');
const OUT = process.env.CAREER_REVIEWS_OUT ? path.resolve(process.env.CAREER_REVIEWS_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-life-reviews-'));
const retained = path.join(OUT, 'units', arm);
fs.mkdirSync(retained, { recursive: true });
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.life-reviews-proof-'));
const anchors = [];
let changed = sources.get(LIFE);
function replace(anchor, replacement) {
  assert.equal(changed.split(anchor).length - 1, 1, 'Exactly one actual source anchor must change');
  const before = changed; changed = changed.replace(anchor, replacement);
  assert.notEqual(changed, before, 'Actual source mutation must be effective'); anchors.push(anchor);
}
function omitPair(anchor) {
  assert.equal(changed.split(anchor).length - 1, 1, 'Exactly one new priority pair must exist');
  const start = changed.indexOf(anchor), end = start + anchor.length;
  const following = changed.slice(end).match(/^\s*,/);
  if (following) changed = changed.slice(0, start) + changed.slice(end + following[0].length);
  else {
    const preceding = changed.slice(0, start).match(/,\s*$/);
    assert(preceding, 'Priority pair must be an actual array entry');
    changed = changed.slice(0, start - preceding[0].length) + changed.slice(end);
  }
  anchors.push(anchor);
}
function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function withSeed(seed, action) {
  const original = Math.random; Math.random = seeded(seed);
  try { return action(); } finally { Math.random = original; }
}
async function browserFixtures() {
  const RealDate = Date, previousStorage = globalThis.localStorage;
  const clock = '2026-10-13T16:00:00Z', now = RealDate.parse(clock), storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key), clear: () => storage.clear(), key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size; } };
  globalThis.Date = class extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(now); }
    static now() { return now; }
  };
  try {
    const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href);
    const L = await import(pathToFileURL(path.join(tmp, 'life.mjs')).href);
    const M = await import(pathToFileURL(path.join(tmp, 'moments.mjs')).href);
    const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href);
    const copy = value => JSON.parse(JSON.stringify(value));
    function canonical(state) {
      const loaded = E.repairCareer(copy(state)); M.settleLoadedMoments(loaded);
      assert(S.isSoccerCareerSave(loaded), 'Actual route save validator must accept each complete fixture');
      return copy(loaded);
    }
    const year = state => state.seasons[state.seasons.length - 1].year;
    function initial() {
      const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
      const base = withSeed(660, () => E.initCareer('Life Review Fixture', 'England', 'CM', '2020s', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94));
      const club = E.FALLBACK_CLUBS[0];
      return canonical({ ...base, age: 30, phase: 'playing', personality: 'professor', agentId: 'self', retired: false,
        currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
        currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
        seasons: [{ ...base.seasons[0], year: 2026, age: 30, club: club.name, clubCountry: club.country, clubTier: club.tier,
          type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
        netWorth: 10, morale: 65, integrityBonus: 5, lifeFlags: {}, eventLastFired: {}, seriousInjuries: [],
        pendingEvents: [], statBoostNextSeason: { physical: 2 }, events: ['Prepared fictional review context'] });
    }
    function draw(state, seed) {
      return canonical(withSeed(seed, () => E.dismissSocialMediaPhase({ ...canonical(state), phase: 'social_media_action',
        socialMediaActionUsedThisSeason: true }, E.FALLBACK_CLUBS)));
    }
    function nextPlaying(state) {
      for (let seed = 770; seed < 802; seed++) {
        const input = { ...canonical(state), phase: 'playing', pendingEvents: [], loan: null };
        const next = withSeed(seed, () => {
          const started = E.advanceProSeason(input, E.FALLBACK_CLUBS);
          return started.phase === 'retirement_suggestion' ? E.declineRetirementSuggestion(started, E.FALLBACK_CLUBS) : started;
        });
        const row = next.seasons[next.seasons.length - 1];
        if (row.year === year(state) + 1 && row.type === 'playing' && row.apps > 0 && !row.injurySevere && !next.retired)
          return { state: canonical(next), seed };
      }
      throw new Error('Fixture refused: no actual next playing season within 32 fixed seeds');
    }
    const scenarios = [], delivery = [];
    for (const [acquisitionId, eventId, flag] of [[270, 630, 'coachingBadges'], [236, 237, 'teammateLoan']]) {
      const prepared = initial(); let acquisitionBatch = null, acquisitionSeed = null;
      for (let offset = 0; offset < 2048; offset++) {
        const seed = 60000 + acquisitionId * 2048 + offset, actual = draw(prepared, seed);
        if (actual.pendingEvents[0]?.id === acquisitionId && actual.pendingEvents.length > 1) {
          acquisitionBatch = actual; acquisitionSeed = seed; break;
        }
      }
      assert(acquisitionBatch, 'Actual acquisition must lead a nonterminal batch within 2048 fixed seeds');
      const acquired = canonical(withSeed(acquisitionId, () => E.applyEventChoice(canonical(acquisitionBatch), 0, E.FALLBACK_CLUBS)));
      assert.equal(acquired.lifeFlags[flag], 1);
      assert.equal(acquired.eventLastFired[String(acquisitionId)], year(acquired));
      assert(!L.getPriorityLifeEventIds(acquired).includes(eventId), 'Same acquisition season must not gain priority');
      const advanced = nextPlaying(acquired), nextSeason = advanced.state;
      assert(L.getPriorityLifeEventIds(nextSeason).includes(eventId), 'Actual next playing season must prioritize the recorded choice');
      let pickerBatch = null, pickerSeed = null;
      for (let offset = 0; offset < 32; offset++) {
        const seed = 72000 + eventId * 32 + offset, actual = draw(nextSeason, seed);
        if (actual.pendingEvents[0]?.id === eventId && actual.pendingEvents.length > 1) { pickerBatch = actual; pickerSeed = seed; break; }
      }
      assert(pickerBatch, 'Actual followup must lead a nonterminal priority batch within 32 fixed seeds');
      assert.equal(pickerBatch.eventLastFired[String(eventId)], year(nextSeason));
      assert.equal(new Set(pickerBatch.pendingEvents.map(item => E.eventLedgerKey(item))).size, pickerBatch.pendingEvents.length);
      delivery.push({ acquisitionId, eventId, acquisitionSeed, nextSeasonSeed: advanced.seed, pickerSeed,
        acquisitionYear: year(acquired), deliveryYear: year(nextSeason), queued: true });
      for (const choiceIndex of eventId === 630 ? [0, 1, 2] : [1]) {
        const before = canonical(pickerBatch), seed = 91000 + eventId * 4 + choiceIndex;
        const expected = canonical(withSeed(seed, () => E.applyEventChoice(canonical(before), choiceIndex, E.FALLBACK_CLUBS)));
        const effect = copy(before);
        effect.lifeFlags[flag] = eventId === 237 ? 2 : choiceIndex === 2 ? 4 : 3;
        if (eventId === 237) { effect.integrityBonus += 4; effect.morale = Math.min(100, effect.morale + 3); }
        else if (choiceIndex < 2) {
          const skill = choiceIndex === 0 ? 'passing' : 'defending';
          effect.statBoostNextSeason[skill] = (effect.statBoostNextSeason[skill] ?? 0) + 1;
          effect.integrityBonus += choiceIndex === 0 ? 2 : 1;
        } else effect.morale = Math.min(100, effect.morale + 2);
        effect.phase = 'random_events'; effect.lastEventId = eventId; effect.pendingEvents = effect.pendingEvents.slice(1);
        assert.deepEqual({ ...expected, events: before.events }, { ...effect, events: before.events }, 'Every unrelated serialized outcome must match the independent literal effect');
        assert.equal(expected.events.length, before.events.length + 1);
        assert.deepEqual(expected.events.slice(0, before.events.length), before.events);
        const resolved = { ...canonical(expected), pendingEvents: [] };
        assert(!L.getLifeEvents(resolved).some(item => item.id === eventId), 'Resolved stage must remove a fresh offer');
        assert(!L.getPriorityLifeEventIds(resolved).includes(eventId), 'Resolved stage must remove priority');
        scenarios.push({ id: eventId === 630 ? `630-choice${choiceIndex}` : '237-gift', initial: before, initialSha256: sha(JSON.stringify(before)),
          provenance: { kind: 'actual-picker-followup', preparedFields: [
            'Player identity, age30, supported club, initial senior row/year/apps24, money and meters are fictional preparations.',
            'Acquisition card delivery, stamp and choice use the actual engine.',
            'The model season input clears remaining acquisition cards and sets playing/loan-null; it is not a complete UI career journey.',
            'Next playing row and priority batch use actual engine functions. No queue reorder or sentinel was added.'
          ], acquisitionBatch, acquired, nextSeason, pickerBatch, acquisitionSeed, nextSeasonSeed: advanced.seed, pickerSeed },
          steps: [{ eventId, choiceIndex, choiceLabel: before.pendingEvents[0].choices[choiceIndex].label,
            seed, expected, expectedSha256: sha(JSON.stringify(expected)), reloadAfter: true }] });
      }
    }
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(head.status, 0, 'Fixture source must bind to actual checkout HEAD');
    const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock,
      source: { head: head.stdout.trim(), engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)),
        momentsSha256: sha(sources.get(MOMENTS)), sharedMomentsSha256: sha(sources.get(SHARED_MOMENTS)), saveSha256: sha(sources.get(SAVE)),
        testSha256: sha(sources.get(path.join(ROOT, TEST))), simSha256: sha(sources.get(SELF)),
        routineSha256: sha(sources.get(path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts'))) }, scenarios };
    const bytes = JSON.stringify(fixtures, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'Normal fixtures must never replace different retained fixtures');
    else fs.writeFileSync(file, bytes);
    fs.writeFileSync(path.join(retained, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n');
    return { file, sha256: sha(bytes), scenarios: scenarios.length, delivery };
  } finally {
    globalThis.Date = RealDate;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
}

try {
  if (CONTROL === 'missing') replace('id: 630,', 'id: -630,');
  if (CONTROL === 'priority') { omitPair('[236, 237, "teammateLoan"]'); omitPair('[270, 630, "coachingBadges"]'); }
  if (CONTROL === 'effect') replace('setFlag(s, "coachingBadges", 3); bump(s, "passing", 1); s.integrityBonus += 2;',
    'setFlag(s, "coachingBadges", 3); bump(s, "passing", 0); s.integrityBonus += 2;');
  if (CONTROL) {
    assert.notEqual(changed, sources.get(LIFE), 'Actual source copy must differ');
    fs.writeFileSync(path.join(retained, 'soccerCareerLife.ts.control'), changed);
  }
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.SC_LIFE_REVIEWS_ENGINE; delete env.SC_LIFE_REVIEWS_LIFE;
  if (!RED) {
    const esbuild = await import('esbuild');
    await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, moments: MOMENTS, save: SAVE }, outdir: tmp,
      outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
      plugins: [{ name: 'life-review-actual-source', setup(build) {
        if (CONTROL) build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === LIFE
          ? { contents: changed, loader: 'ts', resolveDir: path.dirname(LIFE) } : undefined);
      } }] });
    env.SC_LIFE_REVIEWS_ENGINE = path.join(tmp, 'engine.mjs').replaceAll('\\', '/');
    env.SC_LIFE_REVIEWS_LIFE = path.join(tmp, 'life.mjs').replaceAll('\\', '/');
    for (const file of ['engine.mjs', 'life.mjs', 'moments.mjs', 'save.mjs']) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  }
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Locked remote dependencies must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  const receipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceReceipts: receipts, exitCode: result.status,
    processError: result.error?.message || null, controlAnchors: anchors,
    changedSourceSha256: CONTROL ? sha(changed) : null }, null, 2) + '\n');
  assert(!result.error && result.status !== null, 'Actual unit runner must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'Complete actual unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact physical test file must load without errors');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'All twenty exact outcomes must run');
  assert.equal(report.numTotalTests, 20); assert.equal(report.numPendingTests, 0);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'No skipped or todo case earns credit');
  assert(cases.filter(test => PRESERVED.includes(test.title)).every(test => test.status === 'passed'), 'All eleven preservation cases must pass');
  const expected = RED ? OWNED : CONTROL === 'missing' ? OWNED.slice(1) : CONTROL === 'priority' ? [OWNED[0], OWNED[1], OWNED[7]]
    : CONTROL === 'effect' ? [OWNED[2], OWNED[5], OWNED[6]] : [];
  const failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expected].sort(), 'Only intended source-caused failures may qualify');
  for (const test of failed) {
    const cause = CONTROL === 'effect' ? /^AssertionError:.*expected 0 to be 1/s
      : CONTROL === 'priority' || (OWNED.indexOf(test.title) < 2 && CONTROL !== 'missing') ? /^AssertionError:.*expected false to be true/s
        : /^AssertionError:.*life review 630 missing from actual (?:life catalog|picker).*to have a length of 1 but got \+0/s;
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every intended failure must have its specific assertion cause');
  }
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 20 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Actual exit must match exact classified outcomes');
  const fixtures = !RED && !CONTROL ? await browserFixtures() : null;
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source must stay byte held');
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; ${anchors.length} unique anchors changed; sha256=${sha(changed)}.`);
  console.log(`Actual physical unit files: 1; ${cases.length} exact completed outcomes.`);
  console.log(`Owned review outcomes: ${OWNED.length}; passed ${cases.filter(test => OWNED.includes(test.title) && test.status === 'passed').length}; ${failed.length} intended failures.`);
  console.log(`Preservation outcomes: ${PRESERVED.length} actual passes; pending 0; file message empty.`);
  console.log(`Actual runner exit: ${result.status}; raw setup and unhandled markers absent.`);
  console.log(`Source receipts held: ${receipts.length}; before/control copies and raw report/log retained.`);
  if (fixtures) console.log(`Actual delivery: ${fixtures.delivery.length}/2 recorded chains; ${fixtures.scenarios} normal-only browser fixtures; sha256=${fixtures.sha256}.`);
  console.log(`simSoccerCareerLifeReviews ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green. Exact causal outcome and source guards passed.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
