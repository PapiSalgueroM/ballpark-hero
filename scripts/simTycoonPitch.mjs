/**
 * Round 583 harness, part two: Stadium Tycoon's pitch plays the engine's match.
 * Fourth round of the tycoon merge (docs/design/round-580-tycoon-merge.md,
 * section 7).
 *
 * A) A vitest suite over the real page, hook and lib, src/test/tycoonPitch.test.tsx:
 *      1 over 30 matches every committed goal is replayed once, at its end, with
 *        its minute, and no goal waits longer than one replay
 *      2 goals scored under another tab are on the scoreboard on return and are
 *        never replayed late
 *      3 under reduced motion no replay runs and no spark or pop is drawn, and the
 *        floaters still land
 *      4 a tap pops the pitch and throws six sparks; the taps chip counts, never
 *        multiplies, and clears after 1.5 seconds idle; 22 players
 *      5 the office is five tiles, one panel at a time, Upgrades first
 *      6 in a goal storm the older replays land on their final frame and the pitch
 *        never falls behind
 *    and six controls, each a broken copy pointed at through vitest.config.ts:
 *      decor      the ball runs at a goal on a timer, the old decoration     red 1
 *      backlog    the hook keeps queueing while the pitch is off screen     red 2
 *      motion     the pitch ignores reduced motion                          red 3
 *      xchip      the chip reads like a multiplier                          red 4
 *      deadtiles  the office tiles open nothing                             red 5
 *      nolanding  a queue of replays never cuts the older ones short        red 6
 *
 * B) Source, comments stripped:
 *      S1 no interval anywhere on the page or the pitch, and the pitch's only
 *         timer is the one that ends a replay
 *      S2 the pitch never draws from Math.random: every position is the engine's
 *         state hashed, or the static formation
 *    with a control each (interval, random).
 *
 * Control copies go to dist/.tycoon-pitch-control-<name>/. Never run this while a
 * build is running.
 *
 * Run: node scripts/simTycoonPitch.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = ['src/test/tycoonPitch.test.tsx'];
const PITCH = path.join(ROOT, 'src/components/tycoon/TycoonPitch.tsx');
const PAGE = path.join(ROOT, 'src/pages/StadiumTycoon.tsx');
const HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const TEST_COUNT = 6;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const stripComments = code => code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonpitch-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

function mustReplace(text, from, to, what) {
  if (text.split(from).length - 1 !== 1) abort(`  control: ${what} does not carry exactly one ${JSON.stringify(from.slice(0, 70))}, so this control would prove nothing`);
  return text.replace(from, to);
}

function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', ...TESTS, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) { console.error(text.slice(-3000)); return null; }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.notes = [...text.matchAll(/PITCH\| (.+)/g)].map(m => m[1].trim());
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      rows.push({ title: a.title || (a.fullName || '').trim(), status: a.status, messages: (a.failureMessages || []).join('\n') });
    }
  }
  return rows;
}
function detail(messages) {
  const line = messages.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('AssertionError:') && !s.startsWith('at '));
  return (line || messages.split('\n')[0] || '').slice(0, 240);
}
const sectionOf = title => Number((title.match(/^(\d+)/) || [])[1] || 0);

const BALL_AT = "  const ballAt: BallAt = replay ? replay.side : 'play';";
const CONTROLS = [
  {
    name: 'decor',
    why: 'the ball runs at a goal on a timer that knows nothing about the goals',
    env: 'TYCOON_PITCH_COMPONENT',
    file: 'TycoonPitch.tsx',
    build: () => mustReplace(read(PITCH), BALL_AT, "  const ballAt: BallAt = Math.floor(Date.now() / 1900) % 4 === 1 ? 'for' : 'play';", 'TycoonPitch.tsx'),
    red: [1],
    green: [4, 5],
  },
  {
    name: 'backlog',
    why: 'the hook keeps queueing replays while the pitch is off screen',
    env: 'TYCOON_LOADS_STADIUM_HOOK',
    file: 'useStadiumTycoon.ts',
    build: () => mustReplace(read(HOOK), '    replaysOnRef.current = on;\n    setReplays(q => (q.length ? [] : q));\n', '    void on;\n', 'useStadiumTycoon.ts'),
    red: [2],
    green: [1, 3, 4, 5, 6],
  },
  {
    name: 'motion',
    why: 'the pitch ignores reduced motion',
    env: 'TYCOON_PITCH_COMPONENT',
    file: 'TycoonPitch.tsx',
    build: () => {
      let t = read(PITCH);
      t = mustReplace(t, '  const replay = reduce ? null : head;', '  const replay = head;', 'TycoonPitch.tsx (replay)');
      t = mustReplace(t, '{tapFx && !reduce && Array.from(', '{tapFx && Array.from(', 'TycoonPitch.tsx (sparks)');
      t = mustReplace(t, "tapFx && !reduce && (tapFx.seq % 2 ? 'st-pop-a' : 'st-pop-b')", "tapFx && (tapFx.seq % 2 ? 'st-pop-a' : 'st-pop-b')", 'TycoonPitch.tsx (pop)');
      return t;
    },
    red: [3],
    green: [1, 2, 4, 5, 6],
  },
  {
    name: 'xchip',
    why: 'the taps chip reads like a multiplier',
    env: 'TYCOON_PITCH_COMPONENT',
    file: 'TycoonPitch.tsx',
    build: () => mustReplace(read(PITCH), '          {tapRun} taps\n', '          x{tapRun}\n', 'TycoonPitch.tsx'),
    red: [4],
    green: [1, 2, 3, 5, 6],
  },
  {
    name: 'deadtiles',
    why: 'the office tiles open nothing',
    env: 'TYCOON_ROOMS_PAGE',
    file: 'StadiumTycoon.tsx',
    build: () => mustReplace(read(PAGE), '              onClick={() => setPanel(t.key)}\n', '              onClick={() => undefined}\n', 'StadiumTycoon.tsx'),
    red: [5],
    green: [1, 2, 3, 4, 6],
  },
  {
    name: 'nolanding',
    why: 'a queue of replays never cuts the older ones short',
    env: 'TYCOON_PITCH_COMPONENT',
    file: 'TycoonPitch.tsx',
    build: () => mustReplace(read(PITCH), '  const landing = replays.length > 2;', '  const landing = false;', 'TycoonPitch.tsx'),
    red: [6],
    green: [1, 2, 3, 4, 5],
  },
];

console.log('Round 583: the pitch plays the engine\'s match');
console.log(`   suite: ${TESTS.join(', ')}`);
console.log('');
console.log('A) the shipped code');
const live = runSuite({});
if (!live) abort('  FAIL: the suite produced no report at all');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < TEST_COUNT) fail(`only ${live.length} of the ${TEST_COUNT} tests ran`);
console.log('   what it measured:');
for (const note of live.notes) console.log(`     ${note}`);
if (live.notes.length < TEST_COUNT) fail(`the suite printed ${live.notes.length} measurements, so some test returned without measuring`);

for (const control of CONTROLS) {
  console.log('');
  console.log(`A.${control.name}) negative control: ${control.why}`);
  const dir = path.join(ROOT, 'dist', `.tycoon-pitch-control-${control.name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, control.file);
  fs.writeFileSync(file, control.build());
  const rows = runSuite({ [control.env]: file.replaceAll('\\', '/') });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!rows) { fail(`control ${control.name}: no report`); continue; }
  if (rows.loadError) { fail(`control ${control.name}: the broken copy did not load, so every red is a crash:\n${rows.loadError}`); continue; }
  if (rows.length < TEST_COUNT) { fail(`control ${control.name}: only ${rows.length} tests ran`); continue; }
  for (const row of rows) {
    const n = sectionOf(row.title);
    const graded = control.red.includes(n) || control.green.includes(n);
    const want = control.red.includes(n) ? 'failed' : 'passed';
    console.log(`   ${!graded ? '--  ' : row.status === want ? 'ok  ' : 'BAD '} ${row.status.padEnd(6)} ${row.title}`);
    if (control.red.includes(n)) {
      if (row.status !== 'failed') fail(`control ${control.name}: "${row.title}" stayed green, so that check is dead`);
      else console.log(`         measured: ${detail(row.messages)}`);
    }
    if (control.green.includes(n) && row.status !== 'passed') fail(`control ${control.name}: "${row.title}" went red too (${detail(row.messages)})`);
  }
}

/* ======================================================================
   B) the source
   ====================================================================== */

