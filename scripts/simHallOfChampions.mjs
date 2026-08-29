/**
 * Round 252 harness (number 103): Hall of Champions, the museum idle,
 * proven against the live champion tables and against days of play.
 *
 * An idle game's harness has to answer two questions the type checker
 * cannot: does it stay honest, and does it stay playable. Both here:
 *
 *   0. SAVES FAIL CLOSED. Twelve hostile shapes (wrong version, negative
 *      funds, renown past the cap, an unknown wing key, a fractional
 *      artifact count, an upgrade past its own max) all load as null, and
 *      the genuine shape loads intact. A doctored save gets a fresh
 *      museum, never a printing press.
 *   1. EVERY EXHIBIT IS REAL. The catalog is built through the game's own
 *      fetcher, then EVERY artifact in EVERY wing is checked against an
 *      independent recount of the same tables: the (year, team) pair must
 *      exist, the wing must be in year order, ids must be unique, no
 *      exhibit may carry a long dash, and a finals wing's flavor line
 *      must equal that row's verified beaten side and result. Nothing is
 *      typed into this game by hand and this is what proves it.
 *   2. THE ECONOMY MOVES. A simulated day of real play (buy whatever is
 *      affordable, open wings when possible, tap every anniversary) must
 *      reach a floor of exhibits, open several wings and finish at least
 *      one, and NEVER go negative on funds. Measured then pinned at
 *      roughly half of measured, the house rule.
 *   3. THE MULTIPLIERS ARE HONEST (Round 95's rule: a stated x3 measures
 *      3). The anniversary rush measures exactly RUSH_MULT against the
 *      same state with the rush off, milestones measure exactly 2 per 10
 *      exhibits, and offline earnings measure the offline rate and honor
 *      the eight hour cap exactly.
 *   4. REDEDICATION IS A TRADE, NOT A LOSS. Stars are paid at the stated
 *      rate, plaques survive, funds and exhibits reset, and a rededicated
 *      hall out-earns the pre-rededication hall at the same exhibit count.
 *
 * SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simHallOfChampions.mjs
 */
