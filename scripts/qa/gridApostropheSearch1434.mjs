import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hash, git, once } from './gridSearchAccessibility1432.mjs';

export { hash, git, trackedSnapshot, assertSnapshot, roleTestCopy, ROLE_TESTS } from './gridSearchAccessibility1432.mjs';
export { evidenceTree } from './gridSearchCompatibility1432.mjs';
export const BASE = 'd96777c42ccbac08e0c3c794b329a114fe884256';
export const PRODUCT = 'src/components/soccer-grid/SoccerGridSearch.tsx';
export const TEST_FILE = 'src/test/soccerGridApostropheSearch.test.tsx';
export const TEST_SHA = 'a7265faffaaeacc166824368a5dc686abc2f514a9df61308fa7925f430f1f6b9';
export const ORIGINAL_SHA = '33e9b7ab8dcd37c6941fe30c867f71c3e2498fcd602b49325842a4c1d0e5c285';
export const FIXED_SHA = '368e948894d44cd04d086bc60b0b76e928138f12b317a2e76c6c828d9a1f0738';
export const ORIGINAL_ADMISSION = null;
export const HUNK = {
  original: "    (s ?? '')\n      .replace(FORMAT_CHARS, '')",
  fixed: "    (s ?? '')\n      .replace(/\\u2019/g, \"'\")\n      .replace(FORMAT_CHARS, '')",
};
export const FIXTURES = { straight: "Fixture N'Ara", curly: 'Fixture N\u2019Ara', left: 'Fixture N\u2018Ara' };
export const TITLES = [
  'selects the straight catalog spelling after a right-curly query',
  'selects the right-curly catalog spelling after a straight query',
  'keeps an existing straight canonical selection',
  'keeps an existing right-curly canonical selection',
  'keeps a truly unmatched manual entry title-cased',
  'keeps a left-curly apostrophe distinct for manual entry',
];
export const PURPOSE = 'Enter must deliver the existing catalog spelling';
export const PURPOSE_LINE = 84;
export const ARMS = ['normal', 'removed-fold', 'restored'];
export const FAULTS = [0, 1];
export const RESULT_KIND = 'SOCCER_GRID_APOSTROPHE_RESULT';
export const DEFAULT_PREFIX = 'grid-apostrophe-search-evidence-';

export function changeFold(body, direction) {
  assert(['forward', 'inverse'].includes(direction));
  const before = direction === 'forward' ? HUNK.original : HUNK.fixed;
  const after = direction === 'forward' ? HUNK.fixed : HUNK.original;
  assert.equal(body.split(before).length, 2, 'Exactly one comparison-fold source hunk');
  assert.equal(hash(body), direction === 'forward' ? ORIGINAL_SHA : FIXED_SHA, 'Exact whole comparison-fold input');
  const result = once(body, before, after);
  assert.equal(hash(result), direction === 'forward' ? FIXED_SHA : ORIGINAL_SHA, 'Exact whole comparison-fold result');
  return result;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-grid-apostrophe-search' && value.productAdopted === false,
    'Fixed comparison proof requires actual full original admission before product adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/); assert.equal(value.sourceSha256, ORIGINAL_SHA); assert.equal(value.testSha256, TEST_SHA);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'fullAdmissionSha256']) assert.match(value[key], /^[0-9a-f]{64}$/);
  return value;
}
export function sourceForArm(plan, arm) {
  assert(ARMS.includes(arm), 'Known actual comparison source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal'); return plan.original; }
  assertOriginalAdmission(plan);
  if (arm === 'removed-fold') return changeFold(plan.fixed, 'inverse');
  if (arm === 'restored') return changeFold(changeFold(plan.fixed, 'inverse'), 'forward');
  return plan.fixed;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'SOCCER_GRID_APOSTROPHE_MODE must be baseline or fixed');
  const original = git(root, ['show', BASE + ':' + PRODUCT]).toString('utf8');
  assert.equal(hash(original), ORIGINAL_SHA, 'Whole sealed1432 Search');
  const fixed = changeFold(original, 'forward'); assert.equal(changeFold(fixed, 'inverse'), original, 'Entire fold inverse');
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8');
  const plan = { version: 1, mode, arm, original, fixed, actual, originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA,
    actualSha256: hash(actual), hunk: HUNK, originalAdmission: ORIGINAL_ADMISSION };
  assert.equal(actual, sourceForArm(plan, arm), 'Only exact declared actual comparison source');
  return plan;
}
