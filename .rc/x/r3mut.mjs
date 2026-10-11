// Release AU fix pass, ruling R3. Runs ONLY in a runner's checkout. Two arms that take the save keeper out of the
// entry chunk so its weight can be measured on one tree:
//   noboot  src/main.tsx no longer imports or calls runSaveKeeper (what the entry would hold if the boot pass were
//           a lazily imported chunk and the probe cost nothing; the card in App.tsx still imports the keeper)
//   stub    src/lib/saveKeeper.ts becomes five empty functions with the same names (the entry with no keeper code
//           at all: the floor under ANY lazy design, before the probe such a design needs is added back)
// Refuses when an anchor is gone.
import fs from 'node:fs';
const arm = process.argv[2];
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const read = p => fs.readFileSync(p, 'utf8').split(CR + LF).join(LF);
const swap = (src, from, to, what) => { if (src.split(from).length !== 2) { console.error('r3mut: CANNOT RUN, anchor not found exactly once: ' + what); process.exit(2); } return src.replace(from, () => to); };
if (arm === 'noboot') {
  let s = read('src/main.tsx');
  s = swap(s, 'import { runSaveKeeper } from "./lib/saveKeeper";' + LF, '', 'the import in main.tsx');
  s = swap(s, 'runSaveKeeper();' + LF, '', 'the boot call in main.tsx');
  fs.writeFileSync('src/main.tsx', s);
} else if (arm === 'stub') {
  const before = read('src/lib/saveKeeper.ts');
  for (const name of ['export function runSaveKeeper(', 'export function takeCopyTrouble(', 'export function takeOutcome(', 'export function restoreNow(', 'export function reopenGame(']) {
    if (!before.includes(name)) { console.error('r3mut: CANNOT RUN, the keeper no longer has ' + name); process.exit(2); }
  }
  fs.writeFileSync('src/lib/saveKeeper.ts', [
    "export type KeeperRefusal = 'blocked' | 'no-room' | 'gone' | 'stale';",
    'export interface KeeperOutcome { path: string; ok: boolean; why?: KeeperRefusal; kept?: boolean; dropped?: number }',
    'export function runSaveKeeper(): void {}',
    'export function takeCopyTrouble(_pathname: string): boolean { return false; }',
    'export function takeOutcome(_pathname: string): KeeperOutcome | null { return null; }',
    "export function restoreNow(_entry: unknown, _backupKey: string): { ok: true } | { ok: false; why: KeeperRefusal } { return { ok: false, why: 'blocked' }; }",
    'export function reopenGame(path: string): void { window.location.replace(path); }',
    '',
  ].join(LF));
} else { console.error('r3mut: unknown arm ' + arm); process.exit(2); }
console.log('r3mut: arm ' + arm + ' applied in this checkout');
