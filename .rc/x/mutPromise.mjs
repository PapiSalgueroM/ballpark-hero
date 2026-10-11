// Control for the broken promise rule on the brief's path: take the clause out of the engine (runner checkout only).
import fs from 'node:fs';
const file = 'src/lib/soccerCareerEngine.ts';
const from = '  if (Math.random() >= 0.5 && !programmePromiseBroken(prev)) {';
const to = '  if (Math.random() >= 0.5) {';
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`CONTROL CANNOT RUN: the clause is in ${file} ${n} times`); process.exit(3); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log('mutation applied: the brief path draws a plain coin again');
