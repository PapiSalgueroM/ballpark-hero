/* Round 943: the books for the GM seats (src/lib/gmBooks.ts).

   What it holds, each against the module's own output, never against a
   description of it:

   1. The ledger balances exactly every season. Four sports, three market
      tiers, six seeds, five seasons each with random results, ticket
      changes, playoff gates, a tax cheque, dead money and buildings bought
      whenever the operations budget allows: the closed season's income less
      its costs must equal the change in the kitty to the thousand dollars,
      and the reported totals must equal the sum of their own lines.
   2. The ledger books what things cost: the payroll line is the payroll to
      the $k, staff is its share of the budget, and the upkeep plus scouting
      lines equal what the facility engine charged at the levels each period
      actually stood at (the harness recomputes that itself).
   3. A bigger market earns more at equal results, by a measured margin.
      The same seeded results are played by a big, a middle and a small
      market club; only the tier differs.
   4. A good season, measured: a big market on the cap, winning about two in
      three, with a deep playoff run. Its operating result as a share of the
      cap must sit at or under FO_GOOD_SEASON_SHARE, the number the facility
      packs hold their full build out against (scripts/simGmFacilities.mjs),
      so that number is never an underestimate.
   5. The ticket tiers are Club Manager's numbers (read from clubManager.ts).

   Measured on 2026-10-02 (6 seeds x 4 sports, printed again on every run):
   big over middle market 1.2601 at equal results, middle over small 1.2227
   (bands 1.15 and 1.12); a good season 0.639 / 0.583 / 0.580 / 0.483 caps
   for the NFL / NBA / NHL / MLB against the declared 0.7.

   Controls (GMBOOKS_CONTROL), each asserting its anchor exists first:
     dropcost    the close leaves upkeep out of the season's costs: section 1 must fail.
     nobook      the period tick stops booking upkeep: section 2 must fail.
     flatmarket  every market earns like a middle one: section 3 must fail.
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GMBOOKS_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

function findEsbuild() {
  const exe = process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild';
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', '.bin', exe);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('esbuild not found walking up from ' + ROOT);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gmbooks-'));
const lf = (s) => s.replaceAll('\r\n', '\n');
let booksSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/gmBooks.ts'), 'utf8'));

function rewrite(name, anchor, replacement) {
  if (!booksSrc.includes(anchor)) {
    console.log(`   FAIL control ${name}: its anchor is not in gmBooks.ts, so it would change nothing`);
    process.exit(1);
  }
  booksSrc = booksSrc.replace(anchor, replacement);
  console.log(`   control ${name} applied`);
}

if (CONTROL === 'dropcost') {
  rewrite('dropcost', 'const spend = s.payroll + s.tax + s.deadMoney + s.staff + s.scouting + s.upkeep + s.facilities;',
    'const spend = s.payroll + s.tax + s.deadMoney + s.staff + s.scouting + s.facilities;');
} else if (CONTROL === 'nobook') {
  rewrite('nobook', "    book(b, 'upkeep', upkeep);\n", '');
} else if (CONTROL === 'flatmarket') {
  rewrite('flatmarket', 'export const MARKET_MULT: Record<MarketTier, number> = { 1: 1.5, 2: 1.0, 3: 0.65 };',
    'export const MARKET_MULT: Record<MarketTier, number> = { 1: 1.0, 2: 1.0, 3: 1.0 };');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const booksPath = path.join(TMP, 'gmBooks.ts');
fs.writeFileSync(booksPath, booksSrc);
const ENTRY = path.join(TMP, 'entry.ts');
fs.writeFileSync(ENTRY, [
  "export * as books from '@/lib/gmBooks';",
  "export * as fac from '@/lib/gmFacilities';",
  "export * as packs from '@/data/gmFacilities/packs';",
  "export { NBA_SALARY_CAP_2026_27, NFL_SALARY_CAP_2026, NHL_UPPER_LIMIT_2026_27, MLB_CBT_THRESHOLD_2026 } from '@/lib/leagueCaps';",
].join('\n'));
const BUNDLE = path.join(TMP, 'bundle.mjs');
const aliases = [`--alias:@/lib/gmBooks=${booksPath.replaceAll('\\', '/')}`, `--alias:@=${ROOT_URL}/src`];
execSync(`"${findEsbuild()}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const M = await import(pathToFileURL(BUNDLE).href);
const B = M.books;
const F = M.fac;
const P = M.packs;

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The engines' own season shapes (see GM_BOOKS_SPORTS): games a period and
   how many of them are at home, and a deep playoff run's home games. */
