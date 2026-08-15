/**
 * Round 95 harness: is the football world outside my dugout actually real?
 * Two features here, both easy to fake and worthless if faked:
 *  - every other league must play a full, correct season alongside mine
 *    (right number of games per club, points that reconcile with results,
 *    a plausible champion rather than noise)
 *  - the Champions League bracket must be a genuine eight club tournament:
 *    no club in two ties at once, every round seeded from the last round's
 *    real winners, my own tie decided by MY match, and a champion at the end
 *    even in the seasons where I get knocked out early
 * Run: node scripts/simWorld.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/wdEntry.mjs';
const BUNDLE = '/tmp/wd.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  REAL_LEAGUES, leagueOf, sortedTable, leagueRounds,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Play a whole season out. */
function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call below takes the
   straight through path, which is exactly the game this file was calibrated
   against before Round 119 existed. simHalftime and simOpposition are the two
   that DO want the break and they call playNextEntry raw on purpose. */
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. Every other league plays a real season ---------- */
console.log('1) Every other league plays a full, correct season');
{
  const s = runSeason(startCareer('Brighton'));
  const myId = leagueOf('Brighton').id;
  const world = s.world ?? {};
  const ids = Object.keys(world);
  console.log(`   ${ids.length} other leagues tracked (${REAL_LEAGUES.length - 1} expected)`);
  if (ids.length !== REAL_LEAGUES.length - 1) fail('not every other league is being simulated');
  if (ids.includes(myId)) fail('my own league is duplicated into the world');

  for (const lg of REAL_LEAGUES) {
    if (lg.id === myId) continue;
    const w = world[lg.id];
    if (!w) { fail(`${lg.name} missing`); continue; }
    const total = leagueRounds(lg.clubs.length);
    if (w.round !== total) fail(`${lg.name}: played ${w.round} rounds, expected ${total}`);
    if (w.table.length !== lg.clubs.length) fail(`${lg.name}: table has ${w.table.length} rows for ${lg.clubs.length} clubs`);
    // points must reconcile with wins and draws for every single club
    let games = 0;
    for (const r of w.table) {
      if (r.pts !== r.w * 3 + r.d) fail(`${lg.name} ${r.club}: ${r.pts} pts does not match ${r.w}W ${r.d}D`);
      games += r.w + r.d + r.l;
      const expected = 2 * (lg.clubs.length - 1);
      if (r.w + r.d + r.l !== expected) {
        fail(`${lg.name} ${r.club}: played ${r.w + r.d + r.l}, expected ${expected}`);
      }
    }
    // every match counted exactly twice (once per club)
    const gf = w.table.reduce((n, r) => n + r.gf, 0);
    const ga = w.table.reduce((n, r) => n + r.ga, 0);
    if (gf !== ga) fail(`${lg.name}: goals for ${gf} does not equal goals against ${ga}`);
    if (games % 2 !== 0) fail(`${lg.name}: odd game count ${games}`);
  }
  const champs = REAL_LEAGUES.filter(l => l.id !== myId)
    .map(l => `${l.name}: ${sortedTable(world[l.id].table)[0]?.club}`);
  console.log('   sample champions: ' + champs.slice(0, 4).join(' | '));
}

/* ---------- 2. Champions are plausible, not random ---------- */
console.log('2) The big clubs win more than the small ones');
{
  const winners = {};
  for (let i = 0; i < 12; i++) {
    const s = runSeason(startCareer('Brighton'));
    const laliga = s.world?.laliga;
    if (!laliga) { fail('La Liga missing'); break; }
    const champ = sortedTable(laliga.table)[0]?.club;
    winners[champ] = (winners[champ] ?? 0) + 1;
  }
  const ranked = Object.entries(winners).sort((a, b) => b[1] - a[1]);
  console.log('   La Liga winners over 12 seasons: ' + ranked.map(([c, n]) => `${c} x${n}`).join(', '));
  const bigThree = (winners['Real Madrid'] ?? 0) + (winners['Barcelona'] ?? 0) + (winners['Atlético Madrid'] ?? 0);
  if (bigThree < 6) fail(`the big three won only ${bigThree}/12 La Liga titles, the sim is noise`);
  if (bigThree === 12 && ranked.length < 2) fail('only ever one winner, the sim is deterministic');
}

