/* Round 1601 closing check: the installed.json receipt that .github/workflows/club-detail-current-roster.yml
   writes in its "Bind current main app and locked dependencies" step, copied so the walk can run on a remote check.
   Run from the repo root after npm ci, with CM_OWN_ROSTER_OUT set. Never committed. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const lock = JSON.parse(fs.readFileSync('package-lock.json'));
const rows = Object.entries(lock.packages).filter(([file]) => file.startsWith('node_modules/') && fs.existsSync(file + '/package.json')).map(([file, entry]) => {
  const bytes = fs.readFileSync(file + '/package.json'), version = JSON.parse(bytes).version; assert.equal(version, entry.version);
  return { file, version, sha256: createHash('sha256').update(bytes).digest('hex') };
});
fs.mkdirSync(process.env.CM_OWN_ROSTER_OUT, { recursive: true });
fs.writeFileSync(process.env.CM_OWN_ROSTER_OUT + '/installed.json', JSON.stringify(rows, null, 2));
console.log(`Bound ${rows.length} installed locked versions.`);
