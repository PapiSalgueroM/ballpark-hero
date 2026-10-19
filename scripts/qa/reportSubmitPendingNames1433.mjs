import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const BASE = '26ea50a4d9c617436ded353e22640e064cfa2011';
export const ORIGINAL_ADMISSION = {"status":"PASS","scope":"full-original-report-submit-pending-names","productAdopted":false,"head":"f08fa8b688cd7a5d280f695cd57782df3ce7e713","commonSha256":"94a8005f40dc05be9e140102619c731b191b7a9a7c89d4b87ba046a3b6af97bb","featureSha256":"d089f4c745aab75d225b9406aae8212caedbe7e97104c62934c3a5006105f4ee","pixelSha256":"1bfa03ba968910051f8e22bebd02108f3381c35119e0d7711015709482b428db","admissionSha256":"19194bcf6f21fbd716ae5c051d2d165f1bac74c6dae98652774ee43ba16cd710","testSha256":"d8c33e52c1b7ce7b17381ca063e4dc68cf4ef15bbb053f10b9f23591c798386f","sourceSha256":{"src/components/game/ReportSiteIssue.tsx":"4e5c2049c07a2aa5154ba05f6d5ee973af549f9b09233f556fe8547efcf210ca","src/components/game/ReportQuestion.tsx":"02b8fd8654cd1fd36000f618c7cf9b49c337215607523f4b8a83420cc8a115fb"}};
export const TEST_SHA256 = 'd8c33e52c1b7ce7b17381ca063e4dc68cf4ef15bbb053f10b9f23591c798386f';
export const FORM_FILES = ['src/components/game/ReportSiteIssue.tsx', 'src/components/game/ReportQuestion.tsx'];
export const FORM_ALIASES = ['@/components/game/ReportSiteIssue', '@/components/game/ReportQuestion'];
export const LABELS = ['Send report', 'Submit Report'];
export const ORIGINAL_SHA256 = {
  [FORM_FILES[0]]: '4e5c2049c07a2aa5154ba05f6d5ee973af549f9b09233f556fe8547efcf210ca',
  [FORM_FILES[1]]: '02b8fd8654cd1fd36000f618c7cf9b49c337215607523f4b8a83420cc8a115fb',
};
export const FIXED_SHA256 = {
  [FORM_FILES[0]]: '5a089ec0872c0361429f0965433d993770fb162a8594028fcb6f38fcbe02fa49',
  [FORM_FILES[1]]: '83abbe8183400a9d95e6b91ffa0e758e0c9a0a3e159da2d3b4db30539e887b6c',
};
export const LABEL_HUNKS = FORM_FILES.map((file, index) => ({ file, label: LABELS[index],
  original: '                onClick={handleSubmit}\n',
  fixed: `                onClick={handleSubmit}\n                aria-label="${LABELS[index]}"\n`,
}));
export const CASE_NAMES = [
  'keeps the idle action named while empty and disabled',
  'keeps the action named while its captured relay is pending',
  'keeps the action named while its captured direct fallback is pending',
];
export const TITLES = ['footer report', 'game report'].flatMap(surface => CASE_NAMES.map(name => `${surface} submit names ${name}`));
export const ARM_FAULTS = { baseline: [1, 2, 4, 5], normal: [], bare: [], 'whole-original': [1, 2, 4, 5], 'footer-omission': [1, 2], 'game-omission': [4, 5], restored: [] };
export const hash = body => createHash('sha256').update(body).digest('hex');
export const LEGACY_BRIDGE = {
  original: "    const file = forms[spec.alias], fixed = sourceBefore[file].toString('utf8');\n    const hunks = [\n",
  fixed: [
    "    const file = forms[spec.alias], fixed = sourceBefore[file].toString('utf8');",
    '    const admitted = {',
    "      'src/components/game/ReportSiteIssue.tsx': '4e5c2049c07a2aa5154ba05f6d5ee973af549f9b09233f556fe8547efcf210ca',",
    "      'src/components/game/ReportQuestion.tsx': '02b8fd8654cd1fd36000f618c7cf9b49c337215607523f4b8a83420cc8a115fb',",
    '    };',
    "    const label = spec.alias === '@/components/game/ReportQuestion' ? 'Submit Report' : 'Send report';",
    "    const nameHunk = { name: 'pending action name', original: '                onClick={handleSubmit}\\n',",
    '      fixed: `                onClick={handleSubmit}\\n                aria-label="${label}"\\n` };',
    '    const withoutName = fixed.includes(nameHunk.fixed) ? fixed.replace(nameHunk.fixed, nameHunk.original) : fixed;',
    '    assert.equal(hash(withoutName), admitted[file], `${file}: exact admitted form after only the pending-name inverse`);',
    '    const hunks = [',
    '      ...(withoutName === fixed ? [] : [nameHunk]),',
    '',
  ].join('\n'),
};

