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
try{Math.random=()=>{importSeed=importSeed*16807%2147483647;const value=(importSeed-1)/2147483646;importDraws.push(value);return value;};api=await import(pathToFileURL(dir+'/'+m.bundle).href);}finally{Math.random=originalRandom;}
assert.deepEqual(importDraws,m.importDraws,'Actual Node reference import tape');
const {engine,codec,moments,wheel}=api,fixtures={};
assert.deepEqual(Object.keys(m.fixtures).sort(),['entry2009','entry2015','retiredTail']);
for(const[name,f]of Object.entries(m.fixtures)){const raw=await fs.readFile(dir+'/'+f.file,'utf8');assert.equal(sha(raw),f.sha256);assert.equal(raw,f.expected.raw);
 assert.deepEqual(codec.parseSoccerCareerSave(raw),f.expected.state);assert.equal(codec.serializeSoccerCareerSave(f.expected.state),raw);
 assert.equal(sha(await fs.readFile(dir+'/'+f.originalFile)),f.originalSHA256);fixtures[name]={...f,raw};}
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(await inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const assetReference=new Map(m.distBefore.filter(r=>r.file.startsWith('assets/')||r.file==='prerender-boot.js').map(r=>[r.file,r])),observedAssets=new Map();
assert(assetReference.has('prerender-boot.js'));
const report={status:'incomplete',mode:publicMode?'public':'local',product:m.product,distDigest:m.distDigest,contexts:[],screenshots:[],
 scope:'Three widths. Actual Spain/CM/2005 creation through real selectors, natural roll and Begin, then separately declared complete2009/2015 and manager tail saved boundaries. Source-entry facts versus career-world club, Phone read-only/reopen, actual Page reload reference. No natural annual progression, guaranteed nomination/transfer, full population/provider or physical signing-control claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']),routes=['/soccer-career'];
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const save=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
async function goto(p,url){await p.goto(base+url);await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);}
function validateNativeEvidence(actual) {
 assert.deepEqual(actual.requestFailures.filter(row=>!actual.aborts.some(a=>a.url===row.url)),[],'SC_REAL_ENTRY_NATIVE_UNDECLARED_REQUEST_FAILURE');
 assert(actual.assetBodies.some(row=>row.file==='prerender-boot.js'),'SC_REAL_ENTRY_NATIVE_OBSERVED_BOOT_BODY');
}
function checkCopiedActualEvidence(actual) {
 const original=JSON.stringify(actual),beforeSHA256=sha(original),failure=actual.requestFailures.find(row=>actual.aborts.some(a=>a.url===row.url));
 assert(failure,'SC_REAL_ENTRY_NATIVE_DECLARED_FAILURE_CONTROL_ANCHOR');
 const declarationCopy=JSON.parse(original),removedDeclarations=declarationCopy.aborts.map((row,index)=>({row,index})).filter(x=>x.row.url===failure.url);
 assert(removedDeclarations.length>0);declarationCopy.aborts=declarationCopy.aborts.filter(row=>row.url!==failure.url);
 const declarationFault=JSON.stringify(declarationCopy);assert.notEqual(declarationFault,original);
 let declarationError=null;try{validateNativeEvidence(declarationCopy);}catch(e){declarationError=e;}
 assert(declarationError instanceof assert.AssertionError);assert.match(declarationError.message,/^SC_REAL_ENTRY_NATIVE_UNDECLARED_REQUEST_FAILURE/);
 for(const x of removedDeclarations)declarationCopy.aborts.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(declarationCopy),original,'Copied declaration control whole inverse');
 const bootCopy=JSON.parse(original),removedBoot=bootCopy.assetBodies.map((row,index)=>({row,index})).filter(x=>x.row.file==='prerender-boot.js');
 assert(removedBoot.length>0);bootCopy.assetBodies=bootCopy.assetBodies.filter(row=>row.file!=='prerender-boot.js');
 const bootFault=JSON.stringify(bootCopy);assert.notEqual(bootFault,original);
 let bootError=null;try{validateNativeEvidence(bootCopy);}catch(e){bootError=e;}
 assert(bootError instanceof assert.AssertionError);assert.match(bootError.message,/^SC_REAL_ENTRY_NATIVE_OBSERVED_BOOT_BODY/);
 for(const x of removedBoot)bootCopy.assetBodies.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(bootCopy),original,'Copied boot observation control whole inverse');
 assert.equal(JSON.stringify(actual),original,'The actual context report remains byte exact');
 return {actualReportSHA256:beforeSHA256,declaration:{url:failure.url,removed:removedDeclarations.length,faultSHA256:sha(declarationFault),ownedFailure:{name:declarationError.name,message:declarationError.message}},
  boot:{removed:removedBoot.length,actualBodies:removedBoot.map(x=>x.row),faultSHA256:sha(bootFault),ownedFailure:{name:bootError.name,message:bootError.message}},wholeInverseExact:true,actualReportHeld:true,
  scope:'Copied actual context report only. Remove real matching abort declarations or real verified boot observations. Same validator owns both failures; no App outcomes or HTTP bodies are fabricated.'};
}
async function journey(name,width,seeds,action){
 const height=width===390?844:900;
 const r={id:name+'-'+width,name,width,height,actor:width<768?'touch':'keyboard',status:'incomplete',actions:[],photos:[],requests:[],responses:[],aborts:[],requestFailures:[],console:[],pageErrors:[],assetBodies:[],assetErrors:[]},pendingAssets=[],assetDrains=new Map();report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol)||u.origin===origin&&['GET','HEAD'].includes(q.method()))return route.continue();r.aborts.push({url:u.href,origin:u.origin,method:q.method()});return route.abort('blockedbyclient');});
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
  {r.assetNavigationWaits??=[];for(const method of['goto','reload','goBack']){const native=page[method].bind(page);page[method]=async(...args)=>{await drainAssets(method);return native(...args);};}}
  page.on('request',q=>{r.requests.push({url:q.url(),method:q.method()});if(isAsset(q.url())){activeAssets.add(q);lastAssetActivity=Date.now();}});
  page.on('response',q=>{
   r.responses.push({url:q.url(),status:q.status()});const u=new URL(q.url());
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
 try{await action(p,r,c);assert.equal(await save(p,'feature-unrelated'),'held');r.status='passed';}
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



const KEY='soccerCareerSave';
const scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY}));
const active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
async function frame(p){const raw=await save(p,KEY);assert.equal(typeof raw,'string');const state=codec.parseSoccerCareerSave(raw);assert(codec.isSoccerCareerSave(state));return{raw,state};}
async function storage(p){return p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));}
function noDraw(r,label,fn){const random=Math.random,now=Date.now;let draws=0,clocks=0;try{Math.random=()=>{draws++;throw Error(label+' Node RNG');};Date.now=()=>{clocks++;throw Error(label+' Node clock');};const value=fn();r.references??=[];r.references.push({label,draws,clocks,value:clone(value)});return value;}finally{Math.random=random;Date.now=now;}}
async function reloadActual(p,r,before,label,idempotent){
 const expected=noDraw(r,label+' source Page loader',()=>{const state=codec.parseSoccerCareerSave(before.raw);assert(codec.isSoccerCareerSave(state));engine.repairCareer(state);moments.settleLoadedMoments(state);return{state,raw:codec.serializeSoccerCareerSave(state)};});
 if(idempotent)assert.equal(expected.raw,before.raw,'Warmed declared state is byte-idempotent');
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,expected.raw,'Whole actual Page reload bytes');assert.deepEqual(actual.state,expected.state);
 assert.equal(await save(p,'feature-unrelated'),'held');r.actions.push({type:'reload-full-reference',label,before,expected,actual,allChangesRetained:true});return actual;
}
async function declared(p,r,name){
 const f=fixtures[name];await p.evaluate(({raw,key})=>localStorage.setItem(key,raw),{raw:f.raw,key:KEY});
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,f.raw,'Exact warmed declared save');assert.deepEqual(actual.state,f.expected.state);
 r.actions.push({type:'declared-actual-RAW-boundary',name,originalSHA256:f.originalSHA256,warmedSHA256:f.sha256,actual,scope:f.scope});return actual;
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
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
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
async function selectOption(p,r,index,text){
 const trigger=p.getByRole('combobox').nth(index);await press(p,r,trigger,'Open actual creation picker '+index);
 const list=p.getByRole('listbox');await list.waitFor({state:'visible'});assert.equal(await list.count(),1);
 const target=list.getByRole('option',index===0?{name:/^Spain(?:\s+Spain)?$/}:{name:text,exact:true});await target.waitFor({state:'visible'});assert.equal(await target.count(),1);
 if(r.width<768){const label=target.locator(':scope > span').last();assert.equal(await label.count(),1);assert((await label.innerText()).includes(text));await touchReach(p,r,label);await label.tap();}
 else{const wanted=await target.evaluate(n=>[...n.closest('[role="listbox"]').querySelectorAll('[role="option"]')].indexOf(n));assert(wanted>=0);await p.keyboard.press('Home');await idle(p);for(let i=0;i<wanted;i++){await p.keyboard.press('ArrowDown');await idle(p);}await p.waitForFunction(n=>n===document.activeElement||n.contains(document.activeElement),await target.elementHandle());await p.keyboard.press('Enter');}
 await idle(p);assert((await trigger.innerText()).includes(text));r.actions.push({type:'real-select',actor:r.actor,index,text});
}
function validateReadonlyReview(before,next){
 assert.deepEqual(next.document,before.document,'SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Phone read-only keeps every saved byte');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new write request');
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}
async function readonlyAction(p,r,target,label,after){
 await prepareControl(p,r,target);const before={document:await scrollOf(p),saved:await frame(p),focus:await active(p),storage:await storage(p),url:p.url(),writeRequests:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length};
 await pressPrepared(p,r,target,label);await after();await idle(p);
 const next={document:await scrollOf(p),saved:await frame(p),focus:await active(p),storage:await storage(p),url:p.url(),writeRequests:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length};
 validateReadonlyReview(before,next);r.reviewScrollControl??=copiedReviewScrollControl(before,next);
 r.actions.push({type:'read-only-review',label,before,after:next});
}

