// Release AV: is a retaken board recording what the two rounds say it must be?
// usage: node cmprec3.mjs <ours: the first lander's committed file> <retaken on the merged head> <theirs: the second lander's file> [sport the second lander moved, default nfl]
// Exits 0 when, apart from header.recordedFrom, every sport but the moved one is byte equal to OURS.
// Prints, for the moved sport, whether the retake equals THEIRS and the first paths that differ when it does not.
import { readFileSync } from 'node:fs';

const [fa, fb, fc, moved = 'nfl'] = process.argv.slice(2);
const [a, b, c] = [fa, fb, fc].map(f => JSON.parse(readFileSync(f, 'utf8')));
const S = v => JSON.stringify(v ?? null);
function firstDiffs(x, y, at, out, cap) {
  if (out.length >= cap) return;
  if (S(x) === S(y)) return;
  const ox = x && typeof x === 'object', oy = y && typeof y === 'object';
  if (!ox || !oy || Array.isArray(x) !== Array.isArray(y)) { out.push(`${at}: ${S(x).slice(0, 90)} -> ${S(y).slice(0, 90)}`); return; }
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) firstDiffs(x[k], y[k], `${at}/${k}`, out, cap);
}
const headerKeys = new Set([...Object.keys(a.header ?? {}), ...Object.keys(b.header ?? {})]);
const headerDiff = [...headerKeys].filter(k => S(a.header?.[k]) !== S(b.header?.[k]));
console.log(`header fields that differ from ours: ${headerDiff.join(', ') || 'none'}`);
for (const k of headerDiff) console.log(`  ${k}: ${S(a.header?.[k]).slice(0, 200)} -> ${S(b.header?.[k]).slice(0, 200)}`);
let bad = headerDiff.filter(k => k !== 'recordedFrom').length;
const tops = new Set([...Object.keys(a), ...Object.keys(b)]);
for (const k of tops) {
  if (k === 'header' || k === 'sports') continue;
  const same = S(a[k]) === S(b[k]);
  console.log(`${k}: ${same ? 'byte equal to ours' : 'DIFFERS from ours'}`);
  if (!same) bad += 1;
}
const sports = new Set([...Object.keys(a.sports ?? {}), ...Object.keys(b.sports ?? {}), ...Object.keys(c.sports ?? {})]);
for (const s of sports) {
  const eqOurs = S(a.sports?.[s]) === S(b.sports?.[s]);
  const eqTheirs = S(c.sports?.[s]) === S(b.sports?.[s]);
  console.log(`sports/${s}: retaken ${S(b.sports?.[s]).length} bytes; ${eqOurs ? 'byte equal to ours' : 'DIFFERS from ours'} (${S(a.sports?.[s]).length}); ${eqTheirs ? 'byte equal to theirs' : 'DIFFERS from theirs'} (${S(c.sports?.[s]).length})`);
  if (s !== moved && !eqOurs) { bad += 1; const out = []; firstDiffs(a.sports?.[s], b.sports?.[s], `sports/${s}`, out, 8); out.forEach(l => console.log('    ours->retaken ' + l)); }
  if (s === moved && !eqTheirs) { const out = []; firstDiffs(c.sports?.[s], b.sports?.[s], `sports/${s}`, out, 12); out.forEach(l => console.log('    theirs->retaken ' + l)); }
  if (s === moved && eqOurs) console.log(`    NOTE: the moved sport ${s} is byte equal to ours, so the second lander moved nothing here`);
}
console.log(bad ? `cmprec3: ${bad} parts differ from ours beyond the stamp and the moved sport ${moved}` : `cmprec3: apart from header.recordedFrom and sports/${moved} the retaken recording is ours`);
process.exit(bad ? 1 : 0);
