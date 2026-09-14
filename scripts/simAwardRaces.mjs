/**
 * Round 165 harness: the award races are simulation, never invention.
 *
 * The golden boot board tracks two real attack-minded men per rival club
 * (from the same projected rosters the danger-men feature uses) and hands
 * them shares of the goals their clubs ACTUALLY scored in the simulated
 * season. So the three failure modes are: a race that leaks (more race goals
 * than a club ever scored), a race that names people who are not on the
 * club's roster, and a winner whose total no real golden boot has ever
 * looked like. Plus the award trio settling at season end, the era path,
 * the old-save rebuild and the summer reset.
 *
 * Run: node scripts/simAwardRaces.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'arEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'ar.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/* Round 299: seeded, the same treatment simBallonDorFairness got. This
   harness ran on ambient Math.random, and on the Round 299 board a boot
   winner landed on 47 once, then three standalone reruns passed. A verdict
   that flips run to run trains people to rerun until green, which the house
   rules forbid; the fix is the house fix, seed the stream rather than widen
   the bar. Same mulberry32 shape as simBallonDorFairness. */
{
  let a = 0xa11ce >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

/* Round 567. AWARD_CONTROL=leak makes the top tracked scorer take almost
   every one of his club's goals instead of his share of them. That is exactly
   what "the sharing leaks" means, and it is the right shape of control for
   section 2 because it inflates the WINNER without changing any club's goals
   for, so the per club reconciliation above it stays green and only the mean
   gate moves. Section 2 must go red. */
const CONTROL = process.env.AWARD_CONTROL || '';
if (CONTROL === 'leak') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const needle = 'if (r < RACE_TOP_SHARE)';
  if (!text.includes(needle)) {
    console.error('CONTROL leak cannot find the sharing line in the bundle, so it would change nothing.');
    console.error('The control is stale, and this run would have been green for the wrong reason.');
    process.exit(2);
  }
  fs.writeFileSync(BUNDLE, text.split(needle).join('if (r < 0.95)'));
  console.log('   NEGATIVE CONTROL ON: the top scorer takes 95 percent of the share, section 2 must go red');
}

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, sortedTable,
  goldenBootTable, playerOfSeasonRace, ballonDorWatch, projectedRoster,
  ERA_LEAGUES,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. The board is built from real rosters and starts at zero ---------- */
console.log('1) Fresh race: right names, right clubs, all zeros');
{
  const s = startCareer('Everton');
  const race = s.scorerRace ?? [];
  const rivals = s.leagueClubs.filter(c => c !== s.clubName);
  console.log(`   ${race.length} tracked scorers across ${rivals.length} rival clubs`);
  if (race.length !== rivals.length * 2) fail(`expected ${rivals.length * 2} entries, got ${race.length}`);
  if (race.some(e => e.club === s.clubName)) fail('my own club has AI race entries');
  if (race.some(e => e.goals !== 0)) fail('a fresh season race did not start at zero');
  // Every tracked name really is on that club's projected roster.
  for (const e of race.slice(0, 10)) {
    const roster = projectedRoster(e.club, 0, 'now');
    if (!roster.some(p => p.n === e.name)) fail(`${e.name} is not on ${e.club}'s roster`);
  }
}

