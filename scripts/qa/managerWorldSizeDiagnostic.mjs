import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Diagnostic copies keep every historical case, assertion, seed and budget.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '09df145abfb241679022b41903d2f19bc254ebf9';
const OUT = path.resolve(process.env.MANAGER_SIZE_DIAGNOSTICS || path.join(ROOT, 'manager-world-size-diagnostics'));
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const HEAD = git(['rev-parse', 'HEAD']), TREE = git(['rev-parse', 'HEAD^{tree}']), BASE_TREE = git(['rev-parse', `${BASE}^{tree}`]);
assert.equal(BASE_TREE, '3d527d2a120e909132bbbde53148d140b6a014e1');
const SLOT_IMPORT = "import { expandPackedWorldRosterState } from './qa/managerWorldRosterDigest.cjs';\n";
const SLOT_INITIALIZER = '  const { h2h, ...rest } = s;';
const SLOT_ADAPTER = '  const { h2h, ...rest } = expandPackedWorldRosterState(s);';
const harnessSource = (ref, name) => execFileSync('git', ['show', `${ref}:scripts/${name}`],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replaceAll('\r\n', '\n');
function historicalHarnessContract(name, source) {
  const historical = harnessSource(BASE, name);
  let restored = source, representationAdapter = false;
  if (source !== historical) {
    assert.equal(name, 'simClubManagerSlots.mjs', 'SaveSize remains the exact historical Git source');
    assert.equal(source.split(SLOT_IMPORT).length - 1, 1, 'One exact independent decoder import');
    assert.equal(source.split(SLOT_ADAPTER).length - 1, 1, 'One exact representation initializer');
    assert.equal(source.split(SLOT_INITIALIZER).length - 1, 0, 'The original initializer is replaced once');
    restored = source.replace(SLOT_IMPORT, '').replace(SLOT_ADAPTER, SLOT_INITIALIZER);
    representationAdapter = true;
  }
  assert.equal(restored, historical, 'Removing only the exact two additions restores the entire historical source');
  return { representationAdapter, measuredSha256: sha(source), restoredHistoricalSha256: sha(restored) };
}
const harnessBlobs = Object.fromEntries(['simClubManagerSaveSize.mjs','simClubManagerSlots.mjs'].map(name => {
  const original = git(['rev-parse', `${BASE}:scripts/${name}`]), current = git(['rev-parse', `${HEAD}:scripts/${name}`]);
  const contract = historicalHarnessContract(name, harnessSource(HEAD, name));
  if (name === 'simClubManagerSaveSize.mjs') assert.equal(current, original, 'Historical SaveSize Git blob stays unchanged');
  return [name, { original, current, ...contract }];
}));
fs.mkdirSync(OUT, { recursive: true });
const parent = path.join(ROOT, '.sim-control'); fs.mkdirSync(parent, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(parent, 'manager-world-size-'));
const patches = [];
function replace(source, from, to, file) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, `One additive observer anchor in ${file}: ${from}`);
  assert.notEqual(from, to);
  const output = source.replace(from, to); assert.notEqual(output, source);
  patches.push({ file, from, to, count, effective: true, beforeSha256: sha(source), afterSha256: sha(output) });
  return output;
}
function heldSources() {
  const result = {};
  for (const relative of ['src/lib/clubManager.ts', 'src/lib/clubManagerWorldRoster.ts', 'src/lib/clubManagerEras.ts',
    'src/lib/clubManagerCalendar.ts', 'scripts/simClubManagerSaveSize.mjs', 'scripts/simClubManagerSlots.mjs',
    'scripts/qa/managerWorldSizeDiagnostic.mjs', 'scripts/qa/managerWorldRosterDigest.cjs', '.github/workflows/manager-world-size-diagnostic.yml', 'package.json', 'package-lock.json']) {
    const bytes = fs.readFileSync(path.join(ROOT, relative)); result[relative] = sha(bytes);
  }
  return result;
}
const before = heldSources();
const digestHelper = path.join(ROOT, 'scripts/qa/managerWorldRosterDigest.cjs');
const observer = path.join(TEMP, 'observer.cjs');
fs.writeFileSync(observer, String.raw`
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto'), {gzipSync} = require('node:zlib');
module.exports = (directory, label) => {
  fs.mkdirSync(directory, {recursive:true});
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  let enabled = true, active = false, raw = Math.random, wrapped = null, draws = [], stream = null, phase = null, rows = [];
  const {decodePackedWorldRosterRecords:decodePackedRecords,expandPackedWorldRosterState:expandPackedState} = require('__DIGEST_HELPER__');
  const digestRows = [];
  const expanded = (state, expand = expandPackedState) => {
    const rawStateJson = JSON.stringify(state);
    const expanded = expand(state);
    const decodedRecords = expanded.worldRoster?.records ?? null;
    const payload = {raw:JSON.parse(rawStateJson),expanded,rawStateJson,expandedStateJson:JSON.stringify(expanded),decodedRecords,
      decodedJsonSha256:decodedRecords===null?null:sha(JSON.stringify(decodedRecords)),stream,phase,recordingActive:enabled,
      actionFrame:rows.length?rows[rows.length-1]:null,remainingDraws:draws.slice()};
    const bytes=Buffer.from(JSON.stringify(payload)),packed=gzipSync(bytes,{level:6});
    const folder=path.join(directory,'digest-sidecar');fs.mkdirSync(folder,{recursive:true});
    const file=String(digestRows.length).padStart(4,'0')+'-digest.json.gz';fs.writeFileSync(path.join(folder,file),packed);
    digestRows.push({file,sha256:sha(bytes),archiveSha256:sha(packed),bytes:bytes.length,archiveBytes:packed.length,recordingActive:enabled});
    fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({label,scope:'Complete independent representation expansion before the unchanged historical ID renamer. Main draw cursor is untouched.',rows:digestRows},null,2));
    return expanded;
  };
  const measureRoster = state => {
    const ledger = state.worldRoster;
    const representation = ledger === undefined ? 'absent' : ledger?.packedRecords === undefined ? 'plain' : 'packed';
    let records = ledger?.records ?? [];
    try {
      if (ledger !== undefined && (!ledger || typeof ledger !== 'object' || Array.isArray(ledger) || !Array.isArray(ledger.records))) throw new Error('Invalid ledger envelope');
      if (representation === 'packed') {
        if (!Array.isArray(records) || records.length || typeof ledger.packedRecords !== 'string') throw new Error('Invalid packed envelope');
        records = decodePackedRecords(ledger);
      }
      if (!Array.isArray(records)) throw new Error('Records are not an array');
      return {representation,readable:true,count:records.length,
        ...(representation==='packed'?{decodedRecords:records,decodedJsonSha256:sha(JSON.stringify(records))}:{}),
        statuses:Object.fromEntries(['owned','released','retired'].map(status=>[status,{count:records.filter(r=>r.status===status).length,chars:JSON.stringify(records.filter(r=>r.status===status)).length}]))};
    } catch(error) {
      return {representation,readable:false,count:null,statuses:null,error:{name:error.name,message:error.message}};
    }
  };
  const measure = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    const text = JSON.stringify(state);
    return {club:state.clubName??null,season:state.season??null,worldSeed:state.worldSeed??null,chars:text.length,utf8Bytes:Buffer.byteLength(text),
      fields:Object.fromEntries(Object.entries(state).map(([key,value])=>{const text=JSON.stringify(value);return [key,text===undefined?null:{chars:text.length,utf8Bytes:Buffer.byteLength(text)}];})),
      roster:measureRoster(state)};
  };
  const manifest = () => fs.writeFileSync(path.join(directory,'observer.json'),JSON.stringify({label,scope:label.endsWith('SaveSize.mjs')?'the unchanged fifteen-season section1':'the unchanged alone/interleaved sections1+2',rows},null,2));
  const frame = (kind,value) => {
    if (!enabled) return;
    const drawCount=draws.length,bytes = Buffer.from(JSON.stringify({kind,stream,phase,value,draws})); draws=[];
    const name=String(rows.length).padStart(4,'0')+'-'+kind+'.json.gz',packed=gzipSync(bytes,{level:6});
    fs.writeFileSync(path.join(directory,name),packed);
    const states = value?.state?[measure(value.state)]:value?.fin?[measure(value.input),measure(value.fin),measure(value.next)]:[];
    rows.push({kind,phase,drawCount,file:name,bytes:bytes.length,sha256:sha(bytes),archiveBytes:packed.length,archiveSha256:sha(packed),states});manifest();
  };
  const reseed = context => {
    if (!enabled) return;
    if (draws.length) frame('between-streams',null);
    raw=Math.random;stream=context;draws=[];
    wrapped=()=>{const value=raw();draws.push(value);return value;};Math.random=wrapped;active=true;
  };
  return {expanded,phase:value=>{phase=value;},begin:()=>reseed({seedRule:process.env.SIM_SEED===undefined?'existing filename default':'existing SIM_SEED',simSeed:process.env.SIM_SEED??null}),reseed,frame,
    storage:value=>frame('whole-storage',{entries:value}),
    stop:()=>{if(draws.length)frame('tail',null);if(active&&Math.random===wrapped)Math.random=raw;enabled=false;manifest();}};
};
`.replace("__DIGEST_HELPER__", digestHelper.replaceAll("\\", "/")));
fs.copyFileSync(observer, path.join(OUT, 'observer.cjs'));
fs.copyFileSync(digestHelper, path.join(OUT, 'managerWorldRosterDigest.cjs'));
const observerStopControl = (() => {
  const directory = path.join(OUT, 'observer-stop-control'); fs.mkdirSync(directory, { recursive: true });
  const original = fs.readFileSync(observer, 'utf8');
  const from = '  const frame = (kind,value) => {\n    if (!enabled) return;\n';
  const to = '  const frame = (kind,value) => {\n';
  assert.equal(original.split(from).length - 1, 1, 'One effective observer stop guard');
  const fault = original.replace(from, to); assert.notEqual(fault, original);
  assert.equal(fault.split(to).length - 1, 1, 'One complete observer undo anchor');
  const undo = fault.replace(to, from); assert.equal(undo, original);
  const observations = {};
  const sourceHashes = {};
  const require = createRequire(import.meta.url);
  const read = output => {
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'observer.json'), 'utf8'));
    const files = fs.readdirSync(output).filter(name => name.endsWith('.json.gz')).sort();
    return { manifest, files: files.map(file => {
      const packed = fs.readFileSync(path.join(output, file)), raw = gunzipSync(packed);
      return { file, packedSha256: sha(packed), rawSha256: sha(raw), value: JSON.parse(raw) };
    }) };
  };
  const failures = observation => {
    const result = [];
    try { assert.equal(observation.manifest.rows.length, 1, 'Observer writes no frames after stop'); }
    catch (error) { assert(error instanceof assert.AssertionError); result.push('after-stop-frame'); }
    return result;
  };
  for (const [name, source] of [['healthy', original], ['fault', fault], ['undo', undo]]) {
    const file = path.join(directory, name + '-observer.cjs'), output = path.join(directory, name);
    fs.writeFileSync(file, source);
    const before = Math.random;
    const control = require(file)(output, 'stop-control/simClubManagerSlots.mjs');
    try {
      control.begin(); control.phase('before-stop');
      control.frame('season', { state: { clubName: 'Observer boundary', season: 1, held: { complete: true } } });
      control.stop(); assert.equal(Math.random, before, 'Stop restores the original random function');
      control.phase('after-stop');
      control.frame('season', { state: { clubName: 'Observer boundary', season: 2, held: { complete: true } } });
      observations[name] = read(output);
      sourceHashes[name] = { before: sha(source), after: sha(fs.readFileSync(file)) };
      assert.equal(sourceHashes[name].after, sourceHashes[name].before, 'Copied observer bytes stay held');
    } finally { control.stop(); assert.equal(Math.random, before); }
  }
  assert.deepEqual(failures(observations.healthy), []);
  assert.deepEqual(failures(observations.fault), ['after-stop-frame']);
  assert.deepEqual(failures(observations.undo), []);
  assert.deepEqual(observations.fault.files[0], observations.healthy.files[0], 'Fault keeps the whole active frame');
  assert.deepEqual(observations.fault.manifest.rows[0], observations.healthy.manifest.rows[0]);
  assert.equal(observations.fault.files.length, 2, 'Missing guard writes one real after-stop file');
  assert.equal(observations.fault.files[1].value.phase, 'after-stop');
  assert.equal(observations.fault.files[1].value.value.state.season, 2);
  assert.deepEqual(observations.fault.files[1].value.draws, [], 'After-stop file has no active draw capture');
  assert.deepEqual(observations.undo, observations.healthy, 'Undo restores the complete observation and file bytes');
  assert.equal(sha(fs.readFileSync(observer)), sha(original), 'Executed historical observer source stays held');
  const receipt = { scope: 'Copied observer stop boundary only, no application or zero-action draw claim',
    from, to, count: 1, effective: true, originalSha256: sha(original), faultSha256: sha(fault), undoSha256: sha(undo),
    exactFailures: ['after-stop-frame'], sourceHashes, observations };
  fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log('DIAGNOSTIC observer stop control: one effective after-stop frame, full undo and source bytes held');
  return { file: 'observer-stop-control/receipt.json', sha256: sha(fs.readFileSync(path.join(directory, 'receipt.json'))),
    effective: true, exactFailures: ['after-stop-frame'], sourceHeld: true };
})();
function digestExpansionControl(inputDirectory) {
  const directory = path.join(OUT, 'digest-expansion-control'); fs.mkdirSync(directory, { recursive: true });
  const originalHarness = harnessSource(BASE, 'simClubManagerSlots.mjs');
  const first = 'const GENERATED_ID = ', last = 'function diffKeys(';
  assert.equal(originalHarness.split(first).length - 1, 1); assert.equal(originalHarness.split(last).length - 1, 1);
  const start = originalHarness.indexOf(first), end = originalHarness.indexOf(last, start);
  assert(end > start, 'The unchanged complete historical digest block is bounded');
  const originalDigest = originalHarness.slice(start, end);
  const initializer = '  const { h2h, ...rest } = s;', adapted = '  const { h2h, ...rest } = __diagnostic.expanded(s);';
  assert.equal(originalDigest.split(initializer).length - 1, 1);
  const copiedDigest = originalDigest.replace(initializer, adapted);
  assert.equal(copiedDigest.replace(adapted, initializer), originalDigest, 'Only the declared representation initializer changes');
  fs.writeFileSync(path.join(directory, 'historical-slots.mjs'), originalHarness);
  fs.writeFileSync(path.join(directory, 'original-digest.js'), originalDigest);
  fs.writeFileSync(path.join(directory, 'adapted-digest.js'), copiedDigest);
  fs.copyFileSync(digestHelper, path.join(directory, 'managerWorldRosterDigest.cjs'));
  const manifestBytes = fs.readFileSync(path.join(inputDirectory, 'observer.json'));
  const manifest = JSON.parse(manifestBytes);
  const sourceBytes = fs.readFileSync(path.join(inputDirectory, 'observer-source.json'));
  const inputSource = JSON.parse(sourceBytes);
  assert.match(inputSource.ref, /^[0-9a-f]{40}$/, 'The measured input binds an exact Git commit');
  assert.equal(git(['rev-parse', `${inputSource.ref}^{tree}`]), inputSource.tree, 'The measured input tree is exact');
  assert.equal(inputSource.harness.file, 'scripts/simClubManagerSlots.mjs');
  assert.equal(git(['rev-parse', `${inputSource.ref}:scripts/simClubManagerSaveSize.mjs`]), harnessBlobs['simClubManagerSaveSize.mjs'].original,
    'The measured input preserves the exact historical SaveSize Git blob');
  const measuredHarness = harnessSource(inputSource.ref, 'simClubManagerSlots.mjs');
  const inputHarnessContract = historicalHarnessContract('simClubManagerSlots.mjs', measuredHarness);
  assert.equal(inputSource.harness.normalizedOriginalSha256, sha(measuredHarness), 'The measured harness matches its actual Git source');
  assert.equal(inputSource.sourceManifest['scripts/simClubManagerSlots.mjs'], sha(measuredHarness), 'The archived harness source is exact');
  if (inputSource.harness.measuredFile !== undefined) {
    assert.equal(path.basename(inputSource.harness.measuredFile), inputSource.harness.measuredFile);
    assert.equal(fs.readFileSync(path.join(inputDirectory, inputSource.harness.measuredFile), 'utf8').replaceAll('\r\n', '\n'), measuredHarness,
      'The retained plain measured source matches its actual Git commit');
    assert.equal(inputSource.harness.representationAdapter, inputHarnessContract.representationAdapter);
    assert.equal(inputSource.harness.restoredHistoricalSha256, inputHarnessContract.restoredHistoricalSha256);
  }
  const inputCopies = path.join(directory, 'input'); fs.mkdirSync(inputCopies, { recursive: true });
  fs.writeFileSync(path.join(inputCopies, 'observer.json'), manifestBytes);
  fs.writeFileSync(path.join(inputCopies, 'observer-source.json'), sourceBytes);
  fs.writeFileSync(path.join(inputCopies, 'measured-input-slots.mjs'), measuredHarness);
  const executedBytes = fs.readFileSync(path.join(inputDirectory, inputSource.harness.retainedFile));
  assert.equal(path.basename(inputSource.harness.retainedFile), inputSource.harness.retainedFile);
  assert.equal(sha(executedBytes), inputSource.harness.compiledObserverSha256, 'The retained actually executed harness stays held');
  fs.writeFileSync(path.join(inputCopies, inputSource.harness.retainedFile), executedBytes);
  for (const name of ['stdout.log', 'stderr.log']) fs.copyFileSync(path.join(inputDirectory, name), path.join(inputCopies, name));
  const frames = [], inputFiles = [];
  for (const row of manifest.rows) {
    assert.equal(path.basename(row.file), row.file, 'Input frame is a basename');
    const packed = fs.readFileSync(path.join(inputDirectory, row.file)), raw = gunzipSync(packed);
    assert.equal(sha(packed), row.archiveSha256); assert.equal(sha(raw), row.sha256);
    assert.equal(packed.length, row.archiveBytes); assert.equal(raw.length, row.bytes);
    const value = JSON.parse(raw);
    assert.equal(value.kind, row.kind); assert.equal(value.phase, row.phase); assert.equal(value.draws.length, row.drawCount);
    fs.writeFileSync(path.join(inputCopies, row.file), packed);
    inputFiles.push({ file: row.file, sha256: sha(raw), archiveSha256: sha(packed), bytes: raw.length, archiveBytes: packed.length });
    if (value.kind === 'season') frames.push({ row, value });
  }
  assert.equal(frames.length, 65, 'All fixed active historical season frames remain present');
  const alone = frames.filter(frame => frame.value.phase === 'alone');
  const interleaved = frames.filter(frame => frame.value.phase === 'interleaved');
  assert.equal(alone.length, 20); assert.equal(interleaved.length, 45);
  const pairs = interleaved.slice(0, 20).map(frame => {
    const { career, season } = frame.value.stream;
    const matching = alone.filter(candidate => candidate.value.stream.career === career && candidate.value.stream.season === season);
    assert.equal(matching.length, 1, 'One original complete alone frame for each recorded switch');
    for (const candidate of [matching[0], frame]) {
      assert.equal(candidate.value.value.fin.season, season);
      assert.equal(candidate.value.value.fin.clubName, candidate.value.value.input.clubName);
      assert.equal(candidate.value.value.next.season, season + 1);
    }
    return { career, season, alone: matching[0], interleaved: frame };
  });
  const inputStateSha256 = sha(JSON.stringify(frames));
  const originalObserver = fs.readFileSync(observer, 'utf8');
  const from = '    const expanded = expand(state);', to = '    const expanded = JSON.parse(JSON.stringify(state));';
  assert.equal(originalObserver.split(from).length - 1, 1, 'One genuine representation expansion control');
  const faultObserver = originalObserver.replace(from, to); assert.notEqual(faultObserver, originalObserver);
  assert.equal(faultObserver.split(to).length - 1, 1);
  const undoObserver = faultObserver.replace(to, from); assert.equal(undoObserver, originalObserver);
  const observations = {}, sourceHashes = {}, require = createRequire(import.meta.url);
  const retained = (file, value) => {
    const bytes = Buffer.from(JSON.stringify(value)), packed = gzipSync(bytes, { level: 6 });
    fs.writeFileSync(path.join(directory, file), packed);
    return { file, sha256: sha(bytes), archiveSha256: sha(packed), bytes: bytes.length, archiveBytes: packed.length };
  };
  const failures = observation => {
    try { assert.equal(observation.same, 20, 'All whole decoded season digests match'); return []; }
    catch (error) { assert(error instanceof assert.AssertionError); return [{ group: 'decoded-slot-replay', name: error.name,
      message: error.message, actual: error.actual, expected: error.expected }]; }
  };
  for (const [name, source] of [['healthy', originalObserver], ['fault', faultObserver], ['undo', undoObserver]]) {
    const file = path.join(directory, name + '-observer.cjs'), output = path.join(directory, name);
    fs.writeFileSync(file, source);
    const control = require(file)(output, 'digest-control/simClubManagerSlots.mjs');
    const digest = new Function('__diagnostic', copiedDigest + '\nreturn digest;')(control);
    const draws = [], rawRandom = Math.random;
    const monitored = () => { const value = rawRandom(); draws.push(value); return value; };
    Math.random = monitored;
    const rows = [];
    try {
      for (const pair of pairs) {
        control.phase('alone'); const a = digest(pair.alone.value.value.fin);
        control.phase('interleaved'); const b = digest(pair.interleaved.value.value.fin);
        rows.push({ career: pair.career, season: pair.season, aloneFrame: pair.alone.row.file, interleavedFrame: pair.interleaved.row.file,
          aloneDigest: a, interleavedDigest: b, same: a === b,
          aloneRawStateSha256: sha(JSON.stringify(pair.alone.value.value.fin)), interleavedRawStateSha256: sha(JSON.stringify(pair.interleaved.value.value.fin)),
          aloneDraws: pair.alone.value.draws, interleavedDraws: pair.interleaved.value.draws });
      }
      const sidecar = JSON.parse(fs.readFileSync(path.join(output, 'digest-sidecar/manifest.json'), 'utf8'));
      assert.equal(sidecar.rows.length, 40, 'Both complete saved states are retained for all twenty pairs');
      observations[name] = { total: rows.length, same: rows.filter(row => row.same).length, draws, rows, sidecar };
      retained(name + '-observations.json.gz', observations[name]);
      sourceHashes[name] = { before: sha(source), after: sha(fs.readFileSync(file)) };
      assert.equal(sourceHashes[name].before, sourceHashes[name].after); assert.deepEqual(draws, [], 'The independent representation read consumes no random draw');
    } finally {
      Math.random = rawRandom; control.stop(); assert.equal(Math.random, rawRandom);
    }
  }
  assert.deepEqual(failures(observations.healthy), []);
  assert.deepEqual(failures(observations.fault).map(row => row.group), ['decoded-slot-replay']);
  assert(observations.fault.same < observations.healthy.same, 'The missing decode changes the actual complete comparison');
  assert.deepEqual(failures(observations.undo), []);
  assert.deepEqual(observations.undo, observations.healthy, 'Full undo restores all complete digests, vectors, sidecars and inputs');
  assert.equal(sha(JSON.stringify(frames)), inputStateSha256, 'Every original complete state and draw vector stays unchanged');
  const receipt = { scope: 'Independent lossless representation expansion before the exact unchanged historical h2h exclusion and generated-ID renamer. No budget or original historical acceptance claim.',
    head: HEAD, tree: TREE, inputSource, inputHarnessContract, measuredHarnessSha256: sha(measuredHarness), measuredHarnessFile: 'input/measured-input-slots.mjs',
    inputFiles, inputStateSha256, executedHarnessSha256: sha(executedBytes), inputManifestSha256: sha(manifestBytes), inputSourceSha256: sha(sourceBytes),
    base: BASE, baseTree: BASE_TREE, historicalHarnessSha256: sha(originalHarness), originalDigestSha256: sha(originalDigest),
    adaptedDigestSha256: sha(copiedDigest), initializer, adapted, initializerCount: 1, digestRestorationExact: true,
    decoderSha256: sha(fs.readFileSync(digestHelper)), from, to, count: 1, effective: true, sourceHashes,
    originalSha256: sha(originalObserver), faultSha256: sha(faultObserver), undoSha256: sha(undoObserver),
    results: Object.fromEntries(Object.entries(observations).map(([name, observation]) => [name, { total: observation.total, same: observation.same,
      exactFailures: failures(observation), observation: { file: name + '-observations.json.gz', archiveSha256: sha(fs.readFileSync(path.join(directory, name + '-observations.json.gz'))) } }])) };
  fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2));
  assert.equal(sha(fs.readFileSync(observer)), sha(originalObserver));
  console.log('DIAGNOSTIC decoded Slots: twenty complete pairs, effective missing-decode rejection and full undo');
  return { file: 'digest-expansion-control/receipt.json', sha256: sha(fs.readFileSync(path.join(directory, 'receipt.json'))),
    pairs: 20, activeFrames: 65, healthySame: 20, undoSame: 20, exactFaults: ['decoded-slot-replay'], effective: true };
}
const results = [];
let digestExpansion = null;
const selected = new Set(['src','scripts','package.json','package-lock.json','tsconfig.json','tsconfig.app.json','tsconfig.node.json',
  'vite.config.ts','vitest.config.ts','index.html','postcss.config.js','tailwind.config.ts']);
