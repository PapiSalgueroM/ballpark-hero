/* Round 1540: the NBA Front Office's earned draft, on the real board (simNbaDraftBoard).
 *
 * It bundles the real NbaFrontOfficeBoard with esbuild (the way simNbaDraftCapital does), mounts it in jsdom with a
 * counted Lehmer Math.random and a fixed clock, and presses its buttons. Saves are built by construction
 * (initNbaLeague, records set, runNbaPlayoffs, the champion pushed: critic 1540 advice 18), never by playing seasons.
 *
 * SECTIONS
 *   1. THE OLD PATHS, recorded from BASE before one line of the board changed (brief 1540 decision 10 (c)). Three
 *      saves that must keep today's draft whatever this round binds: (1) desk off, from the recap; (2) desk on with a
 *      draft already open and no night on the desk; (4) a desk on recap save from before Round 431 (no postseason),
 *      reloaded. Each is played through the real board to the hub; the save (every engine id renamed in the order it
 *      first appears, since ids carry a process epoch) and the count of Math.random calls must equal
 *      scripts/data/nbaDraftBoardFixture.json, recorded with SIM_NBA_DRAFT_BOARD_RECORD=<base sha> from that commit's
 *      own src. Every (1) and (2) save is a closed season (round 20, this season's champion, a real postseason) on
 *      which a desk WOULD open a night (critic correction 6): the harness checks that before it plays, and exits 2
 *      otherwise, so a control that should turn (1) or (2) red can.
 *   2. THE BIND. Desk on recap saves (his club the weakest, a middle club, the champion, a traded first, a bought first,
 *      no pick) pressed through the board (Go to the draft, Continue, the first man of his board, which is his scout's
 *      best, to the hub) AND replayed through the libraries alone on an identical counted stream in a process of its
 *      own (critic advice 18): the save after the open and after every press (league, desk, class, picks left, ids
 *      renamed) equal the library's state, the league and desk after the summer equal nbaDeskOffseason's, and the
 *      board draws exactly as many numbers as the libraries.
 *   3. RELOADS. Section 2's nights with the board unmounted and mounted again from the save after every press: the
 *      end save equals section 2's, no reload draws a number, and a reload at a lottery card not yet continued draws
 *      it on its last frame.
 *   4. THE WAY OUT. No pick, a last slot at pick 60, his staff from his first slot: each ends on round 1, the hub,
 *      the next season.
 *   5. ROLLBACK. A night saved by this build on the clock, and a GM with no pick at the card, mounted on the BASE
 *      board (SIM_NBA_DRAFT_BOARD_BASE, 7a8750ba by default, laid out by git archive) finishes the old way.
 *   6. FENCES. The shared screen and its hook import only their allowed list and name no sport in code (comments
 *      stripped); the board names no lift module (simGmDraftOrder's LIFT names, anywhere in its code: critic F1);
 *      every board anchor of simNbaDraftCapital's controls, READ from that file, is exactly once in the board's
 *      executable source, and so are simGmReload's restore line and simDraftNight's norivals anchor.
 *
 * MEASURED 2026-10-22 on GitHub runners (every check is an equality, so there is no band to set):
 *   the fixture: 90 plays recorded from 7a8750ba's own src (r1540-s4), equal on that commit's board (quick and full)
 *   and still equal after the bind (r1540-s5a, r1540-s5b5 full: 30 of 30 in each of the three cases)
 *   full fleet (r1540-s5b5, 760 s): section 2 180 nights, 840 saves compared, 300 picks by his hand, 147 nights with
 *   picks before his first, 172,426 draws; section 3 660 reloads, 180 at a card not yet continued; section 4 90
 *   nights; section 5 60 mid night saves finished on the base board. Quick (r1540-s5b4): 36 nights, 168 saves.
 *   Controls on the quick walk (r1540-s5b5, redraw on r1540-p6), each red only in its own sections, failures:
 *   extradraw 12, deskless 12, blockedopen 12, secondchoice 60, classtwice 108, unseen 36, redraw 168, nofinish 90
 *   (sections 2, 3 and 4), zerobatches 24 (sections 3 and 5), bigclass 12, screensport 2, boardlift 1.
 *
 * RUNS. Seeds 1 to 6 by default, 1 to 30 with SIM_NBA_DRAFT_BOARD_FLEET=full. Green is the closing line
 * "simNbaDraftBoard: green." and exit 0. Exit 1 red (or a control that fired), 2 could not run, 3 a control that did
 * not fire.
 *
 * CONTROLS (SIM_NBA_DRAFT_BOARD_CONTROL; `all` runs each alone and is green only if every one fired in exactly its
 * own section). Each asserts its anchor is present exactly once first and edits an in memory copy only.
 *   extradraw    one extra Math.random call before the old openDraft's class draw: section 1, cases (1) and (4) red
 *   deskless     the earned night opens on a fresh desk when the save has none: section 1, case (1) red (exit 3
 *                before the board binds the night: there is nothing to break)
 *   blockedopen  a valid night planted on (2)'s desk: section 1, case (2) red (exit 3 before the bind)
 *   secondchoice the board hands the libraries the second man of his board: section 2 red
 *   classtwice   the class drawn twice at the open, the second kept: section 2 red
 *   unseen       the card is handed the night's own `seen` only (critic correction 14's replay): section 3 red
 *   redraw       the load path opens the night again and draws a new class: section 3 red
 *   nofinish     a press that ends the draft skips the summer: sections 2, 3 and 4 red (the three presses share
 *                one handler, so every night stops short, not only the no pick one)
 *   zerobatches  the open saves no rival batches left (advice 17): the no pick GM's save is refused on reload and
 *                by the base board, sections 3 and 5 red
 *   bigclass     the mid night saves' class grown past 70: the base board refuses them, section 5 red
 *   screensport  an NBA import in a copy of the screen: section 6 red
 *   boardlift    a lift import in a copy of the board: section 6 red
 */
import './lib/offlineTransport.cjs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const BOARD = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const SCREEN = 'src/components/front-office-shared/GmEarnedDraftScreen.tsx';
const HOOK = 'src/components/front-office-shared/useGmEarnedDraft.ts';
const FIXTURE = 'scripts/data/nbaDraftBoardFixture.json';
const CASES = ['deskOffRecap', 'deskOnOpen', 'preRecap'];
const CASE_WORDS = { deskOffRecap: '(1) desk off from the recap', deskOnOpen: '(2) desk on, a draft open, no night', preRecap: '(4) desk on, recap with no postseason, reloaded' };

if (process.argv.includes('--child')) {
  await child();
  process.exit(0);
}

