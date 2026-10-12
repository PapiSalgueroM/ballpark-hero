// Round 1311 step 5, digest attribution leg A: in a copy of the tree (argv[2]) the awards carry no team.
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.argv[2], 'src/lib/clubManagerLeagueBoards.ts');
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const from = '  const xi = teamOfSeason(input);\n  if (xi) out.xi = xi;\n';
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`attrA5: the anchor occurs ${n} times, not once`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, ''));
console.log('attrA5: the awards carry no team in the copy');
