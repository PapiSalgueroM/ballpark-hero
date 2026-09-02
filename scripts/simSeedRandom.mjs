/**
 * Round 409 harness: the default seeded stream belongs to the harness name,
 * not to the checkout directory containing it.
 *
 * The same entry basename is run from two temporary directories, then two
 * different basenames and one explicit seed are checked as controls.
 * SIM_SEED_RANDOM_CONTROL=absolute-path copies the helper and restores the
 * old absolute-path hash so this regression test proves it can fail.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const HELPER = path.join(HERE, 'lib', 'seedRandom.mjs');
const CONTROL = process.env.SIM_SEED_RANDOM_CONTROL || '';

if (CONTROL && CONTROL !== 'absolute-path') {
  console.error(`SIM_SEED_RANDOM_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const values = 8;
const entrySource = helperUrl => `
import '${helperUrl}';
console.log(JSON.stringify(Array.from({ length: ${values} }, () => Math.random())));
`;

function runEntry(entry, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  if (!Object.hasOwn(extraEnv, 'SIM_SEED')) delete env.SIM_SEED;
  const result = spawnSync(process.execPath, [entry], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`child ${entry} exited ${result.status}: ${(result.stderr || '').trim()}`);
  }
  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error(`child ${entry} printed ${lines.length} result lines`);
  const sequence = JSON.parse(lines[0]);
  if (!Array.isArray(sequence) || sequence.length !== values) {
    throw new Error(`child ${entry} did not print ${values} random values`);
  }
  return sequence;
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const temp = mkdtempSync(path.join(os.tmpdir(), 'dukb-seed-random-'));
try {
  const left = path.join(temp, 'left');
  const right = path.join(temp, 'right');
  mkdirSync(left);
  mkdirSync(right);

  let helperPath = HELPER;
  if (CONTROL === 'absolute-path') {
    const source = readFileSync(HELPER, 'utf8');
    const stableHash = "hashString(basename(process.argv[1] || 'harness'))";
    const oldHash = "hashString(process.argv[1] || 'harness')";
    const oldSource = source.replace(stableHash, oldHash);
    if (oldSource === source) {
      throw new Error('absolute-path control was a no-op: stable hash expression was not found');
    }
    helperPath = path.join(temp, 'seedRandom-old.mjs');
    writeFileSync(helperPath, oldSource);
    console.log('NEGATIVE CONTROL ON: temporary helper copy uses the old absolute-path hash');
  }

  const helperUrl = pathToFileURL(helperPath).href;
  const sameName = 'same-entry.mjs';
  const leftSame = path.join(left, sameName);
  const rightSame = path.join(right, sameName);
  writeFileSync(leftSame, entrySource(helperUrl));
  writeFileSync(rightSame, entrySource(helperUrl));
  const leftSequence = runEntry(leftSame);
  const rightSequence = runEntry(rightSame);
  const samePathIndependent = same(leftSequence, rightSequence);

  const alpha = path.join(left, 'alpha-entry.mjs');
  const beta = path.join(left, 'beta-entry.mjs');
  writeFileSync(alpha, entrySource(helperUrl));
  writeFileSync(beta, entrySource(helperUrl));
  const alphaSequence = runEntry(alpha);
  const betaSequence = runEntry(beta);
  const differentNamesDiffer = !same(alphaSequence, betaSequence);

  const explicitEnv = { SIM_SEED: '409' };
  const explicitLeft = runEntry(leftSame, explicitEnv);
  const explicitRight = runEntry(rightSame, explicitEnv);
  const explicitPathIndependent = same(explicitLeft, explicitRight);
  const explicitMatchesName = same(explicitLeft, runEntry(alpha, explicitEnv));

  console.log(`same basename, different directories: ${JSON.stringify(leftSequence)} / ${JSON.stringify(rightSequence)}`);
  console.log(`different basenames produce different defaults: ${differentNamesDiffer ? 'yes' : 'no'}`);
  console.log(`explicit SIM_SEED=409 ignores path and basename: ${explicitPathIndependent && explicitMatchesName ? 'yes' : 'no'}`);

  if (CONTROL === 'absolute-path') {
    if (samePathIndependent) {
      console.error('FAIL: absolute-path control did not reproduce the expected same-basename difference');
      process.exitCode = 1;
    } else if (!differentNamesDiffer || !explicitPathIndependent || !explicitMatchesName) {
      console.error('FAIL: absolute-path control changed a check beyond the expected path difference');
      process.exitCode = 1;
    } else {
      console.log('simSeedRandom control: green. The old path-dependent stream failed the intended assertion.');
    }
  } else {
    if (!samePathIndependent) console.error('FAIL: same basename produced different default streams across directories');
    if (!differentNamesDiffer) console.error('FAIL: different basenames produced the same default stream');
    if (!explicitPathIndependent || !explicitMatchesName) console.error('FAIL: explicit SIM_SEED was not path-independent');
    if (!samePathIndependent || !differentNamesDiffer || !explicitPathIndependent || !explicitMatchesName) process.exitCode = 1;
    if (process.exitCode !== 1) console.log('simSeedRandom: PASS');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
