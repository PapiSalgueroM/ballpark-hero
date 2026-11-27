/* Run against a built loopback site using BASE. --published reads only the
 * public site's HTML and assets and defaults to a 1366px catalog pass.
 * RAIL_WIDTHS and ONLY accept comma-separated widths and paths for replays.
 * --fantasy-draft plays the scout planner on phones, a tablet and desktops.
 * The publisher and every fill are local fixtures in both modes. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { guardedAdBrowser, isSiteAsset, staticReply } from './lib/playwrightAdReplay.mjs';

const published = process.argv.includes('--published');
const origin = new URL(published ? 'https://douknowball.com' : process.env.BASE ?? 'http://127.0.0.1:4173');
if (!published) assert(origin.protocol === 'http:' && origin.hostname === '127.0.0.1');
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export { ALL_GAMES } from './src/data/gameRegistry';
    export { UNLISTED_GAME_ROUTES } from './src/components/StorageNotice';
    export { HUB_NAV } from './src/lib/sportHubNav'; export { EDITORIAL_RAIL_ROUTES } from './src/components/ads/editorialRailRoutes';
    export { initCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine';
    export { serializeSoccerCareerSave } from './src/lib/soccerCareerSave';
  ` },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error',
});
const { ALL_GAMES, UNLISTED_GAME_ROUTES, HUB_NAV, EDITORIAL_RAIL_ROUTES, initCareer, FALLBACK_CLUBS, serializeSoccerCareerSave } =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const registered = new Set(ALL_GAMES.map(game => game.path));
const all = [...new Set(['/', ...registered, ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES, ...UNLISTED_GAME_ROUTES])];
assert(all.length > 100);
const key = '[data-game-desktop-rails]';
const placement = '[data-dukb-manual-ad] ins.adsbygoogle';
const publisher = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
const privateScreen = '#soccer-career-slots,#nrl-save-slots,[data-cm-startup],[data-testid="cm-slots"],[data-testid="cm-points"],[data-dukb-set-aside],[data-home-search-active]';
const games = ['/soccer-career', '/club-manager', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon',
  '/build-your-xi', '/soccer-perfect-season', '/world-cup-bracket', '/soccer-conquest', ...HUB_NAV.map(hub => hub.route)];
const guard = await guardedAdBrowser();
const { browser } = guard;

async function context(width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 390 ? 640 : width < 768 ? 844 : 900 },
    hasTouch: width < 768, isMobile: width < 768, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: true, analytics: false, updatedAt: now, advertisingConfirmedAt: now }));
  });
  await ctx.routeWebSocket('**/*', ws => ws.close());
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.href === publisher) return route.fulfill({ contentType: 'application/javascript', body: `
      window.__sweepLoads = (window.__sweepLoads || 0) + 1;
      window.__sweepRequests = [];
      window.adsbygoogle = { push() {
        const unit = document.querySelector('${placement}:not([data-sweep-pushed])');
        if (!unit) throw Error('Push without an available placement');
        unit.dataset.sweepPushed = '1';
        window.__sweepRequests.push({role:unit.closest('[data-dukb-manual-ad]').dataset.dukbManualAd,
          careerBoardReady: location.pathname !== '/career' || !!document.querySelector('button[aria-label*="for career row"]'),
          width:unit.getBoundingClientRect().width,
          private: !!document.querySelector('${privateScreen}') || !!(location.search || location.hash) });
        unit.setAttribute('data-ad-status', 'filled');
      } };
    ` });
    if (url.origin === origin.origin && req.method() === 'GET' && (req.resourceType() === 'document' || isSiteAsset(url))) {
      return route.fulfill(await staticReply(url.href));
    }
    return route.abort();
  });
  return ctx;
}

