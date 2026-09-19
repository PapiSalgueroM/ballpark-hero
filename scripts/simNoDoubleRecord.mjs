/* No double record harness: the same finish is never recorded twice.

   Round 643. A read only audit on 2026-09-19 proved, with probes, that a
   finished game was recorded again in five shapes. The world board takes the
   day's best so it did not move, but every extra record paid the raw score
   into a signed in player's total again and added a play row:

     fight    Fight Career, Fight Gym and Fight Promoter restored a finished
              save in an effect after mount with no markRestoredFinish
     career   the four My Careers flipped done false then true on every
              Resume coaching then Back, paying the whole legacy again
     slug     twelve daily hooks marked a restored finish under their storage
              name (nfl-hl, ufc-game, football-connect4, career-path) while
              the recorder asked under another, so the mark was never used
     toggle   ten pages gated the recorder on the mode, so Unlimited and back
              re-armed it over a daily already recorded
     restore  six hooks restored a finish after their data loaded with no
              mark, and NFL Career Path re-armed on its Daily tab and recorded
              again from a Play Unlimited that never left the daily

   A review of the round then found the fix itself losing records: three
   games recorded off a board that waits out each reveal, so a reload inside
   the final reveal found the day finished, marked it and never recorded it.

   SECTION 1, THE TABLE. src/test/noDoubleRecord.test.tsx, one row per game
   and one check per step a row cannot take. A row mounts the REAL board, page
   or hook with the real useGameCompletion, the real restoredFinish handshake
   and jsdom's real localStorage, plays the finish (which must record exactly
   once), then a mode toggle and back, three coaching round trips, any replay
   path, and two reloads that must come back finished, and holds the recorder
   at one call throughout. The checks cover a reload inside a reveal, the next
   day in the same tab, a record's score, and the bracket's crowned names.
   Measured on the unfixed modules (origin/main swapped in): every one of the
   41 rows red.

   SECTION 2, THE SOURCE. A row can only hold the games somebody listed, so
   this reads every recorder in src as code (comments stripped) and fails on
   the two shapes the next offender will have: a file whose useGameCompletion
   slug differs from the slug it hands markRestoredFinish or useDailyPuzzle's
   gameSlug, and a recorder whose done flag is ANDed with a mode check. The
   mode gates that exist today and were each traced safe are a ratchet,
   MODE_GATE_BASELINE, with the reason beside each: a new one fails, and an
   entry that no longer matches must leave the list.

   NEGATIVE CONTROLS (house rule: prove each check can fail). The vitest ones
   edit a COPY of one module under dist/.no-double-control, refuse to run
   unless their anchor occurs exactly once in that module as code, and point
   vitest at the copy through the NO_DOUBLE_SWAP alias in vitest.config.ts;
   src is never written. Every test is then judged: the ones the control
   targets must go red on their own assertion, every other must stay green.
     nomark        markRestoredFinish is a no-op; every row and check whose
                   reload relies on the mark (usesMark) goes red
     slugdrift     useNflHL's slug pair back to its old mismatch; only the
                   nfl-higher-lower row
     togglerearm   Rank 'Em's recorder gets its mode check back; only rank-em
     coachflip     the NFL My Career's done back to the retired screen alone;
                   only nfl-my-career, on its first coaching round trip
     playunlimited NFL Career Path's Play Unlimited stays in the daily again;
                   only nfl-career, on its replay step
     olddaily      useDailyPuzzle trusts a stored 'playing' again; only
                   transfer-path, reading its pre Round 643 save
   The source ones rewrite one file in memory and run section 2 on it:
     scanslug      useNflHL's slug pair back to its mismatch; exactly that
                   file flagged for its slug
     scanmode      Rank 'Em's recorder ANDed with its mode again; exactly that
                   file flagged for its mode gate
   and every run also proves the scan reads code, not prose: the same two
   shapes written into a comment flag nothing.
     NO_DOUBLE_CONTROL=all runs every control in turn. A control run exits 0
     when it fired exactly as it should and 1 when it did not.

   Run: node scripts/simNoDoubleRecord.mjs
        NO_DOUBLE_ONLY=rank-em node scripts/simNoDoubleRecord.mjs   (one row)
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/noDoubleRecord.test.tsx';
const CONTROL = process.env.NO_DOUBLE_CONTROL || '';
const ONLY = process.env.NO_DOUBLE_ONLY || '';

/* What the table must hold, as the test file's own exact counts say. */
const EXPECTED_ROWS = 41;
const EXPECTED_CHECKS = 18;

