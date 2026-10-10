/**
 * Round 900 harness: the four US career boards still do exactly what they did.
 *
 * Round 900 turned NflMyCareerBoard, NbaMyCareerBoard, MlbMyCareerBoard and
 * NhlMyCareerBoard (four copies of one 1,090 line file) into one board plus
 * four bindings, with the rule that nothing a player sees, clicks or has saved
 * may move. scripts/data/usBoardFixture.json was recorded from main's tree
 * BEFORE any board was touched (its header carries the sha), and this harness
 * replays it against the tree it runs in.
 *
 * A) The fixture is whole: four sports, every screen the round names reached
 *    on each path (event card, extension talk, free agency window, rival beat,
 *    rival choice, both confirmations answered no and yes, retirement, the
 *    coach career, a reload, an older-era career), at least 12 seasons, the
 *    six required saves and the five old-shape saves the restore repairs.
 * B) The replay: src/test/usBoardFixture.test.tsx mounts the real boards in
 *    jsdom with the fixture's seeds and clock and presses the same buttons.
 *    After every press the save's bytes and the original screen markup must
 *    hash to what the fixture holds. Round 992 excludes only its additive
 *    practice section and its buttons; that new flow has separate tests. The
 *    fixture itself remains unchanged. Green needs Vitest's real exit code 0, all four
 *    sports passed, and an empty report.
 *
 * Measured when it was written (2026-10-02, this machine): 436, 506, 475 and
 * 442 clicks on the four paths (23 or 24 seasons each) and 1,860 more steps
 * across the ten fixed saves per sport; one replay takes about 160 seconds.
 * After the review that added the five old-shape saves and an older-era
 * second career in every sport (re-recorded from main 4ae96019): 439, 506,
 * 475 and 441 clicks, fifteen fixed saves per sport and 701, 721, 688 and
 * 688 screen steps; the fixture is 1,875,117 bytes.
 * Round 988 re-recorded it from its own tree, on purpose: the four career
 * content packs (Rounds 917 to 920) add draft night texts and a third life
 * deck, which changes which card is drawn. Recorded with and without deck C
 * on the same tree, the four paths are byte identical up to the first card
 * drawn with deck C in the deck (NFL step 12, NBA 51, MLB 11, NHL 14) and
 * differ from there; the fixed saves are cut from the path after that. Now
 * 451, 523, 449 and 415 clicks; the fixture is 1,864,777 bytes.
 * That isolates deck C only. Against main's fixture the packs move the paths
 * earlier (measured by the review, main's fixture against the same tree
 * recorded without deck C): the first save difference is step 9 in all four
 * sports (the new draft night texts land in the phone inbox); before the
 * clicks part, MLB and NHL also differ in the rivalry fields the new beats
 * move (pendingRivalryEvent, rivalryIntensity, lastRivalryEventId, morale,
 * fanbase) and the NHL in three seasons' results and headlines; the clicks
 * part at NFL 19, NBA 15, MLB 20 and NHL 37. So from step 9 on this fixture
 * proves the board replays the content packs' own recording, not the four
 * old boards. That parity was proven on main's fixture, and Round 988
 * touches no board or binding file.
 * Re-recorded again on 2026-10-05, after the review fix made the NFL and NHL
 * deck C buttons read the save. Against the fixture before it, the save
 * after every press is byte identical in all four sports, NBA and MLB are
 * identical throughout, and the only changes are deck C buttons that lost a
 * stat already at its limit: the NFL in 4 screens and 1 button label
 * ("Health +5, morale +3" became "Morale +3"), the NHL in 3 screens and 1
 * label ("Morale up" became "No change"). Recorded twice on the merged
 * tree (origin/main 211da297), byte for byte the same; 1,864,921 bytes.
 * Round 1039 re-recorded it on purpose, with the Round 988 method. The
 * replay mounts every binding with no Hall bound (hall: undefined), so no
 * retirement talk is asked and the retirement screen is the old one; the
 * retire button writes nothing new there either. Recorded on one tree (head
 * 69a106fa) with and without the life B deck change (the four decks at
 * 27f37b71: the retirement and farewell answers, the jersey record and the
 * NHL walk away): WITHOUT it the recording equals the 1038 fixture byte for
 * byte, header aside, in all four sports, so the board and the summer
 * filter are invisible with no Hall bound. WITH it the four click paths and
 * every save stay identical; the only change is one screen of markup in two
 * sports, the healthy walk away card (lifeB_retireHealthy and
 * mlbB_retireHealthy) showing its first answer's new effect, "Next season is
 * your last" where it said "Leave whole": NFL fixed save "mid" step 53 and
 * MLB fixed save "suspended" step 41. NBA and NHL do not move at all: their
 * recorded careers never draw a reconciled card. Still 1,864,921 bytes.
 * Release AL (2026-10-07) re-recorded it on purpose for Codex Round 1085,
 * grouped thousands, which changes what the boards print and nothing they
 * do. Proof first: the release tree at 35caba22 with four files taken back
 * from main 5b70b05f (src/lib/usCareerStatLine.ts and
 * src/components/us-career/UsCareerBoard.tsx, which carry 1085's change, and
 * src/lib/nbaMyCareer.ts and src/lib/nhlMyCareer.ts, which carry the
 * release's own follow up) replayed the 1039 fixture green in all four
 * sports. Then recorded from the release tree at 198e730d. Against the
 * 1039 fixture 1,130 fields differ and every one is a screen: 1,021 markup
 * hashes (NFL 334, NBA 241, MLB 214, NHL 232), 98 text excerpts and 11
 * Career Log labels, the last two in the NFL only. Zero save hashes, save
 * fields, click paths, lengths, coverage, fixed saves or first paint
 * hashes moved. The words are season lines of a thousand or more ("71 rec,
 * 1006 yds, 7 TD" is now "1,006 yds"); the markup is the hub's Career so
 * far line going from 10px to 12px text in every sport, plus the NBA and
 * NHL retirement cards, where the release grouped the totals 1085 left
 * bare (games in the NBA line, all four numbers in the NHL one): 12 screens
 * each. 1,864,932 bytes.
 * Round 1104 (NFL truth and the one bank) re-recorded it on its own branch
 * at e9d10a10, and that recording shipped with Release AP.
 * Round 1103 (the NBA numbers) re-recorded it on purpose on 2026-10-09, on
 * a GitHub runner, from its branch merged with Release AP (head 5320efca).
 * Against Release AP's fixture the NFL, the MLB and the NHL are byte for
 * byte the same: the path, the fifteen fixed saves and every screen. Only
 * the NBA moved, at the two places the round names. The first step that
 * differs is 12, the hub's Trophy Case before a game is played: the save
 * is the same and the screen reads "Badges 0 of 23" where it read "0 of
 * 21" (the two All-Star badges). The first save that differs is step 20,
 * the first season played, which is the new stat line: the second unit
 * rookie's "13 ppg, 3.6 rpg, 2.3 apg" is "6.9 ppg, 1.5 rpg, 1.0 apg", and
 * the line takes its own draws from the seeded stream, so the career goes
 * its own way from there (540 clicks where there were 523, still 24
 * seasons and 705 screen steps; 14 of the 15 fixed saves, all but
 * "rookie", which is cut before the first season). 1,881,710 bytes.
 * Round 1112 (the NBA rival on the player's line) re-recorded it on purpose
 * on 2026-10-09, on a GitHub runner, from its branch merged with Release AR
 * (head 70cb5722). Against Round 1103's fixture the MLB is byte for byte
 * the same. The NFL and the NHL keep every click and every save (the path
 * and the fifteen fixed saves each): what moved is the one sentence the
 * four sports share, a near tie now naming who leads the head to head. That
 * is one screen in the NFL (path step 345, the 2011 season card) and
 * fifteen in the NHL (path step 57, the 2034 season card, and 14 steps over
 * the fixed saves). The NBA moved at the place the round names. Step 20,
 * the first season played, is the first save that differs, and c.rival is
 * the only field in it: his line is the new one. Up to step 106 nothing
 * else on the save differs. At step 107 (the 2031 season) the rivalry roll
 * deals a different beat, because the All-Star beat is now dealt only when
 * one of the two made the roster, and at 109 that beat moves the fanbase;
 * the clicks part at step 122 and the career goes its own way (507 clicks
 * where there were 540, still 24 seasons and 705 screen steps, 10 rival
 * beats and 6 rival choices where there were 13 and 4; 14 of the 15 fixed
 * saves, all but "rookie"). The player's own stream did not move: scripts/
 * simNbaAwardsSense.mjs section P proves that on a fleet that answers no
 * card. 1,872,641 bytes.
 * same (cmp exit 0), which is what makes a red replay mean something. There is no
 * band here on purpose: the check is byte equality, and a path either
 * replays or it does not.
 *
 * Controls, one per run (each is a full replay, about three minutes):
 *   US_BOARD_PARITY_CONTROL=label    one label changed in a copy of the shared
 *                                    board: all four sports go red on the words
 *   US_BOARD_PARITY_CONTROL=draw     one extra Math.random() before the camp
 *                                    battle in the shared board: all four go
 *                                    red on the save
 *   US_BOARD_PARITY_CONTROL=binding  one word changed in a copy of the NHL
 *                                    binding: the NHL goes red on the words and
 *                                    the other three stay green
 *   US_BOARD_PARITY_CONTROL=restore  the pre Round 182 role repair deleted from
 *                                    a copy of the shared board: all four go
 *                                    red on the old shape save "noRole" (the
 *                                    saves a board just wrote all carry a role,
 *                                    so before the old shapes were added this
 *                                    left the replay green)
 *   US_BOARD_PARITY_CONTROL=era      the NFL binding stops passing the era to
 *                                    its engine: the NFL goes red on the save
 *                                    of its second career (always an older era
 *                                    one), the other three stay green
 *   US_BOARD_PARITY_CONTROL=fixture  one save hash changed in a copy of the
 *                                    fixture: that sport goes red (no source
 *                                    is touched, so this is the replay's own
 *                                    comparison being proved)
 *
 * Nothing here reaches the network. Run: node scripts/simUsBoardParity.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { US_CAREER_BOARD, usCareerSport, wrapperProblems } from './lib/usCareerFiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/usBoardFixture.test.tsx';
const FIXTURE = path.join(ROOT, 'scripts/data/usBoardFixture.json');
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const CONTROL = process.env.US_BOARD_PARITY_CONTROL || '';
/* Resolved the way node resolves it, so a worktree that borrows the main tree's node_modules works too. */
const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usboard-'));
const litter = [];
process.on('exit', () => {
  for (const f of litter) { try { fs.rmSync(f, { force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

/* The source controls. Each changes one thing in a copy of one file and
   points the replay at the copy. `red` is which sports that file draws: the
   shared board draws every sport whose wrapper hands it a binding (read off
   the four wrappers, so this stays true if a board ever leaves the shared
   one), and a binding draws only its own. */
const BOARD = US_CAREER_BOARD;
const onSharedBoard = SPORTS.filter(slug => wrapperProblems(ROOT, usCareerSport(slug)).length === 0);
const SOURCE_CONTROLS = {
  label: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: '>Create your player</p>',
    to: '>Create your athlete</p>',
    red: onSharedBoard,
    says: 'the screen reads',
  },
  draw: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: 'const campNote = sport.campBattle(c, teamQuality, Math.random);',
    to: 'Math.random(); const campNote = sport.campBattle(c, teamQuality, Math.random);',
    red: onSharedBoard,
    says: 'the save differs',
  },
  binding: {
    file: usCareerSport('nhl').binding,
    alias: '@/lib/nhlCareerSport',
    from: "'⭐ Top of the lineup'",
    to: "'⭐ Top line'",
    red: ['nhl'],
    says: 'the screen reads',
  },
  /* The restore's first repair dropped from the shared board: only the old
     shape save with no role can see it, so this is what proves those saves
     are in the fixture and replayed. */
  restore: {
    file: BOARD,
    alias: '@/components/us-career/UsCareerBoard',
    from: "if (!s.c.role) s.c.role = 'starter';",
    to: '',
    red: onSharedBoard,
    says: 'save "noRole"',
  },
  /* The NFL binding stops handing the era to its engine: only an older-era
     career can see it, so this proves the path starts one in the NFL. */
  era: {
    file: usCareerSport('nfl').binding,
    alias: '@/lib/nflCareerSport',
    from: "rng, appearance, eraId as 'now' | 'y2005', entry)",
    to: 'rng, appearance, undefined, entry)',
    red: ['nfl'],
    says: 'the save differs',
  },
};

function replay(env) {
  const out = path.join(tmp, `report-${Date.now()}.json`);
  const report = path.join(tmp, `problems-${Date.now()}.txt`);
  fs.writeFileSync(report, '');
  const r = spawnSync(
    process.execPath,
    [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...env, US_BOARD_FIXTURE: 'replay', US_BOARD_FIXTURE_REPORT: report, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
    },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) return { exit: r.status, passed: [], failed: SPORTS, problems: ['Vitest wrote no report: ' + text.slice(-800)] };
  const rows = (JSON.parse(fs.readFileSync(out, 'utf8')).testResults || []).flatMap(f => f.assertionResults || []);
  const titled = status => rows.filter(a => a.status === status).map(a => a.title);
  return { exit: r.status, passed: titled('passed'), failed: titled('failed'), problems: read(report).split('\n').filter(Boolean) };
}

/* The first few problems of each sport, so one sport's long list cannot hide another's. */
const firstPerSport = (problems, n) => SPORTS.flatMap(slug => problems.filter(p => p.startsWith(slug + ' ')).slice(0, n))
  .concat(problems.filter(p => !SPORTS.some(slug => p.startsWith(slug + ' '))).slice(0, n));

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const same = (a, b) => [...a].sort().join(',') === [...b].sort().join(',');

if (CONTROL) {
  let r;
  let red;
  let says;
  if (CONTROL === 'fixture') {
    const src = read(FIXTURE);
    const fx = JSON.parse(src);
    const victim = fx.sports.mlb.path[40];
    if (!victim?.s) { console.error('control fixture: the fixture has no step 40 on the MLB path, so this control would prove nothing'); process.exit(1); }
    victim.s = '000000000000';
    const copy = path.join(tmp, 'fixture.json');
    fs.writeFileSync(copy, JSON.stringify(fx));
    r = replay({ US_BOARD_FIXTURE_IN: copy });
    red = ['mlb'];
    says = 'mlb click path step 40';
  } else {
    const c = SOURCE_CONTROLS[CONTROL];
    if (!c) { console.error(`unknown control "${CONTROL}": use label, draw, binding, restore, era or fixture`); process.exit(1); }
    const src = read(path.join(ROOT, c.file));
    if (!c.red.length) { console.error(`control ${CONTROL}: no sport is drawn by ${c.file}, so this control would prove nothing`); process.exit(1); }
    if (src.split(c.from).length !== 2) { console.error(`control ${CONTROL}: ${c.file} does not carry exactly one "${c.from.trim()}", so this control would change nothing and prove nothing`); process.exit(1); }
    const copy = path.join(ROOT, 'src/test', `__control_usBoard_${CONTROL}${path.extname(c.file)}`);
    litter.push(copy);
    fs.writeFileSync(copy, src.replace(c.from, c.to));
    r = replay({ US_BOARD_CONTROL_ALIAS: c.alias, US_BOARD_CONTROL_FILE: copy });
    red = c.red;
    says = c.says;
  }
  console.log(`control ${CONTROL}: Vitest exit ${r.exit}, passed [${r.passed.join(', ')}], failed [${r.failed.join(', ')}]`);
  for (const p of firstPerSport(r.problems, 2)) console.log('   ' + p.slice(0, 300));
  if (r.exit === 0) fail(`control ${CONTROL} left the replay green`);
  else if (!same(r.failed, red)) fail(`control ${CONTROL} should turn exactly [${red.join(', ')}] red, and it turned [${r.failed.join(', ')}]`);
  else if (!r.problems.some(p => p.includes(says))) fail(`control ${CONTROL} went red, but not for its own reason ("${says}" is not in the report)`);
  else console.log(`  CONTROL FIRED: [${red.join(', ')}] red on "${says}", the rest green`);
  if (failures) { console.error(`simUsBoardParity control ${CONTROL}: failed`); process.exit(1); }
  console.log(`simUsBoardParity control ${CONTROL}: green. The control turned its own sports red for its own reason.`);
  process.exit(0);
}

console.log('A) the fixture is whole');
/* The six the round asked for, then the old shapes the restore repairs (a
   save from before Round 182, 422 or 126), so the restore cannot lose a
   repair with this harness green. */
const REQUIRED_SAVES = ['rookie', 'mid', 'ext', 'fa', 'retired', 'coach', 'noRole', 'negNet', 'noCoachKey', 'coachPhaseNoCoach', 'retiredNoCoachKey'];
const MIN_SEASONS = 12;
if (!fs.existsSync(FIXTURE)) {
  fail('scripts/data/usBoardFixture.json is missing: node scripts/recordUsBoardFixture.mjs writes it');
} else {
  const fx = JSON.parse(read(FIXTURE));
  console.log(`   recorded from ${fx.header?.recordedFrom ?? 'nowhere it says'}`);
  if (!/^[0-9a-f]{40} /.test(fx.header?.recordedFrom ?? '')) fail('the fixture header does not say which commit it was recorded from');
  if (!same(Object.keys(fx.sports ?? {}), SPORTS)) fail(`the fixture holds [${Object.keys(fx.sports ?? {}).join(', ')}], not the four sports`);
  for (const slug of SPORTS) {
    const s = fx.sports?.[slug];
    if (!s) continue;
    const unreached = Object.keys(s.coverage).filter(k => !(s.coverage[k] > 0));
    const noSave = REQUIRED_SAVES.filter(n => !s.saves[n] || !(s.screens[n]?.length > 0));
    const screens = Object.values(s.screens).reduce((n, steps) => n + steps.length, 0);
    console.log(`   ${slug}: ${s.path.length} clicks, ${s.coverage.seasons} seasons, ${Object.keys(s.saves).length} fixed saves, ${screens} screen steps`);
    if (unreached.length) fail(`${slug}: the recorded path never reached ${unreached.join(', ')}`);
    if (s.coverage.seasons < MIN_SEASONS) fail(`${slug}: ${s.coverage.seasons} seasons on the path, the round asks for ${MIN_SEASONS}`);
    if (noSave.length) fail(`${slug}: no fixed save or no screens for ${noSave.join(', ')}`);
    if (s.path.some(st => !st.s || !st.m)) fail(`${slug}: a path step carries no hash`);
  }
}

console.log('B) the replay: every click, every save, every screen');
if (!failures) {
  const r = replay({});
  console.log(`   Vitest exit ${r.exit}, passed [${r.passed.join(', ')}], failed [${r.failed.join(', ')}]`);
  for (const p of firstPerSport(r.problems, 3)) console.error('   ' + p.slice(0, 400));
  if (r.exit !== 0) fail(`the replay exited ${r.exit}`);
  if (!same(r.passed, SPORTS)) fail(`the replay passed [${r.passed.join(', ')}], not all four sports`);
  if (r.problems.length) fail(`${r.problems.length} step${r.problems.length === 1 ? '' : 's'} differ from the fixture`);
}

console.log('');
if (failures) {
  /* This is a golden master, so it also goes red when a round changes a US
     career ON PURPOSE (Codex 905 and 906 did, inside Round 900). Say what to
     do, so the remedy is a decision and not a habit. */
  console.error('  If your round meant to change what a US career does, re-record from your tree');
  console.error('  (node scripts/recordUsBoardFixture.mjs), commit the fixture with the change and say so in the');
  console.error('  commit. If it did not, the red is a real change: read the first differing step above.');
  console.error(`simUsBoardParity: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simUsBoardParity: green. Four sports replayed click for click, save for save and screen for screen.');
