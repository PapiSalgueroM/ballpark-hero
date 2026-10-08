/* Round 1105 review walk (runner lens). Not committed. Reads BASE, writes screenshots and rv-results.json into RC_OUT.
   Blocks supabase.co on every context. Run from the repo root after a build (dist/ must exist). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = (process.env.RV_ONLY || '').split(',').filter(Boolean);
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'playwrightLoader.mjs')).href);
const { build } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'esbuild', 'lib', 'main.js')).href);

const ROUTE = '/college-grid';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const KEY_URL = /\/assets\/collegeGrid(Search|Judge)-[^/]+\.json(\?|$)/;
const UNVERIFIED = "No guess used. The player records didn't load";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = { findings: [], notes: [] };
const note = (m) => { console.log('RV| ' + m); results.notes.push(m); };
const finding = (m) => { console.log('RV-FINDING| ' + m); results.findings.push(m); };
const check = (ok, m) => { if (ok) note('ok: ' + m); else finding(m); return ok; };

const assets = fs.readdirSync(path.join(DIST, 'assets'));
const SEARCH_ASSET = path.join(DIST, 'assets', assets.find((n) => /^collegeGridSearch-.+\.json$/.test(n)));
const JUDGE_ASSET = path.join(DIST, 'assets', assets.find((n) => /^collegeGridJudge-.+\.json$/.test(n)));
const SEARCH_TEXT = fs.readFileSync(SEARCH_ASSET, 'utf8');
const JUDGE_TEXT = fs.readFileSync(JUDGE_ASSET, 'utf8');
const INDEX_HTML = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const judgeWith = (edit) => { const j = JSON.parse(JUDGE_TEXT); edit(j); return JSON.stringify(j); };
const BODIES = {
  stamp: judgeWith((j) => { j.stamp = '0000000000000000'; }),
  short: judgeWith((j) => { j.p.pop(); }),
  swap: SEARCH_TEXT,
  empty: '{}',
  nulls: 'null',
};

/* The page's own judge over the two emitted files, so the three names fit whichever board the date deals. */
async function loadJudge() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
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
  const rows = lib.decodeCollegeKey([JSON.parse(SEARCH_TEXT), JSON.parse(JUDGE_TEXT)]);
  if (!rows) throw new Error('the emitted key files do not decode');
  const entries = rows.map((r) => lib.toCollegeJudgeEntry(r));
  const sharing = new Map();
  for (const e of entries) sharing.set(engine.normalizeGridName(e.name), (sharing.get(engine.normalizeGridName(e.name)) ?? 0) + 1);
  const plain = entries.filter((e) => sharing.get(engine.normalizeGridName(e.name)) === 1 && /^[A-Za-z][A-Za-z .'-]+$/.test(e.name));
  return { lib, plain };
}
const judge = await loadJudge();
const browser = await chromium.launch();

async function open({ viewport = PHONE, reducedMotion = 'no-preference', hold = [], mode = {}, storage = null } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
  const world = { ctx, mode: { search: 'ok', judge: 'ok', ...mode }, keyRequests: { search: 0, judge: 0 }, db: 0, dbKey: 0, errors: [] };
  const gates = {};
  for (const k of ['search', 'judge']) {
    let open_;
    const promise = new Promise((resolve) => { open_ = resolve; });
    gates[k] = { promise, open: open_ };
    if (!hold.includes(k)) open_();
  }
  world.release = (k) => gates[k].open();
  /* A later request for a held file is not held again once released. */
  await ctx.addInitScript((saved) => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('cg-rules-seen-611', '1');
      if (saved && !sessionStorage.getItem('rv-seeded')) {
        for (const [k, v] of saved) localStorage.setItem(k, v);
        sessionStorage.setItem('rv-seeded', '1');
      }
    } catch { /* ignored */ }
  }, storage);
  await ctx.route(/supabase\.co/, (route) => {
    world.db += 1;
    if (route.request().url().includes('college_grid_players')) world.dbKey += 1;
    return route.abort();
  });
  await ctx.route(KEY_URL, async (route) => {
    const k = /collegeGridSearch-/.test(route.request().url()) ? 'search' : 'judge';
    world.keyRequests[k] += 1;
    await gates[k].promise;
    const how = world.mode[k];
    try {
      if (how === 'abort') await route.abort();
      else if (how === 'hang') { /* never answered */ }
      else if (how === '500') await route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' });
      else if (how === 'html') await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: INDEX_HTML });
      else if (BODIES[how]) await route.fulfill({ status: 200, contentType: 'application/json', body: BODIES[how] });
      else await route.continue();
    } catch { /* the page went away */ }
  });
  const page = await ctx.newPage();
  world.page = page;
  page.on('pageerror', (e) => world.errors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/.test(m.text())) world.errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  return world;
}

