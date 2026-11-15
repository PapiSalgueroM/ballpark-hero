import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { chromium } from 'playwright';

const output = 'home-launch-artifacts';
const base = process.env.HOME_LAUNCH_BASE || 'http://127.0.0.1:4189';
const entry = process.env.HOME_LAUNCH_ENTRY;
const origin = new URL(base).origin;
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
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
    });
    const asset = entry && page.waitForResponse(response => new URL(response.url()).pathname === entry && response.ok());
    const [response] = await Promise.all([page.goto(base, { waitUntil: 'domcontentloaded' }), asset]);
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
    const aussie = stage.locator('[data-home-manager-launch="aussie"]');
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
      assert.equal(await aussie.count(), 1, 'The featured deck has one direct Aussie Rules launch');
      assert.equal(await aussie.getAttribute('href'), '/aussie-rules-manager');
      assert.equal(await aussie.innerText(), 'Aussie Rules Manager');
      finalRow = await launch.boundingBox();
      const aussieRow = await aussie.boundingBox();
      const finalCard = await stage.locator('[data-stage-card]').last().boundingBox();
      assert.ok(finalRow && aussieRow && finalCard && Math.abs(finalRow.y - aussieRow.y) <= 1, 'Both manager links share a row');
      assert.ok(finalRow.y >= box.y + box.height - 1 && aussieRow.y + aussieRow.height <= finalCard.y + 1,
        'Manager links sit between the lead game and supporting games');
      for (const [link, row] of [[launch, finalRow], [aussie, aussieRow]]) {
        assert.ok(row.height >= 44 && row.x >= 0 && row.x + row.width <= width, 'Each manager link has a full tap target');
        assert.equal(await link.evaluate(el => el.scrollWidth > el.clientWidth), false, 'Each manager label fits');
      }
      if (width <= 430) {
        assert.ok(aussieRow.y + aussieRow.height <= 568, 'Both managers fit in the first 568px on a phone');
        assert.ok(daily.y + 60 <= height, 'Phone shows enough of the first Daily card to read and tap its title');
      }
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
      for (const [link, path, name] of [
        [launch, '/nrl-team-manager', 'NRL Team Manager'],
        [aussie, '/aussie-rules-manager', 'Aussie Rules Manager'],
      ]) {
        await link.focus();
        await link.press('Enter');
        await page.waitForURL(url => url.pathname === path);
        const rules = page.getByRole('dialog', { name: 'How to play ' + name });
        await rules.getByRole('button', { name: "Let's Play!", exact: true }).click();
        await page.getByRole('heading', { name, level: 1 }).waitFor();
        const back = page.getByRole('button', { name: 'Go back', exact: true });
        await back.focus();
        await back.press('Enter');
        await page.waitForFunction(href =>
          document.activeElement?.matches('a[data-home-manager-launch]') && document.activeElement?.getAttribute('href') === href, path);
      }
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
