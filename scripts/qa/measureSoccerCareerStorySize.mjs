import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEST = 'src/test/careerStory.test.tsx';
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const extraImports = `
import { writeFileSync as __scdWrite } from 'node:fs';
import { resolve as __scdResolve } from 'node:path';
import { createHash as __scdHash } from 'node:crypto';
import { isDeepStrictEqual as __scdEqual } from 'node:util';
import { serializeSoccerCareerSave as __scdSerialize, parseSoccerCareerSave as __scdParse, isSoccerCareerSave as __scdAdmit } from '@/lib/soccerCareerSave';
import { readCommunityShield as __scdRead, communityShieldPlayerSide as __scdSide } from '@/lib/soccerCareerExtraCups';
`;
const diagnostic = String.raw`

function __scdMeasure(seed: number, state: CareerState, parts: ReturnType<typeof saveParts>) {
  const directory = process.env.SC_STORY_SIZE_CASE_OUT;
  if (!directory) throw new Error('Explicit Story size measurement directory is required');
  const raw = JSON.stringify(state), canonical = JSON.parse(raw) as CareerState;
  const digest = (value: string) => __scdHash('sha256').update(value).digest('hex');
  const persist = (suffix: string, body: string) => __scdWrite(__scdResolve(directory, String(seed) + suffix), body, { encoding: 'utf8', flag: 'wx' });
  const size = (value: unknown) => value === undefined ? 0 : JSON.stringify(value).length;
  const inspect = (row: CareerState['seasons'][number]) => {
    const match = __scdRead(row), copy = { ...row }; delete copy.extraCups;
    return { year: row.year, club: row.club, type: row.type, rawExtraCupsPresent: Object.prototype.hasOwnProperty.call(row, 'extraCups'),
      validResult: match !== null, representedSide: match ? __scdSide(match) : null,
      nonentrant: match !== null && __scdSide(match) === null, selected: match?.player.selected ?? null,
      playerTitle: match?.player.title ?? null, playerApps: match?.player.apps ?? null,
      payloadCodeUnits: size(row.extraCups), fieldEnvelopeCodeUnits: size(row) - size(copy) };
  };
  const bySeason = state.seasons.map(inspect), rootQualification = state.extraCupQualification;
  const pending = state.pendingSummary ? inspect(state.pendingSummary) : null;
  const withoutAll = JSON.parse(raw) as CareerState;
  delete withoutAll.extraCupQualification;
  for (const row of withoutAll.seasons) delete row.extraCups;
  if (withoutAll.pendingSummary) delete withoutAll.pendingSummary.extraCups;
  const withoutNonentrants = JSON.parse(raw) as CareerState;
  for (const row of withoutNonentrants.seasons) {
    const match = __scdRead(row); if (match && __scdSide(match) === null) delete row.extraCups;
  }
  if (withoutNonentrants.pendingSummary) {
    const match = __scdRead(withoutNonentrants.pendingSummary);
    if (match && __scdSide(match) === null) delete withoutNonentrants.pendingSummary.extraCups;
  }
  const allParts = saveParts(withoutAll), nonentrantParts = saveParts(withoutNonentrants);
  const serialized = __scdSerialize(state), decoded = __scdParse(serialized);
  const roundTripEqual = __scdEqual(decoded, canonical), coreAdmitted = __scdAdmit(decoded);
  const packed = JSON.parse(serialized) as { seasons?: unknown; story?: unknown };
  const broken = JSON.parse(JSON.stringify(decoded)) as CareerState;
  broken.seasons = broken.seasons.slice(1);
  const omissionChanged = !__scdEqual(broken, canonical);
  const restored = JSON.parse(JSON.stringify(decoded)) as CareerState;
  const restoredEqual = __scdEqual(restored, canonical);
  const { communityShields: _newCounter, ...oldTotals } = E.getCareerTotals(state.seasons);
  const { communityShields: _projectedCounter, ...projectedOldTotals } = E.getCareerTotals(withoutAll.seasons);
  const rawAll = JSON.stringify(withoutAll), rawNonentrants = JSON.stringify(withoutNonentrants);
  persist('.state.json', raw); persist('.serialized.txt', serialized); persist('.decoded.json', JSON.stringify(decoded));
  persist('.without-all-new-fields.json', rawAll); persist('.without-nonentrant-fields.json', rawNonentrants);
  const measurement = {
    seed, scope: 'Exact original Story test state and existing saveParts, with detached attribution copies only. No chosen storage or limit fix.',
    units: 'Existing bounds use JSON.stringify(...).length UTF-16 code units; UTF-8 byte counts and twice-code-unit body sizes are separate descriptive measurements, not browser quota guarantees.',
    raw: { codeUnits: raw.length, utf8Bytes: Buffer.byteLength(raw, 'utf8'), sha256: digest(raw), seasonRows: state.seasons.length, storyRows: state.story?.length ?? 0 },
    limits: { SIZE_BOUND, STORY_BYTES_PER_SEASON, REST_BOUND, CUP_BYTES_PER_SEASON, DIVISION_BYTES_PER_SEASON, TEN_DIVISIONS_BYTES, PART_SEASONS_FLOOR, OPENING_BYTES_PER_SEASON, WHEEL_BYTES, POOL_BYTES },
    parts, savePartsInput: { file: String(seed) + '.state.json', sha256: digest(raw) },
    shield: { bySeason, representedRows: bySeason.filter(row => row.validResult && !row.nonentrant).length,
      nonentrantRows: bySeason.filter(row => row.nonentrant).length,
      malformedPresentRows: bySeason.filter(row => row.rawExtraCupsPresent && !row.validResult).length,
      rootQualificationPayloadCodeUnits: size(rootQualification),
      rootQualificationFieldEnvelopeCodeUnits: raw.length - size({ ...state, extraCupQualification: undefined }), pendingSummary: pending,
      allNewFieldRestCodeUnits: parts.rest - allParts.rest,
      nonentrantOnlyRestCodeUnits: parts.rest - nonentrantParts.rest },
    detachedAttributionOnly: {
      allNewFieldsRemoved: { inputFile: String(seed) + '.without-all-new-fields.json', inputSha256: digest(rawAll), parts: allParts, fullCodeUnits: rawAll.length },
      onlyNonentrantResultsRemoved: { inputFile: String(seed) + '.without-nonentrant-fields.json', inputSha256: digest(rawNonentrants), parts: nonentrantParts, fullCodeUnits: rawNonentrants.length },
      warning: 'These copies measure footprint only. The actual state, proof and history are retained untouched; no deletion or persistence-format change is proposed.' },
    codec: { codeUnits: serialized.length, utf8Bytes: Buffer.byteLength(serialized, 'utf8'), utf16BodyBytes: serialized.length * 2,
      sha256: digest(serialized), roundTripEqual, coreAdmitted,
      savedEnvelopeSeasons: Array.isArray(packed.seasons) ? { format: 'literal-array', rows: packed.seasons.length } : packed.seasons && typeof packed.seasons === 'object' ? { format: (packed.seasons as { format?: unknown }).format ?? null, compressedDataCodeUnits: typeof (packed.seasons as { data?: unknown }).data === 'string' ? ((packed.seasons as { data: string }).data).length : null } : { format: 'absent' },
      decodedSha256: digest(JSON.stringify(decoded)), unknownFieldsAndFullHistoryCompared: true },
    comparisonControl: { scope: 'Detached decoded-history omission, not a codec source fault', omissionChanged, restoredEqual },
    oldTotalsHeldByAttribution: __scdEqual(oldTotals, projectedOldTotals),
    allTotalsHeldWhenOnlyNonentrantsRemoved: __scdEqual(E.getCareerTotals(state.seasons), E.getCareerTotals(withoutNonentrants.seasons)),
  };
  persist('.measurement.json', JSON.stringify(measurement, null, 2) + '\n');
  expect(JSON.stringify(state), 'diagnostic must not mutate the original Story state').toBe(raw);
  expect(roundTripEqual, 'actual save codec retains complete serialized Story state').toBe(true);
  expect(coreAdmitted, 'actual core save reader admits encoded complete Story state').toBe(true);
  expect(omissionChanged && restoredEqual, 'detached lost-history comparison control must change and restore').toBe(true);
  expect(measurement.oldTotalsHeldByAttribution).toBe(true);
  expect(measurement.allTotalsHeldWhenOnlyNonentrantsRemoved).toBe(true);
}
`;

