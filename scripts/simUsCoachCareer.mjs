/**
 * Round 126 harness: the WIRED coaching career, in all four US sports.
 *
 * simUsCoaching.mjs already proves the Round 113 market is fair. It proves it
 * about a hand built profile object, which is exactly the thing that was true
 * for thirteen rounds while no page in the site imported any of it.
 *
 * This one drives the path a player actually walks: play a real career through
 * the real engine, retire, land on the job board, take a job, coach seasons,
 * get fired, sit out, get hired again, and come out the other side with a
 * record. Every number below is measured over hundreds of careers per sport.
 *
 * What it would catch:
 *   1. retirement not reaching the job board at all
 *   2. a great player and a journeyman getting the same market
 *   3. the empty window disappearing, or becoming the norm for a good candidate
 *   4. a firing quietly handing you another job, which is the whole rule
 *   5. the standing not moving with results, in either direction
 *   6. a save that will not survive JSON, or an old save that will not open
 *   7. English pyramid language leaking into an American game
 *   8. an em or en dash reaching a player
 *
 * Run: node scripts/simUsCoachCareer.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/usCoachCareerEntry.mjs';
const OUT = '/tmp/usCoachCareer.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const wire = await import('${ROOT}/src/lib/usCoachCareer.ts');
export const coach = await import('${ROOT}/src/lib/usCareerToCoach.ts');
export const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
export const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
export const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
export const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
export const dNba = await import('${ROOT}/src/data/conquestDataNba.ts');
export const dMlb = await import('${ROOT}/src/data/conquestDataMlb.ts');
export const dNhl = await import('${ROOT}/src/data/conquestDataNhl.ts');
`);

await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
});

const { wire, coach, nfl, nba, mlb, nhl, dNba, dMlb, dNhl } = await import(pathToFileURL(OUT).href);
const {
  startCoachCareer, acceptCoachOffer, playCoachSeason, sitOutCoachSeason,
  refreshCoachOffers, ensureCoachCareer, coachOutlook, coachHotSeat,
  coachTotals, coachVerdict, formatCoachRecord, coachSportShape,
} = wire;
const { coachStanding, bestCoachTierAvailable, coachTierLabel } = coach;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const DASH = /[–—]/;
/* Nobody gets relegated in America. If any of these reaches a player the round
   did the one thing it was told not to do. "promotion" is excluded on purpose:
   an American assistant absolutely does get promoted, so the word is fine and
   only the pyramid words are not. */
const ENGLISH = /\b(relegat\w*|the drop|survival|non league|second division|third tier of English)\b/i;

const ENGINE_TEAMS = {
  nfl: new Set(nfl.NFL_TEAM_NAMES.map(t => t.label)),
  nba: new Set(dNba.NBA_TEAMS.map(t => `${t.city} ${t.name}`)),
  mlb: new Set(dMlb.MLB_TEAMS.map(t => `${t.city} ${t.name}`)),
  nhl: new Set(dNhl.NHL_TEAMS.map(t => `${t.city} ${t.name}`)),
};

