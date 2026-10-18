// Release BI, part two (Round BIH): used by x/minus1335.sh only. Reads src/lib/clubManagerCalendar.ts on stdin and
// writes it to stdout with Round 1344's SAVE_CAPS moved from the end of the startCareer import line onto a line of its
// own above it. Nothing else changes and the import means the same thing; the move only keeps 1344's edit apart from
// Round 1335's two import lines right below it, so that treeWithoutMerge can take 1335 out of the calendar without a
// conflict (the two edits sat on adjacent lines). Fails closed (exit 2) unless the anchor stands exactly once.
// Round BIK (part five): Round 1508 added livingWorldOf to the same line (after worldSeedOf). When that line stands
// instead, livingWorldOf moves with SAVE_CAPS onto the line above, for the same reason and with the same meaning.
// Exactly one of the two forms must stand, exactly once; anything else fails closed.
import fs from 'node:fs';

const text = fs.readFileSync(0, 'utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const rest = '  startCareer, interimManagerName, refreshWorldRoster, worldSeedOf, customExitUclField,' + nl;
const forms = [
  { from: '  startCareer, interimManagerName, refreshWorldRoster, worldSeedOf, customExitUclField, SAVE_CAPS,' + nl, to: '  SAVE_CAPS,' + nl + rest },
  { from: '  startCareer, interimManagerName, refreshWorldRoster, worldSeedOf, livingWorldOf, customExitUclField, SAVE_CAPS,' + nl, to: '  livingWorldOf, SAVE_CAPS,' + nl + rest },
];
const counts = forms.map(f => text.split(f.from).length - 1);
const hit = forms.filter((f, i) => counts[i] === 1);
if (hit.length !== 1 || counts.some(c => c > 1)) {
  console.error(`calImport1344: the startCareer import line with SAVE_CAPS stands ${counts.join(' and ')} times in its two forms, not once in one: no honest base`);
  process.exit(2);
}
process.stdout.write(text.replace(hit[0].from, () => hit[0].to));
