/* GM reload harness: a finished season survives a reload on all four front
   office boards, and every closed season lands in the ledger exactly once.

   Round 431, audit blocker 5. On /front-office, /nba-front-office,
   /mlb-front-office and /nhl-front-office the final week handler ran the
   playoffs, advanced titles and seasonsPlayed, graded the mandate, and
   persisted phase 'recap' with the league still at the final week and no
   postseason. On reload the load effect mapped 'recap' back to 'hub', the
   play box offered the final week again, and one click ran it and the whole
   postseason a second time on a season that was already closed: measured on
   the old boards, seasonsPlayed 1 to 2 and NFL league games 544 to 576 (32
   teams each playing an 18th game in a 17 week season). Same defect class
   as CFB Dynasty, Round 426 part three, and the same three part fix: the
   save carries the postseason so the recap is drawn again, an older recap
   save opens on the draft, and the handler refuses a postseason for a
   season already in league.champions.

   Round 647. The four boards recorded titles * 100 + seasonsPlayed * 5, and
   only on a title season: a season without a title recorded nothing, every
   title paid for every title before it again, and the number was decided by
   the pick of team. They now close each season into one shared ledger
   (src/lib/seasonLedger.ts, the same module both dynasties use), one row per
   season, scored against the projection made at the pick and then at every
   close for the season after it (the Round 647 fix: from the roster the
   season finished with, the men cut that season counted, carried through
   the offseason a GM who touches nothing gets), and record that row once. Whether the pick still decides the
   number is measured headless in scripts/simSeasonLedger.mjs; this harness
   proves the boards wire it: which projection a row is scored against, and
   that each close is one recorded finish.

   Sections, both from src/components/front-office-shared/
   FrontOfficeSeasonClose.test.tsx under vitest in ONE run, every row read by
   name:
     1) the season closes once: five rows per board. Each builds a save at the
        final week from the real engine, plays the final week on the real
        board, remounts, and reads the save. The REPRO row of each board
        prints what a reload let the player do, echoed here as the measured
        evidence.
     2) the season ledger: eight rows per board. A title season adds exactly
        one row, scored against the projection the save carries, recorded
        once, the ceiling for a season past every projected one, and the
        recap line states the whole projection (wins and round, the bar, the
        season); a season without a title adds exactly one row, recorded
        once, and under the bar it scores nothing;
        an older save (two titles, four seasons, no ledger, no projection)
        adds one row, projected as it loads, with no retroactive points, and
        the recap calls the sum "Since 2026" rather than the career; replaying
        a closed title adds nothing (a reload records nothing, the final week
        refuses, the module refuses a second row); two seasons played on ONE
        mounted board add two rows and two finishes (the closed row has to
        reset between them), the next season is projected at the close and
        not again after the draft, and the career is their sum; the
        projection is the pick's, made on the real pick screen, so the same
        season scored against the roster at the whistle would pay less; a
        man cut before the close still counts in the next projection; and
        (Round 674, the fence lens review's R2.D3) the row is the season the
        engine played: its wins and games are the engine's standings (every
        game they count, overtime losses included) and its round is the one
        the engine's bracket reached. Every other row scores the recorded row
        against itself, so a board that built the row from the wrong numbers
        (the NHL board dropping its overtime losses) kept all of them green.

   Negative controls (house rule: prove the check can fail, and fail only
   where it was written to). Every control asserts its anchor is in the file
   EXACTLY ONCE, in the code with the comments stripped as well as in the
   text, refuses to run if its rewrite changed nothing, and a copy that fails
   to load is reported as a broken control, not as the check firing.
     GM_RELOAD_CONTROL=replay rewrites copies of all four boards with the
       recap restore put back to its pre-fix line and the closed season guard
       removed, points the test at them through FO_BOARD_NFL, FO_BOARD_NBA,
       FO_BOARD_MLB and FO_BOARD_NHL, and requires every board's "draws the
       recap again" row to go red on an assertion with its REPRO line showing
       the hub and a second closed season. Section 2 is printed and not
       judged under it: the pre-fix board replays a closed title, so the
       ledger's replay row legitimately goes red too.
     GM_RELOAD_CONTROL=late rewrites copies of the four boards whose close
       projects the season from the league at the whistle instead of reading
       the projection the save carries. The title and pick rows must go red
       on every board; the plain, two season and older save rows may (a
       winless season scores 0 against any projection).
     GM_RELOAD_CONTROL=offseason rewrites copies of the four boards that
       project the next season after the draft and the offseason, the way
       this round's second version did, instead of at the close. The two
       season and cut rows must go red on every board.
     GM_RELOAD_CONTROL=noreset rewrites copies of the four boards with the
       offseason's closed row reset deleted. The two season row must go red
       on every board, because the second close on the same mount is then no
       rise and records nothing.
     GM_RELOAD_CONTROL=otlosses (Round 674, the review's m647-3) rewrites a
       copy of the NHL board alone whose closed season counts wins and losses
       but not overtime losses as games played. Exactly the NHL board's
       engine row must go red; the other three boards render the real boards
       and every one of their rows must stay green.
     GM_RELOAD_CONTROL=double points every board and the test at a copy of
       the ledger that pushes a title season's row twice and no longer
       refuses a season already there (scripts/lib/seasonLedgerControl.mjs).
       Every row that closes a title (title, older, replay, two, pick) must
       go red on every board, and plain must stay green.
     GM_RELOAD_CONTROL=raw points them at a copy that scores the results and
       not the projection. The pick row must go red on every board (the
       pick's projection and the whistle's then score the same); the others
       may (a winless season scores 0 either way, and an unbeaten title
       season 100).
     GM_RELOAD_CONTROL=nokeep points the boards and the test, through
       NO_DOUBLE_SWAP, at a copy of src/lib/seasonFormats.ts whose untouched
       offseason does not count the men a GM cut. Exactly the cut row must go
       red on every board.
     GM_RELOAD_CONTROL=parallel (Round 674, R2.D10) runs the offseason and
       raw controls at the same moment, two children of this harness sharing
       one TEMP, the pair the review saw fail when four ran at once
       ("offseason fired on 0 of 4 boards", "raw ... Failed to resolve
       import"). Both must exit 0 on their own "the check works" line.

   Nothing here reads the clock. Round 674 (R2.D10): the control copies go in
   a per run folder under ROOT/.sim-control (scripts/lib/controlScratch.mjs),
   never dist, and nothing here deletes dist. Every copy prints a load line
   naming its run, and a control whose copies did not all print it is refused,
   so a red is this run's copy and not the real file or a sibling run's copy.

   Run: node scripts/simGmReload.mjs
*/
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEDGER_CONTROL_WORDS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';
import { controlScratch, loadedLine, withLoadedLine } from './lib/controlScratch.mjs';
import { stripComments } from './lib/readSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GM_RELOAD_CONTROL || '';
const BOARD_CONTROLS = ['replay', 'late', 'offseason', 'noreset'];
/* A control that rewrites one board and leaves the other three real. */
const ONE_BOARD_CONTROLS = ['otlosses'];
const MODULE_CONTROLS = ['double', 'raw'];
const FORMATS_CONTROLS = ['nokeep'];
const CONTROLS = [...BOARD_CONTROLS, ...ONE_BOARD_CONTROLS, ...MODULE_CONTROLS, ...FORMATS_CONTROLS, 'parallel'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`GM_RELOAD_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

/* ---- the parallel control: two controls at once, both must fire ---- */
if (CONTROL === 'parallel') {
  const PAIR = ['offseason', 'raw'];
  console.log(`NEGATIVE CONTROL ON: ${PAIR.join(' and ')} run at the same moment, sharing TEMP ${process.env.TEMP || process.env.TMP || '(default)'}; both must fire`);
  const runOne = name => new Promise(resolve => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, env: { ...process.env, GM_RELOAD_CONTROL: name } });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => resolve({ name, code, out }));
  });
  const results = await Promise.all(PAIR.map(runOne));
  let ok = 0;
  for (const r of results) {
    const works = new RegExp(`control "${r.name}": .*the check works`).test(r.out);
    const loaded = /every control copy printed its load line/.test(r.out);
    console.log(`   ${r.name}: exit ${r.code}, ${works ? 'fired' : 'DID NOT FIRE'}, ${loaded ? 'its own copies loaded' : 'NO LOAD LINE'}`);
    if (r.code === 0 && works && loaded) ok += 1;
    else console.log(r.out.split('\n').slice(-25).map(l => '     ' + l).join('\n'));
  }
  if (ok === PAIR.length) { console.log(`\ncontrol "parallel": ${PAIR.join(' and ')} both fired while running at once, each on its own copies, the check works`); process.exit(0); }
  console.error(`\ncontrol "parallel": ${ok} of ${PAIR.length} controls fired while running at once, so running controls in parallel gives false verdicts`);
  process.exit(1);
}

const TEST = 'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx';
const BOARDS = [
  ['NFL Front Office', 'FO_BOARD_NFL', 'src/components/front-office/FrontOfficeBoard.tsx'],
  ['NBA Front Office', 'FO_BOARD_NBA', 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx'],
  ['MLB Front Office', 'FO_BOARD_MLB', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx'],
  ['NHL Front Office', 'FO_BOARD_NHL', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx'],
];
const RELOAD_ROWS = 5;
/* Section 2's rows, by the start of their names, and the rows each ledger
   control is written to break (must) or may break alongside. Everything not
   listed must stay green. */
const LEDGER_ROWS = [
  ['title', 'a title season adds exactly one row'],
  ['plain', 'a season without a title adds exactly one row too'],
  ['older', 'an older save adds one row and nothing retroactive'],
  ['replay', 'replaying a closed title adds nothing'],
  ['two', 'every closed season adds its own row'],
  ['pick', 'the projection is the pick\'s'],
  ['cut', 'a man cut before the close still counts'],
  ['engine', 'the row is the season the engine played'],
];
const BREAKS = {
  late: { must: ['title', 'pick'], may: ['plain', 'two', 'older'] },
  offseason: { must: ['two', 'cut'], may: [] },
  noreset: { must: ['two'], may: [] },
  double: { must: ['title', 'older', 'replay', 'two', 'pick'], may: ['cut'] },
  raw: { must: ['pick'], may: ['plain', 'title', 'older', 'two', 'cut'] },
  nokeep: { must: ['cut'], may: [] },
  /* One board only: the others are the real boards and must stay green. */
  otlosses: { board: 'NHL Front Office', must: ['engine'], may: [] },
};
/* What a control demands of one board: its own rows on the board it
   rewrote, nothing at all on a board it left alone. */
const breaksFor = (control, board) => {
  const b = BREAKS[control];
  if (b.board && b.board !== board) return { must: [], may: [] };
  return b;
};

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
/* The boards are CRLF in a Windows working copy; anchors are written LF. */
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const times = (src, anchor) => src.split(anchor).length - 1;

const NEW_RESTORE =
  "      if (s.fired) setPhase('fired');\n" +
  "      else if (s.phase !== 'recap') setPhase(s.phase);\n" +
  "      else if (s.postseason) setPhase('recap');\n" +
  '      else openDraft(s.league, s.myTeam, s);\n';
const OLD_RESTORE = "      setPhase(s.fired ? 'fired' : s.phase === 'recap' ? 'hub' : s.phase);\n";
const GUARD = '    if (league.champions.some(c => c.season === league.season)) return;\n';
const STORED = 'appendSeason(ledger, result, expectationOf(expect, lg.season) ?? projectFor(league, myTeam))';
const AT_WHISTLE = 'appendSeason(ledger, result, projectFor(lg, myTeam))';
/* The offseason's reset of the closed row, one anchor per board shape. */
const RESETS = [
  ["      setChampion('');\n      setClosedRow(null);\n      setPressTilt(0);\n", "      setChampion('');\n      setPressTilt(0);\n"],
  ["      setSeries([]); setChampion(''); setClosedRow(null);\n", "      setSeries([]); setChampion('');\n"],
];

/* The close's projection of the next season, and the offseason's persist
   that the second version of this round projected in instead. */
const AT_CLOSE = '      const nextExpect = projectNextFor(lg, myTeam);\n      setExpect(nextExpect);\n';
const CLOSE_SAVE = ', ledger: closed.ledger, expect: nextExpect }, lg, myTeam);';
const OFFSEASON_SAVE = 'postseason: null }, lg, myTeam);';
/* Round 674, m647-3: the NHL close's games played without its overtime losses. */
const NHL_GAMES = 'games: mine.wins + mine.losses + mine.otLosses }';
const NHL_GAMES_SHORT = 'games: mine.wins + mine.losses }';

/* Each board rewrite: [anchor, replacement] pairs, every anchor exactly once. */
const boardRewrite = (control, src) => {
  if (control === 'replay') return [[NEW_RESTORE, OLD_RESTORE], [GUARD, '']];
  if (control === 'late') return [[STORED, AT_WHISTLE]];
  if (control === 'offseason') {
    return [[AT_CLOSE, ''], [CLOSE_SAVE, ', ledger: closed.ledger }, lg, myTeam);'],
      [OFFSEASON_SAVE, 'postseason: null, expect: projectFor(lg, myTeam) }, lg, myTeam);\n      setExpect(projectFor(lg, myTeam));']];
  }
  if (control === 'otlosses') return [[NHL_GAMES, NHL_GAMES_SHORT]];
  const reset = RESETS.find(([a]) => times(src, a) === 1);
  return reset ? [reset] : [[RESETS[0][0], RESETS[0][1]]];
};

let env = {};
/* Round 674 (R2.D10): one folder per run, never dist. */
const scratch = CONTROL ? controlScratch(ROOT, 'gm-control') : null;
const dir = scratch?.dir;
/* The load line every copy this run writes must print. */
const expectedLoads = [];
const writeCopy = (copy, text, what) => {
  fs.writeFileSync(copy, withLoadedLine(text, scratch.tag, what));
  expectedLoads.push(loadedLine(scratch.tag, what));
};
if (BOARD_CONTROLS.includes(CONTROL) || ONE_BOARD_CONTROLS.includes(CONTROL)) {
  const only = BREAKS[CONTROL]?.board;
  for (const [name, key, file] of BOARDS) {
    if (only && name !== only) continue;
    const src = read(file);
    const code = stripComments(src);
    let regressed = src;
    for (const [anchor, repl] of boardRewrite(CONTROL, src)) {
      const n = times(regressed, anchor);
      if (n !== 1) abort(`control cannot run: ${file} holds the anchor it rewrites ${n} times, not exactly once: ${anchor.trim().slice(0, 70)}`);
      if (times(code, anchor) !== 1) abort(`control cannot run: the anchor in ${file} is not in its code exactly once (comments stripped): ${anchor.trim().slice(0, 70)}`);
      regressed = regressed.replace(anchor, repl);
      if (times(regressed, anchor) !== 0) abort(`control cannot run: the rewrite of ${file} left its anchor in place`);
    }
    if (regressed === src) abort(`control cannot run: the rewrite of ${file} changed nothing`);
    const copy = path.join(dir, `${path.basename(file, '.tsx')}.${CONTROL}.control.tsx`);
    writeCopy(copy, regressed, `${CONTROL} ${path.basename(file)}`);
    env[key] = copy.replaceAll('\\', '/');
    const words = { replay: 'maps a recap save back to the hub and has no closed season guard', late: 'projects the season at the whistle instead of reading the projection the save carries', offseason: 'projects the next season after the offseason instead of at the close', noreset: 'never resets the closed row between seasons', otlosses: 'counts wins and losses but not overtime losses as games played' }[CONTROL];
    console.log(`NEGATIVE CONTROL ON: ${name} renders a copy that ${words}`);
  }
} else if (FORMATS_CONTROLS.includes(CONTROL)) {
  const file = 'src/lib/seasonFormats.ts';
  const src = read(file);
  const anchor = '  if (!mine || !cut.size) return;\n';
  if (times(src, anchor) !== 1) abort(`control cannot run: ${file} holds the anchor it rewrites ${times(src, anchor)} times, not exactly once`);
  if (times(stripComments(src), anchor) !== 1) abort(`control cannot run: the anchor in ${file} is not in its code exactly once (comments stripped)`);
  const regressed = src.replace(anchor, '  if (!mine || !cut.size || cut.size > 0) return;\n');
  if (regressed === src) abort(`control cannot run: the rewrite of ${file} changed nothing`);
  const copy = path.join(dir, 'seasonFormats.nokeep.control.ts');
  writeCopy(copy, regressed, 'nokeep seasonFormats.ts');
  env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/seasonFormats': copy.replaceAll('\\', '/') });
  console.log('NEGATIVE CONTROL ON: all four boards and the test read season shapes whose untouched offseason does not count the men a GM cut');
} else if (CONTROL) {
  let copy;
  try { copy = writeLedgerControl(ROOT, CONTROL, dir); } catch (e) { abort(e.message); }
  writeCopy(copy, fs.readFileSync(copy, 'utf8'), `${CONTROL} seasonLedger.ts`);
  env.SEASON_LEDGER_MODULE = copy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON: all four boards and the test read a season ledger that ${LEDGER_CONTROL_WORDS[CONTROL]}`);
}

