/**
 * Round 900: record the US career board fixture.
 *
 * Drives the four My Career boards (NFL, NBA, MLB, NHL) through
 * src/test/usBoardFixture.test.tsx in record mode and writes
 * scripts/data/usBoardFixture.json: every click of two whole careers per
 * sport with the save after each one, and every hub box of ten fixed saves.
 * scripts/simUsBoardParity.mjs replays it.
 *
 * When to run it: only when a round changes what a US career does ON PURPOSE.
 * A red replay after a refactor is the refactor's bug, not a stale fixture.
 *
 * The header records which tree the fixture came from. It is stamped with
 * main's sha only when src (tests aside) is byte for byte main's; any other
 * tree is stamped with its own head and says so.
 *
 * Nothing here reaches the network: the boards run in jsdom on local saves,
 * and the completions, badges and auth modules are mocked in the test file.
 *
 * Run: node scripts/recordUsBoardFixture.mjs            (writes the fixture)
 *      node scripts/recordUsBoardFixture.mjs <out.json>  (writes a scratch copy)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/usBoardFixture.test.tsx';
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'scripts/data/usBoardFixture.json'));
/* Resolved the way node resolves it, so a worktree that borrows the main tree's node_modules works too. */
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const head = git('rev-parse', 'HEAD').stdout.trim();
const base = git('merge-base', 'HEAD', 'origin/main').stdout.trim();
const scope = ['--', 'src', ':(exclude)src/test'];
const sameAsMain = base
  && git('diff', '--quiet', base, 'HEAD', ...scope).status === 0
  && git('status', '--porcelain', ...scope).stdout.trim() === '';
const stamp = sameAsMain ? `${base} (main; src outside src/test is byte for byte this commit)` : `${head} (not main: src differs from ${base || 'an unknown base'})`;

console.log(`recording from ${stamp}`);
const tmpOut = OUT + '.recording';
try { fs.rmSync(tmpOut, { force: true }); } catch { /* nothing to clear */ }
const r = spawnSync(
  process.execPath,
  [VITEST, 'run', TEST, '--reporter=default'],
  {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, US_BOARD_FIXTURE: 'record', US_BOARD_FIXTURE_OUT: tmpOut, US_BOARD_FIXTURE_SHA: stamp, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  },
);
const text = (r.stdout || '') + (r.stderr || '');
if (r.status !== 0 || !fs.existsSync(tmpOut)) {
  console.error(text.slice(-3000));
  console.error(`recordUsBoardFixture: Vitest exit ${r.status}, nothing written. A path that misses a screen is refused: read the message above.`);
  try { fs.rmSync(tmpOut, { force: true }); } catch { /* nothing to clear */ }
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.renameSync(tmpOut, OUT);
const fx = JSON.parse(fs.readFileSync(OUT, 'utf8'));
for (const [slug, s] of Object.entries(fx.sports)) {
  const screens = Object.values(s.screens).reduce((n, steps) => n + steps.length, 0);
  console.log(`  ${slug}: ${s.path.length} clicks on the path, ${s.coverage.seasons} seasons, ${Object.keys(s.saves).length} fixed saves, ${screens} screen steps`);
}
console.log(`recordUsBoardFixture: wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`);
