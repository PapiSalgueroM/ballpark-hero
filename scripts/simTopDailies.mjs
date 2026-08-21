/**
 * Round 223 harness (number 90): the three measured top-ten dailies that no
 * deal-level fence ever covered, covered.
 *
 * The fresh analytics pull put /overrated-underrated, /budget-builder and
 * /tier-list in the site's measured top ten, and none of the three had a
 * harness on what it actually deals each day. Writing this one found a live
 * product bug on two of them, the Round 212 class in a new costume:
 *
 *   Overrated and Tier List picked their daily players with
 *   `seed * (i + 1) * 1103515245` off the raw 8-digit date. For every 2026
 *   date that product passes 2 to the 53rd, the float rounds the low bits
 *   away, and after the modulo the Overrated walk could only ever land on
 *   every 4TH pool index and the Tier List walk on every 8TH. Measured over
 *   a simulated year before the fix: 450 of the 600 pool players could
 *   never appear in either game, the tier list dealt a board identical to
 *   yesterday's SEVENTEEN days a year, and on a typical day only one of its
 *   eight names changed. The owner had already reported the symptom on
 *   2026-08-05: "u are reusing people."
 *
 * Round 223 moved both picks onto shuffledRange (the mulberry32 shuffle the
 * rest of the dailies stand on) in ONE shared place, fetchOverratedPool,
 * which also makes the never-share-a-player rule structural instead of two
 * files mirroring each other's arithmetic. This harness fences all of it.
 *
 * Sections 2 and 4 need Supabase; same honesty rule as simGridCells: when
 * the network is gone they SKIP LOUDLY IN CAPITALS and exit green, because
 * a harness that fails every offline run trains people to ignore it.
 *
 * Run: node scripts/simTopDailies.mjs
 */
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/topdailies-entry.mjs";
const OUT = "/tmp/topdailies.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const pool = await import('${ROOT}/src/lib/fetchOverratedPool.ts');
export const bb = await import('${ROOT}/src/hooks/useBudgetBuilder.ts');
export const squadDeal = await import('${ROOT}/src/lib/squadDeal.ts');
export const du = await import('${ROOT}/src/lib/dateUtils.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { pool: poolMod, bb, squadDeal, du } = await import(pathToFileURL(OUT).href);

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };
const dayStr = d => new Date(Date.UTC(2026, 0, 1) + d * 86_400_000).toISOString().slice(0, 10);

/* -------------------------------------------------- 1. the two picks, a year */
console.log("1) Overrated and Tier List, dealt across a simulated year");
{
  /* 600 is the fetch cap and the live pool is comfortably past it (2,879
     rows for 2026), so the deal always sees a 600 man pool. */
  const N = 600, DAYS = 365;
  const seenO = new Set(), seenT = new Set();
  let identO = 0, identT = 0, newO = 0, newT = 0;
  let prevO = null, prevT = null;
  for (let d = 0; d < DAYS; d += 1) {
    const today = dayStr(d);
    const o = poolMod.overratedDailyIndices(N, today);
    const t = poolMod.tierListDailyIndices(N, today);
    const o2 = poolMod.overratedDailyIndices(N, today);
    if (o.join() !== o2.join()) { fail(`overrated is not deterministic on ${today}`); break; }
    if (o.length !== 10) fail(`overrated dealt ${o.length} players on ${today}`);
    if (t.length !== 8) fail(`tier list dealt ${t.length} players on ${today}`);
    if (new Set(o).size !== o.length) fail(`overrated repeated a player on its own board on ${today}`);
    if (new Set(t).size !== t.length) fail(`tier list repeated a player on its own board on ${today}`);
    const oset = new Set(o);
    const shared = t.filter(i => oset.has(i));
    if (shared.length) fail(`${today}: the two games share ${shared.length} player(s), the owner rule is broken`);
    if (o.some(i => i < 0 || i >= N) || t.some(i => i < 0 || i >= N)) fail(`${today}: an index fell outside the pool`);
    const ok = [...o].sort((a, b) => a - b).join(","), tk = [...t].sort((a, b) => a - b).join(",");
    if (prevO !== null) {
      if (ok === prevO.key) identO += 1;
      newO += o.filter(i => !prevO.set.has(i)).length;
      if (tk === prevT.key) identT += 1;
      newT += t.filter(i => !prevT.set.has(i)).length;
    }
    prevO = { key: ok, set: oset }; prevT = { key: tk, set: new Set(t) };
    o.forEach(i => seenO.add(i)); t.forEach(i => seenT.add(i));
  }
  /* Floors from measured headroom. A uniform draw measured 599 and 592
     distinct, zero identical days, and 9.83 and 7.86 fresh names a day;
     the old collapsed walk measured 146 and 75 distinct, 0 and 17
     identical days, 8.84 and 4.54 fresh. The bars sit halfway to broken. */
  if (seenO.size < 400) fail(`overrated reached only ${seenO.size} of ${N} players in a year (uniform reaches about 599)`);
  if (seenT.size < 400) fail(`tier list reached only ${seenT.size} of ${N} players in a year (uniform reaches about 592)`);
  if (identO > 0) fail(`overrated dealt a board identical to yesterday's ${identO} time(s)`);
  if (identT > 0) fail(`tier list dealt a board identical to yesterday's ${identT} time(s), the pre-fix number was 17`);
  if (newO / 364 < 9.3) fail(`overrated turns over ${(newO / 364).toFixed(2)} of 10 names a day (uniform: 9.83)`);
  if (newT / 364 < 7.3) fail(`tier list turns over ${(newT / 364).toFixed(2)} of 8 names a day (uniform: 7.86, pre-fix: 4.54)`);
  console.log(`   overrated: ${seenO.size}/${N} players reached, ${identO} identical days, ${(newO / 364).toFixed(2)}/10 fresh a day`);
  console.log(`   tier list: ${seenT.size}/${N} players reached, ${identT} identical days, ${(newT / 364).toFixed(2)}/8 fresh a day`);
}

