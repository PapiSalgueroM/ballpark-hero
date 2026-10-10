/* Round 1222: the draft you earn, the shared lift, measured.
 *
 * src/lib/gmDraftOrder.ts, gmDraftNight.ts and gmLotteryNight.ts give the
 * front offices the order a league would really hand a club: reverse
 * standings, the league's lottery drawn once and saved, every later round by
 * the league's own rule, and a draft night played through a small host. No
 * board imports them yet. This harness runs the real modules, bundled, and
 * holds what they promise. The header's numbers are in MEASURED, below.
 *
 *   1. THE LEDGER. Every fact in a rule set has a twin in
 *      scripts/data/gmDraftOrderSources.json with two reads on two different
 *      publishers, neither a wiki; a thin fact is marked; no address ships in
 *      src; the spans a sport plays are contiguous from the game's first
 *      draft; the rule set is read against the table the pick rules carry.
 *   2. THE DRAW ADDS NOTHING. The saved lottery equals runLottery run by hand
 *      on the same keyed stream, exactly; a build opens one lottery stream
 *      and draws one number a drawn pick; every later look draws nothing and
 *      Math.random is never called; each club's share of first picks sits
 *      inside a sampling band of the table.
 *   3. LEVEL RECORDS. Level lottery clubs split whole combinations; a tie
 *      drawing is fair; and all three cases of a later round hold: level
 *      outside the field, level inside it (read after the lottery) and level
 *      across the line.
 *   4. THE ORDER. Every club is in every round once, each round follows its
 *      rule, a capped climb keeps its cap, the champion is last where a
 *      league orders by class, and one season is one night however its rows
 *      arrive.
 *   5. SLOTS OVER A LEDGER. After random trades every pick is one slot, used
 *      by its holder at the place of its first owner.
 *   6. THE SAVED ORDER AND THE SAVED NIGHT. Every corruption is refused.
 *   7. THE REVEALS. Lottery night is the field, once each; the run shows
 *      true numbers, his own pick always, and counts every pick made; both
 *      fit the house ceiling.
 *   8. THE "?". The worked example's numbers are the table's.
 *   9. NOTHING MOUNTS IT, and the presenter knows no sport.
 *  10. THE NIGHT, through a toy host: when he is on the clock at N exactly
 *      N minus 1 slots are used, every slot is used once by its holder,
 *      nobody is on two rosters, and every grade shown is his scout's.
 *
 * Controls, through SIM_GM_DRAFT_ORDER_CONTROL. None touches src. Each is
 * listed in CONTROLS with the sections it must turn red. With a control on,
 * the harness exits 1 when exactly those sections went red (it FIRED), 2 when
 * they did not, 3 when the control could not run and 4 on a crash. Read the
 * last line: it says FIRED, DID NOT FIRE, cannot run or CRASHED.
 * SIM_GM_DRAFT_ORDER_CONTROL=all runs every control in turn and exits 0 only
 * if every one fired.
 *
 * MEASURED, 2026-10-10. Every draw here is keyed and every league is built
 * from a seeded generator, so these numbers are the same on every machine and
 * on every run; a number that moves means the modules or this file changed.
 *   Section 2. 5,000 of 5,000 keys exact. 70 club shares of the first pick
 *     (14 clubs, seeds 11, 23, 37, 59, 71, 40,000 lotteries each): distance
 *     from the league's table in standard errors, median 0.55, 95th
 *     percentile 2.03. The band is 4.5, the one simGmPicks section 2 uses for
 *     the same draw, so a healthy module sits far inside it; the flat control
 *     puts 5,065 checks outside and oddsrow 5,070.
 *   Section 3. 3,000 leagues: 5,258 level pairs and 6,881 larger groups in
 *     the field, 6,825 with an odd combination. Level pairs reversed in round
 *     two: 50,648 outside the field, 44,200 inside it (11,521 of those were
 *     reordered by the lottery first, which is what flipbeforelottery needs),
 *     14,179 across the line. Floors: 50 cases of each kind. A drawing won:
 *     21 shares over 20,000 keys each, median 0.38, 95th percentile 1.04
 *     standard errors from an even chance, band 4.5.
 *   Section 4. Three rule sets, 2,000 leagues each: 8,464 climbs, 245 of them
 *     stopped exactly at the cap (floors 1,000 and 20).
 *   Section 5. 600 leagues: 8,785 of the year's picks changed hands, 600
 *     leagues hold a club with three or more picks, 351 a club with none, 202
 *     awarded picks (floors 1,000, 100, 100 and 50).
 *   Section 7. A lottery fits 3,750 ms for 1 to 32 tiles (14 clubs take
 *     3,700 ms, 16 take 3,720 ms); the longest run is 3,780 ms against the
 *     house ceiling of 5,000. Those are rules, not readings: the pace is cut
 *     to fit, and the check is three quarters of the ceiling for the lottery
 *     and four fifths for the run.
 *   Section 10. 400 nights: 5,256 traded picks used by their holders, 1,427
 *     of them his; he was on the clock 2,091 times, 39 of them at the first
 *     pick of the draft; one night he held no slot at all (floors 1,000, 200
 *     and 400).
 *   The floors are a fraction of the smallest count measured and exist so a
 *   check that has stopped looking at anything cannot stay green.
 *
 * Run: node scripts/simGmDraftOrder.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, bundleDraftOrder, lf, makeRng, readRepo } from './lib/gmDraftOrderHarness.mjs';

const CONTROL = process.env.SIM_GM_DRAFT_ORDER_CONTROL || '';

/* A crash is not a result. Without this a throw exits 1, which is what a control that fired exits with. */
for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, error => {
    console.error(error);
    console.log(`simGmDraftOrder: CRASHED${CONTROL ? ` under control ${CONTROL}` : ''}. Not a result.`);
    process.exit(4);
  });
}

/* The files allowed to name the lift. EACH BIND ADDS ITS OWN FILES HERE and
   nothing else in this harness: the list is data so a bind does not have to
   edit a check. */
const MOUNT_ALLOW = [
  'src/lib/gmDraftOrder.ts', 'src/lib/gmDraftOrder.test.ts',
  'src/lib/gmDraftNight.ts', 'src/lib/gmDraftNight.test.ts',
  'src/lib/gmLotteryNight.ts', 'src/lib/gmLotteryNight.test.ts',
  'src/data/gmDraftOrder/rules.ts',
  'src/components/front-office-shared/GmLotteryCard.tsx', 'src/components/front-office-shared/GmLotteryCard.test.tsx',
];

/* control -> { swaps (keyed like the harness lib's FILES), expect: the sections that must go red } */
const CONTROLS = {
  onesource: { expect: [1] },
  /* in memory: a fact outside the lottery's needs, read once and marked thin */
  thinoutside: { expect: [1] },
  /* in memory: a second lottery table with the name and the size of the first */
  twintable: { expect: [1] },
  closespan: { expect: [1], swaps: { rules: [['  plays: { from: 2027, to: null },', '  plays: { from: 2027, to: 2030 },']] } },
  flat: { expect: [2, 3], swaps: { order: [['  const pct = pool.map((_, i) => (i < lottery.odds.length ? lottery.odds[i] : 0));', '  const pct = pool.map((_, i) => (i < lottery.odds.length ? 100 / lottery.odds.length : 0));']] } },
  oddsrow: { expect: [2, 3], swaps: { order: [['  return pool.map((club, i) => ({ club, seed: i + 1, pct: pct[i] }));', '  return pool.map((club, i) => ({ club, seed: i + 1, pct: pct[pool.length - 1 - i] }));']] } },
  extradraw: { expect: [2], swaps: { order: [['    const drawn = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, keyedRng(`${key}|lottery`));', '    const stray = keyedRng(`${key}|lottery`); stray(); const drawn = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, stray);']] } },
  /* round one then comes from a second draw the saved wins do not describe. Section 4 sees it in the order, and since
     the validator replays the saved wins (review finding 6) it refuses such an order outright, so the two sections
     that read a real order back as valid, 6 and 10, go red with it. */
  seconddraw: { expect: [2, 4, 6, 10], swaps: { order: [['    top = drawn.order;', '    top = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, keyedRng(`${key}|again`)).order;']] } },
  mathrandom: { expect: [2, 4], swaps: { order: [['    const drawn = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, keyedRng(`${key}|lottery`));', '    const drawn = runLottery(missed.order, { ...pickRules.lottery, odds: field.map(f => f.pct) }, Math.random);']] } },
  nosplit: { expect: [3], swaps: { order: [["  if (rules.level.odds === 'split') {", "  if (rules.level.odds === 'never') {"]] } },
  tiebyid: { expect: [3], swaps: { order: [['        const pick = Math.floor(rng() * (k + 1));', '        const pick = k;']] } },
  noflip: { expect: [3], swaps: { order: [["  const flip = rules.level.later === 'reverse-of-first' ? -1 : 1;", '  const flip = 1;']] } },
  flipbeforelottery: { expect: [3], swaps: { order: [['  const place = new Map(first.map((id, i) => [id, i]));', '  const place = new Map([...missed.order, ...rest.order].map((id, i) => [id, i]));']] } },
  acrossbyfield: { expect: [3], swaps: { order: [['      .sort((a, b) => byRecord(a, b) || flip * ((place.get(a.id) ?? 0) - (place.get(b.id) ?? 0)))', '      .sort((a, b) => byRecord(a, b) || Number(a.made) - Number(b.made) || flip * ((place.get(a.id) ?? 0) - (place.get(b.id) ?? 0)))']] } },
  champfirst: { expect: [4], swaps: { order: [['  const cmp = (a: DraftClubRow, b: DraftClubRow) => (byClass ? (a.cls ?? 0) - (b.cls ?? 0) : 0) || byRecord(a, b);', '  const cmp = (a: DraftClubRow, b: DraftClubRow) => (byClass ? (b.cls ?? 0) - (a.cls ?? 0) : 0) || byRecord(a, b);']] } },
  laterasfirst: { expect: [3, 4], swaps: { order: [
    ['      .sort((a, b) => byRecord(a, b) || flip * ((place.get(a.id) ?? 0) - (place.get(b.id) ?? 0)))', '      .sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0))'],
    ['    later = [...missed.order, ...rest.order];', '    later = [...first];'],
  ] } },
  /* a later round off the lottery: only the level clubs that missed are flipped, or none at all */
  restlevel: { expect: [4], swaps: { order: [['      for (const group of [...missed.level, ...rest.level]) {', '      for (const group of [...missed.level]) {']] } },
  flipbranchoff: { expect: [4], swaps: { order: [['    if (flip < 0) {', '    if (flip > 1) {']] } },
  /* fail closed, one control a refusal: a fact read once is played, any table is drawn on, any field is drawn on */
  thinplayed: { expect: [4], swaps: { order: [["    if (!fact || fact.thin) return 'thin-rule';", "    if (!fact) return 'thin-rule';"]] } },
  anytable: { expect: [4], swaps: { order: [["  if (!lottery || lottery.table !== rules.lottery.table) return 'table';", "  if (!lottery) return 'table';"]] } },
  anyfield: { expect: [4], swaps: { order: [["  if (fieldSize !== lottery.clubs || lottery.odds.length !== lottery.clubs) return 'field-size';", "  if (lottery.odds.length !== lottery.clubs) return 'field-size';"]] } },
  rowkey: { expect: [4], swaps: { order: [['  const rows = [...season.rows].sort(byId)', '  const rows = [...season.rows]']] } },
  origpicks: { expect: [5, 10], swaps: { order: [["        overall: out.length + 1, round, slot: s.slot, orig: s.pick.orig, holder: s.pick.holder, kind: s.pick.kind ?? 'std',", "        overall: out.length + 1, round, slot: s.slot, orig: s.pick.orig, holder: s.pick.orig, kind: s.pick.kind ?? 'std',"]] } },
  skipslot: { expect: [5, 6, 10], swaps: { order: [['    for (const s of roundSlots(ledger, ledgerYear, round, round === 1 ? order.first : order.later)) {', '    for (const s of roundSlots(ledger, ledgerYear, round, round === 1 ? order.first : order.later).slice(1)) {']] } },
  trustall: { expect: [6], swaps: { order: [["  if (!raw || typeof raw !== 'object') return false;", '  if (raw !== 0) return true;']] } },
  trustnight: { expect: [6], swaps: { night: [["  if (!raw || typeof raw !== 'object') return false;", '  if (raw !== 0) return true;']] } },
  /* the validator holds round one's head to be the field's clubs and no longer to be what the saved wins make of them */
  winsloose: { expect: [6], swaps: { order: [['  if (!head.every((id, i) => first[i] === id)) return false;', '  if (!head.every(id => first.includes(id))) return false;']] } },
  capcount: { expect: [7], swaps: { night: [['    headline: runHeadline(made, next),', '    headline: runHeadline(rows, next),']] } },
  ghostrow: { expect: [7], swaps: { night: [["        overall: s.overall, team: s.team, playerName: s.playerName.trim(), pos: typeof s.pos === 'string' ? s.pos : '',", "        overall: s.overall + 1, team: s.team, playerName: s.playerName.trim(), pos: typeof s.pos === 'string' ? s.pos : '',"]] } },
  hidemine: { expect: [7], swaps: { night: [['  const keep = new Set<RunStep>(made.filter(s => s.mine).slice(-MAX_REVEALED));', '  const keep = new Set<RunStep>();']] } },
  slowcards: { expect: [7], swaps: { reveal: [['  const step = Math.max(0.01, Math.min(LOTTERY_REVEAL_MAX_STEP_S, fit));', '  const step = Math.max(0.01, Math.min(LOTTERY_REVEAL_MAX_STEP_S, fit)) * 10;']] } },
  /* the pace reports the moment the closing line STARTS, which is what it did before the review measured the screen */
  shortend: { expect: [7], swaps: { reveal: [['  return { start: LOTTERY_REVEAL_LEAD_S, step, closingMs: Math.round(closing * 1000), totalMs: Math.round(end * 1000) };', '  return { start: LOTTERY_REVEAL_LEAD_S, step, closingMs: Math.round(closing * 1000), totalMs: Math.round(closing * 1000) };']] } },
  /* a duration typed into the presenter's CSS (in memory): the lib's pace can no longer see it */
  literaltime: { expect: [7] },
  headlineswapped: { expect: [7], swaps: { lottery: [["    if (moved > 0) headline = `Your club's own pick lands ${ordinal(mineSlot)}, up ${places(moved)}.`;", "    if (moved < 0) headline = `Your club's own pick lands ${ordinal(mineSlot)}, up ${places(moved)}.`;"]] } },
  staleexample: { expect: [8], swaps: { lottery: [["  const lines = [`By the table, the worst record's chance at the first pick is ${facts.worstPct}%. The best record in the lottery gets ${lastPct}%.`];", "  const lines = [`By the table, the worst record's chance at the first pick is 25%. The best record in the lottery gets ${lastPct}%.`];"]] } },
  /* the card prints the table's line on every night, also where level clubs shared their chances */
  tableline: { expect: [8], swaps: { lottery: [['  if (drawnAsTable(saved, lottery)) return lotteryRuleLine(lotteryFactsFromWeights(lottery.odds, lottery.draws));', '  if (lottery) return lotteryRuleLine(lotteryFactsFromWeights(lottery.odds, lottery.draws));']] } },
  mounted: { expect: [9] },
  norivals: { expect: [10], swaps: { night: [['  while (made < night.slots.length && night.slots[made].holder !== stopFor) {', '  while (made < 0 && night.slots[made].holder !== stopFor) {']] } },
  shownread: { expect: [10], swaps: { night: [['    grade: Math.round(host.shown(prospect)), mine,', '    grade: Math.round(host.read(prospect, slot.holder)), mine,']] } },
};

