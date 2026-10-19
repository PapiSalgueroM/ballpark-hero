/* Serial real builds for the declared1432 native accessibility arms. Canonical dist stays held. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { sourcePlan, sourceForArm } from './gridSearchAccessibility1432.mjs';
import { assertOriginalAdmission } from './gridSearchCompatibility1432.mjs';
import { validateNativeLog, assertNativeLogRefusals } from './gridSearchAccessibilityNative1432.mjs';

async function main() {
const root = process.cwd(), out = process.env.GRID_SEARCH_A11Y_OUT, mode = process.env.GRID_SEARCH_A11Y_MODE;
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')]); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(['baseline', 'fixed'].includes(mode));
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const outerTransport = process.env.SIM_OFFLINE_RECEIPT;
assert(outerTransport && fs.existsSync(outerTransport) && fs.statSync(outerTransport).size === 0, 'Caller creates empty outer receipt');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const plan = sourcePlan(), original = git(['show', plan.base + ':' + plan.file]).toString('utf8');
const actual = fs.readFileSync(plan.file, 'utf8');
assert.equal(actual, mode === 'baseline' ? original : sourceForArm(original, 'normal'));
const unit = JSON.parse(fs.readFileSync(path.join(out, 'unit/summary.json'), 'utf8'));
assert.equal(unit.status, 'passed'); assert.equal(unit.sourceHeld, true); assert.equal(unit.mode, mode);
assert.equal(unit.actualProductSha256, hash(actual)); assert.equal(unit.temporaryModulesRemoved, true);
assert.equal(unit.current24.status, 'passed'); assert.equal(unit.current24.currentSource, true); assert.equal(unit.current24.historicalSource, false);
assert.equal(unit.current24.actualProductSha256, hash(actual)); assert.equal(unit.current24.cases, 24); assert.equal(unit.current24.passed, 24);
assert.equal(unit.current24.failed, 0); assert.equal(unit.current24.pending, 0); assert.equal(unit.current24.removed, true); assert.equal(unit.current24.sourceHeld, true);
assert.deepEqual(unit.current24.tests.map(row => [row.name, row.passed]), [['blur8', 8], ['discovery16', 16]]);
assert.deepEqual(unit.compatibility.map(row => [row.name, row.historical, row.currentAccessibilitySource, row.modeEnvAbsent, row.outEnvAbsent]),
  [['blur', true, false, true, true], ['discovery', true, false, true, true]]);
if (mode === 'fixed') { assertOriginalAdmission(); assert.equal(unit.fixedUnitProofPassed, true); }
const dir = path.join(out, 'browser-runner'); assert(!fs.existsSync(dir)); fs.mkdirSync(dir);
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
assert.equal(status.toString('utf8'), '', 'Canonical checkout must be clean before builds');
const names = tracked.toString('utf8').split('\0').filter(Boolean);
const sourceSnapshot = cwd => names.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(cwd, file))) }));
const sourceBefore = sourceSnapshot(root); write(path.join(dir, 'canonical-source.before.json'), sourceBefore);
const files = directory => {
  const found = [];
  const visit = relative => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const file = path.join(relative, entry.name); assert(!entry.isSymbolicLink(), 'Dist has no escaped symlink');
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) { const body = fs.readFileSync(path.join(directory, file)); found.push({ file: file.split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }); }
      else assert.fail('Unexpected dist entry');
    }
  };
  visit(''); assert(found.length > 0); return found;
};
const canonicalDist = files(path.join(root, 'dist')); write(path.join(dir, 'canonical-dist.before.json'), canonicalDist);
assert(fs.existsSync(path.join(out, 'dist.zip')), 'Caller archives the completed plain canonical build');
const canonicalArchiveSha256 = hash(fs.readFileSync(path.join(out, 'dist.zip')));
const installedManifests = ['dependency-files.sha256', 'browser-tool-files.sha256', 'browser-executable-files.sha256', 'font-files.sha256']
  .map(file => ({ file, sha256: hash(fs.readFileSync(path.join(out, file))) }));
write(path.join(dir, 'installed-input-manifests.json'), installedManifests);
const arms = mode === 'baseline' ? ['normal'] : ['normal', 'whole-original', 'role-control', 'active-control', 'selected-control', 'stale-active-control', 'restored'];
const summary = { status: 'failed', mode, scope: 'Serial independently rebuilt native AX and strict DOM IDref controls. No spoken assistive-technology or live application claim.',
  productQualified: false, canonicalArchiveSha256, sourceHeld: false, canonicalDistHeld: false, allWorktreesRemoved: false, arms: [] };
const save = () => write(path.join(dir, 'summary.json'), summary);
const receipt = file => { assert(!fs.existsSync(file)); fs.writeFileSync(file, '', { flag: 'wx' }); return file; };
const childEnv = (cwd, transport) => ({ ...process.env, NODE_OPTIONS: '--require=' + path.join(cwd, 'scripts/lib/offlineTransport.cjs'),
  SIM_OFFLINE_RECEIPT: receipt(transport) });
const result = child => ({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
const empty = file => { assert(fs.existsSync(file)); assert.equal(fs.statSync(file).size, 0, 'Present empty child transport'); };
const bounded = async (promise, ms, label) => {
  let timer; try { return await Promise.race([promise, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), ms); })]); }
  finally { clearTimeout(timer); }
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let worktreeCount = 0, removedCount = 0;
function actualDefault() {
  if (mode !== 'fixed') {
    summary.actualDefault = { status: 'not-run-on-original-source', fixedOnly: true, productQualified: false }; save(); return;
  }
  const target = path.join(out, 'default-run'); assert(!fs.existsSync(target)); fs.mkdirSync(target);
  const prefix = 'grid-search-accessibility-evidence-', prior = fs.readdirSync(os.tmpdir()).filter(file => file.startsWith(prefix));
  const transport = path.join(target, 'transport.transport'), env = childEnv(root, transport);
  delete env.GRID_SEARCH_A11Y_MODE; delete env.GRID_SEARCH_A11Y_OUT; delete env.NO_DOUBLE_SWAP;
  assert(!Object.hasOwn(env, 'GRID_SEARCH_A11Y_MODE') && !Object.hasOwn(env, 'GRID_SEARCH_A11Y_OUT'));
  const started = Date.now(), played = spawnSync(process.execPath, ['scripts/simSoccerGridSearchAccessibility.mjs'],
    { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 2700000 });
  fs.writeFileSync(path.join(target, 'stdout.log'), played.stdout || ''); fs.writeFileSync(path.join(target, 'stderr.log'), played.stderr || '');
  const processRecord = { ...result(played), elapsedMs: Date.now() - started, timeoutMs: 2700000,
    modeEnvAbsent: !Object.hasOwn(env, 'GRID_SEARCH_A11Y_MODE'), outEnvAbsent: !Object.hasOwn(env, 'GRID_SEARCH_A11Y_OUT'),
    command: [process.execPath, 'scripts/simSoccerGridSearchAccessibility.mjs'] };
  write(path.join(target, 'process.json'), processRecord);
  const fresh = fs.readdirSync(os.tmpdir()).filter(file => file.startsWith(prefix) && !prior.includes(file));
  write(path.join(target, 'fresh-packet-discovery.json'), { names: fresh, process: processRecord });
  let actualRoot, tree, copied;
  if (fresh.length === 1) {
    actualRoot = fs.realpathSync(path.join(os.tmpdir(), fresh[0]));
    assert.equal(path.dirname(actualRoot), fs.realpathSync(os.tmpdir())); assert(path.basename(actualRoot).startsWith(prefix));
    tree = files(actualRoot); copied = path.join(target, 'evidence');
    fs.cpSync(actualRoot, copied, { recursive: true, force: false, errorOnExist: true });
    assert.deepEqual(files(copied), tree); assert.deepEqual(files(actualRoot), tree); write(path.join(target, 'copied-tree.json'), tree);
  }
  assert.ifError(played.error); assert.equal(played.signal, null); assert.equal(played.status, 0); empty(transport);
  const records = (played.stdout || '').split(/\r?\n/).filter(line => line.startsWith('{"kind":"GRID_SEARCH_ACCESSIBILITY_RESULT",'));
  assert.equal(records.length, 1); const metadata = JSON.parse(records[0]);
  assert.equal(metadata.mode, 'fixed'); assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true);
  assert.equal(metadata.sourceHeld, true); assert.equal(metadata.temporaryModulesRemoved, true); assert.equal(metadata.productQualified, false);
  const evidenceRoot = fs.realpathSync(metadata.evidenceRoot);
  assert.equal(path.dirname(evidenceRoot), fs.realpathSync(os.tmpdir())); assert(path.basename(evidenceRoot).startsWith(prefix));
  assert.deepEqual(fresh, [path.basename(evidenceRoot)], 'One fresh actual ordinary default packet'); assert.equal(evidenceRoot, actualRoot);
  const summaryBody = fs.readFileSync(path.join(copied, 'unit/summary.json')), value = JSON.parse(summaryBody);
  assert.equal(hash(summaryBody), metadata.summarySha256); assert.equal(value.status, 'passed'); assert.equal(value.mode, 'fixed');
  assert.equal(value.fixedUnitProofPassed, true); assert.equal(value.actualProductSha256, hash(actual)); assert.equal(value.testSha256, unit.testSha256);
  assert.equal(value.current24.passed, 24); assert.equal(value.current24.failed, 0); assert.equal(value.current24.pending, 0);
  assert.equal(value.compatibility.length, 2); assert.equal(value.arms.length, 8); assert.equal(value.sourceHeld, true); assert.equal(value.temporaryModulesRemoved, true);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((played.stdout || '') + (played.stderr || '')));
  assert.deepEqual(sourceSnapshot(root), sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
  summary.actualDefault = { status: 'passed', fixedOnly: true, productQualified: false, metadata, process: processRecord,
    copiedFiles: tree.length, copiedTreeSha256: hash(fs.readFileSync(path.join(target, 'copied-tree.json'))), sourceHeld: true };
  write(path.join(target, 'receipt.json'), summary.actualDefault); save();
  console.log('Actual new discoverable default: fixed semantics/control/current24/historical packets copied completely, MODE/OUT absent, caller source held.');
}
save();
try {
  actualDefault();
  for (const arm of arms) {
    const armDir = path.join(dir, arm); fs.mkdirSync(armDir);
    const row = { arm, status: 'failed', canonical: arm === 'normal', expectedContexts: ['normal', 'restored'].includes(arm) ? 3 : 1,
      sourceHeld: false, distHeld: false, worktreeRemoved: arm === 'normal', serverClosed: false };
    summary.arms.push(row); save();
    const body = mode === 'baseline' ? original : sourceForArm(original, arm);
    assert.equal(typeof body, 'string');
    const temp = arm === 'normal' ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-a11y-build1432-'));
    const cwd = temp ? path.join(temp, 'source') : root;
    let registered = false, source, beforeStatus, beforeTracked, dist, server, serverExit, serverError, serverOut, serverErr;
    try {
      if (temp) {
        git(['worktree', 'add', '--detach', cwd, git(['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true; worktreeCount++;
        fs.symlinkSync(path.join(root, 'node_modules'), path.join(cwd, 'node_modules'), 'dir');
        assert.equal(fs.realpathSync(path.join(cwd, 'node_modules')), fs.realpathSync(path.join(root, 'node_modules')));
        fs.writeFileSync(path.join(cwd, plan.file), body);
      }
      assert.equal(fs.readFileSync(path.join(cwd, plan.file), 'utf8'), body);
      beforeTracked = git(['ls-files', '-z'], cwd); assert(beforeTracked.equals(tracked));
      beforeStatus = git(['status', '--porcelain=v1', '--untracked-files=all'], cwd);
      assert.equal(beforeStatus.toString('utf8'), body === actual ? '' : ' M ' + plan.file + '\n', 'Only this arm Search differs from canonical source');
      source = sourceSnapshot(cwd);
      for (let i = 0; i < source.length; i++) assert.equal(source[i].sha256, names[i] === plan.file ? hash(body) : sourceBefore[i].sha256);
      fs.writeFileSync(path.join(armDir, 'SoccerGridSearch.tsx'), body);
      write(path.join(armDir, 'source.before.json'), source); fs.writeFileSync(path.join(armDir, 'members.before'), beforeTracked);
      fs.writeFileSync(path.join(armDir, 'status.before'), beforeStatus);
      row.source = { members: source.length, sha256: hash(fs.readFileSync(path.join(armDir, 'source.before.json'))),
        searchSha256: hash(body), allowedDifference: body === actual ? [] : [plan.file], detached: Boolean(temp), cwd };
      save();
      if (temp) {
        const transport = path.join(armDir, 'build.transport'), env = childEnv(cwd, transport); delete env.NO_DOUBLE_SWAP;
        const started = Date.now(), built = spawnSync('npm', ['run', 'build'], { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600000 });
        fs.writeFileSync(path.join(armDir, 'build.stdout.log'), built.stdout || ''); fs.writeFileSync(path.join(armDir, 'build.stderr.log'), built.stderr || '');
        row.build = { ...result(built), elapsedMs: Date.now() - started, timeoutMs: 600000 }; write(path.join(armDir, 'build.process.json'), row.build); save();
        assert.ifError(built.error); assert.equal(built.signal, null); assert.equal(built.status, 0); empty(transport);
      } else row.build = { reusedCompletedCanonicalPlainBuild: true };
      dist = files(path.join(cwd, 'dist')); write(path.join(armDir, 'dist.before.json'), dist);
      if (temp) {
        const archive = path.join(armDir, 'dist.zip'); assert(!fs.existsSync(archive));
        const archived = spawnSync('zip', ['-qr', archive, '.'], { cwd: path.join(cwd, 'dist'), encoding: 'utf8', timeout: 60000 });
        write(path.join(armDir, 'archive.process.json'), result(archived)); assert.ifError(archived.error);
        assert.equal(archived.signal, null); assert.equal(archived.status, 0);
        row.dist = { members: dist.length, archive: path.relative(out, archive), archiveSha256: hash(fs.readFileSync(archive)),
          manifestSha256: hash(fs.readFileSync(path.join(armDir, 'dist.before.json'))) };
      } else {
        assert.deepEqual(dist, canonicalDist);
        row.dist = { members: dist.length, archive: 'dist.zip', archiveSha256: canonicalArchiveSha256,
          manifestSha256: hash(fs.readFileSync(path.join(armDir, 'dist.before.json'))) };
      }
      save();
      const serverTransport = path.join(armDir, 'server.transport'), env = childEnv(cwd, serverTransport);
      serverOut = fs.openSync(path.join(armDir, 'server.stdout.log'), 'wx'); serverErr = fs.openSync(path.join(armDir, 'server.stderr.log'), 'wx');
      server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4173'], { cwd, env, stdio: ['ignore', serverOut, serverErr] });
      server.on('error', error => { serverError = String(error); });
      serverExit = new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal })));
      row.server = { pid: server.pid, base: 'http://127.0.0.1:4173', ready: false }; save();
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        assert(!serverError && server.exitCode === null && server.signalCode === null, 'Own server remains live');
        try {
          const response = await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(500) });
          if (response.ok) { await response.arrayBuffer(); row.server.ready = true; break; }
        } catch {}
        await pause(100);
      }
      assert(row.server.ready, 'Own host-like server is ready within five seconds'); save();
      const browserTransport = path.join(armDir, 'browser.transport'), browserEnv = childEnv(cwd, browserTransport);
      Object.assign(browserEnv, { GRID_SEARCH_A11Y_MODE: mode, GRID_SEARCH_A11Y_ARM: arm,
        GRID_SEARCH_A11Y_OUT: out, BASE_URL: 'http://127.0.0.1:4173',
        DEBUG: [process.env.DEBUG, 'pw:browser'].filter(Boolean).join(',') }); delete browserEnv.NO_DOUBLE_SWAP;
      const started = Date.now(), played = spawnSync(process.execPath, ['scripts/qa/playSoccerGridSearchAccessibility.mjs'],
        { cwd, env: browserEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 900000 });
      fs.writeFileSync(path.join(armDir, 'browser.stdout.log'), played.stdout || ''); fs.writeFileSync(path.join(armDir, 'browser-native-stderr.log'), played.stderr || '');
      row.browser = { ...result(played), elapsedMs: Date.now() - started, timeoutMs: 900000 }; write(path.join(armDir, 'browser.process.json'), row.browser); save();
      assert.ifError(played.error); assert.equal(played.signal, null); assert.equal(played.status, 0); empty(browserTransport);
      const reportFile = path.join(out, 'browser', arm, 'report.json'), report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      assert.equal(report.status, 'passed'); assert.equal(report.mode, mode); assert.equal(report.arm, arm);
      assert.equal(report.cases.length, row.expectedContexts); assert.equal(report.productQualified, false);
      row.report = { file: path.relative(out, reportFile), sha256: hash(fs.readFileSync(reportFile)), contexts: report.cases.length };
      const nativeStderr = fs.readFileSync(path.join(armDir, 'browser-native-stderr.log'));
      row.nativeLog = { status: 'passed', stderrFile: path.relative(out, path.join(armDir, 'browser-native-stderr.log')),
        stderrBytes: nativeStderr.length, stderrSha256: hash(nativeStderr), reportSha256: row.report.sha256,
        validation: validateNativeLog(report, nativeStderr.toString('utf8')),
        refusalControls: assertNativeLogRefusals(report, nativeStderr.toString('utf8')) };
      write(path.join(armDir, 'browser-native-log-validation.json'), row.nativeLog);
      row.status = 'passed';
    } catch (error) { row.error = String(error?.stack || error); }
    finally {
      try {
        if (server) {
          if (server.exitCode === null && server.signalCode === null) server.kill('SIGTERM');
          try { row.server.exit = await bounded(serverExit, 10000, arm + ' own server close'); }
          catch (error) { server.kill('SIGKILL'); row.server.closeError = String(error); row.server.exit = await bounded(serverExit, 5000, arm + ' killed server close'); row.status = 'failed'; }
          assert(!serverError, serverError); assert.equal(row.server.exit.code, null); assert.equal(row.server.exit.signal, 'SIGTERM');
          row.serverClosed = true; empty(path.join(armDir, 'server.transport'));
        }
        if (dist) {
          const after = files(path.join(cwd, 'dist')); write(path.join(armDir, 'dist.after.json'), after); assert.deepEqual(after, dist); row.distHeld = true;
        }
        if (source) {
          const after = sourceSnapshot(cwd), members = git(['ls-files', '-z'], cwd), afterStatus = git(['status', '--porcelain=v1', '--untracked-files=all'], cwd);
          write(path.join(armDir, 'source.after.json'), after); fs.writeFileSync(path.join(armDir, 'members.after'), members); fs.writeFileSync(path.join(armDir, 'status.after'), afterStatus);
          assert.deepEqual(after, source); assert(members.equals(beforeTracked)); assert(afterStatus.equals(beforeStatus)); row.sourceHeld = true;
        }
      } catch (error) { row.status = 'failed'; row.cleanupError = String(error?.stack || error); }
      finally {
        if (serverOut !== undefined) fs.closeSync(serverOut); if (serverErr !== undefined) fs.closeSync(serverErr);
        if (registered) { git(['worktree', 'remove', '--force', cwd]); removedCount++; }
        if (temp) { assert(!fs.existsSync(cwd)); fs.rmdirSync(temp); row.worktreeRemoved = true; }
        save();
      }
    }
    assert.deepEqual(files(path.join(root, 'dist')), canonicalDist, 'Canonical completed dist remains held through every arm');
  }
  assert.equal(summary.arms.length, arms.length);
  assert(summary.arms.every(row => row.status === 'passed' && row.sourceHeld && row.distHeld && row.serverClosed && row.worktreeRemoved));
  summary.status = 'passed';
} finally {
  const afterSource = sourceSnapshot(root), afterDist = files(path.join(root, 'dist'));
  write(path.join(dir, 'canonical-source.after.json'), afterSource); write(path.join(dir, 'canonical-dist.after.json'), afterDist);
  assert.deepEqual(afterSource, sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
  assert.deepEqual(afterDist, canonicalDist); assert.equal(hash(fs.readFileSync(path.join(out, 'dist.zip'))), canonicalArchiveSha256);
  for (const row of installedManifests) assert.equal(hash(fs.readFileSync(path.join(out, row.file))), row.sha256);
  assert.equal(worktreeCount, removedCount); assert.equal(fs.statSync(outerTransport).size, 0);
  summary.sourceHeld = true; summary.canonicalDistHeld = true; summary.allWorktreesRemoved = true; save();
}
console.log('Actual1432 browser arms:' + arms.join(',') + '. Canonical source/dist held; all source variants separately rebuilt and removed.');
}

await main();
