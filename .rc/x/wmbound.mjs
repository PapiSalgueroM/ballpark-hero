// Release BV probe (never committed): widen playCmWorldMoves' Everton seed search from 40 to argv[2] in this checkout.
import fs from 'node:fs';
const f = 'scripts/playCmWorldMoves.mjs';
const n = Number(process.argv[2] || 400);
const s = fs.readFileSync(f, 'utf8');
const from = 'seed <= 40 && !pick';
if (s.split(from).length !== 2) { console.log(`wmbound: "${from}" stands ${s.split(from).length - 1} times, refusing`); process.exit(2); }
fs.writeFileSync(f, s.replace(from, `seed <= ${n} && !pick`));
console.log(`wmbound: seed search widened to ${n}`);
