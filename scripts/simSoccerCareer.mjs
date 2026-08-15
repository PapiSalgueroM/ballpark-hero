/* Round 54 playtest harness for Soccer Career.
   Bundles the engine with esbuild and simulates full careers headlessly so we
   can prove: no crashes, slower progression, working Ballon d'Or fairness,
   the academy-club offer, and the corruption/prison loop. Run:
     node scripts/simSoccerCareer.mjs [careers]
*/
import { build } from "esbuild";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/sc-engine.mjs";
const ENTRY = "/tmp/sc-engine-entry.mjs";

/* Round 124: this harness died on import with "localStorage is not defined",
   and it had been dead at origin/main before this round touched anything. The
   engine imports managerJobMarket, which imports clubManager, which imports
   squadDeal, which imports the Supabase client, which reads localStorage the
   moment the module loads. Nothing here needs Supabase, so the fix is the
   same two stage entry with a localStorage stub that scripts/simCup.mjs has
   used since Round 102. If you ever see this harness "pass" instantly with no
   output, it did not run. */
writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);

await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: OUT,
  logLevel: "error",
  alias: { "@": "./src" },
});

const { engine } = await import(pathToFileURL(OUT).href);
const {
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, dismissBallonDor, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyBdorSpeech, applyWorldCupSpeech,
  acceptRetirementSuggestion, stayAtClub, signExtension,
  FALLBACK_CLUBS, getCareerTotals, SPENDING_ITEMS, purchaseSpendingItem,
} = engine;

const CAREERS = Number(process.argv[2] || 60);
const NATIONS = ["England", "Brazil", "France", "Japan", "Nigeria", "Argentina", "Morocco", "Norway"];
const POSITIONS = ["ST", "CAM", "CM", "CB", "GK", "LW", "RB", "CDM"];
const clubs = FALLBACK_CLUBS;

const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });

const results = [];
let crashes = 0;
let homegrownOffers = 0;
let academySignings = 0;
let prisonSeasons = 0;
let convictions = 0;
let bdorSnubs = [];  // monster seasons pushed off the podium, the bug we fixed
let bdorWins = 0;
let dominantSeasons = 0;
const eventIdsSeen = new Set();
const purchasedOk = new Set();

for (let c = 0; c < CAREERS; c++) {
  try {
    const nat = NATIONS[c % NATIONS.length];
    const pos = POSITIONS[c % POSITIONS.length];
    const startOvr = 40 + (c % 30);
    let s = initCareer(`Sim ${c}`, nat, pos, "2020s", stats(startOvr), startOvr, 2020, clubs, null);
    let guard = 0;
    let peak = s.overall;

    while (!s.retired && guard++ < 400) {
      switch (s.phase) {
        case "youth":
          s = advanceYouthYear(s, clubs);
          break;
        case "contract_offer": {
          const offers = s.pendingOffers || [];
          if (!offers.length) { s.phase = "playing"; break; }
          if (offers.some(o => o.isHomegrown)) homegrownOffers++;
          // Always take the academy club when offered, that is the new path
          const pickOffer = offers.find(o => o.isHomegrown) || offers[0];
          if (pickOffer.isHomegrown) academySignings++;
          s = acceptOffer(s, pickOffer);
          break;
        }
        case "playing":
          s = advanceProSeason(s, clubs);
          break;
        case "newspaper":
          s = dismissNewspaper(s);
          break;
        case "season_summary":
          if (s.pendingSummary && s.pendingSummary.club === "PRISON") prisonSeasons++;
          s = dismissSummary(s, clubs);
          break;
        case "random_events": {
          const ev = s.pendingEvents && s.pendingEvents[0];
          if (!ev) { s.pendingEvents = []; s.phase = "playing"; break; }
          eventIdsSeen.add(ev.id);
          // Bias toward the first choice, but take dirty options sometimes so
          // the corruption machinery actually runs.
          const idx = c % 3 === 0 ? 0 : Math.min(ev.choices.length - 1, 1);
          s = applyEventChoice(s, idx, clubs);
          break;
        }
        case "moral_dilemma":
          s = dismissMoralDilemma(s, clubs);
          break;
        case "social_media_action":
          s = dismissSocialMediaPhase(s, clubs);
          break;
        case "red_card_appeal_result":
          s = dismissAppealResult(s, clubs);
          break;
        case "international_debut":
          s = dismissDebut(s, clubs);
          break;
        case "world_cup": {
          const won = s.pendingWorldCup && s.pendingWorldCup.result === "Winner";
          s = won ? applyWorldCupSpeech(s, "for_the_country", clubs) : dismissWorldCup(s, clubs);
          break;
        }
        case "rivalry_event":
          s = dismissRivalryEvent(s, clubs);
          break;
        case "ballon_dor": {
          const b = s.pendingBallonDor;
          const last = s.seasons[s.seasons.length - 1];
          if (b && last) {
            const ga = last.goals + last.assists;
            const monster = ga >= 55 || last.goals >= 45;
              // Product rule (matches scripts/testBallonDorFairness.mjs): a monster
            // line guarantees a PODIUM, not a win. Only outscoring the entire
            // shortlist while winning a major guarantees the trophy, because a
            // rival can legitimately own a year with a treble.
            if (monster) {
              dominantSeasons++;
              if (b.playerRank !== null && b.playerRank <= 3) bdorWins++;
              else bdorSnubs.push({ goals: last.goals, assists: last.assists, rank: b.playerRank });
            }
          }
          s = b && b.playerRank === 1 ? applyBdorSpeech(s, "tears", clubs) : dismissBallonDor(s, clubs);
          break;
        }
        case "transfer_window": {
          const sit = s.transferSituation;
          if (!sit || sit.type === "no_interest") { s = stayAtClub(s); break; }
          if (sit.type === "one_offer") {
            if (sit.offer.isHomegrown) { academySignings++; s = acceptOffer(s, sit.offer); }
            else s = c % 2 === 0 ? acceptOffer(s, sit.offer) : stayAtClub(s);
            break;
          }
          if (sit.type === "bidding_war") { s = acceptOffer(s, sit.offerA); break; }
          if (sit.type === "dream_club") { s = acceptOffer(s, sit.offer); break; }
          if (sit.type === "contract_expiry") {
            const offers = sit.offers || [];
            if (offers.some(o => o.isHomegrown)) homegrownOffers++;
            const pickOffer = offers.find(o => o.isHomegrown) || offers[0];
            if (!pickOffer) { s = stayAtClub(s); break; }
            if (pickOffer.isHomegrown) academySignings++;
            s = acceptOffer(s, pickOffer);
            break;
          }
          if (sit.type === "request_result") { s = sit.offer ? acceptOffer(s, sit.offer) : stayAtClub(s); break; }
          s = stayAtClub(s);
          break;
        }
        case "retirement_suggestion":
          s = acceptRetirementSuggestion(s);
          break;
        default:
          // Ceremony / post-retirement phases end the run for this harness
          guard = 999;
          break;
      }
      if (s.overall > peak) peak = s.overall;
      if (s.seasons.some(x => x.club === "PRISON")) { /* counted above */ }
    }

    // Exercise the shop, including the Round 54 items, on a rich clone
    const rich = { ...s, netWorth: 400, popularity: 90, dirtyMoney: 5, purchasedItems: [...s.purchasedItems], investmentHoldings: [...s.investmentHoldings], properties: [...s.properties], investments: [...s.investments], events: [] };
    let shopState = rich;
    for (const item of SPENDING_ITEMS) {
      const next = purchaseSpendingItem(shopState, item.id);
      if (next !== shopState) purchasedOk.add(item.id);
      shopState = next;
    }

    const totals = getCareerTotals(s.seasons);
    if (s.seasons.some(x => x.club === "PRISON")) convictions++;
    results.push({
      peak,
      finalAge: s.age,
      goals: totals.goals,
      apps: totals.apps,
      seasons: s.seasons.filter(x => x.type === "playing").length,
      heat: s.corruptionHeat ?? 0,
      dirty: s.dirtyMoney ?? 0,
      netWorth: s.netWorth,
    });
  } catch (err) {
    crashes++;
    console.error(`CAREER ${c} CRASHED:`, err && err.message);
    if (crashes <= 2 && err && err.stack) console.error(err.stack.split("\n").slice(0, 6).join("\n"));
  }
}

