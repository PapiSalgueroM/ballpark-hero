/**
 * Round 348 harness: the grid boards hold their ground while data loads.
 *
 * The bug it exists for: on phones, the six daily grid pages fetch their
 * puzzle from the database and the board area grew only when the data
 * landed, shoving everything below it downward. Live Core Web Vitals
 * measured it at 375px on 2026-08-29: soccer-grid 0.60, hockey-grid 0.40,
 * college-grid 0.34 on a slow run and 0.00 on a fast one. Over 0.25 is a
 * failing CLS; over 0.1 needs improvement. Timing dependence is exactly why
 * this harness THROTTLES: every database response is held back 1500ms, so
 * the late-data worst case happens on every run instead of whenever the
 * network feels like it.
 *
 * What it holds, per grid route at 375x812 with data forced late:
 *   cumulative layout shift stays at or under 0.05. The reservation, not
 *   the network, decides where the page's content sits.
 *
 * NEGATIVE CONTROL: GRIDCLS_CONTROL=noreserve injects CSS that display:nones
 * every [data-board-reserve] wrapper, recreating the pre-Round-348 world
 * where nothing board-shaped exists until data lands (and refusing to run if
 * no page rendered one while loading); at least one route must then fail,
 * proving the measurement and the reservation are both real. The wrapper's
 * presence is sampled DURING loading, because by the time the page settles
 * the skeleton has correctly unmounted.
 *
 * Run: node scripts/playGridCls.mjs   (needs dist/ from npm run build)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GRIDCLS_CONTROL || '';
if (CONTROL && CONTROL !== 'noreserve') {
  console.error(`GRIDCLS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ROUTES = ['/soccer-grid', '/football-grid', '/college-grid', '/nba-grid', '/mlb-grid', '/hockey-grid'];
const CLS_CEILING = 0.05;
const DATA_DELAY_MS = 1500;

/* The database host comes from the client file, same as every fetch fence. */
const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const PORT = 4191;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
/* Wait until the server actually answers; a fixed sleep raced the spawn and
   an occasional slow start showed up as a phantom navigation timeout. */
{
  let up = false;
  for (let i = 0; i < 25 && !up; i++) {
    up = await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.ok).catch(() => false);
    if (!up) await new Promise(r => setTimeout(r, 200));
  }
  if (!up) { console.error('the dist server never came up on ' + PORT); server.kill(); process.exit(1); }
}
const browser = await chromium.launch();

let reservedSeen = 0;
const results = [];
for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* ignored */ } });
  const page = await ctx.newPage();
  await page.route(`**${SUPA_HOST}**`, async r => {
    await new Promise(res => setTimeout(res, DATA_DELAY_MS));
    await r.continue();
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  /* One retry: a transient nav stall must not fail a CLS measurement. */
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load' })
    .catch(() => page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load' }));
  if (CONTROL === 'noreserve') {
    /* Injected AFTER navigation, inside the window the held-back data
       guarantees: a style appended before parsing does not survive into the
       parsed document (the first cut of this control proved that by never
       firing). Yanking the skeleton mid-load recreates the unreserved page. */
    await page.addStyleTag({ content: '[data-board-reserve]{display:none !important;}' });
  }
  /* Sample the reservation while the data is still held back: this is the
     window in which the skeleton must exist (even display:noned, it is in
     the DOM for the control to have something to strip). */
  await page.waitForTimeout(500);
  reservedSeen += await page.evaluate(() => document.querySelectorAll('[data-board-reserve]').length);
  await page.waitForTimeout(DATA_DELAY_MS + 2500);
  const cls = await page.evaluate(() => +window.__cls.toFixed(3));
  results.push({ route, cls });
  await ctx.close();
}
await browser.close();
server.kill();

if (CONTROL === 'noreserve' && reservedSeen === 0) {
  console.error('control found nothing to strip: no [data-board-reserve] wrapper on any grid page');
  process.exit(1);
}

console.log(`grid CLS with database responses held ${DATA_DELAY_MS}ms, ceiling ${CLS_CEILING}:`);
for (const r of results) {
  const mark = r.cls <= CLS_CEILING ? 'ok  ' : 'OVER';
  console.log(`   ${mark} ${r.route} cls=${r.cls}`);
  if (r.cls > CLS_CEILING) fail(`${r.route} shifted ${r.cls} with late data, the ceiling is ${CLS_CEILING}`);
}

console.log('');
if (CONTROL === 'noreserve') {
  if (failures > 0) { console.log(`playGridCls control: green. With reservations zeroed the shift came back (${failures} route${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('playGridCls control: RED. Zeroing every reservation changed nothing, the check cannot bite.');
  process.exit(1);
}
if (failures > 0) { console.error(`playGridCls: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playGridCls: green. The boards hold their ground; the network only fills them in.');
