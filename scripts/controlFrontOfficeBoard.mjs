/* Round 1305: the negative controls of the NFL front office's two board tests,
 * src/components/front-office/FrontOfficeGameDay.test.tsx and
 * FrontOfficeOnePress.test.tsx.
 *
 * WHY THIS IS A FILE IN THE REPO. Both tests read the real board, and a test
 * that has never been seen to fail proves nothing. Their controls first lived
 * in a folder on one PC, so a later round that edits the board could not show
 * that either file can still go red. This runs them from the repo, the way
 * GM_RELOAD_CONTROL=replay of scripts/simGmReload.mjs runs its own.
 *
 * WHAT ONE CONTROL DOES. It writes a copy of the board with ONE named
 * mutation to dist/.fo-board-control (inside the repo, so the copy's bare
 * imports resolve), points both tests at the copy through FO_BOARD_NFL, runs
 * them, removes the copy, and reads vitest's own report. A control has FIRED
 * only when every test it names is red, every test it names as untouched is
 * green, and the test files loaded and ran (a copy that does not load is a
 * broken control, not a firing).
 *
 *   node scripts/controlFrontOfficeBoard.mjs list
 *   node scripts/controlFrontOfficeBoard.mjs <name>
 *   node scripts/controlFrontOfficeBoard.mjs all
 *
 * EXIT. 0: every control asked for fired. 1: one did not fire, or its copy
 * did not load. 2: it could not run (an unknown name, or a string that is
 * not in the board exactly once: a mutation that changes nothing proves
 * nothing, so this refuses to write the copy).
 *
 * `blank` is this file's own control and is not part of `all`: it rewrites a
 * comment and nothing else, so no test may go red, and the run must say DID
 * NOT FIRE and exit 1. If `blank` ever exits 0 this file is lying.
 *
 * Not named sim* on purpose: it writes under dist/ and spawns vitest once a
 * control, so it is run on demand (a GitHub runner, never beside a harness
 * that walks dist) and not by scripts/runAllSims.mjs. Nothing here reads the
 * network, a clock or the database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const GD = 'src/components/front-office/FrontOfficeGameDay.test.tsx';
const OP = 'src/components/front-office/FrontOfficeOnePress.test.tsx';

/* The tests by the words of their titles. */
const T = {
  week: [GD, 'his game of the week is in the save'],
  remount: [GD, 'a remount keeps the log'],
  damaged: [GD, 'a damaged log, a log of another season'],
  abandon: [GD, 'abandon in the middle of a season and start again'],
  pressOff: [GD, 'the told scores are the saved scores, with the GM desk off'],
  pressOn: [GD, 'the told scores are the saved scores, with the GM desk on'],
  deskWeek: [GD, 'with the GM desk on, his game is told at the chance it was played at'],
  ordinary: [OP, 'ordinary: the save at the recap'],
  title: [OP, 'title: the save at the recap'],
};

const TELL_WEEK = 'const told = games.map(g => nflTell(g, lg.teams, lg.season, nflWhere(lg.week), deskWeek?.edges));';
const TELL_ROUND = 'told: r.games.map(g => nflTell(g, lg.teams, lg.season, r.name, playoffEdges))';
const READ_LOG = 'setGameLog(readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam));';

