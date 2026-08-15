/**
 * Round 123 harness: are the awards in the four US career sims SCARCE?
 *
 * simCareerRealism.mjs asks whether a season's numbers look like the sport.
 * This one asks the question that sits on top of it: given those numbers, did
 * you actually beat anybody to the trophy. It exists because for a hundred
 * and twenty two rounds the answer was no, and nothing was watching.
 *
 * Measured over 300 full careers per sport in August 2026, before this file:
 *   a MEDIAN NFL career collected ten first team All-Pro seasons, against a
 *   real record of ten held jointly by Jerry Rice and Jim Otto;
 *   a MEDIAN NHL career collected eight All-Star selections;
 *   NBA MVP was gated at ovr >= 92, the best peak the engine ever produced
 *   was 91, so it fired ZERO times in 300 careers, and MLB MVP and Cy Young
 *   never fired either.
 *
 * So this checks both directions, and that is the point. Round 98 added a
 * two sided check on stat spread for exactly this reason: an award that never
 * fires is the same bug as an award that always fires, and a harness that
 * only guards one end invites the next round to overcorrect straight through
 * the other. Five things get asserted:
 *
 *   1. The MEDIAN career wins nothing. Most players never win anything.
 *   2. The top is REACHABLE. An elite career wins a major award a real
 *      fraction of the time, so no repeat of the ovr >= 92 gate.
 *   3. Nobody beats the real all-time record for that award. Every record
 *      below was web searched and the holder is named on the line.
 *   4. Awards track ABILITY. A 90 ceiling player collects far more than a 74
 *      ceiling one, tested paired on identical seeds.
 *   5. Nothing is TOO SCARCE either. If a future change switches an award
 *      off, this goes red.
 *
 * Run: node scripts/simAwards.mjs [careersPerPosition]
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/simAwardsEntry.mjs';
const OUT = '/tmp/simAwards.bundle.mjs';

/* Two stage entry with a localStorage stub, the same shape simUsCoaching.mjs
   uses. The engines pull in life event modules that touch storage at import
   time, so bundling them straight from src explodes without it. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
export const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
export const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
export const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
export const awards = await import('${ROOT}/src/lib/careerAwards.ts');
`);

await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
});

const { nfl, nba, mlb, nhl, awards } = await import(pathToFileURL(OUT).href);

const PER_POS = Number(process.argv[2] || 260);
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const DASH = /[–—]/;

const POS = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'],
  nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
  nhl: ['C', 'LW', 'RW', 'D', 'G'],
};

/**
 * Seeded rng, so a career replays exactly and the two ability arms below are
 * genuinely PAIRED: seed 41 draws the same position, the same archetype and
 * the same run of luck whether it is the 90 ceiling arm or the 74 one, and
 * the only difference left is the ceiling. simCareerEngaged.mjs makes the
 * same argument for soccer, where it hands both arms the same rolled
 * potential so the comparison is about play and not about the dice.
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const everPct = a => (a.length ? (a.filter(x => x > 0).length / a.length) * 100 : 0);

/**
 * One career, start to retirement.
 *
 * ceiling controls how good this player gets. It sets the potential AND
 * starts him nine rating points below it, because in all four engines growth
 * only runs while a player is 26 or younger and tops out around one or two
 * points a year. Raising c.pot alone does nothing at all: the first draft of
 * this harness forced pot to 95 and the median peak did not move off 80,
 * because the growth window binds long before the ceiling does. Nine points
 * is roughly what a player can actually climb, so ceiling minus nine lands
 * him on the ceiling in his prime.
 */
