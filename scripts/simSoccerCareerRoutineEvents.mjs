/* Remote-only routine and promised-followup outcomes through the actual engine.
   SC_ROUTINE_EXPECT_RED=1 classifies only the authored missing-feature assertions.
   SC_ROUTINE_CONTROL=missing|priority|effect rewrites actual source in memory.
   The original source, changed source, raw runner log and JSON are retained. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Soccer routine proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['src/test/soccerCareerRoutineEvents.test.ts', 'src/test/soccerCareerLifeFollowups.test.ts'];
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const MOMENTS = path.join(ROOT, 'src/components/soccer-career/careerMoments.ts');
const MOMENT_HELPER = path.join(ROOT, 'src/components/career-moments/useCareerMoment.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const CONTROL = process.env.SC_ROUTINE_CONTROL || '';
const EXPECT_RED = process.env.SC_ROUTINE_EXPECT_RED === '1';
assert(['', 'missing', 'priority', 'effect'].includes(CONTROL), 'Unknown SC_ROUTINE_CONTROL');
assert(!(CONTROL && EXPECT_RED), 'Baseline and fixed-source controls are separate arms');
const SCENARIOS = [
  'extra passing reps', 'video notes', 'first touch work', 'sprint mechanics', 'keeper catching',
  'long away trip', 'post trip quiet', 'travel meal routine', 'shared travel notes', 'calling home',
  'defensive clips', 'loan parent check in', 'loan local community', 'midfield receiving angles', 'captain squad responsibility',
  'reserve frustration', 'finishing practice', 'helping a training partner', 'kit preparation', 'captain media duty',
  'family visit', 'keeping an off season routine', 'sponsor appearance', 'quiet phone time', 'cool down routine',
  'recorded injury review', 'veteran warm up', 'skill review', 'new club introduction', 'family school calendar',
];
const ROUTINE_OWNED = [
  ...SCENARIOS.map((scenario, index) => `routine missing: ${600 + index} ${scenario} saves both choices exactly`),
  'routine missing: stable capped reads add no random draws',
  'routine missing: year and player identity rotate the offered decisions',
  'routine missing: recorded context excludes incompatible fresh offers',
  'routine missing: actual full catalog reads keep saved state intact',
  'routine missing: a queued reserve choice survives a real morale change and reload',
  'routine missing: two actual routine choices accumulate queued effects through reload',
  'routine missing: queued skill reaches the actual next season once',
  'routine missing: modest morale and popularity changes respect their boundaries',
];
const ROUTINE_PRESERVED = [
  'routine preservation: an existing humble celebration still saves its actual morale',
  'routine preservation: the existing golf choice keeps its queued pace tradeoff',
  'routine preservation: two existing cards still answer after each JSON reload',
  'routine preservation: an unavailable old card skips without applying invented effects',
  'routine preservation: existing category and once story cooldowns retain their season boundaries',
  'routine preservation: existing cousin agent gates still draw their own randomness',
];
const FOLLOWUP_OWNED = [
  'followup missing: esports results have priority in the actual next playing season',
  'followup missing: the boots story has priority in the actual next playing season',
];
const FOLLOWUP_PRESERVED = [
  'followup preservation: actual acquisitions and their existing season stamps survive JSON reload',
  'followup preservation: newly acquired stories are not due again in their acquisition season',
  'followup preservation: sold completed and declined stories do not create another priority',
  'followup preservation: retired careers get no new playing season priority',
  'followup preservation: existing personality agent and comeback priorities remain available',
  'followup preservation: the actual picker still holds a followup inside its cooldown',
  'followup preservation: priority reads keep old saves and the random stream untouched',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = text => createHash('sha256').update(text).digest('hex');
const paths = [ENGINE, LIFE, MOMENTS, MOMENT_HELPER, SAVE, fileURLToPath(import.meta.url), ...FILES.map(file => path.join(ROOT, file))];
if (fs.existsSync(ROUTINE)) paths.push(ROUTINE);
const sources = new Map(paths.map(file => [file, fs.readFileSync(file, 'utf8')]));
const arm = CONTROL || (EXPECT_RED ? 'baseline-red' : 'normal');
const retained = process.env.SOCCER_ROUTINE_OUT ? path.join(path.resolve(process.env.SOCCER_ROUTINE_OUT), 'units', arm) : null;
if (retained) {
  fs.mkdirSync(retained, { recursive: true });
  for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
}
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.soccer-routine-proof-'));
let changedFile = null;
let changedSource = null;
const anchors = [];

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function withRandom(seed, action) {
  const original = Math.random;
  Math.random = typeof seed === 'function' ? seed : seeded(seed);
  try { return action(); } finally { Math.random = original; }
}
const copy = value => JSON.parse(JSON.stringify(value));

async function actualPickerAndFixtures(directory) {
  const storageBefore = globalThis.localStorage;
  const RealDate = Date;
  const now = Date.parse('2026-10-12T16:00:00Z');
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key), clear: () => store.clear(), key: index => [...store.keys()][index] ?? null,
    get length() { return store.size; } };
  globalThis.Date = class extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(now); }
    static now() { return now; }
  };
  try {
    const E = await import(pathToFileURL(path.join(directory, 'engine.mjs')).href);
    const L = await import(pathToFileURL(path.join(directory, 'life.mjs')).href);
    const M = await import(pathToFileURL(path.join(directory, 'moments.mjs')).href);
    const S = await import(pathToFileURL(path.join(directory, 'save.mjs')).href);
    function canonical(state) {
      const restored = E.repairCareer(copy(state));
      const before = JSON.stringify(restored);
      M.settleLoadedMoments(restored);
      assert.equal(JSON.stringify(restored), before, 'Actual loaded-moment settling must preserve career bytes');
      assert(S.isSoccerCareerSave(restored), 'Every generated career must satisfy the actual route save validator');
      return copy(restored);
    }
    const club = { id: 'routine-fixture', name: 'Fixture Albion', country: 'England', tier: 3, league: 'Fixture League', color: '#123456' };
    function context(id = 600) {
      const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
      const initial = withRandom(660, () => E.initCareer('Routine Fixture', 'England', 'ST', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90));
      const row = { ...initial.seasons[0], year: 2026, age: 31, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 12, leagueApps: 10, goals: 2, assists: 1, rating: 6.8, injury: null, injuryWeeks: 0, injurySevere: false };
      if (id === 625) { row.injury = 'Fixture strain'; row.injuryWeeks = 2; }
      if (id === 628) row.club = 'Fixture Previous';
      return canonical({ ...initial, age: 31, phase: 'playing', retired: false, currentClub: club.name,
        currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
        position: ({ 604: 'GK', 610: 'CB', 613: 'CM', 616: 'ST' })[id] ?? 'ST', seasons: [row],
        personality: null, agentId: null, lifeFlags: {}, morale: 65, popularity: 40, integrityBonus: 5,
        netWorth: 1, weeklyWage: 4000, statBoostNextSeason: { physical: 2 }, isClubCaptain: true, captainClub: club.name,
        loan: { parentClub: 'Fixture Parent', parentTier: 3, parentLeague: club.league, parentCountry: club.country, parentColor: '#654321' },
        family: { ...initial.family, children: 1 }, events: ['Fixture career history'], pendingEvents: [], eventLastFired: {} });
    }
    const yearOf = state => state.seasons[state.seasons.length - 1].year;
    const routineCards = cards => cards.filter(card => card.id >= 600 && card.id <= 629);
    function offered(id) {
      const initial = context(id);
      for (let year = 2026; year < 2056; year++) {
        const state = canonical({ ...initial, seasons: initial.seasons.map(row => ({ ...row, year })) });
        const card = withRandom(() => 0.9, () => L.getLifeEvents(state).find(card => card.id === id));
        if (card) return { state, card };
      }
      return null;
    }
    function draw(state, seed) {
      return withRandom(seed, () => E.dismissSocialMediaPhase({ ...canonical(state), phase: 'social_media_action', socialMediaActionUsedThisSeason: true }, E.FALLBACK_CLUBS));
    }
    const picker = { candidates: 30, boundYearsPerId: 30, boundSeedsPerId: 2048, attempts: 0,
      queuedIds: [], answeredIds: [], missingIds: [], cases: [], duplicateKeys: 0, cooldownLosses: 0,
      limits: ['Context fields are explicit fictional scenario preparations.', 'Delivery and stamps are produced by the actual engine picker.',
        'Only catalog reads, not the picker or the complete career, promise zero extra random draws.'] };
    const retainPicker = () => { if (retained) fs.writeFileSync(path.join(retained, 'picker.json'), JSON.stringify(picker, null, 2) + '\n'); };
    for (let id = 600; id <= 629; id++) {
      const found = offered(id);
      if (!found) { picker.missingIds.push(id); retainPicker(); continue; }
      let delivery = null;
      let deliverySeed = null;
      for (let seed = 0; seed < 2048; seed++) {
        picker.attempts++;
        const actual = draw(found.state, 12000 + id * 2048 + seed);
        if (actual.phase === 'random_events' && actual.pendingEvents.some(card => card.id === id)) {
          delivery = canonical(actual); deliverySeed = 12000 + id * 2048 + seed; break;
        }
      }
      retainPicker();
      assert(delivery, `Actual picker did not queue routine ${id} within 2048 fixed seeds`);
      picker.queuedIds.push(id);
      const keys = delivery.pendingEvents.map(card => E.eventLedgerKey(card));
      if (new Set(keys).size !== keys.length) picker.duplicateKeys++;
      const pickedRoutine = routineCards(delivery.pendingEvents);
      for (const card of pickedRoutine) {
        assert.equal(delivery.eventLastFired[E.eventLedgerKey(card)], yearOf(delivery), 'Actual picker must stamp every queued routine');
        for (const offset of [0, 1, 2]) if (!E.isEventOnCooldown(delivery, card, yearOf(delivery) + offset)) picker.cooldownLosses++;
        if (E.isEventOnCooldown(delivery, card, yearOf(delivery) + 3)) picker.cooldownLosses++;
      }
      const repeated = draw({ ...delivery, pendingEvents: [] }, deliverySeed);
      const repeatedIds = new Set(routineCards(repeated.pendingEvents).map(card => card.id));
      for (const card of pickedRoutine) if (repeatedIds.has(card.id)) picker.cooldownLosses++;
      let waiting = delivery;
      for (let index = 0; waiting.pendingEvents[0]?.id !== id && index < 16; index++) {
        waiting = canonical(withRandom(30000 + id * 32 + index, () => E.applyEventChoice(waiting, 0, E.FALLBACK_CLUBS)));
        if (waiting.phase === 'red_card_appeal_result') waiting = canonical(E.dismissAppealResult(waiting, E.FALLBACK_CLUBS));
      }
      assert.equal(waiting.pendingEvents[0]?.id, id, 'Actual original queued cards must advance to the routine');
      const after = canonical(withRandom(40000 + id, () => E.applyEventChoice(waiting, 0, E.FALLBACK_CLUBS)));
      assert.equal(after.lastEventId, id, 'The actual queued routine must be answered after JSON reload');
      assert(after.events.length > waiting.events.length, 'The actual queued routine must retain its saved outcome');
      assert.deepEqual(after.pendingEvents.map(card => card.id), waiting.pendingEvents.slice(1).map(card => card.id));
      picker.answeredIds.push(id);
      picker.cases.push({ id, deliverySeed, input: canonical(found.state), delivery, waiting, after,
        waitingSha256: sha(JSON.stringify(waiting)), afterSha256: sha(JSON.stringify(after)) });
      retainPicker();
    }
    assert.equal(picker.duplicateKeys, 0, 'Actual routine delivery must not duplicate ledger keys');
    assert.equal(picker.cooldownLosses, 0, 'Actual routine delivery must preserve the life two-season cooldown');
    assert.deepEqual(picker.missingIds, CONTROL === 'missing' ? SCENARIOS.map((_, index) => index + 600) : [], 'Only actual integration removal may remove all routine delivery');
    assert.equal(picker.answeredIds.length, CONTROL === 'missing' ? 0 : 30);
    retainPicker();
    if (CONTROL || !process.env.SOCCER_ROUTINE_OUT) return { picker, fixtures: null };

    const scenarios = [];
    function scenario(id, initial, choices, provenance) {
      let state = canonical(initial);
      const result = { id, provenance, initial: state, initialSha256: sha(JSON.stringify(state)), steps: [] };
      for (const [index, choiceIndex] of choices.entries()) {
        const event = state.pendingEvents[0];
        assert(event && event.choices[choiceIndex], 'Prepared browser action must exist on its actual first card');
        const seed = 50000 + event.id * 4 + index;
        const expected = canonical(withRandom(seed, () => E.applyEventChoice(state, choiceIndex, E.FALLBACK_CLUBS)));
        assert.equal(expected.events.length, state.events.length + 1, 'Browser sentinel or actual batch must avoid unrelated terminal log changes');
        result.steps.push({ eventId: event.id, choiceIndex, choiceLabel: event.choices[choiceIndex].label,
          seed, expected, expectedSha256: sha(JSON.stringify(expected)), reloadAfter: true });
        state = expected;
      }
      scenarios.push(result);
    }
    const preparation = ['Synthetic player identity, position, age31, club, senior row/year/apps12, loan/captain/family fields, morale65 and popularity40.',
      'Actual initializer uses the existing supported club pool; the saved scenario context is fictional.', 'Catalog card and original sentinel4 are prepared for presentation; neither earns natural picker credit.'];
    for (const id of [600, 604, 611, 619, 625]) {
      const found = offered(id);
      assert(found, `Browser routine ${id} must exist`);
      const sentinel = withRandom(() => 0.9, () => E.getAllEvents(found.state).find(card => card.id === 4));
      scenario(`routine-${id}`, { ...found.state, phase: 'random_events', pendingEvents: [found.card, sentinel] }, [0],
        { kind: 'prepared-presentation', preparedFields: preparation, recordedInjuryPreparation: id === 625 ? { name: 'Fixture strain', weeks: 2 } : null });
    }
    const reserve = offered(615);
    assert(reserve, 'Browser reserve routine must exist');
    const oldCards = withRandom(() => 0.9, () => E.getAllEvents(reserve.state));
    scenario('humble-reserve-reload', { ...reserve.state, phase: 'random_events', pendingEvents: [oldCards.find(card => card.id === 1), reserve.card, oldCards.find(card => card.id === 4)] }, [1, 0],
      { kind: 'prepared-presentation', preparedFields: preparation, gateChange: 'The actual old humble choice changes morale65 to75; reload occurs before actual615 choice.' });

    function nextPlaying(state) {
      for (let seed = 770; seed < 802; seed++) {
        const next = withRandom(seed, () => E.advanceProSeason({ ...canonical(state), phase: 'playing', pendingEvents: [], loan: null }, E.FALLBACK_CLUBS));
        const row = next.seasons[next.seasons.length - 1];
        if (row.year === yearOf(state) + 1 && row.type === 'playing' && row.apps > 0 && !row.injurySevere && !next.retired) return { state: canonical(next), seed };
      }
      throw new Error('Fixture refused: no actual next playing season within32 fixed seeds');
    }
    for (const [acquisitionId, followupId, flag] of [[226, 227, 'esports'], [230, 231, 'cursedBoots']]) {
      const stats = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
      const base = withRandom(660, () => E.initCareer('Routine Followup Fixture', 'England', 'CM', '2020s', stats, 60, 2020, E.FALLBACK_CLUBS, null, 90));
      const realClub = E.FALLBACK_CLUBS[0];
      const prepared = canonical({ ...base, age: 23, phase: 'playing', personality: 'professor', agentId: 'self', netWorth: 10,
        currentClub: realClub.name, currentClubCountry: realClub.country, currentClubTier: realClub.tier,
        currentClubColor: realClub.color, currentLeague: realClub.league, contractYearsLeft: 4, weeklyWage: 10000,
        lifeFlags: {}, eventLastFired: {}, seriousInjuries: [], pendingEvents: [], events: [] });
      const startingSeason = nextPlaying(prepared).state;
      let acquisitionBatch = null, acquisitionSeed = null;
      for (let seed = 0; seed < 2048; seed++) {
        const candidate = draw(startingSeason, 60000 + acquisitionId * 2048 + seed);
        if (candidate.phase === 'random_events' && candidate.pendingEvents[0]?.id === acquisitionId) {
          acquisitionBatch = canonical(candidate); acquisitionSeed = 60000 + acquisitionId * 2048 + seed; break;
        }
      }
      assert(acquisitionBatch, 'The actual picker must deliver the acquisition first within2048 fixed seeds');
      const acquired = canonical(withRandom(71000 + acquisitionId, () => E.applyEventChoice(acquisitionBatch, 0, E.FALLBACK_CLUBS)));
      assert.equal(acquired.lifeFlags[flag], 1);
      assert.equal(acquired.eventLastFired[String(acquisitionId)], yearOf(acquired));
      assert(!L.getPriorityLifeEventIds(acquired).includes(followupId), 'Acquisition season must not deliver its next-season promise immediately');
      const advanced = nextPlaying(acquired), nextSeason = advanced.state;
      let pickerBatch = null, pickerSeed = null;
      for (let seed = 0; seed < 32; seed++) {
        const actual = draw(nextSeason, 72000 + followupId * 32 + seed);
        if (actual.phase === 'random_events' && actual.pendingEvents[0]?.id === followupId) {
          pickerBatch = canonical(actual); pickerSeed = 72000 + followupId * 32 + seed; break;
        }
      }
      assert(pickerBatch, 'The actual next-season followup must lead its picker batch within32 fixed seeds');
      assert.equal(nextSeason.lifeFlags[flag], 1);
      assert.equal(pickerBatch.pendingEvents[0]?.id, followupId, 'The actual next playing-season picker must deliver its priority first');
      assert.equal(pickerBatch.eventLastFired[String(followupId)], yearOf(nextSeason));
      scenario(`followup-${followupId}`, pickerBatch, [1], { kind: 'actual-picker-followup', acquired, nextSeason, pickerBatch,
        acquisitionBatch, acquisitionSeed, nextSeasonSeed: advanced.seed, pickerSeed,
        preparedFields: ['Initializer player, age23, supported club and economic context are explicit preparations.',
          'The model season input clears the remaining acquisition queue and sets playing/loan-null; this is not a complete UI career journey.',
          'Acquisition delivery/stamps, acquisition choice, next playing-season row and followup delivery/stamps use actual engine functions.'] });
    }
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(head.status, 0, 'Fixture source HEAD must resolve');
    const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock: new RealDate(now).toISOString(),
      source: { head: head.stdout.trim(), engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)),
        routineSha256: sha(sources.get(ROUTINE)), testSha256: sha(sources.get(path.join(ROOT, FILES[0]))),
        simSha256: sha(sources.get(fileURLToPath(import.meta.url))), momentsSha256: sha(sources.get(MOMENTS)),
        sharedMomentsSha256: sha(sources.get(MOMENT_HELPER)), saveSha256: sha(sources.get(SAVE)) }, scenarios };
    assert.equal(scenarios.length, 8);
    const output = path.join(path.resolve(process.env.SOCCER_ROUTINE_OUT), 'browser-fixtures.json');
    const bytes = JSON.stringify(fixtures, null, 2) + '\n';
    if (fs.existsSync(output)) assert.equal(fs.readFileSync(output, 'utf8'), bytes, 'A repeat normal proof must preserve the original browser fixtures');
    else fs.writeFileSync(output, bytes);
    return { picker, fixtures: { file: output, sha256: sha(bytes), scenarios: scenarios.length } };
  } finally {
    globalThis.Date = RealDate;
    if (storageBefore === undefined) delete globalThis.localStorage; else globalThis.localStorage = storageBefore;
  }
}

try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.SOCCER_ROUTINE_ENGINE;
  delete env.SOCCER_ROUTINE_LIFE;
  function rewrite(file, anchor, replacement) {
    const source = sources.get(file);
    assert.equal(source.split(anchor).length - 1, 1, 'One unique actual source anchor is required');
    changedFile = file;
    changedSource = source.replace(anchor, replacement);
    assert.notEqual(changedSource, source, 'The source control must change actual code');
    anchors.push(anchor);
    if (retained) fs.writeFileSync(path.join(retained, path.basename(file) + '.control'), changedSource);
  }
  if (CONTROL === 'missing') rewrite(LIFE, '...getSoccerRoutineEvents(state)', '');
  if (CONTROL === 'priority') rewrite(LIFE, '  return ids;\n}', '  return ids.filter(id => id !== 227 && id !== 231);\n}');
  if (CONTROL === 'effect') {
    assert(sources.has(ROUTINE), 'Effect control requires the actual new routine module');
    rewrite(ROUTINE, 'export function getSoccerRoutineEvents(', 'function getSoccerRoutineEventsOriginal(');
    changedSource += `
export function getSoccerRoutineEvents(state: Parameters<typeof getSoccerRoutineEventsOriginal>[0]) {
  const cards = getSoccerRoutineEventsOriginal(state);
  const card = cards.find(event => event.id === 600);
  if (card) {
    const apply = card.choices[1].apply;
    card.choices[1].apply = before => {
      const morale = before.morale;
      const after = apply(before);
      after.morale = morale;
      return after;
    };
  }
  return cards;
}
`;
    if (retained) fs.writeFileSync(path.join(retained, path.basename(ROUTINE) + '.control'), changedSource);
  }
  if (!EXPECT_RED) {
    assert(sources.has(ROUTINE), 'Fixed proof requires the actual routine module');
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: { engine: ENGINE, life: LIFE, moments: MOMENTS, save: SAVE }, outdir: tmp, outExtension: { '.js': '.mjs' },
      bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
      plugins: [{ name: 'soccer-routine-actual-source', setup(build) {
        if (!changedFile) return;
        build.onLoad({ filter: /\.ts$/ }, args => {
          if (path.resolve(args.path) !== changedFile) return undefined;
          return { contents: changedSource, loader: 'ts', resolveDir: path.dirname(changedFile) };
        });
      } }],
    });
    env.SOCCER_ROUTINE_ENGINE = path.join(tmp, 'engine.mjs').replaceAll('\\', '/');
    env.SOCCER_ROUTINE_LIFE = path.join(tmp, 'life.mjs').replaceAll('\\', '/');
    if (retained) {
      for (const entry of ['engine', 'life', 'moments', 'save']) fs.copyFileSync(path.join(tmp, `${entry}.mjs`), path.join(retained, `${entry}.mjs`));
    }
  }
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  const reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Install locked dependencies remotely first');
  const result = spawnSync(process.execPath, [runner, 'run', ...FILES, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
    cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024, timeout: 180000,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  const receipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  if (retained) {
    fs.writeFileSync(path.join(retained, 'output.log'), output);
    if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
    fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, files: FILES, sourceReceipts: receipts,
      exitCode: result.status, processError: result.error?.message || null, controlAnchors: anchors,
      changedFile: changedFile === null ? null : path.relative(ROOT, changedFile).replaceAll('\\', '/'),
      changedSourceSha256: changedSource === null ? null : sha(changedSource),
    }, null, 2) + '\n');
  }
  assert(!result.error && result.status !== null, 'The actual unit process must finish within its bound');
  assert(!SETUP_ERROR.test(output), 'Setup or unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'The actual unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 2, 'Both owned physical unit files must run');
  assert.deepEqual(report.testResults.map(file => {
    assert(!file.message, 'Each actual test file must load without a file error');
    const name = file.name.replaceAll('\\', '/');
    const owned = FILES.find(relative => name.endsWith('/' + relative));
    assert(owned, 'No other test file may earn proof credit');
    return owned;
  }).sort(), [...FILES].sort());
  const cases = report.testResults.flatMap(file => file.assertionResults);
  const followups = cases.filter(test => test.title.startsWith('followup '));
  assert.deepEqual(followups.map(test => test.title).sort(), [...FOLLOWUP_OWNED, ...FOLLOWUP_PRESERVED].sort());
  const routine = cases.filter(test => test.title.startsWith('routine '));
  assert.deepEqual(routine.map(test => test.title).sort(), [...ROUTINE_OWNED, ...ROUTINE_PRESERVED].sort(), 'Every exact routine outcome must run');
  assert.equal(routine.length, 44, 'All 44 exact routine outcomes must run');
  assert.equal(cases.length, 53, 'All 53 owned unit outcomes must run');
  assert.equal(report.numPendingTests, 0, 'No pending outcome may earn proof credit');
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'No skipped or todo outcome may earn proof credit');
  const routineOwned = routine.filter(test => test.title.startsWith('routine missing:'));
  const routinePreserved = routine.filter(test => test.title.startsWith('routine preservation:'));
  assert.equal(routineOwned.length, 38);
  assert.equal(routinePreserved.length, 6);
  assert([...routinePreserved, ...followups.filter(test => FOLLOWUP_PRESERVED.includes(test.title))].every(test => test.status === 'passed'), 'All 13 preservation outcomes must pass');
  const expectedFailures = EXPECT_RED ? [...ROUTINE_OWNED, ...FOLLOWUP_OWNED]
    : CONTROL === 'missing' ? ROUTINE_OWNED
      : CONTROL === 'priority' ? FOLLOWUP_OWNED
        : CONTROL === 'effect' ? [ROUTINE_OWNED[0]] : [];
  const failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expectedFailures].sort(), 'Only intended source-caused outcome assertions may fail');
  for (const test of failed) {
    const id = FOLLOWUP_OWNED.indexOf(test.title);
    const cause = CONTROL === 'effect' ? /^AssertionError: expected 65 to be 67/
      : id >= 0 ? new RegExp(`^AssertionError: expected \\[\\] to include ${id === 0 ? 227 : 231}`)
      : /^AssertionError:.*to have a length of 1 but got \+0/s;
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every intended failure must match its actual missing-feature assertion');
  }
  assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, 53 - expectedFailures.length);
  assert.equal(result.status, expectedFailures.length ? 1 : 0, 'The actual runner exit must agree with its causal report');
  const played = EXPECT_RED ? null : await actualPickerAndFixtures(tmp);
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source must stay held');
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; ${anchors.length} unique anchor changed; changed sha256=${sha(changedSource)}.`);
  console.log(`Actual physical unit files: ${report.testResults.length}; ${cases.length} exact completed outcomes.`);
  console.log(`Routine outcomes: ${routineOwned.length} owned; ${routinePreserved.length} preservation; ${routine.filter(test => test.status === 'passed').length} passed.`);
  console.log(`Promised followups: ${FOLLOWUP_OWNED.map(title => `${title}=${followups.find(test => test.title === title).status}`).join('; ')}; 7 preservation passes.`);
  console.log(`Actual causal totals: ${failed.length} intended failures; ${report.numPassedTests} passes; pending 0; runner exit ${result.status}.`);
  console.log(`Source receipts held: ${receipts.length}; file errors empty; raw setup and unhandled markers absent.`);
  if (played) console.log(`Actual bounded picker: ${played.picker.attempts} attempts; ${played.picker.queuedIds.length}/30 queued; ${played.picker.answeredIds.length}/30 answered; ${played.picker.duplicateKeys} duplicate keys; ${played.picker.cooldownLosses} cooldown losses.`);
  if (played?.fixtures) console.log(`Normal-only browser fixtures: ${played.fixtures.scenarios} complete scenarios; sha256=${played.fixtures.sha256}; ${played.fixtures.file}.`);
  console.log(`simSoccerCareerRoutineEvents ${EXPECT_RED ? 'expected baseline red' : CONTROL ? 'control ' + CONTROL : 'normal'}: green. All exact outcome and source guards passed.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
