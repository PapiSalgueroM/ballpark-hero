/**
 * Round 848: three verified defects from the other lane's audit of the live
 * site (docs/audits/FORENSIC-QUALITY-AUDIT-2026-10-01.md), repaired in the
 * shared daily code, and the proof that they stay repaired.
 *
 *   QA847-02  a stale Daily tab wrote its own log over a newer save, so two
 *             tabs on one daily could undo a decided round. useDailyPuzzle
 *             now adopts a stored log that is ahead instead of writing, and
 *             follows the storage event.
 *   QA847-03  a well formed save with malformed guesses broke the page, and
 *             the retry broke on the same bytes. The shared restore now checks
 *             the shape, and each game whose page read item fields unguarded
 *             hands in its own check (src/lib/dailySaveShapes.ts).
 *   QA847-04  the skip link had no target on 19 pages.
 *
 * What it runs (vitest, the real hooks and pages, jsdom):
 *   saves    src/test/dailySaveHardening.test.tsx, then regenerates
 *            src/test/fixtures/dailySavesPre848.json from the hook and the six
 *            consumer hooks as they stood at PRE (git) and fails on any
 *            difference, so the "old saves load unchanged" fixture is provably
 *            what the old code writes.
 *   shapes   src/test/dailySaveShapes.test.tsx: all 36 routes with a daily
 *            consumer, under every damaged form.
 *   skip     src/test/skipTarget.test.tsx: every sitemap page, reset-password
 *            and an unknown address, exactly one skip target each.
 * R848_PART=saves|shapes|skip runs one part (default all, about three and a
 * half minutes on the owner's machine; the parts measured 15s, 90s and 75s).
 *
 * Before any of that, a source check: every useDailyPuzzle consumer in src is
 * either on a route the shapes test mounts, or one of the unrouted hooks the
 * hardening test mounts. A consumer added later fails here until it is.
 *
 * Negative controls, one per run (R848_CONTROL), each on a copy swapped in
 * through NO_DOUBLE_SWAP, each anchor asserted present exactly once first:
 *   stale   the addGuess guard removed: exactly the twelve stale tab rows of
 *           sections 1 and 2 must fail on an assertion, everything else pass.
 *   event   the storage listener removed: exactly the ten storage event rows.
 *   shape   the shared shape check removed: the shapes test must go red, with
 *           every route whose game hands in no check of its own throwing.
 *   skip    the target removed from Free Kick: that row, and only that row.
 *
 * All outcomes are deterministic (fixed clock, Math.random pinned, no network),
 * so there are no bands: the counts below are exact and were the same on every
 * run. Measured 2026-10-01: against the hook before this round 35 of the 36
 * routes threw on the audit's forms; before the skip fix 19 addresses had no
 * target, the same 19 the audit counted.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Resolved by walking up, so a worktree inside the repo finds the main tree's. */
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');
const PRE = '617b8354';
const PART = process.env.R848_PART || 'all';
const CONTROL = process.env.R848_CONTROL || '';
const CONTROLS = ['stale', 'event', 'shape', 'skip'];
assert.ok(['all', 'saves', 'shapes', 'skip'].includes(PART), `unknown R848_PART ${PART}`);
assert.ok(!CONTROL || CONTROLS.includes(CONTROL), `unknown R848_CONTROL ${CONTROL}`);

const HARDENING = 'src/test/dailySaveHardening.test.tsx';
const SHAPES = 'src/test/dailySaveShapes.test.tsx';
const SKIP = 'src/test/skipTarget.test.tsx';
const FIXTURE = 'src/test/fixtures/dailySavesPre848.json';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
const WORK = fs.mkdtempSync(path.join(ROOT, '.sim-control', 'r848-'));
let failures = 0;
const fail = (m) => { failures += 1; console.error('  FAIL: ' + m); };

function vitest(file, { swaps = {}, env = {}, pattern = '' } = {}) {
  const out = path.join(WORK, `report-${Math.random().toString(36).slice(2)}.json`);
  const args = [VITEST, 'run', file, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'];
  if (pattern) args.push('-t', pattern);
  const runEnv = { ...process.env, ...env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' };
  delete runEnv.NO_DOUBLE_SWAP; delete runEnv.ONLY;
  if (Object.keys(swaps).length) runEnv.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env: runEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600000 });
  const text = (r.stdout || '') + '\n' + (r.stderr || '');
  assert.ok(!r.error && !r.signal, `${file}: the runner finished (${r.error?.message ?? r.signal ?? ''})`);
  assert.doesNotMatch(text, /Failed to (?:resolve import|load)|Cannot find module|Transform failed|Test timed out/, `${file}: no runner fault earns outcome credit`);
  assert.ok(fs.existsSync(out), `${file}: vitest wrote its report`);
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0, `${file}: no unhandled errors`);
  const rows = report.testResults.flatMap((f) => f.assertionResults.map((a) => ({
    title: [...a.ancestorTitles, a.title].join(' > '), status: a.status, messages: (a.failureMessages || []).join('\n'),
  })));
  return { status: r.status, text, report, rows };
}

