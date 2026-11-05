import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';
const arg=(n,f)=>{const i=process.argv.indexOf(n);return i<0?f:process.argv[i+1];};
for(const key of['--out','--fixtures','--dist','--base-url'])assert(process.argv.includes(key),key);
const out=path.resolve(arg('--out')),dir=path.resolve(arg('--fixtures')),dist=path.resolve(arg('--dist')),base=arg('--base-url'),origin=new URL(base).origin;
const publicMode=process.argv.includes('--public');
assert(process.env.CI,'Remote CI only');
const receipt=process.env.SIM_OFFLINE_RECEIPT;async function silent(){assert(receipt,'Existing Node transport receipt required');assert.equal((await fs.readFile(receipt)).length,0,'Node transport receipt remains empty');}await silent();
assert(publicMode?origin==='https://douknowball.com':['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Use the source-associated local build or explicitly declared public origin');
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),m=JSON.parse(await fs.readFile(dir+'/manifest.json'));
assert.equal(m.schema,1);assert.deepEqual(m.sourceBefore,m.sourceAfter);
for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
assert.equal(sha(await fs.readFile(dir+'/'+m.bundle)),m.bundleSHA);
const nodeMemory=new Map();globalThis.localStorage={getItem:key=>nodeMemory.get(key)??null,setItem:(key,value)=>nodeMemory.set(key,String(value)),removeItem:key=>nodeMemory.delete(key),clear:()=>nodeMemory.clear()};
const api=await import(pathToFileURL(dir+'/'+m.bundle).href),fixtures={};
const {engine,codec,moments,offerReview,cup}=api;
assert.deepEqual(Object.keys(m.fixtures).sort(),['cup','legacy','palette']);
assert.equal(sha(await fs.readFile(dir+'/'+m.preparation.file)),m.preparation.sha256);
const additional=new Map([[m.cupRuntime.file,m.cupRuntime.sha256],...Object.entries(m.cupRuntime.bundles)]);
for(const[file,digest]of additional)assert.equal(sha(await fs.readFile(dir+'/'+file)),digest,file+' retained cup qualification body');
const cupRuntime=JSON.parse(await fs.readFile(dir+'/'+m.cupRuntime.file,'utf8'));assert.equal(cupRuntime.status,'admitted');assert.deepEqual(cupRuntime.advanced.map(row=>row.year),[2026,2027]);
for(const[name,f]of Object.entries(m.fixtures)){const raw=await fs.readFile(dir+'/'+f.file,'utf8');assert.equal(sha(raw),f.sha256);assert.equal(f.expected.raw,raw);assert.equal(codec.serializeSoccerCareerSave(f.expected.before),raw);fixtures[name]={...f,raw};}
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(await inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const assetReference=new Map(m.distBefore.filter(row=>row.file.startsWith('assets/')||row.file==='prerender-boot.js').map(row=>[row.file,row])),observedAssets=new Map();
assert(assetReference.has('prerender-boot.js'),'Completed artifact retains the actual boot reference');
const report={status:'incomplete',mode:publicMode?'public':'local',core:m.core,distDigest:m.distDigest,cupRuntime:{file:m.cupRuntime.file,sha256:m.cupRuntime.sha256,scope:'Retained separate Node season qualification only. Observer and copied control bundles are never page-injected.'},contexts:[],screenshots:[],scope:'Three Soccer Career contexts: real Andorra2026 creation/build50/youth/parent-signing, then separately declared Copa/legacy/palette saves. Actual browser RNG and clock. Production acceptance/load helpers supply exact saved-frame references. Unit outcomes own deterministic draws. No naturally delivered declared fixture, provider availability, full career, full format or master-card completion claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const routes=['/soccer-career'];
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const save=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
async function photo(p,r,label,target){
 assert.equal(await target.count(),1,'Unique photo surface');const saved=await save(p,'soccerCareerSave'),before=await scrollOf(p);
 const geometry=await target.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x,right:b.right,width:b.width,height:b.height,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
 assert(geometry.width>0&&geometry.width<=geometry.viewport+1);assert(geometry.scrollWidth<=geometry.clientWidth+1,'No document horizontal overflow');
 const file=r.id+'-'+label+'.png';await target.screenshot({path:out+'/'+file});assert.equal(await save(p,'soccerCareerSave'),saved,'Photo is save read-only');
 r.photos.push({label,file,geometry,documentBefore:before,documentAfter:await scrollOf(p)});report.screenshots.push(file);
}
async function goto(p,url){await p.goto(base+url);await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);}
function validateNativeEvidence(actual) {
 assert.deepEqual(actual.requestFailures.filter(row=>!actual.aborts.some(a=>a.url===row.url)),[],'SC_SEGUNDA_NATIVE_UNDECLARED_REQUEST_FAILURE');
 assert(actual.assetBodies.some(row=>row.file==='prerender-boot.js'),'SC_SEGUNDA_NATIVE_OBSERVED_BOOT_BODY');
}
function checkCopiedActualEvidence(actual) {
 const original=JSON.stringify(actual),beforeSHA256=sha(original),failure=actual.requestFailures.find(row=>actual.aborts.some(a=>a.url===row.url));
 assert(failure,'SC_SEGUNDA_NATIVE_DECLARED_FAILURE_CONTROL_ANCHOR');
 const declarationCopy=JSON.parse(original),removedDeclarations=declarationCopy.aborts.map((row,index)=>({row,index})).filter(x=>x.row.url===failure.url);
 assert(removedDeclarations.length>0);declarationCopy.aborts=declarationCopy.aborts.filter(row=>row.url!==failure.url);
 const declarationFault=JSON.stringify(declarationCopy);assert.notEqual(declarationFault,original);
 let declarationError=null;try{validateNativeEvidence(declarationCopy);}catch(e){declarationError=e;}
 assert(declarationError instanceof assert.AssertionError);assert.match(declarationError.message,/^SC_SEGUNDA_NATIVE_UNDECLARED_REQUEST_FAILURE/);
 for(const x of removedDeclarations)declarationCopy.aborts.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(declarationCopy),original,'Copied declaration control whole inverse');
 const bootCopy=JSON.parse(original),removedBoot=bootCopy.assetBodies.map((row,index)=>({row,index})).filter(x=>x.row.file==='prerender-boot.js');
 assert(removedBoot.length>0);bootCopy.assetBodies=bootCopy.assetBodies.filter(row=>row.file!=='prerender-boot.js');
 const bootFault=JSON.stringify(bootCopy);assert.notEqual(bootFault,original);
 let bootError=null;try{validateNativeEvidence(bootCopy);}catch(e){bootError=e;}
 assert(bootError instanceof assert.AssertionError);assert.match(bootError.message,/^SC_SEGUNDA_NATIVE_OBSERVED_BOOT_BODY/);
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
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET'});await socket.close({code:1008,reason:'Source Segunda QA'});});
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


const KEY='soccerCareerSave',clone=value=>JSON.parse(JSON.stringify(value));
const scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY}));
const active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
async function frame(p){const raw=await save(p,KEY);assert.equal(typeof raw,'string');const value=codec.parseSoccerCareerSave(raw);assert(codec.isSoccerCareerSave(value));return{raw,state:value};}
function noDraw(r,label,action){const random=Math.random,now=Date.now;let draws=0,clocks=0;try{Math.random=()=>{draws++;throw Error(label+' unexpectedly drew Node RNG');};Date.now=()=>{clocks++;throw Error(label+' unexpectedly read Node clock');};const value=action();r.references??=[];r.references.push({label,draws,clocks,value:clone(value)});return value;}finally{Math.random=random;Date.now=now;}}
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
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'SC_SEGUNDA_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_SEGUNDA_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
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
 const target=list.getByRole('option',index===0?{name:/^Andorra(?:\s+Andorra)?$/}:{name:text,exact:true});await target.waitFor({state:'visible'});assert.equal(await target.count(),1);
 if(r.width<768){await touchReach(p,r,target);await target.tap();}
 else{const wanted=await target.evaluate(n=>[...n.closest('[role="listbox"]').querySelectorAll('[role="option"]')].indexOf(n));assert(wanted>=0);await p.keyboard.press('Home');for(let i=0;i<wanted;i++)await p.keyboard.press('ArrowDown');await p.waitForFunction(n=>n===document.activeElement||n.contains(document.activeElement),await target.elementHandle());await p.keyboard.press('Enter');}
 await idle(p);assert((await trigger.innerText()).includes(text));r.actions.push({type:'real-select',actor:r.actor,index,text});
}
function validateReadonlyReview(before,next){
 assert.deepEqual(next.document,before.document,'SC_SEGUNDA_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Review/help/cancel keeps the entire saved bytes');assert.deepEqual(next.saved.state,before.saved.state);
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_SEGUNDA_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}
async function readonlyAction(p,r,target,label,after){
 await prepareControl(p,r,target);const before={document:await scrollOf(p),saved:await frame(p),focus:await active(p)};
 await pressPrepared(p,r,target,label);await after();await idle(p);
 const next={document:await scrollOf(p),saved:await frame(p),focus:await active(p)};
 validateReadonlyReview(before,next);r.reviewScrollControl??=copiedReviewScrollControl(before,next);
 r.actions.push({type:'read-only-review',label,before,after:next});
}
async function reloadExact(p,r,before,label){
 const expected=noDraw(r,label+' actual page load',()=>{const state=codec.parseSoccerCareerSave(before.raw);assert(codec.isSoccerCareerSave(state));engine.repairCareer(state);moments.settleLoadedMoments(state);return{state,raw:codec.serializeSoccerCareerSave(state)};});
 assert.equal(expected.raw,before.raw,'Warmed load reference is byte-idempotent');
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,expected.raw);assert.deepEqual(actual.state,expected.state);r.actions.push({type:'reload',label,before,expected,actual});return actual;
}
async function declared(p,r,name){
 const f=fixtures[name];await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:f.key,raw:f.raw});
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,f.raw,'Declared fixture exact page load');assert.deepEqual(actual.state,f.expected.before);
 r.actions.push({type:'declared-fixture-boundary',name,input:clone(f.expected),actual});return f;
}
async function reviewAndSign(p,r,club,label,prepared=null){
 const opener=p.getByRole('button',{name:'Review contract with '+club,exact:true}),dialog=p.locator('[data-soccer-offer-review]');
 const before=await frame(p),offer=before.state.pendingOffers.find(o=>o.club.name===club);assert(offer,'Actual saved pending offer exists');
 const review=noDraw(r,label+' actual review helper',()=>offerReview.buildSoccerOfferReview(clone(before.state),clone(offer)));
 await readonlyAction(p,r,opener,label+' open',()=>dialog.waitFor({state:'visible'}));
 assert.equal((await dialog.locator('[data-offer-club]').innerText()).trim(),club);assert.equal(Number(await dialog.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage')),review.signedWage);assert.equal(Number(await dialog.locator('[data-offer-contract-years]').getAttribute('data-offer-contract-years')),review.years);
 assert.equal(await dialog.locator('[data-offer-depth]').getAttribute('data-offer-depth'),review.depth?'available':'unavailable');
 await readonlyAction(p,r,dialog.getByRole('button',{name:'Contract review help',exact:true}),label+' help',()=>dialog.locator('[data-offer-review-help]').waitFor({state:'visible'}));
 await readonlyAction(p,r,dialog.getByRole('button',{name:'Back to review',exact:true}),label+' help back',()=>dialog.locator('[data-offer-signed-wage]').waitFor({state:'visible'}));
 await readonlyAction(p,r,dialog.getByRole('button',{name:'Back',exact:true}),label+' cancel',()=>dialog.waitFor({state:'hidden'}));
 assert(await opener.evaluate(n=>n===document.activeElement),'Review cancel restores actual trigger focus');
 await readonlyAction(p,r,opener,label+' reopen',()=>dialog.waitFor({state:'visible'}));await photo(p,r,label+'-review',dialog);
 const saved=await frame(p);assert.equal(saved.raw,before.raw);
 const expected=noDraw(r,label+' actual acceptance helper',()=>{const state=engine.acceptOffer(clone(saved.state),clone(offer));return{state,raw:codec.serializeSoccerCareerSave(state)};});
 if(prepared){assert.deepEqual(expected.state,prepared.signed);assert.equal(expected.raw,prepared.signedBytes);}
 const sign=dialog.getByRole('button',{name:'Sign contract',exact:true});await prepareControl(p,r,sign);
 const beforeScroll=await scrollOf(p);await pressPrepared(p,r,sign,label+' actual Sign contract');
 await p.waitForFunction(({key,raw})=>localStorage.getItem(key)!==raw,{key:KEY,raw:saved.raw});await p.locator('[data-signed-slip]').waitFor({state:'visible'});await idle(p);
 const actual=await frame(p);assert.equal(actual.raw,expected.raw,'Actual one acceptance writes the entire real-model saved bytes');assert.deepEqual(actual.state,expected.state);
 assert.equal(actual.state.currentClub,club);assert.equal(actual.state.weeklyWage,review.signedWage);assert.equal(actual.state.contractYearsLeft,review.years);assert.deepEqual(actual.state.pendingOffers,[]);
 r.actions.push({type:'sign',label,offer,review,before:saved,expected,actual,beforeScroll,afterScroll:await scrollOf(p),scrollScope:'State changes run the existing phase reveal hook. Landing is recorded; no new exact-scroll signing guard or10px signing-control credit.'});
 await reloadExact(p,r,actual,label);return actual;
}
async function runSoccer(p,r){
 await goto(p,'/soccer-career');await p.getByRole('heading',{name:'Create Your Player',exact:true}).waitFor({state:'visible'});assert.equal(await save(p,KEY),null,'Fresh creation starts without a planted career');
 assert.equal(await p.getByRole('combobox').count(),3);
 await typeInto(p,r,p.getByLabel('Player Name'),'Segunda Native '+r.width,'fictional player name');
 await selectOption(p,r,0,'Andorra');await selectOption(p,r,1,'Central Mid (CM)');
 await press(p,r,p.getByRole('combobox').nth(2),'Inspect retained era choices');assert.equal(await p.getByRole('option',{name:'2025 start',exact:true}).count(),1);await p.keyboard.press('Escape');await idle(p);
 await selectOption(p,r,2,'Current era (2026 start)');
 await press(p,r,p.getByRole('button',{name:/Generate Starting Potential$/}),'Real scout roll');
 await p.getByRole('button',{name:/Customize your build$/}).waitFor({state:'visible'});
 await press(p,r,p.getByRole('button',{name:/Customize your build$/}),'Open actual build editor');
 const overall=p.getByRole('textbox',{name:'Starting overall',exact:true});await overall.waitFor({state:'visible'});await typeInto(p,r,overall,'50','Actual starting overall');
 await press(p,r,p.getByRole('button',{name:/Lock in build$/}),'Lock actual50 build');
 const placement=p.getByText('Academy Placement',{exact:true}).locator('..');await placement.waitFor({state:'visible'});assert((await placement.innerText()).includes('FC Andorra Youth'));assert((await placement.innerText()).includes('Tier 4'));
 r.actions.push({type:'real-academy-preview',text:await placement.innerText(),html:await placement.innerHTML()});await photo(p,r,'creation-placement',placement);
 await press(p,r,p.getByRole('button',{name:/Begin Career$/}),'Actual Begin Career');
 await p.waitForFunction(key=>localStorage.getItem(key)!==null,KEY);await idle(p);const youth=await frame(p);
 assert.equal(youth.state.playerName,'Segunda Native '+r.width);assert.equal(youth.state.nationality,'Andorra');assert.equal(youth.state.era,'2026');assert.equal(youth.state.startingOverall,50);assert.equal(youth.state.overall,50);assert.equal(youth.state.phase,'youth');assert.equal(youth.state.academyClubName,'FC Andorra');assert.equal(youth.state.currentClub,'FC Andorra Youth');assert.equal(youth.state.currentClubCountry,'Andorra');assert.equal(youth.state.currentLeague,'Segunda Division');assert.equal(youth.state.currentClubColor,'#1b458f');assert.equal(youth.state.seasons[0].year,2026);
 await press(p,r,p.locator('[data-career-action-bar]').getByRole('button',{name:'Next Year',exact:true}),'Real youth year');
 await p.getByRole('heading',{name:/Contract Offers$/}).waitFor({state:'visible'});const offers=await frame(p);
 assert.equal(offers.state.phase,'contract_offer');const home=offers.state.pendingOffers.find(o=>o.isHomegrown&&o.club.id==='cm-fc-andorra');assert(home,'The actual youth transition supplies its real parent offer');assert.equal(home.club.country,'Andorra');r.actions.push({type:'real-youth-transition',before:youth,actual:offers,homegrownOffer:home});
 await reviewAndSign(p,r,'FC Andorra','natural-parent');
 const legacy=await declared(p,r,'legacy');await reviewAndSign(p,r,'FC Andorra','original-neutral',legacy.expected);
 const cf=await declared(p,r,'cup');await p.getByRole('heading',{name:'Season Summary',exact:true}).waitFor({state:'visible'});const line=p.locator('[data-cup-exit]');assert.equal((await line.innerText()).trim(),cf.expected.summaryLine);
 let current=await frame(p);assert.deepEqual(cup.readCupRun(current.state.pendingSummary),cf.expected.cupRead);assert.equal(current.state.pendingSummary.cupRun.opening.opp,'FC Andorra');assert.equal(current.state.pendingSummary.cupRun.opening.country,'Andorra');await photo(p,r,'declared-copa',p.getByRole('heading',{name:'Season Summary',exact:true}).locator('..').locator('..'));
 await reloadExact(p,r,current,'declared Copa');await press(p,r,p.getByRole('button',{name:'Continue →',exact:true}),'Actual saved-summary Continue');
 await p.waitForFunction(({key,raw})=>localStorage.getItem(key)!==raw,{key:KEY,raw:current.raw});await idle(p);current=await frame(p);assert.equal(current.raw,cf.expected.continuedBytes);assert.deepEqual(current.state,cf.expected.continued);assert.deepEqual(current.state.seasons.slice(-3,-1),cf.expected.oldRows);r.actions.push({type:'declared-cup-continue',expected:cf.expected,actual:current});await reloadExact(p,r,current,'continued Copa');
 const pf=await declared(p,r,'palette'),seen=[];assert.equal(await p.getByRole('button',{name:/^Review contract with /}).count(),10);
 for(const color of pf.expected.colours){const opener=p.getByRole('button',{name:'Review contract with '+color.name,exact:true});if(r.width<768)await touchReach(p,r,opener);else await keyboardTo(p,r,opener);
  const card=opener.locator('..'),actual=await card.evaluate(n=>{const badge=n.querySelector('div[style]'),b=n.getBoundingClientRect();return{text:n.textContent,color:badge?getComputedStyle(badge).color:null,badgeText:badge?.textContent,box:{x:b.x,right:b.right,width:b.width}};});
  const rgb='rgb('+color.color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';assert.equal(actual.color,rgb);assert(actual.text.includes(color.name));assert(actual.box.x>=-1&&actual.box.right<=r.width+1);seen.push({expected:color,actual});}
 assert.equal((await frame(p)).raw,pf.raw,'Palette inspection is whole-save read-only');r.actions.push({type:'declared-palette',seen,save:await frame(p),scope:'Native reach is to each real action button. Whole-card vertical visibility is not inferred; the complete palette photo is separate visual evidence.'});
 await photo(p,r,'declared-palette',p.getByRole('button',{name:/^Review contract with /}).first().locator('..').locator('..'));assert.equal((await frame(p)).raw,pf.raw);
 return {scope:'Real creation/youth/parent acceptance, then explicitly prepared original-neutral/Copa/palette states. Entire signing and reload references, actual native controls. Browser RNG/clock untouched.',actions:r.actions,references:r.references};
}
const browser=await pw.chromium.launch({headless:true});
try{for(const width of [320,390,1280])await journey('soccer-segunda',width,{},async(p,r)=>{r.observed=await runSoccer(p,r);assert.equal(r.photos.length,5);});}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
for(const[file,digest]of additional)assert.equal(sha(await fs.readFile(dir+'/'+file)),digest,file);assert.equal(sha(await fs.readFile(dir+'/'+m.bundle)),m.bundleSHA);assert.equal(sha(await fs.readFile(dir+'/'+m.preparation.file)),m.preparation.sha256);for(const[name,f]of Object.entries(m.fixtures))assert.equal(sha(await fs.readFile(dir+'/'+f.file)),f.sha256,name);await silent();
report.sourceHeld=true;report.distHeld=true;report.fixtureHeld=true;report.nodeReceiptEmpty=true;report.publicAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));
report.status=report.contexts.length===3&&report.contexts.every(r=>r.status==='passed'&&r.assetBodies.length>0&&r.photos.length===5)&&report.screenshots.length===15&&new Set(report.screenshots).size===15?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('soccerSegundaBrowser:3nativecontexts,realAndorra2026creation50/youth/parent-sign,reload,declaredCopa/legacy/palette,15photosandactualasset/sourceholds passed.');
