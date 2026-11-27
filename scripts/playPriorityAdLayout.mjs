/* Serve the completed build with scripts/lib/hostLikeServer.mjs dist 4173.
 * Run node scripts/playPriorityAdLayout.mjs. --published reads the public site.
 * Only the site's own assets load. Every publisher response is a local fixture.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const published = process.argv.includes('--published');
const origin = new URL(published ? 'https://douknowball.com' : process.env.BASE ?? 'http://127.0.0.1:4173');
if (!published) assert(origin.protocol === 'http:' && origin.hostname === '127.0.0.1', 'BASE must be a loopback preview');
const publisher = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
const slot = '[data-dukb-manual-ad] ins.adsbygoogle';
const center = '[data-game-desktop-rails]';
const ranked = await readFile('docs/TRAFFIC-PRIORITIES-2026-11-26.md', 'utf8');
const search = [...ranked.matchAll(/^\| \d+ \| (\/[^ ]*) \|/gm)].map(row => row[1]);
const host = [...ranked.matchAll(/^\| \d+ \| \/[^ ]* \| (\/[^ ]*) \|/gm)].map(row => row[1]);
const prior = (await readFile('docs/TRAFFIC-PRIORITIES-2026-11-03.md', 'utf8')).split('## Search report')[0];
const priorHost = [...prior.matchAll(/^\| (\/[^ ]*) \|/gm)].map(row => row[1]);
assert.equal(search.length, 25);
assert.equal(host.length, 10);
assert.equal(priorHost.length, 10);
const registry = await build({ stdin: { resolveDir: process.cwd(), contents: "export { HUB_NAV } from './src/lib/sportHubNav';" },
  bundle: true, platform: 'node', format: 'esm', write: false });
const { HUB_NAV } = await import('data:text/javascript;base64,' + Buffer.from(registry.outputFiles[0].text).toString('base64'));
const publicReading = ['/records', '/records/nba-champions'];
const hubPaths = HUB_NAV.map(hub => hub.route);
// Soccer Perfect Season also appeared in the host's seven-day most-viewed report.
const paths = [...new Set([...search, ...host, ...priorHost, ...hubPaths, '/soccer-perfect-season', ...publicReading])];
const browser = await chromium.launch();
const failures = [];

async function session(width, advertising = true, gpc = false) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 },
    reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addInitScript(({ advertising, gpc }) => {
    if (advertising !== null) localStorage.setItem('cookie-consent-v2', JSON.stringify({
      version: 2, advertising, analytics: false, updatedAt: Date.now(),
    }));
    if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
  }, { advertising, gpc });
  await context.routeWebSocket('**/*', ws => ws.close());
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.href === publisher) return route.fulfill({ contentType: 'application/javascript',
      body: 'window.__fixturePublisherLoads = (window.__fixturePublisherLoads || 0) + 1;' });
    if (url.origin === origin.origin && ['GET', 'HEAD'].includes(request.method()) && !url.pathname.startsWith('/__l5e/')) {
      return route.continue();
    }
    return route.abort();
  });
  return context;
}

async function open(page, path) {
  await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
  await page.locator('#root footer[data-site-chrome]').waitFor({ state: 'attached' });
}

async function requested(page, previous = 0) {
  await page.waitForFunction(() => document.querySelector('[data-public-footer-ad] ins.adsbygoogle') && window.__fixturePublisherLoads === 1);
  if (page.viewportSize().width >= 1280 && await page.locator('[data-playable-route]').count()) {
    // A game can fetch its guide after its footer mounts. Slow or unavailable
    // data may intentionally leave the page in its footer-only state.
    await page.waitForFunction(() => !document.querySelector('[data-playable-route] [data-seo-content="loading"], [data-playable-route] [aria-busy="true"]'),
      null, { timeout: 4000 }).catch(error => { if (error.name !== 'TimeoutError') throw error; });
  }
  // Let the hydrated board and its help panel finish their initial layout.
  // A transient ad on the loading shell still counts as a publisher request.
  await page.waitForTimeout(900);
  if (page.viewportSize().width >= 1280) {
    const state = await measure(page);
    if (state.playable && state.boundedGame && !state.loadingGame && state.playOverflow <= 1 && state.projectedControlGap >= 150) {
      await page.locator('[data-ad-rail="right"] ins.adsbygoogle').waitFor({ state: 'attached', timeout: 4000 });
    }
  }
  const count = await page.locator(slot).count();
  assert(count === 1 || count === 3, 'Expected a footer and an optional pair of side slots');
  const pushes = await page.evaluate(() => window.adsbygoogle?.length ?? 0);
  assert.equal(pushes, previous + count, 'Slot requests differ from the final eligible placements');
  return count;
}

