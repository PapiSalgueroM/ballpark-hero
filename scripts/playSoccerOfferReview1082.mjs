/* Actual built Soccer Career route, actual signing handler, independent engine outcomes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI, 'Offer review native verification runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'soccer-offer-review-artifacts/native');
const CACHE = path.resolve(process.env.SOCCER_OFFER_REVIEW_ASSET_CACHE || path.join(ROOT, 'soccer-offer-review-artifacts/font-cache/manifest.json'));
const SAVE_KEY = 'soccerCareerSave';
const FROZEN_NOW = Date.parse('2026-10-07T12:00:00.000Z');
const BROWSER_SEED = 10821007;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const writeJSON = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build the actual application before the native route proof');
const assets = new Map(JSON.parse(fs.readFileSync(CACHE, 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flagcdn.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file), 'Cache payload stays inside its manifest directory');
  const body = fs.readFileSync(path.join(path.dirname(CACHE), entry.file));
  assert.equal(digest(body), entry.sha256, 'Actual cached asset bytes match their receipt');
  return [entry.url, { body, contentType: entry.contentType }];
}));
const fontSheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
const serviceOrigin = new URL(fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/export const SUPABASE_URL = "([^"]+)";/)[1]).origin;
assert.equal(fontSheets.length, 1);
assert(assets.has(fontSheets[0]), 'The actual template font stylesheet is cached');
function sourceHashes() {
  const result = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) result[file] = digest(fs.readFileSync(path.join(ROOT, file)));
    }
  }
  walk('src');
  for (const file of ['index.html', 'package.json', 'package-lock.json', 'scripts/playSoccerOfferReview1082.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs']) result[file] = digest(fs.readFileSync(path.join(ROOT, file)));
  return result;
}
function buildHashes() {
  const files = ['dist/index.html', 'dist/soccer-career/index.html', ...fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(file => /\.(?:js|css)$/.test(file)).map(file => `dist/assets/${file}`)];
  return Object.fromEntries(files.filter(file => fs.existsSync(path.join(ROOT, file))).map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
}
const report = { started: new Date().toISOString(), complete: false, scope: 'Actual built /soccer-career, its actual OfferCard and internal handleAcceptOffer, unmodified independent engine oracle', limits: ['Explicitly staged saved transfer windows are not a naturally completed career campaign.', 'One trusted signature per journey plus one actual handler toast; rapid duplicate activation is not exercised.', 'Only the new review dialog is subject to 44px and 12px geometry checks; existing career controls are outside this claim.'], sourceBefore: sourceHashes(), buildBefore: buildHashes(), assetManifestSha256: digest(fs.readFileSync(CACHE)), cases: [], controls: [], forwardedWrites: 0 };
const save = () => writeJSON('report.json', report);
save();
const { build } = await import('esbuild');
const { chromium } = await import('./lib/playwrightLoader.mjs');
const baselineFile = path.join(OUT, 'independent-engine.mjs');
const built = await build({ absWorkingDir: ROOT, stdin: { contents: `export { initCareer, advanceYouthYear, acceptOffer, generateContractOffers, repairCareer, nextSeasonYear, formatWage, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine'; export { depthChart, GROUP_LABEL } from './src/lib/soccerClubSquad'; export { isSoccerCareerSave } from './src/lib/soccerCareerSave';`, resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
fs.writeFileSync(baselineFile, built.outputFiles[0].contents);
writeJSON('independent-engine-metafile.json', built.metafile);
function oracleEnvironment(initial = { seed: 1082, draws: 0 }) {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  const originalDate = Date, originalRandom = Math.random, originalFetch = globalThis.fetch;
  const memory = new Map(), writes = [], transport = [];
  let rng = { ...initial };
  globalThis.Date = class extends originalDate { constructor(...args) { super(...(args.length ? args : [FROZEN_NOW])); } static now() { return FROZEN_NOW; } };
  Math.random = () => { rng.draws++; rng.seed = (Math.imul(rng.seed, 1664525) + 1013904223) >>> 0; return rng.seed / 4294967296; };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => { writes.push({ method: 'setItem', key, value: String(value) }); memory.set(key, String(value)); },
    removeItem: key => { writes.push({ method: 'removeItem', key }); memory.delete(key); },
    clear: () => { writes.push({ method: 'clear' }); memory.clear(); },
  } });
  globalThis.fetch = async url => { transport.push({ type: 'fetch', url: String(url) }); throw new Error('Independent engine cannot use transport'); };
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class { constructor(url) { transport.push({ type: 'socket', url: String(url) }); throw new Error('Independent engine cannot open a socket'); } } });
  return {
    snapshot: () => ({ rng: { ...rng }, now: Date.now(), storage: Object.fromEntries(memory), writes: clone(writes), transport: clone(transport) }),
    reset: seed => { rng = { seed, draws: 0 }; },
    restore: () => {
      globalThis.Date = originalDate; Math.random = originalRandom; globalThis.fetch = originalFetch;
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete globalThis.localStorage;
      if (previousSocket) Object.defineProperty(globalThis, 'WebSocket', previousSocket); else delete globalThis.WebSocket;
    },
  };
}
let engine, fixtures;
const environment = oracleEnvironment(), origins = [];
try {
  const importBefore = environment.snapshot();
  engine = await import(pathToFileURL(baselineFile).href);
  report.baseline = { sha256: digest(built.outputFiles[0].contents), inputs: Object.keys(built.metafile.inputs), importBefore, importAfter: environment.snapshot(), usesReviewHelper: false };
  assert(!report.baseline.inputs.some(file => file.endsWith('/soccerOfferReview.ts')), 'The expected signing result does not import the new review helper');
  const generated = (label, seed, fn) => {
    environment.reset(seed); const before = environment.snapshot();
    const value = fn(); origins.push({ label, before, after: environment.snapshot(), value: clone(value) }); return value;
  };
  const initial = generated('actual initialization', 108200, () => engine.initCareer('Native Offer Review', 'England', 'ST', '2020-24', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, engine.FALLBACK_CLUBS, undefined, 90));
  const first = generated('actual youth advance', 108201, () => engine.advanceYouthYear(clone(initial), engine.FALLBACK_CLUBS));
  assert.equal(first.phase, 'contract_offer'); assert(first.pendingOffers.length > 0);
  const firstOffer = first.pendingOffers[0];
  const current = generated('actual first signing', 108202, () => engine.acceptOffer(clone(first), clone(firstOffer)));
  current.agentId = 'super';
  const year = engine.nextSeasonYear(current);
  const available = engine.FALLBACK_CLUBS.filter(club => [2, 3].includes(club.tier) && club.name !== current.currentClub);
  const chartFor = club => engine.depthChart(club.name, year, current.position, current.overall, current.playerName);
  const byLongName = (a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name);
  const known = available.filter(club => chartFor(club)).sort(byLongName)[0];
  const missing = available.filter(club => !chartFor(club)).sort(byLongName)[0];
  assert(known && missing, 'Actual bundled clubs supply both recorded and unavailable depth cases');
  const offered = (club, seed) => {
    const values = generated(`actual generated offer for ${club.name}`, seed, () => engine.generateContractOffers([club], current.overall, current.age));
    assert.equal(values.length, 1, 'The unchanged generator offers the selected real club');
    return values[0];
  };
  const currentOffer = offered(known, 108203);
  const actualCurrentSignature = generated('current offer acceptance for staged boundary', 108204, () => engine.acceptOffer(clone(current), clone(currentOffer)));
  current.weeklyWage = Math.floor((currentOffer.wage + actualCurrentSignature.weeklyWage) / 2);
  assert(currentOffer.wage < current.weeklyWage && current.weeklyWage < actualCurrentSignature.weeklyWage, 'Actual agent increase crosses the staged current wage');
  currentOffer.isPayCut = true; currentOffer.isDreamClub = true;
  current.phase = 'transfer_window'; current.transferSituation = { type: 'dream_club', offer: currentOffer };
  const lower = clone(current), lowerOffer = clone(currentOffer);
  lower.weeklyWage = actualCurrentSignature.weeklyWage + 1; lowerOffer.isPayCut = false; lowerOffer.isDreamClub = false;
  lower.transferSituation = { type: 'one_offer', offer: lowerOffer };
  const legacy = clone(current), legacyOffer = offered(missing, 108205);
  delete legacy.agentId;
  legacy.transferSituation = { type: 'frozen_out', mode: 'released', reasons: [], offers: [legacyOffer] };
  fixtures = [
    { id: 'first-contract', career: first, offer: firstOffer, comparison: 'first', staging: 'Actual initialization and advanceYouthYear produce the first offer screen.' },
    { id: 'current-contract-long-name', career: current, offer: currentOffer, comparison: 'current', dream: true, staging: 'Actual first signing and generated real-club offer; super agent, dream window, current wage between raw and actual signed wage, and stale isPayCut=true are explicit scenario staging. No real club facts changed.', lower: { career: lower, offer: lowerOffer, dream: false, staging: '390px variant: same actual generated offer, current wage staged one euro above the actual signature and isPayCut=false, with one-offer window.' } },
    { id: 'released-legacy-missing-depth', career: legacy, offer: legacyOffer, comparison: 'released', staging: 'Legacy agent field omitted; released window explicitly staged with stale previous contract numbers. Actual generated offer, real bundled club, actual unavailable depth. This is not a natural-release simulation.' },
  ];
  for (const fixture of fixtures) assert(engine.isSoccerCareerSave(fixture.career), `${fixture.id}: actual validator accepts the fixture`);
  assert(engine.isSoccerCareerSave(lower));
  report.nameCoverage = { recorded: known.name, recordedLength: known.name.length, unavailable: missing.name, unavailableLength: missing.name.length, selection: 'Longest eligible names from the unchanged actual club pool, without fabricated names or substitutions.' };
  report.fixtureEnvironment = environment.snapshot();
  assert.deepEqual(report.fixtureEnvironment.writes, []); assert.deepEqual(report.fixtureEnvironment.transport, []);
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore); throw error;
} finally { environment.restore(); writeJSON('fixture-origins.json', origins); save(); }
writeJSON('fixtures.json', fixtures);
const protectedStorage = { 'unrelated-career-save': '{"keep":"exact"}', 'dukb-local-completions': '[]', 'dukb-streaks-v1': '{}', 'dukb-play-diary-v1': '[]' };
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser, activePage;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Owned server timeout: ${serverLog}`)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => { let frames = 0, stable = 0, last = scrollY; const frame = () => { stable = Math.abs(last - scrollY) < .1 ? stable + 1 : 0; last = scrollY; if (++frames >= 100 || stable >= 10) resolve(); else requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
  });
}
async function loadedFonts(page) {
  const result = await page.evaluate(async () => {
    await document.fonts.ready; const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Contract review');
      rows.push({ family, weight, faces: faces.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
    }
    return rows;
  });
  assert(result.every(row => row.faces.length && row.faces.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family)), 'All eight actual template font faces loaded');
  return result;
}
const snapshot = page => page.evaluate(() => ({ storage: Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b))), writes: structuredClone(window.__offerReview.writes), rng: { seed: window.__offerReview.seed, draws: window.__offerReview.draws }, now: Date.now(), scrollY,
  layout: window.__offerReview.readLayout(), telemetry: { events: structuredClone(window.__offerReview.events), trace: structuredClone(window.__offerReview.trace) } }));
async function visibleImages(page, trigger, country) {
  await page.waitForFunction(() => [...document.images].filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.y < innerHeight; }).every(node => node.complete && node.naturalWidth > 0));
  const result = await page.evaluate(() => [...document.images].filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.y < innerHeight; }).map(node => ({ src: node.currentSrc, complete: node.complete, naturalWidth: node.naturalWidth, alt: node.alt })));
  const flag = await trigger.evaluate((node, country) => {
    const card = node.parentElement;
    const flag = country === 'England' ? card.querySelector('svg[viewBox="0 0 60 36"]') : [...card.querySelectorAll('img')].find(image => image.alt === country);
    if (!flag) return null;
    const r = flag.getBoundingClientRect();
    return { html: flag.outerHTML, visible: r.width > 0 && r.height > 0 && r.y >= 0 && r.bottom <= innerHeight, loaded: flag instanceof SVGElement || (flag.complete && flag.naturalWidth > 0) };
  }, country);
  assert(flag?.visible && flag.loaded, 'Actual offer flag is visible and loaded, including the existing inline England flag');
  return { images: result, offerFlag: flag };
}
async function readCard(trigger) {
  return trigger.evaluate(node => {
    const card = node.parentElement;
    return { wage: [...card.querySelectorAll('span')].find(span => span.textContent.startsWith('💰'))?.textContent, payCut: card.textContent.includes('Lower weekly wage than your current deal'), stay: [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Stay at your club') };
  });
}
function checkCard(card, before, fixture, signed) {
  assert.equal(card.wage, `💰 ${engine.formatWage(signed.weeklyWage)}`, 'Offer card wage equals the actual signed wage');
  assert.equal(card.payCut, fixture.comparison === 'current' && signed.weeklyWage < before.weeklyWage, 'Offer card pay-cut warning follows actual signed delta, not the stale flag');
  if (fixture.dream) assert.equal(card.stay, true, 'Dream offer retains the truthful Stay at your club action');
}
async function geometry(page) {
  return page.locator('[data-soccer-offer-review]').evaluate(pane => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const text = node => ({ ...box(node), text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth });
    return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, pane: box(pane), scrollY,
      buttons: [...pane.querySelectorAll('button')].map(node => { const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { ...text(node), name: node.getAttribute('aria-label') || node.textContent, hit: hit === node || node.contains(hit) }; }),
      copy: [...pane.querySelectorAll('p,dt,dd,strong,[data-offer-contract-years]')].filter(node => node.getBoundingClientRect().width > 1).map(text),
      critical: [...pane.querySelectorAll('[data-offer-club],[data-offer-signed-wage],[data-offer-contract-years]')].map(text) };
  });
}
function checkGeometry(value) {
  assert(value.documentWidth <= value.viewport.width + 1, 'Review has no horizontal page overflow');
  const visible = box => box.x >= -1 && box.right <= value.viewport.width + 1 && box.y >= -1 && box.bottom <= value.viewport.height + 1;
  assert(visible(value.pane), 'Review pane stays inside the viewport');
  for (const node of value.critical) assert(visible(node), 'Offered club, signed wage and years are visible without driver scrolling');
  for (const button of value.buttons) {
    assert(button.width >= 44 && button.height >= 44, 'Review controls have 44px targets');
    assert(visible(button) && button.hit, 'Review controls are visible and own their hit targets');
  }
  for (const node of [...value.copy, ...value.buttons]) {
    assert(node.font >= 12, 'Review text is at least 12px');
    assert(node.scrollWidth <= node.clientWidth + 1, 'Review text is not clipped horizontally');
  }
}
async function readTerms(page) {
  return page.locator('[data-soccer-offer-review]').evaluate(pane => {
    const read = selector => { const node = pane.querySelector(selector); return node ? { text: node.textContent.trim(), value: node.getAttribute(selector.slice(1, -1)) } : null; };
    return { club: read('[data-offer-club]'), signed: read('[data-offer-signed-wage]'), current: read('[data-offer-current]'), currentWage: read('[data-offer-current-wage]'), delta: read('[data-offer-wage-delta]'), years: read('[data-offer-contract-years]'), depth: read('[data-offer-depth]') };
  });
}
function checkTerms(terms, before, fixture, signed) {
  assert.equal(terms.club.text, fixture.offer.club.name, 'Review identifies the actual offered club');
  assert.equal(terms.signed.text, `€${signed.weeklyWage.toLocaleString('en-US')}/wk`, 'Visible signed wage equals the actual acceptance outcome');
  assert.equal(Number(terms.signed.value), signed.weeklyWage);
  assert.equal(terms.years.text, `${signed.contractYearsLeft}-year contract`, 'Visible years equal actual acceptance');
  if (fixture.comparison === 'current') {
    const delta = signed.weeklyWage - before.weeklyWage;
    assert.equal(terms.currentWage.text, `€${before.weeklyWage.toLocaleString('en-US')}/wk`);
    assert(terms.current.text.includes(before.loan?.parentClub ?? before.currentClub));
    assert.equal(terms.delta.text, delta === 0 ? 'Same weekly wage as your current deal.' : `€${Math.abs(delta).toLocaleString('en-US')}/wk ${delta > 0 ? 'more' : 'less'} than your current deal.`);
    assert.equal(Number(terms.delta.value), delta);
  } else {
    assert.equal(terms.currentWage, null, 'No stale current wage is presented as an available deal');
    assert.equal(terms.delta, null, 'No misleading comparison for a first contract or release');
    assert.equal(terms.current.text, 'Current deal' + (fixture.comparison === 'first' ? 'First senior contract. No current senior deal to compare.' : 'Released. Your previous club is not an option to stay.'));
  }
  const year = engine.nextSeasonYear(before), chart = engine.depthChart(fixture.offer.club.name, year, before.position, before.overall, before.playerName);
  assert.equal(terms.depth.value, chart ? 'available' : 'unavailable');
  if (chart) {
    assert(terms.depth.text.includes(`Recorded ${year}/${String(year + 1).slice(-2)} squad fit`));
    assert(terms.depth.text.includes(`Position rank: ${chart.ahead + 1} of ${chart.men.length} ${engine.GROUP_LABEL[chart.group]}.`));
    assert(terms.depth.text.includes('A rating comparison, not a promise of starts.'));
  } else assert.equal(terms.depth.text, 'Squad data unavailable for this club and season.');
}
async function activate(locator, touch) { if (touch) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); } }
function unchanged(before, after, label) {
  assert.deepEqual(after.storage, before.storage, `${label}: saved bytes unchanged`);
  assert.deepEqual(after.writes, before.writes, `${label}: no storage write while comparing`);
  assert.deepEqual(after.rng, before.rng, `${label}: comparison consumes no random draw`);
  assert.equal(after.now, before.now, `${label}: comparison uses the frozen clock`);
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of [
    { width: 320, height: 780, touch: true, theme: 'dark', reduced: true },
    { width: 390, height: 844, touch: true, theme: 'light', reduced: false },
    { width: 1280, height: 720, touch: false, theme: 'light', reduced: false },
  ]) for (const originalFixture of fixtures) {
    const fixture = profile.width === 390 && originalFixture.lower ? { ...originalFixture, ...originalFixture.lower } : originalFixture;
    const id = `${profile.width}-${profile.touch ? 'touch' : 'keyboard'}-${fixture.id}`;
    const row = { id, profile, fixture: fixture.id, staging: fixture.staging, stages: [], screenshots: [], network: [], unexpectedRequests: [], assetResponses: [], events: [], errors: [], consoleErrors: [], assetErrors: [], webSockets: [] };
    report.cases.push(row); save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, colorScheme: profile.theme, reducedMotion: profile.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: SAVE_KEY, value: JSON.stringify(fixture.career) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme }, { name: 'dukb-soccer-currency', value: 'EUR' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }, ...Object.entries(protectedStorage).map(([name, value]) => ({ name, value })),
    ] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      const receipt = { method: request.method(), origin: url.origin, path: url.pathname, query: url.search, type: request.resourceType(), handling: 'blocked' };
      row.network.push(receipt);
      if (request.method() === 'GET' && assets.has(url.href)) {
        const asset = assets.get(url.href); row.assetResponses.push({ url: url.href, sha256: digest(asset.body), bytes: asset.body.length });
        receipt.handling = 'actual cached asset';
        return route.fulfill({ status: 200, ...asset });
      }
      if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') {
        receipt.handling = 'explicit local empty live-board read';
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { date: new Date(FROZEN_NOW).toUTCString() }, body: '[]' });
      }
      row.unexpectedRequests.push(receipt);
      if (['font', 'image', 'stylesheet'].includes(request.resourceType())) row.assetErrors.push(`Uncached ${request.resourceType()}: ${url.href}`);
      return route.abort();
    });
    await context.routeWebSocket('**/*', socket => { row.webSockets.push(socket.url()); socket.close(); });
    await context.addInitScript(({ seed, now, triggerName }) => {
      const state = window.__offerReview = { writes: [], seed, draws: 0, events: [], trace: [], frames: false };
      const label = node => node instanceof Element ? { tag: node.tagName, id: node.id, name: node.getAttribute('aria-label') || node.textContent?.slice(0, 160), class: String(node.className) } : null;
      const box = node => {
        if (!(node instanceof Element)) return null;
        const r = node.getBoundingClientRect(), css = getComputedStyle(node);
        return { ...label(node), x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, clientHeight: node.clientHeight, scrollTop: node.scrollTop,
          position: css.position, overflowX: css.overflowX, overflowY: css.overflowY, overflowAnchor: css.overflowAnchor, marginTop: css.marginTop, marginRight: css.marginRight, paddingTop: css.paddingTop, paddingRight: css.paddingRight, transform: css.transform };
      };
      state.readLayout = () => {
        const trigger = [...document.querySelectorAll('button[aria-label]')].find(node => node.getAttribute('aria-label') === triggerName), viewport = window.visualViewport;
        return { time: performance.now(), scrollX, scrollY, innerWidth, innerHeight, document: box(document.documentElement), body: box(document.body), scrollLock: document.body?.getAttribute('data-scroll-locked'),
          visualViewport: viewport ? { width: viewport.width, height: viewport.height, scale: viewport.scale, offsetTop: viewport.offsetTop, offsetLeft: viewport.offsetLeft, pageTop: viewport.pageTop, pageLeft: viewport.pageLeft } : null,
          trigger: box(trigger), card: box(trigger?.parentElement), pane: box(document.querySelector('[data-soccer-offer-review]')), focus: box(document.activeElement) };
      };
      const trace = (type, detail = {}) => state.trace.push({ type, ...detail, layout: state.readLayout() });
      const delegate = (owner, method) => {
        const original = owner[method];
        owner[method] = function(...args) {
          const detail = { method, receiver: label(this), args: args.map(value => value instanceof Element ? label(value) : value), stack: new Error().stack };
          trace('call-before', detail);
          try { return Reflect.apply(original, this, args); }
          finally { trace('call-after', detail); }
        };
      };
      delegate(HTMLElement.prototype, 'focus'); delegate(Element.prototype, 'scrollIntoView'); delegate(window, 'scrollTo'); delegate(window, 'scrollBy');
      for (const type of ['scroll', 'resize']) window.addEventListener(type, event => trace(type, { target: label(event.target) }), { capture: true, passive: true });
      for (const type of ['scroll', 'resize']) window.visualViewport?.addEventListener(type, () => trace(`visual-viewport-${type}`), { passive: true });
      state.startFrames = label => { state.frames = true; trace('frame-start', { label }); const frame = () => { if (!state.frames) return; trace('frame'); requestAnimationFrame(frame); }; requestAnimationFrame(frame); };
      state.stopFrames = label => { trace('frame-stop', { label }); state.frames = false; };
      const OriginalDate = Date;
      window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
      Math.random = () => { const state = window.__offerReview; state.draws++; state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; };
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(...args) { if (this === localStorage) window.__offerReview.writes.push({ method, key: method === 'clear' ? '*' : args[0], value: args[1] ?? null }); return original.apply(this, args); };
      }
      for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup', 'focusin']) window.addEventListener(type, event => { const target = event.target instanceof Element ? event.target : null; state.events.push({ type, trusted: event.isTrusted, key: event.key, pointerType: event.pointerType, target: target?.closest('button')?.getAttribute('aria-label') || target?.closest('button')?.textContent || target?.tagName, layout: state.readLayout() }); }, true);
    }, { seed: BROWSER_SEED, now: FROZEN_NOW, triggerName: `Review contract with ${fixture.offer.club.name}` });
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.url()}: ${response.status()}`); });
    const button = name => page.getByRole('button', { name, exact: true });
    const trigger = button(`Review contract with ${fixture.offer.club.name}`);
    const picture = async label => { const file = `${id}-${label}.png`; await page.screenshot({ path: path.join(OUT, file), fullPage: false }); row.screenshots.push(file); };
    const stage = async label => { const value = await snapshot(page); row.stages.push({ label, ...value }); save(); return value; };
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
    await trigger.waitFor(); row.fonts = await loadedFonts(page); await settle(page);
    await trigger.scrollIntoViewIfNeeded(); await settle(page);
    row.initialNavigation = 'Driver navigates to the actual offer once; dialog visibility proofs use no driver scrolling.';
    const start = await stage('before-review'), before = JSON.parse(start.storage[SAVE_KEY]);
    assert(engine.isSoccerCareerSave(before));
    row.images = await visibleImages(page, trigger, fixture.offer.club.country);
    const oracle = oracleEnvironment(start.rng);
    let signed;
    try {
      row.oracleBefore = oracle.snapshot();
      signed = clone(engine.acceptOffer(clone(before), clone(fixture.offer)));
      row.oracleAfter = oracle.snapshot();
      assert.deepEqual(row.oracleAfter.writes, []); assert.deepEqual(row.oracleAfter.transport, []);
    } finally { oracle.restore(); }
    writeJSON(`${id}-expected-signature.json`, { before, offer: fixture.offer, signed, oracleBefore: row.oracleBefore, oracleAfter: row.oracleAfter });
    row.card = await readCard(trigger); checkCard(row.card, before, fixture, signed); await picture('offer');
    if (fixture.comparison === 'current') {
      const cardGeometry = () => trigger.evaluate(node => { const card = node.parentElement, r = card.getBoundingClientRect(); return { html: card.innerHTML, x: r.x, y: r.y, width: r.width, height: r.height, scrollY }; });
      const control = { id, fault: 'stale-card-paycut', before: { card: await readCard(trigger), geometry: await cardGeometry() } };
      report.controls.push(control);
      try {
        await trigger.evaluate(node => {
          const card = node.parentElement, text = 'Lower weekly wage than your current deal';
          const badge = [...card.children].find(child => child.textContent === text);
          if (badge) { window.__offerReview.cardFault = { badge, original: badge.textContent }; badge.textContent = ''; }
          else { const added = document.createElement('div'); added.textContent = text; card.append(added); window.__offerReview.cardFault = { added }; }
        });
        control.faulted = { card: await readCard(trigger), geometry: await cardGeometry() };
        assert.notDeepEqual(control.faulted, control.before, 'Card DOM control changes the visible warning');
        let failure;
        try { checkCard(control.faulted.card, before, fixture, signed); } catch (error) { failure = error; }
        assert.equal(failure?.name, 'AssertionError'); assert(failure.message.startsWith('Offer card pay-cut warning follows actual signed delta, not the stale flag'));
        control.error = { name: failure.name, message: failure.message }; await picture('fault-stale-card-paycut');
      } finally {
        await page.evaluate(() => { const value = window.__offerReview.cardFault; if (value.added) value.added.remove(); else value.badge.textContent = value.original; delete window.__offerReview.cardFault; });
        control.restored = { card: await readCard(trigger), geometry: await cardGeometry() };
        assert.deepEqual(control.restored, control.before, 'Card control restores exact original DOM and geometry');
        checkCard(control.restored.card, before, fixture, signed); save();
      }
    }
    await page.evaluate(() => window.__offerReview.startFrames('initial review open'));
    await stage('immediately-before-open');
    await activate(trigger, profile.touch); await settle(page);
    await page.evaluate(() => window.__offerReview.stopFrames('initial review opened'));
    const opened = await stage('opened'); unchanged(start, opened, 'Open review');
    assert(Math.abs(opened.scrollY - start.scrollY) <= 1, 'Opening review preserves the gameplay viewport');
    row.terms = await readTerms(page); checkTerms(row.terms, before, fixture, signed);
    row.geometry = await geometry(page); checkGeometry(row.geometry); await picture('review');
    await activate(button('Contract review help'), profile.touch); await settle(page);
    const helped = await stage('help'); unchanged(start, helped, 'Help');
    const help = page.locator('[data-offer-review-help]');
    assert((await help.innerText()).includes('Example: a €1000 base offer with a 10% increase signs at €1100 a week. Against a €1000 current wage, that is €100 more each week.'));
    checkGeometry(await geometry(page)); await picture('help');
    await activate(button('Back to review'), profile.touch); await settle(page);
    unchanged(start, await stage('help-back'), 'Back from help');
    checkTerms(await readTerms(page), before, fixture, signed);
    await activate(button('Back'), profile.touch); await page.locator('[data-soccer-offer-review]').waitFor({ state: 'hidden' }); await settle(page);
    const back = await stage('back'); unchanged(start, back, 'Back without signing');
    assert(await trigger.evaluate(node => document.activeElement === node), 'Back restores the original review trigger focus');
    assert(Math.abs(back.scrollY - start.scrollY) <= 1, 'Back restores focus without a viewport jump');
    await activate(trigger, profile.touch); await settle(page); await page.keyboard.press('Escape');
    await page.locator('[data-soccer-offer-review]').waitFor({ state: 'hidden' }); await settle(page);
    const escaped = await stage('escape'); unchanged(start, escaped, 'Escape without signing');
    assert(await trigger.evaluate(node => document.activeElement === node), 'Escape restores original trigger focus');
    assert(Math.abs(escaped.scrollY - start.scrollY) <= 1, 'Escape preserves the gameplay viewport');
    await activate(trigger, profile.touch); await settle(page);
    if (fixture.comparison === 'current') {
      for (const fault of ['visible-wage', 'font', 'offscreen-action']) {
        const selector = fault === 'offscreen-action' ? 'button' : '[data-offer-signed-wage]';
        const target = fault === 'offscreen-action' ? button('Sign contract') : page.locator(selector);
        const original = await target.evaluate(node => ({ text: node.textContent, style: node.getAttribute('style') }));
        const control = { id, fault, before: { terms: await readTerms(page), geometry: await geometry(page) }, original };
        report.controls.push(control);
        try {
          await target.evaluate((node, kind) => { if (kind === 'visible-wage') node.textContent = '€1/wk'; else if (kind === 'font') node.style.setProperty('font-size', '1px', 'important'); else node.style.setProperty('transform', 'translateY(1000px)', 'important'); }, fault);
          control.faulted = { terms: await readTerms(page), geometry: await geometry(page) };
          assert.notDeepEqual(control.faulted, control.before, 'DOM control changes retained observation');
          const mapped = fault === 'visible-wage' ? 'Visible signed wage equals the actual acceptance outcome' : fault === 'font' ? 'Review text is at least 12px' : 'Review controls are visible and own their hit targets';
          let failure;
          try { if (fault === 'visible-wage') checkTerms(control.faulted.terms, before, fixture, signed); else checkGeometry(control.faulted.geometry); } catch (error) { failure = error; }
          assert.equal(failure?.name, 'AssertionError'); assert(failure.message.startsWith(mapped), 'DOM fault reaches its mapped assertion');
          control.error = { name: failure.name, message: failure.message }; await picture(`fault-${fault}`);
        } finally {
          await target.evaluate((node, value) => { node.textContent = value.text; if (value.style === null) node.removeAttribute('style'); else node.setAttribute('style', value.style); }, original);
          control.restored = { terms: await readTerms(page), geometry: await geometry(page) };
          assert.deepEqual(control.restored, control.before, 'DOM control restores exact original geometry and terms');
          checkTerms(control.restored.terms, before, fixture, signed); checkGeometry(control.restored.geometry); save();
        }
      }
    }
    const readyToSign = await stage('ready-to-sign'); unchanged(start, readyToSign, 'All review navigation and controls');
    assert.deepEqual(readyToSign.rng, row.oracleBefore.rng, 'Actual signature starts at the independent engine RNG state');
    await activate(button('Sign contract'), profile.touch);
    await page.locator('[data-signed-slip]').waitFor(); await settle(page);
    assert.equal(await page.locator('[data-sonner-toast]').filter({ hasText: `Signed with ${fixture.offer.club.name}!` }).count(), 1, 'One signature produces one actual handler toast');
    const after = await stage('signed');
    assert.deepEqual(JSON.parse(after.storage[SAVE_KEY]), signed, 'One actual page signature equals the complete independent engine outcome');
    const signatureWrites = after.writes.slice(start.writes.length);
    assert.equal(signatureWrites.length, 1, 'Exactly one persistent write for the actual signature');
    assert.equal(signatureWrites[0].key, SAVE_KEY); assert.equal(signatureWrites[0].method, 'setItem');
    for (const [key, value] of Object.entries(protectedStorage)) assert.equal(after.storage[key], value, 'Signature does not write another career or scores');
    assert.equal(signed.events.filter(text => text.includes(`Signed with ${fixture.offer.club.name}`)).length, before.events.filter(text => text.includes(`Signed with ${fixture.offer.club.name}`)).length + 1);
    await picture('signed');
    row.events.push(...await page.evaluate(() => window.__offerReview.events));
    await page.reload({ waitUntil: 'networkidle' }); await settle(page);
    const restored = await stage('reloaded');
    const repairEnvironment = oracleEnvironment({ seed: BROWSER_SEED, draws: 0 });
    let repaired;
    try { row.repairBefore = repairEnvironment.snapshot(); repaired = clone(engine.repairCareer(clone(signed))); row.repairAfter = repairEnvironment.snapshot(); assert.deepEqual(row.repairAfter, row.repairBefore, 'Repairing the complete signed career consumes no randomness or persistence'); }
    finally { repairEnvironment.restore(); }
    assert.deepEqual(JSON.parse(restored.storage[SAVE_KEY]), repaired, 'Reload restores the actual signed career without signing again');
    assert.equal(await page.locator('[data-signed-slip]').count(), 0, 'Reload does not replay the signature moment');
    for (const [key, value] of Object.entries(protectedStorage)) assert.equal(restored.storage[key], value);
    await picture('reloaded');
    row.events.push(...await page.evaluate(() => window.__offerReview.events));
    assert(row.events.some(event => event.trusted && event.type === (profile.touch ? 'pointerup' : 'keydown')), 'Journey uses trusted native input');
    assert(row.network.every(request => request.method === 'GET'), 'Contract comparison and signature make no external write or scoring request');
    assert.deepEqual(row.unexpectedRequests, [], 'Only explicit cached assets and the locally fulfilled live-board read are allowed');
    assert.deepEqual(row.errors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.webSockets, []);
    row.complete = true; save(); await context.close(); activePage = null;
  }
  assert.equal(report.cases.length, 9); assert(report.cases.every(row => row.complete)); assert.equal(report.controls.length, 12);
  report.complete = true;
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack };
  if (activePage && !activePage.isClosed()) {
    try { await activePage.evaluate(() => window.__offerReview?.stopFrames('failure')); report.failureObservation = await snapshot(activePage); } catch (observationError) { report.failureObservationError = String(observationError); }
    save();
    try { await activePage.screenshot({ path: path.join(OUT, 'failure.png'), fullPage: false }); } catch {}
  }
  throw error;
} finally {
  report.sourceAfter = sourceHashes();
  report.buildAfter = buildHashes();
  try {
    assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Native verification holds every actual product source');
    assert.deepEqual(report.buildAfter, report.buildBefore, 'Native verification serves the unchanged actual build');
    assert.equal(digest(fs.readFileSync(CACHE)), report.assetManifestSha256, 'Cached asset manifest is unchanged');
  }
  catch (error) { report.complete = false; report.sourceHoldError = error.message; throw error; }
  finally { save(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); await browser?.close(); server.kill(); }
}
console.log('Soccer offer review: 9 actual-route journeys, 12 effective restored DOM controls, no forwarded writes.');
