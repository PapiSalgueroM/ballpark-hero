import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
assert.equal(args.length, 6, 'expected --out --spec --exit-code');
const options = {};
for (let i = 0; i < args.length; i += 2) {
  assert(['--out','--spec','--exit-code'].includes(args[i]) && !(args[i] in options), 'exact reader options');
  options[args[i]] = args[i + 1];
}
const out = path.resolve(options['--out']);
const raw = path.join(out, 'raw');
const specPath = path.resolve(options['--spec']);
const nativeExit = Number(options['--exit-code']);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
const read = p => fs.readFileSync(p);
const json = p => JSON.parse(read(p).toString('utf8'));
const clone = x => JSON.parse(JSON.stringify(x));
const spec = json(specPath);
const write = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + '\n');
const git = argv => {
  const r = spawnSync('git', argv, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.equal(r.status, 0, 'native git read ' + argv.join(' '));
  assert.equal(r.stderr, '', 'silent offline git read');
  return r.stdout;
};
const stripAnsi = s => s.replace(/\x1b\[[0-9;]*m/g, '');
function validateReport(report) {
  assert.equal(report.success, false, 'NBA_2004_ORIGINAL_REPORT_STATUS');
  assert.equal(report.testResults?.length, 1, 'NBA_2004_TEST_FILE_CENSUS');
  assert.equal(report.numTotalTests, 5, 'NBA_2004_TEST_CENSUS');
  assert.equal(report.numPassedTests, 1, 'NBA_2004_HELD_CENSUS');
  assert.equal(report.numFailedTests, 4, 'NBA_2004_OWNED_CENSUS');
  for (const field of ['numPendingTests','numTodoTests','numRuntimeErrors']) {
    if (report[field] !== undefined) assert.equal(report[field], 0, 'NBA_2004_NO_RUNTIME_OR_SKIPS ' + field);
  }
  assert(!report.unhandledErrors?.length, 'NBA_2004_NO_UNHANDLED_ERRORS');
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 5, 'NBA_2004_ASSERTION_CENSUS');
  assert.deepEqual(rows.map(r => r.fullName), spec.cases.map(c => c.name), 'NBA_2004_CASE_NAMES');
  rows.forEach((row, i) => {
    const expected = spec.cases[i];
    if (expected.original === 'held') {
      assert.equal(row.status, 'passed', expected.marker + ' original held');
      assert.equal(row.failureMessages?.length ?? 0, 0);
    } else {
      assert.equal(row.status, 'failed', expected.marker + ' original owned');
      assert(row.failureMessages?.length > 0, expected.marker + ' actual failure text');
      for (const message of row.failureMessages) {
        const s = stripAnsi(message).trim();
        assert(/^AssertionError(?:\s+\[[^\]]+\])?:/.test(s), expected.marker + ' must be business AssertionError');
        assert(s.includes(expected.marker), expected.marker + ' owned marker');
        assert(!/\b(?:TypeError|ReferenceError|SyntaxError|RangeError)\b|Cannot find module|Failed to resolve import|setup failed|beforeAll/i.test(s), expected.marker + ' no setup/runtime credit');
      }
    }
  });
  return rows;
}
function validateRun(run) {
  assert.equal(run.status, 'ACTUAL_INPUTS_CAPTURED_BEFORE_FEATURE_ASSERTIONS', 'NBA_2004_FULL_INPUT_PROOF');
  assert.equal(run.setupsComplete, true, 'NBA_2004_SETUP_COMPLETE');
  assert.equal(run.noHiddenMarkerOrRealNpcInjected, true, 'NBA_2004_ACTUAL_UI_INPUT');
  assert.equal(run.privateForkTapeCaptured, false, 'NBA_2004_HONEST_TAPE_BOUNDARY');
  assert.deepEqual(run.baseline, spec.baseline, 'NBA_2004_MEASURED_BASELINE');
  assert.deepEqual(run.sourcePins, spec.sourcePins, 'NBA_2004_INPUT_SOURCE_PINS');
  assert.deepEqual(run.tapeBoundary, spec.tapeBoundary, 'NBA_2004_TAPE_BOUNDARY');
  const positions = ['PG','SG','SF','PF','C'];
  const expectedKeys = spec.quickSeeds.map(seed => 'quick-' + seed + '-' + positions[(seed - 1) % 5]);
  assert.deepEqual(run.allAttempts, expectedKeys, 'NBA_2004_BOUNDED_SEED_CENSUS');
  assert.deepEqual(run.caseFiles, spec.cases.map(c => c.raw), 'NBA_2004_FULL_RAW_CENSUS');
  for (const key of ['promotion','loss','starterHold','G','F','C'])
    assert(expectedKeys.includes(run.found[key]), 'NBA_2004_MEASURED_BRANCH ' + key);
  const selected = [...new Set(Object.values(run.found))].sort();
  assert.deepEqual(run.qualification.map(q => q.observed).sort(), selected, 'NBA_2004_OBSERVER_CENSUS');
  assert(run.qualification.every(q => q.equal && q.observedSha256 === q.normalSha256), 'NBA_2004_NORMAL_OBSERVED_EXACT');
}
function projection(j) {
  return {
    frames: j.frames.map(f => ({ action: f.action, raw: f.raw, text: f.text, globalAt: f.globalAt, rngState: f.rngState })),
    globals: j.globals,
    classView: j.classView ? { openerPresent: j.classView.openerPresent,
      beforeText: j.classView.before?.text, openedText: j.classView.opened?.text } : null,
  };
}
function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? walk(path.join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]);
}
function inverseControl(name, actual, modify, inverse, validator, ownedMarker) {
  const before = JSON.stringify(actual), copy = clone(actual);
  const removed = modify(copy);
  assert.notEqual(JSON.stringify(copy), before, name + ' changed actual data');
  let failure;
  try { validator(copy); } catch (error) { failure = error; }
  assert(failure?.name === 'AssertionError' && failure.message.includes(ownedMarker), name + ' owned assertion');
  inverse(copy, removed);
  assert.equal(JSON.stringify(copy), before, name + ' whole inverse exact');
  fs.mkdirSync(path.join(out, 'controls'), { recursive: true });
  write('controls/' + name + '.json', { changed: true, ownedAssertion: ownedMarker,
    actualError: String(failure), wholeInverseExact: true, originalSha256: sha(before), inverseSha256: sha(JSON.stringify(copy)) });
}
try {
  assert.equal(process.env.SIM_NETWORK, 'offline');
  assert.equal(process.env.GIT_NO_LAZY_FETCH, '1');
  assert.equal(process.env.NODE_OPTIONS, '--require=' + path.resolve('scripts/lib/offlineTransport.cjs'));
  assert.equal(nativeExit, 1, 'actual original native exit');
  assert.equal(json(path.join(out, 'types-passed.json')).command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
  assert.equal(json(path.join(out, 'types-passed.json')).exit, 0);
  assert.equal(read(path.join(out, 'logs/types.exit')).toString().trim(), '0');
  assert.equal(read(path.join(out, 'transport/types.log')).length, 0);
  assert.equal(read(path.join(out, 'transport/vitest.log')).length, 0);
  assert.equal(git(['rev-parse','HEAD^']).trim(), spec.baseline.commit, 'exact measured published parent');
  assert.equal(git(['rev-parse',spec.baseline.commit + '^{tree}']).trim(), spec.baseline.tree);
  assert.equal(git(['status','--porcelain=v1','--untracked-files=all']), '', 'clean current source');
  assert.equal(read(path.join(out, 'status-before.txt')).length, 0);
  const tracked = git(['ls-files','-z']);
  assert.equal(tracked, read(path.join(out, 'tracked-before.bin')).toString('utf8'), 'all tracked paths held');
  assert.equal(git(['ls-files','-s']), read(path.join(out, 'index-before.txt')).toString('utf8'), 'all index held');
  const inventory = tracked.split('\0').filter(Boolean);
  const sourceBefore = read(path.join(out, 'source-before.sha256')).toString('utf8');
  for (const file of inventory) {
    const digest = sha(read(file));
    assert(sourceBefore.includes(digest + '  ' + file + '\n'), 'full source held ' + file);
  }
  for (const [file, want] of Object.entries(spec.sourcePins)) assert.equal(blob(read(file)), want, 'actual pinned source ' + file);
  assert.equal(sha(read('package-lock.json')), sha(read(path.join(out, 'package-lock-before.json'))), 'lock held');
  assert.equal(spec.quickSeeds.length, 60);
  assert.deepEqual(spec.quickSeeds, Array.from({ length: 60 }, (_, i) => i + 1));
  assert.deepEqual([spec.roadSeed,spec.legacySeed,spec.currentSeed,spec.otherSeed], [61,62,63,64]);
  assert.equal(new Set([spec.importSeed,...spec.quickSeeds,spec.roadSeed,spec.legacySeed,spec.currentSeed,spec.otherSeed]).size, 64);
  assert.equal(spec.expectedClass.length, 59);
  assert.equal(new Set(spec.expectedClass.map(r => r.id)).size, 59);
  assert.deepEqual(spec.expectedClass.map(r => r.pick), Array.from({ length: 59 }, (_, i) => i + 1));
  assert.equal(spec.expectedClass.filter(r => r.dateOfBirth !== null).length, 58);
  assert.deepEqual(spec.expectedClass.filter(r => r.dateOfBirth === null).map(r => r.pick), [57]);

  assert(!fs.existsSync(path.join(raw, 'diagnostic-fallback.json')), 'no full-proof retention failure');
  assert(!fs.existsSync(path.join(raw, 'setup-diagnostic.json')), 'no setup/input failure');
  const closing = json(path.join(raw, 'closing.json'));
  assert.equal(closing.beforeAllFailure, null, 'all inputs captured');
  assert.equal(closing.restoredCampFunction, true, 'temporary camp passthrough restored');
  assert.equal(closing.restoredJsdomScroll, true, 'display-only jsdom scroll stub restored');
  const recordNames = closing.records.map(r => r.file);
  assert.equal(new Set(recordNames).size, recordNames.length, 'unique whole RAW files');
  assert.deepEqual(walk(raw).sort(), [...recordNames,'closing.json'].sort(), 'no omitted or unexplained raw file');
  let retained = 0;
  for (const row of closing.records) {
    const b = read(path.join(raw, row.file));
    assert.equal(b.length, row.bytes, 'full RAW bytes ' + row.file);
    assert.equal(sha(b), row.sha256, 'full RAW SHA ' + row.file);
    retained += b.length;
  }
  assert.equal(retained, closing.rawBytes);
  assert(retained <= spec.limits.maxRawBytes, 'bounded complete raw evidence');
  const runBuf = read(path.join(raw, 'run.json')), run = JSON.parse(runBuf);
  validateRun(run);
  const closingWithoutRun = closing.records.filter(r => r.file !== 'run.json');
  assert.deepEqual(run.records, closingWithoutRun, 'run whole proof inventory');
  for (const file of spec.cases.map(c => c.raw)) assert(recordNames.includes(file), 'actual RAW before assertions ' + file);

  const search = run.allAttempts.map(key => json(path.join(raw, 'journeys/' + key + '.json')));
  for (let i = 0; i < search.length; i++) {
    const j = search[i];
    assert.equal(j.seed, spec.quickSeeds[i]);
    assert.equal(j.input?.kind, 'ACTUAL_UI_CREATED');
    assert.equal(j.input?.noHiddenPolicyInput, true);
    assert.equal(j.input?.entered?.save?.c?.year, 2003);
    assert.equal(j.input?.entered?.save?.c?.eraId, 'y2004');
    assert(j.frames.some(f => f.action === 'Play the 2004 season'), 'real annual action ' + j.key);
    assert(j.frames.some(f => f.save?.c?.year === 2005), 'actual 2004 annual outcome ' + j.key);
    assert(j.globals.every(v => typeof v === 'number' && v >= 0 && v < 1));
    for (const f of j.frames) {
      assert.equal(typeof f.dom, 'string'); assert.equal(typeof f.raw, 'string');
      assert.deepEqual(f.raw ? JSON.parse(f.raw) : null, f.save, 'full exact parsed save');
      assert(f.globalAt <= j.globals.length);
    }
    for (const camp of j.camps) assert.deepEqual(camp.draws, j.globals.slice(camp.globalStart,camp.globalEnd), 'actual camp global slice');
  }
  for (const q of run.qualification) {
    const observed = json(path.join(raw, 'journeys/' + q.observed + '.json'));
    const normal = json(path.join(raw, 'journeys/' + q.normal + '.json'));
    assert.equal(observed.observedCamp, true); assert.equal(normal.observedCamp, false);
    const a = JSON.stringify(projection(observed)), b = JSON.stringify(projection(normal));
    assert.equal(a, b, 'actual normal-versus-observed complete save/text/global frames');
    assert.equal(sha(a), q.observedSha256); assert.equal(sha(b), q.normalSha256);
  }
  const selected = Object.fromEntries(Object.entries(run.found).map(([key,id]) =>
    [key,json(path.join(raw,'journeys/'+id+'.json'))]));
  for (const [kind,j] of Object.entries(selected)) {
    const camps = j.camps.filter(c => c.before.year === 2004);
    assert(camps.length > 0, 'actual healthy 2004 camp ' + kind);
    if (kind === 'promotion') assert(camps.some(c => c.before.role === 'backup' && c.after.role === 'starter'));
    if (kind === 'loss') assert(camps.some(c => c.after.role === 'backup'));
    if (kind === 'starterHold') assert(camps.some(c => c.before.role === 'starter' && c.after.role === 'starter'));
    if (['G','F','C'].includes(kind)) assert(camps.some(c =>
      (c.before.pos === 'C' ? 'C' : ['PG','SG'].includes(c.before.pos) ? 'G' : 'F') === kind));
  }
  const legacy = json(path.join(raw,'legacy-full.json'));
  assert.equal(legacy.exact,true);
  assert.equal(JSON.stringify(projection(legacy.one)),JSON.stringify(projection(legacy.two)), 'independent original legacy replay');
  assert(legacy.one.frames.every(f => !f.save?.c || f.save.c.draft2004 === undefined));
  assert.equal(legacy.other.length,3);
  const persisted = json(path.join(raw,'case-4-persistence.json')).journey;
  assert.equal(persisted.faSigned,true);
  assert(persisted.frames.some(f => f.action === 'RELOAD actual post-2004 save'));
  assert(persisted.frames.some(f => f.action === 'CONFIRM real FA signing'));
  const signed = persisted.frames.find(f => f.action === 'NATURAL FA signed complete save');
  assert.equal(signed?.save?.phase,'season');
  assert(signed.save.c.year > 2004);

  const reportBuf = read(path.join(out,'vitest.json')), report = JSON.parse(reportBuf);
  validateReport(report);
  const logs = read(path.join(out,'logs/vitest.stdout.log')).toString() + read(path.join(out,'logs/vitest.stderr.log')).toString();
  assert(!/Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection|SIM_OFFLINE_BLOCK|Cannot find module|Failed to resolve import/.test(logs), 'no hidden runtime/setup/transport failure');
  inverseControl('actual-case-omission',report,c => c.testResults[0].assertionResults.splice(0,1)[0],
    (c,row) => c.testResults[0].assertionResults.unshift(row),validateReport,'NBA_2004_ASSERTION_CENSUS');
  inverseControl('actual-raw-case-omission',run,c => c.caseFiles.pop(),
    (c,row) => c.caseFiles.push(row),validateRun,'NBA_2004_FULL_RAW_CENSUS');
  assert.equal(sha(read(path.join(out,'vitest.json'))),sha(reportBuf), 'actual report unchanged');
  assert.equal(sha(read(path.join(raw,'run.json'))),sha(runBuf), 'actual raw manifest unchanged');
  write('qualification.json',{
    status:'ORIGINAL_INPUTS_AND_4_OWNED_1_HELD_ADMITTED',
    nativeExit,tests:5,ownedBusinessAssertions:4,held:1,setupErrors:0,
    inputSeeds:64,quickAttempts:60,rawFiles:recordNames.length,rawBytes:retained,
    found:run.found,observerQualifications:run.qualification,
    globalTapeBoundary:spec.tapeBoundary,privateForkTapeCaptured:false,
    noHiddenMarkerOrRealNpcInjected:true,sourceBeforeHeld:true,indexHeld:true,lockHeld:true,
    actualReportSha256:sha(reportBuf),actualRunSha256:sha(runBuf),
    controls:['actual-case-omission','actual-raw-case-omission'],
    limits:'Input measurement and feature-absence proof only. Not fixed-product, all-private-RNG, native, build or public feature credit.',
  });
  console.log('NBA_2004_ORIGINAL_ADMITTED: 60 actual quick UI attempts, 64 seed domain, healthy2004 camps, 4 owned business assertions plus1 held; global-only tapes.');
} catch (error) {
  write('reader-diagnostic.json',{status:'NOT_ADMITTED',error:String(error),nativeExit,
    fullProof:false,scope:'actual failure retained, no missing-module/setup failure counted as owned'});
  console.error(error);
  process.exitCode = 1;
}
