import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const out=path.resolve(process.argv[2]||''),phase=process.argv[3];
assert(process.argv[2] && ['baseline','fixed'].includes(phase));
assert(!out.startsWith(process.cwd()+path.sep),'Evidence outside source');
fs.mkdirSync(out,{recursive:true});
const spec=JSON.parse(fs.readFileSync('scripts/qa/masterListNextCases.json','utf8'));
const git=(...args)=>execFileSync('git',args,{maxBuffer:12*1024*1024});
const hash=b=>createHash('sha256').update(b).digest('hex');
const held=git('status','--porcelain=v1','--untracked-files=all').toString();
assert.equal(held,'','Clean source');
function run(name,old){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const receipt=path.join(dir,'transport.log');fs.writeFileSync(receipt,'');
  const env={...process.env,SIM_OFFLINE_RECEIPT:receipt};
  for(const [key,folder] of Object.entries(spec.rawEnv||{})){env[key]=path.join(dir,folder);fs.mkdirSync(env[key],{recursive:true});}
  const p=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...spec.files,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'units.json')],{env,encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024});
  const log=(p.stdout||'')+'\n'+(p.stderr||'');
  fs.writeFileSync(path.join(dir,'units.log'),log);
  fs.writeFileSync(path.join(dir,'native-exit.json'),JSON.stringify({status:p.status,signal:p.signal,error:p.error?String(p.error):null})+'\n');
  assert(!p.error&&p.signal===null,name+' native completion');
  assert.equal(p.status,old?1:0,name+' native status');
  assert.equal(fs.statSync(receipt).size,0,name+' offline Node receipt');
  assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log),name+' runtime errors');
  const j=JSON.parse(fs.readFileSync(path.join(dir,'units.json'))),rows=j.testResults.flatMap(r=>r.assertionResults);
  assert.equal(j.testResults.length,spec.files.length,name+' file census');
  assert.deepEqual(rows.map(r=>r.fullName).sort(),spec.cases.map(r=>r.fullName).sort(),name+' exact case census');
  assert.equal(j.numPendingTests,0);assert.equal(j.numTodoTests,0);
  if(typeof j.numRuntimeErrors==='number')assert.equal(j.numRuntimeErrors,0,name+' reporter runtime errors');
  for(const r of rows){
    const e=spec.cases.find(e=>e.fullName===r.fullName),expected=old?e.baseline:'passed';
    assert.equal(r.status,expected,r.fullName);
    if(expected==='failed'){
      const message=r.failureMessages.join('\n');
      assert(message.includes('AssertionError')&&message.includes(e.marker),r.fullName+' owned failure');
      assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|is not a function/.test(message),r.fullName+' genuine assertion');
    }
  }
  const raw=[];function walk(folder,rel=''){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,item.name),key=path.posix.join(rel,item.name);if(item.isDirectory())walk(file,key);else if(key.includes('/'))raw.push({path:key,sha256:hash(fs.readFileSync(file))});}}
  walk(dir);raw.sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(raw.map(r=>r.path).sort(),[...spec.rawFiles].sort(),name+' exact RAW census');
  for(const row of raw){const value=JSON.parse(fs.readFileSync(path.join(dir,row.path),'utf8'));if('inputHeld' in value)assert.equal(value.inputHeld,true,name+' input held '+row.path);}
  const admission={name,nativeExit:p.status,total:rows.length,passed:j.numPassedTests,failed:j.numFailedTests,runtimeErrors:j.numRuntimeErrors??'UNKNOWN',raw};
  fs.writeFileSync(path.join(dir,'admission.json'),JSON.stringify(admission,null,2)+'\n');return admission;
}
let fixed,control,restored;
if(phase==='baseline'){control=run('baseline',true);}
else{
  const saved=new Map(spec.products.map(p=>[p,fs.readFileSync(p)]));
  const original=new Map(spec.products.map(p=>[p,git('show',spec.base+':'+p)]));
  const bindings=spec.products.map(p=>{assert(!saved.get(p).equals(original.get(p)),p+' control changes bytes');return {path:p,fixed:hash(saved.get(p)),original:hash(original.get(p))};});
  fs.writeFileSync(path.join(out,'product-bindings.json'),JSON.stringify(bindings,null,2)+'\n');
  fixed=run('fixed',false);
  try{for(const p of spec.products)fs.writeFileSync(p,original.get(p));control=run('whole-original',true);}
  finally{for(const p of spec.products)fs.writeFileSync(p,saved.get(p));for(const p of spec.products)assert(fs.readFileSync(p).equals(saved.get(p)),p+' exact restored');}
  restored=run('restored',false);
  assert.deepEqual(fixed.raw,restored.raw,'Deterministic RAW restored');
}
assert.equal(git('status','--porcelain=v1','--untracked-files=all').toString(),held);
git('diff','--exit-code','HEAD');
const result={status:'qualified',phase,total:spec.cases.length,ownedOriginalFailures:spec.cases.filter(c=>c.baseline==='failed').length,heldOriginalPasses:spec.cases.filter(c=>c.baseline==='passed').length,fixedPassed:fixed?.passed??null,restoredPassed:restored?.passed??null,limits:'Selected outcome cases only, no build, browser, full-fleet or public claim'};
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
