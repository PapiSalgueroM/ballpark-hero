/**
 * ROUND 1555: NBA STARTING 5, JUDGED FROM THE RECORD.
 *
 * The verdict used to come from a language model told to list each player's
 * stats in the text the page printed, and its fallback judge summed SEASON
 * TOTALS as if they were per game, so nearly any five of real players
 * clamped to 99 ("All-Time Five"). src/lib/nbaStartingFiveScore.ts scores the
 * five 0 to 100 against the best and worst five the dealt teams allowed, from
 * nba_player_stats career rows. This harness holds it, on fixtures only (it
 * never reads the database; every name below is a made up fixture).
 *
 *   1. The wheel holds exactly the seven challenges the record can total.
 *   2. Every team the game deals has franchise codes for the namesake guard.
 *   3. Two fixed fives against hand computed numbers (best 119.5, worst 5.5,
 *      fives of 96.0 and 16.5 score 79 and 10).
 *   4. "Lowest" turns the range round: on every five, highest plus lowest is
 *      100 (within 1 for rounding), and the hand computed five scores 21.
 *      The per pick numbers turn too: on a Lowest spin every pick's "best
 *      here" is his slot's smallest number and his closeness (the emoji grid)
 *      is how far under the slot's largest he came.
 *   5. Separation over many seeded deals of real looking careers: the best
 *      five scores 100 and the worst 0 every time, while the old judge, fed
 *      the same careers as season rows, gives both fives the same band in at
 *      least SAME_BAND_FLOOR of deals (it could not tell them apart).
 *   6. The best and worst five equal a brute force over every five, on small
 *      seeded pools with names planted on two teams, plus one fixed deal where
 *      giving a shared name to the first team is wrong.
 *   7. The namesake guard: a record without the franchise is never his, a
 *      name twice on a roster or on two records is held, accents and dots
 *      fold, a suffix never does.
 *   8. Steals and blocks only count careers that began in 1973-74 or later.
 *   9. Per game numbers round to one decimal, totals stay whole, nothing is
 *      invented for a missing column.
 *  10. Source (code, comments stripped): the hook and page call no model and
 *      no edge function, the offline judge's NBA half is gone, and the points
 *      follow the score.
 *  11. Every refusal names the player and carries no dash.
 *  12. Points: the score on the old 500 scale, clamped.
 *
 * NEGATIVE CONTROLS (NBA_FIVE_CONTROL). Each refuses to run if its anchor is
 * missing, changes only an in memory or temp copy, and must turn its own
 * section red. Exit 1 with a last line "CONTROL <name> FIRED" when it did,
 * 3 when it did not, 2 on an abort:
 *   oldjudge    the old composite judge scores the fives            sections 3, 5
 *   noinvert    "Lowest" is scored like "Highest"                   section 4
 *   greedy      the five walk never tries a worse man for a shared name   section 6
 *   nonamesake  a record that does not list the franchise is used   section 7
 *   pergame     a career total is shown as if it were per game      section 3
 *   aiverdict   the hook calls the model's edge function again      section 10
 *   flatpoints  every finish records a flat 500 again               section 10
 *   hitdrift    the hit mark drifts from NBA Stat Line's             section 12
 *   slotflip    "best here" ignores the spin's direction             section 4
 *   gainflip    the per pick closeness ignores the spin's direction  section 4
 *
 * MEASURED (2026-10-22, here and on a runner alike): section 5, seed 20261022, 300 deals: the best five 100 and the
 * worst 0 on 300 of 300, random fives average 49.7; the old judge rated the best fives 99.0 and the worst 99.0 on
 * average, the same band on 300 of 300. Section 6, seed 7171: 120 extremes on 60 deals, 27 with a planted shared
 * name, all equal to the brute force. Whole run about 2 seconds.
 *
 * Run: node scripts/simNbaStartingFive.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const LIB = `${ROOT}/src/lib/nbaStartingFiveScore.ts`;
const CONTROLS = {
  oldjudge: [3, 5], noinvert: [4], greedy: [6], nonamesake: [7], pergame: [3], aiverdict: [10], flatpoints: [10], hitdrift: [12],
  slotflip: [4], gainflip: [4],
};
const LIB_MUTATIONS = {
  slotflip: ['const slotBest = up ? hi : lo, slotWorst = up ? lo : hi;', 'const slotBest = hi, slotWorst = lo;'],
  gainflip: ['const gainedHere = up ? own.value - lo : hi - own.value;', 'const gainedHere = own.value - lo;'],
  noinvert: ['const gained = up ? yourTotal - worst.total : worst.total - yourTotal;', 'const gained = yourTotal - worst.total;'],
  greedy: ['        if (!shared(c.key)) break;', '        break;'],
  nonamesake: ['    if (!recordTeamCodes(r).some(c => codes.has(c))) continue;', ''],
  pergame: ['  return { ok: true, value: round1(Number(raw) / games) };', '  return { ok: true, value: round1(Number(raw)) };'],
  hitdrift: ['export const NBA_FIVE_HIT_SCORE = 90;', 'export const NBA_FIVE_HIT_SCORE = 85;'],
};
const CONTROL = process.env.NBA_FIVE_CONTROL || '';
const abort = m => { console.error(`simNbaStartingFive ABORT: ${m}`); process.exit(2); };
if (CONTROL && !(CONTROL in CONTROLS)) abort(`NBA_FIVE_CONTROL=${CONTROL} is not a control this harness knows`);

const failedSections = new Set();
let section = 0;
let failures = 0;
const fail = m => { failures += 1; failedSections.add(section); console.error(`  FAIL (section ${section}): ${m}`); };
const begin = (n, title) => { section = n; console.log(`${n}) ${title}`); };

/* Bundle the lib (or a mutated temp copy), the wheel and the team list. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simNbaFive-')).replace(/\\/g, '/');
let libPath = LIB;
if (LIB_MUTATIONS[CONTROL]) {
  const [from, to] = LIB_MUTATIONS[CONTROL];
  const src = fs.readFileSync(LIB, 'utf8').replace(/\r\n/g, '\n');
  if (src.split(from).length - 1 !== 1) abort(`control ${CONTROL}: its anchor is not in the lib exactly once, refusing to run a dead control`);
  libPath = `${TMP}/nbaStartingFiveScore.control.ts`;
  fs.writeFileSync(libPath, src.replace(from, to));
  console.log(`CONTROL ${CONTROL} ON: the lib is a mutated temp copy`);
}
const ENTRY = `${TMP}/entry.ts`;
fs.writeFileSync(ENTRY, [
  `export * as lib from '${libPath}';`,
  `export * as wheel from '${ROOT}/src/data/nbaStats.ts';`,
  `export * as teams from '${ROOT}/src/data/nbaTeams.ts';`,
].join('\n'));
const BUNDLE = `${TMP}/bundle.mjs`;
buildSync({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT}/src` } });
const { lib, wheel, teams } = await import(pathToFileURL(BUNDLE).href);
const {
  NBA_FIVE_CHALLENGES, NBA_FIVE_FRANCHISE_CODES, NBA_FIVE_ROLES, buildTeamPool, challengeByStat, extremeFive,
  findPoolEntry, isPositionEligibleForSlot, nbaFiveNameKey, nbaFivePoints, refusalText, scoreFive, valueFor,
} = lib;

/* Seeded generator, so every run deals the same leagues. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fixture builders. Every name is a fixture, never a real player. */
const COLS = { points: null, trb: null, ast: null, stl: null, blk: null, three_p: null };
const rec = (name, teamsList, games, cols = {}, yearFrom = '1990-91') => ({ player_name: name, teams: teamsList, year_from: yearFrom, games, ...COLS, ...cols });
const ros = (name, position = null) => {
  const i = name.lastIndexOf(' ');
  return { first_name: name.slice(0, i), last_name: name.slice(i + 1), position };
};
const def = stat => challengeByStat(stat) ?? abort(`no challenge "${stat}"`);
const PPG = def('Career Points Per Game');

