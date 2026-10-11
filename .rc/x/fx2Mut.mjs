/* Round 1302 fix 2: one small mutation applied to the RUNNER's checkout, never to the repo (sent as an extra file).
 * Usage: node .rc/x/fx2Mut.mjs <name>. Each asserts its anchor exists exactly once, then writes the file. */
import fs from 'node:fs';
const name = process.argv[2];
const screen = 'src/components/club-manager/LiveSimScreen.tsx';
function swap(file, from, to) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`fx2Mut ${name}: ABORT, anchor found ${n} times in ${file}`); process.exit(7); }
  fs.writeFileSync(file, src.replace(from, () => to));
  console.log(`fx2Mut ${name}: applied to ${file}`);
}
if (name === 'lineleft') {
  /* the screen as it was before this pass: the last small line told stays under a ruled out goal and its card */
  swap(screen, 'useEffect(() => { if (ruledOutOn && eventLine) setEventLine(null); }, [ruledOutOn, eventLine]);', 'useEffect(() => { void ruledOutOn; void eventLine; }, [ruledOutOn, eventLine]);');
} else if (name === 'lineonce') {
  /* the line is cleared when the goal starts and not again: a line told while the goal is in the air would stay */
  swap(screen, 'useEffect(() => { if (ruledOutOn && eventLine) setEventLine(null); }, [ruledOutOn, eventLine]);', 'useEffect(() => { if (ruledOutOn) setEventLine(null); }, [ruledOutOn]);');
} else {
  console.log(`fx2Mut: unknown mutation ${name}`); process.exit(7);
}