/* ---------- play a real career through the real engine ---------- */
const runners = {
  nfl: () => {
    const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
    const pos = POS[Math.floor(Math.random() * POS.length)];
    const arch = nfl.ARCHETYPES[pos][Math.floor(Math.random() * nfl.ARCHETYPES[pos].length)];
    const c = nfl.startCareer('Sim', pos, arch, Math.random, null);
    let tq = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      tq = nfl.rollTeamQuality(tq, Math.random);
      nfl.simSeason(c, tq, Math.random);
      nfl.progress(c, Math.random);
      if (nfl.shouldRetire(c)) c.retired = true;
    }
    return c;
  },
  nba: () => {
    const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
    const pos = POS[Math.floor(Math.random() * POS.length)];
    const arch = nba.NBA_ARCHETYPES[pos][Math.floor(Math.random() * nba.NBA_ARCHETYPES[pos].length)];
    const c = nba.startNbaCareer('Sim', pos, arch, Math.random, null);
    let tq = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      tq = nba.nbaRollTeamQuality(tq, Math.random);
      nba.simNbaSeason(c, tq, Math.random);
      nba.nbaProgress(c, Math.random);
      if (nba.nbaShouldRetire(c)) c.retired = true;
    }
    return c;
  },
  mlb: () => {
    const POS = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
    const pos = POS[Math.floor(Math.random() * POS.length)];
    const arch = mlb.MLB_ARCHETYPES[pos][Math.floor(Math.random() * mlb.MLB_ARCHETYPES[pos].length)];
    const c = mlb.startMlbCareer('Sim', pos, arch, Math.random, null);
    let tq = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      tq = mlb.mlbRollTeamQuality(tq, Math.random);
      mlb.simMlbSeason(c, tq, Math.random);
      mlb.mlbProgress(c, Math.random);
      if (mlb.mlbShouldRetire(c)) c.retired = true;
    }
    return c;
  },
  nhl: () => {
    const POS = ['C', 'LW', 'RW', 'D', 'G'];
    const pos = POS[Math.floor(Math.random() * POS.length)];
    const arch = nhl.NHL_ARCHETYPES[pos][Math.floor(Math.random() * nhl.NHL_ARCHETYPES[pos].length)];
    const c = nhl.startNhlCareer('Sim', pos, arch, Math.random, null);
    let tq = null, guard = 0;
    while (!c.retired && guard++ < 30) {
      tq = nhl.nhlRollTeamQuality(tq, Math.random);
      nhl.simNhlSeason(c, tq, Math.random);
      nhl.nhlProgress(c, Math.random);
      if (nhl.nhlShouldRetire(c)) c.retired = true;
    }
    return c;
  },
};

const N = Number(process.env.CAREERS || 400);
const YEARS = Number(process.env.YEARS || 20);

const strings = [];
const seeString = (s, where) => {
  if (typeof s !== 'string' || !s) return;
  strings.push(s);
  if (DASH.test(s)) fail(`an em or en dash reached ${where}: ${s}`);
  if (ENGLISH.test(s)) fail(`English pyramid language reached ${where}: ${s}`);
};

/**
 * Drive one whole life: retire, hunt, take whatever is on the table, coach
 * until the game stops giving you anything, and record what happened. This is
 * exactly the loop the four boards run, one button at a time.
 */
function liveIt(sport, career) {
  let s = startCoachCareer(sport, career, 2046, Math.random);
  seeString(s.offerNote, 'the first job hunt note');
  const trace = {
    rep: s.profile.playingRep,
    firstOffers: s.offers.length,
    /** Was there a head coaching job on the retirement board at all? */
    firstHeadOffer: s.offers.some(o => o.tier <= 3),
    firstTier: s.profile.lastTier,
    everHired: false,
    everHeadCoach: false,
    everFired: false,
    rehiredAfterFiring: false,
    seasonsCoached: 0,
    headSeasons: 0,
    staffSeasons: 0,
    yearsOut: 0,
    rings: 0,
    emptyWindows: 0,
    windows: 0,
    standingStart: coachStanding(s.profile),
    standingEnd: 0,
    poached: 0,
  };
  let firedOnce = false;

  for (let y = 0; y < YEARS; y++) {
    if (s.unemployed) {
      trace.windows += 1;
      if (s.offers.length === 0) trace.emptyWindows += 1;
      for (const o of s.offers) {
        seeString(o.brief, 'an offer brief');
        seeString(o.reason, 'an offer reason');
        seeString(o.roster, 'an offer roster line');
        if (!ENGINE_TEAMS[sport].has(o.team)) fail(`${sport}: an offer named "${o.team}", which is not a real franchise`);
      }
      if (s.offers.length > 0) {
        // Take the best thing on the table, which is what a player does.
        let best = 0;
        for (let i = 1; i < s.offers.length; i++) if (s.offers[i].tier < s.offers[best].tier) best = i;
        s = acceptCoachOffer(s, best);
        trace.everHired = true;
        if (firedOnce) trace.rehiredAfterFiring = true;
        // and straight into the season, the way the hire actually works
      } else {
        const out = sitOutCoachSeason(s, Math.random);
        s = out.state;
        out.notes.forEach(n => seeString(n, 'a sit out note'));
        trace.yearsOut += 1;
        continue;
      }
    }
    const before = s.job.team;
    const r = playCoachSeason(s, Math.random);
    s = r.state;
    r.notes.forEach(n => seeString(n, 'a coaching season note'));
    const row = s.results[s.results.length - 1];
    seeString(row.line, 'a season line');
    trace.seasonsCoached += 1;
    if (row.tier <= 3) { trace.headSeasons += 1; trace.everHeadCoach = true; } else trace.staffSeasons += 1;
    if (row.champion && row.tier <= 3) trace.rings += 1;
    if (row.departure) { trace.everFired = true; firedOnce = true; }
    if (!row.departure && s.job && s.job.team !== before) trace.poached += 1;
    const shape = coachSportShape(sport);
    const played = row.wins + row.losses + row.otl;
    if (played !== shape.games) fail(`${sport}: a season came back ${played} games long, expected ${shape.games}`);
    seeString(coachHotSeat(s).line, 'the hot seat line');
  }
  trace.standingEnd = coachStanding(s.profile);
  seeString(coachVerdict(s), 'the coaching verdict');
  seeString(coachOutlook(s).blurb, 'the outlook blurb');
  return { trace, state: s };
}

