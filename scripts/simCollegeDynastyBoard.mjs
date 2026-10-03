/* College dynasty board harness: CFB Dynasty and CBB Dynasty are one board.

   Round 912. The two college dynasty boards were two copies of one idea
   (Round 426 had to fix one roster bug twice), so they became one shared
   board, src/components/college-dynasty/CollegeDynastyBoard.tsx, driven by a
   sport descriptor that each old file now builds and hands it. The round
   promised no behaviour change at all, and this harness holds it to that.

   The proof is src/components/college-dynasty/collegeDynastyFixture.test.tsx,
   which drives both REAL boards in jsdom down a scripted path with a seeded
   Math.random and compares every step against collegeDynastyFixture.json,
   recorded from main (a4433f41) before any code moved: a hash of the markup,
   a hash of the text, the save, the count of random draws, and what the board
   hands the share buttons, the completion hook and the reveal scroll.

   1) the fixture is whole: recorded from a named sha, both sports, every
      station of the scripted path present (measured: 104 football steps and
      100 basketball steps, 78 distinct station names each; the floors below
      are the stations, not the counts, so a re-record that adds steps passes
      and one that loses a station does not).
   2) the replay: both sports match every step.

   Negative controls, one per run, each refusing to run unless the string it
   rewrites is in the file exactly once:
     COLLEGE_BOARD_CONTROL=cfbword  CFB Dynasty's descriptor says "signed with"
       for "signs with". Football must go red, basketball must stay green.
     COLLEGE_BOARD_CONTROL=cbbword  CBB Dynasty's descriptor says "commit to"
       for "commits to". Basketball red, football green.
     COLLEGE_BOARD_CONTROL=board    the shared board's close button gains a
       word. Both sports red.
   The rewritten file is a copy under dist/.college-control, swapped in
   through vitest's NO_DOUBLE_SWAP alias; the real file is never touched.

   Run: node scripts/simCollegeDynastyBoard.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = {
  cfbword: {
    alias: '@/components/cfb-dynasty/CfbDynastyBoard', file: 'src/components/cfb-dynasty/CfbDynastyBoard.tsx',
    from: "signVerb: 'signs with',", to: "signVerb: 'signed with',", red: ['cfb'], green: ['cbb'],
  },
  cbbword: {
    alias: '@/components/cbb-dynasty/CbbDynastyBoard', file: 'src/components/cbb-dynasty/CbbDynastyBoard.tsx',
    from: "signVerb: 'commits to',", to: "signVerb: 'commit to',", red: ['cbb'], green: ['cfb'],
  },
  board: {
    alias: '@/components/college-dynasty/CollegeDynastyBoard', file: 'src/components/college-dynasty/CollegeDynastyBoard.tsx',
    from: 'Close the class, run it back', to: 'Close the class, run it back now', red: ['cfb', 'cbb'], green: [],
  },
};
const CONTROL = process.env.COLLEGE_BOARD_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`COLLEGE_BOARD_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* The stations every recording must reach, per sport. Step names carry the
   sport's own words (Week or Round, Conferences or Leagues), so each sport
   lists its own; numbers are folded to N. */
const SHARED_STATIONS = ['pick', 'start', 'season one: back to Play', 'reload on the recap', 'recruiting trail',
  'filter position', 'filter stars', 'filters reset', 'sign high school', 'sign portal', 'sign the dearest N',
  'staff window open', 'staff: market open', 'staff: hire', 'staff: let go', 'staff: hire into the empty chair',
  'staff: market closed', 'drain the pot N', 'staff: second market open', 'staff: dearest hire N', 'class closed',
  'reload in season two', 'season two: first round', 'season two: second round', 'season two: schedule',
  'old recap save', 'plain save'];
const STATIONS = {
  cfb: [...SHARED_STATIONS, 'season one: Play Week N', 'season one: Final week + the Playoff', 'new dynasty: tab Conferences'],
  cbb: [...SHARED_STATIONS, 'season one: Play Round N', 'season one: Final round + March', 'new dynasty: tab Leagues'],
};
const STEP_KEYS = ['step', 'html', 'text', 'save', 'draws', 'share', 'completion', 'reveal', 'head'];

