import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TEST = 'src/test/careerStory.test.tsx', SIM = 'scripts/simCareerStory.mjs';
const PREFIX = 'Soccer Career: the story keeps the save small the longest career on seed ';
const SELECTED = PREFIX + '9749 plus ten dugout seasons stays under the bound';
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const NAMES = [
  'Soccer Career: the story keeps every season twelve seasons on seed 9741: every line kept, in order, once',
  'Soccer Career: the story keeps every season twelve seasons on seed 9742: every line kept, in order, once',
  'Soccer Career: the story keeps every season twelve seasons on seed 9743: every line kept, in order, once',
  'Soccer Career: the story keeps every season the story draws nothing: the same seed without it plays the same career',
  'Soccer Career: the story keeps every season a signing and a loan add to the season log instead of writing over it',
  'Soccer Career: old and damaged stories a save with no story loads empty, shows this season only, and starts its story here',
  'Soccer Career: old and damaged stories a damaged story resets alone',
  'Soccer Career: old and damaged stories a season longer than the cap keeps the cap and counts the rest',
  PREFIX + '9748 plus ten dugout seasons stays under the bound', SELECTED,
  PREFIX + '9750 plus ten dugout seasons stays under the bound',
  'Soccer Career: the story on the real page Latest Events opens the story, a season opens, Back returns, Close shuts it',
  'Soccer Career: the story on the real page the retired screen carries the same story, the last chapter included',
];
const imports = "\nimport { writeFileSync as __shieldWrite } from 'node:fs';\n";
const laboratory = String.raw`

function __shieldSizeInput(original: CareerState): CareerState {
  const mode = process.env.SC_STORY_PARTS_MODE;
  const input = JSON.parse(JSON.stringify(original)) as CareerState;
  const before = saveParts(original), originalBytes = JSON.stringify(original);
  const rows = input.seasons.filter(row => row.extraCups !== undefined);
  if (!rows.length) throw new Error('Actual saved result foundation required');
  const setResult = (row: CareerState['seasons'][number], value: unknown) => { (row as unknown as Record<string, unknown>).extraCups = value; };
  if (mode === 'oversized-result') for (const row of rows) row.extraCups = [...row.extraCups!, ...row.extraCups!, ...row.extraCups!];
  else if (mode === 'oversized-root') (input.extraCupQualification as unknown as Record<string, unknown>).rawOversize = 'x'.repeat(1200);
  else if (mode === 'mirror' || mode === 'oversized-mirror') {
    if (input.pendingSummary !== null && input.pendingSummary !== undefined) throw new Error('Actual final-state mirror foundation must be absent');
    input.pendingSummary = JSON.parse(JSON.stringify(rows[0])) as CareerState['seasons'][number];
    if (mode === 'oversized-mirror') setResult(input.pendingSummary, 'x'.repeat(40000));
  } else if (mode === 'malformed-result') for (const row of rows) setResult(row, { malformed: 'x'.repeat(2200) });
  else if (mode === 'unknown-result') for (const row of rows) setResult(row, 'x'.repeat(2200));
  else if (mode === 'unknown-root') (input as unknown as Record<string, unknown>).extraCupQualification = 'x'.repeat(1200);
  else if (mode === 'null') for (const row of rows) setResult(row, null);
  else if (mode !== 'healthy-copy') throw new Error('Unknown raw accounting laboratory');
  const after = saveParts(input), inputBytes = JSON.stringify(input);
  const file = process.env.SC_STORY_PARTS_EVIDENCE;
  if (!file) throw new Error('Explicit accounting evidence path required');
  __shieldWrite(file, JSON.stringify({ mode, scope: 'Detached raw accounting laboratory only, not a natural result, accepted save or product change',
    original, input, before, after, changed: inputBytes !== originalBytes, originalHeld: JSON.stringify(original) === originalBytes }, null, 2) + '\n', { flag: 'wx' });
  return input;
}
`;
const oldRest = '    rest: bytesOf({ ...s, leagueWorld: undefined, chanceWheel: undefined, generatedBallonPool: undefined, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined, cupRun: r.cupRun?.opening ? { ...r.cupRun, opening: undefined } : r.cupRun })) }),';
const newRest = '    rest: bytesOf({ ...s, leagueWorld: undefined, chanceWheel: undefined, generatedBallonPool: undefined, extraCupQualification: undefined, pendingSummary: s.pendingSummary ? { ...s.pendingSummary, extraCups: undefined } : s.pendingSummary, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined, extraCups: undefined, cupRun: r.cupRun?.opening ? { ...r.cupRun, opening: undefined } : r.cupRun })) }),';

