/** Compiled Home guard. Catalog cards and pin controls are visible before scrolling. */
import assert from 'node:assert/strict';
import pw from './lib/playwrightLoader.mjs';

const base = new URL(process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173');
const browser = await pw.chromium.launch();
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    await context.route(url => url.origin !== base.origin, route => route.abort());
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(base.href, { waitUntil: 'domcontentloaded' });
    const first = page.locator('[data-catalog-card] a.home-tile').first();
    await first.waitFor({ state: 'attached' });
    const readings = await page.locator('[data-catalog-card] :is(a.home-tile, [data-game-pick])').evaluateAll(nodes =>
      nodes.map(node => {
        const { animationName, opacity } = getComputedStyle(node);
        return { animationName, opacity };
      }),
    );
    assert(readings.length > 100, 'The full catalog rendered before scrolling');
    assert(readings.every(({ animationName, opacity }) => animationName === 'none' && Number(opacity) > 0.99),
      'Links and pin buttons are visible immediately with ' + reducedMotion);
    const href = await first.getAttribute('href');
    await first.click();
    await page.waitForURL(url => url.pathname === href);
    await page.waitForLoadState('networkidle');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(reducedMotion + ': visible catalog and pin controls, game link opens ' + href);
  }
} finally {
  await browser.close();
}
