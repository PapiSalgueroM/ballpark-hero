// Release BK triage: compares two US board recordings (scripts/data/usBoardFixture.json shape) and says whether what
// moved is ONLY the markup hash (m) of steps, and on which screens (grouped by the step's text excerpt). Any other
// difference (a click, a save hash, a field, a text excerpt, a length, coverage, a fixed save, the first paint) is a STOP.
// usage: node .tmp-fx/triage/usBoardDiff.mjs old.json new.json
import fs from 'node:fs';
const [a, b] = process.argv.slice(2, 4).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const J = JSON.stringify;
let stops = 0;
const stop = m => { stops += 1; if (stops <= 20) console.log(`  STOP ${m}`); };
const hdr = Object.keys({ ...a.header, ...b.header }).filter(k => J(a.header[k]) !== J(b.header[k]));
console.log(`header fields differ: ${hdr.join(', ') || 'none'}; new recordedFrom ${String(b.header.recordedFrom).slice(0, 110)}`);
let total = 0;
for (const sport of Object.keys({ ...a.sports, ...b.sports })) {
  const x = a.sports[sport], y = b.sports[sport];
  if (!x || !y) { stop(`${sport}: missing in one file`); continue; }
  for (const k of Object.keys({ ...x, ...y })) if (!['path', 'screens', 'ssrCreate'].includes(k) && J(x[k]) !== J(y[k])) stop(`${sport}.${k} differs`);
  const ssr = J(x.ssrCreate) === J(y.ssrCreate) ? 'same' : (x.ssrCreate?.len === y.ssrCreate?.len ? 'm differs, len same' : `differs (len ${x.ssrCreate?.len} to ${y.ssrCreate?.len})`);
  const walks = [['path', x.path, y.path], ...Object.keys({ ...x.screens, ...y.screens }).map(s => [`screens.${s}`, x.screens[s], y.screens[s]])];
  let steps = 0, mOnly = 0; const where = new Map(); const byWalk = [];
  for (const [name, p, q] of walks) {
    if (!Array.isArray(p) || !Array.isArray(q)) { stop(`${sport}.${name}: not an array in one file`); continue; }
    if (p.length !== q.length) stop(`${sport}.${name}: length ${p.length} to ${q.length}`);
    let n = 0;
    for (let i = 0; i < Math.min(p.length, q.length); i += 1) {
      steps += 1;
      if (J(p[i]) === J(q[i])) continue;
      const f = Object.keys({ ...p[i], ...q[i] }).filter(k => J(p[i][k]) !== J(q[i][k]));
      if (f.length === 1 && f[0] === 'm') { mOnly += 1; n += 1; const t = String(q[i].t ?? '').slice(0, 34); where.set(t, (where.get(t) || 0) + 1); }
      else stop(`${sport}.${name} step ${i} ("${String(q[i].a).slice(0, 40)}"): fields ${f.join(', ')}`);
    }
    if (n) byWalk.push(`${name} ${n}`);
  }
  total += mOnly;
  console.log(`${sport}: ${steps} steps compared, ${mOnly} differ in markup only (${byWalk.join(', ') || 'none'}); first paint ssrCreate ${ssr}`);
  for (const [t, c] of where) console.log(`    ${c} x screen text "${t}"`);
}
console.log(stops ? `usBoardDiff: ${stops} STOP(s), ${total} markup only steps` : `usBoardDiff: MARKUP ONLY, ${total} steps, no click, save, field, text, length or coverage moved`);
process.exit(stops ? 1 : 0);
