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
   season scored on that season alone, and record that row once.

   Sections, both from src/components/front-office-shared/
   FrontOfficeSeasonClose.test.tsx under vitest in ONE run, every row read by
   name:
     1) the season closes once: five rows per board. Each builds a save at the
        final week from the real engine, plays the final week on the real
        board, remounts, and reads the save. The REPRO row of each board
        prints what a reload let the player do, echoed here as the measured
        evidence.
     2) the season ledger: five rows per board. A title season (on an older
        save with two titles and no ledger) adds exactly one row and records
        it once, with no retroactive points; a season without a title adds
        exactly one row and records it once; replaying a closed title adds
        nothing (a reload records nothing, the final week refuses, the module
        refuses a second row); two seasons add two rows and two finishes and
        the career is their sum; and the same results score the same for
        every team in the league.

   Negative controls (house rule: prove the check can fail, and fail only
   where it was written to):
     GM_RELOAD_CONTROL=replay rewrites copies of all four boards with the
       recap restore put back to its pre-fix line and the closed season guard
       removed, points the test at them through FO_BOARD_NFL, FO_BOARD_NBA,
       FO_BOARD_MLB and FO_BOARD_NHL, and requires every board's "draws the
       recap again" row to go red on an assertion with its REPRO line showing
       the hub and a second closed season. Section 2 is printed and not
       judged under it: the pre-fix board replays a closed title, so the
       ledger's replay row legitimately goes red too.
     GM_RELOAD_CONTROL=double points every board and the test at a copy of
       the ledger that pushes a title season's row twice and no longer
       refuses a season already there (scripts/lib/seasonLedgerControl.mjs).
       On every board exactly the title, replay and two season rows must go
       red, and every other row in both sections must stay green.
     GM_RELOAD_CONTROL=pick points them at a copy whose score adds a term read
       from the team's own name. On every board exactly the pick row must go
       red, and every other row in both sections must stay green.
     Every control refuses to run if its rewrite changed nothing, and a copy
     that fails to load is reported as a broken control, not as the check
     firing.

   Nothing here reads the clock. The control copies go in dist/.gm-control,
   which is removed afterwards.

   Run: node scripts/simGmReload.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEDGER_CONTROLS, writeLedgerControl } from './lib/seasonLedgerControl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GM_RELOAD_CONTROL || '';
