/* Round 1510, a throwaway attribution edit, never committed: takes this round's three super cup opens out of the
   working tree it runs in (startCareer's line, the rollover's open, the move's carry), each asserted to stand once,
   so a harness run after it reads the engine without the round's key and nights. Run it only in a throwaway
   checkout or restore with `git checkout -- src` in the same line. Exit 1 when an anchor is missing (fail closed). */
import fs from 'node:fs';
const edits = [
  ['src/lib/clubManager.ts', '  openOneOffsOnStart(state, world);\n', ''],
  ['src/lib/clubManager.ts', "    openOneOff(state, oneOffFrom.nation === oneOffNationOf(state) ? { tables, seasonOne: false } : { tables: null, seasonOne: false, skip: 'moved' });\n", '    setOneOffSlice(state, null);\n'],
  ['src/lib/clubManagerCalendar.ts', '  carryOneOffs(career, joined);\n', ''],
];
for (const [file, from, to] of edits) {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`offAttr1510: ${file} holds the line ${n} times, not once: ${from.slice(0, 60)}`); process.exit(1); }
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('offAttr1510: the three opens are out');
