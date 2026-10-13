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
 *   3. Release AZ, the lead's ruling Y3: no daily state carries a world seed or a ledger (worldSeed,
 *      worldRoster: Round 1250 gives every new career a seed, and a career with a seed writes a ledger on its
 *      first deal), the Hot Seat's career handed over (handoverState) included; and a SCRIPTED Deadline Day on
 *      each of the six dates: the first target that opens is bid his ask and offered the terms he wants (the
 *      engine's negotiation), the first sale is taken (acceptBid), the day is ended. Its grade, its share text,
 *      its ticker and the keys of its state are held against BASELINE.scripted, recorded from the source of
 *      b6eb78e7 (Release AX as published, the first parent of merge e) with --root as above; and the day's
 *      recorded actions are replayed through this tree (replayDeadlineDay) to the same grade, every action
 *      applied, never stopping at an action that no longer fits.
 *
 * Every date is dealt by a FRESH copy of the engine module, the way a page load deals it, with the clock
 * fixed, so a counter one date moved cannot leak into the next.
 *
 * CONTROLS, each must go red on its own dates and nowhere else (exit 1, last line says FIRED):
 *   DAILY_DEALS_CONTROL=bind          takes the Hot Seat's strip of the key back out
 *   DAILY_DEALS_CONTROL=binddeadline  takes Deadline Day's strip back out
 *   DAILY_DEALS_CONTROL=seed          takes the Hot Seat's strip of the world seed back out: every Hot Seat
 *                                     date goes red on "the state carries a world seed or a ledger"
 *   DAILY_DEALS_CONTROL=seeddeadline  takes Deadline Day's strip of the world seed back out: every Deadline
 *                                     Day date, plain and scripted, goes red the same way
 *   DAILY_DEALS_CONTROL=rulesall      Round 1331: every Hot Seat date plays the current match rules: every date
 *                                     before HOT_SEAT_RULES_FROM goes red, and no date from it on, nor any
 *                                     Deadline Day date
 *   DAILY_DEALS_CONTROL=rulesstale    Round 1331: HOT_SEAT_RULES_FROM moved to 2026-10-01, before the round's
 *                                     base commit: the cutover check goes red
 *
 * Round 1331 (the match rules: five changes in three stoppages where the league and season had them, and the
 * press asking about the next match). Manager Hot Seat plays them from HOT_SEAT_RULES_FROM on, so every date
 * before it must play the base rules (its state carries matchRules 'base') and deal exactly what it did, and
 * the career handed over carries no matchRules. The five Hot Seat dates from the cutover on (2026-10-27,
 * 2026-11-14, 2027-01-19, 2027-01-30, 2027-02-06) play the new rules by design, so their deals were recorded
 * again from the Round 1331 tree with --print (the commit that recorded them names the remote check).
 * HOT_SEAT_RULES_FROM must be a real date after BASE_COMMIT_DATE, the day the round's base commit was made.
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
if (CONTROL && !['bind', 'binddeadline', 'seed', 'seeddeadline', 'rulesall', 'rulesstale'].includes(CONTROL)) cannot(`unknown control ${CONTROL}`);
/* Round 1331: the day the round's base commit (dec9075b, the Release BC record) was made. */
const BASE_COMMIT_DATE = '2026-10-13';

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
    /* Round 1331: the five dates from HOT_SEAT_RULES_FROM (2026-10-24) on play the Round 1331 match rules by
       design (five changes in three stoppages for these Premier League clubs and their opponents, the press
       asking about the next match), so their deals were recorded again from the Round 1331 tree with --print
       (remote check r1331-s4, line dailyDeals-print, head 62cf206a). Release AS dealt c9af2ca7, d31a907e,
       e233082a, 7ef7837d and 2784bbcb. Every date before the cutover keeps its Release AS recording. */
    '2026-10-27': '0400c7b1a2d756911454',
    '2026-11-14': '67cb2096bdc45751340e',
    '2027-01-19': 'b33b5b04a41504ec5f53',
    '2027-01-30': '9b6451735725f9ce1ba8',
    '2027-02-06': '75a43fcbf0106a1f29e3',
  },
  deadline: {
    '2026-10-10': 'e57fbb3c1e90b2d46068',
    '2026-10-11': 'a0c9a61cde6e2fbaad54',
    '2026-10-12': '57bff3d44d9920c4cd6b',
    '2026-10-18': '58f28ed0ec217ebbad3e',
    '2026-11-01': '903c3cc05441b1d6e93a',
    '2026-11-09': '8bea270b4e6a58d33e87',
  },
  /* Release AZ: recorded from the source of b6eb78e7 (the first parent of merge e) by the runner, remote check az-y3a
     (node scripts/simDailyDeals.mjs --root <worktree of b6eb78e7> --print). Do not retake from this tree. */
  scripted: {
    '2026-10-10': {"digest":"32aae44ce6352f1d6b15","grade":"2d6cd0e428ddc1f0a056","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":5.1},{"t":"terms","i":0,"wage":10,"years":4,"bonus":1.8},{"t":"sell","i":0},{"t":"end"}]},
    '2026-10-11': {"digest":"54ddbdd862aa208bf481","grade":"5a88ebc205d4a60771fc","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":13.8},{"t":"terms","i":0,"wage":29,"years":4,"bonus":5.2},{"t":"sell","i":0},{"t":"end"}]},
    '2026-10-12': {"digest":"07b5bea1c0d000c7c5ed","grade":"9c1b770552cec662bc36","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":16.1},{"t":"terms","i":0,"wage":25,"years":4,"bonus":4.5},{"t":"sell","i":0},{"t":"end"}]},
    '2026-10-18': {"digest":"74ffb0b07592c332e0ee","grade":"6c594ca51aa93a70c34d","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":9.6},{"t":"terms","i":0,"wage":22,"years":4,"bonus":4},{"t":"sell","i":0},{"t":"end"}]},
    '2026-11-01': {"digest":"5ff2c5b9738492e6e3aa","grade":"933af5d62a8a638576eb","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":34.7},{"t":"terms","i":0,"wage":52,"years":4,"bonus":9.4},{"t":"sell","i":0},{"t":"end"}]},
    '2026-11-09': {"digest":"7dd6fe553473e40bc9dd","grade":"ba0641f62509cb11fe0c","actions":[{"t":"open","i":0},{"t":"bid","i":0,"amt":21.8},{"t":"terms","i":0,"wage":31,"years":4,"bonus":5.6},{"t":"sell","i":0},{"t":"end"}]},
  },
};

