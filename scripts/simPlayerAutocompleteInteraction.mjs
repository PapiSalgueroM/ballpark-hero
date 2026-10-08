/* Round 754: actual option interaction outcomes, with asserted broken copies.
 *
 * Round 1138: a second run, src/test/playerAutocompleteStale.test.tsx, for the
 * rule that a list is only ever on screen for the query that produced it. Its
 * first test sweeps 200 seeded timings (type one name, type another, tap
 * before the second answer can show) and prints one line,
 *   STALE_SWEEP seed=<s> trials=200 staleVisible=<n> stalePicked=<n> currentPicked=<n> stuckFinding=<n>
 *
 * MEASURED ON MAIN (6f57ce78, the box before the fix), stale names picked of
 * 200: seed 1138, 67. Seed 2138, 72. Seed 3138, 67. (Offered and picked were
 * the same count on every seed.) After the fix all three seeds read 0 offered,
 * 0 picked, 200 current picks, 0 stuck panels. The floor the notag control
 * must reach is half of the lowest of the three, 34: an exact zero is the pass
 * condition of the plain run, and the floor only proves the control brought
 * the measured bug back rather than some trace of it.
 *
 * Usage:
 *   node scripts/simPlayerAutocompleteInteraction.mjs
 *   AUTOCOMPLETE_INTERACTION_CONTROL=<name> node scripts/simPlayerAutocompleteInteraction.mjs
 *
 * Controls of Round 754, against the 8 interaction tests (unchanged):
 *   pointeronly, unguard, enabledoptions
 * Controls of Round 1138, against the 13 stale list tests. Each swaps in an
 * asserted copy of the box with one thing changed, must fail the tests named
 * and must leave the others named green (a control that reddens those is an
 * abort, not a pass):
 *   notag         the list is shown whatever query it was fetched for
 *                 fails 1, 2, 3; keeps 7; the sweep must pick at least 34 stale
 *   keeplist      leaving the box hides the list and keeps it
 *                 fails 4; keeps 1, 7
 *   noenter       Enter never picks the only name showing
 *                 fails 5; keeps 6, 7
 *   anyenter      Enter picks the only name on a free text page too
 *                 fails 6; keeps 5, 7
 *   topenter      Enter picks the top name of several
 *                 fails 5; keeps 6, 7
 *   nodropcommit  a pick does not mark the list as dropped
 *                 fails 8; keeps 1, 7
 * Added after the round's review, whose mutation run left these edits green
 * and whose reading found Escape swallowed during a search (tests 9 to 12
 * were written for them):
 *   minchars      exactly the fewest letters a page asks for is not enough text
 *                 fails 9; keeps 1, 4, 7
 *   leaveflight   leaving the box keeps its waiting search, its request and its answer
 *                 fails 10; keeps 1, 4, 7
 *   pickflight    a pick keeps the waiting search, the request and the answer
 *                 fails 11; keeps 1, 7, 8
 *   lateescape    Escape is only heard while names are showing
 *                 fails 12; keeps 4, 7, 8
 * Added by the closing fix pass, with test 13 (a pick used to search for the
 * picked name at once, so the list came back over Missing XI's Lock in guess
 * button and sat open under Build Your XI's disabled box):
 *   pickreopens   a pick searches for the picked name straight away
 *                 fails 13; keeps 1, 7, 8, 11
 *   stickypick    the picked name stays unsearchable after the text has moved on
 *                 fails 13; keeps 1, 7, 8, 11
 *   deafreturn    coming back to the box after a pick asks for no search
 *                 fails 8, 13; keeps 1, 7
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.AUTOCOMPLETE_INTERACTION_CONTROL || '';

const STALE_TESTS = {
  1: 'never offers the last query under new text, across 200 seeded timings',
  2: 'drops the list in the same render the text changes',
  3: 'drops the list when the search options change under the same text',
  4: 'drops the list when the player leaves the box and searches again on return',
  5: 'Enter picks the only name showing when the page asks for a pick from the list',
  6: 'Enter still sends the typed text on a free text page with one name showing',
  7: 'offers a settled list for the text in the box exactly as before',
  8: 'never shows Finding players with nothing in flight',
  9: 'searches at exactly the fewest letters the page asks for',
  10: 'drops a search still in flight when the player leaves the box',
  11: 'drops a search still in flight when a name is picked',
  12: 'Escape leaves the box while a search is in flight',
  13: 'a pick does not bring the list back under the picked name',
};
/* Lowest stale pick count of the three seeds measured on main, and the floor. */
const MEASURED_ON_MAIN = { 1138: 67, 2138: 72, 3138: 67 };
const NOTAG_FLOOR = Math.ceil(Math.min(...Object.values(MEASURED_ON_MAIN)) / 2);

