/**
 * Round 439 harness: Stadium Tycoon pays for the time you were away, whether
 * the tab was closed or only sitting behind another window.
 *
 * THE BUG. src/hooks/useStadiumTycoon.ts settled the away earnings once, in a
 * mount effect. requestAnimationFrame stops dead in a hidden tab, so a player
 * who left /stadium-tycoon open in a background window and came back hours
 * later got exactly one frame with dt clamped to two seconds. Worse, the old
 * visibilitychange handler fired on the way back IN as well as out and saved
 * with savedAt = now, so a later reload could not pay for those hours either.
 * Hours away, two seconds paid, the difference gone for good.
 *
 * THE ORACLE is the game's own promise, printed in the rules modal on
 * src/pages/StadiumTycoon.tsx: "Away from the game, you earn at half speed for
 * up to 8 hours (the Away Day Deal perk raises both, up to 80% for 12 hours)."
 * So the test converts money paid back into SECONDS of away time at the state's
 * own stated rate and compares that against the wall clock the tab was gone
 * for, capped at the stated cap. The cap has to hold on BOTH paths, and section
 * 4 of the test proves it by paying the same save the same twenty hours once
 * through each path and requiring the two totals to be identical.
 *
 * WHY IT DRIVES REAL FRAMES. Round 424's lesson on this same game: the match
 * clock bug existed only at the tick rate the hook really uses, and every check
 * that drove tick() with a big dt sailed past it. src/test/tycoonAway.test.tsx
 * mounts the REAL hook and hand-delivers 16ms frames, then models a hidden tab
 * the way a browser does it: visibilitychange fires and then NO frames arrive
 * until the tab is back.
 *
 * NEGATIVE CONTROL: TYCOON_AWAY_CONTROL=loadonly writes a copy of the hook with
 * the pre 439 handler back in place (save on every visibilitychange, settle
 * nowhere but the mount) and points the suite at it through the alias in
 * vitest.config.ts. Sections 3 and 4, the two that measure a backgrounded tab,
 * must FAIL, and sections 1 and 2 must stay green so the red is the away settle
 * and not a broken rig or a broken load path. The rewrite asserts the block it
 * replaces is present before it runs, because a control that rewrites an absent
 * string proves nothing.
 *
 * Run: node scripts/simTycoonAway.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/tycoonAway.test.tsx';
const HOOK = path.join(ROOT, 'src/hooks/useStadiumTycoon.ts');
const CONTROL_HOOK = path.join(ROOT, 'src/hooks/__control_useStadiumTycoon.ts');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonaway-'));
process.on('exit', () => {
  try { fs.rmSync(CONTROL_HOOK, { force: true }); } catch { /* best effort */ }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
});

/* The block Round 439 added, and the handler it replaced. Both verbatim. */
const SETTLING = `    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { saveNow(); return; }
      settleAway();
      last = performance.now();
      acc = 0;
    };`;
const LOAD_ONLY = `    const onVisibility = () => {
      saveNow();
    };`;

/** Run the suite once and return one row per test: { title, status, messages }. */
function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    /* Two reporters on purpose: the json one is the machine-readable verdict,
       and the default one is the only way the AWAY| measurement lines the test
       prints reach this process at all (json alone swallows them). */
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 32 * 1024 * 1024 },
  );
  if (!fs.existsSync(out)) {
    console.error((r.stdout || '') + (r.stderr || ''));
    return null;
  }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.notes = [...((r.stdout || '') + (r.stderr || '')).matchAll(/AWAY\| (.+)/g)].map(m => m[1].trim());
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      rows.push({
        title: a.title || (a.fullName || '').trim(),
        status: a.status,
        messages: (a.failureMessages || []).join('\n'),
      });
    }
  }
  return rows;
}

/** The one line that matters out of a vitest failure: the message we wrote. */
function detail(messages) {
  const line = messages.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('AssertionError:') && !s.startsWith('at '));
  return (line || messages.split('\n')[0] || '').slice(0, 220);
}

const section = title => Number((title.match(/^(\d+)/) || [])[1] || 0);

console.log('Round 439: Stadium Tycoon away earnings, over the REAL hook at the REAL frame cadence');
console.log(`   suite: ${TEST}`);

console.log('');
console.log('A) the shipped hook');
const live = runSuite({});
if (!live) {
  console.error('  FAIL: the suite produced no report at all, so nothing here was measured');
  process.exit(1);
}
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
if (live.length < 6) fail(`only ${live.length} of the 6 away sections ran, so this harness measured less than it claims`);
console.log('   what it measured:');
for (const note of live.notes) console.log(`     ${note}`);
if (live.notes.length < 6) fail(`the suite printed ${live.notes.length} measurements, so some section returned without measuring anything`);

console.log('');
console.log('B) negative control: the pre 439 load-only settle is put back');
const src = fs.readFileSync(HOOK, 'utf8').split('\r\n').join('\n');
if (!src.includes(SETTLING)) {
  console.error('  control: the Round 439 visibility settle is not in useStadiumTycoon.ts, so this control would rewrite nothing and prove nothing');
  process.exit(1);
}
fs.writeFileSync(CONTROL_HOOK, src.replace(SETTLING, LOAD_ONLY));
console.log('   wrote a copy of the hook whose only away settle is the mount effect');
const controlled = runSuite({ TYCOON_AWAY_CONTROL: 'loadonly' });
fs.rmSync(CONTROL_HOOK, { force: true });
if (!controlled) {
  fail('the control run produced no report, so the control proves nothing');
} else {
  /* Targeted: the two sections that measure a backgrounded tab must go red,
     and the rig section and the load path must stay green, or the red says
     "something broke" rather than "the away settle is missing". */
  const MUST_FAIL = [3, 4];
  const MUST_PASS = [1, 2];
  for (const row of controlled) {
    const n = section(row.title);
    const graded = MUST_FAIL.includes(n) || MUST_PASS.includes(n);
    const want = MUST_FAIL.includes(n) ? 'failed' : 'passed';
    const mark = !graded ? '--  ' : row.status === want ? 'ok  ' : 'BAD ';
    console.log(`   ${mark} ${row.status.padEnd(6)} ${row.title}`);
    if (MUST_FAIL.includes(n)) {
      if (row.status !== 'failed') fail(`control: "${row.title}" stayed green with the away settle removed, so that check is dead`);
      else console.log(`         measured: ${detail(row.messages)}`);
    }
    if (MUST_PASS.includes(n) && row.status !== 'passed') {
      fail(`control: "${row.title}" went red too, so the control breaks more than the away settle and the red proves nothing`);
    }
  }
  const reds = controlled.filter(r => r.status === 'failed').length;
  console.log(`   control reported ${reds} red section(s) out of ${controlled.length}`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonAway: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonAway: green.');
console.log('   A backgrounded tab settles the hours it was hidden for, at the half rate the rules print.');
console.log('   The stated cap pays the same whether the tab was closed or only behind another window.');
console.log('   Live play is never billed back as time away, and a twenty second alt tab pays nothing.');
console.log('   The control put the load-only settle back and sections 3 and 4 went red, so these checks are alive.');
