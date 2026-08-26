/**
 * Round 131 harness: creating a player.
 *
 * Six pieces of owner feedback landed on one screen this round, and four of
 * them change numbers the season simulation reads. That is exactly the kind of
 * change that looks fine in a browser for ten minutes and is quietly broken
 * over a career, so everything here is measured over hundreds of full careers
 * rather than asserted from a screenshot.
 *
 * What it proves:
 *  1. The ceiling still MEANS something. Round 96's whole point was that a high
 *     roll should pay off, so a high potential career has to measurably beat a
 *     low potential one, and reaching 99 has to stay rare.
 *  2. The soft cap is earned, never drifted into. Same engine, two kinds of
 *     career, and the drifting one never gets a single point back.
 *  3. Both ends of the new overall range still produce a career worth playing.
 *     A 99 start and a 55 start, side by side, on the measures that decide
 *     whether a save is worth opening again.
 *  4. The new attributes change outcomes. Same overall, same position, same
 *     number of seasons, two different builds, and the careers come out
 *     different by more than noise.
 *  5. The allocator cannot reach an illegal state, by typing, by stepping, or
 *     by any sequence of the two. A quarter of a million random moves.
 *  6. A save written before this round still loads and still plays.
 *
 * Run: node scripts/simCreation.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/creationSimEntry.mjs';
const BUNDLE = '/tmp/creationSim.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
const eras = await import('${ROOT}/src/lib/careerEras.ts');
const attrs = await import('${ROOT}/src/lib/soccerCareerAttributes.ts');
const look = await import('${ROOT}/src/lib/soccerCareerAppearance.ts');
export { engine, eras, attrs, look };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { engine, eras, attrs, look } = await import(BUNDLE);
const {
  initCareer, advanceYouthYear, advanceProSeason, acceptOffer, dismissSummary,
  repairCareer, effectivePotential, careerBuildEffects, FALLBACK_CLUBS, getCareerTotals,
} = engine;
const {
  rollStartingOverall, rollPotential, allocRowsFor, allocOverall, allocMax, ALLOC_MIN,
  normalizeAllocation, stepAllocation, allocationPool, canSettleAllocation,
} = eras;
const {
  attrTreeFor, applyFamilyOffset, safeShape, safePhysique, defaultPhysique,
  deriveMap, buildEffects, referenceLine, SHAPE_MAX, HEIGHT_MIN, HEIGHT_MAX,
  WEIGHT_MIN, WEIGHT_MAX, ALL_ATTR_IDS,
} = attrs;
const { SKIN_TONES, HAIR_COLORS, HAIRSTYLES, FACIAL_HAIR, ACCESSORIES, BOOTS, CELEBRATIONS, randomAppearance } = look;

let failures = 0;
const fail = (msg) => { failures += 1; console.error('  FAIL: ' + msg); };
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n, d) => (d ? (n / d) * 100 : 0);

/* The creation screen builds a line that averages to the rolled overall. Same
   helper here so a simulated career is the career the page would have made. */
const POS_OFFSETS = attrs.POSITION_OFFSETS;
function lineFor(position, overall) {
  const o = POS_OFFSETS[position] || [0, 0, 0, 0, 0, 0, 0];
  const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
  const s = {};
  keys.forEach((k, i) => { s[k] = Math.max(25, Math.min(99, overall + o[i])); });
  return s;
}

/* One career, played to the end, answering every screen the way an engaged
   player would: take the best offer on the table, dismiss whatever pops up,
   push on when the game suggests retiring, and stop when the body stops.
   maxSteps is a stall guard, not a season count: a single season takes two or
   three trips round this loop because every overlay is a trip. */
function playCareer({ position = 'ST', overall, potential, physique = null, shape = null, maxSteps = 200, drift = false, stopAfterPro = 0 }) {
  let c = initCareer('Sim', 'Spain', position, '2020s', lineFor(position, overall), overall,
    2020, FALLBACK_CLUBS, null, potential, physique, shape);
  let steps = 0;
  const proCount = () => c.seasons.filter((s) => s.type === 'playing').length;
  while (!c.retired && steps < maxSteps) {
    steps++;
    if (stopAfterPro && proCount() >= stopAfterPro) { c = engine.manualRetire(c); break; }
    if (c.phase === 'youth') { c = advanceYouthYear(c, FALLBACK_CLUBS); continue; }
    if (c.phase === 'contract_offer' && c.pendingOffers.length) {
      /* Drifting means never chasing anything: take the worst club on the
         table every single time and let the career happen to you. */
      const sorted = [...c.pendingOffers].sort((a, b) => a.club.tier - b.club.tier);
      c = acceptOffer(c, drift ? sorted[sorted.length - 1] : sorted[0]);
      continue;
    }
    if (c.phase === 'playing') { c = advanceProSeason(c, FALLBACK_CLUBS); continue; }
    if (c.phase === 'retirement_suggestion') { c = engine.declineRetirementSuggestion(c); continue; }
    /* Everything else is a screen waiting to be dismissed. Clearing the
       pending fields is what the buttons on those screens do. */
    c = {
      ...c,
      phase: 'playing',
      pendingSummary: null, pendingNews: [], pendingEvents: [], transferSituation: null,
      pendingBallonDor: null, pendingTournament: null, pendingWorldCup: null,
      pendingRivalryEvent: null, pendingMoralDilemma: null, pendingAppealResult: null,
      pendingCoverAthleteEvent: false,
    };
  }
  const totals = getCareerTotals(c.seasons);
  const pro = c.seasons.filter((s) => s.type === 'playing');
  return {
    peak: c.peakOverall,
    seasons: pro.length,
    goals: totals.goals,
    assists: totals.assists,
    apps: totals.apps,
    trophies: totals.leagueTitles + totals.domesticCups + totals.championsLeagues,
    ballonDors: totals.ballonDors,
    earned: c.potentialEarned ?? 0,
    ceiling: effectivePotential(c),
    rating: mean(pro.map((s) => s.rating || 0)),
    legacy: c.legacy ? c.legacy.score : null,
    tier: c.legacy ? c.legacy.tier : null,
    stalled: !c.retired,
    state: c,
  };
}