const ENTER_LINE = '        } else if (validateOnly && suggestions.length === 1 && !loading && !e.repeat && !e.nativeEvent.isComposing) {';
const INTERACTION_CONTROLS = ['pointeronly', 'unguard', 'enabledoptions'];
const STALE_CONTROLS = {
  notag: {
    edits: [['const suggestions = heldTag === tag ? heldSuggestions : NO_SUGGESTIONS;', 'const suggestions = heldSuggestions;']],
    fails: [1, 2, 3], keeps: [7],
  },
  keeplist: {
    edits: [['    setSuggestions([]);\n    setHeldTag(null);\n    setLoading(false);\n  }, []);', '    setLoading(false);\n  }, []);']],
    fails: [4], keeps: [1, 7],
  },
  noenter: { edits: [[ENTER_LINE, '        } else if (false) {']], fails: [5], keeps: [6, 7] },
  anyenter: { edits: [[ENTER_LINE, ENTER_LINE.replace('validateOnly && ', '')]], fails: [6], keeps: [5, 7] },
  topenter: { edits: [[ENTER_LINE, ENTER_LINE.replace('suggestions.length === 1', 'suggestions.length >= 1')]], fails: [5], keeps: [6, 7] },
  nodropcommit: {
    edits: [['      droppedRef.current = true;\n      setHighlightedIndex(-1);', '      setHighlightedIndex(-1);']],
    fails: [8], keeps: [1, 7],
  },
  minchars: {
    edits: [['const enoughText = normalizedValue.length >= minChars;', 'const enoughText = normalizedValue.length > minChars;']],
    fails: [9], keeps: [1, 4, 7],
  },
  leaveflight: {
    edits: [['    if (debounceRef.current) window.clearTimeout(debounceRef.current);\n    abortRef.current?.abort();\n    requestIdRef.current += 1;\n    droppedRef.current = true;', '    droppedRef.current = true;']],
    fails: [10], keeps: [1, 4, 7],
  },
  pickflight: {
    edits: [['      if (debounceRef.current) window.clearTimeout(debounceRef.current);\n      abortRef.current?.abort();\n      requestIdRef.current += 1;\n      setLoading(false);\n    },', '    },']],
    fails: [11], keeps: [1, 7, 8],
  },
  lateescape: {
    edits: [["      if (e.key === 'Escape' && open) {", "      if (e.key === 'Escape' && open && suggestions.length > 0) {"]],
    fails: [12], keeps: [4, 7, 8],
  },
  pickreopens: { edits: [['    if (justPicked) return;\n', '']], fails: [13], keeps: [1, 7, 8, 11] },
  stickypick: { edits: [['    if (!justPicked) pickedTagRef.current = null;\n', '']], fails: [13], keeps: [1, 7, 8, 11] },
  deafreturn: { edits: [['    pickedTagRef.current = null;\n    setOpen(true);', '    setOpen(true);']], fails: [8, 13], keeps: [1, 7] },
};
assert.ok(control === '' || INTERACTION_CONTROLS.includes(control) || Object.hasOwn(STALE_CONTROLS, control), 'Unknown autocomplete interaction control');
const staleSpec = Object.hasOwn(STALE_CONTROLS, control) ? STALE_CONTROLS[control] : null;

const VITEST = path.join(root, 'node_modules/vitest/vitest.mjs');
const INTERACTION_FILE = 'src/test/playerAutocompleteInteraction.test.tsx';
const STALE_FILE = 'src/test/playerAutocompleteStale.test.tsx';

