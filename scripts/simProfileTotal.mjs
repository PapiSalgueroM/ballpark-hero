/* Profile total harness: the profile's all time total is the owner's
   recompute rule of 2026-09-19, one row per game per day at the day's best,
   capped, on the page, in the browser's own tally and in the database.

   Round 648. The profile's Total Points was two running sums of raw scores:
   user_scores.total_points on the server, grown by record_auth_completion by
   the raw score of every save, and the browser's own tally in
   src/lib/streaks.ts, grown by the recorder the same way. The browser's sum
   is where a Pack Battle pack's banked dollars (8,800,000 is an ordinary
   pack) landed; the server refuses any record above 100,000. The server's sum
   was rebuilt by the owner's recompute of 2026-09-19 and has grown raw again
   on every save since. The rule lives in src/lib/pointsRule.ts; the caps are
   public.game_score_caps (the table, never the percentile view).

   WHAT THIS MEASURES.
   1. src/test/profileTotal.test.tsx, eight cases against a planted record set
      in the real shape (per match Club Manager rows and reload repeats, the
      two leaks the recompute took out, beside old scale records, a Pack
      Battle pack at the most a record can hold, a NULL cap, a game with no
      row, and 1,003 one day plays so the read must page), with the caps as
      they stand once Rounds 644 and 646 are applied. Cases: the pure rule,
      the profile hook, a failed read, the browser tally, the real recorder
      end to end, an empty caps read, the once only repair of an inflated
      pre 648 tally (and the badges reading it), and the Profile page itself
      rendered, showing the rule total and not the stored running sum.
   2. The before and after, printed from case 1: the raw sum, the first
      draft's per record clamp, and the rule, and what each keeps of the leak
      rows. Fails if the rule keeps as much of the leak rows as either
      baseline, so a planted set that stopped reproducing the leaks is red.
   3. The migration supabase/migrations/20260928_round_648_profile_clamp.sql,
      read as code with its comments stripped: part 1 adds the day's
      improvement at the cap, under a per player lock, with the caps from the
      table; part 2 recomputes by the same grouping; both parts assert their
      preconditions and raise before the first write. Static, because this
      machine has no database; it holds the shape, and the vitest cases hold
      the arithmetic the shape encodes.

   NEGATIVE CONTROLS. The source controls each write a broken copy of one
   module under dist/.profile-total-control and point vitest at it through
   PROFILE_TOTAL_SWAP in vitest.config.ts (src is never written); every case
   is judged, the targeted ones must go red on their own assertion and every
   other must stay green. The SQL controls rewrite the migration in memory
   and must turn section 3 red. Every control refuses to run unless its
   anchor occurs exactly once and is code, not a comment.
     perrecord    the rule sums every record, not the day's best       1, 2, 8
     nocap        a game day is worth its best with no cap             1, 2, 4, 5, 6, 8
     nodaycolumn  the hook drops puzzle_date, so days merge            2
     firstpage    the hook reads one page of records                   2
     localrepeat  a second play the same day adds in full             4, 5
     recordmax    the tally counts a play the server cannot store      4, 5
     settleraw    a held play settles with no cap                      4, 5, 6
     nocapwire    the recorder stops handing the tally a cap           5
     noprime      the recorder stops kicking off the caps read         5
     norepair     a pre 648 tally is kept as it was                    7
     pagewiring   the page shows the stored running sum                8
     sqlnoclamp   the save adds the raw improvement                    section 3
     sqlperrecord the recompute groups per record                      section 3
     sqlnoguard   part 1 no longer refuses before Round 646            section 3
   PROFILE_TOTAL_CONTROL=all runs every control in turn. A control run exits
   0 when it fired exactly as it should and 1 when it did not.

   Run: node scripts/simProfileTotal.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/profileTotal.test.tsx';
const MIGRATION = 'supabase/migrations/20260928_round_648_profile_clamp.sql';
const CONTROL = process.env.PROFILE_TOTAL_CONTROL || '';
const EXPECTED_CASES = 8;

const SOURCE_CONTROLS = {
  perrecord: {
    file: 'src/lib/pointsRule.ts', alias: '@/lib/pointsRule',
    from: "    const key = `${record.game}\\u0000${record.day ?? '\\u0000null'}`;",
    to: '    const key = `${best.size}`;',
    why: 'the rule sums every record instead of the day\'s best, which puts the leak rows back',
    red: ['1', '2', '8'],
  },
  nocap: {
    file: 'src/lib/pointsRule.ts', alias: '@/lib/pointsRule',
    from: '  return cap === null ? best : Math.min(best, cap);',
    to: '  return best;',
    why: 'a game day is worth its best with no cap at all',
    red: ['1', '2', '4', '5', '6', '8'],
  },
  nodaycolumn: {
    file: 'src/hooks/useProfileTotal.ts', alias: '@/hooks/useProfileTotal',
    from: 'day: r.puzzle_date }))',
    to: 'day: null }))',
    why: 'the hook stops handing the rule the puzzle date, so every day of a game merges into one',
    red: ['2'],
  },
  firstpage: {
    file: 'src/hooks/useProfileTotal.ts', alias: '@/hooks/useProfileTotal',
    from: '            .range(from, to)),',
    to: '            .range(from, Math.min(to, 999))),',
    why: 'the hook reads one page of records, so a player past 1,000 plays is short changed',
    red: ['2'],
  },
  localrepeat: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '      state.totalPoints = (state.totalPoints || 0) + (value - held.points);',
    to: '      state.totalPoints = (state.totalPoints || 0) + value;',
    why: 'a second play of a game on the same day adds in full instead of what it beats the day by',
    red: ['4', '5'],
  },
  recordmax: {
    file: 'src/lib/pointsRule.ts', alias: '@/lib/pointsRule',
    from: '  return points > RECORD_MAX ? 0 : points;',
    to: '  return points;',
    why: 'the tally counts a play the server would refuse to store, so a pack adds its dollars again',
    red: ['4', '5'],
  },
  settleraw: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '    if (cap !== undefined) creditDay(state, pending.game, pending.day, pending.score, cap);',
    to: '    if (cap !== undefined) creditDay(state, pending.game, pending.day, pending.score, null);',
    why: 'a held play settles with no cap once the caps land',
    red: ['4', '5', '6'],
  },
  nocapwire: {
    file: 'src/lib/completions.ts', alias: '@/lib/completions',
    from: 'Number.isFinite(score) ? score : 0, knownCap(game));',
    to: 'Number.isFinite(score) ? score : 0, undefined);',
    why: 'the recorder stops handing the tally a cap, so every play waits for a read that a fresh cache never makes',
    red: ['5'],
  },
  noprime: {
    file: 'src/lib/completions.ts', alias: '@/lib/completions',
    from: '    primeScoreCaps().catch(() => {',
    to: '    Promise.resolve(null).catch(() => {',
    why: 'the recorder stops kicking off the caps read, so a held play never settles',
    red: ['5'],
  },
  norepair: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '    if (parsed.pointsRule !== POINTS_RULE) {',
    to: '    if (parsed.pointsRule !== POINTS_RULE && false) {',
    why: 'a pre 648 raw tally is kept as it was, so the badges and the own profile read the inflated sum',
    red: ['7'],
  },
  pagewiring: {
    file: 'src/pages/Profile.tsx', alias: '@/pages/Profile',
    from: '  const serverPoints = ruleTotal ?? (userScoreData?.total_points ?? 0);',
    to: '  const serverPoints = userScoreData?.total_points ?? 0;',
    why: 'the page shows the stored running sum instead of the rule total',
    red: ['8'],
  },
};

const SQL_CONTROLS = {
  sqlnoclamp: {
    from: '    else least(v_after, v_cap) - least(v_before, v_cap)',
    to: '    else v_after - v_before',
    why: 'the save adds the raw improvement of the day, ignoring the cap',
  },
  sqlperrecord: {
    from: '             group by s.user_id, s.game_type, s.puzzle_date, k.cap',
    to: '             group by s.user_id, s.game_type, s.puzzle_date, k.cap, s.id',
    why: 'the recompute groups per record, which puts the leak rows back into every stored total',
  },
  sqlnoguard: {
    from: "  if to_regclass('private.r646_caps_bak') is null then\n    raise exception 'Round 648: Round 646 has not been applied",
    to: "  if false then\n    raise exception 'Round 648: Round 646 has not been applied",
    why: 'part 1 no longer refuses to run before Round 646 has set the real ceilings',
  },
};

const KNOWN = [...Object.keys(SOURCE_CONTROLS), ...Object.keys(SQL_CONTROLS), 'all'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`PROFILE_TOTAL_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error('ABORT: ' + m); process.exit(2); };

const stripTs = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
const stripSql = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
const count = (hay, needle) => hay.split(needle).length - 1;

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

/* One vitest run. The json reporter is the verdict; the default reporter is
   how the PROFILE_TOTAL_MEASURE line reaches this process. */
