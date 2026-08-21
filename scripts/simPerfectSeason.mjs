/**
 * Round 228 harness (number 94): the Perfect Season family, fenced at last.
 *
 * Four games (162-0 MLB, 82-0 NBA and NHL, 17-0 NFL) share one engine core
 * and per-sport adapters that pull real season rosters from Supabase, and
 * NONE of it had a harness: not the win model, not the daily seeding, not
 * the framing copy, not the live squads the wheel actually lands on.
 * /perfect-season-nba alone is a measured top five game (628 pageviews in
 * the last 31 days), so this closes the gap.
 *
 * Sections:
 *   1. THE CORE MATH, offline: the win probability is monotone and stays
 *      inside its documented bounds; simulateSeason is deterministic per
 *      seed, its win count equals its game list, perfect means perfect;
 *      teamOverall is the weighted mean it claims to be.
 *   2. THE FRAMING COPY, offline: every win total of every sport maps to a
 *      line, and the unbeaten and one-loss overrides always outrank the
 *      table tiers.
 *   3. DAILY SEEDING, offline: on any date the four sports draw four
 *      DIFFERENT seeds (the salts exist so the wheels decorrelate), the
 *      same date and sport always reproduce the same sequence, and across
 *      a simulated year the daily first pick reaches the whole wheel, the
 *      Round 223/224 measurement applied here before anything broke.
 *   4. THE SAVED DAILY ATTEMPT, offline: hostile versions, wrong dates and
 *      garbage all load as null (the logic level of what sweepSaves proves
 *      at the crash level).
 *   5. THE LIVE SQUADS, per sport: the index exists at a floor, sampled
 *      squads have unique players, ratings in the documented 40-99 band,
 *      eligibility keys that exist in the sport's slot set, and every
 *      sampled squad can fill a fresh board, so a spin can never come up
 *      dead. SKIPS LOUDLY IN CAPITALS when Supabase is unreachable.
 *
 * Run: node scripts/simPerfectSeason.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/perfectseason-entry.mjs";
const OUT = "/tmp/perfectseason.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = (() => {
  let store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _wipe: () => { store = {}; },
    _raw: store,
    _set: (k, v) => { store[k] = v; },
  };
})();
export const core = await import('${ROOT}/src/lib/perfectSeason.ts');
export const nba = await import('${ROOT}/src/lib/perfectSeasonNba.ts');
export const nfl = await import('${ROOT}/src/lib/perfectSeasonNfl.ts');
export const nhl = await import('${ROOT}/src/lib/perfectSeasonNhl.ts');
export const mlb = await import('${ROOT}/src/lib/perfectSeasonMlb.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { core, nba, nfl, nhl, mlb } = await import(pathToFileURL(OUT).href);

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };
const dayStr = d => new Date(Date.UTC(2026, 0, 1) + d * 86_400_000).toISOString().slice(0, 10);

console.log("1) the core math");
{
  let prev = -1;
  for (let o = 40; o <= 99; o += 1) {
    const p = core.winProbability(o);
    if (p < 0.05 - 1e-9 || p > 0.985 + 1e-9) fail(`winProbability(${o}) = ${p} leaves the documented bounds`);
    if (p < prev - 1e-12) fail(`winProbability is not monotone at ${o}`);
    prev = p;
  }
  for (const [games, overall, seed] of [[162, 99, 7], [82, 85, 11], [17, 70, 13]]) {
    const a = core.simulateSeason(overall, games, seed);
    const b = core.simulateSeason(overall, games, seed);
    if (JSON.stringify(a.games) !== JSON.stringify(b.games)) fail(`simulateSeason(${overall},${games},${seed}) is not deterministic`);
    if (a.games.length !== games) fail(`simulateSeason played ${a.games.length} of ${games} games`);
    if (a.wins !== a.games.filter(Boolean).length) fail("wins does not equal the games won");
    if (a.losses !== games - a.wins) fail("losses does not complement wins");
    if (a.perfect !== (a.wins === games)) fail("perfect flag disagrees with the record");
  }
  const slots = [{ key: "A", label: "A", weight: 3 }, { key: "B", label: "B", weight: 1 }];
  const mk = r => ({ playerId: "x" + r, name: "x" + r, rating: r, eligible: ["A"], detail: "d" });
  const o = core.teamOverall(slots, { A: mk(90), B: mk(70) });
  if (Math.abs(o - (90 * 3 + 70) / 4) > 1e-9) fail(`teamOverall weighted mean came out ${o}`);
  if (core.teamOverall(slots, { A: null, B: null }) !== 0) fail("empty board overall is not 0");
}

console.log("2) the framing copy covers every record");
{
  const GAMES = { mlb: 162, nhl: 82, nba: 82, nfl: 17 };
  for (const sport of ["mlb", "nhl", "nba", "nfl"]) {
    const games = GAMES[sport];
    for (let w = 0; w <= games; w += 1) {
      const line = core.seasonFraming(sport, w, games);
      if (!line || typeof line !== "string" || line.length < 10) { fail(`${sport} ${w} wins framed as ${JSON.stringify(line)}`); break; }
      if (w === games && !/undefeated/i.test(line)) fail(`${sport}: a perfect season is not framed as undefeated`);
      if (w === games - 1 && !/One loss/i.test(line)) fail(`${sport}: a one-loss season lost its own line`);
    }
  }
}

console.log("3) daily seeding decorrelates and covers");
{
  for (let d = 0; d < 365; d += 1) {
    const seeds = ["mlb", "nhl", "nba", "nfl"].map(sp => core.dailySportSeed(sp, dayStr(d)));
    if (new Set(seeds).size !== 4) { fail(`${dayStr(d)}: two sports drew the same daily seed`); break; }
  }
  const p1 = core.makeDailyPicker("nba", "2026-07-04");
  const p2 = core.makeDailyPicker("nba", "2026-07-04");
  const s1 = [p1(20), p1(20), p1(20)], s2 = [p2(20), p2(20), p2(20)];
  if (s1.join() !== s2.join()) fail("the same date and sport did not reproduce the same picks");
  for (const sport of ["mlb", "nba"]) {
    const seen = new Set();
    for (let d = 0; d < 365; d += 1) seen.add(core.makeDailyPicker(sport, dayStr(d))(20));
    /* uniform reaches all 20 in a year with probability ~1; the collapsed
       generators of Rounds 223/224 sat at a fraction of the pool */
    if (seen.size < 18) fail(`${sport}: the daily first pick reached only ${seen.size} of 20 wheel positions in a year`);
  }
}

