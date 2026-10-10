// Release AU review, lens sc-engine: ONE mutation of a settlement rule, in a runner's throwaway checkout only.
// The request line restores src and scripts after each. usage: node .rc/x/scMut.mjs <name>
import fs from 'node:fs';
const P = 'src/lib/soccerCareerProgramme.ts', E = 'src/lib/soccerCareerEngine.ts';
const M = {
  // the card says 15 recorded goals
  goals14: [[P, "pick.bonuses === 'goals' ? season.goals >= 15", "pick.bonuses === 'goals' ? season.goals >= 14"]],
  // the card says an injury does not erase a target already earned
  injuryErases: [[P, 'const bonusMet = season.apps > 0 && (', 'const bonusMet = played && (']],
  // the card says availability can excuse a shortfall: an injury no longer does
  noExcuse: [[P, 'const excuse = !played || !!season.injury || ', 'const excuse = !played || ']],
  // two consecutive played seasons become one
  oneYear: [[P, 'if (seasons >= 2) {', 'if (seasons >= 1) {']],
  // a club move no longer invalidates the plan's effects
  moveKeeps: [[P, 'plan.year === nextProgrammeYear(career) && plan.club === career.currentClub && plan.choices', 'plan.year === nextProgrammeYear(career) && plan.choices']],
  // a broken promise costs 4 morale, the card says 5
  morale4: [[P, "receipt.promise === 'broken' ? -5 : 0", "receipt.promise === 'broken' ? -4 : 0"]],
  // the calm captain no longer lowers the red card rate
  redCalm: [[P, 'effects.yellowCardMult *= 0.80; effects.redCardMult *= 0.80;', 'effects.yellowCardMult *= 0.80;']],
  // nothing stops a second settlement of the same year
  settleTwice: [[P, '  if (existing.receipts.some(row => row.year === season.year && row.club === season.club)) return;\n', ''], [P, '  delete state.plan;\n}\n', '}\n']],
  // a broken promise no longer makes the transfer request sure to bring an offer
  noSureOffer: [[E, 'if (Math.random() < 0.5 || programmePromiseBroken(state)) {', 'if (Math.random() < 0.5) {']],
  // the injury year is never settled (a bonus earned before the injury is not paid, a promise never judged)
  injuryYearUnsettled: [[E, '      settleSoccerProgramme(s, injuryRow);\n', '']],
  // the free kick share becomes the penalty share
  freeKick20: [[P, 'receipt.freeKickGoals = Math.floor(season.goals * 0.15);', 'receipt.freeKickGoals = Math.floor(season.goals * 0.20);']],
  // the starting promise asks for 25 league games, the card says 26
  starter25: [[P, "const target = pick.promise === 'starter' ? 26 : 18;", "const target = pick.promise === 'starter' ? 25 : 18;"]],
};
const name = process.argv[2];
if (name === 'dry') {
  let bad = 0;
  for (const [n, edits] of Object.entries(M)) for (const [file, from] of edits) { const k = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split(from).length - 1; if (k !== 1) { bad++; console.log(`dry ${n}: anchor found ${k} times in ${file}`); } }
  console.log(`scMut dry: ${Object.keys(M).length} mutations, ${bad} bad anchors`);
  process.exit(bad ? 3 : 0);
}
if (!M[name]) { console.error(`scMut: unknown mutation ${name}. Known: ${Object.keys(M).join(' ')}`); process.exit(2); }
for (const [file, from, to] of M[name]) {
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (src.split(from).length !== 2) { console.error(`scMut ${name}: ABORTED, the anchor must be in ${file} exactly once: ${from.slice(0, 60)}`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, to));
}
console.log(`scMut ${name}: applied`);
