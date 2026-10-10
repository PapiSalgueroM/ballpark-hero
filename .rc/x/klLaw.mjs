// keeper-libs reviewer: the score law's own drift, in a runner's checkout only (one constant, where the law lives).
import fs from 'node:fs';
const f = 'src/lib/gameLaws/nflScore.ts';
const from = 'export const FG_A_DRIVE = 0.1445;';
const s = fs.readFileSync(f, 'utf8');
if (!s.includes(from)) { console.error('klLaw: CANNOT RUN, the constant is not in ' + f); process.exit(2); }
fs.writeFileSync(f, s.replace(from, 'export const FG_A_DRIVE = 0.1545;'));
console.log('klLaw: FG_A_DRIVE 0.1445 -> 0.1545 in ' + f);
