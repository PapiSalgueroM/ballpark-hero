// Round 1318 control (sent to a runner as .rc/x/mutE2.mjs, never committed): undo the C3 read one way.
//   unguarded: calculateBallonDor trusts whatever pool the save holds again
//   refusal:   isSoccerCareerSave refuses a save whose pool the reader refuses, as PR234 did
import fs from 'node:fs';
const which = process.argv[2];
function swap(file, from, to) {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`CONTROL ABORTED: ${file} holds the anchor ${n} times`); process.exit(3); }
  fs.writeFileSync(file, text.replace(from, () => to));
  console.log(`CONTROL ${which}: ${file} changed`);
}
if (which === 'unguarded') {
  swap('src/lib/soccerCareerEngine.ts',
    'const previousPool = isGeneratedBallonPool(state.generatedBallonPool, year - 1) ? state.generatedBallonPool : undefined;',
    'const previousPool = state.generatedBallonPool;');
} else if (which === 'refusal') {
  swap('src/lib/soccerCareerSave.ts', '  return true;\n}', '  if (value.generatedBallonPool !== undefined\n    && !isGeneratedBallonPool(value.generatedBallonPool, (value.seasons[value.seasons.length - 1] as { year: number }).year)) return false;\n  return true;\n}');
  const file = 'src/lib/soccerCareerSave.ts';
  fs.writeFileSync(file, "import { isGeneratedBallonPool } from './soccerCareerEngine';\n" + fs.readFileSync(file, 'utf8'));
} else { console.error('CONTROL ABORTED: unknown control ' + which); process.exit(3); }