const STRIPS = {
  bind: { file: 'managerHotSeat.ts', line: '  delete s.realLeagueFixtures;' },
  binddeadline: { file: 'deadlineDay.ts', line: '    delete state0.realLeagueFixtures;' },
  seed: { file: 'managerHotSeat.ts', line: '  delete s.worldSeed;' },
  seeddeadline: { file: 'deadlineDay.ts', line: '    delete state0.worldSeed;' },
  rulesall: { file: 'managerHotSeat.ts', line: "  if (setup.daily) return setup.daily < HOT_SEAT_RULES_FROM ? 'base' : undefined;", to: '  if (setup.daily) return undefined;' },
  rulesstale: { file: 'managerHotSeat.ts', line: "export const HOT_SEAT_RULES_FROM = '", to: "export const HOT_SEAT_RULES_FROM = '2026-10-01'; const HOT_SEAT_RULES_WAS = '" },
};
const SEEDED = 'the state carries a world seed or a ledger';
const seeded = st => !!st && ('worldSeed' in st || 'worldRoster' in st);
const controlPlugin = {
  name: 'daily-deals-control',
  setup(b) {
    if (!CONTROL) return;
    const { file, line, to = '' } = STRIPS[CONTROL];
    b.onLoad({ filter: new RegExp(file.replace('.', '[.]') + '$') }, async args => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const count = source.split(line).length - 1;
      if (count !== 1) cannot(`control ${CONTROL}: its line is in ${file} ${count} times, it must be exactly once`);
      return { contents: source.replace(line, to), loader: 'ts' };
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
  /* Round 1331: which match rules the day plays. */
  const based = run.state.matchRules === 'base';
  const opened = [setup.club, setup.seed, run.takeover, run.target, hs.upcoming(run), run.state.table];
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  const played = [run.log.map(m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res]), run.verdict ? [run.verdict.kind, run.points] : null, run.verdict ? hs.shareText(run) : null];
  const line = `${setup.club}: ${run.takeover.position} of ${run.takeover.clubs} after ${run.takeover.played}, ${run.takeover.points} pts, target ${run.target}; ${run.log.map(m => `${m.opponent} ${m.myGoals}-${m.oppGoals}`).join(', ')}; ${run.verdict?.kind ?? 'no verdict'}`;
  const seed = seeded(run.state) || (run.verdict ? seeded(hs.handoverState(run)) : false);
  const carriedRules = run.verdict ? 'matchRules' in hs.handoverState(run) : false;
  return { club: setup.club, keyed: keyed || 'realLeagueFixtures' in run.state, seed, based, carriedRules, digest: sha([opened, played]), line };
}
function deadline(date) {
  const { dd } = fresh();
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.startDeadlineDay(setup);
  const grade = dd.gradeWindow(dd.endDay(run));
  return { club: setup.club, keyed: 'realLeagueFixtures' in run.state, seed: seeded(run.state), digest: sha([setup.club, setup.seed, run.needs, run.targets, run.sales, run.startBudget, run.ticker, grade]), line: `${setup.club}: ${run.needs.length} needs, ${run.targets.length} targets, ${run.sales.length} sales, budget ${run.startBudget}` };
}
/* Release AZ, section 3: one scripted Deadline Day with a signing and a sale, then its actions replayed. */
function scripted(date) {
  const { dd } = fresh();
  const setup = dd.dailyDeadlineDay(date);
  let run = dd.startDeadlineDay(setup);
  let signed = null;
  for (let i = 0; i < run.targets.length && !signed; i += 1) {
    const opened = dd.openTalks(run, i);
    if (opened === run) continue;
    run = opened;
    for (let k = 0; k < 4 && run.targets[i].status === 'talks'; k += 1) {
      const ask = run.targets[i].neg?.theirAsk;
      if (!(ask > 0) || ask > run.state.budget) break;
      const next = dd.placeBid(run, i, ask);
      if (next === run) break;
      run = next;
    }
    for (let k = 0; k < 3 && run.targets[i].status === 'terms'; k += 1) {
      const want = run.targets[i].neg.terms.want;
      const next = dd.offerPersonalTerms(run, i, { wage: want.wage, years: want.years, bonus: want.bonus });
      if (next === run) break;
      run = next;
    }
    if (run.targets[i].status === 'signed') signed = run.targets[i].mp.name;
  }
  let sold = null;
  for (let k = 0; k < run.sales.length && !sold; k += 1) {
    const next = dd.sellPlayer(run, k);
    if (next !== run) { run = next; sold = run.sales[k].name; }
  }
  const seedMid = seeded(run.state);
  run = dd.endDay(run);
  const recorded = BASELINE.scripted?.[date];
  const actions = PRINT || !recorded ? run.actions : recorded.actions;
  const replayed = fresh().dd.replayDeadlineDay(setup, actions);
  return { club: setup.club, signed, sold, seed: seedMid || seeded(run.state) || seeded(replayed.state),
    digest: sha([run.grade, dd.shareText(run), run.ticker, Object.keys(run.state).sort()]), actions: run.actions,
    grade: sha(run.grade), replayGrade: replayed.grade ? sha(replayed.grade) : null, replayApplied: replayed.actions.length, replayWanted: actions.length,
    line: `${setup.club}: signed ${signed ?? 'nobody'}, sold ${sold ?? 'nobody'}, grade ${run.grade?.letter ?? 'none'}, ${run.actions.length} actions` };
}

/* Round 1331: the Hot Seat's dated start, read off the tree's own source (absent on a tree before the round). */
const RULES_FROM = fresh().hs.HOT_SEAT_RULES_FROM;
const out = { hot: {}, deadline: {} };
const fails = { hot: [], deadline: [] };
const reasons = {};
for (const [kind, rows, deal] of [['hot', HOT, hotSeat], ['deadline', DEADLINE, deadline]]) {
  for (const [date, club] of rows) {
    const got = deal(date);
    if (club && got.club !== club) cannot(`${kind} ${date} deals ${got.club}, the window expects ${club}: the window no longer holds this Premier League day`);
    out[kind][date] = got.digest;
    console.log(`  ${kind.padEnd(8)} ${date} ${club ? 'PL ' : '   '}${got.digest} ${got.line}`);
    if (PRINT) continue;
    const why = [];
    if (got.keyed) why.push('the state carries the real fixture key');
    if (got.seed) why.push(SEEDED);
    if (kind === 'hot' && RULES_FROM !== undefined) {
      if (date < RULES_FROM && !got.based) why.push('the day does not play the base match rules');
      if (date >= RULES_FROM && got.based) why.push('the day plays the base match rules after the cutover');
      if (got.carriedRules) why.push('the career handed over carries matchRules');
    }
    if (!BASELINE[kind][date]) why.push('no recorded deal for this date');
    else if (BASELINE[kind][date] !== got.digest) why.push(`the deal moved: recorded ${BASELINE[kind][date]}, dealt ${got.digest}`);
    if (why.length) { fails[kind].push(date); reasons[`${kind} ${date}`] = why; console.log(`FAIL ${kind} ${date} (${got.club}): ${why.join('; ')}`); }
  }
}
/* Section 3 (Release AZ): the scripted Deadline Day on each date, and its replay. */
const scriptedOut = {};
for (const [date] of DEADLINE) {
  const got = scripted(date);
  scriptedOut[date] = { digest: got.digest, grade: got.grade, actions: got.actions };
  console.log(`  scripted ${date}    ${got.digest} ${got.line}; replayed ${got.replayApplied} of ${got.replayWanted} actions`);
  if (PRINT) continue;
  const why = [];
  const rec = BASELINE.scripted?.[date];
  if (!got.signed || !got.sold) why.push(`the script made no ${got.signed ? 'sale' : 'signing'} on this date (pick another target or sale)`);
  if (got.seed) why.push(SEEDED);
  if (!rec) why.push('no recorded scripted day for this date');
  else {
    if (rec.digest !== got.digest) why.push(`the scripted day moved: recorded ${rec.digest}, played ${got.digest}`);
    if (got.replayApplied !== got.replayWanted) why.push(`the replay stopped at an action that no longer fits (${got.replayApplied} of ${got.replayWanted} applied)`);
    else if (got.replayGrade !== rec.grade) why.push(`the replay graded otherwise: recorded ${rec.grade}, replayed ${got.replayGrade}`);
  }
  if (why.length) { fails.deadline.push(`scripted ${date}`); reasons[`scripted ${date}`] = why; console.log(`FAIL scripted ${date} (${got.club}): ${why.join('; ')}`); }
}
if (PRINT) {
  console.log(JSON.stringify(out));
  console.log(JSON.stringify({ scripted: scriptedOut }));
  if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'daily-deals.json'), JSON.stringify({ ...out, scripted: scriptedOut }, null, 2));
  /* --verify-scripted: is BASELINE.scripted really the scripted days of the tree at --root (b6eb78e7)? */
  if (process.argv.includes('--verify-scripted')) {
    const same = JSON.stringify(scriptedOut) === JSON.stringify(BASELINE.scripted);
    console.log(same ? `simDailyDeals: the recorded scripted days ARE the days of the source at ${ROOT}` : `simDailyDeals: the recorded scripted days are NOT the days of the source at ${ROOT}`);
    process.exit(same ? 0 : 1);
  }
  /* --verify: is the recorded BASELINE really the deals of the tree at --root? This is how the recording is
     proven to be Release AS's own, on a worktree of 54e3820a. */
  if (!process.argv.includes('--verify')) process.exit(0);
  const same = JSON.stringify(out) === JSON.stringify({ hot: BASELINE.hot, deadline: BASELINE.deadline });
  console.log(same
    ? `simDailyDeals: the recorded deals ARE the deals of the source at ${ROOT} (${HOT.length} Hot Seat dates, ${DEADLINE.length} Deadline Day dates)`
    : `simDailyDeals: the recorded deals are NOT the deals of the source at ${ROOT}`);
  process.exit(same ? 0 : 1);
}

