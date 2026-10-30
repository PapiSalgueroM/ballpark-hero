import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const PRODUCT = '50394b38cbce7ef47041116059f9c9802ce3fe1a';
const TREE = 'ee2dcfea808a27c4313aadafc750578de99ef9f0';
const ORIGINAL = '1e648744ab7b3bc6bea3f6f85ac5836f0f2c4230eac0ef10620675c6f088cff7';
const INSERTIONS = {"schema":1,"kind":"PASSIVE_INSERTIONS_ONLY","originalSHA256":"1e648744ab7b3bc6bea3f6f85ac5836f0f2c4230eac0ef10620675c6f088cff7","diagnosticSHA256":"386550e067bc05734c40fb086e6c354b659c61125d553a5109072ee169a7cf51","wholeForwardAndInverseExact":true,"operations":[{"from":"import * as esbuild from 'esbuild';","to":"import * as esbuild from 'esbuild';\nimport { createDeckCapture } from '../.rc/deck-observer.mjs';"},{"from":"const sha1 = t => createHash('sha1').update(t).digest('hex');","to":"const sha1 = t => createHash('sha1').update(t).digest('hex');\nconst capture = createDeckCapture(ROOT, process.env.SOCCER_DECK_CAPTURE_OUT);"},{"from":"        : (swapped.get(rel) ?? readSrc(rel));","to":"        : (swapped.get(rel) ?? readSrc(rel));\n      capture.source(tag, rel, 'input', source);"},{"from":"      if (!ref && moraleOut) source = inverseSoccerMorale(rel, source, moraleReceipt);","to":"      if (!ref && moraleOut) source = inverseSoccerMorale(rel, source, moraleReceipt);\n      capture.source(tag, rel, 'after-morale', source);"},{"from":"        marked += 1;\n      }","to":"        marked += 1;\n      }\n      capture.source(tag, rel, 'after-mark', source);"},{"from":"  assert.equal(marked, 1, `the ${tag} bundle loaded the engine exactly once`);","to":"  assert.equal(marked, 1, `the ${tag} bundle loaded the engine exactly once`);\n  capture.bundle(tag, out);"},{"from":"    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);","to":"    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);\n    capture.draw(((t ^ (t >>> 14)) >>> 0) / 4294967296);"},{"from":"\n    onStep?.(s);","to":"\n    onStep?.(s);\n    capture.state(s);"},{"from":"\n      onStep?.(s);","to":"\n      onStep?.(s);\n      capture.state(s);"},{"from":"    const hs = [], bs = [];","to":"    const hs = [], bs = [];\n    capture.begin2(seed, 'HL');"},{"from":"    const h = drive(H.engine, seed, { onStep: s => hs.push(sha1(JSON.stringify(s))) });","to":"    const h = drive(H.engine, seed, { onStep: s => hs.push(sha1(JSON.stringify(s))) });\n    capture.end2();\n    capture.begin2(seed, 'B');"},{"from":"    const b = drive(B.engine, seed, { onStep: s => bs.push(sha1(JSON.stringify(s))) });","to":"    const b = drive(B.engine, seed, { onStep: s => bs.push(sha1(JSON.stringify(s))) });\n    capture.end2();"},{"from":"    if (h.calls !== b.calls) callsDiffer += 1;","to":"    if (h.calls !== b.calls) callsDiffer += 1;\n    await capture.pair2(seed, i, hs, bs, h, b);"},{"from":"  else if (deckAnswers) ok('every season end save equals the base\\'s once the deck\\'s own stamps are taken out');","to":"  else if (deckAnswers) ok('every season end save equals the base\\'s once the deck\\'s own stamps are taken out');\n  capture.counts(4, { careers: FLEET, seasons, apart, deckAnswers, empties: empties.length });"},{"from":"        apart += 1;","to":"        apart += 1;\n        capture.pair4(seed, i, h.ends[i], b.ends[i], h.ends[i] === undefined ? undefined : withoutDeckStamps(h.ends[i]), h.s, b.s);"},{"from":"  if (!differ && !callsDiffer) ok('every save after every step byte equal to the base, and every career\\'s Math.random count equal');","to":"  if (!differ && !callsDiffer) ok('every save after every step byte equal to the base, and every career\\'s Math.random count equal');\n  capture.counts(2, { careers: FLEET, steps, differ, callsDiffer, calls });"},{"from":"    for (let k = 0; k < 60; k += 1) { const t = step(M, s, seed, clubs); if (!t) break; s = t; if (s.phase === 'playing') break; }","to":"    for (let k = 0; k < 60; k += 1) { const t = step(M, s, seed, clubs); if (!t) break; s = t; if (s.phase === 'playing') break; }\n    capture.played9(M === H.engine ? 'HL' : 'B', JSON.stringify(s));"},{"from":"    for (const json of saves) {\n      loaded += 1;","to":"    for (const json of saves) {\n      loaded += 1;\n      capture.begin9(seed, loaded, json);"},{"from":"        if (h !== b) apartLoad += 1;","to":"        if (h !== b) apartLoad += 1;\n        capture.loaded9(h, b);"},{"from":"        if (playSeason(H.engine, JSON.parse(json), seed) !== playSeason(B.engine, JSON.parse(json), seed)) apartPlay += 1;","to":"        if (playSeason(H.engine, JSON.parse(json), seed) !== playSeason(B.engine, JSON.parse(json), seed)) apartPlay += 1;\n        capture.end9();"},{"from":"  else ok('every base save loads to the same JSON here and plays the same season');","to":"  else ok('every base save loads to the same JSON here and plays the same season');\n  capture.counts(9, { loaded, apartLoad, apartPlay, threw });"},{"from":"console.log('');\nconsole.log(`runtime ${secs()} s`);","to":"console.log('');\nconsole.log(`runtime ${secs()} s`);\ncapture.finish({ failures, red: [...red], control: CONTROL, selectedSections: SECTIONS });"}]};
const root = fs.realpathSync(process.cwd());
const output = path.join(process.env.RUNNER_TEMP, 'rc-out/full/deck-capture');
const matched = path.join(process.env.RUNNER_TEMP, `deck-capture-matched-${process.env.GITHUB_RUN_ID}-a${process.env.GITHUB_RUN_ATTEMPT}`);
const harness = 'scripts/simSoccerDeck.mjs';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 32 * 1024 * 1024 });
const sha = body => createHash('sha256').update(body).digest('hex');
const json = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceRows = git('ls-files', '-s', '-z').split('\0').filter(Boolean).map(line => {
  const match = /^(100644|100755) ([a-f0-9]{40}) 0\t(.+)$/.exec(line);
  assert(match, 'TRACKED_REGULAR_SOURCE_ONLY');
  return { mode: match[1], gitBlob: match[2], file: match[3] };
});
assert.equal(git('rev-parse', 'HEAD^').trim(), PRODUCT, 'FIXED_PRODUCT');
assert.equal(git('rev-parse', 'HEAD^:').trim(), TREE, 'FIXED_TREE');
assert.equal(sourceRows.length, 5512, 'PRODUCT5502_PLUS10QA');
for (const key of ['SIM_SOCCER_DECK_CONTROL', 'SIM_SOCCER_DECK_SECTIONS', 'SIM_SOCCER_DECK_MORALE', 'SIM_SOCCER_DECK_BASE']) {
  assert.equal(process.env[key], undefined, `UNALTERED_DEFAULT_ENV_${key}`);
}
assert(!fs.existsSync(output) && !fs.existsSync(matched), 'FRESH_DIAGNOSTIC_OUTPUTS');
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(matched);
const original = fs.readFileSync(path.join(root, harness));
assert.equal(sha(original), ORIGINAL, 'ORIGINAL_HARNESS_BODY');
assert.equal(INSERTIONS.originalSHA256, ORIGINAL, 'INSERTION_ORIGINAL_PIN');
let diagnostic = original.toString('utf8');
for (const op of INSERTIONS.operations) {
  assert.equal(diagnostic.split(op.from).length - 1, 1, 'INSERTION_UNIQUE');
  diagnostic = diagnostic.replace(op.from, () => op.to);
}
assert.equal(sha(diagnostic), INSERTIONS.diagnosticSHA256, 'DIAGNOSTIC_BODY_PIN');
let inverse = diagnostic;
for (const op of [...INSERTIONS.operations].reverse()) {
  assert.equal(inverse.split(op.to).length - 1, 1, 'INVERSE_UNIQUE');
  inverse = inverse.replace(op.to, () => op.from);
}
assert.equal(inverse, original.toString('utf8'), 'WHOLE_INVERSE_EXACT');
const snapshot = base => sourceRows.map(r => {
  const file = path.join(base, r.file), st = fs.statSync(file), body = fs.readFileSync(file);
  return { ...r, bytes: body.length, sha256: sha(body), executable: Boolean(st.mode & 0o111) };
});
const files = base => fs.readdirSync(base, { withFileTypes: true }).flatMap(d => d.isDirectory()
  ? files(path.join(base, d.name)) : d.isFile() ? [path.join(base, d.name)] : []);
