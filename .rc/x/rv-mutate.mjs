/* Round 1101 REVIEW mutations (runner lens). Not committed: sent as .rc/x/rv-mutate.mjs.
   node .rc/x/rv-mutate.mjs <id> rewrites ONE place in the checked out tree (the runner's throwaway copy),
   after asserting the needle occurs exactly once, and prints what it did. */
import fs from 'node:fs';

const SCENE = 'src/components/pitch-motion/scene.ts';
const VIEWER = 'src/components/club-manager/LiveSimScreen.tsx';
const MUTATIONS = {
  /* The side that SCORED kicks off after a goal, instead of the side that conceded. */
  kickoffside: [SCENE, 'kickoff(after, defending, 3, n, `g${a.order}`);', 'kickoff(after, side, 3, n, `g${a.order}`);'],
  /* A throw in is handed to the other team than the feed line names. */
  throwside: [SCENE, "const side = present(event.side);\n      const spot = (before: PitchPoint): PitchPoint => ({ x: before.x < 50 ? 2 : 98", "const side = present(other(event.side));\n      const spot = (before: PitchPoint): PitchPoint => ({ x: before.x < 50 ? 2 : 98"],
  /* The team that committed the foul takes the free kick. */
  foulside: [SCENE, 'const side = present(other(event.side));', 'const side = present(event.side);'],
  /* A corner the feed calls left is taken from the right flag. */
  cornerflank: [SCENE, "(event.flank === 'left' ? 2.5 : 97.5)", "(event.flank === 'left' ? 97.5 : 2.5)"],
  /* A goal kick after a miss is given to the side that shot. */
  goalkickside: [SCENE, "state: 'goalkick', via: 'follow', side: defending,\n        carrier: keeperOf(lists[defending])?.key ?? null", "state: 'goalkick', via: 'follow', side,\n        carrier: keeperOf(lists[side])?.key ?? null"],
  /* The stage change into extra time no longer ends what was playing. */
  etclear: [VIEWER, "setStage('extra');\n        clearAction();", "setStage('extra');"],
  /* Under reduced motion the clock is held for the whole action, not its first stretch. */
  reducedhold: [VIEWER, 'const holding = cardUp && !!gm && (!reducedMotion || clock - gm.at < GOAL_HOLD_SPAN);', 'const holding = cardUp && !!gm;'],
  /* The score no longer waits in the frame before the motion state has landed. */
  flash: [VIEWER, "return due && due.kind === 'goal' && due.side !== 'none' && motionEvent?.event !== due && playsOut(due) ? due.side : null;", 'return null;'],
  /* The side that kicked off the first half kicks off the second too. */
  secondkick: [VIEWER, "const kicking: PitchSide = stage === 'second' ? (first === 'me' ? 'opp' : 'me') : first;", 'const kicking: PitchSide = first;'],
  /* The pitch is handed the OTHER side's share of the ball. */
  possession: [VIEWER, 'possession: (share ?? 50) / 100,', 'possession: (100 - (share ?? 50)) / 100,'],
  /* The card counts a scorer's goals in the whole match, later ones included. */
  nth: [VIEWER, "e.text === goal.text && (upTo < 0 || i <= upTo)).length;", 'e.text === goal.text).length;'],
  /* The goal card of the other side's goal is counted for my player of the same name: side check dropped. */
  cardside: [VIEWER, "const player = goal.side === 'me' ? career.squad.find(p => p.name === goal.text) : undefined;", 'const player = career.squad.find(p => p.name === goal.text);'],
};

if (process.env.RV_DRY) {
  for (const [name, [f, n]] of Object.entries(MUTATIONS)) console.log(name, fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split(n).length - 1);
  process.exit(0);
}
const id = process.argv[2];
const m = MUTATIONS[id];
if (!m) { console.error(`unknown mutation ${id}; known: ${Object.keys(MUTATIONS).join(' ')}`); process.exit(2); }
const [file, needle, put] = m;
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const count = text.split(needle).length - 1;
if (count !== 1) { console.error(`mutation ${id} cannot run: its needle occurs ${count} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, text.replace(needle, put));
console.log(`mutation ${id} applied to ${file}`);
