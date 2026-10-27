// Actual footer reachability on immutable production source. Remote CI only.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
assert(process.env.CI, 'Footer reachability runs only in remote CI');
process.env.CAREER_STORY_ROLE_IMPORT_ONLY = '1';
process.env.CAREER_STORY_ROLE_CHAIN_REF = '';
const { bundleCareerStoryRole, withCareerStorySeed } = await import('../simCareerStoryRole.mjs');
const ROOT=process.cwd(),OUT=path.resolve(process.env.FOOTER_REACHABILITY_OUT||'.tmp-fx/footer-reachability'),CACHE=path.resolve(process.env.FREE_KICK_FONT_CACHE);
const KEY='soccerCareerSave',NOW=1791586800000,BASE_HEAD='b20ec6664df9d4c58d63ea0596791d33b2a3b8fc';
const copy=value=>JSON.parse(JSON.stringify(value)),sha=value=>createHash('sha256').update(value).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const pins={
  'src/pages/SoccerCareer.tsx':'17855634c09d3e07e7bff65a80ff28015d201d96',
  'src/components/game/Footer.tsx':'969a25f428fdb74df89c59342b6872bf97de08ba',
  'src/App.tsx':'b988c18c60d3fd7e1a010cb277a39736d07135e8',
  'src/hooks/useRevealScroll.ts':'0cd106080bfb4e0461d9b86f0a973689f717d502',
  'scripts/playCareerStoryRole.mjs':'c905ef541c8e04e1353d3bce029dafd1b17f2eff',
  'scripts/simCareerStoryRole.mjs':'9aa7ba3e27b8d5d8a6ce96c069c786e435813cd8'
};
function sourceHashes(){return Object.fromEntries(Object.keys(pins).map(file=>{const bytes=fs.readFileSync(path.join(ROOT,file));assert.equal(blob(bytes),pins[file],file+' retains immutable main body');return[file,sha(bytes)];}));}
fs.mkdirSync(OUT,{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const report={base:BASE_HEAD,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[],controls:[],checks:0,failed:0,forwardedExternalRequests:0,sourceBefore:sourceHashes(),scope:'Original production page. Per-stop overlap is recorded; each actual legal line must be readable at some reachable document stop. No product mutation.'};
const fonts=new Map(JSON.parse(fs.readFileSync(path.join(CACHE,'manifest.json'),'utf8')).map(entry=>{
  assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));const body=fs.readFileSync(path.join(CACHE,entry.file));assert.equal(sha(body),entry.sha256);
  return[entry.url,{body,contentType:entry.contentType}];
}));
assert(fonts.size>0,'Actual retained font cache is populated');
const B=await bundleCareerStoryRole();
assert(B.loaded.some(row=>row.file==='src/lib/soccerCareerEngine.ts'),'Actual current engine loaded');
for(const row of B.loaded){assert.equal(row.original,false);assert.equal(row.sha256,row.afterSha256,'Fixture source has no attribution or copied mutation');assert.equal(row.sha256,sha(fs.readFileSync(path.join(ROOT,row.file))),row.file+' is the selected actual source body');}
write('fixture-source',{producer:'Unchanged playCareerStoryRole actual seeded fixture driver and preparation',loaded:B.loaded});
const captured=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/data/careerLeagueWorldSaves1100.json'),'utf8')).saves.find(save=>save.id==='ere').state;
const seenWheel = s => (s.chanceWheel && s.chanceWheel.seen === false ? { ...s, chanceWheel: { ...s.chanceWheel, seen: true } } : s);
function step(E, s) {
  const clubs = E.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': assert(s.pendingOffers?.length, 'Actual contract screen has an offer'); return E.acceptOffer(s, s.pendingOffers[0]);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': assert(s.pendingEvents?.length, 'Actual event screen has a choice'); return seenWheel(E.applyEventChoice(s, s.pendingEvents[0].choices.length - 1, clubs));
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, s.pendingMoralDilemma.choices.length - 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'club_move': return E.stayAtClub(s);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`No actual fixture driver for ${s.phase}`);
  }
}
const prepared = withCareerStorySeed(118900, () => {
  let s = B.soccer.repairCareer(copy(captured)), playing;
  for (let turn = 0; turn < 650 && !s.retired; turn++) {
    const latest = s.seasons.at(-1);
    if (s.phase === 'playing' && !s.loan && s.story?.length >= 12 && latest?.type === 'playing' && latest.apps > 0 && !latest.injurySevere && !['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(s.currentClub)) playing = copy(s);
    s = step(B.soccer, copy(s));
  }
  assert(playing?.story?.length >= 12, 'Actual engine produces a navigable recorded career');
  const retired = B.soccer.choosePostRetirement(B.soccer.manualRetire(copy(playing)), 'retire', B.soccer.FALLBACK_CLUBS);
  playing.reducedRole = { club: playing.currentClub, year: playing.seasons.at(-1).year + 1 };
  return { playing, retired };
});
write('fixture-preparation',{seed:118900,draws:prepared.draws,playing:prepared.value.playing,retired:prepared.value.retired,scope:'Actual fictional engine career, as used by the qualified story-role browser. No real person or historical outcome is invented.'});
const observer=await build({stdin:{contents:"export { topInset } from './src/hooks/useRevealScroll'; export { parseSoccerCareerSave } from './src/lib/soccerCareerSave';",resolveDir:ROOT,loader:'ts'},bundle:true,platform:'browser',format:'iife',globalName:'__footerTraceOracle',write:false,jsx:'automatic',metafile:true,alias:{'@':path.join(ROOT,'src')},define:{'import.meta.env':'{"DEV":false,"PROD":true,"MODE":"production"}'},logLevel:'error'});
write('observer-metafile',observer.metafile);
function reachable(trace,lineCount){const found=new Set();for(const stop of trace)for(const line of stop.lines)if(line.inside&&line.points.length>0&&line.points.every(p=>p.inside&&p.painted))found.add(line.index);return Array.from({length:lineCount},(_,index)=>index).filter(index=>!found.has(index));}
const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});});
const BASE='http://127.0.0.1:'+port,server=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,serverLog='';
const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owned host start timeout')),15000);server.once('error',e=>{clearTimeout(timer);reject(e);});server.once('exit',code=>{clearTimeout(timer);reject(Error('Owned host exited '+code+': '+serverLog));});server.stdout.on('data',data=>{serverLog+=data;if(serverLog.includes('host-like server:')){clearTimeout(timer);resolve();}});server.stderr.on('data',data=>serverLog+=data);});
try{
  await ready;browser=await pw.chromium.launch({headless:true});
  for(const profile of [{width:320,height:568,touch:true},{width:390,height:844,touch:true},{width:430,height:932,touch:true},{width:1440,height:900,touch:false}])for(const kind of ['playing','summary','retired']){
    const id=profile.width+'-'+kind,row={id,...profile,kind,checks:[],errors:[],assetErrors:[],intercepted:[],writes:[],trace:[],captures:[],ok:false};report.cases.push(row);
    const check=(ok,label)=>{report.checks++;row.checks.push({ok:!!ok,label});assert(ok,id+': '+label);};
    const fixture=copy(prepared.value[kind==='retired'?'retired':'playing']);
    if(kind==='summary'){fixture.phase='season_summary';delete fixture.reducedRole;const last=fixture.seasons.at(-1);assert(last?.type==='playing'&&last.apps>0,'Summary shows an actual recorded senior year');fixture.pendingSummary=copy(last);}
    write(id+'-fixture',{fixture,scope:kind==='summary'?'Only presentation phase and pendingSummary select the actual last recorded year. All stats are its real seeded engine outcome.':'Actual seeded engine fixture.'});
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,colorScheme:'dark',reducedMotion:'reduce',serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:KEY,value:JSON.stringify(fixture)},{name:'cookie-consent',value:'essential'},{name:'dukb-theme',value:'dark'},{name:'dukb-guest-handle',value:'SteadyVolley-18'}]}]}});
    await context.addInitScript(now=>{const OldDate=Date;window.Date=class extends OldDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};},NOW);
    await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin===BASE){assert(['GET','HEAD'].includes(request.method()));return route.continue();}row.intercepted.push({method:request.method(),origin:url.origin,path:url.pathname,blocked:true});if(!['GET','HEAD','OPTIONS'].includes(request.method()))row.writes.push({method:request.method(),path:url.pathname,blocked:true});if(request.method()==='GET'&&fonts.has(url.href))return route.fulfill({status:200,...fonts.get(url.href)});if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)){row.assetErrors.push('Uncached font '+url.href);return route.abort();}if(request.resourceType()==='image')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>'});return route.fulfill({status:200,contentType:request.resourceType()==='stylesheet'?'text/css':'application/json',body:request.resourceType()==='stylesheet'?'':'[]'});});
    await context.routeWebSocket('**/*',socket=>socket.close());
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>row.errors.push(String(error)));page.on('requestfailed',request=>{if(request.url().startsWith(BASE))row.assetErrors.push(request.url()+': '+request.failure()?.errorText);});page.on('response',response=>{if(response.url().startsWith(BASE)&&response.status()>=400)row.assetErrors.push(response.url()+': '+response.status());});
    const raw=()=>page.evaluate(key=>localStorage.getItem(key),KEY);
    const body=()=>page.evaluate(()=>({x:scrollX,y:scrollY,inline:document.body.style.overflow,computed:getComputedStyle(document.body).overflow,locked:document.body.getAttribute('data-scroll-locked')}));
    const sample=()=>page.evaluate(async requested=>{
      await document.fonts.ready;
      const read=()=>{
        const paragraph=document.querySelector('footer > p'),footer=document.querySelector('footer');if(!paragraph||!footer)throw Error('Actual legal footer paragraph missing');
        const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right});
        const inset=window.__footerTraceOracle.topInset(),width=requested.width,height=requested.height,lines=[],walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);let node,nodeIndex=0;
        while((node=walker.nextNode())){for(const match of node.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);let part=0;for(const r of range.getClientRects()){if(r.width<=0||r.height<=0)continue;let line=lines.find(v=>Math.abs(v.top-r.top)<0.5&&Math.abs(v.bottom-r.bottom)<0.5);if(!line){line={index:lines.length,top:r.top,bottom:r.bottom,left:r.left,right:r.right,words:[],points:[]};lines.push(line);}line.left=Math.min(line.left,r.left);line.right=Math.max(line.right,r.right);line.words.push({id:nodeIndex+':'+match.index+':'+part++,text:match[0]});for(const fraction of [.25,.5,.75]){const x=r.left+r.width*fraction,y=r.top+r.height/2,inside=x>=0&&x<width&&y>=inset&&y<height,hit=inside?document.elementFromPoint(x,y):null;line.points.push({x,y,inside,painted:!!hit&&paragraph.contains(hit),hit:hit?{tag:hit.tagName,bar:!!hit.closest('[data-career-action-bar="floating"]'),chrome:!!hit.closest('[data-site-chrome]')}:null});}}}nodeIndex++;}
        for(const line of lines){line.inside=line.left>=-0.5&&line.right<=width+0.5&&line.top>=inset-0.5&&line.bottom<=height+0.5;line.text=line.words.map(v=>v.text).join(' ');}
        const bar=document.querySelector('[data-career-action-bar="floating"]'),active=document.activeElement;
        return{page:{x:scrollX,y:scrollY,maxScroll:Math.max(0,document.documentElement.scrollHeight-innerHeight)},viewport:{requested,inner:[innerWidth,innerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],visual:visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null},topInset:inset,footer:rect(footer.getBoundingClientRect()),paragraph:rect(paragraph.getBoundingClientRect()),legalText:paragraph.textContent.replace(/\s+/g,' ').trim(),lines,bar:bar?{rect:rect(bar.getBoundingClientRect()),transform:getComputedStyle(bar).transform,visibility:getComputedStyle(bar).visibility,focused:bar.contains(active),targetRetained:!!window.__footerTraceFocusedAction&&active===window.__footerTraceFocusedAction}:null,fonts:document.fonts.status,finite:document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity).length,overflow:document.documentElement.scrollWidth>width+1};
      };
      const started=performance.now();let previous='',stable=0,last;do{await new Promise(requestAnimationFrame);last=read();const signature=JSON.stringify(last);stable=signature===previous?stable+1:1;previous=signature;if(stable>=4&&last.fonts==='loaded'&&last.finite===0)return{...last,stable};}while(performance.now()-started<2500);return{...last,stable};
    },page.viewportSize());
    const validate=(o,name)=>{check(o.stable>=4&&o.fonts==='loaded'&&o.finite===0,name+': actual fonts, finite animation and geometry settle');check(!o.overflow&&o.viewport.inner[0]<=profile.width+1&&o.viewport.client[0]<=profile.width+1&&(!o.viewport.visual||Math.abs(o.viewport.visual.scale-1)<0.01),name+': requested viewport and no horizontal overflow');check(o.lines.length>0&&o.legalText.includes('independent fan project')&&o.legalText.includes('UEFA')&&o.legalText.includes('Player names and statistics'),name+': actual complete legal copy is present');if(kind!=='summary')check(o.bar?.targetRetained===true,name+': focused actual floating action is retained');};
    const capture=async(name,observation)=>{const file=id+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});row.captures.push({name,file,sha256:sha(fs.readFileSync(path.join(OUT,file))),scrollY:observation.page.y});};
    let canonicalBytes,original;
    try{
      await page.goto(BASE+'/soccer-career',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'How to play',exact:true}).waitFor({timeout:45000});await page.locator('[data-career-utilities]').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);
      const first=await raw();check(typeof first==='string'&&first.length>0,'Official initial page loader retains a career');await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'How to play',exact:true}).waitFor({timeout:45000});await page.locator('[data-career-utilities]').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);canonicalBytes=await raw();write(id+'-bootstrap',{fixture:JSON.stringify(fixture),first,second:canonicalBytes});check(canonicalBytes===first,'Second official load preserves every canonical raw saved byte');
      await page.addScriptTag({content:observer.outputFiles[0].text});check(await page.evaluate(raw=>!!window.__footerTraceOracle.parseSoccerCareerSave(raw),canonicalBytes),'Canonical raw save parses through the actual save module');
      original=await body();await page.evaluate(()=>{window.__footerTraceReturnFocus=document.activeElement;});
      const bar=page.locator('[data-career-action-bar="floating"]');if(kind==='summary')check(await bar.count()===0,'Summary has no floating action bar');else{check(await bar.count()===1,'The actual career action bar floats');await bar.locator('button').first().evaluate(el=>{window.__footerTraceFocusedAction=el;el.focus({preventScroll:true});});}
      const initial=await sample();validate(initial,'initial');const identities=JSON.stringify(initial.lines.map(v=>v.words));row.legalText=initial.legalText;row.lineCount=initial.lines.length;row.start=initial;
      const footerDocumentY=initial.page.y+initial.footer.top,start=Math.max(0,Math.floor(footerDocumentY-profile.height+initial.topInset)),end=initial.page.maxScroll,step=Math.max(16,Math.floor(profile.height/10));
      const stops=[];for(let y=start;y<end;y+=step)stops.push(y);stops.push(end);check(stops.length>1&&stops.length<=48,'Natural reachable footer scan is bounded');let best=null,bestCount=-1;
      for(const requestedY of stops){await page.evaluate(y=>scrollTo({left:0,top:y,behavior:'instant'}),requestedY);const observation=await sample();validate(observation,'stop '+requestedY);check(Math.abs(observation.page.y-Math.min(requestedY,observation.page.maxScroll))<=1,'Requested stop is a natural clamped document scroll');check(JSON.stringify(observation.lines.map(v=>v.words))===identities&&observation.legalText===initial.legalText,'Every stop observes the same actual legal lines and text');check(await raw()===canonicalBytes,'Scroll and focused inspection preserve the complete raw save');row.trace.push({requestedY,...observation});const count=observation.lines.filter(v=>v.inside&&v.points.every(p=>p.inside&&p.painted)).length;if(count>bestCount){best=observation;bestCount=count;}}
      const missing=reachable(row.trace,row.lineCount);row.coverage={missing,readableLines:row.lineCount-missing.length,totalLines:row.lineCount,perStop:row.trace.map(v=>({scrollY:v.page.y,readable:v.lines.filter(line=>line.inside&&line.points.every(p=>p.inside&&p.painted)).map(line=>line.index),barIntersections:v.lines.filter(line=>line.points.some(p=>p.hit?.bar)).map(line=>line.index)}))};write(id+'-trace',row.trace);write(id+'-coverage',row.coverage);check(missing.length===0,'Every actual legal line is readable at some reachable natural scroll stop');await capture('footer-end',row.trace.at(-1));
      await page.evaluate(y=>scrollTo({left:0,top:y,behavior:'instant'}),best.page.y);const bestObservation=await sample();validate(bestObservation,'best reachability');await capture('best-reachability',bestObservation);row.best={scrollY:bestObservation.page.y,readableLines:bestCount};
      if(!report.controls.length){const healthy=copy(row.trace),faulty=copy(healthy),target=0,before=JSON.stringify(faulty);for(const stop of faulty)for(const line of stop.lines)if(line.index===target)for(const point of line.points)point.painted=false;const changed=JSON.stringify(faulty);check(changed!==before,'Copied obstruction changes actual observed point visibility');assert.deepEqual(reachable(faulty,row.lineCount),[target],'A copied line obstructed at every stop is rejected exactly');write('control-copied-obstruction-before',healthy);write('control-copied-obstruction-changed',faulty);for(let i=0;i<faulty.length;i++)for(let j=0;j<faulty[i].lines.length;j++)faulty[i].lines[j].points=copy(healthy[i].lines[j].points);check(JSON.stringify(faulty)===before&&reachable(faulty,row.lineCount).length===0,'Copied detector restores the complete actual observation');write('control-copied-obstruction-restored',faulty);report.controls.push({name:'unreachable-legal-line',scope:'Copied actual observations only. No served product mutation or fault pixels.',target,changed:true,missing:[target],restored:true,before:sha(before),changedSha256:sha(changed),restoredSha256:sha(JSON.stringify(faulty))});}
      await page.evaluate(before=>{const target=window.__footerTraceReturnFocus;if(target===document.body){if(document.activeElement instanceof HTMLElement)document.activeElement.blur();}else target?.focus({preventScroll:true});scrollTo({left:before.x,top:before.y,behavior:'instant'});},original);await sample();const after=await body(),focusRestored=await page.evaluate(()=>document.activeElement===window.__footerTraceReturnFocus);row.restoration={before:original,after,focusRestored};assert.deepEqual(after,original);check(focusRestored,'Original focus and complete page/body scroll state are restored');check(await raw()===canonicalBytes,'Every canonical raw saved byte is restored without gameplay');write(id+'-raw-save',{before:canonicalBytes,after:await raw()});check(row.errors.length===0&&row.assetErrors.length===0,'No actual page or local asset errors');row.ok=true;
    }catch(error){report.failed++;row.error=String(error.stack||error);const failure={error:row.error,url:page.url(),raw:await raw().catch(()=>null),body:await body().catch(()=>null),observation:await sample().catch(e=>({observerError:String(e)}))};write(id+'-failure',failure);await fs.promises.writeFile(path.join(OUT,id+'-failure.html'),await page.content().catch(()=>''));await page.screenshot({path:path.join(OUT,id+'-failure.png')}).catch(()=>{});}
    finally{write(id+'-report',row);await context.close();}
  }
  report.sourceAfter=sourceHashes();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.fontManifestEntries=fonts.size;
}finally{await browser?.close();server.kill();fs.writeFileSync(path.join(OUT,'server.log'),serverLog);write('report',report);}
console.log('Footer reachability: '+report.checks+' checks; '+report.cases.filter(row=>row.ok).length+'/'+report.cases.length+' original journeys; '+report.failed+' failed; '+report.controls.length+' copied detector control');
assert.equal(report.cases.length,12);assert.equal(report.controls.length,1);assert.equal(report.failed,0);assert(report.cases.every(row=>row.ok));
