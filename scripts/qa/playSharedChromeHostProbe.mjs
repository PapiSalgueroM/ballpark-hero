import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pw from '../lib/playwrightLoader.mjs';
import { seed, checkFonts, sha } from './siteMenuNavigationSupport.mjs';

function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
async function bounded(promise, label) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), 15000); })]); }
  finally { clearTimeout(timer); }
}
function collect() {
  const visible = node => node.isConnected && node.getClientRects().length > 0
    && !['hidden', 'collapse'].includes(getComputedStyle(node).visibility) && getComputedStyle(node).display !== 'none';
  const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const buttons = [...document.querySelectorAll('button[aria-label="Open site menu"]')];
  const regions = [...document.querySelectorAll('[role="region"][aria-label="Site menu loading"]')];
  return { path: location.pathname, y: scrollY, body: { inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow },
    viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    triggers: buttons.map(node => ({ host: !!node.closest('[data-site-menu-host]'), fallback: !!node.closest('.dukb-menu-fallback'),
      visible: visible(node), expanded: node.getAttribute('aria-expanded'), focused: node === document.activeElement, rect: rect(node) })),
    pending: regions.map(node => ({ visible: visible(node), inFallback: !!node.closest('.dukb-menu-fallback'), rect: rect(node), text: node.textContent })),
    openSheets: [...document.querySelectorAll('[role="dialog"][data-state="open"]')].map(node => ({ id: node.id,
      ariaHidden: node.getAttribute('aria-hidden'), visible: visible(node), rect: rect(node) })),
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'),
      faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    trusted: window.__siteMenuTrusted || [] };
}
function ownedControl(id, actual, mutate, judge, marker) {
  const before = JSON.stringify(actual), changed = structuredClone(actual);
  mutate(changed);
  const after = JSON.stringify(changed);
  assert.notEqual(sha(after), sha(before), 'CHROME_CONTROL_ACTUAL_RECORD_CHANGED_' + id);
  let caught = null;
  try { judge(changed); } catch (error) { caught = error; }
  assert(caught instanceof assert.AssertionError && caught.message.includes(marker), 'CHROME_CONTROL_OWNED_ASSERTION_' + id);
  return { id, baselineSha256: sha(before), changedSha256: sha(after), ownedMarker: marker, actualNativeAssertion: caught.message };
}
function judgeHostRecords(records) {
  const rows = new Map(records.map(row => [row.name, row.value]));
  const before = rows.get('01-game-pending'), arrived = rows.get('03-host-arrived-panel-pending');
  const opened = rows.get('05-one-real-sheet'), closed = rows.get('06-closed-visible-host-focused');
  assert(arrived.pending.length === 1 && arrived.pending[0].visible === true && arrived.pending[0].inFallback === false, 'CHROME_HOST_RECORD_PENDING_SURVIVES_HIDDEN_FALLBACK');
  assert.equal(opened.openSheets.length, 1, 'CHROME_HOST_RECORD_SINGLE_REAL_SHEET');
  assert.equal(closed.triggers.filter(row => row.visible && row.focused && row.host).length, 1, 'CHROME_HOST_RECORD_VISIBLE_HOST_FOCUS');
  assert.equal(closed.openSheets.length, 0, 'CHROME_HOST_RECORD_NO_LATE_SHEET');
  assert.equal(closed.y, before.y, 'CHROME_HOST_RECORD_SCROLL_RELEASE');
  assert.deepEqual(closed.body, before.body, 'CHROME_HOST_RECORD_BODY_RELEASE');
}
async function main() {
  const out = process.env.CHROME_RECIPE_OUT, base = 'http://127.0.0.1:4173';
  assert(process.env.CI && out && path.isAbsolute(out), 'CHROME_HOST_REMOTE_SETUP');
  assert.match(process.env.GITHUB_SHA || '', /^[a-f0-9]{40}$/, 'CHROME_HOST_ACTUAL_SOURCE');
  const gameGate = deferred(), panelGate = deferred(), gameSeen = deferred(), panelSeen = deferred();
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const records = [], errors = [], controls = [];
  let page, gameRequests = 0, panelRequests = 0, status = 'REAL_HOST_ARRIVAL_REFUSED', failure = null;
  const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  async function capture(name) {
    const value = await page.evaluate(collect);
    write(name + '.raw.json', value);
    await page.screenshot({ path: path.join(out, name + '.png') });
    records.push({ name, value });
    return value;
  }
  try {
    await context.addInitScript(seed, { theme: 'dark', pending: false });
    await context.routeWebSocket('**/*', async socket => {
      const url = new URL(socket.url());
      errors.push(JSON.stringify({ kind: 'unknown-websocket', origin: url.origin, path: url.pathname,
        queryKeys: [...url.searchParams.keys()].sort(), urlSha256: sha(socket.url()),
        action: 'local-close1008-no-server-connection' }));
      await socket.close({ code: 1008, reason: 'Guest menu proof refuses all realtime.' });
    });
    await context.route(/\/assets\/FreeKick-[^/?]+\.js(?:\?|$)/, async route => {
      gameRequests++; gameSeen.release(); await gameGate.promise; await route.continue();
    });
    await context.route(/\/assets\/SiteMenuPanel-[^/?]+\.js(?:\?|$)/, async route => {
      panelRequests++; panelSeen.release(); await panelGate.promise; await route.continue();
    });
    page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error.stack || error)));
    await page.goto(base + '/free-kick', { waitUntil: 'domcontentloaded' });
    const fallback = page.locator('.dukb-menu-fallback button[aria-label="Open site menu"]');
    await fallback.waitFor({ state: 'visible' });
    await bounded(gameSeen.promise, 'CHROME_HOST_GAME_CHUNK_NOT_OBSERVED');
    await page.evaluate(async () => { await document.fonts.ready; await document.fonts.load('16px Inter'); await document.fonts.load('16px "Space Grotesk"'); });
    const before = await capture('01-game-pending');
    checkFonts(before.fonts);
    assert.equal(gameRequests, 1, 'CHROME_HOST_REAL_GAME_CHUNK_PENDING');
    assert.equal(panelRequests, 0, 'CHROME_HOST_PANEL_REMAINS_COLD');
    assert.equal(before.triggers.filter(node => node.visible).length, 1, 'CHROME_HOST_ONE_FALLBACK');
    assert.equal(before.triggers.filter(node => node.host).length, 0, 'CHROME_HOST_NOT_YET_MOUNTED');
    await fallback.click();
    await page.getByRole('status').filter({ hasText: /^Loading menu\.\.\.$/ }).waitFor();
    await bounded(panelSeen.promise, 'CHROME_HOST_PANEL_CHUNK_NOT_OBSERVED');
    const pending = await capture('02-fallback-pending');
    assert.equal(pending.pending.length, 1, 'CHROME_HOST_REAL_PENDING_REGION');
    assert.equal(pending.pending[0].visible, true, 'CHROME_HOST_PENDING_VISIBLE_BEFORE_GAME');
    assert.equal(panelRequests, 1, 'CHROME_HOST_ACTUAL_PANEL_IMPORT_PENDING');
    gameGate.release();
    const host = page.locator('[data-site-menu-host] button[aria-label="Open site menu"]');
    await host.waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'Free Kick', exact: true }).waitFor();
    const arrived = await capture('03-host-arrived-panel-pending');
    assert.equal(arrived.triggers.filter(node => node.visible).length, 1, 'CHROME_HOST_EXACTLY_ONE_VISIBLE_TRIGGER');
    assert.equal(await fallback.isVisible(), false, 'CHROME_HOST_FALLBACK_ROW_HIDDEN');
    assert.equal(arrived.pending.length, 1, 'CHROME_HOST_PENDING_NOT_LOST');
    assert.equal(arrived.pending[0].visible, true, 'CHROME_HOST_PORTAL_STAYS_VISIBLE');
    assert.equal(arrived.pending[0].inFallback, false, 'CHROME_HOST_PENDING_OUTSIDE_HIDDEN_ROW');
    assert.equal(arrived.openSheets.length, 0, 'CHROME_HOST_NO_SHEET_BEFORE_REAL_IMPORT');
    await host.click();
    await page.waitForFunction(() => {
      const old = document.querySelector('.dukb-menu-fallback button[aria-label="Open site menu"]');
      const current = document.querySelector('[data-site-menu-host] button[aria-label="Open site menu"]');
      return old?.getAttribute('aria-expanded') === 'false' && current?.getAttribute('aria-expanded') === 'true';
    });
    const takeover = await capture('04-host-takeover-pending');
    assert.equal(takeover.pending.length, 1, 'CHROME_HOST_ONE_PENDING_OWNER');
    assert.equal(panelRequests, 1, 'CHROME_HOST_SHARED_REAL_IMPORT');
    panelGate.release();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][data-state="open"]').length >= 1);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const opened = await capture('05-one-real-sheet');
    assert.equal(opened.openSheets.length, 1, 'CHROME_HOST_TAKEOVER_EXACTLY_ONE_OPEN_SHEET');
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true });
    await menu.getByRole('link', { name: 'Soccer', exact: true }).waitFor();
    assert.equal(await menu.getByRole('link', { name: 'Soccer', exact: true }).getAttribute('href'), '/soccer', 'CHROME_HOST_REAL_PANEL_CONTENT');
    assert.equal(opened.trusted.filter(row => row.trusted && row.text === 'Menu').length, 1, 'CHROME_HOST_FALLBACK_NATIVE_CLICK');
    assert(opened.trusted.some(row => row.trusted && row.text === '' && row.href === null), 'CHROME_HOST_ICON_NATIVE_CLICK');
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    const released = await page.waitForFunction(expected => {
      const visible = node => node.isConnected && node.getClientRects().length > 0 && !['hidden', 'collapse'].includes(getComputedStyle(node).visibility);
      const host = document.querySelector('[data-site-menu-host] button[aria-label="Open site menu"]');
      return !!host && visible(host) && document.activeElement === host
        && document.querySelectorAll('[role="dialog"][data-state="open"]').length === 0
        && scrollY === expected.y && document.body.style.overflow === expected.body.inline && getComputedStyle(document.body).overflow === expected.body.computed;
    }, before, { timeout: 2500 }).then(() => true, () => false);
    const closed = await capture('06-closed-visible-host-focused');
    assert.equal(released, true, 'CHROME_HOST_REAL_CLOSE_FOCUS_SCROLL_RELEASE');
    assert.equal(closed.triggers.filter(node => node.visible && node.focused && node.host).length, 1, 'CHROME_HOST_ESCAPE_FOCUSES_VISIBLE_HOST');
    assert.equal(closed.openSheets.length, 0, 'CHROME_HOST_NO_LATE_SHEET');
    assert.equal(closed.y, before.y, 'CHROME_HOST_SCROLL_HELD');
    assert.deepEqual(closed.body, before.body, 'CHROME_HOST_BODY_LOCK_RELEASED');
    assert.equal(gameRequests, 1, 'CHROME_HOST_ONE_ACTUAL_GAME_REQUEST');
    assert.equal(panelRequests, 1, 'CHROME_HOST_ONE_ACTUAL_PANEL_REQUEST');
    assert.deepEqual(errors, [], 'CHROME_HOST_NO_PAGE_ERRORS');
    judgeHostRecords(records);
    const value = (copy, name) => copy.find(row => row.name === name).value;
    controls.push(
      ownedControl('hidden-pending', records, copy => { value(copy, '03-host-arrived-panel-pending').pending[0].visible = false; }, judgeHostRecords, 'CHROME_HOST_RECORD_PENDING_SURVIVES_HIDDEN_FALLBACK'),
      ownedControl('duplicate-sheet', records, copy => { const row = value(copy, '05-one-real-sheet'); row.openSheets.push(structuredClone(row.openSheets[0])); }, judgeHostRecords, 'CHROME_HOST_RECORD_SINGLE_REAL_SHEET'),
      ownedControl('wrong-focus', records, copy => { for (const row of value(copy, '06-closed-visible-host-focused').triggers) row.focused = false; }, judgeHostRecords, 'CHROME_HOST_RECORD_VISIBLE_HOST_FOCUS'),
      ownedControl('body-lock', records, copy => { const row = value(copy, '06-closed-visible-host-focused'); row.body.inline = row.body.inline === 'hidden' ? 'scroll' : 'hidden'; }, judgeHostRecords, 'CHROME_HOST_RECORD_BODY_RELEASE'),
      ownedControl('scroll-moved', records, copy => { value(copy, '06-closed-visible-host-focused').y += 1; }, judgeHostRecords, 'CHROME_HOST_RECORD_SCROLL_RELEASE'),
    );
    status = 'REAL_GAME_HOST_TAKEOVER_PASS';
  } catch (error) {
    failure = String(error.stack || error);
    if (page && !page.isClosed()) await capture('failure-current').catch(captureError => errors.push(String(captureError)));
  } finally {
    gameGate.release(); panelGate.release();
    await context.close(); await browser.close();
    if (errors.length) status = 'REAL_HOST_ARRIVAL_REFUSED';
    write('host-probe.json', { status, source: process.env.GITHUB_SHA, base: process.env.BASE_SOURCE, gameRequests, panelRequests, records, controls, errors, failure,
      sourceBasis: { app: 'shouldShowHeader only root/leaderboard/profile, lazy /free-kick', game: 'FreeKick renders actual GameNavbar before play',
        gameGitBlob: '2877b3b824a6da865c6d7cc5b7db77c2ef88afb9', productQualified: false },
      limits: ['One real route at390x844. No shot, game result, completion or provider write is requested.', 'This proof checks document/body scroll at the actual initial route position, not every scroll position.'] });
  }
  if (status !== 'REAL_GAME_HOST_TAKEOVER_PASS') process.exitCode = 1;
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
