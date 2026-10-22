// Walk control for Round 1520: shownNation reads the verified map only, so a made up man shows no flag.
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const from = '  return p.nation ?? nationalityOf(eraId, p.name);';
const to = '  return nationalityOf(eraId, p.name);';
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutShown: the anchor is there ${n} times, refusing`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log('mutShown: shownNation now reads the verified map only');
