// Runner only: record the US board fixture the way simUsBoardParity replays it since Round 1424 (the proved
// historical CoachCareerPanel swapped in through NO_DOUBLE_SWAP, plus the installed react and lucide aliases).
// Usage: node .rc/x/recHist.mjs <out.json>. Never committed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { stripNflStaffRecoveryPanelHunks } from '../../scripts/lib/usNflStaffRecoveryHunks.mjs';
const ROOT = process.cwd();
const out = process.argv[2];
const current = fs.readFileSync(path.join(ROOT, 'src/components/us-career/CoachCareerPanel.tsx'), 'utf8').split('\r\n').join('\n');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-hist-'));
const panel = path.join(tmp, 'CoachCareerPanel.historical.tsx');
fs.writeFileSync(panel, stripNflStaffRecoveryPanelHunks(current));
const req = createRequire(path.join(ROOT, 'package.json'));
const aliases = {
  ...Object.fromEntries(['react/jsx-dev-runtime', 'react/jsx-runtime', 'react', 'lucide-react'].map(id => [id, req.resolve(id)])),
  '@/components/us-career/CoachCareerPanel': panel,
};
const r = spawnSync(process.execPath, ['scripts/recordUsBoardFixture.mjs', out], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(aliases) } });
process.exit(r.status ?? 1);