/* ---------- 3. The bracket is a real tournament ---------- */
console.log('3) The Champions League bracket holds together');
{
  let withMe = 0, champions = 0, seasons = 0, pensSeen = 0;
  for (let i = 0; i < 25; i++) {
    // Real Madrid start in Europe every time, which exercises the "I am in it" path
    let s = startCareer('Real Madrid');
    s = runSeason(s);
    const br = s.uclBracket;
    if (!br) { fail('no bracket was ever built'); break; }
    seasons++;

    const qf = br.filter(t => t.round === 'QF');
    const sf = br.filter(t => t.round === 'SF');
    const f = br.filter(t => t.round === 'F');
    if (qf.length !== 4) fail(`expected 4 quarter-finals, got ${qf.length}`);
    if (sf.length && sf.length !== 2) fail(`expected 2 semi-finals, got ${sf.length}`);
    if (f.length > 1) fail(`expected at most 1 final, got ${f.length}`);

    // nobody appears twice in a round
    for (const round of ['QF', 'SF', 'F']) {
      const names = br.filter(t => t.round === round).flatMap(t => [t.home, t.away]);
      if (new Set(names).size !== names.length) fail(`${round}: a club appears in two ties at once`);
      for (const t of br.filter(x => x.round === round)) {
        if (t.home === t.away) fail(`${round}: a club drawn against itself`);
      }
    }

    // every later round is seeded from real winners of the round before
    const winnersOf = r => br.filter(t => t.round === r).sort((a, b) => a.slot - b.slot).map(t => t.winner);
    if (sf.length) {
      const qfw = new Set(winnersOf('QF'));
      if (qfw.has(null)) fail('semi-finals were seeded before every quarter-final was settled');
      for (const t of sf) {
        if (!qfw.has(t.home) || !qfw.has(t.away)) fail(`a semi-finalist (${t.home} v ${t.away}) did not win a quarter-final`);
      }
    }
    if (f.length) {
      const sfw = new Set(winnersOf('SF'));
      for (const t of f) {
        if (!sfw.has(t.home) || !sfw.has(t.away)) fail(`a finalist (${t.home} v ${t.away}) did not win a semi-final`);
      }
    }

    // scores agree with winners; a level tie must be flagged as penalties
    for (const t of br) {
      if (t.winner === null) continue;
      if (t.homeGoals === null || t.awayGoals === null) { fail(`${t.round}: a settled tie has no score`); continue; }
      if (t.homeGoals === t.awayGoals) {
        if (!t.pens) fail(`${t.round}: ${t.home} v ${t.away} ended level with no shootout`);
        if (t.winner !== t.home && t.winner !== t.away) fail(`${t.round}: shootout winner is not in the tie`);
        pensSeen++;
      } else {
        if (t.pens) fail(`${t.round}: a decisive score is marked as a shootout`);
        const shouldWin = t.homeGoals > t.awayGoals ? t.home : t.away;
        if (shouldWin !== t.winner) fail(`${t.round}: ${t.winner} advanced on a losing score`);
      }
    }

    // my own tie has to reflect my own competition state
    const myTies = br.filter(t => t.mine);
    if (myTies.length) {
      withMe++;
      for (const t of myTies) {
        if (t.home !== s.clubName && t.away !== s.clubName) fail('a tie flagged as mine does not contain my club');
      }
      // if I went out at a knockout round, I must be the loser of that tie
      if (s.uclExit && s.uclExit !== 'group') {
        const exitTie = br.find(t => t.round === s.uclExit && t.mine);
        if (exitTie && exitTie.winner === s.clubName) fail(`I was knocked out at the ${s.uclExit} but won that tie`);
      }
      if (s.uclKoRound === 'won') {
        const fin = br.find(t => t.round === 'F' && t.mine);
        if (!fin || fin.winner !== s.clubName) fail('I won the Champions League but the bracket disagrees');
      }
    }
    if (f.length && f[0].winner) champions++;
  }
  console.log(`   ${seasons} seasons, ${withMe} with my club in the bracket, ${champions} crowned a champion`);
  console.log(`   ${pensSeen} ties went to penalties`);
  if (champions < seasons * 0.9) fail('the bracket often fails to produce a champion');
  if (withMe < 5) fail('my club almost never reaches the bracket, the path is untested');
}

