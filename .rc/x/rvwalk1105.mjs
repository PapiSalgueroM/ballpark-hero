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

// --------------------------------------------------------------------------- A: both key files held, then one by one
for (const vp of [PHONE, DESKTOP]) {
  await run(`A-${vp.width}`, async () => {
    const w = await open({ viewport: vp, hold: ['search', 'judge'] });
    const { page } = w;
    const t0 = Date.now();
    check(await nineVisible(page, 15000), `A-${vp.width}: nine cells are up with both key files held (${Date.now() - t0} ms after domcontentloaded)`);
    await shot(page, `A-${vp.width}-1-board-held`);
    check((await overflowX(page)) <= 0, `A-${vp.width}: no sideways scroll with the board up (overflow ${await overflowX(page)} px)`);
    const n = await namesFor(page);
    note(`A-${vp.width}: labels rows ${n.labels.rows.join(' | ')} cols ${n.labels.cols.join(' | ')}; yes ${n.yes}, yes4 ${n.yes4}, no ${n.no}, unknown ${n.unknown}`);
    /* Typing while the NAMES are still held. */
    const listedEarly = await typeName(page, 0, n.yes, { wait: 1500 });
    note(`A-${vp.width}: names held, list says: "${await listText(page)}" (listed ${listedEarly})`);
    await shot(page, `A-${vp.width}-2-typing-names-held`);
    w.release('search');
    const listed = await page.waitForFunction((nm) => [...document.querySelectorAll('[role="option"]')].some((o) => (o.textContent || '').trim().toLowerCase() === nm), n.yes.toLowerCase(), { timeout: 8000 }).then(() => true, () => false);
    check(listed, `A-${vp.width}: the list fills by itself when the names land, with no new keystroke (list: "${await listText(page)}")`);
    await shot(page, `A-${vp.width}-3-list-after-names`);
    if (!listed) { await typeName(page, 0, n.yes); }
    const before = await dailySave(page);
    const tPick = Date.now();
    await clickOption(page, n.yes);
    await sleep(1500);
    note(`A-${vp.width}: 1.5 s into the wait: input ${JSON.stringify(await inputState(page))}, toasts ${JSON.stringify(await toasts(page))}`);
    await shot(page, `A-${vp.width}-4-pick-waiting`);
    const told = await waitToast(page, UNVERIFIED, 12000);
    const waited = Date.now() - tPick;
    check(told, `A-${vp.width}: judge held, the pick is unverified after ${waited} ms (toast: ${JSON.stringify(await toasts(page))})`);
    check(waited > 7000 && waited < 10500, `A-${vp.width}: the wait was about 8 seconds (${waited} ms)`);
    await shot(page, `A-${vp.width}-5-unverified-toast`);
    check((await guessesLeft(page)) === 15, `A-${vp.width}: guesses left still 15 after the unverified pick (${await guessesLeft(page)})`);
    check((await dailySave(page)) === before, `A-${vp.width}: the save is byte identical around the unverified pick (${before})`);
    check(!(await statuses(page)).includes('correct'), `A-${vp.width}: no cell is correct after the unverified pick (${await statuses(page)})`);
    note(`A-${vp.width}: after the toast the input is ${JSON.stringify(await inputState(page))}`);
    w.release('judge');
    await sleep(400);
    check(await pick(page, 0, n.yes), `A-${vp.width}: the same name can be picked again`);
    check(await waitStatus(page, 0, 'correct'), `A-${vp.width}: with the judge released the same pick fills the cell with no reload (${await statuses(page)})`);
    await sleep(600);
    await shot(page, `A-${vp.width}-6-correct-after-release`);
    note(`A-${vp.width}: key requests ${JSON.stringify(w.keyRequests)}, table reads ${w.dbKey}, errors ${JSON.stringify(w.errors)}`);
    check(w.dbKey === 0, `A-${vp.width}: no read of college_grid_players (${w.dbKey})`);
    await w.ctx.close();
  });
}

