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
assert(process.env.CI, 'Run this actual-route baseline in remote CI');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_TRAINING_PENDING_OUT||'training-pending-artifacts/browser');
const KEY='soccerCareerSave',NOW=1791586800000,sha=value=>createHash('sha256').update(value).digest('hex');
const pins={
 'src/pages/SoccerCareer.tsx':'2a0295cf7f76c3f37d502a53674e7da0299fddc3d56a2c7a19b225b95799d711',
 'src/lib/soccerCareerEngine.ts':'d2c4d26eb5ca12646f69e0d07cffab685f1660ff95ea33011ed97f64847bb8b1',
 'src/components/soccer-career/TrainingPanel.tsx':'725e95d14cee44b459fe5c19662ad8b1dc69364d69289b46527081a1c0ab2e61',
 'src/lib/soccerCareerSave.ts':'b486dfd8c4073230b6967c674058e46c7b56a6afd2a8a165f1e215501205477a',
 'scripts/data/careerLeagueWorldSaves1100.json':'1c2ac7441402ad6db4916c844181b869a3550726c7e0afed4cce194f5e6ca8ef'
};
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const held=()=>Object.fromEntries(Object.entries(pins).map(([file,pin])=>{const hash=sha(fs.readFileSync(file));assert.equal(hash,pin,file);return[file,hash];}));
const report={status:'STARTED',sourceBefore:held(),cases:[],scope:'Actual main b20 route, two offline browser profiles. A held local TrainingPanel response reproduces an unresolved download; it does not establish the cause of the user reports or a live outage.'};
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
assert(E.isSoccerCareerSave(fixture)&&fixture.phase==='playing'&&!fixture.retired&&fixture.age===19&&E.trainingAvailable(fixture),'Complete existing official playing fixture is valid and training is available');
const fixtureRaw=E.serializeSoccerCareerSave(fixture);assert.deepEqual(E.parseSoccerCareerSave(fixtureRaw),fixture);
json('fixture',{id:'ere',fixture,raw:fixtureRaw,scope:'Existing fictional complete saved career. Only actual repair and loaded-moment initialization are applied, no invented real player facts.'});
const fonts=new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8')).map(row=>{assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(row.url).origin));const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,row.file));assert.equal(sha(body),row.sha256);return[row.url,{body,contentType:row.contentType}];}));assert(fonts.size>0);
const port=await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(error=>error?reject(error):resolve(port));});});
const BASE='http://127.0.0.1:'+port,host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let hostLog='',browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned server readiness timeout')),15000);host.stdout.on('data',data=>{hostLog+=data;if(hostLog.includes('host-like server:')){clearTimeout(timer);resolve();}});host.stderr.on('data',data=>hostLog+=data);host.once('error',reject);host.once('exit',code=>reject(Error('Owned server exit '+code+': '+hostLog)));});
 browser=await pw.chromium.launch({headless:true});
 for(const profile of[{id:'1536-desktop',width:1536,height:826,deviceScaleFactor:1.25,touch:false},{id:'390-phone',width:390,height:844,deviceScaleFactor:1,touch:true}]){
  const row={id:profile.id,profile,status:'STARTED',checks:[],captures:[],stops:[],errors:[],consoleErrors:[],assetErrors:[],unknown:[],fixtures:[],cosmeticFlags:[],telemetry:[],chunkRequests:[],healthyAdvances:[],expectedFailure:null};report.cases.push(row);flush();
  const check=(ok,label)=>{row.checks.push({ok:!!ok,label});assert(ok,row.id+': '+label);};
  let currentPage,release=()=>{},closing=false;
  const contexts=[];
  const open=async hold=>{
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.deviceScaleFactor,hasTouch:profile.touch,isMobile:profile.touch,locale:'fr-FR',timezoneId:'Indian/Reunion',serviceWorkers:'block',colorScheme:'dark',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:fixtureRaw},{name:'cookie-consent',value:'essential'},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:'SteadyVolley-18'}]}]}});contexts.push(context);
   let gate;const heldResponse=new Promise(resolve=>{gate=resolve;});if(hold)release=gate;
   await context.addInitScript(now=>{const Old=Date;window.Date=class extends Old{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
   await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url()),method=request.method();
    if(url.origin===BASE){assert(['GET','HEAD'].includes(method),'Local host is read-only');if(hold&&url.pathname==='/assets/'+trainingFile){const entry={url:url.href,method,held:true,released:false,bytes:trainingBytes.length,sha256:sha(trainingBytes)};row.chunkRequests.push(entry);flush();await heldResponse;await route.fulfill({status:200,contentType:'text/javascript',body:trainingBytes});entry.released=true;flush();return;}return route.continue();}
    const headers={'access-control-allow-origin':BASE,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'GET,OPTIONS'};
    if(method==='GET'&&fonts.has(url.href))return route.fulfill({status:200,headers,...fonts.get(url.href)});
    if(method==='GET'&&url.hostname==='flagcdn.com'&&request.resourceType()==='image'&&/^(?:\/w(?:20|40|80)\/[a-z]{2}\.png|\/[a-z]{2}\.svg)$/.test(url.pathname)&&!url.search){row.cosmeticFlags.push(url.href);return route.fulfill({status:200,headers,contentType:'image/svg+xml',body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/live_scores'&&['GET','OPTIONS'].includes(method)){row.fixtures.push({method,path:url.pathname});return route.fulfill({status:method==='OPTIONS'?204:200,headers,contentType:'application/json',body:method==='OPTIONS'?'':Buffer.from('[]')});}
    if(url.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/game_completions'&&!url.search&&['POST','OPTIONS'].includes(method)){
     const activityHeaders={...headers,'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type,x-client-info,prefer,content-profile'};
     if(method==='OPTIONS'){row.fixtures.push({method,path:url.pathname});return route.fulfill({status:204,headers:activityHeaders,body:''});}
     const body=request.postDataJSON();assert.deepEqual(body,{game:'soccer-career',player_name:'SteadyVolley-18'},'Exact actual Next action telemetry body');row.telemetry.push({url:url.href,method,body,status:201,localFixture:true});
     return route.fulfill({status:201,headers:activityHeaders,contentType:'application/json',body:Buffer.from('[]')});
    }
    row.unknown.push({url:url.href,method,type:request.resourceType()});return route.abort();
   });
   await context.routeWebSocket('**/*',socket=>{row.unknown.push({url:socket.url(),method:'WEBSOCKET'});socket.close();});
   const page=await context.newPage();currentPage=page;page.setDefaultTimeout(15000);
   page.on('pageerror',error=>row.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push(message.text());});
   page.on('requestfailed',request=>{if(!closing&&request.url().startsWith(BASE+'/assets/'))row.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
   page.on('response',response=>{if(response.url().startsWith(BASE+'/assets/')&&response.status()>=400)row.assetErrors.push({url:response.url(),status:response.status()});});
   await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^Next Season/}).waitFor({timeout:45000});await page.evaluate(()=>document.fonts.ready);
   const raw=await page.evaluate(key=>localStorage.getItem(key),KEY),parsed=E.parseSoccerCareerSave(raw);check(parsed.phase==='playing'&&parsed.age===19,'Actual route loaded complete playing fixture');
   return page;
  };
  const raw=page=>page.evaluate(key=>localStorage.getItem(key),KEY);
  async function observe(page,label,next){
   const data=await next.evaluate(async(button,requested)=>{await document.fonts.ready;let previous='',stable=0,value;const start=performance.now();do{await new Promise(requestAnimationFrame);const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);value={rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},painted:!!hit&&(hit===button||button.contains(hit)),cover:hit?{tag:hit.tagName,className:hit.className,text:hit.textContent?.slice(0,180)}:null,fonts:document.fonts.status,finite:document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,requested};const signature=JSON.stringify(value);stable=signature===previous?stable+1:1;previous=signature;if(stable>=4&&value.fonts==='loaded'&&!value.finite)break;}while(performance.now()-start<8000);return{...value,stable};},{width:profile.width,height:profile.height});
   row.stops.push({label,...data,raw:await raw(page)});check(data.stable>=4&&data.fonts==='loaded'&&!data.finite,label+': finite animation and fonts settled');check(Math.abs(data.innerWidth-profile.width)<=1&&Math.abs(data.clientWidth-profile.width)<=1&&data.scrollWidth<=profile.width+1,label+': requested viewport and no horizontal overflow');return data;
  }
  async function capture(page,label){const file=row.id+'-'+label+'.png';await page.screenshot({path:path.join(OUT,file)});row.captures.push({file,sha256:sha(fs.readFileSync(path.join(OUT,file)))});fs.writeFileSync(path.join(OUT,row.id+'-'+label+'.html'),await page.content());flush();}
  async function advance(page,label){const before=await raw(page),input=E.parseSoccerCareerSave(before),next=page.getByRole('button',{name:/^Next Season/});check(await next.isEnabled(),label+': actual Next Season enabled');if(profile.touch)await next.tap();else await next.click();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:KEY,before},{timeout:15000});const after=await raw(page),actual=E.parseSoccerCareerSave(after);row.healthyAdvances.push({label,before,input,after,actual});check(E.isSoccerCareerSave(actual)&&actual.age===input.age+1,label+': actual saved career advances one year');flush();}
  try{
   const healthy=await open(false),normalNext=healthy.getByRole('button',{name:/^Next Season/});const normal=await observe(healthy,'normal-next',normalNext);check(normal.painted&&normal.rect.top>=0&&normal.rect.bottom<=profile.height,'Normal Next is visible and receives pointer input');await capture(healthy,'normal-next');await advance(healthy,'normal Next');closing=true;await healthy.context().close();closing=false;
   const page=await open(true),next=page.getByRole('button',{name:/^Next Season/}),trigger=page.getByRole('button',{name:'Open the training ground',exact:true});check(row.chunkRequests.length===0,'Training chunk is not requested before actual opener');
   const before=await raw(page);await trigger.click();const pending=page.locator('[data-training-loading]');await pending.waitFor();await page.waitForFunction(()=>document.querySelector('[data-training-loading]')!==null);
   check(row.chunkRequests.length===1&&row.chunkRequests[0].held&&!row.chunkRequests[0].released,'Exactly one actual emitted chunk request is held');const held=await observe(page,'held-spinner',next);
   check(!held.painted,'Actual pending fullscreen layer covers the normal Next button');check(await raw(page)===before,'Opening the pending overlay leaves complete saved bytes unchanged');
   const cancel=pending.getByRole('button',{name:/^(Close|Cancel|Back)$/i}),cancelCount=await cancel.count();await page.keyboard.press('Escape');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   row.pending={cancelCount,escapeClosed:await pending.count()===0,rawBefore:before,rawAfter:await raw(page),nextCovered:!held.painted};await capture(page,'held-spinner');
   try{assert(cancelCount>0||row.pending.escapeClosed,'MISSING_PENDING_TRAINING_CANCEL');throw Error('Baseline no longer has the expected pending-cancel defect');}catch(error){if(!(error instanceof assert.AssertionError)||error.message!=='MISSING_PENDING_TRAINING_CANCEL')throw error;row.expectedFailure={name:error.name,message:error.message,code:error.code};}
   release();const dialog=page.getByRole('dialog',{name:'Training ground',exact:true});await dialog.waitFor();await pending.waitFor({state:'detached'});check(row.chunkRequests[0].released,'The exact same held chunk bytes were released');
   await observe(page,'released-panel',next);await capture(page,'released-panel');check(await raw(page)===before,'Loaded training menu leaves complete saved bytes unchanged');await dialog.getByRole('button',{name:'Close',exact:true}).click();await dialog.waitFor({state:'detached'});
   const closed=await observe(page,'closed-next',next);check(closed.painted&&closed.rect.top>=0&&closed.rect.bottom<=profile.height,'Closing the loaded panel restores visible clickable Next');check(await raw(page)===before,'Closing training preserves complete saved bytes');await capture(page,'closed-next');await advance(page,'released and closed Next');
   check(row.errors.length===0&&row.consoleErrors.length===0&&row.assetErrors.length===0&&row.unknown.length===0,'No page, console, local asset or unknown network errors');check(row.captures.length===4&&row.healthyAdvances.length===2,'Four actual stops and both healthy advances retained');check(row.telemetry.length===2,'Exactly one known local telemetry insert per actual healthy advance');row.status='EXPECTED_RED';
  }catch(error){row.status='INFRA_OR_UNEXPECTED_FAILURE';row.failure={name:error.name,message:error.message,stack:error.stack};if(currentPage&&!currentPage.isClosed()){try{fs.writeFileSync(path.join(OUT,row.id+'-failure.html'),await currentPage.content());await currentPage.screenshot({path:path.join(OUT,row.id+'-failure.png')});}catch(captureError){row.captureFailure=String(captureError);}}throw error;}
  finally{release();closing=true;for(const context of contexts)await context.close();flush();}
 }
 assert.equal(report.cases.length,2);assert(report.cases.every(row=>row.status==='EXPECTED_RED'&&row.expectedFailure?.message==='MISSING_PENDING_TRAINING_CANCEL'));report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.status='EXPECTED_RED_CONFIRMED';flush();
 console.log('TRAINING_PENDING_BASELINE: 2 cases, 2 intended MISSING_PENDING_TRAINING_CANCEL, 4 healthy advances, 8 original PNGs, 0 infrastructure errors');
}finally{if(browser)await browser.close();host.kill();fs.writeFileSync(path.join(OUT,'server.log'),hostLog);flush();}
