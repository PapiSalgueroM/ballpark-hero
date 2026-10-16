/* Remote native pending-history validation with explicitly fictional transport.
 * Actual page, autocomplete, hook and position rules run. No game state injection.
 */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=process.env.XI_PENDING_OUT, BASE=process.env.XI_PENDING_BASE;
const HOOK_REF=process.env.XI_PENDING_HOOK_SOURCE_REF, PUBLISHED='1823478805186fcd037d5f6b3145513a273aa4fb';
assert(OUT && path.isAbsolute(OUT),'Absolute XI_PENDING_OUT required');
assert(BASE && /^http:\/\/127\.0\.0\.1:\d+$/.test(BASE),'Explicit loopback XI_PENDING_BASE required');
assert(HOOK_REF && /^[a-f0-9]{40}$/.test(HOOK_REF),'Explicit full committed XI_PENDING_HOOK_SOURCE_REF required');
const DIST=path.resolve(process.env.XI_PENDING_DIST || path.join(ROOT,'dist'));
const HOOK='src/hooks/useLineupBuilder.ts', SELF='scripts/qa/playXiPendingHistory.mjs';
const SOURCE=['src/pages/LineupBuilder.tsx',HOOK,'src/components/lineup/FormationPitch.tsx','src/components/lineup/TeamSpinner.tsx',
 'src/components/game/PlayerAutocomplete.tsx','src/lib/playerSearch.ts','src/data/lineupTeams.ts','src/types/lineupBuilder.ts','src/lib/positionFit.ts'];
const QUERY='Fixture Harbor', FIRST='Fixture Harbor Defender', SECOND='Fixture Harbor Striker';
const ROWS=[
 {player_name:FIRST,name_folded:FIRST.toLowerCase(),club:'Real Madrid',nationality:'Fixture Nation',position:'Centre-Back',market_value_usd:1400000,age:27,year:2026},
 {player_name:SECOND,name_folded:SECOND.toLowerCase(),club:'Real Madrid',nationality:'Fixture Nation',position:'Centre-Forward',market_value_usd:1300000,age:27,year:2026},
];
const VALID=[{primary_position:'Centre-Back',secondary_positions:['ST']}];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024});
const normalize=value=>value.replaceAll('\r\n','\n');
const write=(name,value)=>{
 const target=path.join(OUT,name);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');
};
function inventory(dir,root=dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);return entry.isDirectory()?inventory(full,root):[{file:path.relative(root,full).replaceAll('\\','/'),bytes:fs.statSync(full).size,sha256:sha(fs.readFileSync(full))}];
 }).sort((a,b)=>a.file.localeCompare(b.file));
}
async function bounded(promise,label,ms=15000){
 let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' exceeded '+ms+'ms')),ms);})]);}
 finally{clearTimeout(timer);}
}
assert(!fs.existsSync(path.join(OUT,'report.json')),'Never overwrite evidence');fs.mkdirSync(OUT,{recursive:true});
assert.equal(git(['rev-parse','--verify',HOOK_REF+'^{commit}']).trim(),HOOK_REF,'Actual committed hook reference');
git(['merge-base','--is-ancestor',HOOK_REF,'HEAD']);
const report={status:'running',head:git(['rev-parse','HEAD']).trim(),publishedApp:PUBLISHED,actualHookSourceRef:HOOK_REF,base:BASE,
 method:{file:SELF,sha256:sha(fs.readFileSync(path.join(ROOT,SELF)))},sources:[],fonts:[],cases:[],sourceHeld:false,distHeld:false,fontsHeld:false,qualified:false,
 limits:[
  'Six fresh built-page journeys with fictional search/history responses. Real page, autocomplete, hook and position rules run; no game state or handler is injected.',
  'Math.random returns0.5 and every observed draw is retained. This prepares the actual constructor; painted Real Madrid is required. No natural assignment or distribution claim.',
  'Existing rules/cookie acknowledgement keys and two storage sentinels are prepared. The actual game has no lineup save; complete DOM projection and observed storage are retained.',
  'Headless WebKit touch is not physical Safari, CriOS, an iPad or its operating-system keyboard. Typing uses native Playwright keyboard input after a native tap.',
  'No drag/cancel control is run here. No forced click, DOM click, synthetic dispatch or private React state access is used.',
  'The held history response is released after the immediate DOM observation, before screenshots, within its declared2.5s method hold and the actual4s app timeout.',
  'All external requests are intercepted. Declared cached fonts retain their physical bytes; unrelated external assets/analytics are blocked and have no appearance credit.',
  'This is fixed pending-input/refusal retry validation, not a natural-frequency, database, season, full-XI, live-site or whole-suite qualification.',
 ]};