const SECTION_NAMES = {
  1: 'the ledger: two reads a fact, the spans, the table',
  2: 'the draw adds nothing and is drawn once',
  3: 'level records, all three cases',
  4: 'the order of every round',
  5: 'slots over a ledger',
  6: 'the saved order and the saved night fail closed',
  7: 'the reveals',
  8: 'the worked example is the table',
  9: 'nothing mounts it, and the presenter knows no sport',
  10: 'the night through a toy host',
};

/* ---------- every control in turn ---------- */
if (CONTROL === 'all') {
  const self = fileURLToPath(import.meta.url);
  let fired = 0;
  const lines = [];
  /* SIM_GM_DRAFT_ORDER_SHARD=1/3 runs every third control starting at the second, so three lines can share the list. */
  const [shardAt, shardOf] = (process.env.SIM_GM_DRAFT_ORDER_SHARD || '0/1').split('/').map(Number);
  if (!Number.isInteger(shardAt) || !Number.isInteger(shardOf) || shardOf < 1 || shardAt < 0 || shardAt >= shardOf) {
    console.error(`SIM_GM_DRAFT_ORDER_SHARD=${process.env.SIM_GM_DRAFT_ORDER_SHARD} is not k/n with 0 <= k < n`);
    process.exit(3);
  }
  const names = Object.keys(CONTROLS).filter((_, i) => i % shardOf === shardAt);
  for (const name of names) {
    const run = spawnSync(process.execPath, [self], { env: { ...process.env, SIM_GM_DRAFT_ORDER_CONTROL: name }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    /* The verdict is the last line of stdout. The FAIL lines go to stderr and say nothing about whether it fired. */
    const last = String(run.stdout ?? '').trim().split('\n').pop() ?? '';
    const ok = run.status === 1 && last.includes(` CONTROL ${name} FIRED.`);
    if (ok) fired += 1;
    lines.push(`   ${ok ? 'fired ' : 'NOT OK'} exit ${run.status}  ${name.padEnd(18)} ${last.slice(0, 150)}`);
  }
  console.log(lines.join('\n'));
  const total = names.length;
  const part = shardOf > 1 ? ` (shard ${shardAt}/${shardOf} of ${Object.keys(CONTROLS).length})` : '';
  console.log(fired === total && total > 0
    ? `simGmDraftOrder controls${part}: all ${total} fired, each in exactly its own sections.`
    : `simGmDraftOrder controls${part}: ${total - fired} of ${total} DID NOT FIRE as expected.`);
  process.exit(fired === total && total > 0 ? 0 : 1);
}
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_GM_DRAFT_ORDER_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, or all)`);
  process.exit(3);
}

const failures = Object.fromEntries(Object.keys(SECTION_NAMES).map(k => [k, 0]));
const shown = Object.fromEntries(Object.keys(SECTION_NAMES).map(k => [k, 0]));
let section = 1;
let checks = 0;
function fail(message) {
  failures[section] += 1;
  if (shown[section] < 6) { shown[section] += 1; console.error(`  FAIL: ${message}`); }
}
function check(ok, message) {
  checks += 1;
  if (!ok) fail(typeof message === 'function' ? message() : message);
}
function open(n) {
  section = n;
  console.log(`${n}) ${SECTION_NAMES[n]}`);
}

let M;
try {
  M = await bundleDraftOrder(CONTROL, CONTROLS[CONTROL]?.swaps);
} catch (error) {
  console.error(`control cannot run: ${error.message}`);
  process.exit(3);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}. Sections ${CONTROLS[CONTROL].expect.join(' and ')} must go red and no other.`);
const { order: O, night: N, lottery: L, reveal: R, rules: RULES, picks: P, draftNight: DN, realKeyedRng, tally } = M;

/* Math.random is the one stream nothing here may touch. Counted, never replaced. */
const realRandom = Math.random;
let randomCalls = 0;
Math.random = () => { randomCalls += 1; return realRandom(); };