/* ---------- 1. The ceiling still means something ---------- */
console.log('1) The ceiling still means something (300 careers per band)');
let band99Rate = 0;
{
  const N = 300;
  const bands = [
    { name: 'low ceiling  (74)', pot: 74 },
    { name: 'mid ceiling  (84)', pot: 84 },
    { name: 'high ceiling (93)', pot: 93 },
  ];
  const out = [];
  for (const b of bands) {
    const peaks = [], goals = [], rows = [];
    let hit99 = 0;
    for (let i = 0; i < N; i++) {
      const r = playCareer({ position: 'ST', overall: 55, potential: b.pot });
      peaks.push(r.peak); goals.push(r.goals); rows.push(r);
      if (r.peak >= 99) hit99++;
    }
    out.push({ ...b, peak: mean(peaks), goals: mean(goals), hit99, rows });
    console.log(`   ${b.name}: mean peak ${mean(peaks).toFixed(1)}, mean career goals ${mean(goals).toFixed(0)}, reached 99 ${hit99}/${N}`);
  }
  const [lo, mid, hi] = out;
  /* Round 284: the high-to-mid floor was 4 and it went red on healthy code at
     exactly 4.0. Measured rather than argued about: over 12 runs at this
     sample size the gap came out 4.26 to 5.07 (median 4.59), an earlier 25 run
     series bottomed at 3.89, and at four times the sample it settles at 4.40 to
     4.61 (mean 4.51): the true gap is about four and a half and a 300 career
     run wobbles by close to half a point either side of it. A floor of 4 sat
     inside that wobble, so the check was a coin toss dressed as a rule. 3 is
     well under every run seen and still says a 93 ceiling has to peak clearly
     above an 84. The mid-to-low gap measures about 9 and keeps its floor of 4. */
  if (!(hi.peak > mid.peak + 3)) fail(`a 93 ceiling peaks at ${hi.peak.toFixed(1)} against a mid ceiling's ${mid.peak.toFixed(1)}, which is not a meaningful gap`);
  if (!(mid.peak > lo.peak + 4)) fail(`an 84 ceiling peaks at ${mid.peak.toFixed(1)} against a low ceiling's ${lo.peak.toFixed(1)}, which is not a meaningful gap`);
  if (!(hi.goals > lo.goals * 1.4)) fail(`a high ceiling scores ${hi.goals.toFixed(0)} career goals against a low ceiling's ${lo.goals.toFixed(0)}, so the roll barely pays`);
  if (lo.hit99 > 0) fail(`${lo.hit99}/${N} careers with a 74 ceiling still reached 99`);
  band99Rate = pct(hi.hit99, N);
  if (band99Rate > 25) fail(`even a 93 ceiling reaches 99 in ${band99Rate.toFixed(1)}% of careers, which makes 99 ordinary`);
}

/* ---------- 2. Rolled potential: 99 stays rare across the real distribution --- */
console.log('2) Across the real roll distribution, 99 is rare (900 careers)');
{
  const N = 900;
  let reached99 = 0, reached90 = 0, reached85 = 0, reached80 = 0;
  const peaks = [];
  for (let i = 0; i < N; i++) {
    const start = rollStartingOverall('ST');
    const pot = rollPotential(start);
    const r = playCareer({ position: 'ST', overall: start, potential: pot });
    peaks.push(r.peak);
    if (r.peak >= 99) reached99++;
    if (r.peak >= 90) reached90++;
    if (r.peak >= 85) reached85++;
    if (r.peak >= 80) reached80++;
  }
  console.log(`   mean peak ${mean(peaks).toFixed(1)} · reached 80 ${pct(reached80, N).toFixed(1)}% · 85 ${pct(reached85, N).toFixed(1)}% · 90 ${pct(reached90, N).toFixed(1)}% · 99 ${pct(reached99, N).toFixed(2)}%`);
  /* Margins picked off the measured numbers with room either side rather than
     off a figure that sounds strict. Round 125 had to repair three guards that
     only ever failed on noise. Measured over 900 careers: about 40 percent
     clear 80, about 8 percent clear 85, about 1 percent clear 90 and nobody at
     all reaches 99 by rolling normally. */
  if (pct(reached99, N) > 3) fail(`${pct(reached99, N).toFixed(1)}% of ordinary careers hit 99, so the ceiling means nothing`);
  if (pct(reached85, N) > 35) fail(`${pct(reached85, N).toFixed(1)}% of careers reach 85, which is not what an 85 is`);
  if (pct(reached85, N) < 1) fail(`only ${pct(reached85, N).toFixed(1)}% reach 85, so a good roll never pays off`);
  if (pct(reached80, N) < 12) fail(`only ${pct(reached80, N).toFixed(1)}% reach 80, so the whole growth curve is dead`);
}

