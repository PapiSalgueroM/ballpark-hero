import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pw from './lib/playwrightLoader.mjs';

const port = process.env.PORT ?? '4589';
const base = 'http://127.0.0.1:' + port;
const host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', port], { windowsHide: true });
const back = page => page.getByRole('button', { name: /^(go back|back)$/i }).first();
let browser;
try {
  await Promise.race([once(host.stdout, 'data'), once(host, 'exit').then(([code]) => { throw Error('Host exited ' + code); })]);
  browser = await pw.chromium.launch();
  async function newPage(width) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.route(url => url.origin !== base, route => route.abort());
    await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    return context.newPage();
  }

  for (const route of ['/player-stock-market', '/search', '/privacy', '/terms', '/accessibility']) {
    const page = await newPage(390);
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await back(page).click();
    await page.waitForURL(base + '/', { timeout: 2500 });
    assert.equal(await page.evaluate(() => history.state.idx), 0);
    await page.context().close();
  }
  console.log('Direct phone links return to Home from the game, Search and three policy pages.');

  const page = await newPage(1440);
  await page.goto(base + '/about', { waitUntil: 'domcontentloaded' });
  await page.locator('footer').getByRole('link', { name: 'Privacy Policy', exact: true }).click();
  await page.waitForURL(base + '/privacy');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await back(page).click();
  await page.waitForURL(base + '/about', { timeout: 2500 });
  console.log('Desktop About to Privacy returns to About after a cold reload.');
  await page.context().close();
} finally {
  await browser?.close();
  host.kill();
}
