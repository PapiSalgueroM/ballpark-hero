/**
 * Round 1046: the Season Centre moves, in a real browser (the pure half is
 * scripts/simSeasonCentreMotion.mjs).
 *
 * PART B: THE REAL PARTS ON A BARE PAGE. esbuild bundles the actual
 * src/components/motion/RankShiftTable.tsx around the actual league table
 * card, the page carries the shipped stylesheet from dist/assets, and the
 * tables are real ones: five table seasons of the awards probe's seeded
 * careers, derived in node and handed in as data. Beside the sliding table
 * the page draws the same card STILL (no wrapper), which is the ruler every
 * position is read against.
 *
 *  B1 The slide starts where the row truly was and ends where it truly is.
 *     At 320 (compact), 390 (compact and whole) and 1280 (whole), for steps
 *     of 1, 2, 3, 5, 10 and M - 1 matchdays from several matchdays: show the
 *     next table, and in the SAME synchronous page call pause every
 *     transition inside [data-rank-shift] at time 0 and read it. First
 *     frame: every row drawn in both tables is within 1 px of its old top,
 *     and every row already reads as the NEW table's row (place, club, W, D,
 *     L, goals, difference, points, from node), so no number on screen was
 *     ever untrue. Then the transitions are finished: every row is within
 *     1 px of its top in the still card, no inline style and no
 *     data-rank-shifting is left, and the box is the same size at the first
 *     frame, the last frame and in the still card. The largest deviation
 *     seen is printed; the 1 px bound is each row's, not a statistic.
 *  B1i Interrupted: a second table arrives 150 ms into a flight. The second
 *     flight's first frame has every row at the FIRST table's true top, its
 *     last frame at the second's, and nothing is left behind.
 *  B2 Moves are real: the share of one matchday steps in which at least one
 *     row carried a transform clears a floor (below), so a run that slides
 *     nothing cannot pass.
 *  B3 A first mount plays nothing, and neither does the step from an order
 *     drawn with slide off (before a ball is kicked) to matchday 1.
 *  B4 Reduced motion snaps: every step leaves no transition and every row
 *     at its new top in the same frame.
 *
 *  B5 The little pitch plays the goal that happened. A second bare page mounts
 *     the real src/components/season-centre/MiniPitch.tsx (with the shared
 *     pitch part's own stylesheet, which esbuild writes beside the bundle) on
 *     a scripted list of goals and steps the minute: before a goal it is idle;
 *     a goal runs plant, flight, net (read from a MutationObserver's log,
 *     waited on by attribute with a long limit, never by wall time); the net
 *     that takes it is the top one exactly when his club scored; one figure
 *     wears the ring exactly when he was in it, and the words under the pitch
 *     say Yours only on his goal or assist; a second goal landing while the
 *     first is in the air sends the first to its last frame before it
 *     starts, so each reaches the net once; a pause holds the ball still; a
 *     goal already past at mount and every goal at Results speed are drawn
 *     landed with nothing played; no figure is cut by the box at either end
 *     on a 320 or a 390 phone; and the box and what is under it never move.
 *
 * Controls (SEASON_MOTION_CONTROL=), each a rewrite of the source text inside
 * esbuild's onLoad (never a file on disk), each refusing to run unless its
 * single line needle is there exactly once:
 *   count       a row starts from half its true distance       -> B1 red
 *   firstmount  the wrapper mounts holding a made up order     -> B3 red
 *   nosnap      the reduced motion read is forced to false     -> B4 red
 *   pitchside   every goal is laid out at his club's attacking end -> B5 red
 *
 * PART C: THE BUILT SITE, served the way the live host serves it
 * (scripts/lib/hostLikeServer.mjs, port 4559), on a save the real engine made
 * in node: on the hub, twelve or more played seasons, the last one a table
 * season he did not win, opened from the career page (so no moment is ever
 * offered and nothing can write the save).
 *  C1 The bind. Desktop: after each of the first ten matchdays the table at
 *     rest is node's tableAt; a MutationObserver installed before the first
 *     press counts how often data-rank-shifting was set (a floor, below);
 *     opening plays nothing; the page neither scrolls nor changes width.
 *     Phones (390 by 844 and 320 by 700): the compact table is node's and
 *     the whole card is inside the stage's own box at every full time with no
 *     scroll by the player. Reduced motion: the attribute is never set and
 *     every goal is drawn landed.
 *  C2 The pitch in a real match, and its chunk. One matchday at 1x that node
 *     knows holds a goal of his and a goal against: each goal of it reaches
 *     the right net, his with the ring and the words. The little pitch is
 *     asked for after Kick off, not on the hub and not on the kick off card,
 *     and no file asked for from the press on carries a Club Manager marker.
 *  C3 Resume. Three matchdays watched and closed: the chip, 44 px tall; the
 *     record kept; still there after a reload; pressed, the Centre opens on
 *     "3 of M played" with node's table and nothing moving; the review clears
 *     the record and the chip. A changed key, text that is not JSON and a
 *     matchday of 0 show no chip. With the save's league year moved on, no
 *     chip, and that season is locked in the list.
 *  C4 Replays. The list is exactly the played seasons, newest first, open or
 *     locked as node's own reading of the rule says; a locked row is not a way
 *     in; the oldest open one opens to watch; the list scrolls inside its tile
 *     and the page behind does not.
 *  C5 The career walker (its ACTIONS and SKIP read from its file's text) never
 *     presses one of this round's buttons and none of their labels starts
 *     like an action it presses.
 *  C6 Floors on the picker, the kick off card, a matchday, the phone fixtures,
 *     a resumed card, a poster and the review: buttons at least 44 px tall,
 *     speed buttons 44 px wide, no text under 12 px outside the table card
 *     (its own count is printed), the header never clipped, no sideways
 *     scroll, every opponent's name at least 72 px, the review strip whole.
 *  C7 The save string is byte for byte what it was at the end of every pass.
 * Controls on what is SERVED (same variable): floor (the Kick off buttons'
 * class put back to h-11 flex-1 -> C6 red), lock (the body lock taken out ->
 * C4 red), tableview (the stage no longer brings the table into view -> C1
 * red on the phones). Screenshots go to SHOTS (or RC_OUT, else .tmp-fx/shots).
 *
 * Needs dist built (the stylesheet and the site) and Chromium. Scope with ONLY=B1,B3 (any C runs all of part C).
 * Every page blocks the live database before anything loads.
 * Run: ENGINES=chromium MSYS_NO_PATHCONV=1 node scripts/playSeasonCentreMotion.mjs
 * Green is the closing "playSeasonCentreMotion: N checks, 0 failed" line and
 * exit 0.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { probeAwardsNight, mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SEASON_MOTION_CONTROL ?? '';
const ONLY = (process.env.ONLY ?? '').split(',').map(s => s.trim()).filter(Boolean);
const want = id => ONLY.length === 0 || ONLY.includes(id);
const SHIFT_UI = 'src/components/motion/RankShiftTable.tsx';
const CONTROLS = {
  count: { file: SHIFT_UI, from: '        if (Math.abs(was - top) >= 1) plan.push({ row, dy: was - top, fade: false });', to: '        if (Math.abs(was - top) >= 1) plan.push({ row, dy: (was - top) / 2, fade: false });' },
  firstmount: { file: SHIFT_UI, from: '  const held = useRef<Held | null>(null);', to: '  const held = useRef<Held | null>({ order: order.slice().reverse(), tops: new Map(order.map((k, i) => [k, (order.length - 1 - i) * 28])), slide: true, width: Number.NaN });' },
  pitchside: { file: 'src/components/season-centre/MiniPitch.tsx', from: "  const us = !goal || goal.side === 'us';", to: '  const us = true;' },
  nosnap: { file: SHIFT_UI, from: "const reducedNow = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;", to: 'const reducedNow = () => false;' },
};
const SERVED_CONTROLS = ['floor', 'lock', 'tableview'];
if (CONTROL && !CONTROLS[CONTROL] && !SERVED_CONTROLS.includes(CONTROL)) throw new Error(`unknown SEASON_MOTION_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: rewritten in the bundled source or in what is served, never a file on disk`);

let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };
const notes = [];
const note = (id, msg) => { if (notes.filter(n => n.startsWith(id)).length < 4) notes.push(`${id}: ${msg}`); };

/* ---- the tables, from node ---- */
const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const CLUBS = B.soccer.FALLBACK_CLUBS;
const found = [];
const seen = new Set();
probeAwardsNight(B, {
  onStep: s => {
    if (!['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) return;
    const row = s.seasons[s.seasons.length - 1];
    if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
    const k = `${s.playerName}|${row.year}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ctx = B.season.buildSoccerSeasonCtx(s, CLUBS, row);
    const d = B.core.deriveSeason(B.season.SOCCER, row, ctx);
    if (d && d.mode === 'table') found.push({ tag: `${s.playerName} ${row.year} ${row.club}`, d });
  },
});
if (found.length < 300) throw new Error(`the probe gave ${found.length} table seasons; nothing was checked`);
/* five seasons spread over the probe (the "seeds" of this harness) */
const SEASONS = [3, 77, 151, 225, 299].map(i => {
  const { tag, d } = found[i];
  const keyOf = slot => d.labels[slot]?.key ?? `u${slot}`;
  const tables = [];
  for (let k = 0; k <= d.rounds.length; k += 1) tables.push(B.core.tableAt(d, k).map(r => ({ club: keyOf(r.slot), w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts })));
  return { tag, M: d.rounds.length, tables, myClub: keyOf(0), unnamed: d.labels.filter(l => !l.named).map(l => l.key) };
});
console.log(`tables from node: ${found.length} table seasons in the probe, five used: ${SEASONS.map(s => `${s.tag} (${s.M})`).join('; ')}`);

/* ---- the bare page: the real wrapper and the real card, bundled for a browser ---- */
const cssDir = path.join(ROOT, 'dist/assets');
const cssFiles = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).sort() : [];
if (!cssFiles.length) throw new Error('DIST NOT BUILT. NOTHING WAS CHECKED.');
const css = cssFiles.map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
const norm = p => p.replaceAll('\\', '/').toLowerCase();
const applied = new Set();
const controlPlugin = {
  name: 'season-motion-control',
  setup(b) {
    b.onLoad({ filter: /\.tsx?$/ }, async args => {
      const c = CONTROLS[CONTROL];
      if (!c || norm(args.path) !== norm(path.join(ROOT, c.file))) return undefined;
      const src = (await fs.promises.readFile(args.path, 'utf8')).replace(/\r\n/g, '\n');
      const n = src.split(c.from).length - 1;
      if (n !== 1) throw new Error(`control refused: ${c.file} holds its needle ${n} times, not once`);
      applied.add(CONTROL);
      return { contents: src.replace(c.from, c.to), loader: 'tsx' };
    });
  },
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-season-motion-'));
const BARE = path.join(tmp, 'bare.js');
await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { flushSync } from 'react-dom';
    import { RankShiftTable } from './src/components/motion/RankShiftTable';
    import { LeagueTableCard } from './src/components/club-manager/LeagueTableCard';
    const FOOT = "Clubs level on points are split by goal difference, then goals scored: this game's rule.";
    let live, still, mounted = 0;
    const card = (S, k, compact) => {
      const unnamed = new Set(S.unnamed);
      return React.createElement(LeagueTableCard, { rows: S.tables[k], myClub: S.myClub, compact, preseason: k === 0, zoneTop: 1, isUnnamed: c => unnamed.has(c), footnote: FOOT });
    };
    const wrapped = (S, k, compact) => React.createElement(RankShiftTable, { key: mounted, order: S.tables[k].map(r => r.club), slide: k >= 1 }, card(S, k, compact));
    window.__bare = {
      init() { live = createRoot(document.getElementById('live')); still = createRoot(document.getElementById('still')); },
      mount(S, k, compact) { mounted += 1; flushSync(() => live.render(wrapped(S, k, compact))); },
      show(S, k, compact) { flushSync(() => live.render(wrapped(S, k, compact))); },
      still(S, k, compact) { flushSync(() => still.render(card(S, k, compact))); },
    };
  `, resolveDir: ROOT, loader: 'tsx' },
  bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', outfile: BARE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [controlPlugin],
});
if (CONTROL && CONTROLS[CONTROL]?.file === SHIFT_UI && !applied.has(CONTROL)) throw new Error(`control refused: ${CONTROLS[CONTROL].file} was never loaded into the bundle`);
const bareJs = fs.readFileSync(BARE, 'utf8');
fs.rmSync(tmp, { recursive: true, force: true });

/* what the page itself can measure, in one synchronous call each */
const IN_PAGE = `
  window.__box = () => document.querySelector('#live [data-rank-shift]');
  window.__anims = () => { const box = __box(); return document.getAnimations().filter(a => a.effect && a.effect.target && box.contains(a.effect.target)); };
  window.__rowsOf = (box, root) => [...root.querySelectorAll('[data-club]')].map(r => {
    const b = box.getBoundingClientRect(), x = r.getBoundingClientRect();
    return { club: r.dataset.club, top: x.top - b.top, text: r.textContent, style: r.getAttribute('style') || '' };
  });
  window.__live = () => { const box = __box(); const b = box.getBoundingClientRect(); return { w: b.width, h: b.height, rows: __rowsOf(box, box), shifting: box.hasAttribute('data-rank-shifting'), anims: __anims().length }; };
  window.__still = () => { const box = document.querySelector('#still > div'); const b = box.getBoundingClientRect(); return { w: b.width, h: b.height, rows: __rowsOf(box, box) }; };
  /* show table k and read its first frame before anything can move */
  window.__first = (si, k, compact) => {
    __bare.show(__S[si], k, compact);
    const anims = __anims();
    for (const a of anims) { a.pause(); a.currentTime = 0; }
    const out = __live();
    out.anims = anims.length;
    return out;
  };
  window.__finish = () => { for (const a of __anims()) a.finish(); };
  window.__settled = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => done(__live()))));
`;
const pageHtml = `<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head>
<body class="bg-background text-foreground"><div id="wrap"><div id="live"></div><div style="height:32px"></div><div id="still"></div></div></body></html>`;

const browser = await chromium.launch();
async function barePage(width, height, wrapWidth, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.setContent(pageHtml, { waitUntil: 'load' });
  await page.addScriptTag({ content: bareJs });
  await page.addScriptTag({ content: IN_PAGE });
  await page.evaluate(([S, w]) => { window.__S = S; document.getElementById('wrap').style.width = `${w}px`; window.__bare.init(); }, [SEASONS, wrapWidth]);
  return { ctx, page, errors };
}

/* node's own reading of a table: the rows the card draws and what each must say */
function windowOf(S, k, compact) {
  const rows = S.tables[k].map((r, i) => ({ r, pos: i + 1 }));
  if (!compact) return rows;
  const mine = S.tables[k].findIndex(r => r.club === S.myClub);
  const lo = Math.max(0, Math.min(mine - 2, rows.length - 5));
  return rows.slice(lo, lo + 5);
}
function textOf(S, k, { r, pos }) {
  const gd = r.gf - r.ga;
  const name = S.unnamed.includes(r.club) ? 'another club' : r.club;
  return `${k === 0 ? (r.club === S.myClub ? '⭐' : '·') : pos}${name}${r.w}${r.d}${r.l}${r.gf}-${r.ga}${gd > 0 ? `+${gd}` : gd}${r.pts}`;
}
const topsBy = rows => new Map(rows.map(r => [r.club, r.top]));

/** phone column: the viewport less the stage's 12 px either side; desktop: the 380 px table column less its 8 px either side */
const LAYOUTS = [
  { id: '320 compact', w: 320, h: 700, wrap: 296, compact: true },
  { id: '390 compact', w: 390, h: 844, wrap: 366, compact: true },
  { id: '390 whole', w: 390, h: 844, wrap: 366, compact: false },
  { id: '1280 whole', w: 1280, h: 900, wrap: 364, compact: false },
];
const STEPS = [1, 2, 3, 5, 10, 'rest'];
/* measured 2026-10-08 over the five seasons: 87.2, 95.7, 93.6, 96.5 and 85.1 percent of one matchday steps moved a
   row (416 of 454 together). The floor is the lowest season less ten points: it is there to catch a table that
   has stopped sliding, and a compact window of five rows really does sit still about one week in ten. */
const B2_FLOOR = 0.75;
/* C1: how many of the nine advances from matchday 2 to 10 must slide on the built site. Measured 2026-10-08: 9 of 9 on the
   save the harness makes (it is seeded, so that repeats); part B's seasons slide on 85 to 97 percent of steps, so 6 of
   9 is a floor a healthy table clears with room and a table that has stopped sliding cannot. */
const C1_FLOOR = 6;
const stat = { transitions: 0, maxFirst: 0, maxLast: 0, step1: 0, step1Moved: 0, rowsMoved: 0, mounts: 0, mountAnims: 0, pre: 0, preAnims: 0, entered: 0, bySeason: SEASONS.map(() => [0, 0]) };
const bad = { first: 0, text: 0, order: 0, last: 0, left: 0, box: 0 };

/** One transition from table k to table k2 on a page already holding table k at rest. Returns what the first frame held. */
async function transition(page, L, si, k, k2, id) {
  const S = SEASONS[si];
  const old = await page.evaluate(([i, kk, c]) => { __bare.still(__S[i], kk, c); return __still(); }, [si, k, L.compact]);
  const first = await page.evaluate(([i, kk, c]) => __first(i, kk, c), [si, k2, L.compact]);
  const target = await page.evaluate(([i, kk, c]) => { __bare.still(__S[i], kk, c); __finish(); return __still(); }, [si, k2, L.compact]);
  const last = await page.evaluate(() => __settled());
  const expect = windowOf(S, k2, L.compact);
  const was = topsBy(old.rows), now = topsBy(target.rows);
  stat.transitions += 1;
  if (first.rows.length !== expect.length || first.rows.some((r, i) => r.club !== expect[i].r.club)) { bad.order += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: the rows are not the new table's`); }
  first.rows.forEach((r, i) => {
    if (expect[i] && r.text !== textOf(S, k2, expect[i])) { bad.text += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: a row reads "${r.text}" on the first frame, the new table says "${textOf(S, k2, expect[i])}"`); }
    if (was.has(r.club)) {
      const dev = Math.abs(r.top - was.get(r.club));
      if (dev > stat.maxFirst) stat.maxFirst = dev;
      if (dev > 1) { bad.first += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: ${r.club} starts ${dev.toFixed(2)} px from where it was`); }
    } else stat.entered += 1;
  });
  for (const r of last.rows) {
    const dev = Math.abs(r.top - (now.get(r.club) ?? Number.NaN));
    if (dev > stat.maxLast) stat.maxLast = dev;
    if (!(dev <= 1)) { bad.last += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: ${r.club} ends ${dev.toFixed(2)} px from its place`); }
    if (r.style.trim() !== '') { bad.left += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: an inline style is left on a row (${r.style})`); }
  }
  if (last.shifting || last.anims > 0) { bad.left += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: the flight never ended`); }
  const same = (a, b) => Math.abs(a.w - b.w) < 0.01 && Math.abs(a.h - b.h) < 0.01;
  if (!same(first, last) || !same(last, target)) { bad.box += 1; note(id, `${L.id} ${S.tag} ${k}>${k2}: the box changed size (${first.w}x${first.h}, ${last.w}x${last.h}, still ${target.w}x${target.h})`); }
  return first;
}

if (want('B1') || want('B2') || want('B3')) {
  for (const L of LAYOUTS) {
    const { ctx, page, errors } = await barePage(L.w, L.h, L.wrap, false);
    for (let si = 0; si < SEASONS.length; si += 1) {
      const S = SEASONS[si];
      const starts = [1, 4, 9, Math.floor(S.M / 2), S.M - 11];
      for (const step of STEPS) for (const k of step === 'rest' ? [1] : starts) {
        const k2 = step === 'rest' ? S.M : k + step;
        if (k2 > S.M || k < 1) continue;
        /* B3: a fresh mount at table k plays nothing */
        const mounted = await page.evaluate(([i, kk, c]) => { __bare.mount(__S[i], kk, c); return __live(); }, [si, k, L.compact]);
        stat.mounts += 1;
        if (mounted.anims > 0 || mounted.shifting || mounted.rows.some(r => r.style.trim() !== '')) { stat.mountAnims += 1; note('B3', `${L.id} ${S.tag}: mounting at matchday ${k} started ${mounted.anims} transitions`); }
        const first = await transition(page, L, si, k, k2, 'B1');
        if (step === 1) { stat.step1 += 1; stat.bySeason[si][0] += 1; if (first.anims > 0) { stat.step1Moved += 1; stat.bySeason[si][1] += 1; stat.rowsMoved += first.anims; } }
      }
      /* B2's sample: every one matchday step of the season, on one phone and one desktop layout */
      if (want('B2') && (L.id === '390 compact' || L.id === '1280 whole')) {
        await page.evaluate(([i, c]) => { __bare.mount(__S[i], 1, c); }, [si, L.compact]);
        for (let k = 1; k < S.M; k += 1) {
          const first = await transition(page, L, si, k, k + 1, 'B1');
          stat.step1 += 1; stat.bySeason[si][0] += 1;
          if (first.anims > 0) { stat.step1Moved += 1; stat.bySeason[si][1] += 1; stat.rowsMoved += first.anims; }
        }
      }
      /* B3: from an order drawn with slide off (before a ball is kicked) to matchday 1 */
      const pre = await page.evaluate(([i, c]) => { __bare.mount(__S[i], 0, c); return __first(i, 1, c); }, [si, L.compact]);
      stat.pre += 1;
      if (pre.anims > 0 || pre.shifting || pre.rows.some(r => r.style.trim() !== '')) { stat.preAnims += 1; note('B3', `${L.id} ${S.tag}: pre season to matchday 1 started ${pre.anims} transitions`); }
    }
    if (errors.length) { bad.box += 1; note('B1', `${L.id}: page error ${errors[0]}`); }
    await ctx.close();
  }
  console.log(`B1) ${stat.transitions} transitions over ${LAYOUTS.length} layouts and ${SEASONS.length} seasons; largest deviation at the first frame ${stat.maxFirst.toFixed(3)} px, at the last ${stat.maxLast.toFixed(3)} px; ${stat.entered} rows entered a compact window`);
  for (const n of notes) console.log(`   ${n}`);
  if (want('B1')) {
    check(stat.transitions >= 400, `B1. enough transitions were measured (${stat.transitions}, floor 400)`);
    check(bad.first === 0, `B1. every row starts within 1 px of where it truly was (${bad.first} did not)`);
    check(bad.text === 0 && bad.order === 0, `B1. every row reads as the new table's row from the first frame (${bad.text} texts, ${bad.order} orders wrong)`);
    check(bad.last === 0, `B1. every row ends within 1 px of its place in the still card (${bad.last} did not)`);
    check(bad.left === 0, `B1. nothing is left on a row after a flight (${bad.left} leftovers)`);
    check(bad.box === 0, `B1. the box is the same size at the first frame, the last frame and still (${bad.box} differed)`);
    check(stat.maxFirst <= 0.5 && stat.maxLast <= 0.5, `B1. the largest deviation seen is at most half a pixel, so the 1 px bound is not a rounding accident (${stat.maxFirst.toFixed(3)} and ${stat.maxLast.toFixed(3)})`);
  }
  if (want('B2')) {
    const share = stat.step1 ? stat.step1Moved / stat.step1 : 0;
    console.log(`B2) by season: ${stat.bySeason.map(([n, m], i) => `${SEASONS[i].tag} ${m} of ${n} (${(100 * m / Math.max(1, n)).toFixed(1)}%)`).join('; ')}`);
    check(stat.step1 >= 300 && share >= B2_FLOOR, `B2. one matchday steps in which a row carried a transform: ${stat.step1Moved} of ${stat.step1} (${(share * 100).toFixed(1)}%, floor ${(B2_FLOOR * 100).toFixed(0)}%), ${stat.rowsMoved} rows moved`);
  }
  if (want('B3')) {
    check(stat.mounts >= 100 && stat.mountAnims === 0, `B3. a first mount plays nothing (${stat.mountAnims} of ${stat.mounts} mounts moved)`);
    check(stat.pre >= 20 && stat.preAnims === 0, `B3. pre season to matchday 1 does not slide (${stat.preAnims} of ${stat.pre} did)`);
  }
}

