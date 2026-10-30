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
import {createLeagueCustody} from './scLeagueBrowserCustody.mjs';

assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_BROWSER_OUT||'serieb-release-artifacts/browser');
const META='qa/sc-serieb-release-v1/PRODUCT-SOURCE-READY.json',PRODUCT_PIN='cb58cb7e52774942283d6f7a349b50fc7da6cbc9f0aac5148401a85935b65e3f';
const KEY='soccerCareerSave',NOW=1791586800000,LABEL='Serie B',GUEST='SteadyVolley-18';
const sha=value=>createHash('sha256').update(value).digest('hex'),copy=value=>structuredClone(value);
const custody=createLeagueCustody({ROOT,OUT,league:'SB'});
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
assert.match(PRODUCT_PIN,/^[0-9a-f]{64}$/,'Final product manifest pin must be bound');
const metaRaw=fs.readFileSync(META);assert.equal(sha(metaRaw),PRODUCT_PIN,'Exact product manifest');
const meta=JSON.parse(metaRaw);
const selected=meta.files??meta.productFiles;assert(Array.isArray(selected)&&selected.length===8,'Eight product bodies');
function held(){return Object.fromEntries(selected.map(row=>{const body=fs.readFileSync(row.path);assert.equal(sha(body),row.sha256,'Source held '+row.path);return[row.path,sha(body)];}));}
const report={status:'STARTED',sourceBefore:held(),cases:[],copiedControls:[],scope:'Three actual Soccer Career route journeys from a genuine constructor/youth/initial-contract acceptance. The preceding fixture steps run actual APIs in Node. The senior season is played through the page. Fictional career outcomes, no real result claim.'};
report.compiledReceiptSHA256=custody.receiptSHA256;const flush=()=>json('report',report);flush();
let browser,host,hostLog='';
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
try{
 const oracle=path.join(OUT,'oracle.cjs');
 const result=await build({stdin:{contents:"export * as E from './src/lib/soccerCareerEngine';export * as S from './src/lib/soccerCareerSave';export * as P from './src/data/soccerCareerClubPool';export {SOCCER,buildSoccerSeasonCtx} from './src/lib/season/soccer';export {deriveSeason,tableAt} from './src/lib/season/core';export {settleLoadedMoments} from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracle,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
 json('oracle-metafile',result.metafile);
 const inputs=Object.keys(result.metafile.inputs).filter(file=>file.startsWith('src/')).map(file=>({file,sha256:sha(fs.readFileSync(file))}));json('oracle-source-inputs',inputs);
 const B=createRequire(path.join(ROOT,'package.json'))(oracle),{E,S}=B;
 for(const [name,value]of Object.entries({initCareer:E.initCareer,advanceYouthYear:E.advanceYouthYear,acceptOffer:E.acceptOffer,advanceProSeason:E.advanceProSeason,repair:E.repairCareer,serialize:S.serializeSoccerCareerSave,parse:S.parseSoccerCareerSave,guard:S.isSoccerCareerSave,ctx:B.buildSoccerSeasonCtx,derive:B.deriveSeason,table:B.tableAt}))assert.equal(typeof value,'function','Existing API '+name);
 const added=B.P.CAREER_CLUB_POOL.filter(club=>club.league===LABEL&&B.P.CAREER_POOL_SINCE[club.name]===2026),ids=new Set(added.map(club=>club.id));
 assert.equal(added.length,20,'Actual generated new twenty');
 function taped(seed,action){const random=Math.random,now=Date.now,draws=[];let n=seed>>>0;const next=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;try{return{value:action(),draws,next:next()};}finally{Math.random=random;Date.now=now;}}
 function normalize(value){const parsed=S.parseSoccerCareerSave(S.serializeSoccerCareerSave(value));assert(S.isSoccerCareerSave(parsed),'Official save shape');const current=E.repairCareer(parsed);B.settleLoadedMoments(current);return current;}
 let fixture;
 const attempts=[];
 for(let seed=1;seed<=512&&!fixture;seed++){
  const run=taped(seed,()=>{
   const stats={pace:42,shooting:42,passing:42,dribbling:42,defending:42,physical:42,reflexes:42};
   const initial=E.initCareer('League Release','Italy','CM','2020s',stats,42,2025,E.FALLBACK_CLUBS,null,60);
   const youth=E.advanceYouthYear(initial,E.FALLBACK_CLUBS);
   assert.equal(youth.age,17);assert.equal(youth.seasons.at(-1).year,2026);assert.equal(youth.phase,'contract_offer');
   const offered=youth.pendingOffers.find(offer=>ids.has(offer.club.id));
   if(!offered)return{initial,youth,offered:null};
   assert(youth.overall<56,'Actual low-OVR youth uses existing tier3/4/4 rule');
   const signed=normalize(E.acceptOffer(youth,offered));
   assert.equal(signed.phase,'playing');assert.equal(signed.currentClub,offered.club.name);assert.equal(signed.currentLeague,LABEL);
   return{initial,youth,offered,signed};
  });
  attempts.push({seed,overall:run.value.youth.overall,phase:run.value.youth.phase,offerIds:run.value.youth.pendingOffers.map(offer=>offer.club.id),draws:run.draws.length,next:run.next,selected:run.value.offered?.club.id??null});
  if(run.value.offered)fixture={seed,...run};
 }
 json('fixture-search',attempts);assert(fixture,'Bounded genuine youth-offer search found a new SerieB club');
 assert.equal(sha(S.serializeSoccerCareerSave(normalize(fixture.value.signed))),sha(S.serializeSoccerCareerSave(fixture.value.signed)),'Official normalization stable');
 json('fixture',fixture);
 const fonts=custody.fonts();
 let BASE=process.env.BASE;
 if(BASE){const url=new URL(BASE);assert(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash,'Owned loopback BASE');BASE=url.origin;}
 else{
  const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(error=>error?reject(error):resolve(p));});});
  BASE='http://127.0.0.1:'+port;host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned host startup timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned host exit '+code)));});
 }
 browser=await pw.chromium.launch({headless:true});
 const eq=(a,b,label)=>assert.deepEqual(a,b,label);
 function validateFrame(observation){assert.equal(observation.frame,'20 clubs · 38 matchdays · 3 points for a win','SB_FRAME');}
 function validateCells(actual,expected){eq(actual,expected,'SB_TABLE_CELLS');}
 function validateSaved(actual,expected){assert.equal(actual,expected,'SB_SAVE_BYTES');}
 function validateTape(actual,expected){eq(actual.draws,expected.draws,'SB_ACTION_DRAWS');assert.equal(actual.next,expected.next,'SB_NEXT_DRAW');}
  function validateWindow(value){eq([value.afterHelp,value.afterBack],[value.beforeHelp,value.beforeBack],'SB_WINDOW_POSITION');}
  function validateLeague(value){assert.equal(value.saved,LABEL,'SB_LEAGUE_IDENTITY');assert.equal(value.context,LABEL,'SB_LEAGUE_IDENTITY');assert(value.kickoffHeader.split(' · ').includes(LABEL),'SB_LEAGUE_IDENTITY');}
 for(const profile of[{width:320,height:568},{width:390,height:844},{width:1280,height:900}].filter(p=>!custody.only||String(p.width)===custody.only)){
  const arm={id:String(profile.width),profile,status:'STARTED',checks:[],captures:[],geometry:[],errors:[],consoleErrors:[],assetErrors:[],unknown:[],fixtures:[],cosmeticFlags:[],telemetry:[]};report.cases.push(arm);flush();
  const initial=S.serializeSoccerCareerSave(fixture.value.signed),context=await browser.newContext({viewport:profile,hasTouch:profile.width<768,isMobile:profile.width<768,serviceWorkers:'block',colorScheme:'dark',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:initial},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:GUEST},{name:'seasonCentre:help',value:'1'}]}]}});
  let page,closing=false;
  const raw=()=>page.evaluate(key=>localStorage.getItem(key),KEY);
   const windowPosition=()=>page.evaluate(()=>({x:window.scrollX,y:window.scrollY}));
  const check=(condition,label)=>{arm.checks.push({ok:!!condition,label});assert(condition,arm.id+': '+label);};
  try{
   await context.addInitScript(now=>{const Old=Date;window.Date=class extends Old{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
   await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url()),method=request.method();
    if(url.origin===BASE){assert(['GET','HEAD'].includes(method),'Local host read-only');return route.continue();}
    if(method==='GET'&&fonts.has(url.href))return route.fulfill({status:200,...fonts.get(url.href),headers:{'access-control-allow-origin':'*'}});
    if(method==='GET'&&url.hostname==='flagcdn.com'&&request.resourceType()==='image'&&/^(?:\/w(?:20|40|80)\/[a-z]{2}\.png|\/[a-z]{2}\.svg)$/.test(url.pathname)&&!url.search){arm.cosmeticFlags.push(url.href);return route.fulfill({status:200,contentType:'image/svg+xml',body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>')});}
    const headers={'access-control-allow-origin':BASE,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,prefer,content-profile','access-control-allow-methods':'GET,POST,OPTIONS'};
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(method)){arm.fixtures.push({method,path:url.pathname});return route.fulfill({status:method==='OPTIONS'?204:200,headers,contentType:'application/json',body:method==='OPTIONS'?'':Buffer.from('[]')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/game_completions'&&!url.search&&['POST','OPTIONS'].includes(method)){
     if(method==='OPTIONS')return route.fulfill({status:204,headers,body:''});
     const body=request.postDataJSON();eq(body,{game:'soccer-career',player_name:GUEST},'Exact actual Next action telemetry');arm.telemetry.push({url:url.href,method,body,status:201,localFixture:true});return route.fulfill({status:201,headers,contentType:'application/json',body:Buffer.from('[]')});
    }
    arm.unknown.push({url:url.href,method,type:request.resourceType()});return route.abort();
   });
   await context.routeWebSocket('**/*',socket=>{arm.unknown.push({url:socket.url(),method:'WEBSOCKET'});socket.close();});
   page=await context.newPage();page.setDefaultTimeout(15000);custody.attach(page,BASE,arm);
   page.on('pageerror',error=>arm.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')arm.consoleErrors.push(message.text());});
   page.on('requestfailed',request=>{if(!closing&&request.url().startsWith(BASE+'/assets/'))arm.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
   page.on('response',response=>{if(response.url().startsWith(BASE+'/assets/')&&response.status()>=400)arm.assetErrors.push({url:response.url(),status:response.status()});});
   async function settle(locator,label,scroll=false){
    if(scroll)await locator.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
    const value=await locator.evaluate(async element=>{let last='',stable=0,v;const start=performance.now();do{await new Promise(requestAnimationFrame);const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);v={rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},painted:!!hit&&(hit===element||element.contains(hit)),finite:document.getAnimations().filter(a=>(a.playState==='running'||a.pending)&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,fonts:document.fonts.status,inner:innerWidth,scroll:document.documentElement.scrollWidth,scale:visualViewport?.scale??1};const signature=JSON.stringify(v);stable=signature===last?stable+1:1;last=signature;if(stable>=4&&v.fonts==='loaded'&&!v.finite)break;}while(performance.now()-start<8000);return{...v,stable,elapsedMs:performance.now()-start};});
    arm.geometry.push({label,...value});check(value.stable>=4&&value.fonts==='loaded'&&!value.finite,label+': bounded finite animation/fonts settle');check(Math.abs(value.inner-profile.width)<=1&&value.scroll<=profile.width+1&&Math.abs(value.scale-1)<.01,label+': requested viewport/no horizontal overflow');return value;
   }
   async function activate(locator,label,beforeAction){const v=await settle(locator,label,true);check(v.rect.width>=43.5&&v.rect.height>=43.5&&v.painted,label+':44px painted action');if(beforeAction)await beforeAction();if(profile.width<768)await locator.tap();else{await locator.focus();await locator.press('Enter');}}
   async function capture(name,target){
    await settle(target,name);const file=arm.id+'-'+name+'.png',saved=await raw();await page.screenshot({path:path.join(OUT,file)});
     const rawSaveFile=arm.id+'-'+name+'-save.json';json(arm.id+'-'+name+'-save',{raw:saved,sha256:sha(saved)});
     arm.captures.push({file,sha256:sha(fs.readFileSync(path.join(OUT,file))),rawSaveFile,rawSaveFileSHA256:sha(fs.readFileSync(path.join(OUT,rawSaveFile))),rawSaveSHA256:sha(saved),phase:S.parseSoccerCareerSave(saved).phase,url:page.url()});flush();
   }
   async function startTape(seed){await page.evaluate(seed=>{window.__serieBRandom=Math.random;window.__serieBDraws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const value=draw();window.__serieBDraws.push(value);return value;};window.__serieBNext=draw;},seed);}
   async function stopTape(){return page.evaluate(()=>{Math.random=window.__serieBRandom;return{draws:window.__serieBDraws,next:window.__serieBNext()};});}
   const week=()=>page.locator('[data-week-by-week]:visible');
   await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded',timeout:60000});await custody.consent(page,arm);await week().waitFor({timeout:45000});
   const first=await raw();await page.reload({waitUntil:'domcontentloaded'});await week().waitFor();await settle(week(),'initial career');
   const before=await raw();validateSaved(first,before);const input=S.parseSoccerCareerSave(before);
   check(input.phase==='playing'&&input.currentClub===fixture.value.offered.club.name&&input.currentLeague===LABEL,'Actual route loaded the genuine accepted new club');check((await page.locator('main').innerText()).includes(input.currentClub),'Actual page names the accepted new employer');await capture('signed',week());
   let expected,seasonSeed;const seasonSearch=[];
   for(let seed=1;seed<=256&&!expected;seed++){
    const run=taped(seed,()=>E.advanceProSeason(copy(input),E.FALLBACK_CLUBS)),row=run.value.seasons.at(-1);
    const healthy=row?.type==='playing'&&row.club===input.currentClub&&row.year===2027&&row.apps>0&&!row.injurySevere&&row.leagueSize===20&&row.leagueWorld?.members.length===20&&row.leagueWorld.league===LABEL;
    seasonSearch.push({seed,club:row?.club,year:row?.year,apps:row?.apps,severe:!!row?.injurySevere,size:row?.leagueSize,field:row?.leagueWorld?.members.length,accepted:!!healthy});
    if(healthy){expected=run;seasonSeed=seed;}
   }
   json(arm.id+'-season-search',seasonSearch);check(!!expected,'Actual engine supplies a healthy complete first senior2027 season');
   const weekTarget=await settle(week(),'advance to actual season',true);check(weekTarget.rect.width>=43.5&&weekTarget.rect.height>=43.5&&weekTarget.painted,'Actual Week by week44px painted action');await startTape(seasonSeed);
   const telemetry=page.waitForResponse(response=>response.url()==='https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/game_completions'&&response.request().method()==='POST',{timeout:15000});telemetry.catch(()=>{});
   if(profile.width<768)await week().tap();else await week().click();
   await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before},{timeout:20000});
   const afterRaw=await raw(),tape=await stopTape(),actual=S.parseSoccerCareerSave(afterRaw);check((await telemetry).status()===201,'Next action local telemetry completed');
   json(arm.id+'-actual-season',{inputRaw:before,input,seasonSeed,expected,actualRaw:afterRaw,actual,tape});
   validateTape(tape,expected);validateSaved(afterRaw,S.serializeSoccerCareerSave(expected.value));check(actual.seasons.length===input.seasons.length+1,'Exactly one actual senior row added');
   const row=actual.seasons.at(-1),ctx=B.buildSoccerSeasonCtx(actual,E.FALLBACK_CLUBS,row),derived=B.deriveSeason(B.SOCCER,row,ctx);assert(derived,'Actual new-club season derives');const table=B.tableAt(derived,derived.games.length);
   check(derived.mode==='table'&&derived.teams===20&&derived.games.length===38&&row.year===2027&&row.club===fixture.value.offered.club.name&&row.leagueWorld?.league===LABEL&&ctx.league?.name===LABEL,'Actual saved Serie B season derives20/38');
   check(row.leagueWorld.members.length===20&&new Set(row.leagueWorld.members).size===20,'Saved field contains20 unique actual clubs');
   check(table.length===20&&table.every(r=>r.w+r.d+r.l===38&&r.pts===3*r.w+r.d),'Full20-row table applies3/1/0 over38 games');
   const opponents=derived.games.map(game=>derived.labels[game.opp].name),counts=Object.values(opponents.reduce((all,name)=>(all[name]=(all[name]??0)+1,all),{}));
   check(counts.length===19&&counts.every(n=>n===2),'All19 actual opponents played twice');
   json(arm.id+'-derived-season',{row,ctx,derived,table,opponents});
   await page.locator('[data-kickoff]:visible').waitFor({timeout:30000});
   await custody.associate(page,arm);const frame={frame:await page.locator('[data-frame-line]:visible').innerText()};arm.frame=frame;validateFrame(frame);
    arm.leagueIdentity={saved:row.leagueWorld.league,context:ctx.league?.name??null,kickoffHeader:await page.locator('[data-kickoff]:visible > div:first-child > div:nth-child(2)').innerText()};validateLeague(arm.leagueIdentity);flush();
   await capture('kickoff',page.locator('[data-frame-line]:visible'));
    arm.windowPositionRoundtrip={scope:'Root window only, after driver preposition and before the actual action; not inner fixtures or table scrolling'};flush();
   const help=page.getByRole('button',{name:'How the Season Centre works',exact:true});await activate(help,'season rules',async()=>{arm.windowPositionRoundtrip.beforeHelp=await windowPosition();flush();});
   const sheet=page.locator('[data-season-help]');await sheet.waitFor();arm.helpRenderedText=await sheet.innerText();flush();check(/worked examples/i.test(arm.helpRenderedText),'Rules and worked examples are reachable');
   await page.keyboard.press('Escape');await sheet.waitFor({state:'detached'});check(await page.locator('[data-season-centre]:visible').count()===1,'Help Escape returns to the existing season');
    arm.windowPositionRoundtrip.afterHelp=await windowPosition();flush();
   validateSaved(await raw(),afterRaw);
   if(profile.width<768){
    await activate(page.locator('[data-centre-fixtures]:visible'),'full phone fixtures');
    eq(await page.locator('[data-centre-stage] [data-fixture-name]').allTextContents(),opponents,'All38 phone fixtures match actual saved field');
    await activate(page.locator('[data-centre-stage]').getByRole('button',{name:'← Back',exact:true}),'fixtures Back');
   }else eq(await page.locator('[data-fixture-name]').allTextContents(),opponents,'All38 desktop fixtures match actual saved field');
   await activate(page.locator('[data-kickoff]:visible').getByRole('button',{name:'⏭ Straight to the final table',exact:true}),'final table');
   await page.locator('[data-review]:visible').waitFor();
   const own=table.findIndex(r=>r.slot===0),start=profile.width<768?Math.max(0,Math.min(own-2,table.length-5)):0;
   const wantedCells=table.slice(start,profile.width<768?start+5:table.length).map((entry,index)=>[String(start+index+1),derived.labels[entry.slot].key,String(entry.w),String(entry.d),String(entry.l),String(entry.gf)+'-'+String(entry.ga),String(entry.gf-entry.ga>0?'+':'')+String(entry.gf-entry.ga),String(entry.pts)]);
   const cells=()=>page.locator('[data-centre-table]:visible [data-club]').evaluateAll(rows=>rows.map(row=>[...row.children].map(cell=>cell.textContent.trim())));
   await settle(page.locator('[data-review-finish]:visible'),'final result');const actualCells=await cells();validateCells(actualCells,wantedCells);
   check(actualCells.length===(profile.width<768?5:20),'Compact phone5 or complete desktop20 table');
   check((await page.locator('[data-review-finish]:visible').innerText()).includes('of 20'),'Actual season review states the20-club finish');
   await capture('final-table',page.locator('[data-review-finish]:visible'));validateSaved(await raw(),afterRaw);
    
   await activate(page.locator('[data-centre-exit]:visible'),'close season',async()=>{arm.windowPositionRoundtrip.beforeBack=await windowPosition();flush();});await page.locator('[data-season-centre]').waitFor({state:'detached'});
    arm.windowPositionRoundtrip.afterBack=await windowPosition();flush();validateWindow(arm.windowPositionRoundtrip);
   validateSaved(await raw(),afterRaw);await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-open-season-replays]:visible').waitFor({timeout:45000});
   validateSaved(await raw(),afterRaw);eq(S.parseSoccerCareerSave(await raw()).seasons.at(-1),row,'Official reload retains exact played row');
   await activate(page.locator('[data-open-season-replays]:visible'),'reopen saved season');
   await activate(page.locator('[data-replay-row]:visible').first(),'actual recorded season');
   await page.locator('[data-kickoff]:visible').waitFor();
   arm.reloadedLeagueIdentity={saved:S.parseSoccerCareerSave(await raw()).seasons.at(-1).leagueWorld?.league??null,context:ctx.league?.name??null,kickoffHeader:await page.locator('[data-kickoff]:visible > div:first-child > div:nth-child(2)').innerText()};validateLeague(arm.reloadedLeagueIdentity);flush();
    await activate(page.locator('[data-kickoff]:visible').getByRole('button',{name:'⏭ Straight to the final table',exact:true}),'reloaded final table');
   await page.locator('[data-review]:visible').waitFor();await settle(page.locator('[data-review-finish]:visible'),'reloaded result');
   validateCells(await cells(),wantedCells);validateSaved(await raw(),afterRaw);await capture('reloaded-table',page.locator('[data-review-finish]:visible'));
   arm.frame=frame;arm.visibleCells=actualCells;arm.expectedVisibleCells=wantedCells;arm.resultRow=row;arm.actionTape=tape;arm.rawSaveSHA256=sha(afterRaw);
   check(arm.captures.length===4&&arm.telemetry.length===1,'Four retained captures and one actual season action');
   check(!arm.errors.length&&!arm.consoleErrors.length&&!arm.assetErrors.length&&!arm.unknown.length,'No page/console/local asset/unknown network failures');
   await custody.associate(page,arm);arm.status='PASSED';flush();
  }catch(error){
   arm.status='FAILED';arm.error={name:error.name,message:error.message,stack:error.stack};
   if(page){try{arm.failureState={url:page.url(),rawSave:await raw(),storage:await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),htmlFile:arm.id+'-failure.html'};fs.writeFileSync(path.join(OUT,arm.failureState.htmlFile),await page.content());arm.failureState.htmlSHA256=sha(fs.readFileSync(path.join(OUT,arm.failureState.htmlFile)));}catch(readError){arm.failureReadError=String(readError);}flush();try{const file=arm.id+'-failure.png';await page.screenshot({path:path.join(OUT,file)});arm.failurePNG={file,sha256:sha(fs.readFileSync(path.join(OUT,file)))};}catch(captureError){arm.failureCaptureError=String(captureError);}}
   try{await custody.associate(page,arm);}catch(associationError){arm.associationError=String(associationError);error=associationError;}flush();throw error;
  }finally{closing=true;await context.close();}
 }
 const sample=report.cases[0];
 function copied(name,original,change,validate,pattern){
  const changed=copy(original),before=JSON.stringify(original);change(changed);const raw=JSON.stringify(changed);assert.notEqual(sha(raw),sha(before),'Changed copied observation');
  json('copied-'+name+'-before',original);json('copied-'+name+'-changed',changed);let refusal='';try{validate(changed);}catch(error){refusal=error.message;}assert.match(refusal,pattern,'Specific copied cause');
  const restored=JSON.parse(before);assert.equal(JSON.stringify(restored),before);validate(restored);json('copied-'+name+'-restored',restored);report.copiedControls.push({name,scope:'COPIED observed browser/engine evidence only',beforeSHA256:sha(before),changedSHA256:sha(raw),restoredSHA256:sha(JSON.stringify(restored)),specificRefusal:refusal});
 }
 copied('frame',sample.frame,x=>{x.frame='19 clubs · 36 matchdays · 3 points for a win';},validateFrame,/SB_FRAME/);
 copied('table-cell',sample.visibleCells,x=>{x[0][7]=String(Number(x[0][7])+1);},x=>validateCells(x,sample.expectedVisibleCells),/SB_TABLE_CELLS/);
 copied('action-draws',sample.actionTape,x=>{x.draws.push(.5);},x=>validateTape(x,sample.actionTape),/SB_ACTION_DRAWS/);
 const reloadedRaw=JSON.parse(fs.readFileSync(path.join(OUT,sample.id+'-reloaded-table-save.json'),'utf8')).raw;
 copied('reload-bytes',{actual:reloadedRaw,expected:reloadedRaw},x=>{x.actual+=' ';},x=>validateSaved(x.actual,x.expected),/SB_SAVE_BYTES/);
  copied('window-position',sample.windowPositionRoundtrip,x=>{x.afterBack.y+=1;},validateWindow,/SB_WINDOW_POSITION/);
   copied('league-identity',sample.leagueIdentity,x=>{x.saved='Serie A';},validateLeague,/SB_LEAGUE_IDENTITY/);
 assert.equal(report.cases.length,3);assert(report.cases.every(row=>row.status==='PASSED'&&row.captures.length===4));assert.equal(report.copiedControls.length,6);
 report.sourceAfter=held();eq(report.sourceAfter,report.sourceBefore,'All selected product bodies held');report.status='PASSED';flush();
 console.log('SERIEB_BROWSER: 3 actual routes, 12 captures, genuine new-club contract, 2027 season, 20-club/38-game tables and official reload, 6 COPIED guards passed');
}catch(error){report.status='FAILED';report.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=custody.exit(error);flush();}
finally{if(browser)await browser.close();if(host)host.kill();fs.writeFileSync(path.join(OUT,'host.log'),hostLog);report.custodySourceAfter=custody.sources();report.sourceAfter=held();flush();}
