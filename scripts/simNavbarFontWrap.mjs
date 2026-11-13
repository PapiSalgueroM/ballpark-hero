import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';

// Run against a local production build: SWEEP_BASE=http://127.0.0.1:4173 node scripts/simNavbarFontWrap.mjs
const origin = new URL(process.env.SWEEP_BASE || 'http://127.0.0.1:4173').origin;
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Use a local production build');

const browser = await chromium.launch();
const failures = [];
try {
  for (const path of ['/nrl-team-manager', '/football-grid']) {
    for (const width of [320, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      try {
        let releaseDisplayFont;
        const displayFontGate = new Promise(resolve => { releaseDisplayFont = resolve; });
        await context.route('**/*', async request => {
          const url = new URL(request.request().url());
          if (url.origin !== origin || request.request().method() !== 'GET') return request.abort();
          if (/\/space-grotesk-latin-[^/]+\.woff2$/.test(url.pathname)) await displayFontGate;
          return request.continue();
        });
        await context.addInitScript(route => {
          localStorage.setItem('rules-gate-seen:' + route, '1');
          localStorage.setItem('cookie-consent', 'essential');
        }, path);

        const page = await context.newPage();
        try {
          await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
          const back = page.locator('nav[data-site-chrome] button[aria-label="Go back"]');
          await back.waitFor({ timeout: 10000 });
          await page.evaluate(() => document.fonts.load('600 12px Inter', 'Back'));
          const measure = () => back.evaluate(button => {
            const rect = button.getBoundingClientRect();
            const row = button.parentElement;
            const left = row.firstElementChild.getBoundingClientRect();
            return {
              backTop: rect.top - row.getBoundingClientRect().top,
              backHeight: rect.height,
              leftRight: left.right,
              backLeft: rect.left,
              overflow: document.documentElement.scrollWidth > window.innerWidth,
            };
          });
          assert.equal(await page.evaluate(() => document.fonts.check('900 16px "Space Grotesk"', 'DOUKNOWBALL')), false);
          const before = await measure();
          releaseDisplayFont();
          await page.evaluate(() => document.fonts.ready);
          const after = await measure();

          assert.equal(before.backTop, after.backTop, 'Back moves between rows while the display font loads');
          for (const box of [before, after]) {
            assert(box.backHeight >= 44, 'Back touch target shrank');
            assert(box.leftRight <= box.backLeft, 'Menu and wordmark overlap Back');
            assert(!box.overflow, 'Document scrolls horizontally');
          }
          console.log(`PASS ${path} ${width}px, Back y${before.backTop}→${after.backTop}`);
        } finally {
          releaseDisplayFont();
        }
      } catch (error) {
        failures.push(`${path} ${width}px: ${error.message}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, []);
