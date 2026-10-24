import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pw from '../lib/playwrightLoader.mjs';
import { seed } from './siteMenuNavigationSupport.mjs';

// Real route chunk, real launcher, real Sheet and real Escape. No game outcome mocks.
async function main() {
  const out = process.env.CHROME_RECIPE_OUT, base = 'http://127.0.0.1:4173';
  assert(out && path.isAbsolute(out) && process.env.CI, 'CHROME_PROBE_REMOTE_SETUP');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  let gated = 0, done = false;
  try {
    await context.addInitScript(seed, { theme: 'dark', pending: false });
    await context.route(/\/assets\/Search-[^/?]+\.js(?:\?|$)/, async route => { gated++; await gate; await route.continue(); });
    const page = await context.newPage();
    await page.goto(base + '/search', { waitUntil: 'domcontentloaded' });
    const trigger = page.getByRole('button', { name: 'Open site menu', exact: true });
    await trigger.waitFor();
    assert.equal(gated, 1, 'CHROME_REAL_SEARCH_CHUNK_IS_PENDING');
    const before = await page.evaluate(() => ({ y: scrollY, inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow }));
    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true });
    await menu.waitFor();
    await page.screenshot({ path: path.join(out, 'pending-route-menu.png') });
    release(); done = true;
    await page.locator('main#dukb-main h1').filter({ hasText: /^Search every game$/ }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    const releaseObserved = await page.waitForFunction(expected => {
      const visible = node => node.isConnected && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
      const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible);
      return triggers.length === 1 && triggers.includes(document.activeElement) && scrollY === expected.y
        && document.body.style.overflow === expected.inline && getComputedStyle(document.body).overflow === expected.computed;
    }, before, { timeout: 2500 }).then(() => true, () => false);
    const after = await page.evaluate(() => {
      const visible = node => node.isConnected && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
      const triggers = [...document.querySelectorAll('button[aria-label="Open site menu"]')].filter(visible);
      return { visibleTriggers: triggers.length, activeVisibleTrigger: triggers.includes(document.activeElement),
        y: scrollY, inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow };
    });
    fs.writeFileSync(path.join(out, 'menu-close.raw.json'), JSON.stringify({ before, after, releaseObserved }, null, 2) + '\n', { flag: 'wx' });
    assert.equal(releaseObserved, true, 'CHROME_MENU_CLOSE_RELEASE_OBSERVED');
    assert.equal(after.visibleTriggers, 1, 'CHROME_ONE_VISIBLE_TRIGGER_AFTER_ROUTE');
    assert.equal(after.activeVisibleTrigger, true, 'CHROME_ESCAPE_RETURNS_VISIBLE_TRIGGER');
    assert.equal(after.y, before.y, 'CHROME_ROUTE_MENU_CLOSE_PRESERVES_SCROLL');
    assert.equal(after.inline, before.inline, 'CHROME_MENU_RELEASES_INLINE_BODY_LOCK');
    assert.equal(after.computed, before.computed, 'CHROME_MENU_RELEASES_COMPUTED_BODY_LOCK');
    fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify({ status: 'REAL_DELAYED_ROUTE_MENU_PASS', gated, before, after }, null, 2) + '\n', { flag: 'wx' });
    await page.screenshot({ path: path.join(out, 'route-mounted-menu-closed.png') });
  } finally { if (!done) release(); await context.close(); await browser.close(); }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
