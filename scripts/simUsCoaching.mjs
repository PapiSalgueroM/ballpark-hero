/**
 * Round 113 harness: is the American coaching market actually earned?
 *
 * The four US career sims used to stop dead at retirement. usCareerToCoach.ts
 * gives them the same second act Soccer Career got in rounds 107 to 112, and
 * the same rule has to hold: getting fired must NOT hand you another job.
 *
 * This does not just prove there is no crash. It measures:
 *   1. every offer names a real franchise the matching engine knows
 *   2. a decorated champion gets meaningfully more, and better, offers than a
 *      journeyman, in all four sports
 *   3. it is genuinely possible to open the feed and find nothing
 *   4. every extra season out of work strictly lowers your standing
 *   5. how you left matters, and a firing costs more than walking away
 *   6. you cannot leap up from where you fell, but you CAN climb back
 *   7. a real career simulated through the real engine produces a sane
 *      reputation, and better careers outrank worse ones
 *   8. no em or en dash reaches anything a player reads
 *
 * Run: node scripts/simUsCoaching.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/usCoachEntry.mjs';
const OUT = '/tmp/usCoach.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
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

const { coach, nfl, nba, mlb, nhl, dNba, dMlb, dNhl } = await import(pathToFileURL(OUT).href);
const {
  usTeamsFor, usTeamLabel, repFromUsPlayingCareer, careerVolumeScore,
  coachProfileFromCareer, coachStanding, bestCoachTierAvailable, coachOfferCount,
  coachingVacancies, generateCoachOffers, retirementCoachHunt, coachJobHunt,
  recordCoachSeason, recordSeasonOut, coachTierLabel, titleWord, majorAwardWord,
} = coach;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const DASH = /[–—]/;

/* The exact team lists the engines themselves use. Anything a coaching offer
   names has to be in here or the offer is fiction. */
const ENGINE_TEAMS = {
  nfl: new Set(nfl.NFL_TEAM_NAMES.map(t => t.label)),
  nba: new Set(dNba.NBA_TEAMS.map(t => `${t.city} ${t.name}`)),
  mlb: new Set(dMlb.MLB_TEAMS.map(t => `${t.city} ${t.name}`)),
  nhl: new Set(dNhl.NHL_TEAMS.map(t => `${t.city} ${t.name}`)),
};

const profile = (sport, over = {}) => ({
  sport,
  playingRep: 25, seasonsSinceRetired: 2,
  ringsAsCoach: 0, playoffBerths: 0, playoffRoundsWon: 0, losingSeasons: 0,
  seasonsCoached: 4, lastTier: 3, departure: 'firedLosing', seasonsOut: 0,
  playedFor: [...ENGINE_TEAMS[sport]][0], workedFor: [],
  ...over,
});

function sample(p, n = 400) {
  let total = 0, empty = 0, best = 5;
  const tiers = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let i = 0; i < n; i++) {
    const offers = generateCoachOffers(p, coachingVacancies(p.sport, Math.random), Math.random);
    total += offers.length;
    if (offers.length === 0) empty += 1;
    for (const o of offers) { best = Math.min(best, o.tier); tiers[o.tier] += 1; }
  }
  return { avg: total / n, emptyPct: (empty / n) * 100, best: best === 5 ? null : best, tiers };
}

/* ---------- 1. Every offer names a real franchise ---------- */
console.log('1) Every offer names a real team the engine knows');
{
  const counts = { nfl: 32, nba: 30, mlb: 30, nhl: 32 };
  let checked = 0, bogus = 0;
  for (const sport of SPORTS) {
    const listed = usTeamsFor(sport);
    if (listed.length !== counts[sport]) fail(`${sport} exposes ${listed.length} teams, expected ${counts[sport]}`);
    for (const t of listed) if (!ENGINE_TEAMS[sport].has(t)) { bogus += 1; fail(`${sport} team "${t}" is not in the engine list`); }
    // and now the offers themselves, at every standing level
    for (const rep of [10, 40, 70, 100]) {
      const p = profile(sport, { playingRep: rep, lastTier: 1, seasonsCoached: 9, ringsAsCoach: 2, playoffRoundsWon: 6 });
      for (let i = 0; i < 250; i++) {
        for (const o of generateCoachOffers(p, coachingVacancies(sport, Math.random), Math.random)) {
          checked += 1;
          if (!ENGINE_TEAMS[sport].has(o.team)) { bogus += 1; fail(`${sport} offered a job at "${o.team}", which does not exist`); }
          if (o.sport !== sport) fail('an offer carried the wrong sport tag');
          if (!o.role || o.role.length < 4) fail('an offer arrived with no role');
        }
      }
    }
  }
  console.log(`   ${SPORTS.map(s => `${s} ${usTeamsFor(s).length}`).join(', ')} franchises, ${checked} generated offers checked, ${bogus} bogus`);
  // spot check the id to label resolution the engines will hand us
  console.log(`   id resolution: KC -> ${usTeamLabel('nfl', 'KC')} | BOS -> ${usTeamLabel('nba', 'BOS')} | ${usTeamLabel('nhl', 'BOS')}`);
  if (checked < 500) fail('too few offers generated to judge anything');
}

