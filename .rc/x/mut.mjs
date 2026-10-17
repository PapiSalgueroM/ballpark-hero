// Reviewer's mutation applier for Round 1501 (runs on a GitHub runner from the repo root; the caller restores
// with git checkout -- src scripts in the same line). Each mutation replaces one text that must occur exactly once.
import fs from 'node:fs';

const MUTS = {
  // m1: joinClubNow forgets the level's cheque and wage room on the new job.
  m1: ['src/lib/clubManagerCalendar.ts', '  return applyNewJobDials(joined);', '  return joined;'],
  // m2: B2 off by one, an opening of exactly Safe is cut too.
  m2: ['src/lib/clubManagerDifficulty.ts', '  if (cut === 0 || value >= BOARD_SAFE_LINE) return value;', '  if (cut === 0 || value > BOARD_SAFE_LINE) return value;'],
  // m3: the hook's market memo lists the plain market, so T1 never reaches the player.
  m3: ['src/hooks/useClubManager.ts', '    () => (career ? marketForMe(career, buildMarket(career)) : []),', '    () => (career ? buildMarket(career) : []),'],
  // m4: M2 on a created club applies the dial to the founders' room too.
  m4: ['src/lib/clubManagerDifficulty.ts', '    next.wageCap = wageRoomFor(state, state.wageCap - room) + room;', '    next.wageCap = wageRoomFor(state, state.wageCap);'],
  // m5: the asks are rebuilt on a takeover as well (the dropped midSeasonStart filter).
  m5: ['src/lib/clubManagerDifficulty.ts', '    if (rebuildAsks && s.week === 0 && !s.midSeasonStart) s = { ...s, boardObjectives: rebuildAsks(s) };', '    if (rebuildAsks) s = { ...s, boardObjectives: rebuildAsks(s) };'],
  // m6: ensureStartOptions forgets the level when it repairs a broken block.
  m6: ['src/lib/clubManagerStart.ts', "    if (level !== 'normal') state.startOptions.difficulty = level;", '    void level;'],
  // m7: the opponent's edge dropped from the match itself (playMyMatch), every screen still shows it.
  m7: ['src/lib/clubManager.ts', '  const oppS = oppStrengthVsMe(state, fx.opponent);\n\n  /* Round 119', '  const oppS = strengthOf(state, fx.opponent) + 0 * oppEdge(state);\n\n  /* Round 119'],
};

const id = process.argv[2];
if (id === '--check') {
  for (const [k, [file, from]] of Object.entries(MUTS)) console.log(k, file, fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split(from).length - 1);
  process.exit(0);
}
const m = MUTS[id];
if (!m) { console.log(`mut: unknown mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const lf = src.includes('\r\n') ? src.replaceAll('\r\n', '\n') : src;
const n = lf.split(from).length - 1;
if (n !== 1) { console.log(`mut ${id}: the text occurs ${n} times in ${file}, must be 1: ${from.slice(0, 80)}`); process.exit(2); }
fs.writeFileSync(file, lf.replace(from, to));
console.log(`mut ${id}: applied to ${file}`);
