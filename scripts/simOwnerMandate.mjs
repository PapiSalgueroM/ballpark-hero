/**
 * Round 180 harness: the owner upstairs in all four Front Office games.
 *
 * What Round 180 shipped: Club Manager's spine (a board that names the
 * prize, grades it, and fires you) pulled into the four GM sims via one
 * shared engine, foOwnerMandate.ts. Ownership sets a mandate from the
 * roster's honest league rank at hire and every offseason, the hub shows
 * a live on-track read and a trust meter, season end grades the mandate,
 * and zero trust ends the save. Before this round the GM games had no
 * objectives and no fail state at all.
 *
 * The checks here are logical rather than statistical, so no measured
 * margins are needed: mandate assignment is a deterministic function of
 * rank, grading is a deterministic matrix, and the postseason readers are
 * checked against hand-built fixtures plus the real playoff engines.
 *
 * Run: node scripts/simOwnerMandate.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'ownerMandateEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'ownerMandate.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/frontOffice.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaFrontOffice.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlFrontOffice.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbFrontOffice.ts');
const eng = await import('${ROOT.replaceAll('\\', '/')}/src/lib/foOwnerMandate.ts');
export { nfl, nba, nhl, mlb, eng };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb, eng } = await import(pathToFileURL(BUNDLE).href);
const {
  buildOwnerMandate, strengthRank, mandatePace, gradeSeason, applyMandateResult,
  firedLine, seriesPostseason, nflPostseason, FO_TRUST_START,
} = eng;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const WORDS = {
  nfl: { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 },
  nba: { title: 'the Finals', playoffs: 'the playoffs', round: 'a series', games: 80 },
  nhl: { title: 'the Stanley Cup', playoffs: 'the playoffs', round: 'a series', games: 80 },
  mlb: { title: 'the World Series', playoffs: 'October', round: 'a series', games: 162 },
};

const SPORTS = [
  { key: 'nfl', init: () => nfl.initLeague(seeded(11)), strength: t => nfl.teamStrength(t) },
  { key: 'nba', init: () => nba.initNbaLeague(seeded(12)), strength: t => nba.nbaStrength(t) },
  { key: 'nhl', init: () => nhl.initNhlLeague(seeded(13)), strength: t => nhl.nhlStrength(t) },
  { key: 'mlb', init: () => mlb.initMlbLeague(seeded(14)), strength: t => mlb.mlbStrength(t) },
];

/* ---------- 1. Mandates are honest about the roster ---------- */
console.log('1) The ask follows the roster, in every league');
for (const S of SPORTS) {
  const lg = S.init();
  const words = WORDS[S.key];
  const strengths = Object.fromEntries(Object.entries(lg.teams).map(([a, t]) => [a, S.strength(t)]));
  const abbrs = Object.keys(lg.teams);
  const n = abbrs.length;
  const byTier = { title: 0, contend: 0, playoffs: 0, respect: 0, rebuild: 0 };
  const ranked = [...abbrs].sort((a, b) => strengths[b] - strengths[a]);
  for (const a of abbrs) {
    const m = buildOwnerMandate(strengthRank(strengths, a), n, false, words, lg.season);
    byTier[m.tier] += 1;
    if ((m.tier === 'respect' || m.tier === 'rebuild') && (m.winFloor <= 0 || m.winFloor >= words.games)) {
      fail(`${S.key}: ${a} got a win floor of ${m.winFloor} out of ${words.games} games`);
    }
    if (m.tier === 'title' && !m.text.includes(words.title)) fail(`${S.key}: a title mandate never names ${words.title}`);
    if ((m.tier === 'respect' || m.tier === 'rebuild') && !m.text.includes(String(m.winFloor))) {
      fail(`${S.key}: a win-floor mandate hides its own number`);
    }
    if (m.text.includes('undefined') || m.text.includes('NaN')) fail(`${S.key}: broken mandate text: ${m.text}`);
  }
  const best = buildOwnerMandate(strengthRank(strengths, ranked[0]), n, false, words, lg.season);
  const worst = buildOwnerMandate(strengthRank(strengths, ranked[n - 1]), n, false, words, lg.season);
  if (best.tier !== 'title') fail(`${S.key}: the strongest roster was asked for '${best.tier}', not the title`);
  if (worst.tier !== 'rebuild') fail(`${S.key}: the weakest roster was asked for '${worst.tier}', not a rebuild`);
  if (byTier.title === 0 || byTier.rebuild === 0) fail(`${S.key}: a whole league produced no title or no rebuild tier`);
  if (byTier.title > Math.ceil(n * 0.2)) fail(`${S.key}: ${byTier.title} of ${n} owners demand the title, too many`);
}