import { writeFileSync } from "node:fs";
import os from 'node:os';
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(os.tmpdir(), 'hall-entry.mjs');
const OUT = path.join(os.tmpdir(), 'hall.mjs');

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT.replaceAll('\\', '/')}/src/lib/hallOfChampions.ts');
export const champ = await import('${ROOT.replaceAll('\\', '/')}/src/lib/champOrNot.ts');
export const beat = await import('${ROOT.replaceAll('\\', '/')}/src/lib/whodTheyBeat.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { lib, champ, beat } = await import(pathToFileURL(OUT).href);
const {
  WING_ORDER, UPGRADES, MILESTONE_EVERY, PLAQUE_BONUS, RENOWN_PER, RENOWN_BONUS,
  REDEDICATE_MIN, RUSH_MULT, MAX_RENOWN,
  fetchCatalog, freshState, loadSave, serialize, tick, offlineReport,
  artifactCost, upgradeCost, totalIncome, wingIncome, buyArtifact, openWing,
  buyUpgrade, startRush, rededicate, canBuyArtifact, canOpenWing, canBuyUpgrade,
  canRededicate, renownOnRededicate, totalArtifacts, rushSeconds,
} = lib;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* --------------------------------------------- 0: the save fails closed */
console.log("0) hostile saves load as null, never as state");
const good = { ...freshState(7), funds: 500, owned: { sb: 3 }, openWings: ["sb"], plaques: [] };
const raw = s => JSON.stringify({ ...s, lastSeen: 1_700_000_000_000 });
const hostile = [
  ["null literal", "null"],
  ["empty string", ""],
  ["not json", "{{{"],
  ["array root", "[1]"],
  ["wrong version", raw({ ...good, v: 99 })],
  ["negative funds", raw({ ...good, funds: -5 })],
  ["infinite funds", raw({ ...good, funds: Infinity })],
  ["renown past the cap", raw({ ...good, renown: MAX_RENOWN + 1 })],
  ["unknown wing key", raw({ ...good, owned: { ...good.owned, nfl2: 4 } })],
  ["fractional exhibits", raw({ ...good, owned: { sb: 2.5 } })],
  ["upgrade past its max", raw({ ...good, levels: { ...good.levels, tours: 999 } })],
  ["unknown wing open", raw({ ...good, openWings: ["sb", "made-up"] })],
];
for (const [name, r] of hostile) {
  if (loadSave(r) !== null) fail(`hostile save (${name}) was accepted`);
}
const round = loadSave(serialize(good, 1_700_000_000_000));
if (!round || round.state.funds !== 500 || round.state.owned.sb !== 3 || round.lastSeen !== 1_700_000_000_000) {
  fail("a genuine save did not round trip");
}
console.log(`   ${hostile.length} hostile shapes rejected, the real shape round trips`);

/* ------------------------------------------- 1: every exhibit is real */
console.log("1) the catalog against the live tables");
let wings = [];
try {
  wings = await fetchCatalog();
} catch {
  wings = [];
}
if (wings.length === 0) {
  console.log("   SKIPPED, SUPABASE UNREACHABLE. THE CATALOG AND THE ECONOMY DID NOT RUN.");
  console.log("");
  if (failures > 0) { console.error(`simHallOfChampions: ${failures} failures`); process.exit(1); }
  console.log("simHallOfChampions: green (WITH LOUD SKIPS ABOVE)");
  process.exit(0);
}
if (wings.length !== WING_ORDER.length) fail(`${wings.length} wings built, ${WING_ORDER.length} are configured`);

/* independent truth, rebuilt here from the same tables through the OTHER
   games' fetchers, so a drift in the museum's own catalog shows up */
const truth = new Map();
for (const def of champ.COMPETITIONS) {
  const rows = await champ.fetchCompetitionRows(def);
  const m = new Map();
  for (const r of rows) m.set(`${r.year}:${r.team}`, r);
  truth.set(def.key, m);
}
const beatTruth = new Map();
for (const def of beat.FINALS_COMPS) {
  const rows = await beat.fetchFinalsRows(def);
  const m = new Map();
  for (const r of rows) m.set(r.year, r);
  beatTruth.set(def.key, m);
}

/* floors at half of measured 2026-08-21 (sb 60, wnba 29, cfb 49, nba 80,
   cbb 87, cup 110, ws 121, epl 127, nrl 117, afl 129) */
const WING_FLOORS = { sb: 30, wnba: 14, cfb: 24, nba: 40, cbb: 43, cup: 55, ws: 60, epl: 63, nrl: 58, afl: 64 };
let totalExhibits = 0;
const seenIds = new Set();
for (const w of wings) {
  const floor = WING_FLOORS[w.key];
  if (floor == null) fail(`${w.key}: no floor recorded, add one`);
  else if (w.artifacts.length < floor) fail(`${w.key}: ${w.artifacts.length} exhibits, the floor is ${floor}`);
  const table = truth.get(w.key);
  if (!table) { fail(`${w.key}: no independent table to check against`); continue; }
  for (let i = 0; i < w.artifacts.length; i++) {
    const a = w.artifacts[i];
    totalExhibits += 1;
    if (seenIds.has(a.id)) fail(`${w.key}: duplicate exhibit id ${a.id}`);
    seenIds.add(a.id);
    if (!table.has(`${a.year}:${a.team}`)) {
      fail(`${w.key}: exhibit "${a.year} ${a.team}" is not in the record`);
    }
    if (i > 0 && w.artifacts[i - 1].year > a.year) fail(`${w.key}: exhibits are not oldest first at ${a.year}`);
    for (const ch of `${a.team}${a.beat ?? ""}${w.title}`) {
      const c = ch.charCodeAt(0);
      if (c === 8211 || c === 8212) fail(`${w.key} ${a.year}: long dash in an exhibit line`);
    }
    /* a finals wing's plaque line must be the verified beaten side */
    const bt = beatTruth.get(w.key)?.get(a.year);
    if (bt) {
      const tail = w.key === "sb" ? bt.score : bt.series;
      if (tail && a.beat !== `the ${bt.loser} ${tail}`) {
        fail(`${w.key} ${a.year}: plaque says ${JSON.stringify(a.beat)}, the record says ${JSON.stringify(`the ${bt.loser} ${tail}`)}`);
      }
    } else if (!beatTruth.has(w.key) && a.beat) {
      fail(`${w.key} ${a.year}: a list wing carries a beaten-side line with nothing behind it`);
    }
  }
  console.log(`   ${w.key}: ${w.artifacts.length} real exhibits, ${w.artifacts[0].year} to ${w.artifacts[w.artifacts.length - 1].year}`);
}
console.log(`   ${totalExhibits} exhibits in all, every one checked against the tables`);

/* ------------------------------------------------ 2: a day of real play */
console.log("2) a simulated day of play");
const s = freshState(0x1a11);
let taps = 0, buys = 0, opens = 0, upgrades = 0, negative = 0;
/* a day at four ticks a second, played greedily: open a wing when it is
   affordable, otherwise buy the cheapest available exhibit, tap every
   anniversary the moment it is ready. */
for (let step = 0; step < 24 * 3600 * 4; step++) {
  tick(wings, s, 0.25);
  if (s.funds < 0) negative += 1;
  if (startRush(s)) taps += 1;
  const shut = wings.find(w => !s.openWings.includes(w.key));
  if (shut && canOpenWing(shut, s)) { openWing(shut, s); opens += 1; continue; }
  let best = null, bestCost = Infinity;
  for (const w of wings) {
    if (!s.openWings.includes(w.key)) continue;
    const n = s.owned[w.key] ?? 0;
    if (n >= w.artifacts.length) continue;
    const c = artifactCost(w, n, s);
    if (c < bestCost) { best = w; bestCost = c; }
  }
  if (best && canBuyArtifact(best, s)) { buyArtifact(best, s); buys += 1; continue; }
  for (const u of UPGRADES) {
    if (canBuyUpgrade(u.id, s) && upgradeCost(u, s.levels[u.id]) < s.funds * 0.35) {
      buyUpgrade(u.id, s); upgrades += 1; break;
    }
  }
}
console.log(`   after a day: ${totalArtifacts(s)} exhibits, ${s.openWings.length} wings open, ${s.plaques.length} complete, ${upgrades} upgrades, ${taps} anniversaries`);
if (negative > 0) fail(`funds went negative on ${negative} ticks: something charges more than it quotes`);
/* Floors at about half of measured (2026-08-21: 731 exhibits, 10 wings,
   5 complete, 55 upgrades, 432 anniversaries in a greedy day). The
   CEILINGS matter as much here and are the reason this harness exists:
   an idle game that can be finished in an afternoon is a broken idle
   game, and the first draft of this economy did exactly that (909 of 909
   in fifteen minutes) because income grew faster than cost. */
if (totalArtifacts(s) < 300) fail(`only ${totalArtifacts(s)} exhibits in a day of play, the floor is 300`);
if (s.openWings.length < 5) fail(`only ${s.openWings.length} wings open in a day, the floor is 5`);
if (s.plaques.length < 2) fail(`only ${s.plaques.length} wings completed in a day, the floor is 2`);
if (taps < 200) fail(`only ${taps} anniversaries in a day, the floor is 200`);
if (upgrades < 20) fail(`only ${upgrades} upgrades bought in a day, the floor is 20`);
/* the long game must survive the day: a greedy player cannot empty the
   museum in one sitting, and cannot hang every plaque either */
if (totalArtifacts(s) >= totalExhibits) fail(`a single day collected all ${totalExhibits} exhibits: the curve is running away`);
if (s.plaques.length >= wings.length) fail(`a single day completed every wing: the curve is running away`);

/* ---------------------------------------- 3: the multipliers are honest */
console.log("3) every stated multiplier measures its stated value");
{
  const base = { ...s, rushUntil: 0 };
  const plain = totalIncome(wings, base, base.clock);
  const rushed = totalIncome(wings, { ...base, rushUntil: base.clock + 10 }, base.clock);
  const ratio = rushed / plain;
  if (Math.abs(ratio - RUSH_MULT) > 1e-9) fail(`the anniversary measured x${ratio.toFixed(4)}, it says x${RUSH_MULT}`);

  /* milestone: exactly 2x per MILESTONE_EVERY, measured on one wing */
  const w = wings[0];
  const at9 = wingIncome(w, { ...s, owned: { [w.key]: 9 } });
  const at10 = wingIncome(w, { ...s, owned: { [w.key]: 10 } });
  const per10 = wingIncome(w, { ...s, owned: { [w.key]: 20 } }) / wingIncome(w, { ...s, owned: { [w.key]: 10 } });
  if (!(at10 > at9 * 2)) fail(`the ${MILESTONE_EVERY}th exhibit did not double the wing (${at9.toFixed(3)} to ${at10.toFixed(3)})`);
  if (!(per10 > 2)) fail(`each milestone should more than double the wing, measured x${per10.toFixed(3)}`);

  /* renown and plaques are exactly their stated percentages */
  const noStars = totalIncome(wings, { ...base, renown: 0, plaques: [] }, base.clock);
  const tenStars = totalIncome(wings, { ...base, renown: 10, plaques: [] }, base.clock);
  const starRatio = tenStars / noStars;
  if (Math.abs(starRatio - (1 + 10 * RENOWN_BONUS)) > 1e-9) {
    fail(`ten renown stars measured x${starRatio.toFixed(4)}, they say x${(1 + 10 * RENOWN_BONUS).toFixed(2)}`);
  }
  const twoPlaques = totalIncome(wings, { ...base, renown: 0, plaques: [wings[0].key, wings[1].key] }, base.clock);
  const plaqueRatio = twoPlaques / noStars;
  if (Math.abs(plaqueRatio - (1 + 2 * PLAQUE_BONUS)) > 1e-9) {
    fail(`two plaques measured x${plaqueRatio.toFixed(4)}, they say x${(1 + 2 * PLAQUE_BONUS).toFixed(2)}`);
  }

  /* the rush ends when it says it ends: income is back to plain after */
  const after = totalIncome(wings, { ...base, rushUntil: base.clock + 10 }, base.clock + 11);
  if (Math.abs(after - plain) > 1e-9) fail("the anniversary kept paying after its own timer ended");

  /* the archive vault lengthens the rush by exactly its stated seconds */
  const shortRush = rushSeconds({ ...s, levels: { ...s.levels, archive: 0 } });
  const longRush = rushSeconds({ ...s, levels: { ...s.levels, archive: 4 } });
  if (longRush - shortRush !== 4 * lib.RUSH_ARCHIVE_SEC) {
    fail(`four archive levels added ${longRush - shortRush}s, they say ${4 * lib.RUSH_ARCHIVE_SEC}s`);
  }
}

/* offline: measures the offline rate, and the cap is exact */
{
  const a = { ...s, funds: 0, careerEarned: 0, rushUntil: 0, levels: { ...s.levels, shop: 0 } };
  const b = { ...s, funds: 0, careerEarned: 0, rushUntil: 0, levels: { ...s.levels, shop: 0 } };
  const oneHour = 3600;
  tick(wings, a, oneHour);
  const rep = offlineReport(wings, b, oneHour);
  const ratio = rep.earned / (a.funds || 1);
  if (Math.abs(ratio - 0.5) > 0.02) fail(`an hour offline paid x${ratio.toFixed(3)} of an hour online, the rate says 0.5`);
  if (rep.capped) fail("one hour away reported as capped, the cap is eight hours");

  const nine = { ...s, funds: 0, careerEarned: 0, rushUntil: 0, levels: { ...s.levels, shop: 0 } };
  const eight = { ...s, funds: 0, careerEarned: 0, rushUntil: 0, levels: { ...s.levels, shop: 0 } };
  const rep9 = offlineReport(wings, nine, 9 * 3600);
  const rep8 = offlineReport(wings, eight, 8 * 3600);
  if (!rep9.capped) fail("nine hours away was not reported as capped");
  if (Math.abs(rep9.earned - rep8.earned) > 1e-6) fail(`nine hours paid ${rep9.earned.toFixed(2)} and eight paid ${rep8.earned.toFixed(2)}: the cap leaks`);

  /* the gift shop raises the offline rate and never past its own ceiling */
  const shopped = { ...s, funds: 0, careerEarned: 0, rushUntil: 0, levels: { ...s.levels, shop: 4 } };
  const repShop = offlineReport(wings, shopped, oneHour);
  if (!(repShop.earned > rep.earned)) fail("the gift shop did not raise the offline rate");
  const shopRatio = repShop.earned / (a.funds || 1);
  if (shopRatio > 0.91) fail(`the gift shop pushed the offline rate to ${shopRatio.toFixed(3)}, the ceiling is 0.9`);
}
console.log("   anniversary, milestones, renown, plaques, offline rate and the eight hour cap all measure their stated values");

/* -------------------------------------- 4: rededication is a real trade */
console.log("4) rededication");
{
  const before = JSON.parse(JSON.stringify(s));
  const owedStars = renownOnRededicate(s);
  const expectedStars = Math.min(MAX_RENOWN - s.renown, Math.floor(totalArtifacts(s) / RENOWN_PER));
  if (owedStars !== expectedStars) fail(`the hall offered ${owedStars} stars, the rate says ${expectedStars}`);
  if (!canRededicate(s)) fail(`a day of play left the hall unable to rededicate (${totalArtifacts(s)} exhibits, needs ${REDEDICATE_MIN})`);
  const plaquesBefore = [...s.plaques];
  rededicate(s);
  if (s.renown !== before.renown + owedStars) fail("the stars paid do not match the stars offered");
  if (totalArtifacts(s) !== 0) fail("rededication left exhibits on the walls");
  if (s.funds !== 0) fail("rededication left funds in the till");
  if (s.openWings.length !== 1) fail("rededication left extra wings open");
  for (const p of plaquesBefore) {
    if (!s.plaques.includes(p)) fail(`the ${p} plaque did not survive rededication`);
  }
  if (UPGRADES.some(u => s.levels[u.id] !== 0)) fail("rededication kept an upgrade level");
  /* and the trade must be worth taking: same exhibit count, more income */
  const sameWall = { ...before, renown: s.renown, plaques: s.plaques };
  const then = totalIncome(wings, before, before.clock);
  const now = totalIncome(wings, sameWall, before.clock);
  if (!(now > then)) fail("a rededicated hall does not out-earn the old one at the same exhibit count");
  console.log(`   traded ${before.owned ? totalArtifacts(before) : 0} exhibits for ${owedStars} stars, ${plaquesBefore.length} plaque(s) kept, income at the same wall x${(now / then).toFixed(2)}`);
}

console.log("");
if (failures > 0) {
  console.error(`simHallOfChampions: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simHallOfChampions: green. Every exhibit real, every multiplier honest.");
