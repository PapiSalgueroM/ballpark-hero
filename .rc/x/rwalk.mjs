/* Review-run 1583 walk (runner only, never committed). Needs src/data/zzBaseNbaPuzzles.ts written from b4a331a9c.
   Every Supabase request is answered locally or aborted: the NBA puzzle REST path gets a pool built here, all else is
   aborted, nothing reaches the live host. Screenshots and report.json into $RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rwalk-out');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:4173';
const b = await build({ stdin: { contents: "export { nbaConnectionsPuzzles as HEAD } from './src/data/nbaConnectionsPuzzles'; export { nbaConnectionsPuzzles as OLD } from './src/data/zzBaseNbaPuzzles'; export { dailyIndex } from './src/lib/dateUtils';", resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, alias: { '@': path.join(ROOT, 'src') } });
const { HEAD, OLD, dailyIndex } = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nbaConnectionsTable-2026-10.json'), 'utf8'));
const rowsOf = files => [...files.map((p, i) => ({ puzzle_id: p.id, sort_order: i + 1, groups_json: p.groups })), ...table.rows.map(r => ({ puzzle_id: r.puzzle_id, sort_order: r.sort_order, groups_json: r.board }))].sort((x, y) => x.sort_order - y.sort_order);
const POOLS = { head: rowsOf(HEAD), base: rowsOf(OLD) };
const report = { pools: { head: POOLS.head.length, base: POOLS.base.length }, cases: [], problems: [] };
const problem = m => { report.problems.push(m); console.log('PROBLEM ' + m); };
const dayFor = (id, n) => { for (let i = 0; i < 400; i += 1) { const d = new Date(Date.UTC(2026, 9, 31 + i)).toISOString().slice(0, 10); const ix = dailyIndex(d, n); if ((n === 20 ? POOLS.head[ix].puzzle_id : HEAD[ix].id) === id) return [d, ix]; } return [null, -1]; };
const settle = async page => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.waitForTimeout(500); };
const browser = await chromium.launch({ headless: true });

async function open({ tag, w, h, reduced, pool, day, seen = true, save = null }) {
  const touch = w < 768;
  const ls = [{ name: 'cookie-consent', value: 'essential' }];
  if (seen) ls.push({ name: 'rules-gate-seen:/nba-connections', value: '1' });
  if (save) ls.push(save);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: ls }] } });
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === new URL(BASE).origin) return r.continue();
    if (/supabase\.co$/.test(u.hostname) && pool && u.pathname === '/rest/v1/nba_connections_puzzles') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pool.map(x => ({ puzzle_id: x.puzzle_id, groups_json: x.groups_json }))) });
    return r.abort();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.addInitScript(date => { const O = Date, now = new O(date + 'T16:00:00Z').getTime(); window.Date = class extends O { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }; }, day);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(BASE + '/nba-connections', { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors, tag, touch, w };
}
const bench = page => page.locator('[data-nba-planning]');
const btn = (page, name) => bench(page).getByRole('button', { name, exact: true });
async function tapOn(s, loc) { await loc.scrollIntoViewIfNeeded(); if (s.touch) await loc.tap(); else await loc.click(); }
async function guess(s, five) {
  const clear = btn(s.page, 'Clear draft');
  if (!(await clear.isDisabled().catch(() => true))) await tapOn(s, clear);
  for (const n of five) await tapOn(s, btn(s.page, n));
  await tapOn(s, btn(s.page, 'Submit five'));
  await settle(s.page);
  /* the receipt line: does "(as of 2025-26)" break over two lines? */
  return s.page.evaluate(() => {
    const p = document.querySelector('[data-nba-receipt]');
    if (!p) return null;
    const t = p.textContent ?? '';
    const i = t.indexOf('(as of');
    let dateLines = 0;
    if (i >= 0 && p.firstChild) { const r = document.createRange(); r.setStart(p.firstChild, i); r.setEnd(p.firstChild, Math.min(t.length, i + 15)); dateLines = new Set([...r.getClientRects()].map(x => Math.round(x.top))).size; }
    return { text: t, dateLines, right: p.getBoundingClientRect().right };
  });
}
async function rows(page) {
  return page.locator('[aria-label="Revealed groups"] details').evaluateAll(els => els.map(d => { const s = d.querySelector('summary'); const r = s.getBoundingClientRect(); return { text: s.textContent, right: r.right, over: s.scrollWidth > s.clientWidth + 1, names: d.querySelector('p')?.textContent ?? '' }; }));
}
async function finish(s, c, shot) {
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await settle(s.page);
  await s.page.screenshot({ path: path.join(OUT, `${shot}.png`) });
  c.rows = await rows(s.page);
  for (const r of c.rows) if (r.over || r.right > s.w + 1) problem(`${s.tag}: row "${r.text}" overflows`);
  if (s.errors.length) problem(`${s.tag}: page errors ${s.errors.join(' | ')}`);
  await s.ctx.close();
  report.cases.push(c);
  console.log(`${s.tag}: ${JSON.stringify(c).slice(0, 600)}`);
}