/* ---------- 2. A defending champion is never let off ---------- */
console.log('2) The crown must be defended');
{
  const words = WORDS.nfl;
  for (let rank = 1; rank <= 32; rank++) {
    const m = buildOwnerMandate(rank, 32, true, words, 2026);
    if (m.tier === 'playoffs' || m.tier === 'respect' || m.tier === 'rebuild') {
      fail(`a defending champ ranked ${rank} was only asked for '${m.tier}'`);
    }
  }
  const weakChamp = buildOwnerMandate(30, 32, true, words, 2026);
  if (!weakChamp.text.includes('Defend')) fail('a lifted-to-contend champion mandate does not talk about defending');
}

/* ---------- 3. The grading matrix, case by case ---------- */
console.log('3) Grades mean what the mandate said');
{
  const words = WORDS.nfl;
  const M = tier => {
    /* Build a mandate of the wanted tier through the rank fraction. */
    const rank = tier === 'title' ? 1 : tier === 'contend' ? 8 : tier === 'playoffs' ? 15 : tier === 'respect' ? 24 : 31;
    const m = buildOwnerMandate(rank, 32, false, words, 2026);
    if (m.tier !== tier) fail(`fixture rank for '${tier}' produced '${m.tier}', fix the fixture`);
    return m;
  };
  const OUT = (wins, made, rounds, final_, title) => ({ wins, madePlayoffs: made, roundsWon: rounds, reachedFinal: final_, wonTitle: title });
  const cases = [
    ['title', OUT(14, true, 4, true, true), 'title'],
    ['title', OUT(13, true, 2, true, false), 'missed'],
    ['title', OUT(11, true, 1, false, false), 'badly'],
    ['title', OUT(8, false, 0, false, false), 'badly'],
    ['contend', OUT(11, true, 1, false, false), 'met'],
    ['contend', OUT(12, true, 2, true, false), 'overachieved'],
    ['contend', OUT(10, true, 0, false, false), 'missed'],
    ['contend', OUT(7, false, 0, false, false), 'badly'],
    ['playoffs', OUT(10, true, 0, false, false), 'met'],
    ['playoffs', OUT(10, true, 1, false, false), 'overachieved'],
    ['playoffs', OUT(8, false, 0, false, false), 'missed'],
    ['respect', OUT(8, false, 0, false, false), 'met'],
    ['respect', OUT(9, true, 0, false, false), 'overachieved'],
    ['respect', OUT(6, false, 0, false, false), 'missed'],
    ['respect', OUT(3, false, 0, false, false), 'badly'],
    ['rebuild', OUT(6, false, 0, false, false), 'met'],
    ['rebuild', OUT(2, false, 0, false, false), 'badly'],
    ['rebuild', OUT(14, true, 4, true, true), 'title'],
  ];
  for (const [tier, out, want] of cases) {
    const g = gradeSeason(M(tier), out);
    if (g.result !== want) fail(`${tier} + ${JSON.stringify(out)} graded '${g.result}', wanted '${want}'`);
    if (want === 'title' && g.trustDelta < 30) fail('a championship pays too little trust');
    if ((want === 'missed' || want === 'badly') && g.trustDelta >= 0) fail(`a '${want}' season did not cost trust`);
    if ((want === 'met' || want === 'overachieved') && g.trustDelta <= 0) fail(`a '${want}' season did not earn trust`);
  }
  /* The respect floor check uses the real winFloor: 44% of 17 is 7. */
  const r = M('respect');
  if (r.winFloor !== 7) fail(`respect floor for 17 games is ${r.winFloor}, the matrix above assumed 7`);
  const rb = M('rebuild');
  if (rb.winFloor !== 6) fail(`rebuild floor for 17 games is ${rb.winFloor}, the matrix above assumed 6`);
}