/* ---------- 2. A season's race cannot outscore the table ---------- */
console.log('2) Race goals reconcile against the simulated table');
{
  /* Round 567: ten clubs, not three, and the gate is the MEAN and not the
     worst one. See the note below the loop for why. */
  const winners = [];
  for (const club of ['Everton', 'Real Madrid', 'Ajax', 'Arsenal', 'Chelsea',
    'Liverpool', 'Barcelona', 'Napoli', 'Sevilla', 'Lyon']) {
    const s = runSeason(startCareer(club));
    const table = sortedTable(s.table);
    const race = s.scorerRace ?? [];
    for (const club of s.leagueClubs) {
      if (club === s.clubName) continue;
      const clubGoals = race.filter(e => e.club === club).reduce((n, e) => n + e.goals, 0);
      const gf = table.find(r => r.club === club)?.gf ?? 0;
      if (clubGoals > gf) fail(`${club}: tracked scorers have ${clubGoals} goals but the club only scored ${gf}`);
    }
    const board = goldenBootTable(s, 12);
    if (!board.length) { fail('an empty golden boot board after a full season'); continue; }
    const winner = board[0];
    winners.push(winner.goals);
    // My own scorers merge in from the real league bucket.
    const myTop = [...s.squad].sort((a, b) => (b.comp?.league?.goals ?? 0) - (a.comp?.league?.goals ?? 0))[0];
    if ((myTop?.comp?.league?.goals ?? 0) > 0) {
      const mine = board.concat(goldenBootTable(s, 60)).find(e => e.mine && e.name === myTop.name);
      if (!mine) fail(`my top scorer ${myTop.name} is missing from the extended board`);
      else if (mine.goals !== myTop.comp.league.goals) fail('my scorer\'s race line disagrees with his stat line');
    }
  }
  /* WHY THIS GATES ON THE MEAN, rewritten in Round 567 after it went red on
     healthy code.

     It used to run three seasons and fail if the WORST of the three reached
     45, with a comment recording that three seasons measured on 2026-08-18
     landed between 26 and 31. On 2026-09-14 it went red at 47, and the cause
     was not a leak: removing ONE duplicated player from the roster reshuffled
     every seeded draw downstream, and the new draw happened to include a big
     season.

     Measured properly, over thirty seasons rather than three:

       17 24 24 25 26 26 26 27 27 28 28 29 29 30 30 30 31 31 31 31 32 32 34 35
       35 36 38 38 46 47

       min 17, p25 27, median 30, p75 34, p90 38, max 47, mean 30.8

     TWO of thirty seasons land at or above 45. So the old threshold sat
     INSIDE the distribution, and with three draws it had roughly a one in
     five chance of being red on perfectly healthy code every single run. That
     is the "never assert on a max" rule in CLAUDE.md exactly, and the same
     mistake Round 284 made with a ceiling gap and simSoccerCareerUcl made
     with a worst cell.

     So: ten seasons, and the gate is the mean, which uses every season
     instead of the luckiest and unluckiest. The spread above gives a standard
     deviation near 6, so the standard error of a mean over ten seasons is
     about 1.9. The band 24 to 38 is therefore about three and a half standard
     errors either side of the measured 30.8, far outside the noise and still
     nowhere near a real leak, which would move the mean by much more than
     that. The single season bound is kept only as an absurdity check: 60 in a
     league season is 13 clear of anything thirty seasons produced and is not
     a tuned threshold, it is a "something is structurally broken" line. */
  const mean = winners.reduce((a, b) => a + b, 0) / winners.length;
  const worst = Math.max(...winners);
  console.log(`   ${winners.length} seasons, winners ${Math.min(...winners)} to ${worst}, mean ${mean.toFixed(1)}`);
  if (mean > 38) fail(`the mean golden boot winner is ${mean.toFixed(1)} over ${winners.length} seasons, so the sharing leaks`);
  if (mean < 24) fail(`the mean golden boot winner is only ${mean.toFixed(1)} over ${winners.length} seasons, so the race is dead`);
  if (worst >= 60) fail(`one winner reached ${worst}, which no healthy season comes near`);
}

/* ---------- 3. One formula for the player of the season ---------- */
console.log('3) The POTY formula favours nobody');
{
  const s = runSeason(startCareer('Everton'));
  const table = sortedTable(s.table);
  const posOf = club => {
    const i = table.findIndex(r => r.club === club);
    return i >= 0 ? i + 1 : table.length;
  };
  const race = playerOfSeasonRace(s, 5);
  if (race.length < 3) fail('fewer than three names in the POTY race after a full season');
  for (const e of race) {
    const expect = Math.round((e.goals + Math.max(0, 11 - posOf(e.club)) * 0.35) * 10) / 10;
    if (Math.abs(e.score - expect) > 0.001) fail(`${e.name}: score ${e.score}, the formula says ${expect}`);
  }
  for (let i = 1; i < race.length; i++) {
    if (race[i].score > race[i - 1].score) fail('the POTY race is not sorted by its own score');
  }
  console.log(`   leader: ${race[0]?.name} (${race[0]?.goals} goals, score ${race[0]?.score})`);
}

