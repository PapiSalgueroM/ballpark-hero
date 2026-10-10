/* Reviewer's compare of two digest records of scripts/simUsSeasonCentre.mjs (print mode), one made in a
   worktree of the base commit and one in the head checkout, on a fleet the builder never recorded. */
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
let n = 0;
let bad = 0;
let seasons = { nba: 0, nfl: 0 };
let derived = { nba: 0, nfl: 0 };
for (const slug of Object.keys(a.digests)) {
  for (const k of Object.keys(a.digests[slug])) {
    const x = a.digests[slug][k];
    const y = (b.digests[slug] ?? {})[k];
    n += 1;
    const same = !!y && x.seasons === y.seasons && x.derived === y.derived && x.season === y.season && x.careers === y.careers;
    if (!same) bad += 1;
    seasons[slug] += x.seasons;
    derived[slug] += x.derived;
    console.log(`${same ? 'ok  ' : 'FAIL'} ${slug} seed set ${k}: base ${x.seasons}/${x.derived} ${x.season?.slice(0, 12)} ${x.careers.slice(0, 12)} | head ${y ? `${y.seasons}/${y.derived} ${y.season?.slice(0, 12)} ${y.careers.slice(0, 12)}` : 'missing'}`);
  }
}
const keysSame = JSON.stringify(Object.keys(a.digests).map(s => [s, Object.keys(a.digests[s])])) === JSON.stringify(Object.keys(b.digests).map(s => [s, Object.keys(b.digests[s])]));
if (!keysSame) { bad += 1; console.log('FAIL the two records do not hold the same sports and seed sets'); }
n += 1;
if (a.strayDraws !== b.strayDraws) { bad += 1; console.log(`FAIL stray draws: base ${a.strayDraws}, head ${b.strayDraws}`); } else console.log(`ok   stray draws ${a.strayDraws} on both`);
const ia = a.inputs; const ib = b.inputs;
const moved = [...new Set([...Object.keys(ia), ...Object.keys(ib)])].filter(p => ia[p] !== ib[p]);
console.log(`bundled inputs outside the move's list: base ${Object.keys(ia).length}, head ${Object.keys(ib).length}, differing ${moved.length}${moved.length ? `: ${moved.join(', ')}` : ''}`);
console.log(`moved files in the bundle: base ${JSON.stringify(a.movedAtRecord)} | head ${JSON.stringify(b.movedAtRecord)}`);
console.log(`careers a sport and a seed set ${a.careers} and ${b.careers}; seasons nba ${seasons.nba} (derived ${derived.nba}), nfl ${seasons.nfl} (derived ${derived.nfl})`);
console.log(`review-run-cmp: ${n} digests compared, ${bad} differ`);
process.exit(bad ? 1 : 0);
