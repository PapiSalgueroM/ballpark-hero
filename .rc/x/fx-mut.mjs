/* Fixer control (never committed): prove a new test fails on the fault it was written for.
   Runs on the runner's throwaway checkout: applies ONE named source fault (refusing unless its anchor occurs exactly
   once and the file really changes), runs the named vitest files, puts the file back, and exits 0 only when vitest
   went red WITH failed tests (a crash or a compile error is not a control firing). */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CENTRE = 'src/components/soccer-career/SoccerSeasonCentre.tsx';
const EVENTS = 'src/lib/season/soccerEvents.ts';
const PITCH = 'src/components/season-centre/MiniPitch.tsx';
const TYCOON = 'src/pages/StadiumTycoon.tsx';
const TABLE = 'src/components/club-manager/LeagueTableCard.tsx';
const CUP = 'src/components/club-manager/CupBracketCard.tsx';
const ACADEMY = 'src/components/club-manager/AcademyScreen.tsx';
const FACILITIES = 'src/components/club-manager/FacilitiesScreen.tsx';
const OG = 'src/test/seasonCentreOwnGoals.test.tsx';
const M = {
  /* the page hands the own goal pass the OFFERED moments (none on a replay) instead of the planned ones */
  m1: [CENTRE, 'soccerOwnGoals(decided, planned)', 'soccerOwnGoals(decided, offered)', [OG]],
  /* the words credit the wrong club */
  m2: [CENTRE, "(O.G), goal for ${e.side === 'us' ? us : them}", "(O.G), goal for ${e.side === 'us' ? them : us}", [OG]],
  /* the page stops applying own goals at all */
  m2b: [CENTRE, 'decided ? soccerOwnGoals(decided, planned) : null', 'decided ? decided : null', [OG]],
  /* the words name the wrong person */
  m2c: [CENTRE, "e.ownGoalBy === 'you' ? 'You' : e.ownGoalBy === 'teammate' ? 'A teammate' : 'An opponent'", "e.ownGoalBy === 'you' ? 'You' : e.ownGoalBy === 'teammate' ? 'An opponent' : 'A teammate'", [OG]],
  /* the latest season dialog reads the wrong club's row */
  m3: [TYCOON, 'const own = snapshot.table[0];', 'const own = snapshot.table[snapshot.table.length - 1];', ['src/test/tycoonLatestSeason.test.tsx']],
  /* the dialog prints wins where points belong */
  m3b: [TYCOON, '{formatSeasonCount(own.pts)}</dd>', '{formatSeasonCount(own.w)}</dd>', ['src/test/tycoonLatestSeason.test.tsx']],
  /* the dialog follows the running league instead of the season it opened on */
  m3c: [TYCOON, 'if (next) setSnapshot({ ...last, table: last.table.map(club => ({ ...club })) });', '', ['src/test/tycoonLatestSeason.test.tsx']],
  /* league table rows never become buttons */
  m4: [TABLE, "const Row = onClubClick ? 'button' : 'div';", "const Row = (onClubClick ? 'div' : 'div') as 'button' | 'div';", ['src/test/clubManagerRowButtons.test.tsx']],
  /* league table rows are buttons even where nothing opens */
  m4b: [TABLE, "const Row = onClubClick ? 'button' : 'div';", "const Row = (onClubClick ? 'button' : 'button') as 'button' | 'div';", ['src/test/clubManagerRowButtons.test.tsx']],
  /* bracket lines never become buttons */
  m5: [CUP, "const Line = onClubClick ? 'button' : 'div';", "const Line = (onClubClick ? 'div' : 'div') as 'button' | 'div';", ['src/test/clubManagerRowButtons.test.tsx']],
  /* the pitch does not ring him for his own goal unless he is a defender */
  p1: [PITCH, "role === 'DEF' || goal.own === 'you' ? 'd0'", "role === 'DEF' ? 'd0'", ['src/test/miniPitchScene.test.ts', OG]],
  /* the pitch says nothing under an own goal */
  p2: [PITCH, "drawn.own ? (drawn.own === 'you'", "!drawn ? (drawn.own === 'you'", [OG]],
  /* the pitch forgets who put it in */
  p3: [PITCH, '...(e.ownGoalBy ? { own: e.ownGoalBy } : {}),', '', ['src/test/miniPitchScene.test.ts']],
  /* the pass answers every question afresh, so a tagged game gets a new events array each time */
  k1: [EVENTS, 'if (kept && kept.guard === guard) return kept.game;', '', [OG]],
  /* the pass hands every game back as a new object */
  k2: [EVENTS, 'const out = game.events.some((e, i) => e !== g.events[i]) ? game : g;', 'const out = game;', [OG]],
  /* the Academy buttons name the position, not the prospect */
  a1: [ACADEMY, 'aria-label={`Sign him: ${p.name}`}', 'aria-label={`Sign him: ${p.position}`}', ['src/test/academyFilters.test.tsx']],
  /* the facility button names itself by an id, not the facility's label */
  f1: [FACILITIES, 'aria-label={`${info.label}: ${cost === null', 'aria-label={`${id}: ${cost === null', ['src/test/facilitiesPreview.test.tsx']],
};
const name = process.argv[2];
if (!M[name]) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to, tests] = M[name];
const before = fs.readFileSync(file, 'utf8');
const hits = before.split(from).length - 1;
if (hits !== 1) { console.error(`CONTROL REFUSED ${name}: anchor occurs ${hits} times in ${file}`); process.exit(2); }
const after = before.replace(from, () => to);
if (after === before) { console.error(`CONTROL REFUSED ${name}: nothing changed`); process.exit(2); }
let out = '';
let status = null;
try {
  fs.writeFileSync(file, after);
  const r = spawnSync('node_modules/.bin/vitest', ['run', ...tests, '--testTimeout=300000', '--hookTimeout=300000'], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
  out = `${r.stdout || ''}\n${r.stderr || ''}`;
  status = r.status;
} finally {
  fs.writeFileSync(file, before);
}
if (fs.readFileSync(file, 'utf8') !== before) { console.error(`CONTROL ${name}: the file was NOT put back`); process.exit(2); }
const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
const failedTests = Number((plain.match(/Tests\s+(\d+) failed/) || [])[1] || 0);
const passedTests = Number((plain.match(/Tests\s+(?:\d+ failed \| )?(\d+) passed/) || [])[1] || 0);
for (const l of plain.split('\n').filter(x => /^\s*(×|FAIL|AssertionError|Error:|.*expected .* to )/.test(x)).slice(0, 14)) console.log('   ' + l.trim().slice(0, 220));
const fired = status !== 0 && failedTests > 0;
console.log(`CONTROL ${name} (${file}): vitest exit ${status}, ${failedTests} tests failed, ${passedTests} passed: ${fired ? 'FIRED' : 'DID NOT FIRE'}`);
process.exit(fired ? 0 : 1);
