// Review-run 1583 (runner only): revert the round's page hunk or its dialog sentence, run what the builder's gates
// run on the page side, restore, and say which of them noticed. Usage: node .rc/x/rmutpage.mjs page|dialog
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const edits = {
  page: ['src/pages/NbaConnections.tsx', [
    ['<ConnectionsGroupLabel theme={group.theme} />', '{group.theme}'],
    ["import { ConnectionsGroupLabel } from '@/components/game/ConnectionsGroupLabel';\n", ''],
  ]],
  dialog: ['src/components/nba-connections/NbaConnectionsHowToPlay.tsx', [
    [' A team group marked "as of 2025-26" only counts seasons up to then, so a trade later on can\'t change the answer.', ''],
  ]],
}[mode];
if (!edits) { console.log('mode?'); process.exit(2); }
const [file, pairs] = edits;
const orig = fs.readFileSync(file, 'utf8');
let next = orig;
for (const [a, b] of pairs) {
  if (next.split(a).length - 1 !== 1) { console.log(`MUTPAGE ${mode} ABORTED: "${a.slice(0, 50)}" not found once in ${file}`); process.exit(2); }
  next = next.replace(a, b);
}
const VITEST = ['src/hooks/useConnectionsRelabel.test.ts', 'src/hooks/useConnectionsLoss.test.ts', 'src/hooks/useConnectionsShake.test.ts', 'src/test/nbaPlanningBench.test.tsx', 'src/test/dailySaveParity.test.tsx', 'src/test/dailySaveShapes.test.tsx', 'src/test/dailySaveHardening.test.tsx'];
const res = [];
try {
  fs.writeFileSync(file, next);
  const runs = [
    ['vitest7', 'node_modules/.bin/vitest', ['run', ...VITEST, '--testTimeout=300000', '--hookTimeout=120000']],
    ['tsc', 'node_modules/.bin/tsc', ['--noEmit', '-p', 'tsconfig.app.json']],
    ['simNbaPlanningBench', 'node', ['scripts/simNbaPlanningBench.mjs']],
    ['simConnectionsFacts', 'node', ['scripts/simConnectionsFacts.mjs']],
    ['simUsConnectionsFacts', 'node', ['scripts/simUsConnectionsFacts.mjs']],
    ['simDailySaveHardening', 'node', ['scripts/simDailySaveHardening.mjs']],
  ];
  for (const [label, cmd, args] of runs) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
    const lines = `${r.stdout}\n${r.stderr}`.trim().split('\n').filter(Boolean);
    res.push(`${label}=${r.status}`);
    console.log(`${label} exit=${r.status} | ${(lines[lines.length - 1] ?? '').slice(0, 200)}`);
  }
} finally {
  fs.writeFileSync(file, orig);
}
const red = res.filter(x => !x.endsWith('=0'));
console.log(`MUTPAGE ${mode}: ${res.join(' ')} -> ${red.length ? `DETECTED by ${red.join(',')}` : 'UNDETECTED (everything green)'}`);
