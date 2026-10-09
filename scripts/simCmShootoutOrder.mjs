/*
 * Round 782 harness: the shootout order, from a player's report on 2026-09-23:
 *
 *   "let us have a choice of all 11 players like who will shoot 1 by 1 in
 *    penalty shootout so we do not lose"
 *
 * Before this round a Club Manager shootout was one draw: 0.5, plus the
 * strength gap times 0.012, plus the assigned penalty taker's edge, clamped
 * to 0.2..0.8. It still is, for every save that never set an order. With an
 * order set on the tactics tab (CareerState.shootoutOrder, player ids, up
 * to eleven) the shootout goes kick by kick: shootoutTakerOrder walks the
 * listed men still on the pitch in the manager's order, then the unlisted
 * in shirt order with the keeper last; the other side sends its eleven on
 * the pitch best first, keeper last; every kick is one draw against
 * shootoutKickChance, the base rate (0.76, about three in four, a tuning
 * value and not a sourced real world rate) up with the taker's edge and down with the
 * keeper's, each inside SHOOTOUT_TAKER_EDGE_CAP; five each, over early once
 * a side cannot be caught, then sudden death round the list. The report
 * carries every kick (MatchWeekReport.shootout), decidedBy and shootoutWon
 * exactly as before.
 *
 * Sections, each against the real engine bundled with esbuild:
 *   1) The walk, through the whole match. One base career (Real Madrid,
 *      NAMED_BASE_SEED since Release AL, whose first cup tie is against a
 *      side that names an eleven; the note under MEASURED says why it is not
 *      BASE_SEED any more) is simmed to its first cup week once; then N seeds play
 *      that cup match with a seven man order set (five men of the eleven
 *      and two bench men, listed second and fifth). For every match that
 *      reached a shootout, my first five kicks (or as many as were taken)
 *      must be the first five men of the order who finished the match, in
 *      that order, read off the report's own ratings sheet, subs, reds and
 *      injuries. 100 percent, a hard assert, with a floor on how many
 *      shootouts were reached and a floor on how many of them needed the
 *      skip to get the first five right, so neither can pass on an empty
 *      set. The scored share across every kick is printed and held to a
 *      wide band around the base rate. Their side through the same match:
 *      their first time round the list (every kick before a name comes up
 *      again), rated off their projected roster (the eleven and the bench
 *      are drawn from it, and every line of the report's own oppXi must
 *      match it), must come best first with their keeper last. Every
 *      shootout reached, with a floor.
 *   2) The order is worth something. The same eleven (ratings 90 down to
 *      62, a spread the cap bites on at both ends) against a copy of itself,
 *      on common random numbers: one arm kicks its five best first, the
 *      other its five worst first. The best first arm must win a larger
 *      share, by a floor set from measurement. The real Real Madrid eleven
 *      is measured the same way and printed, not asserted, because its
 *      spread is narrow and the gap small by design.
 *   3) The cap. Over every taker rating and keeper rating 40 to 99 the
 *      taker's edge and the keeper's edge each stay inside the cap and the
 *      kick's odds stay inside twice the cap of the base rate.
 *   4) Historical unmanaged play. scripts/data/cmShootoutUnset782.json holds,
 *      for 150 seeds of that same cup match with no order set, the result
 *      (how it was decided, who won the shootout, the score), the next
 *      number off the stream after the match, and a hash of the whole
 *      report and the save after it, written by the engine as it stood
 *      BEFORE this round (src/lib/clubManager.ts at origin/main 84d81619,
 *      unchanged since the branch point 9136539b). The engine now must
 *      reproduce the actual pre-1072 engine with automatic
 *      coaching bypassed, score, next draw and full content for every row.
 *      That engine is read out of git at one commit. Round 1072 pinned its
 *      own branch base, 42888161. Release AL (2026-10-07) moved the pin to
 *      5b70b05f, the main the round was merged onto, because main's engine
 *      had moved in eighteen commits since (Rounds 1035 to 1045) and the
 *      coachless merged engine can only equal the main it sits on: with the
 *      old pin 150 of 150 rows differed, with this one 150 of 150 are equal
 *      and the loaded old save is equal too. Whoever next merges an engine
 *      round under this one moves the pin to the main of that merge.
 *      The actual raw diagnostic showed only absent live versus live:null;
 *      those two forms alone compare alike after asserting live is inactive.
 *      Object keys are sorted, raw hashes and the first raw difference remain.
 *      That main already reproduced zero
 *      ancient fixture rows; both arms retain identical golden mismatch
 *      counts as evidence. Section 1 exercises current coached matches.
 *      The next number alone is a weak witness (the
 *      engine's later draws are conditional, so a stream shifted by one can
 *      fall back into step: under unsetpath it came out the same on 17 of
 *      the 28 shootout rows, and 8 of them matched on every other field);
 *      the hash catches all 28.
 *      Round 781 (the referee's board) moves every match's draws, so on the
 *      merge the fixture was written again, from Round 781's own engine
 *      before it met this round (the branch head 71df177e, an engine with
 *      no Round 782 code at all), the deliberate act the note at the foot of
 *      this header describes. The walk to the cup week runs on that engine
 *      too, so the base save differs and 15 of the 150 rows are shootouts
 *      now, still over the floor of 12; unsetpath still breaks all 15 (135
 *      of 150 reproduced) and turns section 5 red with them.
 *   5) An old save loads. A career written without the field comes back
 *      with no order, equals actual pre-1072 main on its unmanaged path,
 *      records both arms' ancient golden drift, and an
 *      order set on it survives a save and a load; a bad id is refused, and
 *      a loan signing (onLoan, a man on loan TO the club, who can start) is
 *      listed like anyone else.
 *   6) The keeper facing each kick. a) Through runShootout on common random
 *      numbers: the same eleven both sides and the same two keepers, 95 and
 *      55, one arm with the strong man behind me and one with him behind
 *      them. Every kick is read against the keeper facing it, so the first
 *      arm must win a far larger share, and in it my kicks must go in more
 *      often than theirs, each by a floor set from measurement. b) Through
 *      shootoutSides, which is what settleShootout hands to runShootout,
 *      exactly: my side is read against the man in the keeper's slot (an
 *      outfielder put in goal included), their side against their keeper,
 *      their ten best first with the keeper last, a side with nobody to name
 *      kicks eleven generated men at its strength against a keeper of that
 *      strength, and a side whose keeper has gone is read against nobody.
 *   7) A thin side is made up to eleven (Release AL). A side with no named
 *      eleven tonight kicks off its projected roster, and a thin club's
 *      roster can be two names. a) shootoutRosterSide, exactly: two names
 *      become eleven different men (the two kept, nine generated takers at
 *      the club's strength, their own keeper last), five names without a
 *      keeper get a generated one who kicks last and is the keeper my kicks
 *      are read against, ten get one more, a full roster is its best eleven
 *      as before, and nobody stays nobody. b) Through the whole match: the
 *      first career from BASE_SEED on whose first cup tie is against a side
 *      with names but no eleven (found by search, so a data round that fills
 *      one roster moves the walk on instead of emptying it), an order set,
 *      450 seeds. In every shootout no man of theirs comes up again inside
 *      their first eleven kicks and every taker who is not on their roster
 *      carries the generated mark, with a floor on the shootouts reached
 *      and a check that generated men kicked at all.
 *
 * Negative controls (house rule: prove the checks can fail), each a rewrite
 * of a copy of src/lib/clubManager.ts that refuses to run if its anchor is
 * not in the file:
 *   CM_SHOOTOUT_CONTROL=ignoreorder  settleShootout walks shirt order and
 *     ignores the manager's list. Section 1 must go red.
 *   CM_SHOOTOUT_CONTROL=noskip       shootoutTakerOrder stops skipping a
 *     listed man who is off the pitch. Section 1 must go red.
 *   CM_SHOOTOUT_CONTROL=nocap        shootoutKeeperEdge loses its clamp.
 *     Section 3 must go red.
 *   CM_SHOOTOUT_CONTROL=unsetpath    the one draw path takes one extra
 *     number off the stream first. Section 4 must go red (and 5 with it).
 *   CM_SHOOTOUT_CONTROL=ownkeeper    runShootout reads each kick against
 *     the kicking side's own keeper. Section 6a must go red.
 *   CM_SHOOTOUT_CONTROL=wrongkeeper  shootoutSides takes the last man who
 *     finished as my keeper. Section 6b must go red.
 *   CM_SHOOTOUT_CONTROL=nooppkeeper  shootoutSides never reads their keeper.
 *     Section 6b must go red (and 7a with it since Release AL, which reads
 *     a made up side's keeper through shootoutSides).
 *   CM_SHOOTOUT_CONTROL=oppworst     shootoutSides sends their worst first.
 *     Sections 1 and 6b must go red (and 7a, the same way).
 *   CM_SHOOTOUT_CONTROL=thinside     settleShootout hands a side with no
 *     named eleven its bare roster again, the expression it had before
 *     Release AL. Section 7b must go red (7a reads the function, which this
 *     leaves alone).
 *   CM_SHOOTOUT_CONTROL=nomakeup     shootoutRosterSide stops making a thin
 *     roster up. Sections 7a and 7b must go red.
 *   CM_SHOOTOUT_CONTROL=keeperonfull shootoutRosterSide gives a made up
 *     keeper to any side without one, a full roster included (Release AM,
 *     a mutation the review found alive). Section 7a must go red, on its
 *     keeperless thirteen and nothing else.
 *   CM_SHOOTOUT_CONTROL=keepleague   (Release AO) the arm that takes Round
 *     1052's league out of the coachless engine is not built, so this
 *     tree's world is held to the pinned engine as it stands. Sections 4
 *     and 5 must go red (every row differs). It refuses to run once the
 *     pinned engine holds the league itself.
 *
 * MEASURED, 2026-10-01, on the default seed and SIM_SEED=1 to 5 (six runs,
 * section 2 is 4000 paired shootouts an arm, 7 to 9 seconds a run):
 *   metric                                     fixed                                control                      floor / band
 *   shootouts reached in section 1             22, 24, 26, 25, 24, 32 of 150                                     floor 12
 *   first five kicks in listed order           all of them in every run             0 of 22 (ignoreorder, noskip) all
 *   the skip decided who took the first five   22, 24, 26, 25, 24, 32 (every one)                                floor 12
 *   scored share, all kicks                    80.6, 76.1, 75.9, 79.3, 72.9, 77.4 %                              band 62 to 90
 *   best five first minus worst five first     9.7, 9.4, 10.4, 9.2, 9.5, 11.0 pts                                floor 6
 *   Real Madrid's own eleven, same gap         2.3 points                                                        printed
 *   edges and odds past the cap                0 of 3600 pairs                      2355 (nocap)                 0
 *   biggest move off the base rate             0.120                                0.200 (nocap)                printed
 *   fixture rows reproduced                    150 of 150                           122 of 150 (unsetpath)       150
 *   fixture rows that are shootouts            28                                                                floor 12
 *     (the fixture as written again for Round 781: 150 of 150, 15 shootouts,
 *      135 of 150 under unsetpath)
 *
 * MEASURED, 2026-10-01, the keeper and their order (sections 1 and 6), the
 * same six runs, 4000 paired shootouts an arm in 6a:
 *   their first time round, best first         22, 24, 26, 25, 24, 32 (every one)  3 of 22 (oppworst)           all, floor 12
 *   strong keeper behind me minus behind them  44.2, 43.8, 44.4, 45.3, 44.4, 45.3  -44.2 (ownkeeper)            floor 30
 *     (win share; seed 0: 71.7 against 27.6)
 *   my kicks minus theirs, strong man behind me 11.7, 12.4, 11.9, 12.1, 12.4, 12.0 -12.3 (ownkeeper)            floor 8
 *     (seed 0: 85.8 against 74.1; the two edges allow 12)
 *   shootoutSides checks wrong                 0 of 6                               3 (wrongkeeper), 2           0
 *                                                                                   (nooppkeeper), 1 (oppworst)
 *
 * RELEASE AL, 2026-10-07: section 1 moved to its own base, and why. Round
 * 1040 (on main before this release) put the second divisions in the cup draw,
 * and the BASE_SEED career's first tie turned from Valencia into Eibar, whose
 * projected roster is two men. The harness went red on main's own tree with
 * three failures, all in section 1 (7 shootouts in 150, under each floor of
 * 12), and the reason it could not simply walk more matches is the second
 * thing measured: with 900 matches it reached 68 shootouts and passed, but
 * oppworst then left section 1 green (68 of 68 "best first"), because a side
 * that names no eleven kicks off its roster and Eibar's is a left back and a
 * keeper. Their order was being read off two names. So section 1 walks the
 * first cup tie of the career started on NAMED_BASE_SEED (Valencia again,
 * 22 on the roster), aborts if that tie is ever against a side that cannot
 * name an eleven with a keeper, fails a shootout whose report has no eleven
 * for them, and counts their order only when three or more different men
 * kicked. Sections 4 and 5 stay on BASE_SEED (the fixture and the pin are
 * written on it), where only 9 of the 150 live rows end on penalties now, so
 * section 4 also walks 300 seeds of the named base against the same pinned
 * main with its own floor, and section 5 probes a row main settles on
 * penalties in this run (the fixture's first shootout row, seed 782109, is
 * not one on the Eibar tie, and under unsetpath section 5 had stopped going
 * red with section 4).
 * MEASURED on the release tree, default seed and SIM_SEED=1 to 5. A run
 * plays about 1,500 cup matches now: 63 seconds with five other runs beside
 * it before section 7 was added, 263 and 279 seconds with section 7 on a
 * machine twenty agents had left short of memory, so start it detached:
 *   metric                                     fixed                                control                      floor / band
 *   shootouts reached in section 1             26, 23, 22, 25, 23, 21 of 150                                     floor 12
 *   first five kicks in listed order           all of them in every run             0 of 26 (ignoreorder, noskip) all
 *   the skip decided who took the first five   26, 23, 22, 25, 23, 21 (every one)                                floor 12
 *   their first time round, best first         26, 23, 22, 25, 23, 21 (every one)  1 of 26 (oppworst)           all, floor 12
 *   scored share, all kicks                    77.1, 80.5, 76.4, 75.4, 78.2, 79.6 %                              band 62 to 90
 *   rows equal main, fixture base              150 of 150 (9 on penalties)          141 of 150 (unsetpath)       150
 *   rows equal main, named base                300 of 300 (37 on penalties)         263 of 300 (unsetpath)       300, floor 12
 *   loaded old save equal main                 seed 782113, a shootout              differs (unsetpath)          equal
 *   the other four controls                    as above: 2355 past the cap (nocap), 27.6 against 71.7 (ownkeeper),
 *                                              3 wrong (wrongkeeper), 2 wrong (nooppkeeper)
 * And the thing the Eibar tie showed, fixed in the same release (section 7):
 * with an order set, a side with no named eleven kicked off its bare roster,
 * so Eibar's two names took every kick between them, the left back first,
 * the keeper second, the left back third. settleShootout now reads that
 * side through shootoutRosterSide, which keeps the names a thin roster has
 * and makes it up to eleven with generated, marked takers at the club's
 * strength. No save without an order walks that line (sections 4 and 5 hold
 * the one draw path equal to main on 450 rows), and a named eleven and a
 * full roster kick exactly as before.
 *   metric (section 7b, 450 matches a run)     fixed                                control                      floor
 *   shootouts reached against the thin side    27, 35, 33, 41, 31, 37                                            floor 12
 *   nobody twice inside eleven, all marked     all of them in every run             0 of 27 (thinside, nomakeup) all
 *   their kicks by generated men               112 of 141, 134 of 171, 157 of 194,  0 of 142 (thinside)          more than 0
 *                                              176 of 219, 137 of 169, 146 of 185
 *   shootoutRosterSide checks wrong (7a)       0 of 11                              8 (nomakeup), 0 (thinside)   0
 *     (eleven checks since Release AM added the keeperless thirteen; measured on a GitHub runner, 2026-10-08:
 *      0 wrong as committed, 8 under nomakeup as before, 1 under keeperonfull, 21 seconds a run)
 *
 * Measured once and not asserted, because it is a design fact rather than
 * a check: on the same shootouts (1500 seeds of that cup match, the order
 * changes nothing before the whistle) an order of the five best first won
 * 61.3 percent for Real Madrid against 67.6 with no order, 58.2 against
 * 64.3 for Burnley, and 45.9 against 42.9 for Getafe. The old one draw
 * reads the whole eleven's strength gap (0.012 a point, up to 0.8); kick by
 * kick reads only each taker and keeper inside the cap, so a strong side
 * does a little worse with an order set and a weaker one a little better.
 *
 * Regenerating the fixture is a deliberate act and only ever from an engine
 * whose unset path is known to be the pre Round 782 one:
 *   CM_SHOOTOUT_WRITE_FIXTURE=<path to that clubManager.ts> node scripts/simCmShootoutOrder.mjs
 *
 * Nothing here reads dist, and every match runs on a fixed clock (a few
 * engine ids carry Date.now and the hash covers the save), so it is safe
 * to run between builds and on any day.
 *
 * Run: node scripts/simCmShootoutOrder.mjs
 */
