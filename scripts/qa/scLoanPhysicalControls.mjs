import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root=process.cwd(),out=path.resolve(process.argv[2]||'');
assert(process.argv[2]&&out!==root&&!out.startsWith(root+path.sep),'Evidence outside source');
const spec=JSON.parse(fs.readFileSync(new URL('./scLoanPhysicalFaults.json',import.meta.url),'utf8'));
assert.equal(spec.schema,1);assert.equal(spec.faults.length,4);assert.equal(spec.selected.length,2);assert.equal(spec.allFullNames.length,6);
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:12*1024*1024}).toString();
const clean=git('status','--porcelain=v1','--untracked-files=all');assert.equal(clean,'','Clean isolated checkout');
fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0,'Fresh evidence directory');
const saved=new Map(Object.entries(spec.pins).map(([file,pin])=>{
  const bytes=fs.readFileSync(file);assert.equal(blob(bytes),pin,file+' exact binding');return [file,bytes];
}));
const fixed=saved.get(spec.target);assert(fixed);const target=path.resolve(spec.target);
const strip=s=>s.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
const escape=s=>Array.from(s,c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
const get=(value,keys)=>{for(const key of keys){assert(value!==null&&typeof value==='object'&&Object.hasOwn(value,key),'Required RAW path '+keys.join('.'));value=value[key];}return value;};
function held(){
  for(const [file,bytes]of saved)assert(fs.readFileSync(file).equals(bytes),file+' full restored bytes');
  assert.equal(git('status','--porcelain=v1','--untracked-files=all'),clean,'Whole checkout status held');git('diff','--exit-code','HEAD');
}
function buildFault(fault){
  let text=fixed.toString('utf8');
  for(const edit of fault.edits){assert(edit.before&&edit.after&&edit.before!==edit.after,'Nonempty changed span');
    assert.equal(text.split(edit.before).length-1,1,fault.name+' unique original');text=text.replace(edit.before,edit.after);}
  const changed=Buffer.from(text);assert(!changed.equals(fixed),fault.name+' changed bytes');
  for(const edit of [...fault.edits].reverse()){assert.equal(text.split(edit.after).length-1,1,fault.name+' unique inverse');text=text.replace(edit.after,edit.before);}
  assert(Buffer.from(text).equals(fixed),fault.name+' whole inverse');return changed;
}
function run(name,selected,faulted){
  const dir=path.join(out,name);fs.mkdirSync(dir);const rawDir=path.join(dir,'raw');fs.mkdirSync(rawDir);
  const receipt=path.join(dir,'transport.log');fs.writeFileSync(receipt,'');
  const env={...process.env,[spec.rawEnv]:rawDir,SIM_OFFLINE_RECEIPT:receipt};
  const args=['node_modules/vitest/vitest.mjs','run',spec.testPath,'-t','^'+escape(selected.fullName)+'$',
    '--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'units.json')];
  const p=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024});
  const log=(p.stdout||'')+'\n'+(p.stderr||'');fs.writeFileSync(path.join(dir,'units.log'),log);
  fs.writeFileSync(path.join(dir,'native-exit.json'),JSON.stringify({status:p.status,signal:p.signal,error:p.error?String(p.error):null})+'\n');
  assert(!p.error&&p.signal===null,name+' native completion');assert.equal(p.status,faulted?1:0,name+' native exit');
  assert.equal(fs.statSync(receipt).size,0,name+' offline receipt');
  assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(strip(log)),name+' runtime banner');
  const j=JSON.parse(fs.readFileSync(path.join(dir,'units.json'),'utf8'));assert.equal(j.testResults.length,1);
  const rows=j.testResults.flatMap(file=>file.assertionResults);
  assert.deepEqual(rows.map(row=>row.fullName).sort(),[...spec.allFullNames].sort(),name+' exact identities');
  assert.equal(j.numTotalTests,6);assert.equal(j.numPendingTests,5);assert.equal(j.numTodoTests,0);
  assert.equal(j.numPassedTests,faulted?0:1);assert.equal(j.numFailedTests,faulted?1:0);
  if(typeof j.numRuntimeErrors==='number')assert.equal(j.numRuntimeErrors,0,name+' runtime counter');
  const chosen=rows.filter(row=>row.fullName===selected.fullName);assert.equal(chosen.length,1);
  assert.equal(chosen[0].status,faulted?'failed':'passed');
  for(const row of rows.filter(row=>row!==chosen[0])){assert(['pending','skipped'].includes(row.status),name+' unselected no credit');assert.equal(row.failureMessages.length,0);}
  if(faulted){
    const message=strip(chosen[0].failureMessages.join('\n')).replace(/\\/g,'/');
    assert(message.includes('AssertionError'),name+' assertion failure');
    assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|is not a function/.test(message),name+' not setup/type');
    if(selected.assertion.marker)assert(message.includes(selected.assertion.marker),name+' owned marker');
    else{const a=selected.assertion;assert(new RegExp(escape(a.stackFile)+':'+a.stackLine+':\\d+').test(message),name+' frozen assertion line');assert(new RegExp(a.messagePattern).test(message),name+' assertion message');}
  }
  const files=fs.readdirSync(rawDir,{withFileTypes:true});assert.equal(files.length,1);
  assert(files[0].isFile()&&!files[0].isSymbolicLink());assert.equal(files[0].name,selected.rawFile);
  const bytes=fs.readFileSync(path.join(rawDir,selected.rawFile)),raw=JSON.parse(bytes);
  assert.equal(raw.case,selected.rawFile.replace(/\.json$/,''));assert.equal(raw.observations.inputHeld,true);
  assert.equal(raw.observations.drawDelta,0);assert.equal(raw.observations.values.length,selected.key==='boundaries'?6:15);
  const admission={name,fullName:selected.fullName,nativeExit:p.status,selectedPassed:j.numPassedTests,
    selectedFailed:j.numFailedTests,unselectedPending:5,unselectedCredit:0,runtimeErrors:j.numRuntimeErrors??'UNKNOWN',
    rawFile:selected.rawFile,rawSHA256:sha(bytes)};
  fs.writeFileSync(path.join(dir,'admission.json'),JSON.stringify(admission,null,2)+'\n');return {raw,bytes,admission};
}
const healthy=new Map(),observed=new Map(),results=[];let failure=null;
try{
  for(const selected of spec.selected){held();healthy.set(selected.key,run('healthy-'+selected.key,selected,false));held();}
  for(const fault of spec.faults){
    const selected=spec.selected.find(item=>item.key===fault.selected);assert(selected);
    const baseline=healthy.get(selected.key),bytes=buildFault(fault),dir=path.join(out,'source-'+fault.name);
    fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'fixed.ts'),fixed);fs.writeFileSync(path.join(dir,'fault.ts'),bytes);
    let mutant;
    try{
      fs.writeFileSync(target,bytes);assert(fs.readFileSync(target).equals(bytes),'Fault installed');
      for(const [file,original]of saved)if(file!==spec.target)assert(fs.readFileSync(file).equals(original),'Other source held');
      mutant=run('fault-'+fault.name,selected,true);assert(!mutant.bytes.equals(baseline.bytes),fault.name+' RAW changed');
      const witnesses=[];
      for(const witness of fault.witnesses){
        const original=get(baseline.raw,witness.path),changed=get(mutant.raw,witness.path);
        if(Object.hasOwn(witness,'healthy'))assert.deepEqual(original,witness.healthy,fault.name+' healthy witness');
        if(witness.healthyNonNullObject)assert(original!==null&&typeof original==='object'&&!Array.isArray(original));
        assert.deepEqual(changed,witness.fault,fault.name+' causal witness');assert.notDeepEqual(changed,original);
        witnesses.push({path:witness.path,healthy:original,fault:changed});
      }
      for(const invariant of fault.invariants||[]){assert.deepEqual(get(baseline.raw,invariant.path),invariant.value);assert.deepEqual(get(mutant.raw,invariant.path),invariant.value);}
      if(fault.crossFault){
        const other=observed.get(fault.crossFault.name);assert(other,'Earlier causal comparison required');
        for(const witness of fault.crossFault.witnesses){assert.deepEqual(get(other.raw,witness.path),witness.other,'Reader defends proof-only fault');assert.deepEqual(get(mutant.raw,witness.path),witness.current,'Reader omission changes exact unknown row');}
      }
      observed.set(fault.name,mutant);
      fs.writeFileSync(path.join(dir,'causal-raw-delta.json'),JSON.stringify({meaning:fault.meaning,
        fixedSourceSHA256:sha(fixed),faultSourceSHA256:sha(bytes),healthyRawSHA256:sha(baseline.bytes),
        mutantRawSHA256:sha(mutant.bytes),witnesses},null,2)+'\n');
    }finally{
      fs.writeFileSync(target,fixed);assert(fs.readFileSync(target).equals(fixed),'Full source restored');
      fs.writeFileSync(path.join(dir,'restored.ts'),fs.readFileSync(target));held();
    }
    const restored=run('restored-'+fault.name,selected,false);
    assert(restored.bytes.equals(baseline.bytes),fault.name+' complete selected RAW restoration');
    held();results.push({name:fault.name,fault:mutant.admission,restored:restored.admission,sourceRestored:true,selectedRawRestored:true});
  }
}catch(error){failure=error;}
finally{
  fs.writeFileSync(target,fixed);try{held();}catch(error){failure??=error;}
  const result={status:failure?'failed':'qualified',faultsExpected:4,faultsQualified:results.length,results,
    error:failure?String(failure.stack||failure):null,
    scope:'Two selected frozen SC identities only. Each fault1owned assertion/5pending, each restore1PASS. No unselected/build/browser/full-suite/public credit.'};
  fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,faultsQualified:results.length,unselectedCredit:0}));
}
if(failure)throw failure;
