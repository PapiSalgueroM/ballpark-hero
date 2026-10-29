/* Source-only proposal. Runs only in the future remote completed-build proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, seed, sha, checkFonts } from './siteMenuNavigationSupport.mjs';

const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const OUT = process.env.FINDER_BROWSER_OUT, DIST = path.resolve(process.env.FINDER_DIST || 'dist');
const PROFILES = [328, 390, 1280].flatMap(width => ['light', 'dark'].map(theme => ({
  id: `${width}-${theme}`, width, height: width === 328 ? 515 : width === 390 ? 844 : 900,
  theme, mobile: width < 1280,
})));
const HELD = {
  'src/components/layout/SiteMenu.tsx': 'cefcb359a8e02fe39a77e7de812299b8579441923ee41e81f592f8cf57ebf85f',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
};
const SOURCES = [...Object.keys(HELD), 'src/components/layout/SiteMenuPanel.tsx', 'src/pages/Search.tsx',
  'src/pages/FreeKick.tsx', 'src/components/game/GameHelp.tsx', 'src/components/game/HowToPlayPopover.tsx',
  'src/components/free-kick/FreeKickBoard.tsx', 'src/App.tsx', 'src/components/layout/Header.tsx', 'src/index.css',
  'src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json', 'src/lib/nameFold.ts',
  'scripts/qa/playSiteMenuFinderMain.mjs'];
const same = (a, b, marker) => assert.deepEqual(a, b, marker);
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = () => SOURCES.map(file => { const body = fs.readFileSync(file); return { path: file, bytes: body.length, sha256: sha(body) }; });
const rowKey = row => [row.path, row.label, row.category];
const rawGrid = '  grid  ';

assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'FINDER_SETUP_REMOTE_SOURCE');
assert(OUT && path.isAbsolute(OUT) && !path.resolve(OUT).startsWith(ROOT + path.sep) && path.resolve(OUT) !== ROOT, 'FINDER_SETUP_OUTPUT_OUTSIDE_SOURCE');
assert(fs.statSync(DIST).isDirectory(), 'FINDER_SETUP_COMPLETED_DIST');
fs.mkdirSync(OUT, { recursive: true });
assert.equal(fs.readdirSync(OUT).length, 0, 'FINDER_SETUP_FRESH_OUTPUT');
const before = pins();
for (const pin of before) if (HELD[pin.path]) assert.equal(pin.sha256, HELD[pin.path], 'FINDER_HELD_MAIN_SOURCE: ' + pin.path);
const referenceBytes = fs.readFileSync(process.env.FINDER_REFERENCE_JSON);
assert.equal(sha(referenceBytes), process.env.FINDER_REFERENCE_SHA256, 'FINDER_REFERENCE_BYTES');
const reference = JSON.parse(referenceBytes);
assert(reference.schema === 1 && reference.source === process.env.GITHUB_SHA && Array.isArray(reference.catalog), 'FINDER_REFERENCE_SOURCE');
const referencePaths = ['src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json', 'src/lib/nameFold.ts'];
same(reference.inputs.map(item => item.path).sort(), [...referencePaths].sort(), 'FINDER_REFERENCE_INPUT_SET');
for (const pin of reference.inputs) assert.equal(pin.sha256, before.find(item => item.path === pin.path)?.sha256, 'FINDER_REFERENCE_INPUT_PIN');
assert(reference.queries.grid.length > 6 && new Set(reference.catalog.map(row => row.path)).size === reference.catalog.length, 'FINDER_REFERENCE_NONEMPTY_UNIQUE');
for (const row of reference.queries.grid) assert(reference.catalog.some(item => JSON.stringify(rowKey(item)) === JSON.stringify(rowKey(row))), 'FINDER_REFERENCE_REAL_CATALOG');
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
write('source-before.json', before); write('expected-reference.json', reference);

/* Browser observation only. No state, styles, locks or interface nodes are supplied. */
function collect() {
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility === 'visible';
  const describe = node => {
    if (!node) return null;
    const r = rect(node), s = getComputedStyle(node), at = r.width && r.height ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    return { tag: node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '), href: node.getAttribute('href'), rect: r,
      visible: visible(node), hit: !!at && (at === node || node.contains(at)), painted: visible(node) && [...(function* () { for (let p = node; p; p = p.parentElement) yield p; })()].every(p => Number(getComputedStyle(p).opacity) > 0),
      pointer: s.pointerEvents, current: node.getAttribute('aria-current') };
  };
  const root = document.documentElement, body = document.body, b = getComputedStyle(body), h = getComputedStyle(root);
  const menu = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].find(node => node.querySelector('nav[aria-label="Site navigation"]'));
  const trigger = [...document.querySelectorAll('button[aria-label="Open site menu"]')].find(visible);
  const field = menu?.querySelector('input[type="search"]'), region = menu?.querySelector('[aria-label="Game results"]');
  const all = menu ? [...menu.querySelectorAll('a')].find(node => node.textContent.trim() === 'See all results') : null;
  const nav = menu?.querySelector('nav[aria-label="Site navigation"]'), scroller = nav?.parentElement;
  const host = scroller?.querySelector('[data-dukb-help-cookie-choices]'), active = document.activeElement;
  return {
    href: location.href,
    viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, htmlWidth: root.scrollWidth, bodyWidth: body.scrollWidth },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    theme: root.classList.contains('light') ? 'light' : 'dark',
    trigger: describe(trigger), active: active ? { ...describe(active), trigger: active === trigger, finder: active === field,
      heading: /^H[1-6]$/.test(active.tagName), editable: active.matches('input,textarea,select,[contenteditable="true"]') } : null,
    menu: menu ? { rect: rect(menu), originalLinks: [...nav.querySelectorAll('a')].map(describe),
      cookieHostFirst: !!host && scroller.firstElementChild === host,
      cookieHosts: menu.querySelectorAll('[data-dukb-help-cookie-choices]').length,
      scroll: { height: scroller.clientHeight, total: scroller.scrollHeight, overflow: getComputedStyle(scroller).overflowY } } : null,
    field: field ? { ...describe(field), value: field.value, type: field.type, maxLength: field.maxLength,
      name: field.getAttribute('aria-label') || [...field.labels].map(node => node.textContent.trim()).join(' ') } : null,
    results: region ? [...region.querySelectorAll('a')].filter(node => node !== all).map(describe) : [],
    resultText: region?.textContent.trim() || '', seeAll: describe(all),
    locks: { bodyStyle: body.getAttribute('style'), bodyClass: body.getAttribute('class'),
      htmlStyle: root.getAttribute('style'), htmlClass: root.getAttribute('class'), bodyScrollLocked: body.getAttribute('data-scroll-locked'),
      bodyComputed: { overflow: b.overflow, overflowX: b.overflowX, overflowY: b.overflowY, pointerEvents: b.pointerEvents },
      htmlComputed: { overflow: h.overflow, overflowX: h.overflowX, overflowY: h.overflowY, pointerEvents: h.pointerEvents } },
    bodyInlineStyle: { length: body.style.length, cssText: body.style.cssText },
    anchor: rect(document.querySelector('#dukb-main h1')), trusted: window.__siteMenuTrusted || [],
  };
}
function bounds(row) {
  checkFonts(row.fonts);
  assert(row.viewport.htmlWidth <= row.viewport.width + 0.5 && row.viewport.bodyWidth <= row.viewport.width + 0.5, 'FINDER_HORIZONTAL_OVERFLOW');
}
function targetReady(row) {
  assert(row.rect?.width >= 44 && row.rect?.height >= 44, 'FINDER_TARGET_44');
  assert(row.painted && row.hit && row.pointer !== 'none' && row.rect.x >= 0 && row.rect.y >= 0
    && row.rect.right <= row.viewport.width + 0.5 && row.rect.bottom <= row.viewport.height + 0.5, 'FINDER_TARGET_PAINT_HIT');
}
function openReady(row) {
  bounds(row);
  assert(row.menu && row.field?.type === 'search' && row.field.name === 'Find a game' && row.field.maxLength === 80, 'FINDER_FIELD');
  assert(row.active?.heading && row.active.text === 'Menu' && !row.active.editable, 'FINDER_OPEN_HEADING_FOCUS');
  assert(row.menu.cookieHostFirst && row.menu.cookieHosts === 1 && row.menu.originalLinks.length === 17, 'FINDER_EXISTING_NAV_HOST');
  const r = row.menu.rect;
  assert(r.x >= 0 && r.y >= 0 && r.right <= row.viewport.width + 0.5 && r.bottom <= row.viewport.height + 0.5
    && row.menu.scroll.height > 0 && row.menu.scroll.overflow === 'auto', 'FINDER_MENU_VIEWPORT_SCROLL');
  assert.equal(row.field.value, '', 'FINDER_REOPEN_EMPTY');
}
function clubReady(row) {
  const item = row.results[0];
  assert(row.field.value === 'Club Manager' && item?.href === '/club-manager' && item.text.includes('Club Manager') && item.text.includes('Soccer'), 'FINDER_CLUB_ROUTE_CATEGORY');
}
function missReady(row) {
  assert(row.field.value === '*(' && row.results.length === 0 && /no games found/i.test(row.resultText) && !row.seeAll, 'FINDER_HONEST_MISS');
}
function clearReady(row) {
  assert(row.field.value === '' && row.results.length === 0 && row.active?.finder, 'FINDER_CLEAR_FOCUS');
}
function gridReady(row) {
  assert(row.field.value === rawGrid && row.results.length === 6, 'FINDER_GRID_SIX');
  same(row.results.map(item => item.href), reference.queries.grid.slice(0, 6).map(item => item.path), 'FINDER_GRID_EXACT_RANK');
  row.results.forEach((item, index) => assert(item.text.includes(reference.queries.grid[index].label)
    && item.text.includes(reference.queries.grid[index].category), 'FINDER_GRID_ACTUAL_LABEL_CATEGORY'));
  assert.equal(row.seeAll?.href, '/search?' + new URLSearchParams({ q: rawGrid }).toString(), 'FINDER_ALL_RAW_QUERY');
}
function lockFieldsReady(row, beforeOpen) {
  const keys = ['bodyStyle', 'bodyClass', 'htmlStyle', 'htmlClass', 'bodyScrollLocked', 'bodyComputed', 'htmlComputed'];
  same(Object.keys(row.locks).sort(), [...keys].sort(), 'FINDER_SEVEN_LOCK_FIELDS_RESTORED');
  same(Object.keys(beforeOpen.locks).sort(), [...keys].sort(), 'FINDER_SEVEN_LOCK_FIELDS_RESTORED');
  for (const key of keys.filter(key => key !== 'bodyStyle')) same(row.locks[key], beforeOpen.locks[key], 'FINDER_SEVEN_LOCK_FIELDS_RESTORED');
  const beforeStyle = beforeOpen.locks.bodyStyle, afterStyle = row.locks.bodyStyle;
  if (beforeStyle === afterStyle) return false;
  assert(beforeStyle === null && afterStyle === '' || beforeStyle === '' && afterStyle === null, 'FINDER_SEVEN_LOCK_FIELDS_RESTORED');
  assert(beforeOpen.bodyInlineStyle?.length === 0 && row.bodyInlineStyle?.length === 0, 'FINDER_EMPTY_STYLE_DECLARATIONS');
  assert(beforeOpen.bodyInlineStyle?.cssText === '' && row.bodyInlineStyle?.cssText === '', 'FINDER_EMPTY_STYLE_CSS_TEXT');
  return true;
}
function closedReady(row, beforeOpen, expected, requireTriggerFocus = true) {
  assert.equal(new URL(row.href).pathname + new URL(row.href).search, expected, 'FINDER_CLOSED_ROUTE');
  assert(!row.menu, 'FINDER_MENU_CLOSED');
  if (requireTriggerFocus) assert(row.active?.trigger && row.active.visible, 'FINDER_CLOSED_TRIGGER_FOCUS');
  targetReady({ ...row.trigger, viewport: row.viewport });
  lockFieldsReady(row, beforeOpen);
  bounds(row);
}
async function target(page, locator, row, label) {
  assert.equal(await locator.count(), 1, 'FINDER_UNIQUE_TARGET: ' + label);
  await locator.scrollIntoViewIfNeeded();
  const sample = await locator.evaluate(node => {
    const r = node.getBoundingClientRect(), s = getComputedStyle(node), at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
      painted: node.getClientRects().length > 0 && s.visibility === 'visible' && Number(s.opacity) > 0,
      pointer: s.pointerEvents, hit: !!at && (at === node || node.contains(at)), viewport: { width: innerWidth, height: innerHeight } };
  });
  row.targets.push({ label, ...sample }); targetReady(sample); return locator;
}
async function capture(page, row, name, png = false) {
  const sample = await page.evaluate(collect); bounds(sample);
  row.samples.push({ name, sample }); write(`${row.id}-${name}.json`, sample);
  if (png) {
    const file = `${row.id}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'disabled' });
    const body = fs.readFileSync(path.join(OUT, file)); row.images.push({ file, bytes: body.length, sha256: sha(body), normal: true });
  }
  return sample;
}
async function opened(page, row) {
  const trigger = page.getByRole('button', { name: 'Open site menu', exact: true });
  await target(page, trigger, row, 'Open site menu');
  const beforeOpen = await capture(page, row, `before-open-${row.openings.length}`);
  await trigger.click();
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true });
  await menu.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Menu' && /^H[1-6]$/.test(document.activeElement.tagName));
  await menu.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  const opening = await capture(page, row, `opened-${row.openings.length}`); openReady(opening);
  row.openings.push({ beforeOpen, opening });
  await target(page, menu.getByRole('button', { name: 'Close', exact: true }), row, 'Close');
  await page.keyboard.press('Tab');
  const field = menu.getByRole('searchbox', { name: 'Find a game', exact: true });
  assert(await field.evaluate(node => node === document.activeElement), 'FINDER_NATIVE_TAB_TO_FIELD');
  await target(page, field, row, 'Find a game');
  return { menu, field, beforeOpen, opening };
}
async function typed(page, field, value) {
  await field.press('ControlOrMeta+A'); await field.press('Backspace'); await field.pressSequentially(value, { delay: 10 });
  assert.equal(await field.inputValue(), value, 'FINDER_NATIVE_TYPED_VALUE');
}
async function closed(page, row, beforeOpen, expected, label, png = false, requireTriggerFocus = true) {
  const started = Date.now(), attempts = [];
  let sample, last;
  do {
    sample = await page.evaluate(collect);
    try { closedReady(sample, beforeOpen, expected, requireTriggerFocus); last = null; break; }
    catch (error) { last = { name: error.name, message: error.message }; attempts.push({ elapsedMs: Date.now() - started, sample, error: last }); }
    await page.waitForTimeout(50);
  } while (Date.now() - started < 4000);
  row.closings.push({ label, requireTriggerFocus, elapsedMs: Date.now() - started, beforeOpen, attempts, final: sample });
  assert(!last, 'FINDER_CLOSE_WITHIN_4S: ' + JSON.stringify(last));
  return capture(page, row, label, png);
}
function expectedBackend(request, url) {
  if (url.origin !== 'https://flawuiqbvjobmkfkauhw.supabase.co' || url.hash || url.username || url.password) return false;
  if (request.method() === 'POST' && url.pathname === '/rest/v1/rpc/most_played_today' && !url.search) {
    const value = JSON.parse(request.postData() || 'null');
    return value && Object.keys(value).sort().join('|') === 'p_limit|p_min' && value.p_min === 3 && value.p_limit === 3;
  }
  if (request.method() !== 'GET' || request.postData() !== null || url.pathname !== '/rest/v1/live_scores') return false;
  const q = url.searchParams, times = q.getAll('start_at');
  return [...q.keys()].sort().join('|') === 'limit|order|select|start_at|start_at' && q.get('select') === '*'
    && q.get('order') === 'start_at.asc' && q.get('limit') === '150' && times.length === 2
    && /^gte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[0])
    && /^lte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[1])
    && Date.parse(times[1].slice(4)) - Date.parse(times[0].slice(4)) === 32 * 3600 * 1000;
}
async function boundary(context, row) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const item = { method: request.method(), url: request.url(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash, 'FINDER_IO_CREDENTIAL_FRAGMENT');
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(request.method()) && request.postData() === null, 'FINDER_IO_LOCAL_METHOD');
        const isRoute = ['/', '/search', '/free-kick'].includes(url.pathname);
        const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        assert(!url.search || freshness || url.pathname === '/search' && [...url.searchParams.keys()].join('|') === 'q', 'FINDER_IO_LOCAL_QUERY');
        const decoded = decodeURIComponent(url.pathname);
        const file = path.resolve(DIST, '.' + decoded, isRoute ? 'index.html' : '');
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile()
          && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep), 'FINDER_IO_COMPLETED_DIST_FILE');
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) }); return route.continue();
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href)
        && ['font', 'stylesheet'].includes(request.resourceType())) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      if (expectedBackend(request, url)) {
        row.io.push({ ...item, kind: 'source-shell-backend-abort', requestBodySha256: request.postData() === null ? null : sha(request.postData()) });
        return route.abort('blockedbyclient');
      }
      throw new Error('FINDER_IO_UNKNOWN_REQUEST');
    } catch (error) {
      row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient');
    }
  });
  await context.routeWebSocket('**/*', socket => { row.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Scoped proof refuses sockets' }); });
}
function wireReady(row) {
  assert(row.io.some(item => item.kind === 'prepared-font') && row.io.every(item => item.kind !== 'unknown-refused'), 'FINDER_IO_KNOWN_ONLY');
  assert.equal(row.wire.pageErrors.length, 0, 'FINDER_NO_PAGE_ERRORS'); assert.equal(row.wire.sockets.length, 0, 'FINDER_NO_SOCKETS');
  const aborted = row.io.filter(item => item.kind === 'source-shell-backend-abort');
  const allowedAbortErrors = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const knownAbort = request => aborted.some(known => known.url === request.url && known.method === request.method);
  for (const item of row.wire.failed) assert(allowedAbortErrors.has(item.error) && knownAbort(item), 'FINDER_EXPLAINED_REQUEST_FAILURE');
  for (const item of row.wire.console.filter(item => item.type === 'error')) assert(row.wire.failed.some(request =>
    allowedAbortErrors.has(request.error) && knownAbort(request) && request.url === item.url
      && item.text === 'Failed to load resource: ' + request.error), 'FINDER_EXPLAINED_CONSOLE_ERROR');
}
async function journey(page, row) {
  await page.goto(BASE + '/search', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Search every game', exact: true }).waitFor(); await page.evaluate(() => document.fonts.ready);
  let session = await opened(page, row);
  assert.equal(session.opening.theme, row.profile.theme, 'FINDER_ACTUAL_THEME');
  await typed(page, session.field, 'Club Manager');
  await session.menu.locator('[aria-label="Game results"] a[href="/club-manager"]').waitFor();
  await target(page, session.menu.locator('[aria-label="Game results"] a[href="/club-manager"]'), row, 'Club Manager result');
  row.club = await capture(page, row, 'club-manager', true); clubReady(row.club);
  await typed(page, session.field, '*('); await session.menu.getByText(/no games found/i).waitFor();
  row.miss = await capture(page, row, 'punctuation-miss'); missReady(row.miss);
  const clear = await target(page, session.menu.getByRole('button', { name: 'Clear search', exact: true }), row, 'Clear search');
  await clear.click(); row.cleared = await capture(page, row, 'cleared'); clearReady(row.cleared);
  await typed(page, session.field, rawGrid);
  const results = session.menu.locator('[aria-label="Game results"] a[href]:not([href^="/search?"])');
  await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][data-state="open"] [aria-label="Game results"] a[href]:not([href^="/search?"])').length === 6);
  for (let i = 0; i < 6; i++) await target(page, results.nth(i), row, 'grid result ' + (i + 1));
  const all = await target(page, session.menu.getByRole('link', { name: 'See all results', exact: true }), row, 'See all results');
  await target(page, session.field, row, 'grid input'); row.grid = await capture(page, row, 'grid-six', true); gridReady(row.grid);
  assert.equal(row.grid.href, session.beforeOpen.href, 'FINDER_DRAFT_LOCATION_HELD');
  await target(page, all, row, 'See all results activation'); await all.click();
  const searchUrl = '/search?' + new URLSearchParams({ q: rawGrid }).toString();
  await page.waitForURL(url => url.pathname === '/search' && url.searchParams.get('q') === rawGrid);
  row.allClosed = await closed(page, row, session.beforeOpen, searchUrl, 'all-results-closed');
  row.firstCloseUsedEmptyStyleException = lockFieldsReady(row.allClosed, session.beforeOpen);
  assert(row.firstCloseUsedEmptyStyleException, 'FINDER_FIRST_CLOSE_EXERCISES_EMPTY_STYLE_EXCEPTION');
  assert.equal(await page.getByRole('textbox', { name: 'Search games', exact: true }).inputValue(), rawGrid, 'FINDER_SEARCH_ADOPTS_RAW_QUERY');
  await page.waitForFunction(() => document.querySelectorAll('#dukb-main a[data-result]').length > 6);
  row.searchResults = await page.locator('#dukb-main a[data-result]').evaluateAll(nodes => nodes.map(node => ({ path: node.getAttribute('href'), label: node.querySelector('.font-display')?.textContent.trim() || '', category: node.closest('section')?.querySelector('h2')?.textContent.replace(/\(\s*\d+\s*\)/g, '').trim() || '' })));
  for (const expected of reference.queries.grid) assert(row.searchResults.some(item => JSON.stringify(rowKey(item)) === JSON.stringify(rowKey(expected))), 'FINDER_FULL_SEARCH_CATALOG_MEMBERSHIP');
  session = await opened(page, row); await typed(page, session.field, 'Free Kick');
  await session.menu.locator('[aria-label="Game results"] a[href="/free-kick"]').waitFor();
  await page.keyboard.press('Escape'); row.escapeClosed = await closed(page, row, session.beforeOpen, searchUrl, 'escape-closed');
  session = await opened(page, row); await typed(page, session.field, 'Free Kick');
  const game = await target(page, session.menu.locator('[aria-label="Game results"] a[href="/free-kick"]'), row, 'Free Kick result');
  row.gameTabLandings = [];
  for (let count = 0; count < 20 && !(await game.evaluate(node => document.activeElement === node)); count++) {
    await page.keyboard.press('Tab'); row.gameTabLandings.push((await page.evaluate(collect)).active);
  }
  assert(await game.evaluate(node => document.activeElement === node), 'FINDER_GAME_LINK_NATIVE_TAB_FOCUS');
  await page.keyboard.press('Enter'); await page.waitForURL(url => url.pathname === '/free-kick' && !url.search && !url.hash);
  await page.getByRole('heading', { name: 'Free Kick', exact: true }).waitFor();
  await session.menu.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'How to play', exact: true, includeHidden: true }).waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  row.navigationLanding = await capture(page, row, 'free-kick-navigation-landing');
  const guide = page.getByRole('dialog', { name: 'How to play', exact: true });
  row.guide = { presentOnLanding: await guide.isVisible(), focusScope: 'Observed game landing, not a menu focus-return assertion' };
  if (row.guide.presentOnLanding) {
    row.guide.before = row.navigationLanding;
    const acknowledge = await target(page, guide.getByRole('button', { name: "Let's Play!", exact: true }), row, 'Actual game instructions acknowledgement');
    await acknowledge.click(); await guide.waitFor({ state: 'hidden' });
    row.guide.after = await closed(page, row, session.beforeOpen, '/free-kick', 'game-guide-acknowledged', false, false);
  } else {
    row.navigationClosed = await closed(page, row, session.beforeOpen, '/free-kick', 'game-navigation-closed');
  }
  session = await opened(page, row);
  await page.keyboard.press('Escape');
  row.gameBeforeOpen = session.beforeOpen;
  row.gameClosed = await closed(page, row, session.beforeOpen, '/free-kick', 'free-kick-menu-closed', true);
  assert(row.gameClosed.trusted.some(event => event.trusted && event.href === '/free-kick'), 'FINDER_NATIVE_ENTER_RESULT');
  assert.equal(row.images.length, 3, 'FINDER_THREE_NORMAL_IMAGES'); row.completed = true;
}
function copiedControls(row) {
  const firstBefore = row.openings[0].beforeOpen, searchUrl = '/search?' + new URLSearchParams({ q: rawGrid }).toString();
  assert(row.firstCloseUsedEmptyStyleException && lockFieldsReady(row.allClosed, firstBefore), 'FINDER_STYLE_CONTROL_ACTUAL_FOUNDATION');
  const failedIndex = row.wire.failed.findIndex(request => row.io.some(item => item.kind === 'source-shell-backend-abort' && item.url === request.url && item.method === request.method));
  const consoleIndex = row.wire.console.findIndex(item => item.type === 'error' && row.wire.failed.some(request =>
    request.url === item.url && item.text === 'Failed to load resource: ' + request.error
      && row.io.some(known => known.kind === 'source-shell-backend-abort' && known.url === request.url && known.method === request.method)));
  assert(failedIndex >= 0 && consoleIndex >= 0, 'FINDER_ABORT_CONTROLS_ACTUAL_FOUNDATION');
  wireReady(row);
  const foundation = JSON.stringify(row) + '\n', controls = [];
  fs.writeFileSync(path.join(OUT, 'control-foundation.json'), foundation, { flag: 'wx' });
  const control = (id, mutate, judge, marker) => {
    const copy = JSON.parse(foundation); mutate(copy); const changed = JSON.stringify(copy) + '\n', file = path.join(OUT, 'control-' + id + '.json');
    assert.notEqual(sha(changed), sha(foundation), 'FINDER_CONTROL_CHANGED'); fs.writeFileSync(file, changed, { flag: 'wx' });
    const changedFile = 'control-' + id + '.changed.json';
    fs.writeFileSync(path.join(OUT, changedFile), fs.readFileSync(file), { flag: 'wx' });
    let failure;
    try { judge(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (error) { failure = error; }
    assert(failure instanceof assert.AssertionError && failure.message.includes(marker), 'FINDER_CONTROL_OWNED: ' + id);
    fs.writeFileSync(file, foundation); assert.equal(sha(fs.readFileSync(file)), sha(foundation), 'FINDER_CONTROL_SAME_COPY_RESTORE'); judge(JSON.parse(fs.readFileSync(file, 'utf8')));
    controls.push({ id, copiedObservation: true, marker, foundation: 'control-foundation.json', changedFile, restoredFile: path.basename(file), beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(file)), sameCopyRestored: true, actualFailure: { name: failure.name, message: failure.message } });
  };
  control('catalog-route', copy => { copy.club.results[0].href = '/search'; }, copy => clubReady(copy.club), 'FINDER_CLUB_ROUTE_CATEGORY');
  control('rank-order', copy => { [copy.grid.results[0], copy.grid.results[1]] = [copy.grid.results[1], copy.grid.results[0]]; }, copy => gridReady(copy.grid), 'FINDER_GRID_EXACT_RANK');
  control('false-miss', copy => { copy.miss.results = [copy.club.results[0]]; }, copy => missReady(copy.miss), 'FINDER_HONEST_MISS');
  control('clear-draft', copy => { copy.cleared.field.value = '*('; }, copy => clearReady(copy.cleared), 'FINDER_CLEAR_FOCUS');
  control('all-query', copy => { copy.grid.seeAll.href = '/search?q=other'; }, copy => gridReady(copy.grid), 'FINDER_ALL_RAW_QUERY');
  control('editable-autofocus', copy => { copy.openings[0].opening.active.editable = true; }, copy => openReady(copy.openings[0].opening), 'FINDER_OPEN_HEADING_FOCUS');
  control('short-target', copy => { copy.targets[0].rect.height = 43; }, copy => targetReady(copy.targets[0]), 'FINDER_TARGET_44');
  control('unpainted-trigger', copy => { copy.gameClosed.trigger.painted = false; }, copy => closedReady(copy.gameClosed, copy.gameBeforeOpen, '/free-kick'), 'FINDER_TARGET_PAINT_HIT');
  control('retained-lock', copy => { copy.gameClosed.locks.bodyScrollLocked = '1'; }, copy => closedReady(copy.gameClosed, copy.gameBeforeOpen, '/free-kick'), 'FINDER_SEVEN_LOCK_FIELDS_RESTORED');
  control('lost-focus', copy => { copy.gameClosed.active.trigger = false; }, copy => closedReady(copy.gameClosed, copy.gameBeforeOpen, '/free-kick'), 'FINDER_CLOSED_TRIGGER_FOCUS');
  control('nonempty-style-declarations', copy => { copy.allClosed.bodyInlineStyle.length = 1; }, copy => closedReady(copy.allClosed, copy.openings[0].beforeOpen, searchUrl), 'FINDER_EMPTY_STYLE_DECLARATIONS');
  control('nonempty-style-css-text', copy => { copy.allClosed.bodyInlineStyle.cssText = 'overflow: hidden;'; }, copy => closedReady(copy.allClosed, copy.openings[0].beforeOpen, searchUrl), 'FINDER_EMPTY_STYLE_CSS_TEXT');
  control('unknown-request-abort-error', copy => { copy.wire.failed[failedIndex].error = 'net::ERR_BLOCKED_BY_CLIENT.InspectorExtra'; }, copy => wireReady(copy), 'FINDER_EXPLAINED_REQUEST_FAILURE');
  control('unknown-console-abort-error', copy => { copy.wire.console[consoleIndex].text = 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.InspectorExtra'; }, copy => wireReady(copy), 'FINDER_EXPLAINED_CONSOLE_ERROR');
  return controls;
}

const report = { source: process.env.GITHUB_SHA, baselineMain: '5d1198389d436ddb615c816a1330d57296a6d9d2', referenceSHA256: sha(referenceBytes),
  scope: 'Actual built main-family Menu finder and Search/Free Kick route shells only', planned: { profiles: 6, normalImages: 18, copiedControls: 14 },
  limits: ['No old branch proof transfer, gameplay, live backend, full release, physical fault or universal accessibility claim.',
    'Targets are measured after deliberate scrolling. Screenshots are viewport frames; twelve to eighteen views are not whole-page coverage.',
    'Copied checker controls modify retained observations only, with same-file byte restoration.'], contexts: [], controls: [], failures: [] };
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, timeout: 30000 });
  for (const profile of PROFILES) {
    const row = { id: profile.id, profile, completed: false, samples: [], targets: [], images: [], openings: [], closings: [], io: [],
      wire: { pageErrors: [], console: [], failed: [], sockets: [] } }; report.contexts.push(row);
    let context, page, timer;
    try {
      context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1,
        colorScheme: profile.theme, isMobile: profile.mobile, hasTouch: profile.mobile, reducedMotion: profile.mobile ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
      context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
      await context.addInitScript(seed, { theme: profile.theme, pending: false }); await boundary(context, row);
      page = await context.newPage();
      page.on('pageerror', error => row.wire.pageErrors.push({ message: error.message, stack: error.stack }));
      page.on('console', message => row.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
      page.on('requestfailed', request => row.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
      await Promise.race([journey(page, row), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('FINDER_CONTEXT_DEADLINE')), 90000); })]);
    } catch (error) {
      row.completed = false; report.failures.push({ profile: row.id, name: error.name, message: error.message, stack: error.stack });
      if (page && !page.isClosed()) try { await capture(page, row, 'failure-current'); } catch (captureError) { row.captureFailure = captureError.message; }
    } finally {
      clearTimeout(timer);
      if (context) try { await context.close(); } catch (error) { row.completed = false; report.failures.push({ profile: row.id, name: error.name, message: error.message }); }
      try { wireReady(row); } catch (error) { row.completed = false; report.failures.push({ profile: row.id, name: error.name, message: error.message }); }
      write(row.id + '-context.json', row);
    }
  }
  assert(report.contexts.every(row => row.completed), 'FINDER_ALL_SIX_NORMAL_CONTEXTS');
  report.controls = copiedControls(report.contexts[0]); assert.equal(report.controls.length, 14, 'FINDER_FOURTEEN_COPIED_CONTROLS');
} catch (error) { report.failures.push({ name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.failures.push({ name: error.name, message: error.message }); }
  try { const after = pins(); write('source-after.json', after); same(after, before, 'FINDER_SELECTED_SOURCE_HELD'); }
  catch (error) { report.failures.push({ name: error.name, message: error.message }); }
  report.normalImages = report.contexts.flatMap(row => row.images);
  report.allFirstClosesUsedEmptyStyleException = report.contexts.length === 6 && report.contexts.every(row => row.firstCloseUsedEmptyStyleException === true);
  report.completed = report.contexts.length === 6 && report.contexts.every(row => row.completed) && report.allFirstClosesUsedEmptyStyleException && report.controls.length === 14
    && report.normalImages.length === 18 && report.failures.length === 0;
  write('report.json', report);
}
assert(report.completed, 'FINDER_COMPLETE_SIX_PROFILES_EIGHTEEN_NORMAL_IMAGES_FOURTEEN_COPIED_CONTROLS');
console.log('Main-family Menu finder: six profiles, eighteen normal images and fourteen effective copied checker controls passed.');
