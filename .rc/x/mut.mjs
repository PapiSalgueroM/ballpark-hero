// Reviewer mutations (pools), applied on the RUNNER's checkout only. node .rc/x/mut.mjs <id>
// Each one asserts its anchor exists exactly once, so a mutation that changes nothing cannot pass for a result.
import fs from 'node:fs';

const DART = 'src/lib/dartDraft.ts', MAP = 'src/lib/dartMap.ts', STAT = 'src/lib/statDetective.ts';
const NL = String.fromCharCode(10);
const M = {
  // pool filter 1: the global pool stops asking for the 2026 rows only
  poolyear: [[DART, ".eq('year', 2026)" + NL + "          .not('age', 'is', null)", ".not('age', 'is', null)"]],
  // pool filter 2: a gold zone stops checking the position a tile is offered for
  slot: [[MAP, 'if (!fitsSlot(player, slot) || used.has(key) || seen.has(key)) return false;', 'if (used.has(key) || seen.has(key)) return false;']],
  // pool depth: the roster is the first page only
  poolcap: [[DART, 'export const POOL_ROWS = 2000;', 'export const POOL_ROWS = 1000;']],
  // span source: the spans are read from the 500 minute table instead of the view
  spanview: [[STAT, "const SPAN_VIEW = 'bref_nba_career_spans';", "const SPAN_VIEW = 'bref_nba_player_seasons';"]],
  // variety rule 1: no best three kept, all eight drawn
  best3: [[MAP, 'const picks = eligible.slice(0, 3);', 'const picks: Player[] = [];'], [MAP, 'const remaining = eligible.slice(3);', 'const remaining = eligible.slice(0);']],
  // variety rule 2: nothing drawn, the old fixed best eight
  fixed8: [[MAP, 'const index = Math.floor(Math.random() * remaining.length);', 'const index = 0;']],
  // attribution: the wonderkid and wildcard zones answer as Release AS answered (the fixed eight and the fixed ten)
  revert2: [
    [MAP, 'return variedChoices(prefetch.filter(p => p.age > 0 && p.age <= 21), slot, usedNames);',
      "return prefetch.filter(p => !usedNames.has(p.name) && fitsSlot(p, slot) && p.age > 0 && p.age <= 21).slice(0, 8).map(player => ({ player, outOfPosition: false }));"],
    [MAP, 'return variedChoices(prefetch, slot, usedNames);',
      "return prefetch.filter(p => !usedNames.has(p.name) && fitsSlot(p, slot)).slice(0, 10).map(player => ({ player, outOfPosition: false }));"],
  ],
};
const id = process.argv[2];
if (!M[id]) { console.error('unknown mutation ' + id); process.exit(2); }
for (const [file, from, to] of M[id]) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION CANNOT RUN: ${file} holds ${n} of its anchor: ${from.slice(0, 80)}`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, () => to));
}
console.log(`mutation ${id} applied to ${M[id].map(x => x[0]).join(', ')}`);
