/* Round 1539 mutation (never committed): take the away card's two Round 1536 props back out, as 1536's "oldaway"
   did, in the copy of the tree this runs in. Each replaced string must occur exactly once. */
import fs from 'node:fs';
const file = 'src/pages/StadiumTycoon.tsx';
let text = fs.readFileSync(file, 'utf8');
const edits = [
  [' style={OVERLAY_ABOVE_BANNER} onClick={g.dismissAway}>', ' onClick={g.dismissAway}>'],
  [` text-center overflow-y-auto" style={boxInsideOverlay('100%')} onClick`, ' text-center" onClick'],
];
for (const [from, to] of edits) {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION oldaway ABORTED: "${from}" occurs ${n} times`); process.exit(2); }
  text = text.replace(from, to);
}
fs.writeFileSync(file, text);
console.log('MUTATION oldaway applied: the away card lost OVERLAY_ABOVE_BANNER and boxInsideOverlay (2 edits)');
