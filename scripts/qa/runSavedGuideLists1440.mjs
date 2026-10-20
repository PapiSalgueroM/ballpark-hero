/* Remote-only saved-list proof after the unchanged common gates. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'e5596fb2f44c3a7e0304af79bbb6568763aea9fc';
const ORIGINAL = '9eb04f0d5fa75aa2f073475f4b5e3c8243326bd148bc7cc5049a7ba5c1ddc80f';
const FILE = 'scripts/prerender.mjs', SIM = 'scripts/simPrerenderLists.mjs';
const root = process.cwd(), mode = process.env.SAVED_GUIDE_LISTS_MODE, out = process.env.SAVED_GUIDE_LISTS_OUT;
assert.equal(process.argv.length, 2, 'No undeclared runner arguments');
assert.equal(mode, 'baseline', 'Fixed source is not admitted by this initial baseline producer');
assert.equal(process.env.SIM_NETWORK, 'offline'); assert(['1', 'true'].includes(process.env.CI));
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')], 'Ordinary offline preload is installed');
const hash = value => createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const digest = file => { const body = fs.readFileSync(file); return { file: path.relative(out, file).split(path.sep).join('/'), bytes: body.length, sha256: hash(body) }; };
const empty = file => { assert(file && fs.existsSync(file)); assert.equal(fs.statSync(file).size, 0, 'Present empty ordinary offline receipt'); };
empty(process.env.SIM_OFFLINE_RECEIPT);
const readers = ['simAdsense', 'simBrand', 'simHeadTags', 'simHiddenPages', 'simHubs', 'simIndexNow', 'simIndexing', 'simInternalLinks', 'simNoRivalNames', 'simPrerender', 'simPrerenderBoot', 'simRetiredRoutes', 'simSchema', 'simSitemap', 'simSnapshotAssets', 'simGuideHeadings', 'simSiteSearch'];
const caps = '/\t244\n/club-manager\t619\n/soccer-career\t835\n/stadium-tycoon\t303\n/wonderkid-factory\t277\n/minefield\t295\n/footle\t354\n/nfl-my-career\t491\n/front-office\t374\n/soccer-grid\t319\n/leaderboard\t266\n/manager-hot-seat\t636\n/deadline-day\t646\n/transfer-path\t379\n';
const processRecord = (file, command) => {
  const rows = fs.readFileSync(path.join(out, file), 'utf8').trim().split(/\r?\n/);
  const fields = Object.fromEntries(rows.map(line => { const at = line.indexOf('='); assert(at > 0); return [line.slice(0, at), line.slice(at + 1)]; }));
  assert.deepEqual(Object.keys(fields), ['started', 'finished', 'status', 'command']); assert.equal(fields.status, '0'); assert.equal(fields.command, command);
  const started = Date.parse(fields.started), finished = Date.parse(fields.finished);
  assert(Number.isFinite(started) && Number.isFinite(finished) && started <= finished && finished <= Date.now());
  return { file, started, finished };
};
const types = processRecord('types.process.txt', 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
const build = processRecord('build.process.txt', 'npm run build'); assert(types.finished <= build.started);
assert.equal(fs.readFileSync(path.join(out, 'readers.tsv'), 'utf8'), readers.slice(0, 15).map(name => name + '\t0\n').join(''));
assert.equal(fs.readFileSync(path.join(out, 'extras-readers.tsv'), 'utf8'), readers.slice(15).map(name => name + '\t0\n').join(''));
let previous = build.finished;
for (const name of readers) {
  const row = processRecord('readers/' + name + '.process.txt', 'ONLY=' + name + ' node scripts/runAllSims.mjs --browser'); assert(previous <= row.started); previous = row.finished;
  assert.equal(fs.readFileSync(path.join(out, 'readers/' + name + '.closing-line.txt'), 'utf8'), 'All 1 harnesses green.\n'); empty(path.join(out, 'readers/' + name + '.transport'));
}
const weights = processRecord('weights.process.txt', 'SWEEP_OFFLINE=1 BASE=http://127.0.0.1:4173 SWEEP_BASE=http://127.0.0.1:4173 node scripts/sweepWeight.mjs'); assert(previous <= weights.started);
assert.equal(fs.readFileSync(path.join(out, 'weights-expected.tsv'), 'utf8'), caps); assert.equal(fs.readFileSync(path.join(out, 'weights-observed.tsv'), 'utf8'), caps);
assert.equal(fs.readFileSync(path.join(out, 'weights-closing-line.txt'), 'utf8'), 'sweepWeight: green. Every page is inside its budget, and the budgets came down this round.\n');
for (const name of ['types', 'build', 'server-weights']) empty(path.join(out, name + '.transport'));
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']); assert.equal(status.toString(), '');
git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
const allowed = [FILE, SIM, 'scripts/qa/runSavedGuideLists1440.mjs', '.github/workflows/saved-guide-lists.yml', 'docs/ROUND1440-SAVED-GUIDE-LISTS.md', 'docs/PROJECT-STATE.md', 'docs/WORKBOARD.md'];
assert(git(['diff', '--name-only', '-z', BASE, 'HEAD']).toString().split('\0').filter(Boolean).every(file => allowed.includes(file)));
const names = tracked.toString().split('\0').filter(Boolean);
const snapshot = () => names.map(file => { const body = fs.readFileSync(path.join(root, file)); return { file, bytes: body.length, sha256: hash(body) }; });
const sourceBefore = snapshot(), actual = fs.readFileSync(path.join(root, FILE));
const sourceSha256 = hash(actual.toString('utf8').replace(/\r\n/g, '\n')), physicalSourceSha256 = hash(actual), producerSha256 = hash(fs.readFileSync(path.join(root, SIM)));
assert.equal(sourceSha256, ORIGINAL); assert.equal(hash(git(['show', BASE + ':' + FILE])), ORIGINAL);
const sourceHeld = () => { assert.deepEqual(snapshot(), sourceBefore); assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all']))); };
const tree = directory => {
  const rows = [];
  const visit = relative => { for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    assert(!entry.isSymbolicLink()); const rel = path.join(relative, entry.name), file = path.join(directory, rel), name = rel.split(path.sep).join('/');
    if (entry.isDirectory()) { rows.push({ file: name, type: 'directory' }); visit(rel); }
    else { assert(entry.isFile()); const body = fs.readFileSync(file); rows.push({ file: name, type: 'file', bytes: body.length, sha256: hash(body) }); }
  } }; visit(''); assert(rows.some(row => row.type === 'file')); return rows;
};
const distBefore = tree(path.join(root, 'dist'));
const manifestNames = ['source.zip', 'dist.zip', 'dependency-files.sha256', 'browser-tool-files.sha256', 'browser-executable-files.sha256', 'font-files.sha256', 'python-tool-files.sha256', 'node-executable.sha256', 'python-executable.sha256'];
const installedBefore = manifestNames.map(name => digest(path.join(out, name)));
const directory = path.join(out, 'focused-runner'); assert(!fs.existsSync(directory)); fs.mkdirSync(directory);
write(path.join(directory, 'source.before.json'), sourceBefore); write(path.join(directory, 'dist.before.json'), distBefore); write(path.join(directory, 'input-bindings.before.json'), installedBefore);
const receipt = { version: 1, status: 'failed', mode, productQualified: false, sourceSha256, physicalSourceSha256, producerSha256, commonFirst: true, packets: [] };
const titles = ['Player Bingo retains its actual guide list groups', 'Soccer Career retains its actual guide list groups', 'Flat unordered items retain their owner and long text', 'Ordered start remains the source start', 'Explicit item values reset source numbering', 'Reversed explicit start keeps descending values', 'Reversed default start uses the original item count', 'Adjacent distinct list owners stay distinct', 'Duplicate list occurrences keep clock-common multiplicity', 'A dated child does not erase static numbered siblings', 'Marked middle removal keeps original numbered gaps', 'Changing parent attributes do not freeze first-sample metadata', 'An unrelated preceding list does not erase the target', 'Legacy fallback links tables and chrome remain unchanged', 'Attributed list clock output is effectively rejected'];
const childEnv = file => { assert(!fs.existsSync(file)); fs.writeFileSync(file, '', { flag: 'wx' }); return { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: file, DEBUG: 'pw:browser', DEBUG_COLORS: '0' }; };
const run = (args, env, prefix) => {
  const startedAt = new Date().toISOString(), start = Date.now(); assert(weights.finished <= start);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 1800000 });
  fs.writeFileSync(prefix + '.stdout.log', child.stdout || '', { flag: 'wx' }); fs.writeFileSync(prefix + '.stderr.log', child.stderr || '', { flag: 'wx' });
  const record = { command: [process.execPath, ...args], cwd: root, pid: child.pid ?? null, startedAt, finishedAt: new Date().toISOString(), elapsedMs: Date.now() - start, timeoutMs: 1800000, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, stdout: digest(prefix + '.stdout.log'), stderr: digest(prefix + '.stderr.log') };
  write(prefix + '.process.json', record); return { child, record };
};
const passed = child => { assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0); assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test((child.stdout || '') + (child.stderr || ''))); };
const check = (evidence, actualRoot, invocation, child) => {
  passed(child); const reportFile = path.join(evidence, 'report.json'), report = json(reportFile);
  assert.equal(report.version, 1); assert.equal(report.status, 'passed'); assert.equal(report.scope, 'saved-guide-lists'); assert.equal(report.mode, mode); assert.equal(report.productQualified, false);
  assert.equal(path.resolve(report.evidenceRoot), path.resolve(actualRoot)); assert.equal(report.sourceSha256, sourceSha256); assert.equal(report.physicalSourceSha256, physicalSourceSha256); assert.equal(report.originalSha256, ORIGINAL); assert.equal(report.producerSha256, producerSha256);
  assert.deepEqual(report.defaultInvocation, invocation); assert.deepEqual(report.holds, { sourceHeld: true, distHeld: true, transportEmpty: true }); assert.deepEqual(report.cleanup, { childrenRemoved: true, serversClosed: true, browsersClosed: true });
  assert.equal(report.caseCount, 15); assert.equal(report.passedCount, 2); assert.equal(report.expectedFaultCount, 13); assert.deepEqual(report.arms.map(row => row.arm), ['normal']);
  const arm = report.arms[0]; assert.equal(arm.sourceSha256, sourceSha256); assert.equal(arm.caseCount, 15); assert.equal(arm.passedCount, 2); assert.equal(arm.expectedFaultCount, 13);
  assert.deepEqual(arm.cases.map(row => row.id), Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'))); assert.deepEqual(arm.cases.map(row => row.title), titles);
  assert.deepEqual(arm.cases.map(row => row.status), titles.map((_, i) => i < 13 ? 'expected-fault' : 'passed')); assert.deepEqual(arm.faultTitles, titles.slice(0, 13));
  for (const field of ['processes', 'native', 'outputs']) assert(Array.isArray(arm[field]) && arm[field].length > 0, 'Nonempty actual evidence bindings');
  const lines = (child.stdout || '').trim().split(/\r?\n/).filter(Boolean); assert.equal(lines.length, 4);
  assert.deepEqual(lines.slice(0, 3), ['simPrerenderLists: actual whole original generator completed both real routes and the compiled fictional fixture.', 'simPrerenderLists: 15 cases, 13 exact expected semantic faults and 2 healthy controls. Product remains unqualified.', 'simPrerenderLists: complete source, dist and held-font input guards passed; disposable children removed.']);
  const marker = 'SAVED_GUIDE_LISTS_COMPLETE '; assert(lines[3].startsWith(marker));
  const terminal = JSON.parse(lines[3].slice(marker.length)); assert.deepEqual(terminal, { mode, status: 'passed', productQualified: false, evidenceRoot: report.evidenceRoot, reportSha256: hash(fs.readFileSync(reportFile)), caseCount: 15, passedCount: 2, expectedFaultCount: 13 });
  return { report: digest(reportFile), terminal, caseCount: 15, passedCount: 2, expectedFaultCount: 13 };
};
try {
  const evidence = path.join(out, 'focused'), transport = path.join(directory, 'explicit.transport'), env = childEnv(transport); assert(!fs.existsSync(evidence));
  Object.assign(env, { SAVED_GUIDE_LISTS_MODE: mode, SAVED_GUIDE_LISTS_OUT: evidence });
  const explicit = run([SIM, '--root', root, '--mode', mode, '--out', evidence], env, path.join(directory, 'explicit')); receipt.explicitProcess = explicit.record; write(path.join(directory, 'receipt.json'), receipt);
  const explicitResult = check(evidence, evidence, { modeAbsent: false, outAbsent: false, noArguments: false }, explicit.child); empty(transport); receipt.packets.push({ invocation: 'explicit', ...explicitResult });
  const defaultDir = path.join(out, 'default-run'); assert(!fs.existsSync(defaultDir)); fs.mkdirSync(defaultDir);
  const prefix = 'saved-guide-lists-evidence-', prior = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix)), defaultTransport = path.join(defaultDir, 'transport.transport'), defaultEnv = childEnv(defaultTransport);
  delete defaultEnv.SAVED_GUIDE_LISTS_MODE; delete defaultEnv.SAVED_GUIDE_LISTS_OUT;
  const ordinary = run([SIM], defaultEnv, path.join(defaultDir, 'child')); receipt.defaultProcess = ordinary.record;
  const fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix) && !prior.includes(name)); write(path.join(defaultDir, 'discovery.json'), { prefix, prior, fresh, modeAbsent: true, outAbsent: true, noArguments: true });
  const copied = [];
  try {
    for (const name of fresh) {
      const actual = fs.realpathSync(path.join(os.tmpdir(), name)); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith(prefix));
      const before = tree(actual), copy = path.join(defaultDir, fresh.length === 1 ? 'evidence' : name); fs.cpSync(actual, copy, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true }); assert.deepEqual(tree(copy), before); assert.deepEqual(tree(actual), before);
      const manifestFile = path.join(defaultDir, name + '.tree.json'); write(manifestFile, before); copied.push({ actual, copy, manifest: digest(manifestFile), removed: false });
    }
    passed(ordinary.child); empty(defaultTransport); assert.equal(fresh.length, 1, 'One actual ordinary absent-env no-argument packet');
    const result = check(copied[0].copy, copied[0].actual, { modeAbsent: true, outAbsent: true, noArguments: true }, ordinary.child); receipt.packets.push({ invocation: 'ordinary-default', ...result });
  } finally {
    for (const packet of copied) { assert.equal(path.dirname(packet.actual), fs.realpathSync(os.tmpdir())); assert(path.basename(packet.actual).startsWith(prefix)); fs.rmSync(packet.actual, { recursive: true, force: true }); assert(!fs.existsSync(packet.actual)); packet.removed = true; }
    receipt.defaultCopies = copied; receipt.allDefaultPacketsRemoved = copied.length === fresh.length && copied.every(row => row.removed); write(path.join(defaultDir, 'receipt.json'), { status: receipt.packets.length === 2 ? 'passed' : 'failed', process: ordinary.record, copied, allDefaultPacketsRemoved: receipt.allDefaultPacketsRemoved });
  }
  assert.equal(receipt.packets.length, 2); assert.equal(receipt.allDefaultPacketsRemoved, true); receipt.status = 'passed';
} catch (error) { receipt.error = String(error?.stack || error); throw error; }
finally {
  try { sourceHeld(); assert.deepEqual(tree(path.join(root, 'dist')), distBefore); assert.deepEqual(manifestNames.map(name => digest(path.join(out, name))), installedBefore); empty(process.env.SIM_OFFLINE_RECEIPT); receipt.sourceHeld = true; receipt.distHeld = true; receipt.installedInputManifestBodiesHeld = true; }
  catch (error) { receipt.status = 'failed'; receipt.holdError = String(error?.stack || error); throw error; }
  finally { write(path.join(directory, 'source.after.json'), snapshot()); write(path.join(directory, 'dist.after.json'), tree(path.join(root, 'dist'))); write(path.join(directory, 'receipt.json'), receipt); }
}
console.log('SAVED_GUIDE_LISTS_RUNNER_COMPLETE ' + JSON.stringify({ mode, productQualified: false, packets: 2, caseCount: 30, passedCount: 4, expectedFaultCount: 26 }));
