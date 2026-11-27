/* After npm run build, serve dist locally and run this against the preview.
 * This test never contacts an advertising provider or the production site. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const origin = new URL(process.env.BASE ?? 'http://127.0.0.1:4173');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export { ALL_GAMES } from './src/data/gameRegistry';
    export { HUB_NAV } from './src/lib/sportHubNav'; export { EDITORIAL_RAIL_ROUTES } from './src/components/ads/editorialRailRoutes';
    export { initCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine';
    export { serializeSoccerCareerSave } from './src/lib/soccerCareerSave';
  ` },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error',
});
const { ALL_GAMES, HUB_NAV, EDITORIAL_RAIL_ROUTES, initCareer, FALLBACK_CLUBS, serializeSoccerCareerSave } =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const all = [...new Set([...ALL_GAMES.map(game => game.path), ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES])];
assert(all.length > 100);
const key = '[data-game-desktop-rails]';
const games = ['/soccer-career', '/club-manager', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon',
  '/build-your-xi', '/soccer-perfect-season', '/world-cup-bracket', '/soccer-conquest', ...HUB_NAV.map(hub => hub.route)];
const browser = await chromium.launch();

async function context(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: true, analytics: false, updatedAt: Date.now() })));
  await ctx.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    return url.origin === origin.origin && ['GET', 'HEAD'].includes(req.method()) ? route.continue() : route.abort();
  });
  return ctx;
}

async function verify(page, path, width, requiredDocks = 0) {
  await page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
  const wrapper = page.locator(key);
  await wrapper.waitFor({ state: 'attached' });
  await page.locator('#root footer[data-site-chrome]').waitFor({ state: 'attached' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const sideCount = await page.locator('[data-ad-rail] ins.adsbygoogle').count();
  assert(width >= 1280 ? sideCount === 0 || sideCount === 2 : sideCount === 0, path + ': incomplete or misplaced pair');
  const docks = '[data-career-utility],[data-career-action-bar="floating"],[data-game-rail-dock],[data-dukb-set-aside]';
  if (requiredDocks) await wrapper.locator(docks).first().waitFor({ state: 'visible' });
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
    assert(rect.playable ? rect.left <= 1 : rect.left >= 159, where);
    assert(rect.controls.every(([left, right]) => left >= rect.left - 1 && right <= rect.width - rect.right + 1), where);
  }
  assert(rect.documentWidth <= rect.width + 1, where);
  assert(rect.controls.length >= requiredDocks, where);
}

try {
  for (const [width, paths] of [[390, games], [1242, games], [1279, games], [1280, all], [1366, all], [1440, games]]) {
    const ctx = await context(width);
    await Promise.all(Array.from({ length: 4 }, async (_, worker) => {
      const page = await ctx.newPage();
      for (const path of paths.filter((_, index) => index % 4 === worker)) await verify(page, path, width);
      await page.close();
    }));
    await ctx.close();
    console.log(`${width}px: ${paths.length} routes passed`);
  }

  const ctx = await context(1280);
  const page = await ctx.newPage();
  for (const path of ['/about', '/privacy', '/search', '/no-such-game-rail-check']) {
    await page.goto(new URL(path, origin).href);
    await page.locator('footer').waitFor();
    assert.equal(await page.locator('[data-ad-rail] ins.adsbygoogle').count(), 0, 'An excluded page received an ad rail: ' + path);
  }
  await page.close();
  await ctx.close();

  const stats = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
  const career = initCareer('Rail Probe', 'England', 'ST', '2020s', stats, 62, 2020, FALLBACK_CLUBS, null);
  const bytes = serializeSoccerCareerSave(career);
  for (const width of [1280, 1440, 1536]) {
    const session = await context(width);
    const active = await session.newPage();
    await active.addInitScript(save => {
      localStorage.setItem('rules-gate-seen:/soccer-career', '1');
      localStorage.setItem('soccerCareerSave', save);
    }, bytes);
    await verify(active, '/soccer-career', width, 3);
    const saveBefore = await active.evaluate(() => localStorage.getItem('soccerCareerSave'));
    assert(saveBefore);
    await active.locator('[data-career-utility="phone"]').click({ timeout: 5000 });
    await active.getByRole('dialog', { name: 'Your phone', exact: true }).waitFor({ timeout: 5000 });
    assert.equal(await active.evaluate(() => localStorage.getItem('soccerCareerSave')), saveBefore);
    await session.close();
    console.log(`Active Soccer Career at ${width}px: existing dock and phone survived`);
  }
  console.log('Non-game exclusions and active Soccer Career controls passed');
} finally {
  await browser.close();
}
