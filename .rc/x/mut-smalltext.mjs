// Control smalltext of scripts/playFoSeasonCard.mjs: one 10 px line put back in the shared season card (the sim note).
// Edits the runner's checkout only (the request line restores src after the walk). Refuses unless its anchor is there exactly once.
import fs from 'node:fs';
const f = 'src/components/front-office-shared/FoSeasonStatsCard.tsx';
const s = fs.readFileSync(f, 'utf8');
const from = '<p data-sim-note className="mt-0.5 text-center text-xs text-muted-foreground">';
if (s.split(from).length !== 2) { console.error(`mut-smalltext: the anchor is not in ${f} exactly once`); process.exit(2); }
fs.writeFileSync(f, s.replace(from, '<p data-sim-note className="mt-0.5 text-center text-[10px] text-muted-foreground">'));
console.log('mut-smalltext: the sim note is 10 px again');
