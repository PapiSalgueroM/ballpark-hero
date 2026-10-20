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
const FIXED = '6b01c67a36add968cc59e0f3a985c2026e8c6f7f4193333a53a3bd4f0bcf3995';
const PRODUCER = '0a9e2f22d69c173c8ac5d37a5ab1193cab5bbd68ee5109a3dc314d16f83fddf0';
const ADMISSION = '54b98c5681ae4221a5c135a0775a2f3451260892f0c0f9d783c3e06243b50688';
const FIXED_SPECS = [{"arm":"normal","sourceSha256":"6b01c67a36add968cc59e0f3a985c2026e8c6f7f4193333a53a3bd4f0bcf3995","faultIds":[],"expectedDropCount":4,"edit":{"after":null,"before":null}},{"arm":"whole-original","sourceSha256":"9eb04f0d5fa75aa2f073475f4b5e3c8243326bd148bc7cc5049a7ba5c1ddc80f","faultIds":["01","02","03","04","05","06","07","08","09","10","11","12","13"],"expectedDropCount":2,"edit":{"after":null,"before":null}},{"arm":"metadata-omission","sourceSha256":"23c6b0d0d34cc3a0afa6c8d8d6004584744cf1419334715a76a05b58aec900d4","faultIds":["12"],"expectedDropCount":3,"edit":{"after":"    const listKey = p => JSON.stringify([p.s, p.chrome]);","before":"    const listKey = p => JSON.stringify([p.s, p.list.tag, p.list.start, p.list.reversed, p.list.type, p.list.ordinal, p.chrome]);"}},{"arm":"occurrence-omission","sourceSha256":"786cf316b1696a41b2b1337f2b9e988cfba514bca887134c5fafb60f47f377b8","faultIds":["09"],"expectedDropCount":3,"edit":{"after":"        counts.set(key, count);","before":"        counts.set(key, count - 1);"}},{"arm":"ordinal-omission","sourceSha256":"6ff74ab3848b49706fc722db1de92a7e8b3215bc6ccc559cc8e9c61c3a3e2327","faultIds":["05","10","11"],"expectedDropCount":4,"edit":{"after":"        lines.push(p.s);","before":"        lines.push(p.list.tag === 'ol' ? p.s.replace(/^<li>/, `<li value=\"${p.list.ordinal}\">`) : p.s);"}},{"arm":"group-owner-omission","sourceSha256":"fa582885fa2c2172ce84408eeee6a9f2d51f816b79e89ad75e03ec199f123166","faultIds":["08"],"expectedDropCount":4,"edit":{"before":"      const sameList = p.list && list && p.list.owner === list.owner && p.list.tag === list.tag && p.list.start === list.start && p.list.reversed === list.reversed && p.list.type === list.type && p.chrome === list.chrome;","after":"      const sameList = p.list && list && p.list.tag === list.tag && p.list.start === list.start && p.list.reversed === list.reversed && p.list.type === list.type && p.chrome === list.chrome;"}},{"arm":"owner-in-clock-key","sourceSha256":"4926d849ae130af0ed52c872694858b6263a93dc2b6272e5dac4fba1329baba6","faultIds":["13"],"expectedDropCount":5,"edit":{"after":"    const listKey = p => JSON.stringify([p.s, p.list.owner, p.list.tag, p.list.start, p.list.reversed, p.list.type, p.list.ordinal, p.chrome]);","before":"    const listKey = p => JSON.stringify([p.s, p.list.tag, p.list.start, p.list.reversed, p.list.type, p.list.ordinal, p.chrome]);"}},{"arm":"restored","sourceSha256":"6b01c67a36add968cc59e0f3a985c2026e8c6f7f4193333a53a3bd4f0bcf3995","faultIds":[],"expectedDropCount":4,"edit":{"after":null,"before":null}}];
const FILE = 'scripts/prerender.mjs', SIM = 'scripts/simPrerenderLists.mjs';
const root = process.cwd(), mode = process.env.SAVED_GUIDE_LISTS_MODE, out = process.env.SAVED_GUIDE_LISTS_OUT;
assert.equal(process.argv.length, 2, 'No undeclared runner arguments');
assert(['baseline', 'fixed'].includes(mode), 'Pinned baseline or fixed mode');
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
assert.equal(sourceSha256, mode === 'baseline' ? ORIGINAL : FIXED); assert.equal(producerSha256, PRODUCER); assert.equal(hash(git(['show', BASE + ':' + FILE])), ORIGINAL);
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
const specs = mode === 'fixed' ? FIXED_SPECS : [{ arm: 'normal', sourceSha256: ORIGINAL, faultIds: titles.slice(0, 13).map((_, i) => String(i + 1).padStart(2, '0')), expectedDropCount: 2, edit: null }];
const counts = { caseCount: specs.length * 15, passedCount: specs.reduce((n, spec) => n + 15 - spec.faultIds.length, 0), expectedFaultCount: specs.reduce((n, spec) => n + spec.faultIds.length, 0) };
const replaceOnce = (body, before, after) => { assert.equal(body.split(before).length, 2, 'One effective source clause'); const changed = body.replace(before, after); assert.notEqual(changed, body); return changed; };
const check = (evidence, actualRoot, invocation, child) => {
  passed(child); const reportFile = path.join(evidence, 'report.json'), report = json(reportFile);
  const bound = row => {
    assert(row && path.isAbsolute(row.file) && Number.isSafeInteger(row.bytes) && row.bytes > 0 && /^[a-f0-9]{64}$/.test(row.sha256));
    const relative = path.relative(actualRoot, row.file); assert(relative && !path.isAbsolute(relative) && !relative.split(path.sep).includes('..'), 'Bound file belongs to this packet');
    const body = fs.readFileSync(path.join(evidence, relative)); assert.equal(body.length, row.bytes); assert.equal(hash(body), row.sha256); return body;
  };
  const record = row => JSON.parse(bound(row).toString('utf8'));
  assert.equal(report.version, 1); assert.equal(report.status, 'passed'); assert.equal(report.scope, 'saved-guide-lists'); assert.equal(report.mode, mode); assert.equal(report.productQualified, false);
  assert.equal(path.resolve(report.evidenceRoot), path.resolve(actualRoot)); assert.equal(report.sourceSha256, sourceSha256); assert.equal(report.physicalSourceSha256, physicalSourceSha256); assert.equal(report.originalSha256, ORIGINAL); assert.equal(report.fixedSha256, FIXED); assert.equal(report.producerSha256, PRODUCER);
  assert.deepEqual(report.defaultInvocation, invocation); assert.deepEqual(report.holds, { sourceHeld: true, distHeld: true, transportEmpty: true }); assert.deepEqual(report.cleanup, { childrenRemoved: true, serversClosed: true, browsersClosed: true });
  for (const [key, value] of Object.entries(counts)) assert.equal(report[key], value); assert.deepEqual(report.arms.map(row => row.arm), specs.map(row => row.arm));
  const admissionBody = bound(report.originalAdmission); assert.equal(hash(admissionBody), ADMISSION); const admission = JSON.parse(admissionBody.toString('utf8')); assert.equal(admission.fullOriginalAdmission, true); assert.equal(admission.originalGeneratorSha256, ORIGINAL);
  const legacy = record(report.admittedLegacy); assert.equal(legacy.sourceSha256, ORIGINAL); assert.equal(legacy.bytes, 682); assert.equal(legacy.sha256, 'f4bc4799fb00f69249bbf4b94a319386bbba8158b14a3da45ce2a32228b71e95'); assert.equal(Buffer.byteLength(legacy.fullSerializedBoundary), legacy.bytes); assert.equal(hash(legacy.fullSerializedBoundary), legacy.sha256);
  const plan = record(report.sourcePlan); assert.equal(plan.version, 1); assert.equal(plan.mode, mode); assert.equal(plan.rootSourceSha256, sourceSha256); assert.equal(plan.originalSha256, ORIGINAL); assert.equal(plan.fixedSha256, FIXED); assert.equal(plan.wholeOriginalInverseExact, true); assert.equal(plan.restoredWholeEqualsNormal, true);
  assert.equal(plan.productHunks.length, 5); assert.deepEqual(plan.modules.map(row => row.arm), specs.map(row => row.arm));
  const original = git(['show', BASE + ':' + FILE]).toString('utf8'); let fixed = original;
  for (const hunk of plan.productHunks) { assert.deepEqual(Object.keys(hunk), ['id', 'before', 'after']); assert(hunk.id && hunk.before && hunk.after); fixed = replaceOnce(fixed, hunk.before, hunk.after); }
  assert.equal(hash(fixed), FIXED); let inverse = fixed; for (const hunk of [...plan.productHunks].reverse()) inverse = replaceOnce(inverse, hunk.after, hunk.before); assert.equal(inverse, original); assert.equal(hash(original), ORIGINAL);
  const sourceBodies = new Map();
  for (const [index, spec] of specs.entries()) {
    const arm = report.arms[index], module = plan.modules[index]; assert.equal(arm.sourceSha256, spec.sourceSha256); assert.equal(module.sourceSha256, spec.sourceSha256); assert.deepEqual(module.expectedFaultIds, spec.faultIds); assert.equal(module.expectedDropCount, spec.expectedDropCount); assert.deepEqual(module.edit, spec.edit);
    const body = bound(module.sourceBody).toString('utf8'); assert.equal(hash(body), spec.sourceSha256); assert.deepEqual(arm.sourceBody, module.sourceBody); assert.equal(bound(arm.sourceBody).toString('utf8'), body);
    let expected = spec.arm === 'whole-original' || mode === 'baseline' ? original : fixed;
    if (spec.edit?.before) { expected = replaceOnce(fixed, spec.edit.before, spec.edit.after); assert.equal(replaceOnce(expected, spec.edit.after, spec.edit.before), fixed); }
    if (spec.arm === 'restored') { const control = FIXED_SPECS.find(row => row.arm === 'owner-in-clock-key'); expected = replaceOnce(sourceBodies.get(control.arm), control.edit.after, control.edit.before); assert.equal(expected, fixed); }
    assert.equal(body, expected); sourceBodies.set(spec.arm, body);
    assert.equal(arm.caseCount, 15); assert.equal(arm.passedCount, 15 - spec.faultIds.length); assert.equal(arm.expectedFaultCount, spec.faultIds.length); assert.deepEqual(arm.expectedFaultIds, spec.faultIds); assert.deepEqual(arm.cleanup, { childrenRemoved: true, serversClosed: true, browsersClosed: true });
    assert.deepEqual(arm.cases.map(row => row.id), titles.map((_, i) => String(i + 1).padStart(2, '0'))); assert.deepEqual(arm.cases.map(row => row.title), titles);
    assert.deepEqual(arm.cases.map(row => row.status), arm.cases.map(row => spec.faultIds.includes(row.id) ? 'expected-fault' : 'passed')); assert.deepEqual(arm.faultTitles, spec.faultIds.map(id => titles[Number(id) - 1]));
    for (const row of arm.cases) { if (spec.faultIds.includes(row.id)) assert(row.error.startsWith('SAVED_LIST_PURPOSE ' + Number(row.id) + ': ')); else assert.equal(row.error, null); }
    for (const [key, size] of [['processes', 5], ['native', 5], ['outputs', 3]]) { assert.equal(arm[key].length, size); for (const row of arm[key]) bound(row); }
    const health = record(arm.guideTextHealth), textControl = record(arm.guideTextControl); assert.equal(health.status, 'passed'); assert.equal(health.checks.length, 6); assert.equal(health.uniqueRouteItems, 62); assert.deepEqual(health.sourceReferenceClocks, [0, 5, 11]); for (const row of health.checks) { assert.equal(row.expectedItemCount, row.route === '/player-bingo' ? 14 : 48); assert.equal(row.expectedTexts.length, row.expectedItemCount); assert.deepEqual(row.missing, []); }
    assert.equal(textControl.status, 'refused'); assert.equal(textControl.assertion.name, 'AssertionError'); assert.equal(textControl.assertion.code, 'ERR_ASSERTION'); assert(textControl.assertion.message.startsWith('SAVED_LIST_REAL_GUIDE_TEXT_HEALTH')); assert.equal(textControl.assertion.actual, 1); assert.equal(textControl.assertion.expected, 0); assert(!bound(textControl.originalText).equals(bound(textControl.changedText)));
    const diagnostic = record(arm.dropDiagnostic); assert.equal(diagnostic.status, 'passed'); assert.equal(diagnostic.controlStatus, 'refused'); assert.equal(diagnostic.sourceSha256, spec.sourceSha256); assert.equal(diagnostic.expectedDropCount, spec.expectedDropCount); assert.equal(diagnostic.actualDropCount, spec.expectedDropCount); assert(bound(diagnostic.processStdout).equals(bound(diagnostic.original))); assert(!bound(diagnostic.original).equals(bound(diagnostic.changed))); assert.equal(diagnostic.assertion.name, 'AssertionError'); assert.equal(diagnostic.assertion.code, 'ERR_ASSERTION'); assert(diagnostic.assertion.message.startsWith('SAVED_LIST_DROP_DIAGNOSTIC')); assert.equal(diagnostic.assertion.actual, spec.expectedDropCount + 1); assert.equal(diagnostic.assertion.expected, spec.expectedDropCount);
    const boundary = record(arm.legacyBoundaryControl); assert.equal(boundary.status, 'passed'); assert.equal(boundary.controlStatus, 'refused'); assert.equal(boundary.sourceSha256, spec.sourceSha256); assert.equal(boundary.admittedBoundarySha256, legacy.sha256); assert.equal(bound(boundary.original).toString('utf8'), legacy.fullSerializedBoundary); assert.equal(bound(boundary.changed).toString('utf8'), legacy.fullSerializedBoundary + '<p>Fictional changed boundary control</p>'); assert.equal(boundary.assertion.name, 'AssertionError'); assert.equal(boundary.assertion.code, 'ERR_ASSERTION'); assert(boundary.assertion.message.startsWith('SAVED_LIST_LEGACY_BOUNDARY')); assert.equal(boundary.assertion.actual, bound(boundary.changed).toString('utf8')); assert.equal(boundary.assertion.expected, legacy.fullSerializedBoundary);
  }
  if (mode === 'fixed') assert.equal(sourceBodies.get('normal'), sourceBodies.get('restored'));
  const lines = (child.stdout || '').trim().split(/\r?\n/).filter(Boolean); assert.equal(lines.length, 4);
  const first = mode === 'baseline' ? 'simPrerenderLists: actual whole original generator completed both real routes and the compiled fictional fixture.' : 'simPrerenderLists: actual whole fixed, original, omission and restored generator sources completed both real routes and the compiled fictional fixture.';
  const second = 'simPrerenderLists: ' + counts.caseCount + ' cases, ' + counts.expectedFaultCount + ' exact expected semantic faults and ' + (mode === 'baseline' ? '2 healthy controls.' : counts.passedCount + ' healthy outcomes.') + ' Product remains unqualified.';
  assert.deepEqual(lines.slice(0, 3), [first, second, 'simPrerenderLists: complete source, dist and held-font input guards passed; disposable children removed.']);
  const marker = 'SAVED_GUIDE_LISTS_COMPLETE '; assert(lines[3].startsWith(marker));
  const terminal = JSON.parse(lines[3].slice(marker.length)); assert.deepEqual(terminal, { mode, status: 'passed', productQualified: false, evidenceRoot: report.evidenceRoot, reportSha256: hash(fs.readFileSync(reportFile)), ...counts });
  return { report: digest(reportFile), terminal, arms: specs.map(row => row.arm), sourcePlan: digest(path.join(evidence, 'source-plan.json')), ...counts };
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
console.log('SAVED_GUIDE_LISTS_RUNNER_COMPLETE ' + JSON.stringify({ mode, productQualified: false, packets: 2, caseCount: counts.caseCount * 2, passedCount: counts.passedCount * 2, expectedFaultCount: counts.expectedFaultCount * 2 }));