/* ---------- 3. The soft cap is earned, never drifted into ---------- */
console.log('3) Soft cap: earned by achievement, never by drifting (250 careers each way)');
{
  const N = 250;
  let chaserEarned = 0, chaserAny = 0, chaserMax = 0, chaserOver = 0;
  for (let i = 0; i < N; i++) {
    /* A player who was scouted at 84 and turns into something more. High
       ceiling relative to nothing: the point is he has to WIN things at the
       ceiling for years to move it. */
    const r = playCareer({ position: 'ST', overall: 62, potential: 84 });
    chaserEarned += r.earned;
    if (r.earned > 0) chaserAny++;
    chaserMax = Math.max(chaserMax, r.earned);
    if (r.peak > 84) chaserOver++;
  }
  let drifterEarned = 0, drifterAny = 0, drifterOver = 0, drifterMaxOver = 0;
  for (let i = 0; i < N; i++) {
    const r = playCareer({ position: 'CB', overall: 50, potential: 72, drift: true });
    drifterEarned += r.earned;
    if (r.earned > 0) drifterAny++;
    if (r.peak > 72) { drifterOver++; drifterMaxOver = Math.max(drifterMaxOver, r.peak - 72); }
  }
  console.log(`   chasing it: ${chaserAny}/${N} careers earned ceiling back, mean +${(chaserEarned / N).toFixed(2)}, best +${chaserMax}, ${chaserOver}/${N} finished above the number they were given`);
  console.log(`   drifting:   ${drifterAny}/${N} careers earned ceiling back, mean +${(drifterEarned / N).toFixed(2)}, ${drifterOver}/${N} finished above their number on the old late bloomer allowance alone`);
  if (drifterAny > 0) fail(`${drifterAny} drifting careers earned ceiling back, so it is not achievement that buys it`);
  /* A drifter can still creep a point or two over on the pre existing late
     bloomer allowance in growStat, which has been there since Round 78 and is
     not this round's soft cap. It must stay small. */
  if (drifterMaxOver > 4) fail(`a drifting career finished ${drifterMaxOver} above its ceiling without earning anything`);
  if (chaserAny === 0) fail('nobody ever earned a single ceiling point, so the door does not open at all');
  if (pct(chaserAny, N) > 60) fail(`${pct(chaserAny, N).toFixed(0)}% of chasing careers break their ceiling, which makes the ceiling decorative`);
  if (chaserMax > 25) fail(`one career earned +${chaserMax} ceiling, which is a runaway rather than a reward`);
}

/* ---------- 4. Hard wall at 99 ---------- */
console.log('4) 99 is a hard wall even for a career built to break it (200 careers)');
{
  const N = 200;
  let over99 = 0, ceilOver99 = 0, peak99 = 0;
  for (let i = 0; i < N; i++) {
    const r = playCareer({ position: 'ST', overall: 90, potential: 97 });
    if (r.peak > 99) over99++;
    if (r.ceiling > 99) ceilOver99++;
    if (r.peak >= 99) peak99++;
  }
  console.log(`   peaked at exactly 99 in ${peak99}/${N}, above 99 in ${over99}, ceiling above 99 in ${ceilOver99}`);
  if (over99 > 0) fail(`${over99} careers went past 99 overall`);
  if (ceilOver99 > 0) fail(`${ceilOver99} careers carried a ceiling above 99`);
}

/* ---------- 5. A 99 start and a 55 start both give a career worth playing --- */
console.log('5) Both ends of the new overall range (250 careers each)');
{
  const N = 250;
  const run = (ovr) => {
    const rows = [];
    for (let i = 0; i < N; i++) rows.push(playCareer({ position: 'ST', overall: ovr, potential: rollPotential(ovr) }));
    const legacies = rows.map((r) => r.legacy).filter((v) => typeof v === 'number');
    const sorted = [...legacies].sort((a, b) => a - b);
    /* Season by season, not career totals. A career whose every season is the
       same season is not a career, however big the totals look. */
    let seasonsPlayed = 0, seasonsWithTrophy = 0, seasonsWithBdor = 0, seasonsInjured = 0, seasonsPoor = 0;
    let youngSeasons = 0, youngInjured = 0;
    for (const r of rows) {
      for (const s of r.state.seasons.filter((x) => x.type === 'playing')) {
        seasonsPlayed++;
        if (s.leagueTitle || s.domesticCup || s.championsLeague) seasonsWithTrophy++;
        if (s.ballonDor) seasonsWithBdor++;
        if (s.injury) seasonsInjured++;
        if ((s.rating || 0) < 7) seasonsPoor++;
        /* The wonderkid tax only touches the young years, so the young years
           are where it has to be measured. Averaging it over a twenty four
           season career would bury it. */
        if (s.age <= 23) { youngSeasons++; if (s.injury) youngInjured++; }
      }
    }
    const tiers = {};
    for (const r of rows) if (r.tier) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
    return {
      seasons: mean(rows.map((r) => r.seasons)),
      goals: mean(rows.map((r) => r.goals)),
      trophies: mean(rows.map((r) => r.trophies)),
      bdor: mean(rows.map((r) => r.ballonDors)),
      legacy: mean(legacies),
      legacyP10: sorted[Math.floor(sorted.length * 0.1)] ?? 0,
      legacyP90: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
      growth: mean(rows.map((r) => r.peak - ovr)),
      finished: rows.filter((r) => r.legacy !== null).length,
      stalled: rows.filter((r) => r.stalled).length,
      trophySeasons: pct(seasonsWithTrophy, seasonsPlayed),
      bdorSeasons: pct(seasonsWithBdor, seasonsPlayed),
      injuredSeasons: pct(seasonsInjured, seasonsPlayed),
      youngInjured: pct(youngInjured, youngSeasons),
      poorSeasons: pct(seasonsPoor, seasonsPlayed),
      tiers,
    };
  };
  const low = run(55);
  const high = run(99);
  for (const [name, r] of [['55 start', low], ['99 start', high]]) {
    console.log(`   ${name}: ${r.seasons.toFixed(1)} pro seasons, ${r.goals.toFixed(0)} goals, ${r.trophies.toFixed(1)} trophies, ${r.bdor.toFixed(2)} Ballon d'Ors, legacy ${r.legacy.toFixed(1)} (p10 ${r.legacyP10}, p90 ${r.legacyP90}), grew +${r.growth.toFixed(1)}`);
    console.log(`             seasons that won something ${r.trophySeasons.toFixed(0)}%, won the Ballon d'Or ${r.bdorSeasons.toFixed(0)}%, lost time to injury ${r.injuredSeasons.toFixed(0)}% (${r.youngInjured.toFixed(0)}% before 24), rated under 7.0 ${r.poorSeasons.toFixed(0)}%, verdicts ${JSON.stringify(r.tiers)}`);
  }

  /* WHAT "WORTH PLAYING" MEANS HERE, argued rather than assumed.

     Legacy spread is the obvious measure and it is the wrong one at the top
     end, because a genuine 99 overall SHOULD win almost everything and a
     hundred point score has a ceiling. Measuring spread there just measures
     the clamp. What actually decides whether a save is worth opening again is
     whether next season is a different season from this one. So:

       it finishes            the career reaches a verdict instead of stalling
       it lasts               enough seasons to have a shape
       it can go wrong        seasons lost to injury, seasons rated under 7
       it is not a formality  seasons where you won nothing, seasons where
                              somebody else took the Ballon d'Or
       it costs something     headroom, and a verdict that knows */
  for (const [name, r] of [['55 start', low], ['99 start', high]]) {
    if (r.stalled > 0) fail(`${name}: ${r.stalled}/${N} careers stalled instead of finishing`);
    if (r.finished < N * 0.95) fail(`${name}: only ${r.finished}/${N} careers reached a legacy verdict`);
    if (r.seasons < 8) fail(`${name}: only ${r.seasons.toFixed(1)} pro seasons, too short to be a career`);
    if (r.trophies < 1) fail(`${name}: ${r.trophies.toFixed(1)} trophies a career, nothing to chase`);
    if (r.trophySeasons > 92) fail(`${name}: wins something in ${r.trophySeasons.toFixed(0)}% of seasons, so winning is a formality`);
    if (r.bdorSeasons > 85) fail(`${name}: wins the Ballon d'Or in ${r.bdorSeasons.toFixed(0)}% of seasons, so nobody else exists`);
    if (r.injuredSeasons < 8) fail(`${name}: only ${r.injuredSeasons.toFixed(0)}% of seasons cost anything to injury, so nothing can go wrong`);
    if (r.poorSeasons < 3) fail(`${name}: only ${r.poorSeasons.toFixed(0)}% of seasons rated under 7, so there is no bad season to have`);
  }
  /* And the choice has to COST something, or permitting it was empty. Starting
     at 99 buys the good years and spends the climb, and the verdict knows. */
  if (!(low.growth > high.growth + 10)) fail(`a 55 start grows ${low.growth.toFixed(1)} against a 99 start's ${high.growth.toFixed(1)}, so a high start costs no headroom`);
  if ((high.tiers.GOAT || 0) > N * 0.5) fail(`${high.tiers.GOAT} of ${N} careers handed 99 at creation were still called the greatest of all time`);
  if (!(high.youngInjured > low.youngInjured + 8)) fail(`before 24 a wonderkid loses ${high.youngInjured.toFixed(0)}% of seasons to injury against a normal start's ${low.youngInjured.toFixed(0)}%, so the world does not react to him at all`);
  console.log(`   the cost of starting at 99: ${(low.growth - high.growth).toFixed(1)} fewer points of growth, ${(high.youngInjured - low.youngInjured).toFixed(0)} points more of his seasons before 24 lost to injury, and a verdict that docks him for it`);
}

