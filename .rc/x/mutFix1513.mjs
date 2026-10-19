// Round 1513 fixer, runner only, never committed: the run review's two survivors, applied again on the fixed head.
// node .rc/x/mutFix1513.mjs <name>: asserts the anchor is in the file once, applies it, runs every check (no short
// circuit), restores the file, and exits 0 only when at least one check went red (the mutation is KILLED).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VT = 'node_modules/.bin/vitest run --testTimeout=300000 --hookTimeout=120000';
const MUTS = {
  or: {
    file: 'src/hooks/useClubManager.ts',
    from: 'return careerPostsScore(s) && seasonPosts(activeSlot(), s.season);',
    to: 'return careerPostsScore(s) || seasonPosts(activeSlot(), s.season);',
    checks: [`${VT} src/test/cmSavePointsHook.test.tsx`],
  },
  indexnoreadback: {
    file: 'src/lib/cmSavePointsStore.ts',
    from: '    return storage.getItem(pointsIndexKey(slot)) === text;',
    to: '    return true;',
    checks: ['node scripts/simCmSavePoints.mjs'],
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
    const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    console.log(`--- ${cmd}\n    exit=${r.status}\n    ${out.slice(-8).join('\n    ')}`);
    if (r.status !== 0) killers.push(cmd);
  }
} finally {
  fs.writeFileSync(m.file, orig);
}
if (fs.readFileSync(m.file, 'utf8') !== orig) { console.log('ABORT: the file was not restored'); process.exit(2); }
if (killers.length) { console.log(`mutation ${name}: KILLED by ${killers.join(' ; ')}`); process.exit(0); }
console.log(`mutation ${name}: SURVIVED every check`);
process.exit(1);