function sourceSections(pitch, page) {
  const out = { S1: [], S2: [] };
  const p = stripComments(pitch);
  const g = stripComments(page);
  for (const [name, code] of [['TycoonPitch.tsx', p], ['StadiumTycoon.tsx', g]]) {
    const n = (code.match(/\bsetInterval\s*\(/g) || []).length;
    if (n) out.S1.push(`${name} starts ${n} interval${n === 1 ? '' : 's'}, so something on the Stadium tab moves on a clock of its own`);
  }
  const timeouts = [...p.matchAll(/\bsetTimeout\s*\(([^;]*)/g)].map(m => m[1]);
  if (timeouts.length !== 1 || !/onReplayEnd\s*\(/.test(timeouts[0] ?? '')) out.S1.push(`the pitch sets ${timeouts.length} timeout(s), and its one timer should be the one that ends a replay`);
  if (/\bMath\.random\s*\(/.test(p)) out.S2.push('the pitch draws from Math.random, so what it shows is not the engine\'s state');
  const formation = /const FORMATION: \[number, number\]\[\] = \[([\s\S]*?)\];/.exec(p);
  const pairs = formation ? [...formation[1].matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)] : [];
  if (pairs.length !== 11) out.S2.push(`the formation holds ${pairs.length} positions, not a static 11`);
  if (pairs.some(m => Number(m[1]) >= 50)) out.S2.push('a player in your half of the formation stands past halfway');
  return out;
}
const report = r => { for (const k of ['S1', 'S2']) console.log(`   ${r[k].length ? 'RED ' : 'ok  '} ${k}${r[k].length ? `: ${r[k][0]}` : ''}`); };

console.log('');
console.log('B) the source');
const pitchSrc = read(PITCH);
const pageSrc = read(PAGE);
const plain = sourceSections(pitchSrc, pageSrc);
report(plain);
for (const k of ['S1', 'S2']) for (const m of plain[k]) fail(`${k}: ${m}`);

const IDLE = '  const idle = { x: 32 + seatRand(totalMatches * 131 + minute * 7) * 36,';
const SOURCE_CONTROLS = [
  {
    name: 'interval',
    why: 'the old 1900ms decoration timer comes back on the pitch',
    red: ['S1'], green: ['S2'],
    pitch: t => mustReplace(t, '  const ballAt: BallAt', '  useEffect(() => { const id = setInterval(() => undefined, 1900); return () => clearInterval(id); }, []);\n  const ballAt: BallAt', 'TycoonPitch.tsx'),
  },
  {
    name: 'random',
    why: 'the idle ball is placed with Math.random',
    red: ['S2'], green: ['S1'],
    pitch: t => mustReplace(t, IDLE, '  const idle = { x: 32 + Math.random() * 36,', 'TycoonPitch.tsx'),
  },
];
for (const control of SOURCE_CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control: ${control.why}`);
  const result = sourceSections(control.pitch(pitchSrc), pageSrc);
  report(result);
  for (const s of control.red) if (result[s].length === 0) fail(`control ${control.name}: ${s} stayed green, so that check is dead`);
  for (const s of control.green) if (result[s].length > 0) fail(`control ${control.name}: ${s} went red too (${result[s][0]})`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonPitch: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonPitch: green.');
console.log('   Every goal the engine commits is replayed once, at its end, with its minute, and never late.');
console.log('   Reduced motion holds the pitch still; taps pop, spark and count without multiplying; the office is tiles.');
console.log(`   All ${CONTROLS.length + SOURCE_CONTROLS.length} controls fired exactly where they should.`);