async function measure(page) {
  return page.evaluate(({ center, slot }) => {
    const viewport = document.documentElement.clientWidth;
    const box = el => {
      const { left, right, top, bottom, width, height } = el.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const frame = document.querySelector(center);
    const main = frame.querySelector('main, [role="main"], #dukb-main') ?? frame;
    const playable = !!frame.closest('[data-playable-route]');
    const leftEdge = document.querySelector('[data-rail-edge="left"]');
    const rightEdge = document.querySelector('[data-rail-edge="right"]');
    const tracks = leftEdge && rightEdge ? [box(leftEdge), box(rightEdge)] : [];
    const modules = [...document.querySelectorAll(slot)].map(el => ({
      role: el.closest('[data-ad-rail]')?.getAttribute('data-ad-rail') ?? (el.closest('[data-public-footer-ad]') ? 'footer' : 'unknown'),
      status: el.getAttribute('data-ad-status'), id: el.getAttribute('data-ad-slot'), ...box(el),
    }));
    const actionable = 'a[href], button, input, select, textarea, summary, [role="button"]';
    let projectedControlGap = null;
    let boundedGame = false;
    if (playable && tracks[0]?.width >= 120 && tracks[1].width >= 120) {
      const targets = [...frame.querySelectorAll(actionable + ', [contenteditable="true"], canvas, [role="grid"], form, table')]
        .filter(el => !el.closest('[data-site-chrome], [data-seo-content]') && el.checkVisibility({ visibilityProperty: true }))
        .map(box).filter(r => r.width > 1 && r.height > 1);
      const playArea = box(main);
      const envelopes = [...frame.querySelectorAll('[data-game-play-area], .mx-auto[class*="max-w-"]')]
        .filter(el => !el.closest('[data-site-chrome], [data-seo-content]')).map(box).filter(r => r.width > 1);
      if (playArea.width > 1 && playArea.width < frame.clientWidth - 1) envelopes.push(playArea);
      boundedGame = envelopes.length > 0;
      if (targets.length) targets.push(...envelopes);
      if (targets.length) projectedControlGap = Math.min(...targets.map(r => Math.min(r.left - tracks[0].right, tracks[1].left - r.right)));
    }
    const nav = frame.querySelector('nav[data-site-chrome]');
    const collisions = [];
    for (const el of frame.querySelectorAll(actionable)) {
      if (!el.checkVisibility({ visibilityProperty: true })) continue;
      const r = box(el);
      if (!r.width || !r.height) continue;
      for (const ad of modules) {
        const x = (Math.max(r.left, ad.left) + Math.min(r.right, ad.right)) / 2;
        const y = (Math.max(r.top, ad.top) + Math.min(r.bottom, ad.bottom)) / 2;
        if (r.left >= ad.right - 1 || r.right <= ad.left + 1 || r.top >= ad.bottom - 1 || r.bottom <= ad.top + 1) continue;
        if (x < 0 || x > viewport || y < 0 || y > innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit && (el.contains(hit) || hit.closest('[data-dukb-manual-ad]'))) collisions.push(ad.role + '/' + el.tagName);
      }
    }
    return { viewport, overflow: document.documentElement.scrollWidth - viewport, playable, tracks, projectedControlGap, boundedGame,
      loadingGame: !!frame.querySelector('[data-seo-content="loading"], [aria-busy="true"]'),
      playOverflow: frame.scrollWidth - frame.clientWidth, navBottom: nav ? box(nav).bottom : null,
      center: box(frame), main: box(main), modules, collisions, footer: box(document.querySelector('footer[data-site-chrome]')),
      labels: [...document.querySelectorAll('[data-dukb-manual-ad]')].filter(el => el.textContent.includes('Advertisement')).length };
  }, { center, slot });
}

async function layout(page, path, width) {
  const desktop = width >= 1280;
  await open(page, path);
  const count = await requested(page);
  const rails = count === 3;
  if (!desktop) assert.equal(count, 1, 'Phone received side slots');
  if (desktop && ['/', ...hubPaths].includes(path)) assert.equal(count, 3, 'Desktop home and hubs reserve two equal side tracks');
  const pending = await measure(page);
  assert.equal(pending.labels, 0, 'A request was labelled as a fill');
  assert.deepEqual(pending.modules.map(ad => ad.role).sort(), rails ? ['footer', 'left', 'right'] : ['footer']);
  for (const ad of pending.modules) assert.equal(ad.id, '7540487748');
  await page.locator(slot).evaluateAll(slots => slots.forEach(el => {
    const creative = document.createElement('div');
    creative.setAttribute('aria-hidden', 'true');
    creative.style.height = el.closest('[data-ad-rail]') ? '600px' : innerWidth < 640 ? '100px' : '90px';
    creative.style.width = '100%';
    el.append(creative);
    el.setAttribute('data-ad-status', 'filled');
  }));
  await page.waitForFunction(count => [...document.querySelectorAll('[data-dukb-manual-ad]')].filter(el => el.textContent.includes('Advertisement')).length === count, count);
  const filled = await measure(page);
  assert.equal(filled.labels, count);
  assert(filled.overflow <= 1, 'Page overflow ' + filled.overflow);
  assert.deepEqual(filled.collisions, [], 'Control intersected an ad');
  for (const key of ['left', 'width', 'top']) {
    assert(Math.abs(filled.main[key] - pending.main[key]) <= 1, 'Fill moved the main content ' + key);
  }
  const footer = filled.modules.find(ad => ad.role === 'footer');
  assert.equal(footer.status, 'filled');
  assert(footer.top >= filled.footer.bottom + 149, 'Footer clearance ' + (footer.top - filled.footer.bottom));
  assert(Math.abs(footer.left - (filled.viewport - footer.right)) <= 2, 'Footer banner is off center');
  if (desktop) {
    const left = filled.center.left, right = filled.viewport - filled.center.right;
    assert(Math.abs(left - right) <= 1, 'Content column is off center');
    assert(filled.playable ? left <= 1 : left >= 159, 'Unexpected width for the natural content column');
    const [a, b] = filled.tracks;
    assert(a && b && a.width >= 120 && b.width >= 120 && Math.abs(a.width - b.width) <= 1, 'Unequal desktop edge tracks');
    assert(Math.abs(a.right - (filled.viewport - b.left)) <= 1, 'Unequal desktop corridors');
  }
  if (rails) {
    const a = filled.modules.find(ad => ad.role === 'left'), b = filled.modules.find(ad => ad.role === 'right');
    assert(a.right <= filled.tracks[0].right + 1 && b.left >= filled.tracks[1].left - 1, 'A creative extends beyond its measured track');
    if (filled.playable) {
      assert(filled.projectedControlGap >= 150, 'Game controls only have ' + filled.projectedControlGap + 'px of rail clearance');
      if (filled.navBottom !== null) assert(Math.min(a.top, b.top) - filled.navBottom >= 149, 'Side ad too close to game navigation');
    } else assert(a.right <= filled.center.left + 1 && b.left >= filled.center.right - 1, 'Ad crossed the content edge');
    assert(a.left >= -1 && b.right <= filled.viewport + 1 && Math.abs(a.width - b.width) <= 1, 'Unequal or clipped rails');
    assert(filled.main.left >= filled.center.left - 1 && filled.main.right <= filled.center.right + 1, 'Main content exceeds its reserved column');
    assert(Math.abs(filled.main.left - (filled.viewport - filled.main.right)) <= 2, 'Main content is off center');
  } else if (desktop && filled.playable) {
    assert(!filled.boundedGame || filled.loadingGame || filled.projectedControlGap === null || filled.projectedControlGap < 150 || filled.playOverflow > 1,
      'A game with measured room skipped both rails');
  }
  console.log(JSON.stringify({ path, width, publisherRequests: 1, requested: count, fixtureFilled: count,
    leftEdgeWidth: desktop ? filled.tracks[0].width : null, rightEdgeWidth: desktop ? filled.tracks[1].width : null,
    gameControlGap: filled.projectedControlGap, boundedGame: filled.boundedGame, loadingGame: filled.loadingGame, mainShift: filled.main.top - pending.main.top,
    footerGap: Math.round(footer.top - filled.footer.bottom) }));
}

async function skipped(path, advertising, gpc = false) {
  const ctx = await session(1280, advertising, gpc);
  try {
    const page = await ctx.newPage();
    await open(page, path);
    await page.waitForTimeout(350);
    assert.equal(await page.locator(slot).count(), 0, path + ': unexpected slot');
    assert.equal(await page.evaluate(() => window.__fixturePublisherLoads ?? 0), 0, path + ': unexpected publisher');
  } finally { await ctx.close(); }
}

async function navigation() {
  const ctx = await session(1280, null);
  try {
    const page = await ctx.newPage();
    await open(page, '/');
    const choices = page.getByRole('region', { name: 'Cookie choices' });
    await choices.waitFor();
    assert.equal(await page.locator(slot).count(), 0);
    assert.equal(await page.evaluate(() => window.__fixturePublisherLoads ?? 0), 0);
    await choices.getByRole('button', { name: 'Accept all', exact: true }).click();
    const home = await requested(page);
    await page.locator('a[href="/soccer-career"]:visible').first().click();
    await page.waitForURL(url => url.pathname === '/soccer-career');
    const game = await requested(page, home);
    // React Router also receives equivalent slash spellings from browser history.
    await page.evaluate(() => {
      history.replaceState(history.state, '', '/soccer-career/');
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    });
    await requested(page, home);
    await page.goBack();
    await page.waitForURL(url => url.pathname === '/');
    const back = await requested(page, home + game);
    console.log('Home, game and Back: one publisher per document, slot requests ' + [home, game, back].join(', '));
  } finally { await ctx.close(); }
}

async function scrollAndResize(path) {
  const ctx = await session(1366, null);
  try {
    const page = await ctx.newPage();
    await open(page, path);
    const choices = page.getByRole('region', { name: 'Cookie choices' });
    await choices.waitFor();
    const beforeConsent = await measure(page);
    assert.equal(beforeConsent.modules.length, 0);
    await choices.getByRole('button', { name: 'Accept all', exact: true }).click();
    await requested(page);
    const afterConsent = await measure(page);
    for (const key of ['width', 'left']) assert(Math.abs(afterConsent.main[key] - beforeConsent.main[key]) <= 1, path + ': consent changed content ' + key);
    for (const width of [1366, 390, 1280]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.waitForTimeout(150);
      for (const fraction of [0, 0.5, 1]) {
        await page.evaluate(fraction => scrollTo({ top: document.scrollingElement.scrollHeight * fraction, behavior: 'instant' }), fraction);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const frame = await measure(page);
        assert(frame.overflow <= 1 && !frame.collisions.length, path + ': overflow or overlap after scroll/resize');
        assert(frame.modules.filter(ad => ad.role === 'footer').length === 1, path + ': missing footer after scroll/resize');
        const sides = frame.modules.filter(ad => ad.role === 'left' || ad.role === 'right');
        assert(width < 1280 ? sides.length === 0 : sides.length === 0 || sides.length === 2, path + ': misplaced side slot after resize');
        if (frame.playable && sides.length) assert(frame.projectedControlGap >= 150, path + ': unsafe control clearance after scroll/resize');
        assert.equal(await page.evaluate(() => window.__fixturePublisherLoads), 1, path + ': reloaded the publisher');
      }
    }
    if (path === '/') {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      const before = await measure(page);
      const left = page.locator('[data-ad-rail="left"] ins.adsbygoogle');
      const right = page.locator('[data-ad-rail="right"] ins.adsbygoogle');
      await left.evaluate(el => el.setAttribute('data-ad-status', 'unfilled'));
      await right.evaluate(el => el.setAttribute('data-ad-status', 'filled'));
      await left.waitFor({ state: 'detached' });
      await page.locator('[data-ad-rail="right"]').getByText('Advertisement', { exact: true }).waitFor();
      const after = await measure(page);
      for (const key of ['top', 'left', 'width']) assert(Math.abs(before.main[key] - after.main[key]) <= 1, 'A single-side fill shifted Home ' + key);
    }
  } finally { await ctx.close(); }
}

try {
  for (const width of [390, 1280, 1366]) {
    const ctx = await session(width);
    try {
      await Promise.all(Array.from({ length: 3 }, async (_, worker) => {
        const page = await ctx.newPage();
        for (const path of paths.filter((_, i) => i % 3 === worker)) {
          try { await layout(page, path, width); }
          catch (error) {
            const failure = path + ' @' + width + ': ' + error.message;
            failures.push(failure);
            console.error(failure);
          }
        }
      }));
    } finally { await ctx.close(); }
  }
  const slash = await session(1280);
  try { await layout(await slash.newPage(), '/soccer-career/', 1280); } finally { await slash.close(); }
  await navigation();
  for (const path of ['/', '/soccer-career', '/club-manager']) await scrollAndResize(path);
  for (const path of ['/soccer-career?view=saves', '/soccer-career?slot=2', '/soccer-career#shared', '/privacy', '/reset-password', '/ad-layout-unknown']) {
    await skipped(path, true);
  }
  await skipped('/club-manager', false);
  await skipped('/club-manager', null);
  await skipped('/club-manager', true, true);
  const saves = await session(1280);
  try {
    await saves.addInitScript(() => {
      localStorage.setItem('dukb-cm-slot-2', 'ad-layout-damaged-save-fixture');
      localStorage.setItem('rules-gate-seen:/club-manager', '1');
    });
    const page = await saves.newPage();
    await open(page, '/club-manager');
    await page.getByTestId('cm-slots').waitFor({ state: 'visible' });
    await page.waitForTimeout(350);
    assert.equal(await page.locator(slot).count(), 0, 'Ads mounted on the saved manager screen');
    assert.equal(await page.evaluate(() => window.__fixturePublisherLoads ?? 0), 0, 'A request preceded the saved manager screen');
    assert.equal(await page.evaluate(() => localStorage.getItem('dukb-cm-slot-2')), 'ad-layout-damaged-save-fixture');
  } finally { await saves.close(); }
  assert.deepEqual(failures, [], 'Traffic route geometry: ' + failures.join('\n'));
  console.log('PASS: ' + paths.length + ' priority routes at three widths, direct and in-app navigation, consent and exclusion cases. All fills were fixtures.');
} finally { await browser.close(); }