// Measure DOM rectangles independently of the app's decision. Scroll containers
// can clip a target down to only a small part of its bounding rectangle.
function readPlacements({ key, placement, privateScreen }) {
  const frame = document.querySelector(key), viewport = document.documentElement.clientWidth;
  const left = document.querySelector('[data-rail-edge=left]')?.getBoundingClientRect();
  const right = document.querySelector('[data-rail-edge=right]')?.getBoundingClientRect();
  const targets = 'a[href],button,input,select,textarea,summary,form,table,canvas,video,svg[viewBox],[role=grid],[role=button],[role=application],[tabindex]:not([tabindex="-1"]),[contenteditable=true],[draggable=true],.cursor-pointer,[class*="aspect-"],[data-cm-pitch],[data-drill-board],[data-first-touch-board],[data-through-ball-board],[data-soccer-moment-board],[data-rail-play-board]';
  const boxes = [];
  for (const el of document.querySelectorAll(targets)) {
    if (el.closest('[data-dukb-manual-ad]') || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const raw = el.getBoundingClientRect();
    let { left: x, right: end, top, bottom } = raw, pinned = false;
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      pinned ||= style.position === 'sticky' || style.position === 'fixed';
      if (node === el || (style.overflowX === 'visible' && style.overflowY === 'visible')) continue;
      const clip = node.getBoundingClientRect();
      if (style.overflowX !== 'visible') { x = Math.max(x, clip.left); end = Math.min(end, clip.right); }
      if (style.overflowY !== 'visible') { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
    }
    if (end - x < 1 || bottom - top < 1) continue;
    boxes.push({ left: Math.max(0,x), right: Math.min(viewport,end), top: Math.max(0,top), bottom: Math.min(innerHeight,bottom), pinned, raw, play: frame?.contains(el) && !el.closest('[data-site-chrome]'),
      label: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent.trim() || el.tagName).slice(0, 48) });
  }
  const placements = [...document.querySelectorAll(placement)].map(el => {
    const a = el.getBoundingClientRect(), role = el.closest('[data-dukb-manual-ad]').dataset.dukbManualAd;
    let nearest = null;
    for (const b of boxes) {
      if (a.top >= innerHeight || a.bottom <= 0 || b.top >= b.bottom || b.left >= b.right) continue;
      const dx = Math.max(0, a.left - b.right, b.left - a.right);
      const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
      const px = Math.hypot(dx, dy);
      if (nearest === null || px < nearest.px) nearest = { px, control: b.label };
    }
    return { role, status: el.dataset.adStatus, slot: el.dataset.adSlot, left: a.left, width: a.width, nearest };
  });
  const nav = frame?.querySelector('nav[data-site-chrome]'), main = frame?.querySelector('main,[role=main],#dukb-main');
  let reason = null;
  if (document.querySelector(privateScreen)) reason = 'excluded save, recovery or search screen';
  else if (document.querySelector('meta[name=robots][content*="noindex" i]')) reason = 'noindex';
  else if (viewport < 1280) reason = 'compact viewport';
  else if (!main) reason = 'no game or reading surface';
  else if (frame.scrollWidth > frame.clientWidth + 1) reason = 'overflowing play area';
  else if (frame.querySelector('[data-game-help-pending],[data-seo-content="loading"],[aria-busy="true"]')) reason = 'content still loading';
  else if (left?.width && right?.width) {
    const navBottom = Math.max(frame.getBoundingClientRect().top, nav?.getBoundingClientRect().bottom ?? -Infinity);
    let top = navBottom + 150;
    const near = boxes.filter(b => b.play).map(b => ({ ...b,
      dx: Math.max(0, Math.min(b.raw.left - left.right, right.left - b.raw.right)) })).filter(b => b.dx < 150);
    for (const b of near) if (b.raw.top >= navBottom - 1 && b.raw.bottom <= navBottom + 150) top = Math.max(top, b.raw.bottom + 150);
    const bottom = top + 620;
    const pinned = near.find(b => b.pinned);
    const close = near.map(b=>({ px:Math.hypot(b.dx, Math.max(0, top - b.raw.bottom, b.raw.top - bottom)), label:b.label })).sort((a,b)=>a.px-b.px)[0];
    if (!boxes.some(b => b.play)) reason = 'no rendered play controls';
    else if (frame.getBoundingClientRect().bottom < bottom) reason = 'page too short for a 620px reservation';
    else if (pinned) reason = 'pinned control within 150px: ' + pinned.label;
    else if (close && close.px < 150) reason = 'control or board at ' + Math.round(close.px) + 'px: ' + close.label;
  }
  const excluded = document.querySelector(privateScreen);
  return { placements, reason, excluded: excluded?.id || excluded?.getAttribute('data-testid') || (excluded ? Array.from(excluded.attributes, a=>a.name).filter(n=>n.startsWith('data-')).join(',') : null),
    width: viewport, overflow: document.documentElement.scrollWidth - viewport,
    publisher: window.__sweepLoads ?? 0, requests: window.__sweepRequests ?? [], redirect: location.pathname };
}