/* The old judge, ported verbatim from the retired half of
   src/lib/localLineupEval.ts (its composite and its 60 to 99 map), fed the
   same careers cut into seasons of up to 82 games. */
function seasonsOf(r) {
  const out = [];
  for (let left = r.games; left > 0; left -= 82) {
    const f = Math.min(82, left) / r.games;
    out.push({ pts: (r.points ?? 0) * f, trb: (r.trb ?? 0) * f, ast: (r.ast ?? 0) * f, stl: (r.stl ?? 0) * f, blk: (r.blk ?? 0) * f });
  }
  return out;
}
function oldPeak(seasons) {
  let best = 0;
  for (const r of seasons) {
    const comp = (r.pts ?? 0) + 1.2 * (r.trb ?? 0) + 1.5 * (r.ast ?? 0) + 3 * ((r.stl ?? 0) + (r.blk ?? 0));
    if (comp > best) best = comp;
  }
  return best;
}
const oldRating = peak => Math.max(60, Math.min(99, Math.round(60 + (peak - 12) * (39 / 50))));
const oldAvg = records => Math.round(records.reduce((a, r) => a + (r ? oldRating(oldPeak(seasonsOf(r))) : 74), 0) / Math.max(1, records.length));
const oldBand = avg => (avg >= 90 ? 'All-Time Five' : avg >= 83 ? 'Contender Core' : avg >= 75 ? 'Playoff Team' : avg >= 68 ? 'Play-In Bound' : 'Lottery Five');
function oldScoreFive(picks, pools) {
  const records = picks.map(p => {
    const pool = pools.find(pl => pl.team === p.team);
    return pool ? findPoolEntry(pool, p.name)?.record ?? null : null;
  });
  return { score: oldAvg(records), yourTotal: Number.NaN, best: null, worst: null, perPick: [] };
}
const score5 = CONTROL === 'oldjudge' ? oldScoreFive : scoreFive;
if (CONTROL === 'oldjudge') console.log('CONTROL oldjudge ON: the old composite judge scores every five');

