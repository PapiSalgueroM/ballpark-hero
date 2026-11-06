import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const out=process.env.CONNECTIONS_MODE_CONTROL_OUT,reference=process.env.CONNECTIONS_MODE_FIXED_PACKET;
assert(out&&path.isAbsolute(out)&&!fs.existsSync(out),'Fresh absolute CONNECTIONS_MODE_CONTROL_OUT required');
assert(reference&&path.isAbsolute(reference)&&fs.statSync(reference).isDirectory(),'Absolute retained CONNECTIONS_MODE_FIXED_PACKET required');
assert.equal(process.env.SIM_NETWORK,'offline');
assert(process.env.SIM_OFFLINE_RECEIPT&&fs.existsSync(process.env.SIM_OFFLINE_RECEIPT));
assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
fs.mkdirSync(out,{recursive:true});
const hook='src/hooks/useConnections.ts',page='src/pages/Connections.tsx',test='src/test/connectionsModeSelection.test.tsx';
const pins={
  [page]:'b5bd5aaba7d8877be86cc592ca4ae1616b517a5f',[test]:'e79ad2f59a671d83fba294e4bc61c400dd2b3037',
  'docs/plans/2026-11-06-soccer-connections-mode-selection.md':'58f0fd78014cd6508da98f44909942b88409aefe',
  'src/hooks/useNbaConnections.ts':'6eb28d73ca73df504a51e03f8ef0583e4902012c',
  'src/hooks/useNflConnections.ts':'8c9baba45217a9f771637001b583f82b0bf357be',
  'src/hooks/useNhlConnections.ts':'3cde7efba8ee4c99a08c5d0e17eacd8a458fa29d',
  'src/hooks/useBaseballConnections.ts':'eee8e7d66819bd6ac2c9c6a1268e0ebd99d02b0f',
  'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const fixedHook=fs.readFileSync(hook),H=fixedHook.toString('utf8');
for(const[file,sha]of Object.entries(pins))assert.equal(blob(fs.readFileSync(file)),sha,file);
function once(text,from,to,label){assert.equal(text.split(from).length-1,1,label+' exact unique source anchor');assert.notEqual(from,to,label+' physical edit');return text.replace(from,to);}
const originalBlock="  const switchMode = useCallback((m: ConnectionsMode) => setMode(m), []);";
const fixedBlock="  const switchMode = useCallback((m: ConnectionsMode) => {\n    if (m === mode) return;\n    setMode(m);\n    setSelected([]);\n    setLastIncorrect(null);\n    setOneAway(false);\n  }, [mode]);";
const oldHook=fs.readFileSync(path.join(reference,'original-packet','original-hook.ts'));
assert.equal(blob(oldHook),'85964ad8462a9b7c60cd3709240c3107bfb47e7f');
assert(Buffer.from(once(H,fixedBlock,originalBlock,'complete original inverse')).equals(oldHook),'Entire original Hook restored by the sole switchMode inverse');
pins[hook]=blob(fixedHook);
const originalBytes=fs.readFileSync(path.join(reference,'original-packet','raw.json')),fixedBytes=fs.readFileSync(path.join(reference,'raw.json'));
const original=JSON.parse(originalBytes),fixed=JSON.parse(fixedBytes);
const keys=['forward','reverse','forwardFeedback','reverseFeedback','same','progress','daily','unlimited'],preserves=keys.slice(4);
function report(file,expectedFailed,arm){
  const r=json(file),rows=r.testResults.flatMap(s=>s.assertionResults);
  assert.equal(r.numTotalTests,8,arm+' total');assert.equal(r.numPassedTests,8-expectedFailed.length);assert.equal(r.numFailedTests,expectedFailed.length);assert.equal(r.numPendingTests,0);assert.equal(rows.length,8);
  for(const field of ['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(r,field))assert.equal(r[field],0,arm+' '+field);
  assert(rows.every(row=>row.status==='passed'||row.status==='failed'));assert.deepEqual(rows.map(row=>row.title).sort(),keys.map(key=>original.cases[key].title).sort());
  const failed=rows.filter(row=>row.status==='failed'),passed=rows.filter(row=>row.status==='passed');
  assert.deepEqual(failed.map(row=>row.title).sort(),expectedFailed.map(key=>original.cases[key].title).sort(),arm+' exact named failed titles');
  assert(passed.every(row=>row.failureMessages.length===0));
  for(const row of failed){assert(row.failureMessages.length>0);for(const message of row.failureMessages)assert(message.replace(/\x1b\[[0-9;]*m/g,'').startsWith('AssertionError: '+row.title.split(' ')[0]+' '),arm+' actual named business AssertionError');}
  return{r,rows,failed,passed};
}
const originalReport=report(path.join(reference,'original-packet','owned.json'),keys.slice(0,4),'reference original');
const fixedReport=report(path.join(reference,'owned.json'),[],'reference fixed');
assert.deepEqual({...fixed,cases:null},{...original,cases:null},'Actual fixed and original RAW headers/catalog match');
assert.equal(original.version,1);assert.equal(original.unitClock,'2026-11-06T12:00:00Z');assert.equal(original.fictionalPool.length,2);
assert.equal(new Set(original.fictionalPool.flatMap(p=>p.groups.flatMap(g=>g.players))).size,32);
for(const raw of[original,fixed]){assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());assert.equal(Object.values(raw.cases).reduce((n,c)=>n+c.frames.length,0),42);}
for(const key of preserves)assert.deepEqual(fixed.cases[key],original.cases[key],'Full reference preserve '+key);
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),index=execFileSync('git',['ls-files','-s'],{encoding:'utf8'});
const scan=()=>files.map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:hash(b)};});
const before=scan();write(path.join(out,'tracked-before.json'),before);fs.writeFileSync(path.join(out,'index-before.txt'),index);
const installed=()=>{const lock=json('package-lock.json'),rows=Object.keys(lock.packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(p+'/package.json')).map(p=>[p,json(p+'/package.json').version]);assert.equal(rows.length,521);for(const[p,v]of rows)assert.equal(v,lock.packages[p].version,p);return rows;};
const versions=installed();write(path.join(out,'installed-before.json'),versions);
const blockFault=(from,to,label)=>()=>once(H,fixedBlock,once(fixedBlock,from,to,label),'only switchMode changed');
const arms=[
  {name:'fixed',failed:[],make:()=>H},
  {name:'original',failed:keys.slice(0,4),make:()=>oldHook.toString('utf8')},
  {name:'omit-same-mode-guard',failed:['same'],make:blockFault('    if (m === mode) return;\n','','same-mode guard')},
  {name:'omit-selection-clear',failed:['forward','reverse'],make:blockFault('    setSelected([]);\n','','selection clear')},
  {name:'omit-refusal-clear',failed:['forwardFeedback','reverseFeedback'],make:blockFault('    setLastIncorrect(null);\n','','refusal clear')},
  {name:'omit-one-away-clear',failed:['forwardFeedback','reverseFeedback'],make:blockFault('    setOneAway(false);\n','','one-away clear')},
  {name:'restored',failed:[],make:()=>H},
];
assert.equal(arms.length,7);assert.equal(arms.reduce((sum,arm)=>sum+arm.failed.length,0),11);
for(const arm of arms)assert.equal(Buffer.from(arm.make()).equals(fixedHook),arm.name==='fixed'||arm.name==='restored',arm.name+' actual physical edit');
const summaries=[];let error=null;
try{
  for(const arm of arms){
    const dir=path.join(out,arm.name);fs.mkdirSync(dir);const bytes=Buffer.from(arm.make()),changed=bytes.equals(fixedHook)?[]:[hook];
    assert.equal(changed.length,arm.name==='fixed'||arm.name==='restored'?0:1);
    fs.writeFileSync(hook,bytes);fs.writeFileSync(path.join(dir,'working-hook.ts'),bytes);
    const receipt={name:arm.name,changed,hookBlob:blob(bytes),hookSha256:hash(bytes),predictedFailureIds:arm.failed.map(key=>original.cases[key].title.split(' ')[0])};write(path.join(dir,'source.json'),receipt);
    const expected=before.map(row=>row.file===hook?{file:hook,bytes:bytes.length,sha256:hash(bytes)}:row);
    assert.deepEqual(scan(),expected,arm.name+' every tracked body before child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,arm.name+' index before child');
    const logFile=path.join(dir,'unit.log'),fd=fs.openSync(logFile,'w'),rawFile=path.join(dir,'raw.json'),reportFile=path.join(dir,'owned.json');
    let child;
    try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+reportFile],{cwd:process.cwd(),env:{...process.env,CONNECTIONS_MODE_RAW:rawFile},stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
    write(path.join(dir,'child.json'),{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.equal(child.error,undefined,arm.name+' launch');assert.equal(child.signal,null,arm.name+' signal');assert.equal(child.status,arm.failed.length?1:0,arm.name+' exit');
    const result=report(reportFile,arm.failed,arm.name),log=fs.readFileSync(logFile,'utf8');
    assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/.test(log),arm.name+' no runtime/setup banner');
    const rawBytes=fs.readFileSync(rawFile),raw=JSON.parse(rawBytes);assert.deepEqual({...raw,cases:null},{...fixed,cases:null},arm.name+' full RAW header/catalog');assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());
    let frames=0;const labels={};
    for(const key of keys){const value=raw.cases[key];assert.equal(value.title,original.cases[key].title);assert(value.frames.length>=2);labels[key]=value.frames.map(frame=>frame.label);assert.equal(labels[key].at(-1),'teardown-settled');assert.equal(new Set(labels[key]).size,labels[key].length);
      const known=new Set([...original.cases[key].frames,...fixed.cases[key].frames].map(frame=>frame.label));
      for(const frame of value.frames){frames++;assert(known.has(frame.label),arm.name+' '+key+' known capture label');assert.equal(frame.storage['connections-unrelated'],'held');assert.equal(frame.state.puzzle.groups.length,4);assert(frame.state.puzzle.groups.every(group=>group.players.length===4));assert(Array.isArray(frame.state.selected));assert(Array.isArray(frame.state.solvedGroups));assert(Array.isArray(frame.state.remainingPlayers));assert.equal(typeof frame.state.oneAway,'boolean');assert(Number.isInteger(frame.state.lives));for(const field of['draws','transport','dailyLog','completions'])assert(Array.isArray(frame[field]));assert(frame.draws.every(draw=>draw===0));assert.equal(frame.completions.length,0);for(const request of frame.transport){assert.equal(request.table,'connections_puzzles');assert.deepEqual(request.steps,[{method:'select',args:['puzzle_id, groups_json']},{method:'order',args:['sort_order',{ascending:true}]},{method:'range',args:[0,999]}]);assert.equal(request.response.error,null);assert.equal(request.response.data.length,2);}}
    }
    const unaffected=keys.filter(key=>!arm.failed.includes(key));
    for(const key of unaffected)assert.deepEqual(raw.cases[key],fixed.cases[key],arm.name+' whole unaffected '+key);
    if(arm.name==='original')assert(rawBytes.equals(originalBytes),'Original whole RAW exactly equals admitted original');
    if(arm.name==='fixed'||arm.name==='restored'){assert(rawBytes.equals(fixedBytes),arm.name+' whole RAW exactly equals admitted fixed');assert.equal(frames,42);}
    assert.deepEqual(scan(),expected,arm.name+' every tracked body after child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,arm.name+' index after child');assert.deepEqual(installed(),versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
    const summary={status:'passed',...receipt,actualRows:8,actualFailed:result.failed.map(row=>row.title),actualPassed:result.passed.map(row=>row.title),rawCases:8,rawFrames:frames,labels,rawBytes:rawBytes.length,rawSha256:hash(rawBytes),wholeUnaffectedCases:unaffected,wholePreservationCases:preserves.filter(key=>!arm.failed.includes(key)),otherTrackedBodiesHeld:true,indexHeld:true,installed521Held:true,offlineHeld:true,runtimeFields:Object.fromEntries(['numRuntimeErrorTestSuites','numUnhandledErrors'].map(key=>[key,{present:Object.hasOwn(result.r,key),value:result.r[key]??null}]))};
    write(path.join(dir,'admission.json'),summary);summaries.push(summary);console.log('PASS '+arm.name+' actual '+result.failed.length+' named reds, '+result.passed.length+' passes, '+frames+' RAW frames');
    fs.writeFileSync(hook,fixedHook);assert.deepEqual(scan(),before,arm.name+' fixed source restored between arms');
  }
}catch(cause){error=cause;throw cause;}finally{
  fs.writeFileSync(hook,fixedHook);const after=scan();write(path.join(out,'tracked-after.json'),after);assert.deepEqual(after,before,'Every tracked physical body restored exactly');assert.equal(blob(fs.readFileSync(hook)),pins[hook]);const finalIndex=execFileSync('git',['ls-files','-s'],{encoding:'utf8'});fs.writeFileSync(path.join(out,'index-after.txt'),finalIndex);assert.equal(finalIndex,index,'Index restored');const finalVersions=installed();write(path.join(out,'installed-after.json'),finalVersions);assert.deepEqual(finalVersions,versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
  write(path.join(out,'summary.json'),{status:error?'failed':'passed',error:error?String(error):null,pins,arms:summaries,completedArms:summaries.length,actualRows:summaries.reduce((n,arm)=>n+arm.actualRows,0),actualNamedBusinessReds:summaries.reduce((n,arm)=>n+arm.actualFailed.length,0),originalRawBytes:originalBytes.length,originalRawSha256:hash(originalBytes),fixedRawBytes:fixedBytes.length,fixedRawSha256:hash(fixedBytes),allTrackedRestored:true,indexHeld:true,installed521Held:true,offlineHeld:true,limits:'Source-only causal unit controls. Actual failed titles must equal predictions and every failure must be a named business AssertionError. The omitted same-mode guard intentionally fails CONN_MODE_SAME; only unaffected whole cases are compared in that arm. No build, native,24-other-sport rerun,full-suite or live backend credit.'});
}
assert.equal(summaries.length,7);assert.equal(summaries.reduce((n,arm)=>n+arm.actualRows,0),56);assert.equal(summaries.reduce((n,arm)=>n+arm.actualFailed.length,0),11);console.log('PASS7 arms,56 actual rows,11 named business reds; unaffected whole cases and original/fixed/restored whole RAW held');
