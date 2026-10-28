import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildSoccerManagerJobReviewObserver } from './buildSoccerManagerJobReviewObserver.mjs';

assert.equal(process.env.CI,'1','Remote physical-source qualification only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_REVIEW_CONTROLS_OUT||'manager-job-review-control-artifacts/controls');
fs.mkdirSync(OUT,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=(root,file)=>fs.readFileSync(path.join(root,file));
const json=(file,value)=>fs.writeFileSync(path.join(OUT,file),JSON.stringify(value,null,2));
const metaPath='qa/sc-manager-job-review-v1/SOURCE-READY.json',faultPath='qa/sc-manager-job-review-v1/SOURCE-FAULTS.json',observerPath='qa/sc-manager-job-review-v1/CONTROL-OBSERVERS.json';
const tests=['src/test/soccerCareerManagerJobReview.test.ts','src/test/soccerCareerManagerJobReview.transaction.test.tsx','src/test/soccerCareerManagerJobReview.card.test.tsx','src/test/soccerCareerManagerJobReview.consumer.test.tsx'];
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
const escape=text=>text.split('').map(char=>'\\^$.*+?()[]{}|'.includes(char)?'\\'+char:char).join('');
const record={status:'RUNNING',controls:[],scope:'28 original cases,12 physical copied-app-source faults. Two copied-test trace observers add writes before held assertions only; both observers and app mutation restore before every full28 rerun.'};
const save=()=>json('admission.json',record);
const hashes=(root,files)=>Object.fromEntries(files.map(file=>[file,sha(read(root,file))]));
let owned;
function classify(result,cli,status,selected,report){
 assert.equal(result.testResults.length,4,'All four files actually collected');
 for(const suite of result.testResults)assert.equal(suite.message,'','No suite/setup/collection errors');
 const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No out-of-row infrastructure diagnostics');
 const rows=result.testResults.flatMap(suite=>suite.assertionResults);
 assert.equal(rows.length,28);assert.deepEqual(rows.map(row=>row.title).sort(),expected.slice().sort(),'All original28 case identities held');
 assert.equal(result.numTotalTests,28);assert.equal(result.numTodoTests,0);
 if(!selected){
  assert.equal(status,0);assert.equal(result.success,true);assert.equal(result.numPassedTests,28);assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,0);assert.equal(result.numPendingTestSuites,0);
  assert(rows.every(row=>row.status==='passed'),'Actual full28 pass');
  assert(/^\s*Test Files\s+4 passed\s+\(4\)\s*$/m.test(plain),'COMPLETE_CLI:four passed files');
  assert(/^\s*Tests\s+28 passed\s+\(28\)\s*$/m.test(plain),'COMPLETE_CLI:28 passed tests');
 }else{
  assert.equal(status,1);assert.equal(result.success,false);assert.equal(result.numPassedTests,1);assert.equal(result.numFailedTests,1);assert.equal(result.numPendingTests,26);
  const target=rows.find(row=>row.title===selected[0]),independent=rows.find(row=>row.title===selected[1]);
  assert.equal(target.status,'failed');assert.equal(independent.status,'passed');
  assert.equal(rows.filter(row=>row.status==='failed').length,1);assert.equal(rows.filter(row=>row.status==='passed').length,1);assert.equal(rows.filter(row=>row.status==='skipped').length,26);
  assert(target.failureMessages.length>0&&target.failureMessages.every(message=>{const clean=message.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');return /AssertionError|Error: expect\(/.test(clean)&&!/Cannot find module|Failed to resolve|ReferenceError|TypeError|timed out|Invalid Chai property/i.test(clean);}),'Owned assertion failure only');
  assert(/^\s*Test Files\s+1 failed\s+\|\s+1 passed\s+\|\s+2 skipped\s+\(4\)\s*$/m.test(plain),'COMPLETE_CLI:one failed one passed two filtered files');
  assert(/^\s*Tests\s+1 failed\s+\|\s+1 passed\s+\|\s+26 skipped\s+\(28\)\s*$/m.test(plain),'COMPLETE_CLI:one failed one independent pass26 filtered');
 }
 assert(plain.includes('JSON report written to '+report),'COMPLETE_CLI:actual JSON written');
 return{status,passed:rows.filter(row=>row.status==='passed').length,failed:rows.filter(row=>row.status==='failed').length,filtered:rows.filter(row=>row.status==='skipped').length};
}
async function run(root,label,selected){
 const dir=path.join(OUT,label);fs.mkdirSync(dir,{recursive:true});
 const observed=await buildSoccerManagerJobReviewObserver({root,out:path.join(dir,'observer')});
 const report=path.join(dir,'vitest.json');
 const args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run',...tests,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+report];
 if(selected)args.push('--testNamePattern','(?:'+selected.map(escape).join('|')+')$');
 const child=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,SC_MANAGER_REVIEW_OBSERVER:observed.file,SC_MANAGER_REVIEW_PAIR_TRACE:path.join(dir,'actual-pairs.jsonl'),SC_MANAGER_REVIEW_TRANSACTION_TRACE:path.join(dir,'actual-transaction.json')},encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
 const cli=(child.stdout||'')+'\n'+(child.stderr||'');fs.writeFileSync(path.join(dir,'vitest.log'),cli);
 assert(!child.error&&child.signal===null,'Actual test process completed without timeout or signal');
 const result=JSON.parse(fs.readFileSync(report,'utf8'));
 const admission=classify(result,cli,child.status,selected,report);
 return{...admission,directory:label,observer:observed.observer};
}
function replaceOnce(source,before,after){
 const at=source.indexOf(before);assert(at>=0&&source.indexOf(before,at+1)===-1,'One actual owned source anchor');
 const next=source.slice(0,at)+after+source.slice(at+before.length);assert.notEqual(sha(next),sha(source),'Source bytes actually changed');return next;
}
save();
try{
 const metaBody=read(ROOT,metaPath);assert.equal(sha(metaBody),'34c8dae8ffc872f9a5275b8c7552f98324d030047c090143fa03df9fa63b0764');
 const meta=JSON.parse(metaBody),faultBody=read(ROOT,faultPath),observerBody=read(ROOT,observerPath);
 assert.equal(sha(faultBody),'6449f6f7589a6a7c3040c554744cee9a7e5b3d26e609ed6599cb1d39cd5b3613');
 assert.equal(sha(observerBody),'d15b2e6a3f049e0236f0582347c208018fc7efb50a809393950d10714cb737e4');
 const faults=JSON.parse(faultBody).faults,observers=JSON.parse(observerBody).observers;
 assert.equal(meta.files.length,10);assert.equal(faults.length,12);assert.equal(observers.length,2);
 const held=[...new Set([...meta.files.map(row=>row.path),...meta.heldSource.map(row=>row.path),metaPath,faultPath,observerPath,'scripts/qa/soccerManagerJobReviewControls.mjs'])];
 record.before=hashes(ROOT,held);for(const row of meta.files)assert.equal(record.before[row.path],row.sha256,row.path);
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024}).split('\0').filter(Boolean);
 record.allBefore=hashes(ROOT,tracked);
 const archive=path.join(OUT,'source.tar');execFileSync('git',['archive','--format=tar','--output='+archive,'HEAD'],{cwd:ROOT,timeout:30000});record.sourceArchiveSha256=sha(fs.readFileSync(archive));
 owned=fs.mkdtempSync(path.join(os.tmpdir(),'sc-manager-job-review-controls-'));
 execFileSync('tar',['-xf',archive,'-C',owned],{cwd:ROOT,timeout:30000});
 fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(owned,'node_modules'),'dir');
 assert.deepEqual(hashes(owned,tracked),record.allBefore,'All copied source bodies bind current HEAD');
 record.healthy=await run(owned,'healthy');save();
 record.diagnosticControls=[];
 const healthyReport=path.join(OUT,'healthy/vitest.json'),healthyLog=path.join(OUT,'healthy/vitest.log');
 const diagnosticResult=JSON.parse(fs.readFileSync(healthyReport,'utf8')),diagnosticCli=fs.readFileSync(healthyLog,'utf8');
 const originalEvidence={report:sha(fs.readFileSync(healthyReport)),log:sha(fs.readFileSync(healthyLog))};
 const diagnosticFaults=[
  {name:'truncated-cli',result:structuredClone(diagnosticResult),cli:diagnosticCli.replace(/^.*Test Files.*(?:\r?\n|$)/m,''),reason:/COMPLETE_CLI/},
  {name:'unhandled-cli',result:structuredClone(diagnosticResult),cli:diagnosticCli+'\nUnhandled Errors\nUnhandled Rejection: copied diagnostic control\n',reason:/No out-of-row infrastructure diagnostics/},
  {name:'suite-message',result:structuredClone(diagnosticResult),cli:diagnosticCli,reason:/No suite\/setup\/collection errors/},
 ];
 diagnosticFaults[2].result.testResults[0].message='COPIED_SETUP_FAILURE';
 for(const fault of diagnosticFaults){
  const folder=path.join(OUT,'copied-diagnostics',fault.name);fs.mkdirSync(folder,{recursive:true});
  const body=JSON.stringify(fault.result,null,2);fs.writeFileSync(path.join(folder,'vitest.json'),body);fs.writeFileSync(path.join(folder,'vitest.log'),fault.cli);
  assert(sha(body)!==sha(JSON.stringify(diagnosticResult,null,2))||sha(fault.cli)!==sha(diagnosticCli),'Copied diagnostic bytes change');
  assert.deepEqual(fault.result.testResults.flatMap(suite=>suite.assertionResults),diagnosticResult.testResults.flatMap(suite=>suite.assertionResults),'All actual assertion rows held');
  let rejection;
  assert.throws(()=>classify(JSON.parse(fs.readFileSync(path.join(folder,'vitest.json'),'utf8')),fs.readFileSync(path.join(folder,'vitest.log'),'utf8'),0,undefined,healthyReport),error=>{rejection={name:error.name,message:error.message};return error.name==='AssertionError'&&fault.reason.test(error.message);});
  const restored=classify(JSON.parse(fs.readFileSync(healthyReport,'utf8')),fs.readFileSync(healthyLog,'utf8'),0,undefined,healthyReport);
  assert.equal(sha(fs.readFileSync(healthyReport)),originalEvidence.report);assert.equal(sha(fs.readFileSync(healthyLog)),originalEvidence.log);
  record.diagnosticControls.push({name:fault.name,kind:'COPIED_EVIDENCE_ONLY',changed:true,assertionRowsHeld:28,rejection,restoredActualCases:restored.passed});
 }
 record.traceObservers=[];
 for(const spec of observers){
  const original=read(owned,spec.path),source=original.toString('utf8');let changed=source;
  for(const op of spec.operations)changed=replaceOnce(changed,op.before,op.after);
  let inverse=changed;for(const op of spec.operations.slice().reverse())inverse=replaceOnce(inverse,op.after,op.before);
  assert.equal(inverse,source,'Whole trace observer inverse exact');
  record.traceObservers.push({path:spec.path,beforeSha256:sha(original),observedSha256:sha(changed),onlyDiagnosticStatements:true});
  fs.writeFileSync(path.join(OUT,path.basename(spec.path)+'.original'),original);fs.writeFileSync(path.join(OUT,path.basename(spec.path)+'.observed'),changed);
 }
 for(const fault of faults){
  assert(expected.includes(fault.targetCase)&&expected.includes(fault.independentCase)&&fault.targetCase!==fault.independentCase);
  const original=read(owned,fault.path),changed=replaceOnce(original.toString('utf8'),fault.before,fault.after);
  const item={id:fault.id,path:fault.path,beforeSha256:sha(original),changedSha256:sha(changed),target:fault.targetCase,independent:fault.independentCase};
  record.controls.push(item);save();
  const observerOriginals=new Map();
  fs.writeFileSync(path.join(OUT,fault.id+'.before'+path.extname(fault.path)),original);fs.writeFileSync(path.join(OUT,fault.id+'.changed'+path.extname(fault.path)),changed);
  try{
   const expectedHashes={...record.before,[fault.path]:sha(changed)};
   for(const spec of observers){
    const raw=read(owned,spec.path);observerOriginals.set(spec.path,raw);let text=raw.toString('utf8');
    for(const op of spec.operations)text=replaceOnce(text,op.before,op.after);
    fs.writeFileSync(path.join(owned,spec.path),text);expectedHashes[spec.path]=sha(text);
   }
   fs.writeFileSync(path.join(owned,fault.path),changed);
   assert.deepEqual(hashes(owned,held),expectedHashes,'Only one app fault and two declared trace observers changed');
   item.changed=await run(owned,fault.id+'-changed',[fault.targetCase,fault.independentCase]);
   if(fault.witness==='pure-pairs'){
    const trace=fs.readFileSync(path.join(OUT,item.changed.directory,'actual-pairs.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
    assert(trace.length>0);const pair=trace[0];
    assert.deepEqual(pair.actual.value,pair.expected.value,'Extra draw control preserves all actual game state');
    assert.equal(pair.actualSave,pair.expectedSave,'Extra draw control preserves official saved bytes');
    assert.equal(pair.actual.draws.length,pair.expected.draws.length+1,'Exactly one actual extra global draw');
    assert.deepEqual(pair.actual.draws.slice(0,-1),pair.expected.draws);assert.notEqual(pair.actual.next,pair.expected.next);
    item.actualRNGWitness={typedJSONStateHeld:true,officialSaveHeld:true,expectedDraws:pair.expected.draws.length,actualDraws:pair.actual.draws.length,expectedNext:pair.expected.next,actualNext:pair.actual.next};
   }
   if(fault.witness==='transaction'){
    const trace=JSON.parse(fs.readFileSync(path.join(OUT,item.changed.directory,'actual-transaction.json'),'utf8'));
    assert.equal(trace.revision,1,'Real unrelated render queue changed once');
    assert(trace.actual.draws.length>trace.expected.draws.length,'Unsafe updater actually replayed random work');
    assert.deepEqual(trace.actual.draws.slice(0,trace.expected.draws.length),trace.expected.draws);assert.notEqual(trace.actual.next,trace.expected.next);
    item.actualRNGWitness={revision:trace.revision,expectedDraws:trace.expected.draws.length,actualDraws:trace.actual.draws.length,expectedNext:trace.expected.next,actualNext:trace.actual.next};
   }
  }finally{
   fs.writeFileSync(path.join(owned,fault.path),original);
   for(const [file,raw]of observerOriginals)fs.writeFileSync(path.join(owned,file),raw);
   assert.deepEqual(hashes(owned,held),record.before,'Whole same-copy app AND trace-test restoration exact');
   fs.writeFileSync(path.join(OUT,fault.id+'.restored'+path.extname(fault.path)),read(owned,fault.path));item.restoredSourceSha256=sha(read(owned,fault.path));save();
  }
  item.restored=await run(owned,fault.id+'-restored');save();
 }
 record.allCopyAfter=hashes(owned,tracked);assert.deepEqual(record.allCopyAfter,record.allBefore,'All copied tracked source bodies restored');
 record.allAfter=hashes(ROOT,tracked);assert.deepEqual(record.allAfter,record.allBefore,'All canonical tracked sources stayed exact');
 record.after=hashes(ROOT,held);assert.deepEqual(record.after,record.before);
 record.status='PASSED';save();
 console.log('Actual healthy cases:28passed; physical source controls:12.');
 console.log('Each changed source:1owned assertion failure+1independent pass+26filtered; process and CLI completed.');
 console.log('Same-copy full restores:12x28passes, all original app and test bytes exact.');
 console.log('Actual RNG-only fault and unsafe StrictMode replay witnesses retained; canonical tracked holds:'+tracked.length+'.');
}catch(error){record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};save();throw error;}
finally{if(owned){assert.equal(path.dirname(owned),os.tmpdir());assert(path.basename(owned).startsWith('sc-manager-job-review-controls-'));fs.rmSync(owned,{recursive:true,force:true});}}
