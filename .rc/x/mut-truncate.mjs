// Control truncate of scripts/playFoSeasonCard.mjs: the leader name's truncate class put back in the shared season card.
// Edits the runner's checkout only (the request line restores src after the walk). Refuses unless its anchor is there exactly once.
import fs from 'node:fs';
const f = 'src/components/front-office-shared/FoSeasonStatsCard.tsx';
const s = fs.readFileSync(f, 'utf8');
const from = '<span className="min-w-0 break-words">{i + 1}. {r.name}';
if (s.split(from).length !== 2) { console.error(`mut-truncate: the anchor is not in ${f} exactly once`); process.exit(2); }
fs.writeFileSync(f, s.replace(from, '<span className="truncate">{i + 1}. {r.name}'));
console.log('mut-truncate: the leader name is truncated again');
