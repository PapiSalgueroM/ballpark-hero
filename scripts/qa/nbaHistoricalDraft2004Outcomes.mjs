import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const argv = process.argv.slice(2);
assert.equal(argv.length, 4, 'exact --out and --spec');
const options = {};
for (let i = 0; i < argv.length; i += 2) {
  assert(['--out','--spec'].includes(argv[i]) && !(argv[i] in options), 'unique declared option');
  options[argv[i]] = argv[i + 1];
}
const out = path.resolve(options['--out']), specPath = path.resolve(options['--spec']);
const read = p => fs.readFileSync(p);
const json = p => JSON.parse(read(p).toString('utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
const clone = x => JSON.parse(JSON.stringify(x));
const spec = json(specPath), commands = [], results = [];
const write = (relative, data) => {
  const dest = path.join(out, relative); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2) + '\n');
};
const git = args => {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(r.status, 0, 'native git read ' + args.join(' '));
  assert.equal(r.stderr, '', 'silent offline git read');
  return r.stdout;
};
const stripAnsi = text => text.replace(/\x1b\[[0-9;]*m/g, '');
const runtimePattern = /Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection|SIM_OFFLINE_BLOCK|Cannot find module|Failed to resolve import/;
let tracked, indexBefore, statusBefore, originalMap, mutableBuffers, referenceEnvelope, referenceBodies, totalRawBytes = 0, totalStoredRawBytes = 0;
function sourceMap() {
  return Object.fromEntries(tracked.map(file => {
    const b = read(file); return [file, { bytes: b.length, sha256: sha(b), blob: blob(b) }];
  }));
}
function expectedMap(arm) {
  const expected = clone(originalMap);
  if (arm.mutation) {
    const m = arm.mutation, b = Buffer.from(mutableBuffers.get(m.file).toString('utf8').replace(m.old, () => m.new));
    expected[m.file] = { bytes: b.length, sha256: sha(b), blob: blob(b) };
  }
  return expected;
}
function hold(expected, label) {
  assert.equal(git(['ls-files','-z']), tracked.join('\0') + '\0', label + ' tracked inventory');
  assert.equal(git(['ls-files','-s']), indexBefore, label + ' complete index');
  assert.deepEqual(sourceMap(), expected, label + ' complete tracked bytes');
  const changed = Object.keys(expected).filter(file => expected[file].sha256 !== originalMap[file].sha256);
  const status = git(['status','--porcelain=v1','--untracked-files=all']);
  assert.deepEqual(status.split('\n').filter(Boolean), changed.map(file => ' M ' + file).sort(), label + ' exact worktree status');
  assert.equal(sha(read('package-lock.json')), sha(read(path.join(out,'package-lock-before.json'))), label + ' held lock');
  return status;
}
function validateLiteralRecord(row, stored) {
  assert.equal(row.encoding, spec.transport.encoding, 'NBA_2004_LITERAL_ENCODING');
  assert.equal(row.storedFile, row.file + '.gz', 'NBA_2004_LITERAL_STORED_NAME');
  assert.equal(stored.length, row.storedBytes, 'NBA_2004_LITERAL_STORED_BYTES');
  assert.equal(sha(stored), row.storedSHA256, 'NBA_2004_LITERAL_STORED_SHA');
  const literal = gunzipSync(stored, { maxOutputLength: spec.limits.maxDecodedRawBytes });
  assert.equal(literal.length, row.bytes, 'NBA_2004_LITERAL_DECODED_BYTES');
  assert.equal(sha(literal), row.sha256, 'NBA_2004_LITERAL_DECODED_SHA');
  return literal;
}
function rawBody(root, file) {
  const row = json(path.join(root,'closing.json')).records.find(record => record.file === file);
  assert(row, 'NBA_2004_LITERAL_MANIFEST_ENTRY ' + file);
  return validateLiteralRecord(row, read(path.join(root,row.storedFile)));
}
const rawJson = (root, file) => JSON.parse(rawBody(root,file).toString('utf8'));
function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(path.join(dir, entry.name), prefix + entry.name + '/') : [prefix + entry.name]);
}
function child(armDir, name, exe, args, env = {}) {
  const receipt = path.join(armDir, 'transport', name + '.log');
  fs.writeFileSync(receipt, '');
  const r = spawnSync(exe, args, { env: { ...process.env, ...env, SIM_OFFLINE_RECEIPT: receipt },
    encoding: 'utf8', timeout: spec.limits.maxArmTimeoutMs, maxBuffer: 24 * 1024 * 1024 });
  const command = { executable: exe, args, nativeExit: r.status, signal: r.signal ?? null, error: r.error ? String(r.error) : null };
  commands.push({ arm: path.basename(armDir), name, ...command });
  fs.writeFileSync(path.join(armDir,'logs',name + '.stdout.log'), r.stdout ?? '');
  fs.writeFileSync(path.join(armDir,'logs',name + '.stderr.log'), r.stderr ?? '');
  fs.writeFileSync(path.join(armDir,'logs',name + '.exit'), String(r.status) + '\n');
  write('commands.json', commands);
  assert.equal(r.signal, null, name + ' not terminated');
  assert.equal(r.error, undefined, name + ' native execution');
  assert.equal(read(receipt).length, 0, name + ' silent offline receipt');
  assert(!runtimePattern.test((r.stdout ?? '') + (r.stderr ?? '')), name + ' no setup/runtime/transport failure');
  return r;
}
function validateReport(report, arm) {
  const failed = arm.failed;
  assert.equal(report.success, failed.length === 0, 'NBA_2004_OUTCOME_REPORT_STATUS');
  assert.equal(report.testResults?.length, 1, 'NBA_2004_TEST_FILE_CENSUS');
  assert.equal(report.numTotalTests, 5, 'NBA_2004_TEST_CENSUS');
  assert.equal(report.numPassedTests, 5 - failed.length, 'NBA_2004_PASS_CENSUS');
  assert.equal(report.numFailedTests, failed.length, 'NBA_2004_FAULT_CENSUS');
  for (const key of ['numPendingTests','numTodoTests','numRuntimeErrors'])
    if (report[key] !== undefined) assert.equal(report[key], 0, 'NBA_2004_NO_RUNTIME_OR_SKIPS ' + key);
  assert(!report.unhandledErrors?.length, 'NBA_2004_NO_UNHANDLED_ERRORS');
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 5, 'NBA_2004_ASSERTION_CENSUS');
  assert.deepEqual(rows.map(row => row.fullName), spec.cases.map(row => row.name), 'NBA_2004_CASE_NAMES');
  rows.forEach((row, i) => {
    if (!failed.includes(i)) {
      assert.equal(row.status, 'passed', 'declared healthy case ' + i);
      assert.equal(row.failureMessages?.length ?? 0, 0, 'healthy no hidden failure');
    } else {
      assert.equal(row.status, 'failed', 'declared owned case ' + i);
      assert(row.failureMessages?.length > 0, 'actual owned failure text');
      for (const message of row.failureMessages) {
        const text = stripAnsi(message).trim();
        assert(/^AssertionError(?:\s+\[[^\]]+\])?:/.test(text), 'business AssertionError only');
        assert(arm.markers[i].some(marker => text.includes(marker)), 'exact owned fault marker ' + i);
        assert(!/\b(?:TypeError|ReferenceError|SyntaxError|RangeError)\b|Cannot find module|Failed to resolve import|setup failed|beforeAll/i.test(text), 'no setup/runtime ownership');
      }
    }
  });
  return rows;
}
function validateRun(run, pins) {
  assert.equal(run.status, 'ACTUAL_INPUTS_CAPTURED_BEFORE_FEATURE_ASSERTIONS', 'NBA_2004_FULL_INPUT_PROOF');
  assert.equal(run.setupsComplete, true, 'NBA_2004_SETUP_COMPLETE');
  assert.equal(run.noHiddenMarkerOrRealNpcInjected, true, 'NBA_2004_ACTUAL_UI_INPUT');
  assert.deepEqual(run.bootstrap, { file: 'bootstrap.json', retainedColdUi: true }, 'NBA_2004_RETAINED_BOOTSTRAP');
  assert.equal(run.privateForkTapeCaptured, false, 'NBA_2004_HONEST_TAPE_BOUNDARY');
  assert.deepEqual(run.baseline, spec.baseline, 'NBA_2004_CANDIDATE_BASELINE');
  assert.deepEqual(run.sourcePins, pins, 'NBA_2004_ACTUAL_ARM_SOURCE_PINS');
  assert.deepEqual(run.tapeBoundary, spec.tapeBoundary, 'NBA_2004_TAPE_BOUNDARY');
  assert.deepEqual(run.warmPending, { bytes: spec.originalWarmPending.bytes, sha256: spec.originalWarmPending.sha256,
    authority: spec.originalWarmPending.authority }, 'NBA_2004_ORIGINAL_WARM_AUTHORITY');
  const positions = ['PG','SG','SF','PF','C'];
  const keys = spec.quickSeeds.map(seed => 'quick-' + seed + '-' + positions[(seed - 1) % 5]);
  assert.deepEqual(run.allAttempts, keys, 'NBA_2004_BOUNDED_SEED_CENSUS');
  assert.deepEqual(run.caseFiles, spec.cases.map(c => c.raw), 'NBA_2004_FULL_RAW_CENSUS');
  for (const key of ['promotion','loss','starterHold','demotion','G','F','C'])
    assert(keys.includes(run.found[key]), 'NBA_2004_MEASURED_BRANCH ' + key);
  const selected = [...new Set(Object.values(run.found))].sort();
  assert.deepEqual(run.qualification.map(q => q.observed).sort(), selected, 'NBA_2004_OBSERVER_CENSUS');
  assert(run.qualification.every(q => q.equal && q.observedSha256 === q.normalSha256), 'NBA_2004_NORMAL_OBSERVED_EXACT');
}
function projection(journey) {
  return { frames: journey.frames.map(f => ({ action: f.action, raw: f.raw, text: f.text, globalAt: f.globalAt, rngState: f.rngState })),
    globals: journey.globals, classView: journey.classView ? { openerPresent: journey.classView.openerPresent,
      beforeText: journey.classView.before?.text, openedText: journey.classView.opened?.text,
      rows: journey.classView.rows, campText: journey.classView.campText } : null };
}
const addedViewActions = new Set(['OPEN proposed class control','READ complete class UI','BACK class']);
function savedGameplay(j, removeFeature) {
  const frames = j.frames.filter(f => !removeFeature || !addedViewActions.has(f.action)).map(f => {
    let raw = f.raw;
    if(removeFeature && raw) {
      const value = JSON.parse(raw);
      if(value.c) delete value.c.draft2004;
      if(value.prospect) delete value.prospect.draftClassPolicy;
      raw = JSON.stringify(value);
    }
    return {action:f.action,raw,globalAt:f.globalAt,rngState:f.rngState};
  });
  return {frames,globals:j.globals};
}
function validateGameplayPair(actual, original, key) {
  assert.deepEqual(actual,original,'NBA_2004_EVERY_ARM_PROTECTED_GAMEPLAY '+key);
}
function validateEveryArmGameplay(raw, run) {
  const proof = {};
  for(const key of [...run.allAttempts,'road-61-PG','persistence-3-SF']) {
    const actual = savedGameplay(rawJson(raw,path.join('journeys',key+'.json')),true);
    const original = savedGameplay(referenceBodies['raw/journeys/'+key+'.json'],false);
    validateGameplayPair(actual,original,key);
    proof[key] = {originalSha256:sha(JSON.stringify(original)),actualSha256:sha(JSON.stringify(actual)),exact:true};
  }
  return proof;
}
function validateWarmReference(reference) {
  assert.equal(reference.status,'ADMITTED_ORIGINAL_WARM_PENDING_TRACE');
  assert.equal(reference.initial8ReferenceSHA256,spec.originalInputsSha256,'initial8authority stays separate');
  assert.equal(reference.authority.product,'4571ba4ea9545dab5ef70769204034e5163d48d7');
  assert.equal(reference.authority.qa,'7dd497303b1f95c71a124a6c279b4548e877e101');
  assert.equal(reference.authority.run,'42026473502');
  assert.equal(reference.authority.artifact,'13413523617');
  assert.equal(reference.authority.zipSHA256,'7b464e58d10e7c627742f60493d294e4cbf554ea3c9de0c71fe516f3310032f9');
  assert.equal(reference.authority.tarSHA256,'8bcf17f8a92977828835aba9342b85d1d1fd4ccda85dcaf545dd127bc165cc01');
  const encoded=Buffer.from(reference.gzipBase64,'base64');
  assert.equal(encoded.length,reference.gzipBytes);assert.equal(sha(encoded),reference.gzipSHA256);
  const literal=gunzipSync(encoded,{maxOutputLength:spec.limits.maxDecodedRawBytes});
  assert.equal(literal.length,reference.bytes);
  assert.equal(sha(literal),reference.sha256,'NBA_2004_ORIGINAL_WARM_LITERAL_SHA');
  const journey=JSON.parse(literal),input=journey.frames.find(frame=>frame.action==='MOUNT');
  assert.equal(sha(input.raw),referenceEnvelope.frozenInputs.pending.sha256);
  assert.equal(input.rngState,referenceEnvelope.frozenInputs.pending.rngState);
  const at=journey.frames.findIndex(frame=>frame.action==='PENDING real remount');assert(at>=0);
  const frames=journey.frames.slice(at).map(frame=>({action:frame.action,raw:frame.raw,text:frame.text,globalAt:frame.globalAt,rngState:frame.rngState}));
  const projection=Buffer.from(JSON.stringify({frames,globals:journey.globals}));
  assert.equal(frames.length,reference.suffixProjection.frames);assert.equal(journey.globals.length,reference.suffixProjection.globalDraws);
  assert.equal(projection.length,reference.suffixProjection.bytes);assert.equal(sha(projection),reference.suffixProjection.sha256);
  return {bytes:literal.length,sha256:sha(literal),gzipBytes:encoded.length,gzipSHA256:sha(encoded),
    suffixProjection:reference.suffixProjection,authority:reference.authority,sourceFile:reference.sourceFile};
}
function authenticateReferences() {
  const bytes = read(spec.originalInputsFile);
  assert.equal(sha(bytes), spec.originalInputsSha256, 'whole authenticated reference packet');
  referenceEnvelope = JSON.parse(bytes);
  assert.equal(referenceEnvelope.status, 'AUTHENTIC_WHOLE_RAW_FROM_INDEPENDENTLY_ADMITTED_ORIGINAL');
  assert.deepEqual(referenceEnvelope.authority, spec.originalAuthority, 'actual admitted original authority');
  assert.equal(referenceEnvelope.files.length, 8, 'complete eight selected original RAW bodies');
  const refs = {};
  for (const row of referenceEnvelope.files) {
    const b = gunzipSync(Buffer.from(row.gzipBase64, 'base64'));
    assert.equal(b.length, row.bytes); assert.equal(sha(b), row.sha256);
    assert(!refs[row.file], 'unique authentic reference name');
    refs[row.file] = JSON.parse(b.toString('utf8'));
  }
  assert.equal(sha(refs['raw/legacy-full.json'].inputRaw), referenceEnvelope.frozenInputs.professional.sha256);
  assert.equal(sha(refs['raw/journeys/road-61-PG.json'].input.pending.raw), referenceEnvelope.frozenInputs.pending.sha256);
  assert.equal(referenceEnvelope.frozenInputs.professional.rngState, 503953338);
  assert.equal(referenceEnvelope.frozenInputs.pending.rngState, 1831565874);
  referenceBodies = refs;
  const warm=validateWarmReference(spec.originalWarmPending);
  write('original-warm-reference-admission.json',{status:'SEPARATE_ADMITTED_ORIGINAL_WARM_AUTHORITY',...warm,
    initialEightFixtureSha256:spec.originalInputsSha256,initialEightBodiesUntouched:true});
  write('original-reference-admission.json', { authority: referenceEnvelope.authority, fixtureSha256: sha(bytes),
    files: referenceEnvelope.files.map(({gzipBase64,...row}) => row), frozenInputs: referenceEnvelope.frozenInputs,
    boundary: 'Whole admitted RAW bodies. Old professional and pending input strings/checkpoints are loaded verbatim, never generated by stripping a candidate marker.' });
}
function validateRaw(arm, dir, pins) {
  const raw = path.join(dir,'raw');
  assert(!fs.existsSync(path.join(raw,'diagnostic-fallback.json')), 'no retention failure');
  assert(!fs.existsSync(path.join(raw,'setup-diagnostic.json.gz')), 'no setup/input failure');
  const closing = json(path.join(raw,'closing.json'));
  assert.equal(closing.beforeAllFailure, null, 'all real inputs completed');
  assert.equal(closing.restoredCampFunction, true, 'camp passthrough restored');
  assert.equal(closing.restoredJsdomScroll, true, 'jsdom scroll restored');
  const names = closing.records.map(row => row.file);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(closing.records.map(row => row.storedFile)).size, names.length);
  assert.deepEqual(walk(raw).sort(), [...closing.records.map(row => row.storedFile),'closing.json'].sort(), 'every whole RAW gzip body declared');
  let bytes = 0, storedBytes = 0;
  for (const row of closing.records) {
    const stored = read(path.join(raw,row.storedFile));
    const body = validateLiteralRecord(row,stored);
    bytes += body.length; storedBytes += stored.length;
  }
  assert.equal(bytes, closing.rawBytes);
  assert.equal(storedBytes, closing.storedRawBytes);
  assert(bytes <= spec.limits.maxDecodedRawBytes, 'inherited decoded safety bound');
  assert(storedBytes <= spec.limits.maxRawBytes, 'unchanged stored arm retention bound');
  totalRawBytes += bytes; totalStoredRawBytes += storedBytes;
  assert(totalRawBytes <= spec.limits.maxDecodedRawBytes * spec.arms.length, 'bounded decoded total');
  assert(totalStoredRawBytes <= spec.limits.maxTotalRawBytes, 'unchanged stored total retention bound');
  const run = rawJson(raw,'run.json');
  validateRun(run, pins);
  assert.deepEqual(run.records, closing.records.filter(row => row.file !== 'run.json'), 'run complete proof census');
  const reference = rawJson(raw,'authenticated-reference.json');
  assert.deepEqual(reference.authority, spec.originalAuthority);
  assert.equal(reference.fileSha256, spec.originalInputsSha256);
  assert.deepEqual(reference.frozenInputs, referenceEnvelope.frozenInputs);
  assert.deepEqual(reference.warmPending, { authority: spec.originalWarmPending.authority, sourceFile: spec.originalWarmPending.sourceFile,
    bytes: spec.originalWarmPending.bytes, sha256: spec.originalWarmPending.sha256, gzipBytes: spec.originalWarmPending.gzipBytes,
    gzipSHA256: spec.originalWarmPending.gzipSHA256, suffixProjection: spec.originalWarmPending.suffixProjection }, 'separate actual original warm source link');
  for (const row of spec.cases) assert(names.includes(row.raw), 'five RAW cases before assertions');
  const boot = rawJson(raw,'bootstrap.json');
  assert.equal(boot.status, 'ACTUAL_COLD_UI_INITIALIZATION_RETAINED');
  assert.equal(boot.seed, spec.importSeed); assert.equal(boot.noCareerCreated, true);
  assert.equal(boot.noDrawDropped, true); assert.equal(boot.privateForkTapeCaptured, false);
  assert.equal(boot.frames.length, spec.bootstrap.flushes + 2);
  assert(boot.frames.every(frame => frame.raw === '' && frame.save === null), 'real empty create bootstrap');
  assert(boot.frames[0].text.includes('Enter the draft'));
  assert.deepEqual(boot.values, rawJson(raw,'import-global-tape.json').values);
  assert.equal(boot.origins.length, boot.values.length);
  assert(boot.origins.every((row,i) => row.at === i && row.stack.includes('actual global draw origin')));
  for (const key of run.allAttempts) {
    const j = rawJson(raw,path.join('journeys',key + '.json'));
    assert.equal(j.input?.kind, 'ACTUAL_UI_CREATED'); assert.equal(j.input?.noHiddenPolicyInput, true);
    assert.equal(j.input.entered.save.c.year, 2003); assert.equal(j.input.entered.save.c.eraId, 'y2004');
    assert(j.frames.some(frame => frame.action === 'Play the 2004 season'));
    assert(j.frames.some(frame => frame.save?.c?.year === 2005));
    for (const f of j.frames) {
      assert.equal(typeof f.dom, 'string'); assert.equal(typeof f.raw, 'string');
      assert.deepEqual(f.raw ? JSON.parse(f.raw) : null, f.save, 'whole exact parsed save');
      assert(f.globalAt <= j.globals.length);
    }
    assert(j.globals.every(v => typeof v === 'number' && v >= 0 && v < 1));
    for (const c of j.camps) assert.deepEqual(c.draws, j.globals.slice(c.globalStart,c.globalEnd), 'actual global camp slice');
  }
  for (const q of run.qualification) {
    const a = rawJson(raw,path.join('journeys',q.observed + '.json')), b = rawJson(raw,path.join('journeys',q.normal + '.json'));
    assert.equal(a.observedCamp, true); assert.equal(b.observedCamp, false);
    const pa = JSON.stringify(projection(a)), pb = JSON.stringify(projection(b));
    assert.equal(pa, pb, 'strict whole normal-observer projection');
    assert.equal(sha(pa), q.observedSha256); assert.equal(sha(pb), q.normalSha256);
  }
  const legacy = rawJson(raw,'legacy-full.json');
  assert.equal(legacy.inputSource, 'AUTHENTICATED_ORIGINAL');
  assert.equal(sha(legacy.inputRaw), referenceEnvelope.frozenInputs.professional.sha256);
  assert.equal(legacy.inputRngState, referenceEnvelope.frozenInputs.professional.rngState);
  assert.equal(legacy.exact, true);
  assert.equal(JSON.stringify(projection(legacy.one)), JSON.stringify(projection(legacy.two)));
  assert(legacy.one.frames.every(frame => !frame.save?.c || frame.save.c.draft2004 === undefined));
  const loadedPending = legacy.pending.frames.find(frame => frame.action === 'MOUNT');
  assert.equal(sha(loadedPending.raw), referenceEnvelope.frozenInputs.pending.sha256, 'authentic old pending read before action');
  assert.equal(loadedPending.rngState, referenceEnvelope.frozenInputs.pending.rngState, 'actual saved-boundary global checkpoint');
  assert.equal(legacy.other.length, 3);
  const persisted = rawJson(raw,'case-4-persistence.json').journey;
  assert.equal(persisted.faSigned, true);
  assert(persisted.frames.some(frame => frame.action === 'RELOAD actual post-2004 save'));
  assert(persisted.frames.some(frame => frame.action === 'CONFIRM real FA signing'));
  const signed = persisted.frames.find(frame => frame.action === 'NATURAL FA signed complete save');
  assert.equal(signed?.save?.phase, 'season'); assert(signed.save.c.year > 2004);
  const protectedGameplay = validateEveryArmGameplay(raw,run);
  write('arms/'+arm.name+'/protected-gameplay.json',{scope:'Complete actual global tape and saved gameplay against admitted original, with only draft2004/pending policy and three new read-only view actions excluded. DOM/text are not a cross-feature parity claim.',journeys:protectedGameplay});
  return { run, names, bytes, storedBytes, closing, protectedGameplay };
}
function copyControl(name, actual, modify, inverse, validate, marker) {
  const before = JSON.stringify(actual), copy = clone(actual), removed = modify(copy);
  assert.notEqual(JSON.stringify(copy), before, name + ' actual copy changed');
  let error; try { validate(copy); } catch (caught) { error = caught; }
  assert(error?.name === 'AssertionError' && error.message.includes(marker), name + ' same owned validator');
  inverse(copy, removed); assert.equal(JSON.stringify(copy), before, name + ' whole inverse');
  write('controls/' + name + '.json', { changed: true, ownedAssertion: marker,
    actualError: String(error), wholeInverseExact: true, originalSha256: sha(before), inverseSha256: sha(JSON.stringify(copy)) });
}
try {
  assert.equal(process.env.SIM_NETWORK, 'offline'); assert.equal(process.env.GIT_NO_LAZY_FETCH, '1');
  assert.equal(process.env.NODE_OPTIONS, '--require=' + path.resolve('scripts/lib/offlineTransport.cjs'));
  assert.equal(git(['rev-parse','HEAD^']).trim(), spec.baseline.commit);
  assert.equal(git(['rev-parse',spec.baseline.commit + '^{tree}']).trim(), spec.baseline.tree);
  assert.equal(json(path.join(out,'types-passed.json')).command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
  assert.equal(json(path.join(out,'types-passed.json')).exit, 0);
  assert.equal(read(path.join(out,'logs/types.exit')).toString().trim(), '0');
  assert.equal(read(path.join(out,'transport/types.log')).length, 0);
  assert(!fs.existsSync(path.join(out,'arms')), 'fresh arm evidence root');
  tracked = git(['ls-files','-z']).split('\0').filter(Boolean);
  indexBefore = git(['ls-files','-s']); statusBefore = git(['status','--porcelain=v1','--untracked-files=all']);
  assert.equal(statusBefore, '', 'clean original candidate');
  assert.equal(indexBefore, read(path.join(out,'index-before.txt')).toString());
  assert.equal(tracked.join('\0') + '\0', read(path.join(out,'tracked-before.bin')).toString());
  originalMap = sourceMap();
  const initialLedger = read(path.join(out,'source-before.sha256')).toString();
  for (const [file,row] of Object.entries(originalMap))
    assert(initialLedger.includes(row.sha256 + '  ' + file + '\n'), 'workflow whole source match ' + file);
  for (const [file,want] of Object.entries(spec.productPins)) assert.equal(originalMap[file]?.blob,want,'frozen product source ' + file);
  assert.equal(originalMap[spec.testPath]?.blob,spec.testBlob,'frozen five-case test');
  assert.deepEqual(spec.quickSeeds,[1,2,3,5,14]); assert.deepEqual(spec.arms.map(a=>a.name),
    ['fixed','reversal','missing59','shift2004','camp-name','hide-entry','drop-registry','restored']);
  assert.equal(spec.transport.encoding,'gzip-full-literal-json');
  assert.equal(spec.limits.maxRawBytes,12582912,'unchanged stored arm resource bound');
  assert.equal(spec.limits.maxTotalRawBytes,100663296,'unchanged stored total resource bound');
  assert.equal(spec.limits.maxDecodedRawBytes,46137344,'admitted original decoded safety bound');
  assert.equal(spec.limits.maxArtifactBytes,50000000,'unchanged final archive bound');
  assert.equal(spec.expectedClass.length,59);
  assert.equal(new Set(spec.expectedClass.map(row=>row.id)).size,59);
  assert.deepEqual(spec.expectedClass.map(row=>row.pick),Array.from({length:59},(_,i)=>i+1));
  assert.equal(spec.expectedClass.filter(row=>row.dateOfBirth!==null).length,58);
  assert.deepEqual(spec.expectedClass.filter(row=>row.dateOfBirth===null).map(row=>row.pick),[57]);
  authenticateReferences();
  mutableBuffers = new Map([...new Set(spec.arms.flatMap(arm=>arm.mutation?[arm.mutation.file]:[]))].map(file=>[file,read(file)]));
  write('controller-source-before.json',originalMap);
  for (const arm of spec.arms) {
    const dir=path.join(out,'arms',arm.name); fs.mkdirSync(path.join(dir,'logs'),{recursive:true}); fs.mkdirSync(path.join(dir,'transport'));
    hold(originalMap,arm.name+' starting restored candidate');
    let expected=originalMap, mutationProof=null, pendingError;
    try {
      if(arm.mutation) {
        const m=arm.mutation,before=mutableBuffers.get(m.file),text=before.toString('utf8');
        assert.equal(blob(before),m.beforeBlob); assert.equal(text.split(m.old).length,2,'source-unique actual fault');
        const changed=Buffer.from(text.replace(m.old,()=>m.new));
        assert(!changed.equals(before),'fault changed actual source'); assert.equal(blob(changed),m.afterBlob);
        const at=text.indexOf(m.old),changedText=changed.toString('utf8');
        assert.equal(changedText.slice(0,at)+m.old+changedText.slice(at+m.new.length),text,'whole forward/inverse including deletion');
        fs.writeFileSync(m.file,changed); expected=expectedMap(arm);
        mutationProof={file:m.file,beforeBlob:blob(before),afterBlob:blob(changed),changed:true,wholeInverseExact:true,old:m.old,new:m.new};
        write('arms/'+arm.name+'/mutation.json',mutationProof);
      }
      const beforeStatus=hold(expected,arm.name+' before actions');
      write('arms/'+arm.name+'/source-before.json',sourceMap());
      fs.writeFileSync(path.join(dir,'status-before.txt'),beforeStatus);
      const types=child(dir,'types','node_modules/.bin/tsc',['--noEmit','-p','tsconfig.app.json']);
      assert.equal(types.status,0,'actual arm proper app types');
      const r=child(dir,'vitest',process.execPath,['--unhandled-rejections=strict','node_modules/vitest/vitest.mjs','run',spec.testPath,
        '--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+path.join(dir,'vitest.json')],
        {NBA_2004_ORIGINAL_OUT:path.join(dir,'raw'),NBA_2004_ORIGINAL_SPEC:specPath});
      assert.equal(r.status,arm.failed.length?1:0,'actual owned or healthy native exit '+arm.name);
      const pins=Object.fromEntries(Object.keys(spec.productPins).map(file=>[file,expected[file].blob]));
      const rawProof=validateRaw(arm,dir,pins),report=json(path.join(dir,'vitest.json'));
      validateReport(report,arm);
      if(arm.name==='fixed') {
        const reportBefore=sha(read(path.join(dir,'vitest.json'))),runBefore=sha(rawBody(path.join(dir,'raw'),'run.json'));
        copyControl('actual-case-omission',report,c=>c.testResults[0].assertionResults.splice(0,1)[0],
          (c,row)=>c.testResults[0].assertionResults.unshift(row),c=>validateReport(c,arm),'NBA_2004_ASSERTION_CENSUS');
        copyControl('actual-raw-case-omission',rawProof.run,c=>c.caseFiles.pop(),
          (c,row)=>c.caseFiles.push(row),c=>validateRun(c,pins),'NBA_2004_FULL_RAW_CENSUS');
        copyControl('actual-bootstrap-link-omission',rawProof.run,c=>{const v=c.bootstrap;c.bootstrap=undefined;return v;},
          (c,row)=>{c.bootstrap=row;},c=>validateRun(c,pins),'NBA_2004_RETAINED_BOOTSTRAP');
        copyControl('actual-warm-authority-link-omission',rawProof.run,c=>{const prior=c.warmPending;c.warmPending=undefined;return prior;},
          (c,prior)=>{c.warmPending=prior;},c=>validateRun(c,pins),'NBA_2004_ORIGINAL_WARM_AUTHORITY');
        copyControl('actual-warm-literal-sha-corruption',spec.originalWarmPending,c=>{const prior=c.sha256;c.sha256=(prior[0]==='0'?'1':'0')+prior.slice(1);return prior;},
          (c,prior)=>{c.sha256=prior;},validateWarmReference,'NBA_2004_ORIGINAL_WARM_LITERAL_SHA');
        const key=rawProof.run.allAttempts[0],actual=savedGameplay(rawJson(path.join(dir,'raw'),path.join('journeys',key+'.json')),true);
        const original=savedGameplay(referenceBodies['raw/journeys/'+key+'.json'],false);
        copyControl('actual-global-draw-omission',actual,c=>c.globals.pop(),
          (c,row)=>c.globals.push(row),c=>validateGameplayPair(c,original,key),'NBA_2004_EVERY_ARM_PROTECTED_GAMEPLAY');
        copyControl('actual-gameplay-frame-omission',actual,c=>c.frames.pop(),
          (c,row)=>c.frames.push(row),c=>validateGameplayPair(c,original,key),'NBA_2004_EVERY_ARM_PROTECTED_GAMEPLAY');
        const literalRow=rawProof.closing.records.find(row=>row.file==='case-3-camp.json');
        assert(literalRow,'actual full case3 transport row');
        const stored=read(path.join(dir,'raw',literalRow.storedFile)),storedBefore=sha(stored);
        copyControl('actual-stored-byte-corruption',{row:literalRow,storedBase64:stored.toString('base64')},c=>{
          const prior=c.storedBase64,body=Buffer.from(prior,'base64');body[Math.floor(body.length/2)]^=1;c.storedBase64=body.toString('base64');return prior;
        },(c,prior)=>{c.storedBase64=prior;},c=>validateLiteralRecord(c.row,Buffer.from(c.storedBase64,'base64')),'NBA_2004_LITERAL_STORED_SHA');
        copyControl('actual-decoded-sha-corruption',literalRow,c=>{
          const prior=c.sha256;c.sha256=(prior[0]==='0'?'1':'0')+prior.slice(1);return prior;
        },(c,prior)=>{c.sha256=prior;},c=>validateLiteralRecord(c,stored),'NBA_2004_LITERAL_DECODED_SHA');
        assert.equal(sha(read(path.join(dir,'raw',literalRow.storedFile))),storedBefore,'actual full gzip body held');
        assert.equal(sha(read(path.join(dir,'vitest.json'))),reportBefore,'whole actual report held');
        assert.equal(sha(rawBody(path.join(dir,'raw'),'run.json')),runBefore,'whole actual decoded run held');
      }
      if(arm.name==='restored') {
        for(const file of spec.cases.map(c=>c.raw))
          assert(rawBody(path.join(dir,'raw'),file).equals(rawBody(path.join(out,'arms/fixed/raw'),file)),'restored full literal case RAW byte exact '+file);
      }
      const afterStatus=hold(expected,arm.name+' after actual actions');
      write('arms/'+arm.name+'/source-after.json',sourceMap());
      fs.writeFileSync(path.join(dir,'status-after.txt'),afterStatus);
      const result={arm:arm.name,status:'DECLARED_ARM_ADMITTED',nativeExit:r.status,properTypesExit:types.status,
        tests:5,passed:5-arm.failed.length,owned:arm.failed.length,mutation:mutationProof,sourceHeld:true,
        rawFiles:rawProof.names.length,rawBytes:rawProof.bytes,storedRawBytes:rawProof.storedBytes,rawEncoding:spec.transport.encoding,actualReportSha256:sha(read(path.join(dir,'vitest.json'))),
        actualRunSha256:sha(rawBody(path.join(dir,'raw'),'run.json')),globalTapeBoundary:spec.tapeBoundary,
        privateForkTapeCaptured:false,protectedGameplay:rawProof.protectedGameplay};
      results.push(result); write('arms/'+arm.name+'/result.json',result);
      console.log('NBA_2004_ARM_ADMITTED '+arm.name+' '+result.passed+' passed '+result.owned+' owned');
    } catch(error) {
      pendingError=error; write('arms/'+arm.name+'/failure.json',{status:'NOT_ADMITTED',error:String(error),resultsComplete:results.length});
    } finally {
      for(const[file,bytes]of mutableBuffers)fs.writeFileSync(file,bytes);
      const restoredStatus=hold(originalMap,arm.name+' finally restored candidate');
      write('arms/'+arm.name+'/restoration.json',{status:'EXACT_ORIGINAL_CANDIDATE_RESTORED',sourceMapSha256:sha(JSON.stringify(sourceMap())),statusBytes:Buffer.byteLength(restoredStatus)});
    }
    if(pendingError)throw pendingError;
  }
  assert.equal(results.length,8,'all eight actual arms');
  assert.equal(read(path.join(out,'transport/controller.log')).length,0,'controller offline receipt');
  write('qualification.json',{status:'FIVE_CANDIDATE_CASES_AND_SIX_OWNED_SOURCE_FAULTS_ADMITTED',baseline:spec.baseline,
    arms:results.map(({arm,passed,owned,nativeExit,properTypesExit})=>({arm,passed,owned,nativeExit,properTypesExit})),
    totalRawBytes,totalStoredRawBytes,rawEncoding:spec.transport.encoding,authenticatedOriginalFixtureSha256:spec.originalInputsSha256,
    separateWarmOriginal:{authority:spec.originalWarmPending.authority,literalSHA256:spec.originalWarmPending.sha256,suffixProjection:spec.originalWarmPending.suffixProjection},
    fixedRestoredWholeFiveRawExact:true,everyArmOriginalSavedGameplayAndGlobalTapeExact:true,fullSourceIndexStatusLockHeld:true,privateForkTapeCaptured:false,
    limits:'Finite jsdom UI/public-phase proof with global-only tapes. No build, native, all-private-fork, complete NBA history or public qualification.'});
  console.log('NBA_2004_OUTCOMES_ADMITTED: fixed5, reversal4owned1held, six effective source faults, restored5; authenticated old inputs and complete global-only tapes.');
} catch(error) {
  write('qualification.json',{status:'NOT_ADMITTED',error:String(error),completed:results.map(r=>r.arm),fullProof:false});
  console.error(error); process.exitCode=1;
} finally {
  if(mutableBuffers)for(const[file,bytes]of mutableBuffers)fs.writeFileSync(file,bytes);
  if(originalMap) {
    try {
      hold(originalMap,'outer finally');
      write('controller-source-after.json',sourceMap());
      write('restoration.json',{status:'EXACT_CANDIDATE_BYTES_RESTORED',sourceHeld:true,indexHeld:true,lockHeld:true,statusHeld:true});
    } catch(error) {write('restoration.json',{status:'RESTORATION_FAILED',error:String(error)});console.error(error);process.exitCode=1;}
  }
  write('commands.json',commands);
}