const CONTROLS = ['replay', ...LEDGER_CONTROLS];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`GM_RELOAD_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }

const TEST = 'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx';
const BOARDS = [
  ['NFL Front Office', 'FO_BOARD_NFL', 'src/components/front-office/FrontOfficeBoard.tsx'],
  ['NBA Front Office', 'FO_BOARD_NBA', 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx'],
  ['MLB Front Office', 'FO_BOARD_MLB', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx'],
  ['NHL Front Office', 'FO_BOARD_NHL', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx'],
];
const RELOAD_ROWS = 5;
/* Section 2's rows, by the start of their names, and the rows each ledger
   control is written to break. Everything not listed must stay green. */
const LEDGER_ROWS = [
  ['title', 'a title season adds exactly one row'],
  ['plain', 'a season without a title adds exactly one row too'],
  ['replay', 'replaying a closed title adds nothing'],
  ['two', 'every closed season adds its own row'],
  ['pick', 'the pick of team changes nothing'],
];
const BREAKS = { double: ['title', 'replay', 'two'], pick: ['pick'] };

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
/* The boards are CRLF in a Windows working copy; anchors are written LF. */
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');

const NEW_RESTORE =
  "      if (s.fired) setPhase('fired');\n" +
  "      else if (s.phase !== 'recap') setPhase(s.phase);\n" +
  "      else if (s.postseason) setPhase('recap');\n" +
  '      else openDraft(s.league, s.myTeam, s);\n';
const OLD_RESTORE = "      setPhase(s.fired ? 'fired' : s.phase === 'recap' ? 'hub' : s.phase);\n";
const GUARD = '    if (league.champions.some(c => c.season === league.season)) return;\n';

let env = {};
const dir = path.join(ROOT, 'dist', '.gm-control');
const hadDist = fs.existsSync(path.join(ROOT, 'dist'));
if (CONTROL === 'replay') {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, key, file] of BOARDS) {
    const src = read(file);
    if (!src.includes(NEW_RESTORE) || !src.includes(GUARD)) abort(`control cannot run: ${file} is not in the shape this control rewrites (the four line restore and the champions guard must both be there)`);
    const regressed = src.replace(NEW_RESTORE, OLD_RESTORE).replace(GUARD, '');
    if (regressed === src || regressed.includes(GUARD) || !regressed.includes(OLD_RESTORE)) abort(`control cannot run: the rewrite of ${file} changed nothing`);
    const copy = path.join(dir, `${path.basename(file, '.tsx')}.control.tsx`);
    fs.writeFileSync(copy, regressed);
    env[key] = copy.replaceAll('\\', '/');
    console.log(`NEGATIVE CONTROL ON: ${name} renders a copy that maps a recap save back to the hub and has no closed season guard`);
  }
} else if (CONTROL) {
  let copy;
  try { copy = writeLedgerControl(ROOT, CONTROL, dir); } catch (e) { abort(e.message); }
  env.SEASON_LEDGER_MODULE = copy.replaceAll('\\', '/');
  console.log(`NEGATIVE CONTROL ON: all four boards and the test read a season ledger that ${CONTROL === 'double' ? 'pushes a title season twice and refuses nothing' : 'scores the pick of team'}`);
}

let r;
try {
  r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
      timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
} finally {
  if (CONTROL) {
    fs.rmSync(dir, { recursive: true, force: true });
    if (!hadDist) fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
  }
}
if (r.error) abort(`vitest could not be run: ${r.error.message}`);
if (r.signal) abort(`vitest was killed with ${r.signal}, so the tests did not finish`);
const out = (r.stdout || '') + (r.stderr || '');
if (!out.includes('FrontOfficeSeasonClose.test.tsx')) abort('vitest did not report on the board test at all, so nothing was checked:\n' + out.slice(-1500));
const summary = out.match(/Tests\s+(.+)/);
const loadError = /Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed/.test(out);
if (CONTROL && loadError) abort('control cannot run: a rewritten file did not load, so any red is a load error and not the check:\n' + out.slice(-1500));
const lines = out.split('\n');
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const count = (mark, name, describe, row = '') =>
  lines.filter(l => new RegExp(`${mark}.*${escape(name)}: ${describe} > ${escape(row)}`).test(l)).length;

/* Under a ledger control: rows it was written to break that stayed green
   (the control did not fire there) and rows outside its list that went red
   (the control is not specific). Either one means the check is not proven. */
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
    if (greenRows !== RELOAD_ROWS || redRows !== 0) leaks.push(`${name}: section 1 went ${redRows} red under a ledger control`);
  } else {
    if (!repro || !/hub shown=false/.test(repro) || !/seasonsPlayed 1 -> 1/.test(repro)) fail(`${name}: the REPRO row did not show a reload that keeps the recap and the season count: ${repro ?? 'no line'}`);
    if (greenRows !== RELOAD_ROWS || redRows !== 0) fail(`${name}: expected ${RELOAD_ROWS} green rows and 0 red, got ${greenRows} green and ${redRows} red`);
  }
}

console.log('2) The season ledger on the four boards: one row per closed season, recorded once, the career is the sum, the pick scores nothing');
let ledgerFired = 0;
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
  const expected = BREAKS[CONTROL];
  let all = true;
  for (const s of state) {
    if (s.state === 'missing') abort(`control cannot run: ${name}'s row "${s.row}" did not run at all`);
    if (expected.includes(s.key) && s.state !== 'red') { all = false; dead.push(`${name}: "${s.row}" stayed green`); }
    if (!expected.includes(s.key) && s.state === 'red') leaks.push(`${name}: "${s.row}" went red`);
  }
  if (all) ledgerFired += 1;
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
  if (ledgerFired === BOARDS.length) { console.log(`control "${CONTROL}": exactly ${BREAKS[CONTROL].join(', ')} went red on all four boards and nothing else did, the check works`); process.exit(0); }
  abort(`control "${CONTROL}": fired on ${ledgerFired} of ${BOARDS.length} boards, the check is dead on the rest:\n  ${dead.join('\n  ')}`);
}
if (failures > 0) { console.error(`simGmReload: ${failures} failure(s)`); process.exit(1); }
console.log('simGmReload: all green. Four front offices keep a finished season through a reload, none of them can play a closed one again, and every closed season is one ledger row recorded once.');
