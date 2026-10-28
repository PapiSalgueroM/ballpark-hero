import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';

assert.equal(process.env.CI, '1', 'Remote qualification only');
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_RECRUITMENT_OUT || 'cm-recruitment-qualification-artifacts/proof');
const BASE = '14ec28b1cbc82b1abcdf14244dec7acae25d1507';
const BRANCH = 'codex/cm-recruitment-shortlist-fixed-20261028';
const MANIFEST = 'qa/cm-recruitment-shortlist-v1/SOURCE-READY.json';
const FAULTS = 'qa/cm-recruitment-shortlist-v1/PHYSICAL-FAULTS.json';
const REFERENCE = 'qa/cm-recruitment-shortlist-v1/legacy-unit-identities.json.gz';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = value => createHash('sha1').update('blob ' + value.length + '\0').update(value).digest('hex');
const plain = value => String(value).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
const expected = [
  {
    "prefix": "Club Manager current recruitment identities and explicit metadata writes",
    "titles": [
      "stores only current identity and context while keeping every existing field and all draws",
      "admits12 targets in order, rejects the13th and makes a duplicate at capacity a no-op",
      "removes an unavailable target and restores exact original bytes after the last removal",
      "reads absent and malformed metadata without changing a byte or consuming a draw",
      "rejects each changed club era start-year and seed context including same-club foreign-era data",
      "an explicit Add replaces foreign metadata with the current context, with no other change",
      "an actual keyed target follows its exact key across a club move and reads updated facts",
      "a missing stable key never falls back to a same-name same-cohort replacement",
      "legacy matching keeps the original club and game cohort, refuses ambiguity and does not follow namesakes",
      "refuses a supplied nonexistent key before adding any metadata",
      "duplicate legacy and keyed views of the same current row do not create two targets"
    ],
    "path": "src/test/clubManagerRecruitment.test.ts"
  },
  {
    "prefix": "Club Manager recruitment shortlist first behavior baseline",
    "titles": [
      "adds a current Buy row without starting talks or changing any old career field",
      "opens an empty shortlist while the transfer window is shut without writing",
      "reopens a saved identity using the current record and leaves saved bytes unchanged",
      "does not present a same-club target copied from another era as current or repair it on read",
      "preserves the ordinary Talk callback with the exact existing current player object",
      "ordinary rendering and a no-match search preserve input bytes and consume no random draws"
    ],
    "path": "src/test/clubManagerRecruitmentBaseline.test.tsx"
  },
  {
    "prefix": "actual recruitment board and ordinary Buy return",
    "titles": [
      "shows the supplied current record, existing primary-position peers and no persisted price",
      "keeps closed-window facts readable, disables Find and removes only explicit metadata",
      "Find passes only the current row and makes no write or random draw",
      "an unavailable target cannot be found but remains removable",
      "a refused Remove retains the target and reports a save failure without a success claim",
      "an explicit Save arrival commits only once through StrictMode effect replay",
      "a delayed Save arrival from a replaced career refuses rather than changing the new career",
      "help and its Back preserve the list and return focus to the actual help opener",
      "the real transfer screen returns Find to ordinary Buy search without talking paying or loaning",
      "shows twelve saved targets as compact View tiles and opens only one current detail before Back with no write or draw"
    ],
    "path": "src/test/clubManagerRecruitmentBoard.test.tsx"
  },
  {
    "prefix": "recruitment through the actual saved Club Manager hook",
    "titles": [
      "leaves old careers without metadata and refuses null or identity transforms without a write",
      "commits once outside updater replay, persists first and preserves every old field and draw",
      "keeps memory, disk and the unmount writer unchanged after both quota attempts refuse",
      "retains metadata through a genuine lean retry and actual parked-slot roundtrip",
      "reserves the committed career so the same captured add cannot publish twice in one event",
      "refuses outside the actual hub before invoking a proposed metadata transform",
      "refuses a retained hub callback after a phase-only move to the managers screen",
      "does not overwrite the manager another slot has made active",
      "refuses a newer same-slot save fence without invoking or publishing a transform",
      "makes an old callback validate its captured origin against the latest committed career",
      "invalidates the actual writer on unmount before a delayed add can run"
    ],
    "path": "src/test/clubManagerRecruitmentHook.test.tsx"
  }
];
const manifestRaw = fs.readFileSync(MANIFEST);
assert.equal(sha(manifestRaw), '0a5d3d71315f35ab3426a60e1460cc42b21a5523ef97626e7640b0b9c1605ed0');
const manifest = JSON.parse(manifestRaw);
const faultsRaw = fs.readFileSync(FAULTS);
assert.equal(sha(faultsRaw), '10ad5e4f281587081e755a24b3c589cc750e70f8c149e4af2e3ba490c92a622b');
const faults = JSON.parse(faultsRaw).faults;
assert.equal(faults.length, 10);
const held = {
  'src/lib/clubManager.ts': 'a505743537b383bc7885bb81f5a72c11e154b566',
  'src/lib/clubManagerDeals.ts': '6e62966e4950ac6e2fa0577f45d21527b9266ce6',
  'src/lib/clubManagerLoanDevelopment.ts': '98265b3e10752b671127c1b23d6725d83d28e47b',
  'src/lib/clubManagerLoanPlan.ts': '419b68389dad53c297d1a225611a653c0ed83b30',
  'src/components/club-manager/LoanPlanCard.tsx': 'b7b713399752fd97a5b27174108f2488d85bd037'
};
const allowed = [...manifest.files.map(file => file.path), MANIFEST, FAULTS, REFERENCE,
  'scripts/qa/cmRecruitmentFocused.mjs', 'scripts/qa/cmRecruitmentQualification.mjs',
  'scripts/qa/cmRecruitmentPairs.mjs', '.github/workflows/cm-recruitment-shortlist-fixed.yml'].sort();
