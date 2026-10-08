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

/* ---- Round 1105 fixer probe 2 (never committed): does the web font, not the key, move the board at 1280? ---- */
const FONT_HOST = /fonts\.(googleapis|gstatic)\.com/;
const boardRect = (page) => page.evaluate(() => {
  const cell = document.querySelector('button[data-grid-cell-status]');
  if (!cell) return 'no board';
  const r = cell.parentElement.parentElement.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(',');
});
const titleBox = (page) => page.evaluate(() => {
  const h = document.querySelector('h1');
  if (!h) return null;
  const r = h.getBoundingClientRect();
  return { h: Math.round(r.height), font: getComputedStyle(h).fontFamily.slice(0, 40), fonts: document.fonts.status, loaded: [...document.fonts].filter((f) => f.status === 'loaded').length };
});

async function fontWorld(mode) {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('cg-rules-seen-611', '1'); } catch { /* ignored */ } });
  await ctx.route(/supabase\.co/, (route) => route.abort());
  const keyDone = [];
  if (mode !== 'normal') {
    await ctx.route(FONT_HOST, async (route) => {
      try {
        if (mode === 'never') { await route.abort(); return; }
        await sleep(2500);
        await route.continue();
      } catch { /* the page went away */ }
    });
  }
  const page = await ctx.newPage();
  page.on('requestfinished', (r) => { if (KEY_URL.test(r.url())) keyDone.push(Date.now()); });
  const t0 = Date.now();
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await nineVisible(page);
  const first = { at: Date.now() - t0, rect: await boardRect(page), title: await titleBox(page), keyFiles: keyDone.length };
  await sleep(1500);
  const mid = { at: Date.now() - t0, rect: await boardRect(page), title: await titleBox(page), keyFiles: keyDone.length };
  await sleep(4500);
  const last = { at: Date.now() - t0, rect: await boardRect(page), title: await titleBox(page), keyFiles: keyDone.length };
  await ctx.close();
  return { first, mid, last };
}

for (const mode of ['late', 'never', 'normal', 'late']) {
  await run(`fonts-${mode}`, async () => {
    const w = await fontWorld(mode);
    note(`fonts ${mode}: first ${JSON.stringify(w.first)}`);
    note(`fonts ${mode}: mid   ${JSON.stringify(w.mid)}`);
    note(`fonts ${mode}: last  ${JSON.stringify(w.last)}`);
    note(`fonts ${mode}: the board ${w.mid.rect === w.last.rect ? 'did NOT move' : 'MOVED'} between ${w.mid.at} ms (both key files in: ${w.mid.keyFiles === 2}) and ${w.last.at} ms`);
  });
}

await browser.close();
console.log(`\nFXPROBE2: ${results.findings.length} findings, ${results.notes.length} notes`);
process.exit(0);
