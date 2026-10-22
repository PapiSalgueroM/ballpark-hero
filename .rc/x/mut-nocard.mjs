// Control nocard of scripts/playNflSeasonStats.mjs: the recap's season card mount is taken out. Edits the runner's
// checkout only (the request line restores src after the walk). Refuses unless its anchor is there exactly once.
import fs from 'node:fs';
const f = 'src/components/front-office/FrontOfficeBoard.tsx';
const s = fs.readFileSync(f, 'utf8');
const from = '{!arriving && <NflSeasonCard league={league} myTeam={myTeam} label={label} mode="close" />}';
if (s.split(from).length !== 2) { console.error(`mut-nocard: the anchor is not in ${f} exactly once`); process.exit(2); }
fs.writeFileSync(f, s.replace(from, '{null}'));
console.log('mut-nocard: the recap draws no season card');
