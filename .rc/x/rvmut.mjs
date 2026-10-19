// Review of Round 1512 (run lens): one mutation of the core rule, applied to src on the runner, the round's
// gates run against it, and the file restored from memory. Exit 0 when at least one gate went red (caught),
// 1 when every gate stayed green (survived), 2 when the mutation could not be applied.
//   node .rc/x/rvmut.mjs <name>
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const M = {
  postsfull: { file: 'src/lib/clubManagerStart.ts', from: '  return noSackFrom(state) === null && easyFrom(state) === null;', to: '  return noSackFrom(state) === null;' },
  readeasy: { file: 'src/lib/managerDifficulty.ts', from: "raw === 'veryeasy' || raw === 'easy' || raw === 'hard'", to: "raw === 'veryeasy' || raw === 'hard'" },
  carry: { file: 'src/lib/clubManagerStart.ts', from: '    if (easySince !== null) state.startOptions.easySince = easySince;\n', to: '' },
  startmark: { file: 'src/lib/clubManagerDifficulty.ts', from: '    s = applyNewJobDials({ ...state, startOptions: optionsAtLevel(state, level) });', to: '    s = applyNewJobDials({ ...state, startOptions: { ...state.startOptions, difficulty: level } });' },
  livegate: { file: 'src/lib/clubManagerStart.ts', from: '  if (readLevel(level) !== level || state.live) return null;', to: '  if (readLevel(level) !== level) return null;' },
  markseason: { file: 'src/lib/clubManagerStart.ts', from: '    next.easySince = Number.isInteger(state.season) && state.season > 0 ? state.season : 1;', to: '    next.easySince = Number.isInteger(state.season) && state.season > 0 ? state.season + 1 : 1;' },
  veedge: { file: 'src/lib/clubManagerDifficulty.ts', from: 'cheque: 1.5, wageRoom: 1.12, mark: 0.8, edge: -3 }', to: 'cheque: 1.5, wageRoom: 1.12, mark: 0.8, edge: -1.5 }' },
};
const name = process.argv[2];
const mu = M[name];
if (!mu) { console.log(`rvmut: no mutation ${name}`); process.exit(2); }
const raw = fs.readFileSync(mu.file, 'utf8');
const orig = raw.replaceAll('\r\n', '\n');
const hits = orig.split(mu.from).length - 1;
if (hits !== 1) { console.log(`rvmut ${name}: the target is in ${mu.file} ${hits} times, not once; NOT APPLIED`); process.exit(2); }
fs.writeFileSync(mu.file, orig.replace(mu.from, mu.to));
console.log(`rvmut ${name}: applied to ${mu.file}`);
const gates = [
  ['sim178', 'SECTION=1,7,8 node scripts/simCmDifficulty.mjs'],
  ['vitest', 'node_modules/.bin/vitest run src/lib/clubManagerDifficulty.test.ts src/test/clubManagerDifficultyPick.test.tsx src/test/clubManagerNoSack.test.tsx --testTimeout=300000 --hookTimeout=120000'],
  ['simCmNoSack', 'node scripts/simCmNoSack.mjs'],
];
const red = [];
try {
  for (const [label, cmd] of gates) {
    const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
    const fails = out.filter(l => /FAIL|✗|×|AssertionError|expected/.test(l)).slice(0, 6);
    const last = out.filter(l => l.trim()).slice(-2).join(' | ');
    console.log(`  ${label} exit=${r.status} | ${last.slice(0, 220)}`);
    for (const f of fails) console.log(`     ${f.trim().slice(0, 220)}`);
    if (r.status !== 0) red.push(label);
  }
} finally {
  fs.writeFileSync(mu.file, raw);
}
console.log(red.length ? `MUTATION ${name} CAUGHT by ${red.join(', ')}` : `MUTATION ${name} SURVIVED every gate`);
process.exit(red.length ? 0 : 1);
