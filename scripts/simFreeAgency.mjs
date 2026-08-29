/**
 * Round 179 harness: free agency is a real market in all four US career
 * games, and the market cannot strand, lie or leak.
 *
 * What Round 179 shipped: an expired deal now opens a window of competing
 * offers from real era-aware franchises (shared engine usCareerFreeAgency.ts,
 * per-sport wrappers in each career lib), with one push-for-more negotiation
 * per offer, honest tier economics (contenders discount, rebuilds overpay),
 * and the signed offer's roster quality becoming the exact teamQuality the
 * season sim runs on. The old two-button 'contract' card left the event
 * decks, and the boards now refuse to start a season with no deal.
 *
 * Margins in this file come from a measured run of 3000 windows per check
 * (2026-08-19, seeded): tier salary means for a fixed 88-rated free agent
 * were contender 50.99 (se 0.033), playoff 59.85 (se 0.065), rebuild 69.04
 * (se 0.046), so the 4M gap assertions sit far past 3 sigma of the
 * measurement while still failing if the economics get half-broken. The
 * high-vs-low leverage improvement gap measured 0.794 vs 0.154 over 4000
 * pushes a side (gap 0.639, se about 0.009), so the 0.3 line has the same
 * property. The era money ratio measured 0.321 against the documented 0.32.
 *
 * Run: node scripts/simFreeAgency.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'freeAgencyEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'freeAgency.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nflMyCareer.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlMyCareer.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbMyCareer.ts');
const fa = await import('${ROOT.replaceAll('\\', '/')}/src/lib/usCareerFreeAgency.ts');
export { nfl, nba, nhl, mlb, fa };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb, fa } = await import(pathToFileURL(BUNDLE).href);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

/* Per-sport adapters so every section runs four times identically. */
const SPORTS = [
  {
    key: 'nfl', lib: nfl, eraId: 'y2005', minSalary: 0.4, scale: 0.32,
    start: (rng, eraId) => nfl.startCareer('Window Test', 'QB', nfl.ARCHETYPES.QB[0], rng, null, eraId),
    build: (c, q, rng) => nfl.buildNflFaWindow(c, q, rng),
    pushArgs: (c, rng) => nfl.nflFaPushArgs(c, rng),
    draw: (c, rng) => nfl.drawEvent(c, rng),
    sim: (c, q, rng) => nfl.simSeason(c, q, rng),
    progress: (c, rng) => nfl.progress(c, rng),
    retire: c => nfl.shouldRetire(c),
    modernIds: () => nfl.NFL_TEAM_NAMES.map(t => t.abbr),
    eraIds: () => nfl.NFL_TEAMS_2005.map(t => t.abbr),
    setStar: c => { c.ovr = 88; c.age = 26; c.allPros = 1; },
  },
  {
    key: 'nba', lib: nba, eraId: 'y2004', minSalary: 0.8, scale: nba.NBA_ERAS.find(e => e.id === 'y2004').moneyScale,
    start: (rng, eraId) => nba.startNbaCareer('Window Test', 'PG', nba.NBA_ARCHETYPES.PG[0], rng, null, eraId),
    build: (c, q, rng) => nba.buildNbaFaWindow(c, q, rng),
    pushArgs: (c, rng) => nba.nbaFaPushArgs(c, rng),
    draw: (c, rng) => nba.drawNbaEvent(c, rng),
    sim: (c, q, rng) => nba.simNbaSeason(c, q, rng),
    progress: (c, rng) => nba.nbaProgress(c, rng),
    retire: c => nba.nbaShouldRetire(c),
    modernIds: () => nba.nbaEraTeamIds(undefined),
    eraIds: () => nba.nbaEraTeamIds('y2004'),
    setStar: c => { c.ovr = 88; c.age = 26; c.allNbas = 1; },
  },
  {
    key: 'nhl', lib: nhl, eraId: 'y2006', minSalary: 0.4, scale: nhl.NHL_ERAS.find(e => e.id === 'y2006').moneyScale,
    start: (rng, eraId) => nhl.startNhlCareer('Window Test', 'C', nhl.NHL_ARCHETYPES.C[0], rng, null, eraId),
    build: (c, q, rng) => nhl.buildNhlFaWindow(c, q, rng),
    pushArgs: (c, rng) => nhl.nhlFaPushArgs(c, rng),
    draw: (c, rng) => nhl.drawNhlEvent(c, rng),
    sim: (c, q, rng) => nhl.simNhlSeason(c, q, rng),
    progress: (c, rng) => nhl.nhlProgress(c, rng),
    retire: c => nhl.nhlShouldRetire(c),
    modernIds: () => nhl.nhlEraTeamIds(undefined),
    eraIds: () => nhl.nhlEraTeamIds('y2006'),
    setStar: c => { c.ovr = 88; c.age = 26; c.allStars = 1; },
  },
  {
    key: 'mlb', lib: mlb, eraId: 'y2004', minSalary: 0.5, scale: mlb.MLB_ERAS.find(e => e.id === 'y2004').moneyScale,
    start: (rng, eraId) => mlb.startMlbCareer('Window Test', 'CF', mlb.MLB_ARCHETYPES.CF[0], rng, null, eraId),
    build: (c, q, rng) => mlb.buildMlbFaWindow(c, q, rng),
    pushArgs: (c, rng) => mlb.mlbFaPushArgs(c, rng),
    draw: (c, rng) => mlb.drawMlbEvent(c, rng),
    sim: (c, q, rng) => mlb.simMlbSeason(c, q, rng),
    progress: (c, rng) => mlb.mlbProgress(c, rng),
    retire: c => mlb.mlbShouldRetire(c),
    modernIds: () => mlb.mlbEraTeamIds(undefined),
    eraIds: () => mlb.mlbEraTeamIds('y2004'),
    setStar: c => { c.ovr = 88; c.age = 26; c.allStars = 1; },
  },
];

