// Release BV probe (never committed): make simOneOffCups section 3 and simWorldUcl section 5 say WHAT differs where
// they fail on the joined head (rBVg-rgC). Run from the checkout's root; restore with git checkout -- scripts.
import fs from 'node:fs';
const plant = (f, from, to) => {
  const s = fs.readFileSync(f, 'utf8');
  if (s.split(from).length !== 2) { console.log(`cupProbe: an anchor stands ${s.split(from).length - 1} times in ${f}, refusing`); process.exit(2); }
  fs.writeFileSync(f, s.replace(from, to));
};
const which = process.argv[2];
if (which === 'oo') {
  const f = 'scripts/simOneOffCups.mjs';
  plant(f, "steps.push({ label, m: mark && s ? mark(s) : false, h: record && s ?", "steps.push({ label, rec: record && s ? record(s) : null, m: mark && s ? mark(s) : false, h: record && s ?");
  const from = "if (x.h !== y.h) { ok(false, `3 ${tag} at ${x.label}: the state differs in a key other than worldComps.dsc`); break; }";
  const to = "if (x.h !== y.h) { const walk = (p, q, at) => { if (JSON.stringify(p) === JSON.stringify(q)) return null; if (p && q && typeof p === 'object' && typeof q === 'object') { for (const k of new Set([...Object.keys(p), ...Object.keys(q)])) { const d = walk(p[k], q[k], `${at}.${k}`); if (d) return d; } } return `${at}: ${JSON.stringify(p)?.slice(0, 160)} vs ${JSON.stringify(q)?.slice(0, 160)}`; }; console.log(`PROBE 3 ${tag} at ${x.label}: ${walk(JSON.parse(x.rec), JSON.parse(y.rec), '')}`); ok(false, `3 ${tag} at ${x.label}: the state differs in a key other than worldComps.dsc`); break; }";
  plant(f, from, to);
} else if (which === 'ucl') {
  const f = 'scripts/simWorldUcl.mjs';
  const from = "`5 holder: ${name} ${ra.label}: ${ra.W} was in the field already and the field still changed its clubs`";
  const to = "`5 holder: ${name} ${ra.label}: ${ra.W} was in the field already and the field still changed its clubs; head only ${JSON.stringify(ra.field.filter(c => !rb.field.includes(c)))}, holder off only ${JSON.stringify(rb.field.filter(c => !ra.field.includes(c)))}`";
  plant(f, from, to);
} else { console.log('cupProbe: oo or ucl'); process.exit(2); }
console.log(`cupProbe: planted (${which})`);
