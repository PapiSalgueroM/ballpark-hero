/* Round 1569 (never committed): record the US board fixture with the SAME historical coaching panel the
   replay uses (scripts/simUsBoardParity.mjs, Round 1424), so only this round's changes move.
   Usage: node .rc/x/rec1569.mjs <out.json> <sha> */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { stripNflStaffRecoveryPanelHunks } from '../../scripts/lib/usNflStaffRecoveryHunks.mjs';

const ROOT = process.cwd();
const [out, sha] = process.argv.slice(2);
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec1569-'));
const panel = path.join(tmp, 'CoachCareerPanel.historical.tsx');
fs.writeFileSync(panel, stripNflStaffRecoveryPanelHunks(read(path.join(ROOT, 'src/components/us-career/CoachCareerPanel.tsx'))));
const req = createRequire(path.join(ROOT, 'package.json'));
const aliases = {
  ...Object.fromEntries(['react/jsx-dev-runtime', 'react/jsx-runtime', 'react', 'lucide-react'].map(id => [id, req.resolve(id)])),
  '@/components/us-career/CoachCareerPanel': panel,
};
const VITEST = path.join(path.dirname(req.resolve('vitest/package.json')), 'vitest.mjs');
const r = spawnSync(process.execPath, [VITEST, 'run', 'src/test/usBoardFixture.test.tsx'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(aliases), US_BOARD_FIXTURE: 'record', US_BOARD_FIXTURE_OUT: path.resolve(out), US_BOARD_FIXTURE_SHA: sha, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
});
console.log(((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /Tests|Test Files|passed|failed|Error/.test(l)).slice(-12).join('\n'));
const ok = fs.existsSync(out) && fs.statSync(out).size > 100000;
console.log(`rec1569 ${ok ? 'WROTE' : 'NO FIXTURE'} ${out} ${ok ? fs.statSync(out).size : 0} bytes, vitest exit ${r.status}`);
process.exit(ok ? 0 : 1);
