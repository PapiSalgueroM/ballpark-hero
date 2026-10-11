/* Round 1302 fix pass: one small mutation applied to the RUNNER's checkout, never to the repo (sent as an extra file).
 * Usage: node .rc/x/fxMut.mjs <name>. Each asserts its anchor exists exactly once, then writes the file. */
import fs from 'node:fs';
const name = process.argv[2];
const screen = 'src/components/club-manager/LiveSimScreen.tsx';
function swap(file, from, to) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`fxMut ${name}: ABORT, anchor found ${n} times in ${file}`); process.exit(7); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`fxMut ${name}: applied to ${file}`);
}
if (name === 'latestaged') {
  /* the plan stages a ruled out goal of the last two clock places again (what the mutations m1 and m2 of the run
     review came to): at the whistle's place it becomes the last kick and the real chance one place before it is dropped */
  swap(screen, 'placeOf(e) <= stageStop - RULED_OUT_ROOM ? ruledOutChance(e) : e', 'placeOf(e) <= stageStop ? ruledOutChance(e) : e');
} else if (name === 'committed') {
  /* the run review's m3: the clause that keeps a ruled out goal's action committed is taken out */
  swap(screen, "|| feed.includes(motionEvent.event)\n    || feed.some(e => isRuledOut(e) && ruledOutKey(e) === motionEvent.key);", '|| feed.includes(motionEvent.event);');
} else if (name === 'nohold') {
  /* the whistle no longer waits for the ruled out goal the clock stopped for */
  swap(screen, '    if (whistleHeld.current) return;\n', '');
} else if (name === 'cardalone') {
  /* no stoppage: a ruled out goal the plan does not stage is a card on its own again */
  swap(screen, 'const nextStopped = !!nextReview && isRuledOut(nextReview) && !ruledOutAt.has(nextReview.review!.id);', 'const nextStopped = false;');
} else if (name === 'capearly') {
  /* the old corner: with no free instant the card opens 0.05 before the whistle on whatever is there */
  swap(screen, '      if (stops && t > stageStop - 0.05) return Math.max(floor, stageStop);\n', '');
} else if (name === 'linelate') {
  /* the last kick's line waits for the review again, so its goal is on the score and not on the list */
  swap(screen, 'if (reviewDue && reviewCap.current < stageStop - 1e-6 && isChance(e) && firesAt(e) >= reviewCap.current - 1e-6) continue;', 'if (reviewDue && isChance(e) && firesAt(e) >= reviewCap.current - 1e-6) continue;');
} else if (name === 'othernet') {
  /* the ruled out goal is drawn for the wrong side: its ball ends in the other net */
  swap(screen, "side: nextReview.side, kind: 'goal', text: nextReview.text }, key: ruledOutKey(nextReview), at: clock });", "side: nextReview.side === 'me' ? 'opp' : 'me', kind: 'goal', text: nextReview.text }, key: ruledOutKey(nextReview), at: clock });");
} else if (name === 'pillunder') {
  /* the stoppage no longer waits for the pill of a real goal that has just been told */
  swap(screen, 'if ((stoppage && stoppage.id === id) || goalPill.current) return;', 'if (stoppage && stoppage.id === id) return;');
} else {
  console.log(`fxMut: unknown mutation ${name}`); process.exit(7);
}