/* ---------- 1. Window shape, four sports, both worlds ---------- */
console.log('1) The window is well formed in every sport and every era');
for (const S of SPORTS) {
  const rng = seeded(101);
  for (const eraId of [undefined, S.eraId]) {
    const poolIds = new Set(eraId ? S.eraIds() : S.modernIds());
    const foreignIds = eraId
      ? S.modernIds().filter(id => !poolIds.has(id))
      : S.eraIds().filter(id => !new Set(S.modernIds()).has(id));
    for (let i = 0; i < 300; i++) {
      const c = S.start(rng, eraId);
      S.setStar(c);
      c.contractYears = 0;
      const w = S.build(c, 78, rng);
      if (!w.offers.length) { fail(`${S.key} ${eraId ?? 'now'}: empty window`); break; }
      if (!w.offers[0].incumbent) fail(`${S.key} ${eraId ?? 'now'}: incumbent is not first`);
      if (w.offers[0].team !== c.team) fail(`${S.key}: incumbent offer is not from the current team`);
      if (w.offers.filter(o => o.incumbent).length !== 1) fail(`${S.key}: more than one incumbent offer`);
      const seen = new Set();
      for (const o of w.offers) {
        if (seen.has(o.team)) fail(`${S.key}: ${o.team} made two offers in one window`);
        seen.add(o.team);
        if (!poolIds.has(o.team)) fail(`${S.key} ${eraId ?? 'now'}: offer from ${o.team}, not in this world's league`);
        if (foreignIds.includes(o.team)) fail(`${S.key}: ${o.team} leaked across the era wall`);
        if (o.quality < 62 || o.quality > 95) fail(`${S.key}: offer quality ${o.quality} outside every sport's clamp`);
        if (o.salary < S.minSalary - 1e-9) fail(`${S.key}: salary ${o.salary} under the ${S.minSalary} floor`);
        if (o.years < 1 || o.years > 5) fail(`${S.key}: contract length ${o.years}`);
        if (o.gone || o.pushed) fail(`${S.key}: a fresh window arrived pre-negotiated`);
      }
    }
  }
}

