// Round 1502 fixer: the Round 1081 pins, as simManagerAppealIsolation hashes them (LF sha256), at the working
// tree, at c9d57690 (the builder's retake) and as the manifest records them. Prints one line a pin.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const hash = t => createHash('sha256').update(t.replaceAll('\r\n', '\n')).digest('hex');
const manifest = JSON.parse(fs.readFileSync('scripts/fixtures/managerAppealIsolation1081/manifest.json', 'utf8'));
const at = (ref, file) => { try { return hash(execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 28 })); } catch { return 'missing'; } };
for (const [file, pinned] of Object.entries(manifest.unchangedSource)) {
  const tree = hash(fs.readFileSync(file, 'utf8'));
  const old = at('c9d57690', file);
  const base = at('d8aaa4cb', file);
  console.log(`${file}: pinned ${pinned.slice(0, 12)} tree ${tree.slice(0, 12)} c9d57690 ${old.slice(0, 12)} base ${base.slice(0, 12)} | tree=pin ${tree === pinned} c9d57690=pin ${old === pinned} base=pin ${base === pinned}`);
}
console.log(`full tree hash of src/lib/clubManager.ts: ${hash(fs.readFileSync('src/lib/clubManager.ts', 'utf8'))}`);
