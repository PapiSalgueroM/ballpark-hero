/* Remote-only actual GameSeo Question activation, no report delivery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, seed, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT=process.cwd(),BASE='http://127.0.0.1:4173',SELF='scripts/qa/playReportQuestionActivationPortal.mjs';
const OUT=path.resolve(process.env.QUESTION_FORM_OUT||''),DIST=path.resolve(process.env.QUESTION_FORM_SITE_DIST||'');
const SOURCES=[{"file":"src/components/game/Footer.tsx","bytes":5898,"sha256":"4a355435dd03ded54bd4f775508f53044315ca9f4b527d0ba311113a081b19c1","gitBlob":"969a25f428fdb74df89c59342b6872bf97de08ba"},{"file":"src/hooks/useReportDraftLifecycle.ts","bytes":2270,"sha256":"3dc1871d8af5678e4c6271e33010fa4662c6b7fc3e38843a225a218d79f5565f","gitBlob":"b800429eba7274e76d42cd366f933e272d76bac0"},{"file":"src/lib/freshBuild.ts","bytes":11240,"sha256":"78276274e86e009eb28cc126d3d97b31c0fdbbd7f1f8a645e5a548f72cf96519","gitBlob":"295019e77698607a70390e5e6de6ee8130eaae27"},{"file":"src/lib/safeStorage.ts","bytes":19906,"sha256":"3be2f5e5de4da6f6137e5aad30482da3313965f71169fb965765e37c3206225a","gitBlob":"43ab9a6ed454594bf4e0e2a4a20edc5e45cf7683"},{"file":"src/components/ui/dialog.tsx","bytes":4041,"sha256":"db1fe38239f922d395d41471d8e9a996b9e8f6d87afddf9edbe3988f15a21fe8","gitBlob":"401b3b2aa4c9404d98d9f05bc3f88ce5eb6b19cd"},{"file":"src/components/game/reportKinds.ts","bytes":2805,"sha256":"1fc7568b82924f211b5fe9bc30844355705b82a7cd475e960ff8e75c866e5947","gitBlob":"f73941384a0fe6c8087cf30fde2707f35d6b39de"},{"file":"src/lib/reportContext.ts","bytes":3179,"sha256":"d81909a7e8b8adb07402aace3b5519c882750235cb8eebb9b0aa4f867ccd0490","gitBlob":"8fdc7777c10fc0bd8c3571ccc413ac5800e53141"},{"file":"src/App.tsx","bytes":35834,"sha256":"59c629fc0e983c81608f8039eacac2d0bd14579bb26a24e05eef395dcc90a243","gitBlob":"5d7e1ed074f4c0f695b0d5548b0045fc25029f6a"},{"file":"src/index.css","bytes":18125,"sha256":"4fec0dd645ad93ada2ab81b133f1ca87275a5524e449f3282277da8ea70ddce3","gitBlob":"f574ef6fb926c1d40b9f61845053d72e9bcd4eb2"},{"file":"scripts/lib/offlineTransport.cjs","bytes":10660,"sha256":"e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6"},{"file":"scripts/lib/playwrightLoader.mjs","bytes":2777,"sha256":"94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93","gitBlob":"4f7739e217e0a47ee82e6bfc8be1c04bed17454a"},{"file":"scripts/lib/hostLikeServer.mjs","bytes":2690,"sha256":"3958c9a3b4d9e49bb60a3b7dd72d81a997bd1caed56e82e4c3bae07e1a918ef0","gitBlob":"21059d5e8114669df61106c125d5272d357b6236"},{"file":"scripts/qa/siteMenuNavigationSupport.mjs","bytes":11560,"sha256":"c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303","gitBlob":"7909ce5805171367646e17a468fd919b88ad710e"},{"file":"scripts/qa/sharedChromePreload.cjs","bytes":8000,"sha256":"9e9da5a8e8ae62578e08d0df3ab5dd80acdbee3c40e6862fce9a1e83af0da57f","gitBlob":"8efcfc18ba520e637193e25c2bb8d4b97dd88919"},{"file":"src/components/game/ReportSiteIssue.tsx","bytes":3452,"sha256":"fb24e2463b28fb2f17d594e90bfe1ec449c6f87d777902ceec45c4d86ec76206","gitBlob":"94eeb490a9e9a91dad5d495d5d29ec902ac2176d"},{"file":"src/components/game/ReportSiteIssueForm.tsx","bytes":6964,"sha256":"07723be749de657db053824b7534d973f5dc7eed6fc498f6fe7651b9d1777e36","gitBlob":"314383d3c2ba465ce33318ace2536e956712b96d"},{"file":"src/components/seo/GameSeoContent.tsx","bytes":19815,"sha256":"7a6939881bd1918d444ec1b2b72ed996bb596c598b313414add7bd2212a2c148","gitBlob":"fee19761e67b5db603647eb500fbf8c57e15c542"},{"file":"src/pages/SoccerGrid.tsx","bytes":15218,"sha256":"8e88e3dd1f7e093802f92673d686a15ff6254efc398933cd879d371c702c68ed","gitBlob":"88113ce7f4f100af15b90b7a8ab9f4651c8887ba"},{"file":"src/hooks/useSoccerGrid.ts","bytes":15774,"sha256":"512e2f0fc013799f20c10b0b68e1fc39da71fcd5d0b2890c753e22f315455291","gitBlob":"6beb012bbc5cd4b2402724fb2a80efe7d0fc5f0c"},{"file":"src/hooks/useDailyPuzzle.ts","bytes":24577,"sha256":"7ca4592d195f8446106faad991b73500113405d2ae8091b2d87077200461c308","gitBlob":"eb73d25be45ef172fc536a1dc9a960513a2f1b63"},{"file":"src/lib/fetchSoccerGridPuzzles.ts","bytes":1012,"sha256":"7b9eee9e9a5f227156a0b424442b3d87c9e064979a632e49509d174e9732a201","gitBlob":"66f9bdc37d429fda0af9bbc72e856727cb342871"},{"file":"src/lib/fetchCareerPlayers.ts","bytes":2781,"sha256":"89ae3a408d4a279a433544223050e002b1ff0e2fae974e6192c8f9173f4cd901","gitBlob":"05ba3b3e7893599e3566f00e75ca05e80ab6e872"},{"file":"src/lib/fetchAllRows.ts","bytes":4835,"sha256":"5a3078c5caae0da47524c4130a4a895582b0abeded41ede8f2189f6a6337297f","gitBlob":"16a6d21750405e7a647576ff513ed8ee11d5ba6b"},{"file":"src/lib/dateUtils.ts","bytes":10649,"sha256":"b580faa88089a5d6a15aef0a1fc08f0f1444b38c273d458e3c74a43a7f72781e","gitBlob":"dff2e74f5081e87b3e9178fca86fd97939a9b4f1"},{"file":"src/types/soccerGrid.ts","bytes":492,"sha256":"a01ae7a8669799de915f51e92d9d89a3b99d6d2baf22fdbea6640c42fe480d8b","gitBlob":"fd75d4df578faac66ec19e73269fee96bf2ea779"},{"file":"src/data/soccerGridPuzzles.ts","bytes":6144,"sha256":"ec0fc2a51f89a70df667fb352a3081aa85ce035abee3de6153cdfc7fb3988fb8","gitBlob":"49141305cd850bf5ae655be8a4575b4d2db5d61e"},{"file":"src/integrations/supabase/client.ts","bytes":1247,"sha256":"c8bd6d5ebf2610a34eda085224ae087293162b1fda6d4b7d03ae51d77e369684","gitBlob":"d055e064f5c1c0c90230ca562966ee04dfdcd3ce"},{"file":"src/components/game/ReportQuestion.tsx","bytes":3675,"sha256":"38dce9ef1738529a614cd2010fbe09dee21fce8319df7244faf859c3e23196a4","gitBlob":"c4a019c66bf09aef35704e0aa6a3a292d7114f30"},{"file":"src/components/game/ReportQuestionForm.tsx","bytes":7018,"sha256":"481f37eeb5e048915af1eaa85d394e919b1bf1dad895b3b8edf345709e139419","gitBlob":"51f75b9e24324cff9e40e0ae1704d59df8f73950"}],INPUTS=[...SOURCES.map(row=>row.file),SELF];
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
function locksEqual(value,baseline){assert.deepEqual(value.locks,baseline.locks,'QUESTION_BODY_RELEASE');}
function coldReady(value){
 assert.equal(value.dialogs,0,'QUESTION_COLD_CLOSED');assert.equal(value.moduleRequests,0,'QUESTION_COLD_MODULE_ABSENT');
 assert.equal(value.trigger.count,1,'QUESTION_ACTUAL_FOOTER_TRIGGER');assert(value.trigger.connected&&value.trigger.visible,'QUESTION_ACTUAL_FOOTER_TRIGGER');
}
function pendingReady(value,baseline){
 assert.equal(value.dialogs,0,'QUESTION_PENDING_NO_DIALOG');assert.equal(value.status,'Loading report form...','QUESTION_PENDING_TRUTHFUL');
 assert.equal(value.trigger.busy,'true','QUESTION_PENDING_TRUTHFUL');locksEqual(value,baseline);
}
function closedReady(value,baseline){
 assert.equal(value.dialogs,0,'QUESTION_CANCEL_NO_LATE_DIALOG');assert.equal(value.status,null,'QUESTION_CANCEL_NO_LATE_DIALOG');
 assert.equal(value.trigger.count,1,'QUESTION_CONNECTED_FOCUS');
 assert(value.trigger.connected&&value.trigger.visible&&value.active.currentTrigger,'QUESTION_CONNECTED_FOCUS');
 const r=value.trigger.rect;assert(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=value.viewport.width&&r.bottom<=value.viewport.height,'QUESTION_TRIGGER_IN_VIEWPORT');
 assert.notEqual(value.trigger.busy,'true','QUESTION_CANCEL_NO_LATE_DIALOG');locksEqual(value,baseline);
}
function openReady(value){
 assert.equal(value.dialogs,1,'QUESTION_REAL_DIALOG');assert(value.form&&value.form.visible,'QUESTION_REAL_DIALOG');
 const r=value.form.rect;assert(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=value.viewport.width&&r.bottom<=value.viewport.height,'QUESTION_DIALOG_VIEWPORT');
 assert.equal(value.form.name,'Report a problem','QUESTION_REAL_DIALOG');assert.deepEqual(value.form.categories,['Wrong answer','Wrong info','Bug','Idea','Duplicate question','Other'],'QUESTION_REAL_CATEGORY_SET');checkFonts(value.fonts);
}
function draftReady(value){openReady(value);assert.equal(value.form.details,DRAFT,'QUESTION_DRAFT_HELD');assert.equal(value.form.category,'Bug','QUESTION_DRAFT_HELD');assert.equal(value.form.sendDisabled,false,'QUESTION_DRAFT_HELD');}
function failureReady(value){
 assert.equal(value.dialogs,0,'QUESTION_FAILURE_NO_DIALOG');assert.equal(value.alert,FAILURE,'QUESTION_LOAD_FAILURE');
 assert.equal(value.online,false,'QUESTION_NATIVE_OFFLINE_FOUNDATION');assert(value.refresh&&value.cancel,'QUESTION_FAILURE_CONTROLS');
}
function failureViewportReady(value){
 assert.equal(value.label,'load-failed','QUESTION_LOAD_FAILURE_VIEWPORT: initial observation');
 const viewport=value.viewport;
 assert(viewport&&Number.isFinite(viewport.width)&&Number.isFinite(viewport.height)&&viewport.width>0&&viewport.height>0,'QUESTION_LOAD_FAILURE_VIEWPORT: actual viewport');
 for(const key of ['alert','refresh','cancel']){
  const node=value.failureFeedback?.[key],r=node?.rect;
  assert(node&&node.count===1&&node.connected&&node.visible&&!node.disabled&&node.display!=='none'&&!['hidden','collapse'].includes(node.visibility)&&Number.isFinite(Number(node.opacity))&&Number(node.opacity)>0&&r&&[r.x,r.y,r.width,r.height,r.right,r.bottom].every(Number.isFinite)&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=viewport.width&&r.bottom<=viewport.height,'QUESTION_LOAD_FAILURE_VIEWPORT: '+key);
 }
}

function refusalReady(value,before){
 assert.equal(value.alert,REFUSED,'QUESTION_REFRESH_GUARDED_REFUSAL');assert.equal(value.online,false,'QUESTION_NATIVE_OFFLINE_FOUNDATION');
 assert.equal(value.navigationCount,before.navigationCount,'QUESTION_REFRESH_NO_OFFLINE_RELOAD');assert.equal(value.dialogs,0,'QUESTION_REFRESH_NO_OFFLINE_RELOAD');
}
function reloadReady(value,before){
 assert.equal(value.navigationCount,before.navigationCount+1,'QUESTION_USER_REFRESH_NAVIGATION');assert.equal(value.online,true,'QUESTION_USER_REFRESH_NAVIGATION');
 coldReady(value);
}
function noSend(row){assert.equal(row.reportAttempts.length,0,'QUESTION_NO_SEND');}
function loadedReady(row){assert(row.formRequests.some(r=>r.finished&&r.responseSha256===FORM.sha256),'QUESTION_ACTIVATION_ACTUAL_MODULE');}
/* Observes actual nodes only. No application values or callbacks are supplied. */
function collect(){
 const visible=node=>{if(!node||!node.isConnected)return false;const s=getComputedStyle(node);return node.getClientRects().length>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse';};
 const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const owner=document.querySelector('#root [data-seo-content="ready"] > [data-no-prerender]'),buttons=owner?[...owner.querySelectorAll('button')]:[],feedback=document.querySelector('[data-report-feedback="question"]'),feedbackButtons=feedback?[...feedback.querySelectorAll('button')]:[];
 const triggers=buttons.filter(b=>b.textContent.trim()==='Report a problem'),trigger=triggers[0],all=[...document.querySelectorAll('[role="dialog"][data-state="open"]')];
 const form=all.find(node=>{const id=node.getAttribute('aria-labelledby');return id&&document.getElementById(id)?.textContent.trim()==='Report a problem';});
 const active=document.activeElement,b=getComputedStyle(document.body),d=getComputedStyle(document.documentElement);
 const category=form?[...form.querySelectorAll('button')].find(node=>node.classList.contains('bg-primary')&&!node.classList.contains('w-full')):null;
 const send=form?.querySelector('button.w-full');
  const inspect=nodes=>{const node=nodes[0],style=node?getComputedStyle(node):null;return {count:nodes.length,connected:!!node?.isConnected,visible:visible(node),disabled:!!node?.matches(':disabled'),display:style?.display??null,visibility:style?.visibility??null,opacity:style?.opacity??null,rect:rect(node)};};

 return {
  href:location.href,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth},
  trigger:{count:triggers.length,connected:!!trigger?.isConnected,visible:visible(trigger),busy:trigger?.getAttribute('aria-busy')||null,rect:rect(trigger)},
  active:{tag:active?.tagName||null,text:active?.textContent?.trim().slice(0,100)||'',currentTrigger:active===trigger,visible:visible(active)},
  status:feedback?.querySelector('[role="status"]')?.textContent.trim()||null,alert:feedback?.querySelector('[role="alert"]')?.textContent.trim()||null,
  failureFeedback:{alert:inspect(feedback?[...feedback.querySelectorAll('[role="alert"]')]:[]),refresh:inspect(feedbackButtons.filter(b=>b.textContent.trim()==='Refresh page')),cancel:inspect(feedbackButtons.filter(b=>b.textContent.trim()==='Cancel'))},
  cancel:feedbackButtons.some(b=>b.textContent.trim()==='Cancel'),refresh:feedbackButtons.some(b=>b.textContent.trim()==='Refresh page'),dialogs:all.length,
  form:form?{visible:visible(form),name:document.getElementById(form.getAttribute('aria-labelledby'))?.textContent.trim()||'',rect:rect(form),details:form.querySelector('textarea')?.value??null,categories:[...form.querySelectorAll('button.rounded-full')].map(node=>node.textContent.trim()),category:category?.textContent.trim()||'',sendDisabled:send?.disabled??null}:null,
  locks:{bodyOverflow:b.overflow,bodyOverflowY:b.overflowY,rootOverflow:d.overflow,rootOverflowY:d.overflowY,bodyPointer:b.pointerEvents,rootPointer:d.pointerEvents,bodyLock:document.body.getAttribute('data-scroll-locked')},
  fonts:{status:document.fonts.status,inter:document.fonts.check('16px Inter'),display:document.fonts.check('16px "Space Grotesk"'),faces:[...document.fonts].map(f=>({family:f.family,status:f.status}))},
  theme:{light:document.documentElement.classList.contains('light')},media:{coarse:matchMedia('(pointer:coarse)').matches,reduce:matchMedia('(prefers-reduced-motion:reduce)').matches},
  trusted:window.__siteMenuTrusted||[],
 };
}
const questionFeedback=page=>page.locator('[data-report-feedback="question"]');
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('QUESTION_SETUP_OR_COMPLETION_TIMEOUT: '+label)),10000);})]);}finally{clearTimeout(timer);}}
function physicalFor(url){
 assert.equal(url.origin,BASE,'QUESTION_LOCAL_ORIGIN');assert(!url.username&&!url.password&&!url.hash,'QUESTION_LOCAL_URL');
 const freshness=url.pathname==='/'&&[...url.searchParams.keys()].join('|')==='fresh'&&/^\d+$/.test(url.searchParams.get('fresh'));
 assert(!url.search||freshness,'QUESTION_LOCAL_QUERY');
 const decoded=decodeURIComponent(url.pathname),rel=path.resolve(DIST,'.'+decoded);assert(rel===DIST||rel.startsWith(DIST+path.sep),'QUESTION_DIST_PATH');
 const candidates=[rel,path.join(rel,'index.html')],file=candidates.find(f=>{try{return fs.lstatSync(f).isFile();}catch{return false;}})||path.join(DIST,'index.html');
 const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink(),'QUESTION_DIST_REGULAR');return file;
}
async function observe(page,row,label,png=false){
 const value=await page.evaluate(collect);value.label=label;value.navigationCount=row.navigations.length;value.moduleRequests=row.formRequests.filter(x=>x.documentOrdinal===row.documentRequests.length).length;
 row.observations.push(value);
 write(row.id+'-'+label+'.json',value);
 if(png){const file=row.id+'-'+label+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:false,animations:'disabled'});row.images.push(file);}
 return value;
}
async function target(page,row,locator,label,minimum=0){
 assert.equal(await locator.count(),1,'QUESTION_NATIVE_TARGET_UNIQUE: '+label);
 const beforeScroll=await page.evaluate(collect);await locator.scrollIntoViewIfNeeded();const beforeClick=await page.evaluate(collect);
 const value=await locator.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},hit:!!hit&&(hit===node||node.contains(hit)),visible:node.isConnected&&node.getClientRects().length>0,viewport:{width:innerWidth,height:innerHeight}};});
 row.targets.push({label,beforeScroll,beforeClick,...value});write(row.id+'-target-'+row.targets.length+'.json',{label,beforeScroll,beforeClick,...value});
 assert(value.visible&&value.hit&&value.rect.x>=0&&value.rect.y>=0&&value.rect.right<=value.viewport.width&&value.rect.bottom<=value.viewport.height,'QUESTION_NATIVE_TARGET_HIT: '+label);
 if(minimum)assert(value.rect.width>=minimum&&value.rect.height>=minimum,'QUESTION_NEW_TARGET_44: '+label);
 if(row.spec.mobile)await page.touchscreen.tap(value.rect.x+value.rect.width/2,value.rect.y+value.rect.height/2);
 else{await locator.focus();assert(await locator.evaluate(n=>document.activeElement===n),'QUESTION_KEYBOARD_TARGET');await page.keyboard.press('Enter');}
 row.actions.push({label,input:row.spec.mobile?'native touchscreen tap':'actual keyboard Enter'});
}
async function waitClosed(page,baseline){
 await page.getByRole('dialog',{name:'Report a problem',exact:true}).waitFor({state:'hidden'});
 await page.waitForFunction(expected=>{
  const owner=document.querySelector('#root [data-seo-content="ready"] > [data-no-prerender]'),trigger=owner?[...owner.querySelectorAll('button')].find(b=>b.textContent.trim()==='Report a problem'):null;
  if(!trigger?.isConnected||!trigger.getClientRects().length||document.activeElement!==trigger)return false;
  const b=getComputedStyle(document.body),d=getComputedStyle(document.documentElement);
  const locks={bodyOverflow:b.overflow,bodyOverflowY:b.overflowY,rootOverflow:d.overflow,rootOverflowY:d.overflowY,bodyPointer:b.pointerEvents,rootPointer:d.pointerEvents,bodyLock:document.body.getAttribute('data-scroll-locked')};
  return Object.keys(expected).every(k=>locks[k]===expected[k]);
 },baseline.locks,{timeout:10000});
}
async function hydrate(page,row){
 await page.goto(BASE+'/soccer-grid',{waitUntil:'networkidle'});await page.locator('#root #dukb-main').waitFor({state:'visible'});await page.locator('#root [data-seo-content="ready"]').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 const trigger=page.locator('#root [data-seo-content="ready"] > [data-no-prerender]').getByRole('button',{name:'Report a problem',exact:true});assert.equal(await trigger.count(),1,'QUESTION_ACTUAL_FOOTER_TRIGGER');await trigger.scrollIntoViewIfNeeded();
 const value=await observe(page,row,'cold',row.arm==='healthy');coldReady(value);checkFonts(value.fonts);
 assert.equal(value.theme.light,row.spec.theme==='light','QUESTION_THEME');assert.equal(value.media.coarse,row.spec.mobile,'QUESTION_NATIVE_POINTER');assert.equal(value.media.reduce,row.spec.mobile,'QUESTION_MOTION');
 row.baseline=value;return trigger;
}
async function healthy(context,page,row,gate){
 const trigger=await hydrate(page,row),oldTrigger=await trigger.elementHandle();
 await target(page,row,trigger,'first report activation');await bounded(gate.seen.promise,'actual Form request');await questionFeedback(page).getByRole('status').waitFor();
 row.pendingCancel=await observe(page,row,'pending-cancel',true);pendingReady(row.pendingCancel,row.baseline);
 await target(page,row,questionFeedback(page).getByRole('button',{name:'Cancel',exact:true}),'Cancel pending',44);
 await waitClosed(page,row.baseline);row.cancelled=await observe(page,row,'cancelled');closedReady(row.cancelled,row.baseline);
 await target(page,row,trigger,'reopen still-held report');await questionFeedback(page).getByRole('status').waitFor();
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
 const trigger=await hydrate(page,row);
 await target(page,row,trigger,'activate actual failed Form');await bounded(gate.seen.promise,'actual failing Form request');await questionFeedback(page).getByRole('status').waitFor();
 row.pending=await observe(page,row,'pending');pendingReady(row.pending,row.baseline);
 const failure=page.waitForEvent('requestfailed',{predicate:request=>request.url()===FORM.url,timeout:10000});
 await context.setOffline(true);assert.equal(await page.evaluate(()=>navigator.onLine),false,'QUESTION_NATIVE_OFFLINE_FOUNDATION');gate.action.resolve('abort');await failure;await bounded(gate.failureObserved.promise,'native chunk failure observation');
 await questionFeedback(page).getByRole('alert').waitFor();row.failed=await observe(page,row,'load-failed',true);failureReady(row.failed);failureViewportReady(row.failed);assert.equal(row.failed.navigationCount,row.baseline.navigationCount,'QUESTION_NO_AUTOMATIC_RELOAD');
 await target(page,row,questionFeedback(page).getByRole('button',{name:'Refresh page',exact:true}),'offline user Refresh',44);
 await questionFeedback(page).getByText(REFUSED,{exact:true}).waitFor();row.refused=await observe(page,row,'refresh-refused',true);refusalReady(row.refused,row.failed);
 await context.setOffline(false);gate.pass=true;
 const navigation=page.waitForNavigation({waitUntil:'networkidle',timeout:10000});
 await target(page,row,questionFeedback(page).getByRole('button',{name:'Refresh page',exact:true}),'online user Refresh',44);await navigation;
 await page.locator('#root #dukb-main').waitFor({state:'visible'});await page.locator('#root [data-seo-content="ready"]').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 const current=page.locator('#root [data-seo-content="ready"] > [data-no-prerender]').getByRole('button',{name:'Report a problem',exact:true});await current.scrollIntoViewIfNeeded();
 row.reloaded=await observe(page,row,'reloaded-closed',true);reloadReady(row.reloaded,row.refused);
 await target(page,row,current,'activation after real refresh');const dialog=page.getByRole('dialog',{name:'Report a problem',exact:true});await dialog.waitFor();
 row.open=await observe(page,row,'actual-open-after-refresh',true);openReady(row.open);assert.equal(row.open.form.details,'');assert.equal(row.open.form.sendDisabled,true);
 await page.keyboard.press('Escape');await waitClosed(page,row.reloaded);row.finalClosed=await observe(page,row,'final-closed');closedReady(row.finalClosed,row.reloaded);
 await bounded(Promise.all([gate.bodyReady.promise,gate.finished.promise]),'actual refreshed Form bytes and finish');loadedReady(row);noSend(row);row.completed=true;
}


