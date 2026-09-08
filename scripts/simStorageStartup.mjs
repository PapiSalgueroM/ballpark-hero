/**
 * Round 515: storage denial cannot stop the site at startup.
 *
 * The live arm runs the focused unit files over the real modules. Five
 * negative-control arms write isolated module copies with one production guard
 * removed, point Vitest at that copy, and require only the tests owned by that
 * guard to fail. A missing rewrite, missing report, skipped test, wrong failure,
 * or unrelated failure makes this harness red.
 *
 * Run all arms:
 *   node scripts/simStorageStartup.mjs
 * Run selected controls after the live arm:
 *   STORAGE_STARTUP_CONTROL=auth,index node scripts/simStorageStartup.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = [
  'src/components/CookieConsent.test.tsx',
  'src/integrations/supabase/client.import-storage.test.ts',
  'src/integrations/supabase/client.reads.test.tsx',
  'src/integrations/supabase/client.session.test.ts',
  'src/integrations/supabase/client.test.ts',
  'src/pages/Index.storage.test.tsx',
];
const EXPECTED_FILES = TESTS.length;
const EXPECTED_TESTS = 15;
const MODES = ['auth', 'index', 'streak', 'cookie', 'sdk'];
const requested = process.env.STORAGE_STARTUP_CONTROL
  ? process.env.STORAGE_STARTUP_CONTROL.split(',').map(value => value.trim()).filter(Boolean)
  : MODES;
const unknown = requested.filter(mode => !MODES.includes(mode));
if (unknown.length) {
  console.error(`simStorageStartup: unknown control(s): ${unknown.join(', ')}`);
  process.exit(1);
}

const TEMP_PARENT = path.join(ROOT, 'scripts');
const temp = fs.mkdtempSync(path.join(TEMP_PARENT, '.storage-startup-'));
const controls = {
  auth: {
    source: path.join(ROOT, 'src/integrations/supabase/client.ts'),
    output: path.join(ROOT, `src/integrations/supabase/__storage_startup_control_${process.pid}_client.ts`),
    env: 'STORAGE_AUTH_MODULE',
    replacements: [{
      label: 'auth storage read probe',
      current: '    persistSession: canReadAuthStorage(),',
      broken: '    persistSession: true,',
    }],
    expected: [
      'finishes auth startup when session reads are denied but writes work',
    ],
  },
  index: {
    source: path.join(ROOT, 'src/pages/Index.tsx'),
    output: path.join(ROOT, `src/pages/__storage_startup_control_${process.pid}_Index.tsx`),
    env: 'STORAGE_INDEX_MODULE',
    replacements: [{
      label: 'storage enumeration catch',
      current: `  } catch {
    // Storage enumeration can be blocked even when reading individual keys works.
    return 0;
  }
  return count;`,
      broken: `  } catch (error) {
    throw error;
  }
  return count;`,
    }],
    expected: [
      'keeps the catalog and search usable when length throws',
      'keeps the catalog and search usable when key throws',
    ],
  },
  streak: {
    source: path.join(ROOT, 'src/components/game/StreakReminder.tsx'),
    output: path.join(ROOT, `src/components/game/__storage_startup_control_${process.pid}_StreakReminder.tsx`),
    env: 'STORAGE_STREAK_MODULE',
    replacements: [
      {
        label: 'streak reminder read catch',
        current: `    try {
      setDismissed(localStorage.getItem('streak-reminder-dismissed') === today);
    } catch {
      setDismissed(true);
    }`,
        broken: `    setDismissed(localStorage.getItem('streak-reminder-dismissed') === today);`,
      },
      {
        label: 'streak reminder dismiss catch',
        current: `    try {
      localStorage.setItem('streak-reminder-dismissed', getEtDateString());
    } catch { /* dismissal still applies to this visit */ }`,
        broken: `    localStorage.setItem('streak-reminder-dismissed', getEtDateString());`,
      },
    ],
    expected: [
      'keeps the catalog and search usable when getItem throws',
      'can dismiss an existing streak reminder when the dismissal cannot be stored',
    ],
  },
  cookie: {
    source: path.join(ROOT, 'src/components/CookieConsent.tsx'),
    output: path.join(ROOT, `src/components/__storage_startup_control_${process.pid}_CookieConsent.tsx`),
    env: 'STORAGE_COOKIE_MODULE',
    replacements: [
      {
        label: 'cookie consent read catch',
        current: `    try {
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) setVisible(true);
    } catch {
      setVisible(true);
    }`,
        broken: `    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);`,
      },
      {
        label: 'cookie consent write catch',
        current: `    try {
      localStorage.setItem('cookie-consent', choice);
    } catch {
      // Essential only can dismiss for this visit. Failed acceptance never loads vendors.
      if (choice === 'essential') setVisible(false);
      else setSaveFailed(true);
      return false;
    }`,
        broken: `    localStorage.setItem('cookie-consent', choice);`,
      },
    ],
    expected: [
      'shows usable choices when reading consent throws',
      'does not accept or load vendors when saving consent fails, and allows a retry',
      'lets essential-only dismiss for this visit even when the preference cannot persist',
    ],
  },
  sdk: {
    copySource: path.join(ROOT, 'node_modules/@supabase/auth-js/dist/module'),
    copyRoot: path.join(temp, 'auth-js-control'),
    output: path.join(temp, 'auth-js-control/lib/helpers.js'),
    module: path.join(temp, 'auth-js-control/index.js'),
    env: 'STORAGE_AUTH_SDK_MODULE',
    replacements: [{
      label: 'SDK localStorage read capability probe',
      current: '        globalThis.localStorage.getItem(randomKey);\n',
      broken: '',
    }],
    expected: [
      'imports the auth client when all localStorage reads are denied',
    ],
  },
};

const config = path.join(temp, 'vitest.storage-startup.config.mjs');
fs.writeFileSync(config, `
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
const controls = {
  ...(process.env.STORAGE_AUTH_SDK_MODULE ? { '@supabase/auth-js': process.env.STORAGE_AUTH_SDK_MODULE } : {}),
  ...(process.env.STORAGE_AUTH_MODULE ? {
    '@/integrations/supabase/client': process.env.STORAGE_AUTH_MODULE,
    './client': process.env.STORAGE_AUTH_MODULE,
  } : {}),
  ...(process.env.STORAGE_INDEX_MODULE ? { './Index': process.env.STORAGE_INDEX_MODULE } : {}),
  ...(process.env.STORAGE_STREAK_MODULE ? { '@/components/game/StreakReminder': process.env.STORAGE_STREAK_MODULE } : {}),
  ...(process.env.STORAGE_COOKIE_MODULE ? { './CookieConsent': process.env.STORAGE_COOKIE_MODULE } : {}),
};
export default defineConfig({
  root: ${JSON.stringify(ROOT.replaceAll('\\', '/'))},
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    server: { deps: { inline: process.env.STORAGE_AUTH_SDK_MODULE
      ? ['@supabase/supabase-js', '@supabase/auth-js']
      : [] } },
  },
  resolve: { alias: { ...controls, '@': ${JSON.stringify(path.join(ROOT, 'src').replaceAll('\\', '/'))} } },
});
`);

function assertChild(parent, target, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside its allowed directory: ${target}`);
  }
}

