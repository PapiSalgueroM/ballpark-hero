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
  ['MQ-no-giveup-after-answer', HOOK, [["        if (run !== pickRun.current) return;\n        if (answer.kind !== 'valid') {", "        if (answer.kind !== 'valid') {"]], HOOK_TESTS],
  ['MW-door-ignores-position', HOOK, [['  if (!normalizePosition(pick.rawPosition.trim())) return false;\n', '']], HOOK_TESTS],
  ['MX-exhausted-line-says-saved', HOOK, [['so this pick was not counted. Try another player or reroll the team.', 'Your lineup is saved; come back tomorrow.']], HOOK_TESTS],
  ['MY-refusal-on-unverified', HOOK, [["          else if (answer.why !== 'cancelled') setValidationError(unverifiedLine(answer));", "          else if (answer.why !== 'cancelled') setValidationError(`${typed} hasn't played for ${currentTeam.name}`);"]], HOOK_TESTS],
  ['MZ-rawname-ignored', HOOK, [['        playerName = pickMeta?.rawName?.trim() || typed;', '        playerName = typed;']], HOOK_TESTS],
  /* second batch (restart 2) */
  ['MN1-door-open-for-nation', HOOK, [['  if (team.isNation || !pick?.club || !pick.rawPosition) return false;', '  if (!pick?.club || !pick.rawPosition) return false;']], HOOK_TESTS],
  ['MN2-door-label-fallback', HOOK, [['  const stored = CLUB_TABLE_NAMES[team.name];\n', '  const stored = CLUB_TABLE_NAMES[team.name] ?? [team.name];\n']], HOOK_TESTS],
  ['MN3-enter-during-composition', BOX, [[' && !e.nativeEvent.isComposing', '']], BOX_TESTS],
  ['MN4-commit-leaves-search-in-flight', BOX, [['      if (debounceRef.current) window.clearTimeout(debounceRef.current);\n      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);\n    },', '    },']], BOX_TESTS],
  ['MN5-no-giveup-after-history', HOOK, [['      if (run !== pickRun.current) return;\n      if (!positionCheck.ok) {', '      if (!positionCheck.ok) {']], HOOK_TESTS],
  ['MN6-cancel-does-not-abort', HOOK, [['    validatorCall.current?.abort();\n    setIsValidating(false);', '    setIsValidating(false);']], HOOK_TESTS],
  ['MN8-every-unverified-says-allowance', LIB, [['exhausted: answer.exhausted === true,', 'exhausted: true,']], HOOK_TESTS],
  ['MN15-any-blur-leaves', BOX, [['if (e.relatedTarget instanceof Node && !containerRef.current?.contains(e.relatedTarget)) leave();', 'if (!containerRef.current?.contains(e.relatedTarget as Node)) leave();']], BOX_TESTS],
  /* the fixer's own single line edits (session F): each guard on its own */
  ['FX1-leave-no-abort', BOX, [['    abortRef.current?.abort();\n    requestIdRef.current += 1;\n    droppedRef.current = true;', '    requestIdRef.current += 1;\n    droppedRef.current = true;']], BOX_TESTS],
  ['FX2-leave-no-timer-clear', BOX, [['  const leave = useCallback(() => {\n    if (debounceRef.current) window.clearTimeout(debounceRef.current);\n', '  const leave = useCallback(() => {\n']], BOX_TESTS],
  ['FX3-commit-no-abort', BOX, [['      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);\n    },', '      requestIdRef.current += 1;\n      setLoading(false);\n    },']], BOX_TESTS],
  ['FX4-commit-no-bump', BOX, [['      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);\n    },', '      abortRef.current?.abort();\n      setLoading(false);\n    },']], BOX_TESTS],
  ['FX5-commit-no-timer-clear', BOX, [['      if (debounceRef.current) window.clearTimeout(debounceRef.current);\n      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);', '      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);']], BOX_TESTS],
  ['FX6-escape-only-with-names', BOX, [["      if (e.key === 'Escape' && open) {", "      if (e.key === 'Escape' && open && suggestions.length > 0) {"]], BOX_TESTS],
  ['FX7-effect-minchars-off-by-one', BOX, [['    if (normalized.length < minChars) {', '    if (normalized.length <= minChars) {']], BOX_TESTS],
  ['FX8-ask-ignores-early-abort', LIB, [['  if (opts.signal?.aborted) cancel();\n', '']], HOOK_TESTS],
  ['FX9-reroll-no-cancel', HOOK, [['    cancelValidation();\n    setTeamAssignments((prev) => {', '    setTeamAssignments((prev) => {']], HOOK_TESTS],
  ['FX10-club-substring-other-way', HOOK, [['.some((part) => stored.includes(part));', '.some((part) => stored.some((name) => name.includes(part)));']], HOOK_TESTS],
  ['FX11-escape-when-closed-too', BOX, [["      if (e.key === 'Escape' && open) {", "      if (e.key === 'Escape') {"]], BOX_TESTS],
  /* closing fix pass 2: the pick guard, each line on its own */
  ['P1-pick-searches-again', BOX, [['    if (justPicked) return;\n', '']], BOX_TESTS],
  ['P2-pick-never-noted', BOX, [["      pickedTagRef.current = normalizeName(entity.name) + '\\u0000' + optionsKey;\n", '']], BOX_TESTS],
  ['P3-sticky-pick', BOX, [['    if (!justPicked) pickedTagRef.current = null;\n', '']], BOX_TESTS],
  ['P4-return-keeps-pick', BOX, [['    pickedTagRef.current = null;\n    setOpen(true);', '    setOpen(true);']], BOX_TESTS],
  ['P5-pick-is-name-only', BOX, [["      pickedTagRef.current = normalizeName(entity.name) + '\\u0000' + optionsKey;\n", '      pickedTagRef.current = normalizeName(entity.name);\n'], ['    const justPicked = pickedTagRef.current === tag;', '    const justPicked = pickedTagRef.current === normalizeName(value);']], BOX_TESTS],
  ['P6-any-query-skipped-after-pick', BOX, [['    const justPicked = pickedTagRef.current === tag;', '    const justPicked = pickedTagRef.current !== null;']], BOX_TESTS],
  ['P7-skip-also-clears-pick', BOX, [['    if (justPicked) return;\n', '    if (justPicked) { pickedTagRef.current = null; return; }\n']], BOX_TESTS],
  ['P8-pick-noted-from-typed-text', BOX, [["      pickedTagRef.current = normalizeName(entity.name) + '\\u0000' + optionsKey;\n", '      pickedTagRef.current = tag;\n']], BOX_TESTS],
  /* the tap click swallow, each line on its own */
  ['P9-tap-click-not-swallowed', BOX, [["                  if (!disabled && (e.pointerType === 'touch' || e.pointerType === 'pen')) swallowTapClick();\n", '']], BOX_TESTS],
  ['P10-next-touch-does-not-end-wait', BOX, [["  document.addEventListener('pointerdown', end, true);\n", '']], BOX_TESTS],
  ['P11-swallows-every-click', BOX, [['    event.stopPropagation();\n    end();\n', '    event.stopPropagation();\n']], BOX_TESTS],
  ['P12-wait-never-times-out', BOX, [['  const timer = window.setTimeout(end, TAP_CLICK_WAIT_MS);', '  const timer = 0;']], BOX_TESTS],
  ['P13-mouse-pick-swallows-too', BOX, [["(e.pointerType === 'touch' || e.pointerType === 'pen')", 'true']], BOX_TESTS],
  ['P14-swallow-keeps-default', BOX, [['    event.preventDefault();\n    event.stopPropagation();', '    event.stopPropagation();']], BOX_TESTS],
  ['P15-swallow-lets-click-through', BOX, [['    event.preventDefault();\n    event.stopPropagation();', '    event.preventDefault();']], BOX_TESTS],
  ['P16-pen-not-a-finger', BOX, [[" || e.pointerType === 'pen'", '']], BOX_TESTS],
  ['P17-wait-ten-times-longer', BOX, [['const TAP_CLICK_WAIT_MS = 700;', 'const TAP_CLICK_WAIT_MS = 7000;']], BOX_TESTS],
  ['P18-disabled-box-swallows', BOX, [["if (!disabled && (e.pointerType === 'touch'", "if ((e.pointerType === 'touch'"]], BOX_TESTS],
];