function runCareer(sport, pos, rng, ceiling) {
  const apply = c => {
    if (ceiling) { c.pot = ceiling; c.ovr = Math.max(58, ceiling - 9); }
    return c;
  };
  let c, tq = null, guard = 0;
  if (sport === 'nfl') {
    const arch = nfl.ARCHETYPES[pos][Math.floor(rng() * nfl.ARCHETYPES[pos].length)];
    c = apply(nfl.startCareer('Sim', pos, arch, rng, null));
    while (!c.retired && guard++ < 30) {
      tq = nfl.rollTeamQuality(tq, rng); nfl.simSeason(c, tq, rng); nfl.progress(c, rng);
      if (nfl.shouldRetire(c)) c.retired = true;
    }
  } else if (sport === 'nba') {
    const arch = nba.NBA_ARCHETYPES[pos][Math.floor(rng() * nba.NBA_ARCHETYPES[pos].length)];
    c = apply(nba.startNbaCareer('Sim', pos, arch, rng, null));
    while (!c.retired && guard++ < 30) {
      tq = nba.nbaRollTeamQuality(tq, rng); nba.simNbaSeason(c, tq, rng); nba.nbaProgress(c, rng);
      if (nba.nbaShouldRetire(c)) c.retired = true;
    }
  } else if (sport === 'mlb') {
    const arch = mlb.MLB_ARCHETYPES[pos][Math.floor(rng() * mlb.MLB_ARCHETYPES[pos].length)];
    c = apply(mlb.startMlbCareer('Sim', pos, arch, rng, null));
    while (!c.retired && guard++ < 30) {
      tq = mlb.mlbRollTeamQuality(tq, rng); mlb.simMlbSeason(c, tq, rng); mlb.mlbProgress(c, rng);
      if (mlb.mlbShouldRetire(c)) c.retired = true;
    }
  } else {
    const arch = nhl.NHL_ARCHETYPES[pos][Math.floor(rng() * nhl.NHL_ARCHETYPES[pos].length)];
    c = apply(nhl.startNhlCareer('Sim', pos, arch, rng, null));
    while (!c.retired && guard++ < 30) {
      tq = nhl.nhlRollTeamQuality(tq, rng); nhl.simNhlSeason(c, tq, rng); nhl.nhlProgress(c, rng);
      if (nhl.nhlShouldRetire(c)) c.retired = true;
    }
  }
  const won = {};
  let total = 0;
  for (const s of c.seasons) for (const a of s.awards) { won[a] = (won[a] || 0) + 1; total += 1; }
  return {
    pos, won, total, seasons: c.seasons.length,
    peak: c.seasons.reduce((b, s) => Math.max(b, s.ovr || 0), 0),
  };
}

/** One arm: every position, PER careers each, seeds shared across arms. */
function arm(sport, per, ceiling) {
  const rows = [];
  for (let p = 0; p < POS[sport].length; p++) {
    for (let i = 0; i < per; i++) {
      // The seed encodes sport, position and index but NOT the ceiling, which
      // is what makes elite and weak a paired comparison.
      const seed = (p + 1) * 1000003 + i * 7919 + sport.charCodeAt(0) * 31;
      rows.push(runCareer(sport, POS[sport][p], mulberry32(seed), ceiling));
    }
  }
  return rows;
}

const countOf = (rows, name) => rows.map(r => r.won[name] || 0);

/* ================================================================== */
/* The real all-time records                                          */
/* ================================================================== */

/* Every one of these was web searched in August 2026 and the holder is
   named, because the owner's first rule is that data is either verified or
   it does not go in. Anything I could not pin to a source is not asserted on
   at all, which is why there is no Gold Glove or Silver Slugger line here. */
const RECORDS = {
  nfl: {
    'All-Pro': [10, 'Jerry Rice and Jim Otto, per Pro Football Reference career leaders'],
    'MVP': [5, 'Peyton Manning'],
    'Defensive Player of the Year': [3, 'Lawrence Taylor, J.J. Watt and Aaron Donald'],
  },
  nba: {
    'All-NBA': [21, 'LeBron James, per NBA.com'],
    'MVP': [6, 'Kareem Abdul-Jabbar'],
    'Defensive Player of the Year': [4, 'Dikembe Mutombo, Ben Wallace and Rudy Gobert'],
    'Finals MVP': [6, 'Michael Jordan'],
    'Scoring Champion': [10, 'Michael Jordan, per NBA.com'],
  },
  mlb: {
    'All-Star': [25, 'Hank Aaron, 25 appearances in 21 seasons because there were two games a year from 1959 to 1962'],
    'MVP': [7, 'Barry Bonds, per MLB.com'],
    'Cy Young': [7, 'Roger Clemens, per MLB.com'],
  },
  nhl: {
    'All-Star': [23, 'Gordie Howe, 23 All-Star Game appearances'],
    'Hart': [9, 'Wayne Gretzky'],
    'Norris': [8, 'Bobby Orr'],
    'Vezina': [7, 'Jacques Plante'],
    'Conn Smythe': [3, 'Patrick Roy, the only three time winner'],
    'Art Ross': [10, 'Wayne Gretzky'],
  },
};

