// Round 1347 weight probe (never committed): a one line caller of the world engine in clubManager.ts, so a build
// carries what Round 1502's binding will carry (the evaluation, the group draw, the tie, the nights, the slate).
import fs from 'node:fs';
const f = 'src/lib/clubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const add = "\nimport { evaluateWorldComp as __wc1, drawG8 as __wc2, settleTie as __wc3, leaguePhaseNightRounds as __wc4 } from './worldCompetition';\n"
  + "import { drawUclLeaguePhase as __wc5 } from './uclLeaguePhase';\n"
  + '(globalThis as Record<string, unknown>).__world1347 = [__wc1, __wc2, __wc3, __wc4, __wc5];\n';
fs.writeFileSync(f, s + add);
console.log(`caller1347: appended ${add.length} characters to ${f}`);
