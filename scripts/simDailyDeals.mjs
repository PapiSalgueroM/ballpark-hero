/* Release AT: the two dailies that deal from the Club Manager engine deal the day they dealt before.
 *
 * WHY. Round 1184 binds the real 2026/27 Premier League fixture list to every new original Premier League
 * career. Manager Hot Seat and Deadline Day both open their day with startCareer(club), so on the merged
 * tree a Premier League day was built on another season: measured over 120 dates against Release AS
 * (54e3820a), the Hot Seat dealt a different job on 5 dates and those 5 were exactly its Premier League
 * days (remote check rAT-cm-a2, line daily2). Nottingham Forest on 2026-10-27: 6th of 20 after 11 games
 * and 19 points on Release AS, 12th after 6 games and 7 points on the merged tree. Both daily harnesses
 * were green on it, because neither held a deal. This one does.
 *
 * WHAT IT HOLDS, for a fixed window of dates that CONTAINS Premier League days (the next 17 days from
 * 2026-10-10 hold none, so a window of "the next fortnight" is green with the defect in place):
 *   1. no daily state carries the fixture key (realLeagueFixtures);
 *   2. each date's deal is the deal Release AS dealt. The deal is what a player is handed and what
 *      happens when the day is played one fixed way: Hot Seat = the club, the seed, the takeover, the
 *      board's target, the next fixture, the table, then every result of the run played balanced with no
 *      talk and the first press answer, the verdict and the share text; Deadline Day = the club, the
 *      seed, the needs, the targets, the sales, the budget, the ticker and the grade of a day ended at
 *      once. Whole engine states are left out on purpose: they move with any new save field.
 * BASELINE below was recorded from the source of 54e3820a itself (this file run with --root on a worktree
 * of that commit, remote check named in the commit that recorded it), never from this tree.
 *
 * Every date is dealt by a FRESH copy of the engine module, the way a page load deals it, with the clock
 * fixed, so a counter one date moved cannot leak into the next.
 *
 * CONTROLS, each must go red on its own dates and nowhere else (exit 1, last line says FIRED):
 *   DAILY_DEALS_CONTROL=bind          takes the Hot Seat's strip of the key back out
 *   DAILY_DEALS_CONTROL=binddeadline  takes Deadline Day's strip back out
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simDailyDeals.mjs                        the gate
 *   node scripts/simDailyDeals.mjs --root <tree> --print  print the digests of another tree's source
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const ROOT = path.resolve(arg('--root') || HERE);
const PRINT = process.argv.includes('--print');
const CONTROL = process.env.DAILY_DEALS_CONTROL || '';
const cannot = why => { console.error(`simDailyDeals: cannot run: ${why}`); process.exit(2); };
if (CONTROL && !['bind', 'binddeadline'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);

/* The window. The five Hot Seat dates marked PL are its first five Premier League days from 2026-10-10. */
const HOT = [
  ['2026-10-10'], ['2026-10-11'], ['2026-10-12'], ['2026-10-13'], ['2026-10-14'], ['2026-10-15'], ['2026-10-16'],
  ['2026-10-27', 'Nottingham Forest'], ['2026-11-14', 'Sunderland'], ['2027-01-19', 'Fulham'], ['2027-01-30', 'Everton'], ['2027-02-06', 'Bournemouth'],
];
const DEADLINE = [
  ['2026-10-10'], ['2026-10-11'], ['2026-10-12'],
  ['2026-10-18', 'Nottingham Forest'], ['2026-11-01', 'Manchester United'], ['2026-11-09', 'Sunderland'],
];

/* Recorded from 54e3820a (Release AS). Do not retake from this tree: a deal that moved is the defect. */
const BASELINE = {
  hot: {
    '2026-10-10': '34412a45b0e5bb50c77c',
    '2026-10-11': '4a366598389ab2892176',
    '2026-10-12': 'cb14ddd446a9e7fd66cb',
    '2026-10-13': 'bef144e095aa3d1420d8',
    '2026-10-14': '1ef2cd0784039671c51c',
    '2026-10-15': 'f80bb07d1fc4d8a0ff29',
    '2026-10-16': 'ebda0cd99fe400a8d2f4',
    '2026-10-27': 'c9af2ca70b2ea9ce4f3e',
    '2026-11-14': 'd31a907e262a745a4246',
    '2027-01-19': 'e233082a22176e8e1cd8',
    '2027-01-30': '7ef7837d86a8088ad0fe',
    '2027-02-06': '2784bbcba11e0777c580',
  },
  deadline: {
    '2026-10-10': 'e57fbb3c1e90b2d46068',
    '2026-10-11': 'a0c9a61cde6e2fbaad54',
    '2026-10-12': '57bff3d44d9920c4cd6b',
    '2026-10-18': '58f28ed0ec217ebbad3e',
    '2026-11-01': '903c3cc05441b1d6e93a',
    '2026-11-09': '8bea270b4e6a58d33e87',
  },
};

