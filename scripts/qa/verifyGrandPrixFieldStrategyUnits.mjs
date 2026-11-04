import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,lstat,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

assert.equal(process.env.CI,'1');
assert.equal(process.env.SIM_NETWORK,'offline');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const phase=process.env.GP_FIELD_PHASE||'fixed',control=phase==='fixed'?'whole-parent-page':'';
assert.ok(['baseline','fixed'].includes(phase));
const specs=[
  {
    "file": "src/test/grandPrixBossFieldStrategy.test.tsx",
    "sha256": "396d114f58dccecea2abb870357cb503c4ec18ad29fb4cc8617f60b91a4140bd",
    "suite": "Grand Prix Boss saved whole-field strategy",
    "owners": [
      "GP_FIELD_STRATEGY_REQUIRED",
      "GP_FIELD_UPDATE_REQUIRED",
      null,
      null
    ],
    "titles": [
      "GP_FIELD_CURRENT: shows every active saved entry compound, rounded wear and pit count",
      "GP_FIELD_PIT_UPDATE: changes telemetry only when the actual pitted checkpoint is published",
      "GP_FIELD_GUARDS: keeps grid, lap zero and retired field rows free of strategy claims",
      "GP_FIELD_PENDING: preserves saved field information for pending, refused and read-only orders"
    ]
  }
];
const PAGE='src/pages/GrandPrixBoss.tsx',SELF='scripts/qa/verifyGrandPrixFieldStrategyUnits.mjs',BASE='fa4e7b08c93f80c3a3cea4dcae1c4c2d9d1122f8';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const meta=(file,b)=>({file,bytes:b.length,sha256:hash(b),git:git(b)});
const files=[PAGE,SELF,...specs.map(s=>s.file),'src/lib/grandPrixBoss.ts','src/hooks/useGrandPrixBoss.ts','src/test/setup.ts','vitest.config.ts','scripts/lib/offlineTransport.cjs','package.json','package-lock.json','bun.lock'];
const held=new Map(await Promise.all(files.map(async f=>[f,await readFile(path.join(root,f))])));
for(const s of specs)assert.equal(hash(held.get(s.file)),s.sha256,'Exact frozen test');
assert.equal(git(held.get('src/lib/grandPrixBoss.ts')),'f85074736a50221d7cd74c9195cc68078cc68e0c');
assert.equal(git(held.get('src/hooks/useGrandPrixBoss.ts')),'a66fe58c641217ccce0dffb191748f42551c86c6');
const before=files.map(f=>meta(f,held.get(f)));
const out=path.resolve(process.env.GP_FIELD_OUT||path.join(root,'tmp/gp-field-evidence'),phase);
await mkdir(out,{recursive:true});
assert.ok(!(await lstat(out)).isSymbolicLink());
const put=(name,value)=>writeFile(path.join(out,name),Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
await put('source-before.json',before);await put('page.before.tsx',held.get(PAGE));
let map,parentText;
if(phase==='baseline')assert.equal(git(held.get(PAGE)),BASE,'Actual old Page, not a reconstructed omission');
else{
  const mapPath=path.resolve(process.env.GP_FIELD_MUTATIONS||'tmp/gp-field-source-map.json');
  const bytes=await readFile(mapPath);await put('source-map.json',bytes);map=JSON.parse(bytes);
  assert.equal(hash(held.get(PAGE)),map.pageSHA256);
  assert.equal(git(held.get(PAGE)),map.pageGit);
  let original=held.get(PAGE).toString('utf8');
  for(const edit of [...map.edits].reverse()){
    assert.equal(original.slice(edit.at,edit.at+edit.after.length),edit.after,'Exact inverse span');
    original=original.slice(0,edit.at)+edit.before+original.slice(edit.at+edit.after.length);
  }
  assert.equal(git(Buffer.from(original)),BASE,'Whole fixed Page inverse');
  assert.equal(map.edits.length,2,'Exactly two field display spans');
  parentText=original;let restored=parentText;
  for(const edit of map.edits){assert.equal(restored.slice(edit.at,edit.at+edit.before.length),edit.before);restored=restored.slice(0,edit.at)+edit.after+restored.slice(edit.at+edit.before.length);}
  assert.equal(restored,held.get(PAGE).toString('utf8'),'Complete field Page restoration');
}
const strip=t=>String(t).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
const diagnostic=/(?:\bUnhandled (?:Errors?|Rejections?)\b|\bUncaught (?:Exception|Error)\b|\bunhandledRejection\b|\buncaughtException\b|\bUnhandledPromiseRejection(?:Warning|Error)?\b|^\s*(?:TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError)(?:\s*\[[^\]]+\])?:|^\s*Error(?:\s*\[[^\]]+\])?:|\bFailed to (?:resolve import|load)\b|\bCannot find (?:module|package)\b|\bTransform failed\b|\bTest timed out\b|\bSIM_OFFLINE_BLOCK\b)/im;
const logs=(text,label)=>assert.doesNotMatch(strip(text),diagnostic,'GP_FIELD_RUNTIME:'+label);
const counters=report=>Object.fromEntries(['numUnhandledErrors','numRuntimeErrorTestSuites','numRuntimeErrorTests'].map(key=>{
  const value=report[key];if(value===undefined||value===null)return[key,{status:'UNKNOWN',value:null}];
  assert.equal(typeof value,'number');assert.equal(value,0,'Reported runtime counter');return[key,{status:'REPORTED_ZERO',value}];
}));
const observedErrorArrays=report=>Object.fromEntries(['errors','unhandledErrors'].map(key=>{
  if(!Object.prototype.hasOwnProperty.call(report,key))return[key,{status:'UNKNOWN',value:null}];
  const value=report[key];assert.ok(Array.isArray(value),'GP_FIELD_ERROR_ARRAY:'+key+': array');
  assert.equal(value.length,0,'GP_FIELD_ERROR_ARRAY:'+key+': empty');
  return[key,{status:'OBSERVED_EMPTY',value:[]}];
}));
const children=[],verdicts=[],readerControls=[],reportReaderControls=[];let primary=null;const secondary=[];
const failure=e=>({name:e?.name||'Error',message:String(e?.message||e),stack:String(e?.stack||e)});
async function remember(e,where){const row={where,...failure(e)};if(!primary){primary=row;await put('primary.json',row);}else{secondary.push(row);await put('secondary.json',secondary);}}
async function execute(label,page){
  const dir=path.join(out,label);await mkdir(dir);
  const report=path.join(dir,'unit.json'),env={...process.env,FORCE_COLOR:'0'};
  delete env.GP_BOSS_PAGE_FILE;delete env.NO_DOUBLE_SWAP;delete env.US_BOARD_CONTROL_ALIAS;delete env.US_BOARD_CONTROL_FILE;
  if(page)env.GP_BOSS_PAGE_FILE=page;
  const argv=[path.join(root,'node_modules/vitest/vitest.mjs'),'run',...specs.map(s=>s.file),'--reporter=default','--reporter=json','--outputFile.json='+report,'--maxWorkers=1','--no-file-parallelism'];
  const run=spawnSync(process.execPath,argv,{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  const receipt={label,argv,page:page||null,status:run.status,signal:run.signal,error:run.error?failure(run.error):null,timeoutMs:120000};
  const stdout=run.stdout||'',stderr=run.stderr||'';let raw=null;
  await writeFile(path.join(dir,'stdout.log'),stdout);await writeFile(path.join(dir,'stderr.log'),stderr);
  await writeFile(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  try{raw=await readFile(report);}catch{}
  const child={label,receipt,stdout,stderr,raw};children.push(child);return child;
}
function checkReport(child,redIds){
  const {label,receipt,raw,stdout,stderr}=child;
  assert.equal(receipt.error,null,'No child setup/timeout error');assert.equal(receipt.signal,null);
  assert.ok(raw,'Actual current JSON exists');logs(stdout+'\n'+stderr,label);
  const report=JSON.parse(raw),runtime=counters(report),errorArrays=observedErrorArrays(report);
  assert.equal(report.testResults.length,1);assert.equal(report.numTotalTests,4);
  assert.equal(report.numPendingTests,0);assert.equal(report.numTodoTests,0);
  assert.equal(receipt.status,redIds.length?1:0);assert.equal(report.numFailedTests,redIds.length);
  assert.equal(report.numPassedTests,4-redIds.length);assert.equal(report.success,redIds.length===0);
  const found=[],identities=[];
  for(const file of report.testResults){
    const name=path.relative(root,path.resolve(file.name)).split(path.sep).join('/'),spec=specs.find(s=>s.file===name);
    assert.ok(spec,'Exact physical file');assert.ok(!found.includes(name));found.push(name);assert.equal(file.message||'','');
    assert.equal(file.assertionResults.length,4);
    assert.deepEqual(file.assertionResults.map(r=>r.title).sort(),[...spec.titles].sort());
    for(const row of file.assertionResults){
      assert.equal(row.fullName,spec.suite+' '+row.title);assert.deepEqual(row.ancestorTitles,[spec.suite]);
      const titleIndex=spec.titles.indexOf(row.title),isRed=redIds.includes(titleIndex);
      assert.equal(row.status,isRed?'failed':'passed');assert.equal(row.failureMessages.length,isRed?1:0);
      let nativePrimary=null;
      if(isRed){
        nativePrimary=strip(row.failureMessages[0]).split(/\r?\n/).find(x=>x.trim())?.trim();
        assert.match(nativePrimary,new RegExp('^AssertionError: '+spec.owners[titleIndex]+': expected false to be true(?:\\s|$)'),'Exact first native Boolean owner');
      }
      identities.push({file:name,title:row.title,fullName:row.fullName,status:row.status,primary:nativePrimary});
    }
  }
  assert.deepEqual(found.sort(),specs.map(s=>s.file).sort());
  return {label,status:'passed',executed:4,healthy:4-redIds.length,owned:redIds.length,nativeExit:receipt.status,runtime,errorArrays,identities};
}
async function validate(child,redIds){
  const result=checkReport(child,redIds);
  await writeFile(path.join(out,child.label,'verdict.json'),JSON.stringify(result,null,2)+'\n');return result;
}
async function reportReaderProbes(child,redIds){
  const dir=path.join(out,'report-reader-controls');await mkdir(dir);
  const original=Buffer.from(child.raw),copy=path.join(dir,'copied.json'),healthy=checkReport(child,redIds);
  await writeFile(path.join(dir,'original.json'),original);
  for(const {id,key,injected,kind} of [
    {id:'errors-nonempty',key:'errors',injected:[{name:'Error',message:'Fixture nonempty errors'}],kind:'empty'},
    {id:'unhandledErrors-nonempty',key:'unhandledErrors',injected:[{name:'Error',message:'Fixture nonempty unhandledErrors'}],kind:'empty'},
    {id:'errors-null',key:'errors',injected:null,kind:'array'},
    {id:'unhandledErrors-null',key:'unhandledErrors',injected:null,kind:'array'},
  ]){
    const value=JSON.parse(original);value[key]=injected;
    const changed=Buffer.from(JSON.stringify(value)),marker='GP_FIELD_ERROR_ARRAY:'+key+': '+kind;
    assert.notEqual(hash(changed),hash(original));await writeFile(copy,changed);
    const physical=await readFile(copy);assert.ok(physical.equals(changed));
    await writeFile(path.join(dir,id+'.changed.json'),physical);
    let refusal;assert.throws(()=>checkReport({...child,raw:physical},redIds),e=>{
      refusal=failure(e);return e?.name==='AssertionError'&&String(e.message).startsWith(marker);
    });
    const refusalBytes=Buffer.from(JSON.stringify(refusal,null,2)+'\n');
    await writeFile(path.join(dir,id+'.refusal.json'),refusalBytes);
    await writeFile(copy,original);const restored=await readFile(copy);assert.ok(restored.equals(original));
    assert.deepEqual(checkReport({...child,raw:restored},redIds),healthy);
    await writeFile(path.join(dir,id+'.restored.json'),restored);
    reportReaderControls.push({id,key,kind,marker,original:meta('original.json',original),
      changed:meta(id+'.changed.json',physical),refusal:meta(id+'.refusal.json',refusalBytes),
      restored:meta(id+'.restored.json',restored),owned:true,restoredHealthy:true,wholeRawRestore:true});
  }
  await writeFile(path.join(dir,'receipt.json'),JSON.stringify({
    scope:'Detached physical copied-report reader labs, not game faults or unit children; checkReport has no writes.',
    controls:reportReaderControls},null,2)+'\n');
}
async function readerProbes(child){
  const dir=path.join(out,'reader-controls');await mkdir(dir);
  const original=Buffer.from(child.stdout+'\n'+child.stderr),copy=path.join(dir,'copied.log');
  await writeFile(path.join(dir,'original.log'),original);logs(original.toString(),'actual');
  const expected=Buffer.concat([original,Buffer.from('\ntriggerUncaughtException(\nAssertionError: Expected fixture assertion\n')]);
  logs(expected.toString(),'expected-preamble');await writeFile(path.join(dir,'expected-preamble.log'),expected);
  for(const token of ['unhandledRejection','uncaughtException','UnhandledPromiseRejection','UnhandledPromiseRejectionWarning','UnhandledPromiseRejectionError']){
    const changed=Buffer.concat([original,Buffer.from('\n'+token+': Fixture diagnostic\n')]);assert.notEqual(hash(changed),hash(original));
    await writeFile(copy,changed);const physical=await readFile(copy);assert.ok(physical.equals(changed));
    let refusal;assert.throws(()=>logs(physical.toString(),token),e=>{
      refusal=failure(e);return e?.name==='AssertionError'&&String(e.message).startsWith('GP_FIELD_RUNTIME:');
    });
    const refusalBytes=Buffer.from(JSON.stringify(refusal,null,2)+'\n');
    await writeFile(path.join(dir,token+'.refusal.json'),refusalBytes);
    await writeFile(path.join(dir,token+'.changed.log'),physical);await writeFile(copy,original);
    const restored=await readFile(copy);assert.ok(restored.equals(original));logs(restored.toString(),token+'-restored');
    await writeFile(path.join(dir,token+'.restored.log'),restored);
    readerControls.push({token,original:meta('original.log',original),changed:meta(token+'.changed.log',physical),refusal:meta(token+'.refusal.json',refusalBytes),restored:meta(token+'.restored.log',restored),owned:true,restoredHealthy:true});
  }
  await writeFile(path.join(dir,'receipt.json'),JSON.stringify({scope:'Detached copied-log reader labs, not game faults or actual runtime incidents',expectedPreambleAccepted:true,controls:readerControls},null,2)+'\n');
}
let copyDir,copyFile,mutation;let sourceHeld=false;
try{
  const child=await execute(phase,null);
  verdicts.push(await validate(child,phase==='baseline'?[0,1]:[]));
  await reportReaderProbes(child,phase==='baseline'?[0,1]:[]);
  await readerProbes(child);
  if(phase==='fixed'){
    const tempRoot=path.join(root,'tmp');await mkdir(tempRoot,{recursive:true});
    const stat=await lstat(tempRoot);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());
    copyDir=await mkdtemp(path.join(tempRoot,'gp-field-copy-'));copyFile=path.join(copyDir,'GrandPrixBoss.tsx');
    const changed=Buffer.from(parentText);assert.equal(git(changed),BASE);assert.notEqual(hash(changed),hash(held.get(PAGE)));
    await writeFile(copyFile,changed);assert.ok((await readFile(copyFile)).equals(changed));await put('page.parent.tsx',changed);
    mutation={control,copyFile,edits:map.edits,before:meta(PAGE,held.get(PAGE)),changed:meta(PAGE,changed)};
    await put('mutation.json',mutation);
    const fault=await execute('whole-parent',copyFile);assert.ok((await readFile(copyFile)).equals(changed));
    await writeFile(copyFile,held.get(PAGE));assert.ok((await readFile(copyFile)).equals(held.get(PAGE)));
    await put('page.restored.tsx',await readFile(copyFile));
    const restored=await execute('restored',copyFile);assert.ok((await readFile(copyFile)).equals(held.get(PAGE)));
    mutation.restored=meta(PAGE,held.get(PAGE));mutation.wholeRestore=true;await put('mutation.json',mutation);
    for(const [candidate,reds] of [[fault,[0,1]],[restored,[]]])try{verdicts.push(await validate(candidate,reds));}catch(e){await remember(e,candidate.label);}
  }
}catch(e){await remember(e,'controller');}
finally{
  try{
    if(copyFile){await writeFile(copyFile,held.get(PAGE));assert.ok((await readFile(copyFile)).equals(held.get(PAGE)));}
    const after=[];
    for(const f of files){const b=await readFile(path.join(root,f));assert.ok(b.equals(held.get(f)),'Tracked full raw byte hold:'+f);after.push(meta(f,b));}
    await put('source-after.json',after);assert.deepEqual(after,before);sourceHeld=true;
  }catch(e){await remember(e,'source-hold');}
  try{
    if(copyDir){const base=path.join(root,'tmp'),rel=path.relative(base,copyDir);assert.ok(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));await rm(copyDir,{recursive:true,force:true});await assert.rejects(lstat(copyDir),e=>e?.code==='ENOENT');}
    await put('cleanup.json',{removed:!!copyDir,sourceHeld});
  }catch(e){await remember(e,'cleanup');}
}
if(!primary)try{assert.equal(verdicts.length,phase==='fixed'?3:1);assert.equal(sourceHeld,true);}catch(e){await remember(e,'aggregate');}
const summary={status:primary?'failed':'passed',phase,control,children:children.map(c=>c.label),verifiedChildren:verdicts.length,executed:verdicts.reduce((s,r)=>s+r.executed,0),healthy:verdicts.reduce((s,r)=>s+r.healthy,0),owned:verdicts.reduce((s,r)=>s+r.owned,0),pending:primary?null:0,rawReportsMayExceedVerified:!!primary,sourceHeld,mutation:mutation||null,readerControls,reportReaderControls,primary,secondary,scope:'Actual rendered Page and engine with labelled component fixtures. No browser/live-data/full-suite or dependency-binary custody credit.'};
await put('summary.json',summary);if(primary)throw new Error(primary.where+': '+primary.message);
console.log('Grand Prix field units '+phase+'/'+(control||'normal')+': '+summary.executed+' executed, '+summary.healthy+' healthy, '+summary.owned+' owned; source held.');
