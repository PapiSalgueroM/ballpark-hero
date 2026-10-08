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

const options = (page) => page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => (o.textContent || '').trim()));
const noToast = (page, timeout = 9000) => page.waitForFunction(() => document.querySelectorAll('[data-sonner-toast]').length === 0, null, { timeout }).then(() => true, () => false);
const keyReady = async (w) => { for (let i = 0; i < 200 && (w.keyRequests.search < 1 || w.keyRequests.judge < 1); i += 1) await sleep(50); await sleep(700); };

// --------------------------------------------------------------------------- S1: what the search actually answers
await run('S1', async () => {
  const w = await open({});
  const { page } = w;
  await nineVisible(page, 15000);
  await keyReady(w);
  await page.locator('button[data-grid-cell-status]').nth(0).click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  const queries = ['witten', 'manning', 'smi', 'son', 'tj watt', "d'brick", 'dbrick', 'ha ha', 'st. brown', 'st brown', 'peyton man', 'MANNING', '  manning ', 'mike williams', 'wit', 'jas', 'xyzq', 'bo', 'bo j', 'omar ellison', "'omar"];
  for (const q of queries) {
    await input.fill('');
    await input.fill(q);
    await sleep(450);
    note(`S1: "${q}" -> ${JSON.stringify(await options(page))} ${(await options(page)).length === 0 ? '(list says: "' + (await listText(page)) + '")' : ''}`);
    if (q === 'manning') {
      const box = await page.evaluate(() => { const r = document.querySelector('[role="listbox"]')?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, scrollY: Math.round(window.scrollY) } : null; });
      note(`S1: listbox rect at 390 for "manning": ${JSON.stringify(box)}`);
      await shot(page, 'S1-390-list-manning');
    }
    if (q === 'smi') await shot(page, 'S1-390-list-smi');
  }
  note(`S1: requests while searching: key ${JSON.stringify(w.keyRequests)}, db ${w.db}, errors ${JSON.stringify(w.errors)}`);
  await w.ctx.close();
});

await run('S1-1280', async () => {
  const w = await open({ viewport: DESKTOP });
  const { page } = w;
  await nineVisible(page, 15000);
  await keyReady(w);
  const y0 = await page.evaluate(() => Math.round(window.scrollY));
  await page.locator('button[data-grid-cell-status]').nth(0).click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.fill('manning');
  await sleep(600);
  const box = await page.evaluate(() => { const r = document.querySelector('[role="listbox"]')?.getBoundingClientRect(); const i = document.querySelector('input[aria-label="Type a player name..."]').getBoundingClientRect(); return { listTop: r ? Math.round(r.top) : null, listBottom: r ? Math.round(r.bottom) : null, inputTop: Math.round(i.top), inputBottom: Math.round(i.bottom), vh: window.innerHeight, scrollY: Math.round(window.scrollY) }; });
  note(`S1-1280: scrollY before the tap ${y0}; after typing: ${JSON.stringify(box)}; options ${JSON.stringify(await options(page))}`);
  await shot(page, 'S1-1280-list-manning');
  await w.ctx.close();
});

// --------------------------------------------------------------------------- S2: typing on a slow CPU
await run('S2', async () => {
  const w = await open({});
  const { page } = w;
  const cdp = await w.ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); });
  await nineVisible(page, 15000);
  await keyReady(w);
  note(`S2: long tasks up to the key landing at 4 times CPU throttle [start, ms]: ${JSON.stringify(await page.evaluate(() => window.__long))}`);
  await page.locator('button[data-grid-cell-status]').nth(0).click();
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await sleep(500);
  for (const word of ['son', 'smith', 'william']) {
    await input.fill('');
    await sleep(300);
    const mark = await page.evaluate(() => { window.__long.length = 0; return performance.now(); });
    await page.keyboard.type(word, { delay: 80 });
    const t = await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length > 0, null, { timeout: 8000 }).then(() => page.evaluate((m) => Math.round(performance.now() - m), mark), () => -1);
    await sleep(400);
    note(`S2: typed "${word}" at 80 ms a key, 4 times throttle: first options ${t} ms after the first key; long tasks while typing [start, ms] ${JSON.stringify(await page.evaluate(() => window.__long))}; options ${(await options(page)).length}`);
  }
  await w.ctx.close();
});