/* ---------------------------------------------------------------- */
begin(1, 'the wheel holds exactly the seven challenges the record can total');
{
  const want = ['Career Points Per Game', 'Career Assists Per Game', 'Career Rebounds Per Game', 'Career Steals Per Game',
    'Career Blocks Per Game', 'Career Three Pointers Made', 'Career Games Played'];
  const got = NBA_FIVE_CHALLENGES.map(c => c.stat);
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`challenges are ${JSON.stringify(got)}`);
  const shown = wheel.STAT_DISPLAY_NAMES;
  if (shown.length !== want.length || want.some(s => !shown.some(d => d.endsWith(s)))) fail(`the spinner shows ${JSON.stringify(shown)}`);
  for (const gone of ['Championships', 'Fouls', 'Height', 'Weight', 'Minutes', 'Free Throw']) {
    if (shown.some(d => d.includes(gone))) fail(`the spinner still offers ${gone}`);
  }
  const cols = new Set(['points', 'ast', 'trb', 'stl', 'blk', 'three_p', 'games']);
  for (const c of NBA_FIVE_CHALLENGES) if (!cols.has(c.column)) fail(`${c.stat} reads ${c.column}, not a column the pool fetches`);
  let spins = 0;
  for (let i = 0; i < 400; i++) { const c = wheel.getRandomStatChallenge(); if (challengeByStat(c.stat)) spins += 1; }
  if (spins !== 400) fail(`${400 - spins} of 400 spins drew a challenge the scorer cannot read`);
  console.log(`   ${got.length} challenges, all ${spins} spins scoreable`);
}

begin(2, 'every team the game deals has franchise codes');
{
  for (const t of teams.NBA_TEAMS) {
    const codes = NBA_FIVE_FRANCHISE_CODES[t.name];
    if (!Array.isArray(codes) || codes.length === 0) fail(`${t.name} has no franchise codes`);
  }
  const all = Object.values(NBA_FIVE_FRANCHISE_CODES).flat();
  if (new Set(all).size !== all.length) fail('a franchise code is listed under two teams');
  console.log(`   ${teams.NBA_TEAMS.length} teams, ${all.length} codes, none shared`);
}

/* The hand computed league of section 3 and 4. Values per game:
   ATL Ace G 25.0, Bolt C 9.0, Crumb any 0.5     BOS Dart G 18.0, Echo F 22.0, Flop C 1.0
   CHI Gust F 25.0, Hush G 11.0, Inch any 0.0    DEN Jolt C 28.0, Knot F 15.0, Lull G 2.0
   MIA Mist G-F 19.5, Nook C 13.0, Oath F 2.0
   Best five: Ace 25 + Mist 19.5 (guards), Echo 22 + Gust 25 (forwards), Jolt 28 (C) = 119.5.
   Worst five: Flop 1.0 (C), Lull 2 and Crumb or Inch (guards), Oath 2 and the other (forwards) = 5.5. */
const HAND_TEAMS = ['Atlanta Hawks', 'Boston Celtics', 'Chicago Bulls', 'Denver Nuggets', 'Miami Heat'];
function handPools() {
  const p = (team, rows) => buildTeamPool(team, rows.map(r => ros(r[0], r[1])), rows.map(r => rec(r[0], r[2], r[4], { points: r[3] })));
  return [
    p('Atlanta Hawks', [['Fixture Ace', 'G', 'ATL', 2500, 100], ['Fixture Bolt', 'C', 'ATL,MIA', 900, 100], ['Fixture Crumb', null, 'ATL', 30, 60]]),
    p('Boston Celtics', [['Fixture Dart', 'G', 'BOS', 1800, 100], ['Fixture Echo', 'F', 'BOS', 2200, 100], ['Fixture Flop', 'C', 'BOS', 10, 10]]),
    p('Chicago Bulls', [['Fixture Gust', 'F', 'CHI', 2000, 80], ['Fixture Hush', 'G', 'CHI', 1210, 110], ['Fixture Inch', null, 'CHI', 0, 5]]),
    p('Denver Nuggets', [['Fixture Jolt', 'C', 'DEN', 2100, 75], ['Fixture Knot', 'F', 'DEN', 1500, 100], ['Fixture Lull', 'G', 'DEN', 200, 100]]),
    p('Miami Heat', [['Fixture Mist', 'G-F', 'MIA', 1950, 100], ['Fixture Nook', 'C', 'MIA', 1300, 100], ['Fixture Oath', 'F', 'MIA', 40, 20]]),
  ];
}
const pick = (team, role, name) => ({ team, role, name });
const FIVE_A = [pick('Atlanta Hawks', 'PG', 'Fixture Ace'), pick('Boston Celtics', 'SG', 'Fixture Dart'), pick('Chicago Bulls', 'SF', 'Fixture Gust'),
  pick('Denver Nuggets', 'PF', 'Fixture Knot'), pick('Miami Heat', 'C', 'Fixture Nook')];
const FIVE_B = [pick('Atlanta Hawks', 'SF', 'Fixture Crumb'), pick('Boston Celtics', 'C', 'Fixture Flop'), pick('Chicago Bulls', 'PG', 'Fixture Hush'),
  pick('Denver Nuggets', 'SG', 'Fixture Lull'), pick('Miami Heat', 'PF', 'Fixture Oath')];

