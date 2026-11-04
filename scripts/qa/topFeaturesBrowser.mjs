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
const report={status:'incomplete',mode:publicMode?'public':'local',core:m.core,distDigest:m.distDigest,contexts:[],screenshots:[],scope:'Twenty controlled saved-state App journeys across ten routes at390/1280. Native input and clocks/RNG, no exported App hooks. Seen-guide fixtures, no first-visit/provider/font/natural-progression/full-suite claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const routes=['/soccer-career','/club-manager','/nba-my-career','/nfl-my-career','/stadium-tycoon','/front-office','/soccer','/pro-basketball','/pro-football','/'];
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const tap=async(p,r,l)=>{await l.scrollIntoViewIfNeeded();if(r.width===390)await l.tap();else await l.click();};
const save=(p,key)=>p.evaluate(k=>localStorage.getItem(k),key);
async function photo(p,r,selector){
 const target=p.locator(selector).first();await target.scrollIntoViewIfNeeded();await idle(p);
 r.geometry=await target.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x,right:b.right,width:b.width,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
 assert(r.geometry.width>0&&r.geometry.x>=-1&&r.geometry.right<=r.geometry.viewport+1);
 assert(r.geometry.scrollWidth<=r.geometry.clientWidth+1,'No document horizontal overflow');
 const file=r.id+'.png';await p.screenshot({path:out+'/'+file});r.screenshot=file;report.screenshots.push(file);
}
async function goto(p,url){await p.goto(base+url);await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});await idle(p);}
async function hubPaths(p,want){await p.waitForFunction(w=>JSON.stringify([...document.querySelectorAll('[data-hub-game]')].map(n=>n.getAttribute('data-hub-game')).sort())===JSON.stringify(w),want);}
const tileIds=column=>column.locator('[data-gm-tile]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-gm-tile')).sort());
async function waitColumn(p,label,ids){await p.waitForFunction(({label,ids})=>{const input=document.querySelector('input[aria-label="'+label+'"]'),column=input?.parentElement?.parentElement;return column&&JSON.stringify([...column.querySelectorAll('[data-gm-tile]')].map(n=>n.getAttribute('data-gm-tile')).sort())===JSON.stringify(ids);},{label,ids});}
const browser=await pw.chromium.launch({headless:true});
async function journey(name,width,seeds,action){
 const r={id:name+'-'+width,name,width,status:'incomplete',requests:[],responses:[],aborts:[],requestFailures:[],console:[],pageErrors:[],assetBodies:[],assetErrors:[]},pendingAssets=[];report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(!['http:','https:'].includes(u.protocol)||u.origin===origin&&['GET','HEAD'].includes(q.method()))return route.continue();r.aborts.push({url:u.href,origin:u.origin,method:q.method()});return route.abort('blockedbyclient');});
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET'});await socket.close({code:1008,reason:'Source feature QA'});});
 await c.addInitScript(({origin,seeds,routes})=>{if(location.origin!==origin||localStorage.getItem('feature-fixture-seeded'))return;for(const[k,v]of Object.entries(seeds))localStorage.setItem(k,v);for(const route of routes)localStorage.setItem('rules-gate-seen:'+route,'1');localStorage.setItem('feature-unrelated','held');localStorage.setItem('feature-fixture-seeded','1');},{origin,seeds,routes});
 c.on('page',page=>{page.on('request',q=>r.requests.push({url:q.url(),method:q.method()}));page.on('response',q=>{r.responses.push({url:q.url(),status:q.status()});const u=new URL(q.url());if(publicMode&&u.origin===origin&&u.pathname.startsWith('/assets/'))pendingAssets.push((async()=>{try{const file=decodeURIComponent(u.pathname.slice(1)),ref=assetReference.get(file);assert(ref,'Unknown published asset '+file);assert([200,304].includes(q.status()),'Published asset HTTP '+q.status());const bytes=await q.body(),digest=sha(bytes);assert.equal(bytes.length,ref.bytes,file+' bytes');assert.equal(digest,ref.sha256,file+' digest');r.assetBodies.push({file,status:q.status(),bytes:bytes.length,sha256:digest});if(observedAssets.has(file))assert.equal(observedAssets.get(file),digest);observedAssets.set(file,digest);}catch(e){r.assetErrors.push({url:q.url(),error:String(e.stack||e)});}})());});page.on('requestfailed',q=>r.requestFailures.push({url:q.url(),failure:q.failure()}));page.on('pageerror',e=>r.pageErrors.push(String(e.stack||e)));page.on('console',e=>r.console.push({type:e.type(),text:e.text(),location:e.location()}));});
 const p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
 try{await action(p,r,c);assert.equal(await save(p,'feature-unrelated'),'held');r.status='passed';}
 catch(e){r.status='failed';r.error=String(e.stack||e);try{await p.screenshot({path:out+'/'+r.id+'-failure.png'});r.failureScreenshot=r.id+'-failure.png';}catch{}}
 finally{
  r.url=p.url();for(let done=0;done<pendingAssets.length;){const batch=pendingAssets.slice(done);done=pendingAssets.length;await Promise.all(batch);}await c.close();
  const expected=e=>{if(!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text))return false;try{const o=new URL(e.location.url).origin;return(known.has(o)||o===origin)&&r.aborts.some(a=>a.origin===o);}catch{return false;}};
  r.expectedBlockedConsole=r.console.filter(e=>e.type==='error'&&expected(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expected(e));
  r.undeclaredAborts=r.aborts.filter(a=>!known.has(a.origin.replace(/^ws/,'http'))&&a.origin!==origin);
  r.localHttpErrors=r.responses.filter(e=>new URL(e.url).origin===origin&&e.status>=400);
  if(r.pageErrors.length||r.unexpectedConsole.length||r.undeclaredAborts.length||r.localHttpErrors.length||r.assetErrors.length){r.status='failed';r.errorClassification='Unhandled page/console/transport or published-asset evidence';}
  await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 }
}
const seed=name=>({[fixtures[name].key]:fixtures[name].raw});
try{for(const width of[390,1280]){
 await journey('soccer-practice',width,seed('sc'),async(p,r)=>{
  await goto(p,'/soccer-career');await tap(p,r,p.getByRole('button',{name:'Open the training ground',exact:true}));
  await p.getByText('Already trained this season',{exact:true}).waitFor();
  const before=await save(p,fixtures.sc.key);
  await tap(p,r,p.getByRole('button',{name:/Cone Slalom/}));
  const cones=async()=>{for(let n=1;n<=8;n++)await tap(p,r,p.getByRole('button',{name:String(n),exact:true}));await p.locator('[data-training-score]').waitFor();assert.equal(await p.getByRole('button',{name:'Bank the session',exact:true}).count(),0);assert.equal(await p.getByText('Practice only. No career boost.',{exact:true}).count(),1);return Number(await p.locator('[data-training-score]').textContent());};
  const scores=[await cones()];await tap(p,r,p.getByRole('button',{name:'Try again',exact:true}));scores.push(await cones());assert(scores.every(n=>n>=0&&n<=100));await photo(p,r,'[data-training-result]');
  await tap(p,r,p.getByRole('button',{name:'Back to your career',exact:true}));assert.equal(await save(p,fixtures.sc.key),before);r.observed={scores,saveBefore:sha(before),saveAfter:sha(await save(p,fixtures.sc.key)),noSecondReward:true};
 });
 await journey('manager-fit',width,seed('cm'),async(p,r)=>{
  await goto(p,'/club-manager');await tap(p,r,p.getByRole('button',{name:'Resume Career',exact:true}));await tap(p,r,p.getByRole('button').filter({has:p.getByText('Training',{exact:true})}));
  const choose=p.getByRole('combobox',{name:'Player to retrain',exact:true});await choose.waitFor();const before=await save(p,fixtures.cm.key);
  await choose.selectOption(fixtures.cm.playerId);const button=p.locator('[data-cm-retrain-to="RW"]');await button.waitFor();
  const rows=await button.locator('[data-cm-fit-slot]').evaluateAll(ns=>ns.map(n=>({index:Number(n.dataset.cmFitSlot),before:Number(n.dataset.cmFitBefore),after:Number(n.dataset.cmFitAfter)})));
  assert.deepEqual(rows,fixtures.cm.expected);assert((await button.innerText()).includes('+2 fit'));assert.equal(await save(p,fixtures.cm.key),before);await photo(p,r,'[data-cm-retrain-to="RW"]');
  const career=JSON.parse(before),player=career.squad.find(x=>x.id===fixtures.cm.playerId);assert(!player.retraining);r.observed={rows,saveBefore:sha(before),saveAfter:sha(await save(p,fixtures.cm.key)),courseNotStarted:true};
 });
 for(const name of['nba','nfl'])await journey(name+'-programme',width,seed(name),async(p,r)=>{
  const f=fixtures[name];await goto(p,f.path);await p.locator('[data-us-programme-open]').waitFor();
  const open=async()=>{await tap(p,r,p.locator('[data-us-programme-open]'));await tap(p,r,p.locator('[data-us-programme-start]'));};
  await open();const before=await save(p,f.key);
  await tap(p,r,p.getByRole('button',{name:'Try a plan',exact:true}));await tap(p,r,p.locator('[data-us-programme-tile="workload"]'));await tap(p,r,p.locator('[data-us-programme-choice="workload:recover"]'));
  assert.equal(await save(p,f.key),before);await photo(p,r,'[data-us-programme="dialog"]');
  await tap(p,r,p.getByRole('button',{name:'Discard preview',exact:true}));assert.equal(await save(p,f.key),before);
  await tap(p,r,p.getByRole('button',{name:'Try a plan',exact:true}));await tap(p,r,p.locator('[data-us-programme-tile="workload"]'));await tap(p,r,p.locator('[data-us-programme-choice="workload:recover"]'));
  await tap(p,r,p.locator('[data-us-programme-back]'));await tap(p,r,p.locator('[data-us-programme-tile="tactics"]'));await tap(p,r,p.locator('[data-us-programme-choice="tactics:attack"]'));
  await tap(p,r,p.getByRole('button',{name:'Apply plan',exact:true}));
  await p.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).c.programme?.workload==='recover',f.key);
  const applied=await save(p,f.key),a=JSON.parse(applied),b=JSON.parse(before),plan=a.c.programme;assert.equal(plan.sport,name);assert.equal(plan.tactics,'attack');
  assert.deepEqual(Object.fromEntries(['expectation','partnership','bonus','reinvention'].map(k=>[k,plan[k]])),{expectation:'normal',partnership:'normal',bonus:'normal',reinvention:'normal'});
  delete a.c.programme;delete b.c.programme;assert.deepEqual(a,b,'Only the complete programme changes');
  await p.reload();await answerConsent(p,{wait:1000});await open();await tap(p,r,p.locator('[data-us-programme-tile="workload"]'));assert.equal(await p.locator('[data-us-programme-choice="workload:recover"]').getAttribute('aria-pressed'),'true');
  r.observed={discardSaveHeld:true,plan,saveBefore:sha(before),saveApplied:sha(applied),reloadedSelection:'recover'};
 });
 await journey('stadium-batch',width,{},async(p,r)=>{
  const before=engine.tycoon.newTycoon(Date.now());before.money=1000;before.clubName='Batch Browser Club';
  const raw=engine.tycoon.serializeTycoon(before,Date.now());await goto(p,'/soccer');await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:engine.tycoon.TYCOON_SAVE_KEY,raw});
  await goto(p,'/stadium-tycoon');await tap(p,r,p.getByRole('button',{name:'Up to 5 levels',exact:true}));
  const stands=p.getByRole('button',{name:/Stands/});assert((await stands.innerText()).includes('Buy 5'));assert((await stands.innerText()).includes('203'));
  await tap(p,r,stands);await stands.getByText('Lv 5',{exact:true}).waitFor();await photo(p,r,'[role="group"][aria-label="Upgrade quantity"]');
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const saved=JSON.parse(await save(p,engine.tycoon.TYCOON_SAVE_KEY));assert.equal(saved.levels.stands,5);assert(saved.money>=0);assert.equal(saved.totalTaps,before.totalTaps);
  await p.reload();await answerConsent(p,{wait:1000});await stands.getByText('Lv 5',{exact:true}).waitFor();const reload=JSON.parse(await save(p,engine.tycoon.TYCOON_SAVE_KEY));assert.equal(reload.levels.stands,5);
  r.observed={quotedLevels:5,quotedCost:203,savedLevels:saved.levels.stands,savedMoney:saved.money,nativeIdleIncomeMayAccrue:true,reloadLevel:reload.levels.stands,reloadLabel:await stands.getByText('Lv 5',{exact:true}).innerText()};
 });
 await journey('front-office-search',width,seed('fo'),async(p,r)=>{
  await goto(p,'/front-office');await tap(p,r,p.getByRole('button').filter({has:p.getByText('Trade desk',{exact:true})}));await p.locator('[data-gm-trade-builder]').waitFor();
  const partner=p.getByRole('combobox',{name:'Deal with',exact:true});await partner.selectOption(fixtures.fo.partner);
  const own=p.getByRole('searchbox',{name:'Search your trade assets',exact:true}),theirs=p.getByRole('searchbox',{name:'Search their trade assets',exact:true});
  await own.waitFor();const ownColumn=own.locator('..').locator('..'),theirColumn=theirs.locator('..').locator('..'),before=await save(p,fixtures.fo.key),initialOwn=await tileIds(ownColumn),initialTheirs=await tileIds(theirColumn),key='player:'+fixtures.fo.ownId,selected=p.locator('[data-gm-tile="'+key+'"]');
  await tap(p,r,selected);await own.fill('does-not-match-any-fixture');await waitColumn(p,'Search your trade assets',[key]);assert.equal(await selected.getAttribute('aria-pressed'),'true');assert.deepEqual(await tileIds(theirColumn),initialTheirs);
  await theirs.fill('Trade Target 1');await waitColumn(p,'Search their trade assets',fixtures.fo.theirMatchingIds);assert(fixtures.fo.theirMatchingIds.length>0);assert.equal(await save(p,fixtures.fo.key),before);await photo(p,r,'[data-gm-trade-builder]');
  await tap(p,r,p.getByRole('button',{name:'Clear your asset search',exact:true}));await waitColumn(p,'Search your trade assets',initialOwn);assert.equal(await theirs.inputValue(),'Trade Target 1');assert.deepEqual(await tileIds(theirColumn),fixtures.fo.theirMatchingIds);await tap(p,r,p.getByRole('button',{name:'Clear their asset search',exact:true}));await waitColumn(p,'Search their trade assets',initialTheirs);
  assert.equal(await selected.getAttribute('aria-pressed'),'true');assert.equal(await save(p,fixtures.fo.key),before);r.observed={initialOwn,initialTheirs,filteredOwn:[key],filteredTheirs:fixtures.fo.theirMatchingIds,selectedId:fixtures.fo.ownId,saveBefore:sha(before),saveAfter:sha(await save(p,fixtures.fo.key)),proposalNotSubmitted:true};
 });
 for(const[route,name,game]of[['/soccer','sc','/soccer-career'],['/pro-basketball','nba','/nba-my-career'],['/pro-football','nfl','/nfl-my-career']])await journey('saved-'+name,width,seed(name),async(p,r)=>{
  await goto(p,route+'?from=feature&from=second');const before=await save(p,fixtures[name].key);
  await tap(p,r,p.getByRole('button',{name:/^Saved games/}));const search=p.locator('input[aria-label^="Search "]');await search.fill('Career');
  await p.waitForURL(u=>u.searchParams.get('filter')==='saved'&&u.searchParams.get('q')==='Career');await hubPaths(p,[game]);assert.deepEqual(new URL(p.url()).searchParams.getAll('from'),['feature','second']);assert.equal(await save(p,fixtures[name].key),before);await photo(p,r,'section[aria-label$="game library"]');
  const remembered=p.url();await tap(p,r,p.locator('[data-hub-game="'+game+'"] h3 a'));
  await p.waitForURL(u=>u.pathname===game);await p.locator(name==='sc'?'[data-career-utility="training"]':'[data-us-programme-panel]').waitFor({state:'visible'});
  await p.goBack();await p.waitForURL(u=>u.href===remembered);await hubPaths(p,[game]);assert.equal(await search.inputValue(),'Career');await p.reload();await answerConsent(p,{wait:1000});await hubPaths(p,[game]);r.observed={savedPath:game,query:'Career',from:['feature','second'],nativeBackHeld:true,reloadHeld:true,filterDidNotRewriteSave:true};
 });
 await journey('home-progress',width,{...seed('sc'),...seed('nba'),...seed('nfl')},async(p,r,c)=>{
  await goto(p,'/');const card=p.locator('[data-continue-card="/soccer-career"]');await card.waitFor();
  await p.waitForFunction(age=>document.querySelector('[data-continue-card="/soccer-career"]').textContent.includes('age '+age),fixtures.sc.age);
  const before=await p.locator('[data-continue-card]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-continue-card')));
  const other=await c.newPage();await other.goto(base+'/soccer');await other.evaluate(key=>{const current=JSON.parse(localStorage.getItem(key));current.age++;localStorage.setItem(key,JSON.stringify(current));},fixtures.sc.key);
  await p.waitForFunction(age=>document.querySelector('[data-continue-card="/soccer-career"]').textContent.includes('age '+age),fixtures.sc.age+1);await other.close();
  assert.deepEqual(await p.locator('[data-continue-card]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-continue-card'))),before);await photo(p,r,'[data-home-continue]');r.observed={ageBefore:fixtures.sc.age,ageAfter:fixtures.sc.age+1,cardPaths:before,nativeCrossTabStorageEvent:true};
 });
}}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
report.sourceHeld=true;report.distHeld=true;report.publicAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));report.status=report.contexts.length===20&&report.contexts.every(r=>r.status==='passed')&&report.screenshots.length===20&&(!publicMode||report.contexts.every(r=>r.assetBodies.length>0))?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('topFeaturesBrowser: twenty controlled feature journeys, ten routes at390/1280 and twenty screenshots passed.');
