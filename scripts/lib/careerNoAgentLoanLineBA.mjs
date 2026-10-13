/* Release BB: the seventh inverse of the Soccer Career history harnesses.
 *
 * simCareerSocialBrands replays a recording of whole Soccer careers (scripts/data/soccerBrandFixture835.json) and
 * takes later changes made on purpose out of a COPY of the source first (soccerTrain1178.mjs,
 * careerDevelopmentAttribution1185.mjs, careerStoryRoleAttribution1190.mjs, careerNextTenAttribution1197.mjs,
 * careerVeteranPay1262.mjs and careerAwardGenerations1318.mjs).
 *
 * Release BA's closing fix a7c6befe changes one line of src/lib/soccerCareerEngine.ts on purpose: when the club
 * loan lists a player who has no agent yet, or who chose No Agent ("self"), the career line says the club told HIM
 * to find a loan, not his agent. No draw moves; only the text of that one line does, and the recording hashes it.
 * Measured on runners (rBBg-sb, Release BB's join): the harness is green on a7c6befe's parent and on origin/main
 * 8fea14e2, red on a7c6befe, on Release BA's closed head a5519151 and on the joined head c2fe8231, each time with
 * "careers[23] first differs at step 13". With exactly this line put back in the copy, and nothing else touched,
 * the recording replays as it was taken: this is an attribution, not a new recording.
 *
 * Like the inverses beside it, this only ever rewrites a COPY of a file a historical bundle loads. It refuses to
 * run unless the text it takes out is there exactly once, so it cannot go quietly idle when the source moves under
 * it. Line endings are read as LF.
 */
import assert from 'node:assert/strict';

export const NO_AGENT_LOAN_FILE = 'src/lib/soccerCareerEngine.ts';

const OLD_LINE = '            ? `\u{1F4E4} ${s.currentClub} have told your agent to find you a loan for next season.`';
const FROM = [
  '            /* Release BA: no agent yet, or No Agent ("self"), means nobody to tell but you. */',
  '            ? s.agentId && s.agentId !== "self"',
  '              ? `\u{1F4E4} ${s.currentClub} have told your agent to find you a loan for next season.`',
  '              : `\u{1F4E4} ${s.currentClub} have told you to find a loan for next season.`',
].join('\n');

/**
 * The engine with Release BA's No Agent loan line taken out. `relative` is the file's path from the repo root; any
 * other file comes back as it was. `receipt` gains one row when the edit is made, for the harness's proof.
 */
export function inverseNoAgentLoanLine(relative, source, receipt = []) {
  if (relative !== NO_AGENT_LOAN_FILE) return source;
  const out = source.split('\r\n').join('\n');
  assert.equal(out.split(FROM).length, 2, `the No Agent loan line inverse (Release BA, a7c6befe) must be in ${NO_AGENT_LOAN_FILE} exactly once`);
  receipt.push({ addition: 'no-agent-loan-line', file: NO_AGENT_LOAN_FILE });
  return out.replace(FROM, () => OLD_LINE);
}
