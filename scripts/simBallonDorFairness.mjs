/* Ballon d'Or fairness harness (Round 54 rule, revived in Round 226).
   Owner report behind it: "you can have the best stats that season and they
   won't give you the award".

   This file spent months dead and invisible: it was named test*, which
   runAllSims silently skips by design, and its bundle import died on
   localStorage at module scope, so even running it by hand failed. Round
   226 renamed it sim* so the runner discovers it, stubbed storage before
   the import, and it has been green since. The naming rule it tripped is
   documented in CLAUDE.md: a harness named test* does not exist.

   Round 226 also brought it up to the house harness rules it predates:
   the engine's own randomness made the verdict flip run to run (measured:
   one run snubbed a 38 goal season at rank 3, the next run was 85 for 85),
   so Math.random is seeded and every run is the same run; and the
   must-win trigger keyed off the FIELD MAXIMUM, which the rules ban
   because a one goal edge over a max is noise, so winning now requires
   outscoring the field by five or more with a major won before the
   harness demands the trophy. The must-podium rule (45+ goals or 55+
   involvements) was solid and is unchanged.

   ROUND 834: IT WAS STILL A COIN TOSS, AND WHY. Seeding made every run the
   same run, but it made the verdict a property of one seed. Measured over 20
   seeds (0xb4110, then 7919k + 834 for k = 1 to 19) on origin/main ac0801c1
   and on the Round 834 branch, identical on both: 5 of 20 seeds red, each
   with exactly one must-win season finishing 3rd, 669 of 674 must-win seasons
   won in all, and 2,188 of 2,188 must-podium seasons on the podium. The
   assertion was "zero snubs", an all of N rule on one seed: a rare event
   either lands in that seed's sample or it does not.

   The rare event is real and is not this harness's to fix. The harness
   judges "the field" as the nine rivals the ceremony shows; the engine
   (Round 292, calculateBallonDor) judges the top ten rivals by points, and
   when the player is nominated he takes one of the ten seats, so the tenth
   rival is judged but never shown. Seed 0xb4110: the player scored 38 and won
   a major, the nine on screen topped out at 33, and an off screen tenth on 45
   goals made the season "not dominant", so the difficulty bonus ran and he
   finished 3rd. Whether the engine should judge only the men on screen is a
   game change, reported to the lead, not made here.

   So the statistic changed, not the game. Each run pools four seeds (the
   base, then base + 7919k for k = 1 to 3) and asserts:
     - must-podium is an INVARIANT, all of them: the engine's podium floor
       verdict guarantees it for any 45 goal or 55 involvement season it
       nominates, and 2,188 of 2,188 confirm it;
     - must-win is a RATE: at least 95% of the pooled must-win seasons win.
       Measured: 99.3% over the 20 seeds pooled, worst single seed 96.7%
       (29 of 30); about one snub per 130 seasons, so a pool of roughly 130
       sits near 99% and 95% is several snubs of headroom.
   Measured with the pooled statistic over 20 base seeds (0xb4110, then
   104729k + 834 for k = 1 to 19), on origin/main ac0801c1 and on the branch,
   identical: 0 of 20 red, must-win rate per run min 97.7%, median 99.2%, max
   100%, every must-podium season on the podium (412 to 472 per run). Both
   controls: 20 of 20 red (nodominance wins 0 to 3.6%, nofloor pushes
   monster seasons off the podium on every run).

   ROUND 1023: THE ENGINE NOW JUDGES THE MEN ON SCREEN. The game change the
   paragraph above reported to the lead is made: calculateBallonDor judges
   dominance against the nine rivals the card seats (shortlistSize - 1, the
   player takes the tenth seat), so the off screen tenth man cannot cost a
   season any more. That turns must-win into an invariant like must-podium:
   a must-win season outscored the nine on screen by five with a major, the
   engine calls it dominant by the same field, and the dominance verdict puts
   it first. So every must-win season must win; the 95% rate floor stays.
   Measured, base seeds 0xb4110 and 104729k + 834 for k = 1 to 4 (20 seeds):
     main 1aaba4d5  0xb4110 162 of 163, k1 135 of 137, k2 137 of 137,
                    k3 132 of 134, k4 139 of 139: 705 of 710, 5 snubs
     branch         0xb4110 157 of 157, k1 138 of 138, k2 133 of 133,
                    k3 106 of 106, k4 135 of 135: 669 of 669, none
   (the run is not the same run on both sides after the first season the
   rule decides differently, because the difficulty bonus draws only for a
   season that is not dominant). Every monster season podiumed on both.

   ROUND 1023'S REVIEW: THE RULE WAS FENCED FROM ONE SIDE, ON ONE SEASON.
   The outcome checks above cannot see the judged field directly. Judged
   against eight (one seated rival nobody judges) every check stayed green
   while the run moved, and the tenthman control fired on one season of one
   seed: main's own record above has 0 snubs on k2 and k4, so put back to ten
   the engine passed there. So the engine now notes who it judged
   (lastBallonDorJudged, never saved), and on every night the player is on the
   ballot this requires those names to be exactly the rivals the card seats,
   checked per seed, and requires every seed to have such a night. Controls
   eight and tenthman break that on every night on the ballot, so they fire on
   every seed whatever the draws do, not only where an off card man happens to
   cost a season. Measured on the branch: base 0xb4110 1,434 of 1,434 nights
   on the ballot judged the seated nine (157 of 157 must-win), base 210292
   (k2) 1,425 of 1,425 (133 of 133); eight breaks it on 1,429 and 1,438
   nights, 4 of 4 seeds both times; tenthman on 1,437 and 1,407 nights, 4 of
   4 seeds, and on base 210292 it costs no season at all, so before this
   check it passed there.

   NEGATIVE CONTROLS (BDOR_FAIRNESS_CONTROL), each must exit 1:
     nodominance  the engine never calls a season dominant (the Round 54
                  snub machine back): the must-win rate collapses
     nofloor      the podium floor verdict is gone: monster seasons fall
                  off the podium
     tenthman     Round 1023: the engine judges ten rivals again, the tenth
                  off the card: on the default seed that is main's run, one
                  must-win season (35 goals and a major against a card whose
                  best rival scored 28) finishes third; since the review
                  it also breaks the judged = seated check on every night
                  on the ballot, every seed
     eight        Round 1023 review: the engine judges eight rivals, one
                  seated man unjudged: the judged = seated check, every seed
   Each control refuses to run unless the exact text it replaces is present.

   Run: node scripts/simBallonDorFairness.mjs   (BDOR_FAIRNESS_SEED=<n> to
   move the base seed)
*/
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