/* ---------- 1. Retirement always reaches the job board ---------- */
console.log(`1) Retirement lands on a job board, ${N} careers a sport`);
const LIVES = {};
{
  for (const sport of SPORTS) {
    const lives = [];
    for (let i = 0; i < N; i++) {
      const c = runners[sport]();
      if (!c.retired) fail(`${sport}: the engine never retired the player`);
      const { trace, state } = liveIt(sport, c);
      if (!state.profile) fail(`${sport}: a retirement produced no coaching profile`);
      if (!Array.isArray(state.offers)) fail(`${sport}: the offer feed was not an array`);
      lives.push(trace);
    }
    LIVES[sport] = lives;
    const mean = f => lives.reduce((a, l) => a + f(l), 0) / lives.length;
    const pct = f => (lives.filter(f).length / lives.length) * 100;
    console.log(`   ${sport.toUpperCase()} rep ${mean(l => l.rep).toFixed(0)} avg | ${pct(l => l.firstOffers > 0).toFixed(0)}% got an offer on retirement day, ${pct(l => l.firstHeadOffer).toFixed(0)}% of those boards had a head coaching job on it`);
    console.log(`        ${mean(l => l.headSeasons).toFixed(1)} seasons as a head coach, ${mean(l => l.staffSeasons).toFixed(1)} on a staff, ${mean(l => l.yearsOut).toFixed(1)} out of work, of ${YEARS} | ${pct(l => l.everHeadCoach).toFixed(0)}% ever ran a team | ${pct(l => l.everFired).toFixed(0)}% fired at least once | ${pct(l => l.rehiredAfterFiring).toFixed(0)}% worked again after a firing | ${mean(l => l.poached).toFixed(2)} poached by a bigger job`);
    if (pct(l => l.everHired) < 55) fail(`${sport}: only ${pct(l => l.everHired).toFixed(0)} percent of retirees ever got a coaching job at all, which kills the mode`);
    /* The American shape: a staff seat is nearly always findable and the chair
       is not. If a majority of retirement boards carry a head coaching job then
       the scarce thing stopped being scarce. */
    if (pct(l => l.firstHeadOffer) > 50) fail(`${sport}: ${pct(l => l.firstHeadOffer).toFixed(0)} percent of retirement boards had a head coaching job on them, so running a franchise is not a thing you earn`);
    if (pct(l => l.everHeadCoach) < 20) fail(`${sport}: only ${pct(l => l.everHeadCoach).toFixed(0)} percent ever ran a team in ${YEARS} seasons, so the climb off a staff does not work`);
    if (pct(l => l.everHeadCoach) > 97) fail(`${sport}: ${pct(l => l.everHeadCoach).toFixed(0)} percent ended up running a team, so nobody is stuck`);
    if (mean(l => l.seasonsCoached) > YEARS * 0.96) fail(`${sport}: ${mean(l => l.seasonsCoached).toFixed(1)} of ${YEARS} seasons were spent employed, so being out of work is not a real place`);
    if (pct(l => l.everFired) < 40) fail(`${sport}: only ${pct(l => l.everFired).toFixed(0)} percent were ever fired in ${YEARS} seasons, which is not this sport`);
    if (pct(l => l.rehiredAfterFiring) < 20) fail(`${sport}: almost nobody works again after a firing, so a firing ends the save`);
  }
}

