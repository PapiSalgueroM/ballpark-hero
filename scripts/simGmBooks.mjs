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
   4. The most free operations money one season can bring, measured through
      opsFreeK (a big market at full trust, nothing built, no carry), must
      sit at or under FO_BEST_FREE_OPS_SHARE, the pot the facility packs
      hold their full build out against (scripts/simGmFacilities.mjs). That
      is the right pot: buildings are paid from the operations budget and
      nothing else, never from the season's operating result.
   5. The ticket tiers are Club Manager's numbers (read from clubManager.ts).
   0. The season shapes are the engines' own: each sport's periods and home
      games are read from the engine constants (frontOffice REGULAR_WEEKS
      and its game counts, NBA_ROUNDS, NHL_FO_ROUNDS, MLB_ROUNDS and their
      games a round), and each front office pack's upkeep is spread over the
      same number of periods.
   6. The operations budget's rules, under a seat that buys a building at
      every chance (four sports, three tiers, three fixed trusts, a cap that
      grows 3 percent a season, eight seasons): unspent money carries to the
      $k (an overrun as a debt), next season's budget is the market share of
      next season's cap moved by trust (the harness's own formula), and a
      season in which anything was bought never ends over its budget plus
      carry, so a purchase can never eat the staff or the upkeep money.
   7. Ownership's ticket verdict: forty flicks of the price in a season move
      trust by nothing, the close moves it by the held tier's one point, and
      across the chaotic seasons of section 1 trust never moves more than a
      point at a close.

   Measured on 2026-10-03 (printed again on every run): see each section's
   BANDS comment; section 3 big over middle 1.2601, middle over small 1.2227
   (bands 1.15 and 1.12).

   Controls (GMBOOKS_CONTROL), each asserting its anchor exists first:
     dropcost    the close leaves upkeep out of the season's costs: section 1 must fail.
     nobook      the period tick stops booking upkeep: section 2 must fail.
     flatmarket  every market earns like a middle one: section 3 must fail.
     richops     a big market's budget share rises to 0.3: section 4 must fail.
     nflbye      the NFL books go back to 18 periods: section 0 must fail.
     losecarry   the summer carry drops last season's carry: section 6 must fail.
     nocommit    free money forgets the season's committed running costs: section 6 must fail.
     noreserve   a purchase forgets the upkeep its own new level adds: section 6 must fail.
     swapbudget  next season's budget is called with trust and cap swapped: section 6 must fail.
     bigverdict  ownership's premium verdict is three points: section 7 must fail.
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
} else if (CONTROL === 'richops') {
  rewrite('richops', 'export const OPS_SHARE: Record<MarketTier, number> = { 1: 0.12, 2: 0.09, 3: 0.065 };',
    'export const OPS_SHARE: Record<MarketTier, number> = { 1: 0.3, 2: 0.09, 3: 0.065 };');
} else if (CONTROL === 'nflbye') {
  rewrite('nflbye', "nfl: { id: 'nfl', periods: 17,", "nfl: { id: 'nfl', periods: 18,");
} else if (CONTROL === 'losecarry') {
  rewrite('losecarry', 'const carry = b.opsBudget + b.opsCarry - opsSpentK(b);', 'const carry = b.opsBudget - opsSpentK(b);');
} else if (CONTROL === 'nocommit') {
  rewrite('nocommit', 'return Math.max(0, b.opsBudget + b.opsCarry - opsSpentK(b) - sum3(runningCostsLeftK(b, ctx)));',
    'return Math.max(0, b.opsBudget + b.opsCarry - opsSpentK(b));');
} else if (CONTROL === 'noreserve') {
  rewrite('noreserve', 'return Math.max(0, opsFreeK(b, ctx) - Math.max(0, extra));', 'return Math.max(0, opsFreeK(b, ctx) + 0 * extra);');
} else if (CONTROL === 'swapbudget') {
  rewrite('swapbudget', 'opsBudget: opsBudgetFor(b.marketTier, trust, nextCap),', 'opsBudget: opsBudgetFor(b.marketTier, nextCap, trust),');
} else if (CONTROL === 'bigverdict') {
  rewrite('bigverdict', 'export const TICKET_TRUST: Record<GmTicketTier, number> = { 0: -1, 1: 0, 2: 1 };',
    'export const TICKET_TRUST: Record<GmTicketTier, number> = { 0: -1, 1: 0, 2: 3 };');
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
  { id: 'nfl', cap: M.NFL_SALARY_CAP_2026, pack: P.NFL_FACILITY_PACK, games: 1, home: (i) => (i % 2 === 0 ? 1 : 0), deepRun: 2 },
  { id: 'nba', cap: M.NBA_SALARY_CAP_2026_27, pack: P.NBA_FACILITY_PACK, games: 4, home: () => 2, deepRun: 8 },
  { id: 'nhl', cap: M.NHL_UPPER_LIMIT_2026_27, pack: P.NHL_FACILITY_PACK, games: 4, home: () => 2, deepRun: 8 },
  { id: 'mlb', cap: M.MLB_CBT_THRESHOLD_2026, pack: P.MLB_FACILITY_PACK, games: 6, home: () => 3, deepRun: 6 },
];
const SEEDS = [11, 23, 37, 41, 59, 73];

