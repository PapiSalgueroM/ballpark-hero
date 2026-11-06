// Remote-only FD-01 native evidence. All fulfilled player records are fictional.
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
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.resolve(ROOT,process.env.FD_RULES_BROWSER_OUT||'fd-rules-browser');
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const receipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return{file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',b=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),b);return{file,bytes:b.length,sha256:sha(b)};};
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[receipt(dir+'/'+e.name)]:[]);
const tracked=()=>execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean).map(receipt);
const versions=()=>Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'))).packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,p,'package.json'))).map(p=>[p,JSON.parse(fs.readFileSync(path.join(ROOT,p,'package.json'))).version]);
const pins={
 'src/pages/FantasyDraft.tsx':'d1b38c9aaae0ead2c68d746866e0ccb3b47adccd',
 'src/lib/fantasyCriteria.ts':'f6f7d27ee0af80e4386e650a9d7128cd89702f90',
 'src/components/fantasy-draft/PlayerPool.tsx':'08a84d008390d68293482de3e818fada9120c5b3',
 'src/components/fantasy-draft/DraftRoster.tsx':'61d938308edcded2adffc810c01b7d9c12fd3a35',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a',
 'package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(path.join(ROOT,file))),want,file+' physical source');
assert(process.env.SIM_NETWORK==='offline'&&process.env.SIM_OFFLINE_RECEIPT,'Explicit offline mode and receipt required');
const offlineFile=path.resolve(ROOT,process.env.SIM_OFFLINE_RECEIPT),offline=()=>{const b=fs.readFileSync(offlineFile);return{file:path.relative(ROOT,offlineFile),bytes:b.length,sha256:sha(b)};};
const UNDER25='Under 25s: Every player must be 25 or younger',VETERAN='Fixture Veteran FWD';
const rawRows=([['GK',4,10],['DEF',8,20],['MID',6,30],['FWD',8,40]]).flatMap(([position,count,value])=>Array.from({length:count},(_,i)=>({id:'fixture-'+position+'-'+i,name:'Fixture '+position+' '+String(i).padStart(2,'0'),position,nationality:'England',dominant_foot:'Right',market_value_millions:value,age:24})));
rawRows.push({id:'fixture-veteran',name:VETERAN,position:'FWD',nationality:'England',dominant_foot:'Right',market_value_millions:900,age:40});
rawRows.sort((a,b)=>a.name.localeCompare(b.name));assert.equal(rawRows.length,27);assert.equal(new Set(rawRows.map(p=>p.id)).size,27);
const byName=new Map(rawRows.map(p=>[p.name,p]));
const report={status:'running',checks:0,scope:'Actual built Fantasy Draft at320/390/1280. Deferred daily Under25 request, disabled native Start attempt, actual pool, veteran refusal, one young human pick and natural initial AI turns.',
 fixtureScope:'Only the exact daily POST and bounded fantasy_draft_players GET/preflights are fulfilled. Every player is fictional; nationality England uses the existing inline flag. All other foreign requests are aborted.',
 limits:['No App, DOM, storage, clock, random source or in-memory pool replacement. Read-only captures record public DOM changes.','Seat selection and AI random choices use the real unobserved RNG; no draw-count, seat-balance or fixed player choice claim.','Only main Under25 is exercised natively. Null, legacy and rejection behavior are owned by the actual-page unit tests.','No Final, full contest, versioned-rule implementation, real roster, live provider, backend-write, actual-font or broad release credit.','Coordinates deliberately attempt disabled controls. Their pointer-events:none ancestor hits are recorded, never described as enabled activation. Successful Start and pick transitions are observed rather than given a new no-scroll/focus guarantee.','Roster screenshots are native viewport captures and may show only the leading portion of the22-slot panel. Full public roster identities remain in JSON.'],
 pins,fixture:put('fictional-transport',{rule:UNDER25,rawRows}),sourceBefore:tracked(),distBefore:inventory('dist'),installedBefore:versions(),offlineBefore:offline(),journeys:[],screenshots:[],externalForwarded:0};
assert.equal(report.installedBefore.length,521);assert.equal(report.distBefore.length,850);assert.equal(report.offlineBefore.bytes,0);
const check=(ok,label)=>{report.checks++;assert(ok,label);},equal=(a,b,label)=>{report.checks++;assert.deepEqual(a,b,label);};
const wait=async(fn,label,timeout=16000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
let browser,host;
try{
 const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
 const BASE='http://127.0.0.1:'+port;report.base=BASE;
 host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Host startup timeout')),15000);host.stdout.on('data',b=>{if(String(b).includes('host-like server:')){clearTimeout(timer);resolve();}});host.once('error',reject);host.once('exit',code=>{clearTimeout(timer);reject(Error('Host exited '+code));});});
 browser=await pw.chromium.launch({headless:true});
 for(const[width,height]of[[320,568],[390,844],[1280,900]]){
  const id=String(width),mobile=width<1000,row={width,height,mode:mobile?'native touch and keyboard text entry':'native keyboard plus explicit disabled coordinate attempts',status:'running',requests:[],events:[],progress:[],frames:[],actions:[],layouts:[],screenshots:[],errors:[],assetErrors:[],routeErrors:[]};report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'});
  let page,release,progressKey='';const released=new Promise(resolve=>{release=resolve;});let ruleReleased=false;
  const starts=()=>page.getByRole('button',{name:'Start Draft',exact:true}),search=()=>page.getByRole('textbox',{name:'Search players',exact:true});
  const pool=()=>page.getByRole('heading',{name:'Player Pool',exact:true}).locator('..').locator('..');
  const candidate=name=>pool().getByText(name,{exact:true}).locator('xpath=ancestor::button[1]');
  const roster=()=>page.getByText('Your XI',{exact:true}).locator('..').locator('..').locator('..').locator('..');
  const market=()=>row.requests.filter(r=>r.path==='/rest/v1/fantasy_draft_players');
  const completions=()=>row.requests.filter(r=>r.completion?.game==='fantasy-draft');
  const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let last='',n=0;const end=performance.now()+10000;do{await new Promise(requestAnimationFrame);const next=JSON.stringify([...document.querySelectorAll('main button,main input,main select,[role="dialog"]')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));n=next===last?n+1:1;last=next;if(n>=4&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return;}while(performance.now()<end);throw Error('Page did not settle');});
  const state=async()=>page.evaluate(rule=>{
   const main=document.querySelector('#dukb-main'),els=[...document.querySelectorAll('main *')];
   const team=label=>{const title=els.find(e=>e.tagName==='SPAN'&&e.textContent.trim()===label),column=title?.parentElement?.parentElement;return column?[...column.querySelectorAll('[data-draft-slot]')].flatMap(e=>{const name=e.querySelector('[title]')?.getAttribute('title');return name?[{name,slot:Number(e.getAttribute('data-draft-slot')),feedback:e.getAttribute('data-draft-pick'),text:e.textContent.trim()}]:[];}):[];};
   const badge=els.find(e=>[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&['Your Pick','AI is picking...'].includes(n.textContent.trim()))),text=badge?.textContent||'',turn=text.includes('Your Pick')?'user':text.includes('AI is picking...')?'ai':null,pick=text.match(/Round\s+(\d+)[\s\S]*?Pick\s+(\d+)\/22/);
   const active=document.activeElement,r=active?.getBoundingClientRect();
   return{at:Date.now(),scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),human:team('Your XI'),ai:team('AI XI'),turn,round:pick?Number(pick[1]):null,nextPick:pick?Number(pick[2]):null,ruleVisible:main?.textContent.includes(rule)||false,poolPresent:els.some(e=>e.tagName==='H3'&&e.textContent.trim()==='Player Pool'),startPresent:els.some(e=>e.tagName==='BUTTON'&&e.textContent.trim()==='Start Draft'),input:document.querySelector('[aria-label="Search players"]')?.value??null,focus:{tag:active?.tagName,id:active?.id,label:active?.getAttribute('aria-label'),text:active?.textContent?.trim().slice(0,160),rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null},body:document.body.innerText,mainText:main?.innerText};
  },UNDER25);
  const note=(v,label)=>{const key=JSON.stringify([v.human.map(p=>p.name),v.ai.map(p=>p.name),v.turn,v.round,v.nextPick]);if(key!==progressKey){row.progress.push({label,at:v.at,human:v.human,ai:v.ai,turn:v.turn,round:v.round,nextPick:v.nextPick});progressKey=key;}return v;};
  const frame=async name=>{await settle();const v=note(await state(),name);check(v.viewport.width===width&&v.documentWidth<=width,id+': exact viewport and no document overflow');row.frames.push(put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,v));return v;};
  const sameGame=(a,b,label)=>{for(const field of['storage','human','ai','turn','round','nextPick','ruleVisible'])equal(a[field],b[field],id+': '+field+' held '+label);};
  const measure=async(target,disabled=false)=>{
   check(await target.count()===1&&await target.isVisible(),id+': one visible actual target');
   const v=await target.evaluate(el=>{
    const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(el);let top=0,bottom=0;
    for(const px of[innerWidth*.5,6,innerWidth-6])for(const[py,edge]of[[1,'top'],[innerHeight-2,'bottom']])for(const n of document.elementsFromPoint(px,py)){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||b.height<=0||b.height>innerHeight*.4||n.contains(el))continue;if(edge==='top'&&b.top<=2&&b.bottom>0)top=Math.max(top,b.bottom);if(edge==='bottom'&&b.bottom>=innerHeight-2&&b.top<innerHeight)bottom=Math.max(bottom,innerHeight-b.top);}
    const clips=[];for(let n=el.parentElement;n;n=n.parentElement){if(n===document.scrollingElement)continue;const s=getComputedStyle(n),b=n.getBoundingClientRect(),cx=['auto','scroll','hidden','clip','overlay'].includes(s.overflowX),cy=['auto','scroll','hidden','clip','overlay'].includes(s.overflowY);if(cx||cy)clips.push({tag:n.tagName,cx,cy,x:b.x+n.clientLeft,right:b.x+n.clientLeft+n.clientWidth,y:b.y+n.clientTop,bottom:b.y+n.clientTop+n.clientHeight});}
    return{rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center:{x,y},chrome:{top,bottom},clips,disabled:el.matches(':disabled'),pointerEvents:style.pointerEvents,hit:hit===el||el.contains(hit),ancestorHit:!!hit&&hit.contains(el),hitTag:hit?.tagName,label:el.getAttribute('aria-label'),text:el.textContent?.trim().slice(0,160)};
   });
   row.layouts.push(v);
   check(v.rect.width>=44&&v.rect.height>=44&&v.rect.x>=0&&v.rect.right<=width&&v.rect.y>=v.chrome.top&&v.rect.bottom<=height-v.chrome.bottom,id+': full actual target44px inside viewport/chrome');
   check(v.clips.every(c=>(!c.cx||(v.rect.x>=c.x&&v.rect.right<=c.right))&&(!c.cy||(v.rect.y>=c.y&&v.rect.bottom<=c.bottom))),id+': actual target unclipped by overflow ancestors');
   check(disabled?v.disabled&&(v.hit||(v.pointerEvents==='none'&&v.ancestorHit)):!v.disabled&&v.hit,id+': actual native hit and expected disabled state');return v;
  };
  const prepare=async(target,name,disabled=false)=>{
   await target.scrollIntoViewIfNeeded();await settle();
   const blocked=await target.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),bars=[];for(let n=hit;n;n=n.parentElement){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(['fixed','sticky'].includes(s.position)&&b.y<=0&&b.bottom>0&&b.height<=innerHeight*.4&&b.width>=innerWidth/2)bars.push(b.bottom);}const top=Math.max(0,...bars);return hit!==el&&!el.contains(hit)&&top>r.y&&r.y>=0&&r.bottom>top&&r.bottom<=innerHeight?{top,rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},pixels:Math.ceil(top-r.y),point:{x,y:(top+r.bottom)/2}}:null;});
   if(blocked){
    const before=await frame(name+'-chrome-prep-before'),start=row.events.length;
    await page.mouse.move(blocked.point.x,blocked.point.y);await page.mouse.wheel(0,-blocked.pixels);
    const want=Math.max(0,before.scroll.y-blocked.pixels);await wait(()=>page.evaluate(y=>scrollY===y,want),id+': native chrome clearance scroll');
    const after=await frame(name+'-chrome-prep-after');sameGame(before,after,name+' preparation');equal(after.input,before.input,id+': input held through preparation');equal([after.focus.tag,after.focus.id,after.focus.label,after.focus.text],[before.focus.tag,before.focus.id,before.focus.label,before.focus.text],id+': focus identity held through preparation');
    check(row.events.slice(start).some(e=>e.type==='wheel'&&e.trusted&&e.deltaMode===0&&e.deltaY===-blocked.pixels),id+': trusted native chrome wheel');
    equal(after.scroll,{x:before.scroll.x,y:want},id+': only exact native chrome clearance moved');
    row.actions.push(put(id+'/preparations/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,blocked,before,after,events:row.events.slice(start)}));
   }
   return measure(target,disabled);
  };
  const press=async target=>{if(mobile)await target.tap();else{await target.focus();await target.press('Enter');}};
  const action=async(name,target,work,held=true,disabled=false)=>{
   const geometry=target?await prepare(target,name,disabled):null,before=await frame(name+'-before'),start=row.events.length;
   await work(geometry);const after=await frame(name+'-after');if(held){equal(after.scroll,before.scroll,id+': exact prepared scroll held '+name);equal(after.storage,before.storage,id+': full storage held '+name);}
   row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,geometry,held,before,after,events:row.events.slice(start)}));return{before,after,start,geometry};
  };
  const disabledAttempt=async(name,target)=>{
   const v=await action(name,target,async geometry=>{if(mobile)await page.touchscreen.tap(geometry.center.x,geometry.center.y);else await page.mouse.click(geometry.center.x,geometry.center.y);},true,true);
   check(row.events.slice(v.start).some(e=>e.type==='pointerdown'&&e.trusted&&Math.abs(e.x-v.geometry.center.x)<=1&&Math.abs(e.y-v.geometry.center.y)<=1),id+': trusted native disabled-coordinate attempt');
   sameGame(v.before,v.after,name);return v;
  };
  const photo=async(name,target,disabled=false,topOfPanel=false)=>{
   if(topOfPanel){
    await target.scrollIntoViewIfNeeded();await settle();const before=await frame(name+'-viewport-prep-before'),r=await target.boundingBox();check(r&&r.width>0&&r.height>0,id+': actual roster photo target');
    const top=await page.evaluate(()=>{let value=0;for(const x of[innerWidth*.5,6,innerWidth-6])for(const e of document.elementsFromPoint(x,1)){const s=getComputedStyle(e),b=e.getBoundingClientRect();if(['fixed','sticky'].includes(s.position)&&b.height>0&&b.height<=innerHeight*.4&&b.y<=2)value=Math.max(value,b.bottom);}return value;});
    const delta=Math.floor(r.y-top-12),max=before.documentHeight-height,want=Math.max(0,Math.min(max,before.scroll.y+delta)),start=row.events.length;
    if(delta!==0){await page.mouse.move(6,height/2);await page.mouse.wheel(0,delta);await wait(()=>page.evaluate(y=>scrollY===y,want),id+': native roster viewport preparation');}
    const after=await frame(name+'-viewport-prep-after');sameGame(before,after,name+' photo preparation');equal(after.input,before.input,id+': photo search held');equal(after.scroll,{x:before.scroll.x,y:want},id+': bounded native photo scroll');
    const actual=await target.boundingBox();check(actual&&actual.y>=top&&Math.min(actual.height,160)<=height-actual.y,id+': roster top and leading160px readable');
    row.actions.push(put(id+'/preparations/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,before,after,delta,want,rect:actual,events:row.events.slice(start)}));
   }else await prepare(target,name+'-photo',disabled);
   const f=await frame(name+'-photo'),file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});const b=fs.readFileSync(path.join(OUT,file)),shot={file,bytes:b.length,sha256:sha(b),frame:row.frames.at(-1),viewport:f.viewport};row.screenshots.push(shot);report.screenshots.push(shot);
  };
  try{
   await context.routeWebSocket('**/*',r=>{row.requests.push({url:r.url(),method:'WEBSOCKET',outcome:'aborted'});r.close({code:1008,reason:'Offline native fixture'});});
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());if(url.origin===BASE)return route.continue();
    const item={at:Date.now(),url:request.url(),path:url.pathname,method:request.method(),query:Object.fromEntries(url.searchParams),body:request.postData(),outcome:'aborted'};row.requests.push(item);
    try{
     const ours=url.origin==='https://flawuiqbvjobmkfkauhw.supabase.co',daily=url.pathname==='/functions/v1/fantasy-draft-daily',players=url.pathname==='/rest/v1/fantasy_draft_players';
     if(ours&&(daily||players)&&request.method()==='OPTIONS'){item.outcome='fixture-cors';return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':daily?'POST,OPTIONS':'GET,OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers']||'*'}});}
     if(ours&&daily&&request.method()==='POST'){
      check(row.requests.filter(r=>r.path===url.pathname&&r.method==='POST').length===1,id+': one actual daily POST');check(!request.postData(),id+': daily POST has no injected payload');equal([...url.searchParams.keys()],[],id+': daily endpoint has no fixture query');
      item.outcome='fixture-held';item.heldAt=Date.now();await released;item.releasedAt=Date.now();item.response={criteria:UNDER25};item.outcome='fixture-fulfilled';return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(item.response)});
     }
     if(ours&&players&&request.method()==='GET'){
      equal(Object.keys(item.query).sort(),['order','select'],id+': exact market query fields');equal(item.query.select,'id,name,position,nationality,market_value_millions,dominant_foot,age',id+': actual player columns');equal(item.query.order,'name.asc',id+': actual source name ordering');
      item.rows=rawRows.map(p=>({...p}));item.bodySHA=sha(JSON.stringify(rawRows));item.outcome='fixture-fulfilled';return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(rawRows)});
     }
     if(request.method()==='POST'&&url.pathname.endsWith('/game_completions')){const body=request.postDataJSON();item.completion=Array.isArray(body)?body[0]:body;}
     return route.abort('blockedbyclient');
    }catch(error){row.routeErrors.push(String(error.stack||error));return route.abort('failed').catch(()=>{});}
   });
   page=await context.newPage();page.on('pageerror',e=>row.errors.push(String(e)));page.on('response',r=>{if(new URL(r.url()).origin===BASE&&r.status()>=400)row.assetErrors.push({url:r.url(),status:r.status()});});page.on('requestfailed',r=>{if(new URL(r.url()).origin===BASE)row.assetErrors.push({url:r.url(),failure:r.failure()});});
   await page.exposeBinding('__fdEvidence',(_source,event)=>row.events.push(event));
   await page.addInitScript(()=>{for(const type of['pointerdown','pointerup','click','keydown','wheel'])document.addEventListener(type,e=>{const t=e.target?.closest?.('button,input,select,main')||e.target;window.__fdEvidence({at:Date.now(),type,trusted:e.isTrusted,key:e.key,pointerType:e.pointerType,x:e.clientX,y:e.clientY,deltaY:e.deltaY,deltaMode:e.deltaMode,tag:t?.tagName,id:t?.id,label:t?.getAttribute?.('aria-label'),text:t?.textContent?.trim().slice(0,160)});},true);});
   await page.goto(BASE+'/fantasy-draft',{waitUntil:'domcontentloaded'});await starts().waitFor({state:'visible',timeout:20000});
   const help=page.getByRole('dialog',{name:'How to play',exact:true});if(await help.isVisible()){await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});}
   await answerConsent(page,{press:async target=>action('reject-optional-consent',target,()=>press(target),false)});check(await storedConsent(page)==='rejected',id+': optional consent rejected');
   await wait(()=>row.requests.some(r=>r.path==='/functions/v1/fantasy-draft-daily'&&r.outcome==='fixture-held'),id+': actual daily request is held');
   const pending=await frame('daily-held');check(!ruleReleased&&await starts().isDisabled(),id+': FD_NATIVE_PENDING actual Start disabled while daily request is pending');check(market().length===0&&!pending.poolPresent&&pending.human.length===0&&pending.ai.length===0&&pending.turn===null&&completions().length===0,id+': FD_NATIVE_PENDING no pool/admission/completion');
   await disabledAttempt('pending-start-attempt',starts());const still=await frame('pending-attempt-confirmed');equal(still.storage,pending.storage,id+': pending attempt full storage held');check(market().length===0&&!still.poolPresent&&still.human.length===0&&still.ai.length===0&&completions().length===0,id+': FD_NATIVE_PENDING trusted attempt cannot start or admit');
   await photo('pending-start',starts(),true);
   const releaseBefore=await frame('before-rule-release');ruleReleased=true;release();await wait(async()=>await starts().isEnabled()&&(await state()).ruleVisible,id+': actual Under25 response enables Start');const releaseAfter=await frame('after-rule-release');equal(releaseAfter.storage,releaseBefore.storage,id+': response does not rewrite storage');check(market().length===0&&releaseAfter.human.length===0&&releaseAfter.ai.length===0&&completions().length===0,id+': resolving criterion alone does not start');row.actions.push(put(id+'/rule-release',{before:releaseBefore,after:releaseAfter,transportOnly:true}));
   await action('start-after-criterion',starts(),async()=>{await press(starts());await pool().waitFor();},false);
   await wait(async()=>{const v=note(await state(),'await-first-human-turn');return v.turn==='user';},id+': actual first human turn arrives');
   const first=await frame('first-human-turn'),firstSeat=first.ai.length===0?'user':'ai';check(first.human.length===0&&first.ai.length<=1,id+': only natural initial AI pick may precede human');row.firstSeat=firstSeat;
   check(market().filter(r=>r.method==='GET'&&r.outcome==='fixture-fulfilled').length===1,id+': one actual27-row pool GET');
   for(const p of first.ai)check(byName.has(p.name)&&byName.get(p.name).age<=25,id+': initial AI obeys actual Under25');
   await action('search-veteran',search(),async()=>{if(mobile)await search().tap();else await search().focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(VETERAN,{delay:2});});
   const refused=await disabledAttempt('refuse-veteran',candidate(VETERAN));equal(refused.after.human,[],id+': actual over-age candidate cannot enter XI');check(completions().length===0,id+': refusal cannot complete');await photo('under25-refusal',candidate(VETERAN),true);
   const available=rawRows.find(p=>p.position==='FWD'&&p.age===24&&!first.ai.some(a=>a.name===p.name));check(!!available,id+': fictional young forward remains available');
   await action('search-young',search(),async()=>{if(mobile)await search().tap();else await search().focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(available.name,{delay:2});});
   await action('pick-young',candidate(available.name),()=>press(candidate(available.name)),false);
   const aiCount=firstSeat==='user'?2:1;await wait(async()=>{const v=note(await state(),'await-natural-snake-turns');return v.human.length===1&&v.ai.length===aiCount&&v.turn==='user';},id+': natural snake sequence returns to human');
   const final=await frame('after-one-human-and-initial-ai'),all=[...final.human,...final.ai];
   equal(final.human.map(p=>p.name),[available.name],id+': exactly the native selected young player admitted');check(all.every(p=>byName.has(p.name)&&byName.get(p.name).age<=25)&&new Set(all.map(p=>p.name)).size===all.length,id+': actual admitted identities unique and Under25');
   equal([final.round,final.nextPick],firstSeat==='user'?[2,4]:[2,3],id+': visible snake turn counter agrees with natural first seat');equal(final.storage,pending.storage,id+': real picks do not write persistent completion');check(completions().length===0,id+': no completion before full contest');row.observedSequence={firstSeat,sourceExpectedOwners:firstSeat==='user'?['user','ai','ai']:['ai','user'],human:final.human,ai:final.ai,nextOwner:final.turn};
   check(await roster().locator('[data-draft-slot]').count()===22,id+': original two11-slot rosters remain');await photo('initial-rosters',roster(),false,true);
   check(row.events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown'&&e.key==='Enter')),id+': actual native interaction mode');check(row.errors.length===0&&row.assetErrors.length===0&&row.routeErrors.length===0,id+': no App/local-asset/transport errors');check(row.requests.every(r=>['aborted','fixture-cors','fixture-fulfilled'].includes(r.outcome)),id+': no external forwarded or unresolved route');
   row.status='passed';console.log('PASS native FD criteria '+width+' first seat '+firstSeat);
  }catch(error){row.status='failed';row.error=String(error.stack||error);if(page&&!page.isClosed())await frame('failure').catch(()=>{});throw error;}
  finally{release();await context.close();put('report',report);}
 }
 check(report.screenshots.length===9,'Exactly9 actual native viewport PNGs');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
 if(browser)await browser.close();if(host)host.kill();
 report.sourceAfter=tracked();report.distAfter=inventory('dist');report.installedAfter=versions();report.offlineAfter=offline();report.offlineHeld=JSON.stringify(report.offlineBefore)===JSON.stringify(report.offlineAfter)&&report.offlineAfter.bytes===0;report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);report.installedHeld=JSON.stringify(report.installedBefore)===JSON.stringify(report.installedAfter);put('report',report);assert(report.sourceHeld&&report.distHeld&&report.installedHeld&&report.offlineHeld,'All tracked source/dist/521 locked versions and0B offline receipt held');
}
