const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),cp=require('node:child_process');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const out=process.env.DAILY_DATE_OUT,cwd=process.cwd();
a(out&&path.isAbsolute(out),'DAILY_DATE_OUTPUT');
const relative=path.relative(cwd,out);a(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'DAILY_DATE_OUTPUT_OUTSIDE_CHECKOUT');
const sha=b=>createHash('sha256').update(b).digest('hex');
const json=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const specs=[{"file":"src/test/faceOffDailyDate.test.tsx","sha256":"1fc71e45c3238d59a7c2969832286c6e42c0797d0f062a8a15afe4c1213bbd06","ancestorTitles":["Face Off daily date ownership"],"titles":["stale-menu-start-deals-click-day","overnight-result-keeps-deal-day","overnight-share-keeps-deal-day","overnight-menu-leaves-new-daily-open","same-day-and-unranked-mode-preservation"],"failures":[["overnight-result-keeps-deal-day","FACEOFF_DAILY_DATE_RECORD"],["overnight-share-keeps-deal-day","FACEOFF_DAILY_DATE_SHARE"],["overnight-menu-leaves-new-daily-open","FACEOFF_DAILY_DATE_NEXT_DAY_UNLOCK"]]},{"file":"src/test/minefieldDailyDate.test.tsx","sha256":"eac2f75f870d896ea02aa7b310dd322f3b49fe8d8f0b355b4f7628448cf9da6d","ancestorTitles":["Minefield daily date ownership"],"titles":["MF-DATE-01: delayed Daily Boards keeps mount-day identities and saves that day","MF-DATE-02: another tab finish after rollover restores mount-day score and real maximum","MF-DATE-03: same-day finish restores once and a new-day reload deals its own boards","MF-DATE-04: Unlimited keeps random boards and does not save a daily finish"],"failures":[["MF-DATE-01: delayed Daily Boards keeps mount-day identities and saves that day","MF-DATE-01: ordered board identity 1"],["MF-DATE-02: another tab finish after rollover restores mount-day score and real maximum","MF-DATE-02: restored mount-day maximum"]]},{"file":"src/test/faceOffDeadline.test.tsx","sha256":"d1e06962ac3ee0dedc998ca4d93f747d9d994730f4fc18b93e223b8c1e7021fb","ancestorTitles":["Face Off answer-time deadline"],"titles":["preserves early correct daily scoring and one settlement","preserves early correct unlimited scoring and one settlement","preserves early wrong daily scoring","preserves early wrong unlimited scoring","preserves ordinary interval timeout and starts the next round with a new clock","rejects daily correct input at 10000ms while interval callbacks are delayed","rejects daily correct input at 11000ms while interval callbacks are delayed","rejects unlimited correct input at 10000ms while interval callbacks are delayed","rejects unlimited correct input at 11000ms while interval callbacks are delayed","rejects Player 1 at 10000ms and preserves Player 2 own early clock","rejects Player 1 at 11000ms and preserves Player 2 own early clock","rejects Player 2 at 10000ms and preserves Player 1 early score","rejects Player 2 at 11000ms and preserves Player 1 early score","settles both expired chairs once without changing their round","settles an expired solo pick once even when click and timeout meet"],"failures":[]}].map(s=>({...s,rows:s.titles.map(title=>({title,ancestorTitles:s.ancestorTitles,fullName:[...s.ancestorTitles,title].join(' '),baseline:s.failures.some(([name])=>name===title)?'failed':'passed',marker:s.failures.find(([name])=>name===title)?.[1]??null}))}));
const targets=specs.map(s=>s.file),total=specs.reduce((n,s)=>n+s.rows.length,0),originalFailed=specs.reduce((n,s)=>n+s.rows.filter(r=>r.baseline==='failed').length,0);
a.equal(specs.length,3);a.equal(new Set(targets).size,3);a.equal(total,24);a.equal(originalFailed,5);
a.equal(process.env.EXPECTED_MAIN,'c18c4b7a805a790288fa82d1dbe89085dec8eb1a');a.equal(process.env.EXPECTED_BASE,process.env.EXPECTED_MAIN);
for(const name of ['GITHUB_SHA','EXPECTED_PARENT'])a.match(process.env[name]??'',/^[a-f0-9]{40}$/,name);
a.equal(process.env.SIM_NETWORK,'offline');a((process.env.NODE_OPTIONS??'').includes(path.resolve('scripts/lib/offlineTransport.cjs')),'DAILY_DATE_OFFLINE_PRELOAD');
const pins=[
 ['package.json','acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31'],
 ['package-lock.json','c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76'],
 ['vitest.config.ts','6a68dd2f214dab4a3013eb41bad38eea65d703d61440002710ec246495e1c58a'],
 ['src/hooks/useFaceOff.ts','48b7d70df6b0a2fce7bac4d9bc66f116cc4f72102a1648c639c461c6ca3c04ac'],
 ['src/pages/Minefield.tsx','8a1166134383adc1f1111b55a0aa5619c03396dbf81e2b5cd0edf9b1896017a2'],
 ['src/lib/faceOff.ts','f42c1d7810041d591cb0cbd45325e1d3e4accda092d31da6707bbfbbee1a71e9'],
 ['src/lib/minefield.ts','38ace510b002376db250e88c1b20499edfa90dcb2463a41470c0007733fa4272'],
 ['src/lib/dateUtils.ts','90cc431b127059c58d3a64c98508e97ed96620dee44c4bd8b6e5a4abd0d30966'],
 ['node_modules/vitest/dist/reporters.js','374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
 ['node_modules/vitest/dist/chunks/index.VByaPkjc.js','59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
 ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js','4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
 ['node_modules/@vitest/runner/dist/chunk-hooks.js','5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
 ['node_modules/@vitest/utils/dist/error.js','db4fb717645c259e9149beead55e48b85252646e3383e0b6fcef7f657f7f6c12'],
 ['node_modules/@vitest/expect/dist/index.js','dd1e7e900565b46dd15eb7bf729b0b5b7a17f27a9e721527b74d43e888eb3650'],
 ['node_modules/chai/index.js','a38c60a6984fc6342eeacbbd676fb66a8fe1b06d67a5bc60e3431a94c347223e'],
 ...specs.map(s=>[s.file,s.sha256]),
];
const root=path.join(out,'focused-fixed');fs.mkdirSync(root);
const sourceRows=fs.readFileSync(path.join(out,'source.initial.sha256'),'utf8').trimEnd().split('\n').map(line=>{const m=line.match(/^([a-f0-9]{64})  (.+)$/);a(m);return {sha:m[1],path:m[2]};});
a.equal(sourceRows.length,Number(process.env.EXPECTED_SOURCE_COUNT));a.equal(sourceRows.length,5496);a.equal(new Set(sourceRows.map(r=>r.path)).size,5496);
const members=fs.readFileSync(path.join(out,'source-members.initial'),'utf8').split('\0').filter(Boolean);
a.deepEqual([...members].sort(),sourceRows.map(r=>r.path).sort(),'DAILY_DATE_SOURCE_MEMBERS');
const canonical=path.resolve('scripts/qa/dailyDateFocused.cjs'),self=fs.readFileSync(__filename);a.deepEqual(fs.readFileSync(canonical),self,'DAILY_DATE_CANONICAL_HELPER_COPY');
const originalSources={
 'src/hooks/useFaceOff.ts':{fixedSHA256:'48b7d70df6b0a2fce7bac4d9bc66f116cc4f72102a1648c639c461c6ca3c04ac',fixedBytes:7282,originalSHA256:'04cd26444878b53fe3fa7aa84c8e8661c8520c671c4b0e9b707d4da3ea7df55c',originalBytes:7107,originalGit:'dbfd95873176f779d1ef7958bd8063c712865186'},
 'src/pages/Minefield.tsx':{fixedSHA256:'8a1166134383adc1f1111b55a0aa5619c03396dbf81e2b5cd0edf9b1896017a2',fixedBytes:14712,originalSHA256:'b1b0f2a9d79972873384111eaccc945ebdc3e015d6ed9e197186b790afefbc5b',originalBytes:14680,originalGit:'b8baee6a10b2a642de41716b0c5d2fcb7c3308ba'},
};
const modeFile={fixed:null,'faceoff-original-fault':'src/test/faceOffDailyDate.test.tsx','minefield-original-fault':'src/test/minefieldDailyDate.test.tsx'};
const ownedFor=(spec,row,mode)=>modeFile[mode]===spec.file&&row.baseline==='failed';
let refsBefore;
let gitReadIndex=0;
function git(args){
 const dir=path.join(root,'git-read-'+(++gitReadIndex));fs.mkdirSync(dir);
 const stdout=path.join(dir,'stdout.log'),stderr=path.join(dir,'stderr.log');
 const x=fs.openSync(stdout,'wx'),y=fs.openSync(stderr,'wx');let p;
 try{p=cp.spawnSync('git',args,{stdio:['ignore',x,y]});}finally{fs.closeSync(x);fs.closeSync(y);}
 json(path.join(dir,'process.json'),{args,status:p.status,signal:p.signal,error:p.error?{name:p.error.name,code:p.error.code,message:p.error.message}:null,outputCapture:'FILE_BACKED_NO_PIPE_BUFFER'});
 a.equal(p.status,0);a.equal(p.signal,null);a.equal(p.error,undefined);a.equal(fs.readFileSync(stderr,'utf8'),'');return fs.readFileSync(stdout,'utf8');
}
function held(id,overrides={}){
 const keys=Object.keys(overrides);a(keys.length<=1,'DAILY_DATE_SINGLE_OWNED_SOURCE_EXCEPTION');
 for(const file of keys){a(Object.hasOwn(originalSources,file),'DAILY_DATE_OWNED_SOURCE_EXCEPTION');a.equal(overrides[file],originalSources[file].originalSHA256,'DAILY_DATE_OWNED_SOURCE_EXCEPTION');}
 const lines=sourceRows.map(r=>{const expected=overrides[r.path]??r.sha;a.equal(sha(fs.readFileSync(r.path)),expected,'unchanged source '+r.path);return r.path+': OK';});
 fs.writeFileSync(path.join(root,'source-'+id+'-held.log'),lines.join('\n')+'\n',{flag:'wx'});
 const actual=pins.map(([file,fixed])=>{const expected=overrides[file]??fixed,bytes=fs.readFileSync(file);a.equal(sha(bytes),expected,'DAILY_DATE_LOCKED_INPUT '+file);return {path:file,bytes:bytes.length,sha256:expected};});json(path.join(root,'source-api-'+id+'.json'),actual);
 a.deepEqual(fs.readFileSync(__filename),self);a.deepEqual(fs.readFileSync(canonical),self);a.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA+'\n');
 const refs=git(['for-each-ref','--format=%(refname) %(objectname)']);if(refsBefore===undefined)refsBefore=refs;else a.equal(refs,refsBefore,'DAILY_DATE_REFS_HELD');fs.writeFileSync(path.join(root,'refs-'+id+'.txt'),refs,{flag:'wx'});
 a.deepEqual(git(['ls-files','-z']).split('\0').filter(Boolean).sort(),[...members].sort(),'DAILY_DATE_TRACKED_MEMBERS_HELD');return actual;
}
const initial=held('initial-fixed'),fixedBuffers=new Map(),originalBuffers=new Map();
for(const[file,entry]of Object.entries(originalSources)){
 const fixed=fs.readFileSync(file);a.equal(fixed.length,entry.fixedBytes);a.equal(sha(fixed),entry.fixedSHA256);a.equal(sourceRows.find(r=>r.path===file)?.sha,entry.fixedSHA256);fixedBuffers.set(file,fixed);
 a.equal(git(['rev-parse',process.env.EXPECTED_MAIN+':'+file]),entry.originalGit+'\n','DAILY_DATE_ORIGINAL_MAIN_GIT_BODY');
 const original=Buffer.from(git(['show',process.env.EXPECTED_MAIN+':'+file]),'utf8');a.equal(original.length,entry.originalBytes);a.equal(sha(original),entry.originalSHA256);a.notDeepEqual(original,fixed,'DAILY_DATE_ORIGINAL_BODY_EFFECTIVE');originalBuffers.set(file,original);
}
json(path.join(root,'original-source-pins.json'),{main:process.env.EXPECTED_MAIN,files:originalSources});
const reporter=[
 'import {JsonReporter} from '+JSON.stringify(pathToFileURL(path.resolve('node_modules/vitest/dist/reporters.js')).href)+';',
 "import fs from 'node:fs';",
 "import a from 'node:assert/strict';",
 'export default class RuntimeReporter extends JsonReporter {',
 ' async onFinished(files,errors,coverage) {',
 '  a(Array.isArray(files));a(Array.isArray(errors));',
 '  const task=n=>({name:n.name,type:n.type,mode:n.mode,state:n.result?.state??null,errors:(n.result?.errors??[]).map(e=>({name:e.name,message:e.message,actual:e.actual,expected:e.expected})),tasks:(n.tasks??[]).map(task)});',
 "  fs.writeFileSync(process.env.DAILY_DATE_CALLBACK_JSON,JSON.stringify({source:process.env.GITHUB_SHA,arrayReceived:true,count:errors.length,errors:errors.map(e=>({name:e?.name,message:e?.message??String(e),stack:e?.stack})),files:files.map(f=>({filepath:f.filepath,task:task(f)}))},null,2)+'\\n',{flag:'wx'});",
 '  await super.onFinished(files,errors,coverage);',
 ' }',
 '}',
].join('\n')+'\n';
const reporterPath=path.join(root,'reporter.mjs');fs.writeFileSync(reporterPath,reporter,{flag:'wx'});
const stageRecords=[],originalReports=[];
function runStage(name,mode,overrides={}){
 a(Object.hasOwn(modeFile,mode),'DAILY_DATE_STAGE_MODE');
 const dir=path.join(root,name);fs.mkdirSync(dir);
 const resultPath=path.join(dir,'result.json'),callbackPath=path.join(dir,'callback.json'),receipt=path.join(dir,'transport.jsonl');
 fs.writeFileSync(receipt,'',{flag:'wx'});const before=held(name+'-before',overrides);
 const args=[path.resolve('node_modules/vitest/vitest.mjs'),'run',...targets,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter='+reporterPath,'--outputFile='+resultPath];
 const childEnv={...process.env,DAILY_DATE_CALLBACK_JSON:callbackPath,SIM_OFFLINE_RECEIPT:receipt,FORCE_COLOR:'0'};
 const unset=['NO_COLOR','ONLY','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE','DAILY_RELOAD_CONTROL'];for(const key of unset)delete childEnv[key];
 json(path.join(dir,'environment.json'),{unset:unset.map(name=>({name,presentInActualChild:Object.hasOwn(childEnv,name)})),SIM_NETWORK:childEnv.SIM_NETWORK,NODE_OPTIONS:childEnv.NODE_OPTIONS,DAILY_DATE_CALLBACK_JSON:callbackPath,SIM_OFFLINE_RECEIPT:receipt});
 const x=fs.openSync(path.join(dir,'stdout.log'),'wx'),y=fs.openSync(path.join(dir,'stderr.log'),'wx');let child;
 try{child=cp.spawnSync(process.execPath,args,{cwd,env:childEnv,timeout:300000,stdio:['ignore',x,y]});}finally{fs.closeSync(x);fs.closeSync(y);}
 const processRecord={executable:process.execPath,args,status:child.status,signal:child.signal,error:child.error?String(child.error):null};json(path.join(dir,'process.json'),processRecord);fs.writeFileSync(path.join(dir,'raw.exit'),String(child.status)+'\n',{flag:'wx'});
 const cli=(fs.readFileSync(path.join(dir,'stdout.log'),'utf8')+'\n'+fs.readFileSync(path.join(dir,'stderr.log'),'utf8')).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
 try{
  a.equal(fs.readFileSync(receipt).length,0,'DAILY_DATE_TRANSPORT_EMPTY');
  const reportBytes=fs.readFileSync(resultPath),callbackBytes=fs.readFileSync(callbackPath);
  const foundation={report:JSON.parse(reportBytes),callback:JSON.parse(callbackBytes),process:processRecord,cli},admission=judge(foundation,mode,resultPath);
  const foundationBytes=Buffer.from(JSON.stringify(foundation,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'actual-foundation.json'),foundationBytes,{flag:'wx'});
  json(path.join(dir,'actual-case-identities.json'),foundation.report.testResults.flatMap(f=>f.assertionResults.map(r=>({file:path.relative(cwd,f.name).split(path.sep).join('/'),title:r.title,ancestorTitles:r.ancestorTitles,fullName:r.fullName,status:r.status}))));
  const record={name,mode,raw:child.status,...admission,resultSHA256:sha(reportBytes),callbackSHA256:sha(callbackBytes),foundationSHA256:sha(foundationBytes),sourceExceptions:Object.entries(overrides).map(([file,sha256])=>({file,sha256})),allOtherSourceRowsHeld:5496-Object.keys(overrides).length};
  json(path.join(dir,'STAGE-ADMISSION.json'),record);stageRecords.push(record);originalReports.push({resultPath,callbackPath,reportBytes,callbackBytes});
  return {name,mode,dir,resultPath,callbackPath,reportBytes,callbackBytes,foundation,foundationBytes,admission,record};
 }finally{a.deepEqual(held(name+'-after',overrides),before);a.equal(fs.readFileSync(reporterPath,'utf8'),reporter);a.equal(fs.readFileSync(receipt).length,0,'DAILY_DATE_TRANSPORT_EMPTY');}
}
function judge(v,mode,resultPath){
 a(Object.hasOwn(modeFile,mode),'DAILY_DATE_STAGE_MODE');const failed=specs.reduce((n,s)=>n+s.rows.filter(row=>ownedFor(s,row,mode)).length,0);const r=v.report,b=v.callback;a.equal(v.process.status,failed===0?0:1,'DAILY_DATE_ACTUAL_STAGE_RAW');a.equal(v.process.signal,null,'DAILY_DATE_ACTUAL_STAGE_RAW');a.equal(v.process.error,null,'DAILY_DATE_ACTUAL_STAGE_RAW');
 a.equal(b.source,process.env.GITHUB_SHA);a.equal(b.arrayReceived,true);a.equal(b.count,0,'DAILY_DATE_CALLBACK_ERRORS_ZERO');a.deepEqual(b.errors,[],'DAILY_DATE_CALLBACK_ERRORS_ZERO');
 a.equal(r.numTotalTests,total,'DAILY_DATE_EXACT_COUNTS');a.equal(r.numFailedTests,failed,'DAILY_DATE_EXACT_COUNTS');a.equal(r.numPassedTests,total-failed,'DAILY_DATE_EXACT_COUNTS');a.equal(r.numPendingTests,0);a.equal(r.numTodoTests,0);a.equal(r.numPendingTestSuites,0);a.equal(r.success,failed===0);a.equal(r.snapshot.failure,false);
 a.equal(r.testResults.length,3,'DAILY_DATE_EXACT_IDENTITIES');a.equal(b.files.length,3,'DAILY_DATE_EXACT_IDENTITIES');
 const byPath=values=>{const m=new Map();for(const row of values){const key=path.resolve(row.name??row.filepath);a(!m.has(key),'DAILY_DATE_EXACT_IDENTITIES');m.set(key,row);}a.deepEqual([...m.keys()].sort(),targets.map(f=>path.resolve(f)).sort(),'DAILY_DATE_EXACT_IDENTITIES');return m;};
 const files=byPath(r.testResults),callbacks=byPath(b.files),observed=[],suites={total:0,failed:0,passed:0};let failedFiles=0;
 for(const spec of specs){
  const f=files.get(path.resolve(spec.file)),actual=callbacks.get(path.resolve(spec.file)),leaves=[];
  const walk=(task,ancestors=[],isFile=true)=>{
   a(Array.isArray(task.tasks),'DAILY_DATE_TASK_INFRA_ZERO');a(Array.isArray(task.errors),'DAILY_DATE_TASK_INFRA_ZERO');a.equal(task.mode,'run','DAILY_DATE_TASK_INFRA_ZERO');
   if(task.tasks.length){a.equal(task.type,'suite','DAILY_DATE_TASK_INFRA_ZERO');a.deepEqual(task.errors,[],'DAILY_DATE_TASK_INFRA_ZERO');const childAncestors=isFile?ancestors:[...ancestors,task.name],anyFailure=task.tasks.map(t=>walk(t,childAncestors,false)).some(Boolean);a.equal(task.state,anyFailure?'fail':'pass','DAILY_DATE_TASK_INFRA_ZERO');suites.total++;suites[anyFailure?'failed':'passed']++;return anyFailure;}
   a.equal(task.type,'test','DAILY_DATE_TASK_INFRA_ZERO');const at=leaves.length,expected=spec.rows[at];a(expected,'DAILY_DATE_EXACT_IDENTITIES');a.equal(task.name,expected.title,'DAILY_DATE_EXACT_IDENTITIES');a.deepEqual(ancestors,expected.ancestorTitles,'DAILY_DATE_EXACT_IDENTITIES');leaves.push(task);return ownedFor(spec,expected,mode);
  };
  const fileFailed=walk(actual.task);if(fileFailed)failedFiles++;a.equal(f.status,fileFailed?'failed':'passed');a.equal(typeof f.message,'string');if(!fileFailed)a.equal(f.message,'');
  a.equal(f.assertionResults.length,spec.rows.length,'DAILY_DATE_EXACT_IDENTITIES');a.equal(leaves.length,spec.rows.length,'DAILY_DATE_EXACT_IDENTITIES');
  for(let i=0;i<spec.rows.length;i++){
   const expected=spec.rows[i],row=f.assertionResults[i],task=leaves[i],owned=ownedFor(spec,expected,mode);a.equal(row.title,expected.title,'DAILY_DATE_EXACT_IDENTITIES');a.deepEqual(row.ancestorTitles,expected.ancestorTitles,'DAILY_DATE_EXACT_IDENTITIES');a.equal(row.fullName,expected.fullName,'DAILY_DATE_EXACT_IDENTITIES');a.equal(row.status,owned?'failed':'passed','DAILY_DATE_EXACT_OWNED_CAUSES');a.equal(task.state,owned?'fail':'pass','DAILY_DATE_EXACT_OWNED_CAUSES');
   if(owned){a.equal(typeof expected.marker,'string');a.equal(row.failureMessages.length,1,'DAILY_DATE_EXACT_OWNED_CAUSES');a(row.failureMessages[0].includes(expected.marker),'DAILY_DATE_EXACT_OWNED_CAUSES');a.equal(task.errors.length,1,'DAILY_DATE_EXACT_OWNED_CAUSES');a.equal(task.errors[0].name,'AssertionError','DAILY_DATE_EXACT_OWNED_CAUSES');a(task.errors[0].message.includes(expected.marker),'DAILY_DATE_EXACT_OWNED_CAUSES');observed.push({file:spec.file,title:row.title,ancestorTitles:row.ancestorTitles,fullName:row.fullName,marker:expected.marker,name:task.errors[0].name,message:task.errors[0].message,actual:task.errors[0].actual,expected:task.errors[0].expected});}
   else{a.deepEqual(row.failureMessages,[],'DAILY_DATE_EXACT_OWNED_CAUSES');a.deepEqual(task.errors,[],'DAILY_DATE_EXACT_OWNED_CAUSES');}
  }
 }
 a.equal(observed.length,failed,'DAILY_DATE_EXACT_COUNTS');a.equal(r.numTotalTestSuites,suites.total,'DAILY_DATE_ACTUAL_SUITE_AGGREGATES');a.equal(r.numFailedTestSuites,suites.failed,'DAILY_DATE_ACTUAL_SUITE_AGGREGATES');a.equal(r.numPassedTestSuites,suites.passed,'DAILY_DATE_ACTUAL_SUITE_AGGREGATES');
 for(const[label,fail,pass,n]of[['Test Files',failedFiles,3-failedFiles,3],['Tests',failed,total-failed,total]]){
  const pattern=fail?'^\\s*'+label+'\\s+(\\d+) failed \\| (\\d+) passed \\((\\d+)\\)\\s*$':'^\\s*'+label+'\\s+(\\d+) passed \\((\\d+)\\)\\s*$';
  const hits=[...v.cli.matchAll(new RegExp(pattern,'gm'))];a.equal(hits.length,1,'DAILY_DATE_DEFAULT_CLI_COUNTS');
  if(fail){a.equal(Number(hits[0][1]),fail,'DAILY_DATE_DEFAULT_CLI_COUNTS');a.equal(Number(hits[0][2]),pass,'DAILY_DATE_DEFAULT_CLI_COUNTS');a.equal(Number(hits[0][3]),n,'DAILY_DATE_DEFAULT_CLI_COUNTS');}
  else{a.equal(Number(hits[0][1]),pass,'DAILY_DATE_DEFAULT_CLI_COUNTS');a.equal(Number(hits[0][2]),n,'DAILY_DATE_DEFAULT_CLI_COUNTS');}
 }
 a.equal((v.cli.match(/JSON report written to /g)??[]).length,1);a(v.cli.includes('JSON report written to '+resultPath));a.doesNotMatch(v.cli,/^\s*(?:Errors\s+[1-9]\d*\b|(?:Failed Suites|Unhandled Errors|Unhandled Rejections|Unhandled Exceptions)\b)|Vitest caught[^\n]*unhandled|\b(?:Startup Error|Collect Error)\b|error during close/gim,'DAILY_DATE_CLI_INFRA_ZERO');
 return {mode,total,passed:total-failed,ownedFailed:failed,files:3,failedFiles,actualSuiteAggregates:suites,skipped:0,todo:0,callbackErrors:0,taskInfraErrors:0,observed};
}
function classifierControls(stage){
 a.equal(stage.mode,'faceoff-original-fault');a.equal(stage.admission.ownedFailed,3);
 const foundation=stage.foundation,foundationBytes=stage.foundationBytes,admission=stage.admission;
 fs.writeFileSync(path.join(root,'classifier-actual-foundation.json'),foundationBytes,{flag:'wx'});
 const copy=path.join(root,'classifier-working-copy.json');fs.writeFileSync(copy,foundationBytes,{flag:'wx'});
 const controls=[
  ['wrong-count','DAILY_DATE_EXACT_COUNTS',v=>{v.report.numFailedTests++;}],
  ['wrong-owned-cause','DAILY_DATE_EXACT_OWNED_CAUSES',v=>{const row=v.report.testResults.flatMap(f=>f.assertionResults).find(r=>r.status==='failed');a(row);row.failureMessages=['DAILY_DATE_COPIED_UNOWNED_FAILURE'];}],
  ['wrong-identity','DAILY_DATE_EXACT_IDENTITIES',v=>{const row=v.report.testResults[0].assertionResults[0];row.title='DAILY_DATE_COPIED_UNOWNED_ID';}],
  ['runtime-callback','DAILY_DATE_CALLBACK_ERRORS_ZERO',v=>{v.callback.count=1;v.callback.errors=[{name:'Error',message:'DAILY_DATE_COPIED_CALLBACK_ERROR'}];}],
  ['task-suite-error','DAILY_DATE_TASK_INFRA_ZERO',v=>{a.equal(v.callback.files[0].task.errors.length,0);v.callback.files[0].task.errors.push({name:'Error',message:'DAILY_DATE_COPIED_SUITE_ERROR'});}]
 ];
 const records=[];for(const[id,marker,change]of controls){const v=JSON.parse(foundationBytes);change(v);a.notEqual(JSON.stringify(v),JSON.stringify(foundation),'DAILY_DATE_EFFECTIVE_SEMANTIC_CHANGE');const dir=path.join(root,'controls',id);fs.mkdirSync(dir,{recursive:true});let refusal,changed;
  try{fs.writeFileSync(copy,JSON.stringify(v,null,2)+'\n');changed=fs.readFileSync(copy);a.notDeepEqual(changed,foundationBytes);fs.writeFileSync(path.join(dir,'changed.json'),changed,{flag:'wx'});try{judge(JSON.parse(changed),stage.mode,stage.resultPath);}catch(e){refusal={name:e.name,message:e.message};}a(refusal);a.equal(refusal.name,'AssertionError');a(refusal.message.includes(marker),marker);}
  finally{fs.writeFileSync(copy,foundationBytes);a.deepEqual(fs.readFileSync(copy),foundationBytes);a.deepEqual(judge(JSON.parse(fs.readFileSync(copy)),stage.mode,stage.resultPath),admission);fs.writeFileSync(path.join(dir,'restored.json'),fs.readFileSync(copy),{flag:'wx'});}
  const row={id,marker,refusal,beforeSHA256:sha(foundationBytes),changedSHA256:sha(changed),restoredSHA256:sha(fs.readFileSync(copy)),samePhysicalWorkingCopyRestored:true,semanticChanged:true,scope:'COPIED_ACTUAL_CLASSIFIER_ONLY',productFaultCredit:false};json(path.join(dir,'RESULT.json'),row);records.push(row);
 }
 a.equal(records.length,5);a.deepEqual(fs.readFileSync(stage.resultPath),stage.reportBytes);a.deepEqual(fs.readFileSync(stage.callbackPath),stage.callbackBytes);return records;
}
const physicalControls=[];let copiedControls;
function physicalFault(file,name,mode,restoreName,withClassifiers){
 const entry=originalSources[file],saved=fixedBuffers.get(file),original=originalBuffers.get(file);a(entry&&saved&&original);a.deepEqual(fs.readFileSync(file),saved);
 const overrides={[file]:entry.originalSHA256};let fault,restore,problem;
 try{
  fs.writeFileSync(file,original);const actual=fs.readFileSync(file);a.deepEqual(actual,original);a.notDeepEqual(actual,saved,'DAILY_DATE_PHYSICAL_APP_FAULT_EFFECTIVE');
  held(name+'-installed',overrides);fault=runStage(name,mode,overrides);
  if(withClassifiers)copiedControls=classifierControls(fault);
 }catch(error){problem=error;json(path.join(root,name+'-ERROR.json'),{name:error.name,message:error.message,stack:error.stack});}
 finally{
  fs.writeFileSync(file,saved);a.deepEqual(fs.readFileSync(file),saved,'DAILY_DATE_SAME_BUFFER_APP_RESTORE');
  held(name+'-same-buffer-restored');restore=runStage(restoreName,'fixed');
 }
 if(problem)throw problem;
 const row={id:name,file,main:process.env.EXPECTED_MAIN,originalGit:entry.originalGit,beforeSHA256:sha(saved),changedSHA256:sha(original),restoredSHA256:sha(fs.readFileSync(file)),semanticChanged:true,sameBufferRestored:true,onlyMutatedAppFile:file,fault: fault.record,restored:restore.record};
 a.equal(row.changedSHA256,entry.originalSHA256);a.equal(row.restoredSHA256,entry.fixedSHA256);json(path.join(root,name+'-RESULT.json'),row);physicalControls.push(row);
}
try{
 runStage('fixed-baseline','fixed');
 physicalFault('src/hooks/useFaceOff.ts','faceoff-original-fault','faceoff-original-fault','fixed-after-faceoff-restore',true);
 physicalFault('src/pages/Minefield.tsx','minefield-original-fault','minefield-original-fault','fixed-after-minefield-restore',false);
 a.equal(physicalControls.length,2);a.equal(copiedControls.length,5);
 a.deepEqual(stageRecords.map(r=>r.name),['fixed-baseline','faceoff-original-fault','fixed-after-faceoff-restore','minefield-original-fault','fixed-after-minefield-restore']);
 for(const run of stageRecords){a.equal(run.total,24);a.equal(run.skipped,0);a.equal(run.todo,0);a.equal(run.callbackErrors,0);a.equal(run.taskInfraErrors,0);}
 a.deepEqual(stageRecords.map(r=>r.passed),[24,21,24,22,24]);a.deepEqual(stageRecords.map(r=>r.ownedFailed),[0,3,0,2,0]);
}finally{
 for(const[file,saved]of fixedBuffers)a.deepEqual(fs.readFileSync(file),saved,'DAILY_DATE_FINAL_FIXED_BUFFERS_HELD');
 a.deepEqual(held('final-fixed'),initial);a.equal(fs.readFileSync(reporterPath,'utf8'),reporter);
 for(const run of originalReports){a.deepEqual(fs.readFileSync(run.resultPath),run.reportBytes);a.deepEqual(fs.readFileSync(run.callbackPath),run.callbackBytes);}
}
json(path.join(out,'DAILY-DATE-FIXED-ADMISSION.json'),{status:'ACTUAL_FOCUSED_DATE_FIXES_AND_TWO_ORIGINAL_SOURCE_FAULTS_RESTORED',source:process.env.GITHUB_SHA,parent:process.env.EXPECTED_PARENT,base:process.env.EXPECTED_BASE,main:process.env.EXPECTED_MAIN,uniqueCases:24,actualCaseExecutions:120,passedAcrossStages:115,ownedFailedAcrossStages:5,stageRecords,physicalControls,copiedClassifierFoundation:'faceoff-original-fault',classifierControls:copiedControls,reporterSHA256:sha(Buffer.from(reporter)),controllerSHA256:sha(self),all5496FixedSourceRowsHeldAtFinal:true,fixedAppSameBuffersRestored:true,refsAndMembersHeld:true,featureReady:false,fullSuiteCredit:false,browserCredit:false});
console.log("DAILY_DATE_FOCUSED_FIXED: actual24 passed in3 fixed stages;2 effective original-source date faults produced exact3 Face Off/21passed and2 Minefield/22passed;2 same-buffer restores passed24;zero skips/todo/callback/task infra errors;5 effective physical classifier refusals/restores. Focused only, no full-suite or browser credit.");
