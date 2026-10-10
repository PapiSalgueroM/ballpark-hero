/* Round 1226, fix pass 2: a measuring probe, never committed.
   Reads six row files of scripts/simCareerHall.mjs (SIM_DUMP_ROWS, the default
   seed and SIM_SEED 1 to 5, NHL) and prints, by the rules of
   scripts/genCareerHallMarks.mjs restated here:
     A. the three bands of section 17 (a) measured against the marks the ledger
        HOLDS (calibration 2, unchanged): what "the band derived again" is in full;
     B. the Hall share on 1 and on 2 a run, against the ledger's ceiling;
     C. the marks a NEW calibration would hold on this engine (the pooled 90th
        and 99th percentile), beside calibration 2's.
   usage: node deriveBands.mjs <rows dir> <out json> [repo root] */
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const [DIR, OUT, ROOT = '.'] = process.argv.slice(2);
if (!DIR || !OUT) { console.error('usage: node deriveBands.mjs <rows dir> <out json> [repo root]'); process.exit(2); }
const SPORT = 'nhl';
const POS = ['C', 'LW', 'RW', 'D', 'G'];
const SEEDS = ['base', '1', '2', '3', '4', '5'];
const DEFAULT_N = 2000, RAMP_FLOOR = 1.10;
const LEDGER = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8'));
const DECISIONS = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallAnchors.json'), 'utf8')).decisions ?? [];
const ML = LEDGER.sports[SPORT];
const dropped = (pos, f) => DECISIONS.some(d => d.sport === SPORT && d.pos === pos && d.kind === 'standout' && d.stat === f && d.action === 'dropped');
const cells = POS.flatMap(pos => (ML.standouts[pos] ?? []).filter(f => !dropped(pos, f)).map(f => ({ pos, f, m: ML.positions[pos].families[f] })));

const sig = (x, d) => (x === 0 ? 0 : Number(x.toPrecision(d)));
const sigUp = (x, d) => { if (x === 0) return 0; const unit = 10 ** (Math.floor(Math.log10(Math.abs(x))) - d + 1); return Number((Math.ceil(x / unit - 1e-9) * unit).toPrecision(d)); };
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const widen = (xs, k) => { const lo = Math.min(...xs), hi = Math.max(...xs); return { lo: Math.max(0, Math.round((lo - k * (hi - lo)) * 1e4) / 1e4), hi: Math.round((hi + k * (hi - lo)) * 1e4) / 1e4, measured: xs.map(x => Math.round(x * 1e4) / 1e4) }; };
const pct = (x, d = 2) => (100 * x).toFixed(d);

const all = [], runs = [];
for (const seed of SEEDS) {
  const r = JSON.parse(readFileSync(path.join(DIR, `rows-${SPORT}-${seed}.json`), 'utf8'));
  all.push(...r); runs.push(r.slice(0, DEFAULT_N));
}

/* A. The bands against the marks the ledger holds. */
const was = ML.bands;
const cellShares = [], fromPooled = [], toPooled = [], perRun = [];
runs.forEach((run, i) => {
  let a = 0, b = 0, n = 0; const out = [];
  for (const { pos, f, m } of cells) {
    const mine = run.filter(r => r.pos === pos);
    const over = mine.filter(r => (r.t[f] ?? 0) >= m.from).length;
    const share = over / mine.length;
    cellShares.push(share);
    if (share < was.fromCell.lo || share > was.fromCell.hi) out.push(`${pos} ${f} ${pct(share, 1)}`);
    a += over; b += mine.filter(r => (r.t[f] ?? 0) >= m.to).length; n += mine.length;
  }
  fromPooled.push(a / n); toPooled.push(b / n);
  perRun.push({ seed: SEEDS[i], careers: run.length, fromPooled: a / n, toPooled: b / n, cellsOutOfCommittedBand: out,
    hall1: run.filter(r => r.hof1).length / run.length, hall2: run.filter(r => r.hof2).length / run.length,
    newlyIn: run.filter(r => r.hof2 && !r.hof1).length });
});
const env = widen(cellShares, 0.25);
const bands = { defaultCareers: DEFAULT_N,
  fromCell: { lo: env.lo, hi: env.hi, measuredLo: Math.min(...env.measured), measuredHi: Math.max(...env.measured), cells: cellShares.length },
  fromPooled: widen(fromPooled, 0.5), toPooled: widen(toPooled, 0.5) };
