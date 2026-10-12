// Round 1314 reviewer (run lens): a copy of simHalftime whose deaf control drops ONLY the line that puts the
// substitute on the pitch (a plausible indexOf of -1 bug: the sub is recorded, the shape still applies, the
// player never comes on). Run the copy with SIM_SEED=743293878 (the real file's own seed) and
// SIM_HALFTIME_CONTROL=deaf: exit 1 means the gain line saw it, exit 2 means it did not.
import fs from 'node:fs';

const src = fs.readFileSync('scripts/simHalftime.mjs', 'utf8').split('\r\n').join('\n');
const start = src.indexOf('  const DEAF = [\n');
const end = src.indexOf('\n  ];\n', start);
if (start < 0 || end < 0) { console.error('mkHalfDeaf: the DEAF list is not where it was'); process.exit(3); }
const firstLine = "    '    live.onPitch[idx] = change.inId;\\n',\n";
const block = src.slice(start, end);
if (!block.includes(firstLine)) { console.error('mkHalfDeaf: the onPitch line is not the list entry it was'); process.exit(3); }
const out = src.slice(0, start) + '  const DEAF = [\n' + firstLine.replace(/,\n$/, '') + src.slice(end);
fs.writeFileSync('scripts/htHalfDeaf.mjs', out);
console.log('mkHalfDeaf: scripts/htHalfDeaf.mjs written, its DEAF list holds the onPitch line alone');