begin(3, 'fixed fives against hand computed numbers');
{
  const pools = handPools();
  const a = score5(FIVE_A, pools, PPG, 'highest');
  const b = score5(FIVE_B, pools, PPG, 'highest');
  const expect = (label, got, want) => { if (got !== want) fail(`${label}: got ${got}, hand computed ${want}`); };
  if (!a || !b) fail('a legal five came back unscored');
  else {
    expect('five A total', a.yourTotal, 96);
    expect('best five total', a.best?.total, 119.5);
    expect('worst five total', a.worst?.total, 5.5);
    expect('five A score, (96.0 - 5.5) / (119.5 - 5.5) = 0.794', a.score, 79);
    expect('five B total', b.yourTotal, 16.5);
    expect('five B score, (16.5 - 5.5) / 114 = 0.096', b.score, 10);
    const names = (a.best?.picks ?? []).map(p => p.name).sort().join(', ');
    expect('best five names', names, 'Fixture Ace, Fixture Echo, Fixture Gust, Fixture Jolt, Fixture Mist');
    const oath = b.perPick.find(p => p.name === 'Fixture Oath');
    expect('Oath at PF, best forward on the Heat', oath?.slotBest, 19.5);
    expect('Oath closeness, (2 - 2) / (19.5 - 2)', oath?.closeness, 0);
    console.log(`   five A ${a.yourTotal} scores ${a.score}, five B ${b.yourTotal} scores ${b.score}, best ${a.best?.total}, worst ${a.worst?.total}`);
  }
}

begin(4, 'Lowest turns the range round');
{
  const pools = handPools();
  const lowA = score5(FIVE_A, pools, PPG, 'lowest');
  const highA = score5(FIVE_A, pools, PPG, 'highest');
  if (!lowA || lowA.score !== 21) fail(`five A on a Lowest spin scored ${lowA?.score}, hand computed (119.5 - 96.0) / 114 = 21`);
  if (lowA && lowA.best?.total !== 5.5) fail(`the best Lowest five totals ${lowA.best?.total}, hand computed 5.5`);
  /* The numbers a player reads per pick turn round too: on a Lowest spin
     "best here" is the slot's SMALLEST number and closeness is how far under
     the slot's largest he came. Hand computed: Ace at PG on the Hawks (guards
     Ace 25.0 and Crumb 0.5) is best here 0.5, worst 25, closeness 0; Oath at
     PF on the Heat (forwards Mist 19.5 and Oath 2.0) is best here 2, worst
     19.5, closeness 1. Then every pick of both fives against the pool. */
  const lowB = score5(FIVE_B, pools, PPG, 'lowest');
  const hand = [[lowA, 'Fixture Ace', 0.5, 25, 0], [lowB, 'Fixture Oath', 2, 19.5, 1]];
  for (const [five, name, best, worst, close] of hand) {
    const p = five?.perPick?.find(x => x.name === name);
    if (!p || p.slotBest !== best || p.slotWorst !== worst || p.closeness !== close) {
      fail(`Lowest ${name}: best here ${p?.slotBest}, worst ${p?.slotWorst}, closeness ${p?.closeness}; hand computed ${best}, ${worst}, ${close}`);
    }
  }
  let lowPicks = 0;
  for (const five of [lowA, lowB]) {
    if ((five?.perPick?.length ?? 0) !== 5) { fail(`a Lowest five came back with ${five?.perPick?.length ?? 0} picks scored`); continue; }
    for (const p of five.perPick) {
      const pool = pools.find(pl => pl.team === p.team);
      const vals = pool.entries.filter(e => isPositionEligibleForSlot(e.position, p.role)).map(e => valueFor(e, PPG)).flatMap(v => (v.ok ? [v.value] : []));
      const hi = Math.max(...vals), lo = Math.min(...vals);
      const close = hi === lo ? 1 : (hi - p.value) / (hi - lo);
      if (p.slotBest !== lo || p.slotWorst !== hi) fail(`Lowest ${p.name} at ${p.role}: best here ${p.slotBest} and worst ${p.slotWorst}, the slot runs ${lo} to ${hi}`);
      if (Math.abs(p.closeness - close) > 1e-9) fail(`Lowest ${p.name} at ${p.role}: closeness ${p.closeness}, want ${close}`);
      lowPicks += 1;
    }
  }
  const rand = mulberry32(1555);
  let pairs = 0, worstGap = 0;
  for (let d = 0; d < 40; d++) {
    const five = randomFive(pools, PPG, rand);
    if (!five) continue;
    const hi = score5(five, pools, PPG, 'highest'), lo = score5(five, pools, PPG, 'lowest');
    if (!hi || !lo) { fail('a legal random five came back unscored'); continue; }
    pairs += 1;
    worstGap = Math.max(worstGap, Math.abs(hi.score + lo.score - 100));
  }
  if (worstGap > 1) fail(`highest plus lowest strayed ${worstGap} from 100 on a five`);
  if (pairs < 30) fail(`only ${pairs} random fives were legal, the check had too little to stand on`);
  console.log(`   five A: highest ${highA?.score}, lowest ${lowA?.score}; ${lowPicks} Lowest picks read best here and closeness the right way round; ${pairs} random fives, highest plus lowest within ${worstGap} of 100`);
}

