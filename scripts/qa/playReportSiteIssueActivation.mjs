/* Remote-only actual Footer activation, no report delivery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, seed, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT=process.cwd(),BASE='http://127.0.0.1:4173',SELF='scripts/qa/playReportSiteIssueActivation.mjs';
const OUT=path.resolve(process.env.REPORT_FORM_OUT||''),DIST=path.resolve(process.env.REPORT_FORM_SITE_DIST||'');
const SOURCES=[{"file":"src/components/game/Footer.tsx","bytes":5898,"sha256":"4a355435dd03ded54bd4f775508f53044315ca9f4b527d0ba311113a081b19c1","gitBlob":"969a25f428fdb74df89c59342b6872bf97de08ba"},{"file":"src/hooks/useReportDraftLifecycle.ts","bytes":2270,"sha256":"3dc1871d8af5678e4c6271e33010fa4662c6b7fc3e38843a225a218d79f5565f","gitBlob":"b800429eba7274e76d42cd366f933e272d76bac0"},{"file":"src/lib/freshBuild.ts","bytes":11240,"sha256":"78276274e86e009eb28cc126d3d97b31c0fdbbd7f1f8a645e5a548f72cf96519","gitBlob":"295019e77698607a70390e5e6de6ee8130eaae27"},{"file":"src/lib/safeStorage.ts","bytes":19906,"sha256":"3be2f5e5de4da6f6137e5aad30482da3313965f71169fb965765e37c3206225a","gitBlob":"43ab9a6ed454594bf4e0e2a4a20edc5e45cf7683"},{"file":"src/components/ui/dialog.tsx","bytes":4041,"sha256":"db1fe38239f922d395d41471d8e9a996b9e8f6d87afddf9edbe3988f15a21fe8","gitBlob":"401b3b2aa4c9404d98d9f05bc3f88ce5eb6b19cd"},{"file":"src/components/game/reportKinds.ts","bytes":2805,"sha256":"1fc7568b82924f211b5fe9bc30844355705b82a7cd475e960ff8e75c866e5947","gitBlob":"f73941384a0fe6c8087cf30fde2707f35d6b39de"},{"file":"src/lib/reportContext.ts","bytes":3179,"sha256":"d81909a7e8b8adb07402aace3b5519c882750235cb8eebb9b0aa4f867ccd0490","gitBlob":"8fdc7777c10fc0bd8c3571ccc413ac5800e53141"},{"file":"src/pages/About.tsx","bytes":8397,"sha256":"3ee0028697befc261edd25dea9970879dae0172681b16aefe5d84370d4df67b9","gitBlob":"0dc2dd9d25bdcde3349ae940a02ab2bded2a4bc9"},{"file":"src/App.tsx","bytes":35834,"sha256":"59c629fc0e983c81608f8039eacac2d0bd14579bb26a24e05eef395dcc90a243","gitBlob":"5d7e1ed074f4c0f695b0d5548b0045fc25029f6a"},{"file":"src/index.css","bytes":18125,"sha256":"4fec0dd645ad93ada2ab81b133f1ca87275a5524e449f3282277da8ea70ddce3","gitBlob":"f574ef6fb926c1d40b9f61845053d72e9bcd4eb2"},{"file":"scripts/lib/offlineTransport.cjs","bytes":10660,"sha256":"e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6"},{"file":"scripts/lib/playwrightLoader.mjs","bytes":2777,"sha256":"94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93","gitBlob":"4f7739e217e0a47ee82e6bfc8be1c04bed17454a"},{"file":"scripts/lib/hostLikeServer.mjs","bytes":2690,"sha256":"3958c9a3b4d9e49bb60a3b7dd72d81a997bd1caed56e82e4c3bae07e1a918ef0","gitBlob":"21059d5e8114669df61106c125d5272d357b6236"},{"file":"scripts/qa/siteMenuNavigationSupport.mjs","bytes":11560,"sha256":"c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303","gitBlob":"7909ce5805171367646e17a468fd919b88ad710e"},{"file":"scripts/qa/sharedChromePreload.cjs","bytes":8000,"sha256":"9e9da5a8e8ae62578e08d0df3ab5dd80acdbee3c40e6862fce9a1e83af0da57f","gitBlob":"8efcfc18ba520e637193e25c2bb8d4b97dd88919"},{"file":"src/components/game/ReportSiteIssue.tsx","bytes":2812,"sha256":"669cfbc62d506d839fe988e23406732c0023ccad326544a78a9e603c13c24ef9","gitBlob":"b014727c5ca6f398d9bd593d3aa596e2e948fd97"},{"file":"src/components/game/ReportSiteIssueForm.tsx","bytes":6964,"sha256":"07723be749de657db053824b7534d973f5dc7eed6fc498f6fe7651b9d1777e36","gitBlob":"314383d3c2ba465ce33318ace2536e956712b96d"}],INPUTS=[...SOURCES.map(row=>row.file),SELF];
const SPECS=[
 {id:'328-light',width:328,height:515,theme:'light',mobile:true},
 {id:'328-dark',width:328,height:515,theme:'dark',mobile:true},
 {id:'1280-light',width:1280,height:900,theme:'light',mobile:false},
 {id:'1280-dark',width:1280,height:900,theme:'dark',mobile:false},
];
const DRAFT='Fictional activation-only draft, no report is sent.';
const FAILURE='The report form could not load. Refresh the page to try again.';
const REFUSED='The page could not refresh. Check your connection and any waiting save, then try again.';
const write=(file,value)=>fs.writeFileSync(path.join(OUT,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const readInputs=()=>INPUTS.map(file=>{const body=fs.readFileSync(file);return {file,bytes:body.length,sha256:sha(body),gitBlob:git('rev-parse','HEAD:'+file)};});
function locksEqual(value,baseline){assert.deepEqual(value.locks,baseline.locks,'REPORT_BODY_RELEASE');}
function coldReady(value){
 assert.equal(value.dialogs,0,'REPORT_COLD_CLOSED');assert.equal(value.moduleRequests,0,'REPORT_COLD_MODULE_ABSENT');
 assert.equal(value.trigger.count,1,'REPORT_ACTUAL_FOOTER_TRIGGER');assert(value.trigger.connected&&value.trigger.visible,'REPORT_ACTUAL_FOOTER_TRIGGER');
}
function pendingReady(value,baseline){
 assert.equal(value.dialogs,0,'REPORT_PENDING_NO_DIALOG');assert.equal(value.status,'Loading report form...','REPORT_PENDING_TRUTHFUL');
 assert.equal(value.trigger.busy,'true','REPORT_PENDING_TRUTHFUL');locksEqual(value,baseline);
}
function closedReady(value,baseline){
 assert.equal(value.dialogs,0,'REPORT_CANCEL_NO_LATE_DIALOG');assert.equal(value.status,null,'REPORT_CANCEL_NO_LATE_DIALOG');
 assert.equal(value.trigger.count,1,'REPORT_CONNECTED_FOCUS');
 assert(value.trigger.connected&&value.trigger.visible&&value.active.currentTrigger,'REPORT_CONNECTED_FOCUS');
 const r=value.trigger.rect;assert(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=value.viewport.width&&r.bottom<=value.viewport.height,'REPORT_TRIGGER_IN_VIEWPORT');
 assert.notEqual(value.trigger.busy,'true','REPORT_CANCEL_NO_LATE_DIALOG');locksEqual(value,baseline);
}
function openReady(value){
 assert.equal(value.dialogs,1,'REPORT_REAL_DIALOG');assert(value.form&&value.form.visible,'REPORT_REAL_DIALOG');
 const r=value.form.rect;assert(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=value.viewport.width&&r.bottom<=value.viewport.height,'REPORT_DIALOG_VIEWPORT');
 assert.equal(value.form.name,'Report a problem','REPORT_REAL_DIALOG');checkFonts(value.fonts);
}
function draftReady(value){openReady(value);assert.equal(value.form.details,DRAFT,'REPORT_DRAFT_HELD');assert.equal(value.form.category,'Bug','REPORT_DRAFT_HELD');assert.equal(value.form.sendDisabled,false,'REPORT_DRAFT_HELD');}
function failureReady(value){
 assert.equal(value.dialogs,0,'REPORT_FAILURE_NO_DIALOG');assert.equal(value.alert,FAILURE,'REPORT_LOAD_FAILURE');
 assert.equal(value.online,false,'REPORT_NATIVE_OFFLINE_FOUNDATION');assert(value.refresh&&value.cancel,'REPORT_FAILURE_CONTROLS');
}
function refusalReady(value,before){
 assert.equal(value.alert,REFUSED,'REPORT_REFRESH_GUARDED_REFUSAL');assert.equal(value.online,false,'REPORT_NATIVE_OFFLINE_FOUNDATION');
 assert.equal(value.navigationCount,before.navigationCount,'REPORT_REFRESH_NO_OFFLINE_RELOAD');assert.equal(value.dialogs,0,'REPORT_REFRESH_NO_OFFLINE_RELOAD');
}
function reloadReady(value,before){
 assert.equal(value.navigationCount,before.navigationCount+1,'REPORT_USER_REFRESH_NAVIGATION');assert.equal(value.online,true,'REPORT_USER_REFRESH_NAVIGATION');
 coldReady(value);
}
function noSend(row){assert.equal(row.reportAttempts.length,0,'REPORT_NO_SEND');}
function loadedReady(row){assert(row.formRequests.some(r=>r.finished&&r.responseSha256===FORM.sha256),'REPORT_ACTIVATION_ACTUAL_MODULE');}
/* Observes actual nodes only. No application values or callbacks are supplied. */
function collect(){
 const visible=node=>{if(!node||!node.isConnected)return false;const s=getComputedStyle(node);return node.getClientRects().length>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse';};
 const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const footer=document.querySelector('#root footer'),buttons=footer?[...footer.querySelectorAll('button')]:[];
 const triggers=buttons.filter(b=>b.textContent.trim()==='Report a problem'),trigger=triggers[0],all=[...document.querySelectorAll('[role="dialog"][data-state="open"]')];
 const form=all.find(node=>{const id=node.getAttribute('aria-labelledby');return id&&document.getElementById(id)?.textContent.trim()==='Report a problem';});
 const active=document.activeElement,b=getComputedStyle(document.body),d=getComputedStyle(document.documentElement);
 const category=form?[...form.querySelectorAll('button')].find(node=>node.classList.contains('bg-primary')&&!node.classList.contains('w-full')):null;
 const send=form?.querySelector('button.w-full');
 return {
  href:location.href,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth},
  trigger:{count:triggers.length,connected:!!trigger?.isConnected,visible:visible(trigger),busy:trigger?.getAttribute('aria-busy')||null,rect:rect(trigger)},
  active:{tag:active?.tagName||null,text:active?.textContent?.trim().slice(0,100)||'',currentTrigger:active===trigger,visible:visible(active)},
  status:footer?.querySelector('[role="status"]')?.textContent.trim()||null,alert:footer?.querySelector('[role="alert"]')?.textContent.trim()||null,
  cancel:buttons.some(b=>b.textContent.trim()==='Cancel'),refresh:buttons.some(b=>b.textContent.trim()==='Refresh page'),dialogs:all.length,
  form:form?{visible:visible(form),name:document.getElementById(form.getAttribute('aria-labelledby'))?.textContent.trim()||'',rect:rect(form),details:form.querySelector('textarea')?.value??null,category:category?.textContent.trim()||'',sendDisabled:send?.disabled??null}:null,
  locks:{bodyOverflow:b.overflow,bodyOverflowY:b.overflowY,rootOverflow:d.overflow,rootOverflowY:d.overflowY,bodyPointer:b.pointerEvents,rootPointer:d.pointerEvents,bodyLock:document.body.getAttribute('data-scroll-locked')},
  fonts:{status:document.fonts.status,inter:document.fonts.check('16px Inter'),display:document.fonts.check('16px "Space Grotesk"'),faces:[...document.fonts].map(f=>({family:f.family,status:f.status}))},
  theme:{light:document.documentElement.classList.contains('light')},media:{coarse:matchMedia('(pointer:coarse)').matches,reduce:matchMedia('(prefers-reduced-motion:reduce)').matches},
  trusted:window.__siteMenuTrusted||[],
 };
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('REPORT_SETUP_OR_COMPLETION_TIMEOUT: '+label)),10000);})]);}finally{clearTimeout(timer);}}
function physicalFor(url){
 assert.equal(url.origin,BASE,'REPORT_LOCAL_ORIGIN');assert(!url.username&&!url.password&&!url.hash,'REPORT_LOCAL_URL');
 const freshness=url.pathname==='/'&&[...url.searchParams.keys()].join('|')==='fresh'&&/^\d+$/.test(url.searchParams.get('fresh'));
 assert(!url.search||freshness,'REPORT_LOCAL_QUERY');
 const decoded=decodeURIComponent(url.pathname),rel=path.resolve(DIST,'.'+decoded);assert(rel===DIST||rel.startsWith(DIST+path.sep),'REPORT_DIST_PATH');
 const candidates=[rel,path.join(rel,'index.html')],file=candidates.find(f=>{try{return fs.lstatSync(f).isFile();}catch{return false;}})||path.join(DIST,'index.html');
 const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink(),'REPORT_DIST_REGULAR');return file;
}
async function observe(page,row,label,png=false){
 const value=await page.evaluate(collect);value.label=label;value.navigationCount=row.navigations.length;value.moduleRequests=row.formRequests.filter(x=>x.documentOrdinal===row.documentRequests.length).length;
 row.observations.push(value);
 write(row.id+'-'+label+'.json',value);
 if(png){const file=row.id+'-'+label+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:false,animations:'disabled'});row.images.push(file);}
 return value;
}
async function target(page,row,locator,label,minimum=0){
 assert.equal(await locator.count(),1,'REPORT_NATIVE_TARGET_UNIQUE: '+label);
 const beforeScroll=await page.evaluate(collect);await locator.scrollIntoViewIfNeeded();const beforeClick=await page.evaluate(collect);
 const value=await locator.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},hit:!!hit&&(hit===node||node.contains(hit)),visible:node.isConnected&&node.getClientRects().length>0,viewport:{width:innerWidth,height:innerHeight}};});
 row.targets.push({label,beforeScroll,beforeClick,...value});write(row.id+'-target-'+row.targets.length+'.json',{label,beforeScroll,beforeClick,...value});
 assert(value.visible&&value.hit&&value.rect.x>=0&&value.rect.y>=0&&value.rect.right<=value.viewport.width&&value.rect.bottom<=value.viewport.height,'REPORT_NATIVE_TARGET_HIT: '+label);
 if(minimum)assert(value.rect.width>=minimum&&value.rect.height>=minimum,'REPORT_NEW_TARGET_44: '+label);
 if(row.spec.mobile)await page.touchscreen.tap(value.rect.x+value.rect.width/2,value.rect.y+value.rect.height/2);
 else{await locator.focus();assert(await locator.evaluate(n=>document.activeElement===n),'REPORT_KEYBOARD_TARGET');await page.keyboard.press('Enter');}
 row.actions.push({label,input:row.spec.mobile?'native touchscreen tap':'actual keyboard Enter'});
}
async function waitClosed(page,baseline){
 await page.getByRole('dialog',{name:'Report a problem',exact:true}).waitFor({state:'hidden'});
 await page.waitForFunction(expected=>{
  const footer=document.querySelector('#root footer'),trigger=footer?[...footer.querySelectorAll('button')].find(b=>b.textContent.trim()==='Report a problem'):null;
  if(!trigger?.isConnected||!trigger.getClientRects().length||document.activeElement!==trigger)return false;
  const b=getComputedStyle(document.body),d=getComputedStyle(document.documentElement);
  const locks={bodyOverflow:b.overflow,bodyOverflowY:b.overflowY,rootOverflow:d.overflow,rootOverflowY:d.overflowY,bodyPointer:b.pointerEvents,rootPointer:d.pointerEvents,bodyLock:document.body.getAttribute('data-scroll-locked')};
  return Object.keys(expected).every(k=>locks[k]===expected[k]);
 },baseline.locks,{timeout:10000});
}
async function hydrate(page,row){
 await page.goto(BASE+'/about',{waitUntil:'networkidle'});await page.locator('#root #dukb-main').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 const trigger=page.locator('#root footer').getByRole('button',{name:'Report a problem',exact:true});assert.equal(await trigger.count(),1,'REPORT_ACTUAL_FOOTER_TRIGGER');await trigger.scrollIntoViewIfNeeded();
 const value=await observe(page,row,'cold',row.arm==='healthy');coldReady(value);checkFonts(value.fonts);
 assert.equal(value.theme.light,row.spec.theme==='light','REPORT_THEME');assert.equal(value.media.coarse,row.spec.mobile,'REPORT_NATIVE_POINTER');assert.equal(value.media.reduce,row.spec.mobile,'REPORT_MOTION');
 row.baseline=value;return trigger;
}
async function healthy(context,page,row,gate){
 const footer=page.locator('#root footer'),trigger=await hydrate(page,row),oldTrigger=await trigger.elementHandle();
 await target(page,row,trigger,'first report activation');await bounded(gate.seen.promise,'actual Form request');await footer.getByRole('status').waitFor();
 row.pendingCancel=await observe(page,row,'pending-cancel',true);pendingReady(row.pendingCancel,row.baseline);
 await target(page,row,footer.getByRole('button',{name:'Cancel',exact:true}),'Cancel pending',44);
 await waitClosed(page,row.baseline);row.cancelled=await observe(page,row,'cancelled');closedReady(row.cancelled,row.baseline);
 await target(page,row,trigger,'reopen still-held report');await footer.getByRole('status').waitFor();
 row.pendingEscape=await observe(page,row,'pending-escape',true);pendingReady(row.pendingEscape,row.baseline);
 await page.keyboard.press('Escape');await waitClosed(page,row.baseline);row.escaped=await observe(page,row,'escaped');closedReady(row.escaped,row.baseline);
 const finished=page.waitForEvent('requestfinished',{predicate:request=>request.url()===FORM.url,timeout:10000});gate.action.resolve('continue');await finished;await bounded(gate.bodyReady.promise,'actual Form response bytes');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 row.late=await observe(page,row,'late-module-closed',true);closedReady(row.late,row.baseline);loadedReady(row);
 await target(page,row,trigger,'open actual loaded Form');const dialog=page.getByRole('dialog',{name:'Report a problem',exact:true});await dialog.waitFor();
 row.open=await observe(page,row,'actual-open');openReady(row.open);assert.equal(row.open.form.details,'');assert.equal(row.open.form.sendDisabled,true);
 await dialog.getByRole('textbox',{name:'Describe the problem',exact:true}).fill(DRAFT);await target(page,row,dialog.getByRole('button',{name:'Bug',exact:true}),'real Bug category');
 row.edited=await observe(page,row,'edited');draftReady(row.edited);
 await page.keyboard.press('Escape');await waitClosed(page,row.baseline);row.closedDraft=await observe(page,row,'closed-draft');closedReady(row.closedDraft,row.baseline);
 await target(page,row,trigger,'reopen actual draft');await dialog.waitFor();row.reopened=await observe(page,row,'reopened-draft',true);draftReady(row.reopened);
 await target(page,row,dialog.getByRole('button',{name:'Close',exact:true}),'real Dialog Close');
 await waitClosed(page,row.baseline);row.finalClosed=await observe(page,row,'final-closed',true);closedReady(row.finalClosed,row.baseline);
 row.oldTriggerStillConnected=oldTrigger?await oldTrigger.evaluate(node=>node.isConnected):null;if(oldTrigger)await oldTrigger.dispose();
 noSend(row);row.completed=true;
}
async function failed(context,page,row,gate){
 const footer=page.locator('#root footer'),trigger=await hydrate(page,row);
 await target(page,row,trigger,'activate actual failed Form');await bounded(gate.seen.promise,'actual failing Form request');await footer.getByRole('status').waitFor();
 row.pending=await observe(page,row,'pending');pendingReady(row.pending,row.baseline);
 const failure=page.waitForEvent('requestfailed',{predicate:request=>request.url()===FORM.url,timeout:10000});
 await context.setOffline(true);assert.equal(await page.evaluate(()=>navigator.onLine),false,'REPORT_NATIVE_OFFLINE_FOUNDATION');gate.action.resolve('abort');await failure;await bounded(gate.failureObserved.promise,'native chunk failure observation');
 await footer.getByRole('alert').waitFor();row.failed=await observe(page,row,'load-failed',true);failureReady(row.failed);assert.equal(row.failed.navigationCount,row.baseline.navigationCount,'REPORT_NO_AUTOMATIC_RELOAD');
 await target(page,row,footer.getByRole('button',{name:'Refresh page',exact:true}),'offline user Refresh',44);
 await footer.getByText(REFUSED,{exact:true}).waitFor();row.refused=await observe(page,row,'refresh-refused',true);refusalReady(row.refused,row.failed);
 await context.setOffline(false);gate.pass=true;
 const navigation=page.waitForNavigation({waitUntil:'networkidle',timeout:10000});
 await target(page,row,footer.getByRole('button',{name:'Refresh page',exact:true}),'online user Refresh',44);await navigation;
 await page.locator('#root #dukb-main').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 const current=page.locator('#root footer').getByRole('button',{name:'Report a problem',exact:true});await current.scrollIntoViewIfNeeded();
 row.reloaded=await observe(page,row,'reloaded-closed',true);reloadReady(row.reloaded,row.refused);
 await target(page,row,current,'activation after real refresh');const dialog=page.getByRole('dialog',{name:'Report a problem',exact:true});await dialog.waitFor();
 row.open=await observe(page,row,'actual-open-after-refresh',true);openReady(row.open);assert.equal(row.open.form.details,'');assert.equal(row.open.form.sendDisabled,true);
 await page.keyboard.press('Escape');await waitClosed(page,row.reloaded);row.finalClosed=await observe(page,row,'final-closed');closedReady(row.finalClosed,row.reloaded);
 await bounded(Promise.all([gate.bodyReady.promise,gate.finished.promise]),'actual refreshed Form bytes and finish');loadedReady(row);noSend(row);row.completed=true;
}


