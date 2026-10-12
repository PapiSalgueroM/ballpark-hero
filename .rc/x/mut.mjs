/* Round 1307 review (lens RUN): one named mutation of the round's source, applied on the runner only.
   Usage: node .rc/x/mut.mjs <name>. It refuses to run unless every old string is in the file exactly once,
   so a mutation that changed nothing can never be read as a survivor. The request line restores the tree. */
import fs from 'node:fs';

const B = 'src/components/front-office/FrontOfficeBoard.tsx';
const C = 'src/components/front-office-shared/GmGameDayCard.tsx';
const V = 'src/lib/gmGameDayView.ts';

const M = {
  /* the owner card's pace reads the league AFTER the press again (the base's own line) */
  pace: [B, [
    ['pace={seen.week > 1 && seen.week <= REGULAR_WEEKS', 'pace={league.week > 1 && league.week <= REGULAR_WEEKS'],
    ['mandatePace(mandate, seenMy.wins, (seen.week - 1) / REGULAR_WEEKS, conferenceSeeds(seen.teams, conferenceOf(myTeam))', 'mandatePace(mandate, my.wins, (league.week - 1) / REGULAR_WEEKS, conferenceSeeds(league.teams, conferenceOf(myTeam))'],
  ]],
  /* the seed handed to the standing line is one too low (an index, not a seed) */
  seedoff: [B, [['seedsNow.indexOf(myTeam) + 1 : null', 'seedsNow.indexOf(myTeam) : null']]],
  /* the matchup sentence reads the league after the press */
  matchup: [B, [['const seenGame = hold ? hold.schedule[hold.week - 1]?.find(g => g.home === myTeam || g.away === myTeam) : myGameThisWeek;', 'const seenGame = myGameThisWeek;']]],
  /* Watch is offered on the final week too (an off by one) */
  watch17: [B, [['{seen.week < REGULAR_WEEKS && seenGame && (', '{seen.week <= REGULAR_WEEKS && seenGame && (']]],
  /* full time is no longer a reveal */
  revealkey: [B, [[":${weekResults.length}:${hold ? 'watch' : ''}`", ':${weekResults.length}`']]],
  /* the clock runs for a visitor who asked for reduced motion */
  reduced: [C, [['const canWatch = !!view?.game && !reduced;', 'const canWatch = !!view?.game;']]],
  /* the score after a deciding play is counted for the wrong side */
  running: [V, [["if (e.side === 'us') a += pointsOf(e); else b += pointsOf(e);", "if (e.side === 'us') b += pointsOf(e); else a += pointsOf(e);"]]],
  /* a chip prints the home score first, not his */
  chips: [V, [["text: `${won ? 'W' : 'L'} ${home ? g.homeScore : g.awayScore}-${home ? g.awayScore : g.homeScore}`", "text: `${won ? 'W' : 'L'} ${g.homeScore}-${g.awayScore}`"]]],
  /* every game shows the overtime column */
  periods: [V, [['const count = last.beyond === true ? law.periods.count : law.periods.regulation ?? law.periods.count;', 'const count = law.periods.count;']]],
};

const name = process.argv[2];
if (!name || !Object.prototype.hasOwnProperty.call(M, name)) { console.error(`mut: unknown mutation "${name}". Known: ${Object.keys(M).join(', ')}`); process.exit(2); }
const [file, pairs] = M[name];
let src = fs.readFileSync(file, 'utf8');
for (const [from, to] of pairs) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`mut ${name}: CANNOT RUN, the old string is in ${file} ${hits} times: ${from.slice(0, 90)}`); process.exit(2); }
  src = src.split(from).join(to);
}
fs.writeFileSync(file, src);
console.log(`mut ${name}: APPLIED to ${file} (${pairs.length} edit(s))`);
