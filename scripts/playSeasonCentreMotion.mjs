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
 * Needs dist built (the stylesheet) and Chromium. Scope with ONLY=B1,B3.
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
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';

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
if (CONTROL && !CONTROLS[CONTROL]) throw new Error(`unknown SEASON_MOTION_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: rewritten in the bundled source, never a file on disk`);

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
if (CONTROL && CONTROLS[CONTROL].file === SHIFT_UI && !applied.has(CONTROL)) throw new Error(`control refused: ${CONTROLS[CONTROL].file} was never loaded into the bundle`);
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
  const netOf = (key, limit = 30000) => `(() => { const b = document.querySelector('[data-mini-pitch]'); return b && b.dataset.pitchGoal === ${JSON.stringify(key)} && b.dataset.pitchPhase === 'net'; })()`;
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
    const kicked = await set({ shown: 67 });
    hold(kicked.yours === '⚽ Yours' && kicked.rings.join() === 'me', `${tag}: his goal does not say Yours with one ring (${kicked.yours})`);
    await page.waitForFunction(() => document.querySelector('[data-mini-pitch]').dataset.pitchPhase !== 'idle', null, { timeout: 30000 });
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

await browser.close();
console.log(`playSeasonCentreMotion: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}${ONLY.length ? ` (only ${ONLY.join(',')})` : ''}`);
process.exit(failed ? 1 : 0);
