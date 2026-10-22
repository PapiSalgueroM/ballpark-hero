// Release BP triage probe (never committed): which of Round 1520's twelve bridge edits moves simCmShootoutOrder's
// historical unmanaged play. For each edit alone, a throwaway worktree of HEAD takes back just that edit (the bridge's
// own anchor and replacement, exactly once) and runs the harness; it prints the edit, the exit and the rows line.
// Run from the repo root on a runner: node .rc/x/bisect1520.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { BRIDGE_EDITS_1520 } = await import(pathToFileURL(path.join(root, 'scripts/lib/cmNoMadeUpNations1520.mjs')).href);
const only = (process.env.BISECT_ONLY || '').split(',').filter(Boolean).map(Number);
for (let i = 0; i < BRIDGE_EDITS_1520.length; i++) {
  if (only.length && !only.includes(i)) continue;
  const [file, label, from, to] = BRIDGE_EDITS_1520[i];
  const wt = `/tmp/bis${i}`;
  execFileSync('git', ['worktree', 'add', '-f', '--detach', wt, 'HEAD'], { stdio: 'ignore' });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(wt, 'node_modules'));
  const f = path.join(wt, file);
  const src = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`edit ${i} (${label}): anchor ${n} times, SKIPPED`); continue; }
  fs.writeFileSync(f, src.replace(from, to));
  const r = spawnSync('node', ['scripts/simCmShootoutOrder.mjs'], { cwd: wt, encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  const rows = out.split('\n').filter(l => /rows equal actual pre-1072 main|FAILURE|all sections passed/.test(l)).map(l => l.trim().slice(0, 160));
  console.log(`edit ${i} (${label}) taken back alone: exit ${r.status} | ${rows.join(' | ')}`);
}
