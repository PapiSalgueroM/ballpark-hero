/*
 * Round 515 harness: draft night reveals across the four front offices.
 *
 * His ask, from docs/TWEAKS-2026-08-28.md: "More animation across every sim:
 * reveals, draft nights, celebrations. Reading text is not a game feel", and
 * "Draft nights and college signing days as one by one reveal animations".
 *
 * THE DANGER AN ANIMATION ROUND CARRIES, AND WHY THIS FILE IS MOSTLY ABOUT IT.
 *
 * A reveal is a screen that states facts. If it shows a player joining a club
 * he did not join, that is a FABRICATED FACT rendered as though the engine
 * decided it, which is worse than no animation: the data rules in CLAUDE.md put
 * correctness above UI, and a pick list is exactly the kind of thing a player
 * will read as true. So section 2 holds that the steps are a permutation of the
 * picks the engine actually made, with nothing added and nothing dropped.
 *
 * The second danger is quieter. playGames walks these boards, and a reveal that
 * blocks the page reads to it as a dead screen, which is how a whole route ends
 * up marked broken by an animation nobody asked to be modal. Section 4 bounds
 * the run so it cannot become a wait.
 *
 * Sections:
 *  1. The shape: order is 1..n, exactly one pick is the player's, and it is
 *     first because that is the order the engine applies them in.
 *  2. Nothing invented, nothing lost: the steps are a permutation of the input.
 *  3. Malformed input yields an empty run rather than a throw or a half pick.
 *  4. Timing is strictly increasing and the whole run stays bounded.
 *  5. The four boards really call it, and really capture the rival picks.
 *
 * Controls:
 *   DRAFT_CONTROL=dropai    drops a rival pick, so section 2 catches a lost one.
 *   DRAFT_CONTROL=slowsteps makes the step gap huge, so section 4 catches a
 *                           reveal that has become a loading screen.
 *   DRAFT_CONTROL=norivals  (Round 1305) a copy of the NBA board that hands the
 *                           card an empty list. It has its OWN exit rule: 0 only
 *                           when BOTH reds were seen, section 5's "does not hand
 *                           the captured rivals" for the NBA on the copy's text,
 *                           AND the behaviour test
 *                           src/components/nba-front-office/NbaDraftNightRivals.test.tsx
 *                           red by name on the copy with the file loaded. The
 *                           name check of section 5 is the weak fence (it passes
 *                           for a board that empties the list before handing it
 *                           over); the test is the strong one, and under the
 *                           two old controls' rule a test that can never fail
 *                           would have passed this control.
 *
 * Run: node scripts/simDraftNight.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/draftNight.entry.mjs`;
const BUNDLE = `${TMP}/draftNight.bundle.mjs`;
const SRC = `${ROOT}/src/lib/draftNight.ts`;

const CONTROL = process.env.DRAFT_CONTROL || '';
const KNOWN = ['dropai', 'slowsteps', 'norivals'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`DRAFT_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

let libPath = SRC;
if (CONTROL === 'dropai' || CONTROL === 'slowsteps') {
  let src = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
  const swap = (from, to) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: draftNight.ts is not in the shape DRAFT_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  };
  if (CONTROL === 'dropai') {
    swap('    if (!c) continue;\n    steps.push({ ...c, overall: steps.length + 1, mine: false });',
         '    if (!c) continue;\n    if (steps.length === 2) continue;\n    steps.push({ ...c, overall: steps.length + 1, mine: false });');
  } else if (CONTROL === 'slowsteps') {
    swap('export const PICK_STEP_MS = 400;', 'export const PICK_STEP_MS = 4000;');
  }
  libPath = `${TMP}/draftNight.control.ts`;
  fs.writeFileSync(libPath, src);
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${libPath.replaceAll('\\', '/')}');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { buildDraftNight, pickDelayMs, draftNightHeadline, PICK_STEP_MS, PICK_LEAD_MS, MAX_REVEALED } = lib;

for (const [name, fn] of Object.entries({ buildDraftNight, pickDelayMs, draftNightHeadline })) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const mk = (i, team) => ({ team, playerName: `Prospect ${i}`, pos: ['QB', 'WR', 'CB', 'C', 'G'][i % 5], grade: 60 + (i % 30) });
const RIVAL_TEAMS = ['CHI', 'DAL', 'GB', 'NYG', 'SF', 'MIA'];

/* ---------- 1. The shape ---------- */
console.log('1) The order is 1 to n, and exactly one pick is the player own');
{
  let checked = 0;
  for (const rivalCount of [0, 1, 3, 6, 12]) {
    const mine = mk(0, 'NE');
    const rivals = Array.from({ length: rivalCount }, (_, i) => mk(i + 1, RIVAL_TEAMS[i % RIVAL_TEAMS.length]));
    const night = buildDraftNight(mine, rivals);
    checked += 1;
    const expect = Math.min(1 + rivalCount, MAX_REVEALED);
    if (night.picks.length !== expect) fail(`${rivalCount} rivals produced ${night.picks.length} steps, expected ${expect}`);
    night.picks.forEach((p, i) => {
      if (p.overall !== i + 1) fail(`step ${i} carries overall ${p.overall}, not ${i + 1}`);
    });
    const mineCount = night.picks.filter(p => p.mine).length;
    if (mineCount !== 1) fail(`${mineCount} picks are marked as the player's, expected exactly 1`);
    if (night.picks.length && !night.picks[0].mine) fail("the player's own pick is not first, but the engine applies it first");
  }
  /* No pick of your own is a real case: the rivals keep going after your last. */
  const noneOfMine = buildDraftNight(null, [mk(1, 'CHI'), mk(2, 'DAL')]);
  checked += 1;
  if (noneOfMine.picks.some(p => p.mine)) fail('a run with no pick of your own still marked one as yours');
  if (noneOfMine.picks.length !== 2) fail(`a run with no pick of your own produced ${noneOfMine.picks.length} steps, expected 2`);
  console.log(`   ${checked} runs checked, every one ordered and with one owner`);
  if (checked < 6) fail(`only ${checked} runs were checked`);
}

