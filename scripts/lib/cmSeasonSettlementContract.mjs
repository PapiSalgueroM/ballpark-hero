import { stripComments } from './usCareerFiles.mjs';

/** Keep the three entry points independently covered. The mounted
 * clubManagerCheckpoint tests exercise both score branches and stale retries. */
export function managerSeasonSettlementProblems(source) {
  const hook = stripComments(source);
  const problems = [];
  function callback(name, following) {
    const start = hook.indexOf('const ' + name + ' = useCallback(');
    const end = hook.indexOf('const ' + following + ' = useCallback(', start + 1);
    return start >= 0 && end > start ? hook.slice(start, end) : '';
  }
  for (const [name, next, rule] of [
    ['runEntry', 'play', /if\s*\(res\.kind === 'seasonOver'\)\s*\{\s*settleSeason\(career, res\.state\);/],
    ['simToWeek', 'continueFromReport', /if\s*\(run\.halt === 'seasonOver'\)\s*\{\s*settleSeason\(career, run\.state\);/],
    ['continueFromReport', 'nextSeason', /if\s*\(career\.week >= career\.calendar\.length\)\s*\{\s*settleSeason\(career, career\);/],
  ]) {
    const body = callback(name, next);
    if (!rule.test(body) || [...body.matchAll(/\bsettleSeason\(/g)].length !== 1) {
      problems.push(name + ': the season-end branch must call the guarded settlement exactly once');
    }
  }
  const settle = callback('settleSeason', 'runEntry');
  const recording = /if\s*\(!canSettle\(source\)\)\s*return;\s*const\s+\{\s*state,\s*summary:\s*review\s*\}\s*=\s*finishSeason\(finished\);\s*careerRef\.current\s*=\s*state;\s*if\s*\(postsScore\(state\)\)\s*recordCompletion\('\/club-manager', review\.seasonScore\);\s*else\s+recordCompletion\('\/club-manager'\);/;
  if (!recording.test(settle) || [...hook.matchAll(/recordCompletion\('\/club-manager', review\.seasonScore\)/g)].length !== 1) {
    problems.push('settleSeason: claim a current career before its one scored or unscored review completion');
  }
  return problems;
}
