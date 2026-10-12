// Round 1309 review: one plausible mutation of the board, applied on the runner (restored by git checkout in the same line).
// Exit 2 when the string to mutate is not in the board exactly once (a mutation that changes nothing proves nothing).
import fs from 'node:fs';
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const MUTS = {
  /* a stale constant: the title game leaves the league at Week 18, not back at Week 17 */
  weekoff: ['lg.week = REGULAR_WEEKS;', 'lg.week = REGULAR_WEEKS + 1;'],
  /* a dropped filter: every playoff game told goes into his log, not his games only */
  logall: ['told.filter(g => g.home === myTeam || g.away === myTeam)', 'told'],
  /* a dropped condition: "Your game" on a tie finds the first game between the two clubs, regular season or not */
  tiewhere: ['g.where === tie.round && ', ''],
  /* an off by one: a press that logged nothing (his bye, or he is out) still opens his last game, not the bracket */
  byelast: ["> before ? 'last' : null", ">= before ? 'last' : null"],
  /* a swapped argument: the seeds are frozen from the league before Week 17 was played */
  seedsstale: ['NFL_POSTSEASON.seeds(lg)', 'NFL_POSTSEASON.seeds(league)'],
  /* the reveal's key forgets the bracket's played count (a round's result is then no reveal) */
  revealkey: [':${playoffs?.played.length ?? 0}', ''],
  /* THE FLEET'S CONTROL (not a review mutation): a regular week tells its games under the next week's name */
  whereoff: ['nflWhere(lg.week), deskWeek?.edges', 'nflWhere(lg.week + 1), deskWeek?.edges'],
  /* the old button's ask leaks: the old button on Week 17 opens the bracket instead of playing it all */
  oldask: ["lg.week >= REGULAR_WEEKS && asked === 'bracket'", "lg.week >= REGULAR_WEEKS && asked !== 'rest'"],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mutation ${name}: unknown`); process.exit(2); }
const text = fs.readFileSync(BOARD, 'utf8');
const n = text.split(m[0]).length - 1;
if (n !== 1) { console.log(`mutation ${name}: "${m[0]}" is in the board ${n} times, refused`); process.exit(2); }
fs.writeFileSync(BOARD, text.replace(m[0], m[1]));
console.log(`mutation ${name}: applied`);