function removeControl(spec) {
  if (spec.copyRoot) {
    assertChild(temp, spec.copyRoot, 'SDK control package');
    if (path.basename(spec.copyRoot) !== 'auth-js-control') {
      throw new Error(`SDK control package has an unexpected name: ${spec.copyRoot}`);
    }
    fs.rmSync(spec.copyRoot, { recursive: true, force: true });
    return;
  }
  assertChild(path.join(ROOT, 'src'), spec.output, 'control file');
  fs.rmSync(spec.output, { force: true });
}

function removeTemp() {
  assertChild(TEMP_PARENT, temp, 'temporary directory');
  if (!path.basename(temp).startsWith('.storage-startup-')) {
    throw new Error(`temporary directory has an unexpected name: ${temp}`);
  }
  fs.rmSync(temp, { recursive: true, force: true });
}

const cleanup = () => {
  for (const control of Object.values(controls)) {
    try { removeControl(control); } catch { /* best effort */ }
  }
  try { removeTemp(); } catch { /* best effort */ }
};
process.on('exit', cleanup);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { cleanup(); process.exit(1); });

function writeSdkCopy() {
  const spec = controls.sdk;
  removeControl(spec);
  assertChild(temp, spec.copyRoot, 'SDK control package');
  fs.cpSync(spec.copySource, spec.copyRoot, { recursive: true });
  const entry = fs.readFileSync(spec.module, 'utf8');
  const marker = 'globalThis.__DUKB_STORAGE_AUTH_SDK_COPY__ = true;';
  if (entry.includes(marker)) throw new Error('SDK control alias marker already exists');
  fs.writeFileSync(spec.module, `${marker}\n${entry}`);
  if (!fs.readFileSync(spec.module, 'utf8').startsWith(marker)) {
    throw new Error('SDK control alias marker was not written');
  }
  return spec;
}

