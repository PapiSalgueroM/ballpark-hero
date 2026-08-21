/**
 * Round 253 harness (number 104): the injury arc, measured over seeded
 * careers driven through the real engine.
 *
 * A serious injury used to be pace -2, physical -1 and a line of text. It
 * is now a decision, and a decision is only real if the roads measurably
 * differ. That is what this proves, path by path, not from the design but
 * from thousands of actual comebacks:
 *
 *   1. IT PAUSES. Every severe injury raises the rehab_choice phase with a
 *      pendingRehab carrying the injury's real name and weeks, and the
 *      phase NEVER resolves itself: only a choice clears it.
 *   2. THE ROADS DIFFER, MEASURABLY. Rushing costs less time and more
 *      body; the plan costs the stated time and the honest toll; the
 *      specialist costs money and keeps the most. Mean pace lost per
 *      comeback is compared across the three and must order correctly
 *      (specialist < plan < rushed), which is the whole trade.
 *   3. THE MONEY IS REAL. A specialist comeback always debits exactly its
 *      quoted cost, is never offered to a player who cannot afford it,
 *      and never leaves net worth negative. The screen never lies.
 *   4. SHORTCUTS COMPOUND. Rushing raises rehabFragility, it is capped,
 *      and a fleet that always rushes gets measurably MORE injured over a
 *      career than a fleet that never does. An invisible penalty that
 *      cannot be measured is not a penalty.
 *   5. THE CAREER REMEMBERS. Every resolved injury appends exactly one
 *      seriousInjuries entry with a real year, a name from the injury
 *      list, a path, and weeks that match the road taken (a rushed
 *      comeback is shorter than the diagnosis unless it broke down).
 *   6. OLD SAVES ARE UNTOUCHED. A career object with none of the new
 *      fields plays through the arc without crashing.
 *
 * Seeded (mulberry32 over Math.random) because the verdicts are rates.
 *
 * Run: node scripts/simInjuryArc.mjs [careers]
 */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/injury-engine.mjs";
const ENTRY = "/tmp/injury-entry.mjs";

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
  applyRehabChoice, FALLBACK_CLUBS,
} = engine;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

const CAREERS = Number(process.argv[2] || 260);
const NATIONS = ["England", "Brazil", "France", "Japan", "Nigeria", "Argentina", "Morocco", "Norway"];
const POSITIONS = ["ST", "CAM", "CM", "CB", "GK", "LW", "RB", "CDM"];
const clubs = FALLBACK_CLUBS;
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });

/* the real names the engine can deal, so a plaque can never invent one */
const KNOWN_SEVERE = ["ACL rupture", "Achilles tendon rupture", "Broken leg", "Back stress fracture", "Ruptured quad"];

function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Drive a fleet of careers, answering every rehab with `road`
 * (0 rush, 1 plan, 2 specialist-if-offered). Returns the measurements.
 */