function validateWheelAcknowledgment(before,expected,actual){
 assert.equal(actual.saved.raw,expected.raw,'SC_REAL_ENTRY_WHEEL_WHOLE_ACK');assert.deepEqual(actual.saved.state,expected.state,'SC_REAL_ENTRY_WHEEL_WHOLE_ACK');
 const fence='dukb-fence:'+KEY,generation=Number(before.storage[fence]??0);
 assert(Number.isSafeInteger(generation)&&generation>=0,'Actual supported stored save-fence generation');
 const expectedStorage={...before.storage,[KEY]:expected.raw,[fence]:String(generation+1)};
 assert.deepEqual(actual.storage,expectedStorage,'SC_REAL_ENTRY_WHEEL_STORAGE');
 assert.deepEqual(actual.saved.state.historicalArrivals,before.saved.state.historicalArrivals);
 assert.equal(actual.saved.state.phone.clubs.Neymar,before.saved.state.phone.clubs.Neymar);
}
function copiedWheelAcknowledgmentControl(before,expected,actual){
 const sample={before,expected,actual},original=JSON.stringify(sample),copy=clone(sample),fence='dukb-fence:'+KEY,value=copy.actual.storage[fence];
 copy.actual.storage[fence]=String(Number(value)+1);const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateWheelAcknowledgment(copy.before,copy.expected,copy.actual);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_WHEEL_STORAGE/);
 copy.actual.storage[fence]=value;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),faultSampleSHA256:sha(fault),actualFence:value,faultFence:String(Number(value)+1),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualReceiptHeld:true,scope:'Copied actual acknowledgment storage receipt through the same validator only. No physical, App fault or fabricated outcome credit.'};
}
async function acknowledgeSavedWheel(p,r,label){
 const original=await frame(p),receipt=original.state.chanceWheel;
 if(!wheel.validChanceWheel(receipt)||receipt.seen){r.actions.push({type:'saved-wheel-gate',label,valid:wheel.validChanceWheel(receipt),seen:receipt?.seen??null,acknowledged:false});return original;}
 // This finite packet's admitted2015 save holds this exact already-rolled choice.
 assert.equal(label,'entry2015');assert.equal(receipt.title,'The Agent Poach');
 const event={label,status:'incomplete',original,receipt:clone(receipt)};(r.wheelAcknowledgments??=[]).push(event);
 const dialog=p.locator('[data-career-chance-wheel]');await dialog.waitFor({state:'visible'});assert.equal(await dialog.count(),1);
 await readonlyAction(p,r,dialog.getByRole('button',{name:'Show result',exact:true}),label+' Show actual saved wheel result',()=>dialog.getByRole('button',{name:'Continue',exact:true}).waitFor({state:'visible'}));
 event.revealed={saved:await frame(p),result:await dialog.locator('[data-wheel-result]').innerText(),storage:await storage(p)};
 assert.equal(event.revealed.result.trim(),receipt.result?receipt.hit:receipt.miss,'Actual component reveals the original saved result');
 assert.deepEqual(event.revealed.saved,original,'Show result never acknowledges or rerolls');
 const expected=noDraw(r,label+' actual acknowledgeChanceWheel',()=>{
  const input=clone(original.state),before=clone(input),state=wheel.acknowledgeChanceWheel(input);
  assert.deepEqual(input,before,'Pure source acknowledgment does not mutate input');
  assert.equal(state.chanceWheel.seen,true);assert.notDeepEqual(state,before);
  const inverse=clone(state);inverse.chanceWheel.seen=before.chanceWheel.seen;assert.deepEqual(inverse,before,'Actual helper changes only seen');
  return{state,raw:codec.serializeSoccerCareerSave(state)};
 });
 event.expected=expected;
 const proceed=dialog.getByRole('button',{name:'Continue',exact:true});await prepareControl(p,r,proceed);
 const before={saved:await frame(p),storage:await storage(p),document:await scrollOf(p),focus:await active(p)};
 assert.deepEqual(before.saved,original);
 await pressPrepared(p,r,proceed,label+' Continue actual saved wheel');
 await dialog.waitFor({state:'hidden'});
 await p.waitForFunction(({key,raw})=>localStorage.getItem(key)===raw,{key:KEY,raw:expected.raw});await idle(p);
 const actual={saved:await frame(p),storage:await storage(p),document:await scrollOf(p),focus:await active(p)};
 validateWheelAcknowledgment(before,expected,actual);
 event.guardControl=copiedWheelAcknowledgmentControl(before,expected,actual);
 event.beforeContinue=before;event.actual=actual;event.status='passed';event.changedStateFields=['chanceWheel.seen'];event.changedStorageKeys=[KEY,'dukb-fence:'+KEY];event.scope='Real Show result and Continue on the existing saved receipt. No spin/reroll, season, fixture edit or physical exact-scroll transition claim. Complete before/after and all source helper references retained.';
 return actual.saved;
}
async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'SC_REAL_ENTRY_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
function cardControl(box){const before=JSON.stringify(box),copy=clone(box),y=copy.target.y;copy.target.y=copy.clip.y-5;assert.notEqual(JSON.stringify(copy),before);let owned=null;try{validateCard(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_CARD_WHOLE_VISIBLE/);copy.target.y=y;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(box),before);return{changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual card geometry only, no physical negative-control credit.'};}
async function photo(p,r,label,card=null){
 const before={saved:await frame(p),document:await scrollOf(p),storage:await storage(p)};
 let geometry=null;if(card){if(r.width<768)await touchReach(p,r,card);else await keyboardTo(p,r,card.getByRole('link',{name:'Santos FC',exact:true}));await waitForScrollIdle(p);geometry=await cardGeometry(card);validateCard(geometry);r.cardGeometryControl??=cardControl(geometry);}
 const settled={saved:await frame(p),document:await scrollOf(p),storage:await storage(p)};
 const file=r.id+'-'+label+'.png';await p.screenshot({path:path.join(out,file)});assert.deepEqual(await frame(p),settled.saved);assert.deepEqual(await scrollOf(p),settled.document);assert.deepEqual(await storage(p),settled.storage);
 r.photos.push({label,file,geometry,preparationBefore:before,capture: settled,kind:'Actual viewport screenshot, no locator autoscroll/composite/CSS changes'});report.screenshots.push(file);
}
function checkEntry(s,empty=false){assert.equal(s.historicalArrivals.version,1);assert.deepEqual(s.historicalArrivals.players,empty?[]:[{id:'soccer:neymar',entryYear:2009,entryClub:'Santos'}]);if(!empty)assert.equal(s.phone.clubs.Neymar,'Santos');}
async function phoneRead(p,r,label,empty=false,retired=false){
 const before=await frame(p),opener=p.getByRole('button',{name:'Open your phone',exact:true}),phone=p.getByRole('dialog',{name:'Your phone',exact:true});
 await readonlyAction(p,r,opener,label+' open Phone',()=>phone.waitFor({state:'visible'}));
 await readonlyAction(p,r,phone.getByRole('button',{name:/SportsFeed/}),label+' SportsFeed',()=>phone.getByText('World football. Nothing about you in here.',{exact:true}).waitFor({state:'visible'}));
 const card=phone.getByRole('region',{name:'Real player arrivals',exact:true});
 if(empty)assert.equal(await card.count(),0,'No admitted player before calendar2009');
 else{assert.equal(await card.count(),1);const text=await card.innerText();assert(text.includes('Neymar')&&text.includes('7 March 2009')&&text.includes('Santos FC')&&text.includes('Brazil')&&text.includes('Attacker')&&text.includes('Age 17 at his debut')&&text.includes('Career world: Santos')&&text.includes('simulated'),'Sourced debut separated from career world');assert.equal(await card.getByRole('link',{name:'Santos FC',exact:true}).getAttribute('href'),'https://www.santosfc.com.br/memoria-em-partida-oficial-neymar-fazia-a-estreia-com-a-camisa-do-santos-fc/');assert.equal(await card.getByRole('link',{name:'Globo',exact:true}).getAttribute('href'),'https://ge.globo.com/Esportes/Noticias/Times/Santos/0,,MUL1033491-9874,00.html');}
 if(retired){const header=phone.getByText(/^Retired\s+·\s+player record\s+2008$/);assert.equal(await header.count(),1,'Marked retired header explicitly dates the player record, not current calendar');r.actions.push({type:'retired-explicit-record-label',text:await header.innerText(),fullSaved:await frame(p)});}
 await photo(p,r,label,empty?null:card);
 await readonlyAction(p,r,phone.getByRole('button',{name:/Home/}),label+' Back home',()=>phone.getByRole('button',{name:/SportsFeed/}).waitFor({state:'visible'}));
 await readonlyAction(p,r,phone.getByRole('button',{name:/SportsFeed/}),label+' reopen SportsFeed',()=>phone.getByText('World football. Nothing about you in here.',{exact:true}).waitFor({state:'visible'}));
 assert.equal(await card.count(),empty?0:1,'Persistent source card after internal reopen');
 await readonlyAction(p,r,phone.getByRole('button',{name:'Put phone away',exact:true}),label+' close Phone',()=>phone.waitFor({state:'hidden'}));
 assert.deepEqual(await frame(p),before);assert(await opener.evaluate(n=>n===document.activeElement),'Phone restores its real opener focus');
 return before;
}
async function run(p,r){
 await goto(p,'/soccer-career');assert.equal(await save(p,KEY),null,'Real creation starts without an App save');
 await typeInto(p,r,p.getByPlaceholder('Enter your player name...'),'Native Entry Tester','Actual player name');
 await selectOption(p,r,0,'Spain');await selectOption(p,r,1,'Central Mid (CM)');await selectOption(p,r,2,'Late 2000s (2005 start)');
 await press(p,r,p.getByRole('button',{name:/Generate Starting Potential|Roll again/}),'Actual natural roll');
 const begin=p.getByRole('button',{name:/Begin Career/});await begin.waitFor({state:'visible'});await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Begin Career/.test(b.textContent)&&!b.disabled));
 await press(p,r,begin,'Actual Begin Career');await p.waitForFunction(key=>localStorage.getItem(key)!==null,KEY);await idle(p);
 const created=await frame(p);assert.equal(created.state.playerName,'Native Entry Tester');assert.equal(created.state.nationality,'Spain');assert.equal(created.state.position,'CM');assert.equal(created.state.era,'2005-09');assert.equal(created.state.phase,'youth');assert.equal(created.state.seasons[0].year,2005);checkEntry(created.state,true);
 r.actions.push({type:'actual-2005-UI-creation',fullSaved:created,scope:'Actual controls, natural browser RNG and clock. No annual progression or entrant injection.'});
 await phoneRead(p,r,'created-empty-feed',true);
 const createdLoaded=await reloadActual(p,r,created,'actual newly-created2005',false);checkEntry(createdLoaded.state,true);
 for(const name of['entry2009','entry2015','retiredTail']){
  const seeded=await declared(p,r,name);checkEntry(seeded.state);
  if(name==='retiredTail'){assert.equal(seeded.state.retired,true);assert.equal(seeded.state.seasons.at(-1).year,2008);}else assert.equal(seeded.state.seasons.at(-1).year,name==='entry2009'?2009:2015);
  const ready=await acknowledgeSavedWheel(p,r,name);
  await phoneRead(p,r,name,false,name==='retiredTail');
  const reloaded=await reloadActual(p,r,ready,name,true);assert.deepEqual(reloaded,ready);
 }
 assert.equal(r.photos.length,4);assert.equal(r.wheelAcknowledgments?.length,1);assert.equal(r.wheelAcknowledgments[0].status,'passed');return{created,createdLoaded,declaredNames:['entry2009','entry2015','retiredTail'],savedWheelAcknowledgments:1};
}
const browser=await pw.chromium.launch({headless:true});
try{for(const width of[320,390,1280])await journey('soccer-real-entry',width,{},async(p,r)=>{r.observed=await run(p,r);assert.equal(r.photos.length,4);});}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
for(const[name,f]of Object.entries(m.fixtures)){assert.equal(sha(await fs.readFile(dir+'/'+f.file)),f.sha256,name);assert.equal(sha(await fs.readFile(dir+'/'+f.originalFile)),f.originalSHA256);}
assert.equal(sha(await fs.readFile(dir+'/'+m.bundle)),m.bundleSHA);assert.equal(sha(await fs.readFile(dir+'/'+m.entry)),m.entrySHA);assert.equal(sha(await fs.readFile(dir+'/'+m.preparation.file)),m.preparation.sha256);await silent();
report.sourceHeld=true;report.distHeld=true;report.fixtureHeld=true;report.nodeReceiptEmpty=true;report.observedAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));
report.status=report.contexts.length===3&&report.contexts.every(r=>r.status==='passed'&&r.assetBodies.length>0&&r.photos.length===4)&&report.screenshots.length===12&&new Set(report.screenshots).size===12?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('SC_REAL_ENTRY_NATIVE_ADMITTED actual2005UI, three declared full saves,3contexts12viewportphotos,source/assets/read-only/reload holds');
