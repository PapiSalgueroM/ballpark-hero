/* Round 982: the Club Manager desk cues (contracts, academy, facilities).

   Runs src/test/clubManagerDeskCues.test.tsx, which presses the real controls
   against careers built by the real engine and reads every expected line off
   the save the parent ends up holding. Without this wrapper the file sat
   outside every gate: runAllSims only finds scripts/sim*.mjs.

   CLUB_MANAGER_DESK_CUES_CONTROL=<name> runs ONE negative control instead:
   a broken copy of one desk module is written under .sim-control and swapped
   in through NO_DOUBLE_SWAP (vitest.config.ts), the anchor it replaces must
   occur exactly once, and the run must fail on exactly the named cases and
   no others. =all runs the plain suite and then every control in turn.
   Measured 2026-10-05: one run takes 25 to 80 s on the shared machine, so the
   lead runs `all` detached, never in one foreground call.

   Also a source check with its own control (bannerdrift): the line lifts
   itself over the unanswered cookie banner by finding it as role=region
   "Cookie choices", fixed to the foot, with the body flagged while consent is
   pending. If CookieConsent stops looking like that, the lift silently stops
   working, so the shape is held here. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const test = 'src/test/clubManagerDeskCues.test.tsx';
const control = process.env.CLUB_MANAGER_DESK_CUES_CONTROL || '';

/* A worktree has no node_modules of its own and resolves the main tree's by
   walking up, so find vitest the same way rather than hard coding root. */
function findVitest() {
  for (let dir = root; ; dir = path.dirname(dir)) {
    const bin = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(bin)) return bin;
    assert.notEqual(path.dirname(dir), dir, 'vitest is not installed above this checkout.');
  }
}

const D = 'Club Manager desk cues: ';
const C = name => `${D}contracts ${name}`;
const A = name => `${D}academy ${name}`;
const F = name => `${D}facilities ${name}`;
const T = {
  renew: C('a plain renewal says who and the terms the save now holds, on the slam, once'),
  clause: C('a clause renewal names the exit clause the save wrote'),
  release: C('a release states the settlement row the save holds'),
  oneWeek: C('a release with one week left to pay says one week, not one weeks'),
  sign: C('a free agent signing states the deal the save gave him'),
  refused: C('a refused press and a save that moved some other way say nothing'),
  timer: C('the line clears on its timer'),
  banner: C('while the cookie banner is unanswered the line sits above it, and drops back once it is answered'),
  promote: A('a promotion names the kid and says he joined the first team, from the save'),
  acadRefused: A('a refused promotion and a save that moved some other way say nothing'),
  acadOpens: A('a desk opened before the academy exists survives it opening, and a free kid is free to sign'),
  pip: F('the pip the upgrade lit pulses once and the Now line ticks in with the saved level'),
  ladder: F('every step of the ladder, pressed in a row, pulses the pip it lit and only that one'),
  facRefused: F('a refused upgrade and a save that moved some other way say nothing'),
};
const TOTAL = Object.keys(T).length;

const DESK = ['@/components/club-manager/deskCue', 'src/components/club-manager/deskCue.tsx'];
const FAC = ['@/components/club-manager/FacilitiesScreen', 'src/components/club-manager/FacilitiesScreen.tsx'];
const ACAD = ['@/components/club-manager/AcademyScreen', 'src/components/club-manager/AcademyScreen.tsx'];
const CON = ['@/components/club-manager/ContractsCard', 'src/components/club-manager/ContractsCard.tsx'];
const HOOK = '  const { cue, press } = useDeskCue<string, CareerState>(career);\n';
const EARLY = '    return <p className="text-xs text-muted-foreground text-center py-6">Your academy opens the first time you play a match.</p>;\n  }\n';

