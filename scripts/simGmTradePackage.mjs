/* Round 909: trade packages, the rules on what can be in one, and who buys
 * and who sells at the deadline, measured.
 *
 * src/lib/gmTradePackage.ts values a package of several players, prospects
 * and picks through the engine's own valueOf and capCheck, and
 * src/lib/gmDeadline.ts splits the clubs into buyers and sellers. This
 * harness runs the real modules, bundled, on the small league in
 * scripts/lib/gmPicksHarness.mjs with each sport's real rule set:
 *
 *   1. OFFERING MORE NEVER HURTS. Take a package the other club accepts and
 *      add the proposer's other assets ONE AT A TIME, up to the size limit.
 *      After every single addition the offer's value has not fallen and the
 *      verdict is never 'rejected'. A fifth of this league is paid past his
 *      worth (his raw value is below zero), and the walk must add such men,
 *      so the clamp that protects the rule is actually exercised. An
 *      addition can still be 'invalid' for a hard rule (the cap, a roster,
 *      a pick the league will not let move); those are counted and shown.
 *   2. THE LEAGUE'S RULES ARE DATA. An ordinary MLB pick never moves and the
 *      refusal names the rule; a competitive balance pick moves once and no
 *      more; no NBA club is ever left without a first in two drafts running
 *      however the desk trades, while the same desk under NFL and NHL rules
 *      does leave clubs that way; salary retention is walked step by step
 *      (share 0 to 1, deals carried 0 to 4, times retained 0 to 3); a
 *      prospect moves only where the rules say; and a shut window answers
 *      before anything else.
 *   3. THE WINDOW, EVERY PERIOD. For each sport's season length, walked
 *      period by period: open up to this harness's own deadline period and
 *      shut after it, counting down by one, and open at any point once the
 *      season has closed.
 *   4. BUYERS AND SELLERS. At the deadline every club in a playoff place
 *      buys, every seller's record is worse than every buyer's, a club
 *      walked from no wins to all wins goes seller, holding, buyer and
 *      never back, and a seller says yes to a pick for its veteran more
 *      often than a buyer does.
 *
 * BANDS, FROM MEASURED HEADROOM (seeds 11, 23, 37, 59, 71; 2026-10-02):
 *   The walk: 600 accepted packages a sport, 2,516 to 7,376 additions, of
 *   which 42 (NFL) to 74 (MLB) added a man worth less than nothing; the
 *   floor for those is 20. Additions stopped by a hard rule: NFL 472, NBA
 *   814, NHL 473, MLB 5,252 (MLB mostly its picks, step 3).
 *   MLB: 1,786 packages carried an ordinary pick and all 1,786 were refused
 *   by the pick rule; the floor for packages tried is 500.
 *   Firsts: the NBA desk was refused 5,611 times for two drafts running and
 *   left no club short (floor for refusals 100); the same desk left 67 NFL
 *   and 69 NHL clubs short (floor 10), which is what makes the NBA zero mean
 *   something.
 *   Sellers at the deadline, summed over the five seeds: NFL 37, NBA 9,
 *   NHL 44, MLB 31; the floors are about half (18, 4, 22, 15).
 *   A veteran's price (the cheapest pick taken for him, over his value),
 *   median: sellers 0.87 over 393 men, buyers 1.43 over 1,233, a ratio of
 *   1.64 where the weights alone give about 1.65. The floor is 1.2; a
 *   league where every club holds would read 1.0.
 *   A control exits 0 when the sections it should turn red went red and no
 *   other did, and 1 otherwise.
 *
 * Controls, through GM_TRADE_CONTROL. Each bundles a rewritten copy of one
 * module from OS temp and refuses to run when its line is not there.
 *   noclamp   a piece worth less than nothing counts against the offer
 *   mlbpicks  ordinary MLB picks made tradable
 *   stepien   the consecutive firsts rule switched off where it applies
 *   retain    the retained share allowed up to 90 percent
 *   noreopen  the window stays shut after the season closes
 *   sellers   a club far off the line is called a buyer
 *
 * Run: node scripts/simGmTradePackage.mjs
 */

