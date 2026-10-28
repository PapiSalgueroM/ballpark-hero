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
assert(process.env.CI, 'Run these actual-route checks in remote CI');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_TRAINING_PENDING_OUT||'training-pending-artifacts/browser');
const KEY='soccerCareerSave',NOW=1791586800000,sha=value=>createHash('sha256').update(value).digest('hex');
const pins={
 'src/pages/SoccerCareer.tsx':'d053e83c7c533349e4884c2c7806698092bfe38c2ba106e4d3db11e539a23a0a',
 'src/lib/reportContext.ts':'d81909a7e8b8adb07402aace3b5519c882750235cb8eebb9b0aa4f867ccd0490',
 'src/lib/soccerCareerEngine.ts':'d2c4d26eb5ca12646f69e0d07cffab685f1660ff95ea33011ed97f64847bb8b1',
 'src/components/soccer-career/TrainingPanel.tsx':'725e95d14cee44b459fe5c19662ad8b1dc69364d69289b46527081a1c0ab2e61',
 'src/lib/soccerCareerSave.ts':'b486dfd8c4073230b6967c674058e46c7b56a6afd2a8a165f1e215501205477a',
 'src/lib/completions.ts':'be1c754df700ad104672c30ab2a4a42c146a4cfabc6f8c98dc2b9dc13b79b3b4',
 'scripts/data/careerLeagueWorldSaves1100.json':'1c2ac7441402ad6db4916c844181b869a3550726c7e0afed4cce194f5e6ca8ef'
};
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const bounded=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timeout')),15000);})]).finally(()=>clearTimeout(timer));};
const held=()=>Object.fromEntries(Object.entries(pins).map(([file,pin])=>{assert(/^[a-f0-9]{64}$/.test(pin),'Final source pin required: '+file);const hash=sha(fs.readFileSync(file));assert.equal(hash,pin,file);return[file,hash];}));
const report={status:'STARTED',sourceBefore:held(),cases:[],controls:[],scope:'Actual main-family route. Two profiles, each with independent normal, unresolved Back, and unresolved Escape contexts. Complete existing fictional save. No live-cause or literal Chrome156 claim.'};
const flush=()=>json('report',report);flush();
const assets=fs.readdirSync('dist/assets'),trainingFiles=assets.filter(file=>/^TrainingPanel-[\w-]+\.js$/.test(file)),pageFiles=assets.filter(file=>/^SoccerCareer-[\w-]+\.js$/.test(file));
assert.equal(trainingFiles.length,1,'One emitted actual TrainingPanel chunk');assert.equal(pageFiles.length,1,'One emitted actual SoccerCareer chunk');
const trainingFile=trainingFiles[0],trainingBytes=fs.readFileSync(path.join('dist/assets',trainingFile)),pageBytes=fs.readFileSync(path.join('dist/assets',pageFiles[0]));
assert(pageBytes.toString('utf8').includes('./'+trainingFile),'Actual route output references the selected training chunk');
report.chunks={training:{file:trainingFile,bytes:trainingBytes.length,sha256:sha(trainingBytes)},page:{file:pageFiles[0],bytes:pageBytes.length,sha256:sha(pageBytes)}};
const oracle=path.join(OUT,'oracle.cjs');
const bundle=await build({stdin:{contents:"export {repairCareer,trainingAvailable} from './src/lib/soccerCareerEngine';export {serializeSoccerCareerSave,parseSoccerCareerSave,isSoccerCareerSave} from './src/lib/soccerCareerSave';export {settleLoadedMoments} from './src/components/soccer-career/careerMoments';",resolveDir:ROOT,loader:'ts'},outfile:oracle,bundle:true,platform:'node',format:'cjs',jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"test"}'},loader:{'.css':'empty','.svg':'empty','.png':'empty'},logLevel:'error'});
json('oracle-metafile',bundle.metafile);const E=createRequire(path.join(ROOT,'package.json'))(oracle);
const captured=JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json','utf8')).saves.find(row=>row.id==='ere')?.state;assert(captured);
const fixture=E.repairCareer(structuredClone(captured));E.settleLoadedMoments(fixture);
assert(E.isSoccerCareerSave(fixture)&&fixture.phase==='playing'&&!fixture.retired&&fixture.age===19&&E.trainingAvailable(fixture),'Existing official playing fixture is complete and training is available');
const fixtureRaw=E.serializeSoccerCareerSave(fixture);assert.deepEqual(E.parseSoccerCareerSave(fixtureRaw),fixture);
json('fixture',{id:'ere',fixture,raw:fixtureRaw,scope:'Existing fictional saved career, actual repair, loaded-moment initialization and official codec. No invented real player facts.'});
const fonts=new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8')).map(row=>{assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(row.url).origin));const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,row.file));assert.equal(sha(body),row.sha256);return[row.url,{body,contentType:row.contentType}];}));assert(fonts.size>0);
const cancelFailures=o=>[o.rawBefore!==o.rawAfter&&'saved-bytes',!o.focusMatches&&'opener-focus',!o.nextPainted&&'covered-next',!o.stillHeld&&'chunk-not-held'].filter(Boolean);
const lateFailures=o=>[o.rawBefore!==o.rawAfter&&'saved-bytes',o.pending!==0&&'late-pending',o.loaded!==0&&'late-panel'].filter(Boolean);
function copiedControl(name,actual,change,detect,wanted){
 assert.deepEqual(detect(actual),[]);const changed=structuredClone(actual),before=JSON.stringify(changed);const undo=change(changed);assert.notEqual(JSON.stringify(changed),before);assert.deepEqual(detect(changed),wanted);
 json('control-'+name+'-before',actual);json('control-'+name+'-changed',changed);undo();assert.equal(JSON.stringify(changed),before);assert.deepEqual(detect(changed),[]);json('control-'+name+'-restored',changed);report.controls.push({name,scope:'COPIED actual observation only, no product or DOM mutation',changed:true,failures:wanted,restored:true});
}
const port=await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(error=>error?reject(error):resolve(port));});});
const BASE='http://127.0.0.1:'+port,host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let hostLog='',browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned server readiness timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned server exit '+code+': '+hostLog)));});
 browser=await pw.chromium.launch({headless:true});
 for(const profile of[{id:'1536-desktop',width:1536,height:826,deviceScaleFactor:1.25,touch:false},{id:'390-phone',width:390,height:844,deviceScaleFactor:1,touch:true}]){
  const row={id:profile.id,profile,status:'STARTED',checks:[],captures:[],stops:[],captureBindings:[],cancellations:[],lateReleases:[],errors:[],consoleErrors:[],assetErrors:[],unknown:[],fixtures:[],cosmeticFlags:[],telemetry:[],chunkRequests:[],healthyAdvances:[]};report.cases.push(row);flush();
  const check=(ok,label)=>{row.checks.push({ok:!!ok,label});assert(ok,row.id+': '+label);};
  let currentPage,closing=false;const sessions=[];
  const raw=page=>page.evaluate(key=>localStorage.getItem(key),KEY);
  async function open(kind){
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.deviceScaleFactor,hasTouch:profile.touch,isMobile:profile.touch,locale:'fr-FR',timezoneId:'Indian/Reunion',serviceWorkers:'block',colorScheme:'dark',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:fixtureRaw},{name:'cookie-consent',value:'essential'},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:'SteadyVolley-18'}]}]}});
   const session={context,kind,release:null,request:null};session.requested=new Promise(resolve=>{session.onRequest=resolve;});sessions.push(session);const gate=new Promise(resolve=>{session.release=resolve;});
   await context.addInitScript(now=>{const Old=Date;window.Date=class extends Old{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
   await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url()),method=request.method();
    if(url.origin===BASE){assert(['GET','HEAD'].includes(method),'Local host is read-only');if(kind!=='normal'&&url.pathname==='/assets/'+trainingFile){check(session.request===null,kind+': one actual held chunk request');session.request={kind,url:url.href,method,held:true,released:false,bytes:trainingBytes.length,sha256:sha(trainingBytes)};row.chunkRequests.push(session.request);session.onRequest(session.request);flush();await gate;await route.fulfill({status:200,contentType:'text/javascript',body:trainingBytes});session.request.released=true;flush();return;}return route.continue();}
    const headers={'access-control-allow-origin':BASE,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'GET,OPTIONS'};
    if(method==='GET'&&fonts.has(url.href))return route.fulfill({status:200,headers,...fonts.get(url.href)});
    if(method==='GET'&&url.hostname==='flagcdn.com'&&request.resourceType()==='image'&&/^(?:\/w(?:20|40|80)\/[a-z]{2}\.png|\/[a-z]{2}\.svg)$/.test(url.pathname)&&!url.search){row.cosmeticFlags.push(url.href);return route.fulfill({status:200,headers,contentType:'image/svg+xml',body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(method)){row.fixtures.push({kind,method,path:url.pathname});return route.fulfill({status:method==='OPTIONS'?204:200,headers,contentType:'application/json',body:method==='OPTIONS'?'':Buffer.from('[]')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/game_completions'&&!url.search&&['POST','OPTIONS'].includes(method)){
     const activityHeaders={...headers,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,x-client-info,prefer,content-profile'};
     if(method==='OPTIONS'){row.fixtures.push({kind,method,path:url.pathname});return route.fulfill({status:204,headers:activityHeaders,body:''});}
     const body=request.postDataJSON();assert.deepEqual(body,{game:'soccer-career',player_name:'SteadyVolley-18'},'Exact actual Next action telemetry body');row.telemetry.push({kind,url:url.href,method,body,status:201,localFixture:true});return route.fulfill({status:201,headers:activityHeaders,contentType:'application/json',body:Buffer.from('[]')});
    }
    row.unknown.push({kind,url:url.href,method,type:request.resourceType()});return route.abort();
   });
   await context.routeWebSocket('**/*',socket=>{row.unknown.push({kind,url:socket.url(),method:'WEBSOCKET'});socket.close();});
   const page=await context.newPage();session.page=page;currentPage=page;page.setDefaultTimeout(15000);
   page.on('pageerror',error=>row.errors.push({kind,error:String(error)}));page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push({kind,error:message.text()});});
   page.on('requestfailed',request=>{if(!closing&&request.url().startsWith(BASE+'/assets/'))row.assetErrors.push({kind,url:request.url(),error:request.failure()?.errorText});});
   page.on('response',response=>{if(response.url().startsWith(BASE+'/assets/')&&response.status()>=400)row.assetErrors.push({kind,url:response.url(),status:response.status()});});
   await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^Next Season/}).waitFor({timeout:45000});await page.evaluate(()=>document.fonts.ready);
   session.initialRaw=await raw(page);const parsed=E.parseSoccerCareerSave(session.initialRaw);check(parsed.phase==='playing'&&parsed.age===19,kind+': actual complete playing fixture loaded');check(session.request===null,kind+': training is deferred until actual opener');return session;
  }
  async function observe(page,label,next){
   const data=await next.evaluate(async(button,requested)=>{await document.fonts.ready;let previous='',stable=0,value;const start=performance.now();do{await new Promise(requestAnimationFrame);const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);value={rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},painted:!!hit&&(hit===button||button.contains(hit)),fonts:document.fonts.status,finite:document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,focusMatches:!!window.__trainingOpener&&document.activeElement===window.__trainingOpener,requested};const signature=JSON.stringify(value);stable=signature===previous?stable+1:1;previous=signature;if(stable>=4&&value.fonts==='loaded'&&!value.finite)break;}while(performance.now()-start<8000);return{...value,stable};},{width:profile.width,height:profile.height});
   row.stops.push({label,...data,raw:await raw(page)});check(data.stable>=4&&data.fonts==='loaded'&&!data.finite,label+': finite animation and fonts settled');check(Math.abs(data.innerWidth-profile.width)<=1&&Math.abs(data.clientWidth-profile.width)<=1&&data.scrollWidth<=profile.width+1,label+': requested viewport and no horizontal overflow');return data;
  }
  const nextInside=value=>value.rect.left>=0&&value.rect.right<=profile.width+.5&&value.rect.top>=0&&value.rect.bottom<=profile.height+.5;
  async function capture(page,label){
   const saved=await raw(page),state=E.parseSoccerCareerSave(saved),pending=page.locator('[data-training-loading]'),loaded=page.getByRole('dialog',{name:'Training ground',exact:true});
   const expected={ 'normal-next':'none','pending-back':'pending','back-restored-next':'none','pending-escape':'pending','cached-reopened-training':'loaded','final-next':'none' }[label];assert(expected!==undefined,'Known capture label');
   const visible={pendingCount:await pending.count(),pending:await pending.isVisible(),loadedCount:await loaded.count(),loaded:await loaded.isVisible()},wanted={pendingCount:expected==='pending'?1:0,pending:expected==='pending',loadedCount:expected==='loaded'?1:0,loaded:expected==='loaded'};
   row.captureBindings.push({label,rawSha256:sha(saved),phase:state.phase,age:state.age,visible,expected:{phase:'playing',age:19,visible:wanted}});
   check(E.isSoccerCareerSave(state)&&state.phase==='playing'&&state.age===19&&JSON.stringify(visible)===JSON.stringify(wanted),label+': official saved playing state and actual training visibility match this capture');
   const file=row.id+'-'+label+'.png';await page.screenshot({path:path.join(OUT,file)});row.captures.push({file,sha256:sha(fs.readFileSync(path.join(OUT,file)))});fs.writeFileSync(path.join(OUT,row.id+'-'+label+'.html'),await page.content());flush();
  }
  async function advance(session,label){
   const page=session.page,before=await raw(page),input=E.parseSoccerCareerSave(before),next=page.getByRole('button',{name:/^Next Season/});check(await next.isEnabled(),label+': actual Next enabled');
   const activity=page.waitForResponse(response=>response.url()==='https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/game_completions'&&response.request().method()==='POST',{timeout:15000});activity.catch(()=>{});
   if(profile.touch)await next.tap();else await next.click();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before},{timeout:15000});const response=await activity;check(response.status()===201,label+': exact local telemetry fixture completed');
   const after=await raw(page),actual=E.parseSoccerCareerSave(after);row.healthyAdvances.push({kind:session.kind,label,before,input,after,actual});check(E.isSoccerCareerSave(actual)&&actual.age===input.age+1,label+': actual saved age advances exactly one year');flush();
  }
  async function pending(session,label){
   const page=session.page;session.before=await raw(page);session.trigger=page.getByRole('button',{name:'Open the training ground',exact:true});await session.trigger.evaluate(element=>{window.__trainingOpener=element;window.__trainingOpenY=scrollY;});await session.trigger.click();
   const outer=page.locator('[data-training-loading]'),dialog=page.getByRole('dialog',{name:'Opening the training ground',exact:true});await dialog.waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Opening the training ground',null,{timeout:2000});
   await bounded(session.requested,label+': actual chunk request');check(session.request&&!session.request.released,label+': exact actual module response still unresolved');const observed=await observe(page,label,page.getByRole('button',{name:/^Next Season/}));check(!observed.painted,label+': pending layer covers Next');check(await raw(page)===session.before,label+': full save unchanged');
   const back=dialog.getByRole('button',{name:'Back to career',exact:true});check(await back.isVisible()&&await back.isEnabled(),label+': actual Back available');const box=await back.boundingBox();check(box&&box.width>=43.5&&box.height>=43.5&&box.x>=0&&box.x+box.width<=profile.width+.5&&box.y>=0&&box.y+box.height<=profile.height+.5,label+': Back is a visible44px target');
   const backPainted=await back.evaluate(element=>{const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&(hit===element||element.contains(hit));});check(backPainted,label+': Back receives pointer input');session.pendingBox=box;await capture(page,label);return{outer,dialog,back};
  }
  async function canceled(session,label){
   const page=session.page;await page.locator('[data-training-loading]').waitFor({state:'detached'});const immediate=await page.evaluate(()=>({matches:document.activeElement===window.__trainingOpener,active:document.activeElement?.outerHTML.slice(0,500)}));
   await page.waitForFunction(()=>!!window.__trainingOpener&&document.activeElement===window.__trainingOpener&&window.__trainingOpener.isConnected,null,{timeout:2000});const settled=await observe(page,label,page.getByRole('button',{name:/^Next Season/}));
   const value={kind:session.kind,label,rawBefore:session.before,rawAfter:await raw(page),immediate,focusMatches:settled.focusMatches,nextPainted:settled.painted,stillHeld:!!session.request&&!session.request.released,geometry:settled};row.cancellations.push(value);check(nextInside(settled),label+': restored Next stays in requested viewport');check(cancelFailures(value).length===0,label+': full save, settled exact opener focus and painted Next restored while chunk held');return value;
  }
  async function lateRelease(session){
   const page=session.page,before=await raw(page);check(session.request&&!session.request.released,session.kind+': late release begins from held response');session.release();const evaluated=await bounded(page.evaluate(async url=>{const module=await import(url);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return{url,defaultExportType:typeof module.default};},BASE+'/assets/'+trainingFile),session.kind+': actual module evaluation');check(evaluated.defaultExportType==='function',session.kind+': exact actual cached module evaluation completed');
   const value={kind:session.kind,rawBefore:before,rawAfter:await raw(page),pending:await page.locator('[data-training-loading]').count(),loaded:await page.getByRole('dialog',{name:'Training ground',exact:true}).count(),request:{...session.request},evaluated};row.lateReleases.push(value);check(session.request.released&&lateFailures(value).length===0,session.kind+': late exact chunk release cannot reopen either overlay');return value;
  }
  try{
   const normal=await open('normal'),normalNext=normal.page.getByRole('button',{name:/^Next Season/}),normalBox=await observe(normal.page,'normal-next',normalNext);check(normalBox.painted&&nextInside(normalBox),'Normal actual Next visible and painted');await capture(normal.page,'normal-next');await advance(normal,'Normal Next');closing=true;await normal.context.close();closing=false;
   const back=await open('back'),backPending=await pending(back,'pending-back');await backPending.back.click();const backRestored=await canceled(back,'back-restored-next');await capture(back.page,'back-restored-next');await advance(back,'Next while chunk still unresolved');check(!back.request.released,'Year advanced before held Back chunk was released');const backLate=await lateRelease(back);closing=true;await back.context.close();closing=false;
   const escape=await open('escape');await pending(escape,'pending-escape');await escape.page.keyboard.press('Escape');await canceled(escape,'escape-restored-next');const escapeLate=await lateRelease(escape);check(escapeLate.rawAfter===escape.before,'Escape and late release preserve full saved bytes');
   await escape.trigger.click();const loaded=escape.page.getByRole('dialog',{name:'Training ground',exact:true});await loaded.waitFor();check(await escape.page.locator('[data-training-loading]').count()===0,'Cached actual training menu opens without pending overlay');check(row.chunkRequests.length===2,'Cached reopening requests no additional Training chunk');
   await observe(escape.page,'cached-reopened-training',escape.page.getByRole('button',{name:/^Next Season/}));await capture(escape.page,'cached-reopened-training');check(await raw(escape.page)===escape.before,'Actual cached menu preserves full saved bytes');await loaded.getByRole('button',{name:'Close',exact:true}).click();await loaded.waitFor({state:'detached'});
   await escape.page.waitForFunction(()=>document.activeElement===window.__trainingOpener,null,{timeout:2000});const final=await observe(escape.page,'final-next',escape.page.getByRole('button',{name:/^Next Season/}));check(final.painted&&final.focusMatches&&nextInside(final),'Loaded Close restores settled exact opener focus and visible Next');check(await raw(escape.page)===escape.before,'Loaded Close preserves full saved bytes');await capture(escape.page,'final-next');await advance(escape,'Next after cached training Close');
   if(profile.id==='1536-desktop'){
    copiedControl('saved-bytes',backRestored,o=>{const old=o.rawAfter;o.rawAfter+=' ';return()=>{o.rawAfter=old;};},cancelFailures,['saved-bytes']);
    copiedControl('opener-focus',backRestored,o=>{o.focusMatches=false;return()=>{o.focusMatches=true;};},cancelFailures,['opener-focus']);
    copiedControl('covered-next',backRestored,o=>{o.nextPainted=false;return()=>{o.nextPainted=true;};},cancelFailures,['covered-next']);
    copiedControl('late-saved-bytes',backLate,o=>{const old=o.rawAfter;o.rawAfter+=' ';return()=>{o.rawAfter=old;};},lateFailures,['saved-bytes']);
    copiedControl('late-pending',backLate,o=>{o.pending=1;return()=>{o.pending=0;};},lateFailures,['late-pending']);
    copiedControl('late-panel',backLate,o=>{o.loaded=1;return()=>{o.loaded=0;};},lateFailures,['late-panel']);
   }
   check(row.errors.length===0&&row.consoleErrors.length===0&&row.assetErrors.length===0&&row.unknown.length===0,'No page, console, local asset or unknown network errors');check(row.captures.length===6&&row.captureBindings.length===6&&row.healthyAdvances.length===3&&row.cancellations.length===2&&row.lateReleases.length===2&&row.chunkRequests.length===2&&row.telemetry.length===3,'Exact six captures, three advances/telemetry inserts and two unresolved cancellation/late-release flows');row.status='PASSED';flush();
  }catch(error){row.status='FAILED';row.failure={name:error.name,message:error.message,stack:error.stack};if(currentPage&&!currentPage.isClosed()){try{fs.writeFileSync(path.join(OUT,row.id+'-failure.html'),await currentPage.content());await currentPage.screenshot({path:path.join(OUT,row.id+'-failure.png')});}catch(captureError){row.captureFailure=String(captureError);}}throw error;}
  finally{for(const session of sessions)session.release();closing=true;for(const session of sessions)await session.context.close();flush();}
 }
 assert.equal(report.cases.length,2);assert(report.cases.every(row=>row.status==='PASSED'));assert.equal(report.controls.length,6);report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.status='PASSED';flush();
 console.log('TRAINING_PENDING_FIXED: 2 profiles, 6 actual advances, 4 held chunk requests, 4 pending cancellations, 12 original PNGs, 6 copied controls, 0 errors');
}finally{if(browser)await browser.close();host.kill();fs.writeFileSync(path.join(OUT,'server.log'),hostLog);flush();}
