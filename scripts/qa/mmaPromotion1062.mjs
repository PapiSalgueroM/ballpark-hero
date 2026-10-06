/* Built MMA cards and preserved boxing saves through actual player controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.MMA_PROMOTION_NATIVE_ARTIFACTS || path.join(ROOT, 'mma-promotion-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native promotion walk');
const bundle = path.join(OUT, 'engines.cjs');
await build({ stdin: { contents: "export * as mma from './src/lib/mmaPromotion.ts'; export * as boxing from './src/lib/fightPromoter.ts';", resolveDir: ROOT, loader: 'ts' }, outfile: bundle,
  bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const { mma, boxing } = createRequire(import.meta.url)(bundle);
const MMA_KEY = 'dukb-mma-promoter-v1', BOXING_KEY = 'fight-promoter-save-v1';
const fontLinks = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1, 'Native fonts bind the actual template stylesheet');
const profiles = [
  { width: 320, height: 780, input: 'touch', theme: 'dark', reduced: true },
  { width: 390, height: 844, input: 'touch', theme: 'light', reduced: false },
  { width: 1280, height: 720, input: 'mouse', theme: 'dark', reduced: false },
  { width: 1280, height: 720, input: 'keyboard', theme: 'light', reduced: true },
];
const report = { started: new Date().toISOString(), cases: [], controls: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => error ? reject(error) : resolve(chosen)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; }); server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start within 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => { let stable = 0, frames = 0, old = scrollY;
    function frame() { stable = Math.abs(scrollY - old) < .1 ? stable + 1 : 0; old = scrollY;
      if (++frames >= 100 || stable >= 10) resolve(); else requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }));
}
async function fonts(page) {
  const faces = await page.evaluate(async () => { await document.fonts.ready; const rows = [];
    for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
      const loaded = await document.fonts.load(`${weight} 16px "${family}"`, 'MMA promotion');
      rows.push({ family, weight, count: loaded.length, loaded: loaded.length > 0 && loaded.every(face => face.status === 'loaded') });
    } return rows;
  });
  assert(faces.every(face => face.loaded), 'Actual site fonts load before native geometry'); return faces;
}
const visibleRect = (r, viewport) => r && r.top >= -2 && r.bottom <= viewport.height + 2 && r.left >= -2 && r.right <= viewport.width + 2;
async function measure(page) {
  return page.evaluate(() => {
    const area = document.querySelector('[role="dialog"]') || document.querySelector('[data-mma-screen]');
    const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, text: el.textContent, tag: el.tagName }; };
    return { scrollY, innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, screen: area?.getAttribute('data-mma-screen') || 'help',
      heading: area?.querySelector('h2,h3') ? rect(area.querySelector('h2,h3')) : null,
      controls: [...(area?.querySelectorAll('button,input,select') || [])].filter(el => !el.disabled && el.getBoundingClientRect().height > 0).map(el => rect(el.matches('input[type="checkbox"]') ? el.closest('label') || el : el)),
      focus: document.activeElement?.textContent };
  });
}
function geometry(m, viewport, stage) {
  assert(m.scrollWidth <= viewport.width + 2, `${stage}: horizontal overflow ${m.scrollWidth}/${viewport.width}`);
  assert(visibleRect(m.heading, viewport), `${stage}: screen heading clipped ${JSON.stringify(m.heading)}`);
  for (const r of m.controls) {
    assert(r.width >= 44 && r.height >= 44, `${stage}: action below 44px ${JSON.stringify(r)}`);
    assert(visibleRect(r, viewport), `${stage}: action clipped ${JSON.stringify(r)}`);
  }
}
async function keyboardFocus(locator) {
  const focus = await locator.evaluate(el => { const style = getComputedStyle(el); return { active: el === document.activeElement, visible: el.matches(':focus-visible'),
    outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, shadow: style.boxShadow !== 'none' }; });
  assert(focus.active && focus.visible && (focus.outline || focus.shadow), `Keyboard focus is visibly marked: ${JSON.stringify(focus)}`);
  return focus;
}
async function activate(locator, profile) {
  await locator.waitFor({ state: 'visible' }); const box = await locator.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, `Actual action below 44px: ${JSON.stringify(box)}`);
  assert(box.x >= -2 && box.x + box.width <= profile.width + 2 && box.y >= -2 && box.y + box.height <= profile.height + 2, 'Actual action is inside the viewport before input');
  if (profile.input === 'touch') await locator.tap();
  else if (profile.input === 'mouse') await locator.click();
  else { await locator.focus(); await keyboardFocus(locator); await locator.press('Enter'); }
}
async function select(locator, value, profile) {
  if (profile.input !== 'keyboard') return locator.selectOption(value);
  await locator.focus(); const indices = await locator.evaluate((el, v) => ({ old: el.selectedIndex, target: [...el.options].findIndex(option => option.value === v) }), value);
  assert(indices.target >= 0, 'Keyboard choice exists'); const distance = indices.target - indices.old;
  for (let i = 0; i < Math.abs(distance); i++) await locator.press(distance > 0 ? 'ArrowDown' : 'ArrowUp');
  assert.equal(await locator.inputValue(), value, 'Keyboard changes the actual native choice');
}
function boxingFixture() {
  for (let seed = 0; seed < 30; seed++) { const state = boxing.newPromoter('Old saved boxing', `native-boxing-${seed}`);
    for (const a of state.pool) for (const b of state.pool) if (boxing.legalMatch(a, b)) return { state, a, b }; }
  throw new Error('The bounded boxing fixtures have no legal bout');
}
const boxingOld = boxingFixture(), boxingBytes = JSON.stringify({ st: boxingOld.state });
const savedState = raw => { const saved = JSON.parse(raw); return saved.state; };
try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const id = `${profile.width}-${profile.input}-${profile.theme}${profile.reduced ? '-reduced' : ''}`;
    const row = { id, steps: [], screenshots: [], pageErrors: [], consoleErrors: [], localFailures: [], fontFailures: [], outboundWrites: [] };
    report.cases.push(row); const assets = new Set();
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.input === 'touch', isMobile: profile.input === 'touch',
      reducedMotion: profile.reduced ? 'reduce' : 'no-preference', colorScheme: profile.theme, serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: BOXING_KEY, value: boxingBytes }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: profile.theme },
        { name: 'rules-gate-seen:/fight-promoter', value: '1' }, { name: 'mma-unrelated-save', value: '{"keep":"exact bytes"}' },
      ] }] } });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()); if (url.origin === BASE) return route.continue();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.outboundWrites.push({ method: request.method(), path: url.pathname });
      const stylesheet = request.method() === 'GET' && fontLinks.includes(url.href);
      if (stylesheet || (request.method() === 'GET' && request.resourceType() === 'font' && assets.has(url.href))) {
        try { const response = await route.fetch({ maxRedirects: 0 }); assert(response.status() >= 200 && response.status() < 300, 'Actual font request succeeds');
          if (stylesheet) { const css = await response.text(); const urls = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(['"]?)(https:\/\/[^)'"\s]+)\1\s*\)/g)].map(match => new URL(match[2]));
            assert(urls.length > 0, 'Actual stylesheet declares fonts'); for (const asset of urls) { assert.equal(asset.origin, 'https://fonts.gstatic.com'); assets.add(asset.href); }
            return route.fulfill({ response, body: css }); } return route.fulfill({ response });
        } catch (error) { row.fontFailures.push(String(error)); return route.abort('blockedbyclient'); }
      }
      if (request.resourceType() === 'font') { row.fontFailures.push(`Undeclared font ${url.href}`); return route.abort('blockedbyclient'); }
      return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
    });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.localFailures.push(`${request.url()}: ${request.failure()?.errorText}`); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.localFailures.push(`${response.status()} ${response.url()}`); });
    const button = name => page.getByRole('button', { name, exact: true });
    const inspect = async stage => { const loaded = await fonts(page); await settle(page); const m = await measure(page); geometry(m, profile, stage);
      const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.screenshots.push(file); row.steps.push({ stage, ...m, fonts: loaded }); return m; };
    const readSave = () => page.evaluate(key => localStorage.getItem(key), MMA_KEY);
    try {
      await page.goto(`${BASE}/fight-promoter`, { waitUntil: 'domcontentloaded' }); await button('Change sport').waitFor(); await activate(button('Change sport'), profile); await activate(button('MMA'), profile);
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('light')), profile.theme === 'light', 'The selected site theme is active');
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), profile.reduced, 'The requested motion preference is active');
      await inspect('setup'); assert.match(await page.locator('[data-mma-screen="setup"]').innerText(), /[Ee]xample/);
      await page.getByLabel('Promotion name', { exact: true }).fill('Native MMA'); await activate(button('Start promotion'), profile); const hub = await inspect('dashboard');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), BOXING_KEY), boxingBytes);
      const original = savedState(await readSave());
      await activate(button('MMA rules'), profile); await inspect('help');
      await page.keyboard.press('Escape'); await button('Book card').waitFor();
      for (const name of ['Rankings', 'Fighters']) {
        const opener = button(name); await activate(opener, profile); await inspect(name === 'Fighters' ? 'contracts' : 'rankings');
        if (name === 'Fighters') {
          await activate(page.locator('button[data-mma-fighter]').first(), profile); await inspect('contract-detail');
          assert.match(await page.locator('[data-mma-fighter]').innerText(), /3 contract fights left/);
          await activate(button('Back to fighters'), profile);
        }
        await activate(button('Back to dashboard'), profile); await settle(page);
        assert.equal(await opener.evaluate(el => el === document.activeElement), true, `${name} return restores its opener`);
        assert(Math.abs((await measure(page)).scrollY - hub.scrollY) <= 2, 'Panel return never automatically scrolls');
      }
      await activate(button('Book card'), profile); await inspect('empty-card');
      await activate(button('Choose fighters'), profile); await inspect('matchup');
      await activate(button('Light'), profile);
      const fighters = original.fighters.filter(f => f.division === 'light' && f.contract > 0 && f.recoveryUntil <= original.month);
      assert(fighters.length >= 2, 'Fresh world has two available lightweights'); const [a, b] = fighters;
      await select(page.getByLabel('Blue corner', { exact: true }), a.id, profile); await select(page.getByLabel('Red corner', { exact: true }), b.id, profile);
      await activate(button('Add bout'), profile); await inspect('planned-card'); assert.equal(await page.locator('[data-mma-booking]').count(), 1);
      await activate(page.getByRole('button', { name: /Remove bout/ }), profile); assert.equal(await page.locator('[data-mma-booking]').count(), 0);
      await activate(button('Choose fighters'), profile); await select(page.getByLabel('Blue corner', { exact: true }), a.id, profile); await select(page.getByLabel('Red corner', { exact: true }), b.id, profile);
      const title = page.getByLabel('Title fight', { exact: true });
      if (profile.input === 'keyboard') { await title.focus(); await title.press('Space'); } else await activate(title.locator('..'), profile);
      assert.equal(await title.isChecked(), true, 'Actual title toggle books a championship bout');
      await activate(button('Add bout'), profile); await inspect('card');
      const plan = { venueId: await page.getByLabel('Venue', { exact: true }).inputValue(), ticketPrice: Number(await page.getByLabel('Ticket price', { exact: true }).inputValue()), bookings: [{ aId: a.id, bId: b.id, title: true }] };
      const expected = mma.runMmaEvent(original, plan); assert(expected, 'The user-built card is legal in the actual engine');
      await activate(button('Run event'), profile); await inspect('early-receipt');
      for (const key of ['gate', 'purses', 'rent', 'profit']) assert.equal(Number(await page.locator(`[data-mma-receipt-value="${key}"]`).getAttribute('data-value')), expected.result[key], `Visible ${key} equals actual event dollars`);
      assert.deepEqual(await page.locator('[data-mma-bout-winner]').evaluateAll(rows => rows.map(el => el.getAttribute('data-mma-bout-winner'))), expected.result.bouts.map(bout => bout.winnerId));
      const afterEvent = await readSave(); assert.deepEqual(savedState(afterEvent), expected.state, 'The UI applies the event result exactly once');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-mma-receipt]').waitFor(); await inspect('restored-receipt');
      assert.equal(await readSave(), afterEvent, 'Receipt reload does not pay or record again');
      await activate(button('Back to dashboard'), profile); await activate(button('Event history'), profile); await inspect('history');
      await activate(page.getByRole('button', { name: /View event 1/ }), profile); await inspect('history-receipt'); assert.equal(await readSave(), afterEvent, 'Opening an old receipt does not alter the world');
      await activate(button('Back to dashboard'), profile);
      await activate(button('Rankings'), profile); await inspect('championship-rankings');
      assert.match(await page.locator('[data-mma-screen="rankings"]').innerText(), new RegExp(`Champion: ${original.fighters.find(f => f.id === expected.result.bouts[0].winnerId).name}`));
      await activate(button('Back to dashboard'), profile);
      if (profile.width === 390) {
        await activate(button('Fighters'), profile); await activate(button('Free agents'), profile);
        for (let signed = 0; signed < 4; signed++) {
          await activate(page.locator('button[data-mma-fighter]').first(), profile);
          await activate(page.getByRole('button', { name: /^Sign 3 fights/ }), profile);
          await activate(button('Back to fighters'), profile);
        }
        await activate(button('Signed fighters'), profile); await inspect('eight-signed-first-page');
        const firstIds = await page.locator('button[data-mma-fighter]').evaluateAll(elements => elements.map(el => el.getAttribute('data-mma-fighter'))); assert.equal(firstIds.length, 4);
        await activate(button('Next fighters'), profile); await inspect('eight-signed-second-page');
        const secondIds = await page.locator('button[data-mma-fighter]').evaluateAll(elements => elements.map(el => el.getAttribute('data-mma-fighter')));
        assert.equal(secondIds.length, 4); assert.equal(new Set([...firstIds, ...secondIds]).size, 8, 'Roster pagination exposes all eight distinct signed fighters');
        await activate(button('Back to dashboard'), profile); await activate(button('Rankings'), profile); await inspect('eight-ranked-first-page');
        const earned = savedState(await readSave()), ranks = mma.mmaRankings(earned, 'light'); assert.equal(ranks.length, 8);
        const shownNames = async () => page.locator('[data-mma-screen="rankings"] ol li').allTextContents();
        assert((await shownNames()).every((text, index) => text.includes(ranks[index].name)), 'The first ranking page keeps the actual first four positions');
        await activate(button('Next fighters'), profile); await inspect('eight-ranked-second-page');
        assert((await shownNames()).every((text, index) => text.includes(ranks[index + 4].name)), 'The second ranking page keeps positions five through eight');
        await activate(button('Back to dashboard'), profile);
        for (let rest = 0; rest < 2; rest++) await activate(page.getByRole('button', { name: /^Rest a month/ }), profile);
        const fullState = savedState(await readSave()); assert(mma.loadMmaPromotion(fullState), 'Signing and recovery produce a real reloadable world');
        const available = fullState.fighters.filter(f => f.division === 'light' && f.contract > 0 && f.recoveryUntil <= fullState.month); assert.equal(available.length, 8);
        await activate(button('Book card'), profile); const bookings = [];
        for (let index = 0; index < 3; index++) {
          const aId = available[index * 2].id, bId = available[index * 2 + 1].id; await activate(button('Choose fighters'), profile);
          await select(page.getByLabel('Blue corner', { exact: true }), aId, profile); await select(page.getByLabel('Red corner', { exact: true }), bId, profile);
          await activate(button('Add bout'), profile); bookings.push({ aId, bId, title: false });
        }
        await inspect('full-three-bout-card'); assert.equal(await page.locator('[data-mma-booking]').count(), 3);
        const fullPlan = { venueId: await page.getByLabel('Venue', { exact: true }).inputValue(), ticketPrice: Number(await page.getByLabel('Ticket price', { exact: true }).inputValue()), bookings };
        const fullEvent = mma.runMmaEvent(fullState, fullPlan); assert(fullEvent, 'The actual complete card is valid');
        await activate(button('Run event'), profile); await inspect('three-bout-receipt');
        assert.equal(await page.locator('[data-mma-bout-winner]').count(), 3); assert.deepEqual(savedState(await readSave()), fullEvent.state, 'A complete card applies every actual result once');
        for (const key of ['gate', 'purses', 'rent', 'profit']) assert.equal(Number(await page.locator(`[data-mma-receipt-value="${key}"]`).getAttribute('data-value')), fullEvent.result[key]);
        await activate(button('Back to dashboard'), profile); row.fullCard = { signed: 8, booked: 3, event: fullEvent.result.event };
      }
      if (report.controls.length === 0) {
        const target = button('Book card'), held = await target.getAttribute('style'); await target.evaluate(el => { el.style.minHeight = '0'; el.style.height = '20px'; el.style.padding = '0'; });
        const small = await measure(page); assert(small.controls.some(r => r.height === 20), 'Size control changes an actual action'); assert.throws(() => geometry(small, profile, 'size-control'), /below 44px/);
        await target.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), held); geometry(await measure(page), profile, 'size-restored'); report.controls.push('action-size');
        await target.evaluate(el => { el.style.position = 'fixed'; el.style.top = '-90px'; }); const clipped = await measure(page);
        assert(clipped.controls.some(r => r.top === -90), 'Clipping control changes an actual action'); assert.throws(() => geometry(clipped, profile, 'clipping-control'), /action clipped/);
        await target.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), held); geometry(await measure(page), profile, 'clipping-restored'); report.controls.push('action-clipping');
        const bodyStyle = await page.locator('body').getAttribute('style'); await page.locator('body').evaluate((el, width) => { el.style.minWidth = `${width + 80}px`; }, profile.width);
        const wide = await measure(page); assert(wide.scrollWidth > profile.width + 60, 'Overflow control changes actual layout'); assert.throws(() => geometry(wide, profile, 'overflow-control'), /horizontal overflow/);
        await page.locator('body').evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), bodyStyle); geometry(await measure(page), profile, 'overflow-restored'); report.controls.push('horizontal-overflow');
        await page.keyboard.press('Tab'); await target.focus(); const shown = await keyboardFocus(target);
        await target.evaluate(el => { el.style.outline = 'none'; el.style.boxShadow = 'none'; });
        const hidden = await target.evaluate(el => { const style = getComputedStyle(el); return { active: el === document.activeElement, visible: el.matches(':focus-visible'), outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, shadow: style.boxShadow !== 'none' }; });
        assert.notDeepEqual(hidden, shown, 'Focus control changes the actual focus affordance');
        await assert.rejects(() => keyboardFocus(target), /Keyboard focus is visibly marked/);
        await target.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), held); await keyboardFocus(target); report.controls.push('visible-keyboard-focus');
      }
      const heldMma = await readSave();
      await activate(button('Change sport'), profile); await activate(button('Boxing'), profile); await page.getByText('Old saved boxing', { exact: true }).waitFor();
      assert.equal(await page.evaluate(key => localStorage.getItem(key), BOXING_KEY), boxingBytes, 'Switching modes restores the old boxing bytes');
      const aButton = page.getByRole('button').filter({ has: page.getByText(boxingOld.a.name, { exact: true }) }); await aButton.click();
      const bButton = page.getByRole('button').filter({ has: page.getByText(boxingOld.b.name, { exact: true }) }); await bButton.click();
      const expectedBox = boxing.runShow(boxingOld.state, { venueId: 'hall', ticketPrice: .00022, bookings: [{ aId: boxingOld.a.id, bId: boxingOld.b.id, rounds: 8, title: false }] });
      assert(expectedBox, 'The original boxing fixture books a real legal bout'); await button('Put the show on').click();
      await button('Plan the next show').waitFor(); const oldSaved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), BOXING_KEY));
      assert.deepEqual(oldSaved.st, expectedBox.state, 'The old boxing save plays through the unchanged engine');
      assert.equal(await readSave(), heldMma, 'Playing boxing leaves the MMA world unchanged');
      assert.equal(await page.evaluate(() => localStorage.getItem('mma-unrelated-save')), '{"keep":"exact bytes"}');
      assert.deepEqual(row.pageErrors, []); assert.deepEqual(row.consoleErrors, []); assert.deepEqual(row.localFailures, []); assert.deepEqual(row.fontFailures, []);
      assert.deepEqual(row.outboundWrites, [], 'One event is not a finished promotion and sends no completion'); row.passed = true;
    } catch (error) { row.error = String(error?.stack || error); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`), animations: 'disabled' }).catch(() => {}); }
    finally { await context.close(); saveReport(); }
  }
  assert.equal(report.cases.length, profiles.length); assert.equal(report.controls.length, 4);
  assert(report.cases.every(row => row.passed), 'Every native profile must pass; see report.json');
  console.log(`mmaPromotion1062: ${report.cases.length} native MMA and saved-boxing journeys and four effective geometry controls passed.`);
} finally {
  if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); saveReport();
}