/* ---------- 2. A champion beats a journeyman, in every sport ---------- */
console.log('2) A decorated champion gets more, and better, offers than a journeyman');
{
  for (const sport of SPORTS) {
    const champRep = repFromUsPlayingCareer(sport, { rings: 4, majorAwards: 2, finalsMvps: 2, allLeague: 9, seasons: 17, peakOverall: 95, volume: 1.1 });
    const grindRep = repFromUsPlayingCareer(sport, { rings: 0, majorAwards: 0, finalsMvps: 0, allLeague: 0, seasons: 8, peakOverall: 73, volume: 0.2 });
    const champ = profile(sport, {
      playingRep: champRep, seasonsSinceRetired: 3, seasonsCoached: 9,
      ringsAsCoach: 1, playoffBerths: 6, playoffRoundsWon: 7, losingSeasons: 2,
      lastTier: 1, departure: 'firedLosing',
    });
    // Not a hopeless case, on purpose. He is still in the game, so the
    // comparison below is a real ratio rather than a divide by zero.
    const grinder = profile(sport, {
      playingRep: grindRep, seasonsSinceRetired: 9, seasonsCoached: 5,
      losingSeasons: 3, lastTier: 4, departure: 'firedLosing',
    });
    const C = sample(champ), G = sample(grinder);
    console.log(`   ${sport.toUpperCase()} champion  rep ${champRep.toString().padStart(3)}  standing ${coachStanding(champ).toFixed(0).padStart(3)}  ceiling T${bestCoachTierAvailable(champ)}  ${C.avg.toFixed(2)} offers  ${C.emptyPct.toFixed(0)}% empty  best T${C.best}`);
    console.log(`   ${sport.toUpperCase()} journeyman rep ${grindRep.toString().padStart(3)}  standing ${coachStanding(grinder).toFixed(0).padStart(3)}  ceiling T${bestCoachTierAvailable(grinder)}  ${G.avg.toFixed(2)} offers  ${G.emptyPct.toFixed(0)}% empty  best T${G.best}`);
    if (C.avg < G.avg * 1.6) fail(`${sport}: a champion (${C.avg.toFixed(2)}) does not get meaningfully more offers than a journeyman (${G.avg.toFixed(2)})`);
    if ((C.best ?? 9) >= (G.best ?? 9)) fail(`${sport}: the champion cannot reach a better class of job than the journeyman`);
    if (C.emptyPct > 20) fail(`${sport}: a decorated champion was left with nothing ${C.emptyPct.toFixed(0)} percent of the time`);
    if (G.emptyPct < 12) fail(`${sport}: a journeyman fired on results almost always gets work, so the firing costs nothing`);
  }
}

/* ---------- 3. Zero offers has to be genuinely possible ---------- */
console.log('3) You can end up with nothing');
{
  const done = profile('nba', {
    playingRep: 6, seasonsSinceRetired: 15, seasonsCoached: 7,
    losingSeasons: 6, lastTier: 4, departure: 'firedCollapse', seasonsOut: 4,
  });
  const s = sample(done);
  console.log(`   burned out: standing ${coachStanding(done).toFixed(0)}, ceiling ${bestCoachTierAvailable(done)}, ${s.emptyPct.toFixed(0)} percent of cycles had zero offers`);
  if (s.emptyPct < 70) fail('a coach with nothing left still finds work most of the time');

  // and a plain nobody, fresh out of playing, has to strike out sometimes
  const nobody = profile('mlb', { playingRep: 11, seasonsSinceRetired: 0, seasonsCoached: 0, lastTier: 4, departure: 'retiredPlayer' });
  const n = sample(nobody);
  console.log(`   fresh retiree nobody has heard of: standing ${coachStanding(nobody).toFixed(0)}, ${n.avg.toFixed(2)} offers, ${n.emptyPct.toFixed(0)} percent empty`);
  if (n.emptyPct < 8) fail('a nobody walks into a coaching job almost every time');
  if (n.emptyPct > 85) fail('a nobody can never get started at all, which kills the mode');
}