import { bundleGm, makeRng, SPORTS, makeLeague, makeContext, clubAssets, pickSome, standings, playPeriod, rawPlayerValue } from './lib/gmPicksHarness.mjs';

const CONTROL = process.env.GM_TRADE_CONTROL || '';
const SWAPS = {
  noclamp: { pkg: [['  const sorted = values.map(v => Math.max(0, v)).sort((a, b) => b - a);', '  const sorted = values.map(v => v).sort((a, b) => b - a);']] },
  mlbpicks: { picks: [["  tradableKinds: ['cb'],", "  tradableKinds: ['std', 'cb'],"]] },
  stepien: { picks: [['  if (!rules.noTwoFirstlessYearsRunning) return null;', '  if (rules.noTwoFirstlessYearsRunning) return null;']] },
  retain: { pkg: [['  retention: { maxShare: 0.5, maxDealsPerClub: 3, maxTimesPerContract: 2 },', '  retention: { maxShare: 0.9, maxDealsPerClub: 3, maxTimesPerContract: 2 },']] },
  noreopen: { deadline: [['  if (seasonClosed) return { open: true, deadlineAfter: after, periodsLeft: after, reason: null };', '  if (seasonClosed && after < 0) return { open: true, deadlineAfter: after, periodsLeft: after, reason: null };']] },
  sellers: { deadline: [["      else if (z >= SELLER_Z) stance[r.id] = 'seller';", "      else if (z >= SELLER_Z) stance[r.id] = 'buyer';"]] },
};
const EXPECT = { noclamp: [1], mlbpicks: [2], stepien: [2], retain: [2], noreopen: [3], sellers: [4] };
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`GM_TRADE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
const SECTION_NAMES = {
  1: 'offering more never turns a yes into a no',
  2: 'the league rules are data, and each one bites',
  3: 'the window, walked period by period',
  4: 'buyers and sellers at the deadline',
};

const SEEDS = [11, 23, 37, 59, 71];
const gm = await bundleGm('gmtrade', CONTROL, SWAPS[CONTROL]);
if (CONTROL) console.log(`   control ${CONTROL}: running against a rewritten copy`);

let checks = 0;
const fails = [];
const bySection = new Map();
function ok(section, label, pass, detail = '') {
  checks++;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n++;
  if (!pass) { s.bad++; fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`); }
  bySection.set(section, s);
}
const notes = [];
const bySport = key => SPORTS.find(s => s.key === key);

