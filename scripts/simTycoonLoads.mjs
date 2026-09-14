/**
 * Round 581 harness: the tycoon loads bad saves as working games, writes every
 * change before React renders it, and pays a hidden academy for its time away.
 * Second round of the tycoon merge (docs/design/round-580-tycoon-merge.md).
 *
 * A) Two vitest suites over the real hooks and libs:
 *    src/test/academyAway.test.tsx   (1 to 6, 10 to 13) the academy's clock:
 *                                     watched, hidden three hours, hidden against
 *                                     closed for twenty (the same academy, not just
 *                                     the same meter), closed, coming back,
 *                                     duplicate ids, a showcase while hidden, a
 *                                     hidden tab's jittered wakes, a slow device,
 *                                     fifteen minutes hidden against closed
 *    src/test/tycoonLoads.test.tsx    (7 to 9) the stadium: a doctored save loads
 *                                     as a working game, Sell up survives a
 *                                     pagehide in the same task, a tap in the
 *                                     ticking frame keeps the tick
 *    and eight controls, each a broken copy pointed at through vitest.config.ts:
 *      fixeddt       the academy hook ticks a fixed quarter second again   red 2, 3, 11, 12, 13
 *      showcaseaway  a showcase multiplies away training again             red 10
 *      gaponly       the hook stops passing whether the page is visible   red 11
 *      quickaway     a visible page's 750ms gap counts as away again       red 12
 *      bigstep       away time trains in one giant step again              red 13
 *      rawlevels     the stadium loader merges levels in raw again         red 7
 *      updater       Sell up saves from inside a setState updater again    red 8
 *      renderref     the stadium ref is assigned during render again       red 9
 *    Tests 10 to 13, the showcase, gaponly, quickaway and bigstep controls, and
 *    the "same academy" half of test 3 came out of the Round 581 adversarial
 *    review, which found the first draft paying a hidden showcase at 1.5 times
 *    the watched speed, letting a jittered hidden wake reopen the eight hours,
 *    and treating a slow visible phone as away.
 *
 * B) Three save sections over the committed corpus
 *    (src/test/fixtures/tycoonSaves.json, frozen libs in scripts/fixtures/tycoonV1),
 *    with today's answers recomputed from each raw save, never trusted from the file:
 *      C0 today's loaders still give the committed answer for every save
 *      C1 every save today's loaders write still loads in the FROZEN V1 build
 *         and comes back byte for byte, so rolling this round back loses nothing
 *         (the corpus carries a save with the new away meter, so this covers it)
 *      C2 the saves this round changes on load are exactly the ones it means to:
 *         the doctored stadium save and the duplicate id academy save
 *    and a control for each, planted in a wrapped loader or a copy of the corpus.
 *
 * Control copies go to dist/.tycoon-loads-control-<name>/. Never run this while a
 * build is running.
 *
 * Run: node scripts/simTycoonLoads.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = ['src/test/academyAway.test.tsx', 'src/test/tycoonLoads.test.tsx'];
const ACADEMY_HOOK = path.join(ROOT, 'src/hooks/useWonderkidFactory.ts');
const ACADEMY_LIB = path.join(ROOT, 'src/lib/wonderkidFactory.ts');
const STADIUM_HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const STADIUM_LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const FROZEN = path.join(ROOT, 'scripts/fixtures/tycoonV1');
const CORPUS = path.join(ROOT, 'src/test/fixtures/tycoonSaves.json');
/** The saves this round repairs on load. Anything else changing is a regression. */
const REPAIRED = ['stadium/doctored', 'academy/duplicateIds'];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonloads-'));
const controlDirs = [];
process.on('exit', () => {
  for (const d of controlDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

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
  rows.notes = [...text.matchAll(/LOADS\| (.+)/g)].map(m => m[1].trim());
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

/* The exact text each control rewrites, verbatim from the shipped files. */
const LIVE_CLOCK = `      const now = Date.now();
      advanceClock(s, now - s.lastSeen, document.visibilityState !== 'hidden');
      s.lastSeen = now;`;
const FIXED_CLOCK = `      tick(s, 0.25);
      s.lastSeen = Date.now();`;
const LEVEL_CLEANING_START = '    const cleanLevels: Record<string, number> = {};';
const LEVEL_CLEANING_END = '    s.levels = cleanLevels;\n';
const REF_FIRST_PRESTIGE = `    const now = Date.now();
    const next = prestige(stateRef.current, now);
    if (next === stateRef.current) return;
    stateRef.current = next;
    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { /* ignore */ }
    setState(next);`;
const UPDATER_PRESTIGE = `    setState(s => {
      const next = prestige(s, Date.now());
      try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); } catch { /* ignore */ }
      return next;
    });`;

function mustReplace(text, from, to, what) {
  if (text.split(from).length - 1 !== 1) abort(`  control: ${what} does not carry exactly one ${JSON.stringify(from.slice(0, 70))}, so this control would prove nothing`);
  return text.replace(from, to);
}

const CONTROLS = [
  {
    name: 'fixeddt',
    why: 'the academy hook ticks a fixed quarter second per callback again',
    env: 'TYCOON_LOADS_ACADEMY_HOOK',
    file: 'useWonderkidFactory.ts',
    build: () => {
      let t = read(ACADEMY_HOOK);
      t = mustReplace(t, LIVE_CLOCK, FIXED_CLOCK, 'useWonderkidFactory.ts');
      t = mustReplace(t, 'applyOffline, advanceClock,', 'applyOffline, advanceClock, tick,', 'useWonderkidFactory.ts');
      return t;
    },
    red: [2, 3, 11, 12, 13],
    green: [1, 4, 6, 7, 8, 9],
  },
  {
    name: 'showcaseaway',
    why: 'a showcase multiplies away training again (the review\'s real finding)',
    env: 'TYCOON_LOADS_ACADEMY_LIB',
    file: 'wonderkidFactory.ts',
    build: () => mustReplace(read(ACADEMY_LIB), 'const tm = offline && s.showcaseLeft > 0 ? trainMult(s) / SHOWCASE_MULT : trainMult(s);', 'const tm = trainMult(s);', 'wonderkidFactory.ts'),
    red: [10],
    green: [1, 2, 3, 4, 5, 6, 11, 12, 13, 7, 8, 9],
  },
  {
    name: 'gaponly',
    why: 'the academy hook stops telling the clock whether the page is visible',
    env: 'TYCOON_LOADS_ACADEMY_HOOK',
    file: 'useWonderkidFactory.ts',
    build: () => mustReplace(read(ACADEMY_HOOK), "advanceClock(s, now - s.lastSeen, document.visibilityState !== 'hidden');", 'advanceClock(s, now - s.lastSeen);', 'useWonderkidFactory.ts'),
    red: [11],
    green: [1, 2, 3, 4, 6, 12, 13],
  },
  {
    name: 'quickaway',
    why: 'a visible page counts any gap over 750ms as away again',
    env: 'TYCOON_LOADS_ACADEMY_LIB',
    file: 'wonderkidFactory.ts',
    build: () => mustReplace(read(ACADEMY_LIB), 'export const AWAY_AFTER_MS = 5000;', 'export const AWAY_AFTER_MS = 750;', 'wonderkidFactory.ts'),
    red: [12],
    green: [1, 2, 3, 4, 5, 6, 10, 11, 13],
  },
  {
    name: 'bigstep',
    why: 'away time trains in one giant step again, which overpays a closed tab',
    env: 'TYCOON_LOADS_ACADEMY_LIB',
    file: 'wonderkidFactory.ts',
    build: () => mustReplace(read(ACADEMY_LIB), '  for (let left = applied; left > 0; left -= AWAY_STEP_SEC) {\n    tick(s, Math.min(AWAY_STEP_SEC, left), { offline: true });\n  }', '  if (applied > 0) tick(s, applied, { offline: true });', 'wonderkidFactory.ts'),
    red: [13],
    green: [1, 2, 3, 4, 5, 6, 11, 12],
  },
  {
    name: 'rawlevels',
    why: 'the stadium loader merges the stored levels in raw again',
    env: 'TYCOON_LOADS_STADIUM_LIB',
    file: 'stadiumTycoon.ts',
    build: () => {
      const t = read(STADIUM_LIB);
      const a = t.indexOf(LEVEL_CLEANING_START);
      const b = t.indexOf(LEVEL_CLEANING_END);
      if (a < 0 || b < a || t.split(LEVEL_CLEANING_START).length !== 2) abort('  control rawlevels: the level cleaning block is not in stadiumTycoon.ts, so this control would prove nothing');
      return t.slice(0, a) + t.slice(b + LEVEL_CLEANING_END.length);
    },
    red: [7],
    green: [1, 2, 3, 4, 5, 6, 8, 9],
  },
  {
    name: 'updater',
    why: 'Sell up computes and saves inside a setState updater again',
    env: 'TYCOON_LOADS_STADIUM_HOOK',
    file: 'useStadiumTycoon.ts',
    build: () => mustReplace(read(STADIUM_HOOK), REF_FIRST_PRESTIGE, UPDATER_PRESTIGE, 'useStadiumTycoon.ts'),
    red: [8],
    green: [7, 9],
  },
  {
    name: 'renderref',
    why: 'the stadium ref is assigned during render and actions stop writing it first',
    env: 'TYCOON_LOADS_STADIUM_HOOK',
    file: 'useStadiumTycoon.ts',
    build: () => {
      let t = read(STADIUM_HOOK);
      t = mustReplace(t, '  const stateRef = useRef(state);\n', '  const stateRef = useRef(state);\n  stateRef.current = state;\n', 'useStadiumTycoon.ts');
      t = mustReplace(t, '    stateRef.current = next;\n    setState(next);\n  }, []);\n  const goldenRef', '    setState(next);\n  }, []);\n  const goldenRef', 'useStadiumTycoon.ts (commit)');
      t = mustReplace(t, '        stateRef.current = next;\n        for (const e of events)', '        for (const e of events)', 'useStadiumTycoon.ts (the loop)');
      return t;
    },
    red: [9],
    green: [7, 8],
  },
];

console.log('Round 581: tycoon loads, writes and away time, over the REAL hooks');
console.log(`   suites: ${TESTS.join(', ')}`);
console.log('');
console.log('A) the shipped code');
const live = runSuite({});
if (!live) abort('  FAIL: the suites produced no report at all');
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < 13) fail(`only ${live.length} of the 13 tests ran`);
console.log('   what it measured:');
for (const note of live.notes) console.log(`     ${note}`);
if (live.notes.length < 13) fail(`the suites printed ${live.notes.length} measurements, so some test returned without measuring`);

for (const control of CONTROLS) {
  console.log('');
  console.log(`A.${control.name}) negative control: ${control.why}`);
  const dir = path.join(ROOT, 'dist', `.tycoon-loads-control-${control.name}`);
  controlDirs.push(dir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, control.file);
  fs.writeFileSync(file, control.build());
  const rows = runSuite({ [control.env]: file.replaceAll('\\', '/') });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!rows) { fail(`control ${control.name}: no report`); continue; }
  if (rows.loadError) { fail(`control ${control.name}: the broken copy did not load, so every red is a crash:\n${rows.loadError}`); continue; }
  if (rows.length < 13) { fail(`control ${control.name}: only ${rows.length} tests ran`); continue; }
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
   B) the saves
   ====================================================================== */

async function bundle(entry, name) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`, { cwd: ROOT, shell: true });
  return import('file:///' + out.replace(/\\/g, '/'));
}

const v1Stadium = await bundle(path.join(FROZEN, 'stadiumTycoon.ts'), 'v1-stadium');
const v1Academy = await bundle(path.join(FROZEN, 'wonderkidFactory.ts'), 'v1-academy');
const todayStadium = await bundle(STADIUM_LIB, 'today-stadium');
const todayAcademy = await bundle(ACADEMY_LIB, 'today-academy');

/** One save through one pair of loaders, back out through the same lib. */
function loadWith(stadiumLib, academyLib, e, raw, now) {
  if (e.key === 'stadium') {
    const s = stadiumLib.deserializeTycoon(raw, now);
    return s ? stadiumLib.serializeTycoon(s, now) : null;
  }
  const s = academyLib.deserialize(raw, now);
  return s ? academyLib.serialize(s) : null;
}

/** C0 to C2 over the corpus, with today's loaders (or a planted copy of them).
 *  Today's answers are recomputed here from each raw save, never read back out of
 *  the committed file, so the committed file cannot vouch for itself. */
function saveSections(corpus, stadiumLib, academyLib) {
  const out = { C0: [], C1: [], C2: [] };
  const now = corpus.now;
  const changed = [];
  for (const e of corpus.entries) {
    const today = loadWith(stadiumLib, academyLib, e, e.raw, now);
    if (today !== e.current) out.C0.push(`${e.key}/${e.name}: today's loader no longer gives the committed answer; regenerate the corpus on purpose or find what moved`);
    if (today !== e.loaded) changed.push(`${e.key}/${e.name}`);
    if (today === null) continue;
    const back = loadWith(v1Stadium, v1Academy, e, today, now);
    if (back === null) out.C1.push(`${e.key}/${e.name}: the V1 build refuses the save this build writes`);
    else if (back !== today) {
      const a = JSON.parse(today); const b = JSON.parse(back);
      const moved = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      out.C1.push(`${e.key}/${e.name}: the V1 build changes ${moved.join(', ')} on the way in`);
    }
  }
  const unexpected = changed.filter(c => !REPAIRED.includes(c));
  const missing = REPAIRED.filter(c => !changed.includes(c));
  if (unexpected.length) out.C2.push(`today's loader changes ${unexpected.join(', ')}, which this round never meant to touch`);
  if (missing.length) out.C2.push(`${missing.join(', ')} loads exactly as V1 did, so the repair it exists for did not happen`);
  out.changed = changed;
  return out;
}

