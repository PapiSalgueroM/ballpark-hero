import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const BASE = 'f568e4f74c81ee930527fea28170a283324dd46b';
export const PRODUCT = 'src/components/soccer-grid/SoccerGridSearch.tsx';
export const ORIGINAL_SHA = 'fc4aa832904388a6363bb47e7a0f07cfb121f96d4a0cd2a8177665dd02f0d34e';
export const FIXED_SHA = '33e9b7ab8dcd37c6941fe30c867f71c3e2498fcd602b49325842a4c1d0e5c285';
export const TEST_FILE = 'src/test/soccerGridSearchAccessibility.test.tsx';
export const TEST_SHA = '6c7a7b2deabaf8dc08f7b03310fca77a2d5c376dee3f94cbd96d97aa6fe4407d';
export const ORIGINAL_ADMISSION = {"scope":"full-original-grid-search-accessibility","head":"3c07f698e71244b1ac3741967bdfca4424b46edd","originalSourceSha256":"fc4aa832904388a6363bb47e7a0f07cfb121f96d4a0cd2a8177665dd02f0d34e","testSha256":"6c7a7b2deabaf8dc08f7b03310fca77a2d5c376dee3f94cbd96d97aa6fe4407d","commonSha256":"996bfa3bccccb3f448901b80632ec2debd0b562de7a48ca177c334b33fe8861c","featureSha256":"ec640892c75676aa60e762803c3d4f19517cdbd42808dfaf9f601dffe7a93642","pixelSha256":"9ceb56767acce6e7c720de318aa65c318e46b4f52f19e5d125064c79fb55bf5a","fullAdmissionSha256":"24f993f7f4fb51aac5b18834581cf4b25adbe44445a4f27d40d5dd31e02d9cc4"};
export const hash = body => createHash('sha256').update(body).digest('hex');
export const git = (root, args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
export const OLD_ENTRIES = ['scripts/simSoccerGridBlurOwnership.mjs', 'scripts/simSoccerGridSearchDiscovery.mjs'];
export const ENTRY_PREFIX = "/* Round1432: exact historical default compatibility. Original body follows unchanged. */\nif (await (await import('./qa/gridSearchCompatibility1432.mjs')).dispatchHistorical1432(import.meta.url)) {\n  process.exit(0);\n}\n";
export const HUNKS = [
  {
    "name": "stable namespace import",
    "original": "import { useState, useRef, useEffect, useCallback } from 'react';",
    "fixed": "import { useState, useRef, useEffect, useCallback, useId } from 'react';"
  },
  {
    "name": "instance namespace",
    "original": "  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);",
    "fixed": "  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);\n  const searchId = useId();"
  },
  {
    "name": "rendered popup relation",
    "original": "        .slice(0, 8)\n    : [];",
    "fixed": "        .slice(0, 8)\n    : [];\n  const popupOpen = showDropdown && suggestions.length > 0;\n  const activeOptionId = popupOpen && highlightIndex >= 0 && highlightIndex < suggestions.length\n    ? `${searchId}-option-${highlightIndex}` : undefined;"
  },
  {
    "name": "input semantics",
    "original": "          aria-label=\"Search for a player\"",
    "fixed": "          aria-label=\"Search for a player\"\n          role=\"combobox\"\n          aria-autocomplete=\"list\"\n          aria-expanded={popupOpen}\n          aria-controls={popupOpen ? `${searchId}-listbox` : undefined}\n          aria-activedescendant={activeOptionId}"
  },
  {
    "name": "rendered list semantics",
    "original": "        {showDropdown && suggestions.length > 0 && (\n          <ul\n            ref={listRef}",
    "fixed": "        {popupOpen && (\n          <ul\n            id={`${searchId}-listbox`}\n            role=\"listbox\"\n            aria-label=\"Player suggestions\"\n            ref={listRef}"
  },
  {
    "name": "option semantics",
    "original": "                key={p.name}\n                onMouseDown",
    "fixed": "                key={p.name}\n                id={`${searchId}-option-${i}`}\n                role=\"option\"\n                aria-selected={i === highlightIndex}\n                onMouseDown"
  }
];
export const CONTROLS = [
  {
    "name": "role-control",
    "before": "          role=\"combobox\"",
    "after": "          role=\"textbox\"",
    "faults": [
      0
    ]
  },
  {
    "name": "active-control",
    "before": "          aria-activedescendant={activeOptionId}",
    "after": "          aria-activedescendant={undefined}",
    "faults": [
      2
    ]
  },
  {
    "name": "selected-control",
    "before": "                aria-selected={i === highlightIndex}",
    "after": "                aria-selected={false}",
    "faults": [
      3
    ]
  },
  {
    "name": "stale-active-control",
    "before": "  const activeOptionId = popupOpen && highlightIndex >= 0 && highlightIndex < suggestions.length",
    "after": "  const activeOptionId = suggestions.length > 0 && highlightIndex >= 0 && highlightIndex < suggestions.length",
    "faults": [
      4
    ]
  }
];
export const TITLES = [
  "exposes the existing named input as a collapsed list autocomplete",
  "connects its rendered canonical list to the expanded input",
  "moves its valid active option while retaining native input focus",
  "marks only the current rendered option as selected",
  "clears the active relation when Escape removes the popup",
  "keeps canonical and manual callbacks exactly once",
  "gives simultaneous mounted searches separate stable namespaces",
  "omits an active relation when no canonical result exists"
];

export const PURPOSES = [
  'The real focused Search input must expose its combobox role',
  'An expanded Search must reference its actual rendered canonical list',
  'Search must reference the currently highlighted mounted canonical option',
  'Exactly the highlighted canonical option must expose selected state',
  'A closed Search must not retain an active option ID for an unmounted popup',
  null, 'Simultaneous Search lists must have separate nonempty stable ID namespaces', null,
];
export const ORIGINAL_FAULTS = [0, 1, 2, 3, 6];
export const ARMS = ['normal', 'whole-original', 'role-control', 'active-control', 'selected-control', 'stale-active-control', 'restored'];
export function once(body, before, after) {
  assert.equal(body.split(before).length, 2, 'One exact executable source anchor');
  const changed = body.replace(before, after); assert.notEqual(changed, body); return changed;
}
export function refuse(body, before, after) {
  const altered = before.replace(/\S/, '#'); assert.notEqual(altered, before);
  for (const candidate of [body.replace(before, ''), body.replace(before, altered), body + '\n' + before]) {
    assert.throws(() => once(candidate, before, after), /One exact executable source anchor/);
  }
}
export function sourcePlan() {
  return { base: BASE, file: PRODUCT, originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA, hunks: HUNKS, controls: CONTROLS };
}
export function sourceForArm(original, arm) {
  assert.equal(hash(original), ORIGINAL_SHA); assert(ARMS.includes(arm));
  let fixed = original;
  for (const hunk of HUNKS) { refuse(fixed, hunk.original, hunk.fixed); fixed = once(fixed, hunk.original, hunk.fixed); }
  assert.equal(hash(fixed), FIXED_SHA);
  let inverse = fixed;
  for (const hunk of [...HUNKS].reverse()) { refuse(inverse, hunk.fixed, hunk.original); inverse = once(inverse, hunk.fixed, hunk.original); }
  assert.equal(inverse, original, 'Entire semantic inverse restores sealed1430 Search');
  if (arm === 'whole-original') return original;
  const control = CONTROLS.find(row => row.name === arm);
  if (!control) return fixed;
  refuse(fixed, control.before, control.after); const changed = once(fixed, control.before, control.after);
  assert.equal(once(changed, control.after, control.before), fixed, 'Entire control inverse');
  return changed;
}
export function readPlan(root, mode, arm = 'normal') {
  assert(['baseline', 'fixed'].includes(mode)); assert(ARMS.includes(arm));
  const original = git(root, ['show', BASE + ':' + PRODUCT]).toString('utf8');
  assert.equal(hash(original), ORIGINAL_SHA);
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8');
  assert.equal(actual, mode === 'baseline' ? original : sourceForArm(original, arm), 'Only exact declared Search source arm');
  if (mode === 'baseline') assert.equal(arm, 'normal');
  return { ...sourcePlan(), original, actual, actualSha256: hash(actual), arm, mode };
}
export function oldBody(root, file) {
  assert(OLD_ENTRIES.includes(file)); return git(root, ['show', BASE + ':' + file]);
}
export function assertEntryPrefixes(root) {
  for (const file of OLD_ENTRIES) {
    const old = oldBody(root, file), actual = fs.readFileSync(path.join(root, file));
    assert(actual.equals(Buffer.concat([Buffer.from(ENTRY_PREFIX), old])), 'Only exact prefix precedes complete unchanged old entry: ' + file);
  }
}
export const ROLE_TESTS = [
  { name: 'blur8', file: 'src/test/soccerGridBlurOwnership.test.tsx', sha256: '0a729c297dfd40fca179de9d7876ff53387602702f95ba49c5398c94602a8ba3', count: 8, edits: 4, traceEnv: 'SOCCER_GRID_BLUR_TRACE_DIR' },
  { name: 'discovery16', file: 'src/test/soccerGridSearchDiscovery.test.tsx', sha256: '410176fc8d41f755a63b6d6bdc0c310e3056e8c50ad50bb5f7f8ff5599ccdb52', count: 16, edits: 3, traceEnv: 'SOCCER_GRID_SEARCH_TRACE_DIR' },
];
export function roleTestCopy(body, spec, role) {
  assert.equal(hash(body), spec.sha256); assert(['textbox', 'combobox'].includes(role));
  const lines = body.split('\n').filter(line => line.includes("ByRole('textbox', { name: 'Search for a player' }"));
  assert.equal(lines.length, spec.edits);
  let copied = body; const adapters = [];
  if (role === 'combobox') for (const before of lines) {
    const after = before.replace("ByRole('textbox'", "ByRole('combobox'");
    copied = once(copied, before, after); adapters.push({ before, after });
  }
  let recovered = copied;
  for (const adapter of [...adapters].reverse()) recovered = once(recovered, adapter.after, adapter.before);
  assert.equal(recovered, body, 'Every case, assertion and trace is held outside exact role selectors');
  return { body: copied, originalSha256: hash(body), copiedSha256: hash(copied), recoveredSha256: hash(recovered), adapters };
}
export function trackedSnapshot(root) {
  return { members: git(root, ['ls-files', '-z']), status: git(root, ['status', '--porcelain=v1', '--untracked-files=all']),
    files: git(root, ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean).map(file => ({ file, sha256: hash(fs.readFileSync(path.join(root, file))) })) };
}
export function assertSnapshot(root, before) {
  assert(before.members.equals(git(root, ['ls-files', '-z']))); assert(before.status.equals(git(root, ['status', '--porcelain=v1', '--untracked-files=all'])));
  for (const row of before.files) assert.equal(hash(fs.readFileSync(path.join(root, row.file))), row.sha256, 'Tracked source held: ' + row.file);
}
