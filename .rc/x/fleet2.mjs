/* Round 1301 (runner only, never committed): (a) how far the fleet's pooled share moves when every career total is
   lifted by a factor (the size of the statsup control), (b) a career's awards on two trees, seed by seed.
   usage: node fleet2.mjs <head rows dir> <sport> <repo root> [<base rows dir>] */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const [DIR, SPORT, ROOT, BASE] = process.argv.slice(2);
const POSITIONS = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], nhl: ['C', 'LW', 'RW', 'D', 'G'],
};
const NHL3 = { C: { goals: [954, 1130], assists: [1010, 1160], points: [1860, 2130] }, LW: { goals: [891, 1080], assists: [959, 1120], points: [1770, 2040] }, RW: { goals: [858, 991], assists: [956, 1070], points: [1800, 2040] }, D: { assists: [1120, 1260], points: [1460, 1640] }, G: { wins: [720, 792] } };
const ledger = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8')).sports[SPORT];
const anchors = (JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallAnchors.json'), 'utf8')).decisions ?? []).filter(d => d.sport === SPORT);
const dropped = (pos, f) => anchors.some(d => d.pos === pos && d.kind === 'standout' && d.stat === f && d.action === 'dropped');
const cells = SPORT === 'nhl'
  ? Object.entries(NHL3).flatMap(([pos, fams]) => Object.entries(fams).map(([f, [from, to]]) => ({ pos, f, from, to })))
  : POSITIONS[SPORT].flatMap(pos => (ledger.standouts[pos] ?? []).filter(f => !dropped(pos, f)).map(f => ({ pos, f, from: ledger.positions[pos].families[f].from, to: ledger.positions[pos].families[f].to })));
const seedsOf = dir => readdirSync(dir).filter(n => n.startsWith(`rows-${SPORT}-`)).map(n => n.slice(`rows-${SPORT}-`.length, -'.json'.length)).sort((a, b) => Number(a) - Number(b));
const load = (dir, seed) => JSON.parse(readFileSync(path.join(dir, `rows-${SPORT}-${seed}.json`), 'utf8'));
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

// (a) The check fleet (seeds 6 to 29) with every total times k.
const seeds = seedsOf(DIR);
const check = seeds.filter(s => Number(s) >= 6 && Number(s) <= 29);
const runs = Object.fromEntries(check.map(s => [s, load(DIR, s)]));
const FACTORS = [1, 1.01, 1.02, 84 / 82, 1.03, 1.04, 1.05, 1.06];
const line = FACTORS.map(k => {
  let a = 0, b = 0, n = 0;
  for (const s of check) for (const c of cells) {
    const mine = runs[s].filter(r => r.pos === c.pos);
    a += mine.filter(r => (r.t[c.f] ?? 0) * k >= c.from).length; b += mine.filter(r => (r.t[c.f] ?? 0) * k >= c.to).length; n += mine.length;
  }
  return `x${k.toFixed(4)} from ${(100 * a / n).toFixed(2)} to ${(100 * b / n).toFixed(2)}`;
});
console.log(`${SPORT} statsup, the check fleet (${check.length} seeds ${check[0]} to ${check.at(-1)}, ${cells.length} cells), every total times k: ${line.join(' | ')}`);

// (b) Awards a career, seed by seed, on the head and (when given) on the base.
const awardsOf = dir => {
  const out = {};
  for (const s of seedsOf(dir)) { const rows = load(dir, s); for (const a of Object.keys(rows[0].aw)) (out[a] ??= []).push(mean(rows.map(r => r.aw[a]))); (out.hall1 ??= []).push(100 * rows.filter(r => r.hof1).length / rows.length); (out.seasons ??= []).push(mean(rows.map(r => r.seasons))); }
  return out;
};
const H = awardsOf(DIR);
const B = BASE ? awardsOf(BASE) : null;
for (const a of Object.keys(H)) {
  const h = H[a], seH = sd(h) / Math.sqrt(h.length);
  if (!B) { console.log(`${SPORT} ${a} a career: head ${mean(h).toFixed(4)} (error ${seH.toFixed(4)}, ${h.length} seeds)`); continue; }
  const b = B[a], seB = sd(b) / Math.sqrt(b.length), se = Math.sqrt(seH ** 2 + seB ** 2);
  console.log(`${SPORT} ${a} a career: base ${mean(b).toFixed(4)} (${b.length} seeds), head ${mean(h).toFixed(4)} (${h.length} seeds), head over base ${(mean(h) / mean(b)).toFixed(4)}, gap ${(mean(h) - mean(b)).toFixed(4)} = ${((mean(h) - mean(b)) / se).toFixed(2)} errors`);
}
console.log(`fleet2: ${SPORT} done`);
