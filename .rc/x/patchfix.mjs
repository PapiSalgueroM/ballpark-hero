/* Round 1146 fix ladder helper (never committed; sent with a remote check as .rc/x/patchfix.mjs).
   Takes one or both of the review fixes that can move a result out of a COPY of clubManager.ts:
     node patchfix.mjs <copy of clubManager.ts> window   a man who came on holds a 1 in his last ten again
     node patchfix.mjs <copy of clubManager.ts> slot     my own goal man is read off his card again, not his slot
   Each anchor must occur exactly once or it refuses. */
import fs from 'node:fs';

const [file, ...what] = process.argv.slice(2);
const PATCH = {
  window: ['? windowEntry(startedIds.has(id), cameOnAt.get(id) ?? 46, lastMinute)', '? 1'],
  slot: [
    "ownGoalMan(key, there.filter(p => lineAt.get(p.id) === 'defence'), there.find(p => lineAt.get(p.id) === 'keeper') ?? null)",
    "ownGoalMan(key, there.filter(p => groupOf(p.position) === 'DEF'), there.find(p => p.position === 'GK') ?? null)",
  ],
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