export function changeLabel(source, hunk, direction) {
  assert(['forward', 'inverse'].includes(direction), 'Known label direction');
  const before = direction === 'forward' ? hunk.original : hunk.fixed;
  const after = direction === 'forward' ? hunk.fixed : hunk.original;
  assert.equal(source.split(before).length, 2, `${hunk.file}: exactly one ${direction} label anchor`);
  const expected = direction === 'forward' ? ORIGINAL_SHA256 : FIXED_SHA256;
  const resultExpected = direction === 'forward' ? FIXED_SHA256 : ORIGINAL_SHA256;
  assert.equal(hash(source), expected[hunk.file], `${hunk.file}: whole ${direction} input source`);
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, `${hunk.file}: label changes executable source`);
  assert.equal(hash(changed), resultExpected[hunk.file], `${hunk.file}: whole ${direction} result source`);
  return changed;
}

export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-report-submit-pending-names' && value.productAdopted === false,
    'Fixed proof requires actual full original admission before product adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'admissionSha256', 'testSha256']) assert.match(value[key], /^[0-9a-f]{64}$/, `Original ${key}`);
  assert.equal(value.testSha256, TEST_SHA256, 'Original admission binds the frozen six-case test');
  assert.deepEqual(value.sourceSha256, ORIGINAL_SHA256, 'Original admission binds both exact whole forms');
  return value;
}

export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'REPORT_PENDING_NAMES_MODE must be baseline or fixed');
  const originalForms = {}, fixedForms = {}, actualForms = {}, actualSha256 = {}, wholeInverse = [];
  for (const hunk of LABEL_HUNKS) {
    const read = spawnSync('git', ['show', `${BASE}:${hunk.file}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(read.error); assert.equal(read.status, 0, `Actual admitted original form ${hunk.file}`);
    const original = read.stdout;
    assert.equal(hash(original), ORIGINAL_SHA256[hunk.file], `${hunk.file}: admitted whole original bytes`);
    const fixed = changeLabel(original, hunk, 'forward');
    const recovered = changeLabel(fixed, hunk, 'inverse');
    assert.equal(recovered, original, `${hunk.file}: entire form inverse`);
    const actual = fs.readFileSync(path.join(root, hunk.file), 'utf8');
    originalForms[hunk.file] = original; fixedForms[hunk.file] = fixed; actualForms[hunk.file] = actual; actualSha256[hunk.file] = hash(actual);
    wholeInverse.push({ ...hunk, originalSha256: hash(original), fixedSha256: hash(fixed), recoveredSha256: hash(recovered), forwardSha256: hash(changeLabel(recovered, hunk, 'forward')) });
  }
  const plan = { version: 1, mode, arm, actualForms, originalForms, fixedForms, originalSha256: ORIGINAL_SHA256, fixedSha256: FIXED_SHA256, actualSha256,
    wholeInverse, originalAdmission: ORIGINAL_ADMISSION, labels: LABELS, formAliases: FORM_ALIASES, hunks: LABEL_HUNKS, arms: ARM_FAULTS };
  if (mode === 'fixed') assertOriginalAdmission(plan);
  const expected = sourceForArm(plan, arm);
  for (const file of FORM_FILES) assert.equal(actualForms[file], expected[file], `${file}: exact actual ${mode}/${arm} source`);
  return plan;
}

export function sourceForArm(plan, arm) {
  assert(['normal', 'footer-omission', 'game-omission', 'whole-original', 'restored'].includes(arm), 'Known compiled source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal', 'Baseline compiles only actual original forms'); return { ...plan.originalForms }; }
  assertOriginalAdmission(plan);
  if (arm === 'whole-original') return { ...plan.originalForms };
  const result = { ...plan.fixedForms };
  const index = arm === 'footer-omission' ? 0 : arm === 'game-omission' ? 1 : -1;
  if (index !== -1) result[FORM_FILES[index]] = changeLabel(result[FORM_FILES[index]], LABEL_HUNKS[index], 'inverse');
  if (arm === 'restored') for (const hunk of LABEL_HUNKS) result[hunk.file] = changeLabel(changeLabel(result[hunk.file], hunk, 'inverse'), hunk, 'forward');
  return result;
}
