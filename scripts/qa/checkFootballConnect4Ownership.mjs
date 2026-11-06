import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const out=process.env.C4_OWNER_CONTROL_OUT,reference=process.env.C4_OWNER_FIXED_PACKET;
assert(out&&path.isAbsolute(out)&&!fs.existsSync(out),'Fresh absolute C4_OWNER_CONTROL_OUT required');
assert(reference&&path.isAbsolute(reference)&&fs.statSync(reference).isDirectory(),'Absolute retained C4_OWNER_FIXED_PACKET required');
assert.equal(process.env.SIM_NETWORK,'offline');
assert(process.env.SIM_OFFLINE_RECEIPT&&fs.existsSync(process.env.SIM_OFFLINE_RECEIPT));
assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
fs.mkdirSync(out,{recursive:true});
const hook='src/hooks/useFootballConnect4.ts',page='src/pages/FootballConnect4.tsx',test='src/test/footballConnect4RequestOwnership.test.tsx';
const pins={
  [hook]:'971dbdfa5a0e3c5adf749f9f301cc0fd994a178f',[page]:'634f94cea7810cfd678c3a4a6f470c3039773882',
  [test]:'1156a83c6966f4c55bef0ed4c7f7a3288f4e87eb',
  'docs/plans/2026-11-06-soccer-connect4-request-ownership.md':'9f4969d1f8c308d9257d2b5231dab2339c2739db',
  'src/test/connect4ReasonShape.test.tsx':'112831b4d78682a1f242c3fb75ae81f25b4ba14b',
  'src/hooks/useNbaConnect4.ts':'1140a3762571b4143dadd2ea06abe2a4902b56ef',
  'src/hooks/useNflConnect4.ts':'a61d056156dd44d471ca96eb7618e2ecd4ddad32',
  'src/hooks/useNhlConnect4.ts':'7d3d05bec3082731e1a04415176c678e6b295870',
  'src/hooks/useMlbConnect4.ts':'8f2fa1e059e92ec5b68af1f71b186b335423b5b3',
  'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a',
  'package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const fixedHook=fs.readFileSync(hook),fixedPage=fs.readFileSync(page);
for(const[file,sha]of Object.entries(pins))assert.equal(blob(fs.readFileSync(file)),sha,file);
const originalDir=path.join(reference,'original-packet'),oldHook=fs.readFileSync(path.join(originalDir,'original-hook.ts')),oldPage=fs.readFileSync(path.join(originalDir,'original-page.tsx'));
assert.equal(blob(oldHook),'04f0907ffce5488cffe693ff0e80154108b70b89');assert.equal(blob(oldPage),'fcdebeebc3dc5d6050665fbb23364a81cbbd69de');
const originalBytes=fs.readFileSync(path.join(originalDir,'raw.json')),fixedBytes=fs.readFileSync(path.join(reference,'raw.json'));
assert.equal(originalBytes.length,212344);assert.equal(hash(originalBytes),'e0a49982e80210b878b1a23156a8c3966f40ce00d3ae49653ae0671e5092d48b');
assert.equal(fixedBytes.length,365602);assert.equal(hash(fixedBytes),'9109bcf79649a72de8e16364ca45b5ca05129fe33ab097e0ba88910b360df823');
assert.equal(json(path.join(reference,'fixed-admission.json')).status,'fixed-twelve-passed-six-whole-cases-held');
const original=JSON.parse(originalBytes),fixed=JSON.parse(fixedBytes),keys=['reset','daily','refusal','newer','page','duplicate','valid','invalid','unverified','contradictory','busy','network'],preserves=keys.slice(6),ids=Object.fromEntries(keys.map(key=>[key,original.cases[key].title.split(' ')[0]]));
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const scan=()=>files.map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:hash(b)};});
const before=scan();write(path.join(out,'tracked-before.json'),before);
const installed=()=>{const lock=json('package-lock.json'),rows=Object.keys(lock.packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(p+'/package.json')).map(p=>[p,json(p+'/package.json').version]);assert.equal(rows.length,521);for(const[p,v]of rows)assert.equal(v,lock.packages[p].version,p);return rows;};
const versions=installed();write(path.join(out,'installed-before.json'),versions);
function once(text,from,to,label){assert.equal(text.split(from).length-1,1,label+' exact unique source anchor');assert.notEqual(from,to,label+' physical edit');return text.replace(from,to);}
const H=fixedHook.toString('utf8'),P=fixedPage.toString('utf8'),mutate=(label,from,to)=>({hook:once(H,from,to,label),page:P});
const controls=[
  {name:'omit-reset-invalidation',failed:['reset'],make:()=>mutate('reset invalidator',"  const resetGame = useCallback(() => {\n    if (mode !== 'unlimited') return;\n    pendingRequest.current = null;\n    setIsValidating(false);","  const resetGame = useCallback(() => {\n    if (mode !== 'unlimited') return;\n    setIsValidating(false);")},
  {name:'omit-mode-invalidation',failed:['daily','refusal','newer','page'],make:()=>mutate('mode invalidator',"  const switchMode = useCallback((m: FootballConnect4Mode) => {\n    pendingRequest.current = null;\n    setIsValidating(false);","  const switchMode = useCallback((m: FootballConnect4Mode) => {\n    setIsValidating(false);")},
  {name:'omit-entry-latch',failed:['duplicate'],make:()=>mutate('entry latch',"      if (pendingRequest.current || phase !== 'playing' || selectedColumn === null || targetRow === null) return false;","      if (phase !== 'playing' || selectedColumn === null || targetRow === null) return false;")},
  {name:'omit-payload-owner',failed:['reset','daily','refusal','newer','page'],make:()=>mutate('payload owner',"        const payload: unknown = await resp.json().catch(() => null);\n        if (!ownsRequest()) return false;","        const payload: unknown = await resp.json().catch(() => null);")},
  {name:'omit-catch-owner',failed:['refusal'],make:()=>mutate('catch owner',"      } catch {\n        if (!ownsRequest()) return false;\n        setValidationError('Answer checker could not connect. This guess was not used. Try again.');","      } catch {\n        setValidationError('Answer checker could not connect. This guess was not used. Try again.');")},
  {name:'omit-finally-owner',failed:['newer'],make:()=>mutate('finally owner',"      } finally {\n        if (ownsRequest()) {\n          pendingRequest.current = null;\n          setIsValidating(false);\n        }\n      }","      } finally {\n        pendingRequest.current = null;\n        setIsValidating(false);\n      }")},
  {name:'unconditional-page-cleanup',failed:['page'],make:()=>({hook:H,page:once(P,"    if (await submitPlayer(entity.name)) setPlayerInput('');","    await submitPlayer(entity.name);\n    setPlayerInput('');",'Page ownership')})},
  {name:'omit-current-refusal-cleanup',failed:['page'],make:()=>mutate('current refusal cleanup',"          setValidationError(normalizeValidationReason(result?.reason ?? result?.error, fallback));\n          return true;","          setValidationError(normalizeValidationReason(result?.reason ?? result?.error, fallback));\n          return false;")},
  {name:'omit-current-success-cleanup',failed:['page'],make:()=>mutate('current success cleanup',"        setSelectedColumn(null);\n        setTargetRow(null);\n        return true;\n      } catch {","        setSelectedColumn(null);\n        setTargetRow(null);\n        return false;\n      } catch {")},
];
for(const c of controls){const s=c.make();assert(blob(Buffer.from(s.hook))!==pins[hook]||blob(Buffer.from(s.page))!==pins[page],c.name+' changes actual source');}
const arms=[{name:'fixed',failed:[],make:()=>({hook:H,page:P})},{name:'original',failed:keys.slice(0,6),make:()=>({hook:oldHook,page:oldPage})},...controls,{name:'restored',failed:[],make:()=>({hook:H,page:P})}];
assert.equal(arms.length,12);assert.equal(arms.reduce((sum,a)=>sum+a.failed.length,0),22);
const summaries=[];let error=null;
try{
  for(const arm of arms){
    const dir=path.join(out,arm.name);fs.mkdirSync(dir);const source=arm.make(),h=Buffer.from(source.hook),p=Buffer.from(source.page),changed=[...(h.equals(fixedHook)?[]:[hook]),...(p.equals(fixedPage)?[]:[page])];
    assert.equal(changed.length,arm.name==='original'?2:['fixed','restored'].includes(arm.name)?0:1,arm.name+' source change count');
    fs.writeFileSync(hook,h);fs.writeFileSync(page,p);fs.writeFileSync(path.join(dir,'working-hook.ts'),h);fs.writeFileSync(path.join(dir,'working-page.tsx'),p);
    const sourceReceipt={name:arm.name,changed,hookBlob:blob(h),pageBlob:blob(p),hookSha256:hash(h),pageSha256:hash(p),predictedFailureIds:arm.failed.map(k=>ids[k])};
    write(path.join(dir,'source.json'),sourceReceipt);assert.deepEqual(scan(),before.map(row=>row.file===hook?{file:hook,bytes:h.length,sha256:hash(h)}:row.file===page?{file:page,bytes:p.length,sha256:hash(p)}:row),arm.name+' every tracked source before child');
    const logFile=path.join(dir,'unit.log'),fd=fs.openSync(logFile,'w'),rawFile=path.join(dir,'raw.json'),report=path.join(dir,'unit.json');
    const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+report],{cwd:process.cwd(),env:{...process.env,C4_REQUEST_OWNER_RAW:rawFile},stdio:['ignore',fd,fd],timeout:180000});fs.closeSync(fd);
    write(path.join(dir,'child.json'),{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.equal(child.error,undefined,arm.name+' child launch');assert.equal(child.signal,null,arm.name+' child signal');assert.equal(child.status,arm.failed.length?1:0,arm.name+' child exit');
    const r=json(report),rows=r.testResults.flatMap(s=>s.assertionResults),log=fs.readFileSync(logFile,'utf8'),bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes);
    assert.equal(r.numTotalTests,12);assert.equal(r.numPassedTests,12-arm.failed.length);assert.equal(r.numFailedTests,arm.failed.length);assert.equal(r.numPendingTests,0);assert.equal(rows.length,12);for(const k of ['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(r,k))assert.equal(r[k],0,arm.name+' '+k);assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/.test(log),arm.name+' runtime/setup banner');
    assert.deepEqual(rows.map(v=>v.title).sort(),keys.map(k=>original.cases[k].title).sort());const failed=rows.filter(v=>v.status==='failed'),passed=rows.filter(v=>v.status==='passed');assert.deepEqual(failed.map(v=>v.title).sort(),arm.failed.map(k=>original.cases[k].title).sort(),arm.name+' exact actual failed titles');assert(passed.every(v=>v.failureMessages.length===0));assert(rows.every(v=>v.status==='failed'||v.status==='passed'));for(const row of failed){assert(row.failureMessages.length>0);for(const message of row.failureMessages)assert(message.replace(/\x1b\[[0-9;]*m/g,'').startsWith('AssertionError: '+row.title.split(' ')[0]+' '),arm.name+' actual named business AssertionError');}
    assert.deepEqual({...raw,cases:null},{...original,cases:null},arm.name+' full RAW header/catalog held');assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());let frames=0;const labels={};
    for(const key of keys){const c=raw.cases[key];assert.equal(c.title,original.cases[key].title);assert(c.frames.length>=2);labels[key]=c.frames.map(f=>f.label);assert.equal(c.frames.at(-1).label,'teardown-settled');assert.equal(new Set(labels[key]).size,labels[key].length);const allowed=new Set([...original.cases[key].frames,...fixed.cases[key].frames].map(f=>f.label));for(const f of c.frames){frames++;assert(allowed.has(f.label),arm.name+' '+key+' known capture label');assert.equal(f.storage['c4-unrelated'],'held');assert.equal(f.state.board.length,6);assert(f.state.board.every(row=>row.length===7));assert.equal(f.state.boardConfig.columnAttributes.length,7);assert.equal(f.state.boardConfig.rowAttributes.length,6);for(const field of ['draws','transport','dailyLog','search','completions'])assert(Array.isArray(f[field]),arm.name+' '+field);assert(f.draws.every(v=>v===0));assert.equal(f.completions.length,0);assert.equal(typeof f.state.isValidating,'boolean');assert(Array.isArray(f.state.usedPlayers));for(const t of f.transport){assert.equal(t.url,'https://fixture.invalid/functions/v1/football-connect4-validate');assert.equal(typeof t.payload.playerName,'string');assert.equal(typeof t.headers,'boolean');assert.equal(typeof t.settled,'boolean');assert.equal(typeof t.rejected,'boolean');assert(Number.isInteger(t.jsonCalls));}}}
    for(const key of preserves){assert(rows.find(row=>row.title===original.cases[key].title).status==='passed');assert.deepEqual(raw.cases[key],original.cases[key],arm.name+' whole preserved '+key);}
    if(arm.name==='original')assert(bytes.equals(originalBytes),'Original whole RAW bytes equal E0a');
    if(arm.name==='fixed'||arm.name==='restored'){assert(bytes.equals(fixedBytes),arm.name+' whole RAW bytes equal admitted9109');assert.equal(frames,44);}
    assert.deepEqual(scan(),before.map(row=>row.file===hook?{file:hook,bytes:h.length,sha256:hash(h)}:row.file===page?{file:page,bytes:p.length,sha256:hash(p)}:row),arm.name+' every tracked source after child');assert.deepEqual(installed(),versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
    const summary={status:'passed',...sourceReceipt,actualRows:12,actualFailed:failed.map(row=>row.title),actualPassed:passed.map(row=>row.title),rawCases:12,rawFrames:frames,labels,rawBytes:bytes.length,rawSha256:hash(bytes),wholePreservationCases:preserves,otherTrackedSourcesHeld:true,installed521Held:true,offlineHeld:true,runtimeFields:Object.fromEntries(['numRuntimeErrorTestSuites','numUnhandledErrors'].map(k=>[k,{present:Object.hasOwn(r,k),value:r[k]??null}]))};write(path.join(dir,'admission.json'),summary);summaries.push(summary);console.log('PASS '+arm.name+' actual '+failed.length+' named reds, '+passed.length+' passes, '+frames+' complete RAW frames');
  }
}catch(e){error=e;throw e;}finally{
  fs.writeFileSync(hook,fixedHook);fs.writeFileSync(page,fixedPage);const after=scan();write(path.join(out,'tracked-after.json'),after);assert.deepEqual(after,before,'Every tracked physical body restored exactly');assert.equal(blob(fs.readFileSync(hook)),pins[hook]);assert.equal(blob(fs.readFileSync(page)),pins[page]);const finalVersions=installed();write(path.join(out,'installed-after.json'),finalVersions);assert.deepEqual(finalVersions,versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);write(path.join(out,'summary.json'),{status:error?'failed':'passed',error:error?String(error):null,pins,arms:summaries,completedArms:summaries.length,actualRows:summaries.reduce((n,a)=>n+a.actualRows,0),actualNamedBusinessReds:summaries.reduce((n,a)=>n+a.actualFailed.length,0),originalRawSha256:hash(originalBytes),fixedRawSha256:hash(fixedBytes),allTrackedRestored:true,installed521Held:true,offlineHeld:true,limits:'Source-only causal unit controls. Actual failed titles must equal predictions and every failure must be a named business AssertionError. No native, build, full-suite or live backend credit.'});
}
assert.equal(summaries.length,12);assert.equal(summaries.reduce((n,a)=>n+a.actualRows,0),144);assert.equal(summaries.reduce((n,a)=>n+a.actualFailed.length,0),22);console.log('PASS12 arms, actual144 rows,22 owned business reds; original/fixed/restored whole RAW and all six preservation vectors held');
