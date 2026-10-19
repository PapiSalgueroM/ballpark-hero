import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const BASE = '3ead1aa0f0a22a9341d66b911f007c7a58dc653b';
export const ORIGINAL_ADMISSION = {"status":"PASS","scope":"full-original-report-error-alerts","head":"9b82462acc2b09d6dda192bf2a61ee470805c535","productAdopted":false,"commonSha256":"156206a68270743d16a5edaf2e2c718389c48914a97e48192b7d313f3b8e1e76","featureSha256":"1ee0576bbc000cda11e04712fe75b5812ab94ad060f4d0366ee179e9f31c3a37","pixelSha256":"a9f7aed58aee43b10eccbe99e9ab15fcd299bcc40e3b3c0bb71e98eb08e45a2c","admissionSha256":"30b6829339a8703e57cbf96cc07b223ad67cc36d0ac7087fc9627edab852b171","testSha256":"2c297e0c6cd189706efa090832910134bf4ff5d5ebcfcdbae9528f59e95354af","sourceSha256":{"src/components/game/ReportSiteIssue.tsx":"700cc63a32be7eb53edc555eef582e332d26c5e906e75d785b3dd163934732c6","src/components/game/ReportQuestion.tsx":"f16ca016c5a96b56d554490c1eb0516ee91cf9d0a3f84589173356e91e311dc6"}};
export const TEST_SHA256 = '2c297e0c6cd189706efa090832910134bf4ff5d5ebcfcdbae9528f59e95354af';
export const FORM_FILES = ['src/components/game/ReportSiteIssue.tsx', 'src/components/game/ReportQuestion.tsx'];
export const FORM_ALIASES = ['@/components/game/ReportSiteIssue', '@/components/game/ReportQuestion'];
export const ORIGINAL_SHA256 = {
  [FORM_FILES[0]]: '700cc63a32be7eb53edc555eef582e332d26c5e906e75d785b3dd163934732c6',
  [FORM_FILES[1]]: 'f16ca016c5a96b56d554490c1eb0516ee91cf9d0a3f84589173356e91e311dc6',
};
export const FIXED_SHA256 = {
  [FORM_FILES[0]]: 'd1a02f559619ee131591c6daa563a22f3656b54f80b32ab6ba2fea23c2d943f2',
  [FORM_FILES[1]]: '7269ff226951874e2c64f04ae959a2dd39c870b5b803162b9c8515390bfcc2fa',
};
export const ERROR_TEXT = 'Something went wrong. Try again.';
export const ALERT_HUNKS = FORM_FILES.map(file => ({ file,
  original: '<p className="text-xs text-destructive">Something went wrong. Try again.</p>',
  fixed: '<p role="alert" className="text-xs text-destructive">Something went wrong. Try again.</p>',
}));
export const CATEGORY_NAMES = [
  ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Other'],
  ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Duplicate question', 'Other'],
];
export const CASE_NAMES = [
  'keeps a successful optional-category draft free of error alerts through reset',
  'exposes the current async failure while no-op choice holds and editing enables retry',
  'ignores stale failure then exposes the newer failure before close reopen and retry',
];
export const TITLES = ['footer report', 'game report'].flatMap(surface => CASE_NAMES.map(name => `${surface} error alerts ${name}`));
export const ARM_FAULTS = { baseline: [1, 2, 4, 5], normal: [], bare: [], 'whole-original': [1, 2, 4, 5], 'footer-omission': [1, 2], 'game-omission': [4, 5], 'footer-status': [1, 2], 'game-status': [4, 5], restored: [] };
export const hash = body => createHash('sha256').update(body).digest('hex');
export function changeAlert(source, hunk, direction) {
  assert(['forward', 'inverse'].includes(direction), 'Known error role direction');
  const before = direction === 'forward' ? hunk.original : hunk.fixed, after = direction === 'forward' ? hunk.fixed : hunk.original;
  assert.equal(source.split(before).length, 2, `${hunk.file}: exactly one ${direction} error paragraph anchor`);
  assert.equal(hash(source), (direction === 'forward' ? ORIGINAL_SHA256 : FIXED_SHA256)[hunk.file], `${hunk.file}: whole ${direction} input source`);
  const changed = source.replace(before, after); assert.notEqual(changed, source, 'Executable error role source changes');
  assert.equal(hash(changed), (direction === 'forward' ? FIXED_SHA256 : ORIGINAL_SHA256)[hunk.file], `${hunk.file}: whole ${direction} result source`); return changed;
}
export function wrongAlertRole(source, hunk) {
  assert.equal(hash(source), FIXED_SHA256[hunk.file], 'Whole wrong-role control input source');
  assert.equal(source.split(hunk.fixed).length, 2, 'One exact alert paragraph');
  const wrong = hunk.fixed.replace('role="alert"', 'role="status"'), changed = source.replace(hunk.fixed, wrong);
  assert.notEqual(changed, source); assert.equal(changed.split(wrong).length, 2); assert.equal(changed.replace(wrong, hunk.fixed), source, 'Whole wrong-role control inverse'); return changed;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-report-error-alerts' && value.productAdopted === false, 'Fixed proof requires actual full original admission before product adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'admissionSha256', 'testSha256']) assert.match(value[key], /^[0-9a-f]{64}$/, `Original ${key}`);
  assert.equal(value.testSha256, TEST_SHA256, 'Original admission binds frozen six-case source'); assert.deepEqual(value.sourceSha256, ORIGINAL_SHA256, 'Original admission binds exact whole original forms'); return value;
}
export function sourceForArm(plan, arm) {
  assert(['normal', 'whole-original', 'footer-omission', 'game-omission', 'footer-status', 'game-status', 'restored'].includes(arm), 'Known compiled error source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal', 'Baseline uses actual original forms only'); return { ...plan.originalForms }; }
  assertOriginalAdmission(plan); if (arm === 'whole-original') return { ...plan.originalForms };
  const result = { ...plan.fixedForms }, index = arm.startsWith('footer-') ? 0 : arm.startsWith('game-') ? 1 : -1;
  if (index !== -1) result[FORM_FILES[index]] = arm.endsWith('omission') ? changeAlert(result[FORM_FILES[index]], ALERT_HUNKS[index], 'inverse') : wrongAlertRole(result[FORM_FILES[index]], ALERT_HUNKS[index]);
  if (arm === 'restored') for (const hunk of ALERT_HUNKS) result[hunk.file] = changeAlert(changeAlert(result[hunk.file], hunk, 'inverse'), hunk, 'forward'); return result;
}
export function assertActualSources(plan, actualForms, arm = 'normal') {
  const expected = sourceForArm(plan, arm); assert.deepEqual(Object.keys(actualForms).sort(), [...FORM_FILES].sort(), 'Exact actual form source membership');
  for (const file of FORM_FILES) assert.equal(actualForms[file], expected[file], `${file}: exact actual ${plan.mode}/${arm} source`);
}
export function assertEvidenceRoot(root, value) {
  assert(typeof value === 'string' && value.length > 0 && path.isAbsolute(value), 'Absolute error evidence path');
  const target = path.resolve(value), checkout = path.resolve(root); assert(target !== checkout && !target.startsWith(checkout + path.sep), 'Error evidence outside checkout');
  assert(!fs.existsSync(path.join(target, 'unit')), 'Fresh error unit output directory'); return value;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'REPORT_ERROR_MODE must be baseline or fixed');
  const originalForms = {}, fixedForms = {}, actualForms = {}, actualSha256 = {}, wholeInverse = [];
  for (const hunk of ALERT_HUNKS) {
    const read = spawnSync('git', ['show', `${BASE}:${hunk.file}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(read.error); assert.equal(read.status, 0, `Read admitted exact original ${hunk.file}`);
    const original = read.stdout; assert.equal(hash(original), ORIGINAL_SHA256[hunk.file], 'Exact whole Git original');
    const fixed = changeAlert(original, hunk, 'forward'), recovered = changeAlert(fixed, hunk, 'inverse'); assert.equal(recovered, original, 'Whole original recovered');
    originalForms[hunk.file] = original; fixedForms[hunk.file] = fixed; actualForms[hunk.file] = fs.readFileSync(path.join(root, hunk.file), 'utf8'); actualSha256[hunk.file] = hash(actualForms[hunk.file]);
    wholeInverse.push({ ...hunk, originalSha256: hash(original), fixedSha256: hash(fixed), recoveredSha256: hash(recovered), forwardSha256: hash(changeAlert(recovered, hunk, 'forward')) });
  }
  const plan = { version: 1, mode, arm, originalAdmission: ORIGINAL_ADMISSION, originalForms, fixedForms, actualForms, actualSha256, originalSha256: ORIGINAL_SHA256, fixedSha256: FIXED_SHA256, wholeInverse };
  if (mode === 'fixed') assertOriginalAdmission(plan); assertActualSources(plan, actualForms, arm); return plan;
}