/* ---- 1. the walk ---------------------------------------------------------- */
const WALKS_WANTED = 120;
for (const sport of SPORTS) {
  const rules = gm.pkg.GM_TRADE_RULES[sport.key];
  const tally = { walks: 0, steps: 0, rejected: 0, fell: 0, invalid: 0, badInvalid: 0, negativeAdds: 0, removals: 0, removalRejected: 0 };
  const invalidBy = {};
  for (const seed of SEEDS) {
    const lg = makeLeague(sport, gm, seed * 53 + 3);
    const worth = a => {
      if (a.kind !== 'player') return 1;
      for (const t of Object.values(lg.teams)) { const p = t.players.find(x => x.id === a.id); if (p) return rawPlayerValue(p); }
      return 1;
    };
    let walks = 0;
    for (let tries = 0; tries < 6000 && walks < WALKS_WANTED; tries++) {
      const [a, b] = pickSome(lg.rng, lg.ids, 2);
      const mine = clubAssets(lg, gm, a);
      const give = pickSome(lg.rng, mine, 1 + Math.floor(lg.rng() * 2));
      const get = pickSome(lg.rng, clubAssets(lg, gm, b), 1 + Math.floor(lg.rng() * 2));
      const ctx = makeContext(lg, gm, b, 1, false, null);
      let last = gm.pkg.evaluatePackage({ from: a, to: b, give, get }, ctx);
      if (last.verdict !== 'accepted') continue;
      walks++;
      const inDeal = new Set(give.map(gm.pkg.assetKey));
      const spare = pickSome(lg.rng, mine.filter(x => !inDeal.has(gm.pkg.assetKey(x))), mine.length);
      const pile = [...give];
      for (const extra of spare) {
        if (pile.length >= rules.maxAssetsPerSide) break;
        const v = gm.pkg.evaluatePackage({ from: a, to: b, give: [...pile, extra], get }, ctx);
        tally.steps++;
        if (v.verdict === 'invalid') {
          tally.invalid++;
          invalidBy[v.step] = (invalidBy[v.step] ?? 0) + 1;
          if (!(v.step >= 2 && v.step <= 4) || !v.reason) tally.badInvalid++;
          continue;
        }
        pile.push(extra);
        if (worth(extra) < 0) tally.negativeAdds++;
        if (v.verdict === 'rejected') tally.rejected++;
        if (v.offer < last.offer - 1e-9) tally.fell++;
        last = v;
      }
      /* and the other way: asking for less never turns a yes into a no */
      if (get.length > 1) {
        const v = gm.pkg.evaluatePackage({ from: a, to: b, give, get: get.slice(1) }, ctx);
        tally.removals++;
        if (v.verdict === 'rejected') tally.removalRejected++;
      }
    }
    tally.walks += walks;
  }
  ok(1, `${sport.key}: accepted packages were found to walk from`, tally.walks >= SEEDS.length * WALKS_WANTED * 0.5, `${tally.walks}`);
  ok(1, `${sport.key}: no addition turned a yes into a no`, tally.rejected === 0, `${tally.rejected} of ${tally.steps} steps`);
  ok(1, `${sport.key}: no addition lowered the offer`, tally.fell === 0, `${tally.fell} of ${tally.steps} steps`);
  ok(1, `${sport.key}: the walk added men worth less than nothing`, tally.negativeAdds >= 20, `${tally.negativeAdds}`);
  ok(1, `${sport.key}: every refused addition names a hard rule`, tally.badInvalid === 0, `${tally.badInvalid}`);
  ok(1, `${sport.key}: asking for less never turned a yes into a no`, tally.removals > 0 && tally.removalRejected === 0, `${tally.removalRejected} of ${tally.removals}`);
  notes.push(`walk ${sport.key}: ${tally.walks} packages, ${tally.steps} additions, ${tally.negativeAdds} of a man worth less than nothing, ${tally.invalid} stopped by a hard rule (${Object.entries(invalidBy).map(([k, n]) => `step ${k}: ${n}`).join(', ') || 'none'})`);
}

/* ---- 2. the league rules are data ----------------------------------------- */
const openClock = sport => ({ rules: gm.deadline.GM_DEADLINE_RULES[sport.key], periods: sport.periods, periodsPlayed: 1, seasonClosed: false });
const always = { valueOf: () => 10, capCheck: () => null, premium: 1 };
function plainCtx(sport, lg, extra = {}) {
  return {
    ledger: lg.ledger, pickRules: gm.picks.GM_PICK_RULES[sport.key], tradeRules: gm.pkg.GM_TRADE_RULES[sport.key],
    season: lg.season, clock: openClock(sport), ...always, ...extra,
  };
}
const firstMan = (lg, id) => ({ kind: 'player', id: lg.teams[id].players[0].id });

