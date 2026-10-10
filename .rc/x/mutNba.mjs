// One off, for a runner (files are LF there): takes Round 1003's second layer out of NBA Connections' submit,
// the line that asks takeNewerSave before the game's own click. Refuses (exit 9) when the line is not there once.
import fs from 'node:fs';
const file = 'src/hooks/useNbaConnections.ts';
const line = "    if (mode === 'daily' && takeNewerSave()) return;\n";
const text = fs.readFileSync(file, 'utf8');
const hits = text.split(line).length - 1;
if (hits !== 1) { console.error(`mutNba: expected the line once in ${file}, found it ${hits} times`); process.exit(9); }
fs.writeFileSync(file, text.replace(line, ''));
console.log(`mutNba: took "${line.trim()}" out of ${file}`);
