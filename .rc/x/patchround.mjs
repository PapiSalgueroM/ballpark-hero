/* Round 1146 ladder helper (never committed; sent with a remote check as .rc/x/patchround.mjs).
   Takes one or both of the round's two engine calls out of a COPY of clubManager.ts:
     node patchround.mjs <path to a copy of clubManager.ts> og        the own goal tag call
     node patchround.mjs <path to a copy of clubManager.ts> legs      the quick sim coach's legs call
     node patchround.mjs <path to a copy of clubManager.ts> og legs   both
   Each anchor must occur exactly once or it refuses. */
import fs from 'node:fs';

const [file, ...what] = process.argv.slice(2);
const PATCH = {
  og: ['  tagOwnGoals(state, live, fx, half, me.goals, oppGoals);', '  void tagOwnGoals;'],
  legs: ['    restLegs(at);', '    void restLegs;'],
};
let text = fs.readFileSync(file, 'utf8');
const crlf = text.includes('\r\n');
text = text.replace(/\r\n/g, '\n');
for (const w of what) {
  const p = PATCH[w];
  if (!p) throw new Error(`unknown patch ${w}`);
  const n = text.split(p[0]).length - 1;
  if (n !== 1) throw new Error(`${w}: anchor occurs ${n} times in ${file}`);
  text = text.replace(p[0], p[1]);
}
fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
console.log(`patched out: ${what.join(', ') || 'nothing'} in ${file}`);