async function main() {
  assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
  const root = process.cwd(); assert(process.env.SC_STORY_PARTS_OUT);
  const out = path.resolve(process.env.SC_STORY_PARTS_OUT); assert(out.startsWith(path.join(root, 'tmp') + path.sep));
  assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0); fs.mkdirSync(out, { recursive: true });
  const relative = value => path.relative(root, value).split(path.sep).join('/');
  const held = new Map();
  for (const file of [TEST, SIM, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerExtraCups.ts', 'src/lib/soccerCareerSave.ts',
    'vitest.config.ts', 'tsconfig.app.json', 'package.json', 'package-lock.json', 'scripts/lib/offlineTransport.cjs', relative(fileURLToPath(import.meta.url))]) {
    const bytes = await fs.promises.readFile(path.join(root, file)); held.set(file, Buffer.from(bytes));
  }
  assert.equal(sha(held.get(TEST)), 'd0bd9df10204c4dfb1775a0422ed3a0aa35a5d3b71a0dbb02574b0580d333e02');
  assert.equal(sha(held.get(SIM)), 'ee9504e8ce3293df4e7d0aabd1be301c893fee23d283b067dc1651ea23c4929e');
  assert.equal(sha(held.get('src/lib/soccerCareerEngine.ts')), '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c');
  const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
  const holds = () => { for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, file); };
  const testText = fs.readFileSync(path.join(root, TEST), 'utf8').replace(/\r\n/g, '\n');
  const simText = fs.readFileSync(path.join(root, SIM), 'utf8').replace(/\r\n/g, '\n');
  const replaceOne = (body, before, after) => { assert.equal(body.split(before).length, 2, 'Unique owned code anchor'); return body.replace(before, after); };
  const baseCopy = replaceOne(replaceOne(testText, "import * as E from '@/lib/soccerCareerEngine';", "import * as E from '@/lib/soccerCareerEngine';" + imports), '    const p = saveParts(s);', '    const p = saveParts(__shieldSizeInput(s));') + laboratory;
  assert.equal(baseCopy.slice(0, -laboratory.length).replace('    const p = saveParts(__shieldSizeInput(s));', '    const p = saveParts(s);').replace(imports, ''), testText);
  const testCopy = path.join(root, 'src/test/__sc_story_parts_' + process.pid + '.test.tsx');
  const simCopy = path.join(root, 'scripts/__sc_story_parts_' + process.pid + '.mjs');
  assert(!fs.existsSync(testCopy) && !fs.existsSync(simCopy));
  let copyTestBytes = null, copySimBytes = null, primary = null; const secondary = [], units = [], sims = [];
  write(path.join(out, 'source-before.json'), receipts());
  const clean = ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'SC_EXTRA_CUPS_ENGINE', 'CAREER_STORY_CONTROL', 'CAREER_STORY_SEEDS',
    'SC_STORY_PARTS_MODE', 'SC_STORY_PARTS_EVIDENCE', 'NO_DOUBLE_SWAP', 'TYCOON_AWAY_CONTROL', 'COMPLETION_HOOK'];
  function execute(name, args, extra = {}, timeout = 240000) {
    const env = { ...process.env, NODE_OPTIONS: '' }; for (const key of clean) delete env[key]; Object.assign(env, extra);
    env.SIM_OFFLINE_RECEIPT = path.join(out, name + '.transport'); fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
    const argv = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), ...args]; write(path.join(out, name + '.argv.json'), [process.execPath, ...argv]);
    const result = spawnSync(process.execPath, argv, { cwd: root, env, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, name + '.stdout'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(out, name + '.stderr'), result.stderr || '', { flag: 'wx' });
    fs.writeFileSync(path.join(out, name + '.exit'), String(result.status) + '\n', { flag: 'wx' });
    write(path.join(out, name + '.process.json'), { status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null });
    assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size, 0); holds();
    if (copyTestBytes) assert.deepEqual(fs.readFileSync(testCopy), copyTestBytes); if (copySimBytes) assert.deepEqual(fs.readFileSync(simCopy), copySimBytes);
    return result;
  }
  function unit(name, file, selected, owner = null, mode = null) {
    const reportFile = path.join(out, name + '.vitest.json'), evidenceFile = path.join(out, name + '.evidence.json');
    const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', relative(file), '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
    if (selected) args.push('--testNamePattern=^' + SELECTED + '$');
    const result = execute(name, args, mode ? { SC_STORY_PARTS_MODE: mode, SC_STORY_PARTS_EVIDENCE: evidenceFile } : {});
    assert.equal(result.status, owner ? 1 : 0); const raw = fs.readFileSync(reportFile), report = JSON.parse(raw);
    assert.equal(report.success, !owner); assert.equal(report.numTotalTests, 13); assert.equal(report.numPendingTests, selected ? 12 : 0);
    assert.equal(report.numFailedTests, owner ? 1 : 0); assert.equal(report.numPassedTests, owner ? 0 : selected ? 1 : 13); assert.equal(report.numTodoTests, 0);
    assert.equal(report.testResults.length, 1); const suite = report.testResults[0]; assert.equal(path.resolve(suite.name), file); assert.equal(suite.message, '');
    assert.deepEqual(suite.assertionResults.map(row => row.fullName).sort(), [...NAMES].sort());
    for (const row of suite.assertionResults) {
      if (selected && row.fullName !== SELECTED) { assert(['pending', 'skipped'].includes(row.status)); assert.deepEqual(row.failureMessages, []); continue; }
      if (!owner) { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); continue; }
      assert.equal(row.status, 'failed'); assert.equal(row.failureMessages.length, 1);
      const first = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.trim();
      assert(first?.startsWith('AssertionError: ' + owner), 'Only actual primary owned assertion may qualify');
    }
    const counters = Object.fromEntries(['numUnhandledErrors', 'numRuntimeErrorTestSuites', 'numRuntimeErrorTests'].map(key => [key, report[key] ?? null]));
    for (const value of Object.values(counters)) if (value !== null) assert.equal(value, 0);
    for (const key of ['errors', 'unhandledErrors']) if (report[key] != null) assert.deepEqual(report[key], []);
    assert.equal(/Unhandled (?:Errors?|Rejection|Exception)|ERR_MODULE_NOT_FOUND|Failed to load url|Cannot find module|SyntaxError:|ReferenceError:|TypeError:/i.test((result.stdout || '') + '\n' + (result.stderr || '')), false);
    let accounting = null;
    if (mode) {
      const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8')); assert.equal(evidence.mode, mode); assert.equal(evidence.originalHeld, true);
      assert.equal(evidence.changed, mode !== 'healthy-copy'); const before = evidence.before, after = evidence.after;
      for (const key of ['cup', 'cupRows', 'division', 'divisionRows', 'ten', 'opening', 'openingRows', 'wheel', 'pool']) assert.equal(after[key], before[key], 'Old part held: ' + key);
      const mirrorDelta = mode === 'mirror' || mode === 'oversized-mirror'
        ? JSON.stringify({ ...evidence.original, pendingSummary: { ...evidence.input.pendingSummary, extraCups: undefined } }).length - JSON.stringify({ ...evidence.original, pendingSummary: evidence.original.pendingSummary }).length : 0;
      assert.equal(after.rest, before.rest + mirrorDelta, 'Complete raw evidence accounting preserves every old remainder field');
      if (mode === 'mirror' || mode === 'oversized-mirror') assert.equal(after.shieldFields, before.shieldFields + 1);
      else assert.equal(after.shieldFields, before.shieldFields);
      if (mode === 'mirror') {
        const row = evidence.input.pendingSummary, envelope = JSON.stringify(row).length - JSON.stringify({ ...row, extraCups: undefined }).length;
        assert.equal(after.shield, before.shield + envelope); assert(envelope > 0);
      }
      if (mode === 'null') assert.equal(after.shield, after.shieldFields * 17, 'Raw null fields retain every key envelope');
      if (mode !== 'oversized-root' && mode !== 'unknown-root') assert.equal(after.shieldQualification, before.shieldQualification);
      accounting = { before, after, changed: evidence.changed, scope: evidence.scope, rawEvidenceSha256: sha(fs.readFileSync(evidenceFile)) };
    }
    const summary = { name, selected, passed: report.numPassedTests, ownedFailures: report.numFailedTests, declaredUnselected: report.numPendingTests,
      reportSha256: sha(raw), owner, accounting, counters, runtimeCounterCompleteness: Object.values(counters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', detectedRuntimeError: false };
    write(path.join(out, name + '.summary.json'), summary); units.push(summary);
  }
  function sim(name, file, oldControl = null, owner = null) {
    const result = execute(name, [file], oldControl ? { CAREER_STORY_CONTROL: oldControl } : {}, 360000);
    assert.equal(result.status, owner ? 1 : 0); const stdout = result.stdout || '', stderr = result.stderr || '';
    assert.equal(/Unhandled (?:Errors?|Rejection|Exception)|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError:|ReferenceError:|TypeError:/i.test(stdout + '\n' + stderr), false);
    assert.equal(stderr, ''); assert(stdout.includes('careers 96 (4 seeds x 24)'));
    const groups = Object.fromEntries([...stdout.matchAll(/^check (completeness|draws|size|log|parts): (.+)$/gm)].map(row => [row[1], row[2]]));
    assert.equal(Object.keys(groups).length, 5);
    if (oldControl) {
      const headline = stdout.split(/\r?\n/).filter(line => line.startsWith('simCareerStory control ' + oldControl + ': fired, check parts failed as it must (failed: '));
      assert.equal(headline.length, 1); assert(/^FAIL \(\d+\)$/.test(groups.parts));
      for (const key of ['completeness', 'draws', 'log']) assert.equal(groups[key], 'ok');
      const failedGroups = Object.keys(groups).filter(key => groups[key] !== 'ok');
      assert.equal(headline[0], 'simCareerStory control ' + oldControl + ': fired, check parts failed as it must (failed: ' + failedGroups.join(', ') + ')');
    } else if (owner) {
      assert.equal(groups.parts, 'FAIL (1)'); for (const key of ['completeness', 'draws', 'size', 'log']) assert.equal(groups[key], 'ok');
      const failures = stdout.split(/\r?\n/).filter(line => line.startsWith('  ')); assert.equal(failures.length, 1); assert(failures[0].trim().startsWith(owner));
      assert(stdout.includes('simCareerStory: RED, parts'));
    } else { for (const value of Object.values(groups)) assert.equal(value, 'ok'); assert(stdout.includes('simCareerStory: GREEN, 96 careers')); }
    const summary = { name, rawExit: result.status, actualCareers: 96, existingControl: oldControl, owner, groups, runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN', stdoutSha256: sha(stdout) };
    write(path.join(out, name + '.summary.json'), summary); sims.push(summary);
  }
  try {
    copyTestBytes = Buffer.from(baseCopy); fs.writeFileSync(testCopy, copyTestBytes, { flag: 'wx' });
    write(path.join(out, 'unit-copy-transform.json'), { originalSha256: sha(held.get(TEST)), copySha256: sha(copyTestBytes), imports, appended: laboratory, originalPartsCall: '    const p = saveParts(s);', copiedPartsCall: '    const p = saveParts(__shieldSizeInput(s));', wholeInverse: true });
    assert.equal(execute('types', [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json']).status, 0);
    unit('unit-current', path.join(root, TEST), false);
    const modes = [
      ['healthy-copy', null], ['mirror', null], ['null', null],
      ['oversized-result', 'SC_STORY_SHIELD_FIELDS:'], ['oversized-root', 'SC_STORY_SHIELD_QUALIFICATION:'],
      ['oversized-mirror', 'SC_STORY_SHIELD_FIELDS:'], ['malformed-result', 'SC_STORY_SHIELD_FIELDS:'],
      ['unknown-result', 'SC_STORY_SHIELD_FIELDS:'], ['unknown-root', 'SC_STORY_SHIELD_QUALIFICATION:'],
    ];
    for (const [mode, owner] of modes) unit('unit-' + mode, testCopy, true, owner, mode);
    const oldCopy = replaceOne(baseCopy, newRest, oldRest); assert.notEqual(oldCopy, baseCopy);
    write(path.join(out, 'unit-old-rest.edit.json'), { before: newRest, after: oldRest, originalSha256: sha(copyTestBytes), changedSha256: sha(oldCopy), inverseExact: replaceOne(oldCopy, oldRest, newRest) === baseCopy });
    copyTestBytes = Buffer.from(oldCopy); fs.writeFileSync(testCopy, copyTestBytes); fs.writeFileSync(path.join(out, 'unit-old-rest.source.tsx'), copyTestBytes, { flag: 'wx' });
    unit('unit-old-rest', testCopy, true, 'what the save held before the train still fits the bound it had then:', 'healthy-copy');
    copyTestBytes = Buffer.from(baseCopy); fs.writeFileSync(testCopy, copyTestBytes); assert.deepEqual(fs.readFileSync(testCopy), copyTestBytes);
    unit('unit-restored', path.join(root, TEST), false);
    sim('sim-current', path.join(root, SIM));
    for (const control of ['worldmoves', 'cuptwice', 'poolcopy']) sim('sim-old-' + control, path.join(root, SIM), control);
    const guardAnchor = 'const shieldMean = part.shield / Math.max(1, part.shieldFields);';
    const faults = [
      ['result-envelope', 'part.shield = (SHIELD_BYTES_PER_FIELD + 1) * Math.max(1, part.shieldFields);', 'mean Shield result field envelope'],
      ['root-envelope', 'part.shieldQualification = (SHIELD_QUALIFICATION_BYTES + 1) * Math.max(1, part.shieldQualificationFields);', 'mean Shield root qualification field envelope'],
      ['result-count', 'part.shieldFields = 0;', 'mean Shield result field envelope'],
      ['root-count', 'part.shieldQualificationFields = 0;', 'mean Shield root qualification field envelope'],
    ];
    for (const [id, mutation, owner] of faults) {
      const changed = replaceOne(simText, guardAnchor, mutation + '\n' + guardAnchor); assert.notEqual(changed, simText);
      assert.equal(replaceOne(changed, mutation + '\n' + guardAnchor, guardAnchor), simText);
      copySimBytes = Buffer.from(changed); fs.writeFileSync(simCopy, copySimBytes, { flag: fs.existsSync(simCopy) ? 'w' : 'wx' });
      fs.writeFileSync(path.join(out, 'sim-' + id + '.source.mjs'), copySimBytes, { flag: 'wx' });
      write(path.join(out, 'sim-' + id + '.edit.json'), { before: guardAnchor, after: mutation + '\n' + guardAnchor, originalSha256: sha(held.get(SIM)), changedSha256: sha(copySimBytes), wholeInverse: true, scope: 'Physical copied observation fault after the unchanged actual cohort, no game result or tracked source mutation' });
      sim('sim-' + id, simCopy, null, owner);
    }
    copySimBytes = Buffer.from(simText); fs.writeFileSync(simCopy, copySimBytes); assert.equal(sha(copySimBytes), sha(held.get(SIM)));
    sim('sim-restored', simCopy);
    assert.equal(units.length, 12); assert.equal(sims.length, 9);
    const totals = units.reduce((sum, row) => ({ healthy: sum.healthy + row.passed, owned: sum.owned + row.ownedFailures, unselected: sum.unselected + row.declaredUnselected }), { healthy: 0, owned: 0, unselected: 0 });
    assert.deepEqual(totals, { healthy: 29, owned: 7, unselected: 120 });
    write(path.join(out, 'summary.json'), { schema: 1, completed: true, scope: 'Accounting-only Story qualification. Full original13cases, unchanged actual permanent cohort and bounded raw-accounting/copied-observation controls; no engine, codec or history change.',
      unitChildren: units.length, unitTotals: totals, unitExecuted: totals.healthy + totals.owned, simChildren: sims.length, simActualCareers: sims.reduce((n, row) => n + row.actualCareers, 0),
      simNewOwnedFailures: sims.filter(row => row.owner).length, simExistingControls: sims.filter(row => row.existingControl).length, units, sims });
  } catch (error) { primary = error; }
  finally {
    for (const [file, bytes] of [[testCopy, copyTestBytes], [simCopy, copySimBytes]]) {
      try { if (fs.existsSync(file)) { assert.deepEqual(fs.readFileSync(file), bytes); fs.unlinkSync(file); } } catch (error) { secondary.push({ stage: 'copy-cleanup', name: error.name, message: error.message }); }
    }
    try { holds(); write(path.join(out, 'source-after.json'), receipts()); } catch (error) { secondary.push({ stage: 'source-holds', name: error.name, message: error.message }); }
    try { write(path.join(out, 'receipt.json'), { complete: !primary && secondary.length === 0, unitChildren: units.length, simChildren: sims.length, copiesRemoved: !fs.existsSync(testCopy) && !fs.existsSync(simCopy), primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); } catch (error) { secondary.push({ stage: 'receipt', name: error.name, message: error.message }); }
  }
  if (primary) throw primary; assert.equal(secondary.length, 0);
  console.log('SC_STORY_PARTS: original13/current+restored, 7ownedunit faults, rawnull/mirror accounting, permanent healthy/restored+3existing+4new controls qualified.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
