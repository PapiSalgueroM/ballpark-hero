import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';
import { penaltyExample } from './lib/cmPenaltyRoomFixture.mjs';

// Run on a local snapshot build. Use --baseline only to reproduce the short targets on the previous build.
const origin = new URL(process.env.SWEEP_BASE || 'http://127.0.0.1:4173').origin;
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const baseline = process.argv.includes('--baseline');
const { career } = await penaltyExample();
const browser = await chromium.launch();
try {
  for (const [title, hubButton] of [
    ['Corner routines', /Training.*(?:improving|develop|balanced)/i],
    ['Kickoff buildup', /Match Centre.*form, head to head/i],
  ]) {
    const context = await browser.newContext({ viewport: { width: 320, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    let release, held = false;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || route.request().method() !== 'GET') return route.abort();
        if (/^\/assets\/index-[\w-]+\.css$/.test(url.pathname)) {
          held = true;
          await gate;
        }
        return route.continue();
      });
      await context.addInitScript(({ career, title }) => {
        localStorage.setItem('dukb-club-manager-save', JSON.stringify(career));
        localStorage.setItem('cm-guide-seen', '1');
        localStorage.setItem('rules-gate-seen:/club-manager', '1');
        localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
        const observer = new MutationObserver(() => {
          const summary = [...document.querySelectorAll('[data-cm-surface] summary')].find(el => el.textContent.startsWith(title));
          if (!summary) return;
          window.firstTargetHeight = summary.getBoundingClientRect().height;
          summary.addEventListener('click', event => { window.trustedTargetTap = event.isTrusted; }, { once: true });
          observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
      }, { career, title });
      const page = await context.newPage();
      await page.goto(origin + '/club-manager', { waitUntil: 'commit' });
      const resume = page.getByRole('button', { name: 'Resume Career', exact: true });
      const hub = page.getByRole('button', { name: hubButton });
      await resume.or(hub).first().waitFor();
      if (await resume.isVisible()) await resume.tap();
      await hub.tap();
      const summary = page.locator('summary').filter({ hasText: title });
      await summary.scrollIntoViewIfNeeded();
      assert(held && await page.locator('link[data-dukb-app-style][media="print"]').count(), 'Application stylesheet must still be held');
      const firstHeight = await page.evaluate(() => window.firstTargetHeight);
      const box = await summary.boundingBox();
      assert(box);
      await summary.tap({ position: { x: Math.floor(box.width / 2), y: Math.floor(box.height) - 2 } });
      assert(await summary.evaluate(el => window.trustedTargetTap && el.parentElement.open), 'A real tap near the lower edge must open the disclosure');
      release();
      await page.locator('link[data-dukb-app-style][media="all"]').waitFor({ state: 'attached' });
      const styled = (await summary.boundingBox()).height;
      console.log(`${title}: ${firstHeight}px at insertion, ${box.height}px at trusted tap, ${styled}px after CSS`);
      assert(styled >= 44);
      assert(baseline ? firstHeight < 44 && box.height < 44 : firstHeight >= 44 && box.height >= 44);
    } finally {
      release();
      await context.close();
    }
  }
} finally { await browser.close(); }