/* ---------- 6. The legacy verdict knows what you started at ---------- */
console.log('6) The climb line in the legacy verdict');
{
  const base = {
    seasons: [], position: 'ST', peakOverall: 91, overall: 80,
  };
  /* Two identical finished careers, one that started at 54 and one at 99. */
  const mk = (start) => {
    let c = playCareer({ position: 'ST', overall: 62, potential: 92 }).state;
    c = { ...c, startingOverall: start, peakOverall: 91 };
    return engine.manualRetire(c);
  };
  const climber = mk(54);
  const handed = mk(99);
  const lineOf = (s) => (s.legacy.breakdown.find((b) => b.label === 'The Climb') || { points: 0 }).points;
  console.log(`   started 54, peaked 91 -> climb line ${lineOf(climber) >= 0 ? '+' : ''}${lineOf(climber)}; started 99, peaked 91 -> ${lineOf(handed) >= 0 ? '+' : ''}${lineOf(handed)}`);
  if (!(lineOf(climber) > lineOf(handed))) fail('the verdict does not distinguish a climb from a handout');
  if (lineOf(handed) >= 0) fail('being handed your peak at creation costs nothing in the verdict');
  /* And a save that predates the field must not get the line at all. */
  let old = playCareer({ position: 'CM', overall: 58, potential: 82 }).state;
  delete old.startingOverall;
  const oldRes = engine.manualRetire(old);
  if (oldRes.legacy.breakdown.some((b) => b.label === 'The Climb')) fail('a pre Round 131 save was given a climb line it cannot have earned');
}

