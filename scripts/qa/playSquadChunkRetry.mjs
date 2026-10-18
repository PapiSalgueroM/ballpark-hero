/* Remote original-source diagnostic. No product code or emitted asset is rewritten. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODE = process.argv[2], OUT = process.env.SQUAD_RETRY_OUT, BASE = process.env.SQUAD_RETRY_BASE;
assert.equal(MODE, 'baseline'); assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Inherited offline preload');
assert(OUT && path.isAbsolute(OUT) && BASE && /^http:\/\/127\.0\.0\.1:\d+$/.test(BASE));
const DIST = path.resolve(process.env.SQUAD_RETRY_DIST || path.join(ROOT, 'dist'));
const BOUT = path.join(OUT, 'browser'); assert(!fs.existsSync(BOUT)); fs.mkdirSync(BOUT);
const BASE_REF = '775564305e9da84dab59f2b9fe246d044a3cc8e9', SAVE = 'soccerCareerSave';
const FENCE = 'dukb-fence:' + SAVE, STALE = 'dukb-reloaded-stale-chunk';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => sha(fs.readFileSync(file));
const receipt = file => ({ file: path.relative(BOUT, file).replaceAll(path.sep, '/'), bytes: fs.statSync(file).size, sha256: hash(file) });
const save = (file, value) => { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return receipt(file); };
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 80 * 1024 * 1024 });
const inventory = root => {
  const map = {}; const walk = dir => { for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else { assert(item.isFile()); map[path.relative(root, file).replaceAll(path.sep, '/')] = { bytes: fs.statSync(file).size, sha256: hash(file) }; }
  } }; walk(root); return map;
};
const sources = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, { bytes: fs.statSync(path.join(ROOT, file)).size, sha256: hash(path.join(ROOT, file)) }]));
const specs = [390, 1280].flatMap(width => [{ id: 'offline-retry-' + width, width, offline: true }, { id: 'healthy-cold-' + width, width, offline: false }]);
const report = { version: 1, mode: MODE, status: 'running', qualified: false, productQualified: false, finding: false,
  head: git(['rev-parse', 'HEAD']).toString().trim(), sourceBase: BASE_REF, base: BASE, cases: [], errors: [], observedFaults: 0, successfulRecoveries: 0, healthyColdOpens: 0,
  scope: 'Four fresh actual built /soccer-career Chromium journeys, with a real engine-produced fictional-player save and one declared cold emitted-sheet abort while the context is actually offline.',
  limits: ['Diagnostic only. A working original retry is a nonfinding; no product qualification, live release, natural network, physical device or Safari claim.', 'The one emitted SquadSheet URL is discovered from its actual data-squad-xi body. No asset body, browser module, React state or production handler is replaced.', 'The first failure occurs under actual navigator.onLine=false before the Squad open. The route deliberately aborts only this exact cold sheet URL.', 'A user-triggered global freshBuild reload is retained and can recover through a real reopened tile. The career cannot be reseeded on reload.', 'Full career and ordinary stores are held. Only a measured actual reload may advance the existing saveFence generation once and write the existing stale-chunk flag.'],
};
const flush = () => fs.writeFileSync(path.join(BOUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
async function poll(read, check, label, count = 300) { for (let i = 0; i < count; i++) { const value = await read(); if (check(value)) return value; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('Method observation deadline: ' + label); }
let sourceBefore, distBefore, fontRows, fontManifest, fontCache, browser, oracle;

function observe({ origin, raw }) {
  if (location.origin !== origin) return;
  const seededThisDocument = !sessionStorage.getItem('__squad_retry_seeded');
  if (seededThisDocument) {
    localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerSquad:help', '1');
    localStorage.setItem('squad-retry-sentinel', 'local-held'); sessionStorage.setItem('squad-retry-sentinel', 'session-held');
    localStorage.setItem('soccerCareerSave', raw); sessionStorage.setItem('__squad_retry_seeded', '1');
  }
  const documentNonce = crypto.randomUUID(), rows = [], refs = new WeakMap(), writes = [], imports = [], draws = [], connections = [];
  const stored = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => storage.key(i)).sort().map(key => [key, storage.getItem(key)]));
  const boot = { documentNonce, seededThisDocument, careerBeforeApp: localStorage.getItem('soccerCareerSave'), seededStores: { local: stored(localStorage), session: stored(sessionStorage) }, at: performance.now(), online: navigator.onLine };
  const originalRandom = Math.random; Math.random = () => { const value = originalRandom(); draws.push({ at: performance.now(), value }); return value; };
  const originalSet = Storage.prototype.setItem, originalRemove = Storage.prototype.removeItem;
  Storage.prototype.setItem = function(key, value) { const before = this.getItem(key); const result = originalSet.call(this, key, value); writes.push({ store: this === localStorage ? 'local' : 'session', key, before, after: this.getItem(key), at: performance.now() }); return result; };
  Storage.prototype.removeItem = function(key) { const before = this.getItem(key); const result = originalRemove.call(this, key); writes.push({ store: this === localStorage ? 'local' : 'session', key, before, after: this.getItem(key), at: performance.now() }); return result; };
  window.addEventListener('vite:preloadError', event => imports.push({ at: performance.now(), online: navigator.onLine, documentNonce, name: event.payload?.name, message: String(event.payload?.message ?? event.payload) }), true);
  for (const type of ['online', 'offline']) window.addEventListener(type, () => connections.push({ type, at: performance.now(), online: navigator.onLine }));
  for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'focus', 'blur']) window.addEventListener(type, event => {
    const element = event.target instanceof Element ? event.target : null;
    const row = { type, at: performance.now(), trusted: event.isTrusted, key: event.key ?? null, target: element && { tag: element.tagName, text: element.textContent?.trim().slice(0, 180), squadTile: element.hasAttribute('data-squad-tile') || !!element.closest('[data-squad-tile]') } }; refs.set(row, event); rows.push(row);
  }, true);
  Object.defineProperty(window, '__SQUAD_RETRY_OBSERVER__', { value: { read: () => ({ boot, events: rows.map(row => ({ ...row, defaultPrevented: refs.get(row).defaultPrevented })), writes, imports, draws, connections }) } });
}
const snapshot = page => page.evaluate(() => {
  const stores = storage => Object.fromEntries(Array.from({ length: storage.length }, (_, i) => storage.key(i)).sort().map(key => [key, storage.getItem(key)]));
  const tile = document.querySelector('[data-squad-tile]'), sheet = document.querySelector('[data-squad-sheet]');
  const box = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
  return { at: performance.now(), date: Date.now(), url: location.href, online: navigator.onLine, scroll: [scrollX, scrollY], active: document.activeElement?.outerHTML,
    tile: tile && { html: tile.outerHTML, text: tile.textContent.trim(), busy: tile.getAttribute('aria-busy'), rect: box(tile) },
    sheet: sheet && { failed: sheet.getAttribute('data-squad-sheet') === 'failed', html: sheet.outerHTML, rect: box(sheet), dialogRect: box(sheet.querySelector('[role="dialog"]')), home: !!sheet.querySelector('[data-squad-screen="home"]'), eleven: !!sheet.querySelector('[data-squad-xi]'), cells: [...sheet.querySelectorAll('[data-squad-xi] [data-squad-man]')].map(cell => ({ title: cell.title, label: cell.getAttribute('aria-label'), source: cell.getAttribute('data-squad-cell-source') })) },
    stores: { local: stores(localStorage), session: stores(sessionStorage) }, observed: window.__SQUAD_RETRY_OBSERVER__.read(), html: document.body.innerHTML };
});
async function pointer(page, locator, row, label) {
  assert.equal(await locator.count(), 1, 'Unique native target ' + label); await locator.scrollIntoViewIfNeeded();
  const target = await locator.evaluate(element => { const r = element.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y); return { x, y, width: r.width, height: r.height, hit: !!hit && (hit === element || element.contains(hit)), text: element.textContent.trim() }; });
  assert(target.hit && target.width > 0 && target.height > 0, 'Real hit target ' + label); row.inputs.push({ label, ...target }); await page.mouse.click(target.x, target.y);
}
async function retain(page, row, label) { const state = await snapshot(page); state.career = oracle.save.parseSoccerCareerSave(state.stores.local[SAVE]); assert(oracle.save.isSoccerCareerSave(state.career)); row.observations.push({ label, state }); return state; }
function holdState(before, after, reloaded) {
  assert.equal(after.stores.local[SAVE], before.stores.local[SAVE], 'Whole serialized career held'); assert.deepEqual(after.career, before.career, 'Whole decoded career held');
  const a = structuredClone(before.stores), b = structuredClone(after.stores);
  if (reloaded) {
    assert.equal(Number(b.local[FENCE]), Number(a.local[FENCE]) + 1, 'One actual reload writes one existing saveFence generation');
    assert.equal(a.session[STALE], undefined); assert.equal(b.session[STALE], '1', 'Actual global once marker'); delete a.local[FENCE]; delete b.local[FENCE]; delete b.session[STALE];
  }
  assert.deepEqual(b, a, 'Every other store byte and membership held'); assert.equal(after.tile.html, before.tile.html, 'Actual parent tile held');
}
async function shot(page, row, dir, label) { const file = path.join(dir, label + '.png'); await page.screenshot({ path: file, fullPage: false }); const state = await retain(page, row, 'screenshot-' + label); assert(state.sheet && state.sheet.dialogRect.left >= 0 && state.sheet.dialogRect.right <= row.width && state.sheet.dialogRect.top >= 0 && state.sheet.dialogRect.bottom <= 844); row.screenshots.push({ label, ...receipt(file) }); }

try {
  for (const leaf of ['src/pages/SoccerCareer.tsx', 'src/components/soccer-career/SquadTile.tsx', 'src/components/soccer-career/SquadSheet.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerClubSquad.ts', 'src/lib/soccerClubSquadSheet.ts', 'src/lib/freshBuild.ts', 'src/lib/saveFence.ts']) assert.equal(hash(path.join(ROOT, leaf)), sha(git(['show', BASE_REF + ':' + leaf])), 'Whole original ' + leaf);
  sourceBefore = sources(); distBefore = inventory(DIST); save(path.join(BOUT, 'source-before.json'), sourceBefore); save(path.join(BOUT, 'dist-before.json'), distBefore);
  const holders = Object.keys(distBefore).filter(file => file.startsWith('assets/') && file.endsWith('.js') && fs.readFileSync(path.join(DIST, file), 'utf8').includes('data-squad-xi'));
  assert.equal(holders.length, 1, 'Unique emitted SquadSheet holder'); const sheetFile = holders[0], sheetURL = BASE + '/' + sheetFile;
  report.sheet = { file: sheetFile, url: sheetURL, ...distBefore[sheetFile] };
  fontCache = process.env.FREE_KICK_FONT_CACHE; assert(fontCache && path.isAbsolute(fontCache)); fontManifest = fs.readFileSync(path.join(fontCache, 'manifest.json')); fontRows = JSON.parse(fontManifest); assert.equal(fontRows.length, 9);
  const fonts = new Map(); fs.mkdirSync(path.join(BOUT, 'fonts'));
  for (const row of fontRows) { assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin)); assert(/^[a-f0-9]{64}$/.test(row.file)); const body = fs.readFileSync(path.join(fontCache, row.file)); assert.equal(sha(body), row.sha256); const file = path.join(BOUT, 'fonts', row.file); fs.writeFileSync(file, body, { flag: 'wx' }); fonts.set(row.url, { body, contentType: row.contentType, receipt: receipt(file) }); }
  fs.writeFileSync(path.join(BOUT, 'fonts', 'manifest.json'), fontManifest, { flag: 'wx' }); report.fonts = fontRows.map(row => ({ ...row, receipt: fonts.get(row.url).receipt }));
  const oracleDir = path.join(BOUT, 'oracle'); fs.mkdirSync(oracleDir);
  const entry = path.join(oracleDir, 'entry.mjs'), bundle = path.join(oracleDir, 'bundle.mjs');
  const sourceURL = ROOT.replaceAll(path.sep, '/') + '/';
  fs.writeFileSync(entry, `globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};\nexport const engine=await import(${JSON.stringify(sourceURL + 'src/lib/soccerCareerEngine.ts')});\nexport const squad=await import(${JSON.stringify(sourceURL + 'src/lib/soccerClubSquad.ts')});\nexport const save=await import(${JSON.stringify(sourceURL + 'src/lib/soccerCareerSave.ts')});\n`, { flag: 'wx' });
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error' });
  oracle = await import(pathToFileURL(bundle).href);
  const random = Math.random, now = Date.now, draws = [], steps = [], copy = value => JSON.parse(JSON.stringify(value)); let seed = 1421, career, view;
  try {
    Date.now = () => Date.UTC(2026, 9, 18, 12); Math.random = () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; const value = ((t ^ t >>> 14) >>> 0) / 4294967296; draws.push(value); return value; };
    const abilities = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
    career = oracle.engine.initCareer('Squad Retry Fixture', 'England', 'ST', '2025', abilities, 62, 2025, oracle.engine.FALLBACK_CLUBS, null); steps.push({ call: 'initCareer', career: copy(career), draws: draws.length });
    for (let i = 0; i < 5 && career.phase !== 'playing'; i++) {
      if (career.phase === 'youth') { career = oracle.engine.advanceYouthYear(career, oracle.engine.FALLBACK_CLUBS); steps.push({ call: 'advanceYouthYear', career: copy(career), draws: draws.length }); }
      else if (career.phase === 'contract_offer') { assert(career.pendingOffers.length > 0); const offer = career.pendingOffers[0]; career = oracle.engine.acceptOffer(career, offer); steps.push({ call: 'acceptOffer', offer: copy(offer), career: copy(career), draws: draws.length }); }
      else throw new Error('Unexpected actual fixture phase ' + career.phase);
    }
    career = oracle.engine.repairCareer(career); view = oracle.squad.squadView(career); assert.equal(career.phase, 'playing'); assert(!career.retired && view); assert.equal(view.source, 'invented', 'Generated career squad source');
  } finally { Math.random = random; Date.now = now; }
  const rawSave = oracle.save.serializeSoccerCareerSave(career); assert(oracle.save.isSoccerCareerSave(oracle.save.parseSoccerCareerSave(rawSave))); assert.deepEqual(oracle.save.parseSoccerCareerSave(rawSave), JSON.parse(JSON.stringify(career)));
  const expectedXI = ['ATT', 'MID', 'DEF', 'GK'].flatMap(group => view.eleven[group].map(man => ({ title: man.name, label: `${man.name}, ${man.pos}, rating ${man.ovr}`, source: man.me ? 'you' : man.role ? 'role' : man.id !== undefined ? 'generated' : 'real' }))); assert.equal(expectedXI.length, 11);
  report.fixture = save(path.join(BOUT, 'fixture.json'), { scope: 'Actual engine first professional offer, fictional named player; existing engine club data held, no imported real data.', career: JSON.parse(JSON.stringify(career)), rawSave, view, expectedXI, steps, draws, nodeOnlyEntry: receipt(entry), nodeOnlyBundle: receipt(bundle) });
  browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] }); report.chromium = browser.version(); flush();
  for (const spec of specs) {
    const dir = path.join(BOUT, spec.id); fs.mkdirSync(dir);
    const row = { ...spec, status: 'running', qualified: false, setupComplete: false, finding: false, recovered: false, healthyColdOpen: false, inputs: [], observations: [], screenshots: [], requests: [], routes: [], responses: [], failures: [], pageErrors: [], console: [], documents: [], errors: [] };
    const context = await browser.newContext({ viewport: { width: spec.width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const refs = new WeakMap(), pending = []; let page, armed = false, aborts = 0, opener, lastOwnedJS = Date.now();
    const requestRef = request => { if (!refs.has(request)) { refs.set(request, row.requests.length); row.requests.push({ index: row.requests.length, url: request.url(), method: request.method(), resourceType: request.resourceType(), navigation: request.isNavigationRequest(), body: request.postData() }); if (request.url().startsWith(BASE + '/') && request.resourceType() === 'script') lastOwnedJS = Date.now(); } return refs.get(request); };
    try {
      await context.addInitScript(observe, { origin: BASE, raw: rawSave });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), action = { requestIndex: requestRef(request), url: request.url(), method: request.method(), action: null }; row.routes.push(action);
        try {
          if (url.origin === BASE) {
            if (url.href === sheetURL && armed) { armed = false; aborts++; action.action = 'declared-offline-sheet-abort'; action.online = await page.evaluate(() => navigator.onLine); assert.equal(action.online, false); assert.equal(aborts, 1); return await route.abort('internetdisconnected'); }
            action.action = 'actual-dist'; return await route.continue();
          }
          if (fonts.has(url.href)) { const font = fonts.get(url.href); action.action = 'cached-font'; return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } }); }
          action.action = 'declared-external-denial'; return await route.abort('blockedbyclient');
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch {} }
      });
      await context.routeWebSocket('**/*', socket => socket.close()); page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('request', requestRef); page.on('requestfailed', request => row.failures.push({ requestIndex: requestRef(request), url: request.url(), error: request.failure()?.errorText }));
      page.on('pageerror', error => row.pageErrors.push({ message: error.message, stack: error.stack })); page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.documents.push({ url: frame.url(), observedAt: Date.now() }); });
      page.on('response', response => { const item = { requestIndex: requestRef(response.request()), url: response.url(), status: response.status() }, index = row.responses.length; row.responses.push(item);
        pending.push((async () => { const body = await response.body(), gzip = zlib.gzipSync(body, { level: 9 }), url = new URL(response.url());
          if (url.origin === BASE) { let rel = decodeURIComponent(url.pathname).replace(/^\/+/, ''); if (!distBefore[rel]) rel = distBefore[rel + '/index.html'] ? rel + '/index.html' : 'index.html'; assert(distBefore[rel] && sha(body) === distBefore[rel].sha256, 'Actual emitted response body'); assert.equal(response.status(), 200); item.distFile = rel; }
          else { assert(fonts.has(url.href)); assert.equal(sha(body), sha(fonts.get(url.href).body)); }
          const bodyFile = path.join(dir, `response-${index}.body`), gzipFile = path.join(dir, `response-${index}.gz`); fs.writeFileSync(bodyFile, body, { flag: 'wx' }); fs.writeFileSync(gzipFile, gzip, { flag: 'wx' }); Object.assign(item, { rawBytes: body.length, gzipBytes: gzip.length, bodySha256: sha(body), body: receipt(bodyFile), gzip: receipt(gzipFile) });
        })().catch(error => row.errors.push('Response retention: ' + String(error?.stack ?? error))));
      });
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' }); await page.locator('[data-squad-tile]').waitFor({ state: 'visible' });
      await page.evaluate(() => document.fonts.ready.then(() => null));
      await poll(() => ({ quiet: Date.now() - lastOwnedJS, complete: row.requests.filter(request => request.url.startsWith(BASE + '/') && request.resourceType === 'script').every(request => row.responses.some(response => response.requestIndex === request.index && response.body)) }), value => value.quiet >= 250 && value.complete, 'actual boot JS settled before cold open'); await Promise.all(pending);
      const before = await retain(page, row, 'ready'); assert.equal(before.career.phase, 'playing'); assert.equal(before.observed.boot.seededThisDocument, true); assert.equal(before.observed.boot.careerBeforeApp, rawSave); assert.equal(before.stores.session[STALE], undefined); assert(!before.sheet); assert.equal(row.requests.filter(request => request.url === sheetURL).length, 0, 'Genuinely cold emitted sheet');
      row.mountStores = { beforeApp: before.observed.boot.seededStores, afterApp: before.stores };
      opener = await page.locator('[data-squad-tile]').elementHandle(); row.setupComplete = true;
      if (spec.offline) {
        await context.setOffline(true); assert.equal(await page.evaluate(() => navigator.onLine), false); armed = true;
        await pointer(page, page.locator('[data-squad-tile]'), row, 'offline-cold-open'); await page.locator('[data-squad-sheet="failed"]').waitFor({ state: 'visible' });
        await poll(() => snapshot(page), state => state.sheet?.failed && state.tile?.busy !== 'true', 'actual failed boundary and settled parent busy state');
        const failed = await retain(page, row, 'offline-failed'); assert.equal(aborts, 1); assert.equal(failed.online, false); assert.equal(failed.observed.boot.documentNonce, before.observed.boot.documentNonce); assert.equal(row.documents.length, 1); assert.equal(failed.stores.session[STALE], undefined); assert(await opener.evaluate(element => element.isConnected)); holdState(before, failed, false);
        assert(failed.observed.imports.some(error => error.online === false && error.message.includes(path.basename(sheetFile))), 'Actual offline emitted import error'); await shot(page, row, dir, 'offline-failed');
        const oldFailed = await page.locator('[data-squad-sheet="failed"]').elementHandle(), importCount = failed.observed.imports.length;
        await context.setOffline(false); assert.equal(await page.evaluate(() => navigator.onLine), true); await pointer(page, page.getByRole('button', { name: /^↻ Retry$/ }), row, 'user-retry-after-reconnect');
        const terminal = await poll(async () => {
          try {
            const state = await snapshot(page);
            if (state.observed.boot.documentNonce !== before.observed.boot.documentNonce) return { kind: 'reload', state };
            if (state.sheet?.home) return { kind: 'healthy', state };
            if (state.sheet?.failed && !(await oldFailed.evaluate(element => element.isConnected))) return { kind: 'new-failed', state };
            return { kind: 'pending', state };
          } catch { return { kind: 'navigation-pending' }; }
        }, result => ['reload', 'healthy', 'new-failed'].includes(result.kind), 'actual retry terminal outcome, never pending-only');
        row.retryTerminal = terminal.kind;
        if (terminal.kind === 'reload') {
          await page.locator('[data-squad-tile]').waitFor({ state: 'visible' }); const reloaded = await retain(page, row, 'user-triggered-global-reload');
          assert.equal(reloaded.observed.boot.seededThisDocument, false); assert.equal(reloaded.observed.boot.careerBeforeApp, before.stores.local[SAVE]); assert.equal(row.documents.length, 2); holdState(before, reloaded, true);
          assert.equal(row.requests.filter(request => request.url === sheetURL).length, 1, 'Reload has not eagerly imported the sheet'); opener = await page.locator('[data-squad-tile]').elementHandle(); await pointer(page, page.locator('[data-squad-tile]'), row, 'real-reopen-after-user-reload'); await page.locator('[data-squad-screen="home"]').waitFor({ state: 'visible' });
        } else if (terminal.kind === 'new-failed') {
          const again = await retain(page, row, 'new-terminal-failure'); assert.equal(again.observed.boot.documentNonce, before.observed.boot.documentNonce); assert.equal(again.observed.imports.length, importCount + 1); assert(again.observed.imports.at(-1).online && again.observed.imports.at(-1).message.includes(path.basename(sheetFile))); assert(await opener.evaluate(element => element.isConnected)); holdState(before, again, false); row.finding = true; await shot(page, row, dir, 'retry-terminal-failed');
        }
        if (!row.finding) row.recovered = true;
      } else { await pointer(page, page.locator('[data-squad-tile]'), row, 'healthy-cold-open'); await page.locator('[data-squad-screen="home"]').waitFor({ state: 'visible' }); row.healthyColdOpen = true; }
      if (!row.finding) {
        await poll(() => snapshot(page), state => state.sheet?.home && state.tile?.busy !== 'true', 'actual healthy sheet and settled parent busy state');
        const home = await retain(page, row, 'actual-healthy-sheet'); assert(home.sheet.home && !home.sheet.failed); holdState(before, home, row.retryTerminal === 'reload');
        await pointer(page, page.locator('[data-squad-open="eleven"]'), row, 'actual-starting-eleven'); await page.locator('[data-squad-xi]').waitFor({ state: 'visible' }); const eleven = await retain(page, row, 'actual-eleven'); assert.deepEqual(eleven.sheet.cells, expectedXI); holdState(before, eleven, row.retryTerminal === 'reload'); await shot(page, row, dir, 'healthy-eleven');
        await pointer(page, page.locator('[data-squad-foot] button'), row, 'actual-back-to-sheet-home'); await page.locator('[data-squad-screen="home"]').waitFor({ state: 'visible' });
      }
      await pointer(page, page.getByRole('button', { name: /^← Back to your career$/ }), row, 'actual-close-to-career'); await page.locator('[data-squad-sheet]').waitFor({ state: 'hidden' });
      const closed = await retain(page, row, 'closed'); holdState(before, closed, row.retryTerminal === 'reload'); assert(await opener.evaluate(element => element.isConnected && document.activeElement === element), 'Same actual parent opener regains focus');
      await Promise.all(pending); assert.deepEqual(row.errors, []); assert.equal(aborts, spec.offline ? 1 : 0);
      for (const failure of row.failures) { const route = row.routes.find(action => action.requestIndex === failure.requestIndex); assert(route && (route.action === 'declared-external-denial' || route.action === 'declared-offline-sheet-abort'), 'Only declared actual request failure'); }
      for (const error of row.pageErrors) assert(spec.offline && error.message.includes(path.basename(sheetFile)) && /dynamically imported module|module script|dynamic import/i.test(error.message), 'Only observed declared emitted import page error');
      const sheetResponses = row.responses.filter(response => response.url === sheetURL); assert.equal(sheetResponses.length, row.finding ? 0 : 1); if (!row.finding) assert.equal(sheetResponses[0].bodySha256, distBefore[sheetFile].sha256);
      row.status = 'passed'; row.qualified = true;
    } catch (error) { row.status = 'failed'; row.errors.push(String(error?.stack ?? error)); if (page && !page.isClosed()) try { await retain(page, row, 'method-failure'); } catch (captureError) { row.errors.push('Failure capture: ' + captureError); } }
    finally {
      if (context) try { await context.close(); } catch (error) { row.errors.push('Context close: ' + error); }
      await Promise.allSettled(pending); if (row.errors.length) { row.status = 'failed'; row.qualified = false; }
      const rawFile = path.join(dir, 'raw.json'); fs.writeFileSync(rawFile, JSON.stringify(row, null, 2) + '\n', { flag: 'wx' }); report.cases.push({ ...spec, status: row.status, qualified: row.qualified, setupComplete: row.setupComplete, finding: row.finding, recovered: row.recovered, healthyColdOpen: row.healthyColdOpen, raw: receipt(rawFile) }); flush();
    }
  }
  assert.equal(report.cases.length, 4); assert(report.cases.every(row => row.status === 'passed' && row.qualified)); report.observedFaults = report.cases.filter(row => row.finding).length; report.successfulRecoveries = report.cases.filter(row => row.recovered).length; report.healthyColdOpens = report.cases.filter(row => row.healthyColdOpen).length;
  assert(Number.isInteger(report.observedFaults) && report.observedFaults >= 0 && report.observedFaults <= 2); assert.equal(report.successfulRecoveries, 2 - report.observedFaults); assert.equal(report.healthyColdOpens, 2); report.finding = report.observedFaults > 0; report.status = 'diagnosed-original'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.errors.push(String(error?.stack ?? error)); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.errors.push('Browser close: ' + error); }
  if (sourceBefore) { const sourceAfter = sources(); save(path.join(BOUT, 'source-after.json'), sourceAfter); report.sourceHeld = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter); }
  if (distBefore) { const distAfter = inventory(DIST); save(path.join(BOUT, 'dist-after.json'), distAfter); report.distHeld = JSON.stringify(distBefore) === JSON.stringify(distAfter); }
  if (fontRows) report.fontsHeld = fontManifest.equals(fs.readFileSync(path.join(fontCache, 'manifest.json'))) && fontRows.every(row => hash(path.join(fontCache, row.file)) === row.sha256);
  if (report.errors.length || !report.sourceHeld || !report.distHeld || !report.fontsHeld) { report.status = 'failed'; report.qualified = false; } flush();
}
console.log('Squad chunk retry diagnostic: ' + report.status + ', ' + report.observedFaults + ' observed faults, ' + report.successfulRecoveries + ' successful recoveries and ' + report.healthyColdOpens + ' healthy cold opens. No product qualification.');
if (!report.qualified) process.exitCode = 1;