const NBA = RULES.NBA_DRAFT_ORDER_2019;
const NBA_PICKS = P.NBA_PICK_RULES;
const TABLE = NBA_PICKS.lottery;
const shareOf = r => r.wins / (r.wins + r.losses);
const ids = n => Array.from({ length: n }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* A league of n clubs, the first `missed` out of the playoffs, every record different, worst first. */
function ladder(n, missed, draftYear = 2030, sport = 'nba') {
  return { sport, draftYear, rows: ids(n).map((id, i) => ({ id, wins: 10 + 2 * i, losses: 72 - 2 * i, made: i >= missed })) };
}
/* A random league: records from a narrow range so level groups turn up, and a playoff field that is
   mostly the best records but not exactly them, as a two conference field really is. */
function randomSeason(rng, n = 30, made = 16, spread = 24) {
  const rows = ids(n).map(id => { const wins = 20 + Math.floor(rng() * spread); return { id, wins, losses: 82 - wins, made: false }; });
  const ranked = [...rows].sort((a, b) => b.wins - a.wins || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < made; i += 1) ranked[i].made = true;
  /* swap one or two clubs across the line */
  for (let k = 0; k < 2; k += 1) {
    if (rng() < 0.6) {
      const inside = ranked[made - 1 - Math.floor(rng() * 3)];
      const outside = ranked[made + Math.floor(rng() * 3)];
      if (inside.made && !outside.made) { inside.made = false; outside.made = true; }
    }
  }
  return { sport: 'nba', draftYear: 2027 + Math.floor(rng() * 30), rows };
}

/* The harness's OWN numbers, typed here and never read from the modules. */
const TABLE_TYPED = [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5]; // the league's 2019 to 2026 table
const COMBINATIONS_TYPED = 1000;
const DRAWN_TYPED = 4;
const GAME_FIRST_DRAFT = { nba: 2027 }; // the NBA engine opens in 2026 and its board prints season + 1
const HOUSE_CEILING_MS = 5000; // scripts/simDraftNight.mjs holds a draft run to the same number
const LOTTERY_USE = 0.75;
const TURN_TYPED_S = 0.32; // one tile's turn
const CLOSE_TYPED_S = 0.3; // the closing line's arrival
const PRESENTER_UI = 'src/components/lottery/LotteryReveal.tsx';
const MAX_ROWS = 9;
const BAND = 4.5; // standard errors, the band scripts/simGmPicks.mjs section 2 uses for the same draw
const SEEDS = [11, 23, 37, 59, 71];
const DRAWS = 40000;
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/* ---------- 1. the ledger ---------- */
open(1);
{
  const ledger = JSON.parse(lf(fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'gmDraftOrderSources.json'), 'utf8')));
  if (CONTROL === 'onesource') {
    const reads = ledger.rules?.['nba-2019']?.field?.reads;
    if (!Array.isArray(reads) || reads.length < 2) { console.error('control cannot run: the field fact has no second read to drop'); process.exit(3); }
    ledger.rules['nba-2019'].field.reads = reads.slice(0, 1);
  }
  if (CONTROL === 'thinoutside') {
    /* a fact no lottery needs, read once and honestly marked thin: nothing in the engine would stop it being played */
    const fact = RULES.NBA_DRAFT_ORDER_2019.facts.find(f => f.key === 'laterRounds');
    const reads = ledger.rules?.['nba-2019']?.laterRounds?.reads;
    if (!fact || fact.thin || !Array.isArray(reads) || reads.length < 2 || RULES.NBA_DRAFT_ORDER_2019.lottery.needs.includes('laterRounds')) {
      console.error('control cannot run: laterRounds is missing, already thin, has no second read to drop, or is a lottery need');
      process.exit(3);
    }
    fact.thin = true;
    ledger.rules['nba-2019'].laterRounds.reads = reads.slice(0, 1);
  }
  /* The lottery tables on the pick rules. The order refuses a table by its NAME and by the size of the field, so
     two tables that share both could be swapped unseen. Two of them share a name today; their sizes differ. */
  const tables = Object.entries(P.GM_PICK_RULES).filter(([, r]) => r.lottery).map(([sport, r]) => ({ sport, table: r.lottery.table, clubs: r.lottery.clubs }));
  if (CONTROL === 'twintable') {
    if (tables.length === 0) { console.error('control cannot run: no pick rules carry a lottery table'); process.exit(3); }
    tables.push({ ...tables[0], sport: 'a twin' });
  }
  for (let a = 0; a < tables.length; a += 1) {
    for (let b = a + 1; b < tables.length; b += 1) {
      check(!(tables[a].table === tables[b].table && tables[a].clubs === tables[b].clubs),
        `the lottery tables of ${tables[a].sport} and ${tables[b].sport} share the name "${tables[a].table}" and the size ${tables[a].clubs}, so a rule set read against one accepts the other`);
    }
  }
  check(tables.length >= 2, `only ${tables.length} lottery table(s) on the pick rules, so the check that the order can tell them apart is not looking at anything`);
  const site = url => { try { return new URL(url).hostname.split('.').slice(-2).join('.'); } catch { return ''; } };
  let facts = 0;
  let reads = 0;
  for (const [sport, sets] of Object.entries(RULES.GM_DRAFT_ORDER_RULES)) {
    for (const rule of sets) {
      const twin = ledger.rules?.[rule.id] ?? {};
      for (const f of rule.facts) {
        facts += 1;
        const t = twin[f.key];
        check(!!t, `${rule.id}: the fact ${f.key} has no twin in the ledger`);
        if (!t) continue;
        check(t.says === f.says, `${rule.id}.${f.key}: the rule set and the ledger say different things`);
        check(f.on === ledger.read, `${rule.id}.${f.key}: dated ${f.on} in the rule set and ${ledger.read} in the ledger`);
        const hosts = new Set();
        for (const r of t.reads ?? []) {
          reads += 1;
          check(typeof r.url === 'string' && r.url.startsWith('https://') && site(r.url) !== '', `${rule.id}.${f.key}: a read has no usable address`);
          check(!/wiki|fandom/i.test(String(r.url)), `${rule.id}.${f.key}: a read is a wiki (${r.url})`);
          check(typeof r.who === 'string' && r.who.trim() !== '' && typeof r.words === 'string' && r.words.trim().length >= 20, `${rule.id}.${f.key}: a read does not say who published it or what was read`);
          hosts.add(site(String(r.url)));
        }
        check((hosts.size >= 2) === !f.thin, hosts.size >= 2
          ? `${rule.id}.${f.key} is marked thin and has two publishers`
          : `${rule.id}.${f.key} has ${hosts.size} publisher(s) and is not marked thin, so the lift would play a rule read once`);
        /* `thin` stops a lottery and nothing else, so a thin fact that no lottery needs would simply be played */
        if (f.thin) check((rule.lottery?.needs ?? []).includes(f.key), `${rule.id}.${f.key} is marked thin and no lottery needs it, so nothing stops the lift playing a rule read once. Take it out of the facts and name it in partial.`);
      }
      for (const key of Object.keys(twin)) check(rule.facts.some(f => f.key === key), `${rule.id}: the ledger holds ${key}, which the rule set does not carry`);
      for (const need of rule.lottery?.needs ?? []) check(rule.facts.some(f => f.key === need), `${rule.id}: the lottery needs ${need}, which is not a fact`);
      const table = P.GM_PICK_RULES[sport]?.lottery ?? null;
      if (rule.lottery) {
        check(table !== null && table.table === rule.lottery.table, `${rule.id} was read against ${rule.lottery.table}, which is not the table on the ${sport} pick rules`);
        if (table && rule.lottery.combinations) {
          const combos = table.odds.map(p => (p / 100) * rule.lottery.combinations);
          check(combos.every(c => Math.abs(c - Math.round(c)) < 1e-9), `${rule.id}: the table is not whole combinations of ${rule.lottery.combinations}`);
          check(Math.round(combos.reduce((a, b) => a + b, 0)) === rule.lottery.combinations, `${rule.id}: the table does not add up to ${rule.lottery.combinations} combinations`);
        }
        check(O.lotteryRefusal(rule, table, table?.clubs ?? 0) === null, `${rule.id}: its lottery would be refused on its own table`);
      }
    }
    const sorted = [...sets].sort((a, b) => a.plays.from - b.plays.from);
    for (let i = 1; i < sorted.length; i += 1) {
      check(sorted[i - 1].plays.to !== null && sorted[i].plays.from === sorted[i - 1].plays.to + 1, `${sport}: the spans ${sorted[i - 1].id} and ${sorted[i].id} leave a gap or overlap`);
    }
    const from = GAME_FIRST_DRAFT[sport];
    check(Number.isInteger(from), `${sport}: this harness does not know the game's first draft, so it cannot hold the spans`);
    for (let year = from; year <= 2060; year += 1) check(O.draftRulesFor(sport, year) !== null, `${sport}: no rule set plays the ${year} draft`);
  }
  check(sameList(TABLE.odds, TABLE_TYPED) && TABLE.draws === DRAWN_TYPED && TABLE.clubs === TABLE_TYPED.length, 'the NBA table on the pick rules is not the one typed here from the league');
  check(NBA.lottery.combinations === COMBINATIONS_TYPED, 'the NBA rule set does not draw in 1,000 combinations');
  check(NBA.real.from === 2019 && NBA.real.to === 2026 && NBA.plays.from === 2027 && NBA.plays.to === null, 'the NBA spans are not the league through 2026 and the game from 2027');
  check(O.draftRulesFor('nba', 2027)?.id === 'nba-2019' && O.draftRulesFor('nba', 2026) === null, 'the lookup selects on the wrong span');
  for (const rel of [...MOUNT_ALLOW, 'src/lib/lotteryReveal.ts', 'src/components/lottery/LotteryReveal.tsx']) {
    check(!/https?:\/\/|www\.[a-z0-9-]+\.[a-z]/i.test(readRepo(rel)), `${rel} carries an address; addresses live in the ledger only`);
  }
  console.log(`   ${facts} facts and ${reads} reads joined by key; spans held from each game's first draft to 2060; no address in the ${MOUNT_ALLOW.length + 2} owned files`);
}

/* ---------- 2. the draw adds nothing ---------- */
open(2);
{
  const season = ladder(30, 14);
  /* The pool, worked out here: the clubs out of the playoffs, worst record first. No level records in this league. */
  const pool = season.rows.filter(r => !r.made).sort((a, b) => shareOf(a) - shareOf(b)).map(r => r.id);
  let exact = 0;
  for (let i = 0; i < 5000; i += 1) {
    const key = `exact|${i}`;
    tally.keys.length = 0;
    tally.draws = 0;
    const before = randomCalls;
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS, key);
    const opened = [...tally.keys];
    const drew = tally.draws;
    const hand = P.runLottery(pool, { ...TABLE, odds: [...TABLE_TYPED] }, realKeyedRng(`${key}|lottery`));
    const same = saved.lottery !== null && JSON.stringify(saved.lottery.wins) === JSON.stringify(hand.wins) && sameList(saved.first.slice(0, pool.length), hand.order);
    if (same) exact += 1;
    check(same, () => `key ${key}: the saved lottery is not runLottery on the keyed stream`);
    check(opened.length === 1 && opened[0] === `${key}|lottery` && drew === DRAWN_TYPED,
      () => `key ${key}: a build opened ${opened.length} stream(s) and drew ${drew} number(s); one stream and ${DRAWN_TYPED} numbers is the whole draw`);
    check(randomCalls === before, () => `key ${key}: a build called Math.random`);
  }
  console.log(`   ${exact} of 5000 keys: the saved wins and round one are runLottery by hand on key|lottery, with one stream and ${DRAWN_TYPED} numbers a build`);

  /* A second look, a reload, a re-render: nothing draws again, and no other stream moves. */
  {
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS, 'look');
    const other = realKeyedRng('a stream that is not the lottery');
    const head = [other(), other(), other()];
    tally.keys.length = 0;
    tally.draws = 0;
    const before = randomCalls;
    const clubs = season.rows.map(r => r.id);
    const copy = JSON.parse(JSON.stringify(saved));
    const slots = O.draftSlots(copy, P.newLedger(clubs, 2029, NBA_PICKS), 2029, NBA_PICKS.rounds);
    const night = N.openDraftNight(copy, slots, 2029);
    for (let look = 0; look < 3; look += 1) {
      L.lotteryNight(copy, clubs[look * 7]);
      L.lotteryHelp(copy, NBA, TABLE);
      O.isSavedDraftOrder(copy, clubs);
      N.isGmDraftNight(JSON.parse(JSON.stringify(night)), clubs, 2029);
      N.markLotterySeen(night);
      N.draftRunReveal([], O.nextSlot(slots, 0));
    }
    const tail = [other(), other(), other()];
    const fresh = realKeyedRng('a stream that is not the lottery');
    check(tally.keys.length === 0 && tally.draws === 0 && randomCalls === before, `looking at a saved order opened ${tally.keys.length} stream(s), drew ${tally.draws} number(s) and called Math.random ${randomCalls - before} time(s); it must draw nothing`);
    check(sameList([...head, ...tail], [fresh(), fresh(), fresh(), fresh(), fresh(), fresh()]), 'a stream that is not the lottery moved while an order was built and read');
    check(JSON.stringify(copy) === JSON.stringify(saved), 'reading a saved order changed it');
  }

  /* The share of first picks by seed, against the table typed above. */
  const zs = [];
  for (const seed of SEEDS) {
    const firsts = new Array(pool.length).fill(0);
    let fell = 0;
    for (let i = 0; i < DRAWS; i += 1) {
      const saved = O.buildDraftOrder(season, NBA, NBA_PICKS, `band|${seed}|${i}`);
      firsts[pool.indexOf(saved.first[0])] += 1;
      if (saved.first.indexOf(pool[0]) > DRAWN_TYPED) fell += 1;
    }
    check(fell === 0, `seed ${seed}: the worst record picked lower than ${DRAWN_TYPED + 1} in ${fell} of ${DRAWS} lotteries`);
    for (let c = 0; c < pool.length; c += 1) {
      const p = TABLE_TYPED[c] / 100;
      const z = (firsts[c] / DRAWS - p) / Math.sqrt((p * (1 - p)) / DRAWS);
      zs.push(Math.abs(z));
      check(Math.abs(z) <= BAND, `seed ${seed}: the club seeded ${c + 1} took the first pick ${((100 * firsts[c]) / DRAWS).toFixed(2)}% of the time against ${TABLE_TYPED[c]}% (${z.toFixed(1)} standard errors)`);
    }
  }
  zs.sort((a, b) => a - b);
  console.log(`   ${zs.length} club shares of the first pick over ${DRAWS} lotteries each (seeds ${SEEDS.join(', ')}): distance from the table in standard errors, median ${quantile(zs, 0.5).toFixed(2)}, 95th percentile ${quantile(zs, 0.95).toFixed(2)}, band ${BAND}`);
}

