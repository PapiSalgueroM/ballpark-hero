// Release BS triage control for playSoccerLanding's FIRST_CHANGED binding: put pundit_season back into
// showActionButton in <root>/src/pages/SoccerCareer.tsx (the bar as it was before fix BS-sc421-3, cc0d5f466).
// Refuses (exit 3) when the line it mutates is not there, so a control that changed nothing cannot pass for one.
// node mutPundit.mjs <root>
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] || '.';
const file = path.join(root, 'src/pages/SoccerCareer.tsx');
const src = fs.readFileSync(file, 'utf8');
const old = 'career.phase === "manager_season" || career.phase === "owner_season";';
const next = 'career.phase === "manager_season" || career.phase === "pundit_season" || career.phase === "owner_season";';
const hits = src.split(old).length - 1;
if (hits !== 1) { console.error(`mutPundit: expected the showActionButton line once, found it ${hits} times; nothing changed`); process.exit(3); }
const line = src.split('\n').find(l => l.includes(old)) || '';
if (!line.includes('const showActionButton')) { console.error('mutPundit: the matched line is not showActionButton; nothing changed'); process.exit(3); }
fs.writeFileSync(file, src.replace(old, next));
console.log('mutPundit: pundit_season put back into showActionButton');