async function main() {
  assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  const root = process.cwd(); assert(process.env.SC_STORY_SIZE_OUT);
  const out = path.resolve(process.env.SC_STORY_SIZE_OUT); assert(out.startsWith(path.join(root, 'tmp') + path.sep));
  assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0); fs.mkdirSync(out, { recursive: true });
  const caseOut = path.join(out, 'cases'); fs.mkdirSync(caseOut);
  const sourceFiles = [TEST, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerExtraCups.ts',
    'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.app.json', 'scripts/lib/offlineTransport.cjs', path.relative(root, fileURLToPath(import.meta.url))];
  const held = new Map();
  for (const file of sourceFiles) { const bytes = await fs.promises.readFile(path.join(root, file)); held.set(file, Buffer.from(bytes)); }
  for (const [file, expected] of Object.entries({ [TEST]: '60873fdf6701fa882c6bbef3c06bdf65a4d46353b2e74f3c633dcfa1a8023cf0',
    'src/lib/soccerCareerEngine.ts': '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c',
    'src/lib/soccerCareerSave.ts': 'b486dfd8c4073230b6967c674058e46c7b56a6afd2a8a165f1e215501205477a',
    'src/lib/soccerCareerExtraCups.ts': '6562fef7c5f067ffa9a4fdf335a918a0d20bda908f0156308f3b705d378f2406' })) assert.equal(sha(held.get(file)), expected, file);
  const hold = () => { for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, 'Held actual source: ' + file); };
  const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
  write(path.join(out, 'source-before.json'), receipts());
  const text = fs.readFileSync(path.join(root, TEST), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(text, held.get(TEST).toString('utf8').replace(/\r\n/g, '\n'));
  const importAnchor = "import * as E from '@/lib/soccerCareerEngine';";
  const partsAnchor = '    const p = saveParts(s);';
  for (const anchor of [importAnchor, partsAnchor]) assert.equal(text.split(anchor).length, 2, 'Unique unchanged test anchor');
  const injectedParts = partsAnchor + '\n    __scdMeasure(seed, s, p);';
  const copied = text.replace(importAnchor, importAnchor + extraImports).replace(partsAnchor, injectedParts) + diagnostic;
  const restored = copied.slice(0, -diagnostic.length).replace(injectedParts, partsAnchor).replace(importAnchor + extraImports, importAnchor);
  assert.equal(restored, text, 'Complete original test inverse');
  const copy = path.join(root, 'src/test/__sc_story_size_' + process.pid + '.test.tsx'); assert.equal(fs.existsSync(copy), false);
  const copyBytes = Buffer.from(copied), records = [];
  let primary = null; const secondary = [];
  const clean = ['SC_EXTRA_CUPS_ENGINE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'TYCOON_AWAY_CONTROL', 'COMPLETION_HOOK', 'OWNED_TIMEOUTS_HOOK', 'CONQUEST_NBA_HOOK', 'CONQUEST_NBA_BOARD', 'POLL_FIXTURES', 'DAILY_RECORD_CONTROL'];
  function execute(name, args) {
    const env = { ...process.env, NODE_OPTIONS: '', SC_STORY_SIZE_CASE_OUT: caseOut }; for (const key of clean) delete env[key];
    env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport'); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const argv = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), ...args];
    write(path.join(out, name + '.argv.json'), [process.execPath, ...argv]);
    const result = spawnSync(process.execPath, argv, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, name + '.stdout'), result.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr'), result.stderr || '');
    fs.writeFileSync(path.join(out, name + '.exit'), String(result.status) + '\n');
    write(path.join(out, name + '.process.json'), { status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null });
    assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0); hold(); assert.deepEqual(fs.readFileSync(copy), copyBytes);
    return result;
  }
  try {
    fs.writeFileSync(copy, copyBytes, { flag: 'wx' }); fs.writeFileSync(path.join(out, 'instrumented-story.test.tsx'), copyBytes, { flag: 'wx' });
    write(path.join(out, 'test-transform.json'), { actualSourceSha256: sha(held.get(TEST)), copiedSha256: sha(copyBytes), originalNormalizedSha256: sha(Buffer.from(text)), inverseSha256: sha(Buffer.from(restored)), importAnchor, extraImports, partsAnchor, injectedParts, appendedHelper: diagnostic, allOriginalAssertionsAndLimitsHeld: true });
    const from = text.indexOf('function saveParts(s: CareerState) {'), to = text.indexOf('\nfunction playToSeasonStart(', from);
    assert(from >= 0 && to > from); fs.writeFileSync(path.join(out, 'actual-saveParts.source.txt'), text.slice(from, to));
    const types = execute('types', [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json']); assert.equal(types.status, 0);
    const reportFile = path.join(out, 'current.vitest.json');
    const current = execute('current', [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', path.relative(root, copy), '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile,
      '--testNamePattern=the longest career on seed (9749|9750) plus ten dugout seasons stays under the bound']);
    assert.equal(current.status, 1, 'Existing two REST bound failures remain diagnostic RED');
    const reportBytes = fs.readFileSync(reportFile), report = JSON.parse(reportBytes);
    assert.equal(report.success, false); assert.equal(report.numTotalTests, 13); assert.equal(report.numFailedTests, 2); assert.equal(report.numPassedTests, 0); assert.equal(report.numPendingTests, 11); assert.equal(report.numTodoTests, 0);
    assert.equal(report.testResults.length, 1); const suite = report.testResults[0]; assert.equal(path.resolve(suite.name), copy); assert.equal(suite.message, ''); assert.equal(suite.assertionResults.length, 13);
    const failures = suite.assertionResults.filter(row => row.status === 'failed'); assert.equal(failures.length, 2);
    const prefix = 'Soccer Career: the story keeps the save small the longest career on seed ';
    assert.deepEqual(failures.map(row => row.fullName).sort(), [9749, 9750].map(seed => prefix + seed + ' plus ten dugout seasons stays under the bound'));
    for (const row of suite.assertionResults) if (row.status !== 'failed') { assert(['skipped', 'pending'].includes(row.status)); assert.equal(row.failureMessages.length, 0); }
    for (const seed of [9749, 9750]) {
      const measurement = JSON.parse(fs.readFileSync(path.join(caseOut, seed + '.measurement.json'), 'utf8'));
      const row = failures.find(value => value.fullName === prefix + seed + ' plus ten dugout seasons stays under the bound');
      assert.equal(row.failureMessages.length, 1);
      const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
      assert.equal(first, 'AssertionError: what the save held before the train still fits the bound it had then: expected ' + measurement.parts.rest + ' to be less than 80000');
      assert.equal(measurement.limits.REST_BOUND, 80000); assert.equal(measurement.limits.SIZE_BOUND, 195000);
      assert.equal(measurement.codec.roundTripEqual, true); assert.equal(measurement.codec.coreAdmitted, true);
      records.push({ seed, primary: first, measurement });
    }
    const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(counters)) if (value !== null) assert.equal(value, 0);
    const raw = (current.stdout || '') + '\n' + (current.stderr || '');
    assert.equal(/Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:/i.test(raw), false);
    write(path.join(out, 'summary.json'), { schema: 1, diagnosticCompleted: true, scope: 'Two original size failures measured, not repaired. Full original state and detached attribution inputs retained. No product, limits or history change.',
      vitestChildren: 1, selectedExecuted: 2, originalRestFailuresRetained: 2, declaredUnselected: 11, actualCodecRoundTrips: 2, records, counters, runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', detectedRuntimeError: false, rawReportSha256: sha(reportBytes) });
  } catch (error) { primary = error; }
  finally {
    try { if (fs.existsSync(copy)) { assert.deepEqual(fs.readFileSync(copy), copyBytes); fs.unlinkSync(copy); } } catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message }); }
    try { hold(); write(path.join(out, 'source-after.json'), receipts()); } catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { diagnosticCompleted: !primary && secondary.length === 0, originalRestFailuresRetained: records.length, removedCopy: !fs.existsSync(copy), primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); } catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary; assert.equal(secondary.length, 0);
  console.log('SC_STORY_SIZE: two existing REST failures retained, two real codec round trips measured; no fix, cap or history change.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
