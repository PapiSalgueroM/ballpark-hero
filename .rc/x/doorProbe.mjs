// Round 1214 probe, run on a GitHub runner only (sent as .rc/x/doorProbe.mjs, never committed):
// a bundler took src/lib/cmAgeRead.ts with its two script imports, and the bundle answers.
import fs from 'node:fs';

const file = process.argv[2];
const door = await import(file);
const out = fs.readFileSync(file, 'utf8');
const got = {
  vanDijk: door.ageRead(80, 35),
  founder: door.levelFrom(86, 21),
  messi2010: door.readInWorld(90, 22, { stretch: r => (r <= 80 ? r : Math.min(99, Math.round(r + (r - 80) * 0.7))), top: 97, ageShift: door.ERA_RATING_AGE_SHIFT }),
  constants: [door.RATING_FLOOR, door.RATING_CEIL, door.LEVEL_MAX, door.CM_AGE_CURVE, door.ERA_RATING_AGE_SHIFT],
};
const want = { vanDijk: 85, founder: 89, messi2010: { level: 97, age: 23, rating: 97 }, constants: [48, 94, 99, 2, 1] };
const nodeModules = /node:|require\(/.test(out);
console.log(`bundle ${out.length} bytes, pulls a node module: ${nodeModules}`);
console.log(JSON.stringify(got));
if (JSON.stringify(got) !== JSON.stringify(want) || nodeModules) { console.log('doorProbe: FAIL'); process.exit(1); }
console.log('doorProbe: the bundled door answers as the library does');
