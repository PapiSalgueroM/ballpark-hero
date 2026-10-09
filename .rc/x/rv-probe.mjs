/* Reviewer probe (never committed): does what the NFL Season Center shows hold together?
   Run from the repo root: node .rc/x/rv-probe.mjs */
import os from 'node:os';
import path from 'node:path';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(os.tmpdir(), `rv-probe-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
    "export { NFL_SEASON, nflDriveCost } from './src/lib/season/nfl.ts';",
    "export { buildUsSeason, usPlayoffPath } from './src/lib/season/us.ts';",
    "export { deriveSeasonOrWhy } from './src/lib/season/core.ts';",
    "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* a copy */ }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SB = M.NFL_CAREER_SPORT; const bind = M.NFL_SEASON;
const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
const N = Number(process.env.RV_CAREERS ?? 480);
const po = { seasons: 0, withPath: 0, noPath: 0, byPos: {}, examples: [] };
const odd = {}; const oddEx = {}; const dist = {};
const bump = (k, ex) => { odd[k] = (odd[k] ?? 0) + 1; if (ex && (oddEx[k] ??= []).length < 3) oddEx[k].push(ex); };
let seasons = 0; let games = 0; let refused = 0; const streaks = {}; const backToBack = { n: 0, of: 0 }; const samples = {}; const records = {}; let tieSeasons = 0;
const view = bind.view;

function playoffCheck(pos, row, b) {
  const p = M.usPlayoffPath(bind, row, b.ctx, b.key);
  if (!bind.results.includes(row.teamResult)) return;
  po.seasons += 1;
  if (!p) { po.noPath += 1; return; }
  po.withPath += 1;
  const us = p.steps.map(s => (s.score ? Number(s.score.split('-')[0]) : null));
  const P = po.byPos[pos] ??= { n: 0, checked: 0, impossible: 0, tight: 0 };
  P.n += 1;
  if (us.some(v => v === null) || typeof row.poLine !== 'string') return;
  const sum = us.reduce((a, v) => a + v, 0);
  let td = null; let fg = null;
  if (pos === 'QB') { const m = /^(\d+) yds, (\d+) TD, (\d+) INT$/.exec(row.poLine); if (m) td = Number(m[2]); }
  if (pos === 'RB') { const m = /^(\d+) rush yds, (\d+) TD$/.exec(row.poLine); if (m) td = Number(m[2]); }
  if (pos === 'K') { const m = /^(\d+) of (\d+) on field goals$/.exec(row.poLine); if (m) fg = Number(m[1]); }
  if (td === null && fg === null) return;
  P.checked += 1;
  let bad = false; let tight = false;
  if (td !== null) { if (sum < 6 * td) bad = true; else if (sum < 7 * td) tight = true; }
  if (fg !== null) {
    let reach = new Set([0]);
    for (const v of us) { const next = new Set(); for (const r of reach) for (let f = 0; f <= 6; f += 1) if (M.nflDriveCost(v, 0, f) !== null) next.add(r + f); reach = next; }
    if (!reach.has(fg)) bad = true;
    let plain = new Set([0]);
    for (const v of us) { const next = new Set(); for (const r of plain) for (let f = 0; f <= 6; f += 1) if (M.nflDriveCost(v, 0, f) === 0) next.add(r + f); plain = next; }
    if (!bad && !plain.has(fg)) tight = true;
  }
  if (bad) { P.impossible += 1; if (po.examples.length < 12) po.examples.push(`${pos} ${row.year} "${row.teamResult}": path ${p.steps.map(s => `${s.round} ${s.won ? 'W' : 'L'} ${s.score}`).join(', ')}; his playoff line "${row.poLine}" in ${row.poGames} game(s)`); }
  else if (tight) P.tight += 1;
}

function seasonCheck(pos, row, s, b) {
  seasons += 1;
  let w = 0; let l = 0; let t = 0; let run = 1; let longest = 1;
  s.games.forEach((g, i) => {
    games += 1;
    if (g.us > g.them) w += 1; else if (g.us < g.them) l += 1; else t += 1;
    if (i > 0) { run = s.games[i - 1].home === g.home ? run + 1 : 1; longest = Math.max(longest, run); backToBack.of += 1; if (s.games[i - 1].opp === g.opp) backToBack.n += 1; }
    if (!g.played) return;
    const L = g.line; const of = k => L[k] ?? 0;
    const where = `${pos} ${row.year} game ${g.md} (${g.us}-${g.them}): ${JSON.stringify(L)}`;
    if (pos === 'QB') {
      if (of('passTd') > 0 && of('passYds') < of('passTd')) bump('QB more touchdown passes than passing yards', where);
      if (of('passYds') === 0) bump('QB zero passing yards in a game he played', where);
      if (of('passTd') > 0 && of('passYds') < 15 * of('passTd')) bump('QB under 15 yards a touchdown pass', where);
      if (of('passYds') < 60 && row.games >= 14) bump('starting QB under 60 yards in a game', where);
      if (of('passYds') > 480) bump('QB over 480 yards', where);
    }
    if (pos === 'RB') {
      if (of('rushTd') > 0 && of('rushYds') < of('rushTd')) bump('RB more rushing touchdowns than yards', where);
      if (of('rushYds') > 250) bump('RB over 250 rushing yards', where);
    }
    if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
      if (of('recYds') > 99 * of('rec')) bump('more than 99 yards a catch', where);
      if (of('rec') > 0 && of('recYds') === 0) bump('catches for zero yards', where);
      if (of('rec') > 0 && of('recYds') / of('rec') > 35) bump('over 35 yards a catch on the day', where);
      if (of('rec') >= 3 && of('recYds') / of('rec') < 3) bump('under 3 yards a catch on 3 or more', where);
      if (of('recTd') > 0 && of('recYds') < of('recTd')) bump('more touchdown catches than receiving yards', where);
      if ((pos === 'WR' || pos === 'TE') && of('rec') === 0 && row.games >= 14) bump('starting pass catcher with no catch (count only)', null);
    }
    if (pos === 'K') {
      if (of('fgAtt') - of('fgMade') > 2) bump('K three misses', where);
      if (of('fgMade') >= 5) bump('K five or more makes (count only)', null);
      if (L.longFg !== undefined && L.longFg > 66) bump('K a long over 66 yards', where);
    }
    /* how his big days are spread: full seasons only (14 or more games) */
    if (row.games >= 14) {
      const D = dist[pos] ??= { n: 0, seasons: new Set(), cut: {} };
      D.n += 1; D.seasons.add(`${b.key}`);
      const cut = (name, yes) => { const c = D.cut[name] ??= { n: 0, seasons: new Set() }; if (yes) { c.n += 1; c.seasons.add(b.key); } };
      if (pos === 'QB') { cut('pass yds >= 400', of('passYds') >= 400); cut('pass yds >= 450', of('passYds') >= 450); cut('pass yds >= 500', of('passYds') >= 500); cut('pass yds == 520 (the cap)', of('passYds') === 520); cut('pass yds < 100', of('passYds') < 100); cut('pass TD >= 5', of('passTd') >= 5); cut('pass TD == 6 (the cap)', of('passTd') === 6); cut('INT >= 4', of('ints') >= 4); }
      if (pos === 'RB') { cut('rush yds >= 200', of('rushYds') >= 200); cut('rush yds >= 250', of('rushYds') >= 250); cut('rush yds == 290 (the cap)', of('rushYds') === 290); cut('rush TD >= 3', of('rushTd') >= 3); cut('rush TD == 4 (the cap)', of('rushTd') === 4); cut('rush yds < 20', of('rushYds') < 20); }
      if (pos === 'WR' || pos === 'TE') { cut('rec yds >= 200', of('recYds') >= 200); cut('rec yds >= 250', of('recYds') >= 250); cut('catches >= 13', of('rec') >= 13); cut('catches == 15 (the cap)', of('rec') === 15); cut('rec TD >= 3', of('recTd') >= 3); cut('no catch', of('rec') === 0); }
      if (pos === 'LB' || pos === 'CB' || pos === 'EDGE') { cut('tackles >= 15', of('tackles') >= 15); cut('tackles == 20 (the cap)', of('tackles') === 20); cut('tackles == 0', of('tackles') === 0); cut('sacks >= 3', of('sacks') >= 3); cut('picks >= 2', of('picks') >= 2); cut('picks == 3', of('picks') === 3); }
      if (pos === 'K') { cut('makes >= 4', of('fgMade') >= 4); cut('makes >= 5', of('fgMade') >= 5); cut('long >= 60', (L.longFg ?? 0) >= 60); cut('two misses', of('fgAtt') - of('fgMade') >= 2); }
    }
    if (of('sacks') > 4) bump('over 4 sacks in a game', where);
    if (of('tackles') >= 18) bump('18 or more tackles (count only)', null);
    const key = `${pos}`;
    if ((samples[key] ??= []).length < 3 && g.md >= 3) samples[key].push(`${view.markChip(g, pos)} | ${view.lineOf(g, pos).join(' / ')} | ${view.markText(g, pos)} | feed: ${g.events.map(e => `[${view.clock.label(e.min)}] ${view.eventWords(e, b.ctx.teamLabel, s.labels[g.opp]?.name ?? '?', pos)}`).join(' ')}`);
  });
  streaks[longest] = (streaks[longest] ?? 0) + 1;
  if (t > 0) tieSeasons += 1;
  const rec = `${row.teamResult}`; (records[rec] ??= []).push(w);
  if (w + l + t !== 17) bump('record does not sum to 17', `${pos} ${row.year}`);
}

for (let i = 0; i < N; i += 1) {
  const pos = POS[i % 8];
  const rng = mulberry32(31000 + i * 37);
  const real = Math.random; Math.random = rng;
  try {
    const c = SB.startCareer(`Probe ${i}`, pos, SB.create.archetypes[pos][i % SB.create.archetypes[pos].length], rng, null, 'now');
    let tq = SB.rollTeamQuality(null, rng); SB.assignRole(c, tq, rng);
    for (let y = 0; y < 16 && !c.retired; y += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); continue; }
      if (c.contractYears <= 0) { const fa = SB.buildFaWindow(c, tq, rng); const o = fa.offers.find(x => !x.gone) ?? fa.offers[0]; if (o) { M.applyFaSigning(c, o); SB.campBattle(c, o.quality, rng); tq = o.quality; } }
      SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng);
      const career = JSON.parse(JSON.stringify(c)); const row = career.seasons[career.seasons.length - 1];
      const b = M.buildUsSeason(bind, career, row, SB.teamLabelOf);
      if (b.ok) {
        const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
        if (typeof s === 'string') { refused += 1; if (refused <= 5) console.log(`REFUSED ${pos} ${row.year}: ${s} | ${JSON.stringify(row).slice(0, 300)}`); }
        else { seasonCheck(pos, row, s, b); playoffCheck(pos, row, b); }
      }
      if (SB.shouldRetire(c)) break;
      const ev = SB.drawEvent(c, rng); if (ev && ev.options.length) ev.options[0].apply(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
}
const pct = (a, b) => `${(100 * a / Math.max(1, b)).toFixed(1)}%`;
console.log(`careers ${N}; open seasons ${seasons}; games ${games}; refused ${refused}; seasons with a tie ${tieSeasons}`);
console.log(`PLAYOFFS: seasons with a playoff result ${po.seasons}; a path ${po.withPath}; no path ${po.noPath}`);
for (const [pos, P] of Object.entries(po.byPos)) console.log(`  ${pos}: paths ${P.n}; line read ${P.checked}; the path's scores CANNOT hold his saved playoff line ${P.impossible} (${pct(P.impossible, P.checked)}); hold it only with odd drives ${P.tight} (${pct(P.tight, P.checked)})`);
for (const e of po.examples) console.log(`  EX ${e}`);
console.log('ODDITIES (games):');
for (const [k, n] of Object.entries(odd).sort((a, b) => b[1] - a[1])) { console.log(`  ${k}: ${n}`); for (const e of oddEx[k] ?? []) console.log(`     ${e.slice(0, 260)}`); }
console.log('HIS BIG DAYS (full seasons, 14 or more games played): share of games, and share of seasons with at least one');
for (const [pos, D] of Object.entries(dist)) for (const [name, c] of Object.entries(D.cut)) console.log(`  ${pos} ${name}: ${c.n} of ${D.n} games (${(100 * c.n / Math.max(1, D.n)).toFixed(2)}%); in ${c.seasons.size} of ${D.seasons.size} seasons (${pct(c.seasons.size, D.seasons.size)})`);
console.log(`longest run of straight home or straight away games in a season: ${Object.entries(streaks).map(([k, n]) => `${k}: ${pct(n, seasons)}`).join(', ')}`);
console.log(`the same opponent in back to back games: ${backToBack.n} of ${backToBack.of} (${pct(backToBack.n, backToBack.of)})`);
for (const [r, ws] of Object.entries(records)) { const a = [...ws].sort((x, y) => x - y); console.log(`  wins for "${r}": min ${a[0]}, median ${a[Math.floor(a.length / 2)]}, max ${a[a.length - 1]} over ${a.length}`); }
console.log('SAMPLES (chip | bits | text | feed):');
for (const [pos, xs] of Object.entries(samples)) for (const x of xs) console.log(`  ${pos}: ${x.slice(0, 900)}`);
console.log('rv-probe: done');
