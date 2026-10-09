/* Verifier's probe for Release AR (never committed, sent to a runner as .rc/x/arProbe.mjs).
 *
 * It copies src/test/liveSimMotion.test.tsx to src/test/arProbe-<label>.test.tsx with four small edits to the
 * one test 'a goal still on its way when the line up changes off the clock', so that the SAME assertions
 * run on a goal of one kind only:
 *   variant og   the goal found by the search must be an own goal
 *   variant pen  the goal found by the search must be a penalty
 * The search is still the engine's own redraws; nothing about the half is typed. More redraws are allowed
 * (own goals are one eligible goal in 32), the test's own timeout is raised to match, and the frames are
 * printed as runs so the log shows what was drawn.
 *
 *   node .rc/x/arProbe.mjs <label> <og|pen>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [label, variant] = process.argv.slice(2);
if (!label || !['og', 'pen', 'lk', 'noguard'].includes(variant)) { console.error('usage: node arProbe.mjs <label> <og|pen|lk|noguard>'); process.exit(2); }
let src = readFileSync('src/test/liveSimMotion.test.tsx', 'utf8').replaceAll('\r\n', '\n');
const once = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error('probe anchor found ' + n + ' times, not once: ' + from); process.exit(2); }
  src = src.replace(from, () => to);
};

/* variant noguard: the head's viewer with commit 8edc661a's guard taken out (the held cast read from the
   action's start even when that is before the viewer opened), written beside the tree as a copy. Run the
   whole committed test file against it: a green run means no test holds that guard. */
if (variant === 'noguard') {
  let viewer = readFileSync('src/components/club-manager/LiveSimScreen.tsx', 'utf8').replaceAll('\r\n', '\n');
  const guard = 'Math.max(liveAction.at, openedAt.current) : null;';
  const n = viewer.split(guard).length - 1;
  if (n !== 1) { console.error('probe: the guard was found ' + n + ' times, not once'); process.exit(2); }
  viewer = viewer.replace(guard, () => 'liveAction.at : null;');
  mkdirSync('.rc-' + label + '/src/components/club-manager', { recursive: true });
  writeFileSync('.rc-' + label + '/src/components/club-manager/LiveSimScreen.tsx', viewer);
  console.log('viewer without the guard written under .rc-' + label);
  process.exit(0);
}

/* variant lk: THE LAST KICK. The committed tests skip a half whose cast changes while the last kick is wound
   up (Round 1052's note), and the fixer's comment says that gap is closed. Here the skip is turned round: the
   four terminal fixtures are taken ONLY from halves where the men on the grass at the wind up's start
   (the whistle minus two) are not the men one minute later, read off stagePitchInput itself. The eight
   'terminal goal and save contact precede the unchanged whistle and score' rows then run unchanged on
   whichever of the four the search finds (a row with no half found says so and asserts nothing). */
if (variant === 'lk') {
  once("if (feed.some(e => ['injury', 'red', 'sub'].includes(e.kind) && clockPos(e) > cap + board - 2 && clockPos(e) < cap + board)) continue;", [
    '{',
    "        const stageName = cap === 45 ? 'first' : 'second';",
    '        const castAt = (pos: number) => { const input = stagePitchInput(career, career.live!, null, stageName, Math.min(cap, pos), Math.max(0, pos - cap), cap + board, cap - 1.2); return JSON.stringify([input.mine, input.theirs].map((list: PitchFigure[]) => list.map(f => [f.key, f.name ?? \'\']))); };',
    '        if (castAt(cap + board - 2) === castAt(cap + board - 1)) continue;',
    '      }',
  ].join('\n'));
  once('for (let attempt = 0; attempt < 3000 && terminalFixtures.size < 4; attempt++) {', 'for (let attempt = 0; attempt < 40000 && terminalFixtures.size < 4; attempt++) {');
  once('if (terminalFixtures.size === 4) return;', 'if (terminalFixtures.size === 4 || (globalThis as { __arProbeSearched?: boolean }).__arProbeSearched) return;\n  (globalThis as { __arProbeSearched?: boolean }).__arProbeSearched = true;');
  once("expect([...terminalFixtures.keys()].sort()).toEqual(['45:goal', '45:save', '90:goal', '90:save']);", [
    "console.log('[AR probe lk] halves whose cast changes in the last kick wind up, found: ' + ([...terminalFixtures.entries()].map(([key, f]) => {",
    "    const cap = f.event.minute; const stop = cap + boardAt(f.career, cap);",
    "    const near = liveFeed(f.career.live!).filter(e => ['injury', 'red', 'sub'].includes(e.kind) && clockPos(e) >= stop - 3 && clockPos(e) <= stop && e.minute > cap - 45 && e.minute <= cap).map(e => `${e.kind} ${e.side} at ${clockPos(e)}`).join(', ');",
    "    return `${key} ends at ${stop} (${near || 'no line near'})`;",
    "  }).join('; ') || 'none'));",
    '  expect(terminalFixtures.size).toBeGreaterThan(0);',
  ].join('\n'));
  once('const fixture = terminalFixtures.get(`${cap}:${kind}`)!;', 'const fixture = terminalFixtures.get(`${cap}:${kind}`)!;\n    if (!fixture) { console.log(`[AR probe lk] no ${cap}:${kind} half was found, this row asserts nothing`); return; }\n    console.log(`[AR probe lk] row ${cap}:${kind} reduced=${reduced} runs on a found half`);');
  const TERMINAL = "('terminal goal and save contact precede the unchanged whistle and score ($cap $kind reduced=$reduced)'";
  const from = src.indexOf(TERMINAL);
  if (from < 0) { console.error('probe: the terminal rows were not found'); process.exit(2); }
  const close = src.indexOf('}, 30000);', from);
  const following = src.indexOf("\n  it('", from);
  if (close < 0 || (following >= 0 && close > following)) { console.error('probe: the timeout of the terminal rows was not found inside them'); process.exit(2); }
  src = src.slice(0, close) + '}, 900000);' + src.slice(close + '}, 30000);'.length);
  const file = 'src/test/arProbe-' + label + '.test.tsx';
  writeFileSync(file, src);
  console.log('probe written: ' + file + ' (variant lk)');
  process.exit(0);
}

