/* Reviewer mutation applier for Round 1603 (runner only, never committed).
   node .rc/x/mut1603.mjs <NAME>  rewrites one or two lines in the checkout, asserting each is there exactly once.
   Exit 0 and prints MUTATED <NAME> when applied, exit 3 when a line is missing (the mutation did not apply). */
import fs from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const CARD = 'src/components/club-manager/MatchReportCard.tsx';
const HS = 'src/lib/managerHotSeat.ts';
const BOARD = 'src/components/manager-hot-seat/ManagerHotSeatBoard.tsx';
const JUDGE = "  return state.matchRules !== 'base' && state.tieRules !== 'night' && tie?.leg === 2 && typeof tie.through === 'boolean';";

const M = {
  /* A: the captain's defeat relief reads the night again (the pre 1603 line, a plausible merge leftover). */
  A: [[CM, '    if (captainPlayed && !reactWon && !reactDrawn && xiIdSet.has(p.id)) shift', '    if (captainPlayed && !won && !drawn && xiIdSet.has(p.id)) shift']],
  /* B: a drawn night on a deciding leg still reacts as a draw (reactDrawn not cleared). */
  B: [[CM, '  const reactDrawn = tieJudged ? false : drawn;', '  const reactDrawn = drawn;']],
  /* C: judgedByTie drops its leg filter (any tie line judged, first legs too). */
  C: [[CM, JUDGE, "  return state.matchRules !== 'base' && state.tieRules !== 'night' && !!tie;"]],
  /* D1: the card reads the headline off the shootout or the night instead of tie.through. */
  D1: [[CARD, '  const tieThrough = decider && r.tie?.through === true;', '  const tieThrough = decider && (r.shootoutWon ?? r.won) === true;']],
  /* D2: the night line printed in the home side's orientation, not mine. */
  D2: [[CARD, '  const myNight = r.home === clubName ? r.homeGoals : r.awayGoals;', '  const myNight = r.homeGoals;'],
       [CARD, '  const theirNight = r.home === clubName ? r.awayGoals : r.homeGoals;', '  const theirNight = r.awayGoals;']],
  /* E: the Hot Seat cutover off by one (the cutover day itself still plays the night). */
  E: [[HS, '  if (setup.daily) return setup.daily < HOT_SEAT_TIE_FROM ? ', '  if (setup.daily) return setup.daily <= HOT_SEAT_TIE_FROM ? ']],
  /* F: a new Hot Seat free run is opened without the 1603 stamp. */
  F: [[BOARD, '    open({ club, seed, rules: 1331, tie: 1603 });', '    open({ club, seed, rules: 1331 });']],
  /* G: handoverState leaves tieRules on a career carried on. */
  G: [[HS, '  delete copy.tieRules;\n', '']],
  /* H: loadCareer keeps tieRules. */
  H: [[CM, "    if (parsed && 'tieRules' in parsed) delete parsed.tieRules;\n", '']],
  /* K: the record follows the tie (res written from the reaction), the "fix" R2 forbids. */
  K: [[CM, "    res: won ? 'W' : drawn ? 'D' : 'L',\n    // Round 164", "    res: reactWon ? 'W' : reactDrawn ? 'D' : 'L',\n    // Round 164"]],
  /* L: the fan meter reads the tie on every entry by preferring tie only where res is a loss (half applied). */
  L: [['src/lib/clubManagerMeters.ts', 'log.map(e => e && (e.tie ?? e.res))', "log.map(e => e && (e.res === 'L' ? (e.tie ?? e.res) : e.res))"]],
};

const name = process.argv[2];
if (!M[name]) { console.log(`mut1603: unknown mutation ${name}`); process.exit(3); }
for (const [file, from, to] of M[name]) {
  let src = fs.readFileSync(file, 'utf8');
  const crlf = src.includes('\r\n');
  if (crlf) src = src.split('\r\n').join('\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`mut1603: ${name} line found ${n} times in ${file}: ${from.trim().slice(0, 90)}`); process.exit(3); }
  src = src.replace(from, () => to);
  if (!process.env.DRY) fs.writeFileSync(file, crlf ? src.split('\n').join('\r\n') : src);
}
console.log(`MUTATED ${name}`);
