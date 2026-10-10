/* Release AT: the third inverse of the Soccer Career history harnesses.
 *
 * simCareerAwardsNight, simCareerLeagueFinish and simCareerSocialBrands each hold a recording of whole
 * careers made before this train. They already take Release AQ's train out (scripts/lib/soccerTrain1178.mjs)
 * and Rounds 1185 and 1187 out (scripts/lib/careerDevelopmentAttribution1185.mjs). Rounds 1190 and 1191,
 * merged after those, move careers again on purpose:
 *   Round 1190  the New Manager card (event 12) now queues a saved smaller role and says so;
 *   Round 1191  the two weighted goal tally articles lost their invented flavour headlines, and the two
 *               ends of the news function now hand the list to personalGoalMilestoneNews.
 * With exactly those five text edits put back to the text of the tree before Rounds 1188 to 1191 were
 * merged on the release line, and nothing else touched, all three recordings replay green: remote check
 * rAT-sc-engine-g (awards "ALL 179 CHECKS PASSED", finish green over 756 careers, social "ALL SOCIAL AND
 * BRAND CHECKS PASSED"). Either round alone is not enough (rAT-sc-engine-h). So this is an attribution,
 * not a re-record: the recordings stay as they were taken.
 *
 * Like the 1185 inverse beside it, this only ever rewrites a COPY of the engine that a historical bundle
 * loads. It refuses to run unless every block is there exactly once and really differs from the original,
 * so it cannot go quietly idle when the engine moves under it.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/* The tree just before Rounds 1188 to 1191 were merged on the release line (Rounds 1185 to 1187 in). */
export const CAREER_STORY_ROLE_BASE = 'de39ef18d2187ca98ccc57d4ef7ebc33c0f6bd6a';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replaceAll('\r\n', '\n');
const count = (source, needle) => source.split(needle).length - 1;

/* Each block runs from its start marker to the start of what follows it. */
const BLOCKS = [
  ['new-manager-event', '{ id: 12, emoji:', '{ id: 13, emoji:'],
  ['exact-goal-tally-article', 'totalGoals > 0 && (totalGoals === 100', 'yearsPlaying >= 5 && s.currentClubTier <= 2 && ovr >= 78'],
  ['hundred-goal-article', 'totalGoals >= 100 && totalGoals - season.goals < 100,', 's.intStats.caps >= 100 && (s.intStats.caps'],
];
const MILESTONE_RETURN = 'return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);';

let original = null;
function originalEngine() {
  if (original === null) original = normalize(execFileSync('git', ['show', `${CAREER_STORY_ROLE_BASE}:${ENGINE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  return original;
}
function cut(source, [name, start, end], where) {
  assert.equal(count(source, start), 1, `${name}: its start is in the ${where} engine exactly once`);
  assert.equal(count(source, end), 1, `${name}: its end is in the ${where} engine exactly once`);
  const a = source.indexOf(start), b = source.indexOf(end);
  assert(b > a, `${name}: its end follows its start in the ${where} engine`);
  return source.slice(a, b);
}

/** Only copied historical bundles undo these five intentional edits of Rounds 1190 and 1191. */
export function inverseCareerStoryRole(source, receipts = []) {
  const before = normalize(source), old = originalEngine();
  assert.equal(count(old, MILESTONE_RETURN), 0, 'The original engine has no milestone news hook');
  let after = before;
  const blocks = [];
  for (const block of BLOCKS) {
    const mine = cut(after, block, 'copied'), theirs = cut(old, block, 'original');
    assert.notEqual(mine, theirs, `${block[0]}: the copied inverse restores a changed block`);
    after = after.replace(mine, () => theirs);
    assert.equal(cut(after, block, 'restored'), theirs, `${block[0]}: the whole original block was restored`);
    blocks.push(block[0]);
  }
  assert.equal(count(after, MILESTONE_RETURN), 2, 'Both milestone news returns are in the copied engine');
  after = after.split(MILESTONE_RETURN).join('return out;');
  assert.equal(count(after, MILESTONE_RETURN), 0, 'Both milestone news returns were restored');
  assert.notEqual(after, before, 'The copied story and role inverse changes actual source');
  receipts.push({ head: CAREER_STORY_ROLE_BASE, engineBaseSha256: sha(old), beforeSha256: sha(before), afterSha256: sha(after), blocks, returns: 2, effective: true });
  return after;
}
