// Reviewer mutations for Release AZ (proofs and recordings). Runs on a runner checkout only; the request line
// restores the files with git checkout afterwards. Each replacement must match exactly once or nothing is written.
//   node .rc/x/mutPR.mjs shootfield   the shootout arm keeps the world seed, and the comparison drops only the field
//   node .rc/x/mutPR.mjs shootnoarm   the shootout arm keeps the world seed and nothing else changes (a control)
//   node .rc/x/mutPR.mjs varfix       simCmVar's historic baseline case takes the seed off its save (the builder's line)
import fs from 'node:fs';
const mode = process.argv[2];
function edit(file, pairs) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  if (crlf) text = text.split('\r\n').join('\n');
  for (const [from, to] of pairs) {
    const n = text.split(from).length - 1;
    if (n !== 1) { console.error(`mutPR ${mode}: anchor found ${n} times in ${file}: ${JSON.stringify(from).slice(0, 80)}`); process.exit(3); }
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, crlf ? text.split('\n').join('\r\n') : text);
  console.log(`mutPR ${mode}: ${pairs.length} edit(s) made in ${file}`);
}
const SHOOT = 'scripts/simCmShootoutOrder.mjs';
const ARM = [ 'coachless = withoutWorldSeed(', 'coachless = ((x) => x)(' ];
const FIELD = [ '    delete state.leagueBook;\n', '    delete state.leagueBook;\n    delete state.worldSeed;\n' ];
if (mode === 'shootfield') edit(SHOOT, [ARM, FIELD]);
else if (mode === 'shootnoarm') edit(SHOOT, [ARM]);
else if (mode === 'varfix') edit('scripts/simCmVar.mjs', [[ '        historical.startYear = 2026;\n', '        historical.startYear = 2026;\n        delete historical.worldSeed;\n' ]]);
else { console.error('mutPR: unknown mode'); process.exit(2); }