import './lib/seedRandom.mjs';
import { buildSync } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const TAG = `cmShootout.${process.pid}`;
const ENTRY = `${TMP}/${TAG}.entry.mjs`;
const BUNDLE = `${TMP}/${TAG}.bundle.mjs`;
const FIXTURE = `${ROOT}/scripts/data/cmShootoutUnset782.json`;

const CONTROL = process.env.CM_SHOOTOUT_CONTROL || '';
const KNOWN = ['ignoreorder', 'noskip', 'nocap', 'unsetpath', 'ownkeeper', 'wrongkeeper', 'nooppkeeper', 'oppworst', 'thinside', 'nomakeup', 'keeperonfull', 'keepleague'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_SHOOTOUT_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(2); /* 2, like a runtime error below: a control that never ran must not read as one that fired (1) */
}
const WRITE_FIXTURE = process.env.CM_SHOOTOUT_WRITE_FIXTURE || '';
const sourceBytes = WRITE_FIXTURE ? [] : [`${ROOT}/src/lib/clubManager.ts`, FIXTURE].map(file => ({ file, bytes: fs.readFileSync(file) }));
const runtimeErrors = [];
const captureRuntime = error => { runtimeErrors.push({ name: error?.name, message: String(error?.message ?? error) }); process.exitCode = 2; };
process.on('uncaughtExceptionMonitor', captureRuntime);
process.on('unhandledRejection', captureRuntime);
/* Release AN: a crash is not a failed check. Node ends an uncaught error with code 1, the code of a control
   that fired, whatever exitCode says; a review saw section 7 crash under a mutation and read as a red. */
process.on('uncaughtException', error => { console.error(error); process.exit(2); });

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(1); };
let mutation = null;
const swap = (src, from, to, where) => {
  const hits = src.split(from).length - 1;
  if (hits !== 1) {
    console.error(`control cannot run: ${where} is not in the shape CM_SHOOTOUT_CONTROL=${CONTROL} rewrites`);
    console.error(`  looked for: ${JSON.stringify(from)}`);
    process.exit(2);
  }
  const changed = src.replace(from, to);
  mutation = { control: CONTROL, where, hits, beforeHash: createHash('sha256').update(src).digest('hex'),
    afterHash: createHash('sha256').update(changed).digest('hex'), changed: src !== changed };
  return changed;
};