function runVitest(file, env) {
  const run = spawnSync(process.execPath, [VITEST, 'run', file, '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 300000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  return { status: run.status, output, diagnostic: output.slice(-6000) };
}

/** 'passed', 'failed' or 'missing' for one stale list test, read off the verbose reporter's own line for it. */
function staleStatus(output, number) {
  const name = STALE_TESTS[number];
  const own = output.split(/\r?\n/)
    .map(line => line.trim().replace(/\s+\d+(\.\d+)?\s*m?s$/, ''))
    .filter(line => line.includes('playerAutocompleteStale.test.tsx > ') && line.endsWith(` > ${name}`));
  if (own.some(line => line.startsWith('×'))) return 'failed';
  if (own.some(line => line.startsWith('✓'))) return 'passed';
  return 'missing';
}

function readSweep(output, diagnostic) {
  const found = output.match(/STALE_SWEEP seed=(\d+) trials=(\d+) staleVisible=(\d+) stalePicked=(\d+) currentPicked=(\d+) stuckFinding=(\d+)/);
  assert.ok(found, `The sweep must print its STALE_SWEEP line\n${diagnostic}`);
  const [seed, trials, staleVisible, stalePicked, currentPicked, stuckFinding] = found.slice(1).map(Number);
  return { seed, trials, staleVisible, stalePicked, currentPicked, stuckFinding };
}

let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = (await readFile(path.join(root, 'src/components/game/PlayerAutocomplete.tsx'), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    const replace = (anchor, replacement, count = 1) => {
      assert.equal(changed.split(anchor).length - 1, count, 'The autocomplete control anchor must occur exactly as expected');
      changed = changed.replaceAll(anchor, replacement);
    };
    if (staleSpec) {
      for (const [anchor, replacement] of staleSpec.edits) replace(anchor, replacement);
    } else if (control === 'pointeronly') {
      replace('                onClick={e => {\n                  if (e.detail === 0) commitSelection(entity);\n                }}', '');
    } else if (control === 'unguard') {
      replace('      if (disabled) return;', '', 2);
    } else {
      replace('                role="option"\n                disabled={disabled}', '                role="option"');
    }
    assert.notEqual(changed, source, 'The autocomplete control must change the component');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'autocomplete-interaction-'));
    copy = path.join(folder, 'PlayerAutocomplete.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/game/PlayerAutocomplete': copy });
  }

  /* Run 1, Round 754's eight interaction tests: the plain run and its three controls, asserted as they always were. */
  if (!staleSpec) {
    const { status, output, diagnostic } = runVitest(INTERACTION_FILE, env);
    assert.match(output, /playerAutocompleteInteraction\.test\.tsx/, 'The actual autocomplete tests must run');
    if (control) {
      assert.notEqual(status, 0, diagnostic);
      assert.match(output, control === 'pointeronly' ? /selects exactly once from a native keyboard or assistive click/ : /disables existing options and rejects stale pointer and keyboard activation/, diagnostic);
      assert.match(output, control === 'pointeronly' ? /2 failed.*6 passed/ : control === 'unguard' ? /3 failed.*5 passed/ : /1 failed.*7 passed/, diagnostic);
      console.log(`simPlayerAutocompleteInteraction ${control} control: actual interaction checks rejected the changed component.`);
    } else {
      assert.equal(status, 0, diagnostic);
      assert.match(output, /8 passed/, diagnostic);
    }
  }

  /* Run 2, Round 1138's thirteen stale list tests: the plain run and its thirteen controls. */
  if (!control || staleSpec) {
    const { status, output, diagnostic } = runVitest(STALE_FILE, env);
    assert.match(output, /playerAutocompleteStale\.test\.tsx/, 'The stale list tests must run');
    const sweep = readSweep(output, diagnostic);
    assert.equal(sweep.trials, 200, 'The sweep must run its 200 trials');
    if (staleSpec) {
      assert.notEqual(status, 0, `The ${control} control left the stale list tests green\n${diagnostic}`);
      for (const number of staleSpec.keeps) {
        assert.equal(staleStatus(output, number), 'passed', `CONTROL ABORTED, not a pass: under ${control} test ${number} (${STALE_TESTS[number]}) must stay green\n${diagnostic}`);
      }
      for (const number of staleSpec.fails) {
        assert.equal(staleStatus(output, number), 'failed', `Under ${control} test ${number} (${STALE_TESTS[number]}) must go red\n${diagnostic}`);
      }
      if (control === 'notag') {
        assert.ok(sweep.stalePicked >= NOTAG_FLOOR, `Under notag the sweep must pick at least ${NOTAG_FLOOR} stale names (half of the lowest count measured on main), it picked ${sweep.stalePicked}`);
        assert.ok(sweep.staleVisible >= NOTAG_FLOOR, `Under notag the sweep must be offered at least ${NOTAG_FLOOR} stale names, it saw ${sweep.staleVisible}`);
      }
      const seen = control === 'notag' ? ` The sweep (seed ${sweep.seed}) was offered ${sweep.staleVisible} stale names and picked ${sweep.stalePicked}, floor ${NOTAG_FLOOR}.` : '';
      console.log(`simPlayerAutocompleteInteraction ${control} control: stale list test${staleSpec.fails.length > 1 ? 's' : ''} ${staleSpec.fails.join(', ')} rejected the changed component and test${staleSpec.keeps.length > 1 ? 's' : ''} ${staleSpec.keeps.join(', ')} stayed green.${seen}`);
    } else {
      assert.equal(status, 0, diagnostic);
      assert.match(output, /Tests\s+13 passed \(13\)/, diagnostic);
      for (const number of Object.keys(STALE_TESTS)) assert.equal(staleStatus(output, Number(number)), 'passed', `Stale list test ${number} must pass\n${diagnostic}`);
      assert.deepEqual(
        { staleVisible: sweep.staleVisible, stalePicked: sweep.stalePicked, currentPicked: sweep.currentPicked, stuckFinding: sweep.stuckFinding },
        { staleVisible: 0, stalePicked: 0, currentPicked: 200, stuckFinding: 0 },
        'The sweep must offer and pick no stale name, land every current pick and leave no stuck panel',
      );
      console.log(`simPlayerAutocompleteInteraction: eight actual-component pointer, keyboard, disabled, free-text, identity and filter checks passed; thirteen stale list checks passed, and across 200 seeded timings (seed ${sweep.seed}) the box offered 0 names of the last query, 0 were picked, 200 of 200 current picks landed and 0 panels were left on Finding players.`);
    }
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
