import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';

// Run against a local production build: SWEEP_BASE=http://127.0.0.1:4173 node scripts/simClubManagerBootLayout.mjs
const origin = new URL(process.env.SWEEP_BASE || 'http://127.0.0.1:4173').origin;
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname), 'Use a local production build');

const browser = await chromium.launch();
try {
  for (const accepted of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 }, isMobile: true, deviceScaleFactor: 1.75, serviceWorkers: 'block',
    });
    await context.route('**/*', route => {
      const request = route.request();
      return new URL(request.url()).origin === origin && request.method() === 'GET' ? route.continue() : route.abort();
    });
    await context.addInitScript(accepted => {
      if (accepted) localStorage.setItem('cookie-consent-v2', JSON.stringify({
        version: 2, advertising: false, analytics: false, updatedAt: Date.now(),
      }));

      window.guideDuringBoot = [];
      new MutationObserver(() => {
        const main = document.getElementById('dukb-main');
        if (!main || ![...main.querySelectorAll('div')].some(node => node.textContent === 'Loading…')) return;
        if (main.querySelector('[data-seo-content]')) window.guideDuringBoot.push('guide');
        if ([...main.querySelectorAll('p')].some(node => node.textContent.trim() === 'Play Next')) {
          window.guideDuringBoot.push('Play Next');
        }
      }).observe(document, { childList: true, subtree: true });
    }, accepted);

    try {
      const page = await context.newPage();
      const devtools = await context.newCDPSession(page);
      await devtools.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(origin + '/club-manager', { waitUntil: 'domcontentloaded' });
      await page.getByText(/Pick an era/i).first().waitFor();
      await page.locator('section[data-seo-content="ready"]').waitFor();
      await page.getByText('Play Next', { exact: true }).waitFor();
      const bootContent = await page.evaluate(() => window.guideDuringBoot);
      assert.deepEqual(bootContent, [], 'Below-game content rendered above its final position during Club Manager boot');
      console.log(`PASS 412px, ${accepted ? 'saved cookie choice' : 'first visit'}, chooser and guide loaded after boot`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
