/* Round 1216, a one time mutation for a remote check (never committed): take the one entry line of the own goal
   out of the shared pitch part, so the build draws the picture from before this round (the feed still says og,
   the card still says (O.G), and the grass shows a striker scoring). The request line restores the file. */
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'src/components/pitch-motion/motion.tsx';
const anchor = "if (action.event.og && action.event.kind === 'goal' && !action.event.penalty && !action.event.freeKick) return ownGoalFrame(scene, action, elapsed);";
const source = readFileSync(file, 'utf8');
const count = source.split(anchor).length - 1;
if (count !== 1) { console.error(`mut-ogbefore: the entry line is in ${file} ${count} times, not once: nothing was changed`); process.exit(2); }
writeFileSync(file, source.replace(anchor, 'void ownGoalFrame;'));
console.log(`mut-ogbefore: the own goal's entry line is out of ${file}`);