async function verify(page, path, width, requiredDocks = 0) {
  await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
  const wrapper = page.locator(key);
  await wrapper.waitFor({ state: 'attached' });
  await page.locator('#root footer[data-site-chrome]').waitFor({ state: 'attached' });
  if (path === '/career') await wrapper.getByRole('button', { name: /for career row/ }).first().waitFor({ state: 'attached' });
  const docks = '[data-career-utility],[data-career-action-bar="floating"],[data-game-rail-dock],[data-dukb-set-aside]';
  if (requiredDocks) await wrapper.locator(docks).first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[data-game-desktop-rails] :is([aria-busy="true"],[data-game-help-pending],[data-seo-content="loading"])'),
    undefined, { timeout: 1200 }).catch(error => { if (error.name !== 'TimeoutError') throw error; });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const args = { key, placement, privateScreen };
  const capture = () => page.evaluate(readPlacements, args);
  let first = await capture();
  // Modal rules lock background scrolling. Check first paint, then enter the
  // playable page before scrolling down to its footer.
  for (const ad of first.placements) assert(ad.nearest === null || ad.nearest.px >= 149.5, path + ': initial ' + JSON.stringify(ad));
  if (await page.getByRole('dialog').first().isVisible()) {
    await page.keyboard.press('Escape');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    first = await capture();
  }
  if (width >= 1280 && first.placements.length === 1 && !first.reason) {
    await page.waitForTimeout(180);
    first = await capture();
  }
  const kind = registered.has(path) ? 'game' : UNLISTED_GAME_ROUTES.includes(path) ? 'unlisted' : HUB_NAV.some(hub=>hub.route===path) ? 'hub' : path === '/' ? 'home' : 'reading';
  const roles = first.placements.map(ad=>ad.role).sort();
  const noAds = kind === 'unlisted' || ['noindex','excluded save, recovery or search screen'].includes(first.reason);
  assert(first.requests.every(hit => hit.role === 'public-footer' || hit.careerBoardReady), 'A rail was requested before the Career Quiz board arrived');
  assert(!first.requests.some(hit=>hit.private), path + ': a request occurred on an excluded screen');
  assert.equal(new Set(first.requests.map(hit => hit.role)).size, first.requests.length, path + ': repeated request for the same placement');
  assert(roles.every(role=>first.requests.some(hit=>hit.role===role)), path + ': mounted unit lacked a local fixture request');
  assert.deepEqual(roles, noAds ? [] : roles.length === 3 ? ['left-rail','public-footer','right-rail'] : ['public-footer'], path + ': placement set');
  if (width >= 1280 && (path === '/career' || path.endsWith('-connect-4'))) {
    const board = wrapper.locator('[data-rail-play-board]');
    assert(await board.evaluate(el => el.scrollWidth <= el.clientWidth + 1), path + ': desktop board lost a column');
    assert.deepEqual(roles, ['left-rail','public-footer','right-rail'], path + ': desktop board allocations');
    const row = board.locator('.grid').filter({ has: page.getByRole('button') }).first();
    await row.getByRole('button').last().click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const played = await capture();
    assert.deepEqual(played.placements.map(ad => ad.role).sort(), roles, path + ': opening a cell changed the placements');
    assert.deepEqual(played.requests, first.requests, path + ': opening a cell made another request');
  }
  if (width >= 1280 && (path === '/' || (path === '/soccer-career' && requiredDocks))) {
    const wanted = path === '/' ? (width >= 1920 ? 300 : 160) : (width >= 1366 ? 160 : 120);
    assert.deepEqual(first.requests.filter(hit => hit.role !== 'public-footer').map(hit => hit.width), [wanted, wanted], path + ': issued creative widths at ' + width);
  }
  assert.equal(first.publisher, noAds ? 0 : 1, path + ': publisher load count ' + JSON.stringify(first));
  assert(first.placements.every(ad=>ad.slot === '7540487748' && ad.status === 'filled'), path + ': pending or unexpected inventory');
  if (width >= 1280 && !noAds && roles.length === 1) assert(first.reason, path + ': no measured reason for skipping the side pair');
  const samples = [first];
  const afterPaint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (roles.length === 3) {
    await page.evaluate(() => scrollTo({ top: 430, behavior: 'instant' }));
    await afterPaint();
    samples.push(await capture());
  }
  if (roles.length) {
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await afterPaint();
    samples.push(await capture());
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  }
  for (const snap of samples) {
    assert.deepEqual(snap.placements.map(ad=>ad.role).sort(),roles,path + ': scrolling changed the allocation');
    assert(snap.overflow <= 1, path + ': viewport overflow ' + snap.overflow);
    for (const ad of snap.placements) assert(ad.nearest === null || ad.nearest.px >= 149.5, path + ' at ' + width + ': ' + JSON.stringify(ad));
  }
  if (path === '/build-your-xi' && width === 1280 && roles.length === 3) {
    const previous = await page.evaluate(() => {
      const ad = document.querySelector('[data-ad-rail=left] ins');
      const control = [...document.querySelectorAll('button')].find(el => el.textContent.startsWith('4-3-3') && el.checkVisibility());
      if (!ad || !control) throw Error('Expected an ad and a formation control for the collision check');
      const rect = control.getBoundingClientRect(), old = ad.style.cssText;
      Object.assign(ad.style, { position:'fixed', left:rect.left+'px', top:rect.top+'px', width:rect.width+'px', height:rect.height+'px' });
      const moved = ad.getBoundingClientRect();
      if (Math.abs(moved.left - rect.left) >= 1 || Math.abs(moved.top - rect.top) >= 1) throw Error('Local collision fixture did not move');
      return old;
    });
    assert.equal((await capture()).placements.find(ad=>ad.role==='left-rail').nearest?.px, 0, 'A deliberate control collision was missed');
    await page.locator('[data-ad-rail=left] ins').evaluate((el, css) => { el.style.cssText = css; }, previous);
  }
  const reason = noAds ? kind === 'unlisted' ? 'unlisted game' : first.reason : roles.length < 3 ? first.reason : null;
  const sideCount = await page.locator('[data-ad-rail] ins.adsbygoogle').count();
  assert(width >= 1280 ? sideCount === 0 || sideCount === 2 : sideCount === 0, path + ': incomplete or misplaced pair');
  const rect = await wrapper.evaluate((el, docks) => {
    const box = el.getBoundingClientRect(), viewport = document.documentElement.clientWidth;
    return {
      playable: !!el.closest('[data-playable-route]'),
      left: box.left, right: viewport - box.right, width: viewport,
      documentWidth: document.documentElement.scrollWidth,
      controls: [...el.querySelectorAll(docks)].filter(control => control.checkVisibility()).map(control => {
        const r = control.getBoundingClientRect();
        return [r.left, r.right];
      }),
    };
  }, docks);
  const where = `${path} at ${width}px: ${JSON.stringify(rect)}`;
  if (sideCount) {
    assert(Math.abs(rect.left - rect.right) <= 1, where);
    assert(rect.playable || path === '/' ? rect.left <= 1 : rect.left >= 159, where);
    assert(rect.controls.every(([left, right]) => left >= rect.left - 1 && right <= rect.width - rect.right + 1), where);
  }
  assert(rect.documentWidth <= rect.width + 1, where);
  assert(rect.controls.length >= requiredDocks, where);
  if (path === '/build-your-xi' && width === 1280 && sideCount === 2) {
    const afterChange = await wrapper.evaluate(async game => {
      const button = document.createElement('button');
      Object.assign(button.style, { position: 'fixed', right: '1px', top: '45%', width: '60px', height: '44px' });
      button.textContent = 'Late control';
      game.append(button);
      await new Promise(queueMicrotask);
      const sideCount = document.querySelectorAll('[data-ad-rail]').length;
      button.remove();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return [sideCount, window.__sweepRequests.length];
    });
    assert.deepEqual(afterChange, [0, first.requests.length], 'New fixed controls must clear the rails before paint, without another request');
  }
  const row = { path, kind, width, roles, reason, requests: first.requests.length };
  console.log(JSON.stringify(row));
  return row;
}

