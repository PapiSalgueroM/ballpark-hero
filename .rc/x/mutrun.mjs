/* Round 1592 adversarial review: one mutation of src/lib/clubManagerHandOver.ts on the runner.
   node .rc/x/mutrun.mjs <id>   applies it in place (the request line restores with git checkout).
   Exit 3 when the string it mutates is not in the file, so a mutation that did not apply is never read as caught. */
import fs from 'node:fs';

const FILE = 'src/lib/clubManagerHandOver.ts';
const MUTS = {
  /* m1, a dropped filter: the changed check compares only damaged, not the career the card named. */
  m1: [[' || JSON.stringify(named.summary) !== JSON.stringify(replace.summary)', '']],
  /* m2, a dropped rollback: a refused replace of a PARKED slot leaves the swap in place. */
  m2: [['    if (slot !== from) switchSlot(from);\n', '']],
  /* m3, a swapped argument: the replace clears the points of the slot being played, not the replaced one. */
  m3: [['  clearSlotPoints(slot, store);\n', '  clearSlotPoints(from, store);\n']],
  /* m4, a reordering: the kept aside copy is made BEFORE the swap, so it copies the career being played and
     the picked career is written over with no copy at all (data loss). */
  m4: [[
    '  if (slot !== from && !switchSlot(slot)) return failed;\n  const marks = read(SET_ASIDE_SLOT_KEY);\n  const copy = copyAside(entry, store);\n',
    '  const marks = read(SET_ASIDE_SLOT_KEY);\n  const copy = copyAside(entry, store);\n  if (slot !== from && !switchSlot(slot)) return failed;\n',
  ]],
  /* m5, a dropped answer: the empty active slot path ignores a refused write and says saved. */
  m5: [['      if (!saveCareer(career)) return failed;\n', '      saveCareer(career);\n']],
  /* m6, an off by one: the named slot is read one along. */
  m6: [['  const named = views[replace.slot - 1];\n', '  const named = views[replace.slot] ?? views[replace.slot - 1];\n']],
};
const id = process.argv[2];
const edits = MUTS[id];
if (!edits) { console.log(`MUTATION ${id}: unknown`); process.exit(3); }
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
for (const [from, to] of edits) {
  if (!src.includes(from)) { console.log(`MUTATION ${id}: NOT APPLIED, string not found: ${from.slice(0, 70)}`); process.exit(3); }
  src = src.replace(from, to);
}
fs.writeFileSync(FILE, src);
console.log(`MUTATION ${id}: applied to ${FILE}`);
