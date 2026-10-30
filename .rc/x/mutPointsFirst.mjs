// Round 1600 runner mutation (never committed): put the past seasons' age points UNDER the stretch, Round 1102's
// order, in src/lib/clubManagerEras.ts. The era harnesses must go red on it. Restored by the request line.
import fs from 'node:fs';
const f = 'src/lib/clubManagerEras.ts';
const s = fs.readFileSync(f, 'utf8');
const from = '      const shown = readInWorld(b.r, b.a, world).rating;';
const to = '      const shown = eraUpliftRating(eraId, readInWorld(b.r, b.a, { ageShift: ERA_RATING_AGE_SHIFT }).rating);';
if (s.split(from).length !== 2) { console.log('MUTATION pointsfirst NOT APPLIED: anchor missing'); process.exit(2); }
fs.writeFileSync(f, s.replace(from, to));
console.log('MUTATION pointsfirst APPLIED');
