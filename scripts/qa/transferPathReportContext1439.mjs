import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const BASE = 'c8b7279f259143fcd2741091c0a95fd12ba3a9cf';
export const BOARD_FILE = 'src/components/transfer-path/TransferPathBoard.tsx';
export const BOARD_ALIAS = '@/components/transfer-path/TransferPathBoard';
export const TEST_FILE = 'src/test/transferPathReportContext.test.tsx';
export const TEST_SHA256 = 'cb584d96482ba45209bc5b866d71cb6c4a12ff3b4449210ab32eaf569f60a4bf';
export const ORIGINAL_SHA256 = '9cb6bf16fff6cb6761257629e1cbef74ceffb94897ca8dedcbdcb60ad62fe799';
export const FIXED_SHA256 = '59f2c4ea98e6e72a4e56c805491cd888967b5a8ed405407f3d0d8a4406862d3a';
export const CONTROL_SHA256 = { 'reset-omission': '2c26ef752eecc8de8d1697aa88e4ecc34027daa0c6ee1824e23b54004099433c', 'copy-omission': 'fd45cf030a3df89ee784c8ce4f4a91ed2c208bee61b8a937d1eb0431ef665b8f' };
export const ORIGINAL_ADMISSION = {"status":"PASS","scope":"full-original-transfer-path-context","productAdopted":false,"head":"bc2bc8506d0e4e359a84f2fbc83702a9a8b01c75","sourceSha256":"9cb6bf16fff6cb6761257629e1cbef74ceffb94897ca8dedcbdcb60ad62fe799","testSha256":"cb584d96482ba45209bc5b866d71cb6c4a12ff3b4449210ab32eaf569f60a4bf","commonSha256":"737aa486663a5be5f4c50bff59a0a22af7d2a7b7a9acdc50515bb372bbab063a","featureSha256":"e8f1a769f74d240227cc33c8ba7015fc6103cc48cfb91fbf690b83bb1a26c9f4","pixelSha256":"16d5668870ff57104282f9e71e797b8c843e8edcc1dc828883bbe8914f5e14fc","admissionSha256":"bfd7305259beeb22b559b2706beb3d1b3b5d0df12e0d51897522118ebf759b43"};
export const HUNKS = [
  {
    "name": "react-effect-import",
    "original": "import { useState, useMemo } from 'react';",
    "fixed": "import { useState, useMemo, useEffect } from 'react';"
  },
  {
    "name": "session-diagnostics",
    "original": "  const [lastNoMatch, setLastNoMatch] = useState<string | null>(null);\n\n",
    "fixed": "  const [lastNoMatch, setLastNoMatch] = useState<string | null>(null);\n\n  useEffect(() => {\n    setLastRejected(null);\n    setLastNoMatch(null);\n    setError('');\n  }, [puzzle.id, puzzle.playerA, puzzle.playerB, mode, unlimitedIndex, activeRule]);\n\n"
  },
  {
    "name": "records-refusal",
    "original": "    return `${name} was never at the same club as ${last} in the same season`;",
    "fixed": "    return `${name} and ${last} don't share a club season in our records`;"
  },
  {
    "name": "national-team-instruction",
    "original": "                <p>🔗 Each name you add must have been at the same club as the LAST player in your chain, in the same season. Same shirt years apart does not count.</p>",
    "fixed": "                <p>🔗 Each name you add must have been at the same club as the LAST player in your chain, in the same season. Same shirt years apart does not count. National teams don't count.</p>"
  }
];
export const SOURCE_STEPS = [
  {
    "name": "react-effect-import",
    "beforeSha256": "9cb6bf16fff6cb6761257629e1cbef74ceffb94897ca8dedcbdcb60ad62fe799",
    "afterSha256": "8dd965326f5832e2d572d7c2b8a66305f857de4cf87656461a0efc7a0ae16fc6",
    "exactInverse": true
  },
  {
    "name": "session-diagnostics",
    "beforeSha256": "8dd965326f5832e2d572d7c2b8a66305f857de4cf87656461a0efc7a0ae16fc6",
    "afterSha256": "fd45cf030a3df89ee784c8ce4f4a91ed2c208bee61b8a937d1eb0431ef665b8f",
    "exactInverse": true
  },
  {
    "name": "records-refusal",
    "beforeSha256": "fd45cf030a3df89ee784c8ce4f4a91ed2c208bee61b8a937d1eb0431ef665b8f",
    "afterSha256": "295c3de0add410ac153ef43b5fad6df75baebe147dc0492885f16495ee65077d",
    "exactInverse": true
  },
  {
    "name": "national-team-instruction",
    "beforeSha256": "295c3de0add410ac153ef43b5fad6df75baebe147dc0492885f16495ee65077d",
    "afterSha256": "59f2c4ea98e6e72a4e56c805491cd888967b5a8ed405407f3d0d8a4406862d3a",
    "exactInverse": true
  }
];
export const GENERIC_REFUSAL = "Fixture Rejected One and Fixture Origin don't share a club season in our records";
export const NATIONAL_INSTRUCTION = "National teams don't count.";
export const TITLES = [
  ...['puzzle id', 'first endpoint', 'second endpoint', 'mode', 'unlimited index', 'effective rule'].map(field => `clears all diagnostics when ${field} changes independently`),
  'clears history through Next Puzzle even when the id wraps unchanged',
  'clears history through the completed daily Play Unlimited action',
  'clears diagnostics after an accepted special-rule callback',
  'keeps same-puzzle history through help typing and a valid advancement',
  'keeps diagnostics when a rule callback is guarded and returns false',
  'replaces the latest failure and retains all specialized refusal branches',
  'describes a generic refusal as absent from our club-season records',
  'states that national teams do not count beside the club-season instruction',
];
export const UNIT_ARMS = { baseline: ['normal'], fixed: ['normal', 'whole-original', 'reset-omission', 'copy-omission', 'restored'] };
export const FAULT_TITLES = { baseline: [...TITLES.slice(0, 9), ...TITLES.slice(12)], normal: [],
  'whole-original': [...TITLES.slice(0, 9), ...TITLES.slice(12)], 'reset-omission': TITLES.slice(0, 9),
  'copy-omission': TITLES.slice(12), restored: [] };
