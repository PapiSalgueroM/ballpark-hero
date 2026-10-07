/* Actual saved manager match plans, trusted input and locally fulfilled transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = path.join(ROOT, 'manager-match-plans-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.MANAGER_MATCH_PLANS_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
assert(process.env.CI, 'Match plan native execution runs only in remote CI');
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true });
  const manifest = [];
  const download = async url => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok, 'Font dependency response succeeds');
    const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: digest(body) });
    return body.toString('utf8');
  };
  const css = await download(sheets[0]);
  const urls = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
  assert(urls.length > 0, 'Actual stylesheet declares font files');
  for (const url of urls) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  const engine = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
  const flags = fs.readFileSync(path.join(ROOT, 'src/components/FlagImg.tsx'), 'utf8');
  const nations = engine.match(/export const NATIONS:[\s\S]*?\]\.map\(n =>/)[0];
  const codes = new Map([...flags.matchAll(/"([^"\n]+)":\s*"([a-z-]+)"/g)].map(row => [row[1], row[2]]));
  const required = [...new Set([...nations.matchAll(/name:\s*'([^']+)'/g)].map(row => { const code = codes.get(row[1]); assert(code, `Actual flag code for ${row[1]}`); return code; }))];
  assert(required.length > 0, 'Actual manager countries contribute flag dependencies');
  for (const code of required) if (code !== 'gb-eng') await download(`https://flagcdn.com/w40/${code}.png`);
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Prepared ${manifest.length} match plan font and flag dependencies.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current fonts before the guarded native run');
const held = ['src/components/club-manager/MatchPlansCard.tsx', 'src/components/club-manager/TacticsScreen.tsx', 'src/hooks/useClubManager.ts', 'src/lib/clubManagerMatchPlans.ts', 'src/lib/clubManager.ts', 'src/lib/clubManagerSlots.ts', 'src/lib/clubManagerEras.ts', 'src/lib/clubManagerInternationals.ts', 'src/components/FlagImg.tsx', 'src/hooks/useRevealScroll.ts', 'src/data/clubManagerWorldRosters.ts', 'src/data/clubManagerRosters.ts', 'src/data/clubManagerALeague2026.ts', 'scripts/qa/managerMatchPlans1079.mjs'];
const hashes = () => Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { sourceBefore: hashes(), cases: [], controls: [], forwardedWrites: 0, scope: 'Actual useClubManager and TacticsScreen, isolated browser storage, independent unchanged engine baseline' };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const temp = fs.mkdtempSync(path.join(ROOT, '.manager-plans-native-'));
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { useClubManager } from '@/hooks/useClubManager';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { startCareer, loadCareer, saveCareer, FORMATIONS, dutyOptions, setDuty, setSetPiece, setShootoutOrder, resolveXI, SAVE_KEY } from '@/lib/clubManager';
import { applyTheme, storedTheme } from '@/lib/theme';
import '@/index.css';
applyTheme(storedTheme());
let seeded = loadCareer();
if (!seeded) {
  seeded = startCareer('Arsenal');
  const formation = FORMATIONS[seeded.formationIndex];
  seeded = setDuty(seeded, 0, dutyOptions(formation.slots[0])[0]) ?? seeded;
  const takers = resolveXI(seeded).filter(player => player && player.position !== 'GK');
  seeded = setSetPiece(seeded, 'captain', takers[0].id) ?? seeded;
  seeded = setSetPiece(seeded, 'penalties', takers[1].id) ?? seeded;
  seeded = setShootoutOrder(seeded, takers.slice(0,3).map(player => player.id)) ?? seeded;
  if (!saveCareer(seeded)) throw new Error('Fixture initial save refused');
}
const stage = sessionStorage.getItem('qa-match-plan-stage');
if (stage === 'availability') {
  const ids = seeded.matchPlans[0].xiIds.filter(Boolean);
  seeded = { ...seeded, squad: seeded.squad.map(player => player.id === ids[1] ? { ...player, injuryWeeks: 3 } : player.id === ids[2] ? { ...player, suspendedMatches: 2 } : player.id === ids[3] ? { ...player, fitness: 27 } : player) };
  if (!saveCareer(seeded)) throw new Error('Fixture availability save refused');
} else if (stage === 'foreign') {
  const plans = seeded.matchPlans;
  seeded = { ...startCareer('Chelsea'), matchPlans: plans };
  if (!saveCareer(seeded)) throw new Error('Fixture foreign-club save refused');
}
sessionStorage.removeItem('qa-match-plan-stage');
const initial = JSON.parse(JSON.stringify(seeded));
function App() {
  const game = useClubManager();
  window.__matchPlanRead = () => ({ phase: game.phase, career: game.career, initial, saveFailed: game.saveFailed, raw: localStorage.getItem(SAVE_KEY) });
  const stageNext = value => { sessionStorage.setItem('qa-match-plan-stage', value); location.reload(); };
  return <main className="mx-auto max-w-2xl p-3">
    <h1 className="font-display text-xl">Manager match plan verification</h1>
    <p className="text-xs">Actual career hook and tactics screen. Fixture controls change input conditions only.</p>
    <div className="flex flex-wrap gap-2 my-3">
      {game.phase === 'resume' && <button className="min-h-11 min-w-11 rounded border px-3 text-xs" onClick={game.resume}>Resume saved manager</button>}
      {game.phase === 'hub' && <>
        <button className="min-h-11 min-w-11 rounded border px-3 text-xs" onClick={game.play}>Kick off actual fixture</button>
        <button className="min-h-11 min-w-11 rounded border px-3 text-xs" onClick={() => stageNext('availability')}>Stage current availability</button>
      </>}
      {game.career && <button className="min-h-11 min-w-11 rounded border px-3 text-xs" onClick={() => stageNext('foreign')}>Visit foreign club fixture</button>}
    </div>
    <p data-native-phase className="text-xs">{game.phase}: {game.career?.clubName}</p>
    {game.career && game.phase !== 'boot' && game.phase !== 'resume' && <TacticsScreen career={game.career}
      onFormation={game.setFormationIndex} onMentality={game.setMentality} onSlot={game.setXiSlot}
      onSwap={game.swapXiSlots} onAutoPick={game.autoPick} onDuty={game.setSlotDuty}
      onSetPiece={game.assignSetPiece} onAutoSetPieces={game.autoPickSetPieces} onShootoutOrder={game.setShootoutOrder}
      onSaveMatchPlan={game.saveMatchPlan} onApplyMatchPlan={game.applyMatchPlan} onDeleteMatchPlan={game.deleteMatchPlan} />}
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);`;
fs.writeFileSync(path.join(temp, 'entry.tsx'), entry);
fs.writeFileSync(path.join(OUT, 'fixture-entry.tsx'), entry);
fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="${sheets[0]}" rel="stylesheet"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`);
report.fixture = { sha256: digest(entry), availability: 'Two genuine saved player IDs get injury/suspension and a third gets fitness 27 before real hook reload. No result or player is invented.', foreign: 'Actual Chelsea startCareer receives foreign Arsenal plans to test isolation.' };
const dist = path.join(temp, 'dist');
let browser, server;
const tactics = career => ({ formationIndex: career.formationIndex, mentality: career.mentality, xiIds: career.xiIds, xiDuties: career.xiDuties ?? [], setPieces: career.setPieces, shootoutOrder: career.shootoutOrder ?? [] });
const otherState = career => { const copy = structuredClone(career); for (const key of ['formationIndex','mentality','xiIds','xiDuties','setPieces','shootoutOrder','matchPlans']) delete copy[key]; return copy; };
const paneSelector = '[data-cm-match-plans]';
async function settled(page) {
  await page.waitForFunction(() => document.getAnimations().every(animation => !['running','pending'].includes(animation.playState) || !Number.isFinite(animation.effect?.getComputedTiming().endTime)), undefined, { timeout: 10000 });
  await page.evaluate(() => new Promise((resolve,reject) => {
    const started=performance.now();let previous='',stable=0;
    const frame=()=>{const pane=document.querySelector('[data-cm-match-plans]')?.getBoundingClientRect();const key=JSON.stringify([scrollY,pane?.x,pane?.y,pane?.width,pane?.height]);stable=key===previous?stable+1:0;previous=key;if(stable>=4)resolve();else if(performance.now()-started>5000)reject(new Error('Actual layout/scroll did not settle'));else requestAnimationFrame(frame);};requestAnimationFrame(frame);
  }));
}
async function measure(page) {
  return page.locator(paneSelector).evaluate(node => {
    const box = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    const visible = element => element.getClientRects().length > 0;
    const text = [...node.querySelectorAll('p,label,input,button,li,dt,dd,strong,span')].filter(visible).map(element => ({ text:element.textContent, font:parseFloat(getComputedStyle(element).fontSize), width:element.clientWidth, scroll:element.scrollWidth, truncate: getComputedStyle(element).textOverflow === 'ellipsis' }));
    return { pane:box(node), viewport:{width:innerWidth,height:innerHeight}, scrollY, scrollWidth:document.documentElement.scrollWidth, text,
      targets:[...node.querySelectorAll('button,input')].filter(visible).map(element => ({...box(element),label:element.getAttribute('aria-label')||element.textContent, disabled:element.disabled})),
      actions:[...node.querySelectorAll('[data-cm-plan-apply],[data-cm-plan-details]')].filter(visible).map(element => { const r=box(element); return {...r,label:element.textContent,hit:element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}; }) };
  });
}
function checkGeometry(row, requireActions = true) {
  assert(row.scrollWidth <= row.viewport.width + 1, 'No horizontal page overflow');
  assert(row.pane.x >= -1 && row.pane.right <= row.viewport.width + 1, 'Plan pane stays inside viewport width');
  for (const target of row.targets) { assert(target.width >= 44 && target.height >= 44, `44px match plan target: ${target.label}`); assert(target.x >= row.pane.x - 1 && target.right <= row.pane.right + 1, 'Plan target stays within pane'); }
  for (const text of row.text) { assert(text.font >= 12, 'Match plan text is at least 12px'); if (!text.truncate) assert(text.scroll <= text.width + 1, `Plan text does not clip: ${text.text}`); }
  if (requireActions) {
    assert.equal(row.actions.length, 2, 'Apply and lineup actions are rendered');
    for (const action of row.actions) assert(action.y >= 0 && action.bottom <= row.viewport.height && action.hit, 'Plan action is visible and unobscured without driver scrolling');
  }
}
async function fontProof(page) {
  const rows = await page.evaluate(async () => { await document.fonts.ready; const rows=[]; for(const family of ['Inter','Space Grotesk']) for(const weight of [400,500,600,700]) { const faces=await document.fonts.load(`${weight} 16px "${family}"`,'Match plans'); rows.push({family,weight,faces:faces.map(face=>({family:face.family,status:face.status}))}); } return rows; });
  for (const row of rows) assert(row.faces.length > 0 && row.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"','') === row.family), 'Actual requested font faces loaded');
  return rows;
}

try {
  const { build: bundle } = await import('esbuild');
  const baselineFile = path.join(temp, 'independent-engine.mjs');
  await bundle({ entryPoints:[path.join(ROOT,'src/lib/clubManager.ts')], outfile:baselineFile, bundle:true, platform:'node', format:'esm', alias:{'@':path.join(ROOT,'src')}, logLevel:'silent' });
  fs.copyFileSync(baselineFile, path.join(OUT, 'independent-engine.mjs'));
  const engine = await import(pathToFileURL(baselineFile).href);
  report.baseline = { sha256:digest(fs.readFileSync(baselineFile)), source:'Unchanged clubManager.ts bundled independently of React and match-plan helper' };
  const expectedPreview = (career, plan) => {
    const state = {...structuredClone(career), ...tactics(plan)};
    const formation = engine.FORMATIONS[state.formationIndex], actual = engine.effectiveXIWithSlots(state);
    return { state, rows:formation.slots.map((slot,index) => { const row=actual.find(item=>item.slot===slot),picked=career.squad.find(player=>player.id===plan.xiIds[index]); return {slot:index,label:slot.label,id:row?.p.id??'',name:row?.p.name??'No available player',fitness:row?Math.round(row.p.fitness):null,duty:row?.duty??null,unavailable:picked?.injuryWeeks>0?'Injured':picked?.suspendedMatches>0?'Suspended':null}; }), currentStrength:engine.matchStrengthNow(career).toFixed(1), strength:engine.matchStrengthNow(state).toFixed(1), fitness:actual.length?Math.round(actual.reduce((sum,row)=>sum+row.p.fitness,0)/actual.length):null, replacements:formation.slots.filter((slot,index)=>actual.find(row=>row.slot===slot)?.p.id!==plan.xiIds[index]).length };
  };
  const { build } = await import('vite');
  await build({ root:temp, configFile:path.join(ROOT,'vite.config.ts'), publicDir:false, build:{outDir:dist,emptyOutDir:true,minify:false}, logLevel:'warn' });
  const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
  server = createServer((request,response) => {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url=new URL(request.url,'http://localhost'); let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(dist+path.sep)&&file!==dist){response.writeHead(403);response.end();return;}
    if(url.pathname==='/')file=path.join(dist,'index.html');
    if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end();return;}
    response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});response.end(request.method==='HEAD'?undefined:fs.readFileSync(file));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const BASE=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});
  for(const profile of [{width:320,height:780,touch:true,reduced:true,theme:'dark'},{width:390,height:844,touch:true,reduced:false,theme:'light'},{width:1280,height:720,touch:false,reduced:false,theme:'light'}]) {
    const id=`${profile.width}-${profile.touch?'touch':'keyboard'}-${profile.theme}`;
    const row={id,profile,network:[],assets:[],images:[],events:[],documents:[],screenshots:[],geometry:[],checks:[],errors:[],consoleErrors:[],sockets:[],networkWrites:[],navigation:[],fonts:[]};report.cases.push(row);save();
    const protectedStorage={soccerCareerSave:'qa-unrelated-soccer', 'nba-my-career-save-v1':'qa-unrelated-nba', 'dukb-local-completions':'qa-unrelated-completion'};
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1,reducedMotion:profile.reduced?'reduce':'no-preference',colorScheme:profile.theme,serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:BASE,localStorage:Object.entries({'dukb-theme':profile.theme,...protectedStorage}).map(([name,value])=>({name,value}))}]} });
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(!['GET','HEAD','OPTIONS'].includes(request.method()))row.networkWrites.push({url:url.href,method:request.method(),body:request.postData()});
      if(url.origin===BASE){assert(['GET','HEAD'].includes(request.method()));return route.continue();}
      row.network.push({url:url.href,method:request.method(),fulfilledLocally:true});
      if(fonts.has(url.href)){const asset=fonts.get(url.href);row.assets.push({url:url.href,sha256:digest(asset.body),bytes:asset.body.length});return route.fulfill({status:200,...asset});}
      if(['image','font','stylesheet'].includes(request.resourceType()))row.errors.push(`Uncached actual asset: ${url.href}`);
      return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    });
    const page=await context.newPage();page.setDefaultTimeout(15000);
    await page.addInitScript(()=>{
      window.__planEvents=[];window.__planWrites=[];window.__planRemovals=[];
      const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
      Storage.prototype.setItem=function(key,value){if(this===localStorage)window.__planWrites.push({key,value:String(value)});return set.call(this,key,value);};
      Storage.prototype.removeItem=function(key){if(this===localStorage)window.__planRemovals.push(key);return remove.call(this,key);};
      for(const type of ['pointerdown','pointerup','click','input','keydown','keyup'])document.addEventListener(type,event=>{const target=event.target instanceof Element?event.target:null;window.__planEvents.push({type,trusted:event.isTrusted,key:event.key,pointerType:event.pointerType,target:target?.getAttribute('aria-label')||target?.closest('button')?.textContent||target?.tagName});},true);
    });
    page.on('pageerror',error=>row.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push(message.text());});page.on('websocket',socket=>row.sockets.push(socket.url()));
    page.on('response',response=>{if(response.url().startsWith(BASE)&&response.status()>=400)row.errors.push(response.url()+':'+response.status());});
    const button=name=>page.getByRole('button',{name,exact:true});
    const read=()=>page.evaluate(()=>window.__matchPlanRead());
    const navigate=async(locator,reason)=>{row.navigation.push({reason,before:await page.evaluate(()=>scrollY)});await locator.scrollIntoViewIfNeeded();await settled(page);};
    const activate=async(locator,{legacy=false}={})=>{const box=await locator.boundingBox();assert(box);if(!legacy)assert(box.width>=44&&box.height>=44,'New native target is at least44px');if(profile.touch)await locator.tap();else{await locator.focus();await locator.press('Enter');}await settled(page);};
    const activateReload=async locator=>{const box=await locator.boundingBox();assert(box&&box.width>=44&&box.height>=44);if(!profile.touch)await locator.focus();await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),profile.touch?locator.tap():locator.press('Enter')]);};
    const screenshot=async(stage,verifyImages=true)=>{if(verifyImages){const images=await page.locator('img').evaluateAll(async nodes=>{const visible=nodes.filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;});await Promise.all(visible.map(node=>node.decode()));return visible.map(node=>({src:node.src,loaded:node.complete&&node.naturalWidth>0}));});assert(images.every(image=>image.loaded),'Actual visible images decode');row.images.push({stage,images});}const file=`${id}-${stage}.png`;await page.screenshot({path:path.join(OUT,file)});row.screenshots.push(file);save();};
    const collectDocument=async stage=>{
      const data=await page.evaluate(()=>({events:window.__planEvents,writes:window.__planWrites,removals:window.__planRemovals,storage:{...localStorage}}));
      for(const [key,value]of Object.entries(protectedStorage))assert.equal(data.storage[key],value,'Unrelated saved progress is byte-exact');
      for(const write of data.writes)assert(write.key===engine.SAVE_KEY||/^lswt-/.test(write.key),`Only actual manager autosave or auth probe may write: ${write.key}`);
      assert(data.removals.every(key=>/^lswt-/.test(key)),'No career or score removal');
      const file=`${id}-${stage}-save.json`;fs.writeFileSync(path.join(OUT,file),data.storage[engine.SAVE_KEY]);
      row.events.push(...data.events);row.documents.push({stage,savedFile:file,savedSha256:digest(data.storage[engine.SAVE_KEY]),writes:data.writes.map(write=>({key:write.key,bytes:Buffer.byteLength(write.value),sha256:digest(write.value)})),removals:data.removals,otherStorage:Object.fromEntries(Object.entries(data.storage).filter(([key])=>key!==engine.SAVE_KEY))});save();
    };
    const resume=async()=>{await button('Resume saved manager').waitFor();row.fonts.push(...await fontProof(page));await activate(button('Resume saved manager'));await page.waitForFunction(()=>window.__matchPlanRead().phase==='hub');};
    const openPlans=async()=>{const trigger=page.locator('[data-cm-tile-btn="plans"]');await navigate(trigger,'Explicit navigation from tactics to saved-plan tile');if(await trigger.getAttribute('aria-expanded')!=='true')await activate(trigger);await page.locator(paneSelector).waitFor();};
    const checkClose=async(method,before)=>{assert.equal(await page.locator(paneSelector).count(),0);assert(await page.locator('[data-cm-tile-btn="plans"]').evaluate(node=>document.activeElement===node),'Closing restores actual tile focus');const after=await page.evaluate(()=>({y:scrollY,max:Math.max(0,document.documentElement.scrollHeight-innerHeight)}));assert(Math.abs(after.y-Math.min(before,after.max))<=1,'Closing keeps scroll apart from unavoidable document-height clamp');row.checks.push({stage:`close-${method}`,beforeY:before,after});};
    const typeName=async value=>{const input=page.locator('[data-cm-plan-name]');await navigate(input,'User reaches plan-name field');if(profile.touch)await input.tap();else await input.focus();await input.press('ControlOrMeta+A');await input.press('Backspace');await input.pressSequentially(value);};
    const assertPersisted=async()=>{await page.waitForFunction(()=>{const proof=window.__matchPlanRead(),saved=JSON.parse(proof.raw);return JSON.stringify(saved.matchPlans)===JSON.stringify(proof.career.matchPlans)&&JSON.stringify(saved.xiIds)===JSON.stringify(proof.career.xiIds)&&saved.formationIndex===proof.career.formationIndex&&saved.mentality===proof.career.mentality;});const proof=await read();assert.equal(proof.saveFailed,false);assert.deepEqual(tactics(JSON.parse(proof.raw)),tactics(proof.career));return proof;};
    const preview=async(slot,{details=false,unaided=true}={})=>{
      await activate(page.locator(`[data-cm-plan-slot="${slot}"]`));
      const proof=await read(),plan=proof.career.matchPlans.find(plan=>plan.slot===slot),expected=expectedPreview(proof.career,plan);
      assert.equal(await page.locator('[data-cm-plan-strength]').textContent(),`${expected.currentStrength} now / ${expected.strength} with plan`);
      assert.equal(await page.locator('[data-cm-plan-fitness]').textContent(),expected.fitness===null?'No available players':`${expected.fitness}% average`);
      assert((await page.locator('[data-cm-plan-replacements]').textContent()).startsWith(expected.replacements?`${expected.replacements} saved spot${expected.replacements===1?'':'s'} need a replacement.`:'All saved picks can start.'));
      if(unaided){await page.waitForFunction(()=>[...document.querySelectorAll('[data-cm-plan-apply],[data-cm-plan-details]')].length===2&&[...document.querySelectorAll('[data-cm-plan-apply],[data-cm-plan-details]')].every(node=>{const r=node.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight;}));const geometry=await measure(page);row.geometry.push({stage:`preview-${slot}`,value:geometry});save();checkGeometry(geometry);}
      if(details){await activate(page.locator('[data-cm-plan-details]'));const actual=await page.locator('[data-cm-plan-row]').evaluateAll(nodes=>nodes.map(node=>({slot:Number(node.getAttribute('data-cm-plan-row')),id:node.getAttribute('data-cm-plan-player'),text:node.textContent})));assert.equal(actual.length,expected.rows.length);for(const wanted of expected.rows){const found=actual.find(item=>item.slot===wanted.slot);assert.equal(found.id,wanted.id);assert(found.text.includes(wanted.name));if(wanted.fitness!==null)assert(found.text.includes(`${wanted.fitness}% fitness`));if(wanted.duty)assert(found.text.includes(engine.DUTY_INFO[wanted.duty].label));if(wanted.unavailable)assert(found.text.includes(wanted.unavailable),'Current unavailability is explained honestly');}const names=plan.shootoutOrder.map(id=>proof.career.squad.find(player=>player.id===id)?.name).filter(Boolean);assert.equal(await page.locator('[data-cm-plan-shootout]').textContent(),`Shootout order: ${names.join(', ')||'Auto'}`);const assignments=await page.locator('[data-cm-plan-assignments] dd').allTextContents();assert.deepEqual(assignments,engine.SET_PIECE_KEYS.map(key=>proof.career.squad.find(player=>player.id===plan.setPieces[key])?.name??'Auto pick'));const detailGeometry=await measure(page);checkGeometry(detailGeometry,false);row.geometry.push({stage:'expanded-details',value:detailGeometry});await screenshot('details-'+slot+'-'+row.checks.length);await navigate(page.locator('[data-cm-plan-details]'),'User closes expanded kickoff details');await activate(page.locator('[data-cm-plan-details]'));}
      const after=await read();assert.deepEqual(after.career,proof.career,'Preview and details do not change career');assert.equal(after.raw,proof.raw,'Preview writes no new save value');row.checks.push({stage:`preview-${slot}`,expected:{...expected,state:undefined}});return expected;
    };
    try {
      await page.goto(BASE,{waitUntil:'domcontentloaded'});await resume();
      let proof=await assertPersisted();const original=structuredClone(proof.career);
      await openPlans();await typeName('First XI');await activate(page.locator('[data-cm-plan-save]'));proof=await assertPersisted();
      const first=proof.career.matchPlans.find(plan=>plan.slot===0);assert(first);assert.deepEqual(tactics(first),tactics(original));assert.deepEqual(otherState(proof.career),otherState(original));
      await preview(0);await screenshot('first-plan');
      for(const [name,selector,property,value]of [['font','[data-cm-plan-strength]','font-size','8px'],['target','[data-cm-plan-apply]','min-height','20px'],['offscreen','[data-cm-plan-preview]','transform','translateY(150vh)']]) {
        const locator=page.locator(selector),style=await locator.getAttribute('style'),before=await measure(page);
        await locator.evaluate((node,change)=>{node.style.setProperty(change.property,change.value,'important');if(change.property==='min-height'){node.style.setProperty('height','20px','important');node.style.setProperty('padding','0','important');node.style.setProperty('overflow','hidden','important');}},{property,value});
        const changed=await measure(page);assert.notDeepEqual(changed,before,'DOM fault changes measured values');let rejection=null;try{checkGeometry(changed);}catch(error){assert(error instanceof assert.AssertionError,'Negative control fails an assertion');rejection={name:error.name,message:error.message};}assert(rejection,`DOM fault ${name} is rejected`);await screenshot(`fault-${name}`);
        await locator.evaluate((node,old)=>old===null?node.removeAttribute('style'):node.setAttribute('style',old),style);
        const restored=await measure(page);assert.deepEqual(restored,before,'DOM geometry restores exactly');checkGeometry(restored);report.controls.push({profile:id,name,before,changed,rejection,restored});save();
      }
      const beforeHelp=await read();const help=button('Match plan rules');await navigate(help,'User reaches help in the plan pane');await activate(help);assert(await page.locator('[data-cm-plan-rules]').isVisible());await activate(help);assert.deepEqual((await read()).career,beforeHelp.career);
      const back=page.locator(paneSelector).getByRole('button',{name:'Back',exact:true});await navigate(back,'User returns to tactics');const beforeBack=await page.evaluate(()=>scrollY);await activate(back);await checkClose('back',beforeBack);
      await openPlans();const nameInput=page.locator('[data-cm-plan-name]');await nameInput.focus();const beforeEscape=await page.evaluate(()=>scrollY);await nameInput.press('Escape');await settled(page);await checkClose('escape',beforeEscape);
      const shape=engine.FORMATIONS.findIndex((formation,index)=>index!==original.formationIndex&&formation.slots.length===11);assert(shape>=0);
      const formation=page.locator(`[data-cm-formation-btn="${engine.FORMATIONS[shape].name}"]`);await navigate(formation,'User changes existing formation control');await activate(formation,{legacy:true});
      const mentality=page.locator('[data-cm-mentality-btn="attacking"]');await activate(mentality,{legacy:true});
      proof=await assertPersisted();const otherPlayer=proof.career.squad.find(player=>player.id===proof.career.xiIds[2]);assert(otherPlayer);
      const slot=page.locator('[data-cm-slot="1"]');await navigate(slot,'User opens existing XI slot picker');await activate(slot,{legacy:true});const option=page.getByRole('dialog').getByRole('button').filter({hasText:otherPlayer.name});assert.equal(await option.count(),1);await activate(option,{legacy:true});
      const duty=engine.dutyOptions(engine.FORMATIONS[shape].slots[0]).at(-1);await navigate(page.locator('[data-cm-duty="0"]'),'User changes existing slot duty');await activate(page.locator('[data-cm-duty="0"]'),{legacy:true});await activate(page.locator(`[data-cm-duty-opt="${duty}"]`),{legacy:true});
      proof=await assertPersisted();const captain=engine.setPieceCandidates(proof.career,'captain').find(player=>player.id!==first.setPieces.captain);assert(captain,'Another real eligible captain is available');
      await navigate(page.locator('[data-cm-tile-btn="setpieces"]'),'User changes existing set-piece assignment');await activate(page.locator('[data-cm-tile-btn="setpieces"]'));await activate(page.locator('[data-cm-sp-row="captain"]'),{legacy:true});await activate(page.locator(`[data-cm-sp-list="captain"] [data-cm-sp-opt="${captain.id}"]`),{legacy:true});
      await navigate(page.locator('[data-cm-tile-btn="shootout"]'),'User changes existing shootout order');await activate(page.locator('[data-cm-tile-btn="shootout"]'));await activate(page.locator('[data-cm-so-clear]'),{legacy:true});
      const order=(await read()).career.xiIds.filter(Boolean).slice(1,4).reverse();for(const playerId of order){const option=page.locator(`[data-cm-so-opt="${playerId}"]`);await navigate(option,'User adds a real shootout taker');await activate(option,{legacy:true});}
      await openPlans();await activate(page.locator('[data-cm-plan-slot="1"]'));await typeName('Attack plan');await activate(page.locator('[data-cm-plan-save]'));proof=await assertPersisted();const second=proof.career.matchPlans.find(plan=>plan.slot===1);assert(second);assert.equal(second.formationIndex,shape);assert.equal(second.mentality,'attacking');assert.equal(second.xiDuties[0],duty);assert.equal(second.setPieces.captain,captain.id);assert.deepEqual(second.shootoutOrder,order);assert.notDeepEqual(second.xiIds,first.xiIds);
      await preview(0,{details:true});await activate(page.locator('[data-cm-plan-apply]'));proof=await assertPersisted();assert.deepEqual(tactics(proof.career),tactics(first));assert.deepEqual(otherState(proof.career),otherState(original));
      await preview(1);await activate(page.locator('[data-cm-plan-apply]'));proof=await assertPersisted();assert.deepEqual(tactics(proof.career),tactics(second));await screenshot('second-plan-applied');
      await collectDocument('before-reload');const savedTactics=tactics(proof.career),savedPlans=structuredClone(proof.career.matchPlans);await page.reload({waitUntil:'domcontentloaded'});await resume();proof=await assertPersisted();assert.deepEqual(tactics(proof.career),savedTactics);assert.deepEqual(proof.career.matchPlans,savedPlans);
      await collectDocument('before-availability');await navigate(button('Stage current availability'),'Explicit QA input condition change');await activateReload(button('Stage current availability'));await resume();proof=await assertPersisted();const healthBefore=structuredClone(proof.career.squad);assert.equal(healthBefore.find(player=>player.id===first.xiIds[1]).injuryWeeks,3);assert.equal(healthBefore.find(player=>player.id===first.xiIds[2]).suspendedMatches,2);assert.equal(healthBefore.find(player=>player.id===first.xiIds[3]).fitness,27);
      await openPlans();const current=await preview(0,{details:true});assert(current.replacements>=2,'Preview replaces actually injured and suspended saved picks');await activate(page.locator('[data-cm-plan-apply]'));proof=await assertPersisted();assert.deepEqual(tactics(proof.career),tactics(first));assert.deepEqual(proof.career.squad,healthBefore,'Applying plan cannot heal or restore saved fitness');await screenshot('current-availability');
      const beforeKickoff=structuredClone(proof.career);const expectedKickoff=engine.playNextEntry(structuredClone(beforeKickoff));assert.equal(expectedKickoff.kind,'halftime');
      await navigate(button('Kick off actual fixture'),'User starts actual engine match');await activate(button('Kick off actual fixture'));await page.waitForFunction(()=>window.__matchPlanRead().phase==='halftime');proof=await assertPersisted();assert(proof.career.live);assert.deepEqual(proof.career.live.startXi,expectedKickoff.live.startXi,'Actual hook kickoff uses independent real engine lineup');assert.equal(proof.career.live.formationIndex,first.formationIndex);assert.equal(proof.career.live.mentality,first.mentality);assert.deepEqual(proof.career.live.duties,first.xiDuties);row.checks.push({stage:'kickoff',actual:proof.career.live,expectedStartXi:expectedKickoff.live.startXi});
      await openPlans();await activate(page.locator('[data-cm-plan-slot="1"]'));assert(await page.locator('[data-cm-plan-apply]').isDisabled());assert(await page.locator('[data-cm-plan-save]').isDisabled());await screenshot('live-plan-locked');
      await collectDocument('before-foreign');await navigate(button('Visit foreign club fixture'),'Explicit foreign-club isolation fixture');await activateReload(button('Visit foreign club fixture'));await resume();proof=await assertPersisted();assert.equal(proof.career.clubName,'Chelsea');const foreignBefore=structuredClone(proof.career);await openPlans();assert((await page.locator('[data-cm-tile-btn="plans"]').textContent()).includes('0/3'));assert.equal(await page.locator('[data-cm-plan-preview]').count(),0);assert.equal(await page.locator('[data-cm-plan-apply]').count(),0);for(let slot=0;slot<3;slot++){await activate(page.locator(`[data-cm-plan-slot="${slot}"]`));assert.equal(await page.locator('[data-cm-plan-preview]').count(),0);}assert.deepEqual((await read()).career,foreignBefore);
      await activate(page.locator('[data-cm-plan-slot="0"]'));await typeName('Chelsea plan');await activate(page.locator('[data-cm-plan-save]'));proof=await assertPersisted();assert.equal(proof.career.matchPlans.length,1);assert.equal(proof.career.matchPlans[0].clubName,'Chelsea');await preview(0);await screenshot('foreign-club-isolated');
      await collectDocument('finished');assert(row.events.some(event=>event.type===(profile.touch?'pointerdown':'keydown')&&event.trusted));assert.deepEqual(row.errors,[]);assert.deepEqual(row.consoleErrors,[]);assert.deepEqual(row.sockets,[]);assert.deepEqual(row.networkWrites,[]);row.passed=true;save();
    } catch(error) {row.failure=String(error.stack||error);try{row.failureText=await page.locator('body').innerText();row.failureProof=await read();if(await page.locator(paneSelector).count())row.failureGeometry=await measure(page);await collectDocument('failure');await screenshot('failure',false);}catch(retentionError){row.retentionError=String(retentionError);}save();throw error;}
    finally {await context.close();}
  }
  assert.equal(report.cases.length,3);assert(report.cases.every(row=>row.passed));assert.equal(report.controls.length,9);assert.equal(report.forwardedWrites,0);report.sourceAfter=hashes();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.passed=true;save();
  console.log('PASS manager match plans native: 3 actual hook journeys, 9 effective restored DOM faults, independent engine previews and kickoff, reload and club isolation.');
} finally {await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));report.sourceAfter=hashes();report.sourcesHeld=JSON.stringify(report.sourceAfter)===JSON.stringify(report.sourceBefore);const resolved=path.resolve(temp);assert(resolved.startsWith(ROOT+path.sep+'.manager-plans-native-'));fs.rmSync(resolved,{recursive:true,force:true});save();}