const TITLE = "it('a goal still on its way when the line up changes off the clock keeps its net, its card and its men'";
const kindLine = "if (goal.kind !== 'goal' || goal.side === 'none' || goal.plus || m < cap - 40 || m > cap - 4) continue;";
const flag = variant === 'og' ? 'og' : 'penalty';

/* 1. only a goal of the kind asked for */
once(kindLine, kindLine + '\n          if (!(goal as { og?: boolean; penalty?: boolean }).' + flag + ') continue;');
/* 2. more redraws */
once('for (let attempt = 0; attempt < 4000 && !found; attempt++) {', 'for (let attempt = 0; attempt < 60000 && !found; attempt++) {');
/* 3. the log says what kind of goal it is */
once('[AR held cast] the half found on attempt', '[AR probe ' + variant + '] og=${!!(goal as { og?: boolean }).og} penalty=${!!goal.penalty} freeKick=${!!goal.freeKick}; the half found on attempt');
/* 4. and what was drawn, as runs of frames that read the same, with a mark for the cast */
const playingLine = "const playing = frames.filter(f => f.motion === 'goal');";
once(playingLine, [
  '{',
  '      const runs: string[] = []; let last = \'\'; let n = 0; const casts: string[] = [];',
  '      for (const f of frames) {',
  '        if (!casts.includes(f.cast)) casts.push(f.cast);',
  '        const l = `${f.motion}/${f.phase} ${f.score}${f.card ? \' card\' : \'\'} ${f.minute}\' cast${casts.indexOf(f.cast)}`;',
  '        if (l === last) n++; else { if (last) runs.push(`${last} x${n}`); last = l; n = 1; }',
  '      }',
  '      if (last) runs.push(`${last} x${n}`);',
  "      console.log('[AR probe trace] ' + runs.join(' | '));",
  '    }',
  '    ' + playingLine,
].join('\n'));
/* 5. the goal really is of that kind (the search already says so; this makes a wrong probe fail loudly) */
once('const { career, goal } = found!;', 'const { career, goal } = found!;\n    expect(!!(goal as { og?: boolean; penalty?: boolean }).' + flag + ').toBe(true);');
/* 6. the test's own timeout, for the longer search: the first one after the title */
const at = src.indexOf(TITLE);
if (at < 0) { console.error('probe: the test title was not found'); process.exit(2); }
const end = src.indexOf('}, 120000);', at);
const next = src.indexOf("\n  it('", at + TITLE.length);
if (end < 0 || (next >= 0 && end > next)) { console.error('probe: the timeout of the test was not found inside it'); process.exit(2); }
src = src.slice(0, end) + '}, 900000);' + src.slice(end + '}, 120000);'.length);

const out = 'src/test/arProbe-' + label + '.test.tsx';
writeFileSync(out, src);
console.log('probe written: ' + out + ' (variant ' + variant + ')');
