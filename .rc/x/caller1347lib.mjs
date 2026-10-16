// Round 1347 weight probe (never committed): a caller of Round 1228's library alone (the slate, the table, the
// knockout draw), to split the measured growth between that library and the world engine on top of it.
import fs from 'node:fs';
const f = 'src/lib/clubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const add = "\nimport { drawUclLeaguePhase as __wl1, sortedLeaguePhaseTable as __wl2, drawUclKnockout as __wl3, slateFixtures as __wl4, nextRoundTie as __wl5 } from './uclLeaguePhase';\n"
  + '(globalThis as Record<string, unknown>).__world1347lib = [__wl1, __wl2, __wl3, __wl4, __wl5];\n';
fs.writeFileSync(f, s + add);
console.log(`caller1347lib: appended ${add.length} characters to ${f}`);
