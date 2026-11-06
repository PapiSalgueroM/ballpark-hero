// Soccer board request ownership proof for remote CI. Fulfilled search and validation records are fictional.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI,'Remote CI only');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),OUT=path.resolve(ROOT,process.env.C4_OWNER_BROWSER_OUT||'c4-owner-browser');
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const receipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return{file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',b=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),b);return{file,bytes:b.length,sha256:sha(b)};};
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[receipt(dir+'/'+e.name)]:[]);
const tracked=()=>execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean).map(receipt);
const versions=()=>Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'))).packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,p,'package.json'))).map(p=>[p,JSON.parse(fs.readFileSync(path.join(ROOT,p,'package.json'))).version]);
const pins={
 'src/hooks/useFootballConnect4.ts':'971dbdfa5a0e3c5adf749f9f301cc0fd994a178f',
 'src/pages/FootballConnect4.tsx':'634f94cea7810cfd678c3a4a6f470c3039773882',
 'src/components/football-connect4/FootballConnect4Board.tsx':'aa57d68f047d92eb83438f5dac12984051f8111a',
 'src/components/game/PlayerAutocomplete.tsx':'a0bd500b63306c75e0dea251cb6fb67ea2ed9452',
 'src/lib/playerSearch.ts':'0d19f2c23735eb30512dc7fc3a447eacef5e128f',
 'src/types/footballConnect4.ts':'b189d5c460af28ed43b7ce652d495e72df6448b0',
 'scripts/playFootballConnect4Failures.mjs':'01fddf104d0579a35dc285c63704d3400563c590',
 'scripts/lib/answerConsent.mjs':'c6d16997e4c06e8b35dcfd0bab5efcad3069d899',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(path.join(ROOT,file))),want,file+' physical source');
assert(process.env.SIM_NETWORK==='offline'&&process.env.SIM_OFFLINE_RECEIPT,'Explicit offline mode and receipt required');
const offlineFile=path.resolve(ROOT,process.env.SIM_OFFLINE_RECEIPT),offline=()=>{const b=fs.readFileSync(offlineFile);return{file:path.relative(ROOT,offlineFile),bytes:b.length,sha256:sha(b)};};
const NAMES=['Fixture A','Fixture B'],CANON=['QA Old A','QA New B'],SEARCH_SELECT='player_name,market_value_usd,year,club,nationality,position,age,person_key',SEARCH_ORDER='market_value_usd.desc,year.desc,player_name.asc';
const rawRows=NAMES.map((player_name,i)=>({player_name,name_folded:player_name.toLowerCase(),person_key:'c4-fiction-'+i,market_value_usd:10000000,year:2026,club:'Fixture Club '+i,nationality:'England',position:'Forward',age:24}));
const report={status:'running',checks:0,pins,scope:'Actual App Unlimited A pending, native Unlimited reroll B, B pending, stale A response completed, then B commits once at320/390/1280.',
 fixtureScope:'Only matching player_market_values search GETs and two deferred football-connect4-validate read POSTs/preflights are fulfilled. Fictional records do not prove real player eligibility. Every other foreign request is aborted.',
 limits:['No App/DOM/storage/clock/RNG or in-memory pool overrides. Native board draw can repeat.','Same-config identity, API duplicate and hidden Daily log boundaries remain unit-owned. No full match, backend writes, provider truth, RNG count or actual font-provider credit.','Inherited mode/grid control sizes are measured without a44px claim. They must remain visible, enabled, unclipped and center-reachable; small targets remain an unqualified UI followup. Input and autocomplete request controls must be44px.','Successful reroll, selection and commit transitions are observed; exact scroll/state holds apply to stale response and explicit preparation/typing boundaries.'],
 fixture:put('fictional-transport',{rawRows,canonicalResponses:CANON.map(fullName=>({valid:true,fullName}))}),sourceBefore:tracked(),distBefore:inventory('dist'),installedBefore:versions(),offlineBefore:offline(),journeys:[],screenshots:[],externalForwarded:0};
