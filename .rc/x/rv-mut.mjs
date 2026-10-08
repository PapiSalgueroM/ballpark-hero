// REVIEWER'S MUTATION RUNNER (Round 1138, runner lens). Never committed. Runs on the GitHub runner as .rc/x/rv-mut.mjs.
// One mutation at a time: apply an asserted edit to the checkout, run the vitest files that guard that file with the
// JSON reporter, record which tests failed, put the file back. Prints one line per mutation and a table at the end.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const out = process.env.RC_OUT || path.join(root, '.tmp-fx');
mkdirSync(out, { recursive: true });
const only = (process.env.MUT_ONLY || '').split(',').filter(Boolean);

const BOX = 'src/components/game/PlayerAutocomplete.tsx';
const LIB = 'src/lib/validatorClient.ts';
const HOOK = 'src/hooks/useLineupBuilder.ts';
const BOX_TESTS = [
  'src/test/playerAutocompleteStale.test.tsx', 'src/test/playerAutocompleteInteraction.test.tsx',
  'src/test/playerAutocompleteEmptyText.test.tsx', 'src/test/playerSearchFailure.test.tsx', 'src/test/nbaCourtSelection.test.tsx',
];
const HOOK_TESTS = ['src/test/lineupValidatorClient.test.tsx', 'src/test/lineupBuilderHistoryRead.test.tsx'];

/* name, file, [find, replace] pairs (a string find must occur exactly once), tests */
const MUTATIONS = [
  ['none-box', BOX, [], BOX_TESTS],
  ['none-hook', HOOK, [], HOOK_TESTS],
  ['MA-tag-drops-options', BOX, [[/const tag = normalizedValue \+ .*;/, 'const tag = normalizedValue;']], BOX_TESTS],
  ['MB-leave-no-id-bump', BOX, [['\n    requestIdRef.current += 1;\n    droppedRef.current = true;', '\n    droppedRef.current = true;']], BOX_TESTS],
  ['MB2-leave-no-abort-no-bump', BOX, [['    abortRef.current?.abort();\n    requestIdRef.current += 1;\n    droppedRef.current = true;', '    droppedRef.current = true;']], BOX_TESTS],
  ['MB3-leave-keeps-debounce-timer', BOX, [['  const leave = useCallback(() => {\n    if (debounceRef.current) window.clearTimeout(debounceRef.current);\n    abortRef.current?.abort();\n    requestIdRef.current += 1;', '  const leave = useCallback(() => {']], BOX_TESTS],
  ['MC-reopen-no-refresh', BOX, [['      droppedRef.current = false;\n      setRefresh(n => n + 1);', '      droppedRef.current = false;']], BOX_TESTS],
  ['MD-catch-no-tag', BOX, [['          setSuggestions(mergeLocal([]));\n          setHeldTag(requestTag);', '          setSuggestions(mergeLocal([]));']], BOX_TESTS],
  ['MJ-enter-on-held-key', BOX, [[' && !e.repeat', '']], BOX_TESTS],
  ['MJ2-enter-while-loading', BOX, [[' && !loading && !e.repeat', ' && !e.repeat']], BOX_TESTS],
  ['MK-minchars-off-by-one', BOX, [['const enoughText = normalizedValue.length >= minChars;', 'const enoughText = normalizedValue.length > minChars;']], BOX_TESTS],
  ['MM-blur-negation', BOX, [['!containerRef.current?.contains(e.relatedTarget)) leave();', 'containerRef.current?.contains(e.relatedTarget)) leave();']], BOX_TESTS],
  ['MN-outside-tap-only-hides', BOX, [['      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {\n        leave();', '      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {\n        setOpen(false);']], BOX_TESTS],
  ['MU-commit-keeps-list', BOX, [['      setOpen(false);\n      setSuggestions([]);\n      setHeldTag(null);\n', '      setOpen(false);\n']], BOX_TESTS],
  ['ME-ask-ignores-status', LIB, [['    if (!resp.ok) return readValidatorAnswer(false, null);\n', '']], HOOK_TESTS],
  ['MG-wait-ten-times-longer', LIB, [['export const VALIDATOR_WAIT_MS = 15000;', 'export const VALIDATOR_WAIT_MS = 150000;']], HOOK_TESTS],
  ['MO-caller-signal-not-heard', LIB, [["  opts.signal?.addEventListener('abort', cancel);\n", '']], HOOK_TESTS],
  ['MV-unverified-read-after-valid', LIB, [['  if (answer.unverified === true) {', '  if (answer.unverified === true && answer.valid !== true) {']], HOOK_TESTS],
  ['MF-club-substring-match', HOOK, [['.some((part) => stored.includes(part));', '.some((part) => stored.some((name) => part.includes(name)));']], HOOK_TESTS],
  ['MR-no-cancel-on-unmount', HOOK, [['  useEffect(() => cancelValidation, [cancelValidation]);\n', '']], HOOK_TESTS],
  ['MS-new-formation-no-cancel', HOOK, [['    cancelValidation();\n    setFormation(f);', '    setFormation(f);']], HOOK_TESTS],
  ['MT-reset-no-cancel', HOOK, [['    cancelValidation();\n    setFormation(null);', '    setFormation(null);']], HOOK_TESTS],
  ['MW-door-ignores-position', HOOK, [['  if (!normalizePosition(pick.rawPosition.trim())) return false;\n', '']], HOOK_TESTS],
  ['MX-exhausted-line-says-saved', HOOK, [['so this pick was not counted. Try another player or reroll the team.', 'Your lineup is saved; come back tomorrow.']], HOOK_TESTS],
  ['MY-refusal-on-unverified', HOOK, [["          else if (answer.why !== 'cancelled') setValidationError(unverifiedLine(answer));", "          else if (answer.why !== 'cancelled') setValidationError(`${typed} hasn't played for ${currentTeam.name}`);"]], HOOK_TESTS],
  ['MZ-rawname-ignored', HOOK, [['        playerName = pickMeta?.rawName?.trim() || typed;', '        playerName = typed;']], HOOK_TESTS],
];

