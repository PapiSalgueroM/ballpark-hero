// Reviewer probe (rBVG-cm-bv) of simWorldUcl section 5. Hypothesis: the "field still changed" check compares the
// head and holder-off careers at a rollover AFTER the two careers already parted (a reordered or moved field at an
// earlier rollover makes every later season different), so a later comparison is of two different worlds.
// The probe prints where each pair parts and, for each rollover, its step; with RV_HOLDER_SKIP=1 the check is
// only made at a rollover at or before the parting (later ones are printed as SKIPPED with their verdict).
// Run from the repo root on the runner; restore with git checkout -- scripts afterwards.
import fs from 'node:fs';
const file = 'scripts/simWorldUcl.mjs';
let src = fs.readFileSync(file, 'utf8');
const once = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`rvProbeHolder: anchor stands ${n} times, refusing: ${from.slice(0, 60)}`); process.exit(9); }
  src = src.replace(from, to);
};
const forEachLine = '    rolls[0].forEach((ra, j) => {';
once(forEachLine, [
  '    const at0 = a.findIndex((x, i) => !b[i] || x.json !== b[i].json || x.drawSha !== b[i].drawSha);',
  '    const idxOf = l => a.findIndex(x => x.label === l);',
  "    console.log(`  5 probe: ${name}: parts at ${at0 < 0 ? 'never' : a[at0].label + ' (step ' + at0 + ')'}; rollovers ${rolls[0].map(r => r.label + '@' + idxOf(r.label) + (r.W ? ' W ' + r.W : ' no winner')).join(', ')}`);",
  forEachLine,
].join('\n'));
const checkLine = '        ok(same([...ra.field].sort(), [...rb.field].sort()), `5 holder: ${name} ${ra.label}: ${ra.W} was in the field already and the field still changed its clubs`);';
const skip = process.env.RV_HOLDER_SKIP === '1';
once(checkLine, [
  '        const afterPart = at0 >= 0 && idxOf(ra.label) > at0;',
  "        const eq = same([...ra.field].sort(), [...rb.field].sort());",
  "        console.log(`  5 probe: ${name} ${ra.label}: holder ${ra.W} already in; ${afterPart ? 'AFTER the parting' : 'at or before the parting'}; same clubs ${eq}${eq ? '' : '; head has ' + ra.field.filter(c => !rb.field.includes(c)).join('+') + ', off has ' + rb.field.filter(c => !ra.field.includes(c)).join('+')}`);",
  skip ? '        if (!afterPart) ' + checkLine.trim() : checkLine,
].join('\n'));
fs.writeFileSync(file, src);
console.log(`rvProbeHolder: applied (skip after parting: ${skip})`);