/* ---------- the engine, or a control's copy of it ---------- */
let enginePath = WRITE_FIXTURE ? path.resolve(WRITE_FIXTURE).replaceAll('\\', '/') : `${ROOT_URL}/src/lib/clubManager.ts`;
if (CONTROL) {
  let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
  if (CONTROL === 'ignoreorder') {
    engine = swap(engine,
      'squadByIds(state, shootoutTakerOrder(order, onIds, myKeeper?.id ?? null))',
      'squadByIds(state, shootoutTakerOrder([], onIds, myKeeper?.id ?? null))',
      'settleShootout (the walk over the order)');
  } else if (CONTROL === 'noskip') {
    engine = swap(engine,
      '    if (on.has(id) && !out.includes(id)) out.push(id);\n',
      '    if (!out.includes(id)) out.push(id);\n',
      'shootoutTakerOrder (the skip for a man off the pitch)');
  } else if (CONTROL === 'nocap') {
    engine = swap(engine,
      '  return clamp((keeperRating - 75) * 0.004, -SHOOTOUT_TAKER_EDGE_CAP, SHOOTOUT_TAKER_EDGE_CAP);\n',
      '  return (keeperRating - 75) * 0.004;\n',
      'shootoutKeeperEdge (the clamp)');
  } else if (CONTROL === 'unsetpath') {
    engine = swap(engine,
      '  if (!order) return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) };\n',
      '  if (!order) { Math.random(); return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) }; }\n',
      'settleShootout (the one draw path)');
  } else if (CONTROL === 'ownkeeper') {
    engine = swap(engine,
      '    const p = shootoutKickChance(taker, them.keeperRating);\n',
      '    const p = shootoutKickChance(taker, us.keeperRating);\n',
      'runShootout (the keeper each kick is read against)');
  } else if (CONTROL === 'wrongkeeper') {
    engine = swap(engine,
      "  const myKeeper = finished.find(x => x.slot?.allowed.includes('GK'))?.p ?? finished.find(x => !x.slot && x.p.position === 'GK')?.p ?? null;\n",
      '  const myKeeper = finished[finished.length - 1]?.p ?? null;\n',
      'shootoutSides (my keeper, read off the slot)');
  } else if (CONTROL === 'nooppkeeper') {
    engine = swap(engine,
      '      keeperRating: oppKeeper?.r ?? (theirs.length ? null : oppS),\n',
      '      keeperRating: null,\n',
      'shootoutSides (their keeper)');
  } else if (CONTROL === 'oppworst') {
    engine = swap(engine,
      '  const oppTakers = [...theirs.filter(p => p !== oppKeeper)].sort((a, b) => b.r - a.r);\n',
      '  const oppTakers = [...theirs.filter(p => p !== oppKeeper)].sort((a, b) => a.r - b.r);\n',
      'shootoutSides (their order, best first)');
  } else if (CONTROL === 'thinside') {
    engine = swap(engine,
      '    : shootoutRosterSide(oppRosterFor(state, fx.opponent), oppS);\n',
      '    : [...oppRosterFor(state, fx.opponent)].sort((a, b) => b.r - a.r).slice(0, SHOOTOUT_MAX_ORDER);\n',
      'settleShootout (the side with no named eleven)');
  } else if (CONTROL === 'nomakeup') {
    engine = swap(engine,
      '  if (!side.length) return side;\n',
      '  if (side.length) return side;\n',
      'shootoutRosterSide (a thin roster made up to eleven)');
  } else if (CONTROL === 'keeperonfull') {
    engine = swap(engine,
      "  if (side.length < SHOOTOUT_MAX_ORDER && !side.some(p => p.p === 'GK')) side.push(",
      "  if (!side.some(p => p.p === 'GK')) side.push(",
      'shootoutRosterSide (a keeper only for a side short of eleven)');
  }
  const copy = `${TMP}/${TAG}.control.engine.ts`;
  fs.writeFileSync(copy, engine);
  enginePath = copy;
}

/* Keep the frozen pre-coaching fixture on its unmanaged path. Current
   coached matches are checked separately against the men who finished. */
const historicalPath = `${TMP}/${TAG}.historical.engine.ts`;
const baselinePath = `${TMP}/${TAG}.baseline428.engine.ts`;
let historicalEnginePath = enginePath;
let baselineEnginePath = enginePath;
let baselineSourceHash = null;
/* the coachless engine with Round 1052's league taken out (Release AO, below); null when the arm is not needed */
const leagueOutPath = `${TMP}/${TAG}.leagueout.engine.ts`;
let leagueOutEnginePath = null;
if (!WRITE_FIXTURE) {
  const source = readLF(enginePath);
  const header = 'export function coachQuickMatch(career: CareerState): CareerState {\n';
  if (source.split(header).length - 1 !== 1) abort('Historical no-coach arm needs one executable coach header');
  /* Round 1146: and with no own goals. Since that round the engine now and
     then re-labels a goal the match already had as an own goal (a keyed tag,
     no draw), which moves who is credited and nothing else. The comparison
     below is against an engine from before own goals, so the arm that walks
     its path leaves the one tagging call out. What that buys: every row of
     sections 4 and 5 still has to equal pre-1072 main in result, next draw
     AND full content, so every other edit that round made to the engine is
     held to changing nothing at all while no goal is tagged. The other half
     (the tag itself moves no result and no draw) is scripts/simCmOwnGoals.mjs
     section 1. */
  const ownGoalCall = '  tagOwnGoals(state, live, fx, half, me.goals, oppGoals);\n';
  if (source.split(ownGoalCall).length - 1 !== 1) abort('Historical arm needs the one own goal call to take out');
  const coachless = source.replace(header, header + '  return career;\n').replace(ownGoalCall, '');
  fs.writeFileSync(historicalPath, coachless);
  historicalEnginePath = historicalPath;
  const baselineSource = execFileSync('git', ['show', '5b70b05f6df7b15f64b8c5ddf1f4b7d0c7cd4c7f:src/lib/clubManager.ts'], { cwd: ROOT, encoding: 'utf8' });
  fs.writeFileSync(baselinePath, baselineSource);
  baselineSourceHash = createHash('sha256').update(baselineSource).digest('hex');
  baselineEnginePath = baselinePath;
  /* Release AO (2026-10-08): Round 1052 put a league into Club Manager's
     world (the Russian Premier League), and a career draws its week from
     every club of that world, so on a tree that holds the league no row of
     sections 4 and 5 can equal an engine that does not (0 of 150 and 0 of
     300 on the merged tree, 150 and 300 on Release AN's). No commit holds
     the league without Round 1072, so the pin cannot simply move. The same
     arm Round 1052 gave simCareerLeagueSeasons: a row that differs is played
     once more on this tree's coachless engine with the league taken out in
     memory (its rules row, its league row and its nation, the three things
     that round appended to the engine's tables). Equal then, the move is
     that round's and is counted and printed; still different, it fails as
     before. The arm is built only while the pinned engine does not hold the
     league: once the pin moves to a main that does, it is not needed and a
     difference fails outright. The cut runs on the same source the coachless
     arm is made from, so every control still reaches it (unsetpath is the
     one that proves the arm cannot hide a changed unmanaged path). */
  const R1052_LEAGUES = ['russia'];
  const R1052_NATIONS = ['russia'];
  const armNeeded = R1052_LEAGUES.some(id => !baselineSource.includes(`    id: '${id}',`));
  if (CONTROL === 'keepleague' && !armNeeded) { console.error('control cannot run: the pinned engine already holds the league, so there is no arm to take away'); process.exit(2); }
  if (armNeeded && CONTROL !== 'keepleague') {
    let out = coachless;
    const cut = (start, end, what) => {
      const a = out.indexOf(start);
      const z = a < 0 ? -1 : out.indexOf(end, a);
      if (a < 0 || z < 0 || out.indexOf(start, a + 1) >= 0) abort(`Round 1052 arm: ${what} is not in clubManager.ts exactly once`);
      out = out.slice(0, a) + out.slice(z + end.length);
    };
    for (const id of R1052_LEAGUES) { cut(`\n  ${id}: {\n`, '\n  },', `the rules row ${id}`); cut(`\n  {\n    id: '${id}',`, '\n  },', `the league row ${id}`); }
    for (const id of R1052_NATIONS) cut(`\n  { id: '${id}', name: `, ' },', `the nation ${id}`);
    fs.writeFileSync(leagueOutPath, out);
    leagueOutEnginePath = leagueOutPath;
  }
}

fs.writeFileSync(ENTRY, `
let slot = {};
globalThis.localStorage = {
  getItem: k => (k in slot ? slot[k] : null),
  setItem: (k, v) => { slot[k] = String(v); },
  removeItem: k => { delete slot[k]; },
  clear: () => { slot = {}; },
};
export const cm = await import('${enginePath}');
export const historical = await import('${historicalEnginePath}');
export const baseline = await import('${baselineEnginePath}');
export const leagueOut = ${leagueOutEnginePath ? `await import('${leagueOutEnginePath}')` : 'null'};
`);
/* esbuild through its own module rather than a path under ROOT, so a worktree
   that resolves node_modules by walking up (no junction, ever) bundles too. */
