import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildSoccerCoachingStartObserver } from './buildSoccerCoachingStartObserver.mjs';

assert.equal(process.env.CI, '1', 'Actual consumer qualification runs remotely');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_COACHING_START_OUT||'coaching-start-artifacts/consumer');
const phase=process.env.SC_COACHING_START_PHASE||'baseline';
assert(['baseline','fixed'].includes(phase),'Known explicit qualification phase');
fs.mkdirSync(OUT,{recursive:true});
const sha=body=>createHash('sha256').update(body).digest('hex');
const page='src/pages/SoccerCareer.tsx',test='src/test/soccerCareerCoachingStart.consumer.test.tsx',utility='scripts/qa/buildSoccerCoachingStartObserver.mjs';
const read=file=>fs.readFileSync(path.join(ROOT,file));
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2));
const record={phase,status:'running',scope:'Actual two existing retirement-card consumers through one append-only page observer; no product module or full-route claim.'};
const save=()=>json('admission.json',record);
let observerBuild;
save();
try {
  const metaBody=read('qa/soccer-career-coaching-start-v1/SOURCE-READY.json');
  assert.equal(sha(metaBody),'82034d926ac30e7a5bdf642023c900f3635e1939c1a6d299b2765e5f6cccea2f');
  const meta=JSON.parse(metaBody);assert.equal(meta.files.length,17);
  const held=[...new Set([...meta.files.map(row=>row.path),page,test,utility])];
  const hashes=()=>Object.fromEntries(held.map(file=>[file,sha(read(file))]));
  record.before=hashes();
  for(const row of meta.files)assert.equal(record.before[row.path],row.sha256,row.path);
  observerBuild=await buildSoccerCoachingStartObserver({root:ROOT,out:OUT});
  const output=observerBuild.file;
  record.observer=observerBuild.observer;
  const report=path.join(OUT,'vitest.json');
  const run=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+report],{
    cwd:ROOT,env:{...process.env,SC_COACHING_START_OBSERVER:output},encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,
  });
  const cli=(run.stdout||'')+'\n'+(run.stderr||'');fs.writeFileSync(path.join(OUT,'vitest.log'),cli);
  record.process={status:run.status,signal:run.signal,error:run.error?String(run.error):null};
  assert(!run.error&&run.signal===null,'Actual test process completed without timeout/signal');
  const result=JSON.parse(fs.readFileSync(report,'utf8')),suites=result.testResults;
  assert.equal(suites.length,1,'One actual consumer suite');
  assert.equal(suites[0].message,'','No suite/collection/setup error');
  const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
  assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No out-of-row infrastructure diagnostics');
  const rows=suites.flatMap(suite=>suite.assertionResults);
  const intended=['ceremony reviewed coursework opens the prepared manager chooser','direct retirement reviewed coursework opens the prepared manager chooser'];
  const preservation=['ceremony usual manager entry preserves full state and random stream','direct retirement usual manager entry preserves full state and random stream'];
  assert.equal(rows.length,4,'All four meaningful actual consumers ran');
  assert.deepEqual(rows.map(row=>row.title).sort(),[...intended,...preservation].sort(),'Exact case identity set');
  for(const title of preservation)assert.equal(rows.find(row=>row.title===title).status,'passed',title);
  if(phase==='baseline'){
    assert.equal(run.status,1,'Actual old source is red');
    for(const title of intended){
      const row=rows.find(value=>value.title===title);assert.equal(row.status,'failed',title);
      assert(row.failureMessages.length>0&&row.failureMessages.every(message=>/Unable to find an accessible element/.test(message)&&/button/.test(message)&&/Use coaching coursework/.test(message)&&!/Failed to resolve|Cannot find module|ReferenceError|TypeError|timed out/i.test(message)),'Owned missing chooser behavior, not missing import or infrastructure');
    }
    record.status='CAUSE_QUALIFIED_BASELINE_RED';
  }else{
    assert.equal(run.status,0);assert(rows.every(row=>row.status==='passed'));record.status='FIXED_CONSUMERS_PASSED';
  }
  record.cases=rows.map(({title,status,failureMessages})=>({title,status,failureMessages}));
  observerBuild.dispose();observerBuild=undefined;
  record.after=hashes();assert.deepEqual(record.after,record.before,'Canonical selected sources and test remain exact');
  record.causeQualifiedRed=phase==='baseline';save();
  console.log('Actual consumer rows:4, preservation passed:2.');
  console.log('Owned chooser rows:'+intended.map(title=>rows.find(row=>row.title===title).status).join(',')+'.');
  console.log('Infrastructure diagnostics:0; canonical source holds:'+held.length+'.');
  console.log('Coaching start phase:'+phase+', status:'+record.status+'.');
}catch(error){try{observerBuild?.dispose();}catch(cleanupError){record.cleanupFailure={name:cleanupError.name,message:cleanupError.message};}record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};save();throw error;}