fs.mkdirSync(OUT, { recursive: true });
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const pins = [];
for (const file of manifest.files) {
  const raw = fs.readFileSync(file.path);
  assert.equal(raw.length, file.bytes, 'Selected bytes ' + file.path);
  assert.equal(sha(raw), file.sha256, 'Selected SHA ' + file.path);
  assert.equal(git(raw), file.gitBlob, 'Selected Git body ' + file.path);
  pins.push({ path: file.path, bytes: raw.length, sha256: sha(raw), git: git(raw) });
}
assert.equal(pins.length, 9);
for (const [file, pin] of Object.entries(held)) {
  const raw = fs.readFileSync(file); assert.equal(git(raw), pin, 'Held engine/Loan body ' + file);
  pins.push({ path: file, bytes: raw.length, sha256: sha(raw), git: pin });
}
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), process.env.GITHUB_SHA);
assert.equal(process.env.GITHUB_REF_NAME, BRANCH);
execFileSync('git', ['merge-base', '--is-ancestor', BASE, 'HEAD']);
const changed = execFileSync('git', ['diff', '--name-only', BASE, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed, allowed, 'Only owned product/tests and qualification sources');
write(path.join(OUT, 'selected-source-pins.json'), { base: BASE, head: process.env.GITHUB_SHA, pins, changed });
const fullName = (file, title) => {
  const found = expected.find(row => row.path === file);
  assert(found && found.titles.includes(title), 'Declared actual case identity');
  return found.prefix + ' ' + title;
};
const noInfrastructure = (value, log) => {
  for (const suite of value.testResults) {
    assert.equal(typeof suite.message, 'string', 'Actual suite diagnostic field');
    assert.equal(suite.message, '', 'NO_SUITE_DIAGNOSTICS');
  }
  assert(!/Failed Suites|Unhandled Errors|Vitest caught\s+\d+\s+unhandled|UnhandledRejection|UncaughtException|^\s*Errors\s+\d+\s+errors?|No test files found/mi.test(plain(log)), 'NO_CLI_INFRASTRUCTURE');
};
function focused(value, log, report, fault) {
  noInfrastructure(value, log);
  assert.equal(value.numTotalTests, 38); assert.equal(value.numTodoTests, 0);
  assert.equal(value.numPassedTests, fault ? 1 : 38);
  assert.equal(value.numFailedTests, fault ? 1 : 0);
  assert.equal(value.numPendingTests, fault ? 36 : 0);
  assert.equal(value.success, !fault);
  assert(Array.isArray(value.testResults) && value.testResults.length === 4);
  const all = [];
  for (const target of expected) {
    const suites = value.testResults.filter(suite => suite.name.replaceAll('\\', '/').endsWith('/' + target.path));
    assert.equal(suites.length, 1, 'One actual focused file');
    const suite = suites[0], rows = suite.assertionResults;
    assert.equal(rows.length, target.titles.length);
    assert.deepEqual(rows.map(row => row.fullName).sort(), target.titles.map(title => target.prefix + ' ' + title).sort(), 'Exact all38 identities');
    if (!fault) assert.equal(suite.status, 'passed', 'Healthy file passed');
    for (const row of rows) {
      const targetName = fault && fullName(fault.test, fault.target);
      const healthyName = fault && fullName(fault.healthyTest, fault.healthy);
      const status = !fault || row.fullName === healthyName ? 'passed' : row.fullName === targetName ? 'failed' : 'skipped';
      assert.equal(row.status, status, 'Exact fault/healthy/unselected status ' + row.fullName);
      assert(Array.isArray(row.failureMessages));
      if (status !== 'failed') assert.equal(row.failureMessages.length, 0, 'No independent/method errors');
      else {
        assert(row.failureMessages.length > 0, 'Actual targeted assertion failure');
        for (const raw of row.failureMessages) {
          const message = plain(raw);
          const assertion = /AssertionError|Error:\s*expect\(/.test(message);
          const exactMissingPrice = fault.id === 'current-price' && /TestingLibraryElementError: Unable to find an element with the text:/.test(message);
          assert(assertion || exactMissingPrice, 'TARGET_ASSERTION_OR_DECLARED_PRICE_QUERY_ONLY');
          assert(!/Cannot find module|Failed to resolve|ReferenceError|TypeError|timed out|Invalid Chai property|Invariant violation/.test(message), 'NO_TARGET_METHOD_ERRORS');
        }
      }
      all.push({file: target.path, name: row.fullName, status: row.status});
    }
  }
  assert.equal(all.length, 38); assert.equal(new Set(all.map(row => row.name)).size, 38);
  const clean = plain(log), files = clean.match(/^\s*Test Files[^\n]*\(4\)\s*$/gm) || [];
  assert.equal(files.length, 1, 'Complete actual four-file closing');
  if (fault) {
    assert(/^\s*Tests\s+1 failed\s*\|\s*1 passed\s*\|\s*36 skipped\s+\(38\)\s*$/m.test(clean), 'Complete actual control case closing');
  } else {
    assert.equal(value.numFailedTestSuites, 0);
    assert(/^\s*Test Files\s+4 passed\s+\(4\)\s*$/m.test(clean), 'Complete healthy file closing');
    assert(/^\s*Tests\s+38 passed\s+\(38\)\s*$/m.test(clean), 'Complete healthy case closing');
  }
  assert(clean.includes('JSON report written to ' + report), 'Actual JSON-written closing');
  return {total:38, passed:fault ? 1 : 38, failed:fault ? 1 : 0, skipped:fault ? 36 : 0};
}
function runFocused(cwd, label, fault) {
  const dir = path.join(OUT, label); fs.mkdirSync(dir, {recursive:true});
  const report = path.join(dir, 'units.json'), log = path.join(dir, 'units.log');
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...expected.map(row => row.path),
    '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + report];
  if (fault) {
    const escape = text => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    args.push('--testNamePattern=^(?:' + escape(fullName(fault.test, fault.target)) + '|' + escape(fullName(fault.healthyTest, fault.healthy)) + ')$');
  }
  const fd = fs.openSync(log, 'w'); let child;
  try { child = spawnSync(process.execPath, args, {cwd, env:{...process.env}, stdio:['ignore',fd,fd], timeout:360_000}); }
  finally { fs.closeSync(fd); }
  write(path.join(dir, 'process.json'), {status:child.status, signal:child.signal, error:child.error ? String(child.error) : null, cwd, args});
  assert.ifError(child.error); assert.equal(child.signal, null);
  assert.equal(child.status, fault ? 1 : 0, 'Actual intended process outcome');
  const raw = fs.readFileSync(report), text = fs.readFileSync(log, 'utf8'), value = JSON.parse(raw);
  const actual = focused(value, text, report, fault);
  return {actual, raw, text, value, report};
}
function controls() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-recruitment-controls-'));
  const archive = path.join(OUT, 'controlled-source.tar');
  const fd = fs.openSync(archive, 'w');
  try { execFileSync('git', ['archive', '--format=tar', 'HEAD'], {stdio:['ignore',fd,'inherit']}); } finally { fs.closeSync(fd); }
  execFileSync('tar', ['-xf', archive, '-C', work]);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(work, 'node_modules'), 'dir');
  const tracked = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
  const before = Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(path.join(work,file)))]));
  for (const file of tracked) assert.equal(before[file], sha(fs.readFileSync(file)), 'Controlled copy complete original source');
  write(path.join(OUT, 'controlled-before.json'), before);
  const healthy = runFocused(work, 'healthy');
  const diagnostics = [];
  for (const kind of ['suite-message', 'failed-suites-cli', 'unhandled-cli']) {
    const copy = structuredClone(healthy.value); let log = healthy.text, guard;
    if (kind === 'suite-message') { copy.testResults[0].message = 'COPIED QA suite diagnostic'; guard = /NO_SUITE_DIAGNOSTICS/; }
    if (kind === 'failed-suites-cli') { log += '\n\u001b[31mFailed Suites 1\u001b[0m\n'; guard = /NO_CLI_INFRASTRUCTURE/; }
    if (kind === 'unhandled-cli') { log += '\nVitest caught 1 unhandled error during the test run.\n'; guard = /NO_CLI_INFRASTRUCTURE/; }
    assert(JSON.stringify(copy) !== JSON.stringify(healthy.value) || log !== healthy.text, 'Changed copied diagnostic');
    const dir = path.join(OUT, 'copied-diagnostics', kind); fs.mkdirSync(dir,{recursive:true});
    write(path.join(dir,'units.json'),copy); fs.writeFileSync(path.join(dir,'units.log'),log);
    assert.throws(() => focused(copy,log,healthy.report),guard);
    assert.deepEqual(focused(JSON.parse(healthy.raw),healthy.text,healthy.report),healthy.actual);
    diagnostics.push({kind,copiedOnly:true,changed:true,rejected:true,originalReadmitted:true});
  }
  const results = [];
  try {
    for (const fault of faults) {
      const file = path.join(work,fault.path), original = fs.readFileSync(file,'utf8'), originalRaw = Buffer.from(original);
      assert.equal(sha(originalRaw),fault.sourceSha256,'Exact controlled source pin');
      assert.equal(original.split(fault.before).length-1,1,'Unique physical source anchor');
      const changed = original.replace(fault.before,fault.after);
      assert.notEqual(changed,original,'Physical source bytes changed');
      const dir = path.join(OUT,'faults',fault.id);fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'original.source'),originalRaw);fs.writeFileSync(path.join(dir,'changed.source'),changed);
      write(path.join(dir,'source.json'),{path:fault.path,before:sha(originalRaw),changed:sha(changed),target:fullName(fault.test,fault.target),independent:fullName(fault.healthyTest,fault.healthy),controlledCopy:work});
      let outcome;
      try { fs.writeFileSync(file,changed); outcome=runFocused(work,'faults/'+fault.id+'/changed',fault); }
      finally { fs.writeFileSync(file,originalRaw); assert.equal(sha(fs.readFileSync(file)),sha(originalRaw),'Exact same-copy physical restore');fs.writeFileSync(path.join(dir,'restored.source'),fs.readFileSync(file)); }
      if (fault.id === 'cap') {
        const copied = structuredClone(outcome.value);
        const row = copied.testResults.flatMap(suite => suite.assertionResults).find(row => row.fullName === fullName(fault.test, fault.target));
        row.failureMessages = ['AssertionError: TypeError: COPIED QA method failure'];
        const copiedDir = path.join(OUT, 'copied-diagnostics', 'method-error');
        fs.mkdirSync(copiedDir, {recursive:true}); write(path.join(copiedDir, 'units.json'), copied);
        fs.writeFileSync(path.join(copiedDir, 'units.log'), outcome.text);
        assert.notEqual(JSON.stringify(copied), JSON.stringify(outcome.value), 'Copied method diagnostic changed');
        assert.throws(() => focused(copied, outcome.text, outcome.report, fault), /NO_TARGET_METHOD_ERRORS/);
        assert.deepEqual(focused(JSON.parse(outcome.raw), outcome.text, outcome.report, fault), outcome.actual);
        diagnostics.push({kind:'method-error',copiedOnly:true,changed:true,rejected:true,originalReadmitted:true});
      }
      const restored=runFocused(work,'faults/'+fault.id+'/restored');
      results.push({id:fault.id,sourceChanged:true,targetFailed:outcome.actual.failed===1,independentPassed:outcome.actual.passed===1,unselectedSkipped:36,sourceRestored:true,all38Restored:restored.actual.passed===38});
      write(path.join(OUT,'physical-controls-progress.json'),results);
    }
    assert.equal(results.length,10);
    const after=Object.fromEntries(tracked.map(file=>[file,sha(fs.readFileSync(path.join(work,file)))]));
    assert.deepEqual(after,before,'All controlled source bodies restored');
    write(path.join(OUT,'controlled-after.json'),after);
    write(path.join(OUT,'PROOF-ADMISSION.json'),{status:'38_CASES_AND10_EFFECTIVE_PHYSICAL_CONTROLS',healthy:healthy.actual,controls:results,copiedDiagnostics:diagnostics,controlledTrackedBodies:tracked.length,limits:'Physical source bodies and real test outcomes establish compilation/behavior effect. No esbuild metafile claim for the Vitest runner. Browser/build/default pairs are separate mandatory gates.'});
    console.log('PASS recruitment proof:38 healthy,10 changed physical target failures with independent passes,10 same-copy38-case restores,4 copied diagnostic refusals/restores');
  } finally { fs.rmSync(work,{recursive:true,force:true}); }
}
function multiset(rows) {
  const map=new Map();for(const row of rows){const key=JSON.stringify(row);map.set(key,(map.get(key)||0)+1);}return [...map].sort(([a],[b])=>a.localeCompare(b));
}
function units() {
  const referenceRaw=fs.readFileSync(REFERENCE);
  assert.equal(sha(referenceRaw),'7683dcf0c68363481fce260efe3f005ef1337de74dbbf95cf5ca2851e435d0b8');
  const reference=JSON.parse(gunzipSync(referenceRaw));
  const skipped=reference.rows.filter(row=>row.status==='skipped').map(row=>[row.file,row.name,row.status]);
  assert.equal(skipped.length,58,'Exact prior58 skip reference, not CM total denominator');
  const report=path.join(OUT,'full-units.json'),log=path.join(OUT,'full-units.log');
  const raw=fs.readFileSync(report),cli=fs.readFileSync(log,'utf8'),value=JSON.parse(raw);
  function admit(value,cli) {
    noInfrastructure(value,cli);assert.equal(value.success,true);assert.equal(value.numFailedTestSuites,0);assert.equal(value.numFailedTests,0);assert.equal(value.numPendingTests,58);assert.equal(value.numTodoTests,0);
    const rows=[];for(const suite of value.testResults){assert(['passed','skipped'].includes(suite.status),'NO_FAILED_FILES');for(const row of suite.assertionResults){assert(['passed','skipped'].includes(row.status));assert.equal(row.failureMessages.length,0);rows.push([suite.name.replaceAll('\\','/').replace(/^.*?\/ballpark-hero\/ballpark-hero\//,''),row.fullName,row.status]);}}
    assert.equal(rows.length,value.numTotalTests);assert.equal(rows.filter(row=>row[2]==='passed').length,value.numPassedTests);
    assert.equal(rows.length,9754,'MEASURED9753_PLUS_ONE_CURRENT_CASE');assert.equal(value.numPassedTests,9696,'CURRENT9696_PASSES');assert.equal(value.testResults.length,655,'UNCHANGED655_TEST_FILES');
    assert.deepEqual(multiset(rows.filter(row=>row[2]==='skipped')),multiset(skipped),'EXACT58_SKIP_IDENTITIES');
    for(const file of expected){const actual=rows.filter(row=>row[0]===file.path);assert.deepEqual(actual.map(row=>[row[1],row[2]]).sort(),file.titles.map(title=>[file.prefix+' '+title,'passed']).sort(),'ALL38_CURRENT_CASES');}
    const clean=plain(cli),fileLines=clean.match(/\bTest Files[^\n]*\((\d+)\)/g)||[],caseLines=clean.match(/\bTests[^\n]*\((\d+)\)/g)||[];
    assert.equal(fileLines.length,1,'ACTUAL_CLI_FILE_CLOSING');assert.equal(caseLines.length,1,'ACTUAL_CLI_CASE_CLOSING');
    assert.equal(Number(fileLines[0].match(/\((\d+)\)/)[1]),value.testResults.length);assert.equal(Number(caseLines[0].match(/\((\d+)\)/)[1]),rows.length);
    assert(clean.includes('JSON report written to '+report),'ACTUAL_JSON_WRITTEN');
    return{total:rows.length,passed:value.numPassedTests,skipped:58,files:value.testResults.length,newCases:38};
  }
  const actual=admit(value,cli),copied=[];
  for(const kind of ['suite-message','failed-suites-cli','skip-identity']){
    const copy=structuredClone(value);let text=cli,guard;
    if(kind==='suite-message'){copy.testResults[0].message='COPIED suite diagnostic';guard=/NO_SUITE_DIAGNOSTICS/;}
    if(kind==='failed-suites-cli'){text+='\n\u001b[31mFailed Suites 1\u001b[0m\n';guard=/NO_CLI_INFRASTRUCTURE/;}
    if(kind==='skip-identity'){const row=copy.testResults.flatMap(suite=>suite.assertionResults).find(row=>row.status==='skipped');row.fullName+=' COPIED_CHANGED_ID';guard=/EXACT58_SKIP_IDENTITIES/;}
    assert(JSON.stringify(copy)!==JSON.stringify(value)||text!==cli);
    const dir=path.join(OUT,'copied-diagnostics',kind);fs.mkdirSync(dir,{recursive:true});write(path.join(dir,'full-units.json'),copy);fs.writeFileSync(path.join(dir,'full-units.log'),text);
    assert.throws(()=>admit(copy,text),guard);assert.deepEqual(admit(JSON.parse(raw),cli),actual);
    copied.push({kind,copiedOnly:true,changed:true,rejected:true,originalReadmitted:true});
  }
  assert.equal(sha(fs.readFileSync(report)),sha(raw));assert.equal(fs.readFileSync(log,'utf8'),cli);
  write(path.join(OUT,'UNIT-ADMISSION.json'),{status:'FRESH_FULL_CURRENT_SUITE_PASS',actual,copiedDiagnostics:copied,priorSkipReference:{head:reference.sourceHead,rawReportSha256:reference.rawReportSha256},limits:'Fresh current whole suite. Prior9755 is used ONLY for58 skipped identities, not as a CM denominator or claimed prior416 full execution. All pre-existing base test source files are unchanged in the bounded source diff.'});
  console.log('PASS fresh entire recruitment source suite with38 current cases and exact58 prior skipped identities');
}
const mode=process.argv[2]||'proof';
if(mode==='proof')controls();
else if(mode==='units')units();
else assert.equal(mode,'source');
for(const pin of pins)assert.equal(sha(fs.readFileSync(pin.path)),pin.sha256,'Canonical critical source held');
write(path.join(OUT,'source-held.json'),{pins,held:true});
