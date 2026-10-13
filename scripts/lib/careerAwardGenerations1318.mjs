/* Round 1318: the sixth inverse of the Soccer Career history harnesses.
 *
 * Eight gate harnesses hold whole Soccer careers to an older engine: simCareerAwardsNight, simCareerSocialBrands
 * and simCareerLeagueFinish replay a recording, and simSoccerCareerDevelopment, simCareerStoryRole,
 * simCareerTrophyRuns, simSoccerSeasonHistory and simSoccerDerbyHistory compare the engine with the tree their
 * round was cut from; simCareerLeagueSeasons compares it with origin/main. They already take five earlier changes
 * out of a COPY of the source (soccerTrain1178.mjs, careerDevelopmentAttribution1185.mjs,
 * careerStoryRoleAttribution1190.mjs, careerNextTenAttribution1197.mjs and careerVeteranPay1262.mjs).
 *
 * Round 1318 joins the other lane's Rounds 1280 to 1282 (PR234), which change the Ballon d'Or night on purpose:
 * the made up rivals are kept in a saved pool (CareerState.generatedBallonPool), the shortlist fillers stay the
 * same people instead of new names every year, every made up rival gets a year older, retires at 37 and is
 * replaced by a new face (from about 2037 on), and Round 1318 reads a pool it cannot verify as absent and
 * replaces at once a saved rival whose name is taken this year. The age draw is made at the place it always was,
 * so the number and order of draws per call is unchanged; what moves is the saved pool itself, the filler names,
 * and, after the first replacement, what a replaced rival scores.
 *
 * The rows that undo exactly that are awardGenerationsInverse in scripts/lib/careerAwardsNight1172.mjs (Round
 * 1318's own five first, then PR234's nine), which simCareerAwardsNight and simSoccerAwardGenerations already
 * use. This file hands the same rows to the other history harnesses, in the shape of careerVeteranPay1262.mjs.
 * Applied in order to this head's engine they give origin/main's engine of 48cb9d4b byte for byte (sha256
 * 0d9ab4a2..., the original arm of simSoccerAwardGenerations), so the recordings and base pins stay as they were
 * taken: this is an attribution, not a new recording.
 *
 * The rows must be applied IN ORDER: some anchors only exist once the rows before them have been applied. Each is
 * required exactly once at its turn, so this cannot go quietly idle when the source moves under it. Line endings
 * are read as LF by every caller.
 */
import assert from 'node:assert/strict';
import { awardGenerationsInverse } from './careerAwardsNight1172.mjs';

export const AWARD_GENERATIONS_FILE = 'src/lib/soccerCareerEngine.ts';

/* The rows as patch rows ({ id, addition, file, from, to }), in the order they must be applied. */
const ROWS = awardGenerationsInverse.map((row, index) => {
  assert.equal(row.file, AWARD_GENERATIONS_FILE, 'every award generations inverse row edits the engine');
  const id = `award-generations-${String(index + 1).padStart(2, '0')}`;
  return { id, addition: id, file: row.file, from: row.from, to: row.to };
});
export const AWARD_GENERATIONS_ADDITIONS = ROWS.map(row => row.addition);

/** The same edits as patch rows ({ id, addition, file, from, to }), for a harness that patches a copy itself in order. */
export function awardGenerationsPatches() {
  return ROWS.map(row => ({ ...row }));
}

/**
 * One bundled file with Rounds 1280 to 1282 and 1318 taken out. `relative` is the file's path from the repo root;
 * any other file comes back as it was. `receipt` gains one row per edit made, for the harness's proof.
 */
export function inverseAwardGenerations(relative, source, receipt = []) {
  if (relative !== AWARD_GENERATIONS_FILE) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of ROWS) {
    assert.equal(out.split(row.from).length, 2, `${row.id} of the award generations inverse (Rounds 1280 to 1282 and 1318) must be in ${row.file} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.addition, file: row.file });
  }
  return out;
}
