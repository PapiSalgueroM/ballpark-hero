import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const out=process.env.C4_CANCEL_CONTROL_OUT,reference=process.env.C4_CANCEL_FIXED_PACKET;
assert(out&&path.isAbsolute(out)&&!fs.existsSync(out),'Fresh absolute C4_CANCEL_CONTROL_OUT required');
assert(reference&&path.isAbsolute(reference)&&fs.statSync(reference).isDirectory(),'Retained absolute C4_CANCEL_FIXED_PACKET required');
const expectedFixedSha=process.env.C4_CANCEL_FIXED_RAW_SHA256,expectedFixedBytes=Number(process.env.C4_CANCEL_FIXED_RAW_BYTES);
assert.match(expectedFixedSha||'',/^[a-f0-9]{64}$/,'Qualified fixed RAW digest required');assert(Number.isSafeInteger(expectedFixedBytes)&&expectedFixedBytes>0,'Qualified fixed RAW byte count required');
assert.equal(process.env.SIM_NETWORK,'offline');assert(process.env.SIM_OFFLINE_RECEIPT&&fs.existsSync(process.env.SIM_OFFLINE_RECEIPT));assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
fs.mkdirSync(out,{recursive:true});
const hook='src/hooks/useFootballConnect4.ts',test='src/test/footballConnect4CancelOwnership.test.tsx';
const pins={
 [hook]:'630d21236f9f82ad4e728caad64dc4139bab7b57',[test]:'7f648764ed421584337c0a908d68a0941681e0a8',
 'docs/plans/2026-11-06-soccer-connect4-cancel-ownership.md':'a0f9e88e81c29bb115b4f1a40601dfc75f3fac8f',
 'src/pages/FootballConnect4.tsx':'634f94cea7810cfd678c3a4a6f470c3039773882',
 'src/components/football-connect4/FootballConnect4Board.tsx':'aa57d68f047d92eb83438f5dac12984051f8111a',
 'src/types/footballConnect4.ts':'b189d5c460af28ed43b7ce652d495e72df6448b0',
 'src/test/footballConnect4RequestOwnership.test.tsx':'1156a83c6966f4c55bef0ed4c7f7a3288f4e87eb',
 'src/test/connect4ReasonShape.test.tsx':'112831b4d78682a1f242c3fb75ae81f25b4ba14b',
 'src/hooks/useNbaConnect4.ts':'1140a3762571b4143dadd2ea06abe2a4902b56ef',
 'src/hooks/useNflConnect4.ts':'a61d056156dd44d471ca96eb7618e2ecd4ddad32',
 'src/hooks/useNhlConnect4.ts':'7d3d05bec3082731e1a04415176c678e6b295870',
 'src/hooks/useMlbConnect4.ts':'8f2fa1e059e92ec5b68af1f71b186b335423b5b3',
 'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33','src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
 'public/football-connect-4/index.html':'e401626658329203487a7d45eec6e745a1bed353',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(file)),write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(file)),want,file+' actual source');
