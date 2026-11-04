import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
assert(process.env.CI,'Original admission runs only on isolated remote CI');
const root=process.cwd(),out=path.resolve(arg('--out',process.env.QA_OUT)),casesFile=path.resolve(arg('--cases','scripts/qa/nbaFoMarketCases.json'));
const spec=JSON.parse(fs.readFileSync(casesFile,'utf8')),base=process.env.NBA_FO_VERIFIED_BASE,parent=process.env.NBA_FO_QA_PARENT;
for(const value of [base,parent])assert.match(value??'',/^[a-f0-9]{40}$/,'Future verified base and actual QA parent must be bound');
assert.equal(spec.admission?.verifiedBase,base);assert.equal(spec.admission?.qaParent,parent);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:10*1024*1024}).trim();
assert.equal(git('rev-parse','HEAD^'),parent,'Measured immediate QA parent, not an assumed release head');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const testBytes=fs.readFileSync(spec.path);
assert.equal(blob(testBytes),spec.git);assert.equal(sha(testBytes),spec.sha256);assert.equal(testBytes.length,spec.bytes);
assert.equal(spec.git,'8987f39786d523be495e1bacf3b7731e5c16bc57','Frozen reviewed test-first source');
for(const [file,pin] of Object.entries(spec.pins))assert.equal(blob(fs.readFileSync(file)),pin,file+' original product body');
const typed=JSON.parse(fs.readFileSync(path.join(out,'types-passed.json'),'utf8'));
assert.deepEqual(typed,{command:'node_modules/.bin/tsc --noEmit -p tsconfig.app.json',exit:0},'Proper application types must pass before the original cases');
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
const inventory=()=>Object.fromEntries(tracked.map(file=>[file,sha(fs.readFileSync(file))]));
const offlineReceipt=process.env.SIM_OFFLINE_RECEIPT;assert(offlineReceipt&&fs.existsSync(offlineReceipt),'Existing offline transport receipt is required');assert.equal(fs.readFileSync(offlineReceipt).length,0);
const before=inventory(),statusBefore=git('status','--porcelain=v1','--untracked-files=all');
assert.equal(statusBefore,'','Original admission starts from a clean tracked source tree');
fs.writeFileSync(path.join(out,'runner-source-before.json'),JSON.stringify(before,null,2)+'\n');
const raw=path.join(out,'raw'),resultFile=path.join(out,'original-vitest.json');
fs.mkdirSync(raw,{recursive:true});assert.equal(fs.readdirSync(raw).length,0);
const report={status:'incomplete',verifiedBaseBinding:base,measuredQaParent:parent,head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),
 test:{path:spec.path,blob:spec.git,sha256:spec.sha256},productPins:spec.pins,sourceBefore:before,
 scope:'Actual unchanged NBA board with frozen test-first cases. Original admission only. No product fix, fixed/restored arm, build/browser or release credit.'};
