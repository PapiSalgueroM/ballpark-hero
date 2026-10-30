/* Bounded CBB source-held diagnostic proof. Original visibility is measured,
   not predeclared. A green controller is evidence admission, not a ship gate. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const CHECKOUT = process.cwd(), OUT = path.resolve(process.env.CBB_PROOF_OUT || ''), ROOT = path.join(OUT, 'work');
const BASE = 'a2da3c0bec33018484c050aa6bffe982280f289b';
const BASE_TREE = 'e74e058ddf5793c684c739465b218f9b0f77c6f6';
const BRANCH = 'refs/heads/codex/cbb-start-reveal-fixed-20261030';
const FLOW = 'src/test/cbbDynastyReportFlow.test.tsx';
const DEPTH = 'src/components/cbb-dynasty/CbbDynastyDepth.test.tsx';
const HELPER = 'scripts/qa/probeCbbStartRevealFixed.mjs';
const CONTROLLER = 'scripts/qa/runCbbStartRevealFixedProof.mjs';
const WORKFLOW = '.github/workflows/cbb-start-reveal-fixed-proof.yml';
const APP_SOURCE = 'src/components/college-dynasty/CollegeDynastyBoard.tsx';
const ORIGINAL_BOARD = '91ee2a06e96f8352384a8587e37aba9a8db48f94', FIXED_BOARD = '909be808e4313157649bb901a385b3a903104af6';
const CFB_DEPTH = 'src/components/cfb-dynasty/CfbDynastyDepth.test.tsx';
let expectedBoard = FIXED_BOARD;
const PINS = { [FLOW]: 'fdf7b7e5f7a07254993dbef8c24649b0a044f1cc',
  [HELPER]: '49f9aa8ec7c79e94e4737de806cd1ed469581d99',
  [CFB_DEPTH]: 'dae59dfb41a7e71c3673413582dd73487a6f12f6',
  [DEPTH]: '6524d69c0c5295f180f9858fc0b3de850667cc6e',
  'scripts/qa/freeKickLab1070.mjs': '1cf030d9182fd4fd68fca39f32e757c69bf9e58a' };
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: CHECKOUT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
const save = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const read = name => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
assert(process.env.CI === 'true' && OUT && OUT !== CHECKOUT && !OUT.startsWith(CHECKOUT + path.sep) && path.isAbsolute(OUT), 'Remote CI evidence directory required');
assert.equal(sha(fs.readFileSync(fileURLToPath(import.meta.url))), process.env.CBB_CONTROLLER_SHA256, 'Actual controller body pin');
function sourceState() {
  const names = git('ls-files', '-z').split('\0').filter(Boolean).sort();
  return { head: git('rev-parse', 'HEAD'), refs: git('for-each-ref', '--format=%(refname) %(objectname)'),
    index: sha(fs.readFileSync(git('rev-parse', '--git-path', 'index'))),
    files: names.map(name => ({ path: name, sha256: sha(fs.readFileSync(path.join(CHECKOUT, name))) })) };
}
function held() {
  const initial = read('source.initial.json');
  assert.deepEqual(sourceState(), initial, 'All checkout source, HEAD, refs and default index held');
  for (const row of initial.files) {
    const body = fs.readFileSync(path.join(ROOT, row.path));
    if (row.path === APP_SOURCE) assert.equal(blob(body), expectedBoard, 'Exact current controlled Board body');
    else assert.equal(sha(body), row.sha256, 'All other matched source bodies held: ' + row.path);
  }
  for (const [name, pin] of Object.entries(PINS)) assert.equal(blob(fs.readFileSync(path.join(ROOT, name))), pin, 'Source pin ' + name);
}
function run(id, command, args, extraEnv = {}, timeout = 600000, cwd = ROOT) {
  const dir = path.join(OUT, id); fs.mkdirSync(dir);
  const out = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), err = fs.openSync(path.join(dir, 'stderr.log'), 'wx');
  let child;
  try { child = spawnSync(command, args, { cwd, env: { ...process.env, ...extraEnv }, timeout, stdio: ['ignore', out, err] }); }
  finally { fs.closeSync(out); fs.closeSync(err); }
  const result = { command, args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  save(id + '/process.json', result); fs.writeFileSync(path.join(dir, 'raw.exit'), String(child.status) + '\n');
  assert(!result.error && !result.signal && Number.isInteger(result.status), 'Actual child process completed: ' + id);
  return result.status;
}
function success(id, command, args, env, timeout, cwd) { assert.equal(run(id, command, args, env, timeout, cwd), 0, 'Actual zero exit: ' + id); }
function archive(name, tree) { git('archive', '--format=tar', '-o', path.join(OUT, name), tree); }
function archiveDist(name) { assert.equal(run('archive-' + name.replace(/\.tar$/, ''), 'tar', ['-cf', path.join(OUT, name), '-C', path.join(ROOT, 'dist'), '.']), 0); }
function inventory(dir) {
  const rows = [];
  function walk(at) { for (const e of fs.readdirSync(at, { withFileTypes: true })) {
    const full = path.join(at, e.name); if (e.isDirectory()) walk(full);
    else if (e.isFile()) { const bytes = fs.readFileSync(full); rows.push({ path: path.relative(dir, full).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }); }
  } }
  walk(dir); return rows.sort((a, b) => a.path.localeCompare(b.path));
}
const FLOW_TITLES = ['starts a fresh program and continues real games after saving and reloading',
  'continues an actual completed season through recruiting into another saved season',
  'restores a supported legacy recap without replaying its closed season'];
const DEPTH_TITLES = ['plays a save from before assistant coaches existed without adding anything to it',
  'gives a save from before assistant coaches existed the program layer when its offseason closes',
  'gives a new dynasty its assistants and a schedule with a strength',
  'refuses an assistant the pot cannot cover and changes nothing',
  'lets an assistant go, puts his pay back in the pot, and hires into the empty chair',
  'a reload on the recap draws the recap again, and an older recap save goes to recruiting, never replaying the season'];
const CFB_TITLES = ['plays a save from before coordinators existed without adding anything to it', 'gives a new dynasty its coordinators and a schedule with a strength', 'refuses a coordinator the pot cannot cover and changes nothing', 'lets a coordinator go, puts his pay back in the pot, and hires into the empty chair'];
function units(id, file, titles) {
  const jsonFile = path.join(OUT, id, 'vitest.json');
  const args = ['test', '--', file, '--no-cache', '--maxWorkers=1', '--minWorkers=1',
    '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile.json=' + jsonFile];
  success(id, 'npm', args);
  const result = JSON.parse(fs.readFileSync(jsonFile, 'utf8')), suites = result.testResults;
  assert.equal(result.success, true); assert.equal(result.numTotalTests, titles.length);
  assert.equal(result.numFailedTests, 0); assert.equal(result.numPendingTests, 0); assert.equal(result.numFailedTestSuites, 0);
  assert.equal(suites.length, 1); assert(suites[0].name.replaceAll('\\', '/').endsWith('/' + file));
  assert.deepEqual(suites[0].assertionResults.map(row => row.title).sort(), [...titles].sort());
  assert(suites[0].assertionResults.every(row => row.status === 'passed' && (row.failureMessages || []).length === 0));
  save(id + '/ADMISSION.json', { phase: id, exactCaseCount: titles.length, exactTitles: titles,
    childExit: 0, defaultConfig: 'vitest.config.ts', runtimeCredit: 'Exit0 and actual JSON success with every exact assertion passed' });
  held();
}
function environment() {
  const tools = read('browser-tools.json');
  return { PLAYWRIGHT_BROWSERS_PATH: tools.browsers, FREE_KICK_FONT_CACHE: tools.fonts,
    FONT_CACHE_MANIFEST_SHA256: tools.manifestSHA256, SIM_OFFLINE_RECEIPT: path.join(OUT, 'browser-node-egress.log'),
    NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), CBB_REPORT_SEED: '64185' };
}
function browserReport(id, mode, profile) {
  held(); assert.deepEqual(inventory(path.join(ROOT, 'dist')), read('dist.current.json'), 'Same actual built dist');
  const output = path.join(OUT, id, 'evidence');
  const exit = run(id, process.execPath, [HELPER], { ...environment(), CBB_REPORT_OUT: output, CBB_REVEAL_CONTROL: mode || '', CBB_REVEAL_BOARD_GIT: expectedBoard, CBB_REVEAL_PROFILE: profile });
  const report = JSON.parse(fs.readFileSync(path.join(output, 'REPORT.json'), 'utf8'));
  assert.equal(report.rawExit, exit); assert.deepEqual(report.setupErrors, []);
  assert.equal(report.expectedBoardGit, expectedBoard); assert.equal(report.profile, profile);
  assert.deepEqual(report.viewport, profile === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 1 } : { width: 1280, height: 631, deviceScaleFactor: 1.5 });
  assert(report.contexts.every(c => c.pageErrors.length === 0 && c.localFailures.length === 0));
  if (mode) {
    assert.equal(exit, 1); assert.equal(report.controlOutcome, 'OWNERSHIP_CONTROL_FIRED');
    assert.equal(report.transitions.length, 1); assert.equal(report.transitions[0].visibility, 'INVALID_PROBE');
    assert.equal(report.transitions[0].id, 'fresh'); assert.equal(report.ownershipErrors.length, 1);
    assert.equal(report.ownershipErrors[0].marker, 'CBB_PROBE_NO_EXTRA_SCROLL');
    const mutation = report.transitions[0].controlMutation;
    assert(mutation && Math.abs(mutation.after - mutation.before) >= 32);
    const log = fs.readFileSync(path.join(OUT, id, 'stdout.log'), 'utf8');
    assert.equal(log.split('\n').filter(line => line.startsWith('CBB_CONTROL_NO_EXTRA_SCROLL_APPLIED ')).length, 1);
  } else {
    assert.deepEqual(report.transitions.map(row => row.id), ['fresh', 'next-season']);
    assert.deepEqual(report.ownershipErrors, []);
    assert(report.transitions.every(row => row.validProbe && ['GREEN', 'RED'].includes(row.visibility)));
    const reds = report.transitions.filter(row => row.visibility === 'RED').map(row => row.id);
    assert.equal(exit, reds.length ? 1 : 0, 'Only actual original visibility determines measurement exit');
  }
  held(); assert.deepEqual(inventory(path.join(ROOT, 'dist')), read('dist.current.json'), 'Built dist held after browser');
  return report;
}
const phase = process.argv[2];
if (phase === 'prepare') {
  assert(!fs.existsSync(OUT), 'Fresh proof output'); fs.mkdirSync(OUT, { recursive: true });
  const product = process.env.EXPECTED_PRODUCT, tree = process.env.EXPECTED_PRODUCT_TREE;
  assert(/^[a-f0-9]{40}$/.test(product || '') && /^[a-f0-9]{40}$/.test(tree || ''), 'Bound immutable product/tree required');
  assert.equal(process.env.GITHUB_REF, BRANCH); assert.equal(git('rev-parse', 'HEAD'), process.env.GITHUB_SHA);
  assert.equal(git('rev-parse', BASE + '^{tree}'), BASE_TREE); assert.equal(git('rev-parse', product + '^{tree}'), tree);
  assert.deepEqual(git('show', '-s', '--format=%P', product).split(' '), [BASE], 'Product sole parent');
  assert.deepEqual(git('show', '-s', '--format=%P', 'HEAD').split(' '), [product], 'Proof sole product parent');
  const sourceDelta = git('diff', '--name-status', BASE, product).split('\n').filter(Boolean).sort();
  assert.deepEqual(sourceDelta, ['M\t' + APP_SOURCE], 'Clean product changes only shared Board');
  assert.equal(git('rev-parse', product + ':' + APP_SOURCE), FIXED_BOARD);
  assert.equal(git('rev-parse', BASE + ':' + APP_SOURCE), ORIGINAL_BOARD);
  assert.deepEqual(git('diff', '--name-status', product, 'HEAD').split('\n').filter(Boolean).sort(),
    ['A\t' + CONTROLLER, 'A\t' + HELPER, 'A\t' + WORKFLOW].sort(), 'Proof adds only fixed probe/controller/workflow');
  save('identity.json', { base: BASE, baseTree: BASE_TREE, product, tree, proof: process.env.GITHUB_SHA, ref: BRANCH, sourceDelta });
  save('source.initial.json', sourceState());
  archive('app-source.tar', product); archive('proof-source.tar', 'HEAD');
  fs.mkdirSync(ROOT); execFileSync('tar', ['-xf', path.join(OUT, 'proof-source.tar'), '-C', ROOT]);
  fs.symlinkSync(path.join(CHECKOUT, 'node_modules'), path.join(ROOT, 'node_modules'), 'dir'); held();
} else if (phase === 'deps') {
  success('npm-ci', 'npm', ['ci'], {}, 900000, CHECKOUT); held();
} else if (phase === 'types') {
  success('types', path.join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json']); held();
} else if (phase === 'flow') units('flow-unit', FLOW, FLOW_TITLES);
else if (phase === 'depth') units('existing-depth-unit', DEPTH, DEPTH_TITLES);
else if (phase === 'cfb-depth') units('existing-cfb-depth-unit', CFB_DEPTH, CFB_TITLES);
else if (phase === 'build') {
  success('ordinary-build', 'npm', ['run', 'build'], {}, 900000); held();
  save('dist.current.json', inventory(path.join(ROOT, 'dist'))); archiveDist('initial-fixed-dist.tar');
} else if (phase === 'browser-tools') {
  held();
  const tools = path.join(process.env.RUNNER_TEMP, 'cbb-reveal-browser-tools'), fonts = path.join(OUT, 'font-cache');
  assert(!fs.existsSync(tools)); const browsers = path.join(tools, 'browsers');
  success('browser-install', 'npm', ['install', '--prefix', tools, '--no-save', '--package-lock=false', 'playwright@1.64.0'], {}, 900000);
  for (const pkg of ['playwright', 'playwright-core']) {
    assert(!fs.existsSync(path.join(ROOT, 'node_modules', pkg)), 'No preexisting browser package collision');
    fs.symlinkSync(path.join(tools, 'node_modules', pkg), path.join(ROOT, 'node_modules', pkg), 'dir');
  }
  success('browser-versions', process.execPath, ['-e', 'const a=require("node:assert/strict");a.equal(require("playwright/package.json").version,"1.64.0");a.equal(require("playwright-core/package.json").version,"1.64.0");console.log(JSON.stringify({node:process.version,playwright:require("playwright/package.json").version}))']);
  success('chromium-install', process.execPath, [path.join(tools, 'node_modules/playwright/cli.js'), 'install', '--with-deps', 'chromium'], { PLAYWRIGHT_BROWSERS_PATH: browsers }, 1200000);
  success('font-prefetch', process.execPath, ['scripts/qa/freeKickLab1070.mjs', '--prefetch-fonts-only'], { FREE_KICK_FONT_CACHE: fonts });
  save('browser-tools.json', { tools, browsers, fonts, playwright: '1.64.0', manifestSHA256: sha(fs.readFileSync(path.join(fonts, 'manifest.json'))) });
  fs.writeFileSync(path.join(OUT, 'browser-node-egress.log'), ''); held();
} else if (phase === 'browser') {
  const fixedBody = fs.readFileSync(path.join(ROOT, APP_SOURCE));
  assert.equal(blob(fixedBody), FIXED_BOARD);
  const oldBody = execFileSync('git', ['cat-file', 'blob', ORIGINAL_BOARD], { cwd: CHECKOUT, maxBuffer: 1 << 24 });
  assert.equal(blob(oldBody), ORIGINAL_BOARD); fs.writeFileSync(path.join(OUT, 'original-Board.source.tsx'), oldBody);
  fs.writeFileSync(path.join(OUT, 'fixed-Board.source.tsx'), fixedBody);
  const fixedDesktop = browserReport('fixed-desktop', '', 'desktop'), fixedPhone = browserReport('fixed-phone', '', 'phone');
  const green = report => assert.deepEqual(report.actualVisibility, { fresh: 'GREEN', 'next-season': 'GREEN' }, 'Two actual fixed transitions visible');
  green(fixedDesktop); green(fixedPhone);
  const ownership = browserReport('ownership-control', 'noExtraScroll', 'desktop');
  let originalDesktop, originalPhone;
  try {
    fs.writeFileSync(path.join(ROOT, APP_SOURCE), oldBody); expectedBoard = ORIGINAL_BOARD; held();
    success('original-control-build', 'npm', ['run', 'build'], {}, 900000); held();
    save('dist.current.json', inventory(path.join(ROOT, 'dist')));
    archiveDist('original-control-dist.tar');
    originalDesktop = browserReport('original-desktop', '', 'desktop');
    assert.deepEqual(originalDesktop.actualVisibility, { fresh: 'RED', 'next-season': 'RED' }, 'Whole original Board reproduces both admitted desktop reds');
    originalPhone = browserReport('original-phone-measurement', '', 'phone');
  } finally {
    fs.writeFileSync(path.join(ROOT, APP_SOURCE), fixedBody); expectedBoard = FIXED_BOARD; held();
  }
  success('restored-fixed-build', 'npm', ['run', 'build'], {}, 900000); held();
  save('dist.current.json', inventory(path.join(ROOT, 'dist'))); archiveDist('restored-fixed-dist.tar');
  const restoredDesktop = browserReport('restored-desktop', '', 'desktop'), restoredPhone = browserReport('restored-phone', '', 'phone');
  green(restoredDesktop); green(restoredPhone);
  assert.deepEqual(restoredDesktop.transitions.map(row => row.selectedState), fixedDesktop.transitions.map(row => row.selectedState));
  assert.deepEqual(restoredPhone.transitions.map(row => row.selectedState), fixedPhone.transitions.map(row => row.selectedState));
  assert.equal(fs.statSync(path.join(OUT, 'browser-node-egress.log')).size, 0, 'No Node production egress');
  save('BROWSER-ADMISSION.json', { fixed: { desktop: fixedDesktop.actualVisibility, phone: fixedPhone.actualVisibility },
    physicalOriginal: { desktop: originalDesktop.actualVisibility, phoneMeasured: originalPhone.actualVisibility },
    restored: { desktop: restoredDesktop.actualVisibility, phone: restoredPhone.actualVisibility }, source: { original: ORIGINAL_BOARD, fixed: FIXED_BOARD },
    ownershipControl: ownership.controlOutcome, samePhysicalCopyRestored: true, allOtherSourceHeld: true,
    scope: 'SCOPED_GEOMETRY_REGRESSION_ONLY', cfbBrowser: 'UNRUN_EXISTING_FOUR_DEPTH_UNITS_ONLY', fullSuite: 'UNRUN', sizeCaps: 'UNRUN_NO_WAIVER' });
} else if (phase === 'retain') {
  const errors = []; try { held(); } catch (e) { errors.push(String(e)); }
  if (fs.existsSync(path.join(ROOT, 'dist'))) {
    assert.equal(run('archive-dist', 'tar', ['-cf', path.join(OUT, 'dist.tar'), '-C', path.join(ROOT, 'dist'), '.']), 0);
  }
  if (fs.existsSync(path.join(OUT, 'font-cache'))) {
    assert.equal(run('archive-fonts', 'tar', ['-cf', path.join(OUT, 'font-cache.tar'), '-C', path.join(OUT, 'font-cache'), '.']), 0);
  }
  save('FINAL-HOLDS.json', { errors, sourceHeld: errors.length === 0, fullSuite: 'UNRUN', caps: 'UNRUN_NO_WAIVER' });
  save('ARTIFACT-BODIES.json', inventory(OUT)); assert.equal(errors.length, 0, 'Final immutable source/ref/index hold');
} else throw new Error('Unknown proof phase ' + phase);
console.log('CBB_PROOF_PHASE_COMPLETE ' + phase);
