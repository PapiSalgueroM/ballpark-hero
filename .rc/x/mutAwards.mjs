// Reviewer mutation (read lens, Round 1525). Usage: node mutAwards.mjs <which>
// Edits src/lib/soccerSeasonAwards.ts on the runner only. Asserts the original text is there exactly once.
import fs from 'node:fs';
const FILE = 'src/lib/soccerSeasonAwards.ts';
const MUTS = {
  poy: [["'Player of the Year': [40, 'vote'", "'Player of the Year': [4000, 'vote'"]],
  fair: [["'Fair Play Award': [20, 'level'", "'Fair Play Award': [2, 'level'"]],
  grade: [["const VOTE_GRADE: Record<string, number> = { GK: 0.2, CB: 0.2, LB: 0.2, RB: 0.2, CM: 0.1, CDM: 0.1 };",
    "const VOTE_GRADE: Record<string, number> = { GK: 3, CB: 3, LB: 3, RB: 3, CM: 0.1, CDM: 0.1 };"]],
};
const which = process.argv[2];
if (!MUTS[which]) { console.log(`MUTATION ABORT: unknown ${which}`); process.exit(2); }
let text = fs.readFileSync(FILE, 'utf8');
for (const [was, now] of MUTS[which]) {
  const n = text.split(was).length - 1;
  if (n !== 1) { console.log(`MUTATION ABORT: ${JSON.stringify(was)} found ${n} times`); process.exit(2); }
  text = text.replace(was, now);
}
fs.writeFileSync(FILE, text);
console.log(`MUTATION ${which} APPLIED to ${FILE}`);
