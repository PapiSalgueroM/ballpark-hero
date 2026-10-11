// A measuring copy of the other lane's results layout walk, for the merged head of Release AW (never committed).
// The page's phone and training buttons are the base's (Rounds 1188 to 1191), so the walk's control "the original
// page really has the dock on top of the result" has no original to build: the page did not change in this merge.
// This copy drops that one control and nothing else, so the three healthy profiles and the history control can run.
import fs from 'node:fs';
const src = 'scripts/playSoccerResultsLayout.mjs', out = 'scripts/zzResultsLayoutVariant.mjs';
let t = fs.readFileSync(src, 'utf8');
const swaps = [
  ["for(const [id,file] of [['original-utilities','src/pages/SoccerCareer.tsx'],['original-history','src/components/soccer-career/InternationalPanel.tsx']])",
    "for(const [id,file] of [['original-history','src/components/soccer-career/InternationalPanel.tsx']])"],
  ['assert.equal(report.cases.length,5);assert.equal(report.controls.length,2);', 'assert.equal(report.cases.length,4);assert.equal(report.controls.length,1);'],
  ["'scripts/playSoccerResultsLayout.mjs','scripts/qa/soccerResultsLayout.mjs'", "'scripts/zzResultsLayoutVariant.mjs','scripts/qa/soccerResultsLayout.mjs'"],
];
for (const [from, to] of swaps) {
  const n = t.split(from).length - 1;
  if (n !== 1) { console.error(`VARIANT CANNOT BE MADE: ${JSON.stringify(from.slice(0, 60))} is there ${n} times`); process.exit(3); }
  t = t.replace(from, () => to);
}
fs.writeFileSync(out, t);
console.log('variant written:', out);
