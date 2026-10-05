/* Built Home and Search, native picks with all external transport intercepted. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'game-picks-artifacts/native');
const KEY = 'dukb-game-picks-v1';
const WARNING = 'Picks last for this visit. This browser could not save them.';
const HELD = {
  'footle-daily-2026-10-05': '{"fixture":"unfinished Footle","guesses":["held"]}',
  'nba-connections-notes-v1:daily': '{"fixture":"held NBA notes"}',
  'dukb-local-completions': '[]',
  'dukb-play-diary-v1': '{"fixture":"held diary"}',
};
const profiles = [
  { width: 320, height: 780, input: 'touch', reduced: true, light: false },
  { width: 390, height: 844, input: 'touch', reduced: false, light: true },
  { width: 1280, height: 720, input: 'keyboard', reduced: false, light: false },
  { width: 1280, height: 720, input: 'mouse', reduced: true, light: true },
];
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build before native picks verification');
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '', browser;
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start in 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
const settle = async page => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(650);
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.animationName === 'homeTileIn' && animation.playState !== 'finished')
    .map(animation => animation.finished.catch(() => {}))));
};
const settleHome = async page => {
  // Home deliberately holds its saved scroll for 1200ms after returning.
  await page.waitForTimeout(1250);
  await settle(page);
};
async function geometry(locator) {
  return locator.evaluate(el => {
    const rect = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, top: box.top, bottom: box.bottom, left: box.left, right: box.right };
    };
    const button = rect(el), card = el.closest('[data-home-game-card], li');
    const point = { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    const hit = document.elementFromPoint(point.x, point.y), style = getComputedStyle(el);
    return {
      button, card: rect(card), shelf: rect(document.querySelector('[data-home-picks]')),
      viewport: { width: innerWidth, height: innerHeight }, scroll: { x: scrollX, y: scrollY },
      transform: style.transform, animation: style.animationName, opacity: style.opacity,
      running: card?.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length ?? 0,
      point, ownsHit: el.contains(hit),
      hit: hit ? { tag: hit.tagName, pick: hit.closest('[data-game-pick]')?.getAttribute('data-game-pick') ?? null, text: hit.textContent?.trim().slice(0, 80) } : null,
    };
  });
}
async function targetSize(locator, label) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 43 && box.height >= 43, label + ': separate control has a 44px target');
  return box;
}
async function activate(locator, input, scroll = true) {
  if (scroll) await locator.scrollIntoViewIfNeeded();
  const box = await targetSize(locator, 'native action');
  if (input === 'touch') await locator.tap();
  else if (input === 'mouse') await locator.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  else { await locator.focus(); await locator.press('Enter'); }
}
async function links(shelf, expected, label) {
  const actual = await shelf.locator('a[data-game-pick-link]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  assert.deepEqual(actual, expected, label + ': picks launch the exact selected games');
  return actual;
}
async function noJump(locator, before, label, evidence) {
  const after = await locator.boundingBox();
  const details = await geometry(locator);
  evidence?.push({ label, before, after, ...details });
  assert(after && Math.abs(after.y - before.y) <= 3, label + ': the clicked card stays in place');
  return { before, after };
}
async function layout(page, label) {
  const value = await page.evaluate(viewport => ({ viewport, innerWidth, document: document.documentElement.scrollWidth }), page.viewportSize().width);
  assert(value.document <= value.viewport + 2, label + ': document fits viewport'); return { label, ...value };
}

try {
  await ready; browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const { width, height, input, reduced, light } = profile, touch = input === 'touch';
    const id = `${width}-${input}-${light ? 'light' : 'dark'}${reduced ? '-reduced' : ''}`;
    const result = { id, ...profile, screenshots: [], layouts: [], geometry: [], controls: [], pageErrors: [], consoleErrors: [], assetFailures: [], intercepted: [], scoreWrites: [] };
    report.cases.push(result);
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: light ? 'light' : 'dark' },
        { name: 'dukb-guest-handle', value: 'FixtureGoal-42' }, ...Object.entries(HELD).map(([name, value]) => ({ name, value })),
      ] }] } });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === BASE) return route.continue();
      result.intercepted.push({ method: request.method(), path: url.pathname });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && /\/(game_completions|user_game_scores|daily_completions|user_best_scores|user_scores|record_auth_completion)$/.test(url.pathname)) result.scoreWrites.push({ method: request.method(), path: url.pathname });
      const type = request.resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : type === 'script' ? 'application/javascript' : 'application/json', body: ['stylesheet', 'script'].includes(type) ? '' : '[]' });
    });
    await context.addInitScript(() => {
      const OriginalDate = Date, now = new OriginalDate('2026-10-05T16:00:00Z').getTime();
      window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) result.assetFailures.push(request.url() + ': ' + request.failure()?.errorText); });
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) result.assetFailures.push(response.url() + ': ' + response.status()); });
    const shelf = page.locator('[data-home-picks]');
    const stored = () => page.evaluate(key => localStorage.getItem(key), KEY);
    const held = () => page.evaluate(keys => keys.map(key => [key, localStorage.getItem(key)]), Object.keys(HELD));
    const shoot = async label => { await settle(page); const file = `${id}-${label}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file); result.layouts.push(await layout(page, label)); };
    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      const homePin = page.locator('button[data-game-pick="/footle"]').last();
      await homePin.waitFor(); await homePin.scrollIntoViewIfNeeded(); await settle(page);
      assert((await page.evaluate(() => scrollY)) > height, 'First Home pin is exercised deep in the catalog');
      const before = await held(), beforeUrl = page.url(), box = await homePin.boundingBox();
      const firstGeometry = await geometry(homePin);
      result.geometry.push({ label: 'first-deep-pin-before', ...firstGeometry });
      assert.equal(await homePin.getAttribute('aria-label'), 'Pin Footle');
      assert.equal(await homePin.evaluate(el => el.closest('a') !== null), false, 'Home pin is outside the launch link');
      await activate(homePin, input, false); await settle(page);
      assert.equal(page.url(), beforeUrl, 'Pinning does not navigate');
      assert.equal(await homePin.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(JSON.parse(await stored()), ['/footle']);
      await noJump(homePin, box, 'first-deep-pin', result.geometry);
      assert(Math.abs((await geometry(homePin)).card.top - firstGeometry.card.top) <= 3, 'First pin keeps the catalog card itself in place');
      assert.deepEqual(await held(), before, 'First pin preserves game saves and score bytes');
      await shoot('first-deep-pin');

      const beforeRemoval = await homePin.boundingBox();
      result.geometry.push({ label: 'last-deep-unpin-before', ...await geometry(homePin) });
      await activate(homePin, input, false); await settle(page);
      await noJump(homePin, beforeRemoval, 'last-deep-unpin', result.geometry);
      assert.deepEqual(JSON.parse(await stored()), []);
      assert.equal(await shelf.count(), 0, 'Removing the last catalog pick removes its shelf');
      const beforeRepin = await homePin.boundingBox();
      await activate(homePin, input, false); await settle(page);
      await noJump(homePin, beforeRepin, 'deep-repin', result.geometry);
      assert.deepEqual(JSON.parse(await stored()), ['/footle']);
      assert.equal(page.url(), beforeUrl); assert.deepEqual(await held(), before);

      if (input === 'mouse') {
        const position = await page.evaluate(() => ({ x: scrollX, y: scrollY })), original = await homePin.boundingBox();
        try {
          await page.evaluate(() => scrollBy({ top: 40, behavior: 'instant' }));
          assert(Math.abs((await homePin.boundingBox()).y - original.y) >= 39, 'Jump control changes the clicked card position');
          await assert.rejects(() => noJump(homePin, original, 'jump-control'), error => error.name === 'AssertionError' && error.message === 'jump-control: the clicked card stays in place');
        } finally { await page.evaluate(value => scrollTo({ left: value.x, top: value.y, behavior: 'instant' }), position); }
        await noJump(homePin, original, 'restored-jump-control');
        result.controls.push({ kind: 'clicked card position guard', changed: true, rejected: true, restored: true });
      }

      await page.goto(BASE + '/search?q=NHL%20Connections', { waitUntil: 'domcontentloaded' });
      const searchPin = page.getByRole('button', { name: 'Pin NHL Connections', exact: true });
      await searchPin.waitFor(); const searchUrl = page.url();
      assert.equal(await searchPin.evaluate(el => el.closest('a') !== null), false, 'Search pin is outside the launch link');
      await activate(searchPin, input); await settle(page);
      assert.equal(page.url(), searchUrl, 'Search pin keeps its query and address');
      assert.deepEqual(JSON.parse(await stored()), ['/footle', '/nhl-connections']);
      assert.deepEqual(await held(), before, 'Search pin preserves game saves and score bytes');
      await shoot('search-pinned');
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await shelf.waitFor();
      await page.reload({ waitUntil: 'domcontentloaded' }); await shelf.waitFor(); await settleHome(page);
      assert.equal(await shelf.getAttribute('data-no-prerender'), '');
      await links(shelf, ['/footle', '/nhl-connections'], 'reloaded');
      if (width === 320) {
        const style = await shelf.getAttribute('style'), saved = await stored();
        try {
          await shelf.evaluate(el => { el.style.width = '640px'; });
          assert((await shelf.boundingBox()).width >= 639, 'Overflow control changes the actual shelf width');
          assert((await page.evaluate(() => document.documentElement.scrollWidth)) > width + 2, 'Overflow control expands the document beyond the configured viewport');
          await assert.rejects(() => layout(page, 'wide-shelf-control'), error => error.name === 'AssertionError' && error.message === 'wide-shelf-control: document fits viewport');
        } finally { await shelf.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style); }
        await layout(page, 'restored-shelf'); assert.equal(await stored(), saved);
        result.controls.push({ kind: 'configured viewport overflow guard', changed: true, rejected: true, restored: true });
      }
      for (const [gamePath, name] of [['/footle', 'Footle'], ['/nhl-connections', 'NHL Connections']]) {
        const link = shelf.locator(`a[data-game-pick-link="${gamePath}"]`), control = shelf.locator(`button[data-game-pick="${gamePath}"]`);
        await control.evaluate(el => el.closest('li').scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        await settle(page);
        const controlGeometry = await geometry(control);
        result.geometry.push({ name, label: 'shelf-target', ...controlGeometry });
        await targetSize(link, name + ' launch'); await targetSize(control, name + ' pin');
        assert.equal(await control.evaluate(el => el.closest('a') !== null), false);
        const text = link.getByText(name, { exact: true });
        const bounds = await text.evaluate(el => { const box = el.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height, client: el.clientWidth, scroll: el.scrollWidth }; });
        result.geometry.push({ name, label: 'shelf-name', ...bounds });
        assert(bounds.width > 0 && bounds.height > 0 && bounds.top >= -1 && bounds.bottom <= height + 1 && bounds.left >= -1 && bounds.right <= width + 1 && bounds.scroll <= bounds.client + 1, name + ': full shelf name fits when brought into view');
        assert(controlGeometry.button.top >= 0 && controlGeometry.button.bottom <= height && controlGeometry.button.left >= 0 && controlGeometry.button.right <= width, name + ': pin button is fully in view');
        assert(controlGeometry.ownsHit, name + ': pin button owns its hit target');
        await shoot('shelf-' + name.replaceAll(' ', '-'));
      }
      if (width === 390) {
        const control = shelf.locator('button[data-game-pick="/nhl-connections"]'), style = await control.getAttribute('style');
        try {
          await control.evaluate(el => { el.style.width = '22px'; el.style.height = '22px'; });
          const small = await control.boundingBox(); assert(small.width <= 23 && small.height <= 23, 'Target control changes actual button dimensions');
          await assert.rejects(() => targetSize(control, 'small-pin-control'), error => error.name === 'AssertionError' && error.message === 'small-pin-control: separate control has a 44px target');
        } finally { await control.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), style); }
        await targetSize(control, 'restored-pin');
        result.controls.push({ kind: 'pin target size guard', changed: true, rejected: true, restored: true });
        const link = shelf.locator('a[data-game-pick-link="/nhl-connections"]'), href = await link.getAttribute('href');
        try {
          await link.evaluate(el => el.setAttribute('href', '/wrong-fixture-target'));
          assert.equal(await link.getAttribute('href'), '/wrong-fixture-target', 'Link control changes the actual launch destination');
          await assert.rejects(() => links(shelf, ['/footle', '/nhl-connections'], 'wrong-link-control'), error => error.name === 'AssertionError' && error.message.startsWith('wrong-link-control: picks launch the exact selected games'));
        } finally { await link.evaluate((el, value) => el.setAttribute('href', value), href); }
        await links(shelf, ['/footle', '/nhl-connections'], 'restored-link');
        result.controls.push({ kind: 'exact launch destination guard', changed: true, rejected: true, restored: true });
      }

      const peer = await context.newPage(); peer.on('pageerror', error => result.pageErrors.push(String(error)));
      try {
        await peer.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        const peerUnpin = peer.locator('[data-home-picks] button[data-game-pick="/footle"]'); await peerUnpin.waitFor();
        await settleHome(peer);
        await activate(peerUnpin, input);
        await page.waitForFunction(() => !document.querySelector('[data-home-picks] a[data-game-pick-link="/footle"]'));
        await links(shelf, ['/nhl-connections'], 'other-tab-removal');
        assert.equal(await page.locator('button[data-game-pick="/footle"]').last().getAttribute('aria-label'), 'Pin Footle');
      } finally { await peer.close(); }
      await page.reload({ waitUntil: 'domcontentloaded' }); await shelf.waitFor();
      await settleHome(page);
      await links(shelf, ['/nhl-connections'], 'removal-reload');
      await activate(shelf.locator('button[data-game-pick="/nhl-connections"]'), input); await settle(page);
      assert.deepEqual(JSON.parse(await stored()), []); assert.equal(await shelf.count(), 0);
      if (input === 'keyboard') assert(await page.evaluate(() => document.activeElement?.isConnected && document.activeElement.tagName === 'A' && document.activeElement.getAttribute('href')?.startsWith('/')), 'Removing the last shelf pick retains keyboard focus on an existing game link');
      assert.deepEqual(await held(), before); assert.deepEqual(result.scoreWrites, [], 'Picks never submit a game score');

      const hostile = JSON.stringify(['/footle', '/footle', '/not-a-game', 'javascript:alert(1)', 'https://fixture.invalid', '/grade-transfer', null]);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: hostile });
      await page.reload({ waitUntil: 'domcontentloaded' }); await shelf.waitFor();
      await settleHome(page);
      await links(shelf, ['/footle'], 'hostile-paths'); assert.equal(await stored(), hostile, 'Loading sanitizes the display without rewriting hostile bytes');
      await page.evaluate(key => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(name, value) { if (name === key) throw new Error('Fixture quota'); return original.call(this, name, value); };
      }, KEY);
      await activate(shelf.locator('button[data-game-pick="/footle"]'), input); await settle(page);
      assert.equal(await shelf.count(), 0, 'A failed save still updates the live picks');
      assert.equal(await page.locator('[data-game-picks-warning]').innerText(), WARNING);
      assert.equal(await stored(), hostile, 'The warning does not claim a successful save');
      await shoot('storage-warning');
      assert.deepEqual(await held(), before); assert.deepEqual(result.scoreWrites, []);
      assert.deepEqual(result.pageErrors, [], 'No native page errors'); assert.deepEqual(result.consoleErrors, [], 'No native console errors'); assert.deepEqual(result.assetFailures, [], 'Local assets load');
      result.passed = true;
    } catch (error) {
      result.passed = false; result.error = String(error?.stack || error);
      result.failureViewport = await page.evaluate(() => ({ scrollX, scrollY, innerWidth, innerHeight, rememberedHomeY: sessionStorage.getItem('home-scroll-y') })).catch(() => null);
      await page.screenshot({ path: path.join(OUT, id + '-failure.png'), animations: 'disabled' }).catch(() => {});
    } finally { saveReport(); await context.close(); }
  }
  assert.equal(report.cases.length, profiles.length); assert(report.cases.every(value => value.passed), 'Every native picks profile passes; inspect report.json');
  assert.equal(report.cases.flatMap(value => value.controls).length, 4);
  console.log('Game picks native: four Home/Search profiles, exact launch links, full reload and cross-tab removal, hostile storage, honest failed saves, deep-scroll pinning, protected game bytes and four effective controls passed.');
} finally { saveReport(); if (browser) await browser.close(); server.kill(); fs.writeFileSync(path.join(OUT, 'server.log'), serverLog); }
