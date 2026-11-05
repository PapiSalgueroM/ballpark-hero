import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';
const arg=(n,f)=>{const i=process.argv.indexOf(n);return i<0?f:process.argv[i+1];};
for(const key of ['--out','--fixtures','--dist','--base-url'])assert(process.argv.includes(key),key);
const out=path.resolve(arg('--out')),dir=path.resolve(arg('--fixtures')),dist=path.resolve(arg('--dist')),base=arg('--base-url'),origin=new URL(base).origin;
const publicMode=process.argv.includes('--public');
assert(process.env.CI,'Remote CI only');
assert(publicMode?origin==='https://douknowball.com':['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const receipt=process.env.SIM_OFFLINE_RECEIPT;
async function silent(){assert(receipt);assert.equal((await fs.readFile(receipt)).length,0,'Existing Node receipt remains empty');}await silent();
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const m=JSON.parse(await fs.readFile(dir+'/manifest.json'));
assert.equal(m.schema,1);assert.deepEqual(m.sourceBefore,m.sourceAfter);
for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
assert.equal(sha(await fs.readFile(dir+'/'+m.bundle)),m.bundleSHA);
assert.equal(sha(await fs.readFile(dir+'/'+m.entry)),m.entrySHA);
assert.equal(sha(await fs.readFile(dir+'/'+m.preparation.file)),m.preparation.sha256);
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
const originalRandom=Math.random,importDraws=[];let importSeed=7301,api;
try{Math.random=()=>{importSeed=importSeed*16807%2147483647;const value=(importSeed-1)/2147483646;importDraws.push(value);return value;};api=await import(pathToFileURL(dir+'/'+m.bundle).href);await api.prepare();}finally{Math.random=originalRandom;}
assert.deepEqual(importDraws,m.importDraws,'Actual Node reference import tape');
const {nba}=api,fixtures={};
assert.deepEqual(Object.keys(m.fixtures).sort(),['current','laterFa','legacy','postCamp','preCamp']);
assert.deepEqual(api.rows.map(p=>({id:p.id,pick:p.pick,name:p.name,families:[...p.families],dob:p.dob})),m.expectedClass.map(p=>({id:p.id,pick:p.pick,name:p.name,families:p.broadFamilies,dob:p.dateOfBirth})));
for(const[name,f]of Object.entries(m.fixtures)){const raw=await fs.readFile(dir+'/'+f.file,'utf8');assert.equal(sha(raw),f.sha256);assert.equal(raw,f.expected.raw);assert.deepEqual(JSON.parse(raw),f.expected.save);fixtures[name]={...f,raw};}
async function fixtureInventory(){const rows=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(e.isFile());const b=await fs.readFile(path.join(dir,e.name));rows.push({file:e.name,bytes:b.length,sha256:sha(b)});}return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
const fixtureBefore=await fixtureInventory();
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(await inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const assetReference=new Map(m.distBefore.filter(r=>r.file.startsWith('assets/')||r.file==='prerender-boot.js').map(r=>[r.file,r])),observedAssets=new Map();
assert(assetReference.has('prerender-boot.js'));
const report={status:'incomplete',mode:publicMode?'public':'local',product:m.product,distDigest:m.distDigest,contexts:[],screenshots:[],
 scope:'Three widths, real2003 UI creation with natural browser RNG/clock, five separately declared complete JSON saves. Real59 source rows and simulated camp receipts. Strict prepared class navigation/internal-list reads and actual legacy/current absence. Outer Hub navigation is recorded source reveal, without a zero-scroll claim.15ordinary viewport photos, no natural annual or FA-signing claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']),routes=['/nba-my-career'];
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const save=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
async function goto(p,url){const response=await p.goto(base+url);await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);return response;}
function validateNativeEvidence(actual) {
 assert.deepEqual(actual.requestFailures.filter(row=>!actual.aborts.some(a=>a.url===row.url)),[],'NBA_2004_NATIVE_NATIVE_UNDECLARED_REQUEST_FAILURE');
 assert(actual.assetBodies.some(row=>row.file==='prerender-boot.js'),'NBA_2004_NATIVE_NATIVE_OBSERVED_BOOT_BODY');
}
function checkCopiedActualEvidence(actual) {
 const original=JSON.stringify(actual),beforeSHA256=sha(original),failure=actual.requestFailures.find(row=>actual.aborts.some(a=>a.url===row.url));
 assert(failure,'NBA_2004_NATIVE_NATIVE_DECLARED_FAILURE_CONTROL_ANCHOR');
 const declarationCopy=JSON.parse(original),removedDeclarations=declarationCopy.aborts.map((row,index)=>({row,index})).filter(x=>x.row.url===failure.url);
 assert(removedDeclarations.length>0);declarationCopy.aborts=declarationCopy.aborts.filter(row=>row.url!==failure.url);
 const declarationFault=JSON.stringify(declarationCopy);assert.notEqual(declarationFault,original);
 let declarationError=null;try{validateNativeEvidence(declarationCopy);}catch(e){declarationError=e;}
 assert(declarationError instanceof assert.AssertionError);assert.match(declarationError.message,/^NBA_2004_NATIVE_NATIVE_UNDECLARED_REQUEST_FAILURE/);
 for(const x of removedDeclarations)declarationCopy.aborts.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(declarationCopy),original,'Copied declaration control whole inverse');
 const bootCopy=JSON.parse(original),removedBoot=bootCopy.assetBodies.map((row,index)=>({row,index})).filter(x=>x.row.file==='prerender-boot.js');
 assert(removedBoot.length>0);bootCopy.assetBodies=bootCopy.assetBodies.filter(row=>row.file!=='prerender-boot.js');
 const bootFault=JSON.stringify(bootCopy);assert.notEqual(bootFault,original);
 let bootError=null;try{validateNativeEvidence(bootCopy);}catch(e){bootError=e;}
 assert(bootError instanceof assert.AssertionError);assert.match(bootError.message,/^NBA_2004_NATIVE_NATIVE_OBSERVED_BOOT_BODY/);
 for(const x of removedBoot)bootCopy.assetBodies.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(bootCopy),original,'Copied boot observation control whole inverse');
 assert.equal(JSON.stringify(actual),original,'The actual context report remains byte exact');
 return {actualReportSHA256:beforeSHA256,declaration:{url:failure.url,removed:removedDeclarations.length,faultSHA256:sha(declarationFault),ownedFailure:{name:declarationError.name,message:declarationError.message}},
  boot:{removed:removedBoot.length,actualBodies:removedBoot.map(x=>x.row),faultSHA256:sha(bootFault),ownedFailure:{name:bootError.name,message:bootError.message}},wholeInverseExact:true,actualReportHeld:true,
  scope:'Copied actual context report only. Remove real matching abort declarations or real verified boot observations. Same validator owns both failures; no App outcomes or HTTP bodies are fabricated.'};
}
const HOST_SCRIPT='/__l5e/events.270c78a44fc53e7b.js',HOST_WRITE='/__l5e/trackevents',publicHostResponses=new WeakMap();
const hostScriptPath=p=>/^\/__l5e\/events(?:\.[a-f0-9]+)?\.js$/.test(p);
function requireHostBody(body,first){assert.equal(body.length,first.length,'NBA_2004_NATIVE_PUBLIC_HOST_BODY_EQUAL');assert(body.equals(first),'NBA_2004_NATIVE_PUBLIC_HOST_BODY_EQUAL');}
async function qualifyPublicTelemetry(p,r,response){
 assert(publicMode);assert.equal(response.status(),200);await p.waitForLoadState('load');
 const html=await response.body(),text=html.toString();
 const tags=[...text.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)].map(x=>x[0]);
 const declarations=tags.map(tag=>{const a=/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);return a?{tag,url:new URL(a[1]??a[2],response.url())}:null;}).filter(x=>x&&x.url.origin===origin&&hostScriptPath(x.url.pathname)&&x.url.search===''&&x.url.hash==='');
 assert.equal(declarations.length,1,'NBA_2004_NATIVE_PUBLIC_HOST_SOURCE_DECLARED');const declaration=declarations[0];
 assert(/\bdata-autocapture="1"/.test(declaration.tag)&&/\bdata-consent="1"/.test(declaration.tag),'Actual declared host event script attributes');
 const dom=await p.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));assert.equal(dom.filter(url=>url===declaration.url.href).length,1,'Current page loaded its freshly declared host script');
 const chainOf=actual=>{const chain=[];for(let request=actual.request();request;request=request.redirectedFrom()){assert(chain.length<8,'Bounded actual host redirect chain');assert.equal(request.method(),'GET');assert.equal(new URL(request.url()).origin,origin);chain.unshift({url:request.url(),method:request.method(),resourceType:request.resourceType()});}return chain;};
 const observed=(publicHostResponses.get(p)??[]).map(actual=>({actual,chain:chainOf(actual)})).filter(row=>row.chain[0]?.url===declaration.url.href);
 assert.equal(observed.length,1,'NBA_2004_NATIVE_PUBLIC_OBSERVED_CURRENT_HOST_SCRIPT');const {actual,chain}=observed[0];
 assert.equal(actual.request().resourceType(),'script');assert.equal(actual.request().frame(),p.mainFrame());assert.equal(actual.status(),200);assert.equal(chain.at(-1).url,actual.url());const code=await actual.body();assert(code.length>0);
 r.hostTelemetry.sources??=[];const number=r.hostTelemetry.sources.length+1,folder=path.join(out,'host-telemetry');await fs.mkdir(folder,{recursive:true});
 const stem=r.id+'-navigation-'+String(number).padStart(2,'0'),htmlFile=stem+'-document.html',scriptFile=stem+'-events.js';
 await fs.writeFile(path.join(folder,htmlFile),html,{flag:'wx'});await fs.writeFile(path.join(folder,scriptFile),code,{flag:'wx'});
 if(r.hostTelemetry.source){const first=await fs.readFile(path.join(out,r.hostTelemetry.source.script.file));requireHostBody(code,first);}
 else{assert.equal(declaration.url.href,origin+HOST_SCRIPT,'Initial actual hashed host declaration');assert.equal(actual.url(),origin+HOST_SCRIPT);}
 const sourceMatches=[];for(const file of Object.keys(m.sourceAfter).filter(p=>p.startsWith('src/')))if((await fs.readFile(file)).includes(Buffer.from(HOST_WRITE)))sourceMatches.push(file);assert.deepEqual(sourceMatches,[],'Exact host endpoint absent from every tracked src body');
 const record={status:'actual-declared-and-observed-host-script',navigation:number,url:actual.url(),declarationURL:declaration.url.href,redirectChain:chain,
  document:{url:response.url(),status:response.status(),file:'host-telemetry/'+htmlFile,bytes:html.length,sha256:sha(html),scriptTag:declaration.tag},
  script:{status:actual.status(),resourceType:actual.request().resourceType(),file:'host-telemetry/'+scriptFile,bytes:code.length,sha256:sha(code)},sourceEndpointMatches:sourceMatches,
  scope:'Fresh main HTML, current DOM declaration and this navigation actual script response body. Later bodies equal the first full executed body; older proofs remain retained.'};
 r.hostTelemetry.source??=record;r.hostTelemetry.sources.push(record);
 if(!r.hostTelemetry.bodyControl){const copy=Buffer.from(code),first=copy[0];copy[0]^=1;assert(!copy.equals(code));let owned;try{requireHostBody(copy,code);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_PUBLIC_HOST_BODY_EQUAL/);const faultFile=r.id+'-copied-host-body-control.js';await fs.writeFile(path.join(folder,faultFile),copy,{flag:'wx'});const faultSHA256=sha(copy);copy[0]=first;assert(copy.equals(code));r.hostTelemetry.bodyControl={changed:true,source:record.script,faultFile:'host-telemetry/'+faultFile,faultSHA256,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual script-body byte mutation only, never a replaced HTTP/App response.'};}
}
function initiatorURLs(initiator){const urls=[];for(let stack=initiator?.stack;stack;stack=stack.parent)for(const frame of stack.callFrames??[])if(frame.url)urls.push(frame.url);if(initiator?.url)urls.push(initiator.url);return urls;}
function validateReadPreflight(row){
 const {preflight,read,pw,abort}=row,marker='NBA_2004_NATIVE_PUBLIC_LINKED_READ_PREFLIGHT',u=new URL(preflight.url);
 assert.equal(preflight.method,'OPTIONS',marker);assert.equal(preflight.initiator?.type,'preflight',marker);assert.equal(preflight.postData,null,marker);
 assert.equal(u.origin,'https://flawuiqbvjobmkfkauhw.supabase.co',marker);assert.equal(u.pathname,'/rest/v1/live_scores',marker);
 assert.equal(preflight.initiator.url,preflight.url,marker);assert.equal(preflight.initiator.requestId,read.requestId,marker);
 assert.equal(read.method,'GET',marker);assert.equal(read.url,preflight.url,marker);assert.equal(pw.method,'GET',marker);assert.equal(pw.url,read.url,marker);
 assert.equal(abort.requestId,pw.requestId,marker);assert.equal(abort.method,pw.method,marker);assert.equal(abort.url,pw.url,marker);
}
function publicProtocolRows(r){
 const traces=[],preflights=[];
 for(const preflight of r.hostTelemetry.initiators){
  if(preflight.method!=='OPTIONS'||preflight.initiator?.type!=='preflight'){traces.push(preflight);continue;}
  const parents=[...r.hostTelemetry.reads,...r.hostTelemetry.initiators].filter(q=>q.requestId===preflight.initiator.requestId);
  if(parents.length===0)assert.fail('NBA_2004_NATIVE_PUBLIC_READ_PARENT_PENDING');assert.equal(parents.length,1,'Unique native preflight parent');
  const read=parents[0];assert.equal(read.method,'GET','NBA_2004_NATIVE_PUBLIC_LINKED_READ_PREFLIGHT');
  const requests=r.requests.filter(q=>q.method===read.method&&q.url===read.url);
  if(requests.length===0)assert.fail('NBA_2004_NATIVE_PUBLIC_PW_READ_PENDING');assert.equal(requests.length,1,'Unique actual preflight-triggering read');
  const pw=requests[0],aborts=r.aborts.filter(a=>a.requestId===pw.requestId);
  if(aborts.length===0)assert.fail('NBA_2004_NATIVE_PUBLIC_READ_ABORT_PENDING');assert.equal(aborts.length,1,'Unique actual read abort');
  const row={preflight:clone(preflight),read:clone(read),pw:clone(pw),abort:clone(aborts[0])};validateReadPreflight(row);preflights.push(row);
 }
 return{traces,preflights};
}
function copiedReadPreflightControl(next){
 const actual=JSON.stringify(next),copy=clone(next.writeWindow.preflights[0]);assert(copy,'Actual linked read preflight control anchor');
 const original=JSON.stringify(copy),held=copy.read.method;copy.read.method='POST';const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned;try{validateReadPreflight(copy);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_PUBLIC_LINKED_READ_PREFLIGHT/);
 copy.read.method=held;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,actualPreflight:next.writeWindow.preflights[0],faultParentMethod:'POST',faultSHA256:sha(fault),
  ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual native preflight with only triggering parent method changed. Same pure preflight validator must refuse; full inverse. No provider availability or physical fault claim.'};
}
function publicWriteWindow(r){
 assert(r.hostTelemetry.source,'NBA_2004_NATIVE_PUBLIC_HOST_SOURCE_BEFORE_REVIEW');
 const writes=r.requests.filter(q=>!['GET','HEAD'].includes(q.method)),{traces,preflights}=publicProtocolRows(r);
 assert.equal(traces.length,writes.length,'NBA_2004_NATIVE_PUBLIC_COMPLETE_WRITE_INITIATORS');
 return{source:clone(r.hostTelemetry.source),sources:clone(r.hostTelemetry.sources??[]),preflights,writes:writes.map((q,i)=>{
  const trace=traces[i];assert.equal(trace.url,q.url,'Exact ordered native write URL');assert.equal(trace.method,q.method,'Exact ordered native write method');
  const body=trace.postData===null?Buffer.alloc(0):Buffer.from(trace.postData,'utf8');
  assert.equal(body.length,q.body.bytes,'NBA_2004_NATIVE_PUBLIC_NATIVE_WRITE_BODY');assert.equal(sha(body),q.body.sha256,'NBA_2004_NATIVE_PUBLIC_NATIVE_WRITE_BODY');assert.equal(body.toString('base64'),q.body.base64??'','NBA_2004_NATIVE_PUBLIC_NATIVE_WRITE_BODY');
  const aborts=r.aborts.filter(a=>a.requestId===q.requestId);if(aborts.length===0)assert.fail('NBA_2004_NATIVE_PUBLIC_WRITE_ABORT_PENDING');assert.equal(aborts.length,1,'Every attempted write has one actual abort declaration');
  return{request:clone(q),abort:clone(aborts[0]),trace:clone(trace)};
 })};
}
function gameWriteIds(window){
 return window.writes.filter(({request:q,abort,trace})=>{
  const u=new URL(q.url),host=q.method==='POST'&&u.origin===origin&&u.pathname===HOST_WRITE&&u.search===''&&u.hash==='';
  if(!host)return true;
  assert.equal(window.source.status,'actual-declared-and-observed-host-script','NBA_2004_NATIVE_PUBLIC_HOST_ATTRIBUTION');
  assert.equal(window.source.url,origin+HOST_SCRIPT,'NBA_2004_NATIVE_PUBLIC_HOST_ATTRIBUTION');
  assert.equal(abort.requestId,q.requestId);assert.equal(abort.url,q.url);assert.equal(abort.method,q.method);
  assert.equal(trace.url,q.url);assert.equal(trace.method,q.method);
  const urls=initiatorURLs(trace.initiator),proofs=(window.sources??[]).filter(source=>urls.includes(source.url));
  assert(proofs.length>0,'NBA_2004_NATIVE_PUBLIC_HOST_INITIATOR');for(const proof of proofs){assert.equal(proof.status,'actual-declared-and-observed-host-script','NBA_2004_NATIVE_PUBLIC_HOST_ATTRIBUTION');assert.equal(proof.script.bytes,window.source.script.bytes,'NBA_2004_NATIVE_PUBLIC_HOST_BODY_EQUAL');assert.equal(proof.script.sha256,window.source.script.sha256,'NBA_2004_NATIVE_PUBLIC_HOST_BODY_EQUAL');}
  return false;
 }).map(row=>row.request.requestId);
}
function writeSnapshot(r,paired){
 if(!publicMode)return{writeRequests:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length};
 const writeWindow=paired??publicWriteWindow(r);return{writeRequests:gameWriteIds(writeWindow).length,writeWindow};
}
async function completePublicWriteSnapshot(r,label){
 const started=Date.now(),deadline=started+5000,wait={label,maximumMilliseconds:5000,intervalMilliseconds:25,status:'waiting',samples:[]};
 r.hostTelemetry.completionWaits.push(wait);
 const pending=/^(?:NBA_2004_NATIVE_PUBLIC_COMPLETE_WRITE_INITIATORS|NBA_2004_NATIVE_PUBLIC_READ_PARENT_PENDING|NBA_2004_NATIVE_PUBLIC_PW_READ_PENDING|NBA_2004_NATIVE_PUBLIC_READ_ABORT_PENDING|NBA_2004_NATIVE_PUBLIC_WRITE_ABORT_PENDING)/;
 for(;;){
  if(Date.now()>=deadline){wait.status='timeout';assert.fail('NBA_2004_NATIVE_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}
  const sample={elapsedMilliseconds:Date.now()-started,pwWrites:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length,nativeNonReads:r.hostTelemetry.initiators.length,nativeReads:r.hostTelemetry.reads.length};
  try{const window=publicWriteWindow(r),snapshot=writeSnapshot(r,window);sample.pairedWrites=window.writes.length;sample.linkedReadPreflights=window.preflights.length;if(Date.now()>=deadline){wait.status='timeout';assert.fail('NBA_2004_NATIVE_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}sample.status='paired';wait.samples.push(sample);wait.status='paired';wait.elapsedMilliseconds=Date.now()-started;wait.windowSHA256=sha(JSON.stringify(window));return snapshot;}
  catch(error){sample.error={name:error.name,message:error.message};sample.status='not-paired';wait.samples.push(sample);if(!(error instanceof assert.AssertionError)||!pending.test(error.message)){wait.status=String(error.message).startsWith('NBA_2004_NATIVE_PUBLIC_WRITE_COMPLETION_TIMEOUT')?'timeout':'fatal';throw error;}if(Date.now()>=deadline){wait.status='timeout';assert.fail('NBA_2004_NATIVE_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}await new Promise(resolve=>setTimeout(resolve,Math.min(25,Math.max(1,deadline-Date.now()))));}
 }
}
function copiedUnknownWriteControl(before,next){
 const actual=JSON.stringify({before,next}),window=clone(next.writeWindow),original=JSON.stringify(window);
 const target=window.writes.find(row=>row.request.url===origin+HOST_WRITE&&row.request.method==='POST');assert(target,'Actual host POST control anchor');
 const old=target.request.url;target.request.url=origin+'/__l5e/unrecognized-write-control';
 const fault=JSON.stringify(window);assert.notEqual(fault,original);const altered={...next,writeWindow:window,writeRequests:gameWriteIds(window).length};
 let owned;try{validateReadonlyReview(before,altered);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^No new write request/);
 target.request.url=old;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify({before,next}),actual);
 return{changed:true,actualSampleSHA256:sha(actual),actualRequestURL:old,faultRequestURL:origin+'/__l5e/unrecognized-write-control',
  faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual attempted POST with only URL changed, through the same write classifier and unchanged read-only validator. Guard logic only, no physical or App fault claim.'};
}
function copiedHostInitiatorControl(next){
 const actual=JSON.stringify(next),window=clone(next.writeWindow),original=JSON.stringify(window),sources=new Set(window.sources.map(source=>source.url));
 const target=window.writes.find(row=>row.request.url===origin+HOST_WRITE&&row.request.method==='POST');assert(target);
 const held=clone(target.trace.initiator);let removed=0;
 for(let stack=target.trace.initiator?.stack;stack;stack=stack.parent){const before=stack.callFrames??[];stack.callFrames=before.filter(frame=>!sources.has(frame.url));removed+=before.length-stack.callFrames.length;}
 if(sources.has(target.trace.initiator.url)){delete target.trace.initiator.url;removed++;}
 assert(removed>0);assert(!initiatorURLs(target.trace.initiator).some(url=>sources.has(url)));const fault=JSON.stringify(window);assert.notEqual(fault,original);
 let owned;try{gameWriteIds(window);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_PUBLIC_HOST_INITIATOR/);
 const faultInitiator=clone(target.trace.initiator);target.trace.initiator=held;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,removedSourceEntries:removed,source:window.source.url,qualifiedSourceURLs:[...sources],actualInitiator:held,faultInitiator,faultSHA256:sha(fault),
  ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual attempted host POST loses every occurrence of its actual initiating host script. Same classifier must refuse the exclusion; the complete copy is then restored. Guard logic only.'};
}
function copiedRegistryOmissionControl(next){
 const actual=JSON.stringify(next),window=clone(next.writeWindow),original=JSON.stringify(window),target=window.writes.find(row=>row.request.method==='POST'&&row.request.url===origin+HOST_WRITE);assert(target);
 const urls=new Set(initiatorURLs(target.trace.initiator)),held=window.sources;window.sources=held.filter(source=>!urls.has(source.url));assert(window.sources.length<held.length);const fault=JSON.stringify(window);assert.notEqual(fault,original);
 let owned;try{gameWriteIds(window);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_PUBLIC_HOST_INITIATOR/);window.sources=held;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,removedSources:held.filter(source=>urls.has(source.url)),faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual qualified-registry omission, no live response or App mutation.'};
}
async function journey(name,width,seeds,action){
 const height=width===390?844:900;
 const r={id:name+'-'+width,name,width,height,actor:width<768?'touch':'keyboard',status:'incomplete',actions:[],photos:[],requests:[],responses:[],aborts:[],requestFailures:[],console:[],pageErrors:[],assetBodies:[],assetErrors:[]},pendingAssets=[],assetDrains=new Map();report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 const requestIds=new WeakMap();let requestSequence=0;const requestId=q=>{if(!requestIds.has(q))requestIds.set(q,++requestSequence);return requestIds.get(q);};
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol)||u.origin===origin&&['GET','HEAD'].includes(q.method()))return route.continue();r.aborts.push({url:u.href,origin:u.origin,method:q.method(),...(publicMode?{requestId:requestId(q)}:{})});return route.abort('blockedbyclient');});
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET'});await socket.close({code:1008,reason:'Source real entry QA'});});
 await c.addInitScript(({origin,seeds,routes})=>{if(location.origin!==origin||localStorage.getItem('feature-fixture-seeded'))return;for(const[k,v]of Object.entries(seeds))localStorage.setItem(k,v);for(const route of routes)localStorage.setItem('rules-gate-seen:'+route,'1');localStorage.setItem('feature-unrelated','held');localStorage.setItem('feature-fixture-seeded','1');},{origin,seeds,routes});
 c.on('page',page=>{
  const activeAssets=new Set(),activeReads=new Set();let lastAssetActivity=Date.now();
  const isAsset=url=>{const u=new URL(url);return u.origin===origin&&(u.pathname.startsWith('/assets/')||u.pathname==='/prerender-boot.js');};
  const assetFinished=q=>{if(activeAssets.delete(q))lastAssetActivity=Date.now();};
  const drainAssets=async method=>{
   if(page.url()==='about:blank')return;
   const started=Date.now(),deadline=started+20000;
   while(activeAssets.size||activeReads.size||Date.now()-lastAssetActivity<100){
    assert(Date.now()<deadline,'Published asset capture did not settle before '+method);
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   assert.equal(r.assetErrors.length,0,'Published asset capture error before '+method);
   r.assetNavigationWaits.push({method,from:page.url(),elapsedMs:Date.now()-started,activeRequests:activeAssets.size,activeReads:activeReads.size});
  };
  assetDrains.set(page,drainAssets);
  {r.assetNavigationWaits??=[];for(const method of['goto','reload','goBack']){const native=page[method].bind(page);page[method]=async(...args)=>{await drainAssets(method);if(publicMode)publicHostResponses.set(page,[]);return native(...args);};}}
  page.on('request',q=>{const row={url:q.url(),method:q.method()};if(publicMode){row.requestId=requestId(q);if(!['GET','HEAD'].includes(row.method)){const body=q.postDataBuffer();row.body={bytes:body?.length??0,sha256:sha(body??Buffer.alloc(0)),base64:body?.toString('base64')??null};row.resourceType=q.resourceType();}}r.requests.push(row);if(isAsset(q.url())){activeAssets.add(q);lastAssetActivity=Date.now();}});
  page.on('response',q=>{
   r.responses.push({url:q.url(),status:q.status()});const u=new URL(q.url());
    if(publicMode&&u.origin===origin&&hostScriptPath(u.pathname)&&q.request().resourceType()==='script'){const rows=publicHostResponses.get(page)??[];rows.push(q);publicHostResponses.set(page,rows);}
   if(isAsset(q.url())){
    lastAssetActivity=Date.now();
    const read=(async()=>{try{const file=decodeURIComponent(u.pathname.slice(1)),ref=assetReference.get(file);assert(ref,'Unknown published asset '+file);assert([200,304].includes(q.status()),'Published asset HTTP '+q.status());const bytes=await q.body(),digest=sha(bytes);assert.equal(bytes.length,ref.bytes,file+' bytes');assert.equal(digest,ref.sha256,file+' digest');r.assetBodies.push({file,status:q.status(),bytes:bytes.length,sha256:digest});if(observedAssets.has(file))assert.equal(observedAssets.get(file),digest);else{observedAssets.set(file,digest);await fs.mkdir(path.join(out,'served-assets',path.dirname(file)),{recursive:true});await fs.writeFile(path.join(out,'served-assets',file),bytes,{flag:'wx'});}}catch(e){r.assetErrors.push({url:q.url(),error:String(e.stack||e)});}})();
    activeReads.add(read);pendingAssets.push(read);void read.finally(()=>{activeReads.delete(read);lastAssetActivity=Date.now();});
   }
  });
  page.on('requestfinished',assetFinished);
  page.on('requestfailed',q=>{r.requestFailures.push({url:q.url(),failure:q.failure()});assetFinished(q);});
  page.on('pageerror',e=>r.pageErrors.push(String(e.stack||e)));page.on('console',e=>r.console.push({type:e.type(),text:e.text(),location:e.location()}));
 });
 const p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
 if(publicMode){r.hostTelemetry={initiators:[],reads:[],completionWaits:[]};const session=await c.newCDPSession(p);session.on('Network.requestWillBeSent',e=>{if(['GET','HEAD'].includes(e.request.method))r.hostTelemetry.reads.push({url:e.request.url,method:e.request.method,requestId:e.requestId,timestamp:e.timestamp});else r.hostTelemetry.initiators.push({url:e.request.url,method:e.request.method,postData:e.request.postData??null,initiator:clone(e.initiator),requestId:e.requestId,timestamp:e.timestamp});});await session.send('Network.enable');}
 try{await action(p,r,c);assert.equal(await save(p,'feature-unrelated'),'held');if(publicMode){const writes=(await completePublicWriteSnapshot(r,'final context')).writeWindow;assert.deepEqual(gameWriteIds(writes),[],'NBA_2004_NATIVE_PUBLIC_NO_GAME_OR_PROVIDER_WRITES');assert(r.publicWriteControl?.wholeInverseExact);assert(r.publicHostInitiatorControl?.wholeInverseExact);assert(r.publicPreflightControl?.wholeInverseExact);assert(r.publicRegistryControl?.wholeInverseExact);assert(r.hostTelemetry.bodyControl?.wholeInverseExact);r.hostTelemetry.finalWindow=writes;}r.status='passed';}
 catch(e){r.status='failed';r.error=String(e.stack||e);try{await p.screenshot({path:out+'/'+r.id+'-failure.png'});r.failureScreenshot=r.id+'-failure.png';}catch{}}
 finally{
  r.url=p.url();
  try{for(const page of c.pages())await assetDrains.get(page)?.('context-close');}
  catch(e){r.assetErrors.push({phase:'context-close-drain',error:String(e.stack||e)});}
  for(let done=0;done<pendingAssets.length;){const batch=pendingAssets.slice(done);done=pendingAssets.length;await Promise.all(batch);}await c.close();for(let done=0;done<pendingAssets.length;){const batch=pendingAssets.slice(done);done=pendingAssets.length;await Promise.all(batch);}
  const expected=e=>{if(!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text))return false;try{const o=new URL(e.location.url).origin;return(known.has(o)||o===origin)&&r.aborts.some(a=>a.origin===o&&new URL(e.location.url).href===new URL(a.url).href);}catch{return false;}};
  r.expectedBlockedConsole=r.console.filter(e=>e.type==='error'&&expected(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expected(e));
  r.undeclaredAborts=r.aborts.filter(a=>!known.has(a.origin.replace(/^ws/,'http'))&&a.origin!==origin);
  r.localHttpErrors=r.responses.filter(e=>new URL(e.url).origin===origin&&e.status>=400);
  try{validateNativeEvidence(r);r.failClosedControls=checkCopiedActualEvidence(r);}
  catch(e){r.status='failed';r.error=String(e.stack||e);r.errorClassification='Native request/boot evidence or authentic copied-report control';}
  if(r.pageErrors.length||r.unexpectedConsole.length||r.undeclaredAborts.length||r.localHttpErrors.length||r.assetErrors.length){r.status='failed';r.errorClassification='Unhandled page/console/transport or published-asset evidence';}
  try{await silent();}catch(e){r.status='failed';r.receiptError=String(e.stack||e);}
   await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 }
}



const KEY='nba-my-career-save-v1';
const scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY}));
const active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
async function frame(p){const raw=await save(p,KEY);assert.equal(typeof raw,'string');const state=JSON.parse(raw);assert(state&&state.c&&typeof state.phase==='string');return{raw,state};}
async function storage(p){return p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));}
function noDraw(r,label,fn){const random=Math.random,now=Date.now;let draws=0,clocks=0;try{Math.random=()=>{draws++;throw Error(label+' Node RNG');};Date.now=()=>{clocks++;throw Error(label+' Node clock');};const value=fn();r.references??=[];r.references.push({label,draws,clocks,value:clone(value)});return value;}finally{Math.random=random;Date.now=now;}}
async function hubReady(p){await p.locator('[data-career-hub-buttons]').waitFor({state:'visible'});assert.equal(await p.getByRole('dialog').count(),0,'No unsupported saved modal');}
async function reloadActual(p,r,before,label){
 const reference=noDraw(r,label+' actual source loader',()=>api.observeLoad(before.raw));assert.equal(reference.phase,'season');assert.equal(reference.modal,null);assert.equal(reference.wouldPersist,false);
 const response=await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await hubReady(p);await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,before.raw,'Whole actual JSON storage reload bytes');assert.deepEqual(actual.state,before.state);assert.equal(await save(p,'feature-unrelated'),'held');
 r.actions.push({type:'actual-NBA-JSON-reload',label,before,reference,actual,scope:'Original storage bytes held. Complete source loader helper memory reference retained separately; no forced phase or invented codec.'});if(publicMode)await qualifyPublicTelemetry(p,r,response);return actual;
}
async function declared(p,r,name){
 const f=fixtures[name],reference=noDraw(r,name+' actual source loader',()=>api.observeLoad(f.raw));assert.deepEqual(reference,f.loader);
 await p.evaluate(({raw,key})=>localStorage.setItem(key,raw),{raw:f.raw,key:KEY});
 const response=await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await hubReady(p);await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,f.raw,'Exact admitted complete NBA JSON save');assert.deepEqual(actual.state,f.expected.save);
 r.actions.push({type:'declared-complete-RAW-boundary',name,source:f.source,actual,reference,scope:f.scope});if(publicMode)await qualifyPublicTelemetry(p,r,response);return actual;
}
function validateOuterRead(before,next){
 assert.equal(next.saved.raw,before.saved.raw,'Every saved byte held');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new game or provider write');
}
async function readAction(p,r,target,label,after,{strict=true,perform=null,prepared=false}={}){
 if(target&&!prepared)await prepareControl(p,r,target);
 const pairedBefore=publicMode?await completePublicWriteSnapshot(r,label+' before'):null;
 const before={document:await scrollOf(p),saved:await frame(p),focus:await active(p),storage:await storage(p),url:p.url(),...(publicMode?pairedBefore:writeSnapshot(r))};
 if(perform)await perform();else await pressPrepared(p,r,target,label);
 await after();await idle(p);
 const next={document:await scrollOf(p),saved:await frame(p),focus:await active(p),storage:await storage(p),url:p.url(),...(publicMode?await completePublicWriteSnapshot(r,label+' after'):writeSnapshot(r))};
 if(strict){validateReadonlyReview(before,next);r.reviewScrollControl??=copiedReviewScrollControl(before,next);if(publicMode){r.publicWriteControl??=copiedUnknownWriteControl(before,next);r.publicHostInitiatorControl??=copiedHostInitiatorControl(next);r.publicPreflightControl??=copiedReadPreflightControl(next);r.publicRegistryControl??=copiedRegistryOmissionControl(next);}}
 else validateOuterRead(before,next);
 r.actions.push({type:strict?'strict-read-only-class':'existing-read-only-reveal-navigation',label,before,after:next,documentZeroClaim:strict});return next.saved;
}
async function keyboardTo(p,r,target){
 assert.equal(await target.count(),1,'Unique keyboard target');
 const limit=await p.locator('a[href],button,input,select,textarea,[tabindex]').count()+2,events=[];
 for(let i=0;i<=limit;i++){if(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement))){r.actions.push({type:'keyboard-reach',events,focus:await active(p)});return;}await p.keyboard.press('Tab');events.push(await active(p));}
 assert.fail('Actual Tab traversal did not reach the target');
}
const targetGeometry=target=>target.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};
   for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll'].includes(s.overflowY)&&a.scrollHeight>a.clientHeight+1){clip={x:Math.max(clip.x,q.x),y:Math.max(clip.y,q.y),right:Math.min(clip.right,q.right),bottom:Math.min(clip.bottom,q.bottom)};}}
   return{target:{x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height},clip};});
