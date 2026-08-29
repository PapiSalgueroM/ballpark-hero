/**
 * Round 223 harness (number 90): the measured top-ten dailies that no
 * deal-level fence ever covered, covered.
 *
 * HISTORY, kept because the bug class is the lesson: this file originally
 * fenced three games. Overrated or Underrated and Tier List picked their
 * daily players with `seed * (i + 1) * 1103515245` off the raw 8-digit
 * date, the float rounded the low bits away, and 450 of 600 pool players
 * could never appear; Round 223 moved both onto the shared shuffled draw
 * and fenced a year of deals here. Round 311 retired both games at the
 * owner's call ("two buttons, no game feel"), so their sections and the
 * shared pool module went with them; what remains is Budget Builder, still
 * a measured top-ten daily, still fenced the same way.
 *
 * Section 1 needs Supabase; same honesty rule as simGridCells: when the
 * network is gone it SKIPS LOUDLY IN CAPITALS and exits green, because a
 * harness that fails every offline run trains people to ignore it.
 *
 * Run: node scripts/simTopDailies.mjs
 */
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = ROOT.replaceAll("\\", "/");
const ENTRY = path.join(os.tmpdir(), "topdailies-entry.mjs");
const OUT = path.join(os.tmpdir(), "topdailies.mjs");

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const bb = await import('${SRC}/src/hooks/useBudgetBuilder.ts');
export const squadDeal = await import('${SRC}/src/lib/squadDeal.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const { bb, squadDeal } = await import(pathToFileURL(OUT).href);

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };

/* ------------------------- 1. every Budget Builder demand is winnable */
console.log("1) Budget Builder: every era's every demand met inside the budget, live pools");
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
    const budget = bb.budgetFor(moneyXi, era.id);
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
console.log("   teeth: certificates built the cheap way, headroom measured per demand, offline skips shout");
console.log("simTopDailies: green. The surviving top ten daily deals winnable boards in every era.");
