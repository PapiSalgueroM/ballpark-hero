/* Round 1220 fix pass: the mutations that prove the new checks bite. Runs on the runner only (sent as
   .rc/x/fmut.mjs), on the runner's own checkout. node .rc/x/fmut.mjs <id> applies ONE mutation after
   asserting its needle is in the file exactly once. The request line restores the file with git checkout. */
import fs from 'node:fs';

const MUTS = {
  /* The reviewer's four survivors and its holdoff, needles as on the fixed head. */
  rowswap: ['src/components/career/DraftNightSequence.tsx', 'Your name is called. Round {closing.round}, pick {closing.pickInRound}.', 'Your name is called. Round {closing.round}, pick {closing.pick}.'],
  movedflip: ['src/components/career/DraftNightSequence.tsx', 'seed: r.seed, moved: r.seed - r.slot }))}', 'seed: r.seed, moved: r.slot - r.seed }))}'],
  rangeedge: ['src/lib/careerPreDraft.ts', 'if (p.hi > p.total) return', 'if (p.hi >= p.total) return'],
  lineswap: ['src/lib/careerDraftNight.ts', 'return `Round ${row.round}, pick ${row.pickInRound}, ${row.pick} overall.', 'return `Round ${row.round}, pick ${row.pick}, ${row.pickInRound} overall.'],
  holdoff: ['src/components/us-career/ProspectJourney.tsx', 'nightKit.careerNightClock(night).closeAt}s', 'nightKit.careerNightClock(night).start}s'],
  /* The fix pass's own. A hold that ends one second early (finding 4's own example). */
  holdshort: ['src/components/us-career/ProspectJourney.tsx', 'nightKit.careerNightClock(night).closeAt}s', 'nightKit.careerNightClock(night).closeAt - 1}s'],
  /* The tile is handed the city and the name again (findings 2 and 9). */
  labelfull: ['src/components/career/DraftNightSequence.tsx', 'const tileLabel = desc.teamShort ?? desc.teamLabel;', 'const tileLabel = desc.teamLabel;'],
  /* The file shows the numbers after the minors while the night still plays (findings 13 and 14). */
  fileearly: ['src/components/us-career/ProspectJourney.tsx', 'const after = held ? undefined : out;', 'const after = out;'],
  /* The title is back in a screen reader's tree while the rows arrive (finding 15). */
  ariaoff: ['src/components/us-career/ProspectJourney.tsx', '<h2 ref={titleRef} tabIndex={-1} aria-hidden={held || undefined}>', '<h2 ref={titleRef} tabIndex={-1}>'],
  /* The narrow phone rule for the night\'s two buttons is gone (findings 7 and 11). */
  narrowoff: ['src/components/us-career/ProspectJourney.module.css', ' .playArea [data-night-actions] button { padding-inline: 4px; font-size: 12px; }', ''],
};

const id = process.argv[2];
if (id === '--check') {
  let bad = 0;
  for (const [k, [f, n]] of Object.entries(MUTS)) { const c = fs.readFileSync(f, 'utf-8').split(n).length - 1; if (c !== 1) bad += 1; console.log(k, c); }
  process.exit(bad ? 3 : 0);
}
const m = MUTS[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(3); }
const [file, needle, repl] = m;
const src = fs.readFileSync(file, 'utf-8');
const count = src.split(needle).length - 1;
if (count !== 1) { console.error(`MUTATION ABORTED: needle of ${id} occurs ${count} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, src.replace(needle, () => repl));
console.log(`MUTATION APPLIED: ${id} in ${file}`);
