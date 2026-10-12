// Round 1313 attribution (sent to a runner as an extra file, never committed). Compares two US board recordings:
// node cmpBoard.mjs <old.json> <new.json> [default|claim]
// default: equal byte for byte with the header's recordedFrom aside (attribution (i)).
// claim: per sport, equal or not; for a sport that moved, the first path step whose save differs, the first
// top level key of that save that differs, and the counts of the draft's 3.9 row (iii).
import { readFileSync } from 'node:fs';
const [aFile, bFile, mode = 'default'] = process.argv.slice(2);
const A = JSON.parse(readFileSync(aFile, 'utf8')); const B = JSON.parse(readFileSync(bFile, 'utf8'));
const strip = j => { const c = JSON.parse(JSON.stringify(j)); delete c.header.recordedFrom; return JSON.stringify(c); };
if (mode === 'default') {
  const same = strip(A) === strip(B);
  console.log(`header aside: ${same ? 'BYTE EQUAL' : 'DIFFERENT'} (${readFileSync(aFile).length} and ${readFileSync(bFile).length} bytes)`);
  if (!same) for (const s of Object.keys(A.sports)) console.log(`  ${s}: ${JSON.stringify(A.sports[s]) === JSON.stringify(B.sports[s]) ? 'equal' : 'differs'}`);
  process.exit(same ? 0 : 1);
}
for (const s of Object.keys(A.sports)) {
  const a = A.sports[s]; const b = B.sports[s];
  if (JSON.stringify(a) === JSON.stringify(b)) { console.log(`${s}: byte equal`); continue; }
  const steps = Math.min(a.path.length, b.path.length);
  let first = -1;
  for (let i = 0; i < steps; i += 1) if (JSON.stringify(a.path[i]) !== JSON.stringify(b.path[i])) { first = i; break; }
  const save = st => { try { return typeof st.save === 'string' ? JSON.parse(st.save) : st.save; } catch { return null; } };
  let key = 'n/a';
  if (first >= 0) {
    const x = save(a.path[first]) ?? {}; const y = save(b.path[first]) ?? {};
    key = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])).join(', ') || 'the save is equal, the step differs elsewhere';
  }
  const screens = o => Object.values(o.screens).reduce((n, st) => n + st.length, 0);
  const savesMoved = Object.keys(a.saves).filter(k => JSON.stringify(a.saves[k]) !== JSON.stringify(b.saves[k]));
  console.log(`${s}: differs. First path step that differs: ${first} of ${steps} (keys of that step's save that differ: ${key}). Clicks ${a.path.length} to ${b.path.length}, seasons ${a.coverage.seasons} to ${b.coverage.seasons}, screen steps ${screens(a)} to ${screens(b)}, fixed saves moved ${savesMoved.length} of ${Object.keys(a.saves).length} (${savesMoved.join(', ')})`);
}
