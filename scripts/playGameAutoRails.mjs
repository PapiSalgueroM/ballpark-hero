/* Production-build replay. Intercept the publisher loader; never request a live ad. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE ?? 'http://127.0.0.1:4173');
assert.equal(base.protocol, 'http:');
assert.equal(base.hostname, '127.0.0.1');
const vendor = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const publisherTag = vendor + '?client=ca-pub-2929318086316376';
const result = await build({
  stdin: { resolveDir: process.cwd(), contents: "export { ALL_GAMES } from './src/data/gameRegistry'; export { HUB_NAV } from './src/lib/sportHubNav'; export { EDITORIAL_RAIL_ROUTES } from './src/components/ads/editorialRailRoutes';" },
  bundle: true, format: 'esm', platform: 'node', write: false,
});
const { ALL_GAMES, HUB_NAV, EDITORIAL_RAIL_ROUTES } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const paths = [...new Set(['/', ...ALL_GAMES.map(game => game.path), ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES])];
assert(paths.length > 100);
const browser = await chromium.launch();

async function check(path, { width = 1280, advertising = true, expected = 1, gpc = false, accept = false, footerSlot = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  try {
    await context.addInitScript(({ advertising, gpc }) => {
      if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
      if (advertising !== null) {
        const now = Date.now();
        localStorage.setItem('cookie-consent-v2', JSON.stringify({
          version: 2, advertising, analytics: false, updatedAt: now, ...(advertising ? { advertisingConfirmedAt: now } : {}),
        }));
      }
    }, { advertising, gpc });

    const intercepted = [];
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base.origin && ['GET', 'HEAD'].includes(request.method())) return route.continue();
      if (url.origin + url.pathname === vendor) {
        intercepted.push(url.href);
        return route.fulfill({ contentType: 'text/javascript', body: 'window.__loadedGameAdFixture = true;' });
      }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(new URL(path, base).href, { waitUntil: 'load' });
    await page.locator('footer').waitFor();
    if (accept) {
      assert.deepEqual(intercepted, [], 'An ad request preceded consent');
      await page.getByRole('button', { name: 'Accept all', exact: true }).click();
    }
    if (expected) {
      await page.waitForFunction(() => window.__loadedGameAdFixture, null, { timeout: 6000 })
        .catch(error => { throw new Error(path + ': publisher tag did not start', { cause: error }); });
      assert.equal(await page.evaluate(() => window.adsbygoogle?.requestNonPersonalizedAds), 1, path);
      assert.deepEqual(intercepted, [publisherTag], path + ': exact publisher URL once');
      const attributes = await page.locator('script[src*="adsbygoogle.js"]').evaluate(el => ({ async: el.async, crossOrigin: el.crossOrigin }));
      assert.deepEqual(attributes, { async: true, crossOrigin: 'anonymous' }, path + ': standard publisher tag settings');
      await page.waitForTimeout(450);
      const inventory = await page.waitForFunction(() => {
        const slots = document.querySelectorAll('[data-dukb-manual-ad] ins.adsbygoogle').length;
        return slots > 0 && slots === window.adsbygoogle?.length && {
          slots, footer: document.querySelectorAll('[data-public-footer-ad] ins.adsbygoogle').length,
          sides: document.querySelectorAll('[data-ad-rail] ins.adsbygoogle').length,
        };
      }, null, { timeout: 6000 }).catch(async error => {
        const state = await page.evaluate(() => [window.adsbygoogle?.length, document.querySelectorAll('[data-dukb-manual-ad] ins.adsbygoogle').length]);
        throw new Error(path + ': slot requests and actual placements disagree: ' + state, { cause: error });
      });
      const { slots, footer, sides } = await inventory.jsonValue();
      assert(width >= 1280 ? slots === 1 || slots === 3 : slots === 1, path + ': complete pair or footer alone');
      assert.equal(footer, 1, path + ': one footer');
      assert.equal(sides, slots - 1, path + ': desktop side slots');
    } else {
      // The check runs after the app and its footer have mounted, including the rail eligibility effect.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    assert.equal(intercepted.length, expected, path);
    if (footerSlot) {
      const slot = page.locator('[data-public-footer-ad] ins.adsbygoogle[data-ad-slot="7540487748"]');
      await slot.waitFor({ state: 'visible' });
      assert.equal(await slot.count(), 1);
      const box = await slot.boundingBox(), footer = await page.locator('footer').boundingBox();
      assert(box && footer && box.y >= footer.y + footer.height + 149, path + ': footer safety gap');
      assert(box.x >= 0 && box.x + box.width <= width, path + ': footer slot is within viewport');
    }
  } finally {
    await context.close();
  }
}

try {
  await Promise.all(Array.from({ length: 4 }, async (_, thread) => {
    for (const path of paths.filter((_, i) => i % 4 === thread)) await check(path);
  }));
  console.log(`${paths.length} game, hub, and editorial routes loaded exactly one mocked publisher tag with desktop clearance and consent`);
  for (const path of ['/soccer-career', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon', '/world-cup-bracket', '/soccer']) {
    await check(path, { advertising: false, expected: 0 });
  }
  for (const path of ['/soccer-career', '/club-manager', '/soccer', '/nba-my-career']) {
    for (const width of [320, 390, 1280, 1366]) await check(path, { width, footerSlot: true });
  }
  await check('/soccer-career', { width: 1279, footerSlot: true });
  await check('/soccer-career', { width: 390, advertising: false, expected: 0 });
  await check('/soccer-career', { width: 390, advertising: null, accept: true, footerSlot: true });
  await check('/soccer-career?view=saves', { expected: 0 });
  await check('/soccer-career#shared', { expected: 0 });
  await check('/soccer-career', { gpc: true, expected: 0 });
  await check('/soccer-career', { advertising: null, accept: true });
  for (const path of ['/privacy', '/reset-password', '/admin/login', '/missing-game-rail-test']) {
    await check(path, { expected: 0 });
  }
  console.log('Manual placement counts, declined, pending, GPC, private, footer, query and fragment cases passed');
} finally {
  await browser.close();
}
