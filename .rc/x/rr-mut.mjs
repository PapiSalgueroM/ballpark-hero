/* Reviewer's mutation run for Round 1144. Runs on the remote check runner from the repo root.
   Each mutation edits ONE source file in place (needle must be there exactly once), runs the
   round's unit tests and its two static sims, records what went red, and restores the file. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT = process.env.RC_OUT || '.';
const TESTS = [
  'src/test/safeStorage.test.ts', 'src/test/storageNoticeFollows.test.tsx', 'src/test/freshBuildBlockedStorage.test.ts',
  'src/test/freshBuildOptionalChunk.test.ts', 'src/test/toastClearsCookieBanner.test.tsx', 'src/test/usSeasonCentreEntry.test.tsx',
  'src/test/usCareerSaveRetry.test.tsx', 'src/test/cookieConsentStorage.test.tsx', 'src/test/storageBlockedBoot.test.tsx',
];
const SS = 'src/lib/safeStorage.ts';
const FB = 'src/lib/freshBuild.ts';
const SN = 'src/components/StorageNotice.tsx';
const SO = 'src/components/ui/sonner.tsx';
const UB = 'src/components/us-career/UsCareerBoard.tsx';
const UH = 'src/components/us-career/season/UsSeasonCentreHost.tsx';
const M = [
  ['baseline', null, '', ''],
  ['m01-seam-accept-does-not-unlearn', SS, 'const noteAcceptedWrite = (): void => setRefusedWrite(false);', 'const noteAcceptedWrite = (): void => { /* mutated */ };'],
  ['m02-safeSetItem-does-not-unlearn', SS, '    setRefusedWrite(false);\n    return true;', '    return true;'],
  ['m03-recheck-unlearns-on-refusal', SS, '    } catch { /* still full */ }', '    } catch { setRefusedWrite(false); }'],
  ['m04-settle-counts-last-only', SS, '    if (!saved) settled = false;', '    settled = saved;'],
  ['m05-settle-throw-counts-saved', SS, '    try { saved = retry(); } catch { saved = false; }', '    try { saved = retry(); } catch { saved = true; }'],
  ['m06-newbuild-check-not-held', FB, '    if (!settlePendingSaves()) return;\n', ''],
  ['m07-tile-reload-not-held-in-lib', FB, '  if (!settlePendingSaves()) return false;\n  window.location.reload();', '  window.location.reload();'],
  ['m08-no-recheck-after-click', SN, "    window.addEventListener('click', ask, true);\n", ''],
  ['m09-no-recheck-on-tab-return', SN, "    document.addEventListener('visibilitychange', back);\n", ''],
  ['m10-no-spacer-page-jumps', SN, '  const says = trouble ?? shown.current?.trouble ?? null;', '  const says = trouble ?? null;'],
  ['m11-toast-gap-sign', SO, '`${banner + BANNER_GAP}px`', '`${banner - BANNER_GAP}px`'],
  ['m12-no-desktop-offset', SO, '      offset={clear ? { bottom: clear } : undefined}\n', ''],
  ['m13-banner-mark-not-watched', SO, '    pending.observe(document.body, { attributes: true, attributeFilter: ["data-consent-pending"] });\n', ''],
  ['m14-board-hold-always-settled', UB, 'return holdPendingSave(() => { retrySave(); return pendingSave.current === null; });', 'return holdPendingSave(() => { retrySave(); return true; });'],
  ['m15-toast-press-closes-toast', UB, 'onClick: event => { event.preventDefault(); retrySave(); }', 'onClick: () => { retrySave(); }'],
  ['m16-toast-four-seconds', UB, '      duration: SAVE_TOAST_MS,\n', ''],
  ['m17-tile-does-not-ask', UH, '    if (!settlePendingSaves()) { setHeld(true); return; }\n', ''],
  ['m18-recheck-in-ordinary-browser', SS, '  if (refusedWrite && !raw && local.real) {', '  if (!raw && local.real) {'],
  ['m19-mobile-offset-ignores-banner', SO, 'mobileOffset={{ bottom: clear ? `max(${RESTING}, ${clear})` : RESTING }}', 'mobileOffset={{ bottom: RESTING }}'],
];
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
};
const results = [];
for (const [name, file, from, to] of M) {
  let orig = null;
  const row = { name, file };
  if (file) {
    orig = fs.readFileSync(file, 'utf8');
    const n = orig.split(from).length - 1;
    if (n !== 1) { row.refused = `needle appears ${n} times`; results.push(row); console.log(`${name}: REFUSED (${row.refused})`); continue; }
    fs.writeFileSync(file, orig.replace(from, to));
  }
  try {
    const v = run('node_modules/.bin/vitest', ['run', ...TESTS, '--testTimeout=300000', '--hookTimeout=120000']);
    const clean = v.out.replace(/\u001b\[[0-9;]*m/g, '');
    row.vitest = v.code;
    row.failedFiles = [...new Set((clean.match(/FAIL\s+\S+/g) ?? []).map(s => s.replace(/FAIL\s+/, '')))];
    row.failedTests = (clean.match(/^\s*(?:×|✗|FAIL)\s.*$/gm) ?? []).slice(0, 12).map(s => s.trim().slice(0, 200));
    row.summary = (clean.match(/^\s*Tests\s+.*$/m) ?? [''])[0].trim();
    const a = run('node', ['scripts/simStorageWrites.mjs']);
    row.ssw = a.code;
    const b = run('node', ['scripts/simStaleChunk.mjs']);
    row.stale = b.code;
    if (name !== 'baseline') fs.writeFileSync(path.join(OUT, `${name}.log`), clean.slice(-6000));
  } finally {
    if (file && orig !== null) fs.writeFileSync(file, orig);
  }
  const caught = row.vitest !== 0 || row.ssw !== 0 || row.stale !== 0;
  row.caught = caught;
  results.push(row);
  console.log(`${name}: vitest=${row.vitest} ssw=${row.ssw} stale=${row.stale} ${name === 'baseline' ? '' : caught ? 'CAUGHT' : 'SURVIVED'} | ${row.summary} | ${row.failedFiles.join(', ')}`);
}
fs.writeFileSync(path.join(OUT, 'mut.json'), JSON.stringify(results, null, 1));
const dirty = run('git', ['status', '--porcelain', '--untracked-files=no']).out.trim();
console.log(`tree after: ${dirty ? dirty : 'clean'}`);
const survived = results.filter(r => r.name !== 'baseline' && r.caught === false).map(r => r.name);
console.log(`rr-mut: ${results.length - 1} mutations, ${survived.length} survived the unit tests and static sims${survived.length ? `: ${survived.join(', ')}` : ''}`);