/* 2a. MLB picks. Every random package that carries an ordinary pick is refused at step 3. */
{
  const sport = bySport('mlb');
  let withPick = 0, refusedRight = 0;
  for (const seed of SEEDS) {
    const lg = makeLeague(sport, gm, seed * 17 + 1);
    for (let t = 0; t < 400; t++) {
      const [a, b] = pickSome(lg.rng, lg.ids, 2);
      const give = pickSome(lg.rng, clubAssets(lg, gm, a), 1 + Math.floor(lg.rng() * 3));
      const get = pickSome(lg.rng, clubAssets(lg, gm, b), 1);
      if (![...give, ...get].some(x => x.kind === 'pick')) continue;
      withPick++;
      const v = gm.pkg.evaluatePackage({ from: a, to: b, give, get }, plainCtx(sport, lg));
      if (v.verdict === 'invalid' && v.step === 3 && /competitive balance/.test(v.reason ?? '')) refusedRight++;
    }
  }
  ok(2, 'mlb: packages carrying an ordinary pick were tried', withPick >= 500, `${withPick}`);
  ok(2, 'mlb: every one is refused by the pick rule, by name', refusedRight === withPick, `${refusedRight} of ${withPick}`);
  notes.push(`mlb: ${withPick} packages with an ordinary pick, ${refusedRight} refused at the pick rule`);
  /* a competitive balance pick moves once, by the club awarded it, and no more */
  const lg = makeLeague(sport, gm, 5);
  lg.ledger = gm.picks.awardPick(lg.ledger, lg.season, 1, 'C01', 'cb');
  const cb = gm.picks.pickKey(lg.ledger.picks[lg.ledger.picks.length - 1]);
  const first = gm.pkg.proposePackage({ from: 'C01', to: 'C02', give: [{ kind: 'pick', key: cb }], get: [firstMan(lg, 'C02')] }, lg.teams.C01, lg.teams.C02, plainCtx(sport, lg));
  ok(2, 'mlb: a competitive balance pick can be traded by the club awarded it', first.verdict.verdict === 'accepted', first.verdict.reason ?? '');
  lg.ledger = first.ledger;
  ok(2, 'mlb: and it is now held by the other club', gm.picks.findPick(lg.ledger, cb)?.holder === 'C02');
  const again = gm.pkg.evaluatePackage({ from: 'C02', to: 'C03', give: [{ kind: 'pick', key: cb }], get: [firstMan(lg, 'C03')] }, plainCtx(sport, lg));
  ok(2, 'mlb: but it cannot move a second time', again.verdict === 'invalid' && again.step === 3 && /once already/.test(again.reason ?? ''), again.reason ?? again.verdict);
}

/* 2b. The consecutive firsts rule: a season of deals under each sport's rules. */
const firstless = {};
const stepienRefusals = {};
for (const sport of SPORTS) {
  const rules = gm.picks.GM_PICK_RULES[sport.key];
  let clubsLeftShort = 0, refusals = 0, deals = 0;
  for (const seed of SEEDS) {
    const lg = makeLeague(sport, gm, seed * 41 + 9);
    for (let t = 0; t < 2500; t++) {
      const [a, b] = pickSome(lg.rng, lg.ids, 2);
      const firsts = id => gm.picks.picksHeldBy(lg.ledger, id).filter(p => p.round === 1).map(p => ({ kind: 'pick', key: gm.picks.pickKey(p) }));
      /* a desk that reaches for first round picks: the trades this rule is about */
      const give = [...pickSome(lg.rng, firsts(a), 1 + Math.floor(lg.rng() * 2)), ...pickSome(lg.rng, clubAssets(lg, gm, a), 1)];
      const seen = new Set();
      const uniq = give.filter(x => !seen.has(gm.pkg.assetKey(x)) && seen.add(gm.pkg.assetKey(x)));
      const get = pickSome(lg.rng, lg.teams[b].players.map(p => ({ kind: 'player', id: p.id })), 1);
      const out = gm.pkg.proposePackage({ from: a, to: b, give: uniq, get }, lg.teams[a], lg.teams[b], makeContext(lg, gm, b, 1, false, null));
      if (/two drafts running/.test(out.verdict.reason ?? '')) refusals++;
      if (out.verdict.verdict !== 'accepted') continue;
      lg.ledger = out.ledger;
      deals++;
    }
    const years = gm.picks.ledgerYears(lg.season, rules);
    for (const id of lg.ids) {
      const has = y => lg.ledger.picks.some(p => p.holder === id && p.year === y && p.round === 1);
      for (let i = 0; i + 1 < years.length; i++) if (!has(years[i]) && !has(years[i + 1])) { clubsLeftShort++; break; }
    }
  }
  firstless[sport.key] = clubsLeftShort;
  stepienRefusals[sport.key] = refusals;
  notes.push(`firsts ${sport.key}: ${deals} deals, ${refusals} refused for two drafts running, ${clubsLeftShort} clubs left without a first two drafts running`);
}
ok(2, 'nba: no club is ever left without a first in two drafts running', firstless.nba === 0, `${firstless.nba} clubs`);
ok(2, 'nba: the rule refused deals, so the zero is earned', stepienRefusals.nba >= 100, `${stepienRefusals.nba}`);
for (const key of ['nfl', 'nhl']) {
  ok(2, `${key}: the same desk without the rule does leave clubs that way`, firstless[key] >= 10 && stepienRefusals[key] === 0, `${firstless[key]} clubs, ${stepienRefusals[key]} refusals`);
}

