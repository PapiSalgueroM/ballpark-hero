import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),out=path.resolve(args[args.indexOf('--out')+1]??''),specPath=args[args.indexOf('--spec')+1];
assert(args.includes('--out')&&args.includes('--spec')&&specPath,'required --out DIR --spec FILE');
const spec=JSON.parse(fs.readFileSync(specPath,'utf8')),root=process.cwd(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n');};
const strip=s=>s.replace(/\x1b\[[0-9;]*m/g,'');
const git=(...a)=>cp.execFileSync('git',a,{maxBuffer:32*1024*1024});
const paths=git('ls-files','-z').toString().split('\0').filter(Boolean);
const inventory=()=>Object.fromEntries(paths.map(p=>{const b=fs.readFileSync(p);return[p,{bytes:b.length,sha256:sha(b)}];}));
const status=()=>git('status','--porcelain=v1','-z','--untracked-files=all').toString();
const census=r=>r.testResults.flatMap(f=>f.assertionResults.map(a=>({file:path.relative(root,f.name).split(path.sep).join('/'),fullName:a.fullName}))).sort((a,b)=>(a.file+'\0'+a.fullName).localeCompare(b.file+'\0'+b.fullName));
function validCensus(r){assert.equal(r.testResults.length,5,'SCOPED_143_CENSUS');assert.deepEqual(census(r),[...spec.cases].sort((a,b)=>(a.file+'\0'+a.fullName).localeCompare(b.file+'\0'+b.fullName)),'SCOPED_143_CENSUS');}
const receipt=p=>assert.equal(fs.statSync(p).size,0,'offline transport receipt must be empty');
const initialStatus=status();assert.equal(initialStatus,'','clean initial checkout required');
assert.equal(git('rev-parse','HEAD^').toString().trim(),spec.current);
assert.equal(git('rev-parse','HEAD^^{tree}').toString().trim(),spec.currentTree);
assert.equal(spec.productSources.length,8);assert.equal(spec.files.length,5);assert.equal(spec.cases.length,143);
const before=inventory(),original=new Map(),current=new Map(),reports=[];
write(out+'/source-before.json',before);write(out+'/status-before.txt',initialStatus);
write(out+'/source-head.txt',git('rev-parse','HEAD'));write(out+'/source-tree.txt',git('rev-parse','HEAD^{tree}'));
for(const f of spec.files)assert.deepEqual(before[f.path],{bytes:f.bytes,sha256:f.sha256},'frozen test bytes: '+f.path);
for(const row of spec.productSources){
  const b=fs.readFileSync(row.path);assert.equal(blob(b),row.afterBlob);current.set(row.path,b);
  const old=git('show',spec.base+':'+row.path);assert.equal(blob(old),row.beforeBlob);original.set(row.path,old);
  write(out+'/original-app/'+row.path,old);
}
for(const row of spec.history){
  const key=row.ref.slice(0,12),fetch=cp.spawnSync('git',['fetch','--no-tags','--depth=1','--filter=blob:none','origin',row.ref],{encoding:'utf8',maxBuffer:16*1024*1024});
  write(out+'/history/'+key+'.fetch.stdout.log',fetch.stdout??'');write(out+'/history/'+key+'.fetch.stderr.log',fetch.stderr??'');
  write(out+'/history/'+key+'.fetch.json',{command:['git','fetch','--no-tags','--depth=1','--filter=blob:none','origin',row.ref],status:fetch.status,signal:fetch.signal,error:fetch.error?.message??null});
  assert.equal(fetch.status,0);assert.equal(fetch.signal,null);assert.equal(fetch.error,undefined);
  const body=git('show',row.ref+':'+row.path);assert.equal(blob(body),row.blob);write(out+'/history/'+key+'.ts',body);
}
process.env.GIT_NO_LAZY_FETCH='1';
const history=[];
for(const row of spec.history){
  const body=git('show',row.ref+':'+row.path),old=fs.readFileSync(out+'/history/'+row.ref.slice(0,12)+'.ts');
  assert.equal(blob(body),row.blob);assert(body.equals(old));assert.equal(git('rev-parse',row.short+'^{commit}').toString().trim(),row.ref);
  write(out+'/history/'+row.ref.slice(0,12)+'.offline.ts',body);history.push({...row,bytes:body.length,sha256:sha(body),offlineRepeatExact:true});
}
write(out+'/history/hydration.json',{refs:history,noLazyFetch:true,extraHistoryRefsFetched:[]});
const expectedOriginal=structuredClone(before);
for(const [p,b] of original)expectedOriginal[p]={bytes:b.length,sha256:sha(b)};
function held(arm,expected){
  assert.deepEqual(inventory(),expected,'complete source bytes: '+arm);
  const want=arm==='original'?[...original.keys()].sort().map(p=>' M '+p).join('\0')+'\0':'';
  const actual=status();assert.equal(actual.split('\0').filter(Boolean).sort().join('\0'),want.split('\0').filter(Boolean).sort().join('\0'),'exact source overlay status: '+arm);
}
function child(arm,label,command,argv){
  const dir=out+'/'+arm,transport=dir+'/transport/'+label+'.log';write(transport,'');
  const env={...process.env,SIM_NETWORK:'offline',GIT_NO_LAZY_FETCH:'1',SIM_OFFLINE_RECEIPT:transport,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs')};
  const r=cp.spawnSync(command,argv,{encoding:'utf8',maxBuffer:32*1024*1024,env});
  write(dir+'/'+label+'.stdout.log',r.stdout??'');write(dir+'/'+label+'.stderr.log',r.stderr??'');
  write(dir+'/'+label+'.native.json',{command:[command,...argv],exit:r.status,signal:r.signal,error:r.error?.message??null});
  assert.equal(r.signal,null);assert.equal(r.error,undefined);receipt(transport);return r;
}
function readReport(arm,native){
  const r=JSON.parse(fs.readFileSync(out+'/'+arm+'/vitest.json','utf8'));validCensus(r);
  const rows=r.testResults.flatMap(f=>f.assertionResults.map(a=>({...a,file:path.relative(root,f.name).split(path.sep).join('/')})));
  assert.equal(r.numTotalTests,143);assert.equal(r.numPendingTests,0);assert.equal(r.numTodoTests??0,0);
  for(const key of ['numRuntimeErrors','numRuntimeErrorTestSuites'])if(Object.hasOwn(r,key))assert.equal(r[key],0);
  if(Object.hasOwn(r,'unhandledErrors')){assert(Array.isArray(r.unhandledErrors));assert.equal(r.unhandledErrors.length,0);}
  assert(rows.every(a=>a.status==='passed'||a.status==='failed'));
  const failures=rows.filter(a=>a.status==='failed'),passes=rows.filter(a=>a.status==='passed');
  assert.equal(r.numFailedTests,failures.length);assert.equal(r.numPassedTests,passes.length);
  assert.equal(native.status,failures.length?1:0);assert.equal(r.success,failures.length===0);
  for(const a of failures){assert(a.failureMessages.length>0);assert(a.failureMessages.every(m=>/^\s*AssertionError:/.test(strip(m))),'non-assertion failure: '+a.fullName);}
  for(const f of ['cagePractice.test.tsx','cageReadiness.test.tsx'])assert(rows.filter(a=>a.file.endsWith('/'+f)).every(a=>a.status==='passed'),'historical engine replay must execute and pass');
  const logs=native.stdout+'\n'+native.stderr;
  assert(!/(?:Vitest caught .+ unhandled|Unhandled (?:Errors|Rejection|Exception)|Uncaught (?:Exception|TypeError|ReferenceError|SyntaxError))/i.test(strip(logs)),'runtime error output');
  const normalized=rows.map(a=>({file:a.file,fullName:a.fullName,status:a.status,failureMessages:a.failureMessages.map(m=>strip(m).split(/\n\s*at /)[0].trim())})).sort((a,b)=>(a.file+'\0'+a.fullName).localeCompare(b.file+'\0'+b.fullName));
  write(out+'/'+arm+'/actual-cases.json',rows.map(a=>({file:a.file,fullName:a.fullName,status:a.status,failureMessages:a.failureMessages})));
  const summary={arm,source:arm==='original'?spec.base:spec.current,files:5,total:rows.length,passed:passes.length,failed:failures.length,nativeExit:native.status,pending:0,failedFullNames:failures.map(a=>a.fullName),status:failures.length?'measured unresolved assertions':'scoped pass'};
  write(out+'/'+arm+'/actual-summary.json',summary);return{r,normalized,summary};
}
try{
  for(const arm of ['original','current']){
    for(const [p,b] of (arm==='original'?original:current))fs.writeFileSync(p,b);
    const expected=arm==='original'?expectedOriginal:before;held(arm,expected);write(out+'/'+arm+'/source-before.json',inventory());write(out+'/'+arm+'/status-before.txt',status());
    const types=child(arm,'types','node_modules/.bin/tsc',['--noEmit','-p','tsconfig.app.json']);assert.equal(types.status,0);
    write(out+'/'+arm+'/types-passed.json',{command:'node_modules/.bin/tsc --noEmit -p tsconfig.app.json',exit:0});
    const native=child(arm,'vitest','npm',['test','--',...spec.files.map(f=>f.path),'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+out+'/'+arm+'/vitest.json']);
    held(arm,expected);write(out+'/'+arm+'/source-after.json',inventory());write(out+'/'+arm+'/status-after.txt',status());
    reports.push(readReport(arm,native));
  }
  const actual=reports[0].r,copy=structuredClone(actual),removed=copy.testResults[0].assertionResults.shift();assert(removed);
  write(out+'/census-control/omitted.json',copy);assert.throws(()=>validCensus(copy),e=>e instanceof assert.AssertionError&&e.message.includes('SCOPED_143_CENSUS'));
  copy.testResults[0].assertionResults.unshift(removed);assert.equal(JSON.stringify(copy),JSON.stringify(actual));validCensus(copy);
  write(out+'/census-control/receipt.json',{basis:'copy of actual original report',omitted:removed.fullName,changed:true,ownedFailure:'SCOPED_143_CENSUS',wholeInverseExact:true,noAppOutcomeCredit:true});
  assert.deepEqual(reports[1].normalized,reports[0].normalized,'original/current complete case and assertion parity');
  const measured=reports[0].summary.failedFullNames.slice().sort(),hypothesis=spec.hypothesisFailedFullNames.slice().sort();
  write(out+'/parity.json',{status:'actual source parity measured, unresolved assertions remain',original:reports[0].summary,current:reports[1].summary,fullCaseAndFailureAssertionParity:true,hypothesisMatches:JSON.stringify(measured)===JSON.stringify(hypothesis),fullSuitePendingStillUnresolved:109,noBroadSuiteGreen:true});
  assert.deepEqual(measured,hypothesis,'actual failures must match the recorded five-failure source hypothesis');
  console.log('SC_SEGUNDA_SCOPED_143_PARITY 143 same cases, 138 pass and 5 unresolved assertions on original and current; no broad suite-green claim');
}finally{
  for(const [p,b] of current)fs.writeFileSync(p,b);
  const after=inventory();write(out+'/source-after.json',after);write(out+'/status-after.txt',status());
  assert.deepEqual(after,before);assert.equal(status(),'');
  const receipts=[];for(const arm of ['original','current']){const dir=out+'/'+arm+'/transport';if(fs.existsSync(dir))for(const name of fs.readdirSync(dir)){const p=dir+'/'+name;receipt(p);receipts.push({path:arm+'/transport/'+name,bytes:0});}}
  write(out+'/source-hold.json',{tracked:paths.length,allBytesHeld:true,status:'clean',receipts,originalOverlayOnly:[...original.keys()],legacyAdaptersUnused:spec.unusedLegacyAdapters});
}
