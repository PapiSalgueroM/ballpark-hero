import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const arg = key => { const i = process.argv.indexOf(key); assert(i >= 0 && process.argv[i + 1], key); return process.argv[i + 1]; };
const out = path.resolve(arg('--out')), specPath = path.resolve(arg('--spec')), original = path.resolve(arg('--original'));
const specBytes = fs.readFileSync(specPath), spec = JSON.parse(specBytes.toString('utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const same = (a, b, label) => assert(a.length === b.length && a.equals(b), label);
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const git = args => execFileSync('git', args, { maxBuffer: 16_000_000, env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
const gt = args => git(args).toString('utf8').trim();
const armFor = name => { const a = spec.arms.find(row => row.name === name); assert(a, 'SC4_KNOWN_ARM'); return a; };
const specPins = arm => {
  const pins = { ...spec.sourcePins };
  if (arm.source === 'original') for (const row of spec.appFiles) pins[row.path] = row.before;
  if (arm.source === 'fault') { const f = spec.faults.find(row => row.name === arm.name); pins[f.path] = f.afterBlob; }
  return pins;
};
function checkPins(arm) {
  for (const [file, pin] of Object.entries(specPins(arm))) assert.equal(blob(fs.readFileSync(file)), pin, 'SC4_ARM_SOURCE_PIN ' + file);
  assert.equal(blob(fs.readFileSync(spec.test.path)), spec.test.sha, 'SC4_REVISED_TEST_PIN');
}
function validateReport(value, arm) {
  assert.equal(value.success, arm.failed.length === 0, 'SC4_REPORT_SUCCESS');
  assert.equal(value.numTotalTests, 5, 'SC4_CASE_CENSUS');
  assert.equal(value.numPassedTests, 5 - arm.failed.length, 'SC4_CASE_CENSUS');
  assert.equal(value.numFailedTests, arm.failed.length, 'SC4_CASE_CENSUS');
  for (const k of ['numPendingTests','numTodoTests','numRuntimeErrors','numRuntimeErrorTestSuites','numUnhandledErrors'])
    if (value[k] !== undefined) assert.equal(value[k], 0, 'SC4_RUNTIME_CENSUS ' + k);
  if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, [], 'SC4_RUNTIME_CENSUS');
  assert.equal(value.testResults.length, 1, 'SC4_CASE_CENSUS');
  const cases = value.testResults[0].assertionResults;
  assert.deepEqual(cases.map(row => row.fullName), spec.cases.map(row => row.fullName), 'SC4_CASE_CENSUS');
  for (const [i, row] of cases.entries()) {
    const failed = arm.failed.includes(i);
    assert.equal(row.status, failed ? 'failed' : 'passed', 'SC4_ARM_CASE_STATUS ' + i);
    if (!failed) { assert.deepEqual(row.failureMessages ?? [], [], 'SC4_PASS_HAS_NO_FAILURE'); continue; }
    assert(row.failureMessages.length > 0, 'SC4_OWNED_ASSERTION_PRESENT');
    for (const message of row.failureMessages) {
      assert.match(message, /^AssertionError:/, 'SC4_BUSINESS_ASSERTION');
      assert(message.includes(arm.markers[i]), 'SC4_OWNED_MARKER ' + arm.markers[i]);
      assert(!/TypeError:|ReferenceError:|SyntaxError:|Cannot find module|SC4_AUTHENTIC_|SC4_ORIGINAL_.*SHA|Unsupported actual public phase|SC4_INPUT_MEASUREMENT_GAP|SC4_FULL_CAPTURE_RETENTION_BOUND/.test(message), 'SC4_NO_SETUP_OWNERSHIP');
    }
  }
  return cases.map(row => ({ name: row.fullName, status: row.status, failureMessages: row.failureMessages }));
}
function census(value, pointer = '') {
  if (!value || typeof value !== 'object') return [];
  const result = [];
  if (Array.isArray(value.frames) && Array.isArray(value.mainDraws))
    result.push({ pointer, frames: value.frames.length, draws: value.mainDraws.length });
  for (const [key, child] of Object.entries(value))
    result.push(...census(child, pointer + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1')));
  return result;
}
function validateBody(value, row) {
  assert.deepEqual(census(value), row.journeys, 'SC4_FULL_JOURNEY_CENSUS');
  function visit(v) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.frames) && Array.isArray(v.mainDraws)) {
      assert(v.frames.length > 0 && v.frames.length <= spec.limits.maxActionsPerAttempt + 1, 'SC4_ACTION_BOUND');
      let last = 0;
      for (const f of v.frames) {
        assert.equal(typeof f.action, 'string');
        assert.equal(typeof f.saved, 'string');
        assert(f.saved.length > 0 && f.state && typeof f.state.playerName === 'string', 'SC4_COMPLETE_CODEC_FRAME');
        assert.equal(f.phase, f.state.phase);
        assert.equal(f.year, f.state.seasons.at(-1).year);
        assert(Number.isSafeInteger(f.mainRngState) && Number.isSafeInteger(f.drawsThrough));
        assert(f.drawsThrough >= last && f.drawsThrough <= v.mainDraws.length, 'SC4_GLOBAL_FRAME_CHECKPOINT');
        last = f.drawsThrough;
      }
      for (const d of v.mainDraws) assert.equal(typeof d.action, 'string'), assert(Number.isFinite(d.value) && d.value >= 0 && d.value < 1);
    }
    for (const child of Object.values(v)) visit(child);
  }
  visit(value);
}
function decode(stored, row) {
  assert.equal(stored.length, row.storedBytes, 'SC4_STORED_RAW_BYTES');
  assert.equal(sha(stored), row.storedSHA256, 'SC4_STORED_RAW_SHA');
  const literal = gunzipSync(stored, { maxOutputLength: spec.limits.decodedBytes });
  assert.equal(literal.length, row.bytes, 'SC4_DECODED_RAW_BYTES');
  assert.equal(sha(literal), row.sha256, 'SC4_DECODED_RAW_SHA');
  const value = JSON.parse(literal.toString('utf8'));
  validateBody(value, row);
  return { value, literal };
}
function loadCapture(dir) {
  const closing = json(path.join(dir, 'raw/closing.json')), run = json(path.join(dir, 'raw/run.json'));
  assert.equal(closing.setupFailure, null, 'SC4_NO_SETUP_FAILURE');
  assert.equal(closing.schema, 'gzip-full-literal-json-v1');
  assert.equal(run.sameWholeRepeatedProjection, true, 'SC4_HEALTHY_REPLAY');
  assert.equal(run.privateForkTapeCaptured, false);
  assert.equal(run.allFramesAreCompleteCodecStates, true);
  assert.equal(run.selectedSeed, spec.original.selectedSeed, 'SC4_FROZEN_MEASURED_SEED');
  assert.equal(closing.selectedSeed, run.selectedSeed);
  assert.deepEqual(run.attempts.map(a => a.seed), [spec.original.selectedSeed], 'SC4_SAME_ACTUAL_ATTEMPT_CENSUS');
  assert.equal(run.attempts[0].reached, true);
  assert.deepEqual(closing.attempts, run.attempts);
  assert.deepEqual(run.expectedCaseFiles, spec.cases.map(c => c.file));
  const wanted = spec.original.records.map(row => row.file).sort();
  assert.deepEqual(closing.records.map(row => row.file).sort(), wanted, 'SC4_FULL_RAW_CENSUS');
  assert.equal(new Set(closing.records.map(row => row.file)).size, wanted.length);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'raw')).sort(), [...wanted.map(f => f + '.gz'),'closing.json','run.json'].sort(), 'SC4_PHYSICAL_RAW_CENSUS');
  let decodedBytes = 0, storedBytes = 0;
  const bodies = new Map(), literals = new Map();
  for (const row of closing.records) {
    assert.equal(row.storedFile, row.file + '.gz');
    assert(!row.file.includes('..') && !path.isAbsolute(row.file), 'SC4_SAFE_RAW_PATH');
    const stored = fs.readFileSync(path.join(dir, 'raw', row.storedFile)), data = decode(stored, row);
    bodies.set(row.file, data.value); literals.set(row.file, data.literal);
    decodedBytes += row.bytes; storedBytes += row.storedBytes;
  }
  assert.equal(closing.decodedBytes, decodedBytes); assert.equal(closing.storedBytes, storedBytes);
  assert(decodedBytes <= spec.limits.decodedBytes && storedBytes <= spec.limits.storedBytes, 'SC4_CAPTURE_BOUNDS');
  const chosen = run.attempts[0], healthy = bodies.get(chosen.file.file), repeated = bodies.get('healthy-repeated-original.json');
  assert.deepEqual(chosen.file, closing.records.find(row => row.file === chosen.file.file), 'SC4_MEASURED_FILE_LINK');
  assert.equal(healthy.seed, run.selectedSeed); assert.equal(healthy.reached, true);
  assert.equal(healthy.state.seasons.at(-1).year, 2019);
  const projection = x => ({ frames: x.frames, priorArrivalWrites: x.priorArrivalWrites, mainDraws: x.mainDraws, mainRngState: x.mainRngState, reached: x.reached });
  assert.equal(JSON.stringify(projection(healthy)), JSON.stringify(projection(repeated)), 'SC4_FULL_REPEAT_CODEC_TAPE');
  for (const c of spec.cases.slice(0,4)) assert.deepEqual(bodies.get(c.file).healthyFile, chosen.file, 'SC4_COMPLETE_RAW_LINK');
  const comparator = json(path.join(dir, 'capture-comparator-control.json')), first = closing.records[0];
  assert.equal(comparator.actualFile, first.file); assert.equal(comparator.bytes, first.bytes);
  assert.equal(comparator.originalSHA, first.sha256); assert.notEqual(comparator.changedSHA, comparator.originalSHA);
  assert.equal(comparator.restoredSHA, comparator.originalSHA); assert.equal(comparator.changed, true);
  assert.equal(comparator.ownedAssertion, 'SC4_LITERAL_GZIP_ROUNDTRIP'); assert.equal(comparator.wholeInverse, true);
  const notes = fs.readFileSync(path.join(dir, 'capture-progress.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(notes.length, closing.records.length * 5 + 1, 'SC4_CAPTURE_JOURNAL_CENSUS');
  assert(notes.length <= (spec.measureSeeds.length + 8) * 5 + 1);
  notes.forEach((note, index) => {
    assert.equal(note.seq, index + 1);
    for (const value of Object.values(note.memory)) assert(Number.isFinite(value) && value >= 0, 'SC4_ACTUAL_MEMORY_NOTE');
  });
  for (const row of closing.records) assert.deepEqual(notes.filter(n => n.name === row.file.slice(0,-5) && n.stage !== 'control').map(n => n.stage),
    ['serialize','serialized','compressed','roundtrip','written'], 'SC4_CAPTURE_STAGE_CENSUS');
  assert.equal(notes.filter(n => n.stage === 'control').length, 1);
  return { closing, run, bodies, literals, decodedBytes, storedBytes };
}
function taps(value, pointer = '', result = []) {
  if (!value || typeof value !== 'object') return result;
  for (const k of ['importDraws','uiDraws','mainDraws'])
    if (Array.isArray(value[k])) result.push({ pointer: pointer + '/' + k, values: value[k] });
  if (Array.isArray(value.frames) && Array.isArray(value.mainDraws))
    result.push({ pointer: pointer + '/frameCheckpoints', values: value.frames.map(f => ({ action: f.action, year: f.year, phase: f.phase, drawsThrough: f.drawsThrough, mainRngState: f.mainRngState })) });
  for (const [k, child] of Object.entries(value)) taps(child, pointer + '/' + k, result);
  return result;
}
function equalTapes(actual, reference, label) {
  assert.deepEqual(taps(actual), taps(reference), 'SC4_ALL_MODULE_UI_GLOBAL_TAPES_AND_FRAME_CHECKPOINTS ' + label);
}
function exactRaw(leftDir, left, rightDir, right, label) {
  assert.deepEqual(left.closing.records.map(r => r.file), right.closing.records.map(r => r.file), label + ' order');
  for (const row of left.closing.records) {
    const wanted = right.closing.records.find(r => r.file === row.file);
    const a = fs.readFileSync(path.join(leftDir,'raw',row.storedFile)), b = fs.readFileSync(path.join(rightDir,'raw',wanted.storedFile));
    same(a,b,label + ' full stored ' + row.file);
    same(left.literals.get(row.file),right.literals.get(row.file),label + ' full literal ' + row.file);
  }
}
function authenticateOriginal() {
  const file = path.join(original, spec.original.inputAuthority.file), bytes = fs.readFileSync(file);
  assert.equal(bytes.length, spec.original.inputAuthority.bytes, 'SC4_ORIGINAL_AUTHORITY_BYTES');
  assert.equal(sha(bytes), spec.original.inputAuthority.sha256, 'SC4_ORIGINAL_AUTHORITY_SHA');
  const authority = JSON.parse(bytes.toString('utf8'));
  assert.equal(authority.qa, spec.original.qa); assert.equal(String(authority.run), spec.original.run);
  assert.equal(authority.parent, spec.bridge.base); assert.equal(authority.tree, spec.bridge.baseTree);
  assert.equal(authority.selectedSeed, spec.original.selectedSeed);
  assert.deepEqual(authority.records, spec.original.records);
  const reference = loadCapture(original);
  assert.deepEqual(reference.closing.records, spec.original.records, 'SC4_ALL_EIGHT_ORIGINAL_RECORDS');
  validateReport(json(path.join(original,'vitest.json')), armFor('reversal'));
  const ui = reference.bodies.get('actual-original-ui-input.json').ui;
  assert.equal(ui.state.historicalArrivals.version,1); assert.deepEqual(ui.state.historicalArrivals.players,[]);
  assert.equal(ui.bytes,authority.inputSources.v1.raw); assert.deepEqual(ui.state,authority.inputSources.v1.state);
  const held = reference.bodies.get('case-5-held-originals.json');
  for (const [key, raw] of [['legacy',held.legacyOne.initialBytes],['opaque',held.opaqueOne.initialBytes],['newer',held.newer.bytes]])
    assert.equal(authority.inputSources[key].raw, raw, 'SC4_ORIGINAL_COMPLETE_INPUT ' + key);
  return { authority, reference };
}
function copiedControl(dir, name, actual, change, check, inverse, marker) {
  const before = JSON.stringify(actual);
  assert.equal(change(actual), true, name + ' actual change');
  assert.notEqual(JSON.stringify(actual), before, name + ' changed full actual copied data');
  let caught; try { check(actual); } catch (e) { caught = e; }
  assert(caught instanceof assert.AssertionError && caught.message.includes(marker), name + ' owned guard');
  inverse(actual); assert.equal(JSON.stringify(actual), before, name + ' entire copied inverse');
  write(path.join(dir,'controls',name+'.json'), { changed:true, ownedAssertion:marker, wholeInverse:true });
}
function admitArm(dir, arm, nativeExit, originalData) {
  checkPins(arm);
  const types = json(path.join(dir,'types-native.json'));
  assert.equal(types.exit,0,'SC4_PROPER_TYPES_BEFORE_TESTS'); assert.equal(types.signal,null); assert.equal(types.error,null);
  assert.deepEqual(types.args,['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.app.json']);
  assert.equal(nativeExit, arm.failed.length ? 1 : 0, 'SC4_ACTUAL_NATIVE_EXIT');
  const logs = fs.readFileSync(path.join(dir,'logs/vitest.stdout'),'utf8') + fs.readFileSync(path.join(dir,'logs/vitest.stderr'),'utf8');
  assert(!/Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection/.test(logs),'SC4_NO_RUNTIME_ERRORS');
  const report = json(path.join(dir,'vitest.json')), cases = validateReport(report,arm);
  const capture = loadCapture(dir), ref = originalData.reference;
  const uiEnvelope = capture.bodies.get('actual-original-ui-input.json'), ui = uiEnvelope.ui;
  assert.equal(ui.state.era,'2005-09'); assert.equal(ui.state.phase,'youth'); assert.equal(ui.state.age,16);
  assert.equal(ui.state.nationality,'Spain'); assert.equal(ui.state.position,'CM');
  assert.equal(ui.state.historicalArrivals.version,arm.uiVersion);
  assert.deepEqual(ui.state.historicalArrivals.players,[]);
  assert.equal(capture.run.originalInputKind, arm.uiVersion === 1 ? 'ACTUAL_CURRENT_V1_UI' : 'ACTUAL_CURRENT_V2_UI');
  assert.equal(capture.run.status, arm.uiVersion === 1 ? 'FULL_ACTUAL_ORIGINAL_INPUTS_BEFORE_ABSENCE_ASSERTIONS' : 'FULL_ACTUAL_CURRENT_INPUTS_BEFORE_BUSINESS_ASSERTIONS');
  for (const row of capture.closing.records) equalTapes(capture.bodies.get(row.file),ref.bodies.get(row.file),row.file);
  const held = capture.bodies.get('case-5-held-originals.json'), oldHeld = ref.bodies.get('case-5-held-originals.json');
  assert.equal(held.actualV1Input.raw,originalData.authority.inputSources.v1.raw);
  assert.deepEqual(held.actualV1Input.state,originalData.authority.inputSources.v1.state);
  if (arm.name !== 'v1-upgrade') same(capture.literals.get('case-5-held-originals.json'),ref.literals.get('case-5-held-originals.json'),'SC4_COMPLETE_HELD_ORIGINAL_RAW');
  else {
    for (const key of Object.keys(oldHeld).filter(k => !['v1One','v1Two'].includes(k)))
      assert.equal(JSON.stringify(held[key]),JSON.stringify(oldHeld[key]),'SC4_V1_FAULT_OTHER_COMPLETE_CHILD_HELD '+key);
    assert.notEqual(JSON.stringify(held.v1One),JSON.stringify(oldHeld.v1One),'SC4_V1_FAULT_CHANGED_ACTUAL_RUN');
  }
  if (arm.name === 'reversal') {
    exactRaw(dir,capture,original,ref,'SC4_REVERSAL_ALL_EIGHT_ORIGINAL_RAW');
    for (const row of spec.failedPrefixAuthority.files) {
      const actual = capture.closing.records.find(r => r.file === row.file);
      assert.equal(actual.sha256,row.sha256,'SC4_OLD_SEVEN_PREFIX_LITERAL'); assert.equal(actual.bytes,row.bytes);
    }
  }
  copiedControl(dir,'actual-case-omission',structuredClone(report),c => { c.testResults[0].assertionResults.pop();return true; },
    c=>validateReport(c,arm),c=>{c.testResults[0].assertionResults.push(report.testResults[0].assertionResults.at(-1));},'SC4_CASE_CENSUS');
  const healthy = capture.bodies.get(capture.run.attempts[0].file.file), healthyRow = capture.closing.records.find(r => r.file===capture.run.attempts[0].file.file);
  copiedControl(dir,'actual-full-frame-omission',structuredClone(healthy),c=>{c.frames.pop();return true;},
    c=>validateBody(c,healthyRow),c=>{c.frames.push(healthy.frames.at(-1));},'SC4_FULL_JOURNEY_CENSUS');
  const tapeCopy=structuredClone(healthy),oldDraw=tapeCopy.mainDraws[0].value;
  copiedControl(dir,'actual-global-draw-change',tapeCopy,c=>{c.mainDraws[0].value=(oldDraw+0.125)%1;return true;},
    c=>equalTapes(c,healthy,'actual copied draw'),c=>{c.mainDraws[0].value=oldDraw;},'SC4_ALL_MODULE_UI_GLOBAL_TAPES_AND_FRAME_CHECKPOINTS');
  const rawBytes=fs.readFileSync(path.join(dir,'raw',healthyRow.storedFile)),beforeBytes=Buffer.from(rawBytes),beforeSHA=sha(rawBytes);
  rawBytes[rawBytes.length-1]^=1;assert(!rawBytes.equals(beforeBytes),'SC4_STORED_CONTROL_CHANGED');
  let storedFailure;try{decode(rawBytes,healthyRow);}catch(error){storedFailure=error;}
  assert(storedFailure instanceof assert.AssertionError&&storedFailure.message.includes('SC4_STORED_RAW_SHA'),'SC4_STORED_CONTROL_OWNED');
  const changedSHA=sha(rawBytes);rawBytes[rawBytes.length-1]^=1;same(rawBytes,beforeBytes,'SC4_STORED_CONTROL_WHOLE_INVERSE');
  write(path.join(dir,'controls/actual-stored-byte-corruption.json'),{changed:true,ownedAssertion:'SC4_STORED_RAW_SHA',wholeInverse:true,beforeSHA,changedSHA,restoredSHA:sha(rawBytes)});
  for (const file of ['types','vitest']) assert.equal(fs.readFileSync(path.join(dir,'transport',file+'.log')).length,0,'SC4_SILENT_OFFLINE '+file);
  const receipt={status:'EXPECTED_ARM_ADMITTED',arm:arm.name,nativeExit,cases,rawFiles:capture.closing.records.length,decodedBytes:capture.decodedBytes,storedBytes:capture.storedBytes,
    allCapturedTapesAndFrameCheckpointsEqualOriginal:true,wholeHeldOriginalRaw:arm.name!=='v1-upgrade',wholeOriginalReversal:arm.name==='reversal',privateForkTapeCaptured:false,
    limits:'Owned source-backed statuses are actual only after this gate. Full changed states/text/codec are retained, not masked. No native/browser/build/public credit.'};
  write(path.join(dir,'admission.json'),receipt); return {capture,receipt};
}
function walk(root) {
  const rows=[];
  const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const f=path.join(dir,entry.name); if(entry.isDirectory())visit(f);else if(entry.isFile()){const b=fs.readFileSync(f);rows.push({file:path.relative(root,f).split(path.sep).join('/'),bytes:b.length,sha256:sha(b)});}
  }};visit(root);return rows;
}
function main() {
  assert.equal(gt(['rev-parse','HEAD^']),spec.candidate.head,'SC4_MEASURED_QA_PARENT');
  assert.equal(gt(['rev-parse','HEAD^^{tree}']),spec.candidate.tree);
  assert.equal(gt(['rev-parse',spec.candidate.head+'^']),spec.candidate.parent);
  assert.equal(gt(['rev-parse',spec.candidate.parent+'^{tree}']),spec.candidate.parentTree);
  assert.equal(gt(['rev-parse',spec.bridge.base+'^{tree}']),spec.bridge.baseTree);
  assert.deepEqual(gt(['diff','--name-only',spec.bridge.base,spec.bridge.head]).split('\n').filter(Boolean).sort(),spec.bridge.paths,'SC4_EXACT_SEVEN_NONRUNTIME_BRIDGE');
  assert.deepEqual(gt(['diff','--name-only',spec.candidate.parent,spec.candidate.head]).split('\n').filter(Boolean).sort(),spec.appFiles.map(r=>r.path).sort(),'SC4_EXACT_FOUR_APP_PATHS');
  assert.equal(gt(['status','--porcelain=v1','--untracked-files=all']),'','SC4_CLEAN_INPUT');
  assert.match(process.env.RUNNER_BLOB??'',/^[a-f0-9]{40}$/,'SC4_BOUND_RUNNER_BLOB');
  assert.equal(blob(fs.readFileSync(SELF)),process.env.RUNNER_BLOB,'SC4_ACTUAL_RUNNER_BLOB');
  assert.equal(process.env.SIM_NETWORK,'offline'); assert.equal(process.env.GIT_NO_LAZY_FETCH,'1');
  assert.equal(fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT).length,0,'SC4_PARENT_OFFLINE_RECEIPT');
  const sourceNames=git(['ls-files','-z']).toString('utf8').split('\0').filter(Boolean);
  const inventory=()=>sourceNames.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const sourceBefore=inventory(),indexBefore=git(['ls-files','--stage','-z']);
  const locks=()=>Object.fromEntries(['package.json','package-lock.json','bun.lock','bun.lockb','yarn.lock','pnpm-lock.yaml'].map(file=>[file,fs.existsSync(file)?sha(fs.readFileSync(file)):null]));
  const locksBefore=locks(),referenceBefore=walk(original);
  const current=new Map(),before=new Map();
  const sourceOut=path.join(out,'source');
  fs.mkdirSync(sourceOut,{recursive:true});
  write(path.join(out,'controller-source-before.json'),sourceBefore);fs.writeFileSync(path.join(out,'controller-index-before.bin'),indexBefore);
  write(path.join(out,'controller-locks-before.json'),locksBefore);write(path.join(out,'original-reference-before.json'),referenceBefore);
  for(const row of spec.appFiles){
    const c=fs.readFileSync(row.path),b=git(['show',spec.candidate.parent+':'+row.path]);
    assert.equal(blob(c),row.current);assert.equal(blob(b),row.before);
    current.set(row.path,c);before.set(row.path,b);
    fs.mkdirSync(path.dirname(path.join(sourceOut,'candidate',row.path)),{recursive:true});
    fs.mkdirSync(path.dirname(path.join(sourceOut,'original',row.path)),{recursive:true});
    fs.writeFileSync(path.join(sourceOut,'candidate',row.path),c);fs.writeFileSync(path.join(sourceOut,'original',row.path),b);
  }
  const originalData=authenticateOriginal();
  fs.copyFileSync(path.join(original,spec.original.inputAuthority.file),path.join(out,'original-input-authority.json'));
  write(path.join(out,'original-reference-authority.json'),spec.original);
  const summary={status:'running',candidate:spec.candidate,original:spec.original,arms:[],privateForkTapeCaptured:false};
  const expectedSource=()=>sourceBefore.map(row=>({...row,sha256:spec.appFiles.some(a=>a.path===row.file)?sha(fs.readFileSync(row.file)):row.sha256}));
  function heldSource(expected,label){
    assert.deepEqual(inventory(),expected,label+' full tracked bodies');
    same(git(['ls-files','--stage','-z']),indexBefore,label+' full index');
    assert.deepEqual(locks(),locksBefore,label+' locks');
    const changed=spec.appFiles.filter(row=>!fs.readFileSync(row.path).equals(current.get(row.path))).map(row=>' M '+row.path).sort();
    assert.deepEqual(git(['status','--porcelain=v1','--untracked-files=all']).toString('utf8').trimEnd().split('\n').filter(Boolean).sort(),changed,label+' exact actual status');
  }
  function native(dir,name,args,extra={}){
    const receipt=path.join(dir,'transport',name+'.log');fs.mkdirSync(path.dirname(receipt),{recursive:true});fs.writeFileSync(receipt,'');
    const result=spawnSync(process.execPath,args,{env:{...process.env,...extra,SIM_NETWORK:'offline',GIT_NO_LAZY_FETCH:'1',SIM_OFFLINE_RECEIPT:receipt,
      NODE_OPTIONS:'--require='+path.resolve('scripts/lib/offlineTransport.cjs')},encoding:'utf8',timeout:name==='types'?180000:650000,maxBuffer:16_000_000});
    fs.mkdirSync(path.join(dir,'logs'),{recursive:true});fs.writeFileSync(path.join(dir,'logs',name+'.stdout'),result.stdout??'');fs.writeFileSync(path.join(dir,'logs',name+'.stderr'),result.stderr??'');
    const row={command:process.execPath,args,exit:result.status,signal:result.signal,error:result.error?.message??null};
    write(path.join(dir,name+'-native.json'),row);
    assert.equal(row.signal,null,name+' signal');assert.equal(row.error,null,name+' setup/transport');
    assert.equal(fs.readFileSync(receipt).length,0,name+' empty actual offline receipt');
    return row;
  }
  let fixed=null;
  try{
    for(const arm of spec.arms){
      for(const row of spec.appFiles)fs.writeFileSync(row.path,arm.source==='original'?before.get(row.path):current.get(row.path));
      let mutation=null;
      if(arm.source==='fault'){
        const f=spec.faults.find(row=>row.name===arm.name),text=current.get(f.path).toString('utf8');
        assert.equal(text.split(f.old).length-1,1,'SC4_ACTUAL_UNIQUE_SOURCE_FAULT');
        const at=text.indexOf(f.old),changed=text.slice(0,at)+f.replacement+text.slice(at+f.old.length);
        assert.notEqual(changed,text,'SC4_EFFECTIVE_SOURCE_CHANGE');
        assert.equal(changed.slice(0,at)+f.old+changed.slice(at+f.replacement.length),text,'SC4_WHOLE_SOURCE_FAULT_INVERSE');
        assert.equal(blob(Buffer.from(changed)),f.afterBlob,'SC4_MEASURED_FAULT_SOURCE_PIN');
        fs.writeFileSync(f.path,changed);
        mutation={...f,changed:true,wholeInverse:true,beforeSHA256:sha(Buffer.from(text)),afterSHA256:sha(Buffer.from(changed))};
      }
      checkPins(arm);
      const expected=expectedSource();heldSource(expected,arm.name+' before');
      const dir=path.join(out,'replay',arm.name);assert(!fs.existsSync(dir),'SC4_FRESH_ARM_OUTPUT');fs.mkdirSync(dir,{recursive:true});
      if(mutation)write(path.join(dir,'physical-source-fault.json'),mutation);
      const types=native(dir,'types',['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.app.json']);
      assert.equal(types.exit,0,'SC4_TYPES_MUST_PASS_BEFORE_VITEST');
      const run=native(dir,'vitest',['node_modules/vitest/vitest.mjs','run',spec.test.path,'--reporter=json','--outputFile='+path.join(dir,'vitest.json'),
        '--maxWorkers=1','--minWorkers=1','--testTimeout=600000'],{
        SC_FOUR_ORIGINAL_OUT:path.join(dir,'raw'),SC_FOUR_ORIGINAL_SPEC:specPath,
        SC_FOUR_ORIGINAL_AUTHORITY:path.join(original,spec.original.inputAuthority.file),SC_FOUR_REFERENCE_RAW:path.join(original,'raw')});
      const reader=native(dir,'reader',[SELF,'--admit','--out',dir,'--spec',specPath,'--original',original,'--arm',arm.name,'--exit-code',String(run.exit)]);
      assert.equal(reader.exit,0,'SC4_ACTUAL_ARM_READER');
      const {capture,receipt}=admitArm(dir,arm,run.exit,originalData);
      assert.equal(fs.readFileSync(path.join(dir,'transport/reader.log')).length,0);
      if(arm.name==='fixed')fixed={dir,closing:capture.closing};
      if(arm.name==='restored'){
        const fixedCapture=loadCapture(fixed.dir);exactRaw(dir,capture,fixed.dir,fixedCapture,'SC4_FIXED_RESTORED_ALL_EIGHT_RAW');
        write(path.join(out,'fixed-restored.json'),{allEightStoredAndLiteralBytesExact:true,records:capture.closing.records});
      }
      heldSource(expected,arm.name+' after');
      summary.arms.push({...receipt,sourceHeld:true,indexHeld:true,locksHeld:true,threeSilentReceipts:true});
      write(path.join(out,'outcomes.json'),summary);
      assert(walk(out).reduce((n,row)=>n+row.bytes,0)<=spec.limits.artifactBytes,'SC4_COMPLETE_OUTPUT_50MB_BOUND');
    }
    assert.equal(summary.arms.length,7,'SC4_EXACT_SEVEN_ARMS');summary.status='SEVEN_ARMS_ADMITTED_PENDING_WORKFLOW_FINAL_HOLDS';
  }catch(error){summary.status='failed';summary.error=String(error);throw error;}
  finally{
    for(const [file,bytes]of current)fs.writeFileSync(file,bytes);
    const sourceAfter=inventory(),indexAfter=git(['ls-files','--stage','-z']),locksAfter=locks(),referenceAfter=walk(original);
    write(path.join(out,'controller-source-after.json'),sourceAfter);fs.writeFileSync(path.join(out,'controller-index-after.bin'),indexAfter);
    write(path.join(out,'controller-locks-after.json'),locksAfter);write(path.join(out,'original-reference-after.json'),referenceAfter);
    assert.deepEqual(sourceAfter,sourceBefore,'SC4_FINALLY_FULL_SOURCE_RESTORE');
    same(indexAfter,indexBefore,'SC4_FINALLY_INDEX_HELD');assert.deepEqual(locksAfter,locksBefore,'SC4_FINALLY_LOCKS_HELD');
    assert.deepEqual(referenceAfter,referenceBefore,'SC4_ALL_ORIGINAL_REFERENCE_BYTES_HELD');
    assert.equal(gt(['status','--porcelain=v1','--untracked-files=all']),'','SC4_FINALLY_CLEAN');
    assert.equal(sha(fs.readFileSync(specPath)),sha(specBytes),'SC4_SPEC_HELD');
    assert.equal(fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT).length,0,'SC4_PARENT_SILENT_RECEIPT');
    summary.finalSourceIndexLocksStatusReferenceHeld=true;write(path.join(out,'outcomes.json'),summary);
  }
  console.log('SC4 seven actual arms: fixed5,whole-original4owned/1held,four physical source faults,restored5; complete RAW/input/tape/source inverses retained.');
}
if(process.argv.includes('--admit')){
  const arm=armFor(arg('--arm')),nativeExit=Number(arg('--exit-code'));
  admitArm(out,arm,nativeExit,authenticateOriginal());
  console.log('SC4 actual arm admitted: '+arm.name);
}else main();