/* ---------- 4. The season review names all three honours ---------- */
console.log('4) Golden boot, POTY and the world award settle at season end');
{
  const s = runSeason(startCareer('Real Madrid'));
  const { summary } = finishSeason(s);
  if (!summary.goldenBoot || !summary.goldenBoot.name) fail('no golden boot in the summary');
  else if (summary.goldenBoot.goals <= 0) fail('a zero goal golden boot');
  if (!summary.playerOfSeason || !summary.playerOfSeason.name) fail('no player of the season in the summary');
  if (!summary.ballonDor || !summary.ballonDor.name) fail('no world award in the summary');
  else {
    // The winner must be the settled best of something: the boot winner, or
    // the star of the champions, or the star of Europe's winner.
    const uclWinner = s.uclBracket?.find(t => t.round === 'F')?.winner ?? null;
    const champs = sortedTable(s.table)[0]?.club;
    const okClubs = new Set([summary.goldenBoot?.club, champs, uclWinner].filter(Boolean));
    if (!okClubs.has(summary.ballonDor.club)) {
      fail(`the world award went to ${summary.ballonDor.club}, which won nothing and leads nothing`);
    }
  }
  console.log(`   boot: ${summary.goldenBoot?.name} (${summary.goldenBoot?.goals}), POTY: ${summary.playerOfSeason?.name}, world: ${summary.ballonDor?.name} (${summary.ballonDor?.club})`);
}

/* ---------- 5. The era race is the era's ---------- */
console.log('5) A 2010 save races 2010 names');
{
  const s = startCareer('Barcelona', 'era2010');
  const race = s.scorerRace ?? [];
  if (!race.length) fail('no race in the era save');
  const eraClubs = new Set((ERA_LEAGUES.era2010 ?? []).flatMap(l => l.clubs));
  for (const e of race) {
    if (!eraClubs.has(e.club)) fail(`race entry club ${e.club} is not in the 2010 world`);
  }
  // Names come from the era rosters, not the 2026 ones.
  for (const e of race.slice(0, 8)) {
    const roster = projectedRoster(e.club, 0, 'era2010');
    if (!roster.some(p => p.n === e.name)) fail(`${e.name} is not on 2010 ${e.club}`);
  }
  console.log(`   ${race.length} tracked 2010 scorers, e.g. ${race[0]?.name} (${race[0]?.club})`);
}

/* ---------- 6. An old save rebuilds its race from the table ---------- */
console.log('6) A race-less save mid season reconstructs sanely');
{
  let s = startCareer('Everton');
  for (let i = 0; i < 20; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
  }
  delete s.scorerRace;
  // Play forward to the next league round so the lazy init runs.
  let guard = 0;
  while (!s.scorerRace && guard < 15) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
  }
  const race = s.scorerRace ?? [];
  if (!race.length) { fail('the race never rebuilt'); }
  else {
    const table = sortedTable(s.table);
    let nonZero = 0;
    for (const club of s.leagueClubs) {
      if (club === s.clubName) continue;
      const entries = race.filter(e => e.club === club);
      const sum = entries.reduce((n, e) => n + e.goals, 0);
      const gf = table.find(r => r.club === club)?.gf ?? 0;
      if (sum > gf) fail(`rebuilt ${club} race holds ${sum} goals against ${gf} scored`);
      if (gf >= 6 && sum === 0) fail(`${club} scored ${gf} but its rebuilt race is empty`);
      if (sum > 0) nonZero++;
    }
    console.log(`   rebuilt with ${nonZero} clubs already on the board`);
  }
}

/* ---------- 7. Summer resets the race ---------- */
console.log('7) A new season starts a new race');
{
  let s = runSeason(startCareer('Ajax'));
  s = finishSeason(s).state;
  s = startNextSeason(s);
  const race = s.scorerRace ?? [];
  if (!race.length) fail('no race in season two');
  if (race.some(e => e.goals !== 0)) fail('last season\'s goals leaked into the new race');
  const watch = ballonDorWatch(s, 5);
  if (watch.length > 0 && watch.some(e => e.note.includes('league goals'))) {
    fail('the day one watch already claims league goals');
  }
  console.log('   zeroed board, quiet watch, ready for round one');
}

if (CONTROL === 'leak') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the leaked share was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the top man took 95 percent of every club\'s goals and section 2 still passed, so it is not measuring the sharing at all');
  process.exit(1);
}

console.log(failures === 0 ? '\nALL AWARD RACE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