/* ---------- 4. Knocked out early, Europe carries on ---------- */
console.log('4) Europe finishes without me');
{
  let ranWithoutMe = 0, tested = 0;
  for (let i = 0; i < 40; i++) {
    let s = runSeason(startCareer('Real Madrid'));
    if (s.uclExit !== 'group') continue;
    tested++;
    const br = s.uclBracket ?? [];
    if (br.some(t => t.mine)) fail('I went out at the group stage but I am in the bracket');
    const fin = br.find(t => t.round === 'F');
    if (fin && fin.winner) ranWithoutMe++;
  }
  console.log(`   ${tested} group stage exits, ${ranWithoutMe} still crowned a champion`);
  if (tested > 0 && ranWithoutMe < tested) fail('the tournament stalls once I am eliminated');
}

/* ---------- 5. Season rollover and save size ---------- */
console.log('5) Rollover and save size');
{
  let s = runSeason(startCareer('Ajax'));
  const beforeIds = Object.keys(s.world ?? {}).length;
  s = finishSeason(s).state;
  s = startNextSeason(s);
  const w = s.world ?? {};
  const rounds = Object.values(w).map(x => x.round);
  console.log(`   after rollover: ${Object.keys(w).length} leagues, rounds reset to ${[...new Set(rounds)].join('/')}`);
  if (Object.keys(w).length !== beforeIds) fail('leagues went missing across the season boundary');
  if (rounds.some(r => r !== 0)) fail('world tables were not reset for the new season');
  if (Object.values(w).some(x => x.table.some(r => r.pts !== 0))) fail('points carried over into the new season');
  if (s.uclBracket && s.uclBracket.length) fail('last season\'s bracket survived into the new season');

  const bytes = JSON.stringify(s).length;
  console.log(`   save is ${(bytes / 1024).toFixed(0)} KB`);
  if (bytes > 900_000) fail(`save has grown to ${bytes} bytes, localStorage will start failing`);
}

/* ---------- 6. Old saves without a world are caught up, not broken ---------- */
console.log('6) An existing save with no world is caught up mid-season');
{
  let s = startCareer('Everton');
  // play a chunk of the season, then strip the world exactly as an old save would be
  for (let i = 0; i < 20; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  const myPlayed = s.calendar.slice(0, s.week).filter(e => e.type === 'league').length;
  delete s.world;
  const r = playNextEntry(s, { skipHalftime: true });
  s = r.state;
  const laliga = s.world?.laliga;
  if (!laliga) fail('the world was not rebuilt for an old save');
  else {
    console.log(`   my league had played ${myPlayed} rounds, La Liga caught up to ${laliga.round}`);
    if (laliga.round < myPlayed) fail(`La Liga is ${myPlayed - laliga.round} rounds behind after the catch up`);
    if (laliga.round > myPlayed + 1) fail('the catch up overshot');
    for (const row of laliga.table) {
      if (row.pts !== row.w * 3 + row.d) fail(`caught up table is inconsistent for ${row.club}`);
    }
  }
}

/* ---------- 7. Copy check ---------- */
console.log('7) Copy check');
{
  const files = [
    'src/components/club-manager/WorldTablesCard.tsx',
    'src/components/club-manager/UclBracketCard.tsx',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line)) fail(`${f}:${i + 1} contains an em or en dash`);
    });
  }
  console.log(`   ${files.length} files checked`);
}

console.log(failures === 0 ? '\nALL WORLD CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
