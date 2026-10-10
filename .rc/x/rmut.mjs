/* Reviewer's mutations for Round 1228 (the run lens). Usage: node .rc/x/rmut.mjs <name>
 * Each mutation is one exact line of the pushed source, required to be there exactly once (exit 2 otherwise),
 * replaced in place. The caller restores with git checkout -- src scripts. Never committed. */
import fs from 'node:fs';

const SLATE = 'src/lib/leagueSlate.ts';
const UCL = 'src/lib/uclLeaguePhase.ts';
const HARNESS = 'scripts/simCmLeaguePhase.mjs';
const M = {
  /* The escape order reversed: the ban gives way before the cap. */
  climb: [[SLATE,
    '      const pairs = drawPairs(spec, sh.n, cap, floor.breaks + db, floor.overCap + dc, sub);',
    '      const pairs = drawPairs(spec, sh.n, cap, floor.breaks + dc, floor.overCap + db, sub);']],
  /* A stale constant on the wrapper every caller of Round B goes through: the cap handed in as three. */
  cap3: [[UCL,
    'assoc: names.map(a => ids.indexOf(a)), cap: UCL_LEAGUE.capPerAssociation };',
    'assoc: names.map(a => ids.indexOf(a)), cap: 3 };']],
  /* The reader of my own night says home where the slate says away. */
  homeflag: [[UCL,
    '    if (homeOf(code) === me) return { opponent: slate.clubs[awayOf(code)], home: true };',
    '    if (homeOf(code) === me) return { opponent: slate.clubs[awayOf(code)], home: false };'],
  [UCL,
    '    if (awayOf(code) === me) return { opponent: slate.clubs[homeOf(code)], home: false };',
    '    if (awayOf(code) === me) return { opponent: slate.clubs[homeOf(code)], home: true };']],
  /* The saved slate no longer says it is the recorded pattern. */
  nofallbackflag: [[UCL,
    'breaks: slate.breaks, overCap: slate.overCap, ...(slate.fallback ? { fallback: true as const } : {}) };',
    'breaks: slate.breaks, overCap: slate.overCap };']],
  /* The away side's opponents are not counted in the three opponent steps. */
  opponents: [[UCL,
    '    met[h].push(a); met[a].push(h);',
    '    met[h].push(a);']],
  /* The play-off pairings feeding the 1 or 2 line and the 3 or 4 line swapped. */
  feedswap: [[UCL,
    '  { seeds: [1, 2], playoff: 3 }, { seeds: [3, 4], playoff: 2 }, { seeds: [5, 6], playoff: 1 }, { seeds: [7, 8], playoff: 0 },',
    '  { seeds: [1, 2], playoff: 2 }, { seeds: [3, 4], playoff: 3 }, { seeds: [5, 6], playoff: 1 }, { seeds: [7, 8], playoff: 0 },']],
  /* The cap is counted for the host only, never for the visitor. */
  onesidecap: [[SLATE,
    '    const o = (faced[h * na + assoc[v]] >= cap ? 1 : 0) + (faced[v * na + assoc[h]] >= cap ? 1 : 0);',
    '    const o = (faced[h * na + assoc[v]] >= cap ? 1 : 0);']],
  /* One toss used twice: the seeded club in half one always gets the first play-off tie. */
  onetoss: [[UCL,
    '    const flipTies = toss() < 0.5;',
    '    const flipTies = flipSeeds;']],
  /* Two clubs may meet twice (home and away): the met check dropped. */
  twice: [[SLATE,
    '    if (h === v || met[h * n + v]) return null;',
    '    if (h === v) return null;']],
  /* Not a mutation of the library: section 4 of the harness on other seeds and more saves, to see whether
     the lead's number (87.1 percent) and the at the floor band hold off the recorded seed set. */
  seedsB: [[HARNESS, '      Math.random = mulberry(52000 + i);', '      Math.random = mulberry(913000 + i);'], [HARNESS, 'const SAVES = 240;', 'const SAVES = 480;']],
  seedsC: [[HARNESS, '      Math.random = mulberry(52000 + i);', '      Math.random = mulberry(77000 + i * 3);'], [HARNESS, 'const SAVES = 240;', 'const SAVES = 480;']],
  /* Section 1 on other seed sets: are the bands (990 and 5 in 1,000) a measurement or a coin toss? */
  setsB: [[HARNESS, 'const SETS = [11, 23, 37];', 'const SETS = [101, 211, 307, 401, 503];']],
};

const name = process.argv[2];
if (!Object.hasOwn(M, name)) { console.log(`rmut: unknown mutation ${name}`); process.exit(2); }
for (const [file, from, to] of M[name]) {
  const source = fs.readFileSync(file, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) { console.log(`rmut ${name}: the target line is in ${file} ${count} times, it must be exactly once`); process.exit(2); }
  fs.writeFileSync(file, source.replace(from, to));
}
console.log(`rmut ${name}: applied (${M[name].length} line${M[name].length > 1 ? 's' : ''})`);