/* B1i: a second table lands 150 ms into a flight */
if (want('B1i')) {
  const cut = { n: 0, flew: 0, first: 0, last: 0, left: 0, maxFirst: 0 };
  for (const L of [LAYOUTS[1], LAYOUTS[3]]) {
    const { ctx, page } = await barePage(L.w, L.h, L.wrap, false);
    for (let si = 0; si < SEASONS.length; si += 1) for (const k of [2, 7, 13, 21]) {
      const S = SEASONS[si];
      if (k + 2 > S.M) continue;
      const got = await page.evaluate(([i, kk, c]) => {
        const S2 = __S[i];
        __bare.mount(S2, kk, c);
        __bare.show(S2, kk + 1, c);
        const flying = __anims();
        for (const a of flying) a.currentTime = 150;
        __bare.still(S2, kk + 1, c);
        const mid = __still();
        const first = __first(i, kk + 2, c);
        __bare.still(S2, kk + 2, c);
        const target = __still();
        __finish();
        return { flying: flying.length, mid, first, target };
      }, [si, k, L.compact]);
      const last = await page.evaluate(() => __settled());
      cut.n += 1;
      if (got.flying > 0) cut.flew += 1;
      const was = topsBy(got.mid.rows), now = topsBy(got.target.rows);
      for (const r of got.first.rows) if (was.has(r.club)) {
        const dev = Math.abs(r.top - was.get(r.club));
        if (dev > cut.maxFirst) cut.maxFirst = dev;
        if (dev > 1) { cut.first += 1; note('B1i', `${L.id} ${S.tag} from ${k}: ${r.club} starts the second flight ${dev.toFixed(2)} px from its place in table ${k + 1}`); }
      }
      for (const r of last.rows) {
        if (!(Math.abs(r.top - (now.get(r.club) ?? Number.NaN)) <= 1)) cut.last += 1;
        if (r.style.trim() !== '') cut.left += 1;
      }
      if (last.shifting || last.anims > 0) cut.left += 1;
    }
    await ctx.close();
  }
  for (const n of notes.filter(x => x.startsWith('B1i'))) console.log(`   ${n}`);
  check(cut.n >= 30 && cut.flew >= cut.n * 0.5, `B1i. a flight was in the air when the second table landed in ${cut.flew} of ${cut.n} cases (floor half)`);
  check(cut.first === 0 && cut.last === 0 && cut.left === 0, `B1i. the second flight starts at the first table's true places and ends at the second's, nothing left (${cut.first} bad starts, ${cut.last} bad ends, ${cut.left} leftovers; largest start deviation ${cut.maxFirst.toFixed(3)} px)`);
}

