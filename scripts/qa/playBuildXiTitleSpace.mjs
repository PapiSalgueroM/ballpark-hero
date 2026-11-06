// Actual built App title-space proof. No player fixtures, admissions or completion.
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

assert(process.env.CI, 'Remote CI only');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ARM=process.env.XI_TITLE_BROWSER_ARM||'fixed';
assert(['original','fixed'].includes(ARM),'XI_TITLE_BROWSER_ARM is original or fixed');
const OUT=path.resolve(ROOT,process.env.XI_TITLE_BROWSER_OUT||'xi-title-artifacts/browser-'+ARM);
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return {file,bytes:b.length,sha256:sha(b),blob:createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')};};
const put=(name,value)=>{const file=name+'.json',b=Buffer.from(JSON.stringify(value,null,2));fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),b);return {file,bytes:b.length,sha256:sha(b)};};
const inventory=dir=>fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(dir+'/'+e.name):e.isFile()?[receipt(dir+'/'+e.name)]:[]);
const component=receipt('src/components/lineup/TeamSpinner.tsx');
assert.equal(component.blob,ARM==='original'?'7777b6a3e115866c468fbd480820b6356066d91d':'aecb4220f2ff7bb063478a3ba88aa1ca45ddbaff','Exact physical title arm');
const entry="export {clubYearClubs} from './src/data/lineupTeams';";
const compiled=await build({stdin:{contents:entry,resolveDir:ROOT,sourcefile:'xi-title-oracle.ts',loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,metafile:true,alias:{'@':path.join(ROOT,'src')},logLevel:'error'});
const oracle=path.join(OUT,'oracle.cjs');fs.writeFileSync(oracle,compiled.outputFiles[0].contents);
const B=createRequire(import.meta.url)(oracle);assert(B.clubYearClubs.length===29,'Actual29 club pool required');
const sources=[...new Set(['src/pages/LineupBuilder.tsx','src/hooks/useLineupBuilder.ts','src/components/lineup/TeamSpinner.tsx','src/components/lineup/LineupHowToPlay.tsx','src/components/lineup/FormationPitch.tsx','src/components/game/PlayerAutocomplete.tsx','src/lib/playerSearch.ts','src/hooks/useGameCompletion.ts','src/lib/completions.ts','src/lib/safeStorage.ts','scripts/lib/offlineTransport.cjs','scripts/lib/playwrightLoader.mjs','scripts/lib/hostLikeServer.mjs','scripts/lib/answerConsent.mjs','scripts/qa/playBuildXiTitleSpace.mjs','package.json','package-lock.json',...Object.keys(compiled.metafile.inputs).filter(f=>f.startsWith('src/'))])].sort();
const report={status:'running',arm:ARM,checks:0,component,scope:'Actual built App, native2010 Club year/4-4-2 setup and natural rerolls at320/390/1280. Measures title content-area reservation against actual reroll geometry. No player selection, fixture fulfilment or completion.',limits:['No clock, RNG, source, DOM, storage or final-state injection. Every foreign transport is aborted, including fonts; fallback fonts only.','Text Range width classifies a long-name capture candidate only. It does not prove painted glyph intersection through overflow/ellipsis.','A maximum29 natural rerolls may repeat clubs or exclude clubs assigned to other positions. Missing a long-name capture is reported separately from the name-independent title-space result.','No warning-dialog, draft completion, metadata, Mixed, real roster or backend-write credit.'],sourceBefore:sources.map(receipt),distBefore:inventory('dist'),oracle:{entry,sha256:sha(compiled.outputFiles[0].contents),clubs:B.clubYearClubs},journeys:[],screenshots:[],businessFailures:[]};
const check=(ok,label)=>{report.checks++;assert(ok,label);};
const equal=(a,b,label)=>{report.checks++;assert.deepEqual(a,b,label);};
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(!(await fn())){assert(Date.now()<end,label);await new Promise(r=>setTimeout(r,40));}};
let browser,host;
try{
  const port=await new Promise((resolve,reject)=>{const p=createServer();p.once('error',reject);p.listen(0,'127.0.0.1',()=>{const n=p.address().port;p.close(()=>resolve(n));});});
  const BASE='http://127.0.0.1:'+port;report.base=BASE;
  host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Host startup timeout')),15000);host.stdout.on('data',b=>{if(String(b).includes('host-like server:')){clearTimeout(timer);resolve();}});host.once('error',reject);host.once('exit',code=>{clearTimeout(timer);reject(Error('Host exited '+code));});});
  browser=await pw.chromium.launch({headless:true});
  for(const [width,height] of [[320,568],[390,844],[1280,900]]){
    const id=String(width),mobile=width<1000,row={width,height,mode:mobile?'native touch':'native keyboard',status:'running',frames:[],actions:[],observations:[],requests:[],events:[],errors:[],assetErrors:[]};report.journeys.push(row);
    const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,serviceWorkers:'block'});
    let page;
    const press=async target=>{if(mobile)await target.tap();else{await target.focus();await target.press('Enter');}};
    const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;let last='',n=0;const end=performance.now()+10000;do{await new Promise(requestAnimationFrame);const signature=JSON.stringify([...document.querySelectorAll('button,input,select,main .font-display.truncate')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));n=signature===last?n+1:1;last=signature;if(n>=4&&!document.getAnimations().some(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)))return;}while(performance.now()<end);throw Error('Page did not settle');});
    const frame=async name=>{await settle();const v=await page.evaluate(()=>({at:Date.now(),viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),scroll:{x:scrollX,y:scrollY},storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),focus:{id:document.activeElement?.id,tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim()},body:document.body.innerText}));check(v.viewport.width===width&&v.documentWidth<=width,id+': actual width and no document overflow');row.frames.push(put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,v));return v;};
    const action=async(name,target,work,held=true)=>{if(target){await target.scrollIntoViewIfNeeded();await settle();check(await target.count()===1&&await target.isVisible(),id+': one visible target');const hit=await target.evaluate(el=>{const r=el.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>0&&r.height>0&&!el.matches(':disabled')&&(e===el||el.contains(e));});check(hit,id+': native target center reachable');}const before=await frame(name+'-before'),start=row.events.length;await work();const after=await frame(name+'-after');if(held){equal(after.scroll,before.scroll,id+': exact prepared scroll held '+name);equal(after.storage,before.storage,id+': full storage held '+name);}row.actions.push(put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,held,before,after,events:row.events.slice(start)}));return {before,after};};
    const reroll=()=>page.getByTitle('Reroll club',{exact:true});
    const inspect=async name=>{
      await reroll().waitFor({state:'visible',timeout:15000});await settle();
      const v=await reroll().evaluate(button=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const card=button.parentElement.firstElementChild,title=card.querySelector('.font-display.truncate'),hint=[...card.querySelectorAll('p')].find(p=>p.textContent.startsWith('Matching '));
        const t=rect(title),b=rect(button),s=getComputedStyle(title),number=k=>parseFloat(s[k])||0;
        const range=document.createRange();range.selectNodeContents(title);const intrinsicWidth=range.getBoundingClientRect().width;
        const h=rect(hint),hr=document.createRange();hr.selectNodeContents(hint);
        const left=t.x+number('borderLeftWidth')+number('paddingLeft'),right=t.right-number('borderRightWidth')-number('paddingRight');
        return {club:title.textContent.trim(),card:rect(card),title:{rect:t,paddingLeft:number('paddingLeft'),paddingRight:number('paddingRight'),borderLeft:number('borderLeftWidth'),borderRight:number('borderRightWidth'),contentLeft:left,contentRight:right,contentWidth:right-left,intrinsicTextWidth:intrinsicWidth,overflow:s.overflow,textOverflow:s.textOverflow,whiteSpace:s.whiteSpace,font:s.font},button:{rect:b,title:button.title},verticalOverlap:Math.min(t.bottom,b.bottom)-Math.max(t.y,b.y),reserved:right<=b.x,longForUnreservedArea:intrinsicWidth>b.x-left,hint:{rect:h,text:hint.textContent,visibility:getComputedStyle(hint).visibility,ariaHidden:hint.getAttribute('aria-hidden'),clientWidth:hint.clientWidth,scrollWidth:hint.scrollWidth,clientHeight:hint.clientHeight,scrollHeight:hint.scrollHeight,ranges:[...hr.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom}))}};
      });
      row.observations.push(put(id+'/observations/'+String(row.observations.length).padStart(3,'0')+'-'+name,v));
      check(B.clubYearClubs.includes(v.club),id+': actual bundled club identity');
      check(v.button.rect.width>=44&&v.button.rect.height>=44&&v.title.contentWidth>0&&v.verticalOverlap>0,id+': native44px reroll and measured title row share positive vertical overlap');
      check(v.title.overflow==='hidden'&&v.title.textOverflow==='ellipsis'&&v.title.whiteSpace==='nowrap',id+': existing title truncation stays intact');
      check(v.hint.text==='Matching '+v.club+' records from 2010'&&v.hint.visibility==='visible'&&v.hint.ariaHidden===null,id+': full native club/year hint remains visible');
      check(v.hint.scrollWidth<=v.hint.clientWidth&&v.hint.scrollHeight<=v.hint.clientHeight&&v.hint.ranges.every(r=>r.x>=v.hint.rect.x-0.5&&r.right<=v.hint.rect.right+0.5&&r.y>=v.hint.rect.y-0.5&&r.bottom<=v.hint.rect.bottom+0.5),id+': full matching hint is not clipped');
      check(await page.getByText('0/11',{exact:true}).count()===1,id+': no admission');
      return v;
    };
    try{
      await context.routeWebSocket('**/*',r=>{row.requests.push({url:r.url(),method:'WEBSOCKET',outcome:'aborted'});r.close({code:1008,reason:'Offline title proof'});});
      await context.route('**/*',r=>{if(new URL(r.request().url()).origin===BASE)return r.continue();row.requests.push({url:r.request().url(),method:r.request().method(),outcome:'aborted'});return r.abort('blockedbyclient');});
      page=await context.newPage();page.on('pageerror',e=>row.errors.push(String(e)));
      page.on('response',r=>{if(new URL(r.url()).origin===BASE&&r.status()>=400)row.assetErrors.push({url:r.url(),status:r.status()});});
      page.on('requestfailed',r=>{if(new URL(r.url()).origin===BASE)row.assetErrors.push({url:r.url(),failure:r.failure()});});
      await page.exposeBinding('__xiTitleEvidence',(_source,event)=>row.events.push(event));
      await page.addInitScript(()=>{for(const type of ['pointerup','click','keydown'])document.addEventListener(type,e=>{const t=e.target?.closest?.('button,input,select,main');if(t)window.__xiTitleEvidence({at:Date.now(),type,trusted:e.isTrusted,key:e.key,ctrlKey:e.ctrlKey,pointerType:e.pointerType,targetId:t.id,tag:t.tagName,text:t.textContent?.trim()});},true);});
      await page.goto(BASE+'/build-your-xi',{waitUntil:'networkidle'});
      const help=page.getByRole('dialog',{name:'How to Play: Build Your XI',exact:true});
      if(await help.isVisible())await action('dismiss-initial-help',null,async()=>{await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});},false);
      await answerConsent(page,{press:async t=>action('reject-optional-consent',t,()=>press(t),false)});check(await storedConsent(page)==='rejected',id+': optional consent refused');
      const clubYear=page.getByRole('button',{name:'Club year draft',exact:true});
      await action('choose-club-year',clubYear,()=>press(clubYear),false);
      const year=page.getByLabel('Recorded year',{exact:true}),options=await year.locator('option').evaluateAll(es=>es.map(e=>e.value)),yearIndex=options.indexOf('2010');check(yearIndex>=0,id+': actual2010 option');
      await action('choose-native-2010',year,async()=>{if(mobile)await year.tap();else await year.focus();await page.keyboard.press('Home');for(let n=0;n<yearIndex;n++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');},false);check(await year.inputValue()==='2010',id+': actual native year selected');
      const formation=page.getByRole('button',{name:/^4-4-2\b/});await action('choose-formation',formation,()=>press(formation),false);
      let observed=await inspect('initial'),rerolls=0;const baseline=await frame('empty-draft-baseline');
      row.reservationResults=[observed.reserved];
      while(mobile&&!observed.longForUnreservedArea&&rerolls<29){
        const previous=observed.club;
        await action('natural-reroll-'+rerolls,reroll(),async()=>{await press(reroll());await reroll().waitFor({state:'hidden'});await reroll().waitFor({state:'visible',timeout:15000});});
        observed=await inspect('reroll-'+rerolls);check(observed.club!==previous,id+': real reroll changes current club');row.reservationResults.push(observed.reserved);rerolls++;
      }
      row.rerolls=rerolls;row.longCapture={found:observed.longForUnreservedArea,requiredForQualification:false,boundedRerolls:29,scope:mobile?'Natural mobile candidate search':'Desktop reservation proof, no long overflow requirement'};
      const main=page.locator('#dukb-main'),prep=await action('native-photo-preparation',null,async()=>{await main.focus();await page.keyboard.press('Control+Home');await wait(()=>page.evaluate(()=>scrollX===0&&scrollY===0),'Native Home reaches document origin');},false);
      equal(prep.after.scroll,{x:0,y:0},id+': actual origin before capture');equal(prep.after.storage,prep.before.storage,id+': native preparation storage held');
      check(row.events.some(e=>e.trusted&&e.type==='keydown'&&e.ctrlKey&&e.key==='Home'&&e.targetId==='dukb-main'),id+': actual trusted main Home observed');
      observed=await inspect('prepared-capture');row.reservationResults.push(observed.reserved);
      const chrome=await page.evaluate(()=>[...document.querySelectorAll('body *')].flatMap(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return ['fixed','sticky'].includes(s.position)&&s.visibility!=='hidden'&&s.display!=='none'&&r.width>=innerWidth/2&&r.height>0&&r.y<=1&&r.bottom>0?[{tag:e.tagName,id:e.id,position:s.position,y:r.y,bottom:r.bottom}]:[];}));
      check(observed.card.y>=Math.max(0,...chrome.map(e=>e.bottom)),id+': actual spinner below top chrome');
      const capture=await frame('photo');equal(capture.storage,baseline.storage,id+': entire empty draft preserves storage');
      const clip={x:0,y:Math.max(0,Math.floor(observed.card.y-12)),width,height:Math.min(capture.documentHeight-Math.max(0,Math.floor(observed.card.y-12)),Math.ceil(observed.card.height+24))};
      const file=id+'-native-title.png';await page.screenshot({path:path.join(OUT,file),fullPage:true,clip});const bytes=fs.readFileSync(path.join(OUT,file));report.screenshots.push({file,bytes:bytes.length,sha256:sha(bytes),clip,frame:row.frames.at(-1),observation:row.observations.at(-1),chrome});
      check(row.errors.length===0&&row.assetErrors.length===0,id+': no App or local asset errors');
      check(row.requests.every(r=>r.outcome==='aborted')&&!row.requests.some(r=>/\/(player_market_values|player_verified_positions|validate-player|evaluate-lineup|game_completions)$/.test(new URL(r.url).pathname)),id+': no player transport or completion and all foreign blocked');
      check(row.events.some(e=>e.trusted&&(mobile?e.pointerType==='touch':e.type==='keydown'&&e.key==='Enter')),id+': native interaction mode observed');
      report.checks++;row.spacePassed=row.reservationResults.every(Boolean);if(!row.spacePassed)report.businessFailures.push({id:'TITLE_SPACE_'+width,width,failedObservations:row.reservationResults.filter(v=>!v).length,label:'Title content area must end before actual reroll button'});
      row.status=row.spacePassed?'passed':'business-failed';console.log((row.spacePassed?'PASS ':'FAIL TITLE_SPACE_')+width);
    }catch(error){row.status='setup-or-preserve-failed';row.error=String(error.stack||error);throw error;}
    finally{await context.close();put('report',report);}
  }
  check(report.screenshots.length===3,'Exactly three actual native title captures');
  check(report.journeys.length===3,'Three actual App title journeys retained');
  report.status=report.businessFailures.length?'business-failed':'passed';
  assert.equal(report.businessFailures.length,0,'TITLE_SPACE_RESERVATION: '+report.businessFailures.map(f=>f.id).join(','));
}catch(error){if(report.status!=='business-failed')report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
  if(browser)await browser.close();if(host)host.kill();
  report.sourceAfter=sources.map(receipt);report.distAfter=inventory('dist');report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);
  put('report',report);assert(report.sourceHeld&&report.distHeld,'Source/dist bodies stay byte-identical');
}
