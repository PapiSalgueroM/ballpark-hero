/* Remote-only built-menu proof. Native inputs and actual DOM observations only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { seed, checkFonts, checkMenu, loadFonts, sha } from './siteMenuNavigationSupport.mjs';

const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const OUT = path.resolve(process.env.CHROME_RECIPE_OUT || '');
const SPECS = [
  { id: '328-light', width: 328, height: 515, theme: 'light', mobile: true },
  { id: '328-dark', width: 328, height: 515, theme: 'dark', mobile: true },
  { id: '390-light', width: 390, height: 844, theme: 'light', mobile: true },
  { id: '390-dark', width: 390, height: 844, theme: 'dark', mobile: true },
  { id: '1280-light', width: 1280, height: 900, theme: 'light', mobile: false },
  { id: '1280-dark', width: 1280, height: 900, theme: 'dark', mobile: false },
];
const INPUTS = ['src/components/layout/SiteMenu.tsx', 'src/components/layout/SiteMenuPanel.tsx',
  'src/components/layout/siteMenuFocus.ts', 'src/components/ui/sheet.tsx', 'src/lib/siteSearch.ts',
  'src/data/gameRegistry.ts', 'src/pages/Search.tsx', 'src/pages/FreeKick.tsx', 'src/App.tsx', 'scripts/lib/playwrightLoader.mjs',
  'scripts/lib/offlineTransport.cjs', 'scripts/qa/siteMenuNavigationSupport.mjs',
  'scripts/qa/sharedChromePreload.cjs', 'scripts/qa/playSiteMenuFinder.mjs'];
const PINNED = {
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'scripts/qa/sharedChromePreload.cjs': '9e9da5a8e8ae62578e08d0df3ab5dd80acdbee3c40e6862fce9a1e83af0da57f',
};
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const inputRows = () => INPUTS.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: body.length, sha256: sha(body) }; });
const same = (a, b, marker) => assert.deepEqual(a, b, marker);
const closeEnough = (a, b) => Math.abs(a - b) <= 0.5;
function fieldReady(row) {
  assert(row.finder && row.finder.tag === 'INPUT' && row.finder.type === 'search'
    && row.finder.name === 'Find a game' && row.finder.maxLength === 80, 'FINDER_FIELD: actual labelled search input');
}
function openReady(row) {
  checkFonts(row.fonts); checkMenu(row); fieldReady(row);
  assert(row.active && row.active.heading && row.active.text === 'Menu' && !row.active.editable,
    'FINDER_OPEN_FOCUS: actual noneditable Menu heading owns initial focus');
  assert(row.cookieHost && row.cookieHost.first && row.cookieHost.count === 1, 'FINDER_COOKIE_HOST: existing host is first scroll child');
  assert(row.viewport.documentWidth <= row.viewport.width && row.viewport.bodyWidth <= row.viewport.width,
    'FINDER_NO_X_OVERFLOW: actual document and body widths fit');
}
function targetReady(row) {
  assert(row.rect && row.rect.width >= 44 && row.rect.height >= 44, 'FINDER_TARGET_44: actual whole control hitbox');
  assert(row.rect.x >= 0 && row.rect.y >= 0 && row.rect.right <= row.viewport.width
    && row.rect.bottom <= row.viewport.height && row.hit, 'FINDER_TARGET_HIT: actual visible owner hit');
  assert(row.viewport.documentWidth <= row.viewport.width, 'FINDER_NO_X_OVERFLOW: target document fits');
}
function stable(before, after) {
  assert(before.anchor && after.anchor, 'FINDER_ANCHOR_PRESENT: actual Search page heading');
  assert(['x', 'y', 'width', 'height'].every(key => closeEnough(before.anchor[key], after.anchor[key]))
    && before.viewport.scrollX === after.viewport.scrollX, 'FINDER_PAGE_ANCHOR: draft editing does not move page anchor');
}
function clubReady(row) {
  fieldReady(row);
  assert(row.finder.value === 'Club Manager' && row.results.length > 0 && row.results[0].href === '/club-manager'
    && row.results[0].text.includes('Club Manager') && row.results[0].text.includes('Soccer'),
  'FINDER_CATALOG: actual Club Manager label, category and route');
}
function missReady(row) {
  assert(row.finder.value === '*(' && row.results.length === 0 && /no games found/i.test(row.resultText),
    'FINDER_NO_RESULTS: punctuation is an honest empty result');
}
function clearReady(row) {
  assert(row.finder.value === '' && row.results.length === 0 && row.active?.finder,
    'FINDER_CLEAR: actual empty input regains focus');
}
function gridReady(row, search) {
  assert(row.finder.value === 'grid' && row.results.length === 6
    && new Set(row.results.map(item => item.href)).size === 6, 'FINDER_SIX_RESULTS: six distinct actual game links');
  assert(search.length > 6, 'FINDER_FULL_SEARCH: actual Search page has more than six grid matches');
  for (const result of row.results) {
    const actual = search.find(item => item.href === result.href);
    assert(actual && actual.label && actual.category && result.text.includes(actual.label) && result.text.includes(actual.category),
      'FINDER_RESULT_REFERENCE: finder label, category and href belong to actual Search results');
  }
  assert(row.seeAll?.href === '/search?' + new URLSearchParams({ q: 'grid' }).toString(),
    'FINDER_ALL_HREF: full query uses existing Search route');
}
function closedReady(row, baseline, pathname) {
  assert(new URL(row.href).pathname === pathname && !row.menu && row.active?.trigger && row.active.visible,
    'FINDER_CLOSED_FOCUS: actual route, closed dialog and visible trigger focus');
  same(row.locks, baseline.locks, 'FINDER_BODY_RELEASE: body and document scroll locks restored');
  assert(!row.locks.bodyLock && row.locks.bodyPointer !== 'none' && row.locks.rootPointer !== 'none',
    'FINDER_BODY_RELEASE: no remaining modal lock');
}
function wireReady(events, io) {
  assert.equal(events.pageErrors.length, 0, 'FINDER_PAGE_ERRORS: no page errors');
  assert.equal(events.webSockets.length, 0, 'FINDER_WEBSOCKET: no socket attempt');
  assert(io.length > 0 && io.some(row => row.kind === 'prepared-font'), 'FINDER_PREPARED_FONTS: boundary served cached fonts');
  assert(io.every(row => ['prepared-font', 'source-shell-fixture', 'local-flag-abort'].includes(row.kind)),
    'FINDER_IO_UNKNOWN: only unchanged boundary source contracts');
  const flags = io.filter(row => row.kind === 'local-flag-abort').map(row => row.url).sort();
  const failed = events.requestFailures.map(row => {
    assert(row.method === 'GET' && row.type === 'image' && row.error === 'net::ERR_BLOCKED_BY_CLIENT',
      'FINDER_REQUEST_FAILURE: only exact deliberate flag image refusal');
    return row.url;
  }).sort();
  same(failed, flags, 'FINDER_FLAG_FAILURES: exact actual refused-image multiset');
  const consoleUrls = events.consoleErrors.map(row => {
    assert(row.text === 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
      'FINDER_CONSOLE_ERROR: no unexplained console error');
    return row.location.url;
  }).sort();
  same(consoleUrls, flags, 'FINDER_FLAG_CONSOLE: exact deliberate refusal URL multiset');
}
function readIo() {
  const file = path.join(OUT, 'browser-io.jsonl');
  assert(fs.existsSync(file), 'FINDER_IO_LOG: unchanged preload output exists');
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}
/* Executes only in the future browser. It observes rendered state, never supplies it. */
function collect() {
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => { if (!node) return false; const s = getComputedStyle(node); return node.getClientRects().length > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.visibility !== 'collapse'; };
  const describe = node => node ? { tag: node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '),
    href: node.getAttribute('href'), rect: rect(node), current: node.getAttribute('aria-current') } : null;
  const menu = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].find(node => node.querySelector('nav[aria-label="Site navigation"]'));
  const nav = menu?.querySelector('nav[aria-label="Site navigation"]'), scroller = nav?.parentElement;
  const field = menu?.querySelector('input[aria-label="Find a game"],input[type="search"]');
  const region = menu?.querySelector('[aria-label="Game results"]'), all = menu ? [...menu.querySelectorAll('a')].find(node => node.textContent.trim() === 'See all results') : null;
  const active = document.activeElement, triggerNodes = [...document.querySelectorAll('button[aria-label="Open site menu"]')];
  const trigger = triggerNodes.find(visible), root = document.documentElement, b = getComputedStyle(document.body), d = getComputedStyle(root);
  const host = scroller?.querySelector('[data-dukb-help-cookie-choices]');
  return {
    href: location.href, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY,
      documentWidth: root.scrollWidth, bodyWidth: document.body.scrollWidth },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'),
      faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    active: active ? { ...describe(active), visible: visible(active), editable: active.matches('input,textarea,select,[contenteditable="true"]'),
      heading: /^H[1-6]$/.test(active.tagName), finder: active === field, trigger: triggerNodes.includes(active) } : null,
    trigger: describe(trigger), anchor: rect(document.querySelector('#dukb-main h1')),
    menu: menu ? { rect: rect(menu), links: [...nav.querySelectorAll('a[href]')].map(describe),
      close: [...menu.querySelectorAll('button')].filter(node => node.textContent.trim() === 'Close').map(describe),
      scroller: scroller ? { rect: rect(scroller), height: scroller.clientHeight, scrollHeight: scroller.scrollHeight,
        scrollTop: scroller.scrollTop, overflow: getComputedStyle(scroller).overflowY } : null } : null,
    finder: field ? { ...describe(field), name: field.getAttribute('aria-label') || [...field.labels].map(label => label.textContent.trim()).join(' '),
      type: field.type, value: field.value, maxLength: field.maxLength } : null,
    results: region ? [...region.querySelectorAll('a[href]')].filter(node => node !== all).map(describe) : [], resultText: region?.textContent.trim() || '',
    seeAll: describe(all), cookieHost: host ? { count: menu.querySelectorAll('[data-dukb-help-cookie-choices]').length, first: scroller.firstElementChild === host } : null,
    locks: { bodyOverflow: b.overflow, bodyOverflowY: b.overflowY, rootOverflow: d.overflow, rootOverflowY: d.overflowY,
      bodyPointer: b.pointerEvents, rootPointer: d.pointerEvents, bodyLock: document.body.getAttribute('data-scroll-locked') },
    theme: { light: root.classList.contains('light') },
    media: { coarse: matchMedia('(pointer: coarse)').matches, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }, trusted: window.__siteMenuTrusted || [], events: window.__finderEvents || [],
  };
}
async function target(page, locator, label, row) {
  assert.equal(await locator.count(), 1, 'FINDER_TARGET_UNIQUE: ' + label);
  await locator.scrollIntoViewIfNeeded();
  const sample = await locator.evaluate(node => {
    const r = node.getBoundingClientRect(), owner = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { tag: node.tagName, text: node.textContent.trim(), href: node.getAttribute('href'),
      rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
      hit: !!owner && (owner === node || node.contains(owner)),
      hitNode: owner ? { tag: owner.tagName, text: owner.textContent.trim().slice(0, 100) } : null,
      viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth } };
  });
  row.targets.push({ label, ...sample }); targetReady(sample);
  return locator;
}
async function snapshot(page, row, name, png = true) {
  const sample = await page.evaluate(collect);
  row.observations.push({ name, sample });
  write(row.id + '-' + name + '.json', sample);
  if (png) {
    const file = row.id + '-' + name + '.png';
    await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'disabled' });
    const body = fs.readFileSync(path.join(OUT, file));
    row.images.push({ file, bytes: body.length, sha256: sha(body) });
  }
  if (sample.menu) {
    checkMenu(sample);
    assert(sample.cookieHost?.first && sample.cookieHost.count === 1, 'FINDER_COOKIE_HOST: existing first scroll child stays intact');
  }
  return sample;
}
async function opened(page, row) {
  const trigger = page.locator('button[aria-label="Open site menu"]:visible');
  await target(page, trigger, 'Open site menu', row);
  await trigger.click();
  const menu = page.getByRole('dialog').filter({ has: page.getByRole('navigation', { name: 'Site navigation', exact: true }) });
  await menu.waitFor({ state: 'visible' });
  await menu.evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
  await page.waitForFunction(() => /^H[1-6]$/.test(document.activeElement?.tagName || '') && document.activeElement?.textContent.trim() === 'Menu');
  const sample = await page.evaluate(collect); openReady(sample);
  assert.equal(sample.finder.value, '', 'FINDER_OPEN_RESET: opening starts empty');
  await page.keyboard.press('Tab');
  const field = menu.getByRole('searchbox', { name: 'Find a game', exact: true });
  assert(await field.evaluate(node => document.activeElement === node), 'FINDER_NATIVE_TAB: actual Tab enters finder');
  await target(page, field, 'Find a game', row);
  return { menu, field, baseline: sample };
}
async function waitClosed(page, menu) {
  await menu.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => {
    const node = document.activeElement;
    return node?.matches('button[aria-label="Open site menu"]') && node.getClientRects().length > 0;
  });
}
async function typed(page, field, value) {
  await field.press('ControlOrMeta+A'); await field.press('Backspace'); await field.pressSequentially(value);
  await page.waitForFunction(expected => {
    const node = document.querySelector('[role="dialog"][data-state="open"] input[type="search"]');
    return node?.value === expected;
  }, value);
}
async function journey(context, row) {
  const page = await context.newPage(); row.page = page;
  page.on('pageerror', error => row.wire.pageErrors.push({ message: error.message, stack: error.stack }));
  page.on('console', message => {
    row.wire.console.push({ type: message.type(), text: message.text(), location: message.location() });
    if (message.type() === 'error') row.wire.consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on('requestfailed', request => row.wire.requestFailures.push({ url: request.url(), method: request.method(),
    type: request.resourceType(), error: request.failure()?.errorText || null }));
  await page.goto(BASE + '/search', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('heading', { name: 'Search every game', exact: true }).waitFor();
  const baseline = await page.evaluate(collect); checkFonts(baseline.fonts); row.baseline = baseline;
  assert.equal(baseline.theme.light, row.spec.theme === 'light', 'FINDER_THEME: actual seeded theme');
  assert.equal(baseline.media.coarse, row.spec.mobile, 'FINDER_POINTER: actual coarse phone or fine desktop');
  assert.equal(baseline.media.reduce, row.spec.mobile, 'FINDER_MOTION: reduced phones and full desktop');
  let { menu, field, baseline: anchor } = await opened(page, row);
  const open = await snapshot(page, row, 'open'); fieldReady(open);
  row.openFocus = anchor;
  await typed(page, field, 'Club Manager');
  await menu.locator('[aria-label="Game results"] a[href="/club-manager"]').waitFor();
  await target(page, menu.locator('[aria-label="Game results"] a[href="/club-manager"]'), 'Club Manager result', row);
  await target(page, field, 'Club Manager input', row);
  const club = await snapshot(page, row, 'club-manager'); clubReady(club); stable(anchor, club);
  assert.equal(club.href, baseline.href, 'FINDER_DRAFT_URL: typing stays out of location');
  row.club = club;
  await typed(page, field, '*(');
  await menu.getByText(/no games found/i).waitFor();
  const miss = await snapshot(page, row, 'no-results'); missReady(miss); stable(anchor, miss); row.miss = miss;
  const clear = menu.getByRole('button', { name: 'Clear search', exact: true });
  await target(page, clear, 'Clear search', row); await clear.click();
  const cleared = await snapshot(page, row, 'cleared', false); clearReady(cleared); stable(anchor, cleared); row.cleared = cleared;
  assert.equal(cleared.href, baseline.href, 'FINDER_CLEAR_URL: clearing stays out of location');
  await typed(page, field, 'grid');
  const results = menu.locator('[aria-label="Game results"] a[href]:not([href^="/search?"])');
  await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][data-state="open"] [aria-label="Game results"] a[href]:not([href^="/search?"])').length === 6);
  for (let i = 0; i < 6; i++) await target(page, results.nth(i), 'grid result ' + (i + 1), row);
  const all = menu.getByRole('link', { name: 'See all results', exact: true });
  await target(page, all, 'See all results', row);
  await target(page, menu.getByRole('button', { name: 'Close', exact: true }), 'Close', row);
  await target(page, field, 'grid input', row);
  const grid = await snapshot(page, row, 'six-results'); stable(anchor, grid); row.grid = grid;
  assert.equal(grid.href, baseline.href, 'FINDER_DRAFT_URL: broad query stays local');
  await target(page, all, 'See all results navigation', row); await all.click();
  await page.waitForURL(url => url.pathname === '/search' && url.searchParams.get('q') === 'grid');
  await waitClosed(page, menu);
  await page.waitForFunction(() => document.querySelector('input[aria-label="Search games"]')?.value === 'grid'
    && document.querySelectorAll('#dukb-main a[data-result]').length > 6);
  row.searchReference = await page.locator('#dukb-main a[data-result]').evaluateAll(nodes => nodes.map(node => ({
    href: node.getAttribute('href'), label: node.querySelector('.font-display')?.textContent.trim() || '',
    category: node.closest('section')?.querySelector('h2')?.textContent.replace(/\(\s*\d+\s*\)/g, '').trim() || '',
  })));
  gridReady(grid, row.searchReference);
  row.allClosed = await snapshot(page, row, 'all-results-route', false);
  closedReady(row.allClosed, baseline, '/search');
  same([...new URL(row.allClosed.href).searchParams.entries()], [['q', 'grid']], 'FINDER_ALL_QUERY: actual full query');
  ({ menu, field } = await opened(page, row));
  row.reopened = await snapshot(page, row, 'route-reset', false);
  await typed(page, field, 'Free Kick');
  await menu.locator('[aria-label="Game results"] a[href="/free-kick"]').waitFor();
  const dismiss = menu.getByRole('button', { name: 'Close', exact: true });
  await target(page, dismiss, 'Close after finder edit', row); await dismiss.click();
  await waitClosed(page, menu);
  row.dismissed = await snapshot(page, row, 'dismissed', false); closedReady(row.dismissed, baseline, '/search');
  ({ menu, field } = await opened(page, row));
  await typed(page, field, 'Free Kick');
  const game = menu.locator('[aria-label="Game results"] a[href="/free-kick"]');
  await game.waitFor(); await target(page, game, 'Free Kick result', row);
  await game.focus();
  assert(await game.evaluate(node => document.activeElement === node), 'FINDER_RESULT_FOCUS: actual game link');
  await game.press('Enter');
  await page.waitForURL(url => url.pathname === '/free-kick' && !url.search && !url.hash);
  await page.getByRole('heading', { name: 'Free Kick', exact: true }).waitFor();
  await waitClosed(page, menu);
  row.gameClosed = await snapshot(page, row, 'free-kick-closed'); closedReady(row.gameClosed, baseline, '/free-kick');
  row.scrollProbe = await page.evaluate(() => {
    const before = scrollY, maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollBy({ top: before < maximum ? 1 : -1, behavior: 'instant' });
    return { before, after: scrollY, maximum };
  });
  if (row.scrollProbe.maximum > 1) assert.notEqual(row.scrollProbe.after, row.scrollProbe.before, 'FINDER_SCROLL_RELEASE: actual page scrolling responds');
  assert(row.gameClosed.trusted.some(event => event.trusted && event.href === '/free-kick'),
    'FINDER_NATIVE_RESULT: real Enter activated actual result link');
  assert.equal(row.images.length, 5, 'FINDER_IMAGES: five original viewport captures');
  row.completed = true;
}
function copiedControls(row) {
  const controls = [], foundation = JSON.stringify(row) + '\n';
  fs.writeFileSync(path.join(OUT, 'control-foundation.json'), foundation, { flag: 'wx' });
  const control = (id, mutate, judge, marker) => {
    const original = JSON.stringify(row), changed = JSON.parse(original); mutate(changed);
    const encoded = JSON.stringify(changed) + '\n';
    fs.writeFileSync(path.join(OUT, 'control-' + id + '.changed.json'), encoded, { flag: 'wx' });
    assert.notEqual(sha(encoded), sha(foundation), 'FINDER_CONTROL_CHANGED: ' + id);
    let failure;
    try { judge(changed); } catch (error) { failure = error; }
    assert(failure instanceof assert.AssertionError && String(failure.message).includes(marker), 'FINDER_CONTROL_OWNED: ' + id);
    controls.push({ id, foundation: 'control-foundation.json', changedFile: 'control-' + id + '.changed.json',
      beforeSha256: sha(foundation), changedSha256: sha(encoded),
      error: { name: failure.name, message: failure.message, code: failure.code }, marker });
  };
  control('wrong-game-href', copy => { copy.club.results[0].href = '/search'; }, copy => clubReady(copy.club), 'FINDER_CATALOG');
  control('missing-sixth-result', copy => { copy.grid.results.pop(); }, copy => gridReady(copy.grid, copy.searchReference), 'FINDER_SIX_RESULTS');
  control('foreign-result', copy => { copy.grid.results[0].href = '/not-a-game'; }, copy => gridReady(copy.grid, copy.searchReference), 'FINDER_RESULT_REFERENCE');
  control('wrong-query-href', copy => { copy.grid.seeAll.href = '/search?q=football'; }, copy => gridReady(copy.grid, copy.searchReference), 'FINDER_ALL_HREF');
  control('clear-retains-draft', copy => { copy.cleared.finder.value = '*('; }, copy => clearReady(copy.cleared), 'FINDER_CLEAR');
  control('editable-open-focus', copy => { copy.openFocus.active.editable = true; }, copy => openReady(copy.openFocus), 'FINDER_OPEN_FOCUS');
  control('short-hitbox', copy => { copy.targets[0].rect.height = 43; }, copy => targetReady(copy.targets[0]), 'FINDER_TARGET_44');
  control('obscured-hitbox', copy => { copy.targets[0].hit = false; }, copy => targetReady(copy.targets[0]), 'FINDER_TARGET_HIT');
  control('closed-focus-lost', copy => { copy.gameClosed.active.trigger = false; }, copy => closedReady(copy.gameClosed, copy.baseline, '/free-kick'), 'FINDER_CLOSED_FOCUS');
  control('body-remains-locked', copy => { copy.gameClosed.locks.bodyLock = '1'; }, copy => closedReady(copy.gameClosed, copy.baseline, '/free-kick'), 'FINDER_BODY_RELEASE');
  return controls;
}

assert.equal(process.env.CI, 'true', 'FINDER_REMOTE_ONLY: CI required');
assert.match(process.env.GITHUB_SHA || '', /^[a-f0-9]{40}$/, 'FINDER_SOURCE: exact current head required');
assert(path.isAbsolute(process.env.CHROME_RECIPE_OUT || '') && OUT !== ROOT && !OUT.startsWith(ROOT + path.sep), 'FINDER_OUTPUT: outside checkout');
assert(/sharedChromePreload\.cjs/.test(process.env.NODE_OPTIONS || '') && /offlineTransport\.cjs/.test(process.env.NODE_OPTIONS || ''), 'FINDER_IO_SETUP: both existing boundaries required');
fs.mkdirSync(OUT, { recursive: true });
assert.equal(fs.readdirSync(OUT).length, 0, 'FINDER_OUTPUT: fresh output only');
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const before = inputRows();
for (const item of before) if (PINNED[item.file]) assert.equal(item.sha256, PINNED[item.file], 'FINDER_HELD_SOURCE: ' + item.file);
write('inputs-before.json', before);
const report = { source: process.env.GITHUB_SHA, base: process.env.BASE_SOURCE || null,
  planned: { contexts: 6, screenshots: 30, controls: 10 }, scope: 'Actual built Menu finder, Search navigation and Free Kick route shell only',
  limits: ['No game play, provider writes, production page outcomes, OS keyboard observation or full-site qualification.', 'Each used target is measured after deliberate scrolling; all results need not fit one phone fold.'],
  contexts: [], controls: [], failures: [] };
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, timeout: 30000 });
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i], row = { id: spec.id, spec, observations: [], images: [], targets: [],
      wire: { pageErrors: [], console: [], consoleErrors: [], requestFailures: [], webSockets: [] }, completed: false };
    report.contexts.push(row);
    let context, timer;
    try {
      context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
        isMobile: spec.mobile, hasTouch: spec.mobile, colorScheme: spec.theme, reducedMotion: spec.mobile ? 'reduce' : 'no-preference' });
      context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
      await context.addInitScript(seed, { theme: spec.theme, pending: false });
      await context.addInitScript(() => {
        window.__finderEvents = [];
        for (const type of ['pointerdown', 'keydown', 'input', 'focusin']) document.addEventListener(type, event => {
          const node = event.target;
          if (!(node instanceof Element) || window.__finderEvents.length >= 512) return;
          if (!node.closest('[role="dialog"]') && !node.closest('button[aria-label="Open site menu"]')) return;
          window.__finderEvents.push({ type, trusted: event.isTrusted, tag: node.tagName,
            name: node.getAttribute('aria-label'), key: event instanceof KeyboardEvent ? event.key : null,
            value: node instanceof HTMLInputElement ? node.value : null });
        }, true);
      });
      await context.routeWebSocket('**/*', socket => {
        row.wire.webSockets.push({ url: socket.url() });
        socket.close({ code: 1008, reason: 'Finder qualification refuses all sockets locally' });
      });
      await Promise.race([journey(context, row), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('FINDER_CONTEXT_TIMEOUT: ' + spec.id)), 90000);
      })]);
    } catch (error) {
      row.completed = false; row.failure = { name: error.name, message: error.message, stack: error.stack };
      report.failures.push({ context: row.id, ...row.failure });
      if (row.page && !row.page.isClosed()) {
        try { await snapshot(row.page, row, 'failure-current'); } catch (captureError) { row.captureFailure = { message: captureError.message }; }
      }
    } finally {
      clearTimeout(timer);
      if (row.page && !row.page.isClosed()) {
        try { wireReady(row.wire, readIo().filter(event => event.context === i + 1)); }
        catch (error) {
          row.completed = false; row.preCloseWireFailure = { name: error.name, message: error.message };
          report.failures.push({ context: row.id, ...row.preCloseWireFailure });
          try { await snapshot(row.page, row, 'failure-io'); }
          catch (captureError) { row.ioCaptureFailure = { message: captureError.message }; }
        }
        try { await snapshot(row.page, row, 'before-close-current', false); }
        catch (error) { row.preCloseCaptureFailure = { message: error.message }; report.failures.push({ context: row.id, ...row.preCloseCaptureFailure }); }
      }
      if (context) { try { await context.close(); } catch (error) { row.closeFailure = { message: error.message }; report.failures.push({ context: row.id, ...row.closeFailure }); } }
      delete row.page;
      try {
        row.io = readIo().filter(event => event.context === i + 1);
        for (const event of row.io.filter(event => event.kind === 'prepared-font')) {
          assert(fonts.get(event.url)?.sha256 === event.sha256, 'FINDER_FONT_BODY: exact prepared cache body');
        }
        wireReady(row.wire, row.io);
      } catch (error) { row.wireFailure = { name: error.name, message: error.message }; report.failures.push({ context: row.id, ...row.wireFailure }); }
      write(row.id + '-context.json', row);
    }
  }
  const sample = report.contexts.find(row => row.completed && !row.wireFailure);
  assert(sample, 'FINDER_CONTROL_FOUNDATION: one complete actual observation');
  report.controls = copiedControls(sample);
  write('copied-record-controls.json', report.controls);
  assert.equal(report.controls.length, 10, 'FINDER_CONTROLS: ten changed copied-observation controls');
} catch (error) {
  report.failures.push({ name: error.name, message: error.message, stack: error.stack });
} finally {
  if (browser) { try { await browser.close(); } catch (error) { report.failures.push({ name: error.name, message: error.message }); } }
  try { const after = inputRows(); write('inputs-after.json', after); same(after, before, 'FINDER_INPUT_HOLDS: every selected source body unchanged'); }
  catch (error) { report.failures.push({ name: error.name, message: error.message }); }
  report.completed = report.contexts.length === 6 && report.contexts.every(row => row.completed && !row.wireFailure && !row.closeFailure)
    && report.controls.length === 10 && report.failures.length === 0;
  report.originalImages = report.contexts.flatMap(row => row.images);
  write('report.json', report);
}
assert(report.completed && report.originalImages.length === 30, 'FINDER_COMPLETE: all six actual contexts, thirty originals and ten controls required');
console.log('Site Menu finder: 6 contexts, 30 original screenshots, 10 changed-record controls passed.');
