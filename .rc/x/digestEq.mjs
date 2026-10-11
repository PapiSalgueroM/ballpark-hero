// Fix pass scratch (sent to the runner as .rc/x/digestEq.mjs, never committed): are the digest VALUES of two
// records of scripts/simUsSeasonCentre.mjs equal, whatever files each was made on?
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
let n = 0; let differ = 0;
for (const sport of Object.keys(a.digests)) {
  for (const set of Object.keys(a.digests[sport])) {
    for (const k of ['seasons', 'derived', 'season', 'careers']) {
      n += 1;
      const x = a.digests[sport][set][k]; const y = b.digests?.[sport]?.[set]?.[k];
      if (x !== y) { differ += 1; console.log(`DIFFERENT ${sport} set ${set} ${k}: ${x} against ${y}`); }
    }
  }
}
for (const k of ['careers', 'strayDraws']) { n += 1; if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { differ += 1; console.log(`DIFFERENT ${k}: ${JSON.stringify(a[k])} against ${JSON.stringify(b[k])}`); } }
const moved = Object.keys(b.inputs).filter(f => a.inputs[f] !== b.inputs[f]);
console.log(`inputs whose blob differs between the two records: ${moved.length}${moved.length ? ` (${moved.join(', ')})` : ''}; made on ${a.commit} and ${b.commit}`);
console.log(`digestEq: ${n} values compared, ${differ} differ`);
process.exit(differ ? 1 : 0);