const dist = base => files(path.join(base, 'dist')).sort().map(file => ({
  file: path.relative(path.join(base, 'dist'), file).split(path.sep).join('/'), sha256: sha(fs.readFileSync(file)) }));
const before = snapshot(root), distBefore = dist(root);
assert.equal(distBefore.length, 836, 'ORDINARY_DIST836');
for (const r of sourceRows) {
  const dest = path.join(matched, r.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, r.file), dest);
  fs.chmodSync(dest, r.mode === '100755' ? 0o755 : 0o644);
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(matched, 'node_modules'), 'dir');
fs.cpSync(path.join(root, 'dist'), path.join(matched, 'dist'), { recursive: true });
const gitDir = path.resolve(root, git('rev-parse', '--git-dir').trim());
fs.mkdirSync(path.join(matched, '.git'));
fs.symlinkSync(path.join(gitDir, 'objects'), path.join(matched, '.git/objects'), 'dir');
fs.writeFileSync(path.join(matched, '.git/HEAD'), git('rev-parse', 'HEAD'));
fs.writeFileSync(path.join(matched, '.git/config'), '[core]\nrepositoryformatversion = 0\nbare = false\n');
assert.deepEqual(snapshot(matched), before, 'MATCHED_SOURCE_BODY_MODE_MEMBERSHIP');
assert.deepEqual(dist(matched), distBefore, 'MATCHED_DIST');
json('SOURCE-BEFORE.json', before);
json('DIST-BEFORE.json', distBefore);
json('EXACT-INSERTIONS.json', INSERTIONS);
fs.writeFileSync(path.join(output, 'simSoccerDeck.original.mjs'), original);
fs.writeFileSync(path.join(output, 'simSoccerDeck.diagnostic.mjs'), diagnostic);
const ordinaryDir = path.join(process.env.RUNNER_TEMP, 'rc-out/full/simSoccerDeck.mjs');
const ordinaryWrapper = JSON.parse(fs.readFileSync(path.join(ordinaryDir, 'process.json')));
assert([0, 1].includes(ordinaryWrapper.status), 'ORIGINAL_WRAPPER_COMPLETED');
const journalDir = path.join(ordinaryDir, 'journal');
const journal = fs.readFileSync(path.join(journalDir, 'journal.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const active = journal.filter(row => row.event === 'journal-active')[0];
assert(active && active.root === root && active.argv.length === 3 && active.argv[1] === path.join(root, 'scripts/runAllSims.mjs') && active.argv[2] === '--browser', 'EXACT_ORIGINAL_PARENT');
const starts = journal.filter(row => row.event === 'start' && row.parentPid === active.parentPid && row.cwd === root && row.args.length === 1 && row.args[0] === path.join(root, harness));
assert.equal(starts.length, 1, 'ONE_ORIGINAL_DECLARED_CHILD');
const start = starts[0];
const closes = journal.filter(row => row.event === 'close' && row.parentPid === start.parentPid && row.id === start.id && row.pid === start.pid);
assert.equal(closes.length, 1, 'ORIGINAL_DECLARED_CHILD_CLOSED');
assert([0, 1].includes(closes[0].code) && !closes[0].signal, 'ORIGINAL_CHILD_COMPLETED');
const readJournal = name => {
  const file = path.resolve(journalDir, name);
  assert(file.startsWith(journalDir + path.sep), 'EXACT_JOURNAL_BODY_PATH');
  return fs.readFileSync(file, 'utf8');
};
const ordinaryOut = readJournal(start.stdout), ordinaryErr = readJournal(start.stderr);
const ordinaryProcess = { status: closes[0].code, wrapperStatus: ordinaryWrapper.status };
json('ORIGINAL-JOURNAL-ASSOCIATION.json', { active, start, close: closes[0], wrapper: ordinaryWrapper,
  childStdoutSHA256: sha(ordinaryOut), childStderrSHA256: sha(ordinaryErr),
  nestedStartsRetained: journal.filter(row => row.event === 'start').length - 1,
  comparisonScope: 'Diagnostic child raw and stderr compare to the exact completed ordinary declared child. Wrapper raw is retained separately.' });
const run = async () => {
  const stdout = fs.openSync(path.join(output, 'stdout.log'), 'wx'), stderr = fs.openSync(path.join(output, 'stderr.log'), 'wx');
  const started = new Date().toISOString();
  const env = { ...process.env, SIM_NETWORK: 'offline', SOCCER_DECK_CAPTURE_OUT: path.join(output, 'observations'),
    NODE_OPTIONS: `--require=${path.join(root, 'scripts/lib/offlineTransport.cjs')}`, GIT_OPTIONAL_LOCKS: '0' };
  const child = spawn('timeout', ['--kill-after=10s', '1800', process.execPath, harness], { cwd: matched, env, stdio: ['ignore', stdout, stderr] });
  const result = await new Promise(resolve => {
    let error = null;
    child.on('error', e => { error = e.message; });
    child.on('close', (raw, signal) => resolve({ raw, signal, error }));
  });
  fs.closeSync(stdout); fs.closeSync(stderr);
  const processRecord = { started, ended: new Date().toISOString(), cwd: matched, command: 'timeout',
    args: ['--kill-after=10s', '1800', process.execPath, harness], ...result,
    effective: { NODE_OPTIONS: env.NODE_OPTIONS, SIM_NETWORK: env.SIM_NETWORK, SOCCER_DECK_CAPTURE_OUT: env.SOCCER_DECK_CAPTURE_OUT },
    credit: 'DIAGNOSTIC_ONLY_ORIGINAL_STATUS_UNCHANGED' };
  json('process.json', processRecord);
  return processRecord;
};
let verdict = null;
try {
  fs.writeFileSync(path.join(matched, harness), diagnostic);
  execFileSync(process.execPath, ['--check', path.join(matched, harness)], { stdio: 'pipe' });
  const expectedDiagnostic = before.map(row => row.file === harness ? { ...row, bytes: Buffer.byteLength(diagnostic), sha256: sha(diagnostic) } : row);
  assert.deepEqual(snapshot(matched), expectedDiagnostic, 'ONLY_HARNESS_BODY_CHANGED');
  const result = await run();
  const stdout = fs.readFileSync(path.join(output, 'stdout.log'), 'utf8'), stderr = fs.readFileSync(path.join(output, 'stderr.log'), 'utf8');
  assert([0, 1].includes(result.raw) && !result.signal && !result.error, 'DIAGNOSTIC_COMPLETED');
  assert.equal(result.raw, ordinaryProcess.status, 'ORIGINAL_RAW_PRESERVED');
  const failed = text => text.split('\n').filter(line => /^\s*FAIL /.test(line));
  assert.deepEqual(failed(stderr), failed(ordinaryErr), 'ORIGINAL_FAILURE_LINES_PRESERVED');
  for (let i = 1; i <= 10; i += 1) assert(stdout.includes(`\n${i}) `) || stdout.startsWith(`${i}) `), `SECTION_${i}_REACHED`);
  const observations = JSON.parse(fs.readFileSync(path.join(output, 'observations/CAPTURE.json')));
  const counts = n => JSON.parse(fs.readFileSync(path.join(output, `observations/section${n}/COUNTS.json`)));
  const c2 = counts(2), c4 = counts(4), c9 = counts(9);
  assert(observations.complete && observations.errors.length === 0 && !observations.pendingOldSave, 'CAPTURE_COMPLETE_WITHOUT_OBSERVER_ERRORS');
  assert.equal(observations.careers2.length, c2.careers, 'ALL_SECTION2_CAREERS');
  assert.equal(observations.pairs2.filter(p => p.firstIndex !== null).length, c2.differ, 'ALL_FIRST_STATE_PAIRS');
  assert.equal(observations.pairs2.filter(p => p.rngMismatch).length, c2.callsDiffer, 'ALL_RNG_WITNESSES');
  assert.equal(observations.pairs4.length, c4.apart, 'ALL_SECTION4_PAIRS');
  assert.equal(observations.pairs9.length, c9.apartPlay, 'ALL_SECTION9_PAIRS');
  assert.equal(observations.original.failures, failed(stderr).length, 'ORIGINAL_FAILURE_COUNT');
  for (const tag of ['head', 'head-lock', 'base']) {
    assert(fs.existsSync(path.join(output, `observations/compiled/${tag}.mjs`)), 'COMPILED_ROLE');
    assert(observations.loaded.some(r => r.tag === tag && r.source === 'src/lib/soccerCareerEngine.ts' && r.stage === 'after-mark'), 'LOADED_ENGINE_ROLE');
  }
  verdict = { scope: 'PASSIVE_CAPTURE_ADMITTED_NO_PRODUCT_QUALIFICATION', originalRaw: ordinaryProcess.status, diagnosticRaw: result.raw,
    originalFailureLines: failed(ordinaryErr), diagnosticFailureLines: failed(stderr), c2, c4, c9, noReplay: true };
} finally {
  fs.writeFileSync(path.join(matched, harness), original);
  const matchedAfter = snapshot(matched), rootAfter = snapshot(root);
  json('SOURCE-MATCHED-AFTER.json', matchedAfter); json('SOURCE-ROOT-AFTER.json', rootAfter);
  assert.deepEqual(matchedAfter, before, 'WHOLE_MATCHED_RESTORATION');
  assert.deepEqual(rootAfter, before, 'ORIGINAL_CHECKOUT_SOURCE_HELD');
  assert.deepEqual(dist(matched), distBefore, 'MATCHED_DIST_HELD');
  assert.deepEqual(dist(root), distBefore, 'ORIGINAL_DIST_HELD');
  const actualMembers = files(matched).filter(file => {
    const rel = path.relative(matched, file).split(path.sep).join('/');
    return !rel.startsWith('.git/') && !rel.startsWith('dist/');
  }).map(file => path.relative(matched, file).split(path.sep).join('/')).sort();
  assert.deepEqual(actualMembers, sourceRows.map(r => r.file).sort(), 'MATCHED_NO_UNEXPECTED_SOURCE_MEMBERS');
  execFileSync('tar', ['--exclude=./.git', '--exclude=./node_modules', '--exclude=./dist', '-czf', path.join(output, 'matched-restored.tar.gz'), '-C', matched, '.']);
  json('RESTORATION.json', { rootSourceHeld: true, matchedSourceRestored: true, distHeld: true, trackedFiles: sourceRows.length,
    gitObjectAccess: 'Private minimal Git metadata with read-only-use shared object link. Original index/refs held separately by existing finish.' });
  if (verdict) json('ADMISSION.json', verdict);
}