import { build } from "esbuild";
import os from 'node:os';
import path from 'node:path';
import { readFileSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE_SEED = Number(process.env.BDOR_FAIRNESS_SEED || 0xb4110) >>> 0;
const SEEDS = [0, 1, 2, 3].map(k => (BASE_SEED + k * 7919) >>> 0);
const MUST_WIN_FLOOR = 0.95;

const CONTROL = process.env.BDOR_FAIRNESS_CONTROL || "";
const CONTROLS = {
  nodominance: ["  const playerDominant = playerCanContend && (", "  const playerDominant = false && playerCanContend && ("],
  nofloor: ["        if (statMonster && playerRank !== null && playerRank > 3) {", "        if (false && statMonster && playerRank !== null && playerRank > 3) {"],
  /* Round 1023: the engine judges ten rivals again, one of them off the card. */
  tenthman: ["  const visibleField = allNomineeData.slice(0, SOCCER_BALLON_DOR.award.shortlistSize - 1);", "  const visibleField = allNomineeData.slice(0, 10);"],
  /* Round 1023 review: one man short, a seated rival nobody judges. */
  eight: ["  const visibleField = allNomineeData.slice(0, SOCCER_BALLON_DOR.award.shortlistSize - 1);", "  const visibleField = allNomineeData.slice(0, SOCCER_BALLON_DOR.award.shortlistSize - 2);"],
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown BDOR_FAIRNESS_CONTROL=${CONTROL} (known: ${Object.keys(CONTROLS).join(", ")})`);
  process.exit(2);
}
if (CONTROL) console.log(`CONTROL ${CONTROL}: the engine is mutated, this run must go red`);

/* One generator per seed, so every pooled seed is the same run every time. */
function seedRandom(seed) {
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OUT = path.join(os.tmpdir(), `sc-bdor-${process.pid}.mjs`);
const ENGINE = path.resolve("src/lib/soccerCareerEngine.ts").replaceAll("\\", "/").toLowerCase();
await build({
  entryPoints: ["src/lib/soccerCareerEngine.ts"],
  bundle: true, format: "esm", platform: "node", outfile: OUT,
  logLevel: "error", alias: { "@": "./src" },
  plugins: CONTROL ? [{
    name: "fairness-control",
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
        if (args.path.replaceAll("\\", "/").toLowerCase() !== ENGINE) return undefined;
        const src = readFileSync(args.path, "utf8").replace(/\r\n/g, "\n");
        const [from, to] = CONTROLS[CONTROL];
        if (!src.includes(from)) throw new Error(`control ${CONTROL} refused: the engine does not contain ${JSON.stringify(from)}`);
        return { contents: src.replace(from, to), loader: "ts" };
      });
    },
  }] : [],
});
const eng = await import(pathToFileURL(OUT).href);
unlinkSync(OUT);
const { initCareer, advanceYouthYear, acceptOffer, advanceProSeason, FALLBACK_CLUBS } = eng;

const clubs = FALLBACK_CLUBS;
const st = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });

/** Build an elite striker parked at a tier-1 club, ready to play a season. */
function eliteStriker(seed) {
  let s = initCareer(`Monster ${seed}`, "Brazil", "ST", "2020s", st(92), 92, 2020, clubs, null);
  while (s.phase === "youth") s = advanceYouthYear(s, clubs);
  const offer = { club: clubs.find(c => c.tier === 1), contractYears: 5, wage: 400000, transferFee: 0 };
  s = acceptOffer(s, offer);
  // Force world class, mid prime, elite club
  s = { ...s, age: 26, overall: 93, shooting: 95, pace: 92, dribbling: 93, passing: 90,
        primeType: "extended", peakOverall: 93, currentClubTier: 1 };
  return s;
}

/** One seed: the same procedure the harness always ran, counted. */
function runSeed(seed) {
  seedRandom(seed);
  const r = { seed, mustWin: 0, won: 0, snubs: [], mustPodium: 0, podium: 0, offPodium: [], onBallot: 0, misjudged: [] };

  /* Case 1: a statistically dominant season must win the award. Kept as it
     was: the ceremony is module private, so this finds no hook and only
     plays its seasons (their draws are part of every measured seed). */
  for (let i = 0; i < 200; i++) {
    let s = eliteStriker(i);
    s = advanceProSeason(s, clubs);
    const last = s.seasons[s.seasons.length - 1];
    if (!last || last.type !== "playing") continue;
    last.goals = 48;
    last.assists = 14;
    last.apps = 52;
    last.rating = 8.6;
    last.leagueTitle = true;
    last.championsLeague = true;
    const bd = eng.__testCalculateBallonDor ? eng.__testCalculateBallonDor(s, last, last.year) : null;
    if (bd) {
      r.mustWin++;
      if (bd.playerRank === 1) r.won++;
      else r.snubs.push({ rank: bd.playerRank, pts: bd.playerPoints, top: bd.nominees[0] && bd.nominees[0].points });
    }
  }
  if (r.mustWin > 0) return r;

  /* The black-box path: simulate many elite seasons for real. */
  for (let i = 0; i < 400; i++) {
    let s = eliteStriker(i);
    for (let yr = 0; yr < 6 && !s.retired; yr++) {
      const before = s.seasons.length;
      s = advanceProSeason(s, clubs);
      // Walk the phase machine just far enough to reach the ceremony
      let guard = 0;
      while (s.pendingBallonDor === null && guard++ < 8) {
        if (s.phase === "newspaper") s = eng.dismissNewspaper(s);
        else if (s.phase === "season_summary") s = eng.dismissSummary(s, clubs);
        else if (s.phase === "random_events") {
          if (!s.pendingEvents || !s.pendingEvents.length) break;
          s = eng.applyEventChoice(s, 0, clubs);
        } else if (s.phase === "social_media_action") s = eng.dismissSocialMediaPhase(s, clubs);
        else if (s.phase === "moral_dilemma") s = eng.dismissMoralDilemma(s, clubs);
        else if (s.phase === "international_debut") s = eng.dismissDebut(s, clubs);
        else if (s.phase === "world_cup") s = eng.dismissWorldCup(s, clubs);
        else if (s.phase === "rivalry_event") s = eng.dismissRivalryEvent(s, clubs);
        else break;
      }
      const bd = s.pendingBallonDor;
      const season = s.seasons[s.seasons.length - 1];
      /* Round 1023 review: on every night the player is on the ballot, the
         rivals the engine judged dominance against are exactly the rivals the
         card seats beside him, by name. */
      if (bd && bd.playerNominated) {
        const judged = eng.lastBallonDorJudged();
        const seated = bd.nominees.filter(n => !n.isPlayer).map(n => n.name);
        r.onBallot++;
        if (!judged || judged.year !== bd.year || judged.names.length !== seated.length || !seated.every(n => judged.names.includes(n))) {
          r.misjudged.push({ year: bd.year, judged: judged && judged.year === bd.year ? judged.names.length : "none", seated: seated.length });
        }
      }
      if (bd && season && season.type === "playing") {
        const ga = season.goals + season.assists;
        // Product rules under test:
        //  1. outscoring the whole field while winning a major must win it
        //  2. any monster line (45+ goals, or 55+ G/A) must at least podium
        const fieldTopGoals = bd.nominees.reduce((mx, n) => n.isPlayer ? mx : Math.max(mx, n.goals), 0);
        const wonMajor = season.leagueTitle || season.championsLeague || season.worldCup;
        /* five clear of the field, not one: a bare edge over a maximum is
           noise and the house rules ban asserting on it */
        const mustWin = season.goals >= fieldTopGoals + 5 && wonMajor;
        const mustPodium = ga >= 55 || season.goals >= 45;
        if (mustWin) {
          r.mustWin++;
          if (bd.playerRank === 1) r.won++;
          else r.snubs.push({ rule: "outscored field + major", goals: season.goals, assists: season.assists, fieldTopGoals, rank: bd.playerRank });
        }
        if (mustPodium) {
          r.mustPodium++;
          if (bd.playerRank !== null && bd.playerRank <= 3) r.podium++;
          else r.offPodium.push({ rule: "monster line", goals: season.goals, assists: season.assists, rank: bd.playerRank });
        }
      }
      if (s.pendingBallonDor) s = eng.dismissBallonDor(s, clubs);
      if (s.seasons.length === before) break;
      if (s.phase === "transfer_window") s = eng.stayAtClub(s);
      if (s.phase === "retirement_suggestion") s = eng.declineRetirementSuggestion(s, clubs);
      if (s.phase !== "playing") break;
    }
  }
  return r;
}

const runs = SEEDS.map(runSeed);
const sum = k => runs.reduce((a, r) => a + (Array.isArray(r[k]) ? r[k].length : r[k]), 0);
const mustWin = sum("mustWin"), won = sum("won"), snubs = sum("snubs");
const mustPodium = sum("mustPodium"), podium = sum("podium"), offPodium = sum("offPodium");
const winRate = mustWin ? won / mustWin : 0;

console.log("\n=== BALLON D'OR FAIRNESS ===");
for (const r of runs) console.log(`seed ${r.seed}: must-win ${r.won}/${r.mustWin}, must-podium ${r.podium}/${r.mustPodium}, judged the seated rivals on ${r.onBallot - r.misjudged.length}/${r.onBallot} nights on the ballot`);
console.log(`must-win seasons tested : ${mustWin}   (outscored the field on screen by 5+ AND won a major, ${SEEDS.length} seeds pooled)`);
console.log(`  won the award         : ${won}   (${(winRate * 100).toFixed(1)}%, floor ${MUST_WIN_FLOOR * 100}%)`);
console.log(`  finished lower        : ${snubs}`);
if (snubs) console.log(runs.flatMap(r => r.snubs).slice(0, 5));
console.log(`must-podium seasons     : ${mustPodium}   (45+ goals or 55+ goal involvements)`);
console.log(`  finished top 3        : ${podium}`);
console.log(`  PUSHED OFF PODIUM     : ${offPodium}`);
if (offPodium) console.log(runs.flatMap(r => r.offPodium).slice(0, 5));
/* Round 1023 review: per seed, so a control that moves the judged field by
   one man either way must show on every seed, not on a lucky one. */
const misjudged = sum("misjudged");
const blindSeeds = runs.filter(r => r.onBallot === 0).map(r => r.seed);
const misjudgedSeeds = runs.filter(r => r.misjudged.length).length;
console.log(`judged field = seated   : ${sum("onBallot") - misjudged} of ${sum("onBallot")} nights on the ballot (${misjudgedSeeds} of ${runs.length} seeds with a mismatch)`);
if (misjudged) console.log(runs.flatMap(r => r.misjudged).slice(0, 5));

if (mustWin < 60 || mustPodium < 200) {
  console.log(`\nINCONCLUSIVE: too few dominant seasons to judge (${mustWin} must-win, ${mustPodium} must-podium)`);
  process.exit(2);
}
/* Round 1023: the engine judges the nine rivals the card seats, so a season
   that outscored them by five with a major is dominant by the engine's own
   rule and the dominance verdict puts it first. Every must-win season wins,
   the same kind of invariant as the podium floor; the rate floor stays. */
const ok = winRate >= MUST_WIN_FLOOR && snubs === 0 && offPodium === 0 && misjudged === 0 && blindSeeds.length === 0;
console.log(ok
  ? `\nPASS: ${(winRate * 100).toFixed(1)}% of must-win seasons won, every monster season podiumed, every night on the ballot judged the rivals it seats`
  : `\nFAIL: ${winRate < MUST_WIN_FLOOR ? `must-win seasons won ${(winRate * 100).toFixed(1)}%, under ${MUST_WIN_FLOOR * 100}%` : ""}${snubs ? ` ${snubs} must-win seasons lost the award` : ""}${offPodium ? ` ${offPodium} monster seasons pushed off the podium` : ""}${misjudged ? ` ${misjudged} nights judged dominance against other rivals than the card seats (${misjudgedSeeds} of ${runs.length} seeds)` : ""}${blindSeeds.length ? ` no night on the ballot on seed ${blindSeeds.join(", ")}, so the judged field was never checked` : ""}`);
process.exit(ok ? 0 : 1);
