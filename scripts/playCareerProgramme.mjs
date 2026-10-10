// Play the production careers, save choices, advance a season and reload.
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import pw from './lib/playwrightLoader.mjs';
assert(process.env.CI, 'Native programme checks run remotely');
const out=path.resolve('career-programme-artifacts/native');fs.mkdirSync(out,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex'),fixtures=JSON.parse(fs.readFileSync('career-programme-artifacts/native-fixtures.json','utf8'));
const fontManifest=JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,'manifest.json'),'utf8'));
const fonts=new Map(fontManifest.map(v=>{const body=fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,v.file));assert.equal(sha(body),v.sha256);return[v.url,{body,contentType:v.contentType}];}));
const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});
const base='http://127.0.0.1:'+port,server=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server start timeout')),15000);server.stdout.on('data',v=>{if(String(v).includes('host-like server:')){clearTimeout(timer);resolve();}});server.once('error',reject);server.once('exit',v=>reject(Error('Server exited '+v)));});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[],checks:0,forwarded:0,controls:[],fontManifest,scope:'Actual production actions and raw saved-byte holds. The seeded page stream is fixture setup, not an independent native RNG oracle.'};
const browser=await pw.chromium.launch({headless:true});
function layoutFailures(v){return[...(v.overflow?['overflow']:[]),...(!v.inside?['dialog-viewport']:[]),...(!v.painted?['dialog-painted']:[]),...(v.stableFrames<4||v.finiteAnimations||v.fonts!=='loaded'||v.fontFaces.some(f=>f.status==='error')?['capture-readiness']:[]),...(v.controls.some(c=>c.width<43.5||c.height<43.5)?['touch-size']:[]),...(v.controls.some(c=>!c.painted&&!c.clipped)?['painted-controls']:[])];}
try{for(const width of[320,390,1280])for(const fixture of fixtures){const id=width+'-'+fixture.slug+(fixture.id?'-'+fixture.id:''),soccer=fixture.slug==='soccer-career',row={id,choices:[],shots:[],layouts:[],reloads:[],errors:[],assetErrors:[],blocked:[],fontsUsed:[],checks:0};report.cases.push(row);
  const context=await browser.newContext({viewport:{width,height:width===320?568:width===390?844:900},hasTouch:width<1000,isMobile:width<1000}),page=await context.newPage();
  const check=(value,label)=>{assert(value,id+': '+label);report.checks++;row.checks++;};
  const bodyState=()=>page.evaluate(()=>({y:scrollY,overflow:document.body.style.overflow,computed:getComputedStyle(document.body).overflow,locked:document.body.getAttribute('data-scroll-locked')}));
  try{await context.route('**/*',async route=>{const req=route.request(),url=req.url();if(url.startsWith(base+'/'))return route.continue();if(fonts.has(url)){row.fontsUsed.push(url);return route.fulfill(fonts.get(url));}if(url.startsWith('data:'))return route.continue();row.blocked.push({url,method:req.method()});if(req.method()!=='GET')return route.fulfill({status:200,contentType:'application/json',body:'{}'});if(url.includes('/rest/v1/'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});return route.abort();});
    await context.addInitScript(({key,value})=>{if(!sessionStorage.getItem('programme-seeded:'+key)){localStorage.setItem(key,JSON.stringify(value));sessionStorage.setItem('programme-seeded:'+key,'1');}localStorage.setItem('dukb-cookie-consent','essential');let n=1197;Math.random=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};},fixture);
    page.on('pageerror',e=>row.errors.push(String(e)));
    page.on('requestfailed',r=>{if(r.url().startsWith(base+'/assets/'))row.assetErrors.push({url:r.url(),error:r.failure()?.errorText});});
    page.on('response',r=>{if(r.url().startsWith(base+'/assets/')&&r.status()>=400)row.assetErrors.push({url:r.url(),status:r.status()});});
    await page.goto(base+'/'+fixture.slug,{waitUntil:'networkidle'});
    const bytes=()=>page.evaluate(key=>localStorage.getItem(key),fixture.key),before=await bytes();
    const dialogSelector=fixture.id==='wheel'?'[data-career-chance-wheel]':soccer?'[data-soccer-programme]':'[data-us-programme="dialog"]',dialog=page.locator(dialogSelector);
    async function measure(name,target=dialog){
      await page.evaluate(async()=>{await document.fonts.ready;});
      const v=await target.evaluate(async e=>{
        const sample=()=>{
          const r=e.getBoundingClientRect(),rect=x=>({x:x.x,y:x.y,width:x.width,height:x.height,top:x.top,bottom:x.bottom,left:x.left,right:x.right});
          const points=x=>{const ix=Math.min(8,x.width/4),iy=Math.min(8,x.height/4);return[[x.x+x.width/2,x.y+x.height/2],[x.left+ix,x.top+iy],[x.right-ix,x.top+iy],[x.left+ix,x.bottom-iy],[x.right-ix,x.bottom-iy]];};
          const hits=(element,x)=>points(x).map(([px,py])=>{const hit=document.elementFromPoint(px,py);return !!hit&&(hit===element||element.contains(hit));});
          const skipped=[],controls=[...e.querySelectorAll('button')].flatMap(b=>{
            const x=b.getBoundingClientRect(),style=getComputedStyle(b);if(style.display==='none'||style.visibility==='hidden'||x.width===0||x.height===0){skipped.push({label:b.textContent,reason:'hidden'});return[];}
            const clip={left:0,right:innerWidth,top:0,bottom:innerHeight};
            for(let parent=b.parentElement;parent;parent=parent.parentElement){const ps=getComputedStyle(parent),pr=parent.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(ps.overflowX)){clip.left=Math.max(clip.left,pr.left);clip.right=Math.min(clip.right,pr.right);}if(/auto|scroll|hidden|clip/.test(ps.overflowY)){clip.top=Math.max(clip.top,pr.top);clip.bottom=Math.min(clip.bottom,pr.bottom);}}
            const paintedPoints=hits(b,x);return[{label:b.getAttribute('aria-label')||b.textContent,disabled:b.disabled,...rect(x),clip,paintedPoints,painted:Number(style.opacity)>0&&paintedPoints.every(Boolean),clipped:x.left<clip.left-0.5||x.right>clip.right+0.5||x.top<clip.top-0.5||x.bottom>clip.bottom+0.5}];
          });
          const style=getComputedStyle(e),center=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),finiteAnimations=document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length;
          return{rect:rect(r),overflow:document.documentElement.scrollWidth>innerWidth+1,inside:r.left>=-0.5&&r.right<=innerWidth+0.5&&r.top>=-0.5&&r.bottom<=innerHeight+0.5,painted:style.visibility!=='hidden'&&Number(style.opacity)===1&&!!center&&(center===e||e.contains(center)),controls,skipped,finiteAnimations,fonts:document.fonts.status,fontFaces:[...document.fonts].map(f=>({family:f.family,status:f.status})),body:{inline:document.body.style.overflow,computed:getComputedStyle(document.body).overflow,locked:document.body.getAttribute('data-scroll-locked')},scroll:[...e.querySelectorAll('[data-programme-body],[data-us-programme-scroll]')].map(b=>({top:b.scrollTop,height:b.clientHeight,total:b.scrollHeight})),pageY:scrollY};
        };
        const start=performance.now();let last='',stableFrames=0,v;
        do{await new Promise(requestAnimationFrame);v=sample();const signature=JSON.stringify(v);stableFrames=signature===last?stableFrames+1:1;last=signature;if(stableFrames>=4&&!v.finiteAnimations&&v.fonts==='loaded'&&v.painted)return{...v,stableFrames};}while(performance.now()-start<2000);
        return{...v,stableFrames};
      });
      row.layouts.push({name,...v});check(v.controls.length>0,name+': actual controls observed');check(layoutFailures(v).length===0,name+': painted usable layout');return v;
    }
    async function shot(name,target=dialog){await measure(name+'-capture',target);const file=id+'-'+name+'.png';await target.screenshot({path:path.join(out,file)});row.shots.push({file,sha256:sha(fs.readFileSync(path.join(out,file)))});}
    async function reloadHeld(name,held){await page.reload({waitUntil:'networkidle'});const actual=await bytes(),file=id+'-reload-'+name+'.json';fs.writeFileSync(path.join(out,file),JSON.stringify({before:held,after:actual,beforeSha256:sha(held),afterSha256:sha(actual)},null,2));row.reloads.push({name,file,beforeSha256:sha(held),afterSha256:sha(actual)});check(actual===held,name+': reload preserves complete raw saved bytes');return actual;}
    if(fixture.id==='wheel'){
      const initial=JSON.parse(before);await page.getByRole('button',{name:/Push for more money/}).click();await dialog.waitFor();
      const committed=await bytes(),state=JSON.parse(committed),receipt=state.chanceWheel;
      check(receipt?.chance===0.5&&receipt.roll>=0&&receipt.roll<1&&receipt.result===(receipt.roll<0.5)&&receipt.seen===false,'Actual risky choice retains its one saved 50% receipt');
      check(state.weeklyWage===(receipt.result?Math.round(initial.weeklyWage*1.2):initial.weeklyWage)&&state.morale===(receipt.result?initial.morale:Math.max(0,Math.min(100,initial.morale-10))),'One committed wage or morale outcome matches the retained result');
      check(state.pendingEvents.length===initial.pendingEvents.length-1&&state.pendingEvents[0].id===2,'Actual event choice advances once to the recorded next event');
      check((await dialog.textContent()).includes('Example: a 30% chance uses 30 of 100 equal parts.'),'Actual wheel shows its worked probability example');
      await shot('wheel-help');
      const expected=receipt.result?receipt.hit:receipt.miss;await dialog.locator('[data-wheel-skip]').click();
      await page.waitForFunction(expected=>document.querySelector('[data-wheel-result]')?.textContent===expected,expected,{timeout:2000});
      const skipped=await bytes();check(skipped===committed,'Skipping reveals without changing any saved field');
      await dialog.locator('[data-wheel-result]').scrollIntoViewIfNeeded();await shot('wheel-skipped');
      await reloadHeld('wheel-pending',committed);await dialog.waitFor();
      check((await dialog.locator('[data-wheel-result]').textContent())==='Ready to reveal your saved result.','Reload before Spin keeps the same unrevealed presentation');
      await dialog.locator('[data-wheel-spin]').click();
      await page.waitForFunction(expected=>document.querySelector('[data-wheel-result]')?.textContent===expected,expected,{timeout:5000});
      const spun=await bytes();check(spun===committed,'Spinning never rerolls or rewrites the committed career');
      await dialog.locator('[data-wheel-result]').scrollIntoViewIfNeeded();await shot('wheel-result');
      await dialog.locator('[data-wheel-continue]').click();await dialog.waitFor({state:'hidden'});
      await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).chanceWheel?.seen===true,fixture.key,{timeout:2000});
      const acknowledged=await bytes(),expectedAcknowledged=structuredClone(state);expectedAcknowledged.chanceWheel.seen=true;
      check(acknowledged===JSON.stringify(expectedAcknowledged),'Continue changes only the receipt acknowledgement in the complete save');
      await reloadHeld('wheel-acknowledged',acknowledged);check(await page.locator('[data-career-chance-wheel]').count()===0,'Acknowledged wheel stays closed after reload');
      fs.writeFileSync(path.join(out,id+'-wheel.json'),JSON.stringify({before,committed,skipped,spun,acknowledged,receipt,expectedAcknowledged},null,2));
      check(row.errors.length===0&&row.assetErrors.length===0,'No wheel app or local asset exceptions');row.ok=true;continue;
    }
    if(soccer&&!fixture.id){
      assert(fixture.expectedSquad?.eleven.length===11,'Fixture retains the existing reader eleven');
      const opener=page.locator('[data-squad-tile]'),squad=page.locator('[data-squad-sheet] [role="dialog"]');
      await opener.scrollIntoViewIfNeeded();const squadBefore=await bodyState();await opener.click();await squad.waitFor();
      await squad.locator('[data-squad-screen="help"]').waitFor();
      check(await bytes()===before,'Opening squad rules preserves every career field');await shot('squad-help',squad);
      await squad.getByRole('button',{name:'← Back',exact:true}).click();
      await squad.getByRole('button',{name:'Starting 11',exact:true}).click();
      const observed=await squad.locator('[data-squad-xi] [data-squad-man]').evaluateAll(cells=>cells.map(cell=>({name:cell.querySelector('[data-squad-cell-name]')?.textContent??null,pos:cell.querySelector('[data-squad-cell-position]')?.textContent?.replace(/ ©$/,'')??null,ovr:Number(cell.querySelector('[data-squad-cell-rating]')?.textContent),me:cell.getAttribute('data-squad-man')==='me',source:cell.getAttribute('data-squad-cell-source'),nameFits:[...cell.querySelectorAll('[data-squad-cell-name]')].every(n=>n.scrollWidth<=n.clientWidth+1),style:[...cell.querySelectorAll('[data-squad-cell-name]')].map(n=>({overflow:getComputedStyle(n).textOverflow,whiteSpace:getComputedStyle(n).whiteSpace}))})));
      const expected=fixture.expectedSquad.eleven.map(m=>({name:m.role?null:m.name,pos:m.pos,ovr:m.ovr,me:m.me,source:m.source}));
      const failures=v=>[...(v.length!==expected.length?['xi-count']:[]),...(v.some((m,i)=>m.name!==expected[i]?.name)?['xi-names']:[]),...(v.some((m,i)=>m.pos!==expected[i]?.pos)?['xi-positions']:[]),...(v.some((m,i)=>m.ovr!==expected[i]?.ovr)?['xi-ratings']:[]),...(v.some((m,i)=>m.me!==expected[i]?.me||m.source!==expected[i]?.source)?['xi-source']:[])];
      check(failures(observed).length===0,'All eleven full names positions ratings and source labels equal the unchanged squad reader');
      check(observed.every(m=>m.nameFits&&m.style.every(s=>s.overflow!=='ellipsis'&&s.whiteSpace!=='nowrap')),'Full XI names wrap without truncation');
      check((await squad.locator('[data-squad-source]').getAttribute('data-squad-source'))===fixture.expectedSquad.source,'Squad source stays explicit');
      check((await squad.locator('[data-squad-xi-heading]').textContent())==='Starting 11 on our ratings','XI identifies its actual rating-based selection');
      if(fixture.expectedSquad.source==='invented')check((await squad.locator('[data-squad-xi-scope]').textContent()).includes('Generated teammates are fictional players in your career.'),'Future teammates remain identified as generated');
      check(await bytes()===before,'Reading all eleven leaves the entire career unchanged');await shot('starting-eleven',squad);
      row.squad={expected:fixture.expectedSquad,observed};fs.writeFileSync(path.join(out,id+'-squad.json'),JSON.stringify(row.squad,null,2));
      if(!report.controls.some(c=>c.name==='xi-names')){const faulty=structuredClone(observed),original=faulty[0].name;faulty[0].name=original+' wrong';check(JSON.stringify(faulty)!==JSON.stringify(observed),'Copied XI control changes one actual displayed name');assert.deepEqual(failures(faulty),['xi-names']);check(true,'Copied XI detector rejects exactly the wrong full name');faulty[0].name=original;check(JSON.stringify(faulty)===JSON.stringify(observed)&&failures(faulty).length===0,'Copied XI detector restores every observed fact');check(await bytes()===before,'Copied XI detector preserves the actual saved bytes');report.controls.push({name:'xi-names',effective:true,failed:['xi-names'],restored:true,scope:'Copied actual observation, not a served product mutation'});}
      await squad.getByRole('button',{name:'← Back',exact:true}).click();
      await squad.getByRole('button',{name:'← Back to your career',exact:true}).click();await squad.waitFor({state:'hidden'});
      await page.waitForFunction(()=>document.querySelector('[data-squad-tile]')===document.activeElement,null,{timeout:2000});
      const returned=await bodyState();row.squadRestoration={before:squadBefore,after:returned};check(JSON.stringify(returned)===JSON.stringify(squadBefore),'Squad Back restores body and page position');check(await bytes()===before,'Closing squad preserves complete saved bytes');
    }
    const open=page.locator(soccer?'[data-soccer-programme-open]':'[data-us-programme-open]');await open.waitFor({timeout:15000});
    await open.scrollIntoViewIfNeeded();const pageBefore=await bodyState();await open.click();await dialog.waitFor();
    check(await bytes()===before,'Opening Help preserves the complete career');
    const healthy=await measure('help');await shot('help');
    await dialog.locator(soccer?'[data-programme-start]':'[data-us-programme-start]').click();
    const tileSelector=soccer?'[data-programme-tile]':'[data-us-programme-tile]',tiles=await dialog.locator(tileSelector).evaluateAll(es=>es.map(e=>e.getAttribute('data-programme-tile')??e.getAttribute('data-us-programme-tile')));
    check(tiles.length===(soccer?10:6),'Every promised gameplay system is present');await measure('tiles');await shot('tiles');
    for(const tile of tiles){await dialog.locator('['+(soccer?'data-programme-tile':'data-us-programme-tile')+'="'+tile+'"]').click();
      await measure(tile);if(width===320||tile===tiles[0])await shot(tile);
      const choice=dialog.locator(soccer?'[data-programme-choice]:not(:disabled)':'[data-us-programme-choice]:not(:disabled):not([data-us-programme-choice$=":normal"])').first();
      if(await choice.count()){const selected=await choice.getAttribute(soccer?'data-programme-choice':'data-us-programme-choice'),old=await bytes();await choice.click();await page.waitForFunction(({key,old})=>localStorage.getItem(key)!==old,{key:fixture.key,old},{timeout:2000});const current=await bytes();check(current!==old,'Choice records a real saved decision');const file=id+'-choice-'+tile+'.json';fs.writeFileSync(path.join(out,file),JSON.stringify({before:old,after:current},null,2));row.choices.push({tile,selected,file,before:sha(old),after:sha(current)});}
      await dialog.locator(soccer?'[data-programme-back]':'[data-us-programme-back]').click();
    }
    const chosen=await bytes();check(row.choices.length>=(fixture.id==='counteroffer'?1:soccer?7:5),'Context supports substantive decisions');
    await dialog.locator(soccer?'[data-programme-help]':'[data-us-programme-help]').click();check(await bytes()===chosen,'Reopened rules preserve selected decisions');
    await page.waitForFunction(selector=>{const e=document.querySelector(selector);return e&&e.contains(document.activeElement);},dialogSelector,{timeout:2000});
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    await page.waitForFunction(({selector,before})=>{const e=document.querySelector(selector);return e===document.activeElement&&scrollY===before.y&&document.body.style.overflow===before.overflow&&getComputedStyle(document.body).overflow===before.computed&&document.body.getAttribute('data-scroll-locked')===before.locked;},{selector:soccer?'[data-soccer-programme-open]':'[data-us-programme-open]',before:pageBefore},{timeout:2000});
    check(await bytes()===chosen,'Escape preserves choices');
    const returned=await bodyState();row.restoration={before:pageBefore,after:returned};check(JSON.stringify(returned)===JSON.stringify(pageBefore),'Close restores page position and inline/computed body lock');check(await open.evaluate(e=>e===document.activeElement),'Close restores the opener');
    await reloadHeld('chosen',chosen);
    const saved=JSON.parse(chosen),oldLength=soccer?saved.seasons.length:saved.c.seasons.length;
    if(fixture.id==='counteroffer'){
      check(saved.transferSituation.offer.wage===55000&&saved.weeklyWage===fixture.value.weeklyWage,'Counteroffer changes offered pay, current contract stays until signing');
      await page.getByRole('button',{name:'Review contract with Chelsea',exact:true}).click();
      const review=page.locator('[data-soccer-offer-review]');await review.waitFor();
      check(await review.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage')==='55000','Actual contract review shows the counteroffered wage');
      await review.getByRole('button',{name:'Sign contract',exact:true}).click();
      await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).phase==='playing',fixture.key);
      const signedBytes=await bytes(),signed=JSON.parse(signedBytes);check(signed.weeklyWage===55000&&signed.currentClub==='Chelsea','Signing applies the actual negotiated contract');
      await reloadHeld('signed',signedBytes);
      fs.writeFileSync(path.join(out,id+'-saves.json'),JSON.stringify({before:JSON.parse(before),chosen:saved,signed},null,2));check(row.errors.length===0&&row.assetErrors.length===0,'No app or local asset exceptions');row.ok=true;continue;
    }
    await page.getByRole('button',{name:soccer?'Next Season':/Play the \d+ season/i,exact:soccer}).first().click();
    await page.waitForFunction(({key,length,soccer})=>{const s=JSON.parse(localStorage.getItem(key)||'null');return(soccer?s?.seasons:s?.c?.seasons)?.length>length;},{key:fixture.key,length:oldLength,soccer},{timeout:15000});
    const advanced=await bytes(),actual=JSON.parse(advanced),last=soccer?actual.seasons.at(-1):actual.c.seasons.at(-1);check((soccer?actual.seasons:actual.c.seasons).length===oldLength+1,'One click plays exactly one actual season');
    check(!!(soccer?last.programme:actual.c.programmeResults?.length),'Actual season retains planning settlement');
    fs.writeFileSync(path.join(out,id+'-saves.json'),JSON.stringify({before:JSON.parse(before),chosen:saved,advanced:actual},null,2));const reloaded=JSON.parse(await reloadHeld('settled',advanced));check((soccer?reloaded.seasons:reloaded.c.seasons).length===oldLength+1,'Settled season survives reload without replay');check(row.errors.length===0&&row.assetErrors.length===0,'No app or local asset exceptions');
    if(!report.controls.some(c=>c.name==='touch-size')){const held=await bytes(),faulty=structuredClone(healthy),height=faulty.controls[0].height;faulty.controls[0].height=1;check(JSON.stringify(faulty)!==JSON.stringify(healthy),'Copied layout control changes an observed height');const failures=layoutFailures(faulty);assert.deepEqual(failures,['touch-size']);check(true,'Effective copied layout control detects only the unusable button');faulty.controls[0].height=height;check(JSON.stringify(faulty)===JSON.stringify(healthy)&&layoutFailures(faulty).length===0,'Copied layout detector restores the full observed layout');check(await bytes()===held,'Copied detector preserves actual saved bytes');report.controls.push({name:'touch-size',effective:true,failed:failures,restored:true,scope:'Copied actual observation, not a served product mutation'});}
    row.ok=true;
  }catch(error){row.ok=false;row.error=String(error.stack);console.log('FAIL '+id+': '+row.error);await page.screenshot({path:path.join(out,id+'-failure.png')}).catch(()=>{});}finally{await context.close();}
}}finally{await browser.close();server.kill();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
console.log('Career programme native: '+report.checks+' checks, '+report.cases.filter(v=>v.ok).length+'/'+report.cases.length+' completed gameplay journeys');assert.equal(report.cases.length,21);assert(report.cases.every(v=>v.ok));assert.equal(report.controls.length,2);
