/* Source-only proposal. Intended missing-placement tests run only on a completed remote build. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, seed, sha, checkFonts, LINKS, shellFixture, pollFixture, pollDay } from './siteMenuNavigationSupport.mjs';

const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const OUT = process.env.PLACEMENT_BROWSER_OUT, DIST = path.resolve(process.env.PLACEMENT_DIST || 'dist');
const PARENT = '81c099778d0c00c6017c6cff811e4f8be20b1766', MAIN = '7a92b329e9901c4bdd41eb6a4bf8c6f5020143c0';
const CASES = [
  { id: 'free-kick', route: '/free-kick', heading: 'Free Kick', owner: 'nav[data-site-chrome]', marker: 'MENU_PLACEMENT_GAME_HEADER' },
  { id: 'home', route: '/', heading: 'Free sports games', owner: 'header[data-site-chrome]', marker: 'MENU_PLACEMENT_SITE_HEADER' },
  { id: 'search', route: '/search', heading: 'Search every game', owner: null, marker: 'MENU_PLACEMENT_SEARCH_FLOW' },
];
const HELD = {
  'src/components/layout/SiteMenu.tsx': 'cefcb359a8e02fe39a77e7de812299b8579441923ee41e81f592f8cf57ebf85f',
  'src/components/layout/SiteMenuPanel.tsx': 'adf1116d3d187839a6b67076538c6f7149d414298b15e2226f6125e35671eed2',
  'src/App.tsx': 'd62d475ea574aed94597614342540ea7940d2bbe1f2821b286c471ccee75e2a4',
  'src/components/layout/Header.tsx': 'bf484294e23423739029fffdb013e7bb2f8d8d3848a7ac246384ecf8efb14030',
  'src/components/game/GameNavbar.tsx': '29de7bbedc6fe68099e54e61c4aa757f7abbf8c2de143c4d91bff04bd074512a',
  'src/index.css': 'ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'src/test/SiteMenu.finder.test.tsx': '91b0365a2b637c20947b9c996a5d24551c6c95105988a3fa9e261ee9714bee8b',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
};
const SOURCES = [...Object.keys(HELD), 'src/pages/Index.tsx', 'src/pages/Search.tsx', 'src/pages/FreeKick.tsx',
  'src/components/game/GameHelp.tsx', 'src/components/game/HowToPlayPopover.tsx', 'src/components/home/PollOfTheDay.tsx',
  'src/lib/siteSearch.ts', 'src/data/gameRegistry.ts', 'src/data/searchKeywords.json', 'src/lib/nameFold.ts',
  'scripts/qa/playMenuPlacementBaseline.mjs'];
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

/* Actual-node observation only. No styles, locks, nodes or focus are supplied. */
function collect(spec) {
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility === 'visible';
  const describe = node => {
    if (!node) return null;
    const r = rect(node), s = getComputedStyle(node), at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    let painted = visible(node); for (let p = node; p; p = p.parentElement) painted &&= Number(getComputedStyle(p).opacity) > 0;
    return { tag: node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '), href: node.getAttribute('href'), rect: r,
      visible: visible(node), painted, hit: !!at && (at === node || node.contains(at)), pointer: s.pointerEvents, position: s.position };
  };
  const root = document.documentElement, body = document.body, b = getComputedStyle(body), h = getComputedStyle(root);
  const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible), trigger = triggers[0];
  const owners = spec.owner ? [...document.querySelectorAll(spec.owner)].filter(visible) : [], owner = owners[0];
  const logo = owner ? [...owner.querySelectorAll('a[href="/"]')].find(node => /DoUKnowBall/i.test(node.textContent)) : null;
  const menu = [...document.querySelectorAll('[role="dialog"][data-state="open"]')].find(node => node.querySelector('nav[aria-label="Site navigation"]'));
  const field = menu?.querySelector('input[type="search"]'), nav = menu?.querySelector('nav[aria-label="Site navigation"]');
  const active = document.activeElement, chain = [];
  for (let node = trigger; node; node = node.parentElement) chain.push({ tag: node.tagName, siteChrome: node.hasAttribute('data-site-chrome'), position: getComputedStyle(node).position, rect: rect(node) });
  return { href: location.href, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, htmlWidth: root.scrollWidth, bodyWidth: body.scrollWidth, documentHeight: root.scrollHeight },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    light: root.classList.contains('light'), headings: [...document.querySelectorAll('#dukb-main h1')].filter(visible).map(node => node.textContent.trim()),
    triggers: triggers.map(describe), trigger: describe(trigger), flowChain: chain,
    ownerCount: owners.length, owner: owner ? { ...describe(owner), containsTrigger: owner.contains(trigger), logo: describe(logo) } : null,
    headerCount: [...document.querySelectorAll('header[data-site-chrome],nav[data-site-chrome]')].filter(visible).length,
    active: active ? { ...describe(active), trigger: active === trigger, finder: active === field, heading: /^H[1-6]$/.test(active.tagName), editable: active.matches('input,textarea,select,[contenteditable="true"]') } : null,
    menu: menu ? { rect: rect(menu), links: [...nav.querySelectorAll('a[href]')].map(node => [node.getAttribute('href'), node.textContent.trim()]), field: field ? { ...describe(field), value: field.value, maxLength: field.maxLength, name: [...field.labels].map(node => node.textContent.trim()).join(' ') } : null,
      results: [...menu.querySelectorAll('[aria-label="Game results"] a[href]')].map(describe) } : null,
    locks: { bodyStyle: body.getAttribute('style'), bodyClass: body.getAttribute('class'), htmlStyle: root.getAttribute('style'), htmlClass: root.getAttribute('class'), bodyScrollLocked: body.getAttribute('data-scroll-locked'),
      bodyComputed: { overflow: b.overflow, overflowX: b.overflowX, overflowY: b.overflowY, pointerEvents: b.pointerEvents }, htmlComputed: { overflow: h.overflow, overflowX: h.overflowX, overflowY: h.overflowY, pointerEvents: h.pointerEvents } },
    bodyInlineStyle: { length: body.style.length, cssText: body.style.cssText }, trusted: window.__siteMenuTrusted || [] };
}
function bounds(sample) {
  checkFonts(sample.fonts);
  assert(sample.light && sample.viewport.width === 328 && sample.viewport.height === 515, 'MENU_PLACEMENT_ACTUAL_PROFILE');
  assert(sample.viewport.htmlWidth <= 328.5 && sample.viewport.bodyWidth <= 328.5, 'MENU_PLACEMENT_FOUNDATION_OVERFLOW');
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
  bounds(sample);
  assert.equal(new URL(sample.href).pathname + new URL(sample.href).search, spec.route, 'MENU_PLACEMENT_FOUNDATION_ROUTE');
  assert(sample.headings.includes(spec.heading) && sample.triggers.length === 1 && !sample.menu, 'MENU_PLACEMENT_FOUNDATION_REAL_ROUTE_MENU');
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
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) }); return route.continue();
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const known = shellFixture(request, url) || (row.id === 'home' ? pollFixture(request, url, row.pollDay) : null);
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
  const beforeOpen = await capture(page, row, label + '-before'); bounds(beforeOpen);
  assert.equal(beforeOpen.triggers.length, 1, 'MENU_PLACEMENT_FOUNDATION_ONE_MENU'); targetReady(beforeOpen.trigger, beforeOpen.viewport);
  await page.getByRole('button', { name: 'Open site menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true }); await menu.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.textContent.trim() === 'Menu' && /^H[1-6]$/.test(document.activeElement.tagName));
  await menu.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  const opening = await capture(page, row, label + '-open'); bounds(opening);
  assert(opening.menu && opening.active?.heading && !opening.active.editable && opening.active.text === 'Menu', 'MENU_PLACEMENT_FOUNDATION_MENU_HEADING');
  same(opening.menu.links, LINKS, 'MENU_PLACEMENT_FOUNDATION_SEVENTEEN_LINKS');
  assert(opening.menu.field?.name === 'Find a game' && opening.menu.field.value === '' && opening.menu.field.maxLength === 80, 'MENU_PLACEMENT_FOUNDATION_FINDER_RESET');
  const r = opening.menu.rect; assert(r.x >= 0 && r.y >= 0 && r.right <= 328.5 && r.bottom <= 515.5, 'MENU_PLACEMENT_FOUNDATION_PANEL_BOUNDS');
  row.openings.push({ label, beforeOpen, opening }); return { menu, beforeOpen };
}
async function journey(page, row) {
  await page.goto(BASE + row.spec.route, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: row.spec.heading, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open site menu', exact: true, includeHidden: true }).waitFor({ state: 'attached' });
  if (row.id === 'free-kick') {
    await page.getByRole('button', { name: 'How to play', exact: true, includeHidden: true }).waitFor({ state: 'attached' });
    const guide = page.getByRole('dialog', { name: 'How to play', exact: true });
    row.instructions = { observedPhase: 'Game landing, before menu foundation or return-focus claims', visible: await guide.isVisible() };
    if (row.instructions.visible) {
      row.instructions.before = await capture(page, row, 'instructions-arrived');
      const acknowledge = guide.getByRole('button', { name: "Let's Play!", exact: true });
      await acknowledge.click(); await guide.waitFor({ state: 'hidden' });
      row.instructions.after = await capture(page, row, 'instructions-acknowledged');
    }
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('16px Inter') && document.fonts.check('16px "Space Grotesk"'));
  row.top = await capture(page, row, 'top', true); bounds(row.top);
  assert(row.top.headings.includes(row.spec.heading) && row.top.triggers.length === 1, 'MENU_PLACEMENT_FOUNDATION_REAL_ROUTE');
  if (row.spec.owner) assert(row.top.ownerCount === 1 && row.top.owner?.painted && row.top.owner.logo?.painted, 'MENU_PLACEMENT_FOUNDATION_ACTUAL_HEADER_LOGO');
  else assert.equal(row.top.headerCount, 0, 'MENU_PLACEMENT_FOUNDATION_HEADERLESS_SEARCH');
  let session = await openMenu(page, row, 'finder');
  await page.keyboard.press('Tab');
  const field = session.menu.getByRole('searchbox', { name: 'Find a game', exact: true });
  assert(await field.evaluate(node => document.activeElement === node), 'MENU_PLACEMENT_FOUNDATION_NATIVE_TAB');
  await field.pressSequentially('Club Manager', { delay: 10 });
  await session.menu.locator('[aria-label="Game results"] a[href="/club-manager"]').waitFor();
  row.finder = await capture(page, row, 'finder-result', true); bounds(row.finder);
  assert(row.finder.menu.field.value === 'Club Manager' && row.finder.menu.results.some(item => item.href === '/club-manager' && item.text.includes('Club Manager') && item.text.includes('Soccer')), 'MENU_PLACEMENT_FOUNDATION_ACTUAL_FINDER');
  await page.keyboard.press('Escape'); row.firstClosed = await closed(page, row, session.beforeOpen, 'first-closed');
  row.firstCloseUsedEmptyStyleException = lockFieldsReady(row.firstClosed, session.beforeOpen);
  session = await openMenu(page, row, 'reopen'); await page.keyboard.press('Escape');
  row.atRest = await closed(page, row, session.beforeOpen, 'menu-closed', row.id !== 'search');
  assert(row.atRest.trusted.some(event => event.trusted), 'MENU_PLACEMENT_FOUNDATION_TRUSTED_MENU_CLICK');
  if (row.id === 'search') {
    row.scrollBefore = await capture(page, row, 'scroll-before');
    assert.equal(row.scrollBefore.viewport.scrollY, 0, 'MENU_PLACEMENT_SCROLL_START_AT_TOP');
    await page.mouse.move(300, 480); await page.mouse.wheel(0, 192);
    await page.waitForFunction(() => window.scrollY >= 64);
    let previous = await page.evaluate(() => window.scrollY);
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.waitForTimeout(50); const current = await page.evaluate(() => window.scrollY);
      if (Math.abs(current - previous) < 0.5) break; previous = current;
    }
    row.scrollAfter = await capture(page, row, 'document-scrolled', true); bounds(row.scrollAfter);
    assert(row.scrollAfter.viewport.scrollY - row.scrollBefore.viewport.scrollY >= 64, 'MENU_PLACEMENT_FOUNDATION_ACTUAL_DOCUMENT_WHEEL');
  }
  assert.equal(row.images.length, 3, 'MENU_PLACEMENT_THREE_IMAGES_PER_CASE');
  row.journeyComplete = true;
}
function placementReady(row) {
  assert(row.healthyFoundation, 'MENU_PLACEMENT_REQUIRES_HEALTHY_FOUNDATION');
  const sample = row.atRest;
  if (row.spec.owner) {
    assert(sample.triggers.length === 1 && sample.ownerCount === 1 && sample.owner?.containsTrigger, row.spec.marker);
    const a = sample.trigger.rect, b = sample.owner.logo.rect;
    assert(a.width >= 44 && a.height >= 44, 'MENU_PLACEMENT_HEADER_44');
    const vertical = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
    assert(vertical >= Math.min(a.height, b.height) / 2 && (a.right <= b.x + 0.5 || b.right <= a.x + 0.5), 'MENU_PLACEMENT_HEADER_LOGO_ROW');
  } else {
    assert(sample.triggers.length === 1 && sample.headerCount === 0 && sample.flowChain.every(item => !['sticky', 'fixed'].includes(item.position)), row.spec.marker);
    const dy = row.scrollAfter.viewport.scrollY - row.scrollBefore.viewport.scrollY;
    assert(dy >= 64, 'MENU_PLACEMENT_SEARCH_SCROLL_EVIDENCE');
    assert(Math.abs(row.scrollAfter.trigger.rect.y - row.scrollBefore.trigger.rect.y + dy) <= 1, 'MENU_PLACEMENT_SEARCH_DOCUMENT_MOTION');
  }
}
/* Synthetic copied geometry witnesses exercise the checker, never the product UI. */
function copiedControls(rows) {
  assert(rows.every(row => row.healthyFoundation), 'MENU_PLACEMENT_CONTROL_ACTUAL_FOUNDATION');
  const witnesses = rows.map(({ id, spec, healthyFoundation, atRest, scrollBefore, scrollAfter }) => JSON.parse(JSON.stringify({ id, spec, healthyFoundation, atRest, scrollBefore, scrollAfter })));
  const derivations = [];
  for (const witness of witnesses) {
    const original = rows.find(row => row.id === witness.id), edits = [];
    const edit = (field, beforeValue, afterValue) => edits.push({ field, before: beforeValue, after: afterValue });
    if (witness.spec.owner) {
      edit('atRest.owner.containsTrigger', witness.atRest.owner.containsTrigger, true); witness.atRest.owner.containsTrigger = true;
      const old = witness.atRest.trigger.rect, logo = witness.atRest.owner.logo.rect;
      const x = logo.right + 8, y = logo.y + (logo.height - 44) / 2;
      const derived = { x, y, width: 44, height: 44, right: x + 44, bottom: y + 44 };
      edit('atRest.trigger.rect', old, derived); witness.atRest.trigger.rect = derived;
    } else {
      const old = witness.atRest.flowChain.map(item => item.position);
      witness.atRest.flowChain.forEach(item => { if (['sticky', 'fixed'].includes(item.position)) item.position = 'static'; });
      edit('atRest.flowChain.position', old, witness.atRest.flowChain.map(item => item.position));
      const oldRect = witness.scrollAfter.trigger.rect, dy = witness.scrollAfter.viewport.scrollY - witness.scrollBefore.viewport.scrollY;
      witness.scrollAfter.trigger.rect = { ...oldRect, y: witness.scrollBefore.trigger.rect.y - dy, bottom: witness.scrollBefore.trigger.rect.bottom - dy };
      edit('scrollAfter.trigger.rect', oldRect, witness.scrollAfter.trigger.rect);
    }
    placementReady(witness);
    derivations.push({ id: witness.id, scope: 'DERIVED_PASSING_PLACEMENT_WITNESS_ONLY', actualFeaturePassCredit: false, originalCaseFile: original.id + '-context.json', edits });
  }
  write('control-witness-derivations.json', derivations);
  const foundation = JSON.stringify(witnesses, null, 2) + '\n'; fs.writeFileSync(path.join(OUT, 'control-derived-foundation.json'), foundation, { flag: 'wx' });
  const controls = [];
  const control = (id, index, mutate, marker) => {
    const copy = JSON.parse(foundation); mutate(copy[index]); const changed = JSON.stringify(copy, null, 2) + '\n', file = 'control-' + id + '.json';
    assert.notEqual(sha(changed), sha(foundation), 'MENU_PLACEMENT_CONTROL_EFFECTIVE');
    fs.writeFileSync(path.join(OUT, file), changed, { flag: 'wx' }); const changedFile = 'control-' + id + '.changed.json';
    fs.writeFileSync(path.join(OUT, changedFile), fs.readFileSync(path.join(OUT, file)), { flag: 'wx' });
    let failure; try { placementReady(JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'))[index]); } catch (error) { failure = error; }
    assert(failure instanceof assert.AssertionError && failure.message.includes(marker), 'MENU_PLACEMENT_CONTROL_OWNED: ' + id);
    fs.writeFileSync(path.join(OUT, file), foundation); assert.equal(sha(fs.readFileSync(path.join(OUT, file))), sha(foundation), 'MENU_PLACEMENT_CONTROL_SAME_COPY_RESTORE');
    for (const restored of JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'))) placementReady(restored);
    controls.push({ id, marker, scope: 'DERIVED_COPIED_CHECKER_ONLY', actualFeaturePassCredit: false, foundation: 'control-derived-foundation.json', changedFile, restoredFile: file,
      beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(path.join(OUT, file))), sameCopyRestored: true, actualFailure: { name: failure.name, message: failure.message } });
  };
  control('game-owner', 0, row => { row.atRest.owner.containsTrigger = false; }, 'MENU_PLACEMENT_GAME_HEADER');
  control('home-owner', 1, row => { row.atRest.owner.containsTrigger = false; }, 'MENU_PLACEMENT_SITE_HEADER');
  control('short-header-target', 0, row => { row.atRest.trigger.rect.height = 43; }, 'MENU_PLACEMENT_HEADER_44');
  control('different-logo-row', 1, row => { row.atRest.trigger.rect.y += 100; row.atRest.trigger.rect.bottom += 100; }, 'MENU_PLACEMENT_HEADER_LOGO_ROW');
  control('sticky-fallback', 2, row => { row.atRest.flowChain[0].position = 'sticky'; }, 'MENU_PLACEMENT_SEARCH_FLOW');
  control('fixed-fallback', 2, row => { row.atRest.flowChain[0].position = 'fixed'; }, 'MENU_PLACEMENT_SEARCH_FLOW');
  control('no-document-scroll', 2, row => { row.scrollAfter.viewport.scrollY = row.scrollBefore.viewport.scrollY; }, 'MENU_PLACEMENT_SEARCH_SCROLL_EVIDENCE');
  control('pinned-scroll-rectangle', 2, row => { row.scrollAfter.trigger.rect.y = row.scrollBefore.trigger.rect.y; }, 'MENU_PLACEMENT_SEARCH_DOCUMENT_MOTION');
  return controls;
}
const report = { schema: 1, source: process.env.GITHUB_SHA, immutableClean424Parent: PARENT, mainAtPlan: MAIN,
  scope: 'Three signed-out328x515/light real Menu placement observations, no app port',
  planned: { contexts: 3, normalImages: 9, copiedControls: 8, expectedRawProcessExit: 1 },
  status: 'NOT_ADMITTED', healthyFoundation: false, actualPlacementPass: false, baselineAdmitted: false,
  limits: ['No overlap, gameplay, signed-in layout, pending-consent, delayed-mount, universal accessibility or release claim.',
    'Derived passing witnesses and copied controls prove checker behavior only, never actual feature health.',
    'Search fallback requirement explicitly excludes sticky/fixed ancestors and requires document-wheel rectangle motion.'],
  contexts: [], placement: [], controls: [], methodFailures: [], sourceHeld: false };
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, timeout: 30000 });
  for (const spec of CASES) {
    const row = { id: spec.id, spec, healthyFoundation: false, journeyComplete: false, pollDay: pollDay(Date.now()), samples: [], images: [], openings: [], closings: [], io: [],
      wire: { pageErrors: [], console: [], failed: [], sockets: [] } }; report.contexts.push(row);
    let context, page, timer, localFailure = false;
    try {
      context = await browser.newContext({ viewport: { width: 328, height: 515 }, deviceScaleFactor: 1, colorScheme: 'light', isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
      context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000);
      await context.addInitScript(seed, { theme: 'light', pending: false }); await boundary(context, row); page = await context.newPage();
      page.on('pageerror', error => row.wire.pageErrors.push({ message: error.message, stack: error.stack }));
      page.on('console', message => row.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
      page.on('requestfailed', request => row.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
      await Promise.race([journey(page, row), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('MENU_PLACEMENT_CONTEXT_DEADLINE')), 60000); })]);
    } catch (error) {
      localFailure = true; report.methodFailures.push({ case: row.id, phase: 'healthy-foundation', name: error.name, message: error.message, stack: error.stack });
      if (page && !page.isClosed()) try { row.failureObservation = await capture(page, row, 'method-failure-current'); } catch (captureError) { row.captureFailure = captureError.message; }
    } finally {
      clearTimeout(timer);
      if (context) try { await context.close(); } catch (error) { localFailure = true; report.methodFailures.push({ case: row.id, phase: 'context-close', name: error.name, message: error.message }); }
      try { wireReady(row); } catch (error) { localFailure = true; report.methodFailures.push({ case: row.id, phase: 'wire-foundation', name: error.name, message: error.message }); }
      row.healthyFoundation = row.journeyComplete && !localFailure; write(row.id + '-context.json', row);
    }
  }
  report.healthyFoundation = report.contexts.length === 3 && report.contexts.every(row => row.healthyFoundation);
  write('actual-foundation-before-placement.json', report.contexts);
  if (report.healthyFoundation) {
    for (const row of report.contexts) {
      let failure; try { placementReady(row); } catch (error) { failure = error; }
      const ownedExpectedFailure = failure instanceof assert.AssertionError && failure.message.includes(row.spec.marker);
      report.placement.push({ id: row.id, marker: row.spec.marker, actualPass: !failure, ownedExpectedFailure,
        actualFailure: failure ? { name: failure.name, message: failure.message } : null, originalContext: row.id + '-context.json' });
      if (!ownedExpectedFailure) report.methodFailures.push({ case: row.id, phase: 'unexpected-placement-outcome', name: failure?.name || 'UnexpectedPass', message: failure?.message || 'Missing-placement baseline unexpectedly passed' });
    }
    write('actual-placement-outcomes.json', report.placement);
    if (report.placement.every(item => item.ownedExpectedFailure)) { report.controls = copiedControls(report.contexts); assert.equal(report.controls.length, 8, 'MENU_PLACEMENT_EIGHT_CONTROLS'); }
  }
} catch (error) { report.methodFailures.push({ phase: 'driver-or-checker', name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.methodFailures.push({ phase: 'browser-close', name: error.name, message: error.message }); }
  try { const after = pins(); write('source-after.json', after); same(after, before, 'MENU_PLACEMENT_SELECTED_SOURCE_HELD'); report.sourceHeld = true; }
  catch (error) { report.methodFailures.push({ phase: 'source-holds', name: error.name, message: error.message }); }
  report.normalImages = report.contexts.flatMap(row => row.images);
  report.actualPlacementPass = report.placement.length === 3 && report.placement.every(item => item.actualPass);
  report.baselineAdmitted = report.healthyFoundation && report.placement.length === 3 && report.placement.every(item => item.ownedExpectedFailure)
    && report.controls.length === 8 && report.normalImages.length === 9 && report.sourceHeld && report.methodFailures.length === 0;
  report.status = report.baselineAdmitted ? 'EXPECTED_MISSING_PLACEMENT_BASELINE_COMPLETE' : 'NOT_ADMITTED';
  write('report.json', report);
}
assert(report.baselineAdmitted, 'MENU_PLACEMENT_BASELINE_NOT_ADMITTED');
console.log('Three healthy Menu foundations, nine original images and eight derived copied checker controls retained. All three actual placement tests failed at their owned expected assertions.');
assert.fail('MENU_PLACEMENT_EXPECTED_MISSING_PLACEMENT');
