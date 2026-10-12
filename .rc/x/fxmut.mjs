/* Round 1307 fix pass: one named mutation of the round's source, applied on the runner only (never committed).
   Usage: node .rc/x/fxmut.mjs <name>. It refuses to run unless every old string is in the file exactly once,
   so a mutation that changed nothing can never be read as a survivor. The request line restores the tree.
   pace, seedoff and revealkey are the review's own three survivors, by the review's own strings. */
import fs from 'node:fs';

const B = 'src/components/front-office/FrontOfficeBoard.tsx';
const C = 'src/components/front-office-shared/GmGameDayCard.tsx';

const M = {
  /* the owner card's pace reads the league AFTER the press again (the base's own line) */
  pace: [B, [
    ['pace={seen.week > 1 && seen.week <= REGULAR_WEEKS', 'pace={league.week > 1 && league.week <= REGULAR_WEEKS'],
    ['mandatePace(mandate, seenMy.wins, (seen.week - 1) / REGULAR_WEEKS, conferenceSeeds(seen.teams, conferenceOf(myTeam))', 'mandatePace(mandate, my.wins, (league.week - 1) / REGULAR_WEEKS, conferenceSeeds(league.teams, conferenceOf(myTeam))'],
  ]],
  /* the seed handed to the standing line is one too low (an index, not a seed) */
  seedoff: [B, [['seedsNow.indexOf(myTeam) + 1 : null', 'seedsNow.indexOf(myTeam) : null']]],
  /* full time is no longer a reveal */
  revealkey: [B, [[":${weekResults.length}:${hold ? 'watch' : ''}`", ':${weekResults.length}`']]],
  /* the clock runs on behind the open help sheet */
  helppause: [C, [['speed={speed} paused={helpOpen} reduced={false} onFullTime={fullTime} />', 'speed={speed} paused={false} reduced={false} onFullTime={fullTime} />']]],
  /* the card no longer puts the page back after the help sheet took the focus */
  helpjump: [C, [["if (helpOpen && y !== null && window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });", '']]],
  /* the final week's note is not handed to the tile */
  finalnote: [B, [['nextNote={seen.week >= REGULAR_WEEKS ? FINAL_WEEK_NOTE : undefined}', '']]],
};

const name = process.argv[2];
if (!name || !Object.prototype.hasOwnProperty.call(M, name)) { console.error(`fxmut: unknown mutation "${name}". Known: ${Object.keys(M).join(', ')}`); process.exit(2); }
const [file, pairs] = M[name];
let src = fs.readFileSync(file, 'utf8');
for (const [from, to] of pairs) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`fxmut ${name}: CANNOT RUN, the old string is in ${file} ${hits} times: ${from.slice(0, 90)}`); process.exit(2); }
  src = src.split(from).join(to);
}
fs.writeFileSync(file, src);
console.log(`fxmut ${name}: APPLIED to ${file} (${pairs.length} edit(s))`);