/* ================================================================== */
/* The parent: bundle, play through the child, judge.                  */
/* ================================================================== */
const CONTROL = process.env.SIM_NBA_DRAFT_BOARD_CONTROL || '';
const FLEET = process.env.SIM_NBA_DRAFT_BOARD_FLEET || 'quick';
const RECORD = process.env.SIM_NBA_DRAFT_BOARD_RECORD || '';
const BASE = process.env.SIM_NBA_DRAFT_BOARD_BASE || '7a8750ba';
const SEEDS = RECORD || FLEET === 'full' ? 30 : 6;
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const once = (text, anchor) => text.split(anchor).length - 1;
function cannotRun(msg) { console.error(`simNbaDraftBoard: could not run: ${msg}`); process.exit(2); }
/** The first path at which two plain values differ, for the debug print (ids are not renamed here). */
function firstDiff(a, b, at) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return `${at || '(top)'}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
  if (a && typeof a === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
      return firstDiff(a[k], b[k], `${at}.${k}`);
    }
    return `${at}: equal`;
  }
  return `${at}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
}

const OLD_CLASS_DRAW = 'const cls = nbaDraftClass(Math.random, Math.max(24, capital + Math.min(10, rivalCapital)), leagueNames(lg));';
const DESK_GUARD = '    if (!desk) return false;\n    const opened = openNbaDraftNight(desk, lg, patch.postseason?.series ?? series, team);';
const CONTROLS = {
  extradraw: { expect: [1], cases: ['deskOffRecap', 'preRecap'] },
  deskless: { expect: [1], cases: ['deskOffRecap'] },
  blockedopen: { expect: [1], cases: ['deskOnOpen'] },
  secondchoice: { expect: [2], swap: ['choices={board.map(pr => (', 'choices={board.slice(1).map(pr => ('] },
  classtwice: { expect: [2], swap: ['    const cls = nbaEarnedDraftClass(Math.random, opened.night.slots.length, leagueNames(lg));',
    '    nbaEarnedDraftClass(Math.random, opened.night.slots.length, leagueNames(lg));\n    const cls = nbaEarnedDraftClass(Math.random, opened.night.slots.length, leagueNames(lg));'] },
  unseen: { expect: [3], swap: ['seen: earnedUi.seen(earnedNight),', 'seen: earnedNight.seen,'] },
  /* Anchored on the load path's desk line, not on the restore lines simGmReload holds (a control that edits a fenced
     anchor turns section 6 red as well: r1540-s5b5). */
  redraw: { expect: [3], swap: ['      setGm(s.gm === undefined ? null : readGmDesk(s.gm));\n',
    "      setGm(s.gm === undefined ? null : readGmDesk(s.gm));\n      if (s.phase === 'draft' && s.gm && nbaDraftNightOf(readGmDesk(s.gm), s.league)) openEarnedDraft(s.league, s.myTeam, s);\n"] },
  nofinish: { expect: [2, 3, 4], swap: ['    if (press.done && night) {', '    if (press.done && night && false) {'] },
  zerobatches: { expect: [3, 5], swap: ["persist({ ...patch, phase: 'draft', draftClass: cls, picksLeft: slots, draftAiBatchesLeft: 2 }, lg, team);",
    "persist({ ...patch, phase: 'draft', draftClass: cls, picksLeft: slots, draftAiBatchesLeft: 0 }, lg, team);"] },
  bigclass: { expect: [5] },
  screensport: { expect: [6] },
  boardlift: { expect: [6] },
};
if (!['quick', 'full'].includes(FLEET)) cannotRun(`SIM_NBA_DRAFT_BOARD_FLEET=${FLEET} is not quick or full`);
if (CONTROL && CONTROL !== 'all' && !CONTROLS[CONTROL]) cannotRun(`no control named ${CONTROL}`);
if (RECORD && CONTROL) cannotRun('a recording runs no control');

if (CONTROL === 'all') {
  const rows = [];
  for (const name of Object.keys(CONTROLS)) {
    const t0 = Date.now();
    const run = spawnSync(process.execPath, [SELF], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SIM_NBA_DRAFT_BOARD_CONTROL: name } });
    const last = `${run.stdout || ''}\n${run.stderr || ''}`.trim().split('\n').pop();
    const fired = run.status === 1 && /: FIRED,/.test(last);
    rows.push({ name, fired });
    console.log(`  ${name}: exit ${run.status}, ${Math.round((Date.now() - t0) / 1000)} s | ${last}`);
  }
  const bad = rows.filter(r => !r.fired);
  console.log(bad.length ? `simNbaDraftBoard controls: ${bad.length} of ${rows.length} did not fire as they must (${bad.map(r => r.name).join(', ')}).`
    : `simNbaDraftBoard controls: all ${rows.length} fired, each in exactly its own section.`);
  process.exit(bad.length ? 1 : 0);
}

const failures = new Map();
const opened = [];
function open(n, title) { opened.push(n); failures.set(n, []); console.log(`\n${n}. ${title}`); }
function fail(n, msg) { failures.get(n).push(msg); if (failures.get(n).length <= 12) console.log(`   FAIL: ${msg}`); }

/* The board as this run plays it: the tree's own, or BASE's own src for a recording, with a control's edit. */
fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
const scratch = [];
process.on('exit', () => { for (const d of scratch) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* left for the lead */ } } });
function baseSrc(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) cannotRun(`${sha} is not a commit sha`);
  const dir = fs.mkdtempSync(path.join(ROOT, '.sim-control', 'nba-draft-board-base-'));
  scratch.push(dir);
  const r = spawnSync('sh', ['-c', `git archive --format=tar ${sha} src | tar -x -C "${dir.replaceAll('\\', '/')}"`], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(path.join(dir, 'src', BOARD.slice(4)))) cannotRun(`could not lay out ${sha}'s src: ${(r.stderr || '').trim()}`);
  return path.join(dir, 'src');
}
const SRC = RECORD ? baseSrc(RECORD) : path.join(ROOT, 'src');
let board = fs.readFileSync(path.join(SRC, BOARD.slice(4)), 'utf8').replaceAll('\r\n', '\n');
if (CONTROL === 'extradraw') {
  if (once(board, OLD_CLASS_DRAW) !== 1) cannotRun('control extradraw: the old class draw is not in the board exactly once');
  board = board.replace(OLD_CLASS_DRAW, `Math.random(); ${OLD_CLASS_DRAW}`);
  console.log('   NEGATIVE CONTROL extradraw: one extra Math.random call before the old draft\'s class draw; section 1 must go red on (1) and (4)');
}
if (CONTROL === 'deskless') {
  if (once(board, DESK_GUARD) !== 1) { console.log('simNbaDraftBoard control deskless: CANNOT FIRE, the board has no earned bind to break (its desk guard is not there once).'); process.exit(3); }
  board = board.replace(DESK_GUARD, '    const opened = openNbaDraftNight(desk ?? openNbaDesk(lg, team), lg, patch.postseason?.series ?? series, team);');
  console.log('   NEGATIVE CONTROL deskless: the earned night opens on a fresh desk when the save has none; section 1 must go red on (1)');
}
if (CONTROLS[CONTROL]?.swap) {
  const [from, to] = CONTROLS[CONTROL].swap;
  if (once(board, from) !== 1) { console.log(`simNbaDraftBoard control ${CONTROL}: CANNOT FIRE, its anchor is in the board ${once(board, from)} times, not once.`); process.exit(3); }
  board = board.replace(from, to);
  console.log(`   NEGATIVE CONTROL ${CONTROL}: the board's copy is edited; section(s) ${CONTROLS[CONTROL].expect.join(', ')} must go red`);
}
if (CONTROL === 'bigclass') console.log('   NEGATIVE CONTROL bigclass: the mid night saves\' class grown past 70 before the base board loads them; section 5 must go red');
if (CONTROL === 'blockedopen') console.log('   NEGATIVE CONTROL blockedopen: a valid night is planted on (2)\'s desk; section 1 must go red on (2)');

