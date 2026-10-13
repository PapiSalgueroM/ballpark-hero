/* Remote-only saved teammate loan proof. Prepared unit cards are separate from
   complete legal input vectors replayed through the unmodified actual picker. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Saved-loan proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerCareerSavedLoan.test.ts', PARENT = '1b383132351440d16753d67af94550608a85ba87';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const REALISM = path.join(ROOT, 'src/lib/soccerCareerRealismA.ts'), SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const CONTRACTS = path.join(ROOT, 'src/lib/soccerCareerContracts.ts'), ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const CAPTIONS = path.join(ROOT, 'src/lib/soccerCareerLifeConsequences.ts'), PAGE = path.join(ROOT, 'src/pages/SoccerCareer.tsx');
const WORKFLOW = path.join(ROOT, '.github/workflows/soccer-career-saved-loan.yml');
const BROWSER = path.join(ROOT, 'scripts/playSoccerCareerSavedLoan.mjs');
const ORIGINAL = '  if (!flag(state, "teammateLoan") && state.netWorth >= 0.5) {';
const FIXED = '  if (!flag(state, "teammateLoan") && (state.pendingEvents.some(event => event.id === 236) || state.netWorth >= 0.5)) {';
const CONTROL = process.env.SC_SAVED_LOAN_CONTROL || '', RED = process.env.SC_SAVED_LOAN_EXPECT_RED === '1';
const PHASE = process.env.CAREER_LOAN_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match the actual source arm');
assert(['', 'gate'].includes(CONTROL) && !(RED && CONTROL), 'Only one separate fixed copied-source control is allowed');
const NAMES = [
  'saved loan missing: JSON236 choice0 resolves after the actual220 voucher',
  'saved loan missing: JSON236 choice1 resolves after the actual220 voucher',
  'saved loan preservation: fresh236 keeps the original balance gate',
  'saved loan preservation: fresh236 keeps the original loan-stage gate',
  'saved loan preservation: live236 choice0 resolves after the actual220 voucher',
  'saved loan preservation: live236 choice1 resolves after the actual220 voucher',
  'saved loan preservation: JSON236 choice0 keeps its original above-threshold effect',
  'saved loan preservation: JSON236 choice1 keeps its original above-threshold effect',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const app = [ENGINE, LIFE, REALISM, SAVE, CONTRACTS, ROUTINE, CAPTIONS, PAGE];
const sources = new Map([...app, SELF, path.join(ROOT, TEST), BROWSER, WORKFLOW].map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.CAREER_LOAN_OUT ? path.resolve(process.env.CAREER_LOAN_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-saved-loan-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep), 'Evidence must stay outside the actual build');
const arm = CONTROL || PHASE, retained = path.join(OUT, arm); fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace retained saved-loan evidence');
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-saved-loan-')), changed = new Map(sources), anchors = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Actual Git source receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim(), parentLife = git(['show', `${PARENT}:src/lib/soccerCareerLife.ts`]);
fs.writeFileSync(path.join(retained, 'soccerCareerLife.parent.ts'), parentLife);
const parentBindings = app.map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  return { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file)) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT, parentBindings,
    parentLifeSha256: sha(parentLife), sourceReceipts, actualSourceEdits: anchors, ...outcome }, null, 2) + '\n');
}
function random(input, action) {
  const previous = Math.random, values = [];
  Math.random = () => {
    const value = typeof input === 'function' ? input() : typeof input === 'number' ? input : input[values.length];
    assert(value !== undefined && value >= 0 && value < 1, 'Actual source consumed an unlisted or illegal saved-loan input');
    values.push(value); return value;
  };
  try { return { result: action(), draws: values }; } finally { Math.random = previous; }
}
async function fixtures() {
  const RealDate = Date, previousStorage = globalThis.localStorage, clock = '2026-10-13T16:00:00Z', now = RealDate.parse(clock), storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key), clear: () => storage.clear(), key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size; } };
  globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(now); } static now() { return now; } };
  try {
    const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href), S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href);
    const copy = value => JSON.parse(JSON.stringify(value)), year = state => state.seasons[state.seasons.length - 1].year;
    const progress = { status: 'controlled-picker-inputs', acquisitions: [], answers: [], scenarios: [] };
    const saveProgress = () => fs.writeFileSync(path.join(retained, 'fixture-progress.json'), JSON.stringify(progress, null, 2) + '\n'); saveProgress();
    function canonical(state) {
      const held = JSON.stringify(state), run = random([], () => E.repairCareer(copy(state)));
      assert(S.isSoccerCareerSave(run.result)); assert.deepEqual(run.draws, []); assert.equal(JSON.stringify(state), held);
      assert.equal(JSON.stringify(run.result), held); return copy(run.result);
    }
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const init = random(0.9, () => E.initCareer('Saved Loan Model Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90));
    const base = init.result, club = E.FALLBACK_CLUBS[0];
    const prepared = { ...base, age: 23, phase: 'playing', retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
      contractYearsLeft: 4, weeklyWage: 10000, netWorth: 0.5, morale: 60, popularity: 60, socialMediaFollowers: 1,
      integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: { '7777': 2022 }, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional saved-loan model context'] };
    const repair = random([], () => E.repairCareer(copy(prepared)));
    progress.initialization = { prepared, initializationDraws: init.draws, repairDraws: repair.draws, state: copy(repair.result) }; saveProgress();
    assert(S.isSoccerCareerSave(repair.result)); assert.deepEqual(repair.draws, []);
    const context = canonical({ ...canonical(repair.result), phase: 'social_media_action', pendingEvents: [], socialMediaActionUsedThisSeason: true });
    const held = JSON.stringify(context);
    const original = sources.get(ENGINE), anchor = '  const shuffled = [...eligible].sort(() => Math.random() - 0.5);';
    const replacement = '  const shuffled = [...eligible].sort((a, b) => {\n    if (typeof globalThis.__SC_LOAN_PICKER_COMPARISON === "function") globalThis.__SC_LOAN_PICKER_COMPARISON(a.id, b.id);\n    return Math.random() - 0.5;\n  });';
    assert.equal(original.split(anchor).length - 1, 1); const observed = original.replace(anchor, replacement);
    assert.notEqual(observed, original); assert.equal(observed.replace(replacement, anchor), original);
    const pickerObserver = { kind: 'read-only-sort-comparisons', file: 'src/lib/soccerCareerEngine.ts', anchor, replacement,
      originalSourcePath: 'fixed/soccerCareerEngine.picker-original.ts', observedSourcePath: 'fixed/soccerCareerEngine.picker-observed.ts',
      originalSha256: sha(original), observedSha256: sha(observed), compiledPath: 'fixed/engine-picker-observed.mjs',
      plainCompiledPath: 'fixed/engine.mjs', plainCompiledSha256: sha(fs.readFileSync(path.join(tmp, 'engine.mjs'))) };
    fs.writeFileSync(path.join(retained, 'soccerCareerEngine.picker-original.ts'), original);
    fs.writeFileSync(path.join(retained, 'soccerCareerEngine.picker-observed.ts'), observed); receipt({ pickerObserver });
    const esbuild = await import('esbuild'), observedCompiled = path.join(tmp, 'engine-picker-observed.mjs');
    await esbuild.build({ entryPoints: [ENGINE], outfile: observedCompiled, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
      alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'saved-loan-read-only-picker', setup(build) {
        build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === ENGINE
          ? { contents: observed, loader: 'ts', resolveDir: path.dirname(ENGINE) } : undefined); } }] });
    fs.copyFileSync(observedCompiled, path.join(retained, 'engine-picker-observed.mjs'));
    pickerObserver.compiledSha256 = sha(fs.readFileSync(observedCompiled));
    receipt({ pickerObserver, compiled: [...outcome.compiled, { file: 'engine-picker-observed.mjs', sha256: pickerObserver.compiledSha256 }] });
    const O = await import(pathToFileURL(observedCompiled).href);
    const allCatalogInputs = state => state.overall >= 80 && state.marketValue >= 30 ? [0.99, 0.99, 0.99] : [0.99, 0.99];
    const catalogRun = random(allCatalogInputs(context), () => E.getAllEvents(context));
    const targets = [220, 236], targetAvailability = targets.map(id => {
      const matches = catalogRun.result.filter(event => event.id === id), card = matches.length === 1 ? matches[0] : null;
      const read = random([], () => card ? { ledgerKey: E.eventLedgerKey(card), cooldown: E.eventCooldown(card), onCooldown: E.isEventOnCooldown(context, card) } : null);
      return { id, matches: matches.length, card: card ? copy(card) : null, season: year(context), lastEventId: context.lastEventId,
        lastFired: card ? context.eventLastFired?.[read.result.ledgerKey] ?? null : null, ...read.result, draws: read.draws };
    });
    const inputs = [], comparisons = [], prefix = [
      { value: 0.99, cause: 'original ordinary moral-dilemma gate rejects' },
      { value: 0.99, cause: 'original professor216 gate rejects' },
      { value: 0.99, cause: 'original professor217 gate rejects' },
      ...(context.overall >= 80 && context.marketValue >= 30 ? [{ value: 0.99, cause: 'original RealismB494 release-clause caption draw' }] : []),
      { value: 0.99, cause: 'original picker count is4' },
    ].map((row, index) => ({ ordinal: index + 1, ...row }));
    const witness = { name: '220-then-236', targets, targetAvailability, catalog: { cards: copy(catalogRun.result), draws: catalogRun.draws },
      contextSha256: sha(held), comparisons, input: { mode: 'controlled-sort-vector', prefix, draws: inputs, drawCount: 0 }, observed: null, replay: null };
    progress.acquisitions.push({ context, witness }); saveProgress();
    assert.equal(JSON.stringify(context), held); assert.deepEqual(catalogRun.draws, allCatalogInputs(context));
    for (const target of targetAvailability) assert(target.matches === 1 && !target.onCooldown && target.lastEventId !== target.id
      && target.draws.length === 0, 'Requested target must exist and be available to the original picker');
    const rank = id => targets.includes(id) ? targets.indexOf(id) : targets.length + id;
    let comparison = null, outsideSort = 0, picked;
    assert.equal(globalThis.__SC_LOAN_PICKER_COMPARISON, undefined);
    globalThis.__SC_LOAN_PICKER_COMPARISON = (a, b) => { comparison = { a, b, ordinal: inputs.length + 1 }; comparisons.push(comparison); };
    try {
      picked = random(() => {
        let value;
        if (comparison) { comparison.aRank = rank(comparison.a); comparison.bRank = rank(comparison.b);
          value = comparison.aRank < comparison.bRank ? 0.01 : comparison.aRank > comparison.bRank ? 0.99 : 0.5;
          comparison.value = value; comparison = null;
        } else { assert(outsideSort < prefix.length); const row = prefix[outsideSort++]; assert.equal(row.ordinal, inputs.length + 1); value = row.value; }
        inputs.push(value); return value;
      }, () => O.dismissSocialMediaPhase(context, E.FALLBACK_CLUBS));
    } finally { delete globalThis.__SC_LOAN_PICKER_COMPARISON; witness.input.drawCount = inputs.length; saveProgress(); }
    witness.observed = { rawBatch: copy(picked.result), draws: picked.draws }; saveProgress();
    const observedBatch = canonical(picked.result); Object.assign(witness.observed, { batch: observedBatch, batchSha256: sha(JSON.stringify(observedBatch)) }); saveProgress();
    assert.equal(JSON.stringify(context), held); assert.equal(comparison, null); assert.equal(outsideSort, prefix.length);
    assert.deepEqual(inputs.slice(0, prefix.length), prefix.map(row => row.value)); assert.equal(comparisons[0]?.ordinal, prefix.length + 1);
    assert(comparisons.length > 0); assert.deepEqual(picked.draws, inputs);
    assert(comparisons.every((row, index) => Number.isInteger(row.a) && Number.isInteger(row.b) && row.ordinal >= prefix.length + 1
      && inputs[row.ordinal - 1] === row.value && (index === 0 || row.ordinal > comparisons[index - 1].ordinal)));
    const replayContext = copy(context); let consumed = 0; assert.equal(globalThis.__SC_LOAN_PICKER_COMPARISON, undefined);
    const replay = random(() => { assert(consumed < inputs.length); return inputs[consumed++]; }, () => E.dismissSocialMediaPhase(replayContext, E.FALLBACK_CLUBS));
    witness.replay = { rawBatch: copy(replay.result), draws: replay.draws, consumed }; saveProgress();
    const batch = canonical(replay.result); Object.assign(witness.replay, { batch, batchSha256: sha(JSON.stringify(batch)) }); saveProgress();
    assert.equal(JSON.stringify(replayContext), held); assert.equal(consumed, inputs.length); assert.deepEqual(replay.draws, inputs);
    assert.deepEqual(witness.replay.rawBatch, witness.observed.rawBatch); assert.deepEqual(batch, observedBatch);
    assert(batch.phase === 'random_events' && batch.pendingEvents.length === 4);
    assert.deepEqual(batch.pendingEvents.slice(0, 2).map(event => event.id), targets);
    assert.equal(new Set(batch.pendingEvents.map(event => E.eventLedgerKey(event))).size, batch.pendingEvents.length);
    for (const event of batch.pendingEvents) assert.equal(batch.eventLastFired[E.eventLedgerKey(event)], year(batch));
    function literal(before, id, index) {
      const after = copy(before), clamp = value => Math.max(0, Math.min(100, value));
      if (id === 220) { assert.equal(index, 1); after.netWorth = Math.round((before.netWorth - 0.02) * 100) / 100;
        after.morale = clamp(before.morale + 3); after.events.push('🎁 Apologized for the haircut text with a barber voucher. He used it');
      } else { assert.equal(id, 236);
        if (index === 0) { after.netWorth = Math.round((before.netWorth - 0.2) * 100) / 100;
          after.integrityBonus = before.integrityBonus + 2; after.lifeFlags = { ...before.lifeFlags, teammateLoan: 1 };
          after.events.push('🤝 Lent a teammate €200k on a handshake');
        } else { assert.equal(index, 1); after.morale = clamp(before.morale - 2); after.lifeFlags = { ...before.lifeFlags, teammateLoan: 9 };
          after.events.push('🏦 Helped a teammate get a real loan instead of cash'); }
      }
      after.lastEventId = id; after.pendingEvents = after.pendingEvents.slice(1); after.phase = 'random_events'; after.overall = 70; return after;
    }
    function apply(name, state, id, index) {
      const before = canonical(canonical(state)), beforeText = JSON.stringify(before); assert.equal(before.pendingEvents[0].id, id);
      const wanted = literal(before, id, index), values = allCatalogInputs(before), queue = before.pendingEvents;
      const run = random(values, () => E.applyEventChoice(before, index, E.FALLBACK_CLUBS));
      const row = { name, eventId: id, choiceIndex: index, before: copy(before), beforeSha256: sha(beforeText), actual: copy(run.result),
        expected: wanted, resolverDraws: run.draws, resolverDrawCount: run.draws.length };
      progress.answers.push(row); saveProgress();
      const first = canonical(run.result), second = canonical(first); Object.assign(row, { reload1: first, reload2: second,
        expectedSha256: sha(JSON.stringify(wanted)), actualSha256: sha(JSON.stringify(second)) }); saveProgress();
      assert.equal(JSON.stringify(before), beforeText); assert.equal(before.pendingEvents, queue); assert.deepEqual(run.draws, values);
      assert.deepEqual(second, wanted); assert.deepEqual(second.eventLastFired, batch.eventLastFired);
      assert.equal(second.eventLastFired['story:squadChatLeak'], 2026); assert.equal(second.eventLastFired['236'], 2026);
      return { before, after: second, row };
    }
    const scenarios = [0, 1].map(index => {
      const id = index === 0 ? '220-voucher-236-lend' : '220-voucher-236-bank-help';
      const voucher = apply(id + '-voucher', batch, 220, 1), loan = apply(id + '-loan', voucher.after, 236, index);
      assert.equal(voucher.after.netWorth, 0.48); assert.equal(voucher.after.morale, 63);
      assert.deepEqual(loan.after.pendingEvents, batch.pendingEvents.slice(2));
      const scenario = { id, initial: voucher.before, initialSha256: sha(JSON.stringify(voucher.before)),
        provenance: { kind: 'actual-picker-saved-loan', context, actualPickerBatch: batch, actualPickerBatchSha256: sha(JSON.stringify(batch)), pickerWitness: witness,
          preparedFields: ['Fictional identity, supported club, senior row, meters and professor persona prepare a complete initialized career.',
            'Read-only comparator IDs select legal inputs. The entire vector is replayed through the unmodified actual picker without a receiver.',
            'Actual220 voucher reduces funds from0.50 to0.48 before actual236. Each answer and both canonical reloads preserve the original continuation.',
            'Queue order, stamps and effects are never rewritten. No seed search, random rate or complete UI-career claim is made.'] },
        steps: [voucher, loan].map(result => ({ eventId: result.row.eventId, choiceIndex: result.row.choiceIndex,
          choiceLabel: result.before.pendingEvents[0].choices[result.row.choiceIndex].label, resolverDraws: result.row.resolverDraws,
          resolverDrawCount: result.row.resolverDrawCount, expected: result.after, expectedSha256: sha(JSON.stringify(result.after)), reloadAfter: true })) };
      progress.scenarios.push(scenario); saveProgress(); return scenario;
    });
    const document = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock, source: { head: sourceHead, parentAppRef: PARENT,
      engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)), realismSha256: sha(sources.get(REALISM)),
      routineSha256: sha(sources.get(ROUTINE)), consequencesSha256: sha(sources.get(CAPTIONS)), saveSha256: sha(sources.get(SAVE)),
      contractsSha256: sha(sources.get(CONTRACTS)), pageSha256: sha(sources.get(PAGE)), testSha256: sha(sources.get(path.join(ROOT, TEST))),
      simSha256: sha(sources.get(SELF)), parentLifeSha256: sha(parentLife), parentLifeSourcePath: 'fixed/soccerCareerLife.parent.ts', pickerObserver }, scenarios };
    const bytes = JSON.stringify(document, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    assert(!fs.existsSync(file)); fs.writeFileSync(file, bytes); progress.status = 'complete'; saveProgress();
    assert.equal(progress.acquisitions.length, 1); assert.equal(progress.answers.length, 4); assert.equal(progress.scenarios.length, 2);
    return { file, sha256: sha(bytes), scenarios: 2, actualPickerBatches: 1, actualAnswers: 4 };
  } finally { globalThis.Date = RealDate; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage; }
}

try {
  receipt();
  for (const row of parentBindings) if (RED || row.file !== 'src/lib/soccerCareerLife.ts') assert.equal(row.candidateSha256, row.parentSha256, 'Only the fixed236 gate may differ from the whole held parent app');
  assert.equal(parentLife.split(ORIGINAL).length - 1, 1, 'One whole original236 gate must exist');
  if (!RED) { assert.equal(sources.get(LIFE).split(FIXED).length - 1, 1, 'One whole fixed236 gate must exist');
    assert.equal(sources.get(LIFE).replace(FIXED, ORIGINAL), parentLife, 'The unique fixed236 gate inverse must restore the whole held parent Life'); }
  if (CONTROL) {
    const before = sources.get(LIFE), offset = before.indexOf(FIXED), after = before.replace(FIXED, ORIGINAL), inverse = after.replace(ORIGINAL, FIXED);
    assert.notEqual(before, after); assert.equal(inverse, before); assert.equal(after, parentLife);
    changed.set(LIFE, after); anchors.push({ kind: CONTROL, file: 'src/lib/soccerCareerLife.ts', anchor: FIXED, replacement: ORIGINAL,
      offset, beforeSha256: sha(before), afterSha256: sha(after), inverseSha256: sha(inverse), faultParentSha256: sha(parentLife) });
    fs.writeFileSync(path.join(retained, 'soccerCareerLife.control.ts'), after);
  }
  assert.equal(anchors.length, CONTROL ? 1 : 0); receipt();
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, realism: REALISM, save: SAVE, contracts: CONTRACTS }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'saved-loan-actual-copied-source', setup(build) {
      build.onLoad({ filter: /\.ts$/ }, args => {
        const contents = changed.get(path.resolve(args.path)); return contents !== undefined && contents !== sources.get(path.resolve(args.path))
          ? { contents, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
      }); } }] });
  const compiled = ['engine.mjs', 'life.mjs', 'realism.mjs', 'save.mjs', 'contracts.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const [key, file] of [['SC_LOAN_ENGINE', 'engine.mjs'], ['SC_LOAN_LIFE', 'life.mjs'], ['SC_LOAN_SAVE', 'save.mjs'], ['SC_LOAN_CONTRACTS', 'contracts.mjs']])
    env[key] = path.join(tmp, file).replaceAll('\\', '/');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json'); assert(fs.existsSync(runner));
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'Actual child must finish inside its bound');
  assert(!SETUP.test(output) && fs.existsSync(reportFile), 'Setup, pending, missing-file and unhandled errors cannot earn credit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message);
  const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort());
  assert.equal(report.numTotalTests, 8); assert.equal(report.numPendingTests, 0); assert(cases.every(test => ['passed', 'failed'].includes(test.status)));
  const failed = cases.filter(test => test.status === 'failed'), names = RED || CONTROL ? NAMES.slice(0, 2) : [];
  assert.deepEqual(failed.map(test => test.title).sort(), [...names].sort());
  for (const test of failed) assert(test.failureMessages.length > 0 && test.failureMessages.every(value =>
    /^AssertionError: saved teammate loan choice lost its actual effect: expected false to be true/s.test(value)), 'Every expected failure needs its exact owned Boolean cause');
  assert.equal(report.numFailedTests, names.length); assert.equal(report.numPassedTests, 8 - names.length); assert.equal(result.status, names.length ? 1 : 0);
  const generated = !RED && !CONTROL ? await fixtures() : null;
  for (const [source, before] of sources) assert.equal(fs.readFileSync(source, 'utf8'), before, 'Every actual app and proof byte must stay held');
  receipt({ status: 'complete', fixtures: generated ? { ...generated, file: path.relative(OUT, generated.file) } : null });
  console.log(`Actual saved-loan unit: all8 literal names completed; ${report.numPassedTests} passed; ${failed.length} exact Boolean faults; pending0; child exit${result.status}.`);
  if (RED || CONTROL) console.log('Both loaded236 complete-effect guards failed first; their downstream literal assertions were not executed.');
  if (CONTROL) console.log(`Effective gate control: one unique copied Life fault, whole current inverse and whole parent identity; changed sha256=${anchors[0].afterSha256}.`);
  console.log(`Actual source held: ${sources.size} before copies; eight whole parent bindings; five actual compiled leaves${generated ? ' plus one read-only observed engine' : ''}.`);
  console.log('Original236 balance and stage gates, both live callbacks, cash and integrity effects, original continuation and existing237 reviews stay held.');
  if (generated) console.log(`Actual plain picker replay: one complete vector; two scenarios; four literal answers; sha256=${generated.sha256}.`);
  console.log('Raw JSON, logs, process, source, full states and input/replay receipts precede strict classification. No natural rate or complete UI-career claim.');
  console.log(`simSoccerCareerSavedLoan ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
