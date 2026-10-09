/* Round 1147 scratch probe (never committed): what an NFL season looks like game by game.
   Run from the repo root: node .rc/x/probe.mjs  (or node .tmp-fx/probe.mjs) */
import os from 'node:os';
import path from 'node:path';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUT = path.join(os.tmpdir(), `probe-nfl-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
    "export { NFL_SEASON, nflClockLabel } from './src/lib/season/nfl.ts';",
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
const per = {}; const samples = []; const margins = {}; const scores = {}; let games = 0; let ties = 0;
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
for (let i = 0; i < 160; i += 1) {
  const pos = POS[i % 8];
  const rng = mulberry32(9000 + i * 31);
  const real = Math.random; Math.random = rng;
  try {
    const c = SB.startCareer(`Probe ${i}`, pos, SB.create.archetypes[pos][i % SB.create.archetypes[pos].length], rng, null, 'now');
    let tq = SB.rollTeamQuality(null, rng); SB.assignRole(c, tq, rng);
    for (let y = 0; y < 14 && !c.retired; y += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); continue; }
      if (c.contractYears <= 0) { const fa = SB.buildFaWindow(c, tq, rng); const o = fa.offers.find(x => !x.gone) ?? fa.offers[0]; if (o) { M.applyFaSigning(c, o); SB.campBattle(c, o.quality, rng); tq = o.quality; } }
      SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng);
      const career = JSON.parse(JSON.stringify(c)); const row = career.seasons[career.seasons.length - 1];
      const b = M.buildUsSeason(bind, career, row, SB.teamLabelOf);
      if (b.ok) {
        const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
        if (typeof s !== 'string') {
          const P = per[pos] ??= { g: [], sec: [], ypc: [], odd: 0, n: 0, zero: 0, tdShare: [], long: [], lines: [] };
          for (const g of s.games) {
            games += 1; if (g.us === g.them) ties += 1;
            const m = Math.abs(g.us - g.them); margins[m] = (margins[m] ?? 0) + 1;
            for (const v of [g.us, g.them]) scores[v] = (scores[v] ?? 0) + 1;
            if (!g.played) continue;
            P.n += 1; const L = g.line;
            const head = pos === 'QB' ? L.passYds : pos === 'RB' ? L.rushYds : pos === 'WR' || pos === 'TE' ? L.recYds : pos === 'K' ? L.fgMade : L.tackles;
            P.g.push(head ?? 0); if ((head ?? 0) === 0) P.zero += 1;
            if (pos === 'WR' || pos === 'TE' || pos === 'RB') { if (L.rec > 0) P.ypc.push(L.recYds / L.rec); P.sec.push(L.rec); }
            if (pos === 'QB') { P.sec.push(L.passTd); if (L.passTd > 0 && L.passYds < 25 * L.passTd) P.odd += 1; P.tdShare.push((7 * L.passTd) / Math.max(1, g.us)); }
            if (pos === 'RB' && L.rushTd > 0 && L.rushYds < 3 * L.rushTd) P.odd += 1;
            if (pos === 'K' && L.longFg !== undefined) P.long.push(L.longFg);
            if (pos === 'LB' || pos === 'EDGE') P.sec.push(L.sacks ?? 0);
          }
          if (samples.length < 4 && row.games === 17 && (pos === 'QB' || pos === 'K' || pos === 'EDGE' || pos === 'WR') && !samples.some(x => x.pos === pos)) samples.push({ pos, s, b, row });
        } else console.log(`REFUSED ${pos} ${row.year}: ${s}`);
      }
      if (SB.shouldRetire(c)) break;
      const ev = SB.drawEvent(c, rng); if (ev && ev.options.length) ev.options[0].apply(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
}
console.log(`games ${games}, ties ${ties}`);
console.log(`margins (points: share): ${[1, 2, 3, 4, 5, 6, 7, 8, 10, 14].map(m => `${m}: ${(100 * (margins[m] ?? 0) / games).toFixed(1)}%`).join(', ')}`);
console.log(`most common scores: ${Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([v, n]) => `${v} (${(100 * n / (2 * games)).toFixed(1)}%)`).join(', ')}`);
console.log(`rare scores seen: ${Object.keys(scores).map(Number).filter(v => v < 12).sort((a, b) => a - b).join(', ')}; highest ${Math.max(...Object.keys(scores).map(Number))}`);
for (const pos of POS) {
  const P = per[pos]; if (!P) continue;
  console.log(`${pos}: ${P.n} games; headline min ${Math.min(...P.g)}, p10 ${pct(P.g, 0.1)}, median ${pct(P.g, 0.5)}, p90 ${pct(P.g, 0.9)}, max ${Math.max(...P.g)}; zero in ${(100 * P.zero / P.n).toFixed(1)}%`
    + (P.ypc.length ? `; yards a catch min ${Math.min(...P.ypc).toFixed(1)}, p10 ${pct(P.ypc, 0.1).toFixed(1)}, median ${pct(P.ypc, 0.5).toFixed(1)}, p90 ${pct(P.ypc, 0.9).toFixed(1)}, max ${Math.max(...P.ypc).toFixed(1)}` : '')
    + (P.sec.length ? `; second stat max ${Math.max(...P.sec)}, p90 ${pct(P.sec, 0.9)}` : '')
    + (P.tdShare.length ? `; his TD passes as a share of his team's points: median ${pct(P.tdShare, 0.5).toFixed(2)}, p90 ${pct(P.tdShare, 0.9).toFixed(2)}` : '')
    + (P.long.length ? `; a game's long: min ${Math.min(...P.long)}, median ${pct(P.long, 0.5)}, max ${Math.max(...P.long)}` : '')
    + `; odd games ${P.odd}`);
}
for (const { pos, s, b, row } of samples) {
  console.log(`\n--- a ${pos} season (${row.year} ${row.team}, ${row.teamResult}); record ${s.games.filter(g => g.us > g.them).length}-${s.games.filter(g => g.us < g.them).length}-${s.games.filter(g => g.us === g.them).length}; repairs ${s.repairs}`);
  for (const g of s.games) console.log(`G${g.md} ${g.home ? 'vs' : 'at'} ${b.ctx.order[g.opp] ?? '?'} ${g.us}-${g.them} | ${g.played ? [bind.view.markChip(g, pos), ...bind.view.lineOf(g, pos)].join(' ') : 'DNP'}`);
  const g = s.games[2];
  console.log(`  game 3 feed: ${g.events.map(e => `[${M.nflClockLabel(e.min)}] ${bind.view.eventWords(e, 'US', 'THEM', pos)}`).join(' / ')}`);
  const path = M.usPlayoffPath(bind, row, b.ctx, b.key);
  if (path) console.log(`  playoffs: ${path.steps.map(st => `${st.round}: ${st.won ? 'beat' : 'lost to'} ${st.opp} ${st.score}`).join('; ')} | saved: ${row.poGames} games, ${row.poLine}`);
}
