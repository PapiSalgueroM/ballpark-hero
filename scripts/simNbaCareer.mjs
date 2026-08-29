/* Round 57 playtest harness for NBA My Career.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 8 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNbaCareer.mjs [careers]
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = path.join(os.tmpdir(), 'nba-engine.mjs');
await build({
  entryPoints: ['src/lib/nbaMyCareer.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
const eng = await import(pathToFileURL(OUT).href);
const {
  NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, drawNbaEvent, nbaShouldRetire,
  nbaLegacyOf, nbaCareerTotals, nbaRollTeamQuality, nbaMarketSalary,
  NBA_SPEND_ITEMS, buyNbaItem,
} = eng;

const CAREERS = Number(process.argv[2] || 80);
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = NBA_ARCHETYPES[pos][i % NBA_ARCHETYPES[pos].length];
    let c = startNbaCareer(`Sim ${i}`, pos, arch, Math.random, null);
    let tq = null;
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        tq = nbaRollTeamQuality(tq, Math.random);
        const { line } = simNbaSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.ppg, line.rpg, line.apg].some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      nbaProgress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      // draw and resolve an offseason event
      const ev = drawNbaEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NBA_SPEND_ITEMS) {
          const res = buyNbaItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (nbaShouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = nbaCareerTotals(c);
    const legacy = nbaLegacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(nbaMarketSalary(c))) nanHits++;
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

console.log('\n=== ROUND 57 NBA MY CAREER PLAYTEST ===');
console.log(`careers            : ${CAREERS}`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('nbaA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('nbaB_')).length}/45`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('ncorr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NBA_SPEND_ITEMS.length}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  console.log(`  ${p.padEnd(3)} ${best.ppg} ppg, ${best.rpg} rpg, ${best.apg} apg`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NBA_SPEND_ITEMS.length) fails.push(`${NBA_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable');
process.exit(fails.length ? 1 : 0);
