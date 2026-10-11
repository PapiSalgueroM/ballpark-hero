/* Release AU: the fourth inverse of the Soccer Career history harnesses.
 *
 * simCareerAwardsNight, simCareerLeagueFinish and simCareerSocialBrands each hold a recording of whole
 * careers made before this train. They already take Release AQ's train out (scripts/lib/soccerTrain1178.mjs),
 * Rounds 1185 and 1187 out (careerDevelopmentAttribution1185.mjs) and Rounds 1190 and 1191 out
 * (careerStoryRoleAttribution1190.mjs). Rounds 1197 to 1208, merged after those, add two things to a
 * Soccer Career save on purpose:
 *   the wheel    an event choice with odds keeps the receipt of its one draw (state.chanceWheel), stored by
 *                one line of src/lib/careerChanceWheel.ts. The draw and its result are untouched.
 *   the opening  a new season from 2026 in a named cup keeps its opening tie (row.cupRun.opening), behind
 *                the round's own compatibility switch in the engine, `includeOpening: true,`.
 * Neither moves the random stream (the receipt stores a draw the engine already made; the opening tie is
 * drawn from a keyed generator of its own). With exactly those two taken out of a COPY of the two files,
 * and nothing else touched, the recordings replay as they did on the release line before the round:
 * remote checks rAU-G2 (awards "ALL 179 CHECKS PASSED" and finish "green. 756 careers, 6048 seasons" with
 * both out; social "ALL SOCIAL AND BRAND CHECKS PASSED" with the wheel out alone), rAU-G10 (inbox beats
 * green with the wheel out) and rAU-sc-engine-mut (finish green with the wheel out alone; awards wants
 * both). So this is an attribution, not a re-record: the recordings stay as they were taken.
 *
 * Like the inverses beside it, this only ever rewrites a COPY of a file that a historical bundle loads.
 * It refuses to run unless the line it takes out is there exactly once, so it cannot go quietly idle when
 * the source moves under it.
 */
import assert from 'node:assert/strict';

export const NEXT_TEN_WHEEL_FILE = 'src/lib/careerChanceWheel.ts';
export const NEXT_TEN_ENGINE_FILE = 'src/lib/soccerCareerEngine.ts';
export const NEXT_TEN_FILES = [NEXT_TEN_WHEEL_FILE, NEXT_TEN_ENGINE_FILE];

const EDITS = {
  wheel: { file: NEXT_TEN_WHEEL_FILE, from: '  state.chanceWheel = { title, chance, roll, hit, miss, result, seen: false };', to: '' },
  opening: { file: NEXT_TEN_ENGINE_FILE, from: 'includeOpening: true,', to: 'includeOpening: false,' },
};

/**
 * One bundled file with Rounds 1197 to 1208's additions to a save taken out. `relative` is the file's path
 * from the repo root; a file the round does not switch comes back as it was. `receipt` gains one row per
 * edit made, for the harness's proof. `which` names the additions to take out (both by default).
 */
export function inverseCareerNextTen(relative, source, receipt = [], which = ['wheel', 'opening']) {
  let out = source;
  for (const name of which) {
    const edit = EDITS[name];
    assert.ok(edit, `Unknown Rounds 1197 to 1208 addition: ${name}`);
    if (relative !== edit.file) continue;
    assert.equal(out.split(edit.from).length, 2, `The ${name} switch of Rounds 1197 to 1208 must be in ${edit.file} exactly once`);
    out = out.replace(edit.from, () => edit.to);
    receipt.push({ addition: name, file: edit.file });
  }
  return out;
}