try {
  if (process.env.MANAGER_DIGEST_CONTROL_INPUT) {
    digestExpansion = digestExpansionControl(path.resolve(process.env.MANAGER_DIGEST_CONTROL_INPUT));
    const after = heldSources(); assert.deepEqual(after, before);
    fs.writeFileSync(path.join(OUT, 'digest-only-report.json'), JSON.stringify({ head: HEAD, tree: TREE, base: BASE, baseTree: BASE_TREE,
      scope: 'Retained-data representation control only. No new engine, budget or historical harness acceptance.', sourceBefore: before, sourceAfter: after, sourceHeld: true, observerStopControl, digestExpansion }, null, 2));
  } else {
  for (const [arm, ref] of [['original', BASE], ['current', HEAD]]) {
    const directory = path.join(TEMP, arm); fs.mkdirSync(directory);
    const paths = git(['ls-tree', '--name-only', ref]).split('\n').filter(name => selected.has(name));
    assert(paths.includes('src') && paths.includes('scripts') && paths.includes('vitest.config.ts'));
    const archive = path.join(OUT, `${arm}-source.tar.gz`);
    execFileSync('git', ['archive','--format=tar.gz',`--output=${archive}`,ref,...paths], {cwd:ROOT});
    execFileSync('tar', ['-xzf',archive,'-C',directory], {cwd:ROOT});
    const sourceManifest = {};
    for (const relative of ['src/lib/clubManager.ts','src/lib/clubManagerEras.ts','src/lib/clubManagerCalendar.ts',
      'scripts/simClubManagerSaveSize.mjs','scripts/simClubManagerSlots.mjs','scripts/lib/seedRandom.mjs','package.json','package-lock.json',
      ...(arm==='current'?['scripts/qa/managerWorldRosterDigest.cjs']:[])]) {
      const bytes = fs.readFileSync(path.join(directory,relative)); sourceManifest[relative]=sha(bytes);
    }
    if (arm==='current') assert.equal(sourceManifest['scripts/qa/managerWorldRosterDigest.cjs'], sha(fs.readFileSync(digestHelper)),
      'The actual imported current decoder matches the held independent observer decoder');
    for (const name of ['simClubManagerSaveSize.mjs','simClubManagerSlots.mjs']) {
      const evidence = path.join(OUT,arm,name);fs.mkdirSync(evidence,{recursive:true});
      const file = path.join(directory,'scripts',name);
      const original = fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'); let source=original;
      const contract = historicalHarnessContract(name, original);
      assert.equal(original, harnessSource(ref, name), 'The archived actual source matches its Git ref');
      fs.writeFileSync(path.join(evidence, 'measured-harness.mjs'), original);
      const prefix = `import {createRequire as __diagnosticRequire} from 'node:module';\nconst __diagnostic = __diagnosticRequire(import.meta.url)(${JSON.stringify(observer)})(${JSON.stringify(evidence)},${JSON.stringify(arm+'/'+name)});\n__diagnostic.begin();\n`;
      if (name==='simClubManagerSaveSize.mjs') {
        source=replace(source,'  let s = startCareer(club);','  let s = startCareer(club);\n  __diagnostic.frame(\'start\',{state:s});',arm+'/'+name);
        source=replace(source,'    const fin = finishSeason(s).state;','    const fin = finishSeason(s).state;\n    __diagnostic.frame(\'finished\',{state:fin});',arm+'/'+name);
        source=replace(source,'    s = startNextSeason(fin);','    s = startNextSeason(fin);\n    __diagnostic.frame(\'rollover\',{state:s});',arm+'/'+name);
        source=replace(source,"if (!snapForSection2) abort(","__diagnostic.stop();\nif (!snapForSection2) abort(",arm+'/'+name);
      } else {
        source=replace(source,'    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n}\n\nlet nudges = 0;',
          '    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n  __diagnostic.reseed({career,season});\n}\n\nlet nudges = 0;',arm+'/'+name);
        source=replace(source,'  saveCareer(startCareer(C.club, C.era, undefined, C.manager));',
          "  const __diagnosticStarted=startCareer(C.club,C.era,undefined,C.manager);\n  saveCareer(__diagnosticStarted);\n  __diagnostic.frame('start',{state:__diagnosticStarted});",arm+'/'+name);
        source=replace(source,'  mem = startCareer(C.club, C.era, undefined, C.manager);',
          "  mem = startCareer(C.club, C.era, undefined, C.manager);\n  __diagnostic.frame('start',{state:mem});",arm+'/'+name);
        source=replace(source,'const alone = [];',"__diagnostic.phase('alone');\nconst alone = [];",arm+'/'+name);
        source=replace(source,'let mem = null;',"__diagnostic.phase('interleaved');\nlet mem = null;",arm+'/'+name);
        source=replace(source,'function playOne(s) {','function playOne(s) {\n  const __diagnosticInput=JSON.parse(JSON.stringify(s));',arm+'/'+name);
        source=replace(source,'  return { fin: r.state, sum: r.summary, next: startNextSeason(r.state) };',
          "  const next = startNextSeason(r.state);\n  __diagnostic.frame('season',{input:__diagnosticInput,fin:r.state,sum:r.summary,next});\n  return { fin: r.state, sum: r.summary, next };",arm+'/'+name);
        source=replace(source,'const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);',
          "const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);\n__diagnostic.storage([...store.entries()]);\n__diagnostic.stop();",arm+'/'+name);
      }
      if (arm==='current' && name==='simClubManagerSlots.mjs' && contract.representationAdapter) source=replace(source,SLOT_ADAPTER,
        '  const { h2h, ...rest } = __diagnostic.expanded(s, expandPackedWorldRosterState);',arm+'/'+name);
      source=prefix+source;fs.writeFileSync(file,source);
      fs.writeFileSync(path.join(evidence,name),source);
      fs.writeFileSync(path.join(evidence,'observer-source.json'),JSON.stringify({arm,ref,tree:git(['rev-parse',`${ref}^{tree}`]),sourceManifest,
        sourceArchive:{file:path.basename(archive),sha256:sha(fs.readFileSync(archive))},
        harness:{file:'scripts/'+name,retainedFile:name,measuredFile:'measured-harness.mjs',normalizedOriginalSha256:sha(original),
          restoredHistoricalSha256:contract.restoredHistoricalSha256,representationAdapter:contract.representationAdapter,compiledObserverSha256:sha(source)},
        patches:patches.filter(row=>row.file===arm+'/'+name),observerFile:'../../observer.cjs',observerSha256:sha(fs.readFileSync(observer))},null,2));
      const run=spawnSync(process.execPath,[file],{cwd:directory,encoding:'utf8',maxBuffer:64*1024*1024,timeout:45*60*1000,
        env:{...process.env,CI:'1',FORCE_COLOR:'0',NO_COLOR:'1',CM_SLOTS_ARTIFACTS:path.join(evidence,'slots-receipts')}});
      fs.writeFileSync(path.join(evidence,'stdout.log'),run.stdout??'');fs.writeFileSync(path.join(evidence,'stderr.log'),run.stderr??'');
      const observed=fs.existsSync(path.join(evidence,'observer.json'))?JSON.parse(fs.readFileSync(path.join(evidence,'observer.json'),'utf8')):null;
      const result={arm,ref,name,status:run.status,signal:run.signal,error:run.error?{name:run.error.name,message:run.error.message}:null,
        observerRows:observed?.rows.length??0,finishedSeasons:observed?.rows.filter(row=>row.kind==='finished').length??0,
        slotSeasonFrames:observed?.rows.filter(row=>row.kind==='season').length??0,
        stdoutSha256:sha(run.stdout??''),stderrSha256:sha(run.stderr??'')};
      results.push(result);fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({head:HEAD,tree:TREE,base:BASE,baseTree:BASE_TREE,harnessBlobs,simSeed:process.env.SIM_SEED??null,
        scope:'diagnostic only, historical budget failures remain failures',sourceBefore:before,observerStopControl,digestExpansion,results,patches},null,2));
      console.log(`DIAGNOSTIC ${arm} ${name}: exit ${run.status}, ${result.finishedSeasons} finished size seasons, ${result.slotSeasonFrames} slot season frames`);
    }
  }
  digestExpansion = digestExpansionControl(path.join(OUT, 'current/simClubManagerSlots.mjs'));
  const after=heldSources();assert.deepEqual(after,before);
  assert.equal(results.length,4);assert(results.every(row=>row.error===null&&row.signal===null),'All diagnostic processes completed');
  for(const result of results){assert.equal(result.name==='simClubManagerSaveSize.mjs'?result.finishedSeasons:result.slotSeasonFrames,result.name==='simClubManagerSaveSize.mjs'?45:65,'All original/current fixed historical season frames retained');}
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({head:HEAD,tree:TREE,base:BASE,baseTree:BASE_TREE,harnessBlobs,simSeed:process.env.SIM_SEED??null,
    scope:'diagnostic only, historical budget failures remain failures',sourceBefore:before,sourceAfter:after,sourceHeld:true,observerStopControl,digestExpansion,results,patches},null,2));
  console.log('DIAGNOSTIC complete: original/current unchanged historical budgets, full raw states, storage and unfiltered action vectors retained');
  }
} finally {
  assert.equal(path.dirname(fs.realpathSync(TEMP)),fs.realpathSync(parent));
  assert(path.basename(TEMP).startsWith('manager-world-size-'));
  fs.rmSync(TEMP,{recursive:true,force:true});
}
