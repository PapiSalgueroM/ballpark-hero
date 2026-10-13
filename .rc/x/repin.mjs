// Retake every unchangedSource hash of the Round 1081 manifest from the files as they stand (CRLF folded to LF,
// exactly as simManagerAppealIsolation's textHash reads them). Run from the repo root.
// Used IN PLACE only in a throwaway checkout on a runner (an intermediate proof), and once in the worktree after m5.
import fs from 'node:fs';
import crypto from 'node:crypto';
const F = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
let text = fs.readFileSync(F, 'utf8');
const manifest = JSON.parse(text);
for (const file of Object.keys(manifest.unchangedSource)) {
  const now = crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  const was = manifest.unchangedSource[file];
  const key = `"${file}": "${was}"`;
  if (text.split(key).length !== 2) { console.error(`entry for ${file} not found exactly once`); process.exit(1); }
  text = text.replace(key, `"${file}": "${now}"`);
  console.log(`${file}: ${was} -> ${now}${was === now ? ' (same)' : ''}`);
}
fs.writeFileSync(F, text);
