// ON THE RUNNER ONLY: takes Round 1185's form swing out of the engine's draw AND out of the squad's plan, so
// simCareerSquad section 9 can be asked whether that round is what moved "league games minus the plan".
// The request line restores the files afterwards (git checkout -- src scripts).
import fs from 'node:fs';
const edits = [
  ['src/lib/soccerCareerEngine.ts', ' + recentClubForm(state).swing', ''],
  ['src/lib/soccerClubSquad.ts', ' + form.swing', ''],
];
for (const [file, from, to] of edits) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`noform ABORT: ${file} holds its anchor ${n} times`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
}
console.log('noform: EDITED, the form swing is out of the draw and out of the plan');