/**
 * The award a sport hangs its whole hierarchy off, and the one below it.
 * major is the MVP class trophy, allLeague is the everybody-knows-your-name
 * honour. Hockey's major is three different trophies depending on where you
 * play, so it is a list.
 */
const MAJOR = {
  nfl: ['MVP', 'Defensive Player of the Year'],
  nba: ['MVP'],
  mlb: ['MVP', 'Cy Young'],
  nhl: ['Hart', 'Norris', 'Vezina'],
};
const ALL_LEAGUE = { nfl: 'All-Pro', nba: 'All-NBA', mlb: 'All-Star', nhl: 'All-Star' };

/**
 * Who is even allowed to win the major, for the reachability check below.
 *
 * Only football needs this and it is not a fudge. A kicker cannot win MVP and
 * cannot win Defensive Player of the Year either, by design since Round 56,
 * so counting kickers in the denominator of "how often does an elite career
 * win a major" measures the wrong thing: it drags the answer down in exact
 * proportion to how many positions the sim offers, which has nothing to do
 * with whether the award is reachable. The first run of this harness did
 * exactly that and reported 14 percent, one eighth of which was kickers who
 * were never in the running. Baseball and hockey need no list because every
 * position has a major it can chase, and basketball has one award for
 * everyone.
 */
