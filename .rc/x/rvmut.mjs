// Reviewer mutation tool (Round 1331 review, lens: runs things). Runner only, never committed.
// Usage, from the root of a throwaway worktree: node rvmut.mjs <name>
// Applies one plausible mutation, asserting its anchor occurs exactly once first (exit 2 otherwise).
import { readFileSync, writeFileSync } from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const HS = 'src/lib/managerHotSeat.ts';
const MUTS = {
  // The break before extra time costs a stoppage (the ET half of isBreakChange dropped).
  etbreak: [CM, '  return !!live.et && minute === live.et.from && !(plus && plus > 0);', '  return false;'],
  // The press at the whistle names the next opponent but judges the edge against the match just played.
  pressedge: [CM, '    const edge = matchEdge(state, fromWeek === undefined ? undefined : fx);', '    const edge = matchEdge(state);'],
  // The other dugout ignores its stoppage limit (one minute per change again).
  oppstops: [CM, '  const k = Math.min(count, stopsLeft);', '  const k = count;'],
  // The rule read with the season's end year instead of its start year.
  yearplus: [CM, '  return subsRuleFor(subsLeagueBase(careerLeagueOf(career).id), worldYear(career));', '  return subsRuleFor(subsLeagueBase(careerLeagueOf(career).id), worldYear(career) + 1);'],
  // The cutover day itself plays the base rules (off by one on the date).
  cutover: [HS, "  if (setup.daily) return setup.daily < HOT_SEAT_RULES_FROM ? 'base' : undefined;", "  if (setup.daily) return setup.daily <= HOT_SEAT_RULES_FROM ? 'base' : undefined;"],
  // The first half's last minute (45, and its board) is treated as the interval: free.
  ht45: [CM, '  if (!live.h2Drawn && minute >= 46) return true;', '  if (!live.h2Drawn && minute >= 45) return true;'],
  // The coach takes a second look under three as well (the three change coach must be line for line).
  looktwo: [CM, '    for (let look = 0; look < (rule.stops === null ? 1 : 2); look++) if (!legsOnce(at)) return;', '    for (let look = 0; look < 2; look++) if (!legsOnce(at)) return;'],
  // Not a mutation: the press read put back to the old week, so a three change world can be held to the base.
  pressback: [CM, "  maybeAskPress(state, state.matchRules === 'base' ? undefined : live.week + 1);", '  maybeAskPress(state);'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`MUTATION unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`MUTATION ${name}: anchor found ${n} times in ${file}, refusing`); process.exit(2); }
writeFileSync(file, text.replace(from, to));
const after = readFileSync(file, 'utf8');
if (!after.includes(to) || after.includes(from)) { console.log(`MUTATION ${name}: write did not take`); process.exit(2); }
console.log(`MUTATION ${name} applied to ${file}`);
