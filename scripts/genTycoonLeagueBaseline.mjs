/**
 * Round 582: the pace baseline the league is measured against, captured BEFORE
 * the league replaced win-count promotion (docs/design/round-580-tycoon-merge.md,
 * section 5, "Pace against prestige").
 *
 * The league must not make a new club's first promotion arrive later than its
 * first reachable Sell up. This records both, under the rules that stood before
 * Round 582, for the same greedy floor bot scripts/simTycoonLeague.mjs drives,
 * at the hook's real tick cadence (read out of useStadiumTycoon.ts, the
 * simTycoonClock rule), over ten seeds. The league harness prints its own
 * numbers beside these.
 *
 * Its name does not start with sim, so runAllSims skips it. It refuses to
 * overwrite an existing baseline unless given --force, because rerunning it after
 * the league lands would record the league as its own baseline.
 *   node scripts/genTycoonLeagueBaseline.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scripts/data/tycoonLeagueBaseline.json');
if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} already exists. It is a pre-league record; rerunning it now would not be one.`);
  process.exit(1);
}

const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useStadiumTycoon.ts'), 'utf8');
const acc = hook.match(/if \(acc >= ([0-9.]+)\)/);
if (!acc) { console.error('cannot read the tick threshold out of useStadiumTycoon.ts'); process.exit(1); }
const DT = Number(acc[1]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-baseline-'));
const bundle = path.join(tmp, 'tycoon.mjs');
execSync(`npx --no-install esbuild "${path.join(ROOT, 'src/lib/stadiumTycoon.ts')}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${bundle}" --log-level=error`, { cwd: ROOT, shell: true });
const T = await import('file:///' + bundle.replace(/\\/g, '/'));
fs.rmSync(tmp, { recursive: true, force: true });

const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** simStadiumTycoon's greedy floor bot, at the real cadence: tick every DT,
 *  every two seconds tap six times and buy everything affordable cheapest
 *  first, a full ground preferring seats. */
function firstPromotionAndSellUp(seed, minutes) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  let promotion = null;
  let sellUp = null;
  const ticksPerTwo = Math.round(2 / DT);
  for (let step = 0; step < Math.round((minutes * 60) / DT); step += 1) {
    const r = T.tick(s, DT, roll);
    s = r.state;
    if (promotion === null && r.events.some(e => e.kind === 'promoted')) promotion = (step + 1) * DT / 60;
    if (sellUp === null && T.canPrestige(s)) sellUp = (step + 1) * DT / 60;
    if ((step + 1) % ticksPerTwo === 0) {
      for (let i = 0; i < 6; i += 1) s = T.tap(s);
      for (let guard = 0; guard < 25; guard += 1) {
        const full = T.attendance(s) >= T.capacity(s) - 5;
        const options = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((a, b) =>
          T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
        if (!options.length) break;
        s = T.buy(s, options[0].id);
      }
    }
    if (promotion !== null && sellUp !== null) break;
  }
  return { seed, firstPromotionMin: promotion, firstSellUpMin: sellUp };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const runs = SEEDS.map(seed => firstPromotionAndSellUp(seed, 90));
const commit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
const median = xs => { const v = xs.filter(x => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const record = {
  note: 'Pre-league pace (win-count promotion, Rounds 162 to 581). Greedy floor bot at the hook cadence, 90 simulated minutes per seed. Minutes of watched play.',
  capturedAt: '2026-09-14',
  commit,
  dt: DT,
  medianFirstPromotionMin: median(runs.map(r => r.firstPromotionMin)),
  medianFirstSellUpMin: median(runs.map(r => r.firstSellUpMin)),
  runs,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(record, null, 2) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} at ${commit.slice(0, 8)}, dt ${DT}`);
for (const r of runs) console.log(`   seed ${String(r.seed).padStart(2)}: first promotion ${r.firstPromotionMin?.toFixed(2)} min, first Sell up ${r.firstSellUpMin?.toFixed(2)} min`);
console.log(`   median: promotion ${record.medianFirstPromotionMin?.toFixed(2)} min, Sell up ${record.medianFirstSellUpMin?.toFixed(2)} min`);
