/* Reviewer, runner only, never committed: simCmBoardVerdict's takeoverOn hands startMidSeason the state
   startCareer built, as useClubManager does in production (BOARD_FRESH on the head, 60 on the base), instead of
   setting 60 first; the legacy leg and the join cases (the player's own career before the application) keep 60.
   Proves whether the takeover section then holds correction 2's pin. Usage: node hpatch.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'scripts/simCmBoardVerdict.mjs';
const t = readFileSync(file, 'utf8');
const from = "  s.boardConfidence = 60;\n  if (legacy) s.matchRules = 'base';\n";
const to = "  if (legacy || c.entry === 'join') s.boardConfidence = 60;\n  if (legacy) s.matchRules = 'base';\n";
const n = t.split(from).length - 1;
if (n !== 1) { console.log(`hpatch: anchor found ${n} times; could not run`); process.exit(2); }
writeFileSync(file, t.replace(from, to));
console.log('hpatch: takeoverOn hands startMidSeason the production state');
