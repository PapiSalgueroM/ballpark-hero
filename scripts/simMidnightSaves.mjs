/**
 * Round 513 harness for daily records and Conquest streaks crossing midnight.
 * The live run uses real localStorage, hooks, helpers and the Conquest board.
 * Six temp-copy controls restore each defect independently and must fail the
 * behavioral assertion assigned to them. Production source is never edited.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/midnightSaves.test.tsx';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-midnight-saves-'));
const clearEnv = {
  MIDNIGHT_RECORD_CONTROL: '',
  MIDNIGHT_HOOK_CONTROL: '',
  MIDNIGHT_CONQUEST_CONTROL: '',
};

const controls = [
  {
    name: 'delete-all-other-date cleanup',
    source: 'src/lib/dailyRecord.ts',
    env: 'MIDNIGHT_RECORD_CONTROL',
    needle: '      if (isCanonicalDate(savedDate) && savedDate < date) stale.push(key);',
    replacement: '      if (key !== dailyRecordKey(slug, date)) stale.push(key);',
    target: /an older write preserves the newer record byte for byte/,
    failures: 1,
  },
  {
    name: 'older-hook cleanup only',
    source: 'src/hooks/useDailyPuzzle.ts',
    env: 'MIDNIGHT_HOOK_CONTROL',
    needle: '    pruneOlderDailyRecords(gameSlug, todayStr);',
    replacement: `    const staleKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(\`${'${gameSlug}'}-daily-\`) && key !== storageKey,
    );
    staleKeys.forEach((key) => localStorage.removeItem(key));`,
    target: /an old hook reload cannot clean up a newer hook record/,
    failures: 1,
  },
  {
    name: 'backward streak update',
    source: 'src/lib/conquestDaily.ts',
    env: 'MIDNIGHT_CONQUEST_CONTROL',
    needle: `        if (dayGap < 0) {
          newStreak = 0;
          preserveNewerStreak = true;
        } else {`,
    replacement: `        if (dayGap < 0) {
          newStreak = 1;
        } else {`,
    target: /preserves a newer result and streak when an older result arrives late/,
    failures: 5,
  },
  {
    name: 'negative-gap streak read',
    source: 'src/lib/conquestDaily.ts',
    env: 'MIDNIGHT_CONQUEST_CONTROL',
    needle: '    if (dayGap < 0) return 0;',
    replacement: '',
    target: /is idempotent on one day, increments consecutively, resets after a gap and hides future streaks/,
    failures: 5,
  },
  {
    name: 'per-date Conquest locks',
    source: 'src/lib/conquestDaily.ts',
    env: 'MIDNIGHT_CONQUEST_CONTROL',
    needle: '    return await navigator.locks.request(`${dailySlug(sport)}-daily`, () => {',
    replacement: '    return await navigator.locks.request(`${dailySlug(sport)}-daily-${dateStr}`, () => {',
    target: /serializes different dates and updates each final streak before releasing the sport lock/,
    failures: 1,
  },
  {
    name: 'missing in-lock streak update',
    source: 'src/lib/conquestDaily.ts',
    env: 'MIDNIGHT_CONQUEST_CONTROL',
    needle: '      if (next.done && next.result) saveDailyResult(sport, next.result, dateStr, next.picks);',
    replacement: '',
    target: /serializes different dates and updates each final streak before releasing the sport lock/,
    failures: 1,
  },
];

const abort = (message) => {
  console.error(`simMidnightSaves: ${message}`);
  process.exitCode = 1;
};

function runSuite(extraEnv = {}) {
  const reportPath = path.join(tempRoot, `report-${Math.random().toString(36).slice(2)}.json`);
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'node_modules/vitest/vitest.mjs'),
    'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism',
    '--reporter=json', `--outputFile=${reportPath}`,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      ...clearEnv,
      ...extraEnv,
      TEMP: tempRoot,
      TMP: tempRoot,
      CI: '1',
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
  });
  if (!fs.existsSync(reportPath)) {
    abort(`Vitest produced no report: ${(result.stderr || result.stdout || result.error || '').toString().slice(-2000)}`);
    return null;
  }
  return { result, report: JSON.parse(fs.readFileSync(reportPath, 'utf8')) };
}

function casesOf(run) {
  return (run.report.testResults || []).flatMap((suite) => suite.assertionResults || []);
}

try {
  console.log(`MIDNIGHT| live behavior: ${TEST}`);
  const live = runSuite();
  if (live) {
    const cases = casesOf(live);
    const passed = cases.filter((test) => test.status === 'passed').length;
    console.log(`MIDNIGHT| live result: ${passed}/${cases.length} passed`);
    if (live.result.status !== 0 || passed !== 19 || cases.length !== 19) {
      abort(`live suite was not 19/19: ${(live.result.stderr || '').slice(-1500)}`);
    }
  }

  let controlsPassed = 0;
  for (const control of controls) {
    const sourcePath = path.join(ROOT, control.source);
    const source = fs.readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');
    const matches = source.split(control.needle).length - 1;
    if (matches !== 1) {
      abort(`${control.name} matched ${matches} times in ${control.source}, expected exactly once`);
      continue;
    }
    const changed = source.replace(control.needle, control.replacement);
    if (changed === source) {
      abort(`${control.name} changed no code`);
      continue;
    }
    const copy = path.join(tempRoot, `${control.name.replaceAll(' ', '-')}-${path.basename(control.source)}`);
    fs.writeFileSync(copy, changed);
    const controlled = runSuite({ [control.env]: copy });
    if (!controlled) continue;
    const cases = casesOf(controlled);
    const targets = cases.filter((test) => control.target.test(test.fullName || test.title || ''));
    const assertionFailures = targets.filter((test) =>
      test.status === 'failed' && (test.failureMessages || []).some((message) => message.includes('AssertionError')),
    );
    const moduleErrors = (controlled.report.testResults || []).filter((suite) =>
      suite.status === 'failed' && !(suite.assertionResults || []).length,
    );
    if (controlled.result.status === 0 || targets.length !== control.failures ||
        assertionFailures.length !== control.failures || moduleErrors.length > 0) {
      abort(`${control.name} did not produce ${control.failures} named assertion failure(s)`);
      continue;
    }
    controlsPassed += 1;
    console.log(`MIDNIGHT| control ${controlsPassed}/${controls.length}: ${control.name}, ${assertionFailures.length} named assertion failure(s)`);
  }

  if (!process.exitCode && controlsPassed === controls.length) {
    console.log(`simMidnightSaves: all green (19 live tests, ${controlsPassed}/${controls.length} controls fired)`);
  } else if (!process.exitCode) {
    abort(`only ${controlsPassed}/${controls.length} controls fired`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