/* ---------- 2. Nothing invented, nothing lost ---------- */
console.log('2) The steps are exactly the picks the engine made, no more and no fewer');
{
  let compared = 0;
  for (const rivalCount of [0, 2, 5, 6]) {
    const mine = mk(0, 'NE');
    const rivals = Array.from({ length: rivalCount }, (_, i) => mk(i + 1, RIVAL_TEAMS[i % RIVAL_TEAMS.length]));
    const night = buildDraftNight(mine, rivals);
    compared += 1;
    const key = p => `${p.team}|${p.playerName}|${p.pos}|${p.grade}`;
    const gotIn = night.picks.map(key).sort();
    const wantIn = [mine, ...rivals].map(key).sort();
    if (gotIn.join('#') !== wantIn.join('#')) {
      const lost = wantIn.filter(k => !gotIn.includes(k));
      const made = gotIn.filter(k => !wantIn.includes(k));
      if (lost.length) fail(`${lost.length} pick(s) the engine made never reached the reveal: ${lost.slice(0, 3).join(' , ')}`);
      if (made.length) fail(`the reveal INVENTED ${made.length} pick(s) the engine never made: ${made.slice(0, 3).join(' , ')}`);
      if (!lost.length && !made.length) fail('the pick sets differ in a way this check could not name');
    }
    /* And the grade shown must be the SCOUTED one it was handed, never altered.
       The front office draft is built on scouting error, so a reveal that
       quietly printed a different number would be telling the player the truth
       the game is deliberately hiding. */
    for (const p of night.picks) {
      const src = [mine, ...rivals].find(r => r.playerName === p.playerName);
      if (src && p.grade !== src.grade) fail(`${p.playerName} was shown grade ${p.grade} and the engine's card said ${src.grade}`);
    }
  }
  console.log(`   ${compared} runs compared against their own input, every pick accounted for`);
  if (compared < 4) fail(`only ${compared} runs were compared`);
}