/* ---------- 2. A great player beats a journeyman ---------- */
console.log('2) The playing career you had decides the coaching career you get');
{
  for (const sport of SPORTS) {
    const lives = [...LIVES[sport]].sort((a, b) => a.rep - b.rep);
    const cut = Math.max(10, Math.floor(lives.length * 0.2));
    const bot = lives.slice(0, cut), top = lives.slice(-cut);
    const mean = (arr, f) => arr.reduce((a, l) => a + f(l), 0) / arr.length;
    const pct = (arr, f) => (arr.filter(f).length / arr.length) * 100;
    const row = (label, arr) =>
      `   ${sport.toUpperCase()} ${label} rep ${mean(arr, l => l.rep).toFixed(0).padStart(3)} | first offers ${mean(arr, l => l.firstOffers).toFixed(2)} | starts at T${mean(arr, l => l.firstTier).toFixed(1)} | ${pct(arr, l => l.everHired).toFixed(0)}% hired | ${mean(arr, l => l.seasonsCoached).toFixed(1)} seasons | ${mean(arr, l => l.rings).toFixed(2)} titles`;
    console.log(row('best 20%  ', top));
    console.log(row('worst 20% ', bot));
    if (mean(top, l => l.firstOffers) <= mean(bot, l => l.firstOffers)) {
      fail(`${sport}: the best players do not get more offers on retirement day than the worst`);
    }
    if (mean(top, l => l.firstTier) >= mean(bot, l => l.firstTier)) {
      fail(`${sport}: the best players do not start at a better class of job`);
    }
    if (mean(top, l => l.seasonsCoached) <= mean(bot, l => l.seasonsCoached)) {
      fail(`${sport}: the best players do not end up coaching more`);
    }
  }
}

/* ---------- 3. The empty window is real, and is not the norm up top ---------- */
console.log('3) An empty offer board happens, and it is not what a strong candidate sees');
{
  for (const sport of SPORTS) {
    const lives = LIVES[sport];
    const windows = lives.reduce((a, l) => a + l.windows, 0);
    const empties = lives.reduce((a, l) => a + l.emptyWindows, 0);
    const sorted = [...lives].sort((a, b) => a.rep - b.rep);
    const cut = Math.max(10, Math.floor(sorted.length * 0.2));
    const top = sorted.slice(-cut), bot = sorted.slice(0, cut);
    const rate = arr => {
      const w = arr.reduce((a, l) => a + l.windows, 0);
      return w ? (arr.reduce((a, l) => a + l.emptyWindows, 0) / w) * 100 : 0;
    };
    console.log(`   ${sport.toUpperCase()} ${empties} empty boards out of ${windows} job hunts (${((empties / windows) * 100).toFixed(0)}%) | best 20% ${rate(top).toFixed(0)}% | worst 20% ${rate(bot).toFixed(0)}%`);
    if (empties === 0) fail(`${sport}: nobody in ${lives.length} careers ever opened an empty board, so silence is not real`);
    if (rate(top) > 55) fail(`${sport}: a strong candidate sees an empty board ${rate(top).toFixed(0)} percent of the time, which is not a market it is a wall`);
    if (rate(bot) <= rate(top)) fail(`${sport}: the weakest candidates do not see more empty boards than the strongest`);
  }
}

