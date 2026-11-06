// Remote native Connections streak proof. Only bounded fictional reads are fulfilled.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import pw from '../lib/playwrightLoader.mjs';
import { storedConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI, 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.SIM_OFFLINE_RECEIPT);
const HOOK='4b855e80db09fcff02154cf44d3357d0d0ffa1c6';
assert.equal(process.env.CONNECTIONS_STREAK_HOOK_BLOB, HOOK, 'Reviewed fixed Hook');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT=path.resolve(ROOT, process.env.CONNECTIONS_STREAK_BROWSER_OUT||'connections-streak-browser');
assert(OUT.startsWith(ROOT+path.sep));
assert(!/^(?:src|public|scripts|dist|node_modules|\.git)(?:[\\/]|$)/.test(path.relative(ROOT,OUT)));
assert(!fs.existsSync(OUT), 'Fresh evidence directory');
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fileRef=file=>{const b=fs.readFileSync(path.join(OUT,file));return{file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),bytes,{flag:name==='report'?'w':'wx'});return fileRef(file);};
const textFile=(file,text)=>{fs.writeFileSync(path.join(OUT,file),text,{flag:'wx'});return fileRef(file);};
const readRef=ref=>{const b=fs.readFileSync(path.join(OUT,ref.file));assert.equal(b.length,ref.bytes);assert.equal(sha(b),ref.sha256);return JSON.parse(b);};
const sourceReceipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return{file,bytes:b.length,sha256:sha(b)};};
const tracked=()=>execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean).map(sourceReceipt);
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[sourceReceipt(dir+'/'+e.name)]:[]);
const versions=()=>{const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json')));const rows=Object.keys(lock.packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,p,'package.json'))).map(p=>[p,JSON.parse(fs.readFileSync(path.join(ROOT,p,'package.json'))).version]);assert.equal(rows.length,521);for(const[p,v]of rows)assert.equal(v,lock.packages[p].version,p);return rows;};
const offline=()=>{const file=path.resolve(ROOT,process.env.SIM_OFFLINE_RECEIPT),b=fs.readFileSync(file);assert.equal(b.length,0);return{file:path.relative(ROOT,file),bytes:0,sha256:sha(b)};};
const ROUTE='/connections',HELPER='scripts/qa/playConnectionsStreakOwnership.mjs';
const WIDTHS=[[320,568],[390,844],[1280,900]];
const pins={
 'src/hooks/useConnections.ts':HOOK,'src/pages/Connections.tsx':'b5bd5aaba7d8877be86cc592ca4ae1616b517a5f',
 'src/components/connections/ConnectionsBoard.tsx':'ddf73f5aa52fca4d425b5050b1bc48ef898155fe',
 'src/hooks/useDailyPuzzle.ts':'b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846',
 'src/hooks/useGameCompletion.ts':'b104822551fd5d9b1c5d6ddb14f01c79e5a662b2',
 'src/lib/fetchConnectionsPuzzles.ts':'9898509632c42b37b8db3195ace953cd565fc201',
 'src/lib/fetchAllRows.ts':'16a6d21750405e7a647576ff513ed8ee11d5ba6b',
 'src/lib/completions.ts':'61daf9b6c528f884551cd1d42f71357681c8728a',
 'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33',
 'src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
 'public/connections/index.html':'41f384834b6c6fc3435c751f7d6154065389ac91',
 'src/components/connections/ConnectionsHowToPlay.tsx':'9765aea64c3a95609c748df6abaacfd15b47325f',
 'src/components/game/GiveUpButton.tsx':'2462260a7b5f1d5d3b70915df2428d5d4397b0a0',
 'src/components/game/ResultScreen.tsx':'dd6a06380851ab68d3b85c3a567d77c99e88b386',
 'src/components/ui/dialog.tsx':'401b3b2aa4c9404d98d9f05bc3f88ce5eb6b19cd',
 'src/components/CookieConsent.tsx':'7ffba7ff4099c051d949cd20fe31bc75332f215b',
 'src/index.css':'775df500bd7c9730e5b04aedd3d6b2a1564d49b4',
 'scripts/lib/answerConsent.mjs':'c6d16997e4c06e8b35dcfd0bab5efcad3069d899',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a',
 'package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe'
};
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(path.join(ROOT,file))),want,file+' physical reviewed pin');
const saved=fs.readFileSync(path.join(ROOT,'public/connections/index.html'));
assert.equal(saved.length,21327);
const savedDom=new JSDOM(saved.toString('utf8')),savedDoc=savedDom.window.document;
assert.equal(savedDoc.querySelector('link[rel=canonical]')?.getAttribute('href'),'https://douknowball.com'+ROUTE);
assert.equal(savedDoc.querySelectorAll('#dukb-snapshot').length,1);
assert(savedDoc.querySelector('#dukb-snapshot').textContent.trim().length>500);
assert([...savedDoc.querySelectorAll('#dukb-snapshot h1')].some(n=>n.textContent.trim()==='SOCCER CONNECTIONS'));
assert(![...savedDoc.querySelectorAll('meta')].some(n=>/^dukb-retired-/i.test(n.getAttribute('name')||'')||(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'||(['robots','googlebot','bingbot'].includes((n.getAttribute('name')||'').toLowerCase())&&/(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(n.getAttribute('content')||''))));
savedDom.window.close();
const fixture=['A','B'].map(letter=>({puzzle_id:'fixture-native-streak-'+letter.toLowerCase(),groups_json:['easy','medium','hard','insane'].map((difficulty,group)=>({category:'Fixture Native '+letter+' group '+(group+1),difficulty,players:Array.from({length:4},(_,player)=>'Fixture Native '+letter+(group+1)+(player+1))}))}));
const expectedQuery={select:'puzzle_id,groups_json',order:'sort_order.asc',offset:'0',limit:'1000'};
const indexBefore=textFile('index-before.txt',execFileSync('git',['ls-files','-s'],{cwd:ROOT}));
const report={version:1,status:'running',route:ROUTE,hook:HOOK,helper:blob(fs.readFileSync(path.join(ROOT,HELPER))),pins,
 sourceBefore:tracked(),distBefore:inventory('dist'),locksBefore:['package.json','package-lock.json'].map(sourceReceipt),installedBefore:versions(),offlineBefore:offline(),indexBefore,
 activeEntry:{snapshot:sourceReceipt('public/connections/index.html'),canonical:'https://douknowball.com'+ROUTE,limits:'Immutable App/catalog/Page and saved-page pins; actual native controls and fetched fictional board establish the live mount.'},
 fixture:put('fictional-transport',{rows:fixture,query:expectedQuery,rangeHeaders:null,sourceVersion:'@supabase/postgrest-js2.95.3',sources:['https://github.com/supabase/supabase-js/blob/v2.95.3/packages/core/postgrest-js/src/PostgrestQueryBuilder.ts#L121','https://github.com/supabase/supabase-js/blob/v2.95.3/packages/core/postgrest-js/src/PostgrestTransformBuilder.ts#L178','https://github.com/supabase/supabase-js/blob/v2.95.3/packages/core/postgrest-js/src/PostgrestBuilder.ts#L110'],limits:'Exact projection/order/URL offset0/limit1000, with no Range header; actual parser/fetchAllRows remains active. No in-memory pool override.'}),
 journeys:[],screenshots:[],checks:0,
 limits:['Same-page public result viewing and genuinely new results on explicitly fictional GET rows. Native mouse and Escape actions in emulated viewports; no physical-touch claim.',
 'No App/DOM/storage/Date/RNG/pool overrides. Browser event listeners and CDP storage observation only. Fresh contexts have no injected storage state.',
 'Only operated mouse targets require whole viewport/clip/hit/enabled geometry. Inherited dimensions and observed Close clipping are retained without44px, Close click-accessibility or whole-page-fit credit.',
 'Public Escape dismissal requires actual open-dialog focus ownership, trusted keydown and closed outcome. Every completion POST is observed then aborted. No forwarded backend write, provider truth, terminal restore, cross-tab, delayed-effect race, full-suite or release claim.']};
assert.equal(report.distBefore.length,850);
const check=(ok,why)=>{report.checks++;assert(ok,why);};
const equal=(a,b,why)=>{report.checks++;assert.deepEqual(a,b,why);};
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
let browser,host;
async function runContext(BASE,width,height,scenario){
 const id=width+'-'+scenario,row={id,scenario,width,height,status:'running',navigations:[],events:[],storageEvents:[],requests:[],webSockets:[],errors:[],assetErrors:[],routeErrors:[],frames:[],actions:[],preparations:[],layouts:[],wheels:[],screenshots:[],observedClose:[],settlements:[],checkpoints:{},firstPartyReads:[]};
 const journey=report.journeys.find(j=>j.width===width);journey.contexts.push(row);
 const context=await browser.newContext({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000,serviceWorkers:'block'});
 let page,cdp;
 const button=name=>page.getByRole('button',{name,exact:true});
 const completionPosts=()=>row.requests.filter(r=>r.path==='/rest/v1/game_completions'&&r.method==='POST');
 const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let previous='',same=0;const end=performance.now()+8000;do{await new Promise(requestAnimationFrame);const value=JSON.stringify([...document.querySelectorAll('main button,[role=dialog],[role=region][aria-label="Cookie choices"] button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));same=value===previous?same+1:1;previous=value;if(same>=4)return;}while(performance.now()<end);throw Error('Actual control geometry did not settle');});
 const state=()=>page.evaluate(()=>{
  const main=document.querySelector('main#dukb-main'),buttons=[...(main?.querySelectorAll('button')||[])],text=b=>b.textContent.trim();
  const daily=buttons.find(b=>text(b)==='\u{1F4C5} Daily'),unlimited=buttons.find(b=>text(b)==='\u221e Unlimited');const header=daily?.closest('header')??null;
  const mode=daily?.classList.contains('bg-background')?'daily':unlimited?.classList.contains('bg-background')?'unlimited':null;
  const board=main?.querySelector('div.w-full.max-w-xl.mx-auto.space-y-3'),cards=board?[...board.children].filter(n=>n.classList.contains('rounded-xl')):[],players=board?[...board.querySelectorAll('button')]:[];
  const submit=buttons.find(b=>text(b)==='Submit'),result=[...(main?.querySelectorAll('h2')||[])].map(n=>n.textContent.trim()).find(t=>t==='You found all connections!'||t==='Game Over')??null;
  const flame=header?.querySelector('svg.lucide-flame'),livesLabel=[...(header?.querySelectorAll('span')||[])].find(n=>n.textContent.trim()==='Lives:');
  const lives=livesLabel?[...livesLabel.parentElement.children].filter(n=>n.tagName==='DIV'&&n.classList.contains('bg-primary')).length:null;
  const storage=Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),dailyKeys=Object.keys(storage).filter(k=>/^connections-daily-/.test(k));
  const dialog=document.querySelector('[role=dialog]'),active=document.activeElement;
  return{at:Date.now(),url:location.href,timeOrigin:performance.timeOrigin,visibility:document.visibilityState,viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,scroll:{x:scrollX,y:scrollY},mode,phase:result==='You found all connections!'?'won':result==='Game Over'?'lost':submit?'playing':'boot-or-loading',lives,streak:flame?Number(flame.parentElement.textContent.trim()):0,
   storage,dailyKeys,dailySave:dailyKeys.length===1?JSON.parse(storage[dailyKeys[0]]):null,
   solved:cards.map(n=>({category:n.querySelector('p')?.textContent.trim(),playersText:n.querySelectorAll('p')[1]?.textContent,html:n.outerHTML})),
   remaining:players.map(text),selected:players.filter(n=>n.classList.contains('bg-primary')).map(text),
   controls:{submit:!!submit,submitDisabled:submit?submit.disabled:null,giveUp:buttons.some(b=>text(b)==='Give up'),confirmGiveUp:buttons.some(b=>text(b)==='Yes, reveal it'),retry:buttons.some(b=>text(b)==='Retry'),next:buttons.some(b=>text(b)==='Next Puzzle')},
   resultHeading:result,dialog:{open:!!dialog,labelledBy:dialog?.getAttribute('aria-labelledby')??null,title:dialog?.querySelector('h2')?.textContent??null,html:dialog?.outerHTML??null,ownsFocus:!!dialog&&!!active&&dialog.contains(active)},
   cookieChoices:!!document.querySelector('[role=region][aria-label="Cookie choices"]'),
   focus:{tag:active?.tagName??null,text:active?.textContent??null,label:active?.getAttribute('aria-label')??null,insideMain:!!main&&!!active&&main.contains(active),insideDialog:!!dialog&&!!active&&dialog.contains(active)},
   html:main?.outerHTML??null,text:main?.textContent??null};
 });
 const frame=async name=>{await settle();const value=await state();check(value.url===BASE+ROUTE&&value.viewport.width===width&&value.viewport.height===height&&value.documentWidth<=width&&value.visibility==='visible',id+' actual active viewport');const ref=put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,value);row.frames.push(ref);return{ref,value};};
 const stableCore=(a,b,label)=>{for(const key of['url','timeOrigin','mode','phase','lives','streak','storage','dailyKeys','dailySave','solved','remaining','selected','controls','resultHeading'])equal(a[key],b[key],id+' '+label+' '+key);};
 const geometry=target=>target.evaluate(el=>{const r=el.getBoundingClientRect(),center={x:r.x+r.width/2,y:r.y+r.height/2},hit=document.elementFromPoint(center.x,center.y),ancestors=[];let top=0,bottom=0;
  for(const x of[6,innerWidth/2,innerWidth-6])for(const[y,edge]of[[1,'top'],[innerHeight-2,'bottom']])for(const n of document.elementsFromPoint(x,y)){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||b.height<=0||b.height>innerHeight*.4||n.contains(el))continue;if(edge==='top'&&b.y<=2&&b.bottom>0)top=Math.max(top,b.bottom);if(edge==='bottom'&&b.bottom>=innerHeight-2&&b.y<innerHeight)bottom=Math.max(bottom,innerHeight-b.y);}
  for(let n=el.parentElement;n;n=n.parentElement){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(n===document.scrollingElement)continue;const cx=['auto','scroll','hidden','clip','overlay'].includes(s.overflowX),cy=['auto','scroll','hidden','clip','overlay'].includes(s.overflowY);if(cx||cy)ancestors.push({tag:n.tagName,cx,cy,x:b.x+n.clientLeft,y:b.y+n.clientTop,right:b.x+n.clientLeft+n.clientWidth,bottom:b.y+n.clientTop+n.clientHeight,scrollableY:['auto','scroll','overlay'].includes(s.overflowY)&&n.scrollHeight>n.clientHeight+1,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight});}
  return{at:Date.now(),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center,chrome:{top,bottom},ancestors,hit:hit===el||el.contains(hit),enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.trim(),label:el.getAttribute('aria-label'),meets44:r.width>=44&&r.height>=44};});
 const qualifies=g=>g.rect.width>0&&g.rect.height>0&&g.rect.x>=0&&g.rect.right<=width&&g.rect.y>=g.chrome.top&&g.rect.bottom<=height-g.chrome.bottom&&g.ancestors.every(c=>(!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right))&&(!c.cy||(g.rect.y>=c.y&&g.rect.bottom<=c.bottom)))&&g.hit&&g.enabled;


 const prepare=async(target,name,kind)=>{
  check(await target.count()===1&&await target.isVisible(),id+' unique visible '+name);
  const wheelStart=row.wheels.length;
  for(let attempt=0;attempt<18;attempt++){
   const g=await geometry(target);
   if(qualifies(g)){const layout={name,kind,usedForActuation:kind!=='display',qualified:true,...g};const layoutRef=put(id+'/layouts/'+String(row.layouts.length).padStart(3,'0')+'-'+name,layout);row.layouts.push(layoutRef);row.preparations.push(put(id+'/preparations/'+String(row.preparations.length).padStart(3,'0')+'-'+name,{name,kind,layout:layoutRef,wheels:row.wheels.slice(wheelStart),scope:'Read-only geometry; any actual native wheel has its own complete before/after state frames.'}));return{layout,layoutRef};}
   const clipTop=Math.max(g.chrome.top,...g.ancestors.filter(c=>c.cy).map(c=>c.y)),clipBottom=Math.min(height-g.chrome.bottom,...g.ancestors.filter(c=>c.cy).map(c=>c.bottom));
   check(g.rect.width>0&&g.rect.height>0&&g.rect.height<=clipBottom-clipTop,id+' target can fit actual vertical clip');
   check(g.rect.x>=0&&g.rect.right<=width&&g.ancestors.every(c=>!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right)),id+' actual horizontal target clip');
   const deltaY=g.rect.y<clipTop?Math.floor(g.rect.y-clipTop-8):g.rect.bottom>clipBottom?Math.ceil(g.rect.bottom-clipBottom+8):0;
   check(deltaY!==0,id+' center is blocked without a scroll remedy');
   const container=g.ancestors.find(c=>c.scrollableY&&Math.min(c.bottom,height-g.chrome.bottom)>Math.max(c.y,g.chrome.top));
   const visibleTop=container?Math.max(container.y,g.chrome.top,0):g.chrome.top,visibleBottom=container?Math.min(container.bottom,height-g.chrome.bottom):height-g.chrome.bottom;
   const point={x:container?Math.max(2,Math.min(width-2,(Math.max(0,container.x)+Math.min(width,container.right))/2)):width/2,y:(visibleTop+visibleBottom)/2};
   const wheelBefore=await frame(name+'-wheel-'+attempt+'-before'),eventStart=row.events.length;
   await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,deltaY);
   await wait(async()=>{const next=await geometry(target);return Math.abs(next.rect.y-g.rect.y)>0.5||JSON.stringify(next.ancestors.map(c=>c.scrollTop))!==JSON.stringify(g.ancestors.map(c=>c.scrollTop))||(await state()).scroll.y!==wheelBefore.value.scroll.y;},id+' actual native wheel changes scroll geometry');
   const wheelAfter=await frame(name+'-wheel-'+attempt+'-after'),events=row.events.slice(eventStart);
   check(events.some(e=>e.type==='wheel'&&e.trusted&&e.deltaMode===0&&e.deltaY===deltaY),id+' measured trusted native wheel');
   if(row.baseline)stableCore(wheelBefore.value,wheelAfter.value,'wheel holds game');
   row.wheels.push(put(id+'/wheels/'+String(row.wheels.length).padStart(3,'0')+'-'+name,{name,point,deltaX:0,deltaY,before:wheelBefore.ref,after:wheelAfter.ref,geometryBefore:g,geometryAfter:await geometry(target),events}));
  }
  throw Error(id+' bounded native wheel preparation exhausted '+name);
 };
 const mouseAction=async(name,target,kind,done)=>{
  await prepare(target,name,kind);let measured=await geometry(target);await page.mouse.move(measured.center.x,measured.center.y);await settle();measured=await geometry(target);check(qualifies(measured),id+' final hovered whole-target geometry');
  const layoutRef=put(id+'/layouts/'+String(row.layouts.length).padStart(3,'0')+'-'+name+'-click',{name,kind,usedForActuation:true,qualified:true,...measured});row.layouts.push(layoutRef);
  const before=await frame(name+'-before'),eventStart=row.events.length;
  await page.mouse.click(measured.center.x,measured.center.y);
  if(done)await wait(done,id+' completed action '+name);
  const after=await frame(name+'-after'),events=row.events.slice(eventStart),clicks=events.filter(e=>e.type==='click');
  check(clicks.length===1&&clicks[0].trusted&&clicks[0].targetTag==='BUTTON'&&clicks[0].targetText===measured.text,id+' actual single trusted mouse click '+name);
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind,method:'mouse',targetText:measured.text,layout:layoutRef,before:before.ref,after:after.ref,events});
  row.actions.push(ref);return{ref,before,after};
 };
 const escapeHelp=async name=>{
  const dialog=page.getByRole('dialog',{name:'How to Play',exact:true});await dialog.waitFor({state:'visible'});await settle();
  await wait(async()=>{const s=await state();return s.dialog.open&&s.dialog.ownsFocus;},id+' actual open help owns focus');
  const close=dialog.getByRole('button',{name:'Close',exact:true});check(await close.count()===1,id+' actual inherited Close exists');
  const closeGeometry=await geometry(close);row.observedClose.push(put(id+'/observed-close-'+row.observedClose.length,{name,usedForActuation:false,qualifiedForClick:qualifies(closeGeometry),geometry:closeGeometry,scope:'Observed inherited Close geometry only. Dismissal uses public Escape, not a Close click or44px/whole-page claim.'}));
  const before=await frame(name+'-before');check(before.value.dialog.open&&before.value.dialog.ownsFocus&&before.value.focus.insideDialog,id+' Escape dialog ownership');const eventStart=row.events.length;
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  const after=await frame(name+'-after'),events=row.events.slice(eventStart),keys=events.filter(e=>e.type==='keydown'&&e.key==='Escape');
  check(keys.length===1&&keys[0].trusted&&keys[0].inDialog,id+' actual trusted owned Escape');check(!after.value.dialog.open,id+' actual dialog closed');
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind:'startup',method:'keyboard',key:'Escape',owner:before.value.dialog.labelledBy,observedClose:row.observedClose.at(-1),before:before.ref,after:after.ref,events});
  row.actions.push(ref);return{ref,before,after};
 };
 const photo=async name=>{
  const counter=button('\u{1F4C5} Daily').locator('xpath=ancestor::header').locator('svg.lucide-flame').locator('..');
  await prepare(counter,name+'-photo','display');const before=await frame(name+'-photo-before');
  const focus=await page.evaluateHandle(()=>document.activeElement),file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file),fullPage:false});const after=await frame(name+'-photo-after');
  stableCore(before.value,after.value,'screenshot holds game');equal(before.value.scroll,after.value.scroll,id+' screenshot scroll held');const sameFocus=await page.evaluate(el=>document.activeElement===el,focus);await focus.dispose();check(sameFocus,id+' screenshot preserves actual focus node identity');
  const ref={...fileRef(file),name,context:id,scenario,viewport:{width,height},before:before.ref,after:after.ref,focusIdentityHeld:sameFocus};row.screenshots.push(ref);report.screenshots.push(ref);
 };
 const checkpoint=async name=>{const f=await frame(name);row.checkpoints[name]=f.ref;return f;};
 const requireStreak=(s,value,label)=>{equal(s.streak,value,id+' '+label+' displayed streak');equal(s.storage['connections-streak'],String(value),id+' '+label+' persisted streak');};
 const viewHeld=(earned,view,label)=>{requireStreak(view,earned.streak,label);equal(view.storage,earned.storage,id+' '+label+' every saved byte');equal(view.dailySave,earned.dailySave,id+' '+label+' daily record');equal(view.solved,earned.solved,id+' '+label+' solved result');equal(view.remaining,earned.remaining,id+' '+label+' retained board');equal(view.lives,earned.lives,id+' '+label+' lives');equal(view.resultHeading,earned.resultHeading,id+' '+label+' result');};
 const mode=async(value,name)=>mouseAction(name,button(value==='daily'?'\u{1F4C5} Daily':'\u221e Unlimited'),'business',async()=>{const s=await state();return s.mode===value&&!s.dialog.open;});
 const solve=async prefix=>{
  const start=(await frame(prefix+'-start')).value;check(start.phase==='playing'&&start.remaining.length===16&&start.solved.length===0,id+' fresh public board before genuine win');
  const puzzle=fixture.find(p=>p.groups_json.flatMap(g=>g.players).every(n=>start.remaining.includes(n)));check(!!puzzle,id+' DOM identifies supplied board without clock/RNG knowledge');
  for(let group=0;group<4;group++){
   const names=puzzle.groups_json[group].players;
   for(let player=0;player<4;player++){await mouseAction(prefix+'-group-'+group+'-player-'+player,button(names[player]),'business',async()=>{const s=await state();return names.slice(0,player+1).every(n=>s.selected.includes(n))&&s.selected.length===player+1;});}
   const action=await mouseAction(prefix+'-submit-'+group,button('Submit'),'business',async()=>{const s=await state();return s.solved.length===group+1&&s.selected.length===0;});
   equal(action.after.value.solved.map(g=>g.category),puzzle.groups_json.slice(0,group+1).map(g=>g.category),id+' actual correct group outcomes');
   equal(action.after.value.remaining.length,16-4*(group+1),id+' actual remaining count');equal(action.after.value.lives,4,id+' genuine no-error lives');
   equal(action.after.value.phase,group===3?'won':'playing',id+' real win only after fourth correct group');
  }
  return checkpoint(prefix+'-won');
 };
 const giveUp=async(prefix,expectedStreak)=>{
  await mouseAction(prefix+'-give-up',button('Give up'),'business',async()=>!!(await state()).controls.confirmGiveUp);
  const result=await mouseAction(prefix+'-confirm',button('Yes, reveal it'),'business',async()=>(await state()).phase==='lost');
  requireStreak(result.after.value,expectedStreak,prefix+' legitimate loss');row.settlements.push({name:prefix,mode:result.after.value.mode,outcome:'lost',expectedStreak,frame:result.after.ref});return result.after;
 };
 const awaitRequests=async(expectedScore)=>{
  await wait(()=>completionPosts().length===1&&completionPosts().every(r=>r.outcome==='completion-aborted'&&Number.isFinite(r.finishedAt)),id+' completed Daily POST abort boundary');
  equal(completionPosts()[0].payload.score,expectedScore,id+' actual Daily score');return completionPosts()[0];
 };
 const routeTasks=new Set();
 try{
  await context.routeWebSocket('**/*',socket=>{row.webSockets.push({at:Date.now(),outcome:'closed'});socket.close();});
  await context.route('**/*',route=>{
   const task=(async()=>{
    const request=route.request(),u=new URL(request.url()),method=request.method();
    if(u.origin===BASE&&['GET','HEAD'].includes(method)){row.firstPartyReads.push({at:Date.now(),url:u.href,method,outcome:'continued-local-read'});await route.continue();return;}
    const item={at:Date.now(),url:u.href,path:u.pathname,method,query:[...u.searchParams],headers:null,body:request.postData(),outcome:'pending'};row.requests.push(item);
    const host=u.hostname==='flawuiqbvjobmkfkauhw.supabase.co',read=host&&u.pathname==='/rest/v1/connections_puzzles',completion=host&&u.pathname==='/rest/v1/game_completions';
    try{
     const allHeaders=await request.allHeaders();item.headers=Object.fromEntries(Object.entries(allHeaders).map(([k,v])=>[k,['authorization','apikey','cookie'].includes(k)?{redacted:true,bytes:Buffer.byteLength(v),sha256:sha(Buffer.from(v))}:v]));
     if((read||completion)&&method==='OPTIONS'){item.outcome=read?'fixture-cors':'completion-cors';await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':read?'GET,OPTIONS':'POST,OPTIONS','access-control-allow-headers':allHeaders['access-control-request-headers']||'*'}});item.finishedAt=Date.now();return;}
     if(read&&method==='GET'){
      check(new Set([...u.searchParams.keys()]).size===[...u.searchParams.keys()].length,id+' no duplicate game query parameter');
      equal(Object.fromEntries(u.searchParams),expectedQuery,id+' actual published-client query encoding');
      equal([allHeaders.range??null,allHeaders['range-unit']??null],[null,null],id+' URL range contract without Range headers');
      equal(allHeaders['accept-profile'],'public',id+' actual public schema header');
      item.response=fixture;await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fixture)});item.outcome='fixture-fulfilled';item.finishedAt=Date.now();return;
     }
     if(completion&&method==='POST'){
      const payload=JSON.parse(item.body||'null');check(payload&&Object.keys(payload).sort().join(',')==='game,player_name,score',id+' exact actual completion body fields');
      check(payload.game==='connections'&&payload.score===(scenario==='A'?1000:0)&&typeof payload.player_name==='string'&&payload.player_name.length>0,id+' actual Daily-only earned completion payload');
      item.payload=payload;await route.abort();item.outcome='completion-aborted';item.finishedAt=Date.now();return;
     }
     check(!read,id+' unexpected game method');await route.abort();item.outcome='aborted';item.finishedAt=Date.now();
    }catch(error){
     if(row.closingAt&&!read&&!completion){item.outcome='context-closed-aborted';item.finishedAt=Date.now();return;}
     item.outcome='route-error';item.error=String(error.stack||error);row.routeErrors.push(item.error);await route.abort().catch(()=>{});item.finishedAt=Date.now();
    }
   })();routeTasks.add(task);task.then(()=>routeTasks.delete(task),()=>routeTasks.delete(task));return task;
  });
  page=await context.newPage();cdp=await context.newCDPSession(page);await cdp.send('DOMStorage.enable');
  for(const type of['domStorageItemAdded','domStorageItemUpdated','domStorageItemRemoved','domStorageItemsCleared'])cdp.on('DOMStorage.'+type,event=>{if(event.storageId.isLocalStorage)row.storageEvents.push({at:Date.now(),type,...event});});
  page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
  page.on('framenavigated',f=>{if(f===page.mainFrame())row.navigations.push({at:Date.now(),url:f.url()});});
  page.on('requestfailed',request=>{if(request.url().startsWith(BASE+'/'))row.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
  await page.exposeBinding('__connectionsNativeEvent',(_,event)=>row.events.push(event));
  await page.goto(BASE+ROUTE,{waitUntil:'domcontentloaded'});await page.getByRole('dialog',{name:'How to Play',exact:true}).waitFor({state:'visible'});
  await page.evaluate(()=>{
   for(const type of['pointerdown','pointerup','click','keydown','wheel','scroll'])addEventListener(type,event=>{
    const target=event.target?.closest?.('button')??event.target,dialog=event.target?.closest?.('[role=dialog]');
    window.__connectionsNativeEvent({at:Date.now(),type,trusted:event.isTrusted,pointerType:event.pointerType??null,key:event.key??null,deltaX:event.deltaX??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null,targetTag:target?.tagName??null,targetText:target?.textContent?.trim()??null,targetLabel:target?.getAttribute?.('aria-label')??null,inDialog:!!dialog,dialogOwner:dialog?.getAttribute('aria-labelledby')??null});
   },true);
  });
  await escapeHelp('startup-initial-help-escape');
  const cookie=page.getByRole('region',{name:'Cookie choices',exact:true});await cookie.waitFor({state:'visible'});
  await mouseAction('startup-reject-all',cookie.getByRole('button',{name:'Reject all',exact:true}),'startup',async()=>!(await state()).cookieChoices);
  equal(await storedConsent(page),'rejected',id+' real optional consent rejection');
  await mouseAction('startup-help-reopen',button('\u{1F4C5} Daily').locator('xpath=ancestor::header').getByRole('button',{name:'How to play',exact:true}),'startup',async()=>(await state()).dialog.open);
  await escapeHelp('startup-reopened-help-escape');
  await wait(async()=>{const s=await state();return s.phase==='playing'&&s.mode==='daily'&&s.remaining.length===16&&!s.dialog.open;},id+' actual fetched fresh public game');
  const baseline=await checkpoint('baseline');row.baseline=baseline.ref;
  check(!Object.keys(baseline.value.storage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')),id+' fresh signed-out context');
  equal([baseline.value.streak,baseline.value.lives,baseline.value.solved.length],[0,4,0],id+' fresh real baseline');


  if(scenario==='A'){
   await mode('unlimited','A-open-unlimited');
   const first=await solve('A-unlimited-first');requireStreak(first.value,1,'genuine Unlimited win');
   equal(completionPosts().length,0,id+' Unlimited win has no Daily completion');
   row.settlements.push({name:'A-unlimited-first',mode:'unlimited',outcome:'won',expectedStreak:1,frame:first.ref});
   for(let i=0;i<2;i++){
    const other=await mode('daily','A-old-unlimited-loop-'+i+'-daily');equal(other.after.value.phase,'playing',id+' unfinished Daily arms only Daily');
    const back=await mode('unlimited','A-old-unlimited-loop-'+i+'-return');viewHeld(first.value,back.after.value,'old Unlimited win view '+i);
   }
   await checkpoint('A-old-unlimited-held');await photo('old-unlimited-won-earned1');
   await mode('daily','A-open-daily-for-genuine-win');
   await solve('A-daily-real');await awaitRequests(1000);
   const daily=await checkpoint('A-daily-earned-settled');requireStreak(daily.value,2,'genuine Daily win after Unlimited');
   row.settlements.push({name:'A-daily-real',mode:'daily',outcome:'won',expectedStreak:2,frame:daily.ref});
   await mode('unlimited','A-open-old-unlimited-for-retry');
   const retry=await mouseAction('A-public-retry',button('Retry'),'business',async()=>{const s=await state();return s.phase==='playing'&&s.remaining.length===16&&s.solved.length===0;});
   requireStreak(retry.after.value,2,'new Unlimited retry');
   for(let i=0;i<2;i++){
    const back=await mode('daily','A-old-daily-loop-'+i+'-return');viewHeld(daily.value,back.after.value,'old Daily win view '+i);
    if(i===1){await checkpoint('A-old-daily-held');await photo('old-daily-won-earned2');}
    const playing=await mode('unlimited','A-old-daily-loop-'+i+'-playing');equal(playing.after.value.phase,'playing',id+' new Unlimited still playing');requireStreak(playing.after.value,2,'retained new Unlimited');
   }
   await giveUp('A-genuine-new-unlimited-loss',0);await checkpoint('A-final-new-loss');
   equal(completionPosts().length,1,id+' exactly one genuine Daily completion');
  }else{
   await giveUp('B-daily-real-loss',0);await awaitRequests(0);
   const oldLoss=await checkpoint('B-daily-lost-settled');
   check(oldLoss.value.dailySave?.guesses.at(-1)?.t==='give',id+' actual Daily give-up log');
   await mode('unlimited','B-open-unlimited');
   await solve('B-unlimited-real');
   const earned=await checkpoint('B-unlimited-earned');requireStreak(earned.value,1,'genuine Unlimited win after Daily loss');
   row.settlements.push({name:'B-unlimited-real',mode:'unlimited',outcome:'won',expectedStreak:1,frame:earned.ref});
   const retry=await mouseAction('B-public-retry',button('Retry'),'business',async()=>{const s=await state();return s.phase==='playing'&&s.remaining.length===16&&s.solved.length===0;});
   requireStreak(retry.after.value,1,'new Unlimited retry before old Daily loss');
   for(let i=0;i<2;i++){
    const back=await mode('daily','B-old-daily-loss-loop-'+i+'-return');
    requireStreak(back.after.value,1,'old Daily loss view '+i);equal(back.after.value.storage,earned.value.storage,id+' old Daily loss holds every earned saved byte');equal(back.after.value.dailySave,oldLoss.value.dailySave,id+' old Daily loss action log held');equal([back.after.value.phase,back.after.value.resultHeading],['lost','Game Over'],id+' retained Daily loss is a view');
    if(i===1){await checkpoint('B-old-daily-loss-held');await photo('old-daily-lost-earned1');}
    const playing=await mode('unlimited','B-old-daily-loss-loop-'+i+'-playing');equal(playing.after.value.phase,'playing',id+' fresh Unlimited remains playing');requireStreak(playing.after.value,1,'earned streak survives old loss');
   }
   await checkpoint('B-final-playing');equal(completionPosts().length,1,id+' only genuine Daily loss attempted completion');
  }
  await wait(()=>routeTasks.size===0&&row.requests.every(r=>r.outcome!=='pending'),id+' all intercepted request promises completed');
  const final=await checkpoint('final');row.final=final.ref;
  const actions=row.actions.map(readRef),business=actions.filter(a=>a.kind==='business'),startup=actions.filter(a=>a.kind==='startup');
  equal([business.length,startup.filter(a=>a.method==='mouse').length,startup.filter(a=>a.method==='keyboard').length],[scenario==='A'?54:28,2,2],id+' exact source-derived action census');
  equal(row.settlements.length,scenario==='A'?3:2,id+' genuine terminal result census');
  equal([row.screenshots.length,row.observedClose.length],[scenario==='A'?2:1,2],id+' useful phase screenshots and inherited Close observations');
  equal(completionPosts().length,1,id+' one actual bounded Daily completion attempt');
  const reads=row.requests.filter(r=>r.outcome==='fixture-fulfilled');
  check(reads.length>=1&&reads.every(r=>Number.isFinite(r.finishedAt)&&r.finishedAt<=baseline.value.at),id+' all actual pool mount reads finish before baseline, none on views/retry');
  check(row.navigations.length>=1&&row.navigations.every((n,i)=>n.url===BASE+ROUTE&&Number.isFinite(n.at)&&n.at<=readRef(row.frames[0]).at&&(!i||n.at>=row.navigations[i-1].at)),id+' actual startup navigation chronology without guessed count');
  const frames=row.frames.map(readRef);check(frames.every(f=>f.timeOrigin===frames[0].timeOrigin&&f.url===BASE+ROUTE),id+' same native document throughout public scenario');
  check(!row.errors.length&&!row.assetErrors.length&&!row.routeErrors.length,id+' no App/local asset/route error');
  check(row.requests.every(r=>['fixture-cors','fixture-fulfilled','completion-cors','completion-aborted','aborted'].includes(r.outcome)&&Number.isFinite(r.finishedAt)),id+' all foreign transport resolved without forwarding');
  row.census={businessClicks:business.length,startupMouseClicks:2,startupEscapeKeys:2,terminalResults:row.settlements.length,completionPosts:1,frames:row.frames.length,actions:row.actions.length,layouts:row.layouts.length,wheels:row.wheels.length,navigations:row.navigations.length,fixtureReads:reads.length,screenshots:row.screenshots.length};
  row.status='passed';
 }catch(error){
  row.status='failed';row.error=String(error.stack||error);
  if(page&&!page.isClosed())await frame('failure').catch(()=>{});
  throw error;
 }finally{
  row.closingAt=Date.now();await context.close().catch(error=>row.closeError=String(error));
  await Promise.allSettled([...routeTasks]);
  if(row.status==='passed'&&(row.closeError||row.errors.length||row.assetErrors.length||row.routeErrors.length||row.requests.some(r=>r.outcome==='pending'||r.outcome==='route-error'))){row.status='failed';row.error='Intercepted request was not resolved at context completion';}
  put('report',report);
 }
 check(row.status==='passed',id+' completed context passes after request closure');
 return row;
}
try{
 const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
 const BASE='http://127.0.0.1:'+port;report.base=BASE;
 host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local host startup timeout')),15000);host.stdout.on('data',b=>{if(String(b).includes('host-like server:')){clearTimeout(timer);resolve();}});host.once('error',reject);host.once('exit',code=>{clearTimeout(timer);reject(Error('Local host exited '+code));});});
 browser=await pw.chromium.launch({headless:true});report.browserVersion=browser.version();report.nodeVersion=process.versions.node;
 for(const[width,height]of WIDTHS)report.journeys.push({width,height,status:'running',contexts:[]});
 const journeyOutcomes=await Promise.allSettled(report.journeys.map(async journey=>{try{await runContext(BASE,journey.width,journey.height,'A');await runContext(BASE,journey.width,journey.height,'B');journey.status='passed';}catch(error){journey.status='failed';journey.error=String(error.stack||error);throw error;}}));
 const rejectedJourney=journeyOutcomes.find(result=>result.status==='rejected');if(rejectedJourney)throw rejectedJourney.reason;
 const contexts=report.journeys.flatMap(j=>j.contexts);
 const sum=field=>contexts.reduce((n,c)=>n+c.census[field],0);
 equal([report.journeys.length,contexts.length,sum('businessClicks'),sum('startupMouseClicks'),sum('startupEscapeKeys'),sum('terminalResults'),sum('completionPosts'),sum('screenshots')],[3,6,246,12,12,15,6,9],'Complete source-derived native scope');
 report.census={journeys:3,contexts:6,businessClicks:246,startupMouseClicks:12,startupEscapeKeys:12,terminalResults:15,completionPosts:6,screenshots:9,frames:sum('frames'),actions:sum('actions'),layouts:sum('layouts'),wheels:sum('wheels'),navigations:sum('navigations'),fixtureReads:sum('fixtureReads')};
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();
 report.sourceAfter=tracked();report.distAfter=inventory('dist');report.locksAfter=['package.json','package-lock.json'].map(sourceReceipt);report.installedAfter=versions();report.offlineAfter=offline();
 report.indexAfter=textFile('index-after.txt',execFileSync('git',['ls-files','-s'],{cwd:ROOT}));
 report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);report.locksHeld=JSON.stringify(report.locksBefore)===JSON.stringify(report.locksAfter);report.installedHeld=JSON.stringify(report.installedBefore)===JSON.stringify(report.installedAfter);report.offlineHeld=JSON.stringify(report.offlineBefore)===JSON.stringify(report.offlineAfter);report.indexHeld=fs.readFileSync(path.join(OUT,'index-before.txt')).equals(fs.readFileSync(path.join(OUT,'index-after.txt')));
 if(![report.sourceHeld,report.distHeld,report.locksHeld,report.installedHeld,report.offlineHeld,report.indexHeld].every(Boolean)){report.status='failed';report.holdError='Source/dist/locks/521/offline/index changed';}
 const raw={version:1,route:ROUTE,hook:HOOK,limits:report.limits,contexts:report.journeys.flatMap(j=>j.contexts).map(c=>({id:c.id,scenario:c.scenario,width:c.width,height:c.height,status:c.status,events:c.events,storageEvents:c.storageEvents,navigations:c.navigations,requests:c.requests,firstPartyReads:c.firstPartyReads,webSockets:c.webSockets,frames:c.frames.map(readRef),actions:c.actions.map(readRef),preparations:c.preparations.map(readRef),layouts:c.layouts.map(readRef),wheels:c.wheels.map(readRef),observedClose:c.observedClose.map(readRef),settlements:c.settlements,checkpoints:c.checkpoints,census:c.census??null,errors:c.errors,assetErrors:c.assetErrors,routeErrors:c.routeErrors}))};
 report.raw=put('raw',raw);put('report',report);
 const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
 const bodies=walk(OUT).filter(file=>file!=='body-manifest.json').map(fileRef);put('body-manifest',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((n,r)=>n+r.bytes,0),limits:'Every evidence body except this nonrecursive manifest. Native admission JSON is stdout outside this evidence directory.'});
 assert.equal(report.status,'passed','Native scope and physical holds must actually pass');
}