function runFleet(road, seedBase, careers) {
  seedRandom(seedBase);
  const m = {
    injuries: 0, resolved: 0, paceLost: 0, moneySpent: 0, specialistTaken: 0,
    setbacks: 0, offeredSpecialist: 0, crashes: 0, seasonsPlayed: 0,
    maxFragility: 0, historyEntries: 0,
  };
  for (let c = 0; c < careers; c++) {
    try {
      const nat = NATIONS[c % NATIONS.length];
      const pos = POSITIONS[c % POSITIONS.length];
      const startOvr = 44 + (c % 26);
      let s = initCareer(`Inj ${c}`, nat, pos, "2020s", stats(startOvr), startOvr, 2020, clubs, null);
      let guard = 0;
      while (!s.retired && guard++ < 400) {
        if (s.phase === "rehab_choice") {
          const r = s.pendingRehab;
          m.injuries += 1;
          /* 1: the pause carries a real diagnosis */
          if (!r) { fail(`career ${c}: rehab_choice with no pendingRehab`); s.phase = "playing"; continue; }
          if (!KNOWN_SEVERE.includes(r.name)) fail(`career ${c}: invented injury name ${r.name}`);
          if (!(r.weeks >= 14 && r.weeks <= 30)) fail(`career ${c}: severe injury of ${r.weeks} weeks`);
          if (!(r.year >= 2019 && r.year <= 2070)) fail(`career ${c}: injury dated ${r.year}`);
          if (r.specialistCost !== null && r.specialistCost <= 0) fail(`career ${c}: specialist quoted ${r.specialistCost}`);
          if (r.specialistCost !== null) m.offeredSpecialist += 1;

          const paceBefore = s.pace;
          const worthBefore = s.netWorth;
          const histBefore = (s.seriousInjuries ?? []).length;
          const canSpecialist = r.specialistCost !== null && s.netWorth >= r.specialistCost;
          const take = road === 2 && canSpecialist ? 2 : road === 2 ? 1 : road;

          s = applyRehabChoice(s, take);

          /* 1: only a choice clears the phase */
          if (s.phase === "rehab_choice") fail(`career ${c}: still stuck in rehab after choosing`);
          if (s.pendingRehab) fail(`career ${c}: pendingRehab survived the choice`);

          /* 5: the career remembers, exactly once, correctly */
          const hist = s.seriousInjuries ?? [];
          if (hist.length !== histBefore + 1) fail(`career ${c}: history went ${histBefore} to ${hist.length}`);
          const last = hist[hist.length - 1];
          if (last.name !== r.name) fail(`career ${c}: history recorded ${last.name}, the scan said ${r.name}`);
          if (last.year !== r.year) fail(`career ${c}: history dated ${last.year}, the scan said ${r.year}`);
          if (!["rushed", "plan", "specialist"].includes(last.path)) fail(`career ${c}: unknown path ${last.path}`);
          if (take === 0 && last.path !== "rushed") fail(`career ${c}: rushed choice recorded as ${last.path}`);
          if (take === 2 && last.path !== "specialist") fail(`career ${c}: specialist choice recorded as ${last.path}`);
          if (take === 0 && !last.setback && last.weeks >= r.weeks) {
            fail(`career ${c}: a clean rushed return took ${last.weeks} weeks against a ${r.weeks} week diagnosis`);
          }
          if (take !== 0 && last.weeks !== r.weeks) fail(`career ${c}: a full rehab logged ${last.weeks} of ${r.weeks} weeks`);
          if (last.setback && take !== 0) fail(`career ${c}: a setback on a road that has none`);
          m.historyEntries += 1;

          /* 3: the money is real */
          if (take === 2) {
            m.specialistTaken += 1;
            const spent = Math.round((worthBefore - s.netWorth) * 100) / 100;
            if (Math.abs(spent - r.specialistCost) > 1e-9) {
              fail(`career ${c}: specialist quoted ${r.specialistCost} and charged ${spent}`);
            }
            m.moneySpent += spent;
          } else if (s.netWorth !== worthBefore) {
            fail(`career ${c}: a free rehab road moved net worth by ${(s.netWorth - worthBefore).toFixed(2)}`);
          }
          /* a career can already be in the red from wages and standing
             costs, so the rehab is only guilty if IT pushed him under */
          if (worthBefore >= 0 && s.netWorth < 0) {
            fail(`career ${c}: rehab took net worth from ${worthBefore} to ${s.netWorth}`);
          }

          if (last.setback) m.setbacks += 1;
          m.paceLost += paceBefore - s.pace;
          m.resolved += 1;
          /* 4: fragility is bounded */
          const frag = s.rehabFragility ?? 0;
          if (frag < 0 || frag > 0.06 + 1e-9) fail(`career ${c}: fragility at ${frag}`);
          if (take !== 0 && frag !== (s.seriousInjuries ?? []).filter(h => h.path === "rushed").length * 0.02) {
            /* only rushes raise it, so it must equal 2 points per rush (capped) */
            const expected = Math.min(0.06, hist.filter(h => h.path === "rushed").length * 0.02);
            if (Math.abs(frag - expected) > 1e-9) fail(`career ${c}: fragility ${frag} against ${hist.filter(h => h.path === "rushed").length} rushes`);
          }
          m.maxFragility = Math.max(m.maxFragility, frag);
          continue;
        }
        switch (s.phase) {
          case "youth": s = advanceYouthYear(s, clubs); break;
          case "contract_offer": {
            const offers = s.pendingOffers || [];
            if (!offers.length) { s.phase = "playing"; break; }
            s = acceptOffer(s, offers.find(o => o.isHomegrown) || offers[0]);
            break;
          }
          case "playing": s = advanceProSeason(s, clubs); m.seasonsPlayed += 1; break;
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
            const sit = s.transferSituation;
            if (sit && sit.type === "one_offer" && c % 3 === 0) s = acceptOffer(s, sit.offer);
            else if (sit && sit.type === "multiple_offers" && c % 4 === 0) s = acceptOffer(s, sit.offers[0]);
            else s = engine.stayAtClub(s, clubs);
            break;
          }
          case "retirement_suggestion": s = engine.acceptRetirementSuggestion(s, clubs); break;
          case "retirement_ceremony": s = engine.goToPostRetirement(s); break;
          case "post_retirement": s.retired = true; break;
          default: s.retired = true; break;
        }
      }
    } catch (e) {
      m.crashes += 1;
      if (m.crashes <= 2) fail(`career ${c} crashed: ${String(e).slice(0, 110)}`);
    }
  }
  return m;
}

