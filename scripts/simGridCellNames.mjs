/* Source-only draft. Actual execution is authorized separately and runs remotely. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url), ROOT = path.resolve(path.dirname(SELF), '..');
const TEST = 'src/test/gridCellNames.test.tsx', TEST_SHA256 = 'bff0d6ff1be6f8505da7acda918f08d60d34253215a4ba45e871064bc349825e';
const BOARDS = [{"id":"football","file":"src/components/football-grid/GridBoard.tsx","alias":"@/components/football-grid/GridBoard","originalSha256":"e7dd8bd90773eb81acbf5f9df534379a3051acf8608baf507d1b520433f9a251","fixedSha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","originalBytes":5514,"fixedBytes":5745,"physicalSourceSha256":"108a88efe15ec0246f7f1d8576f98924557d432a9d616a35a1634138255edbce","hunks":[{"id":"prepend-current-criteria-and-status","before":"                  {cell.status === 'correct' && cell.playerName ? (","after":"                  <span className=\"sr-only\">{row.label}, {puzzle.cols[colIdx].label}: {cell.status === 'correct' ? 'Correct' : cell.status === 'wrong' ? 'Try again' : 'Choose a player'}</span>\n                  {cell.status === 'correct' && cell.playerName ? ("},{"id":"hide-only-decorative-wrong-cross","before":"                    <span className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>","after":"                    <span aria-hidden=\"true\" className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>"},{"id":"hide-only-decorative-fallback-plus","before":"                    <span className=\"text-lg text-muted-foreground/30\">+</span>","after":"                    <span aria-hidden=\"true\" className=\"text-lg text-muted-foreground/30\">+</span>"}],"controls":{"prefix":[{"before":"                  <span className=\"sr-only\">{row.label}, {puzzle.cols[colIdx].label}: {cell.status === 'correct' ? 'Correct' : cell.status === 'wrong' ? 'Try again' : 'Choose a player'}</span>\n                  {cell.status === 'correct' && cell.playerName ? (","after":"                  {cell.status === 'correct' && cell.playerName ? ("}],"icons":[{"before":"                    <span aria-hidden=\"true\" className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>","after":"                    <span className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>"},{"before":"                    <span aria-hidden=\"true\" className=\"text-lg text-muted-foreground/30\">+</span>","after":"                    <span className=\"text-lg text-muted-foreground/30\">+</span>"}],"column":[{"before":"puzzle.cols[colIdx].label","after":"puzzle.cols[(colIdx + 1) % 3].label"}]},"wholeForwardInverseExact":true},{"id":"soccer","file":"src/components/soccer-grid/SoccerGridBoard.tsx","alias":"@/components/soccer-grid/SoccerGridBoard","originalSha256":"b1c025dae9d6d62df4c614c518d1c8527cf25f2ff9afa7127367bdb4c72d8e49","fixedSha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","originalBytes":5014,"fixedBytes":5245,"physicalSourceSha256":"2ac08b865645cd2f521d946d7b2a8674a95c58b34bbe1120112306e022bf54d0","hunks":[{"id":"prepend-current-criteria-and-status","before":"                  {cell.status === 'correct' && cell.playerName ? (","after":"                  <span className=\"sr-only\">{row.label}, {puzzle.cols[colIdx].label}: {cell.status === 'correct' ? 'Correct' : cell.status === 'wrong' ? 'Try again' : 'Choose a player'}</span>\n                  {cell.status === 'correct' && cell.playerName ? ("},{"id":"hide-only-decorative-wrong-cross","before":"                    <span className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>","after":"                    <span aria-hidden=\"true\" className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>"},{"id":"hide-only-decorative-fallback-plus","before":"                    <span className=\"text-lg text-muted-foreground/30\">+</span>","after":"                    <span aria-hidden=\"true\" className=\"text-lg text-muted-foreground/30\">+</span>"}],"controls":{"prefix":[{"before":"                  <span className=\"sr-only\">{row.label}, {puzzle.cols[colIdx].label}: {cell.status === 'correct' ? 'Correct' : cell.status === 'wrong' ? 'Try again' : 'Choose a player'}</span>\n                  {cell.status === 'correct' && cell.playerName ? (","after":"                  {cell.status === 'correct' && cell.playerName ? ("}],"icons":[{"before":"                    <span aria-hidden=\"true\" className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>","after":"                    <span className={cn('text-xs text-destructive font-semibold', motion.wrongContent)}>✗</span>"},{"before":"                    <span aria-hidden=\"true\" className=\"text-lg text-muted-foreground/30\">+</span>","after":"                    <span className=\"text-lg text-muted-foreground/30\">+</span>"}],"column":[{"before":"puzzle.cols[colIdx].label","after":"puzzle.cols[(colIdx + 1) % 3].label"}]},"wholeForwardInverseExact":true}];
const ARM_PINS = [{"sources":[{"bytes":5745,"sha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","board":"football"},{"bytes":5245,"sha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","board":"soccer"}],"arm":"normal"},{"sources":[{"bytes":5514,"sha256":"e7dd8bd90773eb81acbf5f9df534379a3051acf8608baf507d1b520433f9a251","board":"football"},{"bytes":5014,"sha256":"b1c025dae9d6d62df4c614c518d1c8527cf25f2ff9afa7127367bdb4c72d8e49","board":"soccer"}],"arm":"whole-original"},{"sources":[{"bytes":5552,"sha256":"980c822bad1f8945cfb442802187112ddf012c6f5d46463652c2ee7547e539b4","board":"football"},{"bytes":5245,"sha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","board":"soccer"}],"arm":"prefix-football"},{"sources":[{"bytes":5745,"sha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","board":"football"},{"bytes":5052,"sha256":"2a92f95309fca97673cc946e084f52d7db5bc590589e9fa9bf66fc88a53fc4ab","board":"soccer"}],"arm":"prefix-soccer"},{"sources":[{"bytes":5707,"sha256":"619db881e01d8f5685097018ca3388c72a18de55b792c6630070124e3857d80b","board":"football"},{"bytes":5245,"sha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","board":"soccer"}],"arm":"icons-football"},{"sources":[{"bytes":5745,"sha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","board":"football"},{"bytes":5207,"sha256":"ac12fd0e90eb4f7df84dbe9a8fa80c08b78eb41a698cb5cfca9a81afb17b63df","board":"soccer"}],"arm":"icons-soccer"},{"sources":[{"bytes":5755,"sha256":"d3777416cecfa6f391ce5e48a9f423fda4bb77236fcdbe2fb59af9f4adac2c62","board":"football"},{"bytes":5245,"sha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","board":"soccer"}],"arm":"column-rotation-football"},{"sources":[{"bytes":5745,"sha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","board":"football"},{"bytes":5255,"sha256":"614d21cdc2e95e3316f46e2e3070223f0d7c5680e983d158e94760c90e0abd9e","board":"soccer"}],"arm":"column-rotation-soccer"},{"sources":[{"bytes":5745,"sha256":"2d9e784dcf50a15ddc3f1913e581b7ad0d27e7d3f18b0c13fc753e8cd93c874e","board":"football"},{"bytes":5245,"sha256":"1f74a15c502f57c5cf6c8d18614dff63617247d34297c739cbef4e6d883b6190","board":"soccer"}],"arm":"restored"}];
const TITLES = [
  'announces all nine literal empty coordinates and actions',
  'announces all nine wrong actions without decorative crosses',
  'announces correct without a player while retaining the disabled fallback',
  'retains completed full player rarity and badge names',
  'updates all coordinate names when puzzle labels change',
  'preserves enabled identity focus active changes and callback indices',
  'preserves correct locks complete visible content and input records',
];
const VARIANTS = ['Football', 'College', 'Soccer'];
const allNames = VARIANTS.flatMap(variant => TITLES.map(title => "'" + variant + "' grid cell names " + title));
const hash = body => createHash('sha256').update(body).digest('hex');
const lf = body => body.replace(/\r\n/g, '\n');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const pin = file => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; };
const exact = (source, before, after) => {
  assert(before && before !== after); assert.equal(source.split(before).length, 2, 'One effective source edit');
  const changed = source.replace(before, after); assert.notEqual(changed, source); return changed;
};
const apply = (source, edits, inverse = false) => {
  const rows = inverse ? [...edits].reverse() : edits;
  for (const row of rows) source = exact(source, inverse ? row.after : row.before, inverse ? row.before : row.after);
  return source;
};
const faultNames = arm => {
  if (arm === 'normal' || arm === 'restored') return [];
  const variants = arm.endsWith('-football') ? ['Football', 'College'] : arm.endsWith('-soccer') ? ['Soccer'] : VARIANTS;
  const ids = arm.startsWith('icons-') ? [0, 1, 2, 4] : [0, 1, 2, 3, 4];
  return variants.flatMap(variant => ids.map(index => "'" + variant + "' grid cell names " + TITLES[index]));
};
const modeAbsent = !Object.hasOwn(process.env, 'GRID_CELL_NAMES_MODE'), outAbsent = !Object.hasOwn(process.env, 'GRID_CELL_NAMES_OUT'), noArguments = process.argv.length === 2;
const args = new Map();
if (!noArguments) {
  assert.equal(process.argv.length, 8);
  for (let i = 2; i < process.argv.length; i += 2) { assert(['--root', '--mode', '--out'].includes(process.argv[i]) && !args.has(process.argv[i])); args.set(process.argv[i], process.argv[i + 1]); }
  assert.equal(path.resolve(args.get('--root')), ROOT);
}
const mode = noArguments ? (modeAbsent ? 'fixed' : process.env.GRID_CELL_NAMES_MODE) : args.get('--mode');
assert(['baseline', 'fixed'].includes(mode), 'Known explicit baseline or strict fixed mode');
assert(mode !== 'baseline' || !modeAbsent || !noArguments, 'Baseline is explicit only');
if (!modeAbsent) assert.equal(process.env.GRID_CELL_NAMES_MODE, mode);
assert.equal(process.env.SIM_NETWORK, 'offline');
const require = createRequire(SELF);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload required');
assert(!process.env.NO_DOUBLE_SWAP && !process.env.GRID_CELL_NAMES_TRACE, 'No undeclared source or trace override');
const requestedOut = noArguments ? (outAbsent ? null : process.env.GRID_CELL_NAMES_OUT) : args.get('--out');
if (requestedOut) assert(path.isAbsolute(requestedOut) && path.relative(ROOT, requestedOut).split(path.sep).includes('..'), 'Evidence is a fresh absolute outside path');
if (!outAbsent) assert.equal(path.resolve(process.env.GRID_CELL_NAMES_OUT), path.resolve(requestedOut));
const out = requestedOut ? path.resolve(requestedOut) : fs.mkdtempSync(path.join(os.tmpdir(), 'grid-cell-names-evidence-'));
if (requestedOut) { assert(!fs.existsSync(out), 'Fresh evidence output'); fs.mkdirSync(out); }
const inputs = [SELF, path.join(ROOT, TEST), ...BOARDS.map(row => path.join(ROOT, row.file)), ...['vitest.config.ts', 'src/test/setup.ts', 'src/components/game/GridCellMotion.module.css', 'src/components/game/GridCellLayout.module.css', 'scripts/lib/offlineTransport.cjs', 'package-lock.json'].map(file => path.join(ROOT, file))];
const before = inputs.map(pin), actualSources = BOARDS.map(board => ({ ...pin(path.join(ROOT, board.file)), canonicalSha256: hash(lf(fs.readFileSync(path.join(ROOT, board.file), 'utf8'))), board: board.id }));
const report = { version: 1, status: 'running', scope: 'grid-cell-names', mode, productQualified: false, evidenceRoot: out, sourceStage: null, defaultInvocation: { modeAbsent, outAbsent, noArguments }, actualSources, testSha256: hash(fs.readFileSync(path.join(ROOT, TEST))), producerSha256: hash(fs.readFileSync(SELF)), sourcePlan: null, arms: [], totals: { arms: 0, caseExecutions: 0, healthyExecutions: 0, purposeFaults: 0, uniqueCases: 21 }, holds: {}, cleanup: {} };
console.log('GRID_CELL_NAMES_STARTED ' + JSON.stringify({ version: 1, mode, evidenceRoot: out, pid: process.pid, producerSha256: report.producerSha256, defaultInvocation: report.defaultInvocation }));
const ownedCopies = [];
let failed = null;
try {
  assert.equal(report.testSha256, TEST_SHA256, 'Exact focused actual-component tests');
  const stages = actualSources.map((source, i) => source.canonicalSha256 === BOARDS[i].originalSha256 ? 'original' : source.canonicalSha256 === BOARDS[i].fixedSha256 ? 'fixed' : null);
  assert(stages.every(stage => stage !== null && stage === stages[0]), 'Known matching complete source pair');
  report.sourceStage = stages[0];
  if (mode === 'baseline') assert.equal(report.sourceStage, 'original', 'Explicit baseline uses actual original sources');
  const originals = {}, fixed = {};
  for (const board of BOARDS) {
    const actual = lf(fs.readFileSync(path.join(ROOT, board.file), 'utf8'));
    originals[board.id] = report.sourceStage === 'original' ? actual : apply(actual, board.hunks, true);
    assert.equal(hash(originals[board.id]), board.originalSha256);
    fixed[board.id] = apply(originals[board.id], board.hunks);
    assert.equal(hash(fixed[board.id]), board.fixedSha256);
    assert.equal(apply(fixed[board.id], board.hunks, true), originals[board.id], 'Exact entire original inverse');
  }
  const selected = mode === 'baseline' || report.sourceStage === 'original' ? ['normal'] : ARM_PINS.map(row => row.arm), sourcePlanRows = [], previous = {};
  for (const arm of selected) {
    const armDir = path.join(out, arm); fs.mkdirSync(armDir);
    const sources = [];
    for (const board of BOARDS) {
      let body = arm === 'normal' ? lf(fs.readFileSync(path.join(ROOT, board.file), 'utf8')) : fixed[board.id], edits = [];
      if (arm === 'whole-original') body = originals[board.id];
      if (arm === 'prefix-' + board.id) edits = board.controls.prefix;
      if (arm === 'icons-' + board.id) edits = board.controls.icons;
      if (arm === 'column-rotation-' + board.id) edits = board.controls.column;
      body = apply(body, edits);
      if (edits.length) assert.equal(apply(body, edits, true), fixed[board.id], 'Exact whole targeted inverse');
      if (arm === 'restored') { body = previous[board.id]; if (board.id === 'soccer') body = apply(body, board.controls.column, true); assert.equal(body, fixed[board.id], 'Restored from actual preceding complete control'); }
      const expected = ARM_PINS.find(row => row.arm === arm).sources.find(row => row.board === board.id);
      if (!(arm === 'normal' && report.sourceStage === 'original')) assert.equal(hash(body), expected.sha256, 'Frozen whole arm hash');
      const bodyFile = path.join(armDir, board.id + '.source.tsx.txt'); fs.writeFileSync(bodyFile, body);
      sources.push({ board: board.id, file: board.file, alias: board.alias, sha256: hash(body), bytes: Buffer.byteLength(body), body: pin(bodyFile), edits });
      if (arm === 'column-rotation-soccer') previous[board.id] = body;
    }
    sourcePlanRows.push({ arm, sources });
  }
  const planFile = path.join(out, 'source-plan.json');
  write(planFile, { version: 1, mode, sourceStage: report.sourceStage, boards: BOARDS, arms: sourcePlanRows, wholeOriginalAndTargetedInversesExact: true, restoredWholeEqualsFixed: mode === 'baseline' || report.sourceStage === 'original' || sourcePlanRows.at(-1).sources.every(row => row.sha256 === BOARDS.find(board => board.id === row.board).fixedSha256) });
  report.sourcePlan = pin(planFile);
  for (const plan of sourcePlanRows) {
    const armDir = path.join(out, plan.arm), aliases = {}, expectedFaultTitles = mode === 'baseline' ? faultNames('whole-original') : faultNames(plan.arm);
    if (plan.arm !== 'normal') {
      const base = path.join(ROOT, 'src/test'), temp = fs.mkdtempSync(path.join(base, '.grid-names-unit-')); ownedCopies.push(temp);
      for (const source of plan.sources) { const file = path.join(temp, source.board + '.tsx'); fs.copyFileSync(source.body.file, file); assert.equal(hash(fs.readFileSync(file)), source.sha256); aliases[source.alias] = file; }
    }
    const vitestFile = path.join(armDir, 'vitest.json'), traceFile = path.join(armDir, 'trace.json'), transportFile = path.join(armDir, 'transport.transport');
    fs.writeFileSync(transportFile, '', { flag: 'wx' });
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: transportFile, GRID_CELL_NAMES_TRACE: traceFile };
    delete env.NO_DOUBLE_SWAP; if (plan.arm !== 'normal') env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
    const command = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--reporter=json', '--outputFile.json=' + vitestFile, '--maxWorkers=1', '--no-file-parallelism'];
    const started = new Date().toISOString(), child = spawnSync(process.execPath, command, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
    const stdoutFile = path.join(armDir, 'stdout.log'), stderrFile = path.join(armDir, 'stderr.log'); fs.writeFileSync(stdoutFile, child.stdout || ''); fs.writeFileSync(stderrFile, child.stderr || '');
    const procFile = path.join(armDir, 'process.json'); write(procFile, { command: [process.execPath, ...command], cwd: ROOT, pid: child.pid ?? null, started, finished: new Date().toISOString(), status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, stdout: pin(stdoutFile), stderr: pin(stderrFile), aliases });
    assert.ifError(child.error); assert.equal(child.signal, null); assert([0, 1].includes(child.status));
    assert(!/Unhandled (?:Errors?|Rejections?)|Cannot find module|Failed to (?:resolve import|load)|SyntaxError|Transform failed|Test timed out|SIM_OFFLINE_BLOCK/i.test((child.stdout || '') + (child.stderr || '')), 'Setup/runtime failure cannot count as a purpose');
    const vitest = JSON.parse(fs.readFileSync(vitestFile, 'utf8')), cases = vitest.testResults.flatMap(row => row.assertionResults);
    assert.equal(vitest.numUnhandledErrors ?? 0, 0); assert.equal(vitest.numPendingTests, 0); assert.equal(vitest.numTotalTests, 21); assert.equal(cases.length, 21);
    assert.deepEqual(cases.map(row => row.fullName).sort(), [...allNames].sort()); assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
    const faults = cases.filter(row => row.status === 'failed');
    for (const row of faults) assert(row.failureMessages.join('\n').includes('toHaveAccessibleName'), 'Only precise accessible-name assertion faults are accepted');
    assert.equal(child.status, faults.length ? 1 : 0); assert.equal(vitest.numFailedTests, faults.length); assert.equal(vitest.numPassedTests, 21 - faults.length);
    const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8')); assert.equal(trace.version, 1); assert.equal(trace.records.length, 36);
    assert.deepEqual([...new Set(trace.records.map(row => row.variant + ':' + row.id))].sort(), VARIANTS.flatMap(variant => TITLES.map((_, i) => variant + ':' + String(i + 1).padStart(2, '0'))).sort());
    assert(trace.records.every(row => row.buttons.length === 9 && row.buttons.every(button => typeof button.name === 'string' && button.html.includes('data-grid-cell-status='))));
    assert.equal(fs.statSync(transportFile).size, 0);
    const faultTitles = faults.map(row => row.fullName), exactVector = JSON.stringify([...faultTitles].sort()) === JSON.stringify([...expectedFaultTitles].sort());
    const arm = { arm: plan.arm, status: exactVector ? 'passed' : 'failed-purpose', sources: plan.sources, cases: 21, passed: 21 - faults.length, failed: faults.length, faultTitles, expectedFaultTitles, vitest: pin(vitestFile), trace: pin(traceFile), process: pin(procFile), stdout: pin(stdoutFile), stderr: pin(stderrFile), transport: pin(transportFile) };
    report.arms.push(arm); report.totals.arms++; report.totals.caseExecutions += 21; report.totals.healthyExecutions += arm.passed; report.totals.purposeFaults += arm.failed; write(path.join(out, 'report.json'), report);
    if (!exactVector) { const error = new Error('GRID_CELL_NAMES_PURPOSE_VECTOR: actual complete name outcomes differ from the strict expected source arm'); error.purposeFailure = true; throw error; }
  }
  assert.equal(report.arms.length, selected.length); report.status = 'passed';
} catch (error) {
  failed = error; report.status = error.purposeFailure ? 'failed-purpose' : 'failed-setup';
  write(path.join(out, 'failure.json'), { status: report.status, setupOrProtocolFailure: !error.purposeFailure, actualCaseExecutions: report.totals.caseExecutions, message: error.message, stack: error.stack, productQualified: false });
} finally {
  for (const temp of ownedCopies) { assert.equal(path.dirname(temp), path.join(ROOT, 'src/test')); assert(path.basename(temp).startsWith('.grid-names-unit-')); fs.rmSync(temp, { recursive: true, force: true }); assert(!fs.existsSync(temp)); }
  report.cleanup = { copiesRemoved: ownedCopies.every(file => !fs.existsSync(file)) };
  const after = inputs.map(pin); assert.deepEqual(after, before, 'Actual source/tests/producer/config/CSS/locked inputs unchanged');
  report.holds = { sourceHeld: true, testHeld: true, producerHeld: true, inputsHeld: true, transportEmpty: report.arms.every(arm => fs.statSync(arm.transport.file).size === 0) };
  write(path.join(out, 'inputs-before.json'), before); write(path.join(out, 'inputs-after.json'), after); write(path.join(out, 'report.json'), report);
}
if (failed) throw failed;
console.log('simGridCellNames: actual Football College and Soccer components executed with literal fictional clues.');
console.log('simGridCellNames: ' + report.totals.caseExecutions + ' cases, ' + report.totals.healthyExecutions + ' healthy outcomes and ' + report.totals.purposeFaults + ' exact intended name faults.');
console.log('simGridCellNames: actual inputs held, ordinary transport empty and disposable source copies removed.');
console.log('GRID_CELL_NAMES_COMPLETE ' + JSON.stringify({ mode, status: 'passed', productQualified: false, evidenceRoot: out, reportSha256: hash(fs.readFileSync(path.join(out, 'report.json'))), ...report.totals }));