function validateTouchGeometry(box,width){
 const t=box.target,g=box.clip;
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'NBA_2004_NATIVE_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
 return{before:box,fault:JSON.parse(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true};
}
async function touchReach(p,r,target){
 assert.equal(await target.count(),1,'Unique touch target');const session=await p.context().newCDPSession(p),samples=[];
 try{for(let attempt=0;attempt<20;attempt++){
  const box=await targetGeometry(target);
  const t=box.target,g=box.clip;if(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,r.width))break;
  assert(g.bottom-g.y>48&&g.right-g.x>48,'A real touch scroll surface is visible');
  const down=t.bottom>g.bottom-4,x=(g.x+g.right)/2,start=down?g.bottom-20:g.y+20;
  const end=down?Math.max(g.y+20,start-Math.min(360,(g.bottom-g.y)*.65)):Math.min(g.bottom-20,start+Math.min(360,(g.bottom-g.y)*.65));
  const before=await scrollOf(p);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
  for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
  await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
  samples.push({attempt,box,before,after:await scrollOf(p)});
 }}finally{await session.detach();}
 const reached=await targetGeometry(target);validateTouchGeometry(reached,r.width);r.touchReachControl??=copiedTouchGeometryControl(reached,r.width);
 r.actions.push({type:'trusted-touch-scroll-preparation',samples,reached});
}
async function prepareControl(p,r,target){
 await waitForScrollIdle(p);if(r.width<768)await touchReach(p,r,target);else await keyboardTo(p,r,target);
 await target.click({trial:true});await idle(p);await waitForScrollIdle(p);
}
async function pressPrepared(p,r,target,label){
 if(r.width<768)await target.tap();else{assert(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement)),'Keyboard target keeps focus after preflight');await p.keyboard.press('Enter');}
 r.actions.push({type:r.actor,label,focus:await active(p)});
}
async function press(p,r,target,label){await prepareControl(p,r,target);await pressPrepared(p,r,target,label);await idle(p);}
async function typeInto(p,r,target,value,label){
 await prepareControl(p,r,target);if(r.width<768)await target.tap();
 await p.keyboard.press('ControlOrMeta+A');await p.keyboard.type(value);await p.keyboard.press('Tab');await idle(p);
 r.actions.push({type:'real-text-entry',actor:r.actor,label,value});
}
async function nativeSwipe(p,x,start,end){
 const session=await p.context().newCDPSession(p);try{
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
 for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
 await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{await session.detach();}await idle(p);
}
const panelOf=p=>p.getByRole('button',{name:'Hub',exact:true}).locator('..').locator('..');
const panelGeometry=panel=>panel.evaluate(n=>{
 const b=n.getBoundingClientRect();let top=0,bottom=innerHeight;
 for(const a of document.querySelectorAll('body *')){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||s.display==='none'||s.visibility==='hidden'||!q.width||!q.height)continue;
 if(q.top<=1&&q.bottom>0&&q.width>=innerWidth*.5)top=Math.max(top,q.bottom);if(q.bottom>=innerHeight-1&&q.top<innerHeight&&q.width>=innerWidth*.5)bottom=Math.min(bottom,q.top);}
 return{y:b.y,bottom:b.bottom,height:b.height,readTop:top,readBottom:bottom,visible:Math.min(b.bottom,bottom)-Math.max(b.y,top)};
});
function requirePanel(box){assert(box.y>=box.readTop+2&&box.visible>=Math.min(box.height,160),'NBA_2004_NATIVE_PREPARED_WRAPPER_LEAD');}
function copiedPanelControl(box){const original=JSON.stringify(box),copy=clone(box),y=copy.y;copy.y=copy.readTop-4;const fault=JSON.stringify(copy);assert.notEqual(fault,original);let owned;try{requirePanel(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_PREPARED_WRAPPER_LEAD/);copy.y=y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(box),original);return{before:box,fault:JSON.parse(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual wrapper geometry, no physical fault credit.'};}

async function prepareClass(p,r,target){
 await prepareControl(p,r,target);const panel=panelOf(p),samples=[];
 for(let i=0;i<32;i++){const g=await panelGeometry(panel);try{requirePanel(g);break;}catch{}
 const needUp=g.y<g.readTop+2,before=await scrollOf(p);
 if(r.width<768){const h=r.height,amount=Math.min(280,Math.max(48,Math.abs(g.y-(g.readTop+12))));await nativeSwipe(p,r.width-5,needUp?h*.35:h*.7,needUp?h*.35+amount:h*.7-amount);}
 else{await p.keyboard.press(needUp?'ArrowUp':'ArrowDown');await idle(p);}
 samples.push({i,before,geometry:g,after:await scrollOf(p)});}
 await waitForScrollIdle(p);const geometry=await panelGeometry(panel);requirePanel(geometry);r.wrapperGeometryControl??=copiedPanelControl(geometry);assert.equal(await target.count(),1);const targetBox=await targetGeometry(target);validateTouchGeometry(targetBox,r.width);
 if(r.width>=768)assert(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement)),'Prepared keyboard target remains focused');
 r.actions.push({type:'native-wrapper-preparation-before-fresh-baseline',samples,geometry,targetBox});
}
async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'NBA_2004_NATIVE_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
function cardControl(box){const before=JSON.stringify(box),copy=clone(box),y=copy.target.y;copy.target.y=copy.clip.y-5;assert.notEqual(JSON.stringify(copy),before);let owned=null;try{validateCard(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_CARD_WHOLE_VISIBLE/);copy.target.y=y;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(box),before);return{changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual card geometry only, no physical negative-control credit.'};}
async function photo(p,r,label,target=null){
 const preparationBefore={saved:await frame(p),storage:await storage(p),url:p.url(),document:await scrollOf(p)},samples=[];let geometry=null;
 if(target){
  if(r.width>=768)await keyboardTo(p,r,section(p).getByRole('button',{name:'Back to My Player',exact:true}));
  for(let i=0;i<40;i++){geometry=await cardGeometry(target);try{validateCard(geometry);break;}catch{}
   const before=await scrollOf(p),up=geometry.target.y<geometry.clip.y+4;
   if(r.width<768)await nativeSwipe(p,r.width-5,up?r.height*.35:r.height*.7,up?r.height*.6:r.height*.45);
   else await p.keyboard.press(up?'ArrowUp':'ArrowDown');await idle(p);samples.push({i,before,geometry,after:await scrollOf(p)});
  }
  await waitForScrollIdle(p);geometry=await cardGeometry(target);validateCard(geometry);r.cardGeometryControl??=cardControl(geometry);
 }
 const readiness={type:'ordinary-viewport-photo-readiness',label,status:'waiting',before:{saved:await frame(p),storage:await storage(p),url:p.url(),document:await scrollOf(p)},scope:'Wait for the existing entry or native preparation navigation before a fresh photo baseline. No action guard is delayed or weakened.'};r.actions.push(readiness);
 await waitForScrollIdle(p);
 const capture={saved:await frame(p),storage:await storage(p),url:p.url(),document:await scrollOf(p)};readiness.after=capture;assert.deepEqual(capture.saved,readiness.before.saved);assert.deepEqual(capture.storage,readiness.before.storage);assert.equal(capture.url,readiness.before.url);readiness.status='settled';assert.deepEqual(capture.saved,preparationBefore.saved);assert.deepEqual(capture.storage,preparationBefore.storage);assert.equal(capture.url,preparationBefore.url);
 const file=r.id+'-'+label+'.png';await p.screenshot({path:path.join(out,file)});
 const after={saved:await frame(p),storage:await storage(p),url:p.url(),document:await scrollOf(p)};assert.deepEqual(after,capture,'Ordinary viewport screenshot has no side effect');r.photos.push(file);report.screenshots.push(file);r.actions.push({type:'ordinary-viewport-photo',label,file,preparationBefore,samples,geometry,capture,after});
}
async function openStats(p,r,label){
 const tile=p.locator('[data-career-hub-buttons] button').filter({has:p.getByText('My Player',{exact:true})});assert.equal(await tile.count(),1);
 await readAction(p,r,tile,label+' real My Player',()=>p.getByRole('button',{name:'Hub',exact:true}).waitFor({state:'visible'}),{strict:false});
}
async function outerHub(p,r,label){await readAction(p,r,p.getByRole('button',{name:'Hub',exact:true}),label+' actual outer Hub',()=>hubReady(p),{strict:false});}
const section=p=>p.locator('section[aria-labelledby="nba-draft-2004-title"]');
function validateClassRows(rows){assert.deepEqual(rows.map(x=>x.id),m.expectedClass.map(x=>x.id),'NBA_2004_NATIVE_COMPLETE_CLASS_ROWS');const family={G:'Guard',F:'Forward',C:'Center'};for(const[row,expected]of rows.map((row,i)=>[row,m.expectedClass[i]])){assert(row.text.includes('Pick '+expected.pick+': '+expected.name));assert(row.text.includes(expected.broadFamilies.map(f=>family[f]).join(' / ')));assert(row.text.includes('Born: '+(expected.dateOfBirth??'Unknown, sources disagree')));}}
function copiedClassRowsControl(rows){const original=JSON.stringify(rows),copy=clone(rows),removed=copy.pop(),fault=JSON.stringify(copy);assert.notEqual(fault,original);let owned;try{validateClassRows(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_COMPLETE_CLASS_ROWS/);copy.push(removed);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(rows),original);return{changed:true,removed,actualSHA256:sha(original),faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual DOM row omission, no App mutation or fabricated live result.'};}
async function openClass(p,r,label){
 const target=p.getByRole('button',{name:'2004 draft class',exact:true});await prepareClass(p,r,target);
 await readAction(p,r,target,label+' open class',()=>section(p).waitFor({state:'visible'}),{prepared:true});
 const s=section(p);assert.equal(await s.getByText('59 real selections, June 24, 2004. Selection does not mean an NBA signing or debut.',{exact:true}).count(),1);assert.equal(await s.getByText("Camp teams, comparisons and outcomes below are simulated in your career. Broad roles can cover different points in a player's career.",{exact:true}).count(),1);
 const rows=await s.locator('li[data-draft-2004-id]').evaluateAll(ns=>ns.map(n=>({id:n.getAttribute('data-draft-2004-id'),text:n.innerText})));validateClassRows(rows);r.classRowsControl??=copiedClassRowsControl(rows);
 r.actions.push({type:'all-59-actual-source-rows',label,rows,fullSaved:await frame(p)});
}
async function backClass(p,r,label){
 const button=section(p).getByRole('button',{name:'Back to My Player',exact:true});await prepareClass(p,r,button);
 await readAction(p,r,button,label+' actual class Back',()=>p.getByRole('button',{name:'2004 draft class',exact:true}).waitFor({state:'visible'}),{prepared:true});
 assert(await p.getByRole('button',{name:'2004 draft class',exact:true}).evaluate(n=>n===document.activeElement),'Real preventScroll Back focuses class opener');
}
async function scrollClassTail(p,r){
 const list=p.getByRole('list',{name:'All 59 real 2004 draft selections',exact:true}),before=await list.evaluate(n=>({top:n.scrollTop,height:n.clientHeight,total:n.scrollHeight}));assert.equal(before.top,0);assert(before.total>before.height);
 const samples=[];if(r.width>=768)await keyboardTo(p,r,list);await waitForScrollIdle(p);
 const prepared={list:await targetGeometry(list),first:await targetGeometry(list.locator('[data-draft-2004-id="nba-draft-2004-p01"]')),document:await scrollOf(p)};validateTouchGeometry(prepared.list,r.width);validateTouchGeometry(prepared.first,r.width);assert.equal(await list.evaluate(n=>n.scrollTop),0,'First row is readable before the fresh internal-list baseline');r.actions.push({type:'native-list-preparation-before-fresh-baseline',prepared});
 await readAction(p,r,null,'actual internal list End or trusted swipes',async()=>{}, {perform:async()=>{
  if(r.width>=768){await p.keyboard.press('End');await idle(p);}
  else{for(let i=0;i<40;i++){const g=await list.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,top:n.scrollTop,height:n.clientHeight,total:n.scrollHeight};});if(g.total-g.height-g.top<=1)break;const start=Math.min(g.bottom-12,r.height-20),end=Math.max(g.y+12,start-Math.min(300,g.height*.7));await nativeSwipe(p,(g.x+g.right)/2,start,end);samples.push({i,before:g,after:await list.evaluate(n=>({top:n.scrollTop,height:n.clientHeight,total:n.scrollHeight}))});}}
 }});
 const early=clone(r.actions.at(-1).after),readiness={type:'internal-list-readiness-after-early-strict-guard',status:'waiting',before:early};r.actions.push(readiness);
 readiness.trace=await list.evaluate(n=>new Promise(resolve=>{
  const samples=[];let previous=null,stable=0,raf,done=false;
  const finish=settled=>{if(done)return;done=true;clearTimeout(timer);cancelAnimationFrame(raf);resolve({settled,maximumMilliseconds:3000,requiredStableFrames:8,samples});};
  const timer=setTimeout(()=>finish(false),3000);
  const sample=()=>{const value={top:n.scrollTop,height:n.clientHeight,total:n.scrollHeight,document:{x:scrollX,y:scrollY}};samples.push(value);stable=previous&&value.top===previous.top&&value.height===previous.height&&value.total===previous.total?stable+1:0;previous=value;if(stable>=8)finish(true);else raf=requestAnimationFrame(sample);};raf=requestAnimationFrame(sample);
 }));
 const settled={document:await scrollOf(p),saved:await frame(p),focus:await active(p),storage:await storage(p),url:p.url(),...(publicMode?await completePublicWriteSnapshot(r,'internal list settled after unchanged early guard'):writeSnapshot(r))};readiness.after=settled;validateReadonlyReview(early,settled);
 const requireSettled=receipt=>assert.equal(receipt.settled,true,'NBA_2004_NATIVE_INTERNAL_SCROLL_UNSETTLED');requireSettled(readiness.trace);
 const originalTrace=JSON.stringify(readiness.trace),fault=clone(readiness.trace);fault.settled=false;assert.notEqual(JSON.stringify(fault),originalTrace);let rejected;try{requireSettled(fault);}catch(error){rejected=error;}assert(rejected instanceof assert.AssertionError);assert.match(rejected.message,/^NBA_2004_NATIVE_INTERNAL_SCROLL_UNSETTLED/);fault.settled=true;assert.equal(JSON.stringify(fault),originalTrace);assert.equal(JSON.stringify(readiness.trace),originalTrace);readiness.control={changed:true,ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual readiness verdict only, no physical or App fault credit.'};readiness.status='settled';
 const after=await list.evaluate(n=>({top:n.scrollTop,height:n.clientHeight,total:n.scrollHeight}));assert(after.top>before.top,'Real internal progress');assert(after.total-after.height-after.top<=1,'Real end of all59 list');r.actions.push({type:'actual-internal-list-progress',before,after,samples});
 for(const id of['nba-draft-2004-p57','nba-draft-2004-p59'])validateTouchGeometry(await targetGeometry(list.locator('[data-draft-2004-id="'+id+'"]')),r.width);
 assert.match(await list.locator('[data-draft-2004-id="nba-draft-2004-p57"]').innerText(),/Born: Unknown, sources disagree/);
}
async function assertCamp(p,r,name){
 const saved=await frame(p),visits=saved.state.c.draft2004.visits,card=section(p).getByRole('heading',{name:'Your simulated 2004 camps',exact:true}).locator('..');assert.equal(visits.length,1);
 const text=await card.innerText(),family={G:'Guard',F:'Forward',C:'Center'},role={starter:'Starting five',backup:'Second unit'};
 for(const v of visits){const player=m.expectedClass.find(row=>row.id===v.id);assert(player);const team=noDraw(r,name+' actual era-aware team label',()=>nba.nbaTeamLabelOf(v.team,saved.state.c.eraId));for(const part of[player.name,team+': '+family[v.family],'Simulated comparison: '+v.comparison,role[v.roleBefore]+' to '+role[v.roleAfter]+'. Morale '+v.moraleBefore+' to '+v.moraleAfter+'.'])assert(text.includes(part));}
 r.actions.push({type:'actual-saved-simulated-camp-receipt',name,visits,text,saved});return card;
}
async function run(p,r){
 const response=await goto(p,'/nba-my-career');if(publicMode)await qualifyPublicTelemetry(p,r,response);const name=p.getByRole('textbox',{name:'Your player name',exact:true});await typeInto(p,r,name,'Native Draft Probe','fictional player name');
 const era=p.getByRole('button').filter({has:p.getByText('⏪ 2003-04 throwback',{exact:true})});await press(p,r,era,'actual2003 era');await press(p,r,p.getByRole('button',{name:'PG',exact:true}),'actual PG');
 await press(p,r,p.getByRole('button',{name:'Enter the draft',exact:true}),'actual quick2003 constructor');await hubReady(p);
 const initial=await frame(p);assert.equal(initial.state.c.year,2003);assert.equal(initial.state.c.eraId,'y2004');assert.deepEqual(initial.state.c.draft2004,{v:1,ids:[],visits:[]});r.created=initial;
 await photo(p,r,'01-actual2003-created');await reloadActual(p,r,initial,'actualUI2003');await openStats(p,r,'actualUI2003');assert.equal(await p.getByRole('button',{name:'2004 draft class',exact:true}).count(),0);await outerHub(p,r,'actualUI2003');
 await declared(p,r,'preCamp');await openStats(p,r,'declared preCamp');await openClass(p,r,'declared preCamp');
 assert.equal(await section(p).getByRole('heading',{name:'Your simulated 2004 camps',exact:true}).count(),0);validateTouchGeometry(await targetGeometry(section(p).locator('[data-draft-2004-id="nba-draft-2004-p01"]')),r.width);await photo(p,r,'02-declared-first-real-rows');
 await scrollClassTail(p,r);await photo(p,r,'03-declared-tail59-and-unknown57');await backClass(p,r,'preCamp');await openClass(p,r,'preCamp reopen');await backClass(p,r,'preCamp reopened');await outerHub(p,r,'preCamp');await reloadActual(p,r,await frame(p),'preCamp');
 await declared(p,r,'postCamp');await openStats(p,r,'declared postCamp');await openClass(p,r,'declared postCamp');const camp=await assertCamp(p,r,'postCamp');await photo(p,r,'04-declared-actual-camp-and-season',camp);await backClass(p,r,'postCamp');await outerHub(p,r,'postCamp');await reloadActual(p,r,await frame(p),'postCamp');
 await declared(p,r,'laterFa');await openStats(p,r,'declared laterFA');await openClass(p,r,'declared laterFA');const later=await assertCamp(p,r,'laterFa');await photo(p,r,'05-declared-later-FA-persistence',later);await backClass(p,r,'laterFA');await openClass(p,r,'laterFA reopen');await backClass(p,r,'laterFA reopened');await outerHub(p,r,'laterFA');await reloadActual(p,r,await frame(p),'laterFA');
 for(const name of['legacy','current']){await declared(p,r,name);await openStats(p,r,name);assert.equal(await p.getByRole('button',{name:'2004 draft class',exact:true}).count(),0,'Actual My Player has no registry entry for '+name);assert.equal(Object.hasOwn((await frame(p)).state.c,'draft2004'),false);r.actions.push({type:'actual-unmarked-absence',name,dom:await p.locator('#dukb-main').innerText(),saved:await frame(p)});await outerHub(p,r,name);await reloadActual(p,r,await frame(p),name);}
 assert(r.assetBodies.some(row=>/\/NbaHistoricalDraftClass-[^/]+\.js$/.test(row.file)),'Actual lazy class response required');assert.equal(r.photos.length,5);
}
function validateReadonlyReview(before,next){
 assert.deepEqual(next.document,before.document,'NBA_2004_NATIVE_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Phone read-only keeps every saved byte');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new write request');
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^NBA_2004_NATIVE_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}
const browser=await pw.chromium.launch({headless:true});
try{for(const width of[320,390,1280])await journey('nba-draft2004',width,{},async(p,r)=>{await run(p,r);assert.equal(r.photos.length,5);});}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
assert.deepEqual(await fixtureInventory(),fixtureBefore,'Every original source RAW, gzip, selected save, loader preparation, bundle and manifest body held');await silent();
report.sourceHeld=true;report.distHeld=true;report.fixtureHeld=true;report.nodeReceiptEmpty=true;report.observedAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));
report.status=report.contexts.length===3&&report.contexts.every(r=>r.status==='passed'&&r.assetBodies.length>0&&r.photos.length===5)&&report.screenshots.length===15&&new Set(report.screenshots).size===15?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('NBA_DRAFT_2004_NATIVE_ADMITTED actual2003UI, five separately declared full NBA JSON saves,59 source rows,3contexts15viewportphotos,strict class/internal-list/Back/reload/source/asset holds');
