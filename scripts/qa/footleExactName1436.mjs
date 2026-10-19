import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const BASE = '868aa8e002487e8aa1e4400e5e64046c4884c0c7';
export const PRODUCT = 'src/components/game/PlayerSearch.tsx';
export const TEST_FILE = 'src/test/footleExactNamePriority.test.tsx';
export const OLD_TEST = 'src/test/playerSearchKeyboard.test.tsx';
export const OLD_CLI = 'scripts/simPlayerSearchKeyboard.mjs';
export const TEST_SHA = '0eb57b4a819648ef07b428ecd7d6f2e1682b12f1d3dd696702080856e817da59';
export const ORIGINAL_SHA = 'da9d99412892c233e14b3b1ee52fedfa4c2ce2f51706262056c8311417b66ced';
export const FIXED_SHA = '07abdee59dca81f053c3a87de269709a08d97859560916711fcac9df70486dbe';
export const ORIGINAL_ADMISSION = null;
export const HUNK = {
  "original": "    if (!query.trim() || query.trim().length < 2) return [];\n    return players\n      .filter(p => !guessedNames.some(g => g.toLowerCase() === p.name.toLowerCase()))\n      .filter(p => smartMatch(p.name, query))\n      .sort((a, b) => smartScore(a.name, query) - smartScore(b.name, query))\n      .slice(0, 10);",
  "fixed": "    if (!query.trim() || query.trim().length < 2) return [];\n    const nameKey = (value: string) => value.toLowerCase().split(/\\s+/).filter(Boolean).join(' ');\n    const queryKey = nameKey(query);\n    return players\n      .filter(p => !guessedNames.some(g => g.toLowerCase() === p.name.toLowerCase()))\n      .filter(p => smartMatch(p.name, query))\n      .sort((a, b) => Number(nameKey(b.name) === queryKey) - Number(nameKey(a.name) === queryKey)\n        || smartScore(a.name, query) - smartScore(b.name, query))\n      .slice(0, 10);"
};
export const TITLES = [
  'selects the exact canonical tail after ten equal-score superstrings',
  'selects the exact tail with case and repeated query whitespace',
  'keeps equivalent exact order and selects its second canonical Player',
  'preserves nonexact smartScore order incoming ties cap and bounded arrows',
  'excludes guessed exact names with the existing case-only comparison',
  'keeps an already first exact pointer selection and original object identity',
  'keeps hidden Enter inert and deliberately reopens before canonical Enter',
  'keeps blank one-character and unmatched queries inert'
];
export const PURPOSE = 'Visible Enter must choose the stable exact Footle Player';
export const PURPOSE_LINE = 56;
export const FAULTS = [0, 1, 2];
export const ARMS = ['normal', 'removed-priority', 'restored'];
export const RESULT_KIND = 'FOOTLE_EXACT_NAME_RESULT';
export const DEFAULT_PREFIX = 'footle-exact-name-evidence-';
export const OLD_CONTROLS = {
  normal: null,
  hidden: ["e.key === 'Enter' && isOpen && filtered[highlightIndex]", "e.key === 'Enter' && filtered[highlightIndex]", 1, [3]],
  reopen: ['      if (!isOpen) {\n        setIsOpen(true);\n        return;\n      }', '      if (!isOpen) return;', 2, [4, 5]],
  active: ['`${listId}-option-${highlightIndex}`', '`${listId}-option-0`', 1, [11]],
  selected: ['aria-selected={idx === highlightIndex}', 'aria-selected={false}', 1, [11]],
  callback: ['    onSelect(player);', '    onSelect(player);\n    onSelect(player);', 1, [0, 1, 2, 4, 5, 8, 9, 10]]
};
export function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
export function git(root, args) {
  const child = spawnSync('git', ['--no-optional-locks', '-C', root, ...args], { encoding: null, maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0, child.stderr?.toString()); return child.stdout;
}
export function changePriority(body, direction) {
  assert(['forward', 'inverse'].includes(direction));
  const before = direction === 'forward' ? HUNK.original : HUNK.fixed;
  const after = direction === 'forward' ? HUNK.fixed : HUNK.original;
  assert.equal(body.split(before).length - 1, 1, 'One literal priority hunk');
  assert.equal(hash(body), direction === 'forward' ? ORIGINAL_SHA : FIXED_SHA, 'Whole known priority input');
  const result = body.replace(before, after);
  assert.equal(hash(result), direction === 'forward' ? FIXED_SHA : ORIGINAL_SHA, 'Whole known priority result'); return result;
}
export function assertOriginalAdmission(plan) {
  const value = plan.originalAdmission;
  assert(value && value.status === 'PASS' && value.scope === 'full-original-footle-exact-name-priority' && value.productAdopted === false,
    'Fixed Footle proof requires full actual original admission before adoption');
  assert.match(value.head, /^[0-9a-f]{40}$/); assert.equal(value.sourceSha256, ORIGINAL_SHA); assert.equal(value.testSha256, TEST_SHA);
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'fullAdmissionSha256']) assert.match(value[key], /^[0-9a-f]{64}$/);
  return value;
}
export function sourceForArm(plan, arm) {
  assert(ARMS.includes(arm), 'Known Footle source arm');
  if (plan.mode === 'baseline') { assert.equal(arm, 'normal'); return plan.original; }
  assertOriginalAdmission(plan);
  if (arm === 'removed-priority') return changePriority(plan.fixed, 'inverse');
  if (arm === 'restored') return changePriority(changePriority(plan.fixed, 'inverse'), 'forward');
  return plan.fixed;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode), 'FOOTLE_EXACT_MODE must be baseline or fixed');
  const original = git(root, ['show', BASE + ':' + PRODUCT]).toString('utf8'); assert.equal(hash(original), ORIGINAL_SHA);
  const fixed = changePriority(original, 'forward'); assert.equal(changePriority(fixed, 'inverse'), original, 'Whole priority inverse');
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8');
  const plan = { version: 1, mode, arm, original, fixed, actual, originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA,
    actualSha256: hash(actual), hunk: HUNK, originalAdmission: ORIGINAL_ADMISSION };
  assert.equal(actual, sourceForArm(plan, arm), 'Only exact declared actual Footle source'); return plan;
}
export function snapshot(root) {
  const names = git(root, ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean).sort();
  return names.map(file => { const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, sha256: hash(bytes) }; });
}
export function evidenceTree(root) {
  const rows = []; const walk = (dir, prefix) => { for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix + item.name; assert(!item.isSymbolicLink(), 'No copied packet symlink');
    if (item.isDirectory()) { rows.push({ file: rel + '/', directory: true }); walk(path.join(dir, item.name), rel + '/'); }
    else { assert(item.isFile()); const bytes = fs.readFileSync(path.join(dir, item.name)); rows.push({ file: rel, directory: false, bytes: bytes.length, sha256: hash(bytes) }); }
  } }; walk(root, ''); return rows;
}