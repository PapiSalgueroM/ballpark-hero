/* Ranked recorder harness: a finish outside the daily is a play, never a record.

   Round 645 part one. A read of every recorder on 2026-09-28 (origin/main
   22bc0f7e) found 36 games whose free finishes (Unlimited, free play, a new
   season, versus, a CPU card) went through the same recorder as their
   daily, under the daily's slug: a scored game_completions row, so the day
   board's best was the best of as many attempts as a player cared to make,
   and the signed in save, so every attempt paid its score into
   total_points, wrote a user_game_scores row and ticked daily_completions
   for a daily never played. 28 call sites in 28 files:
     23 recorded the active game's state whatever the mode, covering 31
        games: the eight guess hooks on gameState (Guess The CBB Team, F1
        Constructor, F1 Driver, Guess The NFL Team, Guess The Club, Guess The
        Nation, Guess The NASCAR Driver, Guess The Tennis Player), the three
        chains (NASCAR, Tennis, UFC), the four gauntlets (one page and one
        board for three sports), the five conquest maps (one board), Buzzer
        Beater, Free Kick, NBA Stat Line, Pack Battle, Player Stock Market,
        Rarity Round, Sports Bingo, Perfect Lineup (Unlimited and Go
        Unbeaten) and the three Perfect Lineups on the shared engine (F1,
        NBA, NHL), whose done flag named the daily without requiring it:
        phase === 'result' && !(mode === 'daily' && dailyDone) is true on
        every Unlimited result;
      4 Perfect Seasons recorded every classic and hard season through a
        bare recordCompletion;
      1 Face Off, the one game that told the two apart, still wrote its free
        and versus matches through recordCompletion with no score, which is
        the signed in save and the daily key with a zero.
   Six more (Face Off's daily, HOF or Bust, Score Predictor, Shirt Number,
   Minefield, Sports Millionaire) ANDed the mode into their done flag, so a
   free finish wrote nothing at all, not even a play, and Round 643 found that
   shape re-arming the recorder on a mode toggle.

   Face Off's shape is now the recorder's own: useGameCompletion takes a
   `ranked` flag, false routes to recordUnrankedPlay (the anonymous row with
   no score and the local streak day, nothing else), and a game with a daily
   and a free mode under one slug passes its mode. Measured with this scan:
   28 unranked writes in 28 files and 6 mode gated recorders before, 0 and 0
   after.

   SECTION 1, THE SOURCE. Every recorder in src, read as code (comments
   stripped). A recorder's file is read as MULTI MODE when its code names the
   literal 'daily' (mode === 'daily', a 'daily' | 'unlimited' union, a
   start('daily')). That is wider than it needs to be on purpose: a daily
   only game that names it passes anyway, because its done flag reads daily
   state. The blind spot is a game whose modes live in another file than its
   recorder, and the 2026-09-28 read found none: every recorder file that
   does not name 'daily' either deals from the date alone or from the random
   generator alone. In a multi mode file every useGameCompletion call must either
     - carry the ranked flag, an expression true only in the daily: a top
       level mode === 'daily' term, alone or ANDed with more (a literal true
       would only silence the check and mode !== 'daily' would rank the
       wrong runs; a literal false is an explicit never ranked), or
     - read daily only state: every identifier in its done expression names
       the daily (rawDailyStatus, dailyDone, effectiveDailyStatus,
       dailyPhase, dailyFilled), the Missing XI shape Round 643 settled on,
       which cannot fire in another mode;
   and no multi mode file may call recordCompletion directly or hand a
   ResultScreen recordCompletionOnMount (that door records ranked on mount,
   whatever the mode), because the flag lives on the hook. A recorder in a
   multi mode file that is a single mode game of its own (the 20 Questions
   tree beside Guess The Club's daily) is a ratchet, SINGLE_MODE_BASELINE,
   with the reason beside it: a new one fails, a stale entry fails.

   SECTION 2, THE LIB AND THE HOOK, AS CODE. recordUnrankedPlay writes the
   anonymous row and the streak day and reaches neither a score, the signed
   in save, the daily key nor the local today set; the hook consumes the
   restore mark before either door and takes the unranked door before the
   ranked one.

   SECTION 3, RENDERED. src/test/rankedRecorder.test.tsx renders the real
   hook (an unranked finish is one play and no record, a ranked one is one
   record and no play, a restored unranked finish is nothing) and plays four
   real hooks, one per shape (F1 Driver, NASCAR Chain, HOF or Bust, Perfect
   Lineup NBA on the shared engine), through the daily and through Unlimited.
   src/test/rankedRecorderLib.test.ts drives the real lib against a
   recording Supabase client: the unranked row carries no score, no rpc and
   no session read happen, the streak day lands, the today set does not.

   NEGATIVE CONTROLS (house rule: prove each check can fail). The source ones
   rewrite one file in memory and run section 1 on it; each refuses to run
   unless its anchor occurs exactly once as code:
     unranked   useCbbProgram's recorder loses its flag; exactly that file
                flagged, kind unranked
     literal    useCbbProgram passes a literal true; exactly that file, kind
                flag
     inverted   useCbbProgram passes mode !== 'daily'; exactly that file,
                kind flag
     direct     Face Off's free matches go back through recordCompletion;
                exactly that file, kind direct
     onmount    Rarity Round's result card records on mount; exactly that
                file, kind direct
     stale      a baseline entry that matches nothing; section 1 red
   and every run proves the scan reads code: the four shapes written into
   comments flag nothing. The rendered ones edit a COPY under
   dist/.ranked-control and point vitest at it through an alias:
     hookignores  the hook records every finish as ranked (COMPLETION_HOOK);
                  the unranked cases go red, the ranked ones stay green
     libleaks     recordUnrankedPlay writes a score on its row (RANKED_LIB);
                  section 2 and the no score case go red
     libsaves     recordUnrankedPlay makes the signed in save (RANKED_LIB);
                  section 2 and the no signed in save case go red
   RANKED_CONTROL=all runs every control in turn. A control run exits 0 when
   it fired exactly as it should and 1 when it did not.

   Run: node scripts/simRankedRecorder.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments, callsOf, resolveSlug, resolveExpr, readLF as readSourceLF, srcFiles as sourceFiles } from './lib/readSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RANKED_CONTROL || '';
const HOOK = 'src/hooks/useGameCompletion.ts';
const LIB = 'src/lib/completions.ts';
const TESTS = ['src/test/rankedRecorder.test.tsx', 'src/test/rankedRecorderLib.test.ts'];

/* Recorders that sit in a multi mode file but are a single mode game of their
   own. Keyed by file and slug. A new one fails; a stale one fails. */
