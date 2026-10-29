/* Private source draft. Future target scripts/qa/playSearchNavigation.mjs.
   Ordinary remote completed-build verification only. No clock override or app replacement. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sha, inventory, staticRequest, shellFixture, pollFixture, pollDay, loadFonts, seed, collect, checkFonts } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.BASE, SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const OUT = path.resolve(process.env.SEARCH_NAV_OUT || ''), DIST = path.join(ROOT, 'dist');
const CACHE = path.resolve(process.env.FREE_KICK_FONT_CACHE || '');
const specs = [{ id: 'phone-328', width: 328, height: 515, theme: 'dark' }, { id: 'desktop-1280', width: 1280, height: 900, theme: 'light' }];
const sourceFiles = ['src/pages/Search.tsx', 'src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json',
  'src/hooks/useGamePicks.ts', 'src/components/game/GamePickButton.tsx', 'src/App.tsx',
  'src/components/layout/SiteMenu.tsx', 'src/components/layout/SiteMenuPanel.tsx',
  'scripts/qa/playSearchNavigation.mjs', 'scripts/qa/siteMenuNavigationSupport.mjs',
  'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'package.json', 'package-lock.json'];
const report = { v: 1, source: SOURCE, status: 'RUNNING', complete: false, plannedContexts: 2, plannedJourneys: 8,
  contexts: [], controls: [], errors: [], holds: {},
  scope: 'Guest completed-build Search navigation only. Two actual reduced-motion contexts, no claim about all games, account/backend, live site, browser UI or all navigation interleavings. Fast same-path race credit requires measured trusted input and click under250ms with URL still unchanged. Unit regressions separately cover own-write versus external identical REPLACE.' };
let browser, prepared = false, sourceBefore, distBefore, cacheBefore, files, fonts, searchAsset, menuAsset, deadline;
const fail = error => ({ name: error.name, message: error.message, stack: error.stack });
const time = (limit = 5000) => { const left = deadline - Date.now(); assert(left > 0, 'SEARCH_BUDGET: six minute deadline'); return Math.max(1, Math.min(left, limit)); };
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hold = () => sourceFiles.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: body.length, sha256: sha(body) }; });
const field = page => page.getByRole('textbox', { name: 'Search games', exact: true });
const opener = page => page.getByRole('button', { name: 'Open site menu', exact: true });
const menu = page => page.getByRole('dialog', { name: 'Menu', exact: true });

/* Observes actual browser events without replacing history, time, router or application functions. */
function observe() {
  window.__searchNavigation = { inputs: [], clicks: [], pops: [], inputNode: null, timeOrigin: performance.timeOrigin };
  document.addEventListener('input', event => {
    const node = event.target;
    if (node instanceof HTMLInputElement && node.getAttribute('aria-label') === 'Search games') {
      const data = window.__searchNavigation;
      if (data.inputs.length < 256) data.inputs.push({ at: performance.now(), trusted: event.isTrusted, value: node.value, href: location.href });
    }
  }, true);
  document.addEventListener('click', event => {
    const node = event.target instanceof Element ? event.target.closest('a') : null;
    if (node?.getAttribute('href') === '/search') {
      const data = window.__searchNavigation;
      if (data.clicks.length < 32) data.clicks.push({ at: performance.now(), trusted: event.isTrusted, href: location.href,
        draft: document.querySelector('input[aria-label="Search games"]')?.value ?? null, text: node.textContent.trim(), insideMenu: !!node.closest('[role="dialog"]') });
    }
  }, true);
  addEventListener('popstate', event => {
    const data = window.__searchNavigation;
    if (data.pops.length < 32) data.pops.push({ at: performance.now(), trusted: event.isTrusted, href: location.href });
  });
}
function sample() {
  const input = document.querySelector('input[aria-label="Search games"]'), data = window.__searchNavigation;
  const stored = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
  const links = [...document.querySelectorAll('#dukb-main a[data-result]')].map(node => ({ href: node.getAttribute('href'), label: node.textContent.trim().replace(/\s+/g, ' ') }));
  return { href: location.href, query: input?.value ?? null, links, inputSame: !!input && input === data.inputNode,
    timeOrigin: performance.timeOrigin, initialTimeOrigin: data.timeOrigin, historyLength: history.length,
    activeHref: document.activeElement?.getAttribute('href') || null, inputFocused: input === document.activeElement,
    status: document.querySelector('#dukb-main [role="status"]')?.textContent.trim() || null,
    geometry: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, input: input ? (() => { const r = input.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })() : null },
    local: stored(localStorage), session: stored(sessionStorage), events: structuredClone({ inputs: data.inputs, clicks: data.clicks, pops: data.pops }) };
}
async function actual(page) { return page.evaluate(sample); }
async function settled(page, query) {
  await page.waitForFunction(value => new URL(location.href).searchParams.get('q') === (value || null)
    && document.querySelector('input[aria-label="Search games"]')?.value === value, query, { timeout: time() });
  await page.waitForTimeout(350);
}
async function type(page, value) {
  await field(page).click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(value, { delay: 0 });
}
async function searchLink(page) {
  await opener(page).click(); await menu(page).waitFor({ state: 'visible', timeout: time() });
  await menu(page).getByRole('link', { name: 'Search Games', exact: true }).click();
  await menu(page).waitFor({ state: 'hidden', timeout: time() });
}
async function capture(page, contextRow, name) {
  const data = await actual(page), png = contextRow.id + '-' + name + '.png', json = contextRow.id + '-' + name + '.json';
  await page.screenshot({ path: path.join(OUT, png), fullPage: false, timeout: time() });
  data.screenshot = { file: png, bytes: fs.statSync(path.join(OUT, png)).size, sha256: sha(fs.readFileSync(path.join(OUT, png))) };
  write(json, data); contextRow.snapshots.push({ file: json, sha256: sha(fs.readFileSync(path.join(OUT, json))), screenshot: data.screenshot });
  return data;
}
function reset(value, baseline) {
  assert(value.query === '' && new URL(value.href).searchParams.get('q') === null, 'SEARCH_RESET: empty input and no URL query after pending timer expires');
  assert.deepEqual(value.links, baseline.links, 'SEARCH_RESULTS: exact original browse links restored');
  assert(value.inputSame && value.timeOrigin === value.initialTimeOrigin, 'SEARCH_IDENTITY: same Search input and document, not a reload reset');
}
function race(value) {
  assert(value.input?.trusted === true && value.click?.trusted === true && value.click.insideMenu === true, 'SEARCH_TIMING: trusted typing and real Menu Search link');
  assert(value.input.value === 'Soccer Career' && value.click.draft === 'Soccer Career', 'SEARCH_TIMING: exact pending draft at activation');
  assert(new URL(value.click.href).pathname === '/search' && new URL(value.click.href).searchParams.get('q') === null, 'SEARCH_TIMING: URL still pre-debounce at click');
  assert(value.click.at - value.input.at >= 0 && value.click.at - value.input.at < 250, 'SEARCH_TIMING: observed activation strictly before250ms, slow attempt is no race credit');
}
function historyState(value, expected) {
  assert(value.query === expected.query && new URL(value.href).searchParams.get('q') === expected.query && value.inputSame, 'SEARCH_HISTORY: actual same-component history query restored');
  assert.deepEqual(value.links, expected.links, 'SEARCH_HISTORY: exact prior result links restored');
}
function keyboardState(value) {
  assert(value.inputFocused && value.activeHref === null, 'SEARCH_KEYBOARD: clear returns actual input focus');
}
function control(name, healthy, changed, predicate, marker) {
  const beforeSha256 = sha(JSON.stringify(healthy)), afterSha256 = sha(JSON.stringify(changed));
  assert.notEqual(beforeSha256, afterSha256, 'SEARCH_CONTROL: changed actual record');
  predicate(healthy);
  assert.throws(() => predicate(changed), error => error.name === 'AssertionError' && error.message.includes(marker));
  report.controls.push({ name, marker, beforeSha256, afterSha256, changedRecordRefused: true, applicationMutation: false });
}
function controls(timing, cleared, baseline, restored, prior) {
  let changed = structuredClone(timing); changed.input.trusted = false; control('trusted-input', timing, changed, race, 'SEARCH_TIMING');
  changed = structuredClone(timing); changed.click.at = changed.input.at + 250; control('late-link-not-a-race', timing, changed, race, 'SEARCH_TIMING');
  changed = structuredClone(cleared); changed.query = 'stale'; control('stale-draft', cleared, changed, value => reset(value, baseline), 'SEARCH_RESET');
  changed = structuredClone(cleared); changed.href = BASE + '/search?q=stale'; control('stale-url', cleared, changed, value => reset(value, baseline), 'SEARCH_RESET');
  changed = structuredClone(cleared); changed.links = changed.links.slice(1); control('wrong-browse-results', cleared, changed, value => reset(value, baseline), 'SEARCH_RESULTS');
  changed = structuredClone(cleared); changed.inputSame = false; control('reload-is-not-sync', cleared, changed, value => reset(value, baseline), 'SEARCH_IDENTITY');
  changed = structuredClone(restored); changed.query = 'wrong'; control('wrong-history-query', restored, changed, value => historyState(value, prior), 'SEARCH_HISTORY');
  changed = structuredClone(cleared); changed.inputFocused = false; control('lost-clear-focus', cleared, changed, keyboardState, 'SEARCH_KEYBOARD');
}
async function journey(row, name, action) {
  const entry = { name, complete: false }; row.journeys.push(entry);
  try { entry.evidence = await action(); entry.complete = true; }
  catch (error) { entry.error = fail(error); throw error; }
}
async function walk(spec) {
  const row = { ...spec, complete: false, journeys: [], snapshots: [], static: [], servedBodies: [], fixtures: [], cachedFonts: [], blocked: [], errors: [], http: [] };
  report.contexts.push(row); let context, page, baseline, first, second, timing, cleared, restored;
  const day = pollDay(Date.now());
  try {
    context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, locale: 'en-US', timezoneId: 'America/New_York',
      hasTouch: spec.width < 600, isMobile: false, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      try {
        assert(row.static.length + row.fixtures.length + row.cachedFonts.length < 1024, 'SEARCH_SETUP: finite request budget');
        if (url.origin === BASE) {
          staticRequest(url, request.method(), BASE, files);
          row.static.push({ path: url.pathname, method: request.method(), type: request.resourceType() });
          if (request.method() === 'GET' && /\.(?:js|css)$/.test(url.pathname)) {
            const response = await route.fetch({ url: BASE + url.pathname, maxRedirects: 0, maxRetries: 0, timeout: time() });
            try {
              assert(response.url() === BASE + url.pathname && response.status() === 200, 'SEARCH_SERVED_BODY: exact healthy loopback asset');
              const body = await response.body(), expected = files.get(url.pathname);
              assert(expected && body.length === expected.bytes && sha(body) === expected.sha256, 'SEARCH_SERVED_BODY: actual compiled body equals completed dist');
              row.servedBodies.push({ path: url.pathname, bytes: body.length, sha256: sha(body), capturedBeforeFulfill: true });
              return await route.fulfill({ response, body });
            } finally { await response.dispose(); }
          }
          return await route.continue();
        }
        if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
          const font = fonts.get(url.href); row.cachedFonts.push({ url: url.href, type: request.resourceType(), bytes: font.body.length, sha256: font.sha256, forwarded: false });
          return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
        }
        const fixture = shellFixture(request, url) || pollFixture(request, url, day);
        if (fixture) {
          row.fixtures.push({ id: fixture.id, method: request.method(), path: url.pathname, query: url.search, responseSha256: sha(fixture.body), forwarded: false });
          return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: { 'access-control-allow-origin': '*', ...(fixture.date ? { date: fixture.date } : {}) } });
        }
        throw new Error('SEARCH_TRANSPORT: no exact static/cache/source fixture');
      } catch (error) { row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, error: fail(error) }); await route.abort('blockedbyclient'); }
    });
    await context.routeWebSocket('**/*', async socket => { row.blocked.push({ transport: 'websocket' }); await socket.close(); });
    await context.addInitScript(seed, { ...spec, pending: false }); await context.addInitScript(observe);
    page = await context.newPage(); page.setDefaultTimeout(5000);
    page.on('pageerror', error => row.errors.push(fail(error)));
    page.on('console', message => { if (message.type() === 'error') row.errors.push({ name: 'ConsoleError', message: message.text(), location: message.location() }); });
    page.on('response', response => { if (new URL(response.url()).origin === BASE) row.http.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    await page.goto(BASE + '/search', { waitUntil: 'load', timeout: time(12000) }); await field(page).waitFor({ state: 'visible', timeout: time() });
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: time() });
    checkFonts((await page.evaluate(collect)).fonts);
    await page.evaluate(() => { window.__searchNavigation.inputNode = document.querySelector('input[aria-label="Search games"]'); });
    baseline = await actual(page); assert(baseline.query === '' && baseline.links.length > 0, 'SEARCH_SETUP: real initial browse');
    assert(baseline.links.some(link => link.href === '/soccer-career'), 'SEARCH_SETUP: actual catalog game present');
    /* Warm the actual lazy panel before measuring. No fake chunk and no fixed menu wait. */
    await opener(page).click(); await menu(page).waitFor({ state: 'visible', timeout: time() }); await page.keyboard.press('Escape'); await menu(page).waitFor({ state: 'hidden', timeout: time() });
    await journey(row, 'trusted-pending-same-path-reset', async () => {
      await type(page, 'Soccer Career'); await searchLink(page);
      const events = (await actual(page)).events;
      timing = { input: events.inputs.at(-1), click: events.clicks.at(-1) }; race(timing);
      await settled(page, ''); cleared = await capture(page, row, 'pending-reset'); reset(cleared, baseline);
      return { timing, sameInput: cleared.inputSame, href: cleared.href, query: cleared.query };
    });
    await journey(row, 'rapid-edits-own-replace-results', async () => {
      const historyLength = (await actual(page)).historyLength;
      await type(page, 'Soccer'); await page.keyboard.type(' Career', { delay: 10 }); await settled(page, 'Soccer Career');
      first = await capture(page, row, 'own-replace');
      assert.equal(first.links[0]?.href, '/soccer-career', 'SEARCH_RESULTS: actual exact-name result first');
      assert.equal(first.historyLength, historyLength, 'SEARCH_HISTORY: typing replaces without extra entries');
      return { query: first.query, href: first.href, firstResult: first.links[0], historyLength };
    });
    await journey(row, 'same-component-back-forward-with-pending-draft', async () => {
      await searchLink(page); await settled(page, ''); await type(page, 'Club Manager'); await settled(page, 'Club Manager');
      second = await actual(page); assert.equal(second.links[0]?.href, '/club-manager', 'SEARCH_RESULTS: second actual exact-name result first');
      await type(page, 'NHL'); await page.goBack({ timeout: time() }); await settled(page, 'Soccer Career');
      restored = await actual(page); historyState(restored, first);
      const input = restored.events.inputs.at(-1), pop = restored.events.pops.at(-1);
      assert(input?.trusted === true && pop?.trusted === true && pop.at - input.at >= 0 && pop.at - input.at < 250, 'SEARCH_TIMING: actual Back crossed pending draft before250ms');
      await page.goForward({ timeout: time() }); await settled(page, 'Club Manager'); const forward = await capture(page, row, 'forward');
      historyState(forward, second);
      return { input, pop, back: { query: restored.query, href: restored.href, inputSame: restored.inputSame }, forward: { query: forward.query, href: forward.href, inputSame: forward.inputSame } };
    });
    await journey(row, 'clear-escape-and-native-result-focus', async () => {
      await field(page).click(); await page.keyboard.press('Escape'); await settled(page, ''); reset(await actual(page), baseline);
      await type(page, 'Soccer Career'); await settled(page, 'Soccer Career');
      await page.getByRole('button', { name: 'Clear search', exact: true }).click(); await settled(page, '');
      const value = await capture(page, row, 'clear'); reset(value, baseline); keyboardState(value);
      await page.keyboard.press('ArrowDown'); const focused = await actual(page);
      assert.equal(focused.activeHref, baseline.links[0].href, 'SEARCH_KEYBOARD: actual first result receives ArrowDown focus');
      assert.deepEqual({ local: value.local, session: value.session }, { local: baseline.local, session: baseline.session }, 'SEARCH_STORAGE: browsing/navigation preserve initial opaque storage');
      if (spec.id === 'phone-328') controls(timing, value, baseline, restored, first);
      return { clearFocused: value.inputFocused, arrowHref: focused.activeHref, storageHeld: true };
    });
    assert.equal(pollDay(Date.now()), day, 'SEARCH_SETUP: no fixture poll-day rollover');
    row.complete = true;
  } catch (error) {
    row.error = fail(error);
    if (page && !page.isClosed()) try { await page.screenshot({ path: path.join(OUT, row.id + '-failure.png'), fullPage: false, timeout: 3000 }); } catch (error) { row.captureError = fail(error); }
  } finally {
    try { if (context) await context.close(); } catch (error) { row.errors.push(fail(error)); }
    try {
      assert.deepEqual(row.blocked, [], 'SEARCH_SETUP: no unknown request or socket'); assert.deepEqual(row.errors, [], 'SEARCH_SETUP: no page/console/close errors');
      assert(row.http.every(value => value.status < 400), 'SEARCH_SETUP: all actual HTTP healthy');
      assert([searchAsset, menuAsset].every(asset => row.servedBodies.some(value => value.path === asset)), 'SEARCH_SERVED_BODY: both actual Search and SiteMenuPanel chunks consumed');
      assert(row.cachedFonts.some(value => value.type === 'font') && row.cachedFonts.some(value => value.type === 'stylesheet'), 'SEARCH_FONTS: actual cached font bodies consumed');
    } catch (error) { row.complete = false; row.cleanError = fail(error); }
    write(row.id + '-context.json', row);
  }
}
try {
  deadline = Date.now() + 360000;
  assert.equal(BASE, 'http://127.0.0.1:4173', 'SEARCH_SETUP: exact loopback origin'); assert.match(SOURCE || '', /^[a-f0-9]{40}$/, 'SEARCH_SETUP: actual source SHA');
  if (process.env.GITHUB_SHA) assert.equal(SOURCE, process.env.GITHUB_SHA, 'SEARCH_SETUP: workflow head matches');
  assert(process.env.SEARCH_NAV_OUT && path.isAbsolute(process.env.SEARCH_NAV_OUT) && path.basename(OUT) === 'search-navigation-browser', 'SEARCH_SETUP: explicit named absolute output');
  assert(OUT !== ROOT && !OUT.startsWith(DIST + path.sep) && (!OUT.startsWith(ROOT + path.sep) || OUT === path.join(ROOT, 'search-navigation-browser')), 'SEARCH_SETUP: evidence outside source/dist');
  assert.equal((process.env.NODE_OPTIONS || '').trim(), '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'SEARCH_SETUP: exact offline preload');
  assert(process.env.SIM_OFFLINE_RECEIPT && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).isFile() && fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size === 0, 'SEARCH_SETUP: fresh empty transport receipt');
  if (fs.existsSync(OUT)) assert.equal(fs.readdirSync(OUT).length, 0, 'SEARCH_SETUP: never replace evidence'); else fs.mkdirSync(OUT, { recursive: true });
  prepared = true; distBefore = inventory(DIST); cacheBefore = inventory(CACHE); sourceBefore = hold();
  assert(distBefore.length > 100, 'SEARCH_SETUP: completed dist'); files = new Map(distBefore.map(value => ['/' + value.file, value]));
  const chunk = name => { const values = distBefore.filter(value => new RegExp('^assets/' + name + '-[A-Za-z0-9_-]+\\.js$').test(value.file)); assert.equal(values.length, 1, 'SEARCH_SETUP: one actual lazy chunk ' + name); return '/' + values[0].file; };
  searchAsset = chunk('Search'); menuAsset = chunk('SiteMenuPanel'); fonts = loadFonts(CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
  write('source-before.json', sourceBefore); write('dist-before.json', distBefore); write('cache-before.json', cacheBefore);
  browser = await chromium.launch({ headless: true, timeout: 10000 }); report.browserVersion = browser.version();
  for (const spec of specs) await walk(spec);
} catch (error) { report.errors.push(fail(error)); }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(fail(error)); }
  if (prepared) {
    try {
      const sourceAfter = hold(), distAfter = inventory(DIST), cacheAfter = inventory(CACHE);
      write('source-after.json', sourceAfter); write('dist-after.json', distAfter); write('cache-after.json', cacheAfter);
      assert.deepEqual(sourceAfter, sourceBefore, 'SEARCH_HOLD: selected source/dependencies byte-held');
      assert.deepEqual(distAfter, distBefore, 'SEARCH_HOLD: entire completed dist byte-held'); assert.deepEqual(cacheAfter, cacheBefore, 'SEARCH_HOLD: entire font cache byte-held');
      assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'SEARCH_HOLD: no external transport attempts');
      report.holds = { source: sha(JSON.stringify(sourceBefore)), dist: sha(JSON.stringify(distBefore)), cache: sha(JSON.stringify(cacheBefore)), unchanged: true };
    } catch (error) { report.errors.push(fail(error)); }
    const journeys = report.contexts.flatMap(value => value.journeys);
    report.actual = { contexts: report.contexts.length, completeContexts: report.contexts.filter(value => value.complete).length,
      journeys: journeys.length, completeJourneys: journeys.filter(value => value.complete).length, screenshots: report.contexts.reduce((sum, value) => sum + value.snapshots.length, 0) };
    report.complete = report.errors.length === 0 && report.holds.unchanged === true && report.actual.contexts === 2 && report.actual.completeContexts === 2
      && report.actual.journeys === 8 && report.actual.completeJourneys === 8 && report.controls.length === 8;
    report.status = report.complete ? 'SEARCH_NAVIGATION_BROWSER_COMPLETE' : 'SEARCH_NAVIGATION_BROWSER_INCOMPLETE_OR_FAILED';
    write('report.json', report);
    const names = fs.readdirSync(OUT).sort(); assert(names.every(name => fs.lstatSync(path.join(OUT, name)).isFile() && !fs.lstatSync(path.join(OUT, name)).isSymbolicLink()), 'SEARCH_EVIDENCE: flat regular evidence');
    write('evidence.sha256', names.map(name => sha(fs.readFileSync(path.join(OUT, name))) + '  ' + name).join('\n') + '\n');
  }
}
console.log('SEARCH_NAVIGATION_BROWSER ' + JSON.stringify({ status: report.status, complete: report.complete, actual: report.actual || null, controls: report.controls.length, errors: report.errors.length }));
process.exitCode = report.complete ? 0 : 1;