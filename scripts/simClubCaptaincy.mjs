/**
 * Round 244 harness (number 101): the club captaincy arc, measured over
 * seeded careers driven through the real engine.
 *
 * The arc's promises, each proven at every state transition rather than
 * asserted from the design doc:
 *   1. ONE TRUTH: whenever the armband arrives (earned in the season
 *      loop or voted via event 3), captainClub equals currentClub, the
 *      player is not on loan, and isLeader is set.
 *   2. EARNED MEANS EARNED: a seniority award only lands at age 24+,
 *      overall 76+, with at least two prior seasons at that club.
 *   3. IT NEVER TRAVELS: any accepted transfer or loan leaves
 *      isClubCaptain false, and no retirement ends with it still true.
 *   4. THE CABINET IS ARITHMETIC: every "Club Captain of" award names
 *      the club of the stint that just ended and carries exactly the
 *      seasons counted during that stint, and stints under one full
 *      season leave no line.
 *   5. IT ACTUALLY HAPPENS: across the fleet, armbands are worn at a
 *      measured rate (floors at roughly half of measured), handovers in
 *      decline occur, and old saves without the fields still play.
 *
 * Seeded (mulberry32 over Math.random) because the verdicts are rates.
 *
 * Run: node scripts/simClubCaptaincy.mjs [careers]
 */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/captaincy-engine.mjs";
const ENTRY = "/tmp/captaincy-entry.mjs";

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
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyWorldCupSpeech,
  acceptRetirementSuggestion, repairCareer,
  FALLBACK_CLUBS,
} = engine;

/* seeded randomness: the arc's rates must be reproducible */
let seed = 0x244cafe;
Math.random = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

const CAREERS = Number(process.argv[2] || 300);
const NATIONS = ["England", "Brazil", "France", "Japan", "Nigeria", "Argentina", "Morocco", "Norway"];
const POSITIONS = ["ST", "CAM", "CM", "CB", "GK", "LW", "RB", "CDM"];
const clubs = FALLBACK_CLUBS;
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });

const isCap = s => s.isClubCaptain ?? false;
const tenureAt = (s, club) => s.seasons.filter(ss => ss.club === club && ss.type === "playing").length;

let everCaptain = 0, seniorityAwards = 0, voteAwards = 0;
let transferStrips = 0, loanStrips = 0, handovers = 0, multiStint = 0;
let cabinetLines = 0, awardAgesSum = 0, crashes = 0;