/* The facility upkeep a period, recomputed here from the levels alone and
   NOT through upkeepPerPeriod: the pack's rate for every level ABOVE 1 of
   every building, times the league's scale. A building at level 1 costs
   nothing. upkeepPerLevel has three decimals, so the product is a whole $k. */
function harnessUpkeepK(pack, fac, scale) {
  const above = pack.facilities.reduce((n, d) => n + (fac.levels[d.id] - 1), 0);
  return Math.round(pack.upkeepPerLevel * above * scale * 1000);
}

/** One season. Returns the closed ledger and what the harness itself expects of it. */
function playSeason(state, sp, rng, o) {
  let { books, fac } = state;
  const sport = B.GM_BOOKS_SPORTS[sp.id];
  const cap = o.cap ?? sp.cap;
  const scale = cap / sp.cap;
  const payroll = Math.round(cap * o.payrollShare * 1000) / 1000;
  const deadMoney = Math.round(cap * o.deadShare * 1000) / 1000;
  const opsBudgetAtOpen = books.opsBudget;
  const opsCarryAtOpen = books.opsCarry;
  let expectFacilityUpkeepK = 0;
  const form = [];
  for (let i = 0; i < sport.periods; i += 1) {
    const ctx = { sport, cap, payroll, deadMoney, scale, facilities: { pack: sp.pack, state: fac } };
    if (o.chaos && rng() < 0.08) books = B.setGmTicketTier(books, Math.floor(rng() * 3)).books;
    if ((o.chaos && !fac.build && rng() < 0.3) || (o.greedy && !fac.build)) {
      const order = sp.pack.facilities.map(d => d.id).sort(() => rng() - 0.5);
      for (const id of o.greedy ? order : order.slice(0, 1)) {
        const bought = B.buyFacility(books, ctx, id);
        if (bought) { books = bought.books; fac = bought.facilities; ctx.facilities = { pack: sp.pack, state: fac }; break; }
      }
    }
    expectFacilityUpkeepK += harnessUpkeepK(sp.pack, fac, scale);
    for (let g = 0; g < sp.games; g += 1) form.push(rng() < o.winP ? 'W' : 'L');
    books = B.tickGmBooks(books, ctx, form, sp.home(i));
    fac = F.tickFacilities(sp.pack, fac).state;
  }
  const endCtx = { sport, cap, payroll, deadMoney, scale, facilities: { pack: sp.pack, state: fac } };
  for (let k = 0; k < o.playoffHome; k += 1) books = B.notePlayoffHomeGame(books, endCtx);
  if (o.taxM > 0) books = B.noteTax(books, o.taxM);
  const trustIn = o.trust ?? 60;
  const heldTier = books.ticketTier;
  const { books: next, closed, trust } = B.closeGmSeason(books, trustIn, o.nextCap ?? cap);
  return {
    state: { books: next, fac: F.rolloverFacilities(sp.pack, fac, false) },
    closed, next, trustIn, trust, heldTier, opsBudgetAtOpen, opsCarryAtOpen,
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
let seasons = 0, unbalanced = 0, badTotals = 0, badLines = 0, upkeepSeasons = 0, trustJumps = 0, ticketCloses = 0;
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
          trust: 1 + Math.floor(rng() * 99),
        });
        const c = r.closed;
        seasons += 1;
        if (r.heldTier !== 1) ticketCloses += 1;
        if (Math.abs(r.trust - r.trustIn) > 1) trustJumps += 1;
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
if (badLines === 0) ok('payroll, dead money, staff, tax, upkeep and scouting are booked at exactly what they cost (upkeep recomputed here from the levels, nothing for a level 1 building)');
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