/* ---------- 3. level records ---------- */
open(3);
{
  /* a. the split, and c. the three cases of a later round, over random leagues full of level records */
  const rng = makeRng(1222);
  const seen = { pairs: 0, triples: 0, odd: 0, outside: 0, inside: 0, insideMoved: 0, across: 0 };
  const units = COMBINATIONS_TYPED / 100;
  for (let s = 0; s < 3000; s += 1) {
    const season = randomSeason(rng, 30, 16, 12);
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS);
    const row = new Map(season.rows.map(r => [r.id, r]));
    if (!saved.lottery) { fail(`league ${s}: no lottery was drawn (${saved.plain})`); continue; }
    const field = saved.lottery.field;
    for (let i = 1; i < field.length; i += 1) {
      check(shareOf(row.get(field[i - 1].club)) <= shareOf(row.get(field[i].club)), () => `league ${s}: the field is not worst record first at seed ${i + 1}`);
    }
    for (let i = 0; i < field.length;) {
      let j = i + 1;
      while (j < field.length && shareOf(row.get(field[j].club)) === shareOf(row.get(field[i].club))) j += 1;
      const combos = field.slice(i, j).map(f => f.pct * units);
      if (j - i === 1) {
        check(Math.abs(field[i].pct - TABLE_TYPED[i]) < 1e-9, () => `league ${s}: seed ${i + 1} is level with nobody and holds ${field[i].pct}%, not the table's ${TABLE_TYPED[i]}%`);
      } else {
        const total = TABLE_TYPED.slice(i, j).reduce((a, b) => a + b, 0) * units;
        if (j - i === 2) seen.pairs += 1; else seen.triples += 1;
        if (Math.round(total) % (j - i) !== 0) seen.odd += 1;
        check(combos.every(c => Math.abs(c - Math.round(c)) < 1e-6), () => `league ${s}: seeds ${i + 1} to ${j} do not hold whole combinations (${combos.join(', ')})`);
        check(Math.abs(combos.reduce((a, b) => a + b, 0) - total) < 1e-6, () => `league ${s}: seeds ${i + 1} to ${j} hold ${combos.reduce((a, b) => a + b, 0)} combinations between them, not the ${total} of the seeds they span`);
        check(Math.max(...combos) - Math.min(...combos) <= 1 + 1e-6, () => `league ${s}: level seeds ${i + 1} to ${j} were not split evenly (${combos.join(', ')})`);
        check(combos.every((c, k) => k === 0 || combos[k - 1] >= c - 1e-6), () => `league ${s}: the odd combination did not go to the winner of the drawing (${combos.join(', ')})`);
        const group = saved.level.find(g => g.includes(field[i].club));
        check(Array.isArray(group) && sameList(group, field.slice(i, j).map(f => f.club)), () => `league ${s}: seeds ${i + 1} to ${j} are level and no drawing is recorded for exactly them`);
      }
      i = j;
    }
    /* round one after the field is worst record first too, so no drawing moved a club past a better or worse record */
    for (let i = field.length + 1; i < saved.first.length; i += 1) {
      check(shareOf(row.get(saved.first[i - 1])) <= shareOf(row.get(saved.first[i])), () => `league ${s}: round one is not by record at pick ${i + 1}`);
    }
    /* every two clubs level on record: round two is the reverse of round one, whichever of the three cases it is */
    const firstAt = new Map(saved.first.map((id, i) => [id, i]));
    const laterAt = new Map(saved.later.map((id, i) => [id, i]));
    const seedAt = new Map(field.map(f => [f.club, f.seed]));
    for (let a = 0; a < season.rows.length; a += 1) {
      for (let b = a + 1; b < season.rows.length; b += 1) {
        const x = season.rows[a];
        const y = season.rows[b];
        if (shareOf(x) !== shareOf(y)) continue;
        const kind = x.made && y.made ? 'outside' : !x.made && !y.made ? 'inside' : 'across';
        seen[kind] += 1;
        if (kind === 'inside' && (seedAt.get(x.id) < seedAt.get(y.id)) !== (firstAt.get(x.id) < firstAt.get(y.id))) seen.insideMoved += 1;
        const reversed = (firstAt.get(x.id) < firstAt.get(y.id)) === (laterAt.get(x.id) > laterAt.get(y.id));
        check(reversed, () => `league ${s}: ${x.id} and ${y.id} are level (${kind} the lottery field) and round two is not the reverse of round one`);
        if (kind === 'across') {
          const lotteryClub = x.made ? y : x;
          const playoffClub = x.made ? x : y;
          check(laterAt.get(playoffClub.id) < laterAt.get(lotteryClub.id), () => `league ${s}: level across the line, and the lottery club ${lotteryClub.id} is ahead of the playoff club ${playoffClub.id} in round two`);
        }
      }
    }
  }
  for (const [what, n] of Object.entries(seen)) check(n >= 50, `only ${n} cases of "${what}" in 3000 leagues, so that check is not looking at anything`);
  console.log(`   3000 leagues: ${seen.pairs} level pairs and ${seen.triples} larger groups in the field (${seen.odd} with an odd combination), every one split in whole combinations`);
  console.log(`   level pairs reversed in round two: ${seen.outside} outside the field, ${seen.inside} inside it (${seen.insideMoved} of them reordered by the lottery first), ${seen.across} across the line`);

  /* a league that draws without whole combinations splits the plain mean; one that keeps the table keeps it */
  {
    const level = { sport: 'toy', draftYear: 2030, rows: ids(6).map((id, i) => ({ id, wins: i === 2 ? 3 : i + 2, losses: 20, made: i >= 4 })) };
    const table = { clubs: 4, odds: [40, 30, 20, 10], draws: 1, maxClimb: null, table: 'toy' };
    const picks = { ...NBA_PICKS, lottery: table };
    const mean = O.buildDraftOrder(level, { ...NBA, lottery: { table: 'toy', combinations: null, needs: [] } }, picks);
    const keep = O.buildDraftOrder(level, { ...NBA, lottery: { table: 'toy', combinations: null, needs: [] }, level: { odds: 'keep', later: 'as-first' } }, picks);
    check(mean.lottery !== null && sameList(mean.lottery.field.map(f => f.pct), [40, 25, 25, 10]), `a league with no whole combinations did not split the mean (${mean.lottery?.field.map(f => f.pct).join(', ')})`);
    check(keep.lottery !== null && sameList(keep.lottery.field.map(f => f.pct), [40, 30, 20, 10]), `a league that keeps its table split it (${keep.lottery?.field.map(f => f.pct).join(', ')})`);
  }

  /* b. a drawing is fair: over many keys each club of a level group leads it in its share of the nights */
  const zs = [];
  const KEYS = 20000;
  const shapes = [
    { name: 'a pair in the field', level: [3, 4] }, { name: 'a pair outside it', level: [20, 21] }, { name: 'three outside it', level: [24, 25, 26] },
  ];
  for (const shape of shapes) {
    const season = ladder(30, 14);
    for (const at of shape.level) { season.rows[at].wins = season.rows[shape.level[0]].wins; season.rows[at].losses = season.rows[shape.level[0]].losses; }
    const group = shape.level.map(at => season.rows[at].id);
    for (const seed of SEEDS.slice(0, 3)) {
      const led = new Map(group.map(id => [id, 0]));
      for (let i = 0; i < KEYS; i += 1) {
        const saved = O.buildDraftOrder(season, NBA, NBA_PICKS, `tie|${seed}|${i}`);
        const drawn = saved.level.find(g => g.includes(group[0]));
        if (!drawn || drawn.length !== group.length) { fail(`${shape.name}: the level group is not recorded as one drawing`); break; }
        led.set(drawn[0], led.get(drawn[0]) + 1);
      }
      const p = 1 / group.length;
      for (const id of group) {
        const z = (led.get(id) / KEYS - p) / Math.sqrt((p * (1 - p)) / KEYS);
        zs.push(Math.abs(z));
        check(Math.abs(z) <= BAND, `${shape.name}, seed ${seed}: ${id} won the drawing ${((100 * led.get(id)) / KEYS).toFixed(2)}% of the time against ${(100 * p).toFixed(2)}% (${z.toFixed(1)} standard errors)`);
      }
    }
  }
  zs.sort((a, b) => a - b);
  console.log(`   ${zs.length} shares of a drawing won over ${KEYS} keys each: distance from an even chance in standard errors, median ${quantile(zs, 0.5).toFixed(2)}, 95th percentile ${quantile(zs, 0.95).toFixed(2)}, band ${BAND}`);
}

/* ---------- 4. the order ---------- */
/* Three rule sets no league has, so every branch of the engine is proven before a sport binds it: a league that
   orders its playoff clubs by class, keeps later rounds off the lottery and caps a climb; one with no lottery; and
   one that flips its level clubs in a later round off the lottery. */
const HOCKEY_TABLE = P.NHL_PICK_RULES.lottery;
const TOY_CLASS = {
  ...NBA, id: 'toy-class', sport: 'toy', real: { from: 2000, to: null }, plays: { from: 2000, to: null },
  lottery: { table: HOCKEY_TABLE.table, combinations: null, needs: [] },
  restOfFirst: 'class', laterRounds: 'first-before-lottery', level: { odds: 'keep', later: 'as-first' }, facts: [],
};
const TOY_CLASS_PICKS = { ...P.NHL_PICK_RULES };
const TOY_PLAIN = { ...TOY_CLASS, id: 'toy-plain', lottery: null };
/* The same league, except that clubs still level after the league's tie values pick in a later round in the reverse
   of their round one order. The branch of the engine that does that off the lottery was run by no rule set and no
   check before the review (its mutations restLevelDropped and flipBranchDead survived). */
const TOY_FLIP = { ...TOY_CLASS, id: 'toy-flip', level: { odds: 'keep', later: 'reverse-of-first' } };
/* 32 clubs, 16 in a bracket: eight out in round one, four in round two, two in round three, a finalist and a champion. */
function classSeason(rng) {
  const rows = ids(32).map(id => { const wins = 20 + Math.floor(rng() * 30); return { id, wins, losses: 82 - wins, made: false, tie: [Math.floor(rng() * 3)] }; });
  const ranked = [...rows].sort((a, b) => b.wins - a.wins || (a.id < b.id ? -1 : 1)).slice(0, 16);
  const classes = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5];
  for (let i = ranked.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [ranked[i], ranked[j]] = [ranked[j], ranked[i]]; }
  ranked.forEach((r, i) => { r.made = true; r.cls = classes[i]; });
  return { sport: 'toy', draftYear: 2030 + Math.floor(rng() * 20), rows };
}
const FLIP_FLOORS = { missed: 1000, made: 300, afterLottery: 100 }; // a fraction of the counts measured, see MEASURED
const tieOf = r => (r.tie ?? [0])[0];
const noLaterThan = (a, b) => shareOf(a) < shareOf(b) || (shareOf(a) === shareOf(b) && tieOf(a) <= tieOf(b));

