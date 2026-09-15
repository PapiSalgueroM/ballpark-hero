/** Round 587: actual page saves, failed writes, retries and live deadlines.
 * Every control rewrites a unique source anchor in OS temp, then runs only its
 * intended real-page test. No app source or shared build output is modified.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-set-piece-page-'));
const CONTROL = process.env.SETPIECE_PAGE_CONTROL || '';
const targets = {
  opening: '1 opening persists',
  openearly: '2 a failed opening save',
  roundtrip: '3 a scored kick survives reload',
  goalearly: '4 a failed goal save',
  retry: '4 a failed goal save',
  close: '1 opening persists',
  clock: '5 the clock continues',
  fulltime: '5 the clock continues',
  rep: '6 selling up expires',
  score: '3 a scored kick survives reload',
  minute: '5 the clock continues',
  setup: '3 a scored kick survives reload',
};
assert(!CONTROL || CONTROL in targets, `Unknown SETPIECE_PAGE_CONTROL=${CONTROL}`);
const replace = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, `control must find one executable anchor: ${before}`);
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change executable source');
  return changed;
};

try {
  const alias = { '@': path.join(ROOT, 'src') };
  if (CONTROL) {
    let hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useStadiumTycoon.ts'), 'utf8').replaceAll('\r\n', '\n');
    let page = fs.readFileSync(path.join(ROOT, 'src/pages/StadiumTycoon.tsx'), 'utf8').replaceAll('\r\n', '\n');
    if (CONTROL === 'opening') hook = replace(hook,
      'try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); }\n    catch {',
      'try { void next; }\n    catch {');
    if (CONTROL === 'openearly') hook = replace(hook,
      'const next = beginSetPiece(stateRef.current, offer);\n    if (next === stateRef.current) return;',
      'const next = beginSetPiece(stateRef.current, offer);\n    if (next === stateRef.current) return;\n    commit(next);');
    if (CONTROL === 'roundtrip') hook = replace(hook, 'commit(awarded.state);', 'commit(awarded.state); stateRef.current = before;');
    if (CONTROL === 'goalearly') hook = replace(hook, "if (!awarded) return 'expired';", "if (!awarded) return 'expired';\n    commit(awarded.state);");
    if (CONTROL === 'retry') hook = replace(hook,
      "if (!scored || before.setPieceUsedMatch === offer.match) return 'accepted';",
      "if (!scored) return 'accepted';\n    delete before.setPieceUsedMatch;");
    if (CONTROL === 'close') hook = replace(hook,
      'const closeSetPiece = useCallback(() => { setActiveSetPiece(null);',
      'const closeSetPiece = useCallback(() => { delete stateRef.current.setPieceAttemptedMatch; setActiveSetPiece(null);');
    if (CONTROL === 'clock') hook = replace(hook, 'const use = acc;', "const use = document.querySelector('[data-tycoon-set-piece]') ? 0 : acc;");
    if (CONTROL === 'fulltime') page = replace(page,
      'expired={kickClosed}',
      'expired={false}');
    if (CONTROL === 'rep') page = replace(page,
      'const kickClosed = !g.activeSetPiece || s.rep !== g.activeSetPiece.rep || (s.totalMatches ?? 0) !== g.activeSetPiece.match || s.minute >= 90;',
      'const kickClosed = !g.activeSetPiece || (s.totalMatches ?? 0) !== g.activeSetPiece.match || s.minute >= 90;');
    if (CONTROL === 'score') page = replace(page, "`Match ${s.minute}' · ${s.goalsFor} - ${s.goalsAgainst}`", "`Match ${s.minute}' · 0 - 0`");
    if (CONTROL === 'minute') page = replace(page, "`Match ${s.minute}' · ${s.goalsFor} - ${s.goalsAgainst}`", "`Match ${g.activeSetPiece?.minute}' · ${s.goalsFor} - ${s.goalsAgainst}`");
    const hookPath = path.join(TEMP, 'useStadiumTycoon.ts');
    const pagePath = path.join(TEMP, 'StadiumTycoon.tsx');
    fs.writeFileSync(hookPath, hook);
    fs.writeFileSync(pagePath, page);
    // Specific aliases precede the general @ alias when Vite resolves them.
    delete alias['@'];
    alias['@/hooks/useStadiumTycoon'] = hookPath;
    alias['@/pages/StadiumTycoon'] = pagePath;
    if (CONTROL === 'setup') {
      const board = fs.readFileSync(path.join(ROOT, 'src/components/tycoon/SetPieceBoard.tsx'), 'utf8');
      const boardPath = path.join(TEMP, 'SetPieceBoard.tsx');
      fs.writeFileSync(boardPath, replace(board,
        'const kick = useMemo(() => buildRun(seed)[kickIndex], [seed, kickIndex]);',
        'const kick = buildRun(seed)[kickIndex];'));
      alias['@/components/tycoon/SetPieceBoard'] = boardPath;
    }
    alias['@'] = path.join(ROOT, 'src');
    console.log(`CONTROL ${CONTROL}: one unique executable mutation applied outside src`);
  }
  const configPath = path.join(TEMP, 'vitest.config.mjs');
  const reportPath = path.join(TEMP, 'report.json');
  const config = {
    root: ROOT,
    test: { environment: 'jsdom', globals: true, setupFiles: [path.join(ROOT, 'src/test/setup.ts')], include: ['src/test/tycoonSetPiecePage.test.tsx'], testTimeout: 30000, hookTimeout: 30000 },
    esbuild: { jsx: 'automatic' },
    resolve: { alias, dedupe: ['react', 'react-dom', 'lucide-react'] },
    server: { fs: { allow: [ROOT, TEMP, fs.realpathSync(path.join(ROOT, 'node_modules'))] } },
  };
  fs.writeFileSync(configPath, `export default ${JSON.stringify(config)};\n`);
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/tycoonSetPiecePage.test.tsx', '--config', configPath, '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportPath}`];
  if (CONTROL) args.push('-t', targets[CONTROL]);
  const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
  if (run.error) throw run.error;
  console.log(run.stdout || '');
  if (run.stderr) console.error(run.stderr);
  assert(fs.existsSync(reportPath), 'real-page test process produced no report');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  if (CONTROL) {
    const target = rows.find(row => row.title.startsWith(targets[CONTROL]));
    assert(target, 'the intended real-page control test was not collected');
    assert.equal(target.status, 'failed', 'the intended real-page outcome did not fail');
    assert.equal(run.status, 1, 'control failed outside the intended runtime assertion');
    console.log(`CONTROL PROVED ${CONTROL}: ${target.title}`);
    process.exitCode = 1;
  } else {
    assert.equal(rows.length, 6, 'the real-page cases must not be thinned');
    assert.equal(rows.filter(row => row.status === 'passed').length, 6, 'a real-page outcome failed');
    assert.equal(run.status, 0);
    console.log('Tycoon set-piece page: 6/6 actual page cases passed');
  }
} finally {
  assert.equal(path.dirname(path.resolve(TEMP)), path.resolve(os.tmpdir()), 'cleanup must stay in the OS temp directory');
  assert(path.basename(TEMP).startsWith('tycoon-set-piece-page-'));
  fs.rmSync(TEMP, { recursive: true, force: true });
}
