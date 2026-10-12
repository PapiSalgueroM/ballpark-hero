// Compares two season digest records value by value (never committed). Usage: node cmpReceipt.mjs <old.json> <new.json>
// The 42 values: careers, strayDraws, and for each sport and seed set: seasons, derived, season, careers.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const vals = r => {
  const out = { careers: r.careers, strayDraws: r.strayDraws };
  for (const [sport, sets] of Object.entries(r.digests)) for (const [k, d] of Object.entries(sets)) for (const f of ['seasons', 'derived', 'season', 'careers']) out[`${sport}|${k}|${f}`] = d[f];
  return out;
};
const va = vals(a); const vb = vals(b);
const keys = [...new Set([...Object.keys(va), ...Object.keys(vb)])];
const moved = keys.filter(k => va[k] !== vb[k]);
console.log(`values: ${keys.length}; moved: ${moved.length}${moved.length ? ` (${moved.slice(0, 8).join(', ')})` : ''}`);
const ia = { ...a.inputs, ...a.movedAtRecord }; const ib = { ...b.inputs, ...b.movedAtRecord };
const files = [...new Set([...Object.keys(ia), ...Object.keys(ib)])].sort();
const differ = files.filter(f => ia[f] !== ib[f]);
console.log(`bundled files: ${Object.keys(ia).length} at the old record, ${Object.keys(ib).length} at the new; differing or added or gone: ${differ.map(f => `${f}${!(f in ia) ? ' (new)' : !(f in ib) ? ' (gone)' : ''}`).join(', ') || 'none'}`);
console.log(`old commit ${a.commit}, new commit ${b.commit}; round ${a.round} / ${b.round}; moved list equal: ${JSON.stringify(a.moved) === JSON.stringify(b.moved)}`);