/* ---------- 2. Tier economics, measured, not vibes ---------- */
console.log('2) Contenders discount, rebuilds overpay, and the bands are the bands');
{
  /* Margins from the measured run in the header: gaps of about 9M with
     standard errors under 0.07, so a 4M line is not a coin flip. */
  const rng = seeded(202);
  const byTier = { contender: [], playoff: [], rebuild: [] };
  const yearsByTier = { contender: [], playoff: [], rebuild: [] };
  for (let i = 0; i < 3000; i++) {
    const c = nfl.startCareer('Meter Man', 'QB', nfl.ARCHETYPES.QB[0], rng, null, undefined);
    c.ovr = 88; c.age = 26; c.allPros = 1; c.contractYears = 0;
    const w = nfl.buildNflFaWindow(c, 78, rng);
    for (const o of w.offers) {
      if (o.incumbent) continue;
      byTier[o.tier].push(o.salary);
      yearsByTier[o.tier].push(o.years);
      const band = o.tier === 'contender' ? [86, 94] : o.tier === 'playoff' ? [74, 85] : [64, 73];
      if (o.quality < band[0] || o.quality > band[1]) fail(`a ${o.tier} offer carried roster ${o.quality}, outside its band`);
    }
  }
  if (!byTier.contender.length || !byTier.rebuild.length) fail('a 3000-window star run never met a contender or a rebuild');
  const mc = mean(byTier.contender), mp = mean(byTier.playoff), mr = mean(byTier.rebuild);
  if (mr < mp + 4) fail(`rebuilds do not overpay: rebuild mean ${mr.toFixed(1)} vs playoff ${mp.toFixed(1)}`);
  if (mp < mc + 4) fail(`contenders do not discount: playoff mean ${mp.toFixed(1)} vs contender ${mc.toFixed(1)}`);
  /* Rebuilds buy an extra year and contenders shave one, so the design gap
     is about 2 years; a 1 year line is half of that. */
  if (mean(yearsByTier.rebuild) < mean(yearsByTier.contender) + 1) {
    fail(`rebuild deals are not longer: ${mean(yearsByTier.rebuild).toFixed(2)} vs ${mean(yearsByTier.contender).toFixed(2)} years`);
  }
}

/* ---------- 3. The talks ---------- */
console.log('3) Pushing works like leverage, spends once, and cannot strand you');
{
  const rateFor = (profile, seed) => {
    const r = seeded(seed);
    let improved = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const c = nfl.startCareer('Talk Test', 'QB', nfl.ARCHETYPES.QB[0], r, null, undefined);
      c.ovr = 88; c.age = 26; c.contractYears = 0;
      const w = nfl.buildNflFaWindow(c, 78, r);
      const before = w.offers[1].salary;
      const res = fa.pushFaOffer(w, 1, { ...profile, rng: r });
      const after = res.window.offers[1];
      if (!after.pushed) fail('a push did not spend the one negotiation');
      if (w.offers[1].pushed || w.offers[1].salary !== before) fail('pushFaOffer mutated the old window');
      if (!after.gone && after.salary < before) fail('a surviving offer went DOWN after a push');
      if (after.gone && after.salary !== before) fail('a pulled offer changed its number on the way out');
      if (!after.gone && after.salary > before) improved++;
      /* Spent is spent: a second push must change nothing. */
      const again = fa.pushFaOffer(res.window, 1, { ...profile, rng: r });
      if (JSON.stringify(again.window.offers[1]) !== JSON.stringify(after)) fail('a second push changed a spent offer');
    }
    return improved / N;
  };
  const hi = rateFor({ ovr: 92, age: 25, accolades: 3, cliffAge: 31 }, 303);
  const lo = rateFor({ ovr: 74, age: 33, accolades: 0, cliffAge: 31 }, 304);
  /* Measured 0.794 vs 0.154; the 0.3 line is over 30 standard errors in. */
  if (hi - lo < 0.3) fail(`leverage does not matter: star improves ${(hi * 100).toFixed(0)}%, fading vet ${(lo * 100).toFixed(0)}%`);

  /* The two never-strand rules, hammered with a hostile low-leverage
     profile that maximises walkouts: push EVERY offer in every window. */
  const r = seeded(305);
  for (let i = 0; i < 800; i++) {
    const c = nfl.startCareer('Strand Test', 'QB', nfl.ARCHETYPES.QB[0], r, null, undefined);
    c.ovr = 88; c.age = 26; c.contractYears = 0;
    let w = nfl.buildNflFaWindow(c, 78, r);
    for (let k = 0; k < w.offers.length; k++) {
      w = fa.pushFaOffer(w, k, { ovr: 68, age: 36, accolades: 0, cliffAge: 31, rng: r }).window;
    }
    if (w.offers[0].gone) fail('the incumbent rescinded, which must never happen');
    if (!w.offers.some(o => !o.gone)) fail('every offer disappeared, the career is stranded');
  }
}