function writeControl(mode) {
  const spec = mode === 'sdk' ? writeSdkCopy() : controls[mode];
  const source = spec.copyRoot ? spec.output : spec.source;
  const original = fs.readFileSync(source, 'utf8').split('\r\n').join('\n');
  let mutated = original;
  for (const replacement of spec.replacements) {
    const occurrences = mutated.split(replacement.current).length - 1;
    if (occurrences !== 1) {
      throw new Error(`${mode} control expected one ${replacement.label} block, found ${occurrences}`);
    }
    mutated = mutated.replace(replacement.current, replacement.broken);
  }
  if (mutated === original) throw new Error(`${mode} control changed nothing`);
  assertChild(spec.copyRoot ? spec.copyRoot : path.join(ROOT, 'src'), spec.output, `${mode} control file`);
  fs.writeFileSync(spec.output, mutated);
  return spec;
}

function controlEnv(spec) {
  return spec.copyRoot
    ? { [spec.env]: spec.module, STORAGE_EXPECT_AUTH_SDK_COPY: '1' }
    : { [spec.env]: spec.output };
}

function runSuite(label, env = {}) {
  const reportPath = path.join(temp, `${label}.json`);
  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', ...TESTS, '--config', config,
      '--maxWorkers=1', '--reporter=json', `--outputFile.json=${reportPath}`],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...env, CI: '1', NO_COLOR: '1' },
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) throw new Error(`${label} runner error: ${result.error.message}`);
  if (result.signal) throw new Error(`${label} runner ended on signal ${result.signal}`);
  if (!fs.existsSync(reportPath)) {
    throw new Error(`${label} produced no JSON report: ${output.slice(0, 4000)}`);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const rows = [];
  for (const file of report.testResults || []) {
    for (const assertion of file.assertionResults || []) {
      rows.push({
        title: (assertion.fullName || assertion.title || '').trim(),
        status: assertion.status,
        messages: (assertion.failureMessages || []).join('\n'),
      });
    }
  }
  if ((report.testResults || []).length !== EXPECTED_FILES) {
    throw new Error(`${label} reported ${(report.testResults || []).length}/${EXPECTED_FILES} test files`);
  }
  if (rows.length !== EXPECTED_TESTS) throw new Error(`${label} reported ${rows.length}/${EXPECTED_TESTS} tests`);
  if (new Set(rows.map(row => row.title)).size !== rows.length) throw new Error(`${label} reported duplicate test titles`);
  return { rows, exitCode: result.status, output };
}

