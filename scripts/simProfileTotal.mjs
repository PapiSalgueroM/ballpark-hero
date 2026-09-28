/* Profile total harness: the profile's all time total is the owner's
   recompute rule of 2026-09-19, one row per game per day at the day's best,
   capped, on the page, in the browser's own tally and in the database. The
   day is the Eastern day.

   Round 648. The profile's Total Points was two running sums of raw scores:
   user_scores.total_points on the server, grown by record_auth_completion by
   the raw score of every save, and the browser's own tally in
   src/lib/streaks.ts, grown by the recorder the same way. The browser's sum
   is where a Pack Battle pack's banked dollars (8,800,000 is an ordinary
   pack) landed; the server refuses any record above 100,000. The server's sum
   was rebuilt by the owner's recompute of 2026-09-19 and has grown raw again
   on every save since. The rule lives in src/lib/pointsRule.ts; the caps are
   public.game_score_caps (the table, never the percentile view); the day is
   the Eastern day of a record's created_at, the day Round 537 moved the site
   and the World Leaderboard to, never the UTC puzzle_date.

   WHAT THIS MEASURES.
   1. src/test/profileTotal.test.tsx, ten cases against a planted record set
      in the real shape (per match Club Manager rows and reload repeats, the
      two leaks the recompute took out, beside old scale records, a Pack
      Battle pack at the most a record can hold, a NULL cap, a game with no
      row, and 1,003 one day plays so the read must page), with the caps as
      they stand once Rounds 644 and 646 are applied. Cases: the pure rule,
      the profile hook, a failed read, the browser tally, the real recorder
      end to end, an empty caps read, a tally counted before the rule (an
      honest one left exactly as it is, one above what the rule allows cut to
      it, the badges and achievements it earned kept), the Profile page
      itself rendered, the Eastern day on the hook and the tally, and an old
      tab writing the store in its own shape (the new fields survive, its
      points are checked, a write keeps fields it does not know).
   2. The before and after, printed from case 1: the raw sum, the first
      draft's per record clamp, and the rule, and what each keeps of the leak
      rows. Fails if the rule keeps as much of the leak rows as either
      baseline, so a planted set that stopped reproducing the leaks is red.
   3. The two migrations, read as code with their comments stripped.
      supabase/migrations/20260928_round_648_profile_clamp.sql replaces the
      save: it adds the day's improvement at the cap, the day being the
      Eastern day, under a per player lock, with the caps from the table, and
      it takes no lock on user_scores and recomputes nothing.
      supabase/migrations/20260928_round_648_profile_recompute.sql recomputes
      every stored total by the same grouping, and refuses unless file 1's
      save is in place AND was committed by an earlier transaction, so the
      save is replaced before the recompute takes its lock. Every refusal
      sits before the first write. Static, because this machine has no
      database; it holds the shape, and the vitest cases hold the arithmetic
      the shape encodes.

   NEGATIVE CONTROLS. The source controls each write a broken copy of one
   module under dist/.profile-total-control and point vitest at it through
   PROFILE_TOTAL_SWAP in vitest.config.ts (src is never written); every case
   is judged, the targeted ones must go red on their own assertion and every
   other must stay green. The SQL controls rewrite one migration in memory
   and must turn section 3 red. Every control refuses to run unless its
   anchor occurs exactly once and is code, not a comment.
     perrecord     the rule sums every record, not the day's best      1, 2, 8, 9
     nocap         a game day is worth its best with no cap            1, 2, 4, 5, 6, 8
     nodaycolumn   the hook drops the record's day, so days merge      2, 9
     utchook       the hook groups by the UTC date                     9
     firstpage     the hook reads one page of records                  2
     localrepeat   a second play the same day adds in full            4, 5, 9, 10
     utctally      the tally credits a play on its UTC date            9
     recordmax     the tally counts a play the server cannot store     4, 5
     settleraw     a held play settles with no cap                     4, 5, 6
     nocapwire     the recorder stops handing the tally a cap          5
     noprime       the recorder stops kicking off the caps read        5
     nocut         a tally above what the rule allows is kept          7, 10
     cutall        a tally counted before the rule is cut whole        7, 10
     noforeign     points counted without the rule go unchecked        7, 10
     novisitprime  the streak hook stops asking for the caps           7
     nofloor       the points badges read only the cut tally           7
     nofloorach    the points achievements read only the cut tally     7
     onekey        the points record shares the key an old tab writes  10
     nomerge       a write drops fields it does not know (streak key)  10
     nomergepoints a write drops fields it does not know (points key)  10
     pagewiring    the page shows the stored running sum               8
     sqlnoclamp    the save adds the raw improvement                   section 3
     sqlutcread    the save reads the day's best by UTC puzzle_date    section 3
     sqlnoguard    the save no longer refuses before Round 646         section 3
     sqlonefile    the save's file also locks user_scores              section 3
     sqlperrecord  the recompute groups per record                     section 3
     sqlutcgroup   the recompute groups by UTC puzzle_date             section 3
     sqlsametx     the recompute runs in the save's own transaction    section 3
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
const MIGRATIONS = {
  fn: 'supabase/migrations/20260928_round_648_profile_clamp.sql',
  recompute: 'supabase/migrations/20260928_round_648_profile_recompute.sql',
};
const CONTROL = process.env.PROFILE_TOTAL_CONTROL || '';
const EXPECTED_CASES = 10;

const SOURCE_CONTROLS = {
  perrecord: {
    file: 'src/lib/pointsRule.ts', alias: '@/lib/pointsRule',
    from: "    const key = `${record.game}\\u0000${record.day ?? '\\u0000null'}`;",
    to: '    const key = `${best.size}`;',
    why: 'the rule sums every record instead of the day\'s best, which puts the leak rows back',
    red: ['1', '2', '8', '9'],
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
    from: 'day: recordDay(r.created_at) }))',
    to: 'day: null }))',
    why: 'the hook stops handing the rule the record\'s day, so every day of a game merges into one',
    red: ['2', '9'],
  },
  utchook: {
    file: 'src/hooks/useProfileTotal.ts', alias: '@/hooks/useProfileTotal',
    from: '  return Number.isNaN(at.getTime()) ? null : getEtDateString(at);',
    to: '  return Number.isNaN(at.getTime()) ? null : at.toISOString().slice(0, 10);',
    why: 'the hook groups a record by the UTC date it was saved on, as puzzle_date does, not by its Eastern day',
    red: ['9'],
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
    red: ['4', '5', '9', '10'],
  },
  utctally: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '      creditDay(state, gameSlug, today, points, cap === null ? null : Math.max(1, cap));',
    to: '      creditDay(state, gameSlug, when.toISOString().slice(0, 10), points, cap === null ? null : Math.max(1, cap));',
    why: 'the tally credits a play on its UTC date instead of the Eastern day',
    red: ['9'],
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
  nocut: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '  if (cut > 0) {',
    to: '  if (cut > 0 && false) {',
    why: 'a tally above what the rule could have paid is kept as it was, so the inflated sum stays on the profile',
    red: ['7', '10'],
  },
  cutall: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '  const allowed = ruleAllowance(points, plays, Object.keys(state.perGame), caps, tallyDays(state));',
    to: '  const allowed = 0;',
    why: 'every point counted without the rule is cut, the honest ones too (the first fix\'s retire everything)',
    red: ['7', '10'],
  },
  noforeign: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '    if (foreign > 0) {',
    to: '    if (foreign > 0 && false) {',
    why: 'points counted without the rule (a pre 648 sum, an old tab\'s adds) are never found, so never checked',
    red: ['7', '10'],
  },
  novisitprime: {
    file: 'src/hooks/useStreaks.ts', alias: '@/hooks/useStreaks',
    from: '    if (visited.unchecked.points > 0) primeScoreCaps().then(refresh, () => {});',
    to: '    if (visited.unchecked.points > 0) Promise.resolve(null).then(refresh, () => {});',
    why: 'the streak hook stops asking for the caps, so a player who only opens a page keeps an unchecked tally',
    red: ['7'],
  },
  nofloor: {
    file: 'src/lib/badges.ts', alias: '@/lib/badges',
    from: '  const badgePoints = Math.max(streaks.totalPoints || 0, streaks.pointsBadgeFloor || 0);',
    to: '  const badgePoints = streaks.totalPoints || 0;',
    why: 'the points badges read only the cut tally, so a cut takes back a badge already earned',
    red: ['7'],
  },
  nofloorach: {
    file: 'src/lib/achievements.ts', alias: '@/lib/achievements',
    from: '    totalPoints: Math.max(serverPoints, streaks.totalPoints ?? 0, streaks.pointsBadgeFloor ?? 0),',
    to: '    totalPoints: Math.max(serverPoints, streaks.totalPoints ?? 0),',
    why: 'the points achievements read only the cut tally, so a cut takes back one already earned',
    red: ['7'],
  },
  onekey: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: "const POINTS_KEY = 'dukb-points-v1';",
    to: "const POINTS_KEY = 'dukb-streaks-v1';",
    why: 'the points record lives in the key an old tab rewrites in its own shape, so its next write drops the new fields',
    red: ['10'],
  },
  nomerge: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '      ...(readJson(STORAGE_KEY) ?? {}),\n',
    to: '',
    why: 'a write of the streak key drops the fields it does not know',
    red: ['10'],
  },
  nomergepoints: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '      ...(readJson(POINTS_KEY) ?? {}),\n',
    to: '',
    why: 'a write of the points key drops the fields it does not know',
    red: ['10'],
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
    file: 'fn',
    from: '    else least(v_after, v_cap) - least(v_before, v_cap)',
    to: '    else v_after - v_before',
    why: 'the save adds the raw improvement of the day, ignoring the cap',
  },
  sqlutcread: {
    file: 'fn',
    from: "     and (s.created_at at time zone 'America/New_York')::date = v_day;",
    to: '     and s.puzzle_date = v_today;',
    why: 'the save reads the day\'s best by the UTC puzzle_date, so two dailies either side of 8pm Eastern share a day',
  },
  sqlnoguard: {
    file: 'fn',
    from: "  if to_regclass('private.r646_caps_bak') is null then\n    raise exception 'Round 648: Round 646 has not been applied",
    to: "  if false then\n    raise exception 'Round 648: Round 646 has not been applied",
    why: 'the save\'s file no longer refuses to run before Round 646 has set the real ceilings',
  },
  sqlonefile: {
    file: 'fn',
    from: 'end\n$r648_part1$;',
    to: 'end\n$r648_part1$;\nlock table public.user_scores in exclusive mode;',
    why: 'the save\'s file also takes the recompute\'s lock, so the new save is not committed before writers queue behind it',
  },
  sqlperrecord: {
    file: 'recompute',
    from: "             group by s.user_id, s.game_type, (s.created_at at time zone 'America/New_York')::date, k.cap",
    to: "             group by s.user_id, s.game_type, (s.created_at at time zone 'America/New_York')::date, k.cap, s.id",
    why: 'the recompute groups per record, which puts the leak rows back into every stored total',
  },
  sqlutcgroup: {
    file: 'recompute',
    from: "             group by s.user_id, s.game_type, (s.created_at at time zone 'America/New_York')::date, k.cap",
    to: '             group by s.user_id, s.game_type, s.puzzle_date, k.cap',
    why: 'the recompute groups by the UTC puzzle_date instead of the Eastern day',
  },
  sqlsametx: {
    file: 'recompute',
    from: '  if v_same_tx then',
    to: '  if false then',
    why: 'the recompute no longer refuses to run in the transaction that replaced the save, so queued saves would run the old one',
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
const readMigration = key => fs.readFileSync(path.join(ROOT, MIGRATIONS[key]), 'utf8').replaceAll('\r\n', '\n');

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
/* Section 3: the two migrations, read as code                               */
/* ------------------------------------------------------------------------ */
function checkMigrations(raw) {
  const reds = [];
  const need = (ok, what) => { if (!ok) reds.push(what); };
  const flat = t => stripSql(t).toLowerCase().replace(/\s+/g, ' ');
  const fn = flat(raw.fn);
  const re = flat(raw.recompute);

  /* File 1: the save, and nothing else. */
  const p1Start = fn.indexOf('do $r648_part1$');
  need(p1Start >= 0, 'the save\'s file no longer replaces the save inside one guarded block');
  const part1 = p1Start >= 0 ? fn.slice(p1Start) : '';
  const firstExecute = part1.indexOf('execute $fn$');
  const guards = [
    ["to_regclass('private.r646_caps_bak') is null then raise exception", 'the save\'s file refuses to run before Round 646 is applied'],
    ["to_regclass('private.r644_state') is null then raise exception", 'the save\'s file refuses to run before Round 644 is applied'],
    ["if v_left > 0 then raise exception 'round 648: round 644 part 2 still has", 'the save\'s file refuses while Round 644 part 2 has rows left to divide'],
    ["if md5(v_def) is distinct from v_md5_569 and position('round 648 profile rule (eastern day)' in lower(v_def)) = 0 then raise exception", 'the save\'s file refuses to replace a save it does not recognise'],
    ["has_function_privilege('authenticated', 'pg_catalog.pg_advisory_xact_lock(bigint)', 'execute')", 'the save\'s file checks the lock it takes is executable by authenticated'],
    ['if not exists (select 1 from public.game_score_caps) then raise exception', 'the save\'s file refuses an empty allowlist'],
  ];
  for (const [shape, what] of guards) {
    const at = part1.indexOf(shape);
    need(at >= 0 && firstExecute > at, `${what}, before its first write`);
  }
  need(!fn.includes('lock table public.user_scores') && !fn.includes('update public.user_scores'),
    'the save\'s file takes no lock on user_scores and rewrites no stored total, so the new save commits before the recompute locks anyone out');
  need(!/create or replace function public\.record_auth_completion\(/.test(re),
    'the recompute\'s file does not replace the save');

  /* The marker both refusals find the new save by lives in a comment inside
     the function body, which pg_get_functiondef keeps; read it raw. */
  need(/as \$body\$[\s\S]*?round 648 profile rule \(eastern day\)[\s\S]*?\$body\$/i.test(raw.fn), 'the new save\'s body carries the "Round 648 profile rule (Eastern day)" marker both files look for');

  /* The add: the day's improvement at the cap, from the table, on the Eastern day. */
  need(/perform pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\('record_auth_completion:' \|\| v_user::text, 0\)\);/.test(part1),
    'the save takes a per player transaction lock before it reads the day\'s best');
  need(part1.includes("v_day date := (now() at time zone 'america/new_york')::date;"), 'the save\'s day is the Eastern day of now(), the day Round 537 moved the board to');
  const lockAt = part1.indexOf('pg_advisory_xact_lock(pg_catalog.hashtextextended');
  const readAt = part1.indexOf("select max(s.score) into v_before from public.user_game_scores s where s.user_id = v_user and s.game_type = p_game_slug and (s.created_at at time zone 'america/new_york')::date = v_day;");
  need(readAt >= 0, 'the save reads the day\'s best of this player, this game, this Eastern day (never the UTC puzzle_date)');
  need(lockAt >= 0 && readAt > lockAt, 'the lock is taken before the day\'s best is read');
  need(part1.includes('from public.game_score_caps c where c.game = p_game_slug'), 'the save reads its cap from game_score_caps, the table the page reads');
  need(part1.includes('case when c.max_score is null then null else greatest(c.max_score, 1) end'), 'the save keeps a NULL cap as no ceiling rather than letting greatest() turn it into 1');
  need(part1.includes('when v_listed is null then 0'), 'a game with no row adds nothing');
  need(part1.includes('when v_before is null then least(v_after, v_cap)'), 'the first play of the day adds its capped score');
  need(part1.includes('else least(v_after, v_cap) - least(v_before, v_cap)'), 'a later play the same day adds only what it beats the day\'s capped best by');
  need(part1.includes('(v_user, v_add, greatest(v_games, 1), now(), now(), 1, 1)'), 'the stored total grows by v_add, not by the score');

  /* File 2: the recompute, after the save has committed. */
  const r2Start = re.indexOf('do $r648_recompute$');
  need(r2Start >= 0, 'the recompute\'s file no longer recomputes inside one guarded block');
  const part2 = r2Start >= 0 ? re.slice(r2Start) : '';
  const lockTableAt = part2.indexOf('lock table public.user_scores in exclusive mode');
  const firstWrite = part2.indexOf('create table if not exists private.r648_totals_bak');
  const refusals = [
    ["position('round 648 profile rule (eastern day)' in lower(v_def)) = 0 then raise exception", 'the recompute refuses unless the save 20260928_round_648_profile_clamp.sql writes is in place'],
    ['select (p.xmin::text)::bigint = pg_catalog.txid_current() % 4294967296 into v_same_tx from pg_catalog.pg_proc p', 'the recompute asks whether the save was written by its own transaction'],
    ['if v_same_tx then raise exception', 'the recompute refuses to run in the transaction that replaced the save'],
    ["to_regclass('private.r646_caps_bak') is null then raise exception", 'the recompute refuses to run before Round 646 is applied'],
    ['if not exists (select 1 from public.game_score_caps) then raise exception', 'the recompute refuses an empty allowlist'],
  ];
  for (const [shape, what] of refusals) {
    const at = part2.indexOf(shape);
    need(at >= 0 && firstWrite > at && lockTableAt > at, `${what}, before its first write and before its lock`);
  }
  const capsAt = part2.indexOf('create temporary table r648_caps');
  need(capsAt >= 0 && lockTableAt > capsAt, 'the recompute copies the caps out before it locks user_scores');
  need(part2.includes('case when k.cap is null then max(s.score) else least(max(s.score), k.cap) end as worth'), 'the recompute values a game day at its best, capped');
  need(/group by s\.user_id, s\.game_type, \(s\.created_at at time zone 'america\/new_york'\)::date, k\.cap \)/.test(part2), 'the recompute groups one row per player per game per Eastern day');
  need(!/puzzle_date/.test(re), 'no code in the recompute reads puzzle_date, the UTC date');
  const bakAt = part2.indexOf('insert into private.r648_totals_bak');
  const updAt = part2.indexOf('update public.user_scores u set total_points = m.total');
  need(bakAt >= 0 && updAt > bakAt, 'the recompute backs every changed total up before it writes');

  need(!/game_denominators/.test(fn + ' ' + re), 'no code in either migration reads game_denominators, whose NULL fallback is the percentile Round 370 took off the hot path');
  return reds;
}

