// Review mutation helper (run lens, Round 1532). Applies ONE small plausible mutation to the
// checked out tree on a runner. Each anchor must be present exactly once or it exits 2.
// Restore with git checkout -- src scripts in the same request line.
import fs from 'node:fs';
const name = process.argv[2];
const LIB = 'src/lib/stadiumTycoon.ts';
const M = {
  // the rules modal's even match example: the rival's number read at the home venue
  facts: [LIB, 'evenAgainst: r2(goalLambda(0, LAW.away))', 'evenAgainst: r2(goalLambda(0, LAW.home))'],
  // a promotion paid on the division just left (off by one division)
  promoold: [LIB, 'const pay = Math.round(unboostedIncomePerSec({ ...st, league: next }) * PROMOTION_BONUS_SEC);', 'const pay = Math.round(unboostedIncomePerSec(st) * PROMOTION_BONUS_SEC);'],
  // the two venues of a rival fixture swapped (swapped argument)
  venue: [LIB, 'const ph = rivalChancePerMin(st, clubs[h], clubs[a], LAW.home);\n    const pa = rivalChancePerMin(st, clubs[a], clubs[h], LAW.away);', 'const ph = rivalChancePerMin(st, clubs[h], clubs[a], LAW.away);\n    const pa = rivalChancePerMin(st, clubs[a], clubs[h], LAW.home);'],
  // today's rival's offset counted the wrong way round in our match
  gapsign: [LIB, 'return squadStrength(s) - divisionStrength(s) - currentOpponentOffset(s) * RIVAL_OFFSET_POINTS;', 'return squadStrength(s) - divisionStrength(s) + currentOpponentOffset(s) * RIVAL_OFFSET_POINTS;'],
  // a stale unit: the offsets left at a tenth of their law points
  offsetunit: [LIB, 'export const RIVAL_OFFSET_POINTS = 500;', 'export const RIVAL_OFFSET_POINTS = 50;'],
  // a digit swap in the tuned table's top row (still strictly rising)
  summit: [LIB, "incomeMult: 5.5, rivalStrength: 69 }", "incomeMult: 5.5, rivalStrength: 96 }"],
  // a goal bonus paid on boosted income (Hype and the frenzy reach it)
  goalboost: [LIB, '  return Math.round(unboostedIncomePerSec(s) * GOAL_BONUS_SEC);', '  return Math.round(incomePerSec(s) * GOAL_BONUS_SEC);'],
  // division 0 rivals left at the old zero
  div0: [LIB, "incomeMult: 1, rivalStrength: 1 }", "incomeMult: 1, rivalStrength: 0 }"],
};
const m = M[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const text = raw.split('\r\n').join('\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`mutation ${name}: anchor found ${n} times in ${file}, not once`); process.exit(2); }
const out = text.replace(from, () => to);
fs.writeFileSync(file, crlf ? out.split('\n').join('\r\n') : out);
console.log(`mutation ${name}: applied once to ${file}`);