for (let c = 0; c < CAREERS; c++) {
  try {
    const nat = NATIONS[c % NATIONS.length];
    const pos = POSITIONS[c % POSITIONS.length];
    const startOvr = 40 + (c % 30);
    let s = initCareer(`Cap ${c}`, nat, pos, "2020s", stats(startOvr), startOvr, 2020, clubs, null);
    let guard = 0;
    let stints = 0;
    let stintSeasons = 0; // independently counted seasons of the current stint
    let sawCaptainEver = false;

    const checkAward = (before, after, via) => {
      /* invariant 1: one truth at the moment of award */
      if (after.captainClub !== after.currentClub) fail(`career ${c}: award with captainClub ${after.captainClub} at ${after.currentClub}`);
      if (after.loan) fail(`career ${c}: armband awarded while on loan`);
      if (!after.isLeader) fail(`career ${c}: captain without isLeader`);
      /* a season-loop award counts the season being played as worn (the
         check runs before the push, the increment right after), so the
         stint opens at 1; a voted armband opens at 0 until the next
         season enters the book. */
      const opening = via === "season" ? 1 : 0;
      if ((after.captainSeasons ?? -1) !== opening) fail(`career ${c}: fresh stint opened at ${after.captainSeasons} seasons, expected ${opening}`);
      stints += 1;
      stintSeasons = opening;
      sawCaptainEver = true;
      awardAgesSum += after.age;
      if (via === "season") {
        seniorityAwards += 1;
        /* invariant 2: earned means earned (tenure measured BEFORE this
           season entered the book; the award step appends one season) */
        if (after.age < 24) fail(`career ${c}: seniority armband at age ${after.age}`);
        const priorTenure = tenureAt(after, after.currentClub) - 1;
        if (priorTenure < 2) fail(`career ${c}: seniority armband with ${priorTenure} prior seasons at ${after.currentClub}`);
      } else {
        voteAwards += 1;
      }
    };

    const step = (fn, via) => {
      const before = s;
      s = fn(before);
      if (!isCap(before) && isCap(s)) checkAward(before, s, via);
      if (isCap(before) && isCap(s) && via === "season" && s.captainClub === s.currentClub) {
        /* the engine counts a season only when it was actually played: a
           ban skips the whole year and rightly leaves the counter alone.
           So the tracker is bounded, not mirrored: the counter may hold
           or step by one, anything else is a counting bug. */
        const engineN = s.captainSeasons ?? 0;
        if (engineN !== stintSeasons && engineN !== stintSeasons + 1) {
          fail(`career ${c}: stint counter jumped ${stintSeasons} to ${engineN}`);
        }
        stintSeasons = engineN;
      }
      if (isCap(before) && !isCap(s)) {
        /* invariant 4: the cabinet line is the stint's arithmetic. The
           ending step may itself count a final played season (a handover
           after a full year) or not (a strip, a ban, a forced retirement),
           so the truth is the engine's own counter after the step, which
           endClubCaptaincy does not reset; the line must quote exactly it,
           and a stint that never completed a season leaves no line. */
        const wornAtEnd = s.captainSeasons ?? 0;
        if (wornAtEnd !== stintSeasons && wornAtEnd !== stintSeasons + 1) {
          fail(`career ${c}: stint closed at ${wornAtEnd}, tracker saw ${stintSeasons}`);
        }
        const newAwards = (s.awards ?? []).filter(a => String(a.name).startsWith("Club Captain of"))
          .length - (before.awards ?? []).filter(a => String(a.name).startsWith("Club Captain of")).length;
        if (wornAtEnd >= 1) {
          if (newAwards !== 1) fail(`career ${c}: stint of ${wornAtEnd} seasons ended with ${newAwards} cabinet lines`);
          const line = (s.awards ?? []).filter(a => String(a.name).startsWith("Club Captain of")).pop();
          if (line) {
            const m = String(line.name).match(/\((\d+) season/);
            if (!m || Number(m[1]) !== wornAtEnd) fail(`career ${c}: cabinet says ${line.name}, the engine counted ${wornAtEnd}`);
            if (!String(line.name).includes(before.captainClub ?? "")) fail(`career ${c}: cabinet line ${line.name} does not name ${before.captainClub}`);
            cabinetLines += 1;
          }
        } else if (newAwards !== 0) {
          fail(`career ${c}: stint under one season still left a cabinet line`);
        }
        if (stints > 1) multiStint += 1;
      }
      return s;
    };

    while (!s.retired && guard++ < 400) {
      switch (s.phase) {
        case "youth": step(x => advanceYouthYear(x, clubs), "youth"); break;
        case "contract_offer": {
          const offers = s.pendingOffers || [];
          if (!offers.length) { s.phase = "playing"; break; }
          const wasCap = isCap(s);
          const pickOffer = offers.find(o => o.isHomegrown) || offers[0];
          step(x => acceptOffer(x, pickOffer), "transfer");
          /* invariant 3: it never travels */
          if (isCap(s)) fail(`career ${c}: armband survived a transfer to ${s.currentClub}`);
          if (wasCap) transferStrips += 1;
          break;
        }
        case "playing": {
          const wasCap = isCap(s);
          const wasClub = s.currentClub;
          step(x => advanceProSeason(x, clubs), "season");
          if (wasCap && !isCap(s) && s.currentClub === wasClub && !s.retired) handovers += 1;
          break;
        }
        case "newspaper": step(x => dismissNewspaper(x), "ui"); break;
        case "season_summary": step(x => dismissSummary(x, clubs), "ui"); break;
        case "random_events": {
          const ev = s.pendingEvents && s.pendingEvents[0];
          if (!ev) { s.pendingEvents = []; s.phase = "playing"; break; }
          step(x => applyEventChoice(x, 0, clubs), "event");
          break;
        }
        case "moral_dilemma": step(x => dismissMoralDilemma(x, clubs), "ui"); break;
        case "social_media_action": step(x => dismissSocialMediaPhase(x, clubs), "ui"); break;
        case "red_card_appeal_result": step(x => dismissAppealResult(x, clubs), "ui"); break;
        case "international_debut": step(x => dismissDebut(x, clubs), "ui"); break;
        case "world_cup": {
          const won = s.pendingWorldCup && s.pendingWorldCup.result === "Winner";
          step(x => (won ? applyWorldCupSpeech(x, "for_the_country", clubs) : dismissWorldCup(x, clubs)), "ui");
          break;
        }
        case "rivalry_event": step(x => dismissRivalryEvent(x, clubs), "ui"); break;
        case "ballon_dor": step(x => engine.dismissBallonDor(x, clubs), "ui"); break;
        case "transfer_window": {
          const wasCap = isCap(s);
          const sit = s.transferSituation;
          const takeMove = offer => {
            step(x => acceptOffer(x, offer), "transfer");
            if (isCap(s)) fail(`career ${c}: armband survived a window transfer`);
            if (wasCap) transferStrips += 1;
          };
          if (s.pendingLoanOffers && s.pendingLoanOffers.length > 0 && c % 5 === 0 && !s.loan) {
            step(x => engine.acceptLoan(x, x.pendingLoanOffers[0]), "loan");
            if (isCap(s)) fail(`career ${c}: armband survived a loan move`);
            if (wasCap) loanStrips += 1;
          } else if (sit && sit.type === "one_offer" && c % 3 === 0) {
            takeMove(sit.offer);
          } else if (sit && sit.type === "bidding_war" && c % 3 === 0) {
            takeMove(sit.offerA);
          } else if (sit && sit.type === "dream_club" && c % 3 === 0) {
            takeMove(sit.offer);
          } else if (sit && sit.type === "contract_expiry" && (sit.offers || []).length > 0) {
            takeMove(sit.offers[0]);
          } else {
            step(x => engine.stayAtClub(x), "ui");
          }
          break;
        }
        case "retirement_suggestion":
          /* half the fleet plays into decline like real stubborn captains,
             which is the only road to the 33+ handover */
          step(x => (c % 2 === 0 ? acceptRetirementSuggestion(x) : engine.declineRetirementSuggestion(x)), "retire");
          break;
        case "retirement_ceremony": s.retired = true; break;
        default: s.retired = true; break;
      }
    }
    /* invariant 3 at the end of the road */
    if (isCap(s)) fail(`career ${c}: retired while still holding the armband`);
    if (sawCaptainEver) everCaptain += 1;
  } catch (e) {
    crashes += 1;
    if (crashes <= 3) fail(`career ${c} crashed: ${String(e).slice(0, 140)}`);
  }
}

console.log("1) the fleet");
console.log(`   ${CAREERS} careers: ${everCaptain} ever wore an armband (${(everCaptain / CAREERS * 100).toFixed(1)}%)`);
console.log(`   awards: ${seniorityAwards} earned, ${voteAwards} voted, mean age ${(awardAgesSum / Math.max(1, seniorityAwards + voteAwards)).toFixed(1)}`);
console.log(`   ends: ${transferStrips} transfer strips, ${loanStrips} loan strips, ${handovers} decline handovers, ${multiStint} second stints`);
console.log(`   ${cabinetLines} cabinet lines, every one matching its stint's arithmetic`);
if (crashes > 0) fail(`${crashes} careers crashed`);

/* rate floors from measured headroom (seeded, so these are exact reruns,
   not noise): 2026-08-20 measured 42.0% ever-captain, 80 earned and 79
   voted armbands, 152 transfer strips and 4 decline handovers over 300
   careers. Handovers are rare BY DESIGN: most captains transfer, retire,
   or stay at the level, and only a captain declining in place at 33+
   passes it on, so the floor just catches the mechanic dying outright.
   Loan strips are structural-only (a captain rarely gets loan offers
   because captains play); the assertion above fails any loan that keeps
   the armband, whatever the count. */
if (everCaptain / CAREERS < 0.20) fail(`only ${(everCaptain / CAREERS * 100).toFixed(1)}% of careers ever wore the armband, floor 20%`);
if (seniorityAwards < 40) fail(`${seniorityAwards} earned armbands, floor 40`);
if (voteAwards < 40) fail(`${voteAwards} voted armbands, floor 40`);
if (handovers < 2) fail(`${handovers} decline handovers, floor 2`);
if (transferStrips < 75) fail(`${transferStrips} transfer strips, floor 75`);
if (multiStint < 15) fail(`${multiStint} second stints, floor 15`);

/* old save compatibility: a pre-244 shape passes repair untouched-in-spirit */
console.log("2) old saves");
const oldSave = { playerName: "Old", seasons: [], events: [], awards: [], currentClub: "Somewhere FC", position: "ST" };
const repaired = repairCareer(oldSave);
if (repaired.isClubCaptain === true) fail("repair invented an armband for an old save");
const badSave = { playerName: "Bad", seasons: [], events: [], awards: [], currentClub: "Here FC", position: "ST", isClubCaptain: true, captainClub: "Elsewhere FC", captainSeasons: -3 };
const fixedSave = repairCareer(badSave);
if (fixedSave.isClubCaptain) fail("repair let an armband follow a player to a club he never captained");
if (fixedSave.captainSeasons !== 0) fail(`repair left captainSeasons at ${fixedSave.captainSeasons}`);
console.log("   pre-244 saves load flat, corrupt captaincy states repair quietly");

console.log("");
if (failures > 0) {
  console.error(`simClubCaptaincy: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simClubCaptaincy: green. The armband is earned, counted, and never travels.");
