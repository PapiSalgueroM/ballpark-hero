import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1', 'GP_APP_PREP_CI');
assert.equal(process.env.SIM_NETWORK, 'offline', 'GP_APP_PREP_OFFLINE');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert(process.env.GP_BOSS_APP_PREP, 'GP_APP_PREP_OUTPUT_REQUIRED');
const OUT = path.resolve(process.env.GP_BOSS_APP_PREP);
const relativeOut = path.relative(path.join(ROOT, 'tmp'), OUT);
assert(relativeOut && !relativeOut.startsWith('..') && !path.isAbsolute(relativeOut), 'GP_APP_PREP_WORKSPACE_TMP_OUTPUT');
fs.mkdirSync(OUT, { recursive: true });
assert.equal(fs.readdirSync(OUT).length, 0, 'GP_APP_PREP_FRESH_EMPTY_OUTPUT');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const asBytes = value => Buffer.from(JSON.stringify(value));
const own = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const PIN = {
  engine: '3dcaa003a5f71b6d85db9b4fd4097c5f54bb97d90a863b78bc7604b3027d1911',
  hook: 'b06293c184ba51e002189973c0eb39c6f52616023bb9f17fb3a5b3f67e8d2260',
  page: 'd81e7182866ff7d6c40f44d3674e6ef5d3dddd1a43f337a0fbfb78eda7f2f9ba',
  legacy: 'cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028',
};
const sourceFiles = [
  'src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'src/hooks/useGrandPrixBoss.ts',
  'src/pages/GrandPrixBoss.tsx', 'src/App.tsx', 'src/data/gameRegistry.ts',
  'src/data/gameContent/grandPrixBoss.ts', 'src/data/gameContent/loader.ts',
  'src/data/gameContent/index.ts', 'src/data/seoMeta.ts',
  'src/test/fixtures/grandPrixBossV5Starter.json', 'package.json', 'package-lock.json',
  'tsconfig.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs',
  'scripts/qa/prepareGrandPrixBossApp.mjs',
];
const held = new Map(sourceFiles.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const sourceHolds = () => [...held].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha(bytes) }));
function holdSources() {
  for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), bytes, 'GP_APP_PREP_SOURCE_HELD:' + file);
}
assert.equal(sha(held.get('src/lib/grandPrixBoss.ts')), PIN.engine, 'GP_APP_PREP_ACTUAL_ENGINE_PIN');
assert.equal(sha(held.get('src/hooks/useGrandPrixBoss.ts')), PIN.hook, 'GP_APP_PREP_ACTUAL_HOOK_PIN');
assert.equal(sha(held.get('src/pages/GrandPrixBoss.tsx')), PIN.page, 'GP_APP_PREP_ACTUAL_PAGE_PIN');
const legacyBytes = held.get('src/test/fixtures/grandPrixBossV5Starter.json');
assert.equal(legacyBytes.length, 21495, 'GP_APP_PREP_CAPTURED_BYTES');
assert.equal(sha(legacyBytes), PIN.legacy, 'GP_APP_PREP_CAPTURED_SHA');
function write(file, bytes) {
  const absolute = path.join(OUT, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, bytes, { flag: 'wx' });
  assert.deepEqual(fs.readFileSync(absolute), Buffer.from(bytes), 'GP_APP_PREP_OUTPUT_READBACK:' + file);
  return { file, bytes: Buffer.byteLength(bytes), sha256: sha(bytes) };
}
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
writeJson('source-before.json', sourceHolds());
let engine, actionCount = 0, readerCount = 0;
const readReceipts = [], actions = [], rounds = [], labs = [];
let primary = null;
let outcome = { status: 'incomplete', scope: 'Actual engine preparation only; no App/browser, build, completion or publication credit.' };
try {
  const oracleFile = path.join(OUT, 'oracle.mjs');
  assert(!fs.existsSync(oracleFile), 'GP_APP_PREP_ORACLE_NO_CLOBBER');
  const bundled = await build({
    absWorkingDir: ROOT, entryPoints: [path.join(ROOT, 'src/lib/grandPrixBoss.ts')],
    outfile: oracleFile, bundle: true, format: 'esm', platform: 'node', target: 'es2020',
    alias: { '@': path.join(ROOT, 'src') }, metafile: true, sourcemap: false, logLevel: 'silent',
  });
  const moduleInputs = Object.entries(bundled.metafile.inputs).map(([file, item]) => {
    const absolute = path.resolve(ROOT, file), relative = path.relative(ROOT, absolute).split(path.sep).join('/');
    assert(held.has(relative), 'GP_APP_PREP_KNOWN_COMPILED_INPUT:' + relative);
    const bytes = fs.readFileSync(absolute);
    assert.equal(item.bytes, bytes.length, 'GP_APP_PREP_METAFILE_INPUT_BYTES:' + relative);
    assert.deepEqual(bytes, held.get(relative), 'GP_APP_PREP_METAFILE_INPUT_HELD:' + relative);
    return { path: relative, bytes: bytes.length, sha256: sha(bytes) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(moduleInputs.map(item => item.path), ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts'], 'GP_APP_PREP_REAL_TWO_INPUT_ORACLE');
  writeJson('oracle-metafile.json', bundled.metafile);
  writeJson('oracle-inputs.json', moduleInputs);
  const oracleBytes = fs.readFileSync(oracleFile);
  const oracle = { file: 'oracle.mjs', bytes: oracleBytes.length, sha256: sha(oracleBytes) };
  engine = await import(pathToFileURL(oracleFile).href);
  assert.deepEqual(Object.keys(engine).sort(), ['applyAction', 'createCareer', 'seasonScore', 'validateSavedCareer'], 'GP_APP_PREP_REAL_PUBLIC_EXPORTS');
  for (const key of Object.keys(engine)) assert.equal(typeof engine[key], 'function', 'GP_APP_PREP_FUNCTION:' + key);

  function read(raw, label) {
    const before = JSON.stringify(raw), result = engine.validateSavedCareer(raw);
    assert.equal(JSON.stringify(raw), before, 'GP_APP_PREP_READER_INPUT_HELD:' + label);
    assert.equal(result.ok, true, 'GP_APP_PREP_READER_ADMITTED:' + label + ':' + JSON.stringify(result));
    assert.equal(result.state.worldKind, 'fictional', 'GP_APP_PREP_FICTIONAL:' + label);
    readerCount += 1;
    readReceipts.push({ index: readerCount, label, inputSha256: sha(before), canonicalSha256: sha(JSON.stringify(result.state)),
      revision: result.state.revision, season: result.state.season, round: result.state.round, phase: result.state.phase });
    return result.state;
  }
  function canonical(state, label) {
    const admitted = read(state, label);
    assert.deepEqual(admitted, state, 'GP_APP_PREP_ALREADY_CANONICAL:' + label);
    return admitted;
  }
  function move(state, input) {
    canonical(state, 'before-action-' + (actionCount + 1));
    const before = JSON.stringify(state), action = { ...input, expectedRevision: state.revision };
    const heldAction = JSON.stringify(action), transition = engine.applyAction(state, action);
    assert.equal(JSON.stringify(state), before, 'GP_APP_PREP_ACTION_INPUT_HELD');
    assert.equal(JSON.stringify(action), heldAction, 'GP_APP_PREP_ACTION_ARGUMENT_HELD');
    assert.equal(transition.ok, true, 'GP_APP_PREP_LEGAL_ACTION:' + action.type + ':' + JSON.stringify(transition));
    const next = canonical(transition.state, 'after-action-' + (actionCount + 1));
    assert.equal(next.revision, state.revision + 1, 'GP_APP_PREP_REVISION');
    assert.equal(transition.receipt.revision, next.revision, 'GP_APP_PREP_RECEIPT_REVISION');
    assert.equal(transition.receipt.type, action.type, 'GP_APP_PREP_RECEIPT_TYPE');
    let expectedDelta = 0;
    if (next.results.length === state.results.length + 1) {
      assert.equal(action.type, 'raceInterval', 'GP_APP_PREP_ONLY_ACTUAL_RACE_SETTLEMENT');
      const result = next.results[next.results.length - 1], mine = result.classification.filter(row => row.teamId === state.teamId);
      assert.equal(mine.length, 2, 'GP_APP_PREP_TWO_CLASSIFIED_CARS');
      const prize = mine.reduce((sum, row) => sum + row.points * 30000 + (row.status === 'finished' ? 50000 : 0), 0);
      const cost = state.calendar[state.round].entryCost + own(state).reduce((sum, driver) => sum + driver.contract.wagePerRace, 0);
      assert.equal(result.teamPrize, prize, 'GP_APP_PREP_ACTUAL_CLASSIFICATION_PRIZE');
      assert.equal(result.operatingCost, cost, 'GP_APP_PREP_ACTUAL_SIGNED_OPERATING_COST');
      assert.equal(transition.receipt.teamPrize, prize, 'GP_APP_PREP_PRIZE_RECEIPT');
      assert.equal(transition.receipt.operatingCost, cost, 'GP_APP_PREP_COST_RECEIPT');
      expectedDelta = prize - cost;
      rounds.push({ round: state.round, roundId: result.roundId, teamPrize: prize, operatingCost: cost, classification: clone(result.classification),
        grid: clone(next.race.grid), entries: clone(next.race.entries), cashBefore: state.cash, cashAfter: next.cash });
    } else {
      assert.equal(next.results.length, state.results.length, 'GP_APP_PREP_NO_SYNTHETIC_RESULT');
      assert.equal(transition.receipt.cost, undefined, 'GP_APP_PREP_NO_UNPERFORMED_PURCHASE');
    }
    assert.equal(next.cash, state.cash + expectedDelta, 'GP_APP_PREP_INTEGER_CASH_LEDGER');
    assert(Number.isSafeInteger(next.cash) && Number.isSafeInteger(next.reserved) && next.cash >= next.reserved, 'GP_APP_PREP_FUNDED_INTEGER_STATE');
    actionCount += 1;
    const suffix = String(actionCount).padStart(3, '0');
    const inputFile = write('actions/' + suffix + '-before.json', before + '\n');
    const resultFile = writeJson('actions/' + suffix + '-result.json', transition);
    actions.push({ index: actionCount, action, receipt: clone(transition.receipt), before: inputFile, result: resultFile,
      beforeSha256: sha(before), afterSha256: sha(JSON.stringify(next)), cashBefore: state.cash, cashAfter: next.cash,
      reservedBefore: state.reserved, reservedAfter: next.reserved, phaseBefore: state.phase, phaseAfter: next.phase });
    return next;
  }

  const original = JSON.parse(legacyBytes.toString('utf8'));
  assert.equal(original.teamId, 'gp-team-6', 'GP_APP_PREP_OLD_TEAM');
  assert.deepEqual(own(original).map(driver => driver.id), ['gp-driver-12', 'gp-driver-13'], 'GP_APP_PREP_OLD_SEATS');
  assert(original.drivers.every(driver => !Object.hasOwn(driver, 'focus')), 'GP_APP_PREP_GENUINE_OLD_FOCUS_SHAPE');
  assert(original.teams.every(team => !Object.hasOwn(team, 'baselineCar')), 'GP_APP_PREP_GENUINE_OLD_CAR_SHAPE');
  assert(!Object.hasOwn(original, 'history') && !Object.hasOwn(original, 'careerTotals'), 'GP_APP_PREP_GENUINE_OLD_LEDGER_SHAPE');
  const legacyCanonical = read(original, 'literal-captured-v5');
  const legacyEnvelopeBytes = Buffer.concat([Buffer.from('{"schemaVersion":1,"career":'), legacyBytes, Buffer.from(',"completedSeasons":[]}')]);
  assert.deepEqual(JSON.parse(legacyEnvelopeBytes.toString('utf8')).career, original, 'GP_APP_PREP_RAW_ENVELOPE_VALID');
  const legacyRecord = write('legacy-envelope.txt', legacyEnvelopeBytes);
  const capturedRecord = write('captured-v5-career.json', legacyBytes);
  writeJson('legacy-canonical.json', legacyCanonical);

  const lab = clone(original), initialSeats = own(lab), originalSeats = own(original);
  assert.equal(initialSeats.length, 2, 'GP_APP_PREP_TWO_LEGACY_LAB_SEATS');
  initialSeats[0].age = 39; initialSeats[0].contract.years = 1;
  initialSeats[1].age = 50; initialSeats[1].contract.years = 1;
  const restoredInitial = clone(lab);
  own(restoredInitial).forEach((driver, index) => { driver.age = originalSeats[index].age; driver.contract.years = originalSeats[index].contract.years; });
  assert.deepEqual(restoredInitial, original, 'GP_APP_PREP_INITIAL_LAB_WHOLE_INVERSE');
  labs.push({ label: 'Declared old-save age/term fixture edits before first C reader; no generated result or payment',
    edits: initialSeats.map((driver, index) => ({ driverId: driver.id, ageBefore: originalSeats[index].age, ageAfter: driver.age,
      yearsBefore: originalSeats[index].contract.years, yearsAfter: driver.contract.years })), wholeInverse: true,
    originalSha256: sha(asBytes(original)), laboratorySha256: sha(asBytes(lab)) });
  writeJson('initial-laboratory-raw.json', lab);
  let state = read(lab, 'declared-initial-age-term-laboratory');
  writeJson('initial-laboratory-canonical.json', state);
  const initialCash = state.cash;
  const departingId = initialSeats[0].id, honoredId = initialSeats[1].id;
  while (state.phase !== 'seasonReview') {
    assert.equal(state.phase, 'preRace', 'GP_APP_PREP_REAL_NEXT_ROUND');
    state = move(state, { type: 'qualify' });
    state = move(state, { type: 'startRace', setups: own(state).map(driver => ({
      driverId: driver.id, pace: 'balanced', compound: state.race.weather === 'wet' ? 'wet' : 'medium',
    })) });
    while (state.phase === 'race') {
      const orders = own(state).map(driver => {
        const entry = state.race.entries.find(row => row.driverId === driver.id);
        assert(entry, 'GP_APP_PREP_CONTRACTED_RACE_ENTRY');
        let pitTo;
        if (state.race.lap > 0 && entry.status === 'running') {
          if (state.race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
          else if (state.race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
          else if (entry.tyreWear > 58) pitTo = state.race.weather === 'wet' ? 'wet' : 'hard';
        }
        return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
      });
      state = move(state, { type: 'raceInterval', orders });
    }
    if (state.phase === 'raceResult') state = move(state, { type: 'continue' });
  }
  assert.equal(state.results.length, 12, 'GP_APP_PREP_TWELVE_ACTUAL_RACES');
  assert.equal(rounds.length, 12, 'GP_APP_PREP_TWELVE_SETTLEMENTS');
  assert.equal(state.calendar.length, 12, 'GP_APP_PREP_ACTUAL_CALENDAR');
  assert.equal(state.cash, initialCash + rounds.reduce((sum, row) => sum + row.teamPrize - row.operatingCost, 0), 'GP_APP_PREP_WHOLE_YEAR_CASH');
  const completed = clone(state);
  writeJson('completed-review-before-timing-lab.json', completed);
  const reviewLab = clone(completed), honored = reviewLab.drivers.find(driver => driver.id === honoredId);
  const priorStarts = honored.contract.startsSeason;
  honored.contract.startsSeason = reviewLab.season + 1;
  reviewLab.marketOffers = undefined; reviewLab.nextSeasonPlan = undefined;
  const restoredReview = clone(reviewLab);
  restoredReview.drivers.find(driver => driver.id === honoredId).contract.startsSeason = priorStarts;
  restoredReview.marketOffers = clone(completed.marketOffers); restoredReview.nextSeasonPlan = clone(completed.nextSeasonPlan);
  assert.deepEqual(restoredReview, completed, 'GP_APP_PREP_REVIEW_TIMING_LAB_WHOLE_INVERSE');
  labs.push({ label: 'Declared existing-paid future timing at real seasonReview; not an unperformed renewal payment',
    driverId: honoredId, startsSeasonBefore: priorStarts, startsSeasonAfter: reviewLab.season + 1,
    clearedDerivedOnly: ['marketOffers', 'nextSeasonPlan'], wholeInverse: true,
    originalSha256: sha(asBytes(completed)), laboratorySha256: sha(asBytes(reviewLab)) });
  writeJson('review-timing-laboratory-raw.json', reviewLab);
  const review = read(reviewLab, 'declared-review-paid-term-timing-laboratory');
  assert.deepEqual(review.teams, completed.teams, 'GP_APP_PREP_CURRENT_C_TEAMS_HELD');
  assert.deepEqual(review.history, completed.history, 'GP_APP_PREP_CURRENT_B_HISTORY_HELD');
  assert.deepEqual(review.careerTotals, completed.careerTotals, 'GP_APP_PREP_CURRENT_B_TOTALS_HELD');
  assert.deepEqual(review.drivers.map(driver => driver.focus), completed.drivers.map(driver => driver.focus), 'GP_APP_PREP_CURRENT_C_FOCUS_HELD');
  const plan = review.nextSeasonPlan;
  assert(plan && plan.affordable, 'GP_APP_PREP_CANONICAL_FUNDED_PLAN');
  assert.equal(plan.seatReplacements.length, 1, 'GP_APP_PREP_ONE_ACTUAL_QUOTED_REPLACEMENT');
  assert.equal(plan.seatReplacements[0].departingDriverId, departingId, 'GP_APP_PREP_CORRECT_EXPIRING_RETIREMENT');
  assert(!plan.automaticRenewals.some(row => row.driverId === honoredId), 'GP_APP_PREP_FUTURE_PAID_SEAT_NOT_RENEWED');
  assert(!plan.seatReplacements.some(row => row.departingDriverId === honoredId), 'GP_APP_PREP_FUTURE_PAID_SEAT_NOT_REPLACED');
  assert.equal(review.drivers.find(driver => driver.id === honoredId).contract.startsSeason, review.season + 1, 'GP_APP_PREP_HONORED_FUTURE_TERM');
  assert.equal(plan.totalReplacementFee, plan.seatReplacements[0].signingFee, 'GP_APP_PREP_CANONICAL_TOTAL_REPLACEMENT_FEE');
  canonical(review, 'final-prepared-review');
  const reviewEnvelope = { schemaVersion: 1, career: review, completedSeasons: [1] };
  assert.equal(review.season, 1, 'GP_APP_PREP_LOCAL_COMPLETED_CLAIM_YEAR');
  const reviewRecord = writeJson('review-envelope.json', reviewEnvelope);
  writeJson('recipe.json', { schemaVersion: 1, captured: capturedRecord, labels: labs,
    policy: 'No upgrades or market actions. Balanced pace; start wet in rain or medium in dry. At later calls fit matching weather tyres, otherwise replace wear above58with wet/hard. Native engine streams only.',
    fixtureClaim: 'completedSeasons[1] is a local prepared-fixture claim only. No completion request or backend record is performed.',
    actionCount, readerCount, departingId, honoredId, replacement: clone(plan.seatReplacements[0]), plan: clone(plan),
    initialCash, finalCash: review.cash, roundCount: rounds.length, preparationStopsAt: 'seasonReview before startNextSeason; browser performs actual rollover' });
  writeJson('actions.json', actions); writeJson('reader-receipts.json', readReceipts); writeJson('rounds.json', rounds);
  holdSources();
  assert.deepEqual(fs.readFileSync(oracleFile), oracleBytes, 'GP_APP_PREP_ORACLE_BYTES_HELD');
  const manifest = {
    schemaVersion: 1, sourceHolds: sourceHolds(), oracle, oracleInputs: moduleInputs,
    legacy: { bodyFile: legacyRecord.file, bytes: legacyRecord.bytes, sha256: legacyRecord.sha256, careerSourceSha256: PIN.legacy },
    review: { bodyFile: reviewRecord.file, bytes: reviewRecord.bytes, sha256: reviewRecord.sha256 },
    recipe: { file: 'recipe.json', actionCount, readerCount, roundCount: rounds.length, departingId, honoredId, nextSeasonPlanSha256: sha(asBytes(plan)) },
    receipts: { actions: 'actions.json', readers: 'reader-receipts.json', rounds: 'rounds.json', metafile: 'oracle-metafile.json' },
    scope: 'One engine-played twelve-race mixed retirement review and one byte-exact captured-v5 envelope. No UI/browser/build/transport/completion result is claimed.',
  };
  writeJson('manifest.json', manifest);
  outcome = { status: 'prepared', actionCount, readerCount, rounds: rounds.length, sourceHolds: sourceHolds(), oracle,
    legacySha256: legacyRecord.sha256, reviewSha256: reviewRecord.sha256 };
} catch (error) {
  primary = error;
  outcome = { ...outcome, status: 'failed', actionCount, readerCount, error: { name: error?.name, message: error?.message, stack: error?.stack } };
} finally {
  let secondary = null;
  try { holdSources(); outcome.sourceBytesHeld = true; }
  catch (error) { outcome.sourceBytesHeld = false; outcome.holdFailure = { name: error?.name, message: error?.message, stack: error?.stack }; secondary = error; }
  try { writeJson('preparation-result.json', outcome); }
  catch (error) { outcome.resultWriteFailure = String(error); secondary ??= error; }
  try { process.stdout.write(JSON.stringify({ scope: 'Grand Prix Boss App engine preparation', ...outcome }) + '\n'); }
  catch (error) { secondary ??= error; }
  if (primary) throw primary;
  if (secondary) throw secondary;
}