async function bundle(srcRoot, boardText, tag) {
  const { build } = await import('esbuild');
  const owned = fs.mkdtempSync(path.join(ROOT, '.sim-control', `nba-draft-board-${tag}-`));
  scratch.push(owned);
  const inert = path.join(owned, 'inert.tsx');
  fs.writeFileSync(inert, 'export const useGameCompletion=()=>undefined; export const recordActivity=()=>undefined; export default()=>null;');
  fs.writeFileSync(path.join(owned, 'entry.ts'), [
    "export { default as Board } from '@/components/nba-front-office/NbaFrontOfficeBoard';",
    "export { default as Boundary } from '@/components/RouteErrorBoundary';",
    "export * from '@/lib/nbaFrontOffice';",
    "export { openNbaDesk, syncNbaPicks, nbaPicksOf, nbaStaffOf, nbaScoutRead, nbaDeskOffseason } from '@/lib/nbaGmDesk';",
    "export { openNbaDraftNight, nbaDraftNightOf, NBA_DRAFT_BLOCK, nbaDraftContinue, nbaDraftPick, nbaDraftByStaff, slotsLeftFor } from '@/lib/nbaEarnedDraft';",
    "export { movePicks, pickKey } from '@/lib/gmEarnedDraft';",
    "export { gmStaffLevel } from '@/lib/gmStaff';",
    "export { withGmBlock } from '@/lib/gmDesk';",
    "export { leagueNames } from '@/lib/foNames';",
    "export { makeIdMinter } from '@/lib/entityIds';",
  ].join('\n'));
  const boardPath = path.resolve(srcRoot, BOARD.slice(4));
  const product = path.join(owned, 'product.mjs');
  const built = await build({
    entryPoints: [path.join(owned, 'entry.ts')], outfile: product, bundle: true, platform: 'node', format: 'esm', packages: 'external',
    jsx: 'automatic', logLevel: 'error', metafile: true,
    alias: { '@/hooks/useGameCompletion': inert, '@/lib/completions': inert, '@/components/game/ShareButtons': inert, '@': srcRoot },
    plugins: [{ name: 'board-copy', setup(b) {
      b.onLoad({ filter: /NbaFrontOfficeBoard\.tsx$/ }, args => (path.resolve(args.path) === boardPath ? { contents: boardText, loader: 'tsx', resolveDir: path.dirname(args.path) } : undefined));
    } }],
  });
  if (Object.keys(built.metafile.inputs).some(f => /integrations[\\/]supabase/.test(f))) cannotRun('the bundle reaches the Supabase client');
  return { owned, product };
}

/** Plays each job in a fresh child process on a bundle, so every play starts from the same id counter and the same
    id epoch (the board breaks ties by id, so a counter carried over from the play before would move a pick). */
function play(b, jobs) {
  const t0 = Date.now();
  const rows = [];
  for (const job of jobs) {
    const out = path.join(b.owned, `out-${job.kind}-${job.seed}-${rows.length}.json`);
    const r = spawnSync(process.execPath, [SELF, '--child'], {
      cwd: ROOT, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: 'test', SIM_NBA_DRAFT_BOARD_PRODUCT: b.product, SIM_NBA_DRAFT_BOARD_JOB: JSON.stringify(job), SIM_NBA_DRAFT_BOARD_OUT: out },
    });
    const log = `${r.stdout || ''}\n${r.stderr || ''}`;
    if (r.error || r.signal || r.status !== 0 || !fs.existsSync(out)) cannotRun(`${job.kind} seed ${job.seed}: the board did not play (${r.error?.message ?? r.signal ?? `exit ${r.status}`}): ${log.trim().split('\n').slice(-8).join(' | ')}`);
    if (/SIM_OFFLINE_BLOCK|Maximum update depth|not wrapped in act/.test(log)) cannotRun(`${job.kind} seed ${job.seed}: the board's run logged a fault: ${log.trim().split('\n').slice(-4).join(' | ')}`);
    rows.push(JSON.parse(fs.readFileSync(out, 'utf8')));
  }
  console.log(`   ${rows.length} plays through the real board, each in its own process, in ${Math.round((Date.now() - t0) / 1000)} s`);
  return rows;
}