/* B4: reduced motion snaps */
if (want('B4')) {
  const snap = { n: 0, anims: 0, off: 0 };
  for (const L of [LAYOUTS[1], LAYOUTS[3]]) {
    const { ctx, page } = await barePage(L.w, L.h, L.wrap, true);
    const reads = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reads) throw new Error('the page does not report reduced motion: nothing was checked');
    for (let si = 0; si < SEASONS.length; si += 1) for (const [k, k2] of [[1, 2], [5, 6], [9, 12], [14, 24], [1, SEASONS[si].M]]) {
      const S = SEASONS[si];
      if (k2 > S.M) continue;
      const got = await page.evaluate(([i, a, b, c]) => {
        __bare.mount(__S[i], a, c);
        __bare.show(__S[i], b, c);
        const live = __live();
        __bare.still(__S[i], b, c);
        return { live, target: __still() };
      }, [si, k, k2, L.compact]);
      snap.n += 1;
      const now = topsBy(got.target.rows);
      if (got.live.anims > 0 || got.live.shifting || got.live.rows.some(r => r.style.trim() !== '')) { snap.anims += 1; note('B4', `${L.id} ${S.tag} ${k}>${k2}: ${got.live.anims} transitions under reduced motion`); }
      if (got.live.rows.some(r => !(Math.abs(r.top - (now.get(r.club) ?? Number.NaN)) <= 1))) snap.off += 1;
    }
    await ctx.close();
  }
  for (const n of notes.filter(x => x.startsWith('B4'))) console.log(`   ${n}`);
  check(snap.n >= 40 && snap.anims === 0, `B4. under reduced motion no step slides (${snap.anims} of ${snap.n} did)`);
  check(snap.off === 0, `B4. and every row is at its new place in the same frame (${snap.off} were not)`);
}

