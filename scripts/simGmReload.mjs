/* GM reload harness: a finished season survives a reload on all four front
   office boards.

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

   Section:
     1) the four boards, rendered: src/components/front-office-shared/
        FrontOfficeSeasonClose.test.tsx under vitest, five tests per board.
        Each builds a save at the final week from the real engine, plays the
        final week on the real board, remounts, and reads the save. The
        REPRO row of each board prints what a reload let the player do, and
        those four lines are echoed here as the measured evidence.

   Negative control (house rule: prove the check can fail):
     GM_RELOAD_CONTROL=replay rewrites copies of all four boards with the
     recap restore put back to its pre-fix line and the closed season guard
     removed, points the test at them through FO_BOARD_NFL, FO_BOARD_NBA,
     FO_BOARD_MLB and FO_BOARD_NHL, and requires every board's "draws the
     recap again" row to go red on an assertion with its REPRO line showing
     the hub and a second closed season. The control refuses to run if either
     rewrite leaves any board unchanged, and a copy that fails to load is
     reported as a broken control, not as the check firing.

   Nothing here reads dist or the clock, so it is safe between builds.

   Run: node scripts/simGmReload.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GM_RELOAD_CONTROL || '';
if (CONTROL && CONTROL !== 'replay') { console.error(`GM_RELOAD_CONTROL=${CONTROL} is not a control this harness knows (replay)`); process.exit(1); }

const TEST = 'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx';
const BOARDS = [
  ['NFL Front Office', 'FO_BOARD_NFL', 'src/components/front-office/FrontOfficeBoard.tsx'],
  ['NBA Front Office', 'FO_BOARD_NBA', 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx'],
  ['MLB Front Office', 'FO_BOARD_MLB', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx'],
  ['NHL Front Office', 'FO_BOARD_NHL', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx'],
];

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

console.log('1) The four boards, rendered: a reload on the recap draws the recap again and never replays the season');
let env = {};
let dir = null;
if (CONTROL === 'replay') {
  dir = path.join(ROOT, 'dist', '.gm-control');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, key, file] of BOARDS) {
    const src = read(file);
    if (!src.includes(NEW_RESTORE) || !src.includes(GUARD)) abort(`control cannot run: ${file} is not in the shape this control rewrites (the four line restore and the champions guard must both be there)`);
    const regressed = src.replace(NEW_RESTORE, OLD_RESTORE).replace(GUARD, '');
    if (regressed === src || regressed.includes(GUARD) || !regressed.includes(OLD_RESTORE)) abort(`control cannot run: the rewrite of ${file} changed nothing`);
    const copy = path.join(dir, `${path.basename(file, '.tsx')}.control.tsx`);
    fs.writeFileSync(copy, regressed);
    env[key] = copy.replaceAll('\\', '/');
    console.log(`   NEGATIVE CONTROL ON: ${name} renders a copy that maps a recap save back to the hub and has no closed season guard`);
  }
}

let r;
try {
  r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
} finally {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
}
const out = (r.stdout || '') + (r.stderr || '');
if (!out.includes('FrontOfficeSeasonClose.test.tsx')) abort('vitest did not report on the board test at all, so nothing was checked:\n' + out.slice(-1500));
const summary = out.match(/Tests\s+(.+)/);
console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
const loadError = /Failed to (load|resolve)|SyntaxError|Cannot find module/.test(out);
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [name] of BOARDS) {
  const repro = out.split('\n').map(l => l.trim()).find(l => l.startsWith(`${name}: after finishing the season and reloading`));
  const redRows = out.split('\n').filter(l => new RegExp(`×.*${escape(name)}: the season closes once`).test(l)).length;
  const greenRows = out.split('\n').filter(l => new RegExp(`✓.*${escape(name)}: the season closes once`).test(l)).length;
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
    if (recapRed && replayed) fail(`on the pre-fix ${name} board a reload on the recap re-arms the final week and the season is played twice`);
  } else {
    if (!repro || !/hub shown=false/.test(repro) || !/seasonsPlayed 1 -> 1/.test(repro)) fail(`${name}: the REPRO row did not show a reload that keeps the recap and the season count: ${repro ?? 'no line'}`);
    if (greenRows !== 5 || redRows !== 0) fail(`${name}: expected 5 green rows and 0 red, got ${greenRows} green and ${redRows} red`);
  }
}
if (CONTROL !== 'replay') {
  if (r.status !== 0 || !/20 passed/.test(out)) {
    const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected|Unable to find/.test(l)).slice(0, 12);
    fail('the board test is red:\n    ' + lines.join('\n    '));
  }
}

console.log('');
if (CONTROL) {
  if (failures >= BOARDS.length) { console.log(`control "${CONTROL}": ${failures} failure(s) fired as expected on all four boards, the check works`); process.exit(0); }
  abort(`control "${CONTROL}": fired on ${failures} of ${BOARDS.length} boards, the check is dead on the rest`);
}
if (failures > 0) { console.error(`simGmReload: ${failures} failure(s)`); process.exit(1); }
console.log('simGmReload: all green. Four front offices keep a finished season through a reload, and none of them can play a closed one again.');
