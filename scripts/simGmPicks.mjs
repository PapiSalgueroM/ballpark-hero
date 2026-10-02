/* Round 909: the pick ledger, the draft order and the deadline, measured.
 *
 * src/lib/gmPicks.ts gives the four Front Office sims a pick ledger (year,
 * round, first owner, holder) in place of a bare number[] reset every summer,
 * and src/lib/gmDeadline.ts gives them a trade deadline. This harness runs the
 * real modules, bundled, and checks what they promise:
 *
 *   1. THE TABLES. Each lottery table is the published one, typed out again
 *      here from the league's page, sums to 100, and has a number per club.
 *   2. THE DRAWS. Over DRAWS simulated lotteries per seed, each club's share
 *      of first picks sits inside a sampling band of the published odds, a
 *      capped climb never passes its cap, and the NBA's worst club never
 *      picks lower than fifth.
 *   3. MIGRATION. An old save's number[], after any number of old style
 *      trades, becomes a ledger with every marker kept, club by club and
 *      round by round, and the result reads back as a valid block.
 *   4. CONSERVATION. Ten seasons of random trades, a draft and a roll every
 *      summer: after every single trade and every roll each club's pick in
 *      each round of each year carried exists exactly once, every draft slot
 *      is used once by its holder, and no player is lost or doubled.
 *   5. THE DEADLINE. In those same ten seasons the desk keeps proposing after
 *      the deadline, and not one deal is made between the deadline period and
 *      the season's close. The period it shuts after is this harness's own
 *      number (scripts/lib/gmPicksHarness.mjs SPORTS), not the module's.
 *
 * BANDS, FROM MEASURED HEADROOM (seeds 11, 23, 37, 59, 71; 2026-10-02):
 *   Lottery: 275 club shares over 40,000 draws each. Their distance from the
 *   published chance, in standard errors: median 0.64, 95th percentile 1.79.
 *   The band is 4.5, so a healthy module sits far inside it, and the
 *   flatlottery control lands dozens of standard errors outside.
 *   Ten seasons, smallest to largest of the five seeds:
 *     deals made       NFL 411 to 466, NBA 357 to 421, NHL 577 to 650, MLB 69 to 90
 *     picks moved      NFL 945 to 1045, NBA 645 to 771, NHL 1357 to 1483, MLB 0
 *     offseason deals  NFL 109 to 129, NBA 68 to 88, NHL 103 to 133, MLB 9 to 23
 *   The floors are about half the smallest of each. Tries after the deadline
 *   are not a band: they are counted exactly (periods left x tries x seasons).
 *   A control exits 0 when the sections it should turn red went red and no
 *   other did, and 1 otherwise.
 *
 * Controls, through GM_PICKS_CONTROL. None touches src: each bundles a
 * rewritten copy of one module from OS temp, and refuses to run when the line
 * it means to change is not there.
 *   odds        the NBA table's first two numbers swapped for 16 and 12
 *   flatlottery every club in the pool given the same chance
 *   noclimbcap  the cap on a lottery winner's climb removed
 *   dropmarker  migration forgets a club's second extra marker in a round
 *   leak        the summer roll drops every traded first round pick
 *   latetrade   the window stays open one period past the deadline
 *
 * Run: node scripts/simGmPicks.mjs
 */

import { bundleGm, makeRng, SPORTS, makeLeague, makeContext, clubAssets, pickSome, standings, playPeriod } from './lib/gmPicksHarness.mjs';

