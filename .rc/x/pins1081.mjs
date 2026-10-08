// Print the Round 1081 manifest's four source pins beside the hash of each file on this tree (LF text, as the harness takes it).
// With --write, move the pins that differ and print what moved.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const file = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const raw = fs.readFileSync(file, 'utf8');
const m = JSON.parse(raw);
const textHash = (f) => createHash('sha256').update(fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
let out = raw;
let moved = 0;
for (const [f, pinned] of Object.entries(m.unchangedSource)) {
  const now = textHash(f);
  console.log(`${now === pinned ? 'same ' : 'MOVED'} ${f}\n      pinned ${pinned}\n      now    ${now}`);
  if (now !== pinned) {
    if (out.split(pinned).length !== 2) throw new Error('the pinned hash is not in the manifest exactly once: ' + f);
    out = out.replace(pinned, now);
    moved += 1;
  }
}
if (process.argv.includes('--write') && moved) { fs.writeFileSync(file, out); console.log(`wrote ${moved} pins`); }
