import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.MANAGER_PRESS_COVERAGE_OUT || path.join(ROOT, 'manager-press-coverage-artifacts/final'));
const BASE = '6a09d71633be3f297494ca6e927cd4ef65f18805';
const ORIGINAL = '09df145abfb241679022b41903d2f19bc254ebf9';
const HARNESS = 'scripts/simClubManagerMeters.mjs';
const CLOCK = 1791590400000;
const NORMAL_CLUBS = ['Real Madrid', 'Arsenal', 'Napoli', 'Wolves', 'Ajax', 'Newcastle', 'Roma', 'Inter Miami'];
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = text => text.replaceAll('\r\n', '\n');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 50 * 1024 * 1024 });
const source = (ref, file) => lf(git('show', `${ref}:${file}`).toString('utf8'));
const HELD = [HARNESS, 'scripts/qa/managerPressCoverageProof.mjs', 'src/lib/clubManager.ts',
  'src/lib/clubManagerEras.ts', 'src/lib/clubManagerMeters.ts', 'src/lib/clubManagerFinances.ts',
  'src/components/club-manager/LeagueTableCard.tsx', 'scripts/lib/seedRandom.mjs',
  'scripts/lib/offlineTransport.cjs', 'package.json', 'package-lock.json'];
const holds = () => Object.fromEntries(HELD.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const poolOld = 'const keptStates = { mid: [], end: [], promiseProbes: [] };';
const poolNew = 'const keptStates = { mid: [], end: [], promiseProbes: [], pendingPress: [] };';
const capture = '        if (opts.sample && season === 1) keptStates.pendingPress.push(clone(s));\n';
const addition = [
  '/* Round 1256: keep the genuine first-season question before its answer.',
  '   Fixed week-eight and week-twelve bases can miss every disliked option.',
  '   These copies run after the original career loops and are press-only:',
  '   the promise, handshake and desk bases above stay exactly as they were. */',
  'for (const base of keptStates.pendingPress) {',
  '  const q = base.press.pending;',
  '  for (let i = 0; i < q.options.length; i++) {',
  '    const o = q.options[i];',
  '    const s0 = clone(base);',
  '    s0.boardConfidence = 0.5;',
  '    const s = answerPress(s0, i);',
  '    pressProbes += 1;',
  '    if ((o.board ?? 0) < 0) pressNegative += 1;',
  '    const expected = Math.min(100, Math.max(1, 0.5 + o.board));',
  '    if (s.boardConfidence !== expected) fail(`a genuine press answer ("${o.label}", board ${o.board}) from 0.5 left the board on ${s.boardConfidence}, not ${expected}`);',
  '    if (s.sacked) fail(`a genuine press answer sacked ${s0.clubName} ("${o.label}")`);',
  '    holdMeter(`genuine press probe ${s0.clubName} option ${i}`, s);',
  '  }',
  '}',
].join('\n') + '\n';
function replaceOne(text, before, after, label, receipts = []) {
  assert.equal(text.split(before).length - 1, 1, `Unique effective ${label}`);
  assert.notEqual(before, after, `Changed ${label}`);
  const result = text.replace(before, after);
  receipts.push({ label, before, after, beforeSha256: sha(text), afterSha256: sha(result), effective: true });
  return result;
}
fs.mkdirSync(OUT, { recursive: true });
const BLOBS = path.join(OUT, 'blobs'); fs.mkdirSync(BLOBS, { recursive: true });
const read = ref => {
  const bytes = gunzipSync(fs.readFileSync(path.join(BLOBS, ref.file)));
  assert.equal(bytes.length, ref.bytes); assert.equal(sha(bytes), ref.sha256);
  return JSON.parse(bytes);
};
const store = value => {
  const bytes = Buffer.from(JSON.stringify(value)), id = sha(bytes), file = id + '.json.gz';
  if (!fs.existsSync(path.join(BLOBS, file))) fs.writeFileSync(path.join(BLOBS, file), gzipSync(bytes, { level: 9 }));
  return { file, bytes: bytes.length, sha256: id, gzipSha256: sha(fs.readFileSync(path.join(BLOBS, file))) };
};
const report = { head: git('rev-parse', 'HEAD').toString().trim(), tree: git('rev-parse', 'HEAD^{tree}').toString().trim(),
  base: BASE, original: ORIGINAL, clock: CLOCK, defaultFilenameSeed: 2752402491,
  baseTree: git('rev-parse', `${BASE}^{tree}`).toString().trim(), originalTree: git('rev-parse', `${ORIGINAL}^{tree}`).toString().trim(),
  scope: 'Full original harnesses and genuine first-season questions. Fixed clock is a paired-data qualification, not an unrestricted wall-clock baseline.',
  sourceBefore: holds(), arms: [], sourcePatches: [], clampControl: null, status: 'pending' };
const checkpoint = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
checkpoint();
assert.equal(process.env.SIM_SEED, undefined, 'Keep the harness default filename seed');
assert.equal(process.env.CM_METERS_CONTROL || '', '', 'The full sampling arms use the actual healthy engine');
const baselineHarness = source(BASE, HARNESS), originalHarness = source(ORIGINAL, HARNESS);
const repairedHarness = lf(fs.readFileSync(path.join(ROOT, HARNESS), 'utf8'));
assert.equal(originalHarness, baselineHarness, 'Whole historical harness is unchanged between original and base');
let restored = replaceOne(repairedHarness, poolNew, poolOld, 'restore pending pool');
restored = replaceOne(restored, capture, '', 'restore capture');
restored = replaceOne(restored, addition, '', 'restore appended press probes');
assert.equal(restored, baselineHarness, 'Exactly three additive edits restore the entire original harness');
report.harnesses = { originalSha256: sha(originalHarness), baseSha256: sha(baselineHarness), repairedSha256: sha(repairedHarness), restoredSha256: sha(restored),
  preservedControls: ['decor', 'promise', 'deaf', 'desk', 'nogoals'], negativeOptionFloor: 3 };
fs.writeFileSync(path.join(OUT, 'historical-harness.mjs'), baselineHarness);
fs.writeFileSync(path.join(OUT, 'repaired-harness.mjs'), repairedHarness);
fs.writeFileSync(path.join(OUT, 'restored-harness.mjs'), restored);

// The observer delegates actual calls and stores complete values by content hash.
const observerSource = String.raw`
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const out=process.env.MANAGER_PRESS_ARM_OUT,blobs=process.env.MANAGER_PRESS_BLOBS;
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const keep=value=>{const raw=Buffer.from(JSON.stringify(value)),id=sha(raw),file=id+'.json.gz',target=path.join(blobs,file);if(!fs.existsSync(target))fs.writeFileSync(target,zlib.gzipSync(raw,{level:9}));return{file,bytes:raw.length,sha256:id,gzipSha256:sha(fs.readFileSync(target))};};
const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[1791590400000]));}static now(){return 1791590400000;}};
const random=Math.random,draws=[];Math.random=()=>{const value=random();draws.push(value);return value;};
let phase='career',constructor=0,pools=null;const calls=[];
const actions=new Set(['startCareer','playNextEntry','finishSeason','startNextSeason','answerPress','respondApproach']);
const desks=new Set(['setTicketPolicy','setConcessionTier','acceptSponsor']);
const wrap=(module,namespace)=>Object.fromEntries(Object.entries(module).map(([name,fn])=>[name,typeof fn==='function'&&(namespace==='fin'?desks.has(name):actions.has(name))?(...args)=>{if(name==='startCareer')constructor++;const before=keep(args),start=draws.length,result=fn(...args),end=draws.length,after=keep(args);calls.push({name:namespace+'.'+name,phase,constructor,before,after,result:keep(result),start,end});return result;}:fn]));
module.exports={wrap:(m,n='cm')=>process.env.MANAGER_PRESS_PLAIN==='1'?m:wrap(m,n),phase:value=>{phase=value;},pools:value=>{pools=keep(value);}};
process.once('exit',code=>{fs.writeFileSync(path.join(out,'observer.json'),JSON.stringify({exit:code,calls,pools,drawCount:draws.length,draws:keep(draws)},null,2));});
`;
const observerFile = path.join(OUT, 'observer.cjs'); fs.writeFileSync(observerFile, observerSource);
const workParent = path.join(ROOT, '.sim-control'); fs.mkdirSync(workParent, { recursive: true });
const work = fs.mkdtempSync(path.join(workParent, 'press-coverage-'));
function prepare(ref, label) {
  const directory = path.join(work, label); fs.mkdirSync(directory);
  const archive = path.join(work, label + '.tar'); git('archive', '--format=tar', '--output=' + archive, ref);
  execFileSync('tar', ['-xf', archive, '-C', directory]); fs.unlinkSync(archive);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(OUT, label + '-source-inventory.txt'), git('ls-tree', '-r', ref));
  return directory;
}
function instrument(text, receipts) {
  text = replaceOne(text, "const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');",
    "const __pressTrace = createRequire(import.meta.url)(process.env.MANAGER_PRESS_OBSERVER);\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');", 'transparent observer binding', receipts);
  text = replaceOne(text, 'const ENTRY = `${TMP}/clubManagerMeters.${process.pid}.entry.mjs`;', 'const ENTRY = `${TMP}/clubManagerMeters.press-proof.entry.mjs`;', 'fixed sequential entry filename', receipts);
  text = replaceOne(text, 'const BUNDLE = `${TMP}/clubManagerMeters.${process.pid}.bundle.cjs`;', 'const BUNDLE = `${TMP}/clubManagerMeters.press-proof.bundle.cjs`;', 'fixed sequential bundle filename', receipts);
  text = replaceOne(text, '--log-level=error`, {', '--log-level=error --metafile=${process.env.MANAGER_PRESS_META}`, {', 'retained actual esbuild input inventory', receipts);
  text = replaceOne(text, 'const { cm, meters, fin, LeagueTableCard, render } = createRequire(import.meta.url)(BUNDLE);',
    'const { cm: __cm, meters, fin: __fin, LeagueTableCard, render } = createRequire(import.meta.url)(BUNDLE);\nconst cm = __pressTrace.wrap(__cm), fin = __pressTrace.wrap(__fin, "fin");', 'actual export forwarding', receipts);
  text = replaceOne(text, "console.log('2) A broken promise, a press answer or a handshake can never leave the meter on zero with the manager in a job');",
    "__pressTrace.pools(keptStates); __pressTrace.phase('legacy-probes');\nconsole.log('2) A broken promise, a press answer or a handshake can never leave the meter on zero with the manager in a job');", 'complete pools before old probes', receipts);
  if (text.includes('for (const base of keptStates.pendingPress) {')) {
    text = replaceOne(text, 'for (const base of keptStates.pendingPress) {',
      "__pressTrace.phase('added-probes');\nfor (const base of keptStates.pendingPress) {", 'copied press probe start only', receipts);
    text = replaceOne(text, 'console.log(`   ${pressProbes} press answers from half a point',
      "__pressTrace.phase('legacy-probes');\nconsole.log(`   ${pressProbes} press answers from half a point", 'copied press probe end only', receipts);
  }
  return text;
}
function run(directory, label, text, plain = false) {
  const armOut = path.join(OUT, label); fs.mkdirSync(armOut);
  fs.writeFileSync(path.join(armOut, 'input-harness.mjs'), text);
  const receipts = [], executed = instrument(text, receipts), file = path.join(directory, HARNESS);
  fs.writeFileSync(file, executed); fs.writeFileSync(path.join(armOut, 'executed-harness.mjs'), executed);
  let undo = executed;
  for (const row of [...receipts].reverse()) undo = replaceOne(undo, row.after, row.before, 'observer full undo');
  assert.equal(undo, text, 'Entire observed harness restores its held input source');
  const child = spawnSync(process.execPath, [file], { cwd: directory, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024,
    env: { ...process.env, MANAGER_PRESS_OBSERVER: observerFile, MANAGER_PRESS_ARM_OUT: armOut,
      MANAGER_PRESS_BLOBS: BLOBS, MANAGER_PRESS_PLAIN: plain ? '1' : '0', MANAGER_PRESS_META: path.join(armOut, 'metafile.json') } });
  fs.writeFileSync(path.join(armOut, 'stdout.txt'), child.stdout || ''); fs.writeFileSync(path.join(armOut, 'stderr.txt'), child.stderr || '');
  assert.ifError(child.error);
  const observed = JSON.parse(fs.readFileSync(path.join(armOut, 'observer.json'), 'utf8'));
  const bundle = fs.readFileSync(path.join(os.tmpdir(), 'clubManagerMeters.press-proof.bundle.cjs'));
  fs.writeFileSync(path.join(armOut, 'bundle.cjs'), bundle);
  const meta = JSON.parse(fs.readFileSync(path.join(armOut, 'metafile.json'), 'utf8')), loaded = [];
  for (const [input, facts] of Object.entries(meta.inputs)) {
    const absolute = path.resolve(directory, input), raw = fs.readFileSync(absolute), relative = path.relative(directory, absolute).replaceAll('\\', '/');
    if (relative.startsWith('src/')) { const held = source(directory === originalDirectory ? ORIGINAL : BASE, relative); assert.equal(lf(raw.toString()), held, 'Actual compiled canonical source ' + relative); loaded.push({ file: relative, bytes: raw.length, sha256: sha(raw), gitLfSha256: sha(held), metafileBytes: facts.bytes, raw: store(raw.toString('utf8')) }); }
  }
  const row = { label, exit: child.status, stdoutSha256: sha(child.stdout || ''), stderrSha256: sha(child.stderr || ''),
    inputHarnessSha256: sha(text), executedHarnessSha256: sha(executed), observerPatches: receipts,
    bundleSha256: sha(bundle), loaded, calls: observed.calls, pools: observed.pools, drawCount: observed.drawCount, draws: observed.draws,
    failLines: (child.stderr || '').split('\n').filter(line => /^\s*FAIL:/.test(line)), observerSha256: sha(observerSource) };
  report.arms.push(row); checkpoint(); return row;
}
let originalDirectory, currentDirectory;
try {
  originalDirectory = prepare(ORIGINAL, 'original'); currentDirectory = prepare(BASE, 'current');
  const original = run(originalDirectory, 'original-healthy', originalHarness);
  const plain = run(currentDirectory, 'current-plain', baselineHarness, true);
  const current = run(currentDirectory, 'current-unchanged', baselineHarness);
  const healthy = run(currentDirectory, 'repaired-healthy', repairedHarness);
  const omitCapture = replaceOne(repairedHarness, capture, '', 'omit actual pending capture', report.sourcePatches);
  const missing = run(currentDirectory, 'omit-capture', omitCapture);
  const omitDisliked = replaceOne(repairedHarness, '    const o = q.options[i];\n',
    '    const o = q.options[i];\n    if ((o.board ?? 0) < 0) continue;\n', 'omit actual disliked probes', report.sourcePatches);
  const disliked = run(currentDirectory, 'omit-disliked', omitDisliked);
  const undo = run(currentDirectory, 'repaired-undo', repairedHarness);
  assert.equal(original.exit, 0, 'Actual original complete historical harness passes');
  assert.equal(current.exit, 1, 'Actual untouched current keeps measured sampling failure');
  assert(current.failLines.length === 1 && /press options.*floor was barely exercised/.test(current.failLines[0]), 'Untouched current only measured disliked-option coverage failure');
  assert.equal(plain.exit, current.exit); assert.equal(plain.stdoutSha256, current.stdoutSha256); assert.equal(plain.stderrSha256, current.stderrSha256); assert.deepEqual(plain.draws, current.draws, 'Whole plain-versus-observed unfiltered stream');
  assert.equal(plain.bundleSha256, current.bundleSha256, 'The plain and observed arms compile the same full current engine');
  const careers = arm => arm.calls.filter(row => row.phase !== 'added-probes');
  const legacyPool = pool => Object.fromEntries(Object.entries(pool).filter(([key]) => key !== 'pendingPress'));
  const originalPools = read(current.pools);
  const actualBases = healthy.calls.filter(row => row.name === 'cm.answerPress' && row.phase === 'career' && row.constructor <= 8)
    .map(row => read(row.before)[0]).filter(state => state.season === 1 && !state.sacked);
  const constructors = healthy.calls.filter(row => row.name === 'cm.startCareer').slice(0, 8).map(row => read(row.before)[0]);
  assert.deepEqual(constructors, NORMAL_CLUBS, 'Exactly the eight existing normal careers');
  const validate = arm => {
    const bad = [], captured = read(arm.pools).pendingPress || [], probes = arm.calls.filter(row => row.phase === 'added-probes' && row.name === 'cm.answerPress');
    if (JSON.stringify(captured) !== JSON.stringify(actualBases)) bad.push('capture-completeness');
    const expected = captured.flatMap(base => base.press.pending.options.map((option, index) => { const copy = structuredClone(base); copy.boardConfidence = 0.5; return { args: [copy, index], option }; }));
    const options = probes.map(row => { const args = read(row.before); return { args, option: args[0].press.pending.options[args[1]], result: read(row.result), row }; });
    if (options.filter(item => item.option.board < 0).length < 3 || JSON.stringify(options.map(item => item.args)) !== JSON.stringify(expected.map(item => item.args))) bad.push('press-floor-coverage');
    if (options.some(item => !Number.isFinite(item.option.board) || item.result.boardConfidence !== Math.min(100, Math.max(1, 0.5 + item.option.board)) || item.result.sacked)) bad.push('press-clamp');
    if (probes.some(row => row.before.sha256 !== row.after.sha256)) bad.push('probe-input-held');
    if (probes.some(row => row.start !== row.end)) bad.push('probe-draws');
    if (JSON.stringify(legacyPool(read(arm.pools))) !== JSON.stringify(originalPools) || JSON.stringify(careers(arm)) !== JSON.stringify(careers(current)) || arm.draws.sha256 !== current.draws.sha256 || arm.bundleSha256 !== current.bundleSha256) bad.push('career-stream');
    return { failures: bad, capturedQuestions: captured.length, addedOptions: probes.length,
      addedDisliked: options.filter(item => item.option.board < 0).length, addedDraws: probes.reduce((sum, row) => sum + row.end - row.start, 0),
      historicalMidBases: originalPools.mid.length, historicalPromiseBases: originalPools.promiseProbes.length,
      historicalHandshakeBases: originalPools.mid.length + originalPools.promiseProbes.length,
      historicalDeskBases: [...originalPools.mid, ...originalPools.promiseProbes].slice(0, 6).length };
  };
  report.validation = { healthy: validate(healthy), omitCapture: validate(missing), omitDisliked: validate(disliked), undo: validate(undo) }; checkpoint();
  assert.equal(healthy.exit, 0); assert.equal(undo.exit, 0);
  assert.deepEqual(report.validation.healthy.failures, []); assert.deepEqual(report.validation.undo.failures, []);
  assert.deepEqual(report.validation.omitCapture.failures, ['capture-completeness', 'press-floor-coverage']);
  assert.deepEqual(report.validation.omitDisliked.failures, ['press-floor-coverage']);
  assert.equal(missing.exit, 1); assert.equal(disliked.exit, 1);
  assert.deepEqual(missing.failLines, current.failLines, 'Missing capture changes only the historical coverage failure');
  assert.deepEqual(disliked.failLines, current.failLines, 'Missing disliked probes changes only the historical coverage failure');
  assert.equal(healthy.inputHarnessSha256, undo.inputHarnessSha256, 'Whole sampling source undo');
  assert.equal(healthy.executedHarnessSha256, undo.executedHarnessSha256, 'Whole observed source undo');
  assert.equal(healthy.stdoutSha256, undo.stdoutSha256); assert.equal(healthy.stderrSha256, undo.stderrSha256);

  const entry = path.join(os.tmpdir(), 'clubManagerMeters.press-proof.entry.mjs');
  const floor = '  state.boardConfidence = clamp(state.boardConfidence + opt.board, 1, 100);';
  const floorBad = '  state.boardConfidence = clamp(state.boardConfidence + opt.board, 0, 100);';
  async function direct(label, faulty) {
    const loaded = [], patches = [], result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': path.join(currentDirectory, 'src') }, logLevel: 'error',
      plugins: [{ name: 'held-actual-floor', setup(builder) { builder.onLoad({ filter: /\.(tsx?|json)$/ }, args => {
        const relative = path.relative(currentDirectory, args.path).replaceAll('\\', '/'); if (!relative.startsWith('src/')) return;
        const raw = lf(fs.readFileSync(args.path, 'utf8')); assert.equal(raw, source(BASE, relative));
        const text = faulty && relative === 'src/lib/clubManager.ts' ? replaceOne(raw, floor, floorBad, 'actual answerPress floor only', patches) : raw;
        loaded.push({ file: relative, sourceSha256: sha(raw), compiledSha256: sha(text), original: store(raw), compiled: store(text) });
        return { contents: text, loader: relative.endsWith('.json') ? 'json' : relative.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      }); } }] });
    const code = result.outputFiles[0].text; fs.writeFileSync(path.join(OUT, label + '.cjs'), code);
    const module = { exports: {} }, bootDraws = [], random = Math.random;
    Math.random = () => { const value = random(); bootDraws.push(value); return value; };
    try { vm.runInNewContext(code, { module, exports: module.exports, require: createRequire(path.join(currentDirectory, 'package.json')), console, process, Buffer, Math, Date, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } }); } finally { Math.random = random; }
    return { engine: module.exports.cm, loaded, patches, bundleSha256: sha(code), startupDraws: store(bootDraws) };
  }
  const good = await direct('floor-healthy', false), bad = await direct('floor-fault', true), fixed = await direct('floor-undo', false);
  assert.equal(bad.patches.length, 1); assert.equal(good.bundleSha256, fixed.bundleSha256, 'Complete actual copied engine undo');
  const held = healthy.calls.filter(row => row.phase === 'added-probes' && row.name === 'cm.answerPress').filter(row => { const args = read(row.before); return args[0].press.pending.options[args[1]].board < 0; });
  const cases = [];
  for (const row of held) {
    const args = read(row.before), call = engine => {
      const input = structuredClone(args), before = store(input), draws = [], random = Math.random; let value;
      Math.random = () => { const draw = random(); draws.push(draw); return draw; };
      try { value = engine.answerPress(...input); } finally { Math.random = random; }
      return { before, after: store(input), result: store(value), draws: store(draws) };
    };
    const a = call(good.engine), b = call(bad.engine), c = call(fixed.engine), expected = read(row.result);
    const actual = read(b.result), original = read(a.result), restored = read(c.result);
    assert.deepEqual(original, expected); assert.deepEqual(restored, expected);
    assert.notEqual(actual.boardConfidence, expected.boardConfidence, 'Actual disliked option exposes floor regression');
    const faultBoard = actual.boardConfidence; actual.boardConfidence = expected.boardConfidence;
    assert.deepEqual(actual, expected, 'Only actual board floor result differs');
    for (const arm of [a, b, c]) { assert.equal(arm.before.sha256, arm.after.sha256); assert.deepEqual(read(arm.draws), []); }
    cases.push({ option: args[0].press.pending.options[args[1]], healthy: a, fault: b, undo: c, expectedBoard: expected.boardConfidence, faultBoard, failures: ['press-clamp'] });
  }
  report.clampControl = { cases, healthy: { ...good, engine: undefined }, fault: { ...bad, engine: undefined }, undo: { ...fixed, engine: undefined }, expected: ['press-clamp'], effective: true, wholeUndo: true }; checkpoint();
  assert(cases.length >= 3, 'At least three genuine disliked cases expose the actual floor regression');
  report.status = 'accepted';
  console.log(`PASS managerPressCoverageProof.mjs: ${actualBases.length} actual first-season questions, ${report.validation.healthy.addedDisliked} genuine disliked probes, whole career/vector holds, two sampling faults and actual floor fault with full undo`);
} finally {
  report.sourceAfter = holds(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  checkpoint(); assert.equal(report.sourceHeld, true, 'Actual app and source disk bytes remain held');
  assert(work.startsWith(workParent + path.sep)); fs.rmSync(work, { recursive: true, force: true });
}
