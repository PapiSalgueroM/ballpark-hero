/* Round 1583 walk (a runner probe, never committed): the built NBA Connections page over the table as it stands
   after this round's migration (the four decided file boards plus the 16 table rows as exported), every other host
   blocked (Supabase included), the clock routed to days that deal nbaconn-003 (the longest dated label), 004 (three
   dated club groups) and 002 (the rebuilt board). At 390x844 and 1280x900, reduced motion and not: solve each group
   by its five; the scroll position does not move on a submit; every revealed label fits its row and keeps
   "(as of 2025-26)" on one line. At 390: the "?" dialog says what the date means; one losing run reveals 4 rows,
   each name once. Screenshots and report.json into $RC_OUT. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk-out');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:4173';
const b = await build({ stdin: { contents: "export { nbaConnectionsPuzzles } from './src/data/nbaConnectionsPuzzles'; export { dailyIndex } from './src/lib/dateUtils';", resolveDir: ROOT }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' });
const { nbaConnectionsPuzzles, dailyIndex } = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/nbaConnectionsTable-2026-10.json'), 'utf8'));
const pool = [...nbaConnectionsPuzzles.map((p, i) => ({ puzzle_id: p.id, sort_order: i + 1, groups_json: p.groups })), ...table.rows.map(r => ({ puzzle_id: r.puzzle_id, sort_order: r.sort_order, groups_json: r.exported }))].sort((x, y) => x.sort_order - y.sort_order);
assert.equal(pool.length, 20);
const DAYS = { '2026-11-13': 'nbaconn-003', '2026-11-19': 'nbaconn-004', '2026-11-18': 'nbaconn-002' };
for (const [d, id] of Object.entries(DAYS)) assert.equal(pool[dailyIndex(d, 20)].puzzle_id, id, `${d} deals ${id}`);
const report = { cases: [], problems: [] };
const problem = m => { report.problems.push(m); console.log('PROBLEM ' + m); };
const settle = async page => { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.waitForTimeout(400); };
const browser = await chromium.launch({ headless: true });
const profiles = [{ w: 390, h: 844, touch: true, reduced: false }, { w: 390, h: 844, touch: true, reduced: true }, { w: 1280, h: 900, touch: false, reduced: false }, { w: 1280, h: 900, touch: false, reduced: true }];
try {
  for (const pr of profiles) for (const [day, id] of Object.entries(DAYS)) {
    const tag = `${pr.w}${pr.reduced ? '-reduced' : ''}-${id}`;
    const c = { tag, scroll: [], labels: [] };
    report.cases.push(c);
    const ctx = await browser.newContext({ viewport: { width: pr.w, height: pr.h }, isMobile: pr.touch, hasTouch: pr.touch, reducedMotion: pr.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:/nba-connections', value: '1' }] }] } });
    await ctx.route(/supabase\.co/, r => (new URL(r.request().url()).pathname === '/rest/v1/nba_connections_puzzles' ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pool.map(x => ({ puzzle_id: x.puzzle_id, groups_json: x.groups_json }))) }) : r.abort()));
    await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.origin === new URL(BASE).origin) return r.continue(); if (/supabase.co$/.test(u.hostname)) return r.fallback(); return r.abort(); });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(date => { const O = Date, now = new O(date + 'T16:00:00Z').getTime(); window.Date = class extends O { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }; }, day);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + '/nba-connections', { waitUntil: 'domcontentloaded' });
    const bench = page.locator('[data-nba-planning]');
    const button = name => bench.getByRole('button', { name, exact: true });
    await button('Draft A').waitFor();
    await settle(page);
    const board = pool.find(x => x.puzzle_id === id).groups_json;
    const act = async loc => { await loc.scrollIntoViewIfNeeded(); if (pr.touch) await loc.tap(); else await loc.click(); };
    const lose = pr.w === 390 && !pr.reduced && id === 'nbaconn-004';
    const guesses = lose ? [0, 1, 2, 3].map(i => [...board[i].players.slice(0, 4), board[(i + 1) % 4].players[0]]) : board.map(g => g.players);
    for (const [i, five] of guesses.entries()) {
      if (!(await button('Clear draft').isDisabled().catch(() => true))) await act(button('Clear draft'));
      for (const n of five) await act(button(n));
      await button('Submit five').scrollIntoViewIfNeeded();
      const y0 = await page.evaluate(() => scrollY);
      if (pr.touch) await button('Submit five').tap(); else await button('Submit five').click();
      await settle(page);
      const y1 = await page.evaluate(() => scrollY);
      c.scroll.push([y0, y1]);
      if (Math.abs(y1 - y0) > 1) problem(`${tag}: guess ${i + 1} moved the page from ${y0} to ${y1}`);
    }
    await settle(page);
    const rows = await page.locator('[aria-label="Revealed groups"] details').evaluateAll(els => els.map(d => {
      const s = d.querySelector('summary'), span = s.querySelector('span.whitespace-nowrap'), r = s.getBoundingClientRect();
      return { text: s.textContent, right: r.right, scroll: s.scrollWidth, client: s.clientWidth, dateLines: span ? span.getClientRects().length : 0, names: d.querySelector('p')?.textContent ?? '' };
    }));
    c.labels = rows;
    if (rows.length !== 4) problem(`${tag}: ${rows.length} revealed rows, not 4`);
    for (const r of rows) {
      if (r.scroll > r.client + 1 || r.right > pr.w + 1) problem(`${tag}: "${r.text}" is wider than its row`);
      if (/\(as of 2025-26\)$/.test(r.text) && r.dateLines !== 1) problem(`${tag}: "${r.text}" breaks its date over ${r.dateLines} lines`);
    }
    const shown = rows.flatMap(r => r.names.split(', '));
    if (new Set(shown).size !== shown.length || shown.length !== 20) problem(`${tag}: the revealed rows show ${shown.length} names, ${new Set(shown).size} different`);
    if (lose && !(await page.getByText('Out of Lives!', { exact: false }).count())) problem(`${tag}: the losing run did not end the game`);
    if (pr.w === 390 && !pr.reduced && id === 'nbaconn-003') {
      await page.locator('header').getByRole('button', { name: 'How to play', exact: true }).click();
      const dlg = page.getByRole('dialog');
      await dlg.waitFor();
      const t = await dlg.innerText();
      c.dialog = t.includes('only counts seasons up to then');
      if (!c.dialog) problem(`${tag}: the dialog does not say what a date means`);
      await page.screenshot({ path: path.join(OUT, `${tag}-dialog.png`) });
      await dlg.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await page.screenshot({ path: path.join(OUT, `${tag}.png`), fullPage: true });
    if (errors.length) problem(`${tag}: page errors ${errors.join(' | ')}`);
    await ctx.close();
    console.log(`${tag}: ${rows.length} rows; ${rows.map(r => r.text).join(' / ')}; scroll ${JSON.stringify(c.scroll)}`);
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
if (report.problems.length) { console.log(`walk1583: ${report.problems.length} problems`); process.exit(1); }
console.log(`walk1583: green. ${report.cases.length} cases, every label fits and keeps its date on one line, no submit moved the page.`);
