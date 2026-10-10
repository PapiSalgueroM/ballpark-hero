// Round 1219 fix pass: one source mutation, checked by the unit file that should see it, then restored.
// Run from the repo root on a runner: node .rc/x/fxmut.mjs <name>
// Exit 1 and "KILLED" when the unit file went red, exit 0 and "SURVIVED" when it stayed green,
// exit 3 and "CANNOT RUN" when the text to change is not there exactly once.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const KEEPER = 'src/lib/saveKeeper.ts';
const MUTATIONS = {
  none: null,
  staleconst: [KEEPER, 'export const STAGED_FOR_MS = 5 * 60 * 1000;', 'export const STAGED_FOR_MS = 5 * 60 * 60 * 1000;'],
  noblocked: [KEEPER, "export function restoreNow(entry: ContinueSave, backupKey: string): { ok: true } | { ok: false; why: KeeperRefusal } {\n  if (getStorageTrouble() === 'blocked') return { ok: false, why: 'blocked' };\n", 'export function restoreNow(entry: ContinueSave, backupKey: string): { ok: true } | { ok: false; why: KeeperRefusal } {\n'],
  lateorder: [KEEPER, '  if (cur !== null && isStaged(cur)) {', "  if (now.getTime() - rec.at > STAGED_FOR_MS) return done(false, { why: 'stale' });\n  if (cur !== null && isStaged(cur)) {"],
  nodropcount: [KEEPER, 'try { storage.removeItem(k); dropped += 1; }', 'try { storage.removeItem(k); }'],
};
const name = process.argv[2] || '';
if (!(name in MUTATIONS)) { console.log(`MUT ${name}: CANNOT RUN (not a mutation this script knows)`); process.exit(3); }
const m = MUTATIONS[name];
let original = null;
if (m) {
  const [file, from, to] = m;
  original = fs.readFileSync(file, 'utf8');
  const lf = original.split('\r\n').join('\n');
  const hits = lf.split(from).length - 1;
  if (hits !== 1) { console.log(`MUT ${name}: CANNOT RUN (the text to change is in ${file} ${hits} time(s), want exactly 1)`); process.exit(3); }
  fs.writeFileSync(file, lf.replace(from, to));
}
const run = spawnSync('node_modules/.bin/vitest', ['run', 'src/test/saveKeeper.test.ts', '--testTimeout=300000', '--hookTimeout=120000'], { encoding: 'utf8' });
if (m) fs.writeFileSync(m[0], original);
const out = `${run.stdout || ''}${run.stderr || ''}`;
const failed = out.split('\n').filter(l => l.includes(' FAIL ') || l.includes('AssertionError')).slice(0, 6).map(l => l.trim().slice(0, 200));
for (const l of failed) console.log(`   ${l}`);
const red = run.status !== 0;
console.log(`MUT ${name}: ${red ? 'KILLED' : 'SURVIVED'} (vitest exit ${run.status})`);
process.exit(red ? 1 : 0);
