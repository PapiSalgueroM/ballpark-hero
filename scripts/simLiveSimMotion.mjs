/** Round 603: rendered action triggers, saves versus goals, pause, player controls
 * and unchanged settlement. Controls rewrite temporary copies, never source.
 * LIVE_MOTION_CONTROL=trigger|save|pause|mutation|lineup|speed|reduced|terminal|redraw|whistle|banner|boardgoal|etclock must turn the corresponding
 * runtime check red. Every replacement is asserted before a control runs.
 * Round 670 review: whistle puts back the viewer deciding extra time off the
 * career it was rendered with rather than off the latest save, and the two
 * "ninetieth minute" tests must go red.
 * Round 670 polish: banner puts back the extra time banner's typed "Level
 * after 90 minutes", which is false beside a second leg that is level only on
 * aggregate, and the banner test must go red.
 * Round 781 review: boardgoal prints a goal banner's bare minute (90' for a
 * goal at 90+3), and etclock prints the extra time clock's bare minute (ET
 * 120' all through its board); each must turn its own test red. Before the
 * review both left every gate green.
 *
 * Round 1101: the pitch is a shared part now (src/components/pitch-motion), and fifteen controls came with it.
 * Each names the one test it must turn red, on an assertion:
 *   block       the block's back line stops reading where the ball is             R4
 *   kickoff     a kick off is drawn with the open play rows                       R3 (the hard rule: own half)
 *   overlap     every man on the centre line of his row and nobody stepped apart  R2
 *   mouth       a save's ball ends in the net                                     R1
 *   draw        the plan's generator is Math.random                               R5
 *   approach    the shooter gets the ball only when his line fires                R6
 *   lag         the score changes when the line fires, not when the ball is in    the score waits for the ball
 *   hold        the clock does not slow while the scorer card is up               the score waits for the ball
 *   skipmoment  going back out for the second half no longer clears the action    after Skip the second half opens
 *               (the on time rule alone can not be seen by a test: the stage change clears a late line too)
 *   back        Back folds the match away without pausing it                      Back folds the match to a card
 *   onepanel    a tap on a player leaves the open panel waiting under the sheet   one panel at a time
 *   labels      no name ever goes above its figure                                a name goes above its figure
 *   stalejoin   the viewer keeps the eleven it mounted with for its dots          a substitution during a paused action
 *   takenback   the hook plays on an action the binder has taken back             the part drops an action the binder has taken back
 *   cmimport    the part's barrel re-exports from Club Manager's engine           the bundle section below
 * The review's controls (2026-10-08), each a one token change a reviewer made by hand and saw survive:
 *   turns        a chance no longer waits for the action before it                R6 (one action at a time)
 *   restartbeat  the next chance is led in straight after a goal                   R6 (every goal gets its kick off)
 *   kickoffside  the side that scored kicks off                                    R7
 *   throwside    the throw in goes to the other side than its line names           R7
 *   foulside     the side that fouled takes the free kick                          R7
 *   cornerflank  a corner its line calls left is taken from the right flag         R7
 *   goalkickside the side that missed takes the goal kick                          R7
 *   secondkick   the same side kicks off both halves                               R8
 *   possession   the pitch is handed the other side's share of the ball            R8
 *   etclear      going into extra time no longer clears the action                 a line fired late by Skip
 *   reducedhold  under reduced motion the hold lasts the whole action              under reduced motion the card is held
 *   flash        the score waits only once the motion state has landed             no frame draws the new score
 *   lastkick     the last kick's wind up takes one off the score                   a goal with the last kick of a period
 *   dropped      a goal whose action the part dropped still waits                  a substitution in a goal's wind up
 *   logearly     the list says GOAL when the line fires                            nothing says GOAL before the ball is in
 *   nth          a scorer's later goals are counted on his first card              a scorer card counts his goals
 *   cardside     an opponent who shares a name gets my player's season count       a scorer card counts his goals
 *   bigpart      the part's barrel carries six kilobytes more                      the bundle section (its size ceiling)
 *   scorelead    the score waits on the plan's instant, not the action's own start  no frame draws the new score (it led the net by a frame)
 *   samecommit   an action always starts from the frame on screen, old eleven or not  a chance whose line fires in the very commit
 *   crowd        a man in a crowd keeps his name                                   level neighbours take a row each, and a wall shows numbers
 * The closing check's controls (2026-10-08): the kick off after a goal was a beat long whenever a chance followed within two minutes.
 *   kickoffcut   the next shooter's lead comes before the kick off again           R9 (a goal gets its kick off)
 *   kickoffwait  a chance waits for a beat of kick off only, as it did             R9 (a goal gets its kick off)
 *   kickoffturn  the same change as kickoffcut, read on the 200 half feeds         R6 (the share of kick offs held, and the reason rule: its log must show both)
 * Release AR (2026-10-09), after the browser walk met a goal at 79' whose score changed with the ball in the air:
 *   castnow      a change off the clock comes onto the grass at its minute again,   a goal still on its way when the line up changes off the clock
 *                whatever is playing
 * And boardgoal is anchored on goalSegs now. Round 1146 moved the goal's line there (one function for the pill, the
 * card and the list), the old anchor could never match again, and the control aborted instead of running: a sweep
 * of all 53 controls on a runner found it (52 fired on their own test, this one stopped on its anchor).
 * restartbeat takes out both lengths of a kick off now (the beat and the whole of it), which is what its line above says.
 * cmimport now trips the import specifier scan as well as the marker check, and is accepted only on both.
 * And one old control has a new test to turn red: lineup takes the hook's own guard out (an action is dropped
 * when the line up under it changes). The viewer joins the frame to its eleven by key now, so its substitution
 * test no longer needs that guard and stayed green under it; 'the part drops an action' proves it on the hook.
 * A control exits 1 when its test went red on an assertion, as it must, and 3 when it did anything else.
 *
 * THE BUNDLE SECTION (clean runs and cmimport): the part must stay a part. src/components/pitch-motion is
 * bundled alone (react external, css empty) and must not carry Club Manager: two strings that live in the
 * engine are absent from the bundle and present in src/lib/clubManager.ts, no file of the folder has an
 * import specifier reaching the engine, the viewer's folder or its hook (comments stripped first), and
 * the bundle stays under its measured size plus a fifth. Measured on a GitHub runner at 455edf1c, after the
 * review's fixes (18,154 and 7,680 on the commit that added the section): see BUNDLE_MEASURED below.
 * LIVE_MOTION_ONLY=bundle runs that section alone.
 */
