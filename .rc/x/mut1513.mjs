// Reviewer mutation runner for Round 1513 (runs on the GitHub runner only).
// node .rc/x/mut1513.mjs <name>: applies one mutation (its text must be in the file exactly once),
// runs every check in its list (all of them, no short circuit), restores the file, prints which checks killed it.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VT = 'node_modules/.bin/vitest run --testTimeout=300000 --hookTimeout=120000';
const SIM = 'node scripts/simCmSavePoints.mjs';
const MUTS = {
  or: {
    file: 'src/hooks/useClubManager.ts',
    from: 'return careerPostsScore(s) && seasonPosts(activeSlot(), s.season);',
    to: 'return careerPostsScore(s) || seasonPosts(activeSlot(), s.season);',
    checks: [SIM, 'node scripts/simCmNoSack.mjs', 'node scripts/simClubManagerScore.mjs', 'node scripts/simSessionMarks.mjs', 'node scripts/simActivityNotCompletion.mjs',
      `${VT} src/test/cmSavePoints.test.ts src/test/clubManagerNoSack.test.tsx src/hooks/useClubManager.test.ts src/test/clubManagerDifficultyPick.test.tsx src/test/clubManagerSlots.test.tsx`],
  },
  blockseason: {
    file: 'src/lib/cmSavePoints.ts',
    from: 'const marked = idx.blocked.includes(opened.meta.season);\n  if (!marked && !writePointsIndex(slot, { ...idx, blocked: [...idx.blocked, opened.meta.season] }',
    to: 'const marked = idx.blocked.includes(career.season);\n  if (!marked && !writePointsIndex(slot, { ...idx, blocked: [...idx.blocked, career.season] }',
    checks: [SIM, `${VT} src/test/cmSavePoints.test.ts`],
  },
  indexnoreadback: {
    file: 'src/lib/cmSavePointsStore.ts',
    from: '    return storage.getItem(pointsIndexKey(slot)) === text;',
    to: '    return true;',
    checks: [SIM, `${VT} src/test/cmSavePoints.test.ts`],
  },
  clearkeepsindex: {
    file: 'src/lib/cmSavePointsStore.ts',
    from: 'if (k && (k.startsWith(prefix) || k === pointsIndexKey(slot))) keys.push(k);',
    to: 'if (k && k.startsWith(prefix)) keys.push(k);',
    checks: [SIM, `${VT} src/test/cmSavePoints.test.ts src/test/clubManagerSlots.test.tsx`],
  },
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`ABORT: unknown mutation ${name}`); process.exit(2); }
const orig = fs.readFileSync(m.file, 'utf8');
const n = orig.split(m.from).length - 1;
if (n !== 1) { console.log(`ABORT: mutation ${name}: anchor found ${n} times in ${m.file}`); process.exit(2); }
fs.writeFileSync(m.file, orig.replace(m.from, m.to));
if (fs.readFileSync(m.file, 'utf8') === orig) { console.log(`ABORT: mutation ${name} changed nothing`); process.exit(2); }
console.log(`MUTATION ${name} applied to ${m.file}`);
const killers = [];
try {
  for (const cmd of m.checks) {
    const t0 = Date.now();
    const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    const tail = out.slice(-6).join('\n    ');
    console.log(`--- ${cmd}\n    exit=${r.status} ${Math.round((Date.now() - t0) / 1000)}s\n    ${tail}`);
    const fails = out.filter(l => /FAIL|fail:|✗|×/.test(l)).slice(0, 8);
    if (fails.length) console.log(`    failing lines:\n      ${fails.join('\n      ')}`);
    if (r.status !== 0) killers.push(cmd.split(' ').slice(0, 3).join(' '));
  }
} finally {
  fs.writeFileSync(m.file, orig);
}
if (killers.length) { console.log(`mutation ${name}: KILLED by ${killers.join(' | ')}`); process.exit(1); }
console.log(`mutation ${name}: SURVIVED every check`);
process.exit(0);
