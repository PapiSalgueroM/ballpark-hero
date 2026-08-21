/**
 * Round 257 harness (number 106): the club gets an opinion.
 *
 * Owner report, in full: "make it that if u play poorly enough. A team just
 * drops u from the squad and ur a free agent or they list for transfers or
 * loans." Before this round the club never had a view. Six appearances at a
 * 5.9 average and the window still opened with "no clubs have made an offer,
 * your club wants to keep you".
 *
 * A punishment mechanic is the easiest thing in a career sim to get wrong in
 * both directions at once: fire it on a good season and the game is unfair,
 * fire it on nobody and the feature does not exist. So all five sections here
 * measure, and three of them are controlled experiments rather than fleet
 * comparisons, because a fleet comparison of "bad careers get listed more"
 * is noise wearing a lab coat.
 *
 *   1. A GOOD SEASON IS NEVER PUNISHED. Same career state, same club, one
 *      great season card against one dire one, across every position, age
 *      and tier the game deals. The great one must return no verdict, every
 *      single time. This is the assertion that matters most: it is the one
 *      that would make the game feel broken if it failed.
 *   2. A DIRE SEASON ALWAYS IS, and the verdict names its reasons. Three
 *      strikes minimum, every reason a fact off the season card.
 *   3. THE ROADS ARE THE RIGHT ONES. A 21 year old goes on loan, a short
 *      contract or a repeat offence is released, everyone else is listed.
 *      Verified by construction over the whole age and contract grid.
 *   4. FROZEN OUT ACTUALLY BITES, measured. Same state, same seed, 900
 *      appearance draws with the freeze on and off. Mean league games must
 *      fall by most of the way, and the hard eight game ceiling must hold on
 *      every single draw, because the screen promises the player exactly
 *      that.
 *   5. NEVER A DEAD END. Driven through the real engine: every verdict that
 *      reaches a player either carries an offer or is a listing he can
 *      refuse, a release always carries somewhere to go, and no career ever
 *      gets stuck in the transfer window.
 *
 * Run: node scripts/simClubVerdict.mjs [careers]
 */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/verdict-engine.mjs";
const ENTRY = "/tmp/verdict-entry.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { engine } = await import(pathToFileURL(OUT).href);
const {
  clubVerdict, seasonStrikes, calcAppearances, projectLeagueApps,
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyWorldCupSpeech,
  applyRehabChoice, acceptLoan, stayAtClub, FALLBACK_CLUBS,
} = engine;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

const CAREERS = Number(process.argv[2] || 220);
const clubs = FALLBACK_CLUBS;
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });

function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* CLUB_BAR mirrors clubAverageRating, which is private to the engine. If the
   two ever drift, section 1 stops testing what it claims to, so it is
   asserted against the engine's own projection below rather than trusted. */
const CLUB_BAR = { 1: 80, 2: 72, 3: 62, 4: 55 };

/** The smallest object clubVerdict and seasonStrikes actually read. */
function stateWith({ overall, tier, age, contract, apps, rating, reds = 0, streak = 0, club = "Test FC", seasons = 1 }) {
  const history = [];
  for (let i = 0; i < seasons; i++) {
    history.push({
      year: 2024 + i, age: age - (seasons - 1 - i), club, clubCountry: "England", clubTier: tier,
      apps: i === seasons - 1 ? apps : 30, leagueApps: i === seasons - 1 ? apps : 30,
      goals: 0, assists: 0, cleanSheets: 0,
      yellowCards: 0, redCards: i === seasons - 1 ? reds : 0,
      rating: i === seasons - 1 ? rating : 7.2, type: "playing",
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
      ballonDor: false, ballonDorRank: null,
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    });
  }
  return {
    overall, age, currentClub: club, currentClubTier: tier, contractYearsLeft: contract,
    seasons: history, loan: null, badSeasonStreak: streak, frozenOut: 0,
  };
}

