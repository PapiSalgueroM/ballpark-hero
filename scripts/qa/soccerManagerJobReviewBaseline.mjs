import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildSoccerManagerJobReviewObserver } from './buildSoccerManagerJobReviewObserver.mjs';

assert.equal(process.env.CI,'1','Baseline is remote-only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_REVIEW_OUT||'manager-job-review-artifacts/consumer');
fs.mkdirSync(OUT,{recursive:true});
const sha=body=>createHash('sha256').update(body).digest('hex');
const page='src/pages/SoccerCareer.tsx',test='src/test/soccerCareerManagerJobReview.consumer.test.tsx';
const pins={
 'src/pages/SoccerCareer.tsx':'a06bd76c5409ce35bd9376af22ba21293820bfa497793a57b74c832d276ea1bf',
 'src/lib/soccerCareerEngine.ts':'d7d94a36b796af66914cdf9bd4803cf42b027f423ceb8baac9fb144677de7030',
 'src/lib/soccerCareerSave.ts':'b486dfd8c4073230b6967c674058e46c7b56a6afd2a8a165f1e215501205477a',
 'src/lib/soccerCareerLeague.ts':'adb5555de0adc046bed402fd7386305baf5ce9e96aba023b6a64541f9785ca68',
 'src/lib/managerOffers.ts':'c445ec9427502ff797348527077034d76b9c668b3a4980c8387aaba4ab75e24d',
 'src/lib/managerJobMarket.ts':'2df0a3fed4336c23c0bcaa7868a06d63a4cbaa417b3e0e8880e17d8bc879774d',
};
const held=[...Object.keys(pins),test,'scripts/qa/buildSoccerManagerJobReviewObserver.mjs','scripts/qa/soccerManagerJobReviewBaseline.mjs'];
const hashes=()=>Object.fromEntries(held.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
const record={status:'RUNNING',scope:'Actual existing ManagerPanel missing-mode/rules consumers; unchanged canonical engine parity and existing unemployed button. Outer page advance handler is not exercised.'};
const save=()=>fs.writeFileSync(path.join(OUT,'admission.json'),JSON.stringify(record,null,2));
save();
function classify(result,cli,status,report){
 assert.equal(result.testResults.length,1,'One actual consumer suite');
 assert.equal(result.testResults[0].message,'','No suite/setup/collection error');
 const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No out-of-row infrastructure diagnostics');
 assert.equal(result.numTotalTests,4,'All four tests aggregated');
 assert.equal(result.numPassedTests,2,'Two aggregated preservation passes');
 assert.equal(result.numFailedTests,2,'Two aggregated owned failures');
 assert.equal(result.numPendingTests,0,'No pending tests');
 assert.equal(result.numTodoTests,0,'No todo tests');
 assert.equal(result.numPendingTestSuites,0,'No pending suites');
 assert.equal(result.success,false,'Actual baseline is not green');
 assert(/^\s*Test Files\s+1 failed\s+\(1\)\s*$/m.test(plain),'ACTUAL_CLI_COMPLETION: exact one failed file closing');
 assert(/^\s*Tests\s+2 failed\s+\|\s+2 passed\s+\(4\)\s*$/m.test(plain),'ACTUAL_CLI_COMPLETION: exact two failed two passed closing');
 assert(plain.includes('JSON report written to '+report),'ACTUAL_CLI_COMPLETION: actual JSON report written');
 const intended=[
  ['employed manager can opt into reviewing earned job moves','MISSING_MANAGER_REVIEW_MODE_CONTROL'],
  ['employed manager can reopen job move rules without advancing','MISSING_MANAGER_REVIEW_RULES_CONTROL'],
 ];
 const preservation=[
  'canonical default manager seasons preserve complete state save and random stream',
  'existing unemployed job acceptance preserves complete state save and zero draws',
 ];
 const rows=result.testResults.flatMap(suite=>suite.assertionResults);
 assert.equal(rows.length,4,'Exactly four actual cases');
 assert.deepEqual(rows.map(row=>row.title).sort(),[...intended.map(row=>row[0]),...preservation].sort(),'Exact four identities');
 for(const title of preservation)assert.equal(rows.find(row=>row.title===title).status,'passed',title);
 for(const [title,marker]of intended){
  const row=rows.find(row=>row.title===title);
  assert.equal(row.status,'failed',title);
  assert(row.failureMessages.length>0&&row.failureMessages.every(message=>message.includes(marker)&&/expected null not to be null/.test(message)&&!/TypeError|ReferenceError|Cannot find module|Failed to resolve|timed out/i.test(message)),'Only the owned missing-panel-affordance assertion qualifies');
 }
 assert.equal(status,1,'Existing source is actually red');
 return rows;
}
try{
 record.before=hashes();
 for(const [file,pin]of Object.entries(pins))assert.equal(record.before[file],pin,file);
 const built=await buildSoccerManagerJobReviewObserver({root:ROOT,out:path.join(OUT,'observer')});
 record.observer=built.observer;
 assert.equal(record.observer.canonicalSha256,pins[page]);
 const report=path.join(OUT,'vitest.json');
 const run=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+report],{
  cwd:ROOT,env:{...process.env,SC_MANAGER_REVIEW_OBSERVER:built.file,SC_MANAGER_REVIEW_CASE_OUT:path.join(OUT,'cases')},encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024,
 });
 const cli=(run.stdout||'')+'\n'+(run.stderr||'');
 fs.writeFileSync(path.join(OUT,'vitest.log'),cli);
 record.process={status:run.status,signal:run.signal,error:run.error?String(run.error):null};
 assert(!run.error&&run.signal===null,'Actual test process completed without timeout or signal');
 const result=JSON.parse(fs.readFileSync(report,'utf8'));
 const rows=classify(result,cli,run.status,report);
 record.cases=rows.map(({title,status,failureMessages})=>({title,status,failureMessages}));
 const pairs=JSON.parse(fs.readFileSync(path.join(OUT,'cases/canonical-default-pairs.json'),'utf8'));
 assert.equal(pairs.pairs.length,33,'32 fixed seeds plus a genuine poach witness');
 assert(pairs.pairs.some(row=>row.seed===pairs.witnessSeed),'Witness is included in real paired preservation');
 record.preservation={pairCount:pairs.pairs.length,witnessSeed:pairs.witnessSeed,typedState:true,serializedSave:true,allDraws:true,nextDraw:true,unemployedAcceptDrawCount:0};
 const original={reportSha256:sha(fs.readFileSync(report)),cliSha256:sha(fs.readFileSync(path.join(OUT,'vitest.log')))};
 record.copiedDiagnosticControls=[];
 const faults=[
  {name:'truncated-cli',report:structuredClone(result),cli:cli.replace(/^.*Test Files.*(?:\r?\n|$)/m,''),reason:/ACTUAL_CLI_COMPLETION/},
  {name:'unhandled-cli',report:structuredClone(result),cli:cli+'\nUnhandled Errors\nUnhandled Rejection: copied diagnostic control\n',reason:/No out-of-row infrastructure diagnostics/},
  {name:'suite-message',report:structuredClone(result),cli,reason:/No suite\/setup\/collection error/},
 ];
 faults[2].report.testResults[0].message='COPIED_SETUP_FAILURE';
 for(const fault of faults){
  const dir=path.join(OUT,'copied-controls',fault.name);fs.mkdirSync(dir,{recursive:true});
  const body=JSON.stringify(fault.report,null,2);fs.writeFileSync(path.join(dir,'vitest.json'),body);fs.writeFileSync(path.join(dir,'vitest.log'),fault.cli);
  assert(sha(body)!==sha(JSON.stringify(result,null,2))||sha(fault.cli)!==sha(cli),'Copied diagnostic bytes actually changed');
  assert.deepEqual(fault.report.testResults.flatMap(s=>s.assertionResults),result.testResults.flatMap(s=>s.assertionResults),'Assertion rows held in copied diagnostic control');
  let rejection;
  assert.throws(()=>classify(JSON.parse(fs.readFileSync(path.join(dir,'vitest.json'),'utf8')),fs.readFileSync(path.join(dir,'vitest.log'),'utf8'),run.status,report),error=>{
   rejection={name:error.name,message:error.message};return error.name==='AssertionError'&&fault.reason.test(error.message);
  },'Specific copied diagnostic rejection');
  const restoredRows=classify(JSON.parse(fs.readFileSync(report,'utf8')),fs.readFileSync(path.join(OUT,'vitest.log'),'utf8'),run.status,report);
  assert.equal(restoredRows.length,4,'Original actual evidence readmitted after copied fault');
  assert.equal(sha(fs.readFileSync(report)),original.reportSha256);assert.equal(sha(fs.readFileSync(path.join(OUT,'vitest.log'))),original.cliSha256);
  record.copiedDiagnosticControls.push({name:fault.name,kind:'COPIED_EVIDENCE_ONLY',changed:true,rowsHeld:true,rejection,restoredActualCases:4,reportSha256:sha(body),cliSha256:sha(fault.cli)});
 }
 record.after=hashes();assert.deepEqual(record.after,record.before,'Canonical sources and all consumer QA held');
 record.status='CAUSE_QUALIFIED_BASELINE_RED';record.causeQualifiedRed=true;save();
 console.log('Manager panel actual cases:4; intended missing-controls RED:2; preservation PASS:2.');
 console.log('Canonical default complete-state/save/draw+next pairs:33; earned poach witness seed:'+pairs.witnessSeed+'.');
 console.log('Actual unemployed offer button:one canonical acceptance, zero draws.');
 console.log('Copied diagnostic controls:3 rejected specifically and original evidence readmitted.');
 console.log('Infrastructure diagnostics:0; canonical source holds:'+held.length+'; status:'+record.status+'.');
}catch(error){
 record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};save();throw error;
}