/* ---------- 4. Fired is a real place, and getting fired does not rehire you ---------- */
console.log('4) Getting fired ends the job and does not hand you another one');
{
  // Drive a coach who is going to get fired, and watch what the very same call
  // does to his employment. This is the rule the whole feature exists for.
  let rehiredOnTheSpot = 0, firings = 0, emptyOnFiring = 0;
  for (const sport of SPORTS) {
    for (let i = 0; i < 300; i++) {
      let s = startCoachCareer(sport, runners[sport](), 2046, Math.random);
      for (let y = 0; y < 14; y++) {
        if (s.unemployed) {
          if (!s.offers.length) { s = sitOutCoachSeason(s, Math.random).state; continue; }
          s = acceptCoachOffer(s, 0);
          continue;
        }
        const r = playCoachSeason(s, Math.random);
        s = r.state;
        const row = s.results[s.results.length - 1];
        if (row.departure) {
          firings += 1;
          if (s.job !== null || !s.unemployed) rehiredOnTheSpot += 1;
          if (s.offers.length === 0) emptyOnFiring += 1;
        }
      }
    }
  }
  console.log(`   ${firings} firings across the four sports, ${rehiredOnTheSpot} of them handed the coach another job on the same line`);
  console.log(`   ${((emptyOnFiring / firings) * 100).toFixed(0)} percent of firings left the coach with nothing on the board that day`);
  if (firings < 200) fail(`only ${firings} firings in 1200 careers, so getting fired is barely a thing`);
  if (rehiredOnTheSpot > 0) fail(`${rehiredOnTheSpot} firings instantly rehired the coach, which is the exact bug Round 111 fixed in the soccer game`);
  if (emptyOnFiring < 3) fail('a firing never once left the board empty');
}

/* ---------- 5. The standing moves with results ---------- */
console.log('5) Results move the standing, in the right direction');
{
  for (const sport of SPORTS) {
    /* One identical coach in one identical chair, two thousand times, and the
       seasons sorted by what actually happened. Forcing an outcome by feeding
       a scripted random number generator would break the moment somebody adds
       a roll, so this measures the real distribution instead. */
    const seed = {
      v: 1, sport, year: 2046, done: false, results: [], offers: [], openings: 0, reachable: 0, offerNote: '',
      unemployed: false,
      job: { team: [...ENGINE_TEAMS[sport]][0], tier: 2, role: 'Head Coach', brief: 'Get us in.', roster: 'A playoff team.', seasonsHere: 1 },
      profile: {
        sport, playingRep: 55, seasonsSinceRetired: 4, ringsAsCoach: 0, playoffBerths: 1,
        playoffRoundsWon: 0, losingSeasons: 1, seasonsCoached: 4, lastTier: 2,
        departure: 'firedLosing', seasonsOut: 0, playedFor: [...ENGINE_TEAMS[sport]][1], workedFor: [],
      },
    };
    const before = coachStanding(seed.profile);
    const buckets = { title: [], deep: [], missed: [] };
    for (let i = 0; i < 2000; i++) {
      const out = playCoachSeason(JSON.parse(JSON.stringify(seed)), Math.random);
      const row = out.state.results[0];
      const after = coachStanding(out.state.profile);
      if (row.champion) buckets.title.push(after);
      else if (row.roundsWon >= 2) buckets.deep.push(after);
      else if (!row.madePlayoffs) buckets.missed.push(after);
    }
    const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    const T = mean(buckets.title), D = mean(buckets.deep), M = mean(buckets.missed);
    console.log(`   ${sport.toUpperCase()} standing ${before.toFixed(1)} before | title ${T.toFixed(1)} (n=${buckets.title.length}) | deep run ${D.toFixed(1)} (n=${buckets.deep.length}) | missed ${M.toFixed(1)} (n=${buckets.missed.length})`);
    if (!buckets.title.length || !buckets.deep.length || !buckets.missed.length) fail(`${sport}: 2000 seasons at a playoff team never produced one of a title, a deep run and a miss`);
    if (T <= before) fail(`${sport}: winning a title did not raise the standing`);
    if (M >= before) fail(`${sport}: missing the playoffs did not cost anything`);
    if (T <= D || D <= M) fail(`${sport}: title ${T.toFixed(1)}, deep run ${D.toFixed(1)}, miss ${M.toFixed(1)} are not in the right order`);
  }

  // And across every career actually lived above, better records mean better
  // standings. This is the version that would catch a sign flip nobody noticed.
  for (const sport of SPORTS) {
    const lives = LIVES[sport].filter(l => l.seasonsCoached >= 3);
    const withRings = lives.filter(l => l.rings > 0);
    const without = lives.filter(l => l.rings === 0);
    if (withRings.length < 5 || without.length < 5) { console.log(`   ${sport.toUpperCase()} not enough of both to compare, skipped`); continue; }
    const mean = (arr, f) => arr.reduce((a, l) => a + f(l), 0) / arr.length;
    const a = mean(withRings, l => l.standingEnd), b = mean(without, l => l.standingEnd);
    console.log(`   ${sport.toUpperCase()} coaches who won a title end on ${a.toFixed(0)} standing, coaches who never did on ${b.toFixed(0)}`);
    if (a <= b) fail(`${sport}: winning titles as a coach does not leave you better off than never winning one`);
  }
}