const flush=()=>write('report.json',report);
const sourceBefore=new Map(SOURCE.map(file=>[file,fs.readFileSync(path.join(ROOT,file))]));
for(const [file,bytes] of sourceBefore){
 const ref=file===HOOK?HOOK_REF:PUBLISHED;
 assert.equal(normalize(bytes.toString('utf8')),normalize(git(['show',ref+':'+file])),'Exact committed picker source: '+file);
 write('source/'+file,bytes);report.sources.push({file,ref,bytes:bytes.length,sha256:sha(bytes),gitBlob:git(['rev-parse',ref+':'+file]).trim()});
}
write('fictional-transport.json',{declaration:'Test-only invented players, no real-player claim or product data write.',search:ROWS,validHistory:VALID,refusedHistory:[]});
const distBefore=inventory(DIST);write('dist.before.json',distBefore);
const cache=process.env.SAFARI_REPORT_FONT_CACHE;assert(cache&&path.isAbsolute(cache),'Absolute retained SAFARI_REPORT_FONT_CACHE required');
const fontManifest=fs.readFileSync(path.join(cache,'manifest.json'));
const fonts=new Map(JSON.parse(fontManifest).map(row=>{
 assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(row.url).origin),'Declared font origin');
 assert(/^[a-f0-9]{64}$/.test(row.file),'Owned font hash filename');
 const body=fs.readFileSync(path.join(cache,row.file));assert.equal(sha(body),row.sha256);
 write('fonts/'+row.file,body);report.fonts.push({...row,bytes:body.length});return[row.url,{body,contentType:row.contentType}];
}));
write('font-manifest.json',fontManifest);flush();
const documentPath=fs.existsSync(path.join(DIST,'build-your-xi/index.html'))?path.join(DIST,'build-your-xi/index.html'):path.join(DIST,'index.html');
const served=await bounded(fetch(BASE+'/build-your-xi'),'served document headers');
assert.equal(served.status,200);
const documentBytes=Buffer.from(await bounded(served.arrayBuffer(),'served document body'));
assert.deepEqual(documentBytes,fs.readFileSync(documentPath),'Actual loopback document must equal emitted dist');
write('served-document.html',documentBytes);report.document={file:path.relative(DIST,documentPath),sha256:sha(documentBytes)};flush();

