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
 * Round 1311: on a season the league book decides (a whole book with at least
 * AWARD_FLOOR in 100 rival goals on record) goldenBootTable reads the book's
 * Goals board, so section 2 measures THAT board and its leak control (leak)
 * gives every goal of a side to its taker inside the book's deal. The old
 * race still settles every other season (a late book, no book, a thin
 * league, and every Manager Hot Seat handover), so it keeps its own witness:
 * section 2b plays the same ten clubs with no book at all (the Hot Seat's own
 * path: the book taken off the save and noBook passed), with the old band and
 * the old leak control, now named oldleak. Section 8 holds the summary to the
 * book on a season it decides and to the old race on one it does not. Since
 * step 5 the awards also carry the team of the season (xi): section 8 expects
 * the pure module's teamOfSeason over the same input, and simCmLeagueBook's
 * section awards checks how that team is picked (controls teamsheets, nocap).
 *
 * Controls (each prints CONTROL FIRED and exits 0 when its section went red,
 * CONTROL DID NOT FIRE and exits 1 when not, 2 when its anchor is missing):
 *   AWARD_CONTROL=leak     the book gives every goal of a side to its taker -> section 2
 *   AWARD_CONTROL=oldleak  the old race's top man takes 95 in 100 of his club's goals -> section 2b
 * AWARD_MEASURE=<seasons> plays that many seasons of the section 2 clubs on the book and prints the
 * winners, for setting the band; it gates nothing.
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
export * as boards from '${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerLeagueBoards.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

/* Round 567. AWARD_CONTROL=leak makes the top tracked scorer take almost
   every one of his club's goals instead of his share of them. That is exactly
   what "the sharing leaks" means, and it is the right shape of control for
   section 2 because it inflates the WINNER without changing any club's goals
   for, so the per club reconciliation above it stays green and only the mean
   gate moves. Section 2 must go red. */
