// Release AV scratch (sent to the runner as .rc/x/patchPlayfirst.mjs): in the RUNNER'S copy of
// scripts/playUsSeasonCentre.mjs only, let the control playfirst's anchor read a minified name that holds a
// dollar sign. A trial: the file is restored in the same request line.
import fs from 'node:fs';
const F = 'scripts/playUsSeasonCentre.mjs';
const src = fs.readFileSync(F, 'utf8');
const from = String.raw`const re = /await (\w+)\.ready\((\w+)\)/g;`;
const to = String.raw`const re = /await ([\w$]+)\.ready\(([\w$]+)\)/g;`;
if (src.split(from).length !== 2) { console.error('patchPlayfirst: the control line is not in the walk exactly once'); process.exit(2); }
fs.writeFileSync(F, src.replace(from, () => to));
console.log('patchPlayfirst: the anchor reads a name with a dollar sign too (this run only)');
