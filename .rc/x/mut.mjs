/* Reviewer (run lens), runner only, never committed: apply ONE plausible mutation of Round 1335's core rule
   to the runner's checkout, every anchor asserted present the expected number of times first. The request
   line restores the tree (git checkout -- src scripts) in the same line. Usage: node mut.mjs <name> */
import { readFileSync, writeFileSync } from 'node:fs';
const ENGINE = 'src/lib/clubManager.ts';
const CAL = 'src/lib/clubManagerCalendar.ts';
/* [file, from, to, how many times the anchor must be present, which occurrence to replace (1 based)] */
const M = {
  /* the opening's input read after the summer swap (the stale read correction 5 and advice 10 are about) */
  played: [[ENGINE, "openingConfidence({ grade: summary?.verdictGrade ?? 'C', playedExpectation, finish: prevPos,",
    "openingConfidence({ grade: summary?.verdictGrade ?? 'C', playedExpectation: club.expectation, finish: prevPos,", 1, 1]],
  /* the objective weights dropped in the engine (every hit weighs 1 again) */
  weights: [[ENGINE, 'objectives: objs.map((o, i) => ({ id: cardIds.length === objs.length ? cardIds[i] : undefined, hit: o.hit })), promiseNet });',
    'objectives: objs.map((o, i) => ({ id: undefined, hit: o.hit })), promiseNet });', 1, 1]],
  /* correction 3 undone: joinClubNow reads the switch off `s` (the run in of a fresh state) instead of `career` */
  joins: [[CAL, 'boardConfidence: legacySeason(career) ? LEGACY_NEW_JOB_BOARD : BOARD_FRESH,', 'boardConfidence: legacySeason(s) ? LEGACY_NEW_JOB_BOARD : BOARD_FRESH,', 2, 2],
    [CAL, 'boardObjectives: legacySeason(career) ? s.boardObjectives : openObjectives(s),', 'boardObjectives: legacySeason(s) ? s.boardObjectives : openObjectives(s),', 2, 2]],
  /* the approach's step with its two tiers swapped */
  approachswap: [[ENGINE, 'offerStepOk(club.tier, c.tier, false)', 'offerStepOk(c.tier, club.tier, false)', 1, 1]],
  /* advice 11 undone: a second tier title counts as a big season */
  bigsecond: [[ENGINE, "const big = (position === 1 && !PYRAMIDS.some(p => p.second === careerLeagueOf(state).id)) || seasonTrophies.includes('Champions League');",
    "const big = position === 1 || seasonTrophies.includes('Champions League');", 1, 1]],
  /* escape's drop zone boundary off by one */
  escapeoff: [[ENGINE, "return expected > topRows.length - pyr.count ? { fate: 'escape'", "return expected >= topRows.length - pyr.count ? { fate: 'escape'", 1, 1]],
  /* correction 2 undone: the previous manager's run in is no longer pinned to 60 */
  runinpin: [[CAL, '? { ...career, manager: undefined, managerXp: undefined, boardConfidence: LEGACY_BOARD_START }\n    : { ...career, boardConfidence: LEGACY_BOARD_START };',
    '? { ...career, manager: undefined, managerXp: undefined }\n    : career;', 1, 1]],
};
const name = process.argv[2];
const spec = M[name];
if (!spec) { console.log(`MUT unknown mutation ${name}`); process.exit(2); }
for (const [file, from, to, count, nth] of spec) {
  const t = readFileSync(file, 'utf8');
  const parts = t.split(from);
  if (parts.length - 1 !== count) { console.log(`MUT ${name}: anchor in ${file} found ${parts.length - 1} times, expected ${count}; could not run`); process.exit(2); }
  const out = parts.slice(0, nth).join(from) + to + parts.slice(nth).join(from);
  if (out === t) { console.log(`MUT ${name}: the patch changed nothing; could not run`); process.exit(2); }
  writeFileSync(file, out);
  console.log(`MUT ${name}: patched ${file} (occurrence ${nth} of ${count})`);
}
