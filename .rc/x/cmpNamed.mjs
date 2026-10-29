// Round 1566 fix pass (never committed): compare two recordings of scripts/data/nbaNamedBlockFixture.json with the
// ids taken by their place past the league's lowest, since each run of the base engine mints with its own random
// epoch. node .rc/x/cmpNamed.mjs <committed.json> <recorded again.json>
import fs from 'node:fs';

const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, 'utf8')));
const byPlace = f => JSON.stringify(f.block).replace(new RegExp('n' + f.ep + '-(\\d+)', 'g'), (_, k) => `#${Number(k) - f.low}`);
const pa = byPlace(a), pb = byPlace(b);
const ka = JSON.stringify(a.packed), kb = JSON.stringify(b.packed);
const firstDiff = (x, y) => { let i = 0; while (i < x.length && x[i] === y[i]) i += 1; return i; };
console.log(`committed: from ${a.recordedFrom}, seed ${a.seed}, epoch ${a.ep}, low ${a.low}; again: from ${b.recordedFrom}, seed ${b.seed}, epoch ${b.ep}, low ${b.low}`);
console.log(`block by place: ${pa.length} and ${pb.length} characters, ${pa === pb ? 'the same' : `differ at ${firstDiff(pa, pb)}`}`);
console.log(`packed: ${ka.length} and ${kb.length} characters, ${ka === kb ? 'the same' : `differ at ${firstDiff(ka, kb)}`}`);
const raw = pa.includes('#') && !/n[0-9a-z]{2,}-\d+/.test(pa);
console.log(`every id in the committed block was renamed by place: ${raw}`);
const same = pa === pb && ka === kb && a.seed === b.seed && a.recordedFrom === b.recordedFrom && raw;
console.log(same ? 'CMP_NAMED: the recording reproduces from 5d1198389, ids aside' : 'CMP_NAMED: the recordings DIFFER');
process.exit(same ? 0 : 1);