const MAJOR_POS = { nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE'] };
const majorEligible = (sport, rows) =>
  (MAJOR_POS[sport] ? rows.filter(r => MAJOR_POS[sport].includes(r.pos)) : rows);

/**
 * How often an elite career must win at least one major.
 *
 * The floor is 20 percent and the reasoning is the real hierarchy of the
 * awards rather than a number that felt nice. A 90 ceiling career in these
 * engines is a perennial all-league player, not an inner circle immortal: the
 * engines peak around 87 to 92 and this arm is pinned at the top of that. Of
 * real players at that level a clear minority, but nowhere near none, win a
 * major. Kareem Abdul-Jabbar has six MVPs and Wayne Gretzky nine Harts, and
 * both are the record; the great majority of Hall of Famers have zero.
 *
 * The ceiling is 90 percent, because a major award that a strong career picks
 * up almost every time is the Round 122 bug back again with better manners.
 */
const REACH_LO = 20;
const REACH_HI = 90;

console.log(`Running ${PER_POS} careers per position per arm, seeded and paired\n`);

const DATA = {};
for (const sport of SPORTS) {
  DATA[sport] = {
    natural: arm(sport, PER_POS, null),
    elite: arm(sport, Math.max(60, Math.round(PER_POS / 3)), 90),
    // 74 rather than 70. At a 70 ceiling the NBA engine starts a rookie at 61
    // and retires him before he plays a second season, so there is no career
    // left to compare; 74 is the lowest ceiling that produces a real career in
    // all four sports.
    weak: arm(sport, Math.max(60, Math.round(PER_POS / 3)), 74),
  };
}

/* ---------- 1. The median career wins nothing ---------- */
console.log('1) The median career wins nothing, and most careers win nothing at all');
for (const sport of SPORTS) {
  const rows = DATA[sport].natural;
  const majors = majorEligible(sport, rows).map(r => MAJOR[sport].reduce((a, m) => a + (r.won[m] || 0), 0));
  const league = countOf(rows, ALL_LEAGUE[sport]);
  const nothing = (rows.filter(r => r.total === 0).length / rows.length) * 100;
  console.log(`   ${sport.toUpperCase()} ${rows.length} careers, median ${median(rows.map(r => r.seasons))} seasons, peak p50 ${median(rows.map(r => r.peak))}`);
  console.log(`        major ${MAJOR[sport].join('/')}: median ${median(majors)}, mean ${mean(majors).toFixed(2)}, p95 ${pct(majors, 0.95)}, max ${Math.max(...majors)}, ever won ${everPct(majors).toFixed(1)}%`);
  console.log(`        ${ALL_LEAGUE[sport].padEnd(8)}: median ${median(league)}, mean ${mean(league).toFixed(2)}, p95 ${pct(league, 0.95)}, max ${Math.max(...league)}, ever won ${everPct(league).toFixed(1)}%`);
  console.log(`        ${nothing.toFixed(0)}% of careers finished with an empty trophy case`);
  if (median(majors) !== 0) fail(`${sport}: the median career wins ${median(majors)} of ${MAJOR[sport].join('/')}`);
  if (median(league) !== 0) fail(`${sport}: the median career wins ${median(league)} ${ALL_LEAGUE[sport]} selections`);
  if (everPct(majors) > 25) fail(`${sport}: ${everPct(majors).toFixed(0)}% of all careers win a major, that is not a major`);
  if (everPct(league) > 70) fail(`${sport}: ${everPct(league).toFixed(0)}% of all careers make an all-league team`);
}

/* ---------- 2. The top is reachable, and 5. it is not switched off ---------- */
console.log('\n2) An elite career can actually win the big one (and 5, the awards are not switched off)');
for (const sport of SPORTS) {
  const el = DATA[sport].elite;
  const nat = DATA[sport].natural;
  const majors = majorEligible(sport, el).map(r => MAJOR[sport].reduce((a, m) => a + (r.won[m] || 0), 0));
  const league = countOf(el, ALL_LEAGUE[sport]);
  const reach = everPct(majors);
  console.log(`   ${sport.toUpperCase()} 90-ceiling careers: major median ${median(majors)}, mean ${mean(majors).toFixed(2)}, won at least one ${reach.toFixed(1)}% | ${ALL_LEAGUE[sport]} mean ${mean(league).toFixed(2)}`);
  if (reach < REACH_LO) fail(`${sport}: an elite career wins ${MAJOR[sport].join('/')} only ${reach.toFixed(1)}% of the time, the top is out of reach again`);
  if (reach > REACH_HI) fail(`${sport}: an elite career wins ${MAJOR[sport].join('/')} ${reach.toFixed(1)}% of the time, the award means nothing`);
  if (mean(league) < 1) fail(`${sport}: an elite career averages only ${mean(league).toFixed(2)} ${ALL_LEAGUE[sport]} selections`);
  // and the too scarce guard on the ordinary population: switching an award
  // off entirely has to be a build failure, not a quiet regression.
  const natLeague = countOf(nat, ALL_LEAGUE[sport]);
  if (everPct(natLeague) < 5) fail(`${sport}: only ${everPct(natLeague).toFixed(1)}% of careers ever make an all-league team, the award has been switched off`);
  if (mean(natLeague) <= 0) fail(`${sport}: nobody in ${nat.length} careers made an all-league team`);
}

/* ---------- 3. Nobody beats the real record ---------- */
console.log('\n3) No career beats the real all-time record');
{
  /* Checked over the NATURAL population, which is the game as a player
     actually gets it. The 90 ceiling arm is a deliberate probe pinned at the
     very top of what the engines can build and is not a career the game
     hands out, so holding it to a single man's all-time record would be
     testing the probe rather than the game. Its medians are checked instead,
     which is the part that would move if an award came loose. */
  for (const sport of SPORTS) {
    const nat = DATA[sport].natural;
    const el = DATA[sport].elite;
    for (const [name, [record, holder]] of Object.entries(RECORDS[sport])) {
      const counts = countOf(nat, name);
      const hi = Math.max(...counts, 0);
      const eliteMed = median(countOf(el, name));
      console.log(`   ${sport.toUpperCase()} ${name.padEnd(30)} best career ${String(hi).padStart(2)} vs record ${String(record).padStart(2)} (${holder.split(',')[0]}), elite median ${eliteMed}`);
      if (hi > record) fail(`${sport}: a career won ${hi} ${name}, beating the real record of ${record} held by ${holder}`);
      if (eliteMed > record) fail(`${sport}: the MEDIAN elite career wins ${eliteMed} ${name}, beating the record of ${record} held by ${holder}`);
    }
  }
}

/* ---------- 4. Awards track ability ---------- */
console.log('\n4) Awards track ability: the same seeds, two different ceilings');
for (const sport of SPORTS) {
  const el = DATA[sport].elite, wk = DATA[sport].weak;
  const eL = mean(countOf(el, ALL_LEAGUE[sport])), wL = mean(countOf(wk, ALL_LEAGUE[sport]));
  const eM = mean(majorEligible(sport, el).map(r => MAJOR[sport].reduce((a, m) => a + (r.won[m] || 0), 0)));
  const wM = mean(majorEligible(sport, wk).map(r => MAJOR[sport].reduce((a, m) => a + (r.won[m] || 0), 0)));
  const eT = mean(el.map(r => r.total)), wT = mean(wk.map(r => r.total));
  console.log(`   ${sport.toUpperCase()} ceiling 90: ${eL.toFixed(2)} ${ALL_LEAGUE[sport]}, ${eM.toFixed(2)} major, ${eT.toFixed(2)} trophies of any kind`);
  console.log(`        ceiling 74: ${wL.toFixed(2)} ${ALL_LEAGUE[sport]}, ${wM.toFixed(2)} major, ${wT.toFixed(2)} trophies of any kind`);
  if (eL < wL * 4 + 0.5) fail(`${sport}: a 90 ceiling player wins ${eL.toFixed(2)} all-league nods against a 74 ceiling player's ${wL.toFixed(2)}, ability barely matters`);
  if (eT <= wT * 1.8) fail(`${sport}: a 90 ceiling player's whole trophy case (${eT.toFixed(2)}) is barely bigger than a 74 ceiling player's (${wT.toFixed(2)})`);
  if (eM <= wM) fail(`${sport}: a 74 ceiling player wins as many majors as a 90 ceiling one`);
}

/* ---------- 6. Same seed, same career ---------- */
console.log('\n6) A seeded career replays exactly');
{
  let checked = 0;
  for (const sport of SPORTS) {
    for (const pos of POS[sport].slice(0, 3)) {
      const a = runCareer(sport, pos, mulberry32(20260815), null);
      const b = runCareer(sport, pos, mulberry32(20260815), null);
      checked += 1;
      if (JSON.stringify(a.won) !== JSON.stringify(b.won) || a.seasons !== b.seasons) {
        fail(`${sport} ${pos}: the same seed produced two different careers, the award model is not reading the engine's rng`);
      }
    }
  }
  console.log(`   ${checked} seeded careers replayed identically`);
}

/* ---------- 7. Nothing a player reads has a dash in it ---------- */
console.log('\n7) Copy check');
{
  const seen = new Set();
  for (const sport of SPORTS) for (const r of DATA[sport].natural) for (const k of Object.keys(r.won)) seen.add(k);
  for (const name of seen) if (DASH.test(name)) fail(`an em or en dash reached an award name: ${name}`);
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/careerAwards.ts'), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (DASH.test(line)) fail(`careerAwards.ts:${i + 1} has an em or en dash`);
  });
  console.log(`   ${seen.size} distinct award names across all four sports, all clean`);
}