/* Round 1331: the cutover is a real date after the round's base commit. */
const CUTOVER_RED = 'HOT_SEAT_RULES_FROM is not a real date after the round\'s base commit';
if (!PRINT && !(typeof RULES_FROM === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(RULES_FROM) && !Number.isNaN(Date.parse(RULES_FROM)) && RULES_FROM > BASE_COMMIT_DATE)) {
  fails.hot.push('cutover');
  reasons['hot cutover'] = [CUTOVER_RED];
  console.log(`FAIL hot cutover: ${CUTOVER_RED} (${RULES_FROM}, base ${BASE_COMMIT_DATE})`);
}
const pl = rows => rows.filter(r => r[1]).map(r => r[0]);
const total = fails.hot.length + fails.deadline.length;
if (CONTROL === 'rulesall' || CONTROL === 'rulesstale') {
  /* Round 1331: rulesall turns every date before the cutover red and nothing else; rulesstale turns the cutover check red. */
  const before = HOT.map(r => r[0]).filter(d => RULES_FROM !== undefined && d < RULES_FROM);
  const fired = CONTROL === 'rulesall'
    ? before.length > 0 && JSON.stringify(fails.hot) === JSON.stringify(before) && fails.deadline.length === 0
    : fails.hot.includes('cutover');
  console.log(fired
    ? `simDailyDeals: CONTROL ${CONTROL} FIRED: red on [${fails.hot.join(', ')}] and nowhere else`
    : `simDailyDeals: CONTROL ${CONTROL} DID NOT FIRE as it must: Hot Seat red on [${fails.hot.join(', ')}], Deadline Day on [${fails.deadline.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL === 'seed' || CONTROL === 'seeddeadline') {
  /* Red on its own sentence: every date of its own game (the scripted days too, for Deadline Day) carries the
     seed, and no date of the other game is red at all. */
  const hot = CONTROL === 'seed';
  const want = hot ? HOT.map(r => `hot ${r[0]}`) : [...DEADLINE.map(r => `deadline ${r[0]}`), ...DEADLINE.map(r => `scripted ${r[0]}`)];
  const mine = want.filter(k => reasons[k]?.includes(SEEDED));
  const other = hot ? fails.deadline : fails.hot;
  const fired = mine.length === want.length && other.length === 0;
  console.log(fired
    ? `simDailyDeals: CONTROL ${CONTROL} FIRED: all ${want.length} of its dates went red on "${SEEDED}" and no date of the other game moved`
    : `simDailyDeals: CONTROL ${CONTROL} DID NOT FIRE as it must: ${mine.length} of ${want.length} of its dates carried the seed, the other game red on [${other.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
if (CONTROL) {
  /* Release AZ: the scripted days of section 3 carry the fixture key on the same Premier League dates, so for
     binddeadline they may go red there too and nowhere else; the plain dates are judged as before. */
  const plain = list => list.filter(d => !d.startsWith('scripted '));
  const scriptedRed = fails.deadline.filter(d => d.startsWith('scripted ')).map(d => d.slice(9));
  const [mine, other, want] = CONTROL === 'bind' ? [fails.hot, fails.deadline, pl(HOT)] : [plain(fails.deadline), fails.hot, pl(DEADLINE)];
  const fired = JSON.stringify(mine) === JSON.stringify(want) && other.length === 0 && scriptedRed.every(d => want.includes(d));
  console.log(fired
    ? `simDailyDeals: CONTROL ${CONTROL} FIRED: its ${want.length} Premier League dates went red (${want.join(', ')}) and no other date moved`
    : `simDailyDeals: CONTROL ${CONTROL} DID NOT FIRE as it must: red on [${mine.join(', ')}] and [${other.join(', ')}], wanted exactly [${want.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0
  ? `simDailyDeals: green. ${HOT.length} Hot Seat dates (${pl(HOT).length} Premier League) and ${DEADLINE.length} Deadline Day dates (${pl(DEADLINE).length} Premier League) deal what Release AS dealt, no daily carries the real fixture key, a world seed or a ledger, and the ${DEADLINE.length} scripted Deadline Days (a signing and a sale each) play and replay as on b6eb78e7.`
  : `simDailyDeals: ${total} FAILURE(S): Hot Seat [${fails.hot.join(', ')}], Deadline Day [${fails.deadline.join(', ')}]`);
process.exit(total === 0 ? 0 : 1);