async function verifyFantasyDraft() {
  const pool = JSON.parse(await readFile(new URL('./data/fantasyDraftPool.json', import.meta.url), 'utf8'));
  const longest = pool.reduce((a, b) => a.name.length > b.name.length ? a : b);
  for (const width of [320, 390, 900, 1280, 1366, 1920]) {
    const ctx = await context(width);
    try {
      const page = await ctx.newPage();
      await page.addInitScript(() => { Math.random = () => 0.19; });
      await page.route('**/functions/v1/fantasy-draft-daily', r => r.fulfill({ json: { criteria: 'One Nation Rule: Max 3 players from any one country' } }));
      await page.route('**/rest/v1/fantasy_draft_players?*', r => r.fulfill({ json: pool }));
      await page.goto(new URL('/fantasy-draft', origin).href);
      const chooser = page.getByLabel('Opponent for a new draft');
      await chooser.waitFor();
      if (await page.getByRole('dialog').first().isVisible()) await page.keyboard.press('Escape');
      await chooser.selectOption('scout');
      const roles = width >= 1280 ? ['left-rail', 'public-footer', 'right-rail'] : ['public-footer'];
      await page.waitForFunction(n => window.__sweepRequests?.length === n, roles.length);
      const snapshot = () => page.evaluate(readPlacements, { key, placement, privateScreen });
      const issued = (await snapshot()).requests;
      await page.getByRole('button', { name: 'Start Draft', exact: true }).click();
      await page.getByRole('button', { name: 'Plan two picks' }).click();
      const first = page.getByLabel('First pick'), next = page.getByLabel('Next target');
      await first.selectOption(longest.id);
      await next.selectOption({ index: 1 });
      await page.getByLabel('Draft forecast').waitFor();
      const select = await first.boundingBox(), following = await next.boundingBox();
      assert(select.height >= 44 && following.height >= 44);
      if ([320, 390, 1280, 1366].includes(width)) assert(following.y >= select.y + select.height, 'Narrow planner should stack the player names at ' + width);
      if (width === 900) assert.equal(following.y, select.y, 'Use the wider tablet planner for side-by-side names');
      const fitsSelect = el => {
        const css = getComputedStyle(el), text = document.createElement('canvas').getContext('2d');
        text.font = css.fontWeight + ' ' + css.fontSize + ' ' + css.fontFamily;
        const room = el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 16;
        return text.measureText(el.selectedOptions[0].text).width <= room + 1;
      };
      assert(await first.evaluate(fitsSelect) && await next.evaluate(fitsSelect), 'Selected player name or position is clipped at ' + width);
      const roster = page.locator('[data-rail-play-board] > div').filter({ has: page.locator('[data-draft-slot]') });
      if (width >= 1280) assert.equal((await roster.boundingBox()).width, 380, 'Desktop roster width');
      await page.getByRole('textbox', { name: 'Search players' }).fill(longest.name);
      const name = page.getByRole('button').locator('p').filter({ hasText: longest.name });
      await name.waitFor();
      const fits = el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
      assert(await name.evaluate(fits), 'Player card clips ' + longest.name);
      for (const control of [first, name]) {
        await control.scrollIntoViewIfNeeded();
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const state = await snapshot();
        assert.deepEqual(state.placements.map(a => a.role).sort(), roles, 'Active draft allocations at ' + width);
        assert.deepEqual(state.requests, issued, 'Draft reauction at ' + width);
        assert(state.placements.every(a => !a.nearest || a.nearest.px >= 149.5), JSON.stringify(state.placements));
      }
      await page.getByRole('button', { name: 'Draft ' + longest.name, exact: true }).click();
      const drafted = roster.getByTitle(longest.name, { exact: true });
      await drafted.waitFor();
      assert(await drafted.evaluate(fits), 'Roster clips ' + longest.name);
      const final = await snapshot();
      assert.deepEqual(final.requests, issued);
      assert.deepEqual(final.placements.map(a => a.role).sort(), roles);
      console.log(JSON.stringify({ width, player: longest.name, selectWidth: select.width, stacked: following.y > select.y, roles, requests: issued.length }));
    } finally { await ctx.close(); }
  }
}

