/**
 * Round 351 harness: nothing renders above content whose height it cannot know.
 *
 * The bug it exists for. Every route on this site is lazily loaded, so while a
 * route's chunk downloads React shows the Suspense fallback, which is a spinner
 * in a min-h-[60vh] box, about 487px on a 375px phone. The global Footer used
 * to render immediately BELOW that boundary, so a full width 277px footer
 * painted about 535px down the page, and then the real route arrived, stood
 * several thousand pixels tall, and shoved the footer down with it. Measured on
 * a phone that one move was a 0.341 layout shift on its own, and 0.341 is
 * exactly what the live site measured on three unrelated pages in Round 348.
 * It was on every page, on every connection, because a route chunk always has
 * to load.
 *
 * What this holds, per route, with the route chunk deliberately held back so
 * the fallback state is guaranteed rather than a race:
 *   1. STRUCTURAL: while the fallback is on screen, no footer is in the
 *      document. Anything that renders there is something the page will later
 *      push, and pushing is the shift. This is the real invariant; it is
 *      checked directly rather than inferred from a number.
 *   2. MEASURED: cumulative layout shift stays at or under the ceiling.
 *
 * NEGATIVE CONTROL: BOOTSHIFT_CONTROL=eagerfooter puts a footer-shaped block
 * back under the fallback while the chunk is held (asserting it had somewhere
 * to put it), reproducing the pre-Round-351 page. Section 1 must go red, which
 * proves the check can still see the bug it was written for.
 *
 * Run: node scripts/playBootShift.mjs   (needs dist/ from npm run build)
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.BOOTSHIFT_CONTROL || '';
if (CONTROL && CONTROL !== 'eagerfooter') {
  console.error(`BOOTSHIFT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* One per shape of page: the money page, a franchise grid, a hub, a long
   editorial page and the flagship. */
const ROUTES = ['/football-grid', '/nba-grid', '/pro-football', '/about', '/soccer-career'];
const CLS_CEILING = 0.25;
const CHUNK_DELAY_MS = 2500;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const PORT = 4197;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
{
  let up = false;
  for (let i = 0; i < 30 && !up; i++) {
    up = await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.ok).catch(() => false);
    if (!up) await new Promise(r => setTimeout(r, 200));
  }
  if (!up) { console.error(`the dist server never came up on ${PORT}`); server.kill(); process.exit(1); }
}
const browser = await chromium.launch();

console.log(`route chunks held back ${CHUNK_DELAY_MS}ms so the fallback state is certain`);
console.log('1) nothing renders under the route fallback');
console.log('2) and the page does not shift past the ceiling');

let controlPlanted = 0;
const results = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ } });
  const page = await ctx.newPage();

  /* Hold every lazily loaded route chunk. The entry bundle is left alone so
     React still boots; only the route's own code is late, which is the state
     the fallback exists for. */
  await page.route('**/assets/*.js', async r => {
    const url = r.request().url();
    if (/\/assets\/index-/.test(url)) return r.continue();
    await new Promise(res => setTimeout(res, CHUNK_DELAY_MS));
    await r.continue();
  });

  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'commit', timeout: 60000 })
    .catch(() => page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'commit', timeout: 60000 }));

  /* Wait for the fallback to be the thing on screen: React has booted (the
     snapshot is gone) but the route chunk has not arrived. */
  let sawFallback = false;
  for (let i = 0; i < 60; i++) {
    const state = await page.evaluate(() => ({
      snapshot: !!document.getElementById('dukb-snapshot'),
      spinner: !!document.querySelector('[aria-label="Loading"]'),
      footers: document.querySelectorAll('footer').length,
    })).catch(() => null);
    if (state && !state.snapshot && state.spinner) {
      sawFallback = true;
      if (CONTROL === 'eagerfooter') {
        const planted = await page.evaluate(() => {
          const spin = document.querySelector('[aria-label="Loading"]');
          if (!spin) return false;
          const f = document.createElement('footer');
          f.style.cssText = 'height:277px;width:100%';
          f.textContent = 'control footer';
          (spin.closest('div')?.parentElement ?? document.body).appendChild(f);
          return true;
        });
        if (planted) controlPlanted += 1;
      }
      const after = await page.evaluate(() => document.querySelectorAll('footer').length);
      if (after > 0) {
        fail(`${route}: ${after} footer(s) rendered while the route chunk was still loading, and everything the route adds will push them`);
      }
      break;
    }
    await page.waitForTimeout(100);
  }
  if (!sawFallback) {
    fail(`${route}: never observed the fallback state, so nothing was actually checked`);
  }

  /* Wait for the footer to actually arrive rather than sleeping a guessed
     number of milliseconds. A fixed wait made this check flaky: the sport hub
     chunk plus its data outran a four second grace on one run in three and
     reported a missing footer that was merely late. Poll to a generous
     ceiling, then measure; a footer that never comes inside that is a real
     finding rather than a slow machine. */
  let footers = 0;
  for (let i = 0; i < 150; i++) {
    footers = await page.evaluate(() => document.querySelectorAll('footer').length);
    if (footers > 0) break;
    await page.waitForTimeout(100);
  }
  /* Let anything the route settles after mount (fonts, images, late data) land
     in the measurement too. */
  await page.waitForTimeout(3000);
  const cls = await page.evaluate(() => +window.__cls.toFixed(3));
  results.push({ route, cls, footers });
  if (footers < 1) fail(`${route}: the footer never arrived at all, which is a worse bug than the one being fixed`);
  await ctx.close();
}
await browser.close();
server.kill();

console.log('');
for (const r of results) {
  const mark = r.cls <= CLS_CEILING ? 'ok  ' : 'OVER';
  console.log(`   ${mark} ${r.route.padEnd(16)} cls=${r.cls}  footers after load=${r.footers}`);
  if (r.cls > CLS_CEILING) fail(`${r.route} shifted ${r.cls} with a late route chunk, the ceiling is ${CLS_CEILING}`);
}

console.log('');
if (CONTROL === 'eagerfooter') {
  if (controlPlanted === 0) {
    console.error('control planted nothing: the fallback state was never reached, so the control proves nothing');
    process.exit(1);
  }
  if (failures > 0) {
    console.log(`playBootShift control: green. The replanted footer was caught on ${controlPlanted} route(s) (${failures} finding).`);
    process.exit(0);
  }
  console.error('playBootShift control: RED. A footer under the fallback went unnoticed, so the check cannot bite.');
  process.exit(1);
}
if (failures > 0) { console.error(`playBootShift: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playBootShift: green. The footer waits for the page it sits under.');