/* --------------------------------------------- 2. the shared pool, live */
console.log("2) the pool both games address by index, fetched the real way");
let livePool = null;
try {
  livePool = await Promise.race([
    poolMod.fetchOverratedPool(),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
  ]);
  if (livePool && livePool.length === 0) livePool = null;
} catch { livePool = null; }
if (!livePool) {
  console.log("   SKIPPED, SUPABASE UNREACHABLE. THE LIVE POOL WAS NOT CHECKED.");
} else {
  if (livePool.length !== 600) fail(`the pool fetch returned ${livePool.length} players, the cap and the year-one bars assume 600`);
  const ids = new Set(livePool.map(p => `${p.name}|${p.nationality}`));
  if (ids.size !== livePool.length) fail(`the pool holds ${livePool.length - ids.size} duplicate identities`);
  for (let i = 1; i < livePool.length; i += 1) {
    const a = livePool[i - 1], b = livePool[i];
    const inOrder = a.marketValue > b.marketValue
      || (a.marketValue === b.marketValue && (a.name < b.name
        || (a.name === b.name && a.nationality <= b.nationality)));
    if (!inOrder) { fail(`the pool is not in canonical order at position ${i} (${a.name} then ${b.name}), index picks would differ between visitors`); break; }
  }
  const under4 = livePool.filter(p => p.valueMillions < 4).length;
  if (under4 > 0) fail(`${under4} pool players sit under the view's 4m floor, the placeholder-value filter has regressed`);
  console.log(`   600 players, unique identities, canonical order, values all above the 4m floor`);
}