assert.equal(report.installedBefore.length,521);assert.equal(report.distBefore.length,850);assert.equal(report.offlineBefore.bytes,0);
const check=(ok,label)=>{report.checks++;assert(ok,label);},equal=(a,b,label)=>{report.checks++;assert.deepEqual(a,b,label);};
const wait=async(fn,label,timeout=16000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
let browser,host;
try{
 const port=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const BASE='http://127.0.0.1:'+port;report.base=BASE;
 host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Host startup timeout')),15000);host.stdout.on('data',b=>{if(String(b).includes('host-like server:')){clearTimeout(timer);resolve();}});host.once('error',reject);host.once('exit',c=>{clearTimeout(timer);reject(Error('Host exited '+c));});});
 browser=await pw.chromium.launch({headless:true});
 for(const[width,height]of[[320,568],[390,844],[1280,900]]){
  const id=String(width),mobile=width<1000,row={width,height,mode:mobile?'native touch and keyboard text entry':'native keyboard',status:'running',requests:[],events:[],frames:[],actions:[],layouts:[],screenshots:[],errors:[],assetErrors:[],routeErrors:[]};report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'}),pending=[];
  let page;
  const input=()=>page.getByRole('combobox',{name:'Enter soccer player name...',exact:true}),unlimited=()=>page.getByRole('button',{name:'∞ Unlimited',exact:true});
  const cells=()=>page.locator('main button[aria-label^="Empty square,"],main button[aria-label^="QA "]');
  const completions=()=>row.requests.filter(r=>r.path==='/rest/v1/game_completions'||r.path.includes('record-completion'));
  const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let last='',n=0;const end=performance.now()+10000;do{await new Promise(requestAnimationFrame);const next=JSON.stringify([...document.querySelectorAll('main button,main input,[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));n=next===last?n+1:1;last=next;if(n>=4&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return;}while(performance.now()<end);throw Error('Layout did not settle');});
  const state=async()=>page.evaluate(()=>{
   const first=document.querySelector('main button[aria-label^="Empty square,"]'),root=first?.closest('.overflow-x-auto'),grids=root?[...root.firstElementChild.children]:[],headers=grids[0]?[...grids[0].querySelectorAll('button')]:[],all=root?[...root.querySelectorAll('button[aria-label]')]:[],box=document.querySelector('input[aria-label="Enter soccer player name..."]'),active=document.activeElement;
   const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},main=document.querySelector('#dukb-main');
   const list=all.map((e,index)=>({index,row:Math.floor(index/7),col:index%7,label:e.getAttribute('aria-label'),text:e.textContent.trim(),disabled:e.disabled,classes:e.className,rect:rect(e)}));
   return{at:Date.now(),scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),columns:headers.map(e=>e.textContent.trim()),rows:grids.slice(1).map(e=>e.firstElementChild.textContent.trim()),selectedColumn:headers.findIndex(e=>e.classList.contains('ring-2')),target:list.filter(e=>e.classes.split(' ').includes('ring-1')).map(e=>[e.row,e.col]),cells:list,chips:list.filter(e=>!e.label.startsWith('Empty square,')),boardScroll:root?{x:root.scrollLeft,y:root.scrollTop}:null,input:box?{value:box.value,disabled:box.disabled,expanded:box.getAttribute('aria-expanded'),rect:rect(box)}:null,turn:main?.innerText.includes("Red's Turn")?'red':main?.innerText.includes("Blue's Turn")?'blue':null,errors:[...document.querySelectorAll('main .text-destructive')].map(e=>e.textContent.trim()),focus:{tag:active?.tagName,id:active?.id,label:active?.getAttribute('aria-label')},body:document.body.innerText,mainText:main?.innerText};
  });
  const frame=async name=>{await settle();const v=await state();check(v.documentWidth<=width&&v.viewport.width===width,id+': no document horizontal overflow and exact viewport');row.frames.push(put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,v));return v;};
  const stable=(a,b,label,includeInput=true)=>{for(const k of['storage','columns','rows','selectedColumn','target','turn','errors','boardScroll'])equal(a[k],b[k],id+': '+k+' held '+label);equal(a.cells.map(c=>[c.label,c.text,c.disabled,c.classes]),b.cells.map(c=>[c.label,c.text,c.disabled,c.classes]),id+': exact board held '+label);if(includeInput)equal(a.input&&[a.input.value,a.input.disabled,a.input.expanded],b.input&&[b.input.value,b.input.disabled,b.input.expanded],id+': input held '+label);};
  const measure=async(target,kind,allowDisabled=false)=>{
   check(await target.count()===1&&await target.isVisible(),id+': one visible '+kind+' control');
   const v=await target.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(el);let top=0,bottom=0;
    for(const px of[innerWidth*.5,6,innerWidth-6])for(const[py,edge]of[[1,'top'],[innerHeight-2,'bottom']])for(const n of document.elementsFromPoint(px,py)){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||b.height<=0||b.height>innerHeight*.4||n.contains(el))continue;if(edge==='top'&&b.top<=2&&b.bottom>0)top=Math.max(top,b.bottom);if(edge==='bottom'&&b.bottom>=innerHeight-2&&b.top<innerHeight)bottom=Math.max(bottom,innerHeight-b.top);}
    const clips=[];for(let n=el.parentElement;n;n=n.parentElement){if(n===document.scrollingElement)continue;const s=getComputedStyle(n),b=n.getBoundingClientRect(),cx=['auto','scroll','hidden','clip','overlay'].includes(s.overflowX),cy=['auto','scroll','hidden','clip','overlay'].includes(s.overflowY);if(cx||cy)clips.push({tag:n.tagName,cx,cy,x:b.x+n.clientLeft,right:b.x+n.clientLeft+n.clientWidth,y:b.y+n.clientTop,bottom:b.y+n.clientTop+n.clientHeight});}
    return{rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center:{x,y},chrome:{top,bottom},clips,disabled:el.matches(':disabled'),hit:hit===el||el.contains(hit),classes:el.className,label:el.getAttribute('aria-label'),text:el.textContent?.trim().slice(0,160),fontSize:style.fontSize,padding:style.padding};
   });v.kind=kind;v.meets44=v.rect.width>=44&&v.rect.height>=44;row.layouts.push(v);
   check(v.rect.width>0&&v.rect.height>0&&v.rect.x>=0&&v.rect.right<=width&&v.rect.y>=v.chrome.top&&v.rect.bottom<=height-v.chrome.bottom,id+': full '+kind+' target inside viewport/unrelated chrome');
   check(v.clips.every(c=>(!c.cx||(v.rect.x>=c.x&&v.rect.right<=c.right))&&(!c.cy||(v.rect.y>=c.y&&v.rect.bottom<=c.bottom))),id+': full '+kind+' target inside ancestor clips');
   check(v.hit&&(allowDisabled||!v.disabled),id+': actual center hit and enabled state '+kind);if(kind==='request'||kind==='consent')check(v.meets44,id+': actual44px '+kind+' control');return v;
  };
  const prepare=async(target,name,kind,allowDisabled=false)=>{
   const before=await frame(name+'-prepare-before'),start=row.events.length;
   await target.scrollIntoViewIfNeeded();await settle();
   const blocked=await target.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),bars=[];for(let n=hit;n;n=n.parentElement){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(!n.contains(el)&&['fixed','sticky'].includes(s.position)&&b.y<=0&&b.bottom>0&&b.height<=innerHeight*.4&&b.width>=innerWidth/2)bars.push(b.bottom);}const top=Math.max(0,...bars);return hit!==el&&!el.contains(hit)&&top>r.y&&r.y>=0&&r.bottom>top&&r.bottom<=innerHeight?{top,pixels:Math.ceil(top-r.y),point:{x,y:(top+r.bottom)/2}}:null;});
   if(blocked){const y=await page.evaluate(()=>scrollY);await page.mouse.move(blocked.point.x,blocked.point.y);await page.mouse.wheel(0,-blocked.pixels);await wait(()=>page.evaluate(want=>scrollY===want,Math.max(0,y-blocked.pixels)),id+': exact native chrome scroll');check(row.events.slice(start).some(e=>e.type==='wheel'&&e.trusted&&e.deltaMode===0&&e.deltaY===-blocked.pixels),id+': trusted native chrome preparation');}
   const after=await frame(name+'-prepare-after');stable(before,after,name+' preparation');equal(before.focus,after.focus,id+': preparation focus identity held');row.actions.push(put(id+'/preparations/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,before,after,blocked,events:row.events.slice(start)}));return measure(target,kind,allowDisabled);
  };
  const press=async target=>{if(mobile)await target.tap();else{await target.focus();await target.press('Enter');}};
  const action=async(name,target,kind,work,held=false)=>{
   const geometry=await prepare(target,name,kind),before=await frame(name+'-before'),start=row.events.length;
   await work();const after=await frame(name+'-after');if(held){stable(before,after,name,false);equal(before.scroll,after.scroll,id+': strict action scroll held '+name);}
   const events=row.events.slice(start);check(events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown')),id+': trusted native action '+name);row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,geometry,held,before,after,events}));return{before,after};
  };
  const photo=async(name,target,kind,disabled=false)=>{await prepare(target,name+'-photo',kind,disabled);const v=await frame(name+'-photo'),file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});const b=fs.readFileSync(path.join(OUT,file)),shot={file,bytes:b.length,sha256:sha(b),frame:row.frames.at(-1),viewport:v.viewport};row.screenshots.push(shot);report.screenshots.push(shot);return v;};
  const submit=async index=>{
   await action('select-'+index,cells().nth(35),'grid',()=>press(cells().nth(35)));check(await input().isEnabled(),id+': selected input enabled');
   const selected=await frame('selected-'+index);check(selected.selectedColumn===0&&selected.target.length===1&&selected.target[0][0]===5&&selected.target[0][1]===0,id+': actual lowest empty cell selected');row['origin'+index]={columns:selected.columns,rows:selected.rows,column:0,targetRow:5};
   await action('type-'+index,input(),'request',async()=>{if(mobile)await input().tap();else await input().focus();await input().press('ControlOrMeta+A');await input().pressSequentially(NAMES[index]);},true);
   const option=page.getByRole('option').filter({hasText:NAMES[index]});await option.waitFor({state:'visible'});check(await option.count()===1,id+': one actual fictional autocomplete option');
   const requestBarrier=page.waitForRequest(r=>new URL(r.url()).pathname==='/functions/v1/football-connect4-validate'&&r.method()==='POST');
   await action('submit-'+index,option,'request',async()=>{if(mobile)await option.tap();else{await input().focus();await input().press('ArrowDown');await input().press('Enter');}});
   await requestBarrier;await wait(()=>pending.length===index+1,id+': deferred actual validator accepted');await wait(()=>input().isDisabled(),id+': pending input disabled');
   const busy=await frame('pending-'+index);check(busy.chips.length===0&&busy.turn==='blue'&&busy.input.value===NAMES[index]&&busy.input.disabled&&busy.cells.every(c=>c.disabled),id+': actual pending selection/input/empty board');
   return busy;
  };
  try{
   await context.routeWebSocket('**/*',s=>s.close());
   await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());if(u.origin===BASE)return route.continue();const item={at:Date.now(),url:u.href,path:u.pathname,method:request.method(),query:Object.fromEntries(u.searchParams),body:request.postData(),outcome:'pending'};row.requests.push(item);
    try{
     const known=u.hostname==='flawuiqbvjobmkfkauhw.supabase.co'&&['/rest/v1/player_market_values','/functions/v1/football-connect4-validate'].includes(u.pathname);
     if(known&&request.method()==='OPTIONS'){item.outcome='fixture-cors';return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*'}});}
     if(known&&u.pathname==='/rest/v1/player_market_values'&&request.method()==='GET'){
      const q=Object.fromEntries(u.searchParams),needle=q.name_folded;check(q.select?.replaceAll(' ','')===SEARCH_SELECT&&q.order===SEARCH_ORDER&&['200','1000'].includes(q.limit),id+': exact actual player search query');check(Object.keys(q).every(k=>['select','order','limit','name_folded'].includes(k)),id+': no unreviewed search filter');if(needle!==undefined)check(/^ilike\.%fixture [ab]%$/.test(needle),id+': fictional folded query only');
      item.response=rawRows.filter(p=>needle===undefined||p.name_folded.includes(needle.slice(7,-1)));item.outcome='fixture-fulfilled';return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(item.response)});
     }
     if(known&&u.pathname==='/functions/v1/football-connect4-validate'&&request.method()==='POST'){
      const body=JSON.parse(request.postData()||'null'),index=pending.length;check(index<2&&body&&body.playerName===NAMES[index],id+': exactly current fictional validator request');equal(Object.keys(body).sort(),['columnAttribute','playerName','rowAttribute'],id+': exact validator payload fields');equal([body.columnAttribute,body.rowAttribute],[row['origin'+index].columns[0],row['origin'+index].rows[5]],id+': actual selected board clues');
      let release;const barrier=new Promise(resolve=>{release=resolve;});pending.push({release,item});item.payload=body;item.outcome='fixture-held';item.heldAt=Date.now();await barrier;item.releasedAt=Date.now();item.response={valid:true,fullName:CANON[index]};item.outcome='fixture-fulfilled';return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(item.response)});
     }
     item.outcome='aborted';return route.abort();
    }catch(error){item.outcome='route-error';row.routeErrors.push(String(error.stack||error));await route.abort().catch(()=>{});}
   });
   page=await context.newPage();page.on('pageerror',e=>row.errors.push(String(e)));page.on('requestfailed',request=>{if(request.url().startsWith(BASE+'/'))row.assetErrors.push({url:request.url(),error:request.failure()?.errorText});});
   await page.exposeBinding('__c4OwnerEvent',(_,e)=>row.events.push(e));
   await page.addInitScript(()=>{for(const type of['pointerdown','pointerup','click','keydown','wheel','scroll'])addEventListener(type,e=>window.__c4OwnerEvent({at:Date.now(),type,trusted:e.isTrusted,pointerType:e.pointerType,key:e.key,x:e.clientX,y:e.clientY,deltaY:e.deltaY,deltaMode:e.deltaMode,tag:e.target?.tagName,label:e.target?.getAttribute?.('aria-label'),text:e.target?.textContent?.trim().slice(0,100)}),true);});
   await page.goto(BASE+'/football-connect-4',{waitUntil:'domcontentloaded'});await wait(()=>cells().count().then(n=>n===42),id+': actual complete board loaded');await answerConsent(page,{choice:'reject',press:async target=>action('reject-consent',target,'consent',()=>press(target))});check(await storedConsent(page)==='rejected',id+': optional advertising rejected');
   await action('unlimited-A',unlimited(),'mode',()=>press(unlimited()));const initial=await frame('unlimited-empty');check(initial.chips.length===0&&initial.turn==='blue',id+': empty Unlimited A');const storage=initial.storage;
   await submit(0);await action('reroll-B',unlimited(),'mode',()=>press(unlimited()));const reset=await frame('B-reset');check(reset.chips.length===0&&reset.turn==='blue'&&reset.selectedColumn===-1&&reset.input===null,id+': reroll clears board/selection and unlocks');equal(reset.storage,storage,id+': reroll full storage held');
   await submit(1);check(pending.length===2&&pending.every(p=>p.item.outcome==='fixture-held'),id+': two independently pending validator requests');await photo('before-old-release',input(),'request',true);
   const beforeOld=await frame('old-release-before'),focus=await page.evaluateHandle(()=>document.activeElement),responseBarrier=page.waitForResponse(r=>r.url().endsWith('/functions/v1/football-connect4-validate')&&r.request().postDataJSON()?.playerName===NAMES[0]);
   pending[0].release();const response=await responseBarrier;await response.finished();row.oldResponse={status:response.status(),finishedAt:Date.now(),body:await response.json()};equal(row.oldResponse.body,{valid:true,fullName:CANON[0]},id+': actual stale response body fully completed');
   for(const suffix of['settled-1','settled-2']){const after=await frame('old-release-'+suffix);stable(beforeOld,after,'stale response '+suffix);equal(beforeOld.scroll,after.scroll,id+': stale response exact document scroll');check(await page.evaluate(el=>document.activeElement===el,focus),id+': stale response exact active DOM node held');check(after.input?.disabled&&after.input.value===NAMES[1]&&after.chips.length===0&&after.turn==='blue',id+': stale A cannot unlock/clear/commit B');}await focus.dispose();check(pending[1].item.outcome==='fixture-held',id+': B transport remains pending after A');await photo('after-old-release',input(),'request',true);
   const beforeB=await frame('B-release-before'),bResponseBarrier=page.waitForResponse(r=>r.url().endsWith('/functions/v1/football-connect4-validate')&&r.request().postDataJSON()?.playerName===NAMES[1]);pending[1].release();const bResponse=await bResponseBarrier;await bResponse.finished();row.currentResponse={status:bResponse.status(),finishedAt:Date.now(),body:await bResponse.json()};await wait(()=>cells().filter({hasText:CANON[1]}).count().then(n=>n===1),id+': current canonical chip appears');
   const done=await frame('B-committed');check(done.chips.length===1&&done.chips[0].text===CANON[1]&&done.chips[0].row===5&&done.chips[0].col===0&&done.chips[0].classes.includes('bg-blue-500/90')&&done.turn==='red'&&done.selectedColumn===-1&&done.input===null,id+': exactly one current Blue chip, next Red, selection/input closed');equal(done.storage,storage,id+': no Daily save/completion write');check(!done.mainText.includes(CANON[0])&&done.errors.length===0&&completions().length===0,id+': no stale canonical chip/error/completion');equal(row.currentResponse.body,{valid:true,fullName:CANON[1]},id+': current canonical response');await photo('after-B-commit',cells().filter({hasText:CANON[1]}),'grid',true);
   equal((await frame('final')).storage,storage,id+': final full storage held');check(row.events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown'&&e.key==='Enter')),id+': actual native interaction mode');check(row.errors.length===0&&row.assetErrors.length===0&&row.routeErrors.length===0,id+': no App/local-asset/route error');check(row.requests.every(r=>['aborted','fixture-cors','fixture-fulfilled'].includes(r.outcome)),id+': no forwarded/unresolved request');row.status='passed';console.log('PASS native C4 ownership '+width);
  }catch(error){row.status='failed';row.error=String(error.stack||error);if(page&&!page.isClosed())await frame('failure').catch(()=>{});throw error;}
  finally{for(const p of pending)p.release();await context.close();put('report',report);}
 }
 check(report.screenshots.length===9,'Exactly9 native viewport PNGs');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();report.sourceAfter=tracked();report.distAfter=inventory('dist');report.installedAfter=versions();report.offlineAfter=offline();report.offlineHeld=JSON.stringify(report.offlineBefore)===JSON.stringify(report.offlineAfter)&&report.offlineAfter.bytes===0;report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);report.installedHeld=JSON.stringify(report.installedBefore)===JSON.stringify(report.installedAfter);put('report',report);assert(report.sourceHeld&&report.distHeld&&report.installedHeld&&report.offlineHeld,'All tracked source/dist/521 locked versions and0B offline receipt held');
}