function observer(){
 const events=[],draws=[];window.__xiPending={events,draws};
 Math.random=()=>{draws.push({at:performance.now(),value:0.5});return 0.5;};
 localStorage.setItem('lineup-rules-seen','1');localStorage.setItem('cookie-consent','essential');
 localStorage.setItem('xi-pending-sentinel','local-held');sessionStorage.setItem('xi-pending-sentinel','session-held');
 for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend','touchcancel','click','focus','blur','input','keydown','scroll','resize']){
  document.addEventListener(type,event=>{
   if(events.length>=2000){window.__xiPending.eventOverflow=true;return;}
   const element=event.target instanceof Element?event.target:null,control=element?.closest('[role="option"],button,input');
   const item={type,at:performance.now(),trusted:event.isTrusted,pointerType:event.pointerType,key:event.key,
    target:element&&{tag:element.tagName,role:element.getAttribute('role'),text:element.textContent?.trim().slice(0,160)},
    control:control&&{tag:control.tagName,role:control.getAttribute('role'),text:control.textContent?.trim().slice(0,160)},
    scroll:[scrollX,scrollY],viewport:visualViewport&&{width:visualViewport.width,height:visualViewport.height,offsetTop:visualViewport.offsetTop,scale:visualViewport.scale}};
   events.push(item);
  },{capture:true,passive:true});
 }
}
async function snapshot(page){
 return bounded(page.evaluate(()=>{
  const box=element=>{if(!element)return null;const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  const keeper=[...document.querySelectorAll('button')].find(button=>button.firstElementChild?.tagName==='SPAN'&&button.firstElementChild.textContent.trim()==='GK');
  const pitch=keeper?.parentElement,input=document.querySelector('input[role="combobox"]');
  const store=storage=>Object.fromEntries(Array.from({length:storage.length},(_,index)=>{const key=storage.key(index);return[key,storage.getItem(key)];}).sort((a,b)=>a[0].localeCompare(b[0])));
  return{url:location.href,inner:[innerWidth,innerHeight],dpr:devicePixelRatio,scroll:[scrollX,scrollY],
   viewport:visualViewport&&{width:visualViewport.width,height:visualViewport.height,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop,scale:visualViewport.scale},
   active:document.activeElement?.outerHTML,input:input&&{value:input.value,disabled:input.disabled,box:box(input)},
   busyIndicators:document.querySelectorAll('svg.animate-spin').length,
   progress:[...document.querySelectorAll('span')].map(element=>element.textContent.trim()).filter(text=>/^\d+\/11$/.test(text)),
   pitch:pitch&&{html:pitch.outerHTML,box:box(pitch),slots:[...pitch.querySelectorAll('button')].map(button=>({label:button.firstElementChild?.textContent.trim(),player:button.children[1]?.textContent.trim()||null,disabled:button.disabled,box:box(button)}))},
   errors:[...document.querySelectorAll('.text-destructive')].map(element=>element.textContent.trim()).filter(Boolean),
   stores:{local:store(localStorage),session:store(sessionStorage)},observed:window.__xiPending};
 }),'actual DOM observation',5000);
}
async function tap(page,locator,row,label){
 await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();
 const target=await bounded(locator.evaluate(element=>{
  const r=element.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
  return{x,y,text:element.textContent.trim(),hit:!!hit&&(hit===element||element.contains(hit)),rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
 }),'native target geometry');
 row.inputs.push({label,method:'Playwright Touchscreen.tap',...target});write(row.id+'.json',row);assert(target.hit,'Native target hit-test: '+label);
 await bounded(page.touchscreen.tap(target.x,target.y),'native tap '+label);
}
async function capture(page,row,label){
 const file=row.id+'-'+label+'.png',before=await snapshot(page);
 await page.screenshot({path:path.join(OUT,file),fullPage:false,timeout:15000});
 const bytes=fs.readFileSync(path.join(OUT,file)),after=await snapshot(page);
 row.captures.push({file,sha256:sha(bytes),pixels:[bytes.readUInt32BE(16),bytes.readUInt32BE(20)],before,after});write(row.id+'.json',row);
 assert.equal(bytes.readUInt32BE(16),row.profile.width*2);assert.equal(bytes.readUInt32BE(20),row.profile.height*2);
}
const profiles=[
 {id:'webkit-tablet',engine:'webkit',width:1180,height:768},
 {id:'webkit-phone',engine:'webkit',width:390,height:844},
 {id:'chromium-tablet',engine:'chromium',width:1180,height:768},
];
const browsers=new Map();
try{
 for(const profile of profiles)for(const outcome of ['valid','refused']){
  const row={id:profile.id+'-'+outcome,profile,outcome,stage:'opening',setupComplete:false,qualified:false,inputs:[],transport:[],responses:[],requestFailures:[],console:[],errors:[],routeErrors:[],captures:[]};
  let context,page,releaseHistory,historyReceipt;
  let historySeenResolve;const historySeen=new Promise(resolve=>{historySeenResolve=resolve;});
  let releaseResolve;const release=new Promise(resolve=>{releaseResolve=resolve;});
  report.cases.push({id:row.id,file:row.id+'.json',qualified:false});flush();
  try{
   if(!browsers.has(profile.engine))browsers.set(profile.engine,await bounded(pw[profile.engine].launch({headless:true}),profile.engine+' launch',30000));
   context=await bounded(browsers.get(profile.engine).newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:'reduce'}),'new touch context');
   const work=async()=>{
    await bounded(context.addInitScript(observer),'install observer');
    const fulfill=(route,body,status=200)=>bounded(route.fulfill({status,contentType:'application/json',body:status===204?'':JSON.stringify(body),
     headers:{'access-control-allow-origin':'*','access-control-allow-headers':route.request().headers()['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,accept-profile,prefer','access-control-allow-methods':'GET,OPTIONS'}}),'fixture fulfillment',5000);
    await bounded(context.route('**/*',async route=>{
     try{
      const request=route.request(),url=new URL(request.url()),receipt={url:url.href,method:request.method(),resource:request.resourceType(),at:Date.now()};
      row.transport.push(receipt);
      if(url.origin===BASE){receipt.action='actual-dist';return await bounded(route.continue(),'actual dist route',5000);}
      if(fonts.has(url.href)){receipt.action='retained-font';return await bounded(route.fulfill({status:200,...fonts.get(url.href),headers:{'access-control-allow-origin':'*'}}),'cached font route',5000);}
      if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/player_market_values'){
       receipt.action='fictional-search';receipt.leg=url.searchParams.has('name_folded')?'name':'prominence';
       if(request.method()==='OPTIONS')return await fulfill(route,null,204);
       receipt.query=receipt.leg==='name'?(url.searchParams.get('name_folded')||'').replace(/^ilike\.%/,'').replace(/%$/,''):null;
       assert(request.method()==='GET'&&(url.searchParams.get('club')||'').includes('Real Madrid'),'Actual scoped Madrid search');
       assert(receipt.leg!=='name'||(receipt.query.length>=3&&QUERY.toLowerCase().startsWith(receipt.query)),'Actual typed query');
       return await fulfill(route,ROWS);
      }
      if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/player_verified_positions'){
       receipt.action='held-fictional-history';
       if(request.method()==='OPTIONS')return await fulfill(route,null,204);
       assert(request.method()==='GET');assert.equal(url.searchParams.get('player_name'),'ilike.'+FIRST);
       assert.equal(url.searchParams.get('select'),'primary_position,secondary_positions');assert.equal(url.searchParams.get('limit'),'1');
       assert(!historyReceipt,'Exactly one actual curated read per journey');historyReceipt=receipt;receipt.held=true;
       releaseHistory=()=>{assert(!receipt.releaseRequested,'One controlled release');receipt.releaseRequested=Date.now();releaseResolve();};
       historySeenResolve();write(row.id+'.json',row);
       await bounded(release,'pending history hold',2500);receipt.heldForMs=Date.now()-receipt.at;
       assert(receipt.heldForMs<3500,'Response released before actual4s app history deadline');
       receipt.responseBody=outcome==='valid'?VALID:[];await fulfill(route,receipt.responseBody);receipt.fulfilledAt=Date.now();return;
      }
      if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(request.method())){receipt.action='blocked-unrelated-live-scores';return await bounded(route.abort(),'unrelated live scores route',5000);}
      if(url.hostname.endsWith('.supabase.co'))throw new Error('Unexpected live API path '+url.pathname);
      receipt.action='blocked-external';await bounded(route.abort(),'unrelated external route',5000);
     }catch(error){row.routeErrors.push({url:route.request().url(),error:String(error)});write(row.id+'.json',row);try{await bounded(route.abort(),'failed route cleanup',2000);}catch(cleanupError){row.routeErrors.push({cleanupError:String(cleanupError)});}}
    }),'install declared routes');
    await bounded(context.routeWebSocket('**/*',socket=>socket.close()),'close external sockets');
    page=await bounded(context.newPage(),'new page');page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(30000);
    page.on('pageerror',error=>row.errors.push({message:error.message,stack:error.stack}));
    page.on('console',message=>row.console.push({type:message.type(),text:message.text()}));
    page.on('response',response=>row.responses.push({url:response.url(),status:response.status(),resource:response.request().resourceType()}));
    page.on('requestfailed',request=>row.requestFailures.push({url:request.url(),resource:request.resourceType(),error:request.failure()?.errorText}));
    await page.goto(BASE+'/build-your-xi',{waitUntil:'domcontentloaded'});
    const formation=page.getByRole('button',{name:/^4-4-2\s*11 players$/});
    await formation.waitFor({state:'visible'});row.browser={version:browsers.get(profile.engine).version(),userAgent:await bounded(page.evaluate(()=>navigator.userAgent),'actual browser UA')};
    await tap(page,formation,row,'actual4-4-2');
    await page.getByText('Real Madrid',{exact:true}).waitFor({state:'visible'});
    await page.getByText('0/11',{exact:true}).waitFor({state:'visible'});
    await tap(page,page.getByRole('button',{name:'ST',exact:true}).first(),row,'actual first ST');
    const input=page.getByRole('combobox');await tap(page,input,row,'actual search input');await bounded(page.keyboard.type(QUERY,{delay:15}),'native first query');
    const first=page.getByRole('option').filter({hasText:FIRST});await first.waitFor({state:'visible'});
    await bounded(page.evaluate(()=>document.fonts.ready.then(()=>null)),'cached fonts');
    row.before=await snapshot(page);assert.equal(row.before.pitch.slots.length,11);assert.equal(row.before.pitch.slots[9].label,'ST');
    assert(row.transport.some(item=>item.action==='fictional-search'&&item.method==='GET'&&item.leg==='name'&&item.query===QUERY.toLowerCase()));
    assert(row.transport.some(item=>item.action==='fictional-search'&&item.method==='GET'&&item.leg==='prominence'));
    await capture(page,row,'options');row.setupComplete=true;row.stage='holding-history';
    await tap(page,first,row,'actual fictional CB into ST');
    await bounded(historySeen,'actual curated request',1500);
    try{
     await page.waitForFunction(()=>document.querySelector('input[role="combobox"]')?.disabled===true,null,{timeout:1000});
     row.held=await snapshot(page);write(row.id+'.json',row);
     assert(historyReceipt.held&&!historyReceipt.releaseRequested&&!historyReceipt.fulfilledAt,'Observation precedes fixture response');
     assert.equal(row.held.input.disabled,true);assert(row.held.busyIndicators>0,'Actual painted busy indicator');
     assert.deepEqual(row.held.progress,['0/11']);assert.equal(row.held.pitch.slots.filter(slot=>slot.disabled).length,0);
    }finally{if(releaseHistory&&!historyReceipt.releaseRequested)releaseHistory();}
    row.stage='history-released';
    if(outcome==='refused'){
     await page.waitForFunction(()=>document.querySelector('input[role="combobox"]')?.disabled===false&&[...document.querySelectorAll('.text-destructive')].some(element=>element.textContent.includes('slot needs')),null,{timeout:10000});
     row.refused=await snapshot(page);write(row.id+'.json',row);
     assert.deepEqual(row.refused.progress,['0/11']);assert.equal(row.refused.input.disabled,false);assert.equal(row.refused.busyIndicators,0);
     assert.equal(row.refused.input.value,'');assert.equal(row.refused.pitch.slots.filter(slot=>slot.disabled).length,0);assert(row.refused.errors.some(text=>text.includes('slot needs')));
     await capture(page,row,'refused');
     await tap(page,input,row,'enabled refusal retry input');await bounded(page.keyboard.type(QUERY,{delay:15}),'native retry query');
     const second=page.getByRole('option').filter({hasText:SECOND});await second.waitFor({state:'visible'});
     await tap(page,second,row,'actual primary-ST retry');
    }
    await page.getByText('1/11',{exact:true}).waitFor({state:'visible'});
    row.accepted=await snapshot(page);write(row.id+'.json',row);
    const expected=outcome==='valid'?FIRST:SECOND;
    assert.deepEqual(row.accepted.progress,['1/11']);assert.equal(row.accepted.pitch.slots.filter(slot=>slot.disabled).length,1);
    assert.equal(row.accepted.pitch.slots[9].player,expected);assert.equal(row.accepted.pitch.slots[9].disabled,true);
    await page.getByText('Select a position on the pitch',{exact:false}).waitFor({state:'visible'});
    await tap(page,page.getByRole('button',{name:'GK',exact:true}),row,'actual next-slot GK');
    await input.waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('input[role="combobox"]')?.disabled===false);
    row.after=await snapshot(page);write(row.id+'.json',row);
    assert.deepEqual(row.after.progress,['1/11']);assert.equal(row.after.pitch.slots[9].player,expected);assert.equal(row.after.input.disabled,false);assert.equal(row.after.busyIndicators,0);
    assert(!row.after.errors.length,'Refusal feedback clears on actual next-slot selection');
    assert(row.after.observed.events.some(event=>event.trusted&&event.type==='click'&&event.control?.role==='option'&&event.control.text.includes(FIRST)),'Native first option click observed');
    if(outcome==='refused')assert(row.after.observed.events.some(event=>event.trusted&&event.type==='click'&&event.control?.role==='option'&&event.control.text.includes(SECOND)),'Native retry option click observed');
    assert(!row.after.observed.eventOverflow,'Complete native event trace');
    for(const name of ['held','refused','accepted','after'])if(row[name])assert.deepEqual(row[name].stores,row.before.stores,'Actual saved bytes held at '+name);
    assert(row.after.observed.draws.every(draw=>draw.value===0.5));
    assert.equal(row.transport.filter(item=>item.action==='held-fictional-history'&&item.method==='GET').length,1);
    assert(historyReceipt.fulfilledAt&&historyReceipt.releaseRequested,'Actual declared response finished');
    assert(historyReceipt.fulfilledAt-historyReceipt.at<3500,'Declared history response precedes4s timeout fallback');
    assert(row.responses.some(item=>item.url===historyReceipt.url&&item.status===200),'Actual curated HTTP200 observed');
    assert(!row.requestFailures.some(item=>item.url===historyReceipt.url),'Curated request must not be aborted or fail');
    assert(!row.transport.some(item=>item.url.includes('/functions/v1/validate-player')),'Declared club/history routes require no AI');
    assert.equal(row.errors.length,0);assert.equal(row.routeErrors.length,0);
    assert(!row.transport.some(item=>item.action==='blocked-external'&&/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(item.url)),'All font requests declared');
    await capture(page,row,'complete');write(row.id+'-body.html',await bounded(page.content(),'actual final body'));
    assert(!row.responses.some(item=>new URL(item.url).origin===BASE&&item.status>=400),'No failed actual emitted responses');
    assert(!row.requestFailures.some(item=>new URL(item.url).origin===BASE),'No failed actual emitted requests');
    row.stage='complete';row.qualified=true;
   };
   await bounded(work(),row.id+' complete journey',90000);row.completeInBudget=true;
  }catch(error){
   row.failureKind=row.setupComplete?'interaction-or-method-failure':'setup-failure';row.error=error.stack||String(error);
   if(page&&!page.isClosed())try{row.failureObservation=await snapshot(page);write(row.id+'-failed-body.html',await bounded(page.content(),'failed body'));}catch(captureError){row.failureObservationError=String(captureError);}
  }finally{
   if(releaseHistory&&!historyReceipt.releaseRequested)releaseHistory();
   if(context)try{await bounded(context.close(),row.id+' context cleanup',10000);}catch(error){row.cleanupError=String(error);}
   row.baseTransport={badResponses:row.responses.filter(item=>new URL(item.url).origin===BASE&&item.status>=400),failedRequests:row.requestFailures.filter(item=>new URL(item.url).origin===BASE)};
   row.qualified=!!row.completeInBudget&&row.qualified&&!row.error&&!row.cleanupError&&row.routeErrors.length===0&&row.baseTransport.badResponses.length===0&&row.baseTransport.failedRequests.length===0;
   write(row.id+'.json',row);Object.assign(report.cases.find(item=>item.id===row.id),{qualified:row.qualified,setupComplete:row.setupComplete,stage:row.stage,sha256:sha(fs.readFileSync(path.join(OUT,row.id+'.json')))});flush();
  }
 }
}finally{
 for(const [engine,browser] of browsers)try{await bounded(browser.close(),engine+' cleanup',10000);}catch(error){report.cleanupError=String(error);}
 const distAfter=inventory(DIST);write('dist.after.json',distAfter);report.distHeld=JSON.stringify(distAfter)===JSON.stringify(distBefore);
 report.sourceHeld=[...sourceBefore].every(([file,bytes])=>bytes.equals(fs.readFileSync(path.join(ROOT,file))));
 report.fontsHeld=fontManifest.equals(fs.readFileSync(path.join(cache,'manifest.json')))&&report.fonts.every(row=>sha(fs.readFileSync(path.join(cache,row.file)))===row.sha256);
 report.status='complete';report.qualified=report.cases.length===6&&report.cases.every(row=>row.qualified)&&report.sourceHeld&&report.distHeld&&report.fontsHeld&&!report.cleanupError;flush();
}
assert(report.qualified,'Six actual pending-history journeys must complete; inspect retained evidence');
console.log('XI pending history:6 actual native touch journeys, busy while held, exact ST owner and refused-history primary retry preserved; source/dist/fonts held.');
console.log('Fictional transport and prepared constructor RNG; no physical Safari keyboard, cancel, live-data or complete-game claim.');