const SINGLE_MODE_BASELINE = [
  { file: 'src/hooks/useGuessSoccerClub.ts', slug: 'guess-soccer-club-questions', why: 'the 20 Questions tree has no daily: every run deals a random club under its own slug, beside the classic daily in the same hook' },
];

const SCAN_CONTROLS = {
  unranked: {
    file: 'src/hooks/useCbbProgram.ts',
    from: "useGameCompletion('guess-cbb-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0, 0, gameState?.mode === 'daily');",
    to: "useGameCompletion('guess-cbb-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);",
    kind: 'unranked',
    why: 'Guess The CBB Team records an Unlimited finish as the daily again',
  },
  literal: {
    file: 'src/hooks/useCbbProgram.ts',
    from: "gameState?.score ?? 0, 0, gameState?.mode === 'daily');",
    to: 'gameState?.score ?? 0, 0, true);',
    kind: 'flag',
    why: 'Guess The CBB Team silences the flag with a literal true',
  },
  inverted: {
    file: 'src/hooks/useCbbProgram.ts',
    from: "gameState?.score ?? 0, 0, gameState?.mode === 'daily');",
    to: "gameState?.score ?? 0, 0, gameState?.mode !== 'daily');",
    kind: 'flag',
    why: 'Guess The CBB Team ranks every mode but the daily',
  },
  direct: {
    file: 'src/hooks/useFaceOff.ts',
    from: "    setPhase('done');\n  }, [phase, results, rounds.length, difficulty, mode, save]);",
    to: "    if (mode !== 'daily') recordCompletion('/face-off');\n    setPhase('done');\n  }, [phase, results, rounds.length, difficulty, mode, save]);",
    kind: 'direct',
    why: "Face Off's free matches go back through a bare recordCompletion, the signed in save and the daily key with a zero",
  },
  onmount: {
    file: 'src/pages/RarityRound.tsx',
    from: '            <ResultScreen\n              outcomeEmoji={outcomeEmoji}\n',
    to: '            <ResultScreen\n              recordCompletionOnMount\n              outcomeEmoji={outcomeEmoji}\n',
    kind: 'direct',
    why: "Rarity Round's result card records on mount, ranked in Unlimited as in the daily",
  },
};
/* Each rendered control rewrites one module into a copy and names the cases
   that must go red, by test file and title; every other case in both files
   must stay green. */
