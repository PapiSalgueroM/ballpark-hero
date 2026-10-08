/* Finite actual Phone overlay display proof. Remote CI only, no campaign or live services. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert(process.env.CI, 'Phone currency verification executes only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = path.join(ROOT, 'soccer-phone-currency-artifacts');
const OUT = path.join(ART, 'native'), CACHE = path.join(ART, 'asset-cache');
const NOW = Date.parse('2026-10-07T12:00:00Z'), SEED = 10901007;
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const fileHash = file => {
  { const bytes = fs.readFileSync(file); return hash(bytes); }
};
const json = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const fontLinks = [...template.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1);
if (process.argv.includes('--prefetch-assets-only')) {
  fs.mkdirSync(CACHE, { recursive: true }); const manifest = [];
  async function fetchAsset(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200); const body = Buffer.from(await response.arrayBuffer()), file = hash(url);
    fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, sha256: hash(body), bytes: body.length, contentType: response.headers.get('content-type') }); return body.toString('utf8');
  }
  const css = await fetchAsset(fontLinks[0]);
  const fonts = [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)/g)].map(match => match[1]))];
  assert(fonts.length > 0); for (const url of fonts) await fetchAsset(url);
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Cached ${manifest.length} actual template font dependencies.`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
function hashes(directories, extras = []) {
  const result = {};
  function visit(dir) { for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = `${dir}/${entry.name}`; if (entry.isDirectory()) visit(name); else result[name] = fileHash(path.join(ROOT, name));
  } }
  directories.forEach(visit); for (const file of extras) result[file] = fileHash(path.join(ROOT, file)); return result;
}
const sourceHashes = () => hashes(['src'], ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'scripts/qa/soccerPhoneCurrency1090.mjs', 'scripts/simSoccerPhoneCurrency.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']);
const report = { complete: false, phase: 'prepare', scope: 'Eight preferences in actual compiled PhonePanel with actual engine-created, explicitly staged display fixtures.',
  limits: ['Finite component mount, not the full Soccer Career route or campaign. No purchase, deposit, wager or scored completion is exercised.',
    'Three Chromium emulated viewport families. Existing small metadata and old Back/button styling are recorded, not credited as redesigned.',
    'Readability floor covers the changed Phone total, Bank wage and shared rate note. Other money leaves are checked for exact text and clipping.'],
  sourceBefore: sourceHashes(), buildBefore: hashes(['dist']), cacheBefore: hashes(['soccer-phone-currency-artifacts/asset-cache']), cases: [], controls: [], errors: [] };
const persist = () => json('report.json', report);
persist();
let browser, server, finished = false;
function closingHolds() {
  report.sourceAfter = sourceHashes(); report.buildAfter = hashes(['dist']); report.cacheAfter = hashes(['soccer-phone-currency-artifacts/asset-cache']);
  assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore);
}
process.once('SIGTERM', () => {
  if (finished) return; finished = true; report.complete = false; report.errors.push({ name: 'DeadlineError', phase: report.phase });
  try { closingHolds(); } catch (error) { report.holdError = { name: error.name, message: error.message }; }
  server?.close(); persist(); process.exit(124);
});

function engineEnvironment() {
  const original = { Date, random: Math.random, fetch: globalThis.fetch, storage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), socket: Object.getOwnPropertyDescriptor(globalThis, 'WebSocket') };
  const memory = new Map(), writes = [], transport = []; let seed = SEED, draws = 0;
  globalThis.Date = class extends original.Date { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Math.random = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { writes.push({ method: 'setItem', key, value }); memory.set(key, String(value)); }, removeItem: key => { writes.push({ method: 'removeItem', key }); memory.delete(key); } } });
  globalThis.fetch = async url => { transport.push(String(url)); throw new Error('Fixture transport is forbidden'); };
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class { constructor(url) { transport.push(String(url)); throw new Error('Fixture socket is forbidden'); } } });
  return { memory, read: () => ({ seed, draws, now: Date.now(), writes: clone(writes), transport: clone(transport) }), restore: () => {
    globalThis.Date = original.Date; Math.random = original.random; globalThis.fetch = original.fetch;
    for (const [name, descriptor] of [['localStorage', original.storage], ['WebSocket', original.socket]]) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  } };
}
try {
  const bundled = await build({ absWorkingDir: ROOT, stdin: { contents: `export * as E from './src/lib/soccerCareerEngine'; export * as M from './src/lib/soccerMoney'; export * as C from './src/lib/soccerCurrency';`, resolveDir: ROOT }, bundle: true, write: false, platform: 'node', format: 'esm', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
  const engineFile = path.join(OUT, 'independent-engine.mjs'); fs.writeFileSync(engineFile, bundled.outputFiles[0].contents); json('independent-engine-metafile.json', bundled.metafile);
  const env = engineEnvironment(); let fixtures;
  try {
    const beforeImport = env.read(), { E, M, C } = await import(pathToFileURL(engineFile).href), afterImport = env.read();
    const initial = E.initCareer('Currency Review', 'England', 'CM', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, E.FALLBACK_CLUBS, undefined, 90);
    const youth = E.advanceYouthYear(clone(initial), E.FALLBACK_CLUBS), offer = youth.pendingOffers[0]; assert(offer);
    const accepted = E.acceptOffer(clone(youth), offer), asset = M.ASSETS[0], shop = E.SPENDING_ITEMS.find(item => item.id === 'private_jet'); assert(shop && asset);
    const plans = [
      ['EUR', 320, -12.5], ['GBP', 390, 0], ['USD', 1280, 12.375], ['BRL', 320, 1234.56],
      ['MXN', 390, -1250.25], ['JPY', 320, 1234.56], ['INR', 390, 1234.56], ['AUD', 1280, 0],
    ];
    fixtures = plans.map(([code, width, netWorth]) => {
      const career = clone(accepted); career.netWorth = netWorth; career.weeklyWage = 12345; career.purchasedItems = [];
      career.money = M.ensureMoney(career); const money = career.money;
      money.vault = 0; money.hold[asset.id] = netWorth === 0 ? 0 : 2.5; money.cost[asset.id] = netWorth === 0 ? 0 : 2;
      money.price[asset.id] = 125; money.hist[asset.id] = [100, 110, 125]; money.log = [{ y: 2021, t: 'Display fixture deposit', a: -1.34 }, { y: 2021, t: 'Display fixture receipt', a: 2.5 }];
      env.memory.set('dukb-soccer-currency', code); const currency = C.getCurrency(), bank = M.bankSummary(career), held = M.holdingValue(money, asset.id), pnl = M.unrealised(money, asset.id);
      const expected = { total: E.formatNetWorth(career.netWorth + M.moneyWealth(career)), bank: E.formatNetWorth(bank.total), cash: E.formatNetWorth(bank.cash), vault: E.formatNetWorth(bank.vault), invested: E.formatNetWorth(bank.invested),
        wage: `${currency.symbol}${Math.round(career.weeklyWage * currency.perEur).toLocaleString('en-US')}`, note: C.rateNote(), free: E.formatNetWorth(M.spendable(career)), held: E.formatNetWorth(held), pnl: `${pnl >= 0 ? '+' : ''}${E.formatNetWorth(pnl)}`,
        index: String(Math.round(money.price[asset.id])), move: `${M.lastMove(money, asset.id) > 0 ? '+' : ''}${M.lastMove(money, asset.id)}%`, shopCost: E.formatNetWorth(shop.cost), shopAnnual: `then ${E.formatNetWorth(shop.monthlyCost)} a year, every year`, shopDescription: C.localizeMoney(shop.description) };
      return { code, profile: { width, height: width === 320 ? 780 : width === 390 ? 844 : 720, touch: width < 1000, theme: width === 320 ? 'dark' : 'light', reduced: width === 320 }, career, bytes: JSON.stringify(career), currency, asset, shop, expected };
    });
    assert.equal(fixtures.length, C.CURRENCIES.length); assert.deepEqual(fixtures.map(row => row.code), C.CURRENCIES.map(row => row.code));
    json('fixture-origins.json', { beforeImport, afterImport, initial, youth, offer, accepted, finalEnvironment: env.read(), engineSha256: fileHash(engineFile),
      staging: 'Only display balances, integer wage12345, empty purchased list and stated market/ledger values are staged on an actual accepted career. All stored amounts retain euro units. No fixture claims earned wealth or real financial facts.' });
    assert.deepEqual(env.read().writes, []); assert.deepEqual(env.read().transport, []);
  } finally { env.restore(); }
  json('fixtures.json', fixtures);
  const entry = `import React, { useState } from 'react'; import { createRoot } from 'react-dom/client'; import PhonePanel from '@/components/soccer-career/PhonePanel';
const fixture = await (await fetch('/fixture.json')).json();
window.__phone1090.career = fixture.career;
function Host() { const [open,setOpen] = useState(false); const record = (name,args) => window.__phone1090.callbacks.push({name,args});
return <main style={{minHeight:'100vh',padding:16}}><button data-fixture-open style={{minHeight:44,minWidth:140}} onClick={()=>setOpen(true)}>Open phone</button><button style={{minHeight:44}}>Behind phone</button>
{open && <PhonePanel career={fixture.career} onAnswer={(...args)=>record('answer',args)} onMoney={(...args)=>record('money',args)} onBuyItem={(...args)=>record('buy',args)} onClose={()=>{record('close',[]);setOpen(false);}}/>}</main>; }
createRoot(document.getElementById('root')).render(<Host/>);`;
  fs.writeFileSync(path.join(OUT, 'mount.tsx'), entry);
  const ui = await build({ absWorkingDir: ROOT, stdin: { contents: entry, resolveDir: ROOT, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'esm', metafile: true, alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  const uiBytes = Buffer.from(ui.outputFiles[0].contents); fs.writeFileSync(path.join(OUT, 'mount.js'), uiBytes); json('mount-metafile.json', ui.metafile);
  for (const name of ['src/components/soccer-career/PhonePanel.tsx', 'src/components/soccer-career/MoneyScreens.tsx']) assert(ui.metafile.inputs[name], `Actual component is compiled: ${name}`);
  const styles = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(name => name.endsWith('.css')).sort(); assert(styles.length > 0);
  const resources = new Map([['/mount.js', { body: uiBytes, type: 'text/javascript' }]]);
  for (const file of styles) resources.set(`/assets/${file}`, { body: fs.readFileSync(path.join(ROOT, 'dist/assets', file)), type: 'text/css' });
  resources.set('/', { body: Buffer.from(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,">${fontLinks.map(url => `<link rel="stylesheet" href="${url}">`).join('')}${styles.map(file => `<link rel="stylesheet" href="/assets/${file}">`).join('')}</head><body><div id="root"></div><script type="module" src="/mount.js"></script></body></html>`), type: 'text/html' });
  json('served-resources.json', Object.fromEntries([...resources].map(([url, value]) => [url, { sha256: hash(value.body), bytes: value.body.length, type: value.type }])));
  const assets = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'))).map(asset => { const body = fs.readFileSync(path.join(CACHE, asset.file)); assert.equal(hash(body), asset.sha256); assert.equal(body.length, asset.bytes); return [asset.url, { ...asset, body }]; }));
  server = createServer((_request, response) => { response.writeHead(500); response.end('Requests must be fulfilled by the declared fixture route.'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import('../lib/playwrightLoader.mjs'); browser = await chromium.launch({ headless: true });
  const controlProfiles = new Set();
  for (const fixture of fixtures) {
    const profile = fixture.profile, row = { code: fixture.code, profile, complete: false, states: [], measurements: [], requests: [], sockets: [], errors: [], animations: [], screenshots: [] }; report.cases.push(row); report.phase = `${fixture.code}:launch`; persist();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block' });
    const pending = new Set();
    await context.routeWebSocket('**/*', route => { row.sockets.push(route.url()); return route.close(); });
    await context.route('**/*', route => {
      const task = (async () => {
        const req = route.request(), url = new URL(req.url()), record = { url: req.url(), method: req.method() }; row.requests.push(record);
        assert.equal(req.method(), 'GET', 'All fixture transport is read-only');
        let payload;
        if (url.origin === base && url.pathname === '/fixture.json') payload = { body: Buffer.from(JSON.stringify(fixture)), type: 'application/json' };
        else if (url.origin === base) payload = resources.get(url.pathname);
        else { const asset = assets.get(url.href); if (asset) payload = { body: asset.body, type: asset.contentType }; }
        assert(payload, `Undeclared request ${req.url()}`); Object.assign(record, { sha256: hash(payload.body), bytes: payload.body.length, locallyFulfilled: true });
        await route.fulfill({ status: 200, contentType: payload.type, body: payload.body });
      })().catch(async error => { row.errors.push({ name: error.name, message: error.message, stack: error.stack }); try { await route.abort(); } catch {} }).finally(() => pending.delete(task));
      pending.add(task); return task;
    });
    await context.addInitScript(({ fixture, seed }) => {
      localStorage.setItem('soccerCareerSave', fixture.bytes); localStorage.setItem('dukb-soccer-currency', fixture.code); localStorage.setItem('dukb-theme', fixture.profile.theme);
      localStorage.setItem('other-game-sentinel', 'unchanged opaque fixture bytes'); sessionStorage.setItem('session-sentinel', 'unchanged');
      const theme = () => document.documentElement.classList.toggle('dark', fixture.profile.theme === 'dark');
      if(document.documentElement)theme();else addEventListener('DOMContentLoaded',theme,{once:true});
      const q = window.__phone1090 = { seed, draws: 0, writes: [], callbacks: [], inputs: [], career: null };
      Math.random = () => { q.draws++; q.seed = (Math.imul(q.seed, 1664525) + 1013904223) >>> 0; return q.seed / 4294967296; };
      for (const method of ['setItem','removeItem','clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { const result = original.apply(this,args); q.writes.push({ scope: this === localStorage ? 'local' : 'session', method, args }); return result; }; }
      for (const type of ['click','keydown']) addEventListener(type,event=>q.inputs.push({type,key:event.key??null,trusted:event.isTrusted,text:event.target?.textContent??''}),true);
    }, { fixture, seed: SEED });
    const page = await context.newPage(); page.on('pageerror', error => row.errors.push({ name: error.name, message: error.message, stack: error.stack }));
    await page.clock.setFixedTime(NOW); await page.goto(base, { waitUntil: 'networkidle' }); await page.locator('[data-fixture-open]').waitFor();
    row.fonts = await page.evaluate(async () => { await document.fonts.ready; return Promise.all(['Inter','Space Grotesk'].flatMap(family=>[400,500,600,700].map(async weight=>({family,weight,faces:(await document.fonts.load(`${weight} 16px "${family}"`)).map(face=>({family:face.family,weight:face.weight,status:face.status}))})))); });
    assert(row.fonts.length === 8 && row.fonts.every(font => font.faces.length > 0 && font.faces.every(face => face.status === 'loaded' && face.family.replace(/^["']|["']$/g,'') === font.family && face.weight === String(font.weight))));
    const snap = () => page.evaluate(() => ({ career: structuredClone(window.__phone1090.career), storage: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()), writes: structuredClone(window.__phone1090.writes), callbacks: structuredClone(window.__phone1090.callbacks), rng:{seed:window.__phone1090.seed,draws:window.__phone1090.draws}, now:Date.now(), scrollY, inputs:structuredClone(window.__phone1090.inputs), active:document.activeElement?.outerHTML }));
    const baseline = await snap(); row.baseline = baseline; assert.deepEqual(baseline.career,fixture.career); assert.deepEqual(baseline.writes,[]); assert.deepEqual(baseline.callbacks,[]);
    const hold = async label => { const state=await snap(); row.states.push({label,state}); persist(); for(const key of ['career','storage','session','writes','rng','now','scrollY']) assert.deepEqual(state[key],baseline[key],`${label}: ${key} remains held`); assert.deepEqual(state.callbacks,[],`${label}: no economic or close callback`); return state; };
    async function settle(label) {
      report.phase=`${fixture.code}:${label}:finite-animations`; persist();
      const before=await snap(); const value=await page.evaluate(async()=>{ const handles=document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)); const rows=handles.map(a=>({state:a.playState,timing:a.effect?.getComputedTiming()})); await Promise.all(handles.map(a=>a.finished)); return rows; });
      const after=await snap(); row.animations.push({label,observed:value,before,after}); for(const key of ['career','storage','session','writes','callbacks','rng','now','scrollY']) assert.deepEqual(after[key],before[key],`${label}: animations hold ${key}`);
    }
    async function press(locator) { if(profile.touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); } }
    const dialog=page.getByRole('dialog',{name:'Your phone',exact:true});
    async function screenshot(label) { report.phase=`${fixture.code}:${label}:screenshot`; persist(); for(const fullPage of [false,true]){const file=`${fixture.code}-${profile.width}-${label}-${fullPage?'full':'viewport'}.png`; await page.screenshot({path:path.join(OUT,file),fullPage}); row.screenshots.push(file);} persist(); }
    async function measured(locator,label,minFont=0) {
      const data=await locator.evaluate((el,viewport)=>{
        const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}); const r=el.getBoundingClientRect(); const fragments=[]; const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let node;
        while((node=walker.nextNode())){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const f of range.getClientRects()){const hit=document.elementFromPoint(f.x+f.width/2,f.y+f.height/2);fragments.push({...rect(f),hit:!!hit&&(el.contains(hit)||hit===el)});}}
        const clips=[];for(let a=el;a;a=a.parentElement){const s=getComputedStyle(a);if(/hidden|auto|scroll|clip/.test(s.overflowX+' '+s.overflowY))clips.push({...rect(a.getBoundingClientRect()),clipX:/hidden|auto|scroll|clip/.test(s.overflowX),clipY:/hidden|auto|scroll|clip/.test(s.overflowY)});}
        return {text:el.textContent,html:el.outerHTML,rect:rect(r),font:parseFloat(getComputedStyle(el).fontSize),fragments,clips,viewport,documentWidth:document.documentElement.scrollWidth,innerWidth,innerHeight};
      },{width:profile.width,height:profile.height}); row.measurements.push({label,data}); persist(); return data;
    }
    function readable(data,label,minFont=0) {
      assert(data.rect.width>0&&data.rect.height>0,`${label}: rendered geometry`); assert(data.documentWidth<=profile.width+1,`${label}: document fits physical width`);
      assert(data.rect.x>=-1&&data.rect.right<=profile.width+1&&data.rect.y>=-1&&data.rect.bottom<=profile.height+1,`${label}: visible in physical viewport`);
      assert(data.font>=minFont,`${label}: readable font`); assert(data.fragments.length>0,`${label}: visible text fragments`);
      for(const f of data.fragments){assert(f.x>=-1&&f.right<=profile.width+1&&f.y>=-1&&f.bottom<=profile.height+1,`${label}: glyphs fit physical viewport`); for(const c of data.clips)assert((!c.clipX||(f.x>=c.x-1&&f.right<=c.right+1))&&(!c.clipY||(f.y>=c.y-1&&f.bottom<=c.bottom+1)),`${label}: ancestor clipping`); assert(f.hit,`${label}: text is not occluded`);}
    }
    async function inspect(locator,label,minFont=0) { const data=await measured(locator,label,minFont); readable(data,label,minFont); return data; }
    async function footer(label) { if(fixture.expected.note) await inspect(dialog.getByText(fixture.expected.note,{exact:true}),`${label}:rate-note`,12); else assert.equal(await dialog.getByText(/Converted from euros/).count(),0); }
    async function back(name,expectedApp) { await press(dialog.getByRole('button',{name,exact:true})); await settle('back'); if(expectedApp)assert.equal(await page.locator(`[data-phone-app="${expectedApp}"]`).evaluate(el=>el===document.activeElement),true,'Return focus reaches original app tile'); }
    await press(page.locator('[data-fixture-open]')); await dialog.waitFor(); await settle('open'); assert.equal(await dialog.evaluate(el=>el===document.activeElement),true,'Phone receives focus');
    await inspect(dialog.getByText(`${fixture.expected.total} to your name`,{exact:true}),'home-total',12); await footer('home'); await hold('home'); await screenshot('home');
    await press(dialog.locator('[data-phone-app="bank"]')); await settle('bank');
    const wage=dialog.getByText(`wage ${fixture.expected.wage} a week`,{exact:true}); const total=wage.locator('..').locator('div').nth(1);
    const bankTotal=await inspect(total,'bank-total'); assert.equal(bankTotal.text,fixture.expected.bank,'Bank total matches canonical display');
    const wageProof=await inspect(wage,'bank-wage',12); assert.equal(wageProof.text,`wage ${fixture.expected.wage} a week`); await footer('bank'); await hold('bank'); await screenshot('bank');
    if(fixture.expected.note&&!controlProfiles.has(profile.width)) {
      controlProfiles.add(profile.width);
      for(const kind of ['wage','note-occlusion','amount-clipping']) {
        const target=kind==='wage'?wage:kind==='note-occlusion'?dialog.getByText(fixture.expected.note,{exact:true}):total;
        const control={code:fixture.code,width:profile.width,kind,before:await measured(target,`control:${kind}:before`),stateBefore:await snap(),proved:false}; report.controls.push(control); persist();
        try {
          await target.evaluate((el,kind)=>{window.__fault1090={el,html:el.innerHTML,style:el.getAttribute('style'),overlay:null}; if(kind==='wage')el.textContent='wage WRONG a week'; else if(kind==='amount-clipping')Object.assign(el.style,{width:'1px',overflow:'hidden'});else{const r=el.getBoundingClientRect();const overlay=document.createElement('div');Object.assign(overlay.style,{position:'fixed',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',background:'#000',zIndex:'2147483647'});document.body.append(overlay);window.__fault1090.overlay=overlay;}},kind);
          control.fault=await measured(target,`control:${kind}:fault`);control.stateFault=await snap();persist(); assert.notDeepEqual(control.fault,control.before,'Fault changes observed geometry/text/hit');
          for(const key of ['career','storage','session','writes','callbacks','rng','now','scrollY'])assert.deepEqual(control.stateFault[key],control.stateBefore[key]);
          try {if(kind==='wage')assert.equal(control.fault.text,`wage ${fixture.expected.wage} a week`,'Bank exact converted integer wage');else readable(control.fault,kind,kind==='note-occlusion'?12:0);}catch(error){control.failure={name:error.name,message:error.message,actual:error.actual,expected:error.expected};}
          assert.equal(control.failure?.name,'AssertionError');assert.match(control.failure.message,kind==='wage'?/Bank exact converted integer wage/:kind==='note-occlusion'?/text is not occluded/:/ancestor clipping/);
          await screenshot(`fault-${kind}`);
        } finally {
          await page.evaluate(()=>{const f=window.__fault1090;f.overlay?.remove();f.el.innerHTML=f.html;if(f.style===null)f.el.removeAttribute('style');else f.el.setAttribute('style',f.style);delete window.__fault1090;});
          control.restored=await measured(target,`control:${kind}:restored`);control.stateRestored=await snap();persist();assert.deepEqual(control.restored,control.before,'Exact original DOM and geometry restored');for(const key of ['career','storage','session','writes','callbacks','rng','now','scrollY'])assert.deepEqual(control.stateRestored[key],control.stateBefore[key]);
        }
        readable(control.restored,kind,kind==='wage'||kind==='note-occlusion'?12:0); control.proved=true; await screenshot(`restored-${kind}`);
      }
    }
    await back('‹ Home','bank'); await press(dialog.locator('[data-phone-app="market"]')); await settle('market');
    assert.equal(await dialog.getByText(`You have ${fixture.expected.free} to put in`,{exact:true}).count(),1); const assetButton=dialog.getByRole('button').filter({hasText:fixture.asset.name}); assert.equal(await assetButton.count(),1);
    await inspect(assetButton.getByText(fixture.expected.index,{exact:true}),'market-index'); assert.equal(await assetButton.getByText(fixture.expected.move,{exact:true}).count(),1); await footer('market'); await hold('market');
    await press(assetButton); await settle('asset'); assert.equal(await dialog.getByText(`${fixture.expected.move} last season`,{exact:true}).count(),1);
    const heldRow=dialog.getByText('You are holding',{exact:true}).locator('..'); await inspect(heldRow.locator('span').last(),'asset-held'); assert.equal(await heldRow.locator('span').last().textContent(),fixture.expected.held);
    await footer('asset'); await hold('asset'); await screenshot('asset'); await back('‹ Market'); await back('‹ Home','market');
    await press(dialog.locator('[data-phone-app="shop"]')); await settle('shop'); assert.equal(await dialog.getByText(`${fixture.expected.free} to spend`,{exact:true}).count(),1);
    await press(dialog.getByRole('button').filter({hasText:'What you drive'})); await settle('shop-category');
    const item=dialog.getByText(fixture.shop.name,{exact:true}).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await item.scrollIntoViewIfNeeded(); await inspect(item.getByRole('button',{name:fixture.expected.shopCost,exact:true}),'shop-price'); await inspect(item.getByText(fixture.expected.shopAnnual,{exact:true}),'shop-upkeep'); assert.equal(await item.getByText(fixture.expected.shopDescription,{exact:true}).count(),1);
    await footer('shop'); await hold('shop-category'); await screenshot('shop'); await back('‹ My Life'); await back('‹ Home','shop'); await hold('returned-home');
    if(profile.touch)await press(dialog.getByRole('button',{name:'Put phone away',exact:true}));else await page.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'}); await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-fixture-open'));
    row.final=await snap();for(const key of ['career','storage','session','writes','rng','now','scrollY'])assert.deepEqual(row.final[key],baseline[key]);assert.deepEqual(row.final.callbacks,[{name:'close',args:[]}]);assert(row.final.inputs.length>0&&row.final.inputs.every(input=>input.trusted));
    await Promise.all([...pending]);assert.deepEqual(row.errors,[]);assert.deepEqual(row.sockets,[]);row.complete=true;persist();await context.close();
  }
  assert.equal(report.cases.length,8);assert.equal(report.controls.length,9);assert(report.cases.every(row=>row.complete));assert(report.controls.every(row=>row.proved));
  report.phase='closing';closingHolds();report.complete=true;
} catch(error) {report.complete=false;report.errors.push({name:error.name,message:error.message,stack:error.stack,phase:report.phase});process.exitCode=1;}
finally {
  try {closingHolds();}catch(error){report.complete=false;report.holdError={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
  persist();
  try {await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
  catch(error){report.complete=false;report.errors.push({name:error.name,message:error.message,phase:'cleanup'});process.exitCode=1;server?.close();}
  finally {finished=true;persist();}
}
console.log(`Phone currency native: ${report.cases.filter(row=>row.complete).length}/8 actual component journeys.`);
console.log(`Restored DOM controls: ${report.controls.filter(row=>row.proved).length}/9.`);
console.log(`Final source/build/cache holds: ${report.holdError?'failed':'held'}; overall ${report.complete?'passed':'failed'}.`);
console.log('Scope is finite Phone display navigation, with no campaign, purchase or live-service claim.');