const nineVisible = (page, timeout = 30000) => page.waitForFunction(() => {
  const cells = [...document.querySelectorAll('button[data-grid-cell-status]')];
  return cells.length === 9 && cells.every((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}, null, { timeout }).then(() => true, () => false);
const guessesLeft = (page) => page.evaluate(() => { const m = document.body.innerText.match(/Guesses left:\s*(\d+)/); return m ? Number(m[1]) : null; });
const correctShown = (page) => page.evaluate(() => { const m = document.body.innerText.match(/Correct:\s*(\d+)/); return m ? Number(m[1]) : null; });
const toasts = (page) => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((t) => (t.textContent || '').trim()));
const statuses = (page) => page.evaluate(() => [...document.querySelectorAll('button[data-grid-cell-status]')].map((b) => b.getAttribute('data-grid-cell-status')).join(','));
const cellText = (page, i) => page.evaluate((n) => (document.querySelectorAll('button[data-grid-cell-status]')[n]?.textContent || '').trim(), i);
const dailySave = (page) => page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => k.startsWith('college-grid-daily-')).sort().map((k) => [k, localStorage.getItem(k)])));
const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }).catch((e) => note('shot failed ' + name + ': ' + e)); };
const listText = (page) => page.evaluate(() => (document.querySelector('[role="listbox"]')?.textContent || '').trim().slice(0, 200));
const inputState = (page) => page.evaluate(() => { const i = document.querySelector('input[aria-label="Type a player name..."]'); return i ? { disabled: i.disabled, value: i.value, focused: document.activeElement === i } : null; });
const waitToast = (page, text, timeout) => page.waitForFunction((t) => [...document.querySelectorAll('[data-sonner-toast]')].some((x) => (x.textContent || '').includes(t)), text, { timeout }).then(() => true, () => false);
const waitStatus = (page, i, status, timeout = 8000) => page.waitForFunction(([n, s]) => document.querySelectorAll('button[data-grid-cell-status]')[n]?.getAttribute('data-grid-cell-status') === s, [i, status], { timeout }).then(() => true, () => false);

async function namesFor(page) {
  const labels = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[data-grid-cell-status]')];
    const grid = buttons[0].parentElement.parentElement;
    return {
      cols: [...grid.children].slice(1, 4).map((d) => (d.textContent || '').trim()),
      rows: [0, 3, 6].map((i) => (buttons[i].parentElement.firstElementChild.textContent || '').trim()),
    };
  });
  const at = (cell) => [labels.rows[Math.floor(cell / 3)], labels.cols[cell % 3]];
  const find = (cell, verdict, not = []) => judge.plain.find((e) => judge.lib.judgeCollegeCell(e, ...at(cell)) === verdict && !not.includes(e.name))?.name;
  const yes = find(0, 'yes');
  const yes4 = find(4, 'yes', [yes]);
  const no = find(1, 'no', [yes, yes4]);
  const unknown = find(2, 'unknown', [yes, yes4, no]);
  return { labels, yes, yes4, no, unknown };
}

