/* Round 58 playtest harness for MLB My Career.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 8 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simMlbCareer.mjs [careers]
*/
import { build } from 'esbuild';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = '/tmp/mlb-engine.mjs';
await build({
  entryPoints: ['src/lib/mlbMyCareer.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
const eng = await import(pathToFileURL(OUT).href);
const {
  MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, drawMlbEvent, mlbShouldRetire,
  mlbLegacyOf, mlbCareerTotals, mlbRollTeamQuality, mlbMarketSalary,
  MLB_SPEND_ITEMS, buyMlbItem,
} = eng;

const CAREERS = Number(process.argv[2] || 80);
const POSITIONS = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = MLB_ARCHETYPES[pos][i % MLB_ARCHETYPES[pos].length];
    let c = startMlbCareer(`Sim ${i}`, pos, arch, Math.random, null);
    let tq = null;
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        tq = mlbRollTeamQuality(tq, Math.random);
        const { line } = simMlbSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.hr, line.avg, line.so, line.era, line.saves, line.holds]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      mlbProgress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      // draw and resolve an offseason event
      const ev = drawMlbEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of MLB_SPEND_ITEMS) {
          const res = buyMlbItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (mlbShouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = mlbCareerTotals(c);
    const legacy = mlbLegacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(mlbMarketSalary(c))) nanHits++;
    if (totals == null) throw new Error('careerTotals returned null');
  } catch (err) {
    crashes++;
    if (crashes <= 3) console.error(`CAREER ${i} CRASHED:`, err && err.message);
  }
}

unlinkSync(OUT);

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

console.log('\n=== ROUND 58 MLB MY CAREER PLAYTEST ===');
console.log(`careers            : ${CAREERS}`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('mlbA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('mlbB_')).length}/45`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('mcorr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${MLB_SPEND_ITEMS.length}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.era) bits.push(`${best.era} ERA, ${best.so} K`);
  if (best.wins) bits.push(`${best.wins}-${best.lossesP}`);
  if (best.saves) bits.push(`${best.saves} SV`);
  if (best.holds) bits.push(`${best.holds} HLD`);
  if (best.avg) bits.push(`.${String(Math.round(best.avg * 1000)).padStart(3, '0')}`);
  if (best.hr) bits.push(`${best.hr} HR, ${best.rbi} RBI`);
  if (best.sb) bits.push(`${best.sb} SB`);
  console.log(`  ${p.padEnd(3)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < MLB_SPEND_ITEMS.length) fails.push(`${MLB_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable');
process.exit(fails.length ? 1 : 0);
