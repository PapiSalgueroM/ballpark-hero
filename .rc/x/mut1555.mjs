/* Round 1555 adversarial review (runs lens): apply ONE small plausible mutation to the branch on a runner.
 * Usage: node .rc/x/mut1555.mjs <A..H>. Refuses (exit 2) unless the anchor is in its file exactly once.
 * The request line restores with git checkout -- src scripts in the same line. Never run on the owner's PC. */
import fs from 'node:fs';

const LIB = 'src/lib/nbaStartingFiveScore.ts';
const HOOK = 'src/hooks/useNbaLineup.ts';
const MUTS = {
  A: [LIB, '    const slotBest = up ? hi : lo, slotWorst = up ? lo : hi;', '    const slotBest = hi, slotWorst = lo;', 'Lowest: per pick best here reads the HIGHEST value'],
  B: [LIB, '    const gainedHere = up ? own.value - lo : hi - own.value;', '    const gainedHere = own.value - lo;', 'Lowest: per pick closeness not inverted'],
  C: [HOOK, '        challenge.direction,\n', "        'highest',\n", 'hook scores every five as Highest (swapped argument)'],
  D: [HOOK, "        .eq('team', team)\n", '', 'hook pool read drops the team filter (whole league is the pool)'],
  E: [LIB, 'start < challenge.trackedFromStartYear', 'start <= challenge.trackedFromStartYear', 'steals and blocks floor off by one'],
  F: [LIB, '    return list.slice(0, NBA_FIVE_ROLES.length);', '    return list.slice(0, NBA_FIVE_ROLES.length - 1);', 'extremeFive keeps four candidates per slot, not five'],
  G: [LIB, '      if (!isPositionEligibleForSlot(e.position, role)) continue;\n      const v = valueFor(e, challenge);\n      if (v.ok) list.push', '      const v = valueFor(e, challenge);\n      if (v.ok) list.push', 'extremeFive ignores the slot rule'],
  H: [LIB, "  if (/^\\d{4}$/.test(s)) return Number(s) - 1;", "  if (/^\\d{4}$/.test(s)) return Number(s);", 'a bare year read as a start year'],
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
