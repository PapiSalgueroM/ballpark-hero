// Fixer of Round 1570: the rewrite mutation (the keep effect writes the same plaque on every load), applied on a
// runner so careerSeasonReview's "the second open writes nothing" can be shown to fail. Exit 7 if the string is
// not in the board exactly once (a refusal, never a fired mutation). The request line restores with git checkout.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/components/us-career/UsCareerBoard.tsx';
const FROM = 'if (next !== was.entries) localStorage.setItem(';
const src = readFileSync(FILE, 'utf8');
const n = src.split(FROM).length - 1;
if (n !== 1) { console.error(`mut-rewrite: the string is in the board ${n} times, not once: REFUSED`); process.exit(7); }
writeFileSync(FILE, src.replace(FROM, 'if (true) localStorage.setItem('));
console.log('mut-rewrite: the keep effect now writes on every load');