let failure=null;
try{
 const args=['node_modules/vitest/vitest.mjs','run',spec.path,'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+resultFile];
 const child=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,NBA_FO_MARKET_ACCESS_RAW:raw},encoding:'utf8',maxBuffer:30*1024*1024,timeout:10*60*1000});
 fs.writeFileSync(path.join(out,'original.stdout.log'),child.stdout??'');fs.writeFileSync(path.join(out,'original.stderr.log'),child.stderr??'');
 report.child={command:[process.execPath,...args],exit:child.status,signal:child.signal,error:child.error?String(child.error):null};
 assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,1,'Original must fail its owned assertions');
 const output=(child.stdout??'')+'\n'+(child.stderr??'');
 assert(!/\b(?:Unhandled\s+(?:Errors?|Rejection|Exception)|Vitest caught|uncaughtException|unhandledRejection)\b/i.test(output),'No unhandled runtime failure can accompany the intended assertions');
 const result=JSON.parse(fs.readFileSync(resultFile,'utf8')),assertions=result.testResults.flatMap(row=>row.assertionResults);
 assert.equal(result.success,false);assert.equal(result.testResults.length,1);assert.equal(result.numTotalTests,3);assert.equal(result.numFailedTests,2);assert.equal(result.numPassedTests,1);assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests??0,0);
 for(const key of ['numRuntimeErrors','numRuntimeErrorTestSuites'])if(Object.hasOwn(result,key))assert.equal(result[key],0,key+' must be zero');
 if(Array.isArray(result.unhandledErrors))assert.equal(result.unhandledErrors.length,0);
 assert.equal(assertions.length,spec.cases.length);
 assert.deepEqual(assertions.map(row=>({name:row.fullName,status:row.status})),spec.cases.map(row=>({name:row.fullName,status:row.baseline})));
 for(const wanted of spec.cases.filter(row=>row.baseline==='failed')){
  const actual=assertions.find(row=>row.fullName===wanted.fullName),messages=actual.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g,'');
  assert(messages.includes(wanted.marker),wanted.marker+' actual owned marker');
  assert(/^\s*AssertionError(?::|\s*\[)/.test(messages),'Only an actual owned AssertionError can count');
  assert(!/\b(?:TypeError|SyntaxError|ReferenceError|uncaughtException|unhandledRejection)\b/.test(messages),'No embedded setup or runtime failure');
 }
 report.assertions=assertions;report.resultCounts={total:3,ownedFailures:2,heldPasses:1,pending:0};
 assert.deepEqual(fs.readdirSync(raw).sort(),[...spec.rawFiles].sort(),'All complete RAW files are emitted despite owned failures');
 const payloads=Object.fromEntries(spec.rawFiles.map(file=>[file,JSON.parse(fs.readFileSync(path.join(raw,file),'utf8'))]));
 const moduleDraws=payloads[spec.rawFiles[0]].moduleDraws;
 assert(Array.isArray(moduleDraws)&&moduleDraws.length>=2&&moduleDraws.every(value=>Number.isFinite(value)&&value>=0&&value<1));
 for(const [file,payload] of Object.entries(payloads)){assert.equal(payload.case,file.slice(0,-5));assert.deepEqual(payload.moduleDraws,moduleDraws);}
 const pool=payloads['complete-pool.json'].observations.rows,tail=payloads['tail-sign.json'].observations.rows;
 assert.equal(pool.length,3);assert.equal(tail.length,2);
 const expectedIds=Array.from({length:20},(_,i)=>'nba-market-access-fa-'+(i+1));
 for(const row of pool){
  assert.deepEqual(row.ids,expectedIds);assert.deepEqual(row.evidenceIds,[]);assert.deepEqual(row.markerIds,[]);
  assert.equal(row.afterBytes,row.initialBytes);assert.deepEqual(row.writes,[]);assert.deepEqual(row.draws,[]);assert.equal(row.inputHeld,true);assert.equal(row.unrelated,'held');
 }
 for(const row of tail){
  assert.equal(row.actual.rowPresent,false);assert.equal(row.actual.buttonEnabled,false);assert.deepEqual(row.actual.frame,row.initial);
  assert.equal(row.actual.bytes,row.initialBytes);assert.deepEqual(row.actual.writes,[]);assert.deepEqual(row.actual.draws,[]);
  assert.deepEqual(row.opening,{bytes:row.initialBytes,writes:[],draws:[]});
  assert.deepEqual(row.reloaded,{bytes:row.initialBytes,frame:row.initial,writes:[],draws:[]});
  assert.equal(row.reference.accepted,true);assert.deepEqual(row.reference.draws,[]);
  assert.equal(row.reference.bytes,JSON.stringify(row.reference.frame));
  assert.equal(row.reference.frame.league.teams.DEN.players.length,15);assert.equal(row.reference.frame.league.freeAgents.length,32);
  assert.equal(row.reference.frame.league.teams.DEN.players.filter(p=>p.id==='nba-market-access-fa-31').length,1);
  assert.equal(row.inputHeld,true);assert.equal(row.unrelated,'held');
 }
 const held=payloads['legacy-guards.json'].observations;assert.equal(held.head.length,2);assert.equal(held.refusals.length,3);
 report.raw=spec.rawFiles.map(file=>{const bytes=fs.readFileSync(path.join(raw,file));return{file,bytes:bytes.length,sha256:sha(bytes)};});
 report.moduleDraws=moduleDraws;report.rawCases={completePool:3,tailReferenceArms:2,heldHeadArms:2,heldRefusals:3};
 assert.equal(fs.readFileSync(offlineReceipt).length,0,'Original action and child workers make no blocked external attempt');
 report.offlineTransport={receipt:offlineReceipt,blockedAttempts:0};report.status='admitted-original';
}catch(error){failure=error;report.status='failed';report.error=String(error.stack||error);}
finally{
 report.sourceAfter=inventory();report.statusAfter=git('status','--porcelain=v1','--untracked-files=all');
 try{assert.deepEqual(report.sourceAfter,before);assert.equal(report.statusAfter,statusBefore);assert.equal(fs.readFileSync(offlineReceipt).length,0);report.sourceHeld=true;report.productNeverMutated=true;report.exactFinalSource=true;}
 catch(error){failure??=error;report.status='failed';report.holdError=String(error.stack||error);}
 fs.writeFileSync(path.join(out,'original-admission.json'),JSON.stringify(report,null,2)+'\n');
}
if(failure)throw failure;
assert.equal(report.status,'admitted-original');
console.log('nbaFoMarketOriginal: 3 actual cases, 2 owned AssertionErrors and 1 held pass; all3 full RAW files, complete action/import tapes and unchanged source admitted. Original only.');
