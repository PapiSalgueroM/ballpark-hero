import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
const arg=(n,f)=>{const i=process.argv.indexOf(n);return i<0?f:process.argv[i+1];};
for(const n of ['--out','--fixtures'])assert(process.argv.includes(n),n+' required');
const BASE=arg('--base-url',process.env.BASE||'http://127.0.0.1:4173'),OUT=path.resolve(arg('--out')),DIR=path.resolve(arg('--fixtures')),DIST=path.resolve(arg('--dist','dist')),scope=arg('--scope','all');
const origin=new URL(BASE).origin,loopback=url=>['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname);
assert(loopback(BASE));assert(['all','hub-home','app-scroll-control'].includes(scope));
await fs.mkdir(OUT,{recursive:true});assert.equal((await fs.readdir(OUT)).length,0,'Use a fresh browser output directory');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),manifest=JSON.parse(await fs.readFile(path.join(DIR,'manifest.json'),'utf8'));
assert.equal(manifest.schema,1);assert.equal(manifest.appMode,scope==='app-scroll-control'?'original-control':'fixed');
assert.deepEqual(manifest.hubs.map(h=>h.route),['/soccer','/pro-basketball','/pro-football']);assert.deepEqual(manifest.careers.map(c=>c.label),['NBA','NFL']);assert(manifest.careers.every(c=>c.rows===1));
assert.deepEqual(manifest.sourceBefore,manifest.sourceAfter);
for(const [file,digest]of Object.entries(manifest.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,'Source association '+file);
assert.equal(sha(await fs.readFile(path.join(DIR,manifest.bundle))),manifest.bundleSHA);
const engine=await import(pathToFileURL(path.join(DIR,manifest.bundle)).href);
async function distRows(){
 const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(DIST,rel),{withFileTypes:true})){
  const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(DIST,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}
 await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
const distBefore=await distRows();assert.deepEqual(distBefore,manifest.distBefore);assert.equal(sha(JSON.stringify(distBefore)),manifest.distDigest);
await fs.writeFile(path.join(OUT,'dist-before.json'),JSON.stringify(distBefore,null,2)+'\n');
await fs.writeFile(path.join(OUT,'source-association.json'),JSON.stringify({appMode:manifest.appMode,source:manifest.sourceAfter,distDigest:manifest.distDigest,bundleSHA:manifest.bundleSHA},null,2)+'\n');
const report={status:'incomplete',scope,source:manifest.sourceAfter,distDigest:manifest.distDigest,contexts:[],screenshots:[],
 limits:'Controlled engine saves and fresh guest App interactions. No natural-career, balance, public-site, native OS IME, worst-streak or actual-font pixel claim.',
 transport:'All external HTTP requests and WebSockets aborted. Full request, response, failure, abort and console receipts retained. No network fixture replies.',
 fixtureInstrumentation:'Career-only transparent Storage call observer delegates unchanged arguments to the original setter/remover. Stadium uses native Storage quota, not a wrapped writer. Browser clocks and RNG remain native.'};
const widths=[320,390,430,1440],heights={320:844,390:844,430:932,1440:900};
const knownOrigins=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function press(page,row,locator){if(row.width<768)await locator.tap();else await locator.click();}
async function fit(page,selector){
 return page.locator(selector).evaluateAll(nodes=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
  nodes:nodes.map(n=>{const b=n.getBoundingClientRect();return {text:n.textContent?.replace(/\s+/g,' ').trim(),x:b.x,right:b.right,y:b.y,bottom:b.bottom,width:b.width,height:b.height,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth};})}));
}
async function photo(page,row,name,selector){
 if(selector)await page.locator(selector).first().scrollIntoViewIfNeeded();await idle(page);
 const geometry=await fit(page,selector||'#dukb-main');row.geometry??={};row.geometry[name]=geometry;
 assert(geometry.scrollWidth<=geometry.clientWidth+1,'No document horizontal overflow');
 assert(geometry.nodes.length&&geometry.nodes.every(n=>n.width>0&&n.x>=-1&&n.right<=geometry.viewport+1),'Actual target contained horizontally');
 const file=row.id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});row.screenshots.push(file);report.screenshots.push(file);
}
async function ready(page){await answerConsent(page,{wait:1000});for(let n=0;n<2&&await page.locator('[role="dialog"][aria-modal="true"]:visible').count();n++)await page.keyboard.press('Escape');await idle(page);}
function resourceRefusal(event,row){
 if(!/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(event.text))return false;
 try{const o=new URL(event.location.url).origin;return knownOrigins.has(o)&&row.aborts.some(a=>a.origin===o);}catch{return false;}
}
const browser=await pw.chromium.launch({headless:true});
async function runCase(id,width,seeds,watchKeys,action){
 const row={id,width,status:'incomplete',requests:[],responses:[],requestFailures:[],aborts:[],webSockets:[],console:[],pageErrors:[],screenshots:[]};report.contexts.push(row);
 const context=await browser.newContext({viewport:{width,height:heights[width]},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,reducedMotion:width===430?'reduce':'no-preference',serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 await context.route('**/*',async route=>{const url=route.request().url(),u=new URL(url);if(!['http:','https:'].includes(u.protocol)||loopback(url))return route.continue();
  row.aborts.push({url,origin:u.origin,method:route.request().method()});await route.abort('blockedbyclient');});
 assert.equal(typeof context.routeWebSocket,'function');
 await context.routeWebSocket('**/*',async socket=>{const url=socket.url();row.webSockets.push({url,action:loopback(url)?'loopback':'aborted'});if(loopback(url))socket.connectToServer();else await socket.close({code:1008,reason:'Offline source QA'});});
 page.on('request',r=>row.requests.push({url:r.url(),method:r.method(),type:r.resourceType()}));
 page.on('response',r=>row.responses.push({url:r.url(),status:r.status()}));
 page.on('requestfailed',r=>row.requestFailures.push({url:r.url(),failure:r.failure()}));
 page.on('pageerror',e=>row.pageErrors.push(String(e.stack||e)));
 page.on('console',m=>row.console.push({type:m.type(),text:m.text(),location:m.location()}));
 await context.addInitScript(({origin,seeds,watchKeys})=>{
  if(location.origin!==origin)return;
  const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  if(!sessionStorage.getItem('popular-qa-seeded')){for(const [key,value]of Object.entries(seeds))set.call(localStorage,key,value);set.call(localStorage,'popular-qa-unrelated','held');sessionStorage.setItem('popular-qa-seeded','1');}
  window.__popularQa={writes:[],removals:[],started:performance.now()};
  if(watchKeys.length){
   Storage.prototype.setItem=function(key,value){if(this===localStorage&&watchKeys.includes(key))window.__popularQa.writes.push({key,value:String(value)});return set.call(this,key,value);};
   Storage.prototype.removeItem=function(key){if(this===localStorage&&watchKeys.includes(key))window.__popularQa.removals.push(key);return remove.call(this,key);};
  }
 },{origin,seeds,watchKeys});
 try{
  await action(page,row);
  assert.equal(await page.evaluate(()=>localStorage.getItem('popular-qa-unrelated')),'held');row.status='pass';
 }catch(e){
  row.status=String(e.message).startsWith('INCOMPLETE:')?'incomplete':'failed';row.error=String(e.stack||e);const file=id+'-failure.png';
  try{await page.screenshot({path:path.join(OUT,file)});row.screenshots.push(file);report.screenshots.push(file);}catch(imageError){row.failureScreenshotError=String(imageError);}
 }finally{
  row.finalUrl=page.url();await context.close();
  row.expectedResourceErrors=row.console.filter(e=>e.type==='error'&&resourceRefusal(e,row));
  row.unexpectedConsoleErrors=row.console.filter(e=>e.type==='error'&&!resourceRefusal(e,row));
  row.undeclaredOrigins=row.aborts.filter(a=>!knownOrigins.has(a.origin));
  row.undeclaredWebSockets=row.webSockets.filter(w=>!loopback(w.url)&&!knownOrigins.has(new URL(w.url).origin.replace(/^ws/,'http')));
  if(row.pageErrors.length||row.unexpectedConsoleErrors.length||row.undeclaredOrigins.length||row.undeclaredWebSockets.length){row.status='failed';row.validationError='Actual page/console/transport events require review; no silent error waiver';}
  await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
}
const paths=page=>page.locator('[data-hub-game]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hub-game')).sort());
async function gameReady(page,label){await page.locator('#dukb-main').waitFor();await page.waitForFunction(label=>{const clean=s=>s.replace(/\W/g,'').toLowerCase().replace(/mycareer/g,'career');return [...document.querySelectorAll('h1')].some(n=>clean(n.textContent).includes(clean(label)));},label);await idle(page);}
async function hub(page,row,h){
 await page.goto(BASE+h.route+'?from=menu&from=second');const input=page.getByRole('textbox',{name:'Search '+h.label+' games'});await input.waitFor();await ready(page);
 assert.deepEqual(await paths(page),h.allPaths);
 await input.scrollIntoViewIfNeeded();const b=await input.boundingBox(),currentY=await page.evaluate(()=>scrollY),absoluteTop=currentY+b.y;
 assert(absoluteTop>=150,'Actual Hub input allows a scrolled native check');const target=Math.min(absoluteTop-50,Math.max(100,absoluteTop-210));
 await page.mouse.wheel(0,target-currentY);await idle(page);
 const box=await input.boundingBox();assert(box&&box.y>=40&&box.y+box.height<heights[row.width]-40,'Actual input visible before native first action');
 await press(page,row,input);const before=await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight}));
 assert(before.y>80,'First scroll check starts away from top');await page.keyboard.press('Space');
 await page.waitForURL(url=>url.searchParams.get('q')===' ');await idle(page);await pause(80);
 const after=await page.evaluate(()=>({y:scrollY,height:document.documentElement.scrollHeight}));row.firstReplace={before,after,url:page.url()};
 assert.deepEqual(await paths(page),h.allPaths,'Whitespace preserves actual catalog');
 assert.equal(after.height,before.height,'First action does not shrink the document');
 assert(Math.abs(after.y-before.y)<=1,'POPULAR_APP_HUB_FIRST_REPLACE_SCROLL: same-path first REPLACE must keep scroll');
 if(scope==='app-scroll-control'){await photo(page,row,'first-scroll','input');return;}
 await press(page,row,page.getByRole('button',{name:'Clear game search'}));assert(await input.evaluate(n=>n===document.activeElement));
 await press(page,row,page.getByRole('button',{name:/^Daily puzzles/}));await input.fill(h.daily.label);await page.waitForURL(url=>url.searchParams.get('q')===h.daily.label);
 assert.deepEqual(await paths(page),h.daily.paths);assert.deepEqual(new URL(page.url()).searchParams.getAll('from'),['menu','second']);
 row.daily={url:page.url(),paths:await paths(page)};
 await press(page,row,page.getByRole('button',{name:/^Careers & sims/}));await input.fill(h.featured.label);await page.waitForURL(url=>url.searchParams.get('q')===h.featured.label);
 assert.deepEqual(await paths(page),h.featured.paths);
 const remembered=page.url();await press(page,row,page.locator('[data-hub-game="'+h.featured.path+'"] h3 a'));await page.waitForURL(url=>url.pathname===h.featured.path);
 await gameReady(page,h.featured.label);assert((await page.evaluate(()=>scrollY))<=1,'Actual game navigation starts at top');
 await page.goBack();await page.waitForURL(url=>url.href===remembered);await input.waitFor();assert.equal(await input.inputValue(),h.featured.label);assert.deepEqual(await paths(page),h.featured.paths);
 row.returned={url:page.url(),paths:await paths(page)};await photo(page,row,'returned','section[aria-label="'+h.label+' game library"]');
}
async function home(page,row){
 await page.goto(BASE+'/');const input=page.getByRole('textbox',{name:'Search games',exact:true});await input.waitFor();await ready(page);
 await input.fill('soccer');await page.locator('[data-home-game-card]').first().waitFor();assert.equal(await input.inputValue(),'soccer');
 row.composition=[];
 for(const probe of [{isComposing:true,keyCode:27},{isComposing:false,keyCode:229}]){
  const actual=await input.evaluate((node,probe)=>{const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true,...probe});node.dispatchEvent(event);return {isComposing:event.isComposing,keyCode:event.keyCode,trusted:event.isTrusted};},probe);
  assert.equal(actual.isComposing,probe.isComposing);assert.equal(actual.keyCode,probe.keyCode);assert.equal(actual.trusted,false);
  row.composition.push({probe,actual,value:await input.inputValue()});assert.equal(await input.inputValue(),'soccer','IME-shaped Escape must preserve real query');
 }
 await input.press('Escape');assert.equal(await input.inputValue(),'');assert(await input.evaluate(n=>n===document.activeElement));
 await input.fill('soccer');await press(page,row,page.getByRole('button',{name:'Clear search',exact:true}));assert.equal(await input.inputValue(),'');assert(await input.evaluate(n=>n===document.activeElement));
 await page.mouse.wheel(0,-10000);await idle(page);await pause(500);
 const first=page.locator('[data-home-game-card] > a').first();await first.waitFor();row.fold={first:await first.boundingBox(),y:await page.evaluate(()=>scrollY)};
 assert(row.fold.y<=1);if(row.width===390)assert(row.fold.first.y<=430,'Existing390px home first-tile floor');
 await photo(page,row,'fold','[aria-label="Search games"]');
 const link=page.locator('[data-home-game-card] > a[href="/soccer-career"]').first();await link.scrollIntoViewIfNeeded();await pause(500);
 if((await page.evaluate(()=>scrollY))<80)await page.mouse.wheel(0,120);await idle(page);
 const target=await link.boundingBox();assert(target&&target.y>=0&&target.y+target.height<heights[row.width],'Home game card visible without a click scroll');
 await page.waitForFunction(()=>Math.abs(Number(sessionStorage.getItem('home-scroll-y'))-scrollY)<=1&&scrollY>50);
 const remembered=await page.evaluate(()=>Number(sessionStorage.getItem('home-scroll-y')));await press(page,row,link);await page.waitForURL(url=>url.pathname==='/soccer-career');await gameReady(page,'Soccer Career');
 assert((await page.evaluate(()=>scrollY))<=1);await page.goBack();await page.waitForURL(url=>url.pathname==='/');await input.waitFor();
 await page.waitForFunction(y=>Math.abs(scrollY-y)<=1,remembered);await pause(300);
 row.homeReturn={remembered,actual:await page.evaluate(()=>scrollY)};assert(Math.abs(row.homeReturn.actual-remembered)<=1,'Existing home return memory');
 await photo(page,row,'home-return');
}

