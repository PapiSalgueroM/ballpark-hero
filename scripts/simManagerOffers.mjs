/**
 * Round 107 harness: are the job offers actually EARNED?
 *
 * His exact note was "if u get fired it dosent mean u get good offers. it
 * depends on many factors on the job offers u get". A feed that always hands
 * you something is the failure mode, and so is a feed that never does. This
 * measures the thing itself:
 *  - a legend who won trophies as a manager gets elite interest
 *  - a journeyman sacked after relegation does NOT, and often gets nothing
 *  - it is genuinely possible to be unemployable
 *  - sitting out kills your options, season by season
 *  - you can never leap up the pyramid from where you fell
 *  - and you CAN work your way back up from the bottom
 * Run: node scripts/simManagerOffers.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/moEntry.mjs';
const BUNDLE = '/tmp/mo.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/managerOffers.ts');
export const mo = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { mo } = await import(BUNDLE);
const { managerStanding, bestTierAvailable, offerCount, generateJobOffers, repFromPlayingCareer } = mo;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* A believable pyramid to draw offers from. */
const CLUBS = [];
const COUNTRIES = ['England', 'Spain', 'Italy', 'Germany', 'France'];
for (const c of COUNTRIES) {
  for (let t = 1; t <= 4; t++) {
    for (let i = 0; i < 5; i++) {
      CLUBS.push({ name: `${c} T${t} Club ${i}`, country: c, tier: t, league: `${c} League`, budget: [180, 70, 25, 8][t - 1] });
    }
  }
}

const base = (over) => ({
  playingRep: 20, seasonsSinceRetired: 2, managerTrophies: 0, promotions: 0,
  relegations: 0, seasonsManaged: 3, lastTier: 3, departure: 'sacked',
  seasonsOut: 0, nationality: 'England', workedIn: ['England'], ...over,
});

const sample = (p, n = 400) => {
  let total = 0, empty = 0, best = 5, tiers = {};
  for (let i = 0; i < n; i++) {
    const offers = generateJobOffers(p, CLUBS, Math.random);
    total += offers.length;
    if (offers.length === 0) empty += 1;
    for (const o of offers) { best = Math.min(best, o.tier); tiers[o.tier] = (tiers[o.tier] ?? 0) + 1; }
  }
  return { avg: total / n, emptyPct: (empty / n) * 100, best: best === 5 ? null : best, tiers };
};

/* ---------- 1. A legend who delivered vs a journeyman who went down ---------- */
console.log('1) The offer feed has to be earned');
{
  const legend = base({
    playingRep: repFromPlayingCareer({ ballonDors: 2, championsLeagues: 3, worldCups: 1, leagueTitles: 6, caps: 120, careerGoals: 300, seasons: 17, peakOverall: 92 }),
    seasonsSinceRetired: 3, managerTrophies: 4, seasonsManaged: 9, lastTier: 1, departure: 'sacked',
  });
  const journeyman = base({ playingRep: 12, seasonsSinceRetired: 9, relegations: 2, seasonsManaged: 5, lastTier: 4, departure: 'relegated' });

  const L = sample(legend), J = sample(journeyman);
  console.log(`   legend  standing ${managerStanding(legend).toFixed(0)}, ceiling tier ${bestTierAvailable(legend)}, ${L.avg.toFixed(2)} offers avg, ${L.emptyPct.toFixed(0)} percent empty, best tier ${L.best}`);
  console.log(`   grinder standing ${managerStanding(journeyman).toFixed(0)}, ceiling tier ${bestTierAvailable(journeyman)}, ${J.avg.toFixed(2)} offers avg, ${J.emptyPct.toFixed(0)} percent empty, best tier ${J.best}`);
  if (L.avg <= J.avg) fail('a decorated manager gets no more interest than a relegated journeyman');
  if ((L.best ?? 9) >= (J.best ?? 9)) fail('the legend cannot reach a better class of club than the journeyman');
  if (L.emptyPct > 20) fail(`an elite manager was left with nothing ${L.emptyPct.toFixed(0)} percent of the time`);
  if (J.emptyPct < 15) fail('a relegated journeyman almost always gets an offer, so the sack costs nothing');
}

/* ---------- 2. It is possible to be unemployable ---------- */
console.log('2) You can end up with nothing');
{
  const finished = base({ playingRep: 4, seasonsSinceRetired: 14, relegations: 4, seasonsManaged: 6, lastTier: 4, departure: 'relegated', seasonsOut: 4 });
  const s = sample(finished);
  console.log(`   burned out: standing ${managerStanding(finished).toFixed(0)}, ceiling ${bestTierAvailable(finished)}, ${s.emptyPct.toFixed(0)} percent of windows had zero offers`);
  if (s.emptyPct < 70) fail('a manager with nothing left still finds work most of the time');
}