/* name: [module, [[anchor, replacement], ...], the exact cases that must fail]. */
const CONTROLS = {
  // the line is read off the save from BEFORE the press
  readbefore: [DESK, [['const text = state && state !== request.before ? request.read(state) : null;', 'const text = request.read(request.before);']],
    [T.renew, T.clause, T.release, T.oneWeek, T.sign, T.timer, T.banner, T.promote, T.acadOpens, T.pip, T.ladder]],
  // the line is shown whatever the save says
  noverify: [DESK, [['if (text) setCue({ key: request.key, text, id: ++counter.current });', "setCue({ key: request.key, text: text ?? 'Done.', id: ++counter.current });"]],
    [T.refused, T.acadRefused, T.facRefused]],
  // a line outlives its desk (as if kept outside the component)
  replay: [DESK, [['const [cue, setCue] = useState<DeskCue<K> | null>(null);', "const [cue, setCue] = useState<DeskCue<K> | null>({ key: undefined as K, text: 'Renewed: an old line.', id: 0 });"]],
    [T.renew, T.refused, T.banner, T.promote, T.acadRefused, T.acadOpens, T.pip, T.facRefused]],
  // the timer never clears the line
  notimer: [DESK, [['const timer = window.setTimeout(() => setCue(null), holdMs);', 'const timer = window.setTimeout(() => undefined, holdMs);']],
    [T.timer]],
  // the live region is inserted already holding its words
  filledregion: [DESK, [["<p aria-live=\"polite\" aria-atomic=\"true\" data-desk-cue-live={testId} className=\"sr-only\">{cue?.text ?? ''}</p>", '{cue && <p key={`live-${cue.id}`} aria-live="polite" aria-atomic="true" data-desk-cue-live={testId} className="sr-only">{cue.text}</p>}']],
    [T.renew, T.promote, T.acadOpens]],
  // the line stays at the foot, under the unanswered cookie banner
  nobanner: [DESK, [["anchor.current.style.bottom = cueId === null ? '' : bannerClearance();", "anchor.current.style.bottom = '';"]],
    [T.banner]],
  // the pulse lands one pip past the one the upgrade lit
  wrongpip: [FAC, [['const fresh = lit !== null && i === level - 1;', 'const fresh = lit !== null && i === level;']],
    [T.pip, T.ladder]],
  // the Now line never ticks in
  notick: [FAC, [["className={cn('text-[11px] text-muted-foreground mt-1', lit && 'cm-tick-in')}", "className={cn('text-[11px] text-muted-foreground mt-1')}"]],
    [T.pip]],
  // the academy line drops what the kid cost
  nofee: [ACAD, [[", ${fee > 0 ? `${money(fee)} to sign` : 'free to sign'}.`;", '.`;']],
    [T.promote, T.acadOpens]],
  // one week owed reads "1 more weeks"
  plural: [CON, [["more week${got.weeksLeft === 1 ? '' : 's'}.", 'more weeks.']],
    [T.oneWeek]],
  // the hook moves below the academy's early return (React error 310)
  hookafter: [ACAD, [[HOOK, ''], [EARLY, EARLY + HOOK]],
    [T.acadOpens]],
};
const known = ['', 'all', 'bannerdrift', ...Object.keys(CONTROLS)];
assert.ok(known.includes(control), `Unknown desk cue control "${control}". Known: ${known.slice(1).join(', ')}.`);

/* Comments are prose about the code, and prose is the one place the strings
   a guard looks for are sure to appear, so they go before matching. */
const code = src => src.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\}/g, '');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

/** The banner shape bannerClearance() finds. Returns the problems, [] when sound. */
function bannerProblems(consent, desk) {
  const problems = [];
  /* The element's own attributes: from role=region to the end of its opening
     tag's className (its ref callback holds an arrow, so no [^>] match). */
  const at = consent.indexOf('role="region"');
  const banner = at < 0 ? '' : consent.slice(at, consent.indexOf('>\n', consent.indexOf('className=', at)));
  if (!/aria-label="Cookie choices"/.test(banner)) problems.push('CookieConsent has no role=region element labelled "Cookie choices"');
  if (!/fixed bottom-0/.test(banner) || !/z-\[60\]/.test(banner)) problems.push('the banner is no longer fixed to the foot at z-[60]');
  if (!/document\.body\.dataset\.consentPending = '1'/.test(consent)) problems.push('the body is no longer flagged while consent is pending');
  if (!desk.includes('[role="region"][aria-label="Cookie choices"]') || !desk.includes('document.body.dataset.consentPending')) problems.push('deskCue.tsx no longer looks for that banner');
  return problems;
}
function checkBanner() {
  const consent = code(read('src/components/CookieConsent.tsx'));
  const desk = code(read(DESK[1]));
  assert.deepEqual(bannerProblems(consent, desk), [], 'The cue lift and the cookie banner must agree on its shape.');
  console.log('Desk cues: the lift finds the unanswered cookie banner the way CookieConsent draws it.');
  if (control === 'bannerdrift' || control === 'all') {
    const anchor = 'aria-label="Cookie choices"';
    assert.equal(consent.split(anchor).length - 1, 1, 'The bannerdrift anchor must occur exactly once.');
    const drifted = bannerProblems(consent.replace(anchor, 'aria-label="Cookie settings"'), desk);
    assert.deepEqual(drifted, ['CookieConsent has no role=region element labelled "Cookie choices"'], 'bannerdrift must fail the shape check, and only it.');
    console.log('Desk cues control bannerdrift: a relabelled banner fails the shape check.');
  }
}