const SPORTS = [
  { id: 'nfl', cap: M.NFL_SALARY_CAP_2026, pack: P.NFL_FACILITY_PACK, games: 1, home: (i) => (i < 17 && i % 2 === 0 ? 1 : 0), deepRun: 2 },
  { id: 'nba', cap: M.NBA_SALARY_CAP_2026_27, pack: P.NBA_FACILITY_PACK, games: 4, home: () => 2, deepRun: 8 },
  { id: 'nhl', cap: M.NHL_UPPER_LIMIT_2026_27, pack: P.NHL_FACILITY_PACK, games: 4, home: () => 2, deepRun: 8 },
  { id: 'mlb', cap: M.MLB_CBT_THRESHOLD_2026, pack: P.MLB_FACILITY_PACK, games: 6, home: () => 3, deepRun: 6 },
];
const SEEDS = [11, 23, 37, 41, 59, 73];

/** One season. Returns the closed ledger and what the harness itself expects of it. */
function playSeason(state, sp, rng, o) {
  let { books, fac } = state;
  const sport = B.GM_BOOKS_SPORTS[sp.id];
  const payroll = Math.round(sp.cap * o.payrollShare * 1000) / 1000;
  const deadMoney = Math.round(sp.cap * o.deadShare * 1000) / 1000;
  const opsBudgetAtOpen = books.opsBudget;
  let expectFacilityUpkeepK = 0;
  const form = [];
  for (let i = 0; i < sport.periods; i += 1) {
    const ctx = { sport, cap: sp.cap, payroll, deadMoney, facilities: { pack: sp.pack, state: fac } };
    if (o.chaos && rng() < 0.08) books = B.setGmTicketTier(books, Math.floor(rng() * 3), 60).books;
    if (o.chaos && !fac.build && rng() < 0.3) {
      const id = sp.pack.facilities[Math.floor(rng() * sp.pack.facilities.length)].id;
      const bought = B.buyFacility(books, ctx, id);
      if (bought) { books = bought.books; fac = bought.facilities; ctx.facilities = { pack: sp.pack, state: fac }; }
    }
    expectFacilityUpkeepK += B.toK(F.upkeepPerPeriod(sp.pack, fac));
    for (let g = 0; g < sp.games; g += 1) form.push(rng() < o.winP ? 'W' : 'L');
    books = B.tickGmBooks(books, ctx, form, sp.home(i));
    fac = F.tickFacilities(sp.pack, fac).state;
  }
  const endCtx = { sport, cap: sp.cap, payroll, deadMoney, facilities: { pack: sp.pack, state: fac } };
  for (let k = 0; k < o.playoffHome; k += 1) books = B.notePlayoffHomeGame(books, endCtx);
  if (o.taxM > 0) books = B.noteTax(books, o.taxM);
  const { books: next, closed } = B.closeGmSeason(books, 60, sp.cap);
  return {
    state: { books: next, fac: F.rolloverFacilities(sp.pack, fac, false) },
    closed,
    expect: {
      payroll: B.toK(payroll),
      deadMoney: B.toK(deadMoney),
      staff: Math.round(opsBudgetAtOpen * B.STAFF_SHARE),
      upkeepPlusScouting: expectFacilityUpkeepK + Math.round(opsBudgetAtOpen * B.SCOUTING_SHARE),
      tax: B.toK(o.taxM),
    },
  };
}

const INCOME = ['gate', 'localMedia', 'leagueShare', 'playoffGate'];
const COSTS = ['payroll', 'tax', 'deadMoney', 'staff', 'scouting', 'upkeep', 'facilities'];
const sumOf = (l, keys) => keys.reduce((n, k) => n + l[k], 0);