/* 2c. Retained salary, walked a step at a time. The limits here are this
   harness's own copy of the published rule (half, three deals, twice). */
{
  const nhl = bySport('nhl');
  const lg = makeLeague(nhl, gm, 9);
  const man = retain => ({ from: 'C01', to: 'C02', give: [{ ...firstMan(lg, 'C01'), retain }], get: [firstMan(lg, 'C02')] });
  for (let tenth = 0; tenth <= 10; tenth++) {
    const share = tenth / 10;
    const v = gm.pkg.evaluatePackage(man(share), plainCtx(nhl, lg));
    const allowed = share <= 0.5;
    ok(2, `nhl: keeping ${tenth * 10} percent of a salary is ${allowed ? 'allowed' : 'refused'}`,
      allowed ? v.verdict === 'accepted' : (v.verdict === 'invalid' && v.step === 3), `${v.verdict} ${v.reason ?? ''}`);
  }
  for (let carried = 0; carried <= 4; carried++) {
    const v = gm.pkg.evaluatePackage(man(0.25), plainCtx(nhl, lg, { retainedDeals: () => carried }));
    const allowed = carried + 1 <= 3;
    ok(2, `nhl: a club carrying ${carried} retained deals ${allowed ? 'can' : 'cannot'} take on another`,
      allowed ? v.verdict === 'accepted' : (v.verdict === 'invalid' && v.step === 3), `${v.verdict} ${v.reason ?? ''}`);
  }
  for (let times = 0; times <= 3; times++) {
    const v = gm.pkg.evaluatePackage(man(0.25), plainCtx(nhl, lg, { timesRetained: () => times }));
    const allowed = times < 2;
    ok(2, `nhl: a contract retained on ${times} times ${allowed ? 'can' : 'cannot'} be retained on again`,
      allowed ? v.verdict === 'accepted' : (v.verdict === 'invalid' && v.step === 3), `${v.verdict} ${v.reason ?? ''}`);
  }
  for (const key of ['nfl', 'nba', 'mlb']) {
    const sport = bySport(key);
    const lg2 = makeLeague(sport, gm, 9);
    const pkg = { from: 'C01', to: 'C02', give: [{ ...firstMan(lg2, 'C01'), retain: 0.25 }], get: [firstMan(lg2, 'C02')] };
    const v = gm.pkg.evaluatePackage(pkg, plainCtx(sport, lg2));
    ok(2, `${key}: salary cannot be retained, and the rule says so`, v.verdict === 'invalid' && v.step === 3 && /retained/.test(v.reason ?? ''), `${v.verdict} ${v.reason ?? ''}`);
  }
  const split = gm.pkg.splitRetained(8, 0.5);
  ok(2, 'a salary of 8 retained at half splits 4 and 4', split.kept === 4 && split.moved === 4, JSON.stringify(split));
}

