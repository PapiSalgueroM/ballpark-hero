/* Round 1138: the client side of Build Your XI's validator, with asserted broken copies.
 *
 * THE RULE THIS STANDS FOR. July 2026: nonsense answers were accepted while the
 * free model quota was exhausted, because a validator's client took an error
 * as a yes. Since then every validator fails closed: a check that cannot be
 * made is a no penalty retry, never an accept. This harness holds that rule
 * for src/lib/validatorClient.ts (one reader for a validator's answer, one way
 * to ask) and for the validator branch of src/hooks/useLineupBuilder.ts.
 *
 * It runs src/test/lineupValidatorClient.test.tsx through vitest. Every
 * request in that file is a stub, so this is offline and safe in runAllSims.
 *   Part A  the reader: only an ok response whose body carries the boolean
 *           true in `valid`, and does not say unverified, reads as valid.
 *   Part B  the door: a club slot pick our own row settles needs no request;
 *           a nation, a row at another club, a row with no known position and
 *           a club with no stored names never pass it.
 *   Part C  the hook: an allowance answer, a failed status, a body that is
 *           not a verdict, a timeout and a network error each leave ONE pick
 *           uncounted (no slot filled, same team, same slot, not busy,
 *           checkingDown false, a line that says neither "saved" nor "hasn't
 *           played"); a valid answer is still accepted; a refusal still reads
 *           as a refusal; a reroll or a cancel gives up on the check in flight.
 *
 * WHAT THE DOOR GIVES UP, said so the reviewer starts here. A club pick from
 * the list is settled by the browser's fit rule alone (the game's declared
 * rule since Round 442). The validator's own position map and any refusal it
 * once stored for a club pick no longer bind such a pick. A nation pick is
 * still judged by the validator. The `localall` control asks the July
 * question of the door itself: a pick our row does NOT settle must never be
 * let in by it.
 *
 * Usage:
 *   node scripts/simLineupValidatorClient.mjs
 *   LINEUP_VALIDATOR_CONTROL=<name> node scripts/simLineupValidatorClient.mjs
 *
 * Controls. Each swaps in an asserted copy of the lib or the hook with one
 * thing changed, must fail the tests named and must leave the others named
 * green (a control that reddens those is an abort, not a pass):
 *   accepterror  lib: a failed status reads as valid (an error taken as a yes)
 *   acceptthrow  lib: a request that throws reads as valid (the July catch)
 *   truthy       lib: `valid` is read by truthiness, and before `unverified`
 *   notimeout    lib: the wait is never started, so a hung check hangs
 *   wall         hook: checkingDown comes back true (the box is taken away)
 *   nolocal      hook: the door is shut, every club pick waits on the validator
 *   localall     hook: the door lets everything in with no check
 *   nogiveup     hook: a pick the player gave up on is no longer dropped
 * Added after the round's review, whose mutation run left these edits green
 * (two asking tests, five near miss rows of the door and tests 20 and 21 were
 * written for them):
 *   longwait     lib: the wait is 150 seconds. Test 14 reads the constant back
 *                and stays green under it, which is why the number is also
 *                written out in a test of its own
 *   deafcaller   lib: a caller who gives up is not heard
 *   looseclub    hook: the door takes a club whose name only contains, or sits
 *                inside, one of the slot club's stored names
 *   keepflight   hook: a reroll, a new formation, a reset and leaving the page
 *                no longer give up on the check in flight
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LINEUP_VALIDATOR_CONTROL || '';
const TEST_FILE = 'src/test/lineupValidatorClient.test.tsx';
const TOTAL = 55; // 19 in part A (17 reading, 2 asking), 15 in part B, 21 in part C

const LIB = { id: '@/lib/validatorClient', file: 'src/lib/validatorClient.ts', copy: 'validatorClient.ts' };
const HOOK = { id: '@/hooks/useLineupBuilder', file: 'src/hooks/useLineupBuilder.ts', copy: 'useLineupBuilder.ts' };

/* Test titles, exactly as the test file names them. */
const C = {
  1: 'a club pick on file at the club lands with no request to the validator',
  2: 'a club pick whose row is at another club goes to the validator',
  3: 'a club pick whose row has no known position goes to the validator',
  4: 'a nation pick always goes to the validator',
  5: 'an HTTP 429 with an error body is not counted',
  6: 'an HTTP 500 is not counted',
  7: 'a 200 that is not JSON is not counted',
  8: 'a 200 with an empty object is not counted',
  9: 'a 200 with valid as a string is not counted',
  10: 'a 200 with both flags is not counted',
  11: 'a 200 unverified answer is not counted',
  12: 'a rejected fetch is not counted',
  13: 'an allowance answer blocks only that pick',
  14: 'a check that never answers is given up and cancelled',
  15: 'a reroll cancels the check in flight',
  16: 'a real refusal reads as a refusal',
  17: 'a valid answer is accepted',
  18: 'a club row the position gate refuses is still refused',
  19: 'a pick given up while its history is read is dropped',
  20: 'giving up drops an answer that was already on its way',
  21: 'leaving the page cancels the check in flight',
};
const ASK = {
  wait: 'waits fifteen seconds for an answer and no longer',
  caller: 'hears the caller give up at once, after it asked or before',
};
const DOOR_OPEN = ['a club row at the slot club', 'the club under its second stored name', 'a split season that includes the club'].map(row => `the door opens for ${row}`);
const DOOR_SHUT = [
  'a row at another club', 'a nation slot whatever the row says', 'a row with no club', 'a row with no position',
  'a row with a position spelling the map does not know', 'a club label with no stored names', 'no row at all',
].map(row => `the door stays shut for ${row}`);
const DOOR_NEAR_MISS = [
  'a side whose name only starts with the slot club', 'a second side of the club under its longer stored name',
  'a club name that is only a piece of the stored name', 'a split season whose nearest club is a near miss',
  'a club field that is only the separator',
].map(row => `the door stays shut for ${row}`);
const NOTHING_COUNTED = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => C[n]);