const redCases = new Set();
{
  const head = await bundle(SRC, board, RECORD ? 'record' : 'head');

  /* ---------------------------------------------------------------- */
  open(1, 'The old paths: three saves that keep today\'s draft, played to the hub, against the fixture recorded from BASE');
  const jobs = CASES.flatMap(c => Array.from({ length: SEEDS }, (_, i) => ({ kind: c, seed: i + 1, plant: CONTROL === 'blockedopen' && c === 'deskOnOpen' })));
  const rows = play(head, jobs);
  if (rows.length !== jobs.length) cannotRun(`${rows.length} rows for ${jobs.length} plays`);
  for (const r of rows) if (r.pre !== true) cannotRun(`${CASE_WORDS[r.kind]}, seed ${r.seed}: ${r.pre} (critic correction 6: the save must be one a night could open on)`);
  for (const r of rows) {
    if (r.error) fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: ${r.error}`);
    else if (r.phase !== 'hub' || r.seasonGain !== 1) fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: ended on ${r.phase}, season +${r.seasonGain}, not the hub of the next season`);
  }
  if (RECORD) {
    const cases = Object.fromEntries(CASES.map(c => [c, Object.fromEntries(rows.filter(r => r.kind === c).map(r => [r.seed, { hash: r.hash, calls: r.calls, picks: r.picks }]))]));
    if (failures.get(1).length) cannotRun(`${failures.get(1).length} plays did not reach the hub at ${RECORD}; nothing recorded`);
    fs.writeFileSync(path.join(ROOT, FIXTURE), `${JSON.stringify({ base: RECORD, seeds: SEEDS, note: 'Round 1540 decision 10 (c): the old paths played through the base board. Never record again on a builder\'s own say.', cases }, null, 1)}\n`);
    console.log(`   recorded ${rows.length} plays from ${RECORD} into ${FIXTURE}`);
    console.log('simNbaDraftBoard: recorded.');
    process.exit(0);
  }
  if (!fs.existsSync(path.join(ROOT, FIXTURE))) cannotRun(`${FIXTURE} is missing: record it from BASE first`);
  const fx = JSON.parse(read(FIXTURE));
  for (const r of rows) {
    const want = fx.cases?.[r.kind]?.[r.seed];
    if (!want) cannotRun(`${FIXTURE} has no row for ${r.kind} seed ${r.seed}`);
    if (r.hash !== want.hash || r.calls !== want.calls) {
      redCases.add(r.kind);
      fail(1, `${CASE_WORDS[r.kind]}, seed ${r.seed}: the save or the draws moved from ${fx.base}'s (Math.random calls ${r.calls} vs ${want.calls}${r.hash === want.hash ? ', save equal' : ', save differs'})`);
    }
  }
  for (const c of CASES) {
    const mine = rows.filter(r => r.kind === c);
    const calls = mine.map(r => r.calls);
    console.log(`   ${CASE_WORDS[c]}: ${mine.length} plays to the hub, ${mine.reduce((a, r) => a + r.picks, 0)} picks made on his board, ${Math.min(...calls)} to ${Math.max(...calls)} draws a play; ${mine.filter(r => !redCases.has(c) || (fx.cases[c][r.seed].hash === r.hash && fx.cases[c][r.seed].calls === r.calls)).length} equal to ${fx.base}'s`);
  }

  /* ---------------------------------------------------------------- */
  const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1);
  const keyOf = r => `${r.kind}:${r.seed}`;
  const tagOf = r => `${r.kind}, seed ${r.seed}`;
  const fleet = (kinds, mode, extra = {}) => kinds.flatMap(kind => seeds.map(seed => ({ kind, seed, mode, ...extra })));
  const preOk = rows => { for (const r of rows) if (r.pre !== true) cannotRun(`${tagOf(r)}: ${r.pre}`); return rows; };
  const EARNED_FLEET = ['weakest', 'middle', 'champion', 'traded', 'bought', 'nopick'];

  open(2, 'The bind: the board plays each night as the libraries alone do, save for save and draw for draw, to the summer');
  const boardRows = preOk(play(head, fleet(EARNED_FLEET, 'board')));
  const replayOf = new Map(preOk(play(head, fleet(EARNED_FLEET, 'replay'))).map(r => [keyOf(r), r]));
  let compared = 0;
  for (const b of boardRows) {
    const r = replayOf.get(keyOf(b));
    const before = failures.get(2).length;
    if (b.error) fail(2, `${tagOf(b)}: the board: ${b.error}`);
    else if (r.error) fail(2, `${tagOf(b)}: the libraries: ${r.error}`);
    else {
      const presses = b.writes.slice(0, -1);
      const at = presses.findIndex((h, i) => h !== r.states[i]);
      if (presses.length !== r.states.length) fail(2, `${tagOf(b)}: the board saved ${presses.length} times before the summer, the libraries reached ${r.states.length} states`);
      else if (at >= 0) {
        fail(2, `${tagOf(b)}: the save after ${at === 0 ? 'the open' : `press ${at}`} differs from the libraries'`);
        if (at === 0 && b.debugOpen && r.debugOpen && failures.get(2).length === 1) {
          console.log(`   first difference (SIM_NBA_DRAFT_BOARD_DEBUG, ids renamed): ${firstDiff(b.debugOpen, r.debugOpen, '')}`);
          console.log(`   the board drew ${b.callsBeforeOpen} numbers before the open${b.earlyStacks?.length ? `, first from: ${b.earlyStacks.join(' || ')}` : ''}`);
        }
      }
      if (b.final !== r.final) fail(2, `${tagOf(b)}: the league and desk after the summer differ from the libraries'`);
      if (b.calls !== r.calls) fail(2, `${tagOf(b)}: the board drew ${b.calls} numbers, the libraries ${r.calls}`);
      if (b.phase !== 'hub' || b.round !== 1 || b.seasonGain !== 1) fail(2, `${tagOf(b)}: ended on ${b.phase}, round ${b.round}, season +${b.seasonGain}`);
      compared += presses.length + 1;
    }
    if (failures.get(2).length > before) redCases.add(b.kind);
  }
  console.log(`   ${boardRows.length} nights (${EARNED_FLEET.join(', ')}; ${SEEDS} seeds each): ${compared} saves compared with the libraries' replay, ${boardRows.reduce((a, r) => a + r.picks, 0)} picks by his hand, ${boardRows.filter(r => r.clockAt.length && r.clockAt[0] > 1).length} nights with picks before his first, ${boardRows.reduce((a, r) => a + r.calls, 0)} draws in all`);

  open(3, 'Reloads: the same nights, the board mounted again from the save after every press');
  const boardOf = new Map(boardRows.map(r => [keyOf(r), r]));
  const reloadRows = preOk(play(head, fleet(EARNED_FLEET, 'reload')));
  for (const r of reloadRows) {
    const before = failures.get(3).length;
    if (r.error) fail(3, `${tagOf(r)}: ${r.error}`);
    for (const f of r.reloadFaults) fail(3, `${tagOf(r)}: ${f}`);
    if (!r.error && r.finalAll !== boardOf.get(keyOf(r)).finalAll) fail(3, `${tagOf(r)}: the save at the end differs from the same night played without reloads`);
    if (r.remounts < 2) fail(3, `${tagOf(r)}: only ${r.remounts} reloads, the check would pass empty`);
    if (failures.get(3).length > before) redCases.add(r.kind);
  }
  console.log(`   ${reloadRows.length} nights, ${reloadRows.reduce((a, r) => a + r.remounts, 0)} reloads, ${reloadRows.reduce((a, r) => a + r.cardChecks, 0)} of them at a lottery card not yet continued`);
  if (reloadRows.reduce((a, r) => a + r.cardChecks, 0) === 0) fail(3, 'no reload landed on a lottery card: the settled check passed empty');

  open(4, 'The way out: no pick, a last slot at pick 60 and his staff from his first slot all reach the hub of the next season');
  const finRows = [...boardRows.filter(r => r.kind === 'nopick'), ...preOk(play(head, fleet(['last60', 'staff'], 'board')))];
  for (const r of finRows) {
    if (r.error) { fail(4, `${tagOf(r)}: ${r.error}`); continue; }
    if (r.phase !== 'hub' || r.round !== 1 || r.seasonGain !== 1) fail(4, `${tagOf(r)}: ended on ${r.phase}, round ${r.round}, season +${r.seasonGain}`);
    if (r.kind === 'nopick' && (r.picks !== 0 || r.clockAt.length)) fail(4, `${tagOf(r)}: a GM with no pick was put on the clock`);
    if (r.kind === 'last60' && (r.clockAt.join() !== '60' || r.picks !== 1)) fail(4, `${tagOf(r)}: on the clock at ${r.clockAt.join(', ') || 'nothing'}, ${r.picks} picks, not once at 60`);
    if (r.kind === 'staff' && (r.picks !== 0 || r.clockAt.length !== 1)) fail(4, `${tagOf(r)}: the staff press left ${r.picks} picks to him`);
  }
  console.log(`   ${finRows.length} nights to the hub: ${finRows.filter(r => r.kind === 'nopick').length} with no pick, ${finRows.filter(r => r.kind === 'last60').length} with only pick 60, ${finRows.filter(r => r.kind === 'staff').length} by his staff`);

  open(5, `Rollback: a night saved by this build, mounted on the BASE board (${BASE}), finishes the old way`);
  const stops = preOk(play(head, [...fleet(['rollClock'], 'board', { stopAt: 'clock' }), ...fleet(['rollNopick'], 'board', { stopAt: 'open' })]));
  const baseRoot = baseSrc(BASE);
  const baseBundle = await bundle(baseRoot, fs.readFileSync(path.join(baseRoot, BOARD.slice(4)), 'utf8'), 'base');
  const mounts = [];
  for (const r of stops) {
    if (!r.saveAt) { fail(5, `${tagOf(r)}: the night was not saved mid way (${r.error ?? 'no stop'})`); continue; }
    const s = r.saveAt;
    if (CONTROL === 'bigclass') while (s.draftClass.length <= 70) s.draftClass.push({ ...s.draftClass[0], name: `${s.draftClass[0].name} ${s.draftClass.length}` });
    const file = path.join(baseBundle.owned, `save-${r.kind}-${r.seed}.json`);
    fs.writeFileSync(file, JSON.stringify(s));
    mounts.push({ kind: r.kind, seed: r.seed, mode: 'mount', saveFile: file });
  }
  const baseRows = play(baseBundle, mounts);
  for (const r of baseRows) {
    if (r.error) fail(5, `${tagOf(r)}: the base board: ${r.error}`);
    else if (r.phase !== 'hub' || r.seasonGain !== 1) fail(5, `${tagOf(r)}: the base board ended on ${r.phase}, season +${r.seasonGain}, not the hub of the next season`);
  }
  console.log(`   ${baseRows.length} mid night saves (on the clock, and a GM with no pick at the card) finished on ${BASE}'s board: ${baseRows.filter(r => !r.error && r.phase === 'hub').length} reached the hub, ${baseRows.reduce((a, r) => a + r.picks, 0)} picks made there`);

  /* ---------------------------------------------------------------- */
  open(6, 'Fences: the screen and its hook name no sport, the board names no lift module, every harness anchor is there once');
  let screen = read(SCREEN);
  if (CONTROL === 'screensport') {
    screen = `import { nbaGamePickRules } from '@/lib/nbaGmDesk';\n${screen}`;
    console.log('   NEGATIVE CONTROL screensport: a copy of the screen imports the NBA desk; section 6 must go red');
  }
  let boardCode = board;
  if (CONTROL === 'boardlift') {
    boardCode = `import type { GmDraftNight } from '@/lib/gmDraftNight';\n${boardCode}`;
    console.log('   NEGATIVE CONTROL boardlift: a copy of the board imports a lift module; section 6 must go red');
  }
  const importsOf = code => [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g), ...code.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  const SHARED = [
    [SCREEN, screen, ['react', '@/lib/utils', '@/lib/gmEarnedDraft', '@/lib/draftNight', './DraftNightCard', './gmLazyPanel', './GmLotteryCard']],
    [HOOK, read(HOOK), ['react', '@/lib/gmEarnedDraft', '@/lib/draftNight']],
  ];
  for (const [rel, text, allowed] of SHARED) {
    const code = strip(text);
    const froms = importsOf(code);
    if (!froms.length) fail(6, `${rel} imports nothing this check can read`);
    for (const f of froms) if (!allowed.includes(f)) fail(6, `${rel} imports ${f}; it may import ${allowed.join(', ')} and nothing of a sport`);
    if (/nba|nfl|nhl|mlb/i.test(code)) fail(6, `${rel} names a sport in its code`);
    if (/Math\.random|localStorage|sessionStorage/.test(code)) fail(6, `${rel} draws a number or touches storage`);
    console.log(`   ${rel}: ${froms.length} imports, all allowed; no sport, no draw, no storage`);
  }
  for (const m of strip(screen).matchAll(/import\s+(type\s+)?\{[^}]*\}\s*from\s*['"](@\/lib\/gmEarnedDraft|@\/lib\/draftNight)['"]/g)) {
    if (!m[1]) fail(6, `${SCREEN} takes values from ${m[2]}; it may take types only`);
  }
  const LIFT = /\b(gmDraftOrder|gmDraftNight|gmLotteryNight|GmLotteryCard)\b/;
  if (LIFT.test(strip(boardCode))) fail(6, `${BOARD} names a lift module (${strip(boardCode).match(LIFT)[1]}): it reaches the lift only through nbaEarnedDraft and the shared screen`);
  /* simNbaDraftCapital's 21 controls, read from that file, so a new line that repeats an anchor is seen. */
  const cap = read('scripts/simNbaDraftCapital.mjs');
  const body = cap.slice(cap.indexOf('const controls = {') + 'const controls = {'.length, cap.indexOf('\n};', cap.indexOf('const controls = {')));
  const capControls = new Function(`return {${body}\n};`)();
  const executable = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const boardAnchors = Object.entries(capControls).filter(([, c]) => c[0] === 'board');
  if (Object.keys(capControls).length < 20 || boardAnchors.length < 10) fail(6, `read ${Object.keys(capControls).length} controls from simNbaDraftCapital, ${boardAnchors.length} on the board: the reader is broken`);
  for (const [name, [, anchor]] of boardAnchors) {
    const n = once(executable(boardCode), anchor);
    if (n !== 1) fail(6, `simNbaDraftCapital's control ${name} anchor is in the board's executable source ${n} times, not once`);
  }
  const OTHER = {
    'simGmReload restore': "      if (s.fired) setPhase('fired');\n      else if (s.phase !== 'recap') setPhase(s.phase);\n      else if (s.postseason) setPhase('recap');\n      else openDraft(s.league, s.myTeam, s);\n",
    'simDraftNight norivals': 'grade: gradeOf(pr) }, rivalPicks,',
  };
  for (const [name, anchor] of Object.entries(OTHER)) if (once(boardCode, anchor) !== 1) fail(6, `${name}'s anchor is in the board ${once(boardCode, anchor)} times, not once`);
  console.log(`   ${BOARD}: names no lift module; ${boardAnchors.length} of simNbaDraftCapital's ${Object.keys(capControls).length} anchors are board anchors, each once; simGmReload's and simDraftNight's anchors once`);
}

