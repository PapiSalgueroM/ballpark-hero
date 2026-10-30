// Fix 1593 probe: revert ONE of the fixer's engine edits in the runner's checkout (never committed).
// node .rc/x/mutFix1593.mjs <noet|nowin>
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const EDITS = {
  noet: ['      ...(my.settles ? { extraTime: true } : {}),\n', ''],
  nowin: ['  const wonUelHere = !moving && wonUelPlayed;', '  const wonUelHere = false;'],
};
const which = process.argv[2];
const e = EDITS[which];
if (!e) { console.log(`mutFix1593: no edit named ${which}`); process.exit(2); }
const text = fs.readFileSync(F, 'utf8');
const n = text.split(e[0]).length - 1;
if (n !== 1) { console.log(`mutFix1593: ${which}: the line stands ${n} times, it must be once`); process.exit(2); }
fs.writeFileSync(F, text.replace(e[0], e[1]));
console.log(`mutFix1593: ${which} applied`);
