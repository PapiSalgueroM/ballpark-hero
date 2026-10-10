import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// This diagnostic retains the historical harness and its normal failures.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.MANAGER_METERS_DIAGNOSTICS || 'manager-meters-diagnostics');
const BASE = '09df145abfb241679022b41903d2f19bc254ebf9';
const CURRENT = '4842fdd24e9ab2b85c8b5a0a85be4526b585f569';
const HARNESS = 'scripts/simClubManagerMeters.mjs';
const HARNESS_BLOB = 'c32ac01df5200b01597344d841d6ff66416c5848';
const CLOCK = Date.parse('2026-10-10T00:00:00Z');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-meters-diagnostic-'));
fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const heldPaths = [HARNESS, 'scripts/lib/seedRandom.mjs', 'scripts/lib/offlineTransport.cjs',
  'scripts/qa/managerMetersDiagnostic.mjs', '.github/workflows/manager-meters-diagnostic.yml', 'package.json', 'package-lock.json'];
const held = () => Object.fromEntries(heldPaths.map(relative => [relative, sha(fs.readFileSync(path.join(ROOT, relative)))]));
const before = held();
let defaultSeed = 0x811c9dc5;
for (const character of 'simClubManagerMeters.mjs') defaultSeed = Math.imul(defaultSeed ^ character.charCodeAt(0), 0x01000193) >>> 0;
assert.equal(defaultSeed, 2752402491, 'Actual unchanged filename seed');
const report = { scope: 'Exact original09df/current484 full Meters data diagnostic only. No build, final SEO, all-CI or release credit.',
  plainInstrumentationScope: 'Plain runs keep the entire harness source unchanged and use only the shared fixed-clock preload and transparent unfiltered Math.random observation. Whole-state action hooks exist only in copied observed harnesses.',
  diagnosticHead: git(['rev-parse', 'HEAD']).toString().trim(), diagnosticTree: git(['rev-parse', 'HEAD^{tree}']).toString().trim(),
  clock: { epochMs: CLOCK, scope: 'Same explicit frozen clock for both arms. Historical Quick workflow used its wall clock; this is not that exact timestamp.' },
  seed: { override: null, basename: 'simClubManagerMeters.mjs', value: defaultSeed, scope: 'Unchanged seedRandom filename default. SIM_SEED is removed for every child.' },
  sources: [], runs: [], controls: [], sourceBefore: before };
json(path.join(OUT, 'report.json'), report);

const preload = path.join(OUT, 'observer-preload.cjs');
fs.writeFileSync(preload, String.raw`
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{gzipSync}=require('node:zlib');
const directory=process.env.CM_METERS_OBSERVATIONS_DIR;fs.mkdirSync(directory,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const NativeDate=Date,epoch=Number(process.env.CM_METERS_CLOCK);
class DiagnosticDate extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]));}static now(){return epoch;}}
globalThis.Date=DiagnosticDate;
let raw=Math.random,draws=[],rows=[];
const wrap=fn=>function(){const value=fn();draws.push(value);return value;};
let wrapped=wrap(raw);
Object.defineProperty(Math,'random',{configurable:true,enumerable:false,get(){return wrapped;},set(fn){if(typeof fn!=='function')throw new TypeError('Math.random must remain callable');raw=fn;wrapped=wrap(raw);}});
const write=(file,value)=>{const bytes=Buffer.from(JSON.stringify(value)),packed=gzipSync(bytes,{level:6});fs.writeFileSync(path.join(directory,file),packed);return{file,bytes:bytes.length,sha256:sha(bytes),archiveBytes:packed.length,archiveSha256:sha(packed)};};
globalThis.__metersDiagnostic={
 cursor:()=>draws.length,
 frame(kind,value,start=draws.length){const file=String(rows.length).padStart(4,'0')+'-'+kind+'.json.gz';const retained=JSON.parse(JSON.stringify(value));rows.push({kind,start,end:draws.length,...write(file,{kind,value:retained,draws:draws.slice(start)})});},
 action(name,args,call){const before=JSON.parse(JSON.stringify(args)),start=draws.length,result=call();this.frame('engine-action',{name,before,after:args,result},start);return result;}
};
process.on('exit',code=>{const tape=write('whole-draws.json.gz',draws);fs.writeFileSync(path.join(directory,'observer.json'),JSON.stringify({exit:code,clock:epoch,rows,drawCount:draws.length,tape},null,2));});
`);
report.observerPreloadSha256 = sha(fs.readFileSync(preload));