/* B5: the little pitch plays the goal that happened */
if (want('B5')) {
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-season-pitch-'));
  const PITCH_JS = path.join(tmp2, 'pitch.js');
  await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import MiniPitch from './src/components/season-centre/MiniPitch';
      let root = null, props = null;
      const draw = () => flushSync(() => root.render(React.createElement(MiniPitch, props)));
      window.__pitch = {
        mount(p) { if (root) root.unmount(); root = createRoot(document.getElementById('pitch')); props = p; draw(); },
        set(patch) { props = { ...props, ...patch }; draw(); },
      };
    `, resolveDir: ROOT, loader: 'tsx' },
    bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', outfile: PITCH_JS, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [controlPlugin],
  });
  if (CONTROL === 'pitchside' && !applied.has(CONTROL)) throw new Error('control refused: MiniPitch.tsx was never loaded into the bundle');
  const pitchJs = fs.readFileSync(PITCH_JS, 'utf8');
  /* the pitch's look is the shared part's own stylesheet, which esbuild writes beside the bundle; the page carries it with the shipped one */
  const pitchCssFile = PITCH_JS.replace(/\.js$/, '.css');
  const pitchCss = fs.existsSync(pitchCssFile) ? fs.readFileSync(pitchCssFile, 'utf8') : '';
  fs.rmSync(tmp2, { recursive: true, force: true });
  check(pitchCss.includes('.pm-surface') && pitchCss.includes('.cm-live-net'), 'B5. the bare page carries the pitch part\'s own stylesheet (nets, ball and figures are placed)');
  const BOX = 'relative w-full overflow-hidden rounded-xl aspect-[25/12]';
  const EVENTS = [
    { min: 12, kind: 'goal', side: 'them', pts: 1 },
    { min: 40, kind: 'assist', side: 'us', mine: true },
    { min: 40, kind: 'goal', side: 'us', pts: 1 },
    { min: 67, kind: 'goal', side: 'us', mine: true, pts: 1 },
    { min: 69, kind: 'goal', side: 'us', pts: 1 },
    { min: 88, kind: 'goal', side: 'them', pts: 1 },
  ];
  const html2 = `<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><style>${pitchCss}</style></head>
<body class="bg-background text-foreground"><div id="wrap"><div id="pitch"></div><div id="under" style="height:20px">under</div></div></body></html>`;
  const READ = `
    window.__log = [];
    window.__watch = () => {
      const box = document.querySelector('[data-mini-pitch]');
      window.__log = [];
      if (window.__obs) window.__obs.disconnect();
      window.__obs = new MutationObserver(() => { const last = __log[__log.length - 1]; const now = (box.dataset.pitchGoal || '') + ':' + box.dataset.pitchPhase; if (last !== now) __log.push(now); });
      window.__obs.observe(box, { attributes: true, attributeFilter: ['data-pitch-phase', 'data-pitch-goal'] });
    };
    window.__see = () => {
      const box = document.querySelector('[data-mini-pitch]');
      const b = box.getBoundingClientRect();
      const figs = [...box.querySelectorAll('.pm-figure svg')].map(s => s.getBoundingClientRect());
      const cut = figs.filter(r => r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5 || r.left < b.left - 0.5 || r.right > b.right + 0.5).length;
      const ball = box.querySelector('[data-cm-ball]').getBoundingClientRect();
      const under = document.getElementById('under').getBoundingClientRect();
      return {
        phase: box.dataset.pitchPhase, side: box.dataset.pitchSide, goal: box.dataset.pitchGoal || '',
        rect: [b.left, b.top, b.width, b.height].map(v => Math.round(v * 100) / 100).join(','), under: Math.round(under.top * 100) / 100,
        topNet: box.querySelector('.cm-live-net--top').getAttribute('data-cm-net') === 'goal', bottomNet: box.querySelector('.cm-live-net--bottom').getAttribute('data-cm-net') === 'goal',
        rings: [...box.querySelectorAll('[data-pitch-ring]')].map(f => f.getAttribute('data-pm-figure')), figures: figs.length, cut,
        ballIn: ball.top >= b.top - 0.5 && ball.bottom <= b.bottom + 0.5,
        yours: document.querySelector('[data-pitch-yours]').textContent, log: window.__log.slice(),
      };
    };
  `;
  const netOf = (key, limit = 30000) => `(() => { const b = document.querySelector('[data-mini-pitch]'); return b && b.dataset.pitchGoal === ${JSON.stringify(key)} && b.dataset.pitchPhase === 'net' && !b.hasAttribute('data-pitch-live'); })()`;
  const flyingOf = key => `(() => { const b = document.querySelector('[data-mini-pitch]'); return b && b.dataset.pitchGoal === ${JSON.stringify(key)} && b.hasAttribute('data-pitch-live') && b.dataset.pitchPhase !== 'net'; })()`;
  const p5 = { n: 0, bad: [] };
  const hold = (ok, msg) => { p5.n += 1; if (!ok) p5.bad.push(msg); };
  for (const [vw, wrap] of [[320, 296], [390, 366]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 800 } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
    await page.setContent(html2, { waitUntil: 'load' });
    await page.addScriptTag({ content: pitchJs });
    await page.addScriptTag({ content: READ });
    await page.evaluate(w => { document.getElementById('wrap').style.width = `${w}px`; }, wrap);
    const base = { md: 1, events: EVENTS, shown: 0, paused: false, instant: false, usColor: '#ef4444', role: 'ATT', onFrom: 1, onTo: 90, boxClass: BOX };
    const mount = p => page.evaluate(q => { __pitch.mount(q); __watch(); return __see(); }, p);
    const set = patch => page.evaluate(q => { __pitch.set(q); return __see(); }, patch);
    const see = () => page.evaluate(() => __see());
    const landed = async key => { await page.waitForFunction(netOf(key), null, { timeout: 30000 }); return see(); };
    const tag = `${vw}`;

    const start = await mount(base);
    hold(start.phase === 'idle' && start.rings.length === 0 && start.yours === '' && start.figures === 7 && start.cut === 0, `${tag}: before a goal the pitch is not idle with seven whole figures (${JSON.stringify({ phase: start.phase, figures: start.figures, cut: start.cut })})`);
    const rect0 = start.rect, under0 = start.under;
    const quiet = await set({ shown: 11 });
    hold(quiet.phase === 'idle' && quiet.log.length === 0, `${tag}: minutes with no goal moved the pitch`);

    /* a goal against, he is an attacker: the bottom net, nobody ringed */
    await set({ shown: 12 });
    const against = await landed('1|12|them|0');
    hold(against.side === 'them' && against.bottomNet && !against.topNet, `${tag}: a goal against is not in the bottom net`);
    hold(against.rings.length === 0 && against.yours === '', `${tag}: a goal against rings an attacker or says Yours`);
    hold(against.log.join(' ') === '1|12|them|0:plant 1|12|them|0:flight 1|12|them|0:net', `${tag}: the goal against did not run plant, flight, net (${against.log.join(' ')})`);
    hold(against.cut === 0 && against.ballIn, `${tag}: at the bottom end ${against.cut} figures are cut by the box, ball inside ${against.ballIn}`);

    /* his assist: the top net, one ring on his side, the words */
    await page.evaluate(() => __watch());
    await set({ shown: 40 });
    const assist = await landed('1|40|us|0');
    hold(assist.side === 'us' && assist.topNet && !assist.bottomNet, `${tag}: his club's goal is not in the top net`);
    hold(assist.rings.join() === 'me' && assist.yours === '🅰️ Your assist', `${tag}: his assist is not one ring and the assist words (${assist.rings.join()} / ${assist.yours})`);
    hold(assist.cut === 0 && assist.ballIn, `${tag}: at the top end ${assist.cut} figures are cut by the box`);

    /* his goal, and a second goal two minutes later while the first is still in the air */
    await page.evaluate(() => __watch());
    await set({ shown: 67 });
    await page.waitForFunction(flyingOf('1|67|us|0'), null, { timeout: 30000 });
    const kicked = await see();
    hold(kicked.yours === '⚽ Yours' && kicked.rings.join() === 'me', `${tag}: his goal does not say Yours with one ring (${kicked.yours})`);
    await set({ shown: 69 });
    const second = await landed('1|69|us|0');
    const nets = k => second.log.filter(x => x === `${k}:net`).length;
    hold(nets('1|67|us|0') === 1 && nets('1|69|us|0') === 1, `${tag}: two goals two minutes apart did not each reach the net once (${second.log.join(' ')})`);
    hold(second.log.indexOf('1|67|us|0:net') < second.log.indexOf('1|69|us|0:plant'), `${tag}: the second goal started before the first had landed (${second.log.join(' ')})`);
    hold(second.yours === '' && second.rings.join() === 'me', `${tag}: a team mate's goal says Yours, or the attacker is not in the picture (${second.yours} / ${second.rings.join()})`);

    /* paused in the air: nothing moves until it is lifted */
    await page.evaluate(() => __watch());
    await set({ shown: 88 });
    await page.waitForFunction(() => document.querySelector('[data-mini-pitch]').dataset.pitchPhase === 'flight', null, { timeout: 30000 });
    const ballAt = () => page.evaluate(() => { const r = document.querySelector('[data-cm-ball]').getBoundingClientRect(); return `${r.left.toFixed(2)},${r.top.toFixed(2)}`; });
    await set({ paused: true });
    const p1 = await ballAt();
    await page.waitForTimeout(300);
    const p2 = await ballAt();
    hold(p1 === p2, `${tag}: the ball moved while the clock was paused (${p1} to ${p2})`);
    await set({ paused: false });
    const late = await landed('1|88|them|0');
    hold(late.bottomNet && late.rings.length === 0, `${tag}: the last goal did not land in the bottom net after the pause`);
    hold([against, assist, second, late].every(s => s.rect === rect0 && s.under === under0), `${tag}: the box or what is under it moved (${[against, assist, second, late].map(s => s.rect).join(' / ')} from ${rect0})`);

    /* a goal already on the board at mount is drawn landed, with nothing played */
    const resumed = await mount({ ...base, shown: 70 });
    await page.waitForTimeout(150);
    const after = await see();
    hold(resumed.phase === 'net' && resumed.goal === '1|69|us|0' && after.log.length === 0, `${tag}: a goal already past at mount was played (${resumed.phase}, log ${after.log.join(' ')})`);
    /* Results speed and reduced motion: every goal lands at once */
    const inst = await mount({ ...base, instant: true, shown: 0 });
    const hit = await set({ shown: 12 });
    await page.waitForTimeout(150);
    const hitLog = (await see()).log;
    hold(inst.phase === 'idle' && hit.phase === 'net' && hit.bottomNet && !hitLog.some(x => x.endsWith(':plant') || x.endsWith(':flight')), `${tag}: at Results speed a goal did not land at once (${hit.phase}, log ${hitLog.join(' ')})`);
    /* a keeper: beaten, he wears the ring; a defender likewise; neither on his club's goal */
    await mount({ ...base, role: 'GK', shown: 11 });
    await set({ shown: 12 });
    const keeper = await landed('1|12|them|0');
    hold(keeper.rings.join() === 'me' && keeper.yours === '', `${tag}: a keeper beaten is not the one ring (${keeper.rings.join()})`);
    await set({ shown: 40 });
    const keeperUp = await landed('1|40|us|0');
    hold(keeperUp.rings.join() === 'me' && keeperUp.yours === '🅰️ Your assist', `${tag}: a keeper's assist is not ringed`);
    /* he did not play: nobody is ringed on anything */
    await mount({ ...base, role: null, shown: 66 });
    await set({ shown: 67 });
    const absent = await landed('1|67|us|0');
    hold(absent.rings.length === 0 && absent.yours === '', `${tag}: a game he missed rings somebody`);
    if (errors.length) hold(false, `${tag}: page error ${errors[0]}`);
    await ctx.close();
  }
  for (const b of p5.bad.slice(0, 8)) console.log(`   B5: ${b}`);
  check(p5.n >= 30 && p5.bad.length === 0, `B5. the pitch plays the goal that happened: side, net, ring, words, order, pause, a goal already past, Results speed (${p5.bad.length} of ${p5.n} held checks failed)`);
}

