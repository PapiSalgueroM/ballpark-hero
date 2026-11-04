import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const out=path.resolve(process.argv[2]??'');
assert(process.argv[2]&&out!==process.cwd(),'Outside evidence directory required');
fs.mkdirSync(out,{recursive:true});
const suites=[{"path":"src/test/clubManagerRetrainingReplacement.test.ts","blob":"ae0d2a2f0cb57c71f9c467fde3a2776ea5561f4d","suite":"Club Manager retraining replacement choice","rawEnv":"CM_REPLACEMENT_RAW","rawDir":"engine","cases":[{"fullName":"Club Manager retraining replacement choice keeps learned cover until the paid completion and replaces only the chosen role","baseline":"failed","marker":"CM_REPLACE_PAID_CHOICE","rawFile":"paid-choice.json"},{"fullName":"Club Manager retraining replacement choice preserves course intent through pause and reload while Stop leaves future default FIFO unchanged","baseline":"failed","marker":"CM_REPLACE_PAUSE_STOP","rawFile":"pause-stop-reload.json"},{"fullName":"Club Manager retraining replacement choice refuses invalid replacement starts without changing qualifications or consuming a draw","baseline":"failed","marker":"CM_REPLACE_REFUSE_START","rawFile":"invalid-starts.json"},{"fullName":"Club Manager retraining replacement choice preserves stale or unsupported tagged courses through paid ticks and refuses pause edits","baseline":"failed","marker":"CM_REPLACE_UNSUPPORTED","rawFile":"unsupported-courses.json"},{"fullName":"Club Manager retraining replacement choice keeps omitted choices exact across default FIFO paid outputs and full draw tapes","baseline":"passed","marker":null,"rawFile":"ordinary-fifo.json"},{"fullName":"Club Manager retraining replacement choice retains spare-slot behavior and untagged scalar save compatibility without adding replacement metadata","baseline":"passed","marker":null,"rawFile":"legacy-loads.json"}]},{"path":"src/test/clubManagerRetrainingReplacementUi.test.tsx","blob":"cb6a7e3a57e67e8dde5f53a29b89395e691a13f0","suite":"Club Manager retraining replacement choice UI","rawEnv":"CM_REPLACEMENT_UI_RAW","rawDir":"ui","cases":[{"fullName":"Club Manager retraining replacement choice UI lets the manager keep RW cover and forwards the chosen replacement without editing current positions","baseline":"failed","marker":"CM_REPLACE_UI_CHOICE","rawFile":"choose.json"},{"fullName":"Club Manager retraining replacement choice UI clears a previous choice when switching players and retains the default two-argument callback","baseline":"failed","marker":"CM_REPLACE_UI_RESET","rawFile":"reset.json"},{"fullName":"Club Manager retraining replacement choice UI shows the saved completion choice through Pause and Resume, and Stop removes only the course","baseline":"failed","marker":"CM_REPLACE_UI_PENDING","rawFile":"pending.json"},{"fullName":"Club Manager retraining replacement choice UI holds an unavailable saved replacement safely while leaving Stop available","baseline":"failed","marker":"CM_REPLACE_UI_UNKNOWN","rawFile":"unknown.json"},{"fullName":"Club Manager retraining replacement choice UI keeps ordinary target fit and callbacks unchanged without a replacement selection","baseline":"passed","marker":null,"rawFile":"ordinary.json"}]}];
const app={
  'src/lib/clubManager.ts':'e3c9bcf0aec0f1e1caeb27d38d506d591d694237',
  'src/components/club-manager/TrainingScreen.tsx':'1247042a9e57c9bd89958959dff8c1490f633313',
  'src/hooks/useClubManager.ts':'fe8d97dbfabaea602968e9cca25d4930895093e1',
};
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const blob=buffer=>crypto.createHash('sha1').update(Buffer.from('blob '+buffer.length+'\0')).update(buffer).digest('hex');
const read=file=>fs.readFileSync(file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const strip=text=>text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
const fixed=new Map(Object.entries(app).map(([file,pin])=>{const bytes=read(file);assert.equal(blob(bytes),pin,file);return[file,bytes];}));
const originals=new Map([...fixed.keys()].map(file=>[file,read(path.join(out,'source-old',file))]));
const oldPins=['45493aa7b0ccea080a6dd75a879000c07fd8c9ac','cb2b02e885e01e4fe4248a16b4aade76046da486','32a058a2cbe7888a218f527538d6b687184f21ac'];
for(const [[file,bytes],pin]of [...originals].map((row,i)=>[row,oldPins[i]]))assert.equal(blob(bytes),pin,file+' original');
for(const suite of suites)assert.equal(blob(read(suite.path)),suite.blob,suite.path);
const duplicateUi=read(path.join(out,'source-control','TrainingScreen.duplicate.tsx'));
assert.equal(blob(duplicateUi),'6ddbf628bfcf57eedea6a72dc803d17b31bd9c1e','Physical duplicate validator source');
for(const[file,bytes]of fixed){const target=path.join(out,'source-fixed',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const restore=()=>{for(const[file,bytes]of fixed)fs.writeFileSync(file,bytes);};
const held=()=>{for(const[file,bytes]of fixed)assert.deepEqual(read(file),bytes,file+' exact fixed source restored');};
const phases=[];
function run(name,mode,selection) {
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const receipt=path.join(dir,'transport.log');fs.writeFileSync(receipt,'');
  const env={...process.env,SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:receipt};
  for(const suite of suites){const rawDir=path.join(dir,'raw',suite.rawDir);fs.mkdirSync(rawDir,{recursive:true});env[suite.rawEnv]=rawDir;}
  const chosen=selection==='engine'?suites.slice(0,1):selection==='ui'?suites.slice(1):suites;
  const args=['run',...chosen.map(s=>s.path),'--reporter=json','--outputFile='+path.join(dir,'report.json')];
  if(selection==='engine')args.push('-t',suites[0].cases[0].fullName);
  const log=path.join(dir,'units.log'),fd=fs.openSync(log,'w');let result;
  try{result=spawnSync(path.resolve('node_modules/.bin/vitest'),args,{env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  save(path.join(dir,'native.json'),{status:result.status,signal:result.signal,error:result.error?String(result.error):null,args});
  assert(!result.error&&!result.signal,name+' native process must complete');
  const fault=mode==='old'||mode==='engine-fault'||mode==='ui-fault';
  assert.equal(result.status,fault?1:0,name+' native exit');
  const report=json(path.join(dir,'report.json')),files=report.testResults??[],rows=files.flatMap(file=>file.assertionResults??[]);
  assert.equal(files.length,chosen.length,name+' file count');
  assert.equal(rows.length,chosen.reduce((n,s)=>n+s.cases.length,0),name+' complete rows');
  assert.equal(new Set(rows.map(row=>row.fullName)).size,rows.length,name+' unique full names');
  const runtimeCounters={};
  for(const key of ['numRuntimeErrorTestSuites','numUnhandledErrors']){
    runtimeCounters[key]=key in report?report[key]:'UNKNOWN';if(key in report)assert.equal(report[key],0,name+' '+key);
  }
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed Suites|Failed to collect/.test(strip(fs.readFileSync(log,'utf8'))),name+' no setup/runtime banner');
  const summary={name,mode,native:result.status,passed:0,failed:0,unselected:0,runtimeCounters,raw:[]};
  for(const suite of chosen)for(const want of suite.cases){
    const found=rows.filter(row=>row.fullName===want.fullName);assert.equal(found.length,1,name+' '+want.fullName);
    const row=found[0];let expected='passed';
    if(mode==='old')expected=want.baseline;
    if(selection==='engine')expected=want.fullName===suites[0].cases[0].fullName?(mode==='engine-fault'?'failed':'passed'):'unselected';
    if(mode==='ui-fault')expected=want.marker==='CM_REPLACE_UI_UNKNOWN'?'failed':'passed';
    if(expected==='unselected')assert(['pending','skipped'].includes(row.status),name+' excluded row must be skipped or pending');
    else assert.equal(row.status,expected,name+' '+want.fullName);
    summary[expected]++;
    const message=strip((row.failureMessages??[]).join('\n'));
    if(expected==='failed'){assert(message.includes('AssertionError'),name+' owned assertion');assert(message.includes(want.marker),name+' '+want.marker);}
    else assert.equal(message,'',name+' no unexpected failure text');
    if(expected!=='unselected'){
      const file=path.join(dir,'raw',suite.rawDir,want.rawFile),raw=json(file);
      assert.equal(raw.case,want.rawFile.slice(0,-5),name+' RAW identity');assert(raw.observations&&typeof raw.observations==='object',name+' RAW observations');
      summary.raw.push({file:path.relative(out,file),bytes:read(file).length,sha256:hash(read(file))});
    }
  }
  for(const suite of suites){
    const count=summary.raw.filter(row=>row.file.split(path.sep).includes(suite.rawDir)).length;
    assert.equal(fs.readdirSync(path.join(dir,'raw',suite.rawDir)).length,count,name+' exact RAW set '+suite.rawDir);
  }
  assert.equal(fs.statSync(receipt).size,0,name+' empty offline receipt');
  save(path.join(dir,'admission.json'),summary);phases.push(summary);return dir;
}
function sameRaw(a,b,chosen=suites){
  for(const suite of chosen)for(const entry of suite.cases){
    const relative=path.join('raw',suite.rawDir,entry.rawFile);
    assert.deepEqual(read(path.join(a,relative)),read(path.join(b,relative)),relative+' full RAW restored');
  }
}
let healthy;
try {
  healthy=run('fixed','fixed');
  try{for(const[file,bytes]of originals)fs.writeFileSync(file,bytes);run('whole-original','old');}finally{restore();held();}
  const restored=run('restored','fixed');sameRaw(healthy,restored);
  for(const suite of suites)for(const entry of suite.cases.filter(row=>row.baseline==='passed'))
    assert.deepEqual(read(path.join(healthy,'raw',suite.rawDir,entry.rawFile)),read(path.join(out,'whole-original','raw',suite.rawDir,entry.rawFile)),entry.fullName+' entire old/default RAW and tape');
  const engine='src/lib/clubManager.ts',before='&& (!replacement || pos !== p.retraining!.replace)',after='&& true';
  const text=fixed.get(engine).toString('utf8');assert.equal(text.split(before).length,2,'Unique physical replacement predicate');
  const mutant=Buffer.from(text.replace(before,after));assert.notEqual(hash(mutant),hash(fixed.get(engine)),'Physical source must change');
  fs.writeFileSync(path.join(out,'source-control','clubManager.wrong-replacement.ts'),mutant);
  let engineFault;
  try{fs.writeFileSync(engine,mutant);assert.deepEqual(read(engine),mutant);engineFault=run('engine-wrong-replacement','engine-fault','engine');}finally{restore();held();}
  const good=json(path.join(healthy,'raw/engine/paid-choice.json')).observations,bad=json(path.join(engineFault,'raw/engine/paid-choice.json')).observations;
  const positions=value=>value.selectedRun.state.squad.find(p=>p.id===value.id).secondaryPositions;
  assert.deepEqual(positions(good),['RW','ST']);assert.deepEqual(positions(bad),['CM','ST']);
  assert.equal(good.selectedFit,0);assert.equal(bad.selectedFit,2);
  assert.deepEqual(bad.selectedRun.draws,good.selectedRun.draws);assert.equal(bad.selectedRun.nextDraw,good.selectedRun.nextDraw);
  const engineRestore=run('engine-restored','fixed','engine');
  assert.deepEqual(read(path.join(healthy,'raw/engine/paid-choice.json')),read(path.join(engineRestore,'raw/engine/paid-choice.json')),'Selected engine full RAW/tape recovery');
  let uiFault;
  try{fs.writeFileSync('src/components/club-manager/TrainingScreen.tsx',duplicateUi);assert.deepEqual(read('src/components/club-manager/TrainingScreen.tsx'),duplicateUi);uiFault=run('ui-duplicate-validator','ui-fault','ui');}finally{restore();held();}
  const goodRows=json(path.join(healthy,'raw/ui/unknown.json')).observations.rows,badRows=json(path.join(uiFault,'raw/ui/unknown.json')).observations.rows;
  assert.equal(goodRows.length,9);assert.equal(badRows.length,9);
  for(let i=0;i<5;i++){assert.equal(badRows[i].warning,true);assert.equal(badRows[i].toggle,false);}
  const goodFuture=goodRows.find(row=>row.fields.future===99),badFuture=badRows.find(row=>row.fields.future===99);
  assert(goodFuture&&badFuture,'Actual future-key vector present');
  assert.deepEqual([goodFuture.warning,goodFuture.toggle],[true,false]);assert.deepEqual([badFuture.warning,badFuture.toggle],[false,true]);
  const uiRestore=run('ui-restored','fixed','ui');sameRaw(healthy,uiRestore,suites.slice(1));
  save(path.join(out,'controls.json'),{engine:{before:hash(fixed.get(engine)),mutant:hash(mutant),fixedPositions:positions(good),mutantPositions:positions(bad),fixedFit:good.selectedFit,mutantFit:bad.selectedFit,fullRngHeld:true,selectedRestoreFullRaw:true,selected:1,unselectedNoCredit:5,unselectedCredit:false},ui:{fixed:app['src/components/club-manager/TrainingScreen.tsx'],mutant:'6ddbf628bfcf57eedea6a72dc803d17b31bd9c1e',fixedFuture:[true,false],mutantFuture:[false,true],ownedFailures:1,independentPasses:4,restoredPasses:5,fullRawRestored:true}});
  save(path.join(out,'admission.json'),{status:'passed',phases,sourceHeld:true,scope:'Focused 11-case fixed, whole-original 8-owned/3-held, restored11 and two effective physical controls. Selected engine fault/restoration has five unselected skipped-or-pending cases with no credit. No build/browser/full-fleet claim.'});
  console.log('Retraining replacement: fixed11, original8-owned/3-held, restored11, effective engine and UI controls with full source/RAW restoration.');
} finally {restore();held();}