const CONTROL = process.env.AWARD_CONTROL || '';
if (CONTROL && !['leak', 'oldleak'].includes(CONTROL)) { console.error(`unknown AWARD_CONTROL ${CONTROL}`); process.exit(2); }
if (CONTROL === 'oldleak') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const needle = 'if (r < RACE_TOP_SHARE)';
  if (!text.includes(needle)) {
    console.error('CONTROL oldleak cannot find the sharing line in the bundle, so it would change nothing.');
    console.error('The control is stale, and this run would have been green for the wrong reason.');
    process.exit(2);
  }
  fs.writeFileSync(BUNDLE, text.split(needle).join('if (r < 0.95)'));
  console.log('   NEGATIVE CONTROL ON: the old race\'s top scorer takes 95 percent of the share, section 2b must go red');
}
if (CONTROL === 'leak') {
  /* Round 1311: the book's own leak. A side's penalties and free kicks go to its taker; this gives him
     EVERY goal of the side, so the Goals board's winner swells while every club's goals for stay put. */
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const needle = /kind !== (["'])open\1 && taker \? taker/g;
  const found = text.match(needle) ?? [];
  if (found.length !== 1) {
    console.error(`CONTROL leak finds the taker line of the book's deal ${found.length} times in the bundle, not once, so it would not change what it says.`);
    process.exit(2);
  }
  fs.writeFileSync(BUNDLE, text.replace(needle, 'taker ? taker'));
  console.log('   NEGATIVE CONTROL ON: the book gives every goal of a side to its taker, section 2 must go red');
}

const { cm, boards } = await import(pathToFileURL(BUNDLE).href);
/* Round 832: an era's squads load with the era, so the harness fetches all three first. */
await cm.ensureAllEraRosters();
const {
  startCareer, playNextEntry, finishSeason, startNextSeason, sortedTable,
  goldenBootTable, playerOfSeasonRace, ballonDorWatch, projectedRoster,
  ERA_LEAGUES,
} = cm;

let failures = 0;
let section = '0';
const redSections = new Set();
const fail = m => { failures += 1; redSections.add(section); console.error(`  FAIL (${section}): ` + m); };

/** One league season. `noBook` is Manager Hot Seat's path: the save carries no league book and none is
 *  opened, so the old race is all there is. */
function runSeason(s, noBook = false) {
  if (noBook) delete s.leagueBook;
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
    const r = playNextEntry(s, noBook ? { skipHalftime: true, noBook: true } : { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. The board is built from real rosters and starts at zero ---------- */
section = '1';
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
const RACE_CLUBS = ['Everton', 'Real Madrid', 'Ajax', 'Arsenal', 'Chelsea', 'Liverpool', 'Barcelona', 'Napoli', 'Sevilla', 'Lyon'];
/* Round 1311: the band of section 2, the board as the book reads it, MEASURED the way Round 567 prescribes
   (thirty seasons, the mean, never the worst): AWARD_MEASURE=30 on a runner (remote check r1311-s2d, head
   977c3eca) played the ten clubs three times on the book where it decides (27 seasons; the other 3 are
   Ajax's, whose league sits under the floor and keeps the old race) and read
     23 23 24 25 25 25 25 25 26 26 26 26 26 26 27 27 27 28 29 29 29 29 29 29 29 30 30 30 32 33
     mean 27.27, standard deviation 2.50, so the standard error of a ten season mean is 0.79.
   The band is three and a half of those either side of the mean, as Round 567 set the old one. The gate's
   own ten seasons (the first ten of the thirty) read 26.6. The book's board sits lower than the old race's
   (30.8 then, 31.2 on section 2b now): the old race gave each club's best man 42 in 100 of its goals. */
const BOOK_BAND = { lo: 24.5, hi: 30.0 };
/* The old race's band, Round 567's, kept for section 2b. */
const RACE_BAND = { lo: 24, hi: 38 };
const MEASURE = Number(process.env.AWARD_MEASURE || 0);
if (MEASURE > 0) {
  section = 'measure';
  const winners = [];
  const by = {};
  for (let i = 0; i < MEASURE; i++) {
    const club = RACE_CLUBS[i % RACE_CLUBS.length];
    const s = runSeason(startCareer(club));
    const state = cm.bookAwardsState(s).by;
    by[state] = (by[state] ?? 0) + 1;
    winners.push(goldenBootTable(s, 1)[0]?.goals ?? 0);
  }
  const mean = winners.reduce((a, b) => a + b, 0) / winners.length;
  const sd = Math.sqrt(winners.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, winners.length - 1));
  console.log(`MEASURE ${winners.length} seasons on the book where it decides (${JSON.stringify(by)}): ${[...winners].sort((a, b) => a - b).join(' ')}`);
  console.log(`MEASURE mean ${mean.toFixed(2)}, standard deviation ${sd.toFixed(2)}, standard error of a ten season mean ${(sd / Math.sqrt(10)).toFixed(2)}; 3.5 standard errors: ${(mean - 3.5 * sd / Math.sqrt(10)).toFixed(1)} to ${(mean + 3.5 * sd / Math.sqrt(10)).toFixed(1)}`);
  process.exit(0);
}
section = '2';
console.log('2) Race goals reconcile against the simulated table, and the golden boot board where the book decides');
{
  /* Round 567: ten clubs, not three, and the gate is the MEAN and not the
     worst one. See the note below the loop for why. */
  const winners = [];
  for (const club of RACE_CLUBS) {
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
  if (mean > BOOK_BAND.hi) fail(`the mean golden boot winner is ${mean.toFixed(1)} over ${winners.length} seasons, so the sharing leaks`);
  if (mean < BOOK_BAND.lo) fail(`the mean golden boot winner is only ${mean.toFixed(1)} over ${winners.length} seasons, so the race is dead`);
  if (worst >= 60) fail(`one winner reached ${worst}, which no healthy season comes near`);
}

/* ---------- 2b. The old race, on its own: the Hot Seat's path, no book at all ---------- */
section = '2b';
console.log('2b) The old race where no book is kept (a late book, a handover, a thin league read it)');
{
  const winners = [];
  for (const club of RACE_CLUBS) {
    const s = runSeason(startCareer(club), true);
    if (s.leagueBook) fail(`${club}: a season played with noBook ended holding a book`);
    if (cm.bookAwardsState(s).by !== 'none') fail(`${club}: a season with no book is read as ${cm.bookAwardsState(s).by}`);
    const table = sortedTable(s.table);
    for (const rival of s.leagueClubs) {
      if (rival === s.clubName) continue;
      const clubGoals = (s.scorerRace ?? []).filter(e => e.club === rival).reduce((n, e) => n + e.goals, 0);
      const gf = table.find(r => r.club === rival)?.gf ?? 0;
      if (clubGoals > gf) fail(`${rival}: tracked scorers have ${clubGoals} goals but the club only scored ${gf}`);
    }
    const board = goldenBootTable(s, 12);
    const race = goldenBootTable(s, 12, null);
    if (JSON.stringify(board) !== JSON.stringify(race)) fail(`${club}: with no book the board is not the old race`);
    if (!board.length) { fail('an empty golden boot board after a full season'); continue; }
    winners.push(board[0].goals);
  }
  const mean = winners.reduce((a, b) => a + b, 0) / winners.length;
  console.log(`   ${winners.length} seasons on the old race, winners ${Math.min(...winners)} to ${Math.max(...winners)}, mean ${mean.toFixed(1)}`);
  if (mean > RACE_BAND.hi) fail(`the old race's mean winner is ${mean.toFixed(1)}, so its sharing leaks`);
  if (mean < RACE_BAND.lo) fail(`the old race's mean winner is only ${mean.toFixed(1)}, so it is dead`);
}

/* ---------- 3. One formula for the player of the season ---------- */
section = '3';
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
section = '4';
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
section = '5';
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
section = '6';
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
section = '7';
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

/* ---------- 8. The season review settles on the book where it decides, and on the race where not ---------- */
section = '8';
console.log('8) The summary\'s golden boot is the Goals board\'s first where the book decides; the old race\'s where not');
{
  const seen = { book: 0, other: 0 };
  for (const [club, noBook] of [['Everton', false], ['Real Madrid', false], ['Ajax', false], ['Napoli', true]]) {
    const s = runSeason(startCareer(club), noBook);
    const lb = cm.leagueBoardsOf(s);
    const by = cm.bookAwardsState(s, lb).by;
    const race = goldenBootTable(s, 1, null)[0] ?? null;
    const { state, summary } = finishSeason(s);
    const record = state.history.find(h => h.season === s.season);
    const where = `${club} (${noBook ? 'no book' : 'with its book'}, settled by ${by})`;
    if (by === 'book') {
      seen.book += 1;
      const first = kind => boards.leaders(lb.input, kind, 1)[0] ?? null;
      const g = first('goals');
      if (!g || !summary.goldenBoot || summary.goldenBoot.name !== g.name || summary.goldenBoot.club !== g.club || summary.goldenBoot.goals !== g.n) fail(`${where}: the summary's golden boot ${JSON.stringify(summary.goldenBoot)} is not the Goals board's first ${JSON.stringify(g)}`);
      const flags = m => (m.gen ? 1 : 0) + (m.mine ? 2 : 0);
      const want = { cov: lb.share };
      for (const [key, kind] of [['boot', 'goals'], ['ast', 'assists'], ['glove', 'sheets']]) { const m = first(kind); if (m) want[key] = [m.name, m.club, m.n, flags(m)]; }
      const xi = boards.teamOfSeason(lb.input);
      if (xi) want.xi = xi;
      if (JSON.stringify(summary.awards) !== JSON.stringify(want)) fail(`${where}: the summary's awards ${JSON.stringify(summary.awards)} are not the first of each board ${JSON.stringify(want)}`);
      if (JSON.stringify(record?.awards) !== JSON.stringify(want)) fail(`${where}: the season's record keeps ${JSON.stringify(record?.awards)}, not the summary's awards`);
      if (JSON.stringify(JSON.parse(JSON.stringify(record))) !== JSON.stringify(record)) fail(`${where}: the record does not survive a JSON round trip`);
    } else {
      seen.other += 1;
      if ('awards' in summary || (record && 'awards' in record)) fail(`${where}: awards were written on a season the book did not decide`);
      if (!race || !summary.goldenBoot || summary.goldenBoot.name !== race.name || summary.goldenBoot.goals !== race.goals) fail(`${where}: the summary's golden boot ${JSON.stringify(summary.goldenBoot)} is not the old race's first ${JSON.stringify(race)}`);
    }
    console.log(`   ${where}: boot ${summary.goldenBoot?.name} (${summary.goldenBoot?.goals})${summary.awards ? `, assists ${summary.awards.ast?.[0]} (${summary.awards.ast?.[2]}), clean sheets ${summary.awards.glove?.[0]} (${summary.awards.glove?.[2]}), team ${summary.awards.xi ? `of ${summary.awards.xi.length}` : 'none'}, on record ${summary.awards.cov}`: ', no awards from the book'}`);
  }
  if (!seen.book) fail('no season of section 8 was decided by the book, so the book side was never checked');
  if (!seen.other) fail('every season of section 8 was decided by the book, so the old race side was never checked');
}

if (CONTROL) {
  const own = CONTROL === 'leak' ? '2' : '2b';
  /* oldleak may also move section 2: one of its ten seasons (Ajax's league sits under the floor) is still
     settled by the old race. Nothing else may go red. */
  const allowed = CONTROL === 'oldleak' ? ['2'] : [];
  const others = [...redSections].filter(x => x !== own && !allowed.includes(x));
  if (redSections.has(own) && !others.length) { console.log(`\n   CONTROL FIRED: ${CONTROL} turned section ${own} red and no other`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: ${CONTROL} turned ${redSections.size ? `sections ${[...redSections].join(', ')}` : 'nothing'} red, not section ${own} alone`);
  process.exit(1);
}

console.log(failures === 0 ? '\nALL AWARD RACE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
