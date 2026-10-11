// Control for Release AW fix 8, run on the runner's checkout only (never committed): the champion's name in a
// row of Every tournament is replaced by the competition's short name. The comeback walk's history check must go
// red on its three tournament journeys and on nothing else.
import fs from 'node:fs';
const file = 'src/components/soccer-career/InternationalPanel.tsx';
const src = fs.readFileSync(file, 'utf8');
const from = '<span className="min-w-0 break-words">{h.champion}</span>';
const to = '<span className="min-w-0 break-words">{h.short}</span>';
const count = src.split(from).length - 1;
if (count !== 1) { console.error('MUTATION REFUSED: anchor found ' + count + ' times'); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log('MUTATION APPLIED: the champion name of a history row now prints the competition');