/* Helpers for the seeded sections (function declarations, hoisted). */
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function randomFive(pools, d, rand) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const roles = shuffle([...NBA_FIVE_ROLES], rand);
    const used = new Set();
    const out = [];
    for (let i = 0; i < pools.length; i++) {
      const options = pools[i].entries.filter(e => isPositionEligibleForSlot(e.position, roles[i]) && valueFor(e, d).ok && !used.has(e.key));
      if (!options.length) break;
      const e = options[Math.floor(rand() * options.length)];
      used.add(e.key);
      out.push({ team: pools[i].team, role: roles[i], name: e.name });
    }
    if (out.length === pools.length) return out;
  }
  return null;
}
const POSITIONS = ['G', 'F', 'C', 'G-F', 'F-C', null, null, null];
/* A league of real looking careers: 100 to 1400 games, 1.5 to 30 points a
   game, every career long enough to have full seasons, starting 1974 or
   later so every challenge can number every man. */
function simLeague(rand, perTeam) {
  return teams.NBA_TEAMS.map((t, ti) => {
    const code = NBA_FIVE_FRANCHISE_CODES[t.name][0];
    const roster = [];
    const records = [];
    for (let i = 0; i < perTeam; i++) {
      const name = `Sim T${ti} P${i}`;
      const games = 100 + Math.floor(rand() * 1300);
      const total = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * games);
      const start = 1974 + Math.floor(rand() * 47);
      records.push(rec(name, code, games,
        { points: total(1.5, 30), trb: total(1, 12), ast: total(0.5, 10), stl: total(0.3, 2.5), blk: total(0.1, 3), three_p: Math.floor(rand() * 2500) },
        `${start}-${String((start + 1) % 100).padStart(2, '0')}`));
      roster.push(ros(name, POSITIONS[Math.floor(rand() * POSITIONS.length)]));
    }
    return buildTeamPool(t.name, roster, records);
  });
}

/* Measured on seed 20261022 over 300 deals (2026-10-22): the old judge put
   the best and the worst five in the same band on 300 of 300 deals (both
   99 on every deal), so the floor sits well under that at 0.9. */
const DEALS = 300;
const SAME_BAND_FLOOR = 0.9;
begin(5, `separation over ${DEALS} seeded deals of real looking careers`);
{
  const rand = mulberry32(20261022);
  const league = simLeague(rand, 25);
  let deals = 0, sameBand = 0, notHundred = 0, notZero = 0, outOfRange = 0, randSum = 0, randN = 0, oldBestSum = 0, oldWorstSum = 0;
  for (let d = 0; d < DEALS; d++) {
    const dealt = shuffle([...league], rand).slice(0, 5);
    const c = NBA_FIVE_CHALLENGES[Math.floor(rand() * NBA_FIVE_CHALLENGES.length)];
    const dir = rand() < 0.5 ? 'highest' : 'lowest';
    const best = extremeFive(dealt, c, dir === 'highest' ? 'max' : 'min');
    const worst = extremeFive(dealt, c, dir === 'highest' ? 'min' : 'max');
    if (!best || !worst) { fail(`deal ${d}: no five could be built`); continue; }
    const sb = score5(best.picks, dealt, c, dir);
    const sw = score5(worst.picks, dealt, c, dir);
    if (sb?.score !== 100) notHundred += 1;
    if (sw?.score !== 0) notZero += 1;
    const r = randomFive(dealt, c, rand);
    const sr = r ? score5(r, dealt, c, dir) : null;
    if (sr) { randSum += sr.score; randN += 1; if (sr.score < 0 || sr.score > 100) outOfRange += 1; }
    const recordsOf = five => five.picks.map(p => findPoolEntry(dealt.find(x => x.team === p.team), p.name)?.record ?? null);
    const ob = oldAvg(recordsOf(best)), ow = oldAvg(recordsOf(worst));
    oldBestSum += ob; oldWorstSum += ow;
    if (oldBand(ob) === oldBand(ow)) sameBand += 1;
    deals += 1;
  }
  if (notHundred) fail(`the best five allowed scored under 100 on ${notHundred} of ${deals} deals`);
  if (notZero) fail(`the worst five allowed scored over 0 on ${notZero} of ${deals} deals`);
  if (outOfRange) fail(`${outOfRange} random fives scored outside 0 to 100`);
  const share = deals ? sameBand / deals : 0;
  if (share < SAME_BAND_FLOOR) fail(`the old judge separated the best and worst five on ${deals - sameBand} of ${deals} deals; this section's premise (it could not) no longer holds`);
  console.log(`   ${deals} deals: best five 100 and worst 0 on ${deals - Math.max(notHundred, notZero)}; random fives average ${randN ? (randSum / randN).toFixed(1) : 'n/a'} over ${randN}`);
  console.log(`   the old judge on the same careers: best five average ${(oldBestSum / Math.max(1, deals)).toFixed(1)}, worst five ${(oldWorstSum / Math.max(1, deals)).toFixed(1)}, same band on ${sameBand} of ${deals}`);
}

