/* Reviewer probe for PR 410: base b20 vs head, lockstep, many clubs and seasons.
   Every play: same seeded Math.random on both engines. Checks whole state, the
   global draw list (values and count), the report (modulo the new shootout field
   and the one pens event line), and every head shootout's invariants.
   Usage: BASE_ROOT=/tmp/b20 node .rc/x/probe410.mjs  (run from the head checkout) */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE_ROOT;
assert.ok(BASE && fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts')), 'BASE_ROOT needed');
const SEASONS = Number(process.env.SEASONS || 2);
const EXTRA = Number(process.env.EXTRA || 12);
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'p410-'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p410b-'));
const realRandom = Math.random, realNow = Date.now;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0, clear: () => {} };

async function engine(root, name) {
  const file = path.join(tmp, name + '.mjs');
  const src = path.join(root, 'src/lib/clubManager.ts');
  buildSync({ stdin: { contents: 'export * from ' + JSON.stringify(src) + ';', resolveDir: root, loader: 'js' },
    bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error',
    nodePaths: [path.join(ROOT, 'node_modules')], alias: { '@': path.join(root, 'src') } });
  return import(pathToFileURL(file).href);
}
const A = await engine(BASE, 'base');
const B = await engine(ROOT, 'head');

function seeded(seed, fn) {
  let a = seed | 0; const h = createHash('sha1'); let n = 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296; h.update(String(v) + ','); n += 1; return v;
  };
  Date.now = () => Date.UTC(2026, 9, 1);
  try { return { value: fn(), draws: n + ':' + h.digest('hex') }; } finally { Math.random = realRandom; Date.now = realNow; }
}
const clone = v => JSON.parse(JSON.stringify(v));
const stats = { plays: 0, stateDiff: 0, drawDiff: 0, reportDiff: 0, pens: 0, pensDetail: 0, pensNoDetail: 0, ordered: 0, orderedSame: 0,
  sudden: 0, maxKicks: 0, bad: 0, ucl2: 0, scores: {}, firstFails: [] };
const fail = (kind, msg) => { if (stats.firstFails.length < 12) stats.firstFails.push(kind + ': ' + msg); };
const STEM_W = '\u{1F945} Nerves of steel. You win the shootout.', STEM_L = '\u{1F945} Heartbreak from the spot: shootout defeat.';