function patchSource(raw) {
  let source = raw;
  const patches = [];
  const replace = (from, to, label) => {
    assert.equal(source.split(from).length - 1, 1, `${label} unique exact observer anchor`);
    const previous = source;
    source = source.replace(from, to);
    assert.notEqual(source, previous, `${label} effective observer addition`);
    patches.push({ label, from, to, beforeSha256: sha(previous), afterSha256: sha(source), targetCount: 1 });
  };
  replace('const {\n  startCareer, playNextEntry, finishSeason, startNextSeason, answerPress, respondApproach,\n  sortedLeagueTable, sortedWorldTable, sortedTable, careerLeagueOf, worldLeagueDefs,\n} = cm;',
    'const {\n  startCareer: originalStartCareer, playNextEntry: originalPlayNextEntry, finishSeason: originalFinishSeason, startNextSeason: originalStartNextSeason, answerPress: originalAnswerPress, respondApproach: originalRespondApproach,\n  sortedLeagueTable, sortedWorldTable, sortedTable, careerLeagueOf, worldLeagueDefs,\n} = cm;\n' +
    "const observeCall = (name, call) => (...args) => globalThis.__metersDiagnostic.action(name, args, () => call(...args));\n" +
    "const startCareer = observeCall('startCareer', originalStartCareer), playNextEntry = observeCall('playNextEntry', originalPlayNextEntry), finishSeason = observeCall('finishSeason', originalFinishSeason), startNextSeason = observeCall('startNextSeason', originalStartNextSeason), answerPress = observeCall('answerPress', originalAnswerPress), respondApproach = observeCall('respondApproach', originalRespondApproach);", 'all actual constructors and engine actions');
  replace('      const s = act(s0) ?? s0;',
    "      const s = globalThis.__metersDiagnostic.action('desk: '+label, [s0], () => act(s0)) ?? s0;", 'all actual finance desk actions');
  replace('let probes = 0, promiseZero = 0, promiseFired = 0;',
    "globalThis.__metersDiagnostic.frame('kept-bases', {keptStates, keptSkipped, entries, seasonsPlayed, pressAnswers, sackings});\nlet probes = 0, promiseZero = 0, promiseFired = 0;", 'entire actual kept bases');
  replace('  const q = base.press?.pending;\n  if (q && q.options?.length) {',
    "  const q = base.press?.pending;\n  globalThis.__metersDiagnostic.frame('pending-base', {base, question:q??null});\n  if (q && q.options?.length) {", 'every actual pending base');
  replace('      s0.boardConfidence = 0.5;\n      const s = answerPress(s0, i);',
    "      s0.boardConfidence = 0.5;\n      const observedBefore = clone(s0);\n      const observedCursor = globalThis.__metersDiagnostic.cursor();\n      const s = answerPress(s0, i);\n      globalThis.__metersDiagnostic.frame('half-point-option', {base, question:q, option:o, index:i, before:observedBefore, inputAfter:s0, after:s}, observedCursor);", 'every half-point option full state and vector');
  replace("console.log('');\nif (failures) {",
    "globalThis.__metersDiagnostic.frame('completed-probes', {keptStates, keptSkipped, entries, seasonsPlayed, pressAnswers, sackings, probes, promiseZero, promiseFired, pressProbes, pressNegative, handshakes, deskProbes, deskDocks, failures});\nconsole.log('');\nif (failures) {", 'retain outcomes before unchanged failure exit');
  return { source, patches };
}

function captureLoaded(tree, pid, folder) {
  const entry = path.join(os.tmpdir(), `clubManagerMeters.${pid}.entry.mjs`);
  const bundle = path.join(os.tmpdir(), `clubManagerMeters.${pid}.bundle.cjs`);
  assert(fs.existsSync(entry) && fs.existsSync(bundle), 'The actual harness reached its real bundle');
  const bytes = fs.readFileSync(bundle);
  fs.copyFileSync(entry, path.join(folder, 'actual-entry.mjs'));
  fs.copyFileSync(bundle, path.join(folder, 'actual-bundle.cjs'));
  const meta = path.join(folder, 'loaded-metafile.json');
  const rebuilt = spawnSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--format=cjs', '--platform=node', '--jsx=automatic',
    '--alias:@=' + path.join(tree, 'src'), '--outfile=' + bundle, '--log-level=error', '--metafile=' + meta],
  { cwd: tree, env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') }, encoding: 'utf8' });
  assert.equal(rebuilt.status, 0, rebuilt.stderr);
  assert.deepEqual(fs.readFileSync(bundle), bytes, 'Read-only provenance recompilation yields exactly the actual loaded bundle');
  const records = Object.keys(JSON.parse(fs.readFileSync(meta, 'utf8')).inputs).map(input => {
    const absolute = path.resolve(tree, input), raw = fs.readFileSync(absolute);
    const relative = path.relative(tree, absolute).replaceAll('\\', '/');
    return { input, absolute, relative, bytes: raw.length, sha256: sha(raw), scope: absolute.startsWith(tree + path.sep) ? 'archived-source' : absolute.startsWith(ROOT + path.sep) ? 'held-dependency' : 'generated-entry' };
  });
  json(path.join(folder, 'loaded-source-inventory.json'), records);
  return { entrySha256: sha(fs.readFileSync(entry)), bundleSha256: sha(bytes), loadedCount: records.length,
    inventorySha256: sha(fs.readFileSync(path.join(folder, 'loaded-source-inventory.json'))) };
}