/* The optimizer against a brute force over every five. */
function bruteForce(pools, c, mode) {
  const lists = pools.map(pool => pool.entries.map(e => ({ e, v: valueFor(e, c) })).filter(x => x.v.ok));
  const roleOrders = [];
  const permute = (left, acc) => { if (!left.length) { roleOrders.push(acc); return; } left.forEach((r, i) => permute([...left.slice(0, i), ...left.slice(i + 1)], [...acc, r])); };
  permute([...NBA_FIVE_ROLES], []);
  let best = null;
  for (const order of roleOrders) {
    const walk = (i, used, sum) => {
      if (i === pools.length) { if (best === null || (mode === 'max' ? sum > best : sum < best)) best = sum; return; }
      for (const { e, v } of lists[i]) {
        if (used.has(e.key) || !isPositionEligibleForSlot(e.position, order[i])) continue;
        used.add(e.key); walk(i + 1, used, sum + v.value); used.delete(e.key);
      }
    };
    walk(0, new Set(), 0);
  }
  return best === null ? null : Math.round(best * 10) / 10;
}
begin(6, 'the best and worst five equal a brute force over every five');
{
  let checked = 0, planted = 0, wrong = 0;
  const rand = mulberry32(7171);
  const league = simLeague(rand, 4);
  for (let d = 0; d < 60; d++) {
    const dealt = shuffle([...league], rand).slice(0, 5).map(p => ({ team: p.team, entries: [...p.entries] }));
    if (rand() < 0.6) {
      /* plant a strong name on two dealt teams: two different men, one name */
      const [a, b] = [Math.floor(rand() * 5), Math.floor(rand() * 5)];
      if (a !== b) {
        const name = dealt[a].entries[0].name;
        const code = NBA_FIVE_FRANCHISE_CODES[dealt[b].team][0];
        const twin = buildTeamPool(dealt[b].team, [ros(name, null)], [rec(name, code, 500, { points: 20000, trb: 6000, ast: 4000, stl: 800, blk: 700, three_p: 900 }, '1990-91')]).entries[0];
        dealt[a].entries[0] = buildTeamPool(dealt[a].team, [ros(name, null)], [rec(name, NBA_FIVE_FRANCHISE_CODES[dealt[a].team][0], 500, { points: 19000, trb: 5800, ast: 3900, stl: 790, blk: 690, three_p: 880 }, '1990-91')]).entries[0];
        dealt[b].entries.push(twin);
        planted += 1;
      }
    }
    const c = NBA_FIVE_CHALLENGES[d % NBA_FIVE_CHALLENGES.length];
    for (const mode of ['max', 'min']) {
      const fast = extremeFive(dealt, c, mode)?.total ?? null;
      const slow = bruteForce(dealt, c, mode);
      if (fast !== slow) { wrong += 1; if (wrong <= 3) fail(`deal ${d} ${c.key} ${mode}: optimizer ${fast}, brute force ${slow}`); }
      checked += 1;
    }
  }
  /* The fixed trap: the first team's best man shares a name with the last
     team's best man, the first team has a strong second option and the last
     team a weak one, so the shared name belongs with the last team. */
  const flat = (team, rows) => buildTeamPool(team, rows.map(r => ros(r[0], null)), rows.map(r => rec(r[0], NBA_FIVE_FRANCHISE_CODES[team][0], 100, { points: r[1] })));
  const trap = [
    flat('Atlanta Hawks', [['Fixture Shared', 4000], ['Fixture Alt', 3000]]),
    flat('Boston Celtics', [['Fixture Bee', 1000]]),
    flat('Chicago Bulls', [['Fixture Cee', 1000]]),
    flat('Denver Nuggets', [['Fixture Dee', 1000]]),
    flat('Miami Heat', [['Fixture Shared', 4000], ['Fixture Weak', 100]]),
  ];
  const trapBest = extremeFive(trap, PPG, 'max')?.total ?? null;
  if (trapBest !== 100) { wrong += 1; fail(`the shared name trap: optimizer found ${trapBest}, the best five is 30 + 10 + 10 + 10 + 40 = 100`); }
  if (wrong > 3) fail(`${wrong} optimizer answers in all disagreed with the brute force`);
  if (planted < 20) fail(`only ${planted} deals carried a planted shared name, too few to test the walk`);
  console.log(`   ${checked} extremes on ${60} deals (${planted} with a shared name) match the brute force; the shared name trap totals ${trapBest}`);
}

