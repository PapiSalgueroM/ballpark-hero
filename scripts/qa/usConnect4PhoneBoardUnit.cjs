const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),cp=require('node:child_process');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const out=process.env.PHONE_UNIT_OUT,cwd=process.cwd(),target='src/test/usConnect4ValidationLock.test.tsx';
a(out&&path.isAbsolute(out));a(path.relative(cwd,out).startsWith('..')||path.isAbsolute(path.relative(cwd,out)),'PHONE_UNIT_OUTSIDE_CHECKOUT');
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const titles=["a pending NBA answer ignores Skip and gives the next turn only after acceptance","NBA hook API synchronously locks a second submit, Skip and column selection","NBA keeps the pending turn and square through unverified and accepts the same-turn retry","NBA keeps the pending turn and square through 429 and accepts the same-turn retry","NBA keeps the pending turn and square through transport and accepts the same-turn retry","NBA still accepts a normal answer after ordinary Skip and selection","a pending NFL answer ignores Skip and gives the next turn only after acceptance","NFL hook API synchronously locks a second submit, Skip and column selection","NFL keeps the pending turn and square through unverified and accepts the same-turn retry","NFL keeps the pending turn and square through 429 and accepts the same-turn retry","NFL keeps the pending turn and square through transport and accepts the same-turn retry","NFL still accepts a normal answer after ordinary Skip and selection","a pending NHL answer ignores Skip and gives the next turn only after acceptance","NHL hook API synchronously locks a second submit, Skip and column selection","NHL keeps the pending turn and square through unverified and accepts the same-turn retry","NHL keeps the pending turn and square through 429 and accepts the same-turn retry","NHL keeps the pending turn and square through transport and accepts the same-turn retry","NHL still accepts a normal answer after ordinary Skip and selection","a pending MLB answer ignores Skip and gives the next turn only after acceptance","MLB hook API synchronously locks a second submit, Skip and column selection","MLB keeps the pending turn and square through unverified and accepts the same-turn retry","MLB keeps the pending turn and square through 429 and accepts the same-turn retry","MLB keeps the pending turn and square through transport and accepts the same-turn retry","MLB still accepts a normal answer after ordinary Skip and selection"];
a.equal(titles.length,24);a.equal(new Set(titles).size,24);
a.equal(process.env.EXPECTED_MAIN,'1589692185954298dcbd2fe6d14572f10c9bb0e7');
for(const name of ['GITHUB_SHA','EXPECTED_BASE','EXPECTED_PARENT'])a.match(process.env[name]??'',/^[a-f0-9]{40}$/,name);
a.equal(process.env.SIM_NETWORK,'offline');
a((process.env.NODE_OPTIONS??'').includes(path.resolve('scripts/lib/offlineTransport.cjs')),'PHONE_UNIT_OFFLINE_PRELOAD');
const pins=[
 ['package.json','acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31'],
 ['package-lock.json','c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76'],
 ['vitest.config.ts','6a68dd2f214dab4a3013eb41bad38eea65d703d61440002710ec246495e1c58a'],
 [target,'ab4d4534ed59b5337b8aa1629edfb628993db95f6f5426b44ce2a6c9d5eaf92d'],
 ['node_modules/vitest/dist/reporters.js','374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
 ['node_modules/vitest/dist/chunks/index.VByaPkjc.js','59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
 ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js','4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
];
const root=path.join(out,'unit');fs.mkdirSync(root);
const sourceRows=fs.readFileSync(path.join(out,'source.initial.sha256'),'utf8').trimEnd().split('\n').map(line=>{const m=line.match(/^([a-f0-9]{64})  (.+)$/);a(m);return {sha:m[1],path:m[2]};});
a.equal(sourceRows.length,Number(process.env.EXPECTED_SOURCE_COUNT));a.equal(sourceRows.length,5497);
a.equal(new Set(sourceRows.map(r=>r.path)).size,sourceRows.length);
const members=fs.readFileSync(path.join(out,'source-members.initial'),'utf8').split('\0').filter(Boolean);
a.deepEqual([...members].sort(),sourceRows.map(r=>r.path).sort(),'PHONE_UNIT_SOURCE_MEMBERS');
const canonical=path.resolve('scripts/qa/usConnect4PhoneBoardUnit.cjs'),self=fs.readFileSync(__filename);
a.deepEqual(fs.readFileSync(canonical),self,'PHONE_UNIT_CANONICAL_HELPER_COPY');
function held(id){
 const lines=sourceRows.map(r=>{a.equal(sha(fs.readFileSync(r.path)),r.sha,'unchanged source '+r.path);return r.path+': OK';});
 fs.writeFileSync(path.join(root,'source-'+id+'-held.log'),lines.join('\n')+'\n',{flag:'wx'});
 const api=pins.map(([file,expected])=>{const bytes=fs.readFileSync(file);a.equal(sha(bytes),expected,'PHONE_UNIT_LOCKED_INPUT '+file);return {path:file,bytes:bytes.length,sha256:expected};});
 json(path.join(root,'source-api-'+id+'.json'),api);a.deepEqual(fs.readFileSync(__filename),self);a.deepEqual(fs.readFileSync(canonical),self);
 const head=cp.spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});a.equal(head.status,0);a.equal(head.signal,null);a.equal(head.error,undefined);a.equal(head.stdout,process.env.GITHUB_SHA+'\n');a.equal(head.stderr,'');
 fs.writeFileSync(path.join(root,'head-'+id+'.txt'),head.stdout,{flag:'wx'});return api;
}
const before=held('before');
const reporter=[
 'import {JsonReporter} from '+JSON.stringify(pathToFileURL(path.resolve('node_modules/vitest/dist/reporters.js')).href)+';',
 "import fs from 'node:fs';",
 "import a from 'node:assert/strict';",
 'export default class RuntimeReporter extends JsonReporter {',
 ' async onFinished(files,errors,coverage) {',
 '  a(Array.isArray(files));a(Array.isArray(errors));',
 '  const task=n=>({name:n.name,state:n.result?.state??null,errors:(n.result?.errors??[]).map(e=>({message:e.message,actual:e.actual,expected:e.expected})),tasks:(n.tasks??[]).map(task)});',
 "  fs.writeFileSync(process.env.PHONE_UNIT_CALLBACK_JSON,JSON.stringify({source:process.env.GITHUB_SHA,arrayReceived:true,count:errors.length,errors:errors.map(e=>({name:e?.name,message:e?.message??String(e),stack:e?.stack})),files:files.map(f=>({filepath:f.filepath,task:task(f)}))},null,2)+'\\n',{flag:'wx'});",
 '  await super.onFinished(files,errors,coverage);',
 ' }',
 '}',
].join('\n')+'\n';
const reporterPath=path.join(root,'reporter.mjs'),resultPath=path.join(root,'result.json'),callbackPath=path.join(root,'callback.json'),receipt=path.join(root,'transport.jsonl');
fs.writeFileSync(reporterPath,reporter,{flag:'wx'});fs.writeFileSync(receipt,'',{flag:'wx'});
const args=[path.resolve('node_modules/vitest/vitest.mjs'),'run',target,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter='+reporterPath,'--outputFile='+resultPath];
const childEnv={...process.env,PHONE_UNIT_CALLBACK_JSON:callbackPath,SIM_OFFLINE_RECEIPT:receipt,FORCE_COLOR:'0'};
const unset=['NO_COLOR','ONLY','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE'];for(const key of unset)delete childEnv[key];
json(path.join(root,'environment.json'),{unset:unset.map(name=>({name,presentInActualChild:Object.hasOwn(childEnv,name)})),SIM_NETWORK:childEnv.SIM_NETWORK,NODE_OPTIONS:childEnv.NODE_OPTIONS,PHONE_UNIT_CALLBACK_JSON:callbackPath,SIM_OFFLINE_RECEIPT:receipt});
const x=fs.openSync(path.join(root,'stdout.log'),'wx'),y=fs.openSync(path.join(root,'stderr.log'),'wx');let child;
try{child=cp.spawnSync(process.execPath,args,{cwd,env:childEnv,timeout:300000,stdio:['ignore',x,y]});}finally{fs.closeSync(x);fs.closeSync(y);}
const processRecord={executable:process.execPath,args,status:child.status,signal:child.signal,error:child.error?String(child.error):null};
json(path.join(root,'process.json'),processRecord);fs.writeFileSync(path.join(root,'raw.exit'),String(child.status)+'\n',{flag:'wx'});
a.equal(child.status,0,'PHONE_UNIT_ACTUAL_RAW_ZERO');a.equal(child.signal,null);a.equal(child.error,undefined);a.equal(fs.readFileSync(receipt).length,0,'PHONE_UNIT_TRANSPORT_EMPTY');
const reportBytes=fs.readFileSync(resultPath),callbackBytes=fs.readFileSync(callbackPath);
const cli=(fs.readFileSync(path.join(root,'stdout.log'),'utf8')+'\n'+fs.readFileSync(path.join(root,'stderr.log'),'utf8')).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
function leaves(tree,found=[],parent=null){a(Array.isArray(tree.tasks));a.deepEqual(tree.errors,[],'PHONE_UNIT_TASK_ERRORS_ZERO');if(tree.tasks.length)tree.tasks.forEach(t=>leaves(t,found,tree));else found.push({task:tree,parent});return found;}
function judge(v){
 const r=v.report,b=v.callback;
 a.equal(v.process.status,0,'PHONE_UNIT_ACTUAL_RAW_ZERO');a.equal(v.process.signal,null);a.equal(v.process.error,null);
 a.equal(b.source,process.env.GITHUB_SHA);a.equal(b.arrayReceived,true);a.equal(b.count,0,'PHONE_UNIT_CALLBACK_ERRORS_ZERO');a.deepEqual(b.errors,[],'PHONE_UNIT_CALLBACK_ERRORS_ZERO');
 a.equal(r.numFailedTests,0,'PHONE_UNIT_ZERO_FAILURES');a.equal(r.numFailedTestSuites,0);a.equal(r.numPendingTests,0);a.equal(r.numTodoTests,0);a.equal(r.numPendingTestSuites,0);a.equal(r.success,true);a.equal(r.snapshot.failure,false);
 a.equal(r.numTotalTests,24,'PHONE_UNIT_EXPECTED_24_COUNTS');a.equal(r.numPassedTests,24,'PHONE_UNIT_EXPECTED_24_COUNTS');a.equal(r.numTotalTestSuites,1);a.equal(r.numPassedTestSuites,1);a.equal(r.testResults.length,1);
 const f=r.testResults[0];a.equal(path.resolve(f.name),path.resolve(target));a.equal(f.status,'passed');a.equal(f.message,'');a.equal(f.assertionResults.length,24,'PHONE_UNIT_EXPECTED_24_COUNTS');
 a.equal(b.files.length,1);a.equal(path.resolve(b.files[0].filepath),path.resolve(target));const actualTasks=leaves(b.files[0].task);
 a.equal(actualTasks.length,24,'PHONE_UNIT_EXPECTED_24_COUNTS');a.deepEqual(f.assertionResults.map(r=>r.title),titles,'PHONE_UNIT_EXACT_24_IDENTITIES');a.deepEqual(actualTasks.map(r=>r.task.name),titles,'PHONE_UNIT_EXACT_24_IDENTITIES');
 for(let i=0;i<24;i++){const row=f.assertionResults[i],task=actualTasks[i].task;a.deepEqual(row.ancestorTitles,[]);a.equal(row.fullName,titles[i]);a.equal(row.status,'passed');a.deepEqual(row.failureMessages,[]);a.equal(task.state,'pass');a.deepEqual(task.errors,[]);}
 for(const [label,n]of [['Test Files',1],['Tests',24]]){const hits=[...v.cli.matchAll(new RegExp('^\\s*'+label+'\\s+(\\d+) passed \\((\\d+)\\)\\s*$','gm'))];a.equal(hits.length,1,'PHONE_UNIT_DEFAULT_CLI_COUNTS');a.equal(Number(hits[0][1]),n,'PHONE_UNIT_DEFAULT_CLI_COUNTS');a.equal(Number(hits[0][2]),n,'PHONE_UNIT_DEFAULT_CLI_COUNTS');}
 a.equal((v.cli.match(/JSON report written to /g)??[]).length,1);a(v.cli.includes('JSON report written to '+resultPath));
 a.doesNotMatch(v.cli,/^\s*(?:Errors\s+[1-9]\d*\b|(?:Failed Tests|Failed Suites|Unhandled Errors|Unhandled Rejections|Unhandled Exceptions)\b)|Vitest caught[^\n]*unhandled|\b(?:Startup Error|Collect Error)\b|error during close/gim,'PHONE_UNIT_CLI_ERRORS_ZERO');
 return {passed:24,failed:0,skipped:0,todo:0,files:1,actualCallbackErrors:0};
}
const foundation={report:JSON.parse(reportBytes),callback:JSON.parse(callbackBytes),process:processRecord,cli};
const healthy=judge(foundation),foundationBytes=Buffer.from(JSON.stringify(foundation,null,2)+'\n');
json(path.join(root,'actual-case-identities.json'),foundation.report.testResults[0].assertionResults.map(r=>({file:target,title:r.title,ancestorTitles:r.ancestorTitles,fullName:r.fullName,status:r.status})));
fs.writeFileSync(path.join(root,'classifier-actual-foundation.json'),foundationBytes,{flag:'wx'});
const copy=path.join(root,'classifier-working-copy.json');fs.writeFileSync(copy,foundationBytes,{flag:'wx'});
const controls=[
 ['wrong-count','PHONE_UNIT_ZERO_FAILURES',v=>{v.report.numFailedTests=1;}],
 ['wrong-identity','PHONE_UNIT_EXACT_24_IDENTITIES',v=>{const first=v.report.testResults[0].assertionResults[0];first.title=first.fullName='COPIED_UNOWNED_CASE';leaves(v.callback.files[0].task)[0].task.name='COPIED_UNOWNED_CASE';}],
 ['runtime-callback','PHONE_UNIT_CALLBACK_ERRORS_ZERO',v=>{v.callback.count=1;v.callback.errors=[{name:'Error',message:'PHONE_UNIT_COPIED_CALLBACK_ERROR'}];}],
 ['dropped-positive','PHONE_UNIT_EXPECTED_24_COUNTS',v=>{const row=v.report.testResults[0].assertionResults.pop();a.equal(row.status,'passed');const last=leaves(v.callback.files[0].task).at(-1);a.equal(last.task.name,row.title);a(last.parent);last.parent.tasks.splice(last.parent.tasks.indexOf(last.task),1);v.report.numTotalTests--;v.report.numPassedTests--;const before=v.cli;v.cli=v.cli.replace(/^\s*Tests\s+24 passed \(24\)\s*$/m,'      Tests  23 passed (23)');a.notEqual(v.cli,before);}]
];
const results=[];
for(const[id,marker,change]of controls){
 const v=JSON.parse(foundationBytes);change(v);a.notEqual(JSON.stringify(v),JSON.stringify(foundation),'PHONE_UNIT_EFFECTIVE_SEMANTIC_CHANGE');
 const dir=path.join(root,'controls',id);fs.mkdirSync(dir,{recursive:true});let refusal,changed;
 try{fs.writeFileSync(copy,JSON.stringify(v,null,2)+'\n');changed=fs.readFileSync(copy);a.notDeepEqual(changed,foundationBytes);fs.writeFileSync(path.join(dir,'changed.json'),changed,{flag:'wx'});try{judge(JSON.parse(changed));}catch(e){refusal={name:e.name,message:e.message};}a(refusal);a.equal(refusal.name,'AssertionError');a(refusal.message.includes(marker),marker);}
 finally{fs.writeFileSync(copy,foundationBytes);}
 a.deepEqual(fs.readFileSync(copy),foundationBytes);a.deepEqual(judge(JSON.parse(fs.readFileSync(copy))),healthy);fs.writeFileSync(path.join(dir,'restored.json'),fs.readFileSync(copy),{flag:'wx'});
 const record={id,marker,refusal,beforeSHA256:sha(foundationBytes),changedSHA256:sha(changed),restoredSHA256:sha(fs.readFileSync(copy)),samePhysicalWorkingCopyRestored:true,semanticChanged:true,scope:'COPIED_REPORT_CLASSIFIER_ONLY',productFaultCredit:false};json(path.join(dir,'RESULT.json'),record);results.push(record);
}
a.deepEqual(fs.readFileSync(resultPath),reportBytes);a.deepEqual(fs.readFileSync(callbackPath),callbackBytes);a.equal(fs.readFileSync(reporterPath,'utf8'),reporter);a.equal(fs.readFileSync(receipt).length,0);
a.deepEqual(held('after'),before);a.deepEqual(fs.readFileSync(path.join(out,'source-members.initial'),'utf8').split('\0').filter(Boolean).sort(),[...members].sort());
json(path.join(out,'PHONE-UNIT-ADMISSION.json'),{status:'ACTUAL_EXISTING_24_US_CONNECT4_REGRESSIONS_PRESERVED',source:process.env.GITHUB_SHA,parent:process.env.EXPECTED_PARENT,base:process.env.EXPECTED_BASE,main:process.env.EXPECTED_MAIN,raw:child.status,...healthy,target,testSHA256:pins[3][1],caseIDs:titles,resultSHA256:sha(reportBytes),callbackSHA256:sha(callbackBytes),reporterSHA256:sha(Buffer.from(reporter)),controllerSHA256:sha(self),allSourceRowsHeld:sourceRows.length,sourceMembersHeld:true,actualHeadBeforeAfterHeld:true,classifierControls:results,unitPreservationOnly:true,fullSuiteCredit:false,visualOrLayoutCredit:false});
console.log('US_CONNECT4_PHONE_UNIT: actual24 existing regression cases passed with zero skips/todo/callback errors;4 physical classifier refusals and same-copy restores passed.');