/* name: what it breaks, the rewrites (each string in the board exactly once), the tests that must go red, the tests that must stay green */
const CONTROLS = {
  nolog: ['the log is not saved', [['...(gameLogLive.current ? { gameLog: gameLogLive.current } : {}),', '']], [T.week, T.remount], []],
  abandonkeeps: ['the log is cleared neither by Abandon nor by a new franchise (each alone is masked by the other: two keys, one lock)',
    [['setGameLog(null); /* a new franchise */', '/* a new franchise */'], ['setGameLog(null); /* abandoned */', '/* abandoned */']], [T.abandon], [T.week]],
  summerkeeps: ['the summer does not end the log', [['setGameLog(null); /* the summer */', '/* the summer */']], [T.ordinary], [T.week]],
  refusesave: ['a log that does not read refuses the save',
    [[READ_LOG, '{ const l = readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam); if (s.gameLog !== undefined && !l) { setSaveError(true); return; } setGameLog(l); }']], [T.damaged], [T.week]],
  trustlog: ['a log that does not read is kept as it is', [[READ_LOG, 'setGameLog((s.gameLog ?? null) as GmGameLog | null);']], [T.damaged], [T.week]],
  weekengine: ["the week's grid shows the engine's own scores", [['setWeekResults(told.map(t => t.game));', 'setWeekResults(games);']], [T.week], [T.remount]],
  enginescores: ["the one press postseason keeps the engine's own scores in the save", [['closeSeason(lg, toldRounds, champ);', 'closeSeason(lg, rounds, champ);']], [T.pressOff, T.pressOn], [T.week]],
  keyseason: ["the week's games are keyed to another season", [[TELL_WEEK, TELL_WEEK.replace('lg.season,', 'lg.season + 1,')]], [T.week, T.deskWeek], []],
  tellnoedges: ["the week's games are told without the edges they were played with", [[TELL_WEEK, TELL_WEEK.replace(', deskWeek?.edges)', ')')]], [T.deskWeek, T.pressOn], [T.week, T.pressOff]],
  noedges: ["the staff's edge is dropped from the week's games and still told",
    [['const games = lg.schedule[lg.week - 1].map(g => (deskWeek ? simGame(g, lg.teams, Math.random, deskWeek.edges) : simGame(g, lg.teams, Math.random)));', 'const games = lg.schedule[lg.week - 1].map(g => simGame(g, lg.teams, Math.random));']], [T.deskWeek], [T.week]],
  playoffnoedges: ['the thirteen playoff games are told without the edges the bracket was played with', [[TELL_ROUND, TELL_ROUND.replace(', playoffEdges)', ')')]], [T.pressOn], [T.pressOff, T.week]],
  playoffkey: ["a playoff game is keyed to the week and not to its round", [[TELL_ROUND, TELL_ROUND.replace('r.name', 'nflWhere(lg.week)')]], [T.pressOff, T.pressOn], [T.week]],
  noseason: ['the lifted close forgets to count the season', [['const newSeasons = seasonsPlayed + 1;', 'const newSeasons = seasonsPlayed;']], [T.pressOff, T.ordinary], [T.week]],
  closetwice: ['the season is closed twice', [['closeSeason(lg, toldRounds, champ);', 'closeSeason(lg, toldRounds, champ); closeSeason(lg, toldRounds, champ);']], [T.ordinary], [T.week]],
  titles: ['a title counts double', [['const newTitles = titles + (won ? 1 : 0);', 'const newTitles = titles + (won ? 2 : 0);']], [T.title], [T.ordinary, T.week]],
  blank: ["THIS FILE'S OWN CONTROL: a comment is reworded and nothing else, so nothing may fire", [['setGameLog(null); /* the summer */', 'setGameLog(null); /* the summer, as it was */']], [T.week], []],
};

const cannot = m => { console.error(`controlFrontOfficeBoard: CANNOT RUN. ${m}`); process.exit(2); };
const asked = process.argv[2];
if (asked === 'list') { for (const [n, [why]] of Object.entries(CONTROLS)) console.log(`${n}: ${why}`); process.exit(0); }
const names = asked === 'all' || asked === 'check' ? Object.keys(CONTROLS).filter(n => n !== 'blank' || asked === 'check') : [asked];
if (!asked || names.some(n => !Object.prototype.hasOwnProperty.call(CONTROLS, n))) cannot(`Name a control, or all, list or check. Known: ${Object.keys(CONTROLS).join(', ')}`);

