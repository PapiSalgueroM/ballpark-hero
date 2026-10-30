// Negative control for the L3 seam: take the hold out of UsCareerBoard's keep effect (run on the runner only,
// inside a line that restores the file with git checkout). Exits 1 unless the string it mutates is there.
import fs from 'node:fs';
const f = 'src/components/us-career/UsCareerBoard.tsx';
const s = fs.readFileSync(f, 'utf8');
const old = '|| saveFailure || intlRepairPending) return;';
if (!s.includes(old)) { console.error('mutl3hold: anchor not found, control ABORTED'); process.exit(1); }
fs.writeFileSync(f, s.replace(old, '|| saveFailure) return;'));
console.log('mutl3hold: the hold is out of the keep effect');