console.log('1) the fixture is whole: a named sha, both sports, every station of the scripted path');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/components/college-dynasty/collegeDynastyFixture.json'), 'utf8'));
  if (!/^[0-9a-f]{7,40}$/.test(String(fixture.recordedFrom))) fail(`the fixture names no sha it was recorded from (${fixture.recordedFrom})`);
  for (const sport of ['cfb', 'cbb']) {
    const steps = fixture.sports?.[sport];
    if (!Array.isArray(steps) || steps.length === 0) { fail(`${sport}: no recorded steps`); continue; }
    const names = new Set(steps.map(s => String(s.step).replace(/\d+/g, 'N')));
    const missing = STATIONS[sport].filter(n => !names.has(n));
    const holes = steps.filter(s => STEP_KEYS.some(k => !(k in s))).length;
    const lastDraws = steps[steps.length - 1].draws;
    console.log(`   ${sport}: ${steps.length} steps, ${names.size} stations, ${missing.length} missing, ${holes} steps short of a field, ${lastDraws} draws at the end`);
    if (missing.length) fail(`${sport}: the recording never reaches ${missing.join(', ')}`);
    if (holes) fail(`${sport}: ${holes} recorded steps are missing a field`);
    if (!(lastDraws > 0)) fail(`${sport}: the recording made no random draws, so the seeded path never ran`);
  }
}

console.log('2) the replay: both boards match every recorded step');
{
  const TEST = 'src/components/college-dynasty/collegeDynastyFixture.test.tsx';
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.COLLEGE_FIXTURE_RECORD;
  delete env.COLLEGE_FIXTURE_OUT;
  let dir = null;
  const control = CONTROLS[CONTROL];
  if (control) {
    const src = fs.readFileSync(path.join(ROOT, control.file), 'utf8');
    if (src.split(control.from).length !== 2) {
      console.error(`control cannot run: ${control.file} does not hold "${control.from}" exactly once`);
      process.exit(1);
    }
    const rewritten = src.replace(control.from, control.to);
    if (rewritten === src || !rewritten.includes(control.to)) { console.error('control cannot run: the rewrite changed nothing'); process.exit(1); }
    dir = path.join(ROOT, 'dist', '.college-control');
    fs.mkdirSync(dir, { recursive: true });
    const copy = path.join(dir, path.basename(control.file).replace('.tsx', '.control.tsx'));
    fs.writeFileSync(copy, rewritten);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [control.alias]: copy.replaceAll('\\', '/') });
    console.log(`   NEGATIVE CONTROL ON: ${control.file} says "${control.to}" for "${control.from}"`);
  }
  let r;
  try {
    r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (!out.includes('collegeDynastyFixture.test.tsx') || !summary) {
    console.error('the fixture test never reported, so nothing was checked:\n' + out.slice(-1500));
    process.exit(1);
  }
  if (/Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed|Test timed out/.test(out)) {
    console.error('the boards did not load or ran out of time, so any red is not the check:\n' + out.slice(-1500));
    process.exit(1);
  }
  const result = {};
  for (const sport of ['cfb', 'cbb']) {
    const line = out.split('\n').find(l => l.includes(`${sport}: every step matches the fixture`));
    result[sport] = !line ? 'absent' : /✓/.test(line) ? 'green' : /×/.test(line) ? 'red' : 'unknown';
    console.log(`   ${sport}: ${result[sport]}`);
  }
  const mismatches = new Set([...out.matchAll(/(step \d+ \([^)]*\)) differs in ([a-z, ]+)/g)].map(m => `${m[1]}, in ${m[2]}`));
  for (const m of mismatches) console.log(`   first mismatch: ${m}`);
  if (control) {
    for (const s of control.red) if (result[s] !== 'red') console.error(`  control did not fire on ${s}: ${result[s]}`);
    for (const s of control.green) if (result[s] !== 'green') console.error(`  control leaked into ${s}: ${result[s]}`);
    const fired = control.red.every(s => result[s] === 'red') && control.green.every(s => result[s] === 'green');
    if (fired && /AssertionError|expected|no button/.test(out)) fail(`the "${CONTROL}" copy breaks the replay of ${control.red.join(' and ')}`);
  } else {
    for (const sport of ['cfb', 'cbb']) if (result[sport] !== 'green') fail(`${sport} no longer replays its recorded behaviour`);
    if (r.status !== 0 || !/2 passed/.test(summary[1])) fail(`vitest exit ${r.status}: ${summary[1].trim()}`);
  }
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING it should have, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCollegeDynastyBoard: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCollegeDynastyBoard: all green');
