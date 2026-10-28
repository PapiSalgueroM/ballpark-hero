// Remote-only actual route. Coursework/legacy phase are explicit saved-fixture inputs.
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
assert(process.env.CI,'Coaching native checks run remotely');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_COACHING_BROWSER_OUT||'coaching-start-artifacts/native');
const KEY='soccerCareerSave',NOW=1791586800000,META='qa/soccer-career-coaching-start-v1/SOURCE-READY.json',PIN='73f0282fba85e4dd5454b5dcec01c3bfa96366f4170d898f9d82a41e2bc565da';
const sha=value=>createHash('sha256').update(value).digest('hex'),copy=value=>structuredClone(value);
const sameManagerState=(actual,expected)=>JSON.stringify(actual.managerState)===JSON.stringify(expected.managerState);
fs.mkdirSync(OUT,{recursive:true});
const metaRaw=fs.readFileSync(META);assert.equal(sha(metaRaw),PIN);
const meta=JSON.parse(metaRaw);assert.equal(meta.files.length,17);
const held=()=>Object.fromEntries(meta.files.map(row=>{const raw=fs.readFileSync(row.path);assert.equal(sha(raw),row.sha256,row.path);return[row.path,sha(raw)];}));
const report={status:'RUNNING',sourceBefore:held(),cases:[],controls:[],scope:'Eight actual-page viewport/retirement-phase journeys, each with fresh default and selected-club arms. No second-tab or same-instance replacement claim.'};
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const flush=()=>json('report',report);
flush();
const oracleFile=path.join(OUT,'oracle.cjs');
const bundled=await build({stdin:{contents:"export { manualRetire,repairCareer,choosePostRetirement,FALLBACK_CLUBS } from './src/lib/soccerCareerEngine';export { parseSoccerCareerSave,serializeSoccerCareerSave } from './src/lib/soccerCareerSave';export { settleLoadedMoments } from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracleFile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
json('oracle-metafile',bundled.metafile);
report.oracleInputs=Object.keys(bundled.metafile.inputs).filter(file=>file.startsWith('src/')).map(file=>({file,sha256:sha(fs.readFileSync(file))}));
assert(report.oracleInputs.some(row=>row.file==='src/lib/soccerCareerEngine.ts'));assert(!Object.keys(bundled.metafile.inputs).some(file=>file.endsWith('/soccerCareerCoachingStart.ts')),'Canonical oracle does not import the new implementation');
const E=createRequire(path.join(ROOT,'package.json'))(oracleFile);
function seeded(seed,action){const random=Math.random,oldNow=Date.now,draws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const v=draw();draws.push(v);return v;};Date.now=()=>NOW;try{return{value:action(),draws,next:draw()};}finally{Math.random=random;Date.now=oldNow;}}
const captured=JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json','utf8')).saves.find(row=>row.id==='ere')?.state;assert(captured);
const prepared=seeded(118900,()=>E.manualRetire({...copy(captured),phase:'playing',retired:false,age:34}));
assert.equal(prepared.value.phase,'retirement_ceremony');assert.equal(prepared.value.retired,true);
json('fixture-preparation',{inputId:'ere',input:captured,prepared,scope:'Existing complete saved career, actual manualRetire callback. Playing/age34 input, reviewed coursework flag3 and legacy direct post_retirement presentation phase are controlled fixture preconditions, not a newly played progression.'});
const fonts=new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8')).map(row=>{const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,row.file));assert.equal(sha(body),row.sha256);return[row.url,{body,contentType:row.contentType}];}));assert(fonts.size>0);
const port=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(error=>error?reject(error):resolve(port));});});
const BASE='http://127.0.0.1:'+port,host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let hostLog='',browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned host startup timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned host exit '+code+': '+hostLog)));});
 browser=await pw.chromium.launch({headless:true});
 for(const profile of[{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:1440,height:900}])for(const phase of['retirement_ceremony','post_retirement']){
  const row={id:profile.width+'-'+phase,...profile,phase,status:'STARTED',arms:[]};report.cases.push(row);flush();
  for(const mode of['default','selected']){
   const arm={mode,status:'STARTED',checks:[],errors:[],consoleErrors:[],assetErrors:[],blocked:[],fixtures:[],cosmeticFlags:[],captures:[],geometry:[]};row.arms.push(arm);flush();
   const fixture=copy(prepared.value);fixture.phase=phase;fixture.managerState=null;fixture.postRetirementChoice=null;fixture.lifeFlags={...(fixture.lifeFlags||{}),coachingBadges:3};
   const id=row.id+'-'+mode,initial=E.serializeSoccerCareerSave(fixture);json(id+'-fixture',{fixture,initial,scope:'Explicit saved-fixture eligibility/presentation inputs; only real UI callbacks mutate after boot'});
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
    async function boot(){await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Use coaching coursework',exact:true}).waitFor({timeout:45000});await page.evaluate(()=>document.fonts.ready);}
    await boot();const first=await raw();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Use coaching coursework',exact:true}).waitFor({timeout:45000});
    const before=await raw();check(before===first,'Two official initial loads stabilize full saved bytes');const input=E.parseSoccerCareerSave(before);check(input.retired&&input.phase===phase&&input.managerState==null,'Actual page loaded the intended retired fixture');
    const opening=page.getByRole('button',{name:'Use coaching coursework',exact:true}),heading=page.getByRole('heading',{name:'Choose your first club',exact:true});
    let selected=null;
    if(mode==='selected'){
     await reach(opening,'coursework opener');await opening.evaluate(element=>{window.__coachingBefore=null;element.addEventListener('click',()=>{window.__coachingBefore={x:scrollX,y:scrollY,overflow:document.body.style.overflow,locked:document.body.getAttribute('data-scroll-locked')};},{capture:true,once:true});});await activate(opening);
     await heading.waitFor();await page.waitForFunction(()=>document.activeElement?.textContent==='Choose your first club',null,{timeout:2000});
     arm.initialChooser=await capture('chooser-opened',heading);
     const chooser=heading.locator('..'),help=chooser.getByRole('button',{name:'Coaching start help',exact:true});
     check(await help.getAttribute('aria-expanded')==='true','Worked instructions initially open');check((await chooser.textContent()).includes('Example:')&&(await chooser.textContent()).includes('not a league division'),'Rules and worked example shown');
     await reach(help,'help');await activate(help);check(await help.getAttribute('aria-expanded')==='false','Help closes');await activate(help);check(await help.getAttribute('aria-expanded')==='true','Help reopens');
     check(await raw()===before,'Opening/reading/help preserve every career byte');const back=chooser.getByRole('button',{name:'Back',exact:true});await reach(back,'Back');const backAtPress=await body();await activate(back);await heading.waitFor({state:'detached'});
     await page.waitForFunction(()=>document.activeElement?.textContent==='Use coaching coursework',null,{timeout:2000});arm.back={opening:await page.evaluate(()=>window.__coachingBefore),atPress:backAtPress,after:await body()};check(JSON.stringify(arm.back.after)===JSON.stringify(backAtPress),'Back restores opener focus without an extra body/page jump after logged user scroll');check(await raw()===before,'Back preserves whole save');
     await reach(opening,'reopen');await activate(opening);await heading.waitFor();const choices=heading.locator('..').getByRole('button').filter({hasText:/Club level \d+/});check(await choices.count()===3,'Three actual offered clubs');
     await page.waitForFunction(()=>[...document.querySelectorAll('button')].filter(e=>/Club level \d+/.test(e.textContent)).every(e=>!e.disabled),null,{timeout:15000});
     const observed=await choices.evaluateAll(elements=>elements.map(element=>({name:element.children[0]?.children[0]?.textContent,country:element.children[0]?.children[1]?.textContent,level:Number(element.children[1]?.textContent?.replace('Club level ',''))})));
     const records=observed.map(value=>{const matches=E.FALLBACK_CLUBS.filter(club=>club.name===value.name&&club.country===value.country&&club.tier===value.level);assert.equal(matches.length,1,'Displayed choice is one actual canonical club');return matches[0];});
     check(new Set(records.map(club=>club.id)).size===3,'Displayed clubs are distinct actual records');selected=records[1];arm.offered={observed,records,selectedIndex:1};check(selected.id!==records[0].id,'Second displayed option differs from first');
     for(let i=0;i<3;i++)await reach(choices.nth(i),'club '+i);await reach(choices.nth(1),'selected second club');await capture('chooser-second');
    }
    const expected=seeded(7319,()=>E.choosePostRetirement(E.repairCareer(copy(input)),'manager',selected?[selected]:E.FALLBACK_CLUBS));
    const target=mode==='selected'?heading.locator('..').getByRole('button').filter({hasText:/Club level \d+/}).nth(1):page.getByRole('button',{name:/Become a Manager/});
    await reach(target,'start action');await page.evaluate(seed=>{window.__coachingOldRandom=Math.random;window.__coachingDraws=[];let n=seed>>>0;const draw=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};Math.random=()=>{const value=draw();window.__coachingDraws.push(value);return value;};window.__coachingNext=draw;},7319);
    await activate(target);await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before},{timeout:15000});
    const tape=await page.evaluate(()=>{Math.random=window.__coachingOldRandom;return{draws:window.__coachingDraws,next:window.__coachingNext()};});
    const after=await raw(),actual=E.parseSoccerCareerSave(after),wanted=E.serializeSoccerCareerSave(expected.value);json(id+'-authority',{before,input,expected,actual,expectedBytes:wanted,actualBytes:after,tape,selected});
    check(actual.phase==='manager_season'&&actual.postRetirementChoice==='manager','Actual UI enters manager career');
    check(after===wanted,'Full official saved bytes equal unchanged canonical initialization');check(sameManagerState(actual,expected.value),'Every ManagerState initialization field equals canonical authority');
    check(JSON.stringify(tape.draws)===JSON.stringify(expected.draws)&&tape.next===expected.next,'Complete post-press random vector and following draw equal canonical start');
    if(selected)check(actual.managerState.club===selected.name&&actual.managerState.clubTier===selected.tier,'Persisted manager uses the displayed second club');
    await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'How to play',exact:true}).waitFor({timeout:45000});await page.evaluate(()=>document.fonts.ready);
    const loaded=E.repairCareer(copy(expected.value));E.settleLoadedMoments(loaded);const reloaded=await raw();json(id+'-reload',{before:after,after:reloaded,expected:E.serializeSoccerCareerSave(loaded)});check(reloaded===E.serializeSoccerCareerSave(loaded),'Official load matches canonical repair without changing manager initialization');check(JSON.stringify(E.parseSoccerCareerSave(reloaded).managerState)===JSON.stringify(actual.managerState),'Selected ManagerState survives reload');
    await capture('manager-reloaded');check(arm.errors.length===0&&arm.consoleErrors.length===0&&arm.assetErrors.length===0&&arm.blocked.length===0,'No page/console/local-asset errors or unknown external traffic');arm.status='PASSED';
   }catch(error){arm.status='FAILED';arm.failure={name:error.name,message:error.message,stack:error.stack};if(page){arm.url=page.url();arm.lastRaw=await page.evaluate(key=>localStorage.getItem(key),KEY).catch(()=>null);arm.captureErrors=[];try{fs.writeFileSync(path.join(OUT,id+'-failure.html'),await page.content());}catch(captureError){arm.captureErrors.push('HTML: '+captureError.message);}try{await page.screenshot({path:path.join(OUT,id+'-failure.png')});}catch(captureError){arm.captureErrors.push('PNG: '+captureError.message);}}throw error;
   }finally{closing=true;await context.close();flush();}
  }
  row.status='PASSED';flush();
 }
 assert.equal(report.cases.length,8);assert(report.cases.every(row=>row.status==='PASSED'&&row.arms.length===2&&row.arms.every(arm=>arm.status==='PASSED')));
 const healthy=report.cases[0].arms.find(arm=>arm.mode==='selected'),raw=JSON.parse(fs.readFileSync(path.join(OUT,report.cases[0].id+'-selected-authority.json'),'utf8'));
 const changed=copy(raw.actual),healthyBytes=JSON.stringify(changed),originalClub=changed.managerState.club;assert(sameManagerState(changed,raw.expected.value));changed.managerState.club+=' wrong';const changedBytes=JSON.stringify(changed);assert.notEqual(changedBytes,healthyBytes);assert(!sameManagerState(changed,raw.expected.value));changed.managerState.club=originalClub;const restoredBytes=JSON.stringify(changed);assert.equal(restoredBytes,healthyBytes);assert(sameManagerState(changed,raw.expected.value));json('copied-manager-control',{healthyBytes,changedBytes,restoredBytes,healthySha256:sha(healthyBytes),changedSha256:sha(changedBytes),restoredSha256:sha(restoredBytes)});
 report.controls.push({name:'copied manager-club observation',effective:true,restored:true,scope:'Copied diagnostic only, no served source/DOM mutation'});
 report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.status='PASSED';flush();console.log('Coaching native:8 viewport/phase journeys,16 fresh actual-route arms, all canonical starts/save-loads passed;1 copied diagnostic control.');
}catch(error){report.status='FAILED';report.failure={name:error.name,message:error.message,stack:error.stack};flush();throw error;}finally{if(browser)await browser.close();host.kill();fs.writeFileSync(path.join(OUT,'host.log'),hostLog);flush();}
