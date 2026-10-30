import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

assert(process.env.CI, 'Remote CI only');
const ROOT = process.cwd(), OUT = path.resolve(process.env.SC_LEAGUES_OUT);
const BASE = '988dc9d6b880d6c8a15fb4a00e09e6bf7a18eeab', BASE_TREE = '0dcb7bd435a5f476dcb7eeadff1f838dad68b3d6';
const BRANCH = 'codex/sc-leagues-menu424-proof-20261030';
const PRODUCT = process.env.SC_PRODUCT_COMMIT, PRODUCT_TREE = process.env.SC_PRODUCT_TREE;
const SPEC = 'qa/sc-league-continuation-v1/PRODUCT-MANIFEST.json';
const QA = ['.github/workflows/sc-league-continuation.yml', SPEC, 'scripts/qa/proveSoccerLeagueContinuation.mjs'].sort();
const sha = value => createHash('sha256').update(value).digest('hex');
fs.mkdirSync(OUT, { recursive: true });
const json = (name, value) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(value, null, 2) + '\n');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, maxBuffer: 32 * 1024 * 1024 });
const text = (cwd, ...args) => git(cwd, ...args).toString('utf8').trim();
const report = { status: 'STARTED', processes: [], diagnostics: [], scope: 'Focused source qualification and unchanged-guard diagnosis only. No build, full suite, full profile, browser, readers, caps or release credit.' };
const save = () => json('REPORT', report);
const sourceFiles = cwd => text(cwd, 'ls-files', '-z').split('\0').filter(Boolean).sort();
function snapshot(cwd) {
  return sourceFiles(cwd).map(file => ({ path: file, bytes: fs.statSync(path.join(cwd, file)).size, sha256: sha(fs.readFileSync(path.join(cwd, file))) }));
}
function tree(commit) {
  return new Map(text(ROOT, 'ls-tree', '-r', commit).split('\n').map(line => { const [entry, file] = line.split('\t'); return [file, entry]; }));
}
function pin(cwd, file, expected) {
  const body = fs.readFileSync(path.join(cwd, file));
  assert.equal(body.length, expected.bytes, 'Source bytes ' + file);
  assert.equal(sha(body), expected.sha256, 'Source SHA ' + file);
  assert.equal(createHash('sha1').update('blob ' + body.length + '\0').update(body).digest('hex'), expected.gitBlob, 'Git source body ' + file);
}
function run(label, command, args, cwd = ROOT, env = {}, allowed = [0]) {
  const dir = path.join(OUT, label); fs.mkdirSync(dir, { recursive: true });
  const started = new Date().toISOString();
  const child = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  const receipt = { label, command, args, cwd, started, finished: new Date().toISOString(), rawExit: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify(receipt, null, 2)); report.processes.push(receipt); save();
  assert.equal(receipt.signal, null, 'No terminated child ' + label); assert.equal(receipt.error, null, 'No child infrastructure error ' + label);
  assert(allowed.includes(receipt.rawExit), 'Unexpected raw exit ' + label + ': ' + receipt.rawExit);
  return { ...receipt, log: (child.stdout || '') + (child.stderr || '') };
}
function ordinary(cwd = ROOT) { assert.equal(text(cwd, 'diff', '--name-only', 'HEAD'), '', 'Every tracked source restored'); }
function reportRows(label, rawExit) {
  const dir = path.join(OUT, label), j = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'), 'utf8'));
  const process = JSON.parse(fs.readFileSync(path.join(dir, 'process.json'), 'utf8'));
  const log = fs.readFileSync(path.join(dir, 'stdout.log'), 'utf8') + fs.readFileSync(path.join(dir, 'stderr.log'), 'utf8');
  assert.equal(process.rawExit, rawExit); assert.match(log, /JSON report written to /); assert.match(log, /Test Files\s+/); assert.match(log, /\bTests\s+/);
  assert(!/Unhandled Errors|Unhandled Rejection|Vitest caught|Failed Suites|Errors during/.test(log), 'No suite/runtime error ' + label);
  for (const file of j.testResults) assert.equal(file.message, '', 'No file error ' + label);
  const rows = j.testResults.flatMap(file => file.assertionResults); assert(rows.length);
  assert(rows.every(row => ['passed', 'failed', 'skipped'].includes(row.status)));
  return { j, rows };
}
function vitest(label, files, env = {}, filter = []) {
  const dir = path.join(OUT, label); fs.mkdirSync(dir, { recursive: true });
  run(label, process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--no-cache', '--reporter=default', '--reporter=json', '--outputFile.json=' + path.join(dir, 'vitest.json'), ...filter], ROOT, env, [0, 1]);
}
const identities = x => x.j.testResults.flatMap(file => file.assertionResults.map(row => JSON.stringify([file.name, row.fullName, row.status]))).sort();
const sameCases = (a, b) => assert.deepEqual(identities(a), identities(b), 'Same complete affected cases after physical restoration');
function healthy(label) {
  const x = reportRows(label, 0); assert.equal(x.j.success, true); assert.equal(x.j.numFailedTests, 0); assert.equal(x.j.numFailedTestSuites, 0);
  assert.equal(x.j.testResults.length, 2); assert.equal(x.rows.length, 46); assert(x.rows.every(row => row.status === 'passed'));
  assert.equal(x.rows.filter(row => /rejects an (?:outside-twenty copied colour|inside-twenty copied colour|inside-twenty copied budget) change and readmits its restoration$/.test(row.fullName)).length, 3);
  return x;
}
function observedProgramme(cwd, label) {
  const rel = 'scripts/simCareerProgramme.mjs', before = fs.readFileSync(path.join(cwd, rel), 'utf8');
  const edits = [
    ["const arm=original?'original':compatibility?'compatibility':'current';", "const arm=original?'original':compatibility?'compatibility':'current';fs.copyFileSync(file,path.join(out,'observed-'+arm+'-engine.cjs'));"],
    ["assert.deepEqual(c,a,'Compatibility arm preserves full original season and RNG');", "if(!report.neutral.length)fs.writeFileSync(path.join(out,'observed-first-pair.json'),JSON.stringify({fixtureId:fixture.id,seed,input,original:a,current:b,compatibility:c},null,2));assert.deepEqual(c,a,'Compatibility arm preserves full original season and RNG');"]
  ];
  let body = before;
  for (const [old, next] of edits) { assert.equal(body.split(old).length, 2, 'Unique observation-only anchor'); body = body.replace(old, next); }
  let inverse = body; for (const [old, next] of [...edits].reverse()) { assert.equal(inverse.split(next).length, 2); inverse = inverse.replace(next, old); }
  assert.equal(inverse, before, 'Every original assertion remains unchanged');
  const target = path.join(cwd, 'scripts/.sc-league-programme-observed.mjs'); assert(!fs.existsSync(target)); fs.writeFileSync(target, body);
  const evidence = path.join(OUT, label); fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'original-harness.mjs'), before); fs.writeFileSync(path.join(evidence, 'observed-harness.mjs'), body);
  fs.writeFileSync(path.join(evidence, 'observation-edits.json'), JSON.stringify({ edits, originalSHA256: sha(before), observedSHA256: sha(body), wholeInverseExact: true, changesAssertions: false }, null, 2));
  return { target, relative: path.relative(cwd, target) };
}
function observedCup(cwd, label) {
  const before = fs.readFileSync(path.join(cwd, 'scripts/simCareerDomesticCup.mjs'), 'utf8');
  const old = '  return import(pathToFileURL(OUT).href);';
  const next = "  if(process.env.SC_CUP_OBSERVATIONS_OUT){const dir=process.env.SC_CUP_OBSERVATIONS_OUT;fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(OUT,path.join(dir,name+'-engine.mjs'));fs.writeFileSync(path.join(dir,name+'-source-inputs.json'),JSON.stringify({name,files,withUi},null,2));}\n" + old;
  assert.equal(before.split(old).length, 2, 'Unique cup compile-observation anchor'); const body = before.replace(old, next);
  assert.equal(body.split(next).length, 2); assert.equal(body.replace(next, old), before, 'Every original cup assertion remains unchanged');
  const target = path.join(cwd, 'scripts/.sc-league-cup-observed.mjs'); assert(!fs.existsSync(target)); fs.writeFileSync(target, body);
  const evidence = path.join(OUT, label); fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'original-harness.mjs'), before); fs.writeFileSync(path.join(evidence, 'observed-harness.mjs'), body);
  fs.writeFileSync(path.join(evidence, 'observation-edits.json'), JSON.stringify({ before: old, after: next, originalSHA256: sha(before), observedSHA256: sha(body), wholeInverseExact: true, changesAssertions: false }, null, 2));
  return { target, relative: path.relative(cwd, target) };
}
function diagnostics(cwd, arm, expectedModified = []) {
  const programme = observedProgramme(cwd, arm + '/programme'); let p;
  try { p = run(arm + '/programme', process.execPath, [programme.relative], cwd, { CAREER_PROGRAMME_OUT: path.join(OUT, arm, 'programme', 'actual') }, [0, 1]); }
  finally { fs.unlinkSync(programme.target); }
  const actual = path.join(OUT, arm, 'programme', 'actual');
  for (const file of ['observed-first-pair.json', 'original-loaded.json', 'current-loaded.json', 'compatibility-loaded.json', 'observed-original-engine.cjs', 'observed-current-engine.cjs', 'observed-compatibility-engine.cjs']) assert(fs.existsSync(path.join(actual, file)), 'Actual guarded programme evidence ' + arm + '/' + file);
  if (p.rawExit === 1) assert.match(p.log, /AssertionError/);
  else assert.match(p.log, /Career programme:50 original\/compatibility\/full product season pairs with exact RNG/);
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|Cannot find module/.test(p.log), 'No programme runtime failure');
  const cupObserver = observedCup(cwd, arm + '/cup'); let cup;
  const cupEvidence = path.join(OUT, arm, 'cup', 'actual');
  try { cup = run(arm + '/cup', process.execPath, [cupObserver.relative], cwd, { SC_CUP_OBSERVATIONS_OUT: cupEvidence }, [0, 1]); }
  finally { fs.unlinkSync(cupObserver.target); }
  for (const name of ['main', 'b', 'a']) for (const suffix of ['-engine.mjs', '-source-inputs.json']) assert(fs.existsSync(path.join(cupEvidence, name + suffix)), 'Actual cup compiled/source association ' + name + suffix);
  assert.match(cup.log, /simCareerDomesticCup: (?:all sections green|[1-9][0-9]* failures in sections [0-9, ]+)/);
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|Cannot find module/.test(cup.log), 'No cup runtime failure');
  const closing = cup.log.match(/simCareerDomesticCup: (?:all sections green|[1-9][0-9]* failures in sections [0-9, ]+)/)[0];
  assert.equal(cup.rawExit, closing.includes('all sections green') ? 0 : 1);
  const metrics = cup.log.split('\n').map(line => line.trim()).filter(line => /^(?:[0-9]+ seasons compared,|held careers:|forced seasons with a cup:|seasons with no cup:)/.test(line));
  assert.equal(metrics.length, 4, 'Four actual unchanged cup comparison observations');
  const result = { arm, programmeRawExit: p.rawExit, programmeAssertion: p.rawExit === 1 ? p.log.match(/AssertionError[^\n]*/)?.[0] : null, cupRawExit: cup.rawExit, cupClosing: closing, cupMetrics: metrics, firstPairSHA256: sha(fs.readFileSync(path.join(actual, 'observed-first-pair.json'))), isProductQualification: false };
  report.diagnostics.push(result); save();
  const modified = text(cwd, 'diff', '--name-only', 'HEAD');
  assert.deepEqual(modified ? modified.split('\n').sort() : [], [...expectedModified].sort(), 'Every diagnostic source change is declared');
  return result;
}