/* ---------- 4. Sitting out is strictly worse, season by season ---------- */
console.log('4) Every season out of work costs you');
{
  const rows = [0, 1, 2, 3, 4].map(out => {
    const p = profile('nhl', { playingRep: 58, seasonsCoached: 8, playoffBerths: 3, playoffRoundsWon: 2, lastTier: 2, departure: 'firedLosing', seasonsOut: out });
    const s = sample(p, 300);
    return { out, standing: coachStanding(p), ceiling: bestCoachTierAvailable(p), avg: s.avg, empty: s.emptyPct };
  });
  for (const r of rows) console.log(`   ${r.out} seasons out: standing ${r.standing.toFixed(1).padStart(5)}, ceiling T${r.ceiling}, ${r.avg.toFixed(2)} offers, ${r.empty.toFixed(0)} percent empty`);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].standing >= rows[i - 1].standing) fail(`sitting out ${rows[i].out} seasons did not cost more than ${rows[i - 1].out}`);
    // Offer counts are a small sample roll, so allow a little noise and let
    // the deterministic standing check above carry the real assertion.
    if (rows[i].avg > rows[i - 1].avg + 0.08) fail('offers went UP after another season out of work');
  }
  if (rows[4].empty < 40) fail('four seasons out and the phone still rings most cycles');

  // recordSeasonOut has to move the same needle the same way
  let p = profile('nfl', { playingRep: 50, seasonsCoached: 6, lastTier: 2, departure: 'firedLosing' });
  const before = coachStanding(p);
  p = recordSeasonOut(p);
  const after = coachStanding(p);
  console.log(`   recordSeasonOut: ${before.toFixed(1)} -> ${after.toFixed(1)}`);
  if (after >= before) fail('recordSeasonOut did not lower the standing');
}

/* ---------- 5. How you left matters ---------- */
console.log('5) How you went out matters');
{
  const rows = ['poached', 'resigned', 'contractExpired', 'mutual', 'firedLosing', 'firedCollapse'].map(departure => {
    const p = profile('nba', { playingRep: 50, seasonsCoached: 7, playoffBerths: 3, playoffRoundsWon: 2, lastTier: 2, departure });
    return { d: departure, standing: coachStanding(p), avg: sample(p, 250).avg };
  });
  for (const r of rows) console.log(`   ${r.d.padEnd(16)} standing ${r.standing.toFixed(0).padStart(3)}, ${r.avg.toFixed(2)} offers`);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].standing > rows[i - 1].standing) fail(`${rows[i].d} left you better off than ${rows[i - 1].d}`);
  }
  if (rows[0].standing - rows[rows.length - 1].standing < 20) fail('being run out of town is barely different from being poached');
}