function observeCheck(folder) {
  const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'observer.json'), 'utf8'));
  const read = item => {
    const packed = fs.readFileSync(path.join(folder, item.file)), bytes = gunzipSync(packed);
    assert.equal(sha(packed), item.archiveSha256); assert.equal(sha(bytes), item.sha256);
    return JSON.parse(bytes);
  };
  const tape = read(manifest.tape);
  assert.equal(tape.length, manifest.drawCount);
  assert(tape.every(value => Number.isFinite(value) && value >= 0 && value < 1));
  const frames = manifest.rows.map(item => {
    const payload = read(item);
    assert.deepEqual(payload.draws, tape.slice(item.start, item.end), 'Complete per-action tape agrees with complete unfiltered process tape');
    if(item.kind==='engine-action') {
      assert(Object.hasOwn(payload.value,'before')&&Object.hasOwn(payload.value,'after')&&Object.hasOwn(payload.value,'result'),'Complete actual before/after/result action row retained');
      return {...item,action:payload.value.name,beforeSha256:sha(JSON.stringify(payload.value.before)),afterSha256:sha(JSON.stringify(payload.value.after)),resultSha256:sha(JSON.stringify(payload.value.result)),wholeStateFileHeld:true};
    }
    return {...item,value:payload.value,draws:payload.draws};
  });
  return { manifest, frames, tape };
}

function observationFailures(observed) {
  const failures = [];
  const kept = observed.frames.filter(frame => frame.kind === 'kept-bases');
  const completed = observed.frames.filter(frame => frame.kind === 'completed-probes');
  if (kept.length !== 1 || completed.length !== 1) return ['complete-observation'];
  const bases = [...kept[0].value.keptStates.mid, ...kept[0].value.keptStates.promiseProbes];
  const pending = observed.frames.filter(frame => frame.kind === 'pending-base');
  if (pending.length !== bases.length || JSON.stringify(pending.map(frame => frame.value.base)) !== JSON.stringify(bases)) failures.push('pending-bases');
  const options = observed.frames.filter(frame => frame.kind === 'half-point-option');
  const expected = bases.flatMap(base => (base.press?.pending?.options ?? []).map((option, index) => ({ base, question: base.press.pending, option, index })));
  if (options.length !== expected.length || options.length !== completed[0].value.pressProbes) failures.push('option-coverage');
  else for (let i = 0; i < expected.length; i++) {
    const frame = options[i], value = frame.value;
    if (JSON.stringify({ base:value.base, question:value.question, option:value.option, index:value.index }) !== JSON.stringify(expected[i])) { failures.push('option-facts'); break; }
    const input = JSON.parse(JSON.stringify(expected[i].base)); input.boardConfidence = 0.5;
    if (JSON.stringify(input) !== JSON.stringify(value.before)) { failures.push('half-point-input'); break; }
  }
  if (options.filter(frame => (frame.value.option.board ?? 0) < 0).length !== completed[0].value.pressNegative) failures.push('disliked-count');
  const actions=observed.frames.filter(frame=>frame.kind==='engine-action'),counts=completed[0].value;
  if(actions.filter(frame=>frame.action==='startCareer').length!==34) failures.push('constructor-coverage');
  const count=name=>actions.filter(frame=>frame.action===name).length;
  if(count('playNextEntry')!==counts.entries+counts.probes||count('answerPress')!==counts.pressAnswers+counts.pressProbes||count('respondApproach')!==counts.handshakes||actions.filter(frame=>frame.action.startsWith('desk: ')).length!==counts.deskProbes||count('finishSeason')!==count('startNextSeason')) failures.push('action-coverage');
  return failures;
}

