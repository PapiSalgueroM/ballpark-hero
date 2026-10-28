import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

assert.equal(process.env.CI,'1','Remote qualification only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_COACHING_CONTROLS_OUT||'coaching-start-artifacts/controls');
const sha=body=>createHash('sha256').update(body).digest('hex');
const read=(root,file)=>fs.readFileSync(path.join(root,file));
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2));
const tests=['src/test/soccerCareerCoachingStart.test.ts','src/test/soccerCareerCoachingChooser.test.tsx','src/test/soccerCareerCoachingTransaction.test.tsx'];
const expected=[
  'quotes a deterministic bounded real current pool without input changes or global draws',
  'requires exact reviewed numeric3 without interpreting it as a licence',
  'requires an actual first retired entry and refuses an existing career',
  'refuses an empty, elite-only, malformed or duplicate-ID starter pool',
  'delegates every chosen starter to canonical full singleton initialization and one draw',
  'uses actual starter records from the current canonical pool without manufacturing data',
  'rejects stale replaced saves and changed or duplicate current club bindings without a draw',
  'rejects malformed, forged or elite requests without changing existing money or state',
  'makes repeat taps on the adopted manager career a no-op without another draw',
  'keeps the selected existing ManagerState through official save, load and repair',
  'keeps all destinations disabled and the complete career untouched while loading',
  'starts the actual quoted current club once after loading and repeated taps add no draw',
  'Back removes the pending chooser and a late load cannot mutate the career',
  'does not overwrite a replaced save when the old pending market finishes',
  'retains state on load failure and retries before permitting a current quoted appointment',
  'keeps rules and the worked example reopenable without changing career or drawing',
  'starts once outside React updater replay with exact canonical state and one draw',
  'reserves an accepted appointment before two callbacks in one event can spend another draw',
  'makes a captured old callback read the latest committed replacement save',
  'validates a captured callback against the latest committed current club pool',
  'ignores callbacks after its actual transaction owner unmounts without a draw',
  'does not reserve or adopt malformed and ineligible requests',
];
const metaPath='qa/soccer-career-coaching-start-v1/SOURCE-READY.json';
const faultsPath='qa/soccer-career-coaching-start-v1/SOURCE-FAULTS.json';
const ownPath='scripts/qa/soccerCoachingStartControls.mjs';
fs.mkdirSync(OUT,{recursive:true});
const record={status:'running',scope:'Actual22candidate cases,11physical copied-source faults and same-copy full restoration; no fullroute claim',controls:[]};
let owned;
const save=()=>write('admission.json',record);
const hashes=(root,files)=>Object.fromEntries(files.map(file=>[file,sha(read(root,file))]));
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function run(root,label,selected){
  const report=path.join(OUT,label+'.json'),log=path.join(OUT,label+'.log');
  const args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run',...tests,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+report];
  if(selected)args.push('--testNamePattern','(?:'+selected.map(escape).join('|')+')$');
  const child=spawnSync(process.execPath,args,{cwd:root,env:{...process.env},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  const cli=(child.stdout||'')+'\n'+(child.stderr||'');fs.writeFileSync(log,cli);
  assert(!child.error&&child.signal===null,'Actual Vitest completed without process/setup failure');
  const result=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.equal(result.testResults.length,3,'All three actual test files collected');
  for(const suite of result.testResults)assert.equal(suite.message,'','No out-of-row suite/setup failure');
  const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
  assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No CLI infrastructure diagnostics');
  const rows=result.testResults.flatMap(suite=>suite.assertionResults);
  assert.deepEqual(rows.map(row=>row.title).sort(),[...expected].sort(),'Exact22case identity set retained');
  if(!selected){assert.equal(child.status,0);assert(rows.every(row=>row.status==='passed'),'All22cases passed');}
  else{
    assert.equal(child.status,1,'Physical source fault actually fails');
    const target=rows.find(row=>row.title===selected[0]),independent=rows.find(row=>row.title===selected[1]);
    assert.equal(target.status,'failed');assert.equal(independent.status,'passed');
    assert.equal(rows.filter(row=>row.status==='failed').length,1);assert.equal(rows.filter(row=>row.status==='passed').length,1);
    assert.equal(rows.filter(row=>row.status==='skipped').length,20);
    assert(target.failureMessages.length>0&&target.failureMessages.every(message=>{const clean=message.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');return /AssertionError|Error: expect\(/.test(clean)&&!/Cannot find module|Failed to resolve|ReferenceError|TypeError|timed out|Invalid Chai property/i.test(clean);}),'Intended assertion failure only');
  }
  return{status:child.status,passed:rows.filter(row=>row.status==='passed').length,failed:rows.filter(row=>row.status==='failed').length,filtered:rows.filter(row=>row.status==='skipped').length,report:path.basename(report),log:path.basename(log)};
}
save();
try{
  const metaBody=read(ROOT,metaPath),faultBody=read(ROOT,faultsPath);
  assert.equal(sha(metaBody),'73f0282fba85e4dd5454b5dcec01c3bfa96366f4170d898f9d82a41e2bc565da');
  assert.equal(sha(faultBody),'030ec20aa115c1aec45485c0191fda2d81e7b59f942fa130e154d2650ad62eb2');
  const meta=JSON.parse(metaBody),faults=JSON.parse(faultBody).faults;
  assert.equal(meta.files.length,17);assert.equal(faults.length,11);
  const held=[...new Set([...meta.files.map(row=>row.path),metaPath,faultsPath,ownPath])];
  record.before=hashes(ROOT,held);
  for(const file of meta.files)assert.equal(record.before[file.path],file.sha256,file.path);
  const archive=path.join(OUT,'source.tar');
  execFileSync('git',['archive','--format=tar','--output='+archive,'HEAD'],{cwd:ROOT,timeout:30000});
  record.sourceArchiveSha256=sha(fs.readFileSync(archive));
  owned=fs.mkdtempSync(path.join(os.tmpdir(),'sc-coaching-controls-'));
  execFileSync('tar',['-xf',archive,'-C',owned],{cwd:ROOT,timeout:30000});
  fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(owned,'node_modules'),'dir');
  assert.deepEqual(hashes(owned,held),record.before,'Changed-copy baseline bound to canonical sources');
  record.healthy=run(owned,'healthy');save();
  for(const fault of faults){
    assert(expected.includes(fault.targetCase)&&expected.includes(fault.independentCase)&&fault.targetCase!==fault.independentCase);
    const original=read(owned,fault.path),text=original.toString('utf8');
    const at=text.indexOf(fault.before);assert(at>=0&&text.indexOf(fault.before,at+1)===-1,'One real current mutation anchor');
    const changed=text.slice(0,at)+fault.after+text.slice(at+fault.before.length);
    assert.notEqual(sha(changed),sha(original),'Physical source bytes change');
    const item={id:fault.id,path:fault.path,beforeSha256:sha(original),changedSha256:sha(changed),target:fault.targetCase,independent:fault.independentCase};
    record.controls.push(item);save();
    fs.writeFileSync(path.join(OUT,fault.id+'.before.tsx'),original);
    fs.writeFileSync(path.join(OUT,fault.id+'.changed.tsx'),changed);
    try{
      fs.writeFileSync(path.join(owned,fault.path),changed);
      const actual=hashes(owned,held),expectedHashes={...record.before,[fault.path]:sha(changed)};
      assert.deepEqual(actual,expectedHashes,'Only the owned source file changed');
      item.changed=run(owned,fault.id+'-changed',[fault.targetCase,fault.independentCase]);
    }finally{
      fs.writeFileSync(path.join(owned,fault.path),original);
      fs.writeFileSync(path.join(OUT,fault.id+'.restored.tsx'),read(owned,fault.path));
      assert.deepEqual(hashes(owned,held),record.before,'Same-copy whole source restore exact');
      item.restoredSourceSha256=sha(read(owned,fault.path));save();
    }
    item.restored=run(owned,fault.id+'-restored');save();
  }
  record.after=hashes(ROOT,held);assert.deepEqual(record.after,record.before,'Canonical sources never changed');
  record.status='PASSED';save();
  console.log('Actual candidate cases:22passed,0failed.');
  console.log('Physical source controls:11, each1ownedassertionfailure+1independentpass+20filtered.');
  console.log('Same-copy full restores:11, each22actualpasses, allsourcehashes exact.');
  console.log('Canonical selected and QA source holds:'+held.length+', status:'+record.status+'.');
}catch(error){record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};save();throw error;}
finally{if(owned){assert.equal(path.dirname(owned),os.tmpdir());assert(path.basename(owned).startsWith('sc-coaching-controls-'));fs.rmSync(owned,{recursive:true,force:true});}}