/* ---------- 4. Trust arithmetic and the firing line ---------- */
console.log('4) The seat: warm, hot, gone');
{
  const worst = { result: 'badly', verdict: '', trustDelta: -28 };
  const one = applyMandateResult(FO_TRUST_START, worst);
  if (one.fired) fail('one terrible season from a fresh start already fires, too brutal');
  const two = applyMandateResult(one.trust, worst);
  if (two.fired) fail('two terrible seasons from a fresh start already fires, the design says three');
  if (!two.warning) fail('trust in the single digits should read as a warning');
  const three = applyMandateResult(two.trust, worst);
  if (!three.fired) fail('three straight terrible seasons should end the job');
  if (three.trust !== 0) fail(`fired trust should clamp to 0, got ${three.trust}`);
  const capped = applyMandateResult(95, { result: 'title', verdict: '', trustDelta: 40 });
  if (capped.trust !== 100) fail(`trust should clamp to 100, got ${capped.trust}`);
  if (capped.fired || capped.warning) fail('a title at high trust is neither a firing nor a warning');
  if (!firedLine(3, 0).includes('3 seasons') || !firedLine(1, 2).includes('1 season ')) fail('the fired line miscounts tenure');
}

/* ---------- 5. The postseason readers against fixtures ---------- */
console.log('5) The bracket readers cannot be fooled');
{
  /* NBA-shaped: my team loses the play-in. That is NOT making the playoffs. */
  const playInLoss = [
    { name: 'East Play-In 7v8', home: 'ME', away: 'X1', winner: 'X1' },
    { name: 'East R1', home: 'X1', away: 'X2', winner: 'X1' },
    { name: 'NBA Finals', home: 'X1', away: 'X3', winner: 'X1' },
  ];
  const a = seriesPostseason(playInLoss, 'ME', 'Play-In');
  if (a.madePlayoffs || a.roundsWon !== 0 || a.reachedFinal) fail('a play-in loser was credited with a postseason');

  /* Win the play-in, lose R1: made it, won nothing. */
  const playInWin = [
    { name: 'East Play-In 7v8', home: 'ME', away: 'X1', winner: 'ME' },
    { name: 'East R1', home: 'X2', away: 'ME', winner: 'X2' },
    { name: 'NBA Finals', home: 'X2', away: 'X3', winner: 'X2' },
  ];
  const b = seriesPostseason(playInWin, 'ME', 'Play-In');
  if (!b.madePlayoffs || b.roundsWon !== 0 || b.reachedFinal) fail('a play-in winner who lost R1 was misread');

  /* Reach the final and lose: reachedFinal true, title false. */
  const finalLoss = [
    { name: 'ALDS', home: 'ME', away: 'X1', winner: 'ME' },
    { name: 'ALCS', home: 'ME', away: 'X2', winner: 'ME' },
    { name: 'World Series', home: 'ME', away: 'X3', winner: 'X3' },
  ];
  const c = seriesPostseason(finalLoss, 'ME');
  if (!c.reachedFinal || c.roundsWon !== 2 || !c.madePlayoffs) fail('a pennant winner who lost the final was misread');

  /* NFL-shaped with a bye: the one seed never plays the wild card round. */
  const byeChamp = [
    { name: 'AFC Wild Card', games: [{ home: 'X1', away: 'X2', winner: 'X1' }] },
    { name: 'AFC Divisional', games: [{ home: 'ME', away: 'X1', winner: 'ME' }] },
    { name: 'AFC Championship', games: [{ home: 'ME', away: 'X3', winner: 'ME' }] },
    { name: 'Super Bowl', games: [{ home: 'ME', away: 'X4', winner: 'ME' }] },
  ];
  const d = nflPostseason(byeChamp, 'ME');
  if (!d.madePlayoffs || d.roundsWon !== 3 || !d.reachedFinal) fail('a bye-week champion was misread by the NFL reader');
  const e = nflPostseason(byeChamp, 'X9');
  if (e.madePlayoffs || e.reachedFinal || e.roundsWon !== 0) fail('a team outside the bracket was credited with January');
}

