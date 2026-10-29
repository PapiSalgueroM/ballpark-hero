// Reviewer plant (the critic's =slashdup, correction 6): Morton's record entry gains a club he already has. Record only.
import fs from 'node:fs';
const F = 'scripts/data/bingoClubAdditions-2026-10.json';
const record = JSON.parse(fs.readFileSync(F, 'utf8'));
const m = record.additions.find(e => e.name === 'Tyler Morton');
if (!m || !(m.tableClubs ?? []).includes('olympique lyon')) { console.error('plant: Morton or his Lyon table club missing'); process.exit(2); }
m.clubs.push({ ...m.clubs[0], club: 'Olympique Lyon' });
fs.writeFileSync(F, JSON.stringify(record, null, 2) + '\n');
console.log('plant: Olympique Lyon added to Morton\'s record clubs (he already has it in the table)');
