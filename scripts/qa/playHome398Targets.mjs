/* Source-only fresh Home398 qualification proposal. No legacy runtime credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, seed, sha, checkFonts, shellFixture, pollFixture, pollDay } from './siteMenuNavigationSupport.mjs';

const ROOT = process.cwd(), BASE = 'http://127.0.0.1:4173';
const MAIN = 'dfb2720d783a30a6ecd814aa86e8c199ec6b4175';
const OUT = process.env.HOME398_BROWSER_OUT, DIST = path.resolve(process.env.HOME398_DIST || 'dist');
const RECEIPT = process.env.SIM_OFFLINE_RECEIPT, GUARD = path.resolve('scripts/lib/offlineTransport.cjs');
const PROFILES = [320, 390, 430, 640, 768, 1440].flatMap(width => ['no-preference', 'reduce'].map(motion => ({ id: width + '-' + motion, width, height: 900, motion })));
const LEFT = 'Scroll the daily puzzles back', RIGHT = 'Scroll the daily puzzles on';
const SPORTS = ['aussie', 'baseball', 'basketball', 'college', 'combat', 'f1', 'football', 'golf', 'hockey', 'nascar', 'soccer', 'tennis', 'world'];
const PHASES = ['before-preparation', 'pointer-ready', 'pointer-golf', 'keyboard-enter-clear', 'keyboard-space-golf', 'after-reload', 'after-reload-prepared'];
const HELD = {
  'src/components/home/DailyRail.tsx': 'aadb3132b78f5df02f530d6a5bc13b0a5499de85a654182ccba19e5f1db1b2a3',
  'src/components/home/FavouriteSport.tsx': 'f137be9c315d28a3fb8fbe5e0a60db31660115b61ca88fe75f192178540233e2',
  'src/App.tsx': 'f6572f98fab5b8e85a97d4e6321dc4109023738743527e20dd5a6700477ed89e',
  'src/pages/Index.tsx': '000c61fdad48c6501adc431f24a470013dc0b8d182154e28d4156f7039725f51',
  'src/components/layout/Header.tsx': 'b0f43467bec631dfaac8c3023edb2df8ec6d1a044189dd93486ab27f30554a05',
  'src/data/homeFront.ts': '250a31ee2f6f27758765a029d98e804f5dd807c0a184f8e8e162c7de3041f79b',
  'src/data/gameRegistry.ts': '7f8724177e7672a737035f9cbdf53a11121609a4a497e6d5ecef172e41c8a3b4',
  'src/lib/dateUtils.ts': '90cc431b127059c58d3a64c98508e97ed96620dee44c4bd8b6e5a4abd0d30966',
  'src/components/home/SportGlyph.tsx': '46713f2069b53ec19e06561d981ff10a660147a07dd301c4f4299bc658b6885f',
  'src/index.css': 'ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3',
  'src/lib/theme.ts': 'b864c89c05e7a757ef14b1e7e1efe1bf3b706f8fb01b4a443fbe05cab5240360',
  'src/components/home/PollOfTheDay.tsx': '61763f32d48db1687eb3f3144738330c3df1c24850e6a4f4ae1c83f4de837454',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
  'scripts/lib/offlineTransport.cjs': 'e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221',
};
const SOURCES = [...Object.keys(HELD), 'scripts/qa/playHome398Targets.mjs'];
const same = (a, b, marker) => assert.deepEqual(a, b, marker);
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = () => SOURCES.map(file => { const body = fs.readFileSync(file); return { path: file, bytes: body.length, sha256: sha(body) }; });
assert(process.env.CI === 'true' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '') && process.env.EXPECTED_MAIN === MAIN, 'HOME398_REMOTE_SOURCE_MAIN');
assert(/^[a-f0-9]{40}$/.test(process.env.EXPECTED_PARENT || ''), 'HOME398_CALLER_BOUND_PARENT_REQUIRED');
assert(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'HOME398_OUTPUT_OUTSIDE_SOURCE');
assert(RECEIPT && path.isAbsolute(RECEIPT) && !path.resolve(RECEIPT).startsWith(ROOT + path.sep) && fs.statSync(RECEIPT).isFile() && fs.statSync(RECEIPT).size === 0, 'HOME398_CALLER_EMPTY_TRANSPORT');
assert((process.env.NODE_OPTIONS || '').split(/\s+/).includes('--require=' + GUARD) && process.env.SIM_NETWORK === 'offline', 'HOME398_CALLER_GUARD_REQUIRED');
assert(fs.statSync(DIST).isDirectory(), 'HOME398_COMPLETED_DIST'); fs.mkdirSync(OUT, { recursive: true }); assert.equal(fs.readdirSync(OUT).length, 0, 'HOME398_FRESH_OUTPUT');
const before = pins(); for (const pin of before) if (HELD[pin.path]) assert.equal(pin.sha256, HELD[pin.path], 'HOME398_HELD_SOURCE: ' + pin.path);
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const clockBytes = fs.readFileSync(process.env.HOME398_CLOCK_REFERENCE_JSON);
assert.equal(sha(clockBytes), process.env.HOME398_CLOCK_REFERENCE_SHA256, 'HOME398_CLOCK_REFERENCE_BODY');
const clock = JSON.parse(clockBytes);
assert(clock.status === 'ACTUAL_POLL_DAY_CURRENT_CLOCK_EQUALITY_ONLY' && clock.source === process.env.GITHUB_SHA && clock.parent === process.env.EXPECTED_PARENT && clock.mainAtStart === MAIN
  && clock.scope === 'CURRENT_CLOCK_ONLY_NO_DST_EQUIVALENCE_CLAIM' && clock.equal === true && clock.dateRestored === true && clock.genericDSTEquivalenceClaim === false, 'HOME398_ACTUAL_CURRENT_CLOCK_GATE');
assert(clock.actual === clock.helper && pollDay(clock.clock) === clock.helper, 'HOME398_CLOCK_HELPER_BINDING');
for (const file of ['src/lib/dateUtils.ts', 'scripts/qa/siteMenuNavigationSupport.mjs']) assert.equal(clock.sourcePins.find(pin => pin.path === file)?.sha256, HELD[file], 'HOME398_CLOCK_INPUT_PIN');
fs.writeFileSync(path.join(OUT, 'clock-reference.original.json'), clockBytes, { flag: 'wx' }); write('source-before.json', before);

/* Read actual nodes only. Preparation scrolling is outside all action-stability claims. */
function collect() {
  const box = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => !!node && node.getClientRects().length > 0 && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility === 'visible';
  const describe = node => {
    if (!node) return null;
    const r = box(node), s = getComputedStyle(node); let painted = visible(node);
    for (let parent = node; parent; parent = parent.parentElement) painted &&= Number(getComputedStyle(parent).opacity) > 0;
    const inside = outer => r.x >= outer.x - 0.5 && r.y >= outer.y - 0.5 && r.right <= outer.right + 0.5 && r.bottom <= outer.bottom + 0.5;
    const viewport = { x: 0, y: 0, right: innerWidth, bottom: innerHeight }; let unclipped = inside(viewport);
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent); if ([style.overflowX, style.overflowY].some(value => value !== 'visible')) unclipped &&= inside(box(parent));
    }
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { ...r, label: node.getAttribute('aria-label'), text: node.textContent.trim(), sport: node.getAttribute('data-fav-sport'),
      pressed: node.getAttribute('aria-pressed'), tag: node.tagName, visible: visible(node), painted, unclipped,
      focused: document.activeElement === node, centerHit: !!at && (at === node || node.contains(at)), pointer: s.pointerEvents };
  };
  const daily = document.querySelector('[data-home-dailies]'), favourite = document.querySelector('[data-home-fav-sport]');
  const rail = section => section?.querySelector('div.overflow-x-auto');
  const record = section => { const scroll = rail(section); return section && scroll ? { section: { ...box(section), documentTop: section.getBoundingClientRect().top + scrollY },
    rail: { ...box(scroll), left: scroll.scrollLeft, clientWidth: scroll.clientWidth, contentWidth: scroll.scrollWidth } } : null; };
  return { href: location.href, heading: document.querySelector('#dukb-main h1')?.textContent.trim() || null,
    viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, htmlWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth },
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches, dark: !document.documentElement.classList.contains('light'),
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
    daily: daily ? { ...record(daily), arrows: [...daily.querySelectorAll('button')].map(describe) } : null,
    favourite: favourite ? { ...record(favourite), buttons: [...favourite.querySelectorAll('button[data-fav-sport]')].map(describe),
      stored: localStorage.getItem('dukb-fav-sport'), firstSport: document.querySelector('section[data-sport]')?.getAttribute('data-sport') || null } : null,
    active: { tag: document.activeElement?.tagName || null, label: document.activeElement?.getAttribute('aria-label') || null, sport: document.activeElement?.getAttribute('data-fav-sport') || null },
    trusted: window.__siteMenuTrusted || [] };
}
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.5;
const arrow = (sample, label) => sample.daily.arrows.find(item => item.label === label);
const chip = sample => sample.favourite.buttons.find(item => item.sport === 'golf');
const nativeArrow = (sample, label) => assert(sample.active.tag === 'BUTTON' && sample.active.label === label && arrow(sample, label)?.focused, 'HOME398_DAILY_NATIVE_FOCUS');
const nativeGolf = sample => assert(sample.active.tag === 'BUTTON' && sample.active.sport === 'golf' && chip(sample)?.focused, 'HOME398_FAV_NATIVE_FOCUS');
function foundation(sample, profile) {
  checkFonts(sample.fonts);
  assert(new URL(sample.href).pathname === '/' && !new URL(sample.href).search && !new URL(sample.href).hash
    && sample.heading === 'Free sports games' && sample.daily && sample.favourite, 'HOME398_ACTUAL_HOME');
  assert(sample.dark && sample.viewport.width === profile.width && sample.viewport.height === 900
    && sample.motion === (profile.motion === 'reduce'), 'HOME398_ACTUAL_PROFILE');
  assert(sample.viewport.htmlWidth <= profile.width + 0.5 && sample.viewport.bodyWidth <= profile.width + 0.5, 'HOME398_NO_HORIZONTAL_OVERFLOW');
}
function geometryStable(samples, kind, marker, keepLeft) {
  const first = samples[0], base = first[kind];
  for (const sample of samples.slice(1)) {
    assert(near(sample.viewport.scrollX, first.viewport.scrollX) && near(sample.viewport.scrollY, first.viewport.scrollY), marker);
    for (const key of ['x', 'y', 'width', 'height', 'right', 'bottom', 'documentTop']) assert(near(sample[kind].section[key], base.section[key]), marker);
    for (const key of ['x', 'y', 'width', 'height', 'right', 'bottom', 'clientWidth', 'contentWidth']) assert(near(sample[kind].rail[key], base.rail[key]), marker);
    if (keepLeft) assert(near(sample[kind].rail.left, base.rail.left), marker);
  }
}
function dailyReady(row) {
  const steps = row.dailySteps, before = steps[0].sample;
  if (row.profile.width < 640) {
    same(steps.map(item => item.name), ['before'], 'HOME398_DAILY_PHASES');
    assert(before.daily.arrows.length === 2 && before.daily.arrows.every(item => !item.visible && item.width === 0 && item.height === 0), 'HOME398_DAILY_TARGET_44'); return;
  }
  same(steps.map(item => item.name), ['before', 'pointer-right', 'keyboard-shift-tab-left', 'keyboard-enter-left', 'keyboard-tab-right', 'keyboard-space-right'], 'HOME398_DAILY_PHASES');
  for (const { sample } of steps) {
    same(sample.daily.arrows.map(item => item.label), [LEFT, RIGHT], 'HOME398_DAILY_TARGET_44');
    assert(sample.daily.arrows.every(item => item.width >= 44 && item.height >= 44), 'HOME398_DAILY_TARGET_44');
    assert(sample.daily.arrows.every(item => item.painted && item.unclipped && item.centerHit && item.pointer !== 'none'), 'HOME398_DAILY_HIT');
  }
  const [initial, pointer, shift, enter, tab, space] = steps.map(item => item.sample);
  assert(initial.daily.rail.contentWidth > initial.daily.rail.clientWidth && pointer.daily.rail.left > initial.daily.rail.left + 0.5
    && near(shift.daily.rail.left, pointer.daily.rail.left) && near(enter.daily.rail.left, initial.daily.rail.left)
    && near(tab.daily.rail.left, enter.daily.rail.left) && space.daily.rail.left > enter.daily.rail.left + 0.5
    && near(space.daily.rail.left, pointer.daily.rail.left), 'HOME398_DAILY_NATIVE_SCROLL');
  for (const [sample, label] of [[pointer, RIGHT], [shift, LEFT], [enter, LEFT], [tab, RIGHT], [space, RIGHT]]) {
    nativeArrow(sample, label);
  }
  geometryStable(steps.map(item => item.sample), 'daily', 'HOME398_DAILY_STABILITY', false);
}
function favouriteReady(row) {
  same(row.favouriteSteps.map(item => item.name), PHASES, 'HOME398_FAV_CATALOGUE');
  const values = row.favouriteSteps.map(item => item.sample), initial = values[0], catalogue = initial.favourite.buttons.map(item => [item.sport, item.text]);
  same(initial.favourite.buttons.map(item => item.sport).sort(), SPORTS, 'HOME398_FAV_CATALOGUE');
  assert(new Set(catalogue.map(item => item[0])).size === 13 && catalogue.every(item => item[1].length > 0)
    && initial.favourite.stored === null && initial.favourite.firstSport === 'soccer' && initial.favourite.buttons.every(item => item.pressed === 'false'), 'HOME398_FAV_CATALOGUE');
  for (const sample of values) {
    same(sample.favourite.buttons.map(item => [item.sport, item.text]), catalogue, 'HOME398_FAV_CATALOGUE');
    assert(sample.favourite.buttons.every(item => item.width >= 44 && item.height >= 44), 'HOME398_FAV_TARGET_44');
  }
  for (const sample of [...values.slice(1, 5), values[6]]) {
    const golf = chip(sample);
    assert(golf?.painted && golf.unclipped && golf.centerHit && golf.pointer !== 'none', 'HOME398_FAV_HIT');
    assert(sample.favourite.buttons.filter(item => item.painted && item.unclipped).every(item => item.centerHit && item.pointer !== 'none'), 'HOME398_FAV_HIT');
  }
  const selected = (sample, yes, marker) => {
    same(sample.favourite.buttons.filter(item => item.pressed === 'true').map(item => item.sport), yes ? ['golf'] : [], marker);
    assert(sample.favourite.stored === (yes ? 'golf' : null) && sample.favourite.firstSport === (yes ? 'golf' : 'soccer'), marker);
  };
  selected(values[2], true, 'HOME398_FAV_POINTER'); selected(values[3], false, 'HOME398_FAV_ENTER'); selected(values[4], true, 'HOME398_FAV_SPACE');
  for (const sample of values.slice(2, 5)) nativeGolf(sample);
  geometryStable(values.slice(1, 5), 'favourite', 'HOME398_FAV_STABILITY', true);
  selected(values[5], true, 'HOME398_FAV_RELOAD'); selected(values[6], true, 'HOME398_FAV_RELOAD');
}
function wireReady(row) {
  assert(row.io.some(item => item.kind === 'prepared-font') && row.io.every(item => item.kind !== 'unknown-refused'), 'HOME398_IO_KNOWN_ONLY');
  assert.equal(row.wire.pageErrors.length, 0, 'HOME398_NO_PAGE_ERRORS'); assert.equal(row.wire.sockets.length, 0, 'HOME398_NO_SOCKETS');
  const allowed = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
  const known = request => row.io.some(item => item.kind === 'source-shell-backend-abort' && item.url === request.url && item.method === request.method);
  for (const item of row.wire.failed) assert(allowed.has(item.error) && known(item), 'HOME398_EXPLAINED_REQUEST_FAILURE');
  for (const item of row.wire.console.filter(item => item.type === 'error')) assert(row.wire.failed.some(request => allowed.has(request.error) && known(request)
    && request.url === item.url && item.text === 'Failed to load resource: ' + request.error), 'HOME398_EXPLAINED_CONSOLE_ERROR');
}
const transportReady = row => assert(row.initialBytes === 0 && row.finalBytes === 0, 'HOME398_NODE_TRANSPORT_EMPTY');
async function boundary(context, row) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { url: request.url(), method: request.method(), type: request.resourceType(), externalForwarded: false };
    try {
      assert(!url.username && !url.password && !url.hash, 'HOME398_IO_CREDENTIAL_FRAGMENT');
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(item.method) && request.postData() === null, 'HOME398_IO_LOCAL_METHOD');
        const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
        assert(!url.search || freshness, 'HOME398_IO_LOCAL_QUERY');
        const file = path.resolve(DIST, '.' + decodeURIComponent(url.pathname), url.pathname === '/' ? 'index.html' : '');
        assert(file.startsWith(DIST + path.sep) && fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(DIST) + path.sep), 'HOME398_IO_COMPLETED_DIST');
        row.io.push({ ...item, kind: 'completed-dist', file: path.relative(DIST, file) }); return route.continue();
      }
      if (item.method === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(item.type)) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const fixture = shellFixture(request, url) || pollFixture(request, url, row.pollDay);
      if (fixture) { row.io.push({ ...item, kind: 'source-shell-backend-abort', classifier: fixture.id, requestBodySha256: request.postData() === null ? null : sha(request.postData()) }); return route.abort('blockedbyclient'); }
      throw new Error('HOME398_IO_UNKNOWN_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { row.wire.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Scoped Home proof refuses sockets' }); });
}
async function capture(page, row, name, png = false) {
  const sample = await page.evaluate(collect); foundation(sample, row.profile); write(row.id + '-' + name + '.json', sample);
  if (png) {
    const file = row.id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'disabled' });
    const body = fs.readFileSync(path.join(OUT, file)); row.images.push({ file, bytes: body.length, sha256: sha(body), normal: true });
  }
  return sample;
}
async function actualFonts(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('16px Inter') && document.fonts.check('16px "Space Grotesk"'));
}
async function settled(page, kind) {
  const start = Date.now(); let previous, matches = 0;
  while (Date.now() - start < 4000) {
    const value = await page.evaluate(collect), section = value[kind];
    const current = JSON.stringify([value.viewport.scrollX, value.viewport.scrollY, section.section.x, section.section.y, section.section.width, section.section.height, section.rail.left, section.rail.width, section.rail.height]);
    matches = current === previous ? matches + 1 : 0; if (matches >= 2) return;
    previous = current; await page.waitForTimeout(100);
  }
  assert.fail('HOME398_ACTUAL_SETTLE_WITHIN_4S');
}
async function journey(page, row) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Free sports games', exact: true }).waitFor();
  await page.locator('[data-home-dailies]').waitFor(); await page.locator('[data-home-fav-sport]').waitFor(); await actualFonts(page);
  row.initial = await capture(page, row, 'home', true);
  await page.locator('[data-home-dailies]').scrollIntoViewIfNeeded(); await settled(page, 'daily');
  const daily = async (name, png = false) => { const sample = await capture(page, row, 'daily-' + name, png); row.dailySteps.push({ name, sample }); return sample; };
  const before = await daily('before', row.profile.width >= 640);
  if (row.profile.width >= 640) {
    const right = arrow(before, RIGHT);
    assert(right?.painted && right.unclipped && right.centerHit && right.pointer !== 'none', 'HOME398_ACTUAL_DAILY_POINTER_READY');
    await page.mouse.click(right.x + right.width / 2, right.y + right.height / 2);
    await page.waitForFunction(initial => document.querySelector('[data-home-dailies] div.overflow-x-auto').scrollLeft > initial + 0.5, before.daily.rail.left);
    await settled(page, 'daily'); nativeArrow(await daily('pointer-right'), RIGHT);
    await page.keyboard.press('Shift+Tab'); nativeArrow(await daily('keyboard-shift-tab-left'), LEFT);
    await page.keyboard.press('Enter');
    await page.waitForFunction(initial => Math.abs(document.querySelector('[data-home-dailies] div.overflow-x-auto').scrollLeft - initial) <= 0.5, before.daily.rail.left);
    await settled(page, 'daily'); nativeArrow(await daily('keyboard-enter-left'), LEFT);
    await page.keyboard.press('Tab'); nativeArrow(await daily('keyboard-tab-right'), RIGHT);
    await page.keyboard.press('Space');
    await page.waitForFunction(initial => document.querySelector('[data-home-dailies] div.overflow-x-auto').scrollLeft > initial + 0.5, before.daily.rail.left);
    await settled(page, 'daily'); await daily('keyboard-space-right');
  }
  const favourite = page.locator('[data-home-fav-sport]'), golf = page.locator('button[data-fav-sport="golf"]');
  const fav = async (name, png = false) => { const sample = await capture(page, row, name === 'after-reload-prepared' ? 'favourite' : 'favourite-' + name, png); row.favouriteSteps.push({ name, sample }); return sample; };
  await fav('before-preparation'); await favourite.scrollIntoViewIfNeeded(); await golf.scrollIntoViewIfNeeded(); await settled(page, 'favourite');
  const ready = await fav('pointer-ready'), target = chip(ready);
  assert(target?.painted && target.unclipped && target.centerHit && target.pointer !== 'none', 'HOME398_ACTUAL_FAV_POINTER_READY');
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
  const waitPick = async selected => page.waitForFunction(yes => {
    const node = document.querySelector('button[data-fav-sport="golf"]');
    return node?.getAttribute('aria-pressed') === (yes ? 'true' : 'false') && localStorage.getItem('dukb-fav-sport') === (yes ? 'golf' : null)
      && document.querySelector('section[data-sport]')?.getAttribute('data-sport') === (yes ? 'golf' : 'soccer');
  }, selected);
  await waitPick(true); await settled(page, 'favourite'); nativeGolf(await fav('pointer-golf'));
  await page.keyboard.press('Enter'); await waitPick(false); await settled(page, 'favourite'); nativeGolf(await fav('keyboard-enter-clear'));
  await page.keyboard.press('Space'); await waitPick(true); await settled(page, 'favourite'); await fav('keyboard-space-golf');
  await page.reload({ waitUntil: 'domcontentloaded' }); await favourite.waitFor(); await actualFonts(page); await waitPick(true); await fav('after-reload');
  await favourite.scrollIntoViewIfNeeded(); await golf.scrollIntoViewIfNeeded(); await settled(page, 'favourite'); await fav('after-reload-prepared', true);
  assert(row.favouriteSteps.at(-1).sample.trusted.some(event => event.trusted) || row.favouriteSteps[4].sample.trusted.some(event => event.trusted), 'HOME398_ACTUAL_TRUSTED_INPUT');
  assert.equal(row.images.length, row.profile.width >= 640 ? 3 : 2, 'HOME398_PURPOSEFUL_IMAGES'); row.completed = true;
}
function copiedControls(cases, transport) {
  const wide = cases.find(row => row.id === '640-no-preference'), phone = cases.find(row => row.id === '320-no-preference');
  const actual = { daily: { profile: wide.profile, dailySteps: wide.dailySteps }, favourite: { profile: phone.profile, favouriteSteps: phone.favouriteSteps }, wire: { io: wide.io, wire: wide.wire }, transport };
  dailyReady(actual.daily); favouriteReady(actual.favourite); wireReady(actual.wire); transportReady(actual.transport);
  const foundation = JSON.stringify(actual, null, 2) + '\n'; fs.writeFileSync(path.join(OUT, 'control-actual-foundation.json'), foundation, { flag: 'wx' });
  const controls = [];
  const control = (id, mutate, check, marker) => {
    const copy = JSON.parse(foundation); mutate(copy); const changed = JSON.stringify(copy, null, 2) + '\n', file = 'control-' + id + '.json', changedFile = 'control-' + id + '.changed.json';
    assert.notEqual(sha(changed), sha(foundation), 'HOME398_CONTROL_EFFECTIVE'); fs.writeFileSync(path.join(OUT, file), changed, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, changedFile), fs.readFileSync(path.join(OUT, file)), { flag: 'wx' }); let failure;
    try { check(JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'))); } catch (error) { failure = error; }
    finally { fs.writeFileSync(path.join(OUT, file), foundation); }
    assert(failure instanceof assert.AssertionError && failure.message.includes(marker), 'HOME398_CONTROL_OWNED: ' + id);
    assert.equal(sha(fs.readFileSync(path.join(OUT, file))), sha(foundation), 'HOME398_CONTROL_SAME_COPY_RESTORE'); check(JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8')));
    controls.push({ id, marker, scope: 'ACTUAL_PASSING_COPIED_CHECKER_ONLY', actualFeaturePassCredit: false, foundation: 'control-actual-foundation.json', changedFile, restoredFile: file,
      beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(fs.readFileSync(path.join(OUT, file))), sameCopyRestored: true, actualFailure: { name: failure.name, message: failure.message } });
  };
  const d = (id, mutate, marker) => control(id, copy => mutate(copy.daily), copy => dailyReady(copy.daily), marker);
  const f = (id, mutate, marker) => control(id, copy => mutate(copy.favourite), copy => favouriteReady(copy.favourite), marker);
  const w = (id, mutate, marker) => control(id, copy => mutate(copy.wire), copy => wireReady(copy.wire), marker);
  d('daily-height-43', row => { row.dailySteps[0].sample.daily.arrows[0].height = 43; }, 'HOME398_DAILY_TARGET_44');
  d('daily-centre-miss', row => { row.dailySteps[0].sample.daily.arrows[0].centerHit = false; }, 'HOME398_DAILY_HIT');
  d('daily-no-outward-scroll', row => { row.dailySteps[1].sample.daily.rail.left = row.dailySteps[0].sample.daily.rail.left; }, 'HOME398_DAILY_NATIVE_SCROLL');
  d('daily-wrong-native-focus', row => { row.dailySteps[3].sample.active.label = RIGHT; }, 'HOME398_DAILY_NATIVE_FOCUS');
  d('daily-page-jump', row => { row.dailySteps[5].sample.viewport.scrollY += 1; }, 'HOME398_DAILY_STABILITY');
  f('favourite-missing-chip', row => { row.favouriteSteps[0].sample.favourite.buttons.pop(); }, 'HOME398_FAV_CATALOGUE');
  f('favourite-height-43', row => { row.favouriteSteps[0].sample.favourite.buttons[0].height = 43; }, 'HOME398_FAV_TARGET_44');
  f('favourite-centre-miss', row => { chip(row.favouriteSteps[1].sample).centerHit = false; }, 'HOME398_FAV_HIT');
  f('favourite-pointer-storage', row => { row.favouriteSteps[2].sample.favourite.stored = null; }, 'HOME398_FAV_POINTER');
  f('favourite-enter-not-cleared', row => { chip(row.favouriteSteps[3].sample).pressed = 'true'; }, 'HOME398_FAV_ENTER');
  f('favourite-space-wrong-first', row => { row.favouriteSteps[4].sample.favourite.firstSport = 'soccer'; }, 'HOME398_FAV_SPACE');
  f('favourite-native-focus-lost', row => { row.favouriteSteps[2].sample.active.sport = null; }, 'HOME398_FAV_NATIVE_FOCUS');
  f('favourite-action-row-jump', row => { row.favouriteSteps[4].sample.favourite.section.y += 1; }, 'HOME398_FAV_STABILITY');
  f('favourite-reload-storage-lost', row => { row.favouriteSteps[5].sample.favourite.stored = null; }, 'HOME398_FAV_RELOAD');
  w('unknown-request', row => { row.io.push({ kind: 'unknown-refused', url: 'https://copied.invalid/', method: 'GET' }); }, 'HOME398_IO_KNOWN_ONLY');
  w('page-error', row => { row.wire.pageErrors.push({ message: 'COPIED_HOME_ERROR' }); }, 'HOME398_NO_PAGE_ERRORS');
  w('unexplained-console', row => { row.wire.console.push({ type: 'error', url: BASE + '/', text: 'COPIED_UNEXPLAINED_ERROR' }); }, 'HOME398_EXPLAINED_CONSOLE_ERROR');
  w('socket', row => { row.wire.sockets.push('wss://copied.invalid/'); }, 'HOME398_NO_SOCKETS');
  w('unexplained-request-failure', row => { row.wire.failed.push({ url: 'https://copied.invalid/', method: 'GET', error: 'net::ERR_BLOCKED_BY_CLIENT' }); }, 'HOME398_EXPLAINED_REQUEST_FAILURE');
  control('node-transport-attempt', copy => { copy.transport.finalBytes = 1; }, copy => transportReady(copy.transport), 'HOME398_NODE_TRANSPORT_EMPTY');
  return controls;
}
const report = { schema: 1, source: process.env.GITHUB_SHA, mainAtPlan: MAIN, callerBoundParent: process.env.EXPECTED_PARENT, clockReferenceSHA256: sha(clockBytes),
  scope: 'Actual Home Daily arrows and13 Favourite chips only,12 dark viewport/motion contexts',
  planned: { contexts: 12, normalImages: 30, copiedControls: 20, expectedRawProcessExit: 0 },
  limits: ['No physical-touch, other-theme, gameplay, pending-consent, live-backend, full-suite, cap or release claim.',
    'Daily arrows hidden below640 receive no hit/action credit. Other offscreen/clipped Favourite chips are not simultaneously hit-credited.',
    'Deliberate preparation and reload are outside the action-stability window. No no-scroll or focus-reset claim crosses reload.',
    'Old398 bodies/methods supply source provenance only. Actual fresh pixels still need root review.'],
  cases: [], outcomes: [], controls: [], methodFailures: [], featureFailures: [], sourceHeld: false, qualified: false,
  transport: { path: RECEIPT, initialBytes: fs.statSync(RECEIPT).size, finalBytes: null } };
let browser;
try {
  browser = await pw.chromium.launch({ headless: true, timeout: 30000 });
  for (const profile of PROFILES) {
    const row = { id: profile.id, profile, pollDay: pollDay(Date.now()), completed: false, healthyFoundation: false, actualPass: false,
      dailySteps: [], favouriteSteps: [], images: [], io: [], wire: { pageErrors: [], console: [], failed: [], sockets: [] } };
    report.cases.push(row); let context, page, timer, failed = false;
    try {
      context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, colorScheme: 'dark', reducedMotion: profile.motion, deviceScaleFactor: 1, serviceWorkers: 'block' });
      context.setDefaultTimeout(10000); context.setDefaultNavigationTimeout(20000); await context.addInitScript(seed, { theme: 'dark', pending: false });
      await boundary(context, row); page = await context.newPage();
      page.on('pageerror', error => row.wire.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
      page.on('console', message => row.wire.console.push({ type: message.type(), text: message.text(), url: message.location().url }));
      page.on('requestfailed', request => row.wire.failed.push({ url: request.url(), method: request.method(), error: request.failure()?.errorText || null }));
      await Promise.race([journey(page, row), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('HOME398_CONTEXT_DEADLINE')), 90000); })]);
    } catch (error) {
      failed = true; report.methodFailures.push({ case: row.id, phase: 'actual-foundation-or-input', name: error.name, message: error.message, stack: error.stack });
      if (page && !page.isClosed()) try { write(row.id + '-method-failure-current.json', await page.evaluate(collect)); } catch (captureError) { row.captureFailure = captureError.message; }
    } finally {
      clearTimeout(timer); if (context) try { await context.close(); } catch (error) { failed = true; report.methodFailures.push({ case: row.id, phase: 'context-close', name: error.name, message: error.message }); }
      try { wireReady(row); } catch (error) { failed = true; report.methodFailures.push({ case: row.id, phase: 'strict-wire', name: error.name, message: error.message }); }
      row.healthyFoundation = row.completed && !failed;
    }
    if (row.healthyFoundation) {
      try { dailyReady(row); favouriteReady(row); row.actualPass = true; }
      catch (error) { (error instanceof assert.AssertionError ? report.featureFailures : report.methodFailures).push({ case: row.id, phase: 'actual-controls', name: error.name, message: error.message }); }
    }
    report.outcomes.push({ id: row.id, healthyFoundation: row.healthyFoundation, actualPass: row.actualPass, originalContext: row.id + '-context.json' });
    write(row.id + '-context.json', row);
  }
} catch (error) { report.methodFailures.push({ phase: 'driver', name: error.name, message: error.message, stack: error.stack }); }
finally {
  if (browser) try { await browser.close(); } catch (error) { report.methodFailures.push({ phase: 'browser-close', name: error.name, message: error.message }); }
  try {
    report.transport.finalBytes = fs.statSync(RECEIPT).size; transportReady(report.transport);
    if (report.cases.length === 12 && report.cases.every(row => row.healthyFoundation && row.actualPass) && report.methodFailures.length === 0 && report.featureFailures.length === 0) {
      report.controls = copiedControls(report.cases, report.transport); assert.equal(report.controls.length, 20, 'HOME398_TWENTY_ACTUAL_COPY_CONTROLS');
    }
    report.transport.finalBytes = fs.statSync(RECEIPT).size; transportReady(report.transport);
    const after = pins(); write('source-after.json', after); same(after, before, 'HOME398_ALL_SELECTED_SOURCE_HELD'); report.sourceHeld = true;
  } catch (error) { report.methodFailures.push({ phase: 'controls-transport-source-holds', name: error.name, message: error.message, stack: error.stack }); }
  report.normalImages = report.cases.flatMap(row => row.images);
  report.qualified = report.cases.length === 12 && report.cases.every(row => row.healthyFoundation && row.actualPass) && report.controls.length === 20
    && report.normalImages.length === 30 && new Set(report.normalImages.map(row => row.file)).size === 30 && report.sourceHeld && report.methodFailures.length === 0 && report.featureFailures.length === 0;
  report.status = report.qualified ? 'FRESH_HOME398_TARGETS_QUALIFIED' : 'NOT_QUALIFIED'; write('report.json', report);
}
assert(report.qualified, 'HOME398_NOT_QUALIFIED');
console.log('HOME398_TARGETS_QUALIFIED:12 actual contexts,30 originals and20 effective same-copy controls.');
