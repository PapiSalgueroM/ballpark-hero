/* Offline outcome tests and effective copied controls for two reported games.
   REPORTED_POOLS_CONTROL selects one defect. Shared source bytes stay unchanged. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.env.REPORTED_POOLS_CONTROL || '';
const spec = {
  'stat-span': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: "label: 'Recorded seasons'", replacement: "label: 'Career span'", outcome: 'shows recorded seasons and franchises' },
  'stat-franchises': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: "label: 'Recorded franchises'", replacement: "label: 'Career franchises'", outcome: 'shows recorded seasons and franchises' },
  'stat-scope': { file: 'src/lib/statDetective.ts', alias: '@/lib/statDetective', old: 'Short stints and other seasons can be missing.', replacement: 'These are complete career dates.', outcome: 'explains the eligible season window' },
  'stat-context': { file: 'src/pages/StatDetective.tsx', alias: '@/pages/StatDetective', old: 'puzzleId: mystery?.key ?? null, player: mystery?.player ?? null,', replacement: 'puzzleId: null, player: null,', outcome: 'captures the exact random case and mode' },
  'dart-variety': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'const index = Math.floor(Math.random() * remaining.length);', replacement: 'const index = 0;', outcome: 'keeps the strongest three and varies five' },
  'dart-best': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'const picks = eligible.slice(0, 3);', replacement: 'const picks = eligible.slice(-3);', outcome: 'keeps the strongest three and varies five' },
  'dart-used': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: 'used.has(key) || seen.has(key)', replacement: 'false', outcome: 'keeps used names and wrong positions out' },
  'dart-slot': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: '!fitsSlot(player, slot)', replacement: 'false', outcome: 'keeps used names and wrong positions out' },
  'dart-global': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: '.range(from, to));', replacement: '.range(from, to).limit(900));', outcome: 'pages global 2026 rows' },
  'dart-country': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('nationality', names)", replacement: ".in('nationality', names).limit(120)", outcome: 'pages a country beyond 120' },
  'dart-position': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('position', rawPositionsFor(slot))", replacement: ".in('position', rawPositionsFor(slot)).limit(12)", outcome: 'pages the targeted position fallback beyond 12' },
  'dart-year': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: ".eq('year', 2026)", replacement: ".eq('year', 2025)", outcome: 'pages global 2026 rows' },
  'dart-nation': { file: 'src/lib/dartMap.ts', alias: '@/lib/dartMap', old: ".in('nationality', names)", replacement: '', outcome: 'pages a country beyond 120' },
  'dart-partial': { file: 'src/lib/dartDraft.ts', alias: '@/lib/dartDraft', old: 'if (error || !data || data.length === 0)', replacement: 'if (!data || data.length === 0)', outcome: 'fails closed rather than returning a partial' },
};
assert.ok(!mode || mode in spec, 'Unknown copied control');
const files = ['src/lib/statDetective.ts', 'src/pages/StatDetective.tsx', 'src/lib/dartMap.ts', 'src/lib/dartDraft.ts'];
const originals = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(root, file), 'utf8')])));
let folder;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1800' };
  delete env.NO_DOUBLE_SWAP;
  if (mode) {
    const control = spec[mode]; const before = originals.get(control.file);
    assert.equal(before.split(control.old).length - 1, 1, 'Control must target one actual binding');
    let after = before.replace(control.old, control.replacement);
    assert.notEqual(after, before, 'Control must alter actual source');
    if (control.alias === '@/pages/StatDetective') after = after.replace("'./StatDetective.module.css'", "'@/pages/StatDetective.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/reported-pools-'));
    const copy = path.join(folder, path.basename(control.file)); await writeFile(copy, after);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [control.alias]: copy });
    console.log(`Effective copied control ${mode}: exact binding changed once.`);
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/statDetectiveScope.test.tsx', 'src/test/dartDraftPools.test.ts', '--reporter=verbose', '--testTimeout=60000'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /statDetectiveScope\.test\.tsx/); assert.match(output, /dartDraftPools\.test\.ts/);
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Setup failures earn no control credit');
  if (mode) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its outcome');
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(spec[mode].outcome)), 'Intended outcome must fail');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/); assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i);
    console.log(`simReportedGamePools ${mode}: intended defect caught, independent outcomes also ran.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /10 passed/);
    console.log('simReportedGamePools: ten offline actual-page and real-pool outcomes passed.');
  }
  for (const [file, bytes] of originals) assert.equal(await readFile(path.join(root, file), 'utf8'), bytes, `Shared source preserved: ${file}`);
} finally { if (folder) await rm(folder, { recursive: true, force: true }); }