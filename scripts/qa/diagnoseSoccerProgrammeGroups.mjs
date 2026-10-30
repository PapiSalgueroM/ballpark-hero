import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd(), OUT = process.env.SC_GROUPS_OUT;
const SPEC = 'qa/sc-programme-groups-v1/SOURCE-CONTRACT.json';
const CONTRACT = JSON.parse(fs.readFileSync(path.join(ROOT, SPEC), 'utf8'));
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update('blob ' + Buffer.byteLength(body) + '\0').update(body).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 29 });
const gt = (...args) => git(...args).toString().trim();
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
const selectedGroups = mode => mode === 'all' ? CONTRACT.groups : CONTRACT.groups.filter(group => group.id === mode);
function inverseGroup(group, source) {
  assert.equal(sha(source), group.candidate.sha256, 'SC_GROUP_CURRENT_SOURCE:' + group.id);
  assert.equal(blob(source), group.candidate.gitBlob);
  let result = source;
  for (const span of [...group.spans].reverse()) {
    assert.equal(result.split(span.after).length, 2, 'SC_GROUP_UNIQUE_INVERSE:' + group.id);
    result = result.replace(span.after, span.before);
  }
  assert.equal(sha(result), group.base.sha256, 'SC_GROUP_EXACT_BASE:' + group.id); assert.equal(blob(result), group.base.gitBlob);
  let replay = result; for (const span of group.spans) { assert.equal(replay.split(span.before).length, 2); replay = replay.replace(span.before, span.after); }
  assert.equal(replay, source, 'SC_GROUP_WHOLE_FORWARD_RESTORE:' + group.id);
  return result;
}
export function applyCGroupInverse(relative, source) {
  const group = selectedGroups(process.env.SC_GROUP_MODE).find(value => value.path === relative);
  if (!group) return source;
  const after = inverseGroup(group, source), file = path.join(process.env.SC_CHILD_OUT, 'group-applications.jsonl');
  fs.appendFileSync(file, JSON.stringify({ id: group.id, path: relative, arm: 'C-only', beforeSHA256: sha(source), afterSHA256: sha(after), beforeGit: blob(source), afterGit: blob(after), spans: group.spans.length }) + '\n');
  return after;
}
function withoutOpening(value) {
  const normalized = copy(value); let removed = 0;
  for (const row of [...(normalized.seasons ?? []), normalized.pendingSummary].filter(Boolean)) if (row.cupRun?.opening) { delete row.cupRun.opening; removed++; }
  return { normalized, removed };
}
let sequence = 0;
export function captureProgrammePair({ fixtureId, seed, input, before, a, b, c }) {
  const index = CONTRACT.fixture.ids.indexOf(fixtureId) * 10 + seed;
  assert.equal(++sequence, index, 'SC_GROUP_PAIR_SEQUENCE');
  const file = 'pair-' + String(sequence).padStart(2, '0') + '-' + fixtureId + '-' + seed + '.json';
  const body = { sequence, fixtureId, seed, input, before, original: a, BInheritedCurrentInputs: b, CInheritedCounterfactual: c,
    comparisons: { historicalCEqualsA: isDeepStrictEqual(c, a), BAndCOutsideOpeningEqual: isDeepStrictEqual(withoutOpening(b.value).normalized, withoutOpening(c.value).normalized), BDrawsEqualA: isDeepStrictEqual(b.draws, a.draws), inputHeld: isDeepStrictEqual(input, before) },
    rngTags: { A: { draws: a.draws.length, sha256: sha(JSON.stringify(a.draws)) }, B: { draws: b.draws.length, sha256: sha(JSON.stringify(b.draws)) }, C: { draws: c.draws.length, sha256: sha(JSON.stringify(c.draws)) } } };
  const full = path.join(process.env.SC_CHILD_OUT, file); write(full, body);
  fs.appendFileSync(path.join(process.env.SC_CHILD_OUT, 'pairs.jsonl'), JSON.stringify({ sequence, fixtureId, seed, file, bytes: fs.statSync(full).size, sha256: sha(fs.readFileSync(full)), comparisons: body.comparisons, rngTags: body.rngTags }) + '\n');
}
export function retainProgrammeCompile({ arm, file, loaded }) {
  fs.copyFileSync(file, path.join(process.env.SC_CHILD_OUT, arm + '-engine.cjs'));
  write(path.join(process.env.SC_CHILD_OUT, arm + '-loaded-observed.json'), loaded);
}
function run(label, args, env = {}, allowed = [0]) {
  const dir = path.join(OUT, label); fs.mkdirSync(dir, { recursive: true });
  const x = fs.openSync(path.join(dir, 'stdout.log'), 'wx'), y = fs.openSync(path.join(dir, 'stderr.log'), 'wx'); let child;
  const started = new Date().toISOString();
  try { child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, timeout: 900000, killSignal: 'SIGKILL', stdio: ['ignore', x, y] }); }
  finally { fs.closeSync(x); fs.closeSync(y); }
  const processRecord = { args, cwd: ROOT, started, ended: new Date().toISOString(), rawExit: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  write(path.join(dir, 'process.json'), processRecord);
  assert.equal(child.signal, null); assert.equal(child.error, undefined); assert(allowed.includes(child.status), 'SC_GROUP_RAW_EXIT:' + label);
  return { ...processRecord, log: fs.readFileSync(path.join(dir, 'stdout.log'), 'utf8') + fs.readFileSync(path.join(dir, 'stderr.log'), 'utf8') };
}
const lines = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(value => JSON.parse(value)) : [];
function observedCopy() {
  const before = fs.readFileSync(CONTRACT.originalProgramme.path, 'utf8');
  assert.equal(sha(before), CONTRACT.originalProgramme.sha256); assert.equal(blob(before), CONTRACT.originalProgramme.gitBlob);
  const prefix = "import { applyCGroupInverse, captureProgrammePair, retainProgrammeCompile } from './qa/diagnoseSoccerProgrammeGroups.mjs';\n";
  const edits = [
    ["let contents=bytes.toString('utf8');if(!original)", "let contents=bytes.toString('utf8');if(compatibility)contents=applyCGroupInverse(rel,contents);if(!original)"],
    ["const arm=original?'original':compatibility?'compatibility':'current';", "const arm=original?'original':compatibility?'compatibility':'current';retainProgrammeCompile({arm,file,loaded});"],
    ["assert.deepEqual(c,a,'Compatibility arm preserves full original season and RNG');", "captureProgrammePair({fixtureId:fixture.id,seed,input,before,a,b,c});assert.deepEqual(c,a,'Compatibility arm preserves full original season and RNG');"]
  ];
  let after = before;
  for (const [old, next] of edits) { assert.equal(after.split(old).length, 2, 'SC_GROUP_UNIQUE_OBSERVER_ANCHOR'); after = after.replace(old, next); }
  after = prefix + after; let inverse = after.slice(prefix.length);
  for (const [old, next] of [...edits].reverse()) { assert.equal(inverse.split(next).length, 2); inverse = inverse.replace(next, old); }
  assert.equal(inverse, before, 'SC_GROUP_ORIGINAL_WHOLE_INVERSE');
  const file = path.join(ROOT, 'scripts/.sc-programme-groups.observed.mjs'); assert(!fs.existsSync(file)); fs.writeFileSync(file, after, { flag: 'wx' });
  fs.writeFileSync(path.join(OUT, 'original-programme.mjs'), before, { flag: 'wx' }); fs.writeFileSync(path.join(OUT, 'observed-programme.mjs'), after, { flag: 'wx' });
  write(path.join(OUT, 'OBSERVER-EXACT-EDITS.json'), { prefix, edits, originalSHA256: sha(before), observedSHA256: sha(after), wholeInverseExact: true, originalAssertionsAndAll50Pairs21FaultsAndOtherCoverageUnchanged: true });
  return file;
}
function inherited(mode, observer) {
  const dir = path.join(OUT, 'historical-' + mode); fs.mkdirSync(dir);
  const actual = run('historical-' + mode, [observer], { SC_GROUP_MODE: mode, SC_CHILD_OUT: dir, CAREER_PROGRAMME_OUT: path.join(dir, 'original-output') }, [0, 1]);
  const rows = lines(path.join(dir, 'pairs.jsonl')); assert(rows.length > 0 && rows.length <= 50);
  assert.deepEqual(rows.map(row => row.sequence), Array.from({ length: rows.length }, (_, i) => i + 1));
  for (const row of rows) { const body = fs.readFileSync(path.join(dir, row.file)); assert.equal(sha(body), row.sha256); assert.equal(body.length, row.bytes); }
  for (const arm of ['original', 'current', 'compatibility']) { assert(fs.existsSync(path.join(dir, arm + '-engine.cjs'))); assert(fs.existsSync(path.join(dir, arm + '-loaded-observed.json'))); }
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|Cannot find module/.test(actual.log), 'SC_GROUP_NO_RUNTIME_ERROR');
  const last = rows.at(-1); let stoppedAt = 'NONE_COMPLETED_ORIGINAL';
  if (actual.rawExit === 1) {
    assert.match(actual.log, /AssertionError/);
    const checks = [
      ['Compatibility arm preserves full original season and RNG', 'historicalCEqualsA'],
      ['Actual product only adds saved opening ties', 'BAndCOutsideOpeningEqual'],
      ['Opening tie preserves original global RNG', 'BDrawsEqualA']
    ];
    const matched = checks.find(([marker]) => actual.log.includes('AssertionError [ERR_ASSERTION]: ' + marker));
    assert(matched, 'SC_GROUP_FAILURE_MUST_BE_UNCHANGED_PAIR_ASSERTION'); assert.equal(last.comparisons[matched[1]], false); stoppedAt = matched[0];
  } else { assert.equal(rows.length, 50); assert.match(actual.log, /Career programme:50 original\/compatibility\/full product season pairs with exact RNG/); }
  const applications = lines(path.join(dir, 'group-applications.jsonl'));
  assert.equal(new Set(applications.map(row => row.id)).size, applications.length, 'SC_GROUP_EACH_LOADED_GROUP_ONCE');
  assert(applications.every(row => selectedGroups(mode).some(group => group.id === row.id)));
  const cLoaded = JSON.parse(fs.readFileSync(path.join(dir, 'compatibility-loaded-observed.json')));
  const coverage = selectedGroups(mode).map(group => ({ id: group.id, sourceLoaded: cLoaded.some(row => row.file === group.path), applied: applications.some(row => row.id === group.id) }));
  assert(coverage.every(row => row.sourceLoaded === row.applied), 'SC_GROUP_LOADED_SOURCE_EXACT_APPLIED_SET');
  const summary = { mode, inheritedHistoricalInversesInBothBAndC: ['inverseSoccerDeck', 'inverseWorldTruth', 'inverseDeckFair', 'inverseAwardGenerations'], BUsesCurrentLeagueInputs: true, rawExit: actual.rawExit, pairsCaptured: rows.length, stoppedAt, lastPair: last, comparisonsAreIndependentNotWholeHarnessQualification: true, coverage, applications, productPass: false };
  write(path.join(dir, 'PROFILE.json'), summary); return summary;
}
function seeded(seed, action) {
  const random = Math.random, now = Date.now; let n = seed >>> 0; const draws = [];
  Math.random = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); const v = ((t ^ t >>> 14) >>> 0) / 4294967296; draws.push(v); return v; };
  Date.now = () => 1791586800000;
  try { return { value: action(), draws }; } finally { Math.random = random; Date.now = now; }
}
async function modernBundle(dir, name, openingOff, groupMode = 'none') {
  const { build } = await import('esbuild'), file = path.join(dir, name + '.cjs'), loaded = [], applications = [];
  const entry = "export * as engine from './src/lib/soccerCareerEngine';export * as pool from './src/data/soccerCareerClubPool';export * as league from './src/lib/soccerCareerLeague';export * as format from './src/data/leagueFormat';export * as derby from './src/lib/soccerCareerDerby';";
  const result = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'sc-programme-modern-entry.ts', loader: 'ts' }, bundle: true, format: 'cjs', platform: 'node', outfile: file, metafile: true, alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error', plugins: [{ name: 'exact-modern-source', setup(builder) { builder.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!rel.startsWith('src/')) return;
    const raw = fs.readFileSync(args.path); let contents = raw.toString('utf8'); const group = selectedGroups(groupMode).find(group => group.path === rel);
    if (group) { contents = inverseGroup(group, contents); applications.push({ id: group.id, file: rel, beforeSHA256: sha(raw), afterSHA256: sha(contents) }); }
    if (openingOff && rel === 'src/lib/soccerCareerEngine.ts') { assert.equal(contents.split('includeOpening: true,').length, 2); contents = contents.replace('includeOpening: true,', 'includeOpening: false,'); }
    loaded.push({ file: rel, sourceSHA256: sha(raw), compiledSourceSHA256: sha(contents), bytes: raw.length, gitBlob: blob(raw) });
    return { contents, loader: rel.endsWith('.json') ? 'json' : rel.endsWith('.tsx') ? 'tsx' : 'ts' };
  }); } }] });
  const receipt = { name, openingOff, groupMode, actualProductionSourceExceptDeclaredCOnlyTransform: true, priorHistoricalFeatureInverses: false, entry, loaded, applications, metafile: result.metafile, compiled: { bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) } };
  write(path.join(dir, name + '-compile.json'), receipt); return { module: createRequire(path.join(ROOT, 'package.json'))(file), receipt };
}
async function modernWorker(variant) {
  const dir = path.join(OUT, 'modern-' + variant); fs.mkdirSync(dir, { recursive: true });
  const b = await modernBundle(dir, 'B-production', false), c = await modernBundle(dir, 'C-only-transform', variant !== 'keep-opening', variant === 'leak-old-leagues' ? 'all' : 'none');
  assert(b.receipt.loaded.every(row => row.sourceSHA256 === row.compiledSourceSHA256), 'SC_MODERN_B_PRODUCTION_SOURCE');
  const fixture = JSON.parse(fs.readFileSync(CONTRACT.fixture.path)), rows = [];
  try {
    for (const source of fixture.saves.filter(row => row.kind === 'player')) for (const seed of CONTRACT.fixture.seeds) {
      const input = copy(source.state), before = JSON.stringify(input), B = seeded(seed, () => b.module.engine.advanceProSeason(copy(input), b.module.engine.FALLBACK_CLUBS)), C = seeded(seed, () => c.module.engine.advanceProSeason(copy(input), c.module.engine.FALLBACK_CLUBS));
      const BView = withoutOpening(B.value), CView = withoutOpening(C.value), number = rows.length + 1;
      const row = { sequence: number, fixtureId: source.id, seed, openingFieldsB: BView.removed, openingFieldsC: CView.removed, normalizedEqual: isDeepStrictEqual(BView.normalized, CView.normalized), drawTapeEqual: isDeepStrictEqual(B.draws, C.draws), inputHeld: before === JSON.stringify(input) };
      const file = 'pair-' + String(number).padStart(2, '0') + '-' + source.id + '-' + seed + '.json'; write(path.join(dir, file), { ...row, input, B, C }); rows.push({ ...row, file, sha256: sha(fs.readFileSync(path.join(dir, file))) }); write(path.join(dir, 'step-' + number + '.json'), row);
      assert.equal(row.openingFieldsC, 0, 'SC_MODERN_C_OPENING_PRESENT');
      assert.equal(row.normalizedEqual, true, 'SC_MODERN_NON_OPENING_STATE'); assert.equal(row.drawTapeEqual, true, 'SC_MODERN_GLOBAL_DRAW_TAPE'); assert.equal(row.inputHeld, true, 'SC_MODERN_INPUT_HELD');
    }
    assert.equal(rows.length, 50); assert(rows.some(row => row.openingFieldsB > 0), 'SC_MODERN_ACTUAL_OPENING_WITNESS');
    write(path.join(dir, 'REPORT.json'), { status: 'ACTUAL_MODERN_OPENING_ON_OFF_GREEN', variant, pairs: rows, noHistoricalInverses: true, actualProductionB: true, onlyOpeningRemovedFromWholeOutput: true });
  } catch (error) { write(path.join(dir, 'REFUSAL.json'), { name: error.name, message: error.message, rows, engineSourceFault: variant, noProductMutation: true }); throw error; }
}
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir).sort().flatMap(name => { const file = path.join(dir, name), rel = prefix + name, stat = fs.lstatSync(file); if (stat.isSymbolicLink()) return [{ file: rel, link: fs.readlinkSync(file) }]; if (stat.isDirectory()) return inventory(file, rel + '/'); return [{ file: rel, bytes: stat.size, sha256: sha(fs.readFileSync(file)) }]; });
}
async function main() {
  assert(process.env.CI && path.isAbsolute(OUT ?? '') && !OUT.startsWith(ROOT + path.sep)); fs.mkdirSync(OUT, { recursive: true });
  assert.equal(process.env.GITHUB_REF_NAME, CONTRACT.branch); assert.equal(gt('rev-parse', 'HEAD'), process.env.GITHUB_SHA);
  assert.equal(gt('rev-list', '--parents', '-n1', 'HEAD'), process.env.GITHUB_SHA + ' ' + CONTRACT.product); assert.equal(gt('rev-parse', CONTRACT.product + '^{tree}'), CONTRACT.productTree);
  const productTree = gt('ls-tree', '-r', CONTRACT.product).split('\n'), proofTree = gt('ls-tree', '-r', 'HEAD').split('\n');
  assert.equal(productTree.length, 5456); assert.equal(proofTree.length, 5459);
  assert.deepEqual(gt('diff', '--name-status', CONTRACT.product, 'HEAD').split('\n').sort(), CONTRACT.proofAdds.map(file => 'A\t' + file).sort());
  for (const row of productTree) assert(proofTree.includes(row), 'SC_GROUP_FULL_PRODUCT_BODY_AND_MODE_HELD');
  assert.equal(gt('status', '--porcelain=v1', '--untracked-files=all'), '');
  const source = CONTRACT.originalProgramme; assert.equal(sha(fs.readFileSync(source.path)), source.sha256); assert.equal(blob(fs.readFileSync(source.path)), source.gitBlob);
  assert.equal(sha(fs.readFileSync(CONTRACT.fixture.path)), CONTRACT.fixture.sha256); assert.equal(blob(fs.readFileSync(CONTRACT.fixture.path)), CONTRACT.fixture.gitBlob);
  const fixtures = JSON.parse(fs.readFileSync(CONTRACT.fixture.path)); assert.deepEqual(fixtures.saves.filter(row => row.kind === 'player').map(row => row.id), CONTRACT.fixture.ids);
  for (const group of CONTRACT.groups) inverseGroup(group, fs.readFileSync(group.path, 'utf8'));
  write(path.join(OUT, 'SOURCE-TOPOLOGY.json'), { product: CONTRACT.product, productTree: CONTRACT.productTree, proof: process.env.GITHUB_SHA, proofTree: gt('rev-parse', 'HEAD^{tree}'), productTreeRows: productTree, proofTreeRows: proofTree });
  git('archive', '--format=tar', '--output=' + path.join(OUT, 'source.tar'), 'HEAD'); fs.copyFileSync(SPEC, path.join(OUT, 'SOURCE-CONTRACT.json'));
  run('types', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']);
  const dependencies = inventory(path.join(ROOT, 'node_modules')); write(path.join(OUT, 'dependencies-before.json'), dependencies);
  const tracked = gt('ls-files', '-z').split('\0').filter(Boolean).sort().map(file => ({ file, sha256: sha(fs.readFileSync(file)) })); write(path.join(OUT, 'tracked-before.json'), tracked);
  const refs = gt('show-ref'), index = sha(fs.readFileSync(gt('rev-parse', '--git-path', 'index'))); let observer, failure;
  try {
    observer = observedCopy(); const profiles = [];
    for (const mode of ['none', 'pool', 'playing-sizes', 'format', 'cadence', 'all']) profiles.push(inherited(mode, observer));
    const control = profiles[0]; assert.equal(control.rawExit, 1); assert.equal(control.pairsCaptured, 41); assert.equal(control.lastPair.fixtureId, 'nan'); assert.equal(control.lastPair.seed, 1); assert.equal(control.stoppedAt, CONTRACT.knownActualControl.marker);
    const baseDir = path.join(OUT, 'historical-none');
    for (const profile of profiles.slice(1)) {
      const dir = path.join(OUT, 'historical-' + profile.mode), overlap = Math.min(profile.pairsCaptured, control.pairsCaptured);
      for (const row of lines(path.join(dir, 'pairs.jsonl')).slice(0, overlap)) {
        const a = JSON.parse(fs.readFileSync(path.join(baseDir, row.file))), b = JSON.parse(fs.readFileSync(path.join(dir, row.file)));
        assert.deepEqual(b.original, a.original, 'SC_GROUP_ORIGINAL_ARM_HELD'); assert.deepEqual(b.BInheritedCurrentInputs, a.BInheritedCurrentInputs, 'SC_GROUP_B_MODERN_HELD'); assert.deepEqual(b.input, a.input);
      }
    }
    write(path.join(OUT, 'GROUP-PROFILES.json'), profiles);
    run('modern-healthy', [fileURLToPath(import.meta.url), 'modern', 'healthy']);
    const healthy = JSON.parse(fs.readFileSync(path.join(OUT, 'modern-healthy', 'REPORT.json'))); assert.equal(healthy.pairs.length, 50);
    const controls = [];
    for (const [variant, marker] of [['keep-opening', 'SC_MODERN_C_OPENING_PRESENT'], ['leak-old-leagues', 'SC_MODERN_NON_OPENING_STATE']]) {
      const raw = run('modern-' + variant, [fileURLToPath(import.meta.url), 'modern', variant], {}, [1]);
      assert.match(raw.log, /AssertionError/); assert(raw.log.includes(marker)); const refusal = JSON.parse(fs.readFileSync(path.join(OUT, 'modern-' + variant, 'REFUSAL.json'))); assert.equal(refusal.name, 'AssertionError'); assert(refusal.message.includes(marker));
      const changed = JSON.parse(fs.readFileSync(path.join(OUT, 'modern-' + variant, 'C-only-transform-compile.json'))), original = JSON.parse(fs.readFileSync(path.join(OUT, 'modern-healthy', 'C-only-transform-compile.json')));
      assert.notEqual(changed.compiled.sha256, original.compiled.sha256, 'SC_MODERN_SOURCE_CONTROL_EFFECTIVE'); controls.push({ variant, marker, raw: raw.rawExit, actualFailure: refusal, sourceChanged: true, isCopiedObservationOnly: false });
    }
    run('modern-restored', [fileURLToPath(import.meta.url), 'modern', 'restored']); const restored = JSON.parse(fs.readFileSync(path.join(OUT, 'modern-restored', 'REPORT.json')));
    assert.deepEqual(restored.pairs, healthy.pairs, 'SC_MODERN_ACTUAL_SAME_SOURCE_RESTORE');
    assert.equal(sha(fs.readFileSync(path.join(OUT, 'modern-restored', 'C-only-transform.cjs'))), sha(fs.readFileSync(path.join(OUT, 'modern-healthy', 'C-only-transform.cjs'))), 'SC_MODERN_COMPILED_RESTORE');
    write(path.join(OUT, 'MODERN-CONTROLS.json'), controls); write(path.join(OUT, 'DIAGNOSTIC-REPORT.json'), { status: 'ACTUAL_GROUP_DIAGNOSTICS_AND_MODERN_ON_OFF_RETAINED_NOT_GUARD_REPAIR', profiles, modernPairs: 50, actualSourceControls: controls.map(row => ({ variant: row.variant, marker: row.marker, raw: row.raw })), modernRestored: true, originalGuardAndAppUnchanged: true, cupGuardUntouched: true, noProductQualification: true });
  } catch (error) { failure = error; write(path.join(OUT, 'DIAGNOSTIC-ERROR.json'), { name: error.name, message: error.message, stack: error.stack }); }
  finally {
    if (observer && fs.existsSync(observer)) fs.unlinkSync(observer);
    assert.equal(gt('status', '--porcelain=v1', '--untracked-files=all'), '', 'SC_GROUP_SOURCE_MEMBERSHIP_HELD');
    for (const row of tracked) assert.equal(sha(fs.readFileSync(row.file)), row.sha256, 'SC_GROUP_TRACKED_BODY_HELD:' + row.file);
    assert.equal(gt('show-ref'), refs); assert.equal(sha(fs.readFileSync(gt('rev-parse', '--git-path', 'index'))), index);
    const finalDeps = inventory(path.join(ROOT, 'node_modules')); assert.deepEqual(finalDeps, dependencies, 'SC_GROUP_DEPENDENCIES_HELD'); write(path.join(OUT, 'dependencies-after.json'), finalDeps);
    write(path.join(OUT, 'FINAL-HOLDS.json'), { sourceBodies: tracked.length, productBodies: 5456, proofAdds: 3, modesPreservedByCheckoutAndNoTrackedWrites: true, sourceIndexRefsDependenciesHeld: true, noAppOrPermanentGuardWrites: true });
  }
  if (failure) throw failure;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'modern') await modernWorker(process.argv[3]); else await main();
}