open(4);
{
  const rng = makeRng(404);
  const seen = { capped: 0, climbs: 0, shuffles: 0, flipMissed: 0, flipMade: 0, flipAfterLottery: 0 };
  const fleets = [
    { name: 'the NBA rule set', rules: NBA, picks: NBA_PICKS, make: () => randomSeason(rng) },
    { name: 'a league by class with a capped climb', rules: TOY_CLASS, picks: TOY_CLASS_PICKS, make: () => classSeason(rng) },
    { name: 'a league with no lottery', rules: TOY_PLAIN, picks: TOY_CLASS_PICKS, make: () => classSeason(rng) },
    { name: 'a league by class whose level clubs flip in a later round', rules: TOY_FLIP, picks: TOY_CLASS_PICKS, make: () => classSeason(rng) },
  ];
  for (const fleet of fleets) {
    for (let s = 0; s < 2000; s += 1) {
      const season = fleet.make();
      const clubs = season.rows.map(r => r.id);
      const row = new Map(season.rows.map(r => [r.id, r]));
      const saved = O.buildDraftOrder(season, fleet.rules, fleet.picks);
      const where = `${fleet.name}, league ${s}`;
      const perm = list => list.length === clubs.length && new Set(list).size === clubs.length && list.every(id => row.has(id));
      check(perm(saved.first) && perm(saved.later), () => `${where}: a round does not hold every club exactly once`);
      const missed = season.rows.filter(r => !r.made).length;
      check(saved.first.slice(0, missed).every(id => !row.get(id).made), () => `${where}: a playoff club picks inside the lottery clubs' slots`);
      check((saved.lottery !== null) === (fleet.rules.lottery !== null) && (saved.plain === null) === (saved.lottery !== null), () => `${where}: lottery ${saved.lottery ? 'drawn' : 'not drawn'}, reason ${saved.plain}`);
      /* the clubs the lottery did not draw keep their order, worst record first */
      const winners = new Set((saved.lottery?.wins ?? []).map(w => w.club));
      const undrawn = saved.first.slice(0, missed).filter(id => !winners.has(id));
      check(undrawn.every((id, i) => i === 0 || noLaterThan(row.get(undrawn[i - 1]), row.get(id))), () => `${where}: the clubs that were not drawn are not worst record first`);
      /* round one after the field */
      const rest = saved.first.slice(missed).map(id => row.get(id));
      if (fleet.rules.restOfFirst === 'class') {
        check(rest.every((r, i) => i === 0 || rest[i - 1].cls < r.cls || (rest[i - 1].cls === r.cls && noLaterThan(rest[i - 1], r))), () => `${where}: the playoff clubs are not by class and then record`);
        check(rest[rest.length - 1].cls === 5 && saved.later[saved.later.length - 1] === rest[rest.length - 1].id, () => `${where}: the champion does not pick last in every round`);
      } else {
        check(rest.every((r, i) => i === 0 || noLaterThan(rest[i - 1], r)), () => `${where}: the playoff clubs are not worst record first`);
      }
      /* later rounds */
      if (fleet.rules.laterRounds === 'record-all') {
        const later = saved.later.map(id => row.get(id));
        check(later.every((r, i) => i === 0 || shareOf(later[i - 1]) <= shareOf(r)), () => `${where}: round two is not every club by record`);
      } else {
        const seeds = saved.lottery ? saved.lottery.field.map(f => f.club) : saved.first.slice(0, missed);
        const before = [...seeds, ...saved.first.slice(missed)];
        if (fleet.rules.level.later === 'as-first') {
          check(sameList(saved.later, before), () => `${where}: a later round is not round one as it stood before the lottery`);
        } else {
          /* Round one as it stood before the lottery, except inside each group of level clubs: a group keeps its own
             seats and fills them in the REVERSE of its round one order, which for lottery clubs is read after the lottery. */
          const groupOf = new Map();
          saved.level.forEach((group, g) => group.forEach(id => groupOf.set(id, g)));
          check(saved.later.every((id, i) => (groupOf.has(id) ? groupOf.get(before[i]) === groupOf.get(id) : before[i] === id)),
            () => `${where}: in a later round a club that is level with nobody moved, or a level club left its group's seats`);
          const firstAt = new Map(saved.first.map((id, i) => [id, i]));
          const laterAt = new Map(saved.later.map((id, i) => [id, i]));
          const seedAt = new Map(seeds.map((id, i) => [id, i]));
          for (const group of saved.level) {
            for (let a = 0; a < group.length; a += 1) {
              for (let b = a + 1; b < group.length; b += 1) {
                const [x, y] = [group[a], group[b]];
                if (row.get(x).made) seen.flipMade += 1; else seen.flipMissed += 1;
                if (!row.get(x).made && (seedAt.get(x) < seedAt.get(y)) !== (firstAt.get(x) < firstAt.get(y))) seen.flipAfterLottery += 1;
                check((firstAt.get(x) < firstAt.get(y)) === (laterAt.get(x) > laterAt.get(y)), () => `${where}: ${x} and ${y} are level and a later round is not the reverse of their round one order`);
              }
            }
          }
        }
      }
      /* the draw itself */
      if (saved.lottery) {
        const cap = fleet.picks.lottery.maxClimb;
        for (const f of saved.lottery.field) {
          const slot = saved.first.indexOf(f.club) + 1;
          if (slot < f.seed) seen.climbs += 1;
          if (cap !== null && f.seed - slot === cap) seen.capped += 1;
          check(cap === null || f.seed - slot <= cap, () => `${where}: the club seeded ${f.seed} picks ${slot}, more than ${cap} places up`);
          check(slot - f.seed <= fleet.picks.lottery.draws, () => `${where}: the club seeded ${f.seed} fell to ${slot}, past every drawn pick`);
        }
      }
      /* one season is one night, however its rows arrive, and it survives a save */
      const shuffled = [...season.rows];
      for (let i = shuffled.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      seen.shuffles += 1;
      const again = O.buildDraftOrder({ ...season, rows: shuffled }, fleet.rules, fleet.picks);
      check(JSON.stringify(again) === JSON.stringify(saved), () => `${where}: the same season drew a different night when its rows came in another order`);
      check(O.isSavedDraftOrder(JSON.parse(JSON.stringify(saved)), clubs), () => `${where}: the order does not read back as valid after a save`);
    }
  }
  check(seen.climbs >= 1000 && seen.capped >= 20, `only ${seen.climbs} climbs and ${seen.capped} climbs stopped exactly at the cap, so the cap check is not looking at anything`);
  check(seen.flipMissed >= FLIP_FLOORS.missed && seen.flipMade >= FLIP_FLOORS.made && seen.flipAfterLottery >= FLIP_FLOORS.afterLottery,
    `the flip of level clubs off the lottery was hardly looked at: ${seen.flipMissed} pairs that missed, ${seen.flipMade} playoff pairs, ${seen.flipAfterLottery} pairs the lottery reordered first`);
  console.log(`   ${fleets.length} rule sets, 2000 leagues each: every round a permutation, each round by its rule, ${seen.climbs} climbs (${seen.capped} stopped exactly at the cap), ${seen.shuffles} reorderings drew the same night`);
  console.log(`   level clubs flipped in a later round off the lottery: ${seen.flipMissed} pairs that missed the playoffs (${seen.flipAfterLottery} of them reordered by the lottery first), ${seen.flipMade} playoff pairs`);

  /* FAIL CLOSED, the lead's decision 3: no lottery on a rule that cannot carry one. Each case below must come out as
     the plain order: nothing drawn, no lottery stream opened, the saved order saying why, and both rounds worst
     record first (this league has no level records and its playoff clubs are its best records). */
  {
    const NEEDS_TYPED = ['field', 'draws', 'table', 'restOfLottery', 'tieDraw', 'levelOdds', 'levelFirst']; // typed here: what a night's result rests on
    const season = ladder(30, 14);
    const thinOn = key => ({ ...NBA, facts: NBA.facts.map(f => (f.key === key ? { ...f, thin: true } : f)) });
    const cases = [
      ...NEEDS_TYPED.map(key => ({ name: `the fact ${key} read once`, rules: thinOn(key), picks: NBA_PICKS, season, why: 'thin-rule' })),
      { name: 'a fact the lottery needs missing', rules: { ...NBA, facts: NBA.facts.filter(f => f.key !== 'draws') }, picks: NBA_PICKS, season, why: 'thin-rule' },
      { name: 'a table of another name', rules: NBA, picks: { ...NBA_PICKS, lottery: { ...TABLE, table: 'a table this rule was not read against' } }, season, why: 'table' },
      { name: 'no table at all', rules: NBA, picks: { ...NBA_PICKS, lottery: null }, season, why: 'table' },
      { name: 'a playoff field of another size', rules: NBA, picks: NBA_PICKS, season: ladder(30, 12), why: 'field-size' },
      { name: 'a table one row short', rules: NBA, picks: { ...NBA_PICKS, lottery: { ...TABLE, odds: TABLE.odds.slice(0, -1) } }, season, why: 'field-size' },
      { name: 'a league with no lottery', rules: { ...NBA, lottery: null }, picks: NBA_PICKS, season, why: 'no-lottery' },
    ];
    let refused = 0;
    for (const c of cases) {
      tally.keys.length = 0;
      tally.draws = 0;
      const saved = O.buildDraftOrder(c.season, c.rules, c.picks);
      const plain = c.season.rows.map(r => r.id);
      if (saved.lottery === null && saved.plain === c.why) refused += 1;
      check(saved.lottery === null && saved.plain === c.why, `${c.name}: ${saved.lottery ? 'a lottery was drawn' : `no lottery, and the order says "${saved.plain}"`}; it must refuse with "${c.why}"`);
      check(sameList(saved.first, plain) && sameList(saved.later, plain), `${c.name}: the order is not the plain one, worst record first`);
      check(tally.keys.length === 0 && tally.draws === 0, `${c.name}: ${tally.keys.length} stream(s) opened and ${tally.draws} number(s) drawn for an order nobody may draw`);
      check(O.isSavedDraftOrder(JSON.parse(JSON.stringify(saved)), plain), `${c.name}: the plain order does not read back as valid`);
    }
    check(sameList([...NBA.lottery.needs].sort(), [...NEEDS_TYPED].sort()), `the NBA lottery needs ${NBA.lottery.needs.join(', ')}; a night's result rests on ${NEEDS_TYPED.join(', ')}`);
    /* and the same season with nothing wrong IS drawn, so the cases above are refusals and not a league that never draws */
    check(O.buildDraftOrder(season, NBA, NBA_PICKS).lottery !== null, 'the season the refusals are built on draws no lottery even when nothing is wrong');
    console.log(`   fail closed: ${refused} of ${cases.length} orders refused the lottery for the reason expected (a fact read once for each of the ${NEEDS_TYPED.length} needs, a missing fact, another table, no table, another field size, a short table, no lottery), each the plain order with nothing drawn`);
  }
}

/* A league's pick ledger after a summer of random trades, some of them his. */
const YEAR = 2026;
function tradedLedger(rng, clubs, me) {
  let ledger = P.newLedger(clubs, YEAR, NBA_PICKS);
  let moved = 0;
  const trades = 6 + Math.floor(rng() * 30);
  for (let t = 0; t < trades; t += 1) {
    /* most trades are of this year's picks, or the draft would hardly see one */
    const from = rng() < 0.7 ? ledger.picks.filter(p => p.year === YEAR) : ledger.picks;
    const pick = from[Math.floor(rng() * from.length)];
    const to = rng() < 0.25 ? me : clubs[Math.floor(rng() * clubs.length)];
    if (pick.holder === to) continue;
    if (pick.year === YEAR) moved += 1;
    ledger = P.movePicks(ledger, [P.pickKey(pick)], to);
  }
  return { ledger, moved };
}
const heldThisYear = (ledger, club) => ledger.picks.filter(p => p.year === YEAR && p.holder === club).length;

/* ---------- 5. slots over a ledger ---------- */
open(5);
{
  const rng = makeRng(505);
  const seen = { moved: 0, three: 0, none: 0, awarded: 0, leagues: 0 };
  for (let s = 0; s < 600; s += 1) {
    const season = randomSeason(rng);
    const clubs = season.rows.map(r => r.id);
    const me = clubs[Math.floor(rng() * clubs.length)];
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS);
    let { ledger, moved } = tradedLedger(rng, clubs, me);
    if (rng() < 0.3) { ledger = P.awardPick(ledger, YEAR, 1 + Math.floor(rng() * 2), clubs[Math.floor(rng() * clubs.length)], 'comp'); seen.awarded += 1; }
    seen.leagues += 1;
    seen.moved += moved;
    if (clubs.some(c => heldThisYear(ledger, c) >= 3)) seen.three += 1;
    if (clubs.some(c => heldThisYear(ledger, c) === 0)) seen.none += 1;
    const slots = O.draftSlots(saved, ledger, YEAR, NBA_PICKS.rounds);
    const held = ledger.picks.filter(p => p.year === YEAR);
    const where = `league ${s}`;
    const tag = (round, orig, kind, holder) => `${round}|${orig}|${kind}|${holder}`;
    check(slots.length === held.length, () => `${where}: the ledger holds ${held.length} picks for the year and the draft has ${slots.length} slots`);
    check(sameList(slots.map(x => tag(x.round, x.orig, x.kind, x.holder)).sort(), held.map(p => tag(p.round, p.orig, p.kind ?? 'std', p.holder)).sort()),
      () => `${where}: a pick is not used once by the club that holds it`);
    check(slots.every((x, i) => x.overall === i + 1), () => `${where}: the slots are not numbered 1 to ${slots.length}`);
    for (let round = 1; round <= NBA_PICKS.rounds; round += 1) {
      const inRound = slots.filter(x => x.round === round);
      const std = inRound.filter(x => x.kind === 'std');
      check(sameList(std.map(x => x.orig), round === 1 ? saved.first : saved.later), () => `${where}, round ${round}: the picks are not at the places of their first owners`);
      check(inRound.slice(0, std.length).every(x => x.kind === 'std'), () => `${where}, round ${round}: an awarded pick does not close the round`);
      check(inRound.every((x, i) => x.slot === i + 1), () => `${where}, round ${round}: the places in the round are not 1 to ${inRound.length}`);
    }
    /* the clock: every slot once, and a run never holds the club it stops for */
    let made = 0;
    const mine = [];
    for (let guard = 0; guard <= slots.length; guard += 1) {
      const run = O.slotsUntil(slots, made, me);
      check(run.every(x => x.holder !== me), () => `${where}: a run before his pick holds one of his own slots`);
      made += run.length;
      const next = O.nextSlot(slots, made);
      if (next === null) break;
      check(next.holder === me, () => `${where}: the run stopped at pick ${next.overall}, which is not his`);
      mine.push(next.overall);
      made += 1;
    }
    check(made === slots.length, () => `${where}: the clock stopped at ${made} of ${slots.length}`);
    check(sameList(mine, slots.filter(x => x.holder === me).map(x => x.overall)) && sameList(mine, O.slotsLeftFor(slots, 0, me).map(x => x.overall)), () => `${where}: he was put on the clock at ${mine.join(', ')}, which is not every slot he holds`);
  }
  check(seen.moved >= 1000 && seen.three >= 100 && seen.none >= 100 && seen.awarded >= 50, `the fleet is too tame to trust: ${seen.moved} picks moved, ${seen.three} leagues with a club on three picks, ${seen.none} with a club on none, ${seen.awarded} awarded picks`);
  console.log(`   ${seen.leagues} leagues: ${seen.moved} of this year's picks changed hands, ${seen.three} leagues hold a club with three or more picks and ${seen.none} a club with none, ${seen.awarded} awarded picks; every pick one slot, used by its holder at its first owner's place`);
}

