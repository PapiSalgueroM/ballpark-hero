/* scripts/playCollegeGridFirstTap.mjs  (Round 1105)

   College Grid opens at once, searches from memory, and fails closed. A browser
   walk on dist/ (chromium), served by scripts/lib/hostLikeServer.mjs.

   WHAT WAS LIVE BEFORE (main, measured against the live site 2026-10-07): the
   board sat behind a skeleton until the whole answer key had been paged out of
   the database. 36 key reads (72 requests with preflights), 9,462,264 bytes
   decoded, the board tappable after 9,528 to 15,553 ms, and two more queries
   for every settled search. This walk prints those numbers beside its own.

   THE DATABASE HOST IS ABORTED ON EVERY PAGE. Nothing here reaches production:
   the page's rarity read and write are refused at the browser, and the walk
   counts any request that names college_grid_players (an aborted one counts).
   cookie-consent and cg-rules-seen-611 are preset so the board is what is
   measured.

   WHAT THIS HOLDS (phone 390 by 844 for all seven; desktop 1280 by 900 for 1,
   2 and the rectangle half of 7):
     1. THE BOARD DOES NOT WAIT. With BOTH key files held back, nine visible
        empty cells are on the page, a tap on the first opens the search box
        with its input focused, and both files are still held at that moment.
     2. REQUESTS. From navigation until both key files have finished and 500 ms
        more: exactly one request for each key file, and none to the database
        host that names college_grid_players.
     3. TIME. The median over 5 fresh contexts of the ms from navigation start
        to nine cells, at 4 times CPU throttle, is at most TIME_CEILING_MS: one
        third of main's FASTEST measured board. An outcome against the
        baseline, with a long limit, so a busy machine cannot turn it red.
     4. SEARCH FROM MEMORY. With the key loaded and the context OFFLINE, typing
        the first letters of a known answer lists him and the request count
        does not move. (Main's search cannot answer at all offline.)
     5. A PICK JUDGED OFFLINE. Still offline: a definite no takes "Guesses
        left" from 15 to 14, an entry the judge calls unknown for its cell gets
        the "No guess used" toast and the count stays, and a true answer turns
        its cell correct. The three names are computed by the page's own judge
        over the committed key for the labels read off the page, never typed
        into this file, so the walk works on whichever board the date deals.
     6. FAIL CLOSED IN THREE WORLDS, a fresh context each: the judge file
        aborted; the judge file answered 200 with the site's own index.html
        (what the live host does for a missing file); the judge file answered
        with its stamp changed. In each the search still lists names, picking a
        true answer shows the unverified toast, "Guesses left" stays 15, no
        cell is correct and today's save in localStorage is byte identical
        before and after. Then the file is released and the same pick turns
        the cell correct with no reload.
     7. GEOMETRY. The board's rectangle is identical before and after the key
        lands, the document is not wider than the viewport, and with both key
        files held 1,500 ms the cumulative layout shift at 375 by 812 stays at
        or under 0.05 (the same observer scripts/playGridCls.mjs installs).
        The longest task while the key lands and on the first search, at 4
        times throttle, is printed, not asserted.

   NEGATIVE CONTROLS (CGFIRST_CONTROL=<name>, applied to the served world, the
   files on disk never written; each run exits 0 only when its section went red):
     latecells  the cells are display none until the key files are released    1, 7
     paged      an init script reads college_grid_players 36 times             2
     slow       the document is held for the ceiling plus 500 ms               3
     nolist     the search file is aborted                                     4
     nojudge    the judge file is aborted before going offline                 5
     accepted   in the first world of 6 the judge file is served after all     6

   Run: ENGINES=chromium node scripts/playCollegeGridFirstTap.mjs   (needs dist/ from npm run build)
   It runs for several minutes: start it detached.
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 4233;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const ROUTE = '/college-grid';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

/* Main's read, live, 2026-10-07 (the scouts' runs). */
const BASELINE = { keyReads: 36, requests: 72, bytesDecoded: 9_462_264, boardMsFastest: 9_528, boardMsSlowest: 15_553 };
/* One third of main's fastest measured board. Measured here on 2026-10-07
   (three runs, medians in TIME_MEASURED_MS); the tight figure, 1.5 times the
   median of those, is printed beside the result and never asserted. */