async function career(page,row,c){
 const raw=await fs.readFile(path.join(DIR,c.file),'utf8');assert.equal(sha(raw),c.sha256);
 const snapshot=async()=>{const play=page.getByRole('button',{name:/^Play the \d+ season$/});await play.waitFor({state:'visible'});
  const summary=await play.locator('..').evaluate(node=>[...node.children].find(n=>n.tagName==='P'&&n.textContent?.trim().startsWith('Last season:'))?.textContent?.replace(/\s+/g,' ').trim()??null);
  return {summary,saved:await page.evaluate(key=>localStorage.getItem(key),c.saveKey),operations:await page.evaluate(()=>window.__popularQa)};};
 await page.goto(BASE+c.path);await ready(page);row.first=await snapshot();
 assert.equal(row.first.summary,c.expected);assert.equal(row.first.saved,raw);assert.deepEqual(row.first.operations.writes,[]);assert.deepEqual(row.first.operations.removals,[]);
 await page.reload();await ready(page);row.reloaded=await snapshot();
 assert.equal(row.reloaded.summary,c.expected);assert.equal(row.reloaded.saved,raw);assert.deepEqual(row.reloaded.operations.writes,[]);assert.deepEqual(row.reloaded.operations.removals,[]);
 await page.getByRole('button',{name:/^Play the \d+ season$/}).locator('..').scrollIntoViewIfNeeded();await photo(page,row,'reloaded');
}
async function nativeQuota(page,key){
 return page.evaluate(key=>{
  if(!Storage.prototype.setItem.toString().includes('[native code]'))throw new Error('Stadium quota requires the native Storage API');
  const filler='popular-qa-quota-fill',before=localStorage.getItem(key);let lo=0,hi=8*1024*1024,quotaName=null,probes=0;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);probes++;try{localStorage.setItem(filler,'x'.repeat(mid));lo=mid;}catch(e){if(e.name!=='QuotaExceededError')throw e;quotaName=e.name;hi=mid-1;}}
  let extraRejected=false;try{localStorage.setItem(filler,'x'.repeat(lo+1));}catch(e){if(e.name!=='QuotaExceededError')throw e;quotaName=e.name;extraRejected=true;}
  if(!extraRejected)throw new Error('INCOMPLETE: bounded native quota probe did not exhaust browser storage');
  return {before,characters:lo,probes,quotaName,extraRejected,visible:document.visibilityState,at:performance.now(),nativeStorage:true};
 },key);
}
async function stadium(page,row,room,seed){
 const key=manifest.stadium.saveKey;await page.goto(BASE+'/stadium-tycoon');await page.locator('[data-tap-key]').waitFor({state:'attached'});await ready(page);
 assert(Date.now()-JSON.parse(seed).savedAt<30000,'Fresh real fixture avoids artificial away progression');
 await page.locator('[data-tap-key]').focus();await page.keyboard.press('Enter');
 if(room==='league')await press(page,row,page.locator('[data-room="league"]'));
 row.quota=await nativeQuota(page,key);assert.equal(row.quota.visible,'visible');assert(row.quota.extraRejected&&row.quota.characters>0);
 const notice=page.locator('[data-tycoon-save-notice]');
 row.refusalObserved=await notice.waitFor({state:'visible',timeout:20000}).then(()=>true,()=>false);
 if(!row.refusalObserved)throw new Error('INCOMPLETE: actual Stadium autosave refusal was not witnessed; no synthetic writer fallback');
 row.refusal={room,at:await page.evaluate(()=>performance.now()),disk:await page.evaluate(key=>localStorage.getItem(key),key),text:await notice.textContent()};
 assert(row.refusal.at>=4800,'Real five-second autosave elapsed');assert.equal(row.refusal.disk,row.quota.before);assert(row.refusal.text.includes('not saved on this device'));
 await photo(page,row,'refused','[data-tycoon-save-notice]');
 if(room==='league')await press(page,row,page.locator('[data-room="stadium"]'));
 const cash=page.locator('.font-display.text-gold.tabular-nums').first();
 const readCash=async()=>{const text=(await cash.textContent()).trim();assert(/^[^\d]*\d[\d,.]*$/.test(text),'Fresh fixture has no compact currency suffix');return Number(text.replace(/[^\d.]/g,''));};
 row.cashBeforeTap=await readCash();await page.locator('[data-tap-key]').focus();await page.keyboard.press('Enter');await idle(page);row.cashAfterTap=await readCash();
 assert(row.cashAfterTap>row.cashBeforeTap,'Actual latest native Tap reaches live cash');
 if(room==='league')await press(page,row,page.locator('[data-room="league"]'));
 await page.evaluate(()=>localStorage.removeItem('popular-qa-quota-fill'));
 await press(page,row,notice.getByRole('button',{name:'Retry save',exact:true}));await notice.waitFor({state:'detached'});
 const saved=await page.evaluate(key=>localStorage.getItem(key),key);row.recovered={raw:saved,money:JSON.parse(saved).money,unrelated:await page.evaluate(()=>localStorage.getItem('popular-qa-unrelated'))};
 assert.notEqual(saved,row.quota.before);assert(row.recovered.money>=row.cashAfterTap-0.51,'Retry includes latest rendered live cash, within display rounding');assert.equal(row.recovered.unrelated,'held');
}
try{
 const selectedWidths=scope==='app-scroll-control'?[320]:widths;
 for(const width of selectedWidths)for(const h of scope==='app-scroll-control'?manifest.hubs.slice(0,1):manifest.hubs)
  await runCase('hub-'+h.route.slice(1)+'-'+width,width,{},[],(page,row)=>hub(page,row,h));
 if(scope!=='app-scroll-control')for(const width of widths)await runCase('home-'+width,width,{},[],home);
 if(scope==='all'){
  for(const width of widths)for(const c of manifest.careers){
   const raw=await fs.readFile(path.join(DIR,c.file),'utf8');assert.equal(sha(raw),c.sha256);
   await runCase(c.label.toLowerCase()+'-'+width,width,{[c.saveKey]:raw},[c.saveKey],(page,row)=>career(page,row,c));
  }
  for(const width of widths)for(const room of ['stadium','league']){
   const now=Date.now(),seed=engine.tycoon.serializeTycoon(engine.tycoon.newTycoon(now),now),id='stadium-'+room+'-'+width;
   await fs.writeFile(path.join(OUT,id+'.seed.json'),seed,{flag:'wx'});
   await runCase(id,width,{[manifest.stadium.saveKey]:seed},[],(page,row)=>stadium(page,row,room,seed));
  }
 }
}finally{await browser.close();}
const distAfter=await distRows();await fs.writeFile(path.join(OUT,'dist-after.json'),JSON.stringify(distAfter,null,2)+'\n');assert.deepEqual(distAfter,distBefore,'Same completed dist held');
const sourceAfter=Object.fromEntries(await Promise.all(Object.keys(manifest.sourceAfter).map(async file=>[file,sha(await fs.readFile(file))])));
await fs.writeFile(path.join(OUT,'source-after.json'),JSON.stringify(sourceAfter,null,2)+'\n');assert.deepEqual(sourceAfter,manifest.sourceAfter,'All associated source held');
const expected=scope==='all'?32:scope==='hub-home'?16:1;assert.equal(report.contexts.length,expected);assert.equal(new Set(report.contexts.map(r=>r.id)).size,expected);
report.status=report.contexts.every(r=>r.status==='pass')?'pass':'failed';report.expectedContexts=expected;report.sourceHeld=true;report.distHeld=true;
if(report.status==='pass')assert.equal(report.screenshots.length,scope==='all'?36:scope==='hub-home'?20:1,'Every declared normal screenshot retained');
report.fonts='Fresh guest fallback fonts. Exact aborted resource receipts are expected only for declared origins. No actual-font or worst-streak claim.';
await fs.writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
assert.equal(report.status,'pass','Every requested actual-App context must pass; failures/incomplete cases are retained in report.json');
console.log('popularPagesBrowser: '+expected+' actual-App contexts passed; '+report.screenshots.length+' screenshots retained for Root visual review.');
