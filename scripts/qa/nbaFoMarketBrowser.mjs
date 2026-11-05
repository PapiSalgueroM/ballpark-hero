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
assert(publicMode?origin==='https://douknowball.com':['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Use the source-associated local build or explicitly declared public origin');
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),m=JSON.parse(await fs.readFile(dir+'/manifest.json'));
assert.equal(m.schema,1);assert.deepEqual(m.sourceBefore,m.sourceAfter);
for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
assert.equal(sha(await fs.readFile(dir+'/'+m.bundle)),m.bundleSHA);
const engine=await import(pathToFileURL(dir+'/'+m.bundle).href),fixtures={};
assert.deepEqual(Object.keys(m.fixtures).sort(),['cap','full','gm','opening','plain','released']);
for(const[name,f]of Object.entries(m.fixtures)){const raw=await fs.readFile(dir+'/'+f.file,'utf8');assert.equal(sha(raw),f.sha256);assert.equal(JSON.stringify(f.expected.before),raw);fixtures[name]={...f,raw};}
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(await inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const assetReference=new Map(m.distBefore.filter(row=>row.file.startsWith('assets/')||row.file==='prerender-boot.js').map(row=>[row.file,row])),observedAssets=new Map();
assert(assetReference.has('prerender-boot.js'),'Completed artifact retains the actual boot reference');
const report={status:'incomplete',mode:publicMode?'public':'local',core:m.core,distDigest:m.distDigest,contexts:[],screenshots:[],scope:'Three controlled actual App journeys at320,390,1280. Complete33-player fictional saved pools, native internal scrolling/keyboard, tail signing/reload, provenance and existing guards. Actual clocks/RNG and served source-associated asset bodies, with source/dist holds. Unit qualification owns exact action draws and write counts. No natural-career, provider-availability or full-fleet claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const routes=['/nba-front-office'];
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const tap=async(p,r,l)=>{await l.scrollIntoViewIfNeeded();assert.equal(await l.count(),1,'Unique native control');if(r.width<768)await l.tap();else await l.click();};
const save=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
async function photo(p,r,selector){
 const target=p.locator(selector).first();await target.scrollIntoViewIfNeeded();await idle(p);
 r.geometry=await target.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x,right:b.right,width:b.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
 assert(r.geometry.width>0&&r.geometry.x>=-1&&r.geometry.right<=r.geometry.viewport+1);
 assert(r.geometry.scrollWidth<=r.geometry.clientWidth+1,'No document horizontal overflow');
 const file=r.id+'.png';await p.screenshot({path:out+'/'+file});r.screenshot=file;report.screenshots.push(file);
}
async function goto(p,url){await p.goto(base+url);await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);}
function validateNativeEvidence(actual) {
 assert.deepEqual(actual.requestFailures.filter(row=>!actual.aborts.some(a=>a.url===row.url)),[],'NBA_FO_NATIVE_UNDECLARED_REQUEST_FAILURE');
 assert(actual.assetBodies.some(row=>row.file==='prerender-boot.js'),'NBA_FO_NATIVE_OBSERVED_BOOT_BODY');
}
function checkCopiedActualEvidence(actual) {
 const original=JSON.stringify(actual),beforeSHA256=sha(original),failure=actual.requestFailures.find(row=>actual.aborts.some(a=>a.url===row.url));
 assert(failure,'NBA_FO_NATIVE_DECLARED_FAILURE_CONTROL_ANCHOR');
 const declarationCopy=JSON.parse(original),removedDeclarations=declarationCopy.aborts.map((row,index)=>({row,index})).filter(x=>x.row.url===failure.url);
 assert(removedDeclarations.length>0);declarationCopy.aborts=declarationCopy.aborts.filter(row=>row.url!==failure.url);
 const declarationFault=JSON.stringify(declarationCopy);assert.notEqual(declarationFault,original);
 let declarationError=null;try{validateNativeEvidence(declarationCopy);}catch(e){declarationError=e;}
 assert(declarationError instanceof assert.AssertionError);assert.match(declarationError.message,/^NBA_FO_NATIVE_UNDECLARED_REQUEST_FAILURE/);
 for(const x of removedDeclarations)declarationCopy.aborts.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(declarationCopy),original,'Copied declaration control whole inverse');
 const bootCopy=JSON.parse(original),removedBoot=bootCopy.assetBodies.map((row,index)=>({row,index})).filter(x=>x.row.file==='prerender-boot.js');
 assert(removedBoot.length>0);bootCopy.assetBodies=bootCopy.assetBodies.filter(row=>row.file!=='prerender-boot.js');
 const bootFault=JSON.stringify(bootCopy);assert.notEqual(bootFault,original);
 let bootError=null;try{validateNativeEvidence(bootCopy);}catch(e){bootError=e;}
 assert(bootError instanceof assert.AssertionError);assert.match(bootError.message,/^NBA_FO_NATIVE_OBSERVED_BOOT_BODY/);
 for(const x of removedBoot)bootCopy.assetBodies.splice(x.index,0,x.row);
 assert.equal(JSON.stringify(bootCopy),original,'Copied boot observation control whole inverse');
 assert.equal(JSON.stringify(actual),original,'The actual context report remains byte exact');
 return {actualReportSHA256:beforeSHA256,declaration:{url:failure.url,removed:removedDeclarations.length,faultSHA256:sha(declarationFault),ownedFailure:{name:declarationError.name,message:declarationError.message}},
  boot:{removed:removedBoot.length,actualBodies:removedBoot.map(x=>x.row),faultSHA256:sha(bootFault),ownedFailure:{name:bootError.name,message:bootError.message}},wholeInverseExact:true,actualReportHeld:true,
  scope:'Copied actual context report only. Remove real matching abort declarations or real verified boot observations. Same validator owns both failures; no App outcomes or HTTP bodies are fabricated.'};
}
async function journey(name,width,seeds,action){
 const r={id:name+'-'+width,name,width,status:'incomplete',requests:[],responses:[],aborts:[],requestFailures:[],console:[],pageErrors:[],assetBodies:[],assetErrors:[]},pendingAssets=[],assetDrains=new Map();report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol)||u.origin===origin&&['GET','HEAD'].includes(q.method()))return route.continue();r.aborts.push({url:u.href,origin:u.origin,method:q.method()});return route.abort('blockedbyclient');});
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET'});await socket.close({code:1008,reason:'Source feature QA'});});
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
  await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 }
}