/* 2d. Prospects, the shape of a deal, and which check answers first. */
for (const sport of SPORTS) {
  const lg = makeLeague(sport, gm, 13);
  const kid = { kind: 'prospect', id: lg.teams.C01.prospects[0].id };
  const v = gm.pkg.proposePackage({ from: 'C01', to: 'C02', give: [kid], get: [firstMan(lg, 'C02')] }, lg.teams.C01, lg.teams.C02, plainCtx(sport, lg));
  const allowed = sport.key === 'mlb';
  ok(2, `${sport.key}: a prospect ${allowed ? 'can' : 'cannot'} be part of a deal`,
    allowed ? (v.verdict.verdict === 'accepted' && lg.teams.C02.prospects.some(p => p.id === kid.id) && !lg.teams.C01.prospects.some(p => p.id === kid.id))
      : (v.verdict.verdict === 'invalid' && v.verdict.step === 3), `${v.verdict.verdict} ${v.verdict.reason ?? ''}`);
  const lg3 = makeLeague(sport, gm, 14);
  const a = firstMan(lg3, 'C01');
  const b = firstMan(lg3, 'C02');
  const six = lg3.teams.C01.players.slice(0, 6).map(p => ({ kind: 'player', id: p.id }));
  const ctx = plainCtx(sport, lg3);
  const shape = [
    ['nothing coming back', { from: 'C01', to: 'C02', give: [a], get: [] }],
    ['nothing going out', { from: 'C01', to: 'C02', give: [], get: [b] }],
    ['the same man twice', { from: 'C01', to: 'C02', give: [a, a], get: [b] }],
    ['six pieces on a side', { from: 'C01', to: 'C02', give: six, get: [b] }],
    ['a club trading with itself', { from: 'C01', to: 'C01', give: [a], get: [b] }],
  ];
  for (const [what, pkg] of shape) {
    const r = gm.pkg.evaluatePackage(pkg, ctx);
    ok(2, `${sport.key}: ${what} is refused as a shape`, r.verdict === 'invalid' && r.step === 2, `${r.verdict} step ${r.step}`);
  }
  const shut = { ...ctx, clock: { ...ctx.clock, periodsPlayed: sport.periods }, capCheck: () => 'no money' };
  const r = gm.pkg.evaluatePackage({ from: 'C01', to: 'C01', give: [a, a], get: [] }, shut);
  ok(2, `${sport.key}: a shut window answers before anything else is looked at`, r.verdict === 'invalid' && r.step === 1, `step ${r.step}`);
  const money = gm.pkg.evaluatePackage({ from: 'C01', to: 'C02', give: [a], get: [b] }, { ...ctx, capCheck: () => 'no money' });
  ok(2, `${sport.key}: the engine's money check is asked, and its words come back`, money.verdict === 'invalid' && money.step === 4 && money.reason === 'no money');
  const low = gm.pkg.evaluatePackage({ from: 'C01', to: 'C02', give: [a], get: [b] }, { ...ctx, premium: 1.5 });
  ok(2, `${sport.key}: an offer short of the ask is rejected, with how far short`, low.verdict === 'rejected' && low.step === 5 && Math.abs(low.short - 5) < 1e-9, `${low.verdict} short ${low.short}`);
}

