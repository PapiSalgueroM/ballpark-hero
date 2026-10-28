import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.env.CI,'1','Remote-only fixed source qualification');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_REVIEW_FIXED_OUT||'manager-job-review-fixed-artifacts/focused');
fs.mkdirSync(OUT,{recursive:true});
const sha=body=>createHash('sha256').update(body).digest('hex');
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2));
const record={status:'RUNNING'};
json('admission.json',record);
try{
 const body=fs.readFileSync(path.join(ROOT,'qa/sc-manager-job-review-v1/SOURCE-READY.json'));
 assert.equal(sha(body),'18f6fbebdfeca4b86705921fef73f1c729abff73abf6bab319d32f55d5a131cf','Exact frozen candidate selector');
 const meta=JSON.parse(body);
 assert.equal(meta.files.length,10);
 const hashes=()=>Object.fromEntries(meta.files.map(row=>[row.path,sha(fs.readFileSync(path.join(ROOT,row.path)))]));
 record.before=hashes();
 for(const row of meta.files)assert.equal(record.before[row.path],row.sha256,row.path);
 const files=[
  'src/test/soccerCareerManagerJobReview.test.ts','src/test/soccerCareerManagerJobReview.transaction.test.tsx',
  'src/test/soccerCareerManagerJobReview.card.test.tsx','src/test/soccerCareerManagerJobReview.consumer.test.tsx',
 ];
 const report=path.join(OUT,'vitest.json');
 const run=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',...files,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+report],{
  cwd:ROOT,env:{...process.env,SC_MANAGER_REVIEW_CASE_OUT:path.join(OUT,'cases')},encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,
 });
 const cli=(run.stdout||'')+'\n'+(run.stderr||'');fs.writeFileSync(path.join(OUT,'vitest.log'),cli);
 record.process={status:run.status,signal:run.signal,error:run.error?String(run.error):null};
 assert(!run.error&&run.signal===null,'Actual focused process completed');
 const result=JSON.parse(fs.readFileSync(report,'utf8'));
 record.aggregates={total:result.numTotalTests,passed:result.numPassedTests,failed:result.numFailedTests,pending:result.numPendingTests,todo:result.numTodoTests};
 const rows=result.testResults.flatMap(suite=>suite.assertionResults);
 record.cases=rows.map(({title,status,failureMessages})=>({title,status,failureMessages}));
 assert.equal(result.testResults.length,4,'Exactly four actual files');
 for(const suite of result.testResults)assert.equal(suite.message,'','No suite/setup/collection errors');
 const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No out-of-row infrastructure diagnostics');
 const expected=[
  "absent false and malformed optional preferences preserve canonical state save and every draw",
  "stages only the actual completed poach and preserves all draws national flags money and table",
  "accept restores the exact canonical employment era row text and full completed season",
  "stay preserves the completed season and records a declined move without a false hire claim",
  "pending choices block another season and mode changes with zero draws",
  "stale and duplicate choice requests leave the current state untouched without random work",
  "a current quote preserves cash phone and appended events made after the approach",
  "same-name ambiguous missing and changed pools keep the actual canonical season without guessing",
  "old poached departure without a fresh club change never manufactures a pending approach",
  "a club promoted above its original data tier still stages its actual earned approach",
  "non-poach seasons retain full canonical results and random stream across actual outcomes",
  "an opted-in unemployed season remains the canonical market money and random outcome",
  "official save parse repair retains pending and resolved choices in small and packed histories",
  "malformed or out-of-phase pending metadata cannot resolve or erase current money",
  "StrictMode queued render constructs one canonical season and uses value adoption",
  "duplicate advance callbacks cannot replay a season or consume another draw",
  "replaced saves reject captured callbacks and a fresh callback uses the current save",
  "replaced club pools reject the previous callback without random work",
  "stale choice rejects after a real phone deposit and a fresh choice preserves current money",
  "unmounted transaction callbacks reject every action without adoption or random work",
  "shows the actual earned destination and both decisions with no simulation work",
  "help explains the settled season and national call and Back does not select a job",
  "ambiguous destination data cannot display actionable invented choices",
  "rerendered card binds Stay to the current saved state without advancing",
  "employed manager can opt into reviewing earned job moves",
  "employed manager can reopen job move rules without advancing",
  "canonical default manager seasons preserve complete state save and random stream",
  "existing unemployed job acceptance preserves complete state save and zero draws"
];
 assert.equal(rows.length,28);assert.deepEqual(rows.map(row=>row.title).sort(),expected.slice().sort(),'All 28 frozen case identities');
 assert.equal(result.numTotalTests,28);assert.equal(result.numPassedTests,28);assert.equal(result.numFailedTests,0);
 assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests,0);assert.equal(result.numPendingTestSuites,0);assert.equal(result.success,true);
 assert(rows.every(row=>row.status==='passed'),'Every frozen actual case passed');
 assert(/^\s*Test Files\s+4 passed\s+\(4\)\s*$/m.test(plain),'Actual four-file closing');
 assert(/^\s*Tests\s+28 passed\s+\(28\)\s*$/m.test(plain),'Actual 28-case closing');
 assert(plain.includes('JSON report written to '+report),'Actual JSON closing');
 assert.equal(run.status,0);
 record.after=hashes();assert.deepEqual(record.after,record.before,'All selected sources held');
 record.status='FIXED_28_ACTUAL_PASSED';json('admission.json',record);
 console.log('Actual focused files:4, actual frozen cases:28, passed:28, failed/pending/todo:0.');
 console.log('Actual no-env ManagerPanel consumers passed:4, pure:14, transaction:6, card:4.');
 console.log('Selected canonical body holds:10; suite/setup/unhandled errors:0.');
 console.log('Manager job review fixed status:'+record.status+'.');
}catch(error){
 record.status='ACTUAL_ASSERTION_OR_METHOD_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};json('admission.json',record);throw error;
}
