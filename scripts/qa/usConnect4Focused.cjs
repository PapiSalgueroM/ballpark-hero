const fs = require('node:fs');
const path = require('node:path');
const a = require('node:assert/strict');
const cp = require('node:child_process');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const out = process.env.USC4_OUT;
a(out && path.isAbsolute(out));
const sha = b => createHash('sha256').update(b).digest('hex');
const json = (p,v) => fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const target = 'src/test/usConnect4ValidationLock.test.tsx';
const titles = ["a pending NBA answer ignores Skip and gives the next turn only after acceptance","NBA hook API synchronously locks a second submit, Skip and column selection","NBA keeps the pending turn and square through unverified and accepts the same-turn retry","NBA keeps the pending turn and square through 429 and accepts the same-turn retry","NBA keeps the pending turn and square through transport and accepts the same-turn retry","NBA still accepts a normal answer after ordinary Skip and selection","a pending NFL answer ignores Skip and gives the next turn only after acceptance","NFL hook API synchronously locks a second submit, Skip and column selection","NFL keeps the pending turn and square through unverified and accepts the same-turn retry","NFL keeps the pending turn and square through 429 and accepts the same-turn retry","NFL keeps the pending turn and square through transport and accepts the same-turn retry","NFL still accepts a normal answer after ordinary Skip and selection","a pending NHL answer ignores Skip and gives the next turn only after acceptance","NHL hook API synchronously locks a second submit, Skip and column selection","NHL keeps the pending turn and square through unverified and accepts the same-turn retry","NHL keeps the pending turn and square through 429 and accepts the same-turn retry","NHL keeps the pending turn and square through transport and accepts the same-turn retry","NHL still accepts a normal answer after ordinary Skip and selection","a pending MLB answer ignores Skip and gives the next turn only after acceptance","MLB hook API synchronously locks a second submit, Skip and column selection","MLB keeps the pending turn and square through unverified and accepts the same-turn retry","MLB keeps the pending turn and square through 429 and accepts the same-turn retry","MLB keeps the pending turn and square through transport and accepts the same-turn retry","MLB still accepts a normal answer after ordinary Skip and selection"];
const hookFailures = new Map([["NBA hook API synchronously locks a second submit, Skip and column selection","US_CONNECT4_SYNCHRONOUS_SUBMIT_LOCK"],["NBA keeps the pending turn and square through unverified and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NBA keeps the pending turn and square through 429 and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NBA keeps the pending turn and square through transport and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NFL hook API synchronously locks a second submit, Skip and column selection","US_CONNECT4_SYNCHRONOUS_SUBMIT_LOCK"],["NFL keeps the pending turn and square through unverified and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NFL keeps the pending turn and square through 429 and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NFL keeps the pending turn and square through transport and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NHL hook API synchronously locks a second submit, Skip and column selection","US_CONNECT4_SYNCHRONOUS_SUBMIT_LOCK"],["NHL keeps the pending turn and square through unverified and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NHL keeps the pending turn and square through 429 and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["NHL keeps the pending turn and square through transport and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["MLB hook API synchronously locks a second submit, Skip and column selection","US_CONNECT4_SYNCHRONOUS_SUBMIT_LOCK"],["MLB keeps the pending turn and square through unverified and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["MLB keeps the pending turn and square through 429 and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"],["MLB keeps the pending turn and square through transport and accepts the same-turn retry","US_CONNECT4_RETRY_PENDING_LOCK"]]);
const pageFailures = new Map([["a pending NBA answer ignores Skip and gives the next turn only after acceptance","US_CONNECT4_PENDING_UI_LOCK"],["a pending NFL answer ignores Skip and gives the next turn only after acceptance","US_CONNECT4_PENDING_UI_LOCK"],["a pending NHL answer ignores Skip and gives the next turn only after acceptance","US_CONNECT4_PENDING_UI_LOCK"],["a pending MLB answer ignores Skip and gives the next turn only after acceptance","US_CONNECT4_PENDING_UI_LOCK"]]);
a.equal(titles.length,24); a.equal(new Set(titles).size,24); a.equal(hookFailures.size,16);
a.equal(sha(fs.readFileSync(target)),'ab4d4534ed59b5337b8aa1629edfb628993db95f6f5426b44ce2a6c9d5eaf92d');
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
 "  fs.writeFileSync(process.env.USC4_CALLBACK_JSON,JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(e=>({name:e?.name,message:e?.message??String(e),stack:e?.stack})),files:files.map(f=>({filepath:f.filepath,task:task(f)}))},null,2)+'\\n',{flag:'wx'});",
 "  await super.onFinished(files,errors,coverage);",
 " }",
 "}",
].join('\n')+'\n';
const root=path.join(out,'focused');fs.mkdirSync(root);
const baselineLines=fs.readFileSync(path.join(out,'source.initial.sha256'),'utf8').trim().split('\n');
a.equal(baselineLines.length,Number(process.env.EXPECTED_SOURCE_COUNT));
const sourceRows=baselineLines.map(line=>{const m=line.match(/^([a-f0-9]{64})  (.+)$/);a(m);return {sha:m[1],path:m[2]};});
function heldExcept(except,dir) {
 const records=[], omitted=new Set(except || []);
 for(const row of sourceRows) if(!omitted.has(row.path)) {
  const actual=sha(fs.readFileSync(row.path));a.equal(actual,row.sha,'unchanged source '+row.path);
  records.push(row.path+': OK');
 }
 a.equal(records.length,sourceRows.length-omitted.size);
 fs.writeFileSync(path.join(dir,'other-source-held.log'),records.join('\n')+'\n',{flag:'wx'});
}
function judge(report,callback,failures) {
 a.equal(report.numTotalTests,24);a.equal(report.numFailedTests,failures.size);
 a.equal(report.numPassedTests,24-failures.size);a.equal(report.numPendingTests,0);a.equal(report.numTodoTests,0);
 a.equal(report.testResults.length,1);
 const file=report.testResults[0];a.equal(path.resolve(file.name),path.resolve(target));
 a.equal(file.status,failures.size?'failed':'passed');a.equal(file.assertionResults.length,24);
 a.deepEqual(file.assertionResults.map(r=>r.title),titles);
 a.equal(callback.arrayReceived,true);a.equal(callback.count,0);a.deepEqual(callback.errors,[]);
 a.equal(callback.files.length,1);a.equal(path.resolve(callback.files[0].filepath),path.resolve(target));
 const leaves=[];
 const walk=t=>{if(t.tasks.length){a.deepEqual(t.errors,[]);t.tasks.forEach(walk);}else leaves.push(t);};
 walk(callback.files[0].task);
 a.equal(leaves.length,24);a.deepEqual(leaves.map(r=>r.name),titles);
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
 return {total:24,failed:failures.size,passed:24-failures.size,pending:0,todo:0,callbackErrors:0,observed};
}
function run(id,failures) {
 const dir=path.join(root,id);fs.mkdirSync(dir);
 const reporterPath=path.join(dir,'reporter.mjs'),resultPath=path.join(dir,'result.json'),callbackPath=path.join(dir,'callback.json');
 fs.writeFileSync(reporterPath,reporter,{flag:'wx'});
 const args=[path.join(process.cwd(),'node_modules/vitest/vitest.mjs'),'run',target,'--maxWorkers=1','--no-file-parallelism','--reporter='+reporterPath,'--outputFile='+resultPath];
 json(path.join(dir,'command.json'),{executable:process.execPath,args});
 const stdout=fs.openSync(path.join(dir,'stdout.log'),'wx'),stderr=fs.openSync(path.join(dir,'stderr.log'),'wx');
 let result;try{result=cp.spawnSync(process.execPath,args,{timeout:240000,stdio:['ignore',stdout,stderr],env:{...process.env,USC4_CALLBACK_JSON:callbackPath,FORCE_COLOR:'0'}});}
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
function physicalFault(id,plans,failures) {
 const dir=path.join(root,id+'-source');fs.mkdirSync(dir);
 a.equal(plans.length,4);a.equal(new Set(plans.map(p=>p.file)).size,4);
 const snapshots=plans.map(plan=>{
  const before=fs.readFileSync(plan.file);a.equal(sha(before),plan.fixedSHA);
  const legacy=cp.spawnSync('git',['show',process.env.EXPECTED_MAIN+':'+plan.file],{maxBuffer:2*1024*1024});
  a.equal(legacy.status,0);a.equal(legacy.signal,null);a.equal(legacy.error,undefined);
  a.equal(sha(legacy.stdout),plan.legacySHA);a.notDeepEqual(before,legacy.stdout);
  const name=path.basename(plan.file);
  fs.writeFileSync(path.join(dir,name+'.before-fixed.bin'),before,{flag:'wx'});
  fs.writeFileSync(path.join(dir,name+'.changed-original.bin'),legacy.stdout,{flag:'wx'});
  return {...plan,before,changed:legacy.stdout,name};
 });
 let result;
 try {
  for(const item of snapshots){fs.writeFileSync(item.file,item.changed);a.deepEqual(fs.readFileSync(item.file),item.changed);}
  heldExcept(snapshots.map(p=>p.file),dir);
  result=run(id,failures);
 } finally {
  const restores=[];
  for(const item of snapshots){
   fs.writeFileSync(item.file,item.before);a.deepEqual(fs.readFileSync(item.file),item.before);
   fs.writeFileSync(path.join(dir,item.name+'.restored-fixed.bin'),fs.readFileSync(item.file),{flag:'wx'});
   restores.push({file:item.file,beforeSHA256:sha(item.before),changedSHA256:sha(item.changed),restoredSHA256:sha(fs.readFileSync(item.file)),sameCanonicalFileRestored:true});
  }
  json(path.join(dir,'RESTORE.json'),restores);
 }
 return result;
}
const healthy=run('healthy',new Map());heldExcept(null,healthy.dir);
const oldHook=physicalFault('original-hooks',[{"file":"src/hooks/useNbaConnect4.ts","legacySHA":"d77ea9cdb4513dc1d7ec4568444f41241b4e64fc6543389a4c8862dbfc8c2ea0","fixedSHA":"9db63336365c6ae15af8258bebdbbe2b3dc3a4b9555e1b4804b8b08ba956299e"},{"file":"src/hooks/useNflConnect4.ts","legacySHA":"e8c83d55b77495f101f0741a0559d1da6cae099628c3391fd23c4fa95d963f92","fixedSHA":"91637ba20d1b1d63330ad0bfa3bdfa221410f748f74d62d2dc51ccac8c1814fe"},{"file":"src/hooks/useNhlConnect4.ts","legacySHA":"f4bb6d5e0664031e4d4bd6d45486f3be3dfc33759db6798ba1d09101fb07fccc","fixedSHA":"5b22fa80fd33c084f527fec4266e337a598b873448610bd5ced911c79e289ddf"},{"file":"src/hooks/useMlbConnect4.ts","legacySHA":"a374ce76370c45929932da15a2d52f47c5cc218d33f1514a782ad28f7185f05e","fixedSHA":"451acd6418168bb29fd7fd453cfffa7a44d53c8f68a0f6051dba0a0a51468a49"}],hookFailures);
const restoredHook=run('restored-hooks',new Map());heldExcept(null,restoredHook.dir);
const oldPage=physicalFault('original-pages',[{"file":"src/pages/NbaConnect4.tsx","legacySHA":"9a89e8b73b88e72babf41b850458aadbce22caa8dc66f7097f21099c2575d31d","fixedSHA":"11f7fc4a2bfaac7012c705c3c73a1641b810c37df1fc13a33bf65ee5aac3d490"},{"file":"src/pages/NflConnect4.tsx","legacySHA":"a6af6d9afaa9fede3e5244f77dc20d97ae5e14a16618747140fdeb52a15859d3","fixedSHA":"316c907162cbd699da56c0ad6e17fb929b54fd5dd4081195f649993d79da5f72"},{"file":"src/pages/NhlConnect4.tsx","legacySHA":"5dddfba4c15107f64a2b056c2a8d8731ff11c03507ae2b36529e2f640df21676","fixedSHA":"3be131c53f4bf65c1e7e3f48fed00d57ee2a9f5b93e765e87ae422676c51fff4"},{"file":"src/pages/MlbConnect4.tsx","legacySHA":"992a223f94ab7b9e2d9efbc69652f09473d6964d222ef5926cfde847361ae2bf","fixedSHA":"4f7d03757fccfabbf8c2f92c813ef108076b6df8d5f854c3bea3f4b59da6af86"}],pageFailures);
const restoredPage=run('restored-pages',new Map());heldExcept(null,restoredPage.dir);
const originalReport=JSON.parse(oldHook.bytes),originalCallback=JSON.parse(oldHook.callbackBytes);
const copy=path.join(root,'classifier-working-copy.json'),callbackCopy=path.join(root,'classifier-callback-working-copy.json');
fs.writeFileSync(copy,oldHook.bytes,{flag:'wx'});fs.writeFileSync(callbackCopy,oldHook.callbackBytes,{flag:'wx'});
const controls=[
 ['wrong-failure-count',r=>{r.numFailedTests+=1;},()=>{}],
 ['wrong-owned-cause',r=>{const row=r.testResults[0].assertionResults.find(x=>x.status==='failed');a(row);a.equal(row.failureMessages.length,1);row.failureMessages=['Synthetic unrelated failure'];},()=>{}],
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
json(path.join(out,'FOCUSED-ADMISSION.json'),{status:'ACTUAL_FIXED24_WITH_TWO_FOUR_FILE_PHYSICAL_INVERSES_AND_RESTORES',source:process.env.GITHUB_SHA,healthy:healthy.admission,oldHook:oldHook.admission,restoredHook:restoredHook.admission,oldPage:oldPage.admission,restoredPage:restoredPage.admission,classifierControls:controlRows,totalActualTestObservations:120,actualOwnedInverseFailures:20,allSourceByteHoldsAfterRestores:true});
console.log('US_CONNECT4_FOCUSED: fixed24 green; exact original4 canonical hooks16 owned RED and8 preservation passes; same hooks restored24 green; original4 Pages4 owned RED and20 passes; same Pages restored24 green;4 changed copied classifier refusals/restores, no skips/todo/callback errors.');
