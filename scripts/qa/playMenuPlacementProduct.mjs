/* Source-only proposal. Positive qualification requires a completed manifest build and actual passing UI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, seed, sha, checkFonts, LINKS, shellFixture, pollFixture, pollDay } from './siteMenuNavigationSupport.mjs';

const SOURCE_PROPOSAL_FROZEN = true;
assert(SOURCE_PROPOSAL_FROZEN, 'MENU_PLACEMENT_SOURCE_PROPOSAL_NOT_FROZEN');
const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const OUT = process.env.PLACEMENT_BROWSER_OUT, DIST = path.resolve(process.env.PLACEMENT_DIST || 'dist');
const PARENT = 'f98fa1dbce0eb6fa0875934a4dc6286100066962', MAIN = 'dfb2720d783a30a6ecd814aa86e8c199ec6b4175';
const PROFILES = [{ id: '328-light', width: 328, height: 515, theme: 'light' },
  ...[[320, 568], [390, 844], [430, 932], [1440, 900]].flatMap(([width, height]) =>
    ['light', 'dark'].map(theme => ({ id: width + '-' + theme, width, height, theme })))];
const CASES = [
  { id: 'free-kick', route: '/free-kick', heading: 'Free Kick', owner: 'nav[data-site-chrome]', marker: 'MENU_PLACEMENT_GAME_HEADER' },
  { id: 'home', route: '/', heading: 'Free sports games', owner: 'header[data-site-chrome]', marker: 'MENU_PLACEMENT_SITE_HEADER' },
  { id: 'search', route: '/search', heading: 'Search every game', owner: null, marker: 'MENU_PLACEMENT_SEARCH_FLOW' },
];
const HELD = {
  'src/App.tsx': 'f6572f98fab5b8e85a97d4e6321dc4109023738743527e20dd5a6700477ed89e',
  'src/components/layout/Header.tsx': 'b0f43467bec631dfaac8c3023edb2df8ec6d1a044189dd93486ab27f30554a05',
  'src/components/game/GameNavbar.tsx': '7209cf373209c47a21a5e6b98c6b928a2985b2dabe2376f68c237b41525003db',
  'src/components/layout/SiteMenu.tsx': '3553da010c40664cd3cd7ccbc2c62cf6cf99d7c9225d25e393133765895e0ce9',
  'src/components/layout/SiteMenuHost.tsx': '257cab50164f031e4b91323f8f820fe3ef64ed417870b3816efcc7934dd3cde9',
  'src/components/layout/SiteMenuPanel.tsx': 'adf1116d3d187839a6b67076538c6f7149d414298b15e2226f6125e35671eed2',
  'src/pages/FreeKick.tsx': 'f1e347a7cdc2c01038a5700a9f43bb1b0b4a59bbaf6b14b75eae664f438c4f25',
  'src/lib/streaks.ts': 'd576f48f43d86fc693147888886c49c30f3366251143d421b91cba4457e0b386',
  'src/hooks/useStreaks.ts': '1333ecd1bcb3399d7fea70fa82238c07d1de575e5c017b83e522b592082262fe',
  'src/index.css': 'ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'src/test/SiteMenu.finder.test.tsx': '91b0365a2b637c20947b9c996a5d24551c6c95105988a3fa9e261ee9714bee8b',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
};
const SOURCES = [...Object.keys(HELD), 'src/pages/Index.tsx', 'src/pages/Search.tsx',
  'src/components/game/GameHelp.tsx', 'src/components/game/HowToPlayPopover.tsx', 'src/components/home/PollOfTheDay.tsx',
  'src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json', 'src/lib/nameFold.ts',
  'scripts/qa/playMenuPlacementProduct.mjs'];
const same = (a, b, marker) => assert.deepEqual(a, b, marker);
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = () => SOURCES.map(file => { const body = fs.readFileSync(file); return { path: file, bytes: body.length, sha256: sha(body) }; });
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'MENU_PLACEMENT_REMOTE_SOURCE');
assert(process.env.EXPECTED_PARENT === PARENT && process.env.EXPECTED_MAIN === MAIN, 'MENU_PLACEMENT_PARENT_MAIN');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'MENU_PLACEMENT_OUTPUT_OUTSIDE_SOURCE');
assert(fs.statSync(DIST).isDirectory(), 'MENU_PLACEMENT_COMPLETED_DIST');
fs.mkdirSync(OUT, { recursive: true }); assert.equal(fs.readdirSync(OUT).length, 0, 'MENU_PLACEMENT_FRESH_OUTPUT');
const before = pins();
for (const pin of before) if (HELD[pin.path]) assert.equal(pin.sha256, HELD[pin.path], 'MENU_PLACEMENT_HELD_SOURCE: ' + pin.path);
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
write('source-before.json', before);
function emittedRoute(source) {
  const file = path.join(DIST, '.vite/manifest.json'), body = fs.readFileSync(file), manifest = JSON.parse(body), entry = manifest[source];
  assert(entry?.src === source && entry.isDynamicEntry === true && /^assets\/[A-Za-z0-9._-]+\.js$/.test(entry.file), 'MENU_PLACEMENT_REAL_DYNAMIC_MANIFEST_ENTRY');
  const compiled = path.resolve(DIST, entry.file);
  assert(compiled.startsWith(DIST + path.sep) && fs.statSync(compiled).isFile()
    && fs.realpathSync(compiled).startsWith(fs.realpathSync(DIST) + path.sep), 'MENU_PLACEMENT_REAL_COMPILED_CHUNK');
  const bytes = fs.readFileSync(compiled);
  return { source, sourceSHA256: sha(fs.readFileSync(source)), manifest: '.vite/manifest.json', manifestSHA256: sha(body),
    entry, pathname: '/' + entry.file, bytes: bytes.length, sha256: sha(bytes) };
}
const freeKickChunk = emittedRoute('src/pages/FreeKick.tsx');
write('compiled-route-authority.json', freeKickChunk);
/* Source-owned guest storage protocol only. This supplies no DOM, auth or sports data. */
function seedGuest999() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 999, longest: 999, lastDate: today }, perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0 }));
}