buildSync({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` } });
const { cm, historical, baseline, leagueOut } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, saveCareer, loadCareer, resolveXI, effectiveXIWithSlots, oppRosterFor,
  setShootoutOrder, shootoutOrderOf, runShootout, shootoutTakerOrder, shootoutSides, shootoutRosterSide,
  shootoutKickChance, shootoutTakerEdge, shootoutKeeperEdge,
  SHOOTOUT_TAKER_EDGE_CAP, SHOOTOUT_BASE_RATE,
} = cm;
const needed = WRITE_FIXTURE
  ? { startCareer, playNextEntry }
  : { startCareer, playNextEntry, saveCareer, loadCareer, resolveXI, effectiveXIWithSlots, oppRosterFor, setShootoutOrder, shootoutOrderOf, runShootout, shootoutTakerOrder, shootoutSides, shootoutRosterSide, shootoutKickChance, shootoutTakerEdge, shootoutKeeperEdge };
for (const [name, fn] of Object.entries(needed)) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}

/* ---------- seeds ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* A fixed clock too: a few engine ids carry Date.now, and the fixture's
   hash covers the whole save, so the replay must not read the real time. */
const FIXED_NOW = Date.UTC(2026, 9, 1);
function withSeed(seed, fn) {
  const saved = Math.random;
  const savedNow = Date.now;
  Math.random = mulberry32(seed >>> 0);
  Date.now = () => FIXED_NOW;
  try { return fn(); } finally { Math.random = saved; Date.now = savedNow; }
}
/** FNV-1a over a string, as hex: the witness that two runs drew the same numbers all the way through. */
function fnv(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
const SIM_SEED = Number.isFinite(Number(process.env.SIM_SEED)) ? Number(process.env.SIM_SEED) : 0;
/* The base career and the fixture walk fixed seeds whatever SIM_SEED says,
   because the fixture was written on them. SIM_SEED moves sections 1 and 2. */
const BASE_SEED = 782_001;
const FIXTURE_SEEDS = Array.from({ length: 150 }, (_, i) => 782_100 + i);
const CLUB = 'Real Madrid';

let failures = 0;
let section = 0;
const failedSections = {};
const fail = m => { failures += 1; (failedSections[section] ??= []).push(m); console.error('  FAIL: ' + m); };
const pct = x => `${(x * 100).toFixed(1)}%`;

/* ---------- the base career, simmed to its first cup week ---------- */
const reachCup = (engine, baseSeed = BASE_SEED) => withSeed(baseSeed, () => {
  const start = engine.startCareer(CLUB);
  const cupIdx = start.calendar.findIndex(e => e.type === 'cup');
  if (cupIdx < 0) abort(`${CLUB} has no cup entry in its calendar`);
  /* playNextEntry hands back after every match, so the walk to the cup week is a loop. */
  let s = start;
  for (let guard = 0; s.week < cupIdx && guard < 60; guard++) {
    const r = engine.playNextEntry(s, { skipHalftime: true, untilWeek: cupIdx });
    s = r.state;
    if (r.kind === 'reached') break;
    if (r.kind !== 'match') abort(`could not sim to the cup week: got ${r.kind} at week ${s.week} (wanted ${cupIdx})`);
  }
  if (s.week !== cupIdx) abort(`could not sim to the cup week: stopped at week ${s.week} (wanted ${cupIdx})`);
  return s;
});
const atCup = reachCup(cm);
const historicalCup = WRITE_FIXTURE ? atCup : reachCup(historical);
const baselineCup = WRITE_FIXTURE ? atCup : reachCup(baseline);
const leagueOutCup = leagueOut ? reachCup(leagueOut) : null;
/* rows of sections 4 and 5 that equal the pinned engine only with Round 1052's league taken out */
let by1052 = 0;
const cupEntry = atCup.calendar[atCup.week];
console.log(`   base: ${CLUB}, cup ${cupEntry.cupRound} in week ${atCup.week}, squad ${atCup.squad.length}, no order set: ${!('shootoutOrder' in atCup)}`);

/** One cup match from the base, on a seed, and the next number off the stream once it is over. */
function playCup(state, seed, engine = cm) {
  return withSeed(seed, () => {
    const r = engine.playNextEntry(state, { skipHalftime: true });
    if (r.kind !== 'match' || !r.report) abort(`seed ${seed}: the cup week did not play a match (${r.kind})`);
    if (r.report.competition !== 'cup') abort(`seed ${seed}: played a ${r.report.competition} match, not the cup`);
    const rep = r.report;
    return {
      seed, decidedBy: rep.decidedBy, shootoutWon: rep.shootoutWon ?? null,
      homeGoals: rep.homeGoals, awayGoals: rep.awayGoals, next: Math.random(),
      /* Everything the match wrote, the report and the save after it. The
         next number off the stream alone is a weak witness: the engine's
         later draws are conditional, so a stream shifted by one can land on
         the same count by the end (17 of the 28 shootout rows did, measured
         under unsetpath). The other results, ratings and books drawn after
         the shootout cannot all land the same. */
      hash: fnv(JSON.stringify({ report: rep, state: r.state })),
      report: rep,
      state: r.state,
    };
  });
}
const row = ({ seed, decidedBy, shootoutWon, homeGoals, awayGoals, next, hash }) => ({ seed, decidedBy, shootoutWon, homeGoals, awayGoals, next, hash });
const sortedJSON = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
function compareContent(candidate, baseline) {
  const readings = [candidate, baseline].map(out => {
    const present = Object.prototype.hasOwnProperty.call(out.state, 'live');
    const inactive = !present || out.state.live === null;
    if (!inactive) fail(`seed ${out.seed}: historical comparison contains an active live match`);
    const state = { ...out.state };
    if (state.live === null) delete state.live;
    const content = sortedJSON({ report: out.report, state });
    return { present, inactive, content, hash: createHash('sha256').update(content).digest('hex') };
  });
  const [a, b] = readings;
  const sameResult = ['seed', 'decidedBy', 'shootoutWon', 'homeGoals', 'awayGoals', 'next'].every(key => candidate[key] === baseline[key]);
  return { paired: sameResult && a.inactive && b.inactive && a.content === b.content,
    canonicalWitness: { candidate: a.hash, baseline: b.hash },
    allowedLive: { candidate: { present: a.present, inactive: a.inactive }, baseline: { present: b.present, inactive: b.inactive } } };
}

/* ---------- fixture writing: a deliberate act, from a pre 782 engine ---------- */
if (WRITE_FIXTURE) {
  const rows = FIXTURE_SEEDS.map(s => row(playCup(atCup, s)));
  const pens = rows.filter(r => r.decidedBy === 'pens').length;
  fs.writeFileSync(FIXTURE, JSON.stringify({
    note: 'Round 782: the pre round shootout outcome of one cup match, by seed, with no order set. Written from the engine named in writtenFrom. Replayed by scripts/simCmShootoutOrder.mjs section 4; regenerate only from an engine whose one draw path is known to be the pre 782 one.',
    writtenFrom: path.basename(WRITE_FIXTURE), writtenOn: new Date().toISOString().slice(0, 10),
    club: CLUB, baseSeed: BASE_SEED, cupWeek: atCup.week, cupRound: cupEntry.cupRound, rows,
  }, null, 1) + '\n');
  console.log(`   wrote ${rows.length} rows (${pens} shootouts) to ${path.relative(ROOT, FIXTURE)}`);
  process.exit(0);
}

/* Section 1's own base, since Release AL (2026-10-07). Round 1040 put the
   second divisions in the cup, and BASE_SEED's first tie turned from Real
   Madrid v Valencia into Real Madrid v Eibar. Eibar's projected roster is two
   men, so they name no eleven, a level 120 minutes went from about one match
   in six to about one in sixteen (7 shootouts in the 150, under the floor of
   12; 348 in 5,400 over six seeds), and "their order" was being read off two
   names, which oppworst could not turn red (68 of 68 still "best first").
   Sections 4 and 5 stay on BASE_SEED, because the fixture and the comparison
   with main are written on it. Section 1 walks the first cup tie of the
   career started on NAMED_BASE_SEED, which is Valencia again (22 on the
   roster), and refuses to run if that ever stops being a side that names an
   eleven with a keeper. */
const NAMED_BASE_SEED = 782_002;
const atNamedCup = reachCup(cm, NAMED_BASE_SEED);
const namedOpp = atNamedCup.cupDraw?.[atNamedCup.calendar[atNamedCup.week].cupRound];
{
  const r = namedOpp ? oppRosterFor(atNamedCup, namedOpp) : [];
  const keepers = r.filter(p => p.p === 'GK').length;
  if (!namedOpp || keepers < 1 || r.length - keepers < 10) {
    abort(`section 1's base (seed ${NAMED_BASE_SEED}) drew ${namedOpp ?? 'nobody'}, whose roster of ${r.length} (${keepers} keepers) cannot name an eleven, so their order would be read off nobody; pick a base seed whose first cup tie is against a full roster`);
  }
  console.log(`   section 1 base: seed ${NAMED_BASE_SEED}, cup ${atNamedCup.calendar[atNamedCup.week].cupRound} against ${namedOpp} (${r.length} on their roster, ${keepers} keepers); the fixture base's tie is against ${atCup.cupDraw?.[cupEntry.cupRound] ?? 'unknown'} (${oppRosterFor(atCup, atCup.cupDraw?.[cupEntry.cupRound] ?? '').length} on theirs)`);
}
const nameOf = new Map(atNamedCup.squad.map(p => [p.id, p.name]));
/** A club's projected roster by name (rating and position), as section 1's base career sees it. */
const rosters = new Map();
const rosterOf = club => {
  if (!rosters.has(club)) rosters.set(club, new Map(oppRosterFor(atNamedCup, club).map(p => [p.n, p])));
  return rosters.get(club);
};
const idsOfName = new Map();
for (const p of atNamedCup.squad) idsOfName.set(p.name, [...(idsOfName.get(p.name) ?? []), p.id]);