export const hash = body => createHash('sha256').update(body).digest('hex');
export const canonical = body => { assert.equal(typeof body, 'string'); assert(!body.includes('\r') || body.includes('\r\n'), 'No lone CR source'); return body.replace(/\r\n/g, '\n'); };
export function replaceOnce(source, before, after) {
  assert(before && before !== after, 'Effective literal source change');
  assert.equal(source.split(before).length, 2, 'Exactly one executable source anchor');
  const changed = source.replace(before, after); assert.notEqual(changed, source);
  assert.equal(changed.replace(after, before), source, 'Complete literal inverse'); return changed;
}
export function forward(original) {
  assert.equal(hash(original), ORIGINAL_SHA256, 'Whole canonical original Board');
  let source = original;
  for (const [index, hunk] of HUNKS.entries()) {
    assert.equal(hash(source), SOURCE_STEPS[index].beforeSha256);
    source = replaceOnce(source, hunk.original, hunk.fixed);
    assert.equal(hash(source), SOURCE_STEPS[index].afterSha256);
  }
  assert.equal(hash(source), FIXED_SHA256); return source;
}
export function inverse(fixed) {
  assert.equal(hash(fixed), FIXED_SHA256, 'Whole fixed Board');
  let source = fixed;
  for (const hunk of [...HUNKS].reverse()) source = replaceOnce(source, hunk.fixed, hunk.original);
  assert.equal(hash(source), ORIGINAL_SHA256); assert.equal(forward(source), fixed); return source;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-transfer-path-context' && value.productAdopted === false, 'Actual full original admission required');
  assert.match(value.head, /^[0-9a-f]{40}$/);
  for (const name of ['commonSha256', 'featureSha256', 'pixelSha256', 'admissionSha256']) assert.match(value[name], /^[0-9a-f]{64}$/);
  assert.equal(value.sourceSha256, ORIGINAL_SHA256); assert.equal(value.testSha256, TEST_SHA256); return value;
}
export function sourceForArm(plan, arm) {
  assert(UNIT_ARMS.fixed.includes(arm), 'Known Board source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal'); return plan.originalSource; }
  assertOriginalAdmission(plan);
  if (arm === 'whole-original') return inverse(plan.fixedSource);
  if (arm === 'reset-omission') {
    const value = replaceOnce(plan.fixedSource, HUNKS[1].fixed, HUNKS[1].original);
    assert.equal(hash(value), CONTROL_SHA256[arm]); return value;
  }
  if (arm === 'copy-omission') {
    let value = plan.fixedSource;
    for (const hunk of [HUNKS[3], HUNKS[2]]) value = replaceOnce(value, hunk.fixed, hunk.original);
    assert.equal(hash(value), CONTROL_SHA256[arm]); return value;
  }
  if (arm === 'restored') return forward(inverse(plan.fixedSource));
  return plan.fixedSource;
}
export function readPlan(root, mode) {
  assert(['baseline', 'fixed'].includes(mode), 'Known Transfer Path context mode');
  const read = spawnSync('git', ['show', `${BASE}:${BOARD_FILE}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.ifError(read.error); assert.equal(read.status, 0); const originalSource = canonical(read.stdout);
  assert.equal(hash(originalSource), ORIGINAL_SHA256);
  const fixedSource = forward(originalSource), recovered = inverse(fixedSource);
  assert.equal(recovered, originalSource);
  const physical = fs.readFileSync(path.join(root, BOARD_FILE)), actualSource = canonical(physical.toString('utf8'));
  const plan = { version: 1, mode, originalAdmission: ORIGINAL_ADMISSION, originalSource, fixedSource, actualSource,
    actualSha256: hash(actualSource), physicalSourceSha256: hash(physical), originalSha256: ORIGINAL_SHA256,
    fixedSha256: FIXED_SHA256, wholeInverse: { hunks: HUNKS, steps: SOURCE_STEPS, originalSha256: hash(recovered), restoredSha256: hash(forward(recovered)) } };
  if (mode === 'fixed') assertOriginalAdmission(plan);
  assert.equal(actualSource, mode === 'baseline' ? originalSource : fixedSource, 'Exact current canonical Board before proof');
  assert.equal(hash(fs.readFileSync(path.join(root, TEST_FILE))), TEST_SHA256, 'Frozen actual Board test'); return plan;
}