/* ---- 3. the window, every period ------------------------------------------ */
for (const sport of SPORTS) {
  const rules = gm.deadline.GM_DEADLINE_RULES[sport.key];
  ok(3, `${sport.key}: the deadline falls after period ${sport.deadlineAfter} of ${sport.periods}`, gm.deadline.deadlinePeriod(rules, sport.periods) === sport.deadlineAfter,
    `${gm.deadline.deadlinePeriod(rules, sport.periods)}`);
  let wrongOpen = 0, wrongLeft = 0, wrongClosedSeason = 0, wrongReason = 0;
  for (let played = 0; played <= sport.periods; played++) {
    const w = gm.deadline.tradeWindow(rules, sport.periods, played, false);
    const shouldOpen = played <= sport.deadlineAfter;
    if (w.open !== shouldOpen) wrongOpen++;
    if (shouldOpen && w.periodsLeft !== sport.deadlineAfter - played) wrongLeft++;
    if ((w.reason === null) !== shouldOpen) wrongReason++;
    if ((gm.deadline.deadlineRefusal(rules, sport.periods, played, false) === null) !== shouldOpen) wrongReason++;
    if (!gm.deadline.tradeWindow(rules, sport.periods, played, true).open) wrongClosedSeason++;
  }
  ok(3, `${sport.key}: open through the deadline period and shut at every period after`, wrongOpen === 0, `${wrongOpen} periods wrong`);
  ok(3, `${sport.key}: the count of periods left falls by one a period`, wrongLeft === 0, `${wrongLeft}`);
  ok(3, `${sport.key}: a refusal is given exactly when the window is shut`, wrongReason === 0, `${wrongReason}`);
  ok(3, `${sport.key}: open at every point once the season has closed`, wrongClosedSeason === 0, `${wrongClosedSeason} periods shut`);
  for (const periods of [10, 16, 18, 30, 40]) {
    const at = gm.deadline.deadlinePeriod(rules, periods);
    ok(3, `${sport.key}: a ${periods} period season still has a window and a stretch run`, at >= 1 && at <= periods - 1, `${at}`);
  }
}

/* ---- 4. buyers and sellers ------------------------------------------------ */
const PRICE_RATIO_FLOOR = 1.2;
const shareOf = r => (r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : 0.5);
const sellerCounts = {};
/* The price of a veteran: the least valuable pick of the proposer's that the
   club takes for him, over the veteran's own value. A seller should let him
   go cheaper than a buyer, from the same desk, the buyer being the baseline. */
const prices = { seller: [], buyer: [] };
for (const sport of SPORTS) {
  for (const seed of SEEDS) {
    const lg = makeLeague(sport, gm, seed * 61 + 5);
    for (let p = 1; p <= sport.deadlineAfter; p++) playPeriod(lg);
    const rows = standings(lg);
    const { stance } = gm.deadline.deadlineStances(rows, sport.spots);
    const ranked = [...rows].sort((x, y) => shareOf(y) - shareOf(x) || x.id.localeCompare(y.id));
    const inPlace = ranked.slice(0, sport.spots).filter(r => stance[r.id] !== 'buyer').length;
    ok(4, `${sport.key} seed ${seed}: every club in a playoff place buys`, inPlace === 0, `${inPlace} do not`);
    const sellers = rows.filter(r => stance[r.id] === 'seller');
    const buyers = rows.filter(r => stance[r.id] === 'buyer');
    const worstBuyer = Math.min(...buyers.map(shareOf));
    const bestSeller = Math.max(-1, ...sellers.map(shareOf));
    ok(4, `${sport.key} seed ${seed}: every seller's record is worse than every buyer's`, bestSeller < worstBuyer, `${bestSeller} vs ${worstBuyer}`);
    (sellerCounts[sport.key] ??= []).push(sellers.length);
    /* a pick for a veteran, offered to each seller and each buyer */
    if (!gm.picks.GM_PICK_RULES[sport.key].tradableKinds.includes('std')) continue;
    const plain = makeContext(lg, gm, 'C01', sport.deadlineAfter, false, null);
    for (const r of [...sellers, ...buyers]) {
      const ctx = { ...makeContext(lg, gm, r.id, sport.deadlineAfter, false, stance), capCheck: () => null };
      for (const vet of lg.teams[r.id].players.filter(x => x.age >= 29 && rawPlayerValue(x) > 0)) {
        const from = lg.ids.find(id => id !== r.id);
        const offers = gm.picks.picksHeldBy(lg.ledger, from)
          .map(p => ({ kind: 'pick', key: gm.picks.pickKey(p) }))
          .sort((x, y) => plain.valueOf(x) - plain.valueOf(y));
        const taken = offers.find(o => gm.pkg.evaluatePackage({ from, to: r.id, give: [o], get: [{ kind: 'player', id: vet.id }] }, ctx).verdict === 'accepted');
        if (taken) prices[stance[r.id]].push(plain.valueOf(taken) / rawPlayerValue(vet));
      }
    }
  }
}
for (const [key, counts] of Object.entries(sellerCounts)) notes.push(`sellers at the deadline, ${key}: ${counts.join(', ')} of ${bySport(key).clubs}`);
const median = xs => { const s2 = [...xs].sort((a, b) => a - b); return s2.length ? s2[Math.floor(s2.length / 2)] : NaN; };
const priceRatio = median(prices.buyer) / median(prices.seller);
notes.push(`a veteran's price in picks over his value, median: sellers ${median(prices.seller).toFixed(2)} (${prices.seller.length} men), buyers ${median(prices.buyer).toFixed(2)} (${prices.buyer.length} men), buyers pay ${priceRatio.toFixed(2)} times what sellers ask`);
ok(4, 'sellers and buyers both priced enough veterans', prices.seller.length >= 100 && prices.buyer.length >= 100, `${prices.seller.length} and ${prices.buyer.length}`);
ok(4, 'a seller lets a veteran go for less than a buyer does', priceRatio >= PRICE_RATIO_FLOOR, priceRatio.toFixed(2));
const SELLER_FLOORS = { nfl: 18, nba: 4, nhl: 22, mlb: 15 };
for (const [key, counts] of Object.entries(sellerCounts)) {
  const sum = counts.reduce((a, b) => a + b, 0);
  ok(4, `${key}: clubs far off the line sell, ${sum} over the seeds`, sum >= SELLER_FLOORS[key], `${sum}`);
}

