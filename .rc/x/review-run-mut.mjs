// Reviewer (run lens) mutation applier for Round 1570. Usage: node .rc/x/review-run-mut.mjs <name>
// Applies ONE small plausible mutation to the checked out source; the request line restores with git checkout.
// Exit 7 (never 0 or 1) when the string is not in the file exactly once, so a refused mutation never reads as red.
import { readFileSync, writeFileSync } from 'node:fs';

const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const MODULE = 'src/lib/usCareerHallWall.ts';
const MUTS = {
  // M1: hallKept counts any plaque on the wall, not this career's (a dropped key filter).
  hallKeptAny: [BOARD,
    'const hallKept = hallWallKeyNow !== null && !!wall?.entries.some(e => e.key === hallWallKeyNow);',
    'const hallKept = hallWallKeyNow !== null && !!wall?.entries.length;'],
  // M2: eviction reads the legacy verdict (hof) instead of the Hall vote's outcome (a swapped field).
  evictByHof: [MODULE,
    "if (next[i].hall.outcome !== 'inducted') { drop = i; break; }",
    'if (!next[i].hof) { drop = i; break; }'],
  // M3: a stale, too tight key bound (a 24 letter name plus draft pick, year, salt and counts runs past it).
  keyMax56: [MODULE, 'export const HALL_WALL_KEY_MAX = 200;', 'export const HALL_WALL_KEY_MAX = 56;'],
  // M4: the "not on it" line drops its retirement screen condition (a dropped conjunct).
  missingAlways: [BOARD, "missing={view.from === 'retired' && !hallKept}", 'missing={!hallKept}'],
  // M5: the upsert moves a changed plaque to the front instead of replacing it where it hangs.
  upsertFront: [MODULE, 'return list.map((e, i) => (i === at ? entry : e));', 'return [entry, ...list.filter((_, i) => i !== at)];'],
  // M6: the eviction scans newest first (drops the NEWEST miss, an off by direction).
  evictNewest: [MODULE, 'for (let i = next.length - 1; i >= 1; i -= 1) if', 'for (let i = 1; i < next.length; i += 1) if'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`MUTATION ${name}: unknown`); process.exit(7); }
const [file, from, to] = m;
const src = readFileSync(file, 'utf8');
const norm = src.replace(/\r\n/g, '\n');
const hits = norm.split(from).length - 1;
if (hits !== 1) { console.log(`MUTATION ${name}: NOT APPLIED, string found ${hits} times in ${file}`); process.exit(7); }
writeFileSync(file, norm.replace(from, to));
console.log(`MUTATION ${name}: applied to ${file}`);