const VITEST_CONTROLS = {
  nomark: {
    module: '@/lib/restoredFinish',
    file: 'src/lib/restoredFinish.ts',
    from: '  marks.set(gameSlug, Date.now());',
    to: '  void gameSlug; /* NO_DOUBLE_CONTROL=nomark: the mark is dropped */',
    why: 'markRestoredFinish is a no-op, so every restore that relies on it records again',
    red: row => row.usesMark,
    point: /records nothing|recorded once/,
  },
  slugdrift: {
    module: '@/hooks/useNflHL',
    file: 'src/hooks/useNflHL.ts',
    from: "    gameSlug: 'nfl-higher-lower',\n    storageSlug: 'nfl-hl',",
    to: "    gameSlug: 'nfl-hl',",
    why: "NFL Higher or Lower marks its restore under 'nfl-hl' again while the recorder asks under 'nfl-higher-lower'",
    red: row => row.title === 'nfl-higher-lower',
    point: /records nothing/,
  },
  togglerearm: {
    module: '@/pages/RankEm',
    file: 'src/pages/RankEm.tsx',
    from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);",
    to: "useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);",
    why: "Rank 'Em gates the recorder on the mode again, so Unlimited and back re-arms it",
    red: row => row.title === 'rank-em',
    point: /records nothing/,
  },
  coachflip: {
    module: '@/components/nfl-my-career/NflMyCareerBoard',
    file: 'src/components/nfl-my-career/NflMyCareerBoard.tsx',
    from: "  const done = phase === 'retired' || phase === 'coach';",
    to: "  const done = phase === 'retired';",
    why: "the NFL My Career counts only the retired screen as done again, so every coaching round trip re-arms the recorder",
    red: row => row.title === 'nfl-my-career',
    point: /coaching round trip 1 records nothing/,
  },
  playunlimited: {
    module: '@/hooks/useNFLCareer',
    file: 'src/hooks/useNFLCareer.ts',
    from: "  const nextUnlimited = useCallback(() => {\n    setMode('unlimited');\n",
    to: "  const nextUnlimited = useCallback(() => {\n",
    why: "NFL Career Path's Play Unlimited deals a random player inside the daily again, and solving him overwrites today's save",
    red: row => row.title === 'nfl-career',
    point: /Play Unlimited leaves the daily/,
  },
  olddaily: {
    module: '@/hooks/useDailyPuzzle',
    file: 'src/hooks/useDailyPuzzle.ts',
    from: "      if (saved.gameStatus === 'playing' && puzzle != null && Array.isArray(saved.guesses)) {\n        if (isWon(saved.guesses, puzzle)) saved.gameStatus = 'won';\n        else if (saved.guesses.length >= maxGuesses || (isLost && isLost(saved.guesses, puzzle))) saved.gameStatus = 'lost';\n      }\n",
    to: '',
    why: "useDailyPuzzle trusts a stored 'playing' again, so a Transfer Path give up saved before Round 643 comes back unmarked",
    red: row => row.title === 'transfer-path',
    point: /reload 1 records nothing/,
  },
};
const SCAN_CONTROLS = {
  scanslug: {
    file: 'src/hooks/useNflHL.ts',
    from: "    gameSlug: 'nfl-higher-lower',\n    storageSlug: 'nfl-hl',",
    to: "    gameSlug: 'nfl-hl',",
    kind: 'slug',
    why: "useNflHL hands useDailyPuzzle 'nfl-hl' while it records 'nfl-higher-lower'",
  },
  scanmode: {
    file: 'src/pages/RankEm.tsx',
    from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);",
    to: "useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);",
    kind: 'mode',
    why: "Rank 'Em's recorder is ANDed with its mode again",
  },
};
const ALL = [...Object.keys(VITEST_CONTROLS), ...Object.keys(SCAN_CONTROLS)];
if (CONTROL && CONTROL !== 'all' && !ALL.includes(CONTROL)) {
  console.error(`NO_DOUBLE_CONTROL=${CONTROL} is not a control this harness knows (${ALL.join(', ')}, all)`);
  process.exit(1);
}
if (CONTROL && ONLY) {
  console.error('a control judges the whole table, so it cannot run with NO_DOUBLE_ONLY');
  process.exit(1);
}

