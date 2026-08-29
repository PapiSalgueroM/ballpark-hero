/**
 * Round 109 harness: does the job market run on the REAL pyramid?
 * Rounds 107 and 108 were only ever tested against a synthetic list of
 * "England T2 Club 3". This proves the same machinery works on the 186 real
 * clubs Club Manager already simulates, that every offer names a club the
 * engine can actually run, and that a career spent in one country pulls
 * offers from that country.
 * Run: node scripts/simJobMarket.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.writeFileSync(path.join(os.tmpdir(), 'jmEntry.mjs'), `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const jm = await import('${ROOT.replaceAll('\\', '/')}/src/lib/managerJobMarket.ts');
export const cm = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const br = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerToManager.ts');
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${path.join(os.tmpdir(), 'jmEntry.mjs')}" --bundle --format=esm --platform=node --outfile="${path.join(os.tmpdir(), 'jm.mjs')}" --log-level=error`, { stdio: 'inherit' });
const { jm, cm, br } = await import(pathToFileURL(path.join(os.tmpdir(), 'jm.mjs')).href);
const { allOfferClubs, vacancies, realJobOffers, marketCountries } = jm;
const { managerProfileFromCareer } = br;

let failures = 0;
const fail = s => { failures += 1; console.error('  FAIL: ' + s); };

console.log('1) The pool is the real pyramid');
{
  const clubs = allOfferClubs();
  const realNames = new Set(cm.REAL_LEAGUES.flatMap(l => l.clubs));
  console.log(`   ${clubs.length} clubs, ${marketCountries().length} countries: ${marketCountries().join(', ')}`);
  if (clubs.length < 150) fail(`only ${clubs.length} clubs reached the job market`);
  for (const c of clubs) {
    if (!realNames.has(c.name)) fail(`invented club in the market: ${c.name}`);
    if (!(c.tier >= 1 && c.tier <= 4)) fail(`${c.name} has tier ${c.tier}`);
    if (!(c.budget > 0)) fail(`${c.name} has no budget`);
    if (c.country === 'Unknown') fail(`${c.name} could not be mapped to a country`);
  }
  const byTier = {};
  for (const c of clubs) byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
  console.log(`   tier spread: ${JSON.stringify(byTier)}`);
  if (Object.keys(byTier).length < 3) fail('the pyramid has fewer than three tiers, so there is nothing to climb');
}

console.log('2) Vacancies are a subset, and churn is believable');
{
  const all = allOfferClubs().length;
  let tot = 0;
  for (let i = 0; i < 60; i++) tot += vacancies(Math.random).length;
  const avg = tot / 60;
  console.log(`   ${avg.toFixed(0)} clubs between managers on average out of ${all}`);
  if (avg < all * 0.08 || avg > all * 0.3) fail(`churn of ${avg.toFixed(0)}/${all} is not believable`);
  const ex = allOfferClubs()[0].name;
  for (let i = 0; i < 40; i++) if (vacancies(Math.random, [ex]).some(c => c.name === ex)) fail('an excluded club still appeared as a vacancy');
}

console.log('3) A career in one country pulls offers from that country');
{
  const spanishLegend = { nationality: 'Spain', peakOverall: 91, intCaps: 90, seasons:
    Array.from({length:15},(_,i)=>({ club:'Real Madrid', clubCountry:'Spain', clubTier:1, apps:36, goals:20, rating:7.4,
      leagueTitle:i%3===0, championsLeague:i%5===0, worldCup:false, ballonDor:i===9, type:'playing' })) };
  const prof = managerProfileFromCareer(spanishLegend);
  let home = 0, total = 0, names = new Set();
  for (let i = 0; i < 300; i++) {
    for (const o of realJobOffers(prof, Math.random, ['Real Madrid'])) {
      total++; names.add(o.club);
      if (o.country === 'Spain') home++;
      if (o.club === 'Real Madrid') fail('the club he just left offered him the job back');
    }
  }
  console.log(`   ${total} offers across 300 windows, ${((home/total)*100).toFixed(0)} percent from Spain, ${names.size} different clubs`);
  if (total < 100) fail('a Spanish legend barely got any offers off the real pyramid');
  if (home / total < 0.25) fail('his own country is no more likely than anywhere else');
  if (names.size < 8) fail(`only ${names.size} distinct clubs ever came in, the market feels tiny`);
}

console.log('4) Every offer names a club the Club Manager engine can run');
{
  const prof = managerProfileFromCareer({ nationality:'England', peakOverall:78, intCaps:8, seasons:
    Array.from({length:12},(_,i)=>({ club:'Everton', clubCountry:'England', clubTier:2, apps:30, goals:6, rating:6.9,
      leagueTitle:false, championsLeague:false, worldCup:false, ballonDor:false, type:'playing' })) });
  let checked = 0;
  for (let i = 0; i < 200; i++) {
    for (const o of realJobOffers(prof, Math.random)) {
      checked++;
      const def = cm.clubByName(o.club);
      if (!def) { fail(`${o.club} is not a club the engine knows`); continue; }
      if (def.tier !== o.tier) fail(`${o.club} tier mismatch: offer ${o.tier}, engine ${def.tier}`);
      const started = cm.startCareer(o.club);
      if (!started || started.squad.length < 14) fail(`${o.club} cannot actually be managed`);
    }
    if (checked > 40) break;
  }
  console.log(`   ${checked} offers checked, every one starts a real Club Manager save`);
  if (checked < 10) fail('too few offers to check');
}

console.log('5) Copy check');
{
  const t = fs.readFileSync(path.join(ROOT,'src/lib/managerJobMarket.ts'),'utf8');
  t.split('\n').forEach((l,i)=>{ if(/[–—]/.test(l) && !l.includes('─')) fail(`managerJobMarket.ts:${i+1} has an em or en dash`); });
  console.log('   clean');
}
console.log(failures===0 ? '\nALL JOB MARKET CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures===0?0:1);
