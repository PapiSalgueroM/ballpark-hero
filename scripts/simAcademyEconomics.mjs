import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.join(ROOT, 'src/lib/clubManager.ts');
const TEST = 'src/test/clubManagerAcademyEconomics.test.ts';
const LIFE = 'src/test/clubManagerAcademyValueLifecycle.test.ts';
const SHA = value => createHash('sha256').update(value).digest('hex');
const original = fs.readFileSync(CORE);
const held = SHA(original);
const heldFiles = new Map([CORE, TEST, LIFE, 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'].map(file => {
  const absolute = path.resolve(ROOT, file);
  return [absolute, SHA(fs.readFileSync(absolute))];
}));
const outBase = process.env.ACADEMY_ECONOMICS_OUT || os.tmpdir();
fs.mkdirSync(outBase, { recursive: true });
const OUT = fs.mkdtempSync(path.join(outBase, 'dukb-academy-economics-'));
const vitest = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
const ids = [
  ['elite', 'CM_ACADEMY_ELITE_TERMS:'],
  ['scouted', "CM_ACADEMY_MARKET_TERMS:'scouted'"],
  ['developing', "CM_ACADEMY_MARKET_TERMS:'developing'"],
  ['older', "CM_ACADEMY_MARKET_TERMS:'older-prospect'"],
  ['floor', "CM_ACADEMY_MARKET_TERMS:'floor'"],
  ['player', 'CM_ACADEMY_PROMOTION_PRESERVES_PLAYER:'],
  ['refusals', 'CM_ACADEMY_PROMOTION_REFUSALS:'],
  ['rng', 'CM_ACADEMY_PROMOTION_RNG:'],
  ['saved', 'CM_ACADEMY_SAVED_CONTRACT:'],
];
const lifeIds = [
  ['roundtrip', 'CM_ACADEMY_MARKET_SAVE:'],
  ['growth60', 'CM_ACADEMY_MARKET_GROWTH:60 '],
  ['growth70', 'CM_ACADEMY_MARKET_GROWTH:70 '],
  ['growth76', 'CM_ACADEMY_MARKET_GROWTH:76 '],
];
const economicReds = new Set(['elite', 'scouted', 'developing', 'older', 'floor']);
let complete = false;
function requireThat(ok, why) { if (!ok) throw new Error(why); }
function arm(name, test, source, expectedIds, red) {
  const reportPath = path.join(OUT, name + '.json');
  let aliases = process.env.NO_DOUBLE_SWAP ? JSON.parse(process.env.NO_DOUBLE_SWAP) : {};
  if (source) aliases = { ...aliases, '@/lib/clubManager': source };
  const result = spawnSync(process.execPath, [vitest, 'run', test, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportPath], {
    cwd: ROOT, env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(aliases) },
    encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
  });
  fs.writeFileSync(path.join(OUT, name + '.stdout'), result.stdout || '');
  fs.writeFileSync(path.join(OUT, name + '.stderr'), result.stderr || '');
  requireThat(!result.error && !result.signal, name + ': child infrastructure failure');
  requireThat(!/(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((result.stdout || '') + '\n' + (result.stderr || '')), name + ': unhandled child error');
  requireThat(result.status === (red.size ? 1 : 0), name + ': unexpected exit ' + result.status);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  requireThat(Array.isArray(report.testResults) && report.testResults.length === 1, name + ': expected one complete test file');
  const rows = report.testResults.flatMap(suite => suite.assertionResults);
  requireThat(rows.length === expectedIds.length, name + ': wrong case count');
  requireThat(report.numTotalTests === expectedIds.length && report.numFailedTests === red.size && report.numPassedTests === expectedIds.length - red.size, name + ': incomplete test counters');
  requireThat(report.numPendingTests === 0 && report.numTodoTests === 0, name + ': skipped or todo cases');
  if (report.numRuntimeErrorTestSuites !== undefined) requireThat(report.numRuntimeErrorTestSuites === 0, name + ': runtime suite errors');
  if (report.numUnhandledErrors !== undefined) requireThat(report.numUnhandledErrors === 0, name + ': unhandled report errors');
  const seen = new Set();
  for (const row of rows) {
    const matches = expectedIds.filter(([, title]) => row.title.startsWith(title));
    requireThat(matches.length === 1 && !seen.has(matches[0][0]), name + ': missing or duplicate test identity ' + row.title);
    const id = matches[0][0]; seen.add(id);
    requireThat(row.status === (red.has(id) ? 'failed' : 'passed'), name + ': wrong outcome for ' + id);
    if (red.has(id)) requireThat(row.failureMessages.length > 0 && row.failureMessages.every(message => message.includes('AssertionError:')), name + ': non-assertion failure for ' + id);
  }
  const counters = { runtimeSuites: report.numRuntimeErrorTestSuites ?? null, unhandledErrors: report.numUnhandledErrors ?? null };
  console.log(`  ${name}: ${report.numPassedTests} passed, ${report.numFailedTests} owned assertion failures, counters ${JSON.stringify(counters)}`);
}
try {
  const valueLine = '    value: customFounderValue(pr.rating, next.eraId, pr.age),\n';
  const text = original.toString('utf8');
  requireThat(text.split(valueLine).length === 2, 'graduate value omission anchor is not unique');
  const omitted = text.replace(valueLine, '');
  requireThat(omitted !== text && omitted.replace('    academyGrad: true,\n    potential: pr.potential,', '    academyGrad: true,\n' + valueLine + '    potential: pr.potential,') === text, 'omission control did not change and restore the whole source');
  const omissionPath = path.join(OUT, 'omitted-clubManager.ts');
  fs.writeFileSync(omissionPath, omitted);
  const old = spawnSync('git', ['show', 'cc9a55a2f35b6215d5e6e664cc401d10d7f76291:src/lib/clubManager.ts'], { cwd: ROOT, encoding: null, maxBuffer: 8 * 1024 * 1024 });
  requireThat(old.status === 0 && !old.error && !old.signal, 'cannot read the exact historical baseline');
  const oldBlob = createHash('sha1').update('blob ' + old.stdout.length + '\0').update(old.stdout).digest('hex');
  requireThat(oldBlob === 'cf378e002c1f253a4cd48a147af66117f982f6b2', 'historical baseline blob mismatch');
  const oldPath = path.join(OUT, 'original-clubManager.ts');
  fs.writeFileSync(oldPath, old.stdout);
  arm('current', TEST, null, ids, new Set());
  arm('current-lifecycle', LIFE, null, lifeIds, new Set());
  arm('original', TEST, oldPath, ids, economicReds);
  arm('original-lifecycle', LIFE, oldPath, lifeIds, new Set(lifeIds.map(([id]) => id)));
  arm('omission', TEST, omissionPath, ids, economicReds);
  requireThat(SHA(fs.readFileSync(CORE)) === held, 'source changed during copied controls');
  arm('restored', TEST, null, ids, new Set());
  arm('restored-lifecycle', LIFE, null, lifeIds, new Set());
  complete = true;
  console.log('simAcademyEconomics: 48 outcomes, 14 owned assertion failures, current and restored prices/save/growth passed');
} finally {
  requireThat(SHA(fs.readFileSync(CORE)) === held, 'Core source hold failed');
  for (const [file, hash] of heldFiles) requireThat(SHA(fs.readFileSync(file)) === hash, 'source/test/package hold failed: ' + file);
  console.log('  academy economics evidence: ' + OUT);
  if (complete && !process.env.ACADEMY_ECONOMICS_OUT) fs.rmSync(OUT, { recursive: true, force: true });
}
