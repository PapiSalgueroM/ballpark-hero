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
 *   parity   (review) src/test/dailySaveParity.test.tsx with R848_PRE_HOOK set
 *            to the hook at PRE: all 39 consumers played through both hooks
 *            from the same storage with the same inputs (byte identical saves
 *            after every step, same state, same records), and every save the
 *            old hook wrote restored through the new one to the same state
 *            with its bytes untouched. One row per consumer, checked against
 *            the coverage count below.
 * R848_PART=saves|shapes|skip|parity runs one part (default all; the parts
 * measured 15s, 90s, 75s and 60s on the owner's machine, so run them one at a
 * time where a command may not pass four minutes).
 *
 * Before any of that, a source check: every useDailyPuzzle consumer in src is
 * either on a route the shapes test mounts, or one of the unrouted hooks the
 * hardening test mounts. A consumer added later fails here until it is.
 *
 * Negative controls, one per run (R848_CONTROL), each on a copy swapped in
 * through NO_DOUBLE_SWAP, each anchor asserted present exactly once first:
 *   stale   both stale tab layers removed (the addGuess guard and
 *           takeNewerSave): exactly the 30 stale tab rows of sections 1, 1b, 2,
 *           2b and the four click rows of 7 must fail on an assertion,
 *           everything else pass.
 *   guard   (review) only the addGuess guard removed: exactly the nine rows no
 *           takeNewerSave covers (the shared hook, 1b, Shirt Number, three
 *           click rows of 7). The Higher or Lower rows hold on takeNewerSave.
 *   turn    (review) only the rest-of-turn drop removed: exactly the three
 *           section 1b rows, where a stale Transfer Path tab used to record a
 *           win for a chain that never reached the target.
 *   verdict (review) takeNewerSave never takes over: exactly the eleven
 *           section 2b rows, where a stale tab showed a reveal, a "correct,
 *           you scored" or a "guesses left" for an answer that never counted,
 *           and section 7's Higher or Lower click row, whose reveal of the
 *           dropped answer hides the finish it took over (twelve).
 *   event   the storage listener removed: exactly the eighteen storage event
 *           rows (sections 1, 2, 7, 7b and 9).
 *   mark    (review) a finish taken over from another tab is not marked as
 *           restored: exactly the twelve rows that count the recorder across
 *           two tabs (section 1's, all of 7 and 7b, and 9's Hard run).
 *   finished (review) the guard ignores a stored finish no longer than this
 *           tab's log: exactly the two section 7b rows (a Footle or UFC give
 *           up in one tab, which the other tab could then win and record).
 *   decided (review) a finished tab may take a longer save over: exactly the
 *           section 8 row where a won tab must stay won.
 *   empty   (review) the shared check refuses an empty log: the parity rows
 *           for /footle and /ufc (a give up before any guess) must go red.
 *   strict  (review) Footle's check made one field stricter than Footle
 *           writes (it demands a direction arrow on every cell, which a
 *           matching cell never carries): the parity row for /footle must go
 *           red and every other parity row stay green.
 *   single  (review) the stale guard compares with greater or equal, so it
 *           fires in a single tab: parity must go red.
 *   shape   the shared shape check removed: the shapes test must go red, with
 *           every route whose game hands in no check of its own throwing.
 *   skip    the target removed from Free Kick: that row, and only that row.
 *   skipdiv (review) Free Kick's id moved off its main onto an empty div in
 *           front of it: still one target, so only the review's landmark
 *           checks (the target is the main where there is one, and it holds
 *           the page's content) can see it. That row, and only that row.
 *
 * Round 1210, the guide race. The shapes part flaked: one run in four alone,
 * and 12 of 12 runs red on GitHub runners with three side by side on
 * origin/main 074a9054 (result r1210-base-shapes: /olympics in all 12,
 * /nba-career in 2). The fault was the test's, not a page's or the daily
 * hook's: it took its "fresh" baseline after a counted settle, and the first
 * row to need a guide file could take it before that file's import landed
 * (the header of src/test/dailySaveShapes.test.tsx has the mechanism). Each
 * row now fetches its guide before its first mount and says so by name, and
 * every R848_SHAPES line carries guide: "ready" or "none". The shapes part
 * fails on a line that says anything else. Three more controls run the test
 * with the race switched on (R848_GUIDE), none of them depending on load:
 *   guideslow the loader answers 300 ms late and the row does its fetch: all
 *           36 rows green and every line says ready or none. The cure, shown
 *           under the very delay that made the red.
 *   guidelate the loader waits behind a gate and the row skips its fetch (the
 *           fix switched off): exactly the first row of each guide file red,
 *           on "drew a different page from a fresh daily" and "the fresh page
 *           moved while the row ran" and nothing else. The set is computed
 *           here from PATH_BUNDLE and the order of ROWS, never typed, and it
 *           must hold /olympics and /nba-career or the diagnosis is wrong.
 *           This is the recorded red, reproduced on demand.
 *   guideheld the gate never opens: every row with a guide red on the named
 *           assertion (inside a short bound, never a hang), none on a diff.
 *   guidepart (review of Round 1210) the test as guidelate runs it, read with
 *           the shapes PART's own judgement (shapesLineProblems): it must
 *           name every row whose route has a guide on the word "skipped" and
 *           none of the others. Until this the part's rule "a guide word
 *           other than ready or none fails" had no control of its own.
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
const CONTROLS = ['stale', 'guard', 'turn', 'verdict', 'event', 'mark', 'finished', 'decided', 'strict', 'single', 'empty', 'shape', 'skip', 'skipdiv', 'guideslow', 'guidelate', 'guideheld', 'guidepart'];
assert.ok(['all', 'saves', 'shapes', 'skip', 'parity'].includes(PART), `unknown R848_PART ${PART}`);
assert.ok(!CONTROL || CONTROLS.includes(CONTROL), `unknown R848_CONTROL ${CONTROL}`);

const HARDENING = 'src/test/dailySaveHardening.test.tsx';
const SHAPES = 'src/test/dailySaveShapes.test.tsx';
const SKIP = 'src/test/skipTarget.test.tsx';
const PARITY = 'src/test/dailySaveParity.test.tsx';
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
/** What the shapes part holds one R848_SHAPES line to. One function, so the
 *  guidepart control runs the part's own judgement and never a copy of it.
 *  Round 1210: a row whose baseline was taken without its guide proves nothing
 *  about the forms, so a guide word other than ready or none is a failure. */
const shapesLineProblems = (l) => {
  const out = [];
  if (l.failures.length) out.push(`${l.route}: ${l.failures.join('; ').slice(0, 300)}`);
  if (l.guide !== 'ready' && l.guide !== 'none') out.push(`${l.route}: its line says guide ${JSON.stringify(l.guide ?? null)}, so its baseline was not taken with the guide landed`);
  return out;
};

/* The parity test against the hook as it stood at PRE: the old hook is written
   into this run's folder from git and named by R848_PRE_HOOK. */
function parity(swaps) {
  execFileSync('git', ['cat-file', '-e', `${PRE}^{commit}`], { cwd: ROOT });
  const pre = path.join(WORK, 'pre-hook', 'useDailyPuzzle.ts');
  if (!fs.existsSync(pre)) {
    fs.mkdirSync(path.dirname(pre), { recursive: true });
    fs.writeFileSync(pre, execFileSync('git', ['show', `${PRE}:src/hooks/useDailyPuzzle.ts`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  }
  assert.doesNotMatch(fs.readFileSync(pre, 'utf8'), /adoptNewerSave|isGuessLog/, 'the old hook is the one from before this round');
  const run = vitest(PARITY, { swaps, env: { R848_PRE_HOOK: pre.split(path.sep).join('/') } });
  const rows = lines(run.text, 'R848_PARITY');
  assert.ok(rows.length > 0, 'the parity rows ran (R848_PRE_HOOK reached the test)');
  return { run, rows };
}

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
  if (['stale', 'guard', 'turn', 'verdict', 'event', 'mark', 'finished', 'decided'].includes(CONTROL)) {
    const GUARD = ['      if (droppingTurn.current) return;\n      if (adoptNewerSaveRef.current()) {\n        droppingTurn.current = true;\n        return;\n      }\n', ''];
    const TAKE = ['    if (!adoptNewerSaveRef.current()) return false;\n    droppingTurn.current = true;\n    return true;\n', '    return false;\n'];
    const edits = {
      stale: [GUARD, TAKE],
      guard: [GUARD],
      turn: [['      if (droppingTurn.current) return;\n', '']],
      verdict: [TAKE],
      event: [["    window.addEventListener('storage', onStorage);\n", '    void onStorage;\n']],
      mark: [["    if (stored.gameStatus !== 'playing') markRestoredFinish(gameSlug);\n", '']],
      finished: [["\n      || (stored.gameStatus !== 'playing' && statusRef.current === 'playing');\n", ';\n']],
      decided: [["loadedForKey.current !== loadKey || statusRef.current !== 'playing') return false;", 'loadedForKey.current !== loadKey) return false;']],
    }[CONTROL];
    const copy = copyWith(hookFile, edits, 'useDailyPuzzle.ts');
    const run = vitest(HARDENING, { swaps: { '@/hooks/useDailyPuzzle': copy } });
    /* Two layers stand between a stale tab and a decided round: addGuess
       refuses to write behind the stored log, and the games that show a
       verdict ask takeNewerSave first. The nine Higher or Lower audit rows
       (and the Higher or Lower click row of section 7) hold while either
       layer stands, so only stale (both removed) turns them. */
    const guardRows = /a tab behind the stored log takes it over|a finish taken over from another tab|1b\) a handler whose first answer is dropped|Shirt Number: a stale tab cannot drop|7\) .*(Connections|Transfer Path|Footle).*its own next click/;
    const hlRows = /: the stale tab cannot drop a decided round|7\) .*Higher or Lower: taken over through its own next click/;
    const verdictRows = /2b\) a dropped answer shows no verdict/;
    const want = {
      stale: (t) => guardRows.test(t) || hlRows.test(t) || verdictRows.test(t),
      guard: (t) => guardRows.test(t),
      turn: (t) => /1b\) a handler whose first answer is dropped/.test(t),
      verdict: (t) => verdictRows.test(t) || /7\) .*Higher or Lower: taken over through its own next click/.test(t),
      event: (t) => /an open tab follows another tab through the storage event|: an open tab moves to the saved round|7\) .*through the storage event|7b\) |9\) /.test(t),
      mark: (t) => /a finish taken over from another tab|7\) a finish is recorded once|7b\) |9\) .*Hard run/.test(t),
      finished: (t) => /7b\) /.test(t),
      decided: (t) => /8\) .*a finished tab is never sent back to playing/.test(t),
    }[CONTROL];
    const expected = { stale: 30, guard: 9, turn: 3, verdict: 12, event: 18, mark: 12, finished: 2, decided: 1 }[CONTROL];
    const failed = run.rows.filter((r) => r.status === 'failed');
    const intended = run.rows.filter((r) => want(r.title));
    assert.equal(intended.length, expected, `the control's ${expected} target rows exist`);
    for (const r of intended) if (r.status !== 'failed' || !/AssertionError/.test(r.messages)) fail(`${r.title} did not fail on an assertion under the ${CONTROL} control`);
    for (const r of failed) if (!want(r.title)) fail(`${r.title} failed under the ${CONTROL} control but is not one of its rows`);
    assert.notEqual(run.status, 0, 'the run is red');
    console.log(`R848 ${CONTROL} control: ${failed.length} rows red, exactly the ${expected} target rows, ${run.rows.filter((r) => r.status === 'passed').length} green`);
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
  } else if (CONTROL === 'strict' || CONTROL === 'single' || CONTROL === 'empty') {
    const swaps = CONTROL === 'strict'
      ? { '@/lib/dailySaveShapes': copyWith('src/lib/dailySaveShapes.ts', [["return isRecord(cell) && isText(cell.status) && (cell.value === null || typeof cell.value !== 'object');", "return isRecord(cell) && isText(cell.status) && isText(cell.arrow) && (cell.value === null || typeof cell.value !== 'object');"]], 'dailySaveShapes.ts') }
      : { '@/hooks/useDailyPuzzle': copyWith(hookFile, [CONTROL === 'single'
        ? ['    const ahead = stored.guesses.length > guessesRef.current.length\n', '    const ahead = stored.guesses.length >= guessesRef.current.length\n']
        : ['  return Array.isArray(value) && value.every((g) => g !== null && g !== undefined);\n', '  return Array.isArray(value) && value.length > 0 && value.every((g) => g !== null && g !== undefined);\n']], 'useDailyPuzzle.ts') };
    const { run, rows } = parity(swaps);
    const red = rows.filter((l) => l.problems > 0).map((l) => l.id).sort();
    const failedIds = run.rows.filter((x) => x.status === 'failed').map((r) => r.title.split(' > ').pop());
    const want = { strict: ['footle', 'ufc'], empty: ['footle', 'ufc'], single: null }[CONTROL];
    if (want) {
      if (red.join() !== want.join()) fail(`expected exactly ${want.join(', ')} red under the ${CONTROL} control, got ${red.join(', ') || 'none'}`);
      for (const id of failedIds) if (!red.includes(id)) fail(`${id} failed for another reason under the ${CONTROL} control`);
    } else {
      /* A guard that fires in one tab drops every second answer: a row goes
         red on its comparison, or on a driver that could not reach the state
         it plays to (Transfer Path's open step). Either is the control firing. */
      const broken = new Set([...red, ...failedIds]);
      if (broken.size < 30) fail(`a guard that fires in one tab must break nearly every consumer, only ${broken.size} went red`);
      red.splice(0, red.length, ...[...broken].sort());
    }
    assert.notEqual(run.status, 0, 'the run is red');
    console.log(`R848 ${CONTROL} control: ${red.length} of ${CONTROL === 'single' ? 39 : rows.length} parity rows red (${red.length > 8 ? `${red.slice(0, 8).join(', ')}, ...` : red.join(', ')})`);
  } else if (CONTROL === 'skip' || CONTROL === 'skipdiv') {
    const copy = copyWith('src/pages/FreeKick.tsx', [['<main id="dukb-main" tabIndex={-1} className=', CONTROL === 'skip' ? '<main className=' : '<div id="dukb-main" tabIndex={-1} /><main className=']], 'FreeKick.tsx');
    const run = vitest(SKIP, { swaps: { '@/pages/FreeKick': copy } });
    const failed = run.rows.filter((r) => r.status === 'failed');
    if (failed.length !== 1 || !/> \/free-kick$/.test(failed[0].title)) fail(`expected exactly the /free-kick row red, got ${failed.map((r) => r.title).join(', ') || 'none'}`);
    else if (!/AssertionError/.test(failed[0].messages)) fail('the /free-kick row failed on something other than its count');
    const counts = lines(run.text, 'R848_SKIP')[0] || {};
    console.log(`R848 ${CONTROL} control: /free-kick drew ${counts["/free-kick"]} target(s) and went red, ${run.rows.length - failed.length} other rows green`);
  } else if (['guideslow', 'guidelate', 'guideheld', 'guidepart'].includes(CONTROL)) {
    /* Round 1210: the guide race, switched on in the test (R848_GUIDE). Which
       rows are exposed is computed: the first row, in the test's own order, of
       each guide file PATH_BUNDLE names. guidepart runs the test as guidelate
       does (the fetch skipped) and reads it with the shapes PART's judgement. */
    const mode = CONTROL === 'guidepart' ? 'late' : CONTROL.slice('guide'.length);
    const loader = code(read('src/data/gameContent/loader.ts'));
    const at = loader.indexOf('export const PATH_BUNDLE');
    assert.ok(at >= 0, 'loader.ts declares PATH_BUNDLE');
    const bundleOf = new Map([...loader.slice(at, loader.indexOf('\n};', at)).matchAll(/'(\/[^']+)':\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
    assert.ok(bundleOf.size >= 100, `PATH_BUNDLE was read (${bundleOf.size} routes)`);
    const guided = [...shapesRoutes].filter((r) => bundleOf.has(r));
    const firstRows = [];
    const files = new Set();
    for (const r of guided) if (!files.has(bundleOf.get(r))) { files.add(bundleOf.get(r)); firstRows.push(r); }
    assert.ok(firstRows.length >= 2, 'at least two guide files are in play');
    const run = vitest(SHAPES, { env: { R848_GUIDE: mode } });
    const result = lines(run.text, 'R848_SHAPES');
    assert.equal(result.length, shapesRoutes.size, 'one R848_SHAPES line a route');
    const switched = lines(run.text, 'R848_GUIDE')[0];
    assert.ok(switched && switched.mode === mode, `the test ran with R848_GUIDE=${mode} (it printed ${JSON.stringify(switched ?? null)})`);
    const statusOf = new Map(run.rows.map((r) => [r.title.split(' > ').pop(), r.status]));
    const DIFF = /: drew a different page from a fresh daily, first at /;
    const MOVED = /^the fresh page moved while the row ran, first at /;
    const NAMED = /^the guide for this route had not landed when the baseline was taken/;
    const red = result.filter((l) => l.failures.length).map((l) => l.route);
    for (const l of result) if ((statusOf.get(l.route) === 'passed') !== (l.failures.length === 0)) fail(`${l.route}: the row is ${statusOf.get(l.route)} with ${l.failures.length} failure(s) on its line`);
    if (CONTROL === 'guidepart') {
      /* Review of Round 1210: the shapes part fails on a line whose guide
         word is not ready or none, and no control ever made it do so (the
         three above read l.guide themselves). With the fetch skipped every
         row that has a guide file says "skipped": the part's own judgement
         must name exactly those rows on that word, and none without a guide. */
      const WORD = /: its line says guide "skipped", so its baseline was not taken with the guide landed$/;
      const namedRows = result.filter((l) => shapesLineProblems(l).some((p) => WORD.test(p))).map((l) => l.route);
      if (guided.length < 2) fail(`only ${guided.length} rows have a guide file, so the control proves nothing`);
      if (namedRows.slice().sort().join() !== guided.slice().sort().join()) fail(`expected the shapes part's judgement to name exactly the ${guided.length} rows whose route has a guide, each on its guide word, got ${namedRows.length} (${namedRows.slice(0, 6).join(', ') || 'none'})`);
      assert.notEqual(run.status, 0, 'the run is red');
      console.log(`R848 guidepart control: with the fetch skipped the shapes part's own judgement named ${namedRows.length} rows on the guide word "skipped", exactly the ${guided.length} rows whose route has a guide, and none of the ${result.length - guided.length} without`);
    } else if (mode === 'slow') {
      if (switched.waited < firstRows.length) fail(`only ${switched.waited} loads were made to wait, fewer than the ${firstRows.length} guide files, so the delay never happened`);
      for (const l of result) {
        if (l.failures.length) fail(`${l.route} went red under a slow guide: ${l.failures.join('; ').slice(0, 300)}`);
        if (l.guide !== 'ready' && l.guide !== 'none') fail(`${l.route}: its line says guide ${JSON.stringify(l.guide)}, not ready or none`);
      }
      if (run.status !== 0) fail('the run is not green under a slow guide');
      console.log(`R848 guideslow control: ${result.filter((l) => !l.failures.length).length} of ${result.length} rows green with the loader 300 ms late (${switched.waited} loads waited), ${result.filter((l) => l.guide === 'ready').length} ready, ${result.filter((l) => l.guide === 'none').length} none`);
    } else if (mode === 'late') {
      for (const need of ['/olympics', '/nba-career']) {
        if (!firstRows.includes(need)) fail(`STOP: ${need} is not the first row of a guide file (first rows: ${firstRows.join(', ')}), so the diagnosis of the recorded red is wrong`);
      }
      if (red.slice().sort().join() !== firstRows.slice().sort().join()) fail(`expected exactly the first row of each guide file red (${firstRows.join(', ')}), got ${red.join(', ') || 'none'}`);
      for (const l of result.filter((x) => firstRows.includes(x.route))) {
        const other = l.failures.filter((f) => !DIFF.test(f) && !MOVED.test(f));
        if (other.length) fail(`${l.route} failed on something other than the page difference: ${other[0].slice(0, 200)}`);
        if (!l.failures.some((f) => DIFF.test(f))) fail(`${l.route}: no damaged form drew a different page, so the recorded red was not reproduced`);
        if (!l.failures.some((f) => MOVED.test(f))) fail(`${l.route}: the last fresh mount did not report that the fresh page moved`);
        if (l.guide !== 'skipped') fail(`${l.route}: its line says guide ${JSON.stringify(l.guide)}, the fetch was not skipped`);
      }
      assert.notEqual(run.status, 0, 'the run is red');
      console.log(`R848 guidelate control: ${red.length} rows red, exactly the first row of each of the ${firstRows.length} guide files (${firstRows.join(', ')}), ${result.length - red.length} green; every failure a page difference`);
    } else {
      for (const l of result) {
        if (!guided.includes(l.route)) { if (l.failures.length) fail(`${l.route} has no guide and went red with the guide held back`); continue; }
        if (l.failures.length !== 1 || !NAMED.test(l.failures[0])) fail(`${l.route}: expected the one named failure, got ${l.failures.length ? l.failures.join('; ').slice(0, 200) : 'none'}`);
        if (l.failures.some((f) => DIFF.test(f) || MOVED.test(f))) fail(`${l.route} failed on a page difference with the guide held back`);
      }
      assert.notEqual(run.status, 0, 'the run is red');
      console.log(`R848 guideheld control: ${red.length} rows red, exactly the ${guided.length} rows whose route has a guide, each on the named assertion; ${result.length - guided.length} rows with no guide green`);
    }
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
      assert.doesNotMatch(fs.readFileSync(swaps['@/hooks/useDailyPuzzle'], 'utf8').replace(/\r\n/g, '\n'), /adoptNewerSave|isGuessLog/, 'the swapped hook is the one from before this round');
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
      for (const l of result) for (const p of shapesLineProblems(l)) fail(p);
      for (const r of run.rows.filter((x) => x.status !== 'passed')) fail(`${r.title} ${r.status}`);
      console.log(`   ${result.filter((l) => !l.failures.length).length} of ${shapesRoutes.size} routes: nothing thrown on any damaged form, and the audit's and the brief's forms draw exactly a fresh daily (guide ready on ${result.filter((l) => l.guide === 'ready').length}, none on ${result.filter((l) => l.guide === 'none').length})`);
    }
    if (PART === 'all' || PART === 'parity') {
      console.log('parity) every consumer plays and restores through the new hook exactly as through the hook at ' + PRE);
      const { run, rows } = parity({});
      if (rows.length !== consumers.length) fail(`expected one parity row per consumer (${consumers.length}), got ${rows.length}`);
      for (const l of rows) if (l.problems || !l.saves) fail(`${l.id}: ${l.problems} problem(s), ${l.saves} save(s) compared${l.first ? `; first: ${l.first}` : ""}`);
      for (const r of run.rows.filter((x) => x.status === 'failed')) fail(`${r.title}: ${r.messages.split('\n')[0]}`);
      const saves = rows.reduce((n, l) => n + l.saves, 0), steps = rows.reduce((n, l) => n + l.steps, 0);
      const statuses = new Set(rows.flatMap((l) => l.statuses));
      console.log(`   ${rows.filter((l) => !l.problems).length} of ${rows.length} consumers identical over ${steps} steps; ${saves} saves written by the old hook restored unchanged (statuses ${[...statuses].sort().join(', ')})`);
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