/* ================================================================== */
const red = opened.filter(n => failures.get(n).length > 0);
const total = opened.reduce((a, n) => a + failures.get(n).length, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const exact = red.length === want.expect.length && want.expect.every(n => red.includes(n));
  const casesOk = !want.cases || (want.cases.length === redCases.size && want.cases.every(c => redCases.has(c)));
  if (!red.length) { console.log(`simNbaDraftBoard control ${CONTROL}: DID NOT FIRE (every section green).`); process.exit(3); }
  if (!exact || !casesOk) { console.log(`simNbaDraftBoard control ${CONTROL}: MISFIRED, red ${red.join(', ')} (cases ${[...redCases].join(', ') || 'none'}), want ${want.expect.join(', ')}${want.cases ? ` on ${want.cases.join(', ')}` : ''}.`); process.exit(1); }
  console.log(`simNbaDraftBoard control ${CONTROL}: FIRED, section ${red.join(', ')} red with ${total} failure(s)${want.cases ? ` (cases ${[...redCases].join(', ')})` : ''}, the others green.`);
  process.exit(1);
}
console.log(`\n${opened.length} sections (${opened.join(', ')}), ${SEEDS} seeds a case, ${total} failure(s).`);
if (red.length) { console.log(`simNbaDraftBoard: red in section ${red.join(', ')}.`); process.exit(1); }
console.log('simNbaDraftBoard: green.');
process.exit(0);

