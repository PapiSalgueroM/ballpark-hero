// Round 1516 probe (runner only, never committed): proofWorldUclFleet's --strip worldComps.usc narrowed to a SEASON
// ONE slice (s === 1), so every later season's UEFA Super Cup (which the base c3309e67 plays too) stays compared.
// With MARK=1 a won UEFA Super Cup's trophy mark and event lines on THIS tree are read as the base's shield, to show
// the cabinet's mark is the only other difference.
import fs from 'node:fs';
const F = 'scripts/proofWorldUclFleet.mjs';
let src = fs.readFileSync(F, 'utf8');
const A = 'if (compareStrip && sub && s && s[top] && subs.some(x => x in s[top])) {';
const B = 'shown = { ...s, [top]: { ...s[top] } }; for (const x of subs) delete shown[top][x];';
const C = '    steps.push({ label, json: JSON.stringify(shown),';
const once = (t, a) => t.split(a).length === 2;
if (!once(src, A) || !once(src, B) || !once(src, C)) { console.log('mutProofS1: ABORTED, an anchor is not there exactly once'); process.exit(2); }
src = src.split(A).join('if (compareStrip && sub && s && s[top] && subs.some(x => x in s[top] && s[top][x] && s[top][x].s === 1)) {');
src = src.split(B).join('shown = { ...s, [top]: { ...s[top] } }; for (const x of subs) if (shown[top][x] && shown[top][x].s === 1) delete shown[top][x];');
if (process.env.MARK === '1') {
  const C2 = "    const markOf = j => compareStrip ? j.split('\"name\":\"UEFA Super Cup\",\"emoji\":\"\\u{1F3C6}\"').join('\"name\":\"UEFA Super Cup\",\"emoji\":\"\\u{1F6E1}\\u{FE0F}\"').split('\\u{1F3C6} The UEFA Super Cup').join('\\u{1F6E1}\\u{FE0F} The UEFA Super Cup') : j;\n    steps.push({ label, json: markOf(JSON.stringify(shown)),";
  src = src.split(C).join(C2);
}
fs.writeFileSync(F, src);
console.log(`mutProofS1: applied${process.env.MARK === '1' ? ' with the mark read as the shield' : ''}`);