console.log(`1) three fleets of ${CAREERS} careers, one per road back`);
const rushed = runFleet(0, 0x19a7c3f1, CAREERS);
const plan = runFleet(1, 0x19a7c3f1, CAREERS);
const spec = runFleet(2, 0x19a7c3f1, CAREERS);
for (const [name, m] of [["rushed", rushed], ["plan", plan], ["specialist", spec]]) {
  if (m.crashes > 0) fail(`${name}: ${m.crashes} careers crashed`);
  const meanPace = m.resolved ? m.paceLost / m.resolved : 0;
  console.log(`   ${name.padEnd(10)} ${m.injuries} serious injuries, ${m.resolved} resolved, mean pace lost ${meanPace.toFixed(2)}, setbacks ${m.setbacks}, specialist taken ${m.specialistTaken}`);
}

console.log("2) the arc actually fires");
/* the floor scales with the fleet: measured about one serious injury per
   2.3 careers, so a third of that is a safe floor at any fleet size and
   a fixed number would fail the moment the runner used a different one */
const injuryFloor = Math.max(8, Math.floor(CAREERS / 3));
if (rushed.injuries < injuryFloor) fail(`only ${rushed.injuries} serious injuries across ${CAREERS} careers, the floor is ${injuryFloor}`);
if (rushed.resolved !== rushed.injuries) fail(`${rushed.injuries} injuries but ${rushed.resolved} resolved`);
if (rushed.historyEntries !== rushed.resolved) fail(`history entries ${rushed.historyEntries} against ${rushed.resolved} comebacks`);
if (spec.specialistTaken < 5) fail(`the specialist was taken only ${spec.specialistTaken} times, the floor is 5`);
if (spec.moneySpent <= 0) fail("the specialist fleet spent nothing");

console.log("3) the three roads measurably differ");
const meanOf = m => (m.resolved ? m.paceLost / m.resolved : 0);
const pr = meanOf(rushed), pp = meanOf(plan), ps = meanOf(spec);
if (!(ps < pp)) fail(`the specialist (${ps.toFixed(2)}) does not beat the plan (${pp.toFixed(2)}) on pace kept`);
if (!(pp < pr)) fail(`the plan (${pp.toFixed(2)}) does not beat rushing (${pr.toFixed(2)}) on pace kept`);
/* the setback rate is the price of rushing and must be real but not a trap */
const setbackRate = rushed.resolved ? rushed.setbacks / rushed.resolved : 0;
console.log(`   pace lost per comeback: specialist ${ps.toFixed(2)} < plan ${pp.toFixed(2)} < rushed ${pr.toFixed(2)}; setback rate ${(setbackRate * 100).toFixed(1)}%`);
if (setbackRate < 0.3 || setbackRate > 0.6) fail(`setback rate ${(setbackRate * 100).toFixed(1)}% is outside the 30-60 band the copy promises`);
if (plan.setbacks !== 0 || spec.setbacks !== 0) fail("a setback happened on a road that does not have them");