const KEEP = [C[17], ...DOOR_OPEN];
const CONTROLS = {
  accepterror: {
    target: LIB,
    edits: [["  if (!ok) return { kind: 'unverified', why: 'status', exhausted: false };", "  if (!ok) return { kind: 'valid' };"]],
    fails: ['reads an HTTP 429 with an error body', 'reads a failed response that claims valid', C[5], C[6]], keeps: KEEP,
  },
  acceptthrow: {
    target: LIB,
    edits: [["    return { kind: 'unverified', why, exhausted: false };", "    return { kind: 'valid' };"]],
    fails: [C[7], C[12], C[14]], keeps: KEEP,
  },
  truthy: {
    target: LIB,
    /* Rule 4 as it would read by truthiness, placed above rule 3. It keeps the stored name, so the valid rows
       and test 17 stay green and only the three bodies that are not the boolean true change sides. */
    edits: [['  if (answer.unverified === true) {', "  if (answer.valid) {\n    const fullName = text(answer.fullName);\n    return { kind: 'valid', ...(fullName ? { fullName } : {}) };\n  }\n  if (answer.unverified === true) {"]],
    fails: ['reads valid as the string true', 'reads valid as the number 1', 'reads both flags at once', C[9], C[10]], keeps: KEEP,
  },
  notimeout: {
    target: LIB,
    edits: [['  const timer = setTimeout(() => { timedOut = true; call.abort(); }, opts.waitMs ?? VALIDATOR_WAIT_MS);', '  const timer = undefined;']],
    fails: [C[14]], keeps: KEEP,
  },
  wall: {
    target: HOOK,
    edits: [['    checkingDown: false,', '    checkingDown: true,']],
    fails: NOTHING_COUNTED, keeps: KEEP,
  },
  nolocal: {
    target: HOOK,
    edits: [['      if (clubPickVerifies(currentTeam, position.role, pickMeta)) {', '      if (false) {']],
    fails: [C[1], C[13]], keeps: KEEP,
  },
  /* The must stay green set is different here on purpose: test 17 is a nation pick filled under the validator's
     fullName, and with the door wide open the door takes it first. Test 18 proves the door sits BELOW the position
     gate: a keeper at CM is still refused with the door open. */
  localall: {
    target: HOOK,
    edits: [['  if (team.isNation || !pick?.club || !pick.rawPosition) return false;', '  return true;']],
    fails: [C[2], C[3], C[4], ...DOOR_SHUT, ...DOOR_NEAR_MISS], keeps: [...DOOR_OPEN, C[1], C[18]],
  },
  nogiveup: {
    target: HOOK,
    edits: [['if (run !== pickRun.current) return;', '', 2]],
    fails: [C[19], C[20]], keeps: [...KEEP, C[15]],
  },
  longwait: {
    target: LIB,
    edits: [['export const VALIDATOR_WAIT_MS = 15000;', 'export const VALIDATOR_WAIT_MS = 150000;']],
    fails: [ASK.wait], keeps: [...KEEP, C[14]],
  },
  deafcaller: {
    target: LIB,
    edits: [["  opts.signal?.addEventListener('abort', cancel);\n", '']],
    fails: [ASK.caller], keeps: KEEP,
  },
  looseclub: {
    target: HOOK,
    edits: [['.some((part) => stored.includes(part));', '.some((part) => stored.some((name) => name.includes(part) || part.includes(name)));']],
    fails: DOOR_NEAR_MISS, keeps: [...KEEP, 'the door stays shut for a row at another club', C[18]],
  },
  /* Test 15 asks with a request that only dies when it is aborted. It waits a moment for the cancelled check and
     no longer (the test file's `ended`), so under this control and under deafcaller it fails on what it asserts
     instead of hanging: a test the runner times out inside an open act() takes every later test down with it. */
  keepflight: {
    target: HOOK,
    edits: [['  useEffect(() => cancelValidation, [cancelValidation]);\n', ''], ['    cancelValidation();\n', '', 3]],
    fails: [C[15], C[20], C[21]], keeps: KEEP,
  },
};
assert.ok(control === '' || Object.hasOwn(CONTROLS, control), `Unknown lineup validator control "${control}" (${Object.keys(CONTROLS).join(', ')})`);
const spec = control ? CONTROLS[control] : null;