function checkKicks(r, ctx) {
  const d = r.shootout; let mine = 0, theirs = 0, tm = 0, tt = 0, prev = null;
  const over = () => (tm < 5 || tt < 5) ? (mine + (5 - tm) < theirs || theirs + (5 - tt) < mine) : (tm === tt && mine !== theirs);
  try {
    assert.ok(d.kicks.length > 0, 'no kicks');
    for (const k of d.kicks) {
      assert.ok(!over(), 'kick after the end');
      assert.notEqual(k.side, prev, 'sides alternate'); prev = k.side;
      if (k.side === 'me') { tm++; if (k.result === 'scored') mine++; } else { tt++; if (k.result === 'scored') theirs++; }
      assert.equal(k.mine, mine, 'running mine'); assert.equal(k.theirs, theirs, 'running theirs');
      assert.ok(typeof k.taker === 'string' && k.taker.length > 0, 'taker');
    }
    assert.ok(over(), 'no legal finish');
    assert.deepEqual([d.mine, d.theirs], [mine, theirs], 'final equals kicks');
    assert.equal(mine > theirs, r.shootoutWon, 'shown winner equals shootoutWon');
    const ev = r.events.filter(e => e.includes('shootout'));
    assert.ok(ev.some(e => e.endsWith(' ' + d.mine + '-' + d.theirs + '.')), 'event count');
  } catch (e) { stats.bad++; fail('kicks ' + ctx, e.message); }
  stats.maxKicks = Math.max(stats.maxKicks, d.kicks.length);
  if (d.kicks.length > 10) stats.sudden++;
  const key = d.mine + '-' + d.theirs; stats.scores[key] = (stats.scores[key] || 0) + 1;
}
function compareReport(ra, rb, ctx) {
  if (!ra && !rb) return;
  let exp = ra;
  if (rb && rb.shootout && !(ra && ra.shootout)) {
    exp = clone(ra); exp.shootout = rb.shootout;
    const stem = (ra.shootoutWon ?? ra.won) ? STEM_W : STEM_L;
    const i = exp.events.indexOf(stem);
    if (i >= 0) exp.events[i] = stem.slice(0, -1) + ' ' + rb.shootout.mine + '-' + rb.shootout.theirs + '.';
  }
  if (!isDeepStrictEqual(clone(exp), clone(rb))) { stats.reportDiff++; fail('report ' + ctx, 'differs'); }
}
function step(sa, sb, seed, ctx, order) {
  let a = clone(sa), b = clone(sb);
  if (order) { a = A.setShootoutOrder(a, order) || a; b = B.setShootoutOrder(b, order) || b; }
  const oa = seeded(seed, () => A.playNextEntry(a, { skipHalftime: true }));
  const ob = seeded(seed, () => B.playNextEntry(b, { skipHalftime: true }));
  stats.plays++;
  if (oa.draws !== ob.draws) { stats.drawDiff++; fail('draws ' + ctx, oa.draws.slice(0, 20) + ' vs ' + ob.draws.slice(0, 20)); }
  if (JSON.stringify(oa.value.state) !== JSON.stringify(ob.value.state) && !isDeepStrictEqual(oa.value.state, ob.value.state)) { stats.stateDiff++; fail('state ' + ctx, 'differs'); }
  const ra = oa.value.report, rb = ob.value.report;
  if (order && rb && rb.decidedBy === 'pens') { stats.ordered++; if (isDeepStrictEqual(clone(ra), clone(rb))) stats.orderedSame++; else fail('ordered ' + ctx, 'report differs'); }
  else compareReport(ra, rb, ctx);
  if (rb && rb.decidedBy === 'pens') {
    stats.pens++;
    if (rb.tie && rb.tie.leg === 2) stats.ucl2++;
    if (rb.shootout) { stats.pensDetail++; checkKicks(rb, ctx); } else if (!order) { stats.pensNoDetail++; fail('nodetail ' + ctx, 'default shootout without detail'); }
  }
  return { a: oa.value, b: ob.value };
}
const probe = A.startCareer('Real Madrid');
const pool = [...new Set(['Real Madrid', probe.leagueClubs[probe.leagueClubs.length - 1], probe.leagueClubs[10], 'Manchester City', 'Arsenal', 'Bayern Munich'].filter(Boolean))];
const perClub = [];
for (const club of pool) {
  let sa, sb;
  try { sa = seeded(7001, () => A.startCareer(club)).value; sb = seeded(7001, () => B.startCareer(club)).value; } catch (e) { perClub.push(club + ': start failed ' + e.message); continue; }
  if (!isDeepStrictEqual(sa, sb)) { stats.stateDiff++; fail('start ' + club, 'differs'); }
  const before = stats.pens;
  try {
  for (let season = 0; season < SEASONS; season++) {
    for (let guard = 0; guard < 120; guard++) {
      const entry = sa.calendar[sa.week];
      const ko = entry && entry.type !== 'league' && entry.type !== 'window';
      const seed = (club.length * 1000003 + season * 7919 + guard * 31) | 0;
      if (ko) for (let j = 1; j <= EXTRA; j++) step(sa, sb, seed + j * 104729, club + '/s' + season + '/w' + sa.week + '/x' + j, j % 4 === 0 ? sa.squad.slice(0, 11).map(p => p.id) : null);
      const r = step(sa, sb, seed, club + '/s' + season + '/w' + sa.week, null);
      sa = r.a.state; sb = r.b.state;
      if (r.a.kind === 'seasonOver') break;
    }
    const fa = seeded(9001 + season, () => A.startNextSeason(A.finishSeason(sa).state)).value;
    const fb = seeded(9001 + season, () => B.startNextSeason(B.finishSeason(sb).state)).value;
    if (!isDeepStrictEqual(fa, fb)) { stats.stateDiff++; fail('season ' + club, 'differs'); }
    sa = fa; sb = fb;
  }
  } catch (e) { perClub.push(club + ': threw ' + String(e && e.message).slice(0, 160)); stats.bad++; continue; }
  perClub.push(club + ': pens ' + (stats.pens - before));
}
/* Worst case for the 128 try sampler: the most lopsided sides the caps allow, the underdog must win. */
const strong = { takers: Array.from({ length: 11 }, (_, i) => ({ name: 'S' + i, rating: 99 })), keeperRating: 99 };
const weak = { takers: Array.from({ length: 11 }, (_, i) => ({ name: 'W' + i, rating: 30 })), keeperRating: 30 };
const rng = (() => { let a = 12345; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
let wins = 0, ok = 0; const N = 40000;
for (let i = 0; i < N; i++) { const d = B.runShootout({ mine: weak, theirs: strong, myFirst: rng() < 0.5 }, rng); const last = d.kicks[d.kicks.length - 1]; if (d.mine > d.theirs && last.mine === d.mine && last.theirs === d.theirs) ok++; if (d.mine > d.theirs) wins++; }
const p = ok / N;
const result = { pool, perClub, stats, worstCase: { underdogMatchRate: p, exhaustionProb: Math.pow(1 - p, 128) } };
fs.writeFileSync(path.join(OUT, 'probe410.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ perClub, ...stats, scores: undefined }, null, 0));
console.log('scores ' + JSON.stringify(stats.scores));
console.log('worst case underdog match rate ' + p.toFixed(4) + ', exhaustion probability ' + Math.pow(1 - p, 128).toExponential(2));
const red = stats.stateDiff + stats.drawDiff + stats.reportDiff + stats.bad + stats.pensNoDetail + (stats.ordered - stats.orderedSame);
console.log(red ? 'PROBE410 RED ' + red : (stats.pens < 20 ? 'PROBE410 THIN: only ' + stats.pens + ' shootouts' : 'PROBE410 GREEN: ' + stats.plays + ' plays, ' + stats.pens + ' shootouts'));
process.exitCode = red ? 1 : (stats.pens < 20 ? 3 : 0);