/* ---------- 7. The new attributes actually change outcomes ---------- */
console.log('7) Same overall, different build, different career (300 careers each)');
{
  const N = 300;
  const OVR = 70, POT = 88;

  /* Two strikers a football person would recognise. Both exactly 70 overall,
     both with the same ceiling, both playing the same number of seasons. */
  const poacher = () => {
    let shape = {};
    shape = applyFamilyOffset('ST', shape, 'shooting', 'finishing', 12);
    shape = applyFamilyOffset('ST', shape, 'dribbling', 'agility', 10);
    shape = applyFamilyOffset('ST', shape, 'pace', 'acceleration', 8);
    return { shape, physique: { heightCm: 172, weightKg: 66 } };
  };
  const targetMan = () => {
    let shape = {};
    shape = applyFamilyOffset('ST', shape, 'shooting', 'heading', 12);
    shape = applyFamilyOffset('ST', shape, 'physical', 'strength', 10);
    shape = applyFamilyOffset('ST', shape, 'dribbling', 'balance', 8);
    return { shape, physique: { heightCm: 196, weightKg: 94 } };
  };

  /* Twelve pro seasons each, then retire. Holding the career length fixed is
     what makes appearances measurable at all: left to run, one career retires
     at 33 and another at 39 and the difference in total games has nothing to
     do with how either player was built. */
  const SEASONS = 12;
  const run = (mk) => {
    const b = mk();
    const rows = [];
    for (let i = 0; i < N; i++) rows.push(playCareer({ position: 'ST', overall: OVR, potential: POT, physique: b.physique, shape: b.shape, stopAfterPro: SEASONS }));
    const fx = buildEffects(lineFor('ST', OVR), 'ST', OVR, b.physique, b.shape);
    return {
      goals: mean(rows.map((r) => r.goals)),
      apps: mean(rows.map((r) => r.apps)),
      assists: mean(rows.map((r) => r.assists)),
      rating: mean(rows.map((r) => r.rating)),
      seasons: mean(rows.map((r) => r.seasons)),
      fx,
    };
  };
  const p = run(poacher);
  const t = run(targetMan);
  console.log(`   poacher    (172cm 66kg, finishing): ${p.goals.toFixed(0)} goals, ${p.apps.toFixed(0)} apps over ${p.seasons.toFixed(1)} seasons, mean rating ${p.rating.toFixed(2)}, goal mult ${p.fx.goalMult.toFixed(3)}, apps mult ${p.fx.appsMult.toFixed(3)}`);
  console.log(`   target man (196cm 94kg, heading):   ${t.goals.toFixed(0)} goals, ${t.apps.toFixed(0)} apps over ${t.seasons.toFixed(1)} seasons, mean rating ${t.rating.toFixed(2)}, goal mult ${t.fx.goalMult.toFixed(3)}, apps mult ${t.fx.appsMult.toFixed(3)}`);
  /* Goals per appearance rather than career goals, because the two builds do
     not play the same number of games and that is itself one of the things
     being measured. Per game is the number that isolates how each of them
     actually finishes. */
  const rateP = p.goals / Math.max(1, p.apps);
  const rateT = t.goals / Math.max(1, t.apps);
  const rateGap = Math.abs(rateP - rateT) / Math.min(rateP, rateT);
  const goalGap = Math.abs(p.goals - t.goals) / Math.max(1, Math.min(p.goals, t.goals));
  console.log(`   goals per game ${rateP.toFixed(3)} vs ${rateT.toFixed(3)} (${(rateGap * 100).toFixed(1)}% apart), career goal gap ${(goalGap * 100).toFixed(1)}%, appearance gap ${(t.apps - p.apps).toFixed(1)} games, rating gap ${(p.rating - t.rating).toFixed(2)}`);
  if (rateGap < 0.08) fail(`two very different strikers on the same overall finish within ${(rateGap * 100).toFixed(1)}% of each other per game, so the build does nothing`);
  if (!(rateP > rateT)) fail('the striker built to finish does not finish better');
  if (goalGap < 0.04) fail(`career goal totals are within ${(goalGap * 100).toFixed(1)}%, so nothing reaches the record books`);
  if (!(t.apps > p.apps + 4)) fail(`the heavier, stronger build played ${(t.apps - p.apps).toFixed(1)} more games over ${SEASONS} seasons, which is inside the noise`);
  if (!(p.rating > t.rating)) fail('the build the position is judged on does not read better in the ratings');

  /* And a build nobody touched has to come out at dead neutral, at every
     overall and in every position. That is what makes this safe to add to
     maths that was balanced before it existed. */
  let drift = 0;
  for (const pos of POSITIONS) {
    for (let o = 44; o <= 99; o += 1) {
      const fx = buildEffects(lineFor(pos, o), pos, o, defaultPhysique(pos), {});
      for (const k of ['goalMult', 'assistMult', 'appsMult', 'cleanSheetMult']) {
        if (Math.abs(fx[k] - 1) > 1e-9) drift++;
      }
      if (Math.abs(fx.ratingDelta) > 1e-9 || Math.abs(fx.injuryDelta) > 1e-9) drift++;
    }
  }
  if (drift > 0) fail(`${drift} untouched builds came out non neutral, so this round moved balance nobody asked it to move`);
  else console.log('   an untouched build is exactly neutral at all 10 positions across overalls 44 to 99');

  /* Height and weight have to land on the attributes a football person would
     expect them to land on. */
  const tallHeavy = deriveMap(lineFor('ST', 70), 'ST', { heightCm: 198, weightKg: 95 }, {});
  const shortLight = deriveMap(lineFor('ST', 70), 'ST', { heightCm: 168, weightKg: 62 }, {});
  const checks = [
    ['heading', tallHeavy.heading > shortLight.heading + 8],
    ['strength', tallHeavy.strength > shortLight.strength + 10],
    ['jumping', tallHeavy.jumping > shortLight.jumping + 3],
    ['acceleration', shortLight.acceleration > tallHeavy.acceleration + 8],
    ['agility', shortLight.agility > tallHeavy.agility + 8],
    ['stamina', shortLight.stamina > tallHeavy.stamina + 3],
  ];
  for (const [name, ok] of checks) if (!ok) fail(`height and weight do not move ${name} the way they should`);
  console.log(`   198cm 95kg vs 168cm 62kg: heading ${tallHeavy.heading} vs ${shortLight.heading}, strength ${tallHeavy.strength} vs ${shortLight.strength}, acceleration ${tallHeavy.acceleration} vs ${shortLight.acceleration}`);
}

