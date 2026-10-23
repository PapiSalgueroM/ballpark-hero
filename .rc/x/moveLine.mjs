// Move one of shareVerdict's lines in place (the caller restores the file from a copy).
// usage: node moveLine.mjs <lib path> hi|lo <value>
import fs from 'node:fs';
const [file, which, value] = process.argv.slice(2);
const src = fs.readFileSync(file, 'utf8');
const old = which === 'hi' ? 'if (share >= 0.3) return true;' : 'if (share < 0.1) return false;';
const neu = which === 'hi' ? `if (share >= ${value}) return true;` : `if (share < ${value}) return false;`;
if (!src.includes(old)) { console.error('MOVE ABORTED: line not found'); process.exit(2); }
fs.writeFileSync(file, src.replace(old, neu));
console.log(`moved ${which} to ${value}`);
