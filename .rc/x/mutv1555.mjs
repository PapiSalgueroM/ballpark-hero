/* Round 1555 closing check: the run reviewer's mutations A, B, C, D and F from .tmp-fx/mut1555.mjs, unchanged
 * except mutC's anchor, whose indent moved from 8 to 4 spaces when the fixer lifted the scoring call out of the
 * hook body into scoreNbaLineup (the same token swap: challenge.direction becomes 'highest').
 * Usage: node .rc/x/mutv1555.mjs <A|B|C|D|F>. Refuses (exit 2) unless the anchor is in its file exactly once.
 * The request line restores with git checkout -- src scripts in the same line. Never run on the owner's PC. */
import fs from 'node:fs';

const LIB = 'src/lib/nbaStartingFiveScore.ts';
const HOOK = 'src/hooks/useNbaLineup.ts';
const MUTS = {
  A: [LIB, '    const slotBest = up ? hi : lo, slotWorst = up ? lo : hi;', '    const slotBest = hi, slotWorst = lo;', 'Lowest: per pick best here reads the HIGHEST value'],
  B: [LIB, '    const gainedHere = up ? own.value - lo : hi - own.value;', '    const gainedHere = own.value - lo;', 'Lowest: per pick closeness not inverted'],
  C: [HOOK, '    challenge.direction,\n', "    'highest',\n", 'hook scores every five as Highest (swapped argument)'],
  D: [HOOK, "        .eq('team', team)\n", '', 'hook pool read drops the team filter (whole league is the pool)'],
  F: [LIB, '    return list.slice(0, NBA_FIVE_ROLES.length);', '    return list.slice(0, NBA_FIVE_ROLES.length - 1);', 'extremeFive keeps four candidates per slot, not five'],
};
const key = process.argv[2];
const m = MUTS[key];
if (!m) { console.error(`MUTATION ABORT: unknown mutation ${key}`); process.exit(2); }
const [file, from, to, what] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ABORT: ${key} anchor found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${key} APPLIED to ${file}: ${what}`);