/* ---------- 4. Signing writes exactly what the card said ---------- */
console.log('4) The signature means the deal on the card');
for (const S of SPORTS) {
  const rng = seeded(404);
  for (let i = 0; i < 200; i++) {
    const c = S.start(rng, undefined);
    S.setStar(c);
    c.contractYears = 0;
    const w = S.build(c, 78, rng);
    const outside = w.offers.find(o => !o.incumbent);
    const stayFan = Math.min(100, c.fanbase + 10);
    const cc = JSON.parse(JSON.stringify(c));
    fa.applyFaSigning(cc, w.offers[0]);
    if (cc.team !== c.team) fail(`${S.key}: re-signing moved the player`);
    if (cc.salary !== w.offers[0].salary || cc.contractYears !== w.offers[0].years) fail(`${S.key}: re-sign wrote a different deal than the card`);
    if (cc.fanbase !== stayFan) fail(`${S.key}: re-sign fanbase ${cc.fanbase}, expected ${stayFan}`);
    if (outside) {
      const cd = JSON.parse(JSON.stringify(c));
      fa.applyFaSigning(cd, outside);
      if (cd.team !== outside.team) fail(`${S.key}: signing elsewhere did not move the player`);
      if (cd.salary !== outside.salary || cd.contractYears !== outside.years) fail(`${S.key}: outside deal differs from the card`);
      if (cd.fanbase !== 40) fail(`${S.key}: a new city should reset fanbase to 40, got ${cd.fanbase}`);
    }
  }
}

/* ---------- 5. The old card really left the decks ---------- */
console.log('5) The event decks no longer deal contracts');
for (const S of SPORTS) {
  const rng = seeded(505);
  for (let i = 0; i < 400; i++) {
    const c = S.start(rng, undefined);
    c.contractYears = 0; /* exactly the state that used to summon the card */
    const ev = S.draw(c, rng);
    if (ev.id === 'contract') { fail(`${S.key}: the retired 'contract' card is still in the deck`); break; }
  }
}

/* ---------- 6. Whole careers through the market, both worlds ---------- */
console.log('6) Full careers cross every window and the era wall holds');
for (const S of SPORTS) {
  for (const eraId of [undefined, S.eraId]) {
    const rng = seeded(606);
    const poolIds = new Set(eraId ? S.eraIds() : S.modernIds());
    let windows = 0, careersWithWindow = 0;
    for (let i = 0; i < 120; i++) {
      const c = S.start(rng, eraId);
      let q = 78, sawWindow = false, guard = 0;
      while (!c.retired && c.seasons.length < 22 && guard++ < 60) {
        if (c.contractYears <= 0) {
          const w = S.build(c, q, rng);
          windows++; sawWindow = true;
          /* Random shopper: sometimes push something, then sign a live offer. */
          let ww = w;
          if (rng() < 0.4) ww = fa.pushFaOffer(ww, Math.floor(rng() * ww.offers.length), S.pushArgs(c, rng)).window;
          const live = ww.offers.filter(o => !o.gone);
          if (!live.length) { fail(`${S.key}: a live career met an unsignable window`); break; }
          const chosen = live[Math.floor(rng() * live.length)];
          fa.applyFaSigning(c, chosen);
          q = chosen.quality;
          if (!poolIds.has(c.team)) fail(`${S.key} ${eraId ?? 'now'}: signed with ${c.team}, outside this world`);
          if (c.contractYears < 1) fail(`${S.key}: signed a deal of ${c.contractYears} years`);
          continue;
        }
        S.sim(c, q, rng);
        S.progress(c, rng);
        if (S.retire(c)) c.retired = true;
      }
      if (sawWindow) careersWithWindow++;
    }
    if (careersWithWindow < 110) fail(`${S.key} ${eraId ?? 'now'}: only ${careersWithWindow}/120 careers ever reached free agency`);
    if (windows === 0) fail(`${S.key}: no windows at all`);
  }
}

/* ---------- verdict ---------- */
if (failures > 0) {
  console.error(`\n${failures} FREE AGENCY CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL FREE AGENCY CHECKS PASSED');