/* ---------- 3. Malformed input ---------- */
console.log('3) A malformed pick yields an empty or shortened run, never a throw');
{
  const junk = [null, undefined, 42, 'x', {}, { team: '', playerName: 'A' }, { team: 'NE', playerName: '   ' }, { team: 'NE' }];
  let survived = 0;
  for (const j of junk) {
    let night;
    try { night = buildDraftNight(j, []); } catch (e) { fail(`buildDraftNight threw on ${JSON.stringify(j)}: ${e}`); continue; }
    survived += 1;
    if (night.picks.length !== 0) fail(`a malformed own pick (${JSON.stringify(j)}) still produced ${night.picks.length} steps`);
  }
  /* A junk rival is skipped and the good ones still land. */
  const mixed = buildDraftNight(mk(0, 'NE'), [mk(1, 'CHI'), null, { team: '', playerName: 'Ghost' }, mk(2, 'DAL')]);
  survived += 1;
  if (mixed.picks.length !== 3) fail(`a run with two junk rivals produced ${mixed.picks.length} steps, expected 3`);
  if (mixed.picks.some(p => p.playerName === 'Ghost')) fail('a rival with no club reached the reveal');
  /* And a non-array where rivals should be. */
  try {
    const weird = buildDraftNight(mk(0, 'NE'), 'not an array');
    survived += 1;
    if (weird.picks.length !== 1) fail(`a non-array rivals argument produced ${weird.picks.length} steps, expected 1`);
  } catch (e) { fail(`buildDraftNight threw on a non-array rivals argument: ${e}`); }
  console.log(`   ${survived} malformed inputs handled without a throw`);
  if (survived < junk.length + 2) fail(`only ${survived} malformed inputs were handled`);
}

/* ---------- 4. Timing ---------- */
console.log('4) Picks land in order, and the whole run stays short enough not to be a wait');
{
  const delays = Array.from({ length: MAX_REVEALED }, (_, i) => pickDelayMs(i));
  for (let i = 1; i < delays.length; i++) {
    if (!(delays[i] > delays[i - 1])) fail(`pick ${i} lands at ${delays[i]}ms, not after pick ${i - 1} at ${delays[i - 1]}ms`);
  }
  if (pickDelayMs(0) < 0) fail(`the first pick lands at ${pickDelayMs(0)}ms, which is before the card exists`);
  const full = buildDraftNight(mk(0, 'NE'), Array.from({ length: 8 }, (_, i) => mk(i + 1, RIVAL_TEAMS[i % RIVAL_TEAMS.length])));
  console.log(`   ${full.picks.length} picks, step ${PICK_STEP_MS}ms, lead ${PICK_LEAD_MS}ms, whole run ${full.totalMs}ms`);
  /*
   * THE CEILING, and it is about playGames as much as about feel. The walker
   * treats a screen it cannot act on as dead, and every second of reveal is a
   * second the board is still settling. Five seconds is already long for
   * something a player sees on every pick of every draft; the broken shape this
   * separates is a step gap in the seconds, which is a loading screen wearing a
   * reveal's clothes.
   *
   * Measured on the shipped step of 400ms: the capped nine pick run is 3,780ms
   * and the realistic seven pick NFL run 2,840ms, so the ceiling keeps about a
   * quarter of itself in hand. It was 4,860ms at the step this was first
   * written at, which left three percent and would have flipped on a nudge.
   */
  if (full.totalMs > 5000) fail(`a full run takes ${full.totalMs}ms, over the 5000ms ceiling, so draft night has become a wait`);
  if (full.totalMs <= 0) fail('a full run takes no time at all, so nothing is being revealed');
  /* And the cap really caps, or a future engine handing over forty picks would
     turn the ceiling above into a lie. */
  const flood = buildDraftNight(mk(0, 'NE'), Array.from({ length: 40 }, (_, i) => mk(i + 1, RIVAL_TEAMS[i % RIVAL_TEAMS.length])));
  if (flood.picks.length > MAX_REVEALED) fail(`40 rivals produced ${flood.picks.length} steps, past the cap of ${MAX_REVEALED}`);
  console.log(`   40 rivals capped to ${flood.picks.length} steps at ${flood.totalMs}ms`);
}