/* ================================================================== */
/* The child: one play through the real board in jsdom.                */
/* ================================================================== */
async function child() {
  const job = JSON.parse(process.env.SIM_NBA_DRAFT_BOARD_JOB);
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/nba-front-office' });
  for (const name of ['window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Text', 'MutationObserver', 'SVGElement', 'getComputedStyle', 'MouseEvent', 'Event']) globalThis[name] = dom.window[name];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.scrollTo = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
  globalThis.requestAnimationFrame = cb => setTimeout(() => cb(0), 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  /* A fixed clock, and a fixed draw for the id epoch the modules mint at load, so every play of every run is alike. */
  const FIXED = Date.UTC(2026, 9, 1, 12);
  const RealDate = Date;
  globalThis.Date = class FixedDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [FIXED])); }
    static now() { return FIXED; }
  };
  const lehmer = seed => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    let calls = 0;
    const draw = () => { calls += 1; s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    draw.calls = () => calls;
    return draw;
  };
  Math.random = lehmer(1540);
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const E = await import(pathToFileURL(process.env.SIM_NBA_DRAFT_BOARD_PRODUCT).href);
  const { act } = React;
  const KEY = 'nba-front-office-save-v1';
  const clone = v => JSON.parse(JSON.stringify(v));
  const probe = E.makeIdMinter('q')();
  const EPOCH = probe.slice(1, probe.lastIndexOf('-'));
  /* Every id renamed in the order it first appears (keys too), then hashed. */
  const canonOf = value => {
    const ids = new Map();
    const re = new RegExp(`[a-z]*${EPOCH}-\\d+`, 'g');
    const fix = s => s.replace(re, m => { if (!ids.has(m)) ids.set(m, `#${ids.size + 1}`); return ids.get(m); });
    const walk = v => (Array.isArray(v) ? v.map(walk)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [fix(k), walk(x)]))
        : typeof v === 'string' ? fix(v) : v);
    return walk(value);
  };
  const hashOf = value => createHash('sha256').update(JSON.stringify(canonOf(value))).digest('hex');

  /* The season, by construction: thirty clubs on distinct records, a real postseason, the champion pushed. */
  const rng = lehmer(15400 + job.seed * 101);
  const lg = E.initNbaLeague(rng);
  const ids = Object.keys(lg.teams).sort();
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  order.forEach((id, i) => { lg.teams[id].wins = 26 + i; lg.teams[id].losses = 56 - i; });
  lg.round = E.NBA_ROUNDS;
  const { series, champion } = E.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: champion });
  const OLD = CASES.includes(job.kind);
  const PICK_ME = {
    weakest: () => ids[0], middle: () => ids[14], champion: () => champion, traded: () => ids[3], bought: () => ids[22],
    nopick: () => ids[6], last60: () => ids[20], staff: () => ids[2], rollClock: () => ids[1], rollNopick: () => ids[6],
  };
  if (!OLD && !PICK_ME[job.kind]) throw new Error(`no case ${job.kind}`);
  const me = OLD ? ids[(job.seed * 7) % ids.length] : PICK_ME[job.kind]();
  const post = { series, champion, gradeLine: null };
  const base = { league: lg, myTeam: me, titles: 0, seasonsPlayed: 1 };
  let save;
  let pre = true;
  if (!OLD) {
    /* An earned night's save: the desk on, at the recap, with this draft's picks moved on the ledger first. */
    const order = E.openNbaDraftNight(E.openNbaDesk(clone(lg), me), clone(lg), series, me)?.night.order ?? null;
    if (!order) pre = 'no night opens on this save';
    else {
      const last = order.later[order.later.length - 1];
      const other = ids.find(c => c !== me && c !== last);
      const away = [[1, me, other], [2, me, other]];
      const MOVES = { traded: [[1, me, ids[27]]], bought: [[1, ids[1], me]], nopick: away, rollNopick: away, last60: [...away, [2, last, me]] };
      const desk0 = E.openNbaDesk(lg, me);
      let ledger = E.nbaPicksOf(desk0, lg);
      for (const [round, orig, to] of MOVES[job.kind] ?? []) ledger = E.movePicks(ledger, [E.pickKey({ year: lg.season, round, orig })], to);
      E.syncNbaPicks(lg, ledger);
      save = { ...base, phase: 'recap', draftClass: null, picksLeft: 0, postseason: post, gm: E.withGmBlock(desk0, 'picks', ledger) };
    }
  } else if (job.kind === 'deskOffRecap') {
    save = { ...base, phase: 'recap', draftClass: null, picksLeft: 0, postseason: post };
    if (!E.openNbaDraftNight(E.openNbaDesk(clone(lg), me), clone(lg), series, me)) pre = 'a desk on this save would open no night';
  } else {
    const desk = E.openNbaDesk(lg, me);
    E.syncNbaPicks(lg, E.nbaPicksOf(desk, lg));
    if (job.kind === 'deskOnOpen') {
      const cls = E.nbaDraftClass(rng, 24, E.leagueNames(lg));
      save = { ...base, phase: 'draft', draftClass: cls, picksLeft: E.nbaDraftCapital(lg.teams[me]) ?? 0, draftAiBatchesLeft: 2, postseason: post, gm: desk };
      const night = E.openNbaDraftNight(desk, clone(lg), series, me)?.night ?? null;
      const planted = night ? E.withGmBlock(desk, E.NBA_DRAFT_BLOCK, night) : null;
      if (!planted || JSON.stringify(E.nbaDraftNightOf(planted, lg)) !== JSON.stringify(night)) pre = 'a night planted on this save would not be current';
      else if (job.plant) save.gm = planted;
    } else {
      save = { ...base, phase: 'recap', draftClass: null, picksLeft: 0, gm: desk };
    }
  }
  if (job.mode === 'mount') save = JSON.parse(fs.readFileSync(job.saveFile, 'utf8'));
  if (pre !== true || !save) {
    fs.writeFileSync(process.env.SIM_NBA_DRAFT_BOARD_OUT, JSON.stringify({ kind: job.kind, seed: job.seed, mode: job.mode, pre: pre === true ? 'no save was built' : pre }));
    dom.window.close();
    return;
  }
  const seasonBefore = save.league.season;
  const EARNED_KINDS = Object.keys(PICK_ME);
  const drawSeed = OLD ? 777000 + job.seed * 13 + CASES.indexOf(job.kind) : 888000 + job.seed * 17 + EARNED_KINDS.indexOf(job.kind);
  const pickOf = s => ({ league: s.league, gm: s.gm, draftClass: s.draftClass, picksLeft: s.picksLeft });

  if (job.mode === 'replay') {
    /* The libraries alone, on the stream the board drew from: open, the class, Continue, his scout's best (or his
       staff), to the end, then the desk's summer. Each state is what the board's save after that press holds. */
    const rr = lehmer(drawSeed);
    const L = clone(save.league);
    /* The board's load path repairs ids and reconciles every rotation before anything else reads the league
       (ensureNbaLeagueIds); the replay starts from the league the board holds, not the raw save. */
    E.ensureNbaLeagueIds(L);
    let desk = save.gm;
    const opened = E.openNbaDraftNight(desk, L, series, me);
    const states = [];
    let error = null;
    let final = null;
    let debugOpen;
    if (!opened) error = 'the libraries opened no night';
    else {
      desk = opened.desk;
      let cls = E.nbaEarnedDraftClass(rr, opened.night.slots.length, E.leagueNames(L));
      const left = () => { const n = E.nbaDraftNightOf(desk, L); return n ? E.slotsLeftFor(n.slots, n.made, me).length : 0; };
      states.push(hashOf({ league: L, gm: desk, draftClass: cls, picksLeft: left() }));
      if (process.env.SIM_NBA_DRAFT_BOARD_DEBUG) debugOpen = canonOf(clone({ league: L, gm: desk, draftClass: cls, picksLeft: left() }));
      let press = E.nbaDraftContinue(L, desk, me, cls, rr);
      for (let i = 0; i < 70 && press; i += 1) {
        desk = press.desk;
        cls = press.left;
        states.push(hashOf({ league: L, gm: desk, draftClass: cls, picksLeft: left() }));
        if (press.done) break;
        if (job.kind === 'staff') press = E.nbaDraftByStaff(L, desk, me, cls, rr);
        else {
          const level = E.gmStaffLevel(E.nbaStaffOf(desk, L, me).block, 'scouting');
          const read = p => E.nbaScoutRead(p, me, L.season, level);
          const best = [...cls].sort((a, b) => read(b) - read(a) || a.id.localeCompare(b.id))[0];
          press = E.nbaDraftPick(L, desk, me, cls, best.id, rr);
        }
      }
      if (!press || !press.done) error = 'the libraries did not reach the end of the draft';
      else {
        const summer = E.nbaDeskOffseason(L, desk, me, rr);
        if (!summer.ok) error = 'the desk refused the summer';
        final = hashOf({ league: L, gm: summer.desk });
      }
    }
    fs.writeFileSync(process.env.SIM_NBA_DRAFT_BOARD_OUT, JSON.stringify({ kind: job.kind, seed: job.seed, mode: 'replay', pre, error, states, final, calls: rr.calls(), debugOpen }));
    dom.window.close();
    return;
  }

  localStorage.clear();
  if (save) localStorage.setItem(KEY, JSON.stringify(save));
  /* React's act draws one number the first time it queues a task (enqueueTask names a module with Math.random). On an
     earned night that draw is taken before the counted stream starts, so the board's stream is the board's alone and
     the library replay can match it; section 1's old paths keep it inside, as their fixture was recorded. */
  if (!OLD && job.mode !== 'mount') await act(async () => {});
  const draw = lehmer(job.mode === 'mount' ? 999000 + job.seed : drawSeed);
  /* SIM_NBA_DRAFT_BOARD_DEBUG: where the board drew before the open, if it did. */
  const earlyStacks = [];
  let opening = false;
  Math.random = process.env.SIM_NBA_DRAFT_BOARD_DEBUG
    ? () => { if (!opening && earlyStacks.length < 3) earlyStacks.push(new Error().stack.split('\n').slice(2, 7).map(s => s.trim()).join(' < ')); return draw(); }
    : draw;
  let root = createRoot(document.getElementById('root'));
  const buttons = () => [...document.querySelectorAll('button')];
  const byText = text => buttons().find(b => b.textContent.trim() === text);
  const click = async node => { await act(async () => { node.click(); }); };
  const onDraft = () => [...document.querySelectorAll('p.font-display')].some(p => /^The \d{4} Draft$/.test(p.textContent.trim()));
  let picks = 0;
  let error = null;
  const render = () => act(async () => root.render(React.createElement(E.Boundary, { resetKey: '/nba-front-office' }, React.createElement(E.Board))));
  await render();
  if (!OLD && job.mode !== 'mount') {
    await earned();
    return;
  }
  for (let step = 0; step < 24 && !error; step += 1) {
    if (/This page broke/.test(document.body.textContent)) { error = 'the board crashed (RouteErrorBoundary)'; break; }
    if (!onDraft()) {
      const go = byText('Go to the draft');
      if (go && JSON.parse(localStorage.getItem(KEY)).phase === 'recap') { await click(go); continue; }
      break;
    }
    const choice = document.querySelector('[data-nba-draft-choice]') || document.querySelector('div.grid > button.rounded-lg');
    if (choice) { picks += 1; await click(choice); continue; }
    const next = byText('Finish draft and offseason') || document.querySelector('[data-draft-continue]') || byText('Continue to the hub');
    if (next) { await click(next); continue; }
    error = `stuck on the draft screen: ${document.body.textContent.slice(0, 160)}`;
  }
  const end = JSON.parse(localStorage.getItem(KEY));
  if (!error && onDraft()) error = 'still on the draft screen after 24 presses';
  const row = {
    kind: job.kind, seed: job.seed, pre, error, picks, phase: end.phase, seasonGain: end.league.season - seasonBefore,
    calls: draw.calls(), hash: hashOf(end),
  };
  await act(async () => root.unmount());
  dom.window.close();
  fs.writeFileSync(process.env.SIM_NBA_DRAFT_BOARD_OUT, JSON.stringify(row));

  /* An earned night through the board: Go to the draft, Continue, his scout's best (the first of his board) or his
     staff, to the hub; with mode `reload`, the board is unmounted and mounted again from the save after every
     press, and a remount must draw no number and show a lottery card not yet continued on its last frame. */
  async function earned() {
    const writes = [];
    const realSet = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function setItem(k, v) { if (k === KEY) writes.push(v); return realSet.call(this, k, v); };
    const tick = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
    const stageOf = () => document.querySelector('[data-gm-earned-draft]')?.getAttribute('data-gm-earned-draft') ?? null;
    const waitCard = async () => { for (let i = 0; i < 40 && !document.querySelector('[data-lottery-continue]'); i += 1) await tick(); };
    const clockAt = [];
    const reloadFaults = [];
    let remounts = 0;
    let cardChecks = 0;
    let callsBeforeOpen = null;
    let saveAt = null;
    const remount = async () => {
      const before = draw.calls();
      await act(async () => root.unmount());
      root = createRoot(document.getElementById('root'));
      await render();
      const s = JSON.parse(localStorage.getItem(KEY));
      const n = s.phase === 'draft' ? s.gm?.blocks?.draft : null;
      if (n && n.seen === false) {
        cardChecks += 1;
        await waitCard();
        if (!document.querySelector('[data-lottery-settled]')) reloadFaults.push('a reload at the lottery card played the night again');
      }
      if (draw.calls() !== before) reloadFaults.push(`a reload drew ${draw.calls() - before} numbers`);
      remounts += 1;
    };
    for (let step = 0; step < 90 && !error; step += 1) {
      if (/This page broke/.test(document.body.textContent)) { error = 'the board crashed (RouteErrorBoundary)'; break; }
      const stage = stageOf();
      if (!stage) {
        if (onDraft()) { error = 'the old draft screen drew on an earned night'; break; }
        const go = byText('Go to the draft');
        if (!go || JSON.parse(localStorage.getItem(KEY)).phase !== 'recap') break;
        callsBeforeOpen = draw.calls();
        opening = true;
        await click(go);
        await waitCard();
        if (job.stopAt === 'open') { saveAt = JSON.parse(localStorage.getItem(KEY)); break; }
      } else if (stage === 'lottery') {
        await waitCard();
        const c = document.querySelector('[data-lottery-continue]');
        if (!c) { error = 'the lottery card never loaded'; break; }
        await click(c);
      } else if (stage === 'clock') {
        const line = [...document.querySelectorAll('[data-gm-draft-lines] p')].map(p => p.textContent).find(l => l.startsWith('You are on the clock at '));
        if (line) clockAt.push(Number(line.slice('You are on the clock at '.length, -1)));
        if (job.stopAt === 'clock' && line) { saveAt = JSON.parse(localStorage.getItem(KEY)); break; }
        const choice = document.querySelector('[data-gm-draft-choice]');
        const staff = document.querySelector('[data-gm-draft-staff]');
        const finish = document.querySelector('[data-gm-draft-finish]');
        if (job.kind === 'staff' && staff) await click(staff);
        else if (choice) { picks += 1; await click(choice); }
        else if (finish) await click(finish);
        else if (staff) await click(staff);
        else { error = 'stuck on the clock with nothing to press'; break; }
      } else {
        const out = document.querySelector('[data-draft-continue]') || document.querySelector('[data-gm-draft-leave]');
        if (!out) { error = 'the closing screen has no way out'; break; }
        await click(out);
        continue;
      }
      if (job.mode === 'reload') await remount();
    }
    window.Storage.prototype.setItem = realSet;
    const end = JSON.parse(localStorage.getItem(KEY));
    if (!error && !saveAt && (stageOf() || onDraft())) error = 'still on the draft after 90 presses';
    const parsed = writes.map(w => JSON.parse(w));
    const last = parsed[parsed.length - 1];
    const out = {
      kind: job.kind, seed: job.seed, mode: job.mode, pre, error, picks, clockAt, remounts, cardChecks, reloadFaults,
      phase: end.phase, round: end.league.round, seasonGain: end.league.season - seasonBefore, calls: draw.calls(),
      writes: parsed.map(s => hashOf(pickOf(s))), final: last ? hashOf({ league: last.league, gm: last.gm }) : null, finalAll: hashOf(end),
      saveAt, callsBeforeOpen, earlyStacks,
      debugOpen: process.env.SIM_NBA_DRAFT_BOARD_DEBUG && parsed[0] ? canonOf(pickOf(parsed[0])) : undefined,
    };
    await act(async () => root.unmount());
    dom.window.close();
    fs.writeFileSync(process.env.SIM_NBA_DRAFT_BOARD_OUT, JSON.stringify(out));
  }
}

