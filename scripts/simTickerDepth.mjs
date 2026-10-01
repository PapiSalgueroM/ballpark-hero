/**
 * Round 711 harness: the rules that decide what the live ticker may say.
 *
 * Round 711 gave the strip a set of rules that hide and relabel REAL games:
 * a live game the feed stopped writing loses its LIVE and says "as of", a
 * not started game whose start has passed and that the feed dropped is not
 * shown at all, the newest write is shown as "Updated" and turns into a
 * Delayed notice past a margin, followed teams lead the wire, a filter cuts
 * it to one sport, and two localStorage values are parsed on every route.
 * None of that had a harness. This is it, one section per rule, each with a
 * negative control that plants a defect and must then go red.
 *
 * WHERE THE MARGINS COME FROM, measured, not felt. The poller is one pg_cron
 * job, scores-poll-every-20-min, so the cadence is 20 minutes: on
 * 2026-09-30 the today slate carried stamps at :00, :20 and :40 (six
 * distinct stamps in the two hour window read at 23:28Z, all rows of a run
 * within 2 seconds of each other). A healthy feed's newest stamp was 8.0
 * minutes old at that read and 11.7 minutes old at the triage read four
 * hours earlier, so on a healthy day the age of the newest write lives in
 * [0, 20 min plus a run's few seconds]. FEED_LATE_MS is 45 minutes: two
 * whole polls missed plus five minutes for a slow run, more than twice the
 * healthy ceiling and under three cadences, so a dead feed is called within
 * the hour. ROW_DROPPED_MS is 30 minutes: one missed poll (a row 20 minutes
 * behind the newest) is noise, a row 30 minutes behind has missed two. On
 * the healthy table 0 of 26 unfinished today rows sat more than 30 minutes
 * behind the newest (p90 lag 0.02 minutes), so the rule has the whole
 * margin as headroom. Section 6 pins the constants to that cadence.
 *
 * The other cron, day=1, writes tomorrow's rows hours apart (stamps seen at
 * 16:05Z and 22:05Z the same day), which is why lateness is judged on rows
 * whose start falls on today's New York date only, and why a board carrying
 * nothing but tomorrow's slate is never called Delayed (section 3).
 *
 * The functions are bundled with esbuild the way simTicker does it, and the
 * bundle controls plant their defect in the BUNDLED JavaScript, which esbuild
 * writes LF whatever the checkout, so no control here can go quiet on a CRLF
 * machine. Every source read for the two source sections normalises line
 * endings. Nothing here reads a comment: source checks strip them first.
 *
 * Negative controls, SIM_TICKER_DEPTH_CONTROL=
 *   nostale     rowFreshness never says stale         section 1 must go red
 *   nolate      feedIsLate never says late            section 2 must go red
 *   anyrow      every row counts as today's           section 3 must go red
 *   nofollow    a followed sport does not lead        section 4 must go red
 *   anykey      "constructor" passes as a sport       section 5 must go red
 *   tightlate   FEED_LATE_MS under two cadences       section 6 must go red
 *   phonestamp  the stamp stays on the phone strip    section 7 must go red
 *   noyesterday the poller forgets yesterday          section 8 must go red
 * Each refuses to run if the text it would change is not there.
 *
 * Run: node scripts/simTickerDepth.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_TICKER_DEPTH_CONTROL || '';
const CONTROLS = ['nostale', 'nolate', 'anyrow', 'nofollow', 'anykey', 'tightlate', 'phonestamp', 'noyesterday'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`SIM_TICKER_DEPTH_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const tag = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `tickerDepthEntry-${tag}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `tickerDepth-${tag}.bundle.mjs`);
const SRC = ROOT.replaceAll('\\', '/');

fs.writeFileSync(ENTRY, `
export { boardAt, rowFreshness, feedIsLate, feedUpdatedAt, todaysRows, nyDateOf, FEED_LATE_MS, ROW_DROPPED_MS } from '${SRC}/src/lib/liveScores.ts';
export { groupScores, filterScores, isFollowedRow } from '${SRC}/src/components/layout/TopTicker.tsx';
export { parseFollows, parseSportFilter, toggleFollow, teamKey, followableTeams, isPlaceholderTeam, MAX_FOLLOWS, FILTER_ALL, FILTER_MINE } from '${SRC}/src/lib/tickerPrefs.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --jsx=automatic --loader:.tsx=tsx`, { stdio: 'inherit' });

/* A bundle control edits the compiled JavaScript before it is imported, and
   refuses to run when the code it would change is not there. */
