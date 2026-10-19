/* Two explicit phases: complete unit/default packets, then serial actual browser source builds. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { readPlan, sourceForArm } from './reportSubmitPendingNames1433.mjs';
import { validateNativeLog, assertNativeLogRefusals } from './reportSubmitPendingNamesNative1433.mjs';
const root = process.cwd(), phase = process.argv[2], mode = process.env.REPORT_PENDING_NAMES_MODE, out = process.env.REPORT_PENDING_NAMES_OUT;
assert(['units', 'browser'].includes(phase)); assert(['baseline', 'fixed'].includes(mode)); assert.equal(process.env.SIM_NETWORK, 'offline'); assert(['1', 'true'].includes(process.env.CI));
const require = createRequire(path.join(root, 'package.json')); assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')]);
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const outerTransport = process.env.SIM_OFFLINE_RECEIPT; assert(outerTransport && fs.existsSync(outerTransport) && fs.statSync(outerTransport).size === 0);
const hash = body => createHash('sha256').update(body).digest('hex'), git = (args, cwd = root) => execFileSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const plan = readPlan(root, mode), tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']); assert.equal(status.toString(), '');
const names = tracked.toString('utf8').split('\0').filter(Boolean), sourceSnapshot = cwd => names.map(file => ({ file, sha256: hash(fs.readFileSync(path.join(cwd, file))) }));
const sourceBefore = sourceSnapshot(root), sourceHeld = () => { assert.deepEqual(sourceSnapshot(root), sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all']))); };
const files = directory => { const rows = []; const visit = relative => { for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
  const file = path.join(relative, entry.name); assert(!entry.isSymbolicLink()); if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); const body = fs.readFileSync(path.join(directory, file)); rows.push({ file: file.split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }); }
} }; visit(''); assert(rows.length); return rows; };
const empty = file => { assert(fs.existsSync(file)); assert.equal(fs.statSync(file).size, 0, 'Present empty owned transport'); };
const childEnv = (cwd, file) => { assert(!fs.existsSync(file)); fs.writeFileSync(file, '', { flag: 'wx' }); return { ...process.env, NODE_OPTIONS: '--require=' + path.join(cwd, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: file }; };
const result = child => ({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
const run = (cwd, command, args, env, prefix, timeout) => { const start = Date.now(), child = spawnSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
  fs.writeFileSync(prefix + '.stdout.log', child.stdout || ''); fs.writeFileSync(prefix + '.stderr.log', child.stderr || ''); const record = { ...result(child), command: [command, ...args], elapsedMs: Date.now() - start, timeoutMs: timeout }; write(prefix + '.process.json', record); return { child, record }; };
const passed = child => { assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0); assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test((child.stdout || '') + (child.stderr || ''))); };
const summaryFile = path.join(out, 'unit/summary.json');
const checkUnit = file => { const value = JSON.parse(fs.readFileSync(file)); assert.equal(value.status, 'passed'); assert.equal(value.mode, mode); assert.equal(value.sourceHeld, true); assert.equal(value.temporaryModulesRemoved, true); assert.equal(value.productQualified, false); assert.deepEqual(value.forms.actualSha256, plan.actualSha256); assert.equal(value.current.cases, 38); assert.equal(value.legacy.cases, 84); return value; };
if (phase === 'units') {
  const dir = path.join(out, 'unit-runner'); assert(!fs.existsSync(dir)); fs.mkdirSync(dir, { recursive: true });
  const receipt = { status: 'failed', mode, phase, productQualified: false, sourceHeld: false, actualNewDefault: { status: 'not-run-on-original-source', fixedOnly: true, productQualified: false } };
  write(path.join(dir, 'source.before.json'), sourceBefore);
  try {
    const transport = path.join(dir, 'explicit.transport'), env = childEnv(root, transport);
    const explicit = run(root, process.execPath, ['scripts/simReportSubmitPendingNames.mjs'], env, path.join(dir, 'explicit'), 1800000); receipt.explicit = explicit.record; write(path.join(dir, 'summary.json'), receipt);
    passed(explicit.child); empty(transport); checkUnit(summaryFile); receipt.unitSummarySha256 = hash(fs.readFileSync(summaryFile));
    if (mode === 'fixed') {
      const target = path.join(out, 'default-run'); assert(!fs.existsSync(target)); fs.mkdirSync(target);
      const prefix = 'report-submit-pending-names-evidence-', prior = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix));
      const transport = path.join(target, 'transport.transport'), env = childEnv(root, transport); delete env.REPORT_PENDING_NAMES_MODE; delete env.REPORT_PENDING_NAMES_OUT; delete env.NO_DOUBLE_SWAP;
      const played = run(root, process.execPath, ['scripts/simReportSubmitPendingNames.mjs'], env, path.join(target, 'child'), 1800000);
      const processRecord = { ...played.record, modeEnvAbsent: !Object.hasOwn(env, 'REPORT_PENDING_NAMES_MODE'), outEnvAbsent: !Object.hasOwn(env, 'REPORT_PENDING_NAMES_OUT') }; write(path.join(target, 'process.json'), processRecord);
      const fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix) && !prior.includes(name)); write(path.join(target, 'fresh-packet-discovery.json'), { prefix, prior, fresh, process: processRecord });
      let actualRoot, tree; if (fresh.length === 1) { actualRoot = fs.realpathSync(path.join(os.tmpdir(), fresh[0])); assert.equal(path.dirname(actualRoot), fs.realpathSync(os.tmpdir())); assert(path.basename(actualRoot).startsWith(prefix)); tree = files(actualRoot); fs.cpSync(actualRoot, path.join(target, 'evidence'), { recursive: true, force: false, errorOnExist: true }); assert.deepEqual(files(path.join(target, 'evidence')), tree); assert.deepEqual(files(actualRoot), tree); write(path.join(target, 'copied-tree.json'), tree); }
      passed(played.child); empty(transport); const rows = (played.child.stdout || '').split(/\r?\n/).filter(line => line.startsWith('{"kind":"report-submit-pending-names-result",')); assert.equal(rows.length, 1);
      const metadata = JSON.parse(rows[0]); assert.equal(metadata.mode, 'fixed'); assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.sourceHeld, true); assert.equal(metadata.temporaryModulesRemoved, true); assert.equal(metadata.productQualified, false);
      assert.equal(fs.realpathSync(metadata.evidenceRoot), actualRoot); assert.deepEqual(fresh, [path.basename(actualRoot)]); const copied = path.join(target, 'evidence/unit/summary.json'); assert.equal(hash(fs.readFileSync(copied)), metadata.summarySha256); checkUnit(copied);
      receipt.actualNewDefault = { status: 'passed', fixedOnly: true, productQualified: false, metadata, process: processRecord, copiedFiles: tree.length, copiedTreeSha256: hash(fs.readFileSync(path.join(target, 'copied-tree.json'))), sourceHeld: true }; write(path.join(target, 'receipt.json'), receipt.actualNewDefault);
    }
    sourceHeld(); receipt.status = 'passed';
  } finally { sourceHeld(); empty(outerTransport); write(path.join(dir, 'source.after.json'), sourceSnapshot(root)); receipt.sourceHeld = true; write(path.join(dir, 'summary.json'), receipt); }
  console.log('Report submit names unit phase: actual new cases, current38 and unchanged legacy84 proof packet held.');
} else {
  const unit = checkUnit(summaryFile), unitRunner = JSON.parse(fs.readFileSync(path.join(out, 'unit-runner/summary.json')));
  assert.equal(unitRunner.status, 'passed'); assert.equal(unitRunner.sourceHeld, true); assert.equal(unitRunner.unitSummarySha256, hash(fs.readFileSync(summaryFile))); if (mode === 'fixed') assert.equal(unitRunner.actualNewDefault.status, 'passed'); else assert.equal(unitRunner.actualNewDefault.status, 'not-run-on-original-source');
  const dir = path.join(out, 'browser-runner'); assert(!fs.existsSync(dir)); fs.mkdirSync(dir);
  const canonicalDist = files(path.join(root, 'dist')); write(path.join(dir, 'canonical-dist.before.json'), canonicalDist); write(path.join(dir, 'canonical-source.before.json'), sourceBefore);
  const canonicalArchive = path.join(out, 'dist.zip'); assert(fs.existsSync(canonicalArchive)); const canonicalArchiveSha256 = hash(fs.readFileSync(canonicalArchive));
  const installed = ['dependency-files.sha256', 'browser-tool-files.sha256', 'browser-executable-files.sha256', 'font-files.sha256'].map(file => ({ file, sha256: hash(fs.readFileSync(path.join(out, file))) })); write(path.join(dir, 'installed-input-manifests.json'), installed);
  const arms = mode === 'baseline' ? ['normal'] : ['normal', 'footer-omission', 'game-omission', 'whole-original', 'restored'];
  const summary = { status: 'failed', mode, phase, productQualified: false, canonicalArchiveSha256, sourceHeld: false, canonicalDistHeld: false, allWorktreesRemoved: false, arms: [] }, save = () => write(path.join(dir, 'summary.json'), summary);
  const bounded = async (value, ms, label) => { let timer; try { return await Promise.race([value, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out')), ms); })]); } finally { clearTimeout(timer); } };
  let created = 0, removed = 0; save();
  try {
    for (const arm of arms) {
      const armDir = path.join(dir, arm); fs.mkdirSync(armDir); const bodies = sourceForArm(plan, arm), expectedContexts = ['normal', 'restored'].includes(arm) ? 4 : arm === 'whole-original' ? 2 : 1;
      const row = { arm, status: 'failed', expectedContexts, sourceHeld: false, distHeld: false, worktreeRemoved: arm === 'normal', serverClosed: false }; summary.arms.push(row); save();
      const temp = arm === 'normal' ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'report-submit-names-build1433-')), cwd = temp ? path.join(temp, 'source') : root;
      let registered = false, before, beforeTracked, beforeStatus, dist, server, serverExit, serverError, serverOut, serverErr;
      try {
        if (temp) { git(['worktree', 'add', '--detach', cwd, git(['rev-parse', 'HEAD']).toString().trim()]); registered = true; created++; fs.symlinkSync(path.join(root, 'node_modules'), path.join(cwd, 'node_modules'), 'dir'); assert.equal(fs.realpathSync(path.join(cwd, 'node_modules')), fs.realpathSync(path.join(root, 'node_modules'))); for (const [file, body] of Object.entries(bodies)) fs.writeFileSync(path.join(cwd, file), body); }
        beforeTracked = git(['ls-files', '-z'], cwd); assert(beforeTracked.equals(tracked)); beforeStatus = git(['status', '--porcelain=v1', '--untracked-files=all'], cwd);
        const changed = Object.keys(bodies).filter(file => bodies[file] !== plan.actualForms[file]).sort(); assert.deepEqual(beforeStatus.toString().trimEnd().split('\n').filter(Boolean).sort(), changed.map(file => ' M ' + file));
        before = sourceSnapshot(cwd); for (let i = 0; i < before.length; i++) assert.equal(before[i].sha256, Object.hasOwn(bodies, names[i]) ? hash(bodies[names[i]]) : sourceBefore[i].sha256);
        for (const [file, body] of Object.entries(bodies)) { assert.equal(fs.readFileSync(path.join(cwd, file), 'utf8'), body); fs.writeFileSync(path.join(armDir, path.basename(file)), body); }
        write(path.join(armDir, 'source.before.json'), before); fs.writeFileSync(path.join(armDir, 'members.before'), beforeTracked); fs.writeFileSync(path.join(armDir, 'status.before'), beforeStatus);
        row.source = { cwd, members: before.length, sha256: hash(fs.readFileSync(path.join(armDir, 'source.before.json'))), allowedDifference: changed, forms: Object.fromEntries(Object.entries(bodies).map(([file, body]) => [file, hash(body)])), detached: !!temp }; save();
        if (temp) { const transport = path.join(armDir, 'build.transport'), env = childEnv(cwd, transport); delete env.NO_DOUBLE_SWAP; const build = run(cwd, 'npm', ['run', 'build'], env, path.join(armDir, 'build'), 600000); row.build = build.record; save(); passed(build.child); empty(transport); } else row.build = { reusedCompletedCanonicalPlainBuild: true };
        dist = files(path.join(cwd, 'dist')); write(path.join(armDir, 'dist.before.json'), dist);
        if (temp) { const archive = path.join(armDir, 'dist.zip'), result = run(path.join(cwd, 'dist'), 'zip', ['-qr', archive, '.'], process.env, path.join(armDir, 'archive'), 60000); passed(result.child); row.dist = { members: dist.length, archive: path.relative(out, archive), archiveSha256: hash(fs.readFileSync(archive)), manifestSha256: hash(fs.readFileSync(path.join(armDir, 'dist.before.json'))) }; }
        else { assert.deepEqual(dist, canonicalDist); row.dist = { members: dist.length, archive: 'dist.zip', archiveSha256: canonicalArchiveSha256, manifestSha256: hash(fs.readFileSync(path.join(armDir, 'dist.before.json'))) }; } save();
        const env = childEnv(cwd, path.join(armDir, 'server.transport')); serverOut = fs.openSync(path.join(armDir, 'server.stdout.log'), 'wx'); serverErr = fs.openSync(path.join(armDir, 'server.stderr.log'), 'wx');
        server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4173'], { cwd, env, stdio: ['ignore', serverOut, serverErr] }); server.on('error', error => { serverError = String(error); }); serverExit = new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal })));
        row.server = { pid: server.pid, base: 'http://127.0.0.1:4173', ready: false }; save();
        const deadline = Date.now() + 5000; while (Date.now() < deadline) { assert(!serverError && server.exitCode === null && server.signalCode === null); try { const response = await fetch(row.server.base + '/', { signal: AbortSignal.timeout(500) }); if (response.ok) { await response.arrayBuffer(); row.server.ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
        assert(row.server.ready, 'Own host-like server ready within five seconds'); save();
        const transport = path.join(armDir, 'browser.transport'), browserEnv = childEnv(cwd, transport); Object.assign(browserEnv, { REPORT_PENDING_NAMES_MODE: mode, REPORT_PENDING_NAMES_ARM: arm, REPORT_PENDING_NAMES_OUT: out, BASE_URL: row.server.base, DEBUG: [process.env.DEBUG, 'pw:browser'].filter(Boolean).join(',') }); delete browserEnv.NO_DOUBLE_SWAP;
        const played = run(cwd, process.execPath, ['scripts/qa/playReportSubmitPendingNames.mjs'], browserEnv, path.join(armDir, 'browser'), 900000); row.browser = played.record; save(); passed(played.child); empty(transport);
        const reportFile = path.join(out, 'browser', arm, 'report.json'), report = JSON.parse(fs.readFileSync(reportFile)); assert.equal(report.status, 'passed'); assert.equal(report.mode, mode); assert.equal(report.arm, arm); assert.equal(report.productQualified, false); assert.equal(report.cases.length, expectedContexts);
        row.report = { file: path.relative(out, reportFile), sha256: hash(fs.readFileSync(reportFile)), contexts: report.cases.length };
        const stderr = fs.readFileSync(path.join(armDir, 'browser.stderr.log')); row.nativeLog = { status: 'passed', stderrFile: path.relative(out, path.join(armDir, 'browser.stderr.log')), stderrBytes: stderr.length, stderrSha256: hash(stderr), reportSha256: row.report.sha256, validation: validateNativeLog(report, stderr.toString('utf8')), refusalControls: assertNativeLogRefusals(report, stderr.toString('utf8')) }; write(path.join(armDir, 'browser-native-log-validation.json'), row.nativeLog); row.status = 'passed';
      } catch (error) { row.error = String(error?.stack || error); }
      finally {
        try {
          if (server) { if (server.exitCode === null && server.signalCode === null) server.kill('SIGTERM'); try { row.server.exit = await bounded(serverExit, 10000, arm + ' server close'); } catch (error) { server.kill('SIGKILL'); row.server.closeError = String(error); row.server.exit = await bounded(serverExit, 5000, arm + ' killed server close'); row.status = 'failed'; } assert(!serverError); assert.equal(row.server.exit.code, null); assert.equal(row.server.exit.signal, 'SIGTERM'); row.serverClosed = true; empty(path.join(armDir, 'server.transport')); }
          if (dist) { const after = files(path.join(cwd, 'dist')); write(path.join(armDir, 'dist.after.json'), after); assert.deepEqual(after, dist); row.distHeld = true; }
          if (before) { const after = sourceSnapshot(cwd), members = git(['ls-files', '-z'], cwd), afterStatus = git(['status', '--porcelain=v1', '--untracked-files=all'], cwd); write(path.join(armDir, 'source.after.json'), after); fs.writeFileSync(path.join(armDir, 'members.after'), members); fs.writeFileSync(path.join(armDir, 'status.after'), afterStatus); assert.deepEqual(after, before); assert(members.equals(beforeTracked)); assert(afterStatus.equals(beforeStatus)); row.sourceHeld = true; }
        } catch (error) { row.status = 'failed'; row.cleanupError = String(error?.stack || error); }
        finally { if (serverOut !== undefined) fs.closeSync(serverOut); if (serverErr !== undefined) fs.closeSync(serverErr); if (registered) { git(['worktree', 'remove', '--force', cwd]); removed++; } if (temp) { assert(!fs.existsSync(cwd)); fs.rmdirSync(temp); row.worktreeRemoved = true; } save(); }
      }
      assert.deepEqual(files(path.join(root, 'dist')), canonicalDist, 'Canonical completed dist held through each separate source build');
    }
    assert.equal(summary.arms.length, arms.length); assert(summary.arms.every(row => row.status === 'passed' && row.sourceHeld && row.distHeld && row.serverClosed && row.worktreeRemoved)); summary.status = 'passed';
  } finally {
    sourceHeld(); const sourceAfter = sourceSnapshot(root), distAfter = files(path.join(root, 'dist')); write(path.join(dir, 'canonical-source.after.json'), sourceAfter); write(path.join(dir, 'canonical-dist.after.json'), distAfter); assert.deepEqual(distAfter, canonicalDist); assert.equal(hash(fs.readFileSync(canonicalArchive)), canonicalArchiveSha256);
    for (const value of installed) assert.equal(hash(fs.readFileSync(path.join(out, value.file))), value.sha256); assert.equal(created, removed); empty(outerTransport); summary.sourceHeld = true; summary.canonicalDistHeld = true; summary.allWorktreesRemoved = true; save();
  }
  console.log('Report submit names browser phase: ' + arms.join(',') + ', independently compiled variants, complete source/dist and clean native lifetimes held.');
}