function runSuite(swap) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  const out = path.join(os.tmpdir(), `profileTotal-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  if (swap) env.PROFILE_TOTAL_SWAP = JSON.stringify(swap);
  else delete env.PROFILE_TOTAL_SWAP;
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env,
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
  const measure = text.match(/PROFILE_TOTAL_MEASURE (\{.*\})/);
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, measure: measure ? JSON.parse(measure[1]) : null, loadError, text };
}

const caseNumber = title => title.split(' ')[0];

/* ------------------------------------------------------------------------ */
/* Section 3: the migration, read as code                                    */
/* ------------------------------------------------------------------------ */
function checkMigration(rawSql) {
  const reds = [];
  const need = (ok, what) => { if (!ok) reds.push(what); };
  const code = stripSql(rawSql).toLowerCase().replace(/\s+/g, ' ');
  const p1Start = code.indexOf('do $r648_part1$');
  const p2Start = code.indexOf('do $r648_part2$');
  need(p1Start >= 0 && p2Start > p1Start, 'the migration no longer has part 1 and part 2 as two guarded blocks, in that order');
  const part1 = p1Start >= 0 ? code.slice(p1Start, p2Start > p1Start ? p2Start : code.length) : '';
  const part2 = p2Start >= 0 ? code.slice(p2Start) : '';
  const firstExecute = part1.indexOf('execute $fn$');

  /* The preconditions: every refusal sits before the first write. */
  const guards = [
    ["to_regclass('private.r646_caps_bak') is null then raise exception", 'part 1 refuses to run before Round 646 is applied'],
    ["to_regclass('private.r644_state') is null then raise exception", 'part 1 refuses to run before Round 644 is applied'],
    ["if v_left > 0 then raise exception 'round 648: round 644 part 2 still has", 'part 1 refuses while Round 644 part 2 has rows left to divide'],
    ["if md5(v_def) is distinct from v_md5_569 and position('round 648 profile rule' in lower(v_def)) = 0 then raise exception", 'part 1 refuses to replace a save it does not recognise'],
    ["has_function_privilege('authenticated', 'pg_catalog.pg_advisory_xact_lock(bigint)', 'execute')", 'part 1 checks the lock it takes is executable by authenticated'],
    ['if not exists (select 1 from public.game_score_caps) then raise exception', 'part 1 refuses an empty allowlist'],
  ];
  for (const [shape, what] of guards) {
    const at = part1.indexOf(shape);
    need(at >= 0 && firstExecute > at, `${what}, before its first write`);
  }

  /* The marker both guards find the new save by lives in a comment inside
     the function body, which pg_get_functiondef keeps; read it raw. */
  need(/as \$body\$[\s\S]*?round 648 profile rule[\s\S]*?\$body\$/i.test(rawSql), 'the new save\'s body carries the "Round 648 profile rule" marker both guards look for');

  /* Part 1: the add is the day's improvement at the cap, from the table. */
  need(/perform pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\('record_auth_completion:' \|\| v_user::text, 0\)\);/.test(part1),
    'the save takes a per player transaction lock before it reads the day\'s best');
  const lockAt = part1.indexOf('pg_advisory_xact_lock(pg_catalog.hashtextextended');
  const readAt = part1.indexOf('select max(s.score) into v_before from public.user_game_scores s where s.user_id = v_user and s.game_type = p_game_slug and s.puzzle_date = v_today;');
  need(readAt >= 0, 'the save reads the day\'s best of this player, this game, this puzzle date');
  need(lockAt >= 0 && readAt > lockAt, 'the lock is taken before the day\'s best is read');
  need(part1.includes('from public.game_score_caps c where c.game = p_game_slug'), 'the save reads its cap from game_score_caps, the table the page reads');
  need(part1.includes('case when c.max_score is null then null else greatest(c.max_score, 1) end'), 'the save keeps a NULL cap as no ceiling rather than letting greatest() turn it into 1');
  need(part1.includes('when v_listed is null then 0'), 'a game with no row adds nothing');
  need(part1.includes('when v_before is null then least(v_after, v_cap)'), 'the first play of the day adds its capped score');
  need(part1.includes('else least(v_after, v_cap) - least(v_before, v_cap)'), 'a later play the same day adds only what it beats the day\'s capped best by');
  need(part1.includes('(v_user, v_add, greatest(v_games, 1), now(), now(), 1, 1)'), 'the stored total grows by v_add, not by the score');
  need(!/game_denominators/.test(code), 'no code in the migration reads game_denominators, whose NULL fallback is the percentile Round 370 took off the hot path');

  /* Part 2: the same grouping, the same caps, backed up, verified. */
  need(part2.includes("position('round 648 profile rule' in lower(v_def)) = 0 then raise exception"), 'part 2 refuses to run unless part 1\'s save is in place');
  const capsAt = part2.indexOf('create temporary table r648_caps');
  const lockTableAt = part2.indexOf('lock table public.user_scores in exclusive mode');
  need(capsAt >= 0 && lockTableAt > capsAt, 'part 2 copies the caps out before it locks user_scores');
  need(part2.includes('case when k.cap is null then max(s.score) else least(max(s.score), k.cap) end as worth'), 'part 2 values a game day at its best, capped');
  need(/group by s\.user_id, s\.game_type, s\.puzzle_date, k\.cap \)/.test(part2), 'part 2 groups one row per player per game per puzzle date, as the 2026-09-19 recompute did');
  const bakAt = part2.indexOf('insert into private.r648_totals_bak');
  const updAt = part2.indexOf('update public.user_scores u set total_points = m.total');
  need(bakAt >= 0 && updAt > bakAt, 'part 2 backs every changed total up before it writes');
  need(/if v_off > 0 then raise exception/.test(part2), 'part 2 raises, rolling back, if any stored total still differs from the rule afterwards');
  return reds;
}

function sqlSection(rawSql) {
  console.log(`\n3) The migration, read as code: ${MIGRATION}`);
  const reds = checkMigration(rawSql);
  for (const r of reds) fail(`section 3: ${r}`);
  if (!reds.length) console.log('   part 1 adds the day\'s improvement at the cap under a per player lock, part 2 recomputes by the same grouping, every precondition refuses before the first write');
  return reds;
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
function defaultRun() {
  console.log(`1) The profile total, the tally, the recorder, the repair and the page: ${TEST}`);
  const run = runSuite(null);
  if (run.error) { fail(run.error); return; }
  if (run.loadError) { fail('vitest could not load the suite:\n' + run.loadError); return; }
  if (run.tests.size !== EXPECTED_CASES) {
    fail(`vitest collected ${run.tests.size} cases from ${TEST}, this harness expects ${EXPECTED_CASES}`);
  }
  for (const [title, t] of run.tests) {
    const ok = t.status === 'passed';
    console.log(`   ${ok ? 'ok  ' : 'RED '}${title}${ok ? '' : `: ${t.message}`}`);
    if (!ok) fail(`${title}`);
  }
  if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every case green, so something outside the cases broke`);

  console.log('\n2) Before and after, on the planted records');
  if (!run.measure) {
    fail('the suite printed no PROFILE_TOTAL_MEASURE line, so the before and after were not measured');
  } else {
    const m = run.measure;
    const n = x => Number(x).toLocaleString('en-US');
    console.log(`   ${n(m.records)} records. Raw sum ${n(m.raw)}; the first draft's per record clamp ${n(m.perRecordClamp)}; the rule ${n(m.rule)}.`);
    console.log(`   The leak rows (per match Club Manager rows and reload repeats): raw ${n(m.leakRaw)}, per record clamp ${n(m.leakPerRecord)}, the rule ${n(m.leakRule)}.`);
    console.log(`   Not fixed by any cap: a Pack Battle record of ${n(m.packBattle)} counts in full, its cap is ${n(m.packBattleCap)}.`);
    if (!(m.leakRule < m.leakPerRecord && m.leakPerRecord <= m.leakRaw)) fail('the rule does not keep less of the leak rows than the per record clamp, so the planted set no longer reproduces what the recompute removed');
    if (!(m.rule < m.perRecordClamp && m.perRecordClamp < m.raw)) fail('the three totals are not ordered raw above per record clamp above the rule');
  }

  sqlSection(fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8').replaceAll('\r\n', '\n'));
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
function writeBrokenCopy(name, c) {
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replaceAll('\r\n', '\n');
  if (count(src, c.from) !== 1) abort(`control ${name} cannot run: its anchor occurs ${count(src, c.from)} times in ${c.file}, it must occur exactly once`);
  if (count(stripTs(src), c.from) !== 1) abort(`control ${name} cannot run: its anchor in ${c.file} is not code (it only matches inside a comment)`);
  const changed = src.replace(c.from, c.to);
  if (changed === src) abort(`control ${name} changed nothing in ${c.file}`);
  const dir = path.join(ROOT, 'dist', '.profile-total-control', name);
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, path.basename(c.file));
  fs.writeFileSync(copy, changed);
  return copy;
}