/* ---------- 8. The bar sits somewhere a season can reach ---------- */
console.log('\n8) Where the bar actually sits, in each engine\'s own scoring units');
{
  const rowsFor = [
    ['nfl', 'allPro', 'QB'], ['nfl', 'nflMvp', 'QB'], ['nfl', 'allPro', 'TE'], ['nfl', 'nflDpoy', 'EDGE'],
    ['nba', 'allNba', 'SF'], ['nba', 'nbaMvp', 'SF'],
    ['mlb', 'mlbAllStar', '1B'], ['mlb', 'mlbMvp', '1B'], ['mlb', 'mlbCy', 'SP'],
    ['nhl', 'nhlAllStar', 'C'], ['nhl', 'nhlMajor', 'C'], ['nhl', 'nhlMajor', 'G'],
  ];
  for (const [sport, award, pos] of rowsFor) {
    const bar = awards.awardBar(sport, award, pos);
    console.log(`   ${sport} ${award.padEnd(11)} ${pos.padEnd(3)} typical winning season needs about ${bar === null ? 'n/a' : bar.toFixed(1)}`);
    if (bar === null) fail(`${sport} ${award} ${pos} has no field configured`);
  }
  // A kicker is not eligible for MVP and a defender chases DPOY instead.
  // That is Round 56 behaviour and it has to survive this round.
  if (awards.awardBar('nfl', 'nflMvp', 'K') !== null) fail('a kicker is eligible for NFL MVP');
  if (awards.awardBar('nfl', 'nflMvp', 'EDGE') !== null) fail('an edge rusher is eligible for NFL MVP');
  if (awards.awardBar('nfl', 'nflDpoy', 'QB') !== null) fail('a quarterback is eligible for Defensive Player of the Year');
  console.log('   kickers and defenders are still locked out of MVP, defenders still chase DPOY');
}

fs.rmSync(OUT, { force: true });
console.log(failures === 0 ? '\nPASS: ALL AWARD SCARCITY CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