unlinkSync(OUT);

const avg = k => (results.reduce((a, r) => a + r[k], 0) / results.length).toFixed(1);
const pct = (n, d) => d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`;
const peaks = results.map(r => r.peak).sort((a, b) => a - b);

console.log("\n=== ROUND 54 SOCCER CAREER PLAYTEST ===");
console.log(`careers simulated : ${results.length}/${CAREERS}`);
console.log(`crashes           : ${crashes}`);
console.log(`avg peak OVR      : ${avg("peak")}   (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 90+ rate     : ${pct(results.filter(r => r.peak >= 90).length, results.length)}  (should be RARE now)`);
console.log(`peak 85+ rate     : ${pct(results.filter(r => r.peak >= 85).length, results.length)}`);
console.log(`avg pro seasons   : ${avg("seasons")}`);
console.log(`avg career goals  : ${avg("goals")}`);
console.log(`homegrown offers  : ${homegrownOffers}   academy signings: ${academySignings}`);
console.log(`monster seasons   : ${dominantSeasons}   podiumed: ${bdorWins}   SNUBBED: ${bdorSnubs.length}  (snubs must be 0)`);
if (bdorSnubs.length) console.log(bdorSnubs.slice(0, 5));
console.log(`prison seasons    : ${prisonSeasons}   convictions: ${convictions}`);
console.log(`distinct events   : ${eventIdsSeen.size}`);
console.log(`  corruption ids  : ${[...eventIdsSeen].filter(i => i >= 300 && i < 350).length}`);
console.log(`  realism ids     : ${[...eventIdsSeen].filter(i => i >= 400).length}`);
console.log(`shop items usable : ${purchasedOk.size}/${SPENDING_ITEMS.length}`);

const failures = [];
if (crashes > 0) failures.push(`${crashes} crashes`);
if (bdorSnubs.length > 0) failures.push(`${bdorSnubs.length} monster seasons pushed off the podium`);
if (homegrownOffers === 0) failures.push("no homegrown offers ever generated");
if (results.some(r => Number.isNaN(r.peak) || Number.isNaN(r.netWorth))) failures.push("NaN leaked into state");
console.log(failures.length ? `\nFAIL: ${failures.join("; ")}` : "\nPASS: no crashes, no snubs, homegrown path live");
process.exit(failures.length ? 1 : 0);
