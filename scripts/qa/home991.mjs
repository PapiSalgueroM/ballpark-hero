import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { chromium } from 'playwright';

const output = 'home-launch-artifacts';
const base = process.env.HOME_LAUNCH_BASE || 'http://127.0.0.1:4189';
const baseline = process.env.HOME_LAUNCH_BASELINE === '1';
const server = process.env.HOME_LAUNCH_BASE ? null : spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4189'], { stdio: 'pipe' });
let browser;
const rows = [];
const failures = [];
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
  for (const [width, height, motion, scale] of [[320, 844, 'reduce', 1], [390, 844, 'no-preference', 1], [430, 844, 'reduce', 1], [768, 1024, 'no-preference', 1], [1440, 960, 'reduce', 1], [720, 480, 'reduce', 2]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, deviceScaleFactor: scale });
    try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
    });
    const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
    if (process.env.HOME_LAUNCH_DEPLOYMENT) {
      assert.ok(response?.headers()['x-deployment-id']?.includes(process.env.HOME_LAUNCH_DEPLOYMENT), 'Expected deployment answered');
    }
    const stage = page.locator('[data-home-stage]');
    await stage.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await stage.locator('svg').first().waitFor();
    await page.screenshot({ path: `${output}/home-${width}.png` });
    const layout = await page.evaluate(() => {
      const boxOf = el => {
        const r = el.getBoundingClientRect(), css = getComputedStyle(el);
        return { tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', text: el.textContent?.slice(0, 80), left: r.left, right: r.right, width: r.width, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, overflowX: css.overflowX, display: css.display, flexWrap: css.flexWrap, flexShrink: css.flexShrink, minWidth: css.minWidth };
      };
      const overflow = [...document.querySelectorAll('body *')].flatMap(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || (r.left >= -1 && r.right <= innerWidth + 1)) return [];
        let left = r.left, right = r.right;
        const ancestors = [];
        for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          const box = boxOf(parent);
          ancestors.push(box);
          if (box.overflowX !== 'visible') { left = Math.max(left, box.left); right = Math.min(right, box.right); }
        }
        return left < -1 || right > innerWidth + 1 ? [{ ...boxOf(el), visibleLeft: left, visibleRight: right, ancestors }] : [];
      }).sort((a, b) => b.visibleRight - a.visibleRight);
      const shipped = document.querySelector('[data-home-shipped] > div');
      const shippedHeader = shipped ? { row: boxOf(shipped), children: [...shipped.children].map(boxOf) } : null;
      // Restore the exact style before any assertion; this probe identifies the responsible row.
      let shippedWrapWidth = null;
      if (shipped instanceof HTMLElement) {
        const original = shipped.getAttribute('style');
        shipped.style.flexWrap = 'wrap';
        shippedWrapWidth = document.documentElement.scrollWidth;
        if (original === null) shipped.removeAttribute('style'); else shipped.setAttribute('style', original);
      }
      return { viewport: innerWidth, width: document.documentElement.scrollWidth, overflow, shippedHeader, shippedWrapWidth };
    });
    await writeFile(`${output}/layout-${width}.json`, JSON.stringify(layout, null, 2));
    const first = stage.locator('[data-stage-card]').first();
    const box = await first.boundingBox();
    assert.ok(box && box.y <= 430 && box.height >= 44, 'A playable game is in the first screen');
    assert.equal(await stage.locator('[data-stage-card]').count(), 4, 'All four flagships remain playable');
    const daily = await page.locator('[data-daily-spotlight]').boundingBox();
    assert.ok(daily, 'The first Daily is playable');
    const launch = stage.locator('[data-home-nrl-launch]');
    const shortcuts = stage.getByRole('navigation', { name: 'Sports shortcuts' });
    let finalRow;
    if (baseline) {
      assert.equal(await launch.count(), 0, 'Baseline has no direct NRL launch in the deck');
      assert.equal(await shortcuts.getByRole('link').count(), 7, 'Baseline renders seven shortcuts');
      finalRow = await shortcuts.boundingBox();
    } else {
      assert.equal(await shortcuts.count(), 0, 'The duplicate shortcuts are gone');
      assert.equal(await launch.getAttribute('href'), '/nrl-team-manager');
      assert.equal(await launch.innerText(), 'NRL Team Manager');
      finalRow = await launch.boundingBox();
      const finalCard = await stage.locator('[data-stage-card]').last().boundingBox();
      assert.ok(finalRow && finalCard && finalRow.height >= 44 && finalRow.y >= finalCard.y + finalCard.height - 1, 'Direct launch has a full tap target below the featured games');
      assert.ok(finalRow.x >= 0 && finalRow.x + finalRow.width <= width, 'Direct launch fits the viewport');
      assert.equal(await launch.evaluate(link => link.scrollWidth > link.clientWidth), false, 'The launch label fits');
      if (width <= 430) assert.ok(daily.y + 60 <= height, 'Phone shows enough of the first Daily card to read and tap its title');
    }
    const hubs = ['/soccer', '/pro-basketball', '/hockey', '/pro-football', '/baseball', '/college'];
    for (const href of hubs) {
      assert.equal(await page.locator(`[data-home-sport-catalogue] a[href="${href}"]`).count(), 1, 'The catalogue still links ' + href);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No page-level horizontal overflow');
    await first.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/soccer-career');
    assert.match(page.url(), /\/soccer-career$/, 'Keyboard activation reaches the flagship');
    if (!baseline) {
      await page.goBack();
      await launch.focus();
      await launch.press('Enter');
      await page.waitForURL('**/nrl-team-manager');
      await page.getByRole('heading', { name: 'NRL Team Manager', level: 1 }).waitFor();
      await page.goBack();
      await launch.waitFor();
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-home-nrl-launch'));
    }
    assert.deepEqual(errors, [], 'No page exceptions');
    rows.push({ width, height, motion, scale, firstGameTop: box.y, dailyTop: daily.y, launchRowHeight: finalRow?.height });
    console.log(`Home ${width}px${scale === 2 ? ' (200% desktop reflow)' : ''}: first Daily card y=${Math.round(daily.y)}, last launch row ${Math.round(finalRow?.height ?? 0)}px, keyboard navigation passed.`);
    } catch (error) {
      failures.push({ width, message: error.message });
      console.error(`Home ${width}px failed: ${error.message}`);
    } finally {
      await context.close();
    }
  }
  await writeFile(`${output}/native-summary.json`, JSON.stringify({ rows, failures }, null, 2));
  assert.deepEqual(failures, [], 'All home viewports pass');
} finally {
  await browser?.close();
  server?.kill();
}