const scrollOf = p => p.evaluate(() => ({ x: scrollX, y: scrollY }));
const rectOf = locator => locator.evaluate(node => {
 const b = node.getBoundingClientRect(), style = getComputedStyle(node);
 return { x:b.x, y:b.y, right:b.right, bottom:b.bottom, width:b.width, height:b.height,
   scrollTop:node.scrollTop, scrollHeight:node.scrollHeight, clientHeight:node.clientHeight,
   overflowY:style.overflowY, maxHeight:style.maxHeight };
});
const sameScroll = (a,b,label) => assert.deepEqual(b,a,label);
const activeId = p => p.evaluate(() => document.activeElement?.closest('[data-fa-row]')?.getAttribute('data-fa-row') ?? null);
const readFrame = async p => {
 const raw=await save(p,'nba-front-office-save-v1');
 assert.equal(typeof raw,'string'); return {raw,frame:JSON.parse(raw)};
};
async function actionPreparation(p, locator) {
 await waitForScrollIdle(p);
 await locator.scrollIntoViewIfNeeded();
 await locator.click({trial:true});
 await idle(p);
}
async function openMarket(p,r) {
 const button=p.getByRole('button',{name:/Free agency/});
 assert.equal(await button.count(),1,'Unique actual Free agency tile');
 await tap(p,r,button);
 await p.locator('[data-fa-row]').first().waitFor({state:'visible'});
 const grid=p.locator('[data-fa-row]').first().locator('xpath=..');
 const box=await rectOf(grid);
 assert(['auto','scroll'].includes(box.overflowY),'Existing market is an internal scroll container');
 assert(Number.parseFloat(box.maxHeight)>0&&box.height<=Number.parseFloat(box.maxHeight)+1,'Existing market height remains capped');
 return {grid,market:grid.locator('xpath=..')};
}
async function nativeScrollTo(p,r,grid,target) {
 await waitForScrollIdle(p); await grid.scrollIntoViewIfNeeded(); await waitForScrollIdle(p);
 const before=await scrollOf(p), samples=[],session=r.width<768?await p.context().newCDPSession(p):null;
 try {
  for(let attempt=0;attempt<20;attempt++) {
   const g=await rectOf(grid),t=await rectOf(target);
   if(t.y>=g.y-1&&t.bottom<=g.bottom+1)break;
   const delta=Math.min(140,Math.max(20,t.bottom-g.bottom+8));
   if(session) {
    const x=g.x+g.width*.4,start=g.bottom-24,end=Math.max(g.y+24,start-delta);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
    for(let step=1;step<=10;step++) {
     await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});
     await p.waitForTimeout(25);
    }
    await p.waitForTimeout(120);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   } else {
    await p.mouse.move(g.x+g.width*.4,g.y+g.height*.5);
    await p.mouse.wheel(0,delta);
   }
   await idle(p); await waitForScrollIdle(p);
   const after=await scrollOf(p);sameScroll(before,after,'NBA_FO_NATIVE_INTERNAL_SCROLL_DOCUMENT');
   samples.push({attempt,document:after,grid:await rectOf(grid)});
  }
 } finally { if(session)await session.detach(); }
 const g=await rectOf(grid),t=await rectOf(target);
 assert(t.y>=g.y-1&&t.bottom<=g.bottom+1,'NBA_FO_NATIVE_TAIL_PAINTED_INSIDE_GRID');
 assert(g.scrollTop>0,'Actual native scrolling reaches beyond the initial market view');
 return {input:r.width<768?'trusted CDP touch gesture':'trusted wheel',before,after:await scrollOf(p),samples,grid:g,target:t};
}
async function keyboardToTail(p,r,grid,ids) {
 const events=[];
 for(let attempt=0;attempt<90&&await activeId(p)!==ids[0];attempt++) {
  await p.keyboard.press('Tab'); events.push('Tab');
 }
 assert.equal(await activeId(p),ids[0],'NBA_FO_NATIVE_KEYBOARD_REACHES_FIRST_SIGN');
 await grid.scrollIntoViewIfNeeded(); await waitForScrollIdle(p); const before=await scrollOf(p);
 for(let i=1;i<ids.length;i++) {
  await p.keyboard.press('Tab');events.push('Tab');
  assert.equal(await activeId(p),ids[i],'Native Tab follows the actual sorted market rows');
  sameScroll(before,await scrollOf(p),'NBA_FO_NATIVE_KEYBOARD_INTERNAL_SCROLL');
 }
 const last=p.locator('[data-fa-row="'+ids.at(-1)+'"]');
 const readTail=async()=>({grid:await rectOf(grid),target:await rectOf(last),document:await scrollOf(p),focus:await activeId(p),saved:await readFrame(p)});
 const beforeEnd=await readTail();let g=beforeEnd.grid,t=beforeEnd.target;
 const endTrace={attempted:false,needed:t.bottom>g.bottom+1,beforeKey:beforeEnd};r.keyboardTailEnd=endTrace;
 if(endTrace.needed) {
  endTrace.attempted=true;await p.keyboard.press('End');events.push('End');
  endTrace.afterKey=await readTail();
  await idle(p);await waitForScrollIdle(p);endTrace.afterReady=await readTail();
  for(const state of [endTrace.afterKey,endTrace.afterReady]) {
   sameScroll(beforeEnd.document,state.document,'NBA_FO_NATIVE_KEYBOARD_END_DOCUMENT_SCROLL');
   assert.equal(state.focus,ids.at(-1),'NBA_FO_NATIVE_KEYBOARD_END_TAIL_FOCUS');
   assert.equal(state.saved.raw,beforeEnd.saved.raw,'NBA_FO_NATIVE_KEYBOARD_END_FULL_SAVE_HELD');
   assert.deepEqual(state.saved.frame,beforeEnd.saved.frame);
  }
  assert(endTrace.afterReady.grid.scrollTop>beforeEnd.grid.scrollTop,'NBA_FO_NATIVE_KEYBOARD_END_INTERNAL_PROGRESS');
  sameScroll(before,endTrace.afterReady.document,'NBA_FO_NATIVE_KEYBOARD_INTERNAL_SCROLL');
  g=endTrace.afterReady.grid;t=endTrace.afterReady.target;
 }
 assert(t.y>=g.y-1&&t.bottom<=g.bottom+1,'Keyboard brings the actual tail row into its internal viewport');
 return {events,before,after:await scrollOf(p),grid:g,target:t,end:endTrace};
}
async function runMarket(p,r) {
 const observed={width:r.width,transitions:[],scope:'33 fictional complete NBA free agents. Real nbaSign and optional nbaNoteArrivals supply full saved-frame references. Actual touch/keyboard input and unmodified browser clock/RNG. Unit outcomes own writes and exact RNG tapes; this is not a naturally reached career.'};
 const loadFixture=async name=>{
  const f=fixtures[name];assert(f,'Declared NBA fixture '+name);
  if(observed.transitions.length) {
   await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:f.key,raw:f.raw});
  }
  await goto(p,f.expected.path);
  assert.equal((await readFrame(p)).raw,f.raw,'NBA_FO_NATIVE_COLD_LOAD_FULL_SAVE');
  const ui=await openMarket(p,r);
  const ids=await p.locator('[data-fa-row]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-fa-row')));
  assert.deepEqual(ids,f.expected.ids,'NBA_FO_NATIVE_COMPLETE_SORTED_POOL');
  assert.deepEqual(ids.slice(0,20),f.expected.first20,'NBA_FO_NATIVE_ORIGINAL_FIRST_TWENTY');
  assert.equal((await readFrame(p)).raw,f.raw,'NBA_FO_NATIVE_OPEN_READ_ONLY');
  observed.transitions.push({action:'fixture-load',name,input:f.expected.before,inputBytes:f.raw,ids,grid:await rectOf(ui.grid)});
  return {f,...ui};
 };
 const opening=await loadFixture('opening'),final=p.locator('[data-fa-row="'+opening.f.expected.last+'"]'),evidence=opening.f.expected.evidence;
 assert(evidence&&evidence.id===opening.f.expected.last);
 assert.equal(await final.locator('[data-rating-partial]').count(),1,'NBA_FO_NATIVE_TAIL_OPENING_MARK');
 assert.equal(await final.locator('[data-rating-evidence]').innerText(),evidence.note,'NBA_FO_NATIVE_ACTUAL_TAIL_EVIDENCE');
 assert.match(await final.locator('b').innerText(),/^66\s*e$/,'Current66 remains distinct from opening79');
 const evidenceIds=await p.locator('[data-fa-row]').evaluateAll(nodes=>nodes.filter(node=>node.querySelector('[data-rating-evidence]')).map(node=>node.getAttribute('data-fa-row')));
 const markerIds=await p.locator('[data-fa-row]').evaluateAll(nodes=>nodes.filter(node=>node.querySelector('[data-rating-partial]')).map(node=>node.getAttribute('data-fa-row')));
 assert.deepEqual(evidenceIds,[evidence.id]);assert.deepEqual(markerIds,[evidence.id]);
 await opening.grid.scrollIntoViewIfNeeded();await waitForScrollIdle(p);
 if(r.width===1280) observed.keyboard=await keyboardToTail(p,r,opening.grid,opening.f.expected.ids);
 else observed.touch=await nativeScrollTo(p,r,opening.grid,final);
 assert.equal((await readFrame(p)).raw,opening.f.raw,'NBA_FO_NATIVE_BROWSING_FULL_SAVE_HOLD');
 await photo(p,r,'[data-fa-row="'+opening.f.expected.last+'"]');
 observed.transitions.push({action:'opening-provenance',fullSaveHeld:true,tailId:evidence.id,note:await final.locator('[data-rating-evidence]').innerText(),evidenceIds,markerIds});
 for(const name of ['plain','gm']) {
  const {f,grid}=await loadFixture(name);
  const target=p.locator('[data-fa-row="'+f.expected.tail+'"]'),sign=target.getByRole('button',{name:'Sign',exact:true});
  assert.equal(await sign.isEnabled(),true);assert.equal(f.expected.accepted,true);
  await nativeScrollTo(p,r,grid,target);
  if(r.width===1280) {
   // Real Tab finds the actual enabled Sign control without setting application focus.
   for(let i=0;i<90&&await activeId(p)!==f.expected.tail;i++)await p.keyboard.press('Tab');
   assert.equal(await activeId(p),f.expected.tail,'NBA_FO_NATIVE_KEYBOARD_SIGN_TARGET');
  } else await actionPreparation(p,sign);
  await waitForScrollIdle(p);await idle(p);const beforeSign=await scrollOf(p);
  assert.equal((await readFrame(p)).raw,f.raw);
  if(r.width===1280)await p.keyboard.press('Enter');else await sign.tap();
  await p.waitForFunction(({key,id,team})=>{
   const raw=localStorage.getItem(key);if(!raw)return false;
   return JSON.parse(raw).league.teams[team].players.some(player=>player.id===id);
  },{key:f.key,id:f.expected.tail,team:f.expected.team});
  await idle(p);
  const signed=await readFrame(p),afterSign=await scrollOf(p);
  assert.deepEqual(signed.frame,f.expected.signed,'NBA_FO_NATIVE_COMPLETE_SIGNED_FRAME');
  assert.equal(signed.raw,f.expected.signedBytes,'NBA_FO_NATIVE_EXACT_SIGNED_BYTES');
  sameScroll(beforeSign,afterSign,'NBA_FO_NATIVE_SIGN_DOCUMENT_SCROLL');
  assert.deepEqual(signed.frame.league.teams[f.expected.team].rotation,f.expected.rotation,'NBA_FO_NATIVE_PREFERRED_ROTATION_HELD');
  const arrival=f.expected.gmOn?engine.arrivals.nbaContractsOf(signed.frame.gm,signed.frame.league,f.expected.team).men[f.expected.tail]:null;
  if(f.expected.gmOn)assert.deepEqual(arrival,{since:2026,how:'signing',mid:true},'NBA_FO_NATIVE_ACTUAL_ARRIVAL_LEDGER');
  else assert.equal(Object.prototype.hasOwnProperty.call(signed.frame,'gm'),false);
  assert.equal(await target.count(),0);
  observed.transitions.push({action:'sign-tail',name,id:f.expected.tail,gmOn:f.expected.gmOn,arrival,beforeScroll:beforeSign,afterScroll:afterSign,
   actual:signed.frame,actualBytes:signed.raw,expected:f.expected.signed,expectedBytes:f.expected.signedBytes});
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);
  assert.equal((await readFrame(p)).raw,signed.raw,'NBA_FO_NATIVE_RELOAD_EXACT_SIGNED_BYTES');
  const reloaded=await openMarket(p,r);
  const remaining=await p.locator('[data-fa-row]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-fa-row')));
  assert.deepEqual(remaining,f.expected.ids.filter(id=>id!==f.expected.tail),'NBA_FO_NATIVE_RELOADED_SORTED_POOL');
  assert.equal(await target.count(),0);
  observed.transitions.push({action:'reload',name,fullSavedFrameHeld:true,actual:(await readFrame(p)).frame,actualBytes:(await readFrame(p)).raw,ids:remaining,grid:await rectOf(reloaded.grid)});
 }
 for(const name of ['cap','full','released']) {
  const guard=await loadFixture(name),target=p.locator('[data-fa-row="'+guard.f.expected.tail+'"]'),button=target.getByRole('button',{name:'Sign',exact:true});
  assert.equal(guard.f.expected.accepted,false);
  assert.equal(await button.isDisabled(),true,'NBA_FO_NATIVE_EXISTING_TAIL_'+name.toUpperCase()+'_GUARD');
  let reason=null;
  if(name==='full'){reason=await guard.market.locator('[data-sign-block]').innerText();assert.equal(reason,'Roster full at 15. Cut or trade someone first.');}
  if(name==='released'){reason=await button.getAttribute('title');assert.equal(reason,'You waived him this season. He can come back after the offseason.');}
  await nativeScrollTo(p,r,guard.grid,target);await waitForScrollIdle(p);await idle(p);
  const b=await button.boundingBox();assert(b&&b.width>0&&b.height>0);
  const hit=await button.evaluate(node=>{const b=node.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===node;});
  assert(hit,'Actual disabled NBA guard is painted at its native pointer target');
  const before=await scrollOf(p);
  if(r.width<768)await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await p.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await idle(p);const after=await scrollOf(p);sameScroll(before,after,'NBA_FO_NATIVE_DISABLED_GUARD_DOCUMENT_SCROLL');
  const held=await readFrame(p);assert.equal(held.raw,guard.f.raw,'NBA_FO_NATIVE_'+name.toUpperCase()+'_PRESERVES_COMPLETE_SAVE');
  assert.deepEqual(held.frame,guard.f.expected.signed,'Refused actual NBA model reference equals the held whole frame');
  observed.transitions.push({action:'tail-guard',name,id:guard.f.expected.tail,disabled:true,reason,beforeScroll:before,afterScroll:after,raw:held.raw,frame:held.frame});
 }
 return observed;
}
const browser=await pw.chromium.launch({headless:true});
try {
 for(const width of [320,390,1280])await journey('nba-front-office-full-market',width,
  {[fixtures.opening.key]:fixtures.opening.raw},async(p,r)=>{r.observed=await runMarket(p,r);assert(r.screenshot);});
} finally {await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);
for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
for(const[name,f]of Object.entries(m.fixtures))assert.equal(sha(await fs.readFile(dir+'/'+f.file)),f.sha256,name);
report.sourceHeld=true;report.distHeld=true;
report.publicAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));
report.status=report.contexts.length===3&&report.contexts.every(r=>r.status==='passed'&&r.assetBodies.length>0)
 &&report.screenshots.length===3&&new Set(report.screenshots).size===3?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.status,'passed');
console.log('nbaFoMarketBrowser: three native NBA33-player market journeys, GM-off/on tail31 sign/reload, tail guards, actual asset bodies and three normal screenshots passed.');