/* the How to play dialog opens on a first visit to the page (its own key, not the rules gate's): read it, close it */
async function dismiss(s, shoot = null) {
  const dlg = s.page.getByRole('dialog');
  if (!(await dlg.waitFor({ timeout: 8000 }).then(() => true, () => false))) return null;
  await settle(s.page);
  const text = await dlg.innerText();
  if (shoot) {
    await s.page.screenshot({ path: path.join(OUT, `${shoot}-top.png`) });
    await dlg.evaluate(d => { const sc = [d, ...d.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 4 && getComputedStyle(e).overflowY !== 'visible'); if (sc) sc.scrollTop = sc.scrollHeight; });
    await settle(s.page);
    await s.page.screenshot({ path: path.join(OUT, `${shoot}-bottom.png`) });
  }
  await s.page.keyboard.press('Escape');
  await settle(s.page);
  if (await dlg.isVisible().catch(() => false)) await dlg.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
  await settle(s.page);
  return text;
}
async function shootRevealed(s, shot) {
  const rev = s.page.locator('[aria-label="Revealed groups"]');
  if (await rev.count()) { await rev.scrollIntoViewIfNeeded(); await settle(s.page); await s.page.screenshot({ path: path.join(OUT, `${shot}-revealed.png`) }); }
}
const boardOf = (pool, id) => pool.find(x => x.puzzle_id === id).groups_json;
const wrongFive = (g, i) => [...g[i].players.slice(0, 4), g[(i + 1) % 4].players[0]];
try {
  /* A: first visit at 390, motion on, nbaconn-003 (the longest dated labels): the rules dialog, then a win, a receipt per solve */
  for (const [w, h, reduced, id, lose] of [[390, 844, false, 'nbaconn-003', false], [390, 844, true, 'nbaconn-002', true], [1280, 900, false, 'nbaconn-004', false], [1280, 900, true, 'nbaconn-002', false], [390, 844, true, 'nbaconn-004', false], [1280, 900, false, 'nbaconn-001', true]]) {
    const [day] = dayFor(id, 20);
    const tag = `${w}${reduced ? '-reduced' : ''}-${id}${lose ? '-lose' : '-win'}`;
    const first = w === 390 && !reduced;
    const s = await open({ tag, w, h, reduced, pool: POOLS.head, day, seen: !first });
    const c = { tag, day, receipts: [] };
    try {
      const text = await dismiss(s, first || w === 1280 ? `${tag}-dialog` : null);
      c.dialog = text === null ? 'none' : text.includes('only counts seasons up to then');
      if (first && c.dialog !== true) problem(`${tag}: the first visit dialog lacks the date sentence`);
      await btn(s.page, 'Draft A').waitFor();
      await settle(s.page);
      await s.page.screenshot({ path: path.join(OUT, `${tag}-start.png`) });
      const g = boardOf(POOLS.head, id);
      const plays = lose ? [0, 1, 2, 3].map(i => wrongFive(g, i)) : g.map(x => x.players);
      for (const [i, five] of plays.entries()) {
        const rc = await guess(s, five);
        c.receipts.push(rc);
        if (rc && rc.dateLines > 1) problem(`${tag}: receipt "${rc.text}" breaks the date over ${rc.dateLines} lines`);
        if (i === 0) await s.page.screenshot({ path: path.join(OUT, `${tag}-after1.png`) });
      }
      await settle(s.page);
    } catch (e) { problem(`${tag}: ${String(e).slice(0, 200)}`); }
    await shootRevealed(s, tag);
    await finish(s, c, tag);
  }

  /* B: an old save. Play nbaconn-004 on the BASE pool (the live rows today): solve the Kings (with Cousins) and miss once.
     Reload it (1) on the base pool (release shipped, migration not applied) and (2) on the decided pool (the migration
     applied the same day, which the dealt day check exists to stop) */
  for (const id of ['nbaconn-004', 'nbaconn-002']) {
    const [day] = dayFor(id, 20);
    const solveIx = id === 'nbaconn-004' ? 3 : 2;
    const s = await open({ tag: `oldsave-write-${id}`, w: 390, h: 844, reduced: true, pool: POOLS.base, day });
    let save = null;
    const c = { tag: `oldsave-write-${id}`, day };
    try {
      await dismiss(s);
      await btn(s.page, 'Draft A').waitFor();
      await settle(s.page);
      const g = boardOf(POOLS.base, id);
      await guess(s, g[solveIx].players);
      await guess(s, wrongFive(g, 0));
      save = await s.page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('nba-connections-daily-')); return k ? { name: k, value: localStorage.getItem(k) } : null; });
      c.save = save;
    } catch (e) { problem(`oldsave-write-${id}: ${String(e).slice(0, 200)}`); }
    await finish(s, c, `oldsave-write-${id}`);
    if (!save) { problem(`oldsave ${id}: no save written`); continue; }
    for (const [which, pool] of [['basepool', POOLS.base], ['decidedpool', POOLS.head]]) {
      const tag = `oldsave-${which}-${id}`;
      const r = await open({ tag, w: 390, h: 844, reduced: true, pool, day, save });
      const c2 = { tag };
      try {
        await dismiss(r);
        await btn(r.page, 'Draft A').waitFor();
        await settle(r.page);
        c2.tiles = await bench(r.page).getByRole('button').evaluateAll(els => els.map(e => e.textContent.trim()).filter(t => t && !/Draft|Clear|Submit|Shuffle|Deselect/.test(t)).length);
        c2.after = await r.page.evaluate(k => localStorage.getItem(k), save.name);
        c2.bytesSame = c2.after === save.value;
        if (which === 'basepool' && !c2.bytesSame) problem(`${tag}: the default path rewrote the save`);
      } catch (e) { problem(`${tag}: ${String(e).slice(0, 200)}`); }
      await shootRevealed(r, tag);
      await finish(r, c2, tag);
    }
  }

  /* C: offline, no pool at all (every Supabase request aborted): the fallback file's four decided boards */
  {
    const [day] = dayFor('nbaconn-003', 4);
    const s = await open({ tag: 'offline-390', w: 390, h: 844, reduced: false, pool: null, day });
    const c = { tag: 'offline-390', day };
    try {
      await dismiss(s);
      await btn(s.page, 'Draft A').waitFor();
      await settle(s.page);
      const g = HEAD.find(x => x.id === 'nbaconn-003').groups;
      for (const x of g) await guess(s, x.players);
    } catch (e) { problem(`offline-390: ${String(e).slice(0, 200)}`); }
    await shootRevealed(s, 'offline-390');
    await finish(s, c, 'offline-390');
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
if (report.problems.length) { console.log(`rwalk1583: ${report.problems.length} problems: ${report.problems.join(' || ').slice(0, 400)}`); process.exit(1); }
console.log(`rwalk1583: green. ${report.cases.length} cases.`);
