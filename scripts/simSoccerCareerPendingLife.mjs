/* Remote-only saved Life decisions. Actual reports, source copies and resolver
   traces are retained before a baseline or source control can earn credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Pending Life proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/soccerCareerPendingLife.test.ts', SELF = fileURLToPath(import.meta.url);
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), WHEEL = path.join(ROOT, 'src/lib/careerChanceWheel.ts');
const MOMENTS = path.join(ROOT, 'src/components/soccer-career/careerMoments.ts');
const SHARED = path.join(ROOT, 'src/components/career-moments/useCareerMoment.ts');
const ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const PARENT = '83831b32a9a4445a5d60a5c326a4e581e2a73237';
/* Release BF join: SC_PENDING_LIFE_CORE_REF (default PARENT) is the ref the unchanged app files are held to. The packet was proved on
   an older tree; on a newer one the join names the tree without this packet (its merge's first parent), and the
   files this packet fixes are still compared with PARENT. */
const CORE_REF = process.env.SC_PENDING_LIFE_CORE_REF || PARENT;
const CONTROL = process.env.SC_PENDING_LIFE_CONTROL || '', RED = process.env.SC_PENDING_LIFE_EXPECT_RED === '1';
assert(['', 'missing', 'profile', 'draw', 'rate'].includes(CONTROL), 'Unknown or combined actual-source control');
assert(!(RED && CONTROL), 'Baseline and fixed-source controls are separate');
const IDS = [205, 206, 207, 208, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 245];
const OWNED = IDS.map(id => `pending life missing: ${id} saved choices remain resolvable`);
const INVALID = IDS.map(id => `pending life preservation: ${id} invalid context still skips`);
const PRESERVED = [
  'pending life preservation: fresh thresholds keep their original draw ordinals',
  'pending life preservation: pending catalog reads consume original draws and preserve bytes',
  'pending life preservation: a genuinely unknown saved card still skips',
  'pending life preservation: an unavailable choice index still skips without rewards',
  'pending life preservation: actual wheels retain literal odds rolls and both results',
  'pending life preservation: original cooldowns keep exact season boundaries',
  'pending life preservation: resolved live outcomes survive repeated JSON reloads',
  'pending life preservation: absent legacy ledgers never invent an offer stamp',
  'pending life preservation: original live choice inputs remain immutable',
  'pending life preservation: H original wrong-personality 211 skip remains intact',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [ENGINE, LIFE, SAVE, WHEEL, MOMENTS, SHARED, ROUTINE, SELF, path.join(ROOT, TEST)];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const arm = CONTROL || (RED ? 'baseline-red' : 'normal');
const OUT = process.env.CAREER_PENDING_OUT ? path.resolve(process.env.CAREER_PENDING_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-pending-life-'));
const retained = path.join(OUT, 'units', arm);
fs.mkdirSync(retained, { recursive: true });
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-pending-compiled-'));
const anchors = [];
let outcome = {};
let changed = sources.get(LIFE);
function replace(anchor, replacement) {
  assert.equal(changed.split(anchor).length - 1, 1, 'Exactly one actual source anchor must exist');
  const before = changed; changed = changed.replace(anchor, replacement);
  assert.notEqual(changed, before, 'Actual copied-source mutation must be effective'); anchors.push(anchor);
}
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Source Git receipt must finish'); return result.stdout.trim();
}
const sourceHead = git(['rev-parse', 'HEAD']);
const parentAppHashes = files.filter(file => file !== SELF && file !== path.join(ROOT, TEST)).map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/');
  const result = spawnSync('git', ['show', `${file !== LIFE ? CORE_REF : PARENT}:${name}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Held parent app source must exist');
  const row = { file: name, parentSha256: sha(result.stdout), candidateSha256: sha(sources.get(file)) };
  if (RED || file !== LIFE) assert.equal(row.candidateSha256, row.parentSha256, 'Only later fixed Life may differ from held parent app');
  return row;
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT,
    parentAppHashes, sourceReceipts, controlAnchors: anchors, changedSourceSha256: CONTROL ? sha(changed) : null, ...outcome }, null, 2) + '\n');
  return sourceReceipts;
}
function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function random(input, action) {
  const previous = Math.random, draws = [];
  Math.random = () => { const value = typeof input === 'number' ? input : input(); draws.push(value); return value; };
  try { return { result: action(), draws }; } finally { Math.random = previous; }
}
async function browserFixtures() {
  const RealDate = Date, previousStorage = globalThis.localStorage, clock = '2026-10-13T16:00:00Z', now = RealDate.parse(clock);
  const storage = new Map();
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
    const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href);
    const M = await import(pathToFileURL(path.join(tmp, 'moments.mjs')).href);
    const W = await import(pathToFileURL(path.join(tmp, 'wheel.mjs')).href);
    const copy = value => JSON.parse(JSON.stringify(value)), year = state => E.eventSeasonIndex(state);
    function canonical(state) {
      const loaded = E.repairCareer(copy(state)); M.settleLoadedMoments(loaded);
      assert(S.isSoccerCareerSave(loaded), 'Complete fixture must pass actual route save validation'); return copy(loaded);
    }
    const requirements = new Map([[205, { agentId: 'cousin' }], [206, { agentId: 'cousin' }], [207, { agentId: 'shark' }],
      [208, { agentId: 'super' }], [210, { personality: 'showman' }], [211, { personality: 'showman' }],
      [212, { personality: 'iceman' }], [213, { personality: 'iceman' }], [214, { personality: 'hothead' }],
      [215, { personality: 'hothead' }], [216, { personality: 'professor' }], [217, { personality: 'professor' }],
      [218, { personality: 'enigma' }], [219, { personality: 'enigma' }], [245, { lifeFlags: { podcast: 1 } }]]);
    function prepared(id, trial, seed) {
      const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
      const base = random(seeded(seed), () => E.initCareer(`Pending Life ${id} Draw ${trial}`, 'England', 'CM', '2020s',
        stats, 70, 2020, E.FALLBACK_CLUBS, null, 90)).result, club = E.FALLBACK_CLUBS[0];
      return canonical({ ...base, age: 23, phase: 'social_media_action', retired: false, personality: 'professor', agentId: 'self',
        currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
        currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 65,
        popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
        seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
          type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
        lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
        statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional pending decision context'],
        socialMediaActionUsedThisSeason: true, ...requirements.get(id) });
    }
    const firstEffects = new Map([[205, { followers: 0.4, morale: -3 }], [206, { followers: 0.6, skill: 'physical' }],
      [207, { morale: 5 }], [208, { market: 5, morale: -5, integrity: -2 }], [210, { followers: 1.5 }],
      [211, { sponsor: 0.3 }], [212, { integrity: 3, popularity: 5 }], [213, { followers: 0.5, popularity: -2 }],
      [214, { money: -0.2, skill: 'physical' }], [215, { morale: 8, money: -0.1 }], [216, { skill: 'passing', morale: 5 }],
      [217, { popularity: 4, morale: -3 }], [218, { pace: -1 }], [219, { followers: 0.8, popularity: -3 }],
      [245, { followers: 0.8, popularity: -5 }]]);
    const wheels = new Map([[210, { chance: 0.15, title: 'The Halftime Backflip', hit: 'Hamstring tweaked', miss: 'Backflip lands safely' }],
      [218, { chance: 0.6, title: 'The Monastery Offseason', hit: 'Sharper after the retreat', miss: 'Pace drops by 1' }],
      [219, { chance: 0.5, title: 'The Cape Era', hit: 'The cape is loved', miss: 'The cape divides opinion' }]]);
    const scenarios = [], deliveries = [];
    for (const id of IDS) {
      let acquisition = null;
      for (let trial = 0; trial < 4096; trial++) {
        const seed = 840000 + id * 4096 + trial, context = prepared(id, trial, seed), input = JSON.stringify(context);
        const picked = random(seeded(seed), () => E.dismissSocialMediaPhase(context, E.FALLBACK_CLUBS));
        assert.equal(JSON.stringify(context), input, 'Actual picker must hold its input');
        const batch = canonical(picked.result);
        if (batch.phase === 'random_events' && batch.pendingEvents[0]?.id === id && batch.pendingEvents.length > 1) {
          acquisition = { context, batch, trial, seed, draws: picked.draws }; break;
        }
      }
      assert(acquisition, `Actual ${id} picker must lead a nonterminal batch within 4096 disclosed identity and seed trials`);
      const initial = acquisition.batch, held = JSON.stringify(initial);
      assert.equal(initial.eventLastFired[String(id)], year(initial));
      assert.equal(new Set(initial.pendingEvents.map(card => E.eventLedgerKey(card))).size, initial.pendingEvents.length);
      assert(initial.pendingEvents.every(card => card.choices.every(choice => typeof choice.apply === 'undefined')));
      const read = random(0.99, () => L.getLifeEvents(initial));
      assert(read.result.some(card => card.id === id), 'High rejecting offer draw must still resolve the actually queued Life card');
      assert.equal(JSON.stringify(initial), held, 'Catalog read must hold saved fixture bytes');
      const resolved = random(0.99, () => E.applyEventChoice(canonical(initial), 0, E.FALLBACK_CLUBS));
      const expected = canonical(resolved.result), literal = copy(initial), effect = firstEffects.get(id), clamp = n => Math.max(0, Math.min(100, n));
      if (effect.followers !== undefined) literal.socialMediaFollowers = Math.round((literal.socialMediaFollowers + effect.followers) * 100) / 100;
      if (effect.money !== undefined) literal.netWorth = Math.round((literal.netWorth + effect.money) * 100) / 100;
      if (effect.morale !== undefined) literal.morale = clamp(literal.morale + effect.morale);
      if (effect.popularity !== undefined) literal.popularity = clamp(literal.popularity + effect.popularity);
      if (effect.integrity !== undefined) literal.integrityBonus += effect.integrity;
      if (effect.market !== undefined) literal.marketValue += effect.market;
      if (effect.sponsor !== undefined) literal.sponsorBonus = Math.round(((literal.sponsorBonus ?? 0) + effect.sponsor) * 100) / 100;
      if (effect.skill) literal.statBoostNextSeason[effect.skill] = (literal.statBoostNextSeason[effect.skill] ?? 0) + 1;
      if (effect.pace) literal.pace = Math.max(20, Math.min(99, literal.pace + effect.pace));
      if (wheels.has(id)) literal.chanceWheel = { ...wheels.get(id), roll: 0.99, result: false, seen: false };
      literal.lastEventId = id; literal.pendingEvents = literal.pendingEvents.slice(1); literal.phase = 'random_events';
      literal.overall = E.calcOverall(literal, literal.position);
      assert.deepEqual({ ...expected, events: initial.events }, { ...literal, events: initial.events }, 'Full outcome must match the independent first-choice literal effect');
      assert.deepEqual(expected.events.slice(0, initial.events.length), initial.events);
      assert.equal(expected.events.length, initial.events.length + 1);
      assert.equal(expected.eventLastFired[String(id)], year(initial));
      assert.equal(JSON.stringify(canonical(expected)), JSON.stringify(expected), 'Answered fixture must survive actual route reload');
      const step = { eventId: id, choiceIndex: 0, choiceLabel: initial.pendingEvents[0].choices[0].label,
        resolve: { mode: 'constant', value: 0.99, drawCount: resolved.draws.length, draws: resolved.draws },
        expected, expectedSha256: sha(JSON.stringify(expected)), reloadAfter: true };
      if (wheels.has(id)) {
        assert(W.validChanceWheel(expected.chanceWheel));
        const acknowledged = random(0.99, () => W.acknowledgeChanceWheel(canonical(expected)));
        assert.equal(acknowledged.draws.length, 0, 'Actual acknowledgement must never roll again');
        const postWheelExpected = canonical(acknowledged.result), onlySeen = copy(expected); onlySeen.chanceWheel.seen = true;
        assert.deepEqual(postWheelExpected, onlySeen, 'Actual wheel acknowledgement may change only seen');
        step.postWheelExpected = postWheelExpected; step.postWheelExpectedSha256 = sha(JSON.stringify(postWheelExpected));
      }
      deliveries.push({ eventId: id, trial: acquisition.trial, playerName: initial.playerName, seed: acquisition.seed,
        pickerDrawCount: acquisition.draws.length, resolverDrawCount: resolved.draws.length, queue: initial.pendingEvents.map(card => card.id) });
      scenarios.push({ id: `pending-${id}`, initial, initialSha256: sha(JSON.stringify(initial)), provenance: {
        kind: 'actual-picker-offer', preparedFields: [
          'Fictional identity varies per trial; age23, supported club, initial senior row/year/apps24, money, meters, persona or agent or podcast and queued boosts are prepared context.',
          'Social-media-used is prepared to enter the existing picker. This is not a complete played career.',
          'The actual picker supplies the complete batch, stamps and order. No reorder or sentinel is added.',
          'Resolver input is a constant 0.99 stream, not a seed or a mocked chance outcome.'
        ], context: acquisition.context, actualPickerBatch: initial, trial: acquisition.trial, playerName: initial.playerName,
        pickerSeed: acquisition.seed, pickerDrawCount: acquisition.draws.length, pickerDraws: acquisition.draws }, steps: [step] });
    }
    const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock, source: { head: sourceHead, parentAppRef: PARENT,
      engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)), routineSha256: sha(sources.get(ROUTINE)),
      testSha256: sha(sources.get(path.join(ROOT, TEST))), simSha256: sha(sources.get(SELF)), momentsSha256: sha(sources.get(MOMENTS)),
      sharedMomentsSha256: sha(sources.get(SHARED)), saveSha256: sha(sources.get(SAVE)), chanceWheelSha256: sha(sources.get(WHEEL)) }, scenarios };
    const bytes = JSON.stringify(fixtures, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'Normal fixtures cannot replace retained fixtures from different source');
    else fs.writeFileSync(file, bytes);
    fs.writeFileSync(path.join(retained, 'delivery.json'), JSON.stringify(deliveries, null, 2) + '\n');
    return { file, sha256: sha(bytes), deliveries };
  } finally {
    globalThis.Date = RealDate;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
}

try {
  if (CONTROL === 'missing') replace('return rolled || (state.pendingEvents ?? []).some(event => event.id === id);', 'return rolled;');
  if (CONTROL === 'profile') replace('p === "showman" && pendingLifeChance(state, 211, 0.35)',
    '(p === "showman" || (state.pendingEvents ?? []).some(event => event.id === 211)) && pendingLifeChance(state, 211, 0.35)');
  if (CONTROL === 'draw') replace('const rolled = Math.random() < chance;',
    'const rolled = (state.pendingEvents ?? []).some(event => event.id === id) ? false : Math.random() < chance;');
  if (CONTROL === 'rate') replace('pendingLifeChance(state, 211, 0.35)', 'pendingLifeChance(state, 211, 0.34)');
  if (CONTROL) fs.writeFileSync(path.join(retained, 'soccerCareerLife.ts.control'), changed);
  receipt();
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.SC_PENDING_ENGINE; delete env.SC_PENDING_LIFE; delete env.SC_PENDING_SAVE;
  if (!RED) {
    const esbuild = await import('esbuild');
    await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, save: SAVE, moments: MOMENTS, wheel: WHEEL }, outdir: tmp,
      outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
      plugins: [{ name: 'pending-life-actual-source', setup(build) {
        if (CONTROL) build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === LIFE
          ? { contents: changed, loader: 'ts', resolveDir: path.dirname(LIFE) } : undefined);
      } }] });
    env.SC_PENDING_ENGINE = path.join(tmp, 'engine.mjs').replaceAll('\\', '/');
    env.SC_PENDING_LIFE = path.join(tmp, 'life.mjs').replaceAll('\\', '/');
    env.SC_PENDING_SAVE = path.join(tmp, 'save.mjs').replaceAll('\\', '/');
    for (const file of ['engine.mjs', 'life.mjs', 'save.mjs', 'moments.mjs', 'wheel.mjs']) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  }
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Locked remote dependencies must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  const receipts = receipt({ exitCode: result.status, processError: result.error?.message || null,
    compiled: !RED ? ['engine.mjs', 'life.mjs', 'save.mjs', 'moments.mjs', 'wheel.mjs'].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) : [] });
  assert(!result.error && result.status !== null, 'Actual unit runner must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'Complete physical unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact test file must load without file errors');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...INVALID, ...PRESERVED].sort(), 'All forty exact cases must run');
  assert.equal(report.numTotalTests, 40); assert.equal(report.numPendingTests, 0);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped and todo cases cannot earn credit');
  const expected = RED || CONTROL === 'missing' ? OWNED : CONTROL === 'profile' ? [INVALID[IDS.indexOf(211)], PRESERVED[9]]
    : CONTROL === 'draw' ? [PRESERVED[1]] : CONTROL === 'rate' ? [PRESERVED[0]] : [];
  const failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expected].sort(), 'Only exact intended source-caused failures may qualify');
  for (const test of failed) {
    const id = IDS[OWNED.indexOf(test.title)];
    const cause = RED || CONTROL === 'missing' ? new RegExp(`^AssertionError:.*pending Life ${id} lost its saved choice.*expected false to be true`, 's')
      : CONTROL === 'draw' ? /^AssertionError:.*pending Life catalog skipped an original offer draw.*expected 3 to be 4/s
        : CONTROL === 'rate' ? /^AssertionError:.*fresh Life 211 offer threshold changed.*expected false to be true/s
          : test.title === INVALID[IDS.indexOf(211)] ? /^AssertionError:.*invalid Life 211 must not resolve.*expected true to be false/s
            : /^AssertionError:.*H original 211 profile gate must still reject.*expected true to be false/s;
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every expected failure needs its exact causal assertion');
  }
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 40 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Actual child exit must match exact completed outcomes');
  const fixtures = !RED && !CONTROL ? await browserFixtures() : null;
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof bytes must stay held');
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; ${anchors.length} unique anchor changed; sha256=${sha(changed)}.`);
  console.log(`Actual physical unit files: 1; ${cases.length} exact completed outcomes.`);
  console.log(`Saved Life cases: ${OWNED.length}; ${cases.filter(test => OWNED.includes(test.title) && test.status === 'passed').length} actual passes; ${failed.length} exact intended faults.`);
  console.log(`Invalid-context and preservation cases: ${INVALID.length + PRESERVED.length}; ${cases.filter(test => !OWNED.includes(test.title) && test.status === 'passed').length} actual passes; pending 0.`);
  console.log(`Actual child exit: ${result.status}; file message empty; raw setup and unhandled markers absent.`);
  console.log(`Source receipts held: ${receipts.length}; parent app bindings, actual copies and complete raw JSON/log retained.`);
  if (fixtures) console.log(`Actual picker deliveries: ${fixtures.deliveries.length}/15; normal-only source-bound browser fixtures sha256=${fixtures.sha256}.`);
  console.log(`simSoccerCareerPendingLife ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green. Exact source and outcome guards passed.`);
} catch (error) {
  receipt({ methodError: error?.stack || String(error) }); throw error;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