const report = result => {
  for (const k of ['C0', 'C1', 'C2']) console.log(`   ${result[k].length ? 'RED ' : 'ok  '} ${k}${result[k].length ? `: ${result[k][0]}` : ''}`);
};

console.log('');
console.log('B) the saves');
const corpus = JSON.parse(read(CORPUS));
const plain = saveSections(corpus, todayStadium, todayAcademy);
report(plain);
for (const k of ['C0', 'C1', 'C2']) for (const m of plain[k]) fail(`${k}: ${m}`);
if (!corpus.entries.some(e => e.current && /"awayMs":/.test(e.current))) fail('no corpus save carries the away meter, so C1 never proves the V1 build keeps it');
console.log(`   ${corpus.entries.length} saves: every one this build writes loads unchanged in the V1 build; repaired on load: ${plain.changed.join(', ')}`);

/** Wrap a lib so one named corpus save loads with a planted difference. */
const plantStadium = (lib, raw, mutate) => ({
  ...lib,
  deserializeTycoon: (r, now) => { const s = lib.deserializeTycoon(r, now); if (s && r === raw) mutate(s); return s; },
});
const entryRaw = name => corpus.entries.find(e => e.name === name && e.key === 'stadium').raw;

const SAVE_CONTROLS = [
  {
    name: 'unabsorbable',
    why: 'the repaired stadium save comes out with rep 51, which the V1 build rewrites to 0',
    red: ['C1'], green: ['C2'],
    libs: () => [plantStadium(todayStadium, entryRaw('doctored'), s => { s.rep = 51; }), todayAcademy],
  },
  {
    name: 'strayrepair',
    why: 'today\'s loader quietly changes a valid save (midGame minute 12)',
    red: ['C2'], green: ['C1'],
    libs: () => [plantStadium(todayStadium, entryRaw('midGame'), s => { s.minute = 12; }), todayAcademy],
  },
  {
    name: 'stalecorpus',
    why: 'the committed answer for a valid save is edited by hand',
    red: ['C0'], green: ['C1', 'C2'],
    corpus: c => { const e = c.entries.find(x => x.name === 'midGame'); const s = JSON.parse(e.current); s.streak = 99; e.current = JSON.stringify(s); },
  },
];
for (const control of SAVE_CONTROLS) {
  console.log('');
  console.log(`B.${control.name}) negative control: ${control.why}`);
  const copy = JSON.parse(JSON.stringify(corpus));
  if (control.corpus) control.corpus(copy);
  const [sLib, aLib] = control.libs ? control.libs() : [todayStadium, todayAcademy];
  const result = saveSections(copy, sLib, aLib);
  report(result);
  for (const s of control.red) if (result[s].length === 0) fail(`control ${control.name}: ${s} stayed green, so that check is dead`);
  for (const s of control.green) if (result[s].length > 0) fail(`control ${control.name}: ${s} went red too (${result[s][0]})`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonLoads: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonLoads: green.');
console.log('   A hidden academy is paid by the same away rule as a closed one, to the millisecond, and nobody ages.');
console.log('   A doctored stadium save loads as a working game whose clock runs; Sell up and a same-frame tap survive.');
console.log('   Every save this build writes loads unchanged in the V1 build, and only the two broken saves change on load.');
console.log('   All eleven controls fired exactly where they should.');
