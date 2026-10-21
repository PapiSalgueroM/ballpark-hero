/* Remote-only proof of the real Club Manager desk. Fictional saved careers,
   literal money expectations, local transport fixtures and restored faults. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.resolve(process.env.SHIRT_BROWSER_OUT || process.env.ARTIFACT_DIR || path.join(ROOT, 'shirt-sales-artifacts/browser'));
const source = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const hash = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.env.CI, '1', 'Browser proof runs only on the remote runner');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport preload is required');
assert.match(source || '', /^[a-f0-9]{40}$/);
assert.equal(BASE, 'http://127.0.0.1:4173', 'Only the workflow-owned fixed loopback server is accepted');
fs.mkdirSync(OUT, { recursive: true });
const report = { source, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, status: 'running', declared: { positive: 7, faults: 3, restorations: 3 }, actualOutbound: 0, cases: [], holds: [], fonts: [], limitations: 'Real built CM route and trusted controls, fictional custom-club save with literal retail receipts. No played week, new payout, real roster-data verification or automatic Back focus-restoration claim.' };
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const persist = () => write('report.json', report);
const heldPaths = ['package.json', 'package-lock.json', 'src/lib/clubManager.ts', 'src/lib/clubManagerFinances.ts', 'src/lib/clubManagerMeters.ts', 'src/lib/clubManagerSlots.ts', 'src/lib/saveFence.ts', 'src/hooks/useClubManager.ts', 'src/pages/ClubManager.tsx', 'src/components/club-manager/FinancesScreen.tsx', 'scripts/lib/hostLikeServer.mjs', 'scripts/qa/playCmShirtSales1443.mjs'];
const held = new Map(heldPaths.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
report.holds = [...held].map(([file, body]) => ({ file, bytes: body.length, sha256: hash(body) }));
persist();
const index = fs.readFileSync(path.join(ROOT, 'dist/index.html'));
assert.equal(hash(Buffer.from(await (await fetch(BASE + '/')).arrayBuffer())), hash(index), 'External server serves the exact completed build');
const assets = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(file => file.endsWith('.js'));
const cards = assets.filter(file => fs.readFileSync(path.join(ROOT, 'dist/assets', file), 'utf8').includes('data-shirt-sales'));
assert.equal(cards.length, 1, 'Exactly one completed-build chunk owns the shirt card');
const cardFile = cards[0], cardSource = fs.readFileSync(path.join(ROOT, 'dist/assets', cardFile), 'utf8');
report.cardChunk = { file: cardFile, bytes: Buffer.byteLength(cardSource), sha256: hash(cardSource) };
const grossPattern = /(\[(?:"gross"|'gross'),(?:"Gross sales"|'Gross sales'),)([A-Za-z_$][\w$]*)\.grossPence(\])/g;
assert.equal([...cardSource.matchAll(grossPattern)].length, 1, 'Wrong-amount fault has one executable gross amount target');
const wrongAmountSource = cardSource.replace(grossPattern, '$1$2.grossPence+100$3');
assert.notEqual(wrongAmountSource, cardSource);
report.amountFault = { beforeSha256: hash(cardSource), afterSha256: hash(wrongAmountSource), addedPence: 100 };
persist();
assert(process.env.FREE_KICK_FONT_CACHE, 'The existing exact local font-response cache is required');
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'), 'utf8')).map(row => {
  const body = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, row.file)); assert.equal(hash(body), row.sha256);
  report.fonts.push({ url: row.url, sha256: row.sha256 }); return [row.url, { body, contentType: row.contentType }];
}));

const memory = new Map(), priorStorage = globalThis.localStorage;
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-shirts-browser-')), fixtureModule = path.join(scratch, 'engine.mjs');
let fixture, E;
try {
  await build({ stdin: { contents: "export { startCareer, saveCareer, loadCareer, SAVE_KEY, engineRegistrations, restoreEngineRegistrations } from './src/lib/clubManager'; export { ensureBooks } from './src/lib/clubManagerFinances';", resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: fixtureModule, absWorkingDir: ROOT, alias: { '@': './src' }, jsx: 'automatic', logLevel: 'error', banner: { js: "import { createRequire as __fixtureRequire } from 'node:module'; const require = __fixtureRequire(import.meta.url);" } });
  E = await import(pathToFileURL(fixtureModule).href);
  const originalRandom = Math.random, originalNow = Date.now, registrations = E.engineRegistrations(); let seed = 1519;
  Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  Date.now = () => Date.UTC(2026, 9, 21, 12);
  try {
    const career = E.startCareer('Shirt Browser Athletic', 'now', { name: 'Shirt Browser Athletic', leagueId: 'premier', stadium: 'Fixture Ground', budgetTier: 'small', quality: 72, crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SB' }, replacedClub: '' });
    assert(career.customClub && career.squad.length > 0 && career.squad.every(player => player.generated), 'Actual custom-club engine creates fictional fixture players');
    const books = E.ensureBooks(career);
    books.season = { ...books.season, weeks: 2, shirts: { v: 1, weeks: 2, openingPence: 123400, grossPence: 1800025, costPence: 600000, paidPence: 1000000 } };
    books.lastSeason = { ...books.season, shirts: { v: 1, weeks: 2, openingPence: 0, grossPence: 2400000, costPence: 800000, paidPence: 1000000 }, transferIn: 0, transferOut: 0, facilities: 0, staffFees: 0, income: 0.01, spend: 0, result: 0.01 };
    fixture = career;
  } finally { E.restoreEngineRegistrations(registrations); Math.random = originalRandom; Date.now = originalNow; }
  function canonical(kind) {
    const career = structuredClone(fixture);
    if (kind === 'legacy') delete career.books.season.shirts;
    if (kind === 'unavailable') career.books.season.shirts = null;
    const original = JSON.stringify(career); memory.clear(); assert.equal(E.saveCareer(career), true);
    const saved = memory.get(E.SAVE_KEY); const loaded = E.loadCareer(); assert(loaded); assert.equal(E.saveCareer(loaded), true);
    const canonical = memory.get(E.SAVE_KEY); const loadedAgain = E.loadCareer(); assert(loadedAgain); assert.equal(E.saveCareer(loadedAgain), true);
    assert.equal(memory.get(E.SAVE_KEY), canonical, 'Real save/load canonicalization is byte-idempotent before browser measurement');
    assert.equal(loaded.budget, career.budget); assert.deepEqual(loaded.books, career.books, 'Canonicalization cannot change literal receipts or valid base books');
    write('fixture-' + kind + '.json', canonical);
    return { value: canonical, key: E.SAVE_KEY, normalization: { originalSha256: hash(original), firstSavedSha256: hash(saved), canonicalSha256: hash(canonical), changedBeforeMeasurement: original !== canonical, bytes: Buffer.byteLength(canonical) } };
  }
  fixture = Object.fromEntries(['current', 'legacy', 'unavailable'].map(kind => [kind, canonical(kind)]));
  report.fixtures = Object.fromEntries(Object.entries(fixture).map(([kind, value]) => [kind, value.normalization]));
  persist();
} catch (error) { report.status = 'FAIL'; report.error = { name: error.name, message: error.message, stack: error.stack }; persist(); throw error; }
finally { fs.rmSync(scratch, { recursive: true, force: true }); if (priorStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = priorStorage; }

const profiles = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 432, height: 813 }, { width: 1440, height: 1000 }, { width: 390, height: 844, reduced: true }];
const cases = profiles.map(profile => ({ ...profile, kind: 'current' })).concat([{ width: 390, height: 844, kind: 'legacy' }, { width: 390, height: 844, kind: 'unavailable' }]);
const literal = { gross: '£18,000.25', production: '£6,000.00', net: '£12,000.25', paid: '£10,000.00', pending: '£3,234.25', opening: '£1,234.00' };
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350); };
async function activate(locator, row, floor = 44) {
  await locator.click({ trial: true });
  const target = await locator.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { text: el.textContent?.trim(), width: r.width, height: r.height, topmost: !!hit && (hit === el || el.contains(hit)) }; });
  row.controls.push(target); assert(target.width >= floor - .5 && target.height >= floor - .5, 'Trusted control retains 44px target'); assert(target.topmost, 'Trusted control is topmost');
  if (row.width < 600) await locator.tap(); else { await locator.focus(); await locator.press('Enter'); }
  await settle(locator.page());
}
async function ready(page, row) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  const choices = page.getByRole('region', { name: 'Cookie choices', exact: true });
  await choices.waitFor({ state: 'visible' }); await activate(choices.getByRole('button', { name: 'Reject all', exact: true }), row); await choices.waitFor({ state: 'hidden' });
  const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-consent-v2')));
  assert.equal(consent.version, 2); assert.equal(consent.analytics, false); assert.equal(consent.advertising, false); row.consent = consent;
  const resume = page.locator('[data-testid="cm-slot-1"] [data-cm-slot-open="resume"]');
  await resume.waitFor({ state: 'visible' }); await activate(resume, row);
  await page.getByRole('button', { name: /Finances.*Kitty change, projected/i }).waitFor({ state: 'visible' }); await settle(page);
}
const tile = page => page.getByRole('button', { name: /Finances.*Kitty change, projected/i });
const stored = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
async function openDesk(page, row) {
  const finance = tile(page); await finance.click({ trial: true });
  const before = await page.evaluate(() => scrollY); await activate(finance, row);
  const projection = page.locator('[data-finance-projection]'); await projection.waitFor({ state: 'visible' }); await settle(page);
  const arrived = await projection.evaluate(el => ({ y: el.getBoundingClientRect().top, scroll: scrollY }));
  assert(arrived.y >= -.5 && arrived.y < row.height - 80, 'Finance entry reveals its top without driver scrolling');
  await page.waitForTimeout(450); const stable = await page.evaluate(() => scrollY);
  assert(Math.abs(stable - arrived.scroll) <= 2, 'Finance entry does not continue jumping after arrival'); row.arrivals.push({ before, ...arrived, stable });
}
async function amounts(page, row) {
  const card = page.locator('[data-shirt-sales]'); assert.equal(await card.count(), 1, 'One shirt card is mounted');
  assert.equal(await card.isVisible(), true, 'Shirt card is visible');
  const words = (await card.textContent()).replace(/\s+/g, ' ');
  for (const phrase of ['Simulated sales', 'Opening or loading never pays.', '2 weeks earns £12,000.00']) assert(words.includes(phrase), 'Shirt rule and literal worked example remain readable');
  const cells = page.locator('[data-projection-line="shirtSales"] td'); assert.equal(await cells.count(), 3);
  if (row.kind === 'unavailable') {
    assert.equal(await card.locator('[data-shirt-totals="current"]').count(), 0); assert(await card.locator('[data-shirt-current-unavailable]').isVisible());
    assert.equal((await cells.nth(1).textContent()).trim(), 'Unavailable'); assert.equal((await cells.nth(2).textContent()).trim(), 'Unavailable');
    assert((await page.locator('[data-projection-total="income"]').textContent()).includes('known rows'));
  } else {
    const totals = card.locator('[data-shirt-totals="current"]');
    for (const [id, expected] of Object.entries(row.kind === 'legacy' ? { gross: '£0.00', production: '£0.00', net: '£0.00', paid: '£0.00', pending: '£0.00' } : literal)) {
      assert.equal((await totals.locator(`[data-shirt-amount="${id}"] dd`).textContent()).trim(), expected, `Literal ${id} amount`);
    }
    assert.equal((await cells.nth(1).textContent()).trim(), row.kind === 'legacy' ? '£0k' : '£10k');
    if (row.kind === 'legacy') { assert(words.includes('No earlier shirt sales are added.')); assert.equal(await totals.locator('[data-shirt-amount="opening"]').count(), 0); }
  }
  row.amountChecks += 1;
}
async function geometry(page, row) {
  const viewport = page.viewportSize(); assert.equal(viewport?.width, row.width, 'Configured browser viewport matches the case');
  const value = await page.locator('[data-shirt-sales]').evaluate(el => {
    const r = el.getBoundingClientRect(); return { width: innerWidth, document: document.documentElement.scrollWidth, card: { left: r.left, right: r.right, width: r.width }, cut: [el, ...el.querySelectorAll('*')].filter(node => node.clientWidth && getComputedStyle(node).display !== 'inline' && node.scrollWidth > node.clientWidth + 2).map(node => ({ text: node.textContent?.trim().slice(0, 60), scroll: node.scrollWidth, client: node.clientWidth })), animations: el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length };
  });
  row.geometry.push({ ...value, configuredWidth: viewport.width }); assert(Math.abs(value.width - viewport.width) <= 2 && value.document <= viewport.width + 2 && value.card.left >= -.5 && value.card.right <= viewport.width + .5, 'Shirt card and page fit the viewport');
  assert.deepEqual(value.cut, [], 'Shirt figures and labels do not clip'); if (row.reduced) assert.equal(value.animations, 0, 'Reduced-motion shirt card remains still');
}
async function capture(page, row, name) { const file = row.id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: name === 'full', animations: 'disabled' }); row.screenshots.push(file); }
async function runCase(browser, profile, fault = '', restoration = '') {
  const row = { ...profile, id: `${restoration ? 'restored-' + restoration + '-' : ''}${fault || profile.kind}-${profile.width}${profile.reduced ? '-reduced' : ''}`, fault, restoration, status: 'running', amountChecks: 0, arrivals: [], geometry: [], controls: [], screenshots: [], external: [], fulfilledExternal: 0, loopbackReads: 0, writes: [], errors: [], assets: [], interceptions: 0 };
  report.cases.push(row); persist(); const save = fixture[row.kind]; let context, page, baseline;
  try {
    context = await browser.newContext({ viewport: { width: row.width, height: row.height }, isMobile: row.width < 600, hasTouch: row.width < 600, reducedMotion: row.reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(req.method()), 'Loopback build receives read requests only');
        row.loopbackReads += 1;
        if (fault === 'amount' && url.pathname === '/assets/' + cardFile) { row.interceptions += 1; return route.fulfill({ status: 200, contentType: 'application/javascript', body: wrongAmountSource }); }
        if (['omission', 'overflow'].includes(fault) && url.pathname === '/club-manager') {
          const response = await route.fetch({ maxRedirects: 0 }); const html = await response.text(); const css = fault === 'omission' ? '[data-shirt-sales]{display:none!important}' : '[data-shirt-sales]{width:200vw!important;max-width:none!important}';
          const changed = html.replace('</head>', `<style data-shirt-proof-fault="${fault}">${css}</style></head>`); assert.notEqual(changed, html); row.interceptions += 1;
          return route.fulfill({ response, body: changed });
        }
        return route.continue();
      }
      row.external.push({ origin: url.origin, path: url.pathname, method: req.method() }); if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) row.writes.push({ origin: url.origin, path: url.pathname, method: req.method() });
      row.fulfilledExternal += 1;
      if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      if (/fonts\.(?:googleapis|gstatic)\.com/.test(url.hostname)) row.errors.push('Uncached font: ' + url.href);
      const type = req.resourceType(); return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => { row.errors.push('Unexpected WebSocket blocked'); socket.close(); });
    await context.addInitScript(({ key, value }) => { if (!sessionStorage.getItem('shirt-fixture-once')) { sessionStorage.setItem('shirt-fixture-once', '1'); localStorage.setItem(key, value); localStorage.setItem('dukb-cm-slots', JSON.stringify({ active: 1 })); } }, { key: save.key, value: save.value });
    page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => row.errors.push(String(error)));
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assets.push(response.url() + ': ' + response.status()); });
    page.on('requestfailed', req => { if (req.url().startsWith(BASE)) row.assets.push(req.url() + ': ' + req.failure()?.errorText); });
    await ready(page, row); baseline = await stored(page, save.key); assert(baseline); assert.deepEqual(JSON.parse(baseline), JSON.parse(save.value), 'Browser boot preserves the complete canonical fixture');
    row.save = { fixtureSha256: hash(save.value), baselineSha256: hash(baseline), bytes: Buffer.byteLength(baseline), equalFixtureBytes: baseline === save.value };
    await openDesk(page, row); await amounts(page, row); await geometry(page, row); await capture(page, row, 'full');
    const card = page.locator('[data-shirt-sales]'); await card.scrollIntoViewIfNeeded(); await settle(page); await capture(page, row, 'visible');
    const summary = card.locator('summary'); await activate(summary, row); const last = card.locator('[data-shirt-totals="last"]');
    assert.equal(await summary.evaluate(el => el.parentElement.open), true, 'Native history details actually open'); assert.equal(await last.isVisible(), true, 'Last-season totals are visible after opening history');
    for (const [id, expected] of Object.entries({ gross: '£24,000.00', net: '£16,000.00', paid: '£10,000.00', pending: '£6,000.00' })) assert.equal((await last.locator(`[data-shirt-amount="${id}"] dd`).textContent()).trim(), expected, 'Last season stays separate');
    await geometry(page, row); await capture(page, row, 'last-season'); await activate(summary, row);
    assert.equal(await summary.evaluate(el => el.parentElement.open), false, 'Native history details actually close'); assert.equal(await last.isVisible(), false, 'Last-season totals are hidden after closing history');
    assert.equal(await stored(page, save.key), baseline, 'Reading and expanding history preserve every saved byte');
    await activate(page.getByRole('button', { name: 'Club home', exact: true }), row); await tile(page).waitFor({ state: 'visible' });
    await page.keyboard.press('Tab'); row.focusAfterBack = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 80), connected: document.activeElement?.isConnected }));
    assert(row.focusAfterBack.connected && row.focusAfterBack.tag !== 'BODY', 'Native Back leaves keyboard navigation usable');
    await openDesk(page, row); await amounts(page, row); assert.equal(await stored(page, save.key), baseline, 'Repeated finance entry preserves every saved byte');
    await page.reload({ waitUntil: 'domcontentloaded' }); await readyAfterReload(page, row); await openDesk(page, row); await amounts(page, row);
    const final = await stored(page, save.key); assert.equal(final, baseline, 'Reload and resume never pay again or change any canonical saved byte'); row.save.finalSha256 = hash(final);
    assert.deepEqual(row.errors, [], 'No page or font errors'); assert.deepEqual(row.assets, [], 'No failed loopback asset'); assert.equal(row.fulfilledExternal, row.external.length, 'Every attempted external request receives only a local fixture'); assert(row.loopbackReads > 0); row.status = 'PASS';
  } catch (error) {
    row.error = { name: error.name, message: error.message, stack: error.stack }; row.status = fault ? 'EXPECTED_REJECTION' : 'FAIL';
    if (page) { try { await capture(page, row, 'failure'); write(row.id + '-failure.html', await page.content()); write(row.id + '-failure-state.json', { url: page.url(), saved: await stored(page, save.key), baseline, text: await page.locator('body').innerText() }); } catch (captureError) { row.captureError = String(captureError); } }
    if (!fault) throw error;
    const messages = { omission: 'Shirt card is visible', amount: 'Literal gross amount', overflow: 'Shirt card and page fit the viewport' };
    assert.equal(error.name, 'AssertionError', 'Fault must reach an actual outcome assertion'); assert(error.message.startsWith(messages[fault]), 'Fault reaches only its intended assertion'); assert.equal(row.interceptions, 1, 'Fault changes exactly one local response'); row.intendedRejection = messages[fault];
  } finally {
    if (context) { for (const open of context.pages()) await open.close().catch(() => {}); await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close(); }
    persist(); console.log(`CM_SHIRTS_BROWSER ${row.status} ${row.id}: amountChecks=${row.amountChecks} controls=${row.controls.length} intercepted=${row.interceptions}`);
  }
  if (fault) assert.equal(row.status, 'EXPECTED_REJECTION', 'Effective fault must be rejected');
}
async function readyAfterReload(page, row) {
  const resume = page.locator('[data-testid="cm-slot-1"] [data-cm-slot-open="resume"]'); await resume.waitFor({ state: 'visible' }); await activate(resume, row); await tile(page).waitFor({ state: 'visible' }); await settle(page);
}
let browser;
try {
  browser = await chromium.launch();
  for (const profile of cases) await runCase(browser, profile);
  for (const fault of ['omission', 'amount', 'overflow']) { await runCase(browser, { width: 390, height: 844, kind: 'current' }, fault); await runCase(browser, { width: 390, height: 844, kind: 'current' }, '', fault); }
  assert.equal(report.cases.filter(row => row.status === 'PASS' && !row.restoration).length, 7); assert.equal(report.cases.filter(row => row.status === 'EXPECTED_REJECTION').length, 3); assert.equal(report.cases.filter(row => row.status === 'PASS' && row.restoration).length, 3);
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.error = { name: error.name, message: error.message, stack: error.stack }; throw error; }
finally {
  await browser?.close();
  for (const [file, bytes] of held) { const after = fs.readFileSync(path.join(ROOT, file)); assert.equal(hash(after), hash(bytes), 'Held source/dependency bytes: ' + file); console.log('CM_SHIRTS_HOLD ' + hash(after) + ' ' + file); }
  persist();
}
console.log('CM_SHIRTS_BROWSER PASS: 7 actual route cases, 3 intended fault rejections, 3 exact positive restorations; literal current/last values, legacy/unavailable, trusted navigation, canonical save bytes and zero forwarded external requests.');
