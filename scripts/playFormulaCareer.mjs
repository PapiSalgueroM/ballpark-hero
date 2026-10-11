import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.FORMULA_EVIDENCE_DIR || process.env.FORMULA_CAREER_BROWSER_OUT || path.join(ROOT, 'formula-career-artifacts/browser'));
const INPUT = path.resolve(process.env.FORMULA_CAREER_INPUT || path.join(ROOT, 'formula-career-artifacts/proof'));
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const SAVE = 'dukb-formula-career-v1', COMPLETE = 'dukb-formula-career-completion-v1';
const sha = b => createHash('sha256').update(b).digest('hex');
const json = v => JSON.stringify(v), clone = v => JSON.parse(json(v));
mkdirSync(OUT, { recursive: true });
const objects = new Map(), inputObjects = new Map();
function retain(v) {
  const raw = Buffer.from(json(v)), hash = sha(raw);
  if (!objects.has(hash)) {
    const packed = gzipSync(raw, { level: 9, mtime: 0 }), file = 'objects/' + hash + '.json.gz';
    mkdirSync(path.join(OUT, 'objects'), { recursive: true }); writeFileSync(path.join(OUT, file), packed);
    assert.deepEqual(gunzipSync(packed), raw, 'whole browser object round trip');
    objects.set(hash, { hash, file, bytes: raw.length, packedBytes: packed.length, packedSha256: sha(packed) });
  }
  return hash;
}
function retainBytes(raw, suffix) {
  const hash = sha(raw), file = 'bytes/' + hash + '.' + suffix;
  mkdirSync(path.join(OUT, 'bytes'), { recursive: true }); writeFileSync(path.join(OUT, file), raw);
  return { file, sha256: hash, bytes: raw.length };
}
const report = { status: 'running', base: BASE, source: [], input: {}, cases: [], controls: [], assets: [], external: [], errors: [], qualifications: [
  'Actual built page and hook callbacks run in Chromium. Saved checkpoints originate in the complete actual seed-1 pure career, without invented races or opponent changes.',
  'Setup entropy is explicitly fixed to seed 1. Complete startup Math.random values and caller stacks are retained separately from action/read tapes. The game private stream is certified by whole saved outputs and the retained actual pure action vectors.',
  'Loader outputs receive complete semantic key/value equality. Every read/help/Back/reload retains exact original stored JSON bytes, including property order.',
  'External transport is fulfilled or aborted by this harness and recorded. No production database, analytics or external font request is sent. Fonts are actual local/fallback fonts after document.fonts.ready, not a claim of downloaded web fonts.',
  'Existing essential-cookie consent and a generated proof guest handle are saved before navigation. The new game rules are genuinely shown before first play; no fresh site cookie-choice interaction is claimed.',
  'Anonymous completed-play inserts omit score. The unchanged central recorder may save neutral zero for a signed-in account; no signed-in completion or point-conversion leaderboard submission is claimed.',
  'Rapid guard observations invoke the actual rendered React onClick or setup onSubmit closure twice synchronously, with the real measured currentTarget. Complete callback text/arguments and both invocation cursors are retained. Ordinary navigation uses painted Playwright clicks. These are captured-callback proofs, not a claim that two DOM clicks reached two listeners.',
  'Raw absent/empty body style attributes remain recorded. Only absent attributes with zero declarations are equivalent to an empty attribute for restoration; all declarations, computed styles and nonempty attributes remain strict.'
] };
let browser;
function readInput(hash) {
  const row = inputObjects.get(hash); assert(row, 'declared complete pure object');
  const file = path.resolve(INPUT, row.file); assert(file.startsWith(INPUT + path.sep), 'bounded pure object path');
  const packed = readFileSync(file), raw = gunzipSync(packed);
  assert.equal(sha(packed), row.packedSha256); assert.equal(packed.length, row.packedBytes);
  assert.equal(sha(raw), hash); assert.equal(raw.length, row.bytes);
  const retained = retainBytes(packed, 'json.gz'); report.input.objects[hash] = { ...row, retained };
  return JSON.parse(raw);
}
function bodyState(v) { const copy = clone(v); if (copy.attribute === null && copy.declarations.length === 0) copy.attribute = ''; return copy; }
function failures(v) {
  const out = [];
  if (v.before.raw !== v.after.raw) out.push('save-bytes');
  if (v.before.rng !== v.after.rng || v.before.draws !== v.after.draws || v.tape.length) out.push('read-stream');
  if (json(bodyState(v.before.body)) !== json(bodyState(v.after.body))) out.push('body-restore');
  if (!v.geometry.inside || !v.geometry.paint.every(p => p.hit) || v.geometry.viewport.width !== v.width
    || v.geometry.viewport.height !== v.height || v.geometry.viewport.visualWidth !== v.width
    || v.geometry.viewport.visualHeight !== v.height || v.geometry.viewport.scale !== 1 || v.geometry.viewport.overflow) out.push('geometry');
  if (!v.geometry.fonts.ready || !v.geometry.visible || v.geometry.rect.height < 44 || v.geometry.rect.width < 44) out.push('control');
  return out;
}
function actionFailures(v) {
  const out=[];
  if(!isDeepStrictEqual(JSON.parse(v.raw),v.expected))out.push('save-output');
  if(v.saveWrites!==1)out.push('callback-once');
  if(v.dispatches!==1)out.push('completion-once');
  const payload=Array.isArray(v.payload)?v.payload:[v.payload];
  if(!isDeepStrictEqual(payload,[{game:'f1-career',player_name:'Formula Proof 1'}]))out.push('personal-score');
  return out;
}
function drainFailures(v) {
  const out=[];if(v.assets.some(a=>a.error))out.push('served-assets');if(v.pageErrors.length)out.push('page-errors');return out;
}
const money = n => '$' + n.toLocaleString('en-US');
function standings(s, season, kind) {
  const ids = kind === 'drivers' ? [...new Set(s.races.filter(r => r.season === season).flatMap(r => r.results.map(x => x.driverId)))] : s.teams.map(t => t.id);
  if (kind === 'drivers' && !ids.length) ids.push(...s.drivers.map(d => d.id));
  const rows = ids.map(id => { const results = s.races.filter(r => r.season === season).flatMap(r => r.results.filter(x => (kind === 'drivers' ? x.driverId : x.teamId) === id));
    return { id, name: kind === 'drivers' ? (results[0]?.name ?? s.drivers.find(d => d.id === id).name) : s.teams.find(t => t.id === id).name,
      points: results.reduce((n,x) => n+x.points,0), wins: results.filter(x=>x.position===1).length, podiums: results.filter(x=>x.position!==null&&x.position<=3).length,
      countback: Array.from({length:20},(_,i)=>results.filter(x=>x.position===i+1).length) }; });
  const compare = (a,b) => b.points-a.points || a.countback.reduce((n,c,i)=>n || b.countback[i]-c,0);
  rows.sort((a,b)=>compare(a,b)||a.id.localeCompare(b.id));
  rows.forEach((r,i)=>{r.rank=i&&compare(rows[i-1],r)===0?rows[i-1].rank:i+1;});
  return rows;
}
async function settle(page) {
  await page.evaluate(async () => { await document.fonts.ready;
    const finite=document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime));
    await Promise.all(finite.map(a=>a.finished.catch(()=>{})));
    for (let i=0;i<4;i++) await new Promise(requestAnimationFrame); });
}
async function state(page) {
  return page.evaluate(({SAVE,COMPLETE}) => {
    const raw = localStorage.getItem(SAVE), parsed = raw ? JSON.parse(raw) : null;
    const b = document.body, computed = getComputedStyle(b);
    return { raw, rng: parsed?.rng ?? null, draws: parsed?.draws ?? null, completion: localStorage.getItem(COMPLETE),
      writes: [...window.__formulaBrowser.writes], tape: [...window.__formulaBrowser.tape], crypto: [...window.__formulaBrowser.crypto], callbacks: [...window.__formulaBrowser.callbacks],
      body: { attribute:b.getAttribute('style'), declarations:Array.from(b.style,k=>[k,b.style.getPropertyValue(k),b.style.getPropertyPriority(k)]),
        overflow:computed.overflow, pointerEvents:computed.pointerEvents, marginRight:computed.marginRight, position:computed.position },
      phase:document.querySelector('[data-formula-career-phase]')?.getAttribute('data-formula-career-phase')??null,
      panel:document.querySelector('[data-formula-career-panel]')?.getAttribute('data-formula-career-panel')??null,
      focus: { tag:document.activeElement?.tagName, text:document.activeElement?.textContent, aria:document.activeElement?.getAttribute('aria-label') },
      storage:Object.fromEntries(Object.entries(localStorage)), bodyText:b.innerText };
  },{SAVE,COMPLETE});
}
async function geometry(page, locator, width, height, touch=44) {
  assert.equal(await locator.count(),1,'unique actual painted target');
  await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'})); await settle(page);
  const result = await locator.evaluate(async (e,{width,height}) => {
    const frames=[];for(let i=0;i<4;i++){await new Promise(requestAnimationFrame);const f=e.getBoundingClientRect();frames.push({x:f.x,y:f.y,width:f.width,height:f.height});}
    const r=e.getBoundingClientRect(),c=getComputedStyle(e),v=window.visualViewport;
    const points=[[r.x+r.width/2,r.y+r.height/2],[r.x+Math.min(8,r.width/4),r.y+Math.min(8,r.height/4)],
      [r.right-Math.min(8,r.width/4),r.y+Math.min(8,r.height/4)],[r.x+Math.min(8,r.width/4),r.bottom-Math.min(8,r.height/4)],
      [r.right-Math.min(8,r.width/4),r.bottom-Math.min(8,r.height/4)]];
    return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},frames,
      viewport:{width:innerWidth,height:innerHeight,visualWidth:v?.width,visualHeight:v?.height,scale:v?.scale,overflow:document.documentElement.scrollWidth>innerWidth},
      inside:r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=height,
      paint:points.map(([x,y])=>{const found=document.elementFromPoint(x,y);return{x,y,hit:!!found&&(found===e||e.contains(found)),tag:found?.tagName,text:found?.textContent};}),
      visible:c.visibility==='visible'&&c.display!=='none'&&Number(c.opacity)===1,
      computed:{display:c.display,position:c.position,visibility:c.visibility,opacity:c.opacity,pointerEvents:c.pointerEvents,transform:c.transform,overflow:c.overflow,font:c.font,fontFamily:c.fontFamily},
      text:e.innerText,fonts:{ready:document.fonts.status==='loaded',faces:Array.from(document.fonts,f=>({family:f.family,status:f.status,style:f.style,weight:f.weight}))},
      innerScroll:{top:e.parentElement?.scrollTop,height:e.parentElement?.clientHeight,total:e.parentElement?.scrollHeight} };
  },{width,height});
  assert(result.inside&&result.paint.every(p=>p.hit)&&result.visible,'five actual painted points and viewport bounds');
  assert(result.frames.every(f=>json(f)===json(result.frames[0])),'four settled actual layout frames');
  assert.equal(result.viewport.width,width);assert.equal(result.viewport.height,height);assert.equal(result.viewport.visualWidth,width);assert.equal(result.viewport.visualHeight,height);
  assert.equal(result.viewport.scale,1);assert.equal(result.viewport.overflow,false);assert(result.fonts.ready);
  assert(result.rect.height>=touch&&result.rect.width>=touch,'actual touch dimensions');
  return result;
}
async function runCase(viewport, pure) {
  const {width,height}=viewport, row={width,height,status:'running',steps:[],layouts:[],screenshots:[],reloads:[],errors:[],assets:[],external:[],startup:[],controls:[]}; report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
  const pending=new Set(), appErrors=[];
  context.on('page',p=>p.on('pageerror',e=>appErrors.push({name:e.name,message:e.message,stack:e.stack})));
  await context.addInitScript(({SAVE,COMPLETE})=>{
    localStorage.setItem('cookie-consent','essential');localStorage.setItem('dukb-guest-handle','FormulaProof-12');
    window.__formulaBrowser={tape:[],writes:[],crypto:[],callbacks:[],failSave:false,seed:1};
    const realRandom=Math.random;Math.random=()=>{const value=realRandom();window.__formulaBrowser.tape.push({value,stack:new Error().stack});return value;};
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage){window.__formulaBrowser.writes.push({key,value:String(value),failed:key===SAVE&&window.__formulaBrowser.failSave,stack:new Error().stack});if(key===SAVE&&window.__formulaBrowser.failSave)throw new DOMException('Diagnostic saved-write refusal','QuotaExceededError');}return set.call(this,key,value);};
    const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=function(array){if(array instanceof Uint32Array&&array.length===1){array[0]=window.__formulaBrowser.seed;window.__formulaBrowser.crypto.push({values:Array.from(array),qualification:'explicit declared setup entropy'});return array;}const result=random(array);window.__formulaBrowser.crypto.push({values:Array.from(array),qualification:'actual other startup entropy'});return result;};
    window.__formulaKeys={SAVE,COMPLETE};
  },{SAVE,COMPLETE});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===new URL(BASE).origin){await route.continue();return;}
    const request={url:req.url(),method:req.method(),body:req.postData(),resourceType:req.resourceType()};
    if(req.resourceType()==='font'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com') {row.external.push({...request,mock:'aborted external font, fallback qualification'});await route.abort();return;}
    const body=url.pathname.includes('/auth/')?'{}':'[]',status=req.method()==='POST'?201:200;
    const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    row.external.push({...request,mock:{status,headers,body}});await route.fulfill({status,headers,body});
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('response',response=>{
    if(new URL(response.url()).origin!==new URL(BASE).origin)return;
    const promise=(async()=>{try{const raw=await response.body(),dist=path.join(ROOT,'dist'),pathname=decodeURIComponent(new URL(response.url()).pathname),candidate=path.resolve(dist,'.'+pathname);
      assert(candidate===dist||candidate.startsWith(dist+path.sep),'bounded actual served asset');
      const file=[candidate,path.join(candidate,'index.html')].find(p=>existsSync(p)&&statSync(p).isFile())??path.join(dist,'index.html');
      const expected=readFileSync(file);assert.deepEqual(raw,expected,'whole response body equals actual built file');
      row.assets.push({url:response.url(),status:response.status(),headers:await response.allHeaders(),body:retainBytes(raw,'served'),built:{path:path.relative(ROOT,file),sha256:sha(expected),bytes:expected.length},request:{method:response.request().method(),body:response.request().postData()}});
    }catch(e){row.assets.push({url:response.url(),error:String(e)});}})();pending.add(promise);promise.finally(()=>pending.delete(promise));
  });
  const button=name=>page.getByRole('button',{name,exact:true});
  const phase=async expected=>{await page.locator(`[data-formula-career-phase="${expected}"]`).waitFor();await settle(page);};
  const completionRows=()=>row.external.filter(x=>x.method==='POST'&&new URL(x.url).pathname.endsWith('/game_completions'));
  const waitCompletions=async count=>{const end=Date.now()+15000;while(completionRows().length<count&&Date.now()<end)await page.evaluate(()=>new Promise(requestAnimationFrame));assert.equal(completionRows().length,count,'actual completed-play dispatch count');};
  const save=async(expected,label)=>{const actual=await state(page);assert(actual.raw,label+' raw save exists');assert.deepEqual(JSON.parse(actual.raw),expected,label+' complete actual saved output');row.steps.push({id:label,type:'whole-save',expected:retain(expected),actual:retain(actual)});return actual;};
  const shot=async(id,target,touch=44)=>{const g=await geometry(page,target,width,height,touch);row.layouts.push({id,geometry:retain(g)});const file=width+'/'+id+'.png';mkdirSync(path.join(OUT,String(width)),{recursive:true});await page.screenshot({path:path.join(OUT,file),fullPage:false});const raw=readFileSync(path.join(OUT,file));row.screenshots.push({id,file,sha256:sha(raw),bytes:raw.length,width,height});return g;};
  const click=async(name,rapid=false)=>{const target=button(name),g=await geometry(page,target,width,height);row.layouts.push({id:'click/'+name,geometry:retain(g)});
    if(rapid)await target.evaluate((element,SAVE)=>{
      const props=node=>{const keys=Object.keys(node).filter(k=>k.startsWith('__reactProps$'));if(keys.length!==1)throw new Error('Unique actual React props required');return{key:keys[0],value:node[keys[0]]};};
      let node=element,selected=props(node),type='click',fn=selected.value.onClick;
      if(typeof fn!=='function'&&element.type==='submit'&&element.form){node=element.form;selected=props(node);fn=selected.value.onSubmit;type='submit';}
      if(typeof fn!=='function')throw new Error('Actual rendered callback absent');
      const record={kind:'captured actual rendered callback',propsKey:selected.key,type,source:Function.prototype.toString.call(fn),target:node.outerHTML,button:element.outerHTML,invocations:[]};
      for(let index=0;index<2;index++){
        const before={raw:localStorage.getItem(SAVE),writes:window.__formulaBrowser.writes.length,tape:window.__formulaBrowser.tape.length};let prevented=0;
        const event={type,currentTarget:node,target:element,preventDefault(){prevented++;},stopPropagation(){}};
        const result=fn(event);
        record.invocations.push({index,connected:node.isConnected,args:{type,currentTarget:node.outerHTML,target:element.outerHTML,preventDefaultCalls:prevented},before,
          after:{raw:localStorage.getItem(SAVE),writes:window.__formulaBrowser.writes.length,tape:window.__formulaBrowser.tape.length},returnValue:result===undefined?'undefined':result});
      }
      window.__formulaBrowser.callbacks.push(record);
    },SAVE);else await target.click();
    if(["Let's play",'Keep career','Confirm retirement','Start new career'].includes(name))await page.getByRole('dialog').waitFor({state:'hidden'});
    await settle(page);};
  const capture=async(id,action)=>{const before=await state(page);await action();await settle(page);const after=await state(page);
    const callbacks=after.callbacks.slice(before.callbacks.length);
    for(const callback of callbacks){assert.equal(callback.invocations.length,2,'two actual captured callback invocations');assert(callback.source.length>0);assert.equal(callback.invocations[1].before.raw,callback.invocations[0].after.raw);assert.equal(callback.invocations[1].after.raw,callback.invocations[0].after.raw,'second captured callback holds complete save');assert.equal(callback.invocations[1].after.writes,callback.invocations[1].before.writes,'second captured callback writes nothing');}
    row.steps.push({id,type:'action',before:retain(before),after:retain(after),callbacks:retain(callbacks),tape:retain(after.tape.slice(before.tape.length)),saveWrites:retain(after.writes.slice(before.writes.length).filter(w=>w.key===SAVE))});return{before,after};};
  const certify=(id,pair,completedPlay=false)=>{const actual=pure.browserActions.find(a=>a.id===id);assert(actual,'actual pure action ledger '+id);const input=readInput(actual.parsed),expected=readInput(actual.output),tape=readInput(actual.private);
    assert.deepEqual(JSON.parse(pair.before.raw),input,id+' complete actual parser-loaded action input');assert.deepEqual(JSON.parse(pair.after.raw),expected,id+' complete actual saved callback output');assert.equal(pair.after.draws-pair.before.draws,tape.length,id+' private cursor count');assert.equal(pair.after.rng,tape.at(-1)?.rng??pair.before.rng,id+' exact saved private cursor');
    if(!completedPlay)assert.deepEqual(pair.after.tape.slice(pair.before.tape.length),readInput(actual.global),id+' complete actual global action vector');
    row.steps.push({id:'pure-action-link/'+id,input:actual.parsed,output:actual.output,private:actual.private,global:actual.global,completedPlaySideEffects:completedPlay,before:retain(pair.before),after:retain(pair.after)});
  };
  const read=async(id,action)=>{const pair=await capture(id,action);assert.equal(pair.after.raw,pair.before.raw,id+' complete raw save held');assert.equal(pair.after.rng,pair.before.rng);assert.equal(pair.after.draws,pair.before.draws);assert.deepEqual(pair.after.tape.slice(pair.before.tape.length),[],id+' actual read global tape zero');return pair;};
  const reload=async(id)=>{const before=await state(page);await page.reload({waitUntil:'networkidle'});await phase(JSON.parse(before.raw).phase);const after=await state(page);assert.equal(after.raw,before.raw,id+' reload stored bytes');assert.equal(after.rng,before.rng);assert.equal(after.draws,before.draws);assert.equal(after.completion,before.completion);row.reloads.push({id,before:retain(before),after:retain(after),startup:retain(after.tape)});};
  const restore=async(id)=>{const raw=json(readInput(pure.fixtures[id]));await page.evaluate(({SAVE,COMPLETE,raw})=>{localStorage.setItem(SAVE,raw);localStorage.removeItem(COMPLETE);localStorage.setItem('dukb-formula-career-rules-v1','1');},{SAVE,COMPLETE,raw});const count=completionRows().length;await page.reload({waitUntil:'networkidle'});await phase(JSON.parse(raw).phase);const now=await state(page);assert.equal(now.raw,raw,'genuine '+id+' restore raw bytes');assert.equal(completionRows().length,count,'restoring settled fixture records no completion');row.steps.push({id:'restore/'+id,type:'actual-pure-checkpoint-restore',state:retain(now),input:pure.fixtures[id],startup:retain(now.tape)});};
  const list=async(label,expected)=>{const target=page.getByRole('list',{name:label,exact:true});assert.equal(await target.count(),1);const text=await target.locator(':scope > li').allTextContents();assert.deepEqual(text.map(s=>s.replace(/\s+/g,' ').trim()),expected.map(s=>s.replace(/\s+/g,' ').trim()),label+' complete ordered DOM rows');row.steps.push({id:'DOM/'+label,actual:retain(text),expected:retain(expected)});const first=target.locator(':scope > li').first(),last=target.locator(':scope > li').last();row.layouts.push({id:'rows/'+label+'/first',geometry:retain(await geometry(page,first,width,height,0))});row.layouts.push({id:'rows/'+label+'/last',geometry:retain(await geometry(page,last,width,height,0))});};
  const raceRows=s=>s.races.at(-1).results.map(r=>`${r.position??'RET'}${r.name}${s.teams.find(t=>t.id===r.teamId).name} · Grid ${r.grid}${r.reason?' · '+r.reason:''}${r.points} pts`);
  try {
    await page.goto(BASE+'/f1-career',{waitUntil:'networkidle'});await settle(page);
    const initial=await state(page);row.startup.push(retain(initial));assert.equal(initial.raw,null,'new setup has no career');assert.equal(completionRows().length,0,'opening is not a completed play');
    const help=page.getByRole('dialog');assert.equal(await help.count(),1);assert(await button('Start career').isDisabled(),'rules shown before play');
    await shot('rules-before-play',help.getByRole('button',{name:"Let's play",exact:true}));await click("Let's play");assert.equal(await help.count(),0);
    await page.locator('#formula-driver-name').fill('Formula Proof 1');await capture('actual-setup',()=>click('Start career',true));await phase('weekend');
    const naturalInitial=readInput(pure.fixtures.initial);await save(naturalInitial,'setup seed1');assert.equal(completionRows().length,0);assert.equal((await state(page)).crypto.filter(c=>c.qualification==='explicit declared setup entropy').length,1,'rapid setup creates one world');
    await page.getByLabel('Training focus',{exact:true}).selectOption('pace');await page.getByLabel('Race approach',{exact:true}).selectOption('careful');
    await page.evaluate(()=>window.__formulaBrowser.failSave=true);const refused=await capture('refused qualifying save',()=>click('Run qualifying'));
    await page.getByRole('alert').filter({hasText:'Nothing advanced'}).waitFor();assert.equal(refused.after.raw,refused.before.raw);assert.equal(refused.after.phase,'weekend');assert.equal(refused.after.rng,refused.before.rng);assert.equal(refused.after.draws,refused.before.draws);assert.equal(refused.after.writes.filter(w=>w.key===SAVE&&w.failed).length,1);
    await page.evaluate(()=>window.__formulaBrowser.failSave=false);const rapid=await capture('two actual qualifying callbacks',()=>click('Run qualifying',true));await phase('grid');certify('loaded-first-grid',rapid);await save(readInput(pure.fixtures['loaded-first-grid']),'qualifying once');assert.equal(rapid.after.writes.slice(rapid.before.writes.length).filter(w=>w.key===SAVE&&!w.failed).length,1,'two same-render qualifying callbacks save once');
    await reload('grid');await read('open actual qualifying list',()=>click('Qualifying grid'));
    const grid=JSON.parse((await state(page)).raw);const gridText=grid.qualifying.grid.map(r=>`${r.position}${r.name}${grid.teams.find(t=>t.id===r.teamId).name}${Math.floor(r.ms/60000)}:${((r.ms%60000)/1000).toFixed(3).padStart(6,'0')}Q${r.stage}`);
    await list('Qualifying grid',gridText);await shot('qualifying-grid',button('Back to career'));await read('qualifying Back',()=>click('Back to career'));
    const racePair=await capture('two actual race callbacks',()=>click('Run race',true));await phase('result');certify('loaded-first-result',racePair);await save(readInput(pure.fixtures['loaded-first-result']),'race once');assert.equal(racePair.after.writes.slice(racePair.before.writes.length).filter(w=>w.key===SAVE).length,1);
    await list('Race classification',raceRows(JSON.parse((await state(page)).raw)));await shot('race-result',button('Next weekend'));await reload('race result');
    for(const [name,panel,kind] of [['Driver standings','drivers','drivers'],['Team standings','teams','teams']]) {
      await read('open '+name,()=>click(name));const s=JSON.parse((await state(page)).raw);const expected=standings(s,1,kind).map(r=>`${r.rank}${r.name}${r.wins} wins · ${r.podiums} podiums${r.points} pts`);await list(name,expected);if(panel==='drivers')await shot('driver-standings',button('Back to career'));await read(name+' Back',()=>click('Back to career'));
    }
    for(const [name,panel,count,listName] of [['Calendar','calendar',24,'Grand Prix calendar'],['The grid','field',20,'Generated drivers'],['Career record','history',1,'Saved career races']]) {
      await read('open '+name,()=>click(name));assert.equal(await page.locator(`[data-formula-career-panel="${panel}"]`).count(),1);const s=JSON.parse((await state(page)).raw);let expected;
      if(panel==='calendar')expected=readInput(pure.fixtures['first-contracts']).races.map((r,i)=>{const saved=s.races.find(x=>x.season===s.season&&x.round===i),result=saved?.results.find(x=>x.driverId==='player');return`${i+1}${r.event}${result?(result.position===null?'Retired':'P'+result.position)+' · '+result.points+' pts':i===s.round&&s.phase!=='retired'?'Current weekend':'Not raced'}`;});
      else if(panel==='field')expected=s.drivers.map(d=>`${d.name}${s.teams.find(t=>t.id===d.teamId).name} · Age ${d.age}Pace ${d.pace.toFixed(1)} · Racecraft ${d.racecraft.toFixed(1)} · Composure ${d.composure.toFixed(1)} · Potential ${d.potential.toFixed(1)}`);
      else expected=s.races.filter(r=>r.season===s.season).map(r=>{const result=r.results.find(x=>x.driverId==='player');return`${r.round+1}. ${r.event}${result.position===null?'Retired':'P'+result.position} · ${result.points} pts · ${s.teams.find(t=>t.id===result.teamId).name}`;});
      assert.equal(expected.length,count);await list(listName,expected);
      if(panel==='history'){const replay=page.getByRole('list',{name:listName,exact:true}).getByRole('button');await read('actual saved race replay',async()=>{await geometry(page,replay,width,height);await replay.click();});await list('Race classification',raceRows(JSON.parse((await state(page)).raw)));}
      await read(name+' Back',()=>click('Back to career'));
    }
    const helpPair=await read('reopen rules and restore',async()=>{await click('Formula Career rules');assert.equal(await page.getByRole('dialog').count(),1);await click("Let's play");assert.equal(await page.getByRole('dialog').count(),0);});assert.equal(helpPair.after.focus.aria,'Formula Career rules','actual rules opener focus restored');assert.deepEqual(bodyState(helpPair.after.body),bodyState(helpPair.before.body),'all meaningful body restoration fields');
    const helpGeometry=await geometry(page,button('Formula Career rules'),width,height);const healthy={width,height,before:helpPair.before,after:helpPair.after,tape:helpPair.after.tape.slice(helpPair.before.tape.length),geometry:helpGeometry};assert.deepEqual(failures(healthy),[]);row.controls.push({id:'healthy-read',object:retain(healthy)});
    const fault=clone(healthy);fault.after.raw+=' ';fault.after.draws+=1;fault.tape.push({value:0.25,stack:'copied observation control'});fault.after.body.attribute='data-unsafe';fault.geometry.paint[0].hit=false;fault.geometry.rect.height=43;
    const detected=failures(fault);assert.deepEqual(detected,['save-bytes','read-stream','body-restore','geometry','control']);assert.notDeepEqual(fault,healthy);
    const undo=clone(fault);undo.after.raw=undo.after.raw.slice(0,-1);undo.after.draws-=1;undo.tape.pop();undo.after.body.attribute=healthy.after.body.attribute;undo.geometry.paint[0].hit=true;undo.geometry.rect.height=healthy.geometry.rect.height;
    assert.deepEqual(undo,healthy,'complete changed observation undo');assert.deepEqual(failures(undo),[]);row.controls.push({id:'effective-complete-read-fault',healthy:retain(healthy),fault:retain(fault),undo:retain(undo),expected:detected,actual:detected});
    const empty=clone(healthy);empty.before.body.attribute=null;empty.before.body.declarations=[];empty.after.body.attribute='';empty.after.body.declarations=[];assert.notEqual(json(empty.before.body),json(empty.after.body));assert.deepEqual(failures(empty),[]);row.controls.push({id:'empty-attribute-equivalence',observation:retain(empty)});
    const cancelled=await read('retirement cancellation',async()=>{await click('Retire');await click('Keep career');});assert.equal(cancelled.after.focus.text,'Retire','actual cancel restores its opener focus');assert.deepEqual(bodyState(cancelled.before.body),bodyState(cancelled.after.body));
    const partialCount=completionRows().length;const partial=await capture('partial actual retirement',async()=>{await click('Retire');await click('Confirm retirement',true);});await phase('retired');certify('loaded-partial-retired',partial,true);await save(readInput(pure.fixtures['loaded-partial-retired']),'partial retirement');await waitCompletions(partialCount+1);await reload('partial retirement');assert.equal(completionRows().length,partialCount+1);
    await click('New career');await page.locator('#formula-new-name').fill('Formula Proof 2');await page.evaluate(()=>window.__formulaBrowser.seed=2);const replacement=await capture('two captured replacement callbacks',()=>click('Start new career',true));await phase('weekend');await save(readInput(pure.fixtures['replacement-initial']),'replacement once');assert.equal(replacement.after.writes.slice(replacement.before.writes.length).filter(w=>w.key===SAVE).length,1);
    await restore('first-contracts');await shot('seat-offers',button('Sign contract with '+readInput(pure.fixtures['first-contracts']).teams.find(t=>t.id===readInput(pure.fixtures['first-contracts']).offers[0].teamId).name));
    const negotiated=readInput(pure.fixtures['loaded-negotiated']),offerId=readInput(pure.browserActions.find(r=>r.id==='loaded-negotiated').args)[0],offer=negotiated.offers.find(o=>o.id===offerId),team=negotiated.teams.find(t=>t.id===offer.teamId).name;
    const offerCard=page.locator('[data-formula-offer]').filter({has:page.getByRole('button',{name:'Negotiate with '+team,exact:true})});assert.equal(await offerCard.count(),1);
    const negotiate=await capture('two actual negotiation callbacks',()=>click('Negotiate with '+team,true));certify('loaded-negotiated',negotiate);await save(negotiated,'negotiate once');assert.equal(negotiate.after.writes.slice(negotiate.before.writes.length).filter(w=>w.key===SAVE).length,1);assert(await button('Negotiate with '+team).isDisabled());assert((await offerCard.textContent()).includes(money(offer.salary)));await reload('negotiated contracts');
    const signed=await capture('two actual seat-sign callbacks',()=>click('Sign contract with '+team,true));await phase('weekend');certify('loaded-next-season',signed);await save(readInput(pure.fixtures['loaded-next-season']),'atomic seat and world advance');assert.equal(signed.after.writes.slice(signed.before.writes.length).filter(w=>w.key===SAVE).length,1);await shot('next-season',button('Run qualifying'));await reload('next season');
    await read('historical driver standings',async()=>{await click('Driver standings');await page.getByLabel('Standings season',{exact:true}).selectOption('1');});const season2=JSON.parse((await state(page)).raw);await list('Driver standings',standings(season2,1,'drivers').map(r=>`${r.rank}${r.name}${r.wins} wins · ${r.podiums} podiums${r.points} pts`));await read('historical standings Back',()=>click('Back to career'));
    await restore('season-1-last-grid');const firstCompletionCount=completionRows().length;const finish=await capture('first full season actual final race',()=>click('Run race'));await phase('result');certify('loaded-season-1-last-result',finish,true);const completed=readInput(pure.fixtures['loaded-season-1-last-result']);await save(completed,'actual first full season completion');await waitCompletions(firstCompletionCount+1);assert.equal((await state(page)).completion,completed.completionEvent);
    const actionHealthy={raw:finish.after.raw,expected:completed,saveWrites:finish.after.writes.slice(finish.before.writes.length).filter(w=>w.key===SAVE).length,dispatches:completionRows().length-firstCompletionCount,payload:JSON.parse(completionRows().at(-1).body)};
    assert.deepEqual(actionFailures(actionHealthy),[]);const actionFault=clone(actionHealthy),broken=JSON.parse(actionFault.raw);broken.draws+=1;actionFault.raw=json(broken);actionFault.saveWrites+=1;actionFault.dispatches-=1;(Array.isArray(actionFault.payload)?actionFault.payload[0]:actionFault.payload).score=42;
    const actionDetected=actionFailures(actionFault);assert.notDeepEqual(actionFault,actionHealthy);assert.deepEqual(actionDetected,['save-output','callback-once','completion-once','personal-score']);
    const actionUndo=clone(actionFault),repaired=JSON.parse(actionUndo.raw);repaired.draws-=1;actionUndo.raw=json(repaired);actionUndo.saveWrites-=1;actionUndo.dispatches+=1;delete (Array.isArray(actionUndo.payload)?actionUndo.payload[0]:actionUndo.payload).score;
    assert.deepEqual(actionUndo,actionHealthy,'whole actual completion observation undo');assert.deepEqual(actionFailures(actionUndo),[]);row.controls.push({id:'effective-complete-action-fault',healthy:retain(actionHealthy),fault:retain(actionFault),undo:retain(actionUndo),expected:actionDetected,actual:actionDetected});
    await shot('season-complete',button('Review seat offers'));await reload('completed season');assert.equal(completionRows().length,firstCompletionCount+1);
    const immediate=await capture('immediate completed-season retirement',async()=>{await click('Retire');await click('Confirm retirement',true);});await phase('retired');certify('loaded-completed-retired',immediate);await save(readInput(pure.fixtures['loaded-completed-retired']),'same-key immediate retirement');assert.equal(completionRows().length,firstCompletionCount+1,'completed season and immediate retirement count once');await reload('completed retirement');assert.equal(completionRows().length,firstCompletionCount+1);
    await restore('last-result');const terminalCount=completionRows().length;const terminal=await capture('actual twentieth-season finish',()=>click('Finish career',true));await phase('retired');certify('loaded-terminal',terminal);await save(readInput(pure.fixtures['loaded-terminal']),'finite twenty-season finish');assert.equal(completionRows().length,terminalCount,'restored already-completed final result does not re-record');await shot('twenty-season-career-complete',button('New career'));await read('full terminal career record',()=>click('Career record'));assert.equal(await page.getByRole('list',{name:'Saved career races',exact:true}).locator(':scope > li').count(),24);await read('terminal Back',()=>click('Back to career'));await reload('terminal full career');assert.equal(completionRows().length,terminalCount);
    for(const request of completionRows()){const payload=JSON.parse(request.body);const rows=Array.isArray(payload)?payload:[payload];assert.equal(rows.length,1);assert.equal(rows[0].game,'f1-career');assert.equal(rows[0].player_name,'Formula Proof 1');assert.equal(Object.hasOwn(rows[0],'score'),false,'personal score excluded from anonymous payload');}
    assert.deepEqual(appErrors,[],'actual application page errors');await Promise.allSettled([...pending]);assert(row.assets.every(a=>!a.error),'all actual served assets equal retained built bytes');row.final=retain(await state(page));row.status='pass';
  } catch(error) {
    row.status='fail';row.errors.push({name:error.name,message:error.message,stack:error.stack});report.errors.push({width,...row.errors.at(-1)});
    try{row.failureState=retain(await state(page));const file=width+'/failure.png';mkdirSync(path.join(OUT,String(width)),{recursive:true});await page.screenshot({path:path.join(OUT,file),fullPage:false});const raw=readFileSync(path.join(OUT,file));row.screenshots.push({id:'failure',file,sha256:sha(raw),bytes:raw.length,width,height});}catch(e){row.errors.push({message:String(e)});}
  } finally {
    await context.close();await Promise.allSettled([...pending]);
    const drain={assets:clone(row.assets),pageErrors:clone(appErrors)}, detected=drainFailures(drain);
    row.finalDrain=retain(drain);
    if(detected.length){row.status='fail';const error={name:'AssertionError',message:'Complete final browser drain failed',detected,observations:row.finalDrain};row.errors.push(error);report.errors.push({width,...error});}
    else try {
      assert(drain.assets.length>0,'actual served assets available for the final-drain observation control');
      const fault=clone(drain);fault.assets[0].error='Copied final-drain asset observation fault';fault.pageErrors.push({name:'CopiedObservation',message:'Copied final-drain page-error observation fault'});
      const expected=['served-assets','page-errors'],actual=drainFailures(fault);assert.notDeepEqual(fault,drain);assert.deepEqual(actual,expected);
      const undo=clone(fault);if(Object.hasOwn(drain.assets[0],'error'))undo.assets[0].error=drain.assets[0].error;else delete undo.assets[0].error;undo.pageErrors.pop();
      assert.deepEqual(undo,drain,'complete changed-copy final-drain undo');assert.deepEqual(drainFailures(undo),[]);
      row.controls.push({id:'final-drain',healthy:row.finalDrain,fault:retain(fault),undo:retain(undo),expected,actual,qualification:'Copied observation only. No browser or transport error is manufactured.'});
    } catch(error){row.status='fail';const retained={name:error.name,message:error.message,stack:error.stack};row.errors.push(retained);report.errors.push({width,...retained});}
    row.pageErrors=retain(appErrors);row.assets=retain(row.assets);row.external=retain(row.external);
  }
}
try {
  for(const p of ['scripts/playFormulaCareer.mjs','src/pages/FormulaCareer.tsx','src/hooks/useFormulaCareer.ts','src/lib/formulaCareer.ts','src/data/formulaCareer2025.ts','src/lib/completions.ts','scripts/lib/hostLikeServer.mjs']) {
    const raw=readFileSync(path.join(ROOT,p));report.source.push({path:p,...retainBytes(raw,'source')});
  }
  const reportRaw=readFileSync(path.join(INPUT,'report.json')),manifestRaw=readFileSync(path.join(INPUT,'objects.json'));
  const pure=JSON.parse(reportRaw),manifest=JSON.parse(manifestRaw);assert.equal(pure.status,'pass','complete actual pure source proof passed');
  report.input={report:retainBytes(reportRaw,'json'),manifest:retainBytes(manifestRaw,'json'),objects:{},fixtures:pure.fixtures,browserActions:pure.browserActions};
  for(const r of manifest){assert(!inputObjects.has(r.hash));inputObjects.set(r.hash,r);}
  for(const hash of Object.values(pure.fixtures))readInput(hash);
  for(const row of pure.browserActions){assert.equal(row.error,null);for(const key of ['args','rawInput','parsed','inputAfter','output','parsePrivate','parseGlobal','private','global'])if(row[key])readInput(row[key]);assert.deepEqual(readInput(row.global),[],'actual pure callback uses no global stream');}
  for(const id of ['initial','replacement-initial','loaded-first-grid','loaded-first-result','first-contracts','loaded-negotiated','loaded-next-season','season-1-last-grid','loaded-season-1-last-result','loaded-completed-retired','loaded-partial-retired','last-result','loaded-terminal'])assert(pure.fixtures[id],'required genuine fixture '+id);
  browser=await chromium.launch({headless:true});
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:900}])await runCase(viewport,pure);
  assert.equal(report.cases.length,3);assert(report.cases.every(c=>c.status==='pass'),'every declared actual browser journey passed');
  report.status='pass';
}catch(error){report.status='fail';report.error={name:error.name,message:error.message,stack:error.stack};}
finally {
  if(browser)await browser.close();
  report.counts={journeys:report.cases.length,reloads:report.cases.reduce((n,c)=>n+c.reloads.length,0),screenshots:report.cases.reduce((n,c)=>n+c.screenshots.length,0),layouts:report.cases.reduce((n,c)=>n+c.layouts.length,0),steps:report.cases.reduce((n,c)=>n+c.steps.length,0),controls:report.cases.reduce((n,c)=>n+c.controls.length,0)};
  writeFileSync(path.join(OUT,'objects.json'),json([...objects.values()]));writeFileSync(path.join(OUT,'report.json'),json(report));
  const size=dir=>readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(path.join(dir,e.name)):readFileSync(path.join(dir,e.name)).length),0);
  writeFileSync(path.join(OUT,'size.json'),json({bytes:0,cap:430000000,wholeDeclaredEvidence:true}));let bytes=size(OUT);
  for(let i=0;i<3;i++){writeFileSync(path.join(OUT,'size.json'),json({bytes,cap:430000000,wholeDeclaredEvidence:true}));bytes=size(OUT);}
  if(bytes>=430000000){report.status='fail';report.sizeFailure={bytes,cap:430000000};writeFileSync(path.join(OUT,'report.json'),json(report));}
}
if(report.status!=='pass'){console.error('FAIL Formula Career browser:',json(report.errors),json(report.error));process.exitCode=1;}
else {
  console.log('Formula Career browser: '+report.counts.journeys+' complete actual saved-career journeys.');
  console.log('Formula Career reloads: '+report.counts.reloads+' whole byte-held restores, with no new completion on mount.');
  console.log('Formula Career page controls: '+report.counts.controls+' healthy/fault/undo observations and '+report.counts.layouts+' strict painted layouts.');
  console.log('Formula Career captures: '+report.counts.screenshots+' original PNGs at 320, 390 and 1280 pixels.');
  console.log('PASS Formula Career browser');
}
