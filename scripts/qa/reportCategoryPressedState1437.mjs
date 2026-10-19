import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const BASE = '9d31a7d2e839523f5a3826a5150184dae91f520c';
export const ORIGINAL_ADMISSION = null;
export const TEST_SHA256 = '81151e4ba307840a209d684d022b8d16bef55e3460711f0798066618f2956f1c';
export const FORM_FILES = ['src/components/game/ReportSiteIssue.tsx', 'src/components/game/ReportQuestion.tsx'];
export const FORM_ALIASES = ['@/components/game/ReportSiteIssue', '@/components/game/ReportQuestion'];
export const ORIGINAL_SHA256 = {
  [FORM_FILES[0]]: '5a089ec0872c0361429f0965433d993770fb162a8594028fcb6f38fcbe02fa49',
  [FORM_FILES[1]]: '83abbe8183400a9d95e6b91ffa0e758e0c9a0a3e159da2d3b4db30539e887b6c',
};
export const FIXED_SHA256 = {
  [FORM_FILES[0]]: '700cc63a32be7eb53edc555eef582e332d26c5e906e75d785b3dd163934732c6',
  [FORM_FILES[1]]: 'f16ca016c5a96b56d554490c1eb0516ee91cf9d0a3f84589173356e91e311dc6',
};
export const CATEGORY_HUNKS = FORM_FILES.map((file, index) => ({ file, field: index === 0 ? 'kind' : 'reason', item: index === 0 ? 'k' : 'r',
  original: `                    key={${index === 0 ? 'k' : 'r'}}\n`,
  fixed: `                    key={${index === 0 ? 'k' : 'r'}}\n                    aria-pressed={${index === 0 ? 'kind === k' : 'reason === r'}}\n`,
}));
export const CATEGORY_NAMES = [
  ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Other'],
  ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Duplicate question', 'Other'],
];
export const CASE_NAMES = [
  'keeps the initial no-category draft optional through delivery and reset',
  'exposes selected category through switch repeat and reopen',
  'exposes newer category through captured pending failure retry and reset',
];
export const TITLES = ['footer report', 'game report'].flatMap(surface => CASE_NAMES.map(name => `${surface} category state ${name}`));
export const ARM_FAULTS = { baseline: [1, 2, 4, 5], normal: [], bare: [], 'whole-original': [1, 2, 4, 5], 'footer-omission': [1, 2], 'game-omission': [4, 5], 'footer-inverted': [1, 2], 'game-inverted': [4, 5], restored: [] };
export const hash = body => createHash('sha256').update(body).digest('hex');
export function changeCategory(source, hunk, direction) {
  assert(['forward', 'inverse'].includes(direction), 'Known category direction');
  const before = direction === 'forward' ? hunk.original : hunk.fixed;
  const after = direction === 'forward' ? hunk.fixed : hunk.original;
  assert.equal(source.split(before).length, 2, `${hunk.file}: exactly one ${direction} category anchor`);
  assert.equal(hash(source), (direction === 'forward' ? ORIGINAL_SHA256 : FIXED_SHA256)[hunk.file], `${hunk.file}: whole ${direction} input source`);
  const changed = source.replace(before, after); assert.notEqual(changed, source, `${hunk.file}: executable category source changes`);
  assert.equal(hash(changed), (direction === 'forward' ? FIXED_SHA256 : ORIGINAL_SHA256)[hunk.file], `${hunk.file}: whole ${direction} result source`);
  return changed;
}
export function invertCategory(source, hunk) {
  assert.equal(hash(source), FIXED_SHA256[hunk.file], `${hunk.file}: whole inversion input source`);
  const before = `aria-pressed={${hunk.field} === ${hunk.item}}`, after = `aria-pressed={${hunk.field} !== ${hunk.item}}`;
  assert.equal(source.split(before).length, 2, 'One executable pressed equality');
  const changed = source.replace(before, after); assert.notEqual(changed, source);
  assert.equal(changed.split(after).length, 2, 'One exact inverse equality');
  assert.equal(changed.replace(after, before), source, 'Whole inversion recovery'); return changed;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-report-category-pressed-state' && value.productAdopted === false, 'Fixed proof requires actual full original admission before product adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'admissionSha256', 'testSha256']) assert.match(value[key], /^[0-9a-f]{64}$/, `Original ${key}`);
  assert.equal(value.testSha256, TEST_SHA256, 'Original admission binds frozen six-case source');
  assert.deepEqual(value.sourceSha256, ORIGINAL_SHA256, 'Original admission binds exact whole original forms'); return value;
}
export function sourceForArm(plan, arm) {
  assert(['normal', 'whole-original', 'footer-omission', 'game-omission', 'footer-inverted', 'game-inverted', 'restored'].includes(arm), 'Known compiled category source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal', 'Baseline uses actual original forms only'); return { ...plan.originalForms }; }
  assertOriginalAdmission(plan);
  if (arm === 'whole-original') return { ...plan.originalForms };
  const result = { ...plan.fixedForms };
  const index = arm.startsWith('footer-') ? 0 : arm.startsWith('game-') ? 1 : -1;
  if (index !== -1) result[FORM_FILES[index]] = arm.endsWith('omission') ? changeCategory(result[FORM_FILES[index]], CATEGORY_HUNKS[index], 'inverse') : invertCategory(result[FORM_FILES[index]], CATEGORY_HUNKS[index]);
  if (arm === 'restored') for (const hunk of CATEGORY_HUNKS) result[hunk.file] = changeCategory(changeCategory(result[hunk.file], hunk, 'inverse'), hunk, 'forward');
  return result;
}
export function assertActualSources(plan, actualForms, arm = 'normal') {
  const expected = sourceForArm(plan, arm);
  assert.deepEqual(Object.keys(actualForms).sort(), [...FORM_FILES].sort(), 'Exact actual source membership');
  for (const file of FORM_FILES) assert.equal(actualForms[file], expected[file], `${file}: exact actual ${plan.mode}/${arm} source`);
}
export function assertEvidenceRoot(root, value) {
  assert(typeof value === 'string' && value.length > 0 && path.isAbsolute(value), 'Absolute category evidence path');
  const target = path.resolve(value), checkout = path.resolve(root);
  assert(target !== checkout && !target.startsWith(checkout + path.sep), 'Category evidence outside checkout');
  assert(!fs.existsSync(path.join(target, 'unit')), 'Fresh category unit output directory'); return value;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'REPORT_CATEGORY_MODE must be baseline or fixed');
  const originalForms = {}, fixedForms = {}, actualForms = {}, actualSha256 = {}, wholeInverse = [];
  for (const hunk of CATEGORY_HUNKS) {
    const read = spawnSync('git', ['show', `${BASE}:${hunk.file}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(read.error); assert.equal(read.status, 0, `Read admitted exact original ${hunk.file}`);
    const original = read.stdout; assert.equal(hash(original), ORIGINAL_SHA256[hunk.file], 'Exact whole Git original');
    const fixed = changeCategory(original, hunk, 'forward'), recovered = changeCategory(fixed, hunk, 'inverse');
    assert.equal(recovered, original, 'Whole original recovered');
    originalForms[hunk.file] = original; fixedForms[hunk.file] = fixed; actualForms[hunk.file] = fs.readFileSync(path.join(root, hunk.file), 'utf8'); actualSha256[hunk.file] = hash(actualForms[hunk.file]);
    wholeInverse.push({ ...hunk, originalSha256: hash(original), fixedSha256: hash(fixed), recoveredSha256: hash(recovered), forwardSha256: hash(changeCategory(recovered, hunk, 'forward')) });
  }
  const plan = { version: 1, mode, arm, originalAdmission: ORIGINAL_ADMISSION, originalForms, fixedForms, actualForms, actualSha256, originalSha256: ORIGINAL_SHA256, fixedSha256: FIXED_SHA256, wholeInverse };
  if (mode === 'fixed') assertOriginalAdmission(plan);
  assertActualSources(plan, actualForms, arm); return plan;
}