/** 'passed', 'failed' or 'missing' for one test, read off the verbose reporter's own line for it. */
function statusOf(output, title) {
  const own = output.split(/\r?\n/)
    .map(line => line.trim().replace(/\s+\d+(\.\d+)?\s*m?s$/, ''))
    .filter(line => line.includes('lineupValidatorClient.test.tsx > ') && line.endsWith(` > ${title}`));
  if (own.some(line => line.startsWith('×'))) return 'failed';
  if (own.some(line => line.startsWith('✓'))) return 'passed';
  return 'missing';
}

let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (spec) {
    const source = (await readFile(path.join(root, spec.target.file), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const [anchor, replacement, count = 1] of spec.edits) {
      assert.equal(changed.split(anchor).length - 1, count, `The ${control} control anchor must occur exactly ${count} time(s) in ${spec.target.file}`);
      changed = changed.replaceAll(anchor, replacement);
    }
    assert.notEqual(changed, source, 'The control must change the source');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'lineup-validator-'));
    copy = path.join(folder, spec.target.copy);
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.target.id]: copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST_FILE, '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 300000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  const diagnostic = output.slice(-6000);
  assert.ok(!run.error, String(run.error));
  assert.equal(run.signal, null, 'A terminated run earns no credit');
  assert.match(output, /lineupValidatorClient\.test\.tsx/, 'The validator client tests must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors/, 'A run that did not collect its tests earns no credit');
  if (spec) {
    assert.notEqual(run.status, 0, `The ${control} control left every test green\n${diagnostic}`);
    for (const title of spec.keeps) {
      assert.equal(statusOf(output, title), 'passed', `CONTROL ABORTED, not a pass: under ${control} "${title}" must stay green\n${diagnostic}`);
    }
    for (const title of spec.fails) {
      assert.equal(statusOf(output, title), 'failed', `Under ${control} "${title}" must go red\n${diagnostic}`);
    }
    console.log(`simLineupValidatorClient ${control} control: ${spec.fails.length} named check${spec.fails.length > 1 ? 's' : ''} rejected the changed ${spec.target === LIB ? 'reader' : 'hook'} and ${spec.keeps.length} named checks stayed green.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, new RegExp(`Tests\\s+${TOTAL} passed \\(${TOTAL}\\)`), diagnostic);
    for (const title of [...Object.values(C), ...Object.values(ASK), ...DOOR_OPEN, ...DOOR_SHUT, ...DOOR_NEAR_MISS]) {
      assert.equal(statusOf(output, title), 'passed', `"${title}" must pass\n${diagnostic}`);
    }
    console.log(`simLineupValidatorClient: ${TOTAL} checks passed. Only the boolean true on an ok response reads as valid; an allowance answer, a failed status, a body that is not a verdict, a timeout and a network error each leave one pick uncounted with the slot open; a club pick our own row settles asks nobody; a valid answer is still accepted.`);
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