const refuse = (what) => { console.error(`control cannot run: ${what}`); process.exit(1); };
if (['nostale', 'nolate', 'anyrow', 'nofollow', 'anykey', 'tightlate'].includes(CONTROL)) {
  let js = fs.readFileSync(BUNDLE, 'utf8');
  const patch = (re, to, what) => {
    if (!re.test(js)) refuse(`${what} is not in the bundle`);
    const next = js.replace(re, to);
    if (next === js) refuse(`${what} replaced nothing`);
    js = next;
  };
  if (CONTROL === 'nostale') patch(/if \((\w+)\.live\) return "stale";/, 'if ($1.live) return "current";', 'the stale arm of rowFreshness');
  if (CONTROL === 'nolate') patch(/return updatedAt != null && now - updatedAt > FEED_LATE_MS;/, 'return false;', 'the late test in feedIsLate');
  if (CONTROL === 'anyrow') patch(/nyDateOf\(stamp\((\w+)\.start_at\)\) === today/, 'true', 'the New York date test in todaysRows');
  if (CONTROL === 'nofollow') patch(/if \(fa !== fb\) return fa - fb;/, '', 'the followed sport ordering in groupScores');
  if (CONTROL === 'anykey') patch(/Object\.prototype\.hasOwnProperty\.call\(Object\.prototype, v\) \? FILTER_ALL : v/, 'v', 'the prototype guard in parseSportFilter');
  if (CONTROL === 'tightlate') patch(/FEED_LATE_MS = 45 \* 60 \* 1e3;/, 'FEED_LATE_MS = 19 * 60 * 1e3;', 'the 45 minute FEED_LATE_MS literal');
  fs.writeFileSync(BUNDLE, js);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} planted in the bundle`);
}

/* The stub lives in THIS process: the bundled supabase client asks for
   localStorage at module scope (simTicker learned the same). */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const lib = await import(pathToFileURL(BUNDLE).href);
const {
  boardAt, rowFreshness, feedIsLate, feedUpdatedAt, todaysRows, nyDateOf, FEED_LATE_MS, ROW_DROPPED_MS,
  groupScores, filterScores, parseFollows, parseSportFilter, toggleFollow, teamKey, followableTeams, isPlaceholderTeam,
  MAX_FOLLOWS, FILTER_ALL, FILTER_MINE,
} = lib;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const eq = (got, want, what) => { if (got !== want) fail(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); };
const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MIN = 60 * 1000;
const CADENCE_MS = 20 * MIN;
/* 4 PM in New York on 2026-09-30: today is 09-30, tomorrow begins at 04:00Z */
const NOW = Date.parse('2026-09-30T20:00:00Z');
const iso = ms => new Date(ms).toISOString();
const row = (id, over = {}) => ({
  id, sport: 'mlb', league: 'MLB', home: `Home ${id}`, away: `Away ${id}`,
  home_score: 1, away_score: 0, status_short: 'LIVE', status_long: 'Top 3rd',
  start_at: iso(NOW - 60 * MIN), live: true, finished: false, updated_at: iso(NOW - 10 * MIN), ...over,
});

console.log('1) rowFreshness and boardAt: fresh live stays live, an abandoned live goes stale, a dropped kickoff goes, a final never stales');
{
  const rows = [
    row('live-fresh'),
    row('live-old', { updated_at: iso(NOW - 50 * MIN) }),
    /* 45 minutes old, exactly FEED_LATE_MS, so only the "behind the newest
       write" rule can catch it: 35 minutes behind a 10 minute old newest */
    row('live-behind', { updated_at: iso(NOW - 45 * MIN) }),
    row('fin-old', { finished: true, live: false, status_short: 'FT', start_at: iso(NOW - 6 * 3600e3), updated_at: iso(NOW - 5 * 3600e3) }),
    row('ns-passed-old', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW - 60 * MIN), updated_at: iso(NOW - 50 * MIN) }),
    row('ns-passed-fresh', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW - 5 * MIN) }),
    row('ns-future-old', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW + 3 * 3600e3), updated_at: iso(NOW - 4 * 3600e3) }),
    row('ns-nostamp', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW + 2 * 3600e3), updated_at: undefined }),
    row('live-nostamp', { updated_at: null }),
  ];
  const newest = feedUpdatedAt(rows);
  eq(newest, NOW - 10 * MIN, 'the newest write on the board');
  const want = {
    'live-fresh': 'current', 'live-old': 'stale', 'live-behind': 'stale', 'fin-old': 'current',
    'ns-passed-old': 'gone', 'ns-passed-fresh': 'current', 'ns-future-old': 'current', 'ns-nostamp': 'current', 'live-nostamp': 'stale',
  };
  for (const r of rows) eq(rowFreshness(r, newest, NOW), want[r.id], `rowFreshness(${r.id})`);
  const board = boardAt(rows, NOW);
  eq(board.rows.map(r => r.id).join(','), 'live-fresh,live-old,live-behind,fin-old,ns-passed-fresh,ns-future-old,ns-nostamp,live-nostamp', 'the rows boardAt keeps, in order');
  eq([...board.stale].sort().join(','), 'live-behind,live-nostamp,live-old', 'the live rows marked stale');
  eq(board.updatedAt, NOW - 10 * MIN, 'boardAt reports the newest write');
  eq(board.late, false, 'a board written 10 minutes ago is not late');
  /* the same board read 50 minutes later with no new write: everything
     unfinished is stale or gone, and the strip is told so */
  const later = boardAt(rows, NOW + 50 * MIN);
  eq(later.late, true, 'the same board 50 minutes on, with no new write, is late');
  eq([...later.stale].sort().join(','), 'live-behind,live-fresh,live-nostamp,live-old', 'every live row is stale once the feed itself is late');
  eq(later.rows.some(r => r.id === 'ns-passed-fresh'), false, 'a kickoff 55 minutes past with a 60 minute old stamp is gone');
  eq(later.rows.some(r => r.id === 'fin-old'), true, 'a final stays whatever the clock says');
  console.log(`   ${rows.length} rows: kept ${board.rows.length}, stale ${board.stale.size}, gone ${rows.length - board.rows.length}; 50 minutes on, late=${later.late}, stale ${later.stale.size}`);
}

console.log('2) feedIsLate at the margin: two polls missed is late, one is not, exactly on the line is not');
{
  eq(feedIsLate(NOW - FEED_LATE_MS - 1, NOW), true, 'one millisecond past FEED_LATE_MS');
  eq(feedIsLate(NOW - FEED_LATE_MS, NOW), false, 'exactly FEED_LATE_MS');
  eq(feedIsLate(NOW - CADENCE_MS, NOW), false, 'one cadence old (a poll just ran)');
  eq(feedIsLate(NOW - 2 * CADENCE_MS, NOW), false, 'two cadences old (one missed poll)');
  eq(feedIsLate(NOW - 3 * CADENCE_MS, NOW), true, 'three cadences old (two missed polls)');
  eq(feedIsLate(null, NOW), false, 'no stamp at all is not called late here');
  eq(feedIsLate(NOW + 5 * MIN, NOW), false, 'a stamp ahead of the clock is not late');
  console.log(`   FEED_LATE_MS ${FEED_LATE_MS / MIN} min against a ${CADENCE_MS / MIN} min cadence`);
}

console.log('3) lateness is judged on today\'s slate only; tomorrow\'s rows never raise the alarm, and the midnight crossover reads as it should');
{
  const tomorrow = (id, ageMin) => row(id, {
    live: false, home_score: null, away_score: null, status_short: 'NS',
    start_at: iso(NOW + 10 * 3600e3), updated_at: iso(NOW - ageMin * MIN),
  });
  eq(nyDateOf(NOW), '2026-09-30', 'the New York date of the fixed clock');
  eq(nyDateOf(NOW + 10 * 3600e3), '2026-10-01', 'ten hours on is tomorrow in New York');
  eq(nyDateOf(NaN), '', 'a non date has no New York date');
  /* only tomorrow's slate, written by the day=1 cron four hours ago */
  const onlyTomorrow = boardAt([tomorrow('t1', 240), tomorrow('t2', 240)], NOW);
  eq(todaysRows([tomorrow('t1', 240)], NOW).length, 0, 'a tomorrow row is not today\'s');
  eq(onlyTomorrow.late, false, 'a board of tomorrow\'s rows only is never late');
  eq(onlyTomorrow.updatedAt, NOW - 240 * MIN, 'its newest write is still shown as the Updated time');
  eq(onlyTomorrow.rows.length, 2, 'tomorrow\'s kickoffs stay on the wire');
  /* today's slate late, tomorrow's freshly written: today's clock decides */
  const mixedLate = boardAt([row('today-old', { updated_at: iso(NOW - 50 * MIN) }), tomorrow('t3', 5)], NOW);
  eq(mixedLate.late, true, 'a 50 minute old today slate is late even when tomorrow was written 5 minutes ago');
  eq(mixedLate.updatedAt, NOW - 50 * MIN, 'the Updated time is today\'s newest write, not tomorrow\'s');
  eq(mixedLate.stale.has('today-old'), true, 'the abandoned live game is stale');
  /* today's slate fresh, tomorrow's hours old: nothing is wrong */
  const mixedFresh = boardAt([row('today-fresh'), tomorrow('t4', 240)], NOW);
  eq(mixedFresh.late, false, 'a fresh today slate is not late because tomorrow\'s rows are old');
  eq(mixedFresh.rows.length, 2, 'both stay on the wire');
  /* 1 AM in New York: last night's West Coast game, last written 03:40Z,
     against today's fresh rows. Until the poller's yesterday pass writes
     its final it is honestly stale, and the feed is not late. */
  const oneAm = Date.parse('2026-10-01T05:00:00Z');
  const crossover = boardAt([
    row('cubs', { start_at: '2026-09-30T02:00:00Z', updated_at: '2026-09-30T03:40:02Z' }),
    row('today-early', { start_at: '2026-10-01T04:30:00Z', updated_at: iso(oneAm - 10 * MIN) }),
  ], oneAm);
  eq(crossover.late, false, 'a fresh today write means the feed is not late at 1 AM');
  eq(crossover.stale.has('cubs'), true, 'last night\'s unwritten live game says as of, not LIVE');
  eq(crossover.rows.length, 2, 'both are shown');
  console.log(`   tomorrow only: late=${onlyTomorrow.late}; today late + tomorrow fresh: late=${mixedLate.late}; crossover at 1 AM: late=${crossover.late}, stale=${[...crossover.stale].join(',')}`);
}

console.log('4) followed teams lead: their game leads its box, their sport leads the wire, and the filters cut honestly');
{
  const rows = [
    row('soc-live', { sport: 'soccer', home: 'Valencia', away: 'Real Betis', status_short: '2H' }),
    row('mlb-live', { home: 'New York Yankees', away: 'Houston Astros' }),
    row('nhl-live', { sport: 'nhl', home: 'Vancouver Canucks', away: 'Calgary Flames', status_short: 'P2' }),
    row('nhl-final', { sport: 'nhl', home: 'Edmonton Oilers', away: 'Seattle Kraken', live: false, finished: true, status_short: 'FT', start_at: iso(NOW - 4 * 3600e3) }),
    row('nhl-next', { sport: 'nhl', home: 'Toronto Maple Leafs', away: 'Boston Bruins', live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW + 2 * 3600e3) }),
  ];
  const none = groupScores(rows);
  eq(none.map(g => g.sport).join(','), 'soccer,mlb,nhl', 'with no follows the house order stands');
  eq(none[2].rows.map(r => r.id).join(','), 'nhl-live,nhl-next,nhl-final', 'inside a sport: live, kickoff, final');
  const followed = new Set([teamKey('nhl', 'Edmonton Oilers')]);
  const mine = groupScores(rows, followed);
  eq(mine.map(g => g.sport).join(','), 'nhl,soccer,mlb', 'the followed team\'s sport leads the wire');
  eq(mine[0].rows.map(r => r.id).join(','), 'nhl-final,nhl-live,nhl-next', 'the followed team\'s game leads its box even as a final');
  eq(filterScores(rows, FILTER_ALL, followed).length, 5, 'all is everything');
  eq(filterScores(rows, FILTER_MINE, followed).map(r => r.id).join(','), 'nhl-final', 'mine is the followed games only');
  eq(filterScores(rows, 'nhl', followed).length, 3, 'a sport filter is that sport');
  eq(filterScores(rows, 'nhl', new Set()).length, 3, 'a sport filter needs no follows');
  eq(filterScores(rows, FILTER_MINE, new Set()).length, 0, 'mine with nothing followed is empty, never everything');
  /* a hostile row with a number where a name should be, follows present:
     the follow check runs before the grouping's own guards */
  let hostile = 'did not throw';
  try {
    const out = filterScores([row('h1', { sport: 7, home: 7 }), row('h2', { home: null, away: undefined })], FILTER_MINE, followed);
    eq(out.length, 0, 'hostile rows are not followed');
    groupScores([row('h1', { sport: 7, home: 7 })], followed);
    /* a sport named like a prototype key gets a text tag and the home hub,
       never Object's constructor as its label */
    const ctor = groupScores([row('c1', { sport: 'constructor' })]);
    eq(typeof ctor[0]?.tag, 'string', 'a "constructor" sport has a text tag');
    eq(ctor[0]?.hub, '/', 'a "constructor" sport links home, not to a function');
  } catch (e) { hostile = `threw ${e.message}`; fail(`a hostile row with follows present ${hostile}`); }
  console.log(`   wire ${mine.map(g => g.sport).join(',')}; nhl box ${mine[0].rows.map(r => r.id).join(',')}; hostile rows ${hostile}`);
}

console.log('5) tickerPrefs on hostile input: what localStorage says is data, never a crash and never a prototype key');
{
  eq(parseFollows(null).length, 0, 'null is no follows');
  eq(parseFollows('').length, 0, 'empty is no follows');
  eq(parseFollows('not json').length, 0, 'garbage is no follows');
  eq(parseFollows('{"a":1}').length, 0, 'an object is no follows');
  eq(parseFollows('[1,2,null]').length, 0, 'numbers are no follows');
  eq(parseFollows(JSON.stringify(['mlb|Yankees', 'mlb|Yankees', 'x', 'MLB|Yankees', 'tennis|TBD', 'tennis|TBD / TBD', 'soccer|Real Madrid', 'a|b|c'])).join(','), 'mlb|Yankees,soccer|Real Madrid', 'duplicates, bad shapes, a one letter sport and placeholders are dropped');
  const many = JSON.stringify(Array.from({ length: 60 }, (_, i) => `mlb|Club ${i}`));
  eq(parseFollows(many).length, MAX_FOLLOWS, `a runaway list is capped at ${MAX_FOLLOWS}`);
  eq(parseSportFilter(null), FILTER_ALL, 'no saved filter is all');
  eq(parseSportFilter('mine'), FILTER_MINE, 'mine survives');
  eq(parseSportFilter(' nhl '), 'nhl', 'a sport key survives, trimmed');
  eq(parseSportFilter('constructor'), FILTER_ALL, 'constructor is not a sport');
  eq(parseSportFilter('__proto__'), FILTER_ALL, '__proto__ is not a sport');
  eq(parseSportFilter('NHL'), FILTER_ALL, 'upper case is not a key');
  eq(parseSportFilter('nhl;x'), FILTER_ALL, 'punctuation is not a key');
  eq(parseSportFilter('a'), FILTER_ALL, 'one letter is not a key');
  let keys = toggleFollow([], teamKey('mlb', 'New York Yankees'));
  eq(keys.join(','), 'mlb|New York Yankees', 'toggle follows');
  keys = toggleFollow(keys, 'mlb|New York Yankees');
  eq(keys.length, 0, 'toggle again unfollows');
  eq(toggleFollow([], 'bad key').length, 0, 'a key without a sport is refused');
  eq(toggleFollow([], teamKey('tennis', 'TBD')).length, 0, 'a placeholder is never followed');
  eq(toggleFollow([], teamKey('tennis', 'TBD / TBD')).length, 0, 'the doubles placeholder is never followed');
  const full = Array.from({ length: MAX_FOLLOWS }, (_, i) => `mlb|Club ${i}`);
  const over = toggleFollow(full, 'nhl|New');
  eq(over.length, MAX_FOLLOWS, 'past the cap the list stays capped');
  eq(over[0], 'mlb|Club 1', 'the oldest follow drops');
  eq(over[over.length - 1], 'nhl|New', 'the newest follow goes last');
  eq(teamKey(7, 7), '7|7', 'a number where a name should be keys as text');
  eq(teamKey(null, undefined), '|', 'nothing keys as nothing');
  eq(isPlaceholderTeam('TBD'), true, 'TBD is a placeholder');
  eq(isPlaceholderTeam('tbd / TBD'), true, 'TBD / TBD is a placeholder');
  eq(isPlaceholderTeam('TBA'), true, 'TBA is a placeholder');
  eq(isPlaceholderTeam(''), true, 'an empty name is a placeholder');
  eq(isPlaceholderTeam('Toronto Blue Jays'), false, 'a club is not');
  eq(followableTeams('tennis', 'TBD', 'TBD').length, 0, 'TBD @ TBD offers no star');
  eq(followableTeams('tennis', 'V. Kuzmova / A. Siskova', 'TBD / TBD').map(t => t.name).join(','), 'V. Kuzmova / A. Siskova', 'a real pair against a placeholder offers one line');
  eq(followableTeams('mlb', 'New York Yankees', 'New York Yankees').length, 1, 'one name twice is one line');
  eq(followableTeams(7, 7, 'Home').length, 0, 'a numeric sport keys nothing followable');
  eq(followableTeams('mlb', 'Houston Astros', 'New York Yankees').map(t => t.key).join(','), 'mlb|Houston Astros,mlb|New York Yankees', 'away then home');
  console.log(`   follows parse, cap at ${MAX_FOLLOWS}, filter rejects constructor and __proto__, placeholders never followed`);
}

console.log('6) the margins sit where the cadence says: two missed polls is late, one is not');
{
  const late = FEED_LATE_MS / CADENCE_MS;
  const dropped = ROW_DROPPED_MS / CADENCE_MS;
  /* strictly more than two cadences, so one missed poll plus a slow run is
     never Delayed; under three, so a dead feed is called within the hour */
  if (!(FEED_LATE_MS > 2 * CADENCE_MS)) fail(`FEED_LATE_MS is ${FEED_LATE_MS / MIN} min, not past two ${CADENCE_MS / MIN} min polls: one slow run would read Delayed`);
  if (!(FEED_LATE_MS < 3 * CADENCE_MS)) fail(`FEED_LATE_MS is ${FEED_LATE_MS / MIN} min, past three polls: a dead feed would pass for current for an hour`);
  if (!(ROW_DROPPED_MS > CADENCE_MS)) fail(`ROW_DROPPED_MS is ${ROW_DROPPED_MS / MIN} min, not past one poll: a row one poll behind would be dropped`);
  if (!(ROW_DROPPED_MS < FEED_LATE_MS)) fail('a row is called dropped only after the whole feed is called late, which is backwards');
  /* the healthy ceiling measured on 2026-09-30: the newest write is never
     older than a cadence plus a run, so the late bar must clear twice that */
  const healthyCeiling = CADENCE_MS + 2 * MIN;
  if (!(FEED_LATE_MS >= 2 * healthyCeiling)) fail(`FEED_LATE_MS ${FEED_LATE_MS / MIN} min is under twice the healthy ceiling of ${healthyCeiling / MIN} min`);
  console.log(`   FEED_LATE_MS ${late.toFixed(2)} cadences, ROW_DROPPED_MS ${dropped.toFixed(2)} cadences, healthy ceiling ${healthyCeiling / MIN} min`);
}

console.log('7) the strip\'s empty arm and the phone: unavailable is reachable when every row of today was dropped, and the stamp is off the phone strip');
{
  /* every row of today's slate not started, past its start, last written
     50 minutes ago: boardAt drops them all AND calls the feed late, because
     the newest of them is itself past FEED_LATE_MS. The strip's empty arm
     reads board.late and says unavailable rather than "no games". */
  const allGone = boardAt([
    row('g1', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW - 40 * MIN), updated_at: iso(NOW - 50 * MIN) }),
    row('g2', { live: false, home_score: null, away_score: null, status_short: 'NS', start_at: iso(NOW - 30 * MIN), updated_at: iso(NOW - 55 * MIN) }),
  ], NOW);
  eq(allGone.rows.length, 0, 'every dropped kickoff is gone from the board');
  eq(allGone.late, true, 'and the board says the feed is late, so the strip can say unavailable');
  eq(allGone.updatedAt, NOW - 50 * MIN, 'the newest write is still known');
  let src = stripComments(readSrc('src/components/layout/TopTicker.tsx'));
  if (CONTROL === 'phonestamp') {
    const anchor = 'shrink-0 h-full hidden md:inline-flex items-center px-2';
    if (!src.includes(anchor)) refuse('the hidden md:inline-flex stamp class is not in TopTicker');
    src = src.replace(anchor, 'shrink-0 h-full inline-flex items-center px-2');
    console.log('   NEGATIVE CONTROL ON: the stamp shown on the phone strip in memory');
  }
  const arm = /board\.rows\.length === 0\s*\?\s*\(status === 'failed' \|\| board\.late \? 'Live scores temporarily unavailable'/.test(src);
  if (!arm) fail('the empty board arm no longer reads board.late for the unavailable line');
  const stampTag = src.match(/<span[^>]*data-feed-stamp=\{[^>]*>/);
  if (!stampTag) fail('the feed stamp element is gone from TopTicker');
  else if (!/hidden md:inline-flex/.test(stampTag[0])) fail('the feed stamp is shown below md: on a 390px phone it leaves the wire narrower than one card');
  if (!/data-feed-stamp-phone=/.test(src)) fail('the phone has no stamp line in the filter menu, so the phone visitor never learns when the feed last wrote');
  if (!/const filterShort = /.test(src) || !/md:hidden">\{filterShort\}/.test(src)) fail('the filter button has no short name for the phone');
  console.log(`   all-gone board: rows ${allGone.rows.length}, late ${allGone.late}; empty arm reads board.late ${arm}; stamp hidden below md, phone menu line present`);
}

console.log('8) the poller finishes yesterday\'s games: the canonical run polls yesterday until noon in New York, off the ledger');
{
  let poller = stripComments(readSrc('supabase/functions/scores-poll/index.ts'));
  if (CONTROL === 'noyesterday') {
    const anchor = 'const by = await pollFeeds(FEEDS, yesterday);';
    if (!poller.includes(anchor)) refuse('the yesterday pass is not in the poller');
    poller = poller.replace(anchor, 'const by = {};');
    console.log('   NEGATIVE CONTROL ON: the yesterday pass removed from the poller in memory');
  }
  if (!/if \(canonical && nyHour\(\) < 12\)/.test(poller)) fail('the yesterday pass is not gated to the canonical run before noon in New York');
  if (!/pollFeeds\(FEEDS, yesterday\)/.test(poller)) fail('the poller never polls yesterday\'s date, so a game crossing midnight ET is never written again and sits live all morning');
  if (!/const yesterday = nyDate\(-1\);/.test(poller)) fail('yesterday is not New York\'s yesterday');
  const fnStart = poller.indexOf('async function pollFeeds(');
  const body = fnStart === -1 ? '' : poller.slice(fnStart);
  if (fnStart === -1) fail('pollFeeds is gone, so the yesterday pass has nothing to call');
  else if (/live_scores_runs/.test(body)) fail('pollFeeds writes the run ledger, so the morning rewrite of yesterday\'s finals would make a dead yesterday look alive to the watchdog');
  const wd = poller.indexOf('watchdogOut = await watchdog(nyDate(-1))');
  const yp = poller.indexOf('pollFeeds(FEEDS, yesterday)');
  if (wd !== -1 && yp !== -1 && yp < wd) fail('the yesterday pass runs before the watchdog, so the first run of the day judges a ledger it just wrote');
  console.log(`   canonical run polls nyDate(-1) before noon; pollFeeds writes no ledger row; watchdog runs first`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simTickerDepth control ${CONTROL}: green, the planted defect was caught (${failures} finding${failures === 1 ? '' : 's'})`); process.exit(0); }
  console.error(`simTickerDepth control ${CONTROL}: RED, the planted defect changed NOTHING`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simTickerDepth: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTickerDepth: green. The strip hides and relabels only what the feed itself has stopped standing behind.');