/* ---------- 8. The allocator cannot reach an illegal state ---------- */
console.log('8) Allocator fuzz: 250k moves, typing and stepping mixed');
{
  const MOVES = 250000;
  let illegal = 0, driftedOverall = 0, stranded = 0, poolNegative = 0;
  let move = 0;
  while (move < MOVES) {
    const position = POSITIONS[rnd(0, POSITIONS.length - 1)];
    const target = rnd(40, 99);
    const rows = allocRowsFor(position);
    let alloc = normalizeAllocation(lineFor(position, Math.min(99, target)), position, target);
    const budget = rows.reduce((a, r) => a + alloc[r.key], 0);
    const isOutfield = position !== 'GK';
    for (let step = 0; step < 40 && move < MOVES; step++) {
      move++;
      const row = rows[rnd(0, rows.length - 1)];
      /* Every way the screen can hand this function a number, including the
         ways a person on a phone actually produces one. */
      const mode = rnd(0, 7);
      const cur = alloc[row.key];
      const next =
        mode === 0 ? cur + 1 :
        mode === 1 ? cur - 1 :
        mode === 2 ? cur + 5 :
        mode === 3 ? cur - 5 :
        mode === 4 ? rnd(-500, 500) :
        mode === 5 ? Number('') :
        mode === 6 ? Number('abc') :
        Number('99999999999');
      alloc = stepAllocation(alloc, position, row.key, next, budget, target);
      for (const r of rows) {
        const v = alloc[r.key];
        if (!Number.isFinite(v) || v < ALLOC_MIN || v > allocMax(target) || v !== Math.round(v)) illegal++;
      }
      const pool = allocationPool(alloc, position, budget);
      if (pool < 0) poolNegative++;
      if (!canSettleAllocation(alloc, position, budget, target)) stranded++;
    }
    /* Spend it all the way down the way the screen forces you to, and an
       outfield overall must still be exactly the number the pool was built
       for. That is the invariant the whole build screen depends on. */
    let guard = 0;
    while (allocationPool(alloc, position, budget) > 0 && guard < 4000) {
      guard++;
      let best = null;
      for (const r of rows) if (best === null || alloc[r.key] < alloc[best]) best = r.key;
      const before = alloc[best];
      alloc = stepAllocation(alloc, position, best, before + 1, budget, target);
      if (alloc[best] === before) break;
    }
    if (allocationPool(alloc, position, budget) !== 0) stranded++;
    else if (isOutfield && allocOverall(alloc, position) !== target) driftedOverall++;
  }
  console.log(`   ${MOVES} moves: ${illegal} illegal values, ${poolNegative} negative pools, ${stranded} unspendable states, ${driftedOverall} overall drifts`);
  if (illegal > 0) fail(`${illegal} illegal attribute values reachable from the allocator`);
  if (poolNegative > 0) fail(`${poolNegative} states overspent the pool`);
  if (stranded > 0) fail(`${stranded} states could not be spent down to zero, which locks the Lock In button forever`);
  if (driftedOverall > 0) fail(`${driftedOverall} fully spent outfield builds did not land on their own overall`);
}

/* ---------- 9. Shaping fuzz: a family can never fall out of balance ------- */
console.log('9) Shaping fuzz: 120k moves across every family');
{
  const MOVES = 120000;
  let unbalanced = 0, outOfRange = 0, overallMoved = 0, unknownKey = 0;
  let move = 0;
  while (move < MOVES) {
    const position = POSITIONS[rnd(0, POSITIONS.length - 1)];
    const overall = rnd(44, 99);
    const line = lineFor(position, overall);
    const baseOvr = allocOverall(line, position);
    let shape = {};
    const tree = attrTreeFor(position);
    for (let step = 0; step < 30 && move < MOVES; step++) {
      move++;
      const fam = tree[rnd(0, tree.length - 1)];
      const child = fam.children[rnd(0, fam.children.length - 1)];
      const mode = rnd(0, 5);
      const cur = shape[child.id] ?? 0;
      const next =
        mode === 0 ? cur + 1 : mode === 1 ? cur - 1 :
        mode === 2 ? cur + 5 : mode === 3 ? cur - 5 :
        mode === 4 ? rnd(-200, 200) : Number('nope');
      shape = applyFamilyOffset(position, shape, fam.key, child.id, next);
      for (const f of tree) {
        const sum = f.children.reduce((a, c) => a + (shape[c.id] ?? 0), 0);
        if (sum !== 0) unbalanced++;
        for (const c of f.children) {
          const v = shape[c.id] ?? 0;
          if (!Number.isFinite(v) || Math.abs(v) > SHAPE_MAX || v !== Math.round(v)) outOfRange++;
        }
      }
      for (const k of Object.keys(shape)) if (!ALL_ATTR_IDS.includes(k)) unknownKey++;
      /* The shape must never be able to move the overall. Ever. */
      if (allocOverall(line, position) !== baseOvr) overallMoved++;
    }
  }
  console.log(`   ${MOVES} moves: ${unbalanced} unbalanced families, ${outOfRange} out of range offsets, ${unknownKey} unknown keys, ${overallMoved} overall drifts`);
  if (unbalanced > 0) fail(`${unbalanced} families fell out of balance, which would let shaping move the overall`);
  if (outOfRange > 0) fail(`${outOfRange} offsets escaped the plus or minus ${SHAPE_MAX} window`);
  if (unknownKey > 0) fail(`${unknownKey} unknown attribute keys reached the shape`);
  if (overallMoved > 0) fail(`${overallMoved} shapes moved the overall`);
}