/* ---------- 6. the saved order and the saved night ---------- */
open(6);
{
  const season = ladder(30, 14);
  const clubs = season.rows.map(r => r.id);
  const drawn = O.buildDraftOrder(season, NBA, NBA_PICKS);
  const plain = O.buildDraftOrder(season, TOY_PLAIN, NBA_PICKS);
  const playoffClub = clubs[29];
  const clone = v => JSON.parse(JSON.stringify(v));
  check(O.isSavedDraftOrder(clone(drawn), clubs) && O.isSavedDraftOrder(clone(plain), clubs), 'a valid order was refused');
  check(O.isSavedDraftOrder({ ...clone(drawn), rulesId: 'a-rule-this-build-never-had' }, clubs), 'an order drawn under a rule id this build does not know was refused; it must still read');
  const orderEdits = {
    'a club twice': o => { o.first[3] = o.first[2]; },
    'a club missing': o => { o.later.pop(); },
    'a wrong version': o => { o.v = 2; },
    'no rule id': o => { o.rulesId = ''; },
    'a win for a club outside the field': o => { o.lottery.wins[0].club = playoffClub; },
    'a win with the wrong seed': o => { o.lottery.wins[0].seed = (o.lottery.wins[0].seed % 14) + 1; },
    'two wins for one club': o => { o.lottery.wins[1].club = o.lottery.wins[0].club; o.lottery.wins[1].seed = o.lottery.wins[0].seed; },
    'the draws out of order': o => { o.lottery.wins[1].draw = 1; },
    'a seed out of place': o => { o.lottery.field[2].seed = 9; },
    'a chance that is not a number': o => { o.lottery.field[2].pct = 'high'; },
    'a playoff club in the lottery slots': o => { const at = o.first.indexOf(playoffClub); [o.first[0], o.first[at]] = [o.first[at], o.first[0]]; },
    /* an order that contradicts its own draw: the review's forged night, "drawn first" and picking 14th */
    'the club that was drawn first moved to the last lottery slot': o => { const at = o.first.indexOf(o.lottery.wins[0].club); [o.first[at], o.first[13]] = [o.first[13], o.first[at]]; },
    'two clubs the lottery never drew out of seed order': o => { [o.first[12], o.first[13]] = [o.first[13], o.first[12]]; },
    'a win at a slot its club does not hold': o => { o.lottery.wins[3].slot = 9; },
    'a reason and a lottery at once': o => { o.plain = 'thin-rule'; },
    'no lottery and no reason': o => { o.lottery = null; },
    'a drawing of one club': o => { o.level.push([clubs[0]]); },
    'a club from another league': o => { o.later[0] = 'ZZZ'; },
  };
  let refused = 0;
  for (const [name, edit] of Object.entries(orderEdits)) {
    const bad = clone(drawn);
    edit(bad);
    if (JSON.stringify(bad) === JSON.stringify(drawn)) { fail(`the corruption "${name}" changed nothing, so it proves nothing`); continue; }
    const ok = O.isSavedDraftOrder(bad, clubs);
    if (!ok) refused += 1;
    check(!ok, `a saved order with ${name} was accepted`);
  }
  check(!O.isSavedDraftOrder(clone(drawn), clubs.slice(1)) && !O.isSavedDraftOrder(null, clubs), 'an order for other clubs, or nothing at all, was accepted');

  const night = N.openDraftNight(drawn, O.draftSlots(drawn, P.newLedger(clubs, YEAR, NBA_PICKS), YEAR, NBA_PICKS.rounds), YEAR);
  check(N.isGmDraftNight(clone(night), clubs, YEAR) && N.isGmDraftNight({ ...clone(night), made: night.slots.length, seen: true }, clubs, YEAR), 'a valid night was refused');
  const nightEdits = {
    'a wrong version': n => { n.v = 2; },
    'the cursor past the last slot': n => { n.made = n.slots.length + 1; },
    'a cursor that is not a whole number': n => { n.made = 2.5; },
    'a holder from another league': n => { n.slots[5].holder = 'ZZZ'; },
    'a slot out of sequence': n => { n.slots[5].overall = 9; },
    'the rounds out of order': n => { n.slots[40].round = 1; },
    'a place that skips': n => { n.slots[7].slot = 3; },
    'a kind of pick that does not exist': n => { n.slots[7].kind = 'gift'; },
    'no slots': n => { n.slots = null; },
    'two picks out of the saved order': n => { [n.slots[2].orig, n.slots[3].orig] = [n.slots[3].orig, n.slots[2].orig]; },
    'a flag that is not yes or no': n => { n.seen = 'yes'; },
  };
  for (const [name, edit] of Object.entries(nightEdits)) {
    const bad = clone(night);
    edit(bad);
    const ok = N.isGmDraftNight(bad, clubs, YEAR);
    if (!ok) refused += 1;
    check(!ok, `a saved night with ${name} was accepted`);
  }
  check(!N.isGmDraftNight(clone(night), clubs, YEAR + 1), 'a night of another year was accepted as this year\'s');
  { const bad = clone(night); bad.order.first[0] = bad.order.first[1]; check(!N.isGmDraftNight(bad, clubs, YEAR), 'a night whose order is corrupt was accepted'); }
  console.log(`   ${refused} corruptions refused (${Object.keys(orderEdits).length} of a saved order, ${Object.keys(nightEdits).length} of a saved night); a valid one and an unknown rule id read back`);
}

/* ---------- 7. the reveals ---------- */
open(7);
{
  const rng = makeRng(707);
  const allowedMs = HOUSE_CEILING_MS * LOTTERY_USE;
  /* the pace, for every field up to twice the largest any league draws */
  const largest = Math.max(...Object.values(P.GM_PICK_RULES).map(r => r.lottery?.clubs ?? 0));
  for (let n = 1; n <= 2 * largest; n += 1) {
    const pace = R.lotteryRevealPace(n);
    check(pace.totalMs <= allowedMs && pace.step > 0 && pace.totalMs > pace.start * 1000, `a lottery of ${n} tiles takes ${pace.totalMs} ms; the rule is ${allowedMs} ms, three quarters of the house ceiling of ${HOUSE_CEILING_MS}`);
    /* totalMs is the END on screen: the last tile has turned and the closing line, which starts one step after it, is in.
       The two durations are typed here from the Chromium measurement of the review (a 14 tile night ran 300 ms past the old number). */
    const lastTurned = Math.round((pace.start + (n - 1) * pace.step + TURN_TYPED_S) * 1000);
    const closingIn = Math.round((pace.start + n * pace.step + CLOSE_TYPED_S) * 1000);
    check(pace.totalMs >= lastTurned && pace.totalMs >= closingIn, `a lottery of ${n} tiles reports ${pace.totalMs} ms, but its last tile has turned at ${lastTurned} and its closing line is in at ${closingIn}`);
    check(pace.closingMs === Math.round((pace.start + n * pace.step) * 1000), `a lottery of ${n} tiles starts its closing line at ${pace.closingMs} ms, which is not one step after its last tile`);
  }
  check(R.LOTTERY_REVEAL_TURN_S === TURN_TYPED_S && R.LOTTERY_REVEAL_CLOSE_S === CLOSE_TYPED_S, `the lib times a turn at ${R.LOTTERY_REVEAL_TURN_S} s and the closing line at ${R.LOTTERY_REVEAL_CLOSE_S} s; this harness was written for ${TURN_TYPED_S} and ${CLOSE_TYPED_S}`);
  /* The presenter's CSS takes both durations from the lib. A number typed in the style block is one the pace cannot see. */
  {
    let ui = readRepo(PRESENTER_UI).replace(/\/\*[\s\S]*?\*\//g, '');
    if (CONTROL === 'literaltime') {
      if (!ui.includes('animation: lrTurn var(--lr-turn)')) { console.error('control cannot run: the presenter does not time its turn off --lr-turn'); process.exit(3); }
      ui = ui.split('animation: lrTurn var(--lr-turn)').join('animation: lrTurn 0.5s');
    }
    check(/animation:\s*lrTurn var\(--lr-turn\)/.test(ui) && /animation:\s*lrAfter var\(--lr-close\)/.test(ui), 'the presenter does not take its two durations from --lr-turn and --lr-close');
    check(/'--lr-turn':\s*`\$\{LOTTERY_REVEAL_TURN_S\}s`/.test(ui) && /'--lr-close':\s*`\$\{LOTTERY_REVEAL_CLOSE_S\}s`/.test(ui), 'the presenter does not set --lr-turn and --lr-close from the lib\'s constants');
    check(!/animation:[^;}]*\d(\.\d+)?m?s\b/.test(ui), 'the presenter types a duration into an animation, where the lib\'s pace cannot see it');
  }
  /* lottery night: the field, once each, the last slot first */
  const seen = { mine: 0, notMine: 0, runsWithMine: 0, longAfterMine: 0, capped: 0, up: 0, down: 0, held: 0 };
  let longestNight = 0;
  for (let s = 0; s < 600; s += 1) {
    const season = randomSeason(rng);
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS);
    const club = season.rows[Math.floor(rng() * season.rows.length)].id;
    const label = id => `Club ${id}`;
    const view = L.lotteryNight(saved, club, label);
    const field = saved.lottery.field;
    const inField = field.some(f => f.club === club);
    if (inField) seen.mine += 1; else seen.notMine += 1;
    longestNight = Math.max(longestNight, view.totalMs);
    check(sameList(view.rows.map(r => r.slot), field.map((_, i) => field.length - i)), () => `league ${s}: lottery night does not run from the last lottery slot to the first pick`);
    check(sameList(view.rows.map(r => r.label).sort(), field.map(f => label(f.club)).sort()), () => `league ${s}: lottery night is not every lottery club exactly once`);
    check(view.rows.every(r => r.label === label(saved.first[r.slot - 1]) && r.seed === field.find(f => label(f.club) === r.label).seed && r.moved === r.seed - r.slot),
      () => `league ${s}: a tile's club, seed or move is not what the saved order holds`);
    check(view.rows.filter(r => r.mine).length === (inField ? 1 : 0) && view.rows.every(r => !r.mine || r.label === label(club)), () => `league ${s}: ${inField ? 'his tile is not flagged exactly once' : 'a tile is flagged his and he is not in the lottery'}`);
    check(view.totalMs <= allowedMs && view.reveal === true, () => `league ${s}: lottery night takes ${view.totalMs} ms against ${allowedMs}`);
    check(view.mineSlot === saved.first.indexOf(club) + 1 && view.headline.includes(L.ordinal(view.mineSlot)), () => `league ${s}: the headline does not say his club's slot`);
    /* and which way it went, worked out here from the saved order */
    if (inField) {
      const moved = field.find(f => f.club === club).seed - view.mineSlot;
      if (moved > 0) seen.up += 1; else if (moved < 0) seen.down += 1; else seen.held += 1;
      const want = moved > 0 ? `, up ${moved} place` : moved < 0 ? `, down ${-moved} place` : ` stays ${L.ordinal(view.mineSlot)}.`;
      check(view.headline.includes(want) && view.headline.includes("own pick"), () => `league ${s}: his club was seeded ${view.mineSlot + moved} and picks ${view.mineSlot}, and the closing line says "${view.headline}"`);
    }
  }
  /* the run: true numbers, at most nine rows, his own pick always, and a headline that counts every pick made */
  let longestRun = 0;
  for (let s = 0; s < 3000; s += 1) {
    const from = 1 + Math.floor(rng() * 40);
    const length = Math.floor(rng() * 30);
    const hisAt = rng() < 0.6 ? 0 : -1;
    const steps = [];
    for (let i = 0; i < length; i += 1) steps.push({ overall: from + i, team: i === hisAt ? 'ME' : `R${from + i}`, playerName: `Man ${from + i}`, pos: 'G', grade: 60 + ((from + i) % 30), mine: i === hisAt });
    const next = rng() < 0.7 ? { overall: from + length, round: 1, slot: from + length, orig: 'ME', holder: 'ME', kind: 'std' } : null;
    const got = N.draftRunReveal(steps, next);
    const rows = got.night.picks;
    const byNumber = new Map(steps.map(x => [x.overall, x]));
    if (hisAt === 0 && length > 0) seen.runsWithMine += 1;
    if (hisAt === 0 && length > MAX_ROWS) seen.longAfterMine += 1;
    if (length > MAX_ROWS) seen.capped += 1;
    longestRun = Math.max(longestRun, got.night.totalMs);
    check(rows.length === Math.min(length, MAX_ROWS) && got.hidden === length - rows.length, () => `run ${s}: ${rows.length} rows for ${length} picks`);
    check(rows.every(r => byNumber.has(r.overall) && byNumber.get(r.overall).playerName === r.playerName && byNumber.get(r.overall).grade === r.grade && byNumber.get(r.overall).team === r.team),
      () => `run ${s}: a row is not a pick that was made, with its true number`);
    check(rows.every((r, i) => i === 0 || rows[i - 1].overall < r.overall), () => `run ${s}: the rows are not in the order the picks were made`);
    if (hisAt === 0 && length > 0) check(rows.some(r => r.mine && r.overall === from), () => `run ${s}: his own pick at ${from} is not a row`);
    const rivals = steps.filter(x => !x.mine);
    if (rivals.length > 1) check(got.headline.includes(`Picks ${rivals[0].overall} to ${rivals[rivals.length - 1].overall} are in.`), () => `run ${s}: the headline does not count the ${rivals.length} picks made ("${got.headline}")`);
    if (rivals.length === 1) check(got.headline.includes(`Pick ${rivals[0].overall} is in.`), () => `run ${s}: the headline does not name the one pick made ("${got.headline}")`);
    check(next ? got.headline.endsWith(`You are on the clock at ${next.overall}.`) : got.headline.endsWith('Every pick of the draft is in.'), () => `run ${s}: the headline does not say what is next ("${got.headline}")`);
    check(got.night.totalMs <= HOUSE_CEILING_MS * 0.8, () => `run ${s}: the run takes ${got.night.totalMs} ms`);
  }
  check(seen.mine >= 100 && seen.notMine >= 100 && seen.runsWithMine >= 500 && seen.longAfterMine >= 200 && seen.capped >= 500, `the sample is too thin: ${JSON.stringify(seen)}`);
  check(DN.MAX_REVEALED === MAX_ROWS, `a run shows ${DN.MAX_REVEALED} rows at most, and this harness was written for ${MAX_ROWS}`);
  check(seen.up >= 20 && seen.down >= 50 && seen.held >= 20, `the closing line's direction was not looked at enough: ${seen.up} up, ${seen.down} down, ${seen.held} held`);
  console.log(`   lottery pace fits ${allowedMs} ms to the END of the run for 1 to ${2 * largest} tiles (largest real field ${largest}: 14 tiles end at ${R.lotteryRevealPace(14).totalMs} ms, 16 at ${R.lotteryRevealPace(16).totalMs}); 600 lottery nights (${seen.mine} with his tile: ${seen.up} up, ${seen.down} down, ${seen.held} held), longest ${longestNight} ms`);
  console.log(`   3000 runs: ${seen.capped} longer than ${MAX_ROWS} rows, ${seen.longAfterMine} of those after his own pick and it is always a row; longest run ${longestRun} ms against ${HOUSE_CEILING_MS}`);
}

