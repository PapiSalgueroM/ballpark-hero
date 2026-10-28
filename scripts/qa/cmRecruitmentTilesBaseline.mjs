import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
assert.equal(process.env.CI,'1','Remote TDD only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.CM_RECRUITMENT_OUT||'cm-recruitment-tiles-red-artifacts');
const BASE='8e884d528391f0f3375d39ebbef971d0358b96a1',BRANCH='codex/cm-recruitment-shortlist-tiles-red-20261028';
const TEST='src/test/clubManagerRecruitmentBoard.test.tsx',SELECTOR='qa/cm-recruitment-shortlist-tiles-v1/TEST-FIRST-SOURCE-READY.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const plain=t=>String(t).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
const originalRaw=fs.readFileSync('qa/cm-recruitment-shortlist-v1/SOURCE-READY.json');
assert.equal(sha(originalRaw),'282b5cf5bc141fc9be92ab7b6f4178f4aef6bc3d50fe7fe0653c7fb8044e590e','Original282b product selector held');
const original=JSON.parse(originalRaw),raw=fs.readFileSync(SELECTOR);
assert.equal(sha(raw),'4b92b99b294f0630f3fe3805e5cd5410721812aa4176c521f56811725a0dd4e5','Frozen one-test TDD override');
const selected=JSON.parse(raw);
assert.equal(selected.path,TEST);assert.equal(selected.baseCommit,BASE);
assert.equal(selected.sha256,'3af188a27874669edec2e6be82322a942c272bfaa1d0647301293e392f84905b');
const expected=[
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
const TARGET='actual recruitment board and ordinary Buy return shows twelve saved targets as compact View tiles and opens only one current detail before Back with no write or draw',MARKER='MISSING_VIEW_TILE';
assert.equal(selected.caseTitle,'shows twelve saved targets as compact View tiles and opens only one current detail before Back with no write or draw');assert.equal(selected.expectedFirstFailure,MARKER);
const held={
'src/lib/clubManager.ts':'a505743537b383bc7885bb81f5a72c11e154b566',
'src/lib/clubManagerDeals.ts':'6e62966e4950ac6e2fa0577f45d21527b9266ce6',
'src/lib/clubManagerLoanDevelopment.ts':'98265b3e10752b671127c1b23d6725d83d28e47b',
'src/lib/clubManagerLoanPlan.ts':'419b68389dad53c297d1a225611a653c0ed83b30',
'src/components/club-manager/LoanPlanCard.tsx':'b7b713399752fd97a5b27174108f2488d85bd037'};
const allowed=[TEST,SELECTOR,'scripts/qa/cmRecruitmentTilesBaseline.mjs','.github/workflows/cm-recruitment-shortlist-fixed.yml'].sort();
fs.mkdirSync(OUT,{recursive:true});
const write=(name,v)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(v,null,2)+'\n');
const pins=[];
for(const prior of original.files){
const file=prior.path===TEST?selected:prior,body=fs.readFileSync(file.path);
assert.equal(body.length,file.bytes);assert.equal(sha(body),file.sha256,'Selected exact source '+file.path);assert.equal(git(body),file.gitBlob);
pins.push({path:file.path,bytes:body.length,sha256:sha(body),git:git(body)});}
for(const[file,pin]of Object.entries(held)){const body=fs.readFileSync(file);assert.equal(git(body),pin);pins.push({path:file,bytes:body.length,sha256:sha(body),git:pin});}
assert.equal(pins.length,14);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.GITHUB_SHA);
assert.equal(execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim(),BASE,'Atomic child of admitted current282b source');
assert.equal(process.env.GITHUB_REF_NAME,BRANCH);
const changed=execFileSync('git',['diff','--name-only',BASE,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed,allowed,'Only one test append and three owned QA source paths');
write('selected-source-pins.json',{base:BASE,head:process.env.GITHUB_SHA,branch:BRANCH,pins,changed,scope:'All five product bodies held; explicit one-test override of old282b selector. No UI successor authored before actual intended RED.'});
function admit(value,log){
const cli=plain(log);assert.equal(value.success,false);assert.equal(value.numTotalTests,38);assert.equal(value.numPassedTests,37);assert.equal(value.numFailedTests,1);assert.equal(value.numPendingTests,0);assert.equal(value.numTodoTests,0);
assert(Array.isArray(value.testResults)&&value.testResults.length===4,'Four actual files');
assert(!/Failed Suites|Unhandled Errors|Vitest caught\s+\d+\s+unhandled|UnhandledRejection|UncaughtException|^\s*Errors\s+\d+\s+errors?/mi.test(cli),'NO_CLI_INFRASTRUCTURE');
let total=0;for(const file of expected){
const matches=value.testResults.filter(s=>s.name.replaceAll('\\','/').endsWith('/'+file.path));assert.equal(matches.length,1);
const suite=matches[0];assert.equal(typeof suite.message,'string');assert.equal(suite.message,'','NO_SUITE_DIAGNOSTICS');assert.equal(suite.status,file.path===TEST?'failed':'passed');
const rows=suite.assertionResults;assert.equal(rows.length,file.titles.length);assert.deepEqual(rows.map(r=>r.fullName).sort(),file.titles.map(t=>file.prefix+' '+t).sort(),'Exact old37 plus one new identity');
for(const row of rows){assert.equal(row.status,row.fullName===TARGET?'failed':'passed');assert(Array.isArray(row.failureMessages));
if(row.fullName===TARGET){assert(row.failureMessages.length>0);for(const failure of row.failureMessages){const message=plain(failure);assert(message.includes(MARKER),'EXACT_MISSING_VIEW_MARKER');assert(/AssertionError|Error:\s*expect\(/.test(message)&&!/Cannot find module|Failed to resolve|ReferenceError|TypeError|timed out|Invalid Chai property|Invariant violation/.test(message),'INTENDED_ASSERTION_ONLY');}}
else assert.equal(row.failureMessages.length,0);total++;}}
assert.equal(total,38);
assert(/^\s*Test Files\s+1 failed\s*\|\s*3 passed\s+\(4\)\s*$/m.test(cli),'ACTUAL_FILE_CLOSING');
assert(/^\s*Tests\s+1 failed\s*\|\s*37 passed\s+\(38\)\s*$/m.test(cli),'ACTUAL_CASE_CLOSING');
assert(cli.includes('JSON report written to '+path.join(OUT,'tiles-red.json')),'ACTUAL_JSON_WRITTEN');
return{total:38,failed:1,oldPassed:37,skipped:0,files:4,target:TARGET,marker:MARKER};}
if((process.argv[2]||'run')==='run'){
const report=path.join(OUT,'tiles-red.json'),log=path.join(OUT,'tiles-red.log');const fd=fs.openSync(log,'w');let child;
try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...expected.map(f=>f.path),'--maxWorkers=1','--minWorkers=1','--reporter=verbose','--reporter=json','--outputFile.json='+report],{cwd:ROOT,env:{...process.env},stdio:['ignore',fd,fd],timeout:360_000});}finally{fs.closeSync(fd);}
write('process.json',{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.status,1,'Expected intended assertion exit only');
const original=fs.readFileSync(report),logRaw=fs.readFileSync(log),value=JSON.parse(original),text=logRaw.toString('utf8'),actual=admit(value,text),controls=[];
for(const kind of ['suite-message','failed-suites-cli','method-error']){
const copy=structuredClone(value);let copiedLog=text,guard;
if(kind==='suite-message'){copy.testResults[0].message='COPIED QA suite error';guard=/NO_SUITE_DIAGNOSTICS/;}
if(kind==='failed-suites-cli'){copiedLog+='\n\u001b[31mFailed Suites 1\u001b[0m\n';guard=/NO_CLI_INFRASTRUCTURE/;}
if(kind==='method-error'){copy.testResults.flatMap(s=>s.assertionResults).find(r=>r.fullName===TARGET).failureMessages=['AssertionError: TypeError: COPIED QA method error '+MARKER];guard=/INTENDED_ASSERTION_ONLY/;}
assert(JSON.stringify(copy)!==JSON.stringify(value)||copiedLog!==text,'Copied diagnostic actually changes');
write('copied-'+kind+'.json',copy);fs.writeFileSync(path.join(OUT,'copied-'+kind+'.log'),copiedLog);
assert.throws(()=>admit(copy,copiedLog),guard);assert.deepEqual(admit(JSON.parse(original),text),actual);
controls.push({kind,copiedOnly:true,changed:true,rejected:true,originalReadmitted:true});}
assert.equal(sha(fs.readFileSync(report)),sha(original));assert.equal(sha(fs.readFileSync(log)),sha(logRaw));
write('TILES-BASELINE-ADMISSION.json',{status:'QUALIFIED_COMPACT_TILE_MISSING_RED',actual,controls,scope:'Old282b Board unchanged, one actual12-target consumer assertion missing View tile. Old37 preservation actual passes, no product UI successor authored.'});
console.log('PASS tiles intended RED:38 actual cases,1 precise MISSING_VIEW_TILE assertion,37 old preservation passes,0skips,3 changed COPIED diagnostic refusals/readmissions');}
for(const pin of pins)assert.equal(sha(fs.readFileSync(pin.path)),pin.sha256,'All14 selected sources held');write('source-held.json',{pins,held:true});