function ioRows(){
 const file=path.join(OUT,'browser-io.jsonl');assert(fs.existsSync(file),'REPORT_BOUNDARY_TELEMETRY_PRESENT');
 return fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
}
function wireReady(row,io){
 assert.equal(row.wire.pageErrors.length,0,'REPORT_NO_PAGE_ERROR');assert.equal(row.wire.webSockets.length,0,'REPORT_NO_SOCKET');
 assert.equal(row.wire.unknown.length,0,'REPORT_NO_UNKNOWN_REQUEST');noSend(row);
 assert(io.length>0&&io.some(r=>r.kind==='prepared-font'),'REPORT_REAL_PREPARED_FONT');
 assert(io.every(r=>['prepared-font','source-shell-fixture','local-flag-abort'].includes(r.kind)),'REPORT_BOUNDARY_KNOWN_ONLY');
 const flags=io.filter(r=>r.kind==='local-flag-abort').map(r=>r.url),expected=[...flags];
 if(row.arm==='failed')expected.push(FORM.url);
 let freshness=0;
 for(const failure of row.wire.requestFailures){
  if(failure.url===FORM.url&&row.arm==='failed'){assert.equal(failure.method,'GET');assert.equal(failure.type,'script');assert(['net::ERR_BLOCKED_BY_CLIENT','net::ERR_INTERNET_DISCONNECTED'].includes(failure.error)&&failure.nativeOffline,'REPORT_NATIVE_CHUNK_FAILURE');continue;}
  if(flags.includes(failure.url)){assert.equal(failure.method,'GET');assert.equal(failure.type,'image');assert.equal(failure.error,'net::ERR_BLOCKED_BY_CLIENT');continue;}
  const url=new URL(failure.url),sourceFresh=url.origin===BASE&&url.pathname==='/'&&[...url.searchParams.keys()].join('|')==='fresh'&&/^\d+$/.test(url.searchParams.get('fresh'));
  assert(sourceFresh&&row.arm==='failed'&&failure.nativeOffline&&failure.method==='GET'&&failure.type==='fetch'&&failure.error==='net::ERR_INTERNET_DISCONNECTED','REPORT_UNCORRELATED_REQUEST_FAILURE');
  freshness++;assert(freshness<=1,'REPORT_EXTRA_OFFLINE_FRESHNESS');expected.push(failure.url);
 }
 assert.deepEqual(row.wire.requestFailures.map(r=>r.url).sort(),expected.sort(),'REPORT_EXACT_FAILURE_MULTISET');
 const consoleUrls=row.wire.consoleErrors.map(r=>{assert(['Failed to load resource: net::ERR_BLOCKED_BY_CLIENT','Failed to load resource: net::ERR_INTERNET_DISCONNECTED'].includes(r.text),'REPORT_UNCORRELATED_CONSOLE');return r.location.url;}).sort();
 assert.deepEqual(consoleUrls,[...expected].sort(),'REPORT_EXACT_CONSOLE_MULTISET');
 assert.equal(row.formRequests.filter(r=>r.aborted).length,row.arm==='failed'?1:0,'REPORT_EXACT_DELIBERATE_CHUNK_REFUSAL');
}
function controls(healthyRow,failedRow){
 const foundation={healthy:healthyRow,failed:failedRow},original=JSON.stringify(foundation)+'\n',result=[];
 fs.writeFileSync(path.join(OUT,'control-foundation.json'),original,{flag:'wx'});
 const one=(id,mutate,judge,marker)=>{
  const changed=JSON.parse(original);mutate(changed);const encoded=JSON.stringify(changed)+'\n',file='control-'+id+'.work.json';
  fs.writeFileSync(path.join(OUT,file),encoded,{flag:'wx'});assert.notEqual(sha(encoded),sha(original),'REPORT_CONTROL_CHANGED');
  const actual=JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8'));let error;try{judge(actual);}catch(e){error=e;}
  assert(error instanceof assert.AssertionError&&String(error.message).includes(marker),'REPORT_CONTROL_OWNED: '+id);
  fs.writeFileSync(path.join(OUT,'control-'+id+'.changed.json'),encoded,{flag:'wx'});
  fs.writeFileSync(path.join(OUT,file),original);const restored=fs.readFileSync(path.join(OUT,file),'utf8');assert.equal(sha(restored),sha(original),'REPORT_CONTROL_RESTORED');
  judge(JSON.parse(restored));
  result.push({id,foundation:'control-foundation.json',changed:'control-'+id+'.changed.json',restored:file,sourceBytes:Buffer.byteLength(original),changedBytes:Buffer.byteLength(encoded),sourceSha256:sha(original),changedSha256:sha(encoded),restoredSha256:sha(restored),error:{name:error.name,message:error.message,code:error.code,stack:error.stack},marker,scope:'ACTUAL_BROWSER_RECORD_JUDGE_ONLY_NOT_SOURCE_FAULT'});
 };
 one('cold-module-request',x=>{x.healthy.baseline.moduleRequests=1;},x=>coldReady(x.healthy.baseline),'REPORT_COLD_MODULE_ABSENT');
 one('pending-dialog',x=>{x.healthy.pendingCancel.dialogs=x.healthy.open.dialogs;},x=>pendingReady(x.healthy.pendingCancel,x.healthy.baseline),'REPORT_PENDING_NO_DIALOG');
 one('late-dialog',x=>{x.healthy.late.dialogs=x.healthy.open.dialogs;},x=>closedReady(x.healthy.late,x.healthy.baseline),'REPORT_CANCEL_NO_LATE_DIALOG');
 one('lost-draft',x=>{x.healthy.reopened.form.details='';},x=>draftReady(x.healthy.reopened),'REPORT_DRAFT_HELD');
 one('wrong-connected-focus',x=>{x.healthy.finalClosed.active.currentTrigger=false;},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'REPORT_CONNECTED_FOCUS');
 one('offscreen-current-trigger',x=>{const r=x.healthy.finalClosed.trigger.rect;r.y=-r.height;r.bottom=0;},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'REPORT_TRIGGER_IN_VIEWPORT');
 one('retained-modal-lock',x=>{x.healthy.finalClosed.locks.bodyLock='1';},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'REPORT_BODY_RELEASE');
 one('missing-actual-module',x=>{x.healthy.formRequests=[];},x=>loadedReady(x.healthy),'REPORT_ACTIVATION_ACTUAL_MODULE');
 one('missing-refresh-refusal',x=>{x.failed.refused.alert=FAILURE;},x=>refusalReady(x.failed.refused,x.failed.failed),'REPORT_REFRESH_GUARDED_REFUSAL');
 one('no-user-refresh-navigation',x=>{x.failed.reloaded.navigationCount=x.failed.refused.navigationCount;},x=>reloadReady(x.failed.reloaded,x.failed.refused),'REPORT_USER_REFRESH_NAVIGATION');
 one('report-attempt',x=>{x.healthy.reportAttempts.push({kind:'changed-actual-record-judge-control-only'});},x=>noSend(x.healthy),'REPORT_NO_SEND');
 return result;
}
let FORM;
async function main(){
 assert(['1','true'].includes(process.env.CI)&&process.env.SIM_NETWORK==='offline','REPORT_REMOTE_OFFLINE_ONLY');
 assert.match(process.env.GITHUB_SHA||'',/^[a-f0-9]{40}$/,'REPORT_ACTUAL_SOURCE');
 const expectedOptions='--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs')+' --require='+path.join(ROOT,'scripts/qa/sharedChromePreload.cjs');
 assert.equal(process.env.NODE_OPTIONS,expectedOptions,'REPORT_ORIGINAL_BOUNDARIES_ONLY');
 assert(path.isAbsolute(process.env.REPORT_FORM_OUT||'')&&OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep),'REPORT_OUTSIDE_CHECKOUT');
 assert.equal(path.resolve(process.env.CHROME_RECIPE_OUT||''),OUT,'REPORT_PRELOAD_OUTPUT_BINDING');
 assert(path.isAbsolute(process.env.REPORT_FORM_SITE_DIST||'')&&fs.lstatSync(DIST).isDirectory(),'REPORT_COMPLETED_SITE_DIST');
 assert(!fs.existsSync(OUT),'REPORT_FRESH_OUTPUT');fs.mkdirSync(OUT,{recursive:true});assert(!fs.realpathSync(OUT).startsWith(fs.realpathSync(ROOT)+path.sep)&&fs.realpathSync(OUT)!==fs.realpathSync(ROOT),'REPORT_CANONICAL_OUTSIDE');
 const bindingFile=process.env.REPORT_FORM_BINDING_FILE;assert(bindingFile&&path.isAbsolute(bindingFile),'REPORT_BINDING_FILE');
 const binding=JSON.parse(fs.readFileSync(bindingFile,'utf8')),before=readInputs();
 assert.equal(binding.sourceHead,process.env.GITHUB_SHA);assert.equal(git('rev-parse','HEAD'),binding.sourceHead);
 const count=execFileSync('git',['ls-files','-z']).toString('utf8').split('\0').filter(Boolean).length;assert.equal(binding.trackedCount,count,'REPORT_FULL_SOURCE_COUNT');
 assert.equal(binding.playwrightVersion,'1.64.0');assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT,'node_modules/playwright-core/package.json'),'utf8')).version,binding.playwrightVersion);
 assert(Array.isArray(binding.pins));assert.equal(binding.pins.length,18);assert.equal(new Set(binding.pins.map(p=>p.file)).size,18);assert.deepEqual([...binding.pins].sort((a,b)=>a.file.localeCompare(b.file)),[...before].sort((a,b)=>a.file.localeCompare(b.file)),'REPORT_ACTUAL_SOURCE_BINDING');
 for(const pin of SOURCES){const actual=before.find(r=>r.file===pin.file);assert.deepEqual(actual,pin,'REPORT_SELECTED_SOURCE: '+pin.file);}
 loadFonts(process.env.FREE_KICK_FONT_CACHE,process.env.FONT_CACHE_MANIFEST_SHA256);const fontBefore=inventory(process.env.FREE_KICK_FONT_CACHE),distBefore=inventory(DIST);
 const modules=distBefore.filter(r=>/^assets\/ReportSiteIssueForm-[A-Za-z0-9_-]+\.js$/.test(r.file));assert.equal(modules.length,1,'REPORT_EXACT_LAZY_MODULE_FOUNDATION');FORM={...modules[0],url:BASE+'/'+modules[0].file};
 write('binding.json',binding);write('source-before.json',before);write('dist-before.json',distBefore);write('font-before.json',fontBefore);write('actual-form-module.json',FORM);
 const report={version:1,status:'REFUSED',source:process.env.GITHUB_SHA,phase:'ACTUAL_FOOTER_NO_SEND_ACTIVATION',planned:{contexts:8,screenshots:40,judgeControls:11},scope:'Actual built About Footer, lazy activation/cancellation/draft/focus/native offline refusal/user refresh only',limits:['No report submission/delivery or exercised backend guard claim.','No pending-save/prerender refusal, OS keyboard, whole-site, gzip savings, cap pass, live publication or source-fault browser controls.'],contexts:[],controls:[],failures:[]};
 let browser;
 try{
  browser=await pw.chromium.launch({headless:true,timeout:30000});
  let contextId=0;
  for(const spec of SPECS)for(const arm of ['healthy','failed']){
   const row={id:spec.id+'-'+arm,spec,arm,contextId:++contextId,completed:false,observations:[],images:[],targets:[],actions:[],formRequests:[],assets:[],reportAttempts:[],navigations:[],documentRequests:[],wire:{pageErrors:[],consoleErrors:[],console:[],requestFailures:[],webSockets:[],unknown:[]}};
   report.contexts.push(row);
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,isMobile:spec.mobile,hasTouch:spec.mobile,colorScheme:spec.theme,reducedMotion:spec.mobile?'reduce':'no-preference',serviceWorkers:'block',locale:'en-US',timezoneId:'UTC'});
   await context.addInitScript(seed,spec);
   const gate={seen:deferred(),action:deferred(),bodyReady:deferred(),finished:deferred(),failureObserved:deferred(),pass:false};
   const pending=[],requests=new Map();let page;
   try{
    await context.route('**/*',async route=>{
     try{
     const req=route.request(),url=new URL(req.url());
     if(url.origin===BASE){
      if(!['GET','HEAD'].includes(req.method())){row.wire.unknown.push({url:url.href,method:req.method(),type:req.resourceType()});await route.abort('blockedbyclient');return;}
      if(url.href===FORM.url){
       assert.equal(req.method(),'GET');assert.equal(req.resourceType(),'script');
       const item={url:url.href,method:req.method(),type:req.resourceType(),documentOrdinal:row.documentRequests.length,finished:false,aborted:false};row.formRequests.push(item);requests.set(req,item);
       if(!gate.pass&&row.formRequests.length===1){gate.seen.resolve(item);const action=await gate.action.promise;if(action==='abort'){await route.abort('blockedbyclient');item.aborted=true;return;}assert.equal(action,'continue');}
       await route.continue();return;
      }
      await route.fallback();return;
     }
     if(url.origin==='https://flawuiqbvjobmkfkauhw.supabase.co'&&['/functions/v1/report-relay','/rest/v1/question_reports'].includes(url.pathname)){
      const body=req.postData();row.reportAttempts.push({url:url.href,method:req.method(),type:req.resourceType(),bodyBytes:body===null?0:Buffer.byteLength(body),bodySha256:body===null?null:sha(body),forwarded:false});
      await route.abort('blockedbyclient');return;
     }
     await route.fallback();
     }catch(error){row.wire.unknown.push({kind:'route',message:String(error.stack||error)});try{await route.abort('blockedbyclient');}catch(abort){row.wire.unknown.push({kind:'route-abort',message:String(abort.stack||abort)});}}
    });
    await context.routeWebSocket('**/*',socket=>{row.wire.webSockets.push({url:socket.url()});socket.close();});
    page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
    page.on('request',req=>{if(req.isNavigationRequest()&&req.frame()===page.mainFrame())row.documentRequests.push({url:req.url(),method:req.method()});});
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())row.navigations.push({url:frame.url()});});
    page.on('pageerror',e=>row.wire.pageErrors.push({message:e.message,stack:e.stack}));
    page.on('console',m=>{const r={type:m.type(),text:m.text(),location:m.location()};row.wire.console.push(r);if(m.type()==='error')row.wire.consoleErrors.push(r);});
    page.on('requestfailed',req=>{const item=requests.get(req);if(item)item.failure=req.failure()?.errorText||null;pending.push((async()=>{let nativeOffline=false;try{nativeOffline=(await page.evaluate(()=>navigator.onLine))===false;}catch{}row.wire.requestFailures.push({url:req.url(),method:req.method(),type:req.resourceType(),error:req.failure()?.errorText||null,nativeOffline});if(req.url()===FORM.url)gate.failureObserved.resolve();})());});
    page.on('requestfinished',req=>{const item=requests.get(req);if(item){item.finished=true;gate.finished.resolve(item);}});
    page.on('response',response=>{
     const url=new URL(response.url());if(url.origin!==BASE)return;
     pending.push((async()=>{
      assert.equal(response.status(),200,'REPORT_LOCAL_STATUS');const file=physicalFor(url),body=await response.body(),expected=fs.readFileSync(file);
      assert.equal(body.length,expected.length,'REPORT_DIST_RESPONSE_BYTES');assert.equal(sha(body),sha(expected),'REPORT_DIST_RESPONSE_SHA');
      row.assets.push({url:url.href,file:path.relative(DIST,file).split(path.sep).join('/'),bytes:body.length,sha256:sha(body)});
      const item=requests.get(response.request());if(item){assert.equal(sha(body),FORM.sha256);item.responseSha256=sha(body);item.responseBytes=body.length;gate.bodyReady.resolve(item);}
     })().catch(e=>{row.wire.unknown.push({kind:'response',message:String(e.stack||e)});}));
    });
    if(arm==='healthy')await healthy(context,page,row,gate);else await failed(context,page,row,gate);
    assert.equal(row.images.length,arm==='healthy'?6:4,'REPORT_ORIGINAL_SCREENSHOT_COUNT');noSend(row);
   }catch(e){
    row.completed=false;row.failure={name:e.name,message:e.message,stack:e.stack};report.failures.push({id:row.id,...row.failure});
    if(page&&!page.isClosed())try{await observe(page,row,'failure-current',true);}catch(capture){row.failureCaptureError=String(capture.stack||capture);}
   }finally{
    gate.action.resolve('abort');
    let cursor=0;while(cursor<pending.length){const batch=pending.slice(cursor);cursor=pending.length;await Promise.allSettled(batch);}
    try{await context.close();}catch(e){row.completed=false;row.wire.unknown.push({kind:'context-close',message:String(e.stack||e)});}
    while(cursor<pending.length){const batch=pending.slice(cursor);cursor=pending.length;await Promise.allSettled(batch);}
    try{wireReady(row,ioRows().filter(r=>r.context===row.contextId));}catch(e){row.completed=false;row.wireFailure={name:e.name,message:e.message,stack:e.stack};report.failures.push({id:row.id,...row.wireFailure});}
    write(row.id+'-context.json',row);
   }
  }
  assert.equal(report.contexts.length,8,'REPORT_CONTEXT_COUNT');assert(report.contexts.every(r=>r.completed),'REPORT_ALL_ACTUAL_JOURNEYS_COMPLETE');
  assert.equal(report.contexts.reduce((n,r)=>n+r.images.length,0),40,'REPORT_ORIGINAL_PNG_COUNT');
  report.controls=controls(report.contexts.find(r=>r.arm==='healthy'),report.contexts.find(r=>r.arm==='failed'));assert.equal(report.controls.length,11,'REPORT_EFFECTIVE_JUDGE_CONTROLS');
  report.status='REPORT_FOOTER_ACTIVATION_COMPLETE';report.complete=true;
 }catch(e){report.failures.push({name:e.name,message:e.message,stack:e.stack});report.complete=false;}
 finally{
  if(browser)try{await browser.close();}catch(e){report.complete=false;report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  try{
   const finalIo=ioRows();assert(finalIo.every(item=>Number.isInteger(item.context)&&item.context>=1&&item.context<=8),'REPORT_FINAL_IO_CONTEXT_OWNERS');
   for(const row of report.contexts)try{wireReady(row,finalIo.filter(item=>item.context===row.contextId));}catch(e){row.completed=false;row.finalWireFailure={name:e.name,message:e.message,stack:e.stack};throw e;}
   write('browser-io-final-binding.json',{contexts:report.contexts.length,rows:finalIo.length,byContext:report.contexts.map(row=>({id:row.id,context:row.contextId,rows:finalIo.filter(item=>item.context===row.contextId).length,completed:row.completed})),allRecheckedAfterBrowserClose:true});
  }catch(e){report.complete=false;report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  try{const after=readInputs(),fontAfter=inventory(process.env.FREE_KICK_FONT_CACHE),distAfter=inventory(DIST);
  write('source-after.json',after);write('font-after.json',fontAfter);write('dist-after.json',distAfter);
  assert.deepEqual(after,before,'REPORT_SOURCE_HELD');assert.deepEqual(fontAfter,fontBefore,'REPORT_FONT_CACHE_HELD');assert.deepEqual(distAfter,distBefore,'REPORT_DIST_HELD');report.holds={source:true,font:true,dist:true};}
  catch(e){report.complete=false;report.status='REFUSED';const error={name:e.name,message:e.message,stack:e.stack};report.failures.push(error);write('end-hold-error.json',error);}
  const receipt=process.env.SIM_OFFLINE_RECEIPT;try{assert(receipt&&path.isAbsolute(receipt));const st=fs.lstatSync(receipt);assert(st.isFile()&&!st.isSymbolicLink()&&st.size===0,'REPORT_ORIGINAL_GUARD_EMPTY');report.originalGuardReceipt={file:receipt,bytes:st.size};}catch(e){report.complete=false;report.status='REFUSED';report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  if(!report.complete)report.status='REFUSED';write('report.json',report);
  const rows=inventory(OUT).filter(r=>r.file!=='evidence.sha256');fs.writeFileSync(path.join(OUT,'evidence.sha256'),rows.map(r=>r.sha256+'  '+r.file).join('\n')+'\n',{flag:'wx'});
 }
 assert.equal(report.status,'REPORT_FOOTER_ACTIVATION_COMPLETE');assert.equal(report.complete,true);
 console.log(JSON.stringify({status:report.status,contexts:report.contexts.length,screenshots:40,judgeControls:report.controls.length,source:process.env.GITHUB_SHA,reportDelivery:'NOT_EXERCISED_NO_ATTEMPTS',fullSuiteQualified:false,capQualified:false}));
}
await main();