/* The mode gated recorders that exist today, each traced and safe, with why.
   Keyed by file and recorder slug expression. A new one fails; an entry that
   no longer matches a recorder must be removed. */
const MODE_GATE_BASELINE = [
  { file: 'src/hooks/useFaceOff.ts', slug: 'face-off', why: 'the daily button is hidden once the daily is played, and a finished run is never restored' },
  { file: 'src/hooks/useHofOrBust.ts', slug: 'hof-or-bust', why: 'restores in the state initializer, and the switch to Unlimited is one way (no way back to the daily)' },
  { file: 'src/hooks/useScorePredictor.ts', slug: 'score-predictor', why: 'restores in the state initializer, and the switch to Unlimited is one way' },
  { file: 'src/hooks/useShirtNumber.ts', slug: 'shirt-number', why: 'restores through useDailyPuzzle under its own slug, and the switch to Unlimited is one way' },
  { file: 'src/pages/Minefield.tsx', slug: 'minefield', why: 'restores in the state initializer, the second tab path marks, and the done screen offers only Unlimited' },
  { file: 'src/pages/SportsMillionaire.tsx', slug: 'sports-millionaire', why: 'both restore paths go through restoreDaily, which marks first' },
  { file: 'src/hooks/usePerfectLineupGeneric.ts', slug: 'config.gameId', why: 'the mode check excludes an already booked daily, set in the same batch as the restore' },
];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
/* The worktree checks out CRLF and every anchor here is written LF. */
const readLF = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
const count = (hay, needle) => hay.split(needle).length - 1;

/* ------------------------------------------------------------------------ */
/* Reading code: comments out, strings, templates and regexes kept intact.   */
/* ------------------------------------------------------------------------ */
function stripComments(src) {
  let out = '';
  const n = src.length;
  const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
  function code(i, untilBrace) {
    let depth = 0;
    let prev = '';
    let word = '';
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i += 1; continue; }
      if (c === '/' && d === '*') {
        const e = src.indexOf('*/', i + 2);
        const end = e < 0 ? n : e + 2;
        out += src.slice(i, end).replace(/[^\n]/g, ' ');
        i = end;
        continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j += 1; j += 1; }
        out += src.slice(i, j + 1);
        i = j + 1; prev = c; word = '';
        continue;
      }
      if (c === '`') { i = template(i); prev = '`'; word = ''; continue; }
      if (c === '/' && (prev === '' || REGEX_AFTER.includes(prev) || /^(return|typeof|case|in|of|new|delete|void|throw|yield|await)$/.test(word))) {
        let j = i + 1;
        let cls = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '[') cls = true;
          else if (src[j] === ']') cls = false;
          else if (src[j] === '/' && !cls) break;
          j += 1;
        }
        j += 1;
        while (j < n && /[a-z]/i.test(src[j])) j += 1;
        out += src.slice(i, j);
        i = j; prev = '/'; word = '';
        continue;
      }
      if (untilBrace) {
        if (c === '{') depth += 1;
        else if (c === '}') { if (depth === 0) return i; depth -= 1; }
      }
      out += c;
      i += 1;
      if (/\s/.test(c)) continue;
      word = /[A-Za-z0-9_$]/.test(c) ? (/[A-Za-z0-9_$]/.test(prev) ? word + c : c) : '';
      prev = c;
    }
    return i;
  }
  function template(i) {
    out += '`';
    i += 1;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { out += '`'; return i + 1; }
      if (c === '$' && src[i + 1] === '{') { out += '${'; i = code(i + 2, true); out += '}'; i += 1; continue; }
      out += c;
      i += 1;
    }
    return i;
  }
  code(0, false);
  return out;
}