// --------------------------------------------------------------------------- S3: the two toasts, once they have fully appeared
for (const vp of [PHONE, DESKTOP]) {
  await run(`S3-${vp.width}`, async () => {
    const w = await open({ viewport: vp, mode: { judge: 'abort' } });
    const { page } = w;
    await nineVisible(page, 15000);
    const n = await namesFor(page);
    await pick(page, 0, n.yes);
    await waitToast(page, UNVERIFIED, 12000);
    await sleep(800);
    const rect = await page.evaluate(() => { const t = document.querySelector('[data-sonner-toast]'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: window.innerWidth, vh: window.innerHeight, opacity: getComputedStyle(t).opacity }; });
    note(`S3-${vp.width}: unverified toast rect ${JSON.stringify(rect)}`);
    await shot(page, `S3-${vp.width}-unverified-toast-settled`);
    await noToast(page);
    w.mode.judge = 'ok';
    await pick(page, 2, n.unknown);
    await waitToast(page, 'No guess used. The records', 12000);
    await sleep(800);
    await shot(page, `S3-${vp.width}-unknown-toast-settled`);
    await w.ctx.close();
  });
}

// --------------------------------------------------------------------------- S4: the names file fails, then comes back
await run('S4', async () => {
  const w = await open({ mode: { search: 'abort' } });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  const listed = await typeName(page, 0, n.yes, { wait: 4000 });
  note(`S4: names file aborted: listed ${listed}, list says "${await listText(page)}", search requests ${w.keyRequests.search}`);
  w.mode.search = 'ok';
  const input = page.locator('input[aria-label="Type a player name..."]');
  await input.fill(n.yes.slice(0, -1));
  await sleep(1500);
  note(`S4: one letter removed after the file is reachable: options ${JSON.stringify(await options(page))}, list "${await listText(page)}", search requests ${w.keyRequests.search}`);
  await input.fill(n.yes);
  const again = await page.waitForFunction((nm) => [...document.querySelectorAll('[role="option"]')].some((o) => (o.textContent || '').trim().toLowerCase() === nm), n.yes.toLowerCase(), { timeout: 6000 }).then(() => true, () => false);
  check(again, `S4: typing again after the names file is reachable lists the name (search requests ${w.keyRequests.search}, list "${await listText(page)}")`);
  /* And the judge: it also needs the search file. Does a pick work now? */
  if (again) { await clickOption(page, n.yes); check(await waitStatus(page, 0, 'correct', 12000), `S4: and the pick is judged (${await statuses(page)}; key requests ${JSON.stringify(w.keyRequests)})`); }
  await w.ctx.close();
});

// --------------------------------------------------------------------------- S5: a judge file that never answers, second pick
await run('S5', async () => {
  const w = await open({ mode: { judge: 'hang' } });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  await pick(page, 0, n.yes);
  await waitToast(page, UNVERIFIED, 12000);
  check(await noToast(page), 'S5: the first toast goes away by itself');
  const t2 = Date.now();
  await pick(page, 0, n.yes);
  const told2 = await waitToast(page, UNVERIFIED, 14000);
  note(`S5: second pick while the same request still hangs: toast ${told2} after ${Date.now() - t2} ms; judge requests ${w.keyRequests.judge}`);
  await w.ctx.close();
});

// --------------------------------------------------------------------------- S6: he leaves the page while a pick waits
await run('S6', async () => {
  const w = await open({ hold: ['judge'] });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  await pick(page, 0, n.yes);
  await sleep(1000);
  await page.getByRole('link', { name: /back/i }).first().click({ timeout: 4000 }).catch(async () => { await page.getByRole('button', { name: /back/i }).first().click({ timeout: 4000 }).catch((e) => note('S6: no Back control: ' + String(e).slice(0, 100))); });
  await sleep(1000);
  note(`S6: after Back the address is ${page.url()}`);
  w.release('judge');
  await sleep(8500);
  check((await toasts(page)).length === 0, `S6: nothing is said on the page he went to (toasts ${JSON.stringify(await toasts(page))})`);
  check((await dailySave(page)) === '[]', `S6: nothing was written for the pick he walked away from (${await dailySave(page)})`);
  await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded' });
  await nineVisible(page, 15000);
  await sleep(600);
  check((await guessesLeft(page)) === 15 && !(await statuses(page)).includes('correct'), `S6: back on the grid the board is untouched (left ${await guessesLeft(page)}, ${await statuses(page)})`);
  await w.ctx.close();
});

await browser.close();
fs.writeFileSync(path.join(OUT, 'rv2-results.json'), JSON.stringify(results, null, 1));
console.log(`RVWALK2 DONE: ${results.findings.length} findings, ${results.notes.length} notes`);
process.exit(0);