/* ---------- 6. It survives a save ---------- */
console.log('6) A coaching career survives a round trip through localStorage');
{
  for (const sport of SPORTS) {
    let s = startCoachCareer(sport, runners[sport](), 2046, Math.random);
    for (let y = 0; y < 8; y++) {
      if (s.unemployed) {
        s = s.offers.length ? acceptCoachOffer(s, 0) : sitOutCoachSeason(s, Math.random).state;
      } else {
        s = playCoachSeason(s, Math.random).state;
      }
      // Every single step goes out to a string and comes back, because that is
      // what the boards do: they persist after every button.
      const round = ensureCoachCareer(JSON.parse(JSON.stringify(s)), sport);
      if (!round) { fail(`${sport}: a live coaching career would not reload`); break; }
      if (round.results.length !== s.results.length) fail(`${sport}: the coaching log lost rows across a save`);
      if (Math.abs(coachStanding(round.profile) - coachStanding(s.profile)) > 0.001) fail(`${sport}: the standing changed across a save`);
      if ((round.job?.team ?? null) !== (s.job?.team ?? null)) fail(`${sport}: the job was lost across a save`);
      s = round;
    }
  }

  // Nothing at all, which is every save written before this round.
  if (ensureCoachCareer(undefined, 'nfl') !== null) fail('a save with no coaching career did not come back null');
  if (ensureCoachCareer(null, 'nba') !== null) fail('a null save did not come back null');
  if (ensureCoachCareer({}, 'mlb') !== null) fail('an empty object did not come back null');

  // A half written one, which is what a crash mid write looks like.
  const half = ensureCoachCareer({ profile: { playingRep: 61 }, results: [{}, null] }, 'nhl');
  if (!half) fail('a half written coaching save would not repair');
  else {
    console.log(`   repaired a half written save: sport ${half.sport}, tier T${half.profile.lastTier}, ${half.results.length} log rows, standing ${coachStanding(half.profile).toFixed(0)}`);
    if (half.profile.lastTier !== 4) fail(`a missing tier repaired to T${half.profile.lastTier}, expected the staff job`);
    if (!Number.isFinite(coachStanding(half.profile))) fail('a repaired save produced a NaN standing');
    if (half.job !== null || !half.unemployed) fail('a repaired save with no job did not come back unemployed');
  }

  // The Round 113 trap, checked on the repair path this time: tier 0 is falsy,
  // and `t || 4` turns "the best job in the sport" into "somebody's assistant".
  const zero = ensureCoachCareer({ profile: { playingRep: 90, lastTier: 0 } }, 'nba');
  console.log(`   a save carrying tier 0 repaired to T${zero.profile.lastTier}, not T4`);
  if (zero.profile.lastTier !== 1) fail(`tier 0 repaired to T${zero.profile.lastTier}, so the falsy trap is back`);
}