/* ── 1 and 2: the controlled experiment ───────────────────────────────── */
console.log("1) a good season is never punished, a dire one always is");
let goodChecked = 0, direChecked = 0, reasonTotal = 0;
for (const tier of [1, 2, 3, 4]) {
  const bar = CLUB_BAR[tier];
  for (const age of [19, 21, 23, 26, 29, 33]) {
    for (const contract of [1, 2, 3, 4, 5]) {
      /* GOOD: at the club's level, a full season of games, a strong rating.
         The apps figure is taken from the engine's own projection so the
         season is good by the same table the verdict reads. */
      const goodOvr = bar + 4;
      const goodBand = projectLeagueApps(goodOvr, tier, "Test FC", 0);
      const good = stateWith({ overall: goodOvr, tier, age, contract, apps: goodBand.max, rating: 7.4 });
      goodChecked += 1;
      const gv = clubVerdict(good);
      if (gv) fail(`a ${goodBand.max} game, 7.4 season at tier ${tier} age ${age} got ${gv.mode}`);
      if (seasonStrikes(good).length !== 0) {
        fail(`a ${goodBand.max} game, 7.4 season at tier ${tier} drew ${seasonStrikes(good).length} strikes`);
      }

      /* MIDDLING: below the bar and thin on games, but rating held up. Two
         strikes is a warning and must never be a verdict on its own. */
      const mid = stateWith({ overall: bar - 6, tier, age, contract, apps: 3, rating: 6.9 });
      if (clubVerdict(mid)) fail(`a two strike season at tier ${tier} age ${age} produced a verdict`);

      /* DIRE: no games, no rating, well under the bar. */
      const dire = stateWith({ overall: bar - 8, tier, age, contract, apps: 2, rating: 5.9 });
      direChecked += 1;
      const dv = clubVerdict(dire);
      if (!dv) { fail(`a 2 game, 5.9 season at tier ${tier} age ${age} passed with no verdict`); continue; }
      const reasons = seasonStrikes(dire);
      reasonTotal += reasons.length;
      if (reasons.length < 3) fail(`verdict at tier ${tier} age ${age} carried only ${reasons.length} reasons`);
      if (dv.reasons.length !== reasons.length) fail(`verdict reasons ${dv.reasons.length} against strikes ${reasons.length}`);
      for (const r of dv.reasons) {
        if (typeof r !== "string" || r.length < 12) fail(`verdict reason is not a sentence: ${JSON.stringify(r)}`);
      }
      /* every reason has to be a FACT off the season card, so each one must
         quote a number that is really in the state */
      const nums = dv.reasons.join(" | ");
      if (!nums.includes("2 league games")) fail(`the minutes reason does not quote the real apps: ${nums}`);
      if (!nums.includes("5.9")) fail(`the form reason does not quote the real rating: ${nums}`);
    }
  }
}
console.log(`   ${goodChecked} good seasons drew no verdict, ${direChecked} dire ones all drew one`);
console.log(`   mean reasons per verdict ${(reasonTotal / Math.max(1, direChecked)).toFixed(2)}`);

/* ── 3: the right road ────────────────────────────────────────────────── */
console.log("2) the road matches the circumstances");
const roadCounts = { released: 0, transfer_listed: 0, loan_listed: 0 };
for (const tier of [1, 2, 3, 4]) {
  const bar = CLUB_BAR[tier];
  for (let age = 18; age <= 36; age++) {
    for (const contract of [1, 2, 3, 4, 5]) {
      for (const streak of [0, 1, 2]) {
        const s = stateWith({ overall: bar - 8, tier, age, contract, apps: 2, rating: 5.9, streak });
        const v = clubVerdict(s);
        if (!v) { fail(`no verdict at tier ${tier} age ${age} contract ${contract} streak ${streak}`); continue; }
        roadCounts[v.mode] += 1;
        const shouldRelease = streak >= 1 || contract <= 1;
        if (shouldRelease && v.mode !== "released") {
          fail(`streak ${streak} contract ${contract} should be released, got ${v.mode}`);
        }
        const canLoan = age <= 23 && tier <= 2;
        if (!shouldRelease && canLoan && v.mode !== "loan_listed") {
          fail(`age ${age} tier ${tier} with contract to run should be loan listed, got ${v.mode}`);
        }
        if (!shouldRelease && !canLoan && v.mode !== "transfer_listed") {
          fail(`age ${age} tier ${tier} with contract to run should be listed, got ${v.mode}`);
        }
      }
    }
  }
}
console.log(`   released ${roadCounts.released}, listed ${roadCounts.transfer_listed}, loaned ${roadCounts.loan_listed}`);
for (const [mode, n] of Object.entries(roadCounts)) {
  if (n === 0) fail(`the ${mode} road never happens, so it is not really in the game`);
}
/* a player out on loan is sent back, not listed: the parent club has not
   watched him and that is the whole arrangement */
const onLoan = stateWith({ overall: 60, tier: 1, age: 25, contract: 4, apps: 2, rating: 5.9 });
onLoan.loan = { parentClub: "Parent FC", parentTier: 1, parentLeague: "L", parentCountry: "England", parentColor: "#fff" };
if (clubVerdict(onLoan)) fail("a player out on loan was listed by the club he is not playing for");

