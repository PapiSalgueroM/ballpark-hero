// Fences reviewer probe, runs ON THE RUNNER ONLY (its checkout is thrown away). Writes a copy of the committed
// shapes test that also prints both pages around the first difference, and whether a fresh daily draws the
// same page twice. Never run in the shared worktree.
import fs from 'node:fs';

const src = fs.readFileSync('src/test/dailySaveShapes.test.tsx', 'utf8');
const pushAnchor = "failures.push(`${form.name}: drew a different page from a fresh daily";
const freshAnchor = 'const fresh = await mount(row);';
for (const a of [pushAnchor, freshAnchor]) {
  if (!src.includes(a)) { console.error(`probe cannot be built: anchor missing: ${a}`); process.exit(2); }
}
const wide = "console.log('PROBE ' + JSON.stringify({ form: form.name, at, got: html.slice(Math.max(0, at - 120), at + 700), fresh: fresh.slice(Math.max(0, at - 120), at + 700), lenGot: html.length, lenFresh: fresh.length }));\n          ";
const twice = "\n      localStorage.clear();\n      seen.clear();\n      const fresh2 = await mount(row);\n      let at2 = 0;\n      while (at2 < fresh.length && fresh[at2] === fresh2[at2]) at2++;\n      console.log('PROBE2 ' + JSON.stringify({ sameFreshTwice: fresh2 === fresh, at2, a: fresh.slice(Math.max(0, at2 - 80), at2 + 300), b: fresh2.slice(Math.max(0, at2 - 80), at2 + 300) }));";
const out = src.replace(pushAnchor, wide + pushAnchor).replace(freshAnchor, freshAnchor + twice);
fs.writeFileSync('src/test/zzOlympicsProbe.test.tsx', out);
console.log(`probe written: ${out.length} chars`);
