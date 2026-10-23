// Round 1330 control for src/test/soccerCareerSaveFence.test.tsx: the page copy with the
// fenced save write replaced by a raw write (no fence), swapped in through NO_DOUBLE_SWAP.
// The test file must go red. Run from the repo root: node .rc/x/mutfence.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const page = readFileSync(path.join(root, 'src/pages/SoccerCareer.tsx'), 'utf8').replace(/\r\n/g, '\n');
const from = 'const saved = saveFence.write(SAVE_KEY, function saveCareer() {';
const to = "const saved = ((_key: string, write: () => boolean) => (write() ? 'written' : 'failed'))(SAVE_KEY, function saveCareer() {";
const n = page.split(from).length - 1;
console.log(`anchor count ${n}`);
if (n !== 1) { console.log('CONTROL ABORTED: anchor not found exactly once'); process.exit(3); }
const changed = page.replace(from, to);
if (changed === page) { console.log('CONTROL ABORTED: nothing changed'); process.exit(3); }
const dir = path.join(root, '.sim-control', 'fence-1330');
mkdirSync(dir, { recursive: true });
const copy = path.join(dir, 'SoccerCareer.tsx');
writeFileSync(copy, changed);
const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/soccerCareerSaveFence.test.tsx', '--testTimeout=120000'], {
  cwd: root, env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify({ '@/pages/SoccerCareer': copy }), FORCE_COLOR: '0' }, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024,
});
const out = (run.stdout || '') + (run.stderr || '');
console.log(out.split('\n').filter(l => /✓|×|FAIL|Tests |passed|failed/.test(l)).slice(-30).join('\n'));
if (/Failed to (resolve import|load)|Cannot find module|SyntaxError|Transform failed/.test(out)) { console.log('CONTROL ABORTED: the copy did not load'); process.exit(3); }
if (run.status === 0) { console.log('CONTROL DID NOT FIRE: the raw write passed every case'); process.exit(2); }
console.log(`CONTROL FIRED: the raw write turned the fence test red (vitest exit ${run.status})`);
process.exit(1);