function ioRows(){
 const file=path.join(OUT,'browser-io.jsonl');assert(fs.existsSync(file),'QUESTION_BOUNDARY_TELEMETRY_PRESENT');
 return fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
}
function wireReady(row,io){
 sourceReadsReady(row);
 assert.equal(row.wire.pageErrors.length,0,'QUESTION_NO_PAGE_ERROR');assert.equal(row.wire.webSockets.length,0,'QUESTION_NO_SOCKET');
 assert.equal(row.wire.unknown.length,0,'QUESTION_NO_UNKNOWN_REQUEST');noSend(row);
 assert(io.length>0&&io.some(r=>r.kind==='prepared-font'),'QUESTION_REAL_PREPARED_FONT');
 assert(io.every(r=>['prepared-font','source-shell-fixture','local-flag-abort'].includes(r.kind)),'QUESTION_BOUNDARY_KNOWN_ONLY');
 const flags=io.filter(r=>r.kind==='local-flag-abort').map(r=>r.url),expected=[...flags];
 if(row.arm==='failed')expected.push(FORM.url);
 const formAborts=row.formRequests.filter(r=>r.aborted),deliberateInspectorAbort=row.arm==='failed'&&formAborts.length===1&&formAborts[0]===row.formRequests[0]&&formAborts[0].url===FORM.url&&formAborts[0].method==='GET'&&formAborts[0].type==='script'&&formAborts[0].documentOrdinal===1&&formAborts[0].finished===false&&formAborts[0].failure==='net::ERR_BLOCKED_BY_CLIENT.Inspector'&&io.every(r=>r.context===row.contextId);
 let freshness=0;
 for(const failure of row.wire.requestFailures){
  if(failure.url===FORM.url&&row.arm==='failed'){assert.equal(failure.method,'GET');assert.equal(failure.type,'script');assert((['net::ERR_BLOCKED_BY_CLIENT','net::ERR_INTERNET_DISCONNECTED'].includes(failure.error)||(failure.error==='net::ERR_BLOCKED_BY_CLIENT.Inspector'&&deliberateInspectorAbort))&&failure.nativeOffline,'QUESTION_NATIVE_CHUNK_FAILURE');continue;}
  if(flags.includes(failure.url)){assert.equal(failure.method,'GET');assert.equal(failure.type,'image');assert.equal(failure.error,'net::ERR_BLOCKED_BY_CLIENT');continue;}
  const url=new URL(failure.url),sourceFresh=url.origin===BASE&&url.pathname==='/'&&[...url.searchParams.keys()].join('|')==='fresh'&&/^\d+$/.test(url.searchParams.get('fresh'));
  assert(sourceFresh&&row.arm==='failed'&&failure.nativeOffline&&failure.method==='GET'&&failure.type==='fetch'&&failure.error==='net::ERR_INTERNET_DISCONNECTED','QUESTION_UNCORRELATED_REQUEST_FAILURE');
  freshness++;assert(freshness<=1,'QUESTION_EXTRA_OFFLINE_FRESHNESS');expected.push(failure.url);
 }
 assert.deepEqual(row.wire.requestFailures.map(r=>r.url).sort(),expected.sort(),'QUESTION_EXACT_FAILURE_MULTISET');
 const consoleUrls=row.wire.consoleErrors.map(r=>{assert(['Failed to load resource: net::ERR_BLOCKED_BY_CLIENT','Failed to load resource: net::ERR_INTERNET_DISCONNECTED'].includes(r.text)||(r.text==='Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector'&&r.location.url===FORM.url&&deliberateInspectorAbort&&row.wire.requestFailures.some(f=>f.url===FORM.url&&f.method==='GET'&&f.type==='script'&&f.error==='net::ERR_BLOCKED_BY_CLIENT.Inspector'&&f.nativeOffline)),'QUESTION_UNCORRELATED_CONSOLE');return r.location.url;}).sort();
 assert.deepEqual(consoleUrls,[...expected].sort(),'QUESTION_EXACT_CONSOLE_MULTISET');
 assert.equal(row.formRequests.filter(r=>r.aborted).length,row.arm==='failed'?1:0,'QUESTION_EXACT_DELIBERATE_CHUNK_REFUSAL');
}
function controls(healthyRow,failedRow,failedIo){
 assert.equal(healthyRow.completed,true,'QUESTION_WIRE_CONTROL_HEALTHY_COMPLETED');assert.equal(failedRow.completed,true,'QUESTION_WIRE_CONTROL_FAILED_JOURNEY_COMPLETED');wireReady(failedRow,failedIo);
 write('control-wire-io-foundation.json',{id:failedRow.id,contextId:failedRow.contextId,rows:failedIo});
 const foundation={healthy:healthyRow,failed:failedRow},original=JSON.stringify(foundation)+'\n',result=[];
 fs.writeFileSync(path.join(OUT,'control-foundation.json'),original,{flag:'wx'});
 const one=(id,mutate,judge,marker)=>{
  const changed=JSON.parse(original);mutate(changed);const encoded=JSON.stringify(changed)+'\n',file='control-'+id+'.work.json';
  fs.writeFileSync(path.join(OUT,file),encoded,{flag:'wx'});assert.notEqual(sha(encoded),sha(original),'QUESTION_CONTROL_CHANGED');
  const actual=JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8'));let error;try{judge(actual);}catch(e){error=e;}
  assert(error instanceof assert.AssertionError&&String(error.message).includes(marker),'QUESTION_CONTROL_OWNED: '+id);
  fs.writeFileSync(path.join(OUT,'control-'+id+'.changed.json'),encoded,{flag:'wx'});
  fs.writeFileSync(path.join(OUT,file),original);const restored=fs.readFileSync(path.join(OUT,file),'utf8');assert.equal(sha(restored),sha(original),'QUESTION_CONTROL_RESTORED');
  judge(JSON.parse(restored));
  result.push({id,foundation:'control-foundation.json',changed:'control-'+id+'.changed.json',restored:file,sourceBytes:Buffer.byteLength(original),changedBytes:Buffer.byteLength(encoded),sourceSha256:sha(original),changedSha256:sha(encoded),restoredSha256:sha(restored),error:{name:error.name,message:error.message,code:error.code,stack:error.stack},marker,scope:'ACTUAL_BROWSER_RECORD_JUDGE_ONLY_NOT_SOURCE_FAULT'});
 };
 one('cold-module-request',x=>{x.healthy.baseline.moduleRequests=1;},x=>coldReady(x.healthy.baseline),'QUESTION_COLD_MODULE_ABSENT');
 one('pending-dialog',x=>{x.healthy.pendingCancel.dialogs=x.healthy.open.dialogs;},x=>pendingReady(x.healthy.pendingCancel,x.healthy.baseline),'QUESTION_PENDING_NO_DIALOG');
 one('late-dialog',x=>{x.healthy.late.dialogs=x.healthy.open.dialogs;},x=>closedReady(x.healthy.late,x.healthy.baseline),'QUESTION_CANCEL_NO_LATE_DIALOG');
 one('lost-draft',x=>{x.healthy.reopened.form.details='';},x=>draftReady(x.healthy.reopened),'QUESTION_DRAFT_HELD');
 one('wrong-connected-focus',x=>{x.healthy.finalClosed.active.currentTrigger=false;},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'QUESTION_CONNECTED_FOCUS');
 one('offscreen-current-trigger',x=>{const r=x.healthy.finalClosed.trigger.rect;r.y=-r.height;r.bottom=0;},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'QUESTION_TRIGGER_IN_VIEWPORT');
 one('retained-modal-lock',x=>{x.healthy.finalClosed.locks.bodyLock='1';},x=>closedReady(x.healthy.finalClosed,x.healthy.baseline),'QUESTION_BODY_RELEASE');
 one('missing-actual-module',x=>{x.healthy.formRequests=[];},x=>loadedReady(x.healthy),'QUESTION_ACTIVATION_ACTUAL_MODULE');
 one('missing-refresh-refusal',x=>{x.failed.refused.alert=FAILURE;},x=>refusalReady(x.failed.refused,x.failed.failed),'QUESTION_REFRESH_GUARDED_REFUSAL');
 one('no-user-refresh-navigation',x=>{x.failed.reloaded.navigationCount=x.failed.refused.navigationCount;},x=>reloadReady(x.failed.reloaded,x.failed.refused),'QUESTION_USER_REFRESH_NAVIGATION');
 one('report-attempt',x=>{x.healthy.reportAttempts.push({kind:'changed-actual-record-judge-control-only'});},x=>noSend(x.healthy),'QUESTION_NO_SEND');
 one('wire-unknown-native-error',x=>{x.failed.wire.requestFailures.find(f=>f.url===FORM.url).error='net::ERR_BLOCKED_BY_CLIENT.Unknown';},x=>wireReady(x.failed,failedIo),'QUESTION_NATIVE_CHUNK_FAILURE');
 one('wire-unknown-console-variant',x=>{x.failed.wire.consoleErrors.find(r=>r.location.url===FORM.url).text='Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Unknown';},x=>wireReady(x.failed,failedIo),'QUESTION_UNCORRELATED_CONSOLE');
 one('wire-online-native-failure',x=>{x.failed.wire.requestFailures.find(f=>f.url===FORM.url).nativeOffline=false;},x=>wireReady(x.failed,failedIo),'QUESTION_NATIVE_CHUNK_FAILURE');
 for(const row of result.slice(11))row.wireFoundation='control-wire-io-foundation.json';
 return result;
}
function viewportControls(initial){
 failureReady(initial);failureViewportReady(initial);
 const original=JSON.stringify(initial)+'\n',foundation='viewport-control-initial-foundation.json',result=[];
 fs.writeFileSync(path.join(OUT,foundation),original,{flag:'wx'});
 for(const key of ['alert','refresh','cancel'])for(const mutation of ['hidden','offscreen']){
  const changed=JSON.parse(original),node=changed.failureFeedback[key],id='viewport-'+key+'-'+mutation;
  if(mutation==='hidden')node.visible=false;
  else{node.rect.x=changed.viewport.width+1;node.rect.right=node.rect.x+node.rect.width;}
  const encoded=JSON.stringify(changed)+'\n',file=id+'.work.json',changedFile=id+'.changed.json';
  fs.writeFileSync(path.join(OUT,file),encoded,{flag:'wx'});assert.notEqual(sha(encoded),sha(original),'QUESTION_VIEWPORT_CONTROL_CHANGED');
  let error;try{failureViewportReady(JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8')));}catch(e){error=e;}
  assert(error instanceof assert.AssertionError&&error.code==='ERR_ASSERTION'&&String(error.message).includes('QUESTION_LOAD_FAILURE_VIEWPORT: '+key),'QUESTION_VIEWPORT_CONTROL_OWNED: '+id);
  fs.writeFileSync(path.join(OUT,changedFile),encoded,{flag:'wx'});
  fs.writeFileSync(path.join(OUT,file),original);const restored=fs.readFileSync(path.join(OUT,file),'utf8');assert.equal(sha(restored),sha(original),'QUESTION_VIEWPORT_CONTROL_RESTORED');
  failureViewportReady(JSON.parse(restored));
  result.push({id,foundation,changed:changedFile,restored:file,sourceBytes:Buffer.byteLength(original),changedBytes:Buffer.byteLength(encoded),sourceSha256:sha(original),changedSha256:sha(encoded),restoredSha256:sha(restored),error:{name:error.name,message:error.message,code:error.code,stack:error.stack},marker:'QUESTION_LOAD_FAILURE_VIEWPORT',target:key,scope:'ACTUAL_ACCEPTED_INITIAL_BROWSER_RECORD_JUDGE_ONLY_NOT_SOURCE_FAULT'});
 }
 return result;
}

const READS=[{"query":{"order":"sort_order.asc","select":"puzzle_id,rows_json,cols_json"},"path":"/rest/v1/soccer_grid_puzzles"},{"query":{"order":"player_name.asc","select":"id,player_name,nationality,position"},"path":"/rest/v1/career_players"},{"query":{"select":"player_id,season,club,goals,assists,appearances,market_value,sort_order","limit":"1000","order":"player_id.asc,sort_order.asc","offset":"0"},"path":"/rest/v1/career_seasons"}],DEPENDENCY_PROTOCOL=[{"file":"node_modules/@supabase/postgrest-js/src/PostgrestTransformBuilder.ts","bytes":12258,"sha256":"5b827ea27a1ed0abb57b98b602245b146daeec67ec62f9edff6cc63cedf4de39","actual970DependencyManifestEqual":true},{"file":"node_modules/@supabase/supabase-js/src/lib/version.ts","bytes":446,"sha256":"6e3edcff18e7fcaca7e8d307028ef5fbc72943caf670aafd4709e36ff118748d","actual970DependencyManifestEqual":true},{"file":"node_modules/@supabase/supabase-js/src/lib/constants.ts","bytes":909,"sha256":"5e7fa9ee74e0994c6d0c088a04b4240acf2b8cd74718e138b5368dd718f5ad24","actual970DependencyManifestEqual":true},{"file":"node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts","bytes":12394,"sha256":"0afab7f33c58d74cacec6e4dba5be9e1fdcb4cc4546a5a03f5930252ff1d5ca3","actual970DependencyManifestEqual":true}];

let API_ORIGIN,PUBLIC_KEY;
function sourceReadFor(request,url){
 if(url.origin!==API_ORIGIN||url.username||url.password||url.hash||request.method()!=='GET'||request.resourceType()!=='fetch'||request.postData()!==null)return null;
 const spec=READS.find(row=>row.path===url.pathname);if(!spec)return null;
 const entries=[...url.searchParams.entries()],keys=entries.map(([key])=>key),wanted=Object.keys(spec.query);
 if(keys.length!==wanted.length||new Set(keys).size!==wanted.length||wanted.some(key=>url.searchParams.get(key)!==spec.query[key]))return null;
 const headers=request.headers();let frameUrl;try{frameUrl=request.frame().url();}catch{return null;}
 if(frameUrl!==BASE+'/soccer-grid'||headers.apikey!==PUBLIC_KEY||headers.authorization!=='Bearer '+PUBLIC_KEY||headers['accept-profile']!=='public'||headers['x-client-info']!=='supabase-js-web/2.95.3')return null;
 return {id:url.pathname.slice('/rest/v1/'.length),url:url.href,method:request.method(),type:request.resourceType(),rawBody:request.postData(),frameUrl,query:entries,headers};
}
function sourceReadRecord(value){
 const url=new URL(value.url),spec=READS.find(row=>row.path===url.pathname);
 assert(spec&&url.origin===API_ORIGIN&&!url.username&&!url.password&&!url.hash,'QUESTION_SOURCE_READ_SHAPE');
 assert.equal(value.id,url.pathname.slice('/rest/v1/'.length),'QUESTION_SOURCE_READ_SHAPE');
 assert.equal(value.method,'GET','QUESTION_SOURCE_READ_SHAPE');assert.equal(value.type,'fetch','QUESTION_SOURCE_READ_SHAPE');assert.equal(value.rawBody,null,'QUESTION_SOURCE_READ_SHAPE');
 assert.equal(value.frameUrl,BASE+'/soccer-grid','QUESTION_SOURCE_READ_FRAME');
 const keys=[...url.searchParams.keys()],wanted=Object.keys(spec.query);assert.equal(keys.length,wanted.length,'QUESTION_SOURCE_READ_SHAPE');assert.equal(new Set(keys).size,wanted.length,'QUESTION_SOURCE_READ_SHAPE');
 for(const key of wanted)assert.equal(url.searchParams.get(key),spec.query[key],'QUESTION_SOURCE_READ_SHAPE');
 assert.deepEqual(value.query,[...url.searchParams.entries()],'QUESTION_SOURCE_READ_SHAPE');
 assert.equal(value.headers.apikey,PUBLIC_KEY,'QUESTION_SOURCE_READ_HEADERS');assert.equal(value.headers.authorization,'Bearer '+PUBLIC_KEY,'QUESTION_SOURCE_READ_HEADERS');
 assert.equal(value.headers['accept-profile'],'public','QUESTION_SOURCE_READ_HEADERS');assert.equal(value.headers['x-client-info'],'supabase-js-web/2.95.3','QUESTION_SOURCE_READ_HEADERS');
 assert.equal(value.forwarded,false,'QUESTION_SOURCE_READ_LOCAL_ONLY');assert.equal(value.status,200,'QUESTION_SOURCE_READ_LOCAL_ONLY');
 assert.equal(value.responseBody,'[]','QUESTION_SOURCE_READ_EMPTY_ONLY');assert.equal(value.responseBytes,2,'QUESTION_SOURCE_READ_EMPTY_ONLY');assert.equal(value.responseSha256,sha('[]'),'QUESTION_SOURCE_READ_EMPTY_ONLY');
}
function sourceReadsReady(row){
 const documents=row.documentRequests.length;assert(documents===1||row.arm==='failed'&&documents===2,'QUESTION_SOURCE_READ_DOCUMENTS');
 assert.equal(row.readFixtures.length,3*documents,'QUESTION_EXACT_SOURCE_READ_MULTISET');
 for(let documentOrdinal=1;documentOrdinal<=documents;documentOrdinal++){
  const rows=row.readFixtures.filter(value=>value.documentOrdinal===documentOrdinal);assert.equal(rows.length,3,'QUESTION_EXACT_SOURCE_READ_MULTISET');
  for(const spec of READS)assert.equal(rows.filter(value=>new URL(value.url).pathname===spec.path).length,1,'QUESTION_EXACT_SOURCE_READ_MULTISET');
 }
 for(const value of row.readFixtures)sourceReadRecord(value);
}
function sourceReadControls(row){
 assert.equal(row.completed,true,'QUESTION_SOURCE_READ_CONTROL_FOUNDATION');sourceReadsReady(row);
 const original=JSON.stringify(row)+'\n',result=[];fs.writeFileSync(path.join(OUT,'source-read-control-foundation.json'),original,{flag:'wx'});
 const one=(id,mutate,marker)=>{
  const value=JSON.parse(original);mutate(value);const changed=JSON.stringify(value)+'\n',file='source-read-control-'+id+'.work.json';assert.notEqual(sha(changed),sha(original),'QUESTION_SOURCE_READ_CONTROL_CHANGED');
  fs.writeFileSync(path.join(OUT,file),changed,{flag:'wx'});let error;try{sourceReadsReady(JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8')));}catch(e){error=e;}
  assert(error instanceof assert.AssertionError&&error.code==='ERR_ASSERTION'&&String(error.message).includes(marker),'QUESTION_SOURCE_READ_CONTROL_OWNED');
  fs.writeFileSync(path.join(OUT,'source-read-control-'+id+'.changed.json'),changed,{flag:'wx'});fs.writeFileSync(path.join(OUT,file),original);
  const restored=fs.readFileSync(path.join(OUT,file),'utf8');assert.equal(sha(restored),sha(original));sourceReadsReady(JSON.parse(restored));
  result.push({id,marker,foundation:'source-read-control-foundation.json',changed:'source-read-control-'+id+'.changed.json',restored:file,sourceSha256:sha(original),changedSha256:sha(changed),restoredSha256:sha(restored),error:{name:error.name,code:error.code,message:error.message,stack:error.stack},scope:'ACTUAL_COMPLETED_SOURCE_READ_RECORD_ONLY'});
 };
 one('unknown-query',value=>{value.readFixtures[0].url+='&unknown=1';},'QUESTION_SOURCE_READ_SHAPE');
 one('foreign-frame',value=>{value.readFixtures[0].frameUrl=BASE+'/about';},'QUESTION_SOURCE_READ_FRAME');
 one('extra-read',value=>{value.readFixtures.push({...value.readFixtures[0]});},'QUESTION_EXACT_SOURCE_READ_MULTISET');
 return result;
}
let FORM,SITE_FORM;

function collectCoexistence(){
 const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const describe=node=>{
  const s=getComputedStyle(node),button=[...node.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cancel'),r=button?rect(button):null,cs=button?getComputedStyle(button):null,hit=r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2):null;
  return {kind:node.getAttribute('data-report-feedback'),connected:node.isConnected,display:s.display,visibility:s.visibility,opacity:s.opacity,position:s.position,maxHeight:s.maxHeight,rect:rect(node),clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,status:node.querySelector('[role="status"]')?.textContent.trim()||null,alert:node.querySelector('[role="alert"]')?.textContent.trim()||null,cancel:{count:[...node.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Cancel').length,connected:!!button?.isConnected,visible:!!button&&button.getClientRects().length>0,disabled:button?.disabled??null,display:cs?.display??null,visibility:cs?.visibility??null,opacity:cs?.opacity??null,rect:r,hit:!!hit&&(hit===button||button.contains(hit))}};
 };
 const q=document.querySelector('#root [data-seo-content="ready"] > [data-no-prerender]'),site=document.querySelector('#root footer');
 const find=owner=>owner?[...owner.querySelectorAll('button')].find(b=>b.textContent.trim()==='Report a problem'):null,qTrigger=find(q),siteTrigger=find(site);
 const b=getComputedStyle(document.body),d=getComputedStyle(document.documentElement);
 return {href:location.href,viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY},groups:[...document.querySelectorAll('[data-report-feedback]')].map(describe),dialogs:document.querySelectorAll('[role="dialog"][data-state="open"]').length,activeQuestionTrigger:document.activeElement===qTrigger,activeSiteTrigger:document.activeElement===siteTrigger,questionTrigger:{connected:!!qTrigger?.isConnected,busy:qTrigger?.getAttribute('aria-busy')||null,rect:qTrigger?rect(qTrigger):null},siteTrigger:{connected:!!siteTrigger?.isConnected,busy:siteTrigger?.getAttribute('aria-busy')||null,rect:siteTrigger?rect(siteTrigger):null},locks:{bodyOverflow:b.overflow,bodyOverflowY:b.overflowY,rootOverflow:d.overflow,rootOverflowY:d.overflowY,bodyPointer:b.pointerEvents,rootPointer:d.pointerEvents,bodyLock:document.body.getAttribute('data-scroll-locked')}};
}
function coexistGroup(value,kind){
 const rows=value.groups.filter(row=>row.kind===kind);assert.equal(rows.length,1,'QUESTION_COEXIST_EXACT_TWO_GROUPS');const g=rows[0],r=g.rect;
 assert(g.connected&&g.display!=='none'&&!['hidden','collapse'].includes(g.visibility)&&Number(g.opacity)>0&&g.position==='fixed','QUESTION_COEXIST_REAL_VISIBLE_GROUP');
 assert(r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.right<=value.viewport.width&&r.bottom<=value.viewport.height,'QUESTION_COEXIST_GROUP_IN_VIEW');
 assert(g.scrollHeight<=g.clientHeight,'QUESTION_COEXIST_TEXT_FIT');assert.equal(g.status,'Loading report form...','QUESTION_COEXIST_REAL_PENDING');assert.equal(g.alert,null,'QUESTION_COEXIST_REAL_PENDING');
 const c=g.cancel,t=c.rect;assert(c.count===1&&c.connected&&c.visible&&!c.disabled&&c.display!=='none'&&!['hidden','collapse'].includes(c.visibility)&&Number(c.opacity)>0&&c.hit&&t&&t.width>=44&&t.height>=44&&t.x>=0&&t.y>=0&&t.right<=value.viewport.width&&t.bottom<=value.viewport.height,'QUESTION_COEXIST_CANCEL_IN_VIEW');
 return g;
}
function coexistBoth(value){
 assert.equal(value.groups.length,2,'QUESTION_COEXIST_EXACT_TWO_GROUPS');assert.equal(value.dialogs,0,'QUESTION_COEXIST_PENDING_NO_DIALOG');
 const q=coexistGroup(value,'question'),s=coexistGroup(value,'site');assert(q.rect.bottom<=s.rect.y,'QUESTION_COEXIST_NONOVERLAP');
 assert.equal(value.questionTrigger.busy,'true','QUESTION_COEXIST_TWO_PENDING');assert.equal(value.siteTrigger.busy,'true','QUESTION_COEXIST_TWO_PENDING');
}
function coexistClosed(value,baseline){
 assert.equal(value.dialogs,0,'QUESTION_COEXIST_NO_LATE_DIALOG');assert.equal(value.groups.length,0,'QUESTION_COEXIST_NO_LATE_DIALOG');assert.notEqual(value.questionTrigger.busy,'true','QUESTION_COEXIST_NO_LATE_DIALOG');assert.notEqual(value.siteTrigger.busy,'true','QUESTION_COEXIST_NO_LATE_DIALOG');assert.deepEqual(value.locks,baseline.locks,'QUESTION_COEXIST_BODY_RELEASE');
}
async function coexistPress(page,row,locator,label){
 assert.equal(await locator.count(),1,'QUESTION_COEXIST_NATIVE_TARGET');await locator.scrollIntoViewIfNeeded();await locator.focus();
 const value=await locator.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {connected:node.isConnected,active:document.activeElement===node,visible:node.getClientRects().length>0,hit:!!hit&&(hit===node||node.contains(hit)),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight}};});
 assert(value.connected&&value.active&&value.visible&&value.hit&&value.rect.x>=0&&value.rect.y>=0&&value.rect.right<=value.viewport.width&&value.rect.bottom<=value.viewport.height,'QUESTION_COEXIST_NATIVE_TARGET');
 if(label.includes('Cancel'))assert(value.rect.width>=44&&value.rect.height>=44,'QUESTION_COEXIST_CANCEL_44');
 row.targets.push({label,...value});await page.keyboard.press('Enter');row.actions.push({label,input:'actual keyboard Enter on touch-capable phone context'});
}
async function coexistenceJourney(browser,spec,contextId){
 const row={id:spec.id+'-coexistence',spec,arm:'coexistence',contextId,completed:false,observations:[],images:[],targets:[],actions:[],formRequests:[],siteFormRequests:[],assets:[],readFixtures:[],reportAttempts:[],navigations:[],documentRequests:[],wire:{pageErrors:[],consoleErrors:[],console:[],requestFailures:[],webSockets:[],unknown:[]}};
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:spec.theme,reducedMotion:'reduce',serviceWorkers:'block',locale:'en-US',timezoneId:'UTC'});
 await context.addInitScript(seed,spec);await context.addInitScript(()=>localStorage.setItem('sg-rules-seen','1'));
 const gates=[{kind:'question',module:FORM,rows:row.formRequests},{kind:'site',module:SITE_FORM,rows:row.siteFormRequests}].map(value=>({...value,seen:deferred(),action:deferred(),bodyReady:deferred(),finished:deferred()}));
 const pending=[],requests=new Map();let page;
 const snapshot=async label=>{const value=await page.evaluate(collectCoexistence);row.observations.push({label,value});write(row.id+'-'+label+'.json',value);const file=row.id+'-'+label+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:false,animations:'disabled'});row.images.push(file);return value;};
 try{
  await context.route('**/*',async route=>{
   try{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===BASE){
     if(!['GET','HEAD'].includes(req.method())){row.wire.unknown.push({url:url.href,method:req.method(),type:req.resourceType()});await route.abort('blockedbyclient');return;}
     const gate=gates.find(value=>value.module.url===url.href);
     if(gate){assert.equal(req.method(),'GET');assert.equal(req.resourceType(),'script');const item={url:url.href,method:req.method(),type:req.resourceType(),documentOrdinal:row.documentRequests.length,finished:false,aborted:false};gate.rows.push(item);requests.set(req,{item,gate});assert.equal(gate.rows.length,1,'QUESTION_COEXIST_EXACT_COLD_MODULE_REQUEST');gate.seen.resolve(item);const action=await gate.action.promise;if(action==='abort'){item.aborted=true;await route.abort('blockedbyclient');return;}assert.equal(action,'continue');await route.continue();return;}
     await route.fallback();return;
    }
    const sourceRead=sourceReadFor(req,url);if(sourceRead){row.readFixtures.push({...sourceRead,status:200,responseBody:'[]',responseBytes:2,responseSha256:sha('[]'),forwarded:false,documentOrdinal:row.documentRequests.length});await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','cache-control':'no-store'},body:'[]'});return;}
    if(url.origin===API_ORIGIN&&['/functions/v1/report-relay','/rest/v1/question_reports'].includes(url.pathname)){const body=req.postData();row.reportAttempts.push({url:url.href,method:req.method(),type:req.resourceType(),bodyBytes:body===null?0:Buffer.byteLength(body),bodySha256:body===null?null:sha(body),forwarded:false});await route.abort('blockedbyclient');return;}
    await route.fallback();
   }catch(error){row.wire.unknown.push({kind:'route',message:String(error.stack||error)});try{await route.abort('blockedbyclient');}catch(abort){row.wire.unknown.push({kind:'route-abort',message:String(abort.stack||abort)});}}
  });
  await context.routeWebSocket('**/*',socket=>{row.wire.webSockets.push({url:socket.url()});socket.close();});
  page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
  page.on('request',req=>{if(req.isNavigationRequest()&&req.frame()===page.mainFrame())row.documentRequests.push({url:req.url(),method:req.method()});});
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())row.navigations.push({url:frame.url()});});
  page.on('pageerror',e=>row.wire.pageErrors.push({message:e.message,stack:e.stack}));
  page.on('console',m=>{const value={type:m.type(),text:m.text(),location:m.location()};row.wire.console.push(value);if(m.type()==='error')row.wire.consoleErrors.push(value);});
  page.on('requestfailed',req=>{const tracked=requests.get(req);if(tracked)tracked.item.failure=req.failure()?.errorText||null;row.wire.requestFailures.push({url:req.url(),method:req.method(),type:req.resourceType(),error:req.failure()?.errorText||null,nativeOffline:false});});
  page.on('requestfinished',req=>{const tracked=requests.get(req);if(tracked){tracked.item.finished=true;tracked.gate.finished.resolve();}});
  page.on('response',response=>{const url=new URL(response.url());if(url.origin!==BASE)return;pending.push((async()=>{assert.equal(response.status(),200,'QUESTION_LOCAL_STATUS');const file=physicalFor(url),body=await response.body(),expected=fs.readFileSync(file);assert.equal(body.length,expected.length,'QUESTION_DIST_RESPONSE_BYTES');assert.equal(sha(body),sha(expected),'QUESTION_DIST_RESPONSE_SHA');row.assets.push({url:url.href,file:path.relative(DIST,file).split(path.sep).join('/'),bytes:body.length,sha256:sha(body)});const tracked=requests.get(response.request());if(tracked){assert.equal(sha(body),tracked.gate.module.sha256,'QUESTION_COEXIST_REAL_MODULE_BODY');tracked.item.responseSha256=sha(body);tracked.item.responseBytes=body.length;tracked.gate.bodyReady.resolve();}})().catch(error=>row.wire.unknown.push({kind:'response',message:String(error.stack||error)})));});
  const question=await hydrate(page,row),site=page.locator('#root footer').getByRole('button',{name:'Report a problem',exact:true});assert.equal(await site.count(),1,'QUESTION_COEXIST_ACTUAL_FOOTER_TRIGGER');
  row.coexistBaseline=await page.evaluate(collectCoexistence);assert.equal(row.coexistBaseline.groups.length,0,'QUESTION_COEXIST_COLD_GROUPS');assert.equal(row.siteFormRequests.length,0,'QUESTION_COEXIST_COLD_SITE_MODULE');
  await coexistPress(page,row,question,'Question activation');await bounded(gates[0].seen.promise,'actual coexistence Question module');await questionFeedback(page).getByRole('status').waitFor();
  await coexistPress(page,row,site,'Footer Site activation');await bounded(gates[1].seen.promise,'actual coexistence Site module');await page.locator('[data-report-feedback="site"]').getByRole('status').waitFor();
  row.bothPending=await snapshot('both-pending');coexistBoth(row.bothPending);assert.equal(row.formRequests[0].finished,false);assert.equal(row.siteFormRequests[0].finished,false);
  await coexistPress(page,row,questionFeedback(page).getByRole('button',{name:'Cancel',exact:true}),'Question Cancel');await questionFeedback(page).waitFor({state:'hidden'});
  row.questionCancelled=await snapshot('question-cancelled');assert.equal(row.questionCancelled.groups.length,1,'QUESTION_COEXIST_INDEPENDENT_CANCEL');coexistGroup(row.questionCancelled,'site');assert.equal(row.questionCancelled.dialogs,0);assert.equal(row.questionCancelled.activeQuestionTrigger,true,'QUESTION_COEXIST_OWN_QUESTION_FOCUS');assert.notEqual(row.questionCancelled.questionTrigger.busy,'true');
  await coexistPress(page,row,page.locator('[data-report-feedback="site"]').getByRole('button',{name:'Cancel',exact:true}),'Site Cancel');await page.locator('[data-report-feedback="site"]').waitFor({state:'hidden'});
  row.bothCancelled=await snapshot('both-cancelled');coexistClosed(row.bothCancelled,row.coexistBaseline);assert.equal(row.bothCancelled.activeSiteTrigger,true,'QUESTION_COEXIST_OWN_SITE_FOCUS');
  for(const gate of gates)gate.action.resolve('continue');await bounded(Promise.all(gates.flatMap(gate=>[gate.bodyReady.promise,gate.finished.promise])),'actual two cancelled module arrivals');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  row.afterModules=await snapshot('both-modules-arrived-closed');coexistClosed(row.afterModules,row.coexistBaseline);
  for(const gate of gates){assert.equal(gate.rows.length,1);const value=gate.rows[0];assert(value.finished&&!value.aborted&&value.responseSha256===gate.module.sha256,'QUESTION_COEXIST_REAL_FINISHED_MODULE');}
  noSend(row);row.completed=true;
 }catch(error){row.completed=false;row.failure={name:error.name,code:error.code||null,message:error.message,stack:error.stack};if(page&&!page.isClosed())try{await snapshot('failure-current');}catch(capture){row.failureCaptureError=String(capture.stack||capture);}}
 finally{
  for(const gate of gates)gate.action.resolve('abort');let cursor=0;while(cursor<pending.length){const batch=pending.slice(cursor);cursor=pending.length;await Promise.allSettled(batch);}
  try{await context.close();}catch(error){row.completed=false;row.wire.unknown.push({kind:'context-close',message:String(error.stack||error)});}
  while(cursor<pending.length){const batch=pending.slice(cursor);cursor=pending.length;await Promise.allSettled(batch);}
  try{wireReady(row,ioRows().filter(value=>value.context===row.contextId));}catch(error){row.completed=false;row.wireFailure={name:error.name,message:error.message,stack:error.stack};}
  write(row.id+'-context.json',row);
 }
 return row;
}
function coexistenceControls(row){
 assert.equal(row.completed,true,'QUESTION_COEXIST_CONTROL_FOUNDATION');coexistBoth(row.bothPending);coexistClosed(row.afterModules,row.coexistBaseline);
 const original=JSON.stringify(row)+'\n',result=[];fs.writeFileSync(path.join(OUT,'coexistence-control-foundation.json'),original,{flag:'wx'});
 const one=(id,mutate,judge,marker)=>{const value=JSON.parse(original);mutate(value);const changed=JSON.stringify(value)+'\n',file='coexistence-control-'+id+'.work.json';assert.notEqual(sha(changed),sha(original),'QUESTION_COEXIST_CONTROL_CHANGED');fs.writeFileSync(path.join(OUT,file),changed,{flag:'wx'});let error;try{judge(JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8')));}catch(e){error=e;}assert(error instanceof assert.AssertionError&&error.code==='ERR_ASSERTION'&&String(error.message).includes(marker),'QUESTION_COEXIST_CONTROL_OWNED');fs.writeFileSync(path.join(OUT,'coexistence-control-'+id+'.changed.json'),changed,{flag:'wx'});fs.writeFileSync(path.join(OUT,file),original);const restored=fs.readFileSync(path.join(OUT,file),'utf8');assert.equal(sha(restored),sha(original));judge(JSON.parse(restored));result.push({id,marker,foundation:'coexistence-control-foundation.json',changed:'coexistence-control-'+id+'.changed.json',restored:file,sourceSha256:sha(original),changedSha256:sha(changed),restoredSha256:sha(restored),error:{name:error.name,code:error.code,message:error.message,stack:error.stack},scope:'ACTUAL_COMPLETED_COEXISTENCE_RECORD_ONLY'});};
 one('missing-question-group',value=>{value.bothPending.groups=value.bothPending.groups.filter(group=>group.kind!=='question');},value=>coexistBoth(value.bothPending),'QUESTION_COEXIST_EXACT_TWO_GROUPS');
 one('overlapping-panels',value=>{const q=value.bothPending.groups.find(group=>group.kind==='question'),s=value.bothPending.groups.find(group=>group.kind==='site');q.rect.y=s.rect.y;q.rect.bottom=q.rect.y+q.rect.height;},value=>coexistBoth(value.bothPending),'QUESTION_COEXIST_NONOVERLAP');
 one('hidden-site-cancel',value=>{value.bothPending.groups.find(group=>group.kind==='site').cancel.visible=false;},value=>coexistBoth(value.bothPending),'QUESTION_COEXIST_CANCEL_IN_VIEW');
 one('late-dialog',value=>{value.afterModules.dialogs=1;},value=>coexistClosed(value.afterModules,value.coexistBaseline),'QUESTION_COEXIST_NO_LATE_DIALOG');
 return result;
}
async function main(){
 assert(['1','true'].includes(process.env.CI)&&process.env.SIM_NETWORK==='offline','QUESTION_REMOTE_OFFLINE_ONLY');
 assert.match(process.env.GITHUB_SHA||'',/^[a-f0-9]{40}$/,'QUESTION_ACTUAL_SOURCE');
 const expectedOptions='--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs')+' --require='+path.join(ROOT,'scripts/qa/sharedChromePreload.cjs');
 assert.equal(process.env.NODE_OPTIONS,expectedOptions,'QUESTION_ORIGINAL_BOUNDARIES_ONLY');
 assert(path.isAbsolute(process.env.QUESTION_FORM_OUT||'')&&OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep),'QUESTION_OUTSIDE_CHECKOUT');
 assert.equal(path.resolve(process.env.CHROME_RECIPE_OUT||''),OUT,'QUESTION_PRELOAD_OUTPUT_BINDING');
 assert(path.isAbsolute(process.env.QUESTION_FORM_SITE_DIST||'')&&fs.lstatSync(DIST).isDirectory(),'QUESTION_COMPLETED_SITE_DIST');
 assert(!fs.existsSync(OUT),'QUESTION_FRESH_OUTPUT');fs.mkdirSync(OUT,{recursive:true});assert(!fs.realpathSync(OUT).startsWith(fs.realpathSync(ROOT)+path.sep)&&fs.realpathSync(OUT)!==fs.realpathSync(ROOT),'QUESTION_CANONICAL_OUTSIDE');
 const bindingFile=process.env.QUESTION_FORM_BINDING_FILE;assert(bindingFile&&path.isAbsolute(bindingFile),'QUESTION_BINDING_FILE');
 const binding=JSON.parse(fs.readFileSync(bindingFile,'utf8')),before=readInputs();
 assert.equal(binding.sourceHead,process.env.GITHUB_SHA);assert.equal(git('rev-parse','HEAD'),binding.sourceHead);
 const count=execFileSync('git',['ls-files','-z']).toString('utf8').split('\0').filter(Boolean).length;assert.equal(binding.trackedCount,count,'QUESTION_FULL_SOURCE_COUNT');
 assert.equal(binding.playwrightVersion,'1.64.0');assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT,'node_modules/playwright-core/package.json'),'utf8')).version,binding.playwrightVersion);
 assert(Array.isArray(binding.pins));assert.equal(binding.pins.length,30);assert.equal(new Set(binding.pins.map(p=>p.file)).size,30);assert.deepEqual([...binding.pins].sort((a,b)=>a.file.localeCompare(b.file)),[...before].sort((a,b)=>a.file.localeCompare(b.file)),'QUESTION_ACTUAL_SOURCE_BINDING');
 for(const pin of SOURCES){const actual=before.find(r=>r.file===pin.file);assert.deepEqual(actual,pin,'QUESTION_SELECTED_SOURCE: '+pin.file);}
 const client=fs.readFileSync(path.join(ROOT,'src/integrations/supabase/client.ts'),'utf8');
 const origin=/^export const SUPABASE_URL = "([^"]+)";$/m.exec(client),key=/^export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)";$/m.exec(client);
 assert(origin&&key,'QUESTION_SOURCE_PUBLIC_CLIENT');API_ORIGIN=origin[1];PUBLIC_KEY=key[1];assert.equal(API_ORIGIN,'https://flawuiqbvjobmkfkauhw.supabase.co');
 for(const pin of DEPENDENCY_PROTOCOL){const body=fs.readFileSync(path.join(ROOT,pin.file));assert.equal(body.length,pin.bytes,'QUESTION_DEPENDENCY_PROTOCOL');assert.equal(sha(body),pin.sha256,'QUESTION_DEPENDENCY_PROTOCOL');}
 loadFonts(process.env.FREE_KICK_FONT_CACHE,process.env.FONT_CACHE_MANIFEST_SHA256);const fontBefore=inventory(process.env.FREE_KICK_FONT_CACHE),distBefore=inventory(DIST);
 const modules=distBefore.filter(r=>/^assets\/ReportQuestionForm-[A-Za-z0-9_-]+\.js$/.test(r.file));assert.equal(modules.length,1,'QUESTION_EXACT_LAZY_MODULE_FOUNDATION');FORM={...modules[0],url:BASE+'/'+modules[0].file};
 const siteModules=distBefore.filter(row=>/^assets\/ReportSiteIssueForm-[A-Za-z0-9_-]+\.js$/.test(row.file));assert.equal(siteModules.length,1,'QUESTION_COEXIST_EXACT_SITE_MODULE');SITE_FORM={...siteModules[0],url:BASE+'/'+siteModules[0].file};assert.notEqual(SITE_FORM.url,FORM.url,'QUESTION_SEPARATE_FORM_MODULES');write('actual-site-form-module.json',SITE_FORM);
 write('binding.json',binding);write('source-before.json',before);write('dist-before.json',distBefore);write('font-before.json',fontBefore);write('actual-form-module.json',FORM);
 const report={version:1,status:'REFUSED',source:process.env.GITHUB_SHA,phase:'ACTUAL_QUESTION_NO_SEND_ACTIVATION',planned:{contexts:8,screenshots:40,judgeControls:14,viewportJudgeControls:6},scope:'Actual built SoccerGrid GameSeo Question, source-exact empty read fallback, lazy activation/cancellation/draft/focus/native offline refusal/user refresh only',limits:['No report submission/delivery or exercised backend guard claim.','No pending-save/prerender refusal, OS keyboard, whole-site, gzip savings, cap pass, live publication or source-fault browser controls.'],contexts:[],controls:[],viewportControls:[],sourceReadControls:[],sourceReadPlan:{actualRecords:3},coexistence:{plannedContexts:2,plannedPNGs:8,plannedRecordControls:4,contexts:[],controls:[]},failures:[]};
 let browser;
 try{
  browser=await pw.chromium.launch({headless:true,timeout:30000});
  let contextId=0;
  for(const spec of SPECS)for(const arm of ['healthy','failed']){
   const row={id:spec.id+'-'+arm,spec,arm,contextId:++contextId,completed:false,observations:[],images:[],targets:[],actions:[],formRequests:[],assets:[],readFixtures:[],reportAttempts:[],navigations:[],documentRequests:[],wire:{pageErrors:[],consoleErrors:[],console:[],requestFailures:[],webSockets:[],unknown:[]}};
   report.contexts.push(row);
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,isMobile:spec.mobile,hasTouch:spec.mobile,colorScheme:spec.theme,reducedMotion:spec.mobile?'reduce':'no-preference',serviceWorkers:'block',locale:'en-US',timezoneId:'UTC'});
   await context.addInitScript(seed,spec);
   await context.addInitScript(()=>localStorage.setItem('sg-rules-seen','1'));
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
     const sourceRead=sourceReadFor(req,url);
     if(sourceRead){
      const value={...sourceRead,status:200,responseBody:'[]',responseBytes:2,responseSha256:sha('[]'),forwarded:false,documentOrdinal:row.documentRequests.length};row.readFixtures.push(value);
      await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json','cache-control':'no-store'},body:'[]'});return;
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
      assert.equal(response.status(),200,'QUESTION_LOCAL_STATUS');const file=physicalFor(url),body=await response.body(),expected=fs.readFileSync(file);
      assert.equal(body.length,expected.length,'QUESTION_DIST_RESPONSE_BYTES');assert.equal(sha(body),sha(expected),'QUESTION_DIST_RESPONSE_SHA');
      row.assets.push({url:url.href,file:path.relative(DIST,file).split(path.sep).join('/'),bytes:body.length,sha256:sha(body)});
      const item=requests.get(response.request());if(item){assert.equal(sha(body),FORM.sha256);item.responseSha256=sha(body);item.responseBytes=body.length;gate.bodyReady.resolve(item);}
     })().catch(e=>{row.wire.unknown.push({kind:'response',message:String(e.stack||e)});}));
    });
    if(arm==='healthy')await healthy(context,page,row,gate);else await failed(context,page,row,gate);
    assert.equal(row.images.length,arm==='healthy'?6:4,'QUESTION_ORIGINAL_SCREENSHOT_COUNT');noSend(row);
   }catch(e){
    row.completed=false;row.failure={name:e.name,message:e.message,stack:e.stack,code:e.code,actual:e.actual,expected:e.expected,operator:e.operator};report.failures.push({id:row.id,...row.failure});
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
  assert.equal(report.contexts.length,8,'QUESTION_CONTEXT_COUNT');assert(report.contexts.every(r=>r.completed),'QUESTION_ALL_ACTUAL_JOURNEYS_COMPLETE');
  assert.equal(report.contexts.reduce((n,r)=>n+r.images.length,0),40,'QUESTION_ORIGINAL_PNG_COUNT');
  const failedControlRow=report.contexts.find(r=>r.arm==='failed');report.controls=controls(report.contexts.find(r=>r.arm==='healthy'),failedControlRow,ioRows().filter(r=>r.context===failedControlRow.contextId));assert.equal(report.controls.length,14,'QUESTION_EFFECTIVE_JUDGE_CONTROLS');
  report.viewportControls=viewportControls(failedControlRow.failed);assert.equal(report.viewportControls.length,6,'QUESTION_EFFECTIVE_VIEWPORT_JUDGE_CONTROLS');
  report.sourceReadControls=sourceReadControls(report.contexts.find(row=>row.arm==='healthy'));assert.equal(report.sourceReadControls.length,3,'QUESTION_SOURCE_READ_CONTROL_COUNT');
  for(const spec of SPECS.filter(value=>value.width===328)){
   const row=await coexistenceJourney(browser,spec,++contextId);report.coexistence.contexts.push(row);
   assert.equal(row.completed,true,'QUESTION_COEXIST_JOURNEY_COMPLETE');assert.equal(row.images.length,4,'QUESTION_COEXIST_ORIGINAL_PNGS');
  }
  assert.equal(report.coexistence.contexts.length,2,'QUESTION_COEXIST_CONTEXTS');report.coexistence.controls=coexistenceControls(report.coexistence.contexts[0]);assert.equal(report.coexistence.controls.length,4,'QUESTION_COEXIST_EFFECTIVE_RECORD_CONTROLS');
  report.status='QUESTION_GAMESEO_ACTIVATION_COMPLETE';report.complete=true;
 }catch(e){report.failures.push({name:e.name,message:e.message,stack:e.stack});report.complete=false;}
 finally{
  if(browser)try{await browser.close();}catch(e){report.complete=false;report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  try{
   const finalIo=ioRows();assert(finalIo.every(item=>Number.isInteger(item.context)&&item.context>=1&&item.context<=10),'QUESTION_FINAL_IO_CONTEXT_OWNERS');
   for(const row of [...report.contexts,...report.coexistence.contexts])try{wireReady(row,finalIo.filter(item=>item.context===row.contextId));}catch(e){row.completed=false;row.finalWireFailure={name:e.name,message:e.message,stack:e.stack};throw e;}
   write('browser-io-final-binding.json',{contexts:report.contexts.length,coexistenceContexts:report.coexistence.contexts.length,totalContexts:report.contexts.length+report.coexistence.contexts.length,rows:finalIo.length,byContext:[...report.contexts,...report.coexistence.contexts].map(row=>({id:row.id,context:row.contextId,rows:finalIo.filter(item=>item.context===row.contextId).length,completed:row.completed})),allRecheckedAfterBrowserClose:true});
  }catch(e){report.complete=false;report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  try{const after=readInputs(),fontAfter=inventory(process.env.FREE_KICK_FONT_CACHE),distAfter=inventory(DIST);
  write('source-after.json',after);write('font-after.json',fontAfter);write('dist-after.json',distAfter);
  assert.deepEqual(after,before,'QUESTION_SOURCE_HELD');assert.deepEqual(fontAfter,fontBefore,'QUESTION_FONT_CACHE_HELD');assert.deepEqual(distAfter,distBefore,'QUESTION_DIST_HELD');for(const pin of DEPENDENCY_PROTOCOL){const body=fs.readFileSync(path.join(ROOT,pin.file));assert.equal(body.length,pin.bytes,'QUESTION_DEPENDENCY_PROTOCOL_HELD');assert.equal(sha(body),pin.sha256,'QUESTION_DEPENDENCY_PROTOCOL_HELD');}report.holds={source:true,font:true,dist:true,dependencyProtocol:true};}
  catch(e){report.complete=false;report.status='REFUSED';const error={name:e.name,message:e.message,stack:e.stack};report.failures.push(error);write('end-hold-error.json',error);}
  const receipt=process.env.SIM_OFFLINE_RECEIPT;try{assert(receipt&&path.isAbsolute(receipt));const st=fs.lstatSync(receipt);assert(st.isFile()&&!st.isSymbolicLink()&&st.size===0,'QUESTION_ORIGINAL_GUARD_EMPTY');report.originalGuardReceipt={file:receipt,bytes:st.size};}catch(e){report.complete=false;report.status='REFUSED';report.failures.push({name:e.name,message:e.message,stack:e.stack});}
  if(!report.complete)report.status='REFUSED';write('report.json',report);
  const rows=inventory(OUT).filter(r=>r.file!=='evidence.sha256');fs.writeFileSync(path.join(OUT,'evidence.sha256'),rows.map(r=>r.sha256+'  '+r.file).join('\n')+'\n',{flag:'wx'});
 }
 assert.equal(report.status,'QUESTION_GAMESEO_ACTIVATION_COMPLETE');assert.equal(report.complete,true);
 console.log(JSON.stringify({status:report.status,contexts:report.contexts.length,screenshots:40,judgeControls:report.controls.length,viewportJudgeControls:report.viewportControls.length,sourceReadControls:report.sourceReadControls.length,coexistenceContexts:report.coexistence.contexts.length,coexistencePNGs:report.coexistence.contexts.reduce((n,row)=>n+row.images.length,0),coexistenceRecordControls:report.coexistence.controls.length,source:process.env.GITHUB_SHA,reportDelivery:'NOT_EXERCISED_NO_ATTEMPTS',fullSuiteQualified:false,capQualified:false}));
}
await main();