let spec, held, originals = new Map(), baselineDir;
try {
  assert(/^[a-f0-9]{40}$/.test(PRODUCT || '') && /^[a-f0-9]{40}$/.test(PRODUCT_TREE || ''), 'Product binding must be concrete');
  assert.equal(process.env.GITHUB_REF_NAME, BRANCH); assert.equal(text(ROOT, 'rev-parse', 'HEAD'), process.env.GITHUB_SHA);
  assert.equal(text(ROOT, 'rev-parse', 'HEAD^'), PRODUCT); assert.equal(text(ROOT, 'rev-parse', PRODUCT + '^{tree}'), PRODUCT_TREE);
  assert.equal(text(ROOT, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 2);
  assert.equal(text(ROOT, 'rev-parse', BASE + '^{tree}'), BASE_TREE);
  spec = JSON.parse(fs.readFileSync(SPEC, 'utf8')); assert.equal(spec.base, BASE); assert.equal(spec.baseTree, BASE_TREE); assert.equal(spec.files.length, 12);
  const baselineTree = tree(BASE), productTree = tree(PRODUCT), proofTree = tree('HEAD');
  assert.equal(baselineTree.size, 5456); assert.equal(productTree.size, 5456); assert.equal(proofTree.size, 5459);
  assert.deepEqual(text(ROOT, 'diff', '--name-only', BASE, PRODUCT).split('\n').sort(), spec.files.map(file => file.path).sort());
  assert.deepEqual(text(ROOT, 'diff', '--name-status', PRODUCT, 'HEAD').split('\n').sort(), QA.map(file => 'A\t' + file).sort());
  const changed = new Map(spec.files.map(file => [file.path, file]));
  for (const [file, entry] of baselineTree) {
    const expected = changed.get(file);
    assert.equal(productTree.get(file), expected ? expected.mode + ' blob ' + expected.candidate.gitBlob : entry, 'Whole base association ' + file);
    assert.equal(proofTree.get(file), productTree.get(file), 'Proof application identity ' + file);
  }
  for (const file of spec.files) { pin(ROOT, file.path, file.candidate); originals.set(file.path, fs.readFileSync(file.path)); const old = git(ROOT, 'show', BASE + ':' + file.path); assert.equal(sha(old), file.base.sha256); assert.equal(old.length, file.base.bytes); }
  assert.equal(productTree.get('src/lib/soccerCareerCoachingStart.ts'), '100644 blob e28c79d67d54950e5b554e392048483693abbc4b');
  assert.equal(productTree.get('src/lib/soccerCareerManagerJobReview.ts'), '100644 blob 633002c460ef9ad7018b0cec5dfde80f5c2d1e2f');
  assert.equal(productTree.get('src/pages/SoccerCareer.tsx'), '100644 blob 70e1f27988ec3891a15a5260282dfe9fd1502f18');
  held = snapshot(ROOT); json('tracked-before', held);
  git(ROOT, 'archive', '--format=tar', '--output=' + path.join(OUT, 'source.tar'), 'HEAD');
  git(ROOT, 'archive', '--format=tar', '--output=' + path.join(OUT, 'product-source.tar'), PRODUCT);
  git(ROOT, 'archive', '--format=tar', '--output=' + path.join(OUT, 'menu-base-source.tar'), BASE);
  json('association', { base: BASE, baseTree: BASE_TREE, product: PRODUCT, productTree: PRODUCT_TREE, proof: process.env.GITHUB_SHA, proofTree: text(ROOT, 'rev-parse', 'HEAD^{tree}'), productModified: 12, baseHeld: 5444, qaAdds: QA, noDeletedPaths: true });
  fs.copyFileSync(SPEC, path.join(OUT, 'PRODUCT-MANIFEST.json'));
  run('types', 'node_modules/.bin/tsc', ['--noEmit', '-p', 'tsconfig.app.json']); ordinary();

  baselineDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-league-menu-base-'));
  git(ROOT, 'worktree', 'add', '--detach', baselineDir, BASE);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(baselineDir, 'node_modules'), 'dir');
  const baselineBefore = snapshot(baselineDir); json('baseline-tracked-before', baselineBefore);
  const baseResult = diagnostics(baselineDir, 'actual-menu-baseline');
  assert.deepEqual(snapshot(baselineDir), baselineBefore, 'Actual immutable Menu baseline source held'); json('baseline-tracked-after', snapshot(baselineDir));

  const affected = ['src/lib/soccerCareerLeague.test.ts', 'src/test/cmWorldIdentity1052.test.ts'];
  vitest('units/healthy', affected); const h = healthy('units/healthy'); ordinary();
  vitest('units/sevilla-control', [affected[1]], { CM_WORLD_IDENTITY_CONTROL: 'rating' }); const sevilla = reportRows('units/sevilla-control', 1);
  assert.equal(sevilla.rows.filter(row => row.status === 'failed').length, 1); assert.equal(sevilla.rows.filter(row => row.status === 'passed').length, 5); assert.equal(sevilla.rows.filter(row => row.status === 'skipped').length, 3);
  assert.match(sevilla.rows.find(row => row.status === 'failed').fullName, /keeps every one of the 438 clubs/);
  assert(sevilla.rows.find(row => row.status === 'failed').failureMessages.some(message => /AssertionError|expected/.test(message))); ordinary();
  const league = 'src/lib/soccerCareerLeague.ts', currentLeague = fs.readFileSync(league), oldLeague = git(ROOT, 'show', 'a4805f9d0e5816d19a1490ee6bb511966c617785:' + league);
  assert.equal(sha(oldLeague), '0519defdf1ac93f69b83f14b11d36f1b9d2544f7bb6c60ba97c4539710cd9b52'); assert.notEqual(sha(oldLeague), sha(currentLeague));
  fs.mkdirSync(path.join(OUT, 'units', 'physical-control'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'units', 'physical-control', 'before.ts'), currentLeague); fs.writeFileSync(path.join(OUT, 'units', 'physical-control', 'changed.ts'), oldLeague);
  try { fs.writeFileSync(league, oldLeague); vitest('units/league-size-control', [affected[0]], {}, ['--testNamePattern=knows the Championship\'s size from 2004, and the second-flight size windows']); }
  finally { fs.writeFileSync(league, currentLeague); }
  const size = reportRows('units/league-size-control', 1); assert.equal(size.rows.filter(row => row.status === 'failed').length, 1); assert.equal(size.rows.filter(row => row.status === 'skipped').length, 36);
  assert.match(size.rows.find(row => row.status === 'failed').fullName, /knows the Championship's size from 2004, and the second-flight size windows$/);
  assert(size.rows.filter(row => row.status === 'failed').every(row => row.failureMessages.some(message => /AssertionError|expected/.test(message))));
  fs.writeFileSync(path.join(OUT, 'units', 'physical-control', 'restored.ts'), fs.readFileSync(league)); assert.deepEqual(fs.readFileSync(league), currentLeague); ordinary();
  vitest('units/restored', affected); const restored = healthy('units/restored'); sameCases(h, restored);
  for (const kind of ['dropped-case', 'status']) {
    const copy = structuredClone(restored), before = JSON.stringify(copy); const rows = copy.j.testResults[0].assertionResults;
    const removed = kind === 'dropped-case' ? rows.pop() : null, prior = rows[0].status; if (kind === 'status') rows[0].status = 'skipped';
    assert.notEqual(JSON.stringify(copy), before); json('observer-' + kind + '-changed', copy);
    assert.throws(() => sameCases(h, copy), error => error.name === 'AssertionError' && /Same complete affected cases/.test(error.message));
    if (kind === 'dropped-case') rows.push(removed); else rows[0].status = prior;
    assert.equal(JSON.stringify(copy), before); sameCases(h, copy); json('observer-' + kind + '-restored', copy);
  }
  vitest('coaching-preservation', ['src/test/soccerCareerCoachingStart.test.ts', 'src/test/soccerCareerCoachingStartEra.test.ts']);
  const coaching = reportRows('coaching-preservation', 0); assert(coaching.rows.every(row => row.status === 'passed')); ordinary();
  const focused = [
    ['simCareerClubPool', 'simCareerClubPool: all sections green'], ['simCareerDerbies', 'simCareerDerbies: all 8 sections green'], ['simCareerEras', 'simCareerEras: all green'],
    ['simCareerLeagueFinish', 'simCareerLeagueFinish: green.'], ['simCareerLeagueWorld', 'simCareerLeagueWorld: all sections green'], ['simSoccerCareerLeagueWorld', 'simSoccerCareerLeagueWorld: seventeen outcome tests and two engine career tests green, all twelve effective negative controls caught']
  ];
  for (const [name, closing] of focused) { const child = run('focused/' + name, process.execPath, ['scripts/' + name + '.mjs']); assert(child.log.includes(closing), 'Actual owned closing ' + name); ordinary(); }
  const candidate = diagnostics(ROOT, 'candidate');
  const inverseFiles = spec.files.filter(file => file.path !== 'docs/PROJECT-STATE.md');
  try {
    for (const file of inverseFiles) fs.writeFileSync(file.path, git(ROOT, 'show', BASE + ':' + file.path));
    for (const file of inverseFiles) pin(ROOT, file.path, file.base);
    const physical = snapshot(ROOT); json('inverse-tracked', physical);
    // Only the declared league bodies differ from the proof. Existing guards, fixtures and dependencies are held.
    assert.deepEqual(text(ROOT, 'diff', '--name-only', 'HEAD').split('\n').sort(), inverseFiles.map(file => file.path).sort());
    const inverse = diagnostics(ROOT, 'physical-league-inverse', inverseFiles.map(file => file.path));
    assert.deepEqual(snapshot(ROOT), physical, 'Inverse actual source held');
    assert.deepEqual({ ...inverse, arm: '', firstPairSHA256: '' }, { ...baseResult, arm: '', firstPairSHA256: '' }, 'Actual Menu and source-matched inverse diagnostic outcomes');
    assert.equal(inverse.firstPairSHA256, baseResult.firstPairSHA256, 'Whole actual Menu/physical inverse first programme pair');
  } finally { for (const file of inverseFiles) fs.writeFileSync(file.path, originals.get(file.path)); }
  ordinary(); const final = diagnostics(ROOT, 'same-copy-restored');
  assert.deepEqual({ ...candidate, arm: '' }, { ...final, arm: '' }, 'Same-copy restored diagnostic outcomes and actual first pair');
  assert.deepEqual(snapshot(ROOT), held, 'Whole tracked source byte restoration'); json('tracked-after', snapshot(ROOT));
  report.status = 'FOCUSED_GATES_PASSED_DIAGNOSTICS_RETAINED_NOT_RELEASE'; report.compatibilityGuardsAllGreen = report.diagnostics.every(row => row.programmeRawExit === 0 && row.cupRawExit === 0);
  report.unitCases = 46; report.coachingCases = coaching.rows.length; report.focusedHarnesses = focused.map(row => row[0]); report.observerControls = ['dropped-case', 'status']; report.qualification = 'Only the named unit/coaching/focused harness gates. Diagnostic reds stay red and cannot establish full compatibility or release readiness.'; save();
} catch (error) {
  report.status = 'FAILED'; report.error = { name: error.name, message: error.message, stack: error.stack }; save(); throw error;
} finally {
  for (const [file, body] of originals) if (!fs.readFileSync(file).equals(body)) fs.writeFileSync(file, body);
  if (held) json('tracked-finally', snapshot(ROOT));
  if (baselineDir && fs.existsSync(path.join(baselineDir, 'scripts/.sc-league-programme-observed.mjs'))) fs.unlinkSync(path.join(baselineDir, 'scripts/.sc-league-programme-observed.mjs'));
}