/* ======================= PART C: the built site ======================= */
let server = null;
if (ONLY.length === 0 || ONLY.some(x => x.startsWith('C'))) {
  const DIST = path.join(ROOT, 'dist');
  const PORT = Number(process.env.PORT || 4559);
  const BASE = `http://127.0.0.1:${PORT}`;
  const SHOTS = path.resolve(ROOT, process.env.SHOTS || process.env.RC_OUT || '.tmp-fx/shots');
  const ASSETS = path.join(DIST, 'assets');
  const jsText = Object.fromEntries(fs.readdirSync(ASSETS).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(ASSETS, f), 'utf8')]));
  const chunkWith = needle => Object.keys(jsText).filter(f => jsText[f].includes(needle));
  const one = (needle, what) => { const c = chunkWith(needle); if (c.length !== 1) throw new Error(`expected one chunk holding ${what}, found ${c.length}`); return c[0]; };
  const CENTRE_CHUNK = one('Straight to the final table', 'the Season Centre');
  const PITCH_CHUNK = one('data-mini-pitch', 'the little pitch');
  const SURFACE_CHUNKS = chunkWith('cm-pitch-player');
  const CM_MARKERS = ['Sit deep, frustrate them, protect the point', 'oppositionShape'];
  console.log(`C) chunks: Season Centre ${CENTRE_CHUNK}, little pitch ${PITCH_CHUNK}, pitch part ${SURFACE_CHUNKS.join(' ')}`);

  /* controls on what is SERVED (the built files are never written), each refusing a needle that is not there exactly once */
  const SERVED = {
    floor: [
      ['className:"h-11 shrink-0 sm:flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500"', 'className:"h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-black hover:bg-emerald-500"'],
      ['className:"h-11 shrink-0 sm:flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted/40"', 'className:"h-11 flex-1 rounded-lg border border-border text-sm font-semibold hover:bg-muted/40"'],
    ],
    lock: [['.style.overflow="hidden"', '.style.overflow=""', 'centre']],
    tableview: [['.closest("[data-centre-stage]")', '.closest("[data-centre-stage-off]")']],
  };
  const rewrites = new Map();
  if (SERVED[CONTROL]) {
    for (const [from, to, where] of SERVED[CONTROL]) {
      const holders = where === 'centre' ? [CENTRE_CHUNK].filter(c => jsText[c].includes(from)) : chunkWith(from);
      if (holders.length !== 1 || jsText[holders[0]].split(from).length !== 2) throw new Error(`control refused: ${JSON.stringify(from.slice(0, 60))} is not in the served site exactly once`);
      rewrites.set(holders[0], (rewrites.get(holders[0]) ?? jsText[holders[0]]).replace(from, to));
    }
    console.log(`CONTROL ${CONTROL}: ${[...rewrites.keys()].join(', ')} rewritten as served`);
  }

  /* the walker's own rule, read from its file's text */
  const walkSrc = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const actAt = walkSrc.indexOf('const ACTIONS = [');
  const actBody = walkSrc.slice(actAt, walkSrc.indexOf('];', actAt)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const WALK_ACTIONS = [...actBody.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const skipLine = walkSrc.split('\n').find(l => l.startsWith('const SKIP = /'));
  if (actAt < 0 || !skipLine || !WALK_ACTIONS.includes('Next Season')) throw new Error('cannot read the walker\'s ACTIONS and SKIP from playSoccerCareer.mjs');
  const WALK_SKIP = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));

  /* ---- a save the game itself would write: on the hub, twelve or more played seasons, the last one a table he did not win ---- */
  const { soccer, season: S, core: C } = B;
  const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const stepOf = s => {
    switch (s.phase) {
      case 'youth': return soccer.advanceYouthYear(s, CLUBS);
      case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? soccer.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
      case 'playing': return soccer.advanceProSeason(s, CLUBS);
      case 'newspaper': return soccer.dismissNewspaper(s);
      case 'season_summary': return soccer.dismissSummary(s, CLUBS);
      case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
      case 'international_debut': return soccer.dismissDebut(s, CLUBS);
      case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
      case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
      case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
      case 'moral_dilemma': { const n = soccer.applyMoralDilemmaChoice(s, 0); return n.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(n, CLUBS) : n; }
      case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev && ev.choices && ev.choices.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
      case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
      case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
      case 'transfer_window': return soccer.stayAtClub(s);
      case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
      default: return null;
    }
  };
  const playedRow = r => r.type === 'playing' && r.apps > 0;
  /* node's own reading of which seasons can be watched again (the rule, written out a second time on purpose) */
  const facts = save => save.seasons.map((row, at) => {
    if (!playedRow(row)) return null;
    const ctx = S.buildSoccerSeasonCtx(save, CLUBS, row);
    const stable = ctx.mode !== 'table' || (ctx.finish && ctx.finish.finish === 1);
    return { at, row, ctx, stable: !!stable, open: !!stable || (save.phone && save.phone.world && save.phone.world.year === row.year) };
  }).filter(Boolean);
  let HUB = null;
  for (let c = 0; c < 120 && !HUB; c += 1) {
    const real = Math.random;
    Math.random = mulberry32(c * 7919 + 1046);
    try {
      let s = soccer.initCareer(`Motion ${c}`, 'England', 'ST', '2010-14', abil(72 + (c % 10)), 72 + (c % 10), 2010, CLUBS, null, 92);
      for (let g = 0; g < 900 && s && !s.retired && !HUB; g += 1) {
        if (s.phase === 'playing' && s.seasons.filter(playedRow).length >= 12) {
          const f = facts(s);
          const last = f[f.length - 1];
          if (last && last.at === s.seasons.length - 1 && last.ctx.mode === 'table' && !last.stable && last.open && f.some(x => x.open && x !== last) && f.some(x => !x.open)) {
            const d = C.deriveSeason(S.SOCCER, last.row, last.ctx);
            const md = d ? d.games.findIndex((x, i) => i >= 1 && i < 14 && x.events.some(e => e.kind === 'goal' && e.mine) && x.events.some(e => e.kind === 'goal' && e.side === 'them')) + 1 : 0;
            if (d && d.mode === 'table' && md > 0) HUB = { save: JSON.stringify(s), state: s, facts: f, last, d, goalMd: md };
          }
        }
        s = stepOf(s);
      }
    } finally { Math.random = real; }
  }
  if (!HUB) throw new Error('the engine gave no hub save with twelve played seasons and a table season he did not win at the end: nothing was checked');
  const D = HUB.d, M = D.games.length;
  const keyOfSlot = slot => D.labels[slot]?.key ?? `u${slot}`;
  const ORDER = Array.from({ length: M + 1 }, (_, k) => C.tableAt(D, k).map(r => keyOfSlot(r.slot)));
  const MINE = keyOfSlot(0);
  const compactOf = k => { const at = ORDER[k].indexOf(MINE); const lo = Math.max(0, Math.min(at - 2, ORDER[k].length - 5)); return ORDER[k].slice(lo, lo + 5); };
  const LABEL = `${HUB.last.row.year}/${String(HUB.last.row.year + 1).slice(-2)}`;
  const SEASON_KEY = S.soccerSeasonKey(HUB.state.playerName, HUB.last.row);
  const OPEN_IDS = HUB.facts.filter(x => x.open).map(x => String(x.at)).reverse();
  const LOCKED_IDS = HUB.facts.filter(x => !x.open).map(x => String(x.at)).reverse();
  console.log(`C) save: ${HUB.state.playerName}, ${HUB.facts.length} played seasons (${OPEN_IDS.length} replay, ${LOCKED_IDS.length} locked), the last ${LABEL} ${HUB.last.row.club} with ${M} matchdays; his goal and a goal against on matchday ${HUB.goalMd}`);
  check(OPEN_IDS.length >= 2 && LOCKED_IDS.length >= 1, `C. the save has seasons that replay and seasons that do not (${OPEN_IDS.length} and ${LOCKED_IDS.length}; floors 2 and 1)`);

  /* ---- the served site ---- */
  const { spawn } = await import('node:child_process');
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const RESUME_SLOT = 'seasonCentre:v1:soccer';
  /** A context on a save: the cookie question answered, the help seen, the live database unreachable, extra storage as given. */
  async function openSite(save, { width = 1280, height = 900, reduced = false, storage = {} } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(([v, extra]) => {
      try {
        if (!sessionStorage.getItem('motion-harness')) {
          sessionStorage.setItem('motion-harness', '1');
          localStorage.setItem('cookie-consent', 'essential');
          localStorage.setItem('soccerCareerSave', v);
          localStorage.setItem('seasonCentre:help', '1');
          for (const [k, val] of Object.entries(extra)) localStorage.setItem(k, val);
        }
      } catch { /* private mode */ }
    }, [save, storage]);
    await ctx.route('**://*.supabase.co/**', r => r.abort());
    for (const [file, text] of rewrites) await ctx.route(`**/assets/${file}`, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: text }));
    const page = await ctx.newPage();
    const js = [];
    const errors = [];
    page.on('request', r => { const u = r.url(); if (u.includes('/assets/') && u.endsWith('.js')) js.push(u.split('/').pop()); });
    page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-open-season-ratings]', { timeout: 60000 });
    await page.waitForTimeout(600);
    return { ctx, page, js, errors };
  }
  const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
  const stored = page => page.evaluate(k => localStorage.getItem(k), RESUME_SLOT);
  const clickText = async (page, text) => {
    const ok = await page.evaluate(t => {
      const b = [...document.querySelectorAll('[data-season-centre] button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
      if (!b) return false;
      b.click();
      return true;
    }, text);
    await page.waitForTimeout(120);
    return ok;
  };
  const shot = async (page, name) => { try { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); } catch { /* a screenshot is never a check */ } };
  /* the walker's pick on this screen: never one of this round's buttons, and none of their labels starts like an action it presses */
  const walk = { n: 0, onNew: [], clash: new Set() };
  async function walkerAt(page, where) {
    const r = await page.evaluate(([actions, skipSrc]) => {
      const skip = new RegExp(skipSrc);
      const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()));
      let pick = null;
      for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
      if (!pick) pick = usable[0] ?? null;
      const fresh = '[data-season-centre] button, [data-season-resume], [data-open-season-replays]';
      const labels = [...document.querySelectorAll(fresh)].map(b => b.textContent.trim());
      return { pick: pick ? pick.textContent.trim().slice(0, 40) : null, onNew: !!pick && pick.matches(fresh), clash: labels.filter(l => actions.some(a => l.startsWith(a))), labels: labels.length };
    }, [WALK_ACTIONS, WALK_SKIP]);
    walk.n += 1;
    if (r.onNew) walk.onNew.push(`${where}: "${r.pick}"`);
    for (const c of r.clash) walk.clash.add(c);
    return r;
  }
  /* floors on whatever the Season Centre is showing: tap targets, text sizes, the header, no sideways scroll */
  const floors = { screens: 0, short: [], small: [], clipped: [], sideways: [], narrow: [], tableText: 0 };
  async function floorsAt(page, where) {
    const r = await page.evaluate(() => {
      const root = document.querySelector('[data-season-centre]');
      const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const short = [...root.querySelectorAll('button')].filter(vis).filter(b => b.getBoundingClientRect().height < 43.5).map(b => `${b.textContent.trim().slice(0, 24)} ${b.getBoundingClientRect().height.toFixed(1)}`);
      const narrow = [...root.querySelectorAll('[role="group"][aria-label="Clock speed"] button')].filter(vis).filter(b => b.getBoundingClientRect().width < 43.5).map(b => `${b.textContent.trim()} ${b.getBoundingClientRect().width.toFixed(1)}`);
      const small = [];
      let tableText = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || !el || !vis(el) || el.closest('[aria-hidden="true"]')) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 11.99) { if (el.closest('[data-rank-shift]')) tableText += 1; else small.push(`${n.textContent.trim().slice(0, 20)} ${px}`); }
      }
      const head = root.querySelector('[data-centre-header]');
      return { short, narrow, small, tableText, clipped: head && vis(head) ? head.scrollWidth > head.clientWidth + 1 : false, sideways: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    floors.screens += 1;
    floors.tableText = Math.max(floors.tableText, r.tableText);
    for (const s of r.short) floors.short.push(`${where}: ${s}`);
    for (const s of r.narrow) floors.narrow.push(`${where}: ${s}`);
    for (const s of r.small) floors.small.push(`${where}: ${s}`);
    if (r.clipped) floors.clipped.push(where);
    if (r.sideways) floors.sideways.push(where);
  }
  const ordinalOf = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
  const watchers = page => page.evaluate(() => {
    window.__shifts = 0;
    new MutationObserver(rs => { for (const r of rs) if (r.oldValue === null && r.target.hasAttribute('data-rank-shifting')) window.__shifts += 1; })
      .observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['data-rank-shifting'] });
    window.__pitchLog = [];
    new MutationObserver(() => {
      const b = document.querySelector('[data-mini-pitch]');
      if (!b) return;
      const e = { goal: b.dataset.pitchGoal || '', phase: b.dataset.pitchPhase, side: b.dataset.pitchSide, top: !!b.querySelector('.cm-live-net--top[data-cm-net="goal"]'), bottom: !!b.querySelector('.cm-live-net--bottom[data-cm-net="goal"]'), yours: document.querySelector('[data-pitch-yours]')?.textContent || '', rings: b.querySelectorAll('[data-pitch-ring]').length };
      const last = window.__pitchLog[window.__pitchLog.length - 1];
      if (!last || last.goal !== e.goal || last.phase !== e.phase) window.__pitchLog.push(e);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-pitch-phase', 'data-pitch-goal'] });
  });
  const shiftsOf = page => page.evaluate(() => window.__shifts);
  /** Matchday `md` is at full time and the table has come to rest. */
  const fullTime = (page, md, limit = 60000) => page.waitForFunction(m => {
    const d = document.querySelector(`[data-matchday="${m}"]`);
    return !!d && !!d.querySelector('[data-full-time]') && !document.querySelector('[data-rank-shifting]');
  }, md, { timeout: limit });
  const tableNow = page => page.evaluate(() => [...document.querySelectorAll('[data-season-centre] [data-rank-shift] [data-club]')].filter(r => r.getBoundingClientRect().height > 0).map(r => r.dataset.club));
  /** Press on to matchday `md` (through its poster when it has one). */
  async function playTo(page, md) {
    await clickText(page, `▶ Matchday ${md}`);
    if (await page.$('[data-poster]')) await clickText(page, `▶ Matchday ${md}`);
  }
  const openLatest = async page => {
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-season-picker]', { timeout: 30000 });
    await page.click(`[data-replay-row="${HUB.last.at}"]`);
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
  };
  /* a phone, at full time: his row and the rows either side of it inside the stage's own box, and the score still on screen, with no scroll by the player */
  const tableInView = page => page.evaluate(mine => {
    const stage = document.querySelector('[data-centre-stage]');
    const card = stage.querySelector('[data-centre-table]');
    if (!card) return null;
    const s = stage.getBoundingClientRect();
    const rows = [...card.querySelectorAll('[data-club]')];
    const at = rows.findIndex(r => r.dataset.club === mine);
    const need = rows.slice(Math.max(0, at - 1), at + 2).map(r => r.getBoundingClientRect());
    const bug = stage.querySelector('[data-score-bug]')?.getBoundingClientRect();
    return {
      ok: at >= 0 && need.every(r => r.top >= s.top - 0.5 && r.bottom <= s.bottom + 0.5),
      over: Math.round(Math.max(...need.map(r => r.bottom)) - s.bottom), scrolled: Math.round(stage.scrollTop), stage: Math.round(s.height),
      score: !!bug && bug.top >= s.top - 0.5 && bug.bottom <= s.bottom + 0.5,
    };
  }, MINE);
  const fixtureNames = page => page.evaluate(() => [...document.querySelectorAll('[data-season-centre] [data-fixture-name]')].filter(n => n.getBoundingClientRect().height > 0).map(n => n.getBoundingClientRect().width));
  const errorsSeen = [];
  const geometry = page => page.evaluate(() => `${window.scrollY}|${document.documentElement.scrollWidth}`);

  try {
    /* ---------- desktop 1280 by 900: the hub, the picker, the bind, the pitch in a real match ---------- */
    const X = await openSite(HUB.save, { width: 1280, height: 900 });
    const page = X.page;
    const save0 = await saved(page);
    const lazyNames = [CENTRE_CHUNK, PITCH_CHUNK, ...SURFACE_CHUNKS];
    check(lazyNames.every(c => !X.js.includes(c)), 'C2. the hub loads neither the Season Centre, the little pitch nor the pitch part');
    check((await page.$('[data-open-season-replays]')) !== null && (await page.$('[data-season-resume]')) === null, 'C3. with no place kept the hub shows Season replays and no Resume chip');
    await walkerAt(page, 'hub');
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-season-picker]', { timeout: 30000 });
    const listed = await page.evaluate(() => [...document.querySelectorAll('[data-picker-list] > li > *')].map(el => (el.hasAttribute('data-replay-row') ? `o${el.getAttribute('data-replay-row')}` : `x${el.getAttribute('data-replay-locked')}`)));
    const wanted = HUB.facts.slice().reverse().map(x => `${x.open ? 'o' : 'x'}${x.at}`);
    check(listed.join() === wanted.join(), `C4. the picker lists exactly the played seasons, newest first, open or locked as node says (${listed.length} rows: ${OPEN_IDS.length} open, ${LOCKED_IDS.length} locked)`);
    await walkerAt(page, 'picker');
    await floorsAt(page, 'picker 1280');
    await shot(page, 'picker-1280');
    await page.click(`[data-replay-locked="${LOCKED_IDS[0]}"]`);
    await page.waitForTimeout(250);
    check((await page.$('[data-kickoff]')) === null && (await page.$('[data-season-picker]')) !== null, 'C4. a locked season is not a way in');
    await page.click(`[data-replay-row="${HUB.last.at}"]`);
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    check((await page.$('[data-kickoff-moments]')) === null && (await page.$('[data-fixture-moment]')) === null, 'C4. opened from the career page the latest season offers no moment');
    check(!X.js.includes(PITCH_CHUNK), 'C2. the kick off card has not asked for the little pitch');
    await walkerAt(page, 'kick off');
    await floorsAt(page, 'kick off 1280');
    await watchers(page);
    const geo0 = await geometry(page);
    const before = X.js.length;
    await clickText(page, '▶ Kick off');
    await page.waitForSelector('[data-mini-pitch]', { timeout: 30000 });
    await clickText(page, 'Results');
    await fullTime(page, 1);
    const sincePress = X.js.slice(before);
    check(X.js.includes(PITCH_CHUNK), 'C2. the little pitch is asked for after ▶ Kick off');
    check(sincePress.every(f => CM_MARKERS.every(m => !(jsText[f] ?? '').includes(m))), `C2. nothing asked for from the press to the first match carries a Club Manager marker (${sincePress.length} files: ${sincePress.join(' ')})`);
    const names = await fixtureNames(page);
    const bind = { wrong: [], slid: 0, advances: 0, moved: [] };
    const upTo = Math.max(10, HUB.goalMd);
    let goalLog = null;
    for (let md = 1; md <= upTo; md += 1) {
      const order = await tableNow(page);
      if (order.join() !== ORDER[md].join()) bind.wrong.push(md);
      const seen = await shiftsOf(page);
      if (md >= 2) { bind.advances += 1; if (seen > bind.last) bind.slid += 1; }
      bind.last = seen;
      if ((await geometry(page)) !== geo0) bind.moved.push(md);
      if (md === 5) await floorsAt(page, 'matchday 1280');
      if (md === upTo) break;
      if (md + 1 === HUB.goalMd) await clickText(page, '1x');
      await playTo(page, md + 1);
      if (md === 5) {
        /* the table in mid air, for the eye: held at 180 ms of 450, then let go */
        await page.waitForSelector('[data-rank-shifting]', { timeout: 3000 }).catch(() => null);
        await page.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 180; } });
        await shot(page, 'table-mid-slide-1280');
        await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
      }
      await fullTime(page, md + 1, md + 1 === HUB.goalMd ? 120000 : 60000);
      if (md + 1 === HUB.goalMd) {
        await page.waitForFunction(() => !document.querySelector('[data-pitch-live]'), null, { timeout: 30000 });
        goalLog = await page.evaluate(() => window.__pitchLog.slice());
        await shot(page, 'matchday-pitch-1280');
        await clickText(page, 'Results');
      }
    }
    check(bind.wrong.length === 0, `C1. after each of the first ${upTo} matchdays the table at rest is node's table (wrong after: ${bind.wrong.join(',') || 'none'})`);
    check(bind.advances >= 9 && bind.slid >= C1_FLOOR, `C1. the table slid on ${bind.slid} of ${bind.advances} advances (floor ${C1_FLOOR})`);
    check(bind.moved.length === 0, `C1. the page neither scrolled nor changed width across ${upTo} matchdays (moved at: ${bind.moved.join(',') || 'none'})`);
    check(names.length === M && Math.min(...names) >= 72, `C6. every opponent's name in the desktop fixtures keeps at least 72 px (narrowest ${Math.min(...names).toFixed(1)} of ${names.length})`);
    /* the real match: his goal lands in the top net with the ring and the words, the goal against in the bottom net */
    const G = D.games[HUB.goalMd - 1];
    const keys = { us: 0, them: 0 };
    const expectGoals = G.events.filter(e => e.kind === 'goal').map(e => ({ min: e.min, side: e.side, mine: !!e.mine, key: null }));
    { const n = new Map(); for (const g of expectGoals) { const at = `${g.min}|${g.side}`; const c = n.get(at) ?? 0; n.set(at, c + 1); g.key = `${HUB.goalMd}|${at}|${c}`; keys[g.side] += 1; } }
    const landedAs = g => (goalLog ?? []).find(e => e.goal === g.key && e.phase === 'net');
    const badGoals = expectGoals.filter(g => { const e = landedAs(g); return !e || e.side !== g.side || e.top !== (g.side === 'us') || e.bottom !== (g.side === 'them') || (g.mine ? e.yours !== '⚽ Yours' || e.rings !== 1 : e.yours === '⚽ Yours'); });
    const played = (goalLog ?? []).filter(e => e.phase === 'plant' || e.phase === 'flight').length;
    check(keys.us >= 1 && keys.them >= 1 && badGoals.length === 0, `C2. matchday ${HUB.goalMd} at 1x: each of its ${expectGoals.length} goals reached the right net, his with the ring and the words (${badGoals.length} did not: ${badGoals.map(g => g.key).join(' ')})`);
    check(played >= 2, `C2. goals were played, not just drawn landed (${played} plant and flight frames logged)`);
    await page.click('[data-centre-exit]');
    await page.waitForSelector('[data-season-resume]', { timeout: 30000 });
    const chipText = await page.evaluate(() => document.querySelector('[data-season-resume]').textContent.trim());
    check(chipText === `📺 Resume ${LABEL}, matchday ${upTo + 1}`, `C3. closing after matchday ${upTo} leaves the chip "${chipText}"`);
    await shot(page, 'hub-chip-1280');
    check((await saved(page)) === save0, 'C7. the save is byte for byte what it was after a desktop watch');
    errorsSeen.push(...X.errors);
    await X.ctx.close();

    /* ---------- phones: resume, replays, the floors, the table in view ---------- */
    const view = { n: 0, out: [], scrolled: {} };
    for (const [vw, vh] of [[390, 844], [320, 700]]) {
      const P = await openSite(HUB.save, { width: vw, height: vh });
      const p = P.page;
      const tag = `${vw}`;
      const saveP = await saved(p);
      const pageLong = await p.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 200);
      await p.click('[data-open-season-replays]');
      await p.waitForSelector('[data-season-picker]', { timeout: 30000 });
      await floorsAt(p, `picker ${tag}`);
      await walkerAt(p, `picker ${tag}`);
      if (vw === 390) await shot(p, 'picker-390');
      /* the list scrolls inside its tile; the page behind does not, over the list or over the tile's title */
      const scroll = await (async () => {
        const y0 = await p.evaluate(() => window.scrollY);
        const box = await p.evaluate(() => { const l = document.querySelector('[data-picker-list]').getBoundingClientRect(); const d = document.querySelector('[data-season-picker] [role="dialog"]').getBoundingClientRect(); return { lx: l.left + l.width / 2, ly: l.top + l.height / 2, tx: d.left + d.width / 2, ty: d.top + 14, can: document.querySelector('[data-picker-list]').scrollHeight > document.querySelector('[data-picker-list]').clientHeight + 4 }; });
        await p.mouse.move(box.lx, box.ly);
        await p.mouse.wheel(0, 3000);
        await p.waitForTimeout(250);
        const listTop = await p.evaluate(() => document.querySelector('[data-picker-list]').scrollTop);
        await p.mouse.move(box.tx, box.ty);
        await p.mouse.wheel(0, 3000);
        await p.waitForTimeout(250);
        return { can: box.can, listTop, moved: (await p.evaluate(() => window.scrollY)) - y0 };
      })();
      check(pageLong && scroll.can && scroll.listTop > 0 && scroll.moved === 0, `C4. ${tag}: the picker's list scrolls inside its tile (${scroll.listTop} px) and the page behind does not (${scroll.moved} px)`);
      /* the oldest season that replays opens to watch, with no moments */
      const oldest = OPEN_IDS[OPEN_IDS.length - 1];
      await p.evaluate(id => document.querySelector(`[data-replay-row="${id}"]`).click(), oldest);
      const oldOpen = await Promise.race([p.waitForSelector('[data-kickoff]', { timeout: 30000 }).then(() => 'centre'), p.waitForSelector('[data-centre-tile]', { timeout: 30000 }).then(() => 'tile')]).catch(() => 'nothing');
      const exitWord = await p.evaluate(() => document.querySelector('[data-centre-exit]')?.textContent.trim() ?? document.querySelector('[data-centre-tile] button:last-child')?.textContent.trim() ?? '');
      check(oldOpen !== 'nothing' && exitWord === 'Back to your career' && (await p.$('[data-fixture-moment]')) === null && (await p.$('[data-kickoff-moments]')) === null, `C4. ${tag}: the oldest season that replays opens to watch only (${oldOpen}, "${exitWord}")`);
      await p.evaluate(() => (document.querySelector('[data-centre-exit]') ?? document.querySelector('[data-centre-tile] button:last-child')).click());
      await p.waitForSelector('[data-season-centre]', { state: 'detached', timeout: 30000 });

      /* watch three matchdays of the latest season, then leave */
      await openLatest(p);
      await floorsAt(p, `kick off ${tag}`);
      await watchers(p);
      await clickText(p, '▶ Kick off');
      await p.waitForSelector('[data-mini-pitch]', { timeout: 30000 });
      await clickText(p, 'Results');
      for (let md = 1; md <= 3; md += 1) {
        await fullTime(p, md);
        await p.waitForTimeout(80);
        const v = await tableInView(p);
        view.n += 1;
        view.scrolled[tag] = Math.max(view.scrolled[tag] ?? 0, v ? v.scrolled : 0);
        if (!v || !v.ok) view.out.push(`${tag} matchday ${md}: ${v ? `his row or a neighbour is ${v.over} px under a ${v.stage} px stage` : 'no table'}`);
        else if (!v.score) view.out.push(`${tag} matchday ${md}: the score left the screen`);
        if (md === 3) await shot(p, `matchday-full-time-${tag}`);
        const order = await tableNow(p);
        if (order.join() !== compactOf(md).join()) view.out.push(`${tag} matchday ${md}: the compact table is not node's`);
        if (md === 1) await floorsAt(p, `matchday ${tag}`);
        if (md < 3) await playTo(p, md + 1);
      }
      await p.click('[data-centre-fixtures]');
      const names = await fixtureNames(p);
      check(names.length === M && Math.min(...names) >= 72, `C6. ${tag}: every opponent's name in the phone fixtures keeps at least 72 px (narrowest ${Math.min(...names).toFixed(1)} of ${names.length})`);
      await floorsAt(p, `fixtures ${tag}`);
      await clickText(p, '← Back');
      await p.click('[data-centre-exit]');
      await p.waitForSelector('[data-season-resume]', { timeout: 30000 });
      const chip = await p.evaluate(() => { const b = document.querySelector('[data-season-resume]'); return { text: b.textContent.trim(), h: b.getBoundingClientRect().height }; });
      const rec = JSON.parse((await stored(p)) ?? 'null');
      check(chip.text === `📺 Resume ${LABEL}, matchday 4` && chip.h >= 43.5, `C3. ${tag}: three matchdays watched leave the chip "${chip.text}", ${chip.h.toFixed(0)} px tall`);
      check(!!rec && rec.key === SEASON_KEY && rec.year === HUB.last.row.year && rec.md === 3 && rec.speed === 'results' && rec.stable === false && Object.keys(rec).length === 5, `C3. ${tag}: the record kept is this season's key, the year, 3 matchdays, the speed and not stable (${JSON.stringify(rec).slice(0, 120)})`);
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForSelector('[data-open-season-ratings]', { timeout: 60000 });
      const again = await p.waitForSelector('[data-season-resume]', { timeout: 30000 }).then(() => true).catch(() => false);
      check(again, `C3. ${tag}: the chip is still there after a reload`);
      await walkerAt(p, `hub with the chip ${tag}`);
      if (vw === 390) { await p.evaluate(() => document.querySelector('[data-season-resume]').scrollIntoView({ block: 'center' })); await shot(p, 'hub-chip-390'); }
      const hubWide = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      check(hubWide, `C6. ${tag}: the hub with the chip and three small buttons does not scroll sideways`);
      await p.click('[data-season-resume]');
      await p.waitForSelector('[data-kickoff-resumed]', { timeout: 30000 });
      await watchers(p);
      const card = await p.evaluate(() => ({ line: document.querySelector('[data-kickoff-resumed]').textContent.trim(), go: [...document.querySelectorAll('[data-kickoff] button')].map(b => b.textContent.trim()) }));
      const place = ORDER[3].indexOf(MINE) + 1;
      check(card.line === `3 of ${M} played · you are ${ordinalOf(place)}` && card.go[0] === '▶ Matchday 4' && card.go.includes('↺ From the start'), `C3. ${tag}: the Centre opens where he stopped ("${card.line}", ${card.go.join(' | ')})`);
      await p.waitForTimeout(300);
      const still = (await tableNow(p)).join() === compactOf(3).join() && (await shiftsOf(p)) === 0 && (await p.$('[data-rank-shifting]')) === null;
      check(still, `C3. ${tag}: the resumed table is node's table after matchday 3, and nothing in it moved`);
      await walkerAt(p, `resumed kick off ${tag}`);
      await floorsAt(p, `resumed kick off ${tag}`);
      if (vw === 390) await shot(p, 'resumed-kick-off-390');
      /* on to a poster, then the review */
      await clickText(p, '▶ Matchday 4');
      if (await p.$('[data-poster]')) { await floorsAt(p, `poster ${tag}`); await clickText(p, '▶ Matchday 4'); }
      await fullTime(p, 4);
      if (await clickText(p, '⏩ To the next big game')) { if (await p.$('[data-poster]')) await floorsAt(p, `poster ${tag}`); }
      await clickText(p, '⏭ Sim the rest');
      await p.waitForSelector('[data-review]', { timeout: 30000 });
      await p.waitForTimeout(400);
      await floorsAt(p, `review ${tag}`);
      const strip = await p.evaluate(() => ({ bars: document.querySelectorAll('[data-review-form] [data-form-bar]').length, h: document.querySelector('[data-review-form]')?.getBoundingClientRect().height ?? 0 }));
      check(strip.bars === M && Math.abs(strip.h - 56) < 1, `C6. ${tag}: the review's strip has a bar for each of the ${M} league games in a strip 56 px tall (${strip.bars}, ${strip.h})`);
      if (vw === 390) { await p.waitForTimeout(2500); await shot(p, 'review-390'); await p.evaluate(() => document.querySelector('[data-review-form]').scrollIntoView({ block: 'center' })); await shot(p, 'review-strip-390'); }
      check((await stored(p)) === null, `C3. ${tag}: reaching the review clears the kept place`);
      await p.click('[data-centre-exit]');
      await p.waitForSelector('[data-season-centre]', { state: 'detached', timeout: 30000 });
      await p.waitForTimeout(300);
      check((await p.$('[data-season-resume]')) === null, `C3. ${tag}: and the chip is gone`);
      check((await saved(p)) === saveP, `C7. ${tag}: the save is byte for byte what it was after a replay, a resume and a review`);

      if (vw === 390) {
        /* records that are not this season's: a changed key, text that is not JSON; then a save whose league year moved on */
        const good = { key: SEASON_KEY, year: HUB.last.row.year, md: 3, speed: 1, stable: false };
        const noChip = async (value, why) => {
          await p.evaluate(([k, v]) => localStorage.setItem(k, v), [RESUME_SLOT, value]);
          await p.reload({ waitUntil: 'domcontentloaded' });
          await p.waitForSelector('[data-open-season-ratings]', { timeout: 60000 });
          await p.waitForTimeout(1200);
          return (await p.$('[data-season-resume]')) === null ? null : why;
        };
        const shown = [await noChip(JSON.stringify({ ...good, key: `${SEASON_KEY}x` }), 'a changed key'), await noChip('{not json', 'text that is not JSON'), await noChip(JSON.stringify({ ...good, md: 0 }), 'matchday 0')].filter(Boolean);
        const control = await noChip(JSON.stringify(good), null);
        check(shown.length === 0 && control === null && (await p.$('[data-season-resume]')) !== null, `C3. a record that is not this season's shows no chip (${shown.join(', ') || 'none did'}), and the true record does`);
        const moved = JSON.parse(HUB.save);
        moved.phone.world.year += 1;
        await p.evaluate(v => localStorage.setItem('soccerCareerSave', v), JSON.stringify(moved));
        const gone = await noChip(JSON.stringify(good), 'the league year moved on');
        await p.click('[data-open-season-replays]');
        await p.waitForSelector('[data-season-picker]', { timeout: 30000 });
        const locked = (await p.$(`[data-replay-locked="${HUB.last.at}"]`)) !== null && (await p.$(`[data-replay-row="${HUB.last.at}"]`)) === null;
        check(gone === null && locked, 'C3. once the save\'s league year has moved on, a table season he did not win shows no chip and is locked in the list');
      }
      errorsSeen.push(...P.errors);
      await P.ctx.close();
    }
    for (const o of view.out.slice(0, 6)) console.log(`   C1: ${o}`);
    check(view.n === 6 && view.out.length === 0, `C1. on a phone the compact table is node's, his row and the rows either side are inside the stage at every full time with no scroll by the player, and the score is still on screen (${view.out.length} of ${view.n} were not; the stage moved itself by up to ${JSON.stringify(view.scrolled)} px)`);

    /* ---------- reduced motion: nothing slides, every goal is drawn landed ---------- */
    const R = await openSite(HUB.save, { width: 1280, height: 900, reduced: true });
    await openLatest(R.page);
    await watchers(R.page);
    await clickText(R.page, '▶ Kick off');
    const stillPitch = { landed: 0, moving: 0 };
    for (let md = 1; md <= Math.max(6, HUB.goalMd); md += 1) {
      await fullTime(R.page, md);
      const now = await R.page.evaluate(() => { const b = document.querySelector('[data-mini-pitch]'); return b ? { phase: b.dataset.pitchPhase, live: b.hasAttribute('data-pitch-live') } : null; });
      if (now && now.phase === 'net' && !now.live) stillPitch.landed += 1;
      if (now && (now.live || now.phase === 'plant' || now.phase === 'flight')) stillPitch.moving += 1;
      if (md < Math.max(6, HUB.goalMd)) await playTo(R.page, md + 1);
    }
    await R.page.waitForTimeout(300);
    const quietLog = await R.page.evaluate(() => ({ shifts: window.__shifts, moving: window.__pitchLog.filter(e => e.phase === 'plant' || e.phase === 'flight').length }));
    quietLog.moving += stillPitch.moving;
    quietLog.landed = stillPitch.landed;
    check(quietLog.shifts === 0 && quietLog.moving === 0 && quietLog.landed >= 1, `C1. under reduced motion the table never slides (${quietLog.shifts}) and every goal is drawn landed (${quietLog.landed} landed, ${quietLog.moving} played)`);
    errorsSeen.push(...R.errors);
    await R.ctx.close();

    for (const s of [...floors.short, ...floors.narrow, ...floors.small, ...floors.clipped.map(c => `${c}: header clipped`), ...floors.sideways.map(c => `${c}: sideways scroll`)].slice(0, 10)) console.log(`   C6: ${s}`);
    check(floors.screens >= 14 && floors.short.length === 0 && floors.narrow.length === 0, `C6. every button of the Season Centre is at least 44 px tall and every speed button 44 px wide, on ${floors.screens} screens (${floors.short.length} short, ${floors.narrow.length} narrow)`);
    check(floors.small.length === 0, `C6. no text of the Season Centre is under 12 px outside the table card (${floors.small.length}; inside the table card, which is not this round's: ${floors.tableText})`);
    check(floors.clipped.length === 0 && floors.sideways.length === 0, `C6. the header's club and season are never clipped and nothing scrolls sideways (${floors.clipped.length}, ${floors.sideways.length})`);
    for (const w of walk.onNew.slice(0, 4)) console.log(`   C5: ${w}`);
    check(walk.n >= 8 && walk.onNew.length === 0 && walk.clash.size === 0, `C5. on ${walk.n} screens the career walker never presses one of this round's buttons, and none of their labels starts like an action it presses (${walk.onNew.length} picks, ${[...walk.clash].join(' | ') || 'no clash'})`);
    check(errorsSeen.length === 0, `C. no page error on any screen (${errorsSeen.slice(0, 2).join(' | ') || 'none'})`);
  } finally {
    try { server.kill(); } catch { /* gone */ }
  }
}

await browser.close();
console.log(`playSeasonCentreMotion: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}${ONLY.length ? ` (only ${ONLY.join(',')})` : ''}`);
process.exit(failed ? 1 : 0);