/* MUT_BOX_TESTS / MUT_HOOK_TESTS replace the test lists (the reviewer's probe files); MUT_PLAIN drops the long
   test timeout so a test that would time out in the round's own harness (default 5 s) times out here too. */
const boxOverride = (process.env.MUT_BOX_TESTS || '').split(',').filter(Boolean);
const hookOverride = (process.env.MUT_HOOK_TESTS || '').split(',').filter(Boolean);
const timeoutFlag = process.env.MUT_PLAIN ? [] : ['--testTimeout=120000'];
const tag = process.env.MUT_TAG || '';

const table = [];
for (const [name, file, edits, listed] of MUTATIONS) {
  if (only.length && !only.includes(name)) continue;
  const tests = listed === BOX_TESTS && boxOverride.length ? boxOverride : listed === HOOK_TESTS && hookOverride.length ? hookOverride : listed;
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
    const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...tests, '--reporter=json', `--outputFile=${json}`, ...timeoutFlag], {
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
writeFileSync(path.join(out, `mutations${tag}.txt`), table.map(row => `${row.name}: ${row.result}`).join('\n') + '\n');
const survived = table.filter(row => /failed=0/.test(row.result) && !row.name.startsWith('none')).map(row => row.name);
console.log(`rv-mut: ${table.length} runs, survived with every test green: ${survived.length ? survived.join(', ') : 'none'}`);
