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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'wdEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wd.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  REAL_LEAGUES, leagueOf, sortedTable, leagueRounds,
  projectedUclBracket, EURO_CLUBS, LEAGUE_NATIONS, ERA_LEAGUES,
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
    'src/components/club-manager/UclGroupsCard.tsx',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line)) fail(`${f}:${i + 1} contains an em or en dash`);
    });
  }
  console.log(`   ${files.length} files checked`);
}

/* ---------- 8. Round 163: the whole group stage is real ---------- */
console.log('8) All eight UCL groups play, and the bracket is earned');
{
  /* A full playable pool for cross-checking that no AI group club is
     invented: every real league's membership plus the euro flavor list. */
  const realPool = new Set(EURO_CLUBS);
  for (const lg of REAL_LEAGUES) for (const c of lg.clubs) realPool.add(c);

  // Day one: the whole draw exists before a ball is kicked.
  let s = startCareer('Real Madrid');
  const world0 = s.uclWorld ?? [];
  console.log(`   fresh career: ${world0.length} AI groups alongside mine`);
  if (world0.length !== 7) fail(`expected 7 AI groups, got ${world0.length}`);
  const myFour = new Set([s.clubName, ...(s.uclGroup?.opponents ?? [])]);
  const seen = new Set();
  for (const g of world0) {
    if (g.clubs.length !== 4) fail(`group ${g.letter} has ${g.clubs.length} clubs`);
    if (g.matchday !== 0) fail(`group ${g.letter} started at matchday ${g.matchday}`);
    if (g.table.some(r => r.pts !== 0 || r.w + r.d + r.l !== 0)) fail(`group ${g.letter} has pre-played rows`);
    for (const c of g.clubs) {
      if (myFour.has(c)) fail(`${c} is in my group AND group ${g.letter}`);
      if (seen.has(c)) fail(`${c} appears in two AI groups`);
      seen.add(c);
      if (!realPool.has(c)) fail(`invented club in group ${g.letter}: ${c}`);
    }
  }
  const letters = world0.map(g => g.letter).join('');
  if (letters !== 'BCDEFGH') fail(`group letters read ${letters}`);

  // Pre-groups projection: eight leaders, paired A v B, C v D and so on.
  const proj0 = projectedUclBracket(s);
  if (!proj0 || proj0.length !== 4) fail(`day one projection has ${proj0?.length ?? 0} pairs, expected 4`);

  // Play into the group stage and stop mid-campaign: lockstep + projection.
  let guard = 0;
  while ((s.uclGroup?.matchday ?? 6) < 3 && guard < 60) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  const mid = s.uclGroup?.matchday ?? 0;
  if (mid < 3) fail('never reached matchday 3, the loop guard tripped');
  for (const g of s.uclWorld ?? []) {
    if (g.matchday !== mid) fail(`group ${g.letter} is at MD${g.matchday} while mine is at MD${mid}, lockstep broke`);
    for (const row of g.table) {
      if (row.w + row.d + row.l !== mid) fail(`group ${g.letter} ${row.club} played ${row.w + row.d + row.l} of ${mid}`);
      if (row.pts !== row.w * 3 + row.d) fail(`group ${g.letter} ${row.club}: points do not reconcile`);
    }
    const gf = g.table.reduce((n, r) => n + r.gf, 0);
    const ga = g.table.reduce((n, r) => n + r.ga, 0);
    if (gf !== ga) fail(`group ${g.letter}: goals for ${gf} != goals against ${ga}`);
  }
  const projMid = projectedUclBracket(s);
  if (!projMid || projMid.length !== 4) fail('mid-groups projection is not four pairs');
  else {
    const leaders = [
      sortedTable(s.uclGroup.table)[0].club,
      ...(s.uclWorld ?? []).map(g => sortedTable(g.table)[0].club),
    ];
    /* ROUND 335: this used to expect the eight leaders and nothing else, and it
       went red on about one run in five. Measured, 4 failures in 20 runs, and
       the cause was not the engine: Round 342's rule is that a SECOND placed
       you takes the eighth slot, exactly as the real draw gives it to you, so
       the projection people watch all group stage is the bracket they get. The
       harness was still asserting the pre-342 winners-only rule, so every run
       where my club happened to sit second at matchday 3 read as a defect. The
       expectation now says what the engine actually promises, and still fails
       on any other substitution. */
    const myRows = sortedTable(s.uclGroup.table).map(r => r.club);
    const iAmSecond = myRows[1] === s.clubName;
    const expected = [...leaders];
    if (iAmSecond && !expected.includes(s.clubName)) expected[7] = s.clubName;
    const projClubs = projMid.flatMap(p => [p.home, p.away]);
    if (projClubs.join('|') !== expected.join('|')) {
      fail(`the projection is not the field the engine promises (mine ${iAmSecond ? 'second, so it takes slot eight' : 'not second'})\n`
        + `       expected ${expected.join(', ')}\n`
        + `       got      ${projClubs.join(', ')}`);
    }
    if (projMid[0].home !== leaders[0] || projMid[0].away !== leaders[1]) fail('pair one is not A leader v B leader');
  }

  // Finish the season: the real bracket must be EARNED by the group tables.
  let over = false;
  guard = 0;
  while (!over && guard < 140) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') over = true;
    if (s.week >= s.calendar.length) break;
  }
  if (projectedUclBracket(s) !== null) fail('the projection kept projecting after the real bracket existed');
  for (const g of s.uclWorld ?? []) {
    if (g.matchday !== 6) fail(`group ${g.letter} finished at MD${g.matchday}`);
  }
  const qf = (s.uclBracket ?? []).filter(t => t.round === 'QF');
  if (qf.length !== 4) fail('no full quarter-final round to check');
  else {
    const winners = new Set([
      sortedTable(s.uclGroup.table)[0].club,
      ...(s.uclWorld ?? []).map(g => sortedTable(g.table)[0].club),
    ]);
    const field = qf.flatMap(t => [t.home, t.away]);
    let nonWinners = 0;
    for (const c of field) {
      if (c === s.clubName) continue; // I can be there as a runner-up
      if (!winners.has(c)) nonWinners++;
    }
    // At most one winner can be displaced, and only by me as a runner-up.
    if (nonWinners > 0) fail(`${nonWinners} bracket clubs won no group`);
    const meIn = field.includes(s.clubName);
    const iAdvanced = s.uclKoRound !== null && s.uclKoRound !== 'out';
    const iWasEliminatedAtGroup = s.uclExit === 'group';
    if (iWasEliminatedAtGroup && meIn) fail('out at the groups but in the bracket');
    if (iAdvanced && !meIn && s.uclExit === null) fail('through the groups but missing from the bracket');
  }

  // An old save mid-campaign is caught up, not broken.
  let o = startCareer('Real Madrid');
  guard = 0;
  while ((o.uclGroup?.matchday ?? 6) < 2 && guard < 60) {
    guard++;
    const r = playNextEntry(o, { skipHalftime: true });
    o = r.state;
  }
  delete o.uclWorld;
  guard = 0;
  const before = o.uclGroup?.matchday ?? 0;
  while ((o.uclGroup?.matchday ?? 6) < before + 1 && guard < 60) {
    guard++;
    const r = playNextEntry(o, { skipHalftime: true });
    o = r.state;
  }
  const rebuilt = o.uclWorld ?? [];
  if (rebuilt.length !== 7) fail('an old save did not grow its AI groups');
  for (const g of rebuilt) {
    if (g.matchday !== o.uclGroup.matchday) fail(`caught-up group ${g.letter} sits at MD${g.matchday}, mine at MD${o.uclGroup.matchday}`);
    for (const row of g.table) {
      if (row.pts !== row.w * 3 + row.d) fail(`caught-up group ${g.letter} table inconsistent`);
    }
  }

  // Rollover: a fresh draw, zeroed, next season.
  let n = runSeason(startCareer('Real Madrid'));
  n = finishSeason(n).state;
  n = startNextSeason(n);
  if (n.uclGroup) {
    const w = n.uclWorld ?? [];
    if (w.length !== 7) fail('the new season did not redraw the AI groups');
    if (w.some(g => g.matchday !== 0 || g.table.some(r => r.pts !== 0))) fail('AI groups carried results across the summer');
  } else if ((n.uclWorld ?? []).length) {
    fail('no group stage next season but AI groups exist anyway');
  }

  // The flag map covers every league id, with no strays.
  for (const lg of REAL_LEAGUES) {
    if (!LEAGUE_NATIONS[lg.id]) fail(`league ${lg.id} has no nation flag mapping`);
  }
  // Round 312: era league ids are in the map too, so the era world picker
  // carries flags; a stray id still fails.
  const knownIds = new Set([
    ...REAL_LEAGUES.map(lg => lg.id),
    ...Object.values(ERA_LEAGUES).flat().map(lg => lg.id),
  ]);
  for (const id of Object.keys(LEAGUE_NATIONS)) {
    if (!knownIds.has(id)) fail(`LEAGUE_NATIONS names an unknown league id: ${id}`);
  }
  console.log('   groups lockstep, projection honest, bracket earned, old saves caught up, flags mapped');
}

console.log(failures === 0 ? '\nALL WORLD CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