/* ================================================================== */
console.log('1) The walk, through the whole match: my first five kicks are the first five listed men who finished');
section = 1;
/* ================================================================== */
{
  const xi = resolveXI(atNamedCup).filter(Boolean);
  const bench = atNamedCup.squad.filter(p => !p.onLoan && !xi.some(x => x.id === p.id)).sort((a, b) => b.rating - a.rating);
  /* Five of the eleven (not the keeper, a mix of lines so the walk is not
     the rating order by accident) and two bench men who are off the pitch
     unless a change brings one on. The bench men sit second and fifth, so
     every shootout has to skip them to get the first five right. */
  const outfield = xi.filter(p => p.position !== 'GK');
  const picks = [outfield[outfield.length - 1], outfield[0], outfield[Math.floor(outfield.length / 2)], outfield[1], outfield[outfield.length - 2]];
  const order = [picks[0].id, bench[0].id, picks[1].id, picks[2].id, bench[1].id, picks[3].id, picks[4].id];
  const ordered = setShootoutOrder(atNamedCup, order);
  if (!ordered) abort('setShootoutOrder refused a list of seven men from the squad');
  if (JSON.stringify(ordered.shootoutOrder) !== JSON.stringify(order)) fail(`the order was not kept as given: ${JSON.stringify(ordered.shootoutOrder)}`);
  console.log(`   order: ${order.map(id => nameOf.get(id)).join(', ')}`);

  let reached = 0;
  let inOrder = 0;
  let kicksAll = 0;
  let scoredAll = 0;
  let noDetail = 0;
  let skipsSeen = 0;
  let oppChecked = 0;
  let oppBestFirst = 0;
  const OPP_CHECKED_FLOOR = 12;
  const N = 150;
  for (let i = 0; i < N; i++) {
    const seed = 782_500 + SIM_SEED * 1000 + i;
    const out = playCup(ordered, seed);
    const rep = out.report;
    if (rep.decidedBy !== 'pens') {
      if (rep.shootout) fail(`seed ${seed}: a match decided ${rep.decidedBy} carries shootout kicks`);
      continue;
    }
    reached += 1;
    const d = rep.shootout;
    if (!d || !Array.isArray(d.kicks) || !d.kicks.length) { noDetail += 1; fail(`seed ${seed}: a shootout with an order set carries no kicks`); continue; }
    /* The men who finished: everyone on the ratings sheet minus anyone subbed off, sent off or carried off. */
    const det = rep.detail;
    const played = new Set();
    for (const r of det.myRatings) {
      const ids = idsOfName.get(r.name) ?? [];
      if (ids.length !== 1) abort(`seed ${seed}: ${r.name} maps to ${ids.length} ids in the squad; pick a club with unique names`);
      played.add(ids[0]);
    }
    const off = new Set();
    for (const s of det.subs) {
      const ids = idsOfName.get(s.off) ?? [];
      if (ids.length !== 1) abort(`seed ${seed}: substituted ${s.off} maps to ${ids.length} ids in the squad`);
      off.add(ids[0]);
    }
    for (const c of det.cards) if (c.kind === 'red' && c.id) off.add(c.id);
    for (const inj of det.injuries) if (inj.id) off.add(inj.id);
    const finished = [...played].filter(id => !off.has(id));
    const expected = order.filter(id => finished.includes(id)).map(id => nameOf.get(id));
    /* A shootout where the skip decided who took one of the first five. */
    if (JSON.stringify(expected.slice(0, 5)) !== JSON.stringify(order.slice(0, 5).map(id => nameOf.get(id)))) skipsSeen += 1;
    const mineKicks = d.kicks.filter(k => k.side === 'me').map(k => k.taker);
    const n = Math.min(5, mineKicks.length, expected.length);
    const got = mineKicks.slice(0, n);
    const want = expected.slice(0, n);
    if (JSON.stringify(got) === JSON.stringify(want)) inOrder += 1;
    else fail(`seed ${seed}: my first kicks were ${got.join(', ')} but the order says ${want.join(', ')}`);
    /* Their side, through the same match: their first time round the list
       (every kick before a name comes up again), each man's rating and
       position read off their projected roster, which is where the eleven
       and the bench that came on are drawn from (the starters' lines match
       the report's own oppXi; checked below). Best first, so never a man
       rated above the one before him, and their keeper, if he got that far,
       last. Counted when three or more different men kicked before a name
       came up again (no shootout is over before three each, so every one
       against a named eleven counts; it was two until Release AL, and a
       side with two names on its roster then counted with nothing to read). */
    const oppClub = [rep.home, rep.away].find(c => c !== CLUB);
    if (oppClub !== namedOpp) abort(`seed ${seed}: the tie was against ${oppClub}, not the ${namedOpp} the base drew`);
    const oppBy = rosterOf(oppClub);
    if ((det.oppXi ?? []).length !== 11) fail(`seed ${seed}: ${oppClub} went to penalties with ${(det.oppXi ?? []).length} men on their sheet, so there is no named eleven to read their order off`);
    for (const p of det.oppXi ?? []) {
      const q = oppBy.get(p.n);
      if (!q || q.r !== p.r || q.p !== p.p) { fail(`seed ${seed}: ${p.n} (${p.p} ${p.r}) on their sheet is not on their roster that way, so the roster cannot stand in for the ratings`); break; }
    }
    const theirKicks = d.kicks.filter(k => k.side === 'opp').map(k => k.taker);
    const again = theirKicks.findIndex((t, j) => theirKicks.indexOf(t) !== j);
    const round1 = again < 0 ? theirKicks : theirKicks.slice(0, again);
    if (round1.length >= 3 && round1.every(t => oppBy.has(t))) {
      oppChecked += 1;
      const lines = round1.map(t => oppBy.get(t));
      const outfield = lines.filter(p => p.p !== 'GK').map(p => p.r);
      const gkAt = lines.findIndex(p => p.p === 'GK');
      if (outfield.some((r, j) => j > 0 && r > outfield[j - 1])) fail(`seed ${seed}: their kicks went ${round1.map(t => `${t} ${oppBy.get(t).r}`).join(', ')}, not best first`);
      else if (gkAt >= 0 && gkAt !== round1.length - 1) fail(`seed ${seed}: their keeper kicked ${gkAt + 1} of ${round1.length}, not last`);
      else oppBestFirst += 1;
    }
    /* The count on the report agrees with the kicks, and with who went through. */
    const last = d.kicks[d.kicks.length - 1];
    if (last.mine !== d.mine || last.theirs !== d.theirs) fail(`seed ${seed}: the final count ${d.mine}-${d.theirs} is not the last kick's ${last.mine}-${last.theirs}`);
    if ((d.mine > d.theirs) !== !!rep.shootoutWon) fail(`seed ${seed}: shootoutWon ${rep.shootoutWon} disagrees with the count ${d.mine}-${d.theirs}`);
    if (d.mine === d.theirs) fail(`seed ${seed}: a shootout ended level ${d.mine}-${d.theirs}`);
    /* Five each at least, unless it was over early, and the sides alternate. */
    const mineN = mineKicks.length;
    const theirN = d.kicks.length - mineN;
    if (Math.abs(mineN - theirN) > 1) fail(`seed ${seed}: ${mineN} kicks to ${theirN}, the sides did not alternate`);
    for (let k = 1; k < d.kicks.length; k++) if (d.kicks[k].side === d.kicks[k - 1].side) { fail(`seed ${seed}: two kicks in a row by ${d.kicks[k].side}`); break; }
    kicksAll += d.kicks.length;
    scoredAll += d.kicks.filter(k => k.result === 'scored').length;
  }
  const scoredShare = kicksAll ? scoredAll / kicksAll : NaN;
  console.log(`   ${N} cup matches, ${reached} shootouts, ${inOrder} with my first kicks in the listed order, ${skipsSeen} where skipping a listed man off the pitch changed who took the first five`);
  console.log(`   ${kicksAll} kicks, scored share ${pct(scoredShare)} (base rate ${SHOOTOUT_BASE_RATE})`);
  console.log(`   their first time round the list read off their roster in ${oppChecked} shootouts, best first with the keeper last in ${oppBestFirst}`);
  if (reached < 12) fail(`only ${reached} shootouts in ${N} matches, below the floor of 12, the assert has nothing to bite on`);
  if (oppChecked < OPP_CHECKED_FLOOR) fail(`their order could be read in only ${oppChecked} shootouts, below the floor of ${OPP_CHECKED_FLOOR}`);
  if (skipsSeen < 12) fail(`the skip decided the first five in only ${skipsSeen} shootouts, below the floor of 12, so the skip is not being tested`);
  if (inOrder !== reached - noDetail) fail(`the first five kicks followed the order in ${inOrder} of ${reached} shootouts, not all of them`);
  if (!(scoredShare >= 0.62 && scoredShare <= 0.90)) fail(`scored share ${pct(scoredShare)} is outside 62 to 90 percent`);
}