try {
  assert.equal(git(['rev-parse', `${BASE}:${HARNESS}`]).toString().trim(), HARNESS_BLOB);
  assert.equal(git(['rev-parse', `${CURRENT}:${HARNESS}`]).toString().trim(), HARNESS_BLOB);
  assert.deepEqual(git(['show', `${BASE}:${HARNESS}`]), git(['show', `${CURRENT}:${HARNESS}`]), 'Original/current full harness pins held');
  assert.deepEqual(git(['show', `${BASE}:scripts/lib/seedRandom.mjs`]), git(['show', `${CURRENT}:scripts/lib/seedRandom.mjs`]), 'Original/current seed source held');
  for (const [arm, ref] of [['original', BASE], ['current', CURRENT]]) {
    const tree = path.join(TEMP, arm); fs.mkdirSync(tree);
    const archive = git(['archive', '--format=tar.gz', ref]);
    fs.writeFileSync(path.join(OUT, `${arm}-source.tar.gz`), archive);
    execFileSync('tar', ['-xzf', path.join(OUT, `${arm}-source.tar.gz`), '-C', tree]);
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tree, 'node_modules'), 'dir');
    const treeId = git(['rev-parse', `${ref}^{tree}`]).toString().trim();
    const lockedInstalled = [], lockedOmissions = [];
    for (const [directory, expected] of Object.entries(JSON.parse(fs.readFileSync(path.join(tree,'package-lock.json'),'utf8')).packages)) {
      if (!directory.startsWith('node_modules/') || !expected.version) continue;
      const expectedName=expected.name??directory.slice(directory.lastIndexOf('node_modules/')+'node_modules/'.length);
      if(!fs.existsSync(path.join(ROOT,directory,'package.json'))) {
        assert.equal(expected.optional,true,`${arm} omitted installed package must be optional: ${directory}`);
        lockedOmissions.push({directory,expectedName,version:expected.version,optional:true,os:expected.os??null,cpu:expected.cpu??null,reason:'Not installed by actual npm ci on this Actions platform'});
        continue;
      }
      const actual = JSON.parse(fs.readFileSync(path.join(ROOT,directory,'package.json'),'utf8'));
      assert.equal(actual.name,expectedName,`${arm} archived lock name ${directory}`);
      assert.equal(actual.version,expected.version,`${arm} archived lock version ${directory}`);
      lockedInstalled.push({directory,name:actual.name,expectedName,version:actual.version});
    }
    assert(lockedInstalled.length>0);
    report.sources.push({ arm, ref, tree:treeId, archiveSha256:sha(archive), archiveBytes:archive.length,
      fullGitInventory:git(['ls-tree', '-r', '--full-tree', ref]).toString(), harnessSha256:sha(fs.readFileSync(path.join(tree, HARNESS))),
      packageSha256:sha(fs.readFileSync(path.join(tree, 'package.json'))), lockSha256:sha(fs.readFileSync(path.join(tree, 'package-lock.json'))),
      lockedCoverage:{installed:lockedInstalled.length,omittedOptional:lockedOmissions.length,totalVersioned:lockedInstalled.length+lockedOmissions.length},lockedInstalled,lockedOmissions });
    let plainObserved = null, patchedObserved = null;
    for (const mode of ['plain', 'observed']) {
      let root = tree, patches = [];
      if (mode === 'observed') {
        root = path.join(TEMP, `${arm}-observed`);
        fs.cpSync(tree, root, { recursive:true, filter: file => path.basename(file) !== 'node_modules' });
        fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'), 'dir');
        const original = fs.readFileSync(path.join(root, HARNESS), 'utf8'), patched = patchSource(original);
        fs.writeFileSync(path.join(root, HARNESS), patched.source); patches = patched.patches;
        const folder = path.join(OUT, arm, mode); fs.mkdirSync(folder, {recursive:true});
        fs.writeFileSync(path.join(folder, 'original-harness.mjs'), original);
        fs.writeFileSync(path.join(folder, 'observed-harness.mjs'), patched.source);
        let restored = patched.source;
        for (const patch of [...patches].reverse()) { assert.equal(restored.split(patch.to).length-1,1); restored=restored.replace(patch.to,patch.from); }
        assert.equal(restored, original, 'Complete copied harness undo');
        fs.writeFileSync(path.join(folder, 'restored-harness.mjs'), restored);
      }
      const folder = path.join(OUT, arm, mode); fs.mkdirSync(folder, {recursive:true});
      const env = { ...process.env, NODE_PATH:path.join(ROOT,'node_modules'), CM_METERS_OBSERVATIONS_DIR:folder, CM_METERS_CLOCK:String(CLOCK),
        NODE_OPTIONS:`--require=${path.join(ROOT,'scripts/lib/offlineTransport.cjs')} --require=${preload}` };
      delete env.SIM_SEED; delete env.CM_METERS_CONTROL;
      const started = Date.now(), result = spawnSync(process.execPath, [path.join(root,HARNESS)], {cwd:root, env, encoding:'utf8', maxBuffer:32*1024*1024, timeout:25*60*1000});
      fs.writeFileSync(path.join(folder,'stdout.log'),result.stdout??''); fs.writeFileSync(path.join(folder,'stderr.log'),result.stderr??'');
      assert.equal(result.error, undefined, 'Actual harness process completed without setup/timeout error');
      assert(result.status === 0 || result.status === 1, 'Historical harness completed with its real assertion exit');
      const observed = observeCheck(folder), loaded = captureLoaded(root,result.pid,folder);
      const row = {arm,mode,status:result.status,elapsedMs:Date.now()-started,stdoutSha256:sha(result.stdout),stderrSha256:sha(result.stderr),
        harnessSha256:sha(fs.readFileSync(path.join(root,HARNESS))),patches,drawCount:observed.tape.length,tapeSha256:sha(JSON.stringify(observed.tape)),
        failureLines:result.stderr.split('\n').filter(line=>line.includes('FAIL:')||line.startsWith('simClubManagerMeters:')),loaded};
      report.runs.push(row);json(path.join(OUT,'report.json'),report);
      if(mode==='plain') plainObserved=observed; else patchedObserved=observed;
    }
    const pair=report.runs.filter(run=>run.arm===arm);
    assert.equal(pair[0].status,pair[1].status);assert.equal(pair[0].stdoutSha256,pair[1].stdoutSha256);assert.equal(pair[0].stderrSha256,pair[1].stderrSha256);
    assert.deepEqual(plainObserved.tape,patchedObserved.tape,'Additive observations preserve every unfiltered draw and unchanged full harness output');
    assert.deepEqual(observationFailures(patchedObserved),[],'Complete actual observation agrees with all retained bases/options and existing counts');
    const original=JSON.stringify(patchedObserved),fault=JSON.parse(original);
    const indices=[fault.frames.findIndex(frame=>frame.kind==='pending-base'),fault.frames.findIndex(frame=>frame.action==='startCareer'),fault.frames.findIndex(frame=>frame.action==='playNextEntry')].sort((a,b)=>a-b);
    assert(indices.every(index=>index>=0)&&new Set(indices).size===3,'Actual base/constructor/action observations exist for effective omissions');
    const removed=indices.map(index=>({index,frame:fault.frames[index]}));
    for(const index of [...indices].reverse())fault.frames.splice(index,1);
    const faulty=JSON.parse(JSON.stringify(fault));assert.notEqual(JSON.stringify(fault),original);
    const exactFailures=['pending-bases','constructor-coverage','action-coverage'];
    assert.deepEqual(observationFailures(fault),exactFailures,'Copied observation omissions fire only their intended detectors');
    for(const item of removed)fault.frames.splice(item.index,0,item.frame);
    assert.equal(JSON.stringify(fault),original,'Entire observation undo');
    assert.deepEqual(observationFailures(fault),[]);
    const file=`${arm}-observation-control.json.gz`,bytes=Buffer.from(JSON.stringify({scope:'Copied observation detector only, no product or harness source fault.',
      original:patchedObserved,fault:faulty,restored:fault,removed,failures:exactFailures}));
    const packed=gzipSync(bytes,{level:6});fs.writeFileSync(path.join(OUT,file),packed);
    report.controls.push({arm,file,bytes:bytes.length,sha256:sha(bytes),archiveSha256:sha(packed),changed:true,exactFailures,wholeUndo:true});
    console.log(`${arm}: unchanged full harness exit${pair[0].status}; observer output/vector held; ${patchedObserved.frames.filter(frame=>frame.kind==='half-point-option').length} actual half-point options retained`);
  }
  report.sourceAfter=held();assert.deepEqual(report.sourceAfter,before,'All actual diagnostic source/package bytes held');
  report.completed=true;json(path.join(OUT,'report.json'),report);
  console.log('Manager Meters diagnostic: both full original/current harness outcomes retained; two effective copied observation controls with three omissions each and complete undo verified.');
} catch(error) {
  report.error={name:error.name,message:error.message,stack:error.stack};report.sourceAfter=held();json(path.join(OUT,'report.json'),report);throw error;
}
