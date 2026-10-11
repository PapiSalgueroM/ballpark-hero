// Round 1306, attribution leg A: put the rule before the round back (a club with no eleven is wholly unnamed).
import fs from 'node:fs';
const file = 'src/lib/clubManagerLeagueBook.ts';
const from = '  if (!roster.length) return null;';
const to = '  if (roster.length >= 0) return null;';
const text = fs.readFileSync(file, 'utf8');
if (text.split(from).length !== 2) { console.error('mutOld: the anchor is not in the file exactly once'); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log('mutOld: partialEleven now names nobody (the rule before Round 1306)');