/* ---------- 1 and 2: five chaotic seasons per sport, tier and seed ---------- */
console.log('\n1. Every season balances to the $k, and 2. the ledger books what things cost');
let seasons = 0, unbalanced = 0, badTotals = 0, badLines = 0, upkeepSeasons = 0;
const lineMisses = {};
for (const sp of SPORTS) {
  for (const tier of [1, 2, 3]) {
    for (const seed of SEEDS) {
      const rng = rngFrom(seed * 97 + tier);
      let state = { books: B.newGmBooks(B.GM_BOOKS_SPORTS[sp.id], tier, 60, sp.cap), fac: F.newFacilities(sp.pack, tier) };
      for (let season = 0; season < 5; season += 1) {
        const r = playSeason(state, sp, rng, {
          chaos: true, winP: 0.35 + rng() * 0.3, payrollShare: 0.85 + rng() * 0.3, deadShare: rng() * 0.05,
          playoffHome: rng() < 0.5 ? Math.floor(rng() * (sp.deepRun + 1)) : 0,
          taxM: sp.id === 'nba' && rng() < 0.3 ? Math.round(rng() * 40 * 100) / 100 : 0,
        });
        const c = r.closed;
        seasons += 1;
        if (c.income - c.spend !== c.kittyAtClose - c.kittyAtOpen) unbalanced += 1;
        if (c.income !== sumOf(c, INCOME) || c.spend !== sumOf(c, COSTS)) badTotals += 1;
        if (r.expect.upkeepPlusScouting > Math.round(state.books.opsBudget * B.SCOUTING_SHARE)) upkeepSeasons += 1;
        const misses = [];
        if (c.payroll !== r.expect.payroll) misses.push('payroll');
        if (c.deadMoney !== r.expect.deadMoney) misses.push('deadMoney');
        if (c.staff !== r.expect.staff) misses.push('staff');
        if (c.upkeep + c.scouting !== r.expect.upkeepPlusScouting) misses.push('upkeep');
        if (c.tax !== r.expect.tax) misses.push('tax');
        if (misses.length) { badLines += 1; for (const m of misses) lineMisses[m] = (lineMisses[m] ?? 0) + 1; }
        state = r.state;
      }
    }
  }
}
console.log(`   ${seasons} seasons, ${upkeepSeasons} of them carrying facility upkeep`);
if (seasons !== SPORTS.length * 3 * SEEDS.length * 5) fail(`expected ${SPORTS.length * 3 * SEEDS.length * 5} seasons, ran ${seasons}`);
if (upkeepSeasons < seasons / 2) fail(`only ${upkeepSeasons} seasons carried upkeep, so the balance barely tested it`);
if (unbalanced === 0) ok('every closed season: income less costs equals the change in the kitty, to the $k');
else fail(`${unbalanced} of ${seasons} seasons do not balance (income less costs is not the change in the kitty)`);
if (badTotals === 0) ok('every closed season\'s income and costs are the sums of their own lines');
else fail(`${badTotals} of ${seasons} seasons report totals that are not the sum of their lines`);
if (badLines === 0) ok('payroll, dead money, staff, tax, upkeep and scouting are booked at exactly what they cost');
else fail(`${badLines} of ${seasons} seasons booked a line wrong: ${JSON.stringify(lineMisses)}`);