/* ---------- DRAFT_CONTROL=norivals: the copy ---------- */
/*
 * The copy is the NBA board with the second argument of its one
 * buildDraftNight call in draftPick made an empty list: a board that applies
 * the rivals' picks and tells the card about none of them. The string it
 * replaces must be in the board exactly once, or the control refuses to run
 * (exit 2): a control that replaces a string the file does not hold changes
 * nothing, and green would then mean "the control did not fire".
 */
const NBA_BOARD = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const RIVALS_TEST = 'src/components/nba-front-office/NbaDraftNightRivals.test.tsx';
let nbaCopy = null;
let norivalsSourceRed = false;
let norivalsTestRed = false;
let norivalsTestWhy = 'the behaviour test was not run';
if (CONTROL === 'norivals') {
  const FROM = 'grade: gradeOf(pr) }, rivalPicks,';
  const TO = 'grade: gradeOf(pr) }, [],';
  const board = fs.readFileSync(path.join(ROOT, NBA_BOARD), 'utf8').split('\r\n').join('\n');
  const hits = board.split(FROM).length - 1;
  if (hits !== 1) {
    console.error(`control cannot run: ${NBA_BOARD} holds the string DRAFT_CONTROL=norivals rewrites ${hits} times, and it must be there exactly once`);
    console.error(`  looked for: ${FROM}`);
    process.exit(2);
  }
  nbaCopy = board.replace(FROM, TO);
  if (nbaCopy === board || nbaCopy.includes(FROM)) { console.error('control cannot run: the rewrite of the NBA board changed nothing'); process.exit(2); }
}

