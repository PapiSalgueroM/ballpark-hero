// Release BI, part two (Round BIH): used by x/minus1335.sh only. Reads src/lib/clubManagerCalendar.ts on stdin and
// writes it to stdout with Round 1344's SAVE_CAPS moved from the end of the startCareer import line onto a line of its
// own above it. Nothing else changes and the import means the same thing; the move only keeps 1344's edit apart from
// Round 1335's two import lines right below it, so that treeWithoutMerge can take 1335 out of the calendar without a
// conflict (the two edits sat on adjacent lines). Fails closed (exit 2) unless the anchor stands exactly once.
import fs from 'node:fs';

const text = fs.readFileSync(0, 'utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const from = '  startCareer, interimManagerName, refreshWorldRoster, worldSeedOf, customExitUclField, SAVE_CAPS,' + nl;
const to = '  SAVE_CAPS,' + nl + '  startCareer, interimManagerName, refreshWorldRoster, worldSeedOf, customExitUclField,' + nl;
const count = text.split(from).length - 1;
if (count !== 1) {
  console.error(`calImport1344: the startCareer import line with SAVE_CAPS stands ${count} times, not once: no honest base`);
  process.exit(2);
}
process.stdout.write(text.replace(from, () => to));
