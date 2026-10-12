// Round 1318 measurement (sent as .rc/x/patchStory.mjs, never committed): log the saved pool of generated rivals as
// its own part of the save in src/test/careerStory.test.tsx, and the rest without it, before any budget is set.
import fs from 'node:fs';
const f = 'src/test/careerStory.test.tsx';
let t = fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n');
const swap = (a, b) => { if (t.split(a).length !== 2) { console.error('PATCH ABORTED: anchor not once: ' + a.slice(0, 60)); process.exit(3); } t = t.replace(a, () => b); };
swap('    wheel: bytesOf(s.chanceWheel),\n', '    wheel: bytesOf(s.chanceWheel),\n    pool: bytesOf(s.generatedBallonPool),\n');
swap('    rest: bytesOf({ ...s, leagueWorld: undefined, chanceWheel: undefined, seasons:', '    rest: bytesOf({ ...s, leagueWorld: undefined, chanceWheel: undefined, generatedBallonPool: undefined, seasons:');
swap("    console.log(`[save parts] seed ${seed}: opening cup ties", "    console.log(`[pool part] seed ${seed}: pool ${p.pool} bytes over ${s.generatedBallonPool?.entries?.length} entries, rest without it ${p.rest} bytes`);\n    console.log(`[save parts] seed ${seed}: opening cup ties");
fs.writeFileSync(f, t);
console.log('PATCHED: the pool is its own part, logged');
