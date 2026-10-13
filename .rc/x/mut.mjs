// Review (run lens) of Round 1330: apply ONE named mutation in place on the runner's checkout.
// Usage from the repo root: node .rc/x/mut.mjs <NAME>   (the request line restores with git checkout -- src)
// Each anchor must appear exactly once, or the mutation ABORTS (exit 3), so a mutation that changed
// nothing can never be read as a green.
import { readFileSync, writeFileSync } from 'node:fs';
const PAGE = 'src/pages/SoccerCareer.tsx';
const HOOK = 'src/hooks/useSaveFenceWatch.ts';
const M = {
  // the stale tab's write time refusal no longer asks the fence, so no notice
  M1: [PAGE, "if (saved === 'moved') { checkSaveMoved(); return; }", "if (saved === 'moved') { return; }"],
  // New Career in a stale tab falls through and resets the page although nothing was cleared
  M2: [PAGE, "if (cleared === 'moved') { checkSaveMoved(); return; }", "if (cleared === 'moved') { checkSaveMoved(); }"],
  // Delete unusable save: moved and failed swapped
  M3: [PAGE, "if (deleted === 'moved') checkSaveMoved();", "if (deleted === 'failed') checkSaveMoved();"],
  // no adopt at all: every write becomes a claim
  M5: [PAGE, "    saveFence.adopt(SAVE_KEY);\n", "\n"],
  // adopt AFTER the read (the order rule)
  M6: [PAGE, "    saveFence.adopt(SAVE_KEY);\n    let saved: string | null;\n    try { saved = localStorage.getItem(SAVE_KEY); } catch { return { career: null, invalid: false }; }\n",
       "    let saved: string | null;\n    try { saved = localStorage.getItem(SAVE_KEY); } catch { return { career: null, invalid: false }; }\n    saveFence.adopt(SAVE_KEY);\n"],
  // New Career's refusal resets the page anyway
  M10: [PAGE, "if (cleared === 'failed') { toast.error('Could not delete the save. Try again.', PAGE_TOAST); return; }", "if (cleared === 'failed') { toast.error('Could not delete the save. Try again.', PAGE_TOAST); }"],
  // the watch listens for the save key instead of the fence key (stale constant)
  M4: [HOOK, "const fenceKey = fenceKeyOf(saveKey);", "const fenceKey = saveKey;"],
  // off by one: only the SECOND Begin Career lands
  B1: [PAGE, "arrival={arrivalCount > 0 ? `begin-${arrivalCount}` : null}", "arrival={arrivalCount > 1 ? `begin-${arrivalCount}` : null}"],
  // the wage hidden on the wrong phase
  B2: [PAGE, '{career.phase !== "retired" && (', '{career.phase !== "retirement_ceremony" && ('],
  // the AGE tile's narrow padding dropped
  B3: [PAGE, 'px-4 max-[399px]:px-2 py-2 text-center shrink-0', 'px-4 py-2 text-center shrink-0'],
  // one toast call loses its top centre option (the commonest one)
  B4: [PAGE, 'toast.success(`Signed with ${offer.club.name}!`, PAGE_TOAST);', 'toast.success(`Signed with ${offer.club.name}!`);'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.log(`MUTATION ABORTED: unknown ${name}`); process.exit(3); }
const [file, from, to] = m;
const src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
console.log(`mutation ${name} on ${file}: anchor count ${n}`);
if (n !== 1) { console.log(`MUTATION ABORTED: anchor not found exactly once`); process.exit(3); }
const out = src.replace(from, to);
if (out === src) { console.log('MUTATION ABORTED: nothing changed'); process.exit(3); }
writeFileSync(file, out);
console.log(`MUTATION APPLIED ${name}`);