/* ================================================================== */
console.log('2) The order is worth something: five best first beats five worst first, on common random numbers');
section = 2;
/* ================================================================== */
{
  const ratings = [90, 88, 86, 84, 82, 78, 74, 70, 66, 64, 62];
  const synth = ratings.map((r, i) => ({ name: `m${i}`, rating: r }));
  const keeper = 75;
  const theirs = { takers: synth.map(p => ({ ...p, name: `t${p.name}` })), keeperRating: keeper };
  const bestFirst = { takers: [...synth].sort((a, b) => b.rating - a.rating), keeperRating: keeper };
  const worstFirst = { takers: [...synth].sort((a, b) => a.rating - b.rating), keeperRating: keeper };
  const N = 4000;
  const share = side => {
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const seed = 782_900_000 + SIM_SEED * 10_000 + i;
      const d = withSeed(seed, () => runShootout({ mine: side, theirs, myFirst: i % 2 === 0 }));
      if (d.mine > d.theirs) wins += 1;
    }
    return wins / N;
  };
  const best = share(bestFirst);
  const worst = share(worstFirst);
  const gap = best - worst;
  console.log(`   synthetic eleven 90..62 vs itself, ${N} shootouts an arm: best five first ${pct(best)}, worst five first ${pct(worst)}, gap ${(gap * 100).toFixed(1)} points`);
  /* Measured 2026-10-01 over the default seed and SIM_SEED 1..5: see the
     header. The floor sits well under the lowest run (9.2). */
  const FLOOR = 0.06;
  if (!(gap >= FLOOR)) fail(`best five first beats worst five first by ${(gap * 100).toFixed(1)} points, under the floor of ${FLOOR * 100}`);

  /* The real eleven, measured and printed. Its spread is a few points, so the gap is small by design. */
  const xi = resolveXI(atCup).filter(Boolean);
  const gk = xi.find(p => p.position === 'GK') ?? xi[0];
  const out = xi.filter(p => p !== gk).map(p => ({ name: p.name, rating: p.rating }));
  const realTheirs = { takers: [...out].sort((a, b) => b.rating - a.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const realBest = { takers: [...out].sort((a, b) => b.rating - a.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const realWorst = { takers: [...out].sort((a, b) => a.rating - b.rating).concat({ name: gk.name, rating: gk.rating }), keeperRating: gk.rating };
  const rb = (() => { let w = 0; for (let i = 0; i < N; i++) { const d = withSeed(782_950_000 + i, () => runShootout({ mine: realBest, theirs: realTheirs, myFirst: i % 2 === 0 })); if (d.mine > d.theirs) w += 1; } return w / N; })();
  const rw = (() => { let w = 0; for (let i = 0; i < N; i++) { const d = withSeed(782_950_000 + i, () => runShootout({ mine: realWorst, theirs: realTheirs, myFirst: i % 2 === 0 })); if (d.mine > d.theirs) w += 1; } return w / N; })();
  console.log(`   ${CLUB}'s eleven (outfield ${Math.min(...out.map(p => p.rating))} to ${Math.max(...out.map(p => p.rating))}): best first ${pct(rb)}, worst first ${pct(rw)}, gap ${((rb - rw) * 100).toFixed(1)} points (printed, not asserted)`);
}

/* ================================================================== */
console.log('3) The cap: no edge and no kick moves past it, either way');
section = 3;
/* ================================================================== */
{
  let pairs = 0;
  let bad = 0;
  let worst = 0;
  for (let t = 40; t <= 99; t++) {
    const te = shootoutTakerEdge({ rating: t });
    if (Math.abs(te) > SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`taker edge at ${t} is ${te}, past the cap ${SHOOTOUT_TAKER_EDGE_CAP}`); }
    for (let k = 40; k <= 99; k++) {
      pairs += 1;
      const ke = shootoutKeeperEdge(k);
      const p = shootoutKickChance({ rating: t }, k);
      const move = Math.abs(p - SHOOTOUT_BASE_RATE);
      worst = Math.max(worst, move);
      if (Math.abs(ke) > SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`keeper edge at ${k} is ${ke}, past the cap ${SHOOTOUT_TAKER_EDGE_CAP}`); }
      if (move > 2 * SHOOTOUT_TAKER_EDGE_CAP + 1e-12) { bad += 1; if (bad <= 3) fail(`kick odds at taker ${t} vs keeper ${k} are ${p.toFixed(4)}, ${move.toFixed(4)} off the base rate, past twice the cap`); }
      if (Math.abs(p - (SHOOTOUT_BASE_RATE + te - ke)) > 1e-12) { bad += 1; if (bad <= 3) fail(`kick odds at ${t} vs ${k} are not base plus taker minus keeper`); }
    }
  }
  if (shootoutKeeperEdge(null) !== 0 || shootoutKeeperEdge(undefined) !== 0) fail('a shootout with no keeper rating moves the odds');
  console.log(`   ${pairs} taker and keeper pairs 40 to 99: ${bad} past the cap, the biggest move off the base rate ${worst.toFixed(3)} (twice the cap is ${(2 * SHOOTOUT_TAKER_EDGE_CAP).toFixed(3)})`);
  if (bad) fail(`${bad} edges or kicks moved past the cap`);
}

/* ================================================================== */
console.log('4) Historical unmanaged play equals actual pre-1072 main, with ancient golden drift recorded');
section = 4;
/* ================================================================== */
let fixture = null;
const baselineEvidence = { baselineRef: '5b70b05f', baselineSourceHash, rows: [], oldLoad: null };
{
  if (!fs.existsSync(FIXTURE)) abort(`the fixture ${path.relative(ROOT, FIXTURE)} is missing; see the header for how it is written`);
  fixture = JSON.parse(readLF(FIXTURE));
  if (fixture.club !== CLUB || fixture.baseSeed !== BASE_SEED || fixture.cupWeek !== historicalCup.week) {
    fail(`the fixture was written for ${fixture.club} seed ${fixture.baseSeed} week ${fixture.cupWeek}, this run is ${CLUB} ${BASE_SEED} ${historicalCup.week}`);
  }
  if (fixture.rows.length !== FIXTURE_SEEDS.length) fail(`the fixture holds ${fixture.rows.length} rows, the harness walks ${FIXTURE_SEEDS.length} seeds`);
  let same = 0;
  let pens = 0;
  let withKicks = 0;
  let shown = 0;
  let sameBaseline = 0;
  let sameRaw = 0;
  let baselineGolden = 0;
  for (const want of fixture.rows) {
    let out = playCup(historicalCup, want.seed, historical);
    const baselineOut = playCup(baselineCup, want.seed, baseline);
    const base = row(baselineOut);
    let content = compareContent(out, baselineOut);
    if (!content.paired && leagueOut) {
      /* Release AO: once more with Round 1052's league taken out of this tree's coachless engine */
      const alt = playCup(leagueOutCup, want.seed, leagueOut);
      const altContent = compareContent(alt, baselineOut);
      if (altContent.paired) { out = alt; content = altContent; by1052 += 1; }
    }
    const got = row(out);
    const goldenCandidate = JSON.stringify(got) === JSON.stringify(want);
    const goldenBaseline = JSON.stringify(base) === JSON.stringify(want);
    const rawPaired = JSON.stringify(got) === JSON.stringify(base);
    if (!rawPaired && !baselineEvidence.firstDifference) baselineEvidence.firstDifference = {
      seed: want.seed, candidate: { report: out.report, state: out.state },
      baseline: { report: baselineOut.report, state: baselineOut.state },
    };
    baselineEvidence.rows.push({ seed: want.seed, candidate: got, baseline: base, goldenCandidate, goldenBaseline, rawPaired, ...content });
    if (rawPaired) sameRaw += 1;
    if (content.paired) sameBaseline += 1;
    else if (shown++ < 3) console.error(`  differs from actual pre-1072 main, seed ${want.seed}: got ${JSON.stringify(got)}, baseline ${JSON.stringify(base)}`);
    if (goldenBaseline) baselineGolden += 1;
    if (goldenCandidate !== goldenBaseline) fail(`ancient golden mismatch differs from actual pre-1072 main at seed ${want.seed}`);
    if (out.report.shootout) withKicks += 1;
    if (want.decidedBy === 'pens') pens += 1;
    if (goldenCandidate) same += 1;
  }
  console.log(`   ${same} of ${fixture.rows.length} rows reproduced (${pens} of them shootouts, written from ${fixture.writtenFrom} on ${fixture.writtenOn}); ${withKicks} carried kicks`);
  console.log(`   ${sameBaseline} of ${fixture.rows.length} rows equal actual pre-1072 main in result, next draw and full content (${sameRaw} raw hashes); ancient golden mismatches candidate ${fixture.rows.length - same}, baseline ${fixture.rows.length - baselineGolden}`);
  baselineEvidence.summary = { rows: fixture.rows.length, paired: sameBaseline, rawPaired: sameRaw,
    goldenCandidateMismatches: fixture.rows.length - same, goldenBaselineMismatches: fixture.rows.length - baselineGolden };
  if (by1052) console.log(`   ${by1052} of those rows equal it only with Round 1052's league taken out of this tree's world in memory (the move is that round's)`);
  baselineEvidence.summary.by1052 = by1052;
  if (sameBaseline !== fixture.rows.length) fail(`${fixture.rows.length - sameBaseline} rows differ from the actual pre-1072 engine with no order set`);
  if (same !== baselineGolden) fail(`ancient golden matching counts differ: candidate ${same}, actual pre-1072 main ${baselineGolden}`);
  if (withKicks) fail(`${withKicks} reports carried shootout kicks with no order set`);
  if (pens < 12) fail(`the fixture holds only ${pens} shootouts, under the floor of 12`);

  /* Release AL (2026-10-07): the same comparison on section 1's base. The
     floor above counts the ancient fixture's own rows, and since Round 1040
     turned the BASE_SEED tie into Eibar only 9 of the 150 live rows end on
     penalties, so the one draw path the comparison is here for was walked 9
     times. Valencia's tie walks it 14 times in the same 150 seeds and 37
     times in 300, so this walk takes 300 (the fixture's 150 and the next
     150), and the floor below is on the rows main's engine settles on
     penalties in THIS run. */
  const NAMED_SEEDS = Array.from({ length: 300 }, (_, i) => FIXTURE_SEEDS[0] + i);
  const namedHistorical = reachCup(historical, NAMED_BASE_SEED);
  const namedBaseline = reachCup(baseline, NAMED_BASE_SEED);
  let namedSame = 0;
  let namedPens = 0;
  let namedKicks = 0;
  const namedLeagueOut = leagueOut ? reachCup(leagueOut, NAMED_BASE_SEED) : null;
  let namedBy1052 = 0;
  for (const seed of NAMED_SEEDS) {
    let out = playCup(namedHistorical, seed, historical);
    const baselineOut = playCup(namedBaseline, seed, baseline);
    let content = compareContent(out, baselineOut);
    if (!content.paired && leagueOut) {
      const alt = playCup(namedLeagueOut, seed, leagueOut);
      const altContent = compareContent(alt, baselineOut);
      if (altContent.paired) { out = alt; content = altContent; namedBy1052 += 1; }
    }
    if (content.paired) namedSame += 1;
    else if (shown++ < 3) console.error(`  differs from actual pre-1072 main on section 1's base, seed ${seed}: got ${JSON.stringify(row(out))}, baseline ${JSON.stringify(row(baselineOut))}`);
    if (baselineOut.decidedBy === 'pens') namedPens += 1;
    if (out.report.shootout) namedKicks += 1;
  }
  const livePens = baselineEvidence.rows.filter(r => r.baseline.decidedBy === 'pens').length;
  console.log(`   on section 1's base: ${namedSame} of ${NAMED_SEEDS.length} rows equal actual pre-1072 main in result, next draw and full content, ${namedPens} of them settled on penalties by main (${livePens} on the fixture's base)`);
  if (namedBy1052) console.log(`   ${namedBy1052} of those rows equal it only with Round 1052's league taken out of this tree's world in memory`);
  baselineEvidence.namedBase = { seed: NAMED_BASE_SEED, rows: NAMED_SEEDS.length, paired: namedSame, pens: namedPens, by1052: namedBy1052 };
  if (namedSame !== NAMED_SEEDS.length) fail(`${NAMED_SEEDS.length - namedSame} rows on section 1's base differ from the actual pre-1072 engine with no order set`);
  if (namedKicks) fail(`${namedKicks} reports on section 1's base carried shootout kicks with no order set`);
  if (namedPens < 12) fail(`main settles only ${namedPens} of the rows on section 1's base on penalties, under the floor of 12, so the one draw path is barely walked`);
}

/* ================================================================== */
console.log('5) An old save loads with no order, holds its historical unmanaged play, and keeps a chosen order');
section = 5;
/* ================================================================== */
{
  localStorage.clear();
  const old = JSON.parse(JSON.stringify(historicalCup));
  delete old.shootoutOrder;
  if (!saveCareer(old)) fail('saveCareer refused the old shape');
  const back = loadCareer();
  if (!back) abort('loadCareer returned null for a save without the field');
  if ('shootoutOrder' in back) fail('a save written without the field came back with one');
  if (shootoutOrderOf(back) !== null) fail('shootoutOrderOf reads an order off a save that has none');
  /* The probe is a row main's engine settled on penalties in THIS run
     (section 4 just played all of them), so the old save walks the one draw
     path. The fixture's own first shootout row stopped being one when the
     base tie changed (Release AL note in the header), and the comparison
     then never reached the draw it is here for. */
  const pensNow = new Set(baselineEvidence.rows.filter(r => r.baseline.decidedBy === 'pens').map(r => r.seed));
  const probe = fixture?.rows?.find(r => pensNow.has(r.seed));
  if (!probe) fail(`none of the ${fixture?.rows?.length ?? 0} rows is a shootout on main's engine, so the old save never walks the one draw path`);
  if (probe) {
    let out = playCup(back, probe.seed, historical);
    const baselineOld = JSON.parse(JSON.stringify(baselineCup));
    delete baselineOld.shootoutOrder;
    if (!baseline.saveCareer(baselineOld)) abort('Actual pre-1072 main refused its old save');
    const baselineBack = baseline.loadCareer();
    if (!baselineBack) abort('Actual pre-1072 main could not open its old save');
    const baselineOut = playCup(baselineBack, probe.seed, baseline);
    const base = row(baselineOut);
    let content = compareContent(out, baselineOut);
    let oldBy1052 = false;
    if (!content.paired && leagueOut) {
      /* Release AO: the same old save, written, loaded and played by this tree's
         coachless engine with Round 1052's league taken out (section 4's arm) */
      const oldOut = JSON.parse(JSON.stringify(leagueOutCup));
      delete oldOut.shootoutOrder;
      if (!leagueOut.saveCareer(oldOut)) abort('the league out engine refused its old save');
      const backOut = leagueOut.loadCareer();
      if (!backOut) abort('the league out engine could not open its old save');
      if ('shootoutOrder' in backOut) fail('the league out engine gave an old save an order');
      const alt = playCup(backOut, probe.seed, leagueOut);
      const altContent = compareContent(alt, baselineOut);
      if (altContent.paired) { out = alt; content = altContent; oldBy1052 = true; }
    }
    const got = row(out);
    const goldenCandidate = JSON.stringify(got) === JSON.stringify(probe);
    const goldenBaseline = JSON.stringify(base) === JSON.stringify(probe);
    const rawPaired = JSON.stringify(got) === JSON.stringify(base);
    baselineEvidence.oldLoad = { seed: probe.seed, candidate: got, baseline: base, goldenCandidate, goldenBaseline, rawPaired, by1052: oldBy1052, ...content };
    if (oldBy1052) console.log(`   the old save equals actual pre-1072 main only with Round 1052's league taken out of this tree's world in memory`);
    if (!content.paired) fail(`the loaded old save differs from actual pre-1072 main at seed ${probe.seed}: ${JSON.stringify(got)} vs ${JSON.stringify(base)}`);
    if (goldenCandidate !== goldenBaseline) fail('The loaded old save has a different ancient golden mismatch from actual pre-1072 main');
    console.log(`   loaded old save, seed ${probe.seed} (one of ${pensNow.size} rows main settles on penalties, decided ${base.decidedBy}): equal actual pre-1072 main ${content.paired}; ancient golden matches candidate ${goldenCandidate}, baseline ${goldenBaseline}`);
  }
  const ids = back.squad.filter(p => !p.onLoan).slice(0, 4).map(p => p.id);
  const set = setShootoutOrder(back, ids);
  if (!set) abort('setShootoutOrder refused four men from the squad');
  if (!saveCareer(set)) fail('saveCareer refused a save with an order');
  const again = loadCareer();
  if (!again || JSON.stringify(again.shootoutOrder) !== JSON.stringify(ids)) fail(`an order of four did not survive save and load: ${JSON.stringify(again?.shootoutOrder)}`);
  if (setShootoutOrder(back, ['not-a-player']) !== null) fail('setShootoutOrder accepted a man who is not in the squad');
  /* onLoan is a loan signing, a man on loan TO the club who can start, so he
     can be listed; a man sent out on loan has left the squad for loanedOut. */
  const loanee = { ...back.squad[0], id: 'loanee-782', name: 'Loan Signing', onLoan: true, loanFrom: 'Elsewhere FC' };
  const withLoanee = { ...back, squad: [...back.squad, loanee] };
  const listedLoanee = setShootoutOrder(withLoanee, [loanee.id]);
  if (!listedLoanee || JSON.stringify(shootoutOrderOf(listedLoanee)) !== JSON.stringify([loanee.id])) fail('setShootoutOrder refused a loan signing, who is in the squad and can start');
  const cleared = setShootoutOrder(set, []);
  if (!cleared || 'shootoutOrder' in cleared) fail('clearing the order left the field on the save');
  console.log(`   order of ${ids.length} kept through save and load, a stranger refused, a loan signing listed, an empty list takes the field off`);
}

/* ================================================================== */
console.log('6) The keeper facing each kick, and the other side\'s order');
section = 6;
/* ================================================================== */
{
  /* a) Through runShootout, on common random numbers: the same eleven on
     both sides, best first, and the same two keepers, a strong one and a
     weak one. One arm has the strong man behind me, the other has him
     behind them. Every kick is read against the keeper FACING it, so my
     kicks go in more often when theirs is the weak one, theirs less often,
     and the first arm wins the larger share. */
  const ratings = [90, 88, 86, 84, 82, 78, 74, 70, 66, 64, 62];
  const eleven = ratings.map((r, i) => ({ name: `k${i}`, rating: r }));
  const STRONG = 95;
  const WEAK = 55;
  const N = 4000;
  const arm = (myKeeper, theirKeeper) => {
    let wins = 0;
    const kicks = { me: 0, opp: 0 };
    const scored = { me: 0, opp: 0 };
    for (let i = 0; i < N; i++) {
      const seed = 782_960_000 + SIM_SEED * 10_000 + i;
      const d = withSeed(seed, () => runShootout({
        mine: { takers: eleven, keeperRating: myKeeper },
        theirs: { takers: eleven.map(p => ({ ...p, name: `t${p.name}` })), keeperRating: theirKeeper },
        myFirst: i % 2 === 0,
      }));
      if (d.mine > d.theirs) wins += 1;
      for (const k of d.kicks) { kicks[k.side] += 1; if (k.result === 'scored') scored[k.side] += 1; }
    }
    return { win: wins / N, mine: scored.me / kicks.me, theirs: scored.opp / kicks.opp };
  };
  const behindMe = arm(STRONG, WEAK);
  const behindThem = arm(WEAK, STRONG);
  const winGap = behindMe.win - behindThem.win;
  const kickGap = behindMe.mine - behindMe.theirs;
  console.log(`   keeper ${STRONG} behind me and ${WEAK} behind them: won ${pct(behindMe.win)}, my kicks in ${pct(behindMe.mine)}, theirs ${pct(behindMe.theirs)}`);
  console.log(`   the same two keepers swapped: won ${pct(behindThem.win)}, my kicks in ${pct(behindThem.mine)}, theirs ${pct(behindThem.theirs)}`);
  console.log(`   ${N} shootouts an arm: win share gap ${(winGap * 100).toFixed(1)} points, my kicks minus theirs with the strong man behind me ${(kickGap * 100).toFixed(1)} points (the edges allow 2 x ${SHOOTOUT_TAKER_EDGE_CAP * 100} = ${2 * SHOOTOUT_TAKER_EDGE_CAP * 100})`);
  /* Measured 2026-10-01 over the default seed and SIM_SEED 1..5: see the header. */
  const WIN_FLOOR = 0.30;
  const KICK_FLOOR = 0.08;
  if (!(winGap >= WIN_FLOOR)) fail(`the strong keeper behind me wins only ${(winGap * 100).toFixed(1)} points more than behind them, under the floor of ${WIN_FLOOR * 100}`);
  if (!(kickGap >= KICK_FLOOR)) fail(`with the strong keeper behind me my kicks go in only ${(kickGap * 100).toFixed(1)} points more often than theirs, under the floor of ${KICK_FLOOR * 100}`);

  /* b) shootoutSides, which is what settleShootout hands to runShootout:
     each side read against the right keeper, and their order best first
     with the keeper last. Exact, on the real eleven with its slots. */
  const finished = JSON.parse(JSON.stringify(effectiveXIWithSlots(atCup)));
  const gkAt = finished.findIndex(x => x.slot?.allowed.includes('GK'));
  if (finished.length !== 11 || gkAt < 0) abort(`the base eleven has ${finished.length} men and a keeper slot at ${gkAt}`);
  /* The keeper moves to the middle of the list (the function reads the
     slot, not the place), and he and one outfielder get ratings nobody else
     in the eleven has, so a side read against the wrong man cannot match by
     accident, whether it is the first, the last or anyone else. */
  const [gkSlot] = finished.splice(gkAt, 1);
  finished.splice(5, 0, gkSlot);
  const taken = new Set(finished.map(x => x.p.rating));
  const unique = () => { let r = 50; while (taken.has(r)) r += 1; taken.add(r); return r; };
  gkSlot.p.rating = unique();
  const outfielder = finished[8];
  outfielder.p.rating = unique();
  const listed = [finished[2].p.id, finished[9].p.id];
  const oppEleven = [71, 84, 77, 90, 66, 80, 68, 86, 74, 79, 62].map((r, i) => ({ n: `Their man ${i}`, p: i === 4 ? 'GK' : 'CM', r }));
  const oppS = 73;
  const sides = shootoutSides(atCup, listed, finished, oppEleven, oppS);
  let wrong = 0;
  const check = (ok, m) => { if (!ok) { wrong += 1; fail(m); } };
  check(sides.mine.keeperRating === gkSlot.p.rating, `my side is read against ${sides.mine.keeperRating}, not the man in the keeper's slot (${gkSlot.p.rating})`);
  const myNames = sides.mine.takers.map(t => t.name);
  check(myNames.length === 11 && myNames[0] === finished[2].p.name && myNames[1] === finished[9].p.name && myNames[10] === gkSlot.p.name,
    `my takers ${myNames.join(', ')} are not the two listed men first and the keeper last`);
  check(sides.theirs.keeperRating === 66, `their side is read against ${sides.theirs.keeperRating}, not their keeper (66)`);
  const theirRatings = sides.theirs.takers.map(t => t.rating);
  check(JSON.stringify(theirRatings) === JSON.stringify([90, 86, 84, 80, 79, 77, 74, 71, 68, 62, 66]), `their takers went ${theirRatings.join(', ')}, not best first with the keeper last`);
  /* An outfielder put in goal is the keeper; the keeper he swapped with is not. */
  const swapped = JSON.parse(JSON.stringify(finished));
  [swapped[5].p, swapped[8].p] = [swapped[8].p, swapped[5].p];
  const inGoal = shootoutSides(atCup, listed, swapped, oppEleven, oppS);
  check(inGoal.mine.keeperRating === outfielder.p.rating, `with ${outfielder.p.name} put in goal my side is read against ${inGoal.mine.keeperRating}, not him (${outfielder.p.rating})`);
  /* A side with nobody to name kicks eleven generated men at its strength, against a keeper of that strength. */
  const blank = shootoutSides(atCup, listed, finished, [], oppS);
  check(blank.theirs.keeperRating === oppS && blank.theirs.takers.length === 11 && blank.theirs.takers.every(t => t.rating === oppS && t.gen),
    `a side with no names kicks ${blank.theirs.takers.length} men against keeper ${blank.theirs.keeperRating}, not eleven generated men at ${oppS}`);
  /* A side whose keeper has gone (sent off) is read against nobody. */
  const noKeeper = shootoutSides(atCup, listed, finished, oppEleven.filter(p => p.p !== 'GK'), oppS);
  check(noKeeper.theirs.keeperRating === null && noKeeper.theirs.takers.length === 10, `a side with no keeper is read against ${noKeeper.theirs.keeperRating} with ${noKeeper.theirs.takers.length} takers`);
  console.log(`   shootoutSides: my keeper off the slot (${gkSlot.p.rating}, then ${outfielder.p.rating} with an outfielder in goal), their keeper (66), their ten best first then the keeper, a blank side and a keeperless side: ${wrong} wrong`);
}

/* ================================================================== */
console.log('7) A thin side is made up to eleven: nobody of theirs kicks twice before the eleventh');
section = 7;
/* ================================================================== */
{
  /* a) shootoutRosterSide, exactly. */
  let wrong = 0;
  const check = (ok, m) => { if (!ok) { wrong += 1; fail(m); } };
  const S = 70;
  const man = (n, p, r) => ({ n, p, r });
  const madeUp = side => side.filter(p => p.g);
  const two = shootoutRosterSide([man('Left Back', 'LB', 68), man('Keeper', 'GK', 64)], S);
  check(two.length === 11 && new Set(two.map(p => p.n)).size === 11, `two names became ${two.length} men (${new Set(two.map(p => p.n)).size} different), not eleven different men`);
  check(madeUp(two).length === 9 && madeUp(two).every(p => p.r === S && p.p !== 'GK'), `two names got ${madeUp(two).length} generated men, not nine outfield takers at ${S}`);
  check(two.filter(p => !p.g).map(p => p.n).join('|') === 'Left Back|Keeper', 'the two real names were not both kept, unmarked');
  const twoSides = shootoutSides(atCup, [], [], two, S).theirs;
  check(twoSides.takers.length === 11 && twoSides.takers[10].name === 'Keeper' && twoSides.keeperRating === 64,
    `the two name side kicks ${twoSides.takers.length} with ${twoSides.takers[10]?.name} last against keeper ${twoSides.keeperRating}, not eleven with its own keeper (64) last`);
  check(twoSides.takers.filter(t => t.gen).length === 9, `${twoSides.takers.filter(t => t.gen).length} of the two name side's takers carry the generated mark, not nine`);
  const five = shootoutRosterSide([man('A', 'ST', 71), man('B', 'CM', 69), man('C', 'CB', 66), man('D', 'RB', 65), man('E', 'LW', 60)], S);
  const fiveSides = shootoutSides(atCup, [], [], five, S).theirs;
  check(five.length === 11 && five.filter(p => p.p === 'GK').length === 1 && five.find(p => p.p === 'GK').g === true && five.find(p => p.p === 'GK').r === S,
    'five names and no keeper did not become eleven with one generated keeper at the club strength');
  check(fiveSides.keeperRating === S && fiveSides.takers[10]?.gen === true && fiveSides.takers[0]?.name === 'A',
    `the keeperless five are read against ${fiveSides.keeperRating} with ${fiveSides.takers[0]?.name} first, not against a generated keeper at ${S} who kicks last, best real man first`);
  const ten = shootoutRosterSide([man('K', 'GK', 70), ...Array.from({ length: 9 }, (_, i) => man(`O${i}`, 'CM', 60 + i))], S);
  check(ten.length === 11 && madeUp(ten).length === 1 && madeUp(ten)[0].p !== 'GK', `ten names with a keeper got ${madeUp(ten).length} generated men, not one outfield taker`);
  const full = Array.from({ length: 14 }, (_, i) => man(`F${i}`, i === 3 ? 'GK' : 'CM', 60 + ((i * 7) % 14)));
  const fullSide = shootoutRosterSide(full, S);
  check(JSON.stringify(fullSide) === JSON.stringify([...full].sort((a, b) => b.r - a.r).slice(0, 11)), 'a full roster is not simply its best eleven by rating, as it was before');
  /* Release AM: a full roster with no keeper in it gets nobody added either.
     The fourteen above has its keeper inside its best eleven, so dropping
     the "fewer than eleven" test from the keeper line gave a keeperless
     thirteen a twelfth, made up man and nothing here went red (control
     keeperonfull). Thirteen ratings, all different, so the order is one. */
  const keeperless = Array.from({ length: 13 }, (_, i) => man(`N${i}`, 'CM', 58 + ((i * 5) % 13)));
  const keeperlessSide = shootoutRosterSide(keeperless, S);
  check(JSON.stringify(keeperlessSide) === JSON.stringify([...keeperless].sort((a, b) => b.r - a.r).slice(0, 11)),
    `a full roster with no keeper became ${keeperlessSide.length} men with ${madeUp(keeperlessSide).length} generated, not simply its best eleven`);
  check(shootoutRosterSide([], S).length === 0, 'a roster with nobody did not stay empty for shootoutSides to make up');
  console.log(`   shootoutRosterSide: two names, five without a keeper, ten, a full fourteen, a keeperless thirteen and nobody: ${wrong} wrong`);

  /* b) Through the whole match. The first career from BASE_SEED on whose
     first cup tie is against a side with names but no eleven (today that is
     BASE_SEED itself, Eibar with two), an order set, and every shootout
     read off the report: no man of theirs comes up again inside their first
     eleven kicks, and every taker who is not on their roster carries the
     generated mark. Found by search rather than named, so a data round that
     fills one club's roster moves this to the next thin tie instead of
     turning it into a walk that reads nothing. */
  const thinOf = s => {
    const opp = s.cupDraw?.[s.calendar.find(e => e.type === 'cup')?.cupRound];
    const r = opp ? oppRosterFor(s, opp) : [];
    const keepers = r.filter(p => p.p === 'GK').length;
    return r.length >= 1 && (keepers < 1 || r.length - keepers < 10) ? { opp, size: r.length } : null;
  };
  let thinSeed = null;
  for (let k = 0; k < 40 && thinSeed === null; k++) {
    if (thinOf(withSeed(BASE_SEED + k, () => startCareer(CLUB)))) thinSeed = BASE_SEED + k;
  }
  if (thinSeed === null) abort(`none of the 40 careers from seed ${BASE_SEED} draws a first cup tie against a side with names but no eleven, so the thin side's shootout cannot be walked; if no such club is left in the cup, retire section 7b`);
  const thinBase = thinSeed === BASE_SEED ? atCup : reachCup(cm, thinSeed);
  const thin = thinOf(thinBase);
  if (!thin) abort(`seed ${thinSeed}: the tie was thin at the start of the career and is not at the cup week`);
  const roster = new Map(oppRosterFor(thinBase, thin.opp).map(p => [p.n, p]));
  const listed = resolveXI(thinBase).filter(Boolean).filter(p => p.position !== 'GK').slice(0, 5).map(p => p.id);
  const ordered = setShootoutOrder(thinBase, listed);
  if (!ordered) abort('setShootoutOrder refused five men of the eleven on the thin base');
  let reached = 0;
  let clean = 0;
  let generatedKicks = 0;
  let theirKicksAll = 0;
  let longest = 0;
  const N = 450;
  for (let i = 0; i < N; i++) {
    const seed = 782_970_000 + SIM_SEED * 10_000 + i;
    const rep = playCup(ordered, seed).report;
    if (rep.decidedBy !== 'pens') continue;
    reached += 1;
    if ((rep.detail?.oppXi ?? []).length) abort(`seed ${seed}: ${thin.opp} named an eleven, so this is not a thin side's shootout`);
    const theirs = (rep.shootout?.kicks ?? []).filter(k => k.side === 'opp');
    if (!theirs.length) { fail(`seed ${seed}: a shootout with an order set carries no kicks of theirs`); continue; }
    const names = theirs.map(k => k.taker);
    const again = names.findIndex((t, j) => names.indexOf(t) !== j);
    const unmarked = theirs.filter(k => (roster.has(k.taker) ? !!k.gen !== !!roster.get(k.taker).g : !k.gen));
    theirKicksAll += theirs.length;
    generatedKicks += theirs.filter(k => k.gen).length;
    longest = Math.max(longest, theirs.length);
    if (again >= 0 && again < 11) fail(`seed ${seed}: ${names[again]} kicked again as their ${again + 1}${['st', 'nd', 'rd'][again] ?? 'th'} taker (${names.slice(0, again + 1).join(', ')})`);
    else if (unmarked.length) fail(`seed ${seed}: ${unmarked.map(k => k.taker).join(', ')} kicked for ${thin.opp} with the wrong generated mark`);
    else clean += 1;
  }
  console.log(`   thin tie: seed ${thinSeed}, ${thin.opp} with ${thin.size} on their roster; ${N} cup matches, ${reached} shootouts, ${clean} where nobody of theirs kicked twice before the eleventh and every made up man was marked`);
  console.log(`   ${theirKicksAll} kicks of theirs, ${generatedKicks} by generated men, the longest shootout ${longest} of theirs (printed, not asserted)`);
  if (reached < 12) fail(`only ${reached} shootouts in ${N} matches against the thin side, below the floor of 12`);
  if (clean !== reached) fail(`${reached - clean} of ${reached} shootouts against the thin side had a man kick twice early or a made up man unmarked`);
  if (!generatedKicks) fail('no generated man kicked in any shootout against the thin side, so the making up was never walked');
}

/* ================================================================== */
const evidenceDir =process.env.CM_SHOOTOUT_ARTIFACTS || path.join(ROOT, 'cm-shootout-artifacts');
fs.mkdirSync(evidenceDir, { recursive: true });
await new Promise(resolve => setImmediate(resolve));
baselineEvidence.runtimeErrors = runtimeErrors;
baselineEvidence.failedSections = failedSections;
baselineEvidence.mutation = mutation;
baselineEvidence.executedSources = [['candidate', enginePath], ['historical', historicalEnginePath], ['baseline428', baselineEnginePath], ...(leagueOutEnginePath ? [['leagueout1052', leagueOutEnginePath]] : [])].map(([role, file]) => {
  const bytes = fs.readFileSync(file);
  const copy = CONTROL ? `${CONTROL}-${role}.engine.ts` : null;
  if (copy) fs.writeFileSync(path.join(evidenceDir, copy), bytes);
  return { role, hash: createHash('sha256').update(bytes).digest('hex'), copy };
});
baselineEvidence.executedBundleHash = createHash('sha256').update(fs.readFileSync(BUNDLE)).digest('hex');
baselineEvidence.sources = sourceBytes.map(({ file, bytes }) => {
  const after = fs.readFileSync(file);
  return { file: path.relative(ROOT, file), before: createHash('sha256').update(bytes).digest('hex'),
    after: createHash('sha256').update(after).digest('hex'), held: bytes.equals(after) };
});
if (baselineEvidence.sources.some(source => !source.held)) fail('Original engine or ancient fixture source bytes changed');
fs.writeFileSync(path.join(evidenceDir, `${CONTROL || 'normal'}-baseline.json`), JSON.stringify(baselineEvidence, null, 2));
for (const f of [ENTRY, BUNDLE, `${TMP}/${TAG}.control.engine.ts`, historicalPath, baselinePath, leagueOutPath]) { try { fs.unlinkSync(f); } catch { /* not there */ } }
if (runtimeErrors.length || baselineEvidence.sources.some(source => !source.held)) {
  console.error('simCmShootoutOrder: runtime errors or changed original source bytes receive no control credit');
  process.exit(2);
}
if (failures) {
  console.error(`\nsimCmShootoutOrder: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\nsimCmShootoutOrder: all sections passed');
