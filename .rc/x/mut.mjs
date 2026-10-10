/* Reviewer's mutations for Round 1220. Runs on the runner only (sent as .rc/x/mut.mjs), on the runner's own checkout.
   node .rc/x/mut.mjs <id>   applies ONE mutation to a source file, after asserting the needle is there exactly once.
   The request line restores the file with git checkout in the same line. */
import fs from 'node:fs';

const MUTS = {
  /* off by one: his own pick is also shown as a plain row before the closing row */
  endoff: ['src/lib/careerDraftNight.ts', 'const end = d.pick === null ? total : d.pick - 1;', 'const end = d.pick === null ? total : d.pick;'],
  /* off by one: the tail starts one pick early, so one pick is inside the gap and a row too */
  tailoff: ['src/lib/careerDraftNight.ts', 'for (let pick = end - tail + 1; pick <= end; pick += 1) board.push(pickRow(pick));', 'for (let pick = end - tail; pick <= end; pick += 1) board.push(pickRow(pick));'],
  /* boundary: a range that ends exactly on the last pick is called "and undrafted" */
  rangeedge: ['src/lib/careerPreDraft.ts', 'if (p.hi > p.total) return', 'if (p.hi >= p.total) return'],
  /* swapped argument on the closing row the player reads */
  rowswap: ['src/components/career/DraftNightSequence.tsx', 'Your name is called. Round {closing.round}, pick {closing.pickInRound}.', 'Your name is called. Round {closing.round}, pick {closing.pick}.'],
  /* swapped arguments in the sentence a screen reader hears */
  lineswap: ['src/lib/careerDraftNight.ts', 'return `Round ${row.round}, pick ${row.pickInRound}, ${row.pick} overall.', 'return `Round ${row.round}, pick ${row.pick}, ${row.pickInRound} overall.'],
  /* dropped term: the late end of the range forgets the position offset */
  hioff: ['src/lib/careerPreDraft.ts', 'hi: preDraftBoardRankAt(s.stock, total, 1) + off, total };', 'hi: preDraftBoardRankAt(s.stock, total, 1), total };'],
  /* stale field: the words above the board are held until the FIRST row, not the closing row */
  holdoff: ['src/components/us-career/ProspectJourney.tsx', 'nightKit.careerNightClock(night).closeAt}s', 'nightKit.careerNightClock(night).start}s'],
  /* dropped condition: confetti mounts with the night, not when the row lands */
  confearly: ['src/components/career/DraftNightSequence.tsx', "{over && closing.kind === 'you' && closing.round === 1 && <ConfettiBurst", "{closing.kind === 'you' && closing.round === 1 && <ConfettiBurst"],
  /* dropped condition: less motion no longer starts the night on its last frame */
  motionoff: ['src/components/us-career/ProspectJourney.tsx', "setNightStage(!nightKit ? 'off' : lessMotion() ? 'skipped' : 'live');", "setNightStage(!nightKit ? 'off' : 'live');"],
  /* seed read from the wrong list: every lottery tile says its seed is its slot */
  seedswap: ['src/lib/careerDraftNight.ts', 'lottery.push({ slot, team, seed: o.standings.indexOf(team) + 1 });', 'lottery.push({ slot, team, seed: o.order.indexOf(team) + 1 });'],
  /* sign flipped on the tile: a club that moved up is said to have moved down */
  movedflip: ['src/components/career/DraftNightSequence.tsx', 'seed: r.seed, moved: r.seed - r.slot }))}', 'seed: r.seed, moved: r.slot - r.seed }))}'],
};

const id = process.argv[2];
if (id === '--check') {
  for (const [k, [f, n]] of Object.entries(MUTS)) console.log(k, fs.readFileSync(f, 'utf-8').split(n).length - 1);
  process.exit(0);
}
const m = MUTS[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(3); }
const [file, needle, repl] = m;
const src = fs.readFileSync(file, 'utf-8');
const count = src.split(needle).length - 1;
if (count !== 1) { console.error(`MUTATION ABORTED: needle of ${id} occurs ${count} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, src.replace(needle, repl));
console.log(`MUTATION APPLIED: ${id} in ${file}`);