/* the ladder: one club walked from no wins to every win against a fixed league */
{
  const G = 40;
  const league = Array.from({ length: 15 }, (_, i) => ({ id: `F${i}`, wins: 8 + 2 * i, losses: G - 8 - 2 * i }));
  const rank = { seller: 0, holding: 1, buyer: 2 };
  let back = 0, seen = new Set();
  let prev = -1;
  for (let w = 0; w <= G; w++) {
    const { stance } = gm.deadline.deadlineStances([...league, { id: 'X', wins: w, losses: G - w }], 8);
    const now = rank[stance.X];
    seen.add(stance.X);
    if (now < prev) back++;
    prev = now;
  }
  ok(4, 'a club walked from no wins to all wins never steps back', back === 0, `${back} steps back`);
  ok(4, 'and passes through seller, holding and buyer', seen.size === 3, [...seen].join(', '));
  const fresh = gm.deadline.deadlineStances(league.map(r => ({ ...r, wins: 0, losses: 0 })), 8).stance;
  ok(4, 'before a game is played everybody holds', Object.values(fresh).every(s => s === 'holding'));
  const w = gm.deadline.STANCE_WEIGHTS;
  ok(4, 'a seller values a pick above a buyer, a buyer a veteran above a seller', w.seller.pick > w.buyer.pick && w.buyer.veteran > w.seller.veteran);
  ok(4, 'every weight is above zero', Object.values(w).every(x => x.pick > 0 && x.young > 0 && x.veteran > 0));
}

/* ---- report --------------------------------------------------------------- */
if (checks === 0) { console.error('FAIL: NOTHING WAS CHECKED'); process.exit(1); }
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} checks${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
for (const n of notes) console.log(`   measured: ${n}`);
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT[CONTROL];
  for (const f of fails.slice(0, 5)) console.log('   red: ' + f);
  if (red.join(',') === want.join(',')) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red as expected (${fails.length} failures) and nothing else moved, the check works`);
    process.exit(0);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red, got ${red.length ? red.join(' and ') : 'nothing'}, so the check is dead somewhere or bleeds`);
  process.exit(1);
}
if (fails.length) {
  console.error(`simGmTradePackage: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simGmTradePackage: ${checks} checks passed over ${SPORTS.length} leagues and ${SEEDS.length} seeds. Offering more never turns a yes into a no, every league rule is data and bites, the window shuts on the deadline and opens at the close, and sellers sell.`);