function sourceControlRun(name) {
  const c = SOURCE_CONTROLS[name];
  console.log(`CONTROL ${name}: ${c.why}`);
  const copy = writeBrokenCopy(name, c);
  const run = runSuite({ [c.alias]: copy });
  if (run.error) { fail(run.error); return false; }
  if (run.loadError) { fail('vitest could not load the suite under the control:\n' + run.loadError); return false; }
  if (run.tests.size !== EXPECTED_CASES) { fail(`the control run collected ${run.tests.size} cases, expected ${EXPECTED_CASES}`); return false; }
  let good = true;
  for (const [title, t] of run.tests) {
    const n = caseNumber(title);
    const mustBeRed = c.red.includes(n);
    const isRed = t.status !== 'passed';
    const ok = mustBeRed === isRed;
    console.log(`   ${ok ? 'ok  ' : 'BAD '}case ${n} ${isRed ? 'red  ' : 'green'} (${mustBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    if (!ok) good = false;
  }
  if (run.code === 0) { console.log('   BAD vitest exited 0 under a control'); good = false; }
  if (good) console.log(`CONTROL PROVED ${name}: cases ${c.red.join(', ')} went red on their own assertions and every other case stayed green.`);
  else fail(`control ${name} did not fire the way it must`);
  return good;
}

function sqlControlRun(name) {
  const c = SQL_CONTROLS[name];
  console.log(`CONTROL ${name}: ${c.why}`);
  const src = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8').replaceAll('\r\n', '\n');
  if (count(src, c.from) !== 1) abort(`control ${name} cannot run: its anchor occurs ${count(src, c.from)} times in ${MIGRATION}, it must occur exactly once`);
  if (count(stripSql(src), c.from) !== 1) abort(`control ${name} cannot run: its anchor in ${MIGRATION} is not code (it only matches inside a comment)`);
  const baseline = checkMigration(src);
  if (baseline.length) abort(`control ${name} cannot run: section 3 is already red on the real migration (${baseline[0]})`);
  const broken = src.replace(c.from, c.to);
  if (broken === src) abort(`control ${name} changed nothing in ${MIGRATION}`);
  const reds = checkMigration(broken);
  for (const r of reds) console.log(`   red: ${r}`);
  if (reds.length) { console.log(`CONTROL PROVED ${name}: section 3 went red on the broken migration and is green on the real one.`); return true; }
  fail(`control ${name}: section 3 stayed green on the broken migration`);
  return false;
}

if (!CONTROL) {
  defaultRun();
  console.log('');
  if (failures) { console.error(`simProfileTotal: ${failures} failure(s)`); process.exit(1); }
  console.log('simProfileTotal: green. The profile total, the browser tally and the stored total are one rule: one row per game per day, the day\'s best, capped.');
  process.exit(0);
}

const names = CONTROL === 'all' ? [...Object.keys(SOURCE_CONTROLS), ...Object.keys(SQL_CONTROLS)] : [CONTROL];
let proved = 0;
for (const name of names) {
  const ok = SOURCE_CONTROLS[name] ? sourceControlRun(name) : sqlControlRun(name);
  if (ok) proved += 1;
}
console.log('');
if (proved === names.length) { console.log(`simProfileTotal controls: ${proved} of ${names.length} proved.`); process.exit(0); }
console.error(`simProfileTotal controls: ${proved} of ${names.length} proved, ${names.length - proved} did NOT fire the way they must.`);
process.exit(1);
