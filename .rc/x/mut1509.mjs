/* Review of Round 1509 (the run lens): one plausible mutation of the core rule or data path, applied on the
 * runner's checkout only and restored by the request line (git checkout -- src scripts). Each edit must stand
 * exactly once, or this exits 2 and the line says ABORT. Never committed. */
import fs from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const EA = 'src/lib/euroAccess.ts';
const MUTS = {
  /* m1, an off by one in the rule: each league gives one Europa League league place more than its row. */
  m1: [{ file: EA, from: 'for (let k = 0; k < t.uelLast - t.uclPlaces && clubs.length < input.size; k += 1) {', to: 'for (let k = 0; k <= t.uelLast - t.uclPlaces && clubs.length < input.size; k += 1) {' }],
  /* m2, a dropped filter: the Champions League a participant really plays forgets the AI groups. */
  m2: [{ file: CM, from: '  if (state.uclGroup) return [state.clubName, ...state.uclGroup.opponents, ...(state.uclWorld ?? []).flatMap(g => g.clubs)];', to: '  if (state.uclGroup) return [state.clubName, ...state.uclGroup.opponents];' }],
  /* m3, a dropped arm: a Europa League rung is met only by a Europa League place, no longer by a Champions League one. */
  m3: [{ file: CM, from: "        : rung === 'uel' ? place === 'ucl' || place === 'uel'", to: "        : rung === 'uel' ? place === 'uel'" }],
  /* m4, the wrong finalist: the cup's route goes to the final's loser. */
  m4: [{ file: CM, from: "winner: career.cupBracket?.find(t => t.round === 'F')?.winner ?? null };", to: "winner: ((f) => (f && f.winner ? (f.winner === f.home ? f.away : f.home) : null))(career.cupBracket?.find(t => t.round === 'F')) };" }],
  /* m5, 1502's line copied without its key: a move to a Champions League club drops the followed Europa League. */
  m5: [{ file: CM, from: "    if (comp === 'ucl' && joined.uclGroup) return;", to: '    if (joined.uclGroup) return;' }],
  /* m6, a stale memo: euroPlaceOf's answer kept per season, not per week (the engine plays entries into one state). */
  m6: [{ file: CM, from: 'const key = `${career.season}|${career.week}|${career.calendar?.length ?? 0}|${career.clubName}`;', to: 'const key = `${career.season}|${career.clubName}`;' }],
};
const id = process.argv[2];
const edits = MUTS[id];
if (!edits) { console.log(`mut1509: ABORT unknown mutation ${id}`); process.exit(2); }
for (const e of edits) {
  const src = fs.readFileSync(e.file, 'utf8');
  const n = src.split(e.from).length - 1;
  if (n !== 1) { console.log(`mut1509: ABORT ${id}: the line stands ${n} times in ${e.file}`); process.exit(2); }
  fs.writeFileSync(e.file, src.replace(e.from, e.to));
  console.log(`mut1509: applied ${id} to ${e.file}`);
}
