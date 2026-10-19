// Release BL kit: records the US board fixture the way scripts/simUsBoardParity.mjs replays it since Round 1424 (PR338):
// with the proved historical main775 coaching Panel aliased in (stripNflStaffRecoveryPanelHunks of the current panel)
// and the installed react, jsx runtimes and lucide-react pinned, the current engine live. The plain recorder would
// record PR338's new staff role route, which the parity replay deliberately does not show, so a plain re-record could
// never replay. Runs scripts/recordUsBoardFixture.mjs from the checkout in the current directory.
// usage (from a checkout root): node <this file> <output json>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const out = process.argv[2];
if (!out || !path.isAbsolute(out)) { console.log('recordHistorical: give an absolute output path'); process.exit(2); }
const { stripNflStaffRecoveryPanelHunks } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usNflStaffRecoveryHunks.mjs')).href);
const current = fs.readFileSync(path.join(ROOT, 'src/components/us-career/CoachCareerPanel.tsx'), 'utf8').replace(/\r\n/g, '\n');
const historical = stripNflStaffRecoveryPanelHunks(current);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usrec-'));
const panel = path.join(tmp, 'CoachCareerPanel.historical.tsx');
fs.writeFileSync(panel, historical, { flag: 'wx' });
const req = createRequire(path.join(ROOT, 'package.json'));
const aliases = {
  ...Object.fromEntries(['react/jsx-dev-runtime', 'react/jsx-runtime', 'react', 'lucide-react'].map(id => [id, req.resolve(id)])),
  '@/components/us-career/CoachCareerPanel': panel,
};
console.log(`recordHistorical: historical panel ${historical.length} chars, aliases ${Object.keys(aliases).join(', ')}`);
const r = spawnSync(process.execPath, ['scripts/recordUsBoardFixture.mjs', out], { cwd: ROOT, stdio: 'inherit',
  env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(aliases) } });
process.exit(r.status ?? 1);
