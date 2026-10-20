/* Fix-1514 re-record proof: replay the Round 1081 pin's own assertion (simManagerAppealIsolation.mjs line 142: the
   sha256 of each unchangedSource file's LF text equals the manifest's value) against a given manifest, on the tree
   as it stands. Exit 0 when every pinned file matches, 1 otherwise. Prints each file's verdict. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const manifestPath = process.argv[2];
const label = process.argv[3] || manifestPath;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let bad = 0;
for (const [file, sha] of Object.entries(manifest.unchangedSource)) {
  const got = createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  const same = got === sha;
  if (!same) bad += 1;
  console.log(`${label}: ${file} ${same ? 'matches' : 'differs'} (tree ${got.slice(0, 8)}, pin ${sha.slice(0, 8)})`);
}
console.log(`${label}: ${bad ? `${bad} pinned files differ` : 'every pinned file matches'}`);
process.exit(bad ? 1 : 0);
