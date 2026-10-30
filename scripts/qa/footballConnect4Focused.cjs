const fs = require('node:fs');
const path = require('node:path');
const a = require('node:assert/strict');
const cp = require('node:child_process');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const out = process.env.C4_OUT;
a(out && path.isAbsolute(out));
const sha = b => createHash('sha256').update(b).digest('hex');
const json = (p,v) => fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const target = 'src/test/footballConnect4RequestOwnership.test.tsx';
const titles = ["an enabled Unlimited restart keeps the fresh board after the previous answer arrives","ignores accepted from the previous Unlimited game after restart","ignores rejected from the previous Unlimited game after restart","ignores unverified from the previous Unlimited game after restart","ignores 429 from the previous Unlimited game after restart","ignores transport from the previous Unlimited game after restart","ignores delayed JSON from the previous Unlimited game after restart","old accepted cannot settle or unlock the new game request","old rejected cannot settle or unlock the new game request","old 429 cannot settle or unlock the new game request","old transport cannot settle or unlock the new game request","Cancel invalidates a pending accepted answer","Cancel invalidates a pending transport answer","daily mode reply cannot add a ghost move after switching modes","unlimited mode reply cannot add a ghost move after switching modes","an accepted daily reply after unmount cannot write a saved move","same-frame submissions own only one validator call and one move","ordinary accepted preserves the current game contract","ordinary rejected preserves the current game contract","ordinary unverified preserves the current game contract","ordinary 429 preserves the current game contract","ordinary transport preserves the current game contract","ordinary blue four in a column keeps its winner","ordinary red four in a column keeps its winner","an ordinary full board without four remains a draw","a discarded Page reply cannot clear the new game draft","old delayed JSON cannot unlock a newer request"];
const hookFailures = new Map([["an enabled Unlimited restart keeps the fresh board after the previous answer arrives","FOOTBALL_CONNECT4_STALE_RESTART_BOARD"],["ignores accepted from the previous Unlimited game after restart","C4_STALE_RESTART_accepted"],["ignores rejected from the previous Unlimited game after restart","C4_STALE_RESTART_rejected"],["ignores unverified from the previous Unlimited game after restart","C4_STALE_RESTART_unverified"],["ignores 429 from the previous Unlimited game after restart","C4_STALE_RESTART_429"],["ignores transport from the previous Unlimited game after restart","C4_STALE_RESTART_transport"],["ignores delayed JSON from the previous Unlimited game after restart","C4_STALE_RESTART_delayed JSON"],["old accepted cannot settle or unlock the new game request","C4_NEW_REQUEST_AVAILABLE"],["old rejected cannot settle or unlock the new game request","C4_NEW_REQUEST_AVAILABLE"],["old 429 cannot settle or unlock the new game request","C4_NEW_REQUEST_AVAILABLE"],["old transport cannot settle or unlock the new game request","C4_NEW_REQUEST_AVAILABLE"],["Cancel invalidates a pending accepted answer","C4_CANCEL_OWNS_SELECTION"],["Cancel invalidates a pending transport answer","C4_CANCEL_OWNS_SELECTION"],["daily mode reply cannot add a ghost move after switching modes","C4_MODE_OWNS_DAILY_SAVE"],["an accepted daily reply after unmount cannot write a saved move","C4_UNMOUNT_OWNS_DAILY_SAVE"],["same-frame submissions own only one validator call and one move","C4_ONE_PENDING_VALIDATOR"],["a discarded Page reply cannot clear the new game draft","C4_RESTART_NEW_INPUT_AVAILABLE"],["old delayed JSON cannot unlock a newer request","C4_JSON_NEW_REQUEST_AVAILABLE"]]);
const pageFailures = new Map([[titles[25],'C4_PAGE_OWNS_NEW_DRAFT']]);
a.equal(titles.length,27); a.equal(new Set(titles).size,27); a.equal(hookFailures.size,18);
a.equal(sha(fs.readFileSync(target)),'93458e4e466516850528d21cd25e730d09c3d1ea602e9bd97a9b9482849677d8');
a.equal(process.env.EXPECTED_MAIN,'28e7392f38f04a3af6da33e71ec5625ca1e2cd9f');
for(const [file,expected] of [
 ['node_modules/vitest/dist/reporters.js','374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
 ['node_modules/vitest/dist/chunks/index.VByaPkjc.js','59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
 ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js','4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
]) a.equal(sha(fs.readFileSync(file)),expected,'locked reporter source');
const reporter = [
 "import {JsonReporter} from "+JSON.stringify(pathToFileURL(path.resolve('node_modules/vitest/dist/reporters.js')).href)+";",
 "import fs from 'node:fs';",
 "import a from 'node:assert/strict';",
 "export default class RuntimeReporter extends JsonReporter {",
 " async onFinished(files,errors,coverage) {",
 "  a(Array.isArray(files));a(Array.isArray(errors));",
 "  const task=n=>({name:n.name,state:n.result?.state??null,errors:(n.result?.errors??[]).map(e=>({message:e.message,actual:e.actual,expected:e.expected})),tasks:(n.tasks??[]).map(task)});",
 "  fs.writeFileSync(process.env.C4_CALLBACK_JSON,JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(e=>({name:e?.name,message:e?.message??String(e),stack:e?.stack})),files:files.map(f=>({filepath:f.filepath,task:task(f)}))},null,2)+'\\n',{flag:'wx'});",
 "  await super.onFinished(files,errors,coverage);",
 " }",
 "}",
].join('\n')+'\n';
const root=path.join(out,'focused');fs.mkdirSync(root);
const baselineLines=fs.readFileSync(path.join(out,'source.initial.sha256'),'utf8').trim().split('\n');
a.equal(baselineLines.length,Number(process.env.EXPECTED_SOURCE_COUNT));
const sourceRows=baselineLines.map(line=>{const m=line.match(/^([a-f0-9]{64})  (.+)$/);a(m);return {sha:m[1],path:m[2]};});
function heldExcept(except,dir) {
 const records=[];
 for(const row of sourceRows) if(row.path!==except) {
  const actual=sha(fs.readFileSync(row.path));a.equal(actual,row.sha,'unchanged source '+row.path);
  records.push(row.path+': OK');
 }
 a.equal(records.length,sourceRows.length-(except?1:0));
 fs.writeFileSync(path.join(dir,'other-source-held.log'),records.join('\n')+'\n',{flag:'wx'});
}
function judge(report,callback,failures) {
 a.equal(report.numTotalTests,27);a.equal(report.numFailedTests,failures.size);
 a.equal(report.numPassedTests,27-failures.size);a.equal(report.numPendingTests,0);a.equal(report.numTodoTests,0);
 a.equal(report.testResults.length,1);
 const file=report.testResults[0];a.equal(path.resolve(file.name),path.resolve(target));
 a.equal(file.status,failures.size?'failed':'passed');a.equal(file.assertionResults.length,27);
 a.deepEqual(file.assertionResults.map(r=>r.title),titles);
 a.equal(callback.arrayReceived,true);a.equal(callback.count,0);a.deepEqual(callback.errors,[]);
 a.equal(callback.files.length,1);a.equal(path.resolve(callback.files[0].filepath),path.resolve(target));
 const leaves=[];
 const walk=t=>{if(t.tasks.length){a.deepEqual(t.errors,[]);t.tasks.forEach(walk);}else leaves.push(t);};
 walk(callback.files[0].task);
 a.equal(leaves.length,27);a.deepEqual(leaves.map(r=>r.name),titles);
 const observed=[];
 for(let i=0;i<titles.length;i++) {
  const title=titles[i],row=file.assertionResults[i],task=leaves[i],marker=failures.get(title);
  a.equal(row.status,marker?'failed':'passed',title);a.equal(task.state,marker?'fail':'pass',title);
  if(marker) {
   a.equal(row.failureMessages.length,1);a(row.failureMessages[0].includes(marker),title+' owned reporter marker');
   a.equal(task.errors.length,1);a(task.errors[0].message.includes(marker),title+' owned task cause');
   observed.push({title,marker,failure:row.failureMessages[0],actual:task.errors[0].actual,expected:task.errors[0].expected});
  } else {a.deepEqual(row.failureMessages,[]);a.deepEqual(task.errors,[]);}
 }
 return {total:27,failed:failures.size,passed:27-failures.size,pending:0,todo:0,callbackErrors:0,observed};
}
function run(id,failures) {
 const dir=path.join(root,id);fs.mkdirSync(dir);
 const reporterPath=path.join(dir,'reporter.mjs'),resultPath=path.join(dir,'result.json'),callbackPath=path.join(dir,'callback.json');
 fs.writeFileSync(reporterPath,reporter,{flag:'wx'});
 const args=[path.join(process.cwd(),'node_modules/vitest/vitest.mjs'),'run',target,'--maxWorkers=1','--no-file-parallelism','--reporter='+reporterPath,'--outputFile='+resultPath];
 json(path.join(dir,'command.json'),{executable:process.execPath,args});
 const stdout=fs.openSync(path.join(dir,'stdout.log'),'wx'),stderr=fs.openSync(path.join(dir,'stderr.log'),'wx');
 let result;try{result=cp.spawnSync(process.execPath,args,{timeout:240000,stdio:['ignore',stdout,stderr],env:{...process.env,C4_CALLBACK_JSON:callbackPath,FORCE_COLOR:'0'}});}
 finally{fs.closeSync(stdout);fs.closeSync(stderr);}
 json(path.join(dir,'process.json'),{status:result.status,signal:result.signal,error:result.error?String(result.error):null});
 fs.writeFileSync(path.join(dir,'raw.exit'),String(result.status)+'\n',{flag:'wx'});
 a.equal(result.status,failures.size?1:0,'actual child status '+id);a.equal(result.signal,null);a.equal(result.error,undefined);
 const bytes=fs.readFileSync(resultPath),callbackBytes=fs.readFileSync(callbackPath);
 const admission=judge(JSON.parse(bytes),JSON.parse(callbackBytes),failures);
 json(path.join(dir,'ADMISSION.json'),{source:process.env.GITHUB_SHA,id,...admission,raw:result.status,resultSHA256:sha(bytes),callbackSHA256:sha(callbackBytes),reporterSHA256:sha(Buffer.from(reporter))});
 a.equal(fs.readFileSync(reporterPath,'utf8'),reporter);
 console.log(id+': actual'+(failures.size?' RED ':' GREEN ')+admission.passed+' passed/'+admission.failed+' owned failures, no skips/todo/callback errors.');
 return {dir,bytes,callbackBytes,admission};
}
function physicalFault(id,file,legacySHA,fixedSHA,failures) {
 const dir=path.join(root,id+'-source');fs.mkdirSync(dir);
 const before=fs.readFileSync(file);a.equal(sha(before),fixedSHA);
 const legacy=cp.spawnSync('git',['show',process.env.EXPECTED_MAIN+':'+file],{maxBuffer:2*1024*1024});
 a.equal(legacy.status,0);a.equal(legacy.signal,null);a.equal(legacy.error,undefined);
 a.equal(sha(legacy.stdout),legacySHA);a.notDeepEqual(before,legacy.stdout);
 fs.writeFileSync(path.join(dir,'before-fixed.bin'),before,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'changed-original.bin'),legacy.stdout,{flag:'wx'});
 let result;
 try {
  fs.writeFileSync(file,legacy.stdout);a.deepEqual(fs.readFileSync(file),legacy.stdout);
  heldExcept(file,dir);
  result=run(id,failures);
 } finally {
  fs.writeFileSync(file,before);a.deepEqual(fs.readFileSync(file),before);
  fs.writeFileSync(path.join(dir,'restored-fixed.bin'),fs.readFileSync(file),{flag:'wx'});
  json(path.join(dir,'RESTORE.json'),{file,beforeSHA256:sha(before),changedSHA256:sha(legacy.stdout),restoredSHA256:sha(fs.readFileSync(file)),sameCanonicalFileRestored:true});
 }
 return result;
}
const healthy=run('healthy',new Map());heldExcept(null,healthy.dir);
const oldHook=physicalFault('original-hook','src/hooks/useFootballConnect4.ts','791a4df137c0a187bf5d2d231d4f1345c66d933df7f27efa586b296d6c3d0883','cb6c5bc28941c2be39058b1f9e78cdb45a650bfb4bce9e854394309e561d64a6',hookFailures);
const restoredHook=run('restored-hook',new Map());heldExcept(null,restoredHook.dir);
const oldPage=physicalFault('original-page','src/pages/FootballConnect4.tsx','3a342b5dea3b3953267ee80e939f714ee923e12d9f0a8f6808303f2ad69d2bf1','e230ce0856a473a1010f91c3ddb7d70ed956541ee5a3d7a174f60c23637cda62',pageFailures);
const restoredPage=run('restored-page',new Map());heldExcept(null,restoredPage.dir);
const originalReport=JSON.parse(oldHook.bytes),originalCallback=JSON.parse(oldHook.callbackBytes);
const copy=path.join(root,'classifier-working-copy.json'),callbackCopy=path.join(root,'classifier-callback-working-copy.json');
fs.writeFileSync(copy,oldHook.bytes,{flag:'wx'});fs.writeFileSync(callbackCopy,oldHook.callbackBytes,{flag:'wx'});
const controls=[
 ['wrong-failure-count',r=>{r.numFailedTests+=1;},()=>{}],
 ['wrong-owned-cause',r=>{r.testResults[0].assertionResults[0].failureMessages=['Synthetic unrelated failure'];},()=>{}],
 ['runtime-error',()=>{},r=>{r.count=1;r.errors=[{message:'Synthetic callback error'}];}],
 ['wrong-test-identity',r=>{r.testResults[0].assertionResults[0].title='Synthetic unexpected test';},()=>{}],
];
const controlRows=[];
for(const[id,changeReport,changeCallback]of controls) {
 const dir=path.join(root,'classifier-controls',id);fs.mkdirSync(dir,{recursive:true});
 const report=JSON.parse(oldHook.bytes),callback=JSON.parse(oldHook.callbackBytes);
 changeReport(report);changeCallback(callback);
 a(JSON.stringify(report)!==JSON.stringify(originalReport)||JSON.stringify(callback)!==JSON.stringify(originalCallback),'effective semantic mutation');
 fs.writeFileSync(copy,JSON.stringify(report));fs.writeFileSync(callbackCopy,JSON.stringify(callback));
 const changed=fs.readFileSync(copy),changedCallback=fs.readFileSync(callbackCopy);
 fs.writeFileSync(path.join(dir,'changed-report.json'),changed,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'changed-callback.json'),changedCallback,{flag:'wx'});
 let refusal;
 try{judge(JSON.parse(fs.readFileSync(copy)),JSON.parse(fs.readFileSync(callbackCopy)),hookFailures);}
 catch(error){refusal={name:error.name,message:error.message};}
 finally{fs.writeFileSync(copy,oldHook.bytes);fs.writeFileSync(callbackCopy,oldHook.callbackBytes);}
 a(refusal);a.equal(refusal.name,'AssertionError');a(refusal.message);
 a.deepEqual(fs.readFileSync(copy),oldHook.bytes);a.deepEqual(fs.readFileSync(callbackCopy),oldHook.callbackBytes);
 a.deepEqual(judge(JSON.parse(fs.readFileSync(copy)),JSON.parse(fs.readFileSync(callbackCopy)),hookFailures),oldHook.admission);
 const row={id,refusal,semanticChanged:true,physicalChangedPairPreserved:true,sameWorkingCopiesRestored:true,beforeReportSHA256:sha(oldHook.bytes),changedReportSHA256:sha(changed),restoredReportSHA256:sha(fs.readFileSync(copy)),beforeCallbackSHA256:sha(oldHook.callbackBytes),changedCallbackSHA256:sha(changedCallback),restoredCallbackSHA256:sha(fs.readFileSync(callbackCopy))};
 json(path.join(dir,'RESULT.json'),row);controlRows.push(row);
}
a.deepEqual(fs.readFileSync(path.join(oldHook.dir,'result.json')),oldHook.bytes);
a.deepEqual(fs.readFileSync(path.join(oldHook.dir,'callback.json')),oldHook.callbackBytes);
json(path.join(out,'FOCUSED-ADMISSION.json'),{status:'ACTUAL_FIXED27_WITH_TWO_PHYSICAL_INVERSES_AND_RESTORES',source:process.env.GITHUB_SHA,healthy:healthy.admission,oldHook:oldHook.admission,restoredHook:restoredHook.admission,oldPage:oldPage.admission,restoredPage:restoredPage.admission,classifierControls:controlRows,totalActualTestObservations:135,actualOwnedInverseFailures:19,allSourceByteHoldsAfterRestores:true});
console.log('C4_REQUEST_FOCUSED: fixed27 green; exact original canonical hook18 owned RED and9 preservation passes; same hook restored27 green; original Page order1 owned RED and26 passes; same Page restored27 green;4 changed copied classifier refusals/restores, no skips/todo/callback errors.');