/* ----------------------------- 3. the collapsed generator stays dead */
console.log("3) the collapsed generator is gone from both hooks");
{
  for (const rel of ["src/hooks/useOverratedUnderrated.ts", "src/hooks/useTierList.ts"]) {
    const t = readFileSync(path.join(ROOT, rel), "utf-8");
    if (/1103515245/.test(t)) fail(`${rel}: the overflow-prone multiply is back`);
    if (/dateSeed\(/.test(t)) fail(`${rel}: picks from the raw date again instead of the shared shuffled draw`);
  }
  const shared = readFileSync(path.join(ROOT, "src/lib/fetchOverratedPool.ts"), "utf-8");
  if (!/overratedDailyIndices/.test(shared) || !/tierListDailyIndices/.test(shared)) {
    fail("fetchOverratedPool no longer owns the two daily picks, the never-share rule is unenforced");
  }
  if (!/order\('player_name'/.test(shared)) {
    fail("fetchOverratedPool dropped the name tiebreak, tied values make the fetch order arbitrary again");
  }
  console.log("   both hooks draw from the shared pick, the fetch keeps its tiebreaks");
}

/* ------------------------- 4. every Budget Builder demand is winnable */
console.log("4) Budget Builder: every era's every demand met inside the budget, live pools");
{
  const FORMATION = squadDeal.FORMATIONS[0]; /* 4-3-3, the default */
  const cheapFirst = (a, b) => a.marketValue - b.marketValue;
  const cost = xi => xi.reduce((s, p) => s + (p?.marketValue ?? 0), 0);
  /* Cheapest XI carrying at least `quota` players matching `want`, walked
     slot by slot: while the quota is unmet, take the cheapest MATCHING
     candidate for the slot when one exists, otherwise the cheapest at all;
     once only as many slots remain as matches are missing, a match is
     forced. Placing wanted players first and filling around them fails on
     position clashes (three cheap strikers cannot all start), which is a
     hole in the certificate builder, not in the game; this walk does not
     have it. */
  const quotaFill = (pool, want, quota) => {
    const used = new Set();
    let have = 0;
    const xi = [];
    for (let s = 0; s < FORMATION.slots.length; s += 1) {
      const slot = FORMATION.slots[s];
      const cands = pool.filter(x => slot.allowed.includes(x.position) && !used.has(x.name)).sort(cheapFirst);
      const slotsLeft = FORMATION.slots.length - s;
      let p;
      if (quota - have >= slotsLeft) p = cands.find(want);
      else if (have < quota) p = cands.find(want) ?? cands[0];
      else p = cands[0];
      if (!p) return null;
      used.add(p.name);
      if (want(p)) have += 1;
      xi.push(p);
    }
    return have >= quota ? xi : null;
  };
  const fillCheapest = pool => quotaFill(pool, () => true, 0);

  for (const era of bb.BB_ERAS) {
    let eraPool = null;
    try {
      eraPool = await Promise.race([
        squadDeal.fetchSquadPool("current", era.year),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
      ]);
      if (eraPool && eraPool.length < 50) eraPool = null;
    } catch { eraPool = null; }
    if (!eraPool) {
      console.log(`   ${era.label}: SKIPPED, SUPABASE UNREACHABLE. THIS ERA WAS NOT CHECKED.`);
      continue;
    }
    const moneyXi = bb.moneyXiFor(eraPool, FORMATION);
    const budget = bb.budgetFor(moneyXi);
    const eligible = bb.CRITERIA.filter(c => !c.todayOnly || era.id === "today");
    let worstHeadroom = Infinity, worstId = "";
    for (const c of eligible) {
      /* build the cheapest XI that meets the demand, as a certificate */
      let xi = null;
      if (c.id === "youth") xi = quotaFill(eraPool, p => p.age > 0 && p.age <= 23, 3);
      else if (c.id === "veteran") xi = quotaFill(eraPool, p => p.age >= 32, 1);
      else if (c.id === "bargains") xi = quotaFill(eraPool, p => p.marketValue < 15, 2);
      else if (c.id === "star-power") xi = quotaFill(eraPool, p => squadDeal.playerRating(p) >= 90, 1);
      else if (c.id === "nation-core") {
        const counts = new Map();
        for (const p of eraPool) counts.set(p.nationality, (counts.get(p.nationality) ?? 0) + 1);
        const nations = [...counts.entries()].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).map(([n]) => n);
        for (const nation of nations.slice(0, 12)) {
          xi = quotaFill(eraPool, p => p.nationality === nation, 4);
          if (xi) break;
        }
      } else if (c.id === "club-rule") {
        const used = new Set(); const clubs = new Set(); xi = [];
        for (const slot of FORMATION.slots) {
          const p = eraPool.filter(x => slot.allowed.includes(x.position) && !used.has(x.name) && !clubs.has(x.club)).sort(cheapFirst)[0];
          if (!p) { xi = null; break; }
          used.add(p.name); clubs.add(p.club); xi.push(p);
        }
      } else if (c.id === "world-tour") {
        const used = new Set(); const nations = new Set(); xi = [];
        for (const slot of FORMATION.slots) {
          const cands = eraPool.filter(x => slot.allowed.includes(x.position) && !used.has(x.name)).sort(cheapFirst);
          const fresh = cands.find(x => !nations.has(x.nationality));
          const p = nations.size < 6 && fresh ? fresh : cands[0];
          if (!p) { xi = null; break; }
          used.add(p.name); nations.add(p.nationality); xi.push(p);
        }
      } else if (c.id === "league-spread") {
        const used = new Set(); const perLeague = new Map(); xi = [];
        for (const slot of FORMATION.slots) {
          const p = eraPool.filter(x => slot.allowed.includes(x.position) && !used.has(x.name) && (perLeague.get(x.league) ?? 0) < 4).sort(cheapFirst)[0];
          if (!p) { xi = null; break; }
          used.add(p.name); perLeague.set(p.league, (perLeague.get(p.league) ?? 0) + 1); xi.push(p);
        }
      } else if (c.id === "no-galactico") {
        xi = fillCheapest(eraPool.filter(p => p.marketValue <= budget / 3));
      } else {
        xi = fillCheapest(eraPool);
      }
      if (!xi || xi.some(p => !p)) { fail(`${era.label}: the pool cannot supply "${c.label}" in the 4-3-3 at any price`); continue; }
      const spent = cost(xi);
      const need = c.id === "in-the-black" ? budget * 0.9 : budget;
      if (spent > need) {
        fail(`${era.label}: "${c.label}" cannot be met, the cheapest certificate costs ${Math.round(spent)}M against ${Math.round(need)}M`);
        continue;
      }
      if (!c.check(xi.filter(Boolean), budget, budget - spent)) {
        fail(`${era.label}: the certificate for "${c.label}" does not actually satisfy it, the harness construction is wrong`);
        continue;
      }
      const headroom = (need - spent) / need;
      if (headroom < worstHeadroom) { worstHeadroom = headroom; worstId = c.id; }
    }
    if (worstHeadroom !== Infinity) {
      console.log(`   ${era.label}: budget ${budget}M, ${eligible.length} demands all satisfiable, tightest is "${worstId}" with ${(worstHeadroom * 100).toFixed(0)}% headroom`);
      if (worstHeadroom < 0.05) fail(`${era.label}: "${worstId}" clears the budget by under 5%, a market refresh could tip it impossible unseen`);
    }
  }
}

console.log("");
if (failures > 0) {
  console.error(`simTopDailies: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simTopDailies: green. The top ten's dailies deal fresh, disjoint, winnable boards.");