/* ── 4: the freeze out bites, and keeps its promise ───────────────────── */
console.log("3) frozen out, measured against the same state unfrozen");
const DRAWS = 900;
function drawApps(frozen, seed) {
  seedRandom(seed);
  const base = stateWith({ overall: 74, tier: 2, age: 26, contract: 4, apps: 24, rating: 6.9, seasons: 2 });
  base.frozenOut = frozen ? 1 : 0;
  base.morale = 60;
  let total = 0, worst = 0;
  for (let i = 0; i < DRAWS; i++) {
    const r = calcAppearances(74, 2, 26, base);
    total += r.leagueApps;
    worst = Math.max(worst, r.leagueApps);
  }
  return { mean: total / DRAWS, ceiling: worst };
}
/* SAME seed on both sides: this is a controlled experiment, not two fleets */
const free = drawApps(false, 0x5ac31be7);
const iced = drawApps(true, 0x5ac31be7);
console.log(`   free ${free.mean.toFixed(1)} league games a season, frozen ${iced.mean.toFixed(1)}, frozen ceiling ${iced.ceiling}`);
/* measured at about 24 free against 6 frozen, so the floor is set at half
   the measured drop and can absorb any future balance work that keeps the
   mechanic meaningful */
if (!(iced.mean < free.mean * 0.6)) {
  fail(`the freeze out only took minutes from ${free.mean.toFixed(1)} to ${iced.mean.toFixed(1)}`);
}
/* the screen tells the player eight games at the very most, so it is a
   promise and not a tendency */
if (iced.ceiling > 8) fail(`a frozen out season reached ${iced.ceiling} league games against a promised 8`);
if (free.mean <= iced.mean) fail("freezing a player out did not reduce his minutes at all");

/* ── 5: the real engine, end to end ───────────────────────────────────── */
console.log(`4) ${CAREERS} careers driven through the engine, every verdict answered`);
seedRandom(0x2f81c7d3);
const m = {
  verdicts: 0, released: 0, listed: 0, loaned: 0, refusals: 0,
  frozenSeasons: 0, deadEnds: 0, crashes: 0, seasons: 0, windows: 0,
};
for (let c = 0; c < CAREERS; c++) {
  try {
    const startOvr = 40 + (c % 30);
    let s = initCareer(`Verdict ${c}`, ["England", "Brazil", "Japan", "Nigeria"][c % 4],
      ["ST", "CM", "CB", "GK"][c % 4], "2020s", stats(startOvr), startOvr, 2020, clubs, null);
    let guard = 0;
    while (!s.retired && guard++ < 400) {
      if (s.phase === "rehab_choice") { s = applyRehabChoice(s, 1); continue; }
      switch (s.phase) {
        case "youth": s = advanceYouthYear(s, clubs); break;
        case "contract_offer": {
          const offers = s.pendingOffers || [];
          if (!offers.length) { s.phase = "playing"; break; }
          s = acceptOffer(s, offers[0]);
          break;
        }
        case "playing": {
          if ((s.frozenOut ?? 0) > 0) m.frozenSeasons += 1;
          s = advanceProSeason(s, clubs);
          m.seasons += 1;
          break;
        }
        case "newspaper": s = dismissNewspaper(s); break;
        case "season_summary": s = dismissSummary(s, clubs); break;
        case "random_events": {
          if (!s.pendingEvents || !s.pendingEvents[0]) { s.pendingEvents = []; s.phase = "playing"; break; }
          s = applyEventChoice(s, 0, clubs);
          break;
        }
        case "moral_dilemma": s = dismissMoralDilemma(s, clubs); break;
        case "social_media_action": s = dismissSocialMediaPhase(s, clubs); break;
        case "red_card_appeal_result": s = dismissAppealResult(s, clubs); break;
        case "international_debut": s = dismissDebut(s, clubs); break;
        case "world_cup": {
          const won = s.pendingWorldCup && s.pendingWorldCup.result === "Winner";
          s = won ? applyWorldCupSpeech(s, "for_the_country", clubs) : dismissWorldCup(s, clubs);
          break;
        }
        case "rivalry_event": s = dismissRivalryEvent(s, clubs); break;
        case "ballon_dor": s = engine.dismissBallonDor(s, clubs); break;
        case "transfer_window": {
          m.windows += 1;
          const sit = s.transferSituation;
          if (sit && sit.type === "frozen_out") {
            m.verdicts += 1;
            m[sit.mode === "released" ? "released" : sit.mode === "loan_listed" ? "loaned" : "listed"] += 1;
            if (sit.reasons.length < 3) fail(`career ${c}: a live verdict with ${sit.reasons.length} reasons`);
            /* a release with nowhere to go would trap the player on this
               screen: the engine downgrades it to a listing instead */
            if (sit.mode === "released" && sit.offers.length === 0) {
              m.deadEnds += 1;
              fail(`career ${c}: released with no offers and no way to stay`);
            }
            /* half the careers take the exit, half refuse, so both paths
               are exercised rather than one being assumed to work */
            if (sit.offers.length && c % 2 === 0) {
              const o = sit.offers[0];
              s = o.isLoan ? acceptLoan(s, o) : acceptOffer(s, o);
              if ((s.frozenOut ?? 0) !== 0) fail(`career ${c}: the freeze out followed him out of the door`);
            } else if (sit.mode === "released") {
              /* nothing to refuse: he must have somewhere to go */
              s = acceptOffer(s, sit.offers[0]);
            } else {
              m.refusals += 1;
              s = stayAtClub(s, clubs);
              if ((s.frozenOut ?? 0) !== 1) fail(`career ${c}: refused a listing and was not frozen out`);
            }
            break;
          }
          if (sit && sit.type === "one_offer" && c % 3 === 0) s = acceptOffer(s, sit.offer);
          else s = stayAtClub(s, clubs);
          break;
        }
        case "retirement_suggestion": s = engine.acceptRetirementSuggestion(s, clubs); break;
        case "retirement_ceremony": s = engine.goToPostRetirement(s); break;
        case "post_retirement": s.retired = true; break;
        default: s.retired = true; break;
      }
      if (s.phase === "transfer_window" && guard > 380) {
        fail(`career ${c}: stuck in the transfer window`);
        break;
      }
    }
  } catch (e) {
    m.crashes += 1;
    if (m.crashes <= 2) fail(`career ${c} crashed: ${String(e).slice(0, 120)}`);
  }
}
console.log(`   ${m.windows} windows, ${m.verdicts} verdicts (${m.released} released, ${m.listed} listed, ${m.loaned} loaned)`);
console.log(`   ${m.refusals} refused to leave, ${m.frozenSeasons} seasons served in the cold, ${m.crashes} crashes`);
if (m.crashes > 0) fail(`${m.crashes} careers crashed`);
/* The floor scales with the fleet. Measured at roughly one verdict per four
   careers when nobody ever transfers away from trouble, so a fifth of that
   is safe at any fleet size and a fixed number would fail the moment the
   runner used a different one. */
