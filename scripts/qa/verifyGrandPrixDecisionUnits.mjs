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
const phase=process.env.GP_DECISION_PHASE||'fixed',control=process.env.GP_DECISION_CONTROL||'';
assert.ok(['baseline','fixed'].includes(phase));
assert.ok(['','profile','timing'].includes(control));
assert.ok(!control||phase==='fixed');
const specs=[
  {
    "file": "src/test/grandPrixBossDecisionInfo.test.tsx",
    "sha256": "9ab1c60908a4529539065f54903520a4310a678f63ebfda188726b96acc113ea",
    "suite": "Grand Prix Boss incoming-driver decision information",
    "owner": "GP_DECISION_INCOMING_PROFILE_REQUIRED",
    "titles": [
      "GP_DECISION_PROFILE: discloses the selected candidate before the quote across available and unfunded views",
      "GP_DECISION_SIGN: preserves the selected fee and action until the hook publishes the actual engine result",
      "GP_DECISION_LOCKED: preserves quotes and refuses signing while the saved team is protected",
      "GP_DECISION_CLOSED: offers no incoming profile or signing action after actual qualifying closes the market"
    ]
  },
  {
    "file": "src/test/grandPrixBossRaceTiming.test.tsx",
    "sha256": "730ce5b23dac6f4e5cc122633a5098ee67c7513fb46e82f656517fd641dbc611",
    "suite": "Grand Prix Boss saved race timing decisions",
    "owner": "GP_RACE_TIMING_MISSING",
    "titles": [
      "GP_RACE_TIMING_CHECKPOINTS: displays exact saved leader gaps and honest retired states",
      "GP_RACE_TIMING_GRID_GUARD: keeps grid and lap zero free of invented race-time gaps",
      "GP_RACE_TIMING_ORDERS: preserves IDs, pace, pit choice, revision and refused state",
      "GP_RACE_TIMING_FINISH: preserves the actual classification, field order and source state"
    ]
  }
];
const PAGE='src/pages/GrandPrixBoss.tsx',SELF='scripts/qa/verifyGrandPrixDecisionUnits.mjs',BASE='9e922cf92192016fa25e7cc0e2fa8a5a92a0e2a1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const meta=(file,b)=>({file,bytes:b.length,sha256:hash(b),git:git(b)});
const files=[PAGE,SELF,...specs.map(s=>s.file),'src/lib/grandPrixBoss.ts','src/hooks/useGrandPrixBoss.ts','src/test/setup.ts','vitest.config.ts','scripts/lib/offlineTransport.cjs','package.json','package-lock.json','bun.lock'];
const held=new Map(await Promise.all(files.map(async f=>[f,await readFile(path.join(root,f))])));
for(const s of specs)assert.equal(hash(held.get(s.file)),s.sha256,'Exact frozen test');
assert.equal(git(held.get('src/lib/grandPrixBoss.ts')),'f85074736a50221d7cd74c9195cc68078cc68e0c');
assert.equal(git(held.get('src/hooks/useGrandPrixBoss.ts')),'a66fe58c641217ccce0dffb191748f42551c86c6');
const before=files.map(f=>meta(f,held.get(f)));
const out=path.resolve(process.env.GP_DECISION_OUT||path.join(root,'tmp/gp-decision-evidence'),control||phase);
await mkdir(out,{recursive:true});
assert.ok(!(await lstat(out)).isSymbolicLink());
const put=(name,value)=>writeFile(path.join(out,name),Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
await put('source-before.json',before);await put('page.before.tsx',held.get(PAGE));
let map;
if(phase==='baseline')assert.equal(git(held.get(PAGE)),BASE,'Actual old Page, not a reconstructed omission');
else{
  const mapPath=path.resolve(process.env.GP_DECISION_MUTATIONS||'tmp/gp-decision-source-map.json');
  const bytes=await readFile(mapPath);await put('source-map.json',bytes);map=JSON.parse(bytes);
  assert.equal(hash(held.get(PAGE)),map.pageSHA256);
  assert.equal(git(held.get(PAGE)),map.pageGit);
  let original=held.get(PAGE).toString('utf8');
  for(const edit of [...map.edits].reverse()){
    assert.equal(original.slice(edit.at,edit.at+edit.after.length),edit.after,'Exact inverse span');
    original=original.slice(0,edit.at)+edit.before+original.slice(edit.at+edit.after.length);
  }
  assert.equal(git(Buffer.from(original)),BASE,'Whole fixed Page inverse');
  assert.deepEqual(map.controls.map(c=>c.id).sort(),['profile','timing']);
}
const strip=t=>String(t).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
const diagnostic=/(?:\bUnhandled (?:Errors?|Rejections?)\b|\bUncaught (?:Exception|Error)\b|\bunhandledRejection\b|\buncaughtException\b|\bUnhandledPromiseRejection(?:Warning|Error)?\b|^\s*(?:TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError)(?:\s*\[[^\]]+\])?:|^\s*Error(?:\s*\[[^\]]+\])?:|\bFailed to (?:resolve import|load)\b|\bCannot find (?:module|package)\b|\bTransform failed\b|\bTest timed out\b|\bSIM_OFFLINE_BLOCK\b)/im;
const logs=(text,label)=>assert.doesNotMatch(strip(text),diagnostic,'GP_DECISION_RUNTIME:'+label);
const counters=report=>Object.fromEntries(['numUnhandledErrors','numRuntimeErrorTestSuites','numRuntimeErrorTests'].map(key=>{
  const value=report[key];if(value===undefined||value===null)return[key,{status:'UNKNOWN',value:null}];
  assert.equal(typeof value,'number');assert.equal(value,0,'Reported runtime counter');return[key,{status:'REPORTED_ZERO',value}];
}));
const children=[],verdicts=[],readerControls=[];let primary=null;const secondary=[];
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
async function validate(child,redIds){
  const {label,receipt,raw,stdout,stderr}=child;
  assert.equal(receipt.error,null,'No child setup/timeout error');assert.equal(receipt.signal,null);
  assert.ok(raw,'Actual current JSON exists');logs(stdout+'\n'+stderr,label);
  const report=JSON.parse(raw),runtime=counters(report);
  assert.equal(report.testResults.length,2);assert.equal(report.numTotalTests,8);
  assert.equal(report.numPendingTests,0);assert.equal(report.numTodoTests,0);
  assert.equal(receipt.status,redIds.length?1:0);assert.equal(report.numFailedTests,redIds.length);
  assert.equal(report.numPassedTests,8-redIds.length);assert.equal(report.success,redIds.length===0);
  const found=[],identities=[];
  for(const file of report.testResults){
    const name=path.relative(root,path.resolve(file.name)).split(path.sep).join('/'),spec=specs.find(s=>s.file===name);
    assert.ok(spec,'Exact physical file');assert.ok(!found.includes(name));found.push(name);assert.equal(file.message||'','');
    assert.equal(file.assertionResults.length,4);
    assert.deepEqual(file.assertionResults.map(r=>r.title).sort(),[...spec.titles].sort());
    for(const row of file.assertionResults){
      assert.equal(row.fullName,spec.suite+' '+row.title);assert.deepEqual(row.ancestorTitles,[spec.suite]);
      const isRed=redIds.includes(spec.file)&&row.title===spec.titles[0];
      assert.equal(row.status,isRed?'failed':'passed');assert.equal(row.failureMessages.length,isRed?1:0);
      let nativePrimary=null;
      if(isRed){
        nativePrimary=strip(row.failureMessages[0]).split(/\r?\n/).find(x=>x.trim())?.trim();
        assert.match(nativePrimary,new RegExp('^AssertionError: '+spec.owner+': expected false to be true(?:\\s|$)'),'Exact first native Boolean owner');
      }
      identities.push({file:name,title:row.title,fullName:row.fullName,status:row.status,primary:nativePrimary});
    }
  }
  assert.deepEqual(found.sort(),specs.map(s=>s.file).sort());
  const result={label,status:'passed',executed:8,healthy:8-redIds.length,owned:redIds.length,nativeExit:receipt.status,runtime,identities};
  await writeFile(path.join(out,label,'verdict.json'),JSON.stringify(result,null,2)+'\n');return result;
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
    assert.throws(()=>logs(physical.toString(),token),e=>e?.name==='AssertionError'&&String(e.message).startsWith('GP_DECISION_RUNTIME:'));
    await writeFile(path.join(dir,token+'.changed.log'),physical);await writeFile(copy,original);
    const restored=await readFile(copy);assert.ok(restored.equals(original));logs(restored.toString(),token+'-restored');
    await writeFile(path.join(dir,token+'.restored.log'),restored);
    readerControls.push({token,original:meta('original.log',original),changed:meta(token+'.changed.log',physical),restored:meta(token+'.restored.log',restored),owned:true,restoredHealthy:true});
  }
  await writeFile(path.join(dir,'receipt.json'),JSON.stringify({scope:'Detached copied-log reader labs, not game faults or actual runtime incidents',expectedPreambleAccepted:true,controls:readerControls},null,2)+'\n');
}
let copyDir,copyFile,mutation;let sourceHeld=false;
try{
  if(!control){
    const child=await execute(phase,null);verdicts.push(await validate(child,phase==='baseline'?specs.map(s=>s.file):[]));await readerProbes(child);
  }else{
    const tempRoot=path.join(root,'tmp');await mkdir(tempRoot,{recursive:true});
    const stat=await lstat(tempRoot);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());
    copyDir=await mkdtemp(path.join(tempRoot,'gp-decision-copy-'));copyFile=path.join(copyDir,'GrandPrixBoss.tsx');
    const edit=map.controls.find(c=>c.id===control);assert.ok(edit&&edit.before&&edit.before!==edit.after);
    const source=held.get(PAGE).toString('utf8');
    assert.equal(source.split(edit.before).length-1,1,'Unique physical source span');
    const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\n)\s*\/\/[^\n]*/g,'$1');
    assert.equal(code.split(edit.executableToken).length-1,1,'Control binds executable code, not comments');
    const changed=Buffer.from(source.replace(edit.before,edit.after));assert.notEqual(hash(changed),hash(held.get(PAGE)));
    await writeFile(copyFile,changed);assert.ok((await readFile(copyFile)).equals(changed));await put('page.changed.tsx',changed);
    mutation={control,copyFile,edit,before:meta(PAGE,held.get(PAGE)),changed:meta(PAGE,changed)};
    await put('mutation.json',mutation);
    const fault=await execute(control,copyFile);assert.ok((await readFile(copyFile)).equals(changed));
    await writeFile(copyFile,held.get(PAGE));assert.ok((await readFile(copyFile)).equals(held.get(PAGE)));
    await put('page.restored.tsx',await readFile(copyFile));
    const restored=await execute(control+'-restored',copyFile);assert.ok((await readFile(copyFile)).equals(held.get(PAGE)));
    mutation.restored=meta(PAGE,held.get(PAGE));mutation.wholeRestore=true;await put('mutation.json',mutation);
    const target=specs[control==='profile'?0:1].file;
    for(const [child,reds] of [[fault,[target]],[restored,[]]])try{verdicts.push(await validate(child,reds));}catch(e){await remember(e,child.label);}
    if(!primary)await readerProbes(fault);
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
if(!primary)try{assert.equal(verdicts.length,control?2:1);assert.equal(sourceHeld,true);}catch(e){await remember(e,'aggregate');}
const summary={status:primary?'failed':'passed',phase,control,children:children.map(c=>c.label),verifiedChildren:verdicts.length,executed:verdicts.reduce((s,r)=>s+r.executed,0),healthy:verdicts.reduce((s,r)=>s+r.healthy,0),owned:verdicts.reduce((s,r)=>s+r.owned,0),pending:primary?null:0,rawReportsMayExceedVerified:!!primary,sourceHeld,mutation:mutation||null,readerControls,primary,secondary,scope:'Actual rendered Page and engine with labelled component fixtures. No browser/live-data/full-suite or dependency-binary custody credit.'};
await put('summary.json',summary);if(primary)throw new Error(primary.where+': '+primary.message);
console.log('Grand Prix decision units '+phase+'/'+(control||'normal')+': '+summary.executed+' executed, '+summary.healthy+' healthy, '+summary.owned+' owned; source held.');
