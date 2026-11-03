import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const specPath=process.argv[2],out=process.env.QA_OUT;
assert.ok(specPath&&out,'Control specification and QA_OUT are required');
const spec=JSON.parse(fs.readFileSync(specPath,'utf8')),root=path.resolve(out,'finite-controls');
assert.equal(spec.version,1);assert.ok(Array.isArray(spec.suites)&&spec.suites.length===2);
assert.ok(Array.isArray(spec.faults)&&spec.faults.length>0);
assert.equal(new Set(spec.faults.map(f=>f.name)).size,spec.faults.length);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=new Map();
for(const [file,pin] of Object.entries(spec.productPins)){
  assert.ok(/^src\/.+\.tsx?$/.test(file));assert.match(pin,/^[a-f0-9]{64}$/);
  const bytes=fs.readFileSync(file);assert.equal(sha(bytes),pin,file);source.set(file,bytes);
}
const suites=new Map();
for(const suite of spec.suites){
  assert.match(suite.testPath,/^src\/test\/.+\.test\.tsx?$/);
  assert.equal(sha(fs.readFileSync(suite.testPath)),suite.sha256,suite.testPath);
  assert.ok(Array.isArray(suite.cases)&&suite.cases.length>0);
  assert.equal(new Set(suite.cases.map(c=>c.fullName)).size,suite.cases.length);
  assert.equal(new Set(suite.cases.map(c=>c.rawFile)).size,suite.cases.length);
  assert.match(suite.rawEnv,/^[A-Z][A-Z_]+$/);
  for(const c of suite.cases)assert.match(c.rawFile,/^[a-z0-9-]+\.json$/);
  suites.set(suite.testPath,suite);
}
fs.mkdirSync(root,{recursive:true});
const held=()=>{for(const [file,bytes] of source)assert.deepEqual(fs.readFileSync(file),bytes,file+' source must be restored');};
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function run(name,selected){
  const dir=path.join(root,name);fs.mkdirSync(dir,{recursive:true});
  const raw=path.join(dir,'raw');fs.mkdirSync(raw);
  const receipt=path.join(out,'transport','control-'+name+'.log');fs.writeFileSync(receipt,'');
  const reportPath=path.join(dir,'units.json');
  const files=selected?[selected.testPath]:spec.suites.map(s=>s.testPath);
  const args=['node_modules/vitest/vitest.mjs','run',...files,'--maxWorkers=1','--minWorkers=1',
    '--reporter=verbose','--reporter=json','--outputFile='+reportPath];
  if(selected)args.push('-t','^'+escapeRegex(selected.fullName)+'$');
  const env={...process.env,SIM_OFFLINE_RECEIPT:receipt};
  for(const suite of spec.suites){
    env[suite.rawEnv]=path.join(raw,suite.testPath.replace(/^src\/test\//,''));
    fs.mkdirSync(env[suite.rawEnv],{recursive:true});
  }
  const child=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});
  const log=(child.stdout??'')+'\n'+(child.stderr??'');
  fs.writeFileSync(path.join(dir,'units.log'),log);process.stdout.write(log);
  fs.writeFileSync(path.join(dir,'process.json'),JSON.stringify({status:child.status,signal:child.signal,error:child.error?String(child.error):null,args},null,2)+'\n');
  assert.ok(!child.signal&&!child.error,name+' must finish natively');
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  const rows=report.testResults.flatMap(file=>file.assertionResults.map(row=>({...row,file:path.relative(process.cwd(),file.name).replaceAll('\\','/')})));
  const counters={};
  for(const key of ['numRuntimeErrorTestSuites','numUnhandledErrors','numTodoTests']){
    counters[key]=Object.hasOwn(report,key)?report[key]:null;
    if(counters[key]!==null)assert.equal(counters[key],0,name+' '+key);
  }
  if(Object.hasOwn(report,'unhandledErrors'))assert.deepEqual(report.unhandledErrors,[]);
  assert.equal(fs.readFileSync(receipt,'utf8'),'');
  assert.equal(rows.length,selected?suites.get(selected.testPath).cases.length:spec.suites.reduce((n,s)=>n+s.cases.length,0));
  const selectedRows=rows.filter(r=>r.status==='passed'||r.status==='failed');
  const expected=selected?[selected.fullName]:spec.suites.flatMap(s=>s.cases.map(c=>c.fullName));
  assert.deepEqual(selectedRows.map(r=>r.fullName).sort(),expected.slice().sort(),name+' actual selected identities');
  assert.equal(new Set(rows.map(r=>r.file+'\n'+r.fullName)).size,rows.length);
  assert.ok(rows.every(r=>['passed','failed','pending','skipped'].includes(r.status)));
  if(selected)assert.ok(rows.filter(r=>r.fullName!==selected.fullName).every(r=>['pending','skipped'].includes(r.status)));
  else assert.ok(rows.every(r=>r.status==='passed'));
  assert.equal(report.numPassedTests,selectedRows.filter(r=>r.status==='passed').length);
  assert.equal(report.numFailedTests,selectedRows.filter(r=>r.status==='failed').length);
  for(const suite of spec.suites){
    const required=selected?(suite.testPath===selected.testPath?[suite.cases.find(c=>c.fullName===selected.fullName)]:[]):suite.cases;
    const dirForSuite=env[suite.rawEnv];
    assert.deepEqual(fs.readdirSync(dirForSuite).sort(),required.map(c=>c.rawFile).sort(),name+' exact RAW files');
    for(const c of required){
      assert.ok(c);const rawPath=path.join(dirForSuite,c.rawFile);JSON.parse(fs.readFileSync(rawPath,'utf8'));
    }
  }
  return {child,report,rows,selectedRows,raw,dir,counters};
}
const summary=[];
held();
const healthy=run('healthy',null);
assert.equal(healthy.child.status,0);assert.equal(healthy.report.success,true);assert.equal(healthy.report.numFailedTests,0);
fs.writeFileSync(path.join(root,'healthy-census.json'),JSON.stringify({rows:healthy.rows.map(r=>({file:r.file,fullName:r.fullName,status:r.status})),counters:healthy.counters,absentCounterMeaning:'UNKNOWN'},null,2)+'\n');
for(const fault of spec.faults){
  assert.match(fault.name,/^[a-z0-9-]+$/);assert.ok(source.has(fault.target));
  const suite=suites.get(fault.testPath);assert.ok(suite);assert.ok(suite.cases.some(c=>c.fullName===fault.fullName&&c.rawFile===fault.rawFile));
  assert.ok(typeof fault.marker==='string'&&fault.marker.length>0);assert.ok(Array.isArray(fault.edits)&&fault.edits.length>0);
  held();const original=source.get(fault.target),before=original.toString('utf8');let changed=before;
  for(const edit of fault.edits){
    assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert.notEqual(edit.before,edit.after);
    assert.equal(changed.split(edit.before).length,2,fault.name+' unique real source anchor');
    changed=changed.replace(edit.before,edit.after);
  }
  let inverse=changed;
  for(const edit of fault.edits.slice().reverse()){
    assert.equal(inverse.split(edit.after).length,2,fault.name+' unique inverse');
    inverse=inverse.replace(edit.after,edit.before);
  }
  assert.equal(inverse,before);assert.notEqual(changed,before,'Control must change actual product code');
  const proofDir=path.join(root,fault.name+'-source');fs.mkdirSync(proofDir);
  fs.writeFileSync(path.join(proofDir,'fixed.txt'),original);fs.writeFileSync(path.join(proofDir,'mutant.txt'),changed);
  fs.writeFileSync(path.join(proofDir,'edit.json'),JSON.stringify(fault,null,2)+'\n');
  let mutant;
  try{
    fs.writeFileSync(fault.target,changed);
    assert.equal(fs.readFileSync(fault.target,'utf8'),changed);
    for(const [file,bytes] of source)if(file!==fault.target)assert.deepEqual(fs.readFileSync(file),bytes);
    mutant=run(fault.name+'-mutant',fault);
    assert.equal(mutant.child.status,1);assert.equal(mutant.report.success,false);
    assert.equal(mutant.report.numFailedTests,1);assert.equal(mutant.report.numPassedTests,0);
    const row=mutant.selectedRows[0];assert.equal(row.status,'failed');
    assert.ok(row.failureMessages.length&&row.failureMessages.every(m=>m.includes('AssertionError')&&m.includes(fault.marker)),fault.name+' owned assertion only');
    const leaf=fault.testPath.replace(/^src\/test\//,'');
    const mutatedRaw=fs.readFileSync(path.join(mutant.raw,leaf,fault.rawFile));
    const healthyRaw=fs.readFileSync(path.join(healthy.raw,leaf,fault.rawFile));
    assert.notDeepEqual(mutatedRaw,healthyRaw,fault.name+' actual RAW must change');
  }finally{
    fs.writeFileSync(fault.target,original);
  }
  held();
  const restored=run(fault.name+'-restored',fault);
  assert.equal(restored.child.status,0);assert.equal(restored.report.success,true);
  assert.equal(restored.report.numPassedTests,1);assert.equal(restored.report.numFailedTests,0);
  assert.deepEqual(restored.selectedRows[0].failureMessages,[]);
  const leaf=fault.testPath.replace(/^src\/test\//,'');
  assert.deepEqual(fs.readFileSync(path.join(restored.raw,leaf,fault.rawFile)),fs.readFileSync(path.join(healthy.raw,leaf,fault.rawFile)),fault.name+' restored RAW exact healthy');
  held();
  summary.push({name:fault.name,target:fault.target,fullName:fault.fullName,marker:fault.marker,sourceChanged:true,
    mutantOwnedFailures:1,restoredPassed:1,rawChanged:true,rawRestored:true,unselectedCredit:'NONE',fixedSha256:sha(original),mutantSha256:sha(Buffer.from(changed))});
  fs.writeFileSync(path.join(root,'progress.json'),JSON.stringify(summary,null,2)+'\n');
}
held();
assert.equal(summary.length,spec.faults.length);
fs.writeFileSync(path.join(root,'admission.json'),JSON.stringify({status:'ACTUAL_FINITE_CONTROLS_PASSED',healthyRows:healthy.rows.length,
  healthyFiles:spec.suites.length,controls:summary,scope:'Each fault has one exact selected owned failure and an exact restored pass. Unselected temporary pending rows earn no pass credit. Ordinary discovery is a separate unfiltered job.'},null,2)+'\n');