function failureDetail(row) {
  const line = row.messages.split('\n').map(value => value.trim())
    .find(value => value && !value.startsWith('AssertionError:') && !value.startsWith('at ') && !value.startsWith('❯'));
  return (line || row.messages.split('\n')[0] || 'no failure detail').slice(0, 180);
}

function expectedTitles(liveRows, mode) {
  return controls[mode].expected.map(fragment => {
    const matches = liveRows.filter(row => row.title.endsWith(fragment));
    if (matches.length !== 1) throw new Error(`${mode} expected one live test ending ${JSON.stringify(fragment)}, found ${matches.length}`);
    return matches[0].title;
  });
}

let failures = 0;
const fail = message => { failures += 1; console.error(`  FAIL  ${message}`); };

console.log(`Round 515 storage startup: ${EXPECTED_TESTS} tests in ${EXPECTED_FILES} focused files`);
console.log('A) real production modules');
let live;
try {
  live = runSuite('live');
  for (const row of live.rows) {
    console.log(`  ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
    if (row.status !== 'passed') fail(`${row.title}: ${failureDetail(row)}`);
  }
  if (live.exitCode !== 0) fail(`live Vitest exit was ${live.exitCode}, expected 0`);
} catch (error) {
  console.error(`  FAIL  ${error instanceof Error ? error.message : String(error)}`);
  cleanup();
  process.exit(1);
}

for (const mode of requested) {
  console.log(`\nB) negative control ${mode}`);
  let spec;
  try {
    if (mode === 'sdk') {
      spec = writeSdkCopy();
      const baseline = runSuite('control-sdk-baseline', controlEnv(spec));
      const notPassed = baseline.rows.filter(row => row.status !== 'passed');
      if (notPassed.length || baseline.exitCode !== 0) {
        throw new Error(`sdk copied-package baseline was not 15/15 green: ${notPassed.map(row => row.title).join(' | ') || `exit ${baseline.exitCode}`}`);
      }
      console.log('  copied-package baseline: 15 tests passed and alias marker was observed');
      removeControl(spec);
    }
    spec = writeControl(mode);
    console.log(`  mutated ${spec.replacements.map(replacement => replacement.label).join(' + ')}`);
    const controlled = runSuite(`control-${mode}`, controlEnv(spec));
    const wanted = expectedTitles(live.rows, mode);
    const failed = controlled.rows.filter(row => row.status === 'failed');
    const failedTitles = failed.map(row => row.title);
    const exact = failedTitles.length === wanted.length
      && wanted.every(title => failedTitles.includes(title))
      && failedTitles.every(title => wanted.includes(title));
    for (const row of failed) console.log(`  RED as designed  ${row.title}: ${failureDetail(row)}`);
    if (!exact) {
      fail(`${mode} expected only ${wanted.join(' | ')}, got ${failedTitles.join(' | ') || 'no failed tests'}`);
    }
    const nonFailed = controlled.rows.filter(row => row.status !== 'passed' && row.status !== 'failed');
    if (nonFailed.length) fail(`${mode} reported non-final statuses: ${nonFailed.map(row => `${row.status} ${row.title}`).join(' | ')}`);
    if (controlled.exitCode !== 1) fail(`${mode} Vitest exit was ${controlled.exitCode}, expected 1 for owned test failures`);
    if (exact && !nonFailed.length && controlled.exitCode === 1) {
      console.log(`  control green: exactly ${failed.length} owned test${failed.length === 1 ? '' : 's'} failed and ${controlled.rows.length - failed.length} stayed green`);
    }
  } catch (error) {
    fail(`${mode}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (spec) {
      try { removeControl(spec); } catch { /* final cleanup also tries */ }
    }
  }
}

if (failures) {
  console.error(`\nsimStorageStartup: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`\nsimStorageStartup: green. ${EXPECTED_TESTS} live tests passed, and ${requested.length} targeted control${requested.length === 1 ? '' : 's'} failed only their owned tests.`);