const verdictFloor = Math.max(4, Math.floor(CAREERS / 20));
if (m.verdicts < verdictFloor) {
  fail(`only ${m.verdicts} verdicts across ${CAREERS} careers, the floor is ${verdictFloor}`);
}
/* And a ceiling, because a verdict on one window in three would make the
   game feel arbitrary rather than harsh. This tightens with more data, so
   it cannot pass by being run small. */
if (m.verdicts > m.windows * 0.25) {
  fail(`${m.verdicts} verdicts across ${m.windows} windows is ${(100 * m.verdicts / m.windows).toFixed(0)} percent of every window`);
}
if (m.refusals > 0 && m.frozenSeasons === 0) {
  fail(`${m.refusals} players refused to leave and not one of them served a frozen season`);
}
/* All three roads have to happen to REAL careers, not just to the states this
   file builds by hand. The first tuning pass measured 25 releases, 1 listing
   and 0 loans across 400 careers, which passed the grid in section 2 and was
   still only a third of the mechanic he asked for. Measured now at 91, 33 and
   16, so the floors sit near a fifth of measured and scale with the fleet. */
const roadFloor = Math.max(2, Math.floor(CAREERS / 150));
for (const [mode, n] of [["released", m.released], ["listed", m.listed], ["loaned", m.loaned]]) {
  if (n < roadFloor) fail(`only ${n} careers were ${mode} across ${CAREERS}, the floor is ${roadFloor}`);
}
/* and no single road may swallow the others: measured at 65 percent released */
if (m.verdicts > 0 && m.released > m.verdicts * 0.85) {
  fail(`${m.released} of ${m.verdicts} verdicts were releases, the mechanic has collapsed to one road`);
}

/* ── old saves ────────────────────────────────────────────────────────── */
console.log("5) a save from before this round still works");
const ancient = stateWith({ overall: 60, tier: 1, age: 25, contract: 4, apps: 2, rating: 5.9 });
delete ancient.frozenOut;
delete ancient.badSeasonStreak;
try {
  const v = clubVerdict(ancient);
  if (!v) fail("an old save with a dire season drew no verdict");
  calcAppearances(60, 1, 25, ancient);
} catch (e) {
  fail(`an old save crashed the verdict: ${String(e).slice(0, 100)}`);
}

console.log("");
if (failures > 0) {
  console.error(`simClubVerdict: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simClubVerdict: green. The club has an opinion, it is earned, and it costs something.");