/* ---------- 10. Rubbish in the physique and the shape ---------- */
console.log('10) Garbage physique and shape values');
{
  const junk = [
    null, undefined, {}, { heightCm: NaN, weightKg: NaN }, { heightCm: 'tall', weightKg: 'heavy' },
    { heightCm: -9000, weightKg: 1e9 }, { heightCm: Infinity, weightKg: -Infinity },
    { heightCm: 180.6, weightKg: 76.4 },
  ];
  for (const j of junk) {
    const p = safePhysique('ST', j);
    if (!Number.isFinite(p.heightCm) || p.heightCm < HEIGHT_MIN || p.heightCm > HEIGHT_MAX) fail(`safePhysique let ${JSON.stringify(j)} through as height ${p.heightCm}`);
    if (!Number.isFinite(p.weightKg) || p.weightKg < WEIGHT_MIN || p.weightKg > WEIGHT_MAX) fail(`safePhysique let ${JSON.stringify(j)} through as weight ${p.weightKg}`);
    if (p.heightCm !== Math.round(p.heightCm)) fail('safePhysique returned a fractional height');
  }
  const badShapes = [
    null, undefined, 'nope', 42, { finishing: 999 }, { finishing: NaN },
    { finishing: 5 }, // unbalanced family, must be dropped whole
    { finishing: 6, penalties: -6 }, // balanced, must survive
    { not_a_real_attribute: 4 },
  ];
  for (const b of badShapes) {
    const s = safeShape('ST', b);
    for (const [k, v] of Object.entries(s)) {
      if (!ALL_ATTR_IDS.includes(k)) fail(`safeShape kept unknown key ${k}`);
      if (!Number.isFinite(v) || Math.abs(v) > SHAPE_MAX) fail(`safeShape kept out of range ${k}=${v}`);
    }
    for (const fam of attrTreeFor('ST')) {
      const sum = fam.children.reduce((a, c) => a + (s[c.id] ?? 0), 0);
      if (sum !== 0) fail(`safeShape returned an unbalanced ${fam.label}`);
    }
  }
  if (safeShape('ST', { finishing: 5 }).finishing !== undefined) fail('an unbalanced family survived safeShape');
  if (safeShape('ST', { finishing: 6, penalties: -6 }).finishing !== 6) fail('a legal balanced family was dropped by safeShape');
  console.log('   every garbage physique clamped, every unbalanced or unknown shape dropped, legal shapes kept');
}

/* ---------- 11. A save from before this round still loads and plays ------- */
console.log('11) A pre Round 131 save');
{
  /* Build a real career, then strip it back to the shape a save written before
     this round actually had on disk. */
  let c = initCareer('Old', 'England', 'CM', '2020s', lineFor('CM', 58), 58, 2020, FALLBACK_CLUBS, null, 84);
  c = advanceYouthYear(c, FALLBACK_CLUBS);
  delete c.physique; delete c.attrShape; delete c.potentialEarned;
  delete c.eliteStreak; delete c.startingOverall;
  const before = JSON.parse(JSON.stringify(c));

  /* Screens can be opened before a step is taken, so everything a screen reads
     has to be safe on the raw save, not merely after repairCareer. And it has
     to give the SAME answer either side of the repair, because otherwise the
     order in which a player happens to tap things changes his career. */
  const rawFx = careerBuildEffects(before);
  const repaired = repairCareer(JSON.parse(JSON.stringify(before)));
  const repFx = careerBuildEffects(repaired);
  for (const k of ['goalMult', 'assistMult', 'appsMult', 'cleanSheetMult', 'ratingDelta', 'injuryDelta']) {
    if (Math.abs(rawFx[k] - repFx[k]) > 1e-9) fail(`an old save reads ${k} as ${rawFx[k]} before repair and ${repFx[k]} after, so tapping a screen first changes the career`);
  }
  if (typeof effectivePotential(before) !== 'number') fail('effectivePotential threw on an unrepaired save');
  if (effectivePotential(before) !== effectivePotential(repaired)) fail('the ceiling moved across the repair');
  if (deriveMap(before, before.position, before.physique, before.attrShape).vision === undefined) fail('the attribute screen cannot render an unrepaired save');
  /* A save the player never shaped, whatever its stat line has grown into, must
     never be pushed outside the window a deliberate build could reach. */
  for (const k of ['goalMult', 'assistMult']) {
    if (rawFx[k] < 0.85 || rawFx[k] > 1.18) fail(`an untouched old save is at ${k} ${rawFx[k].toFixed(3)}, which is a bigger swing than it should ever get for free`);
  }

  if (repaired.startingOverall !== undefined) fail('repair invented a starting overall it cannot know');
  if (repaired.potentialEarned !== 0) fail('repair did not zero the earned ceiling');
  if (!repaired.physique || !repaired.physique.heightCm) fail('repair did not give the save a frame');

  let played = JSON.parse(JSON.stringify(before));
  let guard = 0, crashed = null;
  try {
    while (!played.retired && guard < 200) {
      guard++;
      if (played.phase === 'youth') { played = advanceYouthYear(played, FALLBACK_CLUBS); continue; }
      if (played.phase === 'contract_offer' && played.pendingOffers.length) { played = acceptOffer(played, played.pendingOffers[0]); continue; }
      if (played.phase === 'playing') { played = advanceProSeason(played, FALLBACK_CLUBS); continue; }
      if (played.phase === 'retirement_suggestion') { played = engine.declineRetirementSuggestion(played); continue; }
      played = { ...played, phase: 'playing', pendingSummary: null, pendingNews: [], pendingEvents: [], transferSituation: null, pendingBallonDor: null, pendingTournament: null, pendingWorldCup: null, pendingRivalryEvent: null, pendingMoralDilemma: null, pendingAppealResult: null };
    }
  } catch (e) { crashed = String(e).split('\n')[0]; }
  if (crashed) fail('an old save crashed on the way through: ' + crashed);
  const proPlayed = played.seasons.filter((s) => s.type === 'playing').length;
  console.log(`   old save played ${proPlayed} pro seasons, peaked ${played.peakOverall}, retired=${played.retired}, verdict ${played.legacy ? played.legacy.tier : 'none'}, frame repaired to ${played.physique?.heightCm}cm`);
  if (!played.retired) fail('the old save never finished');
  if (played.legacy && played.legacy.breakdown.some((b) => b.label === 'The Climb')) fail('an old save was given a climb line after playing on');

  /* Save size. Round 130 measured the whole thing at about 40 KB and this
     round is sharing that budget. */
  let full = playCareer({ position: 'ST', overall: 62, potential: 92 }).state;
  full = applyShapeToState(full);
  const bytes = JSON.stringify(full).length;
  const bare = JSON.stringify({ ...full, physique: undefined, attrShape: undefined, potentialEarned: undefined, eliteStreak: undefined, startingOverall: undefined }).length;
  console.log(`   a full career save is ${(bytes / 1024).toFixed(1)} KB, of which this round added ${bytes - bare} bytes`);
  if (bytes - bare > 900) fail(`this round put ${bytes - bare} bytes on every save, which is too much of the 40 KB budget`);
  if (bytes > 60000) fail(`a full career save is ${(bytes / 1024).toFixed(1)} KB, over the budget`);
}

