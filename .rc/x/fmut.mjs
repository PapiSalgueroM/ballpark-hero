/* The fixer's mutations for Round 1228. Usage: node .rc/x/fmut.mjs <name>
 * The first four are the reviewer's own (word for word from its rmut.mjs): three that SURVIVED every gate of
 * the round at head 682711e2 and one caught by section 4 alone. The fifth takes the floor fix back out.
 * Each is one exact line of the pushed source, required to be there exactly once (exit 2 otherwise).
 * The caller restores with git checkout -- src scripts. Never committed. */
import fs from 'node:fs';

const SLATE = 'src/lib/leagueSlate.ts';
const UCL = 'src/lib/uclLeaguePhase.ts';
const M = {
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
  /* The escape order reversed: the ban gives way before the cap. */
  climb: [[SLATE,
    '      const pairs = drawPairs(spec, sh.n, cap, floor.breaks + db, floor.overCap + dc, sub);',
    '      const pairs = drawPairs(spec, sh.n, cap, floor.breaks + dc, floor.overCap + db, sub);']],
  /* A stale constant on the wrapper: the cap handed in as three. */
  cap3: [[UCL,
    'assoc: names.map(a => ids.indexOf(a)), cap: UCL_LEAGUE.capPerAssociation };',
    'assoc: names.map(a => ids.indexOf(a)), cap: 3 };']],
  /* The floor as first written: an association with no club in a pot is left out. */
  floorabsent: [[SLATE,
    '      const k = m.get(x) ?? 0;',
    '      if (!m.has(x)) continue; const k = m.get(x) ?? 0;']],
};

const name = process.argv[2];
if (!Object.hasOwn(M, name)) { console.log(`fmut: unknown mutation ${name}`); process.exit(2); }
for (const [file, from, to] of M[name]) {
  const source = fs.readFileSync(file, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) { console.log(`fmut ${name}: the target line is in ${file} ${count} times, it must be exactly once`); process.exit(2); }
  fs.writeFileSync(file, source.replace(from, to));
}
console.log(`fmut ${name}: applied (${M[name].length} line${M[name].length > 1 ? 's' : ''})`);
