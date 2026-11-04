import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
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
for(const[name,f]of Object.entries(m.fixtures)){const raw=await fs.readFile(dir+'/'+f.file,'utf8');assert.equal(sha(raw),f.sha256);fixtures[name]={...f,raw};}
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(await inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const assetReference=new Map(m.distBefore.filter(row=>row.file.startsWith('assets/')).map(row=>[row.file,row])),observedAssets=new Map();
const report={status:'incomplete',mode:publicMode?'public':'local',core:m.core,distDigest:m.distDigest,contexts:[],screenshots:[],scope:'Nine controlled saved-state native App journeys at320,390,1280: projected appearance transfer floor, custom position forecasts and keyboard NFL draft review. Real input/clocks/RNG, source and completed-output holds, original published body checks. No natural-career, full-fleet, first-visit or provider-availability claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const routes=['/soccer-career','/club-manager','/front-office'];
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
async function journey(name,width,seeds,action){
 const r={id:name+'-'+width,name,width,status:'incomplete',requests:[],responses:[],aborts:[],requestFailures:[],console:[],pageErrors:[],assetBodies:[],assetErrors:[]},pendingAssets=[];report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol)||u.origin===origin&&['GET','HEAD'].includes(q.method()))return route.continue();r.aborts.push({url:u.href,origin:u.origin,method:q.method()});return route.abort('blockedbyclient');});
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET'});await socket.close({code:1008,reason:'Source feature QA'});});
 await c.addInitScript(({origin,seeds,routes})=>{if(location.origin!==origin||localStorage.getItem('feature-fixture-seeded'))return;for(const[k,v]of Object.entries(seeds))localStorage.setItem(k,v);for(const route of routes)localStorage.setItem('rules-gate-seen:'+route,'1');localStorage.setItem('feature-unrelated','held');localStorage.setItem('feature-fixture-seeded','1');},{origin,seeds,routes});
 c.on('page',page=>{
  const activeAssets=new Set(),activeReads=new Set();let lastAssetActivity=Date.now();
  const isAsset=url=>{const u=new URL(url);return u.origin===origin&&u.pathname.startsWith('/assets/');};
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
  if(publicMode){r.assetNavigationWaits??=[];for(const method of['goto','reload','goBack']){const native=page[method].bind(page);page[method]=async(...args)=>{await drainAssets(method);return native(...args);};}}
  page.on('request',q=>{r.requests.push({url:q.url(),method:q.method()});if(publicMode&&isAsset(q.url())){activeAssets.add(q);lastAssetActivity=Date.now();}});
  page.on('response',q=>{
   r.responses.push({url:q.url(),status:q.status()});const u=new URL(q.url());
   if(publicMode&&u.origin===origin&&u.pathname.startsWith('/assets/')){
    lastAssetActivity=Date.now();
    const read=(async()=>{try{const file=decodeURIComponent(u.pathname.slice(1)),ref=assetReference.get(file);assert(ref,'Unknown published asset '+file);assert([200,304].includes(q.status()),'Published asset HTTP '+q.status());const bytes=await q.body(),digest=sha(bytes);assert.equal(bytes.length,ref.bytes,file+' bytes');assert.equal(digest,ref.sha256,file+' digest');r.assetBodies.push({file,status:q.status(),bytes:bytes.length,sha256:digest});if(observedAssets.has(file))assert.equal(observedAssets.get(file),digest);observedAssets.set(file,digest);}catch(e){r.assetErrors.push({url:q.url(),error:String(e.stack||e)});}})();
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
  r.url=p.url();for(let done=0;done<pendingAssets.length;){const batch=pendingAssets.slice(done);done=pendingAssets.length;await Promise.all(batch);}await c.close();for(let done=0;done<pendingAssets.length;){const batch=pendingAssets.slice(done);done=pendingAssets.length;await Promise.all(batch);}
  const expected=e=>{if(!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text))return false;try{const o=new URL(e.location.url).origin;return(known.has(o)||o===origin)&&r.aborts.some(a=>a.origin===o&&new URL(e.location.url).href===new URL(a.url).href);}catch{return false;}};
  r.expectedBlockedConsole=r.console.filter(e=>e.type==='error'&&expected(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expected(e));
  r.undeclaredAborts=r.aborts.filter(a=>!known.has(a.origin.replace(/^ws/,'http'))&&a.origin!==origin);
  r.localHttpErrors=r.responses.filter(e=>new URL(e.url).origin===origin&&e.status>=400);
  if(r.pageErrors.length||r.unexpectedConsole.length||r.undeclaredAborts.length||r.localHttpErrors.length||r.assetErrors.length){r.status='failed';r.errorClassification='Unhandled page/console/transport or published-asset evidence';}
  await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 }
}
const seed=name=>({[fixtures[name].key]:fixtures[name].raw});
async function prospectRows(p){return p.locator('span').evaluateAll(ns=>ns.filter(n=>/^Draft Prospect \d\d$/.test(n.textContent||'')&&n.closest('button')).map(n=>({name:n.textContent,grade:Number(n.closest('button').lastElementChild.textContent)})));}
async function waitProspects(p,names){await p.waitForFunction(want=>JSON.stringify([...document.querySelectorAll('span')].filter(n=>/^Draft Prospect \d\d$/.test(n.textContent||'')&&n.closest('button')).map(n=>n.textContent))===JSON.stringify(want),names);}
const scModule=m.modules?.sc,cmModule=m.modules?.cm;
assert(scModule&&cmModule,'Two source-owned extra journey modules are required');
for(const x of[scModule,cmModule])assert.equal(sha(await fs.readFile(x.file)),x.sha256,x.file);
const scFlow=await import(pathToFileURL(path.resolve(scModule.file)).href),cmFlow=await import(pathToFileURL(path.resolve(cmModule.file)).href);
const browser=await pw.chromium.launch({headless:true});
try{for(const width of[320,390,1280]){
 await journey('front-office-draft-focus',width,seed('fo'),async(p,r)=>{
  const f=fixtures.fo;await goto(p,'/front-office');const bytes=await save(p,f.key);assert.equal(bytes,f.raw);
  const order=f.ordered.map(x=>x.name),observed=[];await waitProspects(p,order.slice(0,18));observed.push(...await prospectRows(p));
  await tap(p,r,p.getByRole('button',{name:'Next prospects',exact:true}));await waitProspects(p,order.slice(18,36));observed.push(...await prospectRows(p));
  await tap(p,r,p.getByRole('button',{name:'Next prospects',exact:true}));await waitProspects(p,order.slice(36));observed.push(...await prospectRows(p));
  assert.deepEqual(observed,f.ordered.map(({name,grade})=>({name,grade})));assert.equal(new Set(observed.map(x=>x.name)).size,40);
  assert.equal(await p.getByRole('button',{name:'Next prospects',exact:true}).isDisabled(),true);assert.equal(await save(p,f.key),bytes);
  const combo=p.getByRole('combobox',{name:'Prospect position',exact:true});await combo.selectOption('TE');await waitProspects(p,[]);
  assert.equal(await p.getByRole('button',{name:'Next prospects',exact:true}).isDisabled(),true);assert.equal(await p.getByRole('button',{name:'Previous prospects',exact:true}).isDisabled(),true);
  await combo.selectOption('QB');await waitProspects(p,f.qbs.slice(0,18).map(x=>x.name));
  await tap(p,r,p.getByRole('button',{name:'Next prospects',exact:true}));await waitProspects(p,f.qbs.slice(18).map(x=>x.name));
  const before=JSON.parse(bytes),target=f.target;assert(f.ordered.findIndex(x=>x.id===target.id)>=18);
  const opener=p.getByText(target.name,{exact:true}).locator('xpath=ancestor::button');
  r.focusJourney={entryTarget:'Draft review region',keyboard:width===1280,keys:[]};
  const press=async key=>{await p.keyboard.press(key);r.focusJourney.keys.push(key);};
  const areaHandle=await combo.locator('xpath=../..').elementHandle();assert(areaHandle);
  const measure=()=>areaHandle.evaluate(a=>{const b=a.getBoundingClientRect(),s=getComputedStyle(a);return{scroll:[scrollX,scrollY],height:b.height,top:b.top,bottom:b.bottom,clientHeight:a.clientHeight,scrollHeight:a.scrollHeight,scrollTop:a.scrollTop,style:a.getAttribute('style'),computedHeight:s.height,overflow:s.overflowY,anchor:s.overflowAnchor,docHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight,active:document.activeElement?.outerHTML?.slice(0,180)};});
  await p.evaluate(()=>{window.__draftTrace=[];const keep=x=>{if(window.__draftTrace.length<80)window.__draftTrace.push({at:performance.now(),y:scrollY,...x});};window.addEventListener('scroll',e=>keep({kind:'scroll',target:e.target===document?'document':e.target?.tagName,top:e.target?.scrollTop}),true);for(const[name,owner]of[['focus',HTMLElement.prototype],['scrollIntoView',Element.prototype],['scrollTo',window]]){const fn=owner[name];owner[name]=function(...args){keep({kind:name,args,target:this?.tagName||'window',stack:new Error().stack?.split('\n').slice(1,5)});return Reflect.apply(fn,this,args);};}});
  r.focusJourney.setupBefore=await measure();
  await opener.scrollIntoViewIfNeeded();await idle(p);
  if(width===1280){await opener.focus();assert.equal(await opener.evaluate(n=>n===document.activeElement),true,'FO_INITIAL_OPENER_FOCUSED');}
  r.focusJourney.before=await measure();
  const entryScroll=await p.evaluate(()=>[scrollX,scrollY]);
  if(width===1280)await press('Enter');else await tap(p,r,opener);
  const review=p.getByRole('region',{name:'Draft review',exact:true});await review.waitFor({state:'visible'});
  await p.waitForFunction(()=>document.querySelector('section[aria-label="Draft review"]')===document.activeElement);
  assert.equal(await review.evaluate(n=>n===document.activeElement),true,'FO_PRODUCT_ENTRY_FOCUS');
  await idle(p);r.focusJourney.entryScroll={before:entryScroll,after:await p.evaluate(()=>[scrollX,scrollY])};
  r.focusJourney.after=await measure();r.focusJourney.trace=await p.evaluate(()=>window.__draftTrace);await p.waitForTimeout(350);r.focusJourney.settled=await measure();
  assert.deepEqual(r.focusJourney.entryScroll.after,entryScroll,'FO_ENTRY_SCROLL_HELD');
  assert.equal(await save(p,f.key),bytes,'Review spends no pick');
  assert.equal(await review.getByText(target.name,{exact:true}).count(),1);
  assert.equal(await review.getByText('Scouted grade '+target.grade,{exact:true}).count(),1);
  const roster=before.league.teams[before.myTeam].players.filter(x=>x.pos===target.pos);
  assert.deepEqual(await review.locator('[data-draft-current-player]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-draft-current-player'))),roster.map(x=>x.id));
  for(const player of roster){const row=review.locator('[data-draft-current-player="'+player.id+'"]');const text=await row.textContent();assert(text.includes(player.name)&&text.includes('OVR '+player.ovr)&&text.includes('age '+player.age)&&text.includes(player.years+' year'));}
  assert(!/true rating|potential/i.test(await review.textContent()));
  await photo(p,r,'[aria-label="Draft review"]');
  const back=review.getByRole('button',{name:'Back',exact:true});
  if(width===1280){await press('Tab');assert.equal(await back.evaluate(n=>n===document.activeElement),true,'FO_NATIVE_TAB_TO_BACK');}
  const backScroll=await p.evaluate(()=>[scrollX,scrollY]);
  if(width===1280)await press('Enter');else await tap(p,r,back);
  await review.waitFor({state:'hidden'});
  await p.waitForFunction(name=>[...document.querySelectorAll('span')].some(n=>n.textContent===name&&n.closest('button')===document.activeElement),target.name);
  assert.equal(await opener.evaluate(n=>n===document.activeElement),true,'FO_EXACT_OPENER_RETURN');
  assert.equal(await save(p,f.key),bytes,'Back spends no pick');
  assert.equal(await combo.inputValue(),'QB');await waitProspects(p,f.qbs.slice(18).map(x=>x.name));
  await idle(p);r.focusJourney.backScroll={before:backScroll,after:await p.evaluate(()=>[scrollX,scrollY])};
  assert.deepEqual(r.focusJourney.backScroll.after,backScroll,'FO_BACK_SCROLL_HELD');
  const reopenedScroll=await p.evaluate(()=>[scrollX,scrollY]);
  if(width===1280)await press('Enter');else await tap(p,r,opener);
  await review.waitFor({state:'visible'});
  await p.waitForFunction(()=>document.querySelector('section[aria-label="Draft review"]')===document.activeElement);
  assert.equal(await review.evaluate(n=>n===document.activeElement),true,'FO_PRODUCT_REOPEN_FOCUS');assert.equal(await save(p,f.key),bytes);
  await idle(p);r.focusJourney.reopenedScroll={before:reopenedScroll,after:await p.evaluate(()=>[scrollX,scrollY])};
  assert.deepEqual(r.focusJourney.reopenedScroll.after,reopenedScroll,'FO_REOPEN_SCROLL_HELD');
  const confirm=review.getByRole('button',{name:'Confirm draft',exact:true});
  if(width===1280){
   await press('Tab');assert.equal(await back.evaluate(n=>n===document.activeElement),true,'FO_NATIVE_TAB_REOPEN_BACK');
   await press('Tab');assert.equal(await confirm.evaluate(n=>n===document.activeElement),true,'FO_NATIVE_TAB_TO_CONFIRM');
   await press('Enter');
  }else await tap(p,r,confirm);
  await review.waitFor({state:'hidden'});
  await p.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).picksLeft===2,f.key);
  const after=JSON.parse(await save(p,f.key)),rivals=engine.fo.draftOrder(before.league.teams).filter(k=>k!==before.myTeam&&before.league.teams[k].picks.length>0).slice(0,6),expected=structuredClone(before.league);
  const oldIds=new Set(Object.values(before.league.teams).flatMap(t=>t.players.map(x=>x.id))),newIds=[],arrivals=[];
  for(const[team,wanted]of[[before.myTeam,target.name],...rivals.map((team,i)=>[team,f.rivals[i]])]){
   const original=before.league.teams[team],now=after.league.teams[team];assert.deepEqual(now.players.slice(0,original.players.length),original.players);assert.equal(now.players.length,original.players.length+1);
   const player=now.players.at(-1);assert.equal(player.name,wanted);assert.equal(player.ovr,80);assert.equal(player.salary,7);assert.equal(player.years,team===before.myTeam?5:4);assert.equal(player.rookieSeason,before.league.season+1);assert(player.pot>=83&&player.pot<=90);assert(!oldIds.has(player.id));
   newIds.push(player.id);arrivals.push({team,name:player.name,pos:player.pos});expected.teams[team].players.push(player);expected.teams[team].picks.shift();
  }
  assert.equal(new Set(newIds).size,7);assert.deepEqual(after.league,expected);assert.equal(after.picksLeft,2);assert.equal(after.draftBatchesLeft,2);assert.equal(after.league.teams[before.myTeam].players.at(-1).pos,'QB');
  assert.deepEqual(after.draftClass,before.draftClass.filter(x=>x.id!==target.id).slice(6));assert.equal(await combo.inputValue(),'all');
  const disk=await save(p,f.key);await p.reload();await answerConsent(p,{wait:1000});await combo.waitFor();assert.equal(await combo.inputValue(),'all');assert.equal(await save(p,f.key),disk);
  r.observed={allFortyAndGrades:observed,target,reviewBackHeld:true,rosterContext:roster.map(x=>({id:x.id,name:x.name,ovr:x.ovr,age:x.age,years:x.years})),arrivals,spentOneOwnedPick:true,unfilteredSixRivalPicks:true,saveAfter:sha(disk),reloaded:true};
 });
 for(const[k,flow]of[['sc',scFlow.runSelectedOffer],['cm',cmFlow.runCmTraining]])await journey(k==='sc'?'soccer-transfer-floor':'manager-custom-odds',width,seed(k),async(p,r)=>{
  const fixture=fixtures[k];assert.equal(typeof flow,'function');
  const observed=await flow({page:p,width,base,fixture,engine:k==='sc'?engine.sc:engine.cm,photo:async(label,selector)=>{assert(!r.screenshot,'One normal photo per context');r.checkpoint=label;await photo(p,r,selector);},tap:locator=>tap(p,r,locator),goto:async value=>{const u=new URL(value,base);assert.equal(u.origin,origin);await goto(p,u.pathname+u.search+u.hash);},save:key=>save(p,key)});
  r.observed=observed;assert(r.screenshot,'Source-owned flow must retain its photo');
 });
}
}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
for(const[name,f]of Object.entries(m.fixtures))assert.equal(sha(await fs.readFile(dir+'/'+f.file)),f.sha256,name);
report.sourceHeld=true;report.distHeld=true;report.publicAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));report.status=report.contexts.length===9&&report.contexts.every(r=>r.status==='passed')&&report.screenshots.length===9&&new Set(report.screenshots).size===9&&(!publicMode||report.contexts.every(r=>r.assetBodies.length>0))?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('masterListNextBrowser: nine controlled native journeys and nine normal screenshots passed.');
