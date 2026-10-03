import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { chromium } from 'playwright';

const output = 'home-launch-artifacts';
const base = 'http://127.0.0.1:4189';
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4189'], { stdio: 'pipe' });
let browser;
const rows = [];
try {
  await mkdir(output, { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(base)).ok; } catch { /* Owned server is starting. */ }
    if (ready) break;
    await pause(250);
  }
  assert.ok(ready, 'Built site server starts');
  browser = await chromium.launch();
  for (const [width, height, motion] of [[320, 780, 'reduce'], [390, 844, 'no-preference'], [768, 1024, 'no-preference'], [1440, 960, 'reduce']]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await page.goto(base);
    const stage = page.locator('[data-home-stage]');
    await stage.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await stage.locator('svg').first().waitFor();
    await page.screenshot({ path: `${output}/home-${width}.png` });
    const layout = await page.evaluate(() => ({
      viewport: innerWidth, width: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')].map(el => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', text: el.textContent?.slice(0, 80), left: r.left, right: r.right };
      }).filter(r => r.left < -1 || r.right > innerWidth + 1).slice(0, 35),
    }));
    await writeFile(`${output}/layout-${width}.json`, JSON.stringify(layout, null, 2));
    const first = stage.locator('[data-stage-card]').first();
    const box = await first.boundingBox();
    assert.ok(box && box.y <= 430 && box.height >= 44, 'A playable game is in the first screen');
    assert.equal(await stage.locator('[data-stage-card]').count(), 4, 'All four flagships remain playable');
    const hubs = ['/soccer', '/pro-basketball', '/hockey', '/pro-football', '/baseball', '/college'];
    for (const href of hubs) {
      const link = stage.locator(`a[href="${href}"]`);
      assert.equal(await link.count(), 1, 'One direct sport destination: ' + href);
      const target = await link.boundingBox();
      assert.ok(target && target.height >= 44, 'Sport has a usable touch target: ' + href);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No page-level horizontal overflow');
    await first.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/soccer-career');
    assert.match(page.url(), /\/soccer-career$/, 'Keyboard activation reaches the flagship');
    assert.deepEqual(errors, [], 'No page exceptions');
    rows.push({ width, height, motion, firstGameTop: box.y, directSports: hubs.length, keyboardRoute: '/soccer-career' });
    console.log(`Home ${width}px: four games, six sport links, visible first game and keyboard navigation pass.`);
    await context.close();
  }
  await writeFile(`${output}/native-summary.json`, JSON.stringify(rows, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
