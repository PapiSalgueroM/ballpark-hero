// Fix pass scratch (sent to the runner as .rc/x/mutWatch.mjs, never committed): the reviewer's mutation `watch`.
// The Watch again link asks about his club of TODAY where it must ask about his club of that season.
import fs from 'node:fs';

const file = 'src/components/us-career/season/UsSeasonCentreEntry.tsx';
const src = fs.readFileSync(file, 'utf8');
const from = '!sport.seasonCentreHeld?.(last.year, career.eraId, { pos: career.pos, team: last.team })';
const to = '!sport.seasonCentreHeld?.(last.year, career.eraId, { pos: career.pos, team: career.team })';
if (src.split(from).length !== 2) { console.error('mutWatch: the anchor is not exactly once in the entry, refusing'); process.exit(2); }
fs.writeFileSync(file, src.replace(from, () => to));
console.log('mutWatch: applied');
