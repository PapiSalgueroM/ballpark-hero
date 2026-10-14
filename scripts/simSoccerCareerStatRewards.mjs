/* Remote-only actual saved rewards. Raw outcomes and copied-source checkpoints
   are retained before expected failures or source controls can earn credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Stat reward proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerCareerStatRewards.test.ts', PARENT = 'ee135646dd2344b90057140116aa15e804a7d9c3';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), CONTRACTS = path.join(ROOT, 'src/lib/soccerCareerContracts.ts');
const CAPTIONS = path.join(ROOT, 'src/lib/soccerCareerLifeConsequences.ts'), ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const WHEEL = path.join(ROOT, 'src/lib/careerChanceWheel.ts'), MOMENTS = path.join(ROOT, 'src/components/soccer-career/careerMoments.ts');
const SHARED = path.join(ROOT, 'src/components/career-moments/useCareerMoment.ts');
const CONTROL = process.env.SC_LIFE_REWARDS_CONTROL || '', RED = process.env.SC_LIFE_REWARDS_EXPECT_RED === '1';
const PHASE = process.env.CAREER_REWARDS_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match the actual baseline or normal arm');
assert(['', 'overwrite', 'preview', 'legacy'].includes(CONTROL), 'Unknown or combined actual-source control');
assert(!(RED && CONTROL), 'Baseline and fixed-source controls are separate');
const NAMES = [
  'stat rewards missing: positive queued bonuses survive the actual hit',
  'stat rewards missing: negative queued bonuses survive the actual hit',
  'stat rewards missing: zero and absent queued bonuses survive the actual hit',
  'stat rewards preservation: positive queued bonuses survive the actual miss',
  'stat rewards preservation: negative queued bonuses survive the actual miss',
  'stat rewards preservation: zero and absent queued bonuses survive the actual miss',
  'stat rewards preservation: leaving holds every queued bonus',
  'stat rewards preservation: a wrong personality still skips the saved card',
  'stat rewards preservation: the original lookup and single wheel draw stay intact',
  'stat rewards missing: earned bonuses reach the actual next-season boundary once',
  'stat rewards preservation: loaded choice inputs remain immutable',
  'stat rewards preservation: original prerequisite offer and cooldown remain intact',
  'stat preview missing: 205 choice0 shows the actual effect',
  'stat preview missing: 205 choice1 shows the actual effect',
  'stat preview missing: 211 choice1 shows the actual effect',
  'stat preview missing: 213 choice0 shows the actual effect',
  'stat preview missing: 214 choice1 shows the actual effect',
  'stat preview missing: 215 choice1 shows the actual effect',
  'stat preview missing: 217 choice0 shows the actual effect',
  'stat preview missing: 218 choice0 shows the actual effect',
  'stat preview missing: 219 choice0 shows the actual effect',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [ENGINE, LIFE, SAVE, CONTRACTS, ROUTINE, WHEEL, MOMENTS, SHARED, SELF, path.join(ROOT, TEST)];
if (!RED) { assert(fs.existsSync(CAPTIONS), 'Fixed caption module must exist'); files.push(CAPTIONS); }
else assert(!fs.existsSync(CAPTIONS), 'Baseline product caption module must remain absent');
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.CAREER_REWARDS_OUT ? path.resolve(process.env.CAREER_REWARDS_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-stat-rewards-'));
const arm = CONTROL || PHASE, retained = path.join(OUT, arm);
fs.mkdirSync(retained, { recursive: true });
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-stat-rewards-'));
const changed = new Map(sources), anchors = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Source Git receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim(), parentLife = git(['show', `${PARENT}:src/lib/soccerCareerLife.ts`]);
fs.writeFileSync(path.join(retained, 'soccerCareerLife.parent.ts'), parentLife);
const parentAppHashes = files.filter(file => file !== SELF && file !== path.join(ROOT, TEST) && file !== CAPTIONS).map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  const row = { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
  if (RED || (file !== LIFE && file !== CONTRACTS)) assert.equal(row.candidateSha256, row.parentSha256, 'Only fixed Life and Contracts may differ from held parent app');
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
    parentAppHashes, parentLifeSha256: sha(parentLife), sourceReceipts, actualSourceEdits: anchors, ...outcome }, null, 2) + '\n');
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
    const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href), L = await import(pathToFileURL(path.join(tmp, 'life.mjs')).href);
    const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href), C = await import(pathToFileURL(path.join(tmp, 'contracts.mjs')).href);
    const M = await import(pathToFileURL(path.join(tmp, 'moments.mjs')).href), W = await import(pathToFileURL(path.join(tmp, 'wheel.mjs')).href);
    const oldLife = await import(pathToFileURL(path.join(tmp, 'parent-life.mjs')).href), copy = value => JSON.parse(JSON.stringify(value));
    const year = state => E.eventSeasonIndex(state), clamp = n => Math.max(0, Math.min(100, n));
    function canonical(state) { const loaded = E.repairCareer(copy(state)); M.settleLoadedMoments(loaded);
      assert(S.isSoccerCareerSave(loaded), 'Complete fixture must pass actual route save validation'); return copy(loaded); }
    const specs = [
      { name: '218-hit', id: 218, choice: 0, roll: 0.1, caption: '60%: all 7 skills +1 queued for next season (normal growth and the 99 cap still apply). 40%: Pace -1 now, you mostly learned soup',
        line: '⛰️ Came back from the monastery visibly sharper. Spooky' },
      { name: '218-miss', id: 218, choice: 0, roll: 0.99, caption: '60%: all 7 skills +1 queued for next season (normal growth and the 99 cap still apply). 40%: Pace -1 now, you mostly learned soup',
        line: '⛰️ The monastery taught you inner peace and excellent soup. Pace -1' },
      { name: '205-choice0', id: 205, choice: 0, caption: 'Followers +400k, Morale -3, dressing room teases you forever',
        changes: { followers: 0.4, morale: -3 }, line: '📱 Ricky leaked your contract. The memes were incredible' },
      { name: '205-choice1', id: 205, choice: 1, caption: 'Represent yourself from now on, Morale -5, awkward family dinners',
        changes: { agentId: 'self', morale: -5 }, line: '🚪 Fired Cousin Ricky. Thanksgiving will be tense' },
      { name: '211-choice1', id: 211, choice: 1, caption: 'Integrity +4, Popularity +4, playgrounds everywhere copy you',
        changes: { integrity: 4, popularity: 4 }, line: '❤️ Kept the celebration free for every playground on earth' },
      { name: '213-choice0', id: 213, choice: 0, caption: 'Followers +500k, Popularity -2, journalists hate it',
        changes: { followers: 0.5, popularity: -2 }, line: '🎤 The all-yes interview became a meme format' },
      { name: '214-choice1', id: 214, choice: 1, caption: 'Integrity +2, Followers +300k, the stare goes viral anyway',
        changes: { integrity: 2, followers: 0.3 }, line: '🥶 The tunnel stare went viral. Scarier than shouting' },
      { name: '215-choice1', id: 215, choice: 1, caption: 'Integrity +3, Morale +3, dressing room respect',
        changes: { integrity: 3, morale: 3 }, line: '🛒 Bought the kit man a top of the line cart. All good' },
      { name: '217-choice0', id: 217, choice: 0, caption: 'Popularity +4 and Morale -3 now, the manager reads your column',
        changes: { popularity: 4, morale: -3 }, line: '✍️ Your tactics column is a hit. The gaffer underlines things in red' },
      { name: '219-choice0', id: 219, choice: 0, roll: 0.1, caption: 'Followers +800k, 50%: Popularity +6, 50%: Popularity -3',
        changes: { followers: 0.8, popularity: 6 }, line: '🦇 The cape era is beloved. Fans wear them to matches' },
    ];
    function prepared(spec, trial, seed) {
      const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
      const base = random(seeded(seed), () => E.initCareer(`Stat Reward ${spec.name} Trial ${trial}`, 'England', 'CM', '2020s',
        stats, 70, 2020, E.FALLBACK_CLUBS, null, 90)).result, club = E.FALLBACK_CLUBS[0];
      const personality = spec.id === 211 ? 'showman' : spec.id === 213 ? 'iceman' : spec.id === 214 || spec.id === 215 ? 'hothead'
        : spec.id === 217 ? 'professor' : 'enigma';
      return canonical({ ...base, age: 23, phase: 'social_media_action', retired: false, personality, agentId: spec.id === 205 ? 'cousin' : 'self',
        currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
        currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 65,
        popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
        seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
          type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
        lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [], socialMediaActionUsedThisSeason: true,
        statBoostNextSeason: { pace: 2, shooting: -3, passing: 4, physical: 2, reflexes: 3 }, events: ['Prepared fictional saved reward context'] });
    }
    const scenarios = [], deliveries = [], parentCompiledSha256 = sha(fs.readFileSync(path.join(tmp, 'parent-life.mjs')));
    for (const spec of specs) {
      let acquired = null;
      for (let trial = 0; trial < 4096; trial++) {
        const seed = 135500000 + spec.id * 8192 + (spec.roll === 0.99 ? 4096 : spec.choice * 4096) + trial;
        const context = prepared(spec, trial, seed), held = JSON.stringify(context);
        const picked = random(seeded(seed), () => E.dismissSocialMediaPhase(context, E.FALLBACK_CLUBS)), batch = canonical(picked.result);
        assert.equal(JSON.stringify(context), held, 'Actual picker must hold its context input');
        if (batch.phase === 'random_events' && batch.pendingEvents[0]?.id === spec.id && batch.pendingEvents.length > 1) {
          acquired = { context, batch, trial, seed, draws: picked.draws }; break;
        }
      }
      assert(acquired, `Actual ${spec.name} picker must lead a nonterminal batch within 4096 disclosed identity and seed trials`);
      const actualPickerBatch = acquired.batch, batchBytes = JSON.stringify(actualPickerBatch), initial = copy(actualPickerBatch);
      assert.equal(actualPickerBatch.eventLastFired[String(spec.id)], year(actualPickerBatch));
      assert.equal(new Set(actualPickerBatch.pendingEvents.map(card => E.eventLedgerKey(card))).size, actualPickerBatch.pendingEvents.length);
      const oldCards = random(0.99, () => oldLife.getLifeEvents(copy(actualPickerBatch))).result.filter(card => card.id === spec.id);
      assert.equal(oldCards.length, 1, 'Actual held parent factory must resolve the selected legacy caption');
      const savedConsequence = oldCards[0].choices[spec.choice].consequence;
      assert.notEqual(savedConsequence, spec.caption, 'Legacy caption overlay must expose a real stale preview');
      initial.pendingEvents[0].choices[spec.choice].consequence = savedConsequence;
      assert.equal(JSON.stringify(canonical(initial)), JSON.stringify(initial), 'Legacy caption bytes must survive actual route reload');
      const held = JSON.stringify(initial), read = random(0.99, () => E.getAllEvents(initial));
      assert(read.result.some(card => card.id === spec.id), 'High rejecting offer input must still resolve this actual delivered card');
      assert.equal(JSON.stringify(initial), held, 'Actual catalog read must hold saved input');
      assert.equal(C.soccerEventChoiceConsequence(initial, spec.id, spec.choice, savedConsequence), spec.caption, 'Actual renderer must show the independent current caption');
      let ordinal = 0;
      const draws = [...read.draws, ...(spec.roll === undefined ? [] : [spec.roll])];
      const resolved = random(() => { assert(ordinal < draws.length, 'Actual resolver cannot consume an unlisted draw'); return draws[ordinal++]; },
        () => E.applyEventChoice(canonical(initial), spec.choice, E.FALLBACK_CLUBS));
      assert.deepEqual(resolved.draws, draws, 'Actual choice must consume the complete recorded vector exactly');
      assert.equal(JSON.stringify(initial), held, 'Actual resolver must hold the original save input');
      const expected = canonical(resolved.result), literal = copy(initial), effect = spec.changes || {};
      if (effect.followers !== undefined) literal.socialMediaFollowers = Math.round((literal.socialMediaFollowers + effect.followers) * 100) / 100;
      if (effect.morale !== undefined) literal.morale = clamp(literal.morale + effect.morale);
      if (effect.popularity !== undefined) literal.popularity = clamp(literal.popularity + effect.popularity);
      if (effect.integrity !== undefined) literal.integrityBonus += effect.integrity;
      if (effect.agentId !== undefined) literal.agentId = effect.agentId;
      if (spec.id === 218 && spec.roll === 0.1) for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'])
        literal.statBoostNextSeason[key] = (literal.statBoostNextSeason[key] ?? 0) + 1;
      if (spec.id === 218 && spec.roll === 0.99) literal.pace = Math.max(20, Math.min(99, literal.pace - 1));
      if (spec.id === 218) literal.chanceWheel = { title: 'The Monastery Offseason', chance: 0.6, roll: spec.roll,
        hit: 'Sharper after the retreat', miss: 'Pace drops by 1', result: spec.roll < 0.6, seen: false };
      if (spec.id === 219) literal.chanceWheel = { title: 'The Cape Era', chance: 0.5, roll: 0.1,
        hit: 'The cape is loved', miss: 'The cape divides opinion', result: true, seen: false };
      literal.lastEventId = spec.id; literal.pendingEvents = literal.pendingEvents.slice(1); literal.phase = 'random_events';
      literal.events = [...literal.events, spec.line]; literal.overall = E.calcOverall(literal, literal.position);
      assert.deepEqual(expected, literal, 'Whole answered save must match independent literal changes and hold every unrelated field');
      assert.equal(expected.eventLastFired[String(spec.id)], year(initial));
      assert.equal(JSON.stringify(canonical(expected)), JSON.stringify(expected), 'Complete answered state must survive actual route reload');
      const step = { eventId: spec.id, choiceIndex: spec.choice, choiceLabel: initial.pendingEvents[0].choices[spec.choice].label,
        currentConsequence: spec.caption, resolve: { mode: 'vector', drawCount: draws.length, draws }, expected,
        expectedSha256: sha(JSON.stringify(expected)), reloadAfter: true };
      if (spec.roll !== undefined) {
        assert(W.validChanceWheel(expected.chanceWheel), 'Actual wheel receipt must be valid');
        const acknowledged = random(0.99, () => W.acknowledgeChanceWheel(canonical(expected))), postWheelExpected = canonical(acknowledged.result);
        const onlySeen = copy(expected); onlySeen.chanceWheel.seen = true;
        assert.deepEqual(acknowledged.draws, [], 'Actual wheel acknowledgement cannot draw');
        assert.deepEqual(postWheelExpected, onlySeen, 'Actual wheel acknowledgement may change only seen');
        step.postWheelExpected = postWheelExpected; step.postWheelExpectedSha256 = sha(JSON.stringify(postWheelExpected));
        step.acknowledgementDraws = acknowledged.draws;
      }
      deliveries.push({ scenarioId: spec.name, eventId: spec.id, choiceIndex: spec.choice, trial: acquired.trial,
        playerName: initial.playerName, seed: acquired.seed, pickerDrawCount: acquired.draws.length, resolverDrawCount: draws.length,
        queue: initial.pendingEvents.map(card => card.id), actualPickerBatchSha256: sha(batchBytes) });
      scenarios.push({ id: spec.name, initial, initialSha256: sha(JSON.stringify(initial)), provenance: {
        kind: 'actual-picker-legacy-caption-overlay', preparedFields: [
          'Fictional identity varies per trial; age23, supported club, senior row/year/apps24, money, meters, persona or agent and queued bonuses are prepared context.',
          'Social-media-used is prepared to enter the existing actual picker. This is not a complete played career.',
          'The actual picker supplies the complete batch, stamps and order. No reorder or sentinel is added.',
          'Only the selected saved consequence is overlaid from the actual held parent factory. All labels, effects and other saved fields stay held.',
          'The resolver receives the recorded rejecting catalog values and a real wheel roll when applicable; it is not a mocked chance result.'
        ], context: acquired.context, actualPickerBatch, actualPickerBatchSha256: sha(batchBytes), trial: acquired.trial,
        playerName: initial.playerName, pickerSeed: acquired.seed, pickerDrawCount: acquired.draws.length, pickerDraws: acquired.draws,
        legacyCaption: { eventId: spec.id, choiceIndex: spec.choice, path: `pendingEvents[0].choices[${spec.choice}].consequence`,
          savedConsequence, parentLifeSha256: sha(parentLife), parentLifeCompiledSha256: parentCompiledSha256 } }, steps: [step] });
      assert.equal(JSON.stringify(actualPickerBatch), batchBytes, 'Actual picker batch cannot be changed by its legacy overlay or answer');
    }
    const fixtures = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock, source: { head: sourceHead, parentAppRef: PARENT,
      engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)), routineSha256: sha(sources.get(ROUTINE)),
      testSha256: sha(sources.get(path.join(ROOT, TEST))), simSha256: sha(sources.get(SELF)), contractsSha256: sha(sources.get(CONTRACTS)),
      consequencesSha256: sha(sources.get(CAPTIONS)), momentsSha256: sha(sources.get(MOMENTS)), sharedMomentsSha256: sha(sources.get(SHARED)),
      saveSha256: sha(sources.get(SAVE)), chanceWheelSha256: sha(sources.get(WHEEL)), parentLifeSha256: sha(parentLife),
      parentLifeCompiledSha256: parentCompiledSha256, parentLifeSourcePath: 'fixed/soccerCareerLife.parent.ts', parentLifeCompiledPath: 'fixed/parent-life.mjs' }, scenarios };
    const bytes = JSON.stringify(fixtures, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'Normal fixtures cannot replace retained different-source fixtures');
    else fs.writeFileSync(file, bytes);
    fs.writeFileSync(path.join(retained, 'delivery.json'), JSON.stringify(deliveries, null, 2) + '\n');
    return { file, sha256: sha(bytes), deliveries };
  } finally { globalThis.Date = RealDate; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage; }
}

try {
  const reset = '  s.statBoostNextSeason = {};';
  replace(ENGINE, reset, `${reset}\n  if (Array.isArray(globalThis.__SC_REWARDS_BOUNDARIES)) globalThis.__SC_REWARDS_BOUNDARIES.push({ pace: s.pace, shooting: s.shooting, passing: s.passing, dribbling: s.dribbling, defending: s.defending, physical: s.physical, reflexes: s.reflexes, statBoostNextSeason: { ...s.statBoostNextSeason } });`, 'observer');
  fs.writeFileSync(path.join(retained, 'soccerCareerEngine.observer.ts'), changed.get(ENGINE));
  if (CONTROL === 'overwrite') replace(LIFE,
    'for (const key of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) bump(s, key, 1);',
    's.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 };', CONTROL);
  if (CONTROL === 'preview') replace(CAPTIONS, 'Followers +400k, Morale -3, dressing room teases you forever', 'Followers +400k, dressing room teases you forever', CONTROL);
  if (CONTROL === 'legacy') replace(CONTRACTS,
    '  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved;',
    '  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : saved;', CONTROL);
  if (CONTROL) { const fault = anchors.find(row => row.kind === CONTROL); assert(fault, 'Actual control must change its own unique source');
    fs.writeFileSync(path.join(retained, path.basename(fault.file) + '.control'), changed.get(path.join(ROOT, fault.file))); }
  receipt();
  const esbuild = await import('esbuild'), parentEntry = path.join(tmp, 'soccerCareerLife.parent.ts');
  fs.writeFileSync(parentEntry, parentLife);
  await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, save: SAVE, contracts: CONTRACTS, moments: MOMENTS, wheel: WHEEL, 'parent-life': parentEntry }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'stat-rewards-actual-source', setup(build) { build.onLoad({ filter: /\.ts$/ }, args => {
      if (path.resolve(args.path) === parentEntry) return { contents: parentLife, loader: 'ts', resolveDir: path.dirname(LIFE) };
      const contents = changed.get(path.resolve(args.path));
      return contents !== undefined && contents !== sources.get(path.resolve(args.path)) ? { contents, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
    }); } }] });
  const compiled = ['engine.mjs', 'life.mjs', 'save.mjs', 'contracts.mjs', 'moments.mjs', 'wheel.mjs', 'parent-life.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const [key, file] of [['SC_REWARDS_ENGINE', 'engine.mjs'], ['SC_REWARDS_LIFE', 'life.mjs'], ['SC_REWARDS_SAVE', 'save.mjs'], ['SC_REWARDS_CONTRACTS', 'contracts.mjs']])
    env[key] = path.join(tmp, file).replaceAll('\\', '/');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json');
  assert(fs.existsSync(runner), 'Locked remote dependencies must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  const receipts = receipt({ exitCode: result.status, processError: result.error?.message || null });
  assert(!result.error && result.status !== null, 'Actual unit runner must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'Complete physical unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact unit file must load without file errors');
  const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort(), 'All twenty-one exact cases must complete');
  assert.equal(report.numTotalTests, 21); assert.equal(report.numPendingTests, 0); assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped and todo cases cannot earn credit');
  const indices = RED ? [0, 1, 2, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20] : CONTROL === 'overwrite' ? [0, 1, 2, 9]
    : CONTROL === 'preview' ? [12] : CONTROL === 'legacy' ? [12, 13, 14, 15, 16, 17, 18, 19, 20] : [];
  const failed = cases.filter(test => test.status === 'failed'); assert.deepEqual(failed.map(test => test.title).sort(), indices.map(index => NAMES[index]).sort(), 'Only exact intended failures may qualify');
  for (const test of failed) {
    const index = NAMES.indexOf(test.title), message = index < 3 ? 'stat reward additive queue lost an earned delta'
      : index === 9 ? 'stat reward boundary lost the additive queued bonuses'
        : CONTROL === 'legacy' ? 'legacy saved Life preview still omits an actual effect clause' : 'current Life preview omits an actual effect clause';
    const cause = new RegExp(`^AssertionError:.*${message}.*expected false to be true`, 's');
    assert(test.failureMessages.length > 0 && test.failureMessages.every(value => cause.test(value)), 'Every expected failure must have its exact Boolean causal assertion');
  }
  assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 21 - indices.length);
  assert.equal(result.status, indices.length ? 1 : 0, 'Actual child exit must match exact completed outcomes');
  const fixtures = !RED && !CONTROL ? await browserFixtures() : null;
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof bytes must stay held');
  receipt({ fixtures: fixtures ? { file: path.relative(OUT, fixtures.file), sha256: fixtures.sha256, actualPickerDeliveries: fixtures.deliveries.length } : null });
  if (CONTROL) console.log(`Effective actual source control: ${CONTROL}; one unique fault plus read-only observer; changed sha256=${anchors.find(row => row.kind === CONTROL).afterSha256}.`);
  console.log(`Actual physical unit files: 1; ${cases.length} exact completed outcomes.`);
  console.log(`Actual unit outcomes: ${report.numPassedTests} passed; ${failed.length} exact intended faults; pending 0.`);
  console.log(`Queued rewards and previews: all ${NAMES.length} literal names completed; child exit ${result.status}; file message empty.`);
  console.log(`Read-only consumer checkpoint: one unique reset anchor; copied seven skills and cleared queue; ${compiled.length} compiled leaves retained.`);
  console.log(`Source receipts held: ${receipts.length}; ${parentAppHashes.length} parent bindings; complete raw JSON/log and actual source copies retained; setup markers absent.`);
  if (fixtures) console.log(`Actual picker deliveries: ${fixtures.deliveries.length}/10; disclosed parent-caption overlays; normal-only fixtures sha256=${fixtures.sha256}.`);
  console.log(`simSoccerCareerStatRewards ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green. Exact source and outcome guards passed.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
