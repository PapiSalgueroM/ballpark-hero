/* Review mutations (Round 1520, run lens). node review-run-mut.mjs <id> edits src/lib/clubManager.ts in place on the
   runner (the request line restores it with git checkout). Exits 3, MUTATION ABORT, when the anchor is not there once. */
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const MUTS = {
  /* M1, a swapped argument: the man an AI club buys is drawn at the buyer, not the club that listed him. */
  aiswap: ['    const nation = madeUpNationAt(player.name, from === state.clubName ? careerPlace(state) : clubPlace(from, state.eraId), state.eraId);',
    '    const nation = madeUpNationAt(player.name, from === state.clubName ? careerPlace(state) : clubPlace(to, state.eraId), state.eraId);'],
  /* M2, a dropped carry: a free agent signed from the pool loses the country he carried. */
  fasign: ['    value: fa.value, generated: fa.generated, ...(fa.nation ? { nation: fa.nation } : {}),', '    value: fa.value, generated: fa.generated,'],
  /* M3, a dropped carry: a man whose deal runs out walks to the pool without his country. */
  expiry: ['      value: p.value, generated: madeUp(p) || undefined, ...(p.nation ? { nation: p.nation } : {}), since: career.season + 1,',
    '      value: p.value, generated: madeUp(p) || undefined, since: career.season + 1,'],
  /* M4, a rule lost in the move: the club's own country (Auckland FC, Wellington Phoenix) no longer read. */
  noown: ['  const own = club === null ? undefined : leagueRulesOf(leagueId).clubCountry?.[club];', '  const own: string | undefined = undefined;'],
};
const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.log(`MUTATION ABORT: unknown ${id}`); process.exit(3); }
const src = fs.readFileSync(F, 'utf8');
const n = src.split(m[0]).length - 1;
if (n !== 1) { console.log(`MUTATION ABORT: ${id} anchor found ${n} times`); process.exit(3); }
fs.writeFileSync(F, src.replace(m[0], m[1]));
console.log(`MUTATION APPLIED: ${id}`);