/* ---------- 8. the "?" ---------- */
open(8);
{
  const saved = O.buildDraftOrder(ladder(30, 14), NBA, NBA_PICKS);
  const say = n => (Math.round(n * 10) / 10).toString();
  for (const [sport, pick] of Object.entries(P.GM_PICK_RULES)) {
    const table = pick.lottery;
    if (!table) continue;
    /* worked out here from the table: the worst record's chance, the best lottery record's, and the floor or the cap */
    const total = table.odds.reduce((a, b) => a + b, 0);
    const worst = say((table.odds[0] / total) * 100);
    const best = say((table.odds[table.odds.length - 1] / total) * 100);
    const text = L.lotteryExample(table).join(' ');
    check(text.includes(`is ${worst}%`) && text.includes(`gets ${best}%`), `${sport}: the worked example does not print ${worst}% and ${best}% ("${text}")`);
    if (table.maxClimb === null) check(text.includes(`${table.draws} picks are drawn`) && text.includes(`no lower than ${L.ordinal(table.draws + 1)}`), `${sport}: the worked example does not print the ${table.draws} drawn picks and the floor ("${text}")`);
    else check(text.includes(`more than ${table.maxClimb} places`) && text.includes(`the ${table.maxClimb + 1} worst records`), `${sport}: the worked example does not print the cap of ${table.maxClimb} ("${text}")`);
  }
  const blocks = L.lotteryHelp(saved, NBA, TABLE);
  const league = blocks.find(b => b.heading === "The league's rule");
  const game = blocks.find(b => b.heading === "This game's own");
  const example = blocks.find(b => b.heading === 'A worked example');
  check(!!league && !!game && !!example, 'the "?" does not hold the league\'s rule, the game\'s own and a worked example');
  /* The line under the heading. On a night drawn on the table it is the table's, typed here. */
  const TABLE_LINE = `${TABLE_TYPED.length} clubs are in the lottery and the top ${DRAWN_TYPED} picks are drawn. The 3 worst records share the best chance at the first pick, ${TABLE_TYPED[0]}% each.`;
  const line = L.lotteryNightRule(saved, TABLE);
  check(line === TABLE_LINE, `the line under the heading of a night drawn on the table is not the table's ("${line}")`);
  check(blocks.every(b => !b.lines.includes(line)), 'the "?" prints the line under the heading a second time; the card shows both at once');
  /* ON A NIGHT WHERE LEVEL CLUBS SHARED THEIR CHANCES THE LINE IS THAT NIGHT'S. Worked out here from the saved field:
     the best chance and how many clubs held it. The table's line would say three clubs hold 14% each on a night
     drawn on 14, 14, 13.3 and 13.2. */
  {
    const rng = makeRng(808);
    const seenLine = { asTable: 0, shared: 0, sharedTop: 0 };
    for (let s = 0; s < 600; s += 1) {
      /* every third league has no level records, so both kinds of night are in the sample */
      const night = O.buildDraftOrder(s % 3 === 0 ? ladder(30, 14, 2027 + s) : randomSeason(rng, 30, 16, 12), NBA, NBA_PICKS);
      if (!night.lottery) { fail(`league ${s}: no lottery was drawn (${night.plain})`); continue; }
      const pcts = night.lottery.field.map(f => f.pct);
      const got = L.lotteryNightRule(night, TABLE);
      if (pcts.every((p, i) => Math.abs(p - TABLE_TYPED[i]) < 1e-9)) {
        seenLine.asTable += 1;
        check(got === TABLE_LINE, () => `league ${s}: drawn on the table, and the line is "${got}"`);
        continue;
      }
      seenLine.shared += 1;
      const best = Math.max(...pcts);
      const holders = pcts.filter(p => Math.abs(p - best) < 1e-9).length;
      if (Math.abs(best - TABLE_TYPED[0]) > 1e-9 || holders !== 3) seenLine.sharedTop += 1;
      const want = holders > 1 ? `${holders} clubs shared the best chance at the first pick, ${say(best)}% each.` : `the best chance at the first pick was ${say(best)}%.`;
      check(got.endsWith(want) && got.startsWith(`${pcts.length} clubs are in the lottery and the top ${night.lottery.wins.length} picks are drawn.`),
        () => `league ${s}: the night was drawn on ${pcts.slice(0, 5).map(say).join(', ')}... and the line says "${got}"`);
      check(got !== TABLE_LINE, () => `league ${s}: level clubs shared their chances and the card still prints the table's line`);
      const ex = L.lotteryHelp(night, NBA, TABLE).find(b => b.heading === 'A worked example');
      check(!!ex && ex.lines[0].startsWith('By the table, ') && ex.lines[ex.lines.length - 1].includes(`the best chance was ${say(best)}%`), () => `league ${s}: the worked example does not say it is the table's, or does not give this night's own best chance`);
    }
    check(seenLine.asTable >= 100 && seenLine.shared >= 200 && seenLine.sharedTop >= 100, `the sample is too thin: ${JSON.stringify(seenLine)}`);
    console.log(`   600 nights: ${seenLine.asTable} drawn on the table and ${seenLine.shared} where level clubs shared their chances (${seenLine.sharedTop} of them at the top of the table); the line under the heading is the night's own every time`);
  }
  check(!!league && league.lines.some(l => l.includes('2019') && l.includes('2026')), 'the "?" does not say which of the league\'s drafts used this rule');
  check(!!game && game.lines.some(l => l.includes('2027')), 'the "?" does not say the league changed its lottery and the game did not');
  check(!!example && example.lines.join(' ').includes('14%') && example.lines.join(' ').includes('5th'), 'the worked example on the card is not the NBA table\'s');
  /* a night drawn under a rule this build does not carry: the saved table's own words, and no other rule's */
  const old = L.lotteryHelp({ ...saved, rulesId: 'a-rule-this-build-never-had' }, NBA, TABLE);
  check(old.length === 1 && old[0].lines.join(' ').includes(saved.lottery.table) && !old[0].lines.includes(NBA.leagueSays[0]),
    'an order drawn under an unknown rule does not degrade to its own saved table');
  check(!old[0].lines.join(' ').includes('a-rule-this-build-never-had'), 'the "?" prints a rule id, which is this code\'s name for a rule and not a word for a player');
  /* and with no table on hand the line under the heading is still the saved night's own */
  check(L.lotteryNightRule({ ...saved, rulesId: 'a-rule-this-build-never-had' }, null).startsWith(`${TABLE_TYPED.length} clubs are in the lottery and the top ${DRAWN_TYPED} picks are drawn.`), 'a night whose table this build does not carry has no line of its own');
  /* an order nobody drew: the reason under the heading, how round one runs behind the "?", and no reason that claims an order */
  {
    const plainOrder = O.buildDraftOrder(ladder(30, 14), NBA, { ...NBA_PICKS, lottery: null });
    const help = L.lotteryHelp(plainOrder, NBA, null);
    check(plainOrder.plain === 'table' && L.lotteryNightRule(plainOrder, null) === L.PLAIN_ORDER_WORDS.table, 'an order nobody drew does not say why under its heading');
    check(help[0]?.lines.length === 1 && help[0].lines[0] === L.PLAIN_ORDER_LINE && /missed the playoffs pick first/.test(L.PLAIN_ORDER_LINE), 'the "?" of an order nobody drew does not say how round one runs');
    for (const [why, words] of Object.entries(L.PLAIN_ORDER_WORDS)) check(!/standings|worst record/.test(words), `the reason "${why}" claims an order; the clubs that missed pick ahead of every playoff club whatever the records`);
    const view = L.lotteryNight(plainOrder, 'T22');
    check(view.headline === "Your club's own pick is 22nd in round one." && view.reveal === false, `an order nobody drew closes with "${view.headline}"`);
  }
  console.log(`   the worked example is computed for every lottery table on the pick rules; the card's three blocks hold the table's own numbers`);
}

