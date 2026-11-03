import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
assert(process.env.CQ_REPORT_OUT, 'CQ_REPORT_OUT must name a fresh evidence directory');
const out = path.resolve(process.env.CQ_REPORT_OUT);
assert(!fs.existsSync(out), 'Refuse an existing evidence directory');
fs.mkdirSync(out, { recursive: true });
const temporaryParent = path.join(root, 'tmp');
fs.mkdirSync(temporaryParent, { recursive: true });
const work = fs.mkdtempSync(path.join(temporaryParent, 'conquest-report-copy-'));
assert.equal(path.dirname(work), temporaryParent);
const pagePath = 'src/pages/SoccerConquest.tsx';
const boardPath = 'src/components/conquest/ImperialismBoardShared.tsx';
const testPath = 'src/test/conquestReportProgress.test.tsx';
const pageCopy = path.join(work, 'SoccerConquest.tsx');
const boardCopy = path.join(work, 'ImperialismBoardShared.tsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = bytes => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const pins = [
  { file: pagePath, sha256: 'ed441c188dcf6d1f2d4b7036170d45bd316073c64a5bbeff51bb635d7cecb344' },
  { file: boardPath, sha256: '95f9bc6416085aa9da3a0f31d41363e1fdf94168de9f4cf5282c318a0f12308b' },
  { file: testPath, sha256: '573fa22efe55b5891e0346a42f2a298cdc3f1295557020bd6f8622a7eff554dc' },
  { file: 'vitest.config.ts', git: 'ed2a9dc677f77dfe95c061064eeff5782b856864' },
  { file: 'src/lib/reportContext.ts', git: '8fdc7777c10fc0bd8c3571ccc413ac5800e53141' },
  { file: 'src/lib/conquestDaily.ts', git: 'fc09754cfa372fc8627b533594ed492c1231b22b' },
  { file: 'src/lib/conquestRun.ts', git: 'fd155a5f86588c87b39a6241c3e2c1560e28f322' },
  { file: 'src/components/conquest/ConquestScenePlayer.tsx', git: 'f933ed0203682ed9aa1b632ea144a5490a9b8e14' },
  { file: 'src/components/seo/GameSeoContent.tsx', git: '99641cb799293a9c782307b058910d918db857b1' },
  { file: 'src/components/game/ReportQuestion.tsx', git: 'c8d175d3c25548450130c49246969c298a4f1243' },
  { file: 'src/components/game/ReportSiteIssue.tsx', git: '0205eea93e0d25c501ee2e9e9c01af9112a4345f' },
  { file: 'src/hooks/useReportDraftLifecycle.ts', git: 'b800429eba7274e76d42cd366f933e272d76bac0' },
  { file: 'src/test/reportContext.test.ts', git: 'e29aa32963122ba5a44698cc8708588c26210c1e' },
  { file: 'src/test/gameReportPlacement.test.tsx', git: '0442dfe03503bf2c0eb391bd27bd63068018bf45' },
  { file: 'src/test/reportDetails.test.tsx', git: '21c81d4f4bb723504642c802790136278a2fe567' },
  { file: 'src/test/reportDraftLifecycle.test.tsx', git: '70d3475d49e0d40fe7de50b7697fcb2c27bb9f2e' },
];
const regressions = pins.filter(row => row.file.startsWith('src/test/') && row.file !== testPath).map(row => row.file);
const fullNames = [
  'Conquest guide report progress CQ_REPORT_CURRENT_AND_CONTROLS uses actual mounted progress and control states',
  'Conquest guide report progress CQ_REPORT_PRIVACY_AND_GAME_HOLDS preserves paired game and report boundaries',
  'Conquest guide report progress CQ_REPORT_MOUNT_CLEANUP clears a removed Board and replaced subscriber',
];
const alias = JSON.stringify({ '@/pages/SoccerConquest': pageCopy, '@/components/conquest/ImperialismBoardShared': boardCopy });
const held = new Map();
const inputs = [];
for (const pin of pins) {
  const bytes = fs.readFileSync(pin.file);
  held.set(pin.file, bytes);
  inputs.push({ ...pin, actualBytes: bytes.length, actualSha256: sha(bytes), actualGit: git(bytes) });
}
write('inputs.json', inputs);
for (const pin of inputs) {
  if (pin.sha256) assert.equal(pin.actualSha256, pin.sha256, pin.file);
  if (pin.git) assert.equal(pin.actualGit, pin.git, pin.file);
}
for (const [file, bytes] of [[pagePath, held.get(pagePath)], [boardPath, held.get(boardPath)]]) {
  fs.writeFileSync(path.join(out, file === pagePath ? 'Page.held.tsx' : 'Board.held.tsx'), bytes);
}
const controls = [
  {
    name: 'missing-page-callback', file: pagePath, selected: fullNames[0], owner: 'CQ_REPORT_CURRENT',
    before: ' onReportProgressChange={setReportProgress}', after: '',
  },
  {
    name: 'forbidden-club-field', file: boardPath, selected: fullNames[1], owner: 'CQ_REPORT_PRIVACY',
    before: "      phase, mode, puzzleDate: mode === 'daily' ? todayStr : null,",
    after: "      phase, mode, puzzleDate: mode === 'daily' ? todayStr : null,\n      privateClub: run?.favorite,",
  },
  {
    name: 'missing-unmount-cleanup', file: boardPath, selected: fullNames[2], owner: 'CQ_REPORT_CLEANUP',
    before: '  useEffect(() => () => { onReportProgressChange?.(null); }, [onReportProgressChange]);',
    after: '  useEffect(() => () => {}, [onReportProgressChange]);',
  },
  {
    name: 'premature-continue-ready', file: boardPath, selected: fullNames[0], owner: 'CQ_REPORT_CONTROL_SEMANTICS',
    before: "    : sceneActive ? 'scene-playing' : run?.lastRound ? 'ready' : 'not-rendered';",
    after: "    : sceneActive ? 'ready' : run?.lastRound ? 'ready' : 'not-rendered';",
  },
  {
    name: 'publication-extra-rng', file: boardPath, selected: fullNames[1], owner: 'CQ_REPORT_RNG_PUBLICATION',
    before: '    onReportProgressChange?.({',
    after: '    if (onReportProgressChange) session?.rng();\n    onReportProgressChange?.({',
  },
  {
    name: 'publication-storage-write', file: boardPath, selected: fullNames[1], owner: 'CQ_REPORT_STORE_PUBLICATION',
    before: '    onReportProgressChange?.({',
    after: "    if (onReportProgressChange) localStorage.setItem('cq-report-control-write', 'FICTIONAL CONTROL WRITE');\n    onReportProgressChange?.({",
  },
];
const children = [], changes = [];
const installHealthyCopies = () => {
  fs.writeFileSync(pageCopy, held.get(pagePath));
  fs.writeFileSync(boardCopy, held.get(boardPath));
  assert(fs.readFileSync(pageCopy).equals(held.get(pagePath)));
  assert(fs.readFileSync(boardCopy).equals(held.get(boardPath)));
};
function run(name, selected = null, copied = true, ordinary = false) {
  const directory = path.join(out, name);
  fs.mkdirSync(directory);
  const reportFile = path.join(directory, 'vitest.json');
  const argv = ['node_modules/vitest/vitest.mjs', 'run', testPath, ...(ordinary ? regressions : []), '--reporter=json', '--outputFile=' + reportFile];
  if (selected) argv.push('-t', selected);
  const env = {
    ...process.env, CI: '1', SIM_NETWORK: 'offline',
    CQ_REPORT_EVIDENCE: path.join(directory, 'observations'),
    SIM_OFFLINE_RECEIPT: path.join(directory, 'transport.log'),
    NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'),
    NO_DOUBLE_SWAP: copied ? alias : '', US_BOARD_CONTROL_ALIAS: '', US_BOARD_CONTROL_FILE: '',
  };
  fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '');
  fs.writeFileSync(path.join(directory, 'argv.json'), JSON.stringify({ command: process.execPath, argv, selected, copied, ordinary, aliases: copied ? JSON.parse(alias) : null, nodeOptions: env.NODE_OPTIONS, timeoutMs: 180000 }, null, 2));
  const result = spawnSync(process.execPath, argv, { cwd: root, env, encoding: 'utf8', timeout: 180000, killSignal: 'SIGTERM', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'stdout.log'), result.stdout ?? '');
  fs.writeFileSync(path.join(directory, 'stderr.log'), result.stderr ?? '');
  let report = null, parseError = null;
  if (fs.existsSync(reportFile)) {
    try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch (error) { parseError = String(error); }
  }
  const receipt = {
    name, selected, copied, ordinary, status: result.status, signal: result.signal, spawnError: result.error?.message ?? null, parseError,
    runtimeCounters: {
      unhandledErrors: report?.unhandledErrors ?? null,
      runtimeErrorSuites: report?.numRuntimeErrorTestSuites ?? null,
    },
    runtimeCounterCompleteness: typeof report?.numRuntimeErrorTestSuites === 'number' ? 'PARTIAL_REPORTED' : 'UNKNOWN',
    guardedTransportBytes: fs.statSync(env.SIM_OFFLINE_RECEIPT).size,
  };
  fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2));
  const child = { receipt, report };
  children.push(child);
  return child;
}
const assertions = child => (child.report?.testResults ?? []).flatMap(file => (
  (file.assertionResults ?? []).map(row => ({ ...row, file: file.name }))
));
const firstLine = row => String(row.failureMessages?.[0] ?? '').replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/)[0].trim();
function validate(child, control = null) {
  const { receipt, report } = child;
  assert(report, receipt.name + ' must retain actual raw Vitest JSON');
  assert.equal(receipt.signal, null, receipt.name + ' signal');
  assert.equal(receipt.spawnError, null, receipt.name + ' spawn error');
  assert.equal(receipt.parseError, null, receipt.name + ' parse error');
  assert.equal(receipt.guardedTransportBytes, 0, receipt.name + ' guarded attempted transport');
  if (typeof report.numRuntimeErrorTestSuites === 'number') assert.equal(report.numRuntimeErrorTestSuites, 0, receipt.name + ' reported runtime errors');
  if (Array.isArray(report.unhandledErrors)) assert.equal(report.unhandledErrors.length, 0, receipt.name + ' reported unhandled errors');
  const rows = assertions(child);
  const ours = rows.filter(row => fullNames.includes(row.fullName));
  assert.deepEqual(ours.map(row => row.fullName).sort(), [...fullNames].sort(), receipt.name + ' exact three identities');
  if (!control) {
    assert.equal(receipt.status, 0, receipt.name + ' actual healthy exit');
    assert.equal(report.success, true, receipt.name + ' healthy success');
    assert(rows.length >= 3);
    if (receipt.selected) {
      assert.equal(rows.length, 3);
      const selected = rows.filter(row => row.fullName === receipt.selected);
      assert.equal(selected.length, 1);assert.equal(selected[0].status, 'passed', receipt.name + ' restored selected identity passes');
      assert(rows.filter(row => row.fullName !== receipt.selected).every(row => ['pending', 'skipped'].includes(row.status)), receipt.name + ' two restored unselected cases');
    } else assert(rows.every(row => row.status === 'passed'), receipt.name + ' all selected original and new cases pass');
    if (receipt.ordinary) {
      const files = new Set((report.testResults ?? []).map(file => path.relative(root, file.name).replace(/\\/g, '/')));
      assert.deepEqual([...files].sort(), [testPath, ...regressions].sort(), 'All four existing report regression files ran');
    } else assert.equal(rows.length, 3);
  } else {
    assert.equal(receipt.status, 1, control.name + ' exact actual failing exit');
    assert.equal(rows.length, 3);
    const failed = rows.filter(row => row.status === 'failed');
    assert.equal(failed.length, 1, control.name + ' one owned assertion');
    assert.equal(failed[0].fullName, control.selected);
    assert(firstLine(failed[0]).startsWith('AssertionError: ' + control.owner), control.name + ' must fail at the native primary owner, not diagnostics or setup: ' + firstLine(failed[0]));
    const unselected = rows.filter(row => row.fullName !== control.selected);
    assert.equal(unselected.length, 2);
    assert(unselected.every(row => ['pending', 'skipped'].includes(row.status)), control.name + ' exactly two declared unselected cases');
  }
  return { ...receipt, cases: rows.map(row => ({ file: path.relative(root, row.file), fullName: row.fullName, status: row.status, primary: row.status === 'failed' ? firstLine(row) : null })) };
}
let primary = null, cleanupError = null, validations = [];
try {
  run('current-with-existing-regressions', null, false, true);
  installHealthyCopies();
  run('healthy-copy');
  assert(fs.readFileSync(pageCopy).equals(held.get(pagePath)));
  assert(fs.readFileSync(boardCopy).equals(held.get(boardPath)));
  for (const control of controls) {
    installHealthyCopies();
    const file = control.file === pagePath ? pageCopy : boardCopy;
    const before = held.get(control.file).toString('utf8');
    const offset = before.indexOf(control.before);
    assert(offset >= 0 && offset === before.lastIndexOf(control.before), control.name + ' exact unique executable span');
    const changed = before.slice(0, offset) + control.after + before.slice(offset + control.before.length);
    assert.notEqual(changed, before, control.name + ' must change actual bytes');
    const inverse = changed.slice(0, offset) + control.before + changed.slice(offset + control.after.length);
    assert.equal(inverse, before, control.name + ' whole inverse');
    fs.writeFileSync(file, changed);
    const changedBytes = fs.readFileSync(file);
    assert.equal(changedBytes.toString('utf8'), changed);
    fs.writeFileSync(path.join(out, control.name + '.mutated.tsx'), changedBytes);
    changes.push({ ...control, offset, beforeBytes: Buffer.byteLength(before), afterBytes: changedBytes.length, beforeSha256: sha(Buffer.from(before)), changedSha256: sha(changedBytes), wholeInverse: true, changed: true });
    write('physical-controls.json', changes);
    run(control.name, control.selected);
    assert(fs.readFileSync(file).equals(changedBytes), control.name + ' copied source held through execution');
    fs.writeFileSync(file, held.get(control.file));
    assert(fs.readFileSync(file).equals(held.get(control.file)), control.name + ' exact physical restore');
    run(control.name + '-restored', control.selected);
  }
  installHealthyCopies();
  run('restored');
  assert.equal(children.length, 15);
  validations = children.map(child => validate(child, controls.find(control => control.name === child.receipt.name) ?? null));
  assert.equal(changes.length, 6);
} catch (error) {
  primary = { name: error.name, message: error.message, stack: error.stack };
} finally {
  try {
    installHealthyCopies();
    const final = [];
    for (const [file, bytes] of held) {
      const after = fs.readFileSync(file);
      assert(after.equals(bytes), file + ' tracked bytes held');
      final.push({ file, bytes: after.length, sha256: sha(after), git: git(after) });
    }
    write('held-after.json', final);
    assert(fs.readFileSync(pageCopy).equals(held.get(pagePath)));
    assert(fs.readFileSync(boardCopy).equals(held.get(boardPath)));
    fs.unlinkSync(pageCopy); fs.unlinkSync(boardCopy); fs.rmdirSync(work);
    assert(!fs.existsSync(work));
  } catch (error) { cleanupError = { name: error.name, message: error.message, stack: error.stack }; }
  write('summary.json', {
    completed: !primary && !cleanupError, primary, cleanupError, validations,
    attemptedChildren: children.map(child => child.receipt), physicalControls: changes,
    expectedNewCaseExecutions: 21, expectedNewHealthy: 15, expectedOwnedFailures: 6, expectedUnselected: 24,
    existingRegressionExecutions: validations[0]?.cases.filter(row => !fullNames.includes(row.fullName)).length ?? null,
    runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN',
    scope: 'Guide-origin scalar report progress only. Original first-match hard blocker remains UNREPRODUCED. No natural-scene, physical-phone, full App, release or footer enrichment claim.',
  });
}
if (primary || cleanupError) {
  console.error(JSON.stringify({ primary, cleanupError }));
  process.exitCode = 1;
} else console.log('Conquest guide report progress: three mounted cases, four existing report suites, six owned physical controls and exact restores passed.');
