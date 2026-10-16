/* Reviewer mutations for Round 1342, applied on the runner's checkout only (restored by git checkout in the
 * same request line). Each `from` must be in its file exactly once, or this exits 2 (could not run). */
import fs from 'node:fs';

const M = {
  /* the Dugout glue: the real club branch of confirmAndReset drops the setup it was handed */
  m1: ['src/pages/ClubManager.tsx',
    'else g.confirmClub(pickEra, manager ?? undefined, entry, isHistoricEra(pickEra) ? null : worldEdit, setup);',
    'else g.confirmClub(pickEra, manager ?? undefined, entry, isHistoricEra(pickEra) ? null : worldEdit);'],
  /* the same for a created club */
  m10: ['src/pages/ClubManager.tsx',
    'if (pendingCustomSpec) g.confirmCustomClub(pickEra, pendingCustomSpec, manager ?? undefined, entry, setup);',
    'if (pendingCustomSpec) g.confirmCustomClub(pickEra, pendingCustomSpec, manager ?? undefined, entry);'],
  /* off by one in the key reader: season 1 (every Dugout career) no longer counts */
  m2: ['src/lib/clubManagerStart.ts',
    "return typeof raw === 'number' && Number.isInteger(raw) && raw > 0 ? raw : null;",
    "return typeof raw === 'number' && Number.isInteger(raw) && raw > 1 ? raw : null;"],
  /* a stale constant: the key always records season 1 */
  m3: ['src/lib/clubManagerStart.ts',
    'const season = Number.isInteger(state.season) && state.season > 0 ? state.season : 1;',
    'const season = 1;'],
  /* the slot summary forgets the mark */
  m6: ['src/lib/clubManagerSlots.ts',
    '      ...(noSackFrom(c as CareerState) !== null ? { noSack: true as const } : {}),\n',
    ''],
  /* the repair drops the key again */
  m7: ['src/lib/clubManagerStart.ts',
    '    if (noSack !== null) state.startOptions.noSack = noSack;\n',
    ''],
  /* Take the job forgets the setup */
  m11: ['src/components/club-manager/ManagerForm.tsx',
    'onConfirm({ name: name.trim(), nationality, background, style, appearance: look }, entry ?? undefined, setup);',
    'onConfirm({ name: name.trim(), nationality, background, style, appearance: look }, entry ?? undefined);'],
  /* the meter words inverted: Normal careers read the No sacking words */
  m5: ['src/components/club-manager/MetersStrip.tsx',
    'const shownBoard = noSackFrom(career) !== null && board.value < BOARD_EDGE',
    'const shownBoard = noSackFrom(career) === null && board.value < BOARD_EDGE'],
};
const id = process.argv[2];
if (!M[id]) { console.log(`mut: unknown mutation ${id}`); process.exit(2); }
const [file, from, to] = M[id];
const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut ${id}: its text is in ${file} ${n} times, must be once: CANNOT RUN`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`mut ${id}: applied to ${file}`);
