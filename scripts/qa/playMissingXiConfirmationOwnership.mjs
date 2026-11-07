// Remote native Missing XI confirmation proof. Only bounded empty search reads are fulfilled.
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
const QUALIFIED_SOURCE_HEAD='6bba111e659e3898e6f165fe438994e2adcfce6b',QUALIFIED_SOURCE_TREE='04ddf69f473a7fea24c0cbd75cc83910720505b5';
const PAGE='4692624a6ce6435b881ce4671df6169696a75858',UNIT_RAW_BYTES='2078763',UNIT_RAW_SHA='2f6abf3c61339dd4c972dc3af6a6ede99a6855a185ede72241835cefcce5bb34';
for(const value of[QUALIFIED_SOURCE_HEAD,QUALIFIED_SOURCE_TREE,PAGE])assert(/^[0-9a-f]{40}$/.test(value),'Bound reviewed source identity');
assert(/^[1-9][0-9]*$/.test(UNIT_RAW_BYTES)&&/^[0-9a-f]{64}$/.test(UNIT_RAW_SHA),'Bound actual qualified unit RAW');
assert.equal(process.env.MISSING_XI_CONFIRMATION_PAGE_BLOB,PAGE,'Reviewed fixed Page');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT=path.resolve(ROOT, process.env.MISSING_XI_CONFIRMATION_BROWSER_OUT||'missing-xi-confirmation-browser');
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
const ROUTE='/missing-xi',HELPER='scripts/qa/playMissingXiConfirmationOwnership.mjs';
const WIDTHS=[[320,568],[390,844],[1280,900]];
const pins={
 "src/pages/MissingXi.tsx": PAGE,
 "src/lib/missingXi.ts": "41d645db94fee5dd2fe22d19c353c9b8d2ca739a",
 "src/hooks/useDailyPuzzle.ts": "b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846",
 "src/hooks/useGameCompletion.ts": "b104822551fd5d9b1c5d6ddb14f01c79e5a662b2",
 "src/lib/completions.ts": "61daf9b6c528f884551cd1d42f71357681c8728a",
 "src/components/game/GiveUpButton.tsx": "2462260a7b5f1d5d3b70915df2428d5d4397b0a0",
 "src/components/FlagImg.tsx": "f415a12892f747ecf07414e61710584ca98be6a8",
 "src/components/game/PlayerAutocomplete.tsx": "a0bd500b63306c75e0dea251cb6fb67ea2ed9452",
 "src/lib/playerSearch.ts": "0d19f2c23735eb30512dc7fc3a447eacef5e128f",
 "src/lib/nameFold.ts": "abb3e270fa1c87e78aa3871598c06571ff44a069",
 "src/components/game/RulesGate.tsx": "ad59d4218dbd3790cad1ae7dac52fd27f459f15d",
 "src/components/game/ResultScreen.tsx": "dd6a06380851ab68d3b85c3a567d77c99e88b386",
 "src/components/ui/dialog.tsx": "401b3b2aa4c9404d98d9f05bc3f88ce5eb6b19cd",
 "src/components/CookieConsent.tsx": "7ffba7ff4099c051d949cd20fe31bc75332f215b",
 "src/App.tsx": "8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33",
 "src/data/gameRegistry.ts": "f560b40a74d1468ac72dfde4ee6fec6635a9a255",
 "public/missing-xi/index.html": "e7fe5d02933d73db401c4badb130eb2bb76ed0c3",
 "src/index.css": "775df500bd7c9730e5b04aedd3d6b2a1564d49b4",
 "scripts/lib/answerConsent.mjs": "c6d16997e4c06e8b35dcfd0bab5efcad3069d899",
 "package.json": "2ff64986fb76ebc51b706f2fd24765768874008a",
 "package-lock.json": "97d6f12a052f25f400462938c241789a083f0bfe"
};
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(path.join(ROOT,file))),want,file+' physical reviewed pin');
const saved=fs.readFileSync(path.join(ROOT,'public/missing-xi/index.html'));
assert.equal(saved.length,21382);
const savedDom=new JSDOM(saved.toString('utf8')),savedDoc=savedDom.window.document;
assert.equal(savedDoc.querySelector('link[rel=canonical]')?.getAttribute('href'),'https://douknowball.com'+ROUTE);
assert.equal(savedDoc.querySelectorAll('#dukb-snapshot').length,1);
assert(savedDoc.querySelector('#dukb-snapshot').textContent.trim().length>500);
assert([...savedDoc.querySelectorAll('#dukb-snapshot h1')].some(n=>n.textContent.trim()==='MISSING XI'));
assert(![...savedDoc.querySelectorAll('meta')].some(n=>/^dukb-retired-/i.test(n.getAttribute('name')||'')||(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'||(['robots','googlebot','bingbot'].includes((n.getAttribute('name')||'').toLowerCase())&&/(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(n.getAttribute('content')||''))));
savedDom.window.close();

const qualifiedDirectory=path.resolve(ROOT,process.env.MISSING_XI_CONFIRMATION_FIXED_REFERENCE||'');
const freshRawPath=path.resolve(ROOT,process.env.MISSING_XI_CONFIRMATION_UNIT_RAW||'');
assert(process.env.MISSING_XI_CONFIRMATION_FIXED_REFERENCE&&process.env.MISSING_XI_CONFIRMATION_UNIT_RAW);
assert.equal(fs.readFileSync(path.join(qualifiedDirectory,'head.txt'),'utf8').trim(),QUALIFIED_SOURCE_HEAD);
assert.equal(fs.readFileSync(path.join(qualifiedDirectory,'tree.txt'),'utf8').trim(),QUALIFIED_SOURCE_TREE);
const referenceRaw=fs.readFileSync(path.join(qualifiedDirectory,'raw.json')),freshRaw=fs.readFileSync(freshRawPath);
for(const bytes of[referenceRaw,freshRaw]){assert.equal(bytes.length,Number(UNIT_RAW_BYTES));assert.equal(sha(bytes),UNIT_RAW_SHA);}
assert(referenceRaw.equals(freshRaw),'Fresh full unit RAW exactly equals admitted fixed RAW');
const currentHead=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const currentTree=execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:ROOT,encoding:'utf8'}).trim();
textFile('head.txt',currentHead+'\n');textFile('tree.txt',currentTree+'\n');
const qualifiedInput=put('qualified-input-binding',{qualifiedSourceHead:QUALIFIED_SOURCE_HEAD,qualifiedSourceTree:QUALIFIED_SOURCE_TREE,page:PAGE,unitRAWBytes:Number(UNIT_RAW_BYTES),unitRAWSHA256:UNIT_RAW_SHA,freshUnitRAWByteEqual:true,currentHead,currentTree,scope:'Input-binding metadata and literal RAW comparison only. Authenticated artifact custody and product source join are qualified by the enclosing full workflow; different source/workflow heads are not equated.'});
const indexBefore=textFile('index-before.txt',execFileSync('git',['ls-files','-s'],{cwd:ROOT}));
const report={version:1,status:'running',route:ROUTE,page:PAGE,helper:blob(fs.readFileSync(path.join(ROOT,HELPER))),pins,qualifiedInput,
 sourceBefore:tracked(),distBefore:inventory('dist'),locksBefore:['package.json','package-lock.json'].map(sourceReceipt),installedBefore:versions(),offlineBefore:offline(),indexBefore,
 activeEntry:{snapshot:sourceReceipt('public/missing-xi/index.html'),canonical:'https://douknowball.com'+ROUTE,limits:'Actual public mount and controls on held curated source. No hidden candidate/puzzle import or native RNG/draw count.'},
 journeys:[],screenshots:[],checks:0,
 limits:['Native emulated viewport mouse/wheel/keyboard on actual Page/lib/shared UI. No App/DOM/storage/Date/RNG/pool overrides or physical-touch claim.',
 'Shown teammate identity comes only from an actual nonblank public Starting lineup row second span. Full row/HTML retained. Hidden answer is not derived before reveal.',
 'All operated targets require whole viewport/chrome/ancestor clipping, center hit and enabled state. Close geometry is observed only; owned Escape dismisses help. No inherited44px or whole-page-fit credit.',
 'Only bounded actual empty autocomplete reads are fulfilled. Actual daily completion POST is recorded then aborted, never forwarded. Known foreign assets/telemetry are explicitly refused; unknown application traffic fails closed.',
 'Daily logs are actual persisted bytes. No fabricated private Unlimited action log, native generator call count, provider truth, terminal restore, multi-tab, pool-race, full-suite or release claim.']};
assert.equal(report.distBefore.length,850);
const check=(ok,why)=>{report.checks++;assert(ok,why);};
const equal=(a,z,why)=>{report.checks++;assert.deepEqual(a,z,why);};
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
const fold=text=>{const chars={'ø':'o','Ø':'o','đ':'d','Đ':'d','ð':'d','Ð':'d','ł':'l','Ł':'l','æ':'ae','Æ':'ae','œ':'oe','Œ':'oe','ß':'ss','þ':'th','Þ':'th','ħ':'h','Ħ':'h','ı':'i','İ':'i','ŋ':'n','Ŋ':'n'};return text.replace(/\p{Cf}/gu,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[øØđĐðÐłŁæÆœŒßþÞħĦıİŋŊ]/g,ch=>chars[ch]).toLowerCase().trim().replace(/\s+/g,' ');};
let browser,host;
async function runContext(BASE,width,height,scenario){
 const id=width+'-'+scenario,row={id,scenario,width,height,status:'running',navigations:[],events:[],storageEvents:[],requests:[],webSockets:[],errors:[],assetErrors:[],routeErrors:[],frames:[],actions:[],preparations:[],layouts:[],wheels:[],typings:[],screenshots:[],observedClose:[],settlements:[],checkpoints:{},firstPartyReads:[]};
 report.journeys.find(j=>j.width===width).contexts.push(row);
 const context=await browser.newContext({viewport:{width,height},isMobile:width<1000,hasTouch:width<1000,serviceWorkers:'block'});
 let page,cdp;
 const button=name=>page.getByRole('button',{name,exact:true});
 const completionPosts=()=>row.requests.filter(r=>r.path==='/rest/v1/game_completions'&&r.method==='POST');
 const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let previous='',same=0;const end=performance.now()+8000;do{await new Promise(requestAnimationFrame);const value=JSON.stringify([...document.querySelectorAll('main button,main input,[role=dialog],[role=region][aria-label="Cookie choices"] button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));same=value===previous?same+1:1;previous=value;if(same>=4)return;}while(performance.now()<end);throw Error('Actual control geometry did not settle');});
 const state=()=>page.evaluate(()=>{
  const main=document.querySelector('main#dukb-main'),buttons=[...(main?.querySelectorAll('button')||[])],text=b=>b.textContent.trim(),byName=name=>buttons.find(b=>text(b)===name);
  const daily=byName('📅 Daily'),unlimited=byName('∞ Unlimited'),mode=daily?.classList.contains('bg-background')?'daily':unlimited?.classList.contains('bg-background')?'unlimited':null;
  const input=main?.querySelector('input[role=combobox]'),list=input?document.getElementById(input.getAttribute('aria-controls')):null;
  const view=main?.querySelector('[role=group][aria-label="Lineup view"]'),lineup=main?.querySelector('ol[aria-label="Starting lineup"]'),rows=lineup?[...lineup.querySelectorAll(':scope>li')].map(li=>({label:li.getAttribute('aria-label'),position:li.querySelector(':scope>span:first-child')?.textContent,name:li.querySelector(':scope>span:nth-child(2)')?.textContent,text:li.textContent,html:li.outerHTML})):[];
  const result=[...(main?.querySelectorAll('div[role=status]')||[])].find(el=>[...el.querySelectorAll('h2')].some(h=>['Missed it this time.','First guess! Perfect recall.','Nice work, you found him.'].includes(h.textContent.trim())))??null;
  const match=[...(main?.querySelectorAll('div')||[])].find(el=>el.classList.contains('bg-surface-1')&&el.classList.contains('rounded-2xl')&&el.classList.contains('p-5')&&el.classList.contains('text-center'))??null;
  const storage=Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session=Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])),dailyKeys=Object.keys(storage).filter(k=>/^missing-xi-daily-/.test(k));
  const dialog=document.querySelector('[role=dialog]'),active=document.activeElement;
  return{at:Date.now(),url:location.href,timeOrigin:performance.timeOrigin,visibility:document.visibilityState,viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,scroll:{x:scrollX,y:scrollY},
   mode,phase:result?'revealed':byName('Lock in guess')?'playing':'boot-or-loading',storage,sessionStorage:session,dailyKeys,dailySave:dailyKeys.length===1?JSON.parse(storage[dailyKeys[0]]):null,
   match:match?{text:match.textContent,html:match.outerHTML}:null,
   lineup:{view:view?.querySelector('button[aria-pressed=true]')?.textContent??null,rows,html:lineup?.outerHTML??null,viewHTML:view?.outerHTML??null},
   controls:Object.fromEntries(['📅 Daily','∞ Unlimited','Give up','Yes, reveal it','Keep playing','Lock in guess','Play Unlimited','New Lineup','Pitch','Lineup'].map(name=>{const b=byName(name);return[name,{present:!!b,disabled:b?b.disabled:null,html:b?.outerHTML??null}];})),
   draft:input?{value:input.value,disabled:input.disabled,expanded:input.getAttribute('aria-expanded'),listboxId:input.getAttribute('aria-controls'),html:input.outerHTML}:null,
   options:list?[...list.querySelectorAll('[role=option]')].map(el=>({name:el.textContent,text:el.textContent,selected:el.getAttribute('aria-selected'),html:el.outerHTML})):[],
   messages:[...(main?.querySelectorAll('p,span')||[])].map(el=>el.textContent).filter(t=>t?.startsWith('Already tried:')||t?.startsWith('Guess ')||t?.includes('You already tried that name.')||t?.startsWith('💡')),
   result:result?{heading:result.querySelector('h2')?.textContent,html:result.outerHTML,text:result.textContent,stats:[...result.querySelectorAll('.cm-rise')].map(el=>({label:el.querySelector('span:first-child')?.textContent,value:el.querySelector('span:nth-child(2)')?.textContent})),emojiGrid:result.querySelector('.whitespace-pre-wrap')?.textContent}:null,
   dialog:{open:!!dialog,labelledBy:dialog?.getAttribute('aria-labelledby')??null,title:dialog?.querySelector('h2')?.textContent??null,html:dialog?.outerHTML??null,ownsFocus:!!dialog&&!!active&&dialog.contains(active)},
   cookieChoices:!!document.querySelector('[role=region][aria-label="Cookie choices"]'),
   focus:{tag:active?.tagName??null,text:active?.textContent??null,label:active?.getAttribute('aria-label')??null,html:active?.outerHTML??null,insideMain:!!main&&!!active&&main.contains(active),insideDialog:!!dialog&&!!active&&dialog.contains(active)},html:main?.outerHTML??null,text:main?.textContent??null};
 });
 const frame=async name=>{await settle();const value=await state();check(value.url===BASE+ROUTE&&value.viewport.width===width&&value.viewport.height===height&&value.documentWidth<=width&&value.visibility==='visible',id+' actual active viewport');const ref=put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,value);row.frames.push(ref);return{ref,value};};
 const stableCore=(a,z,label)=>{for(const key of['url','timeOrigin','mode','phase','storage','sessionStorage','dailyKeys','dailySave','match','lineup','draft','controls','messages','result'])equal(a[key],z[key],id+' '+label+' '+key);};
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
   const verticalAncestors=g.ancestors.filter(c=>c.cy),viewTop=g.chrome.top,viewBottom=height-g.chrome.bottom;
   const clipTop=Math.max(viewTop,...verticalAncestors.map(c=>c.y)),clipBottom=Math.min(viewBottom,...verticalAncestors.map(c=>c.bottom));
   const viewportOnly=kind==='keyboard-option'&&g.rect.height>clipBottom-clipTop&&g.rect.height<=viewBottom-viewTop
    &&(g.rect.y<viewTop||g.rect.bottom>viewBottom)&&verticalAncestors.length>0
    &&verticalAncestors.every(c=>g.rect.y>=c.y&&g.rect.bottom<=c.bottom&&(2<c.x||2>=c.right));
   const top=viewportOnly?viewTop:clipTop,bottom=viewportOnly?viewBottom:clipBottom;
   check(g.rect.width>0&&g.rect.height>0&&g.rect.height<=bottom-top,id+' target can fit measured vertical remedy '+name+' '+JSON.stringify(g));
   check(g.rect.x>=0&&g.rect.right<=width&&g.ancestors.every(c=>!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right)),id+' actual horizontal target clip');
   const deltaY=g.rect.y<top?Math.floor(g.rect.y-top-8):g.rect.bottom>bottom?Math.ceil(g.rect.bottom-bottom+8):0;
   check(deltaY!==0,id+' center is blocked without a scroll remedy');
   const container=viewportOnly?null:g.ancestors.find(c=>c.scrollableY&&Math.min(c.bottom,viewBottom)>Math.max(c.y,viewTop));
   const visibleTop=container?Math.max(container.y,viewTop,0):viewTop,visibleBottom=container?Math.min(container.bottom,viewBottom):viewBottom;
   const point={x:viewportOnly?2:container?Math.max(2,Math.min(width-2,(Math.max(0,container.x)+Math.min(width,container.right))/2)):width/2,y:(visibleTop+visibleBottom)/2};
   const wheelBefore=await frame(name+'-wheel-'+attempt+'-before'),eventStart=row.events.length;
   await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,deltaY);
   await wait(async()=>{const next=await geometry(target);return Math.abs(next.rect.y-g.rect.y)>0.5||JSON.stringify(next.ancestors.map(c=>c.scrollTop))!==JSON.stringify(g.ancestors.map(c=>c.scrollTop))||(await state()).scroll.y!==wheelBefore.value.scroll.y;},id+' actual native wheel changes scroll geometry');
   const wheelAfter=await frame(name+'-wheel-'+attempt+'-after'),events=row.events.slice(eventStart);
   if(viewportOnly)check(wheelAfter.value.scroll.y!==wheelBefore.value.scroll.y,id+' measured viewport-only option remedy moved the document');
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
  check(clicks.length===1&&clicks[0].trusted&&clicks[0].targetTag===measured.tag&&clicks[0].targetText===measured.text,id+' actual single trusted mouse click '+name);
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind,method:'mouse',targetText:measured.text,layout:layoutRef,before:before.ref,after:after.ref,events});
  row.actions.push(ref);return{ref,before,after};
 };
 const escapeHelp=async name=>{
  const dialog=page.getByRole('dialog',{name:'How to Play Missing XI',exact:true});await dialog.waitFor({state:'visible'});await settle();
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

 const checkpoint=async name=>{const f=await frame(name);row.checkpoints[name]=f.ref;return f;};
 const photo=async(name,target)=>{
  await prepare(target,name+'-photo','display');const before=await frame(name+'-photo-before');
  const focus=await page.evaluateHandle(()=>document.activeElement),file=id+'-'+name+'.png';
  await page.screenshot({path:path.join(OUT,file),fullPage:false,caret:'initial'});const after=await frame(name+'-photo-after');
  stableCore(before.value,after.value,'photo holds game');equal(before.value.scroll,after.value.scroll,id+' photo scroll held');
  const sameFocus=await page.evaluate(el=>document.activeElement===el,focus);await focus.dispose();check(sameFocus,id+' photo actual focus identity held');
  const ref={...fileRef(file),name,context:id,scenario,viewport:{width,height},before:before.ref,after:after.ref,focusIdentityHeld:sameFocus};row.screenshots.push(ref);report.screenshots.push(ref);
 };
 const input=()=>page.getByRole('combobox');
 const ownedKey=async(name,key,done,extra={})=>{
  const prepared=await prepare(input(),name+'-input','keyboard');
  const before=await frame(name+'-before');check(before.value.focus.tag==='INPUT'&&before.value.focus.insideMain,id+' actual combobox owns key '+name);
  const eventStart=row.events.length;await page.keyboard.press(key);if(done)await wait(done,id+' actual key outcome '+name);
  const after=await frame(name+'-after'),events=row.events.slice(eventStart),expected=key==='Control+A'?'a':key;
  check(events.some(e=>e.type==='keydown'&&e.trusted&&e.key===expected&&e.targetTag==='INPUT'&&e.targetRole==='combobox'),id+' trusted owned key '+name);
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind:'business',method:'keyboard',key,inputOwner:before.value.draft?.listboxId,layout:prepared.layoutRef,before:before.ref,after:after.ref,events,...extra});row.actions.push(ref);return{ref,before,after};
 };
 const typedSearchNames=new Set();
 const selectShownName=async(prefix,shown)=>{
  check(shown&&!shown.label&&shown.name&&shown.name!=='Missing player'&&shown.position,id+' actual shown nonblank teammate row');
  const requested=shown.name.trim();
  await mouseAction(prefix+'-focus',input(),'business',async()=>{const s=await state();return s.focus.tag==='INPUT'&&s.focus.insideMain;});
  const existing=(await state()).draft.value;
  equal(existing,'',id+' deliberate visible-name pick starts with empty current draft');
  const prepared=await prepare(input(),prefix+'-typing','typing'),before=await frame(prefix+'-type-before'),eventStart=row.events.length;
  const focus=await page.evaluateHandle(()=>document.activeElement);
  await page.keyboard.type(requested);await wait(async()=>{const s=await state();return s.draft?.value===requested&&s.options.some(o=>fold(o.name)===fold(requested));},id+' actual local roster option appears');
  const after=await frame(prefix+'-type-after'),events=row.events.slice(eventStart),focusIdentityHeld=await page.evaluate(el=>document.activeElement===el,focus);await focus.dispose();
  check(focusIdentityHeld&&events.some(e=>e.type==='input'&&e.trusted&&e.targetTag==='INPUT'),id+' actual trusted typing and focus held');
  const typing=put(id+'/typings/'+String(row.typings.length).padStart(3,'0')+'-'+prefix,{name:prefix,requested,shownRow:shown,layout:prepared.layoutRef,before:before.ref,after:after.ref,events,focusIdentityHeld});row.typings.push(typing);
  row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+prefix+'-typing',{name:prefix+'-typing',kind:'business',method:'typing',requested,typing,before:before.ref,after:after.ref,events}));
  for(let attempt=0;attempt<64;attempt++){
   const s=await state(),marked=s.options.filter(o=>o.selected==='true');
   if(marked.length===1&&fold(marked[0].name)===fold(requested))break;
   check(attempt<63&&s.options.some(o=>fold(o.name)===fold(requested)),id+' bounded real highlight path');
   await ownedKey(prefix+'-arrow-'+attempt,'ArrowDown');
  }
  const highlighted=(await state()).options.filter(o=>o.selected==='true');check(highlighted.length===1&&fold(highlighted[0].name)===fold(requested),id+' actual intended option highlighted');
  const selectedName=highlighted[0].name.trim(),option=page.getByRole('option',{name:selectedName,exact:true});
  const optionPrepared=await prepare(option,prefix+'-highlighted-option','keyboard-option');
  const inputGeometry=await geometry(input());check(qualifies(inputGeometry),id+' input and highlighted option both fully available');
  const result=await ownedKey(prefix+'-enter','Enter',async()=>{const s=await state();return s.draft.value===selectedName&&!s.controls['Lock in guess'].disabled&&s.options.length===0;},{selectedName,requested,shownRow:shown,highlightedOption:highlighted[0],optionLayout:optionPrepared.layoutRef});
  return{selectedName,requested,typing,result};
 };
 const shownTeammate=async()=>{
  await mouseAction('show-public-lineup',button('Lineup'),'business',async()=>(await state()).lineup.view==='Lineup');
  const s=await state();check(s.lineup.rows.length===11,id+' eleven actual public starting lineup rows');
  check(s.lineup.rows.filter(r=>r.label?.startsWith('Missing player (')).length===1,id+' one public blank slot');
  const row=s.lineup.rows.find(r=>!r.label&&r.name&&r.name.trim()!=='Missing player');check(row,id+' actual displayed teammate');
  return row;
 };
 const actualMiss=async(prefix)=>{
  const shown=await shownTeammate(),pick=await selectShownName(prefix,shown);
  const action=await mouseAction(prefix+'-lock',button('Lock in guess'),'business',async()=>{const s=await state();return s.phase==='playing'&&s.messages.some(t=>t==='Already tried: '+pick.selectedName)&&s.draft.value==='';});
  const s=action.after.value;equal(s.dailySave?.guesses,[{t:'miss',name:pick.selectedName}],id+' actual one legitimate saved miss');equal(s.dailySave?.gameStatus,'playing',id+' legitimate unfinished Daily');
  check(s.messages.some(t=>t==='Guess 2 of 3')&&s.messages.some(t=>t.startsWith('💡')),id+' next guess and real hint');
  return{shown,pick,frame:action.after};
 };
 const mode=async(value,name)=>mouseAction(name,button(value==='daily'?'📅 Daily':'∞ Unlimited'),'business',async()=>{const s=await state();return s.mode===value&&!s.dialog.open;});
 const noOldConfirmation=s=>{check(s.phase==='playing'&&s.controls['Give up'].present&&!s.controls['Yes, reveal it'].present&&!s.controls['Keep playing'].present,id+' old round confirmation gone');};
 const progress=(a,z,label)=>{
  for(const key of['mode','phase','storage','sessionStorage','dailySave','dailyKeys','match','lineup','messages'])equal(a[key],z[key],id+' '+label+' '+key);
  equal([a.draft?.value,a.draft?.disabled,a.controls['Lock in guess'].present,a.controls['Lock in guess'].disabled],[z.draft?.value,z.draft?.disabled,z.controls['Lock in guess'].present,z.controls['Lock in guess'].disabled],id+' '+label+' current draft and actual pick readiness');
 };
 const resultCard=()=>page.locator('main#dukb-main div[role=status]').filter({has:page.getByRole('heading',{name:'Missed it this time.',exact:true})});
 const scoreZero=s=>{check(s.phase==='revealed'&&s.result?.heading==='Missed it this time.',id+' actual loss result');equal(s.result.stats,[{label:'Score',value:'0'}],id+' actual score0');};
 const waitPosts=async()=>{await wait(()=>completionPosts().length===1&&completionPosts().every(r=>r.outcome==='completion-aborted'&&Number.isFinite(r.finishedAt)),id+' completed actual Daily POST abort');};
 const routeTasks=new Set();

 try{
  await context.routeWebSocket('**/*',socket=>{row.webSockets.push({at:Date.now(),outcome:'refused-closed'});socket.close();});
  await context.route('**/*',route=>{
   const task=(async()=>{
    const request=route.request(),u=new URL(request.url()),method=request.method();
    if(u.origin===BASE&&['GET','HEAD'].includes(method)){row.firstPartyReads.push({at:Date.now(),url:u.href,method,outcome:'continued-local-read'});await route.continue();return;}
    const item={at:Date.now(),url:u.href,path:u.pathname,method,query:[...u.searchParams],headers:null,body:request.postData(),outcome:'pending'};row.requests.push(item);
    const supabase=u.hostname==='flawuiqbvjobmkfkauhw.supabase.co',search=supabase&&u.pathname==='/rest/v1/player_market_values',completion=supabase&&u.pathname==='/rest/v1/game_completions';
    try{
     const headers=await request.allHeaders();item.headers=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,['authorization','apikey','cookie'].includes(k)?{redacted:true,bytes:Buffer.byteLength(v),sha256:sha(Buffer.from(v))}:v]));
     if((search||completion)&&method==='OPTIONS'){item.outcome=search?'search-cors':'completion-cors';await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':search?'GET,OPTIONS':'POST,OPTIONS','access-control-allow-headers':headers['access-control-request-headers']||'*'}});item.finishedAt=Date.now();return;}
     if(search&&method==='GET'){
      check(new Set([...u.searchParams.keys()]).size===[...u.searchParams.keys()].length,id+' unique search query keys');
      const q=Object.fromEntries(u.searchParams),direct=Object.hasOwn(q,'name_folded');
      equal(Object.keys(q).sort(),direct?['limit','name_folded','order','select']:['limit','order','select'],id+' exact search keys');
      equal(q.select,'player_name,market_value_usd,year,club,nationality,position,age,person_key',id+' actual published-client projection');
      equal(q.order,'market_value_usd.desc,year.desc,player_name.asc',id+' actual order');equal(q.limit,direct?'200':'1000',id+' actual leg limit');
      equal([headers.range??null,headers['range-unit']??null,headers['accept-profile']],[null,null,'public'],id+' actual public read header contract');
      if(direct)check([...typedSearchNames].some(name=>name.length>=2&&q.name_folded==='ilike.%'+name+'%'),id+' exact passively observed public input query');
      else check([...typedSearchNames].some(name=>name.length>=2&&name.length<=24),id+' actual eligible prominence leg');
      item.response=[];await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'[]'});item.outcome='empty-search-fulfilled';item.finishedAt=Date.now();return;
     }
     if(completion&&method==='POST'){
      const payload=JSON.parse(item.body||'null');check(payload&&Object.keys(payload).sort().join(',')==='game,player_name,score',id+' exact completion body fields');
      check(scenario==='B'&&payload.game==='missing-xi'&&payload.score===0&&typeof payload.player_name==='string'&&payload.player_name.length>0,id+' only intentional Daily loss completion');
      equal([...u.searchParams],[],id+' no completion POST query');item.payload=payload;await route.abort();item.outcome='completion-aborted';item.finishedAt=Date.now();return;
     }
     const read=method==='GET'&&!request.postData();
     const fonts=read&&((u.hostname==='fonts.googleapis.com'&&u.pathname==='/css2')||(u.hostname==='fonts.gstatic.com'&&u.pathname.startsWith('/s/')));
     const flags=read&&u.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(u.pathname)&&u.search==='';
     const live=read&&supabase&&u.pathname==='/rest/v1/live_scores';
     const history=read&&completion;
     if(live){const q=Object.fromEntries(u.searchParams);check(q.select==='*'&&q.order==='start_at.asc'&&q.limit==='150'&&u.searchParams.getAll('start_at').length===2&&u.searchParams.getAll('start_at').some(v=>v.startsWith('gte.'))&&u.searchParams.getAll('start_at').some(v=>v.startsWith('lte.'))&&[...u.searchParams.keys()].every(k=>['select','order','limit','start_at'].includes(k)),id+' bounded held live-score read refusal');}
     if(history){const q=Object.fromEntries(u.searchParams);check(q.select==='game,completed_on'&&q.order==='completed_on.desc'&&q.limit==='500'&&q.player_name?.startsWith('eq.')&&Object.keys(q).sort().join(',')==='limit,order,player_name,select',id+' bounded completion history refusal');}
     check(fonts||flags||live||history,id+' unknown external application request refused: '+method+' '+u.origin+u.pathname);
     item.refusal=fonts?'known-font':flags?'known-flag':live?'known-live-score':'known-completion-history';
     await route.abort();item.outcome='known-foreign-refused';item.finishedAt=Date.now();
    }catch(error){
     item.outcome='route-error';item.error=String(error.stack||error);row.routeErrors.push(item.error);await route.abort().catch(()=>{});item.finishedAt=Date.now();
    }
   })();routeTasks.add(task);task.then(()=>routeTasks.delete(task),()=>routeTasks.delete(task));return task;
  });
  page=await context.newPage();cdp=await context.newCDPSession(page);await cdp.send('DOMStorage.enable');
  for(const type of['domStorageItemAdded','domStorageItemUpdated','domStorageItemRemoved','domStorageItemsCleared'])cdp.on('DOMStorage.'+type,event=>row.storageEvents.push({at:Date.now(),type,...event}));
  page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
  page.on('framenavigated',f=>{if(f===page.mainFrame())row.navigations.push({at:Date.now(),url:f.url()});});
  page.on('requestfailed',request=>{if(request.url().startsWith(BASE+'/'))row.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
  await page.exposeBinding('__missingXiNativeEvent',(_,event)=>{row.events.push(event);if(event.type==='input'&&event.trusted&&event.targetRole==='combobox'&&typeof event.targetValue==='string')typedSearchNames.add(fold(event.targetValue));});
  await page.goto(BASE+ROUTE,{waitUntil:'domcontentloaded'});await page.getByRole('dialog',{name:'How to Play Missing XI',exact:true}).waitFor({state:'visible'});
  await page.evaluate(()=>{
   for(const type of['pointerdown','pointerup','click','keydown','keyup','beforeinput','input','wheel','scroll'])addEventListener(type,event=>{
    const target=event.target?.closest?.('button,input')??event.target,dialog=event.target?.closest?.('[role=dialog]');
    window.__missingXiNativeEvent({at:Date.now(),type,trusted:event.isTrusted,pointerType:event.pointerType??null,key:event.key??null,data:event.data??null,inputType:event.inputType??null,deltaX:event.deltaX??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null,targetTag:target?.tagName??null,targetRole:target?.getAttribute?.('role')??null,targetText:target?.textContent?.trim()??null,targetValue:target?.value??null,targetLabel:target?.getAttribute?.('aria-label')??null,inDialog:!!dialog,dialogOwner:dialog?.getAttribute('aria-labelledby')??null});
   },true);
  });
  await escapeHelp('startup-owned-help-escape');
  const cookie=page.getByRole('region',{name:'Cookie choices',exact:true});await cookie.waitFor({state:'visible'});
  await mouseAction('startup-reject-all',cookie.getByRole('button',{name:'Reject all',exact:true}),'startup',async()=>!(await state()).cookieChoices);
  equal(await storedConsent(page),'rejected',id+' actual optional consent rejection');
  await wait(async()=>{const s=await state();return s.phase==='playing'&&s.mode==='daily'&&!s.dialog.open&&s.controls['Give up'].present;},id+' actual fresh Daily mount');
  const baseline=await checkpoint('baseline');row.baseline=baseline.ref;
  check(!Object.keys(baseline.value.storage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')),id+' actually signed out');
  equal(baseline.value.dailyKeys,[],id+' no injected Daily record');
  const miss=await actualMiss('actual-daily-miss'),dailyProgress=miss.frame;
  if(scenario==='A'){
   await mouseAction('A-arm-daily',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const switched=await mode('unlimited','A-enter-unlimited');noOldConfirmation(switched.after.value);
   equal(switched.after.value.storage,dailyProgress.value.storage,id+' abandoned Daily confirmation holds every saved byte');equal(switched.after.value.sessionStorage,dailyProgress.value.sessionStorage,id+' session held');
   equal(switched.after.value.dailySave,dailyProgress.value.dailySave,id+' actual Daily miss held');equal(switched.after.value.draft.value,'',id+' fresh Unlimited draft reset');
   equal(completionPosts().length,0,id+' no premature completion');await checkpoint('A-new-unlimited');await photo('new-unlimited-old-confirmation-gone',button('Give up'));
   await mouseAction('A-arm-current-unlimited',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const cancelBefore=await checkpoint('A-before-current-cancel');
   const canceled=await mouseAction('A-keep-current-unlimited',button('Keep playing'),'business',async()=>(await state()).controls['Give up'].present);progress(cancelBefore.value,canceled.after.value,'current cancel');
   await mouseAction('A-rearm-current-unlimited',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const lost=await mouseAction('A-current-unlimited-yes',button('Yes, reveal it'),'business',async()=>(await state()).phase==='revealed');scoreZero(lost.after.value);
   equal(lost.after.value.storage,dailyProgress.value.storage,id+' ordinary Unlimited forfeit holds saved Daily');equal(completionPosts().length,0,id+' Unlimited forfeit no Daily completion');
   check(lost.after.value.result.emojiGrid.split('\n')[1]==='⬜⬜⬜',id+' Unlimited give burns no guesses');
   row.settlements.push({name:'A-intentional-current-unlimited-forfeit',mode:'unlimited',outcome:'lost',score:0,frame:lost.after.ref});
   const next=await mouseAction('A-new-lineup',button('New Lineup'),'business',async()=>(await state()).phase==='playing');noOldConfirmation(next.after.value);
   check(next.after.value.messages.includes('Guess 1 of 3')&&next.after.value.draft.value==='',id+' actual normal fresh round');equal(next.after.value.storage,dailyProgress.value.storage,id+' new Unlimited holds Daily');await checkpoint('A-final-playing');
  }else{
   await mode('unlimited','B-enter-unlimited');
   await mouseAction('B-arm-unlimited',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const returned=await mode('daily','B-return-daily');noOldConfirmation(returned.after.value);
   equal(returned.after.value.storage,dailyProgress.value.storage,id+' unfinished Daily all saved bytes held');equal(returned.after.value.dailySave,dailyProgress.value.dailySave,id+' unfinished actual miss held');
   equal(returned.after.value.match,dailyProgress.value.match,id+' current Daily public match held');equal(completionPosts().length,0,id+' no old confirmation completion');
   await checkpoint('B-returned-daily');await photo('unfinished-daily-old-confirmation-gone',button('Give up'));
   await mouseAction('B-arm-current-daily',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const same=await mode('daily','B-same-daily');check(same.after.value.controls['Yes, reveal it'].present,id+' same-mode confirmation remains');
   await mouseAction('B-current-pitch-view',button('Pitch'),'business',async()=>(await state()).lineup.view==='Pitch');check((await state()).controls['Yes, reveal it'].present,id+' same-round Pitch keeps confirmation');
   await mouseAction('B-current-lineup-view',button('Lineup'),'business',async()=>(await state()).lineup.view==='Lineup');check((await state()).controls['Yes, reveal it'].present,id+' same-round Lineup keeps confirmation');
   const shown=(await state()).lineup.rows.find(r=>!r.label&&r.name.trim()!=='Missing player');await selectShownName('B-current-draft-edit',shown);
   check((await state()).controls['Yes, reveal it'].present,id+' ordinary input edit keeps current confirmation');
   const cancelBefore=await checkpoint('B-before-current-cancel');
   const canceled=await mouseAction('B-keep-current-daily',button('Keep playing'),'business',async()=>(await state()).controls['Give up'].present);progress(cancelBefore.value,canceled.after.value,'current cancel after edits');
   await mouseAction('B-rearm-current-daily',button('Give up'),'business',async()=>(await state()).controls['Yes, reveal it'].present);
   const lost=await mouseAction('B-current-daily-yes',button('Yes, reveal it'),'business',async()=>(await state()).phase==='revealed');await waitPosts();scoreZero(lost.after.value);
   equal(lost.after.value.dailySave.guesses,[{t:'miss',name:miss.pick.selectedName},{t:'give'}],id+' only intentional actual Daily give');equal(lost.after.value.dailySave.gameStatus,'lost',id+' actual intentional Daily loss');
   check(lost.after.value.result.emojiGrid.split('\n')[1]==='🟥⬜⬜',id+' give does not consume extra guess');
   row.settlements.push({name:'B-intentional-current-daily-forfeit',mode:'daily',outcome:'lost',score:0,frame:lost.after.ref});await checkpoint('B-legitimate-daily-loss');
   await photo('legitimate-current-daily-loss',resultCard().getByText('Score',{exact:true}).locator('..'));
  }

  await wait(()=>routeTasks.size===0&&row.requests.every(r=>r.outcome!=='pending'),id+' all intercepted request promises completed');
  const final=await checkpoint('final');row.final=final.ref;
  const actions=row.actions.map(readRef),business=actions.filter(a=>a.kind==='business'),startup=actions.filter(a=>a.kind==='startup');
  equal([business.filter(a=>a.method==='mouse').length,startup.filter(a=>a.method==='mouse').length,startup.filter(a=>a.method==='keyboard').length],[scenario==='A'?10:14,1,1],id+' source-derived stable mouse and startup census');
  equal(row.typings.length,scenario==='A'?1:2,id+' actual typing census');equal(row.settlements.length,1,id+' one genuine intentional forfeit');
  equal([row.screenshots.length,row.observedClose.length],[scenario==='A'?1:2,1],id+' useful phase PNGs and observed Close');
  equal(completionPosts().length,scenario==='A'?0:1,id+' Daily-only intentional completion attempts');
  const arrows=business.filter(a=>a.method==='keyboard'&&a.key==='ArrowDown').length,enters=business.filter(a=>a.method==='keyboard'&&a.key==='Enter').length;
  equal(enters,row.typings.length,id+' one owned Enter per actual roster pick');
  equal(business.length,(scenario==='A'?12:18)+arrows,id+' actual keyboard highlight actions counted');
  equal(row.frames.length,(scenario==='A'?35:49)+2*arrows+2*row.wheels.length,id+' complete source-derived frames plus actual arrows/wheels');
  check(row.navigations.length>=1&&row.navigations.every((n,i)=>n.url===BASE+ROUTE&&Number.isFinite(n.at)&&n.at<=readRef(row.frames[0]).at&&(!i||n.at>=row.navigations[i-1].at)),id+' actual startup navigations, no guessed count');
  const frames=row.frames.map(readRef);check(frames.every(f=>f.timeOrigin===frames[0].timeOrigin&&f.url===BASE+ROUTE),id+' same document throughout public scenario');
  check(!row.errors.length&&!row.assetErrors.length&&!row.routeErrors.length,id+' no App/local asset/route errors');
  check(row.requests.every(r=>['search-cors','empty-search-fulfilled','completion-cors','completion-aborted','known-foreign-refused'].includes(r.outcome)&&Number.isFinite(r.finishedAt)),id+' every foreign request resolved without forwarded write');
  row.census={businessMouseClicks:business.filter(a=>a.method==='mouse').length,startupMouseClicks:1,startupEscapeKeys:1,businessArrowKeys:arrows,businessEnterKeys:enters,typings:row.typings.length,terminalResults:1,completionPosts:completionPosts().length,screenshots:row.screenshots.length,frames:row.frames.length,actions:row.actions.length,preparations:row.preparations.length,layouts:row.layouts.length,wheels:row.wheels.length,navigations:row.navigations.length,searchReads:row.requests.filter(r=>r.outcome==='empty-search-fulfilled').length};
  row.status='passed';
 }catch(error){
  row.status='failed';row.error=String(error.stack||error);if(page&&!page.isClosed())await frame('failure').catch(()=>{});throw error;
 }finally{
  row.closingAt=Date.now();await context.close().catch(error=>row.closeError=String(error));await Promise.allSettled([...routeTasks]);
  if(row.status==='passed'&&(row.closeError||row.errors.length||row.assetErrors.length||row.routeErrors.length||row.requests.some(r=>r.outcome==='pending'||r.outcome==='route-error'))){row.status='failed';row.error='Context/request closure failed';}
  put('report',report);
 }
 check(row.status==='passed',id+' completed context passes after request closure');return row;
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
 const contexts=report.journeys.flatMap(j=>j.contexts),sum=field=>contexts.reduce((n,c)=>n+c.census[field],0);
 equal([report.journeys.length,contexts.length,sum('businessMouseClicks'),sum('startupMouseClicks'),sum('startupEscapeKeys'),sum('typings'),sum('businessEnterKeys'),sum('terminalResults'),sum('completionPosts'),sum('screenshots')],[3,6,72,6,6,9,9,6,3,9],'Complete source-derived native Missing XI scope');
 equal(sum('actions'),102+sum('businessArrowKeys'),'All actual action bodies, including native typing and measured highlight keys');
 report.census={journeys:3,contexts:6,businessMouseClicks:72,startupMouseClicks:6,startupEscapeKeys:6,typings:9,businessArrowKeys:sum('businessArrowKeys'),businessEnterKeys:9,terminalResults:6,completionPosts:3,screenshots:9,frames:sum('frames'),actions:sum('actions'),preparations:sum('preparations'),layouts:sum('layouts'),wheels:sum('wheels'),navigations:sum('navigations'),searchReads:sum('searchReads')};
 equal(report.census.frames,252+2*report.census.businessArrowKeys+2*report.census.wheels,'All native frame bodies accounted from actual public arrows and wheels');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();
 report.sourceAfter=tracked();report.distAfter=inventory('dist');report.locksAfter=['package.json','package-lock.json'].map(sourceReceipt);report.installedAfter=versions();report.offlineAfter=offline();
 report.indexAfter=textFile('index-after.txt',execFileSync('git',['ls-files','-s'],{cwd:ROOT}));
 report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);report.locksHeld=JSON.stringify(report.locksBefore)===JSON.stringify(report.locksAfter);report.installedHeld=JSON.stringify(report.installedBefore)===JSON.stringify(report.installedAfter);report.offlineHeld=JSON.stringify(report.offlineBefore)===JSON.stringify(report.offlineAfter);report.indexHeld=fs.readFileSync(path.join(OUT,'index-before.txt')).equals(fs.readFileSync(path.join(OUT,'index-after.txt')));
 if(![report.sourceHeld,report.distHeld,report.locksHeld,report.installedHeld,report.offlineHeld,report.indexHeld].every(Boolean)){report.status='failed';report.holdError='Source/dist/locks/521/offline/index changed';}
 const raw={version:1,route:ROUTE,page:PAGE,qualifiedInput,limits:report.limits,contexts:report.journeys.flatMap(j=>j.contexts).map(c=>({id:c.id,scenario:c.scenario,width:c.width,height:c.height,status:c.status,events:c.events,storageEvents:c.storageEvents,navigations:c.navigations,requests:c.requests,firstPartyReads:c.firstPartyReads,webSockets:c.webSockets,frames:c.frames.map(readRef),actions:c.actions.map(readRef),preparations:c.preparations.map(readRef),layouts:c.layouts.map(readRef),wheels:c.wheels.map(readRef),typings:c.typings.map(readRef),observedClose:c.observedClose.map(readRef),settlements:c.settlements,checkpoints:c.checkpoints,census:c.census??null,errors:c.errors,assetErrors:c.assetErrors,routeErrors:c.routeErrors}))};
 report.raw=put('raw',raw);put('report',report);
 const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,z)=>a.name.localeCompare(z.name)).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
 const bodies=walk(OUT).filter(file=>file!=='body-manifest.json').map(fileRef);put('body-manifest',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((n,r)=>n+r.bytes,0),limits:'Every evidence body except this nonrecursive manifest. Input bindings are retained metadata; authenticated fixed/unit/source custody is separate. Native admission JSON belongs outside this closed subtree.'});
 assert.equal(report.status,'passed','Native scope and physical holds must actually pass');
}