console.log(`A. bands against the ledger's own marks, ${cells.length} cells, six runs of ${DEFAULT_N}:`);
for (const p of perRun) console.log(`   seed ${p.seed}: from ${pct(p.fromPooled)} to ${pct(p.toPooled)}; cells out of the committed ${pct(was.fromCell.lo, 1)} to ${pct(was.fromCell.hi, 1)}: [${p.cellsOutOfCommittedBand.join(', ')}]`);
console.log(`   fromCell   committed ${pct(was.fromCell.lo)} to ${pct(was.fromCell.hi)} (measured ${pct(was.fromCell.measuredLo, 1)} to ${pct(was.fromCell.measuredHi, 1)}) -> derived ${pct(bands.fromCell.lo)} to ${pct(bands.fromCell.hi)} (measured ${pct(bands.fromCell.measuredLo, 1)} to ${pct(bands.fromCell.measuredHi, 1)})`);
console.log(`   fromPooled committed ${pct(was.fromPooled.lo)} to ${pct(was.fromPooled.hi)} -> derived ${pct(bands.fromPooled.lo)} to ${pct(bands.fromPooled.hi)}`);
console.log(`   toPooled   committed ${pct(was.toPooled.lo)} to ${pct(was.toPooled.hi)} -> derived ${pct(bands.toPooled.lo)} to ${pct(bands.toPooled.hi)}`);

/* B. The Hall share. */
const o = ML.outcome;
console.log(`B. Hall share on 1: ${perRun.map(p => pct(p.hall1, 1)).join(' ')} (ledger ${o.hallShare1.map(x => pct(x, 1)).join(' ')})`);
console.log(`   Hall share on 2: ${perRun.map(p => pct(p.hall2, 1)).join(' ')} (ledger ${o.hallShare2.map(x => pct(x, 1)).join(' ')}; ceiling ${pct(o.hallCeiling, 1)})`);
console.log(`   newly in on 2:   ${perRun.map(p => p.newlyIn).join(' ')} (ledger ${o.newlyIn.join(' ')})`);

/* C. The marks a new calibration would hold on this engine. */
const cal3 = [];
console.log(`C. marks on this engine (${all.length} careers pooled) beside calibration 2's:`);
for (const { pos, f, m } of cells) {
  const mine = all.filter(r => r.pos === pos);
  const sorted = mine.map(r => r.t[f] ?? 0).sort((x, y) => x - y);
  const p90 = quantile(sorted, 0.9), p99 = quantile(sorted, 0.99);
  const from = sig(p90, 3), floor = from * RAMP_FLOOR;
  const to = sig(p99, 3) >= floor ? sig(p99, 3) : sigUp(floor, 3);
  const between = mine.filter(r => (r.t[f] ?? 0) >= m.from && (r.t[f] ?? 0) < from).length;
  cal3.push({ pos, stat: f, from2: m.from, to2: m.to, from3: from, to3: to, n: mine.length, overFrom2UnderFrom3: between });
  console.log(`   ${pos} ${f}: from ${m.from} -> ${from} (${(100 * (from / m.from - 1)).toFixed(1)} percent), to ${m.to} -> ${to} (${(100 * (to / m.to - 1)).toFixed(1)} percent); ${between} of ${mine.length} careers are over the old from and under the new`);
}
writeFileSync(OUT, `${JSON.stringify({ sport: SPORT, bands, perRun, cal3 }, null, 1)}\n`);
console.log(`deriveBands: wrote ${OUT}`);