/* ---------- 3: a bigger market earns more at equal results ---------- */
console.log('\n3. A bigger market earns more at equal results');
const ratios12 = [], ratios23 = [];
for (const sp of SPORTS) {
  for (const seed of SEEDS) {
    const income = {};
    for (const tier of [1, 2, 3]) {
      const rng = rngFrom(seed * 31 + 7);
      const state = { books: B.newGmBooks(B.GM_BOOKS_SPORTS[sp.id], tier, 60, sp.cap), fac: F.newFacilities(sp.pack, 3) };
      const r = playSeason(state, sp, rng, { chaos: false, winP: 0.5, payrollShare: 0.95, deadShare: 0, playoffHome: 2, taxM: 0 });
      income[tier] = r.closed.income;
    }
    ratios12.push(income[1] / income[2]);
    ratios23.push(income[2] / income[3]);
  }
}
const mean = (a) => a.reduce((n, x) => n + x, 0) / a.length;
const lo = (a) => Math.min(...a);
console.log(`   big over middle: mean ${mean(ratios12).toFixed(4)}, lowest ${lo(ratios12).toFixed(4)}; middle over small: mean ${mean(ratios23).toFixed(4)}, lowest ${lo(ratios23).toFixed(4)}`);
/* BANDS, from the measured values above (2026-10-02, 4 sports x 6 seeds):
   big over middle mean 1.2601 (lowest 1.2525), middle over small mean 1.2227
   (lowest 1.2147), nearly constant because the same results move every
   tier's gate alike. The floors sit about a tenth under, room to retune the
   tier multipliers a little, and a flat market (ratio 1.0) is far below both. */
const BAND_12 = 1.15, BAND_23 = 1.12;
if (mean(ratios12) >= BAND_12) ok(`a big market out earns a middle one by ${((mean(ratios12) - 1) * 100).toFixed(1)}% at equal results (band ${BAND_12})`);
else fail(`a big market earns only ${mean(ratios12).toFixed(4)}x a middle one at equal results (band ${BAND_12})`);
if (mean(ratios23) >= BAND_23) ok(`a middle market out earns a small one by ${((mean(ratios23) - 1) * 100).toFixed(1)}% at equal results (band ${BAND_23})`);
else fail(`a middle market earns only ${mean(ratios23).toFixed(4)}x a small one at equal results (band ${BAND_23})`);

/* ---------- 4: a good season, measured, against the facility packs' number ---------- */
console.log('\n4. A good season\'s operating result against FO_GOOD_SEASON_SHARE');
const goodShares = [];
for (const sp of SPORTS) {
  const shares = [];
  for (const seed of SEEDS) {
    const rng = rngFrom(seed * 131 + 3);
    const state = { books: B.newGmBooks(B.GM_BOOKS_SPORTS[sp.id], 1, 60, sp.cap), fac: F.newFacilities(sp.pack, 1) };
    const r = playSeason(state, sp, rng, { chaos: false, winP: 0.66, payrollShare: 1.0, deadShare: 0, playoffHome: sp.deepRun, taxM: 0 });
    shares.push(r.closed.result / 1000 / sp.cap);
  }
  goodShares.push({ id: sp.id, share: mean(shares) });
  console.log(`   ${sp.id}: result ${mean(shares).toFixed(3)} caps (lowest ${lo(shares).toFixed(3)})`);
}
/* Each sport's mean is checked on its own, because each pack is held against
   its own league's good season. Measured 2026-10-02: 0.639, 0.583, 0.580,
   0.483 caps with under 0.002 between seeds; the declared 0.7 sits 0.061
   above the highest. */
const declared = P.FO_GOOD_SEASON_SHARE;
const over = goodShares.filter(g => g.share > declared);
if (over.length === 0) ok(`every sport's measured good season sits at or under the packs' declared ${declared} caps`);
else fail(`a measured good season beats the ${declared} caps the facility packs are held against: ${over.map(g => `${g.id} ${g.share.toFixed(3)}`).join(', ')}`);

/* ---------- 5: the ticket tiers are Club Manager's ---------- */
console.log('\n5. The ticket tiers match Club Manager\'s');
const cmSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
const block = cmSrc.slice(cmSrc.indexOf('export const TICKET_TIERS'), cmSrc.indexOf('] as const;', cmSrc.indexOf('export const TICKET_TIERS')));
const cm = [...block.matchAll(/priceMult: ([\d.]+), crowdMult: ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
const gm = B.GM_TICKET_TIERS.map(t => [t.priceMult, t.crowdMult]);
if (cm.length === 3 && JSON.stringify(cm) === JSON.stringify(gm)) ok(`three tiers, ${JSON.stringify(gm)}, the same as Club Manager's`);
else fail(`ticket tiers drifted: Club Manager ${JSON.stringify(cm)}, GM ${JSON.stringify(gm)}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimGmBooks: ${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures === 0 ? 0 : 1);
