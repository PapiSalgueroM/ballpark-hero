/* Round 1216 fix pass, a one time mutation for a remote check (never committed): put back, in the runner's
   checkout only, what a keeper's own goal did before the fix pass, one input at a time. The request line restores
   the file. Each anchor must be in the file exactly once or nothing is changed (exit 7).
     corner  the corner is left to the line's own flank again (the fix of review finding 1 reverted)
     up      the keeper stays lying in his dive (the fix of review findings 3 and 8 reverted)
     both    both */
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'src/components/pitch-motion/motion.tsx';
const EDITS = {
  corner: ["const flank: PitchEvent['flank'] = !man ? own.flank : (man.keeper ? drawn(own.flank, PLANT_SPAN).ball.x : man.x) < 50 ? 'left' : 'right';", "const flank: PitchEvent['flank'] = man && !man.keeper ? (man.x < 50 ? 'left' : 'right') : own.flank;"],
  up: [' * (1 - smooth(since)) || 0, catching: reach', ', catching: reach'],
};
const mode = process.argv[2];
const names = mode === 'both' ? ['corner', 'up'] : Object.hasOwn(EDITS, mode) ? [mode] : null;
if (!names) { console.log('mut-keeper: unknown mode. NOT APPLIED.'); process.exit(7); }
let source = readFileSync(file, 'utf8');
for (const name of names) {
  const [anchor, replacement] = EDITS[name];
  if (source.split(anchor).length !== 2) { console.log(`mut-keeper: the anchor of ${name} is not in ${file} exactly once. NOT APPLIED.`); process.exit(7); }
  source = source.replace(anchor, replacement);
}
writeFileSync(file, source);
console.log(`mut-keeper: reverted in the runner's checkout: ${names.join(' and ')}`);