/* ---------- 3. Sitting out kills you, season by season ---------- */
console.log('3) Time out of the game costs you');
{
  const rows = [0, 1, 2, 3].map(out => {
    const p = base({ playingRep: 55, managerTrophies: 1, seasonsManaged: 7, lastTier: 2, departure: 'sacked', seasonsOut: out });
    const s = sample(p);
    return { out, standing: managerStanding(p), avg: s.avg, empty: s.emptyPct };
  });
  for (const r of rows) console.log(`   ${r.out} seasons out: standing ${r.standing.toFixed(0)}, ${r.avg.toFixed(2)} offers, ${r.empty.toFixed(0)} percent empty`);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].standing >= rows[i - 1].standing) fail(`sitting out ${rows[i].out} seasons did not cost more than ${rows[i - 1].out}`);
    // Offer counts are a small-sample roll, so allow a little noise and let
    // the deterministic standing check above carry the real assertion.
    if (rows[i].avg > rows[i - 1].avg + 0.08) fail(`offers went UP after another season out of work`);
  }
  if (rows[3].empty < 40) fail('three seasons unemployed and the phone still rings most windows');
}

/* ---------- 4. How you left matters ---------- */
console.log('4) How you went out matters');
{
  const of = (departure) => {
    const p = base({ playingRep: 50, managerTrophies: 1, seasonsManaged: 6, lastTier: 2, departure });
    return { d: departure, standing: managerStanding(p), avg: sample(p, 250).avg };
  };
  const rows = ['poached', 'resigned', 'mutual', 'sacked', 'relegated'].map(of);
  for (const r of rows) console.log(`   ${r.d.padEnd(10)} standing ${r.standing.toFixed(0)}, ${r.avg.toFixed(2)} offers`);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].standing > rows[i - 1].standing) fail(`${rows[i].d} left you better off than ${rows[i - 1].d}`);
  }
}

/* ---------- 5. No leaping up the pyramid ---------- */
console.log('5) You cannot leap up from where you fell');
{
  // A modest manager sacked at a tier 4 club must not be offered an elite job.
  const bottom = base({ playingRep: 30, seasonsManaged: 4, lastTier: 4, departure: 'sacked' });
  let sawElite = 0, windows = 500;
  for (let i = 0; i < windows; i++) {
    for (const o of generateJobOffers(bottom, CLUBS, Math.random)) if (o.tier === 1) sawElite += 1;
  }
  console.log(`   sacked at a tier 4 club: ${sawElite} elite offers across ${windows} windows (ceiling tier ${bestTierAvailable(bottom)})`);
  if (sawElite > 0) fail(`${sawElite} elite jobs were offered to a manager sacked at the bottom of the pyramid`);
}

/* ---------- 6. But you CAN climb back ---------- */
console.log('6) You can work your way back up');
{
  let p = base({ playingRep: 25, seasonsSinceRetired: 4, seasonsManaged: 3, lastTier: 4, departure: 'relegated' });
  const path = [];
  for (let step = 0; step < 4; step++) {
    const ceiling = bestTierAvailable(p);
    path.push(`T${p.lastTier} -> can reach T${ceiling}`);
    if (ceiling === null) break;
    // A good spell: a promotion, a trophy, and you leave on your own terms.
    p = { ...p, lastTier: Math.max(1, ceiling), promotions: p.promotions + 1, managerTrophies: p.managerTrophies + 1, seasonsManaged: p.seasonsManaged + 3, departure: 'poached', seasonsOut: 0 };
  }
  console.log('   ' + path.join('  |  '));
  const finalCeiling = bestTierAvailable(p);
  console.log(`   after three good spells the ceiling is tier ${finalCeiling}, standing ${managerStanding(p).toFixed(0)}`);
  if (finalCeiling !== 1) fail(`a manager who won everything on the way up still cannot reach the top (ceiling ${finalCeiling})`);
}

/* ---------- 7. Every offer explains itself, and the copy is clean ---------- */
console.log('7) Offers explain themselves');
{
  const p = base({ playingRep: 70, managerTrophies: 2, seasonsManaged: 8, lastTier: 2, departure: 'sacked' });
  let checked = 0;
  for (let i = 0; i < 200; i++) {
    for (const o of generateJobOffers(p, CLUBS, Math.random)) {
      checked += 1;
      if (!o.reason || o.reason.length < 20) fail('an offer arrived with no reason attached');
      if (!o.brief || o.brief.length < 10) fail('an offer arrived with no brief');
      if (!(o.keenness >= 5 && o.keenness <= 100)) fail(`keenness out of range: ${o.keenness}`);
      if (/[–—]/.test(o.reason + o.brief)) fail('an em or en dash reached the offer copy');
    }
  }
  console.log(`   ${checked} offers checked, all carried a reason and a brief`);
  if (checked < 50) fail('too few offers generated to judge the copy');

  const text = fs.readFileSync(path.join(ROOT, 'src/lib/managerOffers.ts'), 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/[–—]/.test(line) && !line.includes('─')) fail(`managerOffers.ts:${i + 1} has an em or en dash`);
  });
}

console.log(failures === 0 ? '\nALL MANAGER OFFER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
