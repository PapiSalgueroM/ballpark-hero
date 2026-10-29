// One off mutation for the runner: plant one Math.random after the board read effect's Hall gate (readdraw's edit),
// so the C8b vitest output shows WHY it goes red. The line that runs this restores the file with git checkout.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/components/us-career/UsCareerBoard.tsx';
const READ = 'if (!sport.hall) return;\n    try {\n      const raw = localStorage.getItem(hallWallKey(sport.slug));';
const src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(READ).length - 1;
if (n !== 1) { console.error(`mut-readdraw: anchor found ${n} times, not once; refusing`); process.exit(2); }
writeFileSync(FILE, src.replace(READ, READ.replace('if (!sport.hall) return;', 'if (!sport.hall) return; Math.random();')));
console.log('mut-readdraw: planted one Math.random in the read effect');
