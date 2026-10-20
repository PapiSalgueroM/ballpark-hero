/* Remote-only focused units and compiled actual-Board fixture orchestration. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { BASE as PLAN_BASE, BOARD_FILE, TEST_FILE, TEST_SHA256, TITLES, FAULT_TITLES, UNIT_ARMS, readPlan, sourceForArm } from './transferPathReportContext1439.mjs';

const BASE = 'c8b7279f259143fcd2741091c0a95fd12ba3a9cf';
const BOARD = 'src/components/transfer-path/TransferPathBoard.tsx';
const root = process.cwd(), phase = process.argv[2], mode = process.env.TRANSFER_PATH_CONTEXT_MODE;
const out = process.env.TRANSFER_PATH_CONTEXT_OUT, outerTransport = process.env.SIM_OFFLINE_RECEIPT;
assert.equal(process.argv.length, 3, 'Exactly one declared runner phase');
assert(['units', 'browser'].includes(phase)); assert(['baseline', 'fixed'].includes(mode));
assert.equal(process.env.SIM_NETWORK, 'offline'); assert(['1', 'true'].includes(process.env.CI));
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')], 'Ordinary offline preload is installed');
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const hash = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const json = file => JSON.parse(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const digest = file => { const body = fs.readFileSync(file); return { file: path.relative(out, file).split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }; };
const empty = file => { assert(file && fs.existsSync(file)); assert.equal(fs.statSync(file).size, 0, 'Present empty owned offline transport'); };
empty(outerTransport);
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
assert.equal(status.toString(), '', 'Clean exact committed source before the phase');
git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
const allowed = [BOARD, 'src/test/transferPathReportContext.test.tsx', 'scripts/simTransferPathReportContext.mjs',
  'scripts/qa/transferPathReportContext1439.mjs', 'scripts/qa/playTransferPathReportContext.mjs',
  'scripts/qa/runTransferPathReportContext1439.mjs', '.github/workflows/transfer-path-report-context.yml',
  'scripts/qa/transfer-path-report-context-fixture/entry.tsx', 'scripts/qa/transfer-path-report-context-fixture/boundaries.tsx',
  'scripts/qa/transfer-path-report-context-fixture/fixture.css',
  'docs/ROUND1439-TRANSFER-PATH-REPORT-CONTEXT.md', 'docs/PROJECT-STATE.md', 'docs/WORKBOARD.md'];
const changed = git(['diff', '--name-only', '-z', BASE, 'HEAD']).toString('utf8').split('\0').filter(Boolean);
assert(changed.every(file => allowed.includes(file)), 'Exact Round1439 source boundary');
const names = tracked.toString('utf8').split('\0').filter(Boolean);
const sourceSnapshot = () => names.map(file => { const body = fs.readFileSync(path.join(root, file)); return { file, bytes: body.length, sha256: hash(body) }; });
const sourceBefore = sourceSnapshot();
const sourceHeld = () => { assert.deepEqual(sourceSnapshot(), sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all']))); };
const boardSource = fs.readFileSync(path.join(root, BOARD), 'utf8').replace(/\r\n/g, '\n');
const originalSource = git(['show', BASE + ':' + BOARD]).toString('utf8').replace(/\r\n/g, '\n');
const sourceSha256 = hash(boardSource), originalSha256 = hash(originalSource);
assert.equal(sourceSha256 === originalSha256, mode === 'baseline', 'Mode follows the actual Board source');
assert.equal(PLAN_BASE, BASE); assert.equal(BOARD_FILE, BOARD);
const plan = readPlan(root, mode);
assert.equal(plan.actualSource, boardSource); assert.equal(plan.originalSource, originalSource);
assert.equal(plan.actualSha256, sourceSha256); assert.equal(plan.originalSha256, originalSha256);
assert.equal(hash(fs.readFileSync(path.join(root, TEST_FILE))), TEST_SHA256);
const files = directory => {
  const rows = [];
  const visit = relative => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const file = path.join(relative, entry.name), absolute = path.join(directory, file);
      assert(!entry.isSymbolicLink(), 'Evidence and dist trees contain no symbolic links');
      if (entry.isDirectory()) { rows.push({ file: file.split(path.sep).join('/'), type: 'directory' }); visit(file); }
      else { assert(entry.isFile()); const body = fs.readFileSync(absolute); rows.push({ file: file.split(path.sep).join('/'), type: 'file', bytes: body.length, sha256: hash(body) }); }
    }
  };
  visit(''); assert(rows.some(row => row.type === 'file')); return rows;
};
const childEnv = transport => {
  assert(!fs.existsSync(transport)); fs.writeFileSync(transport, '', { flag: 'wx' });
  return { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: transport };
};
const run = (args, env, prefix, timeout) => {
  const startedAt = new Date().toISOString(), start = Date.now();
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
  fs.writeFileSync(prefix + '.stdout.log', child.stdout || '', { flag: 'wx' });
  fs.writeFileSync(prefix + '.stderr.log', child.stderr || '', { flag: 'wx' });
  const record = { command: [process.execPath, ...args], cwd: root, pid: child.pid ?? null, startedAt, finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - start, timeoutMs: timeout, status: child.status, signal: child.signal,
    error: child.error ? String(child.error) : null, stdout: digest(prefix + '.stdout.log'), stderr: digest(prefix + '.stderr.log') };
  write(prefix + '.process.json', record); return { child, record };
};
const passed = child => {
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test((child.stdout || '') + (child.stderr || '')),
    'Unhandled failures and transport blocks cannot count as expected purpose failures');
};
const stdoutJson = child => { const lines = (child.stdout || '').trim().split(/\r?\n/).filter(Boolean); assert.equal(lines.length, 1, 'One sole focused result JSON line'); return JSON.parse(lines[0]); };
const arms = mode === 'baseline' ? ['normal'] : ['normal', 'whole-original', 'reset-omission', 'copy-omission', 'restored'];
assert.deepEqual(UNIT_ARMS[mode], arms); assert.equal(TITLES.length, 14);
const unitFaults = mode === 'baseline' ? [11] : [0, 11, 9, 2, 0];
const browserFaults = mode === 'baseline' ? [22] : [0, 22, 18, 4, 0];
const unitSummaryFile = path.join(out, 'unit/summary.json');
const checkUnit = file => {
  const value = json(file); assert.equal(value.status, 'passed'); assert.equal(value.mode, mode);
  assert.equal(value.version, 1); assert.equal(value.scope, 'transfer-path-report-context'); assert.equal(value.historicalExecutions, 0);
  assert.equal(value.sourceSha256, sourceSha256); assert.equal(value.originalSha256, originalSha256);
  assert.equal(value.physicalSourceSha256, plan.physicalSourceSha256); assert.deepEqual(value.originalAdmission, plan.originalAdmission);
  assert.equal(value.fixedSha256, plan.fixedSha256); assert.equal(value.testSha256, TEST_SHA256);
  assert.deepEqual(value.wholeInverse, plan.wholeInverse);
  assert.equal(value.sourceHeld, true); assert.equal(value.temporaryModulesRemoved, true); assert.equal(value.productQualified, false);
  assert.deepEqual(value.arms.map(row => row.arm), arms);
  for (const [index, row] of value.arms.entries()) {
    assert.equal(row.cases, 14); assert.equal(row.failed, unitFaults[index]); assert.equal(row.passed, 14 - unitFaults[index]);
    assert.deepEqual(row.faultTitles, FAULT_TITLES[mode === 'baseline' ? 'baseline' : row.arm]);
    for (const field of ['reportSha256', 'traceSha256', 'moduleSha256']) assert.match(row[field], /^[0-9a-f]{64}$/);
    assert.equal(row.moduleSha256, hash(sourceForArm(plan, row.arm)));
    assert.equal(row.actualImport, row.arm === 'normal'); assert.equal(row.transportBytes, 0);
    const directory = path.join(path.dirname(file), row.arm);
    assert.equal(hash(fs.readFileSync(path.join(directory, 'vitest.json'))), row.reportSha256);
    assert.equal(hash(fs.readFileSync(path.join(directory, 'trace.json'))), row.traceSha256);
    assert.equal(hash(fs.readFileSync(path.join(directory, 'process.json'))), row.processSha256);
    empty(path.join(directory, 'transport.transport'));
  }
  assert.deepEqual(value.modules.map(row => row.arm), arms);
  for (const row of value.modules) {
    assert.equal(row.file.split(path.sep).join('/'), 'unit/modules/' + row.arm + '.tsx');
    assert.equal(row.moduleSha256, hash(sourceForArm(plan, row.arm))); assert.equal(row.wholeInverseHeld, true);
    assert.equal(row.actualImport, row.arm === 'normal'); assert.equal(row.actualSourceEqual, sourceForArm(plan, row.arm) === boardSource);
    assert.equal(hash(fs.readFileSync(path.join(path.dirname(file), 'modules', row.arm + '.tsx'))), row.moduleSha256);
  }
  assert.deepEqual(json(path.join(path.dirname(file), 'source-before.json')), json(path.join(path.dirname(file), 'source-after.json')));
  return value;
};

if (phase === 'units') {
  const directory = path.join(out, 'unit-runner'); assert(!fs.existsSync(directory)); fs.mkdirSync(directory);
  const receipt = { status: 'failed', mode, phase, productQualified: false, sourceHeld: false,
    actualNewDefault: { status: 'not-run-on-original-source', fixedOnly: true, productQualified: false } };
  write(path.join(directory, 'source.before.json'), sourceBefore);
  try {
    const transport = path.join(directory, 'explicit.transport');
    const explicit = run(['scripts/simTransferPathReportContext.mjs', '--units-stage'], childEnv(transport), path.join(directory, 'explicit'), 600000);
    receipt.explicit = explicit.record; write(path.join(directory, 'summary.json'), receipt);
    passed(explicit.child); empty(transport); checkUnit(unitSummaryFile);
    const metadata = stdoutJson(explicit.child); assert.equal(metadata.kind, 'transfer-path-context-result'); assert.equal(metadata.mode, mode);
    assert.equal(metadata.modeEnvAbsent, false); assert.equal(metadata.outEnvAbsent, false); assert.equal(path.resolve(metadata.evidenceRoot), path.resolve(out));
    assert.equal(metadata.sourceHeld, true); assert.equal(metadata.temporaryModulesRemoved, true); assert.equal(metadata.productQualified, false);
    assert.equal(metadata.historicalExecutions, 0);
    assert.equal(metadata.summarySha256, hash(fs.readFileSync(unitSummaryFile))); receipt.unitSummarySha256 = metadata.summarySha256; receipt.metadata = metadata;
    if (mode === 'fixed') {
      const directory = path.join(out, 'default-run'); assert(!fs.existsSync(directory)); fs.mkdirSync(directory);
      const prefix = 'transfer-path-context-evidence-', prior = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix));
      const transport = path.join(directory, 'transport.transport'), env = childEnv(transport);
      delete env.TRANSFER_PATH_CONTEXT_MODE; delete env.TRANSFER_PATH_CONTEXT_OUT;
      const played = run(['scripts/simTransferPathReportContext.mjs'], env, path.join(directory, 'child'), 600000);
      const fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix) && !prior.includes(name));
      write(path.join(directory, 'fresh-packet-discovery.json'), { prefix, prior, fresh, modeEnvAbsent: !Object.hasOwn(env, 'TRANSFER_PATH_CONTEXT_MODE'), outEnvAbsent: !Object.hasOwn(env, 'TRANSFER_PATH_CONTEXT_OUT') });
      const packets = []; receipt.actualNewDefault = { status: 'failed', fixedOnly: true, productQualified: false, process: played.record, packets };
      try {
        for (const name of fresh) {
          const actual = fs.realpathSync(path.join(os.tmpdir(), name)); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith(prefix));
          const before = files(actual), copied = path.join(directory, fresh.length === 1 ? 'evidence' : name);
          fs.cpSync(actual, copied, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
          assert.deepEqual(files(copied), before); assert.deepEqual(files(actual), before);
          const manifestFile = path.join(directory, name + '.tree.json'); write(manifestFile, before);
          packets.push({ name, actual, copied, entries: before.length, files: before.filter(row => row.type === 'file').length,
            directories: before.filter(row => row.type === 'directory').length, manifest: digest(manifestFile), removed: false });
        }
        passed(played.child); empty(transport); assert.equal(fresh.length, 1, 'One actual ordinary no-argument new-default packet');
        const metadata = stdoutJson(played.child); assert.equal(metadata.kind, 'transfer-path-context-result'); assert.equal(metadata.mode, 'fixed');
        assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.sourceHeld, true);
        assert.equal(metadata.temporaryModulesRemoved, true); assert.equal(metadata.productQualified, false); assert.equal(fs.realpathSync(metadata.evidenceRoot), packets[0].actual);
        assert.equal(metadata.historicalExecutions, 0);
        const summaryFile = path.join(packets[0].copied, 'unit/summary.json'); assert.equal(hash(fs.readFileSync(summaryFile)), metadata.summarySha256);
        checkUnit(summaryFile); receipt.actualNewDefault.status = 'passed'; receipt.actualNewDefault.metadata = metadata;
      } catch (error) { receipt.actualNewDefault.error = String(error?.stack || error); throw error; }
      finally {
        for (const packet of packets) { assert.equal(path.dirname(packet.actual), fs.realpathSync(os.tmpdir())); assert(path.basename(packet.actual).startsWith(prefix)); fs.rmSync(packet.actual, { recursive: true, force: true }); assert(!fs.existsSync(packet.actual)); packet.removed = true; }
        receipt.actualNewDefault.allDefaultPacketsRemoved = packets.length === fresh.length && packets.every(row => row.removed);
        write(path.join(directory, 'receipt.json'), receipt.actualNewDefault);
      }
    }
    sourceHeld(); receipt.status = 'passed';
  } catch (error) { receipt.error = String(error?.stack || error); throw error; }
  finally {
    try { sourceHeld(); empty(outerTransport); receipt.sourceHeld = true; }
    catch (error) { receipt.status = 'failed'; receipt.holdError = String(error?.stack || error); throw error; }
    finally { write(path.join(directory, 'source.after.json'), sourceSnapshot()); write(path.join(directory, 'summary.json'), receipt); }
  }
  console.log('TRANSFER_PATH_REPORT_CONTEXT_UNITS_COMPLETE ' + JSON.stringify({ mode, arms: arms.length, cases: arms.length * 14, purposeFaults: unitFaults.reduce((a, b) => a + b, 0), productQualified: false }));
} else {
  checkUnit(unitSummaryFile); const unitRunner = json(path.join(out, 'unit-runner/summary.json'));
  assert.equal(unitRunner.status, 'passed'); assert.equal(unitRunner.sourceHeld, true); assert.equal(unitRunner.unitSummarySha256, hash(fs.readFileSync(unitSummaryFile)));
  assert.equal(unitRunner.actualNewDefault.status, mode === 'fixed' ? 'passed' : 'not-run-on-original-source');
  const directory = path.join(out, 'browser-runner'); assert(!fs.existsSync(directory)); fs.mkdirSync(directory);
  const canonicalDist = files(path.join(root, 'dist')), canonicalArchive = path.join(out, 'dist.zip');
  const canonicalArchiveSha256 = hash(fs.readFileSync(canonicalArchive));
  write(path.join(directory, 'canonical-source.before.json'), sourceBefore); write(path.join(directory, 'canonical-dist.before.json'), canonicalDist);
  const manifestFiles = ['dependency-files.sha256', 'browser-tool-files.sha256', 'browser-executable-files.sha256', 'font-files.sha256', 'python-tool-files.sha256', 'node-executable.sha256', 'python-executable.sha256'];
  const installed = manifestFiles.map(file => digest(path.join(out, file))); write(path.join(directory, 'installed-input-manifests.json'), installed);
  const receipt = { status: 'failed', mode, phase, productQualified: false, sourceHeld: false, canonicalDistHeld: false, canonicalArchiveSha256 };
  try {
    const transport = path.join(directory, 'browser.transport'), env = childEnv(transport);
    const browserDirectory = path.join(out, 'browser');
    Object.assign(env, { DEBUG: 'pw:browser', DEBUG_COLORS: '0', TRANSFER_PATH_CONTEXT_MODE: mode, TRANSFER_PATH_CONTEXT_OUT: browserDirectory });
    const played = run(['scripts/qa/playTransferPathReportContext.mjs', '--root', root, '--mode', mode, '--out', browserDirectory], env, path.join(directory, 'browser'), 1800000);
    receipt.process = played.record; write(path.join(directory, 'summary.json'), receipt); passed(played.child); empty(transport);
    const reportFile = path.join(out, 'browser/report.json'), report = json(reportFile);
    assert.equal(report.status, 'passed'); assert.equal(report.mode, mode); assert.equal(report.productQualified, false);
    assert.equal(report.version, 1); assert.equal(report.sourceSha256, sourceSha256); assert.equal(report.physicalSourceSha256, plan.physicalSourceSha256);
    assert.equal(report.cleanupPassed, true); assert.equal(report.nativeLogsPassed, true);
    assert.deepEqual(report.holds, { sourceBoardHeld: true, fixtureSourcesHeld: true, producerInputBodiesHeld: true, ordinaryOfflineReceiptEmpty: true });
    assert.deepEqual(report.arms.map(row => row.arm), arms);
    const bind = (record, expectedFile) => {
      assert.equal(record.file, expectedFile); const file = path.resolve(browserDirectory, record.file);
      assert(file.startsWith(browserDirectory + path.sep)); const body = fs.readFileSync(file);
      assert.equal(body.length, record.bytes); assert.equal(hash(body), record.sha256);
    };
    for (const [index, row] of report.arms.entries()) {
      assert.equal(row.status, 'passed'); assert.equal(row.sourceSha256, hash(sourceForArm(plan, row.arm)));
      assert.equal(row.contextCount, 2); assert.equal(row.faultCount, browserFaults[index]); assert.equal(row.purposeCheckCount, 22); assert.equal(row.healthyPreservationCount, 6);
      assert.deepEqual(row.cleanup, { serverClosed: true, scratchRemoved: true });
      bind(row.report, row.arm + '/report.json'); bind(row.nativeLogValidation, row.arm + '/native-log-validation.json');
    }
    const expected = { arms: arms.length, contexts: arms.length * 2, purposeChecks: arms.length * 22,
      purposeFaults: browserFaults.reduce((a, b) => a + b, 0), healthyPreservationGroups: arms.length * 6, images: arms.length * 8, axJoins: arms.length * 2 };
    assert.deepEqual(report.summary, expected);
    const lines = (played.child.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1); assert(lines[0].startsWith('TRANSFER_PATH_REPORT_CONTEXT_BROWSER_COMPLETE '));
    const terminal = JSON.parse(lines[0].slice('TRANSFER_PATH_REPORT_CONTEXT_BROWSER_COMPLETE '.length));
    assert.deepEqual(terminal, { mode, productQualified: false, arms: expected.arms, contexts: expected.contexts,
      purposeChecks: expected.purposeChecks, purposeFaults: expected.purposeFaults, healthyPreservationGroups: expected.healthyPreservationGroups,
      images: expected.images, axJoins: expected.axJoins, cleanupPassed: true, nativeLogsPassed: true, reportSha256: hash(fs.readFileSync(reportFile)) });
    receipt.report = digest(reportFile); receipt.terminal = terminal; receipt.status = 'passed';
  } catch (error) { receipt.error = String(error?.stack || error); throw error; }
  finally {
    try {
      sourceHeld(); empty(outerTransport); const after = files(path.join(root, 'dist')); assert.deepEqual(after, canonicalDist);
      assert.equal(hash(fs.readFileSync(canonicalArchive)), canonicalArchiveSha256);
      for (const item of installed) assert.equal(hash(fs.readFileSync(path.join(out, item.file))), item.sha256);
      write(path.join(directory, 'canonical-source.after.json'), sourceSnapshot()); write(path.join(directory, 'canonical-dist.after.json'), after);
      receipt.sourceHeld = true; receipt.canonicalDistHeld = true;
    } catch (error) { receipt.status = 'failed'; receipt.holdError = String(error?.stack || error); throw error; }
    finally { write(path.join(directory, 'summary.json'), receipt); }
  }
  console.log('TRANSFER_PATH_REPORT_CONTEXT_BROWSER_RUNNER_COMPLETE ' + JSON.stringify({ mode, arms: arms.length, contexts: arms.length * 2, purposeFaults: browserFaults.reduce((a, b) => a + b, 0), productQualified: false }));
}
