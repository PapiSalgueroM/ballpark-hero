/* Built-site native input and geometry. No live data, writes or external service calls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = process.cwd(), output = path.join(root, 'sport-hubs-artifacts/native');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const temp = await mkdtemp(path.join(parent, 'hubs994-native-'));
await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4194';
let server, browser;
const rows = [], failures = [];
let lightMode;
try {
  const bundle = path.join(temp, 'fixtures.mjs');
  await build({ entryPoints: ['scripts/qa/hubs994-fixtures.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'error', alias: { '@': path.join(root, 'src') } });
  const { hubFixtures, continuationFixtures } = await import(pathToFileURL(bundle).href);
  const hubs = hubFixtures();
  const fixtures = continuationFixtures();
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', '4194'], { stdio: 'pipe', windowsHide: true });
  let ready = false;
  for (let i = 0; i < 40; i++) { try { ready = (await fetch(base)).ok; } catch { /* Owned server is starting. */ } if (ready) break; await pause(250); }
  assert.ok(ready, 'Built site starts');
  browser = await chromium.launch();
  for (const [width, height, touch, reducedMotion] of [[320, 780, true, 'reduce'], [390, 844, true, 'no-preference'], [1440, 960, false, 'no-preference']]) {
    for (const { hub, games } of hubs) {
      const name = `${hub.route.slice(1)}-${width}`;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, reducedMotion });
      const page = await context.newPage(), errors = [], blocked = [], measurements = [];
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(base)) return route.continue(); blocked.push(url.split('?')[0]); return route.abort(); });
      await page.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
      const surface = page.locator('[data-hub-experience]');
      const shown = () => surface.locator('[data-hub-game]').evaluateAll(cards => cards.map(card => card.getAttribute('data-hub-game')).sort());
      const want = items => items.map(game => game.path).sort();
      const activate = async locator => {
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        assert.ok(box && box.height >= 44 && box.width >= 30, 'Hub action has a usable native target');
        if (touch) await locator.tap();
        else {
          await locator.focus();
          await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
          assert.ok(await locator.evaluate(element => document.activeElement === element), 'Tab returns to the intended usable control');
          await page.keyboard.press('Enter');
        }
      };
      const enter = async value => {
        const input = surface.getByRole('textbox');
        if (touch) await input.tap(); else await input.focus();
        await page.keyboard.press('Control+A'); await page.keyboard.type(value);
      };
      const layout = async label => {
        const measured = await page.evaluate(() => {
          const over = [];
          for (const element of document.querySelectorAll('[data-hub-experience] *')) {
            const box = element.getBoundingClientRect();
            if (!box.width || !box.height || (box.left >= -1 && box.right <= innerWidth + 1)) continue;
            let left = box.left, right = box.right;
            for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
              if (getComputedStyle(ancestor).overflowX !== 'visible') { const clip = ancestor.getBoundingClientRect(); left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
            }
            if (left < -1 || right > innerWidth + 1) over.push({ tag: element.tagName, text: element.textContent?.slice(0, 70), left, right });
          }
          return { viewport: innerWidth, width: document.documentElement.scrollWidth, over };
        });
        measurements.push({ label, ...measured });
        assert.equal(measured.width, measured.viewport, 'No page-level horizontal overflow');
        assert.deepEqual(measured.over, [], 'No visibly overflowing hub content');
      };
      try {
        await page.goto(base + hub.route);
        await surface.waitFor(); await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await shown(), want(games), 'Cold hub contains every registry game once');
        for (const game of games) assert.equal(await surface.locator(`[data-hub-game="${game.path}"] h3 a`).getAttribute('href'), game.path);
        assert.equal(await surface.locator('[data-hub-saved]').count(), 0, 'No continuation without a save');
        assert.equal(await surface.locator('nav a').count(), 6);
        assert.equal(await surface.locator('nav [aria-current="page"]').getAttribute('href'), hub.route);
        await page.waitForFunction(() => { const image = document.querySelector('[data-hub-experience] header img'); return image?.complete && image.naturalWidth > 0; });
        await layout('cold');
        await page.screenshot({ path: path.join(output, `${name}-arena.png`) });
        for (const [flag, label] of [['daily', 'Daily puzzles'], ['featured', 'Careers & sims']]) {
          const selected = games.filter(game => game[flag]);
          if (selected.length) { await activate(surface.getByRole('button', { name: new RegExp(`^${label}`) })); assert.deepEqual(await shown(), want(selected)); await layout(label); }
        }
        await enter('zzzx994-no-such-game');
        assert.deepEqual(await shown(), []);
        assert.ok(await surface.getByRole('button', { name: 'Pick a game for me' }).isDisabled());
        await activate(surface.getByRole('button', { name: `Show all ${hub.navLabel} games` }));
        assert.deepEqual(await shown(), want(games));
        assert.equal(await surface.getByRole('textbox').inputValue(), '');
        const query = games.at(-1).label;
        await enter(query);
        const subset = games.filter(game => `${game.label} ${game.description}`.toLowerCase().includes(query.toLowerCase()));
        assert.deepEqual(await shown(), want(subset));
        await activate(surface.getByRole('button', { name: 'Clear game search' }));
        assert.deepEqual(await shown(), want(games));
        await enter(query);
        await activate(surface.getByRole('button', { name: 'Pick a game for me' }));
        await page.waitForURL(url => subset.some(game => url.pathname === game.path));
        const randomPath = new URL(page.url()).pathname;

        // Plant all six real engine saves together, so foreign-sport leakage is observable.
        await page.goto(base + hub.route); await surface.waitFor();
        await page.evaluate(values => { for (const fixture of values) localStorage.setItem(fixture.saveKey, fixture.raw); localStorage.setItem('dukb-local-completions', '{"date":"2026-10-02","slugs":["/footle"]}'); }, fixtures);
        await page.reload(); await surface.waitFor();
        const own = fixtures.filter(fixture => games.some(game => game.path === fixture.path));
        assert.equal(own.length, 1);
        assert.deepEqual(await surface.locator('[data-hub-saved]').evaluateAll(links => links.map(link => link.getAttribute('href')).sort()), own.map(fixture => fixture.path).sort());
        assert.equal(await surface.locator('[data-hub-saved] small').textContent(), own[0].description);
        assert.equal(await surface.locator('header a').getAttribute('href'), own[0].path);
        await surface.getByRole('region', { name: 'Your saved games' }).scrollIntoViewIfNeeded();
        await layout('saved'); await page.screenshot({ path: path.join(output, `${name}-saved-library.png`) });
        assert.deepEqual(await page.evaluate(values => values.map(fixture => localStorage.getItem(fixture.saveKey)), fixtures), fixtures.map(fixture => fixture.raw), 'Every saved game remains byte-identical');
        assert.equal(await page.evaluate(() => localStorage.getItem('dukb-local-completions')), '{"date":"2026-10-02","slugs":["/footle"]}');
        await activate(surface.locator('[data-hub-saved]'));
        await page.waitForURL(url => url.pathname === own[0].path);
        assert.deepEqual(errors, [], 'No page exceptions');
        rows.push({ hub: hub.route, width, touch, reducedMotion, catalog: games.length, randomPath, resumedPath: own[0].path, measurements, blockedExternal: [...new Set(blocked)] });
        console.log(`Hub ${hub.route} ${width}px: exact catalog, filters, search, reset, random subset, own-sport continuation and native navigation pass.`);
      } catch (error) {
        failures.push({ hub: hub.route, width, message: error.message, measurements, errors });
        await page.screenshot({ path: path.join(output, `${name}-failure.png`) }).catch(() => {});
        console.error(`Hub ${hub.route} ${width}px failed: ${error.message}`);
      } finally { await context.close(); }
    }
  }
  const lightContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  try {
    await lightContext.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await lightContext.addInitScript(() => { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('dukb-theme', 'light'); });
    const page = await lightContext.newPage();
    await page.goto(base + '/pro-basketball');
    await page.locator('[data-hub-experience]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('light')), 'The actual stored light theme is active');
    await page.waitForFunction(() => { const image = document.querySelector('[data-hub-experience] header img'); return image?.complete && image.naturalWidth > 0; });
    await page.screenshot({ path: path.join(output, 'pro-basketball-390-light-arena.png') });
    await page.getByRole('region', { name: 'NBA game library' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'pro-basketball-390-light-library.png') });
    lightMode = await page.evaluate(() => ({ theme: localStorage.getItem('dukb-theme'), viewport: innerWidth, width: document.documentElement.scrollWidth }));
    assert.equal(lightMode.width, lightMode.viewport, 'The light hub has no page overflow');
    console.log('Hub /pro-basketball390px: actual light theme, arena and library screenshots, and no overflow pass.');
  } catch (error) { failures.push({ hub: '/pro-basketball', width: 390, theme: 'light', message: error.message }); }
  finally { await lightContext.close(); }
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ rows, lightMode, failures, scope: 'Built app, all six hubs at320/390/1440 plus390 light NBA rendering. Native touch and keyboard activation with programmatic keyboard focus setup, real engine save discovery, no full career playback. External requests blocked.' }, null, 2));
  assert.equal(rows.length, 18, 'All eighteen hub and viewport paths finish');
  assert.deepEqual(failures, [], 'All hub native paths pass');
} finally {
  await browser?.close(); server?.kill();
  assert.equal(path.dirname(temp), parent); assert.ok(path.basename(temp).startsWith('hubs994-native-'));
  await rm(temp, { recursive: true, force: true });
}
