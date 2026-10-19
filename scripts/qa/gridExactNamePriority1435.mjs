import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hash, git, once } from './gridSearchAccessibility1432.mjs';

export { hash, git, trackedSnapshot, assertSnapshot, roleTestCopy, ROLE_TESTS } from './gridSearchAccessibility1432.mjs';
export { evidenceTree } from './gridSearchCompatibility1432.mjs';
export const BASE = 'a153d2ea670f4c19cec0e15941e7c01bad254eec';
export const PRODUCT = 'src/components/soccer-grid/SoccerGridSearch.tsx';
export const TEST_FILE = 'src/test/soccerGridExactNamePriority.test.tsx';
export const TEST_SHA = '7bda93e470ce51504a22378b949b556c15bb8fc22ef622eee5bf7500c8ab8e16';
export const ORIGINAL_SHA = '368e948894d44cd04d086bc60b0b76e928138f12b317a2e76c6c828d9a1f0738';
export const FIXED_SHA = 'd3838e1855e25709b98846a534c355ed81481c9667115eb7aef3d503b609e686';
export const ORIGINAL_ADMISSION = null;
export const HUNK = {
  "original": "        .filter(p => normalizeName(p.name).includes(normalizedQuery))\n        .slice(0, 8)",
  "fixed": "        .filter(p => normalizeName(p.name).includes(normalizedQuery))\n        .sort((a, b) => Number(normalizeName(b.name) === normalizedQuery) - Number(normalizeName(a.name) === normalizedQuery))\n        .slice(0, 8)"
};
export const FIXTURES = { setup: 'Fixture Anchor', plain: 'Fixture Target', normalized: 'Fixture Tárget' };
export const TITLES = [
  "selects an exact catalog tail after eight earlier substring matches",
  "selects the normalized equivalent exact catalog tail",
  "preserves equivalent exact tie order and selects its second canonical spelling",
  "keeps the first eight incoming nonexact matches and bounded arrows",
  "keeps an already first exact canonical selection",
  "keeps unmatched manual entry title casing",
  "keeps raw one-character and all-whitespace gates",
  "keeps Escape and expired blur followed by canonical refocus"
];
export const PURPOSE = 'Enter must select the stable exact normalized catalog name';
export const PURPOSE_LINE = 105;
export const ARMS = ['normal', 'removed-priority', 'restored'];
export const FAULTS = [0, 1, 2];
export const RESULT_KIND = 'SOCCER_GRID_EXACT_NAME_RESULT';
export const DEFAULT_PREFIX = 'grid-exact-name-priority-evidence-';

export function changePriority(body, direction) {
  assert(['forward', 'inverse'].includes(direction));
  const before = direction === 'forward' ? HUNK.original : HUNK.fixed;
  const after = direction === 'forward' ? HUNK.fixed : HUNK.original;
  assert.equal(body.split(before).length, 2, 'Exactly one exact-priority source hunk');
  assert.equal(hash(body), direction === 'forward' ? ORIGINAL_SHA : FIXED_SHA, 'Exact whole exact-priority input');
  const result = once(body, before, after);
  assert.equal(hash(result), direction === 'forward' ? FIXED_SHA : ORIGINAL_SHA, 'Exact whole exact-priority result');
  return result;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-grid-exact-name-priority' && value.productAdopted === false,
    'Fixed priority proof requires actual full original admission before product adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/); assert.equal(value.sourceSha256, ORIGINAL_SHA); assert.equal(value.testSha256, TEST_SHA);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'fullAdmissionSha256']) assert.match(value[key], /^[0-9a-f]{64}$/);
  return value;
}
export function sourceForArm(plan, arm) {
  assert(ARMS.includes(arm), 'Known actual priority source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal'); return plan.original; }
  assertOriginalAdmission(plan);
  if (arm === 'removed-priority') return changePriority(plan.fixed, 'inverse');
  if (arm === 'restored') return changePriority(changePriority(plan.fixed, 'inverse'), 'forward');
  return plan.fixed;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'SOCCER_GRID_EXACT_NAME_MODE must be baseline or fixed');
  const original = git(root, ['show', BASE + ':' + PRODUCT]).toString('utf8');
  assert.equal(hash(original), ORIGINAL_SHA, 'Whole sealed1434 Search');
  const fixed = changePriority(original, 'forward'); assert.equal(changePriority(fixed, 'inverse'), original, 'Entire priority inverse');
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8');
  const plan = { version: 1, mode, arm, original, fixed, actual, originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA,
    actualSha256: hash(actual), hunk: HUNK, originalAdmission: ORIGINAL_ADMISSION };
  assert.equal(actual, sourceForArm(plan, arm), 'Only exact declared actual priority source');
  return plan;
}
