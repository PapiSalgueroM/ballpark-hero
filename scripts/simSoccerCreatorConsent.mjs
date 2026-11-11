/**
 * Soccer Career creator at the reported phone viewport. Keep consent unanswered
 * and use real taps, since DOM clicks bypass a cookie panel over the options.
 * Run after npm run build: node scripts/simSoccerCreatorConsent.mjs
 * SC_CREATOR_CONSENT_DIST can point at an older build for the negative control.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.resolve(process.env.SC_CREATOR_CONSENT_DIST || path.join(root, 'dist'));
const supplied = process.env.SC_CREATOR_CONSENT_BASE;
const url = new URL(supplied || `http://127.0.0.1:${process.env.SC_CREATOR_CONSENT_PORT || 4251}`);
assert(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname), 'Use a loopback build');
const base = url.origin;
const route = `${base}/soccer-career`;
const responseStatus = () => fetch(route, { redirect: 'manual', signal: AbortSignal.timeout(1000) })
  .then(response => response.status, () => null);

let server, browser;
try {
  if (!supplied) {
    assert(existsSync(path.join(dist, 'soccer-career', 'index.html')), 'Build the Soccer Career route first');
    assert.equal(await responseStatus(), null, 'The test port already answers');
    server = spawn(process.execPath, [path.join(root, 'scripts/lib/hostLikeServer.mjs'), dist, url.port], {
      stdio: 'ignore', windowsHide: true,
    });
  }
  let status = null;
  for (let i = 0; i < 40 && status !== 200; i += 1) {
    status = await responseStatus();
    if (status !== 200) await delay(125);
  }
  assert.equal(status, 200, 'Soccer Career build did not answer');

  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 344, height: 643 }, deviceScaleFactor: 3,
    isMobile: true, hasTouch: true, locale: 'en-GB', serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  await context.route('**/*', request => {
    const url = new URL(request.request().url());
    return url.origin === base && request.request().method() === 'GET' ? request.continue() : request.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const banner = page.getByRole('region', { name: 'Cookie choices' });
  await banner.waitFor();
  const input = page.getByLabel('Player Name');
  await input.tap();
  await input.pressSequentially('Consent Fixture');

  const picks = [
    ['Choose nationality', /^England$/],
    ['Choose position', /^Striker \(ST\)$/],
    ['Choose era', /Current era/],
  ];
  for (const [index, [placeholder, name]] of picks.entries()) {
    const trigger = page.getByRole('combobox').filter({ hasText: placeholder });
    if (index > 0) {
      const top = (await banner.boundingBox()).y;
      // Scroll the later form fields just above the fixed panel, as a player can.
      await trigger.evaluate((el, panelTop) => {
        const rect = el.getBoundingClientRect();
        window.scrollBy(0, rect.top + rect.height / 2 - panelTop + 27);
      }, top);
    }
    await trigger.tap();
    const menu = page.getByRole('listbox');
    await menu.waitFor();
    // Popper briefly mounts outside the viewport before measuring its placement.
    await page.waitForFunction(() => {
      const rect = document.querySelector('[role="listbox"]')?.getBoundingClientRect();
      return rect && rect.top > -30 && rect.bottom > 0 && rect.top < innerHeight;
    });
    const [{ y, height }, { y: panelTop }] = await Promise.all([menu.boundingBox(), banner.boundingBox()]);
    assert(y + height <= panelTop + 1, `${placeholder} options end at ${y + height}, behind cookie choices at ${panelTop}`);
    await page.getByRole('option').filter({ hasText: name }).tap();
    await menu.waitFor({ state: 'hidden' });
    assert.match(await page.getByRole('combobox').nth(index).innerText(), name);
    assert(await banner.isVisible(), 'The cookie panel should still be visible');
    const chosen = await page.evaluate(() => localStorage.getItem('cookie-consent-v2') ?? localStorage.getItem('cookie-consent'));
    assert.equal(chosen, null, 'Selecting a creator option must leave consent unanswered');
  }
  console.log('PASS Soccer Career nationality, position and era are tappable with cookie choices unanswered at 344x643');
} catch (error) {
  console.error(`FAIL simSoccerCreatorConsent: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
}
