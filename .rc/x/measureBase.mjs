/* Round 1530 probe (never committed): the single run spread of section 19 (a)'s
   median base credit, per sport and base position, at the default 2000 careers.
   Plays measuring runs of scripts/simCareerHall.mjs (the board skipped, one row
   file each, exactly what a fleet child plays) for the default seed and SIM_SEED
   1 to N-1, then reads each run's median base credit with the ledger's own base
   terms, and the pooled median over the check fleet (seeds 6 to 29).
   Run from the repo root: node .rc/x/measureBase.mjs <sport> [runs, default 48] */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const SPORT = process.argv[2];
const RUNS = Number(process.argv[3] || 48);
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
/* The row files stay out of RC_OUT (about 30 MB a sport); only the summary comes back. */
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), `base-${SPORT}-`));
fs.mkdirSync(DIR, { recursive: true });
const MARKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8'));
let ML = MARKS.sports[SPORT];
for (const [n, c] of Object.entries(MARKS.calibrations ?? {})) if (c.sports?.[SPORT] && Number(n) > 2) ML = c.sports[SPORT];
const BANDS = ML.outcome?.baseCredit ?? {};
if (!Object.keys(BANDS).length) { console.log(`${SPORT}: the ledger bands no base position, nothing to measure`); process.exit(0); }
const seeds = ['base', ...Array.from({ length: RUNS - 1 }, (_, i) => String(i + 1))];
const fileOf = s => path.join(DIR, `rows-${SPORT}-${s}.json`);
const child = s => new Promise(resolve => {
  const tmp = path.join(DIR, `tmp-${s}`);
  fs.mkdirSync(tmp, { recursive: true });
  const env = { ...process.env, SIM_SKIP_BOARD: '1', SIM_DUMP_ROWS: fileOf(s), SIM_FLEET_CHILD: '1', TMPDIR: tmp, TEMP: tmp, TMP: tmp };
  for (const k of ['SIM_CONTROL', 'SIM_CAL', 'SIM_SEED', 'SIM_FLEET_DIR', 'SIM_FLEET_SEEDS']) delete env[k];
  if (s !== 'base') env.SIM_SEED = s;
  const p = spawn(process.execPath, [path.join(ROOT, 'scripts/simCareerHall.mjs'), SPORT, '2000'], { env, cwd: ROOT, stdio: 'ignore' });
  p.on('close', code => resolve(code));
  p.on('error', () => resolve(-1));
});
const t0 = Date.now();
let next = 0;
const codes = {};
await Promise.all(Array.from({ length: 4 }, async () => { while (next < seeds.length) { const s = seeds[next]; next += 1; codes[s] = await child(s); } }));
console.log(`${SPORT}: ${seeds.length} measuring runs in ${Math.round((Date.now() - t0) / 1000)} s; exit codes ${JSON.stringify(Object.entries(codes).reduce((m, [, c]) => ({ ...m, [c]: (m[c] || 0) + 1 }), {}))}`);
const medOf = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const rowsOf = {};
for (const s of seeds) { try { rowsOf[s] = JSON.parse(fs.readFileSync(fileOf(s), 'utf8')); } catch { rowsOf[s] = null; } }
const missing = seeds.filter(s => !rowsOf[s] || rowsOf[s].length !== 2000);
if (missing.length) console.log(`  MISSING OR SHORT ROW FILES: ${missing.join(', ')}`);
const good = seeds.filter(s => !missing.includes(s));
const out = { sport: SPORT, runs: good.length, positions: {} };
for (const [pos, band] of Object.entries(BANDS)) {
  const terms = ML.base[pos].map(t => ({ stat: t.stat, per: t.per }));
  const credit = r => terms.reduce((s, t) => s + (r.t[t.stat] ?? 0) / t.per, 0);
  const per = good.map(s => medOf(rowsOf[s].filter(r => r.pos === pos).map(credit)));
  const n = mean(good.map(s => rowsOf[s].filter(r => r.pos === pos).length));
  const outside = per.filter(m => m < band.lo || m > band.hi).length;
  const fleet = good.filter(s => Number(s) >= 6 && Number(s) <= 29);
  const pooled = ss => medOf(ss.flatMap(s => rowsOf[s].filter(r => r.pos === pos).map(credit)));
  const halves = [good.filter(s => s !== 'base' && Number(s) % 2 === 0), good.filter(s => s !== 'base' && Number(s) % 2 === 1)];
  const ref = good.filter(s => Number(s) >= 30);
  const o = { band: [band.lo, band.hi], n: Math.round(n), mean: +mean(per).toFixed(3), sd: +sd(per).toFixed(3), min: Math.min(...per), max: Math.max(...per), outside, fleetSeeds: fleet.length, pooledFleet: +pooled(fleet).toFixed(3), pooledEven: +pooled(halves[0]).toFixed(3), pooledOdd: +pooled(halves[1]).toFixed(3), pooledAll: +pooled(good).toFixed(3), pooled30up: ref.length ? +pooled(ref).toFixed(3) : null, perRun: per.map(x => +x.toFixed(2)) };
  out.positions[pos] = o;
  console.log(`  ${pos} (about ${o.n} careers a run): single run median mean ${o.mean}, sd ${o.sd}, ${o.min.toFixed(2)} to ${o.max.toFixed(2)} over ${per.length} runs; ${outside} outside the band ${band.lo} to ${band.hi}; pooled median, check fleet 6 to 29 (${fleet.length} seeds) ${o.pooledFleet}, even seeds ${o.pooledEven}, odd seeds ${o.pooledOdd}, seeds 30 up ${o.pooled30up}, all ${o.pooledAll}`);
  console.log(`     per run: ${o.perRun.join(' ')}`);
}
fs.writeFileSync(path.join(OUT, `base-${SPORT}.json`), JSON.stringify(out, null, 1));
console.log(`measureBase ${SPORT}: done`);
