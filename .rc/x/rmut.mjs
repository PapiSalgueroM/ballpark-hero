/* Round 1216 review (lens RUN): one named mutation of the own goal's code, applied to the runner's checkout.
   Never committed. Exit 7 when an anchor is missing or not unique, so a mutation that never applied cannot read as a red. */
import fs from 'node:fs';
const MOTION = 'src/components/pitch-motion/motion.tsx';
const SURFACE = 'src/components/pitch-motion/PitchSurface.tsx';
const M = {
  corner: [MOTION, "(man.x < 50 ? 'left' : 'right')", "(man.x < 50 ? 'right' : 'left')"],
  band: [MOTION, 'Math.max(13, Math.min(18, depth(place.y)))', 'Math.max(13, Math.min(48, depth(place.y)))'],
  bandlow: [MOTION, 'Math.max(13, Math.min(18, depth(place.y)))', 'Math.max(3, Math.min(18, depth(place.y)))'],
  walkers: [MOTION, 'const stood = elapsed > NET_AT ? at(NET_AT) : whole;', 'const stood = whole;'],
  lateman: [MOTION, 'const walked = smooth(elapsed / touchAt);', 'const walked = smooth(elapsed / NET_AT);'],
  nullkey: [MOTION, 'ownGoalBy: man?.key ?? null }', 'ownGoalBy: man?.key }'],
  ogbyorder: [MOTION, 'return conceding.find(p => p.key === event.ogBy) ?? (event.text ? conceding.find(p => p.name === event.text) : undefined) ?? null;', 'return (event.text ? conceding.find(p => p.name === event.text) : undefined) ?? conceding.find(p => p.key === event.ogBy) ?? null;'],
  surface: [SURFACE, "data-pm-own-goal={frame.ownGoalBy === undefined ? undefined : frame.ownGoalBy ?? ''}", 'data-pm-own-goal={undefined}'],
  ruekeeper: [MOTION, '{ ...poses[man.key], catching: reach * .6, rue }', '{ ...poses[man.key], catching: reach * .6 }'],
  clamp: [MOTION, 'let x = Math.max(24, Math.min(76, place.x));', 'let x = place.x;'],
  touchkeeper: [MOTION, 'touch = (mine ? at(touchAt).theirs : at(touchAt).mine).find(p => p.key === man.key) ?? man;', 'touch = man;'],
  celebside: [MOTION, 'for (const key in poses) delete poses[key].hop;', 'for (const key in poses) { delete poses[key].hop; delete poses[key].celebrate; }'],
  ruefig: [MOTION, "data-pm-rue={rue ? '1' : undefined}", 'data-pm-rue={undefined}'],
  plainmoved: [MOTION, 'const flight = bounded((p - .24) / .48);', 'const flight = bounded((p - .24) / .5);'],
  marked: [SURFACE, "data-pm-own-goal={frame.ownGoalBy === undefined ? undefined : frame.ownGoalBy ?? ''}", "data-pm-own-goal={frame.ownGoalBy ?? ''}"],
  ogbefore: [MOTION, "if (action.event.og && action.event.kind === 'goal' && !action.event.penalty && !action.event.freeKick) return ownGoalFrame(scene, action, elapsed);", 'void ownGoalFrame;'],
  kind: [MOTION, "if (action.event.og && action.event.kind === 'goal' && !action.event.penalty", 'if (action.event.og && !action.event.penalty'],
};
const name = process.argv[2];
const spec = M[name];
if (!spec) { console.log(`rmut: unknown mutation ${name}`); process.exit(7); }
const [file, anchor, replacement] = spec;
const source = fs.readFileSync(file, 'utf8');
const count = source.split(anchor).length - 1;
if (count !== 1) { console.log(`rmut: the anchor of ${name} is in ${file} ${count} times, wanted once. NOT APPLIED.`); process.exit(7); }
fs.writeFileSync(file, source.replace(anchor, replacement));
console.log(`rmut: applied ${name} to ${file}`);
