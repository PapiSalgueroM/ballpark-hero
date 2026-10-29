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

assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_FOCUS_BROWSER_OUT||'manager-focus-artifacts/browser');
const KEY='soccerCareerSave',NOW=1791586800000,GUEST='SteadyVolley-18';
const sha=value=>createHash('sha256').update(value).digest('hex'),copy=value=>structuredClone(value),plain=value=>JSON.parse(JSON.stringify(value));
const SOURCE_PINS=[{"path":"src/lib/soccerCareerEngine.ts","bytes":552601,"sha256":"479369c8de4d117bfa2f90ad50b15f9f3b7ff7d4cfc4423b857dec2ce97977bf"},{"path":"src/lib/soccerCareerManagerJobReview.ts","bytes":9889,"sha256":"cea147457b7623667e6eec105c7f09013f16f0c38b75cfdc6f59af626540a042"},{"path":"src/hooks/useSoccerManagerJobReview.ts","bytes":1896,"sha256":"09977cb473d582faad39865cd35b1a938a7a1beac193297fcf6d185365604aa7"},{"path":"src/pages/SoccerCareer.tsx","bytes":281708,"sha256":"f22a1e472aa7f3c6a540b03ae9b46e1050b9c8d48aa2a3544ade0a4166475da3"},{"path":"src/lib/soccerCareerManagerFocus.ts","bytes":2697,"sha256":"597174857adbed8e8d314b9c5e372a120e124d880b9a601022a7fbdd2230b4a3"},{"path":"src/components/soccer-career/SoccerManagerSeasonFocus.tsx","bytes":3780,"sha256":"aa5be1f16ffdd20c52226a84a2a0017923d4fd28e82bb031e6c33eb27200a5a0"},{"path":"scripts/qa/buildSoccerManagerJobReviewObserver.mjs","bytes":5569,"sha256":"5f55381175f31e705c520bfb37dc4e9ca725d7ecbd1f09ece3de4a0b084da89c"},{"path":"src/test/fixtures/soccerManagerFocus.before.json","bytes":280689,"sha256":"3448808ddadc15cc89ab7384db232d30243916d3612443938996a7b930025420"}];
const FIXTURE='src/test/fixtures/soccerManagerFocus.before.json';
const script=new URL(import.meta.url);
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
const selfBefore=sha(fs.readFileSync(script));
function held(){return SOURCE_PINS.map(pin=>{const body=fs.readFileSync(pin.path);assert.equal(body.length,pin.bytes,'Source bytes '+pin.path);assert.equal(sha(body),pin.sha256,'Source held '+pin.path);return pin;});}
function tree(dir){const rows=[];function walk(at){for(const entry of fs.readdirSync(at,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(at,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile(),'Regular dist bodies only');const body=fs.readFileSync(file);rows.push({path:path.relative(dir,file).replaceAll('\\','/'),bytes:body.length,sha256:sha(body)});}}}walk(dir);return rows;}
const distBefore=tree(path.join(ROOT,'dist'));
assert(distBefore.length>0,'Existing detached built dist');
const report={status:'STARTED',sourceBefore:held(),scriptSHA256:selfBefore,distBefore,cases:[],copiedControls:[],scope:'Actual Soccer Career route on three viewports from exact admitted manager raws. Node uses the current canonical selection/season/job authorities. Twelve normal viewport originals. No live or complete-page accessibility claim; cosmetic flags are offline placeholders. Module initialization is excluded and unmeasured.'};
const flush=()=>json('report',report);flush();
let browser,host,hostLog='',fontPins=[],oracleInputs=[];
function heldFonts(){for(const pin of fontPins)assert.equal(sha(fs.readFileSync(pin.path)),pin.sha256,'Font input held '+pin.path);return fontPins;}
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
try{
 const oracle=path.join(OUT,'oracle.cjs');
 const result=await build({stdin:{contents:"export * as E from './src/lib/soccerCareerEngine';export * as S from './src/lib/soccerCareerSave';export * as F from './src/lib/soccerCareerManagerFocus';export * as J from './src/lib/soccerCareerManagerJobReview';export {settleLoadedMoments} from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracle,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
 json('oracle-metafile',result.metafile);
 const inputs=Object.keys(result.metafile.inputs).filter(file=>file.startsWith('src/')).map(file=>({file,sha256:sha(fs.readFileSync(file))}));oracleInputs=inputs;json('oracle-source-inputs',inputs);
 assert.equal(inputs.filter(row=>row.file==='src/lib/soccerCareerEngine.ts').length,1,'One canonical Engine oracle input');
 const B=createRequire(path.join(ROOT,'package.json'))(oracle),{E,S,F,J}=B;
 for(const[name,value]of Object.entries({repair:E.repairCareer,serialize:S.serializeSoccerCareerSave,parse:S.parseSoccerCareerSave,guard:S.isSoccerCareerSave,setFocus:J.setManagerSeasonFocus,advance:J.advanceReviewedManagerSeason,readFocus:F.readManagerSeasonFocus,readJob:J.readManagerJobReview}))assert.equal(typeof value,'function','Actual API '+name);
 await E.loadManagerMarket();
 function taped(seed,action){const random=Math.random,now=Date.now,draws=[];let n=seed>>>0;const next=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;try{return{value:action(),draws,next:next()};}finally{Math.random=random;Date.now=now;}}
 function parsed(raw){const value=S.parseSoccerCareerSave(raw);assert(S.isSoccerCareerSave(value),'Actual official saved state');return value;}
 function normalize(raw){const value=E.repairCareer(parsed(raw));B.settleLoadedMoments(value);return value;}
 const fixture=JSON.parse(fs.readFileSync(FIXTURE,'utf8')),original=fixture.actors.employedRaw,initialState=normalize(original),initial=S.serializeSoccerCareerSave(initialState);
 assert.equal(initialState.phase,'manager_season');assert(!initialState.managerState.unemployed);assert(!J.readManagerJobReview(initialState,E.FALLBACK_CLUBS)?.enabled);assert(!Object.prototype.hasOwnProperty.call(initialState,'managerSeasonFocus'));
 json('admitted-manager-fixture',{source:fixture.source,originalRaw:original,originalRawSHA256:sha(original),officialNormalizedRaw:initial,officialNormalizedState:initialState,scope:'Actual admitted actor. Official repair and moment normalization are recorded, with no invented phase, age, club, ratings or manager state.'});
 const nationalOriginal=fixture.actors.nationalRaw,nationalState=normalize(nationalOriginal),nationalRaw=S.serializeSoccerCareerSave(nationalState);
 assert.equal(nationalState.phase,'manager_season');assert(!nationalState.managerState.unemployed);assert(nationalState.managerState.seasonResults.some(row=>Array.isArray(row.table)&&row.table.length>0),'Actual admitted national manager has played tables');assert(!Object.prototype.hasOwnProperty.call(nationalState,'managerSeasonFocus'));
 json('admitted-played-manager-fixture',{source:fixture.source,originalRaw:nationalOriginal,originalRawSHA256:sha(nationalOriginal),officialNormalizedRaw:nationalRaw,officialNormalizedState:nationalState,scope:'Exact admitted nationalRaw, including genuine existing manager history and table rows. No fabricated panel height, DOM or career fields.'});
 const pendingSource=J.setManagerJobReview(normalize(fixture.actors.jobCandidateRaw),E.FALLBACK_CLUBS,true),pendingAttempts=[];let pendingFixture;
 for(let seed=850000;seed<850256&&!pendingFixture;seed++){
  const input=copy(pendingSource),before=S.serializeSoccerCareerSave(input),run=taped(seed,()=>J.advanceReviewedManagerSeason(input,E.FALLBACK_CLUBS)),read=J.readManagerJobReview(run.value,E.FALLBACK_CLUBS);
  pendingAttempts.push({seed,season:run.value.managerState.season,pending:!!read?.pending,draws:run.draws.length,next:run.next});assert.equal(S.serializeSoccerCareerSave(input),before,'Pending acquisition input held');
  if(read?.pending){const raw=S.serializeSoccerCareerSave(run.value),state=normalize(raw);assert(J.readManagerJobReview(state,E.FALLBACK_CLUBS)?.pending,'Earned decision survives official load');pendingFixture={seed,inputRaw:before,input,run,raw:S.serializeSoccerCareerSave(state),state};}
 }
 json('pending-search',pendingAttempts);assert(pendingFixture,'Bounded canonical earned job-decision acquisition');
 const pendingRefusal=taped(890001,()=>{const selected=J.setManagerSeasonFocus(pendingFixture.state,E.FALLBACK_CLUBS,'cup'),advanced=J.advanceReviewedManagerSeason(pendingFixture.state,E.FALLBACK_CLUBS);assert.equal(selected,pendingFixture.state,'Pending canonical choice refusal');assert.equal(advanced,pendingFixture.state,'Pending canonical advance refusal');return{selected,advanced};});
 assert.deepEqual(pendingRefusal.draws,[]);assert.equal(S.serializeSoccerCareerSave(pendingFixture.state),pendingFixture.raw);json('earned-pending-fixture',{...pendingFixture,refusal:pendingRefusal,scope:'Explicit actual review-mode API, then an actual canonically earned approach. No pending record injection.'});
 assert.equal(typeof process.env.FREE_KICK_FONT_CACHE,'string','Required admitted font cache');
 const fontManifest=JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8'));assert(Array.isArray(fontManifest));
 const fonts=new Map(fontManifest.map(row=>{const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,row.file));assert.equal(sha(body),row.sha256,'Font body');return[row.url,{body,contentType:row.contentType}];}));assert(fonts.size>0);fontPins=[{path:path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),sha256:sha(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json')))},...fontManifest.map(row=>({path:path.join(process.env.FREE_KICK_FONT_CACHE,row.file),sha256:row.sha256}))];report.fontBefore=heldFonts();json('font-inputs',fontManifest);
 let BASE=process.env.BASE;
 if(BASE){const url=new URL(BASE);assert(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash,'Owned loopback BASE');BASE=url.origin;}
 else{
  const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(error=>error?reject(error):resolve(p));});});
  BASE='http://127.0.0.1:'+port;host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned host startup timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned host exit '+code)));});
 }
 browser=await pw.chromium.launch({headless:true});
 function validateSaved(actual,expected){assert.equal(actual,expected,'MF_SAVE_BYTES');}
 function validateState(actual,expected){assert.deepEqual(actual,plain(expected),'MF_COMPLETE_STATE');}
 function validateTape(actual,expected){assert.deepEqual(actual.draws,expected.draws,'MF_ACTION_DRAWS');assert.equal(actual.next,expected.next,'MF_NEXT_DRAW');}
 function validateRow(actual,expected){assert.deepEqual(actual,plain(expected),'MF_PLAYED_ROW');assert.equal(actual.focus,'league','MF_PLAYED_ROW');}
 function validateGeometry(value){assert(value.rect.width>=43.5&&value.rect.height>=43.5&&value.painted,'MF_ACTION_GEOMETRY');}
 function validateWindow(value){assert.deepEqual([value.afterHelp,value.afterBack],[value.beforeHelp,value.beforeBack],'MF_WINDOW_POSITION');}
 function validateDisabledNext(value){
  assert(value.disabled===true&&value.disabledAttribute===true,'MF_DISABLED_NEXT_DISABLED');
  assert(value.visible&&value.display!=='none'&&value.visibility==='visible'&&Number.isFinite(value.opacity)&&value.opacity>0,'MF_DISABLED_NEXT_VISIBLE');
  assert(Array.isArray(value.ancestorStyles)&&value.ancestorStyles.length>0&&value.ancestorStyles.every(style=>style.display!=='none'&&style.visibility==='visible'&&Number.isFinite(style.opacity)&&style.opacity>0),'MF_DISABLED_NEXT_VISIBLE');
  assert(value.rect.width>=43.5&&value.rect.height>=43.5,'MF_DISABLED_NEXT_GEOMETRY');
  assert(value.viewport.width===value.requested.width&&value.viewport.height===value.requested.height&&value.rect.left>=0&&value.rect.right<=value.viewport.width&&value.rect.top>=0&&value.rect.bottom<=value.viewport.height,'MF_DISABLED_NEXT_VIEWPORT');
  assert(value.pointerEvents==='none'?value.hitIsImmediateParent:value.hitIsSelf||value.hitIsDescendant,'MF_DISABLED_NEXT_UNOBSCURED');
 }
 function validatePending(value){assert.equal(value.focusDisabled,true,'MF_PENDING_UI_REFUSAL');assert.equal(value.nextDisabled,true,'MF_PENDING_UI_REFUSAL');validateSaved(value.after,value.before);assert.deepEqual(value.tape.draws,[],'MF_PENDING_UI_REFUSAL');}
 function validatePlayedPanelWindow(value){
  const before=value.before;assert(before.y>0&&before.painted&&before.targetFullyVisible,'MF_PLAYED_PANEL_SCROLL_PRECONDITION');
  for(const stage of ['afterOpen','afterHelp','afterHelpBack','afterClose']){const current=value[stage];assert.deepEqual([current.x,current.y],[before.x,before.y],'MF_PLAYED_PANEL_WINDOW '+JSON.stringify({stage,beforeY:before.y,afterY:current.y,beforeHeight:before.documentHeight,afterHeight:current.documentHeight,beforeMaxY:before.maxScrollY,afterMaxY:current.maxScrollY}));}
  assert(value.focus.eventual&&value.focus.stableFrames>=4,'MF_PLAYED_PANEL_OPENER_FOCUS');validateSaved(value.rawAfter,value.rawBefore);
 }
 for(const profile of[{width:320,height:568},{width:390,height:844},{width:1280,height:900}]){
  const arm={id:String(profile.width),profile,status:'STARTED',checks:[],captures:[],geometry:[],actions:[],errors:[],consoleErrors:[],assetErrors:[],unknown:[],fixtures:[],cosmeticFlags:[],telemetry:[]};report.cases.push(arm);flush();
  let context,page,closing=false;
  const raw=()=>page.evaluate(key=>localStorage.getItem(key),KEY),windowPosition=()=>page.evaluate(()=>({x:window.scrollX,y:window.scrollY}));
  const check=(condition,label)=>{arm.checks.push({ok:!!condition,label});assert(condition,arm.id+': '+label);};
  async function open(saved,label){
   context=await browser.newContext({viewport:profile,hasTouch:profile.width<768,isMobile:profile.width<768,serviceWorkers:'block',colorScheme:'dark',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:saved},{name:'cookie-consent',value:'essential'},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:GUEST}]}]}});closing=false;
   await context.addInitScript(now=>{const Old=Date;window.Date=class extends Old{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
   await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url()),method=request.method();
    if(url.origin===BASE){assert(['GET','HEAD'].includes(method),'Local host read-only');return route.continue();}
    if(method==='GET'&&fonts.has(url.href))return route.fulfill({status:200,...fonts.get(url.href),headers:{'access-control-allow-origin':'*'}});
    if(method==='GET'&&url.hostname==='flagcdn.com'&&request.resourceType()==='image'&&/^(?:\/w(?:20|40|80)\/[a-z]{2}\.png|\/[a-z]{2}\.svg)$/.test(url.pathname)&&!url.search){arm.cosmeticFlags.push(url.href);return route.fulfill({status:200,contentType:'image/svg+xml',body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>')});}
    const headers={'access-control-allow-origin':BASE,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,prefer,content-profile','access-control-allow-methods':'GET,POST,OPTIONS'};
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(method)){arm.fixtures.push({method,path:url.pathname});return route.fulfill({status:method==='OPTIONS'?204:200,headers,contentType:'application/json',body:method==='OPTIONS'?'':Buffer.from('[]')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/game_completions'&&!url.search&&['POST','OPTIONS'].includes(method)){if(method==='OPTIONS')return route.fulfill({status:204,headers,body:''});const body=request.postDataJSON();assert.deepEqual(body,{game:'soccer-career',player_name:GUEST},'Exact known telemetry fixture');arm.telemetry.push({url:url.href,method,body,status:201,localFixture:true});return route.fulfill({status:201,headers,contentType:'application/json',body:Buffer.from('[]')});}
    arm.unknown.push({url:url.href,method,type:request.resourceType()});return route.abort();
   });
   await context.routeWebSocket('**/*',socket=>{arm.unknown.push({url:socket.url(),method:'WEBSOCKET'});socket.close();});
   page=await context.newPage();page.setDefaultTimeout(15000);
   page.on('pageerror',error=>arm.errors.push({label,error:String(error)}));page.on('console',message=>{if(message.type()==='error')arm.consoleErrors.push({label,text:message.text()});});
   page.on('requestfailed',request=>{if(!closing&&request.url().startsWith(BASE+'/assets/'))arm.assetErrors.push({label,url:request.url(),error:request.failure()?.errorText});});
   page.on('response',response=>{if(response.url().startsWith(BASE+'/assets/')&&response.status()>=400)arm.assetErrors.push({label,url:response.url(),status:response.status()});});
   await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('heading',{name:'📋 Manager Career',exact:true}).waitFor({timeout:45000});await page.waitForLoadState('networkidle');validateSaved(await raw(),saved);
  }
  async function settle(locator,label){
   const value=await locator.evaluate(async element=>{let last='',stable=0,v;const start=performance.now();do{await new Promise(requestAnimationFrame);const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);v={rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},painted:!!hit&&(hit===element||element.contains(hit)),finite:document.getAnimations().filter(a=>(a.playState==='running'||a.pending)&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,fonts:document.fonts.status,inner:innerWidth,scroll:document.documentElement.scrollWidth,scale:visualViewport?.scale??1};const signature=JSON.stringify(v);stable=signature===last?stable+1:1;last=signature;if(stable>=4&&v.fonts==='loaded'&&!v.finite)break;}while(performance.now()-start<8000);return{...v,stable,elapsedMs:performance.now()-start};});
   arm.geometry.push({label,...value});check(value.stable>=4&&value.fonts==='loaded'&&!value.finite,label+': bounded finite animations/fonts settle');check(Math.abs(value.inner-profile.width)<=1&&value.scroll<=profile.width+1&&Math.abs(value.scale-1)<.01,label+': requested viewport and no horizontal overflow');return value;
  }
  async function activate(locator,label,beforeAction){
   const before=await windowPosition();await locator.scrollIntoViewIfNeeded();const after=await windowPosition();arm.actions.push({label,driverActionPreposition:{before,after},scope:'Preposition for this user action only, not an initial fold or application scroll claim'});
   const value=await settle(locator,label);validateGeometry(value);if(beforeAction)await beforeAction();if(profile.width<768)await locator.tap();else{await locator.focus();await locator.press('Enter');}
  }
  async function focusState(locator){return locator.evaluate(async element=>{const immediate=document.activeElement===element;let frames=0;const start=performance.now();do{await new Promise(requestAnimationFrame);frames=document.activeElement===element?frames+1:0;if(frames>=4)break;}while(performance.now()-start<8000);return{immediate,eventual:document.activeElement===element,stableFrames:frames,activeText:document.activeElement?.textContent,elapsedMs:performance.now()-start};});}
  async function capture(name,target){
   const geometry=await settle(target,name),file=arm.id+'-'+name+'.png',saved=await raw();await page.screenshot({path:path.join(OUT,file)});const rawSaveFile=arm.id+'-'+name+'-save.json';json(arm.id+'-'+name+'-save',{raw:saved,sha256:sha(saved),state:parsed(saved)});
   arm.captures.push({file,sha256:sha(fs.readFileSync(path.join(OUT,file))),rawSaveFile,rawSaveFileSHA256:sha(fs.readFileSync(path.join(OUT,rawSaveFile))),rawSaveSHA256:sha(saved),phase:parsed(saved).phase,url:page.url(),window:await windowPosition(),targetGeometry:geometry,scope:'Original full viewport without screenshot preposition. Target may continue outside the fold; its actual rectangle is retained.'});flush();
  }
  async function startTape(seed){await page.evaluate(seed=>{window.__focusRandom=Math.random;window.__focusDraws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const value=draw();window.__focusDraws.push(value);return value;};window.__focusNext=draw;},seed);}
  async function stopTape(){return page.evaluate(()=>{Math.random=window.__focusRandom;return{draws:window.__focusDraws,next:window.__focusNext()};});}
  try{
   await open(initial,'normal');const entry=()=>page.getByRole('button',{name:/^Season focus:/}),title=()=>page.getByRole('heading',{name:'Season focus',exact:true});
   await activate(entry(),'open focus');await title().waitFor();const opening=await settle(title(),'automatic opened focus heading');check(opening.painted&&opening.rect.top>=0&&opening.rect.bottom<=profile.height,'Opened focus heading actually painted without driver scrolling');
   check(await title().locator('..').locator('..').locator('button[aria-pressed]').count()===3,'Three compact actual focus choices');validateSaved(await raw(),initial);await capture('choice',title());
   arm.windowRoundtrip={scope:'Actual root-window positions sampled after each action preposition and immediately before Help or Back. No universal no-scroll claim.'};
   await activate(page.getByRole('button',{name:'Season focus help',exact:true}),'focus help',async()=>{arm.windowRoundtrip.beforeHelp=await windowPosition();});
   const help=page.getByRole('region',{name:'Season focus help',exact:true});await help.waitFor();arm.helpText=await help.innerText();check(['50%','47%','53%','not a guaranteed league point'].every(text=>arm.helpText.includes(text)),'Actual named help has the bounded worked example');
   validateSaved(await raw(),initial);await capture('help',help);arm.windowRoundtrip.afterHelp=await windowPosition();flush();
   await activate(help.getByRole('button',{name:'Back',exact:true}),'help Back',async()=>{arm.windowRoundtrip.beforeBack=await windowPosition();});await title().waitFor();await settle(title(),'help Back settled heading');arm.windowRoundtrip.afterBack=await windowPosition();validateWindow(arm.windowRoundtrip);validateSaved(await raw(),initial);
   await activate(title().locator('..').getByRole('button',{name:'Back',exact:true}),'focus Back');await entry().waitFor();arm.backFocus=await focusState(entry());check(arm.backFocus.eventual&&arm.backFocus.stableFrames>=4,'Back restores actual opener focus');validateSaved(await raw(),initial);
   await activate(entry(),'reopen focus');await title().waitFor();const beforeChoice=await raw(),selectionSeed=920000+profile.width,expectedSelection=taped(selectionSeed,()=>J.setManagerSeasonFocus(parsed(beforeChoice),E.FALLBACK_CLUBS,'league'));
   await activate(page.getByRole('button',{name:/^League focus/}),'choose League',()=>startTape(selectionSeed));await page.getByRole('button',{name:'Season focus: League',exact:true}).waitFor();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before:beforeChoice});
   const selectedRaw=await raw(),selectionTape=await stopTape(),selected=parsed(selectedRaw);validateSaved(selectedRaw,S.serializeSoccerCareerSave(expectedSelection.value));validateState(selected,expectedSelection.value);validateTape(selectionTape,expectedSelection);assert.deepEqual(selectionTape.draws,[]);
   arm.selection={seed:selectionSeed,inputRaw:beforeChoice,expected:expectedSelection,actualRaw:selectedRaw,actual:selected,tape:selectionTape};json(arm.id+'-selection',arm.selection);
   await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Season focus: League',exact:true}).waitFor({timeout:45000});await page.waitForLoadState('networkidle');validateSaved(await raw(),selectedRaw);check(F.readManagerSeasonFocus(parsed(await raw()))==='league','Official actual route reload keeps chosen focus');
   let season;const attempts=[];for(let seed=930000;seed<930256&&!season;seed++){const run=taped(seed,()=>J.advanceReviewedManagerSeason(parsed(selectedRaw),E.FALLBACK_CLUBS)),ms=run.value.managerState,row=ms.seasonResults.at(-1),healthy=!ms.unemployed&&run.value.phase==='manager_season'&&row.focus==='league'&&!J.readManagerJobReview(run.value,E.FALLBACK_CLUBS)?.pending;attempts.push({seed,season:ms.season,club:ms.club,unemployed:!!ms.unemployed,healthy});if(healthy)season={seed,...run};}
   json(arm.id+'-season-search',attempts);assert(season,'Bounded actual focused employed season');
   await activate(page.getByRole('button',{name:/^Next Manager Season/}),'play actual focused season',()=>startTape(season.seed));await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before:selectedRaw});
   const playedRaw=await raw(),actionTape=await stopTape(),played=parsed(playedRaw),row=played.managerState.seasonResults.at(-1);validateSaved(playedRaw,S.serializeSoccerCareerSave(season.value));validateState(played,season.value);validateTape(actionTape,season);validateRow(row,season.value.managerState.seasonResults.at(-1));check(!Object.prototype.hasOwnProperty.call(played,'managerSeasonFocus'),'Played season consumes the selected record once');
   await page.getByRole('button',{name:'Season focus: Balanced',exact:true}).waitFor();const used=page.getByText('Preparation used last season: League focus.',{exact:true});await used.waitFor();arm.played={seed:season.seed,inputRaw:selectedRaw,expected:season,actualRaw:playedRaw,actual:played,row,tape:actionTape,usedText:await used.innerText()};json(arm.id+'-played',arm.played);await capture('played',used);
   await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Season focus: Balanced',exact:true}).waitFor({timeout:45000});await used.waitFor();await page.waitForLoadState('networkidle');const reloadRaw=await raw();validateSaved(reloadRaw,playedRaw);validateState(parsed(reloadRaw),played);validateRow(parsed(reloadRaw).managerState.seasonResults.at(-1),row);await capture('reloaded',used);arm.reload={actualRaw:reloadRaw,expectedRaw:playedRaw,row:parsed(reloadRaw).managerState.seasonResults.at(-1)};
   closing=true;await context.close();context=undefined;
   await open(pendingFixture.raw,'pending');const focusButton=page.getByRole('button',{name:'Season focus: Balanced',exact:true}),nextButton=page.getByRole('button',{name:/^Next Manager Season/});
   const pendingBefore=await raw();await nextButton.scrollIntoViewIfNeeded();const disabledSettled=await settle(nextButton,'actual disabled pending Next');
   const disabledGeometry=await nextButton.evaluate((element,requested)=>{
    const r=element.getBoundingClientRect(),style=getComputedStyle(element),parent=element.parentElement,hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2),ancestorStyles=[];
    const identify=node=>node?{tag:node.tagName,id:node.id,className:node.getAttribute('class'),role:node.getAttribute('role'),label:node.getAttribute('aria-label'),text:node.textContent?.trim().slice(0,160)}:null;
    for(let node=element;node;node=node.parentElement){const css=getComputedStyle(node);ancestorStyles.push({tag:node.tagName,id:node.id,display:css.display,visibility:css.visibility,opacity:Number(css.opacity)});}
    return{disabled:element instanceof HTMLButtonElement&&element.disabled,disabledAttribute:element.hasAttribute('disabled'),pointerEvents:style.pointerEvents,display:style.display,visibility:style.visibility,opacity:Number(style.opacity),visible:element.getClientRects().length>0&&ancestorStyles.every(css=>css.display!=='none'&&css.visibility==='visible'&&css.opacity>0),ancestorStyles,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},requested,target:identify(element),immediateParent:identify(parent),hit:identify(hit),hitIsSelf:hit===element,hitIsDescendant:!!hit&&hit!==element&&element.contains(hit),hitIsImmediateParent:!!parent&&hit===parent};
   },profile);arm.disabledNext={settled:disabledSettled,observed:disabledGeometry,scope:'Actual disabled Next. Pointer-events:none requires the centre hit to be the exact immediate parent, never a broad ancestor. No CSS override or forced click.'};flush();validateDisabledNext(disabledGeometry);
   await startTape(940000+profile.width);if(profile.width<768)await page.touchscreen.tap(disabledGeometry.rect.left+disabledGeometry.rect.width/2,disabledGeometry.rect.top+disabledGeometry.rect.height/2);else await page.mouse.click(disabledGeometry.rect.left+disabledGeometry.rect.width/2,disabledGeometry.rect.top+disabledGeometry.rect.height/2);const pendingTape=await stopTape();
   arm.pending={seed:pendingFixture.seed,before:pendingBefore,after:await raw(),focusDisabled:await focusButton.isDisabled(),nextDisabled:await nextButton.isDisabled(),disabledTarget:disabledGeometry,tape:pendingTape,canonicalRefusalDraws:pendingRefusal.draws,scope:'Real pointer on the rendered disabled Next, plus actual disabled focus entry. Central pending authority is independently exercised by the Node oracle and persistent tests.'};validatePending(arm.pending);json(arm.id+'-pending-refusal',arm.pending);
   if(profile.width<768){
    closing=true;await context.close();context=undefined;await open(nationalRaw,'played-table-window');
    const longEntry=()=>page.getByRole('button',{name:'Season focus: Balanced',exact:true}),longTitle=()=>page.getByRole('heading',{name:'Season focus',exact:true});
    arm.playedPanelWindow={status:'STARTED',scope:'Two genuine played-table phone contexts. One legal root-window preposition only, then physical UI actions with no further driver scrolling, fabricated height or frame scrolling.'};flush();
    async function snapshot(locator){return locator.evaluate(element=>{
     const rect=element.getBoundingClientRect(),viewport={width:innerWidth,height:innerHeight};let top=0,bottom=0;
     for(const x of [6,innerWidth/2,innerWidth-6]){for(const e of document.elementsFromPoint(x,1)){const p=getComputedStyle(e).position,r=e.getBoundingClientRect();if((p==='fixed'||p==='sticky')&&r.height>0&&r.height<=innerHeight*.4&&r.top<=2&&r.bottom>0)top=Math.max(top,r.bottom);}for(const e of document.elementsFromPoint(x,innerHeight-2)){const p=getComputedStyle(e).position,r=e.getBoundingClientRect();if((p==='fixed'||p==='sticky')&&r.height>0&&r.height<=innerHeight*.4&&r.bottom>=innerHeight-2&&r.top<innerHeight)bottom=Math.max(bottom,innerHeight-r.top);}}
     const readable={top,bottom:innerHeight-bottom},hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2),panel=element.closest('div.rounded-xl')?.getBoundingClientRect(),documentHeight=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);
     return{x:scrollX,y:scrollY,viewport,documentHeight,maxScrollY:Math.max(0,documentHeight-innerHeight),readable,target:{tag:element.tagName,text:element.textContent,rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}},panel:panel?{top:panel.top,bottom:panel.bottom,height:panel.height,width:panel.width}:null,painted:!!hit&&(hit===element||element.contains(hit)),targetFullyVisible:rect.left>=0&&rect.right<=innerWidth&&rect.top>=readable.top&&rect.bottom<=readable.bottom};
    });}
    async function pointer(locator,label){await settle(locator,label);const geometry=await snapshot(locator);check(geometry.painted&&geometry.targetFullyVisible&&geometry.target.rect.width>=43.5&&geometry.target.rect.height>=43.5,label+': actual fully visible painted44px control without driver reposition');await page.touchscreen.tap(geometry.target.rect.left+geometry.target.rect.width/2,geometry.target.rect.top+geometry.target.rect.height/2);}
    await settle(longEntry(),'played-table source settled before one preposition');
    arm.playedPanelWindow.driverPreposition=await longEntry().evaluate(element=>{const rect=element.getBoundingClientRect(),documentHeight=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),maxScrollY=Math.max(0,documentHeight-innerHeight),documentTop=rect.top+scrollY,requestedY=Math.max(1,Math.min(maxScrollY,documentTop-Math.min(120,Math.floor(innerHeight*.22)))),before={x:scrollX,y:scrollY};window.scrollTo({left:0,top:requestedY,behavior:'instant'});return{before,requestedY,documentTop,documentHeight,maxScrollY,scope:'Initial legal ROOT window preposition only. No DOM or panel-height mutation.'};});
    await settle(longEntry(),'played-table initial visible entry');arm.playedPanelWindow.before=await snapshot(longEntry());arm.playedPanelWindow.rawBefore=await raw();flush();
    assert(arm.playedPanelWindow.before.y>0&&arm.playedPanelWindow.before.painted&&arm.playedPanelWindow.before.targetFullyVisible,'MF_PLAYED_PANEL_SCROLL_PRECONDITION');
    await pointer(longEntry(),'played-table open focus');await longTitle().waitFor();await settle(longTitle(),'played-table focus opened');arm.playedPanelWindow.afterOpen=await snapshot(longTitle());flush();
    await pointer(page.getByRole('button',{name:'Season focus help',exact:true}),'played-table open help');const longHelp=page.getByRole('region',{name:'Season focus help',exact:true});await longHelp.waitFor();await settle(longHelp,'played-table help opened');arm.playedPanelWindow.afterHelp=await snapshot(longHelp);flush();
    await pointer(longHelp.getByRole('button',{name:'Back',exact:true}),'played-table help Back');await longTitle().waitFor();await settle(longTitle(),'played-table choices restored');arm.playedPanelWindow.afterHelpBack=await snapshot(longTitle());flush();
    await pointer(longTitle().locator('..').getByRole('button',{name:'Back',exact:true}),'played-table close focus');await longEntry().waitFor();await settle(longEntry(),'played-table entry restored');arm.playedPanelWindow.afterClose=await snapshot(longEntry());arm.playedPanelWindow.focus=await focusState(longEntry());arm.playedPanelWindow.rawAfter=await raw();flush();
    validatePlayedPanelWindow(arm.playedPanelWindow);arm.playedPanelWindow.status='PASSED';json(arm.id+'-played-panel-window',arm.playedPanelWindow);flush();
   }
   check(arm.captures.length===4&&arm.telemetry.length===0,'Four normal captures and no manager telemetry writes');check(!arm.errors.length&&!arm.consoleErrors.length&&!arm.assetErrors.length&&!arm.unknown.length,'No page/console/local asset/unknown network failures');arm.status='PASSED';flush();
  }catch(error){
   arm.status='FAILED';arm.error={name:error.name,message:error.message,stack:error.stack};
   if(page){try{arm.failureState={url:page.url(),rawSave:await raw(),storage:await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),htmlFile:arm.id+'-failure.html'};fs.writeFileSync(path.join(OUT,arm.failureState.htmlFile),await page.content());arm.failureState.htmlSHA256=sha(fs.readFileSync(path.join(OUT,arm.failureState.htmlFile)));}catch(readError){arm.failureReadError=String(readError);}flush();try{const file=arm.id+'-failure.png';await page.screenshot({path:path.join(OUT,file)});arm.failurePNG={file,sha256:sha(fs.readFileSync(path.join(OUT,file)))};}catch(captureError){arm.failureCaptureError=String(captureError);}}
   flush();throw error;
  }finally{closing=true;if(context)await context.close();}
 }
 function copied(name,original,mutate,validate,cause){
  const changed=copy(original),before=JSON.stringify(changed),restore=mutate(changed),after=JSON.stringify(changed);assert.notEqual(after,before,'COPIED observation actually changed');json('copied-'+name+'-before',original);json('copied-'+name+'-changed',changed);let refusal;
  try{validate(changed);}catch(error){refusal={name:error.name,message:error.message};}assert.equal(refusal?.name,'AssertionError');assert(refusal.message.includes(cause),'Specific COPIED cause '+name);restore();assert.equal(JSON.stringify(changed),before,'Exact SAME copied evidence restored');validate(changed);json('copied-'+name+'-restored',changed);report.copiedControls.push({name,scope:'COPIED actual observations only, no DOM fault or pixel credit',beforeSHA256:sha(before),changedSHA256:sha(after),restoredSHA256:sha(JSON.stringify(changed)),refusal,sameCopyRestored:true});
 }
 const sample=report.cases[0],actionGeometry=sample.geometry.find(value=>value.label==='choose League');
 copied('action-width',actionGeometry,x=>{const old=x.rect.width;x.rect.width=20;return()=>{x.rect.width=old;};},validateGeometry,'MF_ACTION_GEOMETRY');
 copied('action-height',actionGeometry,x=>{const old=x.rect.height;x.rect.height=20;return()=>{x.rect.height=old;};},validateGeometry,'MF_ACTION_GEOMETRY');
 copied('selected-state',sample.selection.actual,x=>{const old=x.managerSeasonFocus.focus;x.managerSeasonFocus.focus='cup';return()=>{x.managerSeasonFocus.focus=old;};},x=>validateState(x,sample.selection.expected.value),'MF_COMPLETE_STATE');
 copied('played-row',sample.played.row,x=>{const old=x.focus;x.focus='cup';return()=>{x.focus=old;};},x=>validateRow(x,sample.played.row),'MF_PLAYED_ROW');
 copied('reload-bytes',{actual:sample.reload.actualRaw,expected:sample.reload.expectedRaw},x=>{const old=x.actual;x.actual+=' ';return()=>{x.actual=old;};},x=>validateSaved(x.actual,x.expected),'MF_SAVE_BYTES');
 copied('action-draws',sample.played.tape,x=>{x.draws.push(.5);return()=>{x.draws.pop();};},x=>validateTape(x,sample.played.expected),'MF_ACTION_DRAWS');
 copied('window-position',sample.windowRoundtrip,x=>{const old=x.afterBack.y;x.afterBack.y+=1;return()=>{x.afterBack.y=old;};},validateWindow,'MF_WINDOW_POSITION');
 copied('pending-refusal',sample.pending,x=>{x.nextDisabled=false;return()=>{x.nextDisabled=true;};},validatePending,'MF_PENDING_UI_REFUSAL');
 copied('disabled-next-occlusion',sample.pending.disabledTarget,x=>{const old={hit:x.hit,hitIsSelf:x.hitIsSelf,hitIsDescendant:x.hitIsDescendant,hitIsImmediateParent:x.hitIsImmediateParent};x.hit={tag:'DIV',id:'copied-occluder',className:null,role:null,label:null,text:'COPIED occlusion observation'};x.hitIsSelf=false;x.hitIsDescendant=false;x.hitIsImmediateParent=false;return()=>{Object.assign(x,old);};},validateDisabledNext,'MF_DISABLED_NEXT_UNOBSCURED');
 const playedWindow=report.cases.find(arm=>arm.profile.width===320).playedPanelWindow;
 copied('played-panel-window-clamp',playedWindow,x=>{const old=x.afterOpen.y;x.afterOpen.y=0;return()=>{x.afterOpen.y=old;};},validatePlayedPanelWindow,'MF_PLAYED_PANEL_WINDOW');
 assert.equal(report.cases.length,3);assert(report.cases.every(arm=>arm.status==='PASSED'&&arm.captures.length===4));assert.equal(report.cases.filter(arm=>arm.playedPanelWindow?.status==='PASSED').length,2);assert.equal(report.copiedControls.length,10);
 report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.equal(sha(fs.readFileSync(script)),selfBefore,'Browser script held');report.distAfter=tree(path.join(ROOT,'dist'));assert.deepEqual(report.distAfter,distBefore,'All built dist bodies held');report.status='PASSED';flush();
 console.log('MANAGER_FOCUS_BROWSER:3 actual routes,12 normal captures,actual choice/help/Back/focus,one canonical played season each,official reload,3 earned pending refusals,2 actual played-panel phone no-jump contexts,10 COPIED guards,source and dist held');
}catch(error){report.status='FAILED';report.error={name:error.name,message:error.message,stack:error.stack};flush();throw error;}
finally{if(browser)await browser.close();if(host)host.kill();fs.writeFileSync(path.join(OUT,'host.log'),hostLog);report.sourceAfter=held();assert.equal(sha(fs.readFileSync(script)),selfBefore,'Browser script held');report.distAfter=tree(path.join(ROOT,'dist'));assert.deepEqual(report.distAfter,distBefore,'All built dist bodies held');report.fontAfter=heldFonts();for(const row of oracleInputs)assert.equal(sha(fs.readFileSync(row.file)),row.sha256,'Oracle input held '+row.file);flush();}
