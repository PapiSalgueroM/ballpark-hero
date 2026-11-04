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
const report={status:'incomplete',mode:publicMode?'public':'local',core:m.core,distDigest:m.distDigest,contexts:[],screenshots:[],scope:'Twenty-three controlled saved-state App journeys: native paid/free NBA/NFL practice, complete NFL prospect access, two payroll wallets, three hub pins through Home, plus source-owned SC/CM flows. Native input and clocks/RNG, no exported App hooks. Seen-guide fixtures, no first-visit/provider/font/natural-progression/full-suite claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const routes=['/soccer-career','/club-manager','/nba-my-career','/nfl-my-career','/stadium-tycoon','/front-office','/soccer','/pro-basketball','/pro-football','/'];
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
 c.on('page',page=>{page.on('request',q=>r.requests.push({url:q.url(),method:q.method()}));page.on('response',q=>{r.responses.push({url:q.url(),status:q.status()});const u=new URL(q.url());if(publicMode&&u.origin===origin&&u.pathname.startsWith('/assets/'))pendingAssets.push((async()=>{try{const file=decodeURIComponent(u.pathname.slice(1)),ref=assetReference.get(file);assert(ref,'Unknown published asset '+file);assert([200,304].includes(q.status()),'Published asset HTTP '+q.status());const bytes=await q.body(),digest=sha(bytes);assert.equal(bytes.length,ref.bytes,file+' bytes');assert.equal(digest,ref.sha256,file+' digest');r.assetBodies.push({file,status:q.status(),bytes:bytes.length,sha256:digest});if(observedAssets.has(file))assert.equal(observedAssets.get(file),digest);observedAssets.set(file,digest);}catch(e){r.assetErrors.push({url:q.url(),error:String(e.stack||e)});}})());});page.on('requestfailed',q=>r.requestFailures.push({url:q.url(),failure:q.failure()}));page.on('pageerror',e=>r.pageErrors.push(String(e.stack||e)));page.on('console',e=>r.console.push({type:e.type(),text:e.text(),location:e.location()}));});
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
const PICK_KEY='dukb-game-picks-v1',heldPick='/squad-deal';
const allStorage=p=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
const protect=(before,after,except=[])=>assert.deepEqual(Object.fromEntries(Object.entries(after).filter(([k])=>!except.includes(k))),Object.fromEntries(Object.entries(before).filter(([k])=>!except.includes(k))),'Unrelated browser saves held');
async function prospectRows(p){return p.locator('span').evaluateAll(ns=>ns.filter(n=>/^Draft Prospect \d\d$/.test(n.textContent||'')&&n.closest('button')).map(n=>({name:n.textContent,grade:Number(n.closest('button').lastElementChild.textContent)})));}
async function waitProspects(p,names){await p.waitForFunction(want=>JSON.stringify([...document.querySelectorAll('span')].filter(n=>/^Draft Prospect \d\d$/.test(n.textContent||'')&&n.closest('button')).map(n=>n.textContent))===JSON.stringify(want),names);}
async function finishDrill(p,r,skin){
 const before=Date.now();
 if(skin.kind==='cones'){for(let n=1;n<=8;n++)await tap(p,r,p.getByRole('button',{name:String(n),exact:true}));}
 else if(skin.kind==='burst'){
  await tap(p,r,p.getByRole('button',{name:skin.startTitle,exact:false}));
  const floor=p.getByRole('button',{name:/GO GO GO/});
  for(let n=0;n<5;n++){if(!await floor.count())break;await tap(p,r,floor);}
 }else if(skin.kind==='zones'){
  assert.equal(skin.mode,'pick');
  const zone=p.getByRole('button',{name:skin.verb+' '+skin.zones[0],exact:true});
  for(let n=0;n<5;n++){
   await tap(p,r,zone);await p.locator('[data-training-feedback]').waitFor();
   if(n<4)await p.locator('[data-training-feedback]').waitFor({state:'hidden'});
  }
 }else{
  await tap(p,r,p.getByRole('button',{name:skin.startTitle,exact:false}));
 }
 await p.locator('[data-training-score]').waitFor({state:'visible',timeout:15000});
 const score=Number(await p.locator('[data-training-score]').textContent());assert(score>=0&&score<=100);
 return{drill:skin.id,score,elapsedMs:Date.now()-before};
}
async function footerWitness(pin){
 return pin.evaluate(button=>{
  const footer=button.parentElement,article=button.closest('article'),action=footer.querySelector('span'),b=button.getBoundingClientRect(),a=action?.getBoundingClientRect(),f=footer.getBoundingClientRect(),c=article.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
  const rect=x=>x?{x:x.x,y:x.y,right:x.right,bottom:x.bottom,width:x.width,height:x.height}:null;
  return{button:rect(b),action:rect(a),footer:rect(f),card:rect(c),hitOwn:hit===button||button.contains(hit),buttonInside:b.x>=c.x-.5&&b.right<=c.right+.5&&b.y>=c.y-.5&&b.bottom<=c.bottom+.5,overlap:a?Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)):0,footerOverflow:footer.scrollWidth-footer.clientWidth,actionOverflow:action?action.scrollWidth-action.clientWidth:0};
 });
}
const scModule=m.modules?.sc,cmModule=m.modules?.cm;
assert(scModule&&cmModule,'Two source-owned extra journey modules are required');
for(const x of[scModule,cmModule])assert.equal(sha(await fs.readFile(x.file)),x.sha256,x.file);
const scFlow=await import(pathToFileURL(path.resolve(scModule.file)).href),cmFlow=await import(pathToFileURL(path.resolve(cmModule.file)).href);
const browser=await pw.chromium.launch({headless:true});
try{for(const width of[390,1280]){
 for(const name of['nba','nfl'])await journey(name+'-free-practice',width,seed(name),async(p,r)=>{
  const f=fixtures[name];await goto(p,f.path);const input=await save(p,f.key);assert.equal(input,f.raw);
  await tap(p,r,p.getByRole('button',{name:'Start practice',exact:true}));await p.getByRole('button',{name:'Practice rules',exact:true}).waitFor();
  const cones=f.drills.find(d=>d.kind==='cones');await tap(p,r,p.getByRole('button',{name:new RegExp(cones.name)}));const paid=await finishDrill(p,r,cones);
  assert(paid.score>=50,'A real played paid drill earns a positive tier');
  await tap(p,r,p.getByRole('button',{name:'Bank the session',exact:true}));
  await p.getByRole('button',{name:'Back to your career',exact:true}).waitFor();
  const banked=await save(p,f.key),b=JSON.parse(banked),a=JSON.parse(input),reward=engine.training.bankTrainingRating(a.c.ovr,a.c.pot,paid.score);
  assert.deepEqual(b,{...a,c:{...a.c,ovr:reward.ovr,practice:{...reward,year:a.c.year,drill:cones.id,score:paid.score,before:a.c.ovr}}});
  await tap(p,r,p.getByRole('button',{name:'Back to your career',exact:true}));
  await tap(p,r,p.getByRole('button',{name:'View practice',exact:true}));await p.getByRole('button',{name:'Practice rules',exact:true}).waitFor();
  for(const drill of f.drills)assert.equal(await p.getByRole('button',{name:new RegExp(drill.name)}).count(),1);
  const freeBefore=await allStorage(p),freeRuns=[];
  for(let n=0;n<f.drills.length;n++){
   const drill=f.drills[n];await tap(p,r,p.getByRole('button',{name:new RegExp(drill.name)}));freeRuns.push(await finishDrill(p,r,drill));
   assert.equal(await p.getByRole('button',{name:'Bank the session',exact:true}).count(),0);
   assert.equal(await p.getByText('Practice only. No career boost.',{exact:true}).count(),1);
   if(n<f.drills.length-1)await tap(p,r,p.getByRole('button',{name:'Choose a drill',exact:true}));
  }
  await photo(p,r,'[data-training-result]');assert.equal(await save(p,f.key),banked);protect(freeBefore,await allStorage(p));
  await tap(p,r,p.getByRole('button',{name:'Try again',exact:true}));
  await p.getByRole('button',{name:f.drills.at(-1).startTitle,exact:false}).waitFor();
  await p.keyboard.press('Escape');await p.getByRole('button',{name:'View practice',exact:true}).waitFor();
  assert.equal(await p.getByRole('button',{name:'View practice',exact:true}).evaluate(n=>n===document.activeElement),true);
  assert.equal(await save(p,f.key),banked);await p.reload();await answerConsent(p,{wait:1000});
  await tap(p,r,p.getByRole('button',{name:'View practice',exact:true}));await p.getByRole('button',{name:'Practice rules',exact:true}).waitFor();
  for(const drill of f.drills)assert.equal(await p.getByRole('button',{name:new RegExp(drill.name)}).count(),1);
  assert.equal(await save(p,f.key),banked);r.observed={paid,reward,freeRuns,bankedSave:sha(banked),reloadedFourDrills:true,freeStorageHeld:true,nativeClocksAndRandomness:true};
 });
 await journey('front-office-prospects',width,seed('fo'),async(p,r)=>{
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
  await photo(p,r,'label:has(select)');
  const before=JSON.parse(bytes),target=f.target;assert(f.ordered.findIndex(x=>x.id===target.id)>=18);
  await tap(p,r,p.getByText(target.name,{exact:true}).locator('xpath=ancestor::button'));
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
  r.observed={allFortyAndGrades:observed,target,arrivals,spentOneOwnedPick:true,unfilteredSixRivalPicks:true,saveAfter:sha(disk),reloaded:true};
 });
 for(const wallet of[1000,341])await journey('payroll-'+wallet,width,seed('payroll'+wallet),async(p,r)=>{
  const f=fixtures['payroll'+wallet];await goto(p,'/stadium-tycoon');
  await tap(p,r,p.getByRole('button',{name:/Payroll/}));await tap(p,r,p.getByRole('button',{name:'Up to 5 hires',exact:true}));
  const steward=p.getByRole('button',{name:/Turnstile Steward/}),before=JSON.parse(await save(p,f.key));
  assert((await steward.innerText()).includes('Hire '+f.quantity));assert((await steward.innerText()).includes(String(f.cost)));
  await tap(p,r,steward);await steward.getByText(String(f.quantity),{exact:true}).waitFor({state:'visible'});
  await photo(p,r,'button:has-text("Turnstile Steward")');
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const saved=JSON.parse(await save(p,f.key));
  assert.equal(saved.staffLevels.steward,f.quantity);assert(saved.money>=f.moneyAfter);assert(saved.money>=0);
  assert.deepEqual(saved.levels,before.levels);assert.deepEqual(saved.league,before.league);assert.equal(saved.totalTaps,before.totalTaps);
  await p.reload();await answerConsent(p,{wait:1000});await tap(p,r,p.getByRole('button',{name:/Payroll/}));await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  const reload=JSON.parse(await save(p,f.key));assert.equal(reload.staffLevels.steward,f.quantity);
  r.observed={wallet,quantity:f.quantity,quoteCost:f.cost,savedStaff:saved.staffLevels.steward,savedMoney:saved.money,reloadStaff:reload.staffLevels.steward,nativeIncomeMayAccrue:true};
 });
 for(const[k,flow]of[['sc',scFlow.runSelectedOffer],['cm',cmFlow.runCmTraining]])await journey(k==='sc'?'soccer-selected-offer':'manager-recorded-training',width,seed(k),async(p,r)=>{
  const fixture=fixtures[k];assert.equal(typeof flow,'function');
  const observed=await flow({page:p,width,base,fixture,engine:engine.cm,photo:async(label,selector)=>{assert(!r.screenshot,'One normal photo per context');r.checkpoint=label;await photo(p,r,selector);},tap:locator=>tap(p,r,locator),goto:async value=>{const u=new URL(value,base);assert.equal(u.origin,origin);await goto(p,u.pathname+u.search+u.hash);},save:key=>save(p,key)});
  r.observed=observed;assert(r.screenshot,'Source-owned flow must retain its photo');
 });
}
for(const width of[320,390,1280])for(const hub of m.hubs)await journey(hub.route.slice(1)+'-pin',width,{[PICK_KEY]:JSON.stringify([heldPick])},async(p,r)=>{
 const chosen=width===320?hub.daily:hub.game,url=hub.route+'?from=pin-qa&from=second';await goto(p,url);
 const button=p.locator('[data-hub-game="'+chosen.path+'"] [data-game-pick="'+chosen.path+'"]');await button.waitFor({state:'visible'});await button.scrollIntoViewIfNeeded();await idle(p);
 const before=await allStorage(p),witness=await footerWitness(button);
 assert(witness.button.width>=43.5&&witness.button.height>=43.5);assert(witness.hitOwn&&witness.buttonInside,'Pin must be an unobstructed native hit inside its card');
 assert(witness.overlap<=0.5,'Pin and readable action do not overlap');assert(witness.footerOverflow<=1&&witness.actionOverflow<=1,'Footer text stays readable');
 if(width===1280){await button.focus();await p.keyboard.press('Enter');}else await tap(p,r,button);
 assert.equal(new URL(p.url()).pathname+new URL(p.url()).search,url);assert.equal(await button.getAttribute('aria-pressed'),'true');
 assert.deepEqual(JSON.parse(await save(p,PICK_KEY)),[heldPick,chosen.path]);protect(before,await allStorage(p),[PICK_KEY]);await photo(p,r,'[data-hub-game="'+chosen.path+'"]');
 await tap(p,r,p.locator('a[href="/"]').first());await p.waitForURL(u=>u.pathname==='/');await p.locator('[data-home-picks]').waitFor();
 assert.deepEqual(await p.locator('[data-home-picks] a[data-game-pick-link]').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),[heldPick,chosen.path]);
 await p.goBack();await p.waitForURL(u=>u.pathname+u.search===url);await button.waitFor();assert.equal(await button.getAttribute('aria-pressed'),'true');
 await tap(p,r,button);assert.deepEqual(JSON.parse(await save(p,PICK_KEY)),[heldPick]);protect(before,await allStorage(p),[PICK_KEY]);
 await p.reload();await answerConsent(p,{wait:1000});await button.waitFor();assert.equal(await button.getAttribute('aria-pressed'),'false');assert.deepEqual(new URL(p.url()).searchParams.getAll('from'),['pin-qa','second']);
 r.observed={chosen,footer:witness,exactHomePaths:[heldPick,chosen.path],afterUnpin:[heldPick],nativeBackAndReload:true,keyboardPin:width===1280};
});
}finally{await browser.close();}
assert.deepEqual(await inventory(),m.distBefore);for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);
for(const[name,f]of Object.entries(m.fixtures))assert.equal(sha(await fs.readFile(dir+'/'+f.file)),f.sha256,name);
report.sourceHeld=true;report.distHeld=true;report.publicAssets=Object.fromEntries([...observedAssets].sort(([a],[b])=>a<b?-1:a>b?1:0));report.status=report.contexts.length===23&&report.contexts.every(r=>r.status==='passed')&&report.screenshots.length===23&&new Set(report.screenshots).size===23&&(!publicMode||report.contexts.every(r=>r.assetBodies.length>0))?'passed':'failed';
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'passed');
console.log('expansionFeaturesBrowser: twenty-three controlled native journeys and twenty-three normal screenshots passed.');
