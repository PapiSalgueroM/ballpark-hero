/* Round 1301 (runner only, never committed): a fleet of measuring seeds read against the standout marks.
   usage: node fleet.mjs <rows dir> <sport> <repo root> <out dir>
   Writes fleet-<sport>.json (per seed and per cell: careers, at or over from, at or over to) and prints the spread. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [DIR, SPORT, ROOT, OUT] = process.argv.slice(2);
const POSITIONS = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], nhl: ['C', 'LW', 'RW', 'D', 'G'],
};
/* The NHL marks the generator derives on Round 1226's engine (runner result r1226-f2-c, files/gen-full-on-head.log). */
const NHL3 = { C: { goals: [954, 1130], assists: [1010, 1160], points: [1860, 2130] }, LW: { goals: [891, 1080], assists: [959, 1120], points: [1770, 2040] }, RW: { goals: [858, 991], assists: [956, 1070], points: [1800, 2040] }, D: { assists: [1120, 1260], points: [1460, 1640] }, G: { wins: [720, 792] } };
const ledger = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8')).sports[SPORT];
const anchors = (JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallAnchors.json'), 'utf8')).decisions ?? []).filter(d => d.sport === SPORT);
const dropped = (pos, f) => anchors.some(d => d.pos === pos && d.kind === 'standout' && d.stat === f && d.action === 'dropped');
const cells2 = POSITIONS[SPORT].flatMap(pos => (ledger.standouts[pos] ?? []).filter(f => !dropped(pos, f)).map(f => ({ pos, f, from: ledger.positions[pos].families[f].from, to: ledger.positions[pos].families[f].to })));
const cells3 = SPORT === 'nhl' ? Object.entries(NHL3).flatMap(([pos, fams]) => Object.entries(fams).map(([f, [from, to]]) => ({ pos, f, from, to }))) : null;
const seeds = readdirSync(DIR).filter(n => n.startsWith(`rows-${SPORT}-`)).map(n => n.slice(`rows-${SPORT}-`.length, -'.json'.length)).sort((a, b) => Number(a) - Number(b));
const count = (cells) => {
  const per = {};
  for (const seed of seeds) {
    const rows = JSON.parse(readFileSync(path.join(DIR, `rows-${SPORT}-${seed}.json`), 'utf8'));
    per[seed] = cells.map(c => { const mine = rows.filter(r => r.pos === c.pos); return [mine.length, mine.filter(r => (r.t[c.f] ?? 0) >= c.from).length, mine.filter(r => (r.t[c.f] ?? 0) >= c.to).length]; });
  }
  return per;
};
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const report = (label, cells, per) => {
  const from = seeds.map(s => 100 * per[s].reduce((t, c) => t + c[1], 0) / per[s].reduce((t, c) => t + c[0], 0));
  const to = seeds.map(s => 100 * per[s].reduce((t, c) => t + c[2], 0) / per[s].reduce((t, c) => t + c[0], 0));
  console.log(`${SPORT} ${label}: ${seeds.length} seeds (${seeds[0]} to ${seeds.at(-1)}), ${cells.length} cells`);
  console.log(`  pooled from: mean ${mean(from).toFixed(3)} sd ${sd(from).toFixed(3)} min ${Math.min(...from).toFixed(2)} max ${Math.max(...from).toFixed(2)}`);
  console.log(`  pooled to:   mean ${mean(to).toFixed(3)} sd ${sd(to).toFixed(3)} min ${Math.min(...to).toFixed(2)} max ${Math.max(...to).toFixed(2)}`);
  console.log(`  from by seed: ${from.map(x => x.toFixed(2)).join(' ')}`);
  const cellLine = cells.map((c, i) => { const xs = seeds.map(s => 100 * per[s][i][1] / per[s][i][0]); return `${c.pos} ${c.f} ${mean(xs).toFixed(1)}(${sd(xs).toFixed(1)})`; });
  console.log(`  cells, fleet mean (seed sd): ${cellLine.join(', ')}`);
};
const per2 = count(cells2);
report('against the calibration 2 marks', cells2, per2);
const out = { sport: SPORT, seeds, cal2: { cells: cells2, per: per2 } };
if (cells3) { const per3 = count(cells3); report('against the marks derived on this engine', cells3, per3); out.cal3 = { cells: cells3, per: per3 }; }
writeFileSync(path.join(OUT, `fleet-${SPORT}.json`), JSON.stringify(out));
console.log(`fleet: wrote fleet-${SPORT}.json`);
