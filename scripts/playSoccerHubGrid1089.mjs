/* Remote-only actual-route proof for the Soccer Career panel nesting repair. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Run this browser and engine verification in remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'soccer-hub-grid-artifacts');
const NATIVE = path.join(OUT, 'native'), CACHE = path.join(OUT, 'asset-cache');
const BASE_REF = '6f57ce7818f152b4efdc75027d267c49927a2d8b';
const PAGE = 'src/pages/SoccerCareer.tsx', SAVE = 'soccerCareerSave';
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const sha = value => createHash('sha256').update(value).digest('hex');
function fileSha(file) { const bytes = fs.readFileSync(file); return sha(bytes); }
const clone = value => JSON.parse(JSON.stringify(value));
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
for (const dir of [OUT, NATIVE, CACHE]) fs.mkdirSync(dir, { recursive: true });
function hashes(relative) {
  const result = {};
  function visit(dir) { for (const row of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const file = `${dir}/${row.name}`;
    if (row.isDirectory()) visit(file); else if (row.isFile()) result[file] = fileSha(path.join(ROOT, file));
  } }
  for (const item of relative) {
    if (fs.statSync(path.join(ROOT, item)).isDirectory()) visit(item);
    else result[item] = fileSha(path.join(ROOT, item));
  }
  return result;
}
const held = ['src', 'scripts/fixtures', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'scripts/playSoccerHubGrid1089.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/playwrightLoader.mjs', '.github/workflows/soccer-hub-grid.yml'];
const sourceBefore = hashes(held);
const { build: bundle } = await import('esbuild');

if (process.argv.includes('--prepare-assets-only')) {
  const built = await bundle({ absWorkingDir: ROOT, stdin: { contents: `export { initCareer, advanceYouthYear, acceptOffer, advanceProSeason, dismissNewspaper, repairCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave'; export { FLAG_CODES } from './src/components/FlagImg'; export { flagEmojiToIso } from './src/lib/flagUtils';`, resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'silent' });
  const engineFile = path.join(OUT, 'independent-engine.mjs');
  fs.writeFileSync(engineFile, built.outputFiles[0].contents);
  json('independent-engine-metafile.json', built.metafile);
  const originalRandom = Math.random, OriginalDate = Date, originalFetch = globalThis.fetch;
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let seed = 1089, draws = 0;
  const writes = [], attempts = [];
  Math.random = () => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: (...args) => writes.push(args), removeItem: (...args) => writes.push(args) } });
  let fixtures, flagCodes;
  try {
    globalThis.fetch = async url => { throw new Error(`Fixture engine attempted transport: ${url}`); };
    const E = await import(pathToFileURL(engineFile).href);
    for (let attempt = 0; attempt < 24; attempt++) {
      seed = 108900 + attempt; draws = 0;
      const before = { seed, draws };
      const initial = E.initCareer('Grid Review', 'England', 'ST', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, E.FALLBACK_CLUBS, undefined, 90);
      const youth = E.advanceYouthYear(clone(initial), E.FALLBACK_CLUBS);
      assert.equal(youth.phase, 'contract_offer'); assert(youth.pendingOffers.length > 0);
      const offer = youth.pendingOffers.find(row => row.club.country === 'England') || youth.pendingOffers[0];
      const playing = E.repairCareer(E.acceptOffer(clone(youth), clone(offer)));
      const newspaper = E.repairCareer(E.advanceProSeason(clone(playing), E.FALLBACK_CLUBS));
      attempts.push({ attempt, before, after: { seed, draws }, initial, youth, offer, playing, newspaper });
      if (newspaper.phase !== 'newspaper' || !newspaper.pendingSummary || !newspaper.pendingNews.length) continue;
      const beforeDismiss = { seed, draws }, input = clone(newspaper);
      const summary = E.dismissNewspaper(input);
      assert.deepEqual(input, newspaper, 'Summary oracle does not mutate the saved input');
      assert.deepEqual({ seed, draws }, beforeDismiss, 'Actual Continue consumes no engine RNG');
      assert.equal(summary.phase, 'season_summary');
      fixtures = { playing, newspaper, summary, selectedAttempt: attempt, engineSha256: sha(built.outputFiles[0].contents), dismissalRngBefore: beforeDismiss, dismissalRngAfter: { seed, draws } };
      for (const state of [playing, newspaper, summary]) {
        assert(E.isSoccerCareerSave(state));
        assert.deepEqual(E.repairCareer(clone(state)), state, 'Actual load repair leaves generated fixture unchanged');
      }
      const strings = [];
      const visit = value => { if (typeof value === 'string') strings.push(value); else if (value && typeof value === 'object') Object.values(value).forEach(visit); };
      visit(fixtures);
      flagCodes = new Set(strings.filter(value => E.FLAG_CODES[value]).map(value => E.FLAG_CODES[value]));
      for (const text of strings) for (const match of text.matchAll(/[\u{1F1E6}-\u{1F1FF}]{2}/gu)) {
        const code = E.flagEmojiToIso(match[0]); if (code) flagCodes.add(code);
      }
      break;
    }
    assert(fixtures, 'Bounded actual engine generation reaches a newspaper and summary');
    assert.deepEqual(writes, [], 'Generating verification fixtures writes no saves');
    json('fixtures.json', fixtures); json('fixture-origins.json', { attempts, writes, staging: 'Only player creation parameters and deterministic random seed are supplied. All offers, seasons, headlines and summary use unchanged engine functions.' });
  } finally {
    Math.random = originalRandom; globalThis.Date = OriginalDate; globalThis.fetch = originalFetch;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage;
  }
  const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
  assert.equal(sheets.length, 1, 'Read the actual template font stylesheet');
  const manifest = [];
  async function cache(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } }); assert.equal(response.status, 200, url);
    const body = Buffer.from(await response.arrayBuffer()), hash = sha(body);
    fs.writeFileSync(path.join(CACHE, hash), body);
    manifest.push({ url, file: hash, sha256: hash, bytes: body.length, contentType: response.headers.get('content-type') });
    return body.toString('utf8');
  }
  for (const url of sheets) {
    const css = await cache(url);
    const payloads = new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)/g)].map(match => match[1]));
    assert(payloads.size > 0); for (const payload of payloads) await cache(payload);
  }
  // These are only countries actually present in the generated save and its text.
  for (const code of [...flagCodes].sort()) if (code !== 'gb-eng') for (const width of [20, 40, 80]) await cache(`https://flagcdn.com/w${width}/${code}.png`);
  json('asset-cache/manifest.json', manifest);
  assert.deepEqual(hashes(held), sourceBefore);
  json('preparation.json', { sourceBefore, sourceAfter: hashes(held), engineSha256: fixtures.engineSha256, assetManifestSha256: fileSha(path.join(CACHE, 'manifest.json')), countries: [...flagCodes].sort() });
  console.log(`Prepared real playing, newspaper and summary states from attempt ${fixtures.selectedAttempt}.`);
  console.log(`Retained actual engine bundle, every attempt and ${manifest.length} declared asset payloads.`);
  process.exit(0);
}

const fixtures = JSON.parse(fs.readFileSync(path.join(OUT, 'fixtures.json')));
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(OUT, 'preparation.json'))).sourceAfter, sourceBefore, 'Fixture generation and native run use identical actual source');
assert.equal(fileSha(path.join(OUT, 'independent-engine.mjs')), fixtures.engineSha256);
const assets = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'))).map(row => {
  assert(/^[a-f0-9]{64}$/.test(row.file)); const body = fs.readFileSync(path.join(CACHE, row.file));
  assert.equal(sha(body), row.sha256); assert.equal(body.length, row.bytes); return [row.url, { ...row, body }];
}));
const serviceOrigin = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
const report = { complete: false, sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), sourceTree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(), sourceBefore, buildBefore: hashes(['dist']), cacheBefore: hashes(['soccer-hub-grid-artifacts/asset-cache']), cases: [], comparisons: [], limits: ['Chromium emulation at 390 and 1280, reduced motion, two generated season states and one Continue transition; not a full career or physical-device audit.', 'Only panel ownership, responsive placement and the continued summary reveal are measured. Existing small text and floating controls are outside scope.', 'Old nesting is a separately built copied page; normal source, engine, saved schema and historical fixtures remain unchanged.'] };
const persist = () => json('native/report.json', report);
persist();
let browser, server;
const contexts = new Set();
try {
  const current = fs.readFileSync(path.join(ROOT, PAGE), 'utf8').replace(/\r\n/g, '\n');
  const old = execFileSync('git', ['show', `${BASE_REF}:${PAGE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 2e6 }).replace(/\r\n/g, '\n');
  const top = '            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Timeline</span>\n          </div>\n';
  const bottom = '            <RivalrySummaryCard summary={career.rivalrySummary} career={career} />\n          )}\n';
  for (const anchor of [top, bottom]) assert.equal(current.split(anchor).length - 1, 1, 'Control anchor is uniquely executable');
  const restored = current.replace(top, `${top}          </div>\n`).replace(`${bottom}          </div>\n`, bottom);
  assert.notEqual(restored, current); assert.equal(restored, old, 'Two-line inverse exactly restores pinned old page');
  fs.copyFileSync(path.join(ROOT, PAGE), path.join(NATIVE, 'SoccerCareer.current.tsx'));
  fs.copyFileSync(path.join(ROOT, 'src/hooks/useRevealScroll.ts'), path.join(NATIVE, 'useRevealScroll.original.ts'));
  const copy = path.join(NATIVE, 'SoccerCareer.old.tsx'); fs.writeFileSync(copy, restored);
  report.control = { originalSha256: fileSha(path.join(ROOT, PAGE)), normalizedOriginalSha256: sha(current), copySha256: sha(restored), pinnedBase: BASE_REF, normalizedPinnedOldSha256: sha(old), forwardChanges: 2, reverseExact: true, transforms: [] };
  const controlDist = path.join(OUT, 'old-nesting-build');
  const { build: viteBuild } = await import('vite');
  await viteBuild({ configFile: path.join(ROOT, 'vite.config.ts'), build: { outDir: controlDist, emptyOutDir: true }, plugins: [{
    name: '1089-actual-old-page-copy', enforce: 'pre',
    resolveId(source, importer) { if (source === './pages/SoccerCareer' && importer?.replaceAll('\\', '/').endsWith('/src/App.tsx')) return copy; },
    transform(code, id) { if ([copy, path.join(ROOT, PAGE)].includes(id)) report.control.transforms.push({ id: path.relative(ROOT, id), sha256: sha(code), copied: id === copy }); },
  }] });
  assert.equal(report.control.transforms.length, 1); assert.equal(report.control.transforms[0].copied, true);
  assert.equal(report.control.transforms[0].sha256, sha(restored));
  report.control.buildHashes = hashes(['soccer-hub-grid-artifacts/old-nesting-build']);
  assert.deepEqual(hashes(['dist']), report.buildBefore, 'Side build does not overwrite healthy build'); persist();
  const { chromium } = await import('./lib/playwrightLoader.mjs');
  browser = await chromium.launch({ headless: true });
  const profiles = [{ name: '390-touch', width: 390, height: 844, touch: true }, { name: '1280-keyboard', width: 1280, height: 900, touch: false }];
  const baselineStorage = { 'cookie-consent': 'essential', 'dukb-theme': 'dark', 'dukb-soccer-currency': 'EUR', 'rules-gate-seen:/soccer-career': '1', 'nbaCareerSave': '1089 opaque NBA bytes', 'nflCareerSave': '1089 opaque NFL bytes', 'stadiumTycoonV1': '1089 opaque Tycoon bytes' };
  for (const arm of ['healthy', 'old-nesting']) {
    const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.on('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
    const base = `http://127.0.0.1:${port}`, dir = arm === 'healthy' ? 'dist' : path.relative(ROOT, controlDist);
    server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', dir, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(path.join(NATIVE, `${arm}-server.log`));
    server.stdout.pipe(log); server.stderr.pipe(log);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Owned server startup timeout')), 15000); server.once('error', reject); server.once('exit', code => reject(new Error(`Owned server exited ${code}`))); server.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
    for (const profile of profiles) for (const scene of ['playing', 'newspaper']) {
      const row = { arm, profile, scene, observations: [], requests: [], sockets: [], errors: [], checks: [], transitions: [] }; report.cases.push(row); persist();
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: Object.entries({ ...baselineStorage, [SAVE]: JSON.stringify(fixtures[scene]) }).map(([name, value]) => ({ name, value })) }] } });
      contexts.add(context);
      const pending = new Set();
      await context.routeWebSocket('**/*', route => {
        const record = { url: route.url(), blocked: true, closed: false }; row.sockets.push(record);
        const task = route.close({ code: 1008, reason: 'Offline verification blocks sockets' })
          .then(() => { record.closed = true; })
          .catch(error => { row.errors.push({ message: error.message, stack: error.stack }); })
          .finally(() => pending.delete(task));
        pending.add(task); return task;
      });
      await context.route('**/*', route => {
        const task = (async () => {
          const request = route.request(), url = new URL(request.url()), record = { url: url.href, method: request.method() }; row.requests.push(record);
          if (url.origin === base && ['GET', 'HEAD'].includes(request.method())) {
            const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 }); const body = await response.body();
            record.status = response.status(); record.sha256 = sha(body); record.bytes = body.length;
            assert(response.ok(), `Actual local asset ${url.pathname}`); await route.fulfill({ response, body }); return;
          }
          if (request.method() === 'GET' && assets.has(url.href)) {
            const asset = assets.get(url.href); Object.assign(record, { cached: true, sha256: asset.sha256, bytes: asset.bytes });
            await route.fulfill({ status: 200, contentType: asset.contentType, body: asset.body }); return;
          }
          if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') {
            record.localRead = 'empty live score feed'; await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); return;
          }
          record.blocked = true; throw new Error(`Undeclared route: ${request.method()} ${url.href}`);
        })().catch(async error => { row.errors.push({ message: error.message, stack: error.stack }); try { await route.abort(); } catch {} }).finally(() => pending.delete(task));
        pending.add(task); return task;
      });
      await context.addInitScript(() => {
        const state = window.__hubGrid1089 = { seed: 10891007, draws: 0, writes: [], inputs: [], scrolls: [] };
        Math.random = () => { state.draws++; state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; };
        for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { const result = original.apply(this, args); state.writes.push({ scope: this === localStorage ? 'local' : this === sessionStorage ? 'session' : 'unknown', method, args: [...args] }); return result; }; }
        for (const type of ['click', 'keydown']) addEventListener(type, event => state.inputs.push({ type, key: event.key ?? null, trusted: event.isTrusted, text: event.target?.textContent ?? '', now: Date.now() }), true);
        const original = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function(...args) { state.scrolls.push({ text: this.textContent?.slice(0, 100), args, now: Date.now() }); return original.apply(this, args); };
      });
      const page = await context.newPage();
      page.on('pageerror', error => row.errors.push({ message: error.message, stack: error.stack }));
      await page.clock.pauseAt(NOW);
      await page.goto(`${base}/soccer-career`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Grid Review', exact: true }).waitFor();
      row.fonts = await page.evaluate(async () => {
        await document.fonts.ready;
        return Promise.all(['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(async weight => ({ family, weight, faces: (await document.fonts.load(`${weight} 16px "${family}"`)).map(face => ({ family: face.family, weight: face.weight, status: face.status })) }))));
      });
      assert.equal(row.fonts.length, 8);
      assert(row.fonts.every(font => font.faces.length > 0 && font.faces.every(face => face.family.replace(/^["']|["']$/g, '') === font.family && face.weight === String(font.weight) && face.status === 'loaded')), 'All eight actual requested font faces load with the declared family and weight');
      await page.clock.runFor(256);
      const snapshot = () => page.evaluate(() => ({ storage: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()), rng: { seed: window.__hubGrid1089.seed, draws: window.__hubGrid1089.draws }, writes: structuredClone(window.__hubGrid1089.writes), inputs: structuredClone(window.__hubGrid1089.inputs), scrolls: structuredClone(window.__hubGrid1089.scrolls), now: Date.now(), scrollY }));
      const check = (name, value, evidence, structure = false) => {
        const result = { name, passed: !!value, evidence, structure }; row.checks.push(result);
        try { assert(value, `${arm}/${profile.name}/${scene}: ${name}`); }
        catch (error) { result.failure = { name: error.name, message: error.message, actual: error.actual, expected: error.expected, stack: error.stack }; if (!structure || arm === 'healthy') throw error; }
        finally { persist(); }
      };
      async function observe(label) {
        const data = await page.evaluate(() => {
          const heading = [...document.querySelectorAll('span')].find(el => el.textContent === 'Career Timeline');
          const timeline = document.querySelector('div.max-h-\\[280px\\]');
          const grid = document.querySelector('div.md\\:grid-cols-\\[260px_1fr\\]');
          const right = document.querySelector('div.order-1.md\\:order-2');
          const card = heading?.parentElement?.parentElement;
          const events = [...document.querySelectorAll('span')].find(el => el.textContent === 'Latest Events')?.parentElement?.parentElement;
          const bar = document.querySelector('[data-career-action-bar]');
          const box = el => el ? (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; })() : null;
          return { children: grid?.children.length, childClasses: grid ? [...grid.children].map(el => el.className) : [], timelineInCard: !!card?.contains(timeline), rightDirect: right?.parentElement === grid, correctChildren: grid?.children[0] === card && grid?.children[1] === right, eventsOutside: !!events && events.parentElement === grid?.parentElement && !grid.contains(events), actionOutside: !!bar && !grid?.contains(bar), rows: timeline?.children.length, grid: box(grid), card: box(card), right: box(right), timeline: box(timeline), events: box(events), action: box(bar), scrollWidth: document.documentElement.scrollWidth, innerWidth, columns: grid ? getComputedStyle(grid).gridTemplateColumns : null, text: document.querySelector('main')?.textContent ?? document.body.textContent };
        });
        const state = await snapshot(); row.observations.push({ label, data, state }); persist();
        check(`${label}: timeline header and rows share a card`, data.timelineInCard, data, true);
        check(`${label}: exactly two intended direct grid panels`, data.children === 2 && data.correctChildren && data.rightDirect, data, true);
        check(`${label}: Events and action bar remain outside grid`, data.eventsOutside && data.actionOutside, data, true);
        check(`${label}: all saved timeline rows remain`, data.rows === fixtures[scene].seasons.length, { actual: data.rows, expected: fixtures[scene].seasons.length });
        if (profile.width < 768) check(`${label}: mobile main panel precedes timeline`, data.right.bottom <= data.card.y + 1, data, true);
        else check(`${label}: desktop 260px rail shares the top row`, Math.abs(data.card.width - 260) <= 1 && Math.abs(data.card.y - data.right.y) <= 1 && data.right.x >= data.card.right, data, true);
        check(`${label}: layout fits physical viewport`, data.scrollWidth <= profile.width + 1, data);
        await page.screenshot({ path: path.join(NATIVE, `${arm}-${profile.name}-${label}.png`), fullPage: true });
        return state;
      }
      const loaded = await observe(scene);
      assert.deepEqual(JSON.parse(loaded.storage[SAVE]), fixtures[scene], 'Actual loader holds the complete generated career');
      for (const [key, value] of Object.entries(baselineStorage)) assert.equal(loaded.storage[key], value);
      if (scene === 'newspaper') {
        const button = page.getByRole('button', { name: 'Continue to Season Summary', exact: false });
        await button.scrollIntoViewIfNeeded();
        if (!profile.touch) await button.focus();
        const before = await snapshot();
        if (profile.touch) await button.tap(); else await page.keyboard.press('Enter');
        await page.getByRole('heading', { name: 'Season Summary', exact: true }).waitFor();
        await page.clock.runFor(256);
        const after = await observe('summary');
        row.transitions.push({ before, after, expected: fixtures.summary, driverScrollAfterActivation: false }); persist();
        assert.deepEqual(JSON.parse(after.storage[SAVE]), fixtures.summary, 'Actual Continue matches complete unchanged engine result');
        assert.equal(after.storage[SAVE], JSON.stringify(fixtures.summary), 'Actual serializer bytes equal engine result');
        assert.deepEqual(after.rng, before.rng, 'Continue uses no extra random draws');
        assert.deepEqual(after.session, before.session);
        assert.deepEqual(Object.fromEntries(Object.entries(after.storage).filter(([key]) => key !== SAVE)), Object.fromEntries(Object.entries(before.storage).filter(([key]) => key !== SAVE)));
        assert.deepEqual(after.writes.slice(before.writes.length), [{ scope: 'local', method: 'setItem', args: [SAVE, JSON.stringify(fixtures.summary)] }]);
        assert.equal(after.now - before.now, 256);
        const clicks = after.inputs.slice(before.inputs.length).filter(event => event.type === 'click');
        assert.equal(clicks.length, 1); assert.equal(clicks[0].trusted, true); assert.match(clicks[0].text, /Continue to Season Summary/);
        const reveal = await page.getByRole('heading', { name: 'Season Summary', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight }; });
        row.summaryReveal = reveal;
        // The old copied layout may also reveal correctly; the ownership checks must reject it.
        check('continued summary heading is readable without driver scroll', reveal.top >= 0 && reveal.bottom <= profile.height, reveal);
      }
      await Promise.all([...pending]); assert.deepEqual(row.errors, []); assert.deepEqual(row.sockets, [], 'The actual route attempted no WebSocket'); row.complete = true; persist();
      await context.close(); contexts.delete(context);
    }
    server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); server = null; log.end();
  }
  for (const control of report.cases.filter(row => row.arm === 'old-nesting')) {
    const healthy = report.cases.find(row => row.arm === 'healthy' && row.profile.name === control.profile.name && row.scene === control.scene);
    const fields = row => row.observations.map(observation => ({ label: observation.label, storage: observation.state.storage, session: observation.state.session, rng: observation.state.rng, writes: observation.state.writes, now: observation.state.now, text: observation.data.text }));
    assert.deepEqual(fields(control), fields(healthy), 'Copied old layout preserves the independent career, text, clock, storage and RNG baseline');
    const failed = control.checks.filter(check => !check.passed);
    assert(failed.length > 0); assert(failed.every(check => check.structure && check.failure.name === 'AssertionError'));
    assert(failed.some(check => check.name.includes('timeline header'))); assert(failed.some(check => check.name.includes('two intended')));
    report.comparisons.push({ profile: control.profile.name, scene: control.scene, baselineEqual: true, effective: true, failures: failed.map(check => check.name), healthyChecks: healthy.checks.length });
  }
  assert.equal(report.cases.length, 8); assert.equal(report.comparisons.length, 4);
  assert(report.cases.every(row => row.complete && row.errors.length === 0 && row.sockets.length === 0), 'Every owned route completed without a late transport, socket or runtime error');
  report.complete = true;
} catch (error) { report.complete = false; report.error = { name: error.name, message: error.message, stack: error.stack }; throw error;
} finally {
  for (const context of contexts) await context.close().catch(error => { report.complete = false; report.cleanupError = String(error); });
  await browser?.close(); server?.kill('SIGTERM');
  report.sourceAfter = hashes(held); report.buildAfter = hashes(['dist']); report.cacheAfter = hashes(['soccer-hub-grid-artifacts/asset-cache']);
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore); }
  catch (error) { report.complete = false; report.holdError = String(error); throw error; }
  finally { persist(); }
}
console.log('Soccer hub grid: four healthy route journeys and four actual old-page control journeys complete.');
console.log('Playing, newspaper and trusted Continue summary retain exact career, save, clock and RNG baselines.');
console.log('The copied old page fails real panel ownership and responsive placement checks.');
console.log('Source, healthy build and cached asset bytes held exactly.');
console.log(`Evidence: ${path.relative(ROOT, NATIVE)}`);
