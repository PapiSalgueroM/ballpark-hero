/* Remote-only saved morale decisions. Raw outcomes, actual copied source and
   complete picker provenance are retained before any expected fault qualifies. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Pending morale proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerCareerPendingMorale.test.ts', PARENT = '7a0ae6ba2523719e854a054fec72b27673557982';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), CONTRACTS = path.join(ROOT, 'src/lib/soccerCareerContracts.ts');
const CAPTIONS = path.join(ROOT, 'src/lib/soccerCareerLifeConsequences.ts'), ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const BROWSER = path.join(ROOT, 'scripts/playSoccerCareerPendingMorale.mjs');
const WORKFLOW = path.join(ROOT, '.github/workflows/soccer-career-pending-morale.yml');
const CONTROL = process.env.SC_PENDING_MORALE_CONTROL || '', RED = process.env.SC_PENDING_MORALE_EXPECT_RED === '1';
const PHASE = process.env.CAREER_MORALE_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match the actual baseline or fixed arm');
assert(['', 'pending', 'preview', 'legacy'].includes(CONTROL), 'Unknown or combined actual-source control');
assert(!(RED && CONTROL), 'Baseline and fixed-source controls are separate');
const NAMES = [
  'pending morale missing: JSON222 choice0 resolves after223 choice0',
  'pending morale missing: JSON222 choice1 resolves after223 choice0',
  'pending morale missing: JSON222 choice0 resolves after223 choice1',
  'pending morale missing: JSON222 choice1 resolves after223 choice1',
  'morale preview missing: 221 choice0 shows the actual effect',
  'morale preview missing: 222 choice1 shows the actual effect',
  'morale preview missing: 223 choice1 shows the actual effect',
  'pending morale preservation: fresh222 is offered at morale60',
  'pending morale preservation: fresh222 stays absent at morale61',
  'pending morale preservation: fresh222 stays absent at morale100',
  'pending morale preservation: live222 choice0 resolves after223 choice0',
  'pending morale preservation: live222 choice1 resolves after223 choice0',
  'pending morale preservation: live222 choice0 resolves after223 choice1',
  'pending morale preservation: live222 choice1 resolves after223 choice1',
  'pending morale preservation: loaded222 choice0 keeps its original low-morale effect',
  'pending morale preservation: loaded222 choice1 keeps its original low-morale effect',
  'pending morale preservation: precursor223 choice0 has its exact saved effect',
  'pending morale preservation: precursor223 choice1 has its exact saved effect',
  'pending morale preservation: pending JSON repair keeps the unplayed queue and stamps',
  'pending morale preservation: resolved JSON repair keeps the answer once and preserves continuation',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [ENGINE, LIFE, SAVE, CONTRACTS, CAPTIONS, ROUTINE, SELF, path.join(ROOT, TEST), BROWSER, WORKFLOW];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.CAREER_MORALE_OUT ? path.resolve(process.env.CAREER_MORALE_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-pending-morale-'));
const arm = CONTROL || PHASE, retained = path.join(OUT, arm);
fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace an existing source arm');
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-pending-morale-'));
const changed = new Map(sources), anchors = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Source Git receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim(), parentLife = git(['show', `${PARENT}:src/lib/soccerCareerLife.ts`]);
const parentCaptions = git(['show', `${PARENT}:src/lib/soccerCareerLifeConsequences.ts`]);
fs.writeFileSync(path.join(retained, 'soccerCareerLife.parent.ts'), parentLife);
fs.writeFileSync(path.join(retained, 'soccerCareerLifeConsequences.parent.ts'), parentCaptions);
const parentAppHashes = [ENGINE, LIFE, SAVE, CONTRACTS, CAPTIONS, ROUTINE].map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  const row = { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
  if (RED || (file !== LIFE && file !== CAPTIONS)) assert.equal(row.candidateSha256, row.parentSha256, 'Only fixed Life and captions may differ from held parent app');
  return row;
});
function replace(file, anchor, replacement, kind) {
  const before = changed.get(file); assert.equal(before.split(anchor).length - 1, 1, 'Exactly one actual executable anchor must exist');
  const after = before.replace(anchor, replacement); assert.notEqual(after, before, 'Actual copied-source edit must be effective');
  changed.set(file, after); anchors.push({ kind, file: path.relative(ROOT, file).replaceAll('\\', '/'), anchor,
    replacement, beforeSha256: sha(before), afterSha256: sha(after) });
}
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT,
    parentAppHashes, parentLifeSha256: sha(parentLife), parentCaptionsSha256: sha(parentCaptions), sourceReceipts, actualSourceEdits: anchors, ...outcome }, null, 2) + '\n');
  return sourceReceipts;
}
function seeded(seed) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}
function random(input, action) {
  const previous = Math.random, draws = [];
  Math.random = () => { const value = typeof input === 'number' ? input : input(); draws.push(value); return value; };
  try { return { result: action(), draws }; } finally { Math.random = previous; }
}
async function browserFixtures() {
  const RealDate = Date, previousStorage = globalThis.localStorage, clock = '2026-10-13T16:00:00Z', now = RealDate.parse(clock), storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key), clear: () => storage.clear(), key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size; } };
  globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(now); } static now() { return now; } };
  try {
    const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href);
    const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href), C = await import(pathToFileURL(path.join(tmp, 'contracts.mjs')).href);
    const oldLife = await import(pathToFileURL(path.join(tmp, 'parent-life.mjs')).href), copy = value => JSON.parse(JSON.stringify(value));
    const year = state => E.eventSeasonIndex(state), clamp = value => Math.max(0, Math.min(100, value));
    const progress = { status: 'acquiring', acquisitions: [], scenarios: [] };
    const saveProgress = () => fs.writeFileSync(path.join(retained, 'fixture-progress.json'), JSON.stringify(progress, null, 2) + '\n');
    saveProgress();
    function canonical(state) { const loaded = E.repairCareer(copy(state));
      assert(S.isSoccerCareerSave(loaded), 'Complete fixture must pass actual route save validation'); return copy(loaded); }
    const current = {
      '221:0': 'Followers +1M, Popularity +4, the people love a bad singer',
      '222:0': 'Legendary commitment: Morale +6, Physical -1 next season',
      '222:1': 'Morale -5, Followers +300k, the story becomes a documentary punchline',
      '223:0': 'Your playlist unites the squad: Morale +6',
      '223:1': 'Diplomacy: Morale +3, Integrity +1, whales on Wednesdays',
    };
    const legacyKeys = new Set(['221:0', '222:1', '223:1']);
    function prepared(name, trial, seed) {
      const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
      const base = random(seeded(seed), () => E.initCareer(`Pending Morale ${name} Trial ${trial}`, 'England', 'CM', '2020s',
        stats, 70, 2020, E.FALLBACK_CLUBS, null, 90)).result, club = E.FALLBACK_CLUBS[0];
      return canonical({ ...base, age: 23, phase: 'social_media_action', retired: false, personality: 'professor', agentId: 'self',
        currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
        currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 60,
        popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
        seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
          type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
        lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [], socialMediaActionUsedThisSeason: true,
        statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional saved morale context'] });
    }
    function acquire(name, firstIds, salt) {
      const search = { name, firstIds, maxTrials: 16384, seedBase: 135600000 + salt * 16384, attempted: 0, acquired: null };
      progress.acquisitions.push(search);
      for (let trial = 0; trial < 16384; trial++) {
        const seed = 135600000 + salt * 16384 + trial, context = prepared(name, trial, seed), held = JSON.stringify(context);
        const picked = random(seeded(seed), () => E.dismissSocialMediaPhase(context, E.FALLBACK_CLUBS)), batch = canonical(picked.result);
        search.attempted = trial + 1;
        assert.equal(JSON.stringify(context), held, 'Actual picker must hold its context input');
        if (batch.phase === 'random_events' && batch.pendingEvents.length > firstIds.length &&
          firstIds.every((id, index) => batch.pendingEvents[index]?.id === id)) {
          assert.equal(new Set(batch.pendingEvents.map(card => E.eventLedgerKey(card))).size, batch.pendingEvents.length);
          for (const card of batch.pendingEvents) assert.equal(batch.eventLastFired[E.eventLedgerKey(card)], year(batch));
          search.acquired = { context, batch, trial, seed, draws: picked.draws, batchSha256: sha(JSON.stringify(batch)) };
          saveProgress(); return search.acquired;
        }
        if (trial === 16383) search.lastAttempt = { context, batch, trial, seed, draws: picked.draws };
      }
      saveProgress();
      assert.fail(`Actual ${name} picker must deliver [${firstIds.join(',')}] with a nonterminal continuation within 16384 disclosed identity and seed trials`);
    }
    const chain = acquire('223-then-222', [223, 222], 1), karaoke = acquire('221-preview', [221], 2), aux = acquire('223-preview', [223], 3);
    const specs = [
      { id: '223-choice0-222-choice0', acquired: chain, actions: [[223, 0], [222, 0]] },
      { id: '223-choice0-222-choice1', acquired: chain, actions: [[223, 0], [222, 1]] },
      { id: '223-choice1-222-choice0', acquired: chain, actions: [[223, 1], [222, 0]] },
      { id: '223-choice1-222-choice1', acquired: chain, actions: [[223, 1], [222, 1]] },
      { id: '221-choice0', acquired: karaoke, actions: [[221, 0]] },
      { id: '223-choice1', acquired: aux, actions: [[223, 1]] },
    ];
    const scenarios = [], deliveries = [], parentCompiledSha256 = sha(fs.readFileSync(path.join(tmp, 'parent-life.mjs')));
    for (const spec of specs) {
      const actualPickerBatch = spec.acquired.batch, batchBytes = JSON.stringify(actualPickerBatch), initial = copy(actualPickerBatch), overlays = [];
      const parentCatalog = random(0.99, () => oldLife.getLifeEvents(copy(actualPickerBatch))).result;
      for (const [eventId, choiceIndex] of spec.actions) {
        if (!legacyKeys.has(`${eventId}:${choiceIndex}`)) continue;
        const pendingIndex = initial.pendingEvents.findIndex(card => card.id === eventId);
        const parentCard = parentCatalog.filter(card => card.id === eventId);
        assert.equal(parentCard.length, 1, 'Actual parent factory must resolve the selected old caption');
        const savedConsequence = parentCard[0].choices[choiceIndex].consequence;
        assert.notEqual(savedConsequence, current[`${eventId}:${choiceIndex}`], 'Old caption overlay must expose a real stale preview');
        assert(pendingIndex >= 0, 'Old caption overlay must target an actual picked card');
        initial.pendingEvents[pendingIndex].choices[choiceIndex].consequence = savedConsequence;
        overlays.push({ eventId, choiceIndex, path: `pendingEvents[${pendingIndex}].choices[${choiceIndex}].consequence`, savedConsequence,
          parentLifeSha256: sha(parentLife), parentCaptionsSha256: sha(parentCaptions), parentLifeCompiledSha256: parentCompiledSha256 });
      }
      assert.equal(JSON.stringify(canonical(initial)), JSON.stringify(initial), 'Old caption bytes must survive actual save reload');
      let before = canonical(initial); const steps = [];
      const progressScenario = { id: spec.id, initial, overlays, steps: [] }; progress.scenarios.push(progressScenario); saveProgress();
      for (const [eventId, choiceIndex] of spec.actions) {
        assert.equal(before.pendingEvents[0]?.id, eventId, 'Actual picked order must lead the selected answer');
        const held = JSON.stringify(before), read = random(0.99, () => E.getAllEvents(before)), caption = current[`${eventId}:${choiceIndex}`];
        assert(read.result.some(card => card.id === eventId), 'Actual loaded catalog must retain the delivered card');
        assert.equal(JSON.stringify(before), held, 'Actual catalog read must hold saved input');
        assert.equal(C.soccerEventChoiceConsequence(before, eventId, choiceIndex, before.pendingEvents[0].choices[choiceIndex].consequence), caption,
          'Actual renderer must show the independent current caption');
        let ordinal = 0; const values = [...read.draws];
        const resolved = random(() => { assert(ordinal < values.length, 'Actual resolver cannot consume an unlisted draw'); return values[ordinal++]; },
          () => E.applyEventChoice(canonical(before), choiceIndex, E.FALLBACK_CLUBS));
        assert.deepEqual(resolved.draws, values, 'Actual deterministic choice consumes the original complete catalog vector only');
        assert.equal(JSON.stringify(before), held, 'Actual resolver must hold the previous save input');
        const expected = canonical(resolved.result), literal = copy(before); let line;
        if (eventId === 221) { literal.socialMediaFollowers = Math.round((literal.socialMediaFollowers + 1) * 100) / 100;
          literal.popularity = clamp(literal.popularity + 4); line = '🎶 Posted your own karaoke disaster. Instant classic'; }
        else if (eventId === 223) { literal.morale = clamp(literal.morale + (choiceIndex === 0 ? 6 : 3));
          if (choiceIndex === 1) literal.integrityBonus += 1;
          line = choiceIndex === 0 ? '🎧 Won the aux cord war. The whale era is over' : '📋 Negotiated the aux schedule. Whales on Wednesdays only'; }
        else if (choiceIndex === 0) { literal.morale = clamp(literal.morale + 6);
          literal.statBoostNextSeason = { ...literal.statBoostNextSeason, physical: (literal.statBoostNextSeason.physical || 0) - 1 };
          line = '🚗 Drove nine hours overnight and still made kickoff'; }
        else { literal.morale = clamp(literal.morale - 5); literal.socialMediaFollowers = Math.round((literal.socialMediaFollowers + 0.3) * 100) / 100;
          line = '🛫 Missed a match by boarding the wrong plane. Iconic, unfortunately'; }
        literal.lastEventId = eventId; literal.pendingEvents = literal.pendingEvents.slice(1); literal.phase = 'random_events';
        literal.events = [...literal.events, line]; literal.overall = E.calcOverall(literal, literal.position);
        progressScenario.steps.push({ eventId, choiceIndex, input: before, draws: resolved.draws, current: expected, literal }); saveProgress();
        assert.deepEqual(expected, literal, 'Whole answered save must match independent literal changes and hold every unrelated field');
        assert.equal(expected.eventLastFired[String(eventId)], year(initial));
        assert.equal(JSON.stringify(canonical(expected)), JSON.stringify(expected), 'Whole answered state must survive actual save reload');
        steps.push({ eventId, choiceIndex, choiceLabel: before.pendingEvents[0].choices[choiceIndex].label, currentConsequence: caption,
          resolve: { mode: 'vector', drawCount: values.length, draws: values }, expected, expectedSha256: sha(JSON.stringify(expected)), reloadAfter: true });
        before = expected;
      }
      deliveries.push({ scenarioId: spec.id, trial: spec.acquired.trial, playerName: initial.playerName, seed: spec.acquired.seed,
        pickerDrawCount: spec.acquired.draws.length, resolverDrawCounts: steps.map(step => step.resolve.drawCount),
        queue: initial.pendingEvents.map(card => card.id), actualPickerBatchSha256: sha(batchBytes), answers: steps.length });
      scenarios.push({ id: spec.id, initial, initialSha256: sha(JSON.stringify(initial)), provenance: {
        kind: 'actual-picker-legacy-caption-overlay', preparedFields: [
          'Fictional identity varies per trial; age23, supported club, senior row/year/apps24, money, morale60, other meters and persona/agent are prepared context.',
          'Social-media-used prepares the existing actual picker entry. This is not a complete played career.',
          'The actual picker supplies every card, stamp and order. No queue reorder, extra sentinel or prepared fallback is added.',
          'Only selected saved captions are overlaid from the actual held parent factory. Labels, effects and all other picked fields stay held.',
          'Original high rejecting catalog values are recorded resolver inputs. These deterministic choices have no added effect draw.',
        ], context: spec.acquired.context, actualPickerBatch, actualPickerBatchSha256: sha(batchBytes), trial: spec.acquired.trial,
        playerName: initial.playerName, pickerSeed: spec.acquired.seed, pickerDrawCount: spec.acquired.draws.length,
        pickerDraws: spec.acquired.draws, legacyCaptions: overlays }, steps });
      assert.equal(JSON.stringify(actualPickerBatch), batchBytes, 'Actual picker batch cannot be changed by overlays or answers');
    }
    const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock, source: { head: sourceHead, parentAppRef: PARENT,
      engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)), routineSha256: sha(sources.get(ROUTINE)),
      testSha256: sha(sources.get(path.join(ROOT, TEST))), simSha256: sha(sources.get(SELF)), contractsSha256: sha(sources.get(CONTRACTS)),
      consequencesSha256: sha(sources.get(CAPTIONS)), saveSha256: sha(sources.get(SAVE)), parentLifeSha256: sha(parentLife),
      parentCaptionsSha256: sha(parentCaptions), parentLifeCompiledSha256: parentCompiledSha256,
      parentLifeSourcePath: 'fixed/soccerCareerLife.parent.ts', parentCaptionsSourcePath: 'fixed/soccerCareerLifeConsequences.parent.ts',
      parentLifeCompiledPath: 'fixed/parent-life.mjs' }, scenarios };
    const bytes = JSON.stringify(fixtures, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    assert(!fs.existsSync(file), 'Refuse to replace existing browser fixtures'); fs.writeFileSync(file, bytes);
    fs.writeFileSync(path.join(retained, 'delivery.json'), JSON.stringify(deliveries, null, 2) + '\n');
    progress.status = 'complete'; saveProgress();
    return { file, sha256: sha(bytes), deliveries };
  } finally { globalThis.Date = RealDate; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage; }
}

try {
  if (CONTROL === 'pending') replace(LIFE,
    'if (state.pendingEvents.some(event => event.id === 222) || state.morale <= 60) {', 'if (state.morale <= 60) {', CONTROL);
  if (CONTROL === 'preview') replace(CAPTIONS, 'Followers +1M, Popularity +4, the people love a bad singer',
    'Followers +1M, the people love a bad singer', CONTROL);
  if (CONTROL === 'legacy') replace(CONTRACTS,
    '  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved;',
    '  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : saved;', CONTROL);
  assert.equal(anchors.length, CONTROL ? 1 : 0, 'Only a selected control may edit exactly one copied source');
  if (CONTROL) { const fault = anchors[0]; fs.writeFileSync(path.join(retained, path.basename(fault.file) + '.control'), changed.get(path.join(ROOT, fault.file))); }
  receipt();
  const esbuild = await import('esbuild'), parentEntry = path.join(tmp, 'soccerCareerLife.parent.ts'), parentCaptionEntry = path.join(tmp, 'soccerCareerLifeConsequences.parent.ts');
  fs.writeFileSync(parentEntry, parentLife); fs.writeFileSync(parentCaptionEntry, parentCaptions);
  await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, save: SAVE, contracts: CONTRACTS, 'parent-life': parentEntry }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'pending-morale-actual-source', setup(build) {
      build.onResolve({ filter: /^\.\/soccerCareerLifeConsequences$/ }, args => path.resolve(args.importer) === parentEntry ? { path: parentCaptionEntry } : undefined);
      build.onLoad({ filter: /\.ts$/ }, args => {
        if (path.resolve(args.path) === parentEntry) return { contents: parentLife, loader: 'ts', resolveDir: path.dirname(LIFE) };
        if (path.resolve(args.path) === parentCaptionEntry) return { contents: parentCaptions, loader: 'ts', resolveDir: path.dirname(CAPTIONS) };
        const contents = changed.get(path.resolve(args.path));
        return contents !== undefined && contents !== sources.get(path.resolve(args.path)) ? { contents, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
      }); } }] });
  const compiled = ['engine.mjs', 'life.mjs', 'save.mjs', 'contracts.mjs', 'parent-life.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const [key, file] of [['SC_MORALE_ENGINE', 'engine.mjs'], ['SC_MORALE_LIFE', 'life.mjs'], ['SC_MORALE_SAVE', 'save.mjs'], ['SC_MORALE_CONTRACTS', 'contracts.mjs']])
    env[key] = path.join(tmp, file).replaceAll('\\', '/');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Locked remote dependencies must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  const receipts = receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'Actual unit runner must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'Complete physical unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact unit file must load without file errors');
  const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort(), 'All twenty exact cases must complete');
  assert.equal(report.numTotalTests, 20); assert.equal(report.numPendingTests, 0);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped and todo cases cannot earn credit');
  const indices = RED ? [0, 1, 2, 3, 4, 5, 6] : CONTROL === 'pending' ? [0, 1, 2, 3]
    : CONTROL === 'preview' ? [4] : CONTROL === 'legacy' ? [4, 5, 6] : [];
  const failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), indices.map(index => NAMES[index]).sort(), 'Only exact intended failures may qualify');
  for (const test of failed) {
    const index = NAMES.indexOf(test.title), message = index < 4 ? 'pending morale saved choice lost its actual effect'
      : CONTROL === 'legacy' ? 'legacy saved Life morale preview still omits an actual effect clause' : 'current Life morale preview omits an actual effect clause';
    const cause = new RegExp(`^AssertionError:.*${message}.*expected false to be true`, 's');
    assert(test.failureMessages.length > 0 && test.failureMessages.every(value => cause.test(value)), 'Every expected failure must have its exact Boolean causal assertion');
  }
  assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 20 - indices.length);
  assert.equal(result.status, indices.length ? 1 : 0, 'Actual child exit must match exact completed outcomes');
  const fixtures = !RED && !CONTROL ? await browserFixtures() : null;
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof bytes must stay held');
  receipt({ fixtures: fixtures ? { file: path.relative(OUT, fixtures.file), sha256: fixtures.sha256, actualPickerScenarios: fixtures.deliveries.length,
    actualPickerBatches: 3, actualAnswers: fixtures.deliveries.reduce((sum, row) => sum + row.answers, 0) } : null });
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; one unique copied fault; changed sha256=${anchors[0].afterSha256}.`);
  console.log(`Actual physical unit files: 1; ${cases.length} exact completed outcomes.`);
  console.log(`Actual unit outcomes: ${report.numPassedTests} passed; ${failed.length} exact intended faults; pending 0.`);
  console.log(`Pending morale and previews: all ${NAMES.length} literal names completed; child exit ${result.status}; file message empty.`);
  console.log(`Actual app source copies: no normal or baseline mutation; ${compiled.length} compiled leaves retained.`);
  console.log(`Source receipts held: ${receipts.length}; ${parentAppHashes.length} parent bindings; complete raw JSON/log and actual source copies retained; setup markers absent.`);
  if (fixtures) console.log(`Actual picker fixtures: ${fixtures.deliveries.length}/6 scenarios; 3 natural batches; 10 actual answers; disclosed old-caption overlays; sha256=${fixtures.sha256}.`);
  console.log(`simSoccerCareerPendingMorale ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green. Exact source and outcome guards passed.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
