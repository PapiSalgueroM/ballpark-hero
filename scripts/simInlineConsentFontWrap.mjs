import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';

// Run against a local production build: SWEEP_BASE=http://127.0.0.1:4173 node scripts/simInlineConsentFontWrap.mjs
const origin = new URL(process.env.SWEEP_BASE || 'http://127.0.0.1:4173').origin;
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Use a local production build');

const route = '/nrl-team-manager';
const browser = await chromium.launch();
const failures = [];
try {
  const viewports = [320, 339, 350, 359, 365, 390].map(width => ({ width, textSize: 100 }));
  viewports.push({ width: 359, textSize: 200 });
  for (const { width, textSize } of viewports) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    let releaseInter;
    const interGate = new Promise(resolve => { releaseInter = resolve; });
    try {
      await context.route('**/*', async request => {
        const url = new URL(request.request().url());
        if (url.origin !== origin || request.request().method() !== 'GET') return request.abort();
        if (/\/inter-latin-[^/]+\.woff2$/.test(url.pathname)) await interGate;
        return request.continue();
      });
      await context.addInitScript(path => localStorage.setItem('rules-gate-seen:' + path, '1'), route);

      const page = await context.newPage();
      await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
      if (textSize === 200) await page.addStyleTag({ content: ':root { font-size: 200% }' });
      const choices = page.locator('[data-game-consent-inline][aria-label="Cookie choices"]');
      await choices.waitFor({ timeout: 10000 });
      await page.locator('main#dukb-main').waitFor({ timeout: 10000 });
      const measure = () => choices.evaluate(region => ({
        height: region.getBoundingClientRect().height,
        overflow: region.scrollWidth > region.clientWidth,
        buttons: [...region.querySelectorAll('button')].map(button => ({
          height: button.getBoundingClientRect().height,
          overflow: button.scrollWidth > button.clientWidth,
        })),
      }));
      assert.equal(await page.evaluate(() => document.fonts.check('14px Inter')), false);
      const before = await measure();
      releaseInter();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.fonts.check('14px Inter')), true);
      const after = await measure();

      if (textSize === 100) assert.equal(before.height, after.height, 'The inline consent banner changes height while Inter loads');
      for (const box of [before, after]) {
        assert(!box.overflow, 'Consent controls overflow their region');
        assert.equal(box.buttons.length, 3);
        assert(box.buttons.every(({ height, overflow }) => height >= 44 && !overflow), 'A consent button is too small or its label overflows');
      }
      console.log(`PASS ${width}px at ${textSize}%, inline consent height ${before.height}→${after.height}`);
    } catch (error) {
      failures.push(`${width}px at ${textSize}%: ${error.message}`);
    } finally {
      releaseInter();
      await context.close();
    }
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, []);
