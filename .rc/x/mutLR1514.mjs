/* Fix-1514 re-record proof for scripts/data/cmLeagueRulesDigest.json: the round's single input reverted, as the
   read lens named it: the UEFA Super Cup's open at the rollover taken out (the harnesses' USC_OPEN_OFF: the slice
   set to none) and the German, French and Italian rows dropped from CM_ONE_OFF_ROWS. Each anchor must stand exactly
   once, or this refuses (exit 2) and nothing is run on a tree it did not change. The runner line restores the tree. */
import fs from 'node:fs';
const edits = [
  ['src/lib/clubManager.ts',
    "    openOneOff(state, { tables: { table: null, cupWinner: null, cupRunnerUp: null, uclWinner: exit(watchHolder), uelWinner: exit(watchUelHolder) }, seasonOne: false }, 'usc');\n",
    "    setOneOffSlice(state, null, 'usc');\n"],
  ['src/data/cmOneOffRows.ts', "  ['ger-2026', 'germany', 2026, 'German Supercup', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'c'],\n", ''],
  ['src/data/cmOneOffRows.ts', "  ['fra-2026', 'france', 2026, 'Trophée des Champions', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'n'],\n", ''],
  ['src/data/cmOneOffRows.ts', "  ['ita-2026', 'italy', 2026, 'Supercoppa Italiana', 'one', 'et', 'champCup', 'cupRunnerUp', 'dated', 'c'],\n", ''],
];
for (const [file, from, to] of edits) {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`mutLR: REFUSED, ${file} holds the anchor ${n} times: ${from.slice(0, 60)}`); process.exit(2); }
  fs.writeFileSync(file, text.replace(from, to));
}
console.log('mutLR: the usc open is off and the ger, fra and ita rows are dropped');
