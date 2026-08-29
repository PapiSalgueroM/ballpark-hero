/* Round 56 playtest harness for NFL My Career.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 8 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNflCareer.mjs [careers]
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = path.join(os.tmpdir(), 'nfl-engine.mjs');
await build({
  entryPoints: ['src/lib/nflMyCareer.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
const eng = await import(pathToFileURL(OUT).href);
const {
  ARCHETYPES, startCareer, simSeason, progress, drawEvent, shouldRetire,
  legacyOf, careerTotals, rollTeamQuality, marketSalary,
  NFL_SPEND_ITEMS, buyNflItem,
} = eng;

const CAREERS = Number(process.argv[2] || 80);
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0;
const peaks = [];

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = ARCHETYPES[pos][i % ARCHETYPES[pos].length];
    let c = startCareer(`Sim ${i}`, pos, arch, Math.random, null);
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
        tq = rollTeamQuality(tq, Math.random);
        const { line } = simSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.passYds, line.rushYds, line.rec, line.tackles, line.sacks, line.picks, line.fgMade]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
      }

      progress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      // draw and resolve an offseason event
      const ev = drawEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NFL_SPEND_ITEMS) {
          const res = buyNflItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (shouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = careerTotals(c);
    const legacy = legacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(marketSalary(c))) nanHits++;
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

console.log('\n=== ROUND 56 NFL MY CAREER PLAYTEST ===');
console.log(`careers            : ${CAREERS}`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeB_')).length}/45`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('corr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NFL_SPEND_ITEMS.length}`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.passYds) bits.push(`${best.passYds} pass yds, ${best.passTd} TD, ${best.ints} INT`);
  if (best.rushYds) bits.push(`${best.rushYds} rush yds, ${best.rushTd} TD`);
  if (best.rec) bits.push(`${best.rec} rec, ${best.recYds} yds`);
  if (best.tackles) bits.push(`${best.tackles} tkl`);
  if (best.sacks) bits.push(`${best.sacks} sacks`);
  if (best.picks) bits.push(`${best.picks} INT`);
  if (best.passDef) bits.push(`${best.passDef} PD`);
  if (best.fgMade) bits.push(`${best.fgMade}/${best.fgAtt} FG, long ${best.longFg}`);
  console.log(`  ${p.padEnd(5)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NFL_SPEND_ITEMS.length) fails.push(`${NFL_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable');
process.exit(fails.length ? 1 : 0);