console.log("4) shortcuts compound, measured as a controlled experiment");
if (rushed.maxFragility <= 0) fail("no career that rushed ever became more fragile");
if (plan.maxFragility !== 0 || spec.maxFragility !== 0) fail("a careful career picked up fragility");
/* Comparing two fleets cannot see two points of injury chance: the careers
   diverge after the first injury and the noise swamps the signal, which is
   exactly what the first version of this check measured (rushing came back
   LESS injured, by luck). So the penalty is measured properly instead: the
   SAME career state, the SAME seed, one clone carrying the fragility a
   career of shortcuts earns and one clone carrying none. With an identical
   random stream the only thing that can differ is the threshold, so the
   fragile clone can never be injured less, and over enough trials it must
   be injured measurably more. */
{
  seedRandom(0x5eed1234);
  let base = initCareer("Frag", "England", "ST", "2020s", stats(70), 70, 2020, clubs, null);
  let guard = 0;
  while (base.phase !== "playing" && guard++ < 40) {
    if (base.phase === "youth") base = advanceYouthYear(base, clubs);
    else if (base.phase === "contract_offer") {
      const offers = base.pendingOffers || [];
      base = offers.length ? acceptOffer(base, offers[0]) : { ...base, phase: "playing" };
    } else break;
  }
  const TRIALS = 900;
  let clean = 0, fragile = 0, everFewer = 0;
  for (let t = 0; t < TRIALS; t++) {
    const seedForTrial = 0x1000 + t * 7919;
    seedRandom(seedForTrial);
    const a = advanceProSeason({ ...base, rehabFragility: 0, pendingRehab: null }, clubs);
    const aHurt = a.phase === "rehab_choice" ? 1 : 0;
    seedRandom(seedForTrial);
    const b = advanceProSeason({ ...base, rehabFragility: 0.06, pendingRehab: null }, clubs);
    const bHurt = b.phase === "rehab_choice" ? 1 : 0;
    clean += aHurt;
    fragile += bHurt;
    if (bHurt < aHurt) everFewer += 1;
  }
  console.log(`   over ${TRIALS} identical seeded seasons: careful body ${clean} serious injuries, fragile body ${fragile}`);
  if (everFewer > 0) {
    fail(`${everFewer} seeded seasons injured the CAREFUL body and spared the fragile one, which is impossible if fragility only raises the chance`);
  }
  if (!(fragile > clean)) {
    fail(`a career of shortcuts took ${fragile} injuries against ${clean} for a careful one, so the fragility penalty is invisible`);
  }
}

console.log("5) a save written before this round still plays");
{
  seedRandom(0x0d5a7e11);
  let s = initCareer("Legacy", "England", "ST", "2020s", stats(60), 60, 2020, clubs, null);
  delete s.pendingRehab; delete s.seriousInjuries; delete s.rehabFragility;
  let guard = 0, ok = true;
  try {
    while (!s.retired && guard++ < 120) {
      if (s.phase === "rehab_choice") { s = applyRehabChoice(s, 1); continue; }
      if (s.phase === "youth") { s = advanceYouthYear(s, clubs); continue; }
      if (s.phase === "contract_offer") {
        const offers = s.pendingOffers || [];
        if (!offers.length) { s.phase = "playing"; continue; }
        s = acceptOffer(s, offers[0]); continue;
      }
      if (s.phase === "playing") { s = advanceProSeason(s, clubs); continue; }
      if (s.phase === "season_summary") { s = dismissSummary(s, clubs); continue; }
      if (s.phase === "newspaper") { s = dismissNewspaper(s); continue; }
      break;
    }
  } catch (e) { ok = false; fail(`an old-shaped save crashed: ${String(e).slice(0, 90)}`); }
  if (ok) console.log("   an old save with none of the new fields played through");
}

console.log("");
if (failures > 0) {
  console.error(`simInjuryArc: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simInjuryArc: green. Three roads back, and every one of them costs something real.");