const table = [];
for (const [name, file, edits, tests] of MUTATIONS) {
  if (only.length && !only.includes(name)) continue;
  const abs = path.join(root, file);
  const original = readFileSync(abs, 'utf8');
  let changed = original.replace(/\r\n/g, '\n');
  let problem = '';
  for (const [find, replacement] of edits) {
    if (typeof find === 'string') {
      const count = changed.split(find).length - 1;
      if (count !== 1) { problem = `anchor occurs ${count} times: ${JSON.stringify(find.slice(0, 70))}`; break; }
      changed = changed.replace(find, () => replacement);
    } else {
      if (!find.test(changed)) { problem = `regex anchor not found: ${find}`; break; }
      changed = changed.replace(find, () => replacement);
    }
  }
  if (problem) { table.push({ name, result: `NOT APPLIED (${problem})` }); console.log(`MUT ${name}: NOT APPLIED (${problem})`); continue; }
  if (edits.length && changed === original.replace(/\r\n/g, '\n')) { table.push({ name, result: 'NOT APPLIED (no change)' }); continue; }
  if (process.env.MUT_DRY) { console.log(`MUT ${name}: anchors ok`); continue; }
  const json = path.join(out, `mut-${name}.json`);
  let line;
  try {
    if (edits.length) writeFileSync(abs, changed);
    const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...tests, '--reporter=json', `--outputFile=${json}`, '--testTimeout=120000'], {
      cwd: root, encoding: 'utf8', timeout: 600000, env: { ...process.env, NO_COLOR: '1' },
    });
    let failed = [], total = 0, passed = 0, sweep = '';
    if (existsSync(json)) {
      const report = JSON.parse(readFileSync(json, 'utf8'));
      total = report.numTotalTests; passed = report.numPassedTests;
      for (const suite of report.testResults || []) {
        if (suite.status === 'failed' && !(suite.assertionResults || []).length) failed.push(`SUITE ${path.basename(suite.name)}: ${(suite.message || '').slice(0, 160)}`);
        for (const test of suite.assertionResults || []) if (test.status === 'failed') failed.push(`${path.basename(suite.name).replace('.test.tsx', '')} > ${test.title}`);
      }
    }
    const text = `${run.stdout || ''}\n${run.stderr || ''}`;
    const m = text.match(/STALE_SWEEP[^\n]*/);
    if (m) sweep = ` | ${m[0]}`;
    line = `exit=${run.status} signal=${run.signal} tests=${passed}/${total} failed=${failed.length}${sweep}${failed.length ? '\n      - ' + failed.join('\n      - ') : ''}`;
  } catch (error) {
    line = `RUNNER ERROR ${String(error).slice(0, 200)}`;
  } finally {
    writeFileSync(abs, original);
  }
  table.push({ name, result: line });
  console.log(`MUT ${name}: ${line}`);
}
writeFileSync(path.join(out, 'mutations.txt'), table.map(row => `${row.name}: ${row.result}`).join('\n') + '\n');
const survived = table.filter(row => /failed=0/.test(row.result) && !row.name.startsWith('none')).map(row => row.name);
console.log(`rv-mut: ${table.length} runs, survived with every test green: ${survived.length ? survived.join(', ') : 'none'}`);
