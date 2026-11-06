// QA-only first-sign phase-return proof. Fictional market rows, actual App and physical source controls.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';
import { captureBudgetReturn, assessBudgetPhaseReturn } from '../lib/budgetPhaseReturn.mjs';

assert(process.env.CI,'Remote CI only');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ARM=process.env.BB_PHASE_ARM||'fixed';
assert(['original','fixed'].includes(ARM),'BB_PHASE_ARM is original or fixed');
const OUT=path.resolve(ROOT,process.env.BB_PHASE_OUT||'bb-phase-artifacts/'+ARM);
const widths=(process.env.BB_PHASE_WIDTHS||'320,390,1280').split(',').map(Number);
assert(widths.length>0&&widths.length<=3&&new Set(widths).size===widths.length&&widths.every(w=>[320,390,1280].includes(w)),'BB_PHASE_WIDTHS is a unique subset of320,390,1280');
const control=process.env.BB_PHASE_CONTROL||'baseline';assert(/^[a-z][a-z0-9-]{0,63}$/.test(control),'Bounded physical control name');
const defaultBoard=ARM==='original'?'526213213e4a5e1b625e1b6505227b623f76ad26':'f9111c2782f61ec9b976aee52baed4ae095f0d6b';
const boardPin=process.env.BB_PHASE_BOARD_BLOB||defaultBoard;assert(/^[a-f0-9]{40}$/.test(boardPin),'Exact40hex physical Board blob');assert(control==='baseline'?boardPin===defaultBoard:boardPin!==defaultBoard,'Physical controls must change actual Board bytes');
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return {file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',b=Buffer.from(JSON.stringify(value,null,2));fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),b);return {file,bytes:b.length,sha256:sha(b)};};
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[receipt(dir+'/'+e.name)]:[]);
const entry="export {FORMATIONS,normalizePosition} from './src/lib/squadShape';export {getTodayET} from './src/lib/dateUtils';";
const compiled=await build({stdin:{contents:entry,resolveDir:ROOT,sourcefile:'bb-score-oracle.ts',loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,metafile:true,alias:{'@':path.join(ROOT,'src')},logLevel:'error'});
const oracle=path.join(OUT,'oracle.cjs');fs.writeFileSync(oracle,compiled.outputFiles[0].contents);
const B=createRequire(import.meta.url)(oracle),formation=B.FORMATIONS[0],day=B.getTodayET();
const gitBlob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const physical={hook:gitBlob(fs.readFileSync(path.join(ROOT,'src/hooks/useBudgetBuilder.ts'))),board:gitBlob(fs.readFileSync(path.join(ROOT,'src/components/budget-builder/BudgetBuilderBoard.tsx')))};
equalPhysical();
function equalPhysical(){assert.equal(physical.hook,ARM==='original'?'02ec7d7971bbcf96723e4a15fe285c5c0edf2ad2':'0220c215cb2530a632abc477810ec38b095982c7','Actual physical hook arm');assert.equal(physical.board,boardPin,'Actual physical Board arm/control');}
assert(formation.name==='4-3-3'&&formation.slots.length===11,'Actual source formation required');
const make=(name,position,value)=>({player_name:name,position,age:22,nationality:'England',club:'Fictional Club '+name,market_value_usd:value*1000000,goals:0,assists:0});
const rawRows=[...formation.slots.slice(1).map((slot,i)=>make('Fictional XI '+(i+1),slot.allowed[0],60)),...[40,199,200,201,400].map(v=>make('Fictional Keeper '+v,'GK',v)),...Array.from({length:18},(_,i)=>make('Fictional Bench '+String(i+1).padStart(2,'0'),'CM',1))].sort((a,b)=>b.market_value_usd-a.market_value_usd||a.player_name.localeCompare(b.player_name));
assert(rawRows.length===33&&new Set(rawRows.map(p=>p.player_name)).size===33,'Exactly33 distinct fictional records, satisfying real loader floor');
const players=rawRows.map(r=>({name:r.player_name,position:B.normalizePosition(r.position),marketValue:Math.max(1,Math.round((r.market_value_usd||1000000)/1000000)),age:r.age,nationality:r.nationality,club:r.club,league:'Other',goals:r.goals,assists:r.assists,kitNumber:0,difficulty:'easy'}));
assert(players.every(p=>p.position),'Every fictional row normalizes through held source');
const byName=new Map(players.map(p=>[p.name,p])),keeper=v=>byName.get('Fictional Keeper '+v);
const held=['src/pages/BudgetBuilder.tsx','src/components/budget-builder/BudgetBuilderBoard.tsx','src/components/budget-builder/BudgetBuilderBoard.module.css','src/hooks/useBudgetBuilder.ts','src/lib/squadDeal.ts','src/lib/squadShape.ts','src/lib/dartDraft.ts','src/data/footleEnrichment.ts','src/types/game.ts','src/hooks/useGameCompletion.ts','src/hooks/useRevealScroll.ts','src/lib/completions.ts','src/components/game/GameHelp.tsx','src/components/game/HowToPlayPopover.tsx','src/data/gameContent/soccer1.ts','src/data/gameContent/loader.ts','src/data/gameContent/guideShape.ts','scripts/lib/answerConsent.mjs','scripts/lib/playwrightLoader.mjs','scripts/lib/offlineTransport.cjs','scripts/lib/hostLikeServer.mjs','scripts/lib/budgetPhaseReturn.mjs','scripts/qa/playBudgetPhaseReturn.mjs','package.json','package-lock.json'];
const sources=[...new Set([...held,...Object.keys(compiled.metafile.inputs).filter(f=>f.startsWith('src/'))])].sort();
const report={status:'running',checks:0,arm:ARM,control,boardPin,widths,physical,day,scope:'Bounded actual built App first native GK40 signing at requested supported widths. Same shared phase-return oracle as the full score helper; no new score-region lookup.',
 fixtureScope:'The same33 fictional2026 market rows as v2 use existing inline England flags. No real player claim, pool replacement or final-state injection.',
 limits:['Bounded phase-return proof/control only, not full score, Final or whole-XI qualification. All other original zero-scroll guards remain.','No clock, RNG, DOM, source or storage override. All other foreign traffic is aborted; fallback fonts only.','Only initial signing is measured. No new score-region, whole-XI, Final, roster, provider, backend-write or RNG-tape credit.', 'Unsupported Fixtureland previously produced a91px pitch-clipped tile at320; that edge remains separately unqualified. England fixtures do not fix or qualify unsupported nationalities.','Source pins identify each physical arm; runtime attribution also requires each arm joined to its own actual build provenance. Scroll events alone do not identify the browser scroll initiator.'],
 fixture:put('fictional-market',{rawRows,convertedPlayers:players,formation}),sourceBefore:sources.map(receipt),distBefore:inventory('dist'),oracle:{entry,sha256:sha(compiled.outputFiles[0].contents)},journeys:[],screenshots:[],businessFailures:[],externalForwarded:0};
const check=(ok,label)=>{report.checks++;assert(ok,label);},equal=(a,b,label)=>{report.checks++;assert.deepEqual(a,b,label);};
const sameDay=()=>check(B.getTodayET()===day,'Refuse ET day rollover');
const wait=async(fn,label,timeout=12000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
let browser,host;
try{
 const port=await new Promise((resolve,reject)=>{const p=createServer();p.once('error',reject);p.listen(0,'127.0.0.1',()=>{const n=p.address().port;p.close(()=>resolve(n));});});
 const BASE='http://127.0.0.1:'+port;report.base=BASE;
 host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Host startup timeout')),15000);host.stdout.on('data',b=>{if(String(b).includes('host-like server:')){clearTimeout(timer);resolve();}});host.once('error',reject);host.once('exit',c=>{clearTimeout(timer);reject(Error('Host exited '+c));});});
 browser=await pw.chromium.launch({headless:true});
 for(const [width,height]of[[320,568],[390,844],[1280,900]].filter(([w])=>widths.includes(w))){
  sameDay();const id=String(width),mobile=width<1000,row={width,height,mode:mobile?'native touch and keyboard text entry':'native keyboard',status:'running',frames:[],actions:[],layouts:[],requests:[],events:[],errors:[],assetErrors:[],routeErrors:[],screenshots:[]};report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'});let page;
  const board=()=>page.locator('[data-budget-builder]'),slot=i=>board().locator('[data-budget-slot="'+i+'"]'),picker=()=>page.getByRole('region',{name:'Signing shortlist',exact:true}),input=()=>picker().getByRole('textbox',{name:'Search eligible players by name or club',exact:true}),previewPanel=()=>page.locator('[data-budget-preview]');
  const completionAttempts=()=>row.requests.filter(r=>r.completion?.game==='budget-builder');
  const press=async target=>{if(mobile)await target.tap();else{await target.focus();await target.press('Enter');}};
  const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let last='',n=0;const end=performance.now()+10000;do{await new Promise(requestAnimationFrame);const sig=JSON.stringify([...document.querySelectorAll('[data-budget-builder] button,[data-budget-builder] input,[data-budget-builder] select,[data-budget-builder] section,[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));n=sig===last?n+1:1;last=sig;if(n>=4&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return;}while(performance.now()<end);throw Error('Page did not settle');});
  const frame=async name=>{await settle();sameDay();const value=await page.evaluate(()=>({at:Date.now(),viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),scroll:{x:scrollX,y:scrollY},storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),focus:{id:document.activeElement?.id,tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent?.trim()},body:document.body.innerText,boardText:document.querySelector('[data-budget-builder]')?.innerText,slots:[...document.querySelectorAll('[data-budget-slot]')].map(e=>({index:Number(e.getAttribute('data-budget-slot')),label:e.getAttribute('aria-label'),disabled:e.disabled,expanded:e.getAttribute('aria-expanded'),text:e.innerText})),input:document.querySelector('[aria-label="Search eligible players by name or club"]')?.value??null}));check(value.viewport.width===width&&value.documentWidth<=width,id+': actual width and no document overflow');row.frames.push(put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,value));return value;};
  const geometry=async(target,needs44=true)=>{check(await target.count()===1&&await target.isVisible(),id+': one visible native target');const v=await target.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.textContent?.trim(),rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:hit===e||e.contains(hit),disabled:e.matches(':disabled'),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth};});check(v.hit&&!v.disabled&&v.rect.x>=-.5&&v.rect.x+v.rect.width<=width+.5&&v.rect.y>=0&&v.rect.y+v.rect.height<=height+.5,id+': target fully visible and center reachable');if(needs44)check(v.rect.width>=44&&v.rect.height>=44,id+': native target at least44px');row.layouts.push(v);return v;};
  const action=async(name,target,work,held=true,needs44=true)=>{if(target){await target.scrollIntoViewIfNeeded();await settle();}const targetReceipt=target?await geometry(target,needs44):null,before=await frame(name+'-before'),start=row.events.length;await work();const after=await frame(name+'-after');if(held)equal(after.scroll,before.scroll,id+': exact prepared document scroll held '+name);row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,target:targetReceipt,heldScroll:held,before,after,events:row.events.slice(start)}));return{before,after};};
  const openPreview=async(index,p)=>{
   if(await slot(index).getAttribute('aria-expanded')!=='true')await action('open-slot-'+index+'-'+p.marketValue,slot(index),()=>press(slot(index)));
   await picker().waitFor();await action('search-'+index+'-'+p.marketValue,input(),async()=>{if(mobile)await input().tap();else await input().focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(p.name,{delay:2});});
   const candidate=picker().getByRole('button',{name:'Preview signing '+p.name+' for $'+p.marketValue+'M',exact:true});await action('preview-'+index+'-'+p.marketValue,candidate,async()=>{await press(candidate);await previewPanel().waitFor();});return candidate;
  };
  const readLayout=async()=>page.evaluate(()=>{
   const board=document.querySelector('[data-budget-builder]'),selected=board.querySelector('[data-budget-slot="0"]'),picker=document.getElementById('budget-signing-picker');
   const remaining=[...board.querySelectorAll('p')].find(e=>e.textContent.trim()==='Remaining'),header=remaining?.parentElement?.parentElement,bar=header?.parentElement,pitch=selected.parentElement,cue=bar?.querySelector('[role="status"]');
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{tag:e.tagName,id:e.id,className:e.className,text:e.textContent?.trim().slice(0,500),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,documentY:r.y+scrollY},clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,overflowAnchor:s.getPropertyValue('overflow-anchor'),position:s.position};};
   const vh=innerHeight,vw=innerWidth,top=[],bottom=[];let topInset=0,bottomInset=0;
   for(const x of[vw*.5,6,vw-6]){
    for(const el of document.elementsFromPoint(x,1)){const s=getComputedStyle(el),r=el.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||r.height===0||r.height>vh*.4||r.top>2||r.bottom<=0)continue;top.push(rect(el));topInset=Math.max(topInset,r.bottom);}
    for(const el of document.elementsFromPoint(x,vh-2)){const s=getComputedStyle(el),r=el.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||r.height===0||r.height>vh*.4||r.bottom<vh-2||r.top>=vh)continue;bottom.push(rect(el));bottomInset=Math.max(bottomInset,vh-r.top);}
   }
   const target=selected.getBoundingClientRect(),readTop=topInset,readBottom=vh-bottomInset,visible=Math.max(0,Math.min(target.bottom,readBottom)-Math.max(target.top,readTop));
   const readable=target.height>0&&target.top>=readTop-.5&&target.bottom<=readBottom+.5&&target.left>=-.5&&target.right<=vw+.5;
   const scrollNode=document.scrollingElement;
   return{at:Date.now(),scroll:{x:scrollX,y:scrollY},viewport:{width:vw,height:vh},documentHeight:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight),scrollingElement:{tag:scrollNode?.tagName,scrollTop:scrollNode?.scrollTop,scrollHeight:scrollNode?.scrollHeight,clientHeight:scrollNode?.clientHeight},body:rect(document.body),main:rect(document.getElementById('dukb-main')),board:rect(board),header:rect(header),budgetBar:rect(bar),pitch:rect(pitch),picker:rect(picker),selectedSlot:rect(selected),cue:rect(cue),cueText:cue?.textContent?.trim()??null,topChrome:top,bottomChrome:bottom,readableStrip:{top:readTop,bottom:readBottom},destination:{label:selected.getAttribute('aria-label'),focused:document.activeElement===selected,wholeSmallTileReadable:readable,visibleHeight:visible,hookReadable:target.top>=readTop-2&&visible>=Math.min(target.height,160)},focus:rect(document.activeElement)};
  });
  const viewportPhoto=async(name,frameReceipt,layout)=>{const file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:false});const b=fs.readFileSync(path.join(OUT,file)),item={file,bytes:b.length,sha256:sha(b),frame:frameReceipt,layout};report.screenshots.push(item);row.screenshots.push(item);};
  try{
   await context.routeWebSocket('**/*',r=>{row.requests.push({url:r.url(),method:'WEBSOCKET',outcome:'aborted'});r.close({code:1008,reason:'Offline score proof'});});
   await context.route('**/*',async r=>{
    const request=r.request(),url=new URL(request.url());if(url.origin===BASE)return r.continue();
    const item={at:Date.now(),url:request.url(),path:url.pathname,method:request.method(),query:Object.fromEntries(url.searchParams),outcome:'aborted'};row.requests.push(item);
    try{
     if(url.origin==='https://flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/player_market_values'&&request.method()==='OPTIONS'){item.outcome='fixture-cors';return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*'}});}
     if(url.origin==='https://flawuiqbvjobmkfkauhw.supabase.co'&&url.pathname==='/rest/v1/player_market_values'&&request.method()==='GET'){
      equal(url.searchParams.get('select'),'player_name,position,age,nationality,club,market_value_usd,goals,assists',id+': actual market columns');equal(url.searchParams.get('year'),'eq.2026',id+': actual Today market year');equal(url.searchParams.get('order'),'market_value_usd.desc,player_name.asc',id+': stable actual market order');equal(url.searchParams.get('limit'),'1000',id+': actual loader bound');check(!url.searchParams.has('offset')&&!url.searchParams.has('club')&&!url.searchParams.has('nationality'),id+': no fixture-specific pool filter');
      item.outcome='fixture-fulfilled';item.rows=rawRows.map(p=>({...p}));item.bodySHA=sha(JSON.stringify(rawRows));return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(rawRows)});
     }
     if(request.method()==='POST'&&url.pathname.endsWith('/game_completions')){const data=request.postDataJSON();item.completion=Array.isArray(data)?data[0]:data;}
     return r.abort('blockedbyclient');
    }catch(error){row.routeErrors.push(String(error.stack||error));return r.abort('failed').catch(()=>{});}
   });
   page=await context.newPage();page.on('pageerror',e=>row.errors.push(String(e)));page.on('response',r=>{if(new URL(r.url()).origin===BASE&&r.status()>=400)row.assetErrors.push({url:r.url(),status:r.status()});});page.on('requestfailed',r=>{if(new URL(r.url()).origin===BASE)row.assetErrors.push({url:r.url(),failure:r.failure()});});
   await page.exposeBinding('__bbScoreEvidence',(_source,event)=>row.events.push(event));await page.addInitScript(()=>{for(const type of['pointerup','click','keydown'])document.addEventListener(type,e=>{const t=e.target?.closest?.('button,input,select,main');if(t)window.__bbScoreEvidence({at:Date.now(),type,trusted:e.isTrusted,key:e.key,ctrlKey:e.ctrlKey,pointerType:e.pointerType,targetId:t.id,tag:t.tagName,text:t.textContent?.trim()});},true);window.addEventListener('scroll',e=>window.__bbScoreEvidence({at:Date.now(),type:'scroll',trusted:e.isTrusted,targetTag:e.target?.tagName??null,targetId:e.target?.id??null,x:scrollX,y:scrollY,documentHeight:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)}),true);});
   await page.goto(BASE+'/budget-builder',{waitUntil:'networkidle'});await answerConsent(page,{press:async t=>action('reject-optional-consent',t,()=>press(t),false,false)});check(await storedConsent(page)==='rejected',id+': optional consent refused');
   await page.getByText('0/11 signed',{exact:true}).waitFor();check(row.requests.filter(r=>r.outcome==='fixture-fulfilled').length===1,id+': one actual33-row market read');
   const select=page.getByRole('combobox',{name:'Choose formation',exact:true});await action('native-default-formation',select,async()=>{if(mobile)await select.tap();else await select.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');},false);equal(await select.inputValue(),'4-3-3',id+': native source formation');
   await openPreview(0,keeper(40));
   const target=previewPanel().getByRole('button',{name:'Confirm signing',exact:true});await target.scrollIntoViewIfNeeded();await settle();const targetReceipt=await geometry(target);
   const before=await frame('confirm-0-40-before'),beforeLayout=await readLayout(),returnBefore=await captureBudgetReturn(page,slot(0),'slot'),eventStart=row.events.length;const beforeLayoutReceipt=put(id+'/layout-before-confirm',beforeLayout);await viewportPhoto('before-first-confirm',row.frames.at(-1),beforeLayoutReceipt);
   await press(target);await picker().waitFor({state:'hidden'});await wait(()=>slot(0).evaluate(e=>e===document.activeElement),id+': actual stable committed slot owns focus');
   const after=await frame('confirm-0-40-after'),afterLayout=await readLayout(),returnAfter=await captureBudgetReturn(page,slot(0),'slot',returnBefore),assessment=assessBudgetPhaseReturn(returnBefore.value,returnAfter.value,{kind:'slot'}),afterLayoutReceipt=put(id+'/layout-after-confirm',afterLayout);
   row.phaseReturn=put(id+'/phase-return',{name:'first-sign-GK40',kind:'slot',before:returnBefore.value,after:returnAfter.value,assessment});await viewportPhoto('after-first-confirm',row.frames.at(-1),afterLayoutReceipt);
   equal(after.storage,before.storage,id+': full storage held through initial signing');check(after.slots[0].label==='GK slot 1: Fictional Keeper 40'&&after.slots[0].expanded==='false'&&after.input===null,id+': exact first commit and picker closure');check(after.boardText.includes('1/11 signed')&&after.boardText.includes('Spent $40M of $1000M'),id+': actual first signing budget/progress');
   check(completionAttempts().length===0,id+': first signing cannot complete the game');check(afterLayout.picker===null&&beforeLayout.picker!==null,id+': actual flow-mounted picker removed');check(afterLayout.destination.focused,id+': actual destination focus retained');
   const deltaY=after.scroll.y-before.scroll.y,deltaHeight=after.documentHeight-before.documentHeight,maxAfter=(afterLayout.scrollingElement.scrollHeight-afterLayout.scrollingElement.clientHeight),r=afterLayout.selectedSlot.rect,hypotheticalY=r.documentY-before.scroll.y;
   row.confirmation={diagnosticOnly:true,assertedZeroScroll:false,target:targetReceipt,beforeFrame:row.frames.at(-2),afterFrame:row.frames.at(-1),beforeLayout:beforeLayoutReceipt,afterLayout:afterLayoutReceipt,fullStorageHeld:true,deltaScroll:{x:after.scroll.x-before.scroll.x,y:deltaY},deltaDocumentHeight:deltaHeight,scrollDeltaEqualsHeightDelta:deltaY===deltaHeight,afterAtScrollRangeEnd:Math.abs(after.scroll.y-maxAfter)<=1,readability:{before:beforeLayout.destination.wholeSmallTileReadable,after:afterLayout.destination.wholeSmallTileReadable},hypotheticalDestinationAtOldScroll:{top:hypotheticalY,bottom:hypotheticalY+r.height,wholeSmallTileReadable:hypotheticalY>=afterLayout.readableStrip.top-.5&&hypotheticalY+r.height<=afterLayout.readableStrip.bottom+.5&&r.x>=-.5&&r.right<=width+.5},events:row.events.slice(eventStart)};
   row.actions.push(put(id+'/confirmation-diagnostic',row.confirmation));
   check(row.requests.every(r=>['aborted','fixture-cors','fixture-fulfilled'].includes(r.outcome)),id+': no foreign forwarded');check(row.routeErrors.length===0&&row.errors.length===0&&row.assetErrors.length===0,id+': no route, App or local asset errors');check(row.events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown'&&e.key==='Enter')),id+': native interaction mode observed');row.status=assessment.allowed?'passed':'business-failed';if(!assessment.allowed)report.businessFailures.push({id:assessment.reason+'_'+width,width,reason:assessment.reason,phaseReturn:row.phaseReturn});console.log((assessment.allowed?'PASS':'FAIL '+assessment.reason)+' first-sign '+ARM+' '+width+' scroll '+deltaY+' mode '+assessment.mode);
  }catch(error){row.status='failed';row.error=String(error.stack||error);if(page&&!page.isClosed())await frame('failure').catch(()=>{});throw error;}
  finally{await context.close();put('report',report);}
 }
 check(report.screenshots.length===widths.length*2,'Exact requested before/after viewport PNGs');check(report.journeys.length===widths.length&&report.journeys.every(r=>['passed','business-failed'].includes(r.status)),'All requested native contexts retained');sameDay();report.status=report.businessFailures.length?'business-failed':'passed';assert.equal(report.businessFailures.length,0,'BUDGET_PHASE_RETURN: '+report.businessFailures.map(f=>f.id).join(','));
}catch(error){if(report.status!=='business-failed')report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();
 report.sourceAfter=sources.map(receipt);report.distAfter=inventory('dist');report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);put('report',report);assert(report.sourceHeld&&report.distHeld,'All source/dist/lock bodies stay byte-identical');
}