/* ---------- 6. The readers against the real playoff engines ---------- */
console.log('6) Full seasons through the real engines agree with the readers');
{
  /* NFL: play all 17 weeks, run the real bracket, read it back. */
  const rng = seeded(61);
  const lg = nfl.initLeague(rng);
  for (let w = 1; w <= nfl.REGULAR_WEEKS; w++) {
    for (const g of lg.schedule[w - 1]) nfl.simGame(g, lg.teams, rng);
  }
  const { rounds, champion } = nfl.runPlayoffs(lg.teams, rng);
  const champRead = nflPostseason(rounds, champion);
  if (!champRead.wonTitle && !champRead.reachedFinal) fail('the NFL champion did not read as a finalist');
  if (!(champRead.roundsWon >= 3 && champRead.roundsWon <= 4)) fail(`the NFL champion won ${champRead.roundsWon} rounds, expected 3 or 4`);
  const inBracket = new Set(rounds.flatMap(r => r.games.flatMap(g => [g.home, g.away])));
  for (const abbr of Object.keys(lg.teams)) {
    const read = nflPostseason(rounds, abbr);
    if (read.madePlayoffs !== inBracket.has(abbr)) fail(`NFL reader disagrees about ${abbr} making the bracket`);
  }
  /* Series sports: the champion always reads reachedFinal with 3+ wins. */
  const runs = [
    ['nba', nba.initNbaLeague(seeded(62)), l => nba.runNbaPlayoffs(l, seeded(63)), 'Play-In'],
    ['nhl', nhl.initNhlLeague(seeded(64)), l => nhl.runNhlFoPlayoffs(l, seeded(65)), undefined],
    ['mlb', mlb.initMlbLeague(seeded(66)), l => mlb.runMlbPlayoffs(l, seeded(67)), undefined],
  ];
  for (const [key, league, run, marker] of runs) {
    const { series, champion: champ } = run(league);
    const read = seriesPostseason(series, champ, marker);
    if (!read.madePlayoffs || !read.reachedFinal) fail(`${key}: the champion did not read as a finalist`);
    if (read.roundsWon < 3) fail(`${key}: the champion read only ${read.roundsWon} series wins`);
    const finalName = series[series.length - 1].name;
    if (!['NBA Finals', 'Stanley Cup Final', 'World Series'].includes(finalName)) {
      fail(`${key}: the last series is '${finalName}', the reader assumes the final comes last`);
    }
  }
}

/* ---------- 7. The live pace read ---------- */
console.log('7) The hub chip tells the truth mid-season');
{
  const words = WORDS.nfl;
  const winM = buildOwnerMandate(31, 32, false, words, 2026); // rebuild, floor 6 of 17
  const behind = mandatePace(winM, 0, 0.5, false);
  const ahead = mandatePace(winM, 5, 0.5, false);
  if (behind.onTrack) fail('0 wins at midseason reads as on pace for a 6 win ask');
  if (!ahead.onTrack) fail('5 wins at midseason reads as behind a 6 win ask');
  const cutM = buildOwnerMandate(15, 32, false, words, 2026); // playoffs tier
  if (!mandatePace(cutM, 0, 0.5, true).onTrack) fail('being inside the cut reads as off track');
  if (mandatePace(cutM, 9, 0.5, false).onTrack) fail('being outside the cut reads as on track');
}

/* ---------- verdict ---------- */
if (failures > 0) {
  console.error(`\n${failures} OWNER MANDATE CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL OWNER MANDATE CHECKS PASSED');
