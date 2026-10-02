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
 *    coach career, a reload), at least 12 seasons, the six required saves.
 * B) The replay: src/test/usBoardFixture.test.tsx mounts the real boards in
 *    jsdom with the fixture's seeds and clock and presses the same buttons.
 *    After every press the save's bytes and the document's markup must hash to
 *    what the fixture holds. Green needs Vitest's real exit code 0, all four
 *    sports passed, and an empty report.
 *
 * Measured when it was written (2026-10-02, this machine): 436, 506, 475 and
 * 442 clicks on the four paths (23 or 24 seasons each) and 1,860 more steps
 * across the ten fixed saves per sport; one replay takes about 160 seconds.
 * Recorded twice from the same tree, the fixture came out byte for byte the
 * same (cmp exit 0), which is what makes a red replay mean something. There is no
 * band here on purpose: the check is byte equality, and a path either
 * replays or it does not.
 *
 * Controls, one per run (each is a full replay, about three minutes):
 *   US_BOARD_PARITY_CONTROL=label    one label changed in a copy of a board:
 *                                    the sports that file draws go red on the
 *                                    words, the others stay green
 *   US_BOARD_PARITY_CONTROL=draw     one extra Math.random() before the camp
 *                                    battle: the same sports go red on the save
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

/* The source controls. `red` is which sports the changed file draws. */
const SOURCE_CONTROLS = {
  label: {
    file: 'src/components/nfl-my-career/NflMyCareerBoard.tsx',
    alias: '@/components/nfl-my-career/NflMyCareerBoard',
    from: '>Create your player</p>',
    to: '>Create your athlete</p>',
    red: ['nfl'],
    says: 'the screen reads',
  },
  draw: {
    file: 'src/components/nfl-my-career/NflMyCareerBoard.tsx',
    alias: '@/components/nfl-my-career/NflMyCareerBoard',
    from: '    const campNote = nflCampBattle(c, teamQuality, Math.random);\n',
    to: '    Math.random();\n    const campNote = nflCampBattle(c, teamQuality, Math.random);\n',
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
    if (!c) { console.error(`unknown control "${CONTROL}": use label, draw or fixture`); process.exit(1); }
    const src = read(path.join(ROOT, c.file));
    if (src.split(c.from).length !== 2) { console.error(`control ${CONTROL}: ${c.file} does not carry exactly one "${c.from.trim()}", so this control would change nothing and prove nothing`); process.exit(1); }
    const copy = path.join(ROOT, 'src/test', `__control_usBoard_${CONTROL}${path.extname(c.file)}`);
    litter.push(copy);
    fs.writeFileSync(copy, src.replace(c.from, c.to));
    r = replay({ US_BOARD_CONTROL_ALIAS: c.alias, US_BOARD_CONTROL_FILE: copy });
    red = c.red;
    says = c.says;
  }
  console.log(`control ${CONTROL}: Vitest exit ${r.exit}, passed [${r.passed.join(', ')}], failed [${r.failed.join(', ')}]`);
  for (const p of r.problems.slice(0, 4)) console.log('   ' + p.slice(0, 300));
  if (r.exit === 0) fail(`control ${CONTROL} left the replay green`);
  else if (!same(r.failed, red)) fail(`control ${CONTROL} should turn exactly [${red.join(', ')}] red, and it turned [${r.failed.join(', ')}]`);
  else if (!r.problems.some(p => p.includes(says))) fail(`control ${CONTROL} went red, but not for its own reason ("${says}" is not in the report)`);
  else console.log(`  CONTROL FIRED: [${red.join(', ')}] red on "${says}", the rest green`);
  if (failures) { console.error(`simUsBoardParity control ${CONTROL}: failed`); process.exit(1); }
  console.log(`simUsBoardParity control ${CONTROL}: green. The control turned its own sports red for its own reason.`);
  process.exit(0);
}

console.log('A) the fixture is whole');
const REQUIRED_SAVES = ['rookie', 'mid', 'ext', 'fa', 'retired', 'coach'];
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
  for (const p of r.problems.slice(0, 12)) console.error('   ' + p.slice(0, 400));
  if (r.exit !== 0) fail(`the replay exited ${r.exit}`);
  if (!same(r.passed, SPORTS)) fail(`the replay passed [${r.passed.join(', ')}], not all four sports`);
  if (r.problems.length) fail(`${r.problems.length} step${r.problems.length === 1 ? '' : 's'} differ from the fixture`);
}

console.log('');
if (failures) { console.error(`simUsBoardParity: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simUsBoardParity: green. Four sports replayed click for click, save for save and screen for screen.');