// --------------------------------------------------------------------------- B: normal play, motion on and off
for (const vp of [PHONE, DESKTOP]) {
  for (const rm of ['no-preference', 'reduce']) {
    const id = `B-${vp.width}-${rm === 'reduce' ? 'rm' : 'motion'}`;
    await run(id, async () => {
      const w = await open({ viewport: vp, reducedMotion: rm });
      const { page } = w;
      check(await nineVisible(page, 15000), `${id}: board up`);
      const n = await namesFor(page);
      const anim = (i) => page.evaluate((k) => {
        const b = document.querySelectorAll('button[data-grid-cell-status]')[k];
        const all = [b, ...b.querySelectorAll('*')].flatMap((el) => el.getAnimations().map((a) => `${a.animationName || a.constructor.name}:${Math.round(Number(a.effect?.getTiming().duration) || 0)}ms`));
        return all.join(' ') || 'none';
      }, i);
      check(await pick(page, 0, n.yes), `${id}: picked the yes name ${n.yes}`);
      check(await waitStatus(page, 0, 'correct'), `${id}: cell 0 correct (${await statuses(page)})`);
      note(`${id}: animations on the correct cell right after: ${await anim(0)}`);
      await shot(page, `${id}-1-correct`);
      check(await pick(page, 1, n.no), `${id}: picked the no name ${n.no}`);
      const wrong = await waitStatus(page, 1, 'wrong', 3000);
      note(`${id}: wrong flash seen ${wrong}; animations on the wrong cell: ${await anim(1)}`);
      await shot(page, `${id}-2-wrong-flash`);
      await sleep(1800);
      check((await guessesLeft(page)) === 13 || (await guessesLeft(page)) === 14, `${id}: guesses left after one yes and one no: ${await guessesLeft(page)} (a yes also counts as a guess, so 13)`);
      check(await pick(page, 2, n.unknown), `${id}: picked the unknown name ${n.unknown}`);
      check(await waitToast(page, 'No guess used. The records', 5000), `${id}: the unknown toast shows (${JSON.stringify(await toasts(page))})`);
      await shot(page, `${id}-3-unknown-toast`);
      const left = await guessesLeft(page);
      check((await overflowX(page)) <= 0, `${id}: no sideways scroll (${await overflowX(page)} px)`);
      const saved = await dailySave(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await nineVisible(page, 15000);
      await sleep(500);
      check((await cellText(page, 0)).includes(n.yes.split(' ').pop()) && (await guessesLeft(page)) === left, `${id}: after a reload the correct cell and the count come back (cell 0 "${await cellText(page, 0)}", left ${await guessesLeft(page)} vs ${left})`);
      check((await dailySave(page)) === saved, `${id}: a reload does not rewrite the save`);
      await shot(page, `${id}-4-reloaded`);
      note(`${id}: key requests ${JSON.stringify(w.keyRequests)}, db ${w.db}, table reads ${w.dbKey}, errors ${JSON.stringify(w.errors)}`);
      await w.ctx.close();
    });
  }
}

// --------------------------------------------------------------------------- C: more ways the judge file can be wrong (phone)
for (const how of ['short', 'swap', 'empty', 'nulls', '500', 'html', 'abort']) {
  await run(`C-${how}`, async () => {
    const w = await open({ mode: { judge: how } });
    const { page } = w;
    check(await nineVisible(page, 15000), `C-${how}: board up`);
    const n = await namesFor(page);
    const before = await dailySave(page);
    /* The dangerous direction first: a NO name must not be charged on a key that is not there. */
    const t = Date.now();
    check(await pick(page, 1, n.no), `C-${how}: the no name is listed and picked`);
    const told = await waitToast(page, UNVERIFIED, 12000);
    check(told, `C-${how}: a no pick on a bad judge file is unverified after ${Date.now() - t} ms`);
    check((await guessesLeft(page)) === 15 && (await dailySave(page)) === before, `C-${how}: nothing charged and nothing saved (left ${await guessesLeft(page)})`);
    if (how === 'short') await shot(page, 'C-short-unverified');
    await sleep(4500); /* let the toast go */
    w.mode.judge = 'ok';
    check(await pick(page, 0, n.yes), `C-${how}: yes name picked after the file is good again`);
    check(await waitStatus(page, 0, 'correct', 12000), `C-${how}: judged with no reload once the file is good (${await statuses(page)}; judge requests ${w.keyRequests.judge})`);
    note(`C-${how}: key requests ${JSON.stringify(w.keyRequests)}, errors ${JSON.stringify(w.errors)}`);
    await w.ctx.close();
  });
}

await run('C-hang', async () => {
  const w = await open({ mode: { judge: 'hang' } });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  const t = Date.now();
  await pick(page, 0, n.yes);
  const told = await waitToast(page, UNVERIFIED, 12000);
  check(told, `C-hang: a judge file that never answers gives the unverified toast after ${Date.now() - t} ms`);
  await sleep(4500);
  /* The first request is still hanging (headers never came). Does a second pick wait another 8 s? */
  const t2 = Date.now();
  await pick(page, 0, n.yes);
  const told2 = await waitToast(page, UNVERIFIED, 12000);
  note(`C-hang: second pick told ${told2} after ${Date.now() - t2} ms; judge requests so far ${w.keyRequests.judge}`);
  await w.ctx.close();
});

await run('C-nolist', async () => {
  const w = await open({ mode: { search: 'abort' } });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  const listed = await typeName(page, 0, n.yes, { wait: 4000 });
  note(`C-nolist: names file aborted: listed ${listed}, list says "${await listText(page)}"`);
  await shot(page, 'C-nolist-390');
  check(!listed, 'C-nolist: no name is offered when the names file cannot load');
  /* Enter on a typed name must not be a pick. */
  await page.keyboard.press('Enter');
  await sleep(800);
  check((await guessesLeft(page)) === 15 && !(await statuses(page)).includes('correct'), `C-nolist: Enter on a typed name with no list changes nothing (left ${await guessesLeft(page)}, toasts ${JSON.stringify(await toasts(page))})`);
  w.mode.search = 'ok';
  const again = await typeName(page, 0, n.yes, { wait: 6000 });
  check(again, `C-nolist: typing again after the file is reachable lists the name (search requests ${w.keyRequests.search})`);
  await w.ctx.close();
});

// --------------------------------------------------------------------------- D: races
await run('D-double', async () => {
  const w = await open({});
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  await page.waitForTimeout(1500);
  check(await typeName(page, 1, n.no), 'D-double: the no name is listed');
  /* A real double click (two real input events), the way an impatient thumb does it. */
  await optionOf(page, n.no).dblclick({ timeout: 3000 }).catch((e) => note('D-double: dblclick: ' + String(e).slice(0, 120)));
  await sleep(2500);
  const left = await guessesLeft(page);
  check(left === 14, `D-double: two clicks on a no name in one tick cost exactly one guess (left ${left})`);
  await w.ctx.close();
});

await run('D-double-wait', async () => {
  const w = await open({ hold: ['judge'] });
  const { page } = w;
  await nineVisible(page, 15000);
  const n = await namesFor(page);
  check(await typeName(page, 0, n.yes), 'D-double-wait: the yes name is listed while the judge is held');
  await optionOf(page, n.yes).dblclick({ timeout: 3000 }).catch((e) => note('D-double-wait: dblclick: ' + String(e).slice(0, 120)));
  await sleep(1000);
  /* Tap another cell during the wait, then let the judge land at about 3 seconds. */
  await page.locator('button[data-grid-cell-status]').nth(4).click({ timeout: 3000 }).catch((e) => note('D-double-wait: tap on cell 4 during the wait failed: ' + String(e).slice(0, 120)));
  await sleep(1500);
  await shot(page, 'D-wait-other-cell-tapped');
  w.release('judge');
  check(await waitStatus(page, 0, 'correct', 8000), `D-double-wait: the pick is judged on the cell it was made for when the key lands (${await statuses(page)})`);
  await sleep(1500);
  const save = JSON.parse(await dailySave(page));
  const guesses = save.length ? JSON.parse(save[0][1]).guesses : [];
  check(guesses.length === 1 && guesses[0].cellIndex === 0, `D-double-wait: exactly one action was written, for cell 0 (${JSON.stringify(guesses)})`);
  note(`D-double-wait: after the judged pick the search box is ${JSON.stringify(await inputState(page))}, statuses ${await statuses(page)}, left ${await guessesLeft(page)}`);
  await shot(page, 'D-wait-after-landing');
  await w.ctx.close();
});

// --------------------------------------------------------------------------- E: saves written by main's code (from the base vitest)
const SAVES = process.env.RV_SAVES && fs.existsSync(process.env.RV_SAVES) ? JSON.parse(fs.readFileSync(process.env.RV_SAVES, 'utf8')) : [];
if (!SAVES.length) note('E: no base saves file (RV_SAVES), the old save walk did not run');
for (const s of SAVES) {
  await run(`E-${s.kind}`, async () => {
    const w = await open({ storage: s.storage });
    const { page } = w;
    await nineVisible(page, 15000);
    await sleep(1200);
    const st = await statuses(page);
    const correct = st.split(',').filter((x) => x === 'correct').length;
    check(correct === s.expect.correct && (await guessesLeft(page)) === s.expect.guessesLeft, `E-${s.kind}: main's save loads: ${correct} correct (want ${s.expect.correct}), left ${await guessesLeft(page)} (want ${s.expect.guessesLeft}), board ${s.board}`);
    const kept = JSON.parse(await dailySave(page));
    const mine = s.storage.find(([k]) => k.startsWith('college-grid-daily-'));
    check(kept.length === 1 && kept[0][0] === mine[0] && kept[0][1] === mine[1], `E-${s.kind}: the saved bytes are untouched by the load (${kept.length ? kept[0][0] : 'no key'})`);
    const text = await page.evaluate(() => document.body.innerText);
    note(`E-${s.kind}: result card: ${/Grid Complete!/.test(text) ? 'Grid Complete!' : /Out of Guesses!/.test(text) ? 'Out of Guesses!' : 'none'}; errors ${JSON.stringify(w.errors)}`);
    await shot(page, `E-${s.kind}-390`);
    await w.ctx.close();
  });
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-results.json'), JSON.stringify(results, null, 1));
console.log(`RVWALK DONE: ${results.findings.length} findings, ${results.notes.length} notes`);
process.exit(0);
