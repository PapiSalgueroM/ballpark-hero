/* Round 1346: the five hunks the coaching retirement added to src/lib/usCoachCareer.ts (retireCoachCareer and one
   done guard at the top of four functions), as exact anchors on the LF source. stripRetireHunks takes them out and
   gives back the engine as it was before the round, so a harness can rebuild that engine with no commit sha:
   simUsCoachPoaching hashes it against its pinned pre-888 engine, simUsCoachRetirement plays it beside the head.
   Each anchor must be held exactly once, LF and CRLF, or the strip refuses. */
import assert from 'node:assert/strict';

export const RETIRE_HUNKS = [
  ["  excludeTeam = '',\n): void {\n  if (s.done) return;\n", "  excludeTeam = '',\n): void {\n"],
  ['CoachCareerState {\n  if (prev.done) return prev;\n  const offer = prev.offers[index];', 'CoachCareerState {\n  const offer = prev.offers[index];'],
  ['  if (prev.done) return { state: prev, notes: [] };\n  const s: CoachCareerState = { ...prev, results: [...prev.results], profile:', '  const s: CoachCareerState = { ...prev, results: [...prev.results], profile:'],
  ['  if (prev.done) return { state: prev, notes: [] };\n  const s: CoachCareerState = { ...prev, results: [...prev.results] };', '  const s: CoachCareerState = { ...prev, results: [...prev.results] };'],
  ["\n/** Round 1346: the player closes the book himself. Only `done` changes, and once\n *  it is set every season, offer and market call above hands its input back. */\nexport function retireCoachCareer(prev: CoachCareerState): CoachCareerState {\n  return prev.done ? prev : { ...prev, done: true };\n}\n", ''],
];

/** `source` is the engine with its line endings already turned to LF. */
export function stripRetireHunks(source) {
  const crlf = source.replaceAll('\n', '\r\n').replaceAll('\r\n', '\n');
  for (const [hunk] of RETIRE_HUNKS) {
    assert.equal(source.split(hunk).length - 1, 1, 'Round 1346 retirement hunk held once');
    assert.equal(crlf.split(hunk).length - 1, 1, 'Round 1346 CRLF hunk held');
  }
  const stripped = RETIRE_HUNKS.reduce((text, [hunk, without]) => text.replace(hunk, () => without), source);
  assert.notEqual(stripped, source, 'Round 1346 strip changed the engine');
  return stripped;
}