const held = [test, DESK[1], FAC[1], ACAD[1], CON[1], 'src/components/CookieConsent.tsx'];
/* Held as normalised text: the harness only ever writes copies under .sim-control, so any change to a real file here would be content, never line endings. */
const heldText = held.map(read);
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'desk-cues982-'));
const report = path.join(folder, 'report.json');
const vitest = findVitest();

function run(name = '') {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (name) {
    const [[alias, rel], edits] = CONTROLS[name];
    const original = read(rel);
    let changed = original;
    for (const [anchor, replacement] of edits) {
      assert.equal(changed.split(anchor).length - 1, 1, `Control ${name}: its anchor must occur exactly once in ${rel}: ${anchor.trim()}`);
      changed = changed.replace(anchor, () => replacement);
    }
    assert.notEqual(changed, original, `Control ${name} must change ${rel}.`);
    const copy = path.join(folder, `${name}-${path.basename(rel)}`);
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [alias]: copy });
  }
  fs.rmSync(report, { force: true });
  const result = spawnSync(process.execPath, [vitest, 'run', test, '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 240000 });
  assert.ok(!result.error, `${String(result.error)}\n${result.stderr || ''}`);
  assert.ok(fs.existsSync(report), `vitest wrote no report.\n${(result.stderr || '').slice(-2000)}`);
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  const rows = json.testResults.flatMap(file => file.assertionResults);
  assert.equal(json.numTotalTests, TOTAL, `Every desk cue case must run (${TOTAL}).`);
  assert.deepEqual(rows.map(r => r.fullName).sort(), Object.values(T).sort(), 'The cases that ran must be exactly the named ones.');
  assert.equal(json.numPendingTests, 0, 'No case may be skipped.');
  assert.equal(Number(json.numUnhandledErrors ?? 0), 0, 'No unhandled error may sit beside the results.');
  const failed = rows.filter(r => r.status === 'failed');
  if (!name) {
    assert.equal(result.status, 0, failed.map(r => `${r.fullName}: ${r.failureMessages[0]}`).join('\n'));
    assert.equal(failed.length, 0);
    console.log(`Desk cues: ${TOTAL}/${TOTAL} cases passed against careers from the real engine.`);
    console.log('Desk cues: renewals, the clause, releases (one week and many), signings, promotions (paid and free) and every facility step say what the save holds.');
    console.log('Desk cues: refused and moved presses say nothing, the line clears on its timer, a reopened desk replays nothing.');
    console.log('Desk cues: the live region is there before it speaks, the pill is for the eye only, and the line clears the unanswered cookie banner.');
    return;
  }
  const want = CONTROLS[name][2];
  assert.equal(result.status, 1, `Control ${name} must make the suite fail.`);
  assert.deepEqual(failed.map(r => r.fullName).sort(), [...want].sort(),
    `Control ${name} must fail exactly its own cases.\n${failed.map(r => `${r.fullName}: ${String(r.failureMessages[0] ?? '').split('\n').slice(0, 4).join(' | ')}`).join('\n')}`);
  console.log(`Desk cues control ${name}: ${want.length} of ${TOTAL} cases failed, exactly the ones it targets; ${TOTAL - want.length} stayed green.`);
}

try {
  checkBanner();
  if (control === 'bannerdrift') { /* the source control ran inside checkBanner */ }
  else if (!control || control === 'all') run();
  if (control === 'all') for (const name of Object.keys(CONTROLS)) run(name);
  else if (control && control !== 'bannerdrift') run(control);
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
  held.forEach((rel, i) => assert.equal(read(rel), heldText[i], `${rel} must stay unchanged through the harness.`));
}
console.log('simClubManagerDeskCues: green');
