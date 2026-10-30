// Round 1592 fix, weight re-record proof: the ONE input the reviewers name (CarryOnCard's two new imports,
// ManagerHotSeatBoard.tsx, clubManagerSlots and clubManagerHandOver) reverted to local stubs on a runner checkout,
// so a build shows whether /manager-hot-seat goes back under the old row. Exits 3 if an anchor is missing.
import fs from 'node:fs';
const file = 'src/components/manager-hot-seat/ManagerHotSeatBoard.tsx';
let src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const edits = [
  ["import { readSlots, type SlotView } from '@/lib/clubManagerSlots';\n",
    "import type { SlotView } from '@/lib/clubManagerSlots';\nconst readSlots = (): SlotView[] => [];\n"],
  ["import { freeSlot, handOverCareer } from '@/lib/clubManagerHandOver';\n",
    "const freeSlot = (_v: SlotView[]): number | null => 1;\nconst handOverCareer = (..._a: unknown[]) => ({ ok: false as const, why: 'failed' as const });\n"],
];
for (const [from, to] of edits) {
  if (!src.includes(from)) { console.log(`MUTATION stub: anchor missing (${from.trim()}), not applied`); process.exit(3); }
  src = src.replace(from, to);
}
fs.writeFileSync(file, src);
console.log('MUTATION stub: applied, the card imports neither clubManagerSlots nor clubManagerHandOver');
