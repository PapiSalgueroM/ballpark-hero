// Runner only: add one Math.random() call at the top of generateWeeklyNews in src/lib/clubManager.ts,
// so a harness that must catch a moved draw can be shown red. Refuses unless the anchor is there once.
import fs from 'node:fs';
const f = 'src/lib/clubManager.ts';
const s = fs.readFileSync(f, 'utf8');
const anchor = 'export function generateWeeklyNews(state: CareerState): void {\n';
const hits = s.split(anchor).length - 1;
if (hits !== 1) { console.log(`mutation cannot run: anchor found ${hits} times`); process.exit(2); }
fs.writeFileSync(f, s.replace(anchor, anchor + '  Math.random();\n'));
console.log('mutation applied: one draw at the top of generateWeeklyNews');
