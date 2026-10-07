/* Actual built boxing cash forecasts and unchanged complete show receipts. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Boxing browser checks run only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'boxing-show-forecast-artifacts/native');
const CACHE = path.join(ROOT, 'boxing-show-forecast-artifacts/fonts');
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const KEY = 'fight-promoter-save-v1';
const configured = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8').match(/^export const SUPABASE_URL = "([^"]+)";/m);
assert(configured); const serviceOrigin = new URL(configured[1]).origin;
const sheets = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
assert.equal(sheets.length, 1);
if (process.argv.includes('--prefetch-fonts-only')) {
  fs.mkdirSync(CACHE, { recursive: true }); const manifest = [];
  async function download(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
    assert(response.ok); const body = Buffer.from(await response.arrayBuffer()), file = hash(url);
    fs.writeFileSync(path.join(CACHE, file), body); manifest.push({ url, file, contentType: response.headers.get('content-type'), sha256: hash(body), bytes: body.length }); return body.toString('utf8');
  }
  const css = await download(sheets[0]);
  for (const url of [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))]) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await download(url); }
  assert(manifest.length > 1); fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2)); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'))).map(row => {
  const body = fs.readFileSync(path.join(CACHE, row.file)); assert.equal(hash(body), row.sha256); return [row.url, { ...row, body }];
}));
const files = ['src/components/fight-promoter/FightPromoterBoard.tsx', 'src/components/fight-promoter/BoxingShowForecast.tsx', 'src/lib/fightPromoter.ts', 'src/lib/fightCareer.ts', 'src/lib/mmaPromotion.ts', 'src/hooks/useMmaPromotion.ts', 'package.json', 'package-lock.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { complete: false, sourceBefore: hashes(), cases: [], controls: [], forwardedWrites: 0, limits: ['Four explicitly staged source-generated promotions, not whole campaigns.', 'One trusted show action per profile. No duplicate-input, blocked-save or naturally earned late-game coverage.', 'Native geometry covers the new forecast and help, not every existing boxing control.'] };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); save();
const bundled = await build({ absWorkingDir: ROOT, stdin: { contents: "export * from './src/lib/fightPromoter';", resolveDir: ROOT }, bundle: true, write: false, format: 'esm', platform: 'node', metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'silent' });
const bundlePath = path.join(OUT, 'independent-engine.mjs'); fs.writeFileSync(bundlePath, bundled.outputFiles[0].contents);
fs.writeFileSync(path.join(OUT, 'independent-engine-metafile.json'), JSON.stringify(bundled.metafile, null, 2));
assert(!Object.keys(bundled.metafile.inputs).some(file => /components|hooks/.test(file)), 'Engine oracle excludes presentation');
const factory = await import(pathToFileURL(bundlePath).href + '?fixtures');
let initial, pair;
for (let seed = 0; seed < 100 && !pair; seed++) {
  initial = factory.newPromoter('Native cash promotion', `cash1086-${seed}`);
  for (let a = 0; a < initial.pool.length && !pair; a++) for (let b = a + 1; b < initial.pool.length && !pair; b++) if (factory.legalMatch(initial.pool[a], initial.pool[b])) pair = [initial.pool[a].id, initial.pool[b].id];
}
assert(pair); initial = factory.sanitizePromoter(initial);
const bookings = [{ aId: pair[0], bId: pair[1], rounds: 8, title: false }];
const profiles = [
  { width: 320, height: 780, touch: true, theme: 'dark', reduced: true, boundary: 'negative' },
  { width: 390, height: 844, touch: true, theme: 'light', reduced: false, boundary: 'zero' },
  { width: 430, height: 932, touch: true, theme: 'dark', reduced: false, boundary: 'positive' },
  { width: 1440, height: 900, touch: false, theme: 'light', reduced: true, boundary: 'positive' },
];
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(serverLog)), 15000); server.once('error', reject); server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); });
const snapshot = page => page.evaluate(key => ({ storage: Object.fromEntries(Object.entries(localStorage).sort()), writes: structuredClone(window.__cashWrites), rng: window.__cashDraws, raw: localStorage.getItem(key), scrollY }), KEY);
async function reading(page) {
  return page.locator('[data-boxing-forecast]').evaluate(node => ({ ...Object.fromEntries(['attendance', 'gate', 'purses', 'rent', 'profit', 'cash-after'].map(key => { const value = node.querySelector(`[data-boxing-${key}]`); return [key, { value: Number(value.getAttribute('data-value')), text: value.textContent }]; })), status: node.querySelector('[role="status"]')?.textContent ?? null }));
}
function outcome(value, expected) {
  for (const key of ['attendance', 'gate', 'purses', 'rent', 'profit']) assert.equal(value[key].value, expected.result[key], `Visible ${key} equals actual unchanged show`);
  assert.equal(value['cash-after'].value, expected.state.money, 'Visible cash-after equals actual unchanged show');
  assert.equal(value.attendance.text, `${expected.result.attendance.toLocaleString('en-US')} of ${expected.result.venue.capacity.toLocaleString('en-US')}`, 'Visible attendance and capacity match the actual room');
  assert.equal(value.status, expected.state.money < 0 ? 'This show would leave you below 0 and end the promotion.' : expected.state.money === 0 ? 'This leaves exactly 0. Your promotion stays open, with no cash buffer.' : null, 'Visible cash warning matches the actual closing boundary');
  const money = n => `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}m`;
  for (const key of ['gate', 'purses', 'rent']) assert.equal(value[key].text, money(expected.result[key]));
  assert.equal(value.profit.text, `${expected.result.profit < 0 ? 'Loss' : 'Profit'} ${money(Math.abs(expected.result.profit))}`);
  assert.equal(value['cash-after'].text, money(expected.state.money));
}
async function geometry(page, selector) {
  return page.locator(selector).evaluate((node, viewport) => {
    const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const hit = el => { const r = el.getBoundingClientRect(), target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return target === el || el.contains(target); };
    return { width: viewport.width, height: viewport.height, layout: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, root: box(node), text: [...node.querySelectorAll('p,dt,dd,h3')].map(el => ({ ...box(el), text: el.textContent, font: parseFloat(getComputedStyle(el).fontSize), overflow: el.scrollWidth > el.clientWidth + 1, hit: hit(el) })), buttons: [...node.querySelectorAll('button')].map(el => ({ ...box(el), text: el.textContent, hit: hit(el) })) };
  }, page.viewportSize());
}
function visible(m) {
  assert(m.documentWidth <= m.width + 1, 'No horizontal page overflow');
  for (const value of [...m.text, ...m.buttons]) assert(value.left >= -1 && value.right <= m.width + 1 && value.top >= -1 && value.bottom <= m.height + 1, 'Forecast/help content is visible');
  for (const value of m.text) { assert(value.font >= 12, 'Forecast/help text at least 12px'); assert(!value.overflow, 'Forecast/help text is not clipped'); assert(value.hit, 'Forecast/help text is not covered'); }
  for (const value of m.buttons) { assert(value.width >= 44 && value.height >= 44, 'Forecast/help actions at least 44px'); assert(value.hit, 'Forecast/help actions receive hits'); }
}
async function natural(page, selector) {
  await page.locator(selector).evaluate(async node => { const list = node.getAnimations({ subtree: true }).filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)); await Promise.all(list.map(a => a.finished)); });
}
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const [index, profile] of profiles.entries()) {
    const row = { profile, observations: [], errors: [], responses: [], unexpectedRequests: [], emulatedCompletionWrites: [], complete: false }; report.cases.push(row); save();
    const engine = await import(pathToFileURL(bundlePath).href + `?oracle-${index}`);
    const state = clone(initial); let plan, preliminary;
    state.reputation = profile.boundary === 'positive' ? 100 : 35;
    const probeEngine = await import(pathToFileURL(bundlePath).href + `?preliminary-${index}`);
    for (const venueId of ['hall', 'town', 'ballroom']) for (const price of [600, 60, 220]) {
      const candidate = { venueId, ticketPrice: price / 1e6, bookings };
      const result = probeEngine.runShow(clone(state), candidate);
      const flat = Math.round(bookings.reduce((sum, b) => sum + probeEngine.purseFor(state.pool.find(f => f.id === b.aId), state.pool.find(f => f.id === b.bId), b.title), 0) * 1000) / 1000;
      const matches = profile.boundary === 'positive' ? result && result.result.profit > 0 && result.result.purses > flat : result && result.result.profit < -result.result.rent;
      if (!plan && matches) { plan = candidate; preliminary = result; }
    }
    assert(plan && preliminary, 'A legal source-generated card has an affordable loss-boundary fixture');
    state.money = profile.boundary === 'negative' ? preliminary.result.rent : profile.boundary === 'zero' ? -preliminary.result.profit : .120;
    const bytes = JSON.stringify({ st: state }), expected = engine.runShow(clone(state), plan); assert(expected);
    assert.equal(expected.state.money < 0, profile.boundary === 'negative'); assert.equal(expected.state.money === 0, profile.boundary === 'zero');
    row.fixture = { state, plan, bytes, expected, staging: 'Source-generated fighters and legal pair. Reputation35/100 and boundary cash are explicitly staged. Positive cases require actual revenue-share pay and profit.' }; save();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, reducedMotion: profile.reduced ? 'reduce' : 'no-preference' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      if (request.method() === 'GET' && fonts.has(url.href)) { const font = fonts.get(url.href); row.responses.push({ url: url.href, sha256: hash(font.body), bytes: font.body.length }); return route.fulfill({ status: 200, contentType: font.contentType, body: font.body }); }
      if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/live_scores') { row.responses.push({ url: url.href, handling: 'explicit local empty live board' }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
      if (request.method() === 'POST' && url.origin === serviceOrigin && url.pathname === '/rest/v1/game_completions') { row.emulatedCompletionWrites.push({ url: url.href, body: request.postDataJSON(), handling: 'CI-local emulation, never forwarded' }); return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' }); }
      if (request.method() === 'GET' && url.origin === serviceOrigin && url.pathname === '/rest/v1/game_completions' && url.searchParams.size === 4 && url.searchParams.get('select') === 'game,completed_on' && url.searchParams.get('order') === 'completed_on.desc' && url.searchParams.get('limit') === '500' && row.emulatedCompletionWrites.some(write => url.searchParams.get('player_name') === `eq.${write.body.player_name}`)) { row.responses.push({ url: url.href, handling: 'CI-local empty badge history after the emulated completion, never forwarded' }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
      row.unexpectedRequests.push({ url: url.href, method: request.method(), type: request.resourceType() }); return route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    await context.addInitScript(({ bytes, key, theme }) => {
      localStorage.setItem(key, bytes); localStorage.setItem('fight-promoter-mode-v1', 'boxing'); localStorage.setItem('dukb-theme', theme);
      localStorage.setItem('dukb-mma-promoter-v1', '{"keep":"MMA exact bytes"}'); localStorage.setItem('cash-unrelated', '{"keep":1086}');
      window.__cashWrites = []; window.__cashDraws = 0; const random = Math.random; Math.random = () => { window.__cashDraws++; return random(); };
      for (const method of ['setItem', 'removeItem', 'clear']) { const original = Storage.prototype[method]; Storage.prototype[method] = function(...args) { if (this === localStorage) window.__cashWrites.push({ method, args }); return original.apply(this, args); }; }
    }, { bytes, key: KEY, theme: profile.theme });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => row.errors.push(String(error)));
    const button = name => page.getByRole('button', { name, exact: true });
    const activate = async target => { if (profile.touch) await target.tap(); else { await target.focus(); await page.keyboard.press('Enter'); } };
    try {
      await page.goto(`${BASE}/fight-promoter`, { waitUntil: 'domcontentloaded' }); await button('Put the show on').waitFor();
      row.consentBefore = await snapshot(page); await activate(button('Essential only')); await button('Essential only').waitFor({ state: 'detached' }); row.consentAfter = await snapshot(page);
      assert.equal(row.consentAfter.storage['cookie-consent'], 'essential', 'Trusted essential-only choice precedes the protected game preview');
      await page.evaluate(async () => { await document.fonts.ready; for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 600]) { const list = await document.fonts.load(`${weight} 16px "${family}"`); if (!list.length || !list.every(f => f.status === 'loaded')) throw new Error('Required actual font unavailable'); } });
      const held = await snapshot(page);
      if (plan.venueId !== 'hall') await activate(page.getByRole('button').filter({ has: page.getByText(engine.venueById(plan.venueId).name, { exact: true }) }));
      for (const id of pair) { const fighter = state.pool.find(f => f.id === id); await activate(page.getByRole('button').filter({ has: page.getByText(fighter.name, { exact: true }) })); }
      const slider = page.getByRole('slider', { name: /^Ticket price/ }); await slider.focus(); await page.keyboard.press('Home');
      for (let seat = 60; seat < Math.round(plan.ticketPrice * 1e6); seat += 10) await page.keyboard.press('ArrowRight');
      assert.equal(Number(await slider.inputValue()), Math.round(plan.ticketPrice * 1e6), 'Trusted slider keys select the exact current plan price');
      await page.locator('[data-boxing-forecast]').scrollIntoViewIfNeeded();
      let value = await reading(page); outcome(value, expected); row.observations.push({ stage: 'forecast', value, geometry: await geometry(page, '[data-boxing-forecast]'), snapshot: await snapshot(page) }); visible(row.observations.at(-1).geometry);
      const preview = await snapshot(page); assert.equal(preview.raw, held.raw); assert.deepEqual(preview.writes, held.writes); assert.equal(preview.rng, held.rng);
      const rules = button('Show cash rules'); await activate(rules); await natural(page, '[role="dialog"]');
      const dialog = await geometry(page, '[role="dialog"]'); visible(dialog); row.observations.push({ stage: 'help', geometry: dialog, snapshot: await snapshot(page) });
      assert((await page.locator('[data-boxing-cash-example]').innerText()).includes(value['cash-after'].text));
      await page.screenshot({ path: path.join(OUT, `${profile.width}-help.png`) });
      await activate(button('Back to card')); await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Show cash rules');
      const closed = await snapshot(page); assert.deepEqual(closed, preview, 'Back preserves exact full save, storage, RNG, writes and scroll');
      await activate(rules); await natural(page, '[role="dialog"]'); await page.keyboard.press('Escape'); await page.locator('[role="dialog"]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Show cash rules'); assert.deepEqual(await snapshot(page), preview, 'Escape preserves exact preview snapshot');
      if (!report.controls.length) {
        const cell = page.locator('[data-boxing-purses]'), old = await cell.evaluate(el => ({ value: el.getAttribute('data-value'), text: el.firstChild.nodeValue }));
        await cell.evaluate(el => { el.setAttribute('data-value', '999'); el.firstChild.nodeValue = '999.000m'; });
        const changed = await reading(page); assert.notDeepEqual(changed, value); assert.throws(() => outcome(changed, expected), /Visible purses equals actual unchanged show/);
        await cell.evaluate((el, held) => { el.setAttribute('data-value', held.value); el.firstChild.nodeValue = held.text; }, old); outcome(await reading(page), expected);
        report.controls.push({ name: 'actual-pay-cell', before: old, changed, restored: await reading(page) });
        const oldStyle = await cell.getAttribute('style'); await cell.evaluate(el => { el.style.fontSize = '11px'; });
        const small = await geometry(page, '[data-boxing-forecast]'); assert(small.text.some(t => t.font === 11)); assert.throws(() => visible(small), /at least 12px/);
        await cell.evaluate((el, held) => held === null ? el.removeAttribute('style') : el.setAttribute('style', held), oldStyle); visible(await geometry(page, '[data-boxing-forecast]')); report.controls.push({ name: 'actual-cell-font', changed: small, restored: true });
        const triggerStyle = await rules.getAttribute('style'); await rules.evaluate(el => { el.style.width = '20px'; el.style.height = '20px'; });
        const narrow = await geometry(page, '[data-boxing-forecast]'); assert(narrow.buttons.some(t => t.width === 20)); assert.throws(() => visible(narrow), /at least 44px/);
        await rules.evaluate((el, held) => held === null ? el.removeAttribute('style') : el.setAttribute('style', held), triggerStyle); visible(await geometry(page, '[data-boxing-forecast]')); report.controls.push({ name: 'actual-help-target', changed: narrow, restored: true });
        const beforeCover = await geometry(page, '[data-boxing-forecast]');
        await page.locator('[data-boxing-forecast] dt').first().evaluate(el => { const r = el.getBoundingClientRect(), cover = document.createElement('div'); cover.dataset.cashCoverControl = ''; Object.assign(cover.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, background: 'red', zIndex: '2147483647' }); document.body.append(cover); });
        const covered = await geometry(page, '[data-boxing-forecast]'); assert.notDeepEqual(covered, beforeCover); assert.throws(() => visible(covered), /Forecast\/help text is not covered/);
        await page.locator('[data-cash-cover-control]').evaluate(el => el.remove()); const uncovered = await geometry(page, '[data-boxing-forecast]'); assert.deepEqual(uncovered, beforeCover); visible(uncovered); report.controls.push({ name: 'actual-text-occlusion', changed: covered, restored: uncovered });
      }
      await page.screenshot({ path: path.join(OUT, `${profile.width}-forecast.png`) });
      const beforeShow = await snapshot(page); await activate(button('Put the show on'));
      await page.waitForFunction(({ key, show }) => JSON.parse(localStorage.getItem(key)).st.show === show, { key: KEY, show: expected.state.show });
      const after = await snapshot(page); assert.deepEqual(JSON.parse(after.raw).st, expected.state, 'Trusted show commits the entire unchanged engine state including IDs and RNG');
      assert.equal(after.storage['dukb-mma-promoter-v1'], beforeShow.storage['dukb-mma-promoter-v1']); assert.equal(after.storage['cash-unrelated'], beforeShow.storage['cash-unrelated']);
      row.observations.push({ stage: 'actual-show', before: beforeShow, after }); await page.screenshot({ path: path.join(OUT, `${profile.width}-result.png`) });
      if (profile.boundary === 'negative') {
        const deadline = Date.now() + 5000; while (!row.emulatedCompletionWrites.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(row.emulatedCompletionWrites.length, 1); assert.equal(row.emulatedCompletionWrites[0].body.game, 'fight-promoter'); assert.equal(row.emulatedCompletionWrites[0].body.score, engine.promoterVerdict(expected.state).score);
      } else assert.equal(row.emulatedCompletionWrites.length, 0);
      assert.deepEqual(row.unexpectedRequests, []); assert.deepEqual(row.errors, []); row.complete = true; save();
    } catch (error) { row.error = { name: error.name, message: error.message, stack: error.stack }; await page.screenshot({ path: path.join(OUT, `${profile.width}-failure.png`) }).catch(() => {}); save(); }
    finally { await context.close(); }
  }
  assert(report.cases.every(row => row.complete), 'Every actual-route boxing forecast journey passes'); assert.equal(report.controls.length, 4); report.complete = true;
} finally {
  if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); report.sourceAfter = hashes();
  try { assert.deepEqual(report.sourceAfter, report.sourceBefore); } catch (error) { report.complete = false; report.sourceHoldError = { name: error.name, message: error.message }; save(); throw error; }
  save();
}
console.log(`Boxing forecast: ${report.cases.length} actual-route journeys passed.`);