/* ---------- 9. nothing mounts it ---------- */
open(9);
{
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const files = new Map();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.set(path.relative(ROOT, p).split(path.sep).join('/'), null);
    }
  })(path.join(ROOT, 'src'));
  const codeOf = rel => { if (files.get(rel) === null) files.set(rel, stripComments(readRepo(rel))); return files.get(rel); };
  if (CONTROL === 'mounted') {
    const board = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
    if (!files.has(board) || MOUNT_ALLOW.includes(board)) { console.error(`control cannot run: ${board} is missing or already allowed`); process.exit(3); }
    const before = codeOf(board);
    if (/GmLotteryCard/.test(before)) { console.error(`control cannot run: ${board} already names the card`); process.exit(3); }
    files.set(board, `import GmLotteryCard from '@/components/front-office-shared/GmLotteryCard';\n${before}`);
  }
  for (const rel of MOUNT_ALLOW) check(files.has(rel), `${rel} is on the allowlist and is not in the tree`);
  /* the lift's modules, by the names an import would carry */
  const LIFT = /\b(gmDraftOrder|gmDraftNight|gmLotteryNight|GmLotteryCard)\b/;
  const mounts = [];
  const oldOrder = [];
  for (const rel of files.keys()) {
    const code = codeOf(rel);
    if (!MOUNT_ALLOW.includes(rel) && LIFT.test(code)) mounts.push(rel);
    /* gmPicks' own draftOrder is the simplification this lift replaces: nobody may bind it by accident */
    if (rel !== 'src/lib/gmPicks.ts' && rel !== 'src/lib/gmPicks.test.ts' && /import\s*(type\s*)?\{[^}]*\bdraftOrder\b[^}]*\}\s*from\s*['"][^'"]*gmPicks['"]/.test(code)) oldOrder.push(rel);
  }
  for (const rel of mounts) fail(`${rel} names the lift and is not on the allowlist. A bind adds its files to MOUNT_ALLOW in this harness; nothing else may mount it.`);
  for (const rel of oldOrder) fail(`${rel} imports draftOrder from gmPicks, the order this lift replaces`);
  checks += files.size;
  /* the one lottery presenter knows no sport, no GM and no career: it may import these and nothing else */
  const PRESENTER = {
    'src/components/lottery/LotteryReveal.tsx': ['react', '@/lib/utils', '@/components/club-manager/Celebration', '@/lib/lotteryReveal'],
    'src/lib/lotteryReveal.ts': [],
  };
  for (const [rel, allowed] of Object.entries(PRESENTER)) {
    check(files.has(rel), `${rel} is not in the tree`);
    if (!files.has(rel)) continue;
    const froms = [...codeOf(rel).matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
    for (const f of froms) check(allowed.includes(f), `${rel} imports ${f}; the presenter is handed its rows and knows no sport, GM or career`);
    check(!/\b(nba|nfl|nhl|mlb|career|frontOffice)\b/i.test(codeOf(rel)), `${rel} names a sport, a career or a front office in its code`);
  }
  console.log(`   ${files.size} source files read with comments stripped: ${mounts.length} outside the ${MOUNT_ALLOW.length} allowed name the lift, ${oldOrder.length} import the old draftOrder; the presenter imports only what it is allowed`);
}

/* ---------- 10. the night, through a toy host ---------- */
open(10);
{
  const rng = makeRng(1010);
  const seen = { nights: 0, traded: 0, tradedMine: 0, clocks: 0, firstOverall: 0, noSlot: 0, three: 0, none: 0, reloads: 0 };
  const host = {
    consume(league, club, slot) {
      const at = league.markers[club].indexOf(slot.round);
      if (at < 0) return false;
      league.markers[club].splice(at, 1);
      return true;
    },
    sign(league, club, man, slot) { league.rosters[club].push(man.id); league.signed.push({ club, id: man.id, overall: slot.overall }); },
    need: (league, club) => ({ G: league.rosters[club].length === 0 ? 1 : 0 }),
    needWeight: 0.5,
    read: man => man.true,
    shown: man => man.scout,
    pos: man => man.pos,
    id: man => man.id,
    name: man => man.name,
  };
  for (let s = 0; s < 400; s += 1) {
    const season = randomSeason(rng);
    const clubs = season.rows.map(r => r.id);
    const me = clubs[Math.floor(rng() * clubs.length)];
    const saved = O.buildDraftOrder(season, NBA, NBA_PICKS);
    const { ledger } = tradedLedger(rng, clubs, me);
    const held = ledger.picks.filter(p => p.year === YEAR);
    const slots = O.draftSlots(saved, ledger, YEAR, NBA_PICKS.rounds);
    let night = N.openDraftNight(saved, slots, YEAR);
    const where = `night ${s}`;
    seen.nights += 1;
    check(night.slots.length === held.length, () => `${where}: the night holds ${night.slots.length} slots and the ledger ${held.length} picks for the year`);
    /* the league's markers come from the LEDGER, never from the slots under test */
    const league = { markers: Object.fromEntries(clubs.map(c => [c, []])), rosters: Object.fromEntries(clubs.map(c => [c, []])), signed: [] };
    for (const p of held) league.markers[p.holder].push(p.round);
    const cls = Array.from({ length: held.length + 4 }, (_, i) => {
      const truth = 95 - i * 0.45 + rng() * 0.3;
      return { id: `p${String(i).padStart(3, '0')}`, name: `Prospect ${s}-${i}`, pos: ['G', 'F', 'C'][Math.floor(rng() * 3)], true: truth, scout: Math.round(truth) + 3 + Math.floor(rng() * 6) };
    });
    const scoutOf = new Map(cls.map(m => [m.name, m.scout]));
    const idOf = new Map(cls.map(m => [m.name, m.id]));
    const mineHeld = held.filter(p => p.holder === me).length;
    seen.traded += held.filter(p => p.holder !== p.orig).length;
    seen.tradedMine += held.filter(p => p.holder === me && p.orig !== me).length;
    if (mineHeld === 0) seen.noSlot += 1;
    if (clubs.some(c => heldThisYear(ledger, c) >= 3)) seen.three += 1;
    if (clubs.some(c => heldThisYear(ledger, c) === 0)) seen.none += 1;
    let left = cls;
    const steps = [];
    tally.keys.length = 0;
    tally.draws = 0;
    const before = randomCalls;
    for (let guard = 0; guard <= held.length; guard += 1) {
      const run = N.advanceDraftNight(host, league, night, me, left);
      night = run.night; left = run.left; steps.push(...run.steps);
      if (run.done) break;
      seen.clocks += 1;
      const on = run.onClock;
      if (on && on.overall === 1) seen.firstOverall += 1;
      check(!!on && on.holder === me, () => `${where}: the run stopped at pick ${on?.overall}, held by ${on?.holder}; he is ${me}`);
      if (!on || on.holder !== me) break;
      check(night.made === on.overall - 1 && cls.length - left.length === on.overall - 1, () => `${where}: he is on the clock at ${on.overall} with ${night.made} slots used and ${cls.length - left.length} men gone`);
      /* a save and a reload in the middle of the night */
      const reloaded = JSON.parse(JSON.stringify(night));
      seen.reloads += 1;
      check(N.isGmDraftNight(reloaded, clubs, YEAR) && JSON.stringify(reloaded) === JSON.stringify(night), () => `${where}: the night does not survive a save while he is on the clock`);
      night = reloaded;
      const pick = N.userDraftPick(host, league, night, me, left, left[Math.floor(rng() * Math.min(3, left.length))].id);
      check(pick !== null && pick.step.mine && pick.step.overall === on.overall && pick.step.team === me, () => `${where}: his pick at ${on.overall} was refused or misreported`);
      if (!pick) break;
      night = pick.night; left = pick.left; steps.push(pick.step);
    }
    check(tally.keys.length === 0 && tally.draws === 0 && randomCalls === before, () => `${where}: the night drew ${tally.draws} keyed number(s) and called Math.random ${randomCalls - before} time(s)`);
    check(night.made === held.length && steps.length === held.length && left.length === 4, () => `${where}: ${night.made} slots used and ${steps.length} picks made of ${held.length}, ${left.length} men left of the 4 spare`);
    check(sameList(steps.map(x => x.overall), held.map((_, i) => i + 1)), () => `${where}: the picks are not numbered 1 to ${held.length} in the order they were made`);
    /* every pick is a man on the club that HOLDS the pick in the ledger, at the place of its first owner */
    const expectHolders = [];
    for (let round = 1; round <= NBA_PICKS.rounds; round += 1) {
      for (const orig of round === 1 ? saved.first : saved.later) expectHolders.push(held.find(p => p.round === round && p.orig === orig).holder);
    }
    check(sameList(league.signed.map(x => x.club), expectHolders) && sameList(steps.map(x => x.team), expectHolders), () => `${where}: a pick was not used by the club that holds it`);
    check(new Set(league.signed.map(x => x.id)).size === league.signed.length, () => `${where}: a man is on two rosters`);
    check(steps.every(x => league.rosters[x.team].includes(idOf.get(x.playerName))), () => `${where}: a pick on the card is not a man on that club`);
    check(clubs.every(c => league.rosters[c].length === heldThisYear(ledger, c) && league.markers[c].length === 0), () => `${where}: a club did not sign one man a pick it held`);
    check(steps.every(x => x.grade === scoutOf.get(x.playerName)), () => `${where}: a grade on the run is not his scout's read`);
    check(sameList(steps.filter(x => x.mine).map(x => x.overall), slots.filter(x => x.holder === me).map(x => x.overall)) && steps.every(x => x.mine === (x.team === me)), () => `${where}: the picks flagged his are not exactly his`);
  }
  check(seen.traded >= 1000 && seen.tradedMine >= 200 && seen.three >= 100 && seen.none >= 50 && seen.clocks >= 400 && seen.reloads >= 400,
    `the fleet is too tame to trust: ${JSON.stringify(seen)}`);
  console.log(`   ${seen.nights} nights: ${seen.traded} traded picks used by their holders (${seen.tradedMine} of them his), he was on the clock ${seen.clocks} times (${seen.firstOverall} at the first pick, ${seen.noSlot} nights with no slot at all) and saved and reloaded each time`);
}

/* ---------- the result ---------- */
Math.random = realRandom;
const red = Object.keys(failures).map(Number).filter(n => failures[n] > 0);
const count = n => `${n}: ${failures[n]}`;
if (!CONTROL) {
  if (red.length === 0) {
    console.log(`simGmDraftOrder: green. ${checks} checks over ${Object.keys(SECTION_NAMES).length} sections: the order is the league's, the lottery is drawn once on its own stream and saved, and nothing mounts the lift yet.`);
    process.exit(0);
  }
  console.log(`simGmDraftOrder: ${red.reduce((sum, n) => sum + failures[n], 0)} FAILURES, by section ${red.map(count).join(', ')}.`);
  process.exit(1);
}
const want = CONTROLS[CONTROL].expect;
if (sameList(red, want)) {
  console.log(`simGmDraftOrder: CONTROL ${CONTROL} FIRED. Red by section ${red.map(count).join(', ')}; every other section green.`);
  process.exit(1);
}
console.log(`simGmDraftOrder: CONTROL ${CONTROL} DID NOT FIRE AS EXPECTED. Red: ${red.map(count).join(', ') || 'nothing'}; it must turn exactly section(s) ${want.join(' and ')} red.`);
process.exit(2);
