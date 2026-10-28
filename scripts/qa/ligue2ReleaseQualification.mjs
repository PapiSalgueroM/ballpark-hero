import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_LIGUE2_RELEASE_OUT||'ligue2-release-artifacts/proof');
const selectorPath='qa/sc-ligue2-release-v1/RELEASE-SOURCE-READY.json';
const selected=JSON.parse(fs.readFileSync(selectorPath,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
function held(){return selected.files.map(p=>{assert(/^[a-f0-9]{64}$/.test(p.sha256),'Bound source pin');const b=fs.readFileSync(path.join(ROOT,p.path));assert.equal(b.length,p.bytes,'Source bytes '+p.path);assert.equal(sha(b),p.sha256,'Source SHA '+p.path);assert.equal(git(b),p.gitBlob,'Source Git '+p.path);return p;});}
const sourceBefore=held();json('source-before',sourceBefore);
const clean=s=>s.replace(/\x1b\[[0-9;]*m/g,'');
function noInfrastructure(log){assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Failed Suites|Vitest caught \d+ unhandled errors?|\bErrors\s+\d+\s+errors?\b|No test files found/i.test(clean(log)),'NO_INFRASTRUCTURE');}
const normalizeFile=f=>f.replaceAll('\\','/').replace(/^.*?\/ballpark-hero\/ballpark-hero\//,'');
const identities=rows=>{const m=new Map();for(const r of rows){const k=JSON.stringify([r.file,r.name,r.status]);m.set(k,(m.get(k)||0)+1);}return [...m].sort(([a],[b])=>a<b?-1:a>b?1:0);};
function unitRows(report,log){
 assert.equal(report.success,true,'ACTUAL_REPORT_SUCCESS');assert.equal(report.numFailedTests,0,'NO_FAILED_CASES');assert.equal(report.numFailedTestSuites,0,'NO_FAILED_SUITES');
 assert.equal(report.numPendingTests,58,'SKIP_COUNT');assert.equal(report.numTodoTests||0,0,'NO_TODO');
 const rows=[];
 for(const suite of report.testResults){
  assert(['passed','skipped'].includes(suite.status),'NO_FAILED_FILES');assert.equal(suite.message||'','','NO_SUITE_ERRORS');
  for(const r of suite.assertionResults){assert(['passed','skipped'].includes(r.status),'CASE_STATUS');assert.deepEqual(r.failureMessages,[],'NO_CASE_ERRORS');rows.push({file:normalizeFile(suite.name),name:r.fullName,status:r.status});}
 }
 assert(rows.length>0,'ACTUAL_CASES_COLLECTED');assert.equal(rows.length,report.numTotalTests,'ACTUAL_TOTAL');assert.equal(rows.filter(r=>r.status==='passed').length,report.numPassedTests,'ACTUAL_PASSES');
 const reference=JSON.parse(fs.readFileSync(selected.skipReferencePath,'utf8'));
 assert.equal(reference.rows.length,58,'REFERENCE_58');assert.deepEqual(identities(rows.filter(r=>r.status==='skipped')),identities(reference.rows),'EXACT_58_SKIP_IDENTITIES');
 noInfrastructure(log);const text=clean(log),files=text.match(/\bTest Files[^\n]*\((\d+)\)/g)||[],tests=text.match(/\bTests[^\n]*\((\d+)\)/g)||[];
 assert.equal(files.length,1,'CLI_FILES_CLOSING');assert.equal(tests.length,1,'CLI_TESTS_CLOSING');assert.equal(Number(files[0].match(/\((\d+)\)/)[1]),report.testResults.length,'CLI_FILES_TOTAL');assert.equal(Number(tests[0].match(/\((\d+)\)/)[1]),rows.length,'CLI_CASE_TOTAL');assert.equal((text.match(/JSON report written to /g)||[]).length,1,'JSON_WRITTEN');
 return rows;
}
function units(){
 const report=JSON.parse(fs.readFileSync(path.join(OUT,'full-units.json'),'utf8')),log=fs.readFileSync(path.join(OUT,'full-units.log'),'utf8');
 const rows=unitRows(report,log),controls=[];
 for(const kind of ['failed-file','suite-error','skip-identity','truncated-cli','failed-suites-cli','caught-unhandled-cli','errors-cli']){
  const copy=structuredClone(report),before=JSON.stringify(copy);let copiedLog=log,expected;
  if(kind==='failed-file'){copy.testResults[0].status='failed';expected='NO_FAILED_FILES';}
  if(kind==='suite-error'){copy.testResults[0].message='COPIED collection failure';expected='NO_SUITE_ERRORS';}
  if(kind==='skip-identity'){copy.testResults.flatMap(s=>s.assertionResults).find(r=>r.status==='skipped').fullName+=' COPIED';expected='EXACT_58_SKIP_IDENTITIES';}
  if(kind==='truncated-cli'){copiedLog='';expected='CLI_FILES_CLOSING';}
  if(kind==='failed-suites-cli'){copiedLog+='\n\x1b[31mFailed Suites 1\x1b[0m\n';expected='NO_INFRASTRUCTURE';}
  if(kind==='caught-unhandled-cli'){copiedLog+='\nVitest caught 1 unhandled error during the test run.\n';expected='NO_INFRASTRUCTURE';}
  if(kind==='errors-cli'){copiedLog+='\nErrors 1 errors\n';expected='NO_INFRASTRUCTURE';}
  assert(JSON.stringify(copy)!==before||copiedLog!==log,'COPIED diagnostic changed');json('unit-control-'+kind+'-changed',{report:copy,log:copiedLog});
  let refusal='';try{unitRows(copy,copiedLog);}catch(e){refusal=e.message;}assert(refusal.includes(expected),'COPIED diagnostic specific refusal '+kind);
  const original=unitRows(report,log);assert.deepEqual(original,rows);controls.push({kind,scope:'COPIED actual report/log observations, original readmitted',expected,specificRefusal:refusal});
 }
 json('full-unit-identities',rows);json('UNIT-ADMISSION',{status:'ACTUAL_FULL_SUITE_PASS',actualCases:rows.length,actualPassed:rows.filter(r=>r.status==='passed').length,actualSkipped:58,actualFiles:report.testResults.length,controls,scope:'Fresh unfiltered current suite. No inherited total/pass denominator claim.'});
 console.log('LIGUE2_UNITS: '+rows.length+' actual cases, '+report.numPassedTests+' passed, 58 exact skipped, 0 failed, 7 COPIED diagnostics');
}
function simRows(plan,log){
 assert(Array.isArray(plan.nodeGroup)&&plan.nodeGroup.length>0&&Array.isArray(plan.browserGroup),'ACTUAL_FULL_SIM_PLAN');
 assert.equal(new Set(plan.nodeGroup).size,plan.nodeGroup.length,'UNIQUE_SIM_PLAN');
 const verdicts=[...log.matchAll(/^  (PASS|SKIP|FAIL|EMPTY)\s+([A-Za-z0-9]+\.mjs)\s+\d+\.\d+s$/gm)].map(m=>({status:m[1],file:m[2]}));
 assert.equal(verdicts.length,plan.nodeGroup.length,'EVERY_PLANNED_NODE_HARNESS_REPORTED');
 assert.deepEqual(verdicts.map(r=>r.file).sort(),[...plan.nodeGroup].sort(),'EXACT_NODE_PLAN_IDENTITIES');
 assert(verdicts.every(r=>['PASS','SKIP'].includes(r.status)),'NO_SIM_FAILURES');
 const passed=verdicts.filter(r=>r.status==='PASS'),skipped=verdicts.filter(r=>r.status==='SKIP');
 const closing='All '+passed.length+' harnesses green'+(skipped.length?', '+skipped.length+' skipped above':'')+'.';
 assert.equal(log.trimEnd().split('\n').at(-1),closing,'ACTUAL_FULL_SIM_CLOSING');
 assert(log.includes('Network mode: offline, loopback only, no production probe or database retries.'),'ACTUAL_OFFLINE_SIM_PROFILE');
 return{nodeCount:plan.nodeGroup.length,browserCountExplicitlyOmitted:plan.browserGroup.length,passed,skipped,closing};
}
function sims(){
 assert.equal(fs.readFileSync(path.join(OUT,'full-sims-exit.txt'),'utf8').trim(),'0','ACTUAL_FULL_SIM_EXIT');
 const plan=JSON.parse(fs.readFileSync(path.join(OUT,'full-sims-plan.json'),'utf8')),log=fs.readFileSync(path.join(OUT,'full-sims.log'),'utf8'),result=simRows(plan,log);
 const first=result.passed[0];assert(first,'Actual passed harness for COPIED detector');
 const line=[...log.matchAll(/^  PASS\s+([A-Za-z0-9]+\.mjs)\s+\d+\.\d+s$/gm)].find(m=>m[1]===first.file)[0];
 const changed=log.replace(line,line.replace('PASS','FAIL'));assert.notEqual(sha(changed),sha(log));
 json('sim-control-failed-verdict-before',{log});json('sim-control-failed-verdict-changed',{log:changed});
 let refusal='';try{simRows(plan,changed);}catch(e){refusal=e.message;}assert(refusal.includes('NO_SIM_FAILURES'),'COPIED specific sim-verdict refusal');
 assert.deepEqual(simRows(plan,log),result);json('sim-control-failed-verdict-restored',{log});
 json('SIM-ADMISSION',{status:'ACTUAL_EXISTING_DEFAULT_NODE_PROFILE_PASS',...result,nodeGroup:plan.nodeGroup,browserGroup:plan.browserGroup,copiedControl:{scope:'COPIED actual runner verdict line only, exact original readmitted',changedSHA256:sha(changed),originalSHA256:sha(log),specificRefusal:refusal},scope:'Unchanged runAllSims default offline node profile. Existing database-only skips and omitted browser profile stay explicit; separate bounded route proof and15readers/caps have their own outputs.'});
 console.log('LIGUE2_SIMS: '+result.nodeCount+' planned node harnesses, '+result.passed.length+' passed, '+result.skipped.length+' explicit skips, '+result.browserCountExplicitlyOmitted+' browser-profile harnesses omitted');
}
async function fixed(){
 const trackedResult=spawnSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(trackedResult.status,0);
 const tracked=trackedResult.stdout.split('\0').filter(Boolean),map=root=>tracked.map(p=>{const b=fs.readFileSync(path.join(root,p));return{path:p,bytes:b.length,sha256:sha(b),gitBlob:git(b)};});
 const canonical=map(ROOT);json('canonical-all-source-before',canonical);
 const baseMap=new Map(canonical.map(r=>[r.path,r.sha256]));
 const plan=JSON.parse(fs.readFileSync(selected.physicalControlsPath,'utf8'));assert.equal(plan.controls.length,10);
 function classify(input,failed,origin){
  assert.equal(input.status,failed.length?1:0,'FIXED_RAW_EXIT');assert.equal(input.signal,null,'FIXED_SIGNAL');assert.equal(input.error,null,'FIXED_PROCESS_ERROR');assert.equal(input.stderr,'','FIXED_STDERR');
  const r=input.report;assert(!Object.hasOwn(r,'infrastructure'),'FIXED_NO_INFRASTRUCTURE');assert.deepEqual(r.methodErrors,[],'FIXED_NO_METHOD_ERRORS');
  assert.equal(r.status,failed.length?'ASSERTION_RED':'PASSED','FIXED_REPORT_STATUS');assert.deepEqual(r.totals,{cases:7,passed:7-failed.length,failed:failed.length,methodErrors:0},'FIXED_TOTALS');
  assert.equal(r.cases.length,7,'FIXED_CASE_COUNT');assert.equal(input.stdout.trim(),'LIGUE2_FIXED: 7 cases; '+(7-failed.length)+' passed; '+failed.length+' assertion failures; 0 method errors; source held','FIXED_CLI_CLOSING');
  for(let i=0;i<7;i++){const row=r.cases[i],want=selected.fixedCases[i];assert.equal(row.index,i,'FIXED_INDEX');assert.equal(row.name,want.name,'FIXED_NAME');assert.equal(row.marker,want.marker,'FIXED_MARKER');assert.equal(row.status,failed.includes(i)?'failed':'passed','FIXED_ROW_STATUS');
   if(failed.includes(i)){assert.equal(row.error?.name,'AssertionError','FIXED_ERROR_NAME');assert(clean(row.error.message).startsWith(want.marker),'FIXED_ERROR_PREFIX');assert(/AssertionError/.test(row.error.stack),'FIXED_ASSERTION_STACK');}else assert(!Object.hasOwn(row,'error'),'FIXED_PASSED_WITHOUT_ERROR');
  }
  assert.deepEqual(r.sourceAfter,r.sourceBefore,'FIXED_SOURCE_STABILITY');
  assert.deepEqual(Object.keys(r.sourceBefore).sort(),[...selected.fixedSourcePaths].sort(),'FIXED_EXACT_SOURCE_PATHS');
  for(const [p,hash]of Object.entries(r.sourceBefore))assert.equal(hash,origin.get(p),'FIXED_SOURCE_ORIGIN '+p);
  return r;
 }
 function run(cwd,label,failed,origin){
  const out=path.join(OUT,label);fs.mkdirSync(out,{recursive:true});
  const child=spawnSync(process.execPath,['scripts/qa/ligue2ReleaseFixed.mjs'],{cwd,env:{...process.env,SC_LIGUE2_FIXED_OUT:out,GIT_DIR:path.join(ROOT,'.git')},encoding:'utf8',timeout:600000,maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(out,'child.stdout.log'),child.stdout||'');fs.writeFileSync(path.join(out,'child.stderr.log'),child.stderr||'');
  const input={status:child.status,signal:child.signal,error:child.error?{name:child.error.name,message:child.error.message}:null,stdout:child.stdout||'',stderr:child.stderr||''};
  fs.writeFileSync(path.join(out,'child-process.json'),JSON.stringify(input,null,2));assert.equal(input.error,null,'Fixed child process failed');
  input.report=JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8'));classify(input,failed,origin);return input;
 }
 const healthy=run(ROOT,'healthy',[],baseMap),controls=[];
 const archive=path.join(OUT,'controlled-source.tar'),archived=spawnSync('git',['archive','--format=tar','HEAD'],{cwd:ROOT,maxBuffer:256*1024*1024});assert.equal(archived.status,0);fs.writeFileSync(archive,archived.stdout);
 const copyRoot=fs.mkdtempSync(path.join(OUT,'controlled-source-'));assert(copyRoot.startsWith(OUT+path.sep)&&copyRoot!==ROOT,'Owned physical copy');
 const physical=[];let firstFault;
 try{
  const extracted=spawnSync('tar',['-xf',archive,'-C',copyRoot],{cwd:ROOT,encoding:'utf8'});assert.equal(extracted.status,0);fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(copyRoot,'node_modules'),'dir');
  assert.deepEqual(map(copyRoot),canonical,'Controlled copy starts exact');
  for(const fault of plan.controls){
   const file=path.join(copyRoot,fault.path),before=fs.readFileSync(file);assert.equal(sha(before),fault.sourceSHA256,'Declared physical source');
   let changed;
   if(fault.mutation.kind==='reference'){
    const r=spawnSync('git',['show',fault.mutation.ref+':'+fault.path],{cwd:ROOT,maxBuffer:4*1024*1024});assert.equal(r.status,0,'Physical reference available');changed=r.stdout;assert.equal(sha(changed),fault.mutation.sha256,'Physical reference SHA');assert.equal(git(changed),fault.mutation.gitBlob,'Physical reference Git');
   }else{
    assert.equal(fault.mutation.kind,'span');const s=before.toString('utf8'),parts=s.split(fault.mutation.before);assert.equal(parts.length-1,fault.mutation.count,'Exact physical anchor count');changed=Buffer.from(parts.join(fault.mutation.after));
   }
   assert.notEqual(sha(changed),sha(before),'Physical fault changed bytes');
   const record=path.join(OUT,'physical-'+fault.name);fs.mkdirSync(record,{recursive:true});fs.writeFileSync(path.join(record,'before.source'),before);fs.writeFileSync(path.join(record,'changed.source'),changed);
   const expected=canonical.map(r=>r.path===fault.path?{path:r.path,bytes:changed.length,sha256:sha(changed),gitBlob:git(changed)}:r);
   let mutant;
   try{fs.writeFileSync(file,changed);assert.deepEqual(map(copyRoot),expected,'Only declared physical source changed');
    mutant=run(copyRoot,'physical-'+fault.name+'/mutant',fault.expectedFailureIndices,new Map(expected.map(r=>[r.path,r.sha256])));
    assert.equal(mutant.report.cases[fault.independentIndex].status,'passed','Independent old-definition preservation');if(!firstFault)firstFault={input:mutant,failed:fault.expectedFailureIndices,origin:new Map(expected.map(r=>[r.path,r.sha256]))};
   }finally{fs.writeFileSync(file,before);fs.writeFileSync(path.join(record,'restored.source'),fs.readFileSync(file));assert(fs.readFileSync(file).equals(before),'Exact same physical source restoration');assert.deepEqual(map(copyRoot),canonical,'All copied sources restored');}
   const restored=run(copyRoot,'physical-'+fault.name+'/restored',[],baseMap);assert.equal(restored.report.totals.passed,7);
   physical.push({name:fault.name,path:fault.path,targetIndex:fault.targetIndex,independentIndex:fault.independentIndex,failed:fault.expectedFailureIndices,beforeSHA256:sha(before),changedSHA256:sha(changed),restoredSHA256:sha(fs.readFileSync(file)),mutantStatus:mutant.status,restoredPassed:7,scope:fault.scope});json('physical-controls',physical);
  }
  assert.equal(physical.length,10);
  const generated='src/data/soccerCareerClubPool.ts',before=fs.readFileSync(path.join(copyRoot,generated)),r=spawnSync(process.execPath,['scripts/genCareerClubPool.mjs','--table'],{cwd:copyRoot,env:process.env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(OUT,'idempotent-generator.stdout.log'),r.stdout||'');fs.writeFileSync(path.join(OUT,'idempotent-generator.stderr.log'),r.stderr||'');assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);assert(fs.readFileSync(path.join(copyRoot,generated)).equals(before),'Frozen generated output exactly idempotent');assert.deepEqual(map(copyRoot),canonical);
  json('generator-idempotence',{sourceSHA256:sha(before),sourceGit:git(before),status:r.status,allCopiedSourcesHeld:true});
 }finally{fs.rmSync(copyRoot,{recursive:true,force:true});}
 assert(firstFault,'Actual assertion fault for diagnostic controls');
 function copied(name,base,failed,origin,change,pattern){
  const value=structuredClone(base),before=JSON.stringify(value);const undo=change(value);const changed=JSON.stringify(value);assert.notEqual(changed,before,'COPIED diagnostic changes bytes');
  json('fixed-control-'+name+'-before',base);json('fixed-control-'+name+'-changed',value);
  let refusal='';try{classify(value,failed,origin);}catch(e){refusal=e.message;}assert.match(refusal,pattern,'COPIED specific refusal');
  undo();assert.equal(JSON.stringify(value),before);classify(value,failed,origin);json('fixed-control-'+name+'-restored',value);controls.push({name,scope:'COPIED actual report/process/log only, exact same observation restored/readmitted',beforeSHA256:sha(before),changedSHA256:sha(changed),restoredSHA256:sha(JSON.stringify(value)),specificRefusal:refusal});
 }
 copied('method-exit',healthy,[],baseMap,x=>{const old=x.status;x.status=2;return()=>x.status=old;},/FIXED_RAW_EXIT/);
 copied('infrastructure',healthy,[],baseMap,x=>{x.report.infrastructure={name:'TypeError',message:'COPIED method failure'};return()=>delete x.report.infrastructure;},/FIXED_NO_INFRASTRUCTURE/);
 copied('unhandled-cli',healthy,[],baseMap,x=>{const old=x.stdout;x.stdout+='\nUnhandled Errors COPIED\n';return()=>x.stdout=old;},/FIXED_CLI_CLOSING/);
 copied('missing-case',healthy,[],baseMap,x=>{const old=x.report.cases.pop();return()=>x.report.cases.push(old);},/FIXED_CASE_COUNT/);
 copied('wrong-error-kind',firstFault.input,firstFault.failed,firstFault.origin,x=>{const row=x.report.cases[firstFault.failed[0]],old=row.error.name;row.error.name='TypeError';return()=>row.error.name=old;},/FIXED_ERROR_NAME/);
 copied('unowned-assertion',firstFault.input,firstFault.failed,firstFault.origin,x=>{const row=x.report.cases[firstFault.failed[0]],old=row.error.message;row.error.message='COPIED_UNOWNED_ASSERTION';return()=>row.error.message=old;},/FIXED_ERROR_PREFIX/);
 assert.equal(controls.length,6);json('fixed-diagnostic-controls',controls);assert.deepEqual(map(ROOT),canonical,'Every canonical tracked source held');json('canonical-all-source-after',map(ROOT));
 json('FIXED-ADMISSION',{status:'ACTUAL_FIXED_SEVEN_AND_TEN_PHYSICAL_CONTROLS_PASS',healthyPassed:7,physicalControls:physical,restoredRuns:10,eachRestoredPassed:7,copiedDiagnostics:controls,generatedIdempotent:true,sourceBodiesHeld:canonical.length,scope:'Seven positive consumer cases; ten changed physical sources each1ownedAssertionError+6PASS including independentcase5; same physical copy exact restoration/all7PASS. SixCOPIED diagnostics. No fullsuite/build/browser credit here.'});
 console.log('LIGUE2_FIXED_QUALIFIED: 7 passed, 10 physical controls, 10 same-copy seven-case restorations, 6 COPIED diagnostics, generated output idempotent');
}
try{
 const mode=process.argv[2];assert(['source','fixed','units','sims'].includes(mode),'Known qualification mode');
 if(mode==='source')console.log('LIGUE2_SOURCE: all selected product and QA producer pins held');
 if(mode==='units')units();
 if(mode==='sims')sims();
 if(mode==='fixed')await fixed();
}finally{const after=held();json('source-after',after);assert.deepEqual(after,sourceBefore,'Every selected canonical source held');}