begin(7, 'the namesake guard');
{
  const accented = 'Fixture A' + String.fromCharCode(0x300) + 'cc' + String.fromCharCode(0xe8) + 'nt';
  const pool = buildTeamPool('Atlanta Hawks',
    [ros('Fixture Twin'), ros('Fixture Twin'), ros('Fixture Away'), ros('Fixture Pair'), ros('Fixture Accent'), ros("Fixture O'Dell"), ros('Fixture Senior Jr.'), ros('Fixture Plain')],
    [rec('Fixture Twin', 'ATL', 100, { points: 1000 }), rec('Fixture Away', 'BOS', 100, { points: 1000 }),
      rec('Fixture Pair', 'ATL', 100, { points: 1000 }), rec('Fixture Pair', 'ATL,BOS', 50, { points: 100 }),
      rec(accented, 'ATL', 100, { points: 1000 }), rec('Fixture ODell', 'ATL', 100, { points: 1000 }),
      rec('Fixture Senior', 'ATL', 100, { points: 1000 }), rec('Fixture Plain', 'BOS,ATL', 100, { points: 1234 })]);
  const want = {
    'Fixture Twin': 'namesake', 'Fixture Away': 'no-record', 'Fixture Pair': 'namesake', 'Fixture Accent': 10,
    "Fixture O'Dell": 10, 'Fixture Senior Jr.': 'no-record', 'Fixture Plain': 12.3,
  };
  for (const [name, expected] of Object.entries(want)) {
    const entry = findPoolEntry(pool, name);
    const v = entry ? valueFor(entry, PPG) : { ok: false, reason: 'absent' };
    const got = v.ok ? v.value : v.reason;
    if (got !== expected) fail(`${name}: got ${got}, expected ${expected}`);
  }
  const curly = 'Fixture O' + String.fromCharCode(0x2019) + 'Dell';
  if (nbaFiveNameKey(curly) !== nbaFiveNameKey('Fixture ODell')) fail('a curly apostrophe does not fold');
  if (nbaFiveNameKey('J.J. Fixture') !== nbaFiveNameKey('JJ Fixture')) fail('dotted initials do not fold');
  if (nbaFiveNameKey('Fixture Senior Jr.') === nbaFiveNameKey('Fixture Senior')) fail('a suffix folded a son into his father');
  /* scoreFive refuses what the page would refuse */
  const pools = handPools();
  const swap = (i, p) => FIVE_A.map((x, j) => (j === i ? p : x));
  const refusals = {
    'a name the team never had': swap(0, pick('Atlanta Hawks', 'PG', 'Fixture Nobody')),
    'a guard at center': swap(0, pick('Atlanta Hawks', 'C', 'Fixture Ace')).map((x, j) => (j === 4 ? pick('Miami Heat', 'PG', 'Fixture Mist') : x)),
    'a slot used twice': swap(1, pick('Boston Celtics', 'PG', 'Fixture Dart')),
    'a team not dealt': swap(0, pick('Utah Jazz', 'PG', 'Fixture Ace')),
    'four picks': FIVE_A.slice(0, 4),
  };
  for (const [label, five] of Object.entries(refusals)) {
    if (scoreFive(five, pools, PPG, 'highest') !== null) fail(`scoreFive scored ${label}`);
  }
  console.log(`   ${Object.keys(want).length} roster names and ${Object.keys(refusals).length} illegal fives behave`);
}

begin(8, 'steals and blocks only count careers that began in 1973-74 or later');
{
  const SPG = def('Career Steals Per Game');
  const BPG = def('Career Blocks Per Game');
  const entry = yearFrom => buildTeamPool('Atlanta Hawks', [ros('Fixture Stock')],
    [rec('Fixture Stock', 'ATL', 100, { points: 500, stl: 150, blk: 80 }, yearFrom)]).entries[0];
  const cases = [
    ['1972-73', SPG, 'untracked'], ['1973-74', SPG, 1.5], ['1973-74', BPG, 0.8], ['1974', SPG, 1.5], ['1973', BPG, 'untracked'],
    ['n/a', SPG, 'untracked'], [null, BPG, 'untracked'], ['1966-67', PPG, 5], [null, PPG, 5],
  ];
  for (const [yf, c, expected] of cases) {
    const v = valueFor(entry(yf), c);
    const got = v.ok ? v.value : v.reason;
    if (got !== expected) fail(`year_from ${yf} on ${c.key}: got ${got}, expected ${expected}`);
  }
  console.log(`   ${cases.length} cases`);
}

begin(9, 'per game rounds to one decimal, totals stay whole, nothing is invented');
{
  const one = (cols, games = 100) => buildTeamPool('Atlanta Hawks', [ros('Fixture Round')], [rec('Fixture Round', 'ATL', games, cols)]).entries[0];
  const THREES = def('Career Three Pointers Made');
  const GP = def('Career Games Played');
  const cases = [
    [one({ points: 2049 }), PPG, 20.5], [one({ points: 2044 }), PPG, 20.4], [one({ three_p: 1234 }), THREES, 1234],
    [one({}, 777), GP, 777], [one({}), PPG, 'missing'], [one({ points: 900 }, 0), PPG, 'missing'], [one({ three_p: null }), THREES, 'missing'],
  ];
  for (const [entry, c, expected] of cases) {
    const v = valueFor(entry, c);
    const got = v.ok ? v.value : v.reason;
    if (got !== expected) fail(`${c.key}: got ${got}, expected ${expected}`);
  }
  console.log(`   ${cases.length} cases`);
}

