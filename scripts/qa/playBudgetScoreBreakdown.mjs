// Remote-only BB-09 browser evidence. Every market response row is fictional.
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

assert(process.env.CI,'Remote CI only');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.resolve(ROOT,process.env.BB_SCORE_BROWSER_OUT||'bb-score-artifacts/browser');
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return {file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',b=Buffer.from(JSON.stringify(value,null,2));fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),b);return {file,bytes:b.length,sha256:sha(b)};};
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[receipt(dir+'/'+e.name)]:[]);
const entry="export {FORMATIONS,playerRating,normalizePosition} from './src/lib/squadShape';export {getTodayET} from './src/lib/dateUtils';";
const compiled=await build({stdin:{contents:entry,resolveDir:ROOT,sourcefile:'bb-score-oracle.ts',loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,metafile:true,alias:{'@':path.join(ROOT,'src')},logLevel:'error'});
const oracle=path.join(OUT,'oracle.cjs');fs.writeFileSync(oracle,compiled.outputFiles[0].contents);
const B=createRequire(import.meta.url)(oracle),formation=B.FORMATIONS[0],day=B.getTodayET();
assert(formation.name==='4-3-3'&&formation.slots.length===11,'Actual source formation required');
const make=(name,position,value)=>({player_name:name,position,age:22,nationality:'Fixtureland',club:'Fictional Club '+name,market_value_usd:value*1000000,goals:0,assists:0});
const rawRows=[...formation.slots.slice(1).map((slot,i)=>make('Fictional XI '+(i+1),slot.allowed[0],60)),...[40,199,200,201,400].map(v=>make('Fictional Keeper '+v,'GK',v)),...Array.from({length:18},(_,i)=>make('Fictional Bench '+String(i+1).padStart(2,'0'),'CM',1))].sort((a,b)=>b.market_value_usd-a.market_value_usd||a.player_name.localeCompare(b.player_name));
assert(rawRows.length===33&&new Set(rawRows.map(p=>p.player_name)).size===33,'Exactly33 distinct fictional records, satisfying real loader floor');
const players=rawRows.map(r=>({name:r.player_name,position:B.normalizePosition(r.position),marketValue:Math.max(1,Math.round((r.market_value_usd||1000000)/1000000)),age:r.age,nationality:r.nationality,club:r.club,league:'Other',goals:r.goals,assists:r.assists,kitNumber:0,difficulty:'easy'}));
assert(players.every(p=>p.position),'Every fictional row normalizes through held source');
const byName=new Map(players.map(p=>[p.name,p])),keeper=v=>byName.get('Fictional Keeper '+v),starters=formation.slots.map((_s,i)=>i===0?keeper(40):byName.get('Fictional XI '+i));
const DEMANDS=[
 ['Sign at least 3 players aged 23 or under',p=>p.filter(x=>x.age>0&&x.age<=23).length>=3],
 ['No single player may cost over a third of the budget',(p,_r,b)=>p.every(x=>x.marketValue<=b/3)],
 ['Build a core: 4+ players sharing a nationality',p=>Math.max(...p.map(x=>p.filter(y=>y.nationality===x.nationality).length))>=4],
 ['Find value: at least 2 players under 15M',p=>p.filter(x=>x.marketValue<15).length>=2],
 ['At least one leader aged 32 or older',p=>p.some(x=>x.age>=32)],
 ['Leave at least 10% of the budget unspent',(_p,r,b)=>r>=b*.1],
 ['At least 6 different nationalities',p=>new Set(p.map(x=>x.nationality)).size>=6],
 ['No two players from the same club',p=>new Set(p.map(x=>x.club)).size===p.length],
 ['At least one player rated 90 or higher',p=>p.some(x=>B.playerRating(x)>=90)],
 ['No more than 4 players from one league',p=>p.every(x=>p.filter(y=>y.league===x.league).length<=4)],
];
const held=['src/pages/BudgetBuilder.tsx','src/components/budget-builder/BudgetBuilderBoard.tsx','src/components/budget-builder/BudgetBuilderBoard.module.css','src/hooks/useBudgetBuilder.ts','src/lib/squadDeal.ts','src/lib/squadShape.ts','src/lib/dartDraft.ts','src/data/footleEnrichment.ts','src/types/game.ts','src/hooks/useGameCompletion.ts','src/hooks/useRevealScroll.ts','src/lib/completions.ts','src/components/game/GameHelp.tsx','src/components/game/HowToPlayPopover.tsx','src/data/gameContent/soccer1.ts','src/data/gameContent/loader.ts','src/data/gameContent/guideShape.ts','scripts/lib/answerConsent.mjs','scripts/lib/playwrightLoader.mjs','scripts/lib/offlineTransport.cjs','scripts/lib/hostLikeServer.mjs','scripts/qa/playBudgetScoreBreakdown.mjs','package.json','package-lock.json'];
const sources=[...new Set([...held,...Object.keys(compiled.metafile.inputs).filter(f=>f.startsWith('src/'))])].sort();
const report={status:'running',checks:0,day,scope:'Actual built App at320/390/1280. Native Today/4-3-3 signs, complete-XI and replacement score components, cancel/confirm/refund, one natural Final and replacement after its observed result.',
 fixtureScope:'Exactly33 fictional player_market_values rows are fulfilled only for the actual2026 bounded market GET and its preflight. All other foreign requests are aborted, including completion attempts.',
 limits:['No clock, RNG, DOM, save or in-memory pool replacement. Native random draws and their count are unobserved.','Final outcome is derived from the original displayed three-leg scores, never forced or required to win. Positive win/draw branches are owned by unit tests.','The independent score oracle uses literal held arithmetic and the observed demand plus own fixture records; it never imports budgetScoreBreakdown. Held playerRating interprets fixture values.','Source loader maps these unknown fictional names/clubs to Other. No real roster, price, provider, backend write, actual-font or wider fleet credit.','The pre-existing completed-XI reveal may intentionally move the document after the eleventh signing; that transition is retained separately from exact held-scroll preview/cancel/replacement actions.'],
 fixture:put('fictional-market',{rawRows,convertedPlayers:players,formation}),sourceBefore:sources.map(receipt),distBefore:inventory('dist'),oracle:{entry,sha256:sha(compiled.outputFiles[0].contents)},journeys:[],screenshots:[],externalForwarded:0};
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
 for(const [width,height]of[[320,568],[390,844],[1280,900]]){
  sameDay();const id=String(width),mobile=width<1000,row={width,height,mode:mobile?'native touch and keyboard text entry':'native keyboard',status:'running',frames:[],actions:[],layouts:[],scores:[],requests:[],events:[],errors:[],assetErrors:[],routeErrors:[],screenshots:[]};report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'});let page,picked=Array(11).fill(null),demand;
  const board=()=>page.locator('[data-budget-builder]'),slot=i=>board().locator('[data-budget-slot="'+i+'"]'),picker=()=>page.getByRole('region',{name:'Signing shortlist',exact:true}),input=()=>picker().getByRole('textbox',{name:'Search eligible players by name or club',exact:true}),previewPanel=()=>page.locator('[data-budget-preview]');
  const overview=()=>page.getByRole('region',{name:'Score breakdown',exact:true}),projection=()=>page.getByRole('region',{name:'Score impact after signing',exact:true});
  const completionAttempts=()=>row.requests.filter(r=>r.completion?.game==='budget-builder');
  const press=async target=>{if(mobile)await target.tap();else{await target.focus();await target.press('Enter');}};
  const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let last='',n=0;const end=performance.now()+10000;do{await new Promise(requestAnimationFrame);const sig=JSON.stringify([...document.querySelectorAll('[data-budget-builder] button,[data-budget-builder] input,[data-budget-builder] select,[data-budget-builder] section,[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));n=sig===last?n+1:1;last=sig;if(n>=4&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return;}while(performance.now()<end);throw Error('Page did not settle');});
  const frame=async name=>{await settle();sameDay();const value=await page.evaluate(()=>({at:Date.now(),viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),scroll:{x:scrollX,y:scrollY},storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),focus:{id:document.activeElement?.id,tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent?.trim()},body:document.body.innerText,boardText:document.querySelector('[data-budget-builder]')?.innerText,slots:[...document.querySelectorAll('[data-budget-slot]')].map(e=>({index:Number(e.getAttribute('data-budget-slot')),label:e.getAttribute('aria-label'),disabled:e.disabled,expanded:e.getAttribute('aria-expanded'),text:e.innerText})),input:document.querySelector('[aria-label="Search eligible players by name or club"]')?.value??null}));check(value.viewport.width===width&&value.documentWidth<=width,id+': actual width and no document overflow');row.frames.push(put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,value));return value;};
  const geometry=async(target,needs44=true)=>{check(await target.count()===1&&await target.isVisible(),id+': one visible native target');const v=await target.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:e.textContent?.trim(),rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:hit===e||e.contains(hit),disabled:e.matches(':disabled'),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth};});check(v.hit&&!v.disabled&&v.rect.x>=-.5&&v.rect.x+v.rect.width<=width+.5&&v.rect.y>=0&&v.rect.y+v.rect.height<=height+.5,id+': target fully visible and center reachable');if(needs44)check(v.rect.width>=44&&v.rect.height>=44,id+': native target at least44px');row.layouts.push(v);return v;};
  const action=async(name,target,work,held=true,needs44=true)=>{if(target){await target.scrollIntoViewIfNeeded();await settle();}const targetReceipt=target?await geometry(target,needs44):null,before=await frame(name+'-before'),start=row.events.length;await work();const after=await frame(name+'-after');if(held)equal(after.scroll,before.scroll,id+': exact prepared document scroll held '+name);row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,target:targetReceipt,heldScroll:held,before,after,events:row.events.slice(start)}));return{before,after};};
  const remaining=ps=>1000-ps.filter(Boolean).reduce((n,p)=>n+p.marketValue,0);
  const expected=(ps,outcome=null)=>{const real=ps.filter(Boolean),complete=real.length===11;if(!complete)return{quality:0,savings:0,demand:0,series:0,total:0,remaining:remaining(ps),outcome};const quality=Math.round(real.reduce((n,p)=>n+B.playerRating(p),0)/11),savings=Math.floor(Math.max(0,remaining(ps))/200),bonus=demand[1](real,remaining(ps),1000)?10:0,series=outcome==='win'?15:outcome==='draw'?5:0;return{quality,savings,demand:bonus,series,total:quality+savings+bonus+series,remaining:remaining(ps),outcome};};
  const points=async(region,want,label,change)=>{
   check(await region.count()===1&&await region.isVisible(),id+': one visible '+label);
   const actual=await region.evaluate(e=>({fields:Object.fromEntries([...e.querySelectorAll('dt')].map(dt=>[dt.textContent.trim(),dt.nextElementSibling?.tagName==='DD'?dt.nextElementSibling.textContent.trim():null])),rects:[...e.querySelectorAll('dt,dd')].map(x=>{const r=x.getBoundingClientRect();return{text:x.textContent.trim(),x:r.x,right:r.right,width:r.width,clientWidth:x.clientWidth,scrollWidth:x.scrollWidth};})}));
   const status=want.outcome===null?'Pending (0 so far)':(want.outcome==='win'?'Win':want.outcome==='draw'?'Draw':'Loss')+' (+'+want.series+')';
   const fields={'Squad quality':String(want.quality),'Savings':String(want.savings),'Board demand':String(want.demand),'Series outcome':status,'Total':String(want.total)};if(change!==undefined)fields['Total change']=(change>=0?'+':'')+change;
   equal(actual.fields,fields,id+': exact independent '+label+' components');check(want.quality+want.savings+want.demand+want.series===Number(actual.fields.Total),id+': four displayed components sum exactly');
   check(actual.rects.every(r=>r.width>0&&r.x>=-.5&&r.right<=width+.5&&r.scrollWidth<=r.clientWidth+1),id+': score labels/values fit viewport without clipping');row.scores.push(put(id+'/scores/'+String(row.scores.length).padStart(3,'0')+'-'+label,{expected:want,change:change??null,actual,picked:psCopy()}));return actual;
  };
  const psCopy=()=>picked.map(p=>p?{...p}:null);
  const checkCurrent=async(outcome=null)=>{const want=expected(picked,outcome);await points(overview(),want,'current');check((await board().innerText()).includes('Spent $'+(1000-want.remaining)+'M of $1000M'),id+': visible spent/remaining follows exact fixture ledger');for(let i=0;i<11;i++)if(picked[i])check((await slot(i).getAttribute('aria-label'))===formation.slots[i].label+' slot '+(i+1)+': '+picked[i].name,id+': original signed identity in slot '+i);return want;};
  const openPreview=async(index,p)=>{
   if(await slot(index).getAttribute('aria-expanded')!=='true')await action('open-slot-'+index+'-'+p.marketValue,slot(index),()=>press(slot(index)));
   await picker().waitFor();await action('search-'+index+'-'+p.marketValue,input(),async()=>{if(mobile)await input().tap();else await input().focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(p.name,{delay:2});});
   const candidate=picker().getByRole('button',{name:'Preview signing '+p.name+' for $'+p.marketValue+'M',exact:true});await action('preview-'+index+'-'+p.marketValue,candidate,async()=>{await press(candidate);await previewPanel().waitFor();});return candidate;
  };
  const confirm=async(index,p,allowReveal=false)=>{
   const target=previewPanel().getByRole('button',{name:'Confirm signing',exact:true}),result=await action('confirm-'+index+'-'+p.marketValue,target,async()=>{await press(target);await picker().waitFor({state:'hidden'});await wait(()=>slot(index).evaluate(e=>e===document.activeElement),id+': stable committed slot gets focus');},!allowReveal);
   picked[index]=p;check(await slot(index).getAttribute('aria-label')===formation.slots[index].label+' slot '+(index+1)+': '+p.name,id+': exact committed player');return result;
  };
  const cancel=async(candidate,label)=>{const result=await action(label,previewPanel().getByRole('button',{name:'Cancel preview',exact:true}),async()=>{await press(previewPanel().getByRole('button',{name:'Cancel preview',exact:true}));await previewPanel().waitFor({state:'hidden'});await wait(()=>candidate.evaluate(e=>e===document.activeElement),id+': Cancel returns exact candidate focus');});return result;};
  const photo=async(name,target)=>{
   const before=await frame(name+'-photo-preparation-before'),start=row.events.length;await page.locator('#dukb-main').focus();await page.keyboard.press('Control+Home');await wait(()=>page.evaluate(()=>scrollX===0&&scrollY===0),id+': native Home reaches document origin');await wait(()=>row.events.slice(start).some(e=>e.trusted&&e.key==='Home'&&e.ctrlKey&&e.targetId==='dukb-main'),id+': native main Home observed');
   const after=await frame(name+'-photo-preparation-after');equal(after.storage,before.storage,id+': full storage held through photo preparation');row.actions.push(put(id+'/photo-preparations/'+name,{name,focus:'#dukb-main',key:'Control+Home',before,after,events:row.events.slice(start)}));
   const r=await target.boundingBox();check(r&&r.width>0&&r.height>0,id+': actual photo ROI');const chrome=await page.evaluate(()=>[...document.querySelectorAll('body *')].flatMap(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return['fixed','sticky'].includes(s.position)&&s.visibility!=='hidden'&&s.display!=='none'&&r.width>=innerWidth/2&&r.height>0&&r.y<=1&&r.bottom>0?[{tag:e.tagName,id:e.id,bottom:r.bottom}]:[];}));check(r.y>=Math.max(0,...chrome.map(e=>e.bottom)),id+': photo ROI below actual top chrome');const y=Math.max(0,Math.floor(r.y-10)),clip={x:0,y,width,height:Math.min(after.documentHeight-y,Math.ceil(r.height+20))},file=id+'-'+name+'.png';
   await page.screenshot({path:path.join(OUT,file),fullPage:true,clip});const b=fs.readFileSync(path.join(OUT,file)),item={file,bytes:b.length,sha256:sha(b),clip,chrome,frame:row.frames.at(-1)};report.screenshots.push(item);row.screenshots.push(item);
  };
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
   await page.exposeBinding('__bbScoreEvidence',(_source,event)=>row.events.push(event));await page.addInitScript(()=>{for(const type of['pointerup','click','keydown'])document.addEventListener(type,e=>{const t=e.target?.closest?.('button,input,select,main');if(t)window.__bbScoreEvidence({at:Date.now(),type,trusted:e.isTrusted,key:e.key,ctrlKey:e.ctrlKey,pointerType:e.pointerType,targetId:t.id,tag:t.tagName,text:t.textContent?.trim()});},true);});
   await page.goto(BASE+'/budget-builder',{waitUntil:'networkidle'});await answerConsent(page,{press:async t=>action('reject-optional-consent',t,()=>press(t),false,false)});check(await storedConsent(page)==='rejected',id+': optional consent refused');
   await page.getByText('0/11 signed',{exact:true}).waitFor();check(row.requests.filter(r=>r.outcome==='fixture-fulfilled').length===1,id+': one actual33-row market read');
   const select=page.getByRole('combobox',{name:'Choose formation',exact:true});await action('native-default-formation',select,async()=>{if(mobile)await select.tap();else await select.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');},false);equal(await select.inputValue(),'4-3-3',id+': native source formation');
   const text=await board().innerText();demand=DEMANDS.find(([label])=>text.includes(label));check(!!demand,id+': observed actual-day demand is source-known');row.demand={label:demand[0],day};
   for(let i=0;i<11;i++){await openPreview(i,starters[i]);await confirm(i,starters[i],i===10);check(completionAttempts().length===0,id+': no Final or completion during ordinary signing');}
   const initial=await checkCurrent();check(initial.remaining===360,id+': initial exact1000 budget and640 spent');await photo('current-complete',overview());
   const before=await frame('before-first-replacement');let candidate=await openPreview(0,keeper(201));let afterPicked=psCopy();afterPicked[0]=keeper(201);let projected=expected(afterPicked,null);await points(projection(),projected,'preview-before-cancel',projected.total-initial.total);check(projected.remaining===199,id+': replacement includes original40 refund');await photo('replacement-preview',previewPanel());
   const cancelled=await cancel(candidate,'cancel-first-replacement');equal(cancelled.after.storage,before.storage,id+': cancelled preview full storage held');await checkCurrent();equal(completionAttempts().length,0,id+': cancelled preview no completion');
   await openPreview(0,keeper(201));await confirm(0,keeper(201));const upgraded=await checkCurrent();check(upgraded.remaining===199,id+': expensive replacement commits exact refund');equal(completionAttempts().length,0,id+': replacement does not play Final');
   await openPreview(0,keeper(199));afterPicked=psCopy();afterPicked[0]=keeper(199);projected=expected(afterPicked,null);await points(projection(),projected,'refund-preview',projected.total-upgraded.total);equal(projected.total-upgraded.total,1,id+':199 to201 remaining crosses one exact savings point');await confirm(0,keeper(199));const preFinal=await checkCurrent();check(preFinal.remaining===201,id+': refunded replacement leaves201M');
   const finish=page.getByRole('button',{name:/Play the Final vs the Money XI/}),completed=page.waitForRequest(r=>{if(r.method()!=='POST'||!new URL(r.url()).pathname.endsWith('/game_completions'))return false;const data=r.postDataJSON(),item=Array.isArray(data)?data[0]:data;return item.game==='budget-builder';},{timeout:20000});
   await action('native-natural-Final',finish,async()=>{await press(finish);await page.getByText(/^Legs:/).waitFor();await completed;await wait(()=>page.evaluate(()=>{const raw=localStorage.getItem('dukb-local-completions');return raw&&JSON.parse(raw).slugs.includes('budget-builder');}),id+': local completion recorded');});
   const legsText=await page.getByText(/^Legs:/).innerText(),legs=[...legsText.matchAll(/(\d+)-(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])]);check(legs.length===3,id+': actual three-leg result');const wins=legs.filter(([a,b])=>a>b).length,losses=legs.filter(([a,b])=>a<b).length,outcome=wins>losses?'win':wins<losses?'loss':'draw';
   const headline=await board().getByText(/^(Your darts built a champion, series won|The Machine takes the series|Dead level after three legs)/).innerText();check(outcome==='win'?headline.startsWith('Your darts built a champion'):outcome==='loss'?headline.startsWith('The Machine takes the series'):headline.startsWith('Dead level after three legs'),id+': original headline agrees with observed leg scores');
   const postFinal=await checkCurrent(outcome);await page.getByText('Score: '+postFinal.total,{exact:true}).waitFor();check(completionAttempts().length===1&&completionAttempts()[0].completion.score===postFinal.total&&completionAttempts()[0].outcome==='aborted',id+': one blocked existing completion with independently reconciled actual score');row.final={legsText,legs,outcome,headline,expected:postFinal,observedPositiveBonus:postFinal.series>0};await photo('after-natural-Final',overview());
   const finished=await frame('finished-before-replacement');candidate=await openPreview(0,keeper(200));afterPicked=psCopy();afterPicked[0]=keeper(200);projected=expected(afterPicked,null);await points(projection(),projected,'old-Final-reset-preview',projected.total-postFinal.total);equal(projected.total-postFinal.total,-postFinal.series,id+': preview removes actual observed old Final bonus');const cancelledFinal=await cancel(candidate,'cancel-after-Final');equal(cancelledFinal.after.storage,finished.storage,id+': cancelling after Final holds all storage');await checkCurrent(outcome);check(completionAttempts().length===1,id+': cancelled post-Final preview does not replay or record');
   await openPreview(0,keeper(200));const pending=await confirm(0,keeper(200));await checkCurrent();check(await page.getByRole('button',{name:/Play the Final vs the Money XI/}).count()===1,id+': replacement returns to pending native Final');equal(pending.after.storage,finished.storage,id+': confirmed replacement does not rewrite completed storage');check(completionAttempts().length===1,id+': only one natural Final completed');
   check(row.requests.every(r=>['aborted','fixture-cors','fixture-fulfilled'].includes(r.outcome)),id+': no foreign forwarded');check(row.routeErrors.length===0&&row.errors.length===0&&row.assetErrors.length===0,id+': no route, App or local asset errors');check(row.events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown'&&e.key==='Enter')),id+': native interaction mode observed');row.status='passed';console.log('PASS native Budget score '+width+' '+outcome);
  }catch(error){row.status='failed';row.error=String(error.stack||error);if(page&&!page.isClosed())await frame('failure').catch(()=>{});throw error;}
  finally{await context.close();put('report',report);}
 }
 check(report.screenshots.length===9,'Exactly nine actual current/preview/after-Final PNGs');sameDay();report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();
 report.sourceAfter=sources.map(receipt);report.distAfter=inventory('dist');report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);put('report',report);assert(report.sourceHeld&&report.distHeld,'All source/dist/lock bodies stay byte-identical');
}
