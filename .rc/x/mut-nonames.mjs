// Control nonames of scripts/playNflSeasonStats.mjs: the board hands the Game Day tile no credits. Edits the runner's
// checkout only (the request line restores src after the walk). Refuses unless its anchor is there exactly once.
import fs from 'node:fs';
const f = 'src/components/front-office/FrontOfficeBoard.tsx';
const s = fs.readFileSync(f, 'utf8');
const from = 'credits={key => nflPlaysFor(league, key)}';
if (s.split(from).length !== 2) { console.error(`mut-nonames: the anchor is not in ${f} exactly once`); process.exit(2); }
fs.writeFileSync(f, s.replace(from, ''));
console.log('mut-nonames: the board hands the tile no credits');