/* ---------- 6. No leaping up, but you can climb ---------- */
console.log('6) You cannot leap up from where you fell, and you can climb back');
{
  const bottom = profile('mlb', { playingRep: 30, seasonsCoached: 3, lastTier: 4, departure: 'firedLosing' });
  let elite = 0;
  const windows = 600;
  for (let i = 0; i < windows; i++) {
    for (const o of generateCoachOffers(bottom, coachingVacancies('mlb', Math.random), Math.random)) if (o.tier === 1) elite += 1;
  }
  console.log(`   fired off a staff job: ${elite} contender jobs across ${windows} cycles (ceiling T${bestCoachTierAvailable(bottom)})`);
  if (elite > 0) fail(`${elite} contender jobs were offered to a coach fired off somebody else's staff`);

  let p = profile('nhl', { playingRep: 22, seasonsSinceRetired: 4, seasonsCoached: 2, lastTier: 4, departure: 'firedLosing' });
  const trail = [];
  for (let step = 0; step < 4; step++) {
    const ceiling = bestCoachTierAvailable(p);
    trail.push(`T${p.lastTier} can reach T${ceiling}`);
    if (ceiling === null) break;
    // Three good years: a deep run, a title, and a bigger team takes you.
    p = recordCoachSeason(p, { tier: Math.max(1, ceiling), team: 'Boston Bruins', madePlayoffs: true, roundsWon: 3, champion: true, wins: 50, losses: 25, stillEmployed: true, departure: 'poached' });
    p = recordCoachSeason(p, { tier: Math.max(1, ceiling), team: 'Boston Bruins', madePlayoffs: true, roundsWon: 2, wins: 48, losses: 28, stillEmployed: true, departure: 'poached' });
  }
  console.log('   ' + trail.join('  |  '));
  const finalCeiling = bestCoachTierAvailable(p);
  console.log(`   after three good spells: ceiling T${finalCeiling}, standing ${coachStanding(p).toFixed(0)}, ${p.ringsAsCoach} titles, ${p.playoffRoundsWon} rounds won`);
  if (finalCeiling !== 1) fail(`a coach who won everything on the way up still cannot reach a contender (ceiling ${finalCeiling})`);

  // and the counter: even the best coach in the sport pays for a collapse
  const wrecked = recordCoachSeason(p, { tier: 1, team: 'Boston Bruins', wins: 21, losses: 55, stillEmployed: false, departure: 'firedCollapse' });
  console.log(`   then one collapse: standing ${coachStanding(p).toFixed(0)} -> ${coachStanding(wrecked).toFixed(0)}, losing seasons ${wrecked.losingSeasons}`);
  if (coachStanding(wrecked) >= coachStanding(p)) fail('a collapse season did not cost anything');
  // and he cannot just sit on the record forever either
  let idling = wrecked;
  for (let i = 0; i < 5; i++) idling = recordSeasonOut(idling);
  console.log(`   then five years out: standing ${coachStanding(idling).toFixed(0)}, ceiling T${bestCoachTierAvailable(idling)}`);
  if (coachStanding(idling) >= coachStanding(wrecked)) fail('the best coach in the sport can sit out five years for free');
}