/* ---------- 4: the most a season can put into buildings, against the packs' number ---------- */
console.log('\n4. The best season\'s free operations money against FO_BEST_FREE_OPS_SHARE');
const freeShares = [];
for (const sp of SPORTS) {
  const books = B.newGmBooks(B.GM_BOOKS_SPORTS[sp.id], 1, 100, sp.cap);
  const ctx = { sport: B.GM_BOOKS_SPORTS[sp.id], cap: sp.cap, payroll: sp.cap, deadMoney: 0, facilities: { pack: sp.pack, state: F.newFacilities(sp.pack, 1) } };
  const share = B.opsFreeK(books, ctx) / 1000 / sp.cap;
  freeShares.push({ id: sp.id, share });
  /* For information only: a good season's operating result (big market on
     the cap, two wins in three, a deep playoff run). It never buys a
     building, so nothing is held against it. */
  const rng = rngFrom(131 * 7 + 3);
  const r = playSeason({ books, fac: F.newFacilities(sp.pack, 1) }, sp, rng, { chaos: false, winP: 0.66, payrollShare: 1.0, deadShare: 0, playoffHome: sp.deepRun, taxM: 0 });
  console.log(`   ${sp.id}: free operations money ${share.toFixed(4)} caps a season at best; a good season's operating result ${(r.closed.result / 1000 / sp.cap).toFixed(3)} caps`);
}
/* BANDS. Measured 2026-10-03: 0.0792 caps in every sport (0.12 x 1.2 x
   0.55, the same shares everywhere); the declared 0.08 sits just above, so
   the build out in simGmFacilities is never held against an underestimate. */
const declared = P.FO_BEST_FREE_OPS_SHARE;
const over = freeShares.filter(g => g.share > declared);
if (over.length === 0) ok(`every sport's best free operations money sits at or under the packs' declared ${declared} caps`);
else fail(`a season's free operations money beats the ${declared} caps the facility packs are held against: ${over.map(g => `${g.id} ${g.share.toFixed(4)}`).join(', ')}`);

