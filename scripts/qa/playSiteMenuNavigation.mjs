/* Source-only candidate. Future path scripts/qa/playSiteMenuNavigation.mjs.
   Run only against a completed isolated build, with the reviewed offline preload. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sha, LINKS, inventory, staticRequest, shellFixture, pollFixture, pollDay, loadFonts, seed, collect, checkFonts, checkMenu } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE, SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const OUT = path.resolve(process.env.SITE_MENU_OUT || '');
const DIST = path.join(ROOT, 'dist'), CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || '');
const specs = [320, 328, 390, 432, 1280].flatMap(width => ['dark', 'light'].map(theme => ({
  id: 'home-' + width + '-' + theme, width, height: width === 320 ? 640 : width === 1280 ? 900 : 844, theme, route: '/', kind: 'normal',
}))).concat([
  { id: 'short-pending', width: 328, height: 515, theme: 'dark', route: '/search', pending: true, kind: 'pending' },
  { id: 'desktop-200pct-reflow', width: 640, height: 450, theme: 'light', route: '/', dpr: 2, reduced: true, kind: 'reflow' },
  { id: 'cold-delay-cancel', width: 390, height: 844, theme: 'dark', route: '/', kind: 'delay' },
  { id: 'cold-failure-reload', width: 390, height: 844, theme: 'dark', route: '/', kind: 'fault' },
]);
const sourceFiles = ['src/App.tsx', 'src/components/layout/Header.tsx', 'src/components/layout/SiteMenu.tsx', 'src/components/layout/SiteMenuPanel.tsx',
  'src/components/layout/LiveTicker.tsx', 'src/components/layout/TopTicker.tsx', 'src/components/ui/sheet.tsx', 'src/components/CookieConsent.tsx',
  'src/hooks/useRoutePath.ts', 'src/contexts/AuthContext.tsx', 'src/lib/consentPreferences.ts', 'src/lib/freshBuild.ts', 'src/lib/theme.ts',
  'src/lib/sportHubNav.ts', 'src/lib/liveScores.ts', 'src/hooks/useLiveScores.ts', 'src/pages/Index.tsx', 'src/components/home/PollOfTheDay.tsx',
  'src/lib/dateUtils.ts', 'src/index.css', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/playwrightLoader.mjs',
  'scripts/qa/playSiteMenuNavigation.mjs', 'scripts/qa/siteMenuNavigationSupport.mjs', 'package.json', 'package-lock.json'];
const report = { v: 1, source: SOURCE, status: 'RUNNING', complete: false, plannedCases: specs.length, cases: [], errors: [], controls: [], holds: {},
  scope: 'Shared navigation only, guest contexts, local read fixtures and actual completed dist. No account, game/save, live backend, all-route, live-site or browser-UI zoom qualification. 200% reflow is 640 CSS pixels and DSF2 for a1280 desktop, not operating browser chrome zoom.' };
let browser, before, cacheBefore, sourceBefore, staticFiles, fonts, panelPath, deadline, prepared = false;
const failure = error => ({ name: error.name, message: error.message, stack: error.stack });
const left = () => { const value = deadline - Date.now(); assert(value > 0, 'MENU_BUDGET: eight minute deadline'); return value; };
const timeout = (max = 5000) => Math.max(1, Math.min(left(), max));
const write = (name, body) => fs.writeFileSync(path.join(OUT, name), Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
const sourceHold = () => sourceFiles.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: body.length, sha256: sha(body) }; });
const menu = page => page.getByRole('dialog', { name: 'Menu', exact: true });
const opener = page => page.getByRole('button', { name: 'Open site menu', exact: true });
const waitMenu = async page => { await menu(page).waitFor({ state: 'visible', timeout: timeout() }); await page.waitForTimeout(550); };
const waitClosed = async page => { await menu(page).waitFor({ state: 'hidden', timeout: timeout() }); await opener(page).evaluate(node => { if (node !== document.activeElement) throw new Error('MENU_FOCUS: actual opener focus return'); }); };
async function mark(page, row, state) {
  const sample = await page.evaluate(collect); checkFonts(sample.fonts);
  const prefix = row.id + '-' + state, png = prefix + '.png', json = prefix + '.json';
  await page.screenshot({ path: path.join(OUT, png), fullPage: false, animations: 'allow', timeout: timeout() });
  const body = fs.readFileSync(path.join(OUT, png)); sample.screenshot = { file: png, bytes: body.length, sha256: sha(body) };
  write(json, sample); row.snapshots.push({ state, file: json, sha256: sha(fs.readFileSync(path.join(OUT, json))), screenshot: sample.screenshot });
  return sample;
}
function recordControl(name, healthy, changed, predicate, marker) {
  const beforeSha256 = sha(JSON.stringify(healthy)), afterSha256 = sha(JSON.stringify(changed));
  assert.notEqual(beforeSha256, afterSha256, 'MENU_CONTROL: actual record change');
  predicate(healthy); assert.throws(() => predicate(changed), error => error.name === 'AssertionError' && error.message.includes(marker));
  report.controls.push({ name, beforeSha256, afterSha256, marker, changedRecordRefused: true, applicationMutation: false });
}
function sampledControls(sample) {
  const links = structuredClone(sample); links.menu.links[0].href = '/not-the-home-page';
  recordControl('actual-href', sample, links, checkMenu, 'MENU_LINKS');
  const target = structuredClone(sample); target.menu.links[0].rect.height = 43;
  recordControl('whole-owner-height', sample, target, checkMenu, 'MENU_TARGETS');
  for (const family of ['Inter', 'Space Grotesk']) {
    const changed = structuredClone(sample.fonts); for (const face of changed.faces) if (face.family.replace(/['"]/g, '') === family) face.status = 'unloaded';
    recordControl('loaded-face-' + family, sample.fonts, changed, checkFonts, 'MENU_FONTS');
  }
}
function predicateControls() {
  staticRequest(new URL(BASE + '/'), 'GET', BASE, staticFiles);
  for (const [name, url, method] of [['origin', 'https://example.com/', 'GET'], ['write', BASE + '/', 'POST'], ['unknown', BASE + '/assets/not-a-built-file.js', 'GET']]) {
    const healthy = { url: BASE + '/', method: 'GET' }, changed = { url, method };
    recordControl('static-' + name, healthy, changed, row => staticRequest(new URL(row.url), row.method, BASE, staticFiles), 'MENU_TRANSPORT');
  }
  const request = (method, body) => ({ method: () => method, postData: () => body });
  const good = { method: 'POST', body: '{"p_limit":3,"p_min":3}' }, changed = { ...good, body: '{"p_limit":3,"p_min":3,"write":true}' };
  recordControl('shell-body', good, changed, row => assert.equal(shellFixture(request(row.method, row.body), new URL('https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/rpc/most_played_today'))?.id, 'source-most-played-today-3-3', 'MENU_FIXTURE: exact body'), 'MENU_FIXTURE');
  assert.equal(shellFixture(request('POST', '{}'), new URL('https://flawuiqbvjobmkfkauhw.supabase.co/auth/v1/token')), null, 'MENU_FIXTURE: no auth write fallback');
}
async function keyNavigation(page, row, includeConsent = false) {
  const focusables = menu(page).locator('a[href],button:not([disabled]),input:not([disabled])');
  const count = await focusables.count(); assert(count >= 18 && count <= 32, 'MENU_KEYBOARD: bounded actual controls');
  const identity = () => page.evaluate(() => { const node = document.activeElement; return { tag: node.tagName, text: node.textContent.trim(), href: node.getAttribute('href'), label: node.getAttribute('aria-label'), inside: !!node.closest('[role="dialog"]') }; });
  await focusables.first().focus(); const first = await identity();
  await page.keyboard.press('Shift+Tab'); const last = await identity();
  assert(last.inside && last.text === 'Close', 'MENU_KEYBOARD: reverse wrap to actual Close');
  await page.keyboard.press('Tab'); assert.deepEqual(await identity(), first, 'MENU_KEYBOARD: forward wrap to first actual control');
  const trail = [first]; let reachedReject = false;
  for (let index = 0; index < count; index++) {
    const focused = await identity(); assert(focused.inside, 'MENU_KEYBOARD: real Tab remains in focus scope'); trail.push(focused);
    if (focused.text === 'Reject all') { reachedReject = true; if (includeConsent) break; }
    await page.keyboard.press('Tab');
  }
  if (includeConsent) assert(reachedReject, 'MENU_CONSENT: actual Tab reaches Reject all');
  row.actions.push({ name: 'real-keyboard-wrap-and-scope', count, first, last, trail, reachedReject });
}
async function normal(page, row, spec) {
  const closed = await mark(page, row, 'closed');
  assert.equal(closed.theme.light, spec.theme === 'light', 'MENU_THEME: actual root preset');
  assert.equal(closed.viewport.width, spec.width, 'MENU_VIEWPORT: actual CSS width');
  assert.equal(closed.viewport.documentWidth, closed.viewport.width, 'MENU_LAYOUT: no horizontal document overflow');
  assert(closed.trigger && closed.trigger.rect.x === 0 && closed.trigger.rect.y === 0 && closed.trigger.rect.width >= 44 && closed.trigger.rect.height === 44, 'MENU_LAUNCHER: actual top-left44px control');
  assert(closed.bar && closed.bar.height === 44 && closed.bar.width === spec.width, 'MENU_BAR: actual44px global row');
  if (spec.route === '/') {
    assert(closed.header && closed.header.y === 44, 'MENU_HEADER: actual header below global row');
    assert(closed.ticker?.visible && closed.ticker.liveChip && closed.ticker.rect.x >= closed.trigger.rect.right && closed.ticker.rect.right <= spec.width, 'MENU_TICKER: actual ticker retained beside menu');
    assert(closed.ticker.text.includes('No games on the board right now'), 'MENU_TICKER: answered local empty-board fixture, not loading');
    if (spec.kind === 'normal' && spec.width <= 432) assert(closed.firstGame && closed.firstGame.rect.y <= 430, 'MENU_HOME_FOLD: actual first game at or above430');
  }
  await opener(page).click(); await waitMenu(page);
  let open = await mark(page, row, 'open'); checkMenu(open);
  assert(open.active && await menu(page).evaluate(node => node.contains(document.activeElement)), 'MENU_FOCUS: actual initial focus in dialog');
  assert.deepEqual(open.menu.links.filter(link => link.current === 'page').map(link => link.href), [spec.route], 'MENU_CURRENT: exact current route only');
  if (row.id === 'home-320-dark') sampledControls(open);
  await keyNavigation(page, row, spec.pending);
  if (spec.pending) {
    assert(open.consent.count === 1 && open.consent.inside && open.consent.host && !open.consent.hidden && !open.consent.pending, 'MENU_CONSENT: one actual pending region inside focus scope and no outside clamp');
    recordControl('pending-host', open, { ...open, consent: { ...open.consent, inside: false } }, sample => assert(sample.consent.count === 1 && sample.consent.inside && sample.consent.host && !sample.consent.hidden, 'MENU_CONSENT: actual host'), 'MENU_CONSENT');
    await page.keyboard.press('Enter');
    await page.getByRole('region', { name: 'Cookie choices', exact: true }).waitFor({ state: 'hidden', timeout: timeout() });
    open = await mark(page, row, 'trusted-rejected');
    const stored = JSON.parse(open.consent.stored || 'null');
    assert(stored?.version === 2 && stored.advertising === false && stored.analytics === false, 'MENU_CONSENT: real rejected preference stored');
    assert(open.trusted.some(event => event.trusted && event.text === 'Reject all'), 'MENU_CONSENT: trusted keyboard activation');
    checkMenu(open);
  }
  if (spec.reduced) {
    const actual = await menu(page).evaluate(node => ({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, animation: getComputedStyle(node).animationName, transition: getComputedStyle(node).transitionDuration, transitionProperty: getComputedStyle(node).transitionProperty, dpr: devicePixelRatio }));
    assert(actual.reduced && actual.animation === 'none' && (actual.transitionProperty === 'none' || actual.transition.split(',').every(value => parseFloat(value) === 0)) && actual.dpr === 2, 'MENU_REFLOW: actual reduced-motion and2x density'); row.reflow = { ...actual, cssWidth: spec.width, referenceDesktopWidth: 1280, browserUiZoomOperated: false };
  }
  await page.keyboard.press('Escape'); await waitClosed(page); row.actions.push({ name: 'Escape-and-focus-return', passed: true });
  await opener(page).click(); await waitMenu(page); await page.mouse.click(spec.width - 2, 150); await waitClosed(page); row.actions.push({ name: 'actual-overlay-dismiss-and-focus-return', passed: true });
  await opener(page).click(); await waitMenu(page);
  await menu(page).getByRole('link', { name: 'Accessibility', exact: true }).click(); await menu(page).waitFor({ state: 'hidden', timeout: timeout() });
  await page.waitForURL(BASE + '/accessibility', { timeout: timeout() });
  row.actions.push({ name: 'actual-link-navigation', destination: new URL(page.url()).pathname, passed: true });
  await opener(page).click(); await waitMenu(page); await menu(page).getByRole('link', { name: 'Home', exact: true }).click(); await page.waitForURL(BASE + '/', { timeout: timeout() }); await menu(page).waitFor({ state: 'hidden', timeout: timeout() });
  if (spec.width === 390 && spec.theme === 'dark' && spec.kind === 'normal') {
    await page.mouse.wheel(0, 600); await page.waitForFunction(() => scrollY > 100, null, { timeout: timeout() });
    const sticky = await mark(page, row, 'scrolled'); assert(sticky.trigger.rect.y === 0 && sticky.header.y === 44, 'MENU_STICKY: actual two-row offsets after wheel');
    await opener(page).click(); await waitMenu(page); await page.keyboard.press('Escape'); await waitClosed(page);
  }
}
async function cold(page, row, spec, fault) {
  assert.equal(row.panelRequests.length, 0, 'MENU_LAZY: no panel request before actual first opening');
  if (spec.kind === 'delay') {
    fault.mode = 'delay'; await opener(page).click();
    await page.getByRole('status').filter({ hasText: 'Loading menu...' }).waitFor({ state: 'visible', timeout: timeout() });
    assert.equal(await opener(page).getAttribute('aria-busy'), 'true'); assert.equal(row.panelRequests.length, 1);
    await mark(page, row, 'held-loading'); await page.getByRole('region', { name: 'Site menu loading', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
    await opener(page).evaluate(node => { if (document.activeElement !== node) throw new Error('MENU_CANCEL: actual focus'); });
    fault.release(); await page.waitForTimeout(650);
    assert.equal(await menu(page).count(), 0, 'MENU_CANCEL: released late chunk cannot reopen cancelled menu');
    await mark(page, row, 'cancelled-late-release');
    await opener(page).click(); await waitMenu(page); const open = await mark(page, row, 'healthy-reopen'); checkMenu(open);
    assert.equal(row.panelRequests.length, 1, 'MENU_LAZY: same successful built chunk reused');
    row.actions.push({ name: 'actual-held-chunk-cancel-release-reopen', passed: true });
  } else {
    fault.mode = 'failure'; const prior = row.documents.length;
    const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: timeout() });
    await opener(page).click(); await navigation; await ready(page);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('dukb-reloaded-stale-chunk')), '1', 'MENU_CHUNK: existing global once-reload marker written by actual app');
    assert.equal(row.documents.length, prior + 1, 'MENU_CHUNK: exactly one existing global reload after first failure');
    await opener(page).click(); await page.getByRole('alert').filter({ hasText: 'Menu could not load.' }).waitFor({ state: 'visible', timeout: timeout() });
    const navCount = row.documents.length; await page.waitForTimeout(450); assert.equal(row.documents.length, navCount, 'MENU_CHUNK: no second automatic reload');
    const region = page.getByRole('region', { name: 'Site menu loading', exact: true });
    assert.equal(await region.getByRole('link', { name: 'Search Games', exact: true }).getAttribute('href'), '/search');
    await mark(page, row, 'second-failure-alert');
    await region.getByRole('button', { name: 'Cancel', exact: true }).click(); await opener(page).evaluate(node => { if (document.activeElement !== node) throw new Error('MENU_CHUNK: fault Cancel focus'); });
    fault.mode = 'healthy'; await page.reload({ waitUntil: 'load', timeout: timeout(9000) }); await ready(page);
    await opener(page).click(); await waitMenu(page); checkMenu(await mark(page, row, 'explicit-healthy-reload'));
    assert.equal(row.documents.length, navCount + 1, 'MENU_CHUNK: only explicit healthy reload added');
    assert(row.panelRequests.filter(value => value.mode === 'failure').length === 2 && row.panelRequests.some(value => value.mode === 'healthy'), 'MENU_CHUNK: actual two network faults and fresh healthy panel fetch');
    row.actions.push({ name: 'actual-first-global-reload-second-alert-explicit-recovery', passed: true });
  }
}
async function ready(page) {
  await opener(page).waitFor({ state: 'visible', timeout: timeout() });
  await page.locator('#dukb-main').waitFor({ state: 'attached', timeout: timeout() });
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: timeout() });
  await page.waitForFunction(() => document.querySelector('[data-empty-line]')?.textContent.includes('No games on the board right now') || location.pathname !== '/', null, { timeout: timeout() });
}

async function walk(spec) {
  const row = { id: spec.id, spec, complete: false, actions: [], snapshots: [], static: [], fixtures: [], cachedFonts: [], blocked: [],
    consoleErrors: [], pageErrors: [], http: [], responseErrors: [], documents: [], panelRequests: [], expectedFaultErrors: [] };
  report.cases.push(row);
  let context, page, releaseGate, routeMode = 'healthy';
  const gate = new Promise(resolve => { releaseGate = resolve; });
  const fault = { get mode() { return routeMode; }, set mode(value) { routeMode = value; }, release: releaseGate };
  const day = pollDay(Date.now());
  try {
    context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: spec.dpr || 1,
      hasTouch: spec.width < 600, isMobile: false, locale: 'en-US', timezoneId: 'America/New_York', reducedMotion: spec.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      try {
        row.requestCount = (row.requestCount || 0) + 1; assert(row.requestCount <= 2048, 'MENU_SETUP: request budget');
        if (url.origin === BASE) {
          staticRequest(url, request.method(), BASE, staticFiles);
          row.static.push({ path: url.pathname, method: request.method(), type: request.resourceType() });
          if (url.pathname === panelPath) {
            const mode = fault.mode; row.panelRequests.push({ path: panelPath, mode, method: request.method() });
            if (mode === 'delay') await gate;
            if (mode === 'failure') return await route.fulfill({ status: 503, contentType: 'text/javascript', body: '/* Controlled panel transport failure. */' });
          }
          if (request.method() === 'GET' && /\.(?:css|js)$/.test(url.pathname)) {
            const response = await route.fetch({ url: BASE + url.pathname, maxRedirects: 0, maxRetries: 0, timeout: timeout() });
            try {
              assert.equal(response.url(), BASE + url.pathname, 'MENU_SERVED_BODY: exact loopback response URL');
              assert.equal(response.status(), 200, 'MENU_SERVED_BODY: actual asset response200');
              const body = await response.body(), expected = staticFiles.get(url.pathname);
              assert(expected && body.length === expected.bytes && sha(body) === expected.sha256, 'MENU_SERVED_BODY: actual JS/CSS equals completed dist');
              (row.servedBodies ||= []).push({ path: url.pathname, bytes: body.length, sha256: sha(body), capturedBeforeFulfill: true });
              return await route.fulfill({ response, body });
            } finally { await response.dispose(); }
          }
          return await route.continue();
        }
        if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
          const font = fonts.get(url.href); row.cachedFonts.push({ url: url.href, type: request.resourceType(), sha256: font.sha256, bytes: font.body.length, manifestSha256: process.env.FONT_CACHE_MANIFEST_SHA256, forwarded: false });
          return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
        }
        const fixture = shellFixture(request, url) || pollFixture(request, url, day);
        if (fixture) {
          row.fixtures.push({ id: fixture.id, method: request.method(), path: url.pathname, query: url.search, requestBodySha256: fixture.requestBodySha256 || null, responseSha256: sha(fixture.body), forwarded: false });
          return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: { 'access-control-allow-origin': '*', ...(fixture.date ? { date: fixture.date } : {}) } });
        }
        throw new Error('MENU_TRANSPORT: request has no exact static/cache/source-owned fixture');
      } catch (error) {
        row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, error: failure(error) }); await route.abort('blockedbyclient');
      }
    });
    await context.routeWebSocket('**/*', async socket => { row.blocked.push({ transport: 'websocket' }); await socket.close(); });
    await context.addInitScript(seed, spec);
    page = await context.newPage(); page.setDefaultTimeout(5000);
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) row.documents.push({ url: frame.url() }); });
    page.on('pageerror', error => row.pageErrors.push(failure(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push({ text: message.text(), location: message.location() }); });
    page.on('response', response => {
      const url = new URL(response.url()); if (url.origin !== BASE) return;
      const status = response.status(); row.http.push({ path: url.pathname, status, method: response.request().method() });

    });
    await page.goto(BASE + spec.route, { waitUntil: 'load', timeout: timeout(12000) }); await ready(page);
    assert.equal(row.panelRequests.length, 0, 'MENU_LAZY: built panel absent from cold page requests');
    if (['delay', 'fault'].includes(spec.kind)) await cold(page, row, spec, fault); else await normal(page, row, spec);
    assert.equal(pollDay(Date.now()), day, 'MENU_SETUP: no poll-day rollover inside context');
    row.complete = true;
  } catch (error) {
    row.error = failure(error);
    if (page && !page.isClosed()) try { await page.screenshot({ path: path.join(OUT, row.id + '-failure.png'), fullPage: false, timeout: 3000 }); } catch (captureError) { row.captureError = failure(captureError); }
  } finally {
    releaseGate();
    try { if (context) await context.close(); } catch (error) { row.responseErrors.push(failure(error)); }
    try {
      assert.deepEqual(row.blocked, [], 'MENU_SETUP: no unknown/denied request or socket');
      assert.deepEqual(row.pageErrors, [], 'MENU_SETUP: no actual page error');
      assert.deepEqual(row.responseErrors, [], 'MENU_SETUP: every actual asset body settled');
      const expectedHttp = row.http.filter(item => spec.kind === 'fault' && item.path === panelPath && item.status === 503);
      assert(row.http.every(item => item.status < 400 || expectedHttp.includes(item)), 'MENU_SETUP: no unrelated HTTP error');
      row.expectedFaultErrors = row.consoleErrors.filter(item => spec.kind === 'fault' && item.location.url === BASE + panelPath && /^Failed to load resource:/.test(item.text));
      assert.equal(row.consoleErrors.length, row.expectedFaultErrors.length, 'MENU_SETUP: no unrelated console error');
      if (spec.kind === 'fault') assert.equal(expectedHttp.length, 2, 'MENU_CHUNK: exactly two controlled actual HTTP failures');
      assert(row.cachedFonts.some(item => item.type === 'stylesheet') && row.cachedFonts.some(item => item.type === 'font'), 'MENU_FONTS: actual cached CSS and font requests in each context');
      assert(row.fixtures.some(item => item.id === 'source-live-scores-12h-20h-limit150'), 'MENU_FIXTURE: actual shell read fulfilled locally');
    } catch (error) { row.complete = false; row.cleanError = failure(error); }
    write(row.id + '-case.json', row);
  }
}
try {
  deadline = Date.now() + 480000;
  assert.equal(BASE, 'http://127.0.0.1:4173', 'MENU_SETUP: exact loopback origin');
  assert.match(SOURCE || '', /^[a-f0-9]{40}$/, 'MENU_SETUP: actual source SHA');
  if (process.env.GITHUB_SHA) assert.equal(SOURCE, process.env.GITHUB_SHA, 'MENU_SETUP: actual workflow head');
  assert(process.env.SITE_MENU_OUT && path.isAbsolute(process.env.SITE_MENU_OUT) && path.basename(OUT) === 'site-menu-browser', 'MENU_SETUP: explicit named absolute output');
  assert(OUT !== ROOT && !OUT.startsWith(DIST + path.sep) && (!OUT.startsWith(ROOT + path.sep) || OUT === path.join(ROOT, 'site-menu-browser')), 'MENU_SETUP: evidence outside source/dist');
  assert.equal((process.env.NODE_OPTIONS || '').trim(), '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'MENU_SETUP: exact strict offline preload only');
  assert(process.env.SIM_OFFLINE_RECEIPT && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).isFile() && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size === 0, 'MENU_SETUP: fresh existing strict transport receipt');
  if (fs.existsSync(OUT)) assert.equal(fs.readdirSync(OUT).length, 0, 'MENU_SETUP: never replace prior evidence'); else fs.mkdirSync(OUT, { recursive: true });
  prepared = true;
  before = inventory(DIST); assert(before.length > 100, 'MENU_SETUP: completed built dist');
  staticFiles = new Map(before.map(item => ['/' + item.file, item]));
  const candidates = before.filter(item => /^assets\/SiteMenuPanel-[A-Za-z0-9_-]+\.js$/.test(item.file));
  assert.equal(candidates.length, 1, 'MENU_SETUP: one real separately emitted menu panel');
  panelPath = '/' + candidates[0].file; report.panelAsset = candidates[0];
  cacheBefore = inventory(CACHE); fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
  sourceBefore = sourceHold(); write('source-before.json', sourceBefore); write('dist-before.json', before); write('cache-before.json', cacheBefore);
  report.holds.before = { source: sha(JSON.stringify(sourceBefore)), dist: sha(JSON.stringify(before)), cache: sha(JSON.stringify(cacheBefore)) };
  predicateControls(); browser = await chromium.launch({ headless: true, timeout: 10000 }); report.browserVersion = browser.version();
  for (const spec of specs) { left(); await walk(spec); }
} catch (error) { report.errors.push(failure(error)); }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(failure(error)); }
  if (prepared) {
    try {
      const sourceAfter = sourceHold(), after = inventory(DIST), cacheAfter = inventory(CACHE);
      write('source-after.json', sourceAfter); write('dist-after.json', after); write('cache-after.json', cacheAfter);
      assert.deepEqual(sourceAfter, sourceBefore, 'MENU_HOLD: all selected source/dependencies unchanged');
      assert.deepEqual(after, before, 'MENU_HOLD: whole completed dist unchanged');
      assert.deepEqual(cacheAfter, cacheBefore, 'MENU_HOLD: entire cache unchanged');
      assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'MENU_HOLD: zero actual external transport attempts');
      report.holds.unchanged = true;
    } catch (error) { report.errors.push(failure(error)); }
    report.actual = { cases: report.cases.length, completeCases: report.cases.filter(row => row.complete).length, screenshots: report.cases.reduce((sum, row) => sum + row.snapshots.length, 0) };
    report.complete = report.errors.length === 0 && report.holds.unchanged === true && report.actual.cases === specs.length && report.actual.completeCases === specs.length && report.controls.length === 9;
    report.status = report.complete ? 'MENU_BROWSER_COMPLETE' : 'MENU_BROWSER_INCOMPLETE_OR_FAILED';
    write('report.json', report);
    const files = fs.readdirSync(OUT).sort(); assert(files.every(file => fs.lstatSync(path.join(OUT, file)).isFile() && !fs.lstatSync(path.join(OUT, file)).isSymbolicLink()), 'MENU_EVIDENCE: flat regular files only');
    write('evidence.sha256', files.map(file => sha(fs.readFileSync(path.join(OUT, file))) + '  ' + file).join('\n') + '\n');
  }
}
console.log('SITE_MENU_BROWSER ' + JSON.stringify({ status: report.status, complete: report.complete, plannedCases: specs.length, actual: report.actual || null, controls: report.controls.length, errors: report.errors.length }));
process.exitCode = report.complete ? 0 : 1;