/* Every call of `name(` in the code, with its top level arguments. */
function callsOf(code, name) {
  const found = [];
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let cur = '';
    const args = [];
    let quote = '';
    for (; i < code.length; i += 1) {
      const c = code[i];
      if (quote) { cur += c; if (c === '\\') { cur += code[i + 1]; i += 1; } else if (c === quote) quote = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
      if (c === '(' || c === '[' || c === '{') depth += 1;
      if (c === ')' || c === ']' || c === '}') {
        if (depth === 0 && c === ')') { args.push(cur.trim()); break; }
        depth -= 1;
      }
      if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    found.push({ args: args.filter(a => a !== ''), at: code.slice(0, m.index).split('\n').length });
  }
  return found;
}

const LITERAL = /^(['"`])([^'"`$]*)\1$/;
function resolveSlug(code, expr) {
  const lit = expr.match(LITERAL);
  if (lit) return lit[2];
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const def = code.match(new RegExp(`\\b(?:const|let|var)\\s+${expr}\\s*(?::[^=]+)?=\\s*(['"\`])([^'"\`$]+)\\1`));
    if (def) return def[2];
  }
  return null;
}
function resolveExpr(code, expr) {
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const def = code.match(new RegExp(`\\bconst\\s+${expr}\\s*(?::[^=]+)?=\\s*([^;]+);`));
    if (def) return def[1].trim();
  }
  return expr;
}
const MODE_CHECK = /\b\w*[mM]ode\s*[!=]==?\s*['"`]|['"`]\s*[!=]==?\s*\w*[mM]ode\b/;

/* The scan: every file under src (tests out) that records through the hook. */
function srcFiles() {
  const out = new Map();
  const walk = dir => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (rel !== 'src/test') walk(rel); continue; }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name) || e.name.startsWith('__control_')) continue;
      out.set(rel, readLF(rel));
    }
  };
  walk('src');
  return out;
}
function scan(files) {
  const findings = [];
  const baselineHits = new Set();
  let recorders = 0;
  let resolved = 0;
  for (const [rel, raw] of files) {
    if (rel === 'src/hooks/useGameCompletion.ts' || rel === 'src/hooks/useDailyPuzzle.ts' || rel === 'src/lib/restoredFinish.ts') continue;
    const code = stripComments(raw);
    const recs = callsOf(code, 'useGameCompletion').filter(c => c.args.length >= 2);
    if (!recs.length && !/\bmarkRestoredFinish\s*\(/.test(code)) continue;
    const slugs = new Set();
    for (const r of recs) {
      recorders += 1;
      const slug = resolveSlug(code, r.args[0]);
      if (slug) { slugs.add(slug); resolved += 1; }
      const done = resolveExpr(code, r.args[1]);
      if (/&&/.test(done) && MODE_CHECK.test(done)) {
        const key = slug ?? r.args[0];
        const base = MODE_GATE_BASELINE.find(b => b.file === rel && b.slug === key);
        if (base) baselineHits.add(`${rel}|${key}`);
        else findings.push({ kind: 'mode', file: rel, line: r.at, what: `${key} records on "${done.replace(/\s+/g, ' ')}", ANDed with a mode check: a trip to another mode and back re-arms it over a finish already recorded` });
      }
    }
    for (const mk of callsOf(code, 'markRestoredFinish')) {
      const slug = resolveSlug(code, mk.args[0] ?? '');
      if (!slug) continue;
      if (slugs.size && !slugs.has(slug)) findings.push({ kind: 'slug', file: rel, line: mk.at, what: `marks '${slug}' but records ${[...slugs].map(s => `'${s}'`).join(', ')}, so the mark is never consumed` });
      if (!recs.length) findings.push({ kind: 'slug', file: rel, line: mk.at, what: `marks '${slug}' with no recorder in the file to consume it` });
    }
    if (/\buseDailyPuzzle\s*[<(]/.test(code)) {
      for (const g of code.matchAll(/\bgameSlug\s*:\s*(['"`])([^'"`$]+)\1/g)) {
        if (slugs.size && !slugs.has(g[2])) findings.push({ kind: 'slug', file: rel, line: code.slice(0, g.index).split('\n').length, what: `hands useDailyPuzzle gameSlug '${g[2]}' but records ${[...slugs].map(s => `'${s}'`).join(', ')}, so its restore marks a slug the recorder never asks about` });
      }
    }
  }
  const stale = MODE_GATE_BASELINE.filter(b => !baselineHits.has(`${b.file}|${b.slug}`));
  return { findings, stale, recorders, resolved };
}

/* ------------------------------------------------------------------------ */
/* vitest                                                                    */
/* ------------------------------------------------------------------------ */
/* vitest lives in this tree's node_modules, or in the main tree's when this
   runs from a worktree nested inside it: walk up, as node's own resolution
   does. */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}

/* One vitest run. The json reporter is the verdict (a temp file of its own,
   so two runs at once cannot read each other's); the default reporter is the
   only way the NO_DOUBLE_CASE lines the table prints reach this process. */
function runSuite(env) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  const out = path.join(os.tmpdir(), `noDoubleRecord-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const text = ((r.stdout || '') + (r.stderr || '')).split(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')).join('');
  if (!fs.existsSync(out)) return { error: 'vitest wrote no report:\n' + text.slice(-3000) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const tests = new Map();
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.set(a.title, { status: a.status, message: (a.failureMessages || []).join('\n').split('\n')[0] });
    }
  }
  const cases = [...text.matchAll(/NO_DOUBLE_CASE (\{.*\})/g)].map(m => JSON.parse(m[1]));
  const table = text.match(/NO_DOUBLE_TABLE (\{.*\})/);
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, cases, table: table ? JSON.parse(table[1]) : null, loadError, text };
}

function checkTable(run) {
  if (run.error) { fail(run.error); return false; }
  if (!run.tests.size) { fail('vitest reported no tests from ' + TEST); return false; }
  if (run.tests.get('discovers the table')?.status !== 'passed') { fail('the table check did not pass: ' + (run.tests.get('discovers the table')?.message ?? 'not run')); return false; }
  const rows = run.cases.filter(c => c.shape !== 'check').length;
  const checks = run.cases.filter(c => c.shape === 'check').length;
  if (rows !== EXPECTED_ROWS || checks !== EXPECTED_CHECKS) { fail(`the table printed ${rows} rows and ${checks} checks, this harness expects ${EXPECTED_ROWS} and ${EXPECTED_CHECKS}`); return false; }
  return true;
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
if (!CONTROL) {
  console.log(`1) The table, rendered: ${TEST}${ONLY ? ` (NO_DOUBLE_ONLY=${ONLY})` : ''}`);
  const run = runSuite(ONLY ? { NO_DOUBLE_ONLY: ONLY } : {});
  let shown = 0;
  if (checkTable(run)) {
    if (run.table) console.log(`   table: ${JSON.stringify(run.table)}`);
    if (run.tests.get('markRestoredFinish is live')?.status !== 'passed') fail('the restoredFinish handshake is not live in the normal run');
    const rows = run.cases.filter(c => !ONLY || c.id === ONLY);
    if (ONLY && !rows.length) fail(`NO_DOUBLE_ONLY=${ONLY} names no row; the table has ${[...new Set(run.cases.map(c => c.id))].join(', ')}`);
    for (const c of rows) {
      const t = run.tests.get(c.title);
      const ok = t?.status === 'passed';
      shown += 1;
      console.log(`   ${ok ? 'ok  ' : 'RED '}${c.title.padEnd(64)} ${c.shape.padEnd(8)} mark ${c.usesMark ? 'yes' : 'no '}${ok ? '' : `: ${t?.message ?? 'did not run'}`}`);
      if (!ok) fail(`${c.title}: a finish recorded more than once, lost, or never reached`);
    }
    if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every row green, read its output:\n${run.text.slice(-2000)}`);
    console.log(`   vitest exit ${run.code}, ${shown} rows and checks`);
  }

  console.log('\n2) The source: every recorder in src, read as code');
  const files = srcFiles();
  const res = scan(files);
  console.log(`   ${res.recorders} recorder calls read, ${res.resolved} with a slug resolved in their own file; ${MODE_GATE_BASELINE.length} mode gates in the baseline`);
  if (res.recorders < 80) fail(`only ${res.recorders} useGameCompletion calls found, the reader is broken`);
  for (const f of res.findings) fail(`${f.file}:${f.line}: ${f.what}`);
  for (const s of res.stale) fail(`MODE_GATE_BASELINE lists ${s.file} (${s.slug}), which no longer gates on its mode: remove the entry`);
  /* Prose is not code: the same two shapes written into comments flag nothing. */
  const probe = 'src/hooks/useNflHL.ts';
  const prose = new Map(files);
  prose.set(probe, files.get(probe)
    + "\n/* useGameCompletion('nfl-hl', mode === 'daily' && done, 0); markRestoredFinish('elsewhere'); */\n"
    + "// useGameCompletion('nfl-hl', gameMode === 'daily' && over, 0);\n");
  const proseRes = scan(prose);
  if (proseRes.findings.length !== res.findings.length) fail(`the scan read a comment as code: ${proseRes.findings.length - res.findings.length} finding(s) from prose`);
  else console.log('   prose check: a mode gate and a stray mark written in comments flag nothing');
  if (!res.findings.length && !res.stale.length) console.log('   no slug mismatch and no new mode gated recorder');

  if (failures) {
    console.error(`\nsimNoDoubleRecord: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log(`\nsimNoDoubleRecord: all green (${shown} rows and checks, each recorded once across the finish, the toggles, the coaching, the reveals and the reloads; ${res.recorders} recorders read)`);
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
const which = CONTROL === 'all' ? ALL : [CONTROL];
const controlDir = path.join(ROOT, 'dist', '.no-double-control');
let fired = 0;
try {
  for (const name of which) {
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
    const dir = path.join(controlDir, name);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, path.basename(ctl.file));
    fs.writeFileSync(file, copy);
    console.log(`   ${ctl.file} copied to ${path.relative(ROOT, file).replaceAll('\\', '/')} with its anchor rewritten, src untouched`);

    const run = runSuite({ NO_DOUBLE_CONTROL: name, NO_DOUBLE_SWAP: JSON.stringify({ [ctl.module]: file.replaceAll('\\', '/') }) });
    if (!checkTable(run)) continue;
    if (run.loadError && !run.tests.size) { fail(`control ${name}: the copy did not load, so every red is a crash:\n${run.loadError}`); continue; }
    if (name === 'nomark' && run.tests.get('nomark control: markRestoredFinish is a no-op')?.status !== 'passed') {
      fail('control nomark: the probe says the swapped module still keeps the mark, so the swap did not take');
      continue;
    }
    let wrong = 0;
    let red = 0;
    for (const c of run.cases) {
      const shouldBeRed = ctl.red(c);
      const t = run.tests.get(c.title);
      const isRed = t?.status === 'failed';
      /* Only the targeted assertion counts: a row red for any other reason (a
         crash, a finish that never lands) is not this control firing. */
      const onPoint = !isRed || ctl.point.test(t.message);
      const ok = isRed === shouldBeRed && onPoint;
      if (isRed) red += 1;
      if (!ok) wrong += 1;
      if (isRed || !ok) console.log(`   ${ok ? 'ok  ' : 'BAD '}${c.title.padEnd(64)} ${isRed ? 'red  ' : 'green'} (${shouldBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    }
    console.log(`   ${run.cases.length - red} other row(s) and check(s) green, as they must be`);
    if (wrong) fail(`control ${name}: ${wrong} row(s) did not answer the control the way their table entry says they must`);
    else if (red === 0) fail(`control ${name}: nothing went red, so the rows it targets are not proving anything`);
    else { fired += 1; console.log(`   control ${name} fired: ${red} red, exactly the ones it should, every other one green`); }
  }
} finally {
  fs.rmSync(controlDir, { recursive: true, force: true });
}

if (failures || fired !== which.length) {
  console.error(`\nsimNoDoubleRecord: control ${CONTROL} did not fire as it should (${failures} failure(s))`);
  process.exit(1);
}
console.log(`\nsimNoDoubleRecord: NO_DOUBLE_CONTROL=${CONTROL} fired exactly where it should, so the checks it targets can fail`);
