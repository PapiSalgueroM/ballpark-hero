/* Footle live-pool atomicity harness.

   The behavior test mocks Supabase at the query boundary, so it checks the
   real fetch function without depending on network availability. A complete
   fetch must include both famous and insane rows. If either obscure request
   fails, the function must return an empty pool before mapping famous rows.

   Negative control:
     SIM_FOOTLE_ATOMIC_CONTROL=partial writes a copy with the old partial-pool
     behavior, proves that copy loads, and expects the atomicity assertion to
     fail because the famous-only pool is returned.

   Run: node scripts/simFootleAtomicPool.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/lib/fetchFootlePlayerPool.test.ts';
const CONTROL = process.env.SIM_FOOTLE_ATOMIC_CONTROL || '';
const CONTROL_DIR = path.join(ROOT, 'dist', '.footle-atomic-control');
const CONTROL_FILE = path.join(CONTROL_DIR, 'fetchFootlePlayerPool.control.ts');

const fail = message => {
  console.error('  FAIL: ' + message);
  process.exitCode = 1;
};

function runTest(extraEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return { code: result.status, out: (result.stdout || '') + (result.stderr || '') };
}

const labels = {
  partial: 'returns an empty pool when either obscure query fails',
  success: 'keeps the famous and obscure tiers on a complete successful fetch',
  famous: 'keeps the empty fallback behavior when the famous query fails',
};

function passed(out, label) {
  return new RegExp(`✓.*${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`).test(out);
}

if (CONTROL === 'partial') {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'fetchFootlePlayerPool.ts'), 'utf8');
  const early = `    if (!obscureRows) {\n      console.warn('[fetchFootlePlayerPool] Obscure batch failed, using fallback');\n      return [];\n    }\n`;
  if (!source.includes(early)) {
    console.error('control cannot run: atomic obscure-failure guard is missing or changed shape');
    process.exit(1);
  }
  const regressed = source.replace(early, '');
  if (regressed === source || regressed.includes(early) || !regressed.includes('if (obscureRows) {')) {
    console.error('control cannot run: old-behavior rewrite was a no-op');
    process.exit(1);
  }

  fs.mkdirSync(CONTROL_DIR, { recursive: true });
  fs.writeFileSync(CONTROL_FILE, regressed);
  console.log('1) Negative control: running against a copy with the old partial behavior');
  console.log('   NEGATIVE CONTROL ON: temporary fetch copy was rewritten');
  const { code, out } = runTest({ FOOTLE_FETCH: CONTROL_FILE.replaceAll('\\', '/') });
  try {
    const loaded = out.includes(TEST) && passed(out, labels.success) && passed(out, labels.famous);
    if (!loaded) {
      console.error('control cannot run: the rewritten fetch module did not load and pass its unaffected assertions');
      console.error(out.slice(-3000));
      process.exit(1);
    }
    const partialRed = code !== 0 && /partial pool returned: \d+ players: Famous Star/.test(out) && /to deeply equal \[\]/.test(out);
    if (!partialRed) {
      console.error('control cannot run: the atomicity assertion did not fail on the observed famous-only partial pool');
      console.error(out.slice(-3000));
      process.exit(1);
    }
    console.log('   ASSERTION partial-failure: RED control observed the famous-only partial pool');
    console.log('   ASSERTION complete-success: PASS under the regressed copy');
    console.log('   ASSERTION famous-error-fallback: PASS under the regressed copy');
    console.log('\nsimFootleAtomicPool control "partial": 1 expected failure fired, the check works');
  } finally {
    fs.rmSync(CONTROL_DIR, { recursive: true, force: true });
  }
  process.exit(0);
}

console.log('1) Partial obscure failure is atomic');
const result = runTest();
if (result.code !== 0) {
  fail('behavior test is red:\n' + result.out.slice(-3000));
} else if (!result.out.includes(TEST)) {
  fail('vitest did not report the behavior test file, so nothing was checked');
} else {
  for (const [key, label] of Object.entries(labels)) {
    if (passed(result.out, label)) {
      console.log(`   ASSERTION ${key === 'partial' ? 'partial-failure' : key === 'success' ? 'complete-success' : 'famous-error-fallback'}: PASS`);
    } else {
      fail(`vitest did not report a passing ${key} assertion`);
    }
  }
}

if (process.exitCode) {
  console.error('\nsimFootleAtomicPool: 1 failure');
  process.exit(1);
}
console.log('\nsimFootleAtomicPool: all green');
