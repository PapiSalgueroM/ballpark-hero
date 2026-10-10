/* Round 1301, step 1 (runner only, never committed): the rise of the NHL share at or over a Hall mark, by cause.
   usage: node cause.mjs <head rows dir> <base rows dir> <mutated head rows dir> <repo root>
   Three trees, the same six measuring seeds: the head (Round 1226's engine), the base (origin/main) and the head
   with the ONE number put back (84 games from 2026-27 read 82 again). */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [HEAD, BASE, MUT, ROOT] = process.argv.slice(2);
const SEEDS = ['base', '1', '2', '3', '4', '5'];
const M = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8')).sports.nhl;
const POS = ['C', 'LW', 'RW', 'D', 'G'];
const cells = POS.flatMap(pos => (M.standouts[pos] ?? []).map(f => ({ pos, f, from: M.positions[pos].families[f].from, to: M.positions[pos].families[f].to })));
const text = (dir, seed) => readFileSync(path.join(dir, `rows-nhl-${seed}.json`), 'utf8');
const load = dir => SEEDS.map(s => JSON.parse(text(dir, s)));
const head = load(HEAD), base = load(BASE), mut = load(MUT);
const pct = x => (100 * x).toFixed(2);
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

// 1. Are the trees the same careers, byte for byte?
let mutSame = 0, headSame = 0;
for (const s of SEEDS) { if (text(MUT, s) === text(BASE, s)) mutSame += 1; if (text(HEAD, s) === text(BASE, s)) headSame += 1; }
console.log(`1. rows equal to the base, byte for byte: the head with 82 put back on ${mutSame} of ${SEEDS.length} seeds; the head itself on ${headSame} of ${SEEDS.length}`);

// 2. The shares at or over the calibration 2 marks, per seed and pooled over the six.
const shares = (run, scale) => {
  let a = 0, b = 0, n = 0;
  for (const c of cells) {
    const k = scale && c.f !== 'wins' ? scale : 1;
    const mine = run.filter(r => r.pos === c.pos);
    a += mine.filter(r => (r.t[c.f] ?? 0) >= c.from * k).length; b += mine.filter(r => (r.t[c.f] ?? 0) >= c.to * k).length; n += mine.length;
  }
  return { from: a / n, to: b / n };
};
const line = (label, runs, scale) => {
  const xs = runs.map(r => shares(r, scale));
  console.log(`   ${label}: from ${xs.map(x => pct(x.from)).join(' ')} mean ${pct(mean(xs.map(x => x.from)))}; to ${xs.map(x => pct(x.to)).join(' ')} mean ${pct(mean(xs.map(x => x.to)))}`);
  return { from: mean(xs.map(x => x.from)), to: mean(xs.map(x => x.to)) };
};
console.log(`2. share of a position's careers at or over a calibration 2 mark, pooled over ${cells.length} cells, percent (seeds ${SEEDS.join(' ')})`);
const sB = line('base (origin/main)        ', base), sM = line('head, 84 read as 82       ', mut), sH = line('head (84 games)           ', head);
const sS = line('head, skater marks x 84/82', head, 84 / 82);
console.log(`   BY CAUSE, points of the from share: 84 game seasons ${(100 * (sH.from - sM.from)).toFixed(2)}; everything else in Round 1226 (short seasons at true length, awards on the full season, the rest) ${(100 * (sM.from - sB.from)).toFixed(2)}; total ${(100 * (sH.from - sB.from)).toFixed(2)}`);
console.log(`   and with the skater marks carried the same 84 over 82 the head reads ${pct(sS.from)} against the base's ${pct(sB.from)}: what is left over is ${(100 * (sS.from - sB.from)).toFixed(2)} points`);

// 3. Counting stats: is a career's total what two more games imply (84 / 82 = ${(84 / 82).toFixed(4)}) and nothing more?
const all = runs => runs.flat();
const H = all(head), B = all(base);
let paired = 0;
for (let i = 0; i < H.length; i += 1) if (B[i] && H[i].pos === B[i].pos && H[i].seasons === B[i].seasons && JSON.stringify(H[i].aw) === JSON.stringify(B[i].aw)) paired += 1;
console.log(`3. careers ${H.length} head, ${B.length} base; the same position, seasons and awards at the same index: ${paired} (${pct(paired / H.length)} percent)`);
const sum = (rows, f) => rows.reduce((s, r) => s + (r.t[f] ?? 0), 0);
const sk = rows => rows.filter(r => r.pos !== 'G'), gk = rows => rows.filter(r => r.pos === 'G');
for (const f of ['games', 'goals', 'assists', 'points']) console.log(`   skaters, ${f}: head over base ${(sum(sk(H), f) / sum(sk(B), f)).toFixed(4)} (mean ${(sum(sk(B), f) / sk(B).length).toFixed(1)} -> ${(sum(sk(H), f) / sk(H).length).toFixed(1)})`);
for (const f of ['games', 'wins']) console.log(`   goalies, ${f}: head over base ${(sum(gk(H), f) / sum(gk(B), f)).toFixed(4)} (mean ${(sum(gk(B), f) / gk(B).length).toFixed(1)} -> ${(sum(gk(H), f) / gk(H).length).toFixed(1)})`);
console.log(`   seasons a career: base ${mean(B.map(r => r.seasons)).toFixed(3)}, head ${mean(H.map(r => r.seasons)).toFixed(3)}`);

// 4. Awards: a career's hardware must not rise with the length of the season.
for (const a of Object.keys(B[0].aw)) console.log(`4. ${a} a career: base ${mean(B.map(r => r.aw[a])).toFixed(4)}, head ${mean(H.map(r => r.aw[a])).toFixed(4)}, head over base ${(mean(H.map(r => r.aw[a])) / mean(B.map(r => r.aw[a]))).toFixed(4)}`);

// 5. The Hall itself.
const hall = (runs, k) => runs.map(r => pct(r.filter(x => x[k]).length / r.length)).join(' ');
console.log(`5. Hall share on calibration 1: base ${hall(base, 'hof1')} | head ${hall(head, 'hof1')}`);
console.log(`   Hall share on calibration 2: base ${hall(base, 'hof2')} | head ${hall(head, 'hof2')}`);
console.log(`   legacy score on 1, mean: base ${mean(B.map(r => r.s1)).toFixed(1)}, head ${mean(H.map(r => r.s1)).toFixed(1)}; on 2: base ${mean(B.map(r => r.s2)).toFixed(1)}, head ${mean(H.map(r => r.s2)).toFixed(1)}`);
const ok = mutSame === SEEDS.length && headSame === 0;
console.log(`cause: ${ok ? 'the whole rise is the 84 game season (the head with the one number put back is the base, byte for byte)' : 'NOT ONE CAUSE: read the lines above'}`);
process.exit(ok ? 0 : 1);