const TIME_CEILING_MS = 3_150;
const TIME_MEASURED_MS = 'PENDING';
const CLS_CEILING = 0.05;
const HOLD_MS = 1_500;
const WAIT = 30_000;

const CONTROLS = { latecells: [1, 7], paged: [2], slow: [3], nolist: [4], nojudge: [5], accepted: [6] };
const CONTROL = process.env.CGFIRST_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`CGFIRST_CONTROL=${CONTROL} is not a control this walk knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}

const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const KEY_URL = /\/assets\/collegeGrid(Search|Judge)-[^/]+\.json(\?|$)/;
const UNVERIFIED = "No guess used. The player records didn't load";

const abort = (m) => { console.error(m); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];

// ---------------------------------------------------------------------------
// What the build emitted
// ---------------------------------------------------------------------------

if (!fs.existsSync(path.join(DIST, 'index.html'))) abort('dist/ is missing: run npm run build first. NOTHING WAS CHECKED.');
function walkDist(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDist(p, out); else out.push(p);
  }
  return out;
}
const emitted = walkDist(DIST).filter((p) => /collegeGrid(Search|Judge)/.test(path.basename(p)));
const assetOf = (kind) => emitted.filter((p) => new RegExp(`^collegeGrid${kind}-[^.]+\\.json$`).test(path.basename(p)) && path.dirname(p) === path.join(DIST, 'assets'));
if (assetOf('Search').length !== 1 || assetOf('Judge').length !== 1 || emitted.length !== 2) {
  abort(`dist does not hold exactly one hashed copy of each key file under assets and nowhere else: ${emitted.map((p) => path.relative(DIST, p)).join(', ') || 'none'}. NOTHING WAS CHECKED.`);
}
const SEARCH_ASSET = assetOf('Search')[0];
const JUDGE_ASSET = assetOf('Judge')[0];
const INDEX_HTML = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const JUDGE_TEXT = fs.readFileSync(JUDGE_ASSET, 'utf8');
const JUDGE_OTHER_STAMP = (() => { const j = JSON.parse(JUDGE_TEXT); j.stamp = '0000000000000000'; return JSON.stringify(j); })();

/** The page's own judge, bundled into a fresh folder, over the two files the build emitted. */
async function loadJudge() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgfirst-'));
  const entry = path.join(dir, 'entry.mjs');
  const outfile = path.join(dir, 'bundle.mjs');
  const at = (rel) => path.join(ROOT, rel).replaceAll('\\', '/');
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    `export const lib = await import('${at('src/lib/collegeGrid.ts')}');`,
    `export const engine = await import('${at('src/lib/gridEngine.ts')}');`,
    '',
  ].join('\n'));
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { lib, engine } = await import(pathToFileURL(outfile).href);
  const rows = lib.decodeCollegeKey([JSON.parse(fs.readFileSync(SEARCH_ASSET, 'utf8')), JSON.parse(JUDGE_TEXT)]);
  if (!rows) abort('the two key files the build emitted do not decode. NOTHING WAS CHECKED.');
  const entries = rows.map((r) => lib.toCollegeJudgeEntry(r));
  const sharing = new Map();
  for (const e of entries) sharing.set(engine.normalizeGridName(e.name), (sharing.get(engine.normalizeGridName(e.name)) ?? 0) + 1);
  /* One player per folded name and a plain name, so the list shows exactly the name typed. */
  const plain = entries.filter((e) => sharing.get(engine.normalizeGridName(e.name)) === 1 && /^[A-Za-z][A-Za-z .'-]+$/.test(e.name));
  return { lib, plain };
}

// ---------------------------------------------------------------------------
// The served world
// ---------------------------------------------------------------------------

const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
{
  let up = false;
  for (let i = 0; i < 50 && !up; i += 1) {
    up = await fetch(`${ORIGIN}/`).then((r) => r.ok).catch(() => false);
    if (!up) await sleep(200);
  }
  if (!up) { server.kill(); abort(`the dist server never came up on ${PORT}. NOTHING WAS CHECKED.`); }
}
const judge = await loadJudge();
const browser = await chromium.launch();

/**
 * One fresh context and page. `hold` names the key files held back until
 * release(); `mode` says what each key file answers with once it is let go
 * (ok, abort, html or stamp) and can be changed while the page is open.
 */
async function open({ viewport = PHONE, hold = [], mode = {}, throttle = 0, lateCells = false, pagedReads = false, holdDocumentMs = 0 } = {}) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
  const world = { ctx, mode: { search: 'ok', judge: 'ok', ...mode }, keyRequests: { search: 0, judge: 0 }, keyDone: { search: 0, judge: 0 }, dbRequests: 0, dbKeyRequests: 0, requests: 0 };
  const gates = {};
  for (const k of ['search', 'judge']) {
    let open_;
    const promise = new Promise((resolve) => { open_ = resolve; });
    gates[k] = { promise, open: open_, held: hold.includes(k) };
    if (!gates[k].held) open_();
  }
  world.held = () => ['search', 'judge'].filter((k) => gates[k].held);
  world.release = () => { for (const k of ['search', 'judge']) { gates[k].held = false; gates[k].open(); } };

  await ctx.addInitScript(() => {
    try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('cg-rules-seen-611', '1'); } catch { /* ignored */ }
    window.__nine = null;
    window.__cls = 0;
    window.__longest = 0;
    const seeNine = () => { if (window.__nine === null && document.querySelectorAll('button[data-grid-cell-status]').length >= 9) window.__nine = performance.now(); };
    new MutationObserver(seeNine).observe(document, { childList: true, subtree: true });
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longest = Math.max(window.__longest, e.duration); }).observe({ type: 'longtask', buffered: true });
    } catch { /* an engine without these entry types measures nothing, and the walk says so */ }
  });
  if (pagedReads) {
    /* Main's pattern: the whole key paged out of the table as the page loads. */
    await ctx.addInitScript((host) => {
      for (let i = 0; i < 36; i += 1) fetch(`https://${host}/rest/v1/college_grid_players?select=id&order=id.asc&offset=${i * 1000}&limit=1000`).catch(() => {});
    }, SUPA_HOST);
  }
  ctx.on('request', () => { world.requests += 1; });
  const settled = (req) => { if (KEY_URL.test(req.url())) world.keyDone[/collegeGridSearch-/.test(req.url()) ? 'search' : 'judge'] += 1; };
  ctx.on('requestfinished', settled);
  ctx.on('requestfailed', settled);
  await ctx.route(/supabase\.co/, (route) => {
    world.dbRequests += 1;
    if (route.request().url().includes('college_grid_players')) world.dbKeyRequests += 1;
    return route.abort();
  });
  await ctx.route(KEY_URL, async (route) => {
    const k = /collegeGridSearch-/.test(route.request().url()) ? 'search' : 'judge';
    world.keyRequests[k] += 1;
    await gates[k].promise;
    const how = world.mode[k];
    try {
      if (how === 'abort') await route.abort();
      else if (how === 'html') await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: INDEX_HTML });
      else if (how === 'stamp') await route.fulfill({ status: 200, contentType: 'application/json', body: JUDGE_OTHER_STAMP });
      else await route.continue();
    } catch { /* the page went away while the file was held */ }
  });
  if (holdDocumentMs) {
    await ctx.route((url) => url.pathname === ROUTE, async (route) => { await sleep(holdDocumentMs); await route.continue(); });
  }
  const page = await ctx.newPage();
  world.page = page;
  if (throttle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  /* One retry, as scripts/playGridCls.mjs does: on a busy machine a navigation can stall before the document
     arrives. The counters start again with the second navigation, so a retry cannot be read as a second request. */
  const go = () => page.goto(`${ORIGIN}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: WAIT + holdDocumentMs });
  await go().catch(async () => {
    world.retried = true;
    world.keyRequests = { search: 0, judge: 0 };
    world.keyDone = { search: 0, judge: 0 };
    world.dbRequests = 0;
    world.dbKeyRequests = 0;
    world.requests = 0;
    await go();
  });
  if (lateCells) {
    /* Added after navigation: a style appended before parsing does not survive into the parsed document. */
    world.lateStyle = await page.addStyleTag({ content: 'button[data-grid-cell-status]{display:none !important;}' });
    const letGo = world.release;
    world.release = async () => { letGo(); await world.lateStyle.evaluate((el) => el.remove()).catch(() => {}); };
  }
  return world;
}

const cellsOf = (page, status) => page.locator(`button[data-grid-cell-status="${status}"]`);
const nineVisible = (page, timeout = WAIT) => page.waitForFunction(() => {
  const cells = [...document.querySelectorAll('button[data-grid-cell-status="empty"]')];
  return cells.length === 9 && cells.every((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c).visibility !== 'hidden'; });
}, null, { timeout }).then(() => true, () => false);
const keyLanded = (world, timeout = WAIT) => {
  const start = Date.now();
  return (async () => {
    while (Date.now() - start < timeout) {
      if (world.keyDone.search >= 1 && world.keyDone.judge >= 1) return true;
      await sleep(50);
    }
    return false;
  })();
};
const guessesLeft = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/Guesses left:\s*(\d+)/);
  return m ? Number(m[1]) : null;
});
const toastTexts = (page) => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.textContent || ''));
const boardRect = (page) => page.evaluate(() => {
  const cell = document.querySelector('button[data-grid-cell-status]');
  const r = cell.parentElement.parentElement.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(',');
});
const dailySave = (page) => page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('college-grid-daily-')).sort().map((k) => [k, localStorage.getItem(k)])));

/** The six labels, read off the page, and the three names the page's own judge gives for them. */
async function namesFor(page) {
  const labels = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[data-grid-cell-status]')];
    const grid = buttons[0].parentElement.parentElement;
    return {
      cols: [...grid.children].slice(1, 4).map((d) => (d.textContent || '').trim()),
      rows: [0, 3, 6].map((i) => (buttons[i].parentElement.firstElementChild.textContent || '').trim()),
    };
  });
  for (const l of [...labels.rows, ...labels.cols]) if (!judge.lib.labelOf(l)) abort(`the page shows a label the judge does not know: "${l}". NOTHING WAS CHECKED.`);
  const at = (cell) => [labels.rows[Math.floor(cell / 3)], labels.cols[cell % 3]];
  const find = (cell, verdict, not = []) => judge.plain.find((e) => judge.lib.judgeCollegeCell(e, ...at(cell)) === verdict && !not.includes(e.name))?.name;
  const yes = find(0, 'yes');
  const no = find(1, 'no', [yes]);
  const unknown = find(2, 'unknown', [yes, no]);
  if (!yes || !no || !unknown) abort(`the judge found no ${!yes ? 'yes' : !no ? 'no' : 'unknown'} name for today's board. NOTHING WAS CHECKED.`);
  return { labels, yes, no, unknown };
}

/** Taps a cell, types the name and returns the list as shown; picks the name when asked. */
async function search(page, cell, name, { pick = false, typed = name } = {}) {
  await page.locator('button[data-grid-cell-status]').nth(cell).click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.waitFor({ state: 'visible', timeout: WAIT });
  await input.fill(typed);
  const want = name.toLowerCase();
  const listed = await page.waitForFunction((n) => [...document.querySelectorAll('[role="option"]')].some((o) => (o.textContent || '').trim().toLowerCase() === n), want, { timeout: 8_000 }).then(() => true, () => false);
  const shown = await page.evaluate(() => (document.querySelector('[role="listbox"]')?.textContent || '').trim().slice(0, 160));
  if (pick && listed) {
    const index = await page.evaluate((n) => [...document.querySelectorAll('[role="option"]')].findIndex((o) => (o.textContent || '').trim().toLowerCase() === n), want);
    await page.locator('[role="option"]').nth(index).click();
  }
  return { listed, shown };
}

// ---------------------------------------------------------------------------
// The sections. Each returns { out, info } and closes the contexts it opened.
// ---------------------------------------------------------------------------

async function sectionOne(viewport) {
  const out = [];
  const world = await open({ viewport, hold: ['search', 'judge'], lateCells: CONTROL === 'latecells' });
  const { page } = world;
  const up = await nineVisible(page, CONTROL === 'latecells' ? 8_000 : WAIT);
  let focused = false;
  if (!up) out.push('with both key files held back, nine visible empty cells never appeared: the board waits for the key');
  else {
    await cellsOf(page, 'empty').first().click();
    focused = await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Type a player name...', null, { timeout: 8_000 }).then(() => true, () => false);
    if (!focused) out.push('a tap on the first cell did not open the search box with its input focused');
  }
  const held = world.held();
  if (held.length !== 2) out.push(`the key files were not both still held when the board was tapped (held: ${held.join(', ') || 'none'})`);
  if (world.keyRequests.search < 1 || world.keyRequests.judge < 1) out.push('the page had not asked for both key files while the board was up, so nothing was being held');
  const ms = await page.evaluate(() => window.__nine);
  await world.ctx.close();
  return { out, info: `${viewport.width} by ${viewport.height}: nine empty cells ${ms === null ? 'never' : `${Math.round(ms)} ms after navigation`}, search box ${focused ? 'open and focused' : 'not open'}, both key files still held` };
}

async function sectionTwo(viewport) {
  const out = [];
  const world = await open({ viewport, pagedReads: CONTROL === 'paged' });
  const landed = await keyLanded(world);
  await sleep(500);
  if (!landed) out.push('the two key files never finished loading');
  if (world.keyRequests.search !== 1) out.push(`${world.keyRequests.search} requests for the search file, expected exactly 1`);
  if (world.keyRequests.judge !== 1) out.push(`${world.keyRequests.judge} requests for the judge file, expected exactly 1`);
  if (world.dbKeyRequests !== 0) out.push(`${world.dbKeyRequests} requests to the database host name college_grid_players; the page must never read that table`);
  const info = `${viewport.width} by ${viewport.height}: ${world.keyRequests.search + world.keyRequests.judge} key requests and ${world.dbKeyRequests} table reads (main: ${BASELINE.keyReads} reads, ${BASELINE.requests} requests, ${BASELINE.bytesDecoded.toLocaleString('en-US')} bytes decoded); ${world.dbRequests} other database requests aborted`;
  await world.ctx.close();
  return { out, info };
}

async function sectionThree() {
  const out = [];
  const times = [];
  for (let i = 0; i < 5; i += 1) {
    const world = await open({ throttle: 4, holdDocumentMs: CONTROL === 'slow' ? TIME_CEILING_MS + 500 : 0 });
    await nineVisible(world.page);
    const ms = await world.page.evaluate(() => window.__nine);
    times.push(ms === null ? Infinity : ms);
    await world.ctx.close();
  }
  const mid = median(times);
  if (!(mid <= TIME_CEILING_MS)) out.push(`the median time to nine cells is ${Math.round(mid)} ms at 4 times throttle, over the ceiling of ${TIME_CEILING_MS} ms (one third of main's fastest board, ${BASELINE.boardMsFastest} ms)`);
  return { out, info: `median ${Math.round(mid)} ms to nine cells over 5 fresh contexts at 4 times CPU throttle [${times.map((t) => Math.round(t)).join(', ')}]; ceiling ${TIME_CEILING_MS} ms; main's board took ${BASELINE.boardMsFastest} to ${BASELINE.boardMsSlowest} ms. Medians measured when the ceiling was set: ${TIME_MEASURED_MS}` };
}

/** Sections 4 and 5 share one page: the key loads, the context goes offline, and the game is played. */
async function sectionsFourAndFive(viewport) {
  const four = [];
  const five = [];
  const world = await open({ viewport, throttle: 4, mode: { search: CONTROL === 'nolist' ? 'abort' : 'ok', judge: CONTROL === 'nojudge' ? 'abort' : 'ok' } });
  const { page } = world;
  await nineVisible(page);
  if (CONTROL !== 'nolist' && CONTROL !== 'nojudge') { if (!(await keyLanded(world))) four.push('the key never landed'); }
  else await sleep(2_500);
  await sleep(300);
  const names = await namesFor(page);
  const longestAtLanding = await page.evaluate(() => { const v = window.__longest; window.__longest = 0; return v; });
  await world.ctx.setOffline(true);

  /* 4: the first letters of a known answer list him, with no request. */
  const before = world.requests;
  const firstLetters = names.no.slice(0, Math.max(4, names.no.length - 3));
  let found = await search(page, 1, names.no, { typed: firstLetters });
  if (!found.listed) found = await search(page, 1, names.no);
  if (!found.listed) four.push(`typing "${firstLetters}" offline did not list ${names.no}; the list showed: ${found.shown || 'nothing'}`);
  if (world.requests !== before) four.push(`${world.requests - before} requests left the page for a search; a search must read memory`);
  const longestOnSearch = await page.evaluate(() => window.__longest);
  const infoFour = `${viewport.width} by ${viewport.height}, offline: "${firstLetters}" listed ${names.no} with ${world.requests - before} requests. Longest task at 4 times throttle: ${Math.round(longestAtLanding)} ms while the key landed, ${Math.round(longestOnSearch)} ms on the first search`;

  /* 5: a definite no, an unknown, a yes, all offline. */
  const start = await guessesLeft(page);
  if (start !== 15) five.push(`"Guesses left" reads ${start} before any pick, expected 15`);
  const no = await search(page, 1, names.no, { pick: true });
  const afterNo = no.listed ? await page.waitForFunction(() => /Guesses left:\s*14\b/.test(document.body.innerText), null, { timeout: 8_000 }).then(() => 14, () => guessesLeft(page)) : await guessesLeft(page);
  if (afterNo !== 14) five.push(`a definite no (${names.no}) left "Guesses left" at ${afterNo}, expected 14`);
  await sleep(1_700);
  const unknown = await search(page, 2, names.unknown, { pick: true });
  const toldUnknown = unknown.listed && await page.waitForFunction((n) => [...document.querySelectorAll('[data-sonner-toast]')].some((t) => (t.textContent || '').includes(`The records can't settle ${n}`)), names.unknown, { timeout: 8_000 }).then(() => true, () => false);
  if (!toldUnknown) five.push(`an unknown pick (${names.unknown}) did not get the "No guess used" toast; toasts: ${JSON.stringify(await toastTexts(page)).slice(0, 200)}`);
  const afterUnknown = await guessesLeft(page);
  if (afterUnknown !== afterNo) five.push(`an unknown pick moved "Guesses left" from ${afterNo} to ${afterUnknown}`);
  const yes = await search(page, 0, names.yes, { pick: true });
  const correct = yes.listed && await page.waitForFunction(() => document.querySelectorAll('button[data-grid-cell-status="correct"]').length === 1, null, { timeout: 8_000 }).then(() => true, () => false);
  if (!correct) five.push(`a true answer (${names.yes}) did not turn its cell correct offline; toasts: ${JSON.stringify(await toastTexts(page)).slice(0, 200)}`);
  const infoFive = `${viewport.width} by ${viewport.height}, offline, board ${names.labels.rows.join(' / ')} x ${names.labels.cols.join(' / ')}: no ${names.no} took the count 15 to ${afterNo}; unknown ${names.unknown} cost nothing; yes ${names.yes} ${correct ? 'filled its cell' : 'did not fill its cell'}`;
  await world.ctx.close();
  return { four: { out: four, info: infoFour }, five: { out: five, info: infoFive } };
}

async function sectionSix() {
  const out = [];
  const told = [];
  const WORLDS = [['the judge file aborted', 'abort'], ['the judge file answered 200 with index.html', 'html'], ['the judge file answered with its stamp changed', 'stamp']];
  for (const [what, how] of WORLDS) {
    const accepted = CONTROL === 'accepted' && how === 'abort';
    const world = await open({ mode: { judge: accepted ? 'ok' : how } });
    const { page } = world;
    await nineVisible(page);
    await sleep(2_500);
    const names = await namesFor(page);
    const saveBefore = await dailySave(page);
    const first = await search(page, 0, names.yes, { pick: true });
    if (!first.listed) { out.push(`${what}: the search did not list ${names.yes} (the names file was healthy); the list showed: ${first.shown || 'nothing'}`); await world.ctx.close(); continue; }
    const unverified = await page.waitForFunction((t) => [...document.querySelectorAll('[data-sonner-toast]')].some((x) => (x.textContent || '').includes(t)), UNVERIFIED, { timeout: 15_000 }).then(() => true, () => false);
    if (!unverified) out.push(`${what}: picking a true answer did not show the unverified toast; toasts: ${JSON.stringify(await toastTexts(page)).slice(0, 200)}`);
    const left = await guessesLeft(page);
    if (left !== 15) out.push(`${what}: "Guesses left" reads ${left} after a pick nobody could check, expected 15`);
    const correctNow = await cellsOf(page, 'correct').count();
    if (correctNow !== 0) out.push(`${what}: ${correctNow} cell is correct after a pick nobody could check`);
    const saveAfter = await dailySave(page);
    if (saveAfter !== saveBefore) out.push(`${what}: today's save changed after a pick nobody could check (${saveBefore} to ${saveAfter.slice(0, 120)})`);
    /* The file is released. The same pick, with no reload, is judged. */
    world.mode.judge = 'ok';
    const again = correctNow === 0 ? await search(page, 0, names.yes, { pick: true }) : { listed: false };
    const filled = again.listed && await page.waitForFunction(() => document.querySelectorAll('button[data-grid-cell-status="correct"]').length === 1, null, { timeout: 15_000 }).then(() => true, () => false);
    if (!filled && !accepted) out.push(`${what}: after the file was released the same pick did not turn the cell correct with no reload`);
    told.push(`${what}: ${unverified ? 'unverified' : 'NOT unverified'}, ${left} left, save ${saveAfter === saveBefore ? 'untouched' : 'CHANGED'}, then ${filled ? 'judged after release' : 'not judged after release'}`);
    await world.ctx.close();
  }
  return { out, info: told.join('; ') };
}

async function sectionSeven(viewport, withShift) {
  const out = [];
  /* The rectangle: read with both files held, then after they land. */
  const world = await open({ viewport, hold: ['search', 'judge'], lateCells: CONTROL === 'latecells' });
  const { page } = world;
  const up = await nineVisible(page, CONTROL === 'latecells' ? 5_000 : WAIT);
  const before = up ? await boardRect(page) : 'no board';
  await world.release();
  await keyLanded(world);
  await sleep(600);
  const after = (await page.locator('button[data-grid-cell-status]').count()) ? await boardRect(page) : 'no board';
  if (before !== after) out.push(`the board's rectangle moved when the key landed: ${before} before, ${after} after`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) out.push(`the document is ${overflow} px wider than the ${viewport.width} px viewport`);
  await world.ctx.close();
  let shiftInfo = '';
  if (withShift) {
    /* The same measurement scripts/playGridCls.mjs makes, with the key held instead of the database. */
    const late = await open({ viewport: { width: 375, height: 812 }, hold: ['search', 'judge'], lateCells: CONTROL === 'latecells' });
    await sleep(HOLD_MS);
    await late.release();
    await keyLanded(late);
    await sleep(2_500);
    const cls = await late.page.evaluate(() => +window.__cls.toFixed(3));
    if (cls > CLS_CEILING) out.push(`with both key files held ${HOLD_MS} ms the page shifted ${cls} at 375 by 812, the ceiling is ${CLS_CEILING}`);
    shiftInfo = `; cumulative layout shift ${cls} at 375 by 812 with both key files held ${HOLD_MS} ms (ceiling ${CLS_CEILING})`;
    await late.ctx.close();
  }
  return { out, info: `${viewport.width} by ${viewport.height}: board rectangle ${before} before and after the key landed, ${overflow > 0 ? `${overflow} px of sideways overflow` : 'no sideways overflow'}${shiftInfo}` };
}

// ---------------------------------------------------------------------------

const TITLES = {
  1: 'The board does not wait for the key',
  2: 'Requests: one per key file, none to the table',
  3: 'Time to nine cells',
  4: 'Search from memory, offline',
  5: 'A pick judged offline',
  6: 'Fail closed in three worlds',
  7: 'Geometry: the board holds its ground when the key lands',
};
const red = new Set();
let failures = 0;
function report(n, results) {
  console.log(`\n${n}) ${TITLES[n]}`);
  for (const r of results) {
    for (const m of r.out) { failures += 1; red.add(n); console.log(`  FAIL: ${m}`); }
    if (r.info) console.log(`   ${r.info}`);
  }
}

console.log(CONTROL
  ? `playCollegeGridFirstTap, control ${CONTROL}: section ${CONTROLS[CONTROL].join(' and ')} must go red`
  : `playCollegeGridFirstTap: ${path.relative(DIST, SEARCH_ASSET)} and ${path.relative(DIST, JUDGE_ASSET)}, the database host aborted on every page`);

let crashed = null;
try {
  /* A control runs only the sections it aims at: each is a fresh context, so nothing is lost. */
  const wanted = (n) => !CONTROL || CONTROLS[CONTROL].includes(n);
  if (wanted(1)) report(1, [await sectionOne(PHONE), await sectionOne(DESKTOP)]);
  if (wanted(2)) report(2, [await sectionTwo(PHONE), await sectionTwo(DESKTOP)]);
  if (wanted(3)) report(3, [await sectionThree()]);
  if (wanted(4) || wanted(5)) {
    const r = await sectionsFourAndFive(PHONE);
    if (wanted(4)) report(4, [r.four]);
    if (wanted(5)) report(5, [r.five]);
  }
  if (wanted(6)) report(6, [await sectionSix()]);
  if (wanted(7)) report(7, [await sectionSeven(PHONE, true), await sectionSeven(DESKTOP, false)]);
} catch (err) {
  crashed = err;
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

console.log('');
if (crashed) {
  console.error(`playCollegeGridFirstTap: the walk itself broke, so NOTHING IS PROVEN either way: ${crashed?.stack || crashed}`);
  process.exit(1);
}
if (CONTROL) {
  const missed = CONTROLS[CONTROL].filter((n) => !red.has(n));
  if (missed.length) {
    console.error(`control "${CONTROL}": did NOT fire in section ${missed.join(' and ')}, the check is dead`);
    process.exit(1);
  }
  console.log(`control "${CONTROL}": fired in section ${CONTROLS[CONTROL].join(' and ')} as expected, the check works`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`playCollegeGridFirstTap: red, ${failures} failure${failures === 1 ? '' : 's'} above in section ${[...red].join(', ')}.`);
  process.exit(1);
}
console.log('playCollegeGridFirstTap: green. The board is up before the key, the key is two requests and never the table, the search and the judge read memory with the network gone, a pick nobody could check costs nothing and saves nothing, and nothing moves when the key lands.');
