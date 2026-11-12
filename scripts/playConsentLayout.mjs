import assert from 'node:assert/strict';
import { chromium } from './lib/playwrightLoader.mjs';

const base = process.env.BASE ?? 'http://127.0.0.1:4173';
const origin = new URL(base).origin;
const key = 'cookie-consent-v2';
const browser = await chromium.launch();
const consent = page => page.getByRole('region', { name: 'Cookie choices', exact: true });
const choice = (region, name) => region.getByRole('button', { name, exact: true });
const choiceSaved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const contextAt = (width, height = 844) => browser.newContext({
  viewport: { width, height }, hasTouch: width < 600, isMobile: width < 600, serviceWorkers: 'block',
});
const offline = route => {
  const url = new URL(route.request().url());
  if (url.origin === origin) return route.continue();
  if (url.pathname === '/rest/v1/live_scores') return route.fulfill({ json: [] });
  return route.abort();
};

try {
  if (process.env.CONSENT_LAYOUT_CASE !== 'career') {
    const home = await contextAt(390);
    await home.route('**/*', offline);
    const page = await home.newPage();
    await page.goto(base);
    const panel = consent(page);
    await panel.waitFor();
    assert.equal(await panel.getByRole('checkbox', { name: 'Advertising' }).count(), 0, 'Home should show the compact choice first');
    const compactHeight = (await panel.boundingBox()).height;
    assert.ok(compactHeight < 160);
    assert.equal(await panel.evaluate(el => document.activeElement === el), false);
    for (const name of ['Reject all', 'Accept all', 'Manage choices']) {
      assert.ok((await choice(panel, name).boundingBox()).height >= 44);
    }
    await choice(panel, 'Manage choices').tap();
    await panel.getByRole('checkbox', { name: 'Advertising' }).check();
    await choice(panel, 'Save choices').tap();
    await panel.waitFor({ state: 'hidden' });
    assert.equal((await choiceSaved(page)).advertising, true);
    assert.equal((await choiceSaved(page)).analytics, false);
    const settings = page.getByRole('button', { name: 'Cookie choices', exact: true });
    await settings.tap();
    assert.equal(await panel.getByRole('checkbox', { name: 'Advertising' }).isChecked(), true);
    await choice(panel, 'Cancel').tap();
    assert.equal(await settings.evaluate(el => document.activeElement === el), true);
    await home.close();
    console.log('Home 390px: ' + compactHeight + 'px choices panel, full advertising settings, and footer focus.');
  }

  for (const [game, guide, width] of [
    ['nba', 'basketball', 390], ['nba', 'basketball', 1440],
    ['nfl', 'football', 390], ['mlb', 'baseball', 390], ['nhl', 'hockey', 390],
  ]) {
    const context = await contextAt(width, width === 1440 ? 900 : 844);
    let releaseGuide;
    const guideGate = new Promise(resolve => { releaseGuide = resolve; });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && new RegExp('/assets/' + guide + '-[^/]+\\.js$').test(url.pathname)) await guideGate;
      return offline(route);
    });
    try {
      const page = await context.newPage();
      await page.goto(base + '/' + game + '-my-career', { waitUntil: 'domcontentloaded' });
      const main = page.locator('main#dukb-main:has(h1)');
      await main.waitFor();
      const top = () => main.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
      const before = await top();
      releaseGuide();
      const dialog = page.getByRole('dialog', { name: 'How to play' });
      const inRules = dialog.getByRole('region', { name: 'Cookie choices', exact: true });
      await inRules.waitFor();
      assert.ok(Math.abs(await top() - before) <= 2, game + ' consent moved the play area when the rules loaded');
      await choice(inRules, 'Reject all').click();
      await dialog.getByRole('button', { name: "Let's Play!", exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.ok(Math.abs(await top() - before) <= 2);
      assert.equal((await choiceSaved(page)).advertising, false);
      assert.equal((await choiceSaved(page)).analytics, false);
      console.log(game.toUpperCase() + ' My Career ' + width + 'px: play area stayed at ' + before + 'px while consent entered the rules.');
    } finally {
      releaseGuide();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