const fixedHook=fs.readFileSync(hook),H=fixedHook.toString('utf8');
function once(text,from,to,label){assert.equal(text.split(from).length-1,1,label+' unique complete anchor');assert.notEqual(from,to,label+' physical edit');return text.replace(from,()=>to);}
const originalBlock="  const cancelSelection = useCallback(() => {\n    setSelectedColumn(null);\n    setTargetRow(null);\n    setValidationError(null);\n  }, []);";
const fixedBlock="  const cancelSelection = useCallback(() => {\n    pendingRequest.current = null;\n    setIsValidating(false);\n    setSelectedColumn(null);\n    setTargetRow(null);\n    setValidationError(null);\n  }, []);";
const oldHook=fs.readFileSync(path.join(reference,'original-packet','original-hook.ts'));assert.equal(blob(oldHook),'971dbdfa5a0e3c5adf749f9f301cc0fd994a178f');
assert(Buffer.from(once(H,fixedBlock,originalBlock,'two-line Cancel inverse')).equals(oldHook),'Entire Hook inverse is original971');
const originalBytes=fs.readFileSync(path.join(reference,'original-packet','raw.json')),fixedBytes=fs.readFileSync(path.join(reference,'raw.json'));
assert.equal(originalBytes.length,798067);assert.equal(hash(originalBytes),'968ecae8537532cea51eb5866e24427d8d3b8fe1ce16553e9d78b0b17fa93369');
assert.equal(fixedBytes.length,expectedFixedBytes);assert.equal(hash(fixedBytes),expectedFixedSha);
const original=JSON.parse(originalBytes),fixed=JSON.parse(fixedBytes),fixedProof=json(path.join(reference,'fixed-admission.json'));
assert.equal(fixedProof.status,'fixed-six-cancel-passed-two-whole-cases-held');assert.equal(fixedProof.cases,6);assert.equal(fixedProof.rawFrames,31);assert.equal(fixedProof.rawBytes,fixedBytes.length);assert.equal(fixedProof.rawSHA256,hash(fixedBytes));
const keys=['daily','unlimited','invalid','network','idle','progress'],owned=keys.slice(0,4),preserves=keys.slice(4);
function report(file,expectedFailed,name){
 const value=json(file),rows=value.testResults.flatMap(s=>s.assertionResults);assert.equal(value.numTotalTests,6);assert.equal(value.numPassedTests,6-expectedFailed.length);assert.equal(value.numFailedTests,expectedFailed.length);assert.equal(value.numPendingTests,0);assert.equal(rows.length,6);
 for(const field of['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(value,field))assert.equal(value[field],0,name+' '+field);
 assert(rows.every(r=>r.status==='passed'||r.status==='failed'));assert.deepEqual(rows.map(r=>r.title).sort(),keys.map(k=>original.cases[k].title).sort(),name+' exact six titles');
 const failed=rows.filter(r=>r.status==='failed'),passed=rows.filter(r=>r.status==='passed');assert.deepEqual(failed.map(r=>r.title).sort(),expectedFailed.map(k=>original.cases[k].title).sort(),name+' exact named failed titles');assert(passed.every(r=>r.failureMessages.length===0));
 for(const row of failed){assert(row.failureMessages.length>0);for(const message of row.failureMessages)assert(message.replace(/\x1b\[[0-9;]*m/g,'').startsWith('AssertionError: '+row.title.split(' ')[0]+' '),name+' actual named business AssertionError');}
 return{value,rows,failed,passed};
}
report(path.join(reference,'original-packet','owned.json'),owned,'qualified original');report(path.join(reference,'owned.json'),[],'qualified fixed');
assert.deepEqual({...fixed,cases:null},{...original,cases:null},'Full reference RAW header and actual catalog held');assert.equal(fixed.unitClock,'2026-11-06T12:00:00Z');assert.equal(fixed.version,1);
for(const key of preserves)assert.deepEqual(fixed.cases[key],original.cases[key],'Whole original/fixed preserve '+key);
const ordinaryLabels={
 unlimited:['unlimited-old-fetch-pending','unlimited-after-cancel','unlimited-old-valid-settled','teardown-settled'],
 invalid:['invalid-old-request-pending','invalid-after-cancel','invalid-old-refusal-settled','teardown-settled'],
 network:['network-old-request-pending','network-after-cancel','network-old-refusal-settled','teardown-settled'],
 idle:['idle-selection-before-cancel','idle-selection-after-cancel','idle-next-selection','teardown-settled'],
 progress:['daily-current-move','daily-current-refusal','daily-after-settled-cancel','unlimited-current-move','unlimited-current-refusal','unlimited-after-settled-cancel','progress-return-to-daily','teardown-settled'],
};
const dailyFixed=['daily-old-body-pending','daily-after-cancel','daily-new-request-attempt','daily-old-valid-during-new-request','daily-new-response-settled','daily-next-selection-clean','teardown-settled'];
const dailyLocked=['daily-old-body-pending','daily-after-cancel','daily-original-cannot-enter-new-request','teardown-settled'];
const dailyBlocked=['daily-old-body-pending','daily-after-cancel','daily-new-request-attempt','daily-old-valid-after-blocked-new-request','teardown-settled'];
for(const[raw,labels,count]of[[original,dailyLocked,28],[fixed,dailyFixed,31]]){assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());assert.deepEqual(raw.cases.daily.frames.map(f=>f.label),labels);for(const key of keys.slice(1))assert.deepEqual(raw.cases[key].frames.map(f=>f.label),ordinaryLabels[key]);assert.equal(Object.values(raw.cases).reduce((sum,c)=>sum+c.frames.length,0),count);}
for(const[name,count]of[['existing-owner',12],['existing-reasons',22]]){const result=json(path.join(reference,name+'.json')),rows=result.testResults.flatMap(s=>s.assertionResults);assert.equal(rows.length,count);assert.equal(result.numTotalTests,count);assert.equal(result.numPassedTests,count);assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,0);assert(rows.every(r=>r.status==='passed'));}
const prior=fs.readFileSync(path.join(reference,'prior-owner-raw.json'));assert.equal(prior.length,365602);assert.equal(hash(prior),'9109bcf79649a72de8e16364ca45b5ca05129fe33ab097e0ba88910b360df823');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),index=execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),scan=()=>files.map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:hash(b)};});
const before=scan();write(path.join(out,'tracked-before.json'),before);fs.writeFileSync(path.join(out,'index-before.txt'),index);
const installed=()=>{const lock=json('package-lock.json'),rows=Object.keys(lock.packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(p+'/package.json')).map(p=>[p,json(p+'/package.json').version]);assert.equal(rows.length,521);for(const[p,v]of rows)assert.equal(v,lock.packages[p].version,p);return rows;};
const versions=installed();write(path.join(out,'installed-before.json'),versions);
const arms=[
 {name:'fixed',failed:[],frames:31,daily:dailyFixed,make:()=>H},
 {name:'original',failed:owned,frames:28,daily:dailyLocked,make:()=>oldHook.toString('utf8')},
 {name:'omit-cancel-owner',failed:owned,frames:29,daily:dailyBlocked,make:()=>once(H,fixedBlock,once(fixedBlock,'    pendingRequest.current = null;\n','','Cancel owner invalidation'),'only scoped Cancel owner removed')},
 {name:'omit-cancel-busy',failed:owned,frames:28,daily:dailyLocked,make:()=>once(H,fixedBlock,once(fixedBlock,'    setIsValidating(false);\n','','Cancel busy release'),'only scoped Cancel busy removed')},
 {name:'restored',failed:[],frames:31,daily:dailyFixed,make:()=>H},
];
for(const arm of arms)assert.equal(Buffer.from(arm.make()).equals(fixedHook),arm.name==='fixed'||arm.name==='restored',arm.name+' actual source changed');
const summaries=[];let error=null;
try{
 for(const arm of arms){
  const dir=path.join(out,arm.name);fs.mkdirSync(dir);const body=Buffer.from(arm.make()),changed=body.equals(fixedHook)?[]:[hook];fs.writeFileSync(hook,body);fs.writeFileSync(path.join(dir,'working-hook.ts'),body);
  const receipt={name:arm.name,changed,hookBlob:blob(body),hookSha256:hash(body),predictedFailureIds:arm.failed.map(k=>original.cases[k].title.split(' ')[0])};write(path.join(dir,'source.json'),receipt);
  const expected=before.map(row=>row.file===hook?{file:hook,bytes:body.length,sha256:hash(body)}:row);assert.deepEqual(scan(),expected,arm.name+' physical tracked bodies before child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,arm.name+' index before child');
  const rawFile=path.join(dir,'raw.json'),reportFile=path.join(dir,'owned.json'),logFile=path.join(dir,'unit.log'),fd=fs.openSync(logFile,'w');let child;
  try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+reportFile],{cwd:process.cwd(),env:{...process.env,C4_CANCEL_OWNER_RAW:rawFile},stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
  write(path.join(dir,'child.json'),{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.equal(child.error,undefined,arm.name+' child launch');assert.equal(child.signal,null);assert.equal(child.status,arm.failed.length?1:0,arm.name+' actual child exit');
  const result=report(reportFile,arm.failed,arm.name),log=fs.readFileSync(logFile,'utf8');assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/.test(log),arm.name+' no setup/runtime banner');
  const bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes);assert.deepEqual({...raw,cases:null},{...fixed,cases:null},arm.name+' complete RAW headers/catalog');assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());let frames=0;const labels={};
  for(const key of keys){const c=raw.cases[key];assert.equal(c.title,original.cases[key].title);labels[key]=c.frames.map(f=>f.label);assert.deepEqual(labels[key],key==='daily'?arm.daily:ordinaryLabels[key],arm.name+' '+key+' complete branch labels');
   for(const f of c.frames){frames++;assert.equal(f.state.board.length,6);assert(f.state.board.every(row=>row.length===7));assert.equal(f.storage['c4-unrelated'],'held');for(const field of['draws','transport','dailyLog','search','completions'])assert(Array.isArray(f[field]));assert(f.draws.every(draw=>draw===0));assert(f.page&&typeof f.page.html==='string');for(const wire of f.transport){assert.equal(wire.url,'https://fixture.invalid/functions/v1/football-connect4-validate');assert(Object.hasOwn(wire,'responseBody')&&Object.hasOwn(wire,'transportError'));}}
   const final=c.frames[c.frames.length-1];assert.equal(final.transport.length,key==='daily'?(arm.daily===dailyFixed?2:1):key==='idle'?0:key==='progress'?4:1,arm.name+' '+key+' actual request count');
  }
  assert.equal(frames,arm.frames);for(const key of preserves){assert.equal(result.rows.find(row=>row.title===original.cases[key].title).status,'passed');assert.deepEqual(raw.cases[key],original.cases[key],arm.name+' whole original preserve '+key);}
  if(arm.name==='original')assert(bytes.equals(originalBytes),'Whole original RAW exactly equals admitted original');if(arm.name==='fixed'||arm.name==='restored')assert(bytes.equals(fixedBytes),arm.name+' whole RAW exactly equals qualified fixed');
  assert.deepEqual(scan(),expected,arm.name+' physical tracked bodies after child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index);assert.deepEqual(installed(),versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
  const summary={status:'passed',...receipt,actualRows:6,actualFailed:result.failed.map(r=>r.title),actualPassed:result.passed.map(r=>r.title),rawCases:6,rawFrames:frames,labels,rawBytes:bytes.length,rawSha256:hash(bytes),wholePreservationCases:preserves,otherTrackedBodiesHeld:true,indexHeld:true,installed521Held:true,offlineHeld:true,runtimeFields:Object.fromEntries(['numRuntimeErrorTestSuites','numUnhandledErrors'].map(k=>[k,{present:Object.hasOwn(result.value,k),value:result.value[k]??null}]))};
  write(path.join(dir,'admission.json'),summary);summaries.push(summary);console.log('PASS '+arm.name+' actual '+result.failed.length+' named reds, '+result.passed.length+' passes, '+frames+' full RAW frames');
  fs.writeFileSync(hook,fixedHook);assert.deepEqual(scan(),before,arm.name+' exact fixed body restored between arms');
 }
}catch(cause){error=cause;throw cause;}finally{
 fs.writeFileSync(hook,fixedHook);const after=scan();write(path.join(out,'tracked-after.json'),after);assert.deepEqual(after,before,'Every tracked physical body restored exactly');assert.equal(blob(fs.readFileSync(hook)),pins[hook]);const finalIndex=execFileSync('git',['ls-files','-s'],{encoding:'utf8'});fs.writeFileSync(path.join(out,'index-after.txt'),finalIndex);assert.equal(finalIndex,index);const finalVersions=installed();write(path.join(out,'installed-after.json'),finalVersions);assert.deepEqual(finalVersions,versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
 write(path.join(out,'summary.json'),{status:error?'failed':'passed',error:error?String(error):null,pins,arms:summaries,completedArms:summaries.length,actualRows:summaries.reduce((n,a)=>n+a.actualRows,0),actualNamedBusinessReds:summaries.reduce((n,a)=>n+a.actualFailed.length,0),rawFrames:summaries.reduce((n,a)=>n+a.rawFrames,0),originalRawBytes:originalBytes.length,originalRawSha256:hash(originalBytes),fixedRawBytes:fixedBytes.length,fixedRawSha256:hash(fixedBytes),wholePreservationVectors:summaries.length*preserves.length,allTrackedRestored:true,indexHeld:true,installed521Held:true,offlineHeld:true,limits:'Source-only five-arm causal unit proof. Both complete preservation cases equal admitted original in every arm. Faulty Daily traces deliberately differ: owner omission admits a blocked B attempt, busy omission retains the locked branch while invalidating A. No false whole-fault/original equality. Prior34-case baseline is carried from qualified fixed, not rerun. No build/native/server-abort/unmount/full-suite/live credit.'});
}
assert.equal(summaries.length,5);assert.equal(summaries.reduce((n,a)=>n+a.actualRows,0),30);assert.equal(summaries.reduce((n,a)=>n+a.actualFailed.length,0),12);assert.equal(summaries.reduce((n,a)=>n+a.rawFrames,0),147);console.log('PASS5 arms,30 actual rows,12 named business reds,18 passes,147 full RAW frames,10 whole preserve vectors; source/index/521/offline restored');