function sqlSection(raw) {
  console.log(`\n3) The migrations, read as code: ${MIGRATIONS.fn} then ${MIGRATIONS.recompute}`);
  const reds = checkMigrations(raw);
  for (const r of reds) fail(`section 3: ${r}`);
  if (!reds.length) console.log('   the save adds the Eastern day\'s improvement at the cap under a per player lock and locks nothing else; the recompute runs only after that save has committed, groups the same way, and every refusal comes before the first write');
  return reds;
}

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
function defaultRun() {
  console.log(`1) The profile total, the tally, the recorder, the check, the page, the day and the old tab: ${TEST}`);
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
    console.log('   Not fixed by the check: an 8,810,000 tally over 41 plays of Pack Battle and Soccer Grid is cut to 4,000,000, the most 40 Pack Battle days could pay (case 7).');
    if (!(m.leakRule < m.leakPerRecord && m.leakPerRecord <= m.leakRaw)) fail('the rule does not keep less of the leak rows than the per record clamp, so the planted set no longer reproduces what the recompute removed');
    if (!(m.rule < m.perRecordClamp && m.perRecordClamp < m.raw)) fail('the three totals are not ordered raw above per record clamp above the rule');
  }

  sqlSection({ fn: readMigration('fn'), recompute: readMigration('recompute') });
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
  const raw = { fn: readMigration('fn'), recompute: readMigration('recompute') };
  const src = raw[c.file];
  const where = MIGRATIONS[c.file];
  if (count(src, c.from) !== 1) abort(`control ${name} cannot run: its anchor occurs ${count(src, c.from)} times in ${where}, it must occur exactly once`);
  if (count(stripSql(src), c.from) !== 1) abort(`control ${name} cannot run: its anchor in ${where} is not code (it only matches inside a comment)`);
  const baseline = checkMigrations(raw);
  if (baseline.length) abort(`control ${name} cannot run: section 3 is already red on the real migrations (${baseline[0]})`);
  const broken = src.replace(c.from, c.to);
  if (broken === src) abort(`control ${name} changed nothing in ${where}`);
  const reds = checkMigrations({ ...raw, [c.file]: broken });
  for (const r of reds) console.log(`   red: ${r}`);
  if (reds.length) { console.log(`CONTROL PROVED ${name}: section 3 went red on the broken migration and is green on the real ones.`); return true; }
  fail(`control ${name}: section 3 stayed green on the broken migration`);
  return false;
}

if (!CONTROL) {
  defaultRun();
  console.log('');
  if (failures) { console.error(`simProfileTotal: ${failures} failure(s)`); process.exit(1); }
  console.log('simProfileTotal: green. The profile total, the browser tally and the stored total are one rule: one row per game per Eastern day, the day\'s best, capped.');
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
