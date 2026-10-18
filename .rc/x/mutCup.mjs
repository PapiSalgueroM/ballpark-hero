/* fix-1509: the review's m4 as a source edit (euroCupOf hands the cup to the final's loser), in the checkout it is
   run from. Fails closed: the line must stand exactly once. Never committed. */
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const from = "  return { nationId: leagueRulesOf(careerLeagueOf(career).id).nationId, winner: career.cupBracket?.find(t => t.round === 'F')?.winner ?? null };";
const to = "  const fin = career.cupBracket?.find(t => t.round === 'F');\n  return { nationId: leagueRulesOf(careerLeagueOf(career).id).nationId, winner: fin?.winner ? (fin.winner === fin.home ? fin.away : fin.home) : null };";
const t = fs.readFileSync(F, 'utf8').replaceAll('\r\n', '\n');
const n = t.split(from).length - 1;
if (n !== 1) { console.log(`mutCup: refused, the line stands ${n} times`); process.exit(2); }
fs.writeFileSync(F, t.replace(from, to));
console.log('mutCup: euroCupOf now hands the cup to the loser');