function applyShapeToState(s) {
  let shape = {};
  for (const fam of attrTreeFor(s.position)) {
    shape = applyFamilyOffset(s.position, shape, fam.key, fam.children[0].id, SHAPE_MAX);
  }
  return { ...s, attrShape: shape, physique: { heightCm: 196, weightKg: 94 } };
}

/* ---------- 12. The look screen ---------- */
console.log('12) Create your look');
{
  const sets = [
    ['skin tones', SKIN_TONES, 6], ['hair colours', HAIR_COLORS, 8], ['hairstyles', HAIRSTYLES, 12],
    ['beards', FACIAL_HAIR, 7], ['extras', ACCESSORIES, 8], ['boots', BOOTS, 10], ['celebrations', CELEBRATIONS, 10],
  ];
  const counts = [];
  for (const [name, list, was] of sets) {
    counts.push(`${name} ${was} to ${list.length}`);
    if (list.length <= was) fail(`${name} did not grow (still ${list.length})`);
    const ids = list.map((x) => x.id);
    if (new Set(ids).size !== ids.length) fail(`${name} has duplicate ids`);
    for (const o of list) {
      if (!o.label || typeof o.label !== 'string') fail(`${name} has an option with no label`);
      if (/[–—]/.test(o.label)) fail(`${name}: em or en dash in "${o.label}"`);
    }
  }
  console.log('   ' + counts.join(', '));

  /* Every hairstyle, beard and accessory has to be DRAWN, or picking it does
     nothing and the option is a lie. The avatar is one file of SVG paths, so
     checking the ids appear in it is the check. */
  const avatar = fs.readFileSync(path.join(ROOT, 'src/components/soccer-career/PlayerAvatar.tsx'), 'utf8');
  for (const h of HAIRSTYLES) {
    if (h.id === 'bald') continue;
    if (!new RegExp(`\\b${h.id}:`).test(avatar)) fail(`hairstyle ${h.id} has no drawing in PlayerAvatar`);
  }
  for (const f of FACIAL_HAIR) {
    if (f.id === 'none') continue;
    if (!new RegExp(`\\b${f.id}:`).test(avatar)) fail(`beard ${f.id} has no drawing in PlayerAvatar`);
  }
  for (const a of ACCESSORIES) {
    if (a.id === 'none') continue;
    if (!avatar.includes(`"${a.id}"`)) fail(`accessory ${a.id} has no drawing in PlayerAvatar`);
  }

  /* Surprise me still has to produce something legal, and it still must not
     hand out a dye job nobody asked for. */
  let dyed = 0;
  for (let i = 0; i < 4000; i++) {
    const a = randomAppearance();
    if (!SKIN_TONES.some((s) => s.id === a.skinTone)) fail('randomAppearance produced an unknown skin tone');
    if (!HAIRSTYLES.some((s) => s.id === a.hairstyle)) fail('randomAppearance produced an unknown hairstyle');
    if (!FACIAL_HAIR.some((s) => s.id === a.facialHair)) fail('randomAppearance produced an unknown beard');
    if (!ACCESSORIES.some((s) => s.id === a.accessory)) fail('randomAppearance produced an unknown extra');
    if (!BOOTS.some((s) => s.id === a.boots)) fail('randomAppearance produced an unknown boot');
    if (!CELEBRATIONS.some((s) => s.id === a.celebration)) fail('randomAppearance produced an unknown celebration');
    const hc = HAIR_COLORS.find((c) => c.id === a.hairColor);
    if (!hc) fail('randomAppearance produced an unknown hair colour');
    else if (hc.label.startsWith('Dyed') || hc.id === 'bleach') dyed++;
  }
  if (dyed > 0) fail(`surprise me handed out a dye job ${dyed} times`);
  console.log(`   4000 surprise me rolls, all legal, zero unasked for dye jobs`);
}

/* ---------- 13. No em dashes, no other companies' names ---------- */
console.log('13) Copy rules on everything this round wrote');
{
  const FILES = [
    'src/lib/soccerCareerAttributes.ts',
    'src/lib/soccerCareerAppearance.ts',
    'src/components/soccer-career/AppearanceBuilder.tsx',
    'src/components/soccer-career/PlayerAvatar.tsx',
    'src/pages/SoccerCareer.tsx',
    'src/lib/careerEras.ts',
    'src/lib/soccerCareerEngine.ts',
  ];
  /* Names of other companies' games. The plays like bank is real footballers,
     which is a sporting fact and fine; this is about product names. */
  const BRANDS = /\b(FIFA|EA Sports|EA FC|Football Manager|PES|eFootball|Madden|NBA 2K|Fortnite)\b/; // rival-names-allow: this line is itself a brand guard
  let dashes = 0, brands = 0;
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) { dashes++; fail(`${f}:${i + 1} has an em or en dash`); }
      /* Only strings a player can read. A comment explaining why a rule exists
         is allowed to name the game it is being compared against. */
      const strings = line.match(/"[^"]*"|'[^']*'|`[^`]*`/g) || [];
      for (const s of strings) {
        if (BRANDS.test(s) && !/import|from |require|\.\//.test(line)) { brands++; fail(`${f}:${i + 1} names another product in player facing copy: ${s.slice(0, 60)}`); }
      }
    });
  }
  if (dashes === 0 && brands === 0) console.log(`   ${FILES.length} files clean: no em or en dashes, no other products named in copy`);
}

console.log('');
console.log(failures === 0 ? 'ALL CREATION CHECKS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
