/* Actual saved manager worlds, trusted input and locally fulfilled transport. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACTS = path.join(ROOT, 'manager-world-browser-artifacts');
const OUT = path.join(ARTIFACTS, 'native');
const CACHE = path.resolve(process.env.MANAGER_WORLD_FONT_CACHE || path.join(ARTIFACTS, 'font-cache'));
const digest = value => createHash('sha256').update(value).digest('hex');
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
assert(process.env.CI, 'World browser native execution runs only in remote CI');
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
  console.log(`Prepared ${manifest.length} world browser font and flag dependencies.`);
  process.exit(0);
}
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(CACHE, entry.file)); assert.equal(digest(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(fonts.has(sheets[0]), 'Prefetch current fonts before the guarded native run');
const held = ['src/components/club-manager/WorldTablesCard.tsx', 'src/components/club-manager/LeagueTableCard.tsx', 'src/components/FlagImg.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerEras.ts', 'src/lib/clubManagerWorldEdit.ts', 'src/data/clubManagerWorldRosters.ts', 'src/data/clubManagerRosters.ts', 'src/data/clubManagerALeague2026.ts', 'scripts/qa/managerWorldBrowser1077.mjs'];
const hashes = () => Object.fromEntries(held.map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
const report = { sourceBefore: hashes(), cases: [], controls: [], forwardedWrites: 0 };
fs.mkdirSync(OUT, { recursive: true });
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const { chromium } = await import('../lib/playwrightLoader.mjs');
const temp = fs.mkdtempSync(path.join(ROOT, '.manager-world-native-'));
const entry = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WorldTablesCard } from '@/components/club-manager/WorldTablesCard';
import { startCareer, worldLeagueDefs, careerLeagueOf, sortedWorldTable, leagueRounds, leagueTiebreak, tiebreakFootnote, playNextEntry, registerLeagueOverrides, ensureEraRosters } from '@/lib/clubManager';
import { swapClubs } from '@/lib/clubManagerWorldEdit';
import { applyTheme, storedTheme } from '@/lib/theme';
import '@/index.css';
applyTheme(storedTheme());
const played = (edited = false) => {
  let career = startCareer(edited ? 'Celtic' : 'Arsenal', undefined, undefined, undefined, undefined, edited ? swapClubs(null, 'Celtic', 'Brentford') : null);
  for (let i = 0; i < 12 && (career.world?.laliga?.round ?? 0) < 3; i++) career = playNextEntry(career, { skipHalftime: true }).state;
  if (!(career.world?.laliga?.round >= 3)) throw new Error('Actual engine failed to reach third league round');
  return career;
};
const proof = window.__worldProof = { scouts: [], career: null, expected: [], mode: 'modern' };
function App() {
  const [career, setCareer] = useState(played), [scouted, setScouted] = useState('');
  registerLeagueOverrides(career.leagueOverrides ?? null);
  const own = careerLeagueOf(career), mine = sortedWorldTable(career, own.id, career.table);
  proof.career = career;
  proof.expected = worldLeagueDefs(career).map(league => {
    const world = career.world?.[league.id], rows = league.id === own.id ? mine : world ? sortedWorldTable(career, league.id, world.table) : [...league.clubs].sort((a,b) => a.localeCompare(b)).map(club => ({ club, w:0,d:0,l:0,gf:0,ga:0,pts:0 }));
    const preseason = rows.every(row => row.w + row.d + row.l === 0);
    const round = league.id === own.id ? career.calendar.slice(0,career.week).filter(row => row.type === 'league').length : world?.round ?? 0;
    return { id: league.id, name: league.name, clubs: league.clubs, rows, title: preseason ? league.name + ' · pre-season, alphabetical order' : league.name + ' · round ' + Math.min(round,leagueRounds(league.clubs.length)) + ' of ' + leagueRounds(league.clubs.length), footnote: preseason ? null : tiebreakFootnote(leagueTiebreak(league.id),rows,career.pairResults?.[league.id]) };
  });
  return <main className="mx-auto max-w-3xl p-3" style={{ minHeight: '210vh' }}>
    <div className="mb-4 flex gap-2"><button className="min-h-11 rounded-lg border p-2" onClick={() => { proof.mode='edited'; setCareer(played(true)); }}>Use edited world</button><button className="min-h-11 rounded-lg border p-2" onClick={async () => { await ensureEraRosters('era2005'); proof.mode='era2005'; setCareer(startCareer('Barcelona','era2005')); }}>Use 2005 world</button></div>
    <WorldTablesCard career={career} myRows={mine} onClubClick={club => { proof.scouts.push(club); setScouted(club); }} />
    <p data-native-scout>{scouted}</p>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);`;
fs.writeFileSync(path.join(temp, 'entry.tsx'), entry);
fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="${sheets[0]}" rel="stylesheet"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`);
report.fixture = { sha256: digest(entry), mode: 'Actual startCareer, three engine rounds, saved tables, real swapClubs and era loading' };
const dist = path.join(temp, 'dist');
let browser, server;

async function measure(page) {
  return page.locator('[aria-label="League browser"]').evaluate(node => {
    const box = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height }; };
    const text = [...node.querySelectorAll('h3,h4,p,label,input,[data-world-league] span')].filter(el => el.getClientRects().length).map(el => ({ text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize), width: el.clientWidth, scroll: el.scrollWidth }));
    return { pane:box(node), viewport:{width:innerWidth,height:innerHeight}, scrollY, scrollWidth:document.documentElement.scrollWidth,
      targets:[...node.querySelectorAll('button,input')].map(el => ({ ...box(el), label:el.getAttribute('data-world-league') || el.textContent })), text };
  });
}
function checkMeasure(row) {
  assert(row.scrollWidth <= row.viewport.width + 1, 'No horizontal page overflow');
  assert(row.pane.x >= 0 && row.pane.right <= row.viewport.width && row.pane.y >= 0 && row.pane.bottom <= row.viewport.height, 'League browser is fully in view');
  for (const target of row.targets) { assert(target.width >= 44 && target.height >= 44, `44px league browser control: ${target.label}`); assert(target.x >= row.pane.x && target.right <= row.pane.right + 1, 'Control stays inside browser width'); }
  for (const text of row.text) { assert(text.font >= 12, 'Readable league browser text at least12px'); assert(text.scroll <= text.width + 1, 'League browser labels fit'); }
}

try {
  const { build } = await import('vite');
  await build({ root:temp, configFile:path.join(ROOT,'vite.config.ts'), publicDir:false, build:{outDir:dist,emptyOutDir:true,minify:false}, logLevel:'warn' });
  const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png' };
  server = createServer((request,response) => {
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url,'http://localhost'); let file = path.resolve(dist,'.'+decodeURIComponent(url.pathname));
    if (!file.startsWith(dist+path.sep) && file !== dist) { response.writeHead(403); response.end(); return; }
    if (url.pathname === '/') file = path.join(dist,'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200,{'content-type':mime[path.extname(file)] || 'application/octet-stream'}); response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(file));
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  const BASE = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true });
  for (const profile of [
    {width:320,height:780,touch:true,reduced:true,theme:'dark'},
    {width:390,height:844,touch:true,reduced:false,theme:'light'},
    {width:1280,height:720,touch:false,reduced:false,theme:'light'},
  ]) {
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${profile.theme}`;
    const row = {id,profile,network:[],assets:[],events:[],storageWrites:[],screenshots:[],geometry:[],checks:[],errors:[]}; report.cases.push(row); save();
    const context = await browser.newContext({ viewport:{width:profile.width,height:profile.height}, hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1,reducedMotion:profile.reduced?'reduce':'no-preference',colorScheme:profile.theme,serviceWorkers:'block',storageState:{cookies:[],origins:[{origin:BASE,localStorage:[{name:'dukb-theme',value:profile.theme}]}]} });
    await context.route('**/*',route => {
      const request = route.request(), url = new URL(request.url());
      if(url.origin === BASE) { assert(['GET','HEAD'].includes(request.method())); return route.continue(); }
      row.network.push({url:url.href,method:request.method(),fulfilledLocally:true});
      if(fonts.has(url.href)) { const cached=fonts.get(url.href); row.assets.push({url:url.href,bytes:cached.body.length,sha256:digest(cached.body)}); return route.fulfill({status:200,...cached}); }
      assert.notEqual(request.resourceType(),'image',`Every actual flag image must be prefetched: ${url.href}`);
      return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.__worldEvents=[]; window.__worldWrites=[];
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(this===localStorage)window.__worldWrites.push({key,bytes:String(value).length});return original.call(this,key,value);};
      for(const type of ['pointerdown','pointerup','click','input','keydown','keyup']) document.addEventListener(type,event=>{const node=event.target instanceof Element?event.target:null;window.__worldEvents.push({type,trusted:event.isTrusted,key:event.key,pointerType:event.pointerType,target:node?.getAttribute('data-world-league')||node?.getAttribute('aria-label')||node?.closest('button')?.textContent||node?.tagName});},true);
    });
    page.on('pageerror',error=>row.errors.push(String(error)));
    page.on('response',response=>{if(response.url().startsWith(BASE)&&response.status()>=400)row.errors.push(response.url()+':'+response.status());});
    const button = name => page.getByRole('button',{name,exact:true});
    const activate = async locator => { const box=await locator.boundingBox();assert(box&&box.width>=44&&box.height>=44); if(profile.touch)await locator.tap();else{await locator.focus();await locator.press('Enter');} };
    const search = () => page.getByRole('searchbox',{name:'Find a league or club'});
    const type = async query => { if(profile.touch)await search().tap();else await search().focus();await search().press('ControlOrMeta+A');await search().press('Backspace');if(query)await search().pressSequentially(query); };
    const ids = () => page.locator('[data-world-league]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-world-league')));
    const proof = () => page.evaluate(()=>window.__worldProof);
    const loadedFlags = async () => {
      const visible = await page.locator('[data-world-tables] img').evaluateAll(async nodes => {
        const visible = nodes.filter(node => {
          const r = node.parentElement.getBoundingClientRect(), list = node.closest('[data-world-league-list]')?.getBoundingClientRect();
          return r.bottom > Math.max(0, list?.top ?? 0) && r.top < Math.min(innerHeight, list?.bottom ?? innerHeight);
        });
        await Promise.all(visible.map(node => node.decode()));
        return visible.map(node => ({ src:node.src,loaded:node.complete&&node.naturalWidth>0,visible:getComputedStyle(node).display!=='none' }));
      });
      assert(visible.every(flag=>flag.loaded&&flag.visible),'Actual prefetched flags decode and remain visible'); return visible;
    };
    const screenshot = async (stage, verifyFlags = true) => {const name=`${id}-${stage}.png`;if(verifyFlags)await loadedFlags();await page.screenshot({path:path.join(OUT,name),animations:'disabled'});row.screenshots.push(name);save();};
    const tableProof = async leagueId => {
      const expected=(await proof()).expected.find(league=>league.id===leagueId); assert(expected);
      const title=page.getByText(expected.title,{exact:true});assert(await title.isVisible());
      const actual=await page.locator('[data-world-tables] [data-goals]').evaluateAll(nodes=>nodes.map(node=>{const cells=[...node.parentElement.children].map(cell=>cell.textContent);return{club:cells[1],w:Number(cells[2]),d:Number(cells[3]),l:Number(cells[4]),goals:node.getAttribute('data-goals'),gd:Number(cells[6]),pts:Number(cells[7])};}));
      assert.deepEqual(actual,expected.rows.map(r=>({club:r.club,w:r.w,d:r.d,l:r.l,goals:`${r.gf}-${r.ga}`,gd:r.gf-r.ga,pts:r.pts})),'Every displayed saved table cell equals the independent actual engine rows');
      if(expected.footnote)assert(await page.getByText(expected.footnote,{exact:true}).isVisible());
      row.checks.push({leagueId,title:expected.title,rows:actual,footnote:expected.footnote});
    };
    try {
      await page.goto(BASE,{waitUntil:'domcontentloaded'});await button('Browse leagues').waitFor();
      row.fonts=await page.evaluate(async()=>{await document.fonts.ready;const result=[];for(const family of ['Inter','Space Grotesk'])for(const weight of [400,500,600,700]){const faces=await document.fonts.load(`${weight} 16px "${family}"`,'Explore your world');result.push({family,weight,faces:faces.map(face=>({family:face.family,status:face.status}))});}return result;});
      for(const font of row.fonts)assert(font.faces.length>0&&font.faces.every(face=>face.status==='loaded'&&face.family.replaceAll('"','')===font.family));
      const initial=await proof();assert(initial.expected.length>0);const beforeSave=digest(JSON.stringify(initial.career));
      await page.evaluate(()=>scrollTo(0,48));const beforeY=await page.evaluate(()=>scrollY);
      await activate(button('Browse leagues'));assert(await search().evaluate(node=>document.activeElement===node));assert.equal(await page.evaluate(()=>scrollY),beforeY,'Opening browser does not jump the page');
      assert.deepEqual((await ids()).sort(),initial.expected.map(league=>league.id).sort());
      assert.equal(await page.getByRole('status').textContent(),`${initial.expected.length} leagues found`);
      assert(await page.getByText(`${initial.expected.length} leagues in this save`,{exact:true}).isVisible());
      const initialGeometry=await measure(page);checkMeasure(initialGeometry);row.geometry.push(initialGeometry);
      await loadedFlags();await screenshot('all-leagues');
      for(const [name,selector,property,value] of [['font','input[type="search"]','font-size','8px'],['target','[data-world-league="premier"]','min-height','20px'],['offscreen','[aria-label="League browser"]','transform','translateY(150vh)']]){
        const locator=page.locator(selector),original=await locator.getAttribute('style'),before=await measure(page);
        await locator.evaluate((node,change)=>{node.style.setProperty(change.property,change.value,'important');if(change.property==='min-height'){node.style.setProperty('height','20px','important');node.style.setProperty('padding','0','important');node.style.setProperty('overflow','hidden','important');}},{property,value});
        const changed=await measure(page);assert.notDeepEqual(changed,before);let rejected=false;try{checkMeasure(changed);}catch(error){assert(error instanceof assert.AssertionError);rejected=true;}assert(rejected,`DOM fault ${name} rejected`);
        await locator.evaluate((node,style)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);},original);const restored=await measure(page);assert.deepEqual(restored,before);checkMeasure(restored);
        report.controls.push({case:id,name,changed:true,rejected,restored:true,before,fault:changed});save();
      }
      for(const [query,expected] of [['England',['premier','championship']],['super lig',['superlig']],['Atletico Madrid',['laliga']],['Australia Sydney',['aleague']],['Arsenal Australia',[]]]){await type(query);assert.deepEqual((await ids()).sort(),expected.sort());}
      assert(await button('Clear search').isVisible());await activate(button('Clear search'));assert.equal((await ids()).length,initial.expected.length);
      await type('Australia');await activate(page.locator('[data-world-league="aleague"]'));assert(await button('Browse leagues').evaluate(node=>document.activeElement===node));assert.equal(await page.evaluate(()=>scrollY),beforeY,'Selection keeps scroll position');await tableProof('aleague');
      await activate(button('Browse leagues'));await type('not a real league');await activate(button('Back'));await tableProof('aleague');
      await activate(button('Browse leagues'));await type('Spain');await search().press('Escape');assert.equal(await page.locator('[aria-label="League browser"]').count(),0);assert(await button('Browse leagues').evaluate(node=>document.activeElement===node));assert.equal(await page.evaluate(()=>scrollY),beforeY);await tableProof('aleague');
      await activate(button('My league'));assert(await button('Browse leagues').evaluate(node=>document.activeElement===node));await tableProof('premier');
      await activate(button('Browse leagues'));await type('Spain');await activate(page.locator('[data-world-league="laliga"]'));await tableProof('laliga');
      const club=(await proof()).expected.find(league=>league.id==='laliga').rows[0].club;
      const scout=page.locator('[data-world-tables]').getByText(club,{exact:true});if(profile.touch)await scout.tap();else await scout.click();
      assert.deepEqual((await proof()).scouts,[club]);assert.equal(digest(JSON.stringify((await proof()).career)),beforeSave,'Browsing and scouting never change the career');
      await screenshot('saved-table');
      await activate(button('Use edited world'));await activate(button('Browse leagues'));await type('Celtic England');assert.deepEqual(await ids(),['premier']);await type('Brentford Scotland');assert.deepEqual(await ids(),['scottish']);await activate(page.locator('[data-world-league="scottish"]'));await tableProof('scottish');await screenshot('edited-table');
      await activate(button('Use 2005 world'));await page.waitForFunction(()=>window.__worldProof.mode==='era2005'&&window.__worldProof.career.eraId==='era2005');await activate(button('Browse leagues'));assert.deepEqual((await ids()).sort(),(await proof()).expected.map(league=>league.id).sort());await type('Australia');assert.deepEqual(await ids(),[]);await activate(button('Back'));assert((await proof()).mode==='era2005');
      row.events=await page.evaluate(()=>window.__worldEvents);row.storageWrites=await page.evaluate(()=>window.__worldWrites);
      assert(row.events.some(event=>event.type===(profile.touch?'pointerdown':'keydown')&&event.trusted),'Actual trusted native input retained');assert.equal(row.storageWrites.length,0);assert.deepEqual(row.errors,[]);
      row.passed=true;save();
    }catch(error){row.failure=String(error.stack||error);try{row.events=await page.evaluate(()=>window.__worldEvents);row.failureText=await page.locator('body').innerText();await screenshot('failure',false);}catch{}save();throw error;}
    finally{await context.close();}
  }
  assert.equal(report.cases.length,3);assert(report.cases.every(row=>row.passed));assert.equal(report.controls.length,9);
  report.sourceAfter=hashes();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.passed=true;save();
  console.log('PASS manager world native:3 profiles,9 effective DOM faults,actual modern/edited/historical worlds,unchanged saved tables and sources.');
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(temp);assert(resolved.startsWith(ROOT+path.sep+'.manager-world-native-'));fs.rmSync(resolved,{recursive:true,force:true});save();}