import { readFile, writeFile, readdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LIVE_MOTION_CONTROL || '';
const only = process.env.LIVE_MOTION_ONLY || '';
const OLD = ['trigger', 'save', 'pause', 'mutation', 'lineup', 'speed', 'reduced', 'terminal', 'redraw', 'whistle', 'banner', 'boardgoal', 'etclock'];
const NEW = ['block', 'kickoff', 'overlap', 'mouth', 'draw', 'approach', 'lag', 'hold', 'skipmoment', 'back', 'onepanel', 'labels', 'stalejoin', 'takenback', 'cmimport'];
/* The review of 2026-10-08: six swapped argument mutations of the dead ball rules and six of the viewer left every test green.
   Each of these has a test that reads it now. */
const REVIEW = ['scorelead', 'samecommit', 'crowd', 'turns', 'restartbeat', 'kickoffside', 'throwside', 'foulside', 'cornerflank', 'goalkickside', 'secondkick', 'possession', 'etclear', 'reducedhold', 'flash', 'lastkick', 'dropped', 'logearly', 'nth', 'cardside', 'bigpart', 'kickoffcut', 'kickoffwait', 'kickoffturn'];
/* Release AR: the cast a chance started with is held while it plays. */
const HELD = ['castnow'];
assert.ok(['', ...OLD, ...NEW, ...REVIEW, ...HELD].includes(control), 'Unknown live motion control');
assert.ok(['', 'bundle'].includes(only), 'Unknown LIVE_MOTION_ONLY');
/* Minified bytes and gzip bytes of the part alone, and the ceiling: each plus a fifth. */
const BUNDLE_MEASURED = { min: 19277, gzip: 8077 };
const BUNDLE_CEILING = { min: Math.ceil(BUNDLE_MEASURED.min * 1.2), gzip: Math.ceil(BUNDLE_MEASURED.gzip * 1.2) };
const PART = path.join(root, 'src/components/pitch-motion');
const lf = async file => (await readFile(file, 'utf8')).replaceAll('\r\n', '\n');
const folder = await mkdtemp(path.join(tmpdir(), 'cm-motion-'));
const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
let behaved = true;
let summary = '';
try {
  if (control && control !== 'cmimport' && control !== 'bigpart') {
    let viewer = await lf(path.join(root, 'src/components/club-manager/LiveSimScreen.tsx'));
    /* Round 1101: the pitch moved to src/components/pitch-motion. The mutated copy is still written as
       <folder>/LiveSimMotion.tsx, because the viewer copy imports './LiveSimMotion'. */
    let motion = await lf(path.join(PART, 'motion.tsx'));
    let scene = await lf(path.join(PART, 'scene.ts'));
    const sceneBefore = scene;
    const replace = (source, before, after) => { assert.equal(source.split(before).length - 1, 1, 'Control anchor must occur exactly once: ' + before); assert.notEqual(before, after); return source.replace(before, after); };
    if (control === 'trigger') viewer = replace(viewer, 'setMotionEvent({ event: e, key, at: clock })', 'setMotionEvent(null)');
    if (control === 'save') motion = replace(motion, 'const event = action.event;', "const event = action.event.kind === 'save' ? { ...action.event, kind: 'goal' as const } : action.event;");
    if (control === 'pause') viewer = replace(viewer, 'if (paused || !running || finished) { lastTs.current = null; return; }', 'if (!running || finished) { lastTs.current = null; return; }');
    if (control === 'mutation') viewer = replace(viewer, 'firedRef.current.add(key);', "firedRef.current.add(key); if (e.kind === 'goal' && liveNow) liveNow.myGoals += 1;");
    if (control === 'lineup') motion = replace(motion, '&& samePlayers(action.scene.mine, scene.mine) && samePlayers(action.scene.theirs, scene.theirs)', '&& true');
    if (control === 'speed') viewer = replace(viewer, 'c + dt * BASE_RATE * speed', 'c + dt * BASE_RATE');
    if (control === 'reduced') motion = replace(motion, 'reduced ? 1.05 : clock - action.event.at', 'clock - action.event.at');
    if (control === 'terminal') viewer = replace(viewer, 'const terminalWindup = !!terminalAction && clock >= terminalMinute - 1.05 && clock < terminalMinute;', 'const terminalWindup = false;');
    if (control === 'redraw') viewer = replace(viewer, 'const motionStillCommitted = !motionEvent || motionEvent.event.minute + (motionEvent.event.plus ?? 0) <= clock || feed.includes(motionEvent.event);', 'const motionStillCommitted = true;');
    if (control === 'whistle') {
      viewer = replace(viewer, '      if (liveNow?.et) {\n', '      if (isExtraTimeDue(career)) {\n');
      viewer = replace(viewer, '  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds,\n', '  liveFeed, liveStatsAt, myOnPitchAt, oppOnPitchAt, squadNumbers, benchFor, MAX_SUBS, liveGoneIds, isExtraTimeDue,\n');
    }
    if (control === 'banner') viewer = replace(viewer, "club: extraTimeCall(career, liveNow), tone: 'none'", "club: 'Level after 90 minutes', tone: 'none'");
    /* Release AR: Round 1146 moved the goal's line into goalSegs (one function for the pill, the card and the
       list), and this control's old anchor on the pill's own line could never match again: it aborted. */
    if (control === 'boardgoal') viewer = replace(viewer, 'return [{ t: lead }, who, { t: ` ${minuteLabel(at)}` }, ...(mark ? [{ t: mark }] : [])];', "return [{ t: lead }, who, { t: ` ${at.minute}'` }, ...(mark ? [{ t: mark }] : [])];");
    if (control === 'etclock') viewer = replace(viewer, "stage === 'extra' ? `ET ${minuteLabel({ minute, plus })}`", "stage === 'extra' ? `ET ${minute}'`");
    /* ---- Round 1101 ---- */
    if (control === 'block') {
      scene = replace(scene, 'back: clamp(b.y + 26, 46, 80)', 'back: clamp(50 + 26, 46, 80)');
      scene = replace(scene, 'back: clamp(b.y + 30, 58, 84)', 'back: clamp(50 + 30, 58, 84)');
    }
    if (control === 'kickoff') scene = replace(scene, "  if (beat.state === 'kickoff') {\n", "  if (beat.state === 'kickoff' && false) {\n");
    if (control === 'overlap') {
      scene = replace(scene, 'for (let pass = 0; pass < 3; pass++) {', 'for (let pass = 0; pass < 0; pass++) {');
      scene = replace(scene, 'x: clamp(50 + (figure.slot.x - 50) * row.width + row.shift, 4, 96)', 'x: clamp(50 + (figure.slot.x - 50) * 0 + row.shift, 4, 96)');
    }
    if (control === 'mouth') motion = replace(motion, "y: mine ? (event.kind === 'save' ? 8 : 1) : (event.kind === 'save' ? 92 : 99) };", 'y: mine ? 1 : 99 };');
    if (control === 'draw') scene = replace(scene, "import { keyedRng } from '@/lib/keyedRng';", 'const keyedRng = (key: string) => { void key; return () => Math.random(); };');
    if (control === 'approach') scene = replace(scene, 'start: lead, end: a.at + ACTION_SPAN, priority: a.last ? 6 : 4', 'start: a.at, end: a.at + ACTION_SPAN, priority: a.last ? 6 : 4');
    if (control === 'lag') {
      viewer = replace(viewer, 'const shownMy = Math.max(0, myGoalsNow - waiting.me);', 'const shownMy = myGoalsNow;');
      viewer = replace(viewer, 'const shownOpp = Math.max(0, oppGoalsNow - waiting.opp);', 'const shownOpp = oppGoalsNow;');
    }
    if (control === 'hold') viewer = replace(viewer, 'holdRate.current = holding ? GOAL_HOLD_SPAN / (GOAL_HOLD_SECONDS[speed] ?? 2.5) : 0;', 'holdRate.current = 0;');
    if (control === 'skipmoment') viewer = replace(viewer, "    setStage('second');\n    clearAction();\n    setClock(46);", "    setStage('second');\n    setClock(46);");
    if (control === 'back') viewer = replace(viewer, '    setPaused(true);\n    setCollapsed(true);', '    setCollapsed(true);');
    if (control === 'onepanel') viewer = replace(viewer, '    setPicking(id);\n    setPanel(null);', '    setPicking(id);');
    if (control === 'labels') viewer = replace(viewer, 'const LABEL_BELOW = 6;', 'const LABEL_BELOW = -1;');
    if (control === 'takenback') motion = replace(motion, 'action.event === event && ', '');
    /* ---- the review of 2026-10-08 ---- */
    if (control === 'scorelead') viewer = replace(viewer, 'const struck = liveAction?.event === e ? liveAction.at : firesAt(e);', 'const struck = firesAt(e);');
    if (control === 'samecommit') motion = replace(motion, 'setAction({ event, scene: fits ? shown : { ...between(shown, scene, 0), ball: shown.ball } });', 'setAction({ event, scene: shown }); void fits;');
    if (control === 'crowd') viewer = replace(viewer, 'if (wall || crowd) short.add(a.key);', 'if (wall) short.add(a.key); void crowd;');
    if (control === 'turns') scene = replace(scene, '    c.at = held(c, wanted);', '    c.floor = c.place; void wanted;');
    if (control === 'restartbeat') {
      scene = replace(scene, "=> (c.event.kind === 'goal' ? PITCH_RESTART : 0);", '=> (c.event ? 0 : 0);');
      scene = replace(scene, "=> (c.event.kind === 'goal' ? PITCH_KICKOFF : 0);", '=> (c.event ? 0 : 0);');
    }
    if (control === 'kickoffcut' || control === 'kickoffturn') scene = replace(scene, 'Math.max(room - whole(before), Math.min(PITCH_SQUEEZE, room - restart(before)))', 'room - restart(before)');
    if (control === 'kickoffwait') scene = replace(scene, 'before.at + ACTION_SPAN + waitedFor(before) + PITCH_SQUEEZE', 'before.at + ACTION_SPAN + restart(before) + PITCH_SQUEEZE');
    if (control === 'kickoffside') scene = replace(scene, 'kickoff(after, defending, n, `g${a.order}`);', 'kickoff(after, side, n, `g${a.order}`);');
    if (control === 'throwside') scene = replace(scene, '      const side = present(event.side);\n      const spot = (before: PitchPoint)', '      const side = present(other(event.side));\n      const spot = (before: PitchPoint)');
    if (control === 'foulside') scene = replace(scene, "so the free kick is the other side's. */\n      const side = present(other(event.side));", "so the free kick is the other side's. */\n      const side = present(event.side);");
    if (control === 'cornerflank') scene = replace(scene, "(event.flank ? (event.flank === 'left' ? 2.5 : 97.5)", "(event.flank ? (event.flank === 'left' ? 97.5 : 2.5)");
    if (control === 'goalkickside') scene = replace(scene, "state: 'goalkick', via: 'follow', side: defending,", "state: 'goalkick', via: 'follow', side,");
    if (control === 'secondkick') viewer = replace(viewer, "const kicking: PitchSide = stage === 'second' ? (first === 'me' ? 'opp' : 'me') : first;", 'const kicking: PitchSide = first;');
    if (control === 'possession') viewer = replace(viewer, 'possession: (share ?? 50) / 100,', 'possession: 1 - (share ?? 50) / 100,');
    if (control === 'etclear') viewer = replace(viewer, "        setStage('extra');\n        clearAction();", "        setStage('extra');");
    if (control === 'reducedhold') viewer = replace(viewer, '(!reducedMotion || clock - gm.at < GOAL_HOLD_SPAN)', 'true');
    if (control === 'flash') viewer = replace(viewer, '      waiting[e.side]++;', '      if (motionEvent?.event === e) waiting[e.side]++;');
    if (control === 'lastkick') viewer = replace(viewer, 'const waiting: Record<Side, number> = { me: 0, opp: 0 };', "const lastKickBy = terminalWindup && terminalAction?.kind === 'goal' ? terminalAction.side : null; const waiting: Record<Side, number> = { me: lastKickBy === 'me' ? 1 : 0, opp: lastKickBy === 'opp' ? 1 : 0 };");
    if (control === 'dropped') viewer = replace(viewer, ' || droppedKey === lineKey(e)) continue;', ') continue;');
    if (control === 'logearly') viewer = replace(viewer, 'lines.splice(at, 1)[0]', 'lines[at]');
    if (control === 'nth') viewer = replace(viewer, '(upTo < 0 || i <= upTo)', 'true');
    if (control === 'cardside') viewer = replace(viewer, "const player = goal.side === 'me' ? career.squad.find(p => p.name === goal.text) : undefined;", 'const player = career.squad.find(p => p.name === goal.text);');
    if (control === 'stalejoin') viewer = replace(viewer, 'const manOf = useMemo(() => new Map([...men.mine, ...men.theirs].map(m => [m.key, m])), [men]);', 'const manOf = useMemo(() => new Map([...men.mine, ...men.theirs].map(m => [m.key, m])), []);');
    /* ---- Release AR ---- */
    if (control === 'castnow') viewer = replace(viewer, 'const castFrom = liveAction && clock >= liveAction.at && clock - liveAction.at <= ACTION_SPAN ? liveAction.at : null;', 'const castFrom = null as number | null;');
    const componentPath = path.join(folder, 'LiveSimMotion.tsx').replaceAll('\\', '/');
    viewer = replace(viewer, "import { LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';", "import { LivePitchPlayer, useLiveSimMotion } from './LiveSimMotion';");
    viewer = replace(viewer, "import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';", "import type { MotionEvent } from './LiveSimMotion';");
    motion = replace(motion, "import './pitchMotion.css';", "import '@/components/pitch-motion/pitchMotion.css';");
    await writeFile(componentPath, motion);
    await writeFile(path.join(folder, 'LiveSimScreen.tsx'), viewer);
    env.LIVE_MOTION_VIEWER = '/@fs/' + path.join(folder, 'LiveSimScreen.tsx').replaceAll('\\', '/');
    env.LIVE_MOTION_COMPONENT = '/@fs/' + componentPath;
    /* A mutated scene.ts is a copy too, aliased ABOVE '@' so the test file and the viewer copy both get it. */
    const alias = [];
    if (scene !== sceneBefore) {
      const scenePath = path.join(folder, 'scene.ts').replaceAll('\\', '/');
      await writeFile(scenePath, scene);
      alias.push({ find: '@/components/pitch-motion/scene', replacement: scenePath });
    }
    alias.push({ find: '@', replacement: path.join(root, 'src') });
    const config = {
      root,
      test: { environment: 'jsdom', globals: true, setupFiles: [path.join(root, 'src/test/setup.ts')], include: ['src/test/liveSimMotion.test.tsx'] },
      esbuild: { jsx: 'automatic' },
      resolve: { alias, dedupe: ['react', 'react-dom', 'lucide-react'] },
      server: { fs: { allow: [root, folder, await realpath(path.join(root, 'node_modules'))] } },
    };
    await writeFile(path.join(folder, 'vitest.config.mjs'), `export default ${JSON.stringify(config)};\n`);
    console.log('Negative control changed temporary source:', control);
  }

  /* ---- the tests: all of them clean, the one a control names otherwise ---- */
  const selected = {
    trigger: 'actual feed', save: 'committed action|actual feed', pause: 'pause freezes', mutation: 'settled results', lineup: 'substitution during|the part drops an action', stalejoin: 'substitution during', takenback: 'the part drops an action the binder has taken back', speed: 'speed changes', reduced: 'reduced motion', terminal: 'terminal goal and save contact', redraw: 'a tactics redraw cancels', whistle: 'the ninetieth minute asks the latest save', banner: 'the extra time banner says what is true', boardgoal: 'a goal in the board is announced with its plus', etclock: 'the extra time clock runs into its own board',
    block: 'R4: the block follows the ball', kickoff: 'R3: at a kick off', overlap: 'R2: nobody stands on a team mate', mouth: 'R1: the ball is in the goal mouth', draw: 'R5: nothing is decided here', approach: 'R6: a chance starts with the ball',
    lag: 'the score waits for the ball', hold: 'the score waits for the ball', skipmoment: 'after Skip the second half opens',
    back: 'Back folds the match', onepanel: 'one panel at a time', labels: 'a name goes above its figure',
    turns: 'R6: a chance starts with the ball', restartbeat: 'R6: a chance starts with the ball',
    kickoffcut: 'R9: a goal gets its kick off', kickoffwait: 'R9: a goal gets its kick off', kickoffturn: 'R6: a chance starts with the ball',
    crowd: 'level neighbours take a row each', scorelead: 'no frame draws the new score', samecommit: 'a chance whose line fires in the very commit',
    kickoffside: 'R7: every dead ball', throwside: 'R7: every dead ball', foulside: 'R7: every dead ball', cornerflank: 'R7: every dead ball', goalkickside: 'R7: every dead ball',
    secondkick: 'R8: the pitch is handed', possession: 'R8: the pitch is handed',
    etclear: 'a line fired late by Skip is not played again', reducedhold: 'under reduced motion the card is held', flash: 'no frame draws the new score',
    lastkick: 'a goal with the last kick of a period takes nothing off', dropped: 'a substitution in a goal', logearly: 'nothing says GOAL before the ball is in',
    nth: 'a scorer card counts his goals', cardside: 'a scorer card counts his goals',
    castnow: 'a goal still on its way when the line up changes off the clock',
  };
  let passed = 0;
  if (only !== 'bundle' && control !== 'cmimport' && control !== 'bigpart') {
    /* Round 1101: a test with no timeout of its own gets 60 seconds, not vitest's 5. On a machine with other
       lanes compiling, three controls went red on 'Test timed out in 5000ms', which is red for the wrong reason. */
    const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/liveSimMotion.test.tsx', '--reporter=verbose', '--testTimeout=60000'];
    if (control) args.push('--config', path.join(folder, 'vitest.config.mjs'), '-t', selected[control]);
    const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.error) throw result.error;
    const output = (result.stdout || '') + (result.stderr || '');
    process.stdout.write(output);
    const tests = (output.split('\n').filter(line => /^\s*Tests\s/.test(line)).pop() || '');
    const count = word => Number((tests.match(new RegExp('(\\d+) ' + word)) || [])[1] || 0);
    passed = count('passed');
    const broken = /Test timed out|Failed to resolve import|Failed to load|Cannot find module|SyntaxError|Transform failed/.test(output);
    if (control) {
      /* Red for the right reason: the named test failed on an assertion, and nothing failed to load or timed out. */
      behaved = result.status === 1 && count('failed') >= 1 && /AssertionError/.test(output) && !broken;
      summary = behaved
        ? `simLiveSimMotion: control ${control} turned "${selected[control]}" red on an assertion (${count('failed')} failed), as it must.`
        : `simLiveSimMotion: control ${control} did NOT behave: vitest exit ${result.status}, ${count('failed')} failed, ${count('passed')} passed${broken ? ', and something timed out or failed to load' : ''}.`;
    } else {
      behaved = result.status === 0 && passed > 0 && !broken;
      if (!behaved) summary = `simLiveSimMotion: RED. vitest exit ${result.status}, ${count('failed')} failed, ${passed} passed.`;
    }
  }

  /* ---- the bundle section: the part carries nothing of Club Manager ---- */
  if (behaved && (!control || control === 'cmimport' || control === 'bigpart')) {
    const problems = [];
    const engine = await lf(path.join(root, 'src/lib/clubManager.ts'));
    const MARKERS = ['4-3-3 holding', 'Standard line'];
    for (const marker of MARKERS) assert.ok(engine.includes(marker), `the marker "${marker}" is no longer in src/lib/clubManager.ts, so its absence from the part would prove nothing`);
    const files = (await readdir(PART)).filter(name => /\.tsx?$/.test(name));
    assert.ok(files.length >= 6, `only ${files.length} source files found in src/components/pitch-motion`);
    const BANNED = ['@/lib/clubManager', '@/components/club-manager', '@/hooks/useClubManager'];
    let specifiers = 0;
    /* Under cmimport the barrel that is scanned is the mutated one, so the control trips this check too. */
    const CMIMPORT_LINE = "export { FORMATIONS } from '@/lib/clubManager';\n";
    for (const name of files) {
      /* Comments out first: the folder's own comments name Club Manager, and prose is not an import. */
      const code = ((await lf(path.join(PART, name))) + (control === 'cmimport' && name === 'index.ts' ? CMIMPORT_LINE : '')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
      for (const m of code.matchAll(/(?:from\s+|import\s+|import\(\s*)['"]([^'"]+)['"]/g)) {
        specifiers++;
        if (BANNED.some(b => m[1].startsWith(b))) problems.push(`${name} imports ${m[1]}`);
      }
    }
    assert.ok(specifiers >= 12, `only ${specifiers} import specifiers were read in the folder, so the scan is not looking at the code`);
    let entry = path.join(PART, 'index.ts');
    if (control === 'cmimport') {
      const barrel = await lf(entry);
      entry = path.join(folder, 'index.ts');
      await writeFile(entry, barrel + CMIMPORT_LINE);
      console.log('Negative control changed temporary source: cmimport');
    }
    if (control === 'bigpart') {
      /* Six kilobytes that do not squash: the ceiling is the measured size plus a fifth, and this is a third more. */
      const barrel = await lf(entry);
      let pad = '';
      for (let i = 0; pad.length < 6000; i++) pad += ((i * 2654435761) >>> 0).toString(36);
      entry = path.join(folder, 'index.ts');
      await writeFile(entry, barrel + 'export const PAD = ' + JSON.stringify(pad) + ';\n');
      console.log('Negative control changed temporary source: bigpart');
    }
    const esbuild = await import('esbuild');
    const atAlias = { name: 'at', setup(build) { build.onResolve({ filter: /^@\// }, args => build.resolve('./' + args.path.slice(2), { resolveDir: path.join(root, 'src'), kind: args.kind })); } };
    const built = await esbuild.build({
      entryPoints: [entry], bundle: true, write: false, minify: true, format: 'esm', platform: 'browser', jsx: 'automatic', logLevel: 'silent',
      external: ['react', 'react-dom', 'react/jsx-runtime'], loader: { '.css': 'empty' }, plugins: [atAlias],
    });
    const text = built.outputFiles[0].text;
    const min = Buffer.byteLength(text);
    const gzip = gzipSync(text).length;
    for (const marker of MARKERS) if (text.includes(marker)) problems.push(`the bundle of the part carries the engine's "${marker}"`);
    if (BUNDLE_CEILING.min <= 0 || BUNDLE_CEILING.gzip <= 0) problems.push('no measured size is recorded (BUNDLE_MEASURED)');
    else if (min > BUNDLE_CEILING.min || gzip > BUNDLE_CEILING.gzip) problems.push(`the part is ${min} bytes minified and ${gzip} gzipped, over its ceiling of ${BUNDLE_CEILING.min} and ${BUNDLE_CEILING.gzip} (measured ${BUNDLE_MEASURED.min} and ${BUNDLE_MEASURED.gzip}, plus a fifth)`);
    console.log(`[1101 bundle] the part alone: ${min} bytes minified, ${gzip} gzipped (ceiling ${BUNDLE_CEILING.min} and ${BUNDLE_CEILING.gzip}); ${files.length} files, ${specifiers} import specifiers read; problems ${problems.length}`);
    for (const p of problems) console.log('  FAIL: ' + p);
    if (control === 'bigpart') {
      behaved = problems.length === 1 && problems[0].includes('over its ceiling');
      summary = behaved
        ? `simLiveSimMotion: control bigpart made the part ${min} bytes and the bundle section went red on its size ceiling alone, as it must.`
        : `simLiveSimMotion: control bigpart did NOT behave: ${problems.length} problems, ${min} bytes minified.`;
    } else if (control === 'cmimport') {
      behaved = problems.some(p => p.includes("carries the engine's")) && problems.some(p => p.includes('index.ts imports @/lib/clubManager'));
      summary = behaved
        ? `simLiveSimMotion: control cmimport put the engine in the part's bundle and the bundle section went red (${problems.length} problems), as it must.`
        : 'simLiveSimMotion: control cmimport did NOT behave: the bundle section stayed green with the engine imported.';
    } else if (problems.length) {
      behaved = false;
      summary = `simLiveSimMotion: RED. The bundle section found ${problems.length} problem${problems.length === 1 ? '' : 's'}.`;
    } else {
      summary = only === 'bundle'
        ? `simLiveSimMotion: the bundle section alone is green. The part is ${min} bytes minified, ${gzip} gzipped, and carries nothing of Club Manager.`
        : `simLiveSimMotion: green. ${passed} tests passed (the viewer on real feeds, the pitch part's rules on 200 half feeds and on feeds made by hand, the goal sequence, match mode), and the part alone is ${min} bytes minified, ${gzip} gzipped, with nothing of Club Manager in it.`;
    }
  }
  console.log(summary);
  process.exitCode = control ? (behaved ? 1 : 3) : behaved ? 0 : 1;
} finally {
  assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()), 'Temporary cleanup must stay under the OS temp directory');
  assert.ok(path.basename(folder).startsWith('cm-motion-'));
  await rm(folder, { recursive: true, force: true });
}