begin(10, 'source: no model, no edge function, no NBA offline judge, points follow the score');
{
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const read = f => fs.readFileSync(`${ROOT}/${f}`, 'utf8').replace(/\r\n/g, '\n');
  let hookSrc = read('src/hooks/useNbaLineup.ts');
  const mutateHook = (from, to) => {
    if (hookSrc.split(from).length - 1 !== 1) abort(`control ${CONTROL}: its anchor is not in the hook exactly once`);
    hookSrc = hookSrc.replace(from, to);
    console.log(`CONTROL ${CONTROL} ON: an in memory copy of the hook`);
  };
  if (CONTROL === 'aiverdict') mutateHook('      setResult(scored);', "      await fetch('/functions/v1/nba-evaluate-lineup');\n      setResult(scored);");
  if (CONTROL === 'flatpoints') mutateHook('    result ? nbaFivePoints(result.score) : 0,', '    result ? 500 : 0,');
  const hook = strip(hookSrc);
  const page = strip(read('src/pages/NbaLineup.tsx'));
  const judge = strip(read('src/lib/localLineupEval.ts'));
  for (const banned of ['functions/v1', 'nba-evaluate-lineup', 'nba-validate-player', 'localEvaluateNbaFive', 'ai.gateway', 'LOVABLE_API_KEY']) {
    if (hook.includes(banned)) fail(`the hook's code holds "${banned}"`);
    if (page.includes(banned)) fail(`the page's code holds "${banned}"`);
  }
  if (/localEvaluateNbaFive|bref_nba_player_seasons/.test(judge)) fail("the offline judge's NBA half is back");
  if (!/export async function localEvaluateSoccerXI/.test(judge)) fail("the soccer judge is gone, it is Build Your XI's");
  const call = hook.match(/useGameCompletion\(([\s\S]*?)\);/);
  if (!call) fail('the hook records no completion');
  else {
    if (!call[1].includes('nbaFivePoints(result.score)')) fail('the completion does not record nbaFivePoints(result.score)');
    if (/\b500\b/.test(call[1])) fail('the completion records a flat 500');
  }
  if (/verdict\./.test(page)) fail('the page still prints a verdict object');
  if (/\bAI\b/.test(page)) fail('the page still says AI');
  console.log('   hook and page call no model or edge function; the completion records the score');
}

begin(11, 'every refusal names the player and carries no dash');
{
  const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  let n = 0;
  for (const c of NBA_FIVE_CHALLENGES) {
    for (const reason of ['no-record', 'namesake', 'untracked', 'missing']) {
      const text = refusalText(reason, 'Fixture Name', c);
      if (!text.includes('Fixture Name')) fail(`${reason} on ${c.key} does not name the player`);
      if (dashes.some(d => text.includes(d))) fail(`${reason} on ${c.key} carries a dash`);
      n += 1;
    }
  }
  if (!refusalText('untracked', 'Fixture Name', PPG).includes('1973-74')) fail('the untracked refusal does not say when counting began');
  console.log(`   ${n} refusals`);
}

begin(12, "points are the score on the old 500 scale, and the hit mark is NBA Stat Line's");
{
  for (const [s, want] of [[100, 500], [0, 0], [79, 395], [78.6, 395], [-5, 0], [120, 500]]) {
    if (nbaFivePoints(s) !== want) fail(`nbaFivePoints(${s}) = ${nbaFivePoints(s)}, expected ${want}`);
  }
  const statLine = fs.readFileSync(`${ROOT}/src/lib/nbaStatLine.ts`, 'utf8').match(/^export const HIT_SCORE = (\d+);/m);
  if (!statLine) fail("NBA Stat Line's HIT_SCORE line is not where this check reads it");
  else if (Number(statLine[1]) !== lib.NBA_FIVE_HIT_SCORE) fail(`the hit mark is ${lib.NBA_FIVE_HIT_SCORE}, NBA Stat Line's is ${statLine[1]}`);
  console.log(`   6 cases; hit mark ${lib.NBA_FIVE_HIT_SCORE}, Stat Line's ${statLine?.[1]}`);
}

console.log('');
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* the temp folder is the OS's to clear */ }
const red = [...failedSections].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (want.every(s => failedSections.has(s))) {
    console.log(`simNbaStartingFive CONTROL ${CONTROL} FIRED: section ${want.join(' and ')} went red as it must (red sections: ${red.join(', ')})`);
    process.exit(1);
  }
  console.error(`simNbaStartingFive CONTROL ${CONTROL} DID NOT FIRE: expected section ${want.join(' and ')} red, red sections: ${red.join(', ') || 'none'}`);
  process.exit(3);
}
if (failures) {
  console.error(`simNbaStartingFive: RED, ${failures} failure${failures === 1 ? '' : 's'} in section ${red.join(', ')}`);
  process.exit(1);
}
console.log('simNbaStartingFive: green. 12 sections: every number from the record, every five scored against what its teams allowed.');