function copyWith(rel, edits, name) {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  src = src.replace(/\r\n/g, '\n');
  for (const [from, to] of edits) {
    assert.equal(src.split(from).length - 1, 1, `control anchor occurs exactly once in ${rel}: ${from.trim().slice(0, 70)}`);
    src = src.replace(from, to);
  }
  const target = path.join(WORK, name);
  fs.writeFileSync(target, src.replace(/\n/g, eol));
  return target;
}

const lines = (text, tag) => [...text.matchAll(new RegExp(`^${tag} (.+)$`, 'gm'))].map((m) => JSON.parse(m[1]));

try {
  /* ------------------------------------------------------- 0) coverage */
  console.log('0) every useDailyPuzzle consumer is mounted by one of the two tests');
  const files = [];
  const walk = (dir) => { for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const rel = `${dir}/${d.name}`; if (d.isDirectory()) walk(rel); else if (/\.tsx?$/.test(d.name) && !/\.test\./.test(d.name) && !d.name.startsWith('__control')) files.push(rel); } };
  walk('src');
  const consumers = files.filter((f) => f !== 'src/hooks/useDailyPuzzle.ts' && /useDailyPuzzle\s*(?:<[^>]*>)?\s*\(/.test(code(read(f))));
  const app = code(read('src/App.tsx'));
  const lazy = new Map([...app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/([^"]+)"\)\)/g)].map((m) => [m[1], `src/${m[2]}`]));
  const routed = [...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+)/g)].filter((m) => lazy.has(m[2])).map((m) => [m[1], lazy.get(m[2])]);
  const importsOf = new Map();
  for (const f of files) {
    const out = [];
    for (const m of read(f).matchAll(/from\s+['"](@\/[^'"]+|\.{1,2}\/[^'"]+)['"]/g)) {
      const base = m[1].startsWith('@/') ? `src/${m[1].slice(2)}` : path.posix.join(path.posix.dirname(f), m[1]);
      const hit = ['.tsx', '.ts', '/index.tsx', '/index.ts', ''].map((e) => base + e).find((p) => fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isFile());
      if (hit) out.push(hit);
    }
    importsOf.set(f, out);
  }
  const reaches = (f, target, seen = new Set()) => f === target || (!seen.has(f) && (seen.add(f), (importsOf.get(f) || []).some((g) => reaches(g, target, seen))));
  const shapesRoutes = new Set([...read(SHAPES).matchAll(/\{ route: '([^']+)'/g)].map((m) => m[1]));
  const hardening = code(read(HARDENING));
  const needRoutes = new Set();
  const unrouted = [];
  for (const c of consumers) {
    const rs = routed.filter(([, p]) => reaches(['.tsx', '.ts'].map((e) => p + e).find((x) => fs.existsSync(path.join(ROOT, x))), c)).map(([r]) => r);
    if (rs.length) rs.forEach((r) => needRoutes.add(r));
    else unrouted.push(c);
  }
  for (const r of needRoutes) if (!shapesRoutes.has(r)) fail(`${r} renders a useDailyPuzzle consumer but ${SHAPES} does not mount it`);
  for (const r of shapesRoutes) if (!needRoutes.has(r)) fail(`${SHAPES} mounts ${r}, which renders no useDailyPuzzle consumer`);
  for (const c of unrouted) {
    const hook = path.basename(c).replace(/\.tsx?$/, '');
    if (!new RegExp(`hook: ${hook}\\b`).test(hardening)) fail(`${c} is rendered by no route and ${HARDENING} section 4 does not mount it`);
  }
  /* A game checks its own log when it hands in isValidGuesses, or when its
     deserializer is more than a type assertion (Missing XI filters). */
  const checked = consumers.filter((c) => {
    const src = code(read(c));
    return /isValidGuesses\s*:/.test(src) || !/deserializeGuesses:\s*\(?raw\)?\s*=>\s*raw as /.test(src);
  });
  console.log(`   ${consumers.length} consumers: ${needRoutes.size} routes in the shapes test, ${unrouted.length} unrouted (${unrouted.map((c) => path.basename(c)).join(', ')}) in the hardening test; ${checked.length} hand in their own check`);
  assert.equal(failures, 0, 'coverage');

  const hookFile = 'src/hooks/useDailyPuzzle.ts';

  /* ---------------------------------------------------------- controls */
  if (CONTROL === 'stale' || CONTROL === 'event') {
    const edit = CONTROL === 'stale'
      ? ['      if (adoptNewerSaveRef.current()) return;\n', '']
      : ["    window.addEventListener('storage', onStorage);\n", '    void onStorage;\n'];
    const copy = copyWith(hookFile, [edit], 'useDailyPuzzle.ts');
    const run = vitest(HARDENING, { swaps: { '@/hooks/useDailyPuzzle': copy } });
    const want = CONTROL === 'stale'
      ? (t) => /a tab behind the stored log takes it over|a finish taken over from another tab|: the stale tab cannot drop a decided round|Shirt Number: a stale tab cannot drop/.test(t)
      : (t) => /an open tab follows another tab through the storage event|: an open tab moves to the saved round/.test(t);
    const expected = CONTROL === 'stale' ? 12 : 10;
    const failed = run.rows.filter((r) => r.status === 'failed');
    const intended = run.rows.filter((r) => want(r.title));
    assert.equal(intended.length, expected, `the control's ${expected} target rows exist`);
    for (const r of intended) if (r.status !== 'failed' || !/AssertionError/.test(r.messages)) fail(`${r.title} did not fail on an assertion under the ${CONTROL} control`);
    for (const r of failed) if (!want(r.title)) fail(`${r.title} failed under the ${CONTROL} control but is not one of its rows`);
    assert.notEqual(run.status, 0, 'the run is red');
    console.log(`R848 ${CONTROL} control: ${failed.length} rows red, exactly the ${expected} ${CONTROL === 'stale' ? 'stale tab' : 'storage event'} rows, ${run.rows.filter((r) => r.status === 'passed').length} green`);
  } else if (CONTROL === 'shape') {
    const copy = copyWith(hookFile, [['      if (!isGuessLog(guesses) || !GAME_STATUSES.includes(saved.gameStatus)) return null;\n', '']], 'useDailyPuzzle.ts');
    const run = vitest(SHAPES, { swaps: { '@/hooks/useDailyPuzzle': copy } });
    const result = new Map(lines(run.text, 'R848_SHAPES').map((l) => [l.route, l.failures]));
    const unchecked = new Set();
    for (const c of consumers.filter((x) => !checked.includes(x))) {
      for (const [r, p] of routed) if (reaches(['.tsx', '.ts'].map((e) => p + e).find((x) => fs.existsSync(path.join(ROOT, x))), c)) unchecked.add(r);
    }
    for (const r of unchecked) {
      const f = result.get(r);
      if (!f || !f.some((m) => /threw/.test(m))) fail(`${r} has no check of its own, yet nothing threw with the shared check removed`);
    }
    assert.notEqual(run.status, 0, 'the run is red');
    console.log(`R848 shape control: ${run.rows.filter((r) => r.status === 'failed').length} of ${run.rows.length} routes red; all ${unchecked.size} routes whose game hands in no check threw`);
  } else if (CONTROL === 'skip') {
    const copy = copyWith('src/pages/FreeKick.tsx', [['<main id="dukb-main" tabIndex={-1} className=', '<main className=']], 'FreeKick.tsx');
    const run = vitest(SKIP, { swaps: { '@/pages/FreeKick': copy } });
    const failed = run.rows.filter((r) => r.status === 'failed');
    if (failed.length !== 1 || !/> \/free-kick$/.test(failed[0].title)) fail(`expected exactly the /free-kick row red, got ${failed.map((r) => r.title).join(', ') || 'none'}`);
    else if (!/AssertionError/.test(failed[0].messages)) fail('the /free-kick row failed on something other than its count');
    const counts = lines(run.text, 'R848_SKIP')[0] || {};
    console.log(`R848 skip control: /free-kick drew ${counts['/free-kick']} targets, ${run.rows.length - failed.length} other rows green`);
  } else {
    /* ------------------------------------------------------- the parts */
    if (PART === 'all' || PART === 'saves') {
      console.log('saves) two tabs, damaged saves on the hooks, saves from before this round');
      const run = vitest(HARDENING);
      const passed = run.rows.filter((r) => r.status === 'passed').length;
      const pending = run.rows.filter((r) => r.status !== 'passed' && r.status !== 'failed');
      for (const r of run.rows.filter((x) => x.status === 'failed')) fail(`${r.title}: ${r.messages.split('\n')[0]}`);
      if (pending.length !== 1 || !/captures saves/.test(pending[0].title)) fail('only the fixture writer may be skipped in an ordinary run');
      console.log(`   ${passed} rows green, the fixture writer skipped`);

      execFileSync('git', ['cat-file', '-e', `${PRE}^{commit}`], { cwd: ROOT });
      const old = ['src/hooks/useDailyPuzzle.ts', 'src/hooks/useAflHL.ts', 'src/hooks/useNflHL.ts', 'src/hooks/useShirtNumber.ts', 'src/hooks/useGame.ts', 'src/hooks/useUfcGame.ts', 'src/hooks/useNbaConnections.ts'];
      const swaps = {};
      for (const rel of old) {
        const src = execFileSync('git', ['show', `${PRE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
        const target = path.join(WORK, 'pre-' + path.basename(rel));
        fs.writeFileSync(target, src);
        swaps['@/' + rel.slice(4).replace(/\.tsx?$/, '')] = target;
      }
      assert.doesNotMatch(fs.readFileSync(swaps['@/hooks/useDailyPuzzle'], 'utf8'), /adoptNewerSave|isGuessLog/, 'the swapped hook is the one from before this round');
      const outFile = path.join(WORK, 'saves.json');
      const writer = vitest(HARDENING, { swaps, env: { R848_SAVES_OUT: outFile }, pattern: 'captures saves' });
      const wrote = writer.rows.find((r) => /captures saves/.test(r.title));
      if (!wrote || wrote.status !== 'passed') fail(`the fixture writer did not pass under the pre ${PRE} code: ${wrote?.messages.split('\n')[0] ?? 'missing'}`);
      else if (process.env.R848_WRITE_FIXTURE === '1') {
        fs.writeFileSync(path.join(ROOT, FIXTURE), fs.readFileSync(outFile, 'utf8'));
        console.log(`   wrote ${FIXTURE} from the code at ${PRE}`);
      } else {
        const fresh = JSON.parse(fs.readFileSync(outFile, 'utf8'));
        const committed = JSON.parse(read(FIXTURE));
        try { assert.deepEqual(committed, fresh); } catch { fail(`${FIXTURE} is not what the code at ${PRE} writes today; rerun with R848_WRITE_FIXTURE=1 only if that change is intended`); }
        console.log(`   ${FIXTURE}: ${committed.saves.length} saves, byte for byte what the hooks at ${PRE} write (${committed.saves.map((s) => s.game).join(', ')})`);
      }
    }
    if (PART === 'all' || PART === 'shapes') {
      console.log('shapes) every route with a daily consumer under every damaged form');
      const run = vitest(SHAPES);
      const result = lines(run.text, 'R848_SHAPES');
      if (result.length !== shapesRoutes.size) fail(`expected ${shapesRoutes.size} route results, got ${result.length}`);
      for (const l of result) if (l.failures.length) fail(`${l.route}: ${l.failures.join('; ').slice(0, 300)}`);
      for (const r of run.rows.filter((x) => x.status !== 'passed')) fail(`${r.title} ${r.status}`);
      console.log(`   ${result.filter((l) => !l.failures.length).length} of ${shapesRoutes.size} routes mount every damaged form as a fresh daily, nothing thrown`);
    }
    if (PART === 'all' || PART === 'skip') {
      console.log('skip) one skip target on every page');
      const run = vitest(SKIP);
      const counts = lines(run.text, 'R848_SKIP')[0] || {};
      const sitemap = read('public/sitemap.xml').match(/<loc>/g).length;
      if (Object.keys(counts).length !== sitemap + 2) fail(`expected ${sitemap + 2} addresses, measured ${Object.keys(counts).length}`);
      const off = Object.entries(counts).filter(([, n]) => n !== 1);
      for (const [a, n] of off) fail(`${a} draws ${n} skip targets`);
      for (const r of run.rows.filter((x) => x.status !== 'passed')) fail(`${r.title} ${r.status}`);
      console.log(`   ${Object.keys(counts).length - off.length} of ${Object.keys(counts).length} addresses (${sitemap} sitemap pages, reset-password, an unknown address) draw exactly one #dukb-main`);
    }
  }
} finally {
  fs.rmSync(WORK, { recursive: true, force: true });
}

if (failures) {
  console.error(`simDailySaveHardening: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`simDailySaveHardening: ${CONTROL ? `control ${CONTROL} fired as designed` : `part ${PART} green`}`);