/* ---------- 5: the ticket tiers are Club Manager's ---------- */
console.log('\n5. The ticket tiers match Club Manager\'s');
const cmSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
const block = cmSrc.slice(cmSrc.indexOf('export const TICKET_TIERS'), cmSrc.indexOf('] as const;', cmSrc.indexOf('export const TICKET_TIERS')));
const cm = [...block.matchAll(/priceMult: ([\d.]+), crowdMult: ([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
const gm = B.GM_TICKET_TIERS.map(t => [t.priceMult, t.crowdMult]);
if (cm.length === 3 && JSON.stringify(cm) === JSON.stringify(gm)) ok(`three tiers, ${JSON.stringify(gm)}, the same as Club Manager's`);
else fail(`ticket tiers drifted: Club Manager ${JSON.stringify(cm)}, GM ${JSON.stringify(gm)}`);

/* ---------- 0: the season shapes are the engines' own ---------- */
console.log('\n0. Each sport\'s periods and home games are the engine\'s own');
const constOf = (file, name) => {
  const s = lf(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const m = s.match(new RegExp(`(?:^|\\n)(?:export )?const ${name} = (\\d+);`));
  if (!m) { fail(`${name} not found in ${file}`); return NaN; }
  return Number(m[1]);
};
const ENGINE = {
  nfl: { periods: constOf('src/lib/frontOffice.ts', 'REGULAR_WEEKS'), games: constOf('src/lib/frontOffice.ts', 'CROSSOVER_GAMES') + constOf('src/lib/frontOffice.ts', 'DIVISIONAL_GAMES') },
  nba: { periods: constOf('src/lib/nbaFrontOffice.ts', 'NBA_ROUNDS'), perRound: constOf('src/lib/nbaFrontOffice.ts', 'GAMES_PER_ROUND') },
  nhl: { periods: constOf('src/lib/nhlFrontOffice.ts', 'NHL_FO_ROUNDS'), perRound: constOf('src/lib/nhlFrontOffice.ts', 'NHL_GAMES_PER_ROUND') },
  mlb: { periods: constOf('src/lib/mlbFrontOffice.ts', 'MLB_ROUNDS'), perRound: constOf('src/lib/mlbFrontOffice.ts', 'MLB_GAMES_PER_ROUND') },
};
const shapeMisses = [];
for (const sp of SPORTS) {
  const e = ENGINE[sp.id];
  const sport = B.GM_BOOKS_SPORTS[sp.id];
  const games = e.games ?? e.periods * e.perRound;
  if (sport.periods !== e.periods) shapeMisses.push(`${sp.id} books tick ${sport.periods} periods, the engine plays ${e.periods}`);
  if (sport.homeGames * 2 !== games) shapeMisses.push(`${sp.id} books ${sport.homeGames} home games, the engine plays ${games} games`);
  /* The pack spreads 2 percent of the cap for 16 levels over the engine's
     periods, kept to the $1k (packs.ts foPack); the same sum on the engine's
     own period count must give the pack's number exactly. */
  const wantUpkeep = Math.round((sp.cap * 0.02 / (e.periods * 16)) * 1000) / 1000;
  if (sp.pack.upkeepPerLevel !== wantUpkeep) shapeMisses.push(`${sp.id} pack upkeep ${sp.pack.upkeepPerLevel} a level a period is not 2 percent of the cap for 16 levels over the engine's ${e.periods} periods (${wantUpkeep})`);
}
console.log(`   engine shapes: ${SPORTS.map(sp => `${sp.id} ${ENGINE[sp.id].periods}`).join(', ')}`);
if (shapeMisses.length === 0) ok('every sport ticks the engine\'s own periods, books its own home games, and its pack spreads upkeep over that season');
else fail(shapeMisses.join('; '));

/* ---------- 6: the operations budget's rules, under a seat that buys at every chance ---------- */
console.log('\n6. The operations budget: the carry, next season\'s budget, and the ceiling');
let opsSeasons = 0, buySeasons = 0, overBuy = 0, overRun = 0, carryMiss = 0, budgetMiss = 0, carriedIn = 0;
let worstOver = null;
for (const sp of SPORTS) {
  for (const tier of [1, 2, 3]) {
    for (const trust of [20, 60, 100]) {
      for (const seed of [5, 17]) {
        const rng = rngFrom(seed * 1009 + tier * 31 + trust);
        let state = { books: B.newGmBooks(B.GM_BOOKS_SPORTS[sp.id], tier, trust, sp.cap), fac: F.newFacilities(sp.pack, tier) };
        for (let season = 0; season < 8; season += 1) {
          const cap = Math.round(sp.cap * 1.03 ** season * 1000) / 1000;
          const nextCap = Math.round(sp.cap * 1.03 ** (season + 1) * 1000) / 1000;
          const r = playSeason(state, sp, rng, { greedy: true, winP: 0.5, payrollShare: 0.95, deadShare: 0, playoffHome: 0, taxM: 0, trust, cap, nextCap });
          const c = r.closed;
          opsSeasons += 1;
          if (r.opsCarryAtOpen !== 0) carriedIn += 1;
          const spent = c.staff + c.scouting + c.upkeep + c.facilities;
          const room = r.opsBudgetAtOpen + r.opsCarryAtOpen;
          if (c.facilities > 0) {
            buySeasons += 1;
            if (spent > room) {
              overBuy += 1;
              if (!worstOver || spent - room > worstOver.by) worstOver = { by: spent - room, at: `${sp.id} tier ${tier} trust ${trust} season ${season}: spent ${spent}k of ${room}k` };
            }
          } else if (spent > room) overRun += 1;
          if (r.next.opsCarry !== room - spent) carryMiss += 1;
          /* The harness's own formula: the market's share of next season's
             cap, 0.7x at no trust to 1.2x at full, 1x at 60. */
          const want = Math.round(B.OPS_SHARE[tier] * nextCap * (1 + 0.5 * ((r.trust - 60) / 100)) * 1000);
          if (r.next.opsBudget !== want) budgetMiss += 1;
          state = r.state;
        }
      }
    }
  }
}
console.log(`   ${opsSeasons} seasons, ${buySeasons} with a purchase, ${carriedIn} opening on a carry, ${overRun} where running costs alone overran (no purchase), worst purchase overrun ${worstOver ? worstOver.at : 'none'}`);
if (buySeasons < opsSeasons / 3) fail(`only ${buySeasons} of ${opsSeasons} seasons bought anything, so the ceiling barely tested a purchase`);
if (carriedIn < opsSeasons / 2) fail(`only ${carriedIn} of ${opsSeasons} seasons opened on a carry, so the carry rule barely ran`);
if (overBuy === 0) ok(`no season with a purchase ended over its budget plus carry (${buySeasons} seasons): a building never eats the staff, scouts or upkeep money`);
else fail(`${overBuy} of ${buySeasons} seasons with a purchase ended over budget plus carry; worst ${worstOver.at}`);
if (carryMiss === 0) ok('every summer carries budget plus carry less spend to the $k, an overrun as a debt');
else fail(`${carryMiss} of ${opsSeasons} summers carried the wrong amount`);
if (budgetMiss === 0) ok('every next season\'s budget is the market share of next season\'s cap moved by trust');
else fail(`${budgetMiss} of ${opsSeasons} next season budgets are not the market share of the cap moved by trust`);

/* ---------- 7: ownership's verdict on the price, once a season ---------- */
console.log('\n7. The ticket price moves trust once a season, by a point');
const verdictMisses = [];
for (const sp of SPORTS) {
  const sport = B.GM_BOOKS_SPORTS[sp.id];
  let b = B.newGmBooks(sport, 2, 60, sp.cap);
  for (let i = 0; i < 40; i += 1) b = B.setGmTicketTier(b, i % 2 === 0 ? 2 : 1).books;
  const flicked = B.closeGmSeason(b, 60, sp.cap).trust;
  if (flicked !== 60) verdictMisses.push(`${sp.id}: forty flicks ending on standard moved trust 60 to ${flicked}`);
  const prem = B.closeGmSeason(B.setGmTicketTier(b, 2).books, 60, sp.cap).trust;
  if (prem !== 61) verdictMisses.push(`${sp.id}: a season closed on premium took trust 60 to ${prem}, not 61`);
  const fairLow = B.closeGmSeason(B.setGmTicketTier(b, 0).books, 1, sp.cap).trust;
  if (fairLow !== 1) verdictMisses.push(`${sp.id}: fair prices took trust 1 to ${fairLow}; a price is never the sack`);
}
if (verdictMisses.length === 0) ok('flicking the price earns nothing; the close moves trust a point for the tier held, never to the sack');
else fail(verdictMisses.join('; '));
console.log(`   chaotic seasons of section 1: ${ticketCloses} of ${seasons} closed off standard prices, ${trustJumps} moved trust by more than a point`);
if (ticketCloses < seasons / 4) fail(`only ${ticketCloses} chaotic seasons closed off standard, so the verdict barely ran`);
if (trustJumps === 0) ok('no chaotic season moved trust by more than a point at the close');
else fail(`${trustJumps} chaotic seasons moved trust by more than a point at the close`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimGmBooks: ${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures === 0 ? 0 : 1);