/* Actual-node observation only. No styles, locks, nodes or focus are supplied. */
function collect(spec) {
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility === 'visible';
  const describe = node => {
    if (!node) return null;
    const r = rect(node), s = getComputedStyle(node), at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    let painted = visible(node); for (let p = node; p; p = p.parentElement) painted &&= Number(getComputedStyle(p).opacity) > 0;
    return { tag: node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '), href: node.getAttribute('href'), label: node.getAttribute('aria-label'), rect: r,
      visible: visible(node), painted, hit: !!at && (at === node || node.contains(at)), pointer: s.pointerEvents, position: s.position };
  };
  const root = document.documentElement, body = document.body, b = getComputedStyle(body), h = getComputedStyle(root);
  const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible), trigger = triggers[0];
  const owners = spec.owner ? [...document.querySelectorAll(spec.owner)].filter(visible) : [], owner = owners[0];
  const logo = owner ? [...owner.querySelectorAll('a[href="/"]')].find(node => /DoUKnowBall/i.test(node.textContent)) : null;
  const word = logo ? [...logo.querySelectorAll('span')].find(node => /^DoUKnowBall$/i.test(node.textContent.trim())) : null;
  let wordmark = null;
  if (word) {
    const range = document.createRange(); range.selectNodeContents(word); const r = range.getBoundingClientRect(), clips = [];
    for (let node = word; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display !== 'inline' && [style.overflowX, style.overflowY].some(value => value !== 'visible')) clips.push(rect(node));
      if (node === owner) break;
    }
    wordmark = { ...describe(word), range: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }, clips };
  }
  const menus = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].filter(node => node.querySelector('nav[aria-label="Site navigation"]'));
  const menu = menus[0], field = menu?.querySelector('input[type="search"]'), nav = menu?.querySelector('nav[aria-label="Site navigation"]');
  const active = document.activeElement, chain = [];
  for (let node = trigger; node; node = node.parentElement) chain.push({ tag: node.tagName, siteChrome: node.hasAttribute('data-site-chrome'), position: getComputedStyle(node).position, rect: rect(node) });
  return { href: location.href, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, htmlWidth: root.scrollWidth, bodyWidth: body.scrollWidth, documentHeight: root.scrollHeight },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    guestStreakStorage: localStorage.getItem('dukb-streaks-v1'),
    light: root.classList.contains('light'), headings: [...document.querySelectorAll('#dukb-main h1')].filter(visible).map(node => node.textContent.trim()),
    triggers: triggers.map(describe), trigger: describe(trigger), flowChain: chain, menuCount: menus.length,
    ownerCount: owners.length, owner: owner ? { ...describe(owner), containsTrigger: owner.contains(trigger), logo: describe(logo), wordmark,
      controls: [...owner.querySelectorAll('a[href],button,[role="button"]')].filter(visible).map(describe),
      guestStreak: [...owner.querySelectorAll('[title="999 day streak"]')].filter(visible).map(describe) } : null,
    headerCount: [...document.querySelectorAll('header[data-site-chrome],nav[data-site-chrome]')].filter(visible).length,
    loadingCount: [...document.querySelectorAll('[aria-label="Loading"]')].filter(visible).length,
    active: active ? { ...describe(active), trigger: active === trigger, finder: active === field, heading: /^H[1-6]$/.test(active.tagName), editable: active.matches('input,textarea,select,[contenteditable="true"]') } : null,
    menu: menu ? { rect: rect(menu), links: [...nav.querySelectorAll('a[href]')].map(node => [node.getAttribute('href'), node.textContent.trim()]),
      targets: [...nav.querySelectorAll('a[href]')].map(describe),
      field: field ? { ...describe(field), value: field.value, maxLength: field.maxLength, name: [...field.labels].map(node => node.textContent.trim()).join(' ') } : null,
      results: [...menu.querySelectorAll('[aria-label="Game results"] a[href]')].map(describe) } : null,
    locks: { bodyStyle: body.getAttribute('style'), bodyClass: body.getAttribute('class'), htmlStyle: root.getAttribute('style'), htmlClass: root.getAttribute('class'), bodyScrollLocked: body.getAttribute('data-scroll-locked'),
      bodyComputed: { overflow: b.overflow, overflowX: b.overflowX, overflowY: b.overflowY, pointerEvents: b.pointerEvents }, htmlComputed: { overflow: h.overflow, overflowX: h.overflowX, overflowY: h.overflowY, pointerEvents: h.pointerEvents } },
    bodyInlineStyle: { length: body.style.length, cssText: body.style.cssText }, trusted: window.__siteMenuTrusted || [] };
}
function bounds(sample, spec) {
  checkFonts(sample.fonts);
  const p = spec.profile;
  assert(sample.light === (p.theme === 'light') && sample.viewport.width === p.width && sample.viewport.height === p.height, 'MENU_PLACEMENT_ACTUAL_PROFILE');
  assert(sample.viewport.htmlWidth <= p.width + 0.5 && sample.viewport.bodyWidth <= p.width + 0.5, 'MENU_PLACEMENT_FOUNDATION_OVERFLOW');
}
function targetReady(target, viewport) {
  assert(target?.rect.width >= 44 && target.rect.height >= 44, 'MENU_PLACEMENT_FOUNDATION_TARGET_44');
  assert(target.painted && target.hit && target.pointer !== 'none' && target.rect.x >= 0 && target.rect.y >= 0
    && target.rect.right <= viewport.width + 0.5 && target.rect.bottom <= viewport.height + 0.5, 'MENU_PLACEMENT_FOUNDATION_TARGET_HIT');
}
function lockFieldsReady(sample, beforeOpen) {
  const keys = ['bodyStyle', 'bodyClass', 'htmlStyle', 'htmlClass', 'bodyScrollLocked', 'bodyComputed', 'htmlComputed'];
  same(Object.keys(sample.locks).sort(), [...keys].sort(), 'MENU_PLACEMENT_SEVEN_LOCKS');
  same(Object.keys(beforeOpen.locks).sort(), [...keys].sort(), 'MENU_PLACEMENT_SEVEN_LOCKS');
  for (const key of keys.filter(key => key !== 'bodyStyle')) same(sample.locks[key], beforeOpen.locks[key], 'MENU_PLACEMENT_SEVEN_LOCKS');
  const a = beforeOpen.locks.bodyStyle, b = sample.locks.bodyStyle;
  if (a === b) return false;
  assert(a === null && b === '' || a === '' && b === null, 'MENU_PLACEMENT_SEVEN_LOCKS');
  assert(beforeOpen.bodyInlineStyle?.length === 0 && sample.bodyInlineStyle?.length === 0, 'MENU_PLACEMENT_EMPTY_STYLE_DECLARATIONS');
  assert(beforeOpen.bodyInlineStyle?.cssText === '' && sample.bodyInlineStyle?.cssText === '', 'MENU_PLACEMENT_EMPTY_STYLE_CSS_TEXT');
  return true;
}
function closedReady(sample, beforeOpen, spec) {
  bounds(sample, spec);
  assert.equal(new URL(sample.href).pathname + new URL(sample.href).search, spec.route, 'MENU_PLACEMENT_FOUNDATION_ROUTE');
  assert((spec.heading ? sample.headings.includes(spec.heading) : sample.loadingCount === 1) && sample.triggers.length === 1 && !sample.menu, 'MENU_PLACEMENT_FOUNDATION_REAL_ROUTE_MENU');
  assert(sample.active?.trigger && sample.active.visible, 'MENU_PLACEMENT_FOUNDATION_RETURN_FOCUS');
  targetReady(sample.trigger, sample.viewport); lockFieldsReady(sample, beforeOpen);
}
async function capture(page, row, name, png = false) {
  const sample = await page.evaluate(collect, row.spec);
  row.samples.push({ name, sample }); write(row.id + '-' + name + '.json', sample);
  if (png) {
    const file = row.id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'disabled' });
    const body = fs.readFileSync(path.join(OUT, file)); row.images.push({ file, bytes: body.length, sha256: sha(body), normal: true });
  }
  return sample;
}
async function closed(page, row, beforeOpen, name, png = false) {
  const started = Date.now(), attempts = []; let sample, last;
  do {
    sample = await page.evaluate(collect, row.spec);
    try { closedReady(sample, beforeOpen, row.spec); last = null; break; }
    catch (error) { last = { name: error.name, message: error.message }; attempts.push({ elapsedMs: Date.now() - started, sample, error: last }); }
    await page.waitForTimeout(50);
  } while (Date.now() - started < 4000);
  row.closings.push({ name, elapsedMs: Date.now() - started, beforeOpen, attempts, final: sample });
  assert(!last, 'MENU_PLACEMENT_FOUNDATION_CLOSE_4S: ' + JSON.stringify(last));
  return capture(page, row, name, png);
}
const heldGates = new Map();
function prepareChunkGate(row, reference) {
  let release, seen;
  const gate = { reference, count: 0, released: false, wait: new Promise(resolve => { release = resolve; }), requested: new Promise(resolve => { seen = resolve; }), seen,
    release: () => { if (!gate.released) { gate.released = true; row.chunkHold.releaseRequested = true; release(); } } };
  gate.seen = seen; heldGates.set(row, gate);
  row.chunkHold = { reference, releaseRequested: false, requestCount: 0, events: [] }; return gate;
}
async function boundary(context, row) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const item = { method: request.method(), url: request.url(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash, 'MENU_PLACEMENT_IO_CREDENTIAL_FRAGMENT');
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(request.method()) && request.postData() === null, 'MENU_PLACEMENT_IO_LOCAL_METHOD');
        const isRoute = CASES.some(spec => spec.route === url.pathname);
        const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        assert(!url.search || freshness, 'MENU_PLACEMENT_IO_LOCAL_QUERY');
        const file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname), isRoute ? 'index.html' : '');
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile()
          && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep), 'MENU_PLACEMENT_IO_COMPLETED_DIST');
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) });
        const gate = heldGates.get(row);
        if (gate && url.pathname === gate.reference.pathname) {
          assert(request.method() === 'GET' && request.resourceType() === 'script' && !url.search && gate.count === 0 && !gate.released, 'MENU_PLACEMENT_EXACT_CHUNK_HOLD');
          assert.equal(sha(fs.readFileSync(file)), gate.reference.sha256, 'MENU_PLACEMENT_PAUSED_CHUNK_BODY_HELD');
          gate.count++; row.chunkHold.requestCount = gate.count;
          row.chunkHold.events.push({ phase: 'requested-and-held', url: item.url, method: item.method, type: item.type, sha256: gate.reference.sha256 }); gate.seen();
          await gate.wait;
          row.chunkHold.events.push({ phase: 'released-actual-script', url: item.url, sha256: gate.reference.sha256 });
        }
        return route.continue();
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const known = shellFixture(request, url) || (row.startsAtHome ? pollFixture(request, url, row.pollDay) : null);
      if (known) {
        row.io.push({ ...item, kind: 'source-shell-backend-abort', classifier: known.id, requestBodySha256: request.postData() === null ? null : sha(request.postData()) });
        return route.abort('blockedbyclient');
      }
      throw new Error('MENU_PLACEMENT_IO_UNKNOWN_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { row.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Scoped proof refuses sockets' }); });
}
function wireReady(row) {
  assert(row.io.some(item => item.kind === 'prepared-font') && row.io.every(item => item.kind !== 'unknown-refused'), 'MENU_PLACEMENT_IO_KNOWN_ONLY');
  assert.equal(row.wire.pageErrors.length, 0, 'MENU_PLACEMENT_NO_PAGE_ERRORS'); assert.equal(row.wire.sockets.length, 0, 'MENU_PLACEMENT_NO_SOCKETS');
  const aborted = row.io.filter(item => item.kind === 'source-shell-backend-abort');
  const allowed = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const known = request => aborted.some(item => item.url === request.url && item.method === request.method);
  for (const item of row.wire.failed) assert(allowed.has(item.error) && known(item), 'MENU_PLACEMENT_EXPLAINED_REQUEST_FAILURE');
  for (const item of row.wire.console.filter(item => item.type === 'error')) assert(row.wire.failed.some(request =>
    allowed.has(request.error) && known(request) && request.url === item.url && item.text === 'Failed to load resource: ' + request.error), 'MENU_PLACEMENT_EXPLAINED_CONSOLE_ERROR');
}
async function openMenu(page, row, label) {
  const beforeOpen = await capture(page, row, label + '-before'); bounds(beforeOpen, row.spec);
  assert.equal(beforeOpen.triggers.length, 1, 'MENU_PLACEMENT_FOUNDATION_ONE_MENU'); targetReady(beforeOpen.trigger, beforeOpen.viewport);
  await page.getByRole('button', { name: 'Open site menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true }); await menu.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Menu' && /^H[1-6]$/.test(document.activeElement.tagName));
  await menu.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  const opening = await capture(page, row, label + '-open'); bounds(opening, row.spec);
  assert(opening.menuCount === 1 && opening.active?.heading && !opening.active.editable && opening.active.text === 'Menu', 'MENU_PLACEMENT_FOUNDATION_MENU_HEADING');
  same(opening.menu.links, LINKS, 'MENU_PLACEMENT_FOUNDATION_SEVENTEEN_LINKS');
  assert(opening.menu.field?.name === 'Find a game' && opening.menu.field.value === '' && opening.menu.field.maxLength === 80, 'MENU_PLACEMENT_FOUNDATION_FINDER_RESET');
  const r = opening.menu.rect, p = row.spec.profile;
  assert(r.x >= 0 && r.y >= 0 && r.right <= p.width + 0.5 && r.bottom <= p.height + 0.5, 'MENU_PLACEMENT_FOUNDATION_PANEL_BOUNDS');
  row.openings.push({ label, beforeOpen, opening }); return { menu, beforeOpen };
}
async function actualFonts(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('16px Inter') && document.fonts.check('16px "Space Grotesk"'));
}
async function actualInstructions(page, row, phase = 'Actual Free Kick landing before Menu claims') {
  await page.getByRole('button', { name: 'How to play', exact: true, includeHidden: true }).waitFor({ state: 'attached' });
  const guide = page.getByRole('dialog', { name: 'How to play', exact: true });
  row.instructions = { observedPhase: phase, visible: await guide.isVisible() };
  if (row.instructions.visible) {
    row.instructions.before = await capture(page, row, 'instructions-arrived');
    await guide.getByRole('button', { name: "Let's Play!", exact: true }).click(); await guide.waitFor({ state: 'hidden' });
    row.instructions.after = await capture(page, row, 'instructions-acknowledged');
  }
}
async function actualFinder(page, row, session, query) {
  await page.keyboard.press('Tab');
  const field = session.menu.getByRole('searchbox', { name: 'Find a game', exact: true });
  assert(await field.evaluate(node => document.activeElement === node), 'MENU_PLACEMENT_FOUNDATION_NATIVE_TAB');
  await field.pressSequentially(query, { delay: 10 });
  const route = query === 'Free Kick' ? '/free-kick' : '/club-manager';
  await session.menu.locator('[aria-label="Game results"] a[href="' + route + '"]').waitFor();
  const sample = await capture(page, row, query === 'Free Kick' ? 'free-kick-navigation-query' : 'finder-observation'); bounds(sample, row.spec);
  assert(sample.menu.field.value === query && sample.menu.results.some(item => item.href === route && item.text.includes(query) && item.text.includes('Soccer')), 'MENU_PLACEMENT_FOUNDATION_ACTUAL_FINDER');
  return field;
}
async function journey(page, row) {
  await page.goto(BASE + row.spec.route, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: row.spec.heading, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open site menu', exact: true, includeHidden: true }).waitFor({ state: 'attached' });
  if (row.spec.id === 'free-kick') await actualInstructions(page, row);
  await actualFonts(page);
  if (row.spec.id === 'home') {
    const header = page.locator('header[data-site-chrome]');
    await header.locator('[title="999 day streak"]').waitFor({ state: 'visible' });
    await header.getByRole('button', { name: 'Log In', exact: true }).waitFor({ state: 'visible' });
    await header.getByRole('button', { name: 'Sign Up', exact: true }).waitFor({ state: 'visible' });
  }
  row.top = await capture(page, row, 'closed-placement', true); bounds(row.top, row.spec);
  assert(row.top.headings.includes(row.spec.heading) && row.top.triggers.length === 1, 'MENU_PLACEMENT_FOUNDATION_REAL_ROUTE');
  if (row.spec.owner) assert(row.top.ownerCount === 1 && row.top.owner?.painted && row.top.owner.logo?.painted, 'MENU_PLACEMENT_FOUNDATION_ACTUAL_HEADER_LOGO');
  else assert.equal(row.top.headerCount, 0, 'MENU_PLACEMENT_FOUNDATION_HEADERLESS_SEARCH');
  let session = await openMenu(page, row, 'finder'); await actualFinder(page, row, session, 'Club Manager');
  row.finder = await capture(page, row, 'finder-result', true); bounds(row.finder, row.spec);
  await page.keyboard.press('Escape'); row.firstClosed = await closed(page, row, session.beforeOpen, 'first-closed');
  row.firstCloseUsedEmptyStyleException = lockFieldsReady(row.firstClosed, session.beforeOpen);
  session = await openMenu(page, row, 'reopen'); await page.keyboard.press('Escape');
  row.atRest = await closed(page, row, session.beforeOpen, 'menu-closed');
  assert(row.atRest.trusted.some(event => event.trusted), 'MENU_PLACEMENT_FOUNDATION_TRUSTED_MENU_CLICK');
  if (row.spec.id === 'search') {
    row.scrollBefore = await capture(page, row, 'scroll-before');
    assert.equal(row.scrollBefore.viewport.scrollY, 0, 'MENU_PLACEMENT_SCROLL_START_AT_TOP');
    await page.mouse.move(row.spec.profile.width - 20, row.spec.profile.height - 30); await page.mouse.wheel(0, 192);
    await page.waitForFunction(() => window.scrollY >= 64);
    let previous = await page.evaluate(() => window.scrollY);
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.waitForTimeout(50); const current = await page.evaluate(() => window.scrollY);
      if (Math.abs(current - previous) < 0.5) break; previous = current;
    }
    row.scrollAfter = await capture(page, row, 'document-scrolled'); bounds(row.scrollAfter, row.spec);
    assert(row.scrollAfter.viewport.scrollY - row.scrollBefore.viewport.scrollY >= 64, 'MENU_PLACEMENT_FOUNDATION_ACTUAL_DOCUMENT_WHEEL');
  }
  assert.equal(row.images.length, 2, 'MENU_PLACEMENT_TWO_PRIMARY_IMAGES'); row.journeyComplete = true;
}
function within(inner, outer) { return inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.right <= outer.right + 0.5 && inner.bottom <= outer.bottom + 0.5; }
function placementReady(row) {
  assert(row.healthyFoundation, 'MENU_PLACEMENT_REQUIRES_HEALTHY_FOUNDATION');
  const sample = row.atRest;
  if (row.spec.owner) {
    assert(sample.triggers.length === 1 && sample.ownerCount === 1 && sample.owner?.containsTrigger, row.spec.marker);
    if (row.spec.id === 'free-kick') targetReady(sample.owner.controls.find(item => item.tag === 'BUTTON' && item.text === 'Back' && item.label === 'Go back'), sample.viewport);
    const a = sample.trigger.rect, b = sample.owner.logo.rect;
    assert(a.width >= 44 && a.height >= 44, 'MENU_PLACEMENT_HEADER_44');
    const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
    assert(vertical >= Math.min(a.height, b.height) / 2 && (a.right <= b.x + 0.5 || b.right <= a.x + 0.5), 'MENU_PLACEMENT_HEADER_LOGO_ROW');
    const word = sample.owner.wordmark, view = { x: 0, y: 0, right: sample.viewport.width, bottom: sample.viewport.height };
    assert(word?.painted && /^DoUKnowBall$/i.test(word.text) && word.range.width > 0 && word.range.height > 0
      && [word.rect, sample.owner.logo.rect, sample.owner.rect, view, ...word.clips].every(clip => within(word.range, clip)), 'MENU_PLACEMENT_WHOLE_WORDMARK');
    const controls = sample.owner.controls;
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const x = Math.min(controls[i].rect.right, controls[j].rect.right) - Math.max(controls[i].rect.x, controls[j].rect.x);
      const y = Math.min(controls[i].rect.bottom, controls[j].rect.bottom) - Math.max(controls[i].rect.y, controls[j].rect.y);
      assert(x <= 0.5 || y <= 0.5, 'MENU_PLACEMENT_HEADER_CONTROL_OVERLAP');
    }
    if (row.spec.id === 'home') assert(sample.owner.guestStreak.length === 1 && sample.owner.guestStreak[0].painted && sample.owner.guestStreak[0].text === '999' && controls.some(item => item.text === 'Log In') && controls.some(item => item.text === 'Sign Up'), 'MENU_PLACEMENT_ACTUAL_GUEST_999');
  } else {
    assert(sample.triggers.length === 1 && sample.headerCount === 0 && sample.flowChain.every(item => !['sticky', 'fixed'].includes(item.position)), row.spec.marker);
    const dy = row.scrollAfter.viewport.scrollY - row.scrollBefore.viewport.scrollY;
    assert(dy >= 64, 'MENU_PLACEMENT_SEARCH_SCROLL_EVIDENCE');
    assert(Math.abs(row.scrollAfter.trigger.rect.y - row.scrollBefore.trigger.rect.y + dy) <= 1, 'MENU_PLACEMENT_SEARCH_DOCUMENT_MOTION');
  }
}
async function delayedRouteJourney(page, row) {
  const home = { ...CASES.find(spec => spec.id === 'home'), profile: row.spec.profile };
  row.spec = home;
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: home.heading, exact: true }).waitFor(); await actualFonts(page);
  let session = await openMenu(page, row, 'home-navigation'); await actualFinder(page, row, session, 'Free Kick');
  const gate = heldGates.get(row);
  assert(gate.count === 0 && !gate.released, 'MENU_PLACEMENT_ROUTE_CHUNK_NOT_LOADED_BEFORE_NAVIGATION');
  await session.menu.locator('[aria-label="Game results"] a[href="/free-kick"]').click();
  await gate.requested;
  row.spec = { ...CASES.find(spec => spec.id === 'free-kick'), heading: null, owner: null, profile: row.spec.profile };
  await page.waitForFunction(() => location.pathname === '/free-kick' && document.querySelector('[aria-label="Loading"]')
    && ![...document.querySelectorAll('header[data-site-chrome],nav[data-site-chrome]')].some(node => node.getClientRects().length));
  row.fallbackClosed = await closed(page, row, session.beforeOpen, 'route-fallback-closed');
  assert(row.fallbackClosed.headerCount === 0 && row.fallbackClosed.flowChain.every(item => !['sticky', 'fixed'].includes(item.position)), 'MENU_PLACEMENT_DELAY_REAL_FLOW_FALLBACK');
  session = await openMenu(page, row, 'route-fallback'); const field = await actualFinder(page, row, session, 'Club Manager');
  row.beforeRelease = await capture(page, row, 'fallback-finder', true);
  const fieldNode = await field.elementHandle(), sheetNode = await session.menu.elementHandle();
  assert(fieldNode && sheetNode, 'MENU_PLACEMENT_DELAY_ACTUAL_HANDLES');
  const observing = page.evaluate(async ({ fieldNode, sheetNode }) => {
    const frames = [], start = performance.now();
    const visible = node => node.getClientRects().length && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility === 'visible';
    while (performance.now() - start < 4000) {
      const menus = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].filter(node => node.querySelector('nav[aria-label="Site navigation"]'));
      const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible);
      const owners = [...document.querySelectorAll('nav[data-site-chrome]')].filter(visible);
      const mounted = owners.length === 1 && [...document.querySelectorAll('#dukb-main h1')].some(node => visible(node) && node.textContent.trim() === 'Free Kick');
      frames.push({ elapsedMs: performance.now() - start, value: fieldNode.value, focused: document.activeElement === fieldNode, sameField: fieldNode.isConnected && menus[0]?.querySelector('input[type="search"]') === fieldNode,
        sameSheet: sheetNode.isConnected && menus[0] === sheetNode, menus: menus.length, triggers: triggers.length, mounted,
        ownerContainsTrigger: owners.length === 1 && owners[0].contains(triggers[0]) });
      if (mounted) return frames;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return frames;
  }, { fieldNode, sheetNode });
  gate.release(); row.frames = await observing;
  row.spec = { ...CASES.find(spec => spec.id === 'free-kick'), profile: row.spec.profile };
  await page.locator('nav[data-site-chrome] button[aria-label="Open site menu"]').waitFor({ state: 'attached' });
  row.mounted = await capture(page, row, 'mounted-finder', true); bounds(row.mounted, row.spec);
  assert.equal(row.chunkHold.requestCount, 1, 'MENU_PLACEMENT_DELAY_ONE_SOURCE_CHUNK');
  same(row.chunkHold.events.map(event => event.phase), ['requested-and-held', 'released-actual-script'], 'MENU_PLACEMENT_DELAY_ACTUAL_RELEASE');
  await page.keyboard.press('Escape'); row.afterClose = await closed(page, row, session.beforeOpen, 'mounted-latest-trigger-closed');
  await actualInstructions(page, row, 'After delayed Menu Escape, before closed-trigger history proof');
  if (row.instructions.visible) {
    const historyMenu = await openMenu(page, row, 'after-guide-history');
    await page.keyboard.press('Escape'); row.historyStart = await closed(page, row, historyMenu.beforeOpen, 'history-start');
  } else row.historyStart = await closed(page, row, row.afterClose, 'history-start');
  row.historyHomeSpec = home;
  await page.goBack({ waitUntil: 'domcontentloaded' }); row.spec = home;
  await page.getByRole('heading', { name: home.heading, exact: true }).waitFor();
  await page.locator('header[data-site-chrome] button[aria-label="Open site menu"]').waitFor({ state: 'attached' });
  row.historyBack = await closed(page, row, row.historyStart, 'cached-history-back-home');
  await page.goForward({ waitUntil: 'domcontentloaded' }); row.spec = { ...CASES.find(spec => spec.id === 'free-kick'), profile: home.profile };
  await page.getByRole('heading', { name: row.spec.heading, exact: true }).waitFor();
  await page.locator('nav[data-site-chrome] button[aria-label="Open site menu"]').waitFor({ state: 'attached' });
  row.historyForward = await closed(page, row, row.historyBack, 'cached-history-forward-free-kick');
  assert.equal(gate.count, 1, 'MENU_PLACEMENT_HISTORY_USES_CACHED_ACTUAL_CHUNK');
  assert.equal(row.images.length, 2, 'MENU_PLACEMENT_TWO_DELAY_IMAGES'); row.journeyComplete = true;
}
function transitionReady(row) {
  assert(row.healthyFoundation && row.frames.length > 0 && row.frames.at(-1).mounted, 'MENU_PLACEMENT_DELAY_ACTUAL_MOUNT');
  assert(row.beforeRelease.menu?.field.value === 'Club Manager' && row.mounted.menu?.field.value === 'Club Manager'
    && row.frames.every(frame => frame.value === 'Club Manager'), 'MENU_PLACEMENT_DELAY_DRAFT_HELD');
  assert(row.beforeRelease.active?.finder && row.mounted.active?.finder && row.frames.every(frame => frame.focused), 'MENU_PLACEMENT_DELAY_FINDER_FOCUS_HELD');
  assert(row.frames.every(frame => frame.sameField && frame.sameSheet && frame.menus === 1 && frame.triggers === 1)
    && row.beforeRelease.menuCount === 1 && row.beforeRelease.triggers.length === 1 && row.mounted.menuCount === 1 && row.mounted.triggers.length === 1, 'MENU_PLACEMENT_DELAY_SINGLE_OWNER_HELD');
  closedReady(row.historyStart, row.afterClose, row.spec); closedReady(row.historyBack, row.historyStart, row.historyHomeSpec); closedReady(row.historyForward, row.historyBack, row.spec);
  assert(row.historyBack.owner?.containsTrigger && row.historyForward.owner?.containsTrigger && row.mounted.ownerCount === 1 && row.mounted.owner?.containsTrigger && row.frames.at(-1).ownerContainsTrigger
    && row.afterClose.owner?.containsTrigger && row.afterClose.active?.trigger, 'MENU_PLACEMENT_DELAY_LATEST_TRIGGER_RETURN');
}
/* Copies are exact actual passing observations. No positive geometry is derived. */
function copiedControls(rows, delayed) {
  const actual = CASES.map(spec => rows.find(row => row.spec.id === spec.id && row.spec.profile.id === '328-light'));
  assert(actual.length === 3 && actual.every(row => row?.healthyFoundation), 'MENU_PLACEMENT_CONTROL_ACTUAL_FOUNDATION');
  actual.forEach(placementReady); transitionReady(delayed);
  const primary = JSON.stringify(actual.map(({ id, spec, healthyFoundation, atRest, scrollBefore, scrollAfter }) => ({ id, spec, healthyFoundation, atRest, scrollBefore, scrollAfter })), null, 2) + '\n';
  const migration = JSON.stringify({ healthyFoundation: delayed.healthyFoundation, beforeRelease: delayed.beforeRelease, mounted: delayed.mounted, frames: delayed.frames, afterClose: delayed.afterClose, historyStart: delayed.historyStart, historyBack: delayed.historyBack, historyForward: delayed.historyForward, historyHomeSpec: delayed.historyHomeSpec, spec: delayed.spec }, null, 2) + '\n';
  write('control-actual-placement-foundation.json', JSON.parse(primary)); write('control-actual-transition-foundation.json', JSON.parse(migration));
  const controls = [];
  const control = (id, foundation, foundationFile, mutate, check, marker) => {
    const copy = JSON.parse(foundation); mutate(copy); const changed = JSON.stringify(copy, null, 2) + '\n', file = 'control-' + id + '.json';
    assert.notEqual(sha(changed), sha(foundation), 'MENU_PLACEMENT_CONTROL_EFFECTIVE');
    fs.writeFileSync(path.join(OUT, file), changed, { flag: 'wx' }); const changedFile = 'control-' + id + '.changed.json';
    fs.writeFileSync(path.join(OUT, changedFile), fs.readFileSync(path.join(OUT, file)), { flag: 'wx' });
    let failure; try { check(JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'))); } catch (error) { failure = error; }
    assert(failure instanceof assert.AssertionError && failure.message.includes(marker), 'MENU_PLACEMENT_CONTROL_OWNED: ' + id);
    fs.writeFileSync(path.join(OUT, file), foundation); assert.equal(sha(fs.readFileSync(path.join(OUT, file))), sha(foundation), 'MENU_PLACEMENT_CONTROL_SAME_COPY_RESTORE');
    check(JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8')));
    controls.push({ id, marker, scope: 'ACTUAL_PASSING_COPIED_CHECKER_ONLY', actualFeaturePassCredit: false, foundation: foundationFile, changedFile, restoredFile: file,
      beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(path.join(OUT, file))), sameCopyRestored: true, actualFailure: { name: failure.name, message: failure.message } });
  };
  const placement = (id, index, mutate, marker) => control(id, primary, 'control-actual-placement-foundation.json', copy => mutate(copy[index]), copy => copy.forEach(placementReady), marker);
  placement('game-owner', 0, row => { row.atRest.owner.containsTrigger = false; }, 'MENU_PLACEMENT_GAME_HEADER');
  placement('home-owner', 1, row => { row.atRest.owner.containsTrigger = false; }, 'MENU_PLACEMENT_SITE_HEADER');
  placement('short-header-target', 0, row => { row.atRest.trigger.rect.height = 43; }, 'MENU_PLACEMENT_HEADER_44');
  placement('different-logo-row', 1, row => { row.atRest.trigger.rect.y += 100; row.atRest.trigger.rect.bottom += 100; }, 'MENU_PLACEMENT_HEADER_LOGO_ROW');
  placement('sticky-fallback', 2, row => { row.atRest.flowChain[0].position = 'sticky'; }, 'MENU_PLACEMENT_SEARCH_FLOW');
  placement('fixed-fallback', 2, row => { row.atRest.flowChain[0].position = 'fixed'; }, 'MENU_PLACEMENT_SEARCH_FLOW');
  placement('no-document-scroll', 2, row => { row.scrollAfter.viewport.scrollY = row.scrollBefore.viewport.scrollY; }, 'MENU_PLACEMENT_SEARCH_SCROLL_EVIDENCE');
  placement('pinned-scroll-rectangle', 2, row => { row.scrollAfter.trigger.rect.y = row.scrollBefore.trigger.rect.y; }, 'MENU_PLACEMENT_SEARCH_DOCUMENT_MOTION');
  placement('clipped-wordmark', 1, row => { const word = row.atRest.owner.wordmark; word.range = { ...word.range, width: word.rect.width + 2, right: word.rect.right + 2 }; }, 'MENU_PLACEMENT_WHOLE_WORDMARK');
  placement('overlapping-header-control', 1, row => { const menu = row.atRest.owner.controls.find(item => item.label === 'Open site menu'); const other = row.atRest.owner.controls.find(item => item !== menu); other.rect = { ...menu.rect }; }, 'MENU_PLACEMENT_HEADER_CONTROL_OVERLAP');
  placement('guest-streak-999', 1, row => { row.atRest.owner.guestStreak[0].text = '998'; }, 'MENU_PLACEMENT_ACTUAL_GUEST_999');
  placement('game-back-target-44', 0, row => { const back = row.atRest.owner.controls.find(item => item.tag === 'BUTTON' && item.text === 'Back' && item.label === 'Go back'); assert(back, 'MENU_PLACEMENT_CONTROL_ACTUAL_BACK'); back.rect.height = 43; }, 'MENU_PLACEMENT_FOUNDATION_TARGET_44');
  const transition = (id, mutate, marker) => control(id, migration, 'control-actual-transition-foundation.json', mutate, transitionReady, marker);
  transition('delayed-draft', row => { row.frames[0].value += 'x'; }, 'MENU_PLACEMENT_DELAY_DRAFT_HELD');
  transition('delayed-finder-focus', row => { row.frames[0].focused = false; }, 'MENU_PLACEMENT_DELAY_FINDER_FOCUS_HELD');
  transition('delayed-single-owner', row => { row.frames[0].menus = 2; }, 'MENU_PLACEMENT_DELAY_SINGLE_OWNER_HELD');
  transition('delayed-latest-return', row => { row.afterClose.active.trigger = false; }, 'MENU_PLACEMENT_DELAY_LATEST_TRIGGER_RETURN');
  transition('cached-history-focus', row => { row.historyBack.active.trigger = false; }, 'MENU_PLACEMENT_FOUNDATION_RETURN_FOCUS');
  return controls;
}
const report = { schema: 1, source: process.env.GITHUB_SHA, immutableFinderParent: PARENT, mainAtPlan: MAIN,
  scope: 'Actual guest Menu placement in27 primary profiles and one delayed source-bound Free Kick transition',
  planned: { primaryContexts: 27, transitionContexts: 1, normalImages: 56, copiedControls: 17, nativeHistoryTraversals: 2, expectedRawProcessExit: 0 },
  status: 'NOT_QUALIFIED', healthyFoundation: false, actualPlacementPass: false, transitionPass: false, qualified: false,
  limits: ['Guest Header rows use source-owned999day local-storage state; no signed-in or universal worst-state claim.',
    'Original images cover closed placement/open finder for each primary profile and fallback/mounted finder for the delayed route.',
    'No pending-consent, gameplay, caps, readers, global suite, readiness, merge or live-publication claim.',
    'Panel lazy cancellation source is held; its isolated unit tests are a separate workflow gate, not browser credit.'],
  contexts: [], placement: [], transitions: [], controls: [], featureFailures: [], methodFailures: [], sourceHeld: false };
function makeRow(spec, profile, id) {
  return { id, spec: { ...spec, profile }, startsAtHome: spec.id === 'home', healthyFoundation: false, journeyComplete: false, pollDay: pollDay(Date.now()),
    samples: [], images: [], openings: [], closings: [], io: [], wire: { pageErrors: [], console: [], failed: [], sockets: [] } };
}
let browser;
async function runContext(row, drive) {
  let context, page, timer, localFailure = false;
  try {
    const p = row.spec.profile;
    context = await browser.newContext({ viewport: { width: p.width, height: p.height }, deviceScaleFactor: 1, colorScheme: p.theme, isMobile: p.width < 768, hasTouch: p.width < 768, reducedMotion: 'reduce', serviceWorkers: 'block' });
    context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
    await context.addInitScript(seed, { theme: p.theme, pending: false });
    if (row.startsAtHome) await context.addInitScript(seedGuest999);
    await boundary(context, row); page = await context.newPage();
    page.on('pageerror', error => row.wire.pageErrors.push({ message: error.message, stack: error.stack }));
    page.on('console', message => row.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
    page.on('requestfailed', request => row.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
    await Promise.race([drive(page, row), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('MENU_PLACEMENT_CONTEXT_DEADLINE')), 60000); })]);
  } catch (error) {
    localFailure = true; report.methodFailures.push({ case: row.id, phase: 'healthy-foundation-or-transition', name: error.name, message: error.message, stack: error.stack });
    if (page && !page.isClosed()) try { row.failureObservation = await capture(page, row, 'method-failure-current'); } catch (captureError) { row.captureFailure = captureError.message; }
  } finally {
    clearTimeout(timer); heldGates.get(row)?.release();
    if (context) try { await context.close(); } catch (error) { localFailure = true; report.methodFailures.push({ case: row.id, phase: 'context-close', name: error.name, message: error.message }); }
    try { wireReady(row); } catch (error) { localFailure = true; report.methodFailures.push({ case: row.id, phase: 'wire-foundation', name: error.name, message: error.message }); }
    row.healthyFoundation = row.journeyComplete && !localFailure;
  }
}
try {
  browser = await pw.chromium.launch({ headless: true, timeout: 30000 });
  for (const profile of PROFILES) for (const spec of CASES) {
    const row = makeRow(spec, profile, spec.id + '-' + profile.id); report.contexts.push(row); await runContext(row, journey);
    if (row.healthyFoundation) {
      let failure; try { placementReady(row); } catch (error) { failure = error; }
      row.actualPlacementPass = !failure;
      const result = { id: row.id, route: spec.route, profile, actualPass: !failure, originalContext: row.id + '-context.json', actualFailure: failure ? { name: failure.name, message: failure.message } : null };
      report.placement.push(result);
      if (failure) (failure instanceof assert.AssertionError ? report.featureFailures : report.methodFailures).push({ case: row.id, phase: 'actual-placement', ...result.actualFailure });
    }
    write(row.id + '-context.json', row);
  }
  report.healthyFoundation = report.contexts.length === 27 && report.contexts.every(row => row.healthyFoundation);
  report.actualPlacementPass = report.placement.length === 27 && report.placement.every(item => item.actualPass);
  write('actual-primary-foundations.json', report.contexts); write('actual-placement-outcomes.json', report.placement);
  if (report.healthyFoundation && report.actualPlacementPass) {
    const row = makeRow(CASES.find(spec => spec.id === 'home'), PROFILES[0], 'delayed-free-kick-328-light'); report.transitions.push(row);
    prepareChunkGate(row, freeKickChunk); await runContext(row, delayedRouteJourney);
    if (row.healthyFoundation) {
      try { transitionReady(row); row.qualified = true; }
      catch (error) { row.qualified = false; report.featureFailures.push({ case: row.id, phase: 'actual-transition', name: error.name, message: error.message }); }
    }
    write(row.id + '-context.json', row);
    report.transitionPass = row.qualified === true;
    if (report.transitionPass) report.controls = copiedControls(report.contexts, row);
  }
} catch (error) { report.methodFailures.push({ phase: 'driver-or-checker', name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.methodFailures.push({ phase: 'browser-close', name: error.name, message: error.message }); }
  try { const after = pins(); write('source-after.json', after); same(after, before, 'MENU_PLACEMENT_SELECTED_SOURCE_HELD'); report.sourceHeld = true; }
  catch (error) { report.methodFailures.push({ phase: 'source-holds', name: error.name, message: error.message }); }
  report.normalImages = [...report.contexts, ...report.transitions].flatMap(row => row.images);
  report.qualified = report.healthyFoundation && report.actualPlacementPass && report.transitionPass && report.controls.length === 17
    && report.normalImages.length === 56 && report.sourceHeld && report.methodFailures.length === 0 && report.featureFailures.length === 0;
  report.status = report.qualified ? 'POSITIVE_MENU_PLACEMENT_QUALIFIED' : 'NOT_QUALIFIED'; write('report.json', report);
}
assert(report.qualified, 'MENU_PLACEMENT_PRODUCT_NOT_QUALIFIED');
console.log('MENU_PLACEMENT_PRODUCT_QUALIFIED:27 primary profiles, one actual delayed route transition,56 originals and17 effective actual-copy checker controls.');