/* ---------- 5. The boards really use it ---------- */
console.log('5) All four front offices build a reveal and capture the rival picks');
{
  const BOARDS = [
    ['src/components/front-office/FrontOfficeBoard.tsx', 'NFL'],
    ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'NBA'],
    ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'MLB'],
    ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'NHL'],
  ];
  let wired = 0;
  for (const [rel, label] of BOARDS) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { fail(`${label}: ${rel} is not there, so the wiring check cannot run`); continue; }
    /* Comments are stripped before matching, because prose about a check is the
       one place the string a guard looks for is guaranteed to appear.
       Under DRAFT_CONTROL=norivals the NBA board is read from the copy. */
    const src = (label === 'NBA' && nbaCopy !== null ? nbaCopy : fs.readFileSync(p, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const hasBuild = /buildDraftNight\s*\(/.test(src);
    const hasCard = /<DraftNightCard\b/.test(src);
    /*
     * Round 519: those two alone were not enough, and this section's header was
     * claiming more than they checked. Capturing the rival picks IS the round:
     * before it the boards applied five or six rival selections inside the same
     * handler and threw them away. A board could call buildDraftNight with an
     * empty second argument, pass both checks above, and narrate only the
     * player's own pick, which is the state this round exists to end.
     * So the capture is checked too: a rivals array pushed to inside the loop
     * that hands the picks out, and handed to buildDraftNight as its second
     * argument.
     */
    const capturesRivals = /rivalPicks\.push\(/.test(src);
    const passesRivals = /buildDraftNight\([\s\S]{0,400}?rivalPicks/.test(src);
    if (!hasBuild) fail(`${label} never calls buildDraftNight, so its draft still resolves invisibly`);
    if (!hasCard) fail(`${label} never renders DraftNightCard, so nothing shows the picks landing`);
    if (!capturesRivals) fail(`${label} never pushes a rival pick, so the reveal can only ever show your own selection and the rivals are still thrown away`);
    if (!passesRivals) fail(`${label} does not hand the captured rivals to buildDraftNight, so the picks it collected go nowhere`);
    if (label === 'NBA' && nbaCopy !== null && hasBuild && hasCard && capturesRivals && !passesRivals) norivalsSourceRed = true;
    if (hasBuild && hasCard && capturesRivals && passesRivals) wired += 1;
  }
  console.log(`   ${wired} of ${BOARDS.length} boards capture the rival picks, hand them over and render the reveal`);
  if (wired !== BOARDS.length) fail(`only ${wired} of ${BOARDS.length} front offices show draft night`);

  const card = path.join(ROOT, 'src/components/front-office-shared/DraftNightCard.tsx');
  if (!fs.existsSync(card)) {
    fail('src/components/front-office-shared/DraftNightCard.tsx is missing, so the four boards cannot be sharing one reveal');
  } else {
    /* Comments stripped, the same as the board scan above and for the same
       reason: prose ABOUT reduced motion is the one place the string this looks
       for is guaranteed to appear, so a card that only talked about honouring
       the setting would have satisfied it. */
    const cs = fs.readFileSync(card, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    /* Reduced motion is not optional here: the site has a fence for it and a
       new moving thing that ignores the setting is a regression in it. */
    if (!/prefers-reduced-motion/.test(cs)) {
      fail('DraftNightCard does not mention prefers-reduced-motion, so the reveal ignores the setting the rest of the site honours');
    }
    console.log('   the card is shared and honours prefers-reduced-motion');
  }
}

/* ---------- DRAFT_CONTROL=norivals: the behaviour test on the copy ---------- */
if (CONTROL === 'norivals') {
  console.log('5b) NEGATIVE CONTROL norivals: the behaviour test, run on a copy of the NBA board that hands the card an empty list');
  const testSrc = fs.readFileSync(path.join(ROOT, RIVALS_TEST), 'utf8');
  /* The test's own name for the row this control must turn red, read from the
     test file so the two cannot drift. */
  const named = testSrc.match(/const RIVAL_ROWS_TEST = '([^']+)';/);
  if (!named) { console.error(`control cannot run: ${RIVALS_TEST} no longer names its rival rows test as RIVAL_ROWS_TEST`); process.exit(2); }
  const rowName = named[1];
  const dir = path.join(ROOT, 'dist', '.draft-control');
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, 'NbaFrontOfficeBoard.control.tsx');
  fs.writeFileSync(copy, nbaCopy);
  let r;
  try {
    r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', RIVALS_TEST, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FO_BOARD_NBA: copy.replaceAll('\\', '/'), CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split('\n');
  const reported = out.includes('NbaDraftNightRivals.test.tsx');
  /* A copy that fails to load turns every row red too. That is a broken
     control, not the check firing, so three things are asked: the file was
     reported, no load error was printed, and at least one OTHER row of the
     file passed on the copy, which only a board that rendered can do. */
  const loadError = /Failed to (load|resolve)|SyntaxError|Cannot find module/.test(out);
  const greenRows = lines.filter(l => l.includes('✓') && l.includes('NBA draft night, GM desk')).length;
  const redRows = lines.filter(l => l.includes('×') && l.includes(rowName)).length;
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
  console.log(`   on the copy: ${greenRows} row(s) of the file green, "${rowName}" red ${redRows} time(s) (the desk off and the desk on)`);
  if (!reported) norivalsTestWhy = 'vitest did not report on the behaviour test at all:\n' + out.slice(-1200);
  else if (loadError || greenRows === 0) norivalsTestWhy = 'the copy of the NBA board did not load or render, so any red is a load error and not the check:\n' + out.slice(-1200);
  else if (redRows !== 2) norivalsTestWhy = `the rival rows test went red ${redRows} time(s) on the copy, expected 2 (the desk off and the desk on)`;
  else norivalsTestRed = true;
}

if (CONTROL === 'norivals') {
  /* Its own exit rule (see the header): both reds, or it did not fire. */
  console.log(`\nNEGATIVE CONTROL norivals was on; ${failures} finding(s) in the sections above.`);
  const missing = [];
  if (!norivalsSourceRed) missing.push('section 5 did NOT say "NBA does not hand the captured rivals" on the copy');
  if (!norivalsTestRed) missing.push(norivalsTestWhy);
  if (missing.length === 0) {
    console.log('control "norivals": both reds were seen (the source check for the NBA on the copy, and the behaviour test red by name with the copy loaded). The check works.');
    process.exitCode = 0;
  } else {
    console.error(`control "norivals" did NOT fire. Missing: ${missing.join(' ; ')}`);
    process.exitCode = 1;
  }
} else if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else if (failures) {
  console.error(`\nsimDraftNight: ${failures} FAILURES`);
  process.exitCode = 1;
} else {
  console.log('\nsimDraftNight: green. Every pick the engine made is shown, none is invented, and the run cannot become a wait.');
}
