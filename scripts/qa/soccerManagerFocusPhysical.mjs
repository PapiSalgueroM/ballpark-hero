import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildSoccerManagerFocusFixedObserver} from './buildSoccerManagerFocusFixedObserver.mjs';

assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_FOCUS_PHYSICAL_OUT||'manager-focus-physical-artifacts');
const selectorPath='qa/sc-manager-season-focus-v1/PHYSICAL-SOURCE.json',selected=JSON.parse(fs.readFileSync(selectorPath,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=b=>({bytes:b.length,sha256:sha(b),gitBlob:createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')});
const read=file=>JSON.parse(fs.readFileSync(file,'utf8')),json=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const strip=value=>value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
const same=(a,b)=>a.file===b.file&&a.fullName===b.fullName;
fs.mkdirSync(OUT,{recursive:true});
function checkPin(file,expected,label){const actual=pin(fs.readFileSync(file));assert.deepEqual(actual,{bytes:expected.bytes,sha256:expected.sha256,gitBlob:expected.gitBlob},label);return actual;}
checkPin(selected.positivePath,selected.positivePin,'Immutable finite healthy selector');
checkPin(selected.descriptorPath,selected.descriptorPin,'Immutable eight descriptors');
const positive=read(selected.positivePath),descriptors=read(selected.descriptorPath);
assert.equal(descriptors.controls.length,8);assert.deepEqual(descriptors.controls.map(c=>c.id),selected.ids);
assert.deepEqual(descriptors.controls.map(c=>c.expectedFailures.length),[2,2,3,4,2,2,1,1]);
function chosen(id){const found=descriptors.controls.filter(c=>c.id===id);assert.equal(found.length,1,'Exactly one finite descriptor ID');return found[0];}
function selectedHeld(root,control){
 return selected.files.map(expected=>{
  const changed=control?.path===expected.path,target=changed?control.changedPin:expected;
  if(changed)assert.deepEqual(control.beforePin,{bytes:expected.bytes,sha256:expected.sha256,gitBlob:expected.gitBlob},'Finite healthy body is pinned');
  return{path:expected.path,...checkPin(path.join(root,expected.path),target,'Finite source '+expected.path),changed:!!changed};
 });
}
function checkedChild(label,args,{cwd=ROOT,env=process.env,timeout=600_000}={}){
 const dir=path.join(OUT,label);fs.mkdirSync(dir,{recursive:true});
 const stdout=path.join(dir,'stdout.log'),stderr=path.join(dir,'stderr.log'),a=fs.openSync(stdout,'w'),b=fs.openSync(stderr,'w');
 let child;try{child=spawnSync(args[0],args.slice(1),{cwd,env,timeout,stdio:['ignore',a,b]});}finally{fs.closeSync(a);fs.closeSync(b);}
 const result={status:child.status,signal:child.signal,error:child.error?String(child.error):null,stdout,stderr};
 json(path.join(dir,'process.json'),result);fs.writeFileSync(path.join(dir,'raw.exit'),String(child.status)+'\n');
 const cli=fs.readFileSync(stdout,'utf8')+'\n'+fs.readFileSync(stderr,'utf8');fs.writeFileSync(path.join(dir,'combined.log'),cli);
 assert.ifError(child.error);assert.equal(child.signal,null,'Actual completed child');
 return{...result,cli};
}
function reporterHeld(){
 assert.equal(read('node_modules/vitest/package.json').version,'3.2.7','Locked actual Vitest reporter version');
 return selected.reporterInputs.map(expected=>({path:expected.path,...checkPin(expected.path,expected,'Locked reporter source')}));
}
function wholeMap(root,expected,control){
 return expected.map(item=>{
  const allowed=control?.path===item.path,target=allowed?control.changedPin:item,actual=checkPin(path.join(root,item.path),target,'Whole physical copy '+item.path);
  assert.equal(fs.statSync(path.join(root,item.path)).isFile(),true);return{path:item.path,mode:item.mode,...actual};
 });
}
function suiteKeys(cases){const keys=new Set();for(const row of cases){keys.add(JSON.stringify([row.file]));for(let n=1;n<=row.ancestorTitles.length;n++)keys.add(JSON.stringify([row.file,...row.ancestorTitles.slice(0,n)]));}return[...keys].sort();}
function admitMutant(run,control){
 const r=run.result,text=strip(run.cli),expected=selected.topology.files,failures=control.expectedFailures;
 assert.equal(run.status,1,'MUTANT_ACTUAL_RAW_EXIT');assert.equal(r.success,false,'MUTANT_ACTUAL_SUCCESS');
 assert.equal(r.numTotalTests,23);assert.equal(r.numFailedTests,failures.length);assert.equal(r.numPassedTests,23-failures.length);
 assert.equal(r.numPendingTests,0);assert.equal(r.numTodoTests||0,0);assert.equal(r.numPendingTestSuites,0);
 assert(Array.isArray(r.testResults));assert.equal(r.testResults.length,2,'MUTANT_TWO_FILE_RESULTS');
 assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text),'MUTANT_NO_INFRASTRUCTURE');
 const failedRows=[],fileStates=[];
 for(const file of expected){
  const found=r.testResults.filter(s=>typeof s.name==='string'&&s.name.replaceAll('\\','/').endsWith('/'+file.file));assert.equal(found.length,1,'MUTANT_EXACT_FILE_IDENTITIES');const suite=found[0];
  assert.equal(suite.message,'','MUTANT_NO_SUITE_METHOD_ERROR');assert(Array.isArray(suite.assertionResults));
  assert.deepEqual(suite.assertionResults.map(row=>({title:row.title,fullName:row.fullName,ancestorTitles:row.ancestorTitles})),file.cases.map(row=>({title:row.title,fullName:row.fullName,ancestorTitles:row.ancestorTitles})),'MUTANT_EXACT_ORDERED_CASE_TOPOLOGY');
  const fileFailed=failures.some(row=>row.file===file.file);assert.equal(suite.status,fileFailed?'failed':'passed','MUTANT_FILE_STATUS');fileStates.push({file:file.file,failed:fileFailed});
  for(let i=0;i<file.cases.length;i++){
   const source=file.cases[i],row=suite.assertionResults[i],failure=failures.some(item=>same(item,source));assert.equal(row.status,failure?'failed':'passed','MUTANT_EXACT_FAILURE_MAP');assert(Array.isArray(row.failureMessages));
   if(!failure){assert.deepEqual(row.failureMessages,[]);continue;}
   assert.equal(row.failureMessages.length,1,'MUTANT_ONE_OWNED_ASSERTION');const message=strip(row.failureMessages[0]);
   assert(/AssertionError/.test(message),'MUTANT_OWNED_ASSERTION_ONLY');assert(!/TypeError|ReferenceError|Cannot find module|Failed to resolve|FIXTURE_METHOD|timed out|TimeoutError/i.test(message),'MUTANT_OWNED_ASSERTION_ONLY');
   const rules=selected.failureCauses[control.id].filter(item=>same(item,source));assert.equal(rules.length,1,'MUTANT_BOUND_OWNED_CAUSE');
   const rule=rules[0];assert(new RegExp(rule.messagePattern,'s').test(message),'MUTANT_OWNED_CAUSE '+control.id+' '+source.fullName);
   if(rule.sourceLine)assert(new RegExp(source.file.replace(/[.*+?^$()|[\]\\]/g,'\\$&')+':'+rule.sourceLine+':\\d+').test(message),'MUTANT_OWNED_SOURCE_ASSERTION');
   failedRows.push(source);
  }
 }
 const all=expected.flatMap(file=>file.cases),failedKeys=suiteKeys(all.filter(row=>failures.some(item=>same(item,row)))),totalKeys=suiteKeys(all);
 assert.equal(totalKeys.length,7,'LOCKED_HEALTHY_SEVEN_NESTED_SUITES');
 assert.equal(r.numTotalTestSuites,totalKeys.length,'MUTANT_NESTED_SUITE_AGGREGATES');assert.equal(r.numFailedTestSuites,failedKeys.length,'MUTANT_NESTED_SUITE_AGGREGATES');assert.equal(r.numPassedTestSuites,totalKeys.length-failedKeys.length,'MUTANT_NESTED_SUITE_AGGREGATES');
 assert.deepEqual(failedRows.map(row=>[row.file,row.fullName]).sort(),failures.map(row=>[row.file,row.fullName]).sort(),'MUTANT_EXACT_FAILURE_MAP');
 assert(!failedRows.some(row=>same(row,control.independentPass)),'MUTANT_INDEPENDENT_CAPTURED_DEFAULT');
 const failedFiles=fileStates.filter(file=>file.failed).length;
 const fileParts=[failedFiles?failedFiles+' failed':null,2-failedFiles?(2-failedFiles)+' passed':null].filter(Boolean).join(' | ');
 const testParts=failures.length+' failed | '+(23-failures.length)+' passed';
 const fileClose=[...text.matchAll(/^\s*Test Files\s+(.+?)\s+\(2\)\s*$/gm)],testClose=[...text.matchAll(/^\s*Tests\s+(.+?)\s+\(23\)\s*$/gm)];
 assert.equal(fileClose.length,1,'MUTANT_ACTUAL_TWO_FILE_CLOSING');assert.equal(testClose.length,1,'MUTANT_ACTUAL_TEST_CLOSING');assert.equal(fileClose[0][1].replace(/\s+/g,' '),fileParts,'MUTANT_ACTUAL_TWO_FILE_CLOSING');assert.equal(testClose[0][1].replace(/\s+/g,' '),testParts,'MUTANT_ACTUAL_TEST_CLOSING');
 assert.equal((text.match(/JSON report written to /g)||[]).length,1);assert(text.includes('JSON report written to '+run.reportPath));
 return{failedCases:failedRows.map(({file,title,fullName})=>({file,title,fullName})),independentPass:control.independentPass,failedFiles,nested:{total:7,failed:failedKeys.length,passed:7-failedKeys.length,failedKeys},rawExit:run.status};
}
function copiedAccounting(run,control){
 const checks=[{id:'nested-suite-aggregate',field:'numFailedTestSuites',cause:'MUTANT_NESTED_SUITE_AGGREGATES'},{id:'file-status',field:'status',cause:'MUTANT_FILE_STATUS'}],records=[];
 for(const item of checks){
  const copy=structuredClone(run),before=JSON.stringify(copy),target=item.id==='file-status'?copy.result.testResults[0]:copy.result,key=item.field,old=target[key],changed=item.id==='file-status'?(old==='passed'?'failed':'passed'):old+1;
  assert.notDeepEqual(changed,old);target[key]=changed;const changedText=JSON.stringify(copy);assert.notEqual(changedText,before);let refusal;
  try{admitMutant(copy,control);}catch(error){refusal={name:error.name,code:error.code,message:error.message};}
  assert.equal(refusal?.name,'AssertionError');assert.equal(refusal.code,'ERR_ASSERTION');assert(refusal.message.includes(item.cause),'COPIED_SPECIFIC_ACCOUNTING_CAUSE');
  assert.equal(target[key],changed);target[key]=old;assert.equal(JSON.stringify(copy),before,'COPIED_EXACT_SAME_COPY_RESTORE');admitMutant(copy,control);
  records.push({...item,old,changed,refusal,originalSHA256:sha(before),changedSHA256:sha(changedText),restoredSHA256:sha(JSON.stringify(copy)),sameCopyRestored:true,scope:'COPIED actual report observations, not physical source effects'});
 }
 return records;
}
async function observe(id,out){
 const control=chosen(id),before=selectedHeld(ROOT,control),body=fs.readFileSync(control.path),built=await buildSoccerManagerFocusFixedObserver({root:ROOT,out});
 const meta=read(path.join(out,'observed-page.metafile.json')),normal=file=>path.resolve(ROOT,file).replaceAll('\\','/').toLowerCase(),target=normal(control.path),matches=Object.entries(meta.inputs).filter(([file])=>normal(file)===target);
 assert.equal(matches.length,1,'FINITE_NODE_CHILD_ONE_ACTUAL_CHANGED_INPUT');
 if(control.path==='src/pages/SoccerCareer.tsx')assert.equal(built.observer.canonicalSha256,control.changedPin.sha256);
 else assert.equal(matches[0][1].bytes,control.changedPin.bytes,'FINITE_NODE_CHILD_CHANGED_INPUT_BYTES');
 assert.equal(built.observer.engineInputs,1);assert.equal(built.observer.engineSHA256,pin(fs.readFileSync('src/lib/soccerCareerEngine.ts')).sha256);
 assert.deepEqual(fs.readFileSync(control.path),body,'FINITE_NODE_CHILD_CHANGED_BODY_HELD');assert.deepEqual(selectedHeld(ROOT,control),before);
 return{file:built.file,referenceFile:built.referenceFile,observer:built.observer,finite:{id,path:control.path,before,after:selectedHeld(ROOT,control),changedBody:pin(body),metafileInput:matches[0],scope:'This actual Node child reads the declared changed body before and after the unchanged observer build. The esbuild child emits exactly one canonical changed-path input; Page appendix is separately bound. No module initialization RNG claim.'}};
}
async function positiveRun(root,label){
 selectedHeld(root);const run=checkedChild(label,[process.execPath,path.join(root,selected.positiveProducer),'healthy'],{cwd:root,env:{...process.env,SC_MANAGER_FOCUS_POSITIVE_OUT:path.join(OUT,label,'evidence')},timeout:1_500_000});
 assert.equal(run.status,0,'UNCHANGED_POSITIVE_PRODUCER_RAW_EXIT');const closing=selected.positiveClosing;assert.equal(strip(run.cli).split(/\r?\n/).filter(line=>line===closing).length,1,'UNCHANGED_POSITIVE_PRODUCER_CLOSING');
 const admission=read(path.join(OUT,label,'evidence','ADMISSION.json'));assert.equal(admission.status,'ACTUAL_FIRST_POSITIVE_PRODUCER_ONLY');assert.equal(admission.copiedControls.length,16);assert.equal(admission.focused.rows.length,23);assert.equal(admission.compatibility.rows.length,4);assert.equal(admission.compatibility.observerOverrideAbsent,true);selectedHeld(root);
 return{status:run.status,admissionPath:path.join(OUT,label,'evidence','ADMISSION.json'),admissionSHA256:sha(fs.readFileSync(path.join(OUT,label,'evidence','ADMISSION.json'))),closing};
}
const record={status:'STARTED_SOURCE_ONLY_PROPOSAL_UNTIL_REVIEW',scope:selected.scope};
let copyRoot,temporary,targetFile,beforeBody,canonical;
try{
 const mode=process.argv[2],id=process.argv[3];assert(['source','physical','observe'].includes(mode),'Finite modes only');record.selected=selectedHeld(ROOT,mode==='observe'?chosen(id):undefined);record.reporter=reporterHeld();
 if(mode==='source'){record.status='SOURCE_PINS_HELD';json(path.join(OUT,'SOURCE-ADMISSION.json'),record);console.log('MANAGER_FOCUS_PHYSICAL_SOURCE: finite8 inputs held; no physical execution');}
 else if(mode==='observe'){const out=path.resolve(process.argv[4]);json(path.join(out,'finite-node-child.json'),await observe(id,out));}
 else{
  const control=chosen(id);record.id=id;
  const list=spawnSync('git',['ls-files','--stage','-z'],{cwd:ROOT,encoding:'utf8'});assert.equal(list.status,0);assert.equal(list.stderr,'');
  canonical=list.stdout.split('\0').filter(Boolean).map(line=>{const match=line.match(/^(\d+) ([a-f0-9]{40}) 0\t(.+)$/);assert(match,'Tracked regular stage0 input');const bytes=fs.readFileSync(match[3]),actual=pin(bytes);assert.equal(actual.gitBlob,match[2],'Canonical source equals HEAD blob');return{path:match[3],mode:match[1],...actual};});
  assert.equal(canonical.length,selected.expectedRegularBodies);record.canonicalBefore=wholeMap(ROOT,canonical);
  const archive=path.join(OUT,'source.tar');const ar=spawnSync('git',['archive','--format=tar','--output='+archive,'HEAD'],{cwd:ROOT,encoding:'utf8'});assert.equal(ar.status,0);assert.equal(ar.stderr,'');record.archive=pin(fs.readFileSync(archive));
  temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sc-focus-physical-'));copyRoot=path.join(temporary,'source');fs.mkdirSync(copyRoot);
  const extraction=spawnSync('tar',['-xf',archive,'-C',copyRoot],{encoding:'utf8'});assert.equal(extraction.status,0);assert.equal(extraction.stderr,'');fs.symlinkSync(fs.realpathSync(path.join(ROOT,'node_modules')),path.join(copyRoot,'node_modules'),'dir');
  wholeMap(copyRoot,canonical);record.healthy=await positiveRun(copyRoot,'healthy');wholeMap(copyRoot,canonical);
  targetFile=path.join(copyRoot,control.path);beforeBody=fs.readFileSync(targetFile);checkPin(targetFile,control.beforePin,'Actual before body');fs.writeFileSync(path.join(OUT,'source-before.txt'),beforeBody);
  let text=beforeBody.toString('utf8');for(const span of control.spans){assert.equal(text.split(span.before).length-1,1,'Unique actually changed span');assert.equal(text.indexOf(span.before),span.characterOffset,'Exact sequential span offset');text=text.slice(0,span.characterOffset)+span.after+text.slice(span.characterOffset+span.before.length);}
  const changed=Buffer.from(text);assert.notEqual(sha(changed),sha(beforeBody));fs.writeFileSync(targetFile,changed);fs.writeFileSync(path.join(OUT,'source-changed.txt'),changed);checkPin(targetFile,control.changedPin,'Actual changed body');record.changedWholeMap=wholeMap(copyRoot,canonical,control);
  const observerOut=path.join(OUT,'changed-observer'),child=checkedChild('finite-observer-child',[process.execPath,path.join(copyRoot,selected.wrapperPath),'observe',id,observerOut],{cwd:copyRoot,timeout:120_000});assert.equal(child.status,0,'ACTUAL_FINITE_NODE_CHILD');
  const observed=read(path.join(observerOut,'finite-node-child.json'));assert.equal(observed.finite.id,id);assert.deepEqual(observed.finite.changedBody,control.changedPin);record.observer=observed;
  const dir=path.join(OUT,'changed'),reportPath=path.join(dir,'vitest.json');
  const run=checkedChild('changed',[process.execPath,path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',...positive.focusedTestPaths,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+reportPath],{cwd:copyRoot,env:{...process.env,SC_MANAGER_FOCUS_OBSERVER:observed.file,SC_MANAGER_FOCUS_REFERENCE:observed.referenceFile,SC_MANAGER_FOCUS_CASE_OUT:path.join(dir,'cases'),SC_MANAGER_FOCUS_TEST_OUT:path.join(dir,'persistent')}});
  const actual={result:read(reportPath),cli:run.cli,status:run.status,reportPath};record.mutant=admitMutant(actual,control);record.copiedAccounting=copiedAccounting(actual,control);wholeMap(copyRoot,canonical,control);
  fs.writeFileSync(targetFile,beforeBody);fs.writeFileSync(path.join(OUT,'source-restored.txt'),fs.readFileSync(targetFile));checkPin(targetFile,control.beforePin,'Same physical copy exact source restoration');wholeMap(copyRoot,canonical);
  record.restored=await positiveRun(copyRoot,'restored');record.restoredWholeMap=wholeMap(copyRoot,canonical);record.canonicalAfter=wholeMap(ROOT,canonical);assert.deepEqual(record.canonicalAfter,record.canonicalBefore);
  record.status='ACTUAL_FINITE_PHYSICAL_VARIANT_ADMITTED';json(path.join(OUT,'ADMISSION.json'),record);
  assert.equal(path.dirname(temporary),os.tmpdir());assert(path.basename(temporary).startsWith('sc-focus-physical-'));fs.rmSync(temporary,{recursive:true,force:true});temporary=undefined;
  console.log('MANAGER_FOCUS_PHYSICAL: '+id+' PASS, 23 healthy and 4 no-env before and after, declared owned failures, 2 COPIED guards, source held; PRE-BS only');
 }
}catch(error){
 record.status='UNEXPECTED_OR_METHOD_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};
 if(targetFile&&beforeBody){try{fs.writeFileSync(targetFile,beforeBody);fs.writeFileSync(path.join(OUT,'source-restored-after-failure.txt'),beforeBody);record.emergencyRestore=checkPin(targetFile,pin(beforeBody),'Emergency exact source restoration');}catch(restoreError){record.restoreFailure=String(restoreError);}}
 if(canonical){try{record.canonicalAfter=wholeMap(ROOT,canonical);}catch(holdError){record.canonicalFailure=String(holdError);}}
 record.temporaryCopy=temporary;json(path.join(OUT,'ADMISSION.json'),record);throw error;
}