/* ---------- 7. The record itself reads like the sport ---------- */
console.log('7) Records, ceilings and copy read like American sport');
{
  for (const sport of SPORTS) {
    const sh = coachSportShape(sport);
    console.log(`   ${sport.toUpperCase()} ${sh.games} games, ${sh.rounds} rounds to win it, ${sh.otl ? 'W-L-OTL' : 'W-L'}`);
    for (let t = 1; t <= 4; t++) seeString(coachTierLabel(t), 'a tier label');
    seeString(sh.wonIt, 'the title line');
    seeString(sh.missed, 'the missed line');
    for (const l of sh.lostIn) seeString(l, 'a playoff exit line');
  }
  if (formatCoachRecord({ wins: 12, losses: 5, otl: 0 }) !== '12-5') fail('a football record did not read 12-5');
  if (formatCoachRecord({ wins: 44, losses: 28, otl: 10 }) !== '44-28-10') fail('a hockey record did not carry the overtime losses');

  // Totals have to add up to what the log says.
  for (const sport of SPORTS) {
    let s = startCoachCareer(sport, runners[sport](), 2046, Math.random);
    for (let y = 0; y < 16; y++) {
      s = s.unemployed
        ? (s.offers.length ? acceptCoachOffer(s, 0) : sitOutCoachSeason(s, Math.random).state)
        : playCoachSeason(s, Math.random).state;
    }
    const t = coachTotals(s);
    const coached = s.results.filter(r => r.team !== 'Out of work');
    if (t.seasons !== coached.length) fail(`${sport}: the totals count ${t.seasons} seasons and the log has ${coached.length}`);
    if (t.wins !== coached.reduce((a, r) => a + r.wins, 0)) fail(`${sport}: the win total does not match the log`);
    if (t.rings !== s.profile.ringsAsCoach) fail(`${sport}: the totals and the profile disagree about titles`);
    if (t.winPct < 0 || t.winPct > 1) fail(`${sport}: a winning percentage of ${t.winPct}`);
  }
}

/* ---------- 8. Copy ---------- */
console.log('8) Copy check');
{
  console.log(`   ${strings.length} player facing strings collected while the careers ran above`);
  if (strings.length < 4000) fail(`only ${strings.length} strings were ever shown to a player, so this check is not checking much`);
  for (const f of ['src/lib/usCoachCareer.ts', 'src/components/us-career/CoachCareerPanel.tsx']) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) { fail(`${f} is missing`); continue; }
    fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
      if (DASH.test(line)) fail(`${f}:${i + 1} has an em or en dash`);
    });
  }
  // And the four boards have to be wired. A round that builds the panel and
  // forgets to import it is exactly what Round 113 did.
  for (const [dir, file] of [
    ['nfl-my-career', 'NflMyCareerBoard.tsx'],
    ['nba-my-career', 'NbaMyCareerBoard.tsx'],
    ['mlb-my-career', 'MlbMyCareerBoard.tsx'],
    ['nhl-my-career', 'NhlMyCareerBoard.tsx'],
  ]) {
    const src = fs.readFileSync(path.join(ROOT, 'src/components', dir, file), 'utf8');
    if (!/usCoachCareer|CoachCareerPanel/.test(src)) fail(`${file} does not import the coaching career, so that game still stops at retirement`);
  }
  console.log('   all four boards import the coaching career');
}

fs.rmSync(OUT, { force: true });
console.log(failures === 0 ? '\nPASS: ALL US COACHING CAREER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