async function verifyCatalog() {
  // Delivered publisher frames can keep a fixed width after their parent track shrinks.
  const largeHome = await context(1920);
  try {
    const page = await largeHome.newPage();
    await verify(page, '/', 1920);
    await page.locator('[data-ad-rail] ins').evaluateAll(units => units.forEach(unit => {
      const fill = document.createElement('div');
      fill.style.width = unit.offsetWidth + 'px';
      fill.style.height = '600px';
      unit.appendChild(fill);
    }));
    for (const width of [1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator('[data-ad-rail] ins').count(), 0, 'Retire an oversized creative for the rest of this Home visit');
      assert.equal(await page.evaluate(() => window.__sweepRequests.length), 3, 'Resizing must not request a replacement');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    }
  } finally { await largeHome.close(); }
  const widths = (process.env.RAIL_WIDTHS ?? (published ? '1366' : '1280,1366,1920,390,320,1242,1279')).split(',').map(Number);
  const narrowed = process.env.ONLY?.split(',');
  const failures = [];
  for (const width of widths) {
    const paths = narrowed ?? ([1242, 1279].includes(width) ? games : all);
    const rows = [];
    const ctx = await context(width);
    await Promise.all(Array.from({ length: 2 }, async (_, worker) => {
      const page = await ctx.newPage();
      page.setDefaultTimeout(15000);
      for (const path of paths.filter((_, index) => index % 2 === worker)) {
        try { rows.push(await verify(page, path, width)); }
        catch (error) { const failure = path + ' @' + width + ': ' + error.message; failures.push(failure); console.error(failure); }
      }
      await page.close();
    }));
    await ctx.close();
    const catalog = rows.filter(r => r.kind === 'game');
    console.log(JSON.stringify({ width, examined: paths.length, passed: rows.length, registeredGames: catalog.length,
      gamePairs: catalog.filter(r => r.roles.length === 3).length, gameRequests: catalog.reduce((n,r) => n + r.requests, 0),
      gameFooters: catalog.filter(r => r.roles.includes('public-footer')).length }));
  }

  for (const width of [390, 1280]) {
    const ctx = await context(width), page = await ctx.newPage();
    for (const path of ['/about', '/privacy', '/search', '/no-such-game-rail-check', '/soccer-career?view=saves', '/club-manager?slot=1', '/footle#shared']) {
      await page.goto(new URL(path, origin).href);
      await page.locator('#root footer[data-site-chrome]').waitFor({state:'attached'});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator(placement).count(), 0, 'An excluded page received a placement: ' + path);
      assert.equal(await page.evaluate(() => window.__sweepLoads ?? 0), 0, 'An excluded page loaded the publisher: ' + path);
    }
    await ctx.close();
  }

  const stats = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
  const career = initCareer('Rail Probe', 'England', 'ST', '2020s', stats, 62, 2020, FALLBACK_CLUBS, null);
  const bytes = serializeSoccerCareerSave(career, 1);
  for (const width of [390, 1280, 1366, 1920]) {
    const session = await context(width);
    const active = await session.newPage();
    await active.addInitScript(save => {
      localStorage.setItem('rules-gate-seen:/soccer-career', '1');
      if (!localStorage.getItem('soccerCareerSave')) localStorage.setItem('soccerCareerSave', save);
    }, bytes);
    const initial = await verify(active, '/soccer-career', width, 3);
    assert.equal(initial.roles.length, width < 1280 ? 1 : 3, 'Unexpected active career inventory at ' + width);
    if (width >= 1280) {
      const sizes = await active.locator('[data-career-panels]').evaluate(el =>
        [el.closest('main').getBoundingClientRect().width, el.lastElementChild.getBoundingClientRect().width]);
      assert.equal(sizes[0], 1024, 'Career reading width at ' + width);
      assert(sizes[1] >= 720 && sizes[1] <= sizes[0], 'Career skills must retain their readable width at ' + width);
    }
    const confirmClear = async stage => {
      await active.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const snap = await active.evaluate(readPlacements, { key, placement, privateScreen });
      assert.equal(snap.requests.length, initial.requests, 'A career action repeated an ad request');
      assert.deepEqual(snap.placements.map(ad => ad.role).sort(), initial.roles, stage + ': inventory changed');
      assert(snap.placements.every(ad => ad.nearest === null || ad.nearest.px >= 149.5), JSON.stringify(snap.placements));
      console.log(JSON.stringify({ width, stage, requests: snap.requests.length, nearest: snap.placements.map(ad => [ad.role, ad.nearest?.px ?? null]) }));
    };
    const saveBefore = await active.evaluate(() => localStorage.getItem('soccerCareerSave'));
    assert(saveBefore);
    await active.locator('[data-career-utility="phone"]').click({ timeout: 5000 });
    await active.getByRole('dialog', { name: 'Your phone', exact: true }).waitFor({ timeout: 5000 });
    assert.equal(await active.evaluate(() => localStorage.getItem('soccerCareerSave')), saveBefore);
    await confirmClear('Phone open');
    await active.keyboard.press('Escape');
    await active.locator('[data-career-utility="training"]').click();
    const training = active.getByRole('dialog').filter({ has: active.getByRole('heading', { name: /Training Ground/i }) });
    await training.waitFor();
    await confirmClear('Training open');
    await training.getByRole('button', { name: 'Close', exact: true }).click();
    const focus = active.getByRole('button', { name: 'Passing', exact: true });
    await focus.focus();
    await active.keyboard.press('Enter');
    assert.equal(await focus.getAttribute('aria-pressed'), 'true');
    await active.getByRole('button', { name: 'Next Year', exact: true }).click();
    const offer = active.getByRole('button', { name: /^Review contract with / }).first();
    const club = (await offer.getAttribute('aria-label')).slice('Review contract with '.length);
    await offer.click();
    await confirmClear('Contract review');
    await active.getByRole('button', {name:'Sign contract',exact:true}).click();
    await active.waitForFunction(club => JSON.parse(localStorage.getItem('soccerCareerSave')).currentClub === club, club);
    await confirmClear('Signed contract');
    await active.reload({ waitUntil: 'domcontentloaded' });
    await active.locator('[data-career-utility="phone"]').waitFor();
    assert.equal(await active.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave')).currentClub), club);
    await session.close();
    console.log(`Active Soccer Career at ${width}px: practice, contract signing, resume and ad clearance passed`);
  }
  console.log('Non-game exclusions and active Soccer Career controls passed');
  assert.deepEqual(failures, []);
}

try {
  if (process.argv.includes('--fantasy-draft')) await verifyFantasyDraft();
  else await verifyCatalog();
} finally {
  await guard.close();
}