console.log("4) the saved daily attempt loads fail closed");
{
  const key = "perfect-season-nba-daily-2026-07-04";
  const good = { v: 1, date: "2026-07-04", sim: { wins: 80, losses: 2, games: [], perfect: false, overall: 90 }, overall: 90, spins: 6, teamNames: ["x"] };
  localStorage.setItem(key, JSON.stringify(good));
  const r1 = core.loadDailyAttempt("nba", "2026-07-04");
  if (!r1 || r1.spins !== 6) fail("a valid saved attempt did not load");
  localStorage.setItem(key, JSON.stringify({ ...good, v: 999 }));
  if (core.loadDailyAttempt("nba", "2026-07-04") !== null) fail("a hostile schema version loaded anyway");
  localStorage.setItem(key, JSON.stringify({ ...good, date: "2026-07-03" }));
  if (core.loadDailyAttempt("nba", "2026-07-04") !== null) fail("a stale date loaded anyway");
  localStorage.setItem(key, "not json {");
  if (core.loadDailyAttempt("nba", "2026-07-04") !== null) fail("garbage loaded anyway");
}

console.log("5) the live squads, per sport");
{
  /* floors at about half the measured index sizes (2026-08-20: nba 1616,
     nfl 828, nhl 194, mlb 1000), so real shrinkage trips long before a
     thin wheel ships */
  const SPORTS = [
    ["nba", nba, nba.NBA_SLOTS, () => nba.fetchTeamSeasonIndex(), 800],
    ["nfl", nfl, nfl.NFL_SLOTS, () => nfl.fetchTeamSeasonIndex(), 400],
    ["nhl", nhl, nhl.NHL_SLOTS, () => nhl.fetchTeamEraIndex(), 90],
    ["mlb", mlb, mlb.MLB_SLOTS, () => mlb.fetchTeamSeasonIndex(), 500],
  ];
  for (const [name, mod, slots, fetchIndex, floor] of SPORTS) {
    let index = null;
    try {
      index = await Promise.race([
        fetchIndex(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
      ]);
    } catch { index = null; }
    if (!index || index.length === 0) {
      console.log(`   ${name}: SKIPPED, SUPABASE UNREACHABLE. THIS SPORT'S SQUADS WERE NOT CHECKED.`);
      continue;
    }
    if (index.length < floor) fail(`${name}: the wheel index shrank to ${index.length} entries (floor ${floor})`);
    const slotKeys = new Set(slots.map(s => s.key));
    /* sample a spread of the wheel, not just the head */
    const stride = Math.max(1, Math.floor(index.length / 8));
    let sampled = 0, deadSpins = 0, minFill = Infinity;
    for (let i = 0; i < index.length && sampled < 8; i += stride) {
      let squad = null;
      try {
        squad = await Promise.race([
          mod.fetchSquad(index[i]),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000)),
        ]);
      } catch { squad = null; }
      if (!squad) continue;
      sampled += 1;
      if (!squad.players || squad.players.length === 0) { fail(`${name}: squad ${squad.squadId} has no players`); continue; }
      const names = squad.players.map(p => p.name);
      if (new Set(names).size !== names.length) fail(`${name}: squad ${squad.squadId} lists a player twice`);
      for (const p of squad.players) {
        if (!(p.rating >= 40 && p.rating <= 99)) fail(`${name}: ${p.name} rated ${p.rating}, outside the documented 40-99`);
        if (!p.eligible.length || p.eligible.some(e => !slotKeys.has(e))) fail(`${name}: ${p.name} eligible for ${JSON.stringify(p.eligible)}, not all real slots`);
        if (!p.detail || typeof p.detail !== "string") fail(`${name}: ${p.name} ships without a stat line`);
      }
      const fresh = slots.map(s => s.key);
      if (!core.squadFillsAny(squad, fresh, new Set())) { deadSpins += 1; fail(`${name}: squad ${squad.squadId} cannot fill a single open slot, a dead spin`); }
      const fillable = new Set(squad.players.flatMap(p => p.eligible)).size;
      if (fillable < minFill) minFill = fillable;
    }
    if (sampled === 0) {
      console.log(`   ${name}: INDEX REACHED BUT NO SQUAD LOADED. NOT CHECKED PAST THE INDEX.`);
      continue;
    }
    console.log(`   ${name}: index ${index.length}, ${sampled} squads sampled, worst covers ${minFill}/${slots.length} slot kinds, ${deadSpins} dead spins`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`simPerfectSeason: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simPerfectSeason: green. Four sports, one engine, no dead spins.");
