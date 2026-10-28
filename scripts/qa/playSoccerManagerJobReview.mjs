import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
assert(process.env.CI, 'Manager move native checks run remotely');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_REVIEW_NATIVE_OUT||'manager-review-native-artifacts/browser');
const KEY='soccerCareerSave',NOW=1791586800000,META='qa/sc-manager-job-review-v1/SOURCE-READY.json',PIN='34c8dae8ffc872f9a5275b8c7552f98324d030047c090143fa03df9fa63b0764';
const sha=value=>createHash('sha256').update(value).digest('hex'),copy=value=>structuredClone(value);
fs.mkdirSync(OUT,{recursive:true});
const metaRaw=fs.readFileSync(META);assert.equal(sha(metaRaw),PIN);
const meta=JSON.parse(metaRaw);assert.equal(meta.files.length,10);
const canonicalPins=[
 {path:'src/lib/soccerCareerEngine.ts',sha256:'d7d94a36b796af66914cdf9bd4803cf42b027f423ceb8baac9fb144677de7030'},
 {path:'src/lib/soccerCareerSave.ts',sha256:'b486dfd8c4073230b6967c674058e46c7b56a6afd2a8a165f1e215501205477a'},
 {path:'src/lib/soccerCareerLeague.ts',sha256:'adb5555de0adc046bed402fd7386305baf5ce9e96aba023b6a64541f9785ca68'},
 {path:'src/lib/managerOffers.ts',sha256:'c445ec9427502ff797348527077034d76b9c668b3a4980c8387aaba4ab75e24d'},
 {path:'src/lib/managerJobMarket.ts',sha256:'2df0a3fed4336c23c0bcaa7868a06d63a4cbaa417b3e0e8880e17d8bc879774d'}
];
const held=()=>Object.fromEntries([...meta.files,...canonicalPins].map(row=>{const raw=fs.readFileSync(row.path);assert.equal(sha(raw),row.sha256,row.path);return[row.path,sha(raw)];}));
const report={status:'RUNNING',sourceBefore:held(),cases:[],scope:'Nine actual-route journeys: three viewports, default automatic move and elected Accept or Stay. Real saved-fixture manager inputs, no claim of playing the preceding career.'};
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const flush=()=>json('report',report);flush();
const oracleFile=path.join(OUT,'oracle.cjs');
const bundled=await build({stdin:{contents:"export { manualRetire,repairCareer,choosePostRetirement,advanceManagerSeason,loadManagerMarket,FALLBACK_CLUBS } from './src/lib/soccerCareerEngine';export { parseSoccerCareerSave,serializeSoccerCareerSave } from './src/lib/soccerCareerSave';export { settleLoadedMoments } from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracleFile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
json('oracle-metafile',bundled.metafile);
report.oracleInputs=Object.keys(bundled.metafile.inputs).filter(file=>file.startsWith('src/')).map(file=>({file,sha256:sha(fs.readFileSync(file))}));
assert(!Object.keys(bundled.metafile.inputs).some(file=>file.endsWith('/soccerCareerManagerJobReview.ts')),'Independent canonical oracle has no new review helper');
const E=createRequire(path.join(ROOT,'package.json'))(oracleFile);await E.loadManagerMarket();
function seeded(seed,action){const random=Math.random,oldNow=Date.now,draws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const v=draw();draws.push(v);return v;};Date.now=()=>NOW;try{return{value:action(),draws,next:draw()};}finally{Math.random=random;Date.now=oldNow;}}
const captured=JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json','utf8')).saves.find(row=>row.id==='ere')?.state;assert(captured);
const retired=seeded(901,()=>E.manualRetire({...copy(captured),phase:'playing',retired:false,age:34})).value;
const prepared=seeded(902,()=>E.choosePostRetirement(retired,'manager',E.FALLBACK_CLUBS)).value;
const sourceClub=E.FALLBACK_CLUBS.find(club=>club.name==='Malmo FF');assert(sourceClub);assert(prepared.managerState);
prepared.managerState={...prepared.managerState,club:sourceClub.name,clubTier:sourceClub.tier,league:sourceClub.league,season:2,trophies:1,promotions:2,seasonResults:[]};
json('fixture-preparation',{inputId:'ere',prepared,scope:'Actual manual retirement and manager entry from existing complete recorded career. Manager season2/trophies1/promotions2/source employment are explicit simulation inputs, not a real result.'});
function freshPoach(before,after){const a=before.managerState,b=after.managerState,row=b?.seasonResults.at(-1);return a&&b&&!a.unemployed&&!b.unemployed&&a.club!==b.club&&b.clubTier<a.clubTier&&b.promotions===a.promotions&&b.departure==='poached'&&b.season===a.season+1&&row?.club===a.club&&row.year===b.season&&[3,4].includes(row.playerPos);}
function employment(target,source){for(const field of['club','clubTier','league','departure']){if(Object.hasOwn(source,field))target[field]=source[field];else delete target[field];}}
function assertPendingOwned(actual,canonical,input){
 const pending=actual.managerJobReview?.pending;assert(pending,'PENDING_METADATA');
 for(const field of['club','clubTier','league','departure']){
  assert.equal(actual.managerState[field],input.managerState[field],'PENDING_EMPLOYMENT: '+field);
  assert.equal(Object.hasOwn(actual.managerState,field),Object.hasOwn(input.managerState,field),'PENDING_EMPLOYMENT_PRESENCE: '+field);
  assert.equal(pending.from[field],input.managerState[field],'PENDING_SOURCE: '+field);
  assert.equal(pending.to[field],canonical.managerState[field],'PENDING_DESTINATION: '+field);
 }
 for(const pair of[['hasLeague','league'],['hasDeparture','departure']]){
  assert.equal(pending.from[pair[0]],Object.hasOwn(input.managerState,pair[1]),'PENDING_SOURCE_PRESENCE');
  assert.equal(pending.to[pair[0]],Object.hasOwn(canonical.managerState,pair[1]),'PENDING_DESTINATION_PRESENCE');
 }
 const row=actual.managerState.seasonResults.at(-1),wanted=canonical.managerState.seasonResults.at(-1),old=' And HIRED by '+canonical.managerState.club+'.',replacement=' Job approach from '+canonical.managerState.club+'. Decision pending.';
 assert.equal(wanted.result.split(old).length,2,'CANONICAL_OWNED_FRAGMENT');
 assert.equal(row.result,wanted.result.replace(old,replacement),'PENDING_OWNED_TEXT_ROW');
 assert.equal(actual.events[input.events.length],canonical.events[input.events.length].replace(old,replacement),'PENDING_OWNED_TEXT_EVENT');
 assert.equal(pending.rowResult,wanted.result,'PENDING_CANONICAL_ROW');
 assert.equal(pending.eventResult,canonical.events[input.events.length],'PENDING_CANONICAL_EVENT');
 assert.equal(pending.rowIndex,canonical.managerState.seasonResults.length-1,'PENDING_ROW_ANCHOR');
 assert.equal(pending.eventIndex,input.events.length,'PENDING_EVENT_ANCHOR');
 assert.equal(row.tier,input.managerState.clubTier,'PENDING_PLAYED_TIER');
}
function projectedPending(actual,expected,input){const projected=copy(actual),row=projected.managerState.seasonResults.at(-1),canonical=expected.managerState.seasonResults.at(-1);employment(projected.managerState,expected.managerState);row.tier=canonical.tier;row.result=canonical.result;projected.events[input.events.length]=expected.events[input.events.length];projected.managerJobReview=copy(expected.managerJobReview);return projected;}
function expectedStay(canonical,input){const result=copy(canonical),row=result.managerState.seasonResults.at(-1),from=input.managerState,to=canonical.managerState;employment(result.managerState,from);row.tier=from.clubTier;const old=' And HIRED by '+to.club+'.',replacement=' Stayed with '+from.club+' instead of joining '+to.club+'.';assert.equal(row.result.split(old).length,2);row.result=row.result.replace(old,replacement);assert.equal(result.events[input.events.length].split(old).length,2);result.events[input.events.length]=result.events[input.events.length].replace(old,replacement);return result;}
const fonts=new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8')).map(row=>{const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,row.file));assert.equal(sha(body),row.sha256);return[row.url,{body,contentType:row.contentType}];}));assert(fonts.size>0);
const port=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(error=>error?reject(error):resolve(port));});});
const BASE='http://127.0.0.1:'+port,host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let hostLog='',browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned host startup timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned host exit '+code+': '+hostLog)));});
 browser=await pw.chromium.launch({headless:true});
 for(const profile of[{width:320,height:568},{width:390,height:844},{width:1280,height:900}])for(const mode of['default','accept','stay']){
  const id=profile.width+'-'+mode,arm={id,mode,...profile,status:'STARTED',checks:[],errors:[],consoleErrors:[],assetErrors:[],blocked:[],fixtures:[],cosmeticFlags:[],captures:[],geometry:[]};report.cases.push(arm);flush();
  const initial=E.serializeSoccerCareerSave(copy(prepared));
  const context=await browser.newContext({viewport:profile,hasTouch:profile.width<1000,isMobile:profile.width<1000,serviceWorkers:'block',colorScheme:'dark',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:initial},{name:'cookie-consent',value:'essential'},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:'SteadyVolley-18'}]}]}});
  let page,closing=false;
  const check=(ok,label)=>{arm.checks.push({ok:!!ok,label});assert(ok,id+': '+label);};
  try{
    await context.addInitScript(now=>{const Old=Date;window.Date=class extends Old{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
    await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url()),method=request.method();
     if(url.origin===BASE){assert(['GET','HEAD'].includes(method),'Local server is read-only');return route.continue();}
     if(method==='GET'&&fonts.has(url.href))return route.fulfill({status:200,...fonts.get(url.href)});
     if(method==='GET'&&url.hostname==='flagcdn.com'&&request.resourceType()==='image'&&/^(?:\/w(?:20|40|80)\/[a-z]{2}\.png|\/[a-z]{2}\.svg)$/.test(url.pathname)&&!url.search){arm.cosmeticFlags.push(url.href);return route.fulfill({status:200,contentType:'image/svg+xml',body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>')});}
     if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(method)){arm.fixtures.push({method,path:url.pathname});return route.fulfill({status:method==='OPTIONS'?204:200,headers:{'access-control-allow-origin':BASE,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'GET,OPTIONS','content-type':'application/json'},body:method==='OPTIONS'?'':Buffer.from('[]')});}
     arm.blocked.push({url:url.href,method,type:request.resourceType()});return route.abort();
    });
    await context.routeWebSocket('**/*',socket=>{arm.blocked.push({url:socket.url(),method:'WEBSOCKET'});socket.close();});
    page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>arm.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')arm.consoleErrors.push(message.text());});
    page.on('requestfailed',request=>{if(!closing&&request.url().startsWith(BASE+'/assets/'))arm.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
    page.on('response',response=>{if(response.url().startsWith(BASE+'/assets/')&&response.status()>=400)arm.assetErrors.push({url:response.url(),status:response.status()});});
    const raw=()=>page.evaluate(key=>localStorage.getItem(key),KEY),body=()=>page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.body.style.overflow,locked:document.body.getAttribute('data-scroll-locked')}));
    const activate=async locator=>{if(profile.width<1000)await locator.tap();else{await locator.focus();await locator.press('Enter');}};
    async function reach(locator,label){
     await locator.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>document.fonts.ready);
     const v=await locator.evaluate(async(element,requested)=>{let previous='',stable=0,value;const started=performance.now();do{await new Promise(requestAnimationFrame);const r=element.getBoundingClientRect(),style=getComputedStyle(element),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);value={rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},painted:!!hit&&(hit===element||element.contains(hit)),textFits:element.scrollWidth<=element.clientWidth+1,fonts:document.fonts.status,finite:document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,requested,inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,scale:visualViewport?.scale??1};const signature=JSON.stringify(value);stable=signature===previous?stable+1:1;previous=signature;if(stable>=4&&!value.finite&&value.fonts==='loaded')break;}while(performance.now()-started<8000);const finiteAnimations=document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>{const effect=animation.effect,target=effect?.target;return{name:animation.animationName??null,kind:animation.constructor.name,id:animation.id,playState:animation.playState,currentTime:typeof animation.currentTime==='number'?animation.currentTime:String(animation.currentTime),target:target?{tag:target.tagName??null,id:target.id??null,className:typeof target.className==='string'?target.className:target.getAttribute?.('class')??'',style:target.getAttribute?.('style')??null}:null,relatedToMeasuredTarget:!!(target&&element&&(target===element||target.contains?.(element)||element.contains(target))),timing:effect?.getTiming(),computedTiming:effect?.getComputedTiming(),keyframes:effect?.getKeyframes()};});return{...value,stable,elapsedMs:performance.now()-started,finiteAnimations};},profile);
     arm.geometry.push({label,...v});check(v.stable>=4&&v.fonts==='loaded'&&!v.finite,label+': fonts and finite animation settled');
     check(v.scroll<=profile.width+1&&Math.abs(v.inner-profile.width)<=1&&Math.abs(v.client-profile.width)<=1&&Math.abs(v.scale-1)<.01,label+': requested viewport and no sideways overflow');
     check(v.rect.left>=-.5&&v.rect.right<=profile.width+.5&&v.rect.top>=-.5&&v.rect.bottom<=profile.height+.5&&v.painted&&v.textFits,label+': target visible, painted and text contained');
     check(v.rect.width>=43.5&&v.rect.height>=43.5,label+':44px target');return v;
    }
    async function capture(name,target=null){
     const element=target?await target.elementHandle():null;
     const observed=await page.evaluate(async({requested,element})=>{await document.fonts.ready;let previous='',stable=0,value;const started=performance.now();do{await new Promise(requestAnimationFrame);const r=element?.getBoundingClientRect(),hit=r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2):null;value={requested,inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,scale:visualViewport?.scale??1,fonts:document.fonts.status,finite:document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,target:r?{text:element.textContent,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},inside:r.left>=-.5&&r.right<=requested.width+.5&&r.top>=-.5&&r.bottom<=requested.height+.5,painted:!!hit&&(hit===element||element.contains(hit))}:null};const signature=JSON.stringify(value);stable=signature===previous?stable+1:1;previous=signature;if(stable>=4&&!value.finite&&value.fonts==='loaded')break;}while(performance.now()-started<8000);const finiteAnimations=document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>{const effect=animation.effect,target=effect?.target;return{name:animation.animationName??null,kind:animation.constructor.name,id:animation.id,playState:animation.playState,currentTime:typeof animation.currentTime==='number'?animation.currentTime:String(animation.currentTime),target:target?{tag:target.tagName??null,id:target.id??null,className:typeof target.className==='string'?target.className:target.getAttribute?.('class')??'',style:target.getAttribute?.('style')??null}:null,relatedToMeasuredTarget:!!(target&&element&&(target===element||target.contains?.(element)||element.contains(target))),timing:effect?.getTiming(),computedTiming:effect?.getComputedTiming(),keyframes:effect?.getKeyframes()};});return{...value,stable,elapsedMs:performance.now()-started,finiteAnimations};},{requested:profile,element});
     arm.geometry.push({label:'capture '+name,...observed});check(observed.stable>=4&&!observed.finite&&observed.fonts==='loaded',name+': capture settles');
     check(observed.scroll<=profile.width+1&&Math.abs(observed.inner-profile.width)<=1&&Math.abs(observed.client-profile.width)<=1&&Math.abs(observed.scale-1)<.01,name+': capture requested viewport/no sideways overflow');
     if(observed.target)check(observed.target.inside&&observed.target.painted,name+': newly opened heading visible before observer scroll');
     const file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});arm.captures.push({file,sha256:sha(fs.readFileSync(path.join(OUT,file)))});return observed;
    }
    async function boot(){await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review job moves',exact:true}).waitFor({timeout:45000});await page.evaluate(()=>document.fonts.ready);}
    async function startTape(seed){await page.evaluate(seed=>{window.__managerOldRandom=Math.random;window.__managerDraws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const value=draw();window.__managerDraws.push(value);return value;};window.__managerNext=draw;},seed);}
    async function stopTape(){return page.evaluate(()=>{Math.random=window.__managerOldRandom;return{draws:window.__managerDraws,next:window.__managerNext()};});}
    async function changed(before){await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before},{timeout:10000});return raw();}
    await boot();const first=await raw();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review job moves',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
    const before=await raw();check(first===before,'Two official initial loads stabilize full saved bytes');
    const original=E.parseSoccerCareerSave(before);check(original.phase==='manager_season'&&original.managerState.club===sourceClub.name,'Actual route loaded explicit manager fixture');
    const toggle=page.getByRole('button',{name:'Review job moves',exact:true});check(await toggle.getAttribute('aria-pressed')==='false','Old save starts with automatic moves');
    if(mode==='accept'){
      const rules=page.getByRole('button',{name:'Job move rules',exact:true});await reach(rules,'rules opener');await activate(rules);
      const title=page.getByRole('heading',{name:'Review job moves',exact:true});await title.waitFor();await capture('rules',title);
      check((await page.locator('body').innerText()).includes('Example:'),'Rules include a worked example');
      const back=title.locator('..').getByRole('button',{name:'Back',exact:true});await reach(back,'rules Back');await activate(back);
      await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Job move rules');check(await raw()===before,'Help and Back leave complete saved bytes unchanged');
    }
    if(mode!=='default'){await reach(toggle,'review opt-in');await activate(toggle);await changed(before);check(await toggle.getAttribute('aria-pressed')==='true','Review choice is explicitly enabled');}
    const inputRaw=await raw(),input=E.parseSoccerCareerSave(inputRaw);let expected,witnessSeed;
    for(let seed=1;seed<=2048;seed++){const run=seeded(seed,()=>E.advanceManagerSeason(copy(input),E.FALLBACK_CLUBS));if(freshPoach(input,run.value)){expected=run;witnessSeed=seed;break;}}
    check(!!expected,'Canonical authority supplies a genuine earned poach witness');arm.witnessSeed=witnessSeed;
    const next=page.getByRole('button',{name:'Next Manager Season',exact:true});await reach(next,'advance manager season');await startTape(witnessSeed);await activate(next);const afterRaw=await changed(inputRaw),tape=await stopTape(),actual=E.parseSoccerCareerSave(afterRaw);
    json(id+'-season',{inputRaw,input,expected,tape,afterRaw,actual,witnessSeed});
    check(JSON.stringify(tape.draws)===JSON.stringify(expected.draws)&&tape.next===expected.next,'Whole season draw vector and following draw match unchanged engine');
    let wanted=expected.value;
    if(mode==='default'){check(afterRaw===E.serializeSoccerCareerSave(wanted),'Default actual page equals canonical full saved bytes');check(!actual.managerJobReview,'Default save has no added preference');await capture('automatic-result');}
    else{
      const pending=actual.managerJobReview?.pending;check(!!pending,'Earned actual move is pending');assertPendingOwned(actual,expected.value,input);check(actual.managerState.club===input.managerState.club&&actual.managerState.clubTier===input.managerState.clubTier&&actual.managerState.seasonResults.at(-1).tier===input.managerState.clubTier,'Pending keeps the original employer and played tier');check((await page.locator('body').innerText()).includes('national-team call'),'National call remains settled');
      check(pending.to.club===expected.value.managerState.club&&pending.to.clubTier===expected.value.managerState.clubTier&&pending.from.club===input.managerState.club,'Pending facts bind actual canonical employers');
      check(E.serializeSoccerCareerSave(projectedPending(actual,expected.value,input))===E.serializeSoccerCareerSave(expected.value),'Only owned employment row text/tier and pending metadata differ from complete canonical season');
      check(await next.isDisabled(),'Next season is disabled while choice is pending');check(await toggle.isDisabled(),'Mode cannot change while choice is pending');
      const title=page.getByRole('heading',{name:'Review job moves',exact:true});await title.waitFor();const revealed=await capture('pending-first-view',title);
      check(revealed.target&&revealed.target.rect.top>=0&&revealed.target.rect.bottom<=profile.height,'Pending heading is visible at its actual first reveal');
      const pendingBefore=await raw();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Accept move',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
      const repairedPending=E.repairCareer(copy(actual));E.settleLoadedMoments(repairedPending);const reloadedPending=await raw();
      check(reloadedPending===E.serializeSoccerCareerSave(repairedPending),'Pending metadata survives official parse repair reload');check(await page.getByRole('button',{name:'Next Manager Season',exact:true}).isDisabled(),'Reload keeps next year blocked');
      json(id+'-pending-reload',{before:pendingBefore,after:reloadedPending,expected:E.serializeSoccerCareerSave(repairedPending)});
      if(profile.width===320)await capture('pending-reloaded');
      const choice=mode==='accept'?page.getByRole('button',{name:'Accept move',exact:true}):page.getByRole('button',{name:'Stay at '+input.managerState.club,exact:true});
      await reach(choice,mode+' choice');await startTape(1777);const beforeChoice=await raw();await activate(choice);const resolvedRaw=await changed(beforeChoice),decisionTape=await stopTape(),resolved=E.parseSoccerCareerSave(resolvedRaw);
      const noDraw=seeded(1777,()=>null);check(decisionTape.draws.length===0&&decisionTape.next===noDraw.next,'Choice consumes zero draws and preserves following draw');
      const canonicalLoaded=E.repairCareer(copy(expected.value));E.settleLoadedMoments(canonicalLoaded);wanted=mode==='accept'?canonicalLoaded:expectedStay(canonicalLoaded,input);
      check(resolvedRaw===E.serializeSoccerCareerSave(wanted),'Resolved complete saved bytes equal canonical outcome plus explicit Stay presentation only');check(!resolved.managerJobReview.pending,'Choice resolves exactly once');
      check(JSON.stringify(resolved.managerState.nationalTeamOffer)===JSON.stringify(expected.value.managerState.nationalTeamOffer),'National outcome remains canonical');
      check(!await page.getByRole('button',{name:'Next Manager Season',exact:true}).isDisabled(),'Next manager season becomes available again');await capture('resolved-result');json(id+'-decision',{resolvedRaw,resolved,wanted,decisionTape});
    }
    const settled=await raw();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Review job moves',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
    const loaded=E.repairCareer(copy(wanted));E.settleLoadedMoments(loaded);const reloaded=await raw();check(reloaded===E.serializeSoccerCareerSave(loaded),'Final official reload preserves complete selected outcome');json(id+'-final-reload',{before:settled,after:reloaded,expected:E.serializeSoccerCareerSave(loaded)});
    check(arm.errors.length===0&&arm.consoleErrors.length===0&&arm.assetErrors.length===0&&arm.blocked.length===0,'No page console local asset errors or unknown external traffic');arm.status='PASSED';flush();
  }catch(error){arm.status='FAILED';arm.failure={name:error.name,message:error.message,stack:error.stack};if(page){arm.url=page.url();arm.lastRaw=await page.evaluate(key=>localStorage.getItem(key),KEY).catch(()=>null);try{fs.writeFileSync(path.join(OUT,id+'-failure.html'),await page.content());await page.screenshot({path:path.join(OUT,id+'-failure.png')});}catch(captureError){arm.captureError=captureError.message;}}flush();throw error;
  }finally{closing=true;await context.close();}
 }
 report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);
 assert.equal(report.cases.length,9);assert(report.cases.every(row=>row.status==='PASSED'));
 const witnessFile=path.join(OUT,'320-accept-season.json'),witnessRaw=fs.readFileSync(witnessFile),witness=JSON.parse(witnessRaw);report.copiedDiagnosticControls=[];
 for(const kind of['pending-owned-text','pending-employment']){
  const value=copy(witness.actual);
  if(kind==='pending-owned-text')value.managerState.seasonResults.at(-1).result=witness.expected.value.managerState.seasonResults.at(-1).result;
  else value.managerState.league='COPIED_WRONG_LEAGUE';
  assert.notEqual(JSON.stringify(value),JSON.stringify(witness.actual),'COPIED_CONTROL_CHANGED');
  let caught;try{assertPendingOwned(value,witness.expected.value,witness.input);}catch(error){caught=error;}
  const expected=kind==='pending-owned-text'?'PENDING_OWNED_TEXT_ROW':'PENDING_EMPLOYMENT';
  assert(caught&&caught.message.includes(expected),'INTENDED_COPIED_CONTROL: '+kind);
  json('copied-'+kind,{scope:'COPIED_DIAGNOSTIC_ONLY',value,rejection:caught.message});
  assertPendingOwned(witness.actual,witness.expected.value,witness.input);
  report.copiedDiagnosticControls.push({kind,scope:'COPIED_DIAGNOSTIC_ONLY',changed:true,specificRejection:caught.message,originalReadmitted:true});
 }
 assert.equal(sha(fs.readFileSync(witnessFile)),sha(witnessRaw),'Actual pending evidence held');
 report.status='PASSED';report.totalChecks=report.cases.reduce((sum,row)=>sum+row.checks.length,0);flush();
 process.stdout.write('Nine actual manager job move route journeys passed.\n');
}catch(error){report.status='FAILED';report.failure={name:error.name,message:error.message,stack:error.stack};flush();throw error;}
finally{if(browser)await browser.close();host.kill();fs.writeFileSync(path.join(OUT,'host.log'),hostLog);}