/* ---------- 7. Real careers, through the real engines ---------- */
console.log('7) Real simulated careers produce sane reputations');
{
  const runners = {
    nfl: () => {
      const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
      const pos = POS[Math.floor(Math.random() * POS.length)];
      const arch = nfl.ARCHETYPES[pos][Math.floor(Math.random() * nfl.ARCHETYPES[pos].length)];
      let c = nfl.startCareer('Sim', pos, arch, Math.random, null);
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
      let c = nba.startNbaCareer('Sim', pos, arch, Math.random, null);
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
      let c = mlb.startMlbCareer('Sim', pos, arch, Math.random, null);
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
      let c = nhl.startNhlCareer('Sim', pos, arch, Math.random, null);
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

  /* Round 125: was a flat 200, and the check at the bottom of this block asks
     whether the TOP of 200 careers can reach a reputation of 80. The most
     extreme value in a sample is the noisiest number you can pick: measured
     over twelve runs at 200 careers the best MLB career came back anywhere
     between 74 and 100 and the best NFL one between 79 and 100, so the check
     failed about one run in six while nothing was wrong. Nothing was learned
     from those failures except to stop reading the output. 2000 careers costs
     a few seconds and makes the number mean something. */
  const CAREERS = Number(process.env.CAREERS || 2000);
  for (const sport of SPORTS) {
    const rows = [];
    for (let i = 0; i < CAREERS; i++) {
      const c = runners[sport]();
      const hunt = retirementCoachHunt(sport, c, Math.random);
      const p = hunt.profile;
      if (Number.isNaN(p.playingRep)) fail(`${sport}: playing reputation came back NaN`);
      if (p.playingRep < 0 || p.playingRep > 100) fail(`${sport}: reputation out of range (${p.playingRep})`);
      if (!ENGINE_TEAMS[sport].has(p.playedFor)) fail(`${sport}: profile says he played for "${p.playedFor}", which is not a real team`);
      for (const o of hunt.offers) if (!ENGINE_TEAMS[sport].has(o.team)) fail(`${sport}: retirement offer at fake team "${o.team}"`);
      if (!hunt.note || hunt.note.length < 12) fail(`${sport}: a job hunt came back with no note`);
      rows.push({ rep: p.playingRep, tier: p.lastTier, offers: hunt.offers.length, standing: hunt.standing, ceiling: hunt.ceiling, vol: careerVolumeScore(sport, c.pos, c.seasons) });
    }
    rows.sort((a, b) => a.rep - b.rep);
    const q = f => rows[Math.floor(rows.length * f)];
    const top = rows.slice(-20), bot = rows.slice(0, 20);
    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const headJobs = rows.filter(r => r.tier <= 3).length;
    console.log(`   ${sport.toUpperCase()} ${CAREERS} careers: rep p05 ${q(0.05).rep}, median ${q(0.5).rep}, p95 ${q(0.95).rep}, max ${rows[rows.length - 1].rep}`);
    console.log(`        best 20 careers: ${mean(top.map(r => r.offers)).toFixed(2)} offers, avg standing ${mean(top.map(r => r.standing)).toFixed(0)}, avg first tier ${mean(top.map(r => r.tier)).toFixed(1)}`);
    console.log(`        worst 20       : ${mean(bot.map(r => r.offers)).toFixed(2)} offers, avg standing ${mean(bot.map(r => r.standing)).toFixed(0)}, avg first tier ${mean(bot.map(r => r.tier)).toFixed(1)}`);
    console.log(`        ${((headJobs / CAREERS) * 100).toFixed(0)} percent skipped the staff route and started as a head coach`);
    if (mean(top.map(r => r.standing)) <= mean(bot.map(r => r.standing))) fail(`${sport}: the best careers do not outrank the worst ones`);
    if (mean(top.map(r => r.offers)) <= mean(bot.map(r => r.offers))) fail(`${sport}: the best careers do not draw more interest`);
    // The scale has to be believable in both directions.
    if (q(0.5).rep >= 65) fail(`${sport}: the median career is rated ${q(0.5).rep}, which makes everyone a legend`);
    if (q(0.5).rep <= 15) fail(`${sport}: the median career is rated ${q(0.5).rep}, which makes nobody worth hiring`);
    if (rows[rows.length - 1].rep < 80) fail(`${sport}: the best of ${CAREERS} careers only rated ${rows[rows.length - 1].rep}, the top of the scale is unreachable`);
    if (headJobs / CAREERS > 0.45) fail(`${sport}: ${((headJobs / CAREERS) * 100).toFixed(0)} percent of retirees walk straight into a head coaching job`);
    if (headJobs === 0) fail(`${sport}: nobody in ${CAREERS} careers was ever good enough for a head coaching job`);
  }
}

/* ---------- 8. Nothing a player reads has a dash in it ---------- */
console.log('8) Copy check');
{
  let strings = 0;
  const check = (s, where) => {
    if (typeof s !== 'string') return;
    strings += 1;
    if (DASH.test(s)) fail(`an em or en dash reached ${where}: ${s}`);
  };
  for (const sport of SPORTS) {
    for (let t = 1; t <= 4; t++) check(coachTierLabel(t), 'coachTierLabel');
    check(titleWord(sport), 'titleWord');
    check(majorAwardWord(sport), 'majorAwardWord');
    for (const rep of [8, 35, 65, 100]) {
      for (let i = 0; i < 120; i++) {
        const p = profile(sport, { playingRep: rep, seasonsCoached: rep > 50 ? 8 : 1, lastTier: rep > 70 ? 1 : 4, playoffRoundsWon: rep > 50 ? 4 : 0 });
        const hunt = coachJobHunt(p, Math.random);
        check(hunt.note, 'the job hunt note');
        for (const o of hunt.openings) { check(o.team, 'an opening team'); check(o.role, 'an opening role'); }
        for (const o of hunt.offers) {
          check(o.team, 'an offer team'); check(o.role, 'an offer role');
          check(o.brief, 'an offer brief'); check(o.reason, 'an offer reason'); check(o.roster, 'an offer roster line');
          if (!o.brief || o.brief.length < 10) fail('an offer arrived with no brief');
          if (!o.reason || o.reason.length < 20) fail('an offer arrived with no reason attached');
          if (!(o.keenness >= 5 && o.keenness <= 100)) fail(`keenness out of range: ${o.keenness}`);
        }
      }
    }
  }
  console.log(`   ${strings} player facing strings checked, all clean`);
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/usCareerToCoach.ts'), 'utf8');
  src.split('\n').forEach((line, i) => {
    if (DASH.test(line)) fail(`usCareerToCoach.ts:${i + 1} has an em or en dash`);
  });
}

fs.rmSync(OUT, { force: true });
console.log(failures === 0 ? '\nPASS: ALL US COACHING CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