/** Opens a cell and types; returns whether the exact name is listed. */
async function typeName(page, cell, name, { typed = name, wait = 8000 } = {}) {
  await page.locator('button[data-grid-cell-status]').nth(cell).click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.fill(typed);
  const want = name.toLowerCase();
  return page.waitForFunction((n) => [...document.querySelectorAll('[role="option"]')].some((o) => (o.textContent || '').trim().toLowerCase() === n), want, { timeout: wait }).then(() => true, () => false);
}
async function clickOption(page, name) {
  const index = await page.evaluate((n) => [...document.querySelectorAll('[role="option"]')].findIndex((o) => (o.textContent || '').trim().toLowerCase() === n), name.toLowerCase());
  if (index < 0) return false;
  await page.locator('[role="option"]').nth(index).click();
  return true;
}
const pick = async (page, cell, name) => (await typeName(page, cell, name)) && clickOption(page, name);
const run = async (id, fn) => {
  if (ONLY.length && !ONLY.includes(id)) return;
  const t = Date.now();
  try { await fn(); } catch (e) { finding(`scenario ${id} crashed: ${String(e && e.stack || e).slice(0, 400)}`); }
  note(`scenario ${id} took ${Date.now() - t} ms`);
};

const optionOf = (page, name) => page.locator('[role="option"]').filter({ hasText: new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i') }).first();

// --------------------------------------------------------------------------- S6b: he leaves the grid inside the app while a pick waits
await run('S6b', async () => {
  const w = await open({ hold: ['judge'] });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  await pick(page, 0, n.yes);
  await sleep(1000);
  note(`S6b: waiting: input ${JSON.stringify(await inputState(page))}`);
  /* An in app link (no document load): the site name in the header goes home. */
  await page.locator('a[href="/"]').first().click({ timeout: 5000 });
  await page.waitForFunction(() => location.pathname === '/', null, { timeout: 8000 }).catch(() => {});
  note(`S6b: after the home link the address is ${page.url()}; grid cells on the page: ${await page.evaluate(() => document.querySelectorAll('button[data-grid-cell-status]').length)}`);
  await sleep(1500);
  w.release('judge');
  await sleep(7500);
  check((await toasts(page)).length === 0, `S6b: nothing is said on the page he went to, 9 s after the pick and after the key landed (toasts ${JSON.stringify(await toasts(page))})`);
  check((await dailySave(page)) === '[]', `S6b: nothing was written for the pick he walked away from (${await dailySave(page)})`);
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded' });
  await nineVisible(page, 15000);
  await sleep(700);
  check((await guessesLeft(page)) === 15 && !(await statuses(page)).includes('correct'), `S6b: back on the grid the board is untouched (left ${await guessesLeft(page)}, ${await statuses(page)})`);
  note(`S6b: errors ${JSON.stringify(w.errors)}`);
  await w.ctx.close();
});

// --------------------------------------------------------------------------- S7: the waiting state with reduced motion
for (const rm of ['reduce', 'no-preference']) {
  await run(`S7-${rm}`, async () => {
    const w = await open({ hold: ['judge'], reducedMotion: rm });
    const { page } = w;
    await nineVisible(page, 15000);
    const n = await namesFor(page);
    await pick(page, 0, n.yes);
    await sleep(1200);
    const spin = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll('svg.animate-spin')];
      return svgs.map((s) => ({ visible: s.getBoundingClientRect().width > 0, animation: getComputedStyle(s).animationName, duration: getComputedStyle(s).animationDuration, running: s.getAnimations().length }));
    });
    note(`S7-${rm}: spinners while the pick waits: ${JSON.stringify(spin)}`);
    await shot(page, `S7-390-waiting-${rm}`);
    w.release('judge');
    check(await waitStatus(page, 0, 'correct', 8000), `S7-${rm}: the waiting pick is judged when the key lands (${await statuses(page)})`);
    await w.ctx.close();
  });
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'rv3-results.json'), JSON.stringify(results, null, 1));
console.log(`RVWALK3 DONE: ${results.findings.length} findings, ${results.notes.length} notes`);
process.exit(0);