const STRIPS = {
  bind: { file: 'managerHotSeat.ts', line: '  delete s.realLeagueFixtures;' },
  binddeadline: { file: 'deadlineDay.ts', line: '    delete state0.realLeagueFixtures;' },
};
const controlPlugin = {
  name: 'daily-deals-control',
  setup(b) {
    if (!CONTROL) return;
    const { file, line } = STRIPS[CONTROL];
    b.onLoad({ filter: new RegExp(file.replace('.', '[.]') + '$') }, async args => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const count = source.split(line).length - 1;
      if (count !== 1) cannot(`control ${CONTROL}: its line is in ${file} ${count} times, it must be exactly once`);
      return { contents: source.replace(line, ''), loader: 'ts' };
    });
  },
};

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-deals-'));
const entry = path.join(work, 'entry.ts');
const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
fs.writeFileSync(entry, `export * as hs from ${P('src/lib/managerHotSeat.ts')};\nexport * as dd from ${P('src/lib/deadlineDay.ts')};\n`);
const bundle = path.join(work, 'daily.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const fresh = () => { delete req.cache[req.resolve(bundle)]; store.clear(); return req(bundle); };
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 20);

function hotSeat(date) {
  const { hs } = fresh();
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  const keyed = 'realLeagueFixtures' in run.state;
  const opened = [setup.club, setup.seed, run.takeover, run.target, hs.upcoming(run), run.state.table];
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  const played = [run.log.map(m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res]), run.verdict ? [run.verdict.kind, run.points] : null, run.verdict ? hs.shareText(run) : null];
  const line = `${setup.club}: ${run.takeover.position} of ${run.takeover.clubs} after ${run.takeover.played}, ${run.takeover.points} pts, target ${run.target}; ${run.log.map(m => `${m.opponent} ${m.myGoals}-${m.oppGoals}`).join(', ')}; ${run.verdict?.kind ?? 'no verdict'}`;
  return { club: setup.club, keyed: keyed || 'realLeagueFixtures' in run.state, digest: sha([opened, played]), line };
}
function deadline(date) {
  const { dd } = fresh();
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.startDeadlineDay(setup);
  const grade = dd.gradeWindow(dd.endDay(run));
  return { club: setup.club, keyed: 'realLeagueFixtures' in run.state, digest: sha([setup.club, setup.seed, run.needs, run.targets, run.sales, run.startBudget, run.ticker, grade]), line: `${setup.club}: ${run.needs.length} needs, ${run.targets.length} targets, ${run.sales.length} sales, budget ${run.startBudget}` };
}

const out = { hot: {}, deadline: {} };
const fails = { hot: [], deadline: [] };
for (const [kind, rows, deal] of [['hot', HOT, hotSeat], ['deadline', DEADLINE, deadline]]) {
  for (const [date, club] of rows) {
    const got = deal(date);
    if (club && got.club !== club) cannot(`${kind} ${date} deals ${got.club}, the window expects ${club}: the window no longer holds this Premier League day`);
    out[kind][date] = got.digest;
    console.log(`  ${kind.padEnd(8)} ${date} ${club ? 'PL ' : '   '}${got.digest} ${got.line}`);
    if (PRINT) continue;
    const why = [];
    if (got.keyed) why.push('the state carries the real fixture key');
    if (!BASELINE[kind][date]) why.push('no recorded deal for this date');
    else if (BASELINE[kind][date] !== got.digest) why.push(`the deal moved: recorded ${BASELINE[kind][date]}, dealt ${got.digest}`);
    if (why.length) { fails[kind].push(date); console.log(`FAIL ${kind} ${date} (${got.club}): ${why.join('; ')}`); }
  }
}
if (PRINT) {
  console.log(JSON.stringify(out));
  if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'daily-deals.json'), JSON.stringify(out, null, 2));
  /* --verify: is the recorded BASELINE really the deals of the tree at --root? This is how the recording is
     proven to be Release AS's own, on a worktree of 54e3820a. */
  if (!process.argv.includes('--verify')) process.exit(0);
  const same = JSON.stringify(out) === JSON.stringify(BASELINE);
  console.log(same
    ? `simDailyDeals: the recorded deals ARE the deals of the source at ${ROOT} (${HOT.length} Hot Seat dates, ${DEADLINE.length} Deadline Day dates)`
    : `simDailyDeals: the recorded deals are NOT the deals of the source at ${ROOT}`);
  process.exit(same ? 0 : 1);
}

const pl = rows => rows.filter(r => r[1]).map(r => r[0]);
const total = fails.hot.length + fails.deadline.length;
if (CONTROL) {
  const [mine, other, want] = CONTROL === 'bind' ? [fails.hot, fails.deadline, pl(HOT)] : [fails.deadline, fails.hot, pl(DEADLINE)];
  const fired = JSON.stringify(mine) === JSON.stringify(want) && other.length === 0;
  console.log(fired
    ? `simDailyDeals: CONTROL ${CONTROL} FIRED: its ${want.length} Premier League dates went red (${want.join(', ')}) and no other date moved`
    : `simDailyDeals: CONTROL ${CONTROL} DID NOT FIRE as it must: red on [${mine.join(', ')}] and [${other.join(', ')}], wanted exactly [${want.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0
  ? `simDailyDeals: green. ${HOT.length} Hot Seat dates (${pl(HOT).length} Premier League) and ${DEADLINE.length} Deadline Day dates (${pl(DEADLINE).length} Premier League) deal what Release AS dealt, and no daily carries the real fixture key.`
  : `simDailyDeals: ${total} FAILURE(S): Hot Seat [${fails.hot.join(', ')}], Deadline Day [${fails.deadline.join(', ')}]`);
process.exit(total === 0 ? 0 : 1);