let r;
try {
  /* A worktree inside the repo has no node_modules of its own: walk up. */
  let vitest = null;
  for (let d = ROOT; !vitest; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'node_modules', 'vitest', 'vitest.mjs'))) vitest = path.join(d, 'node_modules', 'vitest', 'vitest.mjs');
    else if (path.dirname(d) === d) abort('vitest is not installed anywhere above this tree');
  }
  r = spawnSync(process.execPath, [vitest, 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
      timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
} finally {
  scratch?.cleanup();
}
if (r.error) abort(`vitest could not be run: ${r.error.message}`);
if (r.signal) abort(`vitest was killed with ${r.signal}, so the tests did not finish`);
const out = (r.stdout || '') + (r.stderr || '');
if (!out.includes('FrontOfficeSeasonClose.test.tsx')) abort('vitest did not report on the board test at all, so nothing was checked:\n' + out.slice(-1500));
const summary = out.match(/Tests\s+(.+)/);
const loadError = /Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed/.test(out);
if (CONTROL && loadError) abort('control cannot run: a rewritten file did not load, so any red is a load error and not the check:\n' + out.slice(-1500));
if (CONTROL) {
  const missing = expectedLoads.filter(l => !out.includes(l));
  if (missing.length) abort(`control cannot run: ${missing.length} of ${expectedLoads.length} control copies never printed their load line, so the test did not run on them:\n  ${missing.join('\n  ')}`);
  console.log(`every control copy printed its load line (${expectedLoads.length}, run ${scratch.tag})`);
}
const lines = out.split('\n');
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const count = (mark, name, describe, row = '') =>
  lines.filter(l => new RegExp(`${mark}.*${escape(name)}: ${describe} > ${escape(row)}`).test(l)).length;

/* Under a ledger or board control: rows it was written to break that stayed
   green (the control did not fire there) and rows outside its lists that went
   red (the control is not specific). Either one means the check is not proven. */
const dead = [];
const leaks = [];

console.log('1) The four boards, rendered: a reload on the recap draws the recap again and never replays the season');
console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
let reloadFired = 0;
for (const [name] of BOARDS) {
  const repro = lines.map(l => l.trim()).find(l => l.startsWith(`${name}: after finishing the season and reloading`));
  const redRows = count('×', name, 'the season closes once');
  const greenRows = count('✓', name, 'the season closes once');
  console.log(`   ${name}: ${greenRows} green, ${redRows} red. ${repro ?? 'no REPRO line printed'}`);
  if (CONTROL === 'replay') {
    /* On the pre-fix copy every row legitimately fails, so "something passed"
       cannot prove the copy loaded. The proof is the REPRO line, which only
       the running board can print, showing the hub and a second closed
       season, plus the reload row red on an assertion rather than a load
       error. */
    const recapRed = new RegExp(`×.*${escape(name)}.*draws the recap again`).test(out);
    const replayed = !!repro && /hub shown=true/.test(repro) && /seasonsPlayed 1 -> 2/.test(repro);
    if (loadError || !repro) abort(`control cannot run: the rewritten ${name} board did not load, so any red is a load error and not the check:\n` + out.slice(-1500));
    if (recapRed && replayed) { reloadFired += 1; console.log(`   fired: on the pre-fix ${name} board a reload on the recap re-arms the final week and the season is played twice`); }
  } else if (CONTROL) {
    if (greenRows !== RELOAD_ROWS || redRows !== 0) leaks.push(`${name}: section 1 went ${redRows} red under the control`);
  } else {
    if (!repro || !/hub shown=false/.test(repro) || !/seasonsPlayed 1 -> 1/.test(repro)) fail(`${name}: the REPRO row did not show a reload that keeps the recap and the season count: ${repro ?? 'no line'}`);
    if (greenRows !== RELOAD_ROWS || redRows !== 0) fail(`${name}: expected ${RELOAD_ROWS} green rows and 0 red, got ${greenRows} green and ${redRows} red`);
  }
}

console.log('2) The season ledger on the four boards: one row per closed season, scored against the pick\'s projection, recorded once, the career is the sum, and the row is the season the engine played');
for (const l of lines.map(x => x.trim()).filter(x => x.startsWith('FO_ENGINE_ROW '))) console.log(`   ${l.slice('FO_ENGINE_ROW '.length)}`);
let ledgerFired = 0;
let ledgerTargets = 0;
for (const [name] of BOARDS) {
  const state = LEDGER_ROWS.map(([key, row]) => {
    const green = count('✓', name, 'the season ledger', row);
    const red = count('×', name, 'the season ledger', row);
    return { key, row, state: green === 1 && red === 0 ? 'green' : red === 1 && green === 0 ? 'red' : 'missing' };
  });
  console.log(`   ${name}: ${state.map(s => `${s.key} ${s.state}`).join(', ')}`);
  if (CONTROL === 'replay') continue;
  if (!CONTROL) {
    for (const s of state) if (s.state !== 'green') fail(`${name}: the ledger row "${s.row}" is ${s.state}`);
    continue;
  }
  const { must, may } = breaksFor(CONTROL, name);
  if (must.length) ledgerTargets += 1;
  let all = true;
  for (const s of state) {
    if (s.state === 'missing') abort(`control cannot run: ${name}'s row "${s.row}" did not run at all`);
    if (must.includes(s.key) && s.state !== 'red') { all = false; dead.push(`${name}: "${s.row}" stayed green`); }
    if (!must.includes(s.key) && !may.includes(s.key) && s.state === 'red') leaks.push(`${name}: "${s.row}" went red`);
  }
  if (must.length && all) ledgerFired += 1;
}

if (!CONTROL) {
  const expectedRows = BOARDS.length * (RELOAD_ROWS + LEDGER_ROWS.length);
  const line = summary ? summary[1].trim() : '';
  if (r.status !== 0 || !new RegExp(`^${expectedRows} passed`).test(line) || /failed/.test(line)) {
    const red = lines.filter(l => /×|FAIL|AssertionError|expected|Unable to find/.test(l)).slice(0, 12);
    fail(`the board test is not ${expectedRows} of ${expectedRows} green (summary "${line || 'none'}"):\n    ` + red.join('\n    '));
  }
}

console.log('');
if (CONTROL === 'replay') {
  if (reloadFired === BOARDS.length) { console.log(`control "replay": fired as expected on all four boards, the check works`); process.exit(0); }
  abort(`control "replay": fired on ${reloadFired} of ${BOARDS.length} boards, the check is dead on the rest`);
}
if (CONTROL) {
  if (leaks.length) abort(`control "${CONTROL}" is not specific, it turned rows red that it was not written to break:\n  ${leaks.join('\n  ')}`);
  const where = BREAKS[CONTROL].board ? `on the ${BREAKS[CONTROL].board} board, every row of the other three boards green,` : 'on all four boards';
  if (ledgerTargets > 0 && ledgerFired === ledgerTargets) { console.log(`control "${CONTROL}": ${BREAKS[CONTROL].must.join(', ')} went red ${where} and nothing outside its list did, the check works`); process.exit(0); }
  abort(`control "${CONTROL}": fired on ${ledgerFired} of ${ledgerTargets} boards it targets, the check is dead on the rest:\n  ${dead.join('\n  ')}`);
}
if (failures > 0) { console.error(`simGmReload: ${failures} failure(s)`); process.exit(1); }
console.log('simGmReload: all green. Four front offices keep a finished season through a reload, none of them can play a closed one again, and every closed season is one ledger row, scored against the pick\'s projection, recorded once, and holding the season the engine played.');