/* The board is CRLF in a Windows working copy; the strings here are LF. */
const board = fs.readFileSync(path.join(ROOT, BOARD), 'utf8').split('\r\n').join('\n');
if (/from '\.\.?\//.test(board)) cannot(`${BOARD} holds an import relative to its own folder, which a copy under dist cannot resolve`);
/* `check` runs no test: it only asks that every control still has its strings in the board, each exactly once. */
if (asked === 'check') {
  for (const n of names) for (const [from] of CONTROLS[n][1]) {
    const hits = board.split(from).length - 1;
    if (hits !== 1) cannot(`${n}: its string is in the board ${hits} times and must be there exactly once: ${from.slice(0, 100)}`);
  }
  console.log(`controlFrontOfficeBoard: check passed. Every string of all ${names.length} controls is in the board exactly once.`);
  process.exit(0);
}
const dir = path.join(ROOT, 'dist', '.fo-board-control');
const LOAD_ERROR = /Failed to (load|resolve)|SyntaxError|Cannot find module/;

function run(name) {
  const [why, edits, red, green] = CONTROLS[name];
  let src = board;
  for (const [from, to] of edits) {
    const hits = src.split(from).length - 1;
    if (hits !== 1) cannot(`${name}: its string is in the board ${hits} times and must be there exactly once: ${from.slice(0, 100)}`);
    src = src.replace(from, () => to);
  }
  if (src === board) cannot(`${name}: the rewrite changed nothing`);
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, `Board.${name}.tsx`);
  const report = path.join(dir, `report.${name}.json`);
  fs.writeFileSync(copy, src);
  let r, json = null;
  try {
    r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', GD, OP, '--reporter=json', `--outputFile=${report}`, '--testTimeout=600000', '--hookTimeout=120000'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FO_BOARD_NFL: copy.replaceAll('\\', '/'), CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
    if (fs.existsSync(report)) json = JSON.parse(fs.readFileSync(report, 'utf8'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const tail = ((r.stdout || '') + (r.stderr || '')).slice(-1200);
  if (!json || !Array.isArray(json.testResults)) return { name, fired: false, said: `vitest wrote no report (exit ${r.status}): ${tail}` };
  const rows = json.testResults.flatMap(f => (f.assertionResults || []).map(a => ({ file: String(f.name).replaceAll('\\', '/'), title: a.fullName || a.title || '', status: a.status, why: (a.failureMessages || []).join('\n') })));
  const find = ([file, words]) => rows.filter(x => x.file.endsWith(file) && x.title.includes(words));
  const reds = rows.filter(x => x.status === 'failed');
  console.log(`control ${name} (${why}): vitest exit ${r.status}; ${reds.length} red, ${rows.filter(x => x.status === 'passed').length} green of ${rows.length}`);
  for (const x of reds) console.log(`   red: ${path.basename(x.file)} > ${x.title.slice(0, 150)}`);
  /* a copy that did not load is not a firing */
  const unloaded = [GD, OP].filter(f => !rows.some(x => x.file.endsWith(f)));
  if (unloaded.length || json.testResults.some(f => LOAD_ERROR.test(f.message || '')) || reds.some(x => LOAD_ERROR.test(x.why))) {
    return { name, fired: false, said: `the copy did not load or a test file did not run (${unloaded.join(', ') || 'a load error in the report'}), so a red here is not the check: ${tail}` };
  }
  const problems = [];
  for (const t of red) {
    const hit = find(t);
    if (hit.length === 0) problems.push(`no test is titled "${t[1]}" (the control names a test that is not there)`);
    else if (!hit.every(x => x.status === 'failed')) problems.push(`"${t[1]}" stayed green`);
  }
  for (const t of green) {
    const hit = find(t);
    if (hit.length === 0) problems.push(`no test is titled "${t[1]}" (the control names a test that is not there)`);
    else if (!hit.every(x => x.status === 'passed')) problems.push(`"${t[1]}" went red and had to stay green`);
  }
  return { name, fired: problems.length === 0, said: problems.join('; ') };
}

const results = names.map(run);
for (const x of results) console.log(x.fired ? `control ${x.name}: FIRED. Every test it names is red and every test it spares is green.` : `control ${x.name}: DID NOT FIRE. ${x.said}`);
const fired = results.filter(x => x.fired).length;
console.log(`controlFrontOfficeBoard: ${fired} of ${results.length} control(s) fired${fired === results.length ? ', the board tests can fail for each named reason.' : `. NOT FIRED: ${results.filter(x => !x.fired).map(x => x.name).join(', ')}`}`);
process.exit(fired === results.length ? 0 : 1);