const CONTROL = process.env.GM_PICKS_CONTROL || '';
const SWAPS = {
  odds: { picks: [['    odds: [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5],', '    odds: [16.0, 12.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5],']] },
  flatlottery: { picks: [['  const weight = pool.map((_, i) => (i < rules.odds.length ? rules.odds[i] : 0));', '  const weight = pool.map((_, i) => (i < rules.odds.length ? 1 : 0));']] },
  noclimbcap: { picks: [['    if (rules.maxClimb !== null && seed + 1 - slot > rules.maxClimb) slot = seed + 1 - rules.maxClimb;', '    if (rules.maxClimb === undefined) slot = seed + 1 - rules.maxClimb;']] },
  dropmarker: { picks: [['      for (let k = 1; k < c; k++) extras.push(id);', '      for (let k = 2; k < c; k++) extras.push(id);']] },
  leak: { picks: [['  const picks = ledger.picks.filter(p => p.year > closedSeason);', '  const picks = ledger.picks.filter(p => p.year > closedSeason && !(p.round === 1 && p.holder !== p.orig));']] },
  latetrade: { deadline: [['  if (periodsPlayed <= after) {', '  if (periodsPlayed <= after + 1) {']] },
};
const EXPECT = {
  odds: [1, 2], flatlottery: [2], noclimbcap: [2], dropmarker: [3], leak: [4], latetrade: [5],
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`GM_PICKS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
const SECTION_NAMES = {
  1: 'the lottery tables are the published ones',
  2: 'the draws sit inside sampling bands of the published odds',
  3: 'an old number[] save migrates with every pick kept',
  4: 'picks and players conserved through ten seasons of trades',
  5: 'no deal between the deadline and the season close',
};

const SEEDS = [11, 23, 37, 59, 71];
const gm = await bundleGm('gmpicks', CONTROL, SWAPS[CONTROL]);
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
const MEASURED = {};

/* ---- 1. the tables -------------------------------------------------------- */
/* Typed again from the league pages (read 2026-10-02), on purpose a second
   copy: nba.com/news/nba-draft-lottery-explainer with
   si.com/nba/how-does-the-nba-draft-lottery-work-explained-odds, and
   nhl.com/news/2026-nhl-draft-lottery-set-for-may-5 with
   sports.yahoo.com/articles/does-nhl-draft-lottery-explaining-111217430.html */
const PUBLISHED = {
  nba: { clubs: 14, draws: 4, maxClimb: null, odds: [14, 14, 14, 12.5, 10.5, 9, 7.5, 6, 4.5, 3, 2, 1.5, 1, 0.5] },
  nhl: { clubs: 16, draws: 2, maxClimb: 10, odds: [18.5, 13.5, 11.5, 9.5, 8.5, 7.5, 6.5, 6, 5, 3.5, 3, 2.5, 2, 1.5, 0.5, 0.5] },
};
for (const [key, pub] of Object.entries(PUBLISHED)) {
  const lot = gm.picks.GM_PICK_RULES[key].lottery;
  ok(1, `${key} has a lottery`, !!lot);
  if (!lot) continue;
  ok(1, `${key} clubs, draws and climb cap`, lot.clubs === pub.clubs && lot.draws === pub.draws && lot.maxClimb === pub.maxClimb,
    `${lot.clubs}/${lot.draws}/${lot.maxClimb}`);
  ok(1, `${key} table is the published one`, JSON.stringify(lot.odds) === JSON.stringify(pub.odds), JSON.stringify(lot.odds));
  ok(1, `${key} table sums to 100`, Math.abs(lot.odds.reduce((a, b) => a + b, 0) - 100) < 1e-9);
}
for (const key of ['nfl', 'mlb']) ok(1, `${key} draws no lottery here`, gm.picks.GM_PICK_RULES[key].lottery === null);

/* ---- 2. the draws --------------------------------------------------------- */
const DRAWS = 40000;
/* A club's share of first picks over DRAWS lotteries wobbles around its true
   chance by one standard error, sqrt(p(1-p)/DRAWS). Each club is held to
   Z_BAND of those. See MEASURED for how far the real modules sit inside it. */
const Z_BAND = 4.5;
function firstPickChance(pub) {
  /* a club that cannot climb to first hands its win to the worst club */
  return pub.odds.map((o, i) => {
    if (pub.maxClimb === null) return o;
    if (i === 0) return o + pub.odds.reduce((s, x, j) => s + (j > pub.maxClimb ? x : 0), 0);
    return i > pub.maxClimb ? 0 : o;
  });
}
const zSeen = [];
for (const [key, pub] of Object.entries(PUBLISHED)) {
  const lot = gm.picks.GM_PICK_RULES[key].lottery;
  if (!lot) continue;
  const pool = Array.from({ length: pub.clubs }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
  const expectFirst = firstPickChance(pub);
  for (const seed of SEEDS) {
    const rng = makeRng(seed * 7919 + pub.clubs);
    const first = new Array(pub.clubs).fill(0);
    const draw1 = new Array(pub.clubs).fill(0);
    let climbedTooFar = 0, notAShuffle = 0, worstTooLow = 0, wrongDraws = 0, restMoved = 0;
    for (let d = 0; d < DRAWS; d++) {
      const r = gm.picks.runLottery(pool, lot, rng);
      first[pool.indexOf(r.order[0])]++;
      if (r.wins.length !== pub.draws) wrongDraws++;
      if (r.wins.length) draw1[r.wins[0].seed - 1]++;
      if (new Set(r.order).size !== pool.length || r.order.length !== pool.length) notAShuffle++;
      for (let i = 0; i < r.order.length; i++) {
        const climb = pool.indexOf(r.order[i]) - i;
        if (pub.maxClimb !== null && climb > pub.maxClimb) climbedTooFar++;
      }
      if (pub.maxClimb === null && r.order.indexOf(pool[0]) > pub.draws) worstTooLow++;
      const winners = new Set(r.wins.map(w => w.club));
      const rest = r.order.filter(c => !winners.has(c));
      if (rest.join() !== pool.filter(c => !winners.has(c)).join()) restMoved++;
    }
    ok(2, `${key} seed ${seed}: every draw is a reshuffle of the pool`, notAShuffle === 0, `${notAShuffle}`);
    ok(2, `${key} seed ${seed}: ${pub.draws} draws every time`, wrongDraws === 0, `${wrongDraws}`);
    ok(2, `${key} seed ${seed}: no club climbs past the cap`, climbedTooFar === 0, `${climbedTooFar}`);
    ok(2, `${key} seed ${seed}: the worst club picks no lower than slot ${pub.draws + 1}`, worstTooLow === 0, `${worstTooLow}`);
    ok(2, `${key} seed ${seed}: clubs that did not win keep their order`, restMoved === 0, `${restMoved}`);
    for (let i = 0; i < pub.clubs; i++) {
      for (const [what, got, p] of [['picks first', first[i], expectFirst[i] / 100], ['wins draw one', draw1[i], pub.odds[i] / 100]]) {
        if (p === 0) { ok(2, `${key} seed ${seed}: club ${i + 1} never ${what}`, got === 0, `${got}`); continue; }
        const z = (got / DRAWS - p) / Math.sqrt(p * (1 - p) / DRAWS);
        zSeen.push(Math.abs(z));
        ok(2, `${key} seed ${seed}: club ${i + 1} ${what} at ${(p * 100).toFixed(1)} percent`, Math.abs(z) <= Z_BAND,
          `${(got / DRAWS * 100).toFixed(2)} percent, z ${z.toFixed(2)}`);
      }
    }
  }
}
zSeen.sort((a, b) => a - b);
MEASURED.lotteryZ = { n: zSeen.length, median: zSeen[Math.floor(zSeen.length / 2)], p95: zSeen[Math.floor(zSeen.length * 0.95)] };

/* ---- 3. migration --------------------------------------------------------- */
/* The old engines, replayed: every club starts on the list its engine dealt,
   and a trade pops the giver's last marker onto the taker (the NFL sim sorts
   the taker's list, the other three do not). */
const LEGACY = { nfl: [1, 2, 3], nba: [1, 2], nhl: [1, 2], mlb: [1, 2] };
let migratedExtras = 0;
for (const sport of SPORTS) {
  const rules = gm.picks.GM_PICK_RULES[sport.key];
  for (const seed of SEEDS) {
    const rng = makeRng(seed * 104729 + sport.clubs);
    const ids = Array.from({ length: sport.clubs }, (_, i) => `C${String(i + 1).padStart(2, '0')}`);
    const teams = {};
    for (const id of ids) teams[id] = { picks: [...LEGACY[sport.key]] };
    const trades = 10 + Math.floor(rng() * 60);
    for (let t = 0; t < trades; t++) {
      const [a, b] = pickSome(rng, ids, 2);
      if (!teams[a].picks.length) continue;
      teams[b].picks.push(teams[a].picks.pop());
      if (sport.key === 'nfl') teams[b].picks.sort();
    }
    const before = JSON.stringify(teams);
    const m = gm.picks.migrateLegacyPicks(teams, 2026, rules);
    const total = ids.reduce((s, id) => s + teams[id].picks.length, 0);
    ok(3, `${sport.key} seed ${seed}: every marker is a pick`, m.markers === total && m.ignored === 0, `${m.markers} of ${total}`);
    let wrong = 0;
    for (const id of ids) {
      for (let round = 1; round <= LEGACY[sport.key].length; round++) {
        const had = teams[id].picks.filter(r => r === round).length;
        const has = m.ledger.picks.filter(p => p.holder === id && p.year === 2026 && p.round === round).length;
        if (had !== has) wrong++;
        if (had > 1) migratedExtras += had - 1;
      }
    }
    ok(3, `${sport.key} seed ${seed}: club by club and round by round`, wrong === 0, `${wrong} cells differ`);
    ok(3, `${sport.key} seed ${seed}: the old save is left as it was`, JSON.stringify(teams) === before);
    const keys = m.ledger.picks.map(gm.picks.pickKey);
    ok(3, `${sport.key} seed ${seed}: no pick twice`, new Set(keys).size === keys.length);
    ok(3, `${sport.key} seed ${seed}: reads back as a valid block`, gm.picks.validateLedger(JSON.parse(JSON.stringify(m.ledger)), ids) !== null);
    const census = gm.picks.ledgerCensus(m.ledger);
    const later = Object.entries(census).filter(([y]) => Number(y) > 2026);
    ok(3, `${sport.key} seed ${seed}: later years start whole`, later.length === rules.ledgerYears - 1 && later.every(([, n]) => n === sport.clubs * rules.rounds));
    ok(3, `${sport.key} seed ${seed}: this year holds the markers plus the rounds the old sim never dealt`,
      census[2026] === total + sport.clubs * (rules.rounds - LEGACY[sport.key].length), `${census[2026]}`);
  }
}
ok(3, 'the replayed saves carry clubs holding two of a round', migratedExtras > 0, `${migratedExtras}`);
MEASURED.migratedExtras = migratedExtras;

/* ---- 4 and 5. ten seasons of trades, a draft and a roll every summer ------ */
const SEASONS = 10;
const TRIES_PER_PERIOD = 12;
const TRIES_OFFSEASON = 40;
/* Floors, so a section cannot pass by doing nothing. Each is about half the
   SMALLEST count measured over the five seeds (the header lists them). MLB
   makes far fewer deals because most of what a random desk reaches for there
   is a pick, and no ordinary MLB pick can move. */
const FLOORS = {
  nfl: { deals: 200, picksMoved: 470, offDeals: 55 },
  nba: { deals: 180, picksMoved: 320, offDeals: 34 },
  nhl: { deals: 280, picksMoved: 680, offDeals: 50 },
  mlb: { deals: 35, picksMoved: 0, offDeals: 4 },
};
MEASURED.trades = {};
for (const sport of SPORTS) {
  const rules = gm.picks.GM_PICK_RULES[sport.key];
  for (const seed of SEEDS) {
    const lg = makeLeague(sport, gm, seed * 31 + 7);
    const players0 = lg.ids.reduce((s, id) => s + lg.teams[id].players.length + lg.teams[id].prospects.length, 0);
    const st = { tries: 0, deals: 0, picksMoved: 0, lateTries: 0, lateDeals: 0, offDeals: 0, openDeals: 0, problems: 0, slotsWrong: 0, wrongHolder: 0 };
    const tryTrade = (played, closed, stances) => {
      const [a, b] = pickSome(lg.rng, lg.ids, 2);
      const give = pickSome(lg.rng, clubAssets(lg, gm, a), 1 + Math.floor(lg.rng() * 3));
      const get = pickSome(lg.rng, clubAssets(lg, gm, b), 1 + Math.floor(lg.rng() * 2));
      const pkg = { from: a, to: b, give, get };
      const late = !closed && played > sport.deadlineAfter;
      st.tries++;
      if (late) st.lateTries++;
      const out = gm.pkg.proposePackage(pkg, lg.teams[a], lg.teams[b], makeContext(lg, gm, b, played, closed, stances));
      if (out.verdict.verdict !== 'accepted') return;
      lg.ledger = out.ledger;
      st.deals++;
      if (late) st.lateDeals++;
      else if (closed) st.offDeals++;
      else st.openDeals++;
      st.picksMoved += [...give, ...get].filter(x => x.kind === 'pick').length;
      st.problems += gm.picks.ledgerProblems(lg.ledger, lg.ids, lg.season, rules).length;
    };
    for (let s = 0; s < SEASONS; s++) {
      for (let period = 1; period <= sport.periods; period++) {
        playPeriod(lg);
        const stances = gm.deadline.deadlineStances(standings(lg), sport.spots).stance;
        for (let k = 0; k < TRIES_PER_PERIOD; k++) tryTrade(period, false, stances);
      }
      /* the season is over: the desk opens again before the draft */
      for (let k = 0; k < TRIES_OFFSEASON; k++) tryTrade(sport.periods, true, null);
      const worstFirst = gm.picks.reverseStandings(standings(lg));
      const missed = worstFirst.slice(0, sport.clubs - sport.spots);
      const order = gm.picks.draftOrder(missed, worstFirst.slice(sport.clubs - sport.spots), rules, lg.rng);
      const used = new Set();
      let slots = 0;
      for (let round = 1; round <= rules.rounds; round++) {
        for (const s2 of gm.picks.roundSlots(lg.ledger, lg.season, round, round === 1 ? order.firstRound : order.laterRounds)) {
          slots++;
          used.add(gm.picks.pickKey(s2.pick));
          if (!lg.teams[s2.pick.holder]) st.wrongHolder++;
        }
      }
      if (slots !== sport.clubs * rules.rounds || used.size !== slots) st.slotsWrong++;
      lg.ledger = gm.picks.rollLedger(lg.ledger, lg.ids, lg.season, rules);
      lg.season++;
      st.problems += gm.picks.ledgerProblems(lg.ledger, lg.ids, lg.season, rules).length;
      for (const id of lg.ids) { lg.teams[id].wins = 0; lg.teams[id].losses = 0; }
    }
    const everyone = lg.ids.flatMap(id => [...lg.teams[id].players, ...lg.teams[id].prospects].map(p => p.id));
    const tag = `${sport.key} seed ${seed}`;
    ok(4, `${tag}: every pick exists exactly once after every deal and every roll`, st.problems === 0, `${st.problems} problems`);
    ok(4, `${tag}: every draft used clubs x rounds slots, each once`, st.slotsWrong === 0 && st.wrongHolder === 0, `${st.slotsWrong} drafts off`);
    ok(4, `${tag}: no player lost or doubled`, everyone.length === players0 && new Set(everyone).size === players0, `${everyone.length} of ${players0}`);
    ok(4, `${tag}: the desk made deals`, st.deals >= FLOORS[sport.key].deals, `${st.deals}`);
    if (rules.tradableKinds.includes('std')) ok(4, `${tag}: picks changed hands`, st.picksMoved >= FLOORS[sport.key].picksMoved, `${st.picksMoved}`);
    else ok(4, `${tag}: no ordinary pick can move, and none did`, st.picksMoved === 0, `${st.picksMoved}`);
    ok(5, `${tag}: the desk kept asking after the deadline, every period of the run in`, st.lateTries === (sport.periods - sport.deadlineAfter) * TRIES_PER_PERIOD * SEASONS, `${st.lateTries}`);
    ok(5, `${tag}: no deal between the deadline and the season close`, st.lateDeals === 0, `${st.lateDeals} late deals`);
    ok(5, `${tag}: deals were made while the window was open`, st.openDeals > 0, `${st.openDeals}`);
    ok(5, `${tag}: and again once the season closed`, st.offDeals >= FLOORS[sport.key].offDeals, `${st.offDeals}`);
    (MEASURED.trades[sport.key] ??= []).push(`${st.deals}/${st.picksMoved}/${st.lateTries}/${st.offDeals}`);
  }
}

/* ---- report --------------------------------------------------------------- */
if (checks === 0) { console.error('FAIL: NOTHING WAS CHECKED'); process.exit(1); }
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} checks${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
console.log(`   measured: lottery |z| over ${MEASURED.lotteryZ.n} club shares, median ${MEASURED.lotteryZ.median.toFixed(2)}, 95th percentile ${MEASURED.lotteryZ.p95.toFixed(2)} (band ${Z_BAND})`);
for (const [k, v] of Object.entries(MEASURED.trades)) console.log(`   measured: ${k} deals/picks moved/late tries/offseason deals per seed: ${v.join('  ')}`);
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
  console.error(`simGmPicks: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simGmPicks: ${checks} checks passed over ${SPORTS.length} leagues, ${SEEDS.length} seeds and ${SEASONS} seasons each. The lottery tables are the published ones and the draws sit inside their bands, an old save keeps every pick, picks are conserved through every deal and every summer, and nothing is traded after the deadline.`);