const VITEST_CONTROLS = {
  hookignores: {
    file: HOOK, alias: 'COMPLETION_HOOK', testFile: 'rankedRecorder.test.tsx',
    from: '    if (!ranked) {\n      recordUnrankedPlay(`/${gameSlug}`);\n      return;\n    }\n',
    to: '',
    why: 'the hook records every finish as ranked again',
    red: /unranked finish is one play|a free run then a daily run|Unlimited/,
    lib: false,
  },
  libleaks: {
    file: LIB, alias: 'RANKED_LIB', testFile: 'rankedRecorderLib.test.ts',
    from: "      .insert({ game, player_name: getCurrentPlayerName() })\n",
    to: "      .insert({ game, score: 0, player_name: getCurrentPlayerName() })\n",
    why: 'recordUnrankedPlay writes a score on the anonymous row again, so the day board reads a free run',
    red: /with no score/,
    lib: true,
  },
  libsaves: {
    file: LIB, alias: 'RANKED_LIB', testFile: 'rankedRecorderLib.test.ts',
    from: "    if (!game) return;\n    (supabase.from as any)('game_completions')\n      .insert({ game, player_name: getCurrentPlayerName() })",
    to: "    if (!game) return;\n    saveAuthCompletion('', game, 0, 0);\n    (supabase.from as any)('game_completions')\n      .insert({ game, player_name: getCurrentPlayerName() })",
    why: 'recordUnrankedPlay makes the signed in save again, so a free run pays points and ticks the daily key',
    red: /no signed in save/,
    lib: true,
  },
};
const ALL = [...Object.keys(SCAN_CONTROLS), 'stale', ...Object.keys(VITEST_CONTROLS)];
if (CONTROL && CONTROL !== 'all' && !ALL.includes(CONTROL)) {
  console.error(`RANKED_CONTROL=${CONTROL} is not a control this harness knows (${ALL.join(', ')}, all)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const readLF = rel => readSourceLF(ROOT, rel);
const srcFiles = () => sourceFiles(ROOT);
const count = (hay, needle) => hay.split(needle).length - 1;

/* ------------------------------------------------------------------------ */
/* Section 1: the scan                                                       */
/* ------------------------------------------------------------------------ */
const DAILY_LITERAL = /['"]daily['"]/;
const CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const KEYWORD = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof']);

/* Every identifier chain in an expression, string literals removed first
   (so 'playing' in rawDailyStatus !== 'playing' is not an identifier). */
function identifiersOf(expr) {
  const noStrings = expr.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  return [...noStrings.matchAll(/[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*/g)].map(m => m[0].replace(/\s+/g, ''));
}
/* Daily only state names the daily, or a day (NFL Career Path compares the
   finish's date to dealtDay, the day the daily was dealt): neither exists
   in another mode. */
function dailyScoped(done) {
  const ids = identifiersOf(done).filter(id => !KEYWORD.has(id) && !CONSTANT.test(id));
  return ids.length > 0 && ids.every(id => /daily|day$/i.test(id));
}

/* The top level terms of an && chain: a term inside parentheses, brackets or
   a string stays whole, so !(mode === 'daily' && dailyDone) is ONE term. */
function conjuncts(expr) {
  const terms = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < expr.length; i += 1) {
    const c = expr[i];
    if (quote) { cur += c; if (c === '\\') { cur += expr[i + 1] ?? ''; i += 1; } else if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    if (c === ')' || c === ']' || c === '}') depth -= 1;
    if (depth === 0 && c === '&' && expr[i + 1] === '&') { terms.push(cur.trim()); cur = ''; i += 1; continue; }
    cur += c;
  }
  terms.push(cur.trim());
  return terms.filter(Boolean);
}
/* A term that is true only in the daily: `x === 'daily'` or `'daily' === x`,
   optionally wrapped in one pair of parentheses. A negation (!==, or a ! in
   front) is not one, so an inverted flag cannot pass for a ranked one. */
const DAILY_TERM = /^\(?\s*(?:[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*\s*={2,3}\s*['"]daily['"]|['"]daily['"]\s*={2,3}\s*[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)\s*\)?$/;
const onlyInDaily = expr => conjuncts(expr).some(t => DAILY_TERM.test(t));
const RESULT_SCREEN = 'src/components/game/ResultScreen.tsx';
const lineAt = (code, index) => code.slice(0, index).split('\n').length;

function scan(files, baseline = SINGLE_MODE_BASELINE) {
  const findings = [];
  const baselineHits = new Set();
  const multi = [];
  let recorders = 0;
  let checked = 0;
  for (const [rel, raw] of files) {
    if (rel === HOOK || rel === LIB) continue;
    const code = stripComments(raw);
    const recs = callsOf(code, 'useGameCompletion').filter(c => c.args.length >= 2);
    const direct = callsOf(code, 'recordCompletion').filter(c => c.args.length >= 1);
    /* ResultScreen's opt in recorder: the prop on a card records ranked on
       mount through recordCompletion, with no way to pass a mode. */
    const onMount = rel === RESULT_SCREEN ? [] : [...code.matchAll(/\brecordCompletionOnMount\b/g)];
    if (!recs.length && !direct.length && !onMount.length) continue;
    recorders += recs.length + direct.length + onMount.length;
    if (!DAILY_LITERAL.test(code)) continue;
    multi.push(rel);
    for (const d of direct) {
      findings.push({ kind: 'direct', file: rel, line: d.at, what: `recordCompletion(${d.args[0]}) called directly in a file with a daily and another mode: the ranked flag lives on useGameCompletion, so this writes the signed in save and the daily key whatever the mode` });
    }
    for (const m of onMount) {
      findings.push({ kind: 'direct', file: rel, line: lineAt(code, m.index), what: 'a ResultScreen recordCompletionOnMount in a file with a daily and another mode: that card records ranked on mount whatever the mode, so a free finish writes the day board, the points and the daily key; record through useGameCompletion with the ranked flag instead' });
    }
    for (const r of recs) {
      const slug = resolveSlug(code, r.args[0]) ?? r.args[0];
      const base = baseline.find(b => b.file === rel && b.slug === slug);
      if (base) { baselineHits.add(`${rel}|${slug}`); continue; }
      checked += 1;
      if (r.args.length >= 5) {
        const ranked = resolveExpr(code, r.args[4]);
        if (onlyInDaily(ranked) || ranked === 'false') continue;
        findings.push({ kind: 'flag', file: rel, line: r.at, what: `${slug} passes "${ranked}" as its ranked flag, which is not true only in the daily: the flag must AND in a mode === 'daily' comparison (or be a literal false)` });
        continue;
      }
      const done = resolveExpr(code, r.args[1]);
      if (dailyScoped(done)) continue;
      const shown = done.replace(/\s+/g, ' ');
      if (onlyInDaily(done)) {
        /* The pre 645 shape: the mode ANDed into the done flag. A free finish
           then records nothing at all, not even a play, and Round 643 found
           this shape re-arming the recorder on a mode toggle. The flag is the
           place for the mode. */
        findings.push({ kind: 'gate', file: rel, line: r.at, what: `${slug} gates its done on the mode ("${shown}") instead of passing the ranked flag: a free finish is not even a play, and a toggle re-arms the recorder` });
        continue;
      }
      /* Anything else, including a done that mentions the daily without
         requiring it (the Perfect Lineup engine's
         phase === 'result' && !(mode === 'daily' && dailyDone), true on every
         Unlimited finish), fires outside the daily. */
      findings.push({ kind: 'unranked', file: rel, line: r.at, what: `${slug} records on "${shown}" in a file with a daily and another mode, with no ranked flag: a free finish writes the day board, the points and the daily key` });
    }
  }
  const stale = baseline.filter(b => !baselineHits.has(`${b.file}|${b.slug}`));
  return { findings, stale, recorders, multi, checked };
}

function reportScan(res) {
  console.log(`   ${res.recorders} recorder calls read; ${res.multi.length} recorder files name the daily and are read as multi mode; ${res.checked} of their hook recorders checked, ${SINGLE_MODE_BASELINE.length} in the single mode baseline`);
  if (res.recorders < 100) fail(`only ${res.recorders} recorder calls found, the reader is broken`);
  if (res.multi.length < 20) fail(`only ${res.multi.length} multi mode files found, the reader is broken`);
  for (const f of res.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  for (const s of res.stale) fail(`SINGLE_MODE_BASELINE lists ${s.file} (${s.slug}), which matches no recorder there: remove the entry`);
  const writes = res.findings.filter(f => f.kind === 'unranked' || f.kind === 'direct');
  const gates = res.findings.filter(f => f.kind === 'gate').length;
  const flags = res.findings.filter(f => f.kind === 'flag').length;
  console.log(`   unranked writes: ${writes.length} in ${new Set(writes.map(f => f.file)).size} file(s); mode gated recorders without the flag: ${gates}; flags that are not true only in the daily: ${flags}`);
}

/* ------------------------------------------------------------------------ */
/* Section 2: the lib and the hook, as code                                  */
/* ------------------------------------------------------------------------ */
function bodyOf(code, signature) {
  const start = code.indexOf(signature);
  if (start < 0) return null;
  const next = code.indexOf('\nexport ', start + 1);
  return code.slice(start, next < 0 ? code.length : next);
}
/* Returns the problems found; the default run fails on each, a control
   expects at least one. */
function checkLibAndHook(libRaw, hookRaw) {
  const problems = [];
  const lib = stripComments(libRaw);
  const body = bodyOf(lib, 'export function recordUnrankedPlay(');
  if (!body) return ['recordUnrankedPlay is not exported from src/lib/completions.ts'];
  for (const heavy of ['score', 'saveAuthCompletion(', 'getSession(', 'getUser(', 'record_auth_completion', 'bumpLocalTodayCount(', 'daily_completions']) {
    if (body.includes(heavy)) problems.push(`recordUnrankedPlay reaches ${JSON.stringify(heavy)}, so a free run is a ranked record again`);
  }
  if (!body.includes("('game_completions')")) problems.push('recordUnrankedPlay no longer writes the anonymous game_completions row, so a free run is not a play');
  if (!body.includes('recordStreakCompletion(')) problems.push('recordUnrankedPlay no longer records the local streak day, so a free run does not count as playing today');
  const hook = stripComments(hookRaw);
  const consume = hook.indexOf('consumeRestoredFinish(gameSlug)');
  const unranked = hook.indexOf('recordUnrankedPlay(');
  const ranked = hook.indexOf('recordCompletion(');
  if (consume < 0 || unranked < 0 || ranked < 0) problems.push('the hook is missing the restore mark, the unranked door or the ranked door');
  else if (!(consume < unranked && unranked < ranked)) problems.push('the hook must consume the restore mark, then take the unranked door, then the ranked one, in that order');
  if (!/\bif\s*\(\s*!ranked\s*\)/.test(hook)) problems.push('the hook no longer branches on !ranked');
  if (!problems.length) console.log(`   recordUnrankedPlay body ${body.length} characters: the anonymous row and the streak day, nothing heavier; the hook consumes the mark, then routes on ranked`);
  return problems;
}

/* ------------------------------------------------------------------------ */
/* Section 3: vitest                                                         */
/* ------------------------------------------------------------------------ */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
function runSuite(env) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  const out = path.join(os.tmpdir(), `rankedRecorder-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, [VITEST, 'run', ...TESTS, '--reporter=json', `--outputFile.json=${out}`], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) return { error: 'vitest wrote no report:\n' + text.slice(-3000) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const tests = [];
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.push({ file: path.basename(file.name), title: a.fullName || a.title, status: a.status, message: (a.failureMessages || []).join('\n').split('\n')[0] });
    }
  }
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, loadError, text };
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
if (!CONTROL) {
  console.log('1) The source: every recorder in src, read as code');
  const files = srcFiles();
  const res = scan(files);
  reportScan(res);
  /* Prose is not code: the four shapes written into comments flag nothing,
     and the same four written as code flag four, so the prose check is not
     green only because the shapes could never be seen. */
  const probe = 'src/hooks/useNflHL.ts';
  const SHAPES = [
    "useGameCompletion('nfl-hl', gameState?.gameStatus === 'won', 0);",
    "recordCompletion('/nfl-hl');",
    "useGameCompletion('nfl-hl', finished, score, 0, true);",
    'const card = <ResultScreen recordCompletionOnMount />;',
  ];
  const asCode = new Map(files);
  asCode.set(probe, files.get(probe) + '\n' + SHAPES.join('\n') + '\n');
  const codeRes = scan(asCode);
  const prose = new Map(files);
  prose.set(probe, files.get(probe) + '\n/* ' + SHAPES.slice(0, 2).join(' ') + ' */\n' + SHAPES.slice(2).map(s => `// ${s}`).join('\n') + '\n');
  const proseRes = scan(prose);
  if (codeRes.findings.length - res.findings.length !== SHAPES.length) fail(`the four shapes written as code added ${codeRes.findings.length - res.findings.length} finding(s), not ${SHAPES.length}: the scan cannot see them, so the prose check below proves nothing`);
  else if (proseRes.findings.length !== res.findings.length) fail(`the scan read a comment as code: ${proseRes.findings.length - res.findings.length} finding(s) from prose`);
  else console.log(`   prose check: an unflagged recorder, a direct call, a literal flag and an on mount card flag ${SHAPES.length} as code and nothing written in comments`);

  console.log('\n2) The lib and the hook, as code');
  for (const p of checkLibAndHook(readLF(LIB), readLF(HOOK))) fail(p);

  console.log(`\n3) Rendered: ${TESTS.join(', ')}`);
  const run = runSuite({});
  if (run.error) fail(run.error);
  else {
    if (!run.tests.length) fail('vitest reported no tests:\n' + run.text.slice(-2000));
    for (const t of run.tests) {
      console.log(`   ${t.status === 'passed' ? 'ok  ' : 'RED '}${t.title}${t.status === 'passed' ? '' : `: ${t.message}`}`);
      if (t.status !== 'passed') fail(`${t.file}: ${t.title}`);
    }
    if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every case green, read its output:\n${run.text.slice(-2000)}`);
    console.log(`   vitest exit ${run.code}, ${run.tests.length} cases`);
  }

  if (failures) { console.error(`\nsimRankedRecorder: ${failures} failure(s)`); process.exit(1); }
  console.log(`\nsimRankedRecorder: all green (${res.recorders} recorders read, ${res.multi.length} multi mode files, 0 unranked writes)`);
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
const which = CONTROL === 'all' ? ALL : [CONTROL];
const controlDir = path.join(ROOT, 'dist', '.ranked-control');
let fired = 0;
try {
  for (const name of which) {
    if (name === 'stale') {
      console.log('\nNEGATIVE CONTROL stale: a baseline entry that matches no recorder');
      const files = srcFiles();
      const before = scan(files);
      const after = scan(files, [...SINGLE_MODE_BASELINE, { file: 'src/hooks/useNflHL.ts', slug: 'nfl-higher-lower-questions', why: 'control' }]);
      if (before.stale.length === 0 && after.stale.length === 1) { fired += 1; console.log('   control stale fired: the scan reports exactly the added entry as stale'); }
      else fail(`control stale: expected one stale entry, the scan reports ${after.stale.length} (${before.stale.length} before)`);
      continue;
    }
    if (SCAN_CONTROLS[name]) {
      const ctl = SCAN_CONTROLS[name];
      console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
      const files = srcFiles();
      const src = files.get(ctl.file);
      if (!src || count(src, ctl.from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(ctl.from)}`);
      if (count(stripComments(src), ctl.from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
      const before = scan(files);
      files.set(ctl.file, src.replace(ctl.from, ctl.to));
      const after = scan(files);
      const added = after.findings.filter(f => !before.findings.some(b => b.file === f.file && b.what === f.what));
      for (const f of added) console.log(`   flagged ${f.kind}: ${f.file}:${f.line}: ${f.what}`);
      const onTarget = added.length === 1 && added[0].file === ctl.file && added[0].kind === ctl.kind;
      if (!onTarget) fail(`control ${name}: expected exactly one ${ctl.kind} finding in ${ctl.file}, the scan added ${added.length}`);
      else { fired += 1; console.log(`   control ${name} fired: the scan flags exactly ${ctl.file}, in memory only, src untouched`); }
      continue;
    }
    const ctl = VITEST_CONTROLS[name];
    console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
    const src = readLF(ctl.file);
    if (count(src, ctl.from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(ctl.from)}`);
    if (count(stripComments(src), ctl.from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
    const copy = src.replace(ctl.from, ctl.to);
    if (copy === src) abort(`control ${name} cannot run: the rewrite changed nothing`);
    if (/from '\.\.?\//.test(copy)) abort(`control ${name} cannot run: ${ctl.file} has a relative import, which a copy elsewhere cannot resolve`);
    /* Section 2 on the rewritten lib, in memory. */
    if (ctl.lib) {
      const problems = checkLibAndHook(copy, readLF(HOOK));
      if (!problems.length) { fail(`control ${name}: section 2 stayed green on the rewritten lib`); continue; }
      for (const p of problems) console.log(`   section 2 on the copy: ${p}`);
      console.log('   section 2 went red on the rewritten lib, as it should');
    }
    const dir = path.join(controlDir, name);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, path.basename(ctl.file));
    fs.writeFileSync(file, copy);
    console.log(`   ${ctl.file} copied to ${path.relative(ROOT, file).replaceAll('\\', '/')} with the anchor rewritten, src untouched`);
    const run = runSuite({ [ctl.alias]: file.replaceAll('\\', '/') });
    if (run.error) { fail(run.error); continue; }
    if (run.loadError && !run.tests.length) { fail(`control ${name}: the copy did not load, so every red is a crash:\n${run.loadError}`); continue; }
    let red = 0;
    let wrong = 0;
    for (const t of run.tests) {
      const isRed = t.status !== 'passed';
      const shouldBeRed = t.file === ctl.testFile && ctl.red.test(t.title);
      const ok = isRed === shouldBeRed;
      if (isRed) red += 1;
      if (!ok) wrong += 1;
      if (isRed || !ok) console.log(`   ${ok ? 'ok  ' : 'BAD '}${t.title.padEnd(70)} ${isRed ? 'red  ' : 'green'} (${shouldBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    }
    console.log(`   ${run.tests.length - red} other case(s) green, as they must be`);
    if (wrong) fail(`control ${name}: ${wrong} case(s) did not answer the control the way they must`);
    else if (red === 0) fail(`control ${name}: nothing went red, so the cases it targets are not proving anything`);
    else { fired += 1; console.log(`   control ${name} fired: ${red} red, exactly the ones it should, every other one green`); }
  }
} finally {
  fs.rmSync(controlDir, { recursive: true, force: true });
}

if (failures || fired !== which.length) {
  console.error(`\nsimRankedRecorder: control ${CONTROL} did not fire as it should (${failures} failure(s))`);
  process.exit(1);
}
console.log(`\nsimRankedRecorder: RANKED_CONTROL=${CONTROL} fired exactly where it should, so the checks it targets can fail`);
